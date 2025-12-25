export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const BOT_USERNAME = "worker093578bot";
const PRICES_JSON_URL =
  "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/merged_prices.json";

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

const KEY_RATES = "rates:v2:latest";
const KEY_HASH = "rates:v2:hash";

const PARSE_TTL_MS = 15_000;
const CONTEXT_TTL_MS = 60_000;
const PARSE_CACHE_MAX = 5_000;

const BG_REFRESH_AT_MS = 29 * 60_000;
const FORCE_REFRESH_AT_MS = 45 * 60_000;

const MEM_STORED_TTL_MS = 5_000;

const COOLDOWN_TTL_MS = 5_000;
const COOLDOWN_MEM_MAX = 20_000;

const MAX_MEDIA_CAPTION_LEN = 950;

const COBALT_TIMEOUT_MS = 12_000;
const COBALT_TIMEOUT_MS_TW = 14_000;
const COBALT_BACKOFF_BASE_MS = 220;
const COBALT_BACKOFF_BASE_MS_TW = 320;
const COBALT_BACKOFF_MAX_MS = 2400;
const COBALT_COOLDOWN_429_MS = 20 * 60_000;
const COBALT_COOLDOWN_403_MS = 25 * 60_000;
const COBALT_COOLDOWN_5XX_MS = 5 * 60_000;
const COBALT_COOLDOWN_TIMEOUT_MS = 6 * 60_000;
const COBALT_COOLDOWN_OTHER_MS = 3 * 60_000;
const COBALT_STATE_TTL_MS = 2 * 60 * 60_000;

const TG_JSON_HEADERS = { "content-type": "application/json" } as const;
const UA_HEADERS = { "User-Agent": "Mozilla/5.0" } as const;

type Rate = {
  price: number;
  unit: number;
  kind: "currency" | "gold" | "crypto";
  title: string;
  emoji: string;
  fa: string;
  usdPrice?: number;
  change24h?: number;
};

type Stored = {
  fetchedAtMs: number;
  source: string;
  timestamp?: string;
  rates: Record<string, Rate>;
};

const parseCache = new Map<
  string,
  { ts: number; code: string | null; amount: number; hasAmount: boolean }
>();
const userContext = new Map<number, { ts: number; code: string }>();

let memStored: Stored | null = null;
let memStoredReadAt = 0;

const cooldownMem = new Map<number, number>();

type CobaltState = { failCount: number; cooldownUntil: number; lastOkAt: number; lastSeenAt: number };
const cobaltState = new Map<string, CobaltState>();

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

const ALIASES: Array<{ keys: string[]; code: string }> = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "دلار امریکا", "usd", "us dollar", "dollar"], code: "usd" },
  { keys: ["یورو", "eur", "euro"], code: "eur" },
  { keys: ["پوند", "پوندانگلیس", "پوند انگلیس", "gbp", "britishpound"], code: "gbp" },
  { keys: ["فرانک", "فرانکسوئیس", "فرانک سوئیس", "chf", "swissfranc"], code: "chf" },
  { keys: ["دلارکانادا", "دلار کانادا", "دلارکانادایی", "دلار کانادایی", "دلارکاندا", "دلار کاندا", "cad", "canadiandollar", "canada", "کاندایی"], code: "cad" },
  { keys: ["دلاراسترالیا", "دلار استرالیا", "استرالیا", "aud", "australiandollar"], code: "aud" },
  { keys: ["درهم", "درهمامارات", "درهم امارات", "امارات", "aed", "uaedirham"], code: "aed" },
  { keys: ["لیر", "لیرترکیه", "لیر ترکیه", "ترکیه", "try", "turkishlira"], code: "try" },
  { keys: ["ین", "ینژاپن", "ین ژاپن", "ژاپن", "jpy", "japaneseyen"], code: "jpy" },
  { keys: ["یوان", "یوانچین", "یوان چین", "چین", "cny", "chineseyuan"], code: "cny" },
  { keys: ["ریال عربستان", "ریالعربستان", "ریاض", "عربستان", "sar", "ksa", "saudiriyal"], code: "sar" },
  { keys: ["افغانی", "افغان", "afn", "afghanafghani"], code: "afn" },
  { keys: ["ریال عمان", "عمان", "omr", "omanirial"], code: "omr" },
  { keys: ["ریال قطر", "قطر", "qar", "qataririyal"], code: "qar" },
  { keys: ["دینارکویت", "دینار کویت", "کویت", "kwd", "kuwaitidinar"], code: "kwd" },
  { keys: ["دیناربحرین", "دینار بحرین", "بحرین", "bhd", "bahrainidinar"], code: "bhd" },
  { keys: ["دینارعراق", "دینار عراق", "عراق", "عراقی", "iqd", "iraqidinar", "دینارعراقی", "دینار عراقی", "iraq"], code: "iqd" },
  { keys: ["کرونسوئد", "کرون سوئد", "سوئد", "sek", "swedishkrona"], code: "sek" },
  { keys: ["کروننروژ", "کرون نروژ", "نروژ", "nok", "norwegiankrone"], code: "nok" },
  { keys: ["کرون دانمارک", "دانمارک", "dkk", "danishkrone"], code: "dkk" },
  { keys: ["روبل", "روبل روسیه", "روسیه", "rub", "russianruble"], code: "rub" },
  { keys: ["بات", "بات تایلند", "تایلند", "thb", "thaibaht"], code: "thb" },
  { keys: ["دلار سنگاپور", "سنگاپور", "sgd", "singaporedollar"], code: "sgd" },
  { keys: ["دلار هنگ کنگ", "هنگکنگ", "hkd", "hongkongdollar"], code: "hkd" },
  { keys: ["منات", "منات آذربایجان", "آذربایجان", "azn", "azerbaijanimanat"], code: "azn" },
  { keys: ["درام", "درام ارمنستان", "ارمنستان", "amd", "armeniandram"], code: "amd" },
  { keys: ["رینگیت", "مالزی", "myr", "ringgit"], code: "myr" },
  { keys: ["روپیه هند", "هند", "inr", "indianrupee"], code: "inr" },
  { keys: ["طلا", "gold", "گرم طلا", "گرمطلای18", "طلای18", "طلای ۱۸", "ذهب"], code: "gold_gram_18k" },
  { keys: ["مثقال", "مثقالطلا", "mithqal"], code: "gold_mithqal" },
  { keys: ["اونس", "انس", "اونس طلا", "goldounce", "ounce"], code: "gold_ounce" },
  { keys: ["سکه", "سکه امامی", "امامی", "coin_emami"], code: "coin_emami" },
  { keys: ["بهار آزادی", "coin_azadi"], code: "coin_azadi" },
  { keys: ["نیم سکه", "coin_half_azadi"], code: "coin_half_azadi" },
  { keys: ["ربع سکه", "coin_quarter_azadi"], code: "coin_quarter_azadi" },
  { keys: ["گرمی", "سکه گرمی", "coin_gerami"], code: "coin_gerami" },
  { keys: ["بیت", "بیتکوین", "بیت کوین", "btc", "bitcoin"], code: "btc" },
  { keys: ["اتریوم", "eth", "ethereum"], code: "eth" },
  { keys: ["تتر", "usdt", "tether", "tetherusdt"], code: "usdt" },
  { keys: ["بی ان بی", "bnb", "binance"], code: "bnb" },
  { keys: ["ریپل", "xrp"], code: "xrp" },
  { keys: ["یو اس دی سی", "usdc"], code: "usdc" },
  { keys: ["سولانا", "sol", "solana"], code: "sol" },
  { keys: ["ترون", "trx", "tron"], code: "trx" },
  { keys: ["دوج", "دوج کوین", "doge", "dogecoin"], code: "doge" },
  { keys: ["شیبا", "shib", "shiba"], code: "shib" },
  { keys: ["پولکادات", "dot", "polkadot"], code: "dot" },
  { keys: ["فایل کوین", "fil", "filecoin"], code: "fil" },
  { keys: ["تون", "ton", "toncoin"], code: "ton" },
  { keys: ["چین لینک", "link", "chainlink"], code: "link" },
  { keys: ["مونرو", "xmr", "monero"], code: "xmr" },
  { keys: ["بیت کوین کش", "bch", "bitcoincash"], code: "bch" },
];

