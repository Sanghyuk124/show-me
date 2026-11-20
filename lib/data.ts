// 앱에 들어가는 문구·예시 데이터를 모아둔 파일입니다.
// 상품, 브랜드, 세일 일정을 바꾸고 싶으면 이 파일만 수정하세요.

import { DEMO_GARMENTS } from "./demoGarments";

export type Gender = "female" | "male";
export type PersonalColor = "spring" | "summer" | "autumn" | "winter" | "unknown";
export type Category = "top" | "outer" | "bottom" | "bag";
export type Measures = Record<string, string>;

export interface Profile {
  nickname: string;
  age: string;
  gender: Gender;
  height: string;
  weight: string;
  personalColor: PersonalColor;
}

export interface ClosetItem {
  id: string;
  name: string;
  category: Category;
  source: "photo" | "link";
  image?: string;
  favorite: boolean;
  /** 판매처에서 불러온(예시) 실측이 채워져 있는지 */
  prefilled?: boolean;
  /** 사용자가 저장·확인을 끝냈는지 */
  confirmed: boolean;
  measures: Measures;
  link?: string;
  size?: string;
  /** true면 image가 배경을 지운(누끼) 투명 사진이에요 */
  cutout?: boolean;
  /** 앱 안 '사진 보관함'의 예시 사진으로 등록했으면 그 사진 이름 (SAMPLE_PHOTOS의 id) */
  sample?: string;
  /** 채팅 추천 상품을 '옷장에 넣기'로 넣었으면 그 상품 id (lib/products.ts) */
  product?: string;
  /** 시연용 옷이면 그 이름 (lib/demoGarments.ts) → 2D 입어보기에서 기준점에 맞춰 펴 입혀요 */
  demo?: string;
  /** 이 성별 사용자에게만 보여요 (예시 옷). 비어 있으면 모두에게 */
  gender?: Gender;
  /**
   * 아바타에 입힐 옷 모양 (없으면 이름·카테고리·소매 길이로 자동으로 골라요)
   * tee: 티셔츠·니트 / shirt: 셔츠·블라우스 / jacket: 재킷·아우터 / pants: 긴바지 / skirt: 스커트 / shorts: 반바지
   */
  garmentType?: "tee" | "shirt" | "jacket" | "pants" | "skirt" | "shorts";
}

export interface CartItem {
  id: string;
  name: string;
  option: string;
  price: number;
  image: string;
  qty: number;
  checked: boolean;
}

export interface Brand {
  id: string;
  name: string;
  en: string;
  type: string;
}

export interface SaleEvent {
  id: string;
  brand: string;
  brandId?: string;
  title: string;
  start: string; // YYYY-MM-DD
  end: string;
  place: string;
  listPlace: string;
  desc: string;
  discount?: string;
}

/** 프로토타입과 같은 화면을 보여주기 위한 '오늘'. 실제 날짜를 쓰려면 lib/date.ts의 todayISO를 수정하세요. */
export const DEMO_TODAY = "2026-11-16";

export const GENDER_LABEL: Record<Gender, string> = { female: "여성", male: "남성" };

export const PERSONAL_COLORS: { id: PersonalColor; label: string; short: string }[] = [
  { id: "spring", label: "봄 웜", short: "봄 웜" },
  { id: "summer", label: "여름 쿨", short: "여름 쿨" },
  { id: "autumn", label: "가을 웜", short: "가을 웜" },
  { id: "winter", label: "겨울 쿨", short: "겨울 쿨" },
  { id: "unknown", label: "아직 잘 모르겠어요", short: "아직 모름" },
];

export const CONCERNS = [
  { id: "advice", title: "코디 조언", desc: "상황에 맞게, 가진 옷부터 활용해요." },
  { id: "fit", title: "사이즈·핏 고민", desc: "잘 맞는 옷과 실측을 비교해 봐요." },
  { id: "style", title: "스타일 찾기", desc: "유행보다 나에게 어울리는 방향을 찾아요." },
  { id: "etc", title: "기타", desc: "어떤 고민이든 편하게 이야기해요." },
];

/**
 * 나의 옷장 '+ 사진 첨부하기'를 누르면 뜨는 앱 안 '사진 보관함'의 예시 사진 (성별마다 따로).
 * 사진을 누르면 배경을 지워(누끼) 아래 이름·종류로 옷장에 바로 들어가요.
 * 사진 파일: public/demo-photos/ · 더하려면 같은 형식으로 한 줄 넣으면 돼요.
 */
