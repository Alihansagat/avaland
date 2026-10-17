#!/usr/bin/env python3
"""Run every «Что выведет код?» snippet with the real compiler/interpreter and
compare the program output with the expected answers in content/*.txt.

Usage: python3 tools/verify_outputs.py [lang ...]
Needs on PATH: python3, node, g++, javac/java, go, rustc, php, ruby, bun (TS),
dotnet (C#), kotlinc (Kotlin). Dart and Swift snippets are listed for manual review.
"""
import json, os, re, subprocess, sys, tempfile
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
TMP = Path(tempfile.mkdtemp(prefix="ava-verify-"))


def load():
    subprocess.run([sys.executable, str(ROOT / "build_content.py"), str(TMP / "content.js")], check=True, stdout=subprocess.DEVNULL)
    js = (TMP / "content.js").read_text(encoding="utf-8")
    first = js.split("\nwindow.AVA_TRACKS=")[0]
    data = json.loads(first[first.index("=") + 1:].rstrip().rstrip(";"))
    res = []
    for L in data:
        items = [(f"урок {i + 1}, вопрос {j + 1}", q) for i, l in enumerate(L["lessons"]) for j, q in enumerate(l["q"])]
        items += [(f"экзамен, вопрос {j + 1}", q) for j, q in enumerate(L["exam"])]
        for where, q in items:
            if q["t"] == "out":
                res.append(dict(lang=L.get("cave", L["id"]), src=L["id"], where=L["id"] + " · " + where, q=q["q"], c=q.get("c"), ans=q["ans"]))
    return res


def norm(s):
    # same idea as the app: case-insensitive, spaces around brackets/commas don't matter
    s = s.strip().lower()
    s = re.sub(r"([\[\](){},;:])", r" \1 ", s)
    return re.sub(r"\s+", " ", s).strip()


DECL = {
    "go": r"^(type|func)\s",
    "cpp": r"^(template\s*<|struct\s|class\s|(static\s+)?(inline\s+)?(void|int|long|double|bool|auto|std::\w+|\w+)\s*[&*]?\s+\w+\s*\([^;]*\)\s*(const\s*)?\{?\s*$|(void|int|long|double|bool|auto|std::\w+)\s+\w+\s*\(.*\)\s*\{.*\}\s*$)",
    "java": r"^(static\s|record\s|class\s|interface\s|enum\s)",
    "rs": r"^(#\[|(fn|struct|enum|impl|trait|use)\s)",
    "kt": r"^(fun|class|data class|enum class|object|interface|sealed)\s",
}


def split_decls(lang, code):
    """Separate top-level declarations from statements that must go into main()."""
    pat = DECL.get(lang)
    if not pat:
        return "", code
    decls, stmts, depth, in_decl = [], [], 0, False
    for line in code.splitlines():
        if re.match(r"^\s*//\s*в main", line):
            continue
        if not in_decl and depth == 0 and re.match(pat, line):
            in_decl = True
        (decls if in_decl else stmts).append(line)
        if in_decl:
            depth += line.count("{") - line.count("}")
            if depth <= 0:
                in_decl, depth = False, 0
    return "\n".join(decls), "\n".join(stmts)


def run(cmd, cwd=None, inp=None, timeout=60):
    p = subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, input=inp)
    return p.returncode, p.stdout, p.stderr


SWIFT = Path("/tmp/claude-0/sw/root")  # swiftlang .deb from archive.ubuntu.com, unpacked
GO_PKGS = ["fmt", "strings", "sort", "errors", "strconv", "sync", "time", "os", "math", "slices", "maps", "unicode"]


