// 아바타에 옷을 입히는 곳입니다. (그리기는 components/Avatar3D.tsx)
//
// 순서
// 1) 옷 모양 고르기: 티·셔츠·재킷·긴바지·스커트·반바지 (이름·카테고리·소매 길이로 자동, 또는 옷 데이터의 garmentType)
// 2) MakeHuman(CC0) 기본 옷 본을 아바타 몸에 그대로 입혀요 → 지금 체형에 맞는 원래 핏 (lib/garmentTemplates.ts)
// 3) 옷 실측에 맞게 고쳐요
//    - 둘레: 높이마다 '옷 실측 둘레 - 옷 본 둘레'만큼 넓히거나 줄여요. 몸보다 작으면 몸에 딱 붙어요.
//    - 기장·소매·밑위: 옷 본을 위아래(소매는 팔 방향)로 늘이거나 줄여서 끝나는 위치를 맞춰요.
//      옮긴 자리의 몸 굵기를 다시 재서, 옷이 몸 안으로 들어가지 않게 해요.
// 4) 부위별 여유분으로 '핏 보기' 색(끼어요/딱 붙어요/잘 맞아요/넉넉해요)과 핏 설명 문장을 만들어요.
//
// 옷 치수는 옷장의 실측(cm)을 그대로 써요. 둘레는 '단면 너비 × 2'로 입력한 값이에요.

import type { AvatarModel } from "./avatarModel";
import type { Category, ClosetItem, Gender, Measures } from "./data";
import { placeCylinder, placeTemplate, templateFor, type GarmentStyle, type GarmentTemplate, type TemplateKey } from "./garmentTemplates";

export type GarmentKind = "top" | "bottom";

export interface GarmentSpec {
  id: string;
  name: string;
  kind: GarmentKind;
  category: Category;
  style: GarmentStyle;
  color: string;
  /** cm. 상의: length·chest·sleeve·shoulder·waist / 하의: waist·hip·thigh·rise·length (+hem 선택) / 스커트: waist·hip·length */
  measures: Record<string, number>;
}

const NEED: Record<GarmentStyle, string[]> = {
  tee: ["length", "sleeve", "shoulder", "waist"],
  tee_long: ["length", "sleeve", "shoulder", "waist"],
  shirt: ["length", "sleeve", "shoulder", "waist"],
  jacket: ["length", "sleeve", "shoulder", "waist"],
  pants: ["waist", "hip", "thigh", "rise", "length"],
  shorts: ["waist", "hip", "thigh", "rise", "length"],
  skirt: ["waist", "hip", "length"],
};

/** 옷 모양 고르기 */
export function garmentStyle(item: Pick<ClosetItem, "name" | "category" | "garmentType">, m: Record<string, number>): GarmentStyle | null {
  const shortSleeve = (m.sleeve ?? 60) < 35;
  const t = item.garmentType;
  if (t === "tee") return shortSleeve ? "tee" : "tee_long";
  if (t === "shirt") return shortSleeve ? "tee" : "shirt";
  if (t) return t;
  const name = item.name.toLowerCase();
  if (item.category === "bottom") {
    if (/스커트|치마|skirt/.test(name)) return "skirt";
    if (/반바지|쇼츠|숏츠|shorts/.test(name) || (m.length ?? 100) < 60) return "shorts";
    return "pants";
  }
  if (item.category === "outer" || /재킷|자켓|코트|점퍼|블레이저|jacket|coat/.test(name)) return "jacket";
  if (item.category !== "top") return null;
  if (shortSleeve) return "tee";
  if (/셔츠|블라우스|shirt|blouse/.test(name)) return "shirt";
  return "tee_long";
}

/** 옷장 옷 → 입히기용 정보. 필요한 실측이 모자라면 null */
export function toGarment(item: Pick<ClosetItem, "id" | "name" | "category" | "measures" | "garmentType">, color: string): GarmentSpec | null {
  const m: Record<string, number> = {};
  for (const [k, v] of Object.entries(item.measures as Measures)) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n) && n > 0) m[k] = n;
  }
  const style = garmentStyle(item, m);
  if (!style) return null;
  if (NEED[style].some((k) => !m[k])) return null;
  const kind: GarmentKind = item.category === "bottom" ? "bottom" : "top";
  return { id: item.id, name: item.name, kind, category: item.category, style, color, measures: m };
}

export const missingFor = (category: Category) =>
  category === "bottom" ? "허리·엉덩이·허벅지 둘레, 밑위, 총 기장" : "총 기장, 팔 길이, 어깨 너비, 허리 둘레";

/* ───────── 몸 재기 (현재 아바타 위치, cm) ───────── */

interface Level {
  y: number;
  c: number;
}

class Measure {
  constructor(private model: AvatarModel, private pos: Float32Array) {}
  ring(name: string): Level {
    const r = this.model.rulers[name];
    let y = 0;
    let c = 0;
    for (let n = 0; n < r.length; n++) {
      const a = r[n] * 3;
      y += this.pos[a + 1];
      if (n > 0) {
        const b = r[n - 1] * 3;
        c += Math.hypot(this.pos[a] - this.pos[b], this.pos[a + 1] - this.pos[b + 1], this.pos[a + 2] - this.pos[b + 2]);
      }
    }
    return { y: y / r.length, c };
  }
  point(i: number): V3 {
    return [this.pos[i * 3], this.pos[i * 3 + 1], this.pos[i * 3 + 2]];
  }
}

