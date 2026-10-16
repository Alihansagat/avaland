/* ---------------- practice: задачи с запуском кода ---------------- */
const PR = window.AVA_PRACTICE || [];
const PIDX = Object.fromEntries(PR.map((p, i) => [p.id, i]));
const DIFF = { easy: ["Лёгкая", "ok", 30], medium: ["Средняя", "gold", 60], hard: ["Сложная", "red", 120] };
const LANG_NAME = { py: "Python", js: "JavaScript", sql: "SQL" };
const pstate = id => S.practice[id] || (S.practice[id] = { tries: 0 });
const isSolved = id => !!(S.practice[id] && (S.practice[id].solved || S.practice[id].lc));
function practiceStats() {
  const by = { easy: [0, 0], medium: [0, 0], hard: [0, 0] };
  PR.forEach(p => { by[p.diff][1]++; if (isSolved(p.id)) by[p.diff][0]++; });
  return { solved: by.easy[0] + by.medium[0] + by.hard[0], total: PR.length, by };
}
function dailyProblem() {
  const k = dayKey(now()); let h = 0;
  for (const c of k) h = (h * 31 + c.charCodeAt(0)) >>> 0;
  const pool = PR.filter(p => !isSolved(p.id));
  const list = pool.length ? pool : PR;
  return list[h % list.length];
}

