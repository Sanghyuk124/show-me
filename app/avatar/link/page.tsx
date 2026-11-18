"use client";

import { useState } from "react";
import { LinkField, LinkScreen } from "@/components/LinkField";
import { setApp, showToast, useApp } from "@/lib/store";

/** Figma 07b · 입어보고 싶은 옷 링크 입력 */
export default function TryOnLinkPage() {
  const app = useApp();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? app.tryOnLink;
  const saved = Boolean(app.tryOnLink) && value === app.tryOnLink;

  return (
    <LinkScreen
      title="상품 링크 입력"
      back="/avatar"
      heading={
        <>
          입어보고 싶은 옷,
          <br />
          링크로 남겨 주세요.
        </>
      }
      desc="상품 상세 페이지의 웹사이트 주소를 입력해 주세요."
      cta="링크 저장"
      onSave={() => {
        if (!value) return showToast("링크를 입력해 주세요.");
        setApp(() => ({ tryOnLink: value }));
        showToast("링크를 저장했어요.");
      }}
    >
      <LinkField label="웹사이트 링크" value={value} onChange={setDraft} />
      {saved && (
        <p className="animate-rise rounded-xl border border-line bg-white p-3.5 text-[10px] leading-4 text-sub">
          <span className="mb-1 block text-[12px] leading-[18px] font-bold text-plum">입력한 링크를 저장했어요</span>
          뒤로 갔다가 다시 열어도 입력 내용은 유지돼요.
        </p>
      )}
    </LinkScreen>
  );
}
