#!/usr/bin/env python3
"""Headless UI smoke test of the web build (dist/). Usage: python3 tools/ui_test.py [outdir]"""
import json, subprocess, sys, time, threading, http.server, functools, socketserver
from pathlib import Path
from playwright.sync_api import sync_playwright

ROOT = Path(__file__).resolve().parent.parent
OUT = Path(sys.argv[1] if len(sys.argv) > 1 else "/tmp/claude-0/ui"); OUT.mkdir(parents=True, exist_ok=True)

Handler = functools.partial(http.server.SimpleHTTPRequestHandler, directory=str(ROOT / "dist"))
class Q(socketserver.ThreadingMixIn, http.server.HTTPServer): daemon_threads = True
Handler.log_message = lambda *a: None
http.server.SimpleHTTPRequestHandler.extensions_map.update({".html": "text/html; charset=utf-8", ".js": "text/javascript; charset=utf-8", ".txt": "text/plain; charset=utf-8", ".mjs": "text/javascript; charset=utf-8", ".wasm": "application/wasm"})
srv = Q(("127.0.0.1", 8765), Handler); threading.Thread(target=srv.serve_forever, daemon=True).start()

state = {"v": 2, "onboarded": True, "tab": "map"}
results = []
def check(name, ok, info=""):
    results.append((name, ok, info)); print(("PASS " if ok else "FAIL ") + name + (" — " + info if info else ""))

with sync_playwright() as p:
    b = p.chromium.launch()
    ctx = b.new_context(viewport={"width": 390, "height": 844}, device_scale_factor=2)
    ctx.add_init_script(f"localStorage.setItem('avaland-v2', JSON.stringify({json.dumps(state)}));")
    pg = ctx.new_page()
    errs = []
    pg.on("pageerror", lambda e: errs.append(str(e)))
    pg.goto("http://127.0.0.1:8765/avaland.html?dev", wait_until="load")
    pg.wait_for_function("window.__ava")

    # 1. answer checking: "3, 1, 8" for the output "3 1 8"
    pg.evaluate("""() => { const A = window.__ava; const L = 9; A.startQuiz({ mode: 'lesson', l: L, i: 0, qs: [{ q: { t: 'out', q: 'Что выведет код?', c: 'print(7 // 2, 7 % 3, 2 ** 3)', ans: ['3 1 8'], e: 'пояснение' }, l: L, i: 0 }] }); }""")
    pg.fill("#ans", "3, 1, 8"); pg.click("form.answer button")
    txt = pg.inner_text("#after")
    check("ответ «3, 1, 8» засчитан", "Верно" in txt, txt[:80])
    pg.screenshot(path=str(OUT / "quiz.png"))

    def play(lang, expect, timeout=90000, stdin=None):
        pg.evaluate(f"window.__ava.openPlay('{lang}')")
        pg.wait_for_selector("#pl-ed .cm-editor", timeout=20000)
        if stdin is not None: pg.evaluate(f"document.querySelector('#pl-in').value = {json.dumps(stdin)}")
        pg.click("[data-act=plRun]")
        try:
            pg.wait_for_function(f"document.querySelector('#pl-out') && document.querySelector('#pl-out').innerText.includes({json.dumps(expect)})", timeout=timeout)
            check(f"компилятор {lang}", True)
        except Exception:
            check(f"компилятор {lang}", False, pg.inner_text("#pl-out")[:300])
        pg.screenshot(path=str(OUT / f"play-{lang}.png"))

    play("py", "Привет, Аня!", stdin="Аня")
    play("js", "Привет, Аня!", stdin="Аня")
    play("ts", "Старше 20")
    play("sql", "Строк:")

    # editor typing works (CodeMirror)
    pg.evaluate("window.__ava.openPlay('py', 'print(1 + 1)\\n')")
    pg.wait_for_selector("#pl-ed .cm-editor")
    pg.click("#pl-ed .cm-content"); pg.keyboard.press("End"); pg.keyboard.press("Control+End")
    pg.keyboard.type("for i in range(3):\nprint(i * 10)\n")
    code = pg.evaluate("document.querySelector('#pl-ed .cm-content').innerText")
    check("автоотступ в редакторе", "    print(i * 10)" in code, code.replace("\n", " | ")[:120])
    pg.click("[data-act=plRun]")
    pg.wait_for_function("document.querySelector('#pl-out').innerText.includes('20')", timeout=30000)
    check("запуск напечатанного кода", "0\n10\n20" in pg.inner_text("#pl-out") or "20" in pg.inner_text("#pl-out"))

    # lesson -> run example
    pg.evaluate("window.__ava.openLesson(window.AVA_CONTENT.findIndex(L => L.id === 'py'), 1)")
    pg.click("[data-act=playLesson]")
    pg.wait_for_selector("#pl-ed .cm-editor")
    pg.click("[data-act=plRun]")
    try: pg.wait_for_function("/Завершено|завершения|Ошибка/.test(document.querySelector('#pl-out').innerText)", timeout=30000)
    except Exception: pass
    check("пример урока Python запускается", "Завершено" in pg.inner_text("#pl-out"), pg.inner_text("#pl-out")[:200])
    pg.screenshot(path=str(OUT / "lesson-run.png"))
    pg.keyboard.press("Escape")

    # profile: account card
    pg.evaluate("document.querySelector('[data-tab=profile]').click()")
    pg.wait_for_selector("form[data-act=authForm]")
    check("карточка аккаунта", "Сохраните прогресс" in pg.inner_text("#view"))
    pg.screenshot(path=str(OUT / "profile.png"), full_page=True)

    # practice problem with CodeMirror
    pg.evaluate("document.querySelector('[data-tab=practice]').click()")
    pg.wait_for_selector("[data-act=play]")
    pg.screenshot(path=str(OUT / "practice.png"), full_page=True)
    pid = pg.evaluate("document.querySelector('[data-act=openProb]').dataset.id")
    pg.evaluate(f"window.__ava.openProblem('{pid}')")
    pg.wait_for_selector("#code-ed .cm-editor")
    check("редактор в задаче", True)
    pg.screenshot(path=str(OUT / "problem.png"))

    check("ошибок JS на странице нет", not errs, "; ".join(errs)[:300])
    b.close()
srv.shutdown()
print(f"\n{sum(r[1] for r in results)}/{len(results)} passed")
sys.exit(0 if all(r[1] for r in results) else 1)
