"use client";

import { useMemo, useRef, useState } from "react";
import Link from "next/link";
import { ClosetThumb } from "@/components/ClosetThumb";
import { itemStatus, MeasureModal } from "@/components/MeasureModal";
import { PhotoLibrary, type SamplePhoto } from "@/components/PhotoLibrary";
import { RegisterItemModal, type NewItemSource } from "@/components/RegisterItemModal";
import { cn, Modal, TabHeader } from "@/components/ui";
import type { ClosetItem } from "@/lib/data";
import { removeBackground } from "@/lib/cutout";
import { DEMO_GARMENTS } from "@/lib/demoGarments";
import { shrinkPhoto } from "@/lib/media";
import { setApp, showToast, updateItem, useApp, myCloset } from "@/lib/store";

const FILTERS = [
  { id: "all", label: "전체", match: () => true },
  { id: "top", label: "상의", match: (i: ClosetItem) => i.category === "top" || i.category === "outer" },
  { id: "bottom", label: "하의", match: (i: ClosetItem) => i.category === "bottom" },
  { id: "bag", label: "ACC", match: (i: ClosetItem) => i.category === "bag" },
];

function Criterion({ label, item }: { label: string; item?: ClosetItem }) {
  return (
    <div className={cn("flex flex-1 flex-col gap-[1.4px] rounded-[5.78px] px-[6.9px] py-[5px] leading-[1.4]", label === "상의" ? "bg-sand" : "bg-lav")}>
      <p className="text-[12px] font-bold">{label}</p>
      <p className="text-[10px] text-sub">{!item ? `눌러서 즐겨찾는 ${label} 고르기` : item.confirmed ? "실측 저장 완료" : "실측 확인 필요"}</p>
    </div>
  );
}

const TYPE_MATCH = {
  top: (i: ClosetItem) => i.category === "top" || i.category === "outer",
  bottom: (i: ClosetItem) => i.category === "bottom",
};

