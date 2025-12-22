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

type Rate = { sell: number; unit: number; title?: string };
type Stored = { fetchedAtMs: number; source: string; timestamp?: string; rates: Record<string, Rate> };

const ALIASES: Array<{ keys: string[]; code: string; title: string }> = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "usd"], code: "usd", title: "دلار آمریکا 🇺🇸" },
  { keys: ["یورو", "eur"], code: "eur", title: "یورو 🇪🇺" },
  { keys: ["پوند", "gbp"], code: "gbp", title: "پوند انگلیس 🇬🇧" },
  { keys: ["فرانک", "chf"], code: "chf", title: "فرانک سوئیس 🇨🇭" },
  { keys: ["درهم", "aed"], code: "aed", title: "درهم امارات 🇦🇪" },
  { keys: ["لیر", "try"], code: "try", title: "لیر ترکیه 🇹🇷" },
  { keys: ["ین", "jpy"], code: "jpy", title: "ین ژاپن 🇯🇵" },
  { keys: ["درام", "amd"], code: "amd", title: "درام ارمنستان 🇦🇲" },
  { keys: ["دینار", "iqd"], code: "iqd", title: "دینار عراق 🇮🇶" }
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

function unitFromName(name: any): number {
  const s = String(name ?? "").trim();
  const m = s.match(/^(\d{1,4})/);
  const u = m ? Number(m[1]) : 1;
  return Number.isFinite(u) && u > 1 ? u : 1;
}

function normalizeRatesJson(j: any): Stored {
  const fetchedAtMs = Date.now();
  const timestamp = typeof j?.timestamp === "string" ? j.timestamp : undefined;

  const rates: Record<string, Rate> = {};

  const currencies = Array.isArray(j?.currencies) ? j.currencies : [];
  for (const it of currencies) {
    const codeRaw = String(it?.code ?? "").trim();
    if (!codeRaw) continue;
    const code = codeRaw.toLowerCase();

    const sell = toNum(it?.sell);
    if (sell == null || sell <= 0) continue;

    const title = typeof it?.name === "string" ? it.name : undefined;
    const unit = unitFromName(title);

    rates[code] = { sell, unit, title };
  }

  const goldCoins = Array.isArray(j?.gold_coins) ? j.gold_coins : [];
  for (const it of goldCoins) {
    const codeRaw = String(it?.code ?? it?.symbol ?? it?.name ?? "").trim();
    if (!codeRaw) continue;
    const code = codeRaw.toLowerCase().replace(/\s+/g, "_");

    const sell = toNum(it?.sell ?? it?.price);
    if (sell == null || sell <= 0) continue;

    const title = typeof it?.name === "string" ? it.name : undefined;
    const unit = unitFromName(title);

    rates[code] = { sell, unit, title };
  }

  return { fetchedAtMs, source: "github", timestamp, rates };
}

async function fetchPricesFromGithub(env: Env): Promise<{ stored: Stored; etag?: string; rawHash: string; used304: boolean }> {
  const etag = await env.BOT_KV.get(KEY_ETAG);

  const headers: Record<string, string> = { "accept": "application/json" };
  if (etag) headers["if-none-match"] = etag;

  const res = await fetch(PRICES_URL, { method: "GET", headers });

  if (res.status === 304) {
    const txt = await env.BOT_KV.get(KEY_RATES);
    if (txt) {
      const stored = JSON.parse(txt) as Stored;
      const rawHash = await sha256Hex(JSON.stringify(stored.rates));
      return { stored, etag: etag ?? undefined, rawHash, used304: true };
    }
  }

  if (!res.ok) {
    const t = await res.text().catch(() => "");
    throw new Error(`GitHub HTTP ${res.status} ${t.slice(0, 200)}`);
  }

  const newEtag = res.headers.get("etag") || undefined;
  const json = await res.json();
  const stored = normalizeRatesJson(json);
  const rawHash = await sha256Hex(JSON.stringify(stored.rates));

  if (newEtag) await env.BOT_KV.put(KEY_ETAG, newEtag);
  return { stored, etag: newEtag, rawHash, used304: false };
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

  return { ok: true, changed, fetchedAtMs: stored.fetchedAtMs, timestamp: stored.timestamp ?? null, count: Object.keys(stored.rates).length };
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

function findCurrency(textNorm: string) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();
  const compact = cleaned.replace(/\s+/g, "");

  const keys = ALIASES.flatMap(a => a.keys.map(k => ({ k: norm(k).replace(/\s+/g, ""), a })))
    .sort((x, y) => y.k.length - x.k.length);

  for (const it of keys) {
    if (compact.includes(it.k)) return it.a;
  }

  const m = cleaned.match(/\b([a-z]{3})\b/i);
  if (m) return { keys: [m[1].toLowerCase()], code: m[1].toLowerCase(), title: m[1].toUpperCase() };

  return null;
}

