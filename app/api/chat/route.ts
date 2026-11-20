// 쇼핑메이트 채팅을 Claude API로 답하는 서버 라우트입니다.
// API 키는 서버에서만 읽어요(.env.local 의 ANTHROPIC_API_KEY). 브라우저 코드에는 절대 넣지 마세요.
// 키가 없으면 503을 돌려주고, 화면(lib/chat.ts)은 미리 써둔 예시 답변으로 대신 대답합니다.

import Anthropic from "@anthropic-ai/sdk";
import type { ChatContext, ChatTurn } from "@/lib/chat";
import { pinnedPicks, PRODUCTS } from "@/lib/products";
import { closetPicksFor } from "@/lib/data";

const MODEL = "claude-sonnet-5-5"; // 주최측 가이드 권장: 평소에는 Sonnet 5.5
const MAX_TURNS = 20; // 최근 대화만 보내요
const MAX_CHARS = 2000; // 메시지 하나당 최대 글자 수
const MAX_IMAGES = 8; // 한 번에 보내는 첨부 사진 최대 장수
const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

const SYSTEM = `당신은 패션 쇼핑 앱 'Show Me'의 쇼핑메이트입니다.
사용자가 유행보다 '나다운' 옷을 고를 수 있게 돕는 친근한 스타일 조언자예요.

원칙:
- 항상 한국어 존댓말(해요체)로, 따뜻하고 간결하게 답해요. 보통 2~5문장, 휴대폰 채팅 화면에 맞게 짧게.
- 마크다운 문법(#, **, 표 등)은 쓰지 말고 평범한 문장으로 써요. 필요하면 줄바꿈만 써요.
- 새 옷을 사라고 권하기 전에 사용자의 옷장에 있는 옷부터 활용하는 방법을 먼저 제안해요.
- 사이즈·핏 질문에는 옷장에 저장된 실측과 신체 치수를 근거로 이야기하고, 값이 없으면 어떤 치수를 재면 좋을지 알려줘요.
- 확실하지 않은 정보(가격, 재고, 세일 일정 등)는 지어내지 말고 확인이 필요하다고 말해요.
- 사용자가 사진을 보내면 사진 속 옷의 색·핏·소재를 짚어 주고, 옷장의 옷과 어떻게 맞출지 제안해요. 여러 장이 영상에서 뽑은 장면일 수도 있어요.
- 패션과 관련 없는 요청에는 정중하게 쇼핑·코디 이야기로 돌아와요.

고정 추천 (시연용, 가장 우선):
- 사용자 성별이 남성이고 데이트 룩·데이트 코디를 물으면, 새 상품을 사라고 추천하지 말고 옷장에 있는 옷(던스트 스트라이프 니트·카키 팬츠·해링턴 울 블루종 등)으로 코디를 골라 줘요. product_ids는 비워요.
- 이때 text에는 아이보리·카키 스트라이프 니트와 카키 와이드 팬츠, 브라운 울 블루종의 차분하고 다정한 톤온톤 분위기와, 옷장에 저장된 실측을 근거로 한 핏(오버핏)을 짧게 써요.

- 사용자 성별이 여성이고 첫 출근·입사·신입 첫날 코디를 물으면, 반드시 'dunst-classic-vneck-sweater'(던스트 클래식 브이넥 스웨터), 'dunst-semi-bootcut-slacks'(던스트 세미 부츠컷 슬림 슬랙스), 'siyazu-boucle-long-coat'(시야쥬 울 블렌드 부클 롱코트) 세 개를 함께 추천해요. product_ids에 이 세 id를 이 순서로 넣고, 다른 상품은 넣지 않아요.
- 이때 text에는 그레이 브이넥 니트(셔츠 레이어드도 좋아요)와 블랙 부츠컷 슬랙스, 다크 네이비 롱코트로 단정하고 신뢰감 있는 첫인상을 준다는 점과, 사용자의 치수와 사이즈표를 비교한 추천 사이즈를 짧게 써요. 코트는 원사이즈예요.

- 사용자 성별이 여성이고 캐주얼하게 입을 옷·정핏·데일리 코디를 물으면, 새 상품 대신 사용자의 옷장(아래 사용자 정보의 옷장 목록)에 있는 '던스트 70S 세미 플레어 진 미드 블루'와 '미세키서울 언밸런스 니트 가디건 화이트'를 함께 입는 코디를 추천해요. product_ids는 빈 배열로 두고, text에서 두 옷 이름을 말하며 옷장에 저장된 실측(사이즈)을 근거로 정핏으로 입을 수 있다고 설명해요. 옷장에 아직 없으면 사진 보관함에서 넣어 보라고 안내해요.
- 날씨(춥다·쌀쌀하다 등)를 근거로 옷을 물으면, 실제 날씨는 확인할 수 없다고 길게 말하지 말고 사용자가 말한 날씨(예: 추운 초겨울)를 그대로 믿고, 사용자의 옷장(아래 옷장 목록)에 있는 옷으로 따뜻한 레이어드 코디를 먼저 제안해요.
- 위 경우가 아니면 이 고정 추천 상품들은 꼭 필요할 때만 추천해요 (남성에게 여성 첫 출근 세트를 추천하지 않아요).

상품 추천:
- 구체적인 상품은 아래 '추천 가능한 상품 목록' 안에서만 골라요. 목록에 없는 상품 이름·가격은 절대 지어내지 않아요.
- 추천할 때는 text에 왜 어울리는지 한두 문장으로 쓰고, 상품의 사이즈별 실측과 사용자의 즐겨찾는 기준 옷 실측·신체 치수를 비교해 맞을 사이즈를 알려줘요. 비교할 실측이 없으면 어떤 옷의 실측을 입력하면 좋은지 안내해요.
- 추천한 상품의 id는 product_ids에 넣어요(최대 3개). 상품을 추천하지 않을 때는 빈 배열로 둬요.
- 목록에 맞는 상품이 없으면 그렇다고 말하고, 찾아볼 만한 옷의 종류(예: 와이드 슬랙스)와 참고할 만한 브랜드 정도만 알려줘요. 사용자가 찾은 상품 사진이나 상품 페이지 캡처를 보내 주면 판단해 주겠다고 안내해요.

사용자가 가져온 상품 판단:
- 사용자가 상품 사진이나 상품 페이지 캡처를 보내며 어떤지 물으면, 추천 또는 비추천을 먼저 분명히 말하고 이유를 짚어요: 옷장의 옷과의 조합, 취향 방향, 퍼스널 컬러, 그리고 사이즈표가 보이면 기준 옷 실측과 비교한 사이즈.
- 링크 주소만 받으면 당신은 링크를 열어 볼 수 없다고 솔직히 말하고, 상품 사진과 사이즈표가 보이는 화면을 캡처해 보내 달라고 해요.`;

