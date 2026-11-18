"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowUp, Plus } from "lucide-react";
import { TabHeader } from "@/components/ui";
import { getReply } from "@/lib/chat";
import { setApp, useApp, type ChatMessage } from "@/lib/store";

const OUTFIT = [
  { label: "셔츠", src: "/images/closet/shirt.jpg" },
  { label: "가디건", src: "/images/closet/cardigan.jpg" },
  { label: "슬랙스", src: "/images/closet/slacks.jpg" },
];
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
const FIRST_CHIPS = ["자유로운 편이에요", "아직 잘 모르겠어요"];

function UserBubble({ children }: { children: React.ReactNode }) {
  return <div className="animate-rise rounded-xl bg-plum px-4 py-2.5 text-[12.5px] leading-[18px] whitespace-pre-line text-white">{children}</div>;
}
const BotName = () => <p className="text-[10px] font-bold text-plum">Show Me · 나만의 쇼핑메이트</p>;

function FirstAdvice() {
  return (
    <>
      <p className="text-center text-[10px] text-sub">첫 출근 상담 · 예시</p>
      <div className="mt-3">
        <UserBubble>
          다음 주 첫 출근인데 뭘 입어야 할까?
          {"\n"}너무 격식 차린 느낌은 싫어.
        </UserBubble>
      </div>
      <div className="mt-3.5">
        <BotName />
        <p className="mt-2 text-[12.5px] leading-[18px]">
          첫 출근, 설레면서도 고민되죠.
          <br />
          우선 옷장에 있는 옷으로 시작해볼까요?
        </p>
      </div>
      <section className="mt-2.5 rounded-xl border border-line bg-white px-3.5 pt-3 pb-2.5">
        <div className="flex items-center justify-between">
          <h2 className="text-[13px] font-bold">단정하지만 편안하게</h2>
          <span className="text-[10px] text-sub">내 옷 3벌</span>
        </div>
        <div className="mt-2.5 grid grid-cols-3 gap-[26px] px-2.5">
          {OUTFIT.map((o) => (
            <figure key={o.label} className="text-center">
              <img src={o.src} alt={o.label} className="aspect-square w-full rounded-lg object-cover" />
              <figcaption className="mt-1.5 text-[10px] text-sub">{o.label}</figcaption>
            </figure>
          ))}
        </div>
      </section>
      <section className="mt-2.5 rounded-xl bg-lav px-3.5 py-3">
        <h2 className="text-[12px] font-bold text-plum">왜 이 조합일까요?</h2>
        <ol className="mt-1.5 space-y-0.5 text-[10.5px] leading-[15px]">
          <li>01&nbsp;&nbsp;셔츠는 첫인상을 단정하게 잡아줘요.</li>
          <li>02&nbsp;&nbsp;가디건이 재킷보다 편안한 인상을 더해요.</li>
          <li>03&nbsp;&nbsp;비슷한 어두운 톤이 전체를 정돈해줘요.</li>
        </ol>
      </section>
      <p className="mt-3.5 text-[12.5px] leading-[18px]">
        가지고 있는 검정 토트백을 더하면 충분해요.
        <br />
        회사 복장 분위기는 어떤 편인가요?
      </p>
    </>
  );
}

function Message({ m }: { m: ChatMessage }) {
  if (m.role === "user") return <div className="mt-4 ml-10"><UserBubble>{m.text}</UserBubble></div>;
  return (
    <div className="animate-rise mt-4">
      <BotName />
      <p className="mt-2 text-[12.5px] leading-[18px] whitespace-pre-line">{m.text}</p>
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const app = useApp();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const listRef = useRef<HTMLElement>(null);
  const last = app.chat.at(-1);
  const chips = typing ? [] : last ? (last.chips ?? []) : FIRST_CHIPS;

  // 새 메시지가 오면 맨 아래로 내려갑니다.
  useEffect(() => {
    if (!app.chat.length && !typing) return;
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [app.chat.length, typing, chips.length]);

  const send = async (raw: string) => {
    const value = raw.trim();
    if (!value || typing) return;
    setText("");
    setTyping(true);
    setApp((s) => ({ chat: [...s.chat, { id: newId(), role: "user", text: value }] }));
    const reply = await getReply(value, app);
    setApp((s) => ({ chat: [...s.chat, { id: newId(), role: "bot", ...reply }] }));
    setTyping(false);
  };

  return (
    <>
      <TabHeader title="쇼핑메이트" />
      <main ref={listRef} className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[21px] pt-2 pb-3">
        <FirstAdvice />
        {app.chat.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {typing && (
          <div className="mt-4">
            <BotName />
            <p className="mt-2 animate-pulse text-[12.5px] text-faint">답변을 준비하고 있어요…</p>
          </div>
        )}
      </main>

      <div className="shrink-0 px-[21px] pb-2">
        {chips.length > 0 && (
          <div className="no-scrollbar mb-2.5 flex gap-1.5 overflow-x-auto">
            {chips.map((c) => (
              <button key={c} type="button" onClick={() => send(c)} className="h-[30px] shrink-0 rounded-full border border-line bg-white px-2.5 text-[10px] text-sub">
                {c}
              </button>
            ))}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex h-12 items-center gap-2 rounded-xl border border-line bg-white px-3 focus-within:border-ink/50"
        >
          <button type="button" aria-label="상품 링크 추가" onClick={() => router.push("/closet/link")} className="text-sub">
            <Plus className="size-[17px]" strokeWidth={1.4} />
          </button>
          <input
            value={text}
            aria-label="메시지"
            placeholder="고민이나 상품 링크를 보내주세요"
            onChange={(e) => setText(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[10.5px] placeholder:text-sub"
          />
          <button type="submit" aria-label="보내기" disabled={!text.trim() || typing} className="text-ink disabled:text-sub">
            <ArrowUp className="size-[18px]" strokeWidth={1.6} />
          </button>
        </form>
        <p className="mt-2 text-center text-[10px] text-sub">추천은 참고용이에요. 중요한 정보는 한 번 더 확인해요.</p>
      </div>
    </>
  );
}
