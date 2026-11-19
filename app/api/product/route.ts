// 판매처 상품 링크에서 대표 사진과 상품명을 가져오는 서버 라우트입니다. (나의 옷장 → 판매처 링크 입력)
// 상품 페이지의 og:image(공유용 대표 사진)·og:title 을 읽고, 사진은 화면에서 누끼를 딸 수 있게 data URL로 돌려줘요.
// 실측표는 쇼핑몰마다 숨겨진 방식으로 따로 불러와서 여기서는 가져오지 않아요 (미리 세팅한 링크는 lib/data.ts LINK_PRESETS).
//
// 안전: http(s)만, 내부망·내 컴퓨터 주소는 막고, 크기·시간 제한을 둬요.

import { lookup } from "node:dns/promises";
import { isIP } from "node:net";

const MAX_HTML = 1_500_000;
const MAX_IMAGE = 4_000_000;
const TIMEOUT = 8000;
const UA = "Mozilla/5.0 (compatible; ShowMeBot/1.0; +product-preview)";

/** 내부망(사설 IP)·루프백 주소인지 */
function privateAddress(ip: string) {
  if (isIP(ip) === 6) {
    const v = ip.toLowerCase();
    return v === "::1" || v === "::" || v.startsWith("fc") || v.startsWith("fd") || v.startsWith("fe80") || v.startsWith("::ffff:");
  }
  const [a, b] = ip.split(".").map(Number);
  return a === 10 || a === 127 || a === 0 || (a === 169 && b === 254) || (a === 172 && b >= 16 && b <= 31) || (a === 192 && b === 168) || (a === 100 && b >= 64 && b <= 127);
}

async function safeUrl(raw: string) {
  let u: URL;
  try {
    u = new URL(raw);
  } catch {
    return null;
  }
  if (u.protocol !== "https:" && u.protocol !== "http:") return null;
  if (u.username || u.password) return null;
  const host = u.hostname;
  if (host === "localhost" || host.endsWith(".local") || host.endsWith(".internal")) return null;
  const addrs = isIP(host) ? [{ address: host }] : await lookup(host, { all: true }).catch(() => []);
  if (!addrs.length || addrs.some((a) => privateAddress(a.address))) return null;
  return u;
}

/** 주소를 확인하며 (넘겨주기도 한 번씩 확인) 가져와요 */
async function safeFetch(raw: string, accept: string) {
  let url = raw;
  for (let hop = 0; hop < 4; hop++) {
    const u = await safeUrl(url);
    if (!u) throw new Error("blocked");
    const res = await fetch(u, { redirect: "manual", headers: { "user-agent": UA, accept, "accept-language": "ko-KR,ko;q=0.9" }, signal: AbortSignal.timeout(TIMEOUT) });
    const next = res.headers.get("location");
    if (res.status >= 300 && res.status < 400 && next) {
      url = new URL(next, u).toString();
      continue;
    }
    return { res, url: u };
  }
  throw new Error("too_many_redirects");
}

async function readLimited(res: Response, max: number) {
  const reader = res.body?.getReader();
  if (!reader) return new Uint8Array();
  const chunks: Uint8Array[] = [];
  let size = 0;
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.length;
    if (size > max) {
      await reader.cancel();
      throw new Error("too_large");
    }
    chunks.push(value);
  }
  const out = new Uint8Array(size);
  let o = 0;
  for (const c of chunks) {
    out.set(c, o);
    o += c.length;
  }
  return out;
}

/** <meta property="og:image" content="..."> 같은 값 읽기 (속성 순서가 달라도) */
function meta(html: string, key: string) {
  const re = new RegExp(`<meta[^>]+(?:property|name)=["']${key}["'][^>]*>`, "i");
  const tag = re.exec(html)?.[0];
  return tag ? /content=["']([^"']+)["']/i.exec(tag)?.[1] : undefined;
}

const decode = (s: string) =>
  s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">")
    .trim();

export async function POST(request: Request) {
  let link = "";
  try {
    link = String((await request.json()).url ?? "").slice(0, 500).trim();
  } catch {
    return Response.json({ error: "bad_request" }, { status: 400 });
  }
  if (!/^https?:\/\//i.test(link)) link = `https://${link}`;

  try {
    // 1) 상품 페이지
    const page = await safeFetch(link, "text/html,application/xhtml+xml");
    if (!page.res.ok) return Response.json({ error: "page_failed", status: page.res.status }, { status: 502 });
    const html = new TextDecoder().decode(await readLimited(page.res, MAX_HTML));
    const title = meta(html, "og:title") ?? /<title[^>]*>([^<]+)<\/title>/i.exec(html)?.[1];
    const imageRaw = meta(html, "og:image") ?? meta(html, "og:image:url") ?? meta(html, "twitter:image");
    if (!imageRaw) return Response.json({ name: title ? decode(title) : undefined, error: "no_image" }, { status: 200 });

    // 2) 대표 사진
    const imgUrl = new URL(decode(imageRaw), page.url).toString();
    const img = await safeFetch(imgUrl, "image/*");
    const type = img.res.headers.get("content-type")?.split(";")[0] ?? "";
    if (!img.res.ok || !type.startsWith("image/")) return Response.json({ name: title ? decode(title) : undefined, error: "image_failed" }, { status: 200 });
    const bytes = await readLimited(img.res, MAX_IMAGE);
    const image = `data:${type};base64,${Buffer.from(bytes).toString("base64")}`;
    return Response.json({ name: title ? decode(title).slice(0, 60) : undefined, image });
  } catch (e) {
    const reason = e instanceof Error ? e.message : "failed";
    return Response.json({ error: reason === "blocked" ? "blocked" : "fetch_failed" }, { status: reason === "blocked" ? 400 : 502 });
  }
}
