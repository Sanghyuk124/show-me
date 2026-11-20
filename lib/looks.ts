// 아바타 탭 '입어 본 모습' 사진 세트 (시연용).
// 미리 AI로 만들어 둔 마네킹 착용 사진을, 지금 입힌 옷 조합에 맞춰 보여줘요.
// - parts: 이 세트에 들어가는 상품 (lib/products.ts 의 id) — 채팅 추천에서 '옷장에 넣기'로 넣은 옷
// - photos: 조합 이름 → 사진. 조합 이름은 입힌 부위를 top → bottom → outer 순서로 "+"로 이어요 (아무것도 안 입으면 "base")
//   사진 파일: public/looks/<성별>/<조합 이름>.webp
// 세트에 없는 옷을 입히면 이 사진 대신 기존 2D 입어보기를 보여줘요.

import type { ClosetItem, Gender } from "./data";

export type LookPart = "top" | "bottom" | "outer";
const ORDER: LookPart[] = ["top", "bottom", "outer"];

interface LookSet {
  gender: Gender;
  parts: Record<LookPart, string>;
  photos: Record<string, string>;
}

const photo = (gender: Gender, key: string) => `/looks/${gender}/${encodeURIComponent(key)}.webp`;
const keys = (gender: Gender, list: string[]) => Object.fromEntries(list.map((k) => [k, photo(gender, k)]));

export const LOOK_SETS: LookSet[] = [
  {
    // 여성 첫 출근 룩 (던스트 브이넥 스웨터 · 세미 부츠컷 슬랙스 · 시야쥬 부클 롱코트)
    gender: "female",
    parts: { top: "dunst-classic-vneck-sweater", bottom: "dunst-semi-bootcut-slacks", outer: "siyazu-boucle-long-coat" },
    photos: keys("female", ["base", "top", "bottom", "outer", "top+bottom"]),
  },
];

export const lookSetFor = (gender: Gender) => LOOK_SETS.find((s) => s.gender === gender);

/** 이 옷이 사진 세트에 들어가는 옷이면 그 부위 */
export function lookPartOf(gender: Gender, item: Pick<ClosetItem, "product">): LookPart | null {
  const set = lookSetFor(gender);
  if (!set || !item.product) return null;
  return ORDER.find((p) => set.parts[p] === item.product) ?? null;
}

/**
 * 지금 입힌 옷에 맞는 사진. 세트가 없거나 세트 밖 옷을 입었으면 null (기존 2D 입어보기).
 * 그 조합 사진이 아직 없으면 입힌 부위를 가장 많이 담은 사진을 보여주고 missing 을 알려줘요.
 */
export function lookPhoto(gender: Gender, worn: Pick<ClosetItem, "product">[]) {
  const set = lookSetFor(gender);
  if (!set) return null;
  const parts = worn.map((w) => lookPartOf(gender, w));
  if (parts.some((p) => !p)) return null;
  const on = ORDER.filter((p) => parts.includes(p));
  const key = on.length ? on.join("+") : "base";
  if (set.photos[key]) return { src: set.photos[key], key, missing: false };
  // 비슷한 사진: 입힌 부위를 가장 많이 담고, 안 입힌 부위는 없는 사진
  const best = Object.keys(set.photos)
    .map((k) => ({ k, ps: k === "base" ? [] : (k.split("+") as LookPart[]) }))
    .filter(({ ps }) => ps.every((p) => on.includes(p)))
    .sort((a, b) => b.ps.length - a.ps.length)[0];
  return { src: set.photos[best?.k ?? "base"], key, missing: true };
}
