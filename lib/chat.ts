// 쇼핑메이트의 답변을 만드는 곳입니다.
// - 서버에 Claude API 키(ANTHROPIC_API_KEY)가 있으면 app/api/chat/route.ts 를 통해 Claude가 답해요.
// - 키가 없으면 아래 cannedReply 의 '미리 써둔 예시 답변'으로 대신 답해요.

import type { AppState } from "./store";
import { guessCategory } from "./classify";
import { CONCERNS, PERSONAL_COLORS, TASTE_PHOTOS, type ClosetItem, type Measures, type Profile } from "./data";
import { PRODUCTS } from "./products";

export interface Reply {
  text: string;
  chips?: string[];
  /** 함께 보여줄 추천 상품 id (lib/products.ts) */
  products?: string[];
}

/** 서버로 보내는 대화 한 줄 */
export interface ChatTurn {
  role: "user" | "bot";
  text: string;
  /** 사용자가 첨부한 사진 (작게 줄인 JPEG data URL) */
  images?: string[];
}

/** 채팅 첫 화면의 예시 대화 아래 추천 답변 */
export const FIRST_CHIPS = ["자유로운 편이에요", "아직 잘 모르겠어요"];

/** 서버로 보내는 사용자 정보 (Claude가 맞춤 답변에 참고해요) */
export interface ChatContext {
  profile: Profile;
  personalColor: string;
  concerns: string[];
  concernNote: string;
  taste: string;
  body: Measures;
  closet: Pick<ClosetItem, "name" | "category" | "favorite" | "size" | "measures">[];
}

// 채팅 첫 화면의 예시 상담. 첫 메시지를 보내면 화면에서는 사라지지만,
// 예시 아래 추천 답변(FIRST_CHIPS)으로 대화를 시작했다면 Claude가 이어서 답하도록 함께 보내요.
const FIRST_EXCHANGE: ChatTurn[] = [
  { role: "user", text: "다음 주 첫 출근인데 뭘 입어야 할까?\n너무 격식 차린 느낌은 싫어." },
  {
    role: "bot",
    text:
      "첫 출근, 설레면서도 고민되죠. 우선 옷장에 있는 옷으로 시작해볼까요?\n" +
      "[단정하지만 편안하게] 아이보리 셔츠 + 블랙 슬랙스 + 네이비 가디건\n" +
      "셔츠는 첫인상을 단정하게 잡아주고, 가디건이 재킷보다 편안한 인상을 더해요. 비슷한 어두운 톤이 전체를 정돈해줘요.\n" +
      "가지고 있는 검정 토트백을 더하면 충분해요. 회사 복장 분위기는 어떤 편인가요?",
  },
];

function buildContext(app: AppState): ChatContext {
  const count = new Map<string, number>();
  TASTE_PHOTOS.filter((p) => app.tastePicks.includes(p.id)).forEach((p) => count.set(p.tag, (count.get(p.tag) ?? 0) + 1));
  const taste = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t).join(" · ");
  return {
    profile: app.profile,
    personalColor: PERSONAL_COLORS.find((c) => c.id === app.profile.personalColor)?.label ?? "아직 모름",
    concerns: app.concerns.map((id) => CONCERNS.find((c) => c.id === id)?.title ?? id),
    concernNote: app.concernNote,
    taste,
    body: app.body,
    closet: app.closet.map(({ name, category, favorite, size, measures }) => ({ name, category, favorite, size, measures })),
  };
}

/** 메시지를 보내면 답변을 돌려줍니다. Claude 연결이 안 되어 있으면 예시 답변을 써요. */
export async function getReply(message: string, images: string[], app: AppState): Promise<Reply> {
  const firstUserText = app.chat.find((m) => m.role === "user")?.text ?? message;
  const fromExample = FIRST_CHIPS.includes(firstUserText);
  const history: ChatTurn[] = [
    ...(fromExample ? FIRST_EXCHANGE : []),
    ...app.chat.map((m) => ({ role: m.role, text: m.text, images: m.images })),
    { role: "user", text: message, images },
  ];
  const fallback = () => (images.length ? attachmentReply() : cannedReply(message, app));
  try {
    const res = await fetch("/api/chat", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ history, context: buildContext(app) }),
    });
    if (res.status === 503) return fallback(); // API 키가 아직 없어요
    if (res.status === 429) return { text: "지금 질문이 많아서 잠시 후에 다시 답해 드릴게요." };
    if (!res.ok) return { text: "답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요." };
    const data: { text?: string; products?: string[] } = await res.json();
    return { text: data.text ?? "답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.", products: data.products ?? [] };
  } catch {
    // 서버에 연결할 수 없을 때(오프라인 등)도 예시 답변으로 대신해요.
    return fallback();
  }
}

