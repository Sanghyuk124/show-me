"use client";

import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn } from "@/components/ui";
import { useEffect } from "react";
import { STYLE_PICK_COUNT, TASTE_PHOTOS, tastePhoto, type Gender } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** 성별에 맞는 취향 사진 18장 중 랜덤 12장 */
function randomTwelve(gender: Gender) {
  const ids = TASTE_PHOTOS[gender].map((p) => p.id);
  for (let i = ids.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [ids[i], ids[j]] = [ids[j], ids[i]];
  }
  return ids.slice(0, STYLE_PICK_COUNT);
}

/** 저장해 둔 12장이 지금 성별의 사진들인지 (성별을 바꾸면 다시 골라요) */
const validOrder = (order: string[], gender: Gender) =>
  order.length === Math.min(STYLE_PICK_COUNT, TASTE_PHOTOS[gender].length) && order.every((id) => TASTE_PHOTOS[gender].some((p) => p.id === id));

/** Figma 04 · 좋아하는 스타일 */
export default function StyleStep() {
  const { stylePicks, styleOrder, profile } = useApp();
  const gender = profile.gender;
  const ready = validOrder(styleOrder ?? [], gender);
  useEffect(() => {
    // 저장된 값을 다시 확인하고 섞어요 (화면이 막 열릴 때 잠깐 보이는 빈 값으로 덮어쓰지 않게)
    if (!ready) setApp((s) => (validOrder(s.styleOrder ?? [], s.profile.gender) ? {} : { styleOrder: randomTwelve(s.profile.gender), stylePicks: [] }));
  }, [ready, gender]);
  const photos = ready ? styleOrder.map(tastePhoto).filter((p) => !!p) : [];
  const toggle = (id: string) =>
    setApp((s) => ({ stylePicks: s.stylePicks.includes(id) ? s.stylePicks.filter((n) => n !== id) : [...s.stylePicks, id] }));

  return (
    <OnboardingFrame step={3} title="좋아하는 스타일" back="/onboarding/concerns" cta="쇼핑메이트와 시작하기" next="/chat">
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

        <div className="mx-auto grid min-h-[452px] grid-cols-[repeat(3,86px)] gap-[3.84px]">
          {photos.map((p, i) => {
            const on = stylePicks.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`스타일 사진 ${i + 1} · ${p.tag}`}
                onClick={() => toggle(p.id)}
                className={cn(
                  // Figma에서 6번째 사진만 높이가 103.66px이에요.
                  "relative w-[86px] self-center overflow-hidden rounded-[3.77px] border-[1.5px]",
                  i === 5 ? "h-[103.66px]" : "h-[110px]",
                  on ? "border-plum" : "border-transparent",
                )}
              >
                <img src={p.src} alt="" className="absolute inset-0 size-full object-cover" />
                {/* 고른 사진: 오른쪽 위 체크 표시 (취향 찾기와 같은 모양) */}
                {on && (
                  <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-[10px] bg-plum text-[12px] font-bold text-white">
                    ✓
                  </span>
                )}
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
