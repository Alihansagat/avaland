/* ---------------- аккаунт, облачное сохранение прогресса, веб-пуш ---------------- */
const SB_URL = "https://wetwpoypjrenlibezsxy.supabase.co";
const SB_KEY = "eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9.eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6IndldHdwb3lwanJlbmxpYmV6c3h5Iiwicm9sZSI6ImFub24iLCJpYXQiOjE3OTIwNTY5NjQsImV4cCI6MjEwNzYzMjk2NH0.1qRbSK3wdlcIh_tG-kXMUyqXrkI1x_45_3U8mKus9XI";
const VAPID_PUBLIC = "BD9QJJFL3EIh4aBXW5cHHpEsJaAUC-V2r1JiKlxIAJKLsNzAqvthZ6Lx88QtC88vchwcIAD21org61UA5hRqJ6U";
const AUTH_PROVIDERS = { github: true, google: false, apple: false };
const AUTH_KEY = "avaland-auth";
let sb = null, sbLoad = null, me = null, cloud = { state: "off", at: 0, err: "" }, pushT = null, pullAt = 0;

function sbClient() {
  if (sb) return Promise.resolve(sb);
  sbLoad = sbLoad || (window.AvaSupabase ? Promise.resolve() : loadScript((window.AVA_VENDOR || "vendor/") + "supabase.js")).then(() => {
    sb = window.AvaSupabase.createClient(SB_URL, SB_KEY, { auth: { storageKey: AUTH_KEY, persistSession: true, autoRefreshToken: true, detectSessionInUrl: true, flowType: "pkce" } });
    sb.auth.onAuthStateChange((ev, session) => {
      const was = me && me.id;
      me = session ? session.user : null;
      if (me && me.id !== was) { setTimeout(() => cloudPull(true), 0); }
      if (!me) cloud = { state: "off", at: 0, err: "" };
      if (S.tab === "profile" && ov.hidden) render();
    });
    return sb;
  }, err => { sbLoad = null; throw err; });
  return sbLoad;
}
function hasSession() { try { return !!localStorage.getItem(AUTH_KEY); } catch (e) { return false; } }
async function cloudBoot() {
  const back = /[?&](code|error_description)=/.test(location.search);
  if (!back && !hasSession() && !(S.push && S.push.endpoint)) return;
  try {
    const c = await sbClient();
    const { data } = await c.auth.getSession();
    me = data.session ? data.session.user : null;
    if (back) {
      const q = new URLSearchParams(location.search);
      if (q.get("error_description")) toast("Вход не выполнен: " + q.get("error_description"));
      history.replaceState(null, "", location.pathname + location.hash);
      if (me) { S.tab = "profile"; toast("Вы вошли: " + userName()); }
    }
    if (me) await cloudPull(true);
  } catch (e) { cloud = { state: "error", at: 0, err: "Нет связи с сервером" }; }
}
const userName = () => me ? (me.user_metadata && (me.user_metadata.full_name || me.user_metadata.user_name || me.user_metadata.name)) || me.email || "аккаунт" : "";

