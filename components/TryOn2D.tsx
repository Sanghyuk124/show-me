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
import { DEMO_GARMENTS, type PantsRig, type TopRig } from "@/lib/demoGarments";

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
      // 시연용 옷은 기준점이 원래 사진 크기(px) 기준이라 줄이지 않아요
      const w = item.demo ? img.naturalWidth : shape.width;
      const h = item.demo ? img.naturalHeight : shape.height;
      const image = blank(w, h);
      image.getContext("2d", { willReadFrequently: true })!.drawImage(img, 0, 0, w, h);
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

/* ───────── 시연용 옷: 기준점에 맞춰 조각별로 펴 붙이기 ───────── */

type V = [number, number];
const add = (a: V, b: V): V => [a[0] + b[0], a[1] + b[1]];
const sub = (a: V, b: V): V => [a[0] - b[0], a[1] - b[1]];
const mul = (a: V, k: number): V => [a[0] * k, a[1] * k];
const len = (a: V) => Math.hypot(a[0], a[1]);
const unit = (a: V): V => mul(a, 1 / (len(a) || 1));
const mix = (a: V, b: V, t: number): V => [a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t];

/** 네 꼭짓점(위왼 p00, 위오 p10, 아래왼 p01, 아래오 p11) 사이를 (u, v)로 이어요 (범위 밖이면 늘여서) */
const bilerp = (q: [V, V, V, V], u: number, v: number) => mix(mix(q[0], q[1], u), mix(q[2], q[3], u), v);

