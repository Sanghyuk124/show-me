"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkField } from "@/components/LinkField";
import { cn, digits, PrimaryButton, StackHeader, TextBack } from "@/components/ui";
import { setApp, showToast } from "@/lib/store";

const TOP_ROW = ["XS", "S", "M", "L"];
const SECOND_ROW = ["XL", "XXL", "XXXL"];

export default function ClosetLinkPage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [size, setSize] = useState("");
  const [numeric, setNumeric] = useState(false);
  const [numberSize, setNumberSize] = useState("");
  const chosen = numeric ? numberSize : size;

  const SizeButton = ({ value }: { value: string }) => (
    <button
      type="button"
      aria-pressed={!numeric && size === value}
      onClick={() => {
        setNumeric(false);
        setSize(value);
      }}
      className={cn("h-[34px] rounded-md border text-[11px]", !numeric && size === value ? "border-plum bg-lav font-bold text-plum" : "border-line bg-white text-sub")}
    >
      {value}
    </button>
  );

  const save = () => {
    if (!link) return showToast("판매처 상품 링크를 입력해 주세요.");
    if (!chosen) return showToast("구매한 사이즈를 선택해 주세요.");
    setApp(() => ({ pendingLink: { url: link, size: chosen } }));
    router.push("/closet");
  };

  return (
    <>
      <StackHeader title="판매처 링크·구매 사이즈" left={<TextBack fallback="/closet" />} />
      <main className="no-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-4">
        <h2 className="text-[22px] leading-7 font-bold">
          구매한 옷의 링크와
          <br />
          사이즈를 알려주세요.
        </h2>
        <p className="mt-2 mb-5 text-[11px] text-sub">실제로 구매한 상품 페이지와 사이즈를 함께 남겨요.</p>
        <LinkField label="판매처 상품 링크" value={link} onChange={setLink} />

        <section className="mt-[18px] rounded-xl border border-line bg-white p-3.5">
          <div className="mb-2.5 flex items-center justify-between">
            <h3 className="text-[12px] font-bold">실제로 구매한 사이즈</h3>
            <span className="text-[10.5px] font-medium text-plum">{chosen || "선택 전"}</span>
          </div>
          <div className="grid grid-cols-4 gap-1.5">
            {TOP_ROW.map((s) => <SizeButton key={s} value={s} />)}
          </div>
          <div className="mt-2 grid grid-cols-3 gap-1.5">
            {SECOND_ROW.map((s) => <SizeButton key={s} value={s} />)}
          </div>
          {numeric ? (
            <input
              autoFocus
              value={numberSize}
              inputMode="numeric"
              aria-label="숫자 사이즈"
              placeholder="예: 95, 30"
              onChange={(e) => setNumberSize(digits(e.target.value))}
              className="mt-2 h-[34px] w-full rounded-md border border-plum px-3 text-center text-[12px] outline-none placeholder:text-faint"
            />
          ) : (
            <button type="button" onClick={() => setNumeric(true)} className="mt-2 h-[34px] w-full rounded-md border border-line text-[11px] text-sub">
              알파벳 사이즈가 아니에요 · 숫자로 입력
            </button>
          )}
        </section>
      </main>
      <div className="pb-safe shrink-0 px-6 pt-2">
        <PrimaryButton onClick={save}>링크와 구매 사이즈 저장</PrimaryButton>
      </div>
    </>
  );
}
