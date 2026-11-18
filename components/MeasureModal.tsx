"use client";

import { useState } from "react";
import type { Category, ClosetItem, Measures } from "@/lib/data";
import { GENDER_LABEL } from "@/lib/data";
import { updateItem, useApp } from "@/lib/store";
import { cn, decimal, Modal } from "./ui";

const UPPER = [
  { key: "length", label: "총 기장" },
  { key: "sleeve", label: "팔 길이" },
  { key: "shoulder", label: "어깨 너비" },
  { key: "waist", label: "허리 둘레" },
];

export const COPY: Record<Category, { label: string; fields: { key: string; label: string }[] }> = {
  top: { label: "상의", fields: UPPER },
  outer: { label: "아우터", fields: UPPER },
  bottom: {
    label: "하의",
    fields: [
      { key: "waist", label: "허리 둘레" },
      { key: "hip", label: "힙 둘레" },
      { key: "thigh", label: "허벅지 둘레" },
      { key: "rise", label: "밑위 길이" },
      { key: "length", label: "총 기장" },
    ],
  },
  bag: {
    label: "가방",
    fields: [
      { key: "width", label: "가로 너비" },
      { key: "height", label: "세로 높이" },
      { key: "depth", label: "폭" },
      { key: "handle", label: "손잡이 높이" },
    ],
  },
};

export function guide(item: ClosetItem) {
  if (item.prefilled) {
    return {
      tone: "lav",
      title: "판매처 링크에서 실측을 불러왔어요.",
      lines: [`선택 사이즈 ${item.size ?? "M"} · 예시 데이터`, "단면 치수는 둘레로 환산했어요.", "자동 입력된 값도 확인하고 수정할 수 있어요."],
    };
  }
  if (item.source === "link") {
    return {
      tone: "sand",
      title: "링크 등록 · 실측 자동 입력",
      lines: ["아직 불러온 실측 값이 없어요.", `${item.category === "outer" && item.id === "cardigan" ? "가디건" : "옷"}을 평평하게 펼쳐 직접 재어주세요.`, "각 항목을 눌러 cm로 입력할 수 있어요."],
    };
  }
  if (item.category === "bag") {
    return {
      tone: "sand",
      title: "가방을 직접 재서 입력해주세요.",
      lines: ["가방의 가로·세로·폭을 cm로 입력해요.", "손잡이 높이는 가방 윗면부터 재요.", "각 항목을 눌러 직접 입력할 수 있어요."],
    };
  }
  return {
    tone: "sand",
    title: "옷을 직접 재서 입력해주세요.",
    lines: [
      "평평하게 펼친 옷의 치수를 cm로 입력해요.",
      item.category === "bottom" ? "밑위는 허리선부터 가랑이까지 재요." : "팔 길이는 어깨선부터 소매 끝까지 재요.",
      "허리 둘레는 단면 너비의 2배를 입력해요.",
    ],
  };
}

function footnote(item: ClosetItem) {
  if (item.category === "bag") return ["이 가방의 치수만 따로 저장해요.", "다른 옷의 실측에는 영향을 주지 않아요."];
  if (item.category === "outer") return ["이 아우터의 치수만 따로 저장해요.", "셔츠의 기준 실측과는 별도로 관리해요."];
  return [`${item.source === "photo" ? "사진" : "링크"} 등록 옷의 실측 입력은 선택이에요.`, "단, 즐겨찾는 기준 상·하의는 각각 1벌 이상 필요해요."];
}