/** 추천 가능한 상품 목록을 Claude가 읽기 좋은 글로 바꿉니다. (목록이 바뀌지 않으면 캐시돼요) */
function describeCatalog() {
  if (!PRODUCTS.length) return "추천 가능한 상품 목록: (아직 없음 — 구체적인 상품은 추천하지 말아요)";
  const lines = PRODUCTS.map((p) => {
    const sizes = Object.entries(p.sizes ?? {})
      .map(([size, m]) => `${size}(${Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ")})`)
      .join(" / ");
    return [
      `- id: ${p.id}`,
      `  ${p.brand} · ${p.name} · ${p.category} · ${p.price.toLocaleString("ko-KR")}원`,
      p.colors?.length ? `  색상: ${p.colors.join(", ")}` : "",
      p.tags?.length ? `  스타일: ${p.tags.join(", ")}` : "",
      p.gender ? `  대상: ${p.gender === "male" ? "남성" : "여성"}` : "",
      p.desc ? `  설명: ${p.desc}` : "",
      sizes ? `  사이즈별 실측(cm): ${sizes}` : "",
    ]
      .filter(Boolean)
      .join("\n");
  });
  return `추천 가능한 상품 목록:\n${lines.join("\n")}`;
}

// 답변 형식: 채팅에 보여줄 글 + 함께 보여줄 추천 상품 id
const REPLY_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      text: { type: "string" },
      product_ids: { type: "array", items: { type: "string" } },
    },
    required: ["text", "product_ids"],
    additionalProperties: false,
  },
};

