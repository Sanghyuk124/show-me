// 판매처 링크로 옷을 가져오는 곳입니다. (나의 옷장 → 판매처 링크 입력)
// 1) 미리 세팅한 링크(lib/data.ts LINK_PRESETS)면: 옷 사진·이름·종류·구매 사이즈 실측까지 바로
// 2) 아니면: 서버(app/api/product)가 상품 페이지의 대표 사진·상품명을 가져와요 (실측은 직접 입력)
// 사진은 판매처 사진을 그대로 써요 (누끼를 따지 않아요 — 잘못 따지는 경우가 있어서)

import { LINK_PRESETS, type Category, type Measures } from "./data";
import { shrinkSrc } from "./media";

export interface LinkImport {
  name?: string;
  category?: Category;
  /** 누끼 딴 사진 (실패하면 원래 사진) */
  image?: string;
  cutout?: boolean;
  /** AI 분류에 보낼 원래 사진 (JPEG가 아니면 보내지 않아요) */
  aiImage?: string;
  measures?: Measures;
  preset?: boolean;
}

const ORDER = ["XS", "S", "M", "L", "XL", "XXL", "XXXL"];

/** 고른 사이즈의 실측 (없으면 가장 가까운 사이즈) */
function pickSize(sizes: Record<string, Measures>, size: string) {
  if (sizes[size]) return sizes[size];
  const keys = Object.keys(sizes);
  const num = Number.parseFloat(size);
  const rank = (k: string) => (ORDER.includes(k) ? ORDER.indexOf(k) : Number.parseFloat(k));
  const want = ORDER.includes(size) ? ORDER.indexOf(size) : num;
  if (!Number.isFinite(want)) return sizes.M ?? sizes[keys[0]];
  return sizes[keys.reduce((best, k) => (Math.abs(rank(k) - want) < Math.abs(rank(best) - want) ? k : best), keys[0])];
}

export function findPreset(url: string) {
  const u = url.trim().toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, "");
  return LINK_PRESETS.find((p) => p.match.some((m) => u.includes(m.toLowerCase().replace(/^https?:\/\//, "").replace(/^www\./, ""))));
}

export async function importFromLink(url: string, size: string): Promise<LinkImport> {
  const preset = findPreset(url);
  if (preset) {
    return { name: preset.name, category: preset.category, image: preset.image, cutout: false, measures: pickSize(preset.sizes, size), preset: true };
  }
  try {
    const res = await fetch("/api/product", { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ url }) });
    const data: { name?: string; image?: string } = await res.json();
    if (!data.image) return { name: data.name };
    // 작게 줄인 JPEG 그대로 써요 (AI 분류에도 이 사진을 보내요)
    const small = await shrinkSrc(data.image);
    return { name: data.name, image: small, cutout: false, aiImage: small };
  } catch {
    return {};
  }
}
