export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;
  TG_SECRET: string;
  ADMIN_KEY: string;
}

const KEY_RATES = "rates:latest";
const KEY_HASH = "rates:hash";

const BONBAST_URLS = ["https://bonbast.com/json", "https://www.bonbast.com/json"];

const CURRENCY_ALIASES: Array<{ keys: string[]; code: string; title: string; unit?: number }> = [
  { keys: ["دلار", "دلارامریکا", "دلارآمریکا", "usd"], code: "usd", title: "دلار آمریکا 🇺🇸" },
  { keys: ["یورو", "eur"], code: "eur", title: "یورو 🇪🇺" },
  { keys: ["پوند", "پوندانگلیس", "پوندانگلیسی", "gbp"], code: "gbp", title: "پوند انگلیس 🇬🇧" },
  { keys: ["درهم", "درهمامارات", "aed"], code: "aed", title: "درهم امارات 🇦🇪" },
  { keys: ["لیر", "لیرترکیه", "try"], code: "try", title: "لیر ترکیه 🇹🇷" },
  { keys: ["ین", "ینژاپن", "jpy"], code: "jpy", title: "ین ژاپن 🇯🇵", unit: 10 },
  { keys: ["درام", "درامارمنستان", "amd"], code: "amd", title: "درام ارمنستان 🇦🇲", unit: 10 },
  { keys: ["دینارعراق", "iqd", "دینار عراق"], code: "iqd", title: "دینار عراق 🇮🇶", unit: 100 },
  { keys: ["روبل", "rub"], code: "rub", title: "روبل روسیه 🇷🇺" },
  { keys: ["یوان", "یوآن", "cny"], code: "cny", title: "یوان چین 🇨🇳" },
  { keys: ["سکهامامی", "سکه امامی", "امامی", "emami"], code: "emami", title: "سکه امامی 🪙" },
  { keys: ["طلای18", "طلای 18", "طلای۱۸", "۱۸", "gold18"], code: "gol", title: "طلای ۱۸ 🪙" }
];

function normalizeDigits(input: string) {
  const map: Record<string, string> = {
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"
  };
  return input.split("").map(ch => map[ch] ?? ch).join("");
}

function normalizeText(input: string) {
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

async function fetchBonbastJSON(): Promise<any> {
  let lastErr: any = null;
  for (const url of BONBAST_URLS) {
    try {
      const res = await fetch(url, {
        headers: {
          "accept": "application/json",
          "user-agent": "Mozilla/5.0",
          "referer": "https://bonbast.com/"
        }
      });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      return await res.json();
    } catch (e) {
      lastErr = e;
    }
  }
  throw lastErr ?? new Error("fetch failed");
}

async function refreshRates(env: Env) {
  const data = await fetchBonbastJSON();
  const payload = { fetchedAtMs: Date.now(), source: "bonbast", data };
  const canon = JSON.stringify(data);
  const h = await sha256Hex(canon);

  const prevHash = await env.BOT_KV.get(KEY_HASH);
  const changed = prevHash !== h;

  if (changed) {
    await env.BOT_KV.put(KEY_HASH, h);
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(payload));
  } else {
    const prev = await env.BOT_KV.get(KEY_RATES);
    if (!prev) {
      await env.BOT_KV.put(KEY_RATES, JSON.stringify(payload));
    }
  }

  return { ok: true, changed, fetchedAtMs: payload.fetchedAtMs };
}

