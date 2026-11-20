// AI 가상 사용자 평가 (서버). 가상 사용자 1명의 질문 3개를 돌려요: GET /api/eval?p=<0~5>&code=<EVAL_CODE>
// 질문마다 (A) 일반 AI 챗봇(사용자 정보 없이 질문만)과 (B) Show Me(앱과 같은 지시문·상품 실측·사용자 정보)가 답하고,
// 그 가상 사용자를 연기하는 평가자 AI가 두 답을 순서를 섞어 블라인드로 채점해요.
// API 키는 서버에서만 읽어요. 돈이 드는 요청이라 평가 화면(app/eval)의 코드가 있어야 실행돼요.

import Anthropic from "@anthropic-ai/sdk";
import { describeCatalog, describeUser, REPLY_FORMAT, SYSTEM } from "@/lib/chatPrompt";
import { EVAL_CRITERIA, EVAL_PERSONAS, type EvalCriterion, type EvalPersona } from "@/lib/evalSet";
import { pinnedPicks, PRODUCTS } from "@/lib/products";

export const maxDuration = 300;

const EVAL_CODE = "showme-eval-1120";
const ANSWER_MODEL = "claude-sonnet-5-5"; // 앱 채팅과 같은 모델 (A·B 모두 같은 모델 → 차이는 '정보와 설계'에서만 나와요)
const JUDGE_MODEL = "claude-opus-5-5";

const BASELINE_SYSTEM = "당신은 친절한 패션 쇼핑 도우미 AI입니다. 사용자의 질문에 한국어로 답하세요. 마크다운 문법은 쓰지 말고 평범한 문장으로 답하세요.";

type Scores = Record<EvalCriterion, number>;

const scoreSchema = {
  type: "object",
  properties: Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, { type: "integer" }])),
  required: EVAL_CRITERIA.map((c) => c.key),
  additionalProperties: false,
};

const JUDGE_FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      answer_1: scoreSchema,
      answer_2: scoreSchema,
      prefer: { type: "string", enum: ["1", "2", "same"] },
      reason: { type: "string" },
    },
    required: ["answer_1", "answer_2", "prefer", "reason"],
    additionalProperties: false,
  },
};

const textOf = (content: Anthropic.Beta.BetaContentBlock[] | Anthropic.ContentBlock[]) =>
  content
    .filter((b) => b.type === "text")
    .map((b) => (b as { text: string }).text)
    .join("")
    .trim();

/** (A) 일반 AI 챗봇: 사용자 정보 없이 질문만 */
async function baselineAnswer(client: Anthropic, question: string) {
  const res = await client.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low" },
    system: BASELINE_SYSTEM,
    messages: [{ role: "user", content: question }],
  });
  return { text: textOf(res.content), products: [] as string[] };
}

