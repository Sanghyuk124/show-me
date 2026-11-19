// 옷 사진의 배경을 지워(누끼) 옷만 남기는 곳입니다. 브라우저 안에서만 계산해서 사진이 밖으로 나가지 않아요.
//
// 원리 (바닥·벽 같은 단순한 배경 위의 옷 사진에 맞춘 방법)
// 0) 바닥 무늬·결이 방해하지 않게, 계산할 때만 사진을 살짝 흐리게 봐요.
// 1) 사진 테두리의 색을 모아 '배경 색'을 정해요.
// 2) 테두리에서 시작해, 배경 색과 비슷하고 바로 옆 칸과도 비슷한 칸을 계속 넓혀 가며 '배경'으로 칠해요.
//    (옆 칸끼리 비교해서, 조명 때문에 배경이 조금씩 어두워지는 사진도 따라가요.)
//    한 번 더, 배경 색에 아주 가까운 칸은 옆 칸과 차이가 좀 나도 배경으로 칠해요 (옷 둘레 회색 테두리 정리).
// 3) 배경으로 칠해지지 않은 부분 = 옷. 옷과 떨어진 작은 조각(바닥 얼룩 등)은 버리고,
//    경계는 살짝 부드럽게 하고, 옷 둘레로 잘라 내요.
// 배경이 복잡해서 옷만 골라내지 못하면 원래 사진을 그대로 써요.

const MAX_SIDE = 480;

export interface CutoutResult {
  /** 배경을 지운 사진 (투명 PNG) 또는 실패 시 원래 사진 */
  image: string;
  /** 배경을 지웠는지 */
  ok: boolean;
}

function loadImage(src: string) {
  return new Promise<HTMLImageElement>((resolve, reject) => {
    const img = new Image();
    img.onload = () => resolve(img);
    img.onerror = () => reject(new Error("이미지를 읽을 수 없어요"));
    img.src = src;
  });
}

