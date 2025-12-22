export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const BOT_USERNAME = "worker093578bot";

const PRICES_JSON_URL = "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/merged_prices.json";

const COBALT_INSTANCES = [
  "https://cobalt-api.meowing.de",
  "https://cobalt-backend.canine.tools",
  "https://capi.3kh0.net",
  "https://cobalt-api.kwiatekmiki.com",
  "https://downloadapi.stuff.solutions",
  "https://co.wuk.sh/api/json",
  "https://cobalt.canine.tools/",
  "https://api.cobalt.tools",
  "https://blossom.imput.net",
  "https://kityune.imput.net",
  "https://nachos.imput.net",
  "https://nuko-c.meowing.de",
  "https://sunny.imput.net"
];

const KEY_RATES = "rates:v2:latest";
const KEY_HASH = "rates:v2:hash";

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
  rates: Record<string, Rate> 
};

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
  coin_gerami: { emoji: "🪙", fa: "سکه گرمی" }};

const ALIASES: Array<{ keys: string[]; code: string }> = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "دلار امریکا", "usd", "us dollar", "dollar"], code: "usd" },
  { keys: ["یورو", "eur", "euro"], code: "eur" },
  { keys: ["پوند", "پوندانگلیس", "پوند انگلیس", "gbp", "britishpound"], code: "gbp" },
  { keys: ["فرانک", "فرانکسوئیس", "فرانک سوئیس", "chf", "swissfranc"], code: "chf" },
  { keys: ["دلارکانادا","دلار کانادا","دلارکانادایی","دلار کانادایی","دلارکاندا","دلار کاندا","cad","canadiandollar","canada","کاندایی"], code: "cad" },
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

  { keys: ["طلا", "gold", "گرم طلا", "گرمطلای18", "طلای18", "طلای ۱۸", "۱۸"], code: "gold_gram_18k" },
  { keys: ["مثقال", "مثقالطلا", "mithqal"], code: "gold_mithqal" },
  { keys: ["اونس", "انس", "اونس طلا", "goldounce", "ounce"], code: "gold_ounce" },
  { keys: ["سکه", "coin", "سکه امامی", "امامی", "coin_emami"], code: "coin_emami" },
  { keys: ["بهار", "بهار آزادی", "ازادی", "آزادی", "coin_azadi"], code: "coin_azadi" },
  { keys: ["نیم سکه", "نیم", "½", "coin_half_azadi"], code: "coin_half_azadi" },
  { keys: ["ربع سکه", "ربع", "¼", "coin_quarter_azadi"], code: "coin_quarter_azadi" },
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
  { keys: ["بیت کوین کش", "bch", "bitcoincash"], code: "bch" }
];