export const SAMPLE_PHOTOS: Record<
  Gender,
  { id: string; name: string; category: Category; src: string; demo?: string; measures?: Measures; size?: string; link?: string }[]
> = {
  // 여성: 채팅에서 '캐주얼 · 정핏' 코디를 물으면 옷장에 넣은 이 두 벌을 추천해요 (CLOSET_PICKS)
  female: [
    {
      id: "women-cardigan",
      name: "미세키서울 언밸런스 니트 가디건 화이트",
      category: "outer",
      src: "/demo-photos/women-cardigan.jpg",
      size: "OS",
      link: "https://misekiseoul.kr/product/unbalanced-knit-cardigan-white/246/category/29/display/1/",
      // 상품 페이지 (단면, 원사이즈): Length 53 · Shoulder 33 · Chest 44 · Hem 36 · Arm 66
      measures: { length: "53", shoulder: "33", chest: "88", waist: "72", sleeve: "66" },
    },
    {
      id: "women-denim",
      name: "던스트 70S 세미 플레어 진 미드 블루",
      category: "bottom",
      src: "/demo-photos/women-denim.jpg",
      size: "S",
      link: "https://dunststudio.com/product/detail.html?product_no=7440&cate_no=466&display_group=1",
      // 상품 페이지 S (단면): 총장104 허리34.5 힙45.5 허벅지28 밑단23.5 밑위28.5
      measures: { length: "104", waist: "69", hip: "91", thigh: "56", hem: "47", rise: "28.5" },
    },
  ],
  male: [
    { id: "men-knit", name: "네이비 UCLA 니트", category: "top", src: "/demo-photos/men-knit.jpg", demo: "m-knit" },
    { id: "men-denim", name: "블랙 벌룬 데님", category: "bottom", src: "/demo-photos/men-denim.jpg", demo: "m-bdenim" },
    {
      id: "men-jacket",
      name: "블랙 바시티 재킷",
      category: "outer",
      src: "/demo-photos/men-jacket.jpg",
      // 총기장 67 · 어깨 56 · 팔길이 64 (가슴은 사진으로 추정)
      measures: { length: "67", shoulder: "56", sleeve: "64", chest: "128", waist: "120" },
    },
  ],
};

/**
 * 미리 세팅해 둔 판매처 링크 (나의 옷장 → 판매처 링크 입력).
 * 링크에 match 의 글자가 들어 있으면, 아래 옷 사진(배경을 지워서)·이름·종류와
 * 구매 사이즈의 실측(cm, 둘레 기준)이 자동으로 들어와요. 사이즈가 목록에 없으면 가장 가까운 걸 써요.
 *
 * 실제 상품 링크로 바꾸는 법: match 에 상품 주소의 고유한 부분(예: "musinsa.com/products/1234567")을 넣고,
 * image 는 public/ 아래 사진 경로, sizes 는 판매처 실측표 값을 넣으면 돼요.
 * 지금 들어 있는 example.com 주소는 시연·테스트용이에요 (실제 상품 페이지가 아니에요).
 */
export interface LinkPreset {
  match: string[];
  name: string;
  category: Category;
  image: string;
  sizes: Record<string, Measures>;
}

