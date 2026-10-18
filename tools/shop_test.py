import json, sys, time, threading, http.server, functools, socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright
ROOT = Path(__file__).resolve().parent.parent; OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/ui2"); OUT.mkdir(parents=True, exist_ok=True)
http.server.SimpleHTTPRequestHandler.extensions_map.update({".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".wasm": "application/wasm"})
H = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / "dist")); H.log_message = lambda *a: None
class Q(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
srv = Q(("127.0.0.1", 8766), H); threading.Thread(target=srv.serve_forever, daemon=True).start()
res = []
def check(n, ok, info=""): res.append(ok); print(("PASS " if ok else "FAIL ") + n + (" — " + str(info) if info else ""))
day = lambda k: time.strftime("%Y-%m-%d", time.localtime(time.time() - k * 86400))
state = {"v": 2, "onboarded": True, "tab": "map", "coins": 1000, "days": {day(3): 30, day(4): 30, day(5): 20}, "inv": {"freeze": 2}}
with sync_playwright() as p:
    b = p.chromium.launch(); ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    ctx.add_init_script(f"if(!sessionStorage.getItem('x')){{localStorage.setItem('avaland-v2', JSON.stringify({json.dumps(state)}));sessionStorage.setItem('x','1')}}")
    pg = ctx.new_page(); errs = []; pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8766/avaland.html?dev", wait_until="load"); pg.wait_for_selector("#coin-chip")
    time.sleep(1.5)
    st = pg.evaluate("JSON.parse(localStorage.getItem('avaland-v2'))")
    check("заморозка спасла серию (2 дня)", st["inv"]["freeze"] == 0 and len(st.get("frozen", {})) == 2, st.get("frozen"))
    check("серия с заморозкой", pg.inner_text("#stats").split("\n")[1].strip() in ("5",), pg.inner_text("#stats")[:60])
    pg.screenshot(path=str(OUT / "header.png"))
    pg.click("#coin-chip"); pg.wait_for_selector(".item"); time.sleep(0.8)
    pg.screenshot(path=str(OUT / "shop.png"), full_page=True)
    pg.click("[data-act=shopBuy][data-id=freeze]"); time.sleep(0.4)
    pg.click("[data-act=shopBuy][data-id=hint]"); time.sleep(0.3)
    pg.select_option("#cp-item", "ml"); pg.click("[data-act=buyCoupon][data-pct='50']"); time.sleep(0.5)
    st = pg.evaluate("JSON.parse(localStorage.getItem('avaland-v2'))")
    check("покупки в Лавке", st["coins"] == 1000 - 150 - 20 - 700 and st["inv"]["freeze"] == 1 and st["inv"]["hint"] == 1 and st["coupons"]["ml"] == 50, (st["coins"], st["inv"], st["coupons"]))
    pg.screenshot(path=str(OUT / "shop-after.png"), full_page=True)
    # path purchase screen
    pg.evaluate("document.querySelector('[data-act=buyPath][data-t=ml]').click()"); pg.wait_for_selector(".price")
    check("цена со скидкой 50%", "2 495 ₸" in pg.inner_text("#dlg"), pg.inner_text(".price"))
    pg.screenshot(path=str(OUT / "buy.png"))
    pg.keyboard.press("Escape")
    # lesson quiz: hint + answers
    pg.evaluate("""() => { const C = window.AVA_CONTENT, L = C.findIndex(x => x.id === 'py');
      window.__q = L; }""")
    pg.evaluate("document.querySelector('[data-tab=map]').click()")
    # start lesson quiz via UI
    pg.evaluate("""() => { const L = window.AVA_CONTENT.findIndex(x => x.id === 'py'); document.body.insertAdjacentHTML('beforeend', `<button id=tst data-act=startLesson data-l=${L} data-i=0></button>`); document.getElementById('tst').click(); }""")
    pg.wait_for_selector("#dlg .qhead")
    n = 0; hinted = False
    for k in range(8):
        if pg.query_selector(".opt"):
            if not hinted and pg.query_selector("[data-act=useHint]"):
                pg.click("[data-act=useHint]"); time.sleep(0.4); hinted = True
                gone = pg.evaluate("document.querySelectorAll('.opt.gone').length")
                check("подсказка 50/50 убрала 2 варианта", gone == 2, gone); pg.screenshot(path=str(OUT / "hint.png"))
            ok = pg.evaluate("""() => { const x = window.__ava.Q.qs[window.__ava.Q.k]; return x.opts.findIndex(o => o.ok); }""")
            pg.click(f".opt >> nth={ok}")
        else:
            ans = pg.evaluate("window.__ava.Q.qs[window.__ava.Q.k].q.ans[0]")
            pg.fill("#ans", ans); pg.click("form.answer button")
        time.sleep(0.25)
        if k == 0: pg.screenshot(path=str(OUT / "correct.png"))
        if pg.query_selector("#nx") is None: break
        last = pg.inner_text("#nx") == "Итоги"
        pg.click("#nx"); time.sleep(0.3)
        if last: break
    pg.wait_for_selector(".res"); time.sleep(1.2)
    pg.screenshot(path=str(OUT / "result.png"))
    st = pg.evaluate("JSON.parse(localStorage.getItem('avaland-v2'))")
    check("монеты за испытание", st["coins"] > 130, st["coins"])
    pg.keyboard.press("Escape")
    # wrong answer anim
    pg.evaluate("""() => { const L = window.AVA_CONTENT.findIndex(x => x.id === 'js'); window.__ava.startQuiz({ mode: 'lesson', l: L, i: 0, qs: [{ q: { t: 'out', q: 'Что выведет код?', c: 'console.log(1+1)', ans: ['2'], e: 'пояснение' }, l: L, i: 0 }] }); }""")
    pg.fill("#ans", "11"); pg.click("form.answer button"); time.sleep(0.15)
    pg.screenshot(path=str(OUT / "wrong.png"))
    check("неверный ответ — тряска", pg.evaluate("document.querySelector('#dlg').classList.contains('shake')"))
    pg.keyboard.press("Escape")
    # premium cave
    pg.goto("http://127.0.0.1:8766/avaland.html?dev", wait_until="load"); pg.wait_for_selector("#map .cavemk")
    pg.evaluate("window.__ava.openTrack('fe')"); pg.wait_for_selector(".roadmap"); time.sleep(0.6)
    check("PRO на платных пещерах", pg.evaluate("document.querySelectorAll('.rm .pill').length") >= 3 and "PRO" in pg.inner_text(".roadmap") and pg.query_selector(".box.premium") is not None)
    pg.screenshot(path=str(OUT / "roadmap-pro.png"), full_page=True)
    pg.keyboard.press("Escape")
    pg.evaluate("window.__ava.openCountry(window.AVA_CONTENT.findIndex(L => L.id === 'next'))"); pg.wait_for_selector(".box.premium")
    check("пещера 2 закрыта до покупки", "Закрыто" in pg.inner_text("#dlg"))
    pg.keyboard.press("Escape")
    pg.evaluate("window.__ava.S.owned = { fe: 1 }; window.__ava.save()")
    pg.evaluate("window.__ava.openCountry(window.AVA_CONTENT.findIndex(L => L.id === 'next'))"); time.sleep(0.3)
    check("после покупки пещера открыта", pg.query_selector("#dlg .box.premium") is None and "Учить" in pg.inner_text("#dlg"))
    pg.keyboard.press("Escape")
    # shop on desktop
    pg.set_viewport_size({"width": 1280, "height": 900}); pg.evaluate("document.querySelector('[data-tab=shop]').click()"); time.sleep(1)
    pg.screenshot(path=str(OUT / "shop-desktop.png"), full_page=True)
    check("ошибок JS нет", not errs, errs[:3])
    b.close()
srv.shutdown(); print(f"{sum(res)}/{len(res)}")
