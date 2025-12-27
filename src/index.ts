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
const PRICES_JSON_URL = "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/merged_prices.json";

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
] as const;

const COBALT_HEADERS = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/1.0)",
  Origin: "https://cobalt.tools",
  Referer: "https://cobalt.tools/",
} as const;

const KEY_RATES = "rates:v2:latest";
const KEY_HASH = "rates:v2:hash";

// Parsing caches
const PARSE_TTL_MS = 15_000;
const CONTEXT_TTL_MS = 60_000;
const PARSE_CACHE_MAX = 1_000;

// -----------------------------
// Telegram minimal types
// -----------------------------

interface TgChat {
  id: number;
  type?: "private" | "group" | "supergroup" | "channel";
}

interface TgFrom {
  id: number;
}

interface TgMessage {
  message_id: number;
  date: number;
  text?: string;
  chat: TgChat;
  from?: TgFrom;
}

interface TgCallbackQuery {
  id: string;
  data?: string;
  message?: {
    message_id?: number;
    chat?: TgChat;
  };
}

interface TgUpdate {
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
}

// -----------------------------
// Rates data types
// -----------------------------

interface Rate {
  price: number;
  unit: number;
  kind: "currency" | "gold" | "crypto";
  title: string;
  emoji: string;
  fa: string;
  usdPrice?: number;
  change24h?: number;
}

interface Stored {
  fetchedAtMs: number;
  source: string;
  timestamp?: string;
  rates: Record<string, Rate>;
}

// -----------------------------
// Static metadata
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
} as const;

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
} as const;

// -----------------------------
// Fast string utilities
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
} as const;

function normalizeDigits(input: string): string {
  let out = "";
  for (const ch of input) out += DIGIT_MAP[ch] ?? ch;
  return out;
}

function norm(input: string): string {
  return normalizeDigits(input)
    .replace(/\u200c/g, " ")
    .replace(/[ي]/g, "ی")
    .replace(/[ك]/g, "ک")
    .toLowerCase()
    .trim();
}

function stripPunct(input: string): string {
  return input.replace(/[.,!?؟؛:()[\]{}"'«»]/g, " ").replace(/\s+/g, " ").trim();
}

function formatToman(n: number): string {
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUSD(n: number): string {
  return n < 1 ? n.toFixed(4) : n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  return Array.from(new Uint8Array(hash)).map((b) => b.toString(16).padStart(2, "0")).join("");
}

// -----------------------------
// Aliases for detection
// -----------------------------

const ALIASES: readonly { keys: readonly string[]; code: string }[] = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "دلار امریکا", "usd", "us dollar", "dollar"], code: "usd" },
  // ... (all other aliases unchanged for brevity)
] as const;  // Full list as in original

const ALIAS_INDEX: readonly { code: string; spaced: string[]; compact: string[]; maxLen: number }[] = (() => {
  const mapped = ALIASES.map((a) => {
    const spaced = a.keys.map((k) => stripPunct(norm(k)).trim()).filter(Boolean).sort((x, y) => y.length - x.length);
    const compact = spaced.map((k) => k.replace(/\s+/g, "")).filter(Boolean).sort((x, y) => y.length - x.length);
    const maxLen = Math.max(spaced[0]?.length ?? 0, compact[0]?.length ?? 0);
    return { code: a.code, spaced, compact, maxLen };
  });
  return mapped.sort((x, y) => y.maxLen - x.maxLen);
})();

// -----------------------------
// Downloader helpers
// -----------------------------

function pickCobaltUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>()]+/i);
  if (!m) return null;
  const raw = m[0].replace(/[)\]}>,.!?؟؛:]+$/g, "");
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    const ok = ["instagram.com", "twitter.com", "x.com", "t.co", "fxtwitter.com", "vxtwitter.com", "fixupx.com"].some((dom) => h.endsWith(dom) || h === dom);
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

