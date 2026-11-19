"use client";

// 키·몸무게·상세 치수로 모양이 바뀌는 3D 마네킹 아바타입니다.
// 몸을 여러 장의 '단면(타원)'으로 쌓아 만들어요: 둘레 값으로 타원 크기를 정하고, 높이는 키·인심으로 정해요.
// 치수 계산은 lib/bodyModel.ts, 이 파일은 그 값으로 3D 모양을 그리고 돌려 보는 역할이에요.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { BodyShape } from "@/lib/bodyModel";
import { cn } from "./ui";

const SEG = 40; // 단면 하나를 이루는 점 개수 (많을수록 매끈)
const SKIN = "#d9cec4";

/* ───────── 모양 계산 도우미 ───────── */

/** 둘레(cm)와 깊이/너비 비율 k로 타원의 반너비를 구해요 (라마누잔 근사식). */
function halfWidth(circumference: number, k: number) {
  const f = 3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k));
  return circumference / (Math.PI * f);
}

/** 점 몇 개 사이를 부드럽게 잇는 값 (Catmull-Rom). */
function smooth(points: number[][], steps: number) {
  const out: number[][] = [];
  for (let i = 0; i < points.length - 1; i++) {
    const p0 = points[Math.max(0, i - 1)];
    const p1 = points[i];
    const p2 = points[i + 1];
    const p3 = points[Math.min(points.length - 1, i + 2)];
    for (let s = 0; s < steps; s++) {
      const t = s / steps;
      const t2 = t * t;
      const t3 = t2 * t;
      out.push(
        p1.map((_, j) => 0.5 * (2 * p1[j] + (-p0[j] + p2[j]) * t + (2 * p0[j] - 5 * p1[j] + 4 * p2[j] - p3[j]) * t2 + (-p0[j] + 3 * p1[j] - 3 * p2[j] + p3[j]) * t3)),
      );
    }
  }
  out.push(points[points.length - 1]);
  return out;
}

interface Ring {
  c: THREE.Vector3; // 단면 중심
  a: number; // 반너비
  b: number; // 반깊이
  y?: number; // 몸통 높이 (모양 보정용)
}

/**
 * 단면들을 이어 붙여 하나의 매끈한 면을 만들어요.
 * axis: 단면이 쌓이는 방향, u: 단면의 너비 방향. 깊이 방향은 u × axis 로 정해 바깥쪽 면이 보이게 해요.
 */
function loft(rings: Ring[], axis: THREE.Vector3, u: THREE.Vector3, bump?: (ring: Ring, cos: number, sin: number) => number) {
  const w = new THREE.Vector3().crossVectors(u, axis).normalize();
  const pos: number[] = [];
  for (const r of rings) {
    for (let j = 0; j < SEG; j++) {
      const th = (j / SEG) * Math.PI * 2;
      const cos = Math.cos(th);
      const sin = Math.sin(th);
      const extra = bump ? bump(r, cos, sin) : 0;
      const p = r.c
        .clone()
        .addScaledVector(u, r.a * cos)
        .addScaledVector(w, r.b * sin + extra);
      pos.push(p.x, p.y, p.z);
    }
  }
  const idx: number[] = [];
  for (let i = 0; i < rings.length - 1; i++) {
    for (let j = 0; j < SEG; j++) {
      const a = i * SEG + j;
      const b = (i + 1) * SEG + j;
      const c = i * SEG + ((j + 1) % SEG);
      const d = (i + 1) * SEG + ((j + 1) % SEG);
      idx.push(a, b, c, c, b, d);
    }
  }
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.Float32BufferAttribute(pos, 3));
  g.setIndex(idx);
  g.computeVertexNormals();
  return g;
}

function ellipsoid(rx: number, ry: number, rz: number) {
  const g = new THREE.SphereGeometry(1, SEG, SEG / 2);
  g.scale(rx, ry, rz);
  return g;
}

/* ───────── 몸 만들기 ───────── */

