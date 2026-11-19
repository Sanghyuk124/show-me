"use client";

// 2D 입어보기: 정면 아바타 위에 실제 옷 사진(누끼)을 실측에 맞춰 '입혀' 그려요.
//
// 맞추는 법 (몸 좌표 cm → 화면 px 는 Avatar3D 가 알려 주는 BodyLayout 으로 바꿔요)
// - 상의·아우터: 사진을 몸판 / 왼소매 / 오른소매로 나눠요 (펼쳐 찍은 사진에서 소매와 몸판 사이의 틈으로 찾아요).
//   · 몸판: 너비 = 입었을 때 가슴 앞 너비(가슴 둘레 ÷ π 정도, 몸보다는 넓게), 길이 = 총 기장 (옆목점에서 재요)
//   · 소매: 어깨 솔기를 축으로 돌려 아바타 팔 방향으로 내리고, 길이를 소매 길이에 맞춰요
//     → 펼친 사진이 아니라 팔을 내리고 입은 모습처럼 보여요
// - 하의: 허리 밴드 너비 = 입었을 때 허리 앞 너비, 위치 = 가랑이에서 밑위만큼 위, 길이 = 총 기장
// - 겹치는 순서: 하의 → 상의 → 아우터

import { useEffect, useRef, useState } from "react";
import type { BodyLayout } from "./Avatar3D";
import { PRECUT_IMAGES, type ClosetItem } from "@/lib/data";
import type { GarmentSpec } from "@/lib/garment";
import { bodyPanel, measureGarmentImage, removeBackground, spanAt, type GarmentShape } from "@/lib/cutout";

interface Sleeve {
  canvas: HTMLCanvasElement;
  /** 어깨 솔기(돌리는 축) 사진 위치 */
  px: number;
  py: number;
  /** 사진 속 소매 방향(라디안, y 아래로)과 길이(px) */
  angle: number;
  length: number;
}

interface Prepared {
  image: HTMLCanvasElement;
  shape: GarmentShape;
  /** 몸판·소매로 나눈 조각 (상의에서 소매가 몸판과 떨어져 보일 때만) */
  split?: { torso: HTMLCanvasElement; tL: number; tR: number; left: Sleeve; right: Sleeve };
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = src;
  });
}

function blank(w: number, h: number) {
  const c = document.createElement("canvas");
  c.width = w;
  c.height = h;
  return c;
}

/** 사진을 몸판·소매로 나눠요 */
/** 몸판 너비·가운데 (사진 px): 소매와 몸판 사이 틈으로 찾고, 틈이 없으면(소매가 몸판에 붙어 펼쳐진 사진) 밑단 쪽 좁은 줄로 */
export function torsoColumns(g: GarmentShape) {
  const panel = bodyPanel(g);
  if (panel) return panel;
  const h = g.bottom - g.top;
  const rows: { w: number; c: number }[] = [];
  for (let y = Math.round(g.top + h * 0.55); y <= g.top + h * 0.98; y++) {
    if (g.left[y] < 0) continue;
    rows.push({ w: g.right[y] - g.left[y], c: (g.right[y] + g.left[y]) / 2 });
  }
  if (rows.length < 5) return null;
  const byW = [...rows].sort((a, b) => a.w - b.w);
  const width = byW[Math.floor(byW.length * 0.15)].w; // 소매가 없는 줄들의 너비
  const cs = rows.map((r) => r.c).sort((a, b) => a - b);
  const full = Math.max(...rows.map((r) => r.w));
  // 몸판이 옷 전체 너비와 거의 같으면 나눌 소매가 없어요
  if (width > full * 0.92 && width > (g.right[Math.round(g.top + h * 0.3)] - g.left[Math.round(g.top + h * 0.3)]) * 0.9) return null;
  return { width, center: cs[cs.length >> 1] };
}

