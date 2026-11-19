"use client";

// 2D 입어보기: 정면 아바타 위에 실제 옷 사진(누끼)을 실측에 맞는 크기·위치로 겹쳐 입혀요.
//
// 맞추는 법 (몸 좌표 cm → 화면 px 는 Avatar3D 가 알려 주는 BodyLayout 으로 바꿔요)
// - 상의: 사진 속 어깨선의 너비 = 옷 어깨너비, 어깨선 ~ 밑단 길이 = 옷 총 기장 (옆목점에서 재요)
// - 하의: 사진 속 허리 밴드 너비 = 입었을 때 허리 앞 너비 (허리 둘레 ÷ π 정도), 위 ~ 아래 길이 = 옷 총 기장
//         허리 밴드는 밑위만큼 가랑이 위에 와요
// 사진은 펼쳐 놓고 찍은 모양이라 소매가 몸 옆으로 벌어져 보일 수 있어요.

import { useEffect, useState } from "react";
import type { BodyLayout } from "./Avatar3D";
import { PRECUT_IMAGES, type ClosetItem } from "@/lib/data";
import type { GarmentSpec } from "@/lib/garment";
import { bodyPanel, measureGarmentImage, removeBackground, spanAt, type GarmentShape } from "@/lib/cutout";

interface Prepared {
  src: string;
  shape: GarmentShape;
}

// 같은 사진은 한 번만 누끼·측정해요
const cache = new Map<string, Promise<Prepared>>();
function prepare(item: ClosetItem) {
  const key = `${item.id}:${item.image?.length ?? 0}`;
  let p = cache.get(key);
  if (!p) {
    p = (async () => {
      // 이미 누끼인 사진 → 그대로, 미리 만든 누끼가 있으면 그것, 아니면 지금 누끼를 따요
      const pre = PRECUT_IMAGES[item.image!];
      const src = item.cutout
        ? item.image!
        : (pre ?? (await removeBackground(item.image!).catch(() => ({ image: item.image!, ok: false }))).image);
      return { src, shape: await measureGarmentImage(src) };
    })();
    p.catch(() => cache.delete(key));
    cache.set(key, p);
  }
  return p;
}

const lerp = (a: number, b: number, t: number) => a + (b - a) * Math.min(1, Math.max(0, t));
const clamp = (v: number, lo: number, hi: number) => Math.min(hi, Math.max(lo, v));

/** 옷 사진을 화면 어디에 얼마나 크게 둘지 (px) */
function place(spec: GarmentSpec, L: BodyLayout, g: GarmentShape) {
  const m = spec.measures;
  const s = L.height / 165;
  const imgH = g.bottom - g.top;
  if (spec.kind === "top") {
    // 세로: 옷 맨 위(목둘레)를 옆목점에, 총 기장만큼 아래가 밑단
    const hps = L.shoulder.y + 4.5 * s;
    const hem = Math.max(L.crotchY - 25 * s, hps - m.length);
    // 가로: 몸판(소매 제외) 너비 = 입었을 때 가슴 앞 너비 (가슴 둘레 ÷ π 정도, 몸보다는 넓게)
    const chest = m.chest ?? Math.max(m.waist, ((L.rings.bust.xr - L.rings.bust.xl) * Math.PI) / 1.1 + 8);
    const bust = L.rings.bust;
    const wornCm = Math.max((chest / Math.PI) * 1.12, bust.xr - bust.xl + 2);
    // 어깨 근처 줄의 너비 = 어깨너비 (몸 어깨보다는 넓게) → 몸판으로 정한 크기를 이 범위 안으로 (어깨를 덮도록)
    const ys = g.top + imgH * 0.18;
    const sh = spanAt(g, ys);
    const kShoulder = (Math.max(m.shoulder, L.shoulder.xr - L.shoulder.xl + 2) * L.sx) / Math.max(1, sh.r - sh.l);
    const panel = bodyPanel(g);
    const kx = panel ? clamp((wornCm * L.sx) / Math.max(1, panel.width), kShoulder * 0.9, kShoulder * 1.3) : kShoulder;
    const cx = panel ? panel.center : (sh.l + sh.r) / 2;
    const ky = clamp(((hps - hem) * L.sy) / Math.max(1, imgH), kx * 0.75, kx * 1.45);
    return { kx, ky, left: L.ox - cx * kx, top: L.oy - (hps + 1.5 * s) * L.sy - g.top * ky, z: 2 };
  }
  // 하의: 허리 밴드 위치·너비
  const skirt = spec.style === "skirt";
  const topY = skirt ? L.rings.waist.y + 1 * s : Math.min(L.rings.waist.y + 4 * s, L.crotchY + (m.rise ?? 28));
  const W = L.rings.waist;
  const Hp = L.rings.hips;
  const bodyW = lerp(Hp.xr - Hp.xl, W.xr - W.xl, (topY - Hp.y) / Math.max(1, W.y - Hp.y));
  const widthCm = Math.max((m.waist / Math.PI) * 1.12, bodyW + 1.5);
  const yw = g.top + imgH * 0.015;
  const { l, r } = spanAt(g, yw);
  const kx = (widthCm * L.sx) / Math.max(1, r - l);
  const ky = clamp((m.length * L.sy) / Math.max(1, imgH), kx * 0.6, kx * 1.8);
  return { kx, ky, left: L.ox - ((l + r) / 2) * kx, top: L.oy - topY * L.sy - g.top * ky, z: 1 };
}

export function TryOn2D({ layout, worn }: { layout: BodyLayout; worn: { item: ClosetItem; spec: GarmentSpec }[] }) {
  const [ready, setReady] = useState<Record<string, Prepared>>({});
  const ids = worn.map((w) => `${w.item.id}:${w.item.image?.length ?? 0}`).join(",");
  useEffect(() => {
    let alive = true;
    for (const { item } of worn) {
      if (!item.image) continue;
      prepare(item).then((p) => alive && setReady((cur) => ({ ...cur, [item.id]: p })));
    }
    return () => {
      alive = false;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [ids]);

  return (
    <>
      {worn.map(({ item, spec }) => {
        const p = ready[item.id];
        if (!p) return null;
        const { kx, ky, left, top, z } = place(spec, layout, p.shape);
        return (
          <img
            key={item.id}
            src={p.src}
            alt={`${item.name} 입은 모습`}
            className="absolute max-w-none drop-shadow-[0_1px_1.5px_rgba(60,40,50,0.25)]"
            style={{ left, top, width: p.shape.width * kx, height: p.shape.height * ky, zIndex: z }}
          />
        );
      })}
    </>
  );
}
