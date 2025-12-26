export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

// ============================
// Telegram types (minimal: only what this worker reads/uses)
// ============================

type TgChatType = "private" | "group" | "supergroup" | "channel";

type TgUser = {
  id: number;
};

type TgChat = {
  id: number;
  type: TgChatType;
};

type TgMessage = {
  message_id: number;
  date: number;
  text?: string;
  chat: TgChat;
  from?: TgUser;
};

type TgCallbackQuery = {
  id: string;
  data?: string;
  message?: TgMessage;
};

type TgUpdate = {
  update_id?: number;
  message?: TgMessage;
  edited_message?: TgMessage;
  callback_query?: TgCallbackQuery;
};

type InlineKeyboardButton =
  | { text: string; callback_data: string; url?: never }
  | { text: string; url: string; callback_data?: never };

type InlineKeyboardMarkup = { inline_keyboard: InlineKeyboardButton[][] };

// ============================
// Constants
// ============================

const BOT_USERNAME = "worker093578bot";

const PRICES_JSON_URL =
  "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/merged_prices.json";

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

const TG_JSON_HEADERS = { "content-type": "application/json" } as const;
const UA_HEADERS = { "User-Agent": "Mozilla/5.0" } as const;

// ============================
// Domain types
// ============================

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

// ============================
// Small in-memory caches
// ============================

const parseCache = new Map<
  string,
  { ts: number; code: string | null; amount: number; hasAmount: boolean }
>();
const userContext = new Map<number, { ts: number; code: string }>();

let memStored: Stored | null = null;
let memStoredReadAt = 0;

const cooldownMem = new Map<number, number>();

// ============================
// Metadata / Aliases
// ============================

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

const ALIASES: ReadonlyArray<{ keys: ReadonlyArray<string>; code: string }> = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "دلار امریکا", "usd", "us dollar", "dollar"], code: "usd" },
  { keys: ["یورو", "eur", "euro"], code: "eur" },
  { keys: ["پوند", "پوندانگلیس", "پوند انگلیس", "gbp", "britishpound"], code: "gbp" },
  { keys: ["فرانک", "فرانکسوئیس", "فرانک سوئیس", "chf", "swissfranc"], code: "chf" },
  {
    keys: [
      "دلارکانادا",
      "دلار کانادا",
      "دلارکانادایی",
      "دلار کانادایی",
      "دلارکاندا",
      "دلار کاندا",
      "cad",
      "canadiandollar",
      "canada",
      "کاندایی",
    ],
    code: "cad",
  },
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
  {
    keys: ["دینارعراق", "دینار عراق", "عراق", "عراقی", "iqd", "iraqidinar", "دینارعراقی", "دینار عراقی", "iraq"],
    code: "iqd",
  },
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

// ============================
// String normalization helpers
// ============================

const ZWNJ_RE = /\u200c/g;
const ARABIC_YEH_RE = /[ي]/g;
const ARABIC_KEH_RE = /[ك]/g;

