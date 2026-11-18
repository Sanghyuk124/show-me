"use client";

import { useRouter } from "next/navigation";
import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn, decimal, digits, UnitInput } from "@/components/ui";
import { GENDER_LABEL, PERSONAL_COLORS, type Gender, type Profile } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

export default function ProfileStep() {
  const router = useRouter();
  const { profile } = useApp();
  const patch = (next: Partial<Profile>) => setApp((s) => ({ profile: { ...s.profile, ...next } }));

  return (
    <OnboardingFrame step={1} title="나의 기본 정보" back="/" cta="다음" onNext={() => router.push("/onboarding/concerns")}>
      <h2 className="text-[24px] leading-8 font-bold">
        당신을 조금만
        <br />
        알려주세요.
      </h2>
      <p className="mt-3.5 text-[12px] leading-[17px] text-sub">
        잘 몰라도 괜찮아요. 아는 만큼만 입력하면
        <br />
        추천을 시작할 수 있어요.
      </p>

      <label className="mt-5 block">
        <span className="mb-1.5 block text-[11px]">나이 (만)</span>
        <UnitInput label="나이" unit="세" inputMode="numeric" value={profile.age} onChange={(v) => patch({ age: digits(v) })} />
      </label>

      <p className="mt-4 mb-1.5 text-[11px]">성별</p>
      <div className="grid grid-cols-2 gap-2">
        {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
          <button
            key={g}
            type="button"
            aria-pressed={profile.gender === g}
            onClick={() => patch({ gender: g })}
            className={cn(
              "h-8 rounded-md border px-2.5 text-left text-[11px]",
              profile.gender === g ? "border-lav bg-lav" : "border-line bg-white",
            )}
          >
            {GENDER_LABEL[g]}
          </button>
        ))}
      </div>

      <div className="mt-4 grid grid-cols-2 gap-2.5">
        <label>
          <span className="mb-1.5 block text-[11px]">키</span>
          <UnitInput label="키" unit="cm" value={profile.height} onChange={(v) => patch({ height: decimal(v) })} />
        </label>
        <label>
          <span className="mb-1.5 block text-[11px]">몸무게</span>
          <UnitInput label="몸무게" unit="kg" value={profile.weight} onChange={(v) => patch({ weight: decimal(v) })} />
        </label>
      </div>

      <p className="mt-4 mb-1.5 text-[11px]">퍼스널 컬러</p>
      <div className="flex flex-wrap gap-[5px]">
        {PERSONAL_COLORS.map((c) => {
          const active = profile.personalColor === c.id;
          return (
            <button
              key={c.id}
              type="button"
              aria-pressed={active}
              onClick={() => patch({ personalColor: c.id })}
              className={cn(
                "h-8 rounded-md border px-2 text-left text-[10.5px]",
                c.id === "unknown" ? "px-2.5" : "w-[calc(25%-3.75px)]",
                active ? "border-lav bg-lav font-medium" : "border-line bg-white",
              )}
            >
              {c.label}
            </button>
          );
        })}
      </div>

      <p className="mt-4 rounded-md bg-lav px-3 py-2.5 text-[10px] leading-[15px] text-sub">
        입력한 정보는 맞춤 추천에 활용되며,
        <br />
        나중에 언제든 수정하거나 삭제할 수 있어요.
      </p>
    </OnboardingFrame>
  );
}