function extractAmount(textNorm: string, currencyKeys: string[]) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();

  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const tokens = cleaned.split(" ").filter(Boolean);
  const keyNorms = currencyKeys.map(k => stripPunct(norm(k))).filter(Boolean);

  let idx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const tok = tokens[i].replace(/\s+/g, "");
    for (const kk of keyNorms) {
      const kkc = kk.replace(/\s+/g, "");
      if (tok.includes(kkc)) { idx = i; break; }
    }
    if (idx !== -1) break;
  }

  const left = idx === -1 ? tokens : tokens.slice(Math.max(0, idx - 7), idx);
  const win = left.slice(-7);

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

function prettySell(opts: { title: string; amount: number; sellPer1: number; total: number; fetchedAtMs: number; timestamp?: string; unit: number }) {
  const { title, amount, sellPer1, total, fetchedAtMs, timestamp, unit } = opts;

  const lines: string[] = [];
  lines.push(`✨ <b>${title}</b>`);
  lines.push("");
  lines.push(`🟢 قیمت فروش (۱ واحد): <b>${formatToman(sellPer1)}</b> تومان`);
  if (unit > 1) lines.push(`ℹ️ در فایل، قیمت برای <b>${unit}</b> واحد آمده (اصلاح شد).`);
  lines.push(`📌 مقدار: <b>${amount}</b>`);
  if (amount !== 1) lines.push(`🧮 جمع (فروش × مقدار): <b>${formatToman(total)}</b> تومان`);
  lines.push("");
  if (timestamp) lines.push(`🕒 زمان فایل: <code>${timestamp}</code>`);
  lines.push(`⏱ بروزرسانی KV: <code>${new Date(fetchedAtMs).toLocaleString("fa-IR")}</code>`);
  return lines.join("\n");
}

function helpText() {
  return [
    "🤖 <b>راهنما</b>",
    "",
    "مثال‌ها:",
    "• امروز دلار چنده؟",
    "• 2 دلار",
    "• بیست دلار",
    "• امروز 20 دلار فاکتور پرداخت کردم",
    "• USD",
    "",
    "دستورها:",
    "• /all",
    "• /refresh <key>"
  ].join("\n");
}

function buildAllSell(stored: Stored) {
  const codes = Object.keys(stored.rates).sort();
  const lines: string[] = [];
  lines.push(`📊 <b>لیست نرخ‌ها (فقط فروش)</b>`);
  if (stored.timestamp) lines.push(`🕒 زمان فایل: <code>${stored.timestamp}</code>`);
  lines.push(`⏱ بروزرسانی KV: <code>${new Date(stored.fetchedAtMs).toLocaleString("fa-IR")}</code>`);
  lines.push("");

  const max = 200;
  for (const c of codes.slice(0, max)) {
    const r = stored.rates[c];
    const unit = r.unit || 1;
    const per1 = r.sell / unit;
    const unitNote = unit > 1 ? ` (×${unit})` : "";
    lines.push(`• <b>${c.toUpperCase()}</b>${unitNote}  ${formatToman(per1)} تومان`);
  }

  if (codes.length > max) lines.push(`\n… و ${codes.length - max} مورد دیگر`);
  return lines.join("\n");
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
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) { await tgSend(env, chatId, "⛔️ کلید اشتباهه.", replyTo); return; }
        const r = await refreshRates(env);
        await tgSend(env, chatId, `✅ بروزرسانی شد.\n🧾 count: <b>${r.count}</b>\n🕒 فایل: <code>${r.timestamp ?? "-"}</code>`, replyTo);
        return;
      }

      const stored = await getStoredOrRefresh(env, ctx);

      if (cmd === "/all") {
        const out = buildAllSell(stored);
        for (const c of chunkText(out)) await tgSend(env, chatId, c, replyTo);
        return;
      }

      const cur = findCurrency(textNorm);
      if (!cur) return;

      const amount = extractAmount(textNorm, cur.keys);
      const code = cur.code.toLowerCase();

      const r = stored.rates[code];
      if (!r) { await tgSend(env, chatId, `🤷‍♂️ «${cur.title}» تو فایل پیدا نشد.\n(کدش باید مثل ${code.toUpperCase()} داخل currencies باشه)`, replyTo); return; }

      const unit = r.unit || 1;
      const sellPer1 = r.sell / unit;
      const total = sellPer1 * amount;
      const title = r.title ? `${r.title} (${code.toUpperCase()})` : cur.title;

      await tgSend(env, chatId, prettySell({ title, amount, sellPer1, total, fetchedAtMs: stored.fetchedAtMs, timestamp: stored.timestamp, unit }), replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  }
};
