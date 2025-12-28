export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

/**
 * Telegram Bot + currency/crypto/gold prices + Instagram/Twitter/X downloader
 * Runtime: Cloudflare Workers
 */

// -----------------------------
// Constants
// -----------------------------

const BOT_USERNAME = "worker093578bot";
const PRICES_JSON_URL = "https://raw.githubusercontent.com/joestar9/price-scraper/main/rates_v2_latest";

const TG_JSON_HEADERS = { "content-type": "application/json" } as const;
const TG_PARSE_MODE = "HTML" as const;

const COBALT_INSTANCES = [
  "https://cobalt-api.meowing.de",
  "https://cobalt-backend.canine.tools",
  "https://capi.3kh0.net",
  "https://cobalt-api.kwiatekmiki.com",
  "https://downloadapi.stuff.solutions",
  "https://cobalt.canine.tools",
  "https://api.cobalt.tools",
  "https://blossom.imput.net",
  "https://kityune.imput.net",
  "https://nachos.imput.net",
  "https://nuko-c.meowing.de",
  "https://sunny.imput.net",
];

const COBALT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/1.0)",
  Origin: "https://cobalt.tools",
  Referer: "https://cobalt.tools/",
} as const;

const PRICES_CACHE_TTL_SECONDS = 15 * 60; // caches.default TTL per PoP
const PRICES_CACHE_KEY = new Request(PRICES_JSON_URL, { method: "GET" });

const RATES_CACHE_TTL_MS = 60_000; // memory cache per isolate
const STALE_REFRESH_MS = 30 * 60_000; // you update prices every ~25 minutes

// Parsing caches
const PARSE_TTL_MS = 15_000;
const CONTEXT_TTL_MS = 60_000;
const PARSE_CACHE_MAX = 5_000;

// -----------------------------
// Telegram minimal types (only what we use)
// -----------------------------

type TgChatType = "private" | "group" | "supergroup" | "channel";

type TgChat = {
  id: number;
  type?: TgChatType;
};

type TgFrom = {
  id: number;
};

type TgMessage = {
  message_id: number;
  date: number;
  text?: string;
  chat: TgChat;
  from?: TgFrom;
};

type TgCallbackQuery = {
  id: string;
  data?: string;
  message?: {
    message_id?: number;
    chat?: TgChat;
  };
};

type TgUpdate = {
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

// -----------------------------
// Rates data types
// -----------------------------

type Rate = {
  price: number;
  unit: number;
  kind: "currency" | "gold" | "crypto";
  title: string;
  emoji: string;
  fa: string;
  usdPrice?: number;
  change24h?: number;
  // Optional improvements from upstream JSON (safe to ignore if absent)
  aliases?: string[];
  inputMode?: "pack" | "native";
};

type Stored = {
  fetchedAtMs: number;
  source: string;
  timestamp?: string;
  rates: Record<string, Rate>;
  // Precomputed in GitHub Actions to reduce Worker CPU
  aliasIndex: Record<string, string>;
  lists: { fiat: string[]; crypto: string[] };
};

// -----------------------------
// Static metadata (flags, names)
// -----------------------------

const META: Record<string, { emoji: string; fa: string }> = {
  usd: { emoji: "🇺🇸", fa: "دلار آمریکا" },
  eur: { emoji: "🇪🇺", fa: "یورو" },
  gbp: { emoji: "🇬🇧", fa: "پوند انگلیس" },
  chf: { emoji: "🇨🇭", fa: "فرانک سوئیس" },
  cad: { emoji: "🇨🇦", fa: "دلار کانادا" },
  aud: { emoji: "🇦🇺", fa: "دلار استرالیا" },
  jpy: { emoji: "🇯🇵", fa: "ین ژاپن" },
  cny: { emoji: "🇨🇳", fa: "یوان چین" },
  aed: { emoji: "🇦🇪", fa: "درهم امارات" },
  try: { emoji: "🇹🇷", fa: "لیر ترکیه" },
  iqd: { emoji: "🇮🇶", fa: "دینار عراق" },
  afn: { emoji: "🇦🇫", fa: "افغانی" },
  pkr: { emoji: "🇵🇰", fa: "روپیه پاکستان" },
  sar: { emoji: "🇸🇦", fa: "ریال عربستان" },
  omr: { emoji: "🇴🇲", fa: "ریال عمان" },
  qar: { emoji: "🇶🇦", fa: "ریال قطر" },
  kwd: { emoji: "🇰🇼", fa: "دینار کویت" },
  bhd: { emoji: "🇧🇭", fa: "دینار بحرین" },
  rub: { emoji: "🇷🇺", fa: "روبل روسیه" },
  azn: { emoji: "🇦🇿", fa: "منات آذربایجان" },
  amd: { emoji: "🇦🇲", fa: "درام ارمنستان" },
  tjs: { emoji: "🇹🇯", fa: "سامانی تاجیکستان" },
  tmt: { emoji: "🇹🇲", fa: "منات ترکمنستان" },
  sek: { emoji: "🇸🇪", fa: "کرون سوئد" },
  nok: { emoji: "🇳🇴", fa: "کرون نروژ" },
  dkk: { emoji: "🇩🇰", fa: "کرون دانمارک" },
  thb: { emoji: "🇹🇭", fa: "بات تایلند" },
  sgd: { emoji: "🇸🇬", fa: "دلار سنگاپور" },
  hkd: { emoji: "🇭🇰", fa: "دلار هنگ‌کنگ" },
  myr: { emoji: "🇲🇾", fa: "رینگیت مالزی" },
  inr: { emoji: "🇮🇳", fa: "روپیه هند" },
  krw: { emoji: "🇰🇷", fa: "وون کره جنوبی" },
  gold_gram_18k: { emoji: "🥇", fa: "گرم طلا ۱۸" },
  gold_mithqal: { emoji: "⚖️", fa: "مثقال طلا" },
  coin_emami: { emoji: "🪙", fa: "سکه امامی" },
  coin_bahar: { emoji: "🪙", fa: "سکه بهار آزادی" },
  coin_azadi: { emoji: "🪙", fa: "سکه آزادی" },
  coin_half: { emoji: "🪙", fa: "نیم سکه" },
  coin_half_azadi: { emoji: "🪙", fa: "نیم سکه" },
  coin_quarter: { emoji: "🪙", fa: "ربع سکه" },
  coin_quarter_azadi: { emoji: "🪙", fa: "ربع سکه" },
  coin_gram: { emoji: "🪙", fa: "سکه گرمی" },
  coin_gerami: { emoji: "🪙", fa: "سکه گرمی" },
};

const CRYPTO_META: Record<string, { emoji: string; fa: string }> = {
  btc: { emoji: "₿", fa: "بیت‌کوین" },
  eth: { emoji: "⟠", fa: "اتریوم" },
  usdt: { emoji: "💵", fa: "تتر" },
  ton: { emoji: "💠", fa: "تون" },
  trx: { emoji: "🔺", fa: "ترون" },
  not: { emoji: "⭐️", fa: "نات‌کوین" },
  doge: { emoji: "🐶", fa: "دوج‌کوین" },
  shib: { emoji: "🐕", fa: "شیبا" },
  sol: { emoji: "🌞", fa: "سولانا" },
  bnb: { emoji: "🟡", fa: "بی‌ان‌بی" },
};

// -----------------------------
// Fast string normalization utilities
// -----------------------------

const DIGIT_MAP: Record<string, string> = {
  "۰": "0",
  "۱": "1",
  "۲": "2",
  "۳": "3",
  "۴": "4",
  "۵": "5",
  "۶": "6",
  "۷": "7",
  "۸": "8",
  "۹": "9",
  "٠": "0",
  "١": "1",
  "٢": "2",
  "٣": "3",
  "٤": "4",
  "٥": "5",
  "٦": "6",
  "٧": "7",
  "٨": "8",
  "٩": "9",
};

function normalizeDigits(input: string) {
  // Fast path: return the same string if no Persian/Arabic digit is present.
  // Avoid O(n^2) string concatenation; only allocate if a replacement is needed.
  let out: string[] | null = null;
  for (let i = 0; i < input.length; i++) {
    const ch = input[i];
    const mapped = DIGIT_MAP[ch];
    if (mapped !== undefined) {
      if (out === null) {
        out = new Array(input.length);
        for (let j = 0; j < i; j++) out[j] = input[j];
      }
      out[i] = mapped;
    } else if (out !== null) {
      out[i] = ch;
    }
  }
  return out === null ? input : out.join("");
}

function norm(input: string) {
  return normalizeDigits(input)
    .replace(/\u200c/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .toLowerCase()
    .trim();
}

function stripPunct(input: string) {
  return input.replace(/[.,!?؟؛:()[\]{}"'«»]/g, " ").replace(/\s+/g, " ").trim();
}

function formatToman(n: number) {
  const x = Math.round(n);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUSD(n: number) {
  if (n < 1) return n.toFixed(4);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}


type AliasIndexCache = { exact: Map<string, string>; compact: Map<string, string>; scan: string[] };
type RuntimeRatesCache = { stored: Stored; alias: AliasIndexCache; loadedAtMs: number };

let RUNTIME_RATES_CACHE: RuntimeRatesCache | null = null;

// Prevent obviously-generic aliases from matching everything.
// (Keep this list tiny; you can still add real aliases like "طلا" or "سکه" in your JSON if you want.)
const GENERIC_ALIAS = new Set(["قیمت", "price"]);

function normalizeAlias(raw: string) {
  const spaced = stripPunct(norm(String(raw))).replace(/\s+/g, " ").trim();
  if (!spaced || spaced.length < 2) return null;
  if (GENERIC_ALIAS.has(spaced)) return null;
  const compact = spaced.replace(/\s+/g, "");
  return { spaced, compact };
}

function buildAliasIndexCache(stored: Stored): AliasIndexCache {
  const exact = new Map<string, string>();
  const compact = new Map<string, string>();
  const scan: string[] = [];
  const seen = new Set<string>();

  const add = (raw: string, code: string) => {
    const n = normalizeAlias(raw);
    if (!n) return;
    if (!exact.has(n.spaced)) exact.set(n.spaced, code);
    if (n.compact && n.compact.length >= 2 && !compact.has(n.compact)) compact.set(n.compact, code);

    if (!seen.has(n.spaced)) {
      seen.add(n.spaced);
      scan.push(n.spaced);
    }
    if (n.compact && n.compact !== n.spaced && !seen.has(n.compact)) {
      seen.add(n.compact);
      scan.push(n.compact);
    }
  };

  const idx = stored.aliasIndex || {};
  // Prefer precomputed aliasIndex from JSON
  if (Object.keys(idx).length) {
    // aliasIndex is expected to be pre-normalized, but we still run normalizeAlias for safety.
    for (const [k, code] of Object.entries(idx)) {
      if (typeof k === "string" && typeof code === "string" && stored.rates[code]) add(k, code);
    }
  } else {
    // Backward compatibility: build a minimal alias index from rates (one-time per load).
    for (const code in stored.rates) {
      const r = stored.rates[code];
      add(code, code);
      add(r.fa || "", code);
      add(r.title || "", code);
      if (Array.isArray(r.aliases)) for (const a of r.aliases) add(a, code);
    }
  }

  // Always allow matching by the code itself (usd, btc, ...), even if missing in aliasIndex.
  for (const code in stored.rates) add(code, code);

  scan.sort((a, b) => b.length - a.length);
  return { exact, compact, scan };
}
// -----------------------------
// Downloader helpers
// -----------------------------

function pickCobaltUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>()]+/i);
  if (!m) return null;

  // trim common trailing punctuation when users paste links in text
  const raw = m[0].replace(/[)\]}>,.!?؟؛:]+$/g, "");

  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();

    const ok =
      h === "instagram.com" ||
      h.endsWith(".instagram.com") ||
      h === "twitter.com" ||
      h.endsWith(".twitter.com") ||
      h === "x.com" ||
      h.endsWith(".x.com") ||
      h === "t.co" ||
      h === "fxtwitter.com" ||
      h === "vxtwitter.com" ||
      h === "fixupx.com" ||
      h === "xtwitter.com";

    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

