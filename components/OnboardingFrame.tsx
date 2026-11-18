"use client";

import type { ReactNode } from "react";
import { BackButton, cn, PrimaryButton } from "./ui";

/** 온보딩 3단계 공통 틀 (Figma 02·03·04 화면의 헤더·진행 막대·하단 버튼) */
export function OnboardingFrame({
  step,
  title,
  back,
  cta,
  onNext,
  footer,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  back: string;
  cta: string;
  onNext: () => void;
  /** 버튼 아래 문구 (예: 건너뛰기) */
  footer?: ReactNode;
  children: ReactNode;
}) {
  return (
    <>
      <header className="pt-safe flex shrink-0 flex-col gap-2.5 px-6 pb-3">
        <div className="flex items-center gap-3">
          <BackButton fallback={back} />
          <h1 className="min-w-0 flex-1 text-[17px] leading-[1.5] font-bold">{title}</h1>
          <span className="text-[11px] leading-[1.5] font-medium text-plum">0{step} / 03</span>
        </div>
        <div className="flex gap-[5px]">
          {[1, 2, 3].map((n) => (
            <span key={n} className={cn("h-[3px] flex-1 rounded-[2px]", n <= step ? "bg-plum" : "bg-line")} />
          ))}
        </div>
      </header>
      <main className="no-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto">{children}</main>
      <div className="pb-safe flex shrink-0 flex-col gap-3 px-6 pt-3">
        <PrimaryButton onClick={onNext}>{cta}</PrimaryButton>
        {footer}
      </div>
    </>
  );
}
