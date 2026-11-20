"use client";

// AI 가상 사용자 평가 화면 (/eval). 실제 사람이 아닌, AI가 연기한 가상 사용자의 평가예요.
// '평가 시작'을 누르면 서버(app/api/eval)가 가상 사용자 6명 × 질문 3개를 돌려요 (API 키 필요, 1~3분).
// 결과는 이 브라우저에 저장되고, JSON으로 내려받을 수 있어요. public/eval-result.json 이 있으면 그 결과를 먼저 보여줘요.

import { useEffect, useState } from "react";
import { cn } from "@/components/ui";
import { EVAL_CRITERIA, EVAL_PERSONAS, type EvalCriterion } from "@/lib/evalSet";
import { findProduct } from "@/lib/products";

type Scores = Record<EvalCriterion, number>;
interface EvalCase {
  question: string;
  baseline: { text: string; scores: Scores };
  showme: { text: string; products: string[]; scores: Scores };
  prefer: "showme" | "baseline" | "same";
  reason: string;
}
interface PersonaResult {
  persona: { id: string; label: string; story: string };
  cases: EvalCase[];
  model?: { answer: string; judge: string };
}
interface EvalRun {
  at: string;
  results: PersonaResult[];
}

const STORE = "showme-eval-v1";
const CODE = "showme-eval-1120";

const avg = (xs: number[]) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const fmt = (n: number) => n.toFixed(2);

function Bar({ label, a, b }: { label: string; a: number; b: number }) {
  return (
    <div className="flex flex-col gap-1">
      <div className="flex items-baseline text-[11px] leading-[1.4]">
        <span className="flex-1 font-bold">{label}</span>
        <span className="text-sub">
          {fmt(a)} → <b className="text-plum">{fmt(b)}</b>
          <span className="ml-1 text-[10px] text-plum">({b - a >= 0 ? "+" : ""}{fmt(b - a)})</span>
        </span>
      </div>
      <div className="flex flex-col gap-[3px]">
        <span className="h-2 rounded-full bg-off" style={{ width: `${(a / 5) * 100}%` }} />
        <span className="h-2 rounded-full bg-plum" style={{ width: `${(b / 5) * 100}%` }} />
      </div>
    </div>
  );
}