function parsePersianWordNumberUpTo100(tokens: string[]): number | null {
  const ones: Record<string, number> = {
    "یک":1,"یه":1,"دو":2,"سه":3,"چهار":4,"پنج":5,"شش":6,"شیش":6,"هفت":7,"هشت":8,"نه":9
  };
  const teens: Record<string, number> = {
    "ده":10,"یازده":11,"دوازده":12,"سیزده":13,"چهارده":14,"پانزده":15,"شانزده":16,"هفده":17,"هجده":18,"نوزده":19
  };
  const tens: Record<string, number> = {
    "بیست":20,"سی":30,"چهل":40,"پنجاه":50,"شصت":60,"هفتاد":70,"هشتاد":80,"نود":90
  };

  const t = tokens.filter(x => x && x !== "و");
  if (t.length === 0) return null;

  if (t.join("") === "یکصد" || t.join(" ") === "یک صد") return 100;
  if (t.length === 1 && (t[0] === "صد")) return 100;

  if (t.length === 1) {
    if (teens[t[0]] != null) return teens[t[0]];
    if (tens[t[0]] != null) return tens[t[0]];
    if (ones[t[0]] != null) return ones[t[0]];
  }

  if (t.length === 2) {
    if (tens[t[0]] != null && ones[t[1]] != null) return tens[t[0]] + ones[t[1]];
    if (teens[t[0]] != null && ones[t[1]] == null) return teens[t[0]];
  }

  if (t.length === 3) {
    const a = t[0], b = t[1], c = t[2];
    if (tens[a] != null && b === "و" && ones[c] != null) return tens[a] + ones[c];
    if (tens[a] != null && ones[b] != null && c === "") return tens[a] + ones[b];
  }

  if (t.length === 4) {
    const a = t[0], b = t[1], c = t[2], d = t[3];
    if (tens[a] != null && b === "و" && ones[c] != null && d === "") return tens[a] + ones[c];
  }

  if (t.length <= 4) {
    let total = 0;
    for (const w of t) {
      if (teens[w] != null) return teens[w];
      if (tens[w] != null) total += tens[w];
      else if (ones[w] != null) total += ones[w];
      else if (w === "صد") total += 100;
      else return null;
    }
    if (total >= 1 && total <= 100) return total;
  }

  return null;
}

function findCurrency(textNorm: string) {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();

  const allKeys = CURRENCY_ALIASES
    .flatMap(c => c.keys.map(k => ({ k: normalizeText(k).replace(/\s+/g, ""), c })))
    .sort((a, b) => b.k.length - a.k.length);

  const compact = cleaned.replace(/\s+/g, "");
  for (const item of allKeys) {
    if (compact.includes(item.k)) return item.c;
  }

  const m = cleaned.match(/\b([a-z]{3})\b/i);
  if (m) return { keys: [m[1].toLowerCase()], code: m[1].toLowerCase(), title: m[1].toUpperCase() };

  return null;
}

function extractAmount(textNorm: string, currencyKeys: string[]): number {
  const cleaned = stripPunct(textNorm).replace(/\s+/g, " ").trim();

  const numMatch = cleaned.match(/(\d+(?:\.\d+)?)/);
  if (numMatch) {
    const n = Number(numMatch[1]);
    if (Number.isFinite(n) && n > 0) return n;
  }

  const tokens = cleaned.split(" ").filter(Boolean);

  const keyTokens = currencyKeys
    .map(k => normalizeText(k))
    .map(k => stripPunct(k).replace(/\s+/g, " ").trim())
    .filter(Boolean);

  let idx = -1;
  for (let i = 0; i < tokens.length; i++) {
    const tokenCompact = tokens[i].replace(/\s+/g, "");
    for (const kk of keyTokens) {
      const kkCompact = kk.replace(/\s+/g, "");
      if (tokenCompact.includes(kkCompact)) {
        idx = i;
        break;
      }
    }
    if (idx !== -1) break;
  }

  const lookback = idx === -1 ? tokens.slice(0, 5) : tokens.slice(Math.max(0, idx - 4), idx);
  const n = parsePersianWordNumberUpTo100(lookback);
  if (n && n > 0) return n;

  return 1;
}

function readSellBuyFromData(data: any, code: string) {
  if (!data || typeof data !== "object") return null;

  const c = code.toLowerCase();

  if (c === "emami") {
    const sell = Number(String(data["emami1"] ?? "").replace(/,/g, ""));
    const buy = Number(String(data["emami12"] ?? "").replace(/,/g, ""));
    if (Number.isFinite(sell) && sell > 0 && Number.isFinite(buy) && buy > 0) return { sell, buy };
    return null;
  }

  if (c === "gol") {
    const v = Number(String(data["gol18"] ?? "").replace(/,/g, ""));
    if (Number.isFinite(v) && v > 0) return { sell: v, buy: v };
    return null;
  }

  const sell = Number(String(data[`${c}1`] ?? "").replace(/,/g, ""));
  const buy = Number(String(data[`${c}2`] ?? "").replace(/,/g, ""));
  if (!Number.isFinite(sell) || !Number.isFinite(buy) || sell <= 0 || buy <= 0) return null;
  return { sell, buy };
}

