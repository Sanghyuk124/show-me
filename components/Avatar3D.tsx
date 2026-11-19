"use client";

// 키·몸무게·상세 치수로 모양이 바뀌는 3D 아바타입니다.
// 인체 모델: MakeHuman(CC0) → scripts/avatar/build_avatar.py 로 만든 public/models/avatar-*.bin
// 치수 계산: lib/bodyModel.ts(입력값 정리) + lib/avatarModel.ts(몸 모양 맞추기)
// 이 파일은 그 모양을 화면에 그리고 돌려 보는 역할이에요.

import { useEffect, useRef, useState } from "react";
import * as THREE from "three";
import type { BodyShape } from "@/lib/bodyModel";
import { loadAvatarModel, shapeAvatar, type AvatarModel } from "@/lib/avatarModel";
import { buildGarment, templateKeyFor, type FitLine, type GarmentMesh, type GarmentSpec } from "@/lib/garment";
import { loadGarmentTemplates, type GarmentTemplate, type TemplateKey } from "@/lib/garmentTemplates";
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
uniform float uNoBra;
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
  if (uNoBra > 0.5) return brief; // 2D로 상의를 입었을 때는 브라를 숨겨요 (어깨끈이 옷 밖으로 보이지 않게)
  return max(max(brief, band), max(cup, strap));
}
`;

/** 아바타 파일의 몸으로 3D 물체를 만들어요 (정점 위치는 나중에 치수에 맞춰 채워요). */
function createBody(model: AvatarModel, gender: BodyShape["gender"]) {
  const pal = PALETTE[gender];
  const lm = model.landmarks;
  const position = new THREE.BufferAttribute(new Float32Array(model.base.length), 3); // 도우미 정점 포함 (그리지는 않아요)
  const body = new THREE.BufferGeometry();
  body.setAttribute("position", position);
  body.setAttribute("rest", new THREE.BufferAttribute(model.base, 3)); // 속옷 위치를 정하는 기본 몸 좌표
  body.setAttribute("armF", new THREE.BufferAttribute(model.armF, 1, true));
  body.setIndex(new THREE.BufferAttribute(model.index, 1));
  const eyes = new THREE.BufferGeometry();
  eyes.setAttribute("position", position);
  eyes.setIndex(new THREE.BufferAttribute(model.eyeIndex, 1));

  const skinMat = new THREE.MeshStandardMaterial({ color: pal.skin, roughness: 0.78, metalness: 0 });
  const noBra = { value: 0 }; // 1이면 브라를 숨겨요 (2D 입어보기에서 상의를 입었을 때)
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
    u.uNoBra = noBra;
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
  return { group, body, eyes, position, noBra };
}

/**
 * 옷 3D 모양: 방향(법선)은 원래 점끼리 이어서 매끈하게 구하고,
 * 천 무늬 좌표가 다른 점은 나눠서 이미지가 제자리에 붙게 해요.
 */
function garmentGeometry(gm: GarmentMesh, tpl: GarmentTemplate) {
  const tmp = new THREE.BufferGeometry();
  tmp.setAttribute("position", new THREE.BufferAttribute(gm.positions, 3));
  tmp.setIndex(new THREE.BufferAttribute(gm.index, 1));
  tmp.computeVertexNormals();
  const nrm = tmp.getAttribute("normal").array as Float32Array;
  const n = tpl.split.length;
  const p = new Float32Array(n * 3);
  const nn = new Float32Array(n * 3);
  const c = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const o = tpl.split[i] * 3;
    for (let d = 0; d < 3; d++) {
      p[i * 3 + d] = gm.positions[o + d];
      nn[i * 3 + d] = nrm[o + d];
      c[i * 3 + d] = gm.heat[o + d];
    }
  }
  tmp.dispose();
  const geo = new THREE.BufferGeometry();
  geo.setAttribute("position", new THREE.BufferAttribute(p, 3));
  geo.setAttribute("normal", new THREE.BufferAttribute(nn, 3));
  geo.setAttribute("color", new THREE.BufferAttribute(c, 3));
  geo.setAttribute("uv", new THREE.BufferAttribute(tpl.uv, 2));
  geo.setIndex(new THREE.BufferAttribute(tpl.splitIndex, 1));
  return geo;
}

const textures = new Map<string, THREE.Texture>();
/** 옷 이미지(노멀맵·AO)를 한 번만 불러와 같이 써요 */
function fabricTexture(url: string | undefined) {
  if (!url) return null;
  let t = textures.get(url);
  if (!t) {
    t = new THREE.TextureLoader().load(url);
    t.colorSpace = THREE.NoColorSpace; // 색이 아니라 데이터 이미지예요
    t.anisotropy = 4;
    textures.set(url, t);
  }
  return t;
}

/** 세 꼭짓점이 모두 옷에 덮인 몸 삼각형은 빼요 */
function visibleIndex(index: Uint32Array, covered: Uint8Array) {
  if (!covered.some((c) => c)) return index;
  const out: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    if (covered[index[t]] && covered[index[t + 1]] && covered[index[t + 2]]) continue;
    out.push(index[t], index[t + 1], index[t + 2]);
  }
  return new Uint32Array(out);
}

/** 세 꼭짓점이 모두 높이 y보다 위인 삼각형은 빼요 */
function hiddenAbove(geo: THREE.BufferGeometry, y: number) {
  const index = geo.index!.array as Uint32Array;
  const pos = geo.getAttribute("position").array as Float32Array;
  const out: number[] = [];
  for (let t = 0; t < index.length; t += 3) {
    if (pos[index[t] * 3 + 1] > y && pos[index[t + 1] * 3 + 1] > y && pos[index[t + 2] * 3 + 1] > y) continue;
    out.push(index[t], index[t + 1], index[t + 2]);
  }
  return new Uint32Array(out);
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

/**
 * 2D 입어보기용: 정면 화면에서 몸의 기준 위치.
 * 화면 좌표(px) = (ox + x·sx, oy − y·sy) — x·y는 몸 좌표(cm, 바닥 0, 몸 가운데 x=0)
 */
export interface BodyLayout {
  sx: number;
  sy: number;
  ox: number;
  oy: number;
  /** 몸 기준 (cm): 어깨 끝 좌우 x·높이, 가랑이·키 높이, 둘레 위치마다 높이와 좌우 끝 x */
  shoulder: { xl: number; xr: number; y: number };
  crotchY: number;
  height: number;
  rings: Record<"bust" | "waist" | "hips" | "thigh" | "knee" | "ankle", { y: number; xl: number; xr: number }>;
  /** 팔: 어깨 끝 → 손목 (cm). 화면 왼쪽 팔(x가 작은 쪽)과 오른쪽 팔 */
  arms: { left: { x0: number; y0: number; x1: number; y1: number }; right: { x0: number; y0: number; x1: number; y1: number } };
  /** 화면 크기 (px) */
  width: number;
  height_px: number;
}

export interface GarmentReport {
  name: string;
  kind: GarmentSpec["kind"];
  category: GarmentSpec["category"];
  lines: FitLine[];
}

export function Avatar3D({
  shape,
  className,
  controls = true,
  garments = [],
  fitView = false,
  onReport,
  flat = false,
  onLayout,
  children,
}: {
  shape: BodyShape;
  className?: string;
  controls?: boolean;
  /** 입혀 볼 옷 (lib/garment.ts) */
  garments?: GarmentSpec[];
  /** true면 옷 색 대신 부위별 핏 색 (끼어요·딱 붙어요·잘 맞아요·넉넉해요) */
  fitView?: boolean;
  onReport?: (r: GarmentReport[]) => void;
  /** true면 2D 입어보기: 정면에 고정하고 3D 옷은 그리지 않아요 (핏 설명은 계산해요) */
  flat?: boolean;
  /** 정면 화면에서의 몸 기준 위치 (2D 옷을 겹칠 때 써요) */
  onLayout?: (l: BodyLayout) => void;
  /** 3D 화면 위에 겹쳐 그릴 것 (2D 옷) */
  children?: React.ReactNode;
}) {
  const boxRef = useRef<HTMLDivElement>(null);
  type Scene = { shape: BodyShape; garments: GarmentSpec[]; fitView: boolean; flat: boolean };
  const api = useRef<{ setBody: (s: Scene) => void; setView: (rot: number) => void } | null>(null);
  const reportRef = useRef(onReport);
  const layoutRef = useRef(onLayout);
  const flatRef = useRef(flat);
  useEffect(() => {
    reportRef.current = onReport;
    layoutRef.current = onLayout;
    flatRef.current = flat;
  }, [onReport, onLayout, flat]);
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
    const clothes = new THREE.Group();
    root.add(clothes);
    const clearClothes = () => {
      for (const c of [...clothes.children]) {
        const m = c as THREE.Mesh;
        m.geometry.dispose();
        (m.material as THREE.Material).dispose();
        clothes.remove(m);
      }
    };
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
      camera.updateMatrixWorld();
      reportLayout();
    };

    // 2D 입어보기: 정면(회전 0)에서 몸 기준점들이 화면 어디에 오는지 알려 줘요
    let layoutSrc: { model: AvatarModel; pos: Float32Array; height: number } | null = null;
    const reportLayout = () => {
      if (!layoutSrc || !layoutRef.current) return;
      const { model, pos, height } = layoutSrc;
      const w = box.clientWidth || 1;
      const h = box.clientHeight || 1;
      const toPx = (x: number, y: number) => {
        const v = new THREE.Vector3(x, y, 0).project(camera);
        return [((v.x + 1) / 2) * w, ((1 - v.y) / 2) * h];
      };
      const [ox, oy] = toPx(0, 0);
      const [x1] = toPx(10, 0);
      const [, y1] = toPx(0, 10);
      const ring = (name: string) => {
        const idx = model.rulers[name];
        let y = 0, xl = Infinity, xr = -Infinity;
        for (const i of idx) {
          y += pos[i * 3 + 1];
          xl = Math.min(xl, pos[i * 3]);
          xr = Math.max(xr, pos[i * 3]);
        }
        return { y: y / idx.length, xl, xr };
      };
      const [a, b] = model.shoulderTips.map((i) => i * 3);
      // 왼팔(+x) 손목 = 아래팔 줄자 끝, 반대쪽은 좌우를 뒤집어요
      const wr = model.rulers.lowerarm[1] * 3;
      const plus = pos[a] > pos[b] ? a : b;
      const minus = plus === a ? b : a;
      const armR = { x0: pos[plus], y0: pos[plus + 1], x1: pos[wr], y1: pos[wr + 1] };
      const armL = { x0: pos[minus], y0: pos[minus + 1], x1: -pos[wr], y1: pos[wr + 1] };
      layoutRef.current({
        arms: { left: armL, right: armR },
        width: w,
        height_px: h,
        sx: (x1 - ox) / 10,
        sy: (oy - y1) / 10,
        ox,
        oy,
        shoulder: { xl: Math.min(pos[a], pos[b]), xr: Math.max(pos[a], pos[b]), y: (pos[a + 1] + pos[b + 1]) / 2 },
        crotchY: pos[model.crotch * 3 + 1],
        height,
        rings: {
          bust: ring("bust"),
          waist: ring("waist"),
          hips: ring("hips"),
          thigh: ring("thigh"),
          knee: ring("knee"),
          ankle: ring("ankle"),
        },
      });
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
    const rebuild = async ({ shape: s, garments: wear, fitView: heat }: Scene) => {
      const ticket = ++latest;
      let model: AvatarModel;
      let templates: Map<TemplateKey, GarmentTemplate> | null = null;
      try {
        // 옷을 입을 때만 옷 본 파일을 같이 불러와요
        [model, templates] = await Promise.all([loadAvatarModel(s.gender), wear.length ? loadGarmentTemplates() : Promise.resolve(null)]);
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

      // 옷 입히기: MakeHuman 옷 본을 몸에 입히고, 옷 실측에 맞게 고쳐요 (lib/garment.ts)
      clearClothes();
      const reports: GarmentReport[] = [];
      const covered = new Uint8Array(model.vertexCount);
      // 하의를 먼저 입히고 상의를 위에 (상의가 바지 허리를 덮어요)
      const ordered = [...wear].sort((a, b) => (a.kind === b.kind ? 0 : a.kind === "bottom" ? -1 : 1));
      let bottomMesh: GarmentMesh | undefined;
      let bottomGeo: THREE.BufferGeometry | undefined;
      for (const spec of ordered) {
        const tpl = templates?.get(templateKeyFor(spec, s.gender));
        if (!tpl) continue;
        const gm = buildGarment(model, body.position.array as Float32Array, spec, tpl, spec.kind === "top" ? bottomMesh : undefined);
        if (spec.kind === "bottom") bottomMesh = gm;
        // 2D 입어보기에서는 핏 설명만 쓰고 3D 옷은 그리지 않아요
        if (flatRef.current) {
          reports.push({ name: spec.name, kind: spec.kind, category: spec.category, lines: gm.report });
          continue;
        }
        gm.covers.forEach((c, i) => c && (covered[i] = 1));
        const geo = garmentGeometry(gm, tpl);
        // 천의 주름·결(노멀맵)과 접힌 곳 그림자(AO)는 MakeHuman 옷 이미지를 써요
        const mat = new THREE.MeshStandardMaterial({
          color: heat ? "#ffffff" : spec.color,
          vertexColors: heat,
          roughness: 0.92,
          metalness: 0,
          side: THREE.DoubleSide,
          normalMap: fabricTexture(tpl.textures.normal),
          aoMap: fabricTexture(tpl.textures.ao),
          aoMapIntensity: 0.85,
        });
        mat.normalScale.set(0.9, 0.9);
        clothes.add(new THREE.Mesh(geo, mat));
        if (spec.kind === "bottom") bottomGeo = geo;
        // 상의를 입으면 밑단보다 위의 바지는 가려지니 그리지 않아요 (바지가 상의 밖으로 비치지 않게)
        if (spec.kind === "top" && bottomGeo && bottomMesh && gm.hemY !== undefined) {
          bottomGeo.setIndex(new THREE.BufferAttribute(hiddenAbove(bottomGeo, gm.hemY + 3), 1));
        }
        reports.push({ name: spec.name, kind: spec.kind, category: spec.category, lines: gm.report });
      }
      // 옷 아래 가려지는 몸은 그리지 않아요 (옷 밖으로 피부가 비치지 않게)
      body.body.setIndex(new THREE.BufferAttribute(visibleIndex(model.index, covered), 1));
      reportRef.current?.(reports);

      layoutSrc = { model, pos: body.position.array as Float32Array, height: s.height };
      body.noBra.value = flatRef.current && wear.some((w) => w.kind === "top") ? 1 : 0;
      if (flatRef.current) target = Math.round(rot / (Math.PI * 2)) * Math.PI * 2; // 정면으로
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
      if (flatRef.current) return; // 2D 입어보기는 정면 고정
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
      clearClothes();
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
  const key = JSON.stringify({ shape, garments, fitView, flat });
  useEffect(() => {
    api.current?.setBody(JSON.parse(key));
  }, [key]);

  return (
    <div className={cn("relative", className)}>
      <div
        ref={boxRef}
        role="img"
        aria-label={`3D 아바타 · 키 ${Math.round(shape.height)}cm, 몸무게 ${Math.round(shape.weight)}kg`}
        className={cn("absolute inset-0", !flat && "cursor-grab active:cursor-grabbing")}
      />
      {children && <div className="pointer-events-none absolute inset-0">{children}</div>}
      {failed && (
        <p className="absolute inset-0 flex items-center justify-center px-4 text-center text-[11px] text-sub">
          이 기기에서는 3D 아바타를 표시할 수 없어요.
        </p>
      )}
      {controls && !flat && !failed && (
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