export function MeasureModal({ item, onClose }: { item: ClosetItem; onClose: () => void }) {
  const app = useApp();
  const [draft, setDraft] = useState<Measures>(item.measures);
  const copy = COPY[item.category];
  const g = guide(item);
  const complete = copy.fields.every((f) => draft[f.key]?.trim());
  const save = () => {
    updateItem(item.id, { measures: draft, confirmed: true });
    onClose();
  };
  const topDone = app.closet.some((i) => i.favorite && (i.category === "top" || i.category === "outer") && i.confirmed);
  const separate = item.category === "bag" || item.category === "outer";

  return (
    <Modal
      title={`${copy.label} 실측 ${item.prefilled ? "확인" : "입력"}`}
      onClose={onClose}
      className={item.prefilled ? "gap-3.5 px-[22px] py-[18px]" : "gap-4 p-[22px]"}
    >
      <p className="text-[12px] leading-[1.5] font-medium text-plum">
        {GENDER_LABEL[app.profile.gender]} · {item.name} · {item.source === "photo" ? "사진" : "링크"} 등록
      </p>

      <div className={cn("flex flex-col gap-[5px] rounded-[10px] p-[13px] leading-[1.5]", g.tone === "sand" ? "bg-sand" : "bg-lav")}>
        <p className={cn("text-[13px] font-bold", g.tone === "lav" && "text-plum")}>{g.title}</p>
        <p className="text-[11px] text-sub">
          {g.lines.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </p>
      </div>

      <div className="flex flex-col gap-3 leading-[1.5]">
        {copy.fields.map((f, i) => (
          <label key={f.key} className="flex flex-col gap-1.5">
            <span className="text-[12px] font-medium text-sub">{f.label}</span>
            <span
              className={cn(
                "flex items-center rounded-[9px] border border-line p-3 transition focus-within:border-plum",
                item.prefilled ? "bg-[#f4eff2]" : "bg-cream",
              )}
            >
              <input
                aria-label={f.label}
                inputMode="decimal"
                value={draft[f.key] ?? ""}
                placeholder={i === 0 && item.source === "photo" && item.category === "top" ? "예: 68.5" : "입력하기"}
                onChange={(e) => setDraft((d) => ({ ...d, [f.key]: decimal(e.target.value) }))}
                className="w-0 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-[#9b9098]"
              />
              <span className="ml-2 text-[11px] text-sub">cm</span>
            </span>
          </label>
        ))}
      </div>

      {item.prefilled ? (
        <>
          <div className="flex flex-col gap-[5px] rounded-[10px] bg-lav p-3 leading-[1.5]">
            <p className="text-[12px] font-bold text-plum">
              ★ 즐겨찾는 {copy.label} · {item.confirmed ? "기준 실측 완료" : "예시 확인 필요"}
            </p>
            <p className="text-[10px] text-sub">{topDone ? "상·하의 기준 실측이 완성됐어요." : "상의도 1벌 이상 실측을 입력하면 기준이 완성돼요."}</p>
          </div>
          <SaveButton disabled={!complete} onClick={save}>
            확인 완료
          </SaveButton>
        </>
      ) : (
        <>
          <p className="text-[11px] leading-[1.5] text-sub">
            {footnote(item).map((l) => (
              <span key={l} className="block">
                {l}
              </span>
            ))}
          </p>
          <SaveButton disabled={!complete} onClick={save}>
            {complete ? "실측 저장" : "모든 실측 입력 후 저장"}
          </SaveButton>
          <button type="button" onClick={onClose} className="rounded-[10px] border border-line bg-white p-[13px] text-[12px] leading-[1.5] font-bold text-plum">
            나중에 입력하기
          </button>
          <p className="text-[10px] leading-[1.5] text-warn">
            {separate ? "저장한 실측은 이 아이템에서 다시 확인·수정해요." : "미입력 시 핏 컨설팅·추천 정확도가 낮아질 수 있어요."}
          </p>
        </>
      )}
    </Modal>
  );
}

/** 팝업 안 저장 버튼 (Figma: 비활성 #e3dde0 / 활성 자주색) */
export function SaveButton({ disabled, onClick, children }: { disabled?: boolean; onClick: () => void; children: React.ReactNode }) {
  return (
    <button
      type="button"
      disabled={disabled}
      onClick={onClick}
      className="rounded-[10px] bg-plum p-[13px] text-[12px] leading-[1.5] font-bold text-white transition active:opacity-85 disabled:bg-line disabled:text-sub"
    >
      {children}
    </button>
  );
}

/** 옷 아래에 표시되는 상태 문구 */
export function itemStatus(item: ClosetItem) {
  const source = item.source === "photo" ? "사진 등록" : "링크 등록";
  if (item.category === "bag") return item.confirmed ? "가방 · 실측 완료" : `가방 · ${source}`;
  if (item.confirmed) return `${source} · ${item.favorite ? "기준 실측 완료" : "실측 완료"}`;
  if (item.prefilled) return `${source} · 예시 확인 필요`;
  return item.source === "photo" ? `${source} · 실측 필요` : `${source} · 실측 자동 입력`;
}

/** Figma 05b · 제품 상세 단독 — 채팅 추천 코디의 옷을 눌렀을 때 */
export function ProductDetailModal({ item, onClose, onAddToCart }: { item: ClosetItem; onClose: () => void; onAddToCart: () => void }) {
  const app = useApp();
  const copy = COPY[item.category];
  const g = guide(item);
  const topDone = app.closet.some((i) => i.favorite && (i.category === "top" || i.category === "outer") && i.confirmed);
  const status = item.confirmed ? "기준 실측 완료" : item.prefilled ? "예시 확인 필요" : "실측 확인 필요";

  return (
    <Modal title="제품 상세 정보" onClose={onClose} align="center" className="gap-3.5 px-[22px] py-[18px]">
      <p className="text-[12px] leading-[1.5] font-medium text-plum">
        {item.favorite && "★ "}
        {item.name}
      </p>
      <div className={cn("flex flex-col gap-[5px] rounded-[10px] p-[13px] leading-[1.5]", g.tone === "sand" ? "bg-sand" : "bg-lav")}>
        <p className={cn("text-[13px] font-bold", g.tone === "lav" && "text-plum")}>{g.title}</p>
        <p className="text-[11px] text-sub">
          {g.lines.map((l) => (
            <span key={l} className="block">
              {l}
            </span>
          ))}
        </p>
      </div>
      <div className="flex flex-col gap-[5px] rounded-[10px] bg-lav p-3 leading-[1.5]">
        <p className="text-[12px] font-bold text-plum">
          {item.favorite ? `★ 즐겨찾는 ${copy.label}` : copy.label} · {status}
        </p>
        <p className="text-[10px] text-sub">{topDone ? "상·하의 기준 실측이 완성됐어요." : "상의도 1벌 이상 실측을 입력하면 기준이 완성돼요."}</p>
      </div>
      <SaveButton onClick={onAddToCart}>장바구니 담기</SaveButton>
    </Modal>
  );
}
