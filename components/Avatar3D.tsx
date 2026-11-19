"use client";

// 키·몸무게·상세 치수로 모양이 바뀌는 3D 아바타입니다.
// 인체 모델: MakeHuman(CC0) → scripts/avatar/build_avatar.py 로 만든 public/models/avatar-*.bin
// 치수 계산: lib/bodyModel.ts(입력값 정리) + lib/avatarModel.ts(몸 모양 맞추기)
// 이 파일은 그 모양을 화면에 그리고 돌려 보는 역할이에요.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { BodyShape } from "@/lib/bodyModel";
import { loadAvatarModel, shapeAvatar, type AvatarModel } from "@/lib/avatarModel";
import { cn } from "./ui";

// 피부·속옷 색 (Figma 프로토타입의 아바타 이미지 참고)
const PALETTE = {
  female: { skin: "#d8cdc2", cloth: "#46454b", eye: "#4a403a" },
  male: { skin: "#a29b94", cloth: "#3e3d42", eye: "#3b3430" },
};

/**
 * 속옷을 칠하는 규칙 (GLSL). 화면의 픽셀마다 '기본 몸에서의 위치'를 보고 정해서 경계가 매끈해요.
 * 브라(밑밴드·컵·어깨끈)와 하이컷 브리프(여성), 드로즈(남성). 기준 높이는 아바타 파일의 landmarks.
 */
const CLOTH_GLSL = /* glsl */ `
uniform float uHipsY, uWaistY, uBustY, uUnderY, uCrotchY, uHipsHalf, uHipsZ, uShoulderY, uTorsoZ, uBreastX;
uniform float uMale;
uniform vec3 uSkin, uCloth;
varying vec3 vRest;
varying float vArm;
float bandY(float y, float lo, float hi) {
  float aa = 0.12;
  return smoothstep(lo - aa, lo + aa, y) * (1.0 - smoothstep(hi - aa, hi + aa, y));
}
float clothMask(vec3 p) {
  float ax = abs(p.x);
  if (uMale > 0.5) {
    // 드로즈: 허리 아래 ~ 허벅지 위쪽
    return bandY(p.y, uCrotchY - 9.0, uHipsY + 0.62 * (uWaistY - uHipsY));
  }
  // 하이컷 브리프: 가운데는 가랑이까지, 옆으로 갈수록 다리 선을 따라 올라가요 (뒤는 엉덩이를 더 덮어요)
  float u = ax / uHipsHalf;
  float back = 1.0 - smoothstep(uHipsZ - 1.0, uHipsZ + 1.0, p.z);
  float sideBottom = mix(uHipsY + 1.0, uHipsY - 4.0, back);
  float bottom = uCrotchY - 1.0 + (sideBottom - (uCrotchY - 1.0)) * smoothstep(0.1, 0.85, u);
  float brief = bandY(p.y, bottom, uHipsY + 0.45 * (uWaistY - uHipsY));
  // 브라
  float yU = uUnderY - 1.4;
  float band = bandY(p.y, yU, yU + 2.4);
  float ub = ax / uBreastX;
  float bump = exp(-pow((ub - 1.0) / 0.62, 2.0));
  float cupTop = mix(uBustY - 3.5, uBustY + 4.2, bump);
  float front = smoothstep(uTorsoZ - 2.0, uTorsoZ, p.z);
  float cup = front * bandY(p.y, yU, cupTop) * (1.0 - smoothstep(1.7, 1.8, ub));
  float strap = (1.0 - smoothstep(0.5, 0.62, abs(ax - uBreastX * 1.02))) * bandY(p.y, yU, uShoulderY + 7.0);
  strap *= 1.0 - front * (1.0 - smoothstep(cupTop - 0.8, cupTop - 0.4, p.y)); // 앞쪽은 컵 위로만
  return max(max(brief, band), max(cup, strap));
}
`;

