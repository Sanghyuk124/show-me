// 쇼핑메이트의 답변을 만드는 곳입니다.
// - 서버에 Claude API 키(ANTHROPIC_API_KEY)가 있으면 app/api/chat/route.ts 를 통해 Claude가 답해요.
// - 키가 없으면 아래 cannedReply 의 '미리 써둔 예시 답변'으로 대신 답해요.

import { allTastePicks, myCloset, type AppState } from "./store";
import { guessCategory } from "./classify";
import { closetPicksFor, CONCERNS, PERSONAL_COLORS, tastePhoto, type ClosetItem, type Measures, type Profile } from "./data";
import { DATE_LOOK_MALE, FIRST_WORK_FEMALE, isFirstWork, PRODUCTS } from "./products";

export interface Reply {
  text: string;
  chips?: string[];
  /** 함께 보여줄 추천 상품 id (lib/products.ts) */
  products?: string[];
  /** 옷장에서 골라 준 옷 (사진 보관함 예시 사진 id) */
  closet?: string[];
  /** 옷장에 넣어 줄 추천 상품 id (아바타에서 입어 보기) */
  tryOn?: string[];
}

/** 서버로 보내는 대화 한 줄 */
export interface ChatTurn {
  role: "user" | "bot";
  text: string;
  /** 사용자가 첨부한 사진 (작게 줄인 JPEG data URL) */
  images?: string[];
}

/** 채팅 첫 화면의 예시 대화 아래 추천 답변 */
export const FIRST_CHIPS = ["카페나 전시회에 가요", "아직 장소를 안 정했어요"];

/** 채팅 첫 화면의 추천 질문 칩 (성별마다). 미리 세팅해 둔 추천 답변으로 이어져요 */
export const START_CHIPS: Record<Profile["gender"], string[]> = {
  female: ["첫 출근 룩 추천해줘", "캐주얼하게 입을 옷 추천해줘"],
  male: ["내일 날씨 춥다는데 입을 옷 추천해줘"],
};

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

// 채팅 첫 화면의 예시 상담 (데이트 룩, 성별마다 옷장 옷이 달라요). 첫 메시지를 보내면 화면에서는 사라지지만,
// 예시 아래 추천 답변(FIRST_CHIPS)으로 대화를 시작했다면 Claude가 이어서 답하도록 함께 보내요.
// 화면에 보이는 예시는 app/(tabs)/chat/page.tsx 의 EXAMPLE 과 같은 내용이에요.
export const FIRST_QUESTION = "내일 데이트 가야 하는데 뭘 입어야 할까?\n너무 꾸민 느낌은 싫어.";
const FIRST_EXCHANGE: Record<Profile["gender"], ChatTurn[]> = {
  female: [
    { role: "user", text: FIRST_QUESTION },
    {
      role: "bot",
      text:
        "데이트 전날, 설레면서도 고민되죠. 우선 옷장에 있는 옷으로 시작해볼까요?\n" +
        "[편안하지만 센스 있게] 던스트 해링턴 울 블루종 브라운 + 제너럴아이디어 와이드 워싱 데님 블루 + 하하아카이브 컨투어 숄더백 블랙\n" +
        "브라운 울 블루종이 따뜻하고 차분한 인상을 주고, 빈티지 워싱 와이드 데님이 꾸안꾸 느낌을 더해요. 블랙 숄더백이 전체를 깔끔하게 잡아줘요.\n" +
        "안에는 옷장의 베이지 시스루 롱슬리브를 받쳐 입으면 충분해요. 데이트 장소는 어디인가요?",
    },
  ],
  male: [
    { role: "user", text: FIRST_QUESTION },
    {
      role: "bot",
      text:
        "데이트 전날, 설레면서도 고민되죠. 우선 옷장에 있는 옷으로 시작해볼까요?\n" +
        "[자연스럽지만 단정하게] 아이보리 셔츠 + 블랙 슬랙스 + 네이비 가디건\n" +
        "아이보리 셔츠가 얼굴을 환하게 밝혀 주고, 가디건이 부드럽고 다정한 인상을 더해요. 블랙 슬랙스가 전체를 깔끔하게 잡아줘요.\n" +
        "가지고 있는 검정 토트백을 더하면 충분해요. 데이트 장소는 어디인가요?",
    },
  ],
};

function buildContext(app: AppState): ChatContext {
  const count = new Map<string, number>();
  allTastePicks(app).map(tastePhoto).forEach((p) => p && count.set(p.tag, (count.get(p.tag) ?? 0) + 1));
  const taste = [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([t]) => t).join(" · ");
  return {
    profile: app.profile,
    personalColor: PERSONAL_COLORS.find((c) => c.id === app.profile.personalColor)?.label ?? "아직 모름",
    concerns: app.concerns.map((id) => CONCERNS.find((c) => c.id === id)?.title ?? id),
    concernNote: app.concernNote,
    taste,
    body: app.body,
    closet: myCloset(app).map(({ name, category, favorite, size, measures }) => ({ name, category, favorite, size, measures })),
  };
}

