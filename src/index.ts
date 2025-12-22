export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const BOT_USERNAME = "worker093578bot";

const PRICES_JSON_URL = "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/prices.json";
const CRYPTO_CSV_URL = "https://raw.githubusercontent.com/michaelvincentsebastian/Automated-Crypto-Market-Insights/refs/heads/main/latest-data/latest_data.csv";

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
  coin_emami: { emoji: "🌕", fa: "سکه امامی" },
  coin_bahar: { emoji: "🌕", fa: "سکه بهار آزادی" },
  coin_half: { emoji: "🌗", fa: "نیم سکه" },
  coin_quarter: { emoji: "🌘", fa: "ربع سکه" },
  coin_gram: { emoji: "🌑", fa: "سکه گرمی" }
};

const ALIASES: Array<{ keys: string[]; code: string }> = [
  { keys: ["دلار", "usd", "تتر", "tether", "usdt"], code: "usd" },
  { keys: ["یورو", "eur"], code: "eur" },
  { keys: ["پوند", "gbp"], code: "gbp" },
  { keys: ["درهم", "aed"], code: "aed" },
  { keys: ["لیر", "try"], code: "try" },
  { keys: ["افغانی", "afn"], code: "afn" },
  { keys: ["طلا", "gold", "گرم طلا", "طلای ۱۸", "طلای18"], code: "gold_gram_18k" },
  { keys: ["مثقال", "mithqal"], code: "gold_mithqal" },
  { keys: ["سکه", "coin", "امامی"], code: "coin_emami" },
  { keys: ["بیت", "بیتکوین", "btc", "bitcoin"], code: "btc" },
  { keys: ["اتریوم", "eth", "ethereum"], code: "eth" },
  { keys: ["نات", "ناتکوین", "not", "notcoin"], code: "not" },
  { keys: ["تون", "ton", "toncoin"], code: "ton" },
  { keys: ["دوج", "doge", "dogecoin"], code: "doge" },
  { keys: ["شیبا", "shib", "shiba"], code: "shib" },
  { keys: ["ترون", "trx", "tron"], code: "trx" },
  { keys: ["سولانا", "sol", "solana"], code: "sol" }
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
  const [resJson, resCsv] = await Promise.all([
    fetch(PRICES_JSON_URL, { headers }),
    fetch(CRYPTO_CSV_URL, { headers })
  ]);

  const rates: Record<string, Rate> = {};
  let fetchedAtMs = Date.now();
  
  // 1. Process Fiat/Gold JSON
  if (resJson.ok) {
    const j = await resJson.json<any>();
    const items = Array.isArray(j?.items) ? j.items : [];
    for (const it of items) {
      const type = String(it?.type ?? "").toLowerCase();
      const name = String(it?.name ?? "").trim();
      const price = toNum(it?.price);
      if (!name || price == null || price <= 0) continue;

      if (type === "currency") {
        const p = parseCurrencyItem(name);
        if (!p) continue;
        const meta = META[p.code] ?? { emoji: "💱", fa: p.code.toUpperCase() };
        rates[p.code] = { price, unit: p.unit, kind: "currency", title: name, emoji: meta.emoji, fa: meta.fa };
      } else if (type === "gold") {
        const nn = name.toLowerCase();
        const key = nn.includes("mithqal") ? "gold_mithqal" : nn.includes("gram") && nn.includes("18") ? "gold_gram_18k" : nn.includes("gram") ? "gold_gram_18k" : nn.includes("mith") ? "gold_mithqal" : "gold_gram_18k";
        const meta = META[key] ?? { emoji: "💰", fa: "طلا" };
        rates[key] = { price, unit: 1, kind: "gold", title: name, emoji: meta.emoji, fa: meta.fa };
      }
    }
  }

  // 2. Process Crypto CSV
  let usdToToman = rates["usd"] ? (rates["usd"].price / rates["usd"].unit) : 0;
  if (usdToToman === 0) usdToToman = 60000; 

  if (resCsv.ok) {
    const csvText = await resCsv.text();
    const cryptoItems = parseCSV(csvText);
    
    // Check USDT price from CSV to adjust if needed, but stick to JSON USD for base
    const usdt = cryptoItems.find(c => c.symbol === "usdt");
    if (usdt && Math.abs(usdt.price - 1) > 0.1) {
    }

    for (const c of cryptoItems) {
      // Skip stablecoins if you want, or keep them. keeping them is better.
      // If the symbol exists in fiat (unlikely except USD?), skip
      if (rates[c.symbol] && rates[c.symbol].kind === "currency") continue;

      const tomanPrice = c.price * usdToToman;
      rates[c.symbol] = {
        price: tomanPrice,
        unit: 1,
        kind: "crypto",
        title: c.name,
        emoji: "💎",
        fa: c.name,
        usdPrice: c.price,
        change24h: c.change
      };
    }
  }

  const stored: Stored = { fetchedAtMs, source: "mixed", rates };
  const rawHash = await sha256Hex(JSON.stringify(rates));
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

function parsePersianNumberUpTo100(tokens: string[]): number | null {
  const ones: Record<string, number> = { "یک":1,"یه":1,"دو":2,"سه":3,"چهار":4,"پنج":5,"شش":6,"شیش":6,"هفت":7,"هشت":8,"نه":9 };
  const teens: Record<string, number> = { "ده":10,"یازده":11,"دوازده":12,"سیزده":13,"چهارده":14,"پانزده":15,"شانزده":16,"هفده":17,"هجده":18,"نوزده":19 };
  const tens: Record<string, number> = { "بیست":20,"سی":30,"چهل":40,"پنجاه":50,"شصت":60,"هفتاد":70,"هشتاد":80,"نود":90 };
  const t = tokens.filter(x => x && x !== "و");
  if (t.length === 0) return null;
  const joined = t.join("").replace(/\s+/g, "");
  if (joined === "یکصد" || t.join(" ") === "یک صد" || t[0] === "صد") return 100;
  if (t.length === 1) {
    if (teens[t[0]] != null) return teens[t[0]];
    if (tens[t[0]] != null) return tens[t[0]];
    if (ones[t[0]] != null) return ones[t[0]];
  }
  if (t.length === 2) {
    const a = t[0], b = t[1];
    if (tens[a] != null && ones[b] != null) return tens[a] + ones[b];
  }
  let total = 0;
  for (const w of t) {
    if (teens[w] != null) return teens[w];
    if (tens[w] != null) total += tens[w];
    else if (ones[w] != null) total += ones[w];
    else return null;
  }
  if (total >= 1 && total <= 100) return total;
  return null;
}

function findCode(textNorm: string, rates: Record<string, Rate>) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");
  
  const aliasMatch = ALIASES.find(a => a.keys.some(k => compact.includes(k)));
  if (aliasMatch) return aliasMatch.code;

  const m = cleaned.match(/\b([a-z]{3,10})\b/i);
  if (m) {
    const candidate = m[1].toLowerCase();
    if (rates[candidate]) return candidate;
  }
  
  for (const key in rates) {
    if (compact === key || compact === rates[key].title.toLowerCase().replace(/\s+/g, "")) return key;
  }
  
  return null;
}

