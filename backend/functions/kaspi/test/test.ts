import { DB } from "./mock_supabase.ts";
Deno.env.set("APIPAY_API_KEY", "k"); Deno.env.set("APIPAY_WEBHOOK_SECRET", "whsec"); Deno.env.set("SUPABASE_URL", "x"); Deno.env.set("SUPABASE_SERVICE_ROLE_KEY", "y");
let handler: any; (Deno as any).serve = (h: any) => { handler = h; };
const calls: any[] = []; let invStatus = "processing", invAmount = "2495.00";
globalThis.fetch = (async (url: string, init: any) => {
  calls.push({ url, init });
  if (url.endsWith("/invoices") && init.method === "POST") return new Response(JSON.stringify({ id: 42, amount: "2495.00", status: "processing" }), { status: 201 });
  if (url.endsWith("/invoices/42")) return new Response(JSON.stringify({ id: 42, amount: invAmount, status: invStatus, is_sandbox: false }), { status: 200 });
  return new Response("{}", { status: 404 });
}) as any;
await import("../index.ts");
const call = async (body: any, headers: any = { authorization: "Bearer good" }) => { const r = await handler(new Request("http://x/kaspi", { method: "POST", headers, body: typeof body === "string" ? body : JSON.stringify(body) })); return [r.status, await r.json()]; };
const ok = (name: string, c: boolean, info: any = "") => console.log((c ? "PASS " : "FAIL ") + name, c ? "" : JSON.stringify(info));

let [s, b] = await call({ action: "create", item: "ml", phone: "87001234567" }, {});
ok("без входа — 401", s === 401, [s, b]);
[s, b] = await call({ action: "create", item: "ml", phone: "123" });
ok("неверный номер — 400", s === 400, [s, b]);
[s, b] = await call({ action: "create", item: "ml", phone: "87001234567" });
ok("счёт со скидкой 50%", s === 200 && b.amount === 2495, [s, b]);
const sent = JSON.parse(calls[0].init.body);
ok("в ApiPay ушли телефон, сумма, описание", sent.phone_number === "87001234567" && sent.amount === 2495 && sent.description.startsWith("AVALAND") && calls[0].init.headers["X-API-Key"] === "k", sent);
const orderId = b.order_id;
[s, b] = await call({ action: "create", item: "ml", phone: "87001234567" });
ok("повторный запрос не создаёт второй счёт", b.reused === true && DB.orders.length === 1, [b, DB.orders.length]);
[s, b] = await call({ action: "status", order_id: orderId });
ok("статус до оплаты", b.status === "processing", b);
// webhook with bad signature
const ev = JSON.stringify({ event: "invoice.status_changed", is_sandbox: false, invoice: { id: 42, external_order_id: orderId, status: "paid", amount: "2495.00", paid_at: "2026-10-18T10:00:00Z" } });
[s, b] = await call(ev, { "x-webhook-signature": "sha256=deadbeef" });
ok("поддельная подпись — 401", s === 401 && DB.purchases.length === 0, [s, b]);
const key = await crypto.subtle.importKey("raw", new TextEncoder().encode("whsec"), { name: "HMAC", hash: "SHA-256" }, false, ["sign"]);
const hex = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(ev))), x => x.toString(16).padStart(2, "0")).join("");
// cheaper amount webhook ignored
const evLow = ev.replace('"2495.00"', '"10.00"');
const hexLow = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(evLow))), x => x.toString(16).padStart(2, "0")).join("");
[s, b] = await call(evLow, { "x-webhook-signature": "sha256=" + hexLow });
ok("меньшая сумма не открывает путь", DB.purchases.length === 0, b);
[s, b] = await call(ev, { "x-webhook-signature": "sha256=" + hex });
ok("вебхук «оплачено» открывает путь", s === 200 && DB.purchases.length === 1 && DB.purchases[0].item === "ml" && DB.orders[0].status === "paid", [b, DB.purchases]);
[s, b] = await call(ev, { "x-webhook-signature": "sha256=" + hex });
ok("повторный вебхук без дублей", DB.purchases.length === 1);
[s, b] = await call({ action: "status", order_id: orderId });
ok("статус после оплаты", b.status === "paid", b);
[s, b] = await call({ action: "create", item: "ml", phone: "87001234567" });
ok("уже куплено — owned", b.owned === true, b);
// sandbox webhook ignored
const evSb = JSON.stringify({ event: "invoice.status_changed", is_sandbox: true, invoice: { id: 43, external_order_id: "x", status: "paid", amount: "1.00" } });
const hexSb = Array.from(new Uint8Array(await crypto.subtle.sign("HMAC", key, new TextEncoder().encode(evSb))), x => x.toString(16).padStart(2, "0")).join("");
[s, b] = await call(evSb, { "x-webhook-signature": "sha256=" + hexSb });
ok("песочница игнорируется в бою", b.ignored === "sandbox", b);
// status polling path grants without webhook
DB.purchases.length = 0; DB.orders.length = 0; DB.progress[0].data.coupons = {};
[s, b] = await call({ action: "create", item: "all", phone: "87001234567" });
ok("без купона полная цена", b.amount === 9990, b);
invStatus = "paid";
[s, b] = await call({ action: "status", order_id: DB.orders[0].id });
ok("оплата меньшей суммы через статус не открывает", b.status === "check" && DB.purchases.length === 0, [b, DB.orders[0].status]);
invAmount = "9990.00";
[s, b] = await call({ action: "status", order_id: DB.orders[0].id });
ok("проверка статуса тоже открывает доступ (если вебхук задержался)", b.status === "paid" ? DB.purchases.length === 1 : false, [b, DB.purchases]);