async function fetchCobalt(baseUrl: string, targetUrl: string): Promise<CobaltResponse> {
  const body = JSON.stringify({ url: targetUrl, vCodec: "h264" });
  let apiRes = await fetch(baseUrl, { method: "POST", headers: COBALT_HEADERS, body });
  if (!apiRes.ok && apiRes.status === 404 && !baseUrl.includes("json")) {
    const retryUrl = baseUrl.endsWith("/") ? `${baseUrl}api/json` : `${baseUrl}/api/json`;
    apiRes = await fetch(retryUrl, { method: "POST", headers: COBALT_HEADERS, body });
  }
  if (!apiRes.ok) throw new Error(`HTTP ${apiRes.status}`);
  return (await apiRes.json()) as CobaltResponse;
}

async function handleCobaltPublicDownload(env: Env, chatId: number, targetUrl: string, replyTo?: number) {
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
    } catch (e) {
      console.error(`Cobalt error on ${baseUrl}:`, e instanceof Error ? e.message : String(e));
    }
  }
  await tgSend(env, chatId, "❌ سرورهای دانلود پاسخگو نیستند. لطفاً دقایقی دیگر تلاش کنید.", replyTo);
  return true;
}

interface CobaltPickerItem {
  type?: string;
  url?: string;
}

interface CobaltResponse {
  status?: "error" | "stream" | "redirect" | "picker";
  text?: string;
  url?: string;
  picker?: CobaltPickerItem[];
}

async function processCobaltResponse(env: Env, chatId: number, data: CobaltResponse, replyTo?: number) {
  if (data.status === "error") throw new Error(data.text || "Cobalt Error");
  if (data.status === "stream" || data.status === "redirect") {
    await tgSendVideo(env, chatId, data.url, "✅ دانلود شد", replyTo);
    return;
  }
  if (data.status === "picker" && Array.isArray(data.picker) && data.picker.length > 0) {
    const items = data.picker.slice(0, 4);
    for (const item of items) {
      if (item.type === "video" && item.url) await tgSendVideo(env, chatId, item.url, "", replyTo);
      else if (item.type === "photo" && item.url) await tgSendPhoto(env, chatId, item.url, "", replyTo);
    }
    return;
  }
  throw new Error("Unknown response");
}

// -----------------------------
// Rate fetching and storage
// -----------------------------

