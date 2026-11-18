"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronLeft, ChevronRight, Heart, Plus } from "lucide-react";
import { cn, Modal, PrimaryButton, TabHeader } from "@/components/ui";
import { BRANDS, SALE_EVENTS, type SaleEvent } from "@/lib/data";
import { daysBetween, longDate, monthCells, monthDot, todayISO, toISO, WEEKDAYS } from "@/lib/date";
import { setApp, showToast, useApp } from "@/lib/store";

const eventsOn = (iso: string) => SALE_EVENTS.filter((e) => e.start <= iso && iso <= e.end);

function statusOf(e: SaleEvent, today: string) {
  return e.start <= today ? "진행 중" : `D-${daysBetween(today, e.start)}`;
}

export default function CalendarPage() {
  const app = useApp();
  const today = todayISO();
  const [view, setView] = useState(() => {
    const [y, m] = today.split("-").map(Number);
    return { y, m };
  });
  const [popup, setPopup] = useState<string | null>(null);

  const move = (delta: number) =>
    setView(({ y, m }) => {
      const next = m + delta;
      return next < 1 ? { y: y - 1, m: 12 } : next > 12 ? { y: y + 1, m: 1 } : { y, m: next };
    });

  const followed = app.followed.map((id) => BRANDS.find((b) => b.id === id)).filter((b) => !!b);
  const upcoming = SALE_EVENTS.filter((e) => e.brandId && app.followed.includes(e.brandId) && e.end >= today).sort((a, b) =>
    a.start.localeCompare(b.start),
  );
  const popupEvents = popup ? eventsOn(popup) : [];

  return (
    <>
      <TabHeader title="세일 캘린더" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[18px] pt-2 pb-4">
        <h2 className="text-[20px] leading-[27px] font-bold">
          좋아하는 브랜드,
          <br />
          좋은 타이밍에 만나요.
        </h2>

        <div className="mt-3 flex flex-wrap gap-[5px]">
          {followed.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${b.name} 관심 해제`}
              onClick={() => {
                setApp((s) => ({ followed: s.followed.filter((id) => id !== b.id) }));
                showToast(`${b.name}을(를) 관심 브랜드에서 뺐어요.`);
              }}
              className="flex h-[27px] items-center gap-1 rounded-full bg-plum px-2 text-[9.5px] font-medium text-white"
            >
              <Heart className="size-2.5" fill="currentColor" /> {b.name}
            </button>
          ))}
          <Link href="/calendar/brands" className="flex h-[27px] items-center gap-0.5 rounded-full border border-line bg-white px-2 text-[9.5px] text-sub">
            <Plus className="size-2.5" /> 관심 브랜드
          </Link>
        </div>

        <section className="mt-3 rounded-xl border border-line bg-white px-2 pt-2.5 pb-2.5">
          <div className="flex items-center justify-between px-1.5">
            <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="p-1 text-sub">
              <ChevronLeft className="size-3.5" />
            </button>
            <h3 className="text-[13.5px] font-medium">
              {view.y}년 {view.m}월
            </h3>
            <button type="button" aria-label="다음 달" onClick={() => move(1)} className="p-1 text-sub">
              <ChevronRight className="size-3.5" />
            </button>
          </div>
          <div className="mt-1.5 grid grid-cols-7 text-center text-[10px]">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={i === 0 ? "text-sun" : "text-sub"}>
                {d}
              </span>
            ))}
          </div>
          <div className="mt-1.5 grid grid-cols-7 gap-y-[9px]">
            {monthCells(view.y, view.m).map((day, i) => {
              if (!day) return <span key={`e${i}`} />;
              const iso = toISO(view.y, view.m, day);
              const hasEvent = eventsOn(iso).length > 0;
              return (
                <button
                  key={iso}
                  type="button"
                  aria-label={longDate(iso)}
                  onClick={() => {
                    setApp(() => ({ selectedDate: iso }));
                    setPopup(iso);
                  }}
                  className={cn(
                    "relative mx-auto h-[23px] w-[47px] rounded-md pb-1 text-[10px]",
                    app.selectedDate === iso && "bg-lav",
                    i % 7 === 0 && "text-sun",
                  )}
                >
                  {day}
                  {hasEvent && <span className="absolute bottom-0.5 left-1/2 size-[2.5px] -translate-x-1/2 rounded-full bg-sub" />}
                </button>
              );
            })}
          </div>
          <p className="mt-2.5 flex items-center justify-center gap-1 text-[9.5px] text-sub">
            <span className="size-[9px] rounded-full bg-sub" /> 세일·팝업 일정 · 날짜를 눌러 확인
          </p>
        </section>

        <div className="mt-4 flex items-center justify-between">
          <h3 className="text-[13px] font-bold">놓치지 말아야 할 일정</h3>
          <span className="text-[9.5px] text-sub">{upcoming.length}개</span>
        </div>
        <div className="mt-2.5 space-y-3">
          {upcoming.map((e) => (
            <article key={e.id} className="rounded-lg border border-line bg-white px-3 py-2.5">
              <div className="flex justify-between text-[9.5px]">
                <span className="text-sub">{e.brand}</span>
                <span className="font-bold text-plum">{statusOf(e, today)}</span>
              </div>
              <div className="mt-1 flex justify-between">
                <h4 className="text-[12px] font-medium">{e.title}</h4>
                {e.discount && <span className="text-[12px] font-bold text-plum">{e.discount}</span>}
              </div>
              <p className="mt-1 text-[9.5px] text-sub">
                {monthDot(e.start)} – {monthDot(e.end)}&nbsp;&nbsp;·&nbsp;&nbsp;{e.listPlace}
              </p>
            </article>
          ))}
          {upcoming.length === 0 && <p className="rounded-lg border border-line bg-white py-5 text-center text-[11px] text-sub">관심 브랜드의 예정된 일정이 없어요.</p>}
        </div>

        <div className="mt-3 flex h-[33px] items-center justify-between rounded-md bg-lav px-2.5">
          <span className="text-[9.5px] text-plum">관심 브랜드의 세일 시작 알림 받기</span>
          <button
            type="button"
            role="switch"
            aria-checked={app.saleAlert}
            aria-label="세일 시작 알림"
            onClick={() => setApp((s) => ({ saleAlert: !s.saleAlert }))}
            className={cn("relative h-[14px] w-6 rounded-full transition", app.saleAlert ? "bg-plum" : "bg-faint")}
          >
            <span className={cn("absolute top-0.5 size-2.5 rounded-full bg-white transition-all", app.saleAlert ? "left-3" : "left-0.5")} />
          </button>
        </div>
      </main>

      {popup && (
        <Modal title={longDate(popup)} onClose={() => setPopup(null)} align="center" hideClose>
          <p className="mt-3.5 text-[11px] text-sub">진행 중인 행사 {popupEvents.length}개</p>
          <div className="mt-3.5 space-y-2">
            {popupEvents.map((e) => (
              <article key={e.id} className="rounded-lg bg-[#f5f1f4] px-3.5 py-3">
                <h3 className="text-[13px] font-bold text-plum">
                  {e.brand} · {e.title}
                </h3>
                <p className="mt-1.5 text-[10.5px] text-sub">
                  {monthDot(e.start)}–{monthDot(e.end)} · {e.place}
                </p>
                <p className="mt-1.5 text-[11px]">{e.desc}</p>
              </article>
            ))}
            {popupEvents.length === 0 && <p className="rounded-lg bg-[#f5f1f4] px-3.5 py-5 text-center text-[11px] text-sub">이 날은 예정된 행사가 없어요.</p>}
          </div>
          <PrimaryButton className="mt-3 h-[41px]" onClick={() => setPopup(null)}>
            달력으로 돌아가기
          </PrimaryButton>
        </Modal>
      )}
    </>
  );
}
