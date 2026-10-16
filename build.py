#!/usr/bin/env python3
"""Build AVALAND.

  dist/avaland.html   — single-file web version (Google Fonts, dev time machine)
  app/www/            — offline bundle for Capacitor / App Store (local fonts, no dev tools)
"""
import shutil, subprocess, sys
from pathlib import Path

ROOT = Path(__file__).parent
SRC = ROOT / "src"
FONTS = ROOT / "fonts"          # woff2 files from @fontsource


PYODIDE_FILES = ["pyodide.mjs", "pyodide.asm.mjs", "pyodide.asm.wasm", "python_stdlib.zip", "pyodide-lock.json"]


def run_content():
    subprocess.run([sys.executable, str(ROOT / "build_content.py"), str(SRC / "content.js")], check=True)
    subprocess.run([sys.executable, str(ROOT / "practice" / "build_practice.py"), str(SRC / "practice.js")], check=True)


def copy_sqljs(dest):
    src = ROOT / "app" / "node_modules" / "sql.js" / "dist"
    if not src.exists():
        sys.exit("Нет app/node_modules/sql.js — выполните `npm install` в папке app")
    (dest / "sqljs").mkdir(parents=True, exist_ok=True)
    for f in ("sql-wasm.js", "sql-wasm.wasm"):
        shutil.copy(src / f, dest / "sqljs" / f)


def copy_vendor(dest):
    (dest / "vendor").mkdir(parents=True, exist_ok=True)
    for f in (SRC / "vendor").iterdir():
        shutil.copy(f, dest / "vendor" / f.name)


def copy_pyodide(dest):
    src = ROOT / "app" / "node_modules" / "pyodide"
    if not src.exists():
        sys.exit("Нет app/node_modules/pyodide — выполните `npm install` в папке app")
    (dest / "pyodide").mkdir(parents=True, exist_ok=True)
    for f in PYODIDE_FILES:
        shutil.copy(src / f, dest / "pyodide" / f)


def fonts_css():
    faces = [
        ("Russo One", 400, "russo-one-cyrillic-400-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"),
        ("Russo One", 400, "russo-one-latin-400-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"),
    ]
    for w in (400, 500, 600, 700):
        faces.append(("Golos Text", w, f"golos-text-cyrillic-{w}-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"))
        faces.append(("Golos Text", w, f"golos-text-latin-{w}-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"))
    for w in (400, 600):
        faces.append(("JetBrains Mono", w, f"jetbrains-mono-cyrillic-{w}-normal.woff2", "U+0301,U+0400-045F,U+0490-0491,U+04B0-04B1,U+2116"))
        faces.append(("JetBrains Mono", w, f"jetbrains-mono-latin-{w}-normal.woff2", "U+0000-00FF,U+0131,U+0152-0153,U+02BB-02BC,U+02C6,U+02DA,U+02DC,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD"))
    css = []
    for fam, w, f, rng in faces:
        css.append(f'@font-face{{font-family:"{fam}";font-style:normal;font-weight:{w};font-display:swap;src:url(fonts/{f}) format("woff2");unicode-range:{rng}}}')
    return "\n".join(css), [f for *_, f, _ in faces]


SELFTEST = "--selftest" in sys.argv


