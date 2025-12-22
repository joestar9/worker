export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const BOT_USERNAME = "CHANGE_THIS_TO_YOUR_BOT_USERNAME";

const PRICES_URL = "https://raw.githubusercontent.com/joestar9/price-scraper/refs/heads/main/prices.json";
const CRYPTO_URL = "https://raw.githubusercontent.com/michaelvincentsebastian/Automated-Crypto-Market-Insights/refs/heads/main/latest-data/latest_data.csv";

const COBALT_INSTANCES = [
  "https://cobalt-api.meowing.de",
  "https://cobalt-backend.canine.tools",
  "https://capi.3kh0.net",
  "https://co.wuk.sh/api/json",
  "https://api.cobalt.tools",
  "https://blossom.imput.net"
];

const KEY_RATES = "rates:final:data";
const KEY_HASH = "rates:final:hash";
const PAGE_SIZE = 10;

const CRYPTO_PERSIAN_NAMES: Record<string, string> = {
  "BTC": "بیت‌کوین", "ETH": "اتریوم", "USDT": "تتر", "BNB": "بایننس",
  "SOL": "سولانا", "XRP": "ریپل", "DOGE": "دوج", "ADA": "کاردانو",
  "TRX": "ترون", "AVAX": "آوالانچ", "LINK": "لینک", "DOT": "پولکادات",
  "MATIC": "ماتیک", "LTC": "لایت‌کوین", "BCH": "بیت‌کوین‌کش", "UNI": "یونی",
  "SHIB": "شیبا", "TON": "تون", "NOT": "نات", "PEPE": "پپه",
  "NEAR": "نیر", "ATOM": "اتم", "ICP": "اینترنت‌کامپیوتر", "FIL": "فایل‌کوین",
  "HBAR": "هدرا", "APT": "آپتوس", "ARB": "آربیتروم", "RNDR": "رندر",
  "XLM": "استلار", "XMR": "مونرو", "OKB": "اوکی‌بی", "ETC": "اتریوم‌کلاسیک"
};

const META: Record<string, { emoji: string; fa: string }> = {
  usd: { emoji: "🇺🇸", fa: "دلار آمریکا" },
  eur: { emoji: "🇪🇺", fa: "یورو اروپا" },
  gbp: { emoji: "🇬🇧", fa: "پوند انگلیس" },
  chf: { emoji: "🇨🇭", fa: "فرانک سوئیس" },
  cad: { emoji: "🇨🇦", fa: "دلار کانادا" },
  aud: { emoji: "🇦🇺", fa: "دلار استرالیا" },
  sek: { emoji: "🇸🇪", fa: "کرون سوئد" },
  nok: { emoji: "🇳🇴", fa: "کرون نروژ" },
  rub: { emoji: "🇷🇺", fa: "روبل روسیه" },
  thb: { emoji: "🇹🇭", fa: "بات تایلند" },
  sgd: { emoji: "🇸🇬", fa: "دلار سنگاپور" },
  hkd: { emoji: "🇭🇰", fa: "دلار هنگ‌کنگ" },
  azn: { emoji: "🇦🇿", fa: "منات آذربایجان" },
  amd: { emoji: "🇦🇲", fa: "درام ارمنستان" },
  dkk: { emoji: "🇩🇰", fa: "کرون دانمارک" },
  aed: { emoji: "🇦🇪", fa: "درهم امارات" },
  jpy: { emoji: "🇯🇵", fa: "ین ژاپن" },
  try: { emoji: "🇹🇷", fa: "لیر ترکیه" },
  cny: { emoji: "🇨🇳", fa: "یوان چین" },
  sar: { emoji: "🇸🇦", fa: "ریال عربستان" },
  inr: { emoji: "🇮🇳", fa: "روپیه هند" },
  myr: { emoji: "🇲🇾", fa: "رینگیت مالزی" },
  afn: { emoji: "🇦🇫", fa: "افغانی افغانستان" },
  kwd: { emoji: "🇰🇼", fa: "دینار کویت" },
  iqd: { emoji: "🇮🇶", fa: "دینار عراق" },
  bhd: { emoji: "🇧🇭", fa: "دینار بحرین" },
  omr: { emoji: "🇴🇲", fa: "ریال عمان" },
  qar: { emoji: "🇶🇦", fa: "ریال قطر" },
  gold_gram_18k: { emoji: "🥇", fa: "گرم طلا ۱۸" },
  gold_mithqal: { emoji: "⚖️", fa: "مثقال طلا" },
  coin_emami: { emoji: "🌕", fa: "سکه امامی" },
  coin_bahar: { emoji: "🌕", fa: "سکه بهار آزادی" },
  coin_half: { emoji: "🌗", fa: "نیم سکه" },
  coin_quarter: { emoji: "🌘", fa: "ربع سکه" },
  coin_gram: { emoji: "🌑", fa: "سکه گرمی" }
};

