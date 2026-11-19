// 3D 아바타의 '몸 모양'을 만드는 곳입니다.
//
// 원리 (조각하듯 만들기):
// 1. 갈비뼈·골반·가슴·엉덩이·어깨·팔·허벅지·종아리 같은 부위를 둥근 덩어리(타원체·원뿔형 캡슐)로 놓고,
// 2. 덩어리끼리 만나는 곳을 부드럽게 녹여 붙여서(smooth union) 관절이 자연스럽게 이어지게 하고,
// 3. 그 결과를 1cm 안팎 간격의 격자로 훑어 표면을 삼각형으로 만들어요(surface nets).
// 4. 마지막으로 위치에 따라 속옷 색을 칠해요.
// 치수 계산은 lib/bodyModel.ts, 화면에 그리는 건 components/Avatar3D.tsx 에서 해요.

import type { BodyShape } from "./bodyModel";

type V3 = [number, number, number];

/* ───────── 거리 함수 (표면까지의 거리: 안쪽은 음수) ───────── */

function ellipsoid(p: V3, c: V3, r: V3) {
  const x = (p[0] - c[0]) / r[0];
  const y = (p[1] - c[1]) / r[1];
  const z = (p[2] - c[2]) / r[2];
  const k0 = Math.sqrt(x * x + y * y + z * z);
  const k1 = Math.sqrt((x / r[0]) ** 2 + (y / r[1]) ** 2 + (z / r[2]) ** 2);
  return k1 === 0 ? -Math.min(r[0], r[1], r[2]) : (k0 * (k0 - 1)) / k1;
}

/** a에서 b까지 굵기가 ra → rb로 변하는 둥근 원뿔 (팔·다리 마디) */
function roundCone(p: V3, a: V3, b: V3, ra: number, rb: number) {
  const bax = b[0] - a[0];
  const bay = b[1] - a[1];
  const baz = b[2] - a[2];
  const l2 = bax * bax + bay * bay + baz * baz;
  const rr = ra - rb;
  const a2 = l2 - rr * rr;
  const il2 = 1 / l2;
  const pax = p[0] - a[0];
  const pay = p[1] - a[1];
  const paz = p[2] - a[2];
  const y = pax * bax + pay * bay + paz * baz;
  const z = y - l2;
  const qx = pax * l2 - bax * y;
  const qy = pay * l2 - bay * y;
  const qz = paz * l2 - baz * y;
  const x2 = qx * qx + qy * qy + qz * qz;
  const y2 = y * y * l2;
  const z2 = z * z * l2;
  const k = Math.sign(rr) * rr * rr * x2;
  if (Math.sign(z) * a2 * z2 > k) return Math.sqrt(x2 + z2) * il2 - rb;
  if (Math.sign(y) * a2 * y2 < k) return Math.sqrt(x2 + y2) * il2 - ra;
  return (Math.sqrt(x2 * a2 * il2) + y * rr) * il2 - ra;
}

/** 두 덩어리를 k 만큼의 폭으로 부드럽게 녹여 붙여요. */
function smin(a: number, b: number, k: number) {
  const h = Math.max(k - Math.abs(a - b), 0) / k;
  return Math.min(a, b) - h * h * k * 0.25;
}

/* ───────── 몸 설계도 ───────── */

const halfWidth = (circumference: number, k: number) =>
  circumference / (Math.PI * (3 * (1 + k) - Math.sqrt((3 + k) * (1 + 3 * k))));

export interface BodyPlan {
  H: number;
  male: boolean;
  s: number; // 키 165cm 기준 배율
  crotch: number;
  hipY: number;
  waistY: number;
  chestY: number;
  shoulderY: number;
  hipA: number;
  chestA: number;
  /** 몸통·다리(속옷을 칠하는 부분)까지의 거리 */
  core: (p: V3) => number;
  /** 팔까지의 거리 */
  arms: (p: V3) => number;
  bounds: { min: V3; max: V3 };
}

