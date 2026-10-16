// AVALAND push sender. Runs hourly in GitHub Actions (.github/workflows/push.yml).
// Asks the database which subscriptions are due at this local hour and sends a Web Push to each.
import webpush from "web-push";

const { SUPABASE_URL, SUPABASE_ANON_KEY, PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY } = process.env;
for (const [k, v] of Object.entries({ SUPABASE_URL, SUPABASE_ANON_KEY, PUSH_SECRET, VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY })) {
  if (!v) { console.error("missing env " + k); process.exit(1); }
}
webpush.setVapidDetails("mailto:alihansagat005@gmail.com", VAPID_PUBLIC_KEY, VAPID_PRIVATE_KEY);

async function rpc(fn, body) {
  const r = await fetch(`${SUPABASE_URL}/rest/v1/rpc/${fn}`, {
    method: "POST",
    headers: { apikey: SUPABASE_ANON_KEY, Authorization: `Bearer ${SUPABASE_ANON_KEY}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  });
  if (!r.ok) throw new Error(`${fn}: HTTP ${r.status} ${await r.text()}`);
  const t = await r.text();
  return t ? JSON.parse(t) : null;
}

const plural = (n, a, b, c) => { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; };
function message(s, nowMs) {
  const siege = s.next_siege ? Date.parse(s.next_siege) : null;
  if (siege && siege <= nowMs) return { title: "Осада!", body: "Одна из ваших провинций в осаде. Отбейте её повторением — пара минут.", tag: "siege", url: "./?tab=review" };
  if (siege && siege - nowMs < 36 * 3600e3) {
    const h = Math.max(1, Math.round((siege - nowMs) / 3600e3));
    return { title: "Провинции нужна защита", body: `Через ${h} ${plural(h, "час", "часа", "часов")} провинция падёт в осаду. Повторите её сейчас.`, tag: "siege", url: "./?tab=review" };
  }
  if (s.streak > 0) return { title: `Серия ${s.streak} ${plural(s.streak, "день", "дня", "дней")} под угрозой`, body: "Один урок сегодня — и серия продолжится.", tag: "streak", url: "./" };
  return { title: "Мир кода ждёт", body: "Пять минут на урок — и новая провинция ваша.", tag: "daily", url: "./" };
}

const due = await rpc("push_due", { p_secret: PUSH_SECRET }) || [];
console.log(`due: ${due.length}`);
let sent = 0, gone = 0, failed = 0;
const now = Date.now();
for (const s of due) {
  try {
    await webpush.sendNotification(s.sub, JSON.stringify(message(s, now)), { TTL: 6 * 3600, urgency: "normal" });
    sent++;
  } catch (e) {
    if (e.statusCode === 404 || e.statusCode === 410) { gone++; await rpc("push_gone", { p_secret: PUSH_SECRET, p_endpoint: s.endpoint }).catch(() => {}); }
    else { failed++; console.error("push failed", e.statusCode || "", e.body || e.message); }
  }
}
console.log(`sent ${sent}, expired ${gone}, failed ${failed}`);
