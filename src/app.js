/* AVALAND — карта-игра для изучения языков программирования */
(() => {
"use strict";

const LANGS = window.AVA_CONTENT;
const DEV = !!window.AVA_DEV;
const VERSION = "1.0.0";
const APP_STORE_ID = "";            // впишите id приложения из App Store Connect, чтобы появилась кнопка «Оценить»
const DAY = 864e5, HOLD = 14, WARN = 10, KEY = "avaland-v2";
const LESSON_PASS = 3, EXAM_RATE = 0.8, EXAM_COOLDOWN_MIN = 30;
const Cap = window.Capacitor;
const NATIVE = !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform());
const P = (Cap && Cap.Plugins) || {};

const $ = (s, r = document) => r.querySelector(s);
const esc = s => String(s).replace(/[&<>"]/g, c => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));
const IDX = Object.fromEntries(LANGS.map((L, i) => [L.id, i]));

/* ---------------- state ---------------- */
const fresh = () => ({
  v: 2, onboarded: false,
  profile: { name: "", empire: "" },
  topics: {}, exams: {}, projects: {},
  xp: 0, days: {}, warmup: "",
  counts: { reviews: 0, lifted: 0, perfect: 0, lessons: 0 },
  ach: {},
  settings: { goal: 50, remind: true, hour: 19, sound: true, haptics: true },
  offset: 0, sel: null, tab: "map", last: null, reviewAsked: false,
  practice: {}, drafts: {}, lang: "py", leet: null
});
let S = fresh();

function merge(base, d) {
  for (const k in d) {
    const v = d[k];
    if (v && typeof v === "object" && !Array.isArray(v) && base[k] && typeof base[k] === "object") base[k] = merge(base[k], v);
    else base[k] = v;
  }
  return base;
}
async function load() {
  let raw = null;
  try { if (NATIVE && P.Preferences) raw = (await P.Preferences.get({ key: KEY })).value; } catch (e) {}
  if (!raw) { try { raw = localStorage.getItem(KEY); } catch (e) {} }
  if (raw) { try { S = merge(fresh(), JSON.parse(raw)); } catch (e) {} }
}
let notifyTimer;
function save() {
  const raw = JSON.stringify(S);
  try { localStorage.setItem(KEY, raw); } catch (e) {}
  if (NATIVE && P.Preferences) P.Preferences.set({ key: KEY, value: raw }).catch(() => {});
  clearTimeout(notifyTimer);
  notifyTimer = setTimeout(scheduleNotifications, 600);
}

/* ---------------- time, progress ---------------- */
const now = () => Date.now() + S.offset * DAY;
const dayKey = t => { const d = new Date(t); return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`; };
const tk = (l, i) => LANGS[l].id + "-" + i;
function status(l, i) {
  const r = S.topics[tk(l, i)];
  if (r) { const age = (now() - r.last) / DAY; return age > HOLD ? "siege" : age > WARN ? "warn" : "held"; }
  if (i === 0 || S.topics[tk(l, i - 1)]) return "open";
  return "fog";
}
const daysLeft = (l, i) => { const r = S.topics[tk(l, i)]; return r ? Math.ceil(HOLD - (now() - r.last) / DAY) : null; };
const isHeld = s => s === "held" || s === "warn";
const heldCount = l => LANGS[l].lessons.filter((_, i) => isHeld(status(l, i))).length;
const anyRec = l => LANGS[l].lessons.some((_, i) => S.topics[tk(l, i)]);
const examReady = l => heldCount(l) === LANGS[l].lessons.length;
const passed = l => !!(S.exams[LANGS[l].id] && S.exams[LANGS[l].id].passed);

function stats() {
  let held = 0, total = 0, mastered = 0, next = null; const siege = [];
  LANGS.forEach((L, l) => {
    let ok = 0;
    L.lessons.forEach((_, i) => {
      total++; const s = status(l, i);
      if (isHeld(s)) { held++; ok++; const d = daysLeft(l, i); next = next === null ? d : Math.min(next, d); }
      if (s === "siege" && !siege.includes(l)) siege.push(l);
    });
    if (ok === L.lessons.length) mastered++;
  });
  const certs = LANGS.filter((_, l) => passed(l)).length;
  return { pct: Math.round(held / total * 100), held, total, mastered, siege, next, certs };
}
function addXP(n) { S.xp += n; const k = dayKey(now()); S.days[k] = (S.days[k] || 0) + n; }
function streak() { let n = 0, t = now(); if (!S.days[dayKey(t)]) t -= DAY; while (S.days[dayKey(t)]) { n++; t -= DAY; } return n; }
const todayXP = () => S.days[dayKey(now())] || 0;

/* ---------------- achievements ---------------- */
const ACH = [
  ["first", "Первая провинция", "Пройдите первый урок", s => Object.keys(S.topics).length >= 1],
  ["capitals", "Три столицы", "Захватите первый урок в трёх странах", s => LANGS.filter((_, l) => S.topics[tk(l, 0)]).length >= 3],
  ["poly", "Полиглот", "Изучайте пять разных языков", s => LANGS.filter((_, l) => anyRec(l)).length >= 5],
  ["lang", "Покоритель", "Захватите все провинции одной страны", s => s.mastered >= 1],
  ["cert1", "Дипломированный", "Сдайте первый финальный экзамен", s => s.certs >= 1],
  ["cert3", "Магистр", "Получите три сертификата", s => s.certs >= 3],
  ["guard", "Страж границ", "Пройдите пять повторений", s => S.counts.reviews >= 5],
  ["liberator", "Освободитель", "Снимите осаду с провинции", s => S.counts.lifted >= 1],
  ["sniper", "Снайпер", "Пройдите 10 испытаний без единой ошибки", s => S.counts.perfect >= 10],
  ["s3", "Разгон", "Учитесь 3 дня подряд", (s, st) => st >= 3],
  ["s7", "Неделя в строю", "Учитесь 7 дней подряд", (s, st) => st >= 7],
  ["s30", "Железная воля", "Учитесь 30 дней подряд", (s, st) => st >= 30],
  ["xp1000", "Тысяча очков", "Наберите 1000 XP", s => S.xp >= 1000],
  ["half", "Полмира", "Достигните 50% господства", s => s.pct >= 50],
  ["emperor", "Император", "Захватите весь мир", s => s.pct >= 100],
  ["prac1", "Первая задача", "Решите задачу на Полигоне", () => practiceStats().solved >= 1],
  ["prac10", "Десять задач", "Решите 10 задач на Полигоне", () => practiceStats().solved >= 10],
  ["prac-hard", "Без страха", "Решите сложную задачу", () => practiceStats().by.hard[0] >= 1],
  ["leet", "Связь с LeetCode", "Подключите профиль LeetCode", () => !!(S.leet && S.leet.user)]
];
function checkAch() {
  const s = stats(), st = streak(), got = [];
  ACH.forEach(([id, t, , fn]) => { if (!S.ach[id] && fn(s, st)) { S.ach[id] = now(); got.push(t); } });
  got.forEach((t, k) => setTimeout(() => toast("Достижение: " + t), 900 + k * 2400));
}

/* ---------------- native bridges ---------------- */
function haptic(kind) {
  if (!NATIVE || !S.settings.haptics || !P.Haptics) return;
  try {
    if (kind === "ok") P.Haptics.notification({ type: "SUCCESS" });
    else if (kind === "no") P.Haptics.notification({ type: "ERROR" });
    else P.Haptics.impact({ style: "LIGHT" });
  } catch (e) {}
}
let AC = null;
function beep(kind) {
  if (!S.settings.sound) return;
  try {
    AC = AC || new (window.AudioContext || window.webkitAudioContext)();
    const notes = kind === "ok" ? [660, 880] : kind === "win" ? [523, 659, 784, 1047] : [220, 175];
    notes.forEach((f, i) => {
      const o = AC.createOscillator(), g = AC.createGain(), t = AC.currentTime + i * 0.09;
      o.type = kind === "no" ? "sawtooth" : "triangle"; o.frequency.value = f;
      g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(0.1, t + 0.02); g.gain.exponentialRampToValueAtTime(0.0001, t + 0.17);
      o.connect(g).connect(AC.destination); o.start(t); o.stop(t + 0.2);
    });
  } catch (e) {}
}
async function askNotify() {
  const LN = P.LocalNotifications;
  if (!NATIVE || !LN) return "web";
  try { const r = await LN.requestPermissions(); return r.display; } catch (e) { return "denied"; }
}
async function scheduleNotifications() {
  const LN = P.LocalNotifications;
  if (!NATIVE || !LN) return;
  try {
    const pend = await LN.getPending();
    if (pend.notifications.length) await LN.cancel({ notifications: pend.notifications.map(n => ({ id: n.id })) });
    if (!S.settings.remind) return;
    const perm = await LN.checkPermissions();
    if (perm.display !== "granted") return;
    const h = S.settings.hour, st = streak(), list = [];
    list.push({ id: 1, title: "AVALAND", body: st > 0 ? `Серия ${st} дн. Один урок — пять минут, и она продолжится.` : "Ваша империя ждёт. Захватите сегодня новую провинцию.", schedule: { on: { hour: h, minute: 0 }, allowWhileIdle: true } });
    const atHour = real => { const d = new Date(real); d.setHours(h, 0, 0, 0); if (d.getTime() < real) d.setDate(d.getDate() + 1); return d; };
    let warn = null, siege = null;
    LANGS.forEach((L, l) => L.lessons.forEach((_, i) => {
      const r = S.topics[tk(l, i)]; if (!r) return;
      const base = r.last - S.offset * DAY;
      const w = atHour(base + WARN * DAY), s = atHour(base + HOLD * DAY);
      if (w.getTime() > Date.now() && (!warn || w < warn.at)) warn = { at: w, land: L.land };
      if (s.getTime() > Date.now() && (!siege || s < siege.at)) siege = { at: s, land: L.land };
    }));
    if (warn) list.push({ id: 2, title: "Провинции нужна защита", body: `${warn.land}: до осады 4 дня. Пройдите повторение.`, schedule: { at: warn.at, allowWhileIdle: true } });
    if (siege) list.push({ id: 3, title: "Осада!", body: `${siege.land} в осаде. Отбейте провинции повторением.`, schedule: { at: siege.at, allowWhileIdle: true } });
    await LN.schedule({ notifications: list });
  } catch (e) {}
}
function maybeAskReview() {
  if (S.reviewAsked || S.counts.lessons < 5 || !NATIVE || !P.InAppReview) return;
  S.reviewAsked = true; save();
  setTimeout(() => { try { P.InAppReview.requestReview(); } catch (e) {} }, 1500);
}

/* ---------------- icons ---------------- */
const I = {
  map: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linejoin="round"><path d="M12 2l8.66 5v10L12 22l-8.66-5V7z"/><path d="M12 7l4.33 2.5v5L12 17l-4.33-2.5v-5z"/></svg>',
  review: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M3 12a9 9 0 0 1 15.5-6.2L21 8"/><path d="M21 3v5h-5"/><path d="M21 12a9 9 0 0 1-15.5 6.2L3 16"/><path d="M3 21v-5h5"/></svg>',
  awards: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="9" r="6"/><path d="M8.5 14L7 22l5-3 5 3-1.5-8"/></svg>',
  profile: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round"><circle cx="12" cy="8" r="4"/><path d="M4 21c1.5-4 4.5-6 8-6s6.5 2 8 6"/></svg>',
  fire: '<svg width="22" height="22" viewBox="0 0 24 24" fill="#f08a3c"><path d="M12 2c1 4 5 5.5 5 11a5 5 0 0 1-10 0c0-2.5 1.2-4 2.5-5 .2 2 1 3 2 3.5C11 9 11 5 12 2z"/></svg>',
  star: '<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 2l2.9 6.6 7.1.6-5.4 4.7 1.6 7L12 17.3 5.8 21l1.6-7L2 9.2l7.1-.6z"/></svg>',
  shield: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M12 3l8 3v6c0 5-3.5 8-8 9-4.5-1-8-4-8-9V6z"/></svg>',
  scroll: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M6 3h11v15a3 3 0 0 1-3 3H5a2 2 0 0 1-2-2v-2h11"/><path d="M9 8h5M9 12h5"/></svg>',
  check: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round" stroke-linejoin="round"><path d="M5 12.5l4.5 4.5L19 7.5"/></svg>',
  code: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><path d="M8 7l-5 5 5 5M16 7l5 5-5 5M13.5 4l-3 16"/></svg>',
  flag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linejoin="round"><path d="M5 21V4M5 4h12l-2 4 2 4H5"/></svg>'
};
const hexChip = (color, extra = "") => `<span class="hexsw" style="background:${color}" ${extra}></span>`;

/* ---------------- hex world ---------------- */
const R = 20, PAD = 14, SQ = Math.sqrt(3);
const LAYOUTS = {
  wide: { cols: 39, rows: 22, at: [[21, 11], [4, 4], [11, 4], [18, 4], [25, 4], [32, 4], [7, 11], [14, 11], [28, 11], [35, 11], [4, 18], [11, 18], [18, 18], [25, 18], [32, 18]] },
  tall: { cols: 22, rows: 36, at: [[11, 4], [4, 4], [18, 4], [4, 11], [11, 11], [18, 11], [4, 18], [11, 18], [18, 18], [4, 25], [11, 25], [18, 25], [4, 32], [11, 32], [18, 32]] }
};
const toAx = (c, r) => [c - (r - (r & 1)) / 2, r];
const toOff = (q, r) => [q + (r - (r & 1)) / 2, r];
const hdist = (a, b) => (Math.abs(a[0] - b[0]) + Math.abs(a[1] - b[1]) + Math.abs(a[0] + a[1] - b[0] - b[1])) / 2;
const px = (c, r) => [PAD + R * SQ * (c + 0.5 * (r & 1)) + R * SQ / 2, PAD + R + R * 1.5 * r];
const noise = (c, r) => { const n = Math.sin(c * 127.1 + r * 311.7) * 43758.5453; return n - Math.floor(n); };
const DIRS = [[1, 0], [1, -1], [0, -1], [-1, 0], [-1, 1], [0, 1]];
const WORLDS = {};
function world(kind) {
  if (WORLDS[kind]) return WORLDS[kind];
  const Lay = LAYOUTS[kind], cells = [], grid = {};
  const centers = Lay.at.map(([c, r]) => ({ ax: toAx(c, r), px: px(c, r) }));
  for (let r = 0; r < Lay.rows; r++) for (let c = 0; c < Lay.cols; c++) {
    const ax = toAx(c, r); let best = 99, bl = -1;
    centers.forEach((C, l) => { const d = hdist(ax, C.ax); if (d < best) { best = d; bl = l; } });
    const land = best <= 2 || (best === 3 && noise(c, r) > 0.3);
    const [x, y] = px(c, r);
    const cell = { c, r, x, y, ax, l: land ? bl : -1, p: -1 };
    if (land) {
      if (best === 0) cell.p = 0;
      else {
        const [cx, cy] = centers[bl].px;
        const a = Math.atan2(y - cy, x - cx) + Math.PI + 0.13;
        cell.p = Math.floor(((a / (2 * Math.PI)) % 1) * 8);
      }
    }
    cells.push(cell); grid[c + "," + r] = cell;
  }
  cells.forEach(cell => {
    if (cell.l < 0) {
      cell.sh = DIRS.some(([dq, dr]) => { const o = toOff(cell.ax[0] + dq, cell.ax[1] + dr); const n = grid[o[0] + "," + o[1]]; return n && n.l >= 0; });
      return;
    }
    cell.edges = [];
    DIRS.forEach(([dq, dr]) => {
      const o = toOff(cell.ax[0] + dq, cell.ax[1] + dr), n = grid[o[0] + "," + o[1]];
      const [nx, ny] = px(o[0], o[1]), ang = Math.atan2(ny - cell.y, nx - cell.x);
      const kind2 = !n || n.l !== cell.l ? "coast" : n.p !== cell.p ? "prov" : null;
      if (kind2) cell.edges.push({ kind: kind2, p1: [cell.x + R * Math.cos(ang - Math.PI / 6), cell.y + R * Math.sin(ang - Math.PI / 6)], p2: [cell.x + R * Math.cos(ang + Math.PI / 6), cell.y + R * Math.sin(ang + Math.PI / 6)] });
    });
  });
  const W = PAD * 2 + R * SQ * (Lay.cols + 0.5), H = PAD * 2 + R * 2 + R * 1.5 * (Lay.rows - 1);
  return (WORLDS[kind] = { cells, centers, W, H, kind });
}
const hexPts = (x, y, rr = R) => Array.from({ length: 6 }, (_, i) => { const a = Math.PI / 180 * (60 * i - 30); return (x + rr * Math.cos(a)).toFixed(1) + "," + (y + rr * Math.sin(a)).toFixed(1); }).join(" ");
const ln = (e, cls) => `<line class="${cls}" x1="${e.p1[0].toFixed(1)}" y1="${e.p1[1].toFixed(1)}" x2="${e.p2[0].toFixed(1)}" y2="${e.p2[1].toFixed(1)}"/>`;

function mapSVG(kind, stFn, sel = -1, interactive = true) {
  const Wd = world(kind);
  let ocean = "", land = "", over = "", lines = "", top = "", labels = "";
  Wd.cells.forEach(cell => {
    const pts = hexPts(cell.x, cell.y);
    if (cell.l < 0) { ocean += `<polygon class="oc${cell.sh ? " sh" : ""}" points="${pts}"/>`; return; }
    const L = LANGS[cell.l], st = stFn(cell.l, cell.p);
    const fill = isHeld(st) ? `style="fill:${L.color}"` : st === "open" ? `style="fill:${L.color};fill-opacity:.3"` : "";
    const cls = st === "fog" ? "fog" : st === "siege" ? "siege" : "";
    land += `<polygon class="hx ${cls}" ${fill} points="${pts}" data-l="${cell.l}"${interactive ? `><title>${esc(L.land)} · ${cell.p + 1}. ${esc(L.lessons[cell.p].t)}</title></polygon>` : "/>"}`;
    if (st === "fog" || st === "open") over += `<polygon class="hatch" points="${pts}"/>`;
    if (st === "siege") over += `<polygon class="shatch" points="${pts}"/>`;
    cell.edges.forEach(e => {
      lines += ln(e, e.kind === "coast" ? "e-coast" : "e-prov");
      if (st === "open") top += ln(e, "e-open");
      else if (st === "warn") top += ln(e, "e-warn");
      if (cell.l === sel && e.kind === "coast") top += ln(e, "e-sel");
    });
  });
  const tall = kind === "tall";
  LANGS.forEach((L, l) => {
    const [x, y] = Wd.centers[l].px;
    const known = L.lessons.some((_, i) => stFn(l, i) !== "fog");
    if (isHeld(stFn(l, 0))) labels += `<g class="crown" transform="translate(${x - 1},${y - (tall ? 46 : 40)})"><line x1="0" y1="0" x2="0" y2="18" stroke="#e8ecef" stroke-width="1.8"/><path d="M0 0 L13 4 L0 8 Z" fill="${L.color}" stroke="#0a1b29" stroke-width=".8"/></g>`;
    if (interactive && passed(l)) labels += `<polygon class="crown" points="${starPts(x + 22, y - (tall ? 38 : 32), 9)}" fill="#e2b04a" stroke="#0a1b29" stroke-width="1.2"/>`;
    if (tall) {
      labels += `<text class="lbl${known ? "" : " dim"}" x="${x}" y="${y + 9}" font-size="27" stroke-width="6">${esc(L.name)}</text>`;
      if (interactive) labels += `<text class="lbl sub" x="${x}" y="${y + 34}" font-size="18" stroke-width="5">${heldCount(l)}/${L.lessons.length}</text>`;
    } else {
      labels += `<text class="lbl${known ? "" : " dim"}" x="${x}" y="${y + 5}" font-size="18" stroke-width="5">${esc(L.land.toUpperCase())}</text>`;
      labels += `<text class="lbl sub" x="${x}" y="${y + 23}" font-size="13" stroke-width="4">${esc(L.name)} · ${heldCount(l)}/${L.lessons.length}</text>`;
    }
  });
  return { vb: `0 0 ${Wd.W.toFixed(0)} ${Wd.H.toFixed(0)}`, html: `<defs>
    <pattern id="hatch" width="6" height="6" patternUnits="userSpaceOnUse" patternTransform="rotate(45)"><line x1="0" y1="0" x2="0" y2="6" stroke="#ffffff" stroke-opacity=".07" stroke-width="2"/></pattern>
    <pattern id="shatch" width="7" height="7" patternUnits="userSpaceOnUse" patternTransform="rotate(-45)"><line x1="0" y1="0" x2="0" y2="7" stroke="#e0654f" stroke-opacity=".55" stroke-width="1.6"/></pattern>
  </defs>${ocean}${land}${over}${lines}${top}${labels}` };
}
function starPts(cx, cy, r) {
  const p = [];
  for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; p.push((cx + rr * Math.cos(a)).toFixed(1) + "," + (cy + rr * Math.sin(a)).toFixed(1)); }
  return p.join(" ");
}
const mapKind = () => (($("#mapbox") && $("#mapbox").clientWidth) || window.innerWidth) < 700 ? "tall" : "wide";

/* ---------------- header ---------------- */
function ring(pct, cls = "") {
  const C = 2 * Math.PI * 14;
  return `<svg class="ring ${cls}" width="34" height="34" viewBox="0 0 34 34" aria-hidden="true"><circle class="bg" cx="17" cy="17" r="14"/><circle class="fg" cx="17" cy="17" r="14" stroke-dasharray="${C.toFixed(1)}" stroke-dashoffset="${(C * (1 - Math.min(1, pct))).toFixed(1)}" transform="rotate(-90 17 17)"/></svg>`;
}
function renderHeader() {
  const s = stats(), st = streak(), tx = todayXP(), g = S.settings.goal;
  $("#stats").innerHTML = `
    <div class="chip" title="Дней подряд">${I.fire}<div><small>Серия</small><b>${st}</b></div></div>
    <div class="chip" title="Цель дня">${ring(tx / g, "xp")}<div><small>Сегодня</small><b>${tx}<span class="wide">/${g} XP</span></b></div></div>
    <div class="chip${s.siege.length ? " alert" : ""}">${ring(s.pct / 100)}<div><small>${s.siege.length ? "Осада" : "Господство"}</small><b>${s.siege.length ? s.siege.length + " стр." : s.pct + "%"}</b></div></div>`;
  const dueDot = s.siege.length || LANGS.some((_, l) => L_warn(l));
  $("#tabs").innerHTML = [["map", "Карта", I.map], ["practice", "Практика", I.code], ["review", "Повторение", I.review], ["awards", "Награды", I.awards], ["profile", "Профиль", I.profile]]
    .map(([id, t, ic]) => `<button class="tab" role="tab" data-act="tab" data-tab="${id}" aria-selected="${S.tab === id}">${ic}<span>${t}</span>${id === "review" && dueDot ? '<i class="dot" aria-label="нужно повторить"></i>' : ""}</button>`).join("");
}
const L_warn = l => LANGS[l].lessons.some((_, i) => ["warn", "siege"].includes(status(l, i)));

/* ---------------- views ---------------- */
function nextTarget() {
  const order = [];
  if (S.last != null && IDX[S.last] != null) order.push(IDX[S.last]);
  LANGS.forEach((_, l) => { if (!order.includes(l)) order.push(l); });
  for (const l of order) {
    if (!anyRec(l) && l !== order[0]) continue;
    const i = LANGS[l].lessons.findIndex((_, k) => status(l, k) === "open");
    if (i >= 0) return { l, i, kind: "learn" };
    if (examReady(l) && !passed(l)) return { l, kind: "exam" };
  }
  const l = order.find(k => !anyRec(k));
  return l != null ? { l, i: 0, kind: "learn" } : null;
}
function contCard() {
  const t = nextTarget(); if (!t) return "";
  const L = LANGS[t.l];
  if (t.kind === "exam") return `<div class="cont">${hexChip(L.color)}<div><small>${esc(L.name)} · все провинции захвачены</small><b>Финальный экзамен</b></div><button class="btn pri big" data-act="examIntro" data-l="${t.l}">К экзамену</button></div>`;
  const started = anyRec(t.l);
  return `<div class="cont">${hexChip(L.color)}<div><small>${started ? "Продолжить" : "Начать"} · ${esc(L.name)} · урок ${t.i + 1} из ${L.lessons.length}</small><b>${esc(L.lessons[t.i].t)}</b></div><button class="btn pri big" data-act="learn" data-l="${t.l}" data-i="${t.i}">Учить</button></div>`;
}
function atlasHTML() {
  return `<div class="ph"><div><h2>Атлас</h2><p>Страна — язык, провинция — урок. Пройдите урок и испытание, чтобы снять туман.</p></div></div>
  <div class="list">${LANGS.map((L, l) => `<button class="lrow" data-act="country" data-l="${l}">${hexChip(L.color)}<span><b>${esc(L.land)}${passed(l) ? ' <span class="pill gold">сертификат</span>' : ""}</b><small>${esc(L.name)} · ${heldCount(l)} из ${L.lessons.length}</small></span><span class="segs">${L.lessons.map((_, i) => { const c = segColor(l, i); return `<i${c ? ` style="background:${c}"` : ""}></i>`; }).join("")}</span></button>`).join("")}</div>`;
}
function segColor(l, i) { const s = status(l, i); return s === "held" ? LANGS[l].color : s === "warn" ? "var(--warn)" : s === "siege" ? "var(--danger)" : s === "open" ? "var(--gold)" : ""; }
const STXT = {
  held: (l, i) => `Захвачено · защита ${daysLeft(l, i)} дн.`,
  warn: (l, i) => `Скоро осада: осталось ${daysLeft(l, i)} дн.`,
  siege: () => "В осаде — пройдите повторение",
  open: () => "Доступно для захвата",
  fog: () => "Туман войны"
};
function countryHTML(l, inSheet = false) {
  const L = LANGS[l], held = heldCount(l), n = L.lessons.length, ex = S.exams[L.id];
  const siege = L.lessons.some((_, i) => status(l, i) === "siege");
  const rows = L.lessons.map((t, i) => {
    const s = status(l, i);
    const btn = s === "open" ? `<button class="btn pri" data-act="learn" data-l="${l}" data-i="${i}">Учить</button>` :
      s === "siege" ? `<button class="btn red" data-act="review" data-l="${l}">Отбить</button>` :
      s === "fog" ? `<button class="btn" disabled aria-label="Закрыто">Закрыто</button>` :
      `<button class="btn" data-act="learn" data-l="${l}" data-i="${i}">Открыть</button>`;
    const nStyle = s === "held" ? `style="background:${L.color}"` : s === "warn" ? `style="background:var(--warn)"` : "";
    return `<div class="trow ${s}"><span class="n" ${nStyle}>${i + 1}</span><div><b>${esc(t.t)}</b><small>${STXT[s](l, i)}</small></div>${btn}</div>`;
  }).join("");
  let exam;
  if (ex && ex.passed) exam = `<div class="box exam"><h3>${I.star.replace("<svg", '<svg width="16" height="16" style="color:var(--gold)"')} Экзамен сдан: ${ex.score} из ${ex.total}</h3><p>Сертификат № ${esc(ex.cid)} от ${new Date(ex.date).toLocaleDateString("ru-RU")}.</p><div class="row"><button class="btn pri" data-act="cert" data-l="${l}">Открыть сертификат</button></div></div>`;
  else {
    const cool = ex && ex.failAt && now() - ex.failAt < EXAM_COOLDOWN_MIN * 6e4 ? Math.ceil((EXAM_COOLDOWN_MIN * 6e4 - (now() - ex.failAt)) / 6e4) : 0;
    exam = `<div class="box exam"><h3>Финальный экзамен</h3><p>${L.exam.length} сложных заданий: вывод кода, пропуски, вопросы с подвохом. Нужно ${Math.ceil(L.exam.length * EXAM_RATE)} правильных ответов. За сдачу — сертификат с вашим именем.</p>
      <div class="row"><button class="btn pri" data-act="examIntro" data-l="${l}" ${examReady(l) && !cool ? "" : "disabled"}>${cool ? `Пересдача через ${cool} мин` : "Сдать экзамен"}</button>${examReady(l) ? "" : `<span class="note">Сначала удержите все ${n} провинций</span>`}</div></div>`;
  }
  return `${inSheet ? "" : `<button class="back" data-act="country" data-l="-1">← Атлас</button>`}
    <div class="ph">${hexChip(L.color)}<div><h2>${esc(L.land)}</h2><p>${esc(L.name)} · ${held} из ${n} провинций</p></div></div>
    <div class="bar" role="progressbar" aria-valuenow="${held}" aria-valuemin="0" aria-valuemax="${n}"><i style="width:${held / n * 100}%;background:${L.color}"></i></div>
    <p class="about">${L.about}</p>
    <div class="list">${rows}</div>
    <div class="box"><h3>Повторение</h3><p>Раз в ${HOLD} дней отвечайте на вопросы по захваченным урокам — иначе провинции попадут в осаду и перестанут считаться.</p><div class="row"><button class="btn ${siege ? "red" : ""}" data-act="review" data-l="${l}" ${anyRec(l) ? "" : "disabled"}>Повторить язык</button></div></div>
    ${exam}
    <div class="box"><h3>Проект для портфолио ${S.projects[L.id] ? '<span class="pill ok">готов</span>' : ""}</h3><p><b style="color:var(--ink)">${esc(L.project.title)}.</b> ${L.project.desc}</p><div class="row"><button class="btn" data-act="project" data-l="${l}">Требования к проекту</button></div></div>`;
}

function viewMap() {
  const sel = IDX[S.sel] != null ? IDX[S.sel] : -1;
  return `<div class="stack">${contCard()}
    <div class="main"><section class="mapbox" id="mapbox" aria-label="Карта мира"><svg id="map" role="img" aria-label="Карта стран-языков"></svg>
      <div class="legend"><span><i style="background:#6fa060"></i>Захвачено</span><span><i style="background:var(--gold)"></i>Доступно</span><span><i style="background:var(--warn)"></i>Скоро осада</span><span><i style="background:#5a5f66;outline:1px solid var(--danger)"></i>В осаде</span><span><i style="background:var(--fog-2)"></i>Туман</span></div>
    </section>
    <aside class="card panel side" aria-live="polite">${sel >= 0 ? countryHTML(sel) : atlasHTML()}</aside></div></div>`;
}
function viewReview() {
  const items = [];
  LANGS.forEach((L, l) => {
    if (!anyRec(l)) return;
    let min = Infinity;
    L.lessons.forEach((_, i) => { const d = daysLeft(l, i); if (d !== null) min = Math.min(min, d); });
    items.push({ l, min });
  });
  items.sort((a, b) => a.min - b.min);
  const anyHeld = items.length > 0, done = S.warmup === dayKey(now());
  return `<div class="grid2">
    <section class="card stack"><div><div class="eyebrow">Каждый день</div><h2 class="h-sec">Разминка дня</h2></div>
      <p class="muted" style="margin:0">5 случайных вопросов из захваченных провинций. Правильный ответ продлевает защиту темы на ${HOLD} дней.</p>
      ${done ? '<span class="pill ok">Сегодня выполнено</span>' : ""}
      <div><button class="btn pri big" data-act="warmup" ${anyHeld ? "" : "disabled"}>${done ? "Ещё раз" : "Начать разминку"}</button></div>
      ${anyHeld ? "" : '<p class="note">Захватите хотя бы одну провинцию, чтобы появились вопросы.</p>'}
    </section>
    <section class="card stack"><div><div class="eyebrow">Границы</div><h2 class="h-sec">Что пора повторить</h2></div>
      ${items.length ? `<div class="list">${items.map(({ l, min }) => {
        const L = LANGS[l], cls = min < 0 ? "siege" : min <= HOLD - WARN ? "warn" : "";
        const txt = min < 0 ? "Есть провинции в осаде" : `Ближайшая осада через ${min} дн.`;
        return `<div class="due ${cls}">${hexChip(L.color)}<div><b>${esc(L.land)}</b><small>${esc(L.name)} · ${txt}</small></div><button class="btn ${cls === "siege" ? "red" : ""}" data-act="review" data-l="${l}">Повторить</button></div>`;
      }).join("")}</div>` : '<p class="muted" style="margin:0">Пока нечего защищать. Начните с любой страны на карте.</p>'}
    </section></div>`;
}
function viewAwards() {
  const st = streak(), s = stats();
  let cal = "";
  for (let k = 27; k >= 0; k--) {
    const key = dayKey(now() - k * DAY), x = S.days[key] || 0;
    const lv = x === 0 ? "" : x < S.settings.goal / 2 ? "l1" : x < S.settings.goal ? "l2" : "l3";
    cal += `<i class="${lv}${k === 0 ? " today" : ""}" title="${key}: ${x} XP"></i>`;
  }
  const certs = LANGS.map((L, l) => passed(l) ? `<div class="cert">${hexChip(L.color)}<div><b>${esc(L.name)}</b><br><small class="muted">№ ${esc(S.exams[L.id].cid)} · ${S.exams[L.id].score}/${S.exams[L.id].total}</small></div><button class="btn" data-act="cert" data-l="${l}">Открыть</button></div>` : "").join("");
  return `<div class="grid2">
    <section class="card stack"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">Серия</div><h2 class="h-sec">${st} ${plural(st, "день", "дня", "дней")} подряд</h2></div>${I.fire.replace('width="22" height="22"', 'width="40" height="40"')}</div>
      <div class="cal" aria-label="Активность за 4 недели">${cal}</div>
      <p class="note">Всего ${S.xp} XP · цель дня ${S.settings.goal} XP</p></section>
    <section class="card stack"><div><div class="eyebrow">${s.certs} из ${LANGS.length}</div><h2 class="h-sec">Сертификаты</h2></div>
      ${certs ? `<div class="list">${certs}</div>` : '<p class="muted" style="margin:0">Захватите все провинции страны и сдайте финальный экзамен — сертификат появится здесь.</p>'}
      <button class="btn" data-act="share">Поделиться картой империи</button></section>
    <section class="card stack" style="grid-column:1/-1"><div><div class="eyebrow">${Object.keys(S.ach).length} из ${ACH.length}</div><h2 class="h-sec">Достижения</h2></div>
      <div class="ach">${ACH.map(([id, t, d]) => `<div class="${S.ach[id] ? "on" : ""}"><span class="medal">${I.star}</span><b>${t}</b><small>${d}</small></div>`).join("")}</div></section>
  </div>`;
}
function viewProfile() {
  const st = S.settings;
  const hours = Array.from({ length: 24 }, (_, h) => `<option value="${h}" ${h === st.hour ? "selected" : ""}>${String(h).padStart(2, "0")}:00</option>`).join("");
  return `<div class="grid2">
    <section class="card stack"><div><div class="eyebrow">Профиль</div><h2 class="h-sec">${esc(S.profile.empire || "Ваша империя")}</h2></div>
      <div class="field"><label for="pf-name">Имя и фамилия для сертификатов</label><input class="input" id="pf-name" value="${esc(S.profile.name)}" autocomplete="name" maxlength="60" placeholder="Например, Ада Лавлейс"></div>
      <div class="field"><label for="pf-emp">Название империи</label><input class="input" id="pf-emp" value="${esc(S.profile.empire)}" maxlength="40" placeholder="Империя кода"></div>
      <button class="btn pri" data-act="share">Поделиться картой</button></section>
    <section class="card stack"><div><div class="eyebrow">Настройки</div><h2 class="h-sec">Цели и напоминания</h2></div>
      <div class="field"><label>Цель на день</label><div class="seg" role="group" aria-label="Цель на день">${[20, 50, 100].map(g => `<button data-act="goal" data-g="${g}" aria-pressed="${st.goal === g}">${g} XP</button>`).join("")}</div></div>
      <label class="switch"><span>Напоминания и предупреждения об осаде</span><input type="checkbox" id="st-remind" ${st.remind ? "checked" : ""}></label>
      <div class="field"><label for="st-hour">Время напоминания</label><select class="input" id="st-hour">${hours}</select></div>
      <label class="switch"><span>Звуки</span><input type="checkbox" id="st-sound" ${st.sound ? "checked" : ""}></label>
      ${NATIVE ? `<label class="switch"><span>Вибрация</span><input type="checkbox" id="st-hap" ${st.haptics ? "checked" : ""}></label>` : ""}
      ${NATIVE ? "" : '<p class="note">Напоминания приходят в приложении для iPhone.</p>'}</section>
    <section class="card stack"><div><div class="eyebrow">О приложении</div><h2 class="h-sec">AVALAND ${VERSION}</h2></div>
      <p class="muted" style="margin:0">${LANGS.length} стран, ${LANGS.reduce((a, L) => a + L.lessons.length, 0)} уроков, ${LANGS.reduce((a, L) => a + L.lessons.reduce((b, x) => b + x.q.length, 0) + L.exam.length, 0)} заданий и ${(window.AVA_PRACTICE || []).length} задач с запуском кода. Работает без интернета, прогресс хранится только на этом устройстве.</p>
      <div class="row">${APP_STORE_ID ? `<a class="btn" href="itms-apps://apps.apple.com/app/id${APP_STORE_ID}?action=write-review">Оценить приложение</a>` : ""}<button class="btn" data-act="privacy">Политика конфиденциальности</button></div>
      <div id="rst"><button class="btn red" data-act="reset">Сбросить прогресс</button></div></section>
    ${DEV ? `<section class="card stack"><div><div class="eyebrow">Для проверки механики</div><h2 class="h-sec">Машина времени</h2></div>
      <div class="row"><button class="btn" data-act="sim" data-v="7">+7 дней</button><button class="btn" data-act="sim" data-v="0">Сегодня</button><button class="btn" data-act="sim" data-v="demo">Пример прогресса</button></div>
      <p class="note">${S.offset ? `Сдвиг: +${S.offset} дн. ` : ""}В сборке для App Store этого блока нет.</p></section>` : ""}
  </div>`;
}
function plural(n, a, b, c) { const m10 = n % 10, m100 = n % 100; return m10 === 1 && m100 !== 11 ? a : m10 >= 2 && m10 <= 4 && (m100 < 10 || m100 >= 20) ? b : c; }

let lastKind = null;
function render() {
  renderHeader();
  const v = $("#view");
  v.innerHTML = S.tab === "practice" ? viewPractice() : S.tab === "review" ? viewReview() : S.tab === "awards" ? viewAwards() : S.tab === "profile" ? viewProfile() : viewMap();
  if (S.tab === "map") drawMap();
}
function drawMap() {
  const svg = $("#map"); if (!svg) return;
  const kind = mapKind(); lastKind = kind;
  const sel = IDX[S.sel] != null ? IDX[S.sel] : -1;
  const m = mapSVG(kind, status, sel);
  svg.setAttribute("viewBox", m.vb); svg.innerHTML = m.html;
}
let rz;
window.addEventListener("resize", () => { clearTimeout(rz); rz = setTimeout(() => { if (S.tab === "map" && mapKind() !== lastKind) drawMap(); }, 150); });

/* ---------------- modal ---------------- */
const ov = $("#ov"), dlg = $("#dlg");
let Q = null, lastFocus = null;
function shell(color, eyebrow, title, body) {
  dlg.innerHTML = `<div class="dh">${color ? hexChip(color) : ""}<div><small>${eyebrow}</small><h2 id="dt">${title}</h2></div><button class="x" data-close aria-label="Закрыть">×</button></div><div class="db">${body}</div>`;
  dlg.setAttribute("aria-labelledby", "dt");
}
function openOv(focusSel) {
  if (ov.hidden) { lastFocus = document.activeElement; ov.hidden = false; document.body.style.overflow = "hidden"; }
  ov.scrollTop = 0;
  const f = (focusSel && dlg.querySelector(focusSel)) || dlg.querySelector(".db .btn.pri:not(:disabled)") || dlg.querySelector("[data-close]");
  if (f) f.focus({ preventScroll: true });
}
function closeOv() {
  ov.hidden = true; Q = null; document.body.style.overflow = "";
  render();
  if (lastFocus && document.contains(lastFocus)) lastFocus.focus({ preventScroll: true });
}
ov.addEventListener("click", e => { if (e.target === ov || e.target.closest("[data-close]")) closeOv(); });
document.addEventListener("keydown", e => { if (e.key === "Escape" && !ov.hidden) closeOv(); });

/* code highlighting */
const KW = new Set("def class return if elif else for while in import from let const var function async await try catch except finally public private protected static void new int long double float bool boolean string String char func struct protocol package go chan make end do then true false True False None nil null this self using throw throws raise fn mut impl trait enum match pub use mod val when is object data sealed interface extends implements override abstract final record namespace switch case break continue default yield lambda with as select where group by order join on SELECT FROM WHERE GROUP BY ORDER JOIN LEFT ON AND OR NOT NULL INSERT INTO VALUES UPDATE SET DELETE CREATE TABLE INDEX PRIMARY KEY REFERENCES WITH AS HAVING LIMIT BEGIN COMMIT ROLLBACK DISTINCT OVER PARTITION CHECK UNIQUE DEFAULT IS IN EXISTS BETWEEN LIKE guard some any defer type typeof keyof readonly unless module include attr_reader attr_accessor required late factory mixin dynamic auto template typename constexpr nullptr virtual explicit operator unsafe loop where Self super".split(" "));
function hl(code, lang) {
  const hash = ["py", "rb", "base"].includes(lang), slash = !["py", "rb", "sql", "base"].includes(lang);
  const parts = [];
  if (slash) parts.push(String.raw`\/\*[\s\S]*?\*\/`, String.raw`\/\/[^\n]*`);
  if (hash) parts.push(String.raw`(?:^|[ \t])#(?!\{)[^\n]*`);
  if (lang === "sql") parts.push(String.raw`(?:^|[ \t])--[^\n]*`);
  parts.push(String.raw`"(?:[^"\\\n]|\\.)*"`, "\x60[^\x60]*\x60");
  if (lang !== "rs") parts.push(String.raw`'(?:[^'\\\n]|\\.)*'`);
  const re = new RegExp("(" + parts.join("|") + ")", "gm");
  const out = []; let last = 0, m;
  while ((m = re.exec(code))) {
    out.push(plain(code.slice(last, m.index)));
    const t = m[0];
    out.push(`<span class="${/^\s*(\/\/|\/\*|#|--)/.test(t) ? "c" : "s"}">${esc(t)}</span>`);
    last = m.index + t.length;
  }
  out.push(plain(code.slice(last)));
  return out.join("");
  function plain(s) { return esc(s).replace(/\b([A-Za-z_][A-Za-z0-9_]*)\b|\b(\d[\d_.]*)\b/g, (w, id, num) => id ? (KW.has(id) ? `<span class="k">${id}</span>` : id) : `<span class="n">${num}</span>`); }
}
const codeBlock = (code, lang, copy = true) => `<div class="codewrap"><pre class="code"><code>${hl(code, lang)}</code></pre>${copy ? '<button class="copy" data-act="copy">Копировать</button>' : ""}</div>`;

/* lessons */
function openLesson(l, i) {
  const L = LANGS[l], t = L.lessons[i], s = status(l, i);
  S.last = L.id; save();
  shell(L.color, `${esc(L.name)} · урок ${i + 1} из ${L.lessons.length}`, esc(t.t),
    `${t.body.map(p => `<p class="txt">${p}</p>`).join("")}
     ${codeBlock(t.code, L.id)}
     ${t.tips.length ? `<p class="tips-h">Запомните</p><ul class="tips">${t.tips.map(x => `<li>${x}</li>`).join("")}</ul>` : ""}
     <div class="acts"><button class="btn pri big" data-act="startLesson" data-l="${l}" data-i="${i}">${s === "open" ? `К испытанию · ${t.q.length} вопроса` : "Пройти испытание снова"}</button></div>`);
  openOv();
}
function openProject(l) {
  const L = LANGS[l], done = !!S.projects[L.id];
  shell(L.color, `${esc(L.name)} · проект для портфолио`, esc(L.project.title),
    `<p class="txt">${L.project.desc}</p>
     <p class="tips-h">Требования</p><ul class="tips">${L.project.req.map(r => `<li>${r}</li>`).join("")}</ul>
     <p class="note">Работодатели смотрят на законченные проекты на GitHub. Выложите код, README и скриншоты, а ссылку добавьте в резюме.</p>
     <div class="acts"><button class="btn ${done ? "" : "pri"} big" data-act="projectDone" data-l="${l}">${done ? "Отметить как не готовый" : "Я сделал проект"}</button></div>`);
  openOv();
}

/* quiz engine */
function shuffle(a) { a = a.slice(); for (let i = a.length - 1; i > 0; i--) { const j = Math.floor(Math.random() * (i + 1)); [a[i], a[j]] = [a[j], a[i]]; } return a; }
const norm = s => String(s).toLowerCase().replace(/\s+/g, "").replace(/[“”«»"]/g, "'").replace(/;$/, "");
function startQuiz(cfg) {
  Q = Object.assign({ k: 0, res: [], xp: 0 }, cfg);
  Q.qs = Q.qs.map(x => ({ ...x, opts: x.q.t === "mc" ? shuffle(x.q.o.map((t, j) => ({ t, ok: j === x.q.a }))) : null }));
  showQ();
}
const KIND = { mc: "Выберите ответ", out: "Что выведет код? Впишите вывод", fill: "Впишите пропущенное" };
function quizTitle() {
  const L = LANGS[Q.l];
  return Q.mode === "lesson" ? esc(L.lessons[Q.i].t) : Q.mode === "exam" ? "Финальный экзамен" : Q.mode === "warmup" ? "Разминка дня" : `Удержать: ${esc(L.land)}`;
}
function showQ() {
  const x = Q.qs[Q.k], L = LANGS[x.l];
  const pips = Q.qs.map((_, j) => `<i class="${j < Q.res.length ? (Q.res[j] ? "ok" : "no") : j === Q.k ? "cur" : ""}"></i>`).join("");
  const body = x.q.t === "mc"
    ? `<div class="opts">${x.opts.map((o, j) => `<button class="opt" data-act="pick" data-o="${j}">${o.t}</button>`).join("")}</div>`
    : `<form class="answer" data-act="text" autocomplete="off"><input class="input" id="ans" aria-label="Ваш ответ" autocapitalize="off" autocorrect="off" spellcheck="false" enterkeyhint="done" placeholder="${x.q.t === "out" ? "Вывод программы" : "Пропущенный фрагмент"}"><button class="btn pri" type="submit">Проверить</button></form>`;
  shell(Q.mode === "warmup" ? L.color : LANGS[Q.l].color, `${esc(L.name)} · ${Q.mode === "exam" ? "экзамен" : Q.mode === "lesson" ? "испытание" : "повторение"}`, quizTitle(),
    `<div class="qhead"><span>Вопрос ${Q.k + 1} из ${Q.qs.length}${Q.mode !== "lesson" && Q.mode !== "exam" ? " · " + esc(L.lessons[x.i].t) : ""}</span><span class="pips">${pips}</span></div>
     <div class="kind">${KIND[x.q.t]}</div>
     <p class="q">${x.q.q}</p>
     ${x.q.c ? codeBlock(x.q.c, L.id, false) : ""}
     ${body}<div id="after"></div>`);
  openOv(x.q.t === "mc" ? ".opt" : "#ans");
}
function judge(ok, extra) {
  const x = Q.qs[Q.k];
  Q.res.push(ok);
  if (ok) { Q.xp += Q.mode === "exam" ? 15 : 10; beep("ok"); haptic("ok"); } else { beep("no"); haptic("no"); }
  if (Q.mode === "warmup" && ok) { const r = S.topics[tk(x.l, x.i)]; if (r) r.last = now(); }
  const last = Q.k === Q.qs.length - 1;
  $("#after").innerHTML = `<p class="exp"><b style="color:${ok ? "var(--ok)" : "var(--danger)"}">${ok ? "Верно." : "Неверно."}</b> ${x.q.e}${extra || ""}</p>
    <div class="acts" style="margin-top:12px"><button class="btn pri big" id="nx" data-act="next">${last ? "Итоги" : "Дальше"}</button></div>`;
  $("#nx").focus({ preventScroll: true });
  $("#nx").scrollIntoView({ block: "nearest", behavior: "smooth" });
}
function pick(j) {
  const x = Q.qs[Q.k];
  if (Q.res.length > Q.k) return;
  dlg.querySelectorAll(".opt").forEach((b, n) => { b.disabled = true; if (x.opts[n].ok) b.classList.add("ok"); else if (n === j) b.classList.add("no"); });
  judge(x.opts[j].ok);
}
function submitText() {
  const x = Q.qs[Q.k], inp = $("#ans");
  if (Q.res.length > Q.k || !inp.value.trim()) return;
  const ok = x.q.ans.some(a => norm(a) === norm(inp.value));
  inp.classList.add(ok ? "ok" : "no"); inp.readOnly = true;
  const btn = inp.parentElement.querySelector("button"); if (btn) btn.disabled = true;
  judge(ok, ok ? "" : `<span class="right">Правильно: ${esc(x.q.ans[0])}</span>`);
}
function next() { if (Q.k === Q.qs.length - 1) finish(); else { Q.k++; showQ(); } }

function finish() {
  const right = Q.res.filter(Boolean).length, total = Q.qs.length;
  const L = LANGS[Q.l], perfect = right === total;
  let win, msg, need, title, eyebrow = "", extraBtn = "";
  const st0 = streak();
  if (Q.mode === "lesson") {
    need = Math.min(LESSON_PASS, total); win = right >= need;
    if (win) {
      const key = tk(Q.l, Q.i), was = S.topics[key];
      const wasSiege = status(Q.l, Q.i) === "siege";
      S.topics[key] = { last: now() };
      if (!was) { Q.xp += 20; S.counts.lessons++; }
      if (wasSiege) S.counts.lifted++;
      if (perfect) S.counts.perfect++;
      msg = was ? "Провинция укреплена, защита продлена на 14 дней." : Q.i === 0 ? "Столица захвачена! Над страной поднят флаг." : "Новая провинция ваша.";
      if (Q.i + 1 < L.lessons.length && status(Q.l, Q.i + 1) === "open") extraBtn = `<button class="btn pri big" data-act="learn" data-l="${Q.l}" data-i="${Q.i + 1}">Следующий урок</button>`;
      else if (examReady(Q.l) && !passed(Q.l)) extraBtn = `<button class="btn pri big" data-act="examIntro" data-l="${Q.l}">К финальному экзамену</button>`;
    } else msg = `Нужно хотя бы ${need} из ${total}. Перечитайте урок — ответы на все вопросы в нём есть.`;
    title = win ? "Победа" : "Отступление"; eyebrow = `${esc(L.name)} · испытание`;
  } else if (Q.mode === "review") {
    need = Math.round(total * 0.7); win = right >= need;
    if (win) {
      let lifted = false;
      L.lessons.forEach((_, i) => { const r = S.topics[tk(Q.l, i)]; if (r) { if (status(Q.l, i) === "siege") lifted = true; r.last = now(); } });
      if (lifted) S.counts.lifted++;
      S.counts.reviews++; Q.xp += 15;
      msg = `${esc(L.land)} под защитой ещё ${HOLD} дней.`;
    } else msg = `Нужно ${need} из ${total}. Перечитайте уроки, где были ошибки.`;
    title = win ? "Позиции удержаны" : "Оборона прорвана"; eyebrow = `${esc(L.name)} · повторение`;
  } else if (Q.mode === "warmup") {
    win = right > 0; need = 1;
    S.warmup = dayKey(now()); S.counts.reviews += right >= 4 ? 1 : 0;
    msg = right ? `${right} ${plural(right, "тема", "темы", "тем")} получили защиту ещё на ${HOLD} дней.` : "Ни одного верного ответа — загляните в уроки и попробуйте снова.";
    title = "Разминка завершена"; eyebrow = "повторение";
  } else {
    need = Math.ceil(total * EXAM_RATE); win = right >= need;
    const id = L.id;
    if (win) {
      const date = now();
      S.exams[id] = { passed: true, date, score: right, total, cid: certId(id, S.profile.name, date) };
      Q.xp += 100;
      msg = "Экзамен сдан. Сертификат выписан на ваше имя.";
      extraBtn = `<button class="btn pri big" data-act="cert" data-l="${Q.l}">Открыть сертификат</button>`;
    } else {
      S.exams[id] = { passed: false, failAt: now(), score: right, total };
      msg = `Нужно ${need} из ${total}. Пересдача через ${EXAM_COOLDOWN_MIN} минут — повторите уроки с ошибками.`;
    }
    title = win ? "Экзамен сдан" : "Экзамен не сдан"; eyebrow = `${esc(L.name)} · финальный экзамен`;
  }
  addXP(Q.xp);
  const st1 = streak();
  checkAch(); save();
  if (win) { beep("win"); haptic("ok"); }
  const cfg = { mode: Q.mode, l: Q.l, i: Q.i };
  shell(Q.mode === "warmup" ? "" : L.color, eyebrow, title,
    `<div class="res"><div class="big" style="color:${win ? "var(--gold)" : "var(--danger)"}">${right} / ${total}</div>
      <div class="xp-gain">+${Q.xp} XP${st1 > st0 ? ` · серия ${st1} ${plural(st1, "день", "дня", "дней")}` : ""}</div><p>${msg}</p></div>
     <div class="acts">${win ? "" : `<button class="btn big" data-act="retry">${Q.mode === "exam" ? "К урокам" : "Ещё раз"}</button>`}${extraBtn || `<button class="btn pri big" data-close>На карту</button>`}</div>`);
  Q.retry = cfg;
  if (win && Q.mode !== "warmup") toast(Q.mode === "lesson" ? "Территория расширена" : Q.mode === "exam" ? "Сертификат получен" : "Позиции удержаны");
  openOv();
  if (Q.mode === "lesson" && win) maybeAskReview();
}
function retry() {
  const c = Q && Q.retry; if (!c) return;
  if (c.mode === "lesson") openLesson(c.l, c.i);
  else if (c.mode === "review") openReview(c.l);
  else if (c.mode === "warmup") openWarmup();
  else { closeOv(); openCountry(c.l); }
}
function openReview(l) {
  const L = LANGS[l]; let pool = [];
  L.lessons.forEach((t, i) => { if (S.topics[tk(l, i)]) t.q.forEach(q => pool.push({ q, l, i })); });
  pool = shuffle(pool).slice(0, 6);
  startQuiz({ mode: "review", l, qs: pool });
}
function openWarmup() {
  let pool = [];
  LANGS.forEach((L, l) => L.lessons.forEach((t, i) => { if (S.topics[tk(l, i)]) t.q.forEach(q => pool.push({ q, l, i })); }));
  if (!pool.length) return;
  pool = shuffle(pool).slice(0, 5);
  startQuiz({ mode: "warmup", l: pool[0].l, qs: pool });
}
function openExamIntro(l) {
  const L = LANGS[l];
  shell(L.color, `${esc(L.name)} · финальный экзамен`, "Перед началом",
    `<p class="txt">${L.exam.length} заданий без подсказок: что выведет код, что пропущено, вопросы с подвохом. Для сдачи нужно ${Math.ceil(L.exam.length * EXAM_RATE)} правильных ответов. После неудачи пересдача через ${EXAM_COOLDOWN_MIN} минут.</p>
     <div class="field"><label for="ex-name">Имя для сертификата</label><input class="input" id="ex-name" value="${esc(S.profile.name)}" maxlength="60" autocomplete="name" placeholder="Имя и фамилия"></div>
     <p class="note" id="ex-err" hidden style="color:var(--danger)">Укажите имя — оно будет напечатано в сертификате.</p>
     <div class="acts"><button class="btn pri big" data-act="startExam" data-l="${l}">Начать экзамен</button></div>`);
  openOv("#ex-name");
}
function startExam(l) {
  const name = ($("#ex-name").value || "").trim();
  if (name.length < 2) { $("#ex-err").hidden = false; $("#ex-name").focus(); return; }
  S.profile.name = name; save();
  const L = LANGS[l];
  startQuiz({ mode: "exam", l, qs: shuffle(L.exam).map(q => ({ q, l, i: 0 })) });
}
function certId(id, name, date) {
  let h = 2166136261; const s = id + "|" + name + "|" + date;
  for (let i = 0; i < s.length; i++) { h ^= s.charCodeAt(i); h = Math.imul(h, 16777619); }
  return `AVA-${id.toUpperCase()}-${(h >>> 0).toString(36).toUpperCase().padStart(7, "0").slice(0, 7)}`;
}

/* ---------------- canvases: certificate & share ---------------- */
async function fontsReady() { try { await document.fonts.ready; await Promise.all(['22px "Russo One"', '22px "Golos Text"', '600 22px "Golos Text"'].map(f => document.fonts.load(f, "АБВabc"))); } catch (e) {} }
function hexPath(ctx, x, y, r) { ctx.beginPath(); for (let i = 0; i < 6; i++) { const a = Math.PI / 180 * (60 * i - 30); ctx.lineTo(x + r * Math.cos(a), y + r * Math.sin(a)); } ctx.closePath(); }
function wrapText(ctx, text, x, y, maxW, lh) {
  const words = text.split(" "); let line = "", yy = y;
  words.forEach(w => { const t = line ? line + " " + w : w; if (ctx.measureText(t).width > maxW && line) { ctx.fillText(line, x, yy); line = w; yy += lh; } else line = t; });
  if (line) ctx.fillText(line, x, yy);
  return yy;
}
async function certCanvas(l) {
  await fontsReady();
  const L = LANGS[l], ex = S.exams[L.id];
  const c = document.createElement("canvas"); c.width = 1600; c.height = 1131;
  const g = c.getContext("2d");
  const grd = g.createLinearGradient(0, 0, 1600, 1131); grd.addColorStop(0, "#0e2335"); grd.addColorStop(1, "#0a1b29");
  g.fillStyle = grd; g.fillRect(0, 0, 1600, 1131);
  g.globalAlpha = 0.08; g.strokeStyle = "#e2b04a"; g.lineWidth = 1;
  for (let r = 0; r < 26; r++) for (let q = 0; q < 34; q++) { hexPath(g, q * 52 + (r % 2) * 26, r * 45, 28); g.stroke(); }
  g.globalAlpha = 1;
  g.strokeStyle = "#e2b04a"; g.lineWidth = 4; g.strokeRect(50, 50, 1500, 1031);
  g.lineWidth = 1.5; g.strokeRect(66, 66, 1468, 999);
  g.textAlign = "center"; g.fillStyle = "#e2b04a";
  g.font = '34px "Russo One", sans-serif'; g.fillText("AVALAND", 800, 160);
  hexPath(g, 800, 238, 46); g.fillStyle = L.color; g.fill();
  g.fillStyle = "#e8ecef"; g.font = '78px "Russo One", sans-serif'; g.fillText("СЕРТИФИКАТ", 800, 380);
  g.fillStyle = "#93a6b5"; g.font = '30px "Golos Text", sans-serif'; g.fillText("подтверждает, что", 800, 450);
  g.fillStyle = "#e2b04a"; g.font = '64px "Russo One", sans-serif'; g.fillText(S.profile.name || "Студент AVALAND", 800, 545);
  g.fillStyle = "#e8ecef"; g.font = '34px "Golos Text", sans-serif';
  g.fillText(`успешно завершил(а) курс «${L.name}»`, 800, 625);
  g.fillStyle = "#93a6b5"; g.font = '27px "Golos Text", sans-serif';
  g.fillText(`${L.lessons.length} уроков, финальный экзамен: ${ex.score} из ${ex.total} (${Math.round(ex.score / ex.total * 100)}%)`, 800, 680);
  g.font = '23px "Golos Text", sans-serif';
  wrapText(g, "Темы: " + L.lessons.map(x => x.t).join(" · "), 800, 740, 1250, 34);
  g.textAlign = "left"; g.fillStyle = "#93a6b5"; g.font = '24px "Golos Text", sans-serif';
  g.fillText("Дата выдачи", 160, 950); g.fillText("Номер сертификата", 1040, 950);
  g.fillStyle = "#e8ecef"; g.font = '600 30px "Golos Text", sans-serif';
  g.fillText(new Date(ex.date).toLocaleDateString("ru-RU", { day: "numeric", month: "long", year: "numeric" }), 160, 992);
  g.fillText(ex.cid, 1040, 992);
  g.textAlign = "center"; g.fillStyle = "#6b8193"; g.font = '19px "Golos Text", sans-serif';
  g.fillText("Сертификат подтверждает прохождение учебного курса в приложении AVALAND", 800, 1040);
  return c;
}
async function shareCanvas() {
  await fontsReady();
  const c = document.createElement("canvas"); c.width = 1080; c.height = 1350;
  const g = c.getContext("2d"), s = stats();
  g.fillStyle = "#0a1b29"; g.fillRect(0, 0, 1080, 1350);
  const Wd = world("wide"), sc = 1000 / Wd.W, ox = 40, oy = 330;
  Wd.cells.forEach(cell => {
    const x = ox + cell.x * sc, y = oy + cell.y * sc;
    hexPath(g, x, y, R * sc + 0.4);
    if (cell.l < 0) { g.fillStyle = cell.sh ? "#14354a" : "#0e2335"; g.fill(); return; }
    const st = status(cell.l, cell.p), L = LANGS[cell.l];
    g.fillStyle = isHeld(st) ? L.color : st === "siege" ? "#5a5f66" : st === "open" ? L.color + "55" : "#243140";
    g.fill(); g.strokeStyle = "rgba(0,0,0,.3)"; g.lineWidth = 1; g.stroke();
  });
  g.textAlign = "left"; g.fillStyle = "#e2b04a"; g.font = '44px "Russo One", sans-serif'; g.fillText("AVALAND", 60, 110);
  g.fillStyle = "#e8ecef"; g.font = '58px "Russo One", sans-serif';
  g.fillText(S.profile.empire || (S.profile.name ? "Империя " + S.profile.name.split(" ")[0] : "Моя империя кода"), 60, 200);
  g.fillStyle = "#93a6b5"; g.font = '30px "Golos Text", sans-serif'; g.fillText("Мировое господство в программировании", 60, 258);
  const yb = oy + Wd.H * sc + 70;
  g.fillStyle = "#e2b04a"; g.font = '120px "Russo One", sans-serif'; g.fillText(s.pct + "%", 60, yb + 60);
  const col = (x, n, t) => { g.fillStyle = "#e8ecef"; g.font = '56px "Russo One", sans-serif'; g.fillText(String(n), x, yb + 20); g.fillStyle = "#93a6b5"; g.font = '26px "Golos Text", sans-serif'; g.fillText(t, x, yb + 60); };
  const sk = streak(); col(480, sk, plural(sk, "день подряд", "дня подряд", "дней подряд")); col(700, s.held, plural(s.held, "урок", "урока", "уроков")); col(880, s.certs, "сертиф.");
  g.fillStyle = "#93a6b5"; g.font = '28px "Golos Text", sans-serif'; g.fillText("Захвати мир кода — AVALAND", 60, 1290);
  return c;
}
async function shareImage(canvas, name, text) {
  const data = canvas.toDataURL("image/png");
  if (NATIVE && P.Share && P.Filesystem) {
    try {
      const f = await P.Filesystem.writeFile({ path: name, data: data.split(",")[1], directory: "CACHE" });
      await P.Share.share({ title: "AVALAND", text, files: [f.uri] });
      return;
    } catch (e) { if (String(e && e.message).match(/cancel/i)) return; }
  }
  shell("", "Поделиться", "Картинка готова", `<img class="imgout" src="${data}" alt="${esc(text)}"><p class="note">Нажмите на изображение и удерживайте, чтобы сохранить его или отправить.</p>`);
  openOv();
}
async function openCert(l) {
  const L = LANGS[l], c = await certCanvas(l), data = c.toDataURL("image/png");
  shell(L.color, `${esc(L.name)} · сертификат`, `№ ${esc(S.exams[L.id].cid)}`,
    `<img class="imgout" src="${data}" alt="Сертификат AVALAND по курсу ${esc(L.name)}">
     <p class="note">Добавьте сертификат в резюме вместе со ссылкой на проект для портфолио — так он весит больше.</p>
     <div class="acts"><button class="btn" data-act="project" data-l="${l}">Проект для портфолио</button><button class="btn pri big" data-act="shareCert" data-l="${l}">Поделиться</button></div>`);
  openOv();
}
function openPrivacy() {
  shell("", "AVALAND", "Политика конфиденциальности",
    `<p class="txt">AVALAND не собирает и не передаёт персональные данные. Прогресс, имя для сертификата и настройки хранятся только на вашем устройстве и удаляются вместе с приложением или кнопкой «Сбросить прогресс».</p>
     <p class="txt">Приложение не использует рекламу, аналитику и трекинг, не требует регистрации и работает без интернета. Уведомления создаются на устройстве и не проходят через наши серверы.</p>
     <p class="txt">Если вы делитесь картинкой или сертификатом, вы сами выбираете, куда их отправить.</p>
     <p class="txt">Если вы подключите профиль LeetCode, приложение отправит ваш никнейм на leetcode.com, чтобы получить публичную статистику решённых задач. Пароль не нужен и не запрашивается. Отключить связь можно на вкладке «Практика».</p>
     <p class="note">Обновлено: 14 октября 2026.</p>`);
  openOv();
}
function openCountry(l) {
  if (l < 0) { S.sel = null; save(); render(); return; }
  S.sel = LANGS[l].id; save();
  if (window.innerWidth <= 960) {
    shell(LANGS[l].color, esc(LANGS[l].name), esc(LANGS[l].land), `<div class="panel">${countryHTML(l, true)}</div>`);
    openOv();
    if (S.tab === "map") drawMap();
  } else { if (!ov.hidden) closeOv(); S.tab = "map"; render(); }
}

/* ---------------- events ---------------- */
document.addEventListener("click", async e => {
  const hx = e.target.closest && e.target.closest(".hx");
  if (hx && hx.closest("#map")) { haptic("tap"); openCountry(+hx.dataset.l); return; }
  const b = e.target.closest("[data-act]"); if (!b || b.tagName === "FORM") return;
  const a = b.dataset.act, l = b.dataset.l != null ? +b.dataset.l : null;
  switch (a) {
    case "tab": S.tab = b.dataset.tab; save(); if (!ov.hidden) closeOv(); render(); window.scrollTo({ top: 0 }); break;
    case "country": openCountry(l); break;
    case "learn": openLesson(l, +b.dataset.i); break;
    case "startLesson": { const L = LANGS[l], i = +b.dataset.i; startQuiz({ mode: "lesson", l, i, qs: shuffle(L.lessons[i].q).map(q => ({ q, l, i })) }); break; }
    case "review": openReview(l); break;
    case "warmup": openWarmup(); break;
    case "examIntro": openExamIntro(l); break;
    case "startExam": startExam(l); break;
    case "cert": openCert(l); break;
    case "shareCert": shareImage(await certCanvas(l), "avaland-certificate.png", `Мой сертификат AVALAND по ${LANGS[l].name}`); break;
    case "share": shareImage(await shareCanvas(), "avaland-map.png", `Моя империя в AVALAND: ${stats().pct}% мира кода`); break;
    case "project": openProject(l); break;
    case "projectDone": { const id = LANGS[l].id; S.projects[id] = !S.projects[id]; save(); openProject(l); break; }
    case "pick": pick(+b.dataset.o); break;
    case "next": next(); break;
    case "retry": retry(); break;
    case "privacy": openPrivacy(); break;
    case "copy": {
      const code = b.parentElement.querySelector("code").innerText;
      try { await navigator.clipboard.writeText(code); b.textContent = "Скопировано"; }
      catch (err) { const r = document.createRange(); r.selectNodeContents(b.parentElement.querySelector("code")); const sel = getSelection(); sel.removeAllRanges(); sel.addRange(r); b.textContent = "Выделено"; }
      setTimeout(() => { b.textContent = "Копировать"; }, 1600); break;
    }
    case "goal": S.settings.goal = +b.dataset.g; save(); render(); break;
    case "reset": $("#rst").innerHTML = '<div class="row"><button class="btn red" data-act="reset2">Да, стереть весь прогресс</button><button class="btn" data-act="keep">Отмена</button></div>'; break;
    case "reset2": { const keep = S.settings; S = fresh(); S.settings = keep; S.onboarded = true; save(); toast("Прогресс сброшен"); render(); break; }
    case "keep": render(); break;
    case "sim": {
      const v = b.dataset.v;
      if (v === "7") S.offset += 7; else if (v === "0") S.offset = 0;
      else if (v === "demo") { S.topics = demoTopics(); S.offset = 0; addXP(0); }
      save(); render(); toast(v === "7" ? "Прошла неделя" : v === "0" ? "Вернулись в сегодня" : "Загружен пример прогресса"); break;
    }
    case "onb": onbStep(+b.dataset.step); break;
    case "onbLang": S.sel = b.dataset.id; save(); document.querySelectorAll(".lchip").forEach(x => x.setAttribute("aria-pressed", x.dataset.id === S.sel)); break;
    case "onbGoal": S.settings.goal = +b.dataset.g; document.querySelectorAll("[data-act=onbGoal]").forEach(x => x.setAttribute("aria-pressed", x === b)); break;
    case "onbDone": onbDone(); break;
    default: practiceAction(a, b);
  }
});
document.addEventListener("submit", e => { if (e.target.matches("form[data-act=text]")) { e.preventDefault(); submitText(); } });
document.addEventListener("change", async e => {
  const t = e.target;
  if (t.id === "pf-name") S.profile.name = t.value.trim();
  else if (t.id === "pf-emp") S.profile.empire = t.value.trim();
  else if (t.id === "st-sound") S.settings.sound = t.checked;
  else if (t.id === "st-hap") S.settings.haptics = t.checked;
  else if (t.id === "st-hour") S.settings.hour = +t.value;
  else if (t.id === "st-remind") {
    S.settings.remind = t.checked;
    if (t.checked && NATIVE) { const r = await askNotify(); if (r !== "granted") toast("Разрешите уведомления в настройках iPhone"); }
  } else return;
  save();
  if (t.id === "pf-emp") render();
});
function demoTopics() {
  const t = now(), o = {};
  for (let i = 0; i < 8; i++) o["py-" + i] = { last: t - 2 * DAY };
  for (let i = 0; i < 5; i++) o["js-" + i] = { last: t - (i < 2 ? 12 : 3) * DAY };
  o["sql-0"] = { last: t - 16 * DAY }; o["sql-1"] = { last: t - 15 * DAY };
  for (let i = 0; i < 3; i++) o["base-" + i] = { last: t - DAY };
  o["go-0"] = { last: t - DAY };
  return o;
}

let tt;
function toast(m) { const t = $("#toast"); t.textContent = m; t.classList.add("on"); clearTimeout(tt); tt = setTimeout(() => t.classList.remove("on"), 2200); }

/* ---------------- onboarding ---------------- */
function onbStep(n) {
  const o = $("#onb"); o.hidden = false;
  const steps = `<div class="steps">${[0, 1, 2].map(k => `<i class="${k <= n ? "on" : ""}"></i>`).join("")}</div>`;
  let body;
  if (n === 0) {
    const demo = demoTopics(), stFn = (l, i) => { const r = demo[tk(l, i)]; if (r) { const age = (Date.now() - r.last) / DAY; return age > HOLD ? "siege" : age > WARN ? "warn" : "held"; } return i === 0 || demo[tk(l, i - 1)] ? "open" : "fog"; };
    const m = mapSVG("wide", stFn, -1, false);
    body = `${steps}<h1>Захвати <span>мир кода</span></h1>
      <svg class="mini" viewBox="${m.vb}" aria-hidden="true">${m.html}</svg>
      <div class="feat">${hexChip("#6fa060", "")}<div><b>${LANGS.length} стран-языков</b><span>Python, JavaScript, SQL, Java, Kotlin, Swift и другие. ${LANGS.reduce((a, L) => a + L.lessons.length, 0)} уроков с примерами кода.</span></div></div>
      <div class="feat">${hexChip("#e2b04a", "")}<div><b>Урок — провинция</b><span>Пройдите испытание, и туман над землёй рассеется.</span></div></div>
      <div class="feat">${hexChip("#e0654f", "")}<div><b>Повторяйте раз в 14 дней</b><span>Иначе провинции попадут в осаду. Так знания не забываются.</span></div></div>
      <div class="feat">${hexChip("#8b5fb0", "")}<div><b>Экзамен и сертификат</b><span>Сложный финальный экзамен по каждому языку и проект для портфолио.</span></div></div>
      <button class="btn pri big full" data-act="onb" data-step="1">Начать</button>`;
  } else if (n === 1) {
    if (!S.sel) S.sel = "py";
    body = `${steps}<h1>С чего <span>начнём?</span></h1><p class="lead">Выберите первую страну. Остальные откроются в любой момент.</p>
      <div class="chips">${LANGS.map(L => `<button class="lchip" data-act="onbLang" data-id="${L.id}" aria-pressed="${S.sel === L.id}"><i style="background:${L.color}"></i>${esc(L.name)}</button>`).join("")}</div>
      <div class="field"><label for="onb-name">Как вас зовут? Имя попадёт в сертификаты</label><input class="input" id="onb-name" value="${esc(S.profile.name)}" maxlength="60" autocomplete="name" placeholder="Имя и фамилия"></div>
      <button class="btn pri big full" data-act="onb" data-step="2">Дальше</button>`;
  } else {
    const nm = $("#onb-name"); if (nm) S.profile.name = nm.value.trim();
    body = `${steps}<h1>Ваш <span>темп</span></h1><p class="lead">Сколько очков набирать в день? 10 XP — один верный ответ.</p>
      <div class="seg" role="group" aria-label="Цель на день">${[[20, "Спокойно"], [50, "Стабильно"], [100, "Интенсивно"]].map(([g, t]) => `<button data-act="onbGoal" data-g="${g}" aria-pressed="${S.settings.goal === g}">${t}<br><small>${g} XP</small></button>`).join("")}</div>
      <label class="switch"><span>Напоминать об уроках и об осаде провинций</span><input type="checkbox" id="onb-remind" ${S.settings.remind ? "checked" : ""}></label>
      <button class="btn pri big full" data-act="onbDone">В бой</button>`;
  }
  o.innerHTML = `<div class="inner">${body}</div>`;
  const f = o.querySelector(".btn.pri"); if (f) f.focus({ preventScroll: true });
}
async function onbDone() {
  const r = $("#onb-remind"); S.settings.remind = !!(r && r.checked);
  S.onboarded = true; save();
  $("#onb").hidden = true;
  render();
  if (S.settings.remind) await askNotify();
  const l = IDX[S.sel] != null ? IDX[S.sel] : 1;
  openLesson(l, 0);
}

/* ---------------- boot ---------------- */
async function boot() {
  await load();
  if (NATIVE) {
    try { P.StatusBar && P.StatusBar.setStyle({ style: "DARK" }); } catch (e) {}
    try { P.SplashScreen && P.SplashScreen.hide(); } catch (e) {}
    try { Cap.Plugins.App && Cap.Plugins.App.addListener("appStateChange", st => { if (st.isActive) render(); }); } catch (e) {}
  }
  render();
  if (!S.onboarded) onbStep(0);
  scheduleNotifications();
}
/*@PRACTICE@*/
if (DEV || window.AVA_SELFTEST) window.__ava = { get S() { return S; }, get Q() { return Q; }, save, render, startQuiz, openLesson, openCert, openCountry, openProblem, runJS, runPY, runSQL, leetFetch };
boot();
})();