/** 높이 y에서의 둘레를 기준 높이들 사이로 이어서 구해요 */
function circAt(levels: Level[], y: number) {
  if (y <= levels[0].y) return levels[0].c;
  for (let i = 1; i < levels.length; i++) {
    if (y <= levels[i].y) {
      const t = (y - levels[i - 1].y) / (levels[i].y - levels[i - 1].y);
      return levels[i - 1].c + (levels[i].c - levels[i - 1].c) * t;
    }
  }
  return levels[levels.length - 1].c;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const smooth = (a: number, b: number, x: number) => {
  const t = Math.min(1, Math.max(0, (x - a) / (b - a)));
  return t * t * (3 - 2 * t);
};
const MIN_GAP = 0.35; // 옷이 몸에 붙어도 이만큼은 띄워서 겹치지 않게 (cm)
/** 넉넉한 옷을 화면에서 얼마나 키울지: 천은 처지고 접히니 계산한 여유의 일부만, 최대 maxR cm 까지 */
const looseR = (dr: number, maxR = 2.2) => (dr > 0 ? Math.min(maxR, dr * 0.7) : dr);

/* ───────── 핏 판단 ───────── */

export type FitLevel = "tight" | "snug" | "fit" | "loose";
export const FIT_LABEL: Record<FitLevel, string> = { tight: "끼어요", snug: "딱 붙어요", fit: "잘 맞아요", loose: "넉넉해요" };
export const FIT_COLOR: Record<FitLevel, string> = { tight: "#d0534f", snug: "#e3a13b", fit: "#5f9e6e", loose: "#5a84c4" };

/** 여유분(cm) → 핏. 부위마다 알맞은 여유가 달라요 */
function judge(ease: number, fitFrom: number, looseFrom: number): FitLevel {
  if (ease < 0) return "tight";
  if (ease < fitFrom) return "snug";
  if (ease < looseFrom) return "fit";
  return "loose";
}

export interface FitLine {
  part: string;
  text: string;
  level?: FitLevel;
}

export interface GarmentMesh {
  spec: GarmentSpec;
  template: TemplateKey;
  positions: Float32Array;
  index: Uint32Array;
  /** 핏 보기 색 (정점마다) */
  heat: Float32Array;
  /** 옷이 덮는 몸 정점 (1이면 덮음) → 그 아래 몸은 그리지 않아 옷 밖으로 비치지 않게 해요 */
  covers: Uint8Array;
  /** 상의 밑단 높이: 그 위의 바지는 상의에 가려져서 그리지 않아요 */
  hemY?: number;
  report: FitLine[];
}

function heatColor(ease: number, fitFrom: number, looseFrom: number, out: Float32Array, at: number) {
  const hex = FIT_COLOR[judge(ease, fitFrom, looseFrom)];
  const n = Number.parseInt(hex.slice(1), 16);
  // 화면은 선형 색공간이라 sRGB → 선형으로 바꿔요
  const lin = (c: number) => Math.pow(c / 255, 2.2);
  out[at] = lin((n >> 16) & 255);
  out[at + 1] = lin((n >> 8) & 255);
  out[at + 2] = lin(n & 255);
}

const signed = (n: number) => `${n >= 0 ? "+" : ""}${Math.round(n)}cm`;

/* ───────── 몸·옷 단면 (축을 따라 1cm마다, 둘레를 k칸으로 나눠 가장 멀리 나온 거리) ───────── */

type V3 = [number, number, number];
const dot = (a: V3, b: V3) => a[0] * b[0] + a[1] * b[1] + a[2] * b[2];
const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};

interface Section {
  /** 축 위치 t에서의 단면 중심 */
  center(t: number): V3;
  /** 축 위치 t, 각도 th에서 몸(또는 옷)이 중심에서 떨어진 거리 */
  r(t: number, th: number): number;
  /** 축 위치 t에서의 둘레 */
  perim(t: number): number;
  u: V3;
  v: V3;
  w: V3;
  origin: V3;
}

/**
 * pts의 점들(list)로 축(origin, w)을 따라 단면들을 만들어요.
 * mode "torso": 중심 = (0, y, 앞뒤 가운데) / "limb": 중심 = 그 높이 점들의 평균
 */
