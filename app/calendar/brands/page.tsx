"use client";

import { Plus } from "lucide-react";
import { BackButton, PrimaryButton, StackHeader, useGoBack } from "@/components/ui";
import { BRANDS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

export default function AddBrandsPage() {
  const { followed } = useApp();
  const back = useGoBack("/calendar");
  const available = BRANDS.filter((b) => !followed.includes(b.id));

  return (
    <>
      <StackHeader title="관심 브랜드 추가" left={<BackButton fallback="/calendar" />} />
      <main className="no-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto px-[18px] pt-5 pb-4">
        <div className="px-1.5">
          <h2 className="text-[21px] font-bold">새로운 취향을 만나보세요.</h2>
          <p className="mt-1.5 text-[11px] text-sub">이미 찜한 브랜드는 목록에서 제외했어요.</p>
        </div>
        <div className="mt-9 flex items-center justify-between">
          <h3 className="text-[13px] font-bold">추가할 수 있는 브랜드</h3>
          <span className="text-[10.5px] text-sub">
            <b className="text-ink">{available.length}</b>&nbsp;&nbsp;개
          </span>
        </div>
        <ul className="mt-3 space-y-2">
          {available.map((b) => (
            <li key={b.id} className="flex h-[70px] items-center justify-between rounded-lg border border-line bg-white px-3.5">
              <div>
                <p className="text-[13.5px] font-medium">{b.name}</p>
                <p className="mt-1 text-[9.5px] text-sub">
                  {b.en} · {b.type}
                </p>
              </div>
              <button
                type="button"
                aria-label={`${b.name} 추가`}
                onClick={() => setApp((s) => ({ followed: [...s.followed, b.id] }))}
                className="flex h-7 items-center gap-0.5 rounded-full border border-line px-3.5 text-[10px] text-sub"
              >
                <Plus className="size-2.5" /> 추가
              </button>
            </li>
          ))}
          {available.length === 0 && <li className="py-8 text-center text-[12px] text-sub">모든 브랜드를 담았어요.</li>}
        </ul>
      </main>
      <div className="pb-safe shrink-0 px-6 pt-2">
        <PrimaryButton onClick={back}>달력으로 돌아가기</PrimaryButton>
      </div>
    </>
  );
}