function CaseCard({ c }: { c: EvalCase }) {
  const [open, setOpen] = useState(false);
  const total = (s: Scores) => avg(EVAL_CRITERIA.map((k) => s[k.key]));
  return (
    <div className="flex flex-col gap-2 rounded-[10px] border border-line bg-white p-3 leading-[1.45]">
      <p className="text-[12px] font-bold">“{c.question}”</p>
      <div className="grid grid-cols-[1fr_auto_auto] gap-x-3 gap-y-0.5 text-[10.5px]">
        <span className="text-sub">항목</span>
        <span className="text-right text-sub">일반 AI</span>
        <span className="text-right font-bold text-plum">Show Me</span>
        {EVAL_CRITERIA.map((k) => (
          <span key={k.key} className="contents">
            <span>{k.label}</span>
            <span className="text-right">{c.baseline.scores[k.key]}</span>
            <span className="text-right font-bold text-plum">{c.showme.scores[k.key]}</span>
          </span>
        ))}
        <span className="font-bold">평균</span>
        <span className="text-right font-bold">{fmt(total(c.baseline.scores))}</span>
        <span className="text-right font-bold text-plum">{fmt(total(c.showme.scores))}</span>
      </div>
      <p className="rounded-[8px] bg-lav px-2.5 py-2 text-[10.5px]">
        <b className="text-plum">{c.prefer === "showme" ? "Show Me 선택" : c.prefer === "baseline" ? "일반 AI 선택" : "비슷함"}</b> · {c.reason}
      </p>
      <button type="button" onClick={() => setOpen((o) => !o)} className="self-start text-[10px] text-sub underline underline-offset-2">
        {open ? "답변 접기" : "두 답변 보기"}
      </button>
      {open && (
        <div className="flex flex-col gap-2 text-[10.5px] whitespace-pre-line">
          <div className="rounded-[8px] bg-cream p-2.5">
            <p className="mb-1 font-bold text-sub">일반 AI (질문만 받음)</p>
            {c.baseline.text}
          </div>
          <div className="rounded-[8px] bg-cream p-2.5">
            <p className="mb-1 font-bold text-plum">Show Me</p>
            {c.showme.text}
            {c.showme.products.length > 0 && (
              <p className="mt-1.5 text-sub">추천 상품: {c.showme.products.map((id) => findProduct(id)?.label ?? findProduct(id)?.name ?? id).join(", ")}</p>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function EvalPage() {
  const [run, setRun] = useState<EvalRun | null>(null);
  const [status, setStatus] = useState<Record<number, "wait" | "run" | "done" | "fail">>({});
  const running = Object.values(status).some((s) => s === "run");
  const [failNote, setFailNote] = useState("");

  useEffect(() => {
    let saved: EvalRun | null = null;
    try {
      saved = JSON.parse(localStorage.getItem(STORE) ?? "null");
    } catch {}
    if (saved) {
      // eslint-disable-next-line react-hooks/set-state-in-effect
      setRun(saved);
      return;
    }
    fetch("/eval-result.json")
      .then((r) => (r.ok ? r.json() : null))
      .then((snap: EvalRun | null) => snap && setRun(snap))
      .catch(() => {});
  }, []);

  const start = async () => {
    if (running) return;
    if (!window.confirm("API를 사용해 평가를 돌릴까요? (1~3분, 요금이 조금 들어요)")) return;
    setFailNote("");
    setStatus(Object.fromEntries(EVAL_PERSONAS.map((_, i) => [i, "run"])));
    const results: (PersonaResult | null)[] = await Promise.all(
      EVAL_PERSONAS.map(async (_, i) => {
        for (let attempt = 0; attempt < 2; attempt++) {
          try {
            const res = await fetch(`/api/eval?p=${i}&code=${CODE}`);
            if (res.ok) {
              setStatus((s) => ({ ...s, [i]: "done" }));
              return (await res.json()) as PersonaResult;
            }
            if (res.status === 503 || res.status === 403) {
              setFailNote(res.status === 503 ? "서버에 API 키가 없어서 평가할 수 없어요. (키가 만료됐거나 아직 설정되지 않았어요)" : "평가 코드가 맞지 않아요.");
              break;
            }
            if (res.status === 502) setFailNote("AI 연결에 실패했어요. API 키가 만료됐는지 확인해 주세요.");
          } catch {}
        }
        setStatus((s) => ({ ...s, [i]: "fail" }));
        return null;
      }),
    );
    const next: EvalRun = { at: new Date().toISOString(), results: results.filter((r): r is PersonaResult => !!r) };
    if (next.results.length) {
      setRun(next);
      try {
        localStorage.setItem(STORE, JSON.stringify(next));
      } catch {}
    }
  };

  const download = () => {
    if (!run) return;
    const url = URL.createObjectURL(new Blob([JSON.stringify(run, null, 2)], { type: "application/json" }));
    const a = Object.assign(document.createElement("a"), { href: url, download: "showme-eval-result.json" });
    a.click();
    URL.revokeObjectURL(url);
  };

  const cases = run?.results.flatMap((r) => r.cases) ?? [];
  const per = (side: "baseline" | "showme", key: EvalCriterion) => avg(cases.map((c) => c[side].scores[key]));
  const overall = (side: "baseline" | "showme") => avg(EVAL_CRITERIA.map((k) => per(side, k.key)));
  const wins = cases.filter((c) => c.prefer === "showme").length;
  const losses = cases.filter((c) => c.prefer === "baseline").length;

  return (
    <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-[18px] pt-[max(env(safe-area-inset-top),20px)] pb-8">
      <header className="flex flex-col gap-1.5">
        <p className="text-[11px] font-bold text-plum">Show Me · AI 활용 검증</p>
        <h1 className="text-[21px] leading-[1.35] font-bold">AI 가상 사용자 평가</h1>
        <p className="text-[11px] leading-[1.55] text-sub">
          서로 다른 가상 사용자 {EVAL_PERSONAS.length}명이 같은 질문을 <b>일반 AI 챗봇</b>과 <b>Show Me</b>에 물어보고, 그 사용자를 연기하는 평가자 AI가 두 답을 어느 쪽인지
          모르게 섞어서 1~5점으로 채점했어요.
        </p>
      </header>

      <section className="flex flex-col gap-1.5 rounded-[10px] bg-sand p-3 text-[10.5px] leading-[1.55] text-sub">
        <p className="font-bold text-ink">평가 방법</p>
        <p>· 일반 AI: 같은 AI 모델에 질문만 보냄 (사용자 정보·옷장·상품 실측 없음)</p>
        <p>· Show Me: 앱과 똑같이 체형·퍼스널 컬러·취향·옷장 실측·상품 사이즈표를 함께 보냄</p>
        <p>· 두 쪽 모두 같은 답변 모델을 써서, 차이는 &lsquo;무엇을 알고 어떻게 설계했는가&rsquo;에서만 나와요</p>
        <p>· 평가자 AI는 답변 순서를 섞어 받아 어느 쪽이 Show Me인지 몰라요</p>
        <p className="text-warn">※ 실제 사람이 아닌 AI 가상 사용자 시뮬레이션 결과예요.</p>
      </section>

      <div className="flex gap-2">
        <button
          type="button"
          onClick={start}
          disabled={running}
          className="flex-1 rounded-[10px] bg-plum py-3 text-[12px] font-bold text-white disabled:opacity-60"
        >
          {running ? "평가하는 중…" : run ? "다시 평가하기" : "평가 시작"}
        </button>
        {run && (
          <button type="button" onClick={download} className="rounded-[10px] border border-plum bg-white px-3 text-[11px] font-bold text-plum">
            결과 내려받기
          </button>
        )}
      </div>
      {Object.keys(status).length > 0 && (
        <div className="flex flex-wrap gap-1 text-[10px]">
          {EVAL_PERSONAS.map((p, i) => (
            <span
              key={p.id}
              className={cn(
                "rounded-full px-2 py-0.5",
                status[i] === "done" ? "bg-plum text-white" : status[i] === "fail" ? "bg-warn text-white" : "animate-pulse bg-lav text-plum",
              )}
            >
              {p.label.split(" · ")[0]} {status[i] === "done" ? "완료" : status[i] === "fail" ? "실패" : "진행 중"}
            </span>
          ))}
        </div>
      )}

      {failNote && <p className="text-[11px] text-warn">{failNote}</p>}

      {run && cases.length > 0 && (
        <>
          <section className="flex flex-col gap-3 rounded-[12px] border border-line bg-white p-3.5">
            <div className="flex items-baseline">
              <h2 className="flex-1 text-[14px] font-bold">종합 결과</h2>
              <span className="text-[10px] text-sub">
                가상 사용자 {run.results.length}명 · 질문 {cases.length}개
              </span>
            </div>
            <div className="grid grid-cols-2 gap-2 text-center">
              <div className="rounded-[10px] bg-lav p-2.5">
                <p className="text-[10px] text-sub">평균 점수 (5점 만점)</p>
                <p className="text-[18px] font-bold text-plum">
                  <span className="text-[13px] text-sub">{fmt(overall("baseline"))} → </span>
                  {fmt(overall("showme"))}
                </p>
              </div>
              <div className="rounded-[10px] bg-lav p-2.5">
                <p className="text-[10px] text-sub">다시 쓴다면 Show Me</p>
                <p className="text-[18px] font-bold text-plum">
                  {Math.round((wins / cases.length) * 100)}%<span className="text-[11px] font-normal text-sub"> ({wins}/{cases.length})</span>
                </p>
              </div>
            </div>
            <div className="flex items-center gap-3 text-[10px] text-sub">
              <span className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-full bg-off" /> 일반 AI
              </span>
              <span className="flex items-center gap-1">
                <span className="h-2 w-4 rounded-full bg-plum" /> Show Me
              </span>
              <span className="ml-auto">일반 AI 선택 {losses} · 비슷함 {cases.length - wins - losses}</span>
            </div>
            {EVAL_CRITERIA.map((k) => (
              <Bar key={k.key} label={`${k.label} · ${k.desc}`} a={per("baseline", k.key)} b={per("showme", k.key)} />
            ))}
            <p className="text-[9.5px] text-faint">
              {new Date(run.at).toLocaleString("ko-KR")} 실행
              {run.results[0]?.model ? ` · 답변 ${run.results[0].model.answer} · 평가 ${run.results[0].model.judge}` : ""}
            </p>
          </section>

          {run.results.map((r) => (
            <section key={r.persona.id} className="flex flex-col gap-2">
              <h3 className="text-[13px] font-bold">{r.persona.label}</h3>
              <p className="-mt-1 text-[10.5px] leading-[1.5] text-sub">{r.persona.story}</p>
              {r.cases.map((c) => (
                <CaseCard key={c.question} c={c} />
              ))}
            </section>
          ))}
        </>
      )}
    </main>
  );
}
