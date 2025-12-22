export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const BOT_USERNAME = "CHANGE_THIS_TO_YOUR_BOT_USERNAME";

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

const KEY_RATES = "rates:v3:latest";
const KEY_HASH = "rates:v3:hash";

// --- DICTIONARIES ---

// نگاشت نام‌های فارسی ارزهای دیجیتال برای تشخیص در متن و نمایش
const CRYPTO_PERSIAN_NAMES: Record<string, string> = {
  "BTC": "بیت‌کوین", "ETH": "اتریوم", "USDT": "تتر", "BNB": "بایننس‌کوین",
  "SOL": "سولانا", "XRP": "ریپل", "DOGE": "دوج‌کوین", "ADA": "کاردانو",
  "TRX": "ترون", "AVAX": "آوالانچ", "LINK": "چین‌لینک", "DOT": "پولکادات",
  "MATIC": "ماتیک", "LTC": "لایت‌کوین", "BCH": "بیت‌کوین‌کش", "UNI": "یونی‌سواپ",
  "SHIB": "شیبا", "OKB": "اوکی‌بی", "XLM": "استلار", "XMR": "مونرو",
  "ETC": "اتریوم‌کلاسیک", "HBAR": "هدرا", "FIL": "فایل‌کوین", "VET": "وی‌چین",
  "ATOM": "اتم", "ICP": "اینترنت‌کامپیوتر", "NEAR": "نیر", "QNT": "کوانت",
  "PEPE": "پپه", "GRT": "گراف", "RNDR": "رندر", "MKR": "میکر",
  "STX": "استکس", "ALGO": "الگورند", "FTM": "فانتوم", "SAND": "سندباکس",
  "MANA": "دیسنترالند", "EOS": "ایاس", "THETA": "تتا", "AAVE": "آوه",
  "NOT": "نات‌کوین", "TON": "تون‌کوین", "KAS": "کسپا", "INJ": "اینجکتیو",
  "TIA": "سلستیا", "SEI": "سی", "SUI": "سویی", "BONK": "بونک",
  "WIF": "ویف", "FLOKI": "فلوکی", "FET": "فت", "AR": "آرویو",
  "JUP": "ژوپیتر", "PYTH": "پایت", "BLUR": "بلر", "LDO": "لیدو"
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
  gold_gram_18k: { emoji: "🥇", fa: "گرم طلا ۱۸" },
  gold_mithqal: { emoji: "⚖️", fa: "مثقال طلا" },
  coin_emami: { emoji: "🌕", fa: "سکه امامی" },
  coin_bahar: { emoji: "🌕", fa: "سکه بهار آزادی" },
  coin_half: { emoji: "🌗", fa: "نیم سکه" },
  coin_quarter: { emoji: "🌘", fa: "ربع سکه" },
  coin_gram: { emoji: "🌑", fa: "سکه گرمی" }
};

// --- TYPES ---

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
  rates: Record<string, Rate> 
};

// --- HELPERS ---

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
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

// --- PARSING ---

function parsePersianNumber(tokens: string[]): number | null {
  const ones: Record<string, number> = { "یک":1,"یه":1,"دو":2,"سه":3,"چهار":4,"پنج":5,"شش":6,"شیش":6,"هفت":7,"هشت":8,"نه":9 };
  const teens: Record<string, number> = { "ده":10,"یازده":11,"دوازده":12,"سیزده":13,"چهارده":14,"پانزده":15,"شانزده":16,"هفده":17,"هجده":18,"نوزده":19 };
  const tens: Record<string, number> = { "بیست":20,"سی":30,"چهل":40,"پنجاه":50,"شصت":60,"هفتاد":70,"هشتاد":80,"نود":90 };
  const hundreds: Record<string, number> = { "صد":100,"یکصد":100,"دویست":200,"سیصد":300,"چهارصد":400,"پانصد":500,"شيشصد":600,"ششصد":600,"هفتصد":700,"هشتصد":800,"نهصد":900 };

  const t = tokens.filter(x => x && x !== "و");
  if (t.length === 0) return null;
  
  let total = 0;
  let current = 0;

  for (const w of t) {
    if (hundreds[w]) { current += hundreds[w]; continue; }
    if (tens[w]) { current += tens[w]; continue; }
    if (teens[w]) { current += teens[w]; continue; }
    if (ones[w]) { current += ones[w]; continue; }
    // اگر کلمه عدد نبود، یعنی زنجیره پاره شده، اما ما فعلا ساده فرض میکنیم
  }
  
  return current > 0 ? current : null;
}

