// 아바타에 옷을 입히는 곳입니다. (그리기는 components/Avatar3D.tsx)
//
// 원리
// - 옷은 몸과 따로, 고리(단면)를 층층이 쌓아 만든 천이에요 (몸통·소매·바짓가랑이).
// - 높이마다 옷 둘레로 단면(타원·원통)을 만들고, 몸보다 바깥에 있도록 걸쳐요.
//   가장 튀어나온 곳(가슴·엉덩이 등)에 걸리고 오목한 곳은 떠서 천이 떨어지듯 보여요.
//   여유가 모자라면 몸에 딱 붙어요.
// - 총 기장·소매 길이·바지 길이·밑위로 옷이 끝나는 위치를 정해요.
// - 부위별 여유분으로 '핏 보기' 색(끼어요/딱 맞아요/넉넉해요)과 핏 설명 문장을 만들어요.
//
// 옷 치수는 옷장의 실측(cm)을 그대로 써요. 둘레는 '단면 너비 × 2'로 입력한 값이에요.

import type { AvatarModel } from "./avatarModel";
import type { Category, Measures } from "./data";

export type GarmentKind = "top" | "bottom";

export interface GarmentSpec {
  id: string;
  name: string;
  kind: GarmentKind;
  category: Category;
  color: string;
  /** cm. 상의: length·chest·sleeve·shoulder·waist / 하의: waist·hip·thigh·rise·length (+hem 선택) */
  measures: Record<string, number>;
}

