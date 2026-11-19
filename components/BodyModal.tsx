"use client";

import { useState } from "react";
import dynamic from "next/dynamic";
import { outOfRange, RANGES, resolveBody } from "@/lib/bodyModel";
import { BODY_FIELDS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";
import { decimal, Modal } from "./ui";

const Avatar3D = dynamic(() => import("./Avatar3D").then((m) => m.Avatar3D), {
  ssr: false,
  loading: () => <div className="h-[200px] w-full animate-pulse rounded-[10px] bg-[#f0ece7]" />,
});

/** Figma 07a · 신체 상세 치수 편집 — 입력하는 대로 위의 3D 아바타가 바로 바뀌어요 */
export function BodyModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [draft, setDraft] = useState(app.body);
  return (
    <Modal title="신체 치수 입력·수정" onClose={onClose} align="center" className="gap-[18px] p-[22px]">
      <p className="text-[12px] leading-[1.5] whitespace-pre-wrap text-sub">
        {`기본 정보  ${app.profile.height} cm · ${app.profile.weight} kg`}
        <br />내 몸의 실제 치수를 cm로 입력해주세요.
      </p>
      <div className="-my-1 overflow-hidden rounded-[10px] bg-[#f0ece7]">
        <Avatar3D shape={resolveBody(app.profile, draft)} className="h-[200px] w-full" />
      </div>
      <h3 className="text-[14px] leading-[1.5] font-bold">실측으로 나에게 더 가깝게</h3>
      <div className="grid grid-cols-2 gap-3 leading-[1.5]">
        {BODY_FIELDS.map((f) => (
          <label key={f.key} className="flex min-w-0 flex-col gap-1.5">
            <span className="text-[11px] font-medium text-sub">{f.label}</span>
            <span className="flex items-center rounded-[9px] border border-line bg-white p-3 focus-within:border-plum">
              <input
                aria-label={f.label}
                inputMode="decimal"
                value={draft[f.key] ?? ""}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: decimal(e.target.value) }))}
                className="w-0 min-w-0 flex-1 bg-transparent text-[14px] outline-none"
              />
              <span className="ml-2 text-[11px] text-sub">cm</span>
            </span>
            {outOfRange(f.key as keyof typeof RANGES, draft[f.key]) && (
              <span className="text-[10px] leading-[1.4] text-warn">
                {RANGES[f.key as keyof typeof RANGES][0]}~{RANGES[f.key as keyof typeof RANGES][1]}cm 사이로 아바타에 반영해요
              </span>
            )}
          </label>
        ))}
      </div>
      <button
        type="button"
        onClick={() => {
          setApp(() => ({ body: draft }));
          onClose();
        }}
        className="rounded-xl bg-plum p-[15px] text-[13px] leading-[1.5] font-bold text-white active:opacity-85"
      >
        입력한 치수 저장
      </button>
      <p className="text-[10px] leading-[1.5] text-sub">
        실측값은 예시예요. 기본 정보 기반 체형은 추정이며,
        <br />
        실제 외형이나 옷의 착용감을 보장하지 않아요.
      </p>
    </Modal>
  );
}
