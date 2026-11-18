"use client";

import { useState } from "react";
import Link from "next/link";
import { BodyModal } from "@/components/BodyModal";
import { ClosetThumb } from "@/components/ClosetThumb";
import { itemStatus, MeasureModal } from "@/components/MeasureModal";
import { cn, TabHeader } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function AvatarPage() {
  const app = useApp();
  const [bodyOpen, setBodyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = app.closet.find((i) => i.id === openId);
  // Figma 남성 화면(07 · 남성)은 남성형 바디 이미지와 안내 문구가 달라요.
  const male = app.profile.gender === "male";

  return (
    <>
      <TabHeader title="나의 아바타" />
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[10.6px] overflow-y-auto px-[16.6px] pt-[12.5px] pb-[15px]">
        <h2 className="text-[21px] leading-[1.35] font-bold">나를 닮은 핏의 기준</h2>
        <p className="text-[10px] leading-[1.4] text-sub">상단에서 체형을 확인하고, 아래에서 내 옷을 살펴봐요.</p>

        <button
          type="button"
          onClick={() => setBodyOpen(true)}
          className="flex w-full flex-col items-center gap-[4.7px] rounded-[11px] bg-[#f0ece7] px-[9.7px] py-[8.7px]"
        >
          <span className="flex w-full text-[10px] leading-[1.4]">
            <span className="flex-1 text-left font-bold text-plum">기본 체형 · 예시</span>
            <span className="flex-1 text-right whitespace-pre text-sub">{`${app.profile.height} cm  /  ${app.profile.weight} kg`}</span>
          </span>
          <img src={male ? "/images/avatar/body-male.jpg" : "/images/avatar/body.jpg"} alt={`기본 체형 아바타 · ${male ? "남성" : "여성"}`} className="h-[162.8px] w-[212.3px] rounded-[6.9px] object-contain" />
          <span className="block w-full rounded-[5.5px] bg-white px-[6.9px] py-[6.2px] text-center text-[10px] leading-[1.4] font-medium text-plum">
            {male ? "아바타를 눌러 상세 치수 수정" : "상세 치수 수정"}
          </span>
        </button>

        <div className="flex flex-col gap-[9.4px]">
          <div className="flex items-start leading-[1.4]">
            <h2 className="flex-1 text-[14px] font-bold">나의 디지털 옷장</h2>
            <Link href="/closet" className="text-[10px] font-medium text-plum">
              전체 보기 →
            </Link>
          </div>
          <p className="text-[10px] leading-[1.4] whitespace-pre text-sub">{`내 옷 ${app.closet.length}개  ·  ★ 즐겨찾는 기준 옷`}</p>

          <div className="grid grid-cols-2 gap-x-[7px] gap-y-[9.4px]">
            {app.closet.map((item) => (
              <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className="flex min-w-0 flex-col items-center gap-[3.5px] text-left">
                <ClosetThumb item={item} className="h-[84.7px] w-[111.4px] rounded-[6.9px]" />
                <span className={cn("flex w-full items-center gap-1 font-medium", item.favorite ? "text-plum" : "text-ink")}>
                  <span className="w-4 shrink-0 text-[16px] leading-5">{item.favorite ? "★" : "☆"}</span>
                  <span className="min-w-0 flex-1 truncate text-[10px] leading-[1.4]">{item.name}</span>
                </span>
                <span className="w-full truncate text-[10px] leading-[1.4] text-sub">{itemStatus(item)}</span>
              </button>
            ))}
          </div>

          <Link href="/avatar/link" className="flex flex-col gap-[3px] rounded-[6.9px] bg-lav px-[8.3px] py-[7.5px] text-[10px] leading-[1.4]">
            <span className="font-bold text-plum">입어보고 싶은 옷 피팅하기</span>
            <span className="truncate text-sub">{app.tryOnLink || "[링크 넣기]"}</span>
          </Link>
        </div>
      </main>
      {bodyOpen && <BodyModal onClose={() => setBodyOpen(false)} />}
      {openItem && <MeasureModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
    </>
  );
}
