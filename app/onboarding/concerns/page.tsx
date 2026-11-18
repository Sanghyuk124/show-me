"use client";

import { useRouter } from "next/navigation";
import { Check, Plus } from "lucide-react";
import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn } from "@/components/ui";
import { CONCERNS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

export default function ConcernsStep() {
  const router = useRouter();
  const { concerns, concernNote } = useApp();
  const toggle = (id: string) =>
    setApp((s) => ({ concerns: s.concerns.includes(id) ? s.concerns.filter((c) => c !== id) : [...s.concerns, id] }));
  const etcOn = concerns.includes("etc");

  return (
    <OnboardingFrame step={2} title="패션 고민" back="/onboarding/profile" cta="다음" onNext={() => router.push("/onboarding/style")}>
      <h2 className="text-[24px] leading-8 font-bold">
        어떤 고민을
        <br />
        함께 풀어볼까요?
      </h2>
      <p className="mt-2 text-[12px] leading-[19px] text-sub">
        지금 가장 궁금한 걸 골라주세요.
        <br />
        여러 개 선택해도 괜찮아요.
      </p>

      <div className="mt-3 space-y-2.5">
        {CONCERNS.map((c, i) => {
          const on = concerns.includes(c.id);
          return (
            <div key={c.id} className={cn("rounded-xl border transition", on ? "border-plum bg-lav" : "border-line bg-white")}>
              <button type="button" aria-pressed={on} onClick={() => toggle(c.id)} className="flex h-[68px] w-full items-center px-[18px] text-left">
                <span className="w-[30px] text-[12px] text-sub">0{i + 1}</span>
                <span className="flex-1">
                  <span className="block text-[15px] font-medium">{c.title}</span>
                  <span className="mt-1 block text-[11px] text-sub">{c.desc}</span>
                </span>
                {on ? <Check className="size-4 text-plum" strokeWidth={1.8} /> : <Plus className="size-4 text-faint" strokeWidth={1.4} />}
              </button>
              {c.id === "etc" && (
                <div className="px-[18px] pb-3">
                  <textarea
                    value={concernNote}
                    aria-label="기타 고민"
                    placeholder="고민이나 요청 사항을 자유롭게 적어 주세요."
                    onFocus={() => !etcOn && toggle("etc")}
                    onChange={(e) => setApp(() => ({ concernNote: e.target.value }))}
                    className={cn(
                      "h-[82px] w-full resize-none rounded-md border border-line p-3 text-[11px] outline-none placeholder:text-sub",
                      etcOn ? "bg-white" : "bg-cream",
                    )}
                  />
                </div>
              )}
            </div>
          );
        })}
      </div>

      <div className="mt-6 px-3 text-[11px] leading-[18px] text-sub">
        <p className="mb-1 font-bold text-plum">패션을 잘 몰라도 괜찮아요.</p>
        정답을 고르는 게 아니라,
        <br />
        나만의 기준을 함께 만들어 가는 거예요.
      </div>
    </OnboardingFrame>
  );
}
