"use client";

import Link from "next/link";
import { Check, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { BackButton, cn, HeaderIcons, PrimaryButton, StackHeader, won } from "@/components/ui";
import type { CartItem } from "@/lib/data";
import { setApp, showToast, useApp } from "@/lib/store";

const FREE_SHIPPING = 100000;
const SHIPPING_FEE = 3000;

function CheckBox({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn("flex size-5 shrink-0 items-center justify-center rounded-[3px] border", on ? "border-plum bg-plum text-white" : "border-faint bg-white")}
    >
      {on && <Check className="size-3.5" strokeWidth={2.2} />}
    </button>
  );
}

const patchItem = (id: string, patch: Partial<CartItem>) =>
  setApp((s) => ({ cart: s.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

export default function CartPage() {
  const { cart } = useApp();
  const selected = cart.filter((c) => c.checked);
  const allOn = cart.length > 0 && selected.length === cart.length;
  const subtotal = selected.reduce((sum, c) => sum + c.price * c.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;

  return (
    <>
      <StackHeader title="장바구니" left={<BackButton fallback="/chat" />} right={<HeaderIcons cart={false} />} />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <p className="text-[11px] text-sub">담아둔 상품을 한눈에 확인해 보세요.</p>

        {cart.length === 0 ? (
          <section className="animate-rise mt-2 rounded-xl bg-white px-4 py-7 text-center">
            <ShoppingCart className="mx-auto size-[18px] text-plum" strokeWidth={1.6} />
            <h2 className="mt-3 text-[15px] font-bold">아직 담긴 상품이 없어요</h2>
            <p className="mt-2 text-[11.5px] text-sub">마음에 드는 상품을 찾아 담아보세요.</p>
            <Link href="/chat" className="mt-3 inline-flex h-9 items-center rounded-md bg-lav px-4 text-[11.5px] font-bold text-plum">
              계속 둘러보기
            </Link>
          </section>
        ) : (
          <>
            <div className="mt-2 flex items-center justify-between">
              <div className="flex items-center gap-1.5 text-[11.5px] font-medium">
                <CheckBox on={allOn} label="전체 선택" onClick={() => setApp((s) => ({ cart: s.cart.map((c) => ({ ...c, checked: !allOn })) }))} />
                전체 선택&nbsp;<span className="text-plum">{selected.length}</span>&nbsp;/&nbsp;{cart.length}
              </div>
              <button type="button" onClick={() => setApp((s) => ({ cart: s.cart.filter((c) => !c.checked) }))} className="text-[10px] text-sub">
                선택 삭제
              </button>
            </div>

            <ul className="mt-2.5 space-y-2.5">
              {cart.map((c) => (
                <li key={c.id} className="flex gap-2.5 rounded-xl border border-line bg-white p-3">
                  <CheckBox on={c.checked} label={`${c.name} 선택`} onClick={() => patchItem(c.id, { checked: !c.checked })} />
                  <img src={c.image} alt={c.name} className="h-[82px] w-[71px] rounded-md object-cover" />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-start justify-between">
                      <h2 className="truncate text-[14px] font-medium">{c.name}</h2>
                      <button
                        type="button"
                        aria-label={`${c.name} 삭제`}
                        onClick={() => setApp((s) => ({ cart: s.cart.filter((x) => x.id !== c.id) }))}
                        className="text-sub"
                      >
                        <X className="size-[18px]" strokeWidth={1.4} />
                      </button>
                    </div>
                    <p className="mt-1 text-[10.5px] text-sub">{c.option}</p>
                    <div className="mt-3 flex items-center justify-between">
                      <div className="flex h-[29px] items-center rounded-md border border-line">
                        <button type="button" aria-label="수량 줄이기" disabled={c.qty <= 1} onClick={() => patchItem(c.id, { qty: c.qty - 1 })} className="px-2 disabled:text-faint">
                          <Minus className="size-2.5" />
                        </button>
                        <span className="w-4 text-center text-[11px]">{c.qty}</span>
                        <button type="button" aria-label="수량 늘리기" onClick={() => patchItem(c.id, { qty: c.qty + 1 })} className="px-2">
                          <Plus className="size-2.5" />
                        </button>
                      </div>
                      <span className="text-[14px] font-medium">{won(c.price * c.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="mt-2.5 rounded-xl border border-line bg-white px-3 py-3 text-[11px]">
              <div className="flex justify-between">
                <dt className="text-sub">상품 금액</dt>
                <dd>{won(subtotal)}</dd>
              </div>
              <div className="mt-2.5 flex justify-between">
                <dt className="text-sub">배송비</dt>
                <dd>{shipping ? won(shipping) : "무료"}</dd>
              </div>
              <p className="mt-2.5 text-[9.5px] text-sub">10만원 이상 무료배송 · 미만 3,000원</p>
            </dl>
          </>
        )}

        <p className="mt-2.5 text-[9.5px] leading-[14px] text-sub">
          상품·가격은 예시예요.
          <br />
          실제 주문과 결제는 진행되지 않아요.
        </p>
      </main>

      <div className="pb-safe shrink-0 border-t border-line px-4 pt-3.5">
        <div className="mb-2.5 flex items-center justify-between">
          <span className="text-[11px] text-sub">결제 예상 금액</span>
          <strong className="text-[21px] text-plum">{won(subtotal + shipping)}</strong>
        </div>
        <PrimaryButton className="h-[47px] rounded-xl" disabled={selected.length === 0} onClick={() => showToast("예시 화면이라 실제 결제는 진행되지 않아요.")}>
          {selected.length ? "선택 상품 구매하기" : "상품을 선택해 주세요"}
        </PrimaryButton>
      </div>
    </>
  );
}