/** 삼각형 하나: 사진의 s 삼각형을 화면의 d 삼각형으로 옮겨 그려요 */
function drawTri(ctx: CanvasRenderingContext2D, img: CanvasImageSource, s0: V, s1: V, s2: V, d0: V, d1: V, d2: V) {
  const den = s0[0] * (s1[1] - s2[1]) + s1[0] * (s2[1] - s0[1]) + s2[0] * (s0[1] - s1[1]);
  if (Math.abs(den) < 1e-6) return;
  const a = (d0[0] * (s1[1] - s2[1]) + d1[0] * (s2[1] - s0[1]) + d2[0] * (s0[1] - s1[1])) / den;
  const b = (d0[1] * (s1[1] - s2[1]) + d1[1] * (s2[1] - s0[1]) + d2[1] * (s0[1] - s1[1])) / den;
  const c = (d0[0] * (s2[0] - s1[0]) + d1[0] * (s0[0] - s2[0]) + d2[0] * (s1[0] - s0[0])) / den;
  const d = (d0[1] * (s2[0] - s1[0]) + d1[1] * (s0[0] - s2[0]) + d2[1] * (s1[0] - s0[0])) / den;
  const e = (d0[0] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[0] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[0] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
  const f = (d0[1] * (s1[0] * s2[1] - s2[0] * s1[1]) + d1[1] * (s2[0] * s0[1] - s0[0] * s2[1]) + d2[1] * (s0[0] * s1[1] - s1[0] * s0[1])) / den;
  // 삼각형 사이 틈이 보이지 않게 살짝 크게 잘라요
  const cx = (d0[0] + d1[0] + d2[0]) / 3;
  const cy = (d0[1] + d1[1] + d2[1]) / 3;
  const grow = (p: V): V => {
    const dx = p[0] - cx, dy = p[1] - cy, l = Math.hypot(dx, dy) || 1;
    return [p[0] + (dx / l) * 0.7, p[1] + (dy / l) * 0.7];
  };
  const [g0, g1, g2] = [grow(d0), grow(d1), grow(d2)];
  ctx.save();
  ctx.beginPath();
  ctx.moveTo(g0[0], g0[1]);
  ctx.lineTo(g1[0], g1[1]);
  ctx.lineTo(g2[0], g2[1]);
  ctx.closePath();
  ctx.clip();
  ctx.setTransform(ctx.getTransform().multiply(new DOMMatrix([a, b, c, d, e, f])));
  ctx.drawImage(img, 0, 0);
  ctx.restore();
}

/** 사진의 네 점 사각형을 화면의 네 점 사각형으로 격자를 나눠 펴 붙여요. u·v 범위를 0~1 밖으로 하면 그만큼 늘여서 붙여요 */
function warpQuad(
  ctx: CanvasRenderingContext2D,
  img: CanvasImageSource,
  src: [V, V, V, V],
  dst: [V, V, V, V],
  u: [number, number] = [0, 1],
  v: [number, number] = [0, 1],
  nu = 8,
  nv = 8,
  uAt?: (v: number) => [number, number],
) {
  for (let j = 0; j < nv; j++) {
    const v0 = v[0] + ((v[1] - v[0]) * j) / nv;
    const v1 = v[0] + ((v[1] - v[0]) * (j + 1)) / nv;
    for (let i = 0; i < nu; i++) {
      const ur0 = uAt ? uAt(v0) : u;
      const ur1 = uAt ? uAt(v1) : u;
      const ua0 = ur0[0] + ((ur0[1] - ur0[0]) * i) / nu, ub0 = ur0[0] + ((ur0[1] - ur0[0]) * (i + 1)) / nu;
      const ua1 = ur1[0] + ((ur1[1] - ur1[0]) * i) / nu, ub1 = ur1[0] + ((ur1[1] - ur1[0]) * (i + 1)) / nu;
      const s00 = bilerp(src, ua0, v0), s10 = bilerp(src, ub0, v0), s01 = bilerp(src, ua1, v1), s11 = bilerp(src, ub1, v1);
      const d00 = bilerp(dst, ua0, v0), d10 = bilerp(dst, ub0, v0), d01 = bilerp(dst, ua1, v1), d11 = bilerp(dst, ub1, v1);
      drawTri(ctx, img, s00, s10, s11, d00, d10, d11);
      drawTri(ctx, img, s00, s11, s01, d00, d11, d01);
    }
  }
}

/** 축 axis 에 수직인 성분 */
const perpOf = (d: V, axis: V) => -d[0] * axis[1] + d[1] * axis[0];

/** 몸 좌표(cm) → 화면(px) */
const toPx = (L: BodyLayout, p: V): V => [L.ox + p[0] * L.sx, L.oy - p[1] * L.sy];

/**
 * 시연용 상의·아우터: 몸판(어깨~겨드랑이 / 겨드랑이~밑단 두 칸)과 양쪽 소매를 따로 펴 붙여요.
 * - 몸판: 목둘레는 옆목점 높이, 어깨 솔기는 어깨너비, 겨드랑이·밑단 너비는 가슴·밑단 둘레로 (몸보다는 넓게)
 * - 소매: 어깨 솔기에서 시작해 아바타 팔 방향으로 소매 길이만큼, 소맷부리 폭은 사진 그대로
 */
function drawRigTop(ctx: CanvasRenderingContext2D, rig: TopRig, spec: GarmentSpec, L: BodyLayout, img: CanvasImageSource) {
  const m = spec.measures;
  const s = L.height / 165;
  const k = (rig.shoulder[1][0] - rig.shoulder[0][0]) / m.shoulder; // 사진 px / cm
  const neckY = L.shoulder.y + 5.5 * s; // 목둘레 위 (옆목점보다 살짝 위)
  const drop = (p: V) => (p[1] - rig.neck[1]) / k; // 목둘레에서 아래로 몇 cm
  const halfFlat = (a: V, b: V) => Math.abs(b[0] - a[0]) / 2 / k;
  const bust = L.rings.bust;
  const hips = L.rings.hips;
  // 입었을 때 앞에서 보이는 반너비: 펼친 너비의 85% 정도 (옷이 몸을 감싸니까), 몸보다는 넓게
  // 소매는 팔 위에 오고(위팔 굵기 sleeveTop), 몸판은 소매 안쪽 아래까지 와요
  const armX = Math.max(Math.abs(L.arms.left.x0), Math.abs(L.arms.right.x0));
  const sleeveTop = 13 + (m.chest - 100) * 0.06; // 팔을 내렸을 때 앞에서 보이는 위팔 쪽 소매 폭 (cm)
  const sleeveOut = Math.max((m.shoulder / 2) * 0.93, armX + sleeveTop / 2 + 0.5); // 소매 바깥선 (어깨 솔기 높이)
  const ap = Math.max(bust.xr + 2.5, armX - sleeveTop / 2 + 3, Math.min(halfFlat(rig.armpit[0], rig.armpit[1]) * 0.8, armX + 1));
  const hm = Math.min(Math.max(halfFlat(rig.hem[0], rig.hem[1]) * 0.8, hips.xr + 2), ap + 1.5);
  const sh = ap;
  const lenScale = m.length / drop([0, (rig.hem[0][1] + rig.hem[1][1]) / 2]); // 총 기장에 맞춰 세로 배율
  const y = (p: V) => neckY - drop(p) * lenScale;
  // 어깨 솔기 높이: 몸의 어깨선(목 → 어깨 끝으로 내려가는 선)보다 위에 오게 (살이 비치지 않게)
  const tip = L.shoulder.xr;
  const bodyShoulderY = (x: number) => L.shoulder.y + 6 * s * Math.max(0, Math.min(1, 1 - (x - 6 * s) / Math.max(1, tip - 6 * s)));
  const seamY = (p: V) => Math.max(y(p), bodyShoulderY(sh) + 1.5 * s);
  const dS: [V, V] = [
    [-sh, seamY(rig.shoulder[0])],
    [sh, seamY(rig.shoulder[1])],
  ];
  const dA: [V, V] = [
    [-ap, y(rig.armpit[0])],
    [ap, y(rig.armpit[1])],
  ];
  const dH: [V, V] = [
    [-hm, neckY - m.length],
    [hm, neckY - m.length],
  ];
  const P = (q: [V, V, V, V]) => q.map((p) => toPx(L, p)) as [V, V, V, V];
  const src = (q: V[]) => q as [V, V, V, V];

  // 몸판 위 칸 (목둘레까지 늘여서), 아래 칸 (옆선 밖으로 살짝 늘여서)
  const vTop = -(rig.shoulder[0][1] - rig.neck[1] + 6) / Math.max(1, rig.armpit[0][1] - rig.shoulder[0][1]);
  // 위 칸은 목둘레 ~ 어깨선(목 옆 → 어깨 끝) 아래만 그려요 (옆으로 삐죽 나오지 않게)
  const nk = 9 * s;
  ctx.save();
  ctx.beginPath();
  (
    [
      [-sh - 0.6, dS[0][1] + 0.3],
      [-nk, neckY + 2],
      [nk, neckY + 2],
      [sh + 0.6, dS[1][1] + 0.3],
      [sh + 6, dA[1][1] - 2],
      [-sh - 6, dA[0][1] - 2],
    ] as V[]
  )
    .map((c) => toPx(L, c))
    .forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1])));
  ctx.closePath();
  ctx.clip();
  warpQuad(ctx, img, src([rig.shoulder[0], rig.shoulder[1], rig.armpit[0], rig.armpit[1]]), P([dS[0], dS[1], dA[0], dA[1]]), [0, 1], [vTop, 1.02], 10, 6);
  ctx.restore();
  warpQuad(ctx, img, src([rig.armpit[0], rig.armpit[1], rig.hem[0], rig.hem[1]]), P([dA[0], dA[1], dH[0], dH[1]]), [0, 1], [0, 1.04], 10, 10, (v) => [-0.05 * v, 1 + 0.05 * v]);

  // 소매 (몸판 위에): 팔을 내린 것처럼, 소매 전체를 어깨 솔기 위쪽 점을 축으로 돌려 팔 방향으로 내려요.
  // 길이는 소매 길이에, 폭은 사진 그대로(cm)
  ([0, 1] as const).forEach((side) => {
    const arm = side === 0 ? L.arms.left : L.arms.right;
    const sign = side === 0 ? -1 : 1;
    const [cTop, cBot] = rig.cuff[side];
    const S = rig.shoulder[side];
    const A = rig.armpit[side];
    const seamMid = mix(S, A, 0.5);
    const cuffMid = mix(cTop, cBot, 0.5);
    // 기준축 = 소매 바깥선(어깨 솔기 위 → 소맷부리 위): 바깥선이 팔을 따라 곧게 내려와요
    const srcAxis = unit(sub(cTop, S));
    const srcLen = len(sub(cuffMid, seamMid));
    // 화면에서: 어깨 솔기 → 손목 (팔보다 살짝 바깥으로)
    const pS = toPx(L, [sign * sleeveOut, dS[side][1] - Math.max(0, sleeveOut - sh) * 0.45]); // 어깨선이 바깥으로 살짝 내려가게
    // 손목 쪽 소매 바깥선 = 손목 + 소맷부리 폭의 절반
    const cuffCm = (Math.abs(perpOf(sub(cBot, cTop), srcAxis)) / k) * 0.95;
    const wrist = toPx(L, [arm.x1 + sign * (cuffCm / 2 + 0.5), arm.y1]);
    const dstAxis = unit(sub(wrist, pS));
    const along = (m.sleeve * L.sy) / srcLen; // 소매 길이 맞추기
    // 폭: 팔을 내리면 겨드랑이 쪽 천이 접혀요 → 어깨 쪽은 위팔 굵기(+여유)로, 소맷부리 쪽은 사진 그대로
    const seamW = Math.abs(perpOf(sub(A, S), srcAxis));
    const topCm = Math.min(seamW / k, sleeveTop);
    const acrossTop = (topCm * L.sx) / seamW;
    const acrossCuff = (L.sx / k) * 0.95;
    const lenAlong = (cuffMid[0] - S[0]) * srcAxis[0] + (cuffMid[1] - S[1]) * srcAxis[1];
    const across = (t: number) => acrossTop + (acrossCuff - acrossTop) * Math.min(1, Math.max(0, t / lenAlong)) ** 0.8;
    // 사진 점 → 화면 점 (축 방향 성분은 along 배, 수직 성분은 across 배, 그리고 회전)
    const srcPerp: V = [-srcAxis[1], srcAxis[0]];
    const perp = (p: V) => p[0] * srcPerp[0] + p[1] * srcPerp[1];
    const towardArmpit = Math.sign(perp(sub(A, S))) || 1; // 사진에서 겨드랑이 쪽 = 입었을 때 몸 안쪽
    let inward: V = [-dstAxis[1], dstAxis[0]];
    if (Math.sign(inward[0]) !== -sign) inward = mul(inward, -1);
    const map = (p: V): V => {
      const d = sub(p, S);
      const t = d[0] * srcAxis[0] + d[1] * srcAxis[1];
      const q = perp(d) * towardArmpit;
      // 어깨 근처는 소매 윗선이 어깨선(바깥으로 내려가는 선)을 따르게 살짝 기울여요
      const w = q * across(t);
      const shoulderShear = (inward[1] / Math.max(0.2, Math.abs(inward[0])) + 0.45 * (L.sy / L.sx)) * Math.max(0, 1 - t / (0.35 * lenAlong));
      return add(add(pS, mul(dstAxis, t * along - w * shoulderShear)), mul(inward, w));
    };
    const srcQ = [S, cTop, A, cBot] as [V, V, V, V];
    const dstQ = srcQ.map(map) as [V, V, V, V];
    // 어깨선 위로 삐죽 나오지 않게, 어깨선(몸판 어깨 끝 → 바깥으로 살짝 내려가는 선) 아래만 그려요
    const far = sleeveOut + 40;
    const clipCm: V[] = [
      [sign * (sh - 3), dS[side][1] + 0.4],
      [sign * far, dS[side][1] + 0.4 - (far - sh) * 0.45],
      [sign * far, -20],
      [sign * (sh - 3), -20],
    ];
    ctx.save();
    ctx.beginPath();
    clipCm.map((c) => toPx(L, c)).forEach((c, i) => (i ? ctx.lineTo(c[0], c[1]) : ctx.moveTo(c[0], c[1])));
    ctx.closePath();
    ctx.clip();
    warpQuad(ctx, img, srcQ, dstQ, [-0.02, 1.03], [-0.02, 1.12], 10, 3);
    ctx.restore();
  });
}

