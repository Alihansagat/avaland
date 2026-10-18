/* ================= AVALAND: эффекты, звуки, монеты, Лавка, платные пути ================= */

/* ---------- звук: маленький синтезатор на WebAudio ---------- */
let SFX_AC = null;
function sfxCtx() {
  if (!SFX_AC) { try { SFX_AC = new (window.AudioContext || window.webkitAudioContext)(); } catch (e) { return null; } }
  if (SFX_AC.state === "suspended") SFX_AC.resume().catch(() => {});
  return SFX_AC;
}
// iOS включает звук только после касания
["pointerdown", "keydown"].forEach(ev => document.addEventListener(ev, () => { if (S.settings.sound) sfxCtx(); }, { once: true, passive: true }));
function sTone(ac, { f = 440, f2 = 0, type = "triangle", at = 0, dur = 0.18, vol = 0.12, attack = 0.012 }) {
  const t = ac.currentTime + at, o = ac.createOscillator(), g = ac.createGain();
  o.type = type; o.frequency.setValueAtTime(f, t);
  if (f2) o.frequency.exponentialRampToValueAtTime(f2, t + dur);
  g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(vol, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
  o.connect(g).connect(ac.destination); o.start(t); o.stop(t + dur + 0.02);
}
function sNoise(ac, { at = 0, dur = 0.12, vol = 0.05, hp = 1200 }) {
  const t = ac.currentTime + at, len = Math.floor(ac.sampleRate * dur), buf = ac.createBuffer(1, len, ac.sampleRate), d = buf.getChannelData(0);
  for (let i = 0; i < len; i++) d[i] = (Math.random() * 2 - 1) * (1 - i / len);
  const src = ac.createBufferSource(), f = ac.createBiquadFilter(), g = ac.createGain();
  f.type = "highpass"; f.frequency.value = hp; g.gain.value = vol;
  src.buffer = buf; src.connect(f).connect(g).connect(ac.destination); src.start(t);
}
const SOUNDS = {
  tap: ac => sTone(ac, { f: 520, f2: 640, type: "sine", dur: 0.06, vol: 0.05 }),
  open: ac => { sTone(ac, { f: 300, f2: 600, type: "sine", dur: 0.16, vol: 0.05 }); sNoise(ac, { dur: 0.12, vol: 0.02, hp: 2500 }); },
  ok: ac => { sTone(ac, { f: 660, dur: 0.12, vol: 0.11 }); sTone(ac, { f: 990, at: 0.08, dur: 0.22, vol: 0.11 }); sTone(ac, { f: 1320, at: 0.08, dur: 0.22, type: "sine", vol: 0.04 }); },
  no: ac => { sTone(ac, { f: 220, f2: 150, type: "sawtooth", dur: 0.22, vol: 0.06 }); sTone(ac, { f: 160, f2: 110, type: "square", at: 0.06, dur: 0.22, vol: 0.035 }); },
  win: ac => { [523, 659, 784, 1047].forEach((f, i) => sTone(ac, { f, at: i * 0.09, dur: 0.24, vol: 0.1 })); sTone(ac, { f: 1568, at: 0.36, dur: 0.5, type: "sine", vol: 0.06 }); sNoise(ac, { at: 0.34, dur: 0.3, vol: 0.025, hp: 4000 }); },
  coin: ac => { sTone(ac, { f: 1318, type: "square", dur: 0.07, vol: 0.035 }); sTone(ac, { f: 1975, type: "square", at: 0.06, dur: 0.16, vol: 0.035 }); },
  buy: ac => { [784, 988, 1175, 1568].forEach((f, i) => sTone(ac, { f, at: i * 0.06, type: "square", dur: 0.12, vol: 0.03 })); sNoise(ac, { at: 0.2, dur: 0.25, vol: 0.03, hp: 5000 }); },
  freeze: ac => { [1760, 1480, 1976, 2349].forEach((f, i) => sTone(ac, { f, at: i * 0.07, type: "sine", dur: 0.3, vol: 0.04 })); },
  hint: ac => { sTone(ac, { f: 880, f2: 1320, type: "sine", dur: 0.25, vol: 0.06 }); },
  level: ac => { [392, 523, 659, 784, 1047].forEach((f, i) => sTone(ac, { f, at: i * 0.07, dur: 0.3, vol: 0.09 })); },
  swoosh: ac => sNoise(ac, { dur: 0.18, vol: 0.03, hp: 1800 })
};
function sfx(name) {
  if (!S.settings.sound) return;
  const ac = sfxCtx(); if (!ac || !SOUNDS[name]) return;
  try { SOUNDS[name](ac); } catch (e) {}
}

/* ---------- анимации ---------- */
const REDUCED = window.matchMedia && window.matchMedia("(prefers-reduced-motion: reduce)").matches;
let fxLayer = null;
function fxRoot() {
  if (!fxLayer) { fxLayer = document.createElement("div"); fxLayer.className = "fx"; fxLayer.setAttribute("aria-hidden", "true"); document.body.appendChild(fxLayer); }
  return fxLayer;
}
function centerOf(el) {
  if (!el || !el.getBoundingClientRect) return [innerWidth / 2, innerHeight / 2];
  const r = el.getBoundingClientRect(); return [r.left + r.width / 2, r.top + r.height / 2];
}
function confetti(from, n = 70) {
  if (REDUCED) return;
  const [x, y] = Array.isArray(from) ? from : centerOf(from), root = fxRoot();
  const colors = ["#e2b04a", "#80c27a", "#6585b5", "#e0654f", "#8b5fb0", "#45a3a6", "#f08a3c"];
  for (let i = 0; i < n; i++) {
    const p = document.createElement("i"); p.className = "cf";
    const a = Math.random() * Math.PI * 2, v = 120 + Math.random() * 260;
    p.style.cssText = `left:${x}px;top:${y}px;background:${colors[i % colors.length]};--dx:${(Math.cos(a) * v).toFixed(0)}px;--dy:${(Math.sin(a) * v - 160).toFixed(0)}px;--r:${(Math.random() * 720 - 360).toFixed(0)}deg;animation-delay:${(Math.random() * 0.08).toFixed(2)}s;${i % 3 ? "" : "border-radius:50%;"}`;
    root.appendChild(p); setTimeout(() => p.remove(), 1500);
  }
}
function floatText(from, text, cls = "") {
  const [x, y] = Array.isArray(from) ? from : centerOf(from), root = fxRoot();
  const t = document.createElement("b"); t.className = "ftxt " + cls; t.textContent = text;
  t.style.cssText = `left:${x}px;top:${y}px`;
  root.appendChild(t); setTimeout(() => t.remove(), 1300);
}
function coinFly(from, n) {
  const target = $("#coin-chip");
  if (REDUCED || !target) { bumpCoins(); return; }
  const [x0, y0] = Array.isArray(from) ? from : centerOf(from), [x1, y1] = centerOf(target), root = fxRoot();
  const k = Math.min(10, Math.max(3, Math.round(n / 3)));
  for (let i = 0; i < k; i++) {
    const c = document.createElement("i"); c.className = "coinfly"; c.innerHTML = COIN_SVG;
    const jx = (Math.random() - 0.5) * 70, jy = (Math.random() - 0.5) * 50;
    c.style.cssText = `left:${x0 + jx}px;top:${y0 + jy}px;--tx:${(x1 - x0 - jx).toFixed(0)}px;--ty:${(y1 - y0 - jy).toFixed(0)}px;animation-delay:${(i * 0.06).toFixed(2)}s`;
    root.appendChild(c); setTimeout(() => c.remove(), 1100 + i * 60);
  }
  setTimeout(bumpCoins, 700);
}
function bumpCoins() {
  const el = $("#coin-chip"); if (!el) return;
  const b = el.querySelector("b"); if (b) countTo(b, S.coins);
  el.classList.remove("bump"); void el.offsetWidth; el.classList.add("bump");
}
function countTo(el, to) {
  const from = parseInt(el.textContent.replace(/\D/g, ""), 10) || 0;
  if (REDUCED || from === to) { el.textContent = to; return; }
  const t0 = performance.now(), d = 600;
  const step = t => { const k = Math.min(1, (t - t0) / d), v = Math.round(from + (to - from) * (1 - Math.pow(1 - k, 3))); el.textContent = v; if (k < 1) requestAnimationFrame(step); };
  requestAnimationFrame(step);
}
function shake(el) { if (!el || REDUCED) return; el.classList.remove("shake"); void el.offsetWidth; el.classList.add("shake"); }
function pulse(el, cls = "pop") { if (!el || REDUCED) return; el.classList.remove(cls); void el.offsetWidth; el.classList.add(cls); }

/* появление разделов при прокрутке */
let revealIO = null;
function revealAll(root = document) {
  if (REDUCED || !("IntersectionObserver" in window)) return;
  revealIO = revealIO || new IntersectionObserver(entries => {
    let k = 0;
    entries.forEach(e => { if (e.isIntersecting) { e.target.style.transitionDelay = Math.min(k++ * 45, 360) + "ms"; e.target.classList.add("in"); revealIO.unobserve(e.target); } });
  }, { rootMargin: "0px 0px -6% 0px", threshold: 0.06 });
  root.querySelectorAll(".card, .trow, .lrow, .due, .cert, .ach > div, .item, .trk, .rm, .prow, .cont, .box").forEach(el => {
    if (el.classList.contains("rv")) return;
    el.classList.add("rv"); revealIO.observe(el);
  });
}
let lastTabIdx = 0;
function animateView(tab) {
  const v = $("#view"); if (!v || REDUCED) return;
  const order = ["map", "practice", "review", "shop", "awards", "profile"], i = order.indexOf(tab);
  v.classList.remove("enter-l", "enter-r"); void v.offsetWidth;
  v.classList.add(i >= lastTabIdx ? "enter-r" : "enter-l"); lastTabIdx = i;
}

/* ---------- монеты ---------- */
const COIN_SVG = '<svg viewBox="0 0 24 24" width="1em" height="1em" aria-hidden="true"><circle cx="12" cy="12" r="10" fill="#e2b04a" stroke="#8a6416" stroke-width="1.6"/><circle cx="12" cy="12" r="6.6" fill="none" stroke="#fff3c4" stroke-opacity=".55" stroke-width="1.2"/><path d="M12 7.2l1.5 3.1 3.3.4-2.4 2.3.6 3.3-3-1.6-3 1.6.6-3.3-2.4-2.3 3.3-.4z" fill="#fff3c4"/></svg>';
const coinTag = n => `<span class="coin">${COIN_SVG}<b>${n}</b></span>`;
const boostOn = () => (S.boost || 0) > Date.now();
function addCoins(n, from, why) {
  if (!n) return 0;
  if (boostOn() && n > 0) n *= 2;
  S.coins = Math.max(0, (S.coins || 0) + n); S.coinsAt = Date.now();
  if (n > 0) { sfx("coin"); coinFly(from, n); if (from && why !== "silent") floatText(Array.isArray(from) ? from : centerOf(from), `+${n}`, "gold"); }
  else bumpCoins();
  return n;
}
function spend(n) {
  if ((S.coins || 0) < n) { toast(`Нужно ${n} монет, у вас ${S.coins || 0}. Учитесь — монеты придут.`); sfx("no"); shake($("#coin-chip")); return false; }
  S.coins -= n; S.coinsAt = Date.now(); bumpCoins(); return true;
}
const COIN_RULES = [
  ["Верный ответ в испытании", "+1"], ["Верный ответ на экзамене", "+2"], ["Новая провинция", "+10"], ["Испытание без ошибок", "+5"],
  ["Повторение или разминка", "+5…10"], ["Цель дня выполнена", "+20"], ["Задача на Полигоне", "+5 / 10 / 20"],
  ["Финальный экзамен языка", "+50"], ["Экзамен пещеры", "+75"], ["Сертификат пути", "+250"], ["Новое достижение", "+25"]
];

/* ---------- заморозка серии ---------- */
const dayActive = k => !!(S.days[k] || (S.frozen && S.frozen[k]));
function applyFreezes() {
  const stock = (S.inv && S.inv.freeze) || 0;
  if (!stock) return;
  const today = dayKey(now());
  if (dayActive(today)) return;
  // сколько дней подряд пропущено до вчерашнего включительно
  let gap = 0, t = now() - DAY;
  while (gap < 30 && !dayActive(dayKey(t))) { gap++; t -= DAY; }
  if (!gap || gap >= 30 || gap > stock) return;      // серии не было или заморозок не хватит
  for (let i = 1; i <= gap; i++) { S.frozen = S.frozen || {}; S.frozen[dayKey(now() - i * DAY)] = 1; }
  S.inv.freeze -= gap; save();
  setTimeout(() => { sfx("freeze"); toast(`Заморозка спасла серию: ${gap} ${plural(gap, "день", "дня", "дней")} без занятий не прервали её`); }, 1200);
}

/* ---------- Лавка ---------- */
const SHOP = [
  { id: "freeze", icon: "❄️", title: "Заморозка серии", desc: "Пропустили день — серия не сгорит. Срабатывает сама. Можно держать до 3 штук.", price: 150, max: 3 },
  { id: "hint", icon: "💡", title: "Подсказка 50/50", desc: "Убирает два неверных варианта в вопросе с выбором ответа. Не работает на экзаменах.", price: 20, max: 99 },
  { id: "reveal", icon: "📜", title: "Свиток ответа", desc: "Показывает ответ на вопрос «что выведет код» или «впишите пропущенное». За такой вопрос нет XP и монет.", price: 40, max: 99 },
  { id: "retake", icon: "⏱️", title: "Пересдача без ожидания", desc: "Сразу пересдать экзамен, не дожидаясь 30 минут.", price: 60, max: 9 },
  { id: "boost", icon: "⚡", title: "Двойные монеты на 30 минут", desc: "Все монеты за ответы, уроки и задачи удваиваются.", price: 100, max: 0 }
];
const COUPONS = [{ pct: 25, price: 300 }, { pct: 50, price: 700 }];
const BUNDLE = { id: "all", title: "Все пути профессий", price: 9990 };
const trackPrice = tid => (TRACKS[tid] && TRACKS[tid].price) || 2990;
const itemPrice = item => item === "all" ? BUNDLE.price : trackPrice(item);
const itemTitle = item => item === "all" ? BUNDLE.title : TRACKS[item] ? TRACKS[item].title : item;
const owns = tid => !!(S.owned && (S.owned.all || S.owned[tid]));
const tenge = n => n.toLocaleString("ru-RU").replace(/ /g, " ") + " ₸";
const discounted = item => { const p = Math.min(50, (S.coupons && S.coupons[item]) || 0); return { pct: p, sum: Math.round(itemPrice(item) * (100 - p) / 100) }; };

function buyItem(id, from) {
  const it = SHOP.find(x => x.id === id); if (!it) return;
  S.inv = S.inv || {};
  if (it.max && (S.inv[id] || 0) >= it.max) { toast(`Больше ${it.max} не поместится в инвентарь`); return; }
  if (!spend(it.price)) return;
  if (id === "boost") S.boost = Math.max(Date.now(), S.boost || 0) + 30 * 60e3;
  else S.inv[id] = (S.inv[id] || 0) + 1;
  save(); sfx(id === "freeze" ? "freeze" : "buy"); confetti(from, 28);
  toast(id === "boost" ? "Двойные монеты включены на 30 минут" : `Куплено: ${it.title}`);
  rerenderShop();
}
function buyCoupon(pct, from) {
  const sel = $("#cp-item"), item = sel ? sel.value : "all", c = COUPONS.find(x => x.pct === pct);
  if (owns(item)) { toast("Этот путь уже открыт"); return; }
  S.coupons = S.coupons || {};
  if ((S.coupons[item] || 0) >= pct) { toast(`Скидка ${S.coupons[item]}% на этот путь уже есть`); return; }
  if (!spend(c.price)) return;
  S.coupons[item] = pct; save(); sfx("buy"); confetti(from, 36);
  toast(`Скидка ${pct}% на «${itemTitle(item)}» сохранена — она применится при покупке`);
  rerenderShop();
}
function rerenderShop() { if (S.tab === "shop" && ov.hidden) { const y = scrollY; render(); scrollTo(0, y); } renderHeader(); }

function viewShop() {
  const inv = S.inv || {}, coins = S.coins || 0;
  const items = SHOP.map(it => {
    const have = it.id === "boost" ? (boostOn() ? `активно ещё ${Math.ceil((S.boost - Date.now()) / 60e3)} мин` : "") : inv[it.id] ? `у вас: ${inv[it.id]}` : "";
    return `<div class="item"><span class="ic">${it.icon}</span><div><b>${it.title}</b><small>${it.desc}</small>${have ? `<span class="pill ok">${have}</span>` : ""}</div>
      <button class="btn ${coins >= it.price ? "pri" : ""}" data-act="shopBuy" data-id="${it.id}">${coinTag(it.price)}</button></div>`;
  }).join("");
  const tracks = TIDS.filter(t => !owns(t));
  const opts = [`<option value="all">${esc(BUNDLE.title)} · ${tenge(BUNDLE.price)}</option>`].concat(tracks.map(t => `<option value="${t}">${esc(TRACKS[t].title)} · ${tenge(trackPrice(t))}</option>`)).join("");
  const myCoupons = Object.entries(S.coupons || {}).filter(([k]) => !owns(k));
  const paths = TIDS.map(t => {
    const T = TRACKS[t], P0 = LANGS[IDX[T.parent]], d = discounted(t);
    return `<div class="prow">${hexChip(P0.color)}<div><b>${esc(T.title)}</b><small>${esc(T.role)} · ${T.caves.length} ${plural(T.caves.length, "пещера", "пещеры", "пещер")}, первая бесплатно</small></div>
      ${owns(t) ? '<span class="pill ok">открыт</span>' : `<button class="btn" data-act="buyPath" data-t="${t}">${d.pct ? `<s>${tenge(itemPrice(t))}</s> ` : ""}${tenge(d.sum)}</button>`}</div>`;
  }).join("");
  const allD = discounted("all");
  return `<div class="grid2">
    <section class="card stack shop-head"><div class="row" style="justify-content:space-between"><div><div class="eyebrow">Казна империи</div><h2 class="h-sec">${coinTag(coins)} ${plural(coins, "монета", "монеты", "монет")}</h2></div><span class="chest" aria-hidden="true">🪙</span></div>
      <p class="muted" style="margin:0">Монеты дают за учёбу. Тратьте их на заморозку серии, подсказки и скидки на пути профессий.</p>
      ${boostOn() ? `<p class="note" style="color:var(--gold)">⚡ Двойные монеты: ещё ${Math.ceil((S.boost - Date.now()) / 60e3)} мин</p>` : ""}
      <details class="earn"><summary>Как заработать монеты</summary><ul>${COIN_RULES.map(([a, b]) => `<li><span>${a}</span><b>${b}</b></li>`).join("")}</ul></details></section>
    <section class="card stack"><div><div class="eyebrow">Усиления</div><h2 class="h-sec">Лавка</h2></div><div class="list">${items}</div></section>
    <section class="card stack"><div><div class="eyebrow">Скидки за монеты</div><h2 class="h-sec">Купоны на пути профессий</h2></div>
      <p class="muted" style="margin:0">Купон снижает цену пути в тенге. Максимальная скидка — 50%.</p>
      ${tracks.length || !owns("all") ? `<div class="field"><label for="cp-item">Для чего купон</label><select class="input" id="cp-item">${opts}</select></div>
      <div class="row">${COUPONS.map(c => `<button class="btn ${coins >= c.price ? "pri" : ""}" data-act="buyCoupon" data-pct="${c.pct}">−${c.pct}% · ${coinTag(c.price)}</button>`).join("")}</div>` : '<p class="note">Все пути уже открыты.</p>'}
      ${myCoupons.length ? `<p class="tips-h">Ваши купоны</p><ul class="tips">${myCoupons.map(([k, p]) => `<li>−${p}% на «${esc(itemTitle(k))}»</li>`).join("")}</ul>` : ""}</section>
    <section class="card stack"><div><div class="eyebrow">Пути профессий</div><h2 class="h-sec">Открыть пещеры</h2></div>
      <p class="muted" style="margin:0">Все 15 языков бесплатны. Пути профессий — библиотеки и фреймворки после языка: первая пещера каждого пути бесплатна, остальные и сертификат пути — после покупки. Покупка навсегда.</p>
      <div class="bundle"><div><b>${esc(BUNDLE.title)}</b><small>${TIDS.length} путей, ${CAVES.length} пещер и все будущие пути</small></div>${owns("all") ? '<span class="pill ok">открыто</span>' : `<button class="btn pri" data-act="buyPath" data-t="all">${allD.pct ? `<s>${tenge(BUNDLE.price)}</s> ` : ""}${tenge(allD.sum)}</button>`}</div>
      <div class="list">${paths}</div></section>
  </div>`;
}

/* ---------- подсказки в вопросах ---------- */
function helpBar(x) {
  if (Q.mode === "exam") return `<p class="note helpnote">На экзамене подсказки не работают — только ваши знания.</p>`;
  const inv = S.inv || {};
  if (x.q.t === "mc") {
    if (x.opts.filter(o => !o.ok).length < 3) return "";
    return `<div class="helpbar"><button class="btn ghost sm" data-act="useHint">💡 50/50 · ${inv.hint ? `есть ${inv.hint}` : coinTag(20)}</button></div>`;
  }
  return `<div class="helpbar"><button class="btn ghost sm" data-act="useReveal">📜 Показать ответ · ${inv.reveal ? `есть ${inv.reveal}` : coinTag(40)}</button></div>`;
}
function takeItem(id) {
  S.inv = S.inv || {};
  if (S.inv[id]) { S.inv[id]--; save(); return true; }
  const it = SHOP.find(x => x.id === id);
  if (!spend(it.price)) return false;
  save(); return true;
}
function useHint(btn) {
  const x = Q.qs[Q.k]; if (Q.res.length > Q.k || x.q.t !== "mc" || x.hinted) return;
  if (!takeItem("hint")) return;
  x.hinted = true; sfx("hint");
  const wrong = [...dlg.querySelectorAll(".opt")].map((b, n) => ({ b, n })).filter(o => !x.opts[o.n].ok);
  shuffle(wrong).slice(0, 2).forEach(({ b }, i) => setTimeout(() => { b.disabled = true; b.classList.add("gone"); }, i * 120));
  btn.remove();
}
function useReveal(btn) {
  const x = Q.qs[Q.k]; if (Q.res.length > Q.k || x.q.t === "mc") return;
  if (!takeItem("reveal")) return;
  x.revealed = true; sfx("hint");
  const inp = $("#ans"); if (inp) { inp.value = x.q.ans[0]; inp.classList.add("revealed"); inp.focus(); }
  btn.remove();
  toast("Ответ подставлен. За этот вопрос не будет XP и монет");
}

/* ---------- платные пути и оплата Kaspi ---------- */
const PAY = { fn: "kaspi", poll: null };
function premiumLocked(l) {
  const L = LANGS[l]; if (!L.cave) return false;
  const T = TRACKS[L.track]; if (!T) return false;
  return T.caves.indexOf(L.id) > 0 && !owns(L.track);
}
function premiumBox(tid) {
  if (owns(tid)) return "";
  const d = discounted(tid), T = TRACKS[tid];
  return `<div class="box premium"><h3>👑 Весь путь — ${d.pct ? `<s>${tenge(itemPrice(tid))}</s> ` : ""}${tenge(d.sum)}</h3>
    <p>Первая пещера бесплатна. Остальные ${T.caves.length - 1} ${plural(T.caves.length - 1, "пещера", "пещеры", "пещер")}, проект и сертификат «${esc(T.role)}» — после покупки, навсегда.${d.pct ? ` Ваш купон −${d.pct}% уже учтён.` : " Скидку до 50% можно купить за монеты в Лавке."}</p>
    <div class="row"><button class="btn pri" data-act="buyPath" data-t="${tid}">Открыть путь</button><button class="btn" data-act="buyPath" data-t="all">Все пути — ${tenge(discounted("all").sum)}</button></div></div>`;
}
function phoneNorm(v) {
  let d = String(v || "").replace(/\D/g, "");
  if (d.length === 10) d = "8" + d;
  if (d.length === 11 && d[0] === "7") d = "8" + d.slice(1);
  return /^87\d{9}$/.test(d) ? d : null;
}
function openBuy(item) {
  const d = discounted(item), title = itemTitle(item);
  const incl = item === "all"
    ? `<li>Все ${TIDS.length} путей и ${CAVES.length} пещер, а также пути, которые появятся позже</li><li>Сертификаты всех путей и проекты для портфолио</li>`
    : `<li>${TRACKS[item].caves.map(c => esc(LANGS[IDX[c]].name)).join(" → ")}</li><li>Проект «${esc(TRACKS[item].project.title)}»</li><li>Сертификат «${esc(TRACKS[item].role)}»</li>`;
  if (owns(item)) { toast("Уже открыто"); return; }
  const logged = typeof me !== "undefined" && me;
  shell(item === "all" ? "#e2b04a" : LANGS[IDX[TRACKS[item].parent]].color, "Покупка", esc(title),
    `<ul class="tips">${incl}</ul>
     <div class="price"><span>К оплате</span><b>${d.pct ? `<s>${tenge(itemPrice(item))}</s> ` : ""}${tenge(d.sum)}</b></div>
     ${d.pct ? `<p class="note">Применён купон −${d.pct}% из Лавки.</p>` : `<p class="note">Скидку 25% или 50% можно купить за монеты в Лавке.</p>`}
     ${logged ? `<div class="field"><label for="kp-phone">Номер телефона в Kaspi.kz</label><input class="input" id="kp-phone" inputmode="tel" autocomplete="tel" placeholder="+7 700 123 45 67" value="${esc(S.kaspiPhone || "")}"></div>
       <p class="note">Счёт придёт в приложение Kaspi.kz: «Платежи» → «Счета на оплату». Доступ откроется сразу после оплаты, на всех ваших устройствах.</p>
       <div id="kp-st"></div>
       <div class="acts"><button class="btn pri big" data-act="kaspiPay" data-item="${item}">Оплатить через Kaspi</button></div>`
     : `<p class="txt">Чтобы покупка не потерялась и открылась на всех устройствах, войдите в аккаунт — это бесплатно.</p>
       <div class="acts"><button class="btn pri big" data-act="goLogin">Войти и купить</button></div>`}`);
  openOv("#kp-phone"); sfx("open");
}
async function payFn(body) {
  const c = await sbClient();
  const { data, error } = await c.functions.invoke(PAY.fn, { body });
  if (error) {
    let msg = error.message || String(error), code = 0;
    try { const ctx = error.context; if (ctx && ctx.status) code = ctx.status; const j = ctx && ctx.json ? await ctx.json() : null; if (j && j.error) msg = j.error; } catch (e) {}
    const err = new Error(msg); err.code = code; throw err;
  }
  return data;
}
async function kaspiPay(item) {
  const phone = phoneNorm($("#kp-phone") && $("#kp-phone").value), st = $("#kp-st"), btn = dlg.querySelector("[data-act=kaspiPay]");
  if (!phone) { st.innerHTML = '<p class="note" style="color:var(--danger)">Введите номер Kaspi в формате +7 7XX XXX XX XX.</p>'; shake($("#kp-phone")); return; }
  S.kaspiPhone = "+7 " + phone.slice(1); save();
  btn.disabled = true; btn.textContent = "Отправляю счёт…";
  try {
    const r = await payFn({ action: "create", item, phone });
    if (r && r.owned) { grantOwned(item); return; }
    st.innerHTML = `<div class="box waitpay"><div class="spin" aria-hidden="true"></div><div><b>Счёт на ${tenge(r.amount)} отправлен в Kaspi.kz</b><p>Откройте Kaspi.kz → «Платежи» → «Счета на оплату» и подтвердите оплату. Эта страница сама увидит оплату.</p></div></div>
      <div class="row"><button class="btn" data-act="kaspiCheck" data-order="${r.order_id}" data-item="${item}">Я оплатил — проверить</button></div>`;
    btn.remove(); pollOrder(r.order_id, item);
  } catch (e) {
    btn.disabled = false; btn.textContent = "Оплатить через Kaspi";
    const soon = e.code === 404 || e.code === 503 || /not found|not configured|Failed to send|FunctionsFetchError|FunctionsRelayError/i.test(e.message);
    st.innerHTML = `<p class="note" style="color:${soon ? "var(--gold)" : "var(--danger)"}">${soon ? "Оплата через Kaspi подключается и заработает в ближайшее время. Ваш купон и прогресс сохранятся." : "Не получилось: " + esc(e.message)}</p>`;
  }
}
function pollOrder(order, item) {
  clearInterval(PAY.poll);
  const t0 = Date.now();
  PAY.poll = setInterval(async () => {
    if (!$("#kp-st") || Date.now() - t0 > 15 * 60e3) { clearInterval(PAY.poll); return; }
    try { const r = await payFn({ action: "status", order_id: order }); if (r && r.status === "paid") { clearInterval(PAY.poll); grantOwned(item); } } catch (e) {}
  }, 5000);
}
async function kaspiCheck(order, item, btn) {
  btn.disabled = true; btn.textContent = "Проверяю…";
  try {
    const r = await payFn({ action: "status", order_id: order });
    if (r && r.status === "paid") { grantOwned(item); return; }
    toast("Оплата пока не пришла. Если вы оплатили, подождите минуту");
  } catch (e) { toast("Не удалось проверить: " + e.message); }
  btn.disabled = false; btn.textContent = "Я оплатил — проверить";
}
function grantOwned(item) {
  S.owned = S.owned || {}; S.owned[item] = Date.now();
  if (S.coupons) delete S.coupons[item];
  save(); sfx("level"); confetti(null, 120);
  shell("#e2b04a", "Покупка", "Открыто навсегда!",
    `<div class="res"><div class="big" style="color:var(--gold)">👑</div><p>${item === "all" ? "Все пути профессий открыты." : `Путь «${esc(itemTitle(item))}» открыт.`} Спасибо, что поддерживаете AVALAND!</p></div>
     <div class="acts">${item === "all" ? `<button class="btn pri big" data-close>На карту</button>` : `<button class="btn pri big" data-act="track" data-t="${item}">К дорожной карте</button>`}</div>`);
  openOv();
}
async function loadOwned() {
  if (typeof me === "undefined" || !me) return;
  try {
    const c = await sbClient();
    const { data, error } = await c.from("purchases").select("item, paid_at").eq("user_id", me.id);
    if (error || !data) return;
    S.owned = S.owned || {};
    let changed = false;
    data.forEach(p => { if (!S.owned[p.item]) { S.owned[p.item] = Date.parse(p.paid_at) || Date.now(); changed = true; } });
    if (changed) { saveLocal(); if (ov.hidden) render(); }
  } catch (e) {}
}

/* ---------- действия ---------- */
function shopAction(a, b) {
  switch (a) {
    case "shopBuy": buyItem(b.dataset.id, b); return true;
    case "buyCoupon": buyCoupon(+b.dataset.pct, b); return true;
    case "buyPath": openBuy(b.dataset.t); return true;
    case "kaspiPay": kaspiPay(b.dataset.item); return true;
    case "kaspiCheck": kaspiCheck(b.dataset.order, b.dataset.item, b); return true;
    case "goLogin": closeOv(); S.tab = "profile"; save(); render(); scrollTo({ top: 0 }); toast("Войдите или зарегистрируйтесь, затем вернитесь к покупке"); return true;
    case "useHint": useHint(b); return true;
    case "useReveal": useReveal(b); return true;
    case "retakeNow": {
      const L = LANGS[+b.dataset.l], ex = S.exams[L.id];
      if (!ex || !ex.failAt) return true;
      if (!takeItem("retake")) return true;
      ex.failAt = 0; save(); sfx("buy"); toast("Ожидание снято — можно сдавать"); openExamIntro(+b.dataset.l); return true;
    }
  }
  return false;
}