/* runners */
const JS_RUNNER = `self.onmessage = e => {
  const { code, fn, tests } = e.data, logs = [];
  const fmt = v => typeof v === "string" ? v : (() => { try { return JSON.stringify(v); } catch (x) { return String(v); } })();
  console.log = (...a) => { if (logs.length < 200) logs.push(a.map(fmt).join(" ")); };
  let f;
  try { f = new Function(code + "\\n;return typeof " + fn + " === 'function' ? " + fn + " : undefined;")(); }
  catch (err) { self.postMessage({ error: err.name + ": " + err.message, log: logs.join("\\n") }); return; }
  if (!f) { self.postMessage({ error: "Функция " + fn + " не найдена. Не меняйте её имя.", log: logs.join("\\n") }); return; }
  const results = tests.map(args => {
    try { const v = f(...args); return { v: v === undefined ? null : JSON.parse(JSON.stringify(v)) }; }
    catch (err) { return { err: err.name + ": " + err.message }; }
  });
  self.postMessage({ results, log: logs.join("\\n") });
};`;
let jsRunnerURL = null;
function runJS(code, fn, tests) {
  return new Promise(resolve => {
    try {
      jsRunnerURL = jsRunnerURL || URL.createObjectURL(new Blob([JS_RUNNER], { type: "text/javascript" }));
      const w = new Worker(jsRunnerURL);
      const t = setTimeout(() => { w.terminate(); resolve({ error: "Превышено время: 3 секунды. Возможно, бесконечный цикл." }); }, 3000);
      w.onmessage = e => { clearTimeout(t); w.terminate(); resolve(e.data); };
      w.onerror = e => { clearTimeout(t); w.terminate(); resolve({ error: e.message || "Ошибка выполнения" }); };
      w.postMessage({ code, fn, tests: JSON.parse(JSON.stringify(tests)) });
    } catch (err) { resolve({ error: "Не удалось запустить JavaScript: " + err.message }); }
  });
}
let pyWorker = null, pyReady = false, pySeq = 0;
const pyWait = {};
function pyStart() {
  if (pyWorker) return pyWorker;
  pyWorker = new Worker(window.AVA_WEB ? "py-worker.js?web=1" : "py-worker.js", { type: "module" });
  pyWorker.onmessage = e => { const cb = pyWait[e.data.id]; if (cb) { delete pyWait[e.data.id]; cb(e.data); } };
  pyWorker.onerror = () => { Object.values(pyWait).forEach(cb => cb({ fatal: "Python не загрузился" })); pyKill(); };
  return pyWorker;
}
function pyKill() { try { pyWorker && pyWorker.terminate(); } catch (e) {} pyWorker = null; pyReady = false; }
function pyCall(msg, timeoutMs) {
  return new Promise(resolve => {
    let w;
    try { w = pyStart(); } catch (err) { resolve({ fatal: "Python недоступен в этой версии: " + err.message }); return; }
    const id = ++pySeq;
    const t = setTimeout(() => { delete pyWait[id]; pyKill(); resolve({ error: "Превышено время. Возможно, бесконечный цикл. Python перезапустится при следующем запуске." }); }, timeoutMs);
    pyWait[id] = d => { clearTimeout(t); resolve(d); };
    w.postMessage({ id, ...msg });
  });
}
async function runPY(code, fn, tests) {
  if (!pyReady) {
    setRunStatus("Загружаю Python… Это нужно один раз за запуск приложения, около 5 секунд.");
    const r = await pyCall({ warm: true }, 60000);
    if (r.fatal) return { error: "Не удалось загрузить Python: " + r.fatal };
    pyReady = true;
  }
  setRunStatus("Выполняю…");
  const r = await pyCall({ code, fn, tests }, 6000);
  if (r.fatal) return { error: r.fatal };
  return r;
}
/* SQL: SQLite в WebAssembly */
let sqlLib = null;
async function sqlEngine() {
  if (!sqlLib) {
    if (typeof initSqlJs !== "function") throw new Error("SQL-движок не загружен");
    sqlLib = await initSqlJs({ locateFile: f => (window.AVA_SQL_BASE || "sqljs/") + f });
  }
  const db = new sqlLib.Database();
  db.run(window.AVA_SQLDB.schema);
  db.run(window.AVA_SQLDB.seed);
  return db;
}
async function runSQL(query) {
  let db;
  try { db = await sqlEngine(); } catch (err) { return { error: "Не удалось загрузить SQLite: " + err.message }; }
  try {
    const res = db.exec(query);
    if (!res.length) return { cols: [], rows: [] };
    const last = res[res.length - 1];
    return { cols: last.columns, rows: last.values };
  } catch (err) { return { error: String(err.message || err) }; }
  finally { db.close(); }
}
function sameRows(got, exp, ordered) {
  const norm = r => JSON.stringify(r.map(v => typeof v === "number" ? Math.round(v * 1e6) / 1e6 : v));
  if (got.length !== exp.length) return false;
  const a = got.map(norm), b = exp.map(norm);
  if (!ordered) { a.sort(); b.sort(); }
  return a.every((x, i) => x === b[i]);
}
function tableHTML(cols, rows, max = 12) {
  if (!cols.length) return '<p class="note">Запрос не вернул таблицу.</p>';
  return `<div class="tblwrap"><table class="tbl"><thead><tr>${cols.map(c => `<th>${esc(c)}</th>`).join("")}</tr></thead><tbody>${rows.slice(0, max).map(r => `<tr>${r.map(v => `<td>${v === null ? '<span class="muted">NULL</span>' : esc(v)}</td>`).join("")}</tr>`).join("")}</tbody></table></div>${rows.length > max ? `<p class="note">Показаны ${max} строк из ${rows.length}.</p>` : `<p class="note">Строк: ${rows.length}.</p>`}`;
}
function schemaHTML() {
  const T = window.AVA_SQLDB.tables;
  return `<details class="log"><summary>Схема базы и примеры данных</summary>${Object.entries(T).map(([n, t]) => `<p class="note" style="margin-top:8px"><b style="color:var(--ink)">${n}</b> — ${t.count} строк</p>${tableHTML(t.cols, t.rows, 3)}`).join("")}</details>`;
}
async function runSqlProblem(all) {
  const p = cur, code = edCode();
  S.drafts[p.id + ":sql"] = code; save();
  document.querySelectorAll("[data-act=pRun],[data-act=pSubmit]").forEach(b => b.disabled = true);
  setRunStatus("Выполняю запрос…");
  const r = await runSQL(code);
  document.querySelectorAll("[data-act=pRun],[data-act=pSubmit]").forEach(b => b.disabled = false);
  const out = $("#run-out"); if (!out || cur !== p) return;
  if (r.error) { out.innerHTML = `<div class="verdict no"><b>Ошибка SQL</b><span>${esc(r.error)}</span></div>`; if (all) failTry(p); return; }
  if (!all) { out.innerHTML = `<div class="verdict ok"><b>Запрос выполнен</b><span>Сверьте результат и нажмите «Отправить».</span></div>${tableHTML(r.cols, r.rows)}`; return; }
  const colsOk = JSON.stringify(r.cols.map(c => c.toLowerCase())) === JSON.stringify(p.cols.map(c => c.toLowerCase()));
  const rowsOk = sameRows(r.rows, p.rows, p.ordered);
  if (colsOk && rowsOk) { solved(p, "sql"); out.innerHTML = `<div class="verdict ok"><b>Принято</b><span>Результат совпал с эталоном: ${p.rows.length} ${plural(p.rows.length, "строка", "строки", "строк")}.</span></div>${tableHTML(r.cols, r.rows, 6)}`; return; }
  failTry(p);
  const why = !colsOk ? `Столбцы должны быть: ${p.cols.join(", ")}. У вас: ${r.cols.join(", ") || "нет"}.` : r.rows.length !== p.rows.length ? `Ожидалось строк — ${p.rows.length}, получено — ${r.rows.length}.` : p.ordered ? "Строки или их порядок не совпадают с ожидаемыми." : "Строки не совпадают с ожидаемыми.";
  out.innerHTML = `<div class="verdict no"><b>Не принято</b><span>${esc(why)}</span></div><div class="grid-2col"><div><div class="eyebrow">Ваш результат</div>${tableHTML(r.cols, r.rows, 8)}</div><div><div class="eyebrow">Ожидалось</div>${tableHTML(p.cols, p.rows, 8)}</div></div>`;
}

