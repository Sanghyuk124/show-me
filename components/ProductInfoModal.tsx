"use client";

// 채팅 추천 상품을 누르면 뜨는 '제품 상세 보기' 창: 모델 착용샷 + 사이즈 실측표 + 장바구니 담기.
// 상품 정보: lib/products.ts (label · modelImages · sizeChart)

import type { Product } from "@/lib/products";
import { Modal, won } from "./ui";

export function ProductInfoModal({ product: p, onClose, onAddToCart }: { product: Product; onClose: () => void; onAddToCart: () => void }) {
  const photos = p.modelImages?.length ? p.modelImages : [p.image];
  return (
    <Modal title="제품 상세 보기" onClose={onClose} align="center" className="gap-3 px-[18px] py-[16px]" titleClassName="text-[17px] leading-[1.5]">
      <div className="no-scrollbar -mx-[18px] flex snap-x snap-mandatory gap-2 overflow-x-auto px-[18px]">
        {photos.map((src, i) => (
          <img
            key={src}
            src={src}
            alt={`${p.label ?? p.name} ${p.modelImages?.length ? "모델 착용샷" : "상품 사진"} ${i + 1}`}
            className="h-[300px] w-full shrink-0 snap-center rounded-[10px] bg-[#f4f0eb] object-cover object-top"
          />
        ))}
      </div>
      {p.modelImages?.length ? <p className="-mt-1.5 text-center text-[9.5px] text-faint">모델 착용샷</p> : null}

      <div className="flex flex-col gap-0.5 leading-[1.4]">
        <span className="text-[10px] text-sub">{p.brand}</span>
        <span className="text-[14px] font-bold">{p.label ?? p.name}</span>
        {p.label && <span className="text-[10px] text-sub">{p.name}</span>}
        <span className="pt-0.5 text-[13px] font-bold text-plum">{won(p.price)}</span>
      </div>

      {p.sizeChart && (
        <section className="flex flex-col gap-1.5 rounded-[10px] bg-lav p-3 leading-[1.4]">
          <p className="text-[12px] font-bold text-plum">
            상세 치수 · {p.sizeChart.size} <span className="font-normal text-sub">(단면, cm)</span>
          </p>
          <div className="grid grid-cols-3 gap-1">
            {p.sizeChart.rows.map(([label, value]) => (
              <div key={label} className="flex flex-col items-center rounded-[7px] bg-white py-1.5">
                <span className="text-[9.5px] text-sub">{label}</span>
                <span className="text-[12px] font-bold">{value}</span>
              </div>
            ))}
          </div>
        </section>
      )}
      {p.desc && <p className="text-[10px] leading-[1.5] text-sub">{p.desc.replace(/\s*정가.*$/, "")}</p>}

      <button
        type="button"
        onClick={onAddToCart}
        className="rounded-[10px] bg-plum p-[13px] text-[12px] leading-[1.5] font-bold text-white transition active:opacity-85"
      >
        장바구니 담기
      </button>
    </Modal>
  );
}
