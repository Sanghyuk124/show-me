// 시연용 옷 (미리 정해 둔 남성 상의·하의·아우터 세트 + 사진 보관함 니트).
// 사진의 배경은 미리 지워 두었고(public/demo-garments/), 2D 입어보기에서 옷을 몸에 맞게 펴 붙일
// 기준점(사진 px)을 옷마다 직접 찍어 두었어요. 그리는 곳: components/TryOn2D.tsx
//
// 기준점 (상의·아우터)
// - neck: 목둘레 가운데 위
// - shoulder: 어깨 솔기 위쪽 끝 [왼쪽, 오른쪽] (사진 기준 왼쪽 = 입은 사람의 오른쪽)
// - armpit: 겨드랑이(소매 아래 솔기와 몸판 옆선이 만나는 곳) [왼쪽, 오른쪽]
// - cuff: 소매 끝 [위쪽 끝, 아래쪽 끝] (왼쪽 소매, 오른쪽 소매)
// - hem: 밑단 [왼쪽 끝, 오른쪽 끝]
// 기준점 (바지) — 착용 사진에서 잘라낸 앞모습이에요 (윗부분은 상의에 가려져 있어요)
// - top: 보이는 맨 윗줄 [왼쪽 끝, 오른쪽 끝], crotch: 가랑이, hem: 밑단 [왼다리 바깥, 왼다리 안, 오른다리 안, 오른다리 바깥]

import type { Category, Gender, Measures } from "./data";

type P = [number, number];

export interface TopRig {
  kind: "top";
  neck: P;
  shoulder: [P, P];
  armpit: [P, P];
  cuff: [[P, P], [P, P]];
  hem: [P, P];
}

export interface PantsRig {
  kind: "pants";
  top: [P, P];
  crotch: P;
  hem: [P, P, P, P];
}

export interface DemoGarment {
  id: string;
  name: string;
  category: Category;
  gender: Gender;
  /** 배경을 지운 옷 사진 */
  image: string;
  /** 옷 실측 (cm, 둘레 기준 — 단면 × 2) */
  measures: Measures;
  rig: TopRig | PantsRig;
}

export const DEMO_GARMENTS: Record<string, DemoGarment> = {
  "m-tee": {
    id: "m-tee",
    name: "블랙 그래픽 롱슬리브",
    category: "top",
    gender: "male",
    image: "/demo-garments/m-tee.webp",
    // 총기장 76 · 어깨너비 59 · 가슴너비 58 · 팔길이 58
    measures: { length: "76", shoulder: "59", chest: "116", sleeve: "58", waist: "116" },
    rig: {
      kind: "top",
      neck: [430, 8],
      shoulder: [
        [265, 40],
        [590, 40],
      ],
      armpit: [
        [250, 186],
        [592, 186],
      ],
      cuff: [
        [
          [8, 158],
          [18, 212],
        ],
        [
          [885, 163],
          [880, 225],
        ],
      ],
      hem: [
        [236, 405],
        [598, 410],
      ],
    },
  },
  "m-jacket": {
    id: "m-jacket",
    name: "블랙 바시티 재킷",
    category: "outer",
    gender: "male",
    image: "/demo-garments/m-jacket.webp",
    // 총기장 67 · 어깨 56 · 팔길이 64 (가슴너비는 사진으로 추정 64)
    measures: { length: "67", shoulder: "56", sleeve: "64", chest: "128", waist: "120" },
    rig: {
      kind: "top",
      neck: [420, 6],
      shoulder: [
        [295, 50],
        [548, 62],
      ],
      armpit: [
        [262, 198],
        [585, 212],
      ],
      cuff: [
        [
          [25, 200],
          [45, 248],
        ],
        [
          [838, 205],
          [812, 250],
        ],
      ],
      hem: [
        [268, 340],
        [552, 343],
      ],
    },
  },
  "m-knit": {
    id: "m-knit",
    name: "네이비 UCLA 니트",
    category: "top",
    gender: "male",
    image: "/demo-garments/m-knit.webp",
    // 총기장 67 · 어깨너비 52 · 팔길이 57 · 가슴너비 50
    measures: { length: "67", shoulder: "52", sleeve: "57", chest: "100", waist: "100" },
    rig: {
      kind: "top",
      neck: [430, 6],
      shoulder: [
        [295, 30],
        [585, 38],
      ],
      armpit: [
        [285, 192],
        [590, 195],
      ],
      cuff: [
        [
          [5, 160],
          [20, 226],
        ],
        [
          [875, 145],
          [862, 196],
        ],
      ],
      hem: [
        [300, 385],
        [577, 385],
      ],
    },
  },
  "m-pants": {
    id: "m-pants",
    name: "핑크 워싱 데님",
    category: "bottom",
    gender: "male",
    image: "/demo-garments/m-pants.webp",
    // 총기장 104 · 허리 단면 38 · 밑위 32 (엉덩이·허벅지는 착용 사진으로 추정)
    measures: { length: "104", waist: "76", rise: "32", hip: "112", thigh: "70" },
    rig: {
      kind: "pants",
      top: [
        [3, 14],
        [268, 14],
      ],
      crotch: [130, 20],
      hem: [
        [12, 500],
        [110, 500],
        [160, 500],
        [262, 500],
      ],
    },
  },
};