def main():
    run_content()
    css = (SRC / "style.css").read_text(encoding="utf-8")
    body = (SRC / "body.html").read_text(encoding="utf-8")
    content = (SRC / "content.js").read_text(encoding="utf-8")
    practice = (SRC / "practice.js").read_text(encoding="utf-8")
    sqldb = (SRC / "sqldb.js").read_text(encoding="utf-8")
    app = (SRC / "app.js").read_text(encoding="utf-8").replace("/*@PRACTICE@*/", (SRC / "practice-ui.js").read_text(encoding="utf-8"))
    app = app.replace("/*@PLAYGROUND@*/", (SRC / "playground.js").read_text(encoding="utf-8"))
    app = app.replace("/*@CLOUD@*/", (SRC / "cloud.js").read_text(encoding="utf-8"))

    # 1) web / artifact build
    dist = ROOT / "dist"; dist.mkdir(exist_ok=True)
    web = f"""<title>AVALAND</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Russo+One&family=Golos+Text:wght@400;500;600;700&family=JetBrains+Mono:wght@400;600&display=swap">
<style>
{css}
</style>
{body}
<script>window.AVA_DEV=/[?&#]dev([&=]|$)/.test(location.search + location.hash);window.AVA_WEB=true;</script>
<script src="sqljs/sql-wasm.js"></script>
<script>
{content}
</script>
<script>
{practice}
</script>
<script>
{sqldb}
</script>
<script>
{app}
</script>
"""
    (dist / "avaland.html").write_text(web, encoding="utf-8")
    copy_sqljs(dist)
    copy_pyodide(dist)
    copy_vendor(dist)
    import base64
    (dist / "pyodide" / "python_stdlib.b64.txt").write_text(base64.b64encode((dist / "pyodide" / "python_stdlib.zip").read_bytes()).decode())
    (dist / "pyodide" / "python_stdlib.zip").unlink()
    if (dist / "pyodide" / "python_stdlib.txt").exists():
        (dist / "pyodide" / "python_stdlib.txt").unlink()
    shutil.copy(SRC / "py-worker.js", dist / "py-worker.js")

    # 1b) GitHub Pages copy (docs/play)
    docs_play = ROOT / "docs" / "play"
    if docs_play.exists():
        page = web.replace('<meta name="claude:viewport-fit-sides" content="cover">\n', "").replace("<title>AVALAND</title>\n", "", 1)
        (docs_play / "index.html").write_text(
            '<!doctype html>\n<html lang="ru">\n<head>\n<meta charset="utf-8">\n'
            '<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">\n'
            '<meta name="theme-color" content="#0a1b29">\n<link rel="icon" href="icons/icon-192.png">\n'
            '<link rel="manifest" href="manifest.webmanifest">\n<link rel="apple-touch-icon" href="icons/icon-180.png">\n'
            '<meta name="apple-mobile-web-app-capable" content="yes">\n<meta name="mobile-web-app-capable" content="yes">\n'
            '<meta name="apple-mobile-web-app-status-bar-style" content="black-translucent">\n<meta name="apple-mobile-web-app-title" content="AVALAND">\n'
            '<meta name="description" content="Учите 15 языков программирования, захватывая карту мира кода: уроки, тесты, задачи и компилятор.">\n'
            '<style>:root{padding-top:env(safe-area-inset-top,0px);padding-bottom:env(safe-area-inset-bottom,0px)}[hidden]{display:none!important}</style>\n'
            '<title>AVALAND — играть</title>\n</head>\n<body>\n' + page + '\n</body>\n</html>\n', encoding="utf-8")
        # On GitHub Pages the Python and SQLite runtimes come from jsDelivr (no CSP there), so the repo stays small
        cdn_py = "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/"
        cdn_sql = "https://cdn.jsdelivr.net/npm/sql.js@1.14.2/dist/"
        html = (docs_play / "index.html").read_text(encoding="utf-8")
        html = html.replace('<script src="sqljs/sql-wasm.js"></script>', f'<script>window.AVA_SQL_BASE="{cdn_sql}";</script>\n<script src="{cdn_sql}sql-wasm.js"></script>')
        html = html.replace("window.AVA_WEB=true;", 'window.AVA_WEB=true;window.AVA_SW="sw.js";', 1)
        (docs_play / "index.html").write_text(html, encoding="utf-8")
        worker = (SRC / "py-worker.js").read_text(encoding="utf-8")
        worker = worker.replace('import { loadPyodide } from "./pyodide/pyodide.mjs";', f'import {{ loadPyodide }} from "{cdn_py}pyodide.mjs";')
        worker = worker.replace('const base = new URL("pyodide/", import.meta.url).href;', f'const base = "{cdn_py}";')
        worker = worker.replace('const web = new URL(self.location.href).searchParams.has("web");', "const web = false;")
        (docs_play / "py-worker.js").write_text(worker, encoding="utf-8")
        copy_vendor(docs_play)
        import hashlib
        ver = hashlib.sha1((html + worker).encode("utf-8")).hexdigest()[:10]
        (docs_play / "sw.js").write_text((SRC / "sw.js").read_text(encoding="utf-8").replace("@VERSION@", ver), encoding="utf-8")

    # 2) native bundle
    www = ROOT / "app" / "www"
    if www.exists(): shutil.rmtree(www)
    (www / "fonts").mkdir(parents=True)
    fcss, files = fonts_css()
    for f in files:
        shutil.copy(FONTS / f, www / "fonts" / f)
    (www / "fonts.css").write_text(fcss, encoding="utf-8")
    (www / "style.css").write_text(css, encoding="utf-8")
    (www / "content.js").write_text(content, encoding="utf-8")
    (www / "app.js").write_text(app, encoding="utf-8")
    (www / "practice.js").write_text(practice, encoding="utf-8")
    shutil.copy(SRC / "py-worker.js", www / "py-worker.js")
    copy_pyodide(www)
    copy_sqljs(www)
    copy_vendor(www)
    if SELFTEST:
        shutil.copy(SRC / "selftest.js", www / "selftest.js")
    (www / "sqldb.js").write_text(sqldb, encoding="utf-8")
    (www / "index.html").write_text(f"""<!doctype html>
<html lang="ru">
<head>
<meta charset="utf-8">
<meta name="viewport" content="width=device-width, initial-scale=1, viewport-fit=cover">
<meta name="color-scheme" content="dark">
<meta name="theme-color" content="#0a1b29">
<title>AVALAND</title>
<link rel="stylesheet" href="fonts.css">
<link rel="stylesheet" href="style.css">
<style>:root{{padding-top:env(safe-area-inset-top,0px)}} body{{-webkit-user-select:none;user-select:none}} input,textarea,pre,.txt,.q{{-webkit-user-select:text;user-select:text}}</style>
</head>
<body>
{body}
<script src="content.js"></script>
<script src="practice.js"></script>
<script src="sqldb.js"></script>
<script src="sqljs/sql-wasm.js"></script>
{"<script>window.AVA_SELFTEST=true;</script>" if SELFTEST else ""}
<script src="app.js"></script>
{"<script src=\"selftest.js\"></script>" if SELFTEST else ""}
</body>
</html>
""", encoding="utf-8")
    print("built:", dist / "avaland.html", "and", www)


if __name__ == "__main__":
    main()
