"use client";

import { useEffect, useRef, useState } from "react";
import { MeasureModal, ProductDetailModal } from "@/components/MeasureModal";
import { ProductInfoModal } from "@/components/ProductInfoModal";
import { useRouter } from "next/navigation";
import { TabHeader } from "@/components/ui";
import { FIRST_CHIPS, FIRST_QUESTION, getReply, START_CHIPS } from "@/lib/chat";
import { shrinkPhoto, videoFrames } from "@/lib/media";
import { findProduct, type Product } from "@/lib/products";
import { won } from "@/components/ui";
import Link from "next/link";
import { ClosetThumb } from "@/components/ClosetThumb";
import { CART_SEED, SAMPLE_PHOTOS, type ClosetItem } from "@/lib/data";
import { myCloset, setApp, showToast, useApp, type ChatMessage } from "@/lib/store";

// 첫 화면 예시 상담(데이트 룩)에 보이는 옷장 옷 3벌 — 성별마다 달라요 (lib/chat.ts FIRST_EXCHANGE 와 같은 내용)
const EXAMPLE = {
  female: {
    title: "편안하지만 센스 있게",
    outfit: [
      { id: "demo-f-dunst-blouson", label: "블루종", name: "던스트 해링턴 울 블루종 브라운", src: "/images/closet/women/dunst-harrington-blouson.jpg" },
      { id: "demo-f-generalidea-denim", label: "데님", name: "제너럴아이디어 와이드 워싱 데님 블루", src: "/images/closet/women/generalidea-wide-denim.jpg" },
      { id: "demo-f-haharchive-bag", label: "숄더백", name: "하하아카이브 컨투어 숄더백 블랙", src: "/images/closet/women/haharchive-contour-bag.jpg" },
    ],
    why: ["01   브라운 울 블루종이 따뜻하고 차분한 인상을 줘요.", "02   빈티지 워싱 와이드 데님이 꾸안꾸 느낌을 더해요.", "03   블랙 숄더백이 전체를 깔끔하게 잡아줘요."],
    end: ["안에는 옷장의 베이지 시스루 롱슬리브를 받쳐 입으면 충분해요.", "데이트 장소는 어디인가요?"],
  },
  male: {
    title: "자연스럽지만 단정하게",
    outfit: [
      { id: "shirt", label: "셔츠", name: "아이보리 셔츠", src: "/images/closet/shirt.jpg" },
      { id: "slacks", label: "슬랙스", name: "블랙 슬랙스", src: "/images/closet/slacks.jpg" },
      { id: "cardigan", label: "가디건", name: "네이비 가디건", src: "/images/closet/cardigan.jpg" },
    ],
    why: ["01   아이보리 셔츠가 얼굴을 환하게 밝혀줘요.", "02   가디건이 부드럽고 다정한 인상을 더해요.", "03   블랙 슬랙스가 전체를 깔끔하게 잡아줘요."],
    end: ["가지고 있는 검정 토트백을 더하면 충분해요.", "데이트 장소는 어디인가요?"],
  },
};
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

