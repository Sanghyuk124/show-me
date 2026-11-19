// MakeHuman(CC0) 인체 모델로 만든 아바타 파일(public/models/avatar-*.bin)을 읽고,
// 사용자의 키·몸무게·상세 치수에 맞춰 몸 모양을 계산하는 곳입니다.
// 파일 만드는 법: scripts/avatar/build_avatar.py
//
// 계산 순서
// 1) 몸무게(BMI)로 마른 몸 ↔ 통통한 몸 변형을 섞고
// 2) 사용자가 입력한 치수만 골라, MakeHuman 줄자 위치에서 잰 값이 입력값과 같아지도록 변형 강도를 맞추고
//    (가슴·허리·엉덩이 둘레, 어깨 너비, 팔 길이, 인심)
// 3) 마지막에 키에 맞게 전체 크기를 맞춰요.

import type { Gender } from "./data";
import type { BodyShape } from "./bodyModel";

interface ArrayInfo {
  type: string;
  count: number;
  offset: number;
}

interface Header {
  vertexCount: number;
  rulers: Record<string, number[]>;
  shoulderTips: [number, number];
  crotch: number;
  landmarks: Record<string, number>;
  arrays: Record<string, ArrayInfo>;
  morphs: { name: string; count: number; scale: number }[];
}

export interface AvatarModel {
  vertexCount: number;
  base: Float32Array;
  index: Uint32Array;
  eyeIndex: Uint32Array;
  /** 정점이 팔에 속하는 정도 (0~255). 팔에는 속옷을 칠하지 않아요 */
  armF: Uint8Array;
  /** 기본 몸에서의 가슴·허리·엉덩이 등 높이 (속옷 칠하기용, cm) */
  landmarks: Record<string, number>;
  morphs: Record<string, { idx: Uint32Array; d: Float32Array }>;
  rulers: Record<string, number[]>;
  shoulderTips: [number, number];
  crotch: number;
}

const cache = new Map<Gender, Promise<AvatarModel>>();

/** 성별별 아바타 파일을 한 번만 내려받아요. */
export function loadAvatarModel(gender: Gender) {
  let p = cache.get(gender);
  if (!p) {
    p = fetch(`/models/avatar-${gender}.bin`)
      .then((r) => {
        if (!r.ok) throw new Error(`아바타 파일을 불러오지 못했어요 (${r.status})`);
        return r.arrayBuffer();
      })
      .then(parse);
    p.catch(() => cache.delete(gender));
    cache.set(gender, p);
  }
  return p;
}

function parse(buf: ArrayBuffer): AvatarModel {
  const view = new DataView(buf);
  const hLen = view.getUint32(0, true);
  const header: Header = JSON.parse(new TextDecoder().decode(new Uint8Array(buf, 4, hLen)));
  const start = 4 + hLen;
  const get = (name: string) => {
    const a = header.arrays[name];
    const off = start + a.offset;
    switch (a.type) {
      case "float32":
        return new Float32Array(buf, off, a.count);
      case "uint32":
        return new Uint32Array(buf, off, a.count);
      case "int16":
        return new Int16Array(buf, off, a.count);
      default:
        return new Uint8Array(buf, off, a.count);
    }
  };
  const morphs: AvatarModel["morphs"] = {};
  for (const m of header.morphs) {
    const raw = get(`m_${m.name}_d`) as Int16Array;
    const d = new Float32Array(raw.length);
    for (let i = 0; i < raw.length; i++) d[i] = raw[i] * m.scale;
    morphs[m.name] = { idx: get(`m_${m.name}_idx`) as Uint32Array, d };
  }
  return {
    vertexCount: header.vertexCount,
    base: get("position") as Float32Array,
    index: get("index") as Uint32Array,
    eyeIndex: get("eyeIndex") as Uint32Array,
    armF: get("armF") as Uint8Array,
    landmarks: header.landmarks,
    morphs,
    rulers: header.rulers,
    shoulderTips: header.shoulderTips,
    crotch: header.crotch,
  };
}

/* ───────── 몸 모양 계산 ───────── */

