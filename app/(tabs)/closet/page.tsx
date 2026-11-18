"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, ArrowUpRight, Plus, Star } from "lucide-react";
import { ClosetThumb } from "@/components/ClosetThumb";
import { itemStatus, MeasureModal } from "@/components/MeasureModal";
import { RegisterItemModal, type NewItemSource } from "@/components/RegisterItemModal";
import { cn, TabHeader } from "@/components/ui";
import type { ClosetItem } from "@/lib/data";
import { setApp, showToast, updateItem, useApp } from "@/lib/store";

const FILTERS = [
  { id: "all", label: "전체", match: () => true },
  { id: "top", label: "상의", match: (i: ClosetItem) => i.category === "top" || i.category === "outer" },
  { id: "bottom", label: "하의", match: (i: ClosetItem) => i.category === "bottom" },
  { id: "bag", label: "가방", match: (i: ClosetItem) => i.category === "bag" },
];

/** 사진을 작게 줄여 브라우저에 저장할 수 있는 형태로 바꿉니다. */
function shrinkPhoto(file: File) {
  return new Promise<string>((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, 480 / Math.max(img.width, img.height));
      const canvas = document.createElement("canvas");
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext("2d")?.drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.78));
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("이미지를 읽을 수 없어요"));
    };
    img.src = url;
  });
}

function Criterion({ label, item }: { label: string; item?: ClosetItem }) {
  return (
    <div className={cn("rounded-t-md px-2 py-1.5", label === "상의" ? "bg-sand" : "bg-lav")}>
      <p className="text-[11.5px] font-bold">{label}</p>
      <p className="text-[9.5px] text-sub">{!item ? `즐겨찾는 ${label} 없음` : item.confirmed ? "실측 저장 완료" : "실측 확인 필요"}</p>
    </div>
  );
}

