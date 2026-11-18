"use client";

import { useState } from "react";
import { BODY_FIELDS } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";
import { decimal, Modal, PrimaryButton, UnitInput } from "./ui";

export function BodyModal({ onClose }: { onClose: () => void }) {
  const app = useApp();
  const [draft, setDraft] = useState(app.body);
  return (
    <Modal title="신체 치수 입력·수정" onClose={onClose} align="center">
      <p className="mt-6 text-[11.5px] leading-[17px] text-sub">
        기본 정보 {app.profile.height} cm · {app.profile.weight} kg
        <br />내 몸의 실제 치수를 cm로 입력해주세요.
      </p>
      <h3 className="mt-4 text-[13px] font-bold">실측으로 나에게 더 가깝게</h3>
      <div className="mt-4 grid grid-cols-2 gap-x-3 gap-y-3">
        {BODY_FIELDS.map((f) => (
          <label key={f.key}>
            <span className="mb-1.5 block text-[11px] text-sub">{f.label}</span>
            <UnitInput
              label={f.label}
              unit="cm"
              value={draft[f.key] ?? ""}
              onChange={(v) => setDraft((d) => ({ ...d, [f.key]: decimal(v) }))}
            />
          </label>
        ))}
      </div>
      <PrimaryButton
        className="mt-5"
        onClick={() => {
          setApp(() => ({ body: draft }));
          onClose();
        }}
      >
        입력한 치수 저장
      </PrimaryButton>
      <p className="mt-4 text-[10px] leading-[15px] text-sub">
        실측값은 예시예요. 기본 정보 기반 체형은 추정이며,
        <br />
        실제 외형이나 옷의 착용감을 보장하지 않아요.
      </p>
    </Modal>
  );
}
