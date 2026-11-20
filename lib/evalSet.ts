// AI 가상 사용자 평가에 쓰는 가상 사용자(페르소나)와 질문입니다. (실제 사람이 아니에요)
// 같은 질문을 (A) 사용자 정보 없이 질문만 받은 일반 AI 챗봇, (B) Show Me(내 정보·옷장 실측·상품 실측을 아는 AI)에
// 보내고, 그 가상 사용자 입장의 AI 평가자가 두 답을 블라인드로 채점해요. 서버: app/api/eval/route.ts · 화면: app/eval/page.tsx

import type { ChatContext } from "./chat";

export interface EvalPersona {
  id: string;
  /** 평가 화면에 보이는 한 줄 소개 */
  label: string;
  /** 평가자 AI가 연기할 사용자 설명 (성격·고민·쇼핑 습관) */
  story: string;
  /** Show Me 앱에 저장돼 있다고 가정한 정보 (앱이 AI에게 넘기는 것과 같은 형태) */
  context: ChatContext;
  questions: string[];
}

const female = (age: string, height: string, weight: string) => ({ nickname: "", age, gender: "female" as const, height, weight, personalColor: "unknown" as const });
const male = (age: string, height: string, weight: string) => ({ nickname: "", age, gender: "male" as const, height, weight, personalColor: "unknown" as const });