/**
 * 시연용 바지 (착용 사진에서 잘라낸 앞모습): 다리마다 가랑이~밑단을 아바타 다리에 맞춰 펴 붙이고,
 * 가랑이 위(사진에서는 상의에 가려진 부분)는 맨 윗줄을 허리까지 늘여 채워요.
 */
function drawRigPants(ctx: CanvasRenderingContext2D, rig: PantsRig, spec: GarmentSpec, L: BodyLayout, img: CanvasImageSource) {
  const m = spec.measures;
  const s = L.height / 165;
  const waistY = Math.min(L.rings.waist.y + 4 * s, L.crotchY + m.rise); // 바지 허리 높이
  const hemY = Math.max(0.6, waistY - m.length); // 바닥보다 아래로는 안 내려가요 (길면 바닥에 닿아요)
  const topY = L.crotchY + 1.5 * s; // 사진 맨 윗줄이 오는 높이
  const hipHalf = Math.max((m.hip / Math.PI / 2) * 1.1, L.rings.hips.xr + 1.2);
  const waistHalf = Math.max((m.waist / Math.PI / 2) * 1.12, L.rings.waist.xr + 0.8, hipHalf * 0.92);
  const ank = L.rings.ankle;
  const legC = (ank.xl + ank.xr) / 2; // 발목 가운데 (오른쪽 다리, +x)
  const kp = (rig.hem[0][1] - rig.crotch[1]) / Math.max(1, m.length - m.rise); // 사진 px / cm (인심 기준)
  const hemHalf = Math.max(((rig.hem[1][0] - rig.hem[0][0]) / kp / 2) * 0.95, (ank.xr - ank.xl) / 2 + 2);
  const P = (q: [V, V, V, V]) => q.map((p) => toPx(L, p)) as [V, V, V, V];
  const cr = rig.crotch;
  const crY = (cr[1] - rig.top[0][1]) / kp; // 사진 맨 윗줄 ~ 가랑이 (cm)
  // 가랑이 위 (사진에서는 상의에 가려진 부분): 다리마다 윗부분 한 띠를 허리까지 늘여 채워요 (가운데가 앞여밈처럼 보여요)
  const y0 = rig.top[0][1] + 6;
  const y1 = y0 + 100;
  const mid = topY + crY;
  const gapX = 14; // 가랑이 사이 어두운 틈은 빼고
  warpQuad(ctx, img, [[rig.top[0][0], y0], [cr[0] - gapX, y0], [rig.top[0][0], y1], [cr[0] - gapX, y1]], P([[-waistHalf, waistY], [0.3, waistY], [-hipHalf, mid], [0.3, mid]]), [0, 1], [0, 1], 4, 6);
  warpQuad(ctx, img, [[cr[0] + gapX, y0], [rig.top[1][0], y0], [cr[0] + gapX, y1], [rig.top[1][0], y1]], P([[-0.3, waistY], [waistHalf, waistY], [-0.3, mid], [hipHalf, mid]]), [0, 1], [0, 1], 4, 6);
  // 허리 밴드 선
  const [wl, wr] = [toPx(L, [-waistHalf, waistY - 3.2 * s]), toPx(L, [waistHalf, waistY - 3.2 * s])];
  ctx.save();
  ctx.shadowColor = "transparent";
  ctx.strokeStyle = "rgba(90,30,40,0.28)";
  ctx.lineWidth = 0.8;
  ctx.beginPath();
  ctx.moveTo(wl[0], wl[1]);
  ctx.lineTo(wr[0], wr[1]);
  ctx.stroke();
  ctx.restore();
  // 다리 (왼쪽 = 화면 왼쪽, 오른쪽)
  const legs: [V, V, V, V][] = [
    [rig.top[0], [cr[0], rig.top[0][1]], rig.hem[0], rig.hem[1]],
    [[cr[0], rig.top[1][1]], rig.top[1], rig.hem[2], rig.hem[3]],
  ];
  const dst: [V, V, V, V][] = [
    [
      [-hipHalf, topY + crY],
      [0, topY + crY],
      [-legC - hemHalf, hemY],
      [-legC + hemHalf, hemY],
    ],
    [
      [0, topY + crY],
      [hipHalf, topY + crY],
      [legC - hemHalf, hemY],
      [legC + hemHalf, hemY],
    ],
  ];
  legs.forEach((q, i) => warpQuad(ctx, img, q, P(dst[i]), [-0.04, 1.04], [0, 1.03], 4, 12));
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
      prepare(item, spec.kind === "top" && !item.demo).then((p) => alive && setReady((cur) => ({ ...cur, [item.id]: p })));
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
      const demo = w.item.demo ? DEMO_GARMENTS[w.item.demo] : undefined;
      if (demo?.rig.kind === "top") drawRigTop(ctx, demo.rig, w.spec, layout, p.image);
      else if (demo?.rig.kind === "pants") drawRigPants(ctx, demo.rig, w.spec, layout, p.image);
      else if (w.spec.kind === "top") drawTop(ctx, w.spec, layout, p);
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
