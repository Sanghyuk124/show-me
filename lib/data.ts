// 앱에 들어가는 문구·예시 데이터를 모아둔 파일입니다.
// 상품, 브랜드, 세일 일정을 바꾸고 싶으면 이 파일만 수정하세요.

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

const pad = (n: number) => String(n).padStart(2, "0");

/** 온보딩 '좋아하는 스타일' 사진 (Figma 04 · 여성 / 04 · 남성). 마지막 사진은 두 화면이 같아요. */
export const STYLE_PHOTOS: Record<Gender, string[]> = {
  female: Array.from({ length: 12 }, (_, i) => `/images/style/style-${pad(i + 1)}.jpg`),
  male: [...Array.from({ length: 11 }, (_, i) => `/images/style/style-male-${pad(i + 1)}.jpg`), "/images/style/style-12.jpg"],
};

/** 취향 찾기 사진 (Figma 레이어 이름 기준). tag는 '나의 추구미' 계산에 쓰입니다. */
export const TASTE_PHOTOS = [
  { id: 1, tag: "미니멀" }, // 미니멀 여성 블레이저
  { id: 2, tag: "아메카지" }, // 아메카지 여성 레이어드
  { id: 3, tag: "캐주얼" }, // 캐주얼 남성 스트라이프
  { id: 4, tag: "스트릿" }, // 스트릿 남성 블랙
  { id: 5, tag: "미니멀" }, // 미니멀 여성 가디건
  { id: 6, tag: "아메카지" }, // 아메카지 남성 필드 재킷
  { id: 7, tag: "스트릿" }, // 스트릿 여성 와이드 데님
  { id: 8, tag: "캐주얼" }, // 캐주얼 여성 셔츠
  { id: 9, tag: "아메카지" }, // 아메카지 남성 데님
].map((p) => ({ ...p, src: `/images/taste/taste-${p.id}.jpg` }));

export const CLOSET_SEED: ClosetItem[] = [
  {
    id: "shirt",
    name: "아이보리 셔츠",
    category: "top",
    source: "photo",
    image: "/images/closet/shirt.jpg",
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
    favorite: false,
    confirmed: false,
    measures: {},
  },
];

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
