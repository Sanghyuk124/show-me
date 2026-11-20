"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { LinkField, LinkScreen } from "@/components/LinkField";
import { cn, digits } from "@/components/ui";
import { importFromLink } from "@/lib/linkImport";
import { sameLinkKey, setApp, showToast, useApp } from "@/lib/store";

/** 체험용 판매처 링크 (lib/data.ts LINK_PRESETS) — 성별마다 2개 */
const TRY_LINKS = {
  female: ["example.com/showme/women-cardigan", "example.com/showme/women-denim"],
  male: ["example.com/showme/men-knit", "example.com/showme/men-denim"],
};

const TOP_ROW = ["XS", "S", "M", "L"];
const SECOND_ROW = ["XL", "XXL", "XXXL"];

/** Figma 06c · 판매처 링크와 구매 사이즈 */
export default function ClosetLinkPage() {
  const router = useRouter();
  const [link, setLink] = useState("");
  const [size, setSize] = useState("");
  const [numeric, setNumeric] = useState(false);
  const [numberSize, setNumberSize] = useState("");
  const [busy, setBusy] = useState(false);
  const { profile, closet } = useApp();
  // 체험용 링크를 누르면 입력란에 넣고, 클립보드에도 복사해요
  const tryLink = (url: string) => {
    setLink(url);
    navigator.clipboard?.writeText(url).catch(() => {});
    showToast("체험용 링크를 넣었어요. 사이즈를 고르고 저장해 보세요.");
  };
  const chosen = numeric ? numberSize : size;

  const SizeButton = ({ value }: { value: string }) => {
    const on = !numeric && size === value;
    return (
      <button
        type="button"
        aria-pressed={on}
        onClick={() => {
          setNumeric(false);
          setSize(value);
        }}
        className={cn("h-9 flex-1 rounded-[7px] border text-[12px] leading-[18px] text-plum", on ? "border-plum bg-lav font-bold" : "border-line bg-white")}
      >
        {value}
      </button>
    );
  };

  // 저장하면 링크에서 옷 사진·이름, 미리 세팅한 링크면 실측까지 가져와요 (lib/linkImport.ts)
  const save = async () => {
    if (busy) return;
    if (!link) return showToast("판매처 상품 링크를 입력해 주세요.");
    if (!chosen) return showToast("구매한 사이즈를 선택해 주세요.");
    // 이미 옷장에 있는 링크면 또 넣지 않아요
    const dup = closet.find((i) => i.link && sameLinkKey(i.link) === sameLinkKey(link));
    if (dup) return showToast(`이미 옷장에 있는 옷이에요 (${dup.name}).`);
    setBusy(true);
    const imp = await importFromLink(link, chosen);
    setBusy(false);
    if (imp.preset) showToast("판매처에서 옷 사진과 실측을 불러왔어요.");
    else if (imp.image) showToast("판매처에서 옷 사진을 불러왔어요. 실측은 직접 확인해 주세요.");
    else showToast("이 링크에서는 옷 사진을 가져오지 못했어요.");
    setApp(() => ({ pendingLink: { url: link, size: chosen, ...imp } }));
    router.push("/closet");
  };

  return (
    <LinkScreen
      title="판매처 링크·구매 사이즈"
      back="/closet"
      heading={
        <>
          구매한 옷의 링크와
          <br />
          사이즈를 알려주세요.
        </>
      }
      desc="실제로 구매한 상품 페이지와 사이즈를 함께 남겨요."
      cta={busy ? "판매처에서 불러오는 중…" : "링크와 구매 사이즈 저장"}
      onSave={save}
    >
      <LinkField label="판매처 상품 링크" value={link} onChange={setLink} />
      <div className="-mt-2.5 flex flex-col gap-1 px-1 text-[10px] leading-[1.5] text-sub">
        <p>체험해 보기 · 눌러서 넣거나 길게 눌러 복사하세요</p>
        {TRY_LINKS[profile.gender].map((url) => (
          <button key={url} type="button" onClick={() => tryLink(url)} className="self-start font-mono text-[10.5px] break-all text-plum underline underline-offset-2 select-all">
            {url}
          </button>
        ))}
      </div>

      <section className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3.5">
        <div className="flex h-5 items-start font-bold">
          <h3 className="flex-1 text-[12px] leading-[18px]">실제로 구매한 사이즈</h3>
          <span className="w-[94px] text-right text-[11px] leading-[17px] text-plum">{chosen || "선택 전"}</span>
        </div>
        <div className="flex gap-1.5">
          {TOP_ROW.map((s) => (
            <SizeButton key={s} value={s} />
          ))}
        </div>
        <div className="flex gap-1.5">
          {SECOND_ROW.map((s) => (
            <SizeButton key={s} value={s} />
          ))}
        </div>
        {numeric ? (
          <input
            autoFocus
            value={numberSize}
            inputMode="numeric"
            aria-label="숫자 사이즈"
            placeholder="예: 95, 30"
            onChange={(e) => setNumberSize(digits(e.target.value))}
            className="h-[34px] w-full rounded-[7px] border border-plum bg-lav px-3 text-center text-[12px] text-plum outline-none placeholder:text-faint"
          />
        ) : (
          <button type="button" onClick={() => setNumeric(true)} className="h-[34px] w-full rounded-[7px] border border-line bg-white text-[12px] leading-[18px] text-plum">
            알파벳 사이즈가 아니에요 · 숫자로 입력
          </button>
        )}
      </section>
    </LinkScreen>
  );
}