function prettyResponse(opts: {
  title: string;
  amount: number;
  unitNote?: string;
  sell: number;
  buy: number;
  fetchedAtMs: number;
}) {
  const { title, amount, unitNote, sell, buy, fetchedAtMs } = opts;
  const sellTotal = sell * amount;
  const buyTotal = buy * amount;

  const lines: string[] = [];
  lines.push(`✨ <b>${title}</b>`);
  lines.push("");
  lines.push(`📌 مقدار: <b>${amount}</b>${unitNote ? ` <i>(${unitNote})</i>` : ""}`);
  lines.push(`🟢 فروش: <b>${formatToman(sell)}</b> تومان`);
  lines.push(`🔵 خرید: <b>${formatToman(buy)}</b> تومان`);
  if (amount !== 1) {
    lines.push("");
    lines.push(`🧮 جمع (فروش × مقدار): <b>${formatToman(sellTotal)}</b> تومان`);
    lines.push(`🧾 جمع (خرید × مقدار): <b>${formatToman(buyTotal)}</b> تومان`);
  }
  lines.push("");
  lines.push(`⏱ بروزرسانی: <code>${new Date(fetchedAtMs).toLocaleString("fa-IR")}</code>`);
  return lines.join("\n");
}

function helpText() {
  return [
    "🤖 <b>راهنما</b>",
    "",
    "نمونه‌ها:",
    "• امروز دلار چنده؟",
    "• 2 دلار",
    "• بیست دلار",
    "• امروز 20 دلار فاکتور پرداخت کردم",
    "• eur",
    "",
    "دستورها:",
    "• /all",
    "• /refresh <key>"
  ].join("\n");
}

function buildAllText(stored: { fetchedAtMs: number; data: any }) {
  const data = stored.data || {};
  const keys = Object.keys(data);
  const bases = new Set<string>();
  for (const k of keys) {
    const m = k.match(/^([a-z]{3})([12])$/i);
    if (m) {
      const base = m[1].toLowerCase();
      if (data[`${base}1`] != null && data[`${base}2`] != null) bases.add(base);
    }
  }
  const list = Array.from(bases).sort();

  const lines: string[] = [];
  lines.push(`📊 <b>لیست ارزها (Sell/Buy)</b>`);
  lines.push(`⏱ <code>${new Date(stored.fetchedAtMs).toLocaleString("fa-IR")}</code>`);
  lines.push("");

  const max = 120;
  for (const c of list.slice(0, max)) {
    const sb = readSellBuyFromData(data, c);
    if (!sb) continue;
    lines.push(`• <b>${c.toUpperCase()}</b>  ${formatToman(sb.sell)} / ${formatToman(sb.buy)}`);
  }

  if (list.length > max) lines.push(`\n… و ${list.length - max} مورد دیگر (اگر خواستی paging اضافه می‌کنم).`);
  return lines.join("\n");
}

async function tgSend(env: Env, chatId: number, text: string, replyTo?: number) {
  const url = `https://api.telegram.org/bot${env.TG_TOKEN}/sendMessage`;
  const body: any = {
    chat_id: chatId,
    text,
    parse_mode: "HTML",
    disable_web_page_preview: true
  };
  if (replyTo) {
    body.reply_to_message_id = replyTo;
    body.allow_sending_without_reply = true;
  }
  await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify(body)
  }).catch(() => {});
}

function chunkText(s: string, maxLen = 3500) {
  const chunks: string[] = [];
  let i = 0;
  while (i < s.length) {
    chunks.push(s.slice(i, i + maxLen));
    i += maxLen;
  }
  return chunks;
}