function splitTop(image: HTMLCanvasElement, g: GarmentShape): Prepared["split"] {
  const panel = torsoColumns(g);
  if (!panel) return undefined;
  const tL = Math.round(panel.center - panel.width / 2);
  const tR = Math.round(panel.center + panel.width / 2);
  const { width: w, height: h } = image;
  const alpha = image.getContext("2d")!.getImageData(0, 0, w, h).data;

  const sleeve = (side: "left" | "right"): Sleeve | null => {
    const inSleeve = (x: number) => (side === "left" ? x < tL - 1 : x > tR + 1);
    // 어깨 솔기: 옷이 몸판 밖으로 처음 나오는 줄
    let py = -1;
    for (let y = g.top; y <= g.bottom; y++) {
      if (g.left[y] < 0) continue;
      if (side === "left" ? g.left[y] < tL - 2 : g.right[y] > tR + 2) {
        py = y;
        break;
      }
    }
    if (py < 0) return null;
    const px = side === "left" ? tL : tR;
    // 소매 칸들의 평균 방향과 가장 먼 거리
    let sx = 0, sy = 0, n = 0;
    const pts: number[] = [];
    for (let y = g.top; y <= g.bottom; y++)
      for (let x = 0; x < w; x++) {
        if (!inSleeve(x) || alpha[(y * w + x) * 4 + 3] < 80) continue;
        sx += x - px;
        sy += y - py;
        n++;
        pts.push(x - px, y - py);
      }
    if (n < 30) return null;
    const angle = Math.atan2(sy / n, sx / n);
    const ux = Math.cos(angle), uy = Math.sin(angle);
    const along: number[] = [];
    for (let k = 0; k < pts.length; k += 2) along.push(pts[k] * ux + pts[k + 1] * uy);
    along.sort((a, b) => a - b);
    const length = along[Math.floor(along.length * 0.98)];
    // 소매 칸만 남긴 조각
    const c = blank(w, h);
    const ctx = c.getContext("2d")!;
    ctx.drawImage(image, 0, 0);
    ctx.globalCompositeOperation = "destination-in";
    ctx.fillRect(side === "left" ? 0 : tR + 1, 0, side === "left" ? tL : w - tR - 1, h);
    return { canvas: c, px, py, angle, length };
  };

  const left = sleeve("left");
  const right = sleeve("right");
  if (!left || !right) return undefined;
  const torso = blank(w, h);
  const tctx = torso.getContext("2d")!;
  tctx.drawImage(image, 0, 0);
  tctx.globalCompositeOperation = "destination-in";
  tctx.fillRect(tL, 0, tR - tL + 1, h);
  return { torso, tL, tR, left, right };
}