/* слияние: прогресс с двух устройств не теряется */
function mergeState(a, b) {
  if (!b || typeof b !== "object") return a;
  const r = JSON.parse(JSON.stringify(a));
  const keys = o => Object.keys(o || {});
  r.topics = r.topics || {};
  keys(b.topics).forEach(k => { const x = r.topics[k], y = b.topics[k]; if (!x || (y && y.last > x.last)) r.topics[k] = y; });
  r.exams = r.exams || {};
  keys(b.exams).forEach(k => { const x = r.exams[k], y = b.exams[k]; if (!x || (y.passed && !x.passed) || (y.passed === x.passed && (y.score || 0) > (x.score || 0))) r.exams[k] = y; });
  r.projects = r.projects || {}; keys(b.projects).forEach(k => { r.projects[k] = r.projects[k] || b.projects[k]; });
  r.days = r.days || {}; keys(b.days).forEach(k => { r.days[k] = Math.max(r.days[k] || 0, b.days[k] || 0); });
  r.xp = Math.max(r.xp || 0, b.xp || 0, Object.values(r.days).reduce((s, v) => s + v, 0));
  r.counts = r.counts || {}; keys(b.counts).forEach(k => { r.counts[k] = Math.max(r.counts[k] || 0, b.counts[k] || 0); });
  r.ach = r.ach || {}; keys(b.ach).forEach(k => { r.ach[k] = r.ach[k] ? Math.min(r.ach[k], b.ach[k]) : b.ach[k]; });
  r.practice = r.practice || {};
  keys(b.practice).forEach(k => {
    const x = r.practice[k] || { tries: 0 }, y = b.practice[k];
    r.practice[k] = { ...y, ...x, tries: Math.max(x.tries || 0, y.tries || 0), solved: x.solved && y.solved ? Math.min(x.solved, y.solved) : x.solved || y.solved, lc: x.lc || y.lc, revealed: x.revealed || y.revealed, lang: x.lang || y.lang };
    if (!r.practice[k].solved) delete r.practice[k].solved;
  });
  ["drafts", "play", "playIn"].forEach(f => { r[f] = { ...(b[f] || {}), ...(r[f] || {}) }; });
  r.profile = { name: (r.profile && r.profile.name) || (b.profile && b.profile.name) || "", empire: (r.profile && r.profile.empire) || (b.profile && b.profile.empire) || "" };
  r.leet = r.leet || b.leet || null;
  if ((b.coinsAt || 0) > (r.coinsAt || 0)) { r.coins = b.coins || 0; r.coinsAt = b.coinsAt; r.inv = { ...(b.inv || {}) }; r.boost = b.boost || 0; }
  r.coupons = { ...(b.coupons || {}), ...(r.coupons || {}) };
  r.frozen = { ...(b.frozen || {}), ...(r.frozen || {}) };
  r.owned = { ...(b.owned || {}), ...(r.owned || {}) };
  r.goalDay = r.goalDay > (b.goalDay || "") ? r.goalDay : b.goalDay || r.goalDay;
  r.onboarded = !!(r.onboarded || b.onboarded);
  r.warmup = r.warmup > (b.warmup || "") ? r.warmup : b.warmup || r.warmup;
  return r;
}
function cloudData() {
  const d = JSON.parse(JSON.stringify(S));
  delete d.offset; delete d.tab; delete d.push;
  return d;
}
async function cloudPull(push) {
  if (!me) return;
  cloud.state = "sync";
  try {
    const c = await sbClient();
    const { data, error } = await c.from("progress").select("data, updated_at").eq("user_id", me.id).maybeSingle();
    if (error) throw error;
    if (data && data.data) {
      const keep = { settings: S.settings, offset: S.offset, tab: S.tab, sel: S.sel, push: S.push, lang: S.lang };
      S = Object.assign(mergeState(S, data.data), keep);
      saveLocal();
    }
    pullAt = Date.now();
    if (push || !data) await cloudPush();
    else cloud = { state: "ok", at: Date.now(), err: "" };
    checkAch();
    if (ov.hidden) render();
  } catch (e) { cloud = { state: "error", at: cloud.at, err: e.message || String(e) }; if (S.tab === "profile" && ov.hidden) render(); }
}
async function cloudPush() {
  if (!me) return;
  try {
    const c = await sbClient();
    const { error } = await c.from("progress").upsert({ user_id: me.id, data: cloudData(), updated_at: new Date().toISOString() });
    if (error) throw error;
    cloud = { state: "ok", at: Date.now(), err: "" };
  } catch (e) { cloud = { state: "error", at: cloud.at, err: e.message || String(e) }; }
  const el = $("#cloud-st"); if (el) el.innerHTML = cloudStatusText();
}
let cloudT = null;
function cloudQueue() {
  if (me) { clearTimeout(cloudT); cloudT = setTimeout(cloudPush, 3000); }
  if (S.push && S.push.endpoint) { clearTimeout(pushT); pushT = setTimeout(pushSync, 5000); }
}
document.addEventListener("visibilitychange", () => {
  if (document.visibilityState === "visible" && me && Date.now() - pullAt > 60000) cloudPull(false);
  if (document.visibilityState === "hidden" && me && cloudT) { clearTimeout(cloudT); cloudT = null; cloudPush(); }
});
function cloudStatusText() {
  if (cloud.state === "sync") return "Синхронизация…";
  if (cloud.state === "error") return `<span style="color:var(--danger)">Не удалось синхронизировать: ${esc(cloud.err)}</span>`;
  if (cloud.at) return `Прогресс сохранён в облаке · ${new Date(cloud.at).toLocaleTimeString("ru-RU", { hour: "2-digit", minute: "2-digit" })}`;
  return "Прогресс будет сохраняться в облаке автоматически";
}