export const LINK_PRESETS: LinkPreset[] = [
  {
    match: ["example.com/showme/women-cardigan"],
    name: "아이보리 가디건",
    category: "outer",
    image: "/demo-photos/women-cardigan.jpg",
    sizes: {
      S: { length: "48", chest: "90", sleeve: "56", shoulder: "36", waist: "84" },
      M: { length: "50", chest: "94", sleeve: "57", shoulder: "38", waist: "88" },
      L: { length: "52", chest: "98", sleeve: "58", shoulder: "40", waist: "92" },
    },
  },
  {
    match: ["example.com/showme/women-denim"],
    name: "블루 스트레이트 데님",
    category: "bottom",
    image: "/demo-photos/women-denim.jpg",
    sizes: {
      S: { waist: "66", hip: "90", thigh: "52", rise: "27", length: "95" },
      M: { waist: "70", hip: "94", thigh: "54", rise: "28", length: "96" },
      L: { waist: "74", hip: "98", thigh: "56", rise: "29", length: "97" },
    },
  },
  {
    match: ["example.com/showme/men-knit"],
    name: "네이비 UCLA 니트",
    category: "top",
    image: "/demo-photos/men-knit.jpg",
    sizes: {
      M: { length: "66", chest: "112", sleeve: "59", shoulder: "50", waist: "104" },
      L: { length: "68", chest: "116", sleeve: "60", shoulder: "52", waist: "108" },
      XL: { length: "70", chest: "120", sleeve: "61", shoulder: "54", waist: "112" },
    },
  },
  {
    match: ["example.com/showme/men-denim"],
    name: "블랙 벌룬 데님",
    category: "bottom",
    image: "/demo-photos/men-denim.jpg",
    sizes: {
      M: { waist: "78", hip: "108", thigh: "70", rise: "31", length: "101" },
      L: { waist: "82", hip: "112", thigh: "72", rise: "32", length: "102" },
      XL: { waist: "86", hip: "116", thigh: "74", rise: "33", length: "103" },
    },
  },
];

/** 채팅에서 옷장 옷을 추천하는 시연용 규칙: 성별·질문에 맞으면 옷장에 넣은 이 예시 사진 옷들을 추천해요 */
export const CLOSET_PICKS: { gender: Gender; match: RegExp; samples: string[]; label: string }[] = [
  { gender: "female", match: /캐주얼|정핏|정사이즈|데일리/, samples: ["women-denim", "women-cardigan"], label: "여성 캐주얼 · 정핏 코디" },
];

export function closetPicksFor(gender: Gender | undefined, text: string) {
  return CLOSET_PICKS.find((r) => r.gender === gender && r.match.test(text)) ?? null;
}

/** 온보딩 '좋아하는 스타일'(4번째 화면)에 보이는 사진 수. 취향 찾기 사진(아래 TASTE_PHOTOS)에서 성별별로 랜덤으로 골라요. */
export const STYLE_PICK_COUNT = 12;

/**
 * 취향 찾기 사진 목록 (성별마다 따로). 처음엔 랜덤 9장, 저장하면 아직 안 본 나머지 9장이 나와요.
 * 다 보면 다시 섞어서 처음부터 보여 줘요.
 *
 * 사진을 바꾸거나 더하는 법
 * 1) 사진 파일을 public/images/taste/female/ (여성) 또는 male/ (남성) 폴더에 넣어요. 세로 전신 사진이 잘 맞아요.
 * 2) 아래 목록에 { file: "파일이름.jpg", tag: "스타일" } 한 줄씩 넣어요.
 * - tag: '나의 추구미'(많이 고른 스타일 순위) 계산에 써요.
 * - 9의 배수(18장 등)로 맞추면 9장씩 딱 나뉘어요.
 */
const TASTE_LIST: Record<Gender, { file: string; tag: string }[]> = {
  female: [
    { file: "f-mori-1.jpg", tag: "모리걸" },
    { file: "f-mori-2.jpg", tag: "모리걸" },
    { file: "f-mori-3.jpg", tag: "모리걸" },
    { file: "f-mori-4.jpg", tag: "모리걸" },
    { file: "f-minimal-1.jpg", tag: "미니멀" },
    { file: "f-minimal-2.jpg", tag: "미니멀" },
    { file: "f-minimal-3.jpg", tag: "미니멀" },
    { file: "f-bizcasual-1.jpg", tag: "비즈니스 캐주얼" },
    { file: "f-bizcasual-2.jpg", tag: "비즈니스 캐주얼" },
    { file: "f-bizcasual-3.jpg", tag: "비즈니스 캐주얼" },
    { file: "f-street-1.jpg", tag: "스트릿" },
    { file: "f-street-2.jpg", tag: "스트릿" },
    { file: "f-street-3.jpg", tag: "스트릿" },
    { file: "f-street-4.jpg", tag: "스트릿" },
    { file: "f-casual-1.jpg", tag: "캐주얼" },
    { file: "f-casual-2.jpg", tag: "캐주얼" },
    { file: "f-casual-3.jpg", tag: "캐주얼" },
    { file: "f-casual-4.jpg", tag: "캐주얼" },
  ],
  male: [
    { file: "m-rockchic-1.jpg", tag: "락시크" },
    { file: "m-rockchic-2.jpg", tag: "락시크" },
    { file: "m-rockchic-3.jpg", tag: "락시크" },
    { file: "m-amekaji-1.jpg", tag: "아메카지" },
    { file: "m-amekaji-2.jpg", tag: "아메카지" },
    { file: "m-amekaji-3.jpg", tag: "아메카지" },
    { file: "m-casual-1.jpg", tag: "캐주얼" },
    { file: "m-casual-2.jpg", tag: "캐주얼" },
    { file: "m-casual-3.jpg", tag: "캐주얼" },
    { file: "m-street-1.jpg", tag: "스트릿" },
    { file: "m-street-2.jpg", tag: "스트릿" },
    { file: "m-street-3.jpg", tag: "스트릿" },
    { file: "m-bizcasual-1.jpg", tag: "비즈니스 캐주얼" },
    { file: "m-bizcasual-2.jpg", tag: "비즈니스 캐주얼" },
    { file: "m-bizcasual-3.jpg", tag: "비즈니스 캐주얼" },
    { file: "m-minimal-1.jpg", tag: "미니멀" },
    { file: "m-minimal-2.jpg", tag: "미니멀" },
    { file: "m-minimal-3.jpg", tag: "미니멀" },
  ],
};

