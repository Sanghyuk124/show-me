// 3D 아바타의 몸 치수를 정하는 곳입니다. (그리는 코드는 components/Avatar3D.tsx)
// - 키·몸무게·성별로 기본 체형을 추정하고,
// - 사용자가 입력한 상세 치수(팔 길이·어깨 너비·가슴·허리·엉덩이 둘레·인심)가 있으면 그 값으로 바꿔요.
// - 너무 작거나 큰 값은 사람 몸으로 자연스러운 범위 안으로 맞춰요(범위는 HowHeight 바디 비주얼라이저 참고).

import type { Gender, Measures } from "./data";

export interface BodyShape {
  gender: Gender;
  height: number; // cm
  weight: number; // kg
  bmi: number;
  arm: number; // 팔 길이: 어깨 끝 ~ 손목
  shoulder: number; // 어깨 너비 (직선)
  chest: number; // 가슴 둘레
  waist: number; // 허리 둘레
  hip: number; // 엉덩이 둘레
  inseam: number; // 인심: 가랑이 ~ 바닥
  /** 사용자가 직접 입력한 항목 (나머지는 추정값) */
  measured: (keyof typeof RANGES)[];
}

/** 각 치수의 자연스러운 범위 (cm / kg) */
export const RANGES = {
  height: [137, 214],
  weight: [27, 216],
  arm: [40, 75],
  shoulder: [28, 55],
  chest: [57, 149],
  waist: [38, 140],
  hip: [67, 144],
  inseam: [58, 104],
} as const;

type Key = keyof typeof RANGES;

const clamp = (v: number, [min, max]: readonly [number, number]) => Math.min(max, Math.max(min, v));
const num = (v?: string) => {
  const n = Number.parseFloat(v ?? "");
  return Number.isFinite(n) && n > 0 ? n : undefined;
};

/** 입력값이 범위를 벗어났는지 (화면 안내용) */
export function outOfRange(key: Key, value?: string) {
  const n = num(value);
  return n !== undefined && (n < RANGES[key][0] || n > RANGES[key][1]);
}

export function resolveBody(profile: { gender: Gender; height: string; weight: string }, body: Measures): BodyShape {
  const gender = profile.gender;
  const male = gender === "male";
  const height = clamp(num(profile.height) ?? (male ? 174 : 162), RANGES.height);
  const weight = clamp(num(profile.weight) ?? (male ? 70 : 54), RANGES.weight);
  const bmi = weight / (height / 100) ** 2;
  // 몸무게가 많을수록 둘레가 커지는 정도 (BMI 21을 기준으로)
  const vol = Math.pow(bmi / 21, 0.65);

  // 키·몸무게·성별로 추정한 기본 체형
  const estimate: Record<Exclude<Key, "height" | "weight">, number> = {
    arm: height * (male ? 0.335 : 0.33),
    shoulder: height * (male ? 0.245 : 0.225),
    chest: height * (male ? 0.54 : 0.52) * vol,
    waist: height * (male ? 0.45 : 0.4) * Math.pow(bmi / 21, 0.9),
    hip: height * (male ? 0.55 : 0.56) * vol,
    inseam: height * (male ? 0.455 : 0.45),
  };

  const measured: Key[] = [];
  const pick = (key: Exclude<Key, "height" | "weight">, input?: string) => {
    const n = num(input);
    if (n !== undefined) measured.push(key);
    return clamp(n ?? estimate[key], RANGES[key]);
  };

  return {
    gender,
    height,
    weight,
    bmi,
    arm: pick("arm", body.arm),
    shoulder: pick("shoulder", body.shoulder),
    chest: pick("chest", body.chest),
    waist: pick("waist", body.waist),
    hip: pick("hip", body.hip),
    // 인심은 키에 비해 너무 길거나 짧으면 몸통이 어색해져서 키 기준으로도 한 번 더 맞춰요.
    inseam: clamp(pick("inseam", body.inseam), [height * 0.38, height * 0.52]),
    measured,
  };
}
