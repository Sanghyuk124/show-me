// 옷 종류(상의·아우터·하의·ACC)를 정하는 곳입니다.
// - 서버에 Claude API 키가 있으면 app/api/classify/route.ts 에서 Claude가 사진·이름·링크를 보고 분류해요.
// - 키가 없거나 실패하면 아래 guessCategory 가 옷 이름·링크의 단어로 추천해요.

import type { Category } from "./data";

export const CATEGORIES: Category[] = ["top", "outer", "bottom", "bag"];

const KEYWORDS: [Category, RegExp][] = [
  ["outer", /가디건|자켓|재킷|코트|점퍼|패딩|블레이저|블루종|야상|바람막이|집업|베스트|cardigan|jacket|coat|padding|blazer|parka|outer/i],
  ["bottom", /바지|팬츠|슬랙스|청바지|데님|진\b|스커트|치마|반바지|쇼츠|레깅스|조거|카고|pants|slacks|jeans|denim|skirt|shorts|trouser|bottom/i],
  ["bag", /가방|백\b|토트|숄더|크로스|클러치|백팩|에코백|신발|운동화|스니커즈|로퍼|구두|부츠|샌들|모자|캡|비니|목도리|머플러|스카프|벨트|양말|안경|선글라스|시계|목걸이|귀걸이|반지|팔찌|bag|tote|backpack|shoes|sneaker|loafer|boots|hat|cap|beanie|scarf|belt|socks|watch|necklace|acc/i],
  ["top", /셔츠|블라우스|티셔츠|티\b|맨투맨|후드|니트|스웨터|폴로|탑|나시|민소매|원피스|shirt|blouse|tee|t-shirt|sweat|hoodie|knit|sweater|polo|top/i],
];

/** 옷 이름·링크에 들어 있는 단어로 종류를 추천해요. 모르면 null. */
export function guessCategory(...texts: (string | undefined)[]): Category | null {
  const text = texts.filter(Boolean).join(" ");
  if (!text.trim()) return null;
  return KEYWORDS.find(([, re]) => re.test(text))?.[0] ?? null;
}

export interface ClassifyResult {
  category: Category | null;
  /** 사진만 있을 때 AI가 붙여 준 이름 (예: "베이지 니트") */
  name?: string;
  by: "ai" | "keyword" | "none";
}

/** 화면에서 부르는 함수: AI 분류를 먼저 시도하고, 안 되면 단어로 추천해요. */
export async function classifyItem(input: { name?: string; link?: string; image?: string }): Promise<ClassifyResult> {
  try {
    const res = await fetch("/api/classify", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(input),
    });
    if (res.ok) {
      const data: { category?: string; name?: string } = await res.json();
      const category = CATEGORIES.find((c) => c === data.category) ?? null;
      if (category) return { category, name: data.name || undefined, by: "ai" };
    }
  } catch {
    // 네트워크 오류 등은 아래 단어 추천으로 넘어가요.
  }
  const category = guessCategory(input.name, input.link);
  return { category, by: category ? "keyword" : "none" };
}