// NOTE: keep this list conservative and explicit. Hyphen is escaped to avoid range semantics.
const STRIP_PUNCT_RE = /[.,!?؟؛:()[\]{}"'«»\-]/g;
const MULTISPACE_RE = /\s+/g;

function normalizeDigits(input: string): string {
  // Fast-path: only allocate when we see Persian/Arabic-Indic digits.
  let out: string | null = null;
  for (let i = 0; i < input.length; i++) {
    const c = input.charCodeAt(i);
    // Persian digits: ۰۱۲۳۴۵۶۷۸۹ (U+06F0..U+06F9)
    if (c >= 0x06f0 && c <= 0x06f9) {
      if (out === null) out = input.slice(0, i);
      out += String.fromCharCode(0x30 + (c - 0x06f0));
      continue;
    }
    // Arabic-Indic digits: ٠١٢٣٤٥٦٧٨٩ (U+0660..U+0669)
    if (c >= 0x0660 && c <= 0x0669) {
      if (out === null) out = input.slice(0, i);
      out += String.fromCharCode(0x30 + (c - 0x0660));
      continue;
    }
    if (out !== null) out += input[i];
  }
  return out ?? input;
}

function norm(input: string): string {
  return normalizeDigits(input)
    .replace(ZWNJ_RE, " ")
    .replace(ARABIC_YEH_RE, "ی")
    .replace(ARABIC_KEH_RE, "ک")
    .toLowerCase()
    .trim();
}

function stripPunct(input: string): string {
  return input.replace(STRIP_PUNCT_RE, " ").replace(MULTISPACE_RE, " ").trim();
}

function formatToman(n: number): string {
  const x = Math.round(n);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUSD(n: number): string {
  if (n < 1) return n.toFixed(4);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

function escapeHtml(s: string): string {
  // Enough for our usage (captions/text). Avoids allocations from DOM APIs.
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}

function cleanText(s: string): string {
  return s
    .replace(/\r\n/g, "\n")
    .replace(/\r/g, "\n")
    .replace(/\u0000/g, "")
    .replace(/[ \t]+\n/g, "\n")
    .replace(/\n{3,}/g, "\n\n")
    .replace(/[ \t]{2,}/g, " ")
    .trim();
}

async function sha256Hex(s: string): Promise<string> {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
}

const WORD_CHAR_RE = /[\p{L}\p{N}]/u;
function isWordChar(ch: string | undefined): boolean {
  return !!ch && WORD_CHAR_RE.test(ch);
}

function containsBounded(haystack: string, needle: string): boolean {
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

// ============================
// Alias index (precomputed once)
// ============================

const ALIAS_INDEX: ReadonlyArray<{ code: string; spaced: string[]; compact: string[]; maxLen: number }> = (() => {
  const mapped = ALIASES.map((a) => {
    const spaced = a.keys
      .map((k) => stripPunct(norm(String(k))).replace(MULTISPACE_RE, " ").trim())
      .filter(Boolean);
    const compact = spaced.map((k) => k.replace(MULTISPACE_RE, "")).filter(Boolean);
    spaced.sort((x, y) => y.length - x.length);
    compact.sort((x, y) => y.length - x.length);
    const maxLen = Math.max(spaced[0]?.length ?? 0, compact[0]?.length ?? 0);
    return { code: a.code, spaced, compact, maxLen };
  });
  mapped.sort((x, y) => y.maxLen - x.maxLen);
  return mapped;
})();

// ============================
// Amount parsing (optimized: no per-call map allocations, no slice allocations)
// ============================

const P_ONES: Record<string, number> = {
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
const P_TEENS: Record<string, number> = {
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
const P_TENS: Record<string, number> = {
  بیست: 20,
  سی: 30,
  چهل: 40,
  پنجاه: 50,
  شصت: 60,
  هفتاد: 70,
  هشتاد: 80,
  نود: 90,
};
const P_HUNDREDS: Record<string, number> = {
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
const P_SCALES: Record<string, number> = {
  هزار: 1e3,
  میلیون: 1e6,
  ملیون: 1e6,
  میلیارد: 1e9,
  بیلیون: 1e9,
  تریلیون: 1e12,
};

function parsePersianNumberRange(tokens: string[], start: number, end: number): number | null {
  // Matches previous behavior:
  // - ignores "و"
  // - returns null on unknown token
  // - requires > 0
  let total = 0;
  let current = 0;
  let hadToken = false;

  for (let i = start; i < end; i++) {
    const w = tokens[i];
    if (!w || w === "و") continue;
    hadToken = true;

    const scale = P_SCALES[w];
    if (scale != null) {
      const base = current || 1;
      total += base * scale;
      current = 0;
      continue;
    }

    const h = P_HUNDREDS[w];
    if (h != null) {
      current += h;
      continue;
    }

    const teen = P_TEENS[w];
    if (teen != null) {
      current += teen;
      continue;
    }

    const ten = P_TENS[w];
    if (ten != null) {
      current += ten;
      continue;
    }

    const one = P_ONES[w];
    if (one != null) {
      current += one;
      continue;
    }

    // (kept for strict behavioral parity with previous implementation)
    if (w === "صد") {
      current = (current || 1) * 100;
      continue;
    }

    return null;
  }

  if (!hadToken) return null;
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

function findCode(textNorm: string, rates: Record<string, Rate>): string | null {
  const cleaned = stripPunct(textNorm).replace(MULTISPACE_RE, " ").trim();
  const compact = cleaned.replace(MULTISPACE_RE, "");

  for (const a of ALIAS_INDEX) {
    for (const k of a.spaced) if (containsBounded(cleaned, k)) return a.code;
    for (const k of a.compact) if (containsBounded(compact, k)) return a.code;
  }

  if (
    containsBounded(cleaned, "دلار") &&
    (containsBounded(cleaned, "کانادا") ||
      containsBounded(cleaned, "کاندا") ||
      containsBounded(cleaned, "کانادایی") ||
      containsBounded(cleaned, "کاندایی"))
  ) {
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
    const title = rates[key]?.title;
    const t = title ? stripPunct(norm(title)).replace(MULTISPACE_RE, "") : "";
    if (compact === key || (t && compact === t)) return key;
  }

  return null;
}

function extractAmountOrNull(textNorm: string): number | null {
  const cleaned = stripPunct(textNorm).replace(MULTISPACE_RE, " ").trim();

  const digitScaled = parseDigitsWithScale(cleaned);
  if (digitScaled != null && digitScaled > 0) return digitScaled;

  if (!cleaned) return null;
  const tokens = cleaned.split(" ");
  const maxWin = Math.min(tokens.length, 10);

  for (let w = maxWin; w >= 1; w--) {
    for (let i = 0; i + w <= tokens.length; i++) {
      const n = parsePersianNumberRange(tokens, i, i + w);
      if (n != null && n > 0) return n;
    }
  }

  return null;
}

function pruneParseCache(now: number): void {
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  for (const [k, v] of parseCache) {
    if (now - v.ts > PARSE_TTL_MS) parseCache.delete(k);
  }
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  let i = 0;
  for (const k of parseCache.keys()) {
    parseCache.delete(k);
    if (++i > PARSE_CACHE_MAX) break;
    if (parseCache.size <= PARSE_CACHE_MAX) break;
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

function normalizeCommand(textNorm: string): string {
  const t = stripPunct(textNorm).trim();
  const first = t.split(/\s+/)[0] || "";
  return first.split("@")[0];
}

function pruneCooldownMem(now: number): void {
  if (cooldownMem.size <= COOLDOWN_MEM_MAX) return;
  for (const [k, exp] of cooldownMem) if (exp <= now) cooldownMem.delete(k);
  if (cooldownMem.size <= COOLDOWN_MEM_MAX) return;
  let i = 0;
  for (const k of cooldownMem.keys()) {
    cooldownMem.delete(k);
    if (++i > COOLDOWN_MEM_MAX) break;
    if (cooldownMem.size <= COOLDOWN_MEM_MAX) break;
  }
}

// ============================
// Telegram API client
// ============================

type TgApiOk<T> = { ok: true; result: T };
type TgApiErr = { ok: false; description?: string; error_code?: number };

type TgApiResponse<T> = TgApiOk<T> | TgApiErr;

class Telegram {
  private readonly base: string;

  constructor(token: string) {
    this.base = `https://api.telegram.org/bot${token}`;
  }

  private async call<T>(method: string, payload: unknown, logOnFail = false): Promise<TgApiResponse<T> | null> {
    try {
      const res = await fetch(`${this.base}/${method}`, {
        method: "POST",
        headers: TG_JSON_HEADERS,
        body: JSON.stringify(payload ?? {}),
      });
      if (!res.ok) {
        if (logOnFail) {
          const errText = await res.text().catch(() => "");
          console.error("TG call failed:", method, res.status, errText);
        }
        return null;
      }
      return (await res.json().catch(() => null)) as TgApiResponse<T> | null;
    } catch (e) {
      if (logOnFail) console.error("TG call exception:", method, String((e as Error | undefined)?.message ?? e));
      return null;
    }
  }

  sendMessage(
    chatId: number,
    text: string,
    opts?: { replyTo?: number; replyMarkup?: InlineKeyboardMarkup },
  ) {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };

    if (opts?.replyTo) {
      body.reply_to_message_id = opts.replyTo;
      body.allow_sending_without_reply = true;
    }
    if (opts?.replyMarkup) body.reply_markup = opts.replyMarkup;

    return this.call<unknown>("sendMessage", body, false);
  }

  editMessageText(chatId: number, messageId: number, text: string, replyMarkup?: InlineKeyboardMarkup) {
    const body: Record<string, unknown> = {
      chat_id: chatId,
      message_id: messageId,
      text,
      parse_mode: "HTML",
      disable_web_page_preview: true,
    };
    if (replyMarkup) body.reply_markup = replyMarkup;
    return this.call<unknown>("editMessageText", body, false);
  }

  answerCallbackQuery(id: string, text?: string) {
    const body: Record<string, unknown> = { callback_query_id: id };
    if (text) body.text = text;
    return this.call<unknown>("answerCallbackQuery", body, false);
  }

  sendChatAction(chatId: number, action: "upload_video" | "typing") {
    return this.call<unknown>("sendChatAction", { chat_id: chatId, action }, false);
  }

  sendVideo(chatId: number, videoUrl: string, caption: string, replyTo?: number) {
    const body: Record<string, unknown> = { chat_id: chatId, video: videoUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call<unknown>("sendVideo", body, true);
  }

  sendPhoto(chatId: number, photoUrl: string, caption: string, replyTo?: number) {
    const body: Record<string, unknown> = { chat_id: chatId, photo: photoUrl, caption, parse_mode: "HTML" };
    if (replyTo) {
      body.reply_to_message_id = replyTo;
      body.allow_sending_without_reply = true;
    }
    return this.call<unknown>("sendPhoto", body, false);
  }
}

// ============================
// Rates fetch + merge
// ============================

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

function normalizeKeyFromTitle(title: string): string {
  const cleaned = stripPunct(title.toLowerCase()).replace(MULTISPACE_RE, " ").trim();
  return cleaned.replace(MULTISPACE_RE, "");
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

type PriceRow = { name?: unknown; price?: unknown } & Record<string, unknown>;

function delay(ms: number): Promise<void> {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

async function fetchTextWithRetry(url: string, init: RequestInit, maxAttempts = 2): Promise<string> {
  // Small, bounded retry for transient failures. Keeps output identical.
  let lastErr: unknown = null;
  for (let attempt = 0; attempt < maxAttempts; attempt++) {
    try {
      const res = await fetch(url, init);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.text();
    } catch (e) {
      lastErr = e;
      if (attempt + 1 >= maxAttempts) break;
      const jitter = Math.floor(Math.random() * 80);
      await delay(120 + jitter);
    }
  }
  throw lastErr instanceof Error ? lastErr : new Error("fetch failed");
}

async function fetchAndMergeData(): Promise<{ stored: Stored; rawHash: string }> {
  const rawText = await fetchTextWithRetry(PRICES_JSON_URL, { headers: UA_HEADERS });
  const rawHash = await sha256Hex(rawText);

  const arr = JSON.parse(rawText) as PriceRow[];
  const rates: Record<string, Rate> = {};
  const fetchedAtMs = Date.now();

  let usdToman: number | null = null;

  // First pass: find USD toman for conversions.
  for (const row of arr) {
    const name = row?.name;
    if (name == null) continue;
    const { cleanName } = extractUnitFromName(String(name));
    if (cleanName.toLowerCase() === "us dollar") {
      const n = parseNumberLoose(row.price);
      if (n != null) usdToman = n;
      break;
    }
  }

  for (const row of arr) {
    const name = row?.name;
    if (name == null) continue;

    const { unit, cleanName } = extractUnitFromName(String(name));
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
      row.percent_change_24h ??
      row.percentChange24h ??
      row.change_24h ??
      row.change24h ??
      row.pct_change_24h ??
      row.pctChange24h;

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

async function refreshRates(env: Env) {
  const { stored, rawHash } = await fetchAndMergeData();
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
    try {
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
    } catch {
      // Corrupt KV -> fall through to refresh.
    }
  }

  await refreshRates(env);
  if (!memStored) throw new Error("no data");
  return memStored;
}

// ============================
// Formatting / keyboards
// ============================

function chunkText(s: string, maxLen = 3500): string[] {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen));
  return out;
}

function getUpdateTimeStr(stored: Stored): string {
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

function buildAll(stored: Stored): string {
  const rates = stored.rates;
  const codes = Object.keys(rates);

  const goldItems: string[] = [];
  const currencyItems: string[] = [];
  const cryptoItems: string[] = [];

  codes.sort((a, b) => {
    const rA = rates[a],
      rB = rates[b];
    if (rA.kind !== rB.kind) return 0;

    if (rA.kind === "currency") {
      const idxA = FIAT_PRIORITY.indexOf(a),
        idxB = FIAT_PRIORITY.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }

    if (rA.kind === "crypto") {
      const idxA = CRYPTO_PRIORITY.indexOf(a),
        idxB = CRYPTO_PRIORITY.indexOf(b);
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
      const changePart =
        typeof r.change24h === "number"
          ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%`
          : "";
      const line = `💎 <b>${r.fa}</b> (${c.toUpperCase()})\n└ ${priceStr} ت | ${usdP}$${changePart}`;
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

type PriceListItem = {
  code: string;
  category: PriceCategory;
  emoji: string;
  name: string;
  price: string;
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

function clampPage(page: number, totalPages: number): number {
  if (!Number.isFinite(page) || page < 0) return 0;
  if (page >= totalPages) return Math.max(0, totalPages - 1);
  return page;
}

function shortColText(s: string, max = 18): string {
  const t = s.replace(MULTISPACE_RE, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function buildPriceItems(stored: Stored, category: PriceCategory): PriceListItem[] {
  const rates = stored.rates;
  const codes = Object.keys(rates);

  if (category === "crypto") {
    const cryptoCodes = codes.filter((c) => rates[c]?.kind === "crypto");
    cryptoCodes.sort((a, b) => {
      const idxA = CRYPTO_PRIORITY.indexOf(a),
        idxB = CRYPTO_PRIORITY.indexOf(b);
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
    const idxA = FIAT_PRIORITY.indexOf(a),
      idxB = FIAT_PRIORITY.indexOf(b);
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

function buildPricesKeyboard(category: PriceCategory, page: number, totalPages: number, items: PriceListItem[]): InlineKeyboardMarkup {
  const start = page * PRICE_PAGE_SIZE;
  const slice = items.slice(start, start + PRICE_PAGE_SIZE);

  const rows: InlineKeyboardButton[][] = [];

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

function buildCategoryHeaderText(category: PriceCategory, page: number, totalPages: number, timeStr: string): string {
  if (category === "crypto")
    return ["🪙 <b>قیمت ارز دیجیتال</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join(
      "\n",
    );
  return ["💱 <b>قیمت ارز و طلا</b>", `📄 صفحه ${page + 1}/${totalPages}`, `🕐 <b>بروزرسانی:</b> ${timeStr}`].join("\n");
}

function buildPriceDetailText(stored: Stored, category: PriceCategory, code: string): string {
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
  const usdPer1 = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
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

function replyCurrency(code: string, r: Rate, amount: number, stored: Stored, hasAmount: boolean): string {
  const refUnit = Math.max(1, r.unit || 1);

  if (r.kind === "crypto") {
    const qty = hasAmount ? amount : 1;
    const totalToman = r.price * qty;

    const per1Usd = typeof r.usdPrice === "number" ? r.usdPrice : null;
    const totalUsdDirect = per1Usd ? per1Usd * qty : null;

    const usd = stored.rates["usd"];
    const usdPer1Toman = usd ? usd.price / Math.max(1, usd.unit || 1) : null;
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

function replyGold(rGold: Rate, amount: number, stored: Stored): string {
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
  lines.push(
    `💶 <b>قیمت واحد:</b> <code>${formatToman(Math.round(perRefToman))}</code> تومان${perRefUsd != null ? ` (≈ <code>${formatUSD(perRefUsd)}</code> $)` : ""}`,
  );
  lines.push(`🧮 <b>تعداد:</b> <code>${qty}</code>`);
  lines.push(
    `✅ <b>جمع کل:</b> <code>${formatToman(Math.round(totalToman))}</code> تومان${totalUsd != null ? ` (≈ <code>${formatUSD(totalUsd)}</code> $)` : ""}`,
  );
  return lines.join("\n");
}

const START_KEYBOARD: InlineKeyboardMarkup = {
  inline_keyboard: [
    [
      { text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` },
      { text: "📘 راهنما", callback_data: "help_menu" },
    ],
    [{ text: "💱 قیمت ارز و طلا", callback_data: "cat:fiat" }],
    [{ text: "🪙 قیمت ارز دیجیتال", callback_data: "cat:crypto" }],
  ],
};

const HELP_KEYBOARD: InlineKeyboardMarkup = { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start_menu" }]] };

function getHelpMessage(): string {
  return `<b>🤖 راهنمای استفاده از ربات:</b>

1️⃣ <b>قیمت ارز:</b> نام ارز را بفرستید (دلار، یورو، افغانی).
2️⃣ <b>کریپتو:</b> نام ارز دیجیتال را بفرستید (بیت کوین، اتریوم، BTC، TON).
3️⃣ <b>تبدیل:</b> مقدار + نام ارز (مثلاً: ۱۰۰ دلار، 0.5 بیت کوین).
4️⃣ <b>طلا و سکه:</b> کلمه «طلا»، «سکه» یا «مثقال» را بفرستید.
5️⃣ <b>دانلود اینستاگرام/توییتر/X:</b> لینک پست را بفرستید.

🔸 قیمت‌های کریپتو هم به دلار و هم به تومان محاسبه می‌شوند.
🔸 نرخ تتر/دلار از بازار آزاد گرفته می‌شود.`;
}

// ============================
// Public downloader helpers (Instagram / Twitter / X)
// ============================

const SOCIAL_UA =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/125.0.0.0 Safari/537.36";

const SOCIAL_HEADERS: Record<string, string> = {
  "user-agent": SOCIAL_UA,
  accept: "text/html,application/json;q=0.9,*/*;q=0.8",
  "accept-language": "en-US,en;q=0.9",
};

function pickCobaltUrl(text: string): string | null {
  // (Kept name for backward familiarity; behavior unchanged.)
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

function isTwitterTarget(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const h = u.hostname.toLowerCase();
    return (
      h === "twitter.com" ||
      h.endsWith(".twitter.com") ||
      h === "x.com" ||
      h.endsWith(".x.com") ||
      h === "t.co" ||
      h === "fxtwitter.com" ||
      h === "vxtwitter.com" ||
      h === "fixupx.com"
    );
  } catch {
    return false;
  }
}

function isInstagramTarget(urlStr: string): boolean {
  try {
    const u = new URL(urlStr);
    const h = u.hostname.toLowerCase();
    return h === "instagram.com" || h.endsWith(".instagram.com");
  } catch {
    return false;
  }
}

async function handlePublicDownload(tg: Telegram, chatId: number, targetUrl: string, replyTo?: number) {
  if (isTwitterTarget(targetUrl)) {
    await handleTwitterPublicDownload(tg, chatId, targetUrl, replyTo);
    return;
  }
  if (isInstagramTarget(targetUrl)) {
    await handleInstagramPublicDownload(tg, chatId, targetUrl, replyTo);
    return;
  }
  await tg.sendMessage(chatId, "❌ این لینک پشتیبانی نمی‌شود.", { replyTo });
}

async function resolveFinalUrlIfShortened(urlStr: string, maxHops = 2): Promise<string> {
  let current = urlStr;
  for (let i = 0; i < maxHops; i++) {
    let u: URL;
    try {
      u = new URL(current);
    } catch {
      return current;
    }
    const h = u.hostname.toLowerCase();
    if (h !== "t.co") return current;

    const res = await fetch(current, { method: "GET", redirect: "follow", headers: SOCIAL_HEADERS });
    if (!res.ok) return current;
    const finalUrl = res.url || current;
    if (finalUrl === current) return current;
    current = finalUrl;
  }
  return current;
}

function extractTweetId(urlStr: string): string | null {
  try {
    const u = new URL(urlStr);
    const m = u.pathname.match(/\/status\/(\d+)/i);
    if (m?.[1]) return m[1];
    const qid = u.searchParams.get("id");
    if (qid && /^\d+$/.test(qid)) return qid;
    return null;
  } catch {
    return null;
  }
}

function pickBestMp4Variant(variants: unknown): string | null {
  if (!Array.isArray(variants) || variants.length === 0) return null;
  let bestUrl: string | null = null;
  let bestBitrate = -1;

  for (const v of variants) {
    const r = v as Record<string, unknown>;
    const ct = typeof r?.content_type === "string" ? r.content_type : "";
    const url = typeof r?.url === "string" ? r.url : "";
    const br = typeof r?.bitrate === "number" ? r.bitrate : -1;
    if (!url) continue;
    if (ct.includes("video/mp4")) {
      if (bestUrl == null || br > bestBitrate) {
        bestUrl = url;
        bestBitrate = br;
      }
    }
  }

  return bestUrl;
}

type TwitterMedia = { kind: "video"; url: string } | { kind: "photo"; url: string };

function pickTwitterMedia(data: unknown): TwitterMedia | null {
  const d = data as Record<string, unknown>;
  const mediaDetails = Array.isArray((d as any)?.mediaDetails) ? ((d as any).mediaDetails as unknown[]) : [];

  // Prefer video if present
  for (const m of mediaDetails) {
    const mm = m as Record<string, unknown>;
    const type = typeof mm?.type === "string" ? mm.type : "";
    if (type === "video" || type === "animated_gif") {
      const url =
        pickBestMp4Variant((mm as any)?.video_info?.variants) ||
        pickBestMp4Variant((mm as any)?.videoInfo?.variants) ||
        null;
      if (url) return { kind: "video", url };
    }
  }

  // Photos
  for (const m of mediaDetails) {
    const mm = m as Record<string, unknown>;
    const type = typeof mm?.type === "string" ? mm.type : "";
    if (type === "photo") {
      const url =
        (typeof (mm as any)?.media_url_https === "string" && ((mm as any).media_url_https as string)) ||
        (typeof (mm as any)?.mediaUrlHttps === "string" && ((mm as any).mediaUrlHttps as string)) ||
        "";
      if (url) return { kind: "photo", url };
    }
  }

  const photos = Array.isArray((d as any)?.photos) ? ((d as any).photos as any[]) : [];
  if (photos[0]?.url) return { kind: "photo", url: String(photos[0].url) };

  return null;
}

function buildTwitterCaption(data: unknown): string {
  const d = data as any;
  const user = d?.user?.screen_name ? `@${String(d.user.screen_name)}` : "";
  const text = typeof d?.text === "string" ? d.text : "";
  const t = cleanText(text).slice(0, 700);
  const parts = [user, t].filter(Boolean);
  return escapeHtml(parts.join("\n"));
}

async function fetchTweetResult(tweetId: string): Promise<unknown | null> {
  for (let attempt = 0; attempt < 3; attempt++) {
    const token = String(Math.floor(Math.random() * 1e12));
    const url = `https://cdn.syndication.twimg.com/tweet-result?id=${tweetId}&token=${token}&lang=en`;
    const res = await fetch(url, { method: "GET", headers: { ...SOCIAL_HEADERS, accept: "application/json" } });
    if (!res.ok) continue;
    const txt = await res.text().catch(() => "");
    if (!txt || txt.trim().length < 5) continue;
    try {
      return JSON.parse(txt) as unknown;
    } catch {
      continue;
    }
  }
  return null;
}

async function handleTwitterPublicDownload(tg: Telegram, chatId: number, targetUrl: string, replyTo?: number) {
  await tg.sendChatAction(chatId, "upload_video");

  const finalUrl = await resolveFinalUrlIfShortened(targetUrl);
  const tweetId = extractTweetId(finalUrl);
  if (!tweetId) {
    await tg.sendMessage(chatId, "❌ نتونستم شناسه توییت رو از لینک پیدا کنم.", { replyTo });
    return;
  }

  const data = await fetchTweetResult(tweetId);
  if (!data) {
    await tg.sendMessage(
      chatId,
      "❌ دریافت اطلاعات توییت ناموفق بود (ممکنه لینک خصوصی/حذف شده باشه یا سرویس موقتاً محدود شده باشه).",
      { replyTo },
    );
    return;
  }

  const media = pickTwitterMedia(data);
  if (!media) {
    await tg.sendMessage(chatId, "❌ توی این توییت مدیای قابل دانلود پیدا نشد.", { replyTo });
    return;
  }

  const caption = buildTwitterCaption(data);

  if (media.kind === "video") {
    const sent = await tg.sendVideo(chatId, media.url, caption, replyTo);
    if (!sent) {
      await tg.sendMessage(chatId, `✅ لینک ویدیو:\n${escapeHtml(media.url)}`, { replyTo });
    }
    return;
  }

  await tg.sendPhoto(chatId, media.url, caption, replyTo);
}

function decodeHtmlEntities(s: string): string {
  return s
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&lt;/g, "<")
    .replace(/&gt;/g, ">");
}

function firstMetaContent(html: string, propertyOrName: string): string | null {
  const escaped = propertyOrName.replace(/[-/\\^$*+?.()|[\]{}]/g, "\\$&");
  const re = new RegExp(`<meta\\s+(?:property|name)="${escaped}"\\s+content="([^"]+)"`, "i");
  const m = html.match(re);
  if (!m?.[1]) return null;
  return decodeHtmlEntities(m[1]);
}

type InstagramMedia = { kind: "video"; url: string; thumb?: string } | { kind: "photo"; url: string };

function parseInstagramShortcode(urlStr: string): { type: "p" | "reel" | "tv"; shortcode: string } | null {
  try {
    const u = new URL(urlStr);
    const p = u.pathname.replace(/\/+$/, "");
    const m = p.match(/^\/(p|reel|tv)\/([A-Za-z0-9_-]+)/);
    if (!m) return null;
    return { type: m[1] as "p" | "reel" | "tv", shortcode: m[2] };
  } catch {
    return null;
  }
}

function pickInstagramFromGraphql(node: any): InstagramMedia | null {
  if (!node) return null;

  const edges = node?.edge_sidecar_to_children?.edges;
  if (Array.isArray(edges) && edges.length > 0) {
    let firstPhoto: InstagramMedia | null = null;
    for (const e of edges) {
      const picked = pickInstagramFromGraphql(e?.node);
      if (!picked) continue;
      if (picked.kind === "video") return picked;
      if (!firstPhoto && picked.kind === "photo") firstPhoto = picked;
    }
    return firstPhoto;
  }

  const isVideo = Boolean(node?.is_video);
  if (isVideo && typeof node?.video_url === "string" && node.video_url) {
    const thumb = typeof node?.display_url === "string" ? node.display_url : undefined;
    return { kind: "video", url: node.video_url, thumb };
  }

  if (typeof node?.display_url === "string" && node.display_url) {
    return { kind: "photo", url: node.display_url };
  }

  return null;
}

const IG_APP_ID = "936619743392459";

function decodeJsonStringLiteral(raw: string): string {
  try {
    return JSON.parse(`"${raw.replace(/"/g, '\\"')}"`) as string;
  } catch {
    return raw.replace(/\\\//g, "/");
  }
}

function isLikelyIgCdn(url: string): boolean {
  try {
    const u = new URL(url);
    const h = u.hostname.toLowerCase();
    return (
      h.includes("fbcdn") ||
      h.includes("cdninstagram") ||
      h.endsWith(".cdninstagram.com") ||
      h.startsWith("scontent") ||
      h.endsWith(".fbcdn.net")
    );
  } catch {
    return false;
  }
}

function firstMatchDecoded(html: string, re: RegExp): string | null {
  const m = html.match(re);
  if (!m?.[1]) return null;
  const v = decodeJsonStringLiteral(m[1]);
  return v || null;
}

function extractInstagramFromHtml(html: string): InstagramMedia | null {
  const ogVideo = firstMetaContent(html, "og:video") || firstMetaContent(html, "og:video:secure_url");
  if (ogVideo) {
    const ogImage = firstMetaContent(html, "og:image") || undefined;
    return { kind: "video", url: ogVideo, thumb: ogImage };
  }

  const ogImage = firstMetaContent(html, "og:image");
  if (ogImage) return { kind: "photo", url: ogImage };

  const videoByKey =
    firstMatchDecoded(html, /"video_url"\s*:\s*"([^"]+)"/i) ||
    firstMatchDecoded(html, /"videoUrl"\s*:\s*"([^"]+)"/i) ||
    null;

  if (videoByKey && videoByKey.includes(".mp4") && isLikelyIgCdn(videoByKey)) {
    const thumb =
      firstMatchDecoded(html, /"display_url"\s*:\s*"([^"]+)"/i) ||
      firstMatchDecoded(html, /"displayUrl"\s*:\s*"([^"]+)"/i) ||
      undefined;
    return { kind: "video", url: videoByKey, thumb: thumb && isLikelyIgCdn(thumb) ? thumb : undefined };
  }

  const imgByKey =
    firstMatchDecoded(html, /"display_url"\s*:\s*"([^"]+)"/i) ||
    firstMatchDecoded(html, /"displayUrl"\s*:\s*"([^"]+)"/i) ||
    null;
  if (imgByKey && isLikelyIgCdn(imgByKey)) return { kind: "photo", url: imgByKey };

  const anyMp4 =
    firstMatchDecoded(html, /(https?:\\\/\\\/[^"\\]+?\.mp4[^"\\]*)/i) ||
    (html.match(/https?:\/\/[^\s"'<>]+?\.mp4[^\s"'<>]*/i)?.[0] ?? null);

  if (anyMp4 && isLikelyIgCdn(anyMp4)) return { kind: "video", url: anyMp4 };

  return null;
}

async function tryFetchInstagramJson(canonical: string): Promise<InstagramMedia | null> {
  const url = `${canonical}?__a=1&__d=dis`;
  const headers: Record<string, string> = {
    ...SOCIAL_HEADERS,
    accept: "application/json",
    "x-ig-app-id": IG_APP_ID,
    "x-requested-with": "XMLHttpRequest",
    referer: canonical,
    origin: "https://www.instagram.com",
  };

  const res = await fetch(url, { method: "GET", headers });
  if (!res.ok) return null;

  const body = await res.text().catch(() => "");
  if (!body) return null;

  let data: any;
  try {
    data = JSON.parse(body);
  } catch {
    return null;
  }

  const node = data?.graphql?.shortcode_media;
  const fromGraphql = pickInstagramFromGraphql(node);
  if (fromGraphql) return fromGraphql;

  const item = Array.isArray(data?.items) ? data.items[0] : null;
  if (item) {
    const videoUrl =
      (typeof item?.video_versions?.[0]?.url === "string" && item.video_versions[0].url) ||
      (typeof item?.video_url === "string" && item.video_url) ||
      "";
    if (videoUrl) return { kind: "video", url: videoUrl };

    const imgUrl =
      (typeof item?.image_versions2?.candidates?.[0]?.url === "string" && item.image_versions2.candidates[0].url) ||
      (typeof item?.display_url === "string" && item.display_url) ||
      "";
    if (imgUrl) return { kind: "photo", url: imgUrl };
  }

  return null;
}

async function tryFetchInstagramEmbed(canonical: string): Promise<InstagramMedia | null> {
  const urls = [`${canonical}embed/captioned/`, `${canonical}embed/`, canonical];

  for (const url of urls) {
    const res = await fetch(url, {
      method: "GET",
      headers: {
        ...SOCIAL_HEADERS,
        referer: canonical,
        origin: "https://www.instagram.com",
      },
    });
    if (!res.ok) continue;

    const html = await res.text().catch(() => "");
    if (!html) continue;

    const extracted = extractInstagramFromHtml(html);
    if (extracted) return extracted;
  }

  return null;
}

async function handleInstagramPublicDownload(tg: Telegram, chatId: number, targetUrl: string, replyTo?: number) {
  await tg.sendChatAction(chatId, "upload_video");

  const info = parseInstagramShortcode(targetUrl);
  if (!info) {
    await tg.sendMessage(chatId, "❌ لینک اینستاگرام قابل تشخیص نبود.", { replyTo });
    return;
  }

  const canonical = `https://www.instagram.com/${info.type}/${info.shortcode}/`;

  const jsonMedia = await tryFetchInstagramJson(canonical);
  const media = jsonMedia || (await tryFetchInstagramEmbed(canonical));

  if (!media) {
    await tg.sendMessage(
      chatId,
      "❌ نتونستم مدیای اینستاگرام رو استخراج کنم. احتمالاً پست خصوصی/محدود شده یا اینستاگرام برای این لینک لاگین می‌خواد.",
      { replyTo },
    );
    return;
  }

  const caption = escapeHtml(canonical);

  if (media.kind === "video") {
    const sent = await tg.sendVideo(chatId, media.url, caption, replyTo);
    if (!sent) {
      await tg.sendMessage(chatId, `✅ لینک ویدیو:\n${escapeHtml(media.url)}`, { replyTo });
    }
    return;
  }

  await tg.sendPhoto(chatId, media.url, caption, replyTo);
}

// ============================
// Update handlers
// ============================

async function handleCallback(update: TgUpdate, env: Env, ctx: ExecutionContext, tg: Telegram) {
  const cb = update.callback_query;
  if (!cb) return;

  const data = cb.data || "";
  const chatId = cb.message?.chat?.id;
  const messageId = cb.message?.message_id;

  if (data.startsWith("cat:")) await tg.answerCallbackQuery(cb.id, "در حال دریافت قیمت‌ها...");
  else if (data.startsWith("show:")) await tg.answerCallbackQuery(cb.id, "📩 ارسال شد");
  else await tg.answerCallbackQuery(cb.id);

  if (!chatId || !messageId) return;

  if (data === "help_menu") {
    await tg.editMessageText(chatId, messageId, getHelpMessage(), HELP_KEYBOARD);
    return;
  }

  if (data === "start_menu") {
    await tg.editMessageText(
      chatId,
      messageId,
      "👋 سلام! به ربات خوش آمدید.\nچه کاری می‌توانم برایتان انجام دهم؟",
      START_KEYBOARD,
    );
    return;
  }

  if (data === "noop") return;

  if (data.startsWith("cat:")) {
    const category = (data.split(":")[1] || "") as PriceCategory;
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
    const category = (parts[1] || "") as PriceCategory;
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
    const category = (parts[1] || "") as PriceCategory;
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

async function handleMessage(update: TgUpdate, env: Env, ctx: ExecutionContext, tg: Telegram) {
  const msg = update.message;
  if (!msg) return;

  const chatId = msg.chat?.id;
  const text = msg.text;
  const messageId = msg.message_id;
  const userId = msg.from?.id;

  if (!chatId || !text || !userId) return;

  const nowSec = Math.floor(Date.now() / 1000);
  if (nowSec - msg.date > 40) return;

  const isGroup = msg.chat.type === "group" || msg.chat.type === "supergroup";
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

  const downloadUrl = pickCobaltUrl(text);
  if (downloadUrl) {
    await handlePublicDownload(tg, chatId, downloadUrl, replyTo);
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

// ============================
// Worker entry
// ============================

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
      } catch (e) {
        return new Response(JSON.stringify({ ok: false, error: String((e as Error | undefined)?.message ?? e) }), {
          headers: { "content-type": "application/json" },
          status: 502,
        });
      }
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });

    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = (await req.json().catch(() => null)) as TgUpdate | null;
    if (!update) return new Response("ok");
    if (update.edited_message) return new Response("ok");

    const tg = new Telegram(env.TG_TOKEN);

    if (update.callback_query) {
      ctx.waitUntil(handleCallback(update, env, ctx, tg).catch(() => {}));
      return new Response("ok");
    }

    if (update.message) {
      ctx.waitUntil(handleMessage(update, env, ctx, tg).catch(() => {}));
      return new Response("ok");
    }

    return new Response("ok");
  },
};
