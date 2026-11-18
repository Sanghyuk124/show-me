"use client";

import { useRouter } from "next/navigation";
import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn } from "@/components/ui";
import { STYLE_PHOTOS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** Figma 04 · 좋아하는 스타일 */
export default function StyleStep() {
  const router = useRouter();
  const { stylePicks, profile } = useApp();
  const toggle = (i: number) =>
    setApp((s) => ({ stylePicks: s.stylePicks.includes(i) ? s.stylePicks.filter((n) => n !== i) : [...s.stylePicks, i] }));

  return (
    <OnboardingFrame step={3} title="좋아하는 스타일" back="/onboarding/concerns" cta="쇼핑메이트와 시작하기" onNext={() => router.push("/chat")}>
      <div className="flex flex-col gap-[10.2px] px-[18px] pt-[13.5px] pb-4">
        <h2 className="text-[21px] leading-[1.35] font-bold">
          눈길이 가는 스타일을
          <br />
          골라보세요.
        </h2>
        <p className="text-[12px] leading-[1.4] text-sub">
          이름을 몰라도 괜찮아요. 마음이 가는 사진부터!
          <br />
          여러 개 선택할 수 있어요.
        </p>

        <div className="mx-auto grid grid-cols-[repeat(3,86px)] gap-[3.84px]">
          {STYLE_PHOTOS[profile.gender].map((src, i) => {
            const on = stylePicks.includes(i);
            return (
              <button
                key={src}
                type="button"
                aria-pressed={on}
                aria-label={`스타일 사진 ${i + 1}`}
                onClick={() => toggle(i)}
                className={cn(
                  // Figma에서 6번째 사진만 높이가 103.66px이에요.
                  "relative w-[86px] self-center overflow-hidden rounded-[3.77px] border-[1.5px]",
                  i === 5 ? "h-[103.66px]" : "h-[110px]",
                  on ? "border-plum" : "border-transparent",
                )}
              >
                <img src={src} alt="" className="absolute inset-0 size-full object-cover" />
              </button>
            );
          })}
        </div>

        <div className="flex flex-col gap-[3.2px] pt-[2.7px] text-[10px] leading-[1.4]">
          <p className="font-medium text-plum">아직 취향이 뚜렷하지 않아도 괜찮아요.</p>
          <p className="text-sub">
            건너뛰어도 나중에 ‘취향 찾기’ 탭에서
            <br />
            언제든 다시 선택할 수 있어요.
          </p>
        </div>
      </div>
    </OnboardingFrame>
  );
}
