export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const PRICES_URL = "https://raw.githubusercontent.com/joestar9/jojo/refs/heads/main/prices.json";

const KEY_RATES = "rates:latest";
const KEY_ETAG = "rates:etag";
const KEY_HASH = "rates:hash";

type Rate = { price: number; unit: number; kind: "currency" | "gold"; title: string; emoji: string; fa: string };
type Stored = { fetchedAtMs: number; source: string; timestamp?: string; rates: Record<string, Rate> };

const META: Record<string, { emoji: string; fa: string }> = {
  usd: { emoji: "🇺🇸", fa: "دلار" },
  eur: { emoji: "🇪🇺", fa: "یورو" },
  gbp: { emoji: "🇬🇧", fa: "پوند" },
  chf: { emoji: "🇨🇭", fa: "فرانک" },
  cad: { emoji: "🇨🇦", fa: "دلار کانادا" },
  aud: { emoji: "🇦🇺", fa: "دلار استرالیا" },
  sek: { emoji: "🇸🇪", fa: "کرون سوئد" },
  nok: { emoji: "🇳🇴", fa: "کرون نروژ" },
  rub: { emoji: "🇷🇺", fa: "روبل" },
  thb: { emoji: "🇹🇭", fa: "بات" },
  sgd: { emoji: "🇸🇬", fa: "دلار سنگاپور" },
  hkd: { emoji: "🇭🇰", fa: "دلار هنگ‌کنگ" },
  azn: { emoji: "🇦🇿", fa: "منات" },
  amd: { emoji: "🇦🇲", fa: "درام" },
  dkk: { emoji: "🇩🇰", fa: "کرون دانمارک" },
  aed: { emoji: "🇦🇪", fa: "درهم" },
  jpy: { emoji: "🇯🇵", fa: "ین" },
  try: { emoji: "🇹🇷", fa: "لیر" },
  cny: { emoji: "🇨🇳", fa: "یوان" },
  sar: { emoji: "🇸🇦", fa: "ریال سعودی" },
  inr: { emoji: "🇮🇳", fa: "روپیه هند" },
  myr: { emoji: "🇲🇾", fa: "رینگیت" },
  afn: { emoji: "🇦🇫", fa: "افغانی" },
  kwd: { emoji: "🇰🇼", fa: "دینار کویت" },
  iqd: { emoji: "🇮🇶", fa: "دینار عراق" },
  bhd: { emoji: "🇧🇭", fa: "دینار بحرین" },
  omr: { emoji: "🇴🇲", fa: "ریال عمان" },
  qar: { emoji: "🇶🇦", fa: "ریال قطر" },

  gold_gram_18k: { emoji: "💰", fa: "گرم طلا ۱۸" },
  gold_mithqal: { emoji: "💰", fa: "مثقال طلا" }
};

const ALIASES: Array<{ keys: string[]; code: string }> = [
  { keys: ["دلار", "usd"], code: "usd" },
  { keys: ["یورو", "eur"], code: "eur" },
  { keys: ["پوند", "gbp"], code: "gbp" },
  { keys: ["فرانک", "chf"], code: "chf" },
  { keys: ["درهم", "aed"], code: "aed" },
  { keys: ["لیر", "try"], code: "try" },
  { keys: ["ین", "jpy"], code: "jpy" },
  { keys: ["درام", "amd"], code: "amd" },
  { keys: ["دینار", "iqd"], code: "iqd" },

  { keys: ["طلا", "gold", "گرم طلا", "طلای ۱۸", "طلای18"], code: "gold_gram_18k" },
  { keys: ["مثقال", "mithqal"], code: "gold_mithqal" }
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
  const x = Math.round(n);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
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

function normalizeRatesJson(j: any): Stored {
  const fetchedAtMs = Date.now();
  const timestamp = typeof j?.timestamp === "string" ? j.timestamp : undefined;

  const rates: Record<string, Rate> = {};
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
      continue;
    }

    if (type === "gold") {
      const nn = name.toLowerCase();
      const key =
        nn.includes("mithqal") ? "gold_mithqal" :
        nn.includes("gram") && nn.includes("18") ? "gold_gram_18k" :
        nn.includes("gram") ? "gold_gram_18k" :
        nn.includes("mith") ? "gold_mithqal" :
        "gold_gram_18k";

      const meta = META[key] ?? { emoji: "💰", fa: "طلا" };
      rates[key] = { price, unit: 1, kind: "gold", title: name, emoji: meta.emoji, fa: meta.fa };
      continue;
    }
  }

  return { fetchedAtMs, source: "github", timestamp, rates };
}

