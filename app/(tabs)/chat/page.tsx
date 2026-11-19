"use client";

import { useEffect, useRef, useState } from "react";
import { ProductDetailModal } from "@/components/MeasureModal";
import { useRouter } from "next/navigation";
import { TabHeader } from "@/components/ui";
import { FIRST_CHIPS, getReply, START_CHIPS } from "@/lib/chat";
import { shrinkPhoto, videoFrames } from "@/lib/media";
import { findProduct, type Product } from "@/lib/products";
import { won } from "@/components/ui";
import Link from "next/link";
import { ClosetThumb } from "@/components/ClosetThumb";
import { CART_SEED, SAMPLE_PHOTOS } from "@/lib/data";
import { myCloset, setApp, showToast, useApp, type ChatMessage } from "@/lib/store";

const OUTFIT = [
  { id: "shirt", label: "셔츠", name: "아이보리 셔츠", src: "/images/closet/shirt.jpg" },
  { id: "slacks", label: "슬랙스", name: "블랙 슬랙스", src: "/images/closet/slacks.jpg" },
  { id: "cardigan", label: "가디건", name: "네이비 가디건", src: "/images/closet/cardigan.jpg" },
];
const MAX_ATTACH = 4;
const newId = () => `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

// Figma 05 · 쇼핑메이트 채팅 — 값은 Figma 레이어 수치 그대로입니다.
function UserBubble({ children }: { children: React.ReactNode }) {
  return (
    <div className="animate-rise w-[292px] max-w-full self-end rounded-[12.5px] bg-plum py-[12.9px] pr-[14.3px] pl-4 text-[12.5px] leading-[1.4] whitespace-pre-line text-white">
      {children}
    </div>
  );
}
const BotName = () => <p className="text-[10px] leading-[1.4] font-bold whitespace-pre text-plum">{"Show Me  ·  나만의 쇼핑메이트"}</p>;

function FirstAdvice({ onOpen }: { onOpen: (id: string) => void }) {
  return (
    <>
      <p className="text-center text-[10px] leading-[1.4] text-sub">첫 출근 상담 · 예시</p>
      <UserBubble>
        다음 주 첫 출근인데 뭘 입어야 할까?
        {"\n"}너무 격식 차린 느낌은 싫어.
      </UserBubble>
      <div className="flex w-full flex-col gap-[9.1px]">
        <BotName />
        <p className="text-[12.5px] leading-[1.4]">
          첫 출근, 설레면서도 고민되죠.
          <br />
          우선 옷장에 있는 옷으로 시작해볼까요?
        </p>
        <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
          <div className="flex leading-[1.4]">
            <h2 className="flex-1 text-[13.4px] font-bold">단정하지만 편안하게</h2>
            <span className="text-[10px] font-medium text-plum">내 옷 3벌</span>
          </div>
          <div className="flex gap-1.5">
            {OUTFIT.map((o) => (
              <button key={o.label} type="button" onClick={() => onOpen(o.id)} className="flex min-w-0 flex-1 flex-col items-center gap-[3.8px]">
                <img src={o.src} alt={o.name} className="aspect-[86.16/85.6] w-full max-w-[86.16px] rounded-[8.93px] object-cover" />
                <span className="text-center text-[10px] leading-[1.4] text-sub">{o.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-[6.8px] rounded-[10.7px] bg-lav px-[14.3px] py-[12.9px]">
          <h2 className="text-[12px] leading-[1.4] font-bold text-plum">왜 이 조합일까요?</h2>
          <ol className="text-[10.7px] leading-[1.4] whitespace-pre-wrap">
            <li>{"01   셔츠는 첫인상을 단정하게 잡아줘요."}</li>
            <li>{"02   가디건이 재킷보다 편안한 인상을 더해요."}</li>
            <li>{"03   비슷한 어두운 톤이 전체를 정돈해줘요."}</li>
          </ol>
        </section>
        <p className="text-[12px] leading-[1.4]">
          가지고 있는 검정 토트백을 더하면 충분해요.
          <br />
          회사 복장 분위기는 어떤 편인가요?
        </p>
      </div>
    </>
  );
}

/** 사용자가 첨부한 사진(또는 영상 장면) 묶음 */
function Attached({ images, video }: { images: string[]; video?: boolean }) {
  return (
    <div className="flex w-[292px] max-w-full flex-col items-end gap-1 self-end">
      <div className="flex flex-wrap justify-end gap-1">
        {images.map((src, i) => (
          <img key={i} src={src} alt={video ? `영상 장면 ${i + 1}` : `첨부 사진 ${i + 1}`} className="size-[68px] rounded-[8.93px] object-cover" />
        ))}
      </div>
      {video && <span className="text-[10px] leading-[1.4] text-sub">영상에서 뽑은 장면 {images.length}장</span>}
    </div>
  );
}

function addToCart(p: Product) {
  const id = `product-${p.id}`;
  let added = false;
  setApp((s) => {
    if (s.cart.some((c) => c.id === id)) return {};
    added = true;
    return {
      cart: [...s.cart, { id, name: p.name, option: `${p.colors?.[0] ?? "기본"} / 사이즈 선택 전`, price: p.price, image: p.image, qty: 1, checked: true }],
    };
  });
  showToast(added ? "장바구니에 담았어요." : "이미 장바구니에 있어요.");
}

/** 쇼핑메이트가 추천한 상품 카드 (상품 목록: lib/products.ts) */
function ProductCards({ ids }: { ids: string[] }) {
  const products = ids.map(findProduct).filter((p): p is Product => !!p);
  if (!products.length) return null;
  return (
    <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
      <div className="flex leading-[1.4]">
        <h2 className="flex-1 text-[13.4px] font-bold">추천 상품</h2>
        <span className="text-[10px] font-medium text-plum">{products.length}개</span>
      </div>
      {products.map((p) => (
        <div key={p.id} className="flex items-center gap-2.5">
          <img src={p.image} alt={p.name} className="size-16 shrink-0 rounded-[8.93px] object-cover" />
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <span className="truncate text-[10px] text-sub">{p.brand}</span>
            <span className="line-clamp-2 text-[12px] font-bold">{p.name}</span>
            <span className="text-[12px] font-bold text-plum">{won(p.price)}</span>
          </div>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => addToCart(p)} className="rounded-[7px] border border-line bg-white px-2 py-1 text-[10px] leading-[1.4] text-plum">
              장바구니 담기
            </button>
            {p.link && (
              <a href={p.link} target="_blank" rel="noopener noreferrer" className="text-[10px] leading-[1.4] text-sub underline underline-offset-2">
                판매처 보기
              </a>
            )}
          </div>
        </div>
      ))}
    </section>
  );
}

/** 쇼핑메이트가 옷장에서 골라 준 옷 카드 (사진 보관함 예시 사진으로 넣은 옷) */
function ClosetCards({ samples }: { samples: string[] }) {
  const app = useApp();
  const closet = myCloset(app);
  const all = [...SAMPLE_PHOTOS.female, ...SAMPLE_PHOTOS.male];
  const rows = samples
    .map((id) => ({ sample: all.find((s) => s.id === id), item: closet.find((i) => i.sample === id) }))
    .filter((r) => r.sample);
  if (!rows.length) return null;
  return (
    <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
      <div className="flex leading-[1.4]">
        <h2 className="flex-1 text-[13.4px] font-bold">내 옷장에서 골랐어요</h2>
        <span className="text-[10px] font-medium text-plum">{rows.length}벌</span>
      </div>
      {rows.map(({ sample, item }) => (
        <div key={sample!.id} className="flex items-center gap-2.5">
          {item ? (
            <ClosetThumb item={item} className="size-16 shrink-0 rounded-[8.93px]" />
          ) : (
            <img src={sample!.src} alt={sample!.name} className="size-16 shrink-0 rounded-[8.93px] object-cover" />
          )}
          <div className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <span className="text-[10px] text-sub">{item ? "내 옷장" : "사진 보관함"}</span>
            <span className="line-clamp-2 text-[12px] font-bold">{item?.name ?? sample!.name}</span>
            <span className="text-[10px] font-medium text-plum">
              {item ? `사이즈 ${item.size ?? sample!.size ?? "-"} · 실측 저장됨 · 정핏` : "옷장에 넣으면 실측으로 핏을 맞춰 봐요"}
            </span>
          </div>
          <Link href="/closet" className="shrink-0 rounded-[7px] border border-line bg-white px-2 py-1 text-[10px] leading-[1.4] text-plum">
            {item ? "옷장에서 보기" : "옷장에 넣기"}
          </Link>
        </div>
      ))}
    </section>
  );
}

function Message({ m }: { m: ChatMessage }) {
  if (m.role === "user")
    return (
      <>
        {m.images?.length ? <Attached images={m.images} video={m.video} /> : null}
        {m.text && <UserBubble>{m.text}</UserBubble>}
      </>
    );
  return (
    <div className="animate-rise flex w-full flex-col gap-[9.1px]">
      <BotName />
      <p className="text-[12.5px] leading-[1.4] whitespace-pre-line">{m.text}</p>
      {m.closet?.length ? <ClosetCards samples={m.closet} /> : null}
      {m.products?.length ? <ProductCards ids={m.products} /> : null}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const app = useApp();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  // + 버튼으로 고른 첨부 (사진 최대 4장, 또는 영상에서 뽑은 4장면)
  const [attached, setAttached] = useState<{ images: string[]; video: boolean } | null>(null);
  const [preparing, setPreparing] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);
  const detailItem = app.closet.find((i) => i.id === detailId);
  const listRef = useRef<HTMLElement>(null);
  const last = app.chat.at(-1);
  // 첫 화면 칩: 성별별 추천 질문 + 예시 상담에 이어 답하는 칩
  const chips = typing ? [] : last ? (last.chips ?? []) : [...START_CHIPS[app.profile.gender], ...FIRST_CHIPS];

  // 새 메시지가 오면 맨 아래로 내려갑니다.
  useEffect(() => {
    if (!app.chat.length && !typing) return;
    const id = requestAnimationFrame(() => {
      const list = listRef.current;
      list?.scrollTo({ top: list.scrollHeight, behavior: "smooth" });
    });
    return () => cancelAnimationFrame(id);
  }, [app.chat.length, typing, chips.length]);

  const onFiles = async (list: FileList | null) => {
    const files = Array.from(list ?? []);
    if (!files.length) return;
    setPreparing(true);
    try {
      const video = files.find((f) => f.type.startsWith("video/"));
      if (video) {
        setAttached({ images: await videoFrames(video, MAX_ATTACH), video: true });
      } else {
        const keep = attached && !attached.video ? attached.images : [];
        const room = MAX_ATTACH - keep.length;
        if (files.length > room) showToast(`사진은 한 번에 ${MAX_ATTACH}장까지 보낼 수 있어요.`);
        const added = await Promise.all(files.filter((f) => f.type.startsWith("image/")).slice(0, room).map(shrinkPhoto));
        if (keep.length + added.length) setAttached({ images: [...keep, ...added], video: false });
      }
    } catch {
      showToast("파일을 불러오지 못했어요. 다른 사진이나 영상으로 시도해 주세요.");
    }
    setPreparing(false);
  };

  const send = async (raw: string) => {
    const value = raw.trim();
    const images = attached?.images ?? [];
    if ((!value && !images.length) || typing || preparing) return;
    setText("");
    setAttached(null);
    setTyping(true);
    setApp((s) => ({ chat: [...s.chat, { id: newId(), role: "user", text: value, ...(images.length ? { images, video: attached?.video } : {}) }] }));
    const reply = await getReply(value, images, app);
    setApp((s) => ({ chat: [...s.chat, { id: newId(), role: "bot", ...reply }] }));
    setTyping(false);
  };

  return (
    <>
      <TabHeader title="쇼핑메이트" />
      <main ref={listRef} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[13.66px] overflow-y-auto px-[21.4px] pt-4 pb-[13.66px]">
        {/* 예시 상담은 첫 메시지를 보내면 사라져요 */}
        {app.chat.length === 0 && !typing && <FirstAdvice onOpen={setDetailId} />}
        {app.chat.map((m) => (
          <Message key={m.id} m={m} />
        ))}
        {typing && (
          <div className="flex w-full flex-col gap-[9.1px]">
            <BotName />
            <p className="animate-pulse text-[12.5px] leading-[1.4] text-faint">답변을 준비하고 있어요…</p>
          </div>
        )}
      </main>

      <div className="flex shrink-0 flex-col gap-[13.66px] px-[21.4px] pb-[19.3px]">
        {chips.length > 0 && (
          <div className="no-scrollbar flex gap-[4.55px] overflow-x-auto">
            {chips.map((c) => (
              <button
                key={c}
                type="button"
                onClick={() => send(c)}
                className="shrink-0 rounded-[17.86px] border-[0.9px] border-line bg-white px-2 py-[7.2px] text-[10px] leading-[1.4] whitespace-nowrap text-sub"
              >
                {c}
              </button>
            ))}
          </div>
        )}
        {(attached || preparing) && (
          <div className="flex items-center gap-1.5">
            {preparing && <span className="animate-pulse text-[10px] text-sub">첨부를 준비하고 있어요…</span>}
            {attached?.images.map((src, i) => (
              <div key={i} className="relative">
                <img src={src} alt={`첨부 ${i + 1}`} className="size-12 rounded-[7px] object-cover" />
                {!attached.video && (
                  <button
                    type="button"
                    aria-label={`첨부 ${i + 1} 빼기`}
                    onClick={() => setAttached((a) => (a && a.images.length > 1 ? { ...a, images: a.images.filter((_, j) => j !== i) } : null))}
                    className="absolute -top-1 -right-1 flex size-4 items-center justify-center rounded-full bg-ink/80 text-[10px] leading-none text-white"
                  >
                    ×
                  </button>
                )}
              </div>
            ))}
            {attached?.video && (
              <button type="button" onClick={() => setAttached(null)} className="ml-1 text-[10px] text-sub underline underline-offset-2">
                영상 빼기
              </button>
            )}
          </div>
        )}
        <form
          onSubmit={(e) => {
            e.preventDefault();
            send(text);
          }}
          className="flex items-center gap-[7.6px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px] leading-[1.4] focus-within:border-plum"
        >
          <button type="button" aria-label="사진·영상 첨부" onClick={() => fileRef.current?.click()} className="text-[17.9px] text-plum">
            ＋
          </button>
          <input
            ref={fileRef}
            type="file"
            accept="image/*,video/*"
            multiple
            hidden
            onChange={(e) => {
              onFiles(e.target.files);
              e.target.value = "";
            }}
          />
          <input
            value={text}
            aria-label="메시지"
            placeholder="내일 데이트 가야 하는데 데이트 룩 추천해줘"
            onChange={(e) => setText(e.target.value)}
            className="min-w-0 flex-1 bg-transparent text-[12px] outline-none placeholder:text-[10px] placeholder:text-sub"
          />
          <button type="submit" aria-label="보내기" disabled={(!text.trim() && !attached) || typing || preparing} className="text-[17.9px] font-bold text-plum disabled:opacity-40">
            ↑
          </button>
        </form>
        <p className="text-center text-[10px] leading-[1.4] text-sub">추천은 참고용이에요. 중요한 정보는 한 번 더 확인해요.</p>
      </div>

      {detailItem && (
        <ProductDetailModal
          item={detailItem}
          onClose={() => setDetailId(null)}
          onAddToCart={() => {
            const seed = CART_SEED.find((c) => c.id === detailItem.id);
            if (seed) setApp((s) => ({ cart: s.cart.some((c) => c.id === seed.id) ? s.cart : [...s.cart, seed] }));
            router.push("/cart");
          }}
        />
      )}
    </>
  );
}
