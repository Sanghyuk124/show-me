"use client";

import { useEffect, useState } from "react";
import dynamic from "next/dynamic";
import Link from "next/link";
import { BodyModal } from "@/components/BodyModal";
import { ClosetThumb } from "@/components/ClosetThumb";
import { itemStatus, MeasureModal } from "@/components/MeasureModal";
import { cn, TabHeader } from "@/components/ui";
import { resolveBody } from "@/lib/bodyModel";
import type { BodyLayout, GarmentReport } from "@/components/Avatar3D";
import { TryOn2D } from "@/components/TryOn2D";
import {
  FIT_COLOR,
  FIT_LABEL,
  garmentColor,
  missingFor,
  toGarment,
  type GarmentSpec,
} from "@/lib/garment";
import type { ClosetItem } from "@/lib/data";
import { lookPartOf, lookPhoto } from "@/lib/looks";
import { setApp, showToast, useApp, myCloset } from "@/lib/store";

// 3D 그래픽은 브라우저에서만 그릴 수 있어서, 화면이 열린 뒤에 불러와요.
const Avatar3D = dynamic(
  () => import("@/components/Avatar3D").then((m) => m.Avatar3D),
  {
    ssr: false,
    loading: () => (
      <div className="h-[250px] w-full animate-pulse rounded-[6.9px] bg-white/40" />
    ),
  },
);