export interface TastePhoto {
  /** 사진 이름 (예: "female/f-mori-1") — 저장한 선택은 이 이름으로 기억해요 */
  id: string;
  tag: string;
  src: string;
}

export const TASTE_PHOTOS: Record<Gender, TastePhoto[]> = {
  female: TASTE_LIST.female.map((p) => ({ id: `female/${p.file.replace(/\.\w+$/, "")}`, tag: p.tag, src: `/images/taste/female/${p.file}` })),
  male: TASTE_LIST.male.map((p) => ({ id: `male/${p.file.replace(/\.\w+$/, "")}`, tag: p.tag, src: `/images/taste/male/${p.file}` })),
};

/** 이름으로 사진 찾기 (성별 상관없이) */
export const tastePhoto = (id: string) => TASTE_PHOTOS.female.find((p) => p.id === id) ?? TASTE_PHOTOS.male.find((p) => p.id === id);

/** 한 화면에 보이는 사진 수 */
export const TASTE_SET_SIZE = 9;

/**
 * 처음부터 옷장에 들어 있는 옷 (예시 데이터). 의상 데이터를 추가할 때는 아래 형식대로 한 벌씩 넣으세요.
 * - category: "top"(상의) · "outer"(아우터, 상의 탭에 보여요) · "bottom"(하의) · "bag"(가방·신발 등 ACC 탭)
 * - image: public/images/closet/ 에 사진을 넣고 "/images/closet/파일이름.jpg"
 * - favorite: true 면 즐겨찾기(각 탭 맨 위), measures: 실측(cm). 비워 두면 '실측 필요'로 보여요.
 * 사용자가 앱에서 직접 등록하는 옷은 이 목록이 아니라 브라우저에 저장돼요.
 */
/** 예전 버전의 여성 예시 옷 (셔츠·가디건·슬랙스·토트백) — 저장된 옷장에서 한 번 지워요 */
export const RETIRED_SEED_IDS = ["shirt", "cardigan", "slacks", "tote", "demo-f-uniqlo-rib"];

