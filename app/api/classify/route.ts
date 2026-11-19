// 옷장에 새 옷을 넣을 때 Claude가 종류(상의·아우터·하의·ACC)를 분류하는 서버 라우트입니다.
// API 키(ANTHROPIC_API_KEY)가 없으면 503을 돌려주고, 화면은 이름의 단어로 추천해요(lib/classify.ts).

import Anthropic from "@anthropic-ai/sdk";

const MODEL = "claude-opus-5-5";

const SYSTEM = `당신은 패션 앱의 옷장 정리 도우미입니다. 사용자가 등록한 옷 하나를 보고 종류를 분류해요.
- top: 셔츠, 블라우스, 티셔츠, 니트, 맨투맨, 후드, 원피스 등 상의
- outer: 가디건, 재킷, 코트, 패딩, 점퍼, 블레이저, 베스트 등 겉옷
- bottom: 바지, 슬랙스, 청바지, 스커트, 반바지 등 하의
- bag: 가방, 신발, 모자, 벨트, 스카프, 액세서리 등 그 밖의 잡화(ACC)
name에는 사진이 있으면 보이는 색과 종류로 짧은 한국어 이름(예: "베이지 니트")을, 없으면 사용자가 쓴 이름을 그대로 넣어요.`;

const FORMAT = {
  type: "json_schema" as const,
  schema: {
    type: "object",
    properties: {
      category: { type: "string", enum: ["top", "outer", "bottom", "bag"] },
      name: { type: "string" },
    },
    required: ["category", "name"],
    additionalProperties: false,
  },
};

export async function POST(request: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ error: "no_api_key" }, { status: 503 });
  }

  let name = "";
  let link = "";
  let image = "";
  try {
    const body = await request.json();
    name = String(body.name ?? "").slice(0, 100);
    link = String(body.link ?? "").slice(0, 300);
    image = String(body.image ?? "");
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }

  // 사진은 화면에서 줄인 JPEG(data URL)로 와요.
  const photo = /^data:image\/jpeg;base64,([A-Za-z0-9+/=]+)$/.exec(image)?.[1];
  if (!name && !link && !photo) return Response.json({ error: "bad_request" }, { status: 400 });

  const content: Anthropic.Beta.BetaContentBlockParam[] = [];
  if (photo) content.push({ type: "image", source: { type: "base64", media_type: "image/jpeg", data: photo } });
  content.push({
    type: "text",
    text: `옷 이름: ${name || "(없음)"}\n판매처 링크: ${link || "(없음)"}\n이 옷의 종류를 분류해 주세요.`,
  });

  const client = new Anthropic();
  try {
    const response = await client.beta.messages.create({
      model: MODEL,
      max_tokens: 1024,
      output_config: { effort: "low", format: FORMAT },
      betas: ["server-side-fallback-2026-07-01"],
      fallbacks: "default",
      system: SYSTEM,
      messages: [{ role: "user", content }],
    });
    if (response.stop_reason !== "end_turn") {
      return Response.json({ error: "no_result" }, { status: 502 });
    }
    const text = response.content.find((b): b is Anthropic.Beta.BetaTextBlock => b.type === "text")?.text ?? "";
    const parsed: { category?: string; name?: string } = JSON.parse(text);
    return Response.json({ category: parsed.category, name: parsed.name?.slice(0, 20) });
  } catch (error) {
    if (error instanceof Anthropic.APIError) {
      console.error(`[classify] Claude API 오류 ${error.status}:`, error.message);
    } else {
      console.error("[classify] 분류 실패:", error);
    }
    return Response.json({ error: "classify_failed" }, { status: 502 });
  }
}
