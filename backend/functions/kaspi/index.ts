// AVALAND: оплата путей профессий через Kaspi Pay (сервис ApiPay.kz).
//
// Один адрес обслуживает три запроса:
//   1. {action:"create", item, phone}  от приложения (с токеном пользователя) — выставляет счёт в Kaspi;
//   2. {action:"status", order_id}      от приложения — проверяет оплату;
//   3. вебхук ApiPay (заголовок X-Webhook-Signature) — подтверждает оплату и открывает путь.
//
// Секреты (Supabase → Edge Functions → Secrets):
//   APIPAY_API_KEY         — ключ API из кабинета ApiPay
//   APIPAY_WEBHOOK_SECRET  — секрет вебхука из кабинета ApiPay
//   APIPAY_ALLOW_SANDBOX=1 — только для проверки в песочнице, потом удалить
// Функцию разворачивают с выключенной проверкой JWT (вебхук приходит без токена):
//   supabase functions deploy kaspi --no-verify-jwt
import { createClient } from "jsr:@supabase/supabase-js@2";

const API = "https://api.apipay.kz/api/v1";
const KEY = Deno.env.get("APIPAY_API_KEY") ?? "";
const SECRET = Deno.env.get("APIPAY_WEBHOOK_SECRET") ?? "";
const ALLOW_SANDBOX = Deno.env.get("APIPAY_ALLOW_SANDBOX") === "1";
const admin = createClient(Deno.env.get("SUPABASE_URL")!, Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!, { auth: { persistSession: false } });

const cors = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};
const json = (body: unknown, status = 200) => new Response(JSON.stringify(body), { status, headers: { ...cors, "Content-Type": "application/json" } });

Deno.serve(async (req) => {
  if (req.method === "OPTIONS") return new Response("ok", { headers: cors });
  if (req.method !== "POST") return json({ error: "method not allowed" }, 405);
  const raw = await req.text();
  const sig = req.headers.get("x-webhook-signature");
  if (sig) return webhook(raw, sig);

  if (!KEY) return json({ error: "payments not configured" }, 503);
  const token = (req.headers.get("authorization") ?? "").replace(/^Bearer\s+/i, "");
  const { data: auth } = await admin.auth.getUser(token);
  const user = auth?.user;
  if (!user) return json({ error: "Войдите в аккаунт" }, 401);

  let body: Record<string, unknown>;
  try { body = JSON.parse(raw); } catch { return json({ error: "bad request" }, 400); }
  if (body.action === "create") return create(user.id, String(body.item ?? ""), String(body.phone ?? ""));
  if (body.action === "status") return status(user.id, String(body.order_id ?? ""));
  return json({ error: "unknown action" }, 400);
});

async function create(uid: string, item: string, phone: string) {
  if (!/^87\d{9}$/.test(phone)) return json({ error: "Номер должен быть в формате 87XXXXXXXXX" }, 400);
  const { data: it } = await admin.from("shop_items").select("item, title, amount").eq("item", item).maybeSingle();
  if (!it) return json({ error: "Нет такого товара" }, 400);

  const { data: own } = await admin.from("purchases").select("item").eq("user_id", uid).in("item", [item, "all"]);
  if (own && own.length) return json({ owned: true });

  // Купон из Лавки: хранится в прогрессе пользователя, максимум 50%.
  const { data: pr } = await admin.from("progress").select("data").eq("user_id", uid).maybeSingle();
  const raw = Number(pr?.data?.coupons?.[item]) || 0;
  const pct = raw >= 50 ? 50 : raw >= 25 ? 25 : 0;
  const amount = Math.round(it.amount * (100 - pct) / 100);

  // Не плодим счета: свежий неоплаченный заказ на тот же товар и номер переиспользуем.
  const since = new Date(Date.now() - 20 * 60e3).toISOString();
  const { data: recent } = await admin.from("orders").select("id, amount, invoice_id, status")
    .eq("user_id", uid).eq("item", item).eq("phone", phone).eq("amount", amount).gte("created_at", since)
    .in("status", ["processing", "pending"]).order("created_at", { ascending: false }).limit(1);
  if (recent && recent.length && recent[0].invoice_id) return json({ order_id: recent[0].id, amount, reused: true });

  const { data: order, error } = await admin.from("orders").insert({ user_id: uid, item, amount, coupon: pct, phone }).select().single();
  if (error || !order) return json({ error: "Не удалось создать заказ" }, 500);

  const r = await fetch(`${API}/invoices`, {
    method: "POST",
    headers: { "X-API-Key": KEY, "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({
      phone_number: phone,
      amount,
      description: `AVALAND: ${it.title}`.slice(0, 60),
      external_order_id: order.id,
      external_order_id_idempotency: order.id,
    }),
  });
  const inv = await r.json().catch(() => ({}));
  if (!r.ok) {
    await admin.from("orders").update({ status: "error" }).eq("id", order.id);
    const msg = inv?.message || inv?.error || `Kaspi ответил ${r.status}`;
    return json({ error: String(msg) }, 502);
  }
  await admin.from("orders").update({ invoice_id: inv.id, status: inv.status ?? "processing" }).eq("id", order.id);
  return json({ order_id: order.id, amount });
}