function buildBody(s: BodyShape, material: THREE.Material) {
  const group = new THREE.Group();
  const add = (g: THREE.BufferGeometry, at?: THREE.Vector3, rotZ = 0) => {
    const m = new THREE.Mesh(g, material);
    if (at) m.position.copy(at);
    m.rotation.z = rotZ;
    group.add(m);
  };

  const male = s.gender === "male";
  const H = s.height;
  const scale = H / 165;
  const vol = Math.pow(s.bmi / 21, 0.65);

  // 높이 기준선 (바닥 0, 단위 cm)
  const crotch = s.inseam;
  const shoulderY = 0.818 * H;
  const T = shoulderY - crotch; // 몸통 길이
  const hipY = crotch + 0.14 * T;
  const waistY = crotch + 0.45 * T;
  const chestY = crotch + 0.75 * T;

  // 단면 비율 (깊이/너비)
  const kHip = male ? 0.72 : 0.74;
  const kWaist = male ? 0.8 : 0.76;
  const kChest = male ? 0.7 : 0.76;
  const hipA = halfWidth(s.hip, kHip);
  const waistA = halfWidth(s.waist, kWaist);
  const chestA = halfWidth(s.chest, kChest);
  const neckR = (male ? 6.4 : 5.5) * scale * Math.sqrt(vol);
  const shoulderA = s.shoulder / 2;

  const thighC = s.hip * ((male ? 0.55 : 0.58) + 0.004 * (s.bmi - 21));
  const rT = thighC / (2 * Math.PI);
  const upperC = H * (male ? 0.172 : 0.162) * Math.pow(vol, 1.1);
  const rU = upperC / (2 * Math.PI);

  /* 몸통 + 목: [높이, 반너비, 깊이비율] */
  // 몸통 아래 끝은 두 다리가 겹치는 곳 안쪽에서 끝나게 해서 이음선이 보이지 않게 해요.
  const bottomA = Math.min(hipA * 0.85, rT * 1.5);
  // 어깨는 팔이 시작하는 곳까지만 만들고, 둥근 어깨선은 팔 윗부분이 이어 줘요.
  const shoulderInner = Math.max(shoulderA - rU * 0.85, neckR * 2.2);
  const torsoKeys = [
    [crotch - 0.03 * H, bottomA, (rT * 0.95) / bottomA],
    [crotch + 0.02 * T, hipA * 0.9, Math.min(kHip, (rT * 1.2) / (hipA * 0.9))],
    [crotch + 0.07 * T, hipA * 0.97, kHip],
    [hipY, hipA, kHip],
    [crotch + 0.3 * T, (hipA + waistA) / 2, (kHip + kWaist) / 2],
    [waistY, waistA, kWaist],
    [crotch + 0.63 * T, waistA + (chestA - waistA) * 0.75, kChest],
    [chestY, chestA, kChest],
    [crotch + 0.88 * T, Math.max(chestA * 0.96, shoulderInner), 0.64],
    [shoulderY - 1, shoulderInner, 0.56],
    [shoulderY + 2.5 * scale, shoulderInner * 0.72, 0.62],
    [shoulderY + 5.5 * scale, neckR * 1.55, 0.8],
    [shoulderY + 0.045 * H, neckR * 1.08, 0.95],
    [H - 0.1 * H, neckR, 1],
  ];
  const bust = male ? 0.6 : Math.min(3.6, Math.max(1, 1.8 + (s.chest - s.waist * 1.2) * 0.1));
  const butt = (male ? 1.6 : 2.6) * Math.min(1.6, Math.max(0.6, s.hip / s.waist - 0.45));
  const torso = smooth(torsoKeys, 6).map(([y, a, k]) => ({ c: new THREE.Vector3(0, y, 0), a, b: a * k, y }));
  add(
    loft(torso, new THREE.Vector3(0, 1, 0), new THREE.Vector3(1, 0, 0), (r, cos, sin) => {
      const y = r.y ?? 0;
      const ax = Math.abs(cos);
      // 가슴(앞쪽)과 엉덩이(뒤쪽)의 볼륨
      const front = bust * Math.exp(-(((y - chestY) / (8.5 * scale)) ** 2)) * Math.exp(-(((ax - 0.48) / 0.36) ** 2)) * Math.max(0, sin) ** 1.5;
      const back = butt * Math.exp(-(((y - hipY + 2) / (10 * scale)) ** 2)) * Math.exp(-(((ax - 0.42) / 0.45) ** 2)) * Math.max(0, -sin) ** 1.5;
      return front - back;
    }),
  );

  /* 다리 */
  const kneeY = 0.285 * H;
  const ankleY = 0.045 * H;
  for (const side of [-1, 1]) {
    const x0 = side * rT * 0.92;
    const legKeys = [
      [crotch + 0.1 * T, x0 * 1.05, rT * 1.04, 0],
      [crotch + 2, x0, rT * 1.02, 0],
      [crotch - 0.04 * H, x0, rT, 0],
      [crotch - 0.45 * (crotch - kneeY), x0 * 0.95, rT * 0.84, 0],
      [kneeY, x0 * 0.86, rT * 0.58, 0.3],
      [0.2 * H, x0 * 0.84, rT * 0.62, -0.8],
      [0.12 * H, x0 * 0.8, rT * 0.44, -0.3],
      [ankleY, x0 * 0.78, rT * 0.32, 0],
      [0.025 * H, x0 * 0.78, rT * 0.3, 0],
    ];
    // 허벅지 윗부분은 앞뒤로 조금 두툼하게 해서 엉덩이와 자연스럽게 이어지게 해요.
    const leg = smooth(legKeys, 6).map(([y, x, r, z]) => {
      const top = Math.min(1, Math.max(0, (y - (crotch - 0.08 * H)) / (0.1 * T + 0.08 * H)));
      return { c: new THREE.Vector3(x, y, z), a: r, b: r * (0.93 + 0.22 * top) };
    });
    add(loft(leg, new THREE.Vector3(0, -1, 0), new THREE.Vector3(1, 0, 0)));
    // 발
    add(ellipsoid(4.3 * scale, 3.4 * scale, 0.075 * H), new THREE.Vector3(x0 * 0.8, 3.2 * scale, 0.03 * H));
  }

  /* 팔 (살짝 벌린 자세) */
  const angle = (9 * Math.PI) / 180;
  for (const side of [-1, 1]) {
    const dir = new THREE.Vector3(side * Math.sin(angle), -Math.cos(angle), 0);
    const start = new THREE.Vector3(side * (shoulderA - rU * 0.95), shoulderY - rU * 0.75, 0);
    const armKeys = [
      [-0.02, rU * 1.12],
      [0.12, rU * 1.02],
      [0.45, rU * 0.76],
      [0.56, rU * 0.82],
      [0.9, rU * 0.52],
      [1, rU * 0.46],
    ];
    const arm = smooth(armKeys, 6).map(([t, r]) => ({ c: start.clone().addScaledVector(dir, t * s.arm), a: r, b: r * 0.9 }));
    const u = new THREE.Vector3(Math.cos(angle), side * Math.sin(angle), 0); // 팔 방향에 수직인 너비 방향
    add(loft(arm, dir, u));
    // 둥근 어깨(삼각근)
    add(ellipsoid(rU * 1.12, rU * 1.12, rU * 1.0), start.clone().addScaledVector(dir, -0.02 * s.arm));
    // 손 (허벅지를 향해 편 모양)
    const handLen = 0.108 * H;
    add(ellipsoid(1.7 * scale, handLen / 2, 4.2 * scale), start.clone().addScaledVector(dir, s.arm + handLen * 0.42), side * angle);
  }

  /* 머리 */
  add(ellipsoid(0.047 * H, 0.066 * H, 0.057 * H), new THREE.Vector3(0, H - 0.066 * H, 0.4 * scale));

  return group;
}

