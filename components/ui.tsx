"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { useToast } from "@/lib/store";

export const cn = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/** 숫자만 남기고, 소수점은 한 자리까지 허용합니다. */
export function decimal(v: string) {
  const clean = v.replace(/[^\d.]/g, "");
  const [a, ...rest] = clean.split(".");
  return rest.length ? `${a.slice(0, 3)}.${rest.join("").slice(0, 1)}` : a.slice(0, 3);
}
export const digits = (v: string, max = 3) => v.replace(/\D/g, "").slice(0, max);
export const won = (n: number) => `${n.toLocaleString("ko-KR")}원`;

export function PrimaryButton({ className, ...props }: ComponentProps<"button">) {
  return (
    <button
      type="button"
      {...props}
      className={cn(
        "w-full rounded-xl bg-plum p-4 text-[14px] leading-[1.5] font-bold text-white transition active:opacity-85",
        "disabled:bg-off disabled:text-sub",
        className,
      )}
    />
  );
}

export function useGoBack(fallback: string) {
  const router = useRouter();
  return () => (window.history.length > 1 ? router.back() : router.push(fallback));
}

export function BackButton({ fallback }: { fallback: string }) {
  const back = useGoBack(fallback);
  return (
    <button type="button" aria-label="뒤로 가기" onClick={back} className="shrink-0">
      <img src="/icons/back.svg" alt="" width={22} height={22} className="block size-[22px]" />
    </button>
  );
}

export function TextBack({ fallback }: { fallback: string }) {
  const back = useGoBack(fallback);
  return (
    <button type="button" onClick={back} className="text-[12px] leading-[18px] text-sub">
      이전
    </button>
  );
}

/** 헤더 오른쪽 장바구니·마이페이지 아이콘 (Figma 원본 SVG, 22px 칸) */
export function HeaderIcons({ cart = true, person = true }: { cart?: boolean; person?: boolean }) {
  return (
    <div className="flex items-center gap-3">
      {cart && (
        <Link href="/cart" aria-label="장바구니" className="relative block size-[22px] shrink-0">
          <img src="/icons/cart.svg" alt="" width={16.05} height={15.8} className="absolute top-[3.38px] left-[2.97px] block max-w-none" />
        </Link>
      )}
      {person && (
        <Link href="/mypage" aria-label="마이페이지" className="block size-[22px] shrink-0">
          <img src="/icons/mypage.svg" alt="" width={22} height={22} className="block size-[22px]" />
        </Link>
      )}
    </div>
  );
}

export function TabHeader({ title }: { title: string }) {
  return (
    <header className="pt-safe flex shrink-0 items-center gap-3 px-6 pb-3">
      <h1 className="min-w-0 flex-1 text-[17px] leading-[1.5] font-bold">{title}</h1>
      <HeaderIcons />
    </header>
  );
}

export function UnitInput({
  value,
  onChange,
  unit,
  placeholder,
  inputMode = "decimal",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder?: string;
  inputMode?: "decimal" | "numeric";
  label: string;
}) {
  return (
    <div className="flex h-12 items-center rounded-[9px] border-[0.9px] border-line bg-white px-3.5 transition focus-within:border-plum">
      <input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-0 min-w-0 flex-1 bg-transparent text-[13.7px] leading-[1.4] outline-none placeholder:text-faint"
      />
      <span className="ml-2 text-[11px] leading-[1.4] text-sub">{unit}</span>
    </div>
  );
}

/** Figma 팝업 창 공통 틀: 흰 배경, 모서리 20, 안쪽 여백 22, 제목 20 + × 닫기 */
export function Modal({
  title,
  onClose,
  children,
  align = "top",
  closeLabel,
  hideClose,
  className = "gap-4 p-[22px]",
  titleClassName = "text-[20px] leading-[1.5]",
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  align?: "top" | "center";
  closeLabel?: string;
  hideClose?: boolean;
  /** 창 안쪽 여백·간격 (화면마다 Figma 값이 조금씩 달라요) */
  className?: string;
  titleClassName?: string;
}) {
  const [root, setRoot] = useState<HTMLElement | null>(null);
  useEffect(() => {
    // 포털 대상은 브라우저에서만 찾을 수 있습니다.
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setRoot(document.getElementById("app-shell"));
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [onClose]);
  if (!root) return null;

  return createPortal(
    <div
      className={cn(
        "animate-fade absolute inset-0 z-40 flex justify-center bg-cream/70 px-5",
        align === "top" ? "items-start pt-[max(env(safe-area-inset-top),24px)] pb-5" : "items-center py-6",
      )}
      onMouseDown={(e) => e.target === e.currentTarget && onClose()}
    >
      <section
        role="dialog"
        aria-modal="true"
        aria-label={title}
        className={cn(
          "animate-pop no-scrollbar flex max-h-full w-full max-w-[360px] flex-col overflow-y-auto rounded-[20px] bg-white shadow-[0_6px_30px_rgba(60,40,50,0.08)]",
          className,
        )}
      >
        <div className="flex items-start gap-2.5">
          <h2 className={cn("min-w-0 flex-1 font-bold", titleClassName)}>{title}</h2>
          {hideClose ? null : closeLabel ? (
            <button type="button" onClick={onClose} className="h-7 w-[42px] shrink-0 rounded-[7px] border border-line bg-white text-[12px] leading-[18px] text-plum">
              {closeLabel}
            </button>
          ) : (
            <button type="button" aria-label="닫기" onClick={onClose} className="p-[5px] text-[22px] leading-[1.5] text-sub">
              ×
            </button>
          )}
        </div>
        {children}
      </section>
    </div>,
    root,
  );
}

export function Toast() {
  const text = useToast();
  if (!text) return null;
  return (
    <div className="pointer-events-none absolute inset-x-0 bottom-24 z-50 flex justify-center px-6">
      <p role="status" className="animate-rise rounded-full bg-ink/90 px-4 py-2 text-center text-[12px] text-white">
        {text}
      </p>
    </div>
  );
}
