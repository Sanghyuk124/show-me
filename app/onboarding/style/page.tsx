"use client";

import { useRouter } from "next/navigation";
import { OnboardingFrame } from "@/components/OnboardingFrame";
import { PhotoTile } from "@/components/PhotoTile";
import { STYLE_PHOTOS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

export default function StyleStep() {
  const router = useRouter();
  const { stylePicks } = useApp();
  const toggle = (i: number) =>
    setApp((s) => ({ stylePicks: s.stylePicks.includes(i) ? s.stylePicks.filter((n) => n !== i) : [...s.stylePicks, i] }));

  return (
    <OnboardingFrame step={3} title="좋아하는 스타일" back="/onboarding/concerns" cta="쇼핑메이트와 시작하기" onNext={() => router.push("/chat")}>
      <div className="-mt-3">
        <h2 className="text-[21px] leading-7 font-bold">
          눈길이 가는 스타일을
          <br />
          골라보세요.
        </h2>
        <p className="mt-2.5 text-[11.5px] leading-[17px] text-sub">
          이름을 몰라도 괜찮아요. 마음이 가는 사진부터!
          <br />
          여러 개 선택할 수 있어요.
        </p>
        <div className="mx-auto mt-2.5 grid w-[75%] grid-cols-3 gap-1">
          {STYLE_PHOTOS.map((src, i) => (
            <PhotoTile key={src} src={src} aspect="83 / 106" label={`스타일 사진 ${i + 1}`} on={stylePicks.includes(i)} onClick={() => toggle(i)} />
          ))}
        </div>
        <p className="mt-4 text-[9.5px] leading-[15px] text-sub">
          <span className="font-bold text-plum">아직 취향이 뚜렷하지 않아도 괜찮아요.</span>
          <br />
          건너뛰어도 나중에 ‘취향 찾기’ 탭에서
          <br />
          언제든 다시 선택할 수 있어요.
        </p>
      </div>
    </OnboardingFrame>
  );
}
