export interface Env {
  BOT_KV: KVNamespace;
  TG_TOKEN: string;  // Secret
  TG_SECRET: string; // Secret
}

const KEY_RATES = "rates:latest";
const KEY_CHAT = "tg:chat_id";

function normalizeText(input: string): string {
  const map: Record<string, string> = {
    "۰":"0","۱":"1","۲":"2","۳":"3","۴":"4","۵":"5","۶":"6","۷":"7","۸":"8","۹":"9",
    "٠":"0","١":"1","٢":"2","٣":"3","٤":"4","٥":"5","٦":"6","٧":"7","٨":"8","٩":"9"
  };
  const converted = input.trim().split("").map(ch => map[ch] ?? ch).join("");
  return converted.toLowerCase();
}

function parseAmountAndItem(t: string): { amount: number; item: string } {
  const parts = t.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return { amount: 1, item: "" };

  // "2 دلار"
  const first = Number(parts[0]);
  if (Number.isFinite(first)) {
    return { amount: Math.max(0, first), item: parts.slice(1).join(" ") || "usd" };
  }

  // "دلار 2"
  const last = Number(parts[parts.length - 1]);
  if (parts.length >= 2 && Number.isFinite(last)) {
    return { amount: Math.max(0, last), item: parts.slice(0, -1).join(" ") };
  }

  return { amount: 1, item: t };
}

function itemToCode(item: string): string {
  const i = item.trim();

  // چند نگاشت فارسیِ مهم (بقیه رو با کد 3 حرفی بزن)
  if (i.includes("دلار")) return "usd";
  if (i.includes("یورو")) return "eur";
  if (i.includes("پوند")) return "gbp";
  if (i.includes("درهم")) return "aed";
  if (i.includes("لیر")) return "try";

  // اگر کاربر کد داد مثل usd/eur/sekke...
  return i.replace(/[\s\-_]/g, "").toLowerCase();
}

function formatToman(n: number): string {
  const x = Math.round(n);
  return x.toString().replace(/\B(?=(\d{3})+(?!\d))/g, ",");
}

async function fetchBonbastJSON(): Promise<any> {
  // fallback
  const urls = ["https://bonbast.com/json", "https://www.bonbast.com/json"];
  let lastErr: any = null;

  for (const url of urls) {
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
  throw lastErr ?? new Error("Failed to fetch rates");
}

function findSellBuy(data: any, code: string): { sell: number; buy: number } | null {
  if (!data || typeof data !== "object") return null;
  const c = code.toLowerCase();
  const s = data[`${c}1`];
  const b = data[`${c}2`];
  const sell = Number(String(s ?? "").replace(/,/g, ""));
  const buy = Number(String(b ?? "").replace(/,/g, ""));
  if (!Number.isFinite(sell) || !Number.isFinite(buy)) return null;
  return { sell, buy };
}

function buildAllList(data: any, fetchedAtMs: number): string {
  const keys = Object.keys(data || {});
  const bases = new Set<string>();
  for (const k of keys) {
    const m = k.match(/^([a-z0-9_]+)([12])$/i);
    if (m) bases.add(m[1].toLowerCase());
  }
  const list = Array.from(bases).sort();

  const lines: string[] = [];
  lines.push(`📌 لیست نرخ‌ها (Sell/Buy) — count=${list.length}`);
  lines.push(`⏱️ last_update_ms=${Math.round(fetchedAtMs)}`);
  lines.push("");
  for (const code of list.slice(0, 120)) {
    const sb = findSellBuy(data, code);
    if (!sb) continue;
    lines.push(`${code.toUpperCase()}  |  ${formatToman(sb.sell)} / ${formatToman(sb.buy)}`);
  }
  lines.push("");
  lines.push("برای محاسبه مثال: 2 دلار  |  3 eur  |  1.5 aed");
  return lines.join("\n");
}

async function tgSend(token: string, chatId: number, text: string): Promise<void> {
  const url = `https://api.telegram.org/bot${token}/sendMessage`;
  const res = await fetch(url, {
    method: "POST",
    headers: { "content-type": "application/json" },
    body: JSON.stringify({
      chat_id: chatId,
      text,
      disable_web_page_preview: true
    })
  });
  if (!res.ok) {
    // عمداً silent (برای اینکه Worker fail نشه)
  }
}

export default {
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    // هر 30 دقیقه یک بار: fetch و ذخیره
    const data = await fetchBonbastJSON();
    const payload = {
      fetchedAtMs: Date.now(),
      source: "bonbast",
      data
    };
    await env.BOT_KV.put(KEY_RATES, JSON.stringify(payload));
  },

  async fetch(req: Request, env: Env, ctx: ExecutionContext): Promise<Response> {
    const url = new URL(req.url);

    if (url.pathname === "/health") return new Response("ok");

    if (url.pathname !== "/telegram" || req.method !== "POST") {
      return new Response("Not Found", { status: 404 });
    }

    // امنیت وبهوک: secret_token → هدر X-Telegram-Bot-Api-Secret-Token :contentReference[oaicite:6]{index=6}
    const got = req.headers.get("X-Telegram-Bot-Api-Secret-Token") || "";
    if (got !== env.TG_SECRET) return new Response("Unauthorized", { status: 401 });

    const update = await req.json<any>().catch(() => null);
    const msg = update?.message;
    const chatId: number | undefined = msg?.chat?.id;
    const text: string | undefined = msg?.text;

    if (!chatId || !text) return new Response("ok");

    // فقط یک نفر: اولین chat_id ذخیره میشه
    const allowed = await env.BOT_KV.get(KEY_CHAT);
    if (allowed && allowed !== String(chatId)) return new Response("ok");
    if (!allowed) await env.BOT_KV.put(KEY_CHAT, String(chatId));

    const t = normalizeText(text);

    let reply = "";
    if (t === "/start" || t === "/help") {
      reply =
        "دستورها:\n" +
        "/all  (لیست همه)\n" +
        "مثال:\n" +
        "دلار\n" +
        "2 دلار\n" +
        "eur\n" +
        "3.5 eur";
    } else {
      // دیتا از KV
      const storedTxt = await env.BOT_KV.get(KEY_RATES);
      if (!storedTxt) {
        reply = "هنوز دیتا ذخیره نشده. 1-2 دقیقه دیگه دوباره پیام بده (کرون اولین بار اجرا بشه).";
      } else {
        const stored = JSON.parse(storedTxt);
        const data = stored?.data;
        const fetchedAtMs = Number(stored?.fetchedAtMs || 0);

        if (t === "/all" || t === "all" || t === "همه") {
          reply = buildAllList(data, fetchedAtMs);
        } else {
          const { amount, item } = parseAmountAndItem(t);
          const code = itemToCode(item || "usd");

          const sb = findSellBuy(data, code);
          if (!sb) {
            reply = `پیدا نشد: ${item}\nبرای لیست کامل /all رو بزن`;
          } else {
            const sellTotal = sb.sell * amount;
            const buyTotal = sb.buy * amount;
            reply =
              `📌 ${item} × ${amount}\n\n` +
              `Sell: ${formatToman(sb.sell)} تومان\n` +
              `Buy:  ${formatToman(sb.buy)} تومان\n\n` +
              `Sell×Qty: ${formatToman(sellTotal)} تومان\n` +
              `Buy×Qty:  ${formatToman(buyTotal)} تومان\n\n` +
              `⏱️ آخرین آپدیت: ${Math.round(fetchedAtMs)}`;
          }
        }
      }
    }

    ctx.waitUntil(tgSend(env.TG_TOKEN, chatId, reply));
    return new Response("ok");
  }
};
