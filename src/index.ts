export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

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

const PARSE_TTL_MS = 15_000;
const CONTEXT_TTL_MS = 60_000;
const PARSE_CACHE_MAX = 5_000;
const PRICE_PAGE_SIZE = 8;

type TgChatType = "private" | "group" | "supergroup" | "channel";

interface TgChat { id: number; type?: TgChatType }
interface TgFrom { id: number }
interface TgMessage { message_id: number; date: number; text?: string; chat: TgChat; from?: TgFrom }
interface TgCallbackQuery { id: string; data?: string; message?: { message_id?: number; chat?: TgChat } }
interface TgUpdate { message?: TgMessage; edited_message?: TgMessage; callback_query?: TgCallbackQuery }

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

type Stored = { fetchedAtMs: number; source: string; timestamp?: string; rates: Record<string, Rate> };

const META: Readonly<Record<string, { readonly emoji: string; readonly fa: string }>> = {
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

const CRYPTO_META: Readonly<Record<string, { readonly emoji: string; readonly fa: string }>> = {
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

const DIGIT_MAP: Readonly<Record<string, string>> = {
  "۰": "0","۱": "1","۲": "2","۳": "3","۴": "4","۵": "5","۶": "6","۷": "7","۸": "8","۹": "9",
  "٠": "0","١": "1","٢": "2","٣": "3","٤": "4","٥": "5","٦": "6","٧": "7","٨": "8","٩": "9",
} as const;

const normalizeDigits = (input: string): string => {
  let out = "";
  for (let i = 0; i < input.length; i++) out += DIGIT_MAP[input[i] as keyof typeof DIGIT_MAP] ?? input[i];
  return out;
};

const norm = (input: string): string => normalizeDigits(input)
  .replace(/\u200c/g, " ")
  .replace(/[ي]/g, "ی")
  .replace(/[ك]/g, "ک")
  .toLowerCase()
  .trim();

const stripPunct = (input: string): string => input.replace(/[.,!?؟؛:()[\]{}"'«»]/g, " ").replace(/\s+/g, " ").trim();

const formatToman = (n: number): string => Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
const formatUSD = (n: number): string => n < 1 ? n.toFixed(4) : n.toLocaleString("en-US", { maximumFractionDigits: 2 });

const sha256Hex = async (s: string): Promise<string> => {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  let out = "";
  for (let i = 0; i < bytes.length; i++) out += bytes[i].toString(16).padStart(2, "0");
  return out;
};

type AliasEntry = readonly [readonly string[], string];
const ALIASES: readonly AliasEntry[] = [
  [["دلار", "دلارامریکا", "دلارآمریکا", "دلار امریکا", "usd", "us dollar", "dollar"], "usd"],
  [["یورو", "eur", "euro"], "eur"],
  [["پوند", "پوندانگلیس", "پوند انگلیس", "gbp", "britishpound"], "gbp"],
  [["فرانک", "فرانکسوئیس", "فرانک سوئیس", "chf", "swissfranc"], "chf"],
  [["دلارکانادا", "دلار کانادا", "دلارکانادایی", "دلار کانادایی", "دلارکاندا", "دلار کاندا", "cad", "canadiandollar", "canada", "کاندایی"], "cad"],
  [["دلاراسترالیا", "دلار استرالیا", "استرالیا", "aud", "australiandollar"], "aud"],
  [["درهم", "درهمامارات", "درهم امارات", "امارات", "aed", "uaedirham"], "aed"],
  [["لیر", "لیرترکیه", "لیر ترکیه", "ترکیه", "try", "turkishlira"], "try"],
  [["ین", "ینژاپن", "ین ژاپن", "ژاپن", "jpy", "japaneseyen"], "jpy"],
  [["یوان", "یوانچین", "یوان چین", "چین", "cny", "chineseyuan"], "cny"],
  [["ریال عربستان", "ریالعربستان", "ریاض", "عربستان", "sar", "ksa", "saudiriyal"], "sar"],
  [["افغانی", "افغان", "afn", "afghanafghani"], "afn"],
  [["ریال عمان", "عمان", "omr", "omanirial"], "omr"],
  [["ریال قطر", "قطر", "qar", "qataririyal"], "qar"],
  [["دینارکویت", "دینار کویت", "کویت", "kwd", "kuwaitidinar"], "kwd"],
  [["دیناربحرین", "دینار بحرین", "بحرین", "bhd", "bahrainidinar"], "bhd"],
  [["دینارعراق", "دینار عراق", "عراق", "عراقی", "iqd", "iraqidinar", "دینارعراقی", "دینار عراقی", "iraq"], "iqd"],
  [["کرونسوئد", "کرون سوئد", "سوئد", "sek", "swedishkrona"], "sek"],
  [["کروننروژ", "کرون نروژ", "نروژ", "nok", "norwegiankrone"], "nok"],
  [["کرون دانمارک", "دانمارک", "dkk", "danishkrone"], "dkk"],
  [["روبل", "روبل روسیه", "روسیه", "rub", "russianruble"], "rub"],
  [["بات", "بات تایلند", "تایلند", "thb", "thaibaht"], "thb"],
  [["دلار سنگاپور", "سنگاپور", "sgd", "singaporedollar"], "sgd"],
  [["دلار هنگ کنگ", "هنگکنگ", "hkd", "hongkongdollar"], "hkd"],
  [["منات", "منات آذربایجان", "آذربایجان", "azn", "azerbaijanimanat"], "azn"],
  [["درام", "درام ارمنستان", "ارمنستان", "amd", "armeniandram"], "amd"],
  [["رینگیت", "مالزی", "myr", "ringgit"], "myr"],
  [["روپیه هند", "هند", "inr", "indianrupee"], "inr"],
  [["طلا", "gold", "گرم طلا", "گرمطلای18", "طلای18", "طلای ۱۸", "ذهب"], "gold_gram_18k"],
  [["مثقال", "مثقالطلا", "mithqal"], "gold_mithqal"],
  [["اونس", "انس", "اونس طلا", "goldounce", "ounce"], "gold_ounce"],
  [["سکه", "سکه امامی", "امامی", "coin_emami"], "coin_emami"],
  [["بهار آزادی", "coin_azadi"], "coin_azadi"],
  [["نیم سکه", "coin_half_azadi"], "coin_half_azadi"],
  [["ربع سکه", "coin_quarter_azadi"], "coin_quarter_azadi"],
  [["گرمی", "سکه گرمی", "coin_gerami"], "coin_gerami"],
  [["بیت", "بیتکوین", "بیت کوین", "btc", "bitcoin"], "btc"],
  [["اتریوم", "eth", "ethereum"], "eth"],
  [["تتر", "usdt", "tether", "tetherusdt"], "usdt"],
  [["بی ان بی", "bnb", "binance"], "bnb"],
  [["ریپل", "xrp"], "xrp"],
  [["یو اس دی سی", "usdc"], "usdc"],
  [["سولانا", "sol", "solana"], "sol"],
  [["ترون", "trx", "tron"], "trx"],
  [["دوج", "دوج کوین", "doge", "dogecoin"], "doge"],
  [["شیبا", "shib", "shiba"], "shib"],
  [["پولکادات", "dot", "polkadot"], "dot"],
  [["فایل کوین", "fil", "filecoin"], "fil"],
  [["تون", "ton", "toncoin"], "ton"],
  [["چین لینک", "link", "chainlink"], "link"],
  [["مونرو", "xmr", "monero"], "xmr"],
  [["بیت کوین کش", "bch", "bitcoincash"], "bch"],
] as const;

type AliasIndex = readonly (readonly [string, readonly string[], readonly string[], number])[];
const ALIAS_INDEX: AliasIndex = ALIASES.map(([keys, code]) => {
  const spaced = keys.map(k => stripPunct(norm(k)).replace(/\s+/g, " ").trim()).filter(Boolean);
  const compact = spaced.map(k => k.replace(/\s+/g, ""));
  const sortedSpaced = [...spaced].sort((a, b) => b.length - a.length);
  const sortedCompact = [...compact].sort((a, b) => b.length - a.length);
  const maxLen = Math.max(sortedSpaced[0]?.length ?? 0, sortedCompact[0]?.length ?? 0);
  return [code, sortedSpaced, sortedCompact, maxLen] as const;
}).sort((a, b) => b[3] - a[3]);

const pickCobaltUrl = (text: string): string | null => {
  const m = text.match(/https?:\/\/[^\s<>()]+/i);
  if (!m) return null;
  const raw = m[0].replace(/[)\]}>,.!?؟؛:]+$/g, "");
  try {
    const u = new URL(raw);
    const h = u.hostname.toLowerCase();
    return h === "instagram.com" || h.endsWith(".instagram.com") ||
           h === "twitter.com" || h.endsWith(".twitter.com") ||
           h === "x.com" || h.endsWith(".x.com") ||
           h === "t.co" || h === "fxtwitter.com" || h === "vxtwitter.com" || h === "fixupx.com"
      ? u.toString() : null;
  } catch { return null; }
};

const fetchCobalt = async (baseUrl: string, targetUrl: string) => {
  const body = JSON.stringify({ url: targetUrl, vCodec: "h264" });
  let res = await fetch(baseUrl, { method: "POST", headers: COBALT_HEADERS, body });
  if (!res.ok && res.status === 404 && !baseUrl.includes("json")) {
    const retry = baseUrl.endsWith("/") ? `${baseUrl}api/json` : `${baseUrl}/api/json`;
    res = await fetch(retry, { method: "POST", headers: COBALT_HEADERS, body });
  }
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.json();
};

const tgBase = (env: Env) => `https://api.telegram.org/bot${env.TG_TOKEN}`;

const tgCall = async (env: Env, method: string, body: unknown) =>
  fetch(`${tgBase(env)}/${method}`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(body) }).catch(() => {});