class Body {
  pos: Float32Array;
  weights: Record<string, number> = {};
  constructor(private model: AvatarModel) {
    this.pos = model.base.slice();
  }
  /** 변형 하나의 강도를 바꿔요 (바뀐 만큼만 더해요) */
  set(name: string, w: number) {
    const m = this.model.morphs[name];
    const diff = w - (this.weights[name] ?? 0);
    if (!m || diff === 0) return;
    this.weights[name] = w;
    const { idx, d } = m;
    for (let k = 0; k < idx.length; k++) {
      const i = idx[k] * 3;
      this.pos[i] += d[k * 3] * diff;
      this.pos[i + 1] += d[k * 3 + 1] * diff;
      this.pos[i + 2] += d[k * 3 + 2] * diff;
    }
  }
  /** Inc/Dec 짝 변형을 -1~1 하나의 값으로 (양수면 늘리고, 음수면 줄여요) */
  pair(name: string, k: number) {
    this.set(`${name}Inc`, Math.max(0, k));
    this.set(`${name}Dec`, Math.max(0, -k));
  }
  ruler(name: string) {
    const r = this.model.rulers[name];
    let sum = 0;
    for (let n = 1; n < r.length; n++) {
      const a = r[n - 1] * 3;
      const b = r[n] * 3;
      sum += Math.hypot(this.pos[a] - this.pos[b], this.pos[a + 1] - this.pos[b + 1], this.pos[a + 2] - this.pos[b + 2]);
    }
    return sum;
  }
  minY() {
    let m = Infinity;
    for (let i = 1; i < this.pos.length; i += 3) if (this.pos[i] < m) m = this.pos[i];
    return m;
  }
  height() {
    let lo = Infinity;
    let hi = -Infinity;
    for (let i = 1; i < this.pos.length; i += 3) {
      if (this.pos[i] < lo) lo = this.pos[i];
      if (this.pos[i] > hi) hi = this.pos[i];
    }
    return hi - lo;
  }
}

/** 측정값이 목표가 되도록 변형 강도 k(-1~1)를 맞춰요 (할선법) */
function fit(body: Body, apply: (k: number) => void, measure: () => number, target: number, start: number) {
  let k0 = start;
  apply(k0);
  let f0 = measure() - target;
  let k1 = Math.max(-1, Math.min(1, k0 + (f0 > 0 ? -0.3 : 0.3)));
  for (let it = 0; it < 6; it++) {
    apply(k1);
    const f1 = measure() - target;
    if (Math.abs(f1) < 0.05 || Math.abs(f1 - f0) < 1e-6) break;
    const k2 = Math.max(-1, Math.min(1, k1 - (f1 * (k1 - k0)) / (f1 - f0)));
    k0 = k1;
    f0 = f1;
    k1 = k2;
  }
  return k1;
}

/** 치수에 맞춘 정점 위치 (cm, 바닥 y=0) */
export function shapeAvatar(model: AvatarModel, shape: BodyShape) {
  const body = new Body(model);
  const has = (k: string) => shape.measured.includes(k as BodyShape["measured"][number]);

  // 1) 몸무게: BMI 21.5를 기준으로 마른/통통한 변형을 섞어요
  const bmi = shape.bmi;
  body.set("weightMin", Math.max(0, Math.min(1, (21.5 - bmi) / 5.5)));
  body.set("weightMax", Math.max(0, Math.min(1, (bmi - 21.5) / 11)));

  // 2) 입력한 치수 맞추기 (키에 맞춘 크기 배율을 고려해 몇 번 반복해요)
  const ks: Record<string, number> = {};
  for (let round = 0; round < 3; round++) {
    const scale = shape.height / body.height();
    const tips = model.shoulderTips.map((i) => i * 3);
    const steps: [string, () => number, number, (k: number) => void][] = [];
    if (has("chest")) steps.push(["bust", () => body.ruler("bust"), shape.chest, (k) => body.pair("bust", k)]);
    if (has("waist")) steps.push(["waist", () => body.ruler("waist"), shape.waist, (k) => body.pair("waist", k)]);
    if (has("hip")) steps.push(["hips", () => body.ruler("hips"), shape.hip, (k) => body.pair("hips", k)]);
    if (has("shoulder"))
      steps.push(["shoulder", () => Math.abs(body.pos[tips[0]] - body.pos[tips[1]]), shape.shoulder, (k) => body.pair("shoulder", k)]);
    if (has("arm"))
      steps.push(["arm", () => body.ruler("upperarm") + body.ruler("lowerarm"), shape.arm, (k) => (body.pair("upperarm", k), body.pair("lowerarm", k))]);
    if (has("inseam"))
      steps.push(["inseam", () => body.pos[model.crotch * 3 + 1] - body.minY(), shape.inseam, (k) => (body.pair("upperleg", k), body.pair("lowerleg", k))]);
    for (const [name, measure, target, apply] of steps) {
      ks[name] = fit(body, apply, measure, target / scale, ks[name] ?? 0);
    }
  }

  // 3) 키에 맞게 크기 조정, 바닥을 0으로
  const scale = shape.height / body.height();
  const floor = body.minY();
  const out = body.pos;
  for (let i = 0; i < out.length; i += 3) {
    out[i] *= scale;
    out[i + 1] = (out[i + 1] - floor) * scale;
    out[i + 2] *= scale;
  }
  return out;
}