/** 즐겨찾는 기준 옷이 없을 때: 옷장에서 한 벌을 골라 즐겨찾기로 정하고 바로 실측을 입력해요. */
function FavoritePicker({
  type,
  items,
  onClose,
  onPick,
}: {
  type: "top" | "bottom";
  items: ClosetItem[];
  onClose: () => void;
  onPick: (item: ClosetItem) => void;
}) {
  const label = type === "top" ? "상의" : "하의";
  return (
    <Modal title={`즐겨찾는 ${label} 고르기`} onClose={onClose} align="center">
      <p className="text-[12px] leading-[1.5] text-sub">
        자주 입고 잘 맞는 {label}를 한 벌 골라 주세요.
        <br />
        고르면 바로 실측을 입력할 수 있어요.
      </p>
      {items.length ? (
        <ul className="flex flex-col gap-2">
          {items.map((item) => (
            <li key={item.id}>
              <button
                type="button"
                onClick={() => onPick(item)}
                className="flex w-full items-center gap-3 rounded-[10px] border border-line bg-white p-2.5 text-left active:bg-lav"
              >
                <ClosetThumb item={item} className="size-12 shrink-0 rounded-[7px]" />
                <span className="flex min-w-0 flex-1 flex-col leading-[1.4]">
                  <span className="truncate text-[13px] font-medium">{item.name}</span>
                  <span className="truncate text-[10px] text-sub">{itemStatus(item)}</span>
                </span>
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <p className="rounded-[10px] bg-lav p-3 text-[12px] leading-[1.5] text-plum">
          아직 옷장에 {label}가 없어요. 먼저 사진 첨부나 판매처 링크로 {label}를 등록해 주세요.
        </p>
      )}
    </Modal>
  );
}

/** 받침이 있으면 '을', 없으면 '를' (예: 가디건을 · 니트를) */
function objectJosa(word: string) {
  const code = word.charCodeAt(word.length - 1) - 0xac00;
  return code >= 0 && code < 11172 && code % 28 !== 0 ? "을" : "를";
}

export default function ClosetPage() {
  const app = useApp();
  const closet = myCloset(app);
  const fileRef = useRef<HTMLInputElement>(null);
  const [filter, setFilter] = useState("all");
  const [oldestFirst, setOldestFirst] = useState(false);
  const [openId, setOpenId] = useState<string | null>(null);
  // 즐겨찾는 상의·하의가 아직 없을 때, 고를 옷 목록을 보여주는 창
  const [choosing, setChoosing] = useState<"top" | "bottom" | null>(null);
  const [photo, setPhoto] = useState<{ original: string; cutout: string; ok: boolean } | null>(null);
  const [cutting, setCutting] = useState(false);
  // 앱 안 '사진 보관함' (예시 사진) 창, 누끼 따는 중인 예시 사진
  const [library, setLibrary] = useState(false);
  const [sampleBusy, setSampleBusy] = useState<string | null>(null);
  // 판매처 링크 화면에서 저장하고 돌아오면 이름·종류를 묻는 창이 열립니다.
  const source: NewItemSource | null = photo
    ? { image: photo.cutout, aiImage: photo.original, cutout: photo.ok }
    : app.pendingLink
      ? {
          link: app.pendingLink.url,
          size: app.pendingLink.size,
          image: app.pendingLink.image,
          cutout: app.pendingLink.cutout,
          aiImage: app.pendingLink.aiImage,
          name: app.pendingLink.name,
          category: app.pendingLink.category,
          measures: app.pendingLink.measures,
        }
      : null;

  const closeRegister = () => {
    setPhoto(null);
    setApp(() => ({ pendingLink: null }));
  };

  const favorites = closet.filter((i) => i.favorite);
  const pick = (cats: string[]) => {
    const list = favorites.filter((i) => cats.includes(i.category));
    return list.find((i) => i.confirmed) ?? list[0];
  };
  const top = pick(["top", "outer"]);
  const bottom = pick(["bottom"]);
  const bothDone = top?.confirmed && bottom?.confirmed;

  const visible = useMemo(() => {
    const match = FILTERS.find((f) => f.id === filter)!.match;
    const list = closet.filter(match);
    const ordered = oldestFirst ? [...list].reverse() : list;
    // 즐겨찾기한 옷은 각 탭에서 맨 위에 보여요 (그 안에서는 등록 순서 유지).
    return [...ordered.filter((i) => i.favorite), ...ordered.filter((i) => !i.favorite)];
  }, [closet, filter, oldestFirst]);

  const openItem = closet.find((i) => i.id === openId);

  // 예시 사진을 누르면: 누끼를 따서 정해진 이름·종류로 옷장에 바로 넣어요
  const onSample = async (p: SamplePhoto) => {
    // 이미 넣은 사진이면 또 넣지 않아요
    if (app.closet.some((i) => i.sample === p.id)) {
      showToast(`‘${p.name}’${objectJosa(p.name) === "을" ? "은" : "는"} 이미 옷장에 있어요.`);
      return;
    }
    setSampleBusy(p.id);
    // 시연용 옷이면 미리 따 둔 누끼와 실측을 그대로 써요 (lib/demoGarments.ts)
    const demo = p.demo ? DEMO_GARMENTS[p.demo] : undefined;
    const cut = demo ? { image: demo.photo, ok: true } : await removeBackground(p.src).catch(() => ({ image: p.src, ok: false }));
    const item: ClosetItem = {
      id: `item-${Date.now()}`,
      name: p.name,
      category: p.category,
      source: "photo",
      image: cut.image,
      cutout: cut.ok,
      sample: p.id,
      demo: p.demo,
      gender: demo?.gender,
      favorite: false,
      confirmed: !!demo || !!p.measures,
      measures: demo ? demo.measures : (p.measures ?? {}),
      size: p.size,
      link: p.link,
    };
    setApp((s) => ({ closet: [item, ...s.closet] }));
    setSampleBusy(null);
    setLibrary(false);
    showToast(`‘${p.name}’${objectJosa(p.name)} 옷장에 넣었어요.`);
  };

  // 휴대폰 사진을 고르면: 작게 줄이고 → 배경을 지워(누끼) → 이름·종류를 확인하고 옷장에 넣어요
  const onPhoto = async (file?: File) => {
    if (!file) return;
    setCutting(true);
    try {
      const original = await shrinkPhoto(file);
      const cut = await removeBackground(original).catch(() => ({ image: original, ok: false }));
      if (!cut.ok) showToast("배경이 복잡해 누끼를 따지 못했어요. 원래 사진으로 넣을게요.");
      setPhoto({ original, cutout: cut.image, ok: cut.ok });
    } catch {
      showToast("사진을 불러오지 못했어요. 다른 사진으로 시도해 주세요.");
    } finally {
      setCutting(false);
    }
  };

  return (
    <>
      <TabHeader title="나의 옷장" />
      <main className="no-scrollbar flex min-h-0 flex-1 flex-col gap-5 overflow-y-auto px-4 py-3">
        <section className="flex flex-col gap-[4.26px] rounded-[8.09px] bg-lav px-[9.25px] py-[6.74px]">
          <h2 className="text-[12px] leading-[1.4] font-bold text-plum">오늘의 옷, 옷장에 넣어볼까요?</h2>
          <div className="flex gap-[2.84px]">
            <button
              type="button"
              onClick={() => setLibrary(true)}
              disabled={cutting}
              className="flex-1 rounded-[4.62px] bg-white px-[6.9px] py-[5px] text-center text-[10px] leading-[1.4] font-medium whitespace-pre text-plum"
            >
              {cutting ? "누끼 따는 중…" : "＋  사진 첨부하기"}
            </button>
            <Link
              href="/closet/link"
              className="flex-1 rounded-[4.62px] bg-white px-[6.9px] py-[5px] text-center text-[10px] leading-[1.4] font-medium whitespace-pre text-plum"
            >
              {"↗  판매처 링크 입력"}
            </Link>
          </div>
          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            hidden
            onChange={(e) => {
              onPhoto(e.target.files?.[0]);
              e.target.value = "";
            }}
          />
          <p className="text-[10px] leading-[1.4] text-sub">
            판매처 링크 → 실측 자동 입력
            <br />
            사진 첨부 → 직접 측정 후 입력 (선택)
          </p>
        </section>

        <div className="flex flex-col gap-2">
          <div className="flex items-start leading-[1.4]">
            <h2 className="flex-1 text-[14px] font-bold whitespace-pre">{`내 옷  ${closet.length}`}</h2>
            <button type="button" onClick={() => setOldestFirst((v) => !v)} className="text-[10px] whitespace-pre text-sub">
              {oldestFirst ? "오래된 순  ↑" : "최근 등록순  ↓"}
            </button>
          </div>

          <section className="flex flex-col gap-[4.26px] rounded-[8.09px] border-[0.58px] border-line bg-white px-[9.25px] py-[6.74px]">
            <div className="flex items-start leading-[1.4] font-bold text-plum">
              <h3 className="flex-1 text-[12px] whitespace-pre">{"★  즐겨찾는 상의 기준"}</h3>
              <span className="text-[10px]">{top?.confirmed ? 1 : 0} / 1</span>
            </div>
            <p className="text-[10px] leading-[1.4] text-sub">
              즐겨찾는 상의와 하의 각각 1벌 이상,
              <br />
              실측을 입력해 나만의 핏 기준을 완성해요.
            </p>
            <div className="flex gap-[2.84px]">
              {[
                { label: "상의", item: top },
                { label: "하의", item: bottom },
              ].map(({ label, item }) => (
                <button
                  key={label}
                  type="button"
                  aria-label={item ? `즐겨찾는 ${label} ${item.name} 실측 입력` : `즐겨찾는 ${label} 고르기`}
                  onClick={() => (item ? setOpenId(item.id) : setChoosing(label === "상의" ? "top" : "bottom"))}
                  className="flex flex-1 text-left"
                >
                  <Criterion label={label} item={item} />
                </button>
              ))}
            </div>
            {!bothDone && <p className="text-[10px] leading-[1.4] text-warn">실측을 입력하지 않으면 핏 컨설팅과 추천의 정확도가 낮아질 수 있어요.</p>}
          </section>
        </div>

        <div className="flex flex-col gap-2.5">
          <div className="flex gap-[2.5px]">
            {FILTERS.map((f) => (
              <button
                key={f.id}
                type="button"
                aria-pressed={filter === f.id}
                onClick={() => setFilter(f.id)}
                className={cn(
                  "rounded-[11.56px] border-[0.58px] px-[5.2px] py-[3.8px] text-[10px] leading-[1.4]",
                  filter === f.id ? "border-plum bg-plum font-medium text-white" : "border-line bg-white text-sub",
                )}
              >
                {f.label}
              </button>
            ))}
          </div>

          <div className="grid grid-cols-2 gap-x-[4.26px] gap-y-2.5">
            {visible.map((item) => (
              <article key={item.id} className="flex min-w-0 flex-col items-center gap-[2.13px]">
                <button type="button" onClick={() => setOpenId(item.id)} aria-label={`${item.name} 실측 열기`} className="block">
                  <ClosetThumb item={item} className="h-[70.57px] w-[82.09px] rounded-[5.78px]" />
                </button>
                <div className="flex w-full items-center gap-1">
                  <button
                    type="button"
                    aria-pressed={item.favorite}
                    aria-label={`${item.name} 즐겨찾기 등록·해제`}
                    onClick={() => updateItem(item.id, { favorite: !item.favorite })}
                    className={cn("flex size-7 shrink-0 items-center justify-center text-[18px] leading-[1.4] font-medium", item.favorite ? "text-plum" : "text-ink")}
                  >
                    <span className="w-[18px] text-left">{item.favorite ? "★" : "☆"}</span>
                  </button>
                  <button
                    type="button"
                    onClick={() => setOpenId(item.id)}
                    className={cn("min-w-0 flex-1 truncate text-left text-[10px] leading-[1.4] font-medium", item.favorite ? "text-plum" : "text-ink")}
                  >
                    {item.name}
                  </button>
                </div>
                <p className="w-full truncate text-[10px] leading-[1.4] text-sub">{itemStatus(item)}</p>
              </article>
            ))}
            {visible.length === 0 && <p className="col-span-2 py-6 text-center text-[11px] text-sub">이 종류의 옷은 아직 없어요.</p>}
          </div>

          <div className="flex flex-col gap-[1.4px] rounded-[5.78px] border-[0.58px] border-line bg-white px-2 py-[5.9px] text-[10px] leading-[1.4]">
            <p className="font-medium text-plum">실측은 옷을 눌러 입력·수정할 수 있어요.</p>
            <p className="text-sub">링크로 불러온 수치도 직접 확인하고 수정해요.</p>
          </div>
        </div>
      </main>

      {choosing && (
        <FavoritePicker
          type={choosing}
          items={closet.filter(TYPE_MATCH[choosing])}
          onClose={() => setChoosing(null)}
          onPick={(item) => {
            updateItem(item.id, { favorite: true });
            setChoosing(null);
            setOpenId(item.id);
          }}
        />
      )}
      {openItem && <MeasureModal key={openItem.id} item={openItem} onClose={() => setOpenId(null)} />}
      {library && (
        <PhotoLibrary
          gender={app.profile.gender}
          busyId={sampleBusy}
          onPick={onSample}
          onDevice={() => {
            setLibrary(false);
            fileRef.current?.click();
          }}
          onClose={() => !sampleBusy && setLibrary(false)}
        />
      )}
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