const tgSend = async (env: Env, chatId: number, text: string, replyTo?: number, markup?: unknown) => {
  const payload: Record<string, unknown> = { chat_id: chatId, text, parse_mode: TG_PARSE_MODE, disable_web_page_preview: true };
  if (replyTo) { payload.reply_to_message_id = replyTo; payload.allow_sending_without_reply = true; }
  if (markup) payload.reply_markup = markup;
  await tgCall(env, "sendMessage", payload);
};

const tgEdit = async (env: Env, chatId: number | undefined, msgId: number | undefined, text: string, markup?: unknown) => {
  const payload: Record<string, unknown> = { chat_id, message_id: msgId, text, parse_mode: TG_PARSE_MODE, disable_web_page_preview: true };
  if (markup) payload.reply_markup = markup;
  await tgCall(env, "editMessageText", payload);
};

const tgAnswerCb = async (env: Env, id: string, text?: string) => {
  const payload: Record<string, unknown> = { callback_query_id: id };
  if (text) payload.text = text;
  await tgCall(env, "answerCallbackQuery", payload);
};

const tgSendVideo = async (env: Env, chatId: number, url?: string, caption = "", replyTo?: number) => {
  const payload: Record<string, unknown> = { chat_id: chatId, video: url, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) { payload.reply_to_message_id = replyTo; payload.allow_sending_without_reply = true; }
  const res = await fetch(`${tgBase(env)}/sendVideo`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify(payload) });
  if (!res.ok) console.error("TG Video Error:", await res.text());
};

