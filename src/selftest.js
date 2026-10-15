/* Самопроверка сборки на устройстве: запускается только в тестовой сборке (build.py --selftest) */
(async () => {
  const box = document.createElement("pre");
  box.style.cssText = "position:fixed;left:8px;right:8px;top:60px;z-index:99;background:#000c;color:#9f9;font:12px/1.4 monospace;padding:10px;border-radius:10px;white-space:pre-wrap;max-height:80vh;overflow:auto";
  document.body.appendChild(box);
  const log = s => { box.textContent += s + "\n"; };
  const t0 = performance.now();
  const ms = () => Math.round(performance.now() - t0) + "ms";
  log("SELFTEST " + navigator.userAgent.slice(0, 60));
  window.addEventListener("error", e => log("ERR " + e.message));
  window.addEventListener("unhandledrejection", e => log("REJ " + (e.reason && e.reason.message || e.reason)));
  const a = window.__ava;
  try {
    const P = window.AVA_PRACTICE;
    const js = P.find(p => p.id === "pair-sum");
    const r1 = await a.runJS(js.sol.js, js.jsfn, js.tests.map(t => t.a));
    log("JS: " + (r1.error || r1.results.length + " results") + " " + ms());
    const r2 = await a.runPY(js.sol.py, js.fn, js.tests.map(t => t.a));
    log("PY: " + (r2.error || r2.results.length + " results, first=" + JSON.stringify(r2.results[0])) + " " + ms());
    const ok = r2.results && r2.results.every((g, i) => JSON.stringify(g.v) === JSON.stringify(js.tests[i].e));
    log("PY correct: " + ok);
    const r3 = await a.runSQL("SELECT COUNT(*) AS n FROM orders");
    log("SQL: " + (r3.error || JSON.stringify(r3.rows)) + " " + ms());
    const Cap = window.Capacitor;
    log("native: " + !!(Cap && Cap.isNativePlatform && Cap.isNativePlatform()) + " plugins: " + Object.keys((Cap && Cap.Plugins) || {}).join(","));
    try {
      const d = await a.leetFetch("lee215");
      const mu = d && d.data && d.data.matchedUser;
      log("LeetCode: " + (mu ? mu.username + " " + JSON.stringify(mu.submitStatsGlobal.acSubmissionNum[0]) + " recent=" + d.data.recentAcSubmissionList.length : "no user " + JSON.stringify(d).slice(0, 120)) + " " + ms());
    } catch (err) { log("LeetCode ERR " + err.message); }
    try {
      const perm = Cap.Plugins.LocalNotifications && await Cap.Plugins.LocalNotifications.checkPermissions();
      log("Notif perm: " + JSON.stringify(perm));
    } catch (err) { log("Notif ERR " + err.message); }
    try { await Cap.Plugins.Preferences.set({ key: "selftest", value: "1" }); const v = await Cap.Plugins.Preferences.get({ key: "selftest" }); log("Prefs: " + v.value); } catch (err) { log("Prefs ERR " + err.message); }
    log("DONE " + ms());
  } catch (err) { log("FATAL " + err.message); }
})();
