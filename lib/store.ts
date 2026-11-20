"use client";

// 앱 전체가 함께 쓰는 데이터 저장소입니다.
// 브라우저(localStorage)에 저장되어 새로고침해도 입력한 내용이 유지됩니다.

import { useSyncExternalStore } from "react";
import type { LinkImport } from "./linkImport";
import {
  BODY_SEED,
  CART_SEED,
  CLOSET_SEED,
  RETIRED_SEED_IDS,
  type CartItem,
  type ClosetItem,
  type Measures,
  type Profile,
  DEMO_TODAY,
  tastePhoto,
} from "./data";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  chips?: string[];
  /** 사용자가 첨부한 사진(영상은 장면 사진으로 바꿔서) — 작게 줄인 JPEG data URL */
  images?: string[];
  /** 첨부가 영상에서 뽑은 장면인지 */
  video?: boolean;
  /** 쇼핑메이트가 함께 추천한 상품 id (lib/products.ts) */
  products?: string[];
  /** 쇼핑메이트가 옷장에서 골라 준 옷 (사진 보관함 예시 사진 id, lib/data.ts SAMPLE_PHOTOS) */
  closet?: string[];
  /** 쇼핑메이트가 옷장에 넣어 준 추천 상품 id (아바타에서 입어 보기) */
  tryOn?: string[];
  /** 쇼핑메이트가 옷장에서 골라 준 옷 (옷장 옷 id) */
  wardrobe?: string[];
}

export interface AppState {
  profile: Profile;
  concerns: string[];
  concernNote: string;
  /** 온보딩 '좋아하는 스타일'에서 고른 사진 이름 (취향 찾기 사진과 같은 이름) */
  stylePicks: string[];
  /** 온보딩 '좋아하는 스타일'에 보여 줄 랜덤 12장 (한 번 정하면 화면을 오가도 그대로) */
  styleOrder: string[];
  /** 취향 찾기에서 지금까지 저장한 사진 이름 (lib/data.ts TASTE_PHOTOS의 id) */
  tastePicks: string[];
  /** 취향 찾기 사진을 랜덤으로 섞은 순서와, 지금 보고 있는 묶음 번호 (저장할 때마다 다음 묶음) */
  tasteOrder: string[];
  tasteRound: number;
  closet: ClosetItem[];
  body: Measures;
  tryOnLink: string;
  /** 아바타에 입혀 보는 옷 (옷장 옷 id) */
  /** 아바타에 입혀 본 옷 (상의·하의·아우터 한 벌씩) */
  wearing: { top?: string; bottom?: string; outer?: string };
  /** 판매처 링크 화면에서 저장한 링크·사이즈와, 링크에서 가져온 옷 사진·이름·실측 (옷장 화면에서 등록 창을 열어요) */
  pendingLink: ({ url: string; size: string } & LinkImport) | null;
  followed: string[];
  saleAlert: boolean;
  selectedDate: string;
  cart: CartItem[];
  /** 예전 버전에 기본으로 들어 있던 장바구니 예시 옷을 한 번 비웠는지 */
  cartSeedCleared?: boolean;
  chat: ChatMessage[];
  /** 온보딩(기본 정보·패션 고민·좋아하는 스타일)을 끝냈는지. 끝낸 사용자에게는 다시 보여주지 않아요. */
  onboarded: boolean;
}

const STORAGE_KEY = "showme-v1";

const initialState: AppState = {
  profile: { nickname: "", age: "24", gender: "female", height: "163", weight: "46", personalColor: "unknown" },
  concerns: ["advice"],
  concernNote: "",
  stylePicks: [],
  styleOrder: [],
  tastePicks: [],
  tasteOrder: [],
  tasteRound: 0,
  closet: CLOSET_SEED,
  body: BODY_SEED,
  tryOnLink: "",
  wearing: {},
  pendingLink: null,
  followed: ["a", "b"],
  saleAlert: true,
  selectedDate: DEMO_TODAY,
  cart: [], // 처음엔 빈 장바구니 (채팅에서 '장바구니 담기'로 넣어요)
  cartSeedCleared: true,
  chat: [],
  onboarded: false,
};

let state = initialState;
let loaded = false;
const listeners = new Set<() => void>();