/** (B) Show Me: 앱 채팅(app/api/chat)과 같은 지시문·상품 목록·사용자 정보 */
async function showMeAnswer(client: Anthropic, persona: EvalPersona, question: string) {
  const res = await client.beta.messages.create({
    model: ANSWER_MODEL,
    max_tokens: 4000,
    output_config: { effort: "low", format: REPLY_FORMAT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system: [
      { type: "text", text: SYSTEM },
      { type: "text", text: describeCatalog(), cache_control: { type: "ephemeral" } },
      { type: "text", text: describeUser(persona.context) },
    ],
    messages: [{ role: "user", content: question }],
  });
  const raw = textOf(res.content);
  let text = raw;
  let products: string[] = [];
  try {
    const parsed: { text?: string; product_ids?: unknown } = JSON.parse(raw);
    text = String(parsed.text ?? "").trim();
    products = (Array.isArray(parsed.product_ids) ? parsed.product_ids : []).map(String).filter((id) => PRODUCTS.some((p) => p.id === id)).slice(0, 3);
  } catch {
    // 형식이 깨지면 글만
  }
  const pinned = pinnedPicks(persona.context.profile.gender, question);
  if (pinned) products = [...pinned];
  return { text, products };
}

/** 앱 화면에서 답 아래 보이는 상품 카드를 글로 */
function productCards(ids: string[]) {
  if (!ids.length) return "";
  const lines = ids.map((id) => {
    const p = PRODUCTS.find((x) => x.id === id)!;
    const sizes = Object.entries(p.sizes ?? {})
      .map(([s, m]) => `${s}(${Object.entries(m).map(([k, v]) => `${k} ${v}`).join(", ")})`)
      .join(" / ");
    return `- ${p.brand} ${p.label ?? p.name} · ${p.price.toLocaleString("ko-KR")}원${sizes ? ` · 사이즈별 실측(cm): ${sizes}` : ""}`;
  });
  return `\n[답변 아래 함께 보이는 추천 상품 카드]\n${lines.join("\n")}`;
}

/** 가상 사용자 입장의 평가자 AI: 두 답을 블라인드로 채점 */
async function judge(client: Anthropic, persona: EvalPersona, question: string, first: string, second: string) {
  const system = `당신은 패션 쇼핑 앱을 평가하는 사용자 연구 참가자를 연기합니다. 아래 사람 본인이 되어, 그 사람의 입장과 기준으로 판단하세요.

[나는 이런 사람]
${persona.label}
${persona.story}

[내가 실제로 가진 정보 — 답변이 이것과 맞는지 판단할 때 참고]
${describeUser(persona.context)}

평가 방법:
- 같은 질문에 대한 두 서비스의 답변(답변 1, 답변 2)을 받습니다. 어느 쪽이 어떤 서비스인지는 모릅니다.
- 항목마다 1~5점 정수로 매기세요 (1 매우 나쁨, 3 보통, 5 매우 좋음). 후하게 주지 말고, 실제로 이 답을 받았을 때의 나를 상상해서 엄격하게 매기세요.
${EVAL_CRITERIA.map((c) => `  - ${c.key} (${c.label}): ${c.desc}`).join("\n")}
- 내 정보와 맞지 않는 내용, 확인할 수 없는 숫자를 지어낸 것 같은 내용은 trust 점수를 깎으세요. 답이 길기만 하고 내 상황과 무관하면 personal·actionable 점수를 깎으세요.
- prefer: 다시 쓴다면 어느 쪽을 쓰겠는지 ("1", "2", 비슷하면 "same").
- reason: 그 사람의 말투로 1~2문장. 결정적인 이유를 구체적으로.`;
  const res = await client.beta.messages.create({
    model: JUDGE_MODEL,
    max_tokens: 4000,
    output_config: { effort: "medium", format: JUDGE_FORMAT },
    betas: ["server-side-fallback-2026-07-01"],
    fallbacks: "default",
    system,
    messages: [{ role: "user", content: `[내 질문]\n${question}\n\n[답변 1]\n${first}\n\n[답변 2]\n${second}` }],
  });
  const parsed: { answer_1: Scores; answer_2: Scores; prefer: "1" | "2" | "same"; reason: string } = JSON.parse(textOf(res.content));
  const clamp = (s: Scores) => Object.fromEntries(EVAL_CRITERIA.map((c) => [c.key, Math.min(5, Math.max(1, Math.round(Number(s[c.key]) || 1)))])) as Scores;
  return { ...parsed, answer_1: clamp(parsed.answer_1), answer_2: clamp(parsed.answer_2) };
}

async function runCase(client: Anthropic, persona: EvalPersona, question: string) {
  const [base, show] = await Promise.all([baselineAnswer(client, question), showMeAnswer(client, persona, question)]);
  const showText = show.text + productCards(show.products);
  // 순서를 섞어 위치 편향을 줄여요
  const showFirst = Math.random() < 0.5;
  const j = await judge(client, persona, question, showFirst ? showText : base.text, showFirst ? base.text : showText);
  const showScores = showFirst ? j.answer_1 : j.answer_2;
  const baseScores = showFirst ? j.answer_2 : j.answer_1;
  const prefer = j.prefer === "same" ? "same" : (j.prefer === "1") === showFirst ? "showme" : "baseline";
  return {
    question,
    baseline: { text: base.text, scores: baseScores },
    showme: { text: show.text, products: show.products, scores: showScores },
    prefer,
    reason: j.reason,
    showMeShownFirst: showFirst,
  };
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  if (url.searchParams.get("code") !== EVAL_CODE) return Response.json({ error: "forbidden" }, { status: 403 });
  if (!process.env.ANTHROPIC_API_KEY) return Response.json({ error: "no_api_key" }, { status: 503 });
  const persona = EVAL_PERSONAS[Number(url.searchParams.get("p"))];
  if (!persona) return Response.json({ error: "bad_persona" }, { status: 400 });

  const client = new Anthropic();
  try {
    const cases = await Promise.all(persona.questions.map((q) => runCase(client, persona, q)));
    return Response.json({ persona: { id: persona.id, label: persona.label, story: persona.story }, cases, model: { answer: ANSWER_MODEL, judge: JUDGE_MODEL } });
  } catch (error) {
    if (error instanceof Anthropic.AuthenticationError) return Response.json({ error: "invalid_api_key" }, { status: 502 });
    if (error instanceof Anthropic.RateLimitError) return Response.json({ error: "rate_limited" }, { status: 429 });
    if (error instanceof Anthropic.APIError) {
      console.error(`[eval] Claude API 오류 ${error.status}:`, error.message);
      return Response.json({ error: "api_error", status: error.status }, { status: 502 });
    }
    console.error("[eval] 오류:", error);
    return Response.json({ error: "unknown" }, { status: 500 });
  }
}
