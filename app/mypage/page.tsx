"use client";

import { useState } from "react";
import Link from "next/link";
import { ChevronRight, Settings } from "lucide-react";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { BackButton, cn, HeaderIcons, StackHeader } from "@/components/ui";
import { GENDER_LABEL, MY_PAGE_SECTIONS, PERSONAL_COLORS } from "@/lib/data";
import { resetApp, showToast, useApp } from "@/lib/store";

function Info({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div>
      <dt className="text-[9.5px] text-sub">{label}</dt>
      <dd className="mt-1 text-[13px] font-bold">
        {value}
        {unit && <span className="ml-1 text-[10.5px] font-normal text-sub">{unit}</span>}
      </dd>
    </div>
  );
}

export default function MyPage() {
  const { profile } = useApp();
  const [editing, setEditing] = useState(false);
  const color = PERSONAL_COLORS.find((c) => c.id === profile.personalColor)?.short ?? "아직 모름";

  return (
    <>
      <StackHeader title="마이페이지" left={<BackButton fallback="/chat" />} right={<HeaderIcons person={false} />} />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-[17px] pt-2 pb-6">
        <section className="rounded-xl border border-line bg-white px-4 pt-4 pb-4">
          <div className="flex items-center justify-between">
            <h2 className="text-[13.5px] font-bold">나의 기본 정보</h2>
            <button type="button" aria-label="기본 정보 수정" onClick={() => setEditing(true)} className="text-sub">
              <Settings className="size-[21px]" strokeWidth={1.3} />
            </button>
          </div>
          <dl className="mt-4 grid grid-cols-2 gap-y-4">
            <Info label="닉네임" value={profile.nickname || "미설정"} />
            <Info label="나이" value={profile.age} unit="세" />
            <Info label="성별" value={GENDER_LABEL[profile.gender]} />
            <Info label="퍼스널 컬러" value={color} />
            <Info label="키" value={profile.height} unit="cm" />
            <Info label="몸무게" value={profile.weight} unit="kg" />
          </dl>
        </section>

        {MY_PAGE_SECTIONS.map((section) => (
          <section key={section.title} className="mt-5">
            <h2 className="mb-2.5 text-[13.5px] font-bold">{section.title}</h2>
            <div className="divide-y divide-line overflow-hidden rounded-lg border border-line bg-white">
              {section.rows.map((row) => {
                const accent = "accent" in row && row.accent;
                const body = (
                  <>
                    <span>
                      <span className={cn("block text-[12.5px]", accent && "font-bold text-plum")}>{row.label}</span>
                      {"desc" in row && <span className="mt-1 block text-[10px] text-sub">{row.desc}</span>}
                    </span>
                    <ChevronRight className="size-3.5 text-sub" strokeWidth={1.5} />
                  </>
                );
                const cls = cn("flex w-full items-center justify-between px-3.5 text-left", accent ? "h-[62px] bg-lav" : "h-[46px]");
                return "href" in row && row.href ? (
                  <Link key={row.label} href={row.href} className={cls}>
                    {body}
                  </Link>
                ) : (
                  <button key={row.label} type="button" className={cls} onClick={() => showToast("아직 준비 중인 메뉴예요.")}>
                    {body}
                  </button>
                );
              })}
            </div>
          </section>
        ))}

        <footer className="mt-7 text-center">
          <p className="text-[11px] font-bold text-sub">Show Me</p>
          <p className="mt-1.5 text-[10px] text-faint">나다움을 찾는 여정</p>
          <button
            type="button"
            className="mt-4 text-[10px] text-faint underline underline-offset-2"
            onClick={() => {
              if (window.confirm("입력한 내용을 지우고 처음 상태로 되돌릴까요?")) {
                resetApp();
                showToast("처음 상태로 되돌렸어요.");
              }
            }}
          >
            데모 데이터 초기화
          </button>
        </footer>
      </main>
      {editing && <ProfileEditModal onClose={() => setEditing(false)} />}
    </>
  );
}