/* --- экран аккаунта --- */
const GH_ICON = '<svg width="18" height="18" viewBox="0 0 16 16" fill="currentColor" aria-hidden="true"><path d="M8 0C3.58 0 0 3.58 0 8c0 3.54 2.29 6.53 5.47 7.59.4.07.55-.17.55-.38v-1.33c-2.23.48-2.7-1.07-2.7-1.07-.36-.92-.89-1.17-.89-1.17-.73-.5.06-.49.06-.49.8.06 1.23.83 1.23.83.72 1.22 1.87.87 2.33.66.07-.52.28-.87.5-1.07-1.78-.2-3.64-.89-3.64-3.95 0-.87.31-1.59.82-2.15-.08-.2-.36-1.02.08-2.12 0 0 .67-.21 2.2.82a7.6 7.6 0 0 1 4 0c1.53-1.04 2.2-.82 2.2-.82.44 1.1.16 1.92.08 2.12.51.56.82 1.27.82 2.15 0 3.07-1.87 3.75-3.65 3.95.29.25.54.73.54 1.48v2.2c0 .21.15.46.55.38A8.01 8.01 0 0 0 16 8c0-4.42-3.58-8-8-8Z"/></svg>';
const G_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" aria-hidden="true"><path fill="#EA4335" d="M12 10.2v3.9h5.5c-.24 1.4-1.7 4.1-5.5 4.1-3.3 0-6-2.7-6-6.2s2.7-6.2 6-6.2c1.9 0 3.2.8 3.9 1.5l2.7-2.6C16.9 3.1 14.7 2 12 2 6.5 2 2 6.5 2 12s4.5 10 10 10c5.8 0 9.6-4 9.6-9.8 0-.7-.1-1.2-.2-1.7H12z"/></svg>';
const A_ICON = '<svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true"><path d="M16.4 12.6c0-2.4 2-3.6 2.1-3.7-1.1-1.7-2.9-1.9-3.5-1.9-1.5-.2-2.9.9-3.7.9-.8 0-1.9-.9-3.2-.8-1.6 0-3.1 1-4 2.4-1.7 3-.4 7.4 1.2 9.8.8 1.2 1.8 2.5 3 2.4 1.2 0 1.7-.8 3.1-.8 1.5 0 1.9.8 3.2.8 1.3 0 2.2-1.2 3-2.4.9-1.4 1.3-2.7 1.3-2.8 0 0-2.5-1-2.5-3.9zM14 5.5c.7-.8 1.1-1.9 1-3-1 0-2.1.7-2.8 1.5-.6.7-1.2 1.8-1 2.9 1.1.1 2.1-.6 2.8-1.4z"/></svg>';
let authMode = "in";
function accountCardHTML() {
  if (me) {
    const av = me.user_metadata && me.user_metadata.avatar_url;
    const via = (me.app_metadata && me.app_metadata.provider) || "email";
    return `<section class="card stack"><div><div class="eyebrow">Аккаунт</div><h2 class="h-sec acc-h">${av ? `<img class="ava" src="${esc(av)}" alt="" width="32" height="32">` : ""}${esc(userName())}</h2></div>
      <p class="muted" style="margin:0">Вход через ${via === "github" ? "GitHub" : via === "google" ? "Google" : via === "apple" ? "Apple" : "почту"}${me.email && via !== "email" ? " · " + esc(me.email) : ""}. Прогресс, награды, решённые задачи и код сохраняются в облаке и вернутся на любом устройстве после входа.</p>
      <p class="note" id="cloud-st">${cloudStatusText()}</p>
      <div class="row"><button class="btn" data-act="cloudSync">Синхронизировать сейчас</button><button class="btn ghost" data-act="signOut">Выйти</button></div>
      <details class="log"><summary>Удалить аккаунт</summary><p class="note">Аккаунт и сохранённый в облаке прогресс будут удалены навсегда. Прогресс на этом устройстве останется.</p><button class="btn red" data-act="delAcc">Удалить аккаунт навсегда</button></details></section>`;
  }
  const oauth = [
    ["github", "GitHub", GH_ICON, AUTH_PROVIDERS.github],
    ["google", "Google", G_ICON, AUTH_PROVIDERS.google],
    ["apple", "Apple", A_ICON, AUTH_PROVIDERS.apple],
  ].map(([id, name, icon, on]) => `<button class="btn oauth" data-act="oauth" data-p="${id}" ${on && !NATIVE ? "" : "disabled"}>${icon}<span>Войти через ${name}</span>${on ? (NATIVE ? '<small>на сайте</small>' : "") : "<small>скоро</small>"}</button>`).join("");
  return `<section class="card stack"><div><div class="eyebrow">Аккаунт</div><h2 class="h-sec">Сохраните прогресс</h2></div>
    <p class="muted" style="margin:0">Сейчас прогресс хранится только на этом устройстве. Войдите — и карта, награды, задачи и код сохранятся в облаке: переустановите приложение или откройте сайт на другом устройстве, и всё вернётся.</p>
    <div class="oauths">${oauth}</div>
    <form class="stack" data-act="authForm" autocomplete="on">
      <div class="seg" role="group" aria-label="Режим"><button type="button" data-act="authMode" data-m="in" aria-pressed="${authMode === "in"}">Вход по почте</button><button type="button" data-act="authMode" data-m="up" aria-pressed="${authMode === "up"}">Регистрация</button></div>
      <div class="field"><label for="au-mail">Почта</label><input class="input" id="au-mail" type="email" autocomplete="email" inputmode="email" autocapitalize="off" spellcheck="false" required maxlength="120" placeholder="you@example.com"></div>
      <div class="field"><label for="au-pass">Пароль${authMode === "up" ? " (не короче 8 символов)" : ""}</label><input class="input" id="au-pass" type="password" autocomplete="${authMode === "up" ? "new-password" : "current-password"}" required minlength="${authMode === "up" ? 8 : 6}" maxlength="72"></div>
      <button class="btn pri" type="submit">${authMode === "up" ? "Создать аккаунт" : "Войти"}</button>
      <p class="note" id="au-msg"></p>
    </form>
    <p class="note">LeetCode не даёт входить через свой аккаунт в сторонние приложения, поэтому его профиль привязывается на вкладке «Практика». Вход через Apple появится в версии для App Store.</p></section>`;
}
const AUTH_ERR = [
  [/invalid login credentials/i, "Неверная почта или пароль."],
  [/already registered|already exists/i, "Аккаунт с этой почтой уже есть — выберите «Вход по почте»."],
  [/password should be at least|weak/i, "Слишком простой пароль: нужно не меньше 8 символов, лучше с цифрами."],
  [/unable to validate email|invalid format|email address .* invalid/i, "Проверьте адрес почты."],
  [/rate limit|too many/i, "Слишком много попыток. Подождите минуту."],
  [/email not confirmed/i, "Почта не подтверждена. Откройте письмо от AVALAND."],
  [/fetch|network/i, "Нет связи с сервером. Проверьте интернет."],
];
const authErr = e => { const m = String((e && e.message) || e); const f = AUTH_ERR.find(([re]) => re.test(m)); return f ? f[1] : m; };
document.addEventListener("submit", async e => {
  if (!e.target.matches("form[data-act=authForm]")) return;
  e.preventDefault();
  const msg = t => { const el = $("#au-msg"); if (el) el.textContent = t; };
  const email = $("#au-mail").value.trim(), password = $("#au-pass").value;
  if (authMode === "up" && password.length < 8) { msg("Пароль должен быть не короче 8 символов."); return; }
  const btn = e.target.querySelector("button[type=submit]"); btn.disabled = true; msg(authMode === "up" ? "Создаю аккаунт…" : "Вхожу…");
  try {
    const c = await sbClient();
    const r = authMode === "up"
      ? await c.auth.signUp({ email, password, options: { data: { full_name: S.profile.name || "" }, emailRedirectTo: location.origin + location.pathname } })
      : await c.auth.signInWithPassword({ email, password });
    if (r.error) throw r.error;
    if (!r.data.session) { msg("Аккаунт создан. Подтвердите почту по ссылке из письма и войдите."); btn.disabled = false; return; }
    toast(authMode === "up" ? "Аккаунт создан, прогресс сохранён в облаке" : "Вы вошли");
  } catch (err) { msg(authErr(err)); btn.disabled = false; }
});
async function oauthStart(p) {
  if (!AUTH_PROVIDERS[p]) { toast("Этот способ входа появится позже"); return; }
  if (NATIVE) { toast("В приложении пока работает вход по почте. Через " + p + " можно войти на сайте."); return; }
  try {
    const c = await sbClient();
    saveLocal();
    const { error } = await c.auth.signInWithOAuth({ provider: p, options: { redirectTo: location.origin + location.pathname } });
    if (error) throw error;
  } catch (err) { toast("Не удалось начать вход: " + authErr(err)); }
}
async function deleteAccount() {
  try {
    const c = await sbClient();
    const { error } = await c.rpc("delete_me");
    if (error) throw error;
    await c.auth.signOut({ scope: "local" });
    me = null; toast("Аккаунт удалён"); render();
  } catch (err) { toast("Не удалось удалить аккаунт: " + authErr(err)); }
}

