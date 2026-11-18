"use client";

import { PhotoTile } from "@/components/PhotoTile";
import { PrimaryButton, TabHeader } from "@/components/ui";
import { TASTE_PHOTOS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** 고른 사진의 태그를 세어 많이 나온 순서로 돌려줍니다. */
function rankTags(picks: number[]) {
  const count = new Map<string, number>();
  TASTE_PHOTOS.filter((p) => picks.includes(p.id)).forEach((p) => count.set(p.tag, (count.get(p.tag) ?? 0) + 1));
  return [...count.entries()].sort((a, b) => b[1] - a[1]).slice(0, 2);
}

const same = (a: number[] | null, b: number[]) => !!a && a.length === b.length && a.every((n) => b.includes(n));

function Row({ label, title, desc }: { label: string; title: string; desc: string }) {
  return (
    <div className="mt-2.5 first:mt-2">
      <p className="text-[10px] text-sub">{label}</p>
      <p className="mt-0.5 text-[12px] font-bold">{title}</p>
      <p className="mt-0.5 text-[10px] text-sub">{desc}</p>
    </div>
  );
}

export default function TastePage() {
  const { tastePicks, tasteSaved } = useApp();
  const ranked = rankTags(tastePicks);
  const total = ranked.reduce((sum, [, n]) => sum + n, 0);
  const direction = ranked.map(([t]) => t).join(" · ");
  const saved = same(tasteSaved, tastePicks);
  const toggle = (id: number) =>
    setApp((s) => ({ tastePicks: s.tastePicks.includes(id) ? s.tastePicks.filter((n) => n !== id) : [...s.tastePicks, id] }));

  return (
    <>
      <TabHeader title="취향 찾기" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <h2 className="text-[20px] leading-[27px] font-bold">
          좋아하는 장면을 모으면,
          <br />
          나만의 취향이 보여요.
        </h2>
        <p className="mt-2 text-[10px] text-sub">마음이 가는 사진을 눌러보세요.&nbsp;&nbsp;{tastePicks.length}개 선택</p>

        <div className="mx-auto mt-2 grid w-[68%] grid-cols-3 gap-[7px]">
          {TASTE_PHOTOS.map((p) => (
            <PhotoTile key={p.id} src={p.src} aspect="78 / 97" label={`취향 사진 ${p.id}`} on={tastePicks.includes(p.id)} onClick={() => toggle(p.id)} />
          ))}
        </div>

        <PrimaryButton className="mt-2 h-[43px]" onClick={() => setApp((s) => ({ tasteSaved: s.tastePicks }))}>
          {saved ? "저장했어요" : "저장하기"}
        </PrimaryButton>

        <section className="mt-2 rounded-lg bg-lav px-2.5 py-2.5">
          <h3 className="text-[13px] font-bold text-plum">지금, 나의 취향 현황</h3>
          <Row label="나의 추구미" title={direction || "아직 알아가는 중"} desc={direction ? "선택한 사진에서 찾은 방향이에요." : "사진을 고르면 방향을 찾아드려요."} />
          <div className="mt-1 flex h-[3px] gap-0.5">
            {ranked.map(([tag, n], i) => (
              <span key={tag} style={{ flex: n / total }} className={i === 0 ? "rounded-full bg-plum" : "rounded-full bg-plum-soft"} />
            ))}
          </div>
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