export const EVAL_PERSONAS: EvalPersona[] = [
  {
    id: "f-newjob",
    label: "24세 여성 · 사회초년생 · 163cm 46kg",
    story:
      "다음 주에 첫 출근하는 사회초년생. 마른 편이라 기성복이 자주 크고, 온라인으로 산 바지 허리가 남아서 반품한 적이 많다. 단정하지만 너무 격식 차린 옷은 싫다. 예산이 넉넉하지 않아서 실패 없이 사고 싶다.",
    context: {
      profile: female("24", "163", "46"),
      personalColor: "가을 웜",
      concerns: ["코디 조언", "사이즈·핏 고민"],
      concernNote: "바지 허리가 항상 남아요",
      taste: "미니멀 · 오피스",
      body: { shoulder: "36", chest: "80", waist: "62", hip: "86", inseam: "75" },
      closet: [
        { name: "던스트 70S 세미 플레어 진 미드 블루", category: "bottom", favorite: true, size: "S", measures: { length: "104", waist: "69", hip: "91", thigh: "56", hem: "47", rise: "28.5" } },
        { name: "오아피시 베이직 시스루 롱슬리브 베이지", category: "top", favorite: false, size: "FREE", measures: { length: "56", shoulder: "36.5", chest: "77", sleeve: "56" } },
      ],
    },
    questions: [
      "나 다음 주가 첫 출근인데 어떤 옷을 사야 할까?",
      "던스트 세미 부츠컷 슬랙스 사려는데 나한테 어떤 사이즈가 맞을까?",
      "출근 첫날 옷장에 있는 옷으로 입고 가려면 뭐랑 뭐를 입을까?",
    ],
  },
  {
    id: "f-student",
    label: "22세 여성 · 대학생 · 158cm 50kg",
    story:
      "캐주얼을 좋아하는 대학생. 키가 작아서 바지 기장이 늘 길고, 오버핏을 입으면 옷에 묻혀 보일까 걱정한다. 새 옷보다 가진 옷을 잘 활용하고 싶다.",
    context: {
      profile: female("22", "158", "50"),
      personalColor: "아직 모름",
      concerns: ["코디 조언", "스타일 찾기"],
      concernNote: "키가 작아서 기장이 고민이에요",
      taste: "캐주얼 · 모리걸",
      body: { shoulder: "37", chest: "84", waist: "66", hip: "90", inseam: "70" },
      closet: [
        { name: "제너럴아이디어 와이드 워싱 데님 블루", category: "bottom", favorite: true, size: "S", measures: { waist: "66", hip: "94", thigh: "64", rise: "34", length: "105", hem: "46" } },
        { name: "미세키서울 언밸런스 니트 가디건 화이트", category: "outer", favorite: false, size: "FREE", measures: { length: "52", chest: "104", sleeve: "58" } },
        { name: "오아피시 베이직 시스루 롱슬리브 베이지", category: "top", favorite: false, size: "FREE", measures: { length: "56", shoulder: "36.5", chest: "77", sleeve: "56" } },
      ],
    },
    questions: [
      "캐주얼하게 입을 옷 추천해줘",
      "와이드 데님이 길어서 끌리는데 이거 어떻게 입으면 좋을까?",
      "내일 친구랑 전시회 가는데 옷장에 있는 걸로 코디해줘",
    ],
  },
  {
    id: "f-office",
    label: "29세 여성 · 직장인 · 168cm 58kg",
    story:
      "5년 차 직장인. 어깨가 넓은 편이라 어깨선이 딱 맞는 재킷을 입으면 답답해 보인다. 퍼스널 컬러 진단을 받아서 색은 신경 쓴다. 출근복을 효율적으로 돌려 입고 싶다.",
    context: {
      profile: female("29", "168", "58"),
      personalColor: "여름 쿨",
      concerns: ["사이즈·핏 고민", "스타일 찾기"],
      concernNote: "어깨가 넓어 보여요",
      taste: "미니멀 · 오피스",
      body: { shoulder: "40", chest: "88", waist: "68", hip: "94", inseam: "79" },
      closet: [
        { name: "블랙 와이드 슬랙스", category: "bottom", favorite: true, size: "M", measures: { length: "102", waist: "70", hip: "98", thigh: "60", rise: "29" } },
        { name: "화이트 옥스퍼드 셔츠", category: "top", favorite: true, size: "M", measures: { length: "70", shoulder: "42", chest: "104", sleeve: "58" } },
      ],
    },
    questions: [
      "어깨가 넓어 보이지 않는 출근용 니트 추천해줘",
      "다음 주에 중요한 미팅이 있는데 옷장 옷에 뭘 하나 더 사면 좋을까?",
      "날씨가 추워졌는데 출근할 때 따뜻하게 입을 아우터 추천해줘",
    ],
  },
  {
    id: "m-student",
    label: "21세 남성 · 대학생 · 177cm 58kg",
    story:
      "마른 체형의 대학생. 스트릿·오버핏을 좋아하는데, 너무 크게 사서 옷이 흘러내리거나 너무 작게 사서 꽉 끼는 실패를 반복했다. 오늘 데이트가 있다.",
    context: {
      profile: male("21", "177", "58"),
      personalColor: "아직 모름",
      concerns: ["코디 조언", "사이즈·핏 고민"],
      concernNote: "",
      taste: "스트릿 · 캐주얼",
      body: { shoulder: "43", chest: "88", waist: "70", hip: "90", inseam: "81" },
      closet: [
        { name: "던스트 스트라이프 니트", category: "top", favorite: false, size: "L", measures: { length: "65", shoulder: "56", chest: "122", hem: "98", armhole: "25.5", sleeve: "58.5" } },
        { name: "던스트 카키 팬츠", category: "bottom", favorite: true, size: "L", measures: { length: "110", waist: "86", hip: "111.4", thigh: "80", hem: "57", rise: "32.5" } },
        { name: "던스트 해링턴 울 블루종 브라운", category: "outer", favorite: false, size: "L", measures: { length: "66", raglan: "88", chest: "130", hem: "98", armhole: "26", armWidth: "27.5" } },
        { name: "블랙 그래픽 롱슬리브", category: "top", favorite: true, size: "L", measures: { length: "76", shoulder: "59", chest: "116", sleeve: "58" } },
        { name: "핑크 워싱 데님", category: "bottom", favorite: false, size: "L", measures: { length: "104", waist: "76", hip: "112", thigh: "66", rise: "32" } },
      ],
    },
    questions: [
      "오늘 데이트가 있어. 오늘 날씨에 맞게 입을 옷을 내 옷장에서 추천해 줘.",
      "오버핏 니트 하나 사고 싶은데 사이즈 뭐로 사야 돼?",
      "핑크 데님이랑 어울리는 상의가 내 옷장에 있을까?",
    ],
  },
  {
    id: "m-office",
    label: "27세 남성 · 직장인 · 174cm 72kg",
    story:
      "회사원. 배가 조금 나와서 붙는 니트는 피하고 싶다. 깔끔한 미니멀 스타일을 좋아하고, 쇼핑에 시간을 많이 쓰기 싫어서 딱 맞는 걸 빠르게 고르고 싶다.",
    context: {
      profile: male("27", "174", "72"),
      personalColor: "겨울 쿨",
      concerns: ["사이즈·핏 고민"],
      concernNote: "배가 나와 보이지 않았으면",
      taste: "미니멀",
      body: { shoulder: "45", chest: "98", waist: "84", hip: "98", inseam: "77" },
      closet: [
        { name: "네이비 코튼 치노 팬츠", category: "bottom", favorite: true, size: "M", measures: { length: "102", waist: "84", hip: "104", thigh: "64", rise: "29" } },
        { name: "그레이 맨투맨", category: "top", favorite: true, size: "L", measures: { length: "70", shoulder: "50", chest: "116", sleeve: "60" } },
      ],
    },
    questions: [
      "배가 덜 나와 보이는 니트 추천해줘",
      "던스트 와이드 치노 슬랙스 사려는데 사이즈 뭐가 맞아?",
      "회식 있는 날 옷장에 있는 옷으로 깔끔하게 입고 싶어",
    ],
  },
  {
    id: "m-big",
    label: "24세 남성 · 취준생 · 182cm 80kg",
    story:
      "키가 크고 덩치가 있는 취업준비생. 기장이 짧아서 바지가 껑충해 보이는 게 스트레스다. 아메카지 스타일을 좋아한다. 면접 끝나고 소개팅이 잡혀 있다.",
    context: {
      profile: male("24", "182", "80"),
      personalColor: "가을 웜",
      concerns: ["코디 조언", "사이즈·핏 고민"],
      concernNote: "바지 기장이 짧아요",
      taste: "아메카지 · 캐주얼",
      body: { shoulder: "48", chest: "104", waist: "84", hip: "102", inseam: "84" },
      closet: [
        { name: "브라운 집업 니트 가디건", category: "outer", favorite: true, size: "XL", measures: { length: "72", shoulder: "52", chest: "124", sleeve: "62" } },
        { name: "인디고 셀비지 데님", category: "bottom", favorite: true, size: "34", measures: { length: "106", waist: "88", hip: "108", thigh: "68", rise: "31" } },
      ],
    },
    questions: [
      "소개팅 가는데 뭐 입을까?",
      "바지가 늘 짧아 보이는데 내 체형에 맞는 바지 길이 기준이 있을까?",
      "니트 가디건 안에 받쳐 입을 옷 하나 사려는데 뭐가 좋아?",
    ],
  },
];

/** 평가 항목 (1~5점) */
export const EVAL_CRITERIA = [
  { key: "personal", label: "나에게 맞춤", desc: "내 체형·취향·옷장을 알고 답했는가" },
  { key: "fit", label: "사이즈·핏 근거", desc: "실측·치수 같은 근거로 사이즈와 핏을 말했는가" },
  { key: "actionable", label: "바로 실행 가능", desc: "지금 입거나 살 수 있게 구체적인가" },
  { key: "trust", label: "믿을 수 있음", desc: "지어낸 정보 없이 솔직한가" },
  { key: "satisfaction", label: "전체 만족도", desc: "이 사용자라면 얼마나 만족할까" },
] as const;

export type EvalCriterion = (typeof EVAL_CRITERIA)[number]["key"];
