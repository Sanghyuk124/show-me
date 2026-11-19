"use client";

// 나의 옷장 '+ 사진 첨부하기'를 누르면 뜨는 앱 안 '사진 보관함'.
// 휴대폰 사진 보관함처럼 사진이 바둑판으로 보이고, 사진을 누르면 누끼를 따서 옷장에 바로 넣어요.
// 예시 사진 목록: lib/data.ts 의 SAMPLE_PHOTOS (성별마다 따로)

import { Check } from "lucide-react";
import { SAMPLE_PHOTOS, type Gender } from "@/lib/data";
import { useApp } from "@/lib/store";
import { cn, Modal } from "./ui";

export type SamplePhoto = (typeof SAMPLE_PHOTOS)[Gender][number];

export function PhotoLibrary({
  gender,
  busyId,
  onPick,
  onDevice,
  onClose,
}: {
  gender: Gender;
  /** 지금 누끼를 따고 있는 사진 */
  busyId: string | null;
  onPick: (photo: SamplePhoto) => void;
  /** 휴대폰에 있는 다른 사진에서 고르기 */
  onDevice: () => void;
  onClose: () => void;
}) {
  const { closet } = useApp();
  const photos = SAMPLE_PHOTOS[gender];

  return (
    <Modal title="사진 보관함" onClose={onClose} align="center" className="gap-3 p-[18px]" titleClassName="text-[17px] leading-[1.5]">
      <p className="-mt-1 text-[11px] leading-[1.5] text-sub">옷 사진을 누르면 배경을 지우고 옷장에 넣어요.</p>
      <div className="flex items-baseline justify-between text-[11px] leading-[1.4]">
        <span className="font-bold text-ink">최근 항목</span>
        <span className="text-sub">사진 {photos.length}장</span>
      </div>
      <div className="grid grid-cols-3 gap-[3px] overflow-hidden rounded-[6px]">
        {photos.map((p) => {
          const added = closet.some((i) => i.sample === p.id);
          const busy = busyId === p.id;
          return (
            <button
              key={p.id}
              type="button"
              disabled={!!busyId}
              onClick={() => onPick(p)}
              aria-label={`${p.name} 사진${added ? " · 옷장에 있음" : ""}`}
              className="relative aspect-square overflow-hidden bg-sand disabled:cursor-wait"
            >
              <img src={p.src} alt="" className={cn("size-full object-cover transition-opacity", busy && "opacity-50")} />
              {busy && (
                <span className="absolute inset-x-0 bottom-0 animate-pulse bg-plum/80 py-0.5 text-center text-[9.5px] text-white">누끼 따는 중…</span>
              )}
              {added && !busy && (
                <span className="absolute top-1 right-1 flex size-[18px] items-center justify-center rounded-full bg-plum text-white" title="옷장에 있음">
                  <Check className="size-3" strokeWidth={3} />
                </span>
              )}
            </button>
          );
        })}
      </div>
      <button type="button" onClick={onDevice} disabled={!!busyId} className="self-center py-1 text-[11px] font-medium text-plum underline underline-offset-2">
        휴대폰의 다른 사진 불러오기
      </button>
    </Modal>
  );
}