function section(pts: Float32Array, list: ArrayLike<number>, origin: V3, w: V3, t0: number, t1: number, k: number, mode: "torso" | "limb"): Section {
  const u = mode === "torso" ? ([1, 0, 0] as V3) : norm(cross(w, Math.abs(w[2]) > 0.9 ? [1, 0, 0] : [0, 0, 1]));
  const v = mode === "torso" ? ([0, 0, 1] as V3) : cross(w, u);
  const bins = Math.max(2, Math.ceil(t1 - t0) + 1);
  const buckets: number[][] = Array.from({ length: bins }, () => []);
  const ts = new Float32Array(list.length);
  for (let n = 0; n < list.length; n++) {
    const a = list[n] * 3;
    const t = (pts[a] - origin[0]) * w[0] + (pts[a + 1] - origin[1]) * w[1] + (pts[a + 2] - origin[2]) * w[2];
    ts[n] = t;
    const b = Math.round(t - t0);
    for (let d = -2; d <= 2; d++) {
      const bb = b + d;
      if (bb >= 0 && bb < bins && Math.abs(t - t0 - bb) <= 1.6) buckets[bb].push(n);
    }
  }
  // 1) 중심
  const cen = new Float32Array(bins * 3).fill(NaN);
  for (let b = 0; b < bins; b++) {
    const L = buckets[b];
    if (!L.length) continue;
    let sx = 0, sy = 0, sz = 0, z0 = Infinity, z1 = -Infinity;
    for (const n of L) {
      const a = list[n] * 3;
      sx += pts[a];
      sy += pts[a + 1];
      sz += pts[a + 2];
      z0 = Math.min(z0, pts[a + 2]);
      z1 = Math.max(z1, pts[a + 2]);
    }
    let c: V3 = mode === "torso" ? [0, 0, (z0 + z1) / 2] : [sx / L.length, sy / L.length, sz / L.length];
    // 축 위치를 정확히 t로
    const tc = t0 + b;
    const off = dot([c[0] - origin[0], c[1] - origin[1], c[2] - origin[2]], w) - tc;
    c = [c[0] - w[0] * off, c[1] - w[1] * off, c[2] - w[2] * off];
    cen.set(c, b * 3);
  }
  fillNaN(cen, bins);
  for (let pass = 0; pass < 3; pass++) {
    const c0 = cen.slice();
    for (let b = 1; b < bins - 1; b++) for (let d = 0; d < 3; d++) cen[b * 3 + d] = (c0[(b - 1) * 3 + d] + c0[b * 3 + d] + c0[(b + 1) * 3 + d]) / 3;
  }
  // 2) 각도별 거리
  const R = new Float32Array(bins * k).fill(-1);
  for (let b = 0; b < bins; b++) {
    const cx = cen[b * 3], cy = cen[b * 3 + 1], cz = cen[b * 3 + 2];
    for (const n of buckets[b]) {
      const a = list[n] * 3;
      const dx = pts[a] - cx, dy = pts[a + 1] - cy, dz = pts[a + 2] - cz;
      const pu = dx * u[0] + dy * u[1] + dz * u[2];
      const pv = dx * v[0] + dy * v[1] + dz * v[2];
      const j = ((Math.round((Math.atan2(pv, pu) / (2 * Math.PI)) * k) % k) + k) % k;
      const r = Math.hypot(pu, pv);
      if (r > R[b * k + j]) R[b * k + j] = r;
    }
    fillCircle(R, b * k, k);
  }
  // 빈 단면은 가까운 단면으로, 그리고 위아래로 다듬기 (튀어나온 곳은 줄이지 않아요)
  let last = -1;
  for (let b = 0; b < bins; b++) {
    if (R[b * k] >= 0) last = b;
    else if (last >= 0) R.copyWithin(b * k, last * k, last * k + k);
  }
  last = -1;
  for (let b = bins - 1; b >= 0; b--) {
    if (R[b * k] >= 0) last = b;
    else if (last >= 0) R.copyWithin(b * k, last * k, last * k + k);
  }
  for (let i = 0; i < R.length; i++) if (R[i] < 0) R[i] = 0;
  const dil = R.slice();
  for (let b = 0; b < bins; b++)
    for (let j = 0; j < k; j++) {
      let m = R[b * k + j];
      for (let d = -2; d <= 2; d++) {
        const bb = Math.min(bins - 1, Math.max(0, b + d));
        m = Math.max(m, R[bb * k + j]);
      }
      dil[b * k + j] = m;
    }
  const Rs = R.slice();
  for (let b = 0; b < bins; b++)
    for (let j = 0; j < k; j++) {
      let s = 0;
      for (let d = -2; d <= 2; d++) s += dil[Math.min(bins - 1, Math.max(0, b + d)) * k + j];
      Rs[b * k + j] = Math.max(R[b * k + j], s / 5);
    }
  const per = new Float32Array(bins);
  for (let b = 0; b < bins; b++) {
    let s = 0;
    for (let j = 0; j < k; j++) {
      const a = (j / k) * 2 * Math.PI, a2 = ((j + 1) / k) * 2 * Math.PI;
      const r1 = Rs[b * k + j], r2 = Rs[b * k + ((j + 1) % k)];
      s += Math.hypot(r2 * Math.cos(a2) - r1 * Math.cos(a), r2 * Math.sin(a2) - r1 * Math.sin(a));
    }
    per[b] = s;
  }
  const at = (t: number) => {
    const f = Math.min(bins - 1, Math.max(0, t - t0));
    const b0 = Math.floor(f);
    return [b0, Math.min(bins - 1, b0 + 1), f - b0] as const;
  };
  return {
    u,
    v,
    w,
    origin,
    center(t) {
      const [b0, b1, f] = at(t);
      const c: V3 = [0, 0, 0];
      for (let d = 0; d < 3; d++) c[d] = cen[b0 * 3 + d] * (1 - f) + cen[b1 * 3 + d] * f;
      // 범위 밖이면 축을 따라 이어서
      const tc = t0 + b0 + f;
      for (let d = 0; d < 3; d++) c[d] += w[d] * (t - tc);
      return c;
    },
    r(t, th) {
      const [b0, b1, f] = at(t);
      let s = (th / (2 * Math.PI)) * k;
      s = ((s % k) + k) % k;
      const j0 = Math.floor(s) % k, j1 = (j0 + 1) % k, g = s - Math.floor(s);
      const r0 = Rs[b0 * k + j0] * (1 - g) + Rs[b0 * k + j1] * g;
      const r1 = Rs[b1 * k + j0] * (1 - g) + Rs[b1 * k + j1] * g;
      return r0 * (1 - f) + r1 * f;
    },
    perim(t) {
      const [b0, b1, f] = at(t);
      return per[b0] * (1 - f) + per[b1] * f;
    },
  };
}

