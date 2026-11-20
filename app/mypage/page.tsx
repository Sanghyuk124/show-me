"use client";

import { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import "@fontsource/noto-emoji/400.css";
import { ProfileEditModal } from "@/components/ProfileEditModal";
import { BackButton, cn, HeaderIcons } from "@/components/ui";
import { GENDER_LABEL, MY_PAGE_SECTIONS, PERSONAL_COLORS } from "@/lib/data";
import { resetApp, showToast, useApp } from "@/lib/store";

function Info({ label, value, unit }: { label: string; value: string; unit?: string }) {
  return (
    <div className="flex min-w-0 flex-1 flex-col gap-[3px]">
      <dt className="text-[10px] leading-[17px] text-sub">{label}</dt>
      <dd className="flex h-[22px] items-center gap-[3px] whitespace-nowrap">
        <span className="text-[14px] leading-[21px] font-bold">{value}</span>
        {unit && <span className="text-[11px] leading-[18px] text-sub">{unit}</span>}
      </dd>
    </div>
  );
}

export default function MyPage() {
  const router = useRouter();
  const { profile } = useApp();
  const [editing, setEditing] = useState(false);
  const color = PERSONAL_COLORS.find((c) => c.id === profile.personalColor)?.short ?? "아직 모름";

  return (
    <>
      <header className="pt-safe flex shrink-0 items-center gap-3 px-6 pb-3">
        <BackButton fallback="/chat" />
        <h1 className="min-w-0 flex-1 text-[17px] leading-[1.5] font-bold">마이페이지</h1>
        <HeaderIcons person={false} />
      </header>
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-[18px] pt-3 pb-6">
        <section className="flex flex-col gap-3.5 rounded-xl border border-line bg-white p-4">
          <div className="flex h-8 items-center">
            <h2 className="flex-1 text-[15px] leading-[22px] font-bold">나의 기본 정보</h2>
            <button
              type="button"
              aria-label="기본 정보 수정"
              onClick={() => setEditing(true)}
              className="h-7 w-9 text-center font-['Noto_Emoji'] text-[22px] leading-7 text-plum"
            >
              ⚙
            </button>
          </div>
          <dl className="flex flex-col gap-[13px]">
            <div className="flex h-[42px] gap-4">
              <Info label="닉네임" value={profile.nickname || "미설정"} />
              <Info label="나이" value={profile.age} unit="세" />
            </div>
            <div className="flex h-[42px] gap-4">
              <Info label="성별" value={GENDER_LABEL[profile.gender]} />
              <Info label="퍼스널 컬러" value={color} />
            </div>
            <div className="flex h-[42px] gap-4">
              <Info label="키" value={profile.height} unit="cm" />
              <Info label="몸무게" value={profile.weight} unit="kg" />
            </div>
          </dl>
        </section>

        {MY_PAGE_SECTIONS.map((section, i) => (
          <section key={section.title} className={cn("flex flex-col gap-2.5", i === 1 && "pt-1.5")}>
            <h2 className="text-[14px] leading-[21px] font-bold">{section.title}</h2>
            <div className="flex flex-col divide-y divide-line overflow-hidden rounded-[10px] border border-line bg-white">
              {section.rows.map((row) => {
                const accent = "accent" in row && row.accent;
                const body = (
                  <>
                    <span className="flex min-w-0 flex-1 flex-col justify-center gap-0.5">
                      <span className={cn("text-[13px] leading-5", accent && "font-bold text-plum")}>{row.label}</span>
                      {"desc" in row && <span className="text-[10px] leading-[17px] text-sub">{row.desc}</span>}
                    </span>
                    <span className="w-2.5 text-right text-[18px] leading-[25px] text-sub">›</span>
                  </>
                );
                const cls = cn("flex w-full items-center gap-3 px-3.5 text-left", accent ? "h-[62px] bg-lav" : "h-[46px]");
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

        <footer className="flex flex-col gap-1 text-center text-sub">
          <p className="text-[11px] leading-[18px] font-bold">Show Me</p>
          <p className="text-[10px] leading-[17px]">나다움을 찾는 여정</p>
          {/* 시연용: 모든 기록을 지우고 첫 화면(시작 → 온보딩 3단계)부터 다시 보기 */}
          <button
            type="button"
            className="mx-auto mt-4 rounded-lg border border-plum bg-white px-4 py-2 text-[11px] font-bold text-plum"
            onClick={() => {
              if (window.confirm("모든 기록을 지우고 첫 화면부터 다시 시작할까요?")) {
                resetApp();
                router.replace("/");
              }
            }}
          >
            처음부터 다시 시작하기
          </button>
          <button
            type="button"
            className="mt-2 text-[10px] text-faint underline underline-offset-2"
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