async function fetchCobalt(baseUrl: string, targetUrl: string): Promise<unknown> {
  const body = JSON.stringify({ url: targetUrl, vCodec: "h264" });

  // Some instances expose /api/json; some are already that endpoint.
  let apiRes = await fetch(baseUrl, { method: "POST", headers: COBALT_HEADERS, body });

  // fallback for instances that require /api/json
  if (!apiRes.ok && apiRes.status === 404 && !baseUrl.includes("json")) {
    const retryUrl = baseUrl.endsWith("/") ? `${baseUrl}api/json` : `${baseUrl}/api/json`;
    apiRes = await fetch(retryUrl, { method: "POST", headers: COBALT_HEADERS, body });
  }

  if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
  return apiRes.json();
}

async function handleCobaltPublicDownload(env: Env, chatId: number, targetUrl: string, replyTo?: number) {
  // show user we're working
  await fetch(`${tgBase(env)}/sendChatAction`, {
    method: "POST",
    headers: TG_JSON_HEADERS,
    body: JSON.stringify({ chat_id: chatId, action: "upload_video" }),
  }).catch(() => {});

  for (const baseUrl of COBALT_INSTANCES) {
    try {
      const data = await fetchCobalt(baseUrl, targetUrl);
      await processCobaltResponse(env, chatId, data, replyTo);
      return true;
    } catch (e: unknown) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error(`Cobalt error on instance ${baseUrl}:`, msg);
    }
  }

  await tgSend(env, chatId, "❌ سرورهای دانلود پاسخگو نیستند. لطفاً دقایقی دیگر تلاش کنید.", replyTo);
  return true;
}

type CobaltPickerItem = { type?: string; url?: string };
type CobaltResponse =
  | { status?: "error"; text?: string }
  | { status?: "stream" | "redirect"; url?: string }
  | { status?: "picker"; picker?: CobaltPickerItem[] };

async function processCobaltResponse(env: Env, chatId: number, data: unknown, replyTo?: number) {
  const d = data as CobaltResponse;

  if (d?.status === "error") throw new Error((d as any)?.text || "Cobalt Error");
  if (d?.status === "stream" || d?.status === "redirect") {
    await tgSendVideo(env, chatId, (d as any).url, "@worker093578bot ✅", replyTo);
    return;
  }
  if (d?.status === "picker" && Array.isArray((d as any).picker) && (d as any).picker.length > 0) {
    const items: CobaltPickerItem[] = (d as any).picker.slice(0, 4);
    for (const item of items) {
      if (item?.type === "video" && item.url) await tgSendVideo(env, chatId, item.url, "", replyTo);
      else if (item?.type === "photo" && item.url) await tgSendPhoto(env, chatId, item.url, "", replyTo);
    }
    return;
  }
  throw new Error("Unknown response");
}


// -----------------------------
// Twitter/X file-only downloader (no official API; no Cobalt)
// Uses public "fixer" mirrors (fixupx/vxtwitter/fxtwitter/xtwitter) to extract direct media URLs.
// Optional /twproxy endpoint is provided to help Telegram fetch media when direct hosts are blocked.
// -----------------------------

type TwitterMediaItem = { type: "video" | "photo"; url: string };

const TWITTER_FIXER_HOSTS = ["fixupx.com", "vxtwitter.com", "fxtwitter.com", "xtwitter.com"] as const;

function isTwitterLikeHost(hostname: string): boolean {
  const h = hostname.toLowerCase();
  return (
    h === "twitter.com" ||
    h.endsWith(".twitter.com") ||
    h === "x.com" ||
    h.endsWith(".x.com") ||
    h === "t.co" ||
    h === "fixupx.com" ||
    h === "vxtwitter.com" ||
    h === "fxtwitter.com" ||
    h === "xtwitter.com"
  );
}

function sleep(ms: number) {
  return new Promise<void>((r) => setTimeout(r, ms));
}

async function resolveFinalUrlMaybe(url: string): Promise<string> {
  try {
    // Some hosts block HEAD; use GET and follow redirects.
    const res = await fetch(url, {
      method: "GET",
      redirect: "follow",
      headers: {
        "User-Agent": "Mozilla/5.0",
        Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
      },
    });
    return res.url || url;
  } catch {
    return url;
  }
}