/** 메시지를 보내면 답변을 돌려줍니다. Claude 연결이 안 되어 있으면 예시 답변을 써요. */
/**
 * 시연 대본 (여성 첫 출근): API 키가 있든 없든 항상 같은 답을 보내요.
 * 1) "다음 주가 첫 출근인데 어떤 옷을 사야 할까?" → 고정 추천 세 벌 (lib/products.ts FIRST_WORK_FEMALE)
 * 2) 그 뒤 "아바타한테 입혀 보고 싶어 / 어떤 핏일까" → 세 벌을 옷장에 넣어 주고 아바타로 안내
 */
function scriptedReply(message: string, app: AppState): Reply | null {
  if (app.profile.gender !== "female") return null;
  const text = message.trim();
  const name = app.profile.nickname?.trim() || "사용자";
  const recommended = app.chat.some((m) => m.role === "bot" && m.products?.includes(FIRST_WORK_FEMALE[0]));
  if (recommended && /입혀|입어\s*보|아바타|핏/.test(text)) {
    return {
      text:
        "좋아요! 이 제품들을 옷장에 추가해 드릴게요.\n" +
        "아바타에게 직접 입혀 보실 수 있어요. 아래 버튼을 눌러 아바타 탭으로 가면, 세 벌을 한 번에 입혀 볼 수도 있고 한 벌씩 입히고 벗겨 볼 수도 있어요.",
      tryOn: FIRST_WORK_FEMALE,
    };
  }
  if (isFirstWork(text)) {
    return {
      text:
        "첫 출근을 앞두고 계시는군요, 정말 축하드려요!\n" +
        "첫 출근에는 단정해 보이는 게 가장 중요하죠. 단정하지만 편안한 룩으로 골라 드릴게요.\n" +
        "특히 다음 주는 기온이 많이 떨어진다고 하니, 따뜻한 겨울 옷으로 입는 게 좋을 거예요.\n\n" +
        `${name}님의 체형과 퍼스널 컬러를 고려해서 제품을 추천해 드릴게요.\n` +
        "회색 브이넥 니트에 블랙 슬랙스를 입고 다크 네이비 코트를 걸치면, 차분하면서도 신뢰감 있는 첫인상을 줄 수 있어요.\n" +
        "블랙 슬랙스는 즐겨 입으시는 던스트 청바지와 상세 치수가 매우 유사해서, 편하게 맞으실 거예요.",
      products: FIRST_WORK_FEMALE,
    };
  }
  return null;
}

