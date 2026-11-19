"use client";

import { useEffect, useRef, useState } from "react";
import { Link2 } from "lucide-react";
import type { Category, ClosetItem } from "@/lib/data";
import { classifyItem, guessCategory, type ClassifyResult } from "@/lib/classify";
import { setApp } from "@/lib/store";
import { SaveButton } from "./MeasureModal";
import { cn, Modal } from "./ui";

// 아우터는 옷장의 '상의' 탭에, 가방·신발·모자 같은 잡화는 'ACC' 탭에 들어가요.
const OPTIONS: { id: Category; label: string }[] = [
  { id: "top", label: "상의" },
  { id: "outer", label: "아우터" },
  { id: "bottom", label: "하의" },
  { id: "bag", label: "ACC" },
];

export interface NewItemSource {
  /** 옷장에 저장할 사진 (사진 첨부면 배경을 지운 사진) */
  image?: string;
  /** AI 분류에 보낼 원래 사진 (JPEG) */
  aiImage?: string;
  /** image가 배경을 지운 사진인지 */
  cutout?: boolean;
  link?: string;
  size?: string;
}

/** 사진 첨부 또는 판매처 링크 저장 뒤에 옷 이름과 종류를 받는 창. 종류는 AI가 먼저 추천해요. */
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
  const [category, setCategory] = useState<Category | null>(null);
  const [picked, setPicked] = useState(false); // 사용자가 직접 종류를 골랐는지
  const [suggestion, setSuggestion] = useState<ClassifyResult | null>(null);
  const [busy, setBusy] = useState(true); // 창이 열리자마자 분류를 시작해요
  const run = useRef(0);
  const pickedRef = useRef(false); // 분류 결과가 늦게 와도 직접 고른 종류를 덮어쓰지 않게
  const timer = useRef<ReturnType<typeof setTimeout>>(undefined);

  const apply = (id: number, result: ClassifyResult) => {
    if (id !== run.current) return; // 더 최근 요청이 있으면 무시
    setBusy(false);
    setSuggestion(result);
    if (result.name) setName((cur) => cur || result.name!);
    if (result.category && !pickedRef.current) setCategory(result.category);
  };

  // 창이 열리면 사진(또는 링크)으로 바로 분류를 시도해요.
  useEffect(() => {
    const id = ++run.current;
    classifyItem({ image: source.aiImage ?? source.image, link: source.link }).then((r) => apply(id, r));
    return () => clearTimeout(timer.current);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // 이름을 바꾸면 단어로 먼저 추천하고, 잠시 뒤 AI로 다시 분류해요 (직접 고른 뒤에는 바꾸지 않아요).
  const onName = (value: string) => {
    setName(value);
    clearTimeout(timer.current);
    if (pickedRef.current || !value.trim()) return;
    const keyword = guessCategory(value, source.link);
    if (keyword) setCategory(keyword);
    timer.current = setTimeout(() => {
      const id = ++run.current;
      setBusy(true);
      classifyItem({ name: value.trim(), link: source.link, image: source.aiImage ?? source.image }).then((r) => apply(id, r));
    }, 700);
  };

  const submit = () => {
    if (!category) return;
    const item: ClosetItem = {
      id: `item-${Date.now()}`,
      name: name.trim(),
      category,
      source: source.link ? "link" : "photo",
      image: source.image,
      cutout: source.cutout,
      link: source.link,
      size: source.size,
      favorite: false,
      confirmed: false,
      measures: {},
    };
    setApp((s) => ({ closet: [item, ...s.closet] }));
    onCreated(item);
  };

  const hint = busy
    ? "종류를 분류하고 있어요…"
    : picked
      ? "직접 고른 종류로 넣을게요."
      : suggestion?.by === "ai" && category
        ? "AI가 사진·이름을 보고 분류했어요. 다르면 직접 골라 주세요."
        : category
          ? "옷 이름으로 추천했어요. 다르면 직접 골라 주세요."
          : "옷 이름을 쓰면 종류를 추천해 드려요. 직접 골라도 돼요.";

  return (
    <Modal title="내 옷 등록" onClose={onClose} align="center">
      <div className="flex h-32 items-center justify-center overflow-hidden rounded-[10px] bg-sand">
        {source.image ? (
          <img src={source.image} alt="등록할 옷" className={cn("h-full w-full", source.cutout ? "object-contain p-2" : "object-cover")} />
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
          onChange={(e) => onName(e.target.value)}
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
              onClick={() => {
                pickedRef.current = true;
                setPicked(true);
                setCategory(o.id);
              }}
              className={cn("h-9 rounded-[7px] border text-[12px] text-plum", category === o.id ? "border-plum bg-lav font-bold" : "border-line bg-white")}
            >
              {o.label}
            </button>
          ))}
        </div>
        <p aria-live="polite" className={cn("text-[10px] leading-[1.5] text-sub", busy && "animate-pulse")}>
          {hint}
        </p>
      </div>
      <SaveButton disabled={!name.trim() || !category} onClick={submit}>
        옷장에 넣기
      </SaveButton>
    </Modal>
  );
}
