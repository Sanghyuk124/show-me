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
  /** 이 상황을 물으면 꼭 이 상품을 추천해요 (시연용 고정 추천, 예: "남성 데이트 룩") */
  pinnedFor?: string[];
}

/** 남성 사용자가 데이트 룩을 물으면 함께 추천할 고정 세트 (시연용) */
export const DATE_LOOK_MALE = ["dunst-striped-chunky-sweater", "dunst-wide-chino-slacks"];

export const PRODUCTS: Product[] = [
  // ── 남성 데이트 룩 고정 추천 (던스트, 실측은 상품 페이지 사이즈 가이드의 단면 × 2) ──
  {
    id: "dunst-striped-chunky-sweater",
    name: "UNISEX STRIPED CHUNKY SWEATER IVORY",
    brand: "던스트",
    category: "top",
    price: 141600,
    image: "/images/products/dunst-striped-chunky-sweater.jpg",
    link: "https://dunststudio.com/product/detail.html?product_no=9792&cate_no=303&display_group=1",
    colors: ["아이보리 (카키 스트라이프)"],
    // 상품 페이지 사이즈 가이드 (단면): XS 총장55 어깨48 가슴53 밑단41 암홀22.5 팔길이54 … XL 총장67 어깨59 가슴64 밑단51 암홀26.5 팔길이60
    sizes: {
      XS: { length: "55", shoulder: "48", chest: "106", hem: "82", armhole: "22.5", sleeve: "54" },
      S: { length: "57", shoulder: "50", chest: "110", hem: "86", armhole: "23.5", sleeve: "55" },
      M: { length: "63", shoulder: "53", chest: "116", hem: "92", armhole: "24.5", sleeve: "56" },
      L: { length: "65", shoulder: "56", chest: "122", hem: "98", armhole: "25.5", sleeve: "58.5" },
      XL: { length: "67", shoulder: "59", chest: "128", hem: "102", armhole: "26.5", sleeve: "60" },
    },
    tags: ["캐주얼", "미니멀", "데이트"],
    desc: "세미 오버핏 유니섹스 크루넥 스웨터, 울 85% · 아크릴 15%, 옆선 버튼 디테일. 정가 149,000원 (할인가)",
    pinnedFor: ["남성 데이트 룩"],
  },
  {
    id: "dunst-wide-chino-slacks",
    name: "DOUBLE PLEATED WIDE CHINO SLACKS KHAKI",
    brand: "던스트",
    category: "bottom",
    price: 103200,
    image: "/images/products/dunst-wide-chino-slacks.jpg",
    link: "https://dunststudio.com/product/detail.html?product_no=9131&cate_no=303&display_group=1",
    colors: ["카키"],
    // 상품 페이지 사이즈 가이드 (단면): S 총장106 허리39 힙51.7 허벅지36 밑단26.5 밑위30.5 … L 총장110 허리43 힙55.7 허벅지40 밑단28.5 밑위32.5
    sizes: {
      S: { length: "106", waist: "78", hip: "103.4", thigh: "72", hem: "53", rise: "30.5" },
      M: { length: "108", waist: "82", hip: "107.4", thigh: "76", hem: "55", rise: "31.5" },
      L: { length: "110", waist: "86", hip: "111.4", thigh: "80", hem: "57", rise: "32.5" },
    },
    tags: ["미니멀", "캐주얼", "데이트"],
    desc: "더블 플리츠 와이드 치노 슬랙스, 코튼 100%, 여유롭게 떨어지는 와이드 실루엣. 정가 129,000원 (할인가)",
    pinnedFor: ["남성 데이트 룩"],
  },
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