/* --- веб-пуш: напоминания и предупреждения об осаде на сайте и на экране «Домой» --- */
const isIOS = () => /iPhone|iPad|iPod/.test(navigator.userAgent) || (navigator.platform === "MacIntel" && navigator.maxTouchPoints > 1);
const standalone = () => window.matchMedia("(display-mode: standalone)").matches || navigator.standalone === true;
const pushSupported = () => "serviceWorker" in navigator && "PushManager" in window && "Notification" in window;
function pushHint() {
  if (NATIVE) return "";
  if (isIOS() && !standalone()) return "На iPhone уведомления работают, если открыть AVALAND с экрана «Домой»: в Safari нажмите «Поделиться» → «На экран „Домой“», откройте приложение с иконки и включите напоминания здесь.";
  if (!pushSupported()) return "Этот браузер не поддерживает уведомления от сайтов.";
  if (Notification.permission === "denied") return "Уведомления запрещены в настройках браузера для этого сайта.";
  return S.push && S.push.endpoint ? "Напоминания включены на этом устройстве." : "Включите, чтобы получать напоминание о занятии и предупреждения об осаде.";
}
function nextSiege() {
  let min = null;
  LANGS.forEach((L, l) => L.lessons.forEach((_, i) => { const r = S.topics[tk(l, i)]; if (r) { const t = r.last - S.offset * DAY + HOLD * DAY; if (!min || t < min) min = t; } }));
  return min ? new Date(min).toISOString() : null;
}
function lastStudy() { const ks = Object.keys(S.days).filter(k => S.days[k] > 0).sort(); return ks.length ? ks[ks.length - 1] : null; }
const urlB64 = s => { const p = "=".repeat((4 - s.length % 4) % 4), b = atob((s + p).replace(/-/g, "+").replace(/_/g, "/")); return Uint8Array.from(b, c => c.charCodeAt(0)); };
async function pushEnable() {
  if (!pushSupported()) { toast(pushHint() || "Уведомления недоступны"); return false; }
  if (isIOS() && !standalone()) { toast("Сначала добавьте AVALAND на экран «Домой»"); return false; }
  const perm = await Notification.requestPermission();
  if (perm !== "granted") { toast("Уведомления не разрешены"); return false; }
  try {
    const reg = await navigator.serviceWorker.ready;
    let sub = await reg.pushManager.getSubscription();
    if (!sub) sub = await reg.pushManager.subscribe({ userVisibleOnly: true, applicationServerKey: urlB64(VAPID_PUBLIC) });
    S.push = { endpoint: sub.endpoint }; saveLocal();
    await pushSync();
    toast("Напоминания включены");
    return true;
  } catch (err) { toast("Не удалось включить уведомления: " + (err.message || err)); return false; }
}
async function pushSync() {
  if (!S.push || !S.push.endpoint || NATIVE) return;
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    if (!sub) { S.push = null; saveLocal(); return; }
    const c = await sbClient();
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || "Asia/Almaty";
    const { error } = await c.rpc("push_save", { p_sub: sub.toJSON(), p_tz: tz, p_hour: S.settings.hour, p_next_siege: nextSiege(), p_last_study: lastStudy(), p_streak: streak() });
    if (error) throw error;
    S.push.at = Date.now(); saveLocal();
  } catch (e) {}
}
async function pushDisable() {
  try {
    const reg = await navigator.serviceWorker.ready, sub = await reg.pushManager.getSubscription();
    const ep = (sub && sub.endpoint) || (S.push && S.push.endpoint);
    if (sub) await sub.unsubscribe();
    if (ep) { const c = await sbClient(); await c.rpc("push_delete", { p_endpoint: ep }); }
  } catch (e) {}
  S.push = null; saveLocal();
}
if (!NATIVE && "serviceWorker" in navigator && window.AVA_SW) {
  window.addEventListener("load", () => navigator.serviceWorker.register(window.AVA_SW).catch(() => {}));
}