export function planBody(b: BodyShape): BodyPlan {
  const male = b.gender === "male";
  const H = b.height;
  const s = H / 165;
  const vol = Math.pow(b.bmi / 21, 0.6);

  // 높이 기준선 (바닥 0, 단위 cm)
  const crotch = b.inseam;
  const shoulderY = 0.818 * H;
  const T = shoulderY - crotch;
  const hipY = crotch + 0.13 * T;
  const waistY = crotch + 0.44 * T;
  const chestY = crotch + 0.74 * T;
  const neckTop = H - 0.105 * H;

  // 둘레 → 반너비·반깊이
  const hipA = halfWidth(b.hip, male ? 0.7 : 0.72);
  const hipB = hipA * (male ? 0.7 : 0.72);
  const waistA = halfWidth(b.waist, male ? 0.78 : 0.74);
  const waistB = waistA * (male ? 0.78 : 0.74);
  const bustVol = male ? 0 : Math.min(1.6, Math.max(0.55, (b.chest - b.waist * 1.15) / 14 + 0.9));
  // 여성은 가슴 둘레 일부가 가슴 볼륨이라 갈비뼈 쪽을 조금 줄여요.
  const chestA = halfWidth(b.chest, male ? 0.68 : 0.7) * (male ? 1 : 0.94 - 0.04 * bustVol);
  const chestB = chestA * (male ? 0.7 : 0.68);
  const neckR = (male ? 5.2 : 4.8) * s * Math.sqrt(vol);

  const thighR = (b.hip * ((male ? 0.58 : 0.625) + 0.004 * (b.bmi - 21))) / (2 * Math.PI);
  const upperR = (H * (male ? 0.17 : 0.158) * Math.pow(vol, 1.05)) / (2 * Math.PI);

  /* 팔: 어깨에서 손목까지, 살짝 벌린 자세 */
  const angle = ((male ? 9 : 8) * Math.PI) / 180;
  const shoulderX = Math.max(b.shoulder / 2 - upperR * 0.45, chestA * 0.9 + upperR * 0.95);
  const armParts = [-1, 1].map((side) => {
    const dir: V3 = [side * Math.sin(angle), -Math.cos(angle), 0];
    const at = (t: number, z = 0): V3 => [side * shoulderX + dir[0] * t * b.arm, shoulderY - upperR * 0.55 + dir[1] * t * b.arm, z];
    return {
      side,
      root: at(0),
      deltoid: at(0.11, 0.3 * s),
      elbow: at(0.46, -0.6 * s),
      fore: at(0.6, -0.2 * s),
      wrist: at(1, 0.3 * s),
      hand: at(1, 0.6 * s),
      dir,
    };
  });

  /* 다리: 골반에서 발목까지 */
  const kneeY = 0.285 * H;
  const ankleY = 0.045 * H;
  const legX = thighR * (male ? 0.98 : 0.92);
  const legParts = [-1, 1].map((side) => ({
    side,
    hip: [side * legX, crotch + 4 * s, 0] as V3,
    knee: [side * legX * 0.82, kneeY, 0.6 * s] as V3,
    calf: [side * legX * 0.8, 0.2 * H, -1.6 * s] as V3,
    ankle: [side * legX * 0.74, ankleY, -0.6 * s] as V3,
  }));

  const handLen = 0.108 * H;
  const cosA = Math.cos(angle);
  const sinA = Math.sin(angle);

  const arms = (p: V3) => {
    let d = 1e9;
    for (const a of armParts) {
      let arm = roundCone(p, a.root, a.elbow, upperR * 1.02, upperR * 0.66);
      arm = smin(arm, roundCone(p, a.elbow, a.fore, upperR * 0.68, upperR * 0.74), 2.4 * s);
      arm = smin(arm, roundCone(p, a.fore, a.wrist, upperR * 0.74, upperR * 0.5), 2.4 * s);
      // 어깨 삼각근
      arm = smin(arm, ellipsoid(p, a.deltoid, [upperR * 1.03, upperR * 1.25, upperR * 0.96]), 3 * s);
      // 손: 팔 방향으로 회전한 납작한 타원체 + 엄지
      const lx = p[0] - (a.hand[0] + a.dir[0] * handLen * 0.45);
      const ly = p[1] - (a.hand[1] + a.dir[1] * handLen * 0.45);
      const rx = lx * cosA + ly * a.side * sinA;
      const ry = -lx * a.side * sinA + ly * cosA;
      const hand = ellipsoid([rx, ry, p[2] - a.hand[2]], [0, 0, 0], [2 * s, handLen * 0.5, 4.2 * s]);
      const thumb = roundCone(p, [a.wrist[0], a.wrist[1] - 1.5 * s, a.wrist[2] + 2.2 * s], [a.wrist[0] + a.dir[0] * 6 * s, a.wrist[1] - 6.5 * s, a.wrist[2] + 3.6 * s], 1.2 * s, 0.85 * s);
      arm = smin(arm, smin(hand, thumb, 1 * s), 1.6 * s);
      d = Math.min(d, arm);
    }
    return d;
  };

  const core = (p: V3) => {
    // 몸통: 골반 + 허리 + 갈비뼈를 넓게 녹여 붙여요
    let d = ellipsoid(p, [0, hipY, -0.4 * s], [hipA * 0.97, (hipY - crotch) * 1.3 + 3 * s, hipB * 0.95]);
    d = smin(d, ellipsoid(p, [0, waistY, 0], [waistA, (chestY - hipY) * 0.42, waistB]), 9 * s);
    d = smin(d, ellipsoid(p, [0, chestY + 0.5 * s, -0.6 * s], [chestA, (shoulderY - waistY) * 0.47, chestB]), 9 * s);
    // 어깨선·승모근: 목 아래에서 양 어깨로
    for (const a of armParts) {
      d = smin(d, roundCone(p, [a.side * neckR * 0.75, shoulderY + 2 * s, -1.6 * s], [a.root[0] * 0.9, a.root[1], -0.6 * s], (male ? 3.6 : 3.2) * s, 3.2 * s), 4 * s);
    }
    // 가슴 (여성은 볼륨, 남성은 가슴 근육)
    if (male) {
      for (const x of [-1, 1]) d = smin(d, ellipsoid(p, [x * chestA * 0.42, chestY + 2 * s, chestB * 0.55], [chestA * 0.5, 7 * s, 3.4 * s]), 4 * s);
    } else {
      const r = 5.2 * s * bustVol ** 0.5;
      for (const x of [-1, 1]) d = smin(d, ellipsoid(p, [x * chestA * 0.46, chestY - 1.2 * s, chestB * 0.62], [r * 1.05, r * 0.95, r * 0.9]), 3.2 * s);
    }
    // 엉덩이
    for (const x of [-1, 1]) {
      d = smin(d, ellipsoid(p, [x * hipA * 0.4, hipY - 1.5 * s, -hipB * 0.42], [hipA * 0.56, 9.5 * s, hipB * (male ? 0.55 : 0.62)]), 5 * s);
    }
    // 목 + 머리
    d = smin(d, roundCone(p, [0, shoulderY - 3 * s, -1 * s], [0, neckTop, 0.2 * s], neckR * 1.1, neckR * 0.88), 3 * s);
    let head = ellipsoid(p, [0, H - 0.066 * H, 0.4 * s], [(male ? 0.05 : 0.047) * H, 0.066 * H, 0.058 * H]);
    head = smin(head, ellipsoid(p, [0, H - 0.1 * H, 1.8 * s], [(male ? 0.043 : 0.039) * H, 0.034 * H, 0.045 * H]), 3 * s); // 턱
    d = smin(d, head, 1.8 * s);
    // 다리: 허벅지 → 무릎 → 종아리 → 발목 → 발
    for (const l of legParts) {
      let leg = roundCone(p, l.hip, l.knee, thighR * 1.04, thighR * 0.6);
      // 허벅지는 무릎 가까이까지 통통하게 유지돼요
      const mid: V3 = [l.hip[0] * 0.93 + l.knee[0] * 0.07, l.hip[1] * 0.58 + l.knee[1] * 0.42, 0];
      leg = smin(leg, ellipsoid(p, mid, [thighR * 0.95, (l.hip[1] - l.knee[1]) * 0.5, thighR * 0.92]), 7 * s);
      leg = smin(leg, roundCone(p, l.knee, l.calf, thighR * 0.58, thighR * 0.62), 4 * s);
      leg = smin(leg, roundCone(p, l.calf, l.ankle, thighR * 0.62, thighR * 0.38), 5 * s);
      const foot = ellipsoid(p, [l.ankle[0], 3.4 * s, 0.032 * H], [4.1 * s, 3.3 * s, 0.073 * H]);
      leg = smin(leg, foot, 2.2 * s);
      d = smin(d, leg, 4.5 * s);
    }
    return d;
  };

  const spread = Math.max(shoulderX + upperR * 2.5, hipA + 2) + Math.sin(angle) * b.arm + 8 * s;
  return {
    H,
    male,
    s,
    crotch,
    hipY,
    waistY,
    chestY,
    shoulderY,
    hipA,
    chestA,
    core,
    arms,
    bounds: { min: [-spread, -1, -24 * s], max: [spread, H + 2, 24 * s] },
  };
}