type Rate = { 
  price: number; 
  unit: number; 
  kind: "fiat" | "gold" | "crypto"; 
  title: string; 
  emoji: string; 
  fa: string;
  usdPrice?: number;
  change?: number;
};

type StoredData = { 
  ts: number; 
  rates: Record<string, Rate> 
};

function normalizeDigits(s: string) {
  const map: Record<string, string> = {
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"
  };
  return s.split("").map(c => map[c] ?? c).join("");
}

function norm(s: string) {
  return normalizeDigits(s).replace(/\u200c/g, " ").replace(/[ي]/g, "ی").replace(/[ك]/g, "ک").toLowerCase().trim();
}

function formatToman(n: number) {
  if (n < 1000) return Math.round(n).toString();
  return Math.round(n).toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

function formatUSD(n: number) {
  if (n < 1) return n.toFixed(4);
  if (n > 1000) return Math.round(n).toLocaleString();
  return n.toLocaleString("en-US", { maximumFractionDigits: 2 });
}

async function sha256(s: string) {
  const hash = await crypto.subtle.digest("SHA-256", new TextEncoder().encode(s));
  return Array.from(new Uint8Array(hash)).map(b => b.toString(16).padStart(2, "0")).join("");
}

function parsePersianNumber(tokens: string[]): number | null {
  const map: Record<string, number> = {
    "یک":1,"یه":1,"دو":2,"سه":3,"چهار":4,"پنج":5,"شش":6,"شیش":6,"هفت":7,"هشت":8,"نه":9,
    "ده":10,"یازده":11,"دوازده":12,"سیزده":13,"چهارده":14,"پانزده":15,"شانزده":16,"هفده":17,"هجده":18,"نوزده":19,
    "بیست":20,"سی":30,"چهل":40,"پنجاه":50,"شصت":60,"هفتاد":70,"هشتاد":80,"نود":90,
    "صد":100,"یکصد":100,"دویست":200,"سیصد":300,"چهارصد":400,"پانصد":500,"شیشصد":600,"ششصد":600,"هفتصد":700,"هشتصد":800,"نهصد":900
  };
  let total = 0, current = 0;
  const t = tokens.filter(x => x && x !== "و");
  if (t.length === 0) return null;
  for (const w of t) {
    if (map[w]) current += map[w];
    else if (w === "هزار") { total += (current || 1) * 1000; current = 0; }
    else if (w === "میلیون") { total += (current || 1) * 1000000; current = 0; }
  }
  return (total + current) > 0 ? (total + current) : null;
}

function extractAmount(text: string) {
  const clean = text.replace(/[.,!?()[\]]/g, " ").trim();
  const numMatch = clean.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }
  const tokens = clean.split(/\s+/);
  const win = tokens.slice(-10);
  for (let i = 0; i < win.length; i++) {
    for (let j = win.length; j > i; j--) {
      const n = parsePersianNumber(win.slice(i, j));
      if (n) return n;
    }
  }
  return 1;
}