/** 발밑의 부드러운 그림자 */
function groundShadow() {
  const canvas = document.createElement("canvas");
  canvas.width = canvas.height = 128;
  const ctx = canvas.getContext("2d")!;
  const grad = ctx.createRadialGradient(64, 64, 4, 64, 64, 64);
  grad.addColorStop(0, "rgba(80,60,70,0.28)");
  grad.addColorStop(1, "rgba(80,60,70,0)");
  ctx.fillStyle = grad;
  ctx.fillRect(0, 0, 128, 128);
  const mesh = new THREE.Mesh(
    new THREE.PlaneGeometry(70, 50),
    new THREE.MeshBasicMaterial({ map: new THREE.CanvasTexture(canvas), transparent: true, depthWrite: false }),
  );
  mesh.rotation.x = -Math.PI / 2;
  mesh.position.y = 0.1;
  return mesh;
}

const VIEWS = [
  { label: "정면", rot: 0 },
  { label: "측면", rot: Math.PI / 2 },
  { label: "후면", rot: Math.PI },
];

/* ───────── 화면 컴포넌트 ───────── */

export function Avatar3D({ shape, className, controls = true }: { shape: BodyShape; className?: string; controls?: boolean }) {
  const boxRef = useRef<HTMLDivElement>(null);
  const api = useRef<{ setBody: (s: BodyShape) => void; setView: (rot: number) => void } | null>(null);
  const [failed, setFailed] = useState(false);
  const [view, setView] = useState(0);

  // 3D 화면은 처음 한 번만 만들고, 치수가 바뀌면 몸만 새로 만들어요.
  useEffect(() => {
    const box = boxRef.current;
    if (!box) return;
    let renderer: THREE.WebGLRenderer;
    try {
      renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    } catch {
      // eslint-disable-next-line react-hooks/set-state-in-effect -- WebGL을 못 쓰는 기기에서만 안내로 바꿔요
      setFailed(true);
      return;
    }
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.outputColorSpace = THREE.SRGBColorSpace;
    box.appendChild(renderer.domElement);
    renderer.domElement.style.touchAction = "pan-y"; // 세로 스크롤은 그대로, 가로 드래그로 회전

    const scene = new THREE.Scene();
    const camera = new THREE.PerspectiveCamera(26, 1, 10, 2000);
    scene.add(new THREE.HemisphereLight("#ffffff", "#cfc3b8", 1.6));
    const key = new THREE.DirectionalLight("#ffffff", 1.5);
    key.position.set(120, 260, 260);
    scene.add(key);
    const rim = new THREE.DirectionalLight("#f3e9f0", 0.7);
    rim.position.set(-200, 120, -220);
    scene.add(rim);
    scene.add(groundShadow());

    const material = new THREE.MeshStandardMaterial({ color: SKIN, roughness: 0.62, metalness: 0 });
    const root = new THREE.Group();
    scene.add(root);
    let body: THREE.Group | null = null;
    let frameH = 180;
    let rot = 0;
    let target = 0;

    const fit = () => {
      const w = box.clientWidth || 1;
      const h = box.clientHeight || 1;
      renderer.setSize(w, h, false);
      renderer.domElement.style.width = "100%";
      renderer.domElement.style.height = "100%";
      camera.aspect = w / h;
      // 키가 화면 안에 들어오도록 거리를 정해요 (키가 클수록 크게 보이도록 최소 기준 175cm)
      const half = (THREE.MathUtils.degToRad(camera.fov) / 2);
      const needH = frameH * 1.06;
      const needW = 70 / camera.aspect;
      const dist = Math.max(needH, needW) / 2 / Math.tan(half);
      camera.position.set(0, frameH * 0.5, dist);
      camera.lookAt(0, frameH * 0.48, 0);
      camera.updateProjectionMatrix();
    };

    api.current = {
      setBody: (s) => {
        if (body) {
          root.remove(body);
          body.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
        }
        body = buildBody(s, material);
        root.add(body);
        frameH = Math.max(s.height, 175) + 8;
        fit();
      },
      setView: (r) => {
        // 가까운 방향으로 돌아가도록 현재 각도 기준으로 맞춰요
        const turns = Math.round((rot - r) / (Math.PI * 2));
        target = r + turns * Math.PI * 2;
      },
    };

    // 드래그로 회전
    let dragX: number | null = null;
    const down = (e: PointerEvent) => {
      dragX = e.clientX;
      renderer.domElement.setPointerCapture(e.pointerId);
    };
    const move = (e: PointerEvent) => {
      if (dragX === null) return;
      target += (e.clientX - dragX) * 0.012;
      dragX = e.clientX;
    };
    const up = () => (dragX = null);
    renderer.domElement.addEventListener("pointerdown", down);
    renderer.domElement.addEventListener("pointermove", move);
    renderer.domElement.addEventListener("pointerup", up);
    renderer.domElement.addEventListener("pointercancel", up);

    const ro = new ResizeObserver(fit);
    ro.observe(box);

    let raf = 0;
    const tick = () => {
      rot += (target - rot) * 0.18;
      root.rotation.y = rot;
      renderer.render(scene, camera);
      raf = requestAnimationFrame(tick);
    };
    tick();

    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
      body?.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      material.dispose();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh && m.material !== material) {
          m.geometry.dispose();
          const mat = m.material as THREE.MeshBasicMaterial;
          mat.map?.dispose();
          mat.dispose();
        }
      });
      renderer.dispose();
      renderer.domElement.remove();
      api.current = null;
    };
  }, []);

  // 치수가 바뀌면 바로 몸 모양을 다시 만들어요.
  const key = JSON.stringify(shape);
  useEffect(() => {
    api.current?.setBody(JSON.parse(key));
  }, [key]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={boxRef}
        role="img"
        aria-label={`3D 아바타 · 키 ${Math.round(shape.height)}cm, 몸무게 ${Math.round(shape.weight)}kg`}
        className="absolute inset-0 cursor-grab active:cursor-grabbing"
      />
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-sub">
          이 기기에서는 3D 아바타를 표시할 수 없어요.
        </p>
      )}
      {controls && !failed && (
        <div className="absolute bottom-1 left-1/2 flex -translate-x-1/2 gap-1">
          {VIEWS.map((v, i) => (
            <button
              key={v.label}
              type="button"
              aria-pressed={view === i}
              onClick={(e) => {
                e.stopPropagation();
                setView(i);
                api.current?.setView(v.rot);
              }}
              className={cn(
                "rounded-full border-[0.75px] px-2 py-0.5 text-[10px] leading-[1.4]",
                view === i ? "border-plum bg-plum font-medium text-white" : "border-line bg-white/80 text-sub",
              )}
            >
              {v.label}
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
