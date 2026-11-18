"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import type { Category, ClosetItem } from "@/lib/data";
import { setApp } from "@/lib/store";
import { cn, Modal, PrimaryButton } from "./ui";

const OPTIONS: { id: Category; label: string }[] = [
  { id: "top", label: "상의" },
  { id: "outer", label: "아우터" },
  { id: "bottom", label: "하의" },
  { id: "bag", label: "가방" },
];

export interface NewItemSource {
  image?: string;
  link?: string;
  size?: string;
}

/** 사진 촬영 또는 판매처 링크 저장 뒤에 옷 이름과 종류를 받는 창 */
export function RegisterItemModal({
  source,
  onClose,
  onCreated,
}: {
  source: NewItemSource;
  onClose: () => void;
  onCreated: (item: ClosetItem) => void;
}) {
  const [name, setName] = useState("");
  const [category, setCategory] = useState<Category>("top");
  const submit = () => {
    const item: ClosetItem = {
      id: `item-${Date.now()}`,
      name: name.trim(),
      category,
      source: source.link ? "link" : "photo",
      image: source.image,
      link: source.link,
      size: source.size,
      favorite: false,
      confirmed: false,
      measures: {},
    };
    setApp((s) => ({ closet: [item, ...s.closet] }));
    onCreated(item);
  };

  return (
    <Modal title="내 옷 등록" onClose={onClose} align="center">
      <div className="mt-4 flex h-32 items-center justify-center overflow-hidden rounded-lg bg-sand">
        {source.image ? (
          <img src={source.image} alt="등록할 옷" className="h-full w-full object-cover" />
        ) : (
          <div className="px-4 text-center text-sub">
            <Link2 className="mx-auto size-5" strokeWidth={1.5} />
            <p className="mt-1 line-clamp-2 text-[11px] break-all">{source.link}</p>
            {source.size && <p className="mt-0.5 text-[11px] font-medium">구매 사이즈 {source.size}</p>}
          </div>
        )}
      </div>
      <label className="mt-4 block">
        <span className="mb-1.5 block text-[11.5px] text-sub">옷 이름</span>
        <input
          value={name}
          maxLength={20}
          placeholder="예: 베이지 니트"
          onChange={(e) => setName(e.target.value)}
          className="h-[46px] w-full rounded-lg border border-line bg-cream px-3.5 text-[14px] outline-none placeholder:text-faint focus:border-ink/60"
        />
      </label>
      <p className="mt-3 mb-1.5 text-[11.5px] text-sub">종류</p>
      <div className="grid grid-cols-4 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={category === o.id}
            onClick={() => setCategory(o.id)}
            className={cn("h-9 rounded-md border text-[12px]", category === o.id ? "border-lav bg-lav font-medium" : "border-line bg-white text-sub")}
          >
            {o.label}
          </button>
        ))}
      </div>
      <PrimaryButton className="mt-5" disabled={!name.trim()} onClick={submit}>
        옷장에 넣기
      </PrimaryButton>
    </Modal>
  );
}