function extractAmount(textNorm: string) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  
  // 1. عدد ریاضی
  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  
  // 2. عدد حروفی (محدود به ۹۹۹ برای سادگی)
  const tokens = cleaned.split(" ").filter(Boolean);
  // پنجره ۱۰ کلمه‌ای برای پیدا کردن عدد
  const win = tokens.slice(-10); 
  for (let i = 0; i < win.length; i++) {
    for (let j = win.length; j > i; j--) {
      const sub = win.slice(i, j);
      const n = parsePersianNumber(sub);
      if (n != null && n > 0) return n;
    }
  }
  return 1;
}

function findCode(textNorm: string, rates: Record<string, Rate>) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const tokens = cleaned.split(" ");
  const compact = cleaned.replace(/\s+/g, "");

  // 1. جستجوی دقیق کد (USD, BTC)
  for (const t of tokens) {
    if (t.length < 3) continue;
    if (rates[t]) return t;
  }

  // 2. جستجوی فارسی در دیتابیس (سولانا، دلار)
  for (const [code, rate] of Object.entries(rates)) {
    // حذف فاصله‌ها از نام فارسی برای مقایسه (بیت کوین -> بیتکوین)
    const faClean = rate.fa.replace(/\s+/g, "");
    if (compact.includes(faClean) || compact.includes(code)) return code;
    
    // بررسی کلمات کلیدی خاص (مثل "تتر")
    if (rate.title.toLowerCase() === compact) return code;
  }
  
  // 3. بررسی آلیاس‌های سخت (مثل "طلا")
  if (compact.includes("طلا")) return "gold_gram_18k";
  if (compact.includes("سکه") || compact.includes("امامی")) return "coin_emami";
  if (compact.includes("مثقال")) return "gold_mithqal";
  if (compact.includes("دلار")) return "usd";
  if (compact.includes("یورو")) return "eur";

  return null;
}

// --- FETCH DATA ---

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
    if (!isNaN(price) && symbol) result.push({ symbol, name, price, change });
  }
  return result;
}

async function fetchAndMergeData(env: Env): Promise<{ stored: Stored; rawHash: string }> {
  const headers = { "User-Agent": "Bot/1.0" };
  const [resJson, resCsv] = await Promise.all([
    fetch(PRICES_JSON_URL, { headers }),
    fetch(CRYPTO_CSV_URL, { headers })
  ]);

  const rates: Record<string, Rate> = {};
  
  // 1. ارز و طلا
  if (resJson.ok) {
    const j = await resJson.json<any>();
    const items = Array.isArray(j?.items) ? j.items : [];
    for (const it of items) {
      const type = String(it?.type ?? "").toLowerCase();
      const name = String(it?.name ?? "").trim();
      const price = toNum(it?.price);
      if (!name || price == null || price <= 0) continue;
      
      if (type === "currency") {
        const m = name.match(/^([A-Z]{3})\s*(.*)$/);
        if (!m) continue;
        const code = m[1].toLowerCase();
        const meta = META[code] ?? { emoji: "💱", fa: code.toUpperCase() };
        rates[code] = { price, unit: 1, kind: "currency", title: name, emoji: meta.emoji, fa: meta.fa };
      } else if (type === "gold") {
        const nn = name.toLowerCase();
        const key = nn.includes("mithqal") ? "gold_mithqal" : nn.includes("coin") ? "coin_emami" : "gold_gram_18k";
        const meta = META[key] ?? { emoji: "💰", fa: "طلا" };
        rates[key] = { price, unit: 1, kind: "gold", title: name, emoji: meta.emoji, fa: meta.fa };
      }
    }
  }

  // نرخ دلار برای تبدیل
  let usdToToman = rates["usd"] ? rates["usd"].price : 60000;

  // 2. کریپتو
  if (resCsv.ok) {
    const csvItems = parseCSV(await resCsv.text());
    for (const c of csvItems) {
      if (rates[c.symbol] && rates[c.symbol].kind === "currency") continue; // اولویت با فیات

      // پیدا کردن نام فارسی
      const faName = CRYPTO_PERSIAN_NAMES[c.symbol.toUpperCase()] || c.name;

      rates[c.symbol] = {
        price: c.price * usdToToman,
        unit: 1,
        kind: "crypto",
        title: c.name,
        emoji: "💎",
        fa: faName,
        usdPrice: c.price,
        change24h: c.change
      };
    }
  }

  const stored: Stored = { fetchedAtMs: Date.now(), rates };
  const rawHash = await sha256Hex(JSON.stringify(rates));
  return { stored, rawHash };
}

