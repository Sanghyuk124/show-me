"use client";

import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn } from "@/components/ui";
import { CONCERNS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** Figma 03 · 패션 고민 선택 */
export default function ConcernsStep() {
  const { concerns, concernNote } = useApp();
  const toggle = (id: string) =>
    setApp((s) => ({ concerns: s.concerns.includes(id) ? s.concerns.filter((c) => c !== id) : [...s.concerns, id] }));
  const etcOn = concerns.includes("etc");

  return (
    <OnboardingFrame
      step={2}
      title="패션 고민"
      back="/onboarding/profile"
      cta="다음"
      next="/onboarding/style"
      footer={<div className="h-[21px]" />}
    >
      <div className="flex flex-col gap-2.5 px-[23.7px] py-4">
        <h2 className="text-[26.7px] leading-8 font-bold">
          어떤 고민을
          <br />
          함께 풀어볼까요?
        </h2>
        <p className="text-[12.9px] leading-[1.5] text-sub">
          지금 가장 궁금한 걸 골라주세요.
          <br />
          여러 개 선택해도 괜찮아요.
        </p>

        {CONCERNS.map((c, i) => {
          const on = concerns.includes(c.id);
          return (
            <div
              key={c.id}
              className={cn(
                "flex flex-col gap-3 rounded-[13.8px] border-[0.99px] px-[17.8px] py-3 transition",
                on ? "border-plum bg-lav" : "border-line bg-white",
              )}
            >
              <button type="button" aria-pressed={on} onClick={() => toggle(c.id)} className="flex w-full items-center gap-[13.8px] text-left leading-[1.5]">
                <span className="text-[12.9px] font-medium text-plum">0{i + 1}</span>
                <span className="flex min-w-0 flex-1 flex-col gap-1.5">
                  <span className="text-[15.8px] font-bold">{c.title}</span>
                  <span className="text-[10.9px] text-sub">{c.desc}</span>
                </span>
                <span className={cn("w-[18px] text-center text-[16.8px] font-medium", on ? "text-plum" : "text-faint")}>{on ? "✓" : "＋"}</span>
              </button>
              {c.id === "etc" && (
                <textarea
                  value={concernNote}
                  aria-label="기타 고민"
                  placeholder="고민이나 요청 사항을 자유롭게 적어 주세요."
                  onFocus={() => !etcOn && toggle("etc")}
                  onChange={(e) => setApp(() => ({ concernNote: e.target.value }))}
                  className="h-[84px] w-full resize-none rounded-lg border border-line bg-[#faf8f9] p-3 text-[10.9px] leading-[18px] outline-none placeholder:text-sub"
                />
              )}
            </div>
          );
        })}

        <div className="flex flex-col gap-1 p-[11.9px] text-[11.9px] leading-[1.5]">
          <p className="font-medium text-plum">패션을 잘 몰라도 괜찮아요.</p>
          <p className="text-sub">
            정답을 고르는 게 아니라,
            <br />
            나만의 기준을 함께 만들어 가는 거예요.
          </p>
        </div>
      </div>
    </OnboardingFrame>
  );
}
