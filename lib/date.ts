import { DEMO_TODAY } from "./data";

export const WEEKDAYS = ["일", "월", "화", "수", "목", "금", "토"];

/** 앱의 '오늘'. 실제 날짜를 쓰려면 new Date() 기반으로 바꾸면 됩니다. */
export const todayISO = () => DEMO_TODAY;

export const toISO = (y: number, m: number, d: number) =>
  `${y}-${String(m).padStart(2, "0")}-${String(d).padStart(2, "0")}`;

const parts = (iso: string) => iso.split("-").map(Number) as [number, number, number];
const utc = (iso: string) => {
  const [y, m, d] = parts(iso);
  return Date.UTC(y, m - 1, d);
};

export const weekdayOf = (iso: string) => WEEKDAYS[new Date(utc(iso)).getUTCDay()];
export const daysBetween = (from: string, to: string) => Math.round((utc(to) - utc(from)) / 86400000);
export const monthDot = (iso: string) => {
  const [, m, d] = parts(iso);
  return `${m}.${String(d).padStart(2, "0")}`;
};
export const longDate = (iso: string) => {
  const [, m, d] = parts(iso);
  return `${m}월 ${d}일 (${weekdayOf(iso)})`;
};

/** 달력 칸 배열. 앞쪽 빈칸은 null 입니다. */
export function monthCells(year: number, month: number): (number | null)[] {
  const first = new Date(Date.UTC(year, month - 1, 1)).getUTCDay();
  const last = new Date(Date.UTC(year, month, 0)).getUTCDate();
  return [...Array<null>(first).fill(null), ...Array.from({ length: last }, (_, i) => i + 1)];
}