async function refreshRates(env: Env) {
  const { stored, rawHash } = await fetchAndMergeData(env);
  const prevHash = await env.BOT_KV.get(KEY_HASH);
  if (prevHash !== rawHash) {
    await env.BOT_KV.put(KEY_HASH, rawHash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
    return { ok: true, changed: true };
  }
  return { ok: true, changed: false };
}

// --- TELEGRAM & UI ---

async function tgSend(env: Env, chatId: number, text: string, replyMarkup?: any) {
  await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, text, parse_mode: "HTML", reply_markup: replyMarkup, disable_web_page_preview: true })
  }).catch(() => {});
}

async function tgEdit(env: Env, chatId: number, msgId: number, text: string, replyMarkup?: any) {
  await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/editMessageText`, {
    method: "POST", headers: { "content-type": "application/json" },
    body: JSON.stringify({ chat_id: chatId, message_id: msgId, text, parse_mode: "HTML", reply_markup: replyMarkup, disable_web_page_preview: true })
  }).catch(() => {});
}

const MENUS = {
  start: {
    inline_keyboard: [
      [{ text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` }, { text: "📘 راهنما", callback_data: "help" }],
      [{ text: "📊 لیست قیمت‌ها", callback_data: "list_type" }]
    ]
  },
  listType: {
    inline_keyboard: [
      [{ text: "💵 ارز و طلا", callback_data: "get_fiat" }, { text: "🚀 ارز دیجیتال", callback_data: "get_crypto" }],
      [{ text: "🔙 بازگشت", callback_data: "start" }]
    ]
  },
  back: { inline_keyboard: [[{ text: "🔙 منوی اصلی", callback_data: "start" }]] }
};

function buildFiatList(rates: Record<string, Rate>) {
  const lines = ["💵 <b>نرخ بازار آزاد</b>\n"];
  const gold = [], fiat = [];
  const priority = ["usd", "eur", "aed", "gbp", "try", "afn", "iqd"];
  
  Object.keys(rates).sort().forEach(k => {
    const r = rates[k];
    if (r.kind === "crypto") return;
    const txt = `${r.emoji} ${r.fa}: <code>${formatToman(r.price)}</code> ت`;
    if (r.kind === "gold") gold.push(txt);
    else fiat.push({ k, txt });
  });

  fiat.sort((a, b) => {
    const idxA = priority.indexOf(a.k), idxB = priority.indexOf(b.k);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return idxA !== -1 ? -1 : idxB !== -1 ? 1 : 0;
  });

  lines.push(...gold, "➖➖➖", ...fiat.map(x => x.txt));
  return lines.join("\n");
}

function buildCryptoList(rates: Record<string, Rate>) {
  const lines = ["🚀 <b>بازار ارز دیجیتال</b>\n"];
  const cryptos = [];
  const priority = ["btc", "eth", "ton", "usdt", "not", "doge", "shib", "trx", "sol"];

  Object.keys(rates).forEach(k => {
    const r = rates[k];
    if (r.kind !== "crypto") return;
    cryptos.push({ 
      k, 
      txt: `🔹 <b>${r.fa}</b> (${k.toUpperCase()})\n   <code>${formatToman(r.price)}</code> ت | <code>${formatUSD(r.usdPrice!)}</code>$ | ${(r.change24h||0)>0?"🟢":"🔴"}%`
    });
  });

  cryptos.sort((a, b) => {
    const idxA = priority.indexOf(a.k), idxB = priority.indexOf(b.k);
    if (idxA !== -1 && idxB !== -1) return idxA - idxB;
    return idxA !== -1 ? -1 : idxB !== -1 ? 1 : 0;
  });

  lines.push(...cryptos.map(x => x.txt));
  return lines.join("\n");
}

