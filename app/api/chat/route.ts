// 쇼핑메이트 채팅을 Claude API로 답하는 서버 라우트입니다.
// API 키는 서버에서만 읽어요(.env.local 의 ANTHROPIC_API_KEY). 브라우저 코드에는 절대 넣지 마세요.
// 키가 없으면 503을 돌려주고, 화면(lib/chat.ts)은 미리 써둔 예시 답변으로 대신 대답합니다.

import Anthropic from "@anthropic-ai/sdk";
import type { ChatContext, ChatTurn } from "@/lib/chat";
import { pinnedPicks, PRODUCTS } from "@/lib/products";
import { closetPicksFor } from "@/lib/data";
import { describeCatalog, describeUser, REPLY_FORMAT, SYSTEM } from "@/lib/chatPrompt";

const MODEL = "claude-sonnet-5-5"; // 주최측 가이드 권장: 평소에는 Sonnet 5.5
const MAX_TURNS = 20; // 최근 대화만 보내요
const MAX_CHARS = 2000; // 메시지 하나당 최대 글자 수
const MAX_IMAGES = 8; // 한 번에 보내는 첨부 사진 최대 장수
const JPEG_DATA_URL = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/;

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