/** 옷장 옷 → 입히기용 정보. 필요한 실측이 모자라면 null */
export function toGarment(item: { id: string; name: string; category: Category; measures: Measures }, color: string): GarmentSpec | null {
  const kind: GarmentKind | null = item.category === "bottom" ? "bottom" : item.category === "top" || item.category === "outer" ? "top" : null;
  if (!kind) return null;
  const need = kind === "top" ? ["length", "sleeve", "shoulder", "waist"] : ["waist", "hip", "thigh", "rise", "length"];
  const m: Record<string, number> = {};
  for (const [k, v] of Object.entries(item.measures)) {
    const n = Number.parseFloat(v);
    if (Number.isFinite(n) && n > 0) m[k] = n;
  }
  if (need.some((k) => !m[k])) return null;
  return { id: item.id, name: item.name, kind, category: item.category, color, measures: m };
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
  point(i: number): [number, number, number] {
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
const MIN_GAP = 0.3; // 옷이 몸에 붙어도 이만큼은 띄워서 겹치지 않게 (cm)

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
  positions: Float32Array;
  index: Uint32Array;
  /** 핏 보기 색 (정점마다) */
  heat: Float32Array;
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

/* ───────── 옷 만들기 ───────── */

/** underMesh: 상의 안에 입은 하의(이미 만든 천). 상의는 몸과 바지 천을 모두 덮도록 걸쳐요 */
export function buildGarment(model: AvatarModel, pos: Float32Array, spec: GarmentSpec, underMesh?: GarmentMesh): GarmentMesh {
  const under = underMesh?.spec;
  const M = new Measure(model, pos);
  const n = model.vertexCount;
  const g = spec.measures;
  const H = (() => {
    let hi = 0;
    for (let i = 1; i < pos.length; i += 3) hi = Math.max(hi, pos[i]);
    return hi;
  })();
  const s = H / 165;

  const hips = M.ring("hips");
  const waist = M.ring("waist");
  const underbust = M.ring("underbust");
  const bust = M.ring("bust");
  const torso: Level[] = [hips, waist, underbust, bust];
  const legLevels: Level[] = [M.ring("ankle"), M.ring("calf"), M.ring("knee"), M.ring("thigh")];
  const crotchY = pos[model.crotch * 3 + 1];
  const tipL = M.point(model.shoulderTips[0]);
  const tipR = M.point(model.shoulderTips[1]);
  const tipY = (tipL[1] + tipR[1]) / 2;
  const bodyShoulder = Math.abs(tipL[0] - tipR[0]);
  // 팔 방향: 어깨 끝 → 손목 (오른팔은 왼팔을 좌우로 뒤집어 써요)
  const wristL = M.point(model.rulers.lowerarm[1]);
  const armLen = Math.hypot(wristL[0] - tipL[0], wristL[1] - tipL[1], wristL[2] - tipL[2]);
  const dirL: V3 = [(wristL[0] - tipL[0]) / armLen, (wristL[1] - tipL[1]) / armLen, (wristL[2] - tipL[2]) / armLen];
  const dirR: V3 = [-dirL[0], dirL[1], dirL[2]];

  const report: FitLine[] = [];
  const sheet = new Sheet();

  const handTop = (tipY + crotchY) / 2; // 이 높이 아래의 팔 정점은 손·손목이에요
  // 정점 묶음: 팔 아닌 곳(몸통+다리), 왼/오른 다리, 왼/오른 팔
  const torsoV: number[] = [];
  const legV: number[][] = [[], []];
  const armV: number[][] = [[], []];
  for (let i = 0; i < n; i++) {
    const side = pos[i * 3] >= 0 ? 0 : 1;
    if (model.armF[i] > 128) armV[side].push(i);
    if (model.armF[i] > (pos[i * 3 + 1] < handTop ? 24 : 128)) continue; // 손은 몸통 단면에서 빼요 (엉덩이 옆 손가락까지 감싸지 않게)
    {
      torsoV.push(i);
      if (model.legF[i] > 128) legV[side].push(i);
    }
  }
  const UP: V3 = [0, 1, 0];
  const X: V3 = [1, 0, 0];
  const Z: V3 = [0, 0, 1];

  /** 몸통 고리들: 높이마다 몸 단면을 재고, 옷 둘레(gc)로 키운 타원과 몸(+간격) 중 바깥쪽에 천을 둘러요 */
  const xMax = bodyShoulder / 2 - 1;
  const underPts = underMesh ? Array.from({ length: underMesh.positions.length / 3 }, (_, i) => i) : [];
  const torsoTube = (y0: number, y1: number, gcAt: (y: number) => number, gapAt: (y: number) => number, shrinkAt: (y: number) => number, fitFrom: number, looseFrom: number, neck?: (th: number) => number) => {
    const ys = steps(y0, y1, 1);
    // 1) 단면 크기 (반너비·앞뒤 범위)
    const dims = ys.map((y) => {
      let hw = 1, z0 = Infinity, z1 = -Infinity;
      for (const i of torsoV) {
        const a = i * 3;
        if (Math.abs(pos[a + 1] - y) > 2 || (y > underbust.y && Math.abs(pos[a]) > xMax)) continue;
        hw = Math.max(hw, Math.abs(pos[a]));
        z0 = Math.min(z0, pos[a + 2]);
        z1 = Math.max(z1, pos[a + 2]);
      }
      return Number.isFinite(z0) ? [hw, (z0 + z1) / 2, Math.max(1, (z1 - z0) / 2)] : [hw, 0, 10];
    });
    const sm = smoothRows(dims);
    // 2) 고리마다 반지름
    const own = ys.map((y, r) => sectors(torsoV, pos, [0, y, sm[r][1]], X, Z, UP, 2, KT, y > underbust.y ? xMax : Infinity));
    const bodies = cleanBodies(
      ys.map((y, r) => {
        const c: V3 = [0, y, sm[r][1]];
        const b = own[r];
        if (!underPts.length) return b;
        // 안에 입은 바지 천도 '몸'으로 쳐요 (그 위로 +간격)
        const u = sectors(underPts, underMesh!.positions, c, X, Z, UP, 1, KT, Infinity, false);
        return b.map((x, j) => Math.max(x, u[j] + 0.4));
      }),
    );
    const rows = ys.map((y, r) => {
      const [a0, cz, b0] = sm[r];
      const c: V3 = [0, y, cz];
      const body = bodies[r];
      const gc = gcAt(y);
      const k = lerp(Math.max(1, gc / ellipsePerim(a0, b0)), 0.8, shrinkAt(y)); // 0.8: 몸 안쪽 타원 → 몸(+간격)에 붙어요
      const gap = gapAt(y);
      const R = Array.from(body, (rb, j) => {
        const th = (j / KT) * Math.PI * 2;
        const ux = Math.cos(th), uz = Math.sin(th);
        const ra = a0 * k, rbb = b0 * k;
        const re = (ra * rbb) / Math.hypot(rbb * ux, ra * uz);
        return Math.max(rb + gap, re);
      });
      return { c, body, R, ease: gc - polyPerim(own[r]) }; // 핏 색은 실제 몸 기준
    });
    relax(rows);
    const rings = rows.map((row) => ring(row.c, X, Z, row.R));
    if (neck) {
      // 목선: 각도마다 목선 높이보다 위에 있는 점은 목선 높이의 고리 점으로 내려요
      for (let j = 0; j < KT; j++) {
        const lim = neck((j / KT) * 2 * Math.PI);
        let last = 0;
        for (let r = 0; r < ys.length; r++) if (ys[r] <= lim) last = r;
        if (last + 1 >= ys.length) continue;
        // 목선 높이에 정확히 맞춘 점 (위아래 고리 사이를 이어서)
        const t = (lim - ys[last]) / (ys[last + 1] - ys[last]);
        const p = [0, 1, 2].map((d) => lerp(rings[last][j * 3 + d], rings[last + 1][j * 3 + d], t));
        for (let r = last + 1; r < ys.length; r++) rings[r].splice(j * 3, 3, ...p);
      }
    }
    sheet.tube(rings, rows.map((row) => heatOf(row.ease, fitFrom, looseFrom)), KT);
  };

  /** 팔·다리 고리들: 축을 따라 단면 중심을 찾고, 원통(radiusAt)과 몸(+간격) 중 바깥쪽 */
  const limbTube = (list: number[], origin: V3, w: V3, t0: number, t1: number, radiusAt: (t: number) => number, gap: number, fitFrom: number, looseFrom: number) => {
    const u = norm(cross(w, Math.abs(w[2]) > 0.9 ? X : Z));
    const v = cross(w, u);
    const ts = steps(t0, t1, 1);
    const cs = ts.map((t) => {
      const p: V3 = [origin[0] + w[0] * t, origin[1] + w[1] * t, origin[2] + w[2] * t];
      let sx = 0, sy = 0, sz = 0, m = 0;
      for (const i of list) {
        const a = i * 3;
        const d = (pos[a] - p[0]) * w[0] + (pos[a + 1] - p[1]) * w[1] + (pos[a + 2] - p[2]) * w[2];
        if (Math.abs(d) > 3) continue;
        sx += pos[a] - w[0] * d;
        sy += pos[a + 1] - w[1] * d;
        sz += pos[a + 2] - w[2] * d;
        m++;
      }
      return m ? [sx / m, sy / m, sz / m] : [NaN, NaN, NaN];
    });
    const centers = smoothRows(fillRows(cs));
    const bodies = cleanBodies(ts.map((_, r) => sectors(list, pos, centers[r] as V3, u, v, w, 3, KL)));
    const rows = ts.map((t, r) => {
      const c = centers[r] as V3;
      const body = bodies[r];
      const rad = radiusAt(t);
      const R = Array.from(body, (rb) => Math.max(rb + gap, rad));
      return { c, body, R, ease: 2 * Math.PI * rad - polyPerim(body) };
    });
    relax(rows);
    sheet.tube(rows.map((row) => ring(row.c, u, v, row.R)), rows.map((row) => heatOf(row.ease, fitFrom, looseFrom)), KL);
  };

  if (spec.kind === "top") {
    const hps = tipY + 4.5 * s; // 옆목점 (총 기장은 여기서부터 재요)
    const hemY = Math.max(crotchY - 25 * s, hps - g.length);
    const neckY = hps + 0.5 * s;
    const gChest = g.chest ?? Math.max(g.waist, bust.c + 8);
    const gHem = g.waist;
    const dropShoulder = Math.max(0, (g.shoulder - bodyShoulder) / 2);
    const sleeveEnd = g.sleeve - dropShoulder;
    const chestEase = gChest - bust.c;
    const extra = under ? 1.2 : 0; // 바지 위로 입으면 조금 더 띄워요
    const underTop = under ? Math.min(waist.y + 4 * s, crotchY + under.measures.rise) : -1;
    const underGc = (y: number) => {
      if (!under || y > underTop + 1) return 0;
      const u = under.measures;
      return (y <= hips.y ? u.hip : lerp(u.hip, u.waist, (y - hips.y) / (underTop - hips.y))) + 5;
    };
    torsoTube(
      hemY,
      neckY,
      (y) => Math.max(y <= bust.y ? lerp(gHem, gChest, (y - hemY) / (bust.y - hemY)) : gChest, underGc(y)),
      (y) => MIN_GAP + (y < underTop + 2 ? extra : 0),
      (y) => (y > bust.y ? Math.min(1, (y - bust.y) / Math.max(tipY - bust.y, 1)) ** 1.5 : 0),
      4,
      16,
      // 앞(z+)은 깊게, 뒤는 얕게 파인 둥근 목선
      (th) => {
        const c = Math.abs(Math.cos(th)) / 0.6; // 정면·뒷면 가운데에서 ±37° 정도 파여요
        const depth = c < 1 ? Math.sqrt(1 - c * c) : 0;
        return neckY - depth * (Math.sin(th) > 0 ? 7 * s : 2 * s);
      },
    );
    // 소매: 어깨 끝보다 조금 안쪽에서 시작해 몸판과 겹치게
    let upperR = 3 * s;
    for (const list of armV)
      for (const i of list) {
        const side = pos[i * 3] >= 0 ? 0 : 1;
        const tip = side ? tipR : tipL;
        const dir = side ? dirR : dirL;
        const dx = pos[i * 3] - tip[0], dy = pos[i * 3 + 1] - tip[1], dz = pos[i * 3 + 2] - tip[2];
        const t = dx * dir[0] + dy * dir[1] + dz * dir[2];
        if (t < 5 || t > 15) continue;
        upperR = Math.max(upperR, Math.hypot(dx - dir[0] * t, dy - dir[1] * t, dz - dir[2] * t) / 2);
      }
    const sleeveTop = upperR + 0.8 + Math.max(0, chestEase) * 0.06;
    for (const side of [0, 1]) {
      const tip = side ? tipR : tipL;
      const dir = side ? dirR : dirL;
      // 어깨 쪽 시작 부분은 몸에 붙여서, 어깨 위로 날개처럼 솟지 않게
      limbTube(armV[side], tip, dir, 2, sleeveEnd, (t) => lerp(sleeveTop, sleeveTop * 0.78, t / Math.max(sleeveEnd, 1)) * lerp(0.5, 1, (t - 2) / 6), 0.35, 2, 8);
    }
    // 핏 설명
    const hemEase = gHem - circAt(torso, hemY);
    report.push({ part: "가슴", text: `${signed(chestEase)} 여유${g.chest ? "" : " (가슴 둘레 미입력 · 추정)"}`, level: judge(chestEase, 4, 16) });
    report.push({ part: "밑단", text: `${signed(hemEase)} 여유`, level: judge(hemEase, 4, 18) });
    const sd = g.shoulder - bodyShoulder;
    report.push({ part: "어깨", text: sd > 4 ? `${signed(sd)} · 어깨선이 내려와요` : sd < -2 ? `${signed(sd)} · 어깨가 좁아요` : `${signed(sd)} · 어깨선이 잘 맞아요`, level: sd < -2 ? "tight" : sd > 6 ? "loose" : "fit" });
    const wrist = sleeveEnd - armLen;
    report.push({ part: "소매", text: Math.abs(wrist) < 2 ? "손목까지 와요" : wrist > 0 ? `손목보다 ${Math.round(wrist)}cm 길어요` : `손목보다 ${Math.round(-wrist)}cm 짧아요` });
    const hemPos = hemY > hips.y + 4 ? "골반 위에서 끝나요 (크롭)" : hemY > crotchY ? "엉덩이 중간쯤에서 끝나요" : "엉덩이를 덮어요";
    report.push({ part: "기장", text: hemPos });
  } else {
    const topY = Math.min(waist.y + 4 * s, crotchY + g.rise);
    const hemY = Math.max(0.5, topY - g.length);
    const thighRing = legLevels[3];
    const gHem = g.hem ?? g.thigh * 0.72;
    const legGc = (y: number) => (y >= thighRing.y ? g.thigh : lerp(gHem, g.thigh, (y - hemY) / (thighRing.y - hemY)));
    // 골반 부분 (가랑이 아래로 살짝 내려와 다리 통과 겹치게)
    // 가랑이 근처는 몸에 붙여서, 다리 통과 자연스럽게 이어지게 (치마 끝처럼 벌어지지 않게)
    torsoTube(crotchY - 2 * s, topY, (y) => (y <= hips.y ? g.hip : lerp(g.hip, g.waist, (y - hips.y) / (topY - hips.y))), () => MIN_GAP, (y) => Math.min(1, Math.max(0, (crotchY + 6 * s - y) / (8 * s))), 2, 10);
    // 바짓가랑이
    if (hemY < crotchY) {
      for (const side of [0, 1]) {
        limbTube(legV[side], [0, 0, 0], UP, hemY, crotchY + 1, (y) => legGc(y) / (2 * Math.PI), MIN_GAP, 3, 12);
      }
    }
    const waistEase = g.waist - circAt(torso, topY);
    const hipEase = g.hip - hips.c;
    const thighEase = g.thigh - thighRing.c;
    report.push({ part: "허리", text: `${signed(waistEase)} 여유`, level: judge(waistEase, 1, 6) });
    report.push({ part: "엉덩이", text: `${signed(hipEase)} 여유`, level: judge(hipEase, 2, 10) });
    report.push({ part: "허벅지", text: `${signed(thighEase)} 여유`, level: judge(thighEase, 3, 12) });
    const ankleY = legLevels[0].y;
    report.push({ part: "기장", text: Math.abs(hemY - ankleY) < 3 ? "복숭아뼈까지 와요" : hemY < ankleY ? `복숭아뼈보다 ${Math.round(ankleY - hemY)}cm 길어요` : `복숭아뼈보다 ${Math.round(hemY - ankleY)}cm 짧아요` });
  }

  return { spec, positions: new Float32Array(sheet.pos), index: new Uint32Array(sheet.idx), heat: new Float32Array(sheet.heat), report };
}

/* ───────── 옷 천 만들기 도우미 ───────── */

type V3 = [number, number, number];
const KT = 64; // 몸통 고리 하나의 점 개수
const KL = 32; // 팔·다리 고리 하나의 점 개수

const cross = (a: V3, b: V3): V3 => [a[1] * b[2] - a[2] * b[1], a[2] * b[0] - a[0] * b[2], a[0] * b[1] - a[1] * b[0]];
const norm = (a: V3): V3 => {
  const l = Math.hypot(a[0], a[1], a[2]) || 1;
  return [a[0] / l, a[1] / l, a[2] / l];
};
const ellipsePerim = (a: number, b: number) => Math.PI * (3 * (a + b) - Math.sqrt((3 * a + b) * (a + 3 * b)));

/** from~to를 약 step 간격으로 (양 끝 포함) */
function steps(from: number, to: number, step: number) {
  const m = Math.max(1, Math.round((to - from) / step));
  return Array.from({ length: m + 1 }, (_, i) => from + ((to - from) * i) / m);
}

/** 중심 c, 축 w 둘레를 k칸으로 나눠, 칸마다 몸이 가장 멀리 나온 거리 (빈 칸은 이웃으로 채워요) */
function sectors(list: number[], pos: Float32Array, c: V3, u: V3, v: V3, w: V3, band: number, k: number, xMax = Infinity, fillGaps = true) {
  const r = new Float32Array(k).fill(-1);
  for (const i of list) {
    const a = i * 3;
    const dx = pos[a] - c[0], dy = pos[a + 1] - c[1], dz = pos[a + 2] - c[2];
    if (Math.abs(dx * w[0] + dy * w[1] + dz * w[2]) > band || Math.abs(pos[a]) > xMax) continue;
    const pu = dx * u[0] + dy * u[1] + dz * u[2];
    const pv = dx * v[0] + dy * v[1] + dz * v[2];
    const j = ((Math.round((Math.atan2(pv, pu) / (2 * Math.PI)) * k) % k) + k) % k;
    r[j] = Math.max(r[j], Math.hypot(pu, pv));
  }
  const filled = [...r.keys()].filter((j) => r[j] >= 0);
  if (!filled.length || !fillGaps) return r.map((x) => Math.max(0, x));
  for (let j = 0; j < k; j++) {
    if (r[j] >= 0) continue;
    let p = j, q = j, dp = 0, dq = 0;
    while (r[(p = (p - 1 + k) % k)] < 0) dp++;
    while (r[(q = (q + 1) % k)] < 0) dq++;
    r[j] = (r[p] * (dq + 1) + r[q] * (dp + 1)) / (dp + dq + 2);
  }
  // 칸 사이 들쭉날쭉한 것 다듬기 (안쪽으로는 줄이지 않아요)
  const c0 = r.slice();
  for (let j = 0; j < k; j++) r[j] = Math.max(c0[j], (c0[(j + k - 1) % k] + c0[j] + c0[(j + 1) % k]) / 3);
  return r;
}

function polyPerim(r: Float32Array) {
  const k = r.length;
  let sum = 0;
  for (let j = 0; j < k; j++) {
    const a = (j / k) * 2 * Math.PI, b = ((j + 1) / k) * 2 * Math.PI;
    const r2 = r[(j + 1) % k];
    sum += Math.hypot(r2 * Math.cos(b) - r[j] * Math.cos(a), r2 * Math.sin(b) - r[j] * Math.sin(a));
  }
  return sum;
}

/** 값이 없는 줄(NaN)은 가까운 줄 값으로 */
function fillRows(rows: number[][]) {
  const ok = rows.map((r) => Number.isFinite(r[0]));
  const first = ok.indexOf(true);
  if (first < 0) return rows.map(() => [0, 0, 0]);
  let last = rows[first];
  return rows.map((r, i) => (ok[i] ? (last = r) : i < first ? rows[first] : last));
}

/** 위아래 줄끼리 부드럽게 (두 번) */
function smoothRows(rows: number[][]) {
  let cur = rows;
  for (let pass = 0; pass < 2; pass++) {
    cur = cur.map((r, i) => r.map((x, d) => (i === 0 || i === cur.length - 1 ? x : (cur[i - 1][d] + x + cur[i + 1][d]) / 3)));
  }
  return cur;
}

/** 몸 단면의 잡음(듬성듬성한 정점 때문에 생기는 들쭉날쭉)을 없애요: 위아래 이웃 중 큰 값 → 평균 */
function cleanBodies(b: Float32Array[]) {
  const W = 2;
  const at = (arr: Float32Array[], i: number, j: number) => arr[Math.min(arr.length - 1, Math.max(0, i))][j];
  const dil = b.map((row, i) => row.map((_, j) => Math.max(...[-W, -1, 0, 1, W].map((d) => at(b, i + d, j)))));
  return dil.map((row, i) => row.map((_, j) => Math.max(b[i][j], [-W, -1, 0, 1, W].reduce((sum, d) => sum + at(dil, i + d, j), 0) / 5)));
}

/** 고리 반지름을 위아래로 부드럽게 하되, 몸 안으로는 들어가지 않게 */
function relax(rows: { body: Float32Array; R: number[] }[]) {
  for (let pass = 0; pass < 6; pass++) {
    const prev = rows.map((r) => r.R.slice());
    rows.forEach((row, i) => {
      if (i === 0 || i === rows.length - 1) return;
      row.R = row.R.map((_, j) => Math.max(row.body[j] + MIN_GAP, (prev[i - 1][j] + prev[i][j] * 2 + prev[i + 1][j]) / 4));
    });
  }
}

function ring(c: V3, u: V3, v: V3, R: number[]) {
  const out: number[] = [];
  R.forEach((r, j) => {
    const th = (j / R.length) * 2 * Math.PI;
    const a = Math.cos(th) * r, b = Math.sin(th) * r;
    out.push(c[0] + u[0] * a + v[0] * b, c[1] + u[1] * a + v[1] * b, c[2] + u[2] * a + v[2] * b);
  });
  return out;
}

function heatOf(ease: number, fitFrom: number, looseFrom: number) {
  const out = new Float32Array(3);
  heatColor(ease, fitFrom, looseFrom, out, 0);
  return out;
}

/** 고리들을 이어 붙여 천(삼각형)으로 만들어요 */
class Sheet {
  pos: number[] = [];
  heat: number[] = [];
  idx: number[] = [];
  tube(rings: number[][], heats: Float32Array[], k: number) {
    const base = this.pos.length / 3;
    rings.forEach((r, i) => {
      this.pos.push(...r);
      for (let j = 0; j < k; j++) this.heat.push(heats[i][0], heats[i][1], heats[i][2]);
    });
    for (let i = 0; i + 1 < rings.length; i++) {
      for (let j = 0; j < k; j++) {
        const a = base + i * k + j, b = base + i * k + ((j + 1) % k);
        const c = a + k, d = b + k;
        this.idx.push(a, c, b, b, c, d);
      }
    }
  }
}

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
    let r = 0, gg = 0, b = 0;
    for (let i = 0; i < d.length; i += 4) {
      r += d[i];
      gg += d[i + 1];
      b += d[i + 2];
    }
    const k = d.length / 4;
    const hex = (v: number) => Math.round(v / k).toString(16).padStart(2, "0");
    return `#${hex(r)}${hex(gg)}${hex(b)}`;
  } catch {
    return "#8a8580";
  }
}
