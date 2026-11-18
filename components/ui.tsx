"use client";

import { useEffect, useState, type ComponentProps, type ReactNode } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { ChevronLeft, ShoppingCart, X } from "lucide-react";
import { PersonIcon } from "./icons";
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
        "h-[50px] w-full rounded-lg bg-plum text-[13px] font-bold text-white transition active:opacity-85",
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
    <button type="button" aria-label="뒤로 가기" onClick={back} className="-ml-1.5 p-1.5">
      <ChevronLeft className="size-5" strokeWidth={1.6} />
    </button>
  );
}

export function TextBack({ fallback }: { fallback: string }) {
  const back = useGoBack(fallback);
  return (
    <button type="button" onClick={back} className="text-[11px] text-sub">
      이전
    </button>
  );
}

export function HeaderIcons({ cart = true, person = true }: { cart?: boolean; person?: boolean }) {
  return (
    <div className="flex items-center gap-3.5">
      {cart && (
        <Link href="/cart" aria-label="장바구니">
          <ShoppingCart className="size-[19px]" strokeWidth={1.6} />
        </Link>
      )}
      {person && (
        <Link href="/mypage" aria-label="마이페이지">
          <PersonIcon className="size-[21px]" />
        </Link>
      )}
    </div>
  );
}

export function TabHeader({ title }: { title: string }) {
  return (
    <header className="pt-safe flex shrink-0 items-center justify-between px-6 pb-2.5">
      <h1 className="text-[16px] font-bold">{title}</h1>
      <HeaderIcons />
    </header>
  );
}

export function StackHeader({ title, left, right }: { title: string; left: ReactNode; right?: ReactNode }) {
  return (
    <header className="pt-safe flex shrink-0 items-center justify-between px-6 pb-2.5">
      <div className="flex items-center gap-3">
        {left}
        <h1 className="text-[16px] font-bold">{title}</h1>
      </div>
      {right}
    </header>
  );
}

export function UnitInput({
  value,
  onChange,
  unit,
  placeholder,
  tone = "white",
  inputMode = "decimal",
  label,
}: {
  value: string;
  onChange: (v: string) => void;
  unit: string;
  placeholder?: string;
  tone?: "white" | "cream" | "lav";
  inputMode?: "decimal" | "numeric";
  label: string;
}) {
  return (
    <div
      className={cn(
        "flex h-[46px] items-center rounded-lg border border-line px-3.5 transition focus-within:border-ink/60",
        tone === "white" && "bg-white",
        tone === "cream" && "bg-cream",
        tone === "lav" && "bg-[#f3eff2]",
      )}
    >
      <input
        aria-label={label}
        value={value}
        placeholder={placeholder}
        inputMode={inputMode}
        onChange={(e) => onChange(e.target.value)}
        className="w-0 min-w-0 flex-1 bg-transparent text-[14px] outline-none placeholder:text-faint"
      />
      <span className="ml-2 text-[10.5px] text-faint">{unit}</span>
    </div>
  );
}

export function Modal({
  title,
  onClose,
  children,
  align = "top",
  closeLabel,
  hideClose,
}: {
  title: string;
  onClose: () => void;
  children: ReactNode;
  align?: "top" | "center";
  closeLabel?: string;
  hideClose?: boolean;
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
        className="animate-pop no-scrollbar max-h-full w-full overflow-y-auto rounded-2xl bg-white px-[22px] pt-5 pb-5 shadow-[0_6px_30px_rgba(60,40,50,0.08)]"
      >
        <div className="flex items-center justify-between">
          <h2 className="text-[19px] font-bold">{title}</h2>
          {hideClose ? null : closeLabel ? (
            <button type="button" onClick={onClose} className="rounded-md border border-line px-2.5 py-1 text-[11px] text-sub">
              {closeLabel}
            </button>
          ) : (
            <button type="button" aria-label="닫기" onClick={onClose} className="-mr-1 p-1 text-sub">
              <X className="size-5" strokeWidth={1.5} />
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
