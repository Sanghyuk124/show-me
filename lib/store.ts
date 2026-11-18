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
} from "./data";

export interface ChatMessage {
  id: string;
  role: "user" | "bot";
  text: string;
  chips?: string[];
}

export interface AppState {
  profile: Profile;
  concerns: string[];
  concernNote: string;
  stylePicks: number[];
  tastePicks: number[];
  tasteSaved: number[] | null;
  closet: ClosetItem[];
  body: Measures;
  tryOnLink: string;
  pendingLink: { url: string; size: string } | null;
  followed: string[];
  saleAlert: boolean;
  selectedDate: string;
  cart: CartItem[];
  chat: ChatMessage[];
}

const STORAGE_KEY = "showme-v1";

const initialState: AppState = {
  profile: { nickname: "", age: "24", gender: "female", height: "163", weight: "46", personalColor: "unknown" },
  concerns: ["advice"],
  concernNote: "",
  stylePicks: [],
  tastePicks: [1, 8],
  tasteSaved: null,
  closet: CLOSET_SEED,
  body: BODY_SEED,
  tryOnLink: "",
  pendingLink: null,
  followed: ["a", "b"],
  saleAlert: true,
  selectedDate: DEMO_TODAY,
  cart: CART_SEED,
  chat: [],
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