/* --- резервная копия без аккаунта --- */
function backupDownload() {
  const blob = new Blob([JSON.stringify({ app: "AVALAND", v: S.v, at: new Date().toISOString(), data: cloudData() }, null, 1)], { type: "application/json" });
  const a = document.createElement("a"); a.href = URL.createObjectURL(blob); a.download = `avaland-progress-${dayKey(Date.now())}.json`;
  document.body.appendChild(a); a.click(); a.remove(); setTimeout(() => URL.revokeObjectURL(a.href), 2000);
  toast("Файл с прогрессом сохранён");
}
function backupRestore(file) {
  const r = new FileReader();
  r.onload = () => {
    try {
      const j = JSON.parse(r.result);
      if (!j || j.app !== "AVALAND" || !j.data) throw new Error("это не файл AVALAND");
      S = Object.assign(mergeState(S, j.data), { settings: S.settings, offset: S.offset, tab: S.tab });
      save(); checkAch(); render(); toast("Прогресс восстановлен");
    } catch (e) { toast("Не удалось прочитать файл: " + e.message); }
  };
  r.readAsText(file);
}
function cloudAction(a, b) {
  switch (a) {
    case "oauth": oauthStart(b.dataset.p); return true;
    case "authMode": authMode = b.dataset.m; render(); return true;
    case "cloudSync": cloudPull(true).then(() => toast(cloud.state === "ok" ? "Синхронизировано" : "Не удалось синхронизировать")); return true;
    case "signOut": sbClient().then(c => c.auth.signOut({ scope: "local" })).then(() => { me = null; toast("Вы вышли. Прогресс остался на этом устройстве"); render(); }); return true;
    case "delAcc": deleteAccount(); return true;
    case "backup": backupDownload(); return true;
    case "restore": { const i = $("#bk-file"); if (i) i.click(); return true; }
  }
  return false;
}
document.addEventListener("change", e => { if (e.target.id === "bk-file" && e.target.files[0]) { backupRestore(e.target.files[0]); e.target.value = ""; } });