const tgSendPhoto = async (env: Env, chatId: number, url?: string, caption = "", replyTo?: number) => {
  const payload: Record<string, unknown> = { chat_id: chatId, photo: url, caption, parse_mode: TG_PARSE_MODE };
  if (replyTo) { payload.reply_to_message_id = replyTo; payload.allow_sending_without_reply = true; }
  await tgCall(env, "sendPhoto", payload);
};

const parseNumberLoose = (v: unknown): number | null => {
  if (typeof v === "number") return Number.isFinite(v) ? v : null;
  if (typeof v !== "string") return null;
  const n = Number(v.trim().replace(/,/g, ""));
  return Number.isFinite(n) ? n : null;
};

const NAME_TO_CODE: Readonly<Record<string, { code: string; kind: Rate["kind"]; fa: string; emoji: string }>> = {
  "us dollar": { code: "usd", kind: "currency", fa: "دلار آمریکا", emoji: "🇺🇸" },
  euro: { code: "eur", kind: "currency", fa: "یورو", emoji: "🇪🇺" },
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
  ringgit: { code: "myr", kind: "currency", fa: "رینگیت مالزی", emoji: "🇲🇾" },
  "afghan afghani": { code: "afn", kind: "currency", fa: "افغانی", emoji: "🇦🇫" },
  "kuwaiti dinar": { code: "kwd", kind: "currency", fa: "دینار کویت", emoji: "🇰🇼" },
  "iraqi dinar": { code: "iqd", kind: "currency", fa: "دینار عراق", emoji: "🇮🇶" },
  "bahraini dinar": { code: "bhd", kind: "currency", fa: "دینار بحرین", emoji: "🇧🇭" },
  "omani rial": { code: "omr", kind: "currency", fa: "ریال عمان", emoji: "🇴🇲" },
  "qatari riyal": { code: "qar", kind: "currency", fa: "ریال قطر", emoji: "🇶🇦" },
  "gold gram 18k": { code: "gold_gram_18k", kind: "gold", fa: "گرم طلای ۱۸", emoji: "💰" },
  "gold mithqal": { code: "gold_mithqal", kind: "gold", fa: "مثقال طلا", emoji: "💰" },
  "gold ounce": { code: "gold_ounce", kind: "gold", fa: "اونس طلا", emoji: "💰" },
  azadi: { code: "coin_azadi", kind: "gold", fa: "سکه آزادی", emoji: "🪙" },
  emami: { code: "coin_emami", kind: "gold", fa: "سکه امامی", emoji: "🪙" },
  "½azadi": { code: "coin_half_azadi", kind: "gold", fa: "نیم سکه", emoji: "🪙" },
  "¼azadi": { code: "coin_quarter_azadi", kind: "gold", fa: "ربع سکه", emoji: "🪙" },
  gerami: { code: "coin_gerami", kind: "gold", fa: "سکه گرمی", emoji: "🪙" },
  bitcoin: { code: "btc", kind: "crypto", fa: "بیت‌کوین", emoji: "💎" },
  ethereum: { code: "eth", kind: "crypto", fa: "اتریوم", emoji: "💎" },
  "tether usdt": { code: "usdt", kind: "crypto", fa: "تتر", emoji: "💎" },
  bnb: { code: "bnb", kind: "crypto", fa: "بی‌ان‌بی", emoji: "💎" },
  xrp: { code: "xrp", kind: "crypto", fa: "ریپل", emoji: "💎" },
  usdc: { code: "usdc", kind: "crypto", fa: "USDC", emoji: "💎" },
  solana: { code: "sol", kind: "crypto", fa: "سولانا", emoji: "💎" },
  tron: { code: "trx", kind: "crypto", fa: "ترون", emoji: "💎" },
  dogecoin: { code: "doge", kind: "crypto", fa: "دوج‌کوین", emoji: "💎" },
  cardano: { code: "ada", kind: "crypto", fa: "کاردانو", emoji: "💎" },
  "bitcoin cash": { code: "bch", kind: "crypto", fa: "بیت‌کوین‌کش", emoji: "💎" },
  chainlink: { code: "link", kind: "crypto", fa: "چین‌لینک", emoji: "💎" },
  monero: { code: "xmr", kind: "crypto", fa: "مونرو", emoji: "💎" },
  stellar: { code: "xlm", kind: "crypto", fa: "استلار", emoji: "💎" },
  zcash: { code: "zec", kind: "crypto", fa: "زی‌کش", emoji: "💎" },
  litecoin: { code: "ltc", kind: "crypto", fa: "لایت‌کوین", emoji: "💎" },
  polkadot: { code: "dot", kind: "crypto", fa: "پولکادات", emoji: "💎" },
  toncoin: { code: "ton", kind: "crypto", fa: "تون", emoji: "💎" },
  filecoin: { code: "fil", kind: "crypto", fa: "فایل‌کوین", emoji: "💎" },
  cosmos: { code: "atom", kind: "crypto", fa: "کازماس", emoji: "💎" },
} as const;

