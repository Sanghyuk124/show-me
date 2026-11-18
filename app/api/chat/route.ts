// 쇼핑메이트 채팅을 Claude API로 답하는 서버 라우트입니다.
// API 키는 서버에서만 읽어요(.env.local 의 ANTHROPIC_API_KEY). 브라우저 코드에는 절대 넣지 마세요.
// 키가 없으면 503을 돌려주고, 화면(lib/chat.ts)은 미리 써둔 예시 답변으로 대신 대답합니다.

import Anthropic from "@anthropic-ai/sdk";
import type { ChatContext, ChatTurn } from "@/lib/chat";

const MODEL = "claude-opus-5-5";
const MAX_TURNS = 20; // 최근 대화만 보내요
const MAX_CHARS = 2000; // 메시지 하나당 최대 글자 수

const SYSTEM = `당신은 패션 쇼핑 앱 'Show Me'의 쇼핑메이트입니다.
사용자가 유행보다 '나다운' 옷을 고를 수 있게 돕는 친근한 스타일 조언자예요.

원칙:
- 항상 한국어 존댓말(해요체)로, 따뜻하고 간결하게 답해요. 보통 2~5문장, 휴대폰 채팅 화면에 맞게 짧게.
- 마크다운 문법(#, **, 표 등)은 쓰지 말고 평범한 문장으로 써요. 필요하면 줄바꿈만 써요.
- 새 옷을 사라고 권하기 전에 사용자의 옷장에 있는 옷부터 활용하는 방법을 먼저 제안해요.
- 사이즈·핏 질문에는 옷장에 저장된 실측과 신체 치수를 근거로 이야기하고, 값이 없으면 어떤 치수를 재면 좋을지 알려줘요.
- 확실하지 않은 정보(가격, 재고, 세일 일정 등)는 지어내지 말고 확인이 필요하다고 말해요.
- 패션과 관련 없는 요청에는 정중하게 쇼핑·코디 이야기로 돌아와요.`;

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

  const messages: Anthropic.Beta.BetaMessageParam[] = history.slice(-MAX_TURNS).map((t) => ({
    role: t.role === "user" ? "user" : "assistant",
    content: String(t.text).slice(0, MAX_CHARS),
  }));
  // 대화는 반드시 사용자 메시지로 시작해야 해요.
  while (messages.length && messages[0].role !== "user") messages.shift();
  if (!messages.length) return Response.json({ error: "bad_request" }, { status: 400 });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 16000,
      // 채팅은 빠른 답이 중요해서 effort를 low로 둡니다. 답이 너무 얕으면 "medium"으로 올려 보세요.
      output_config: { effort: "low" },
      // 안전 정책으로 답을 거절하면 서버가 기본 대체 모델로 다시 시도해요.
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: [
        { type: "text", text: SYSTEM, cache_control: { type: "ephemeral" } },
        { type: "text", text: describeUser(context) },
      ],
      messages,
    });

    if (response.stop_reason === "refusal") {
      return Response.json({ text: "이 질문에는 답하기 어려워요. 코디나 사이즈 고민을 이야기해 주시면 함께 찾아볼게요." });
    }
    const text = response.content
      .filter((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")
      .map((b) => b.text)
      .join("\n")
      .trim();
    return Response.json({ text: text || "답변을 만들지 못했어요. 다시 한 번 물어봐 주세요." });
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