function findCode(text: string, rates: Record<string, Rate>) {
  const clean = text.replace(/[.,!?]/g, "").replace(/\s+/g, "");
  const tokens = text.split(/\s+/);
  
  for (const t of tokens) {
    if (t.length >= 3 && rates[t]) return t;
  }
  
  for (const [code, r] of Object.entries(rates)) {
    const fa = r.fa.replace(/\s+/g, "");
    if (clean.includes(fa) || clean.includes(code)) return code;
    if (r.title.toLowerCase().replace(/\s+/g, "") === clean) return code;
  }
  
  if (clean.includes("طلا")) return "gold_gram_18k";
  if (clean.includes("سکه")) return "coin_emami";
  if (clean.includes("دلار")) return "usd";
  if (clean.includes("یورو")) return "eur";
  return null;
}

function parseCSV(text: string) {
  const lines = text.split("\n");
  const res = [];
  for (let i = 1; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
    const parts = line.split(/,(?=(?:(?:[^"]*"){2})*[^"]*$)/);
    if (parts.length < 6) continue;
    const symbol = parts[2].replace(/"/g, "").trim().toLowerCase();
    const name = parts[1].replace(/"/g, "").trim();
    const price = parseFloat(parts[5]);
    const change = parseFloat(parts[9]);
    if (symbol && !isNaN(price)) res.push({ symbol, name, price, change });
  }
  return res;
}

async function fetchRates(env: Env): Promise<{ data: StoredData; hash: string }> {
  const [jRes, cRes] = await Promise.all([
    fetch(PRICES_URL),
    fetch(CRYPTO_URL)
  ]);
  
  const rates: Record<string, Rate> = {};
  
  if (jRes.ok) {
    const data = await jRes.json<any>();
    for (const item of (data.items || [])) {
      const type = (item.type || "").toLowerCase();
      const rawName = (item.name || "").trim();
      const priceVal = Number(String(item.price).replace(/,/g, ""));
      if (!rawName || !priceVal) continue;

      if (type === "currency") {
        const m = rawName.match(/^([A-Z]{3})\s*(\d+)?(.*)$/);
        if (m) {
          const code = m[1].toLowerCase();
          const unit = m[2] ? parseInt(m[2]) : 1;
          const meta = META[code] ?? { emoji: "🏳️", fa: code.toUpperCase() };
          rates[code] = { price: priceVal, unit: unit, kind: "fiat", title: rawName, emoji: meta.emoji, fa: meta.fa };
        }
      } else if (type === "gold") {
        let key = "gold_gram_18k";
        const n = rawName.toLowerCase();
        if (n.includes("mithqal")) key = "gold_mithqal";
        else if (n.includes("coin")) key = "coin_emami";
        const meta = META[key] ?? { emoji: "💰", fa: "طلا" };
        rates[key] = { price: priceVal, unit: 1, kind: "gold", title: rawName, emoji: meta.emoji, fa: meta.fa };
      }
    }
  }

  const usdRate = (rates["usd"]?.price || 60000) / (rates["usd"]?.unit || 1);

  if (cRes.ok) {
    const rows = parseCSV(await cRes.text());
    for (const row of rows) {
      if (rates[row.symbol] && rates[row.symbol].kind === "fiat") continue;
      rates[row.symbol] = {
        price: row.price * usdRate,
        unit: 1,
        kind: "crypto",
        title: row.name,
        emoji: "💎",
        fa: CRYPTO_PERSIAN_NAMES[row.symbol.toUpperCase()] || row.symbol.toUpperCase(),
        usdPrice: row.price,
        change: row.change
      };
    }
  }

  const data = { ts: Date.now(), rates };
  const hash = await sha256(JSON.stringify(rates));
  return { data, hash };
}

async function updateRates(env: Env) {
  const { data, hash } = await fetchRates(env);
  const oldHash = await env.BOT_KV.get(KEY_HASH);
  if (hash !== oldHash) {
    await env.BOT_KV.put(KEY_HASH, hash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(data));
  }
  return data;
}

function makeKeyboard(rates: Record<string, Rate>, mode: 'fiat'|'crypto', page: number) {
  const all = Object.keys(rates).filter(k => {
    const r = rates[k];
    if (mode === 'fiat') return r.kind === 'fiat' || r.kind === 'gold';
    return r.kind === 'crypto';
  });

  const priority = ["usd", "eur", "aed", "gbp", "try", "iqd", "gold_gram_18k", "coin_emami", "btc", "eth", "usdt", "ton", "not", "trx", "doge"];
  all.sort((a, b) => {
    const pa = priority.indexOf(a), pb = priority.indexOf(b);
    if (pa !== -1 && pb !== -1) return pa - pb;
    if (pa !== -1) return -1;
    if (pb !== -1) return 1;
    return 0;
  });

  const total = Math.ceil(all.length / PAGE_SIZE);
  const slice = all.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);
  const buttons = [];

  for (const k of slice) {
    const r = rates[k];
    const per1 = r.price / r.unit;
    let txt = "";
    if (mode === 'fiat') txt = `${r.emoji} ${r.fa}: ${formatToman(per1)} ت`;
    else txt = `${r.emoji} ${r.fa}: ${formatUSD(r.usdPrice!)}$ | ${formatToman(per1)} ت`;
    buttons.push([{ text: txt, callback_data: "noop" }]);
  }

  const nav = [];
  if (page > 0) nav.push({ text: "▶️ قبلی", callback_data: `list:${mode}:${page-1}` });
  nav.push({ text: "🏠 خانه", callback_data: "type_select" });
  if (page < total - 1) nav.push({ text: "بعدی ◀️", callback_data: `list:${mode}:${page+1}` });
  
  buttons.push(nav);
  buttons.push([{text: "🔙 منوی اصلی", callback_data: "start"}]);

  return {
    text: mode === 'fiat' ? `💵 <b>نرخ ارز و طلا</b> (صفحه ${page+1}/${total})` : `🚀 <b>نرخ ارز دیجیتال</b> (صفحه ${page+1}/${total})`,
    markup: { inline_keyboard: buttons }
  };
}

const MENUS = {
  start: {
    inline_keyboard: [
      [{ text: "➕ افزودن به گروه", url: `https://t.me/${BOT_USERNAME}?startgroup=start` }, { text: "📘 راهنما", callback_data: "help" }],
      [{ text: "📊 مشاهده قیمت‌ها", callback_data: "type_select" }]
    ]
  },
  types: {
    inline_keyboard: [
      [{ text: "💵 ارز و طلا", callback_data: "list:fiat:0" }, { text: "🚀 ارز دیجیتال", callback_data: "list:crypto:0" }],
      [{ text: "🔙 بازگشت", callback_data: "start" }]
    ]
  },
  back: { inline_keyboard: [[{ text: "🔙 بازگشت", callback_data: "start" }]] }
};

export default {
  async scheduled(_e: any, env: Env, _c: any) { await updateRates(env).catch(()=>{}); },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);
    if (req.method !== "POST") return new Response("OK");
    const update = await req.json<any>().catch(() => null);
    if (!update || update.edited_message) return new Response("OK");

    if (update.callback_query) {
      const cb = update.callback_query;
      const data = cb.data;
      const cid = cb.message.chat.id;
      const mid = cb.message.message_id;

      try {
        if (data === "noop") {
           await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/answerCallbackQuery`, {
             method: "POST", headers:{"content-type":"application/json"},
             body: JSON.stringify({ callback_query_id: cb.id, text: "بروزرسانی شد ✅" })
           });
           return new Response("OK");
        }

        let text = "", markup = null;

        if (data === "start") { text = "👋 به ربات خوش آمدید."; markup = MENUS.start; }
        else if (data === "type_select") { text = "👇 بازار مورد نظر را انتخاب کنید:"; markup = MENUS.types; }
        else if (data === "help") { text = "🤖 <b>راهنما:</b>\n\nبرای دیدن قیمت‌ها از دکمه‌ها استفاده کنید.\nدر چت نام ارز یا مقدار آن را بفرستید (مثلا: دلار، ۱۰۰ بیت کوین).\nلینک اینستاگرام برای دانلود بفرستید."; markup = MENUS.back; }
        else if (data.startsWith("list:")) {
          const parts = data.split(":");
          const stored = await env.BOT_KV.get(KEY_RATES).then(x => x ? JSON.parse(x) : null);
          if (stored) {
            const ui = makeKeyboard(stored.rates, parts[1] as any, parseInt(parts[2]));
            text = ui.text;
            markup = ui.markup;
          }
        }

        if (text) {
           await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/editMessageText`, {
             method: "POST", headers:{"content-type":"application/json"},
             body: JSON.stringify({ chat_id: cid, message_id: mid, text, parse_mode: "HTML", reply_markup: markup })
           });
        }
      } catch (e) {}
      
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/answerCallbackQuery`, {
        method: "POST", headers:{"content-type":"application/json"},
        body: JSON.stringify({ callback_query_id: cb.id })
      });
      return new Response("OK");
    }

    const msg = update.message;
    if (!msg || !msg.text) return new Response("OK");
    const now = Math.floor(Date.now()/1000);
    if (now - msg.date > 40) return new Response("OK");

    const uid = msg.from.id;
    if (await env.BOT_KV.get(`cd:${uid}`)) return new Response("OK");
    ctx.waitUntil(env.BOT_KV.put(`cd:${uid}`, "1", { expirationTtl: 3 }));

    const text = msg.text;
    const cid = msg.chat.id;
    const replyTo = msg.message_id;

    if (text.includes("instagram.com")) {
      ctx.waitUntil((async () => {
        await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendChatAction`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({chat_id: cid, action: "upload_video"})});
        const url = text.match(/(https?:\/\/(?:www\.)?instagram\.com\/[^ \n]+)/)?.[1];
        if (url) {
          for (const base of COBALT_INSTANCES) {
            try {
              const r = await fetch(base + "/api/json", {method:"POST", headers:{"content-type":"application/json","Accept":"application/json"}, body:JSON.stringify({url, vCodec:"h264"})});
              const d = await r.json<any>();
              if (d.status === "stream" || d.status === "redirect") {
                await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendVideo`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({chat_id: cid, video: d.url, caption: "✅ دانلود شد", reply_to_message_id: replyTo})});
                return;
              }
            } catch(e){}
          }
          await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {method:"POST", headers:{"content-type":"application/json"}, body:JSON.stringify({chat_id: cid, text: "❌ خطا در دانلود", reply_to_message_id: replyTo})});
        }
      })());
      return new Response("OK");
    }

    const normText = norm(text);
    if (normText === "/start") {
      await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
        method: "POST", headers:{"content-type":"application/json"},
        body: JSON.stringify({ chat_id: cid, text: "👋 سلام! چه کاری انجام دهم؟", reply_markup: MENUS.start, reply_to_message_id: replyTo })
      });
      return new Response("OK");
    }

    const storedStr = await env.BOT_KV.get(KEY_RATES);
    if (storedStr) {
      const stored = JSON.parse(storedStr);
      const code = findCode(normText, stored.rates);
      if (code) {
        const amount = extractAmount(normText);
        const r = stored.rates[code];
        const per1 = r.price / r.unit;
        const val = per1 * amount;
        let res = "";
        if (r.kind === "crypto") res = `💎 <b>${amount} ${r.fa}</b> (${code.toUpperCase()})\n💵 ${formatUSD(r.usdPrice!*amount)}$\n🇮🇷 ${formatToman(val)} تومان\n📊 تغییر: ${r.change}%`;
        else res = `${r.emoji} <b>${amount} ${r.fa}</b> = <code>${formatToman(val)}</code> تومان`;
        
        await fetch(`https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`, {
          method: "POST", headers:{"content-type":"application/json"},
          body: JSON.stringify({ chat_id: cid, text: res, parse_mode: "HTML", reply_to_message_id: replyTo })
        });
      }
    }

    return new Response("OK");
  }
};
