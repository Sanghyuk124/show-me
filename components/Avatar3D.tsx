"use client";

// 키·몸무게·상세 치수로 모양이 바뀌는 3D 마네킹 아바타입니다.
// 치수 계산은 lib/bodyModel.ts, 몸 모양(관절이 자연스럽게 이어지는 표면)은 lib/bodyMesh.ts,
// 이 파일은 그 모양을 화면에 그리고 돌려 보는 역할이에요.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { BodyShape } from "@/lib/bodyModel";
import { buildBodyMesh } from "@/lib/bodyMesh";
import { cn } from "./ui";

// 피부·속옷 색 (Figma 프로토타입의 아바타 이미지 참고)
const PALETTE = {
  female: { skin: "#d9cfc5", cloth: "#47464c" },
  male: { skin: "#a8a29b", cloth: "#3f3e43" },
};

/** 치수로 만든 몸 모양(lib/bodyMesh.ts)을 3D 물체로 바꿔요. */
function buildBody(shape: BodyShape, material: THREE.Material) {
  const pal = PALETTE[shape.gender];
  const toLinear = (hex: string) => new THREE.Color(hex).toArray() as [number, number, number];
  const data = buildBodyMesh(shape, { skin: toLinear(pal.skin), cloth: toLinear(pal.cloth) });
  const g = new THREE.BufferGeometry();
  g.setAttribute("position", new THREE.BufferAttribute(data.positions, 3));
  g.setAttribute("normal", new THREE.BufferAttribute(data.normals, 3));
  g.setAttribute("color", new THREE.BufferAttribute(data.colors, 3));
  g.setIndex(new THREE.BufferAttribute(data.indices, 1));
  const group = new THREE.Group();
  group.add(new THREE.Mesh(g, material));
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

    const material = new THREE.MeshStandardMaterial({ vertexColors: true, roughness: 0.72, metalness: 0 });
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

    let pending = 0;
    const rebuild = (s: BodyShape) => {
      if (body) {
        root.remove(body);
        body.traverse((o) => (o as THREE.Mesh).geometry?.dispose());
      }
      body = buildBody(s, material);
      root.add(body);
      frameH = Math.max(s.height, 175) + 8;
      fit();
    };

    api.current = {
      setBody: (s) => {
        // 입력 중에는 잠깐 기다렸다가 한 번에 다시 만들어요 (몸 모양 계산이 무거워서)
        clearTimeout(pending);
        pending = window.setTimeout(() => rebuild(s), body ? 120 : 0);
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
      clearTimeout(pending);
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
