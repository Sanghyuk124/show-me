"use client";

import { useRouter } from "next/navigation";
import { OnboardingFrame } from "@/components/OnboardingFrame";
import { cn, decimal, digits, UnitInput } from "@/components/ui";
import { GENDER_LABEL, PERSONAL_COLORS, type Gender, type Profile } from "@/lib/data";
import { setApp, useApp } from "@/lib/store";

/** 선택 칩 (Figma: 선택 시 #eee5ea 배경 + 자주색 테두리) */
function Chip({ on, onClick, className, children }: { on: boolean; onClick: () => void; className?: string; children: string }) {
  return (
    <button
      type="button"
      aria-pressed={on}
      onClick={onClick}
      className={cn(
        "rounded-[7.3px] border-[0.9px] py-[8.2px] text-left text-[11px] leading-[1.4] whitespace-nowrap",
        on ? "border-plum bg-lav font-medium" : "border-line bg-white",
        className,
      )}
    >
      {children}
    </button>
  );
}

const Label = ({ children }: { children: string }) => <span className="block text-[11px] leading-[1.4] font-medium">{children}</span>;

/** Figma 02 · 나의 기본 정보 */
export default function ProfileStep() {
  const router = useRouter();
  const { profile } = useApp();
  const patch = (next: Partial<Profile>) => setApp((s) => ({ profile: { ...s.profile, ...next } }));
  const seasons = PERSONAL_COLORS.filter((c) => c.id !== "unknown");

  return (
    <OnboardingFrame step={1} title="나의 기본 정보" back="/" cta="다음" onNext={() => router.push("/onboarding/concerns")}>
      <div className="flex flex-col gap-[17px] px-[22px] pt-[16.5px] pb-5">
        <h2 className="text-[24.7px] leading-[1.35] font-bold">
          당신을 조금만
          <br />
          알려주세요.
        </h2>
        <p className="text-[12px] leading-[1.4] text-sub">
          잘 몰라도 괜찮아요. 아는 만큼만 입력하면
          <br />
          추천을 시작할 수 있어요.
        </p>

        <label className="flex flex-col gap-1.5">
          <Label>나이 (만)</Label>
          <UnitInput label="나이" unit="세" inputMode="numeric" value={profile.age} onChange={(v) => patch({ age: digits(v) })} />
        </label>

        <div className="flex flex-col gap-1.5">
          <Label>성별</Label>
          <div className="flex gap-1.5">
            {(Object.keys(GENDER_LABEL) as Gender[]).map((g) => (
              <Chip key={g} on={profile.gender === g} onClick={() => patch({ gender: g })} className="flex-1 px-[9px]">
                {GENDER_LABEL[g]}
              </Chip>
            ))}
          </div>
        </div>

        <div className="flex gap-[9.3px]">
          <label className="flex flex-1 flex-col gap-1.5">
            <Label>키</Label>
            <UnitInput label="키" unit="cm" value={profile.height} onChange={(v) => patch({ height: decimal(v) })} />
          </label>
          <label className="flex flex-1 flex-col gap-1.5">
            <Label>몸무게</Label>
            <UnitInput label="몸무게" unit="kg" value={profile.weight} onChange={(v) => patch({ weight: decimal(v) })} />
          </label>
        </div>

        <div className="flex flex-col gap-1.5">
          <Label>퍼스널 컬러</Label>
          <div className="flex gap-[4.7px]">
            {seasons.map((c) => (
              <Chip key={c.id} on={profile.personalColor === c.id} onClick={() => patch({ personalColor: c.id })} className="flex-1 px-[6.4px]">
                {c.label}
              </Chip>
            ))}
          </div>
          <Chip on={profile.personalColor === "unknown"} onClick={() => patch({ personalColor: "unknown" })} className="self-start px-[9px]">
            아직 잘 모르겠어요
          </Chip>
        </div>

        <p className="rounded-[9px] bg-lav px-[12.8px] py-[11.5px] text-[10.1px] leading-[1.4] text-sub">
          입력한 정보는 맞춤 추천에 활용되며,
          <br />
          나중에 언제든 수정하거나 삭제할 수 있어요.
          <br />
          클릭 후 새 값 입력 · Backspace 삭제 · Enter 완료
        </p>
      </div>
    </OnboardingFrame>
  );
}