function fillNaN(cen: Float32Array, bins: number) {
  let last = -1;
  for (let b = 0; b < bins; b++) {
    if (!Number.isNaN(cen[b * 3])) last = b;
    else if (last >= 0) cen.copyWithin(b * 3, last * 3, last * 3 + 3);
  }
  last = -1;
  for (let b = bins - 1; b >= 0; b--) {
    if (!Number.isNaN(cen[b * 3])) last = b;
    else if (last >= 0) cen.copyWithin(b * 3, last * 3, last * 3 + 3);
  }
  for (let i = 0; i < cen.length; i++) if (Number.isNaN(cen[i])) cen[i] = 0;
}

/** 원 둘레 k칸 중 빈 칸(-1)을 양옆 칸으로 채워요 */
function fillCircle(R: Float32Array, o: number, k: number) {
  let any = false;
  for (let j = 0; j < k; j++) if (R[o + j] >= 0) any = true;
  if (!any) return;
  const c0 = R.slice(o, o + k);
  for (let j = 0; j < k; j++) {
    if (c0[j] >= 0) continue;
    let p = j, q = j, dp = 0, dq = 0;
    while (c0[(p = (p - 1 + k) % k)] < 0) dp++;
    while (c0[(q = (q + 1) % k)] < 0) dq++;
    R[o + j] = (c0[p] * (dq + 1) + c0[q] * (dp + 1)) / (dp + dq + 2);
  }
}

/* ───────── 옷 입히기 ───────── */

/**
 * tpl: 이 옷에 쓸 MakeHuman 옷 본 (templateFor(spec.style, 성별))
 * underMesh: 상의 안에 입은 하의(이미 만든 옷). 상의는 몸과 바지를 모두 덮도록 걸쳐요
 */
