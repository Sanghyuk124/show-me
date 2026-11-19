// MakeHuman(CC0) 기본 옷으로 만든 '옷 본(템플릿)'을 읽고, 아바타 몸에 그대로 입히는 곳입니다.
// 파일 만드는 법: scripts/avatar/build_garments.py → public/models/garments.bin
//
// 옷의 점 하나하나는 '몸 위의 점 3개(삼각형) + 그 삼각형에서 떨어진 거리'로 묶여 있어요.
// 그래서 키·몸무게·치수로 몸이 바뀌면 옷도 그 몸에 맞게 같이 바뀌어요. (MakeHuman 옷 맞추기 방식)
// 옷 실측(둘레·기장·소매)에 맞춰 넓히고 줄이는 건 lib/garment.ts 에서 해요.

import type { Gender } from "./data";

export type TemplateKey =
  | "tee_short_f"
  | "blouse"
  | "tee_long_m"
  | "tee_short_m"
  | "shirt"
  | "jacket"
  | "pants_f"
  | "pants_m"
  | "skirt"
  | "shorts";

export interface GarmentTemplate {
  key: TemplateKey;
  kind: "top" | "bottom";
  label: string;
  vertexCount: number;
  /** 옷 점마다 묶인 몸 정점 3개 (아바타 파일의 정점 번호) */
  refs: Uint32Array;
  weights: Float32Array;
  /** 몸 삼각형 기준 떨어진 거리 (삼각형 크기 단위) */
  offsets: Float32Array;
  /** 1이면 몸 점 하나에 붙은 옷 점 (offsets가 cm 그대로) */
  single: Uint8Array;
  index: Uint32Array;
  /** 스커트처럼 몸통을 감싸는 옷: 기본 몸 기준 [높이, 각도, 중심에서 거리] (cm) */
  cyl?: { data: Float32Array; levels: CylLevels };
}

/** 기본 몸의 기준 높이·엉덩이 둘레 (cm) */
export interface CylLevels {
  crotchY: number;
  hipsY: number;
  waistY: number;
  hipsC: number;
  hipsZ: number;
}

interface Header {
  templates: { key: TemplateKey; kind: "top" | "bottom"; label: string; vertexCount: number; cyl?: CylLevels }[];
  arrays: Record<string, { type: string; count: number; offset: number }>;
}

let cache: Promise<Map<TemplateKey, GarmentTemplate>> | null = null;

/** 옷 본 파일을 한 번만 내려받아요 */
export function loadGarmentTemplates() {
  if (!cache) {
    cache = fetch("/models/garments.bin")
      .then((r) => {
        if (!r.ok) throw new Error(`옷 파일을 불러오지 못했어요 (${r.status})`);
        return r.arrayBuffer();
      })
      .then(parse);
    cache.catch(() => (cache = null));
  }
  return cache;
}

function parse(buf: ArrayBuffer) {
  const view = new DataView(buf);
  const hLen = view.getUint32(0, true);
  const header: Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hLen)));
  const start = 4 + hLen;
  const get = (name: string) => {
    const a = header.arrays[name];
    const off = start + a.offset;
    if (a.type === "float32") return new Float32Array(buf, off, a.count);
    if (a.type === "uint32") return new Uint32Array(buf, off, a.count);
    return new Uint8Array(buf, off, a.count);
  };
  const out = new Map<TemplateKey, GarmentTemplate>();
  for (const t of header.templates) {
    out.set(t.key, {
      ...t,
      refs: get(`${t.key}_refs`) as Uint32Array,
      weights: get(`${t.key}_w`) as Float32Array,
      offsets: get(`${t.key}_off`) as Float32Array,
      single: get(`${t.key}_single`) as Uint8Array,
      index: get(`${t.key}_index`) as Uint32Array,
      cyl: t.cyl ? { data: get(`${t.key}_cyl`) as Float32Array, levels: t.cyl } : undefined,
    });
  }
  return out;
}

/** 옷 모양 종류 → 성별에 맞는 옷 본 */
export type GarmentStyle = "tee" | "tee_long" | "shirt" | "jacket" | "pants" | "skirt" | "shorts";

export function templateFor(style: GarmentStyle, gender: Gender): TemplateKey {
  const f = gender === "female";
  switch (style) {
    case "tee":
      return f ? "tee_short_f" : "tee_short_m";
    case "tee_long":
      return "tee_long_m";
    case "shirt":
      return f ? "blouse" : "shirt";
    case "jacket":
      return "jacket";
    case "pants":
      return f ? "pants_f" : "pants_m";
    case "skirt":
      return "skirt";
    case "shorts":
      return "shorts";
  }
}

