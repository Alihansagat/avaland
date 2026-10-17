#!/usr/bin/env python3
"""Check that every lesson example, after wrapProgram() from src/playground.js turns it into a full
program, compiles and runs with real toolchains. Also checks the compiler's starter programs.

Usage: python3 tools/verify_wrap.py [lang ...]
"""
import json, subprocess, sys, tempfile, re
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
sys.path.insert(0, str(ROOT / "tools"))
from verify_outputs import run, SWIFT  # noqa: E402
UNCHECKED = ("dart", "sql") if SWIFT.exists() else ("dart", "swift", "sql")

TMP = Path(tempfile.mkdtemp(prefix="ava-wrap-"))
NODE = r"""
const fs = require("fs"), vm = require("vm");
const src = fs.readFileSync(process.argv[1], "utf8");
const cut = src.slice(0, src.indexOf("/* --- JavaScript / TypeScript"));
const ctx = {}; vm.createContext(ctx); vm.runInContext(cut + ";this.wrapProgram = wrapProgram; this.PLAY_START = PLAY_START; this.PLAY_STDIN = PLAY_STDIN;", ctx);
global.window = {}; require(process.argv[2]);
const out = [];
for (const L of window.AVA_CONTENT) L.lessons.forEach((l, i) => out.push({ lang: L.cave || L.id, key: L.id + ":" + i, where: L.id + " · урок " + (i + 1) + " «" + l.t + "»", code: ctx.wrapProgram(L.cave || L.id, l.code), stdin: "Аня\n20\n5\n3\n" }));
for (const [lang, code] of Object.entries(ctx.PLAY_START)) if (lang !== "base") out.push({ lang, where: "стартовый пример компилятора", code, stdin: ctx.PLAY_STDIN[lang] || "" });
console.log(JSON.stringify(out));
"""


def prog(lang, code, d):
    if lang in ("py", "base"):
        (d / "a.py").write_text(code); return ["python3", "a.py"]
    if lang == "js":
        (d / "a.js").write_text("const readline=()=>null;\n" + code); return ["node", "a.js"]
    if lang == "ts":
        (d / "a.ts").write_text(code); return ["bun", "a.ts"]
    if lang == "rb":
        (d / "a.rb").write_text(code); return ["ruby", "a.rb"]
    if lang == "php":
        (d / "a.php").write_text(code); return ["php", "a.php"]
    if lang == "sql":
        (d / "a.sql").write_text(code); return None
    if lang == "cpp":
        (d / "a.cpp").write_text(code)
        rc, o, e = run(["g++", "-std=c++20", "-w", "-o", "a", "a.cpp"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["./a"]
    if lang == "java":
        (d / "Main.java").write_text(code)
        rc, o, e = run(["javac", "-nowarn", "Main.java"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["java", "-cp", ".", "Main"]
    if lang == "go":
        (d / "main.go").write_text(code); return ["go", "run", "main.go"]
    if lang == "rs":
        (d / "a.rs").write_text(code)
        rc, o, e = run(["rustc", "--edition", "2021", "-A", "warnings", "-o", "a", "a.rs"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["./a"]
    if lang == "cs":
        (d / "p.csproj").write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><Nullable>disable</Nullable><NoWarn>CS8321;CS0168;CS0219;CS1998</NoWarn><UseAppHost>false</UseAppHost><RestoreSources>/tmp/claude-0/cst</RestoreSources></PropertyGroup></Project>')
        (d / "Program.cs").write_text(code)
        rc, o, e = run(["dotnet", "build", "-nologo", "-v", "q", "-o", "out"], cwd=d, timeout=180)
        if rc: raise RuntimeError(o + e)
        return ["dotnet", "out/p.dll"]
    if lang == "kt":
        (d / "a.kt").write_text(code)
        rc, o, e = run(["kotlinc", "a.kt", "-nowarn", "-include-runtime", "-d", "a.jar"], cwd=d, timeout=240)
        if rc: raise RuntimeError(e)
        return ["java", "-jar", "a.jar"]
    if lang == "swift" and SWIFT.exists():
        (d / "main.swift").write_text(code)
        rc, o, e = run([str(SWIFT / "usr/libexec/swift/bin/swiftc"), "-resource-dir", str(SWIFT / "usr/lib/swift"), "main.swift", "-o", "a"], cwd=d, timeout=240)
        if rc: raise RuntimeError(e)
        return ["./a"]
    return None  # dart: checked on Compiler Explorer


def main():
    only = set(a for a in sys.argv[1:] if not a.startswith("--"))
    subprocess.run([sys.executable, str(ROOT / "build_content.py"), str(TMP / "content.js")], check=True, stdout=subprocess.DEVNULL)
    items = json.loads(subprocess.run(["node", "-e", NODE, str(ROOT / "src" / "playground.js"), str(TMP / "content.js")], capture_output=True, text=True, check=True).stdout)
    json.dump(items, open(TMP / "programs.json", "w"), ensure_ascii=False)
    bad = skipped = ok = 0
    failed = []
    for n, x in enumerate(items):
        if only and x["lang"] not in only:
            continue
        d = TMP / f"w{n}"; d.mkdir()
        try:
            cmd = prog(x["lang"], x["code"], d)
        except RuntimeError as e:
            bad += 1; failed.append(x.get("key")); print(f"\n### {x['lang']} · {x['where']}: НЕ КОМПИЛИРУЕТСЯ\n{x['code']}\n---\n{str(e)[-1200:]}"); continue
        if cmd is None:
            skipped += 1; continue
        try:
            rc, o, e = run(cmd, cwd=d, inp=x["stdin"], timeout=60)
        except subprocess.TimeoutExpired:
            bad += 1; failed.append(x.get("key")); print(f"\n### {x['lang']} · {x['where']}: ЗАВИС"); continue
        if rc:
            bad += 1; failed.append(x.get("key")); print(f"\n### {x['lang']} · {x['where']}: ошибка выполнения {rc}\n{x['code']}\n---\n{e[-800:]}")
        else:
            ok += 1
    if not only and "--write" in sys.argv:
        pass
    keys = sorted(k for k in failed if k)
    if "--write" in sys.argv:
        path = ROOT / "content" / "norun.list"
        old = [l for l in path.read_text().splitlines() if l and not l.startswith("#")] if path.exists() else []
        langs_checked = {x["lang"] for x in items if (not only or x["lang"] in only) and x["lang"] not in UNCHECKED}
        id2lang = {x["key"].split(":")[0]: x["lang"] for x in items if x.get("key")}
        keep = [k for k in old if id2lang.get(k.split(":")[0], k.split(":")[0]) not in langs_checked]
        path.write_text("# Уроки, пример из которых нельзя запустить отдельно (фреймворк, несколько файлов, заглушки).\n# Файл обновляет tools/verify_wrap.py --write; Dart и Swift проверяются на godbolt.org.\n" + "\n".join(sorted(set(keep + keys))) + "\n")
        print("записан", path)
    print(f"\nработает: {ok}, проблем: {bad}, пропущено (dart/swift/sql): {skipped}\nprograms: {TMP / 'programs.json'}")


if __name__ == "__main__":
    main()