function normalizeCommand(textNorm: string) {
  const t = stripPunct(textNorm).trim();
  const first = t.split(/\s+/)[0] || "";
  const cmd = first.split("@")[0];
  return cmd;
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    await refreshRates(env);
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") return new Response("ok");

    if (url.pathname === "/refresh") {
      const key = url.searchParams.get("key") || "";
      if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) return new Response("Unauthorized", { status: 401 });
      const r = await refreshRates(env);
      return new Response(JSON.stringify(r), { headers: { "content-type": "application/json" } });
    }

    if (url.pathname !== "/telegram" || req.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await req.json<any>().catch(() => null);
    const msg = update?.message ?? update?.edited_message;
    const chatId: number | undefined = msg?.chat?.id;
    const text: string | undefined = msg?.text;
    const messageId: number | undefined = msg?.message_id;

    if (!chatId || !text) return new Response("ok");

    const textNorm = normalizeText(text);
    const cmd = normalizeCommand(textNorm);

    const doReply = msg?.chat?.type === "group" || msg?.chat?.type === "supergroup";
    const replyTo = doReply ? messageId : undefined;

    const run = async () => {
      if (cmd === "/start" || cmd === "/help") {
        await tgSend(env, chatId, helpText(), replyTo);
        return;
      }

      if (cmd === "/refresh") {
        const parts = stripPunct(textNorm).split(/\s+/).filter(Boolean);
        const key = parts[1] || "";
        if (!env.ADMIN_KEY || key !== env.ADMIN_KEY) {
          await tgSend(env, chatId, "⛔️ کلید اشتباهه.", replyTo);
          return;
        }
        const r = await refreshRates(env);
        await tgSend(
          env,
          chatId,
          r.changed
            ? `✅ بروزرسانی انجام شد.\n⏱ <code>${new Date(r.fetchedAtMs).toLocaleString("fa-IR")}</code>`
            : `ℹ️ تغییری نداشت.\n⏱ <code>${new Date(r.fetchedAtMs).toLocaleString("fa-IR")}</code>`,
          replyTo
        );
        return;
      }

      if (cmd === "/all") {
        let storedTxt = await env.BOT_KV.get(KEY_RATES);
        if (!storedTxt) {
          await refreshRates(env);
          storedTxt = await env.BOT_KV.get(KEY_RATES);
        }
        if (!storedTxt) {
          await tgSend(env, chatId, "⛔️ هنوز دیتا آماده نیست. چند لحظه بعد دوباره بزن.", replyTo);
          return;
        }
        const stored = JSON.parse(storedTxt);
        const out = buildAllText({ fetchedAtMs: Number(stored.fetchedAtMs || 0), data: stored.data });
        const chunks = chunkText(out);
        for (const c of chunks) await tgSend(env, chatId, c, replyTo);
        return;
      }

      const currency = findCurrency(textNorm);
      if (!currency) return;

      let storedTxt = await env.BOT_KV.get(KEY_RATES);
      if (!storedTxt) {
        await refreshRates(env);
        storedTxt = await env.BOT_KV.get(KEY_RATES);
      }
      if (!storedTxt) {
        await tgSend(env, chatId, "⛔️ هنوز دیتا آماده نیست. چند لحظه بعد دوباره تلاش کن.", replyTo);
        return;
      }

      const stored = JSON.parse(storedTxt);
      const data = stored.data;
      const fetchedAtMs = Number(stored.fetchedAtMs || 0);

      const amount = extractAmount(textNorm, currency.keys);
      const unit = currency.unit ?? 1;

      const sb = readSellBuyFromData(data, currency.code);
      if (!sb) {
        await tgSend(env, chatId, `🤷‍♂️ نرخ «${currency.title}» پیدا نشد.`, replyTo);
        return;
      }

      const sellPer1 = sb.sell / unit;
      const buyPer1 = sb.buy / unit;

      const unitNote = unit !== 1 ? `قیمت برای ${unit} واحد در منبع` : undefined;

      const out = prettyResponse({
        title: currency.title,
        amount,
        unitNote,
        sell: sellPer1,
        buy: buyPer1,
        fetchedAtMs
      });

      await tgSend(env, chatId, out, replyTo);
    };

    ctx.waitUntil(run());
    return new Response("ok");
  }
};