function setRunStatus(t) { const el = $("#run-out"); if (el) el.innerHTML = `<p class="note">${esc(t)}</p>`; }

/* judging */
function canon(v, mode) {
  if (mode === "unordered") return JSON.stringify((v || []).map(x => JSON.stringify(x)).sort());
  if (mode === "groups") return JSON.stringify((v || []).map(g => JSON.stringify((g || []).map(y => JSON.stringify(y)).sort())).sort());
  return JSON.stringify(v);
}
function sameAns(got, exp, mode) {
  if (mode === "float") return typeof got === "number" && Math.abs(got - exp) < 1e-5;
  try { return canon(got, mode) === canon(exp, mode); } catch (e) { return false; }
}
const short = v => { const s = JSON.stringify(v); return s && s.length > 160 ? s.slice(0, 157) + "…" : s; };
function fmtArgs(p, args, lang) { const names = lang === "js" ? p.jsparams : p.params; return names.map((n, i) => `${n} = ${short(args[i])}`).join(", "); }

/* views */
let pFilter = { diff: "all", open: false };
function warmPython(force) {
  if (pyReady || pyWorker || (!force && S.lang === "js")) return;
  setTimeout(() => { if (!pyReady && !pyWorker) pyCall({ warm: true }, 90000).then(r => { if (!r.fatal && !r.error) pyReady = true; }); }, 600);
}
function viewPractice() {
  warmPython();
  setTimeout(() => ensureEditor(), 1500);
  const st = practiceStats(), dp = dailyProblem(), L = S.leet;
  const list = PR.filter(p => (pFilter.diff === "all" || p.diff === pFilter.diff) && (!pFilter.open || !isSolved(p.id)));
  const topics = [...new Set(list.map(p => p.topic))];
  const bars = ["easy", "medium", "hard"].map(d => `<div class="pbar"><span>${DIFF[d][0]}</span><div class="bar"><i style="width:${st.by[d][1] ? st.by[d][0] / st.by[d][1] * 100 : 0}%;background:var(--${d === "easy" ? "ok" : d === "medium" ? "gold" : "danger"})"></i></div><b>${st.by[d][0]}/${st.by[d][1]}</b></div>`).join("");
  return `<div class="grid2">
    <section class="card stack"><div><div class="eyebrow">Полигон</div><h2 class="h-sec">${st.solved} из ${st.total} задач решено</h2></div>
      <p class="muted" style="margin:0">Задачи для собеседований: пишете код на Python, JavaScript или SQL, он запускается прямо в приложении и проверяется на тестах. Для остальных языков есть компилятор ниже.</p>
      <div class="pbars">${bars}</div></section>
    <section class="card stack"><div><div class="eyebrow">Задача дня</div><h2 class="h-sec">${esc(dp.title)}</h2></div>
      <div class="row"><span class="pill ${DIFF[dp.diff][1]}">${DIFF[dp.diff][0]}</span><span class="pill">${esc(dp.topic)}</span>${isSolved(dp.id) ? '<span class="pill ok">решено</span>' : ""}</div>
      <div><button class="btn pri big" data-act="openProb" data-id="${dp.id}">Решать</button></div></section>
    ${playCardHTML()}
    <section class="card stack"><div><div class="eyebrow">LeetCode</div><h2 class="h-sec">${L && L.user ? esc(L.user) : "Подключите профиль"}</h2></div>${leetCardBody()}</section>
  </div>
  <section class="card stack" style="margin-top:14px">
    <div class="row" style="justify-content:space-between"><h2 class="h-sec">Все задачи</h2>
      <div class="row"><div class="seg" role="group" aria-label="Сложность">${[["all", "Все"], ["easy", "Лёгкие"], ["medium", "Средние"], ["hard", "Сложные"]].map(([k, t]) => `<button data-act="pf" data-k="${k}" aria-pressed="${pFilter.diff === k}">${t}</button>`).join("")}</div>
      <label class="switch" style="min-height:36px;gap:8px"><span class="note">Только нерешённые</span><input type="checkbox" id="pf-open" ${pFilter.open ? "checked" : ""}></label></div></div>
    ${topics.map(t => `<div class="ptopic"><div class="eyebrow">${esc(t)}</div><div class="list">${list.filter(p => p.topic === t).map(probRow).join("")}</div></div>`).join("") || '<p class="muted">Все задачи этого уровня решены.</p>'}
  </section>`;
}
function probRow(p) {
  const s = S.practice[p.id] || {}, solved = isSolved(p.id);
  const mark = solved ? `<span class="pm ok">${I.check}</span>` : s.tries ? `<span class="pm try"></span>` : `<span class="pm"></span>`;
  const sub = s.solved ? `Решено · ${LANG_NAME[s.lang] || ""}` : s.lc ? "Решено на LeetCode" : s.tries ? `Попыток: ${s.tries}` : esc(p.topic);
  return `<button class="lrow prow" data-act="openProb" data-id="${p.id}">${mark}<span><b>${esc(p.title)}</b><small>${sub}</small></span><span class="pill ${DIFF[p.diff][1]}">${DIFF[p.diff][0]}</span></button>`;
}
function leetCardBody() {
  const L = S.leet;
  if (!L || !L.user) return `<p class="muted" style="margin:0">Укажите никнейм — AVALAND подтянет ваши решённые задачи и засчитает совпадающие.</p>
    <form class="answer" data-act="leetForm"><input class="input" id="leet-user" placeholder="Никнейм на leetcode.com" autocapitalize="off" autocorrect="off" spellcheck="false" maxlength="40"><button class="btn pri" type="submit">Подключить</button></form>
    ${NATIVE ? "" : '<p class="note">Синхронизация работает в приложении для iPhone: браузер не даёт сайтам обращаться к LeetCode напрямую.</p>'}`;
  const c = L.counts || {};
  return `<div class="lcstats">${[["Easy", "ok"], ["Medium", "gold"], ["Hard", "red"]].map(([d, cl]) => `<div><b class="${cl}">${c[d] ?? "—"}</b><small>${d}</small></div>`).join("")}<div><b>${c.All ?? "—"}</b><small>всего</small></div></div>
    <p class="note">${L.syncedAt ? `Обновлено ${new Date(L.syncedAt).toLocaleString("ru-RU", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit" })}. ` : ""}Засчитано из LeetCode: ${(n => n + " " + plural(n, "задача", "задачи", "задач"))(PR.filter(p => S.practice[p.id] && S.practice[p.id].lc).length)}. LeetCode отдаёт только 20 последних решений — обновляйтесь почаще.</p>
    <div class="row"><button class="btn pri" data-act="leetSync">Обновить</button><a class="btn" href="https://leetcode.com/u/${encodeURIComponent(L.user)}/" target="_blank" rel="noopener">Профиль ↗</a><button class="btn ghost" data-act="leetOff">Отключить</button></div>
    <p class="note" id="leet-msg"></p>`;
}

let cur = null;
function openProblem(id) {
  const p = PR[PIDX[id]]; if (!p) return;
  cur = p;
  if (p.kind === "sql") return openSqlProblem(p);
  const lang = S.lang === "js" ? "js" : "py", s = S.practice[id] || {};
  const code = S.drafts[id + ":" + lang] ?? p.starter[lang];
  const ex = p.examples.map((x, k) => `<div class="exbox"><div class="eyebrow">Пример ${k + 1}</div><div><span class="muted">Ввод:</span> <code>${esc(fmtArgs(p, x.a, lang))}</code></div><div><span class="muted">Вывод:</span> <code>${esc(JSON.stringify(x.e))}</code></div>${x.note ? `<div class="muted">${esc(x.note)}</div>` : ""}</div>`).join("");
  shell("", `${esc(p.topic)} · ${DIFF[p.diff][0].toLowerCase()} · ${DIFF[p.diff][2]} XP`, esc(p.title),
    `<div class="row">${isSolved(id) ? `<span class="pill ok">${s.lc && !s.solved ? "решено на LeetCode" : "решено"}</span>` : ""}<a class="pill" href="https://leetcode.com/problems/${p.lc}/" target="_blank" rel="noopener">Похожая на LeetCode ↗</a></div>
     <p class="txt">${p.text}</p>${ex}<p class="note">Ограничения: ${esc(p.limits)}${p.compare === "unordered" || p.compare === "groups" ? ". Порядок в ответе не важен" : ""}</p>
     <div class="row" style="justify-content:space-between"><div class="seg" role="group" aria-label="Язык">${["py", "js"].map(l => `<button data-act="plang" data-l="${l}" aria-pressed="${lang === l}">${LANG_NAME[l]}</button>`).join("")}</div>
       <button class="btn ghost" data-act="pReset">Сбросить код</button></div>
     <div class="edwrap cm" id="code-ed"></div>
     ${keyBar(lang)}
     <div class="acts" style="justify-content:flex-start"><button class="btn big" data-act="pRun">Запустить примеры</button><button class="btn pri big" data-act="pSubmit">Отправить</button></div>
     <div id="run-out" aria-live="polite"></div>
     <div class="row"><button class="btn ghost" data-act="pHint">Подсказка</button><button class="btn ghost" data-act="pSol">${isSolved(id) ? "Эталонное решение" : "Показать решение"}</button></div>
     <div id="p-extra"></div>`);
  openOv();
  mountEditor($("#code-ed"), lang, code, saveDraft, () => runProblem(false));
}
function openSqlProblem(p) {
  const s = S.practice[p.id] || {};
  const code = S.drafts[p.id + ":sql"] ?? p.starter.sql;
  shell("", `${esc(p.topic)} · ${DIFF[p.diff][0].toLowerCase()} · ${DIFF[p.diff][2]} XP`, esc(p.title),
    `<div class="row">${isSolved(p.id) ? `<span class="pill ok">${s.lc && !s.solved ? "решено на LeetCode" : "решено"}</span>` : ""}<span class="pill">SQLite</span><a class="pill" href="https://leetcode.com/problems/${p.lc}/" target="_blank" rel="noopener">Похожая на LeetCode ↗</a></div>
     <p class="txt">${p.text}</p>
     <p class="note">Ожидаемые столбцы: <code>${esc(p.cols.join(", "))}</code>${p.ordered ? "" : ". Порядок строк не важен"}</p>
     ${schemaHTML()}
     <div class="edwrap cm" id="code-ed"></div>
     ${keyBar("sql")}
     <div class="acts" style="justify-content:flex-start"><button class="btn big" data-act="pRun">Выполнить</button><button class="btn pri big" data-act="pSubmit">Отправить</button></div>
     <div id="run-out" aria-live="polite"></div>
     <div class="row"><button class="btn ghost" data-act="pHint">Подсказка</button><button class="btn ghost" data-act="pSol">${isSolved(p.id) ? "Эталонное решение" : "Показать решение"}</button></div>
     <div id="p-extra"></div>`);
  openOv();
  mountEditor($("#code-ed"), "sql", code, saveDraft, () => runProblem(false));
}
function edCode() { return ED ? ED.value : ""; }
let draftT;
function curLang() { return cur && cur.kind === "sql" ? "sql" : S.lang === "js" ? "js" : "py"; }
function saveDraft() { if (!cur) return; clearTimeout(draftT); draftT = setTimeout(() => { S.drafts[cur.id + ":" + curLang()] = edCode(); save(); }, 400); }
async function runProblem(all) {
  const p = cur; if (!p) return;
  if (p.kind === "sql") return runSqlProblem(all);
  const lang = S.lang === "js" ? "js" : "py", code = edCode();
  S.drafts[p.id + ":" + lang] = code; save();
  const tests = all ? p.tests : p.examples;
  const fn = lang === "js" ? p.jsfn : p.fn;
  document.querySelectorAll("[data-act=pRun],[data-act=pSubmit]").forEach(b => b.disabled = true);
  setRunStatus("Выполняю…");
  const r = lang === "js" ? await runJS(code, fn, tests.map(t => t.a)) : await runPY(code, fn, tests.map(t => t.a));
  document.querySelectorAll("[data-act=pRun],[data-act=pSubmit]").forEach(b => b.disabled = false);
  const out = $("#run-out"); if (!out || cur !== p) return;
  const log = r.log ? `<details class="log"><summary>Вывод print / console.log</summary><pre class="code">${esc(r.log)}</pre></details>` : "";
  if (r.error) { out.innerHTML = `<div class="verdict no"><b>Ошибка</b><span>${esc(r.error)}</span></div>${log}`; if (all) failTry(p); return; }
  const rows = tests.map((t, k) => { const g = r.results[k] || {}; return { t, g, ok: !g.err && sameAns(g.v, t.e, p.compare) }; });
  const passedN = rows.filter(x => x.ok).length;
  if (!all) {
    out.innerHTML = `<div class="verdict ${passedN === rows.length ? "ok" : "no"}"><b>${passedN === rows.length ? "Примеры пройдены" : "Есть ошибки"}</b><span>${passedN} из ${rows.length}. ${passedN === rows.length ? "Теперь отправьте решение — его проверят ещё на " + (p.tests.length - p.examples.length) + " скрытых тестах." : ""}</span></div>
      ${rows.map((x, k) => caseHTML(p, x, k + 1, lang)).join("")}${log}`;
    beep(passedN === rows.length ? "ok" : "no");
    return;
  }
  const firstBad = rows.find(x => !x.ok);
  if (!firstBad) { solved(p, lang); out.innerHTML = `<div class="verdict ok"><b>Принято</b><span>Пройдены все тесты: ${rows.length}.</span></div><p class="note">Сложность эталонного решения: ${p.complexity}</p>${log}`; return; }
  failTry(p);
  out.innerHTML = `<div class="verdict no"><b>Не принято</b><span>Пройдено ${passedN} из ${rows.length} тестов. Первый проваленный:</span></div>${caseHTML(p, firstBad, rows.indexOf(firstBad) + 1, lang)}${log}`;
}
function caseHTML(p, x, n, lang) {
  return `<div class="case ${x.ok ? "ok" : "no"}"><div class="row" style="justify-content:space-between"><b>Тест ${n}</b><span>${x.ok ? "✓" : "✗"}</span></div>
    <div><span class="muted">Ввод:</span> <code>${esc(fmtArgs(p, x.t.a, lang))}</code></div>
    <div><span class="muted">Ожидалось:</span> <code>${esc(short(x.t.e))}</code></div>
    ${x.ok ? "" : `<div><span class="muted">Получено:</span> <code>${x.g.err ? esc(x.g.err) : esc(short(x.g.v))}</code></div>`}</div>`;
}
function failTry(p) { pstate(p.id).tries++; save(); beep("no"); haptic("no"); }
function solved(p, lang) {
  const s = pstate(p.id), first = !s.solved;
  s.tries++; s.lang = lang;
  if (first) {
    s.solved = now();
    const xp = s.revealed ? Math.round(DIFF[p.diff][2] / 2) : DIFF[p.diff][2];
    addXP(xp);
    toast(`Задача решена: +${xp} XP`);
  }
  checkAch(); save();
  beep("win"); haptic("ok");
}
function showHint() { const p = cur; $("#p-extra").innerHTML = `<div class="box"><h3>Подсказка</h3><p>${p.hint}</p></div>`; }
function showSol(confirmNow) {
  const p = cur, lang = curLang();
  if (!isSolved(p.id) && !pstate(p.id).revealed && !confirmNow) {
    $("#p-extra").innerHTML = `<div class="box"><h3>Показать решение?</h3><p>Если открыть решение до сдачи, за задачу начислится половина XP. Попробуйте сначала подсказку.</p><div class="row"><button class="btn red" data-act="pSolYes">Показать</button><button class="btn" data-act="pHint">Сначала подсказку</button></div></div>`;
    return;
  }
  if (!isSolved(p.id)) { pstate(p.id).revealed = true; save(); }
  $("#p-extra").innerHTML = `<div class="box"><h3>Эталонное решение · ${LANG_NAME[lang]}</h3>${codeBlock(p.sol[lang], lang === "py" ? "py" : lang === "sql" ? "sql" : "js")}<p>${p.complexity}</p></div>`;
}

/* LeetCode */
const leetQuery = field => `query avaland($u:String!){matchedUser(username:$u){username ${field}{acSubmissionNum{difficulty count}}} recentAcSubmissionList(username:$u,limit:20){title titleSlug timestamp}}`;
async function leetPost(query, user) {
  const r = await P.CapacitorHttp.request({ url: "https://leetcode.com/graphql", method: "POST", headers: { "Content-Type": "application/json", Referer: "https://leetcode.com" }, data: { query, variables: { u: user } }, connectTimeout: 15000, readTimeout: 15000 });
  if (r.status && r.status >= 400) throw new Error("HTTP " + r.status);
  return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
}
async function leetFetch(user) {
  if (!(NATIVE && P.CapacitorHttp)) throw new Error("web");
  let d = await leetPost(leetQuery("submitStatsGlobal"), user);
  if (d && d.errors && !(d.data && d.data.matchedUser)) d = await leetPost(leetQuery("submitStats"), user);
  if (d && d.data && d.data.matchedUser && !d.data.matchedUser.submitStatsGlobal) d.data.matchedUser.submitStatsGlobal = d.data.matchedUser.submitStats;
  return d;
}
async function leetSync(user) {
  const msg = t => { const el = $("#leet-msg"); if (el) el.textContent = t; };
  msg("Синхронизирую…");
  try {
    const d = await leetFetch(user);
    const mu = d && d.data && d.data.matchedUser;
    if (!mu) { msg("Пользователь не найден. Проверьте никнейм."); toast("Профиль LeetCode не найден"); return false; }
    const counts = {};
    ((mu.submitStatsGlobal || {}).acSubmissionNum || []).forEach(x => { counts[x.difficulty] = x.count; });
    const recent = (d.data.recentAcSubmissionList || []).map(x => x.titleSlug);
    let credited = 0;
    PR.forEach(p => { if (recent.includes(p.lc)) { const s = pstate(p.id); if (!s.lc) { s.lc = now(); if (!s.solved) { addXP(Math.round(DIFF[p.diff][2] / 2)); credited++; } } } });
    S.leet = { user: mu.username, counts, recent, syncedAt: Date.now() };
    checkAch(); save();
    toast(credited ? `LeetCode: засчитано задач — ${credited}` : "LeetCode синхронизирован");
    return true;
  } catch (err) {
    if (String(err.message) === "web") { S.leet = { user, counts: {}, recent: [], syncedAt: 0 }; save(); msg("Статистика подтянется в приложении для iPhone."); return true; }
    msg("Не удалось связаться с LeetCode. Проверьте интернет и попробуйте позже.");
    return false;
  }
}

function practiceAction(a, b) {
  if (playAction(a, b)) return true;
  switch (a) {
    case "openProb": openProblem(b.dataset.id); return true;
    case "pf": pFilter.diff = b.dataset.k; render(); return true;
    case "plang": S.lang = b.dataset.l; save(); openProblem(cur.id); return true;
    case "pReset": { const lang = curLang(); delete S.drafts[cur.id + ":" + lang]; save(); if (ED) ED.value = cur.starter[lang]; return true; }
    case "pRun": runProblem(false); return true;
    case "pSubmit": runProblem(true); return true;
    case "pHint": showHint(); return true;
    case "pSol": showSol(false); return true;
    case "pSolYes": showSol(true); return true;
    case "ins": insertKey(b.dataset.t, PL && dlg.querySelector("#pl-ed") ? PL.lang : curLang()); return true;
    case "leetSync": if (S.leet) leetSync(S.leet.user).then(() => render()); return true;
    case "leetOff": S.leet = null; PR.forEach(p => { if (S.practice[p.id]) delete S.practice[p.id].lc; }); save(); render(); return true;
  }
  return false;
}
document.addEventListener("submit", async e => {
  if (!e.target.matches("form[data-act=leetForm]")) return;
  e.preventDefault();
  const u = ($("#leet-user").value || "").trim();
  if (!/^[A-Za-z0-9_.-]{2,40}$/.test(u)) { toast("Никнейм: латиница, цифры, точка, дефис"); return; }
  if (await leetSync(u)) render();
});
document.addEventListener("change", e => { if (e.target.id === "pf-open") { pFilter.open = e.target.checked; render(); } });

/*@PLAYGROUND@*/