export async function getReply(message: string, images: string[], app: AppState): Promise<Reply> {
  const scripted = !images.length && scriptedReply(message, app);
  if (scripted) {
    await new Promise((r) => setTimeout(r, 1200));
    return scripted;
  }
  const firstUserText = app.chat.find((m) => m.role === "user")?.text ?? message;
  const fromExample = FIRST_CHIPS.includes(firstUserText);
  const history: ChatTurn[] = [
    ...(fromExample ? FIRST_EXCHANGE[app.profile.gender] : []),
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
    const data: { text?: string; products?: string[]; closet?: string[] } = await res.json();
    return { text: data.text ?? "답변을 가져오지 못했어요. 잠시 후 다시 시도해 주세요.", products: data.products ?? [], closet: data.closet };
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

  // 여성 캐주얼 · 정핏 코디는 옷장에 넣은 옷에서 골라 줘요 (lib/data.ts CLOSET_PICKS)
  const closetRule = closetPicksFor(app.profile.gender, text);
  if (closetRule && !isFirstWork(text)) {
    return {
      text: "새로 사지 않아도 옷장에 딱 맞는 조합이 있어요.\n던스트 70S 세미 플레어 진(S)에 미세키서울 언밸런스 니트 가디건을 걸치면 편하면서도 멋스러운 캐주얼 룩이 돼요.\n둘 다 판매처 실측을 저장해 둔 옷이라 정핏으로 입을 수 있어요. 가디건은 단추를 비대칭으로 잠가 포인트를 줘 보세요.",
      closet: closetRule.samples,
      chips: ["다른 코디도 볼래요", "신발은 뭐가 좋을까요?"],
    };
  }

  // 날씨가 춥다는 질문: 옷장 옷으로 따뜻하게 겹쳐 입는 코디
  if (/춥|쌀쌀|추워|추운|날씨/.test(text)) {
    const names = myCloset(app).map((i) => i.name);
    const pick = (re: RegExp) => names.find((n) => re.test(n));
    const outer = pick(/가디건|후드|재킷|코트|점퍼/);
    const inner = pick(/롱슬리브|니트|맨투맨|셔츠/);
    const bottom = pick(/데님|팬츠|슬랙스|바지/);
    const look = [inner, outer, bottom].filter(Boolean).join(" + ");
    return {
      text: look
        ? `추운 날엔 옷장에 있는 옷을 겹쳐 입는 게 가장 따뜻해요.\n${look} 조합을 추천해요.\n안쪽은 얇게, 바깥은 도톰하게 입으면 실내에서 벗기도 편해요. 목도리나 비니를 더하면 체감 온도가 확 달라져요.`
        : "추운 날엔 얇은 옷을 여러 겹 겹쳐 입는 게 가장 따뜻해요.\n옷장에 니트나 아우터를 등록해 두면 가진 옷으로 코디를 골라 드릴게요.",
      chips: ["신발은 뭐가 좋을까요?", "다른 코디도 볼래요"],
    };
  }

  // 남성 데이트 룩은 시연용 고정 세트로 답해요 (lib/products.ts DATE_LOOK_MALE)
  if (app.profile.gender === "male" && /데이트|소개팅/.test(text)) {
    return {
      text: "데이트 룩으로는 던스트의 스트라이프 청키 스웨터와 더블 플리츠 와이드 치노 슬랙스를 추천해요.\n아이보리·카키 스트라이프 니트에 같은 카키 톤의 와이드 치노를 맞추면 차분하면서도 다정한 인상을 줘요.\n기준 옷 실측을 입력해 두면 맞는 사이즈도 함께 알려드릴게요.",
      products: DATE_LOOK_MALE,
      chips: ["사이즈가 고민돼요", "신발은 뭐가 좋을까요?"],
    };
  }

  // 여성 첫 출근 룩도 시연용 고정 세트로 답해요 (lib/products.ts FIRST_WORK_FEMALE)
  if (app.profile.gender === "female" && isFirstWork(text)) {
    return {
      text: "첫 출근 룩으로는 던스트 클래식 브이넥 스웨터, 세미 부츠컷 슬림 슬랙스, 시야쥬 울 블렌드 부클 롱코트를 추천해요.\n그레이 브이넥 니트에 블랙 부츠컷 슬랙스를 입고 다크 네이비 롱코트를 걸치면 단정하면서도 신뢰감 있는 첫인상을 줄 수 있어요. 니트 안에 셔츠를 레이어드해도 좋아요.\n기준 옷 실측을 입력해 두면 맞는 사이즈도 함께 알려드릴게요.",
      products: FIRST_WORK_FEMALE,
      chips: ["사이즈가 고민돼요", "신발은 뭐가 좋을까요?"],
    };
  }

  // 상품 추천을 물으면 상품 목록에서 종류가 맞는 것을 골라 보여줘요.
  if (/추천|상품|브랜드|살까|사고 싶|구매|쇼핑/.test(text) && PRODUCTS.length) {
    const category = guessCategory(text);
    // 시연용 고정 세트(pinnedFor)는 그 상황에서만 보여줘요
    const pool = PRODUCTS.filter((p) => !p.pinnedFor);
    const matched = pool.filter((p) => !category || p.category === category || (category === "top" && p.category === "outer"));
    const picks = (matched.length ? matched : pool).slice(0, 2);
    return {
      text: "상품 목록에서 지금 옷장과 잘 어울릴 만한 것을 골라봤어요.\n즐겨찾는 기준 옷의 실측을 입력해 두면 맞는 사이즈도 함께 알려드릴게요.",
      products: picks.map((p) => p.id),
      chips: ["사이즈가 고민돼요", "다른 코디도 볼래요"],
    };
  }
  const bottom = myCloset(app).find((i) => i.category === "bottom" && i.favorite);

  if (/https?:\/\/|www\.|\.com|\.kr/i.test(text)) {
    return {
      text: "링크 고마워요. 옷장의 '판매처 링크 입력'에 구매 사이즈와 함께 저장해두면, 가진 옷의 실측과 비교해볼 수 있어요.",
      chips: ["사이즈가 고민돼요", "다른 코디도 볼래요"],
    };
  }
  if (/카페|전시/.test(text)) {
    const male = app.profile.gender === "male";
    return {
      text: male
        ? "카페나 전시회라면 오래 걷고 앉아 있으니 편한 게 최고예요.\n가디건은 실내에서 벗어 들기 좋고, 깔끔한 스니커즈를 신으면 롱슬리브와 데님의 캐주얼한 분위기가 살아나요."
        : "카페나 전시회라면 오래 걷고 앉아 있으니 편한 게 최고예요.\n블루종은 실내에서 벗어 들기 좋고, 와이드 데님에 로퍼나 스니커즈를 신으면 오래 걸어도 편해요. 숄더백은 손이 자유로워서 전시 관람에도 좋아요.",
      chips: ["신발은 뭐가 좋을까요?", "다른 코디도 볼래요"],
    };
  }
  if (/안 정했|모르겠/.test(text)) {
    return {
      text: "괜찮아요. 장소가 정해지지 않았을 때는 어디서나 무난한 지금 조합이 가장 안전해요.\n가디건은 실내외 온도에 맞춰 입고 벗기 좋고요. 장소가 정해지면 다시 알려 주세요.",
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
