"use client";

import { useGoBack } from "@/components/ui";
import { BRANDS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** Figma 09-1 · 관심 브랜드 추가 */
export default function AddBrandsPage() {
  const { followed } = useApp();
  const back = useGoBack("/calendar");
  const available = BRANDS.filter((b) => !followed.includes(b.id));

  return (
    <>
      <header className="pt-safe flex shrink-0 items-center gap-2.5 px-6 pb-2.5">
        <button type="button" aria-label="목록 닫고 이전 화면" onClick={back} className="flex h-8 w-6 shrink-0 items-center justify-center">
          <img src="/icons/back-24.svg" alt="" width={24} height={24} className="block size-6" />
        </button>
        <h1 className="min-w-0 flex-1 text-[17px] leading-6 font-bold">관심 브랜드 추가</h1>
      </header>
      <div className="flex shrink-0 flex-col gap-[9px] px-6 pt-[15px] pb-5">
        <h2 className="text-[22px] leading-[29px] font-bold">새로운 취향을 만나보세요.</h2>
        <p className="text-[12px] leading-[19px] text-sub">이미 찜한 브랜드는 목록에서 제외했어요.</p>
      </div>
      <main className="no-scrollbar animate-rise flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto px-[18px] pb-[18px]">
        <div className="flex h-6 shrink-0 items-center gap-1">
          <h3 className="flex-1 text-[14px] leading-[21px] font-bold">추가할 수 있는 브랜드</h3>
          <span className="min-w-3 text-[12px] leading-[19px] font-bold text-plum">{available.length}</span>
          <span className="w-[13px] text-[12px] leading-[19px] text-sub">개</span>
        </div>
        <ul className="flex flex-col gap-2">
          {available.map((b) => (
            <li key={b.id} className="flex h-[72px] items-center gap-3 rounded-[9px] border border-line bg-white px-3.5 py-3">
              <div className="flex min-w-0 flex-1 flex-col justify-center gap-[3px]">
                <p className="text-[14px] leading-[21px] font-bold">{b.name}</p>
                <p className="text-[10px] leading-[17px] text-sub">
                  {b.en} · {b.type}
                </p>
              </div>
              <button
                type="button"
                aria-label={`${b.name} 관심 브랜드 추가`}
                onClick={() => setApp((s) => ({ followed: [...s.followed, b.id] }))}
                className="flex h-7 w-[61px] shrink-0 items-center justify-center rounded-[15px] border-[0.75px] border-line bg-white text-[10px] leading-[1.4] text-sub"
              >
                ＋ 추가
              </button>
            </li>
          ))}
          {available.length === 0 && <li className="py-8 text-center text-[12px] text-sub">모든 브랜드를 담았어요.</li>}
        </ul>
      </main>
      <div className="pb-safe shrink-0 px-6 pt-3.5">
        <button type="button" onClick={back} className="h-11 w-full rounded-lg bg-plum text-[13px] leading-5 font-bold text-white active:opacity-85">
          달력으로 돌아가기
        </button>
      </div>
    </>
  );
}