export default function AvatarPage() {
  const app = useApp();
  const closet = myCloset(app);
  const [bodyOpen, setBodyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = closet.find((i) => i.id === openId);
  // 키·몸무게·성별과 상세 치수로 3D 아바타 모양을 정해요 (lib/bodyModel.ts)
  const shape = resolveBody(app.profile, app.body);

  // ── 옷 입혀 보기 ──
  const fitView = false;
  // 기본은 2D 입어보기 (실제 옷 사진을 정면 아바타에 겹쳐요), 3D로 돌려 볼 수도 있어요
  // 지금은 2D 입어보기만 써요 (3D 보기는 숨김 — 다시 쓰려면 "3d"로)
  const mode = "2d" as "2d" | "3d";
  const [layout, setLayout] = useState<BodyLayout | null>(null);
  const [reports, setReports] = useState<GarmentReport[]>([]);
  const [colors, setColors] = useState<Record<string, string>>({});
  // 겹쳐 입기: 하의 → 상의 → 아우터 순서로 입혀요
  const worn = [app.wearing?.bottom, app.wearing?.top, app.wearing?.outer]
    .map((id) => closet.find((i) => i.id === id))
    .filter((i): i is ClosetItem => !!i);
  // 미리 만든 착용 사진 세트에 맞는 조합이면 그 사진을 보여줘요 (lib/looks.ts)
  const look = lookPhoto(app.profile.gender, worn);
  const garments = worn
    .map((item) => toGarment(item, colors[item.id] ?? "#8a8580"))
    .filter((g): g is GarmentSpec => !!g);
  // 옷 색은 이름(블랙·네이비 등)이나 사진에서 뽑아요
  const wornKey = worn.map((i) => i.id).join(",");
  useEffect(() => {
    for (const item of worn) {
      if (colors[item.id]) continue;
      garmentColor(item.name, item.image).then((c) =>
        setColors((cur) => ({ ...cur, [item.id]: c })),
      );
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [wornKey]);

  const toggleWear = (item: ClosetItem) => {
    const kind =
      item.category === "bottom"
        ? "bottom"
        : item.category === "outer"
          ? "outer"
          : "top";
    if (app.wearing?.[kind] === item.id) {
      setApp((st) => ({ wearing: { ...st.wearing, [kind]: undefined } }));
      return;
    }
    // 사진 세트 옷(채팅에서 넣은 추천 옷)은 실측 없이도 바로 입어 볼 수 있어요
    if (!lookPartOf(app.profile.gender, item) && !toGarment(item, "#000")) {
      showToast(`입어 보려면 ${missingFor(item.category)} 실측이 필요해요.`);
      setOpenId(item.id);
      return;
    }
    setApp((st) => ({ wearing: { ...st.wearing, [kind]: item.id } }));
  };

  return (
    <>
      <TabHeader title="나의 아바타" />
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[10.6px] overflow-y-auto px-[16.6px] pt-[12.5px] pb-[15px]">
        <h2 className="text-[21px] leading-[1.35] font-bold">
          나를 닮은 핏의 기준
        </h2>
        <p className="text-[10px] leading-[1.4] text-sub">
          상단에서 체형을 확인하고, 아래에서 내 옷을 살펴봐요.
        </p>

        <div className="flex w-full flex-col items-center gap-[4.7px] rounded-[11px] bg-[#f0ece7] px-[9.7px] py-[8.7px]">
          <span className="flex w-full text-[10px] leading-[1.4]">
            <span className="flex-1 text-left font-bold text-plum">
              {shape.measured.length
                ? `내 체형 · 실측 ${shape.measured.length}개 반영`
                : "기본 체형 · 예시"}
            </span>
            <span className="flex-1 text-right whitespace-pre text-sub">{`${app.profile.height} cm  /  ${app.profile.weight} kg`}</span>
          </span>
          {/* 2D: 정면 아바타 위에 실제 옷 사진(누끼)을 실측대로 겹쳐요 · 3D: 드래그해서 돌려 보고, 정면·측면·후면 버튼으로 각도를 바꿔요 */}
          {look ? (
            <div className="relative h-[360px] w-full overflow-hidden rounded-[8px] bg-[#f3f3f3]">
              <img
                key={look.src}
                src={look.src}
                alt="입어 본 모습"
                className="animate-fade absolute inset-0 size-full object-contain"
              />
              {look.missing && (
                <span className="absolute inset-x-3 bottom-2 rounded-full bg-white/90 py-1 text-center text-[10px] text-sub">
                  이 조합 사진은 준비 중이에요
                </span>
              )}
            </div>
          ) : (
            <Avatar3D
              shape={shape}
              garments={garments}
              fitView={fitView && mode === "3d"}
              onReport={setReports}
              flat={mode === "2d"}
              onLayout={setLayout}
              className="h-[250px] w-full"
            >
              {mode === "2d" && layout && (
                <TryOn2D
                  layout={layout}
                  worn={worn.flatMap((item) =>
                    garments
                      .filter((g) => g.id === item.id)
                      .map((spec) => ({ item, spec })),
                  )}
                />
              )}
            </Avatar3D>
          )}
          <p className="text-[10px] leading-[1.4] text-sub">
            {look
              ? worn.length
                ? `입은 옷 ${worn.length}벌 · 옷을 입히고 벗기며 어울림을 확인해요`
                : "아래 옷장에서 입어 볼 옷을 골라요"
              : mode === "2d"
                ? garments.length
                  ? "실제 옷 사진을 내 체형과 실측에 맞춰 입혀 봤어요"
                  : "아래 옷장에서 입어 볼 옷을 골라요"
                : garments.length
                  ? "좌우로 끌어서 돌려 보고, 핏 보기로 끼는 곳을 확인해요"
                  : "좌우로 끌어서 돌려 볼 수 있어요 · 아래 옷장에서 입어 볼 옷을 골라요"}
          </p>
          <button
            type="button"
            onClick={() => setBodyOpen(true)}
            className="block w-full rounded-[5.5px] bg-white px-[6.9px] py-[6.2px] text-center text-[10px] leading-[1.4] font-medium text-plum"
          >
            상세 치수 수정
          </button>
        </div>

        {garments.length > 0 && (
          <section className="flex flex-col gap-2 rounded-[10px] border border-line bg-white p-3">
            <div className="flex items-center gap-2 leading-[1.4]">
              <h2 className="flex-1 text-[13px] font-bold">입어 본 핏</h2>
            </div>
            {reports.map((r) => (
              <div key={r.name} className="flex flex-col gap-1">
                <p className="text-[11px] font-bold text-plum">
                  {r.kind === "bottom"
                    ? "하의"
                    : r.category === "outer"
                      ? "아우터"
                      : "상의"}{" "}
                  · {r.name}
                </p>
                <ul className="flex flex-col gap-0.5">
                  {r.lines.map((l) => (
                    <li
                      key={l.part}
                      className="flex items-center gap-1.5 text-[10.5px] leading-[1.45]"
                    >
                      <span className="w-10 shrink-0 text-sub">{l.part}</span>
                      <span className="min-w-0 flex-1">{l.text}</span>
                      {l.level && (
                        <span
                          className="shrink-0 rounded-full px-1.5 py-px text-[9.5px] text-white"
                          style={{ background: FIT_COLOR[l.level] }}
                        >
                          {FIT_LABEL[l.level]}
                        </span>
                      )}
                    </li>
                  ))}
                </ul>
              </div>
            ))}
            <p className="text-[9.5px] leading-[1.4] text-faint">
              옷 실측과 내 치수로 계산한 예상 핏이에요. 소재의 신축성은 반영하지
              않아요.
            </p>
          </section>
        )}

        <div className="flex flex-col gap-[9.4px]">
          <div className="flex items-start leading-[1.4]">
            <h2 className="flex-1 text-[14px] font-bold">나의 디지털 옷장</h2>
            <Link href="/closet" className="text-[10px] font-medium text-plum">
              전체 보기 →
            </Link>
          </div>
          <p className="text-[10px] leading-[1.4] whitespace-pre text-sub">{`내 옷 ${closet.length}개  ·  ★ 즐겨찾는 기준 옷`}</p>

          <div className="grid grid-cols-2 gap-x-[7px] gap-y-[9.4px]">
            {closet.map((item) => {
              const wearing =
                app.wearing?.top === item.id ||
                app.wearing?.bottom === item.id ||
                app.wearing?.outer === item.id;
              return (
                <div
                  key={item.id}
                  className="flex min-w-0 flex-col items-center gap-[3.5px]"
                >
                  <button
                    type="button"
                    onClick={() => setOpenId(item.id)}
                    className="flex w-full min-w-0 flex-col items-center gap-[3.5px] text-left"
                  >
                    <ClosetThumb
                      item={item}
                      className={cn(
                        "h-[84.7px] w-[111.4px] rounded-[6.9px]",
                        wearing && "outline-2 outline-plum",
                      )}
                    />
                    <span
                      className={cn(
                        "flex w-full items-center gap-1 font-medium",
                        item.favorite ? "text-plum" : "text-ink",
                      )}
                    >
                      <span className="w-4 shrink-0 text-[16px] leading-5">
                        {item.favorite ? "★" : "☆"}
                      </span>
                      <span className="min-w-0 flex-1 truncate text-[10px] leading-[1.4]">
                        {item.name}
                      </span>
                    </span>
                    <span className="w-full truncate text-[10px] leading-[1.4] text-sub">
                      {itemStatus(item)}
                    </span>
                  </button>
                  {item.category !== "bag" && (
                    <button
                      type="button"
                      aria-pressed={wearing}
                      onClick={() => toggleWear(item)}
                      className={cn(
                        "w-full rounded-[5.5px] border-[0.75px] py-1 text-[10px] leading-[1.4]",
                        wearing
                          ? "border-plum bg-plum font-medium text-white"
                          : "border-line bg-white text-plum",
                      )}
                    >
                      {wearing ? "입는 중 · 벗기" : "아바타에 입어보기"}
                    </button>
                  )}
                </div>
              );
            })}
          </div>

          <Link
            href="/avatar/link"
            className="flex flex-col gap-[3px] rounded-[6.9px] bg-lav px-[8.3px] py-[7.5px] text-[10px] leading-[1.4]"
          >
            <span className="font-bold text-plum">
              입어보고 싶은 옷 피팅하기
            </span>
            <span className="truncate text-sub">
              {app.tryOnLink || "[링크 넣기]"}
            </span>
          </Link>
        </div>
      </main>
      {bodyOpen && <BodyModal onClose={() => setBodyOpen(false)} />}
      {openItem && (
        <MeasureModal
          key={openItem.id}
          item={openItem}
          onClose={() => setOpenId(null)}
        />
      )}
    </>
  );
}
