"use client";

import { useState } from "react";
import Link from "next/link";
import { cn, Modal, TabHeader } from "@/components/ui";
import { BRANDS, SALE_EVENTS, type SaleEvent } from "@/lib/data";
import { daysBetween, longDate, monthCells, monthDot, todayISO, toISO, WEEKDAYS } from "@/lib/date";
import { setApp, showToast, useApp } from "@/lib/store";

const eventsOn = (iso: string) => SALE_EVENTS.filter((e) => e.start <= iso && iso <= e.end);

function statusOf(e: SaleEvent, today: string) {
  return e.start <= today ? "진행 중" : `D–${daysBetween(today, e.start)}`;
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
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[11.5px] overflow-y-auto px-[18px] pt-[13.6px] pb-[16.3px]">
        <h2 className="text-[21px] leading-[1.35] font-bold">
          좋아하는 브랜드,
          <br />
          좋은 타이밍에 만나요.
        </h2>

        <div className="flex flex-wrap gap-[5.1px]">
          {followed.map((b) => (
            <button
              key={b.id}
              type="button"
              aria-label={`${b.name} 관심 해제`}
              onClick={() => {
                setApp((s) => ({ followed: s.followed.filter((id) => id !== b.id) }));
                showToast(`${b.name}을(를) 관심 브랜드에서 뺐어요.`);
              }}
              className="rounded-[15px] border-[0.75px] border-plum bg-plum px-[6.8px] py-[6.1px] text-[10px] leading-[1.4] font-medium whitespace-pre text-white"
            >
              {`♥  ${b.name}`}
            </button>
          ))}
          <Link href="/calendar/brands" className="rounded-[15px] border-[0.75px] border-line bg-white px-[6.8px] py-[6.1px] text-[10px] leading-[1.4] text-sub">
            ＋ 관심 브랜드
          </Link>
        </div>

        <section className="flex flex-col gap-[9px] rounded-[10.56px] border-[0.75px] border-line bg-white px-3 py-[10.86px]">
          <div className="flex items-center leading-[1.4]">
            <button type="button" aria-label="이전 달" onClick={() => move(-1)} className="text-[16.6px] text-sub">
              ‹
            </button>
            <h3 className="flex-1 text-center text-[14px] font-bold">
              {view.y}년 {view.m}월
            </h3>
            <button type="button" aria-label="다음 달" onClick={() => move(1)} className="text-[16.6px] text-sub">
              ›
            </button>
          </div>
          <div className="grid grid-cols-7 gap-[1.28px] text-center text-[10px] leading-[1.4] font-medium">
            {WEEKDAYS.map((d, i) => (
              <span key={d} className={i === 0 ? "text-sun" : "text-sub"}>
                {d}
              </span>
            ))}
          </div>
          <div className="grid grid-cols-7 gap-x-[1.28px] gap-y-[9px]">
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
                    "flex flex-col items-center gap-[0.64px] rounded-[7px] py-[3.4px] text-[10px] leading-[1.4]",
                    app.selectedDate === iso && "bg-plum/14",
                    i % 7 === 0 && "text-sun",
                  )}
                >
                  {day}
                  {hasEvent ? (
                    <img src="/icons/dot-event.svg" alt="" width={2.26} height={2.26} className="block size-[2.26px]" />
                  ) : (
                    <span className="block size-[2.26px]" />
                  )}
                </button>
              );
            })}
          </div>
          <p className="text-center text-[10px] leading-[1.4] text-sub">● 세일·팝업 일정 · 날짜를 눌러 확인</p>
        </section>

        <div className="flex items-start leading-[1.4]">
          <h3 className="flex-1 text-[14px] font-bold">놓치지 말아야 할 일정</h3>
          <span className="text-[10px] text-sub">{upcoming.length}개</span>
        </div>
        {upcoming.map((e) => (
          <article key={e.id} className="flex flex-col gap-[5.1px] rounded-[9px] border-[0.75px] border-line bg-white px-3 py-[10.86px] leading-[1.4]">
            <div className="flex text-[10px] text-plum">
              <span className="flex-1 font-medium">{e.brand}</span>
              <span className="font-bold">{statusOf(e, today)}</span>
            </div>
            <div className="flex text-[12px] font-bold">
              <h4 className="flex-1">{e.title}</h4>
              {e.discount && <span className="text-plum">{e.discount}</span>}
            </div>
            <p className="text-[10px] whitespace-pre-wrap text-sub">{`${monthDot(e.start)} – ${monthDot(e.end)}  ·  ${e.listPlace}`}</p>
          </article>
        ))}
        {upcoming.length === 0 && (
          <p className="rounded-[9px] border-[0.75px] border-line bg-white py-5 text-center text-[11px] text-sub">관심 브랜드의 예정된 일정이 없어요.</p>
        )}

        <button
          type="button"
          role="switch"
          aria-checked={app.saleAlert}
          onClick={() => setApp((s) => ({ saleAlert: !s.saleAlert }))}
          className="flex items-start gap-[6.4px] rounded-[7.54px] bg-lav px-[10.56px] py-[9.5px]"
        >
          <span className="flex-1 text-left text-[10px] leading-[1.4] font-medium text-plum">관심 브랜드의 세일 시작 알림 받기</span>
          {app.saleAlert ? (
            <img src="/icons/toggle-on.svg" alt="" width={24.13} height={15.08} className="block h-[15.08px] w-[24.13px]" />
          ) : (
            <span className="relative block h-[15.08px] w-[24.13px] rounded-[7.54px] bg-[#dbd4d9]">
              <span className="absolute top-[2.04px] left-[2.26px] size-[10.56px] rounded-full bg-white" />
            </span>
          )}
        </button>
      </main>

      {popup && (
        <Modal
          title={longDate(popup)}
          onClose={() => setPopup(null)}
          align="center"
          hideClose
          className="max-w-[340px] gap-3.5 rounded-2xl border border-[#e8e0e5] p-5"
          titleClassName="text-[19px] leading-[26px]"
        >
          <p className="text-[12px] leading-[19px] text-sub">진행 중인 행사 {popupEvents.length}개</p>
          {popupEvents.map((e) => (
            <article key={e.id} className="flex flex-col gap-1.5 rounded-[10px] bg-[#f7f4f6] p-3.5">
              <h3 className="text-[14px] leading-[21px] font-bold text-plum">
                {e.brand} · {e.title}
              </h3>
              <p className="text-[11px] leading-[18px] text-sub">
                {monthDot(e.start)}–{monthDot(e.end)} · {e.place}
              </p>
              <p className="text-[12px] leading-[19px]">{e.desc}</p>
            </article>
          ))}
          {popupEvents.length === 0 && <p className="rounded-[10px] bg-[#f7f4f6] p-3.5 text-center text-[12px] text-sub">이 날은 예정된 행사가 없어요.</p>}
          <button type="button" onClick={() => setPopup(null)} className="h-[42px] w-full rounded-lg bg-plum text-[12px] leading-[19px] font-bold text-white">
            달력으로 돌아가기
          </button>
        </Modal>
      )}
    </>
  );
}
