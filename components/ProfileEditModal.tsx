"use client";

import { useState } from "react";
import { GENDER_LABEL, PERSONAL_COLORS, type Gender } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";
import { cn, decimal, digits, Modal } from "./ui";

const NICKNAMES = ["쇼미러버", "나의취향", "데일리룩"];

/** Figma 11a 선택 버튼: 높이 34, 모서리 7, 선택 시 #eee5ea 배경 */
function Choice({ active, children, onClick }: { active: boolean; children: string; onClick: () => void }) {
  return (
    <button
      type="button"
      aria-pressed={active}
      onClick={onClick}
      className={cn("h-[34px] flex-1 rounded-[7px] border border-line text-[12px] leading-[18px] text-plum", active ? "bg-lav" : "bg-white")}
    >
      {children}
    </button>
  );
}

const Label = ({ children }: { children: string }) => <span className="text-[11px] leading-[17px] font-bold">{children}</span>;

function NumberField({ label, unit, value, onChange }: { label: string; unit: string; value: string; onChange: (v: string) => void }) {
  return (
    <label className="flex min-w-0 flex-1 flex-col gap-1.5">
      <Label>{label}</Label>
      <span className="flex h-[42px] items-center gap-1 rounded-[7px] border border-line bg-white px-3 focus-within:border-plum">
        <input
          aria-label={label}
          value={value}
          inputMode="decimal"
          onChange={(e) => onChange(e.target.value)}
          className="field-sizing-content max-w-[70%] min-w-3 bg-transparent text-[14px] leading-5 font-bold outline-none"
        />
        <span className="text-[10px] leading-4 text-sub">{unit}</span>
      </span>
    </label>
  );
}

/** Figma 11a · 기본 정보 수정 */
export function ProfileEditModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [p, setP] = useState(app.profile);
  const patch = (next: Partial<typeof p>) => setP((cur) => ({ ...cur, ...next }));
  const colors = PERSONAL_COLORS;

  return (
    <Modal
      title="기본 정보 수정"
      onClose={onClose}
      closeLabel="닫기"
      className="gap-3 rounded-2xl border border-line p-5"
      titleClassName="text-[18px] leading-6"
    >
      <p className="-mt-[7px] text-[11px] leading-[17px] text-sub">저장한 정보는 맞춤 추천에도 반영돼요.</p>

      <div className="flex flex-col gap-4 pb-1.5">
        <div className="flex flex-col gap-1.5">
          <Label>닉네임</Label>
          <input
            aria-label="닉네임"
            value={p.nickname}
            maxLength={12}
            placeholder="미설정"
            onChange={(e) => patch({ nickname: e.target.value })}
            className="h-[42px] w-full rounded-[7px] border border-line bg-white px-3 text-[14px] leading-[18px] text-plum outline-none placeholder:text-plum focus:border-plum"
          />
          <p className="text-[9px] leading-[15px] text-sub">
            기기 키보드로 1~12자 입력
            <br />
            또는 아래 예시에서 골라보세요.
          </p>
          <div className="flex gap-1.5">
            {NICKNAMES.map((n) => (
              <button key={n} type="button" onClick={() => patch({ nickname: n })} className="h-7 flex-1 rounded-[7px] border border-line bg-white text-[12px] leading-[18px] text-plum">
                {n}
              </button>
            ))}
          </div>
        </div>

        <NumberField label="나이" unit="세" value={p.age} onChange={(v) => patch({ age: digits(v) })} />

        <div className="flex flex-col gap-1.5">
          <Label>성별</Label>
          <div className="flex gap-1.5">
            {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
              <Choice key={g} active={p.gender === g} onClick={() => patch({ gender: g })}>
                {GENDER_LABEL[g]}
              </Choice>
            ))}
          </div>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>퍼스널 컬러</Label>
          <div className="flex gap-1.5">
            {colors.slice(0, 3).map((c) => (
              <Choice key={c.id} active={p.personalColor === c.id} onClick={() => patch({ personalColor: c.id })}>
                {c.short}
              </Choice>
            ))}
          </div>
          <div className="flex gap-1.5">
            {colors.slice(3).map((c) => (
              <Choice key={c.id} active={p.personalColor === c.id} onClick={() => patch({ personalColor: c.id })}>
                {c.short}
              </Choice>
            ))}
          </div>
        </div>

        <div className="flex gap-2.5">
          <NumberField label="키" unit="cm" value={p.height} onChange={(v) => patch({ height: decimal(v) })} />
          <NumberField label="몸무게" unit="kg" value={p.weight} onChange={(v) => patch({ weight: decimal(v) })} />
        </div>
        <p className="text-[9px] leading-[15px] text-sub">
          입력란 클릭 후 키보드로 숫자를 입력해요.
          <br />
          Backspace 삭제 · Enter 완료 · 키·몸무게는 소수점 한 자리까지
        </p>
      </div>

      <div className="flex h-11 gap-2">
        <button type="button" onClick={onClose} className="w-[95px] rounded-[7px] border border-line bg-white text-[12px] leading-[18px] text-plum">
          취소
        </button>
        <button
          type="button"
          onClick={() => {
            setApp(() => ({ profile: p }));
            onClose();
          }}
          className="flex-1 rounded-[7px] bg-plum text-[12px] leading-[18px] font-bold text-white active:opacity-85"
        >
          저장
        </button>
      </div>
    </Modal>
  );
}