const fetchAndMergeData = async (): Promise<{ stored: Stored; rawHash: string }> => {
  const res = await fetch(PRICES_JSON_URL, { headers: { "User-Agent": "Mozilla/5.0" } });
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  const rawText = await res.text();
  const rawHash = await sha256Hex(rawText);
  const arr = JSON.parse(rawText) as Array<{ name: string; price: string | number } & Record<string, unknown>>;

  let usdToman: number | null = null;
  for (const row of arr) {
    if (!row.name) continue;
    if (stripPunct(row.name.toLowerCase()).includes("us dollar")) {
      usdToman = parseNumberLoose(row.price);
      if (usdToman !== null) break;
    }
  }

  const rates: Record<string, Rate> = {};
  const fetchedAtMs = Date.now();

  for (const row of arr) {
    if (!row.name) continue;
    const { unit, cleanName } = (() => {
      const m = row.name.match(/^\s*(\d+)\s*/);
      return m ? { unit: Math.max(1, parseInt(m[1], 10)), cleanName: row.name.replace(/^\s*\d+\s*/g, "").trim() }
               : { unit: 1, cleanName: row.name.trim() };
    })();
    const priceNum = parseNumberLoose(row.price);
    if (priceNum === null) continue;

    const lower = cleanName.toLowerCase();
    const mapped = NAME_TO_CODE[lower];
    const code = mapped?.code ?? lower.replace(/\s+/g, "");

    const kind: Rate["kind"] = mapped?.kind ?? (typeof row.price === "number" ? "crypto" : lower.includes("gold") || lower.includes("azadi") || lower.includes("emami") || lower.includes("gerami") ? "gold" : "currency");

    let tomanPrice = priceNum;
    let usdPrice: number | undefined;
    let change24h: number | undefined;

    if (typeof row.price === "number") {
      usdPrice = priceNum;
      const ch = parseNumberLoose(row.percent_change_24h ?? row.percentChange24h ?? row.change_24h ?? row.change24h);
      if (ch !== null) change24h = ch;
      if (usdToman !== null) tomanPrice = priceNum * usdToman;
    } else if (lower === "gold ounce" || lower === "pax gold" || lower === "tether gold") {
      usdPrice = priceNum;
      const ch = parseNumberLoose(row.percent_change_24h ?? row.percentChange24h);
      if (ch !== null) change24h = ch;
      if (usdToman !== null) tomanPrice = priceNum * usdToman;
    }

    if (kind === "currency" && usdToman !== null) {
      usdPrice = code === "usd" ? 1 : tomanPrice / usdToman;
    }

    const meta = mapped ? { emoji: mapped.emoji, fa: mapped.fa } : META[code] ?? { emoji: kind === "crypto" ? "💎" : "💱", fa: cleanName };

    rates[code] = { price: tomanPrice, unit, kind, title: cleanName, emoji: meta.emoji, fa: meta.fa, usdPrice, change24h };
  }

  return { stored: { fetchedAtMs, source: PRICES_JSON_URL, rates }, rawHash };
};