function load() {
  if (loaded || typeof window === "undefined") return;
  loaded = true;
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    const saved = raw ? JSON.parse(raw) : null;
    if (saved) state = { ...initialState, ...saved };
    // 예전 버전은 취향 사진을 숫자로 기억했어요 → 이름(문자) 방식으로 바뀌어서 비워요
    if (state.tastePicks.some((x) => typeof x !== "string")) state = { ...state, tastePicks: [], tasteOrder: [], tasteRound: 0 };
    // 새로 추가된 시연용 옷(예: 남성 세트)이 저장된 옷장에 없으면 넣어 줘요
    if (saved) {
      // 예전 시연 옷(목록에서 빠진 것)은 지우고, 시연 옷 정보(사진·실측)는 최신으로 맞춰요
      const seedIds = new Set(CLOSET_SEED.map((c) => c.id));
      // 예전 여성 예시 옷(셔츠·가디건·슬랙스·토트백)은 새 여성 옷으로 바뀌었어요
      state = { ...state, closet: state.closet.filter((i) => !RETIRED_SEED_IDS.includes(i.id)) };
      state = {
        ...state,
        closet: state.closet
          .filter((i) => !i.id.startsWith("demo-") || seedIds.has(i.id))
          .map((i) => (i.id.startsWith("demo-") ? { ...i, ...CLOSET_SEED.find((c) => c.id === i.id)!, favorite: i.favorite, measures: { ...CLOSET_SEED.find((c) => c.id === i.id)!.measures, ...i.measures }, confirmed: i.confirmed || !!CLOSET_SEED.find((c) => c.id === i.id)!.confirmed } : i)),
      };
      const missing = CLOSET_SEED.filter((c) => c.id.startsWith("demo-") && !state.closet.some((i) => i.id === c.id));
      if (missing.length) state = { ...state, closet: [...state.closet, ...missing] };
      // 예전 기본 옷에는 성별 표시가 없었어요 → 예시 옷 정보로 맞춰요
      state = { ...state, closet: state.closet.map((i) => (i.gender ? i : { ...i, gender: CLOSET_SEED.find((c) => c.id === i.id)?.gender })) };
    }
    // 예전 버전은 장바구니에 예시 옷 3벌이 기본으로 들어 있었어요 → 한 번만 비워요
    if (saved && !saved.cartSeedCleared) {
      const seedIds = CART_SEED.map((c) => c.id);
      state = { ...state, cart: state.cart.filter((c) => !seedIds.includes(c.id)), cartSeedCleared: true };
    }
    // 예전 버전은 온보딩 스타일 사진도 숫자로 기억했어요
    if (state.stylePicks.some((x) => typeof x !== "string")) state = { ...state, stylePicks: [], styleOrder: [] };
    // 목록에서 빠진 취향 사진은 저장한 선택에서도 빼요
    state = { ...state, tastePicks: state.tastePicks.filter((id) => !!tastePhoto(id)) };
  } catch {
    state = initialState;
  }
}

function commit(next: AppState) {
  state = next;
  try {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(state));
  } catch {
    showToast("저장 공간이 부족해 일부 내용이 저장되지 않았어요.");
  }
  listeners.forEach((l) => l());
}

function subscribe(listener: () => void) {
  listeners.add(listener);
  return () => listeners.delete(listener);
}

/** 지금 사용자 성별에 맞는 옷장 (성별이 정해진 예시 옷은 그 성별에게만 보여요) */
export function myCloset(app: Pick<AppState, "closet" | "profile">) {
  return app.closet.filter((i) => !i.gender || i.gender === app.profile.gender);
}

/** 내가 고른 취향 사진 전부: 온보딩 '좋아하는 스타일' + 취향 찾기 (같은 사진은 한 번만) */
export const allTastePicks = (app: Pick<AppState, "stylePicks" | "tastePicks">) => [...new Set([...(app.stylePicks ?? []), ...(app.tastePicks ?? [])])];

/** 같은 상품 링크인지 비교하려고 주소를 다듬어요 (http/https, www, 끝의 / 차이는 무시) */
export const sameLinkKey = (url: string) =>
  url
    .trim()
    .toLowerCase()
    .replace(/^https?:\/\//, "")
    .replace(/^www\./, "")
    .replace(/\/+$/, "");

/** 이 브라우저에 저장된 기록상 온보딩을 끝냈는지 (처음 방문이면 false) */
export function savedOnboarded() {
  try {
    const raw = localStorage.getItem(STORAGE_KEY);
    return !!raw && !!JSON.parse(raw).onboarded;
  } catch {
    return false;
  }
}

/** 화면에서 데이터를 읽을 때: const app = useApp(); */
export function useApp() {
  return useSyncExternalStore(
    subscribe,
    () => {
      load();
      return state;
    },
    () => initialState,
  );
}

/** 데이터를 바꿀 때: setApp(s => ({ saleAlert: !s.saleAlert })) */
export function setApp(update: (s: AppState) => Partial<AppState>) {
  load();
  commit({ ...state, ...update(state) });
}

export function updateItem(id: string, patch: Partial<ClosetItem>) {
  setApp((s) => ({ closet: s.closet.map((it) => (it.id === id ? { ...it, ...patch } : it)) }));
}

export function resetApp() {
  commit(initialState);
}

/* ───── 화면 아래 잠깐 뜨는 안내 메시지 ───── */
let toastText = "";
let toastTimer: ReturnType<typeof setTimeout> | undefined;
const toastListeners = new Set<() => void>();

export function showToast(text: string) {
  toastText = text;
  toastListeners.forEach((l) => l());
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => {
    toastText = "";
    toastListeners.forEach((l) => l());
  }, 2000);
}

export function useToast() {
  return useSyncExternalStore(
    (l) => {
      toastListeners.add(l);
      return () => toastListeners.delete(l);
    },
    () => toastText,
    () => "",
  );
}