function normalizeDigits(input: string) {
  const map: Record<string, string> = {
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"
  };
  return input.split("").map(ch => map[ch] ?? ch).join("");
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

function formatToman(n: number) {
  const x = Math.round(n);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUSD(n: number) {
  if (n < 1) return n.toFixed(4);
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function sha256Hex(s: string) {
  const data = new TextEncoder().encode(s);
  const hash = await crypto.subtle.digest("SHA-256", data);
  const bytes = new Uint8Array(hash);
  return Array.from(bytes).map(b => b.toString(16).padStart(2, "0")).join("");
}

function toNum(v: any): number | null {
  if (v == null) return null;
  if (typeof v === "number" && Number.isFinite(v)) return v;
  const s = String(v).replace(/,/g, "").trim();
  const n = Number(s);
  return Number.isFinite(n) ? n : null;
}

function unitFromString(s: string): number {
  const m = s.trim().match(/^(\d{1,4})/);
  const u = m ? Number(m[1]) : 1;
  return Number.isFinite(u) && u > 1 ? u : 1;
}

function parseCurrencyItem(name: string) {
  const n = name.trim();
  const m = n.match(/^([A-Z]{3})\s*(.*)$/);
  if (!m) return null;
  const code = m[1].toLowerCase();
  const rest = (m[2] || "").trim();
  const unit = rest ? unitFromString(rest) : 1;
  return { code, rest, unit };
}

function parseCSV(text: string) {
  const lines = text.split("\n");
  const result = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length < 6) continue;
    const name = parts[1].replace(/"/g, "").trim();
    const symbol = parts[2].replace(/"/g, "").trim().toLowerCase();
    const priceStr = parts[5];
    const changeStr = parts[9];
    const price = parseFloat(priceStr);
    const change = parseFloat(changeStr);
    if (!isNaN(price) && symbol) {
      result.push({ symbol, name, price, change });
    }
  }
  return result;
}

async function fetchAndMergeData(env: Env): Promise<{ stored: Stored; rawHash: string }> {
  const headers = { "User-Agent": "Mozilla/5.0" };

  const res = await fetch(PRICES_JSON_URL, { headers });
  if (!res.ok) {
    throw new Error(`Failed to fetch merged prices: HTTP ${res.status}`);
  }

  const rawText = await res.text();
  const rawHash = await sha256Hex(rawText);

  const arr = JSON.parse(rawText) as Array<{ name: string; price: string | number }>;
  const rates: Record<string, Rate> = {};
  const fetchedAtMs = Date.now();

  const extractUnitFromName = (name: string) => {
    const m = name.match(/^\s*(\d+)\s*/);
    if (!m) return { unit: 1, cleanName: name.trim() };
    const unit = Math.max(1, parseInt(m[1], 10));
    return { unit, cleanName: name.replace(/^\s*\d+\s*/g, "").trim() };
  };

  const parseNumberLoose = (v: string | number): number | null => {
    if (typeof v === "number") {
      return Number.isFinite(v) ? v : null;
    }
    const s = String(v).trim();
    if (!s) return null;
    const cleaned = s.replace(/,/g, "");
    const n = Number(cleaned);
    return Number.isFinite(n) ? n : null;
  };

  const normalizeKeyFromTitle = (title: string) => {
    const cleaned = stripPunct(title.toLowerCase()).replace(/\s+/g, " ").trim();
    return cleaned.replace(/\s+/g, "");
  };

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
    "cosmos": { code: "atom", kind: "crypto", fa: "کازماس", emoji: "💎" }
  };

  let usdToman: number | null = null;
  for (const row of arr) {
    if (!row?.name) continue;
    const { cleanName } = extractUnitFromName(String(row.name));
    const key = cleanName.toLowerCase();
    if (key === "us dollar") {
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

    let kind: Rate["kind"] = "currency";
    if (mapped?.kind) kind = mapped.kind;
    else if (typeof row.price === "number") kind = "crypto";
    else {
      const n = nameLower;
      if (n.includes("gold") || n.includes("azadi") || n.includes("emami") || n.includes("gerami")) kind = "gold";
      else kind = "currency";
    }

    let tomanPrice = priceNum;
    let usdPrice: number | undefined = undefined;

    if (typeof row.price === "number") {
      usdPrice = priceNum;
      if (usdToman != null) {
        tomanPrice = priceNum * usdToman;
      }
      kind = "crypto";
    } else if (nameLower === "gold ounce" || nameLower === "pax gold" || nameLower === "tether gold") {
      usdPrice = priceNum;
      if (usdToman != null) {
        tomanPrice = priceNum * usdToman;
      }
      kind = "crypto";
    }

    const meta = mapped
      ? { emoji: mapped.emoji, fa: mapped.fa }
      : (META[code] ?? { emoji: kind === "crypto" ? "💎" : "💱", fa: cleanName });

    rates[code] = {
      price: tomanPrice,
      unit,
      kind,
      title: cleanName,
      emoji: meta.emoji,
      fa: meta.fa,
      usdPrice
    };
  }

  const stored: Stored = {
    fetchedAtMs,
    source: PRICES_JSON_URL,
    rates
  };

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
  return { ok: true, changed, count: Object.keys(stored.rates).length };
}

function parsePersianNumber(tokens: string[]): number | null {
  const ones: Record<string, number> = {
    "یک": 1, "یه": 1, "دو": 2, "سه": 3, "چهار": 4, "پنج": 5, "شش": 6, "شیش": 6, "هفت": 7, "هشت": 8, "نه": 9
  };
  const teens: Record<string, number> = {
    "ده": 10, "یازده": 11, "دوازده": 12, "سیزده": 13, "چهارده": 14, "پانزده": 15, "شانزده": 16, "هفده": 17, "هجده": 18, "نوزده": 19
  };
  const tens: Record<string, number> = {
    "بیست": 20, "سی": 30, "چهل": 40, "پنجاه": 50, "شصت": 60, "هفتاد": 70, "هشتاد": 80, "نود": 90
  };
  const hundreds: Record<string, number> = {
    "صد": 100, "یکصد": 100,
    "دویست": 200, "سیصد": 300, "چهارصد": 400, "پانصد": 500,
    "ششصد": 600, "شیشصد": 600, "هفتصد": 700, "هشتصد": 800, "نهصد": 900
  };
  const scales: Record<string, number> = {
    "هزار": 1e3,
    "میلیون": 1e6,
    "ملیون": 1e6,
    "میلیارد": 1e9,
    "بیلیون": 1e9,
    "تریلیون": 1e12
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
    if (!addSmall(w)) {
      return null;
    }
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
  const mul = suf === "هزار" || suf === "k" ? 1e3
    : (suf === "میلیون" || suf === "ملیون" || suf === "m") ? 1e6
    : (suf === "میلیارد" || suf === "بیلیون" || suf === "b") ? 1e9
    : suf === "تریلیون" ? 1e12
    : 1;
  return num * mul;
}

function escapeRegExp(s: string) {
  return s.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function hasBounded(haystack: string, needle: string) {
  if (!needle) return false;
  const re = new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegExp(needle)}(?![\\p{L}\\p{N}])`, "iu");
  return re.test(haystack);
}

function findCode(textNorm: string, rates: Record<string, Rate>) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  for (const a of ALIAS_INDEX) {
    for (const k of a.spaced) {
      if (hasBounded(cleaned, k)) return a.code;
    }
    for (const k of a.compact) {
      if (hasBounded(compact, k)) return a.code;
    }
  }

  if (hasBounded(cleaned, "دلار") && (hasBounded(cleaned, "کانادا") || hasBounded(cleaned, "کاندا") || hasBounded(cleaned, "کانادایی") || hasBounded(cleaned, "کاندایی"))) {
    if (rates["cad"]) return "cad";
  }
  if (hasBounded(cleaned, "دینار") && (hasBounded(cleaned, "عراق") || hasBounded(cleaned, "عراقی"))) {
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
function extractAmount(textNorm: string) {
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

  return 1;
}

function normalizeCommand(textNorm: string) {
  const t = stripPunct(textNorm).trim();
  const first = t.split(/\s+/)[0] || "";
  return first.split("@")[0];
}

async function tgSend(env: Env, chatId: number, text: string, replyTo?: number, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`;
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyTo) { body.reply_to_message_id = replyTo; body.allow_sending_without_reply = true; }
  if (replyMarkup) { body.reply_markup = replyMarkup; }
  await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

async function tgEditMessage(env: Env, chatId: number, messageId: number, text: string, replyMarkup?: any) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/editMessageText`;
  const body: any = { chat_id: chatId, message_id: messageId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyMarkup) body.reply_markup = replyMarkup;
  await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

async function tgAnswerCallback(env: Env, callbackQueryId: string, text?: string) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/answerCallbackQuery`;
  const body: any = { callback_query_id: callbackQueryId };
  if (text) body.text = text;
  await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

async function tgSendVideo(env: Env, chatId: number, videoUrl: string, caption: string, replyTo?: number) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendVideo`;
  const body: any = { chat_id: chatId, video: videoUrl, caption: caption, parse_mode: "HTML" };
  if (replyTo) { body.reply_to_message_id = replyTo; body.allow_sending_without_reply = true; }
  const res = await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) });
  if (!res.ok) console.error("TG Video Error:", await res.text());
}

async function tgSendPhoto(env: Env, chatId: number, photoUrl: string, caption: string, replyTo?: number) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendPhoto`;
  const body: any = { chat_id: chatId, photo: photoUrl, caption: caption, parse_mode: "HTML" };
  if (replyTo) { body.reply_to_message_id = replyTo; body.allow_sending_without_reply = true; }
  await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
}

async function handleInstagram(env: Env, chatId: number, text: string, replyTo?: number) {
  const urlMatch = text.match(/(https?:\/\/(?:www\.)?instagram\.com\/[^ \n]+)/);
  if (!urlMatch) return false;
  const targetUrl = urlMatch[1];
  await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendChatAction`, {
    method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify({ chat_id: chatId, action: "upload_video" })
  });
  for (const baseUrl of COBALT_INSTANCES) {
    try {
      const endpoint = baseUrl.endsWith("json") ? baseUrl : baseUrl;
      const apiRes = await fetch(endpoint, {
        method: "POST",
        headers: { "Accept": "application/json", "Content-Type": "application/json", "User-Agent": "Mozilla/5.0 (compatible; TelegramBot/1.0)", "Origin": "https://cobalt.tools", "Referer": "https://cobalt.tools/" },
        body: JSON.stringify({ url: targetUrl, vCodec: "h264" })
      });
      if (!apiRes.ok) {
        if (apiRes.status === 404 && !baseUrl.includes("json")) {
          const retryUrl = baseUrl.endsWith("/") ? `${baseUrl}api/json` : `${baseUrl}/api/json`;
          const retryRes = await fetch(retryUrl, { method: "POST", headers: { "Accept": "application/json", "Content-Type": "application/json" }, body: JSON.stringify({ url: targetUrl, vCodec: "h264" }) });
          if (retryRes.ok) {
            const data = await retryRes.json<any>();
            await processCobaltResponse(env, chatId, data, replyTo);
            return true;
          }
        }
        throw new Error(`HTTP ${apiRes.status}`);
      }
      const data = await apiRes.json<any>();
      await processCobaltResponse(env, chatId, data, replyTo);
      return true;
    } catch (e: any) {
      console.error(`Error on instance ${baseUrl}:`, e.message);
    }
  }
  await tgSend(env, chatId, `❌ سرورهای دانلود پاسخگو نیستند. لطفاً دقایقی دیگر تلاش کنید.`, replyTo);
  return true;
}

async function processCobaltResponse(env: Env, chatId: number, data: any, replyTo?: number) {
  if (data.status === "error") throw new Error(data.text || "Cobalt Error");
  if (data.status === "stream" || data.status === "redirect") {
    await tgSendVideo(env, chatId, data.url, "✅ دانلود شد", replyTo);
  } else if (data.status === "picker" && data.picker && data.picker.length > 0) {
    const items = data.picker.slice(0, 4);
    for (const item of items) {
      if (item.type === "video") await tgSendVideo(env, chatId, item.url, "", replyTo);
      else if (item.type === "photo") await tgSendPhoto(env, chatId, item.url, "", replyTo);
    }
  } else {
    throw new Error("Unknown response");
  }
}

function chunkText(s: string, maxLen = 3500) {
  const out: string[] = [];
  for (let i = 0; i < s.length; i += maxLen) out.push(s.slice(i, i + maxLen));
  return out;
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

function buildAll(stored: Stored) {
  const rates = stored.rates;
  const codes = Object.keys(rates);
  
  const goldItems: string[] = [];
  const currencyItems: string[] = [];
  const cryptoItems: string[] = [];
  
  const priority = ["usd", "eur", "aed", "try", "afn", "iqd", "gbp"];
  const cryptoPriority = ["btc", "eth", "ton", "usdt", "trx", "not", "doge", "sol"];

  codes.sort((a, b) => {
    const rA = rates[a], rB = rates[b];
    if (rA.kind !== rB.kind) return 0; 
    if (rA.kind === "currency") {
      const idxA = priority.indexOf(a), idxB = priority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    if (rA.kind === "crypto") {
      const idxA = cryptoPriority.indexOf(a), idxB = cryptoPriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
    }
    return a.localeCompare(b);
  });

  for (const c of codes) {
    const r = rates[c];
    const per1 = Math.round(r.price / (r.unit || 1));
    const priceStr = formatToman(per1);
    
        if (r.kind === "crypto") {
      const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
      const changePart = (typeof r.change24h === "number")
        ? ` | ${r.change24h >= 0 ? "🟢" : "🔴"} ${Math.abs(r.change24h).toFixed(1)}%`
        : "";
      const line = `💎 <b>${r.fa}</b> (${c.toUpperCase()})
└ ${priceStr} ت | ${usdP}$${changePart}`;
      cryptoItems.push(line);
    } else {
      const meta = META[c] ?? { emoji: "💱", fa: (r.title || c.toUpperCase()) };
      const line = `${meta.emoji} <b>${meta.fa}:</b> \u200E<code>${priceStr}</code> تومان`;
      if (r.kind === "gold" || c.includes("coin") || c.includes("gold")) goldItems.push(line);
      else currencyItems.push(line);
    }
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

  const date = new Date(stored.fetchedAtMs + (3.5 * 3600000));
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
  bnb: { emoji: "🟡", fa: "بی‌ان‌بی" }
};

function getUpdateTimeStr(stored: Stored) {
  const date = new Date(stored.fetchedAtMs + (3.5 * 3600000));
  return date.toISOString().substr(11, 5);
}

function clampPage(page: number, totalPages: number) {
  if (!Number.isFinite(page) || page < 0) return 0;
  if (page >= totalPages) return Math.max(0, totalPages - 1);
  return page;
}

function shortButtonText(s: string, max = 60) {
  if (s.length <= max) return s;
  return s.slice(0, max - 1) + "…";
}

function shortColText(s: string, max = 18) {
  const t = s.replace(/\s+/g, " ").trim();
  if (t.length <= max) return t;
  return t.slice(0, max - 1) + "…";
}

function buildPriceItems(stored: Stored, category: PriceCategory): PriceListItem[] {
  const rates = stored.rates;
  const codes = Object.keys(rates);

  const priority = ["usd", "eur", "aed", "try", "afn", "iqd", "gbp"];
  const cryptoPriority = ["btc", "eth", "ton", "usdt", "trx", "not", "doge", "sol"];

  if (category === "crypto") {
    const cryptoCodes = codes.filter((c) => rates[c]?.kind === "crypto");
    cryptoCodes.sort((a, b) => {
      const idxA = cryptoPriority.indexOf(a), idxB = cryptoPriority.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    const items: PriceListItem[] = [];
    for (const c of cryptoCodes) {
      const r = rates[c];
      const per1 = Math.round(r.price / (r.unit || 1));
      const toman = formatToman(per1);
      const meta = CRYPTO_META[c] ?? { emoji: (r.emoji || "💎"), fa: (r.fa || r.title || c.toUpperCase()) };
      items.push({
        code: c,
        category,
        emoji: meta.emoji,
        name: shortColText(meta.fa, 20),
        price: shortColText(`${toman} ت`, 16)
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
    const idxA = priority.indexOf(a), idxB = priority.indexOf(b);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    if (idxA !== -1) return -1;
    if (idxB !== -1) return 1;
    return a.localeCompare(b);
  });

  const merged = [...goldCodes, ...currencyCodes];

  const items: PriceListItem[] = [];
  for (const c of merged) {
    const r = rates[c];
    const per1 = Math.round(r.price / (r.unit || 1));
    const priceStr = formatToman(per1);
    const meta = META[c] ?? { emoji: "💱", fa: (r.title || r.fa || c.toUpperCase()) };
    items.push({
      code: c,
      category,
      emoji: meta.emoji,
      name: shortColText(meta.fa, 20),
      price: shortColText(`${priceStr} ت`, 16)
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
      { text: `${it.emoji} ${it.name}`, callback_data: cb }
    ]);
  }

  const prevCb = page > 0 ? `page:${category}:${page - 1}` : "noop";
  const nextCb = page + 1 < totalPages ? `page:${category}:${page + 1}` : "noop";

  rows.push([
    { text: "بعدی ⬅️", callback_data: nextCb },
    { text: "🏠 خانه", callback_data: "start_menu" },
    { text: "➡️ قبلی", callback_data: prevCb }
  ]);

  return { inline_keyboard: rows };
}

function buildCategoryHeaderText(category: PriceCategory, page: number, totalPages: number, timeStr: string) {
  if (category === "crypto") {
    return [
      "🪙 <b>قیمت ارز دیجیتال</b>",
      `📄 صفحه ${page + 1}/${totalPages}`,
      `🕐 <b>بروزرسانی:</b> ${timeStr}`
    ].join("\n");
  }
  return [
    "💱 <b>قیمت ارز و طلا</b>",
    `📄 صفحه ${page + 1}/${totalPages}`,
    `🕐 <b>بروزرسانی:</b> ${timeStr}`
  ].join("\n");
}

function buildPriceDetailText(stored: Stored, category: PriceCategory, code: string) {
  const r = stored.rates?.[code];
  if (!r) return "❗️این آیتم پیدا نشد.";
  const per1 = Math.round(r.price / (r.unit || 1));
  const toman = formatToman(per1);

  if (category === "crypto") {
    const usdP = r.usdPrice != null ? formatUSD(r.usdPrice) : "?";
    const change = r.change24h ?? 0;
    const changeEmoji = change >= 0 ? "🟢" : "🔴";
    const changeStr = Math.abs(change).toFixed(2) + "%";

    const meta = CRYPTO_META[code] ?? { emoji: (r.emoji || "💎"), fa: (r.fa || r.title || code.toUpperCase()) };

    return [
      `${meta.emoji} <b>${meta.fa}</b> (${code.toUpperCase()})`,
      `💶 قیمت: <code>${toman}</code> تومان`,
      `💵 قیمت دلاری: <code>${usdP}</code> $`,
      `📈 تغییر 24ساعته: ${changeEmoji} <b>${changeStr}</b>`,
      "",
      `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`
    ].join("\n");
  }

  const meta = META[code] ?? { emoji: "💱", fa: (r.title || r.fa || code.toUpperCase()) };
  return [
    `${meta.emoji} <b>${meta.fa}</b>`,
    `💶 قیمت: <code>${toman}</code> تومان`,
    r.unit && r.unit !== 1 ? `📦 واحد: <code>${r.unit}</code>` : "",
    "",
    `🕐 <b>بروزرسانی:</b> ${getUpdateTimeStr(stored)}`
  ].filter(Boolean).join("\n");
}

function buildDetailKeyboard(category: PriceCategory, page: number) {
  return {
    inline_keyboard: [
      [
        { text: "🔙 بازگشت", callback_data: `page:${category}:${page}` },
        { text: "🏠 خانه", callback_data: "start_menu" }
      ]
    ]
  };
}

function replyCurrency(r: Rate, amount: number) {
  const per1 = r.price / (r.unit || 1);
  const total = per1 * amount;
  const aStr = Number.isInteger(amount) ? String(amount) : String(amount);
  
  if (r.kind === "crypto") {
    const totalUsd = (r.usdPrice || 0) * amount;
    return `💎 <b>${aStr} ${r.fa} (${r.title})</b>\n\n💵 قیمت دلاری: ${formatUSD(totalUsd)}$\n🇮🇷 قیمت تومانی: ${formatToman(total)} تومان`;
  }

  if (amount <= 1) return `1 ${r.fa} = ${formatToman(per1)} تومان`;
  return `${aStr} ${r.fa} = ${formatToman(total)} تومان`;
}

function replyGold(rGold: Rate, amount: number, stored: Stored) {
  const per1Toman = rGold.price / (rGold.unit || 1);
  const totalToman = per1Toman * amount;
  const usd = stored.rates["usd"];
  const aStr = Number.isInteger(amount) ? String(amount) : String(amount);
  if (usd) {
    const usdPer1 = usd.price / (usd.unit || 1);
    const totalUsd = totalToman / usdPer1;
    return [
      `💰 ${aStr} ${rGold.fa} = ${formatUSD(totalUsd)}$`,
      `💶 ${formatToman(totalToman)} تومان`
    ].join("\n");
  }
  return `💶 ${aStr} ${rGold.fa} = ${formatToman(totalToman)} تومان`;
}

const START_KEYBOARD = {
  inline_keyboard: [
    [
      { text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` },
      { text: "📘 راهنما", callback_data: "help_menu" }
    ],
    [
      { text: "💱 قیمت ارز و طلا", callback_data: "cat:fiat" }
    ],
    [
      { text: "🪙 قیمت ارز دیجیتال", callback_data: "cat:crypto" }
    ]
  ]
};

