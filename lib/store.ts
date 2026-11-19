"use client";

// 앱 전체가 함께 쓰는 데이터 저장소입니다.
// 브라우저(localStorage)에 저장되어 새로고침해도 입력한 내용이 유지됩니다.

import { useSyncExternalStore } from "react";
import {
  BODY_SEED,
  CART_SEED,
  CLOSET_SEED,
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
  wearing: { top?: string; bottom?: string };
  pendingLink: { url: string; size: string } | null;
  followed: string[];
  saleAlert: boolean;
  selectedDate: string;
  cart: CartItem[];
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
  cart: CART_SEED,
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
    if (raw) state = { ...initialState, ...JSON.parse(raw) };
    // 예전 버전은 취향 사진을 숫자로 기억했어요 → 이름(문자) 방식으로 바뀌어서 비워요
    if (state.tastePicks.some((x) => typeof x !== "string")) state = { ...state, tastePicks: [], tasteOrder: [], tasteRound: 0 };
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