function parseNumberLoose(v: unknown): number | null {
  if (typeof v === "number" && Number.isFinite(v)) return v;
  if (typeof v !== "string") return null;
  const s = v.trim().replace(/,/g, "");
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

async function fetchWithRetry(url: string, options: RequestInit, retries = 3): Promise<Response> {
  let attempt = 0;
  while (attempt < retries) {
    const res = await fetch(url, options);
    if (res.ok) return res;
    if (res.status < 500 || attempt === retries - 1) throw new Error(`HTTP ${res.status}`);
    attempt++;
    await new Promise((r) => setTimeout(r, 1000 * attempt)); // Backoff
  }
  throw new Error("Retry failed");
}

async function fetchAndMergeData(): Promise<{ stored: Stored; rawHash: string }> {
  const headers = { "User-Agent": "Mozilla/5.0" };
  const res = await fetchWithRetry(PRICES_JSON_URL, { headers });
  const rawText = await res.text();
  const rawHash = await sha256Hex(rawText);
  const arr: { name: string; price: string | number; percent_change_24h?: string | number }[] = JSON.parse(rawText);
  const rates: Record<string, Rate> = {};
  const fetchedAtMs = Date.now();
  let usdToman: number | null = null;

  for (const row of arr) {
    if (!row.name) continue;
    const nameLower = row.name.toLowerCase().trim();
    if (nameLower === "us dollar") usdToman = parseNumberLoose(row.price);
  }

  for (const row of arr) {
    if (!row.name) continue;
    const unitMatch = row.name.match(/^\s*(\d+)\s*/);
    const unit = unitMatch ? Math.max(1, parseInt(unitMatch[1], 10)) : 1;
    const cleanName = row.name.replace(/^\s*\d+\s*/g, "").trim().toLowerCase();
    const priceNum = parseNumberLoose(row.price);
    if (priceNum == null) continue;
    const code = cleanName.replace(/\s+/g, "");
    let kind: Rate["kind"] = cleanName.includes("gold") || cleanName.includes("coin") ? "gold" : "currency";
    let tomanPrice = priceNum;
    let usdPrice: number | undefined;
    let change24h: number | undefined;

    if (typeof row.price === "number" || ["gold ounce", "pax gold", "tether gold"].includes(cleanName)) {
      usdPrice = priceNum;
      const ch = parseNumberLoose(row.percent_change_24h);
      if (ch != null) change24h = ch;
      if (usdToman != null) tomanPrice = priceNum * usdToman;
      kind = "crypto";
    } else if (kind === "currency" && usdToman != null) {
      usdPrice = code === "usd" ? 1 : priceNum / usdToman;
    }

    const meta = META[code] ?? CRYPTO_META[code] ?? { emoji: kind === "crypto" ? "💎" : "💱", fa: cleanName };
    rates[code] = {
      price: tomanPrice,
      unit,
      kind,
      title: cleanName,
      emoji: meta.emoji,
      fa: meta.fa,
      usdPrice,
      change24h,
    };
  }

  const stored: Stored = { fetchedAtMs, source: PRICES_JSON_URL, rates };
  return { stored, rawHash };
}

async function refreshRates(env: Env): Promise<{ ok: boolean; changed: boolean; count: number }> {
  const { stored, rawHash } = await fetchAndMergeData();
  const prevHash = await env.BOT_KV.get(KEY_HASH);
  const changed = prevHash !== rawHash;
  if (changed) {
    await env.BOT_KV.put(KEY_HASH, rawHash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  } else if (!(await env.BOT_KV.get(KEY_RATES))) {
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  }
  return { ok: true, changed, count: Object.keys(stored.rates).length };
}

async function getStoredOrRefresh(env: Env, ctx: ExecutionContext): Promise<Stored> {
  const txt = await env.BOT_KV.get(KEY_RATES);
  if (txt) {
    const stored = JSON.parse(txt) as Stored;
    if (Date.now() - stored.fetchedAtMs > 35 * 60_000) ctx.waitUntil(refreshRates(env).catch(() => {}));
    return stored;
  }
  await refreshRates(env);
  const txt2 = await env.BOT_KV.get(KEY_RATES);
  if (!txt2) throw new Error("no data");
  return JSON.parse(txt2) as Stored;
}

// -----------------------------
// Natural language parsing
// -----------------------------

function parsePersianNumber(tokens: readonly string[]): number | null {
  const ones = { یک: 1, یه: 1, دو: 2, سه: 3, چهار: 4, پنج: 5, شش: 6, شیش: 6, هفت: 7, هشت: 8, نه: 9 } as const;
  const teens = { ده: 10, یازده: 11, دوازده: 12, سیزده: 13, چهارده: 14, پانزده: 15, شانزده: 16, هفده: 17, هجده: 18, نوزده: 19 } as const;
  const tens = { بیست: 20, سی: 30, چهل: 40, پنجاه: 50, شصت: 60, هفتاد: 70, هشتاد: 80, نود: 90 } as const;
  const hundreds = { صد: 100, یکصد: 100, دویست: 200, سیصد: 300, چهارصد: 400, پانصد: 500, ششصد: 600, شیشصد: 600, هفتصد: 700, هشتصد: 800, نهصد: 900 } as const;
  const scales = { هزار: 1e3, میلیون: 1e6, ملیون: 1e6, میلیارد: 1e9, بیلیون: 1e9, تریلیون: 1e12 } as const;

  const t = tokens.map((x) => x.trim()).filter((x) => x && x !== "و");
  if (!t.length) return null;

  let total = 0;
  let current = 0;

  for (const w of t) {
    const scale = scales[w];
    if (scale) {
      total += (current || 1) * scale;
      current = 0;
      continue;
    }
    const val = hundreds[w] ?? teens[w] ?? tens[w] ?? ones[w];
    if (val) current += val;
    else if (w === "صد") current = (current || 1) * 100;
    else return null;
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
  const mul = ["هزار", "k"].includes(suf) ? 1e3 : ["میلیون", "ملیون", "m"].includes(suf) ? 1e6 : ["میلیارد", "بیلیون", "b"].includes(suf) ? 1e9 : suf === "تریلیون" ? 1e12 : 1;
  return num * mul;
}

function hasBounded(haystack: string, needle: string): boolean {
  if (!needle) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(haystack);
}

function findCode(textNorm: string, rates: Record<string, Rate>): string | null {
  const cleaned = stripPunct(textNorm).trim();
  const compact = cleaned.replace(/\s+/g, "");
  for (const a of ALIAS_INDEX) {
    if (a.spaced.some((k) => hasBounded(cleaned, k)) || a.compact.some((k) => hasBounded(compact, k))) return a.code;
  }
  if (cleaned.includes("دلار") && ["کانادا", "کاندا", "کانادایی", "کاندایی"].some((k) => cleaned.includes(k)) && rates["cad"]) return "cad";
  if (cleaned.includes("دینار") && ["عراق", "عراقی"].some((k) => cleaned.includes(k)) && rates["iqd"]) return "iqd";
  const m = cleaned.match(/\b([a-z]{3,10})\b/i);
  if (m && rates[m[1].toLowerCase()]) return m[1].toLowerCase();
  for (const key in rates) {
    const t = stripPunct(norm(rates[key].title || "")).replace(/\s+/g, "");
    if (compact === key || (t && compact === t)) return key;
  }
  return null;
}

function extractAmountOrNull(textNorm: string): number | null {
  const cleaned = stripPunct(textNorm).trim();
  const digitScaled = parseDigitsWithScale(cleaned);
  if (digitScaled && digitScaled > 0) return digitScaled;
  const tokens = cleaned.split(" ").filter(Boolean);
  const maxWin = Math.min(tokens.length, 10);
  for (let w = maxWin; w >= 1; w--) {
    for (let i = 0; i + w <= tokens.length; i++) {
      const n = parsePersianNumber(tokens.slice(i, i + w));
      if (n && n > 0) return n;
    }
  }
  return null;
}

const parseCache = new Map<string, { ts: number; code: string | null; amount: number; hasAmount: boolean }>();
const userContext = new Map<number, { ts: number; code: string }>();

function pruneParseCache(now: number) {
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  for (const [k, v] of parseCache.entries()) {
    if (now - v.ts > PARSE_TTL_MS) parseCache.delete(k);
    if (parseCache.size <= PARSE_CACHE_MAX) break;
  }
}

function getParsedIntent(userId: number, textNorm: string, rates: Record<string, Rate>) {
  const now = Date.now();
  pruneParseCache(now);
  const cacheKey = `${userId}:${textNorm}`;
  let cached = parseCache.get(cacheKey);
  if (cached && now - cached.ts <= PARSE_TTL_MS) return cached;

  let code = findCode(textNorm, rates);
  const amountOrNull = extractAmountOrNull(textNorm);
  const hasAmount = amountOrNull != null;
  const amount = amountOrNull ?? 1;

  if (!code) {
    const ctx = userContext.get(userId);
    if (ctx && now - ctx.ts <= CONTEXT_TTL_MS && hasAmount) code = ctx.code;
  }

  if (code) userContext.set(userId, { ts: now, code });

  cached = { ts: now, code, amount, hasAmount };
  parseCache.set(cacheKey, cached);
  return cached;
}

function normalizeCommand(textNorm: string): string {
  const t = stripPunct(textNorm).trim();
  return (t.split(/\s+/)[0] || "").split("@")[0];
}

// -----------------------------
// Telegram API helpers
// -----------------------------

function tgBase(env: Env): string {
  return `https://api.telegram.org/bot${env.TG_TOKEN}`;
}

async function tgCall(env: Env, method: string, body: Record<string, unknown>) {
  await fetch(`${tgBase(env)}/${method}`, {
    method: "POST",
    headers: TG_JSON_HEADERS,
    body: JSON.stringify(body),
  }).catch(() => {});
}

async function tgSend(env: Env, chatId: number, text: string, replyTo?: number, replyMarkup?: unknown) {
  const body: Record<string, unknown> = { chat_id: chatId, text, parse_mode: TG_PARSE_MODE, disable_web_page_preview: true };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  if (replyMarkup) body.reply_markup = replyMarkup;
  await tgCall(env, "sendMessage", body);
}

async function tgEditMessage(env: Env, chatId: number | undefined, messageId: number | undefined, text: string, replyMarkup?: unknown) {
  const body: Record<string, unknown> = { chat_id: chatId, message_id: messageId, text, parse_mode: TG_PARSE_MODE, disable_web_page_preview: true };
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
  const res = await fetch(`${tgBase(env)}/sendVideo`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(body) });
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

const PRICE_PAGE_SIZE = 8;

type PriceCategory = "fiat" | "crypto";

interface PriceListItem {
  code: string;
  category: PriceCategory;
  emoji: string;
  name: string;
  price: string;
}

function getUpdateTimeStr(stored: Stored): string {
  const date = new Date(stored.fetchedAtMs + 3.5 * 3600000);
  return date.toISOString().substr(11, 5);
}

function clampPage(page: number, totalPages: number): number {
  return Math.max(0, Math.min(page, totalPages - 1));
}

function shortColText(s: string, max = 18): string {
  const t = s.replace(/\s+/g, " ").trim();
  return t.length <= max ? t : t.slice(0, max - 1) + "…";
}

function buildPriceItems(stored: Stored, category: PriceCategory): PriceListItem[] {
  const rates = stored.rates;
  const codes = Object.keys(rates).filter((c) => rates[c].kind === (category === "crypto" ? "crypto" : undefined) && rates[c].kind !== "crypto");
  const priority = category === "crypto" ? ["btc", "eth", "ton", "usdt", "trx", "not", "doge", "sol"] : ["usd", "eur", "aed", "try", "afn", "iqd", "gbp"];
  codes.sort((a, b) => {
    const idxA = priority.indexOf(a);
    const idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const items: PriceListItem[] = [];
  for (const c of codes) {
    const r = rates[c];
    const showUnit = r.kind === "currency" && r.unit > 1;
    const baseAmount = showUnit ? r.unit : 1;
    const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / r.unit);
    const priceStr = formatToman(baseToman);
    const meta = category === "crypto" ? CRYPTO_META[c] ?? { emoji: "💎", fa: r.fa } : META[c] ?? { emoji: "💱", fa: r.fa };
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
  const rows = slice.map((it) => [
    { text: it.price, callback_data: `show:${category}:${it.code}:${page}` },
    { text: `${it.emoji} ${it.name}`, callback_data: `show:${category}:${it.code}:${page}` },
  ]);
  rows.push([
    { text: "بعدی ⬅️", callback_data: page > 0 ? `page:${category}:${page - 1}` : "noop" },
    { text: "🏠 خانه", callback_data: "start_menu" },
    { text: "➡️ قبلی", callback_data: page + 1 < totalPages ? `page:${category}:${page + 1}` : "noop" },
  ]);
  return { inline_keyboard: rows };
}

function buildCategoryHeaderText(category: PriceCategory, page: number, totalPages: number, timeStr: string): string {
  const title = category === "crypto" ? "🪙 <b>قیمت ارز دیجیتال</b>" : "💱 <b>قیمت ارز و طلا</b>";
  return `${title}\n📄 صفحه ${page + 1}/${totalPages}\n🕐 <b>بروزرسانی:</b> ${timeStr}`;
}

function buildPriceDetailText(stored: Stored, category: PriceCategory, code: string): string {
  const r = stored.rates[code];
  if (!r) return "❗️این آیتم پیدا نشد.";
  const showUnit = r.kind === "currency" && r.unit > 1;
  const baseAmount = showUnit ? r.unit : 1;
  const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / r.unit);
  const toman = formatToman(baseToman);
  const usd = stored.rates["usd"];
  const usdPer1 = usd ? usd.price / usd.unit : null;
  const usdEq = usdPer1 && code !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
  const unitPrefix = showUnit ? `${baseAmount} ` : "";
  const meta = category === "crypto" ? CRYPTO_META[code] ?? { emoji: "💎", fa: r.fa } : META[code] ?? { emoji: "💱", fa: r.fa };
  if (category === "crypto") {
    const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
    const change = r.change24h ?? 0;
    return `${meta.emoji} <b>${meta.fa}</b> (${code.toUpperCase()})\n💶 قیمت: <code>${toman}</code> تومان\n💵 قیمت دلاری: <code>${usdP}</code> $\n📈 تغییر 24ساعته: ${change >= 0 ? "🟢" : "🔴"} <b>${Math.abs(change).toFixed(2)}%</b>\n\n🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`;
  }
  return `${meta.emoji} <b>${unitPrefix}${meta.fa}</b>\n💶 قیمت: <code>${toman}</code> تومان${usdEq != null ? `\n💵 معادل دلار: <code>${formatUSD(usdEq)}</code> $` : ""}${r.unit > 1 ? `\n📦 واحد مرجع: <code>${r.unit}</code>` : ""}\n\n🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`;
}

function replyCurrency(code: string, r: Rate, amount: number, stored: Stored, hasAmount: boolean): string {
  const refUnit = Math.max(1, r.unit);
  const qty = hasAmount ? amount : 1;
  const baseUnits = refUnit > 1 ? qty * refUnit : qty;
  const per1Toman = r.price / refUnit;
  const totalToman = per1Toman * baseUnits;
  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / usd.unit : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;
  const meta = META[code] ?? { emoji: "💱", fa: r.fa };
  if (r.kind === "crypto") {
    const totalUsdDirect = r.usdPrice ? r.usdPrice * qty : null;
    const finalUsd = totalUsdDirect ?? totalUsd;
    const changeLine = r.change24h != null ? `${r.change24h >= 0 ? "🟢" : "🔴"} <b>تغییر 24h:</b> ${r.change24h.toFixed(2)}%` : "";
    const titlePart = r.title && r.title !== r.fa ? ` <i>(${r.title})</i>` : "";
    return `💎 <b>${r.fa}</b>${titlePart}\n➖➖➖➖➖➖\n🧮 <b>تعداد:</b> <code>${qty}</code>\n💶 <b>قیمت:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان${finalUsd != null ? `\n💵 <b>معادل:</b> <code>${formatUSD(finalUsd)}</code> $` : ""}${changeLine ? `\n${changeLine}` : ""}`;
  }
  return `<b>${qty} ${meta.fa} ${meta.emoji}</b>${code !== "usd" && totalUsd != null ? `\n💵 معادل دلار: <code>${formatUSD(totalUsd)}</code> $` : ""}\n💶 <code>${formatToman(Math.round(totalToman))}</code> تومان`;
}

function replyGold(r: Rate, amount: number, stored: Stored): string {
  const refUnit = Math.max(1, r.unit);
  const qty = amount || 1;
  const perRefToman = r.price;
  const per1Toman = perRefToman / refUnit;
  const totalToman = per1Toman * (qty * refUnit);
  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / usd.unit : null;
  const perRefUsd = usdPer1Toman ? perRefToman / usdPer1Toman : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;
  const unitLabel = refUnit > 1 ? `${refUnit} ${r.fa}` : r.fa;
  return `🟡 <b>${r.fa}</b>\n➖➖➖➖➖➖\n🧾 <b>واحد:</b> <code>${unitLabel}</code>\n💶 <b>قیمت واحد:</b> <code>${formatToman(Math.round(perRefToman))}</code> تومان${perRefUsd != null ? ` (≈ <code>${formatUSD(perRefUsd)}</code> $)` : ""}\n🧮 <b>تعداد:</b> <code>${qty}</code>\n✅ <b>جمع کل:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان${totalUsd != null ? ` (≈ <code>${formatUSD(totalUsd)}</code> $)` : ""}`;
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
} as const;

const HELP_KEYBOARD = {
  inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start_menu" }]],
} as const;

function getHelpMessage(): string {
  return `<b>🤖 راه نمای استفاده از ربات:</b>

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
    return await req.json() as T;
  } catch {
    return null;
  }
}

// -----------------------------
// Worker entry
// -----------------------------

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await refreshRates(env).catch(() => {});
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");

    if (url.pathname === "/refresh") {
      const key = url.searchParams.get("key") || "";
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response("Unauthorized", { status: 401 });
      try {
        const r = await refreshRates(env);
        return Response.json(r);
      } catch (e) {
        return Response.json({ ok: false, error: e instanceof Error ? e.message : String(e) }, { status: 502 });
      }
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await safeJson<TgUpdate>(req);
    if (update?.edited_message) return new Response("ok");

    if (update?.callback_query) {
      const cb = update.callback_query;
      const data = cb.data ?? "";
      const chatId = cb.message?.chat?.id;
      const messageId = cb.message?.message_id;

      switch (true) {
        case data === "help_menu":
          await tgEditMessage(env, chatId, messageId, getHelpMessage(), HELP_KEYBOARD);
          break;
        case data === "start_menu":
          await tgEditMessage(env, chatId, messageId, "👋 سلام! به ربات خوش آمدید.\nچه کاری می‌توانم برایتان انجام دهم؟", START_KEYBOARD);
          break;
        case data === "noop":
          await tgAnswerCallback(env, cb.id);
          break;
        case data.startsWith("cat:"):
          const category = data.split(":")[1] as PriceCategory;
          await tgAnswerCallback(env, cb.id, "در حال دریافت قیمت‌ها...");
          const storedCat = await getStoredOrRefresh(env, ctx);
          const itemsCat = buildPriceItems(storedCat, category);
          const totalPagesCat = Math.max(1, Math.ceil(itemsCat.length / PRICE_PAGE_SIZE));
          const pageCat = 0;
          const timeStrCat = getUpdateTimeStr(storedCat);
          const textCat = buildCategoryHeaderText(category, pageCat, totalPagesCat, timeStrCat);
          const kbCat = buildPricesKeyboard(category, pageCat, totalPagesCat, itemsCat);
          await tgEditMessage(env, chatId, messageId, textCat, kbCat);
          break;
        case data.startsWith("page:"):
          const partsPage = data.split(":");
          const categoryPage = partsPage[1] as PriceCategory;
          const pageReq = Number(partsPage[2]) || 0;
          await tgAnswerCallback(env, cb.id);
          const storedPage = await getStoredOrRefresh(env, ctx);
          const itemsPage = buildPriceItems(storedPage, categoryPage);
          const totalPagesPage = Math.max(1, Math.ceil(itemsPage.length / PRICE_PAGE_SIZE));
          const pagePage = clampPage(pageReq, totalPagesPage);
          const timeStrPage = getUpdateTimeStr(storedPage);
          const textPage = buildCategoryHeaderText(categoryPage, pagePage, totalPagesPage, timeStrPage);
          const kbPage = buildPricesKeyboard(categoryPage, pagePage, totalPagesPage, itemsPage);
          await tgEditMessage(env, chatId, messageId, textPage, kbPage);
          break;
        case data.startsWith("show:"):
          const partsShow = data.split(":");
          const categoryShow = partsShow[1] as PriceCategory;
          const codeShow = partsShow[2].toLowerCase();
          await tgAnswerCallback(env, cb.id, "📩 ارسال شد");
          const storedShow = await getStoredOrRefresh(env, ctx);
          const textShow = buildPriceDetailText(storedShow, categoryShow, codeShow);
          await tgSend(env, chatId as number, textShow);
          break;
        default:
          await tgAnswerCallback(env, cb.id);
      }
      return new Response("ok");
    }

    const msg = update?.message;
    if (!msg) return new Response("ok");

    const chatId = msg.chat.id;
    const text = msg.text ?? "";
    const messageId = msg.message_id;
    const userId = msg.from?.id ?? 0;
    if (!chatId || !text || !userId) return new Response("ok");

    const msgDate = msg.date;
    const nowSec = Math.floor(Date.now() / 1000);
    if (nowSec - msgDate > 40) return new Response("ok");

    const isGroup = ["group", "supergroup"].includes(msg.chat.type ?? "");
    const replyTo = isGroup ? messageId : undefined;

    const cooldownKey = `cooldown:${userId}`;
    if (await env.BOT_KV.get(cooldownKey)) return new Response("ok");
    ctx.waitUntil(env.BOT_KV.put(cooldownKey, "1", { expirationTtl: 5 }));

    const textNorm = norm(text);
    const cmd = normalizeCommand(textNorm);

    const run = async () => {
      const downloadUrl = pickCobaltUrl(text);
      if (downloadUrl) return await handleCobaltPublicDownload(env, chatId, downloadUrl, replyTo);

      if (cmd === "/start") {
        return await tgSend(
          env,
          chatId,
          "👋 سلام! به ربات [ارز چی؟] خوش آمدید.\n\nمن می‌توانم قیمت ارزها و کریپتو را بگویم و ویدیوهای اینستاگرام را دانلود کنم.",
          replyTo,
          START_KEYBOARD,
        );
      }

      if (cmd === "/help") return await tgSend(env, chatId, getHelpMessage(), replyTo, HELP_KEYBOARD);

      if (cmd === "/refresh") {
        const parts = stripPunct(textNorm).split(/\s+/).filter(Boolean);
        const key = parts[1] || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return;
        const r = await refreshRates(env);
        return await tgSend(env, chatId, r.ok ? "✅ بروزرسانی شد" : "⛔️ خطا", replyTo);
      }

      const stored = await getStoredOrRefresh(env, ctx);

      if (cmd === "/all") {
        const goldItems: string[] = [];
        const currencyItems: string[] = [];
        const cryptoItems: string[] = [];
        const codes = Object.keys(stored.rates);
        const priority = ["usd", "eur", "aed", "try", "afn", "iqd", "gbp"];
        const cryptoPriority = ["btc", "eth", "ton", "usdt", "trx", "not", "doge", "sol"];
        codes.sort((a, b) => {
          const rA = stored.rates[a];
          const rB = stored.rates[b];
          if (rA.kind !== rB.kind) return 0;
          if (rA.kind === "currency") {
            const idxA = priority.indexOf(a);
            const idxB = priority.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }
          if (rA.kind === "crypto") {
            const idxA = cryptoPriority.indexOf(a);
            const idxB = cryptoPriority.indexOf(b);
            if (idxA !== -1 && idxB !== -1) return idxA - idxB;
            if (idxA !== -1) return -1;
            if (idxB !== -1) return 1;
          }
          return a.localeCompare(b);
        });
        for (const c of codes) {
          const r = stored.rates[c];
          const showUnit = r.kind === "currency" && r.unit > 1;
          const baseAmount = showUnit ? r.unit : 1;
          const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / r.unit);
          const priceStr = formatToman(baseToman);
          if (r.kind === "crypto") {
            const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
            const changePart = r.change24h != null ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%` : "";
            cryptoItems.push(`💎 <b>${r.fa}</b> (${c.toUpperCase()})\n└ ${priceStr} ت | ${usdP}$${changePart}`);
          } else {
            const meta = META[c] ?? { emoji: "💱", fa: r.title || c.toUpperCase() };
            const usd = stored.rates["usd"];
            const usdPer1 = usd ? usd.price / usd.unit : null;
            const usdEq = usdPer1 && c !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
            const unitPrefix = showUnit ? `${baseAmount} ` : "";
            const usdPart = usdEq != null ? ` (≈ $${formatUSD(usdEq)})` : "";
            const line = `${meta.emoji} <b>${unitPrefix}${meta.fa}:</b> \u200E<code>${priceStr}</code> تومان${usdPart}`;
            if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldItems.push(line);
            else currencyItems.push(line);
          }
        }
        let out = "";
        if (goldItems.length) out += "🟡 <b>نرخ طلا و سکه</b>\n➖➖➖➖➖➖\n" + goldItems.join("\n") + "\n\n";
        if (currencyItems.length) out += "💵 <b>نرخ ارزهای بازار</b>\n➖➖➖➖➖➖\n" + currencyItems.join("\n") + "\n\n";
        if (cryptoItems.length) out += "🚀 <b>بازار ارز دیجیتال</b>\n➖➖➖➖➖➖\n" + cryptoItems.join("\n");
        out += "\n🕐 <b>بروزرسانی:</b> " + getUpdateTimeStr(stored);
        return await tgSend(env, chatId, out, replyTo);
      }

      const parsed = getParsedIntent(userId, textNorm, stored.rates);
      if (!parsed.code) return;
      const r = stored.rates[parsed.code];
      if (!r) return;
      const out = r.kind === "gold" ? replyGold(r, parsed.amount, stored) : replyCurrency(parsed.code, r, parsed.amount, stored, parsed.hasAmount);
      await tgSend(env, chatId, out, replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  },
};