const refreshRates = async (env: Env) => {
  const { stored, rawHash } = await fetchAndMergeData();
  const prevHash = await env.BOT_KV.get(KEY_HASH);
  const changed = prevHash !== rawHash;
  if (changed) {
    await env.BOT_KV.put(KEY_HASH, rawHash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  } else if (!prevHash) await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  return { ok: true, changed, count: Object.keys(stored.rates).length };
};

const getStoredOrRefresh = async (env: Env, ctx: ExecutionContext): Promise<Stored> => {
  const txt = await env.BOT_KV.get(KEY_RATES);
  if (txt) {
    const stored = JSON.parse(txt) as Stored;
    if (Date.now() - stored.fetchedAtMs > 35 * 60_000) ctx.waitUntil(refreshRates(env));
    return stored;
  }
  await refreshRates(env);
  const txt2 = await env.BOT_KV.get(KEY_RATES);
  if (!txt2) throw new Error("no data");
  return JSON.parse(txt2) as Stored;
};

const parsePersianNumber = (tokens: readonly string[]): number | null => {
  const ones: Readonly<Record<string, number>> = { یک:1, یه:1, دو:2, سه:3, چهار:4, پنج:5, شش:6, شیش:6, هفت:7, هشت:8, نه:9 };
  const teens: Readonly<Record<string, number>> = { ده:10, یازده:11, دوازده:12, سیزده:13, چهارده:14, پانزده:15, شانزده:16, هجده:18, نوزده:19 };
  const tens: Readonly<Record<string, number>> = { بیست:20, سی:30, چهل:40, پنجاه:50, شصت:60, هفتاد:70, هشتاد:80, نود:90 };
  const hundreds: Readonly<Record<string, number>> = { صد:100, یکصد:100, دویست:200, سیصد:300, چهارصد:400, پانصد:500, ششصد:600, شیشصد:600, هفتصد:700, هشتصد:800, نهصد:900 };
  const scales: Readonly<Record<string, number>> = { هزار:1e3, میلیون:1e6, ملیون:1e6, میلیارد:1e9, بیلیون:1e9, تریلیون:1e12 };

  const t = tokens.filter(w => w && w !== "و");
  if (t.length === 0) return null;

  let total = 0, current = 0;
  for (const w of t) {
    if (scales[w] !== undefined) { total += (current || 1) * scales[w]; current = 0; continue; }
    if (hundreds[w] !== undefined) current += hundreds[w];
    else if (teens[w] !== undefined) current += teens[w];
    else if (tens[w] !== undefined) current += tens[w];
    else if (ones[w] !== undefined) current += ones[w];
    else if (w === "صد") current = (current || 1) * 100;
    else return null;
  }
  return total + current || null;
};

const parseDigitsWithScale = (text: string): number | null => {
  const m = normalizeDigits(text).match(/(\d+(?:\.\d+)?)(?:\s*(هزار|میلیون|ملیون|میلیارد|بیلیون|تریلیون|k|m|b))?/i);
  if (!m) return null;
  const num = Number(m[1]);
  if (!Number.isFinite(num) || num <= 0) return null;
  const suf = (m[2] ?? "").toLowerCase();
  const mul = suf === "هزار" || suf === "k" ? 1e3
            : suf === "میلیون" || suf === "ملیون" || suf === "m" ? 1e6
            : suf === "میلیارد" || suf === "بیلیون" || suf === "b" ? 1e9
            : suf === "تریلیون" ? 1e12 : 1;
  return num * mul;
};

const hasBounded = (haystack: string, needle: string): boolean => {
  if (!needle) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${needle.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(haystack);
};

const findCode = (textNorm: string, rates: Readonly<Record<string, Rate>>): string | null => {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  for (const [code, spaced, compacts] of ALIAS_INDEX) {
    for (const k of spaced) if (hasBounded(cleaned, k)) return code;
    for (const k of compacts) if (hasBounded(compact, k)) return code;
  }

  if (hasBounded(cleaned, "دلار") && (hasBounded(cleaned, "کانادا") || hasBounded(cleaned, "کاندا") || hasBounded(cleaned, "کانادایی"))) return rates["cad"] ? "cad" : null;
  if (hasBounded(cleaned, "دینار") && (hasBounded(cleaned, "عراق") || hasBounded(cleaned, "عراقی"))) return rates["iqd"] ? "iqd" : null;

  const m = cleaned.match(/\b([a-z]{3,10})\b/i);
  if (m && rates[m[1].toLowerCase()]) return m[1].toLowerCase();

  for (const key in rates) {
    const titleCompact = stripPunct(norm(rates[key].title)).replace(/\s+/g, "");
    if (compact === key || titleCompact && compact === titleCompact) return key;
  }
  return null;
};

const extractAmountOrNull = (textNorm: string): number | null => {
  const digitScaled = parseDigitsWithScale(textNorm);
  if (digitScaled !== null && digitScaled > 0) return digitScaled;

  const tokens = stripPunct(textNorm).split(" ").filter(Boolean);
  for (let len = Math.min(tokens.length, 10); len >= 1; len--) {
    for (let i = 0; i + len <= tokens.length; i++) {
      const n = parsePersianNumber(tokens.slice(i, i + len));
      if (n !== null && n > 0) return n;
    }
  }
  return null;
};

const parseCache = new Map<string, { ts: number; code: string | null; amount: number; hasAmount: boolean }>();
const userContext = new Map<number, { ts: number; code: string }>();

const pruneCache = (now: number) => {
  if (parseCache.size <= PARSE_CACHE_MAX) return;
  for (const [k, v] of parseCache) if (now - v.ts > PARSE_TTL_MS) parseCache.delete(k);
  if (parseCache.size > PARSE_CACHE_MAX) {
    const entries = Array.from(parseCache.entries());
    for (let i = 0; i < entries.length && parseCache.size > PARSE_CACHE_MAX; i++) parseCache.delete(entries[i][0]);
  }
};

const getParsedIntent = (userId: number, textNorm: string, rates: Readonly<Record<string, Rate>>) => {
  const now = Date.now();
  pruneCache(now);
  const key = `${userId}:${textNorm}`;
  const cached = parseCache.get(key);
  if (cached && now - cached.ts <= PARSE_TTL_MS) return cached;

  let code = findCode(textNorm, rates);
  const amount = extractAmountOrNull(textNorm) ?? 1;
  const hasAmount = amount !== 1 || extractAmountOrNull(textNorm) !== null;

  if (!code) {
    const ctx = userContext.get(userId);
    if (ctx && now - ctx.ts <= CONTEXT_TTL_MS && hasAmount) code = ctx.code;
  }
  if (code) userContext.set(userId, { ts: now, code });

  const result = { ts: now, code, amount, hasAmount };
  parseCache.set(key, result);
  return result;
};

const START_KEYBOARD = {
  inline_keyboard: [
    [{ text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` }, { text: "📘 راهنما", callback_data: "help_menu" }],
    [{ text: "💱 قیمت ارز و طلا", callback_data: "cat:fiat" }],
    [{ text: "🪙 قیمت ارز دیجیتال", callback_data: "cat:crypto" }],
  ],
} as const;

const HELP_KEYBOARD = { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start_menu" }]] } as const;

const getHelpMessage = () => `<b>🤖 راهنمای استفاده از ربات:</b>

1️⃣ <b>قیمت ارز:</b> نام ارز را بفرستید (دلار، یورو، افغانی).
2️⃣ <b>کریپتو:</b> نام ارز دیجیتال را بفرستید (بیت کوین، اتریوم، BTC، TON).
3️⃣ <b>تبدیل:</b> مقدار + نام ارز (مثلاً: ۱۰۰ دلار، 0.5 بیت کوین).
4️⃣ <b>طلا و سکه:</b> کلمه «طلا»، «سکه» یا «مثقال» را بفرستید.
5️⃣ <b>دانلود اینستاگرام:</b> لینک پست را بفرستید.

🔸 قیمت‌های کریپتو هم به دلار و هم به تومان محاسبه می‌شوند.
🔸 نرخ تتر/دلار از بازار آزاد گرفته می‌شود.` as const;

type PriceCategory = "fiat" | "crypto";

type PriceListItem = { code: string; category: PriceCategory; emoji: string; name: string; price: string };

const buildPriceItems = (stored: Stored, category: PriceCategory): readonly PriceListItem[] => {
  const rates = stored.rates;
  const priority = ["usd","eur","aed","try","afn","iqd","gbp"] as const;
  const cryptoPriority = ["btc","eth","ton","usdt","trx","not","doge","sol"] as const;

  if (category === "crypto") {
    const items: PriceListItem[] = [];
    const codes = Object.keys(rates).filter(c => rates[c].kind === "crypto")
      .sort((a,b) => {
        const ia = cryptoPriority.indexOf(a as any);
        const ib = cryptoPriority.indexOf(b as any);
        return ia === -1 ? (ib === -1 ? a.localeCompare(b) : 1) : ib === -1 ? -1 : ia - ib;
      });
    for (const c of codes) {
      const r = rates[c];
      const per1 = Math.round(r.price / (r.unit || 1));
      const meta = CRYPTO_META[c as keyof typeof CRYPTO_META] ?? { emoji: r.emoji, fa: r.fa };
      items.push({ code: c, category, emoji: meta.emoji, name: meta.fa.slice(0,20), price: `${formatToman(per1)} ت`.slice(0,16) });
    }
    return items;
  }

  const gold: string[] = [], fiat: string[] = [];
  for (const c in rates) {
    const r = rates[c];
    if (r.kind === "crypto") continue;
    (r.kind === "gold" || c.includes("coin") || c.includes("gold") ? gold : fiat).push(c);
  }
  fiat.sort((a,b) => {
    const ia = priority.indexOf(a as any);
    const ib = priority.indexOf(b as any);
    return ia === -1 ? (ib === -1 ? a.localeCompare(b) : 1) : ib === -1 ? -1 : ia - ib;
  });

  const items: PriceListItem[] = [];
  for (const c of [...gold, ...fiat]) {
    const r = rates[c];
    const showUnit = r.kind === "currency" && r.unit > 1;
    const base = showUnit ? r.unit : 1;
    const priceStr = formatToman(showUnit ? Math.round(r.price) : Math.round(r.price / base));
    const meta = META[c as keyof typeof META] ?? { emoji: "💱", fa: r.fa };
    items.push({
      code: c,
      category,
      emoji: meta.emoji,
      name: showUnit ? `${base} ${meta.fa}`.slice(0,20) : meta.fa.slice(0,20),
      price: `${priceStr} ت`.slice(0,16),
    });
  }
  return items;
};

const buildKeyboard = (category: PriceCategory, page: number, totalPages: number, items: readonly PriceListItem[]) => {
  const start = page * PRICE_PAGE_SIZE;
  const slice = items.slice(start, start + PRICE_PAGE_SIZE);

  const rows: Array<Array<{ text: string; callback_data: string }>> = slice.map(it => [
    { text: it.price, callback_data: `show:${category}:${it.code}:${page}` },
    { text: `${it.emoji} ${it.name}`, callback_data: `show:${category}:${it.code}:${page}` },
  ]);

  rows.push([
    { text: page > 0 ? "بعدی ⬅️" : " ", callback_data: page > 0 ? `page:${category}:${page-1}` : "noop" },
    { text: "🏠 خانه", callback_data: "start_menu" },
    { text: page + 1 < totalPages ? "➡️ قبلی" : " ", callback_data: page + 1 < totalPages ? `page:${category}:${page+1}` : "noop" },
  ]);

  return { inline_keyboard: rows };
};

const getTimeStr = (stored: Stored) => new Date(stored.fetchedAtMs + 3.5*3600000).toISOString().slice(11,16);

const handleDownload = async (env: Env, chatId: number, url: string, replyTo?: number) => {
  await fetch(`${tgBase(env)}/sendChatAction`, { method: "POST", headers: TG_JSON_HEADERS, body: JSON.stringify({ chat_id: chatId, action: "upload_video" }) }).catch(() => {});
  for (const base of COBALT_INSTANCES) {
    try {
      const data = await fetchCobalt(base, url);
      if ((data as any).status === "stream" || (data as any).status === "redirect") {
        await tgSendVideo(env, chatId, (data as any).url, "✅ دانلود شد", replyTo);
        return true;
      }
      if ((data as any).status === "picker" && Array.isArray((data as any).picker)) {
        for (const it of (data as any).picker.slice(0,4)) {
          if (it.type === "video" && it.url) await tgSendVideo(env, chatId, it.url, "", replyTo);
          else if (it.type === "photo" && it.url) await tgSendPhoto(env, chatId, it.url, "", replyTo);
        }
        return true;
      }
    } catch {}
  }
  await tgSend(env, chatId, "❌ سرورهای دانلود پاسخگو نیستند. لطفاً دقایقی دیگر تلاش کنید.", replyTo);
  return true;
};

export default {
  async scheduled(_: ScheduledEvent, env: Env) {
    await refreshRates(env).catch(() => {});
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/health") return new Response("ok");

    if (url.pathname === "/refresh") {
      if (url.searchParams.get("key") !== env.ADMIN_KEY) return new Response("Unauthorized", { status: 401 });
      const r = await refreshRates(env);
      return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });
    if ((req.headers.get("X-Telegram-Bot-Api-Secret-Token") ?? "") !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await req.json<TgUpdate>().catch(() => null);
    if (!update || update.edited_message) return new Response("ok");

    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data ?? "";
      const chatId = cb.message?.chat?.id;
      const msgId = cb.message?.message_id;

      if (data === "help_menu") await tgEdit(env, chatId, msgId, getHelpMessage(), HELP_KEYBOARD);
      else if (data === "start_menu") await tgEdit(env, chatId, msgId, "👋 سلام! به ربات خوش آمدید.\nچه کاری می‌توانم برایتان انجام دهم؟", START_KEYBOARD);
      else if (data.startsWith("cat:")) {
        const cat = data.slice(4) as PriceCategory;
        const stored = await getStoredOrRefresh(env, ctx);
        const items = buildPriceItems(stored, cat);
        const pages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
        await tgEdit(env, chatId, msgId, `📄 صفحه 1/${pages}\n🕐 بروزرسانی: ${getTimeStr(stored)}`, buildKeyboard(cat, 0, pages, items));
      } else if (data.startsWith("page:")) {
        const [, cat, p] = data.split(":");
        const page = Math.max(0, Math.min(parseInt(p ?? "0"), 99));
        const stored = await getStoredOrRefresh(env, ctx);
        const items = buildPriceItems(stored, cat as PriceCategory);
        const pages = Math.max(1, Math.ceil(items.length / PRICE_PAGE_SIZE));
        const clamped = Math.max(0, Math.min(page, pages - 1));
        await tgEdit(env, chatId, msgId, `📄 صفحه ${clamped+1}/${pages}\n🕐 بروزرسانی: ${getTimeStr(stored)}`, buildKeyboard(cat as PriceCategory, clamped, pages, items));
      } else if (data.startsWith("show:")) {
        const [, cat, code] = data.split(":");
        const stored = await getStoredOrRefresh(env, ctx);
        const r = stored.rates[code];
        if (!r) return new Response("ok");
        const lines: string[] = [];
        const meta = (cat === "crypto" ? CRYPTO_META : META)[code as keyof typeof META] ?? { emoji: r.emoji, fa: r.fa };
        lines.push(`${meta.emoji} <b>${meta.fa}</b> (${code.toUpperCase()})`);
        lines.push(`💶 قیمت: <code>${formatToman(Math.round(r.price / (r.unit || 1)))}</code> تومان`);
        if (r.usdPrice) lines.push(`💵 دلار: <code>${formatUSD(r.usdPrice)}</code> $`);
        if (r.change24h !== undefined) lines.push(`${r.change24h >= 0 ? "🟢" : "🔴"} تغییر 24h: <b>${r.change24h.toFixed(2)}%</b>`);
        lines.push(`🕐 بروزرسانی: ${getTimeStr(stored)}`);
        await tgSend(env, chatId!, lines.join("\n"));
      }
      await tgAnswerCb(env, cb.id);
      return new Response("ok");
    }

    const msg = update.message;
    if (!msg?.text || !msg.chat?.id || !msg.from?.id) return new Response("ok");

    const chatId = msg.chat.id;
    const userId = msg.from.id;
    const text = msg.text;
    const messageId = msg.message_id;
    const isGroup = msg.chat.type !== "private";
    const replyTo = isGroup ? messageId : undefined;

    if (Math.floor(Date.now() / 1000) - msg.date > 40) return new Response("ok");
    if (await env.BOT_KV.get(`cooldown:${userId}`)) return new Response("ok");
    ctx.waitUntil(env.BOT_KV.put(`cooldown:${userId}`, "1", { expirationTtl: 5 }));

    const textNorm = norm(text);
    const cmd = stripPunct(textNorm).split(/\s+/)[0]?.split("@")[0] ?? "";

    const run = async () => {
      const dlUrl = pickCobaltUrl(text);
      if (dlUrl) { await handleDownload(env, chatId, dlUrl, replyTo); return; }

      if (cmd === "/start") { await tgSend(env, chatId, "👋 سلام! به ربات [ارز چی؟] خوش آمدید.\n\nمن می‌توانم قیمت ارزها و کریپتو را بگویم و ویدیوهای اینستاگرام را دانلود کنم.", replyTo, START_KEYBOARD); return; }
      if (cmd === "/help") { await tgSend(env, chatId, getHelpMessage(), replyTo, HELP_KEYBOARD); return; }

      const stored = await getStoredOrRefresh(env, ctx);
      if (cmd === "/all") {
        const lines: string[] = [];
        const pushSection = (title: string, items: string[]) => { if (items.length) { lines.push(title, "➖➖➖➖➖➖", ...items, ""); } };
        const gold: string[] = [], fiat: string[] = [], crypto: string[] = [];

        for (const c in stored.rates) {
          const r = stored.rates[c];
          const base = r.unit > 1 ? r.unit : 1;
          const priceStr = formatToman(Math.round(r.price / base));
          if (r.kind === "crypto") {
            const usd = r.usdPrice ? formatUSD(r.usdPrice) : "?";
            const ch = r.change24h !== undefined ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%` : "";
            crypto.push(`💎 <b>${r.fa}</b> (${c.toUpperCase()})\n└ ${priceStr} ت | ${usd}$${ch}`);
          } else {
            const meta = META[c as keyof typeof META] ?? { emoji: "💱", fa: r.fa };
            const unitPrefix = r.unit > 1 ? `${base} ` : "";
            const line = `${meta.emoji} <b>${unitPrefix}${meta.fa}:</b> <code>${priceStr}</code> تومان`;
            (r.kind === "gold" ? gold : fiat).push(line);
          }
        }

        pushSection("🟡 <b>نرخ طلا و سکه</b>", gold);
        pushSection("💵 <b>نرخ ارزهای بازار</b>", fiat);
        pushSection("🚀 <b>بازار ارز دیجیتال</b>", crypto);
        lines.push(`\n🕐 <b>بروزرسانی:</b> ${getTimeStr(stored)}`);

        for (const chunk of chunkText(lines.join("\n"), 3800)) await tgSend(env, chatId, chunk, replyTo);
        return;
      }

      const parsed = getParsedIntent(userId, textNorm, stored.rates);
      if (!parsed.code) return;
      const r = stored.rates[parsed.code];
      if (!r) return;

      const refUnit = Math.max(1, r.unit);
      const qty = parsed.hasAmount ? parsed.amount : 1;
      const totalToman = Math.round((r.price / refUnit) * qty * refUnit);

      const usdRate = stored.rates.usd ? stored.rates.usd.price / (stored.rates.usd.unit || 1) : null;
      const totalUsd = usdRate ? totalToman / usdRate : r.usdPrice ? r.usdPrice * qty : null;

      const meta = (r.kind === "crypto" ? CRYPTO_META : META)[parsed.code as keyof typeof META] ?? { emoji: r.emoji, fa: r.fa };

      const lines: string[] = [];
      lines.push(`${meta.emoji} <b>${meta.fa}</b>${r.title && r.title !== r.fa ? ` <i>(${r.title})</i>` : ""}`);
      lines.push("➖➖➖➖➖➖");
      lines.push(`🧮 <b>تعداد:</b> <code>${qty}</code>`);
      lines.push(`💶 <b>قیمت کل:</b> <code>${formatToman(totalToman)}</code> تومان`);
      if (totalUsd !== null) lines.push(`💵 <b>معادل دلار:</b> <code>${formatUSD(totalUsd)}</code> $`);
      if (r.change24h !== undefined) lines.push(`${r.change24h >= 0 ? "🟢" : "🔴"} <b>تغییر 24h:</b> ${r.change24h.toFixed(2)}%`);

      await tgSend(env, chatId, lines.join("\n"), replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  },
};

const chunkText = (s: string, max = 3800): readonly string[] => {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += max) out.push(s.slice(i, i + max));
  return out;
};