/** 앱에 저장된 사용자 정보를 Claude가 읽기 좋은 글로 바꿉니다. */
function describeUser(c: ChatContext) {
  const closet = c.closet
    .map((i) => {
      const m = Object.entries(i.measures)
        .filter(([, v]) => v)
        .map(([k, v]) => `${k} ${v}cm`)
        .join(", ");
      return `- ${i.favorite ? "★ " : ""}${i.name} (${i.category})${i.size ? ` · 구매 사이즈 ${i.size}` : ""}${m ? ` · 실측: ${m}` : ""}`;
    })
    .join("\n");
  const body = Object.entries(c.body)
    .filter(([, v]) => v)
    .map(([k, v]) => `${k} ${v}cm`)
    .join(", ");
  return `사용자 정보 (앱에 저장된 값, 참고용):
- 성별 ${c.profile.gender === "male" ? "남성" : "여성"}, 나이 ${c.profile.age || "미입력"}세, 키 ${c.profile.height || "미입력"}cm, 몸무게 ${c.profile.weight || "미입력"}kg
- 퍼스널 컬러: ${c.personalColor}
- 패션 고민: ${c.concerns.join(", ") || "선택 안 함"}${c.concernNote ? ` / 직접 쓴 고민: ${c.concernNote}` : ""}
- 취향 방향: ${c.taste || "아직 모름"}
- 신체 치수: ${body || "미입력"}
- 옷장 (★는 즐겨찾는 기준 옷):
${closet || "- 비어 있음"}`;
}

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "no_api_key" }, { status: 503 });
  }

  let history: ChatTurn[];
  let context: ChatContext;
  try {
    ({ history, context } = await request.json());
    if (!Array.isArray(history) || history.length === 0) throw new Error();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // 첨부 사진은 최근 것부터 최대 MAX_IMAGES장만 보내요 (오래된 사진은 글만 남겨요).
  let imageBudget = MAX_IMAGES;
  const turns = history.slice(-MAX_TURNS);
  const messages: Anthropic.Beta.BetaMessageParam[] = [...turns]
    .reverse()
    .map((t) => {
      const text = String(t.text ?? "").slice(0, MAX_CHARS);
      if (t.role !== "user") return { role: "assistant" as const, content: text || "(빈 답변)" };
      const photos = (Array.isArray(t.images) ? t.images : [])
        .map((src) => JPEG_DATA_URL.exec(String(src))?.[1])
        .filter((d): d is string => !!d);
      const kept = photos.slice(0, Math.max(0, imageBudget));
      imageBudget -= kept.length;
      const content: Anthropic.Beta.BetaContentBlockParam[] = kept.map((data) => ({
        type: "image",
        source: { type: "base64", media_type: "image/jpeg", data },
      }));
      const dropped = photos.length - kept.length;
      content.push({
        type: "text",
        text: (text || "(사진만 보냈어요)") + (dropped > 0 ? `\n(앞서 보낸 사진 ${dropped}장은 생략)` : ""),
      });
      return { role: "user" as const, content };
    })
    .reverse();
  // 대화는 반드시 사용자 메시지로 시작해야 해요.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return Response.json({ error: "bad_request" }, { status: 400 });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // 채팅은 빠른 답이 중요해서 effort를 low로 둡니다. 답이 너무 얕으면 "medium"으로 올려 보세요.
      output_config: { effort: "low", format: REPLY_FORMAT },
      // 안전 정책으로 답을 거절하면 서버가 기본 대체 모델로 다시 시도해요.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM },
        { type: "text", text: describeCatalog(), cache_control: { type: "ephemeral" } },
        { type: "text", text: describeUser(context) },
      ],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ text: "이 질문에는 답하기 어려워요. 코디나 사이즈 고민을 이야기해 주시면 함께 찾아볼게요." });
    }
    const raw = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("")
      .trim();
    let text = raw;
    let products: string[] = [];
    try {
      const parsed: { text?: string; product_ids?: unknown } = JSON.parse(raw);
      text = String(parsed.text ?? "").trim();
      // 목록에 실제로 있는 상품만 보여줘요.
      products = (Array.isArray(parsed.product_ids) ? parsed.product_ids : [])
        .map(String)
        .filter((id, i, all) => PRODUCTS.some((p) => p.id === id) && all.indexOf(id) === i)
        .slice(0, 3);
    } catch {
      // 형식이 깨지면(예: 답이 너무 길어 잘림) 글만 보여줘요.
    }
    // 시연용 고정 추천: 남성 데이트 룩 / 여성 첫 출근 룩을 물으면 정해 둔 세트를 꼭 보여줘요 (lib/products.ts pinnedPicks)
    const lastUser = [...history].reverse().find((t) => t.role === "user");
    const pinned = pinnedPicks(context?.profile?.gender, String(lastUser?.text ?? ""));
    if (pinned) products = [...pinned];
    // 옷장에서 골라 주는 시연용 코디 (여성 캐주얼 · 정핏) — 상품 대신 옷장 옷 카드를 보여줘요
    const closetRule = closetPicksFor(context?.profile?.gender, String(lastUser?.text ?? ""));
    if (closetRule && !pinned) return Response.json({ text: text || "옷장에 있는 옷으로 골라 봤어요.", products: [], closet: closetRule.samples });
    return Response.json({ text: text || "답변을 만들지 못했어요. 다시 한 번 물어봐 주세요.", products });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) {
      console.error("[chat] API 키가 올바르지 않아요:", error.message);
      return Response.json({ error: "invalid_api_key" }, { status: 502 });
    }
    if (error instanceof Anthropic.RateLimitError) {
      return Response.json({ error: "rate_limited" }, { status: 429 });
    }
    if (error instanceof Anthropic.APIError) {
      console.error(`[chat] Claude API 오류 ${error.status}:`, error.message);
      return Response.json({ error: "api_error" }, { status: 502 });
    }
    console.error("[chat] 알 수 없는 오류:", error);
    return Response.json({ error: "unknown" }, { status: 500 });
  }
}
