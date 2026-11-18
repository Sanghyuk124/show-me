import Link from "next/link";

export default function SplashPage() {
  return (
    <main className="pt-safe pb-safe flex h-full flex-col px-6">
      <header className="flex items-center justify-between">
        <span className="font-serif text-[20px] text-plum">Show Me</span>
        <span className="text-[10px] text-sub">나다움을 찾는 여정</span>
      </header>

      <section className="animate-rise flex flex-1 flex-col items-center justify-center pb-16 text-center">
        <p className="text-[10px] tracking-[0.16em] text-plum">LESS SCROLLING, MORE YOU</p>
        <p className="mt-7 text-[14px] font-medium">당신의 쇼핑 메이트,</p>
        <h1 className="mt-2 text-[40px] leading-[52px] font-bold">Show Me</h1>
        <p className="mt-7 text-[12.5px] leading-5 text-sub">
          뭘 입을지 막막한 순간부터
          <br />
          나답게 고를 수 있는 순간까지.
        </p>
      </section>

      <Link
        href="/onboarding/profile"
        className="flex h-[52px] items-center justify-center rounded-lg bg-plum text-[13px] font-bold text-white active:opacity-85"
      >
        나의 쇼핑메이트 만나기
      </Link>
      <p className="mt-3.5 text-center text-[11px] text-sub">나답게 고르는 연습, 여기서 시작해요.</p>
    </main>
  );
}
