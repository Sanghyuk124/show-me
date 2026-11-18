"use client";

import { useState } from "react";
import { GENDER_LABEL, PERSONAL_COLORS, type Gender } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";
import { cn, decimal, digits, Modal, PrimaryButton } from "./ui";

const NICKNAMES = ["쇼미러버", "나의취향", "데일리룩"];

function Choice({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-[33px] rounded-md border text-[11.5px]", active ? "border-lav bg-lav text-plum" : "border-line bg-white text-sub")}
    >
      {children}
    </button>
  );
}

function SmallField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="block">
      <span className="mb-1.5 block text-[11px] font-medium">{label}</span>
      <span className="flex h-[41px] items-center gap-1 rounded-md border border-line px-3 focus-within:border-ink/60">
        <input
          aria-label={label}
          value={value}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          className="field-sizing-content max-w-[60%] min-w-3 bg-transparent text-[13px] font-medium outline-none"
        />
        <span className="text-[10px] text-faint">{unit}</span>
      </span>
    </label>
  );
}

export function ProfileEditModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [p, setP] = useState(app.profile);
  const patch = (next: Partial<typeof p>) => setP((cur) => ({ ...cur, ...next }));

  return (
    <Modal title="기본 정보 수정" onClose={onClose} closeLabel="닫기">
      <p className="mt-1 text-[11px] text-sub">저장한 정보는 맞춤 추천에도 반영돼요.</p>

      <label className="mt-4 block">
        <span className="mb-1.5 block text-[11px] font-medium">닉네임</span>
        <input
          value={p.nickname}
          maxLength={12}
          placeholder="미설정"
          onChange={(e) => patch({ nickname: e.target.value })}
          className="h-[41px] w-full rounded-md border border-line px-3 text-[13px] outline-none placeholder:text-sub focus:border-ink/60"
        />
      </label>
      <p className="mt-1.5 text-[9.5px] text-sub">1~12자로 입력하거나 아래 예시에서 골라보세요.</p>
      <div className="mt-1.5 grid grid-cols-3 gap-1.5">
        {NICKNAMES.map((n) => (
          <button key={n} type="button" onClick={() => patch({ nickname: n })} className="h-7 rounded-md border border-line text-[11px] text-sub">
            {n}
          </button>
        ))}
      </div>

      <div className="mt-3.5">
        <SmallField label="나이" unit="세" value={p.age} onChange={(v) => patch({ age: digits(v) })} />
      </div>

      <p className="mt-3.5 mb-1.5 text-[11px] font-medium">성별</p>
      <div className="grid grid-cols-2 gap-1.5">
        {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
          <Choice key={g} active={p.gender === g} onClick={() => patch({ gender: g })}>
            {GENDER_LABEL[g]}
          </Choice>
        ))}
      </div>

      <p className="mt-3.5 mb-1.5 text-[11px] font-medium">퍼스널 컬러</p>
      <div className="grid grid-cols-6 gap-1.5">
        {PERSONAL_COLORS.map((c, i) => (
          <div key={c.id} className={i < 3 ? "col-span-2 grid" : "col-span-3 grid"}>
            <Choice active={p.personalColor === c.id} onClick={() => patch({ personalColor: c.id })}>
              {c.short}
            </Choice>
          </div>
        ))}
      </div>

      <div className="mt-3.5 grid grid-cols-2 gap-2.5">
        <SmallField label="키" unit="cm" value={p.height} onChange={(v) => patch({ height: decimal(v) })} />
        <SmallField label="몸무게" unit="kg" value={p.weight} onChange={(v) => patch({ weight: decimal(v) })} />
      </div>
      <p className="mt-2 text-[9.5px] text-sub">키·몸무게는 소수점 한 자리까지 입력할 수 있어요.</p>

      <div className="mt-6 grid grid-cols-[92px_1fr] gap-2">
        <button type="button" onClick={onClose} className="h-[43px] rounded-md border border-line text-[12px] text-sub">
          취소
        </button>
        <PrimaryButton
          className="h-[43px] rounded-md"
          onClick={() => {
            setApp(() => ({ profile: p }));
            onClose();
          }}
        >
          저장
        </PrimaryButton>
      </div>
    </Modal>
  );
}
