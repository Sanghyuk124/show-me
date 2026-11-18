"use client";

import type { ReactNode } from "react";
import { TextBack } from "./ui";

export const MAX_LINK = 128;
/** 링크에 쓰는 영문·숫자·특수문자만 남깁니다. */
export const cleanLink = (v: string) => v.replace(/[^\x21-\x7E]/g, "").slice(0, MAX_LINK);

/** Figma 06c·07b 링크 입력 화면 공통 틀 */
export function LinkScreen({
  title,
  back,
  heading,
  desc,
  cta,
  onSave,
  children,
}: {
  title: string;
  back: string;
  heading: ReactNode;
  desc: string;
  cta: string;
  onSave: () => void;
  children: ReactNode;
}) {
  return (
    <>
      <header className="pt-safe flex shrink-0 items-center gap-3 px-6 pb-3">
        <div className="flex h-[26px] w-10 shrink-0 items-center">
          <TextBack fallback={back} />
        </div>
        <h1 className="min-w-0 flex-1 text-[17px] leading-[23px] font-bold">{title}</h1>
      </header>
      <main className="no-scrollbar animate-rise flex min-h-0 flex-1 flex-col gap-[18px] overflow-y-auto px-6 pt-3 pb-5">
        <div className="flex flex-col gap-2">
          <h2 className="text-[22px] leading-7 font-bold">{heading}</h2>
          <p className="text-[11px] leading-[17px] text-sub">{desc}</p>
        </div>
        {children}
      </main>
      <div className="pb-safe shrink-0 px-6 pt-3">
        <button
          type="button"
          onClick={onSave}
          className="h-11 w-full rounded-lg bg-plum text-[13px] leading-[19px] font-bold text-white transition active:opacity-85"
        >
          {cta}
        </button>
      </div>
    </>
  );
}

export function LinkField({ label, value, onChange }: { label: string; value: string; onChange: (v: string) => void }) {
  return (
    <section className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5">
      <div className="flex h-5 items-center">
        <label htmlFor="link" className="flex-1 text-[12px] leading-[18px] font-bold">
          {label}
        </label>
        <span className="w-[72px] text-right text-[10px] leading-4 text-sub">
          {value.length} / {MAX_LINK}
        </span>
      </div>
      <textarea
        id="link"
        value={value}
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="예: https://brand.com/product/123"
        onChange={(e) => onChange(cleanLink(e.target.value))}
        className="h-32 w-full resize-none rounded-lg border border-line bg-white p-3 text-[13px] leading-[19px] break-all outline-none placeholder:text-sub focus:border-plum"
      />
      <p className="text-[10px] leading-4 text-sub">영문·숫자·URL 특수문자 최대 128자</p>
    </section>
  );
}