/** 아바타 파일의 몸으로 3D 물체를 만들어요 (정점 위치는 나중에 치수에 맞춰 채워요). */
function createBody(model: AvatarModel, gender: BodyShape["gender"]) {
  const pal = PALETTE[gender];
  const lm = model.landmarks;
  const position = new THREE.BufferAttribute(new Float32Array(model.vertexCount * 3), 3);
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", position);
  body.setAttribute("rest", new THREE.BufferAttribute(model.base, 3)); // 속옷 위치를 정하는 기본 몸 좌표
  body.setAttribute("armF", new THREE.BufferAttribute(model.armF, 1, true));
  body.setIndex(new THREE.BufferAttribute(model.index, 1));
  const eyes = new THREE.BufferGeometry();
  eyes.setAttribute("position", position);
  eyes.setIndex(new THREE.BufferAttribute(model.eyeIndex, 1));

  const skinMat = new THREE.MeshStandardMaterial({ color: pal.skin, roughness: 0.78, metalness: 0 });
  skinMat.onBeforeCompile = (shader) => {
    const u = shader.uniforms;
    u.uHipsY = { value: lm.hipsY };
    u.uWaistY = { value: lm.waistY };
    u.uBustY = { value: lm.bustY };
    u.uUnderY = { value: lm.underbustY };
    u.uCrotchY = { value: lm.crotchY };
    u.uHipsHalf = { value: lm.hipsHalf };
    u.uHipsZ = { value: lm.hipsZ };
    u.uShoulderY = { value: lm.shoulderY };
    u.uTorsoZ = { value: lm.torsoZ };
    u.uBreastX = { value: lm.breastX };
    u.uMale = { value: gender === "male" ? 1 : 0 };
    u.uSkin = { value: new THREE.Color(pal.skin) };
    u.uCloth = { value: new THREE.Color(pal.cloth) };
    shader.vertexShader = shader.vertexShader
      .replace("#include <common>", "#include <common>\nattribute vec3 rest;\nattribute float armF;\nvarying vec3 vRest;\nvarying float vArm;")
      .replace("#include <begin_vertex>", "#include <begin_vertex>\nvRest = rest;\nvArm = armF;");
    shader.fragmentShader = shader.fragmentShader
      .replace("#include <common>", "#include <common>\n" + CLOTH_GLSL)
      .replace(
        "#include <color_fragment>",
        "#include <color_fragment>\nfloat clothAmt = clothMask(vRest) * (1.0 - smoothstep(0.35, 0.6, vArm));\ndiffuseColor.rgb = mix(uSkin, uCloth, clothAmt);",
      );
  };

  const group = new THREE.Group();
  group.add(new THREE.Mesh(body, skinMat));
  group.add(new THREE.Mesh(eyes, new THREE.MeshStandardMaterial({ color: pal.eye, roughness: 0.35, metalness: 0 })));
  return { group, body, eyes, position };
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

    const root = new THREE.Group();
    scene.add(root);
    let body: (ReturnType<typeof createBody> & { gender: BodyShape["gender"] }) | null = null;
    let disposed = false;
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
    let latest = 0;
    const disposeBody = () => {
      if (!body) return;
      root.remove(body.group);
      body.body.dispose();
      body.eyes.dispose();
      body.group.traverse((o) => ((o as THREE.Mesh).material as THREE.Material | undefined)?.dispose());
      body = null;
    };
    const rebuild = async (s: BodyShape) => {
      const ticket = ++latest;
      let model: AvatarModel;
      try {
        model = await loadAvatarModel(s.gender);
      } catch {
        if (!disposed) setFailed(true);
        return;
      }
      if (disposed || ticket !== latest) return; // 더 최근 요청이 있으면 무시
      if (!body || body.gender !== s.gender) {
        disposeBody();
        body = { ...createBody(model, s.gender), gender: s.gender };
        root.add(body.group);
      }
      body.position.array.set(shapeAvatar(model, s));
      body.position.needsUpdate = true;
      body.body.computeVertexNormals();
      body.eyes.computeVertexNormals();
      body.body.computeBoundingSphere();
      frameH = Math.max(s.height, 175) + 8;
      fit();
    };

    api.current = {
      setBody: (s) => {
        // 입력 중에는 잠깐 기다렸다가 한 번에 다시 계산해요
        clearTimeout(pending);
        pending = window.setTimeout(() => rebuild(s), body ? 80 : 0);
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
      disposed = true;
      disposeBody();
      scene.traverse((o) => {
        const m = o as THREE.Mesh;
        if (m.isMesh) {
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