/**
 * 원통 좌표 옷(스커트)을 지금 몸에 감싸요.
 * 높이는 기본 몸의 가랑이·엉덩이·허리 높이를 지금 몸의 높이로 옮기고, 거리는 엉덩이 둘레 비율만큼 키워요.
 */
export function placeCylinder(t: GarmentTemplate, now: { crotchY: number; hipsY: number; waistY: number; hipsC: number; centerZ: (y: number) => number }) {
  const { data, levels: L } = t.cyl!;
  const n = t.vertexCount;
  const out = new Float32Array(n * 3);
  const k = now.hipsC / L.hipsC;
  const mapY = (y: number) => {
    if (y >= L.hipsY) return now.hipsY + ((y - L.hipsY) * (now.waistY - now.hipsY)) / (L.waistY - L.hipsY);
    return now.hipsY - ((L.hipsY - y) * (now.hipsY - now.crotchY)) / (L.hipsY - L.crotchY);
  };
  for (let i = 0; i < n; i++) {
    const y = mapY(data[i * 3]);
    const th = data[i * 3 + 1];
    const r = data[i * 3 + 2] * k;
    out[i * 3] = Math.cos(th) * r;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = now.centerZ(y) + Math.sin(th) * r;
  }
  return out;
}

/**
 * 옷 본을 지금 아바타 몸에 입혀요 (실측 반영 전, MakeHuman 원래 핏).
 * pos: 아바타 정점 위치 (shapeAvatar 결과, 도우미 정점 포함)
 */
export function placeTemplate(t: GarmentTemplate, pos: Float32Array) {
  const n = t.vertexCount;
  const out = new Float32Array(n * 3);
  for (let i = 0; i < n; i++) {
    const a = t.refs[i * 3] * 3;
    const b = t.refs[i * 3 + 1] * 3;
    const c = t.refs[i * 3 + 2] * 3;
    const w0 = t.weights[i * 3];
    const w1 = t.weights[i * 3 + 1];
    const w2 = t.weights[i * 3 + 2];
    const ox = t.offsets[i * 3];
    const oy = t.offsets[i * 3 + 1];
    const oz = t.offsets[i * 3 + 2];
    // 몸 위의 기준점
    let x = pos[a] * w0 + pos[b] * w1 + pos[c] * w2;
    let y = pos[a + 1] * w0 + pos[b + 1] * w1 + pos[c + 1] * w2;
    let z = pos[a + 2] * w0 + pos[b + 2] * w1 + pos[c + 2] * w2;
    if (t.single[i]) {
      x += ox;
      y += oy;
      z += oz;
    } else {
      // 몸 삼각형의 축: e1(a→b), n(면 바깥), e2(n×e1), 크기 L(세 변 평균)
      const abx = pos[b] - pos[a], aby = pos[b + 1] - pos[a + 1], abz = pos[b + 2] - pos[a + 2];
      const acx = pos[c] - pos[a], acy = pos[c + 1] - pos[a + 1], acz = pos[c + 2] - pos[a + 2];
      const bcx = pos[c] - pos[b], bcy = pos[c + 1] - pos[b + 1], bcz = pos[c + 2] - pos[b + 2];
      const lab = Math.hypot(abx, aby, abz) || 1e-6;
      const L = (lab + Math.hypot(acx, acy, acz) + Math.hypot(bcx, bcy, bcz)) / 3;
      const e1x = abx / lab, e1y = aby / lab, e1z = abz / lab;
      let nx = aby * acz - abz * acy;
      let ny = abz * acx - abx * acz;
      let nz = abx * acy - aby * acx;
      const ln = Math.hypot(nx, ny, nz) || 1e-6;
      nx /= ln;
      ny /= ln;
      nz /= ln;
      const e2x = ny * e1z - nz * e1y;
      const e2y = nz * e1x - nx * e1z;
      const e2z = nx * e1y - ny * e1x;
      x += (e1x * ox + e2x * oy + nx * oz) * L;
      y += (e1y * ox + e2y * oy + ny * oz) * L;
      z += (e1z * ox + e2z * oy + nz * oz) * L;
    }
    out[i * 3] = x;
    out[i * 3 + 1] = y;
    out[i * 3 + 2] = z;
  }
  return out;
}