const HELP_KEYBOARD = {
  inline_keyboard: [
    [{ text: "🔙 بازگشت", callback_data: "start_menu" }]
  ]
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
        return new Response(JSON.stringify({ ok: false, error: String(e?.message ?? e) }), { headers: { "content-type": "application/json" }, status: 502 });
      }
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") return new Response("Not Found", { status: 404 });
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await req.json<any>().catch(() => null);

    if (update?.edited_message) return new Response("ok");

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
        const category = (data.split(":")[1] as any) as PriceCategory;
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
        const category = (parts[1] as any) as PriceCategory;
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
        const category = (parts[1] as any) as PriceCategory;
        const code = (parts[2] || "").toLowerCase();
        const page = parseInt(parts[3] || "0", 10) || 0;
        await tgAnswerCallback(env, cb.id, "📩 ارسال شد");
        const stored = await getStoredOrRefresh(env, ctx);
        const text = buildPriceDetailText(stored, category, code);
        await tgSend(env, chatId, text);
        return new Response("ok");
      } else if (data === "get_all_prices") {
        await tgAnswerCallback(env, cb.id);
        await tgEditMessage(env, chatId, messageId, "📌 یک دسته‌بندی را انتخاب کنید:", START_KEYBOARD);
        return new Response("ok");
      }

      await tgAnswerCallback(env, cb.id);
      return new Response("ok");
    }

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
    const inCooldown = await env.BOT_KV.get(cooldownKey);
    if (inCooldown) return new Response("ok");

    ctx.waitUntil(env.BOT_KV.put(cooldownKey, "1", { expirationTtl: 5 }));

    const textNorm = norm(text);
    const cmd = normalizeCommand(textNorm);

    const run = async () => {
      if (text.includes("instagram.com")) {
        await handleInstagram(env, chatId, text, replyTo);
        return;
      }

      if (cmd === "/start") {
        await tgSend(env, chatId, "👋 سلام! به ربات [ارز چی؟] خوش آمدید.\n\nمن می‌توانم قیمت ارزها و کریپتو را بگویم و ویدیوهای اینستاگرام را دانلود کنم.", replyTo, START_KEYBOARD);
        return;
      }
      
      if (cmd === "/help") {
        await tgSend(env, chatId, getHelpMessage(), replyTo, HELP_KEYBOARD);
        return;
      }

      if (cmd === "/refresh") {
        const parts = stripPunct(textNorm).split(/\s+/).filter(Boolean);
        const key = parts[1] || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return; 
        const r = await refreshRates(env);
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

      const code = findCode(textNorm, stored.rates);
      if (!code) return;

      const amount = extractAmount(textNorm);
      const r = stored.rates[code];
      if (!r) return;

      const out = r.kind === "gold" ? replyGold(r, amount, stored) : replyCurrency(r, amount);
      await tgSend(env, chatId, out, replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  }
};