export const CLOSET_SEED: ClosetItem[] = [
  // ── 여성 옷장 (판매처 상품 페이지의 사진·실측, 단면은 × 2로 둘레 환산) ──
  {
    id: "demo-f-oafish-tee",
    name: "오피쉬 베이직 시스루 롱슬리브 베이지",
    category: "top",
    source: "link",
    link: "https://oafish.kr/product/detail.html?product_no=280",
    image: "/images/closet/women/oafish-seethrough-longsleeve.jpg",
    gender: "female",
    favorite: true,
    confirmed: true,
    size: "FREE",
    // FREE: 총장 56 · 어깨 36.5 · 가슴단면 38.5 · 소매 56 · 밑단단면 38.5
    measures: { length: "56", shoulder: "36.5", chest: "77", sleeve: "56", waist: "77" },
  },
  {
    id: "demo-f-musinsa-corduroy",
    name: "브라운 코듀로이 부츠컷 팬츠",
    category: "bottom",
    source: "link",
    link: "https://www.musinsa.com/products/2568782",
    image: "/images/closet/women/musinsa-corduroy-bootcut.jpg",
    gender: "female",
    favorite: false,
    confirmed: false,
    // 실측은 일부러 비워 둬요 (시연에서 직접 입력)
    measures: {},
  },
  // 채팅 첫 화면 '데이트 룩 예시'에 나오는 옷 3벌 (app/(tabs)/chat/page.tsx EXAMPLE.female)
  {
    id: "demo-f-dunst-blouson",
    name: "던스트 해링턴 울 블루종 브라운",
    category: "outer",
    source: "link",
    link: "https://dunststudio.com/product/detail.html?product_no=9857&cate_no=759&display_group=1",
    image: "/images/closet/women/dunst-harrington-blouson.jpg",
    gender: "male", // 남성 옷 (id 는 예전 이름 그대로 — 저장된 옷장도 다음 접속 때 남성 옷장으로 옮겨져요)
    favorite: false,
    confirmed: true,
    size: "S",
    // S: 총장 62 · 화장 81.5 · 가슴 58.5 · 밑단 43.5 · 암홀 24.5 · 팔통 24.5 (래글런이라 어깨너비 없음)
    measures: { length: "62", chest: "117", waist: "87" },
  },
  {
    id: "demo-f-generalidea-denim",
    name: "제너럴아이디어 와이드 워싱 데님 블루",
    category: "bottom",
    source: "link",
    link: "https://m.generalidea.co.kr/product/detail.html?product_no=5876&cate_no=382&display_group=1",
    image: "/images/closet/women/generalidea-wide-denim.jpg",
    gender: "female",
    favorite: true,
    confirmed: true,
    size: "S",
    // S: 허리 33 · 힙 47 · 허벅지 32 · 밑단 23 · 밑위 34 · 총장 105
    measures: { waist: "66", hip: "94", thigh: "64", rise: "34", length: "105", hem: "46" },
  },
  {
    id: "demo-f-haharchive-bag",
    name: "하하아카이브 컨투어 숄더백 블랙",
    category: "bag",
    source: "link",
    link: "https://haharchive.com/product/detail.html?product_no=185&cate_no=26&display_group=1",
    image: "/images/closet/women/haharchive-contour-bag.jpg",
    gender: "female",
    favorite: false,
    confirmed: true,
    size: "FREE",
    // Width 44 · Height 32 · Depth 16
    measures: { width: "44", height: "32", depth: "16" },
  },
  // ── 남성 시연 세트 (lib/demoGarments.ts) ──
  ...(["m-hoodie", "m-tee", "m-pants"] as const).map((id) => {
    const g = DEMO_GARMENTS[id];
    return {
      id: `demo-${id}`,
      name: g.name,
      category: g.category,
      source: "photo" as const,
      image: g.photo,
      cutout: true,
      demo: id,
      gender: g.gender,
      favorite: false,
      confirmed: true,
      measures: g.measures,
    };
  }),
  // 남성 옷장 사진만 (실측은 직접 입력)
  ...(
    [
      { id: "demo-m-sweatpants", name: "그레이 스웨트 팬츠", category: "bottom", image: "/demo-garments/m-sweatpants-photo.webp" },
      { id: "demo-m-cardigan", name: "브라운 집업 니트 가디건", category: "outer", image: "/demo-garments/m-cardigan-photo.webp" },
    ] as const
  ).map((c) => ({
    ...c,
    source: "photo" as const,
    cutout: true,
    gender: "male" as const,
    favorite: false,
    confirmed: false,
    measures: {},
  })),
];

/**
 * 예시 옷 사진의 배경을 미리 지운(누끼) 사진. 2D 입어보기에서 써요.
 * (아이보리 셔츠처럼 배경과 색이 비슷한 옷은 앱에서 바로 누끼를 따기 어려워 미리 만들어 뒀어요)
 */
export const PRECUT_IMAGES: Record<string, string> = {
  "/images/closet/shirt.jpg": "/images/closet/shirt-cut.png",
  "/images/closet/cardigan.jpg": "/images/closet/cardigan-cut.png",
  "/images/closet/slacks.jpg": "/images/closet/slacks-cut.png",
  "/images/closet/tote.jpg": "/images/closet/tote-cut.png",
};

