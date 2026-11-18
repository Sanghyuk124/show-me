"use client";

import { useState } from "react";
import { Link2 } from "lucide-react";
import type { Category, ClosetItem } from "@/lib/data";
import { setApp } from "@/lib/store";
import { SaveButton } from "./MeasureModal";
import { cn, Modal } from "./ui";

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
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-[10px] bg-sand">
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
      <label className="flex flex-col gap-1.5 leading-[1.5]">
        <span className="text-[12px] font-medium text-sub">옷 이름</span>
        <input
          value={name}
          maxLength={20}
          placeholder="예: 베이지 니트"
          onChange={(e) => setName(e.target.value)}
          className="w-full rounded-[9px] border border-line bg-cream p-3 text-[14px] outline-none placeholder:text-[#9b9098] focus:border-plum"
        />
      </label>
      <div className="flex flex-col gap-1.5">
      <p className="text-[12px] leading-[1.5] font-medium text-sub">종류</p>
      <div className="grid grid-cols-4 gap-1.5">
        {OPTIONS.map((o) => (
          <button
            key={o.id}
            type="button"
            aria-pressed={category === o.id}
            onClick={() => setCategory(o.id)}
            className={cn("h-9 rounded-[7px] border text-[12px] text-plum", category === o.id ? "border-plum bg-lav font-bold" : "border-line bg-white")}
          >
            {o.label}
          </button>
        ))}
      </div>
      </div>
      <SaveButton disabled={!name.trim()} onClick={submit}>
        옷장에 넣기
      </SaveButton>
    </Modal>
  );
}