/** API 키가 없을 때 첨부 사진에 대한 안내 */
async function attachmentReply(): Promise<Reply> {
  await new Promise((r) => setTimeout(r, 700));
  return {
    text: "사진을 잘 받았어요. 지금은 AI가 연결되지 않아 사진 속 옷을 볼 수 없어요.\n어떤 옷인지 글로 알려주시면 옷장에 있는 옷과 함께 코디를 골라볼게요.",
    chips: ["다른 코디도 볼래요", "사이즈가 고민돼요"],
  };
}

/** API 키가 없을 때 쓰는 미리 써둔 예시 답변 (보낸 글의 단어를 보고 골라요) */
async function cannedReply(message: string, app: AppState): Promise<Reply> {
  await new Promise((r) => setTimeout(r, 700));
  const text = message.trim();

  // 상품 추천을 물으면 상품 목록에서 종류가 맞는 것을 골라 보여줘요.
  if (/추천|상품|브랜드|살까|사고 싶|구매|쇼핑/.test(text) && PRODUCTS.length) {
    const category = guessCategory(text);
    const matched = PRODUCTS.filter((p) => !category || p.category === category || (category === "top" && p.category === "outer"));
    const picks = (matched.length ? matched : PRODUCTS).slice(0, 2);
    return {
      text: "상품 목록에서 지금 옷장과 잘 어울릴 만한 것을 골라봤어요.\n즐겨찾는 기준 옷의 실측을 입력해 두면 맞는 사이즈도 함께 알려드릴게요.",
      products: picks.map((p) => p.id),
      chips: ["사이즈가 고민돼요", "다른 코디도 볼래요"],
    };
  }
  const bottom = app.closet.find((i) => i.category === "bottom" && i.favorite);

  if (/https?:\/\/|www\.|\.com|\.kr/i.test(text)) {
    return {
      text: "링크 고마워요. 옷장의 '판매처 링크 입력'에 구매 사이즈와 함께 저장해두면, 가진 옷의 실측과 비교해볼 수 있어요.",
      chips: ["사이즈가 고민돼요", "다른 코디도 볼래요"],
    };
  }
  if (text.includes("자유로운")) {
    return {
      text: "그럼 셔츠 단추를 하나 풀고 가디건을 걸쳐보세요.\n첫날은 단정하게, 분위기를 본 뒤 다음 날부터 조금씩 힘을 빼도 좋아요.",
      chips: ["신발은 뭐가 좋을까요?", "다른 코디도 볼래요"],
    };
  }
  if (text.includes("모르겠")) {
    return {
      text: "괜찮아요. 모를 때는 셔츠와 슬랙스처럼 어디서나 무난한 조합이 가장 안전해요.\n가디건은 실내외 온도에 맞춰 입고 벗기 좋고요.",
      chips: ["신발은 뭐가 좋을까요?", "사이즈가 고민돼요"],
    };
  }
  if (/사이즈|핏|실측|길이/.test(text)) {
    return {
      text: bottom?.confirmed
        ? `${bottom.name} 실측이 저장되어 있어요. 새 옷을 볼 때 허리 둘레와 총 기장부터 비교해보세요.`
        : "옷장에서 즐겨찾는 상의와 하의의 실측을 입력하면, 나에게 맞는 기준을 함께 만들 수 있어요.",
      chips: ["다른 코디도 볼래요"],
    };
  }
  if (text.includes("신발")) {
    return {
      text: "검정 로퍼나 깔끔한 더비 슈즈가 잘 어울려요. 없다면 장식이 적은 흰 스니커즈도 충분해요.",
      chips: ["다른 코디도 볼래요"],
    };
  }
  if (text.includes("다른 코디")) {
    return {
      text: "네이비 가디건을 메인으로, 안에 아이보리 셔츠를 받쳐 입어보세요. 블랙 토트백을 더하면 전체 톤이 정돈돼요.",
      chips: ["신발은 뭐가 좋을까요?", "사이즈가 고민돼요"],
    };
  }
  return {
    text: "좋아요. 어떤 자리인지와 원하는 분위기를 조금 더 알려주시면, 옷장에 있는 옷부터 함께 골라볼게요.",
    chips: ["다른 코디도 볼래요", "사이즈가 고민돼요"],
  };
}
