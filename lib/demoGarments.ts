// 시연용 옷 (남성): 옷장에 처음부터 있는 후드·롱슬리브·핑크 데님 + 사진 보관함의 UCLA 니트·블랙 벌룬 데님.
// 사진의 배경은 미리 지워 두었고(public/demo-garments/), 2D 입어보기에서 옷을 몸에 맞게 펴 붙일
// 기준점(사진 px)을 옷마다 직접 찍어 두었어요. 그리는 곳: components/TryOn2D.tsx
// - photo: 옷장에 보이는 사진 / image: 입혀 볼 때 쓰는 사진 (소매를 펼친 모양 — 후드는 접힌 소매를 펴서 다시 만들었어요)
//
// 기준점 (상의·아우터)
// - neck: 목둘레 가운데 위
// - shoulder: 어깨 솔기 위쪽 끝 [왼쪽, 오른쪽] (사진 기준 왼쪽 = 입은 사람의 오른쪽)
// - armpit: 겨드랑이(소매 아래 솔기와 몸판 옆선이 만나는 곳) [왼쪽, 오른쪽]
// - cuff: 소매 끝 [위쪽 끝, 아래쪽 끝] (왼쪽 소매, 오른쪽 소매)
// - hem: 밑단 [왼쪽 끝, 오른쪽 끝]
// 기준점 (바지) — 바닥에 펼쳐 찍은 사진
// - top: 허리 밴드 위 [왼쪽 끝, 오른쪽 끝], crotch: 가랑이, hip: 가랑이 높이의 바지 양옆 끝,
//   hem: 밑단 [왼다리 바깥, 왼다리 안, 오른다리 안, 오른다리 바깥]

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
  /** 펼쳐 찍은 바지: 가랑이 높이에서 바지 양옆 끝 (있으면 허리~가랑이도 사진 그대로 써요) */
  hip?: [P, P];
}

export interface DemoGarment {
  id: string;
  name: string;
  category: Category;
  gender: Gender;
  /** 입혀 볼 때 쓰는 사진 (배경을 지우고, 소매를 펼친 모양) — 아래 기준점은 이 사진 기준 */
  image: string;
  /** 옷장·사진 보관함에 보이는 사진 (배경을 지운 상품 사진) */
  photo: string;
  /** 옷 실측 (cm, 둘레 기준 — 단면 × 2) */
  measures: Measures;
  rig: TopRig | PantsRig;
}

export const DEMO_GARMENTS: Record<string, DemoGarment> = {
  // ── 옷장 ──
  "m-hoodie": {
    id: "m-hoodie",
    name: "올리브 워싱 후드",
    category: "top",
    gender: "male",
    photo: "/demo-garments/m-hoodie-photo.webp",
    image: "/demo-garments/m-hoodie.webp",
    // 총기장 78 · 어깨너비 70 · 가슴너비 66 · 팔길이 56
    measures: { length: "78", shoulder: "70", chest: "132", sleeve: "56", waist: "128" },
    rig: {
      kind: "top",
      neck: [559, 235],
      shoulder: [
        [321, 281],
        [803, 293],
      ],
      armpit: [
        [321, 461],
        [803, 473],
      ],
      cuff: [
        [
          [0, 532],
          [0, 612],
        ],
        [
          [1124, 544],
          [1124, 624],
        ],
      ],
      hem: [
        [333, 839],
        [795, 839],
      ],
    },
  },
  "m-tee": {
    id: "m-tee",
    name: "블랙 그래픽 롱슬리브",
    category: "top",
    gender: "male",
    photo: "/demo-garments/m-tee-photo.webp",
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
  "m-pants": {
    id: "m-pants",
    name: "핑크 워싱 데님",
    category: "bottom",
    gender: "male",
    photo: "/demo-garments/m-pants.webp",
    image: "/demo-garments/m-pants.webp",
    // 총기장 104 · 허리 단면 38 · 밑위 32 (엉덩이·허벅지는 사진으로 추정)
    measures: { length: "104", waist: "76", rise: "32", hip: "112", thigh: "66" },
    rig: {
      kind: "pants",
      top: [
        [130, 15],
        [355, 8],
      ],
      crotch: [248, 245],
      hip: [
        [78, 245],
        [420, 245],
      ],
      hem: [
        [20, 600],
        [130, 610],
        [348, 600],
        [478, 595],
      ],
    },
  },
  // ── 사진 보관함 ──
  "m-knit": {
    id: "m-knit",
    name: "네이비 UCLA 니트",
    category: "top",
    gender: "male",
    photo: "/demo-garments/m-knit-photo.webp",
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
  "m-bdenim": {
    id: "m-bdenim",
    name: "블랙 벌룬 데님",
    category: "bottom",
    gender: "male",
    photo: "/demo-garments/m-bdenim.webp",
    image: "/demo-garments/m-bdenim.webp",
    // 총기장 105 · 허리 단면 37 · 밑위 35 (엉덩이·허벅지는 사진으로 추정)
    measures: { length: "105", waist: "74", rise: "35", hip: "120", thigh: "76" },
    rig: {
      kind: "pants",
      top: [
        [110, 8],
        [345, 8],
      ],
      crotch: [247, 325],
      hip: [
        [25, 325],
        [470, 325],
      ],
      hem: [
        [30, 725],
        [165, 735],
        [330, 735],
        [465, 725],
      ],
    },
  },
};
