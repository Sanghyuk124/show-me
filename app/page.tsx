import Link from "next/link";

/** Figma 01 · Show Me 랜딩 */
export default function SplashPage() {
  return (
    <main className="flex h-full flex-col">
      <header className="pt-safe flex shrink-0 items-center gap-3 px-6 pb-3 leading-[1.5]">
        <span className="flex-1 font-serif text-[20px] text-plum">Show Me</span>
        <span className="flex-1 text-right text-[10px] text-sub">나다움을 찾는 여정</span>
      </header>

      <section className="animate-rise flex min-h-0 flex-1 flex-col items-center justify-center gap-[30px] px-[22.5px] text-center">
        <p className="text-[10px] leading-[1.5] font-medium tracking-[1.88px] text-plum">LESS SCROLLING, MORE YOU</p>
        <div className="font-medium">
          <p className="text-[15px] leading-[1.45]">당신의 쇼핑 메이트,</p>
          <h1 className="text-[40px] leading-[1.45] font-bold">Show Me</h1>
        </div>
        <p className="h-20 text-[13.1px] leading-[1.5] text-sub">
          뭘 입을지 막막한 순간부터
          <br />
          나답게 고를 수 있는 순간까지.
        </p>
      </section>

      <div className="pb-safe flex shrink-0 flex-col gap-3 px-6 pt-3">
        <Link
          href="/onboarding/profile"
          className="block rounded-xl bg-plum p-4 text-center text-[14px] leading-[1.5] font-bold text-white active:opacity-85"
        >
          나의 쇼핑메이트 만나기
        </Link>
        <p className="text-center text-[11px] leading-[1.5] text-sub">나답게 고르는 연습, 여기서 시작해요.</p>
      </div>
    </main>
  );
}