async function fetchPricesFromGithub(env: Env): Promise<{ stored: Stored; rawHash: string }> {
  const etag = await env.BOT_KV.get(KEY_ETAG);
  const headers: Record<string, string> = { "accept": "application/json" };
  if (etag) headers["if-none-match"] = etag;

  const res = await fetch(PRICES_URL, { method: "GET", headers });

  if (res.status === 304) {
    const txt = await env.BOT_KV.get(KEY_RATES);
    if (txt) {
      const stored = JSON.parse(txt) as Stored;
      const rawHash = await sha256Hex(JSON.stringify(stored.rates));
      return { stored, rawHash };
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub HTTP ${res.status} ${t.slice(0, 160)}`);
  }

  const newEtag = res.headers.get("etag");
  if (newEtag) await env.BOT_KV.put(KEY_ETAG, newEtag);

  const json = await res.json();
  const stored = normalizeRatesJson(json);
  const rawHash = await sha256Hex(JSON.stringify(stored.rates));
  return { stored, rawHash };
}

async function refreshRates(env: Env) {
  const { stored, rawHash } = await fetchPricesFromGithub(env);
  const prevHash = await env.BOT_KV.get(KEY_HASH);
  const changed = prevHash !== rawHash;

  if (changed) {
    await env.BOT_KV.put(KEY_HASH, rawHash);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  } else {
    const prev = await env.BOT_KV.get(KEY_RATES);
    if (!prev) await env.BOT_KV.put(KEY_RATES, JSON.stringify(stored));
  }

  return { ok: true, changed, count: Object.keys(stored.rates).length, timestamp: stored.timestamp ?? null };
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

function findCode(textNorm: string) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  const keys = ALIASES.flatMap(a => a.keys.map(k => ({ k: norm(k).replace(/\s+/g, ""), code: a.code })))
    .sort((x, y) => y.k.length - x.k.length);

  for (const it of keys) {
    if (compact.includes(it.k)) return it.code;
  }

  const m = cleaned.match(/\b([a-z]{3})\b/i);
  if (m) return m[1].toLowerCase();

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

async function tgSend(env: Env, chatId: number, text: string, replyTo?: number) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`;
  const body: any = { chat_id: chatId, text, parse_mode: "HTML", disable_web_page_preview: true };
  if (replyTo) { body.reply_to_message_id = replyTo; body.allow_sending_without_reply = true; }
  await fetch(url, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body) }).catch(() => {});
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
  const codes = Object.keys(stored.rates).sort();
  const lines: string[] = [];

  for (const c of codes.slice(0, 220)) {
    const r = stored.rates[c];
    const per1 = r.price / (r.unit || 1);

    if (r.kind === "currency") lines.push(`1 ${r.fa} = ${formatToman(per1)} تومان`);
    else lines.push(`${r.emoji} ${r.fa} = ${formatToman(per1)} تومان`);
  }

  return lines.join("\n");
}

function replyCurrency(r: Rate, amount: number) {
  const per1 = r.price / (r.unit || 1);
  const total = per1 * amount;
  const aStr = Number.isInteger(amount) ? String(amount) : String(amount);

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

function helpText() {
  return [
    "نمونه‌ها:",
    "دلار",
    "100 دلار",
    "بیست دلار",
    "طلا",
    "100 گرم طلا",
    "مثقال طلا",
    "",
    "/all",
    "/refresh <key>"
  ].join("\n");
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
    const msg = update?.message ?? update?.edited_message;
    const chatId: number | undefined = msg?.chat?.id;
    const text: string | undefined = msg?.text;
    const messageId: number | undefined = msg?.message_id;

    if (!chatId || !text) return new Response("ok");

    const textNorm = norm(text);
    const cmd = normalizeCommand(textNorm);

    const isGroup = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
    const replyTo = isGroup ? messageId : undefined;

    const run = async () => {
      if (cmd === "/start" || cmd === "/help") { await tgSend(env, chatId, helpText(), replyTo); return; }

      if (cmd === "/refresh") {
        const parts = stripPunct(textNorm).split(/\s+/).filter(Boolean);
        const key = parts[1] || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) { await tgSend(env, chatId, "⛔️", replyTo); return; }
        const r = await refreshRates(env);
        await tgSend(env, chatId, r.ok ? "✅" : "⛔️", replyTo);
        return;
      }

      const stored = await getStoredOrRefresh(env, ctx);

      if (cmd === "/all") {
        const out = buildAll(stored);
        for (const c of chunkText(out)) await tgSend(env, chatId, c, replyTo);
        return;
      }

      const code = findCode(textNorm);
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