function extractAmount(textNorm: string) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const tokens = cleaned.split(" ").filter(Boolean);
  const win = tokens.slice(-7);
  for (let i = 0; i < win.length; i++) {
    for (let j = win.length; j > i; j--) {
      const n = parsePersianNumberUpTo100(win.slice(i, j));
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
      const usdP = r.usdPrice ? formatUSD(r.usdPrice) : "?";
      const changeEmoji = (r.change24h || 0) >= 0 ? "🟢" : "🔴";
      const changeStr = Math.abs(r.change24h || 0).toFixed(1) + "%";
      const line = `💎 <b>${r.fa}</b> (${c.toUpperCase()})\n└ ${priceStr} ت | ${usdP}$ | ${changeEmoji} ${changeStr}`;
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

// A small curated map for nicer crypto labels (falls back to CSV name if missing)
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
  // Keep the original time behavior (IR time) used in buildAll()
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

  // fiat + gold
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

  // Header row (3 columns)
  const headerRight = category === "crypto" ? "🪙 نام" : "💱 نام";
  rows.push([
    { text: "✨", callback_data: "noop" },
    { text: "💰 قیمت", callback_data: "noop" },
    { text: headerRight, callback_data: "noop" }
  ]);

  for (const it of slice) {
    const cb = `show:${category}:${it.code}:${page}`;
    rows.push([
      { text: it.emoji, callback_data: cb },
      { text: it.price, callback_data: cb },
      { text: it.name, callback_data: cb }
    ]);
  }

  const prevCb = page > 0 ? `page:${category}:${page - 1}` : "noop";
  const nextCb = page + 1 < totalPages ? `page:${category}:${page + 1}` : "noop";

  rows.push([
    { text: "⬅️ قبلی", callback_data: prevCb },
    { text: "🏠 خانه", callback_data: "start_menu" },
    { text: "بعدی ➡️", callback_data: nextCb }
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
        await tgAnswerCallback(env, cb.id);
        const stored = await getStoredOrRefresh(env, ctx);
        const text = buildPriceDetailText(stored, category, code);
        const kb = buildDetailKeyboard(category, page);
        await tgEditMessage(env, chatId, messageId, text, kb);
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
