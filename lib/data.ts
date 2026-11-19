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
export const SAMPLE_PHOTOS: Record<Gender, { id: string; name: string; category: Category; src: string; demo?: string }[]> = {
  female: [
    { id: "women-cardigan", name: "아이보리 가디건", category: "outer", src: "/demo-photos/women-cardigan.jpg" },
    { id: "women-denim", name: "블루 스트레이트 데님", category: "bottom", src: "/demo-photos/women-denim.jpg" },
  ],
  male: [
    { id: "men-knit", name: "네이비 UCLA 니트", category: "top", src: "/demo-photos/men-knit.jpg", demo: "m-knit" },
    { id: "men-denim", name: "블랙 벌룬 데님", category: "bottom", src: "/demo-photos/men-denim.jpg" },
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
export const CLOSET_SEED: ClosetItem[] = [
  {
    id: "shirt",
    name: "아이보리 셔츠",
    category: "top",
    source: "photo",
    image: "/images/closet/shirt.jpg",
    gender: "female",
    favorite: true,
    confirmed: false,
    measures: {},
  },
  {
    id: "cardigan",
    name: "네이비 가디건",
    category: "outer",
    source: "link",
    image: "/images/closet/cardigan.jpg",
    gender: "female",
    favorite: false,
    confirmed: false,
    measures: {},
  },
  {
    id: "slacks",
    name: "블랙 슬랙스",
    category: "bottom",
    source: "link",
    image: "/images/closet/slacks.jpg",
    gender: "female",
    favorite: true,
    prefilled: true,
    confirmed: false,
    size: "M",
    measures: { waist: "72", hip: "96", thigh: "60", rise: "29", length: "99" },
  },
  {
    id: "tote",
    name: "블랙 토트백",
    category: "bag",
    source: "photo",
    image: "/images/closet/tote.jpg",
    gender: "female",
    favorite: false,
    confirmed: false,
    measures: {},
  },
  // ── 남성 시연 세트 (lib/demoGarments.ts) ──
  ...(["m-tee", "m-pants", "m-jacket"] as const).map((id) => {
    const g = DEMO_GARMENTS[id];
    return {
      id: `demo-${id}`,
      name: g.name,
      category: g.category,
      source: "photo" as const,
      image: g.image,
      cutout: true,
      demo: id,
      gender: g.gender,
      favorite: false,
      confirmed: true,
      measures: g.measures,
    };
  }),
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
  { id: "b", name: "브랜드 B", en: "BRAND B", type: "예시" },
];

// 모두 예시 일정입니다. 실제 서비스 전에 브랜드와 확인한 데이터로 바꿔주세요.
export const SALE_EVENTS: SaleEvent[] = [
  { id: "c1", brand: "브랜드 C", title: "얼리 윈터 세일", start: "2026-11-01", end: "2026-11-08", place: "온라인", listPlace: "온라인", desc: "겨울 신상품 최대 25% 할인", discount: "최대 25%" },
  { id: "matin", brand: "마뗑킴", brandId: "matin", title: "멤버스 세일", start: "2026-11-10", end: "2026-11-14", place: "공식 온라인 스토어", listPlace: "온라인", desc: "가방과 겨울 컬렉션 최대 20% 할인", discount: "최대 20%" },
  { id: "a", brand: "무신사 스탠다드", brandId: "a", title: "시즌 세일", start: "2026-11-16", end: "2026-11-22", place: "공식 온라인 스토어", listPlace: "온라인", desc: "겨울 아우터와 니트 최대 40% 할인", discount: "최대 40%" },
  { id: "b", brand: "브랜드 B", brandId: "b", title: "쇼룸 아카이브 세일", start: "2026-11-19", end: "2026-11-21", place: "오프라인 · 성수", listPlace: "오프라인 · 성수", desc: "아카이브 상품 최대 40% 할인", discount: "최대 40%" },
  { id: "d", brand: "브랜드 D", title: "팝업 스토어", start: "2026-11-24", end: "2026-11-26", place: "오프라인 · 한남", listPlace: "오프라인 · 한남", desc: "겨울 신상품을 먼저 만나보는 팝업" },
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