function FirstAdvice({ onOpen, gender }: { onOpen: (id: string) => void; gender: keyof typeof EXAMPLE }) {
  const ex = EXAMPLE[gender];
  return (
    <>
      <p className="text-center text-[10px] leading-[1.4] text-sub">데이트 룩 상담 · 예시</p>
      <UserBubble>{FIRST_QUESTION}</UserBubble>
      <div className="flex w-full flex-col gap-[9.1px]">
        <BotName />
        <p className="text-[12.5px] leading-[1.4]">
          데이트 전날, 설레면서도 고민되죠.
          <br />
          우선 옷장에 있는 옷으로 시작해볼까요?
        </p>
        <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
          <div className="flex leading-[1.4]">
            <h2 className="flex-1 text-[13.4px] font-bold">{ex.title}</h2>
            <span className="text-[10px] font-medium text-plum">내 옷 3벌</span>
          </div>
          <div className="flex gap-1.5">
            {ex.outfit.map((o) => (
              <button key={o.label} type="button" onClick={() => onOpen(o.id)} className="flex min-w-0 flex-1 flex-col items-center gap-[3.8px]">
                <img src={o.src} alt={o.name} className="aspect-[86.16/85.6] w-full max-w-[86.16px] rounded-[8.93px] bg-[#f4f0eb] object-contain" />
                <span className="text-center text-[10px] leading-[1.4] text-sub">{o.label}</span>
              </button>
            ))}
          </div>
        </section>
        <section className="flex flex-col gap-[6.8px] rounded-[10.7px] bg-lav px-[14.3px] py-[12.9px]">
          <h2 className="text-[12px] leading-[1.4] font-bold text-plum">왜 이 조합일까요?</h2>
          <ol className="text-[10.7px] leading-[1.4] whitespace-pre-wrap">
            {ex.why.map((w) => (
              <li key={w}>{w}</li>
            ))}
          </ol>
        </section>
        <p className="text-[12px] leading-[1.4]">
          {ex.end[0]}
          <br />
          {ex.end[1]}
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

/** 여성은 S, 남성은 M 기준 (원사이즈면 그대로) */
function defaultSize(p: Product, gender: "female" | "male") {
  const sizes = Object.keys(p.sizes ?? {});
  return sizes.find((s) => s === (gender === "female" ? "S" : "M")) ?? sizes.find((s) => s === "M") ?? sizes[0];
}

function addToCart(p: Product, gender: "female" | "male") {
  const id = `product-${p.id}`;
  const size = defaultSize(p, gender);
  let added = false;
  setApp((s) => {
    if (s.cart.some((c) => c.id === id)) return {};
    added = true;
    return {
      cart: [...s.cart, { id, name: `${p.brand} ${p.label ?? p.name}`, option: `${p.colors?.[0] ?? "기본"} / ${size === "ONE" ? "원사이즈" : (size ?? "사이즈 선택 전")}`, price: p.price, image: p.image, qty: 1, checked: true }],
    };
  });
  showToast(added ? "장바구니에 담았어요." : "이미 장바구니에 있어요.");
}

/** 추천 상품을 옷장에 넣어요: 사진과 사이즈표의 실측(여성은 S, 남성은 M 기준 · 원사이즈면 그대로). quiet 면 안내를 띄우지 않아요 */
function addToCloset(p: Product, gender: "female" | "male", quiet = false) {
  const id = `product-${p.id}`;
  const size = defaultSize(p, gender);
  let added = false;
  setApp((s) => {
    if (s.closet.some((c) => c.id === id)) return {};
    added = true;
    const item: ClosetItem = {
      id,
      name: `${p.brand} ${p.label ?? p.name}`,
      category: p.category,
      source: "link",
      link: p.link,
      image: p.image,
      product: p.id,
      gender,
      favorite: false,
      confirmed: !!size,
      size,
      measures: size ? { ...p.sizes![size] } : {},
    };
    return { closet: [item, ...s.closet] };
  });
  if (!quiet) showToast(added ? "옷장에 넣었어요. 아바타에서 입어 볼 수 있어요." : "이미 옷장에 있어요.");
}

/** 쇼핑메이트가 추천한 상품 카드 (상품 목록: lib/products.ts) */
function ProductCards({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  const { profile, closet } = useApp();
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
          <button type="button" onClick={() => onOpen(p.id)} className="flex min-w-0 flex-1 items-center gap-2.5 text-left" aria-label={`${p.label ?? p.name} 상세 보기`}>
            <img src={p.image} alt="" className="size-16 shrink-0 rounded-[8.93px] object-cover" />
            <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
              <span className="truncate text-[10px] text-sub">{p.brand}</span>
              <span className="line-clamp-2 text-[12px] font-bold">{p.label ?? p.name}</span>
              <span className="text-[12px] font-bold text-plum">{won(p.price)}</span>
              <span className="text-[9.5px] text-sub underline underline-offset-2">상세 보기</span>
            </span>
          </button>
          <div className="flex shrink-0 flex-col items-end gap-1">
            <button type="button" onClick={() => addToCart(p, profile.gender)} className="rounded-[7px] border border-line bg-white px-2 py-1 text-[10px] leading-[1.4] text-plum">
              장바구니 담기
            </button>
            {(() => {
              const inCloset = closet.some((c) => c.id === `product-${p.id}`);
              return (
                <button
                  type="button"
                  disabled={inCloset}
                  onClick={() => addToCloset(p, profile.gender)}
                  className="rounded-[7px] border border-plum bg-plum px-2 py-1 text-[10px] leading-[1.4] text-white disabled:border-line disabled:bg-white disabled:text-sub"
                >
                  {inCloset ? "옷장에 있음" : "옷장에 넣기"}
                </button>
              );
            })()}
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

/** 쇼핑메이트가 옷장에서 골라 준 옷 (옷장 옷 id) — 누르면 저장된 상세 치수 */
function WardrobeCards({ ids, onOpen }: { ids: string[]; onOpen: (id: string) => void }) {
  const { closet } = useApp();
  const items = ids.map((id) => closet.find((i) => i.id === id)).filter((i): i is ClosetItem => !!i);
  if (!items.length) return null;
  return (
    <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
      <div className="flex leading-[1.4]">
        <h2 className="flex-1 text-[13.4px] font-bold">내 옷장에서 골랐어요</h2>
        <span className="text-[10px] font-medium text-plum">{items.length}벌</span>
      </div>
      {items.map((item) => (
        <button key={item.id} type="button" onClick={() => onOpen(item.id)} className="flex items-center gap-2.5 text-left">
          <ClosetThumb item={item} className="size-16 shrink-0 rounded-[8.93px]" />
          <span className="flex min-w-0 flex-1 flex-col gap-0.5 leading-[1.4]">
            <span className="text-[10px] text-sub">{item.favorite ? "★ 내 옷장" : "내 옷장"}</span>
            <span className="line-clamp-2 text-[12px] font-bold">{item.name}</span>
            <span className="text-[10px] font-medium text-plum">
              {item.size ? `사이즈 ${item.size} · ` : ""}
              {Object.values(item.measures ?? {}).some((v) => String(v).trim()) ? "실측 저장됨 · 오버핏" : "실측 필요"}
            </span>
          </span>
          <span className="shrink-0 text-[10px] text-sub underline underline-offset-2">상세 치수</span>
        </button>
      ))}
    </section>
  );
}

/** 쇼핑메이트가 옷장에 넣어 준 추천 옷 + 아바타로 가는 버튼 */
function TryOnCard({ ids }: { ids: string[] }) {
  const products = ids.map(findProduct).filter((p): p is Product => !!p);
  if (!products.length) return null;
  return (
    <section className="flex flex-col gap-[9.1px] rounded-[12.5px] border-[0.9px] border-line bg-white px-[12.5px] py-[11.25px]">
      <div className="flex leading-[1.4]">
        <h2 className="flex-1 text-[13.4px] font-bold">옷장에 넣었어요</h2>
        <span className="text-[10px] font-medium text-plum">{products.length}벌</span>
      </div>
      <div className="flex gap-1.5">
        {products.map((p) => (
          <div key={p.id} className="flex min-w-0 flex-1 flex-col items-center gap-[3.8px]">
            <img src={p.image} alt="" className="aspect-square w-full max-w-[86px] rounded-[8.93px] object-cover" />
            <span className="w-full truncate text-center text-[10px] leading-[1.4] text-sub">{p.label ?? p.name}</span>
          </div>
        ))}
      </div>
      <Link href="/avatar" className="rounded-[10px] bg-plum py-2.5 text-center text-[12px] leading-[1.4] font-bold text-white">
        아바타에게 입혀 보기
      </Link>
    </section>
  );
}

function Message({ m, onOpen, onOpenItem }: { m: ChatMessage; onOpen: (id: string) => void; onOpenItem: (id: string) => void }) {
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
      {m.products?.length ? <ProductCards ids={m.products} onOpen={onOpen} /> : null}
      {m.tryOn?.length ? <TryOnCard ids={m.tryOn} /> : null}
      {m.wardrobe?.length ? <WardrobeCards ids={m.wardrobe} onOpen={onOpenItem} /> : null}
    </div>
  );
}

export default function ChatPage() {
  const router = useRouter();
  const app = useApp();
  const [text, setText] = useState("");
  const [typing, setTyping] = useState(false);
  const [detailId, setDetailId] = useState<string | null>(null);
  // 추천 상품 상세 보기 (모델 착용샷 · 치수)
  const [productId, setProductId] = useState<string | null>(null);
  const detailProduct = productId ? findProduct(productId) : undefined;
  // 옷장에서 골라 준 옷의 상세 치수
  const [measureId, setMeasureId] = useState<string | null>(null);
  const measureItem = app.closet.find((i) => i.id === measureId);
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
    // 쇼핑메이트가 추천 옷을 옷장에 넣어 줘요 (아바타에서 입어 보기)
    reply.tryOn?.map(findProduct).forEach((p) => p && addToCloset(p, app.profile.gender, true));
    setApp((s) => ({ chat: [...s.chat, { id: newId(), role: "bot", ...reply }] }));
    setTyping(false);
  };

  return (
    <>
      <TabHeader title="쇼핑메이트" />
      <main ref={listRef} className="no-scrollbar flex min-h-0 flex-1 flex-col gap-[13.66px] overflow-y-auto px-[21.4px] pt-4 pb-[13.66px]">
        {/* 예시 상담은 첫 메시지를 보내면 사라져요 */}
        {app.chat.length === 0 && !typing && <FirstAdvice onOpen={setDetailId} gender={app.profile.gender} />}
        {app.chat.map((m) => (
          <Message key={m.id} m={m} onOpen={setProductId} onOpenItem={setMeasureId} />
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

      {measureItem && <MeasureModal item={measureItem} onClose={() => setMeasureId(null)} />}
      {detailProduct && (
        <ProductInfoModal
          product={detailProduct}
          onClose={() => setProductId(null)}
          onAddToCart={() => {
            addToCart(detailProduct, app.profile.gender);
            setProductId(null);
          }}
        />
      )}
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