async function handleInstagram(env: Env, chatId: number, text: string) {
  const url = text.match(/(https?:\/\/(?:www\.)?instagram\.com\/[^ \n]+)/)?.[1];
  if (!url) return;
  
  await tgSend(env, chatId, "⏳ در حال دانلود...");
  
  for (const base of COBALT_INSTANCES) {
    try {
      const res = await fetch(`${base}/api/json`, {
        method: "POST", headers: { "content-type": "application/json", "Accept": "application/json" },
        body: JSON.stringify({ url, vCodec: "h264" })
      });
      if (res.ok) {
        const data = await res.json<any>();
        if (data.status === "stream" || data.status === "redirect") {
          await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendVideo`, {
             method: "POST", headers: { "content-type": "application/json" },
             body: JSON.stringify({ chat_id: chatId, video: data.url, caption: "✅ دانلود شد" }) 
          });
          return;
        }
      }
    } catch (e) {}
  }
  await tgSend(env, chatId, "❌ خطا در دانلود.");
}

// --- WORKER ENTRY ---

export default {
  async scheduled(_e: any, env: Env, _c: any) { await refreshRates(env).catch(()=>{}); },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (url.pathname === "/refresh" && url.searchParams.get("key") === env.ADMIN_KEY) {
      await refreshRates(env);
      return new Response("OK");
    }
    if (req.method !== "POST") return new Response("OK");

    const update = await req.json<any>().catch(()=>null);
    if (!update || update.edited_message) return new Response("OK");

    // Callback Handler
    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const cid = cb.message.chat.id;
      const mid = cb.message.message_id;

      let txt = "", kb = null;
      
      if (data === "start") { txt = "👋 سلام! چطور میتونم کمکت کنم؟"; kb = MENUS.start; }
      else if (data === "help") { 
        txt = "🤖 <b>راهنما:</b>\n\n1️⃣ <b>قیمت:</b> ارسال نام (دلار، بیت کوین، طلا)\n2️⃣ <b>تبدیل:</b> مقدار + نام (۱۰۰ دلار، دو سولانا)\n3️⃣ <b>دانلود:</b> ارسال لینک اینستاگرام"; 
        kb = MENUS.back; 
      }
      else if (data === "list_type") { txt = "نوع ارز را انتخاب کنید:"; kb = MENUS.listType; }
      else if (data === "get_fiat" || data === "get_crypto") {
        const stored = await env.BOT_KV.get(KEY_RATES).then(x => x ? JSON.parse(x) : null);
        if (!stored) { await tgSend(env, cid, "⚠️ داده‌ای نیست."); return new Response("OK"); }
        
        const list = data === "get_fiat" ? buildFiatList(stored.rates) : buildCryptoList(stored.rates);
        // ارسال لیست به صورت چند پیام اگر طولانی باشد
        const chunks = [];
        for (let i = 0; i < list.length; i += 3800) chunks.push(list.slice(i, i + 3800));
        
        await tgSend(env, cid, chunks[0]); // پیام اول
        for(let i=1; i<chunks.length; i++) await tgSend(env, cid, chunks[i]);
        
        // پاسخ به کال بک برای بستن لودینگ
        await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/answerCallbackQuery`, {
          method: "POST", headers:{"content-type":"application/json"}, body:JSON.stringify({callback_query_id:cb.id})
        });
        return new Response("OK");
      }

      if (txt) await tgEdit(env, cid, mid, txt, kb);
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/answerCallbackQuery`, {
          method: "POST", headers:{"content-type":"application/json"}, body:JSON.stringify({callback_query_id:cb.id})
      });
      return new Response("OK");
    }

    // Message Handler
    const msg = update.message;
    if (!msg || !msg.text) return new Response("OK");
    
    // Check Cooldown & Timeout
    const now = Math.floor(Date.now()/1000);
    if (now - msg.date > 40) return new Response("OK"); // پیام قدیمی
    
    const uid = msg.from.id;
    if (await env.BOT_KV.get(`cd:${uid}`)) return new Response("OK");
    ctx.waitUntil(env.BOT_KV.put(`cd:${uid}`, "1", { expirationTtl: 4 }));

    const text = msg.text;
    const cid = msg.chat.id;

    if (text.includes("instagram.com")) {
      ctx.waitUntil(handleInstagram(env, cid, text));
      return new Response("OK");
    }

    const normText = norm(text);
    const cmd = text.split(" ")[0].split("@")[0];

    if (cmd === "/start") {
      await tgSend(env, cid, "👋 سلام! من ربات قیمت و ابزار هستم.", MENUS.start);
      return new Response("OK");
    }

    // Price Logic
    const storedStr = await env.BOT_KV.get(KEY_RATES);
    if (!storedStr) return new Response("OK");
    const stored = JSON.parse(storedStr);

    const code = findCode(normText, stored.rates);
    if (code) {
      const amount = extractAmount(normText);
      const r = stored.rates[code];
      const val = r.price * amount;
      
      let res = "";
      if (r.kind === "crypto") {
        res = `💎 <b>${amount} ${r.fa}</b>\n💵 ${formatUSD(r.usdPrice! * amount)}$\n🇮🇷 ${formatToman(val)} تومان`;
      } else {
        res = `${r.emoji} <b>${amount} ${r.fa}</b> = <code>${formatToman(val)}</code> تومان`;
      }
      
      await tgSend(env, cid, res);
    }

    return new Response("OK");
  }
};