/* ───────── 속옷 색칠 ───────── */

function underwear(plan: BodyPlan, p: V3) {
  const { s, crotch, hipY, waistY, chestY, shoulderY, hipA, chestA, male } = plan;
  const [x, y, z] = p;
  const ax = Math.abs(x);
  if (male) {
    // 사각 드로즈: 허리 아래 ~ 허벅지 위쪽
    return y < hipY + 0.55 * (waistY - hipY) && y > crotch - 0.085 * plan.H;
  }
  // 브리프: 배꼽 아래 ~ 다리 옆선을 따라 올라가는 하이컷
  const f = Math.min(1, ax / (hipA * 1.05));
  const briefBottom = crotch - 1.2 * s + f ** 1.6 * (hipY - crotch + 1.5 * s) * (z < 0 ? 0.75 : 0.95);
  if (y < hipY + 0.5 * (waistY - hipY) && y > briefBottom) return true;
  // 브라: 밑가슴 밴드 + 컵 + 어깨끈
  const under = chestY - 6.2 * s;
  if (y > under && y < under + 3 * s) return true; // 밴드 (앞뒤 모두)
  const u = ax / chestA;
  const cupTop = u < 0.1 ? chestY - 1.5 * s : chestY + 4 * s * Math.max(0, 1 - ((u - 0.46) / 0.5) ** 2);
  if (z > 0 && u < 0.95 && y > under && y < cupTop) return true;
  const strapX = chestA * 0.46;
  if (Math.abs(ax - strapX) < 1 * s && y > under && y < shoulderY + 6 * s) return z > 0 ? y > cupTop - 1 * s : true;
  return false;
}