export const BODY_FIELDS = [
  { key: "arm", label: "팔 길이" },
  { key: "shoulder", label: "어깨 너비" },
  { key: "chest", label: "가슴 둘레" },
  { key: "waist", label: "허리 둘레" },
  { key: "hip", label: "엉덩이 둘레" },
  { key: "inseam", label: "인심" },
];

export const BODY_SEED: Measures = {
  arm: "54",
  shoulder: "37",
  chest: "84",
  waist: "62",
  hip: "86",
  inseam: "75",
};

/** 장바구니에 담을 수 있는 예시 상품 정보 (채팅의 상품 상세 → '장바구니 담기'). 처음 장바구니는 비어 있어요. */
export const CART_SEED: CartItem[] = [
  { id: "shirt", name: "아이보리 셔츠", option: "아이보리 / M", price: 39000, image: "/images/closet/shirt.jpg", qty: 1, checked: true },
  { id: "cardigan", name: "네이비 가디건", option: "네이비 / M", price: 49000, image: "/images/closet/cardigan.jpg", qty: 1, checked: true },
  { id: "slacks", name: "블랙 슬랙스", option: "블랙 / M", price: 59000, image: "/images/closet/slacks.jpg", qty: 1, checked: true },
];

export const BRANDS: Brand[] = [
  { id: "matin", name: "마뗑킴", en: "MATIN KIM", type: "패션" },
  { id: "mardi", name: "마르디 메크르디", en: "MARDI MERCREDI", type: "패션" },
  { id: "ader", name: "아더에러", en: "ADER ERROR", type: "패션" },
  { id: "gentle", name: "젠틀몬스터", en: "GENTLE MONSTER", type: "아이웨어" },
  { id: "tamburins", name: "탬버린즈", en: "TAMBURINS", type: "뷰티" },
  { id: "nonfiction", name: "논픽션", en: "NONFICTION", type: "라이프스타일" },
  { id: "a", name: "무신사 스탠다드", en: "MUSINSA STANDARD", type: "패션" },
  { id: "b", name: "자라", en: "ZARA", type: "패션" },
];

// 모두 예시 일정입니다 (날짜·할인율은 시연용). 실제 서비스 전에 브랜드와 확인한 데이터로 바꿔주세요.
export const SALE_EVENTS: SaleEvent[] = [
  { id: "matin", brand: "마뗑킴", brandId: "matin", title: "멤버스 세일", start: "2026-11-10", end: "2026-11-14", place: "공식 온라인 스토어", listPlace: "온라인", desc: "가방과 겨울 컬렉션 최대 20% 할인", discount: "최대 20%" },
  { id: "a", brand: "무신사 스탠다드", brandId: "a", title: "시즌 세일", start: "2026-11-16", end: "2026-11-22", place: "공식 온라인 스토어", listPlace: "온라인", desc: "겨울 아우터와 니트 최대 40% 할인", discount: "최대 40%" },
  { id: "b", brand: "자라", brandId: "b", title: "블랙프라이데이 세일", start: "2026-11-26", end: "2026-11-30", place: "공식 온라인 스토어 · 매장", listPlace: "온라인 · 매장", desc: "아우터·니트 등 일부 상품 할인", discount: "일부 상품" },
  { id: "mardi", brand: "마르디 메크르디", brandId: "mardi", title: "블랙프라이데이", start: "2026-11-27", end: "2026-11-30", place: "공식 온라인 스토어", listPlace: "온라인", desc: "플라워 컬렉션 및 스웨트 최대 35% 할인", discount: "최대 35%" },
];

export const MY_PAGE_SECTIONS = [
  {
    title: "나의 쇼핑",
    rows: [
      { label: "장바구니", href: "/cart" },
      { label: "주문 내역" },
      { label: "취소/반품/교환 내역" },
      { label: "최근 본 상품" },
      { label: "비공개 리뷰 작성", desc: "공개하지 않고 나만의 쇼핑 경험을 기록해요.", accent: true },
      { label: "배송지 관리" },
    ],
  },
  {
    title: "고객 지원",
    rows: [{ label: "고객 센터" }, { label: "1:1 문의" }, { label: "상품 문의" }, { label: "공지사항" }],
  },
  {
    title: "설정 및 관리",
    rows: [{ label: "알림 설정" }, { label: "계정·개인정보 관리" }],
  },
];