async function status(uid: string, orderId: string) {
  const { data: order } = await admin.from("orders").select("*").eq("id", orderId).eq("user_id", uid).maybeSingle();
  if (!order) return json({ error: "Заказ не найден" }, 404);
  if (order.status === "paid") return json({ status: "paid" });
  if (!order.invoice_id) return json({ status: order.status });
  // Запасной путь, если вебхук задержался: спрашиваем статус счёта напрямую.
  const r = await fetch(`${API}/invoices/${order.invoice_id}`, { headers: { "X-API-Key": KEY, Accept: "application/json" } });
  if (!r.ok) return json({ status: order.status });
  const inv = await r.json();
  if (inv.status === "paid" && (!inv.is_sandbox || ALLOW_SANDBOX) && Number(inv.amount) >= order.amount) {
    await grant(order);
    return json({ status: "paid" });
  }
  const st = inv.status === "paid" ? "check" : inv.status;   // «оплачено», но сумма или режим не подходят — не открываем
  if (st && st !== order.status) await admin.from("orders").update({ status: st }).eq("id", order.id);
  return json({ status: st ?? order.status });
}

async function grant(order: { id: string; user_id: string; item: string; amount: number }) {
  await admin.from("orders").update({ status: "paid", paid_at: new Date().toISOString() }).eq("id", order.id);
  await admin.from("purchases").upsert(
    { user_id: order.user_id, item: order.item, order_id: order.id, amount: order.amount },
    { onConflict: "user_id,item", ignoreDuplicates: true },
  );
}

async function hmacHex(secret: string, data: string) {
  const key = await crypto.subtle.importKey("raw", new TextEncoder().encode(secret), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
  const sig = new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(data)));
  return Array.from(sig, (b) => b.toString(16).padStart(2, "0")).join("");
}
function safeEqual(a: string, b: string) {
  if (a.length !== b.length) return false;
  let d = 0;
  for (let i = 0; i < a.length; i++) d |= a.charCodeAt(i) ^ b.charCodeAt(i);
  return d === 0;
}

async function webhook(raw: string, sig: string) {
  if (!SECRET) return json({ error: "webhook not configured" }, 503);
  const expected = "sha256=" + await hmacHex(SECRET, raw);
  if (!safeEqual(sig.trim().toLowerCase(), expected)) return json({ error: "bad signature" }, 401);
  let ev: { event?: string; is_sandbox?: boolean; invoice?: { id: number; external_order_id?: string; status?: string; amount?: string } };
  try { ev = JSON.parse(raw); } catch { return json({ error: "bad json" }, 400); }
  if (ev.is_sandbox && !ALLOW_SANDBOX) return json({ ok: true, ignored: "sandbox" });
  const inv = ev.invoice;
  if (ev.event !== "invoice.status_changed" || !inv?.external_order_id) return json({ ok: true });
  const { data: order } = await admin.from("orders").select("*").eq("id", inv.external_order_id).maybeSingle();
  if (!order) return json({ ok: true, ignored: "unknown order" });
  if (inv.status === "paid") {
    if (Number(inv.amount) < order.amount) return json({ ok: true, ignored: "amount mismatch" });
    if (order.status !== "paid") await grant(order);
  } else if (inv.status && inv.status !== "paid" && order.status !== "paid") {
    await admin.from("orders").update({ status: inv.status }).eq("id", order.id);
  }
  return json({ ok: true });
}