def build(lang, code, d):
    """Return (command, cwd) to run snippet `code` placed in dir d."""
    if lang == "py":
        (d / "a.py").write_text(code); return ["python3", "a.py"]
    if lang == "js":
        (d / "a.js").write_text(code); return ["node", "a.js"]
    if lang == "ts":
        (d / "a.ts").write_text(code); return ["bun", "a.ts"]
    if lang == "rb":
        (d / "a.rb").write_text(code); return ["ruby", "a.rb"]
    if lang == "php":
        (d / "a.php").write_text(code if code.lstrip().startswith("<?php") else "<?php\n" + code); return ["php", "a.php"]
    if lang == "cpp":
        src = "#include <bits/stdc++.h>\n"
        if re.search(r"\bint\s+main\s*\(", code): src += code
        else:
            dc, st = split_decls("cpp", code); src += dc + "\nint main() {\n" + st + "\n}\n"
        (d / "a.cpp").write_text(src)
        rc, o, e = run(["g++", "-std=c++20", "-O0", "-w", "-o", "a", "a.cpp"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["./a"]
    if lang == "java":
        if "static void main" not in code:
            imports = "\n".join(l for l in code.splitlines() if l.startswith("import "))
            body = "\n".join(l for l in code.splitlines() if not l.startswith("import "))
            dc, st = split_decls("java", body)
            dc = re.sub(r"^(class|record|interface|enum)\s", r"static \1 ", dc, flags=re.M)
            code = f"import java.util.*;\nimport java.util.stream.*;\n{imports}\npublic class Main {{\n{dc}\npublic static void main(String[] args) throws Exception {{\n{st}\n}}\n}}\n"
        else:
            code = "import java.util.*;\nimport java.util.stream.*;\n" + code
        m = re.search(r"public\s+class\s+(\w+)", code)
        name = m.group(1) if m else "Main"
        if not m:
            code = re.sub(r"^class\s+(\w+)\s*\{(?=[^}]*static void main)", "public class Main {", code, count=1, flags=re.M)
        (d / f"{name}.java").write_text(code)
        rc, o, e = run(["javac", "-nowarn", f"{name}.java"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["java", "-cp", ".", name]
    if lang == "go":
        if "package main" not in code:
            if re.search(r"\bfunc\s+main\s*\(", code): body = code
            else:
                dc, st = split_decls("go", code); body = dc + "\nfunc main() {\n" + st + "\n}\n"
            used = [p for p in GO_PKGS if re.search(rf"\b{p}\.", body)]
            code = "package main\n" + "".join(f'import "{p}"\n' for p in used) + body
        (d / "main.go").write_text(code)
        return ["go", "run", "main.go"]
    if lang == "rs":
        if re.search(r"\bfn\s+main\s*\(", code): src = code
        else:
            dc, st = split_decls("rs", code); src = dc + "\nfn main() {\n" + st + "\n}\n"
        (d / "a.rs").write_text("#![allow(warnings)]\n" + src)
        rc, o, e = run(["rustc", "--edition", "2021", "-o", "a", "a.rs"], cwd=d)
        if rc: raise RuntimeError(e)
        return ["./a"]
    if lang == "cs":
        (d / "p.csproj").write_text('<Project Sdk="Microsoft.NET.Sdk"><PropertyGroup><OutputType>Exe</OutputType><TargetFramework>net8.0</TargetFramework><ImplicitUsings>enable</ImplicitUsings><Nullable>disable</Nullable><NoWarn>CS8321;CS0168;CS0219;CS1998</NoWarn><UseAppHost>false</UseAppHost><RestoreSources>/tmp/claude-0/cst</RestoreSources></PropertyGroup></Project>')
        (d / "Program.cs").write_text(code)
        rc, o, e = run(["dotnet", "build", "-nologo", "-v", "q", "-o", "out"], cwd=d, timeout=180)
        if rc: raise RuntimeError(o + e)
        return ["dotnet", "out/p.dll"]
    if lang == "kt":
        if re.search(r"\bfun\s+main\s*\(", code): src = code
        else:
            dc, st = split_decls("kt", code); src = dc + "\nfun main() {\n" + st + "\n}\n"
        (d / "a.kt").write_text(src)
        rc, o, e = run(["kotlinc", "a.kt", "-nowarn", "-include-runtime", "-d", "a.jar"], cwd=d, timeout=240)
        if rc: raise RuntimeError(e)
        return ["java", "-jar", "a.jar"]
    if lang == "swift" and SWIFT.exists():
        src = code
        if re.search(r"\b(URL|URLSession|Date|DispatchQueue|JSONDecoder|JSONEncoder|NSString|Data|localizedDescription|String\(format)", code) and "import Foundation" not in code:
            src = "import Foundation\n" + code
        (d / "main.swift").write_text(src)
        rc, o, e = run([str(SWIFT / "usr/libexec/swift/bin/swiftc"), "-resource-dir", str(SWIFT / "usr/lib/swift"), "main.swift", "-o", "a"], cwd=d, timeout=240)
        if rc: raise RuntimeError(e)
        return ["env", "LD_LIBRARY_PATH=" + str(SWIFT / "usr/lib/swift/linux"), "./a"]
    return None


def main():
    only = set(sys.argv[1:])
    items = load()
    bad, manual, ok = [], [], 0
    for n, x in enumerate(items):
        if only and x["lang"] not in only:
            continue
        runnable = x["c"] and re.match(r"Что выведет (скомпилированный )?код", x["q"])
        d = TMP / f"s{n}"; d.mkdir()
        try:
            cmd = build(x["lang"], x["c"], d) if runnable else None
        except RuntimeError as e:
            bad.append((x, "НЕ КОМПИЛИРУЕТСЯ:\n" + str(e)[-1500:])); continue
        if not cmd:
            manual.append(x); continue
        rc, out, err = run(cmd, cwd=d, inp="")
        if rc and any(re.search(r"ошибк|error|исключ|panic|exception", a, re.I) for a in x["ans"]):
            ok += 1; continue
        if rc:
            bad.append((x, f"код завершился с ошибкой {rc}:\n{err[-1500:]}\nвывод: {out!r}")); continue
        if any(norm(a) == norm(out) for a in x["ans"]):
            ok += 1
        else:
            bad.append((x, f"реальный вывод: {out!r}"))
    for x, why in bad:
        print(f"\n### {x['lang']} · {x['where']}\n{x['c']}\nожидается: {x['ans']}\n{why}")
    print(f"\nсовпало: {ok}, расхождений: {len(bad)}, вручную: {len(manual)}")
    json.dump(manual, open(TMP / "manual.json", "w"), ensure_ascii=False, indent=1)
    print("manual list:", TMP / "manual.json")


if __name__ == "__main__":
    main()