/** 사진(data URL 또는 주소)의 배경을 지워요 */
export async function removeBackground(src: string): Promise<CutoutResult> {
  const img = await loadImage(src);
  const scale = Math.min(1, MAX_SIDE / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));
  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return { image: src, ok: false };
  // 원래 투명한 부분은 흰 배경으로 보고 시작해요
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, w, h);
  ctx.drawImage(img, 0, 0, w, h);
  const data = ctx.getImageData(0, 0, w, h);
  const n = w * h;
  // 0) 계산용으로만 살짝 흐린 사진 (상자 흐림, 반지름 2칸)
  const px = blur(data.data, w, h, 2);

  // 1) 테두리 색 → 배경 색 (채널별 가운데 값)
  const border: number[] = [];
  for (let x = 0; x < w; x++) border.push(x, (h - 1) * w + x);
  for (let y = 0; y < h; y++) border.push(y * w, y * w + w - 1);
  const median = (c: number) => {
    const v = border.map((i) => px[i * 4 + c]).sort((a, b) => a - b);
    return v[v.length >> 1];
  };
  const bg = [median(0), median(1), median(2)];
  const distBg = (i: number) => Math.hypot(px[i * 4] - bg[0], px[i * 4 + 1] - bg[1], px[i * 4 + 2] - bg[2]);
  // 배경이 고를수록 기준을 좁게, 얼룩질수록 넓게
  const spreads = border.map(distBg).sort((a, b) => a - b);
  const spread = spreads[Math.floor(spreads.length * 0.9)];
  const tol = Math.max(12, Math.min(40, spread * 2.2 + 8)) * 1.6;

  // 2) 테두리에서 넓혀 가며 배경 칠하기
  const isBg = new Uint8Array(n);
  const queue = new Int32Array(n);
  let tail = 0;
  for (const i of border) {
    if (!isBg[i] && distBg(i) < tol) {
      isBg[i] = 1;
      queue[tail++] = i;
    }
  }
  const grow = (limit: number, step: number) => {
    // 이미 배경인 칸 모두에서 다시 넓혀요
    let head = 0;
    let end = 0;
    for (let i = 0; i < n; i++) if (isBg[i]) queue[end++] = i;
    while (head < end) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      const r = px[i * 4], g = px[i * 4 + 1], b = px[i * 4 + 2];
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x + 1 : k === 1 ? x - 1 : x;
        const ny = k === 2 ? y + 1 : k === 3 ? y - 1 : y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (isBg[j] || distBg(j) >= limit) continue;
        if (Math.hypot(px[j * 4] - r, px[j * 4 + 1] - g, px[j * 4 + 2] - b) >= step) continue;
        isBg[j] = 1;
        queue[end++] = j;
      }
    }
  };
  grow(tol, 9); // 옆 칸과 아주 비슷한 배경
  grow(tol * 0.6, 22); // 배경 색에 아주 가까운 칸 (옷 둘레 회색 테두리)

  // 3-1) 옷 조각 나누기 → 가장 큰 조각의 8%보다 작은 조각(바닥 얼룩 등)은 배경으로
  const label = new Int32Array(n).fill(-1);
  const sizes: number[] = [];
  for (let s = 0; s < n; s++) {
    if (isBg[s] || label[s] >= 0) continue;
    const id = sizes.length;
    let head = 0;
    let end = 0;
    queue[end++] = s;
    label[s] = id;
    while (head < end) {
      const i = queue[head++];
      const x = i % w;
      const y = (i - x) / w;
      for (let k = 0; k < 4; k++) {
        const nx = k === 0 ? x + 1 : k === 1 ? x - 1 : x;
        const ny = k === 2 ? y + 1 : k === 3 ? y - 1 : y;
        if (nx < 0 || ny < 0 || nx >= w || ny >= h) continue;
        const j = ny * w + nx;
        if (isBg[j] || label[j] >= 0) continue;
        label[j] = id;
        queue[end++] = j;
      }
    }
    sizes.push(end);
  }
  const biggest = Math.max(0, ...sizes);
  for (let i = 0; i < n; i++) if (label[i] >= 0 && sizes[label[i]] < biggest * 0.08) isBg[i] = 1;

  // 배경이 거의 없거나(복잡한 배경), 옷이 거의 없으면 실패로 보고 원래 사진을 써요
  let bgCount = 0;
  for (let i = 0; i < n; i++) bgCount += isBg[i];
  const bgFrac = bgCount / n;
  if (bgFrac < 0.15 || bgFrac > 0.97) return { image: src, ok: false };
  const out4 = data.data; // 실제로 투명하게 만들 원래(흐리지 않은) 사진

  // 3-2) 투명하게 + 경계 부드럽게 + 옷 둘레로 자르기
  let x0 = w, y0 = h, x1 = -1, y1 = -1;
  for (let i = 0; i < n; i++) {
    if (isBg[i]) {
      out4[i * 4 + 3] = 0;
      continue;
    }
    const x = i % w;
    const y = (i - x) / w;
    const edge = (x > 0 && isBg[i - 1]) || (x < w - 1 && isBg[i + 1]) || (y > 0 && isBg[i - w]) || (y < h - 1 && isBg[i + w]);
    // 경계 칸: 배경 색에 가까우면 지우고, 아니면 반투명으로
    if (edge) out4[i * 4 + 3] = distBg(i) < tol * 0.75 ? 0 : 170;
    if (x < x0) x0 = x;
    if (x > x1) x1 = x;
    if (y < y0) y0 = y;
    if (y > y1) y1 = y;
  }
  ctx.putImageData(data, 0, 0);
  const pad = Math.round(Math.max(x1 - x0, y1 - y0) * 0.04);
  const cx0 = Math.max(0, x0 - pad), cy0 = Math.max(0, y0 - pad);
  const cw = Math.min(w, x1 + pad + 1) - cx0, ch = Math.min(h, y1 + pad + 1) - cy0;
  const out = document.createElement("canvas");
  out.width = cw;
  out.height = ch;
  out.getContext("2d")?.drawImage(canvas, cx0, cy0, cw, ch, 0, 0, cw, ch);
  return { image: out.toDataURL("image/png"), ok: true };
}

/** 상자 흐림 (가로 → 세로). RGBA 배열을 새로 만들어 돌려줘요 */
function blur(src: Uint8ClampedArray, w: number, h: number, r: number) {
  const tmp = new Float32Array(w * h * 4);
  const out = new Float32Array(w * h * 4);
  const size = r * 2 + 1;
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += src[(y * w + Math.min(w - 1, Math.max(0, x + d))) * 4 + c];
        tmp[(y * w + x) * 4 + c] = s / size;
      }
  for (let y = 0; y < h; y++)
    for (let x = 0; x < w; x++)
      for (let c = 0; c < 3; c++) {
        let s = 0;
        for (let d = -r; d <= r; d++) s += tmp[(Math.min(h - 1, Math.max(0, y + d)) * w + x) * 4 + c];
        out[(y * w + x) * 4 + c] = s / size;
      }
  return out;
}