export default function ClosetPage() {
  const app = useApp();
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("all");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  const [photo, setPhoto] = useState<string | null>(null);
  // 판매처 링크 화면에서 저장하고 돌아오면 이름·종류를 묻는 창이 열립니다.
  const source: NewItemSource | null = photo
    ? { image: photo }
    : app.pendingLink
      ? { link: app.pendingLink.url, size: app.pendingLink.size }
      : null;

  const closeRegister = () => {
    setPhoto(null);
    setApp(() => ({ pendingLink: null }));
  };

  const favorites = app.closet.filter((i) => i.favorite);
  const pick = (cats: string[]) => {
    const list = favorites.filter((i) => cats.includes(i.category));
    return list.find((i) => i.confirmed) ?? list[0];
  };
  const top = pick(["top", "outer"]);
  const bottom = pick(["bottom"]);
  const bothDone = top?.confirmed && bottom?.confirmed;

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match;
    const list = app.closet.filter(match);
    return oldestFirst ? [...list].reverse() : list;
  }, [app.closet, filter, oldestFirst]);

  const openItem = app.closet.find((i) => i.id === openId);

  const onPhoto = async (file?: File) => {
    if (!file) return;
    try {
      setPhoto(await shrinkPhoto(file));
    } catch {
      showToast("사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    }
  };

  return (
    <>
      <TabHeader title="나의 옷장" />
      <main className="no-scrollbar min-h-0 flex-1 overflow-y-auto px-4 pt-2 pb-4">
        <section className="rounded-lg bg-lav px-2.5 py-2.5">
          <h2 className="text-[12px] font-bold">오늘의 옷, 옷장에 넣어볼까요?</h2>
          <div className="mt-1.5 grid grid-cols-2 gap-1">
            <button type="button" onClick={() => fileRef.current?.click()} className="flex h-6 items-center justify-center gap-1 rounded-sm bg-white text-[10px]">
              <Plus className="size-3" /> 사진 촬영하기
            </button>
            <Link href="/closet/link" className="flex h-6 items-center justify-center gap-1 rounded-sm bg-white text-[10px]">
              <ArrowUpRight className="size-3" /> 판매처 링크 입력
            </Link>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            capture="environment"
            hidden
            onChange={(e) => {
              onPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="mt-1.5 text-[9.5px] leading-[14px] text-sub">
            판매처 링크 → 실측 자동 입력
            <br />
            사진 촬영 → 직접 측정 후 입력 (선택)
          </p>
        </section>

        <div className="mt-5 flex items-center justify-between">
          <h2 className="text-[13px] font-bold">내 옷&nbsp;&nbsp;{app.closet.length}</h2>
          <button type="button" onClick={() => setOldestFirst((v) => !v)} className="flex items-center gap-1 text-[9.5px] text-sub">
            {oldestFirst ? "오래된 순" : "최근 등록순"}
            {oldestFirst ? <ArrowUp className="size-3" strokeWidth={1.4} /> : <ArrowDown className="size-3" strokeWidth={1.4} />}
          </button>
        </div>

        <section className="mt-2 rounded-md border border-line bg-white px-2.5 py-2">
          <div className="flex items-center justify-between text-[11.5px] font-bold">
            <h3>★ 즐겨찾는 상의 기준</h3>
            <span className="text-[9.5px]">{top?.confirmed ? 1 : 0} / 1</span>
          </div>
          <p className="mt-1 text-[9.5px] leading-[14px] text-sub">
            즐겨찾는 상의와 하의 각각 1벌 이상,
            <br />
            실측을 입력해 나만의 핏 기준을 완성해요.
          </p>
          <div className="mt-1 grid grid-cols-2 gap-1">
            {[
              { label: "상의", item: top },
              { label: "하의", item: bottom },
            ].map(({ label, item }) => (
              <div key={label}>
                <Criterion label={label} item={item} />
                <button
                  type="button"
                  disabled={!item}
                  onClick={() => item && setOpenId(item.id)}
                  className="mt-1 h-[35px] w-full rounded-sm bg-plum text-[9.5px] font-bold text-white disabled:bg-off disabled:text-sub"
                >
                  즐겨찾는 {label} 실측 입력하기
                </button>
              </div>
            ))}
          </div>
          {!bothDone && <p className="mt-1.5 text-[9.5px] text-warn">실측을 입력하지 않으면 핏 컨설팅과 추천의 정확도가 낮아질 수 있어요.</p>}
        </section>

        <div className="mt-5 flex gap-1">
          {FILTERS.map((f) => (
            <button
              key={f.id}
              type="button"
              aria-pressed={filter === f.id}
              onClick={() => setFilter(f.id)}
              className={cn("h-[22px] rounded-full border px-2 text-[9.5px]", filter === f.id ? "border-plum bg-plum font-bold text-white" : "border-line bg-white text-sub")}
            >
              {f.label}
            </button>
          ))}
        </div>

        <div className="mt-2 grid grid-cols-2 gap-x-1 gap-y-4">
          {visible.map((item) => (
            <article key={item.id} className="min-w-0">
              <button type="button" onClick={() => setOpenId(item.id)} aria-label={`${item.name} 실측 열기`} className="mx-auto block">
                <ClosetThumb item={item} className="h-[70px] w-[81px]" />
              </button>
              <div className="mt-1 flex items-center gap-1 pl-1">
                <button type="button" aria-pressed={item.favorite} aria-label={`${item.name} 즐겨찾기`} onClick={() => updateItem(item.id, { favorite: !item.favorite })} className="p-0.5 text-plum">
                  <Star className="size-[17px]" strokeWidth={1.4} fill={item.favorite ? "currentColor" : "none"} />
                </button>
                <button type="button" onClick={() => setOpenId(item.id)} className="truncate text-[10px] font-medium">
                  {item.name}
                </button>
              </div>
              <p className="mt-0.5 truncate text-[9.5px] text-sub">{itemStatus(item)}</p>
            </article>
          ))}
          {visible.length === 0 && <p className="col-span-2 py-6 text-center text-[11px] text-sub">이 종류의 옷은 아직 없어요.</p>}
        </div>

        <p className="mt-3 rounded-md border border-line bg-white px-2.5 py-2 text-[9.5px] leading-[15px] text-sub">
          <span className="font-medium text-ink">실측은 옷을 눌러 입력·수정할 수 있어요.</span>
          <br />
          링크로 불러온 수치도 직접 확인하고 수정해요.
        </p>
      </main>

      {openItem && <MeasureModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
      {source && (
        <RegisterItemModal
          source={source}
          onClose={closeRegister}
          onCreated={(item) => {
            closeRegister();
            setOpenId(item.id);
          }}
        />
      )}
    </>
  );
}
