// 쇼핑메이트의 답변을 만드는 곳입니다.
// 지금은 AI가 아니라 '미리 써둔 예시 답변'입니다.
// 실제 AI를 연결할 때는 getReply 함수 안쪽만 API 호출로 바꾸면 화면은 그대로 동작합니다.

import type { AppState } from "./store";

export interface Reply {
  text: string;
  chips?: string[];
}

export async function getReply(message: string, app: AppState): Promise<Reply> {
  await new Promise((r) => setTimeout(r, 700));
  const text = message.trim();
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