/* ───────── 표면 만들기 (surface nets) ───────── */

export interface BodyMeshData {
  positions: Float32Array;
  normals: Float32Array;
  colors: Float32Array;
  indices: Uint32Array;
}

export function buildBodyMesh(shape: BodyShape, palette: { skin: V3; cloth: V3 }, cell = 1.1): BodyMeshData {
  const plan = planBody(shape);
  const field = (p: V3) => smin(plan.core(p), plan.arms(p), 3 * plan.s);
  const h = cell * plan.s;
  const { min, max } = plan.bounds;
  const nx = Math.ceil((max[0] - min[0]) / h) + 1;
  const ny = Math.ceil((max[1] - min[1]) / h) + 1;
  const nz = Math.ceil((max[2] - min[2]) / h) + 1;
  const val = new Float32Array(nx * ny * nz);
  const id = (i: number, j: number, k: number) => i + nx * (j + ny * k);
  const p: V3 = [0, 0, 0];

  // 1) 성긴 격자로 먼저 훑고, 2) 표면 가까운 곳만 촘촘하게 계산해요 (계산량을 크게 줄여요).
  const C = 4;
  const cx = Math.ceil((nx - 1) / C) + 1;
  const cy = Math.ceil((ny - 1) / C) + 1;
  const cz = Math.ceil((nz - 1) / C) + 1;
  const coarse = new Float32Array(cx * cy * cz);
  for (let k = 0; k < cz; k++)
    for (let j = 0; j < cy; j++)
      for (let i = 0; i < cx; i++) {
        p[0] = min[0] + i * C * h;
        p[1] = min[1] + j * C * h;
        p[2] = min[2] + k * C * h;
        coarse[i + cx * (j + cy * k)] = field(p);
      }
  const near = C * h * 1.6; // 이보다 멀면 표면이 지나갈 수 없어요
  for (let k = 0; k < nz; k++) {
    p[2] = min[2] + k * h;
    const kc = Math.round(k / C);
    for (let j = 0; j < ny; j++) {
      p[1] = min[1] + j * h;
      const jc = Math.round(j / C);
      for (let i = 0; i < nx; i++) {
        const c = coarse[Math.round(i / C) + cx * (jc + cy * kc)];
        if (Math.abs(c) > near) {
          val[id(i, j, k)] = c;
          continue;
        }
        p[0] = min[0] + i * h;
        val[id(i, j, k)] = field(p);
      }
    }
  }

  // 표면이 지나가는 칸마다 점을 하나 놓아요.
  const cellVert = new Int32Array((nx - 1) * (ny - 1) * (nz - 1)).fill(-1);
  const cid = (i: number, j: number, k: number) => i + (nx - 1) * (j + (ny - 1) * k);
  const pos: number[] = [];
  const corners: V3[] = [
    [0, 0, 0], [1, 0, 0], [0, 1, 0], [1, 1, 0],
    [0, 0, 1], [1, 0, 1], [0, 1, 1], [1, 1, 1],
  ];
  const edges = [
    [0, 1], [2, 3], [4, 5], [6, 7],
    [0, 2], [1, 3], [4, 6], [5, 7],
    [0, 4], [1, 5], [2, 6], [3, 7],
  ];
  const cv = new Float64Array(8);
  for (let k = 0; k < nz - 1; k++)
    for (let j = 0; j < ny - 1; j++)
      for (let i = 0; i < nx - 1; i++) {
        let inside = 0;
        for (let c = 0; c < 8; c++) {
          const [a, bb, cc] = corners[c];
          cv[c] = val[id(i + a, j + bb, k + cc)];
          if (cv[c] < 0) inside++;
        }
        if (inside === 0 || inside === 8) continue;
        let sx = 0, sy = 0, sz = 0, n = 0;
        for (const [e0, e1] of edges) {
          const v0 = cv[e0];
          const v1 = cv[e1];
          if (v0 < 0 === v1 < 0) continue;
          const t = v0 / (v0 - v1);
          const c0 = corners[e0];
          const c1 = corners[e1];
          sx += c0[0] + (c1[0] - c0[0]) * t;
          sy += c0[1] + (c1[1] - c0[1]) * t;
          sz += c0[2] + (c1[2] - c0[2]) * t;
          n++;
        }
        cellVert[cid(i, j, k)] = pos.length / 3;
        pos.push(min[0] + (i + sx / n) * h, min[1] + (j + sy / n) * h, min[2] + (k + sz / n) * h);
      }

  // 표면을 가로지르는 격자선마다, 그 선을 둘러싼 네 칸의 점으로 사각형을 만들어요.
  const idx: number[] = [];
  const quad = (a: number, b: number, c: number, d: number, flip: boolean) => {
    if (a < 0 || b < 0 || c < 0 || d < 0) return;
    if (flip) idx.push(a, b, c, a, c, d);
    else idx.push(a, c, b, a, d, c);
  };
  for (let k = 1; k < nz - 1; k++)
    for (let j = 1; j < ny - 1; j++)
      for (let i = 1; i < nx - 1; i++) {
        const v0 = val[id(i, j, k)] < 0;
        if (v0 !== val[id(i + 1, j, k)] < 0)
          quad(cellVert[cid(i, j, k)], cellVert[cid(i, j - 1, k)], cellVert[cid(i, j - 1, k - 1)], cellVert[cid(i, j, k - 1)], v0);
        if (v0 !== val[id(i, j + 1, k)] < 0)
          quad(cellVert[cid(i, j, k)], cellVert[cid(i, j, k - 1)], cellVert[cid(i - 1, j, k - 1)], cellVert[cid(i - 1, j, k)], v0);
        if (v0 !== val[id(i, j, k + 1)] < 0)
          quad(cellVert[cid(i, j, k)], cellVert[cid(i - 1, j, k)], cellVert[cid(i - 1, j - 1, k)], cellVert[cid(i, j - 1, k)], v0);
      }

  // 매끈한 음영을 위해 표면의 방향(법선)을 거리 함수의 기울기로 구하고, 속옷 색을 칠해요.
  const count = pos.length / 3;
  const normals = new Float32Array(count * 3);
  const colors = new Float32Array(count * 3);
  // 격자 값에서 바로 기울기를 읽어요 (몸을 다시 계산하지 않아 빨라요).
  const sample = (x: number, y: number, z: number) => {
    const fx = Math.min(nx - 1.001, Math.max(0, (x - min[0]) / h));
    const fy = Math.min(ny - 1.001, Math.max(0, (y - min[1]) / h));
    const fz = Math.min(nz - 1.001, Math.max(0, (z - min[2]) / h));
    const i = Math.floor(fx), j = Math.floor(fy), k = Math.floor(fz);
    const tx = fx - i, ty = fy - j, tz = fz - k;
    const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
    const c00 = lerp(val[id(i, j, k)], val[id(i + 1, j, k)], tx);
    const c10 = lerp(val[id(i, j + 1, k)], val[id(i + 1, j + 1, k)], tx);
    const c01 = lerp(val[id(i, j, k + 1)], val[id(i + 1, j, k + 1)], tx);
    const c11 = lerp(val[id(i, j + 1, k + 1)], val[id(i + 1, j + 1, k + 1)], tx);
    return lerp(lerp(c00, c10, ty), lerp(c01, c11, ty), tz);
  };
  for (let v = 0; v < count; v++) {
    const x = pos[v * 3];
    const y = pos[v * 3 + 1];
    const z = pos[v * 3 + 2];
    let gx = sample(x + h, y, z) - sample(x - h, y, z);
    let gy = sample(x, y + h, z) - sample(x, y - h, z);
    let gz = sample(x, y, z + h) - sample(x, y, z - h);
    const len = Math.hypot(gx, gy, gz) || 1;
    gx /= len;
    gy /= len;
    gz /= len;
    normals.set([gx, gy, gz], v * 3);
    const point: V3 = [x, y, z];
    const onArm = plan.arms(point) < plan.core(point);
    // 속옷 경계가 계단처럼 보이지 않게 주변 몇 점을 함께 보고 섞어요.
    let cover = 0;
    if (!onArm) {
      const o = h * 0.5;
      const probes: V3[] = [point, [x + o, y, z], [x - o, y, z], [x, y + o, z], [x, y - o, z], [x, y, z + o], [x, y, z - o]];
      for (const pr of probes) if (underwear(plan, pr)) cover++;
      cover /= probes.length;
    }
    for (let c = 0; c < 3; c++) colors[v * 3 + c] = palette.skin[c] + (palette.cloth[c] - palette.skin[c]) * cover;
  }

  return {
    positions: new Float32Array(pos),
    normals,
    colors,
    indices: new Uint32Array(idx),
  };
}