function cleanUrlFromHtml(raw: string) {
  let s = raw.trim();
  // Undo common escaping patterns
  s = s.replace(/\\u0026/g, "&").replace(/\\u003d/g, "=").replace(/\\u003f/g, "?");
  s = s.replace(/\\\//g, "/");
  s = s.replace(/&amp;/g, "&").replace(/&quot;/g, '"').replace(/&#39;/g, "'");
  // strip wrapping quotes
  s = s.replace(/^['"]+|['"]+$/g, "");
  // trim trailing punctuation sometimes pasted with links
  s = s.replace(/[)\]}>.,!?؟؛:]+$/g, "");
  return s;
}

function resolveMaybeRelative(base: string, raw: string) {
  const s = cleanUrlFromHtml(raw);
  try {
    return new URL(s, base).toString();
  } catch {
    return "";
  }
}

function extractTweetId(u: URL): string | null {
  // /{user}/status/{id} or /i/status/{id} or /status/{id}
  const parts = u.pathname.split("/").filter(Boolean);
  for (let i = 0; i < parts.length - 1; i++) {
    const p = parts[i].toLowerCase();
    if (p === "status" || p === "statuses") {
      const id = parts[i + 1] || "";
      const m = id.match(/^(\d{6,25})/);
      if (m) return m[1];
    }
  }
  const m2 = u.pathname.match(/\/i\/status\/(\d{6,25})/i);
  return m2 ? m2[1] : null;
}

function extractScreenName(u: URL): string | null {
  const parts = u.pathname.split("/").filter(Boolean);
  if (!parts.length) return null;
  // user/status/id
  const user = parts[0];
  if (user && user !== "i" && user.toLowerCase() !== "status") return user;
  return null;
}

async function fetchHtmlWithRetry(url: string, tries = 3): Promise<string> {
  let lastErr: unknown = null;
  for (let i = 0; i < tries; i++) {
    try {
      const res = await fetch(url, {
        method: "GET",
        redirect: "follow",
        headers: {
          "User-Agent":
            "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/122.0.0.0 Safari/537.36",
          Accept: "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
        },
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      await sleep(150 * (i + 1));
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch_failed");
}

function pickBestVideoUrl(urls: string[]): string {
  // Prefer direct mp4; then prefer higher "bitrate=" or "quality=" if present; else longest.
  let best = "";
  let bestScore = -1;

  for (const u of urls) {
    const low = u.toLowerCase();
    const isMp4 = /\.mp4(\?|$)/i.test(low) || low.includes("format=mp4") || low.includes("mime=video");
    let score = isMp4 ? 10_000 : 0;

    // bitrate=xxxx
    const br = low.match(/[?&]bitrate=(\d+)/);
    if (br) score += Math.min(9_999, parseInt(br[1], 10) || 0);

    // quality=hd
    if (low.includes("quality=hd")) score += 500;

    // Prefer video.twimg.com generally
    if (low.includes("video.twimg.com")) score += 1_000;

    // tie-break by length
    score += Math.min(500, u.length);

    if (score > bestScore) {
      bestScore = score;
      best = u;
    }
  }
  return best;
}

function normalizePhotoUrl(url: string): string {
  // Ask for original size where supported
  if (url.includes("name=")) return url.replace(/name=[^&]+/i, "name=orig");
  return url.includes("?") ? `${url}&name=orig` : `${url}?name=orig`;
}

function parseTwitterMediaFromHtml(html: string, baseUrl: string): TwitterMediaItem[] {
  const found = new Map<string, "video" | "photo">();

  const add = (type: "video" | "photo", raw: string) => {
    const abs = resolveMaybeRelative(baseUrl, raw);
    if (!abs) return;
    const u = cleanUrlFromHtml(abs);
    if (!u) return;
    if (!found.has(u)) found.set(u, type);
  };

  // 1) meta tags: grab anything with content=URL and (name/property) containing "video"/"image"/"player"
  const metaTagRe = /<meta\s+[^>]*>/gi;
  const keyRe = /\b(?:property|name)=["']([^"']+)["']/i;
  const contentRe = /\bcontent=(?:"([^"]+)"|'([^']+)'|([^\s>]+))/i;

  let mm: RegExpExecArray | null;
  while ((mm = metaTagRe.exec(html)) !== null) {
    const tag = mm[0];
    const contM = contentRe.exec(tag);
    if (!contM) continue;
    const raw = (contM[1] ?? contM[2] ?? contM[3] ?? "").trim();
    if (!raw) continue;

    const key = (keyRe.exec(tag)?.[1] ?? "").toLowerCase();
    if (key.includes("image")) add("photo", raw);
    else if (key.includes("video") || key.includes("player") || key.includes("stream")) add("video", raw);
  }

  // 2) direct media URLs present in HTML
  const reVideoTwimg = /https?:\/\/video\.twimg\.com\/[^\s"'<>\\]+/gi;
  const rePhotoTwimg = /https?:\/\/pbs\.twimg\.com\/[^\s"'<>\\]+/gi;
  // mp4 direct OR mp4 via query like ?format=mp4
  const reAnyMp4Like =
    /https?:\/\/[^\s"'<>\\]+(?:\.mp4(?:\?[^\s"'<>\\]*)?|\?[^\s"'<>\\]*(?:format=mp4|mime=video%2Fmp4|mime=video\/mp4)[^\s"'<>\\]*)/gi;

  for (const m of html.match(reVideoTwimg) || []) add("video", m);
  for (const m of html.match(reAnyMp4Like) || []) add("video", m);
  for (const m of html.match(rePhotoTwimg) || []) add("photo", m);

  // 3) escaped URLs inside JSON (common on fixer pages)
  const reEscAnyMp4Like =
    /https?:\\\/\\\/[^"'\s<>\\]+(?:\.mp4(?:\\\?[^"'\s<>\\]*)?|\\\?[^"'\s<>\\]*(?:format=mp4|mime=video%2Fmp4|mime=video%2Fmp4)[^"'\s<>\\]*)/gi;
  for (const em of html.match(reEscAnyMp4Like) || []) add("video", em.replace(/\\\//g, "/"));

  const reEscPhotoTwimg = /https?:\\\/\\\/pbs\.twimg\.com\\\/[^"'\s<>\\]+/gi;
  for (const em of html.match(reEscPhotoTwimg) || []) add("photo", em.replace(/\\\//g, "/"));

  // 4) attributes (src/href/content)
  const attrRe = /\b(?:src|href|content)=["']([^"']+)["']/gi;
  let am: RegExpExecArray | null;
  while ((am = attrRe.exec(html)) !== null) {
    const v = am[1] || "";
    if (!v) continue;
    const low = v.toLowerCase();
    if (low.includes("video.twimg.com") || low.includes(".mp4") || low.includes("format=mp4") || low.includes("mime=video")) add("video", v);
    else if (low.includes("pbs.twimg.com") || low.match(/\.(jpg|jpeg|png|webp)(\?|$)/i)) add("photo", v);
  }

  // Build output with stable ordering: video(s) first, then photos
  const videos: string[] = [];
  const photos: string[] = [];

  for (const [u, t] of found.entries()) {
    if (t === "video") videos.push(u);
    else photos.push(u);
  }

  const out: TwitterMediaItem[] = [];
  if (videos.length) out.push({ type: "video", url: pickBestVideoUrl(videos) });
  for (const p of photos.slice(0, 10)) out.push({ type: "photo", url: normalizePhotoUrl(p) });

  return out;
}

async function extractTwitterMediaViaFixers(inputUrl: string): Promise<TwitterMediaItem[]> {
  let url = inputUrl;

  // Resolve t.co shorteners first
  try {
    const u0 = new URL(url);
    if (u0.hostname.toLowerCase() === "t.co") url = await resolveFinalUrlMaybe(url);
  } catch {
    // ignore
  }

  const u = new URL(url);
  const tweetId = extractTweetId(u);
  const screen = extractScreenName(u);
  const inHost = u.hostname.toLowerCase();

  const candidates: string[] = [];
  const addCandidate = (x: string) => {
    if (!x) return;
    if (!candidates.includes(x)) candidates.push(x);
  };

  // If user already sent a fixer link, try it first.
  if ((TWITTER_FIXER_HOSTS as readonly string[]).includes(inHost)) addCandidate(url);

  if (tweetId) {
    for (const host of TWITTER_FIXER_HOSTS) {
      if (screen) addCandidate(`https://${host}/${screen}/status/${tweetId}`);
      addCandidate(`https://${host}/i/status/${tweetId}`);
      addCandidate(`https://${host}/status/${tweetId}`);
    }
  } else {
    addCandidate(url);
  }

  for (const c of candidates) {
    try {
      const html = await fetchHtmlWithRetry(c, 3);
      const items = parseTwitterMediaFromHtml(html, c);
      if (!items.length) continue;
      // If we got a "video" but it's not direct, try resolving once.
      const vid = items.find((x) => x.type === "video");
      if (vid) {
        const low = vid.url.toLowerCase();
        const needsResolve =
          low.includes("/download") ||
          low.includes("dl=1") ||
          low.includes("download=") ||
          (!low.includes("video.twimg.com") && !/\.mp4(\?|$)/i.test(low) && !low.includes("format=mp4") && !low.includes("mime=video"));
        if (needsResolve) vid.url = await resolveFinalUrlMaybe(vid.url);
      }
      return items;
    } catch (e) {
      const msg = e instanceof Error ? e.message : String(e);
      console.error("Twitter fixer fetch failed:", c, msg);
    }
  }
  return [];
}

function isProxyAllowedMedia(u: URL): boolean {
  const h = u.hostname.toLowerCase();
  if (h === "video.twimg.com" || h === "pbs.twimg.com") return true;
  if ((TWITTER_FIXER_HOSTS as readonly string[]).includes(h)) {
    const full = `${u.pathname}${u.search}`.toLowerCase();
    return full.includes(".mp4") || full.includes("format=mp4") || full.includes("mime=video");
  }
  return false;
}

async function handleTwitterProxy(req: Request): Promise<Response> {
  const url = new URL(req.url);
  const raw = url.searchParams.get("u") || "";
  if (!raw) return new Response("missing u", { status: 400 });

  let target: URL;
  try {
    target = new URL(raw);
  } catch {
    try {
      target = new URL(decodeURIComponent(raw));
    } catch {
      return new Response("bad u", { status: 400 });
    }
  }

  if (target.protocol !== "http:" && target.protocol !== "https:") return new Response("bad scheme", { status: 400 });
  if (!isProxyAllowedMedia(target)) return new Response("forbidden", { status: 403 });

  const method = req.method === "HEAD" ? "HEAD" : "GET";
  const headers: Record<string, string> = {
    "User-Agent": "Mozilla/5.0",
    Accept: "*/*",
    Referer: "https://twitter.com/",
  };
  const range = req.headers.get("Range");
  if (range) headers.Range = range;

  const res = await fetch(target.toString(), { method, headers, redirect: "follow" });

  const outHeaders = new Headers();
  for (const k of ["content-type", "content-length", "accept-ranges", "content-range", "etag", "last-modified", "cache-control"]) {
    const v = res.headers.get(k);
    if (v) outHeaders.set(k, v);
  }
  // Help Telegram/CDNs cache a bit (safe for immutable twimg URLs)
  if (!outHeaders.get("cache-control")) outHeaders.set("cache-control", "public, max-age=86400");

  return new Response(method === "HEAD" ? null : res.body, { status: res.status, headers: outHeaders });
}

async function tgTrySendVideoUrl(env: Env, chatId: number, videoUrl: string, caption: string, replyTo?: number) {
  const body: Record<string, unknown> = { chat_id: chatId, video: videoUrl, caption, parse_mode: TG_PARSE_MODE, supports_streaming: true };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  const res = await fetch(`${tgBase(env)}/sendVideo`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(body) });
  if (!res.ok) console.error("TG sendVideo failed:", await res.text());
  return res.ok;
}

async function tgTrySendPhotoUrl(env: Env, chatId: number, photoUrl: string, caption: string, replyTo?: number) {
  const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  const res = await fetch(`${tgBase(env)}/sendPhoto`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(body) });
  if (!res.ok) console.error("TG sendPhoto failed:", await res.text());
  return res.ok;
}

async function tgTrySendDocumentUrl(env: Env, chatId: number, docUrl: string, caption: string, replyTo?: number) {
  const body: Record<string, unknown> = { chat_id: chatId, document: docUrl, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  const res = await fetch(`${tgBase(env)}/sendDocument`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(body) });
  if (!res.ok) console.error("TG sendDocument failed:", await res.text());
  return res.ok;
}

async function handleTwitterDirectFileDownload(env: Env, chatId: number, targetUrl: string, origin: string, replyTo?: number) {
  await fetch(`${tgBase(env)}/sendChatAction`, {
    method: "POST",
    headers: TG_JSON_HEADERS,
    body: JSON.stringify({ chat_id: chatId, action: "upload_video" }),
  }).catch(() => {});

  const items = await extractTwitterMediaViaFixers(targetUrl);

  if (!items.length) {
    await tgSend(
      env,
      chatId,
      "❌ نتونستم فایل مدیا رو پیدا کنم یا لینک محدود شده.\nاگر می‌تونی لینک همون توییت رو با vxtwitter.com یا fixupx.com یا xtwitter.com باز کن و لینک همون صفحه رو بفرست.",
      replyTo,
    );
    return true;
  }

  const video = items.find((x) => x.type === "video");
  const photos = items.filter((x) => x.type === "photo").map((x) => x.url);

  const cap = `@${BOT_USERNAME} ✅`;

  if (video) {
    let vurl = video.url;
    // One more resolve if needed
    const low = vurl.toLowerCase();
    const needsResolve =
      low.includes("/download") ||
      low.includes("dl=1") ||
      low.includes("download=") ||
      (!low.includes("video.twimg.com") && !/\.mp4(\?|$)/i.test(low) && !low.includes("format=mp4") && !low.includes("mime=video"));
    if (needsResolve) vurl = await resolveFinalUrlMaybe(vurl);

    // If it's still not a direct video URL, try a second-hop HTML parse (some fixer pages link to an intermediate player URL).
    const low2 = vurl.toLowerCase();
    const stillNotDirect =
      !low2.includes("video.twimg.com") &&
      !/\.mp4(\?|$)/i.test(low2) &&
      !low2.includes("format=mp4") &&
      !low2.includes("mime=video");
    if (stillNotDirect) {
      try {
        const html2 = await fetchHtmlWithRetry(vurl, 2);
        const more = parseTwitterMediaFromHtml(html2, vurl);
        const v2 = more.find((x) => x.type === "video");
        if (v2) vurl = v2.url;
      } catch {
        // ignore
      }
    }

    // Try direct first
    let ok = await tgTrySendVideoUrl(env, chatId, vurl, cap, replyTo);

    // If Telegram can't fetch it directly, try proxy through this Worker
    if (!ok) {
      try {
        const pu = new URL(vurl);
        if (isProxyAllowedMedia(pu)) {
          const proxyUrl = `${origin}/twproxy?u=${encodeURIComponent(vurl)}`;
          ok = await tgTrySendVideoUrl(env, chatId, proxyUrl, cap, replyTo);
          if (!ok) ok = await tgTrySendDocumentUrl(env, chatId, proxyUrl, cap, replyTo);
        }
      } catch {
        // ignore
      }
    }

    if (!ok) await tgSend(env, chatId, "❌ تلگرام نتونست این ویدیو رو دریافت کنه.", replyTo);

    // Optionally send photos after the main video (quietly)
    for (const p of photos.slice(0, 6)) {
      let sent = await tgTrySendPhotoUrl(env, chatId, p, "", replyTo);
      if (!sent) {
        try {
          const pu = new URL(p);
          if (isProxyAllowedMedia(pu)) sent = await tgTrySendPhotoUrl(env, chatId, `${origin}/twproxy?u=${encodeURIComponent(p)}`, "", replyTo);
        } catch {
          // ignore
        }
      }
      if (!sent) break;
    }

    return true;
  }

  // No video; send photos as files
  if (photos.length) {
    let first = true;
    for (const p of photos.slice(0, 10)) {
      const caption = first ? cap : "";
      first = false;

      let ok = await tgTrySendPhotoUrl(env, chatId, p, caption, replyTo);
      if (!ok) {
        try {
          const pu = new URL(p);
          if (isProxyAllowedMedia(pu)) ok = await tgTrySendPhotoUrl(env, chatId, `${origin}/twproxy?u=${encodeURIComponent(p)}`, caption, replyTo);
          if (!ok) ok = await tgTrySendDocumentUrl(env, chatId, `${origin}/twproxy?u=${encodeURIComponent(p)}`, caption, replyTo);
        } catch {
          // ignore
        }
      }
    }
    return true;
  }

  await tgSend(env, chatId, "❌ این پست مدیای قابل دانلود پیدا نشد.", replyTo);
  return true;
}


// -----------------------------
// Rate fetching and storage
// -----------------------------

function parseNumberLoose(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const s = v.trim();
  if (!s) return null;
  const n = Number(s.replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
}

type FetchRawResult =
  | { kind: "not_modified" }
  | { kind: "ok"; rawText: string; etag?: string | null };

async function fetchPricesRaw(): Promise<string> {
  const headers: Record<string, string> = { "User-Agent": "Mozilla/5.0" };

  const res = await fetch(PRICES_JSON_URL, {
    headers,
    // enable Cloudflare fetch caching as an extra layer
    cf: { cacheEverything: true, cacheTtl: PRICES_CACHE_TTL_SECONDS },
  } as RequestInit & { cf?: unknown });

  if (!res.ok) throw new Error(`Failed to fetch rates_v2_latest: HTTP ${res.status}`);
  return await res.text();
}

function validateStored(stored: Stored): string | null {
  if (!stored || typeof stored !== "object") return "stored is not an object";
  if (!Number.isFinite(stored.fetchedAtMs) || stored.fetchedAtMs <= 0) return "invalid fetchedAtMs";
  if (!stored.rates || typeof stored.rates !== "object") return "invalid rates";
  const keys = Object.keys(stored.rates);
  if (keys.length < 10) return "rates too small";

  if (!stored.lists || typeof stored.lists !== "object") return "missing lists";
  if (!Array.isArray(stored.lists.fiat) || !Array.isArray(stored.lists.crypto)) return "invalid lists";
  if (stored.lists.fiat.length === 0) return "lists.fiat empty";
  if (stored.lists.crypto.length === 0) return "lists.crypto empty";

  // quick integrity checks (best-effort)
  for (const c of stored.lists.fiat) if (typeof c !== "string" || !stored.rates[c]) return "lists.fiat contains unknown code";
  for (const c of stored.lists.crypto) if (typeof c !== "string" || !stored.rates[c]) return "lists.crypto contains unknown code";

  // aliasIndex is optional for backward compatibility; Worker will build a fallback if missing.
  if (!stored.aliasIndex || typeof stored.aliasIndex !== "object") stored.aliasIndex = {};

  return null;
}

function buildStoredFromRaw(rawText: string): Stored {
  const parsed = JSON.parse(rawText) as unknown;

  const isRecord = (v: unknown): v is Record<string, unknown> => typeof v === "object" && v !== null && !Array.isArray(v);

  if (!isRecord(parsed) || !isRecord((parsed as any).rates)) {
    throw new Error("invalid_prices_payload");
  }

  const p = parsed as Record<string, unknown>;
  const ratesIn = p.rates as Record<string, unknown>;

  const fetchedAtMsRaw = p.fetchedAtMs;
  const fetchedAtMs =
    typeof fetchedAtMsRaw === "number" && Number.isFinite(fetchedAtMsRaw) && fetchedAtMsRaw > 0 ? fetchedAtMsRaw : Date.now();

  const source = typeof p.source === "string" && p.source ? (p.source as string) : PRICES_JSON_URL;
  const timestamp = typeof p.timestamp === "string" ? (p.timestamp as string) : undefined;

  const aliasIndexIn = isRecord(p.aliasIndex) ? (p.aliasIndex as Record<string, unknown>) : null;
  const listsIn = isRecord(p.lists) ? (p.lists as Record<string, unknown>) : null;

  const aliasIndex: Record<string, string> = {};
  if (aliasIndexIn) {
    for (const [k, v] of Object.entries(aliasIndexIn)) {
      if (typeof k === "string" && typeof v === "string") aliasIndex[k] = v;
    }
  }

  const lists: { fiat: string[]; crypto: string[] } = { fiat: [], crypto: [] };
  if (listsIn) {
    const fiat = (listsIn.fiat as unknown);
    const crypto = (listsIn.crypto as unknown);
    if (Array.isArray(fiat)) lists.fiat = fiat.filter((x) => typeof x === "string") as string[];
    if (Array.isArray(crypto)) lists.crypto = crypto.filter((x) => typeof x === "string") as string[];
  }

  const rates: Record<string, Rate> = {};

  for (const [code, r0] of Object.entries(ratesIn)) {
    if (!isRecord(r0)) continue;

    const kind = r0.kind;
    if (kind !== "currency" && kind !== "gold" && kind !== "crypto") continue;

    const priceNum = parseNumberLoose(r0.price);
    if (priceNum == null) continue;

    const unitNum = parseNumberLoose(r0.unit);
    const unit = unitNum != null && Number.isFinite(unitNum) && unitNum >= 1 ? Math.trunc(unitNum) : 1;

    const meta = kind === "crypto" ? CRYPTO_META[code] : META[code];

    const titleRaw = typeof r0.title === "string" ? (r0.title as string) : "";
    const faRaw = typeof r0.fa === "string" ? (r0.fa as string) : "";
    const emojiRaw = typeof r0.emoji === "string" ? (r0.emoji as string) : "";

    const fa = faRaw || meta?.fa || code;
    const emoji = emojiRaw || meta?.emoji || "";
    const title = titleRaw || fa;

    const rate: Rate = { kind: kind as Rate["kind"], price: priceNum, unit, fa, title, emoji };

    const usdPrice = parseNumberLoose(r0.usdPrice);
    if (usdPrice != null) rate.usdPrice = usdPrice;

    const change24h = parseNumberLoose(r0.change24h);
    if (change24h != null) rate.change24h = change24h;

    const aliases = r0.aliases;
    if (Array.isArray(aliases)) {
      const cleaned = aliases.filter((x) => typeof x === "string" && x.trim()).map((x) => (x as string).trim());
      if (cleaned.length) rate.aliases = cleaned;
    }

    const inputMode = r0.inputMode;
    if (inputMode === "native" || inputMode === "pack") rate.inputMode = inputMode;

    rates[code] = rate;
  }

  // If lists were not provided (or incomplete), compute them from rates (backward compatible).
  if (!lists.fiat.length || !lists.crypto.length) {
    const fallback = computeDefaultListsFromRates(rates);
    if (!lists.fiat.length) lists.fiat = fallback.fiat;
    if (!lists.crypto.length) lists.crypto = fallback.crypto;
  }

  const stored: Stored = { fetchedAtMs, source, rates, aliasIndex, lists };
  if (timestamp) stored.timestamp = timestamp;

  return stored;
}



async function refreshRates(
  ctx?: ExecutionContext
): Promise<{ ok: true; changed: boolean; count: number; fetchedAtMs: number } | { ok: false; error: string }> {
  const prevFetchedAtMs = RUNTIME_RATES_CACHE?.stored?.fetchedAtMs ?? 0;

  try {
    const rawText = await fetchPricesRaw();
    const stored = buildStoredFromRaw(rawText);

    const validationError = validateStored(stored);
    if (validationError) throw new Error(`validation_failed:${validationError}`);

    // Update caches.default for all subsequent requests (per PoP).
    const cacheRes = new Response(rawText, {
      headers: {
        "Content-Type": "application/json; charset=utf-8",
        "Cache-Control": `public, max-age=${PRICES_CACHE_TTL_SECONDS}`,
      },
    });
    // Best-effort; if it fails we still keep in-memory cache.
    await caches.default.put(PRICES_CACHE_KEY, cacheRes.clone()).catch(() => {});

    // Update in-isolate cache immediately.
    RUNTIME_RATES_CACHE = { stored, alias: buildAliasIndexCache(stored), loadedAtMs: Date.now() };

    const changed = stored.fetchedAtMs !== prevFetchedAtMs;
    const count = Object.keys(stored.rates).length;

    return { ok: true, changed, count, fetchedAtMs: stored.fetchedAtMs };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    // keep last good cache if refresh fails
    ctx?.waitUntil?.(Promise.resolve());
    return { ok: false, error: msg };
  }
}


async function getStoredOrRefresh(env: Env, ctx: ExecutionContext): Promise<Stored> {
  const now = Date.now();

  // In-isolate memory cache: reduces JSON.parse and cache reads.
  const cached = RUNTIME_RATES_CACHE;
  if (cached && now - cached.loadedAtMs <= RATES_CACHE_TTL_MS) {
    if (now - cached.stored.fetchedAtMs > STALE_REFRESH_MS) ctx.waitUntil(refreshRates(ctx).catch(() => {}));
    return cached.stored;
  }

  // caches.default (per PoP)
  const hit = await caches.default.match(PRICES_CACHE_KEY);
  if (hit) {
    const rawText = await hit.text();
    const stored = buildStoredFromRaw(rawText);
    const validationError = validateStored(stored);
    if (!validationError) {
      if (now - stored.fetchedAtMs > STALE_REFRESH_MS) ctx.waitUntil(refreshRates(ctx).catch(() => {}));
      RUNTIME_RATES_CACHE = { stored, alias: buildAliasIndexCache(stored), loadedAtMs: now };
      return stored;
    }
  }

  // Cold start: fetch + populate cache
  const res = await refreshRates(ctx);
  if (res.ok) {
    const c = RUNTIME_RATES_CACHE;
    if (c) return c.stored;
  }

  // Last resort: try direct fetch without caching
  const rawText = await fetchPricesRaw();
  const stored = buildStoredFromRaw(rawText);
  RUNTIME_RATES_CACHE = { stored, alias: buildAliasIndexCache(stored), loadedAtMs: now };
  return stored;
}



function parsePersianNumber(tokens: string[]): number | null {
  const ones: Record<string, number> = {
    یک: 1,
    یه: 1,
    دو: 2,
    سه: 3,
    چهار: 4,
    پنج: 5,
    شش: 6,
    شیش: 6,
    هفت: 7,
    هشت: 8,
    نه: 9,
  };
  const teens: Record<string, number> = {
    ده: 10,
    یازده: 11,
    دوازده: 12,
    سیزده: 13,
    چهارده: 14,
    پانزده: 15,
    شانزده: 16,
    هفده: 17,
    هجده: 18,
    نوزده: 19,
  };
  const tens: Record<string, number> = {
    بیست: 20,
    سی: 30,
    چهل: 40,
    پنجاه: 50,
    شصت: 60,
    هفتاد: 70,
    هشتاد: 80,
    نود: 90,
  };
  const hundreds: Record<string, number> = {
    صد: 100,
    یکصد: 100,
    دویست: 200,
    سیصد: 300,
    چهارصد: 400,
    پانصد: 500,
    ششصد: 600,
    شیشصد: 600,
    هفتصد: 700,
    هشتصد: 800,
    نهصد: 900,
  };
  const scales: Record<string, number> = {
    هزار: 1e3,
    میلیون: 1e6,
    ملیون: 1e6,
    میلیارد: 1e9,
    بیلیون: 1e9,
    تریلیون: 1e12,
  };

  const t = tokens
    .map((x) => x.trim())
    .filter((x) => x && x !== "و");
  if (t.length === 0) return null;

  let total = 0;
  let current = 0;

  const addSmall = (w: string) => {
    if (hundreds[w] != null) {
      current += hundreds[w];
      return true;
    }
    if (teens[w] != null) {
      current += teens[w];
      return true;
    }
    if (tens[w] != null) {
      current += tens[w];
      return true;
    }
    if (ones[w] != null) {
      current += ones[w];
      return true;
    }
    if (w === "صد") {
      current = (current || 1) * 100;
      return true;
    }
    return false;
  };

  for (const w of t) {
    if (scales[w] != null) {
      const scale = scales[w];
      const base = current || 1;
      total += base * scale;
      current = 0;
      continue;
    }
    if (!addSmall(w)) return null;
  }

  total += current;
  return total > 0 ? total : null;
}

function parseDigitsWithScale(text: string): number | null {
  const t = normalizeDigits(text);
  const m = t.match(/(\d+(?:\.\d+)?)(?:\s*(هزار|میلیون|ملیون|میلیارد|بیلیون|تریلیون|k|m|b))?/i);
  if (!m) return null;
  const num = Number(m[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  const suf = (m[2] || "").toLowerCase();
  const mul =
    suf === "هزار" || suf === "k"
      ? 1e3
      : suf === "میلیون" || suf === "ملیون" || suf === "m"
        ? 1e6
        : suf === "میلیارد" || suf === "بیلیون" || suf === "b"
          ? 1e9
          : suf === "تریلیون"
            ? 1e12
            : 1;
  return num * mul;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasBounded(haystack: string, needle: string) {
  if (!needle) return false;
  const re = new RegExp(`(?<![\\p{L}])${escapeRegExp(needle)}(?![\\p{L}])`, "iu");
  return re.test(haystack);
}

function findCode(textNorm: string, rates: Record<string, Rate>, alias?: AliasIndexCache) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  // 1) exact/compact full-string matches (fast path)
  if (alias) {
    const direct = alias.exact.get(cleaned) ?? alias.compact.get(compact);
    if (direct && rates[direct]) return direct;
  }

  // 2) bounded scan inside the sentence (works for inputs like "100 دلار" and "دلار100")
  if (alias) {
    for (const needle of alias.scan) {
      if (needle.length < 2) continue;
      // Check both spaced and compact haystacks; this supports inputs like "100دلار" / "دلار100".
      if (hasBounded(cleaned, needle) || hasBounded(compact, needle)) {
        const code = alias.exact.get(needle) ?? alias.compact.get(needle);
        if (code && rates[code]) return code;
      }
    }
  }

  // 3) plain code match anywhere (usd, btc, ...)
  const m = cleaned.match(/\b([a-z]{3,10})\b/i);
  if (m) {
    const candidate = m[1].toLowerCase();
    if (rates[candidate]) return candidate;
  }

  return null;
}


function extractAmountOrNull(textNorm: string): number | null {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const digitScaled = parseDigitsWithScale(cleaned);
  if (digitScaled != null && digitScaled > 0) return digitScaled;

  const tokens = cleaned.split(" ").filter(Boolean);
  const maxWin = Math.min(tokens.length, 10);
  for (let w = maxWin; w >= 1; w--) {
    for (let i = 0; i + w <= tokens.length; i++) {
      const n = parsePersianNumber(tokens.slice(i, i + w));
      if (n != null && n > 0) return n;
    }
  }
  return null;
}

const parseCache = new Map<string, { ts: number; code: string | null; amount: number; hasAmount: boolean }>();
const userContext = new Map<number, { ts: number; code: string }>();

const AMOUNT_ONLY_WORDS = new Set([
  "و",
  // ones
  "یک","یه","دو","سه","چهار","پنج","شش","شیش","هفت","هشت","نه",
  // teens
  "ده","یازده","دوازده","سیزده","چهارده","پانزده","شانزده","هفده","هجده","نوزده",
  // tens
  "بیست","سی","چهل","پنجاه","شصت","هفتاد","هشتاد","نود",
  // hundreds
  "صد","یکصد","دویست","سیصد","چهارصد","پانصد","ششصد","شیشصد","هفتصد","هشتصد","نهصد",
  // scales
  "هزار","میلیون","ملیون","میلیارد","بیلیون","تریلیون",
  // latin scales
  "k","m","b",
]);

function isAmountOnlyQuery(textNorm: string): boolean {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  if (!cleaned) return false;
  const tokens = cleaned.split(" ").filter(Boolean);
  for (const tok0 of tokens) {
    const tok = tok0.toLowerCase();
    if (AMOUNT_ONLY_WORDS.has(tok)) continue;

    const t = tok.replace(/,/g, "");
    // pure digits (or decimal)
    if (/^\d+(?:\.\d+)?$/.test(t)) continue;

    // digits + scale suffix without space (e.g. 100k, 2.5m)
    if (/^\d+(?:\.\d+)?(?:k|m|b)$/.test(t)) continue;

    // digits + Persian scale without space (e.g. 100هزار)
    if (/^\d+(?:\.\d+)?(?:هزار|میلیون|ملیون|میلیارد|بیلیون|تریلیون)$/.test(t)) continue;

    // Any other token means user likely typed a currency/keyword; do NOT reuse context.
    return false;
  }
  return true;
}


function pruneParseCache(now: number) {
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  const keys: string[] = [];
  for (const [k, v] of parseCache) {
    if (now - v.ts > PARSE_TTL_MS) keys.push(k);
  }
  for (const k of keys) parseCache.delete(k);
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  let i = 0;
  for (const k of parseCache.keys()) {
    parseCache.delete(k);
    i++;
    if (parseCache.size <= PARSE_CACHE_MAX) break;
    if (i > PARSE_CACHE_MAX) break;
  }
}

function getParsedIntent(userId: number, textNorm: string, rates: Record<string, Rate>, alias?: AliasIndexCache) {
  const now = Date.now();
  pruneParseCache(now);
  const cacheKey = `${userId}:${textNorm}`;
  const cached = parseCache.get(cacheKey);
  if (cached && now - cached.ts <= PARSE_TTL_MS) return cached;

  let code = findCode(textNorm, rates, alias);
  const amountOrNull = extractAmountOrNull(textNorm);
  const hasAmount = amountOrNull != null;
  const amount = amountOrNull ?? 1;

  if (!code) {
    const ctx = userContext.get(userId);
    if (ctx && now - ctx.ts <= CONTEXT_TTL_MS && hasAmount && isAmountOnlyQuery(textNorm)) code = ctx.code;
  }

  if (code) userContext.set(userId, { ts: now, code });

  const out = { ts: now, code: code ?? null, amount, hasAmount };
  parseCache.set(cacheKey, out);
  return out;
}

function normalizeCommand(textNorm: string) {
  const t = stripPunct(textNorm).trim();
  const first = t.split(/\s+/)[0] || "";
  return first.split("@")[0];
}

// -----------------------------
// Telegram API helpers
// -----------------------------

function tgBase(env: Env) {
  return `https://api.telegram.org/bot${env.TG_TOKEN}`;
}

async function tgCall(env: Env, method: string, body: unknown) {
  // Intentionally no retries here: Telegram send* methods are not idempotent.
  await fetch(`${tgBase(env)}/${method}`, {
    method: "POST",
    headers: TG_JSON_HEADERS,
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function tgSend(env: Env, chatId: number, text: string, replyTo?: number, replyMarkup?: unknown) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    text,
    parse_mode: TG_PARSE_MODE,
    disable_web_page_preview: true,
  };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  if (replyMarkup) body.reply_markup = replyMarkup;
  await tgCall(env, "sendMessage", body);
}

async function tgEditMessage(env: Env, chatId: number | undefined, messageId: number | undefined, text: string, replyMarkup?: unknown) {
  const body: Record<string, unknown> = {
    chat_id: chatId,
    message_id: messageId,
    text,
    parse_mode: TG_PARSE_MODE,
    disable_web_page_preview: true,
  };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await tgCall(env, "editMessageText", body);
}

async function tgAnswerCallback(env: Env, callbackQueryId: string, text?: string) {
  const body: Record<string, unknown> = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  await tgCall(env, "answerCallbackQuery", body);
}

async function tgSendVideo(env: Env, chatId: number, videoUrl: string | undefined, caption: string, replyTo?: number) {
  const body: Record<string, unknown> = { chat_id: chatId, video: videoUrl, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }

  const res = await fetch(`${tgBase(env)}/sendVideo`, {
    method: "POST",
    headers: TG_JSON_HEADERS,
    body: JSON.stringify(body),
  });
  if (!res.ok) console.error("TG Video Error:", await res.text());
}

async function tgSendPhoto(env: Env, chatId: number, photoUrl: string | undefined, caption: string, replyTo?: number) {
  const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  await tgCall(env, "sendPhoto", body);
}

// -----------------------------
// UI formatting and keyboards
// -----------------------------

function chunkText(s: string, maxLen = 3500) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen));
  return out;
}

function buildAll(stored: Stored) {
  const rates = stored.rates;

  const goldItems: string[] = [];
  const currencyItems: string[] = [];
  const cryptoItems: string[] = [];

  const usd = rates["usd"];
  const usdPer1 = usd ? usd.price / (usd.unit || 1) : null;

  // Fiat (gold + currency) in precomputed order
  for (const c of stored.lists.fiat || []) {
    const r = rates[c];
    if (!r || r.kind === "crypto") continue;

    const showUnit = r.kind === "currency" && (r.unit || 1) > 1;
    const baseAmount = showUnit ? (r.unit || 1) : 1;
    const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / (r.unit || 1));
    const priceStr = formatToman(baseToman);

    const meta = META[c] ?? { emoji: "💱", fa: r.title || c.toUpperCase() };
    const usdEq = usdPer1 && c !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
    const unitPrefix = showUnit ? `${baseAmount} ` : "";
    const usdPart = usdEq != null ? ` (≈ $${formatUSD(usdEq)})` : "";
    const line = `${meta.emoji} <b>${unitPrefix}${meta.fa}:</b> \u200E<code>${priceStr}</code> تومان${usdPart}`;

    if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldItems.push(line);
    else currencyItems.push(line);
  }

  // Crypto in precomputed order
  for (const c of stored.lists.crypto || []) {
    const r = rates[c];
    if (!r || r.kind !== "crypto") continue;

    const per1 = Math.round(r.price / (r.unit || 1));
    const priceStr = formatToman(per1);
    const meta = CRYPTO_META[c] ?? { emoji: r.emoji || "💎", fa: r.fa || r.title || c.toUpperCase() };

    const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
    const changePart =
      typeof r.change24h === "number" ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%` : "";
    const line = `💎 <b>${meta.fa}</b> (${c.toUpperCase()})\n└ ${priceStr} ت | ${usdP}$${changePart}`;
    cryptoItems.push(line);
  }

  const lines: string[] = [];

  if (goldItems.length > 0) {
    lines.push("🟡 <b>نرخ طلا و سکه</b>");
    lines.push("➖➖➖➖➖➖");
    lines.push(...goldItems);
    lines.push("");
  }

  if (currencyItems.length > 0) {
    lines.push("💵 <b>نرخ ارزهای بازار</b>");
    lines.push("➖➖➖➖➖➖");
    lines.push(...currencyItems);
    lines.push("");
  }

  if (cryptoItems.length > 0) {
    lines.push("🚀 <b>بازار ارز دیجیتال</b>");
    lines.push("➖➖➖➖➖➖");
    lines.push(...cryptoItems);
  }

  const date = new Date(stored.fetchedAtMs + 3.5 * 3600000);
  const timeStr = date.toISOString().substr(11, 5);
  lines.push("\n🕐 <b>بروزرسانی:</b> " + timeStr);

  return lines.join("\n");
}


const PRICE_PAGE_SIZE = 8;

type PriceCategory = "fiat" | "crypto";
type PriceListItem = {
  code: string;
  category: PriceCategory;
  emoji: string;
  name: string;
  price: string;
};

function getUpdateTimeStr(stored: Stored) {
  const date = new Date(stored.fetchedAtMs + 3.5 * 3600000);
  return date.toISOString().substr(11, 5);
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page) || page < 0) return 0;
  if (page >= totalPages) return Math.max(0, totalPages - 1);
  return page;
}

function shortColText(s: string, max = 18) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function buildPriceItems(stored: Stored, category: PriceCategory): PriceListItem[] {
  const rates = stored.rates;
  const codes = stored.lists?.[category] ?? [];

  const items: PriceListItem[] = [];
  if (category === "crypto") {
    for (const c of codes) {
      const r = rates[c];
      if (!r || r.kind !== "crypto") continue;
      const per1 = Math.round(r.price / (r.unit || 1));
      const toman = formatToman(per1);
      const meta = CRYPTO_META[c] ?? { emoji: r.emoji || "💎", fa: r.fa || r.title || c.toUpperCase() };
      items.push({
        code: c,
        category,
        emoji: meta.emoji,
        name: shortColText(meta.fa, 20),
        price: shortColText(`${toman} ت`, 16),
      });
    }
    return items;
  }

  for (const c of codes) {
    const r = rates[c];
    if (!r || r.kind === "crypto") continue;
    const showUnit = r.kind === "currency" && (r.unit || 1) > 1;
    const baseAmount = showUnit ? (r.unit || 1) : 1;
    const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / (r.unit || 1));
    const priceStr = formatToman(baseToman);
    const meta = META[c] ?? { emoji: "💱", fa: r.title || r.fa || c.toUpperCase() };
    items.push({
      code: c,
      category,
      emoji: meta.emoji,
      name: shortColText(showUnit ? `${baseAmount} ${meta.fa}` : meta.fa, 20),
      price: shortColText(`${priceStr} ت`, 16),
    });
  }
  return items;
}

function buildPricesKeyboard(category: PriceCategory, page: number, totalPages: number, items: PriceListItem[]) {
  const start = page * PRICE_PAGE_SIZE;
  const slice = items.slice(start, start + PRICE_PAGE_SIZE);

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const it of slice) {
    const cb = `show:${category}:${it.code}:${page}`;
    rows.push([
      { text: it.price, callback_data: cb },
      { text: `${it.emoji} ${it.name}`, callback_data: cb },
    ]);
  }

  const prevCb = page > 0 ? `page:${category}:${page - 1}` : "noop";
  const nextCb = page + 1 < totalPages ? `page:${category}:${page + 1}` : "noop";

  rows.push([
    { text: "بعدی ⬅️", callback_data: nextCb },
    { text: "🏠 خانه", callback_data: "start_menu" },
    { text: "➡️ قبلی", callback_data: prevCb },
  ]);

  return { inline_keyboard: rows };
}

function buildCategoryHeaderText(category: PriceCategory, page: number, totalPages: number, timeStr: string) {
  if (category === "crypto") {
    return ["🪙 <b>قیمت ارز دیجیتال</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join("\n");
  }
  return ["💱 <b>قیمت ارز و طلا</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join("\n");
}

function buildPriceDetailText(stored: Stored, category: PriceCategory, code: string) {
  const r = stored.rates?.[code];
  if (!r) return "❗️این آیتم پیدا نشد.";
  const showUnit = r.kind === "currency" && (r.unit || 1) > 1;
  const baseAmount = showUnit ? (r.unit || 1) : 1;
  const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / (r.unit || 1));
  const toman = formatToman(baseToman);

  if (category === "crypto") {
    const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
    const change = r.change24h ?? 0;
    const changeEmoji = change >= 0 ? "🟢" : "🔴";
    const changeStr = Math.abs(change).toFixed(2) + "%";

    const meta = CRYPTO_META[code] ?? { emoji: r.emoji || "💎", fa: r.fa || r.title || code.toUpperCase() };

    return [
      `${meta.emoji} <b>${meta.fa}</b> (${code.toUpperCase()})`,
      `💶 قیمت: <code>${toman}</code> تومان`,
      `💵 قیمت دلاری: <code>${usdP}</code> $`,
      `📈 تغییر 24ساعته: ${changeEmoji} <b>${changeStr}</b>`,
      "",
      `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`,
    ].join("\n");
  }

  const meta = META[code] ?? { emoji: "💱", fa: r.title || r.fa || code.toUpperCase() };
  const usd = stored.rates["usd"];
  const usdPer1 = usd ? usd.price / (usd.unit || 1) : null;
  const usdEq = usdPer1 && code !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
  const unitPrefix = showUnit ? `${baseAmount} ` : "";
  return [
    `${meta.emoji} <b>${unitPrefix}${meta.fa}</b>`,
    `💶 قیمت: <code>${toman}</code> تومان`,
    usdEq != null ? `💵 معادل دلار: <code>${formatUSD(usdEq)}</code> $` : "",
    r.unit && r.unit !== 1 ? `📦 واحد مرجع: <code>${r.unit}</code>` : "",
    "",
    `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`,
  ]
    .filter(Boolean)
    .join("\n");
}

function replyCurrency(code: string, r: Rate, amount: number, stored: Stored, hasAmount: boolean) {
  const refUnit = Math.max(1, r.unit || 1);

  // ---------- CRYPTO ----------
  if (r.kind === "crypto") {
    const qty = hasAmount ? amount : 1;
    const totalToman = (r.price / refUnit) * (qty * refUnit);

    const per1Usd = typeof r.usdPrice === "number" ? r.usdPrice : null;
    const totalUsdDirect = per1Usd ? per1Usd * qty : null;

    // Fallback USD conversion via USD/Toman if usdPrice isn't provided
    const usd = stored.rates["usd"];
    const usdPer1Toman = usd ? usd.price / (usd.unit || 1) : null;
    const totalUsd = totalUsdDirect ?? (usdPer1Toman ? totalToman / usdPer1Toman : null);

    const changeLine =
      typeof r.change24h === "number" ? `${r.change24h >= 0 ? "🟢" : "🔴"} <b>تغییر 24h:</b> ${r.change24h.toFixed(2)}%` : null;

    const titlePart = r.title && r.title !== r.fa ? ` <i>(${r.title})</i>` : "";
    const lines: string[] = [];
    lines.push(`💎 <b>${r.fa}</b>${titlePart}`);
    lines.push("➖➖➖➖➖➖");
    lines.push(`🧮 <b>تعداد:</b> <code>${qty}</code>`);
    lines.push(`💶 <b>قیمت:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان`);
    if (totalUsd != null) lines.push(`💵 <b>معادل:</b> <code>${formatUSD(totalUsd)}</code> $`);
    if (changeLine) lines.push(changeLine);
    return lines.join("\n");
  }

  // ---------- FIAT / CURRENCY ----------
  // Default behavior (backward compatible):
  // - If unit>1, treat the user's amount as "count of reference units" (pack mode).
  //   Example: unit=100 and user enters 2 => 2 × (100 IQD).
  //
  // Optional (future) data-driven override:
  // - If r.inputMode === "native", treat user's amount as base units directly.
  const inputMode = (r as unknown as { inputMode?: unknown }).inputMode;
  const qty = hasAmount ? amount : 1;

  // r.price is the price for "refUnit" base units.
  const per1Toman = r.price / refUnit;

  const baseUnits =
    inputMode === "native"
      ? qty
      : refUnit > 1
        ? qty * refUnit
        : qty;

  const totalToman = per1Toman * baseUnits;

  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / (usd.unit || 1) : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;

  // Bidi-safe pieces (numbers + emoji can get reordered in RTL)
  const LRI = "\u2066"; // left-to-right isolate
  const RLI = "\u2067"; // right-to-left isolate
  const PDI = "\u2069"; // pop directional isolate

  const meta = META[code] ?? { emoji: "💱", fa: r.fa || r.title || code.toUpperCase() };
  const titleLine = `${LRI}${qty}${PDI} ${RLI}${meta.fa}${PDI} ${LRI}${meta.emoji}${PDI}`;

  const lines: string[] = [];
  lines.push(`<b>${titleLine}</b>`);
  if (code !== "usd" && totalUsd != null) lines.push(`💵 معادل دلار: <code>${formatUSD(totalUsd)}</code> $`);
  lines.push(`💶 <code>${formatToman(Math.round(totalToman))}</code> تومان`);
  return lines.join("\n");
}

function replyGold(rGold: Rate, amount: number, stored: Stored) {
  const refUnit = Math.max(1, rGold.unit || 1);
  const qty = amount || 1;

  const perRefToman = rGold.price; // price for refUnit (usually 1)
  const per1Toman = rGold.price / refUnit;
  const totalToman = per1Toman * (qty * refUnit);

  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / (usd.unit || 1) : null;

  const perRefUsd = usdPer1Toman ? perRefToman / usdPer1Toman : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;

  const unitLabel = refUnit > 1 ? `${refUnit} ${rGold.fa}` : `${rGold.fa}`;

  const lines: string[] = [];
  lines.push(`🟡 <b>${rGold.fa}</b>`);
  lines.push("➖➖➖➖➖➖");
  lines.push(`🧾 <b>واحد:</b> <code>${unitLabel}</code>`);
  lines.push(
    `💶 <b>قیمت واحد:</b> <code>${formatToman(Math.round(perRefToman))}</code> تومان${
      perRefUsd != null ? ` (≈ <code>${formatUSD(perRefUsd)}</code> $)` : ""
    }`,
  );
  lines.push(`🧮 <b>تعداد:</b> <code>${qty}</code>`);
  lines.push(
    `✅ <b>جمع کل:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان${totalUsd != null ? ` (≈ <code>${formatUSD(totalUsd)}</code> $)` : ""}`,
  );
  return lines.join("\n");
}

const START_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` },
      { text: "📘 راهنما", callback_data: "help_menu" },
    ],
    [{ text: "💱 قیمت ارز و طلا", callback_data: "cat:fiat" }],
    [{ text: "🪙 قیمت ارز دیجیتال", callback_data: "cat:crypto" }],
  ],
};

const HELP_KEYBOARD = {
  inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start_menu" }]],
};

function getHelpMessage() {
  return `<b>🤖 راهنمای استفاده از ربات:</b>

1️⃣ <b>قیمت ارز:</b> نام ارز را بفرستید (دلار، یورو، افغانی).
2️⃣ <b>کریپتو:</b> نام ارز دیجیتال را بفرستید (بیت کوین، اتریوم، BTC، TON).
3️⃣ <b>تبدیل:</b> مقدار + نام ارز (مثلاً: ۱۰۰ دلار، 0.5 بیت کوین).
4️⃣ <b>طلا و سکه:</b> کلمه «طلا»، «سکه» یا «مثقال» را بفرستید.
5️⃣ <b>دانلود اینستاگرام:</b> لینک پست را بفرستید.

🔸 قیمت‌های کریپتو هم به دلار و هم به تومان محاسبه می‌شوند.
🔸 نرخ تتر/دلار از بازار آزاد گرفته می‌شود.`;
}

// -----------------------------
// Request parsing
// -----------------------------

async function safeJson<T>(req: Request): Promise<T | null> {
  try {
    return (await req.json()) as T;
  } catch {
    return null;
  }
}

// -----------------------------
// Worker entry
// -----------------------------

export default {
  async scheduled(_event: ScheduledEvent, _env: Env, ctx: ExecutionContext) {
    await refreshRates(ctx).catch(() => {});
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    const origin = url.origin;
    if (url.pathname === "/health") return new Response("ok");

    if (url.pathname === "/refresh") {
      const key = url.searchParams.get("key") || "";
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response("Unauthorized", { status: 401 });
      try {
        const r = await refreshRates(ctx);
        return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
      } catch (e: unknown) {
        const msg = e instanceof Error ? e.message : String(e);
        return new Response(JSON.stringify({ ok: false, error: msg }), {
          headers: { "content-type": "application/json" },
          status: 502,
        });
      }
    }

    if (url.pathname === "/twproxy" && (req.method === "GET" || req.method === "HEAD")) {
      return await handleTwitterProxy(req);
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await safeJson<TgUpdate>(req);
    if (update?.edited_message) return new Response("ok");

    // -------- callback query handler --------
    if (update?.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      if (data === "help_menu") {
        await tgEditMessage(env, chatId, messageId, getHelpMessage(), HELP_KEYBOARD);
      } else if (data === "start_menu") {
        await tgEditMessage(env, chatId, messageId, "👋 سلام! به ربات خوش آمدید.\nچه کاری می‌توانم برایتان انجام دهم؟", START_KEYBOARD);
      } else if (data === "noop") {
        await tgAnswerCallback(env, cb.id);
        return new Response("ok");
      } else if (data?.startsWith("cat:")) {
        const category = data.split(":")[1] as PriceCategory;
        await tgAnswerCallback(env, cb.id, "در حال دریافت قیمت‌ها...");
        const stored = await getStoredOrRefresh(env, ctx);
        const items = buildPriceItems(stored, category);
        const totalPages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
        const page = 0;
        const timeStr = getUpdateTimeStr(stored);
        const text = buildCategoryHeaderText(category, page, totalPages, timeStr);
        const kb = buildPricesKeyboard(category, page, totalPages, items);
        await tgEditMessage(env, chatId, messageId, text, kb);
        return new Response("ok");
      } else if (data?.startsWith("page:")) {
        const parts = data.split(":");
        const category = parts[1] as PriceCategory;
        const pageReq = parseInt(parts[2] || "0", 10) || 0;
        await tgAnswerCallback(env, cb.id);
        const stored = await getStoredOrRefresh(env, ctx);
        const items = buildPriceItems(stored, category);
        const totalPages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
        const page = clampPage(pageReq, totalPages);
        const timeStr = getUpdateTimeStr(stored);
        const text = buildCategoryHeaderText(category, page, totalPages, timeStr);
        const kb = buildPricesKeyboard(category, page, totalPages, items);
        await tgEditMessage(env, chatId, messageId, text, kb);
        return new Response("ok");
      } else if (data?.startsWith("show:")) {
        const parts = data.split(":");
        const category = parts[1] as PriceCategory;
        const code = (parts[2] || "").toLowerCase();
        await tgAnswerCallback(env, cb.id, "📩 ارسال شد");
        const stored = await getStoredOrRefresh(env, ctx);
        const text = buildPriceDetailText(stored, category, code);
        await tgSend(env, chatId as number, text);
        return new Response("ok");
      } else if (data === "get_all_prices") {
        await tgAnswerCallback(env, cb.id);
        await tgEditMessage(env, chatId, messageId, "📌 یک دسته‌بندی را انتخاب کنید:", START_KEYBOARD);
        return new Response("ok");
      }

      await tgAnswerCallback(env, cb.id);
      return new Response("ok");
    }

    // -------- message handler --------
    const msg = update?.message;
    if (!msg) return new Response("ok");

    const chatId: number | undefined = msg?.chat?.id;
    const text: string | undefined = msg?.text;
    const messageId: number | undefined = msg?.message_id;
    const userId: number | undefined = msg?.from?.id;
    if (!chatId || !text || !userId) return new Response("ok");

    const msgDate = msg.date;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - msgDate > 40) return new Response("ok");

    const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
    const replyTo = isGroup ? messageId : undefined;

    const cooldownKey = `cooldown:${userId}`;
    const nowMs = Date.now();
    const rawCooldown = await env.BOT_KV.get(cooldownKey);
    if (rawCooldown) {
      const lastMs = Number(rawCooldown);
      if (Number.isFinite(lastMs) && nowMs - lastMs < 5000) return new Response("ok");
    }
    // Cloudflare KV minimum expiration_ttl is 60 seconds; we store a timestamp and enforce a 5s window ourselves.
    ctx.waitUntil(env.BOT_KV.put(cooldownKey, String(nowMs), { expirationTtl: 60 }));

    const textNorm = norm(text);
    const cmd = normalizeCommand(textNorm);

    const run = async () => {
      const downloadUrl = pickCobaltUrl(text);
      if (downloadUrl) {
        try {
          const u = new URL(downloadUrl);
          if (isTwitterLikeHost(u.hostname)) await handleTwitterDirectFileDownload(env, chatId, downloadUrl, origin, replyTo);
          else await handleCobaltPublicDownload(env, chatId, downloadUrl, replyTo);
        } catch {
          await handleCobaltPublicDownload(env, chatId, downloadUrl, replyTo);
        }
        return;
      }

      if (cmd === "/start") {
        await tgSend(
          env,
          chatId,
           "👋 سلام! به ربات [ارز چی؟] خوش آمدید.\n\nمن می‌توانم قیمت ارزها و کریپتو را بگویم و ویدیوهای اینستاگرام و توییتر را دانلود کنم.",
          replyTo,
          START_KEYBOARD,
        );
        return;
      }

      if (cmd === "/help") {
        await tgSend(env, chatId, getHelpMessage(), replyTo, HELP_KEYBOARD);
        return;
      }

      if (cmd === "/refresh") {
        const parts = stripPunct(textNorm)
          .split(/\s+/)
          .filter(Boolean);
        const key = parts[1] || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return;
        const r = await refreshRates(ctx);
        await tgSend(env, chatId, r.ok ? "✅ بروزرسانی شد" : "⛔️ خطا", replyTo);
        return;
      }

      const stored = await getStoredOrRefresh(env, ctx);

      if (cmd === "/all") {
        const out = buildAll(stored);
        const chunks = chunkText(out, 3800);
        for (const c of chunks) await tgSend(env, chatId, c, replyTo);
        return;
      }

      const parsed = getParsedIntent(userId, textNorm, stored.rates, RUNTIME_RATES_CACHE?.alias);
      if (!parsed.code) return;

      const code = parsed.code;
      const amount = parsed.amount;
      const r = stored.rates[code];
      if (!r) return;

      const out = r.kind === "gold" ? replyGold(r, amount, stored) : replyCurrency(code, r, amount, stored, parsed.hasAmount);
      await tgSend(env, chatId, out, replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  },
};

function computeDefaultListsFromRates(rates: Record<string, Rate>): { fiat: string[]; crypto: string[] } {
  const cryptoCodes: string[] = [];
  const goldCodes: string[] = [];
  const currencyCodes: string[] = [];

  for (const c in rates) {
    const r = rates[c];
    if (r.kind === "crypto") cryptoCodes.push(c);
    else if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldCodes.push(c);
    else currencyCodes.push(c);
  }

  const currencyPriority = new Set(PRIORITY);
  const cryptoPriority = new Set(CRYPTO_PRIORITY);

  goldCodes.sort((a, b) => a.localeCompare(b));
  currencyCodes.sort((a, b) => {
    const ap = currencyPriority.has(a) ? PRIORITY.indexOf(a) : 999;
    const bp = currencyPriority.has(b) ? PRIORITY.indexOf(b) : 999;
    return ap === bp ? a.localeCompare(b) : ap - bp;
  });
  cryptoCodes.sort((a, b) => {
    const ap = cryptoPriority.has(a) ? CRYPTO_PRIORITY.indexOf(a) : 999;
    const bp = cryptoPriority.has(b) ? CRYPTO_PRIORITY.indexOf(b) : 999;
    return ap === bp ? a.localeCompare(b) : ap - bp;
  });

  return { fiat: [...goldCodes, ...currencyCodes], crypto: cryptoCodes };
}