export function buildGarment(model: AvatarModel, pos: Float32Array, spec: GarmentSpec, tpl: GarmentTemplate, underMesh?: GarmentMesh): GarmentMesh {
  const M = new Measure(model, pos);
  const nb = model.vertexCount; // 그리는 몸 정점 수
  const g = spec.measures;
  let H = 0;
  for (let i = 1; i < nb * 3; i += 3) H = Math.max(H, pos[i]);
  const s = H / 165;

  const hips = M.ring("hips");
  const waist = M.ring("waist");
  const underbust = M.ring("underbust");
  const bust = M.ring("bust");
  const torsoLv: Level[] = [hips, waist, underbust, bust];
  const legLv: Level[] = [M.ring("ankle"), M.ring("calf"), M.ring("knee"), M.ring("thigh")];
  const crotchY = pos[model.crotch * 3 + 1];
  const tipL = M.point(model.shoulderTips[0]);
  const tipR = M.point(model.shoulderTips[1]);
  const tipY = (tipL[1] + tipR[1]) / 2;
  const bodyShoulder = Math.abs(tipL[0] - tipR[0]);
  const wristL = M.point(model.rulers.lowerarm[1]);
  const armLen = Math.hypot(wristL[0] - tipL[0], wristL[1] - tipL[1], wristL[2] - tipL[2]);
  const dirL = norm([wristL[0] - tipL[0], wristL[1] - tipL[1], wristL[2] - tipL[2]]);
  const dirR: V3 = [-dirL[0], dirL[1], dirL[2]];
  const tips = [tipL, tipR];
  const dirs = [dirL, dirR];
  const UP: V3 = [0, 1, 0];
  const O: V3 = [0, 0, 0];
  const TAU = 2 * Math.PI;

  /* 1) MakeHuman 옷 본을 지금 몸에 그대로 입혀요 */
  const nq = tpl.vertexCount;
  let Q = tpl.cyl ? new Float32Array(0) : placeTemplate(tpl, pos);
  const legsSplit = spec.style === "pants" || spec.style === "shorts";
  // 옷 점마다 팔·다리에 속하는 정도 (묶인 몸 정점 기준)
  const wArm = new Float32Array(nq);
  const wLeg = new Float32Array(nq);
  for (let i = 0; i < nq; i++) {
    let a = 0, l = 0;
    for (let k = 0; k < 3; k++) {
      const r = tpl.refs[i * 3 + k];
      a += model.armF[r] * tpl.weights[i * 3 + k];
      l += model.legF[r] * tpl.weights[i * 3 + k];
    }
    wArm[i] = a / 255;
    wLeg[i] = legsSplit ? l / 255 : 0;
  }
  const side = (x: number) => (x >= 0 ? 0 : 1);

  /* 2) 몸 단면 (몸통 / 왼·오른 다리 / 왼·오른 팔) */
  const handTop = (tipY + crotchY) / 2; // 이 높이 아래의 팔 정점은 손·손목
  const torsoBody: number[] = [];
  const legBody: number[][] = [[], []];
  const armBody: number[][] = [[], []];
  for (let i = 0; i < nb; i++) {
    const sd = side(pos[i * 3]);
    if (model.armF[i] > 128) armBody[sd].push(i);
    if (model.armF[i] > (pos[i * 3 + 1] < handTop ? 24 : 128)) continue;
    torsoBody.push(i);
    if (model.legF[i] > 128) legBody[sd].push(i);
  }
  const torsoS = section(pos, torsoBody, O, UP, 0, H, 48, "torso");
  if (tpl.cyl) Q = placeCylinder(tpl, { crotchY, hipsY: hips.y, waistY: waist.y, hipsC: hips.c, centerZ: (y) => torsoS.center(y)[2] });
  // 상의를 바지 위에 입으면: 바지 천도 '몸'으로 쳐서 그 위로 걸쳐요
  let layerS = torsoS;
  if (spec.kind === "top" && underMesh) {
    const all = new Float32Array(pos.length + underMesh.positions.length);
    all.set(pos);
    all.set(underMesh.positions, pos.length);
    const base = pos.length / 3;
    const list = torsoBody.concat(Array.from({ length: underMesh.positions.length / 3 }, (_, j) => base + j));
    layerS = section(all, list, O, UP, 0, H, 48, "torso");
  }
  const legS = legsSplit ? [0, 1].map((sd) => section(pos, legBody[sd], O, UP, 0, crotchY + 10, 32, "limb")) : [];
  const armS = spec.kind === "top" ? [0, 1].map((sd) => section(pos, armBody[sd], tips[sd], dirs[sd], -8, armLen + 25, 32, "limb")) : [];

  // 옷 본의 단면 (원래 둘레를 재요)
  const gTorsoList: number[] = [];
  const gLegList: number[][] = [[], []];
  for (let i = 0; i < nq; i++) {
    if (wArm[i] < 0.5 && wLeg[i] < 0.5) gTorsoList.push(i);
    if (wLeg[i] >= 0.5) gLegList[side(Q[i * 3])].push(i);
  }
  const gTorso = section(Q, gTorsoList, O, UP, 0, H, 48, "torso");
  const gLeg = legsSplit ? [0, 1].map((sd) => section(Q, gLegList[sd], O, UP, 0, crotchY + 10, 32, "limb")) : [];

  /** 단면 S 기준으로 점 P를 축 위치 t → t2로 옮기고, 둘레를 2π·dr만큼 넓혀요 (몸 + gap 안으로는 안 들어가요) */
  const move = (S: Section, P: V3, t: number, t2: number, dr: number, gap: number, out: number[]) => {
    const c = S.center(t);
    const d: V3 = [P[0] - c[0], P[1] - c[1], P[2] - c[2]];
    const pu = dot(d, S.u);
    const pv = dot(d, S.v);
    const th = Math.atan2(pv, pu);
    // 옷 본의 매끈한 모양(r)은 그대로 두고 둘레만 dr만큼.
    // 위아래로 옮겼거나 줄일 때만 몸(+간격) 밖으로 밀어요 (그대로인 곳은 MakeHuman 옷 모양 그대로)
    const r = Math.hypot(pu, pv);
    const rb2 = S.r(t2, th);
    const moved = Math.abs(t2 - t) > 0.05 || dr < 0;
    const r2 = moved ? Math.max(rb2 + gap, r + dr) : r + dr;
    const c2 = S.center(t2);
    const cu = Math.cos(th) * r2, cv = Math.sin(th) * r2;
    out[0] = c2[0] + S.u[0] * cu + S.v[0] * cv;
    out[1] = c2[1] + S.u[1] * cu + S.v[1] * cv;
    out[2] = c2[2] + S.u[2] * cu + S.v[2] * cv;
    out[3] = r2 - rb2; // 몸에서 떨어진 거리
  };
  const axial = (P: V3, o: V3, w: V3) => (P[0] - o[0]) * w[0] + (P[1] - o[1]) * w[1] + (P[2] - o[2]) * w[2];

  const positions = new Float32Array(nq * 3);
  const heat = new Float32Array(nq * 3);
  const covers = new Uint8Array(nb);
  const report: FitLine[] = [];
  const pt = [0, 0, 0, 0];
  const pa = [0, 0, 0, 0];
  let topHem: number | undefined;
  const pl = [0, 0, 0, 0];

  if (spec.kind === "top") {
    /* ── 상의 ── */
    const hps = tipY + 4.5 * s; // 옆목점 (총 기장은 여기서부터 재요)
    const hemY = Math.max(crotchY - 25 * s, hps - g.length);
    const gChest = g.chest ?? Math.max(g.waist, bust.c + 8);
    const gHem = g.waist;
    const dropShoulder = Math.max(0, (g.shoulder - bodyShoulder) / 2);
    const sleeveEnd = Math.max(4, g.sleeve - dropShoulder);
    const chestEase = gChest - bust.c;
    // 옷 본의 밑단·소매 끝
    let yHemT = Infinity;
    for (const i of gTorsoList) yHemT = Math.min(yHemT, Q[i * 3 + 1]);
    const tEnd = [0, 0];
    for (let i = 0; i < nq; i++) {
      if (wArm[i] < 0.5) continue;
      const sd = side(Q[i * 3]);
      tEnd[sd] = Math.max(tEnd[sd], axial([Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]], tips[sd], dirs[sd]));
    }
    topHem = hemY;
    const pivot = underbust.y;
    const mapY = (y: number) => (y < pivot ? pivot - ((pivot - y) * (pivot - hemY)) / Math.max(1, pivot - yHemT) : y);
    const mapT = (t: number, sd: number) => (t <= 2 ? t : 2 + ((t - 2) * (sleeveEnd - 2)) / Math.max(1, tEnd[sd] - 2));
    // 바지 위에 입으면 바지 둘레보다 넉넉하게
    const under = underMesh?.spec;
    const underTop = under ? Math.min(waist.y + 4 * s, crotchY + (under.measures.rise ?? 28)) : -1;
    const gc = (y: number) => {
      let c = y <= bust.y ? lerp(gHem, gChest, (y - hemY) / Math.max(1, bust.y - hemY)) : gChest;
      if (under && y < underTop + 1) c = Math.max(c, (y <= hips.y ? under.measures.hip : under.measures.waist) + 4);
      return c;
    };
    const sleeveDr = Math.min(1, Math.max(-1, ((gChest - gTorso.perim(bust.y)) / TAU) * 0.2)); // 소매 굵기는 옷 본에 가깝게

    for (let i = 0; i < nq; i++) {
      const P: V3 = [Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]];
      const aw = smooth(0.3, 0.7, wArm[i]);
      // 몸통 쪽
      const y2 = mapY(P[1]);
      const keepShoulder = smooth(bust.y, tipY, y2); // 어깨 쪽은 옷 본 그대로
      const dr = looseR((gc(y2) - gTorso.perim(P[1])) / TAU) * (1 - keepShoulder);
      move(layerS, P, P[1], y2, dr, under && y2 < underTop + 3 ? 1.2 : MIN_GAP, pt); // 바지 위는 조금 더 띄워요
      // 소매 쪽
      if (aw > 0) {
        const sd = side(P[0]);
        const t = axial(P, tips[sd], dirs[sd]);
        move(armS[sd], P, t, mapT(t, sd), sleeveDr, MIN_GAP, pa);
      }
      // 어깨·목둘레는 MakeHuman 옷 본 그대로 (칼라·어깨선이 자연스럽게)
      const keep = keepShoulder * (1 - aw);
      for (let d = 0; d < 3; d++) positions[i * 3 + d] = (pt[d] + (pa[d] - pt[d]) * aw) * (1 - keep) + P[d] * keep;
      if (aw > 0.5) heatColor(pa[3] * TAU, 2, 8, heat, i * 3);
      else heatColor(y2 > bust.y ? chestEase : gc(y2) - torsoS.perim(y2), 4, 16, heat, i * 3);
    }
    // 옷 아래 가려지는 몸은 그리지 않아요 (끝선 근처는 남겨 둬요)
    // 목선 높이: 앞·뒤 가운데에서 옷이 끝나는 높이 (V넥은 낮고, 라운드넥은 높아요)
    let frontTop = bust.y;
    let backTop = bust.y;
    for (let i = 0; i < nq; i++) {
      const x = positions[i * 3], y = positions[i * 3 + 1], z = positions[i * 3 + 2];
      if (Math.abs(x) > 2 || wArm[i] > 0.3) continue;
      if (z > torsoS.center(y)[2]) frontTop = Math.max(frontTop, y);
      else backTop = Math.max(backTop, y);
    }
    for (let i = 0; i < nb; i++) {
      const y = pos[i * 3 + 1];
      const af = model.armF[i] / 255;
      const neck = (pos[i * 3 + 2] > torsoS.center(y)[2] ? frontTop : backTop) - 2.5;
      if (af < 0.3 && y >= hemY + 2.5 && y <= neck) covers[i] = 1;
      else if (af > 0.7) {
        const sd = side(pos[i * 3]);
        const t = axial([pos[i * 3], y, pos[i * 3 + 2]], tips[sd], dirs[sd]);
        if (t >= 5 && t <= sleeveEnd - 3) covers[i] = 1;
      }
    }
    // 핏 설명
    const hemEase = gHem - circAt(torsoLv, hemY);
    report.push({ part: "가슴", text: `${signed(chestEase)} 여유${g.chest ? "" : " (가슴 둘레 미입력 · 추정)"}`, level: judge(chestEase, 4, 16) });
    report.push({ part: "밑단", text: `${signed(hemEase)} 여유`, level: judge(hemEase, 4, 18) });
    const sd = g.shoulder - bodyShoulder;
    report.push({
      part: "어깨",
      text: sd > 4 ? `${signed(sd)} · 어깨선이 내려와요` : sd < -2 ? `${signed(sd)} · 어깨가 좁아요` : `${signed(sd)} · 어깨선이 잘 맞아요`,
      level: sd < -2 ? "tight" : sd > 6 ? "loose" : "fit",
    });
    const wrist = sleeveEnd - armLen;
    report.push({
      part: "소매",
      text: sleeveEnd < armLen * 0.55 ? "반소매예요" : Math.abs(wrist) < 2 ? "손목까지 와요" : wrist > 0 ? `손목보다 ${Math.round(wrist)}cm 길어요` : `손목보다 ${Math.round(-wrist)}cm 짧아요`,
    });
    report.push({ part: "기장", text: hemY > hips.y + 4 ? "골반 위에서 끝나요 (크롭)" : hemY > crotchY ? "엉덩이 중간쯤에서 끝나요" : "엉덩이를 덮어요" });
  } else if (spec.style === "skirt") {
    /* ── 스커트 ── */
    const topY = waist.y + 1 * s;
    const hemY = Math.max(2, topY - g.length);
    let yTopT = -Infinity, yHemT = Infinity;
    for (let i = 0; i < nq; i++) {
      yTopT = Math.max(yTopT, Q[i * 3 + 1]);
      yHemT = Math.min(yHemT, Q[i * 3 + 1]);
    }
    const hy = hips.y;
    const mapY = (y: number) => (y >= hy ? hy + ((y - hy) * (topY - hy)) / Math.max(1, yTopT - hy) : hy - ((hy - y) * (hy - hemY)) / Math.max(1, hy - yHemT));
    const gcTop = (y: number) => lerp(g.hip, g.waist, (y - hy) / Math.max(1, topY - hy));
    const hipDr = (g.hip - gTorso.perim(hy)) / TAU;
    for (let i = 0; i < nq; i++) {
      const P: V3 = [Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]];
      const y2 = mapY(P[1]);
      const dr = looseR(y2 >= hy ? (gcTop(y2) - gTorso.perim(P[1])) / TAU : hipDr);
      move(torsoS, P, P[1], y2, dr, MIN_GAP, pt);
      positions.set([pt[0], pt[1], pt[2]], i * 3);
      heatColor(y2 >= hy ? gcTop(y2) - torsoS.perim(y2) : g.hip - hips.c, 2, 10, heat, i * 3);
    }
    for (let i = 0; i < nb; i++) {
      const y = pos[i * 3 + 1];
      if (model.armF[i] < 77 && model.legF[i] < 128 && y >= crotchY && y <= topY - 2.5) covers[i] = 1;
    }
    const waistEase = g.waist - circAt(torsoLv, topY);
    const hipEase = g.hip - hips.c;
    report.push({ part: "허리", text: `${signed(waistEase)} 여유`, level: judge(waistEase, 1, 6) });
    report.push({ part: "엉덩이", text: `${signed(hipEase)} 여유`, level: judge(hipEase, 2, 10) });
    const kneeY = legLv[2].y;
    report.push({ part: "기장", text: Math.abs(hemY - kneeY) < 3 ? "무릎 길이예요" : hemY > kneeY ? `무릎 위 ${Math.round(hemY - kneeY)}cm` : `무릎 아래 ${Math.round(kneeY - hemY)}cm` });
  } else {
    /* ── 긴바지·반바지 ── */
    const topY = Math.min(waist.y + 4 * s, crotchY + g.rise);
    const hemY = Math.max(0.5, topY - g.length);
    const thighRing = legLv[3];
    const gHem = g.hem ?? g.thigh * (spec.style === "shorts" ? 0.95 : 0.72);
    let yTopT = -Infinity, yHemT = Infinity;
    for (let i = 0; i < nq; i++) {
      yTopT = Math.max(yTopT, Q[i * 3 + 1]);
      yHemT = Math.min(yHemT, Q[i * 3 + 1]);
    }
    const mapY = (y: number) =>
      y >= crotchY ? crotchY + ((y - crotchY) * (topY - crotchY)) / Math.max(1, yTopT - crotchY) : crotchY - ((crotchY - y) * (crotchY - hemY)) / Math.max(1, crotchY - yHemT);
    const gcTorso = (y: number) => (y <= hips.y ? g.hip : lerp(g.hip, g.waist, (y - hips.y) / Math.max(1, topY - hips.y)));
    const legGc = (y: number) => (y >= thighRing.y ? g.thigh : lerp(gHem, g.thigh, (y - hemY) / Math.max(1, thighRing.y - hemY)));
    for (let i = 0; i < nq; i++) {
      const P: V3 = [Q[i * 3], Q[i * 3 + 1], Q[i * 3 + 2]];
      const lw = smooth(0.3, 0.7, wLeg[i]);
      const y2 = mapY(P[1]);
      move(torsoS, P, P[1], y2, looseR((gcTorso(y2) - gTorso.perim(P[1])) / TAU, 1.5), MIN_GAP, pt);
      if (lw > 0) {
        const sd = side(P[0]);
        move(legS[sd], P, P[1], y2, looseR((legGc(y2) - gLeg[sd].perim(P[1])) / TAU, 1.8), MIN_GAP, pl);
      }
      for (let d = 0; d < 3; d++) positions[i * 3 + d] = pt[d] + (pl[d] - pt[d]) * lw;
      if (lw > 0.5) heatColor(legGc(y2) - legS[side(P[0])].perim(y2), 3, 12, heat, i * 3);
      else heatColor(gcTorso(y2) - torsoS.perim(y2), 2, 10, heat, i * 3);
    }
    for (let i = 0; i < nb; i++) {
      const y = pos[i * 3 + 1];
      if (model.armF[i] < 77 && y >= hemY + 2.5 && y <= topY - 2.5) covers[i] = 1;
    }
    const waistEase = g.waist - circAt(torsoLv, topY);
    const hipEase = g.hip - hips.c;
    const thighEase = g.thigh - thighRing.c;
    report.push({ part: "허리", text: `${signed(waistEase)} 여유`, level: judge(waistEase, 1, 6) });
    report.push({ part: "엉덩이", text: `${signed(hipEase)} 여유`, level: judge(hipEase, 2, 10) });
    report.push({ part: "허벅지", text: `${signed(thighEase)} 여유`, level: judge(thighEase, 3, 12) });
    if (spec.style === "shorts") {
      const kneeY = legLv[2].y;
      report.push({ part: "기장", text: hemY > kneeY ? `무릎 위 ${Math.round(hemY - kneeY)}cm` : "무릎을 덮어요" });
    } else {
      const ankleY = legLv[0].y;
      report.push({
        part: "기장",
        text: Math.abs(hemY - ankleY) < 3 ? "복숭아뼈까지 와요" : hemY < ankleY ? `복숭아뼈보다 ${Math.round(ankleY - hemY)}cm 길어요` : `복숭아뼈보다 ${Math.round(hemY - ankleY)}cm 짧아요`,
      });
    }
  }

  return { spec, template: tpl.key, positions, index: tpl.index, heat, covers, report, hemY: topHem };
}

