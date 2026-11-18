"use client";

import { useState } from "react";
import Link from "next/link";
import { BackButton, cn, Modal, won } from "@/components/ui";
import type { CartItem } from "@/lib/data";
import { setApp, showToast, useApp } from "@/lib/store";

const FREE_SHIPPING = 100000;
const SHIPPING_FEE = 3000;

/** Figma 체크박스: 22px, 모서리 5, 선택 시 자주색 + ✓ */
function CheckBox({ on, label, onClick }: { on: boolean; label: string; onClick: () => void }) {
  return (
    <button
      type="button"
      role="checkbox"
      aria-checked={on}
      aria-label={label}
      onClick={onClick}
      className={cn(
        "flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border text-[14px] leading-[1.4] font-bold text-white",
        on ? "border-plum bg-plum" : "border-line bg-white",
      )}
    >
      {on && "✓"}
    </button>
  );
}

const patchItem = (id: string, patch: Partial<CartItem>) =>
  setApp((s) => ({ cart: s.cart.map((c) => (c.id === id ? { ...c, ...patch } : c)) }));

/** Figma 10 · 장바구니 + 10a · 주문 미리보기 */
export default function CartPage() {
  const { cart } = useApp();
  const [preview, setPreview] = useState(false);
  const selected = cart.filter((c) => c.checked);
  const allOn = cart.length > 0 && selected.length === cart.length;
  const subtotal = selected.reduce((sum, c) => sum + c.price * c.qty, 0);
  const shipping = subtotal === 0 || subtotal >= FREE_SHIPPING ? 0 : SHIPPING_FEE;

  return (
    <>
      <header className="pt-safe flex shrink-0 items-center gap-3 px-6 pb-3">
        <BackButton fallback="/chat" />
        <h1 className="min-w-0 flex-1 text-[17px] leading-[1.4] font-bold">장바구니</h1>
        <Link href="/mypage" aria-label="마이페이지" className="block size-[22px] shrink-0">
          <img src="/icons/mypage.svg" alt="" width={22} height={22} className="block size-[22px]" />
        </Link>
      </header>

      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto px-4 py-2.5 leading-[1.4]">
        <p className="text-[12px] text-sub">담아둔 상품을 한눈에 확인해 보세요.</p>

        {cart.length === 0 ? (
          <section className="animate-rise flex flex-col items-center gap-2 rounded-xl border border-line bg-white px-4 py-7 text-center">
            <img src="/icons/cart.svg" alt="" width={16.05} height={15.8} className="block" />
            <h2 className="mt-1 text-[14px] font-bold">아직 담긴 상품이 없어요</h2>
            <p className="text-[12px] text-sub">마음에 드는 상품을 찾아 담아보세요.</p>
            <Link href="/chat" className="mt-1 rounded-[10px] bg-lav px-4 py-2 text-[12px] font-bold text-plum">
              계속 둘러보기
            </Link>
          </section>
        ) : (
          <>
            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setApp((s) => ({ cart: s.cart.map((c) => ({ ...c, checked: !allOn })) }))}
                className="flex h-8 flex-1 items-center gap-1.5 text-[12px]"
              >
                <span
                  aria-hidden
                  className={cn(
                    "flex size-[22px] shrink-0 items-center justify-center rounded-[5px] border text-[14px] font-bold text-white",
                    allOn ? "border-plum bg-plum" : "border-line bg-white",
                  )}
                >
                  {allOn && "✓"}
                </span>
                <span className="font-medium">전체 선택</span>
                <span className="font-medium text-plum">{selected.length}</span>
                <span className="text-sub">/</span>
                <span className="text-sub">{cart.length}</span>
              </button>
              <button type="button" onClick={() => setApp((s) => ({ cart: s.cart.filter((c) => !c.checked) }))} className="py-[7px] pl-2 text-[11px] text-sub">
                선택 삭제
              </button>
            </div>

            <ul className="flex flex-col gap-2">
              {cart.map((c) => (
                <li key={c.id} className="flex items-start gap-3 rounded-xl border border-line bg-white p-3">
                  <CheckBox on={c.checked} label={`${c.name} 선택`} onClick={() => patchItem(c.id, { checked: !c.checked })} />
                  <img src={c.image} alt={c.name} className="h-[84px] w-[72px] shrink-0 rounded-lg object-cover" />
                  <div className="flex h-[84px] min-w-0 flex-1 flex-col justify-between">
                    <div className="flex flex-col gap-1">
                      <div className="flex items-center gap-2">
                        <h2 className="min-w-0 flex-1 truncate text-[14px] font-bold">{c.name}</h2>
                        <button
                          type="button"
                          aria-label={`${c.name} 삭제`}
                          onClick={() => setApp((s) => ({ cart: s.cart.filter((x) => x.id !== c.id) }))}
                          className="flex size-[22px] items-center justify-center text-[18px] font-medium text-sub"
                        >
                          ×
                        </button>
                      </div>
                      <p className="text-[11px] text-sub">{c.option}</p>
                    </div>
                    <div className="flex items-center gap-2">
                      <div className="flex items-center rounded-md border border-line font-medium">
                        <button
                          type="button"
                          aria-label="수량 줄이기"
                          disabled={c.qty <= 1}
                          onClick={() => patchItem(c.id, { qty: c.qty - 1 })}
                          className="flex h-7 w-[26px] items-center justify-center text-[14px] disabled:text-faint"
                        >
                          −
                        </button>
                        <span className="w-5 text-center text-[12px]">{c.qty}</span>
                        <button type="button" aria-label="수량 늘리기" onClick={() => patchItem(c.id, { qty: c.qty + 1 })} className="flex h-7 w-[26px] items-center justify-center text-[14px]">
                          +
                        </button>
                      </div>
                      <span className="flex-1 text-right text-[14px] font-bold whitespace-nowrap">{won(c.price * c.qty)}</span>
                    </div>
                  </div>
                </li>
              ))}
            </ul>

            <dl className="flex flex-col gap-2 rounded-xl border border-line bg-white p-3">
              <div className="flex items-center text-[12px]">
                <dt className="flex-1 text-sub">상품 금액</dt>
                <dd className="font-medium">{won(subtotal)}</dd>
              </div>
              <div className="flex items-center text-[12px]">
                <dt className="flex-1 text-sub">배송비</dt>
                <dd className="font-medium">{shipping ? won(shipping) : "무료"}</dd>
              </div>
              <p className="text-[10px] text-sub">10만원 이상 무료배송 · 미만 3,000원</p>
            </dl>
          </>
        )}

        <p className="text-[10px] text-sub">
          상품·가격은 예시예요.
          <br />
          실제 주문과 결제는 진행되지 않아요.
        </p>
      </main>

      <div className="pb-safe flex shrink-0 flex-col gap-3 border-t border-line bg-white px-4 pt-3 leading-[1.4]">
        <div className="flex items-center">
          <span className="flex-1 text-[12px] font-medium text-sub">결제 예상 금액</span>
          <strong className="text-[22px] font-bold text-plum">{won(subtotal + shipping)}</strong>
        </div>
        <button
          type="button"
          disabled={selected.length === 0}
          onClick={() => setPreview(true)}
          className="rounded-xl bg-plum px-4 py-3.5 text-[14px] font-bold text-white transition active:opacity-85 disabled:bg-line disabled:text-sub"
        >
          {selected.length ? "선택 상품 구매하기" : "상품을 선택해 주세요"}
        </button>
      </div>

      {preview && (
        <Modal
          title="구매 전 확인"
          onClose={() => setPreview(false)}
          align="center"
          className="max-w-[340px] gap-4 p-6 leading-[1.4]"
          titleClassName="text-[18px] leading-[1.4]"
        >
          <p className="-mt-3 text-[11px] text-sub">선택한 상품과 예상 금액을 확인해 주세요.</p>
          <ul className="flex flex-col gap-2.5">
            {selected.map((c) => (
              <li key={c.id} className="flex items-center gap-2.5">
                <div className="flex min-w-0 flex-1 flex-col gap-0.5">
                  <p className="text-[12px] font-medium">{c.name}</p>
                  <p className="text-[11px] text-sub">{c.qty}개</p>
                </div>
                <span className="text-[12px] font-bold whitespace-nowrap">{won(c.price * c.qty)}</span>
              </li>
            ))}
          </ul>
          <div className="flex flex-col gap-2 border-t border-line pt-3">
            <div className="flex items-center text-[11px]">
              <span className="flex-1 text-sub">배송비</span>
              <span className="font-medium">{shipping ? won(shipping) : "무료"}</span>
            </div>
            <div className="flex items-center font-bold">
              <span className="flex-1 text-[12px]">예상 결제 금액</span>
              <span className="text-[18px] text-plum">{won(subtotal + shipping)}</span>
            </div>
          </div>
          <p className="text-[11px] text-sub">
            이 화면은 주문 미리보기예요.
            <br />
            실제 주문·결제는 진행되지 않아요.
          </p>
          <button
            type="button"
            onClick={() => {
              setPreview(false);
              showToast("예시 화면이라 실제 결제는 진행되지 않아요.");
            }}
            className="rounded-[10px] bg-plum p-3 text-[13px] font-bold text-white active:opacity-85"
          >
            결제하기
          </button>
        </Modal>
      )}
    </>
  );
}
