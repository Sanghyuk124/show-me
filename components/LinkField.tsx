"use client";

export const MAX_LINK = 128;
/** 링크에 쓰는 영문·숫자·특수문자만 남깁니다. */
export const cleanLink = (v: string) => v.replace(/[^\x21-\x7E]/g, "").slice(0, MAX_LINK);

export function LinkField({
  label,
  value,
  onChange,
}: {
  label: string;
  value: string;
  onChange: (v: string) => void;
}) {
  return (
    <section className="rounded-xl border border-line bg-white p-3.5">
      <div className="mb-2 flex items-center justify-between">
        <label htmlFor="link" className="text-[12px] font-bold">
          {label}
        </label>
        <span className="text-[10px] text-sub">
          {value.length} / {MAX_LINK}
        </span>
      </div>
      <textarea
        id="link"
        value={value}
        inputMode="url"
        autoCapitalize="none"
        autoCorrect="off"
        spellCheck={false}
        placeholder="예: https://brand.com/product/123"
        onChange={(e) => onChange(cleanLink(e.target.value))}
        className="h-[125px] w-full resize-none rounded-lg border border-line bg-white px-3 py-3 text-[13px] break-all outline-none placeholder:text-sub focus:border-ink"
      />
      <p className="mt-2 text-[10px] text-sub">영문·숫자·URL 특수문자 최대 128자</p>
    </section>
  );
}