// 같은 사진은 한 번만 누끼·측정·나누기를 해요
const cache = new Map<string, Promise<Prepared>>();
function prepare(item: ClosetItem, isTop: boolean) {
  const key = `${item.id}:${item.image?.length ?? 0}:${isTop}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      // 이미 누끼인 사진 → 그대로, 미리 만든 누끼가 있으면 그것, 아니면 지금 누끼를 따요
      const pre = PRECUT_IMAGES[item.image!];
      const src = item.cutout
        ? item.image!
        : (pre ?? (await removeBackground(item.image!).catch(() => ({ image: item.image!, ok: false }))).image);
      const shape = await measureGarmentImage(src);
      const img = await loadImage(src);
      const image = blank(shape.width, shape.height);
      image.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, shape.width, shape.height);
      return { image, shape, split: isTop ? splitTop(image, shape) : undefined };
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 상의·아우터 그리기 */
function drawTop(ctx: CanvasRenderingContext2D, spec: GarmentSpec, L: BodyLayout, p: Prepared) {
  const m = spec.measures;
  const g = p.shape;
  const s = L.height / 165;
  const imgH = g.bottom - g.top;
  // 세로: 옷 맨 위(목둘레)를 옆목점에, 총 기장만큼 아래가 밑단
  const hps = L.shoulder.y + 4.5 * s;
  const hem = Math.max(L.crotchY - 30 * s, hps - m.length);
  // 가로: 몸판 너비 = 입었을 때 가슴 앞 너비 (가슴 둘레 ÷ π 정도, 몸보다는 넓게), 어깨는 덮도록
  const bust = L.rings.bust;
  const chest = m.chest ?? Math.max(m.waist ?? 0, (bust.xr - bust.xl) * 2.9 + 8);
  const wornCm = Math.max((chest / Math.PI) * 1.12, bust.xr - bust.xl + 2);
  const sh = spanAt(g, g.top + imgH * 0.18);
  const kShoulder = (Math.max(m.shoulder, L.shoulder.xr - L.shoulder.xl + 2) * L.sx) / Math.max(1, sh.r - sh.l);
  const panelW = p.split ? p.split.tR - p.split.tL : torsoColumns(g)?.width;
  const kx = panelW ? clamp((wornCm * L.sx) / Math.max(1, panelW), kShoulder * 0.85, kShoulder * 1.4) : kShoulder;
  const ky = clamp(((hps - hem) * L.sy) / Math.max(1, imgH), kx * 0.7, kx * 1.5);
  const cx = p.split ? (p.split.tL + p.split.tR) / 2 : panelW ? torsoColumns(g)!.center : (sh.l + sh.r) / 2;
  const left = L.ox - cx * kx;
  const top = L.oy - (hps + 1.5 * s) * L.sy - g.top * ky;

  if (!p.split) {
    // 소매가 몸판에 붙은 사진: 통째로
    ctx.drawImage(p.image, left, top, g.width * kx, g.height * ky);
    return;
  }
  const { torso, left: sl, right: sr } = p.split;
  // 소매 (몸판 뒤): 어깨 솔기를 축으로 팔 방향으로 돌리고, 길이는 소매 길이에 맞춰요
  const sleeve = (sv: Sleeve, arm: BodyLayout["arms"]["left"]) => {
    const pxS = left + sv.px * kx;
    const pyS = top + sv.py * ky;
    const armAngle = Math.atan2(-(arm.y1 - arm.y0) * L.sy, (arm.x1 - arm.x0) * L.sx);
    const target = (m.sleeve ?? 58) * L.sy;
    const f = clamp(target / Math.max(1, sv.length * kx), 0.7, 1.4);
    ctx.save();
    ctx.translate(pxS, pyS);
    ctx.rotate(armAngle);
    ctx.scale(f * kx, kx);
    ctx.rotate(-sv.angle);
    ctx.translate(-sv.px, -sv.py);
    ctx.drawImage(sv.canvas, 0, 0);
    ctx.restore();
  };
  sleeve(sl, L.arms.left);
  sleeve(sr, L.arms.right);
  ctx.drawImage(torso, left, top, g.width * kx, g.height * ky);
}

/** 하의 그리기 */
function drawBottom(ctx: CanvasRenderingContext2D, spec: GarmentSpec, L: BodyLayout, p: Prepared) {
  const m = spec.measures;
  const g = p.shape;
  const s = L.height / 165;
  const imgH = g.bottom - g.top;
  const skirt = spec.style === "skirt";
  const topY = skirt ? L.rings.waist.y + 1 * s : Math.min(L.rings.waist.y + 4 * s, L.crotchY + (m.rise ?? 28));
  const W = L.rings.waist;
  const Hp = L.rings.hips;
  const bodyW = lerp(Hp.xr - Hp.xl, W.xr - W.xl, (topY - Hp.y) / Math.max(1, W.y - Hp.y));
  const widthCm = Math.max((m.waist / Math.PI) * 1.12, bodyW + 1.5);
  const { l, r } = spanAt(g, g.top + imgH * 0.015);
  const kx = (widthCm * L.sx) / Math.max(1, r - l);
  const ky = clamp((m.length * L.sy) / Math.max(1, imgH), kx * 0.6, kx * 1.8);
  ctx.drawImage(p.image, L.ox - ((l + r) / 2) * kx, L.oy - topY * L.sy - g.top * ky, g.width * kx, g.height * ky);
}

/** 겹치는 순서: 하의(0) → 상의(1) → 아우터(2) */
const layer = (w: { item: ClosetItem; spec: GarmentSpec }) => (w.spec.kind === "bottom" ? 0 : w.item.category === "outer" ? 2 : 1);

export function TryOn2D({ layout, worn }: { layout: BodyLayout; worn: { item: ClosetItem; spec: GarmentSpec }[] }) {
  const [ready, setReady] = useState<Record<string, Prepared>>({});
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const ids = worn.map((w) => `${w.item.id}:${w.item.image?.length ?? 0}`).join(",");
  useEffect(() => {
    let alive = true;
    for (const { item, spec } of worn) {
      if (!item.image) continue;
      prepare(item, spec.kind === "top").then((p) => alive && setReady((cur) => ({ ...cur, [item.id]: p })));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  // 화면에 그리기 (옷·체형·화면 크기가 바뀔 때마다)
  useEffect(() => {
    const c = canvasRef.current;
    if (!c) return;
    const dpr = Math.min(window.devicePixelRatio || 1, 2);
    c.width = Math.round(layout.width * dpr);
    c.height = Math.round(layout.height_px * dpr);
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.setTransform(dpr, 0, 0, dpr, 0, 0);
    ctx.clearRect(0, 0, layout.width, layout.height_px);
    ctx.imageSmoothingQuality = "high";
    // 옷 아래 살짝 그림자
    ctx.shadowColor = "rgba(60,40,50,0.22)";
    ctx.shadowBlur = 2;
    ctx.shadowOffsetY = 1;
    for (const w of [...worn].sort((a, b) => layer(a) - layer(b))) {
      const p = ready[w.item.id];
      if (!p) continue;
      if (w.spec.kind === "top") drawTop(ctx, w.spec, layout, p);
      else drawBottom(ctx, w.spec, layout, p);
    }
  }, [layout, ready, worn]);

  return (
    <canvas
      ref={canvasRef}
      role="img"
      aria-label={`입은 옷: ${worn.map((w) => w.item.name).join(", ") || "없음"}`}
      className="absolute inset-0 size-full"
    />
  );
}