/** 성별·옷 모양에 맞는 옷 본 이름 */
export const templateKeyFor = (spec: GarmentSpec, gender: Gender) => templateFor(spec.style, gender);

/* ───────── 옷 색 ───────── */

const COLOR_WORDS: [RegExp, string][] = [
  [/블랙|검정|black/i, "#2c2c30"],
  [/네이비|남색|navy/i, "#283550"],
  [/아이보리|ivory|크림|cream/i, "#ece4d4"],
  [/화이트|흰|white/i, "#f2f1ee"],
  [/베이지|beige|샌드/i, "#cdb79a"],
  [/그레이|회색|gray|grey|차콜|charcoal/i, "#7c7c80"],
  [/브라운|갈색|brown|카멜|camel/i, "#7a5741"],
  [/카키|khaki|올리브|olive/i, "#6b6a45"],
  [/데님|청|denim|블루|blue/i, "#4a6489"],
  [/레드|빨간|red|버건디|burgundy|와인/i, "#7d2b33"],
  [/핑크|pink/i, "#d9a0ad"],
  [/그린|초록|green/i, "#4f6b52"],
];

/** 옷 색: 이름에 색 이름이 있으면 그 색, 없으면 사진 가운데의 평균 색 */
export async function garmentColor(name: string, image?: string): Promise<string> {
  const word = COLOR_WORDS.find(([re]) => re.test(name));
  if (word) return word[1];
  if (!image) return "#8a8580";
  try {
    const img = new Image();
    img.crossOrigin = "anonymous";
    img.src = image;
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 24;
    const ctx = c.getContext("2d")!;
    // 가운데 부분만 (배경을 피해서)
    ctx.drawImage(img, img.width * 0.3, img.height * 0.3, img.width * 0.4, img.height * 0.4, 0, 0, 24, 24);
    const d = ctx.getImageData(0, 0, 24, 24).data;
    let r = 0, gg = 0, b = 0, k = 0;
    for (let i = 0; i < d.length; i += 4) {
      if (d[i + 3] < 128) continue; // 배경을 지운(투명한) 칸은 빼요
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
      k++;
    }
    if (!k) return "#8a8580";
    const hex = (v: number) => Math.round(v / k).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(gg)}${hex(b)}`;
  } catch {
    return "#8a8580";
  }
}
