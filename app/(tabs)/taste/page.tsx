"use client";

import { useEffect, useRef, useState } from "react";
import { cn, TabHeader } from "@/components/ui";
import { TASTE_PHOTOS, TASTE_SET_SIZE, tastePhoto, type Gender } from "@/lib/data";
import { allTastePicks, setApp, useApp } from "@/lib/store";

/** 고른 사진의 태그를 세어 많이 나온 순서로 돌려줍니다. */
function rankTags(picks: string[]) {
  const count = new Map<string, number>();
  picks.map(tastePhoto).forEach((p) => p && count.set(p.tag, (count.get(p.tag) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
}

function Row({ label, title, desc, children }: { label: string; title: string; desc: string; children?: React.ReactNode }) {
  return (
    <div className="flex flex-col gap-[1.9px] leading-[1.4]">
      <p className="text-[10px] font-medium text-sub">{label}</p>
      <p className="text-[12px] font-bold">{title}</p>
      <p className="text-[10px] text-sub">{desc}</p>
      {children}
    </div>
  );
}

/** 사진 이름들을 랜덤 순서로 섞어요 */
function shuffle(ids: string[]) {
  const a = [...ids];
  for (let i = a.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [a[i], a[j]] = [a[j], a[i]];
  }
  return a;
}

/** 저장해 둔 순서가 지금 성별의 사진 목록과 같은 사진들인지 */
const validOrder = (order: string[], gender: Gender) => {
  const ids = TASTE_PHOTOS[gender].map((p) => p.id);
  return order.length === ids.length && ids.every((id) => order.includes(id));
};

/** Figma 08 · 취향 찾기 */
export default function TastePage() {
  const app = useApp();
  const { tasteRound, tasteOrder, profile } = app;
  // 온보딩 '좋아하는 스타일'에서 고른 사진도 취향에 함께 반영해요
  const tastePicks = allTastePicks(app);
  const gender = profile.gender;
  // 지금 묶음에서 고른 사진 (저장하면 tastePicks에 더해지고, 다음 9장으로 넘어가요)
  const [picked, setPicked] = useState<string[]>([]);
  const [saved, setSaved] = useState(false);
  const timer = useRef<number | undefined>(undefined);
  useEffect(() => () => window.clearTimeout(timer.current), []);

  // 처음 들어오면(또는 성별·사진 목록이 바뀌면) 사진을 랜덤으로 섞어요
  const ready = validOrder(tasteOrder ?? [], gender);
  useEffect(() => {
    // 저장된 값을 다시 확인하고 섞어요 (화면이 막 열릴 때 잠깐 보이는 빈 값으로 덮어쓰지 않게)
    if (!ready)
      setApp((s) =>
        validOrder(s.tasteOrder ?? [], s.profile.gender) ? {} : { tasteOrder: shuffle(TASTE_PHOTOS[s.profile.gender].map((p) => p.id)), tasteRound: 0 },
      );
  }, [ready, gender]);
  const sets = Math.ceil(TASTE_PHOTOS[gender].length / TASTE_SET_SIZE);
  const round = (tasteRound ?? 0) % sets;
  const photos = ready
    ? tasteOrder
        .slice(round * TASTE_SET_SIZE, round * TASTE_SET_SIZE + TASTE_SET_SIZE)
        .map(tastePhoto)
        .filter((p) => !!p)
    : [];
  const ranked = rankTags([...new Set([...tastePicks, ...picked])]);
  const total = ranked.reduce((sum, [, n]) => sum + n, 0);
  const direction = ranked.map(([t]) => t).join(" · ");
  const toggle = (id: string) => {
    if (saved) return;
    setPicked((cur) => (cur.includes(id) ? cur.filter((n) => n !== id) : [...cur, id]));
  };
  const save = () => {
    if (!picked.length || saved) return;
    setApp((s) => ({ tastePicks: [...new Set([...s.tastePicks, ...picked])] }));
    setSaved(true);
    // '저장했어요'를 잠깐 보여 준 뒤 다음 9장으로
    timer.current = window.setTimeout(() => {
      setApp((s) => {
        const next = (s.tasteRound ?? 0) + 1;
        // 모든 사진을 다 봤으면 다시 섞어서 처음부터
        if (next % sets === 0) return { tasteRound: 0, tasteOrder: shuffle(TASTE_PHOTOS[gender].map((p) => p.id)) };
        return { tasteRound: next };
      });
      setPicked([]);
      setSaved(false);
    }, 1100);
  };

  return (
    <>
      <TabHeader title="취향 찾기" />
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[8.6px] overflow-y-auto px-[15.85px] pt-[10.7px] pb-[12.8px]">
        <h2 className="text-[21px] leading-[1.35] font-bold">
          좋아하는 장면을 모으면,
          <br />
          나만의 취향이 보여요.
        </h2>
        <p className="flex text-[10px] leading-[1.4] text-sub">
          <span className="flex-1">마음이 가는 사진을 눌러 보세요. 여러 장 선택할 수 있어요.</span>
          <span className="shrink-0 font-medium text-plum">{picked.length ? `${picked.length}장 선택` : ""}</span>
        </p>

        <div key={`${tasteRound}-${tasteOrder?.[0]}`} className="mx-auto grid min-h-[312px] animate-[pop_.35s_ease] grid-cols-[repeat(3,80px)] gap-1.5">
          {photos.map((p) => {
            const on = picked.includes(p.id);
            return (
              <button
                key={p.id}
                type="button"
                aria-pressed={on}
                aria-label={`취향 사진 · ${p.tag}`}
                onClick={() => toggle(p.id)}
                className="relative h-[100px] w-20 overflow-hidden rounded-[3.3px]"
              >
                <img src={p.src} alt="" className="absolute inset-0 size-full rounded-[3.3px] object-cover" />
                {on && (
                  <>
                    <span className="absolute inset-0 rounded-[3.3px] border-[2.5px] border-plum" />
                    <span className="absolute top-1.5 right-1.5 flex size-5 items-center justify-center rounded-[10px] bg-plum text-[12px] font-bold text-white">
                      ✓
                    </span>
                  </>
                )}
              </button>
            );
          })}
        </div>

        <button
          type="button"
          onClick={save}
          disabled={!picked.length && !saved}
          aria-live="polite"
          className={cn(
            "flex h-11 w-full shrink-0 items-center justify-center rounded-[10px] px-4 py-3 text-[14px] font-bold text-white transition-colors active:opacity-85",
            saved ? "bg-plum-soft" : "bg-plum disabled:opacity-40",
          )}
        >
          {saved ? "저장했어요 ✓" : picked.length ? "저장하기" : "사진을 골라 주세요"}
        </button>
        <p className="-mt-1 text-center text-[9.5px] text-faint">
          {tastePicks.length ? `지금까지 ${tastePicks.length}장 저장 · ` : ""}저장하면 새로운 사진 9장이 나와요
        </p>

        <section className="flex flex-col gap-[6.7px] rounded-[9.25px] bg-lav px-[10.6px] py-[8.6px]">
          <h3 className="text-[14px] leading-[1.4] font-bold text-plum">지금, 나의 취향 현황</h3>
          <Row label="나의 추구미" title={direction || "아직 알아가는 중"} desc={direction ? "선택한 사진에서 찾은 방향이에요." : "사진을 고르면 방향을 찾아드려요."}>
            <div className="flex gap-[1.4px]">
              {ranked.map(([tag, n], i) => (
                <span key={tag} style={{ flex: n / total }} className={cn("h-[2.64px] rounded-[1.32px]", i === 0 ? "bg-plum" : "bg-plum-soft")} />
              ))}
            </div>
          </Row>
          <Row label="실제로 가장 많이 입는 스타일" title="아직 알아가는 중" desc="옷장에 착용 기록을 남기면 보여드려요." />
          <Row
            label="퍼스널 데이터 기반 추천"
            title={ranked[0] ? `편안한 ${ranked[0][0]} · 예시` : "아직 알아가는 중"}
            desc="선택한 취향과 기본 정보를 참고했어요."
          />
        </section>
      </main>
    </>
  );
}
