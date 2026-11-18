"use client";

import type { ReactNode } from "react";
import { BackButton, cn, PrimaryButton, StackHeader } from "./ui";

export function OnboardingFrame({
  step,
  title,
  back,
  cta,
  onNext,
  children,
}: {
  step: 1 | 2 | 3;
  title: string;
  back: string;
  cta: string;
  onNext: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <StackHeader
        title={title}
        left={<BackButton fallback={back} />}
        right={<span className="text-[10.5px] text-sub">0{step} / 03</span>}
      />
      <div className="flex shrink-0 gap-[5px] px-6">
        {[1, 2, 3].map((n) => (
          <span key={n} className={cn("h-[2.5px] flex-1 rounded-full", n <= step ? "bg-plum" : "bg-line")} />
        ))}
      </div>
      <main className="no-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto px-6 pt-7 pb-5">{children}</main>
      <div className="pb-safe shrink-0 px-6 pt-2">
        <PrimaryButton onClick={onNext}>{cta}</PrimaryButton>
      </div>
    </>
  );
}