const ALIAS_INDEX: Array<{ code: string; spaced: string[]; compact: string[]; maxLen: number }> = (() => {
  const mapped = ALIASES.map((a) => {
    const spaced = a.keys
      .map((k) => stripPunct(norm(String(k))).replace(/\s+/g, " ").trim())
      .filter(Boolean);
    const compact = spaced.map((k) => k.replace(/\s+/g, "")).filter(Boolean);
    spaced.sort((x, y) => y.length - x.length);
    compact.sort((x, y) => y.length - x.length);
    const maxLen = Math.max(spaced[0]?.length ?? 0, compact[0]?.length ?? 0);
    return { code: a.code, spaced, compact, maxLen };
  });
  mapped.sort((x, y) => y.maxLen - x.maxLen);
  return mapped;
})();

function normalizeDigits(input: string) {
  const map: Record<string, string> = {
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
  return input.split("").map((ch) => map[ch] ?? ch).join("");
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

function escapeHtml(s: string) {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function escapeAttr(s: string) {
  return escapeHtml(s).replace(/"/g, "&quot;").replace(/'/g, "&#39;");
}

function cleanText(s: string) {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

function truncate(s: string, max: number) {
  if (s.length <= max) return s;
  return s.slice(0, Math.max(0, max - 1)) + "…";
}

async function sha256Hex(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map((b) => b.toString(16).padStart(2, "0")).join("");
}

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
function isWordChar(ch: string | undefined) {
  return !!ch && WORD_CHAR_RE.test(ch);
}

function containsBounded(haystack: string, needle: string) {
  if (!needle) return false;
  let from = 0;
  while (true) {
    const idx = haystack.indexOf(needle, from);
    if (idx === -1) return false;
    const before = haystack[idx - 1];
    const after = haystack[idx + needle.length];
    if (!isWordChar(before) && !isWordChar(after)) return true;
    from = idx + 1;
  }
}

function parsePersianNumber(tokens: string[]): number | null {
  const ones: Record<string, number> = { "یک": 1, "یه": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, "شش": 6, "شیش": 6, "هفت": 7, "هشت": 8, "نه": 9 };
  const teens: Record<string, number> = { "ده": 10, "یازده": 11, "دوازده": 12, "سیزده": 13, "چهارده": 14, "پانزده": 15, "شانزده": 16, "هفده": 17, "هجده": 18, "نوزده": 19 };
  const tens: Record<string, number> = { "بیست": 20, "سی": 30, "چهل": 40, "پنجاه": 50, "شصت": 60, "هفتاد": 70, "هشتاد": 80, "نود": 90 };
  const hundreds: Record<string, number> = { "صد": 100, "یکصد": 100, "دویست": 200, "سیصد": 300, "چهارصد": 400, "پانصد": 500, "ششصد": 600, "شیشصد": 600, "هفتصد": 700, "هشتصد": 800, "نهصد": 900 };
  const scales: Record<string, number> = { "هزار": 1e3, "میلیون": 1e6, "ملیون": 1e6, "میلیارد": 1e9, "بیلیون": 1e9, "تریلیون": 1e12 };

  const t = tokens.map((x) => x.trim()).filter((x) => x && x !== "و");
  if (t.length === 0) return null;

  let total = 0;
  let current = 0;

  const addSmall = (w: string) => {
    if (hundreds[w] != null) { current += hundreds[w]; return true; }
    if (teens[w] != null) { current += teens[w]; return true; }
    if (tens[w] != null) { current += tens[w]; return true; }
    if (ones[w] != null) { current += ones[w]; return true; }
    if (w === "صد") { current = (current || 1) * 100; return true; }
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

function findCode(textNorm: string, rates: Record<string, Rate>) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  for (const a of ALIAS_INDEX) {
    for (const k of a.spaced) if (containsBounded(cleaned, k)) return a.code;
    for (const k of a.compact) if (containsBounded(compact, k)) return a.code;
  }

  if (containsBounded(cleaned, "دلار") && (containsBounded(cleaned, "کانادا") || containsBounded(cleaned, "کاندا") || containsBounded(cleaned, "کانادایی") || containsBounded(cleaned, "کاندایی"))) {
    if (rates["cad"]) return "cad";
  }

  if (containsBounded(cleaned, "دینار") && (containsBounded(cleaned, "عراق") || containsBounded(cleaned, "عراقی"))) {
    if (rates["iqd"]) return "iqd";
  }

  const m = cleaned.match(/\b([a-z]{3,10})\b/i);
  if (m) {
    const candidate = m[1].toLowerCase();
    if (rates[candidate]) return candidate;
  }

  for (const key in rates) {
    const t = rates[key]?.title ? stripPunct(norm(rates[key].title)).replace(/\s+/g, "") : "";
    if (compact === key || (t && compact === t)) return key;
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

function pruneParseCache(now: number) {
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  const keys: string[] = [];
  for (const [k, v] of parseCache) if (now - v.ts > PARSE_TTL_MS) keys.push(k);
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

function getParsedIntent(userId: number, textNorm: string, rates: Record<string, Rate>) {
  const now = Date.now();
  pruneParseCache(now);
  const cacheKey = `${userId}:${textNorm}`;
  const cached = parseCache.get(cacheKey);
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

  const out = { ts: now, code: code ?? null, amount, hasAmount };
  parseCache.set(cacheKey, out);
  return out;
}

function normalizeCommand(textNorm: string) {
  const t = stripPunct(textNorm).trim();
  const first = t.split(/\s+/)[0] || "";
  return first.split("@")[0];
}

function pruneCooldownMem(now: number) {
  if (cooldownMem.size <= COOLDOWN_MEM_MAX) return;
  for (const [k, exp] of cooldownMem) if (exp <= now) cooldownMem.delete(k);
  if (cooldownMem.size <= COOLDOWN_MEM_MAX) return;
  let i = 0;
  for (const k of cooldownMem.keys()) {
    cooldownMem.delete(k);
    i++;
    if (cooldownMem.size <= COOLDOWN_MEM_MAX) break;
    if (i > COOLDOWN_MEM_MAX) break;
  }
}

class Telegram {
  private base: string;
  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
  }
  private async call(method: string, payload: unknown, logOnFail = false) {
    try {
      const res = await fetch(`${this.base}/${method}`, {
        method: "POST",
        headers: TG_JSON_HEADERS,
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) {
        if (logOnFail) console.error("TG call failed:", method, res.status, await res.text().catch(() => ""));
        return null;
      }
      return await res.json<any>().catch(() => null);
    } catch (e) {
      if (logOnFail) console.error("TG call exception:", method, String((e as any)?.message ?? e));
      return null;
    }
  }
  sendMessage(chatId: number, text: string, opts?: { replyTo?: number; replyMarkup?: any }) {
    const body: any = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
    if (opts?.replyTo) {
      body.reply_to_message_id = opts.replyTo;
      body.allow_sending_without_reply = true;
    }
    if (opts?.replyMarkup) body.reply_markup = opts.replyMarkup;
    return this.call("sendMessage", body, false);
  }
  editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: any) {
    const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true };
    if (replyMarkup) body.reply_markup = replyMarkup;
    return this.call("editMessageText", body, false);
  }
  answerCallbackQuery(id: string, text?: string) {
    const body: any = { callback_query_id: id };
    if (text) body.text = text;
    return this.call("answerCallbackQuery", body, false);
  }
  sendChatAction(chatId: number, action: string) {
    return this.call("sendChatAction", { chat_id: chatId, action }, false);
  }
  sendVideo(chatId: number, videoUrl: string, caption: string, replyTo?: number) {
    const body: any = { chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call("sendVideo", body, true);
  }
  sendPhoto(chatId: number, photoUrl: string, caption: string, replyTo?: number) {
    const body: any = { chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call("sendPhoto", body, false);
  }

  sendAnimation(chatId: number, animationUrl: string, caption: string, replyTo?: number) {
    const body: any = { chat_id: chatId, animation: animationUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call("sendAnimation", body, true);
  }
  sendDocument(chatId: number, documentUrl: string, caption: string, replyTo?: number) {
    const body: any = { chat_id: chatId, document: documentUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call("sendDocument", body, true);
  }
  sendAudio(chatId: number, audioUrl: string, caption: string, replyTo?: number) {
    const body: any = { chat_id: chatId, audio: audioUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call("sendAudio", body, true);
  }
}

function extractUnitFromName(name: string) {
  const m = name.match(/^\s*(\d+)\s*/);
  if (!m) return { unit: 1, cleanName: name.trim() };
  const unit = Math.max(1, parseInt(m[1], 10));
  return { unit, cleanName: name.replace(/^\s*\d+\s*/g, "").trim() };
}

function parseNumberLoose(v: unknown): number | null {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (v == null) return null;
  const s = String(v).trim();
  if (!s) return null;
  const cleaned = s.replace(/,/g, "");
  const n = Number(cleaned);
  return Number.isFinite(n) ? n : null;
}

function normalizeKeyFromTitle(title: string) {
  const cleaned = stripPunct(title.toLowerCase()).replace(/\s+/g, " ").trim();
  return cleaned.replace(/\s+/g, "");
}

const NAME_TO_CODE: Record<string, { code: string; kind: Rate["kind"]; fa: string; emoji: string }> = {
  "us dollar": { code: "usd", kind: "currency", fa: "دلار آمریکا", emoji: "🇺🇸" },
  "euro": { code: "eur", kind: "currency", fa: "یورو", emoji: "🇪🇺" },
  "british pound": { code: "gbp", kind: "currency", fa: "پوند انگلیس", emoji: "🇬🇧" },
  "swiss franc": { code: "chf", kind: "currency", fa: "فرانک سوئیس", emoji: "🇨🇭" },
  "canadian dollar": { code: "cad", kind: "currency", fa: "دلار کانادا", emoji: "🇨🇦" },
  "australian dollar": { code: "aud", kind: "currency", fa: "دلار استرالیا", emoji: "🇦🇺" },
  "swedish krona": { code: "sek", kind: "currency", fa: "کرون سوئد", emoji: "🇸🇪" },
  "norwegian krone": { code: "nok", kind: "currency", fa: "کرون نروژ", emoji: "🇳🇴" },
  "russian ruble": { code: "rub", kind: "currency", fa: "روبل روسیه", emoji: "🇷🇺" },
  "thai baht": { code: "thb", kind: "currency", fa: "بات تایلند", emoji: "🇹🇭" },
  "singapore dollar": { code: "sgd", kind: "currency", fa: "دلار سنگاپور", emoji: "🇸🇬" },
  "hong kong dollar": { code: "hkd", kind: "currency", fa: "دلار هنگ‌کنگ", emoji: "🇭🇰" },
  "azerbaijani manat": { code: "azn", kind: "currency", fa: "منات آذربایجان", emoji: "🇦🇿" },
  "armenian dram": { code: "amd", kind: "currency", fa: "درام ارمنستان", emoji: "🇦🇲" },
  "danish krone": { code: "dkk", kind: "currency", fa: "کرون دانمارک", emoji: "🇩🇰" },
  "uae dirham": { code: "aed", kind: "currency", fa: "درهم امارات", emoji: "🇦🇪" },
  "japanese yen": { code: "jpy", kind: "currency", fa: "ین ژاپن", emoji: "🇯🇵" },
  "turkish lira": { code: "try", kind: "currency", fa: "لیر ترکیه", emoji: "🇹🇷" },
  "chinese yuan": { code: "cny", kind: "currency", fa: "یوان چین", emoji: "🇨🇳" },
  "ksa riyal": { code: "sar", kind: "currency", fa: "ریال عربستان", emoji: "🇸🇦" },
  "indian rupee": { code: "inr", kind: "currency", fa: "روپیه هند", emoji: "🇮🇳" },
  "ringgit": { code: "myr", kind: "currency", fa: "رینگیت مالزی", emoji: "🇲🇾" },
  "afghan afghani": { code: "afn", kind: "currency", fa: "افغانی", emoji: "🇦🇫" },
  "kuwaiti dinar": { code: "kwd", kind: "currency", fa: "دینار کویت", emoji: "🇰🇼" },
  "iraqi dinar": { code: "iqd", kind: "currency", fa: "دینار عراق", emoji: "🇮🇶" },
  "bahraini dinar": { code: "bhd", kind: "currency", fa: "دینار بحرین", emoji: "🇧🇭" },
  "omani rial": { code: "omr", kind: "currency", fa: "ریال عمان", emoji: "🇴🇲" },
  "qatari riyal": { code: "qar", kind: "currency", fa: "ریال قطر", emoji: "🇶🇦" },
  "gold gram 18k": { code: "gold_gram_18k", kind: "gold", fa: "گرم طلای ۱۸", emoji: "💰" },
  "gold mithqal": { code: "gold_mithqal", kind: "gold", fa: "مثقال طلا", emoji: "💰" },
  "gold ounce": { code: "gold_ounce", kind: "gold", fa: "اونس طلا", emoji: "💰" },
  "azadi": { code: "coin_azadi", kind: "gold", fa: "سکه آزادی", emoji: "🪙" },
  "emami": { code: "coin_emami", kind: "gold", fa: "سکه امامی", emoji: "🪙" },
  "½azadi": { code: "coin_half_azadi", kind: "gold", fa: "نیم سکه", emoji: "🪙" },
  "¼azadi": { code: "coin_quarter_azadi", kind: "gold", fa: "ربع سکه", emoji: "🪙" },
  "gerami": { code: "coin_gerami", kind: "gold", fa: "سکه گرمی", emoji: "🪙" },
  "bitcoin": { code: "btc", kind: "crypto", fa: "بیت‌کوین", emoji: "💎" },
  "ethereum": { code: "eth", kind: "crypto", fa: "اتریوم", emoji: "💎" },
  "tether usdt": { code: "usdt", kind: "crypto", fa: "تتر", emoji: "💎" },
  "bnb": { code: "bnb", kind: "crypto", fa: "بی‌ان‌بی", emoji: "💎" },
  "xrp": { code: "xrp", kind: "crypto", fa: "ریپل", emoji: "💎" },
  "usdc": { code: "usdc", kind: "crypto", fa: "USDC", emoji: "💎" },
  "solana": { code: "sol", kind: "crypto", fa: "سولانا", emoji: "💎" },
  "tron": { code: "trx", kind: "crypto", fa: "ترون", emoji: "💎" },
  "dogecoin": { code: "doge", kind: "crypto", fa: "دوج‌کوین", emoji: "💎" },
  "cardano": { code: "ada", kind: "crypto", fa: "کاردانو", emoji: "💎" },
  "bitcoin cash": { code: "bch", kind: "crypto", fa: "بیت‌کوین‌کش", emoji: "💎" },
  "chainlink": { code: "link", kind: "crypto", fa: "چین‌لینک", emoji: "💎" },
  "monero": { code: "xmr", kind: "crypto", fa: "مونرو", emoji: "💎" },
  "stellar": { code: "xlm", kind: "crypto", fa: "استلار", emoji: "💎" },
  "zcash": { code: "zec", kind: "crypto", fa: "زی‌کش", emoji: "💎" },
  "litecoin": { code: "ltc", kind: "crypto", fa: "لایت‌کوین", emoji: "💎" },
  "polkadot": { code: "dot", kind: "crypto", fa: "پولکادات", emoji: "💎" },
  "toncoin": { code: "ton", kind: "crypto", fa: "تون", emoji: "💎" },
  "filecoin": { code: "fil", kind: "crypto", fa: "فایل‌کوین", emoji: "💎" },
  "cosmos": { code: "atom", kind: "crypto", fa: "کازماس", emoji: "💎" },
};

async function fetchAndMergeData(_env: Env): Promise<{ stored: Stored; rawHash: string }> {
  const res = await fetch(PRICES_JSON_URL, { headers: UA_HEADERS });
  if (!res.ok) throw new Error(`Failed to fetch merged prices: HTTP ${res.status}`);
  const rawText = await res.text();
  const rawHash = await sha256Hex(rawText);
  const arr = JSON.parse(rawText) as Array<{ name: string; price: string | number }>;
  const rates: Record<string, Rate> = {};
  const fetchedAtMs = Date.now();
  let usdToman: number | null = null;

  for (const row of arr) {
    if (!row?.name) continue;
    const { cleanName } = extractUnitFromName(String(row.name));
    if (cleanName.toLowerCase() === "us dollar") {
      const n = parseNumberLoose(row.price);
      if (n != null) usdToman = n;
      break;
    }
  }

  for (const row of arr) {
    if (!row?.name) continue;

    const { unit, cleanName } = extractUnitFromName(String(row.name));
    const nameLower = cleanName.toLowerCase();
    const priceNum = parseNumberLoose(row.price);
    if (priceNum == null) continue;

    const mapped = NAME_TO_CODE[nameLower];
    const code = mapped?.code ?? normalizeKeyFromTitle(cleanName);

    let kind: Rate["kind"] = mapped?.kind ?? "currency";
    let tomanPrice = priceNum;
    let usdPrice: number | undefined;
    let change24h: number | undefined;

    const maybeChange =
      (row as any)?.percent_change_24h ??
      (row as any)?.percentChange24h ??
      (row as any)?.change_24h ??
      (row as any)?.change24h ??
      (row as any)?.pct_change_24h ??
      (row as any)?.pctChange24h;

    const chNum = parseNumberLoose(maybeChange);
    if (chNum != null) change24h = chNum;

    const isCryptoNumber = typeof row.price === "number";
    const isUsdGoldProxy = nameLower === "gold ounce" || nameLower === "pax gold" || nameLower === "tether gold";

    if (isCryptoNumber || isUsdGoldProxy) {
      usdPrice = priceNum;
      if (usdToman != null) tomanPrice = priceNum * usdToman;
      kind = "crypto";
    }

    if (kind === "currency" && usdToman != null) {
      usdPrice = code === "usd" ? 1 : tomanPrice / usdToman;
    }

    const meta = mapped
      ? { emoji: mapped.emoji, fa: mapped.fa }
      : META[code] ?? { emoji: kind === "crypto" ? "💎" : "💱", fa: cleanName };

    rates[code] = { price: tomanPrice, unit, kind, title: cleanName, emoji: meta.emoji, fa: meta.fa, usdPrice, change24h };
  }

  const stored: Stored = { fetchedAtMs, source: PRICES_JSON_URL, rates };
  return { stored, rawHash };
}

async function refreshRates(env: Env) {
  const { stored, rawHash } = await fetchAndMergeData(env);
  const prevHash = await env.BOT_KV.get(KEY_HASH);
  const changed = prevHash !== rawHash;
  if (changed) {
    await env.BOT_KV.put(KEY_HASH, rawHash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  } else {
    const prev = await env.BOT_KV.get(KEY_RATES);
    if (!prev) await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  }
  memStored = stored;
  memStoredReadAt = Date.now();
  return { ok: true, changed, count: Object.keys(stored.rates).length };
}

async function getStoredOrRefresh(env: Env, ctx: ExecutionContext): Promise<Stored> {
  const now = Date.now();
  if (memStored && now - memStoredReadAt <= MEM_STORED_TTL_MS) {
    const age = now - memStored.fetchedAtMs;
    if (age > BG_REFRESH_AT_MS) ctx.waitUntil(refreshRates(env).catch(() => {}));
    return memStored;
  }
  const txt = await env.BOT_KV.get(KEY_RATES);
  if (txt) {
    const stored = JSON.parse(txt) as Stored;
    memStored = stored;
    memStoredReadAt = now;
    const age = now - stored.fetchedAtMs;
    if (age > FORCE_REFRESH_AT_MS) {
      await refreshRates(env).catch(() => {});
      if (memStored) return memStored;
    } else if (age > BG_REFRESH_AT_MS) {
      ctx.waitUntil(refreshRates(env).catch(() => {}));
    }
    return stored;
  }
  await refreshRates(env);
  const txt2 = await env.BOT_KV.get(KEY_RATES);
  if (!txt2) throw new Error("no data");
  const stored2 = JSON.parse(txt2) as Stored;
  memStored = stored2;
  memStoredReadAt = now;
  return stored2;
}

function chunkText(s: string, maxLen = 3500) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen));
  return out;
}

function getUpdateTimeStr(stored: Stored) {
  const date = new Date(stored.fetchedAtMs + 3.5 * 3600_000);
  return date.toISOString().substr(11, 5);
}

function getDisplayBaseForFiat(r: Rate) {
  const unit = Math.max(1, r.unit || 1);
  const showUnit = r.kind === "currency" && unit > 1;
  const baseAmount = showUnit ? unit : 1;
  const baseToman = showUnit ? Math.round(r.price) : Math.round(r.price / unit);
  return { unit, showUnit, baseAmount, baseToman };
}

const FIAT_PRIORITY = ["usd", "eur", "aed", "try", "afn", "iqd", "gbp"];
const CRYPTO_PRIORITY = ["btc", "eth", "ton", "usdt", "trx", "not", "doge", "sol"];

function buildAll(stored: Stored) {
  const rates = stored.rates;
  const codes = Object.keys(rates);
  const goldItems: string[] = [];
  const currencyItems: string[] = [];
  const cryptoItems: string[] = [];

  codes.sort((a, b) => {
    const rA = rates[a], rB = rates[b];
    if (rA.kind !== rB.kind) return 0;
    if (rA.kind === "currency") {
      const idxA = FIAT_PRIORITY.indexOf(a), idxB = FIAT_PRIORITY.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    if (rA.kind === "crypto") {
      const idxA = CRYPTO_PRIORITY.indexOf(a), idxB = CRYPTO_PRIORITY.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return a.localeCompare(b);
  });

  for (const c of codes) {
    const r = rates[c];
    if (r.kind === "crypto") {
      const per1Toman = Math.round(r.price / Math.max(1, r.unit || 1));
      const priceStr = formatToman(per1Toman);
      const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
      const changePart = typeof r.change24h === "number" ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%` : "";
      const line = `💎 <b>${r.fa}</b> (${c.toUpperCase()})
└ ${priceStr} ت | ${usdP}$${changePart}`;
      cryptoItems.push(line);
      continue;
    }

    const { showUnit, baseAmount, baseToman } = getDisplayBaseForFiat(r);
    const priceStr = formatToman(baseToman);
    const meta = META[c] ?? { emoji: "💱", fa: r.title || c.toUpperCase() };
    const usd = stored.rates["usd"];
    const usdPer1 = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
    const usdEq = usdPer1 && c !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
    const unitPrefix = showUnit ? `${baseAmount} ` : "";
    const usdPart = usdEq != null ? ` (≈ $${formatUSD(usdEq)})` : "";
    const line = `${meta.emoji} <b>${unitPrefix}${meta.fa}:</b> \u200E<code>${priceStr}</code> تومان${usdPart}`;
    if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldItems.push(line);
    else currencyItems.push(line);
  }

  const lines: string[] = [];
  if (goldItems.length > 0) lines.push("🟡 <b>نرخ طلا و سکه</b>", "➖➖➖➖➖➖", ...goldItems, "");
  if (currencyItems.length > 0) lines.push("💵 <b>نرخ ارزهای بازار</b>", "➖➖➖➖➖➖", ...currencyItems, "");
  if (cryptoItems.length > 0) lines.push("🚀 <b>بازار ارز دیجیتال</b>", "➖➖➖➖➖➖", ...cryptoItems);
  lines.push("\n🕐 <b>بروزرسانی:</b> " + getUpdateTimeStr(stored));
  return lines.join("\n");
}

const PRICE_PAGE_SIZE = 8;

type PriceCategory = "fiat" | "crypto";
type PriceListItem = { code: string; category: PriceCategory; emoji: string; name: string; price: string };

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
  const codes = Object.keys(rates);

  if (category === "crypto") {
    const cryptoCodes = codes.filter((c) => rates[c]?.kind === "crypto");
    cryptoCodes.sort((a, b) => {
      const idxA = CRYPTO_PRIORITY.indexOf(a), idxB = CRYPTO_PRIORITY.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const items: PriceListItem[] = [];
    for (const c of cryptoCodes) {
      const r = rates[c];
      const per1 = Math.round(r.price / Math.max(1, r.unit || 1));
      const toman = formatToman(per1);
      const meta = CRYPTO_META[c] ?? { emoji: r.emoji || "💎", fa: r.fa || r.title || c.toUpperCase() };
      items.push({ code: c, category, emoji: meta.emoji, name: shortColText(meta.fa, 20), price: shortColText(`${toman} ت`, 16) });
    }
    return items;
  }

  const goldCodes: string[] = [];
  const currencyCodes: string[] = [];

  for (const c of codes) {
    const r = rates[c];
    if (!r || r.kind === "crypto") continue;
    if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldCodes.push(c);
    else currencyCodes.push(c);
  }

  goldCodes.sort((a, b) => a.localeCompare(b));
  currencyCodes.sort((a, b) => {
    const idxA = FIAT_PRIORITY.indexOf(a), idxB = FIAT_PRIORITY.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const merged = [...goldCodes, ...currencyCodes];
  const items: PriceListItem[] = [];

  for (const c of merged) {
    const r = rates[c];
    const { showUnit, baseAmount, baseToman } = getDisplayBaseForFiat(r);
    const priceStr = formatToman(baseToman);
    const meta = META[c] ?? { emoji: "💱", fa: r.title || r.fa || c.toUpperCase() };
    items.push({ code: c, category, emoji: meta.emoji, name: shortColText(showUnit ? `${baseAmount} ${meta.fa}` : meta.fa, 20), price: shortColText(`${priceStr} ت`, 16) });
    void meta;
  }

  return items;
}

function buildPricesKeyboard(category: PriceCategory, page: number, totalPages: number, items: PriceListItem[]) {
  const start = page * PRICE_PAGE_SIZE;
  const slice = items.slice(start, start + PRICE_PAGE_SIZE);

  const rows: Array<Array<{ text: string; callback_data: string }>> = [];

  for (const it of slice) {
    const cb = `show:${category}:${it.code}:${page}`;
    rows.push([{ text: it.price, callback_data: cb }, { text: `${it.emoji} ${it.name}`, callback_data: cb }]);
  }

  const prevCb = page > 0 ? `page:${category}:${page - 1}` : "noop";
  const nextCb = page + 1 < totalPages ? `page:${category}:${page + 1}` : "noop";

  rows.push([{ text: "بعدی ⬅️", callback_data: nextCb }, { text: "🏠 خانه", callback_data: "start_menu" }, { text: "➡️ قبلی", callback_data: prevCb }]);

  return { inline_keyboard: rows };
}

function buildCategoryHeaderText(category: PriceCategory, page: number, totalPages: number, timeStr: string) {
  if (category === "crypto") return ["🪙 <b>قیمت ارز دیجیتال</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join("\n");
  return ["💱 <b>قیمت ارز و طلا</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join("\n");
}

function buildPriceDetailText(stored: Stored, category: PriceCategory, code: string) {
  const r = stored.rates?.[code];
  if (!r) return "❗️این آیتم پیدا نشد.";
  const { baseAmount, baseToman, showUnit } = getDisplayBaseForFiat(r);
  const toman = formatToman(baseToman);

  if (category === "crypto") {
    const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
    const change = r.change24h ?? 0;
    const changeEmoji = change >= 0 ? "🟢" : "🔴";
    const changeStr = Math.abs(change).toFixed(2) + "%";
    const meta = CRYPTO_META[code] ?? { emoji: r.emoji || "💎", fa: r.fa || r.title || code.toUpperCase() };
    return [`${meta.emoji} <b>${meta.fa}</b> (${code.toUpperCase()})`, `💶 قیمت: <code>${toman}</code> تومان`, `💵 قیمت دلاری: <code>${usdP}</code> $`, `📈 تغییر 24ساعته: ${changeEmoji} <b>${changeStr}</b>`, "", `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`].join("\n");
  }

  const meta = META[code] ?? { emoji: "💱", fa: r.title || r.fa || code.toUpperCase() };
  const usd = stored.rates["usd"];
  const usdPer1 = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
  const usdEq = usdPer1 && code !== "usd" && r.kind === "currency" ? baseToman / usdPer1 : null;
  const unitPrefix = showUnit ? `${baseAmount} ` : "";

  return [`${meta.emoji} <b>${unitPrefix}${meta.fa}</b>`, `💶 قیمت: <code>${toman}</code> تومان`, usdEq != null ? `💵 معادل دلار: <code>${formatUSD(usdEq)}</code> $` : "", r.unit && r.unit !== 1 ? `📦 واحد مرجع: <code>${r.unit}</code>` : "", "", `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`].filter(Boolean).join("\n");
}

function replyCurrency(code: string, r: Rate, amount: number, stored: Stored, hasAmount: boolean) {
  const refUnit = Math.max(1, r.unit || 1);

  if (r.kind === "crypto") {
    const qty = hasAmount ? amount : 1;
    const totalToman = (r.price / refUnit) * (qty * refUnit);

    const per1Usd = typeof r.usdPrice === "number" ? r.usdPrice : null;
    const totalUsdDirect = per1Usd ? per1Usd * qty : null;

    const usd = stored.rates["usd"];
    const usdPer1Toman = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
    const totalUsd = totalUsdDirect ?? (usdPer1Toman ? totalToman / usdPer1Toman : null);

    const changeLine = typeof r.change24h === "number" ? `${r.change24h >= 0 ? "🟢" : "🔴"} <b>تغییر 24h:</b> ${r.change24h.toFixed(2)}%` : null;
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

  const refCount = hasAmount ? amount : 1;
  const baseUnits = refUnit > 1 ? refCount * refUnit : refCount;

  const per1Toman = r.price / refUnit;
  const totalToman = per1Toman * baseUnits;

  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;

  const LRI = "\u2066";
  const RLI = "\u2067";
  const PDI = "\u2069";

  const meta = META[code] ?? { emoji: "💱", fa: r.fa || r.title || code.toUpperCase() };
  const titleLine = `${LRI}${refCount}${PDI} ${RLI}${meta.fa}${PDI} ${LRI}${meta.emoji}${PDI}`;

  const lines: string[] = [];
  lines.push(`<b>${titleLine}</b>`);
  if (code !== "usd" && totalUsd != null) lines.push(`💵 معادل دلار: <code>${formatUSD(totalUsd)}</code> $`);
  lines.push(`💶 <code>${formatToman(Math.round(totalToman))}</code> تومان`);
  return lines.join("\n");
}

function replyGold(rGold: Rate, amount: number, stored: Stored) {
  const refUnit = Math.max(1, rGold.unit || 1);
  const qty = amount || 1;

  const perRefToman = rGold.price;
  const per1Toman = rGold.price / refUnit;
  const totalToman = per1Toman * (qty * refUnit);

  const usd = stored.rates["usd"];
  const usdPer1Toman = usd ? usd.price / Math.max(1, usd.unit || 1) : null;

  const perRefUsd = usdPer1Toman ? perRefToman / usdPer1Toman : null;
  const totalUsd = usdPer1Toman ? totalToman / usdPer1Toman : null;

  const unitLabel = refUnit > 1 ? `${refUnit} ${rGold.fa}` : `${rGold.fa}`;

  const lines: string[] = [];
  lines.push(`🟡 <b>${rGold.fa}</b>`);
  lines.push("➖➖➖➖➖➖");
  lines.push(`🧾 <b>واحد:</b> <code>${unitLabel}</code>`);
  lines.push(`💶 <b>قیمت واحد:</b> <code>${formatToman(Math.round(perRefToman))}</code> تومان${perRefUsd != null ? ` (≈ <code>${formatUSD(perRefUsd)}</code> $)` : ""}`);
  lines.push(`🧮 <b>تعداد:</b> <code>${qty}</code>`);
  lines.push(`✅ <b>جمع کل:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان${totalUsd != null ? ` (≈ <code>${formatUSD(totalUsd)}</code> $)` : ""}`);
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

const HELP_KEYBOARD = { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start_menu" }]] };

function getHelpMessage() {
  return `<b>🤖 راهنمای استفاده از ربات:</b>

1️⃣ <b>قیمت ارز:</b> نام ارز را بفرستید (دلار، یورو، افغانی).
2️⃣ <b>کریپتو:</b> نام ارز دیجیتال را بفرستید (بیت کوین، اتریوم، BTC، TON).
3️⃣ <b>تبدیل:</b> مقدار + نام ارز (مثلاً: ۱۰۰ دلار، 0.5 بیت کوین).
4️⃣ <b>طلا و سکه:</b> کلمه «طلا»، «سکه» یا «مثقال» را بفرستید.
5️⃣ <b>دانلود اینستاگرام/توییتر/X:</b> لینک پست را بفرستید.

🔸 قیمت‌های کریپتو هم به دلار و هم به تومان محاسبه می‌شوند.
🔸 نرخ تتر/دلار از بازار آزاد گرفته می‌شود.`;
}

const COBALT_HEADERS: Record<string, string> = {
  Accept: "application/json",
  "Content-Type": "application/json",
  "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/1.0)",
  Origin: "https://cobalt.tools",
  Referer: "https://cobalt.tools/",
};

function pickCobaltUrl(text: string): string | null {
  const m = text.match(/https?:\/\/[^\s<>()]+/i);
  if (!m) return null;
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
      h === "fixupx.com";
    return ok ? u.toString() : null;
  } catch {
    return null;
  }
}

function isTwitterTarget(urlStr: string) {
  try {
    const u = new URL(urlStr);
    const h = u.hostname.toLowerCase();
    return h === "twitter.com" || h.endsWith(".twitter.com") || h === "x.com" || h.endsWith(".x.com") || h === "t.co" || h === "fxtwitter.com" || h === "vxtwitter.com" || h === "fixupx.com";
  } catch {
    return false;
  }
}

function extractCobaltCaption(data: any): string | null {
  const candidates: unknown[] = [
    data?.caption,
    data?.description,
    data?.title,
    data?.meta?.caption,
    data?.meta?.description,
    data?.meta?.title,
    data?.metadata?.caption,
    data?.metadata?.description,
    data?.metadata?.title,
    data?.post?.caption,
    data?.post?.text,
    data?.tweet?.full_text,
    data?.tweet?.fullText,
    data?.tweet?.text,
    data?.statusText,
  ];
  for (const c of candidates) {
    if (typeof c === "string") {
      const t = cleanText(c);
      if (t) return t;
    }
  }
  return null;
}

function buildCobaltCaption(sourceUrl: string, captionText: string | null) {
  const linkPart = `🔗 <a href="${escapeAttr(sourceUrl)}">منبع</a>`;
  const cap = captionText ? escapeHtml(cleanText(captionText)) : "";
  const out = cap ? `${cap}\n\n${linkPart}` : linkPart;
  return truncate(out, MAX_MEDIA_CAPTION_LEN);
}

async function processCobaltResponse(tg: Telegram, chatId: number, data: any, sourceUrl: string, replyTo?: number) {
  const status = data?.status;

  if (status === "error") {
    const code = typeof data?.error?.code === "string" ? data.error.code : null;
    throw new Error(code ? `Cobalt error: ${code}` : "Cobalt error");
  }

  const overallCaptionRaw = extractCobaltCaption(data);

  const sendMedia = async (kind: "video" | "photo" | "audio" | "animation" | "document", url: string, cap: string) => {
    if (kind === "photo") return tg.sendPhoto(chatId, url, cap, replyTo);
    if (kind === "audio") return tg.sendAudio(chatId, url, cap, replyTo);
    if (kind === "animation") return tg.sendAnimation(chatId, url, cap, replyTo);
    if (kind === "document") return tg.sendDocument(chatId, url, cap, replyTo);

    // default: video + fallback to document if Telegram rejects it
    const r = await tg.sendVideo(chatId, url, cap, replyTo);
    if (!r) return tg.sendDocument(chatId, url, cap, replyTo);
    return r;
  };

  const inferKindFromFilename = (filename?: string | null): "video" | "photo" | "audio" | "animation" | "document" => {
    const fn = typeof filename === "string" ? filename : "";
    const ext = (fn.split(".").pop() || "").toLowerCase();

    if (["jpg", "jpeg", "png", "webp"].includes(ext)) return "photo";
    if (["gif"].includes(ext)) return "animation";
    if (["mp3", "m4a", "aac", "opus", "ogg", "wav", "flac"].includes(ext)) return "audio";
    if (["mp4", "mkv", "webm", "mov"].includes(ext)) return "video";

    return "document";
  };

  if (status === "tunnel" || status === "redirect") {
    const url = typeof data?.url === "string" ? data.url : null;
    if (!url) throw new Error("Missing url");

    const cap = buildCobaltCaption(sourceUrl, overallCaptionRaw);
    const kind = inferKindFromFilename(data?.filename);
    await sendMedia(kind, url, cap);
    return;
  }

  if (status === "local-processing") {
    const tunnels = Array.isArray(data?.tunnel) ? (data.tunnel as unknown[]).filter((x) => typeof x === "string") : [];
    const lpType = typeof data?.type === "string" ? data.type : "";
    const outName = typeof data?.output?.filename === "string" ? data.output.filename : null;

    // If it's a single ready-to-send item, try to send it directly.
    if (tunnels.length === 1) {
      const cap = buildCobaltCaption(sourceUrl, overallCaptionRaw);
      const kind =
        lpType === "gif" ? "animation" : lpType === "audio" ? "audio" : inferKindFromFilename(outName ?? data?.output?.filename);
      await sendMedia(kind, tunnels[0]!, cap);
      return;
    }

    // Otherwise: provide links for manual processing/merge.
    const linkPart = `🔗 <a href="${escapeAttr(sourceUrl)}">منبع</a>`;
    const head = `⚠️ این لینک نیاز به پردازش محلی دارد${lpType ? ` (${escapeHtml(lpType)})` : ""}.`;
    const list = tunnels.slice(0, 4).map((u, i) => `📥 <a href="${escapeAttr(u)}">دانلود فایل ${i + 1}</a>`).join("\n");
    const msg = truncate([head, list, linkPart].filter(Boolean).join("\n\n"), 3800);

    await tg.sendMessage(chatId, msg, { replyTo });
    return;
  }

  if (status === "picker" && Array.isArray(data?.picker) && data.picker.length > 0) {
    const items = data.picker.slice(0, 4);

    for (const item of items) {
      const itemCapRaw =
        (typeof item?.caption === "string" && cleanText(item.caption)) ||
        (typeof item?.description === "string" && cleanText(item.description)) ||
        (typeof item?.title === "string" && cleanText(item.title)) ||
        null;

      const cap = buildCobaltCaption(sourceUrl, itemCapRaw ?? overallCaptionRaw);
      const url = typeof item?.url === "string" ? item.url : null;
      if (!url) continue;

      if (item?.type === "photo") await sendMedia("photo", url, cap);
      else if (item?.type === "gif") await sendMedia("animation", url, cap);
      else await sendMedia("video", url, cap);
    }
    return;
  }

  throw new Error("Unknown Cobalt response");
}

function sleep(ms: number) {
  return new Promise<void>((resolve) => setTimeout(resolve, ms));
}

function pruneCobaltState(now: number) {
  for (const [k, v] of cobaltState) {
    if (now - v.lastSeenAt > COBALT_STATE_TTL_MS) cobaltState.delete(k);
  }
}

function getCobaltState(key: string, now: number): CobaltState {
  const prev = cobaltState.get(key);
  if (prev) {
    prev.lastSeenAt = now;
    return prev;
  }
  const s: CobaltState = { failCount: 0, cooldownUntil: 0, lastOkAt: 0, lastSeenAt: now };
  cobaltState.set(key, s);
  return s;
}

function markCobaltOk(baseUrl: string, now: number) {
  const s = getCobaltState(baseUrl, now);
  s.failCount = 0;
  s.cooldownUntil = 0;
  s.lastOkAt = now;
}

function markCobaltFail(
  baseUrl: string,
  now: number,
  info: { status?: number; timeout?: boolean; cooldownMs?: number },
) {
  const s = getCobaltState(baseUrl, now);
  s.failCount = Math.min(50, (s.failCount || 0) + 1);

  const st = info.status ?? 0;

  let cd = info.cooldownMs;
  if (!(typeof cd === "number" && Number.isFinite(cd) && cd > 0)) {
    cd = COBALT_COOLDOWN_OTHER_MS;
    if (info.timeout) cd = COBALT_COOLDOWN_TIMEOUT_MS;
    else if (st === 429) cd = COBALT_COOLDOWN_429_MS;
    else if (st === 403) cd = COBALT_COOLDOWN_403_MS;
    else if (st >= 500) cd = COBALT_COOLDOWN_5XX_MS;
    else if (st === 0) cd = COBALT_COOLDOWN_TIMEOUT_MS;
  }

  // clamp to avoid "infinite" cooldown if headers are weird
  cd = Math.max(1000, Math.min(24 * 60 * 60_000, Math.floor(cd)));

  s.cooldownUntil = Math.max(s.cooldownUntil || 0, now + cd);
}

function sortCobaltBases(bases: string[], now: number) {
  const scored = bases.map((b) => {
    const s = cobaltState.get(b);
    const fail = s?.failCount ?? 0;
    const cool = s?.cooldownUntil ?? 0;
    const okAt = s?.lastOkAt ?? 0;
    const inCool = cool > now;
    const score = (inCool ? 10_000 : 0) + fail * 50 - okAt / 1e12;
    return { b, score, inCool };
  });
  scored.sort((x, y) => x.score - y.score);
  const available = scored.filter((x) => !x.inCool).map((x) => x.b);
  const cooled = scored.filter((x) => x.inCool).map((x) => x.b);
  return [...available, ...cooled];
}

async function fetchWithTimeout(url: string, init: RequestInit, timeoutMs: number, ac?: AbortController) {
  const ctrl = ac ?? new AbortController();
  const t = setTimeout(() => {
    try {
      // AbortController.abort() may not accept a reason in every runtime
      (ctrl as any).abort?.("timeout");
    } catch {
      ctrl.abort();
    }
  }, timeoutMs);

  try {
    const res = await fetch(url, { ...init, signal: ctrl.signal });
    clearTimeout(t);
    return { res, timeout: false as const };
  } catch (e) {
    clearTimeout(t);
    const msg = String((e as any)?.name ?? "") + ":" + String((e as any)?.message ?? e);
    const isTimeout = msg.toLowerCase().includes("abort") || msg.toLowerCase().includes("timeout");
    return { res: null as Response | null, timeout: isTimeout as const };
  }
}

function parseFirstNumberHeader(v: string | null): number | null {
  if (!v) return null;
  const token = v.split(",")[0]?.split(";")[0]?.trim();
  if (!token) return null;
  const n = Number(token);
  return Number.isFinite(n) && n >= 0 ? n : null;
}

function parseRetryAfterMs(headers: Headers, nowMs: number): number | null {
  const raw = headers.get("Retry-After");
  if (!raw) return null;

  const s = raw.trim();
  const asSeconds = Number(s);
  if (Number.isFinite(asSeconds) && asSeconds >= 0) return Math.floor(asSeconds * 1000);

  const asDate = Date.parse(s);
  if (Number.isFinite(asDate)) return Math.max(0, asDate - nowMs);

  return null;
}

function parseRateLimitResetMs(headers: Headers): number | null {
  const n = parseFirstNumberHeader(headers.get("RateLimit-Reset"));
  return n == null ? null : Math.floor(n * 1000);
}

function bestCooldownFromHeadersMs(headers: Headers, nowMs: number): number | null {
  // per RateLimit-* spec: Retry-After takes precedence if present
  return parseRetryAfterMs(headers, nowMs) ?? parseRateLimitResetMs(headers);
}

function isHtmlResponse(res: Response): boolean {
  const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
  return ct.includes("text/html");
}

async function handleCobalt(tg: Telegram, chatId: number, targetUrl: string, replyTo?: number) {
  await tg.sendChatAction(chatId, "upload_video");

  const now = Date.now();
  pruneCobaltState(now);

  const isTw = isTwitterTarget(targetUrl);
  const timeoutMs = isTw ? COBALT_TIMEOUT_MS_TW : COBALT_TIMEOUT_MS;

  const bases = sortCobaltBases([...COBALT_INSTANCES], now);

  const body = JSON.stringify({
    url: targetUrl,
    downloadMode: "auto",
    filenameStyle: "basic",
    videoQuality: "1080",
    localProcessing: "disabled",
    youtubeVideoCodec: "h264",
    convertGif: true,
    allowH265: false,
  });

  const endpointsForBase = (baseUrl: string) => {
    const base = baseUrl.replace(/\/+$/, "");
    // per cobalt docs: main endpoint is POST /, but keep /api/json for older forks
    return [base, `${base}/api/json`];
  };

  const inFlightCtrls = new Set<AbortController>();
  const abortAll = () => {
    for (const c of inFlightCtrls) {
      try {
        c.abort();
      } catch {
        // ignore
      }
    }
    inFlightCtrls.clear();
  };

  const tryBase = async (baseUrl: string): Promise<boolean> => {
    const s0 = getCobaltState(baseUrl, Date.now());
    if ((s0.cooldownUntil || 0) > Date.now()) return false;

    const endpoints = endpointsForBase(baseUrl);

    for (const endpoint of endpoints) {
      if ((getCobaltState(baseUrl, Date.now()).cooldownUntil || 0) > Date.now()) return false;

      const ac = new AbortController();
      inFlightCtrls.add(ac);

      const { res, timeout } = await fetchWithTimeout(
        endpoint,
        { method: "POST", headers: COBALT_HEADERS, body },
        timeoutMs,
        ac,
      );

      inFlightCtrls.delete(ac);

      const now2 = Date.now();

      if (!res) {
        markCobaltFail(baseUrl, now2, { timeout: true });
        continue;
      }

      // quick reject obvious bot-protection/challenges
      if (isHtmlResponse(res)) {
        markCobaltFail(baseUrl, now2, { status: res.status || 403, cooldownMs: 2 * 60 * 60_000 });
        continue;
      }

      if (!res.ok) {
        const headerCd = res.status === 429 ? bestCooldownFromHeadersMs(res.headers, now2) : null;
        markCobaltFail(baseUrl, now2, { status: res.status, cooldownMs: headerCd ?? undefined });
        continue;
      }

      // some instances return non-json on success (rare) - treat as failure
      const ct = res.headers.get("content-type")?.toLowerCase() ?? "";
      if (!ct.includes("application/json")) {
        markCobaltFail(baseUrl, now2, { status: 0, cooldownMs: 60 * 60_000 });
        continue;
      }

      let data: any = null;
      try {
        data = await res.json<any>();
      } catch {
        markCobaltFail(baseUrl, now2, { status: 0 });
        continue;
      }

      // auth-required instances are effectively unusable without a token
      if (data?.status === "error" && typeof data?.error?.code === "string") {
        const code = String(data.error.code);
        if (code.startsWith("api.auth.")) {
          markCobaltFail(baseUrl, now2, { status: 401, cooldownMs: 12 * 60 * 60_000 });
          continue;
        }
      }

      try {
        await processCobaltResponse(tg, chatId, data, targetUrl, replyTo);
        markCobaltOk(baseUrl, Date.now());
        abortAll();
        return true;
      } catch (e: any) {
        // If Cobalt returns a structured error, treat it as a failure (but keep moving to other instances)
        const errCode = typeof data?.error?.code === "string" ? data.error.code : null;
        const cd =
          errCode && (errCode.includes("rate") || errCode.includes("limit"))
            ? bestCooldownFromHeadersMs(res.headers, now2) ?? undefined
            : undefined;

        markCobaltFail(baseUrl, Date.now(), { status: 0, cooldownMs: cd });
        void e;
        continue;
      }
    }

    return false;
  };

  const concurrency = 2;
  const inFlight = new Set<Promise<boolean>>();
  let idx = 0;

  const launch = (baseUrl: string) => {
    let p: Promise<boolean>;
    p = tryBase(baseUrl).catch(() => false);
    inFlight.add(p);
    p.finally(() => inFlight.delete(p));
    return p;
  };

  while (idx < bases.length || inFlight.size) {
    while (inFlight.size < concurrency && idx < bases.length) {
      launch(bases[idx++]!);
    }

    if (!inFlight.size) break;

    const ok = await Promise.race(inFlight);
    if (ok) return true;
  }

  abortAll();
  await tg.sendMessage(chatId, `❌ سرورهای دانلود پاسخگو نیستند. لطفاً دقایقی دیگر تلاش کنید.`, { replyTo });
  return true;
}

async function handleCallback(update: any, env: Env, ctx: ExecutionContext, tg: Telegram) {
  const cb = update?.callback_query;
  if (!cb) return;

  const data: string = cb.data || "";
  const chatId: number | undefined = cb.message?.chat?.id;
  const messageId: number | undefined = cb.message?.message_id;

  if (data.startsWith("cat:")) await tg.answerCallbackQuery(cb.id, "در حال دریافت قیمت‌ها...");
  else if (data.startsWith("show:")) await tg.answerCallbackQuery(cb.id, "📩 ارسال شد");
  else await tg.answerCallbackQuery(cb.id);

  if (!chatId || !messageId) return;

  if (data === "help_menu") {
    await tg.editMessageText(chatId, messageId, getHelpMessage(), HELP_KEYBOARD);
    return;
  }

  if (data === "start_menu") {
    await tg.editMessageText(chatId, messageId, "👋 سلام! به ربات خوش آمدید.\nچه کاری می‌توانم برایتان انجام دهم؟", START_KEYBOARD);
    return;
  }

  if (data === "noop") return;

  if (data.startsWith("cat:")) {
    const category = data.split(":")[1] as PriceCategory;
    const stored = await getStoredOrRefresh(env, ctx);
    const items = buildPriceItems(stored, category);
    const totalPages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
    const page = 0;
    const timeStr = getUpdateTimeStr(stored);
    const text = buildCategoryHeaderText(category, page, totalPages, timeStr);
    const kb = buildPricesKeyboard(category, page, totalPages, items);
    await tg.editMessageText(chatId, messageId, text, kb);
    return;
  }

  if (data.startsWith("page:")) {
    const parts = data.split(":");
    const category = parts[1] as PriceCategory;
    const pageReq = parseInt(parts[2] || "0", 10) || 0;
    const stored = await getStoredOrRefresh(env, ctx);
    const items = buildPriceItems(stored, category);
    const totalPages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
    const page = clampPage(pageReq, totalPages);
    const timeStr = getUpdateTimeStr(stored);
    const text = buildCategoryHeaderText(category, page, totalPages, timeStr);
    const kb = buildPricesKeyboard(category, page, totalPages, items);
    await tg.editMessageText(chatId, messageId, text, kb);
    return;
  }

  if (data.startsWith("show:")) {
    const parts = data.split(":");
    const category = parts[1] as PriceCategory;
    const code = (parts[2] || "").toLowerCase();
    const stored = await getStoredOrRefresh(env, ctx);
    const text = buildPriceDetailText(stored, category, code);
    await tg.sendMessage(chatId, text);
    return;
  }

  if (data === "get_all_prices") {
    await tg.editMessageText(chatId, messageId, "📌 یک دسته‌بندی را انتخاب کنید:", START_KEYBOARD);
    return;
  }
}

async function handleMessage(update: any, env: Env, ctx: ExecutionContext, tg: Telegram) {
  const msg = update?.message;
  if (!msg) return;

  const chatId: number | undefined = msg?.chat?.id;
  const text: string | undefined = msg?.text;
  const messageId: number | undefined = msg?.message_id;
  const userId: number | undefined = msg?.from?.id;

  if (!chatId || !text || !userId) return;

  const msgDate = msg.date;
  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - msgDate > 40) return;

  const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
  const replyTo = isGroup ? messageId : undefined;

  const now = Date.now();
  pruneCooldownMem(now);

  const memExp = cooldownMem.get(userId);
  if (memExp && memExp > now) return;

  const cooldownKey = `cooldown:${userId}`;
  const inCooldown = await env.BOT_KV.get(cooldownKey);

  if (inCooldown) {
    cooldownMem.set(userId, now + COOLDOWN_TTL_MS);
    return;
  }

  cooldownMem.set(userId, now + COOLDOWN_TTL_MS);
  ctx.waitUntil(env.BOT_KV.put(cooldownKey, "1", { expirationTtl: Math.ceil(COOLDOWN_TTL_MS / 1000) }));

  const cobaltUrl = pickCobaltUrl(text);
  if (cobaltUrl) {
    await handleCobalt(tg, chatId, cobaltUrl, replyTo);
    return;
  }

  const textNorm = norm(text);
  const cmd = normalizeCommand(textNorm);

  if (cmd === "/start") {
    await tg.sendMessage(
      chatId,
      "👋 سلام! به ربات [ارز چی؟] خوش آمدید.\n\nمن می‌توانم قیمت ارزها و کریپتو را بگویم و ویدیوهای اینستاگرام/توییتر را دانلود کنم.",
      { replyTo, replyMarkup: START_KEYBOARD },
    );
    return;
  }

  if (cmd === "/help") {
    await tg.sendMessage(chatId, getHelpMessage(), { replyTo, replyMarkup: HELP_KEYBOARD });
    return;
  }

  if (cmd === "/refresh") {
    const parts = stripPunct(textNorm).split(/\s+/).filter(Boolean);
    const key = parts[1] || "";
    if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return;
    const r = await refreshRates(env);
    await tg.sendMessage(chatId, r.ok ? "✅ بروزرسانی شد" : "⛔️ خطا", { replyTo });
    return;
  }

  const stored = await getStoredOrRefresh(env, ctx);

  if (cmd === "/all") {
    const out = buildAll(stored);
    const chunks = chunkText(out, 3800);
    for (const c of chunks) await tg.sendMessage(chatId, c, { replyTo });
    return;
  }

  const parsed = getParsedIntent(userId, textNorm, stored.rates);
  if (!parsed.code) return;

  const code = parsed.code;
  const amount = parsed.amount;

  const r = stored.rates[code];
  if (!r) return;

  const out = r.kind === "gold" ? replyGold(r, amount, stored) : replyCurrency(code, r, amount, stored, parsed.hasAmount);
  await tg.sendMessage(chatId, out, { replyTo });
}

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
        return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
      } catch (e: any) {
        return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), {
          headers: { "content-type": "application/json" },
          status: 502,
        });
      }
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });

    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await req.json<any>().catch(() => null);
    if (!update) return new Response("ok");
    if (update?.edited_message) return new Response("ok");

    const tg = new Telegram(env.TG_TOKEN);

    if (update?.callback_query) {
      ctx.waitUntil(handleCallback(update, env, ctx, tg).catch(() => {}));
      return new Response("ok");
    }

    if (update?.message) {
      ctx.waitUntil(handleMessage(update, env, ctx, tg).catch(() => {}));
      return new Response("ok");
    }

    return new Response("ok");
  },
};
