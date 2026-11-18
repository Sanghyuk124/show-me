"use client";

import { useState } from "react";
import Link from "next/link";
import { BodyModal } from "@/components/BodyModal";
import { ClosetThumb } from "@/components/ClosetThumb";
import { itemStatus, MeasureModal } from "@/components/MeasureModal";
import { TabHeader } from "@/components/ui";
import { useApp } from "@/lib/store";

export default function AvatarPage() {
  const app = useApp();
  const [bodyOpen, setBodyOpen] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const openItem = app.closet.find((i) => i.id === openId);

  return (
    <>
      <TabHeader title="나의 아바타" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <h2 className="text-[20px] font-bold">나를 닮은 핏의 기준</h2>
        <p className="mt-1.5 text-[10px] text-sub">상단에서 체형을 확인하고, 아래에서 내 옷을 살펴봐요.</p>

        <button type="button" onClick={() => setBodyOpen(true)} className="relative mt-3 block w-full rounded-lg bg-[#efebe6] px-2.5 pt-2 pb-2.5">
          <span className="flex justify-between text-[10px]">
            <span className="font-bold">기본 체형 · 예시</span>
            <span className="text-sub">
              {app.profile.height} cm&nbsp;&nbsp;/&nbsp;&nbsp;{app.profile.weight} kg
            </span>
          </span>
          <img src="/images/avatar/body.jpg" alt="기본 체형 아바타" className="mx-auto mt-0.5 h-[158px] w-[128px] object-cover" />
          <span className="mt-0 block h-[26px] rounded-sm bg-white text-[10px] leading-[26px] font-medium text-plum">아바타를 눌러 상세 치수 수정</span>
        </button>

        <div className="mt-4 flex items-center justify-between">
          <h2 className="text-[13.5px] font-bold">나의 디지털 옷장</h2>
          <Link href="/closet" className="text-[10px] font-medium">
            전체 보기 →
          </Link>
        </div>
        <p className="mt-1 text-[9.5px] text-sub">내 옷 {app.closet.length}개&nbsp;&nbsp;·&nbsp;&nbsp;★ 즐겨찾는 기준 옷</p>

        <div className="mt-2 grid grid-cols-2 gap-x-1 gap-y-3">
          {app.closet.map((item) => (
            <button key={item.id} type="button" onClick={() => setOpenId(item.id)} className="min-w-0 text-left">
              <ClosetThumb item={item} className="mx-auto h-[83px] w-[110px]" />
              <span className="mt-1.5 block truncate text-[10px] font-medium">
                {item.favorite && "★ "}
                {item.name}
              </span>
              <span className="mt-0.5 block truncate text-[9.5px] text-sub">{itemStatus(item)}</span>
            </button>
          ))}
        </div>

        <Link href="/avatar/link" className="mt-3 block rounded-md bg-lav px-2 py-2">
          <span className="block text-[10px] font-bold text-plum">입어보고 싶은 옷 피팅하기</span>
          <span className="mt-0.5 block truncate text-[10px] text-sub">{app.tryOnLink || "[링크 넣기]"}</span>
        </Link>
      </main>
      {bodyOpen && <BodyModal onClose={() => setBodyOpen(false)} />}
      {openItem && <MeasureModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
    </>
  );
}
