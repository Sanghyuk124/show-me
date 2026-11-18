"use client";

import { useState } from "react";
import { LinkField } from "@/components/LinkField";
import { PrimaryButton, StackHeader, TextBack } from "@/components/ui";
import { setApp, showToast, useApp } from "@/lib/store";

export default function TryOnLinkPage() {
  const app = useApp();
  const [draft, setDraft] = useState<string | null>(null);
  const value = draft ?? app.tryOnLink;
  const saved = Boolean(app.tryOnLink) && value === app.tryOnLink;

  return (
    <>
      <StackHeader title="상품 링크 입력" left={<TextBack fallback="/avatar" />} />
      <main className="no-scrollbar animate-rise min-h-0 flex-1 overflow-y-auto px-6 pt-5 pb-4">
        <h2 className="text-[22px] leading-7 font-bold">
          입어보고 싶은 옷,
          <br />
          링크로 남겨 주세요.
        </h2>
        <p className="mt-2 mb-5 text-[11px] text-sub">상품 상세 페이지의 웹사이트 주소를 입력해 주세요.</p>
        <LinkField label="웹사이트 링크" value={value} onChange={setDraft} />
        {saved && (
          <p className="animate-rise mt-[18px] rounded-xl border border-line bg-white px-3 py-3 text-[10.5px] text-sub">
            <span className="mb-1 block text-[11.5px] font-bold text-plum">입력한 링크를 저장했어요</span>
            뒤로 갔다가 다시 열어도 입력 내용은 유지돼요.
          </p>
        )}
      </main>
      <div className="pb-safe shrink-0 px-6 pt-2">
        <PrimaryButton
          onClick={() => {
            if (!value) return showToast("링크를 입력해 주세요.");
            setApp(() => ({ tryOnLink: value }));
          }}
        >
          링크 저장
        </PrimaryButton>
      </div>
    </>
  );
}
