// 쇼핑메이트가 추천할 수 있는 상품 목록입니다.
// Claude는 이 목록 안에서만 상품을 추천해요(목록 밖 상품·가격은 지어내지 않도록).
//
// ⚠ 지금 들어 있는 상품은 화면 확인용 '예시'예요. 실제 데이터(30~50개)가 준비되면 이 배열을 통째로 바꾸면 됩니다.
// 상품 하나 넣는 법:
// - id: 겹치지 않는 영문 이름 (예: "musinsa-wide-slacks")
// - category: "top"(상의) · "outer"(아우터) · "bottom"(하의) · "bag"(가방·신발 등 ACC)
// - image: public/images/products/ 에 사진을 넣고 "/images/products/파일이름.jpg"
// - sizes: 사이즈별 실측(cm). 있으면 사용자의 기준 옷 실측과 비교해 사이즈까지 추천할 수 있어요.
// - tags: 취향 찾기와 같은 단어(미니멀·캐주얼·스트릿·아메카지 등)를 쓰면 취향에 맞춰 고르기 쉬워요.

import type { Category, Gender, Measures } from "./data";

export interface Product {
  id: string;
  name: string;
  brand: string;
  category: Category;
  price: number;
  image: string;
  link?: string;
  colors?: string[];
  /** 사이즈 이름 → 실측(cm). 상의: length·shoulder·chest·sleeve, 하의: waist·hip·thigh·rise·length 등 */
  sizes?: Record<string, Measures>;
  tags?: string[];
  /** 핏·소재 한 줄 설명 */
  desc?: string;
  /** 특정 성별용이면 지정 (비우면 공용) */
  gender?: Gender;
}

export const PRODUCTS: Product[] = [
  {
    id: "sample-oxford-shirt",
    name: "예시 · 옥스퍼드 레귤러 셔츠",
    brand: "예시 브랜드",
    category: "top",
    price: 35900,
    image: "/images/closet/shirt.jpg",
    colors: ["아이보리", "스카이블루"],
    sizes: {
      S: { length: "70", shoulder: "44", chest: "104", sleeve: "58" },
      M: { length: "72", shoulder: "46", chest: "110", sleeve: "60" },
      L: { length: "74", shoulder: "48", chest: "116", sleeve: "62" },
    },
    tags: ["미니멀", "캐주얼", "오피스"],
    desc: "어깨가 살짝 내려오는 레귤러 핏, 도톰한 코튼 옥스퍼드",
  },
  {
    id: "sample-wide-slacks",
    name: "예시 · 와이드 히든 밴딩 슬랙스",
    brand: "예시 브랜드",
    category: "bottom",
    price: 39900,
    image: "/images/closet/slacks.jpg",
    colors: ["블랙", "차콜"],
    sizes: {
      S: { waist: "68", hip: "98", thigh: "62", rise: "30", length: "100" },
      M: { waist: "72", hip: "102", thigh: "64", rise: "31", length: "102" },
      L: { waist: "76", hip: "106", thigh: "66", rise: "32", length: "104" },
    },
    tags: ["미니멀", "오피스"],
    desc: "허리 뒤 밴딩으로 편한 와이드 핏, 구김이 적은 소재",
  },
  {
    id: "sample-knit-cardigan",
    name: "예시 · 소프트 울 브이넥 가디건",
    brand: "예시 브랜드",
    category: "outer",
    price: 49900,
    image: "/images/closet/cardigan.jpg",
    colors: ["네이비", "오트밀"],
    sizes: {
      S: { length: "62", shoulder: "42", chest: "100", sleeve: "58" },
      M: { length: "64", shoulder: "44", chest: "106", sleeve: "60" },
    },
    tags: ["미니멀", "캐주얼"],
    desc: "셔츠 위에 걸치기 좋은 얇은 울 혼방 가디건",
  },
  {
    id: "sample-leather-tote",
    name: "예시 · 스퀘어 레더 토트백",
    brand: "예시 브랜드",
    category: "bag",
    price: 59000,
    image: "/images/closet/tote.jpg",
    colors: ["블랙"],
    sizes: { FREE: { width: "34", height: "28", depth: "12", handle: "22" } },
    tags: ["미니멀", "오피스"],
    desc: "A4 서류가 들어가는 단정한 사각 토트백",
  },
];

export const findProduct = (id: string) => PRODUCTS.find((p) => p.id === id);
