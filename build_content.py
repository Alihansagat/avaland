#!/usr/bin/env python3
"""Parse content/*.txt into a JS data file for the app.

Format (one file per language):
  @lang id=.. name=.. land=.. color=#..
  @about text
  @project Title / plain lines = description / "- " lines = requirements
  @lesson Title / paragraphs / ```lang code ``` / "! " tips / "? type question"
  @exam  questions only
Question lines: "- " option, "+ " correct option, "> " accepted answer, "= " explanation.
"""
import html, json, re, sys
from pathlib import Path

ROOT = Path(__file__).parent
ORDER = ["base", "py", "js", "ts", "sql", "java", "kt", "cs", "cpp", "go", "rs", "swift", "dart", "php", "rb"]


def inline(s: str) -> str:
    s = html.escape(s, quote=False)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", s)


def parse(path: Path):
    lang = {"lessons": [], "exam": []}
    cur = None          # current lesson dict, or "exam"
    q = None            # current question dict
    block = None        # "project"
    code_buf = None
    para = []
    errors = []

    def flush_para():
        nonlocal para
        if para and cur not in (None, "exam") and q is None:
            cur["body"].append(inline(" ".join(para)))
        para = []

    def end_question():
        nonlocal q
        if q is None:
            return
        target = lang["exam"] if cur == "exam" else cur["q"]
        target.append(q)
        q = None

    for ln, raw in enumerate(path.read_text(encoding="utf-8").splitlines(), 1):
        line = raw.rstrip("\n")
        if code_buf is not None:
            if line.strip() == "```":
                code = "\n".join(code_buf)
                if q is not None:
                    q["code"] = code
                elif cur not in (None, "exam"):
                    cur["code"] = code
                else:
                    errors.append(f"{path.name}:{ln} code outside lesson")
                code_buf = None
            else:
                code_buf.append(line)
            continue
        if line.startswith("```"):
            flush_para()
            code_buf = []
            continue
        if line.startswith("@lang "):
            for k, v in re.findall(r"(\w+)=(.*?)(?=\s\w+=|$)", line[6:]):
                lang[k] = v.strip()
            continue
        if line.startswith("@about "):
            lang["about"] = inline(line[7:].strip())
            continue
        if line.startswith("@project "):
            lang["project"] = {"title": line[9:].strip(), "desc": "", "req": []}
            block = "project"
            continue
        if line.startswith("@lesson "):
            flush_para(); end_question(); block = None
            cur = {"t": line[8:].strip(), "body": [], "code": "", "tips": [], "q": []}
            lang["lessons"].append(cur)
            continue
        if line.startswith("@exam"):
            flush_para(); end_question(); block = None
            cur = "exam"
            continue
        if block == "project":
            if line.startswith("- "):
                lang["project"]["req"].append(inline(line[2:].strip()))
            elif line.strip():
                lang["project"]["desc"] += inline(line.strip())
            continue
        if line.startswith("? "):
            flush_para(); end_question()
            m = re.match(r"\?\s+(mc|out|fill)\s+(.*)", line)
            if not m:
                errors.append(f"{path.name}:{ln} bad question header")
                continue
            q = {"type": m.group(1), "q": inline(m.group(2).strip()), "o": [], "a": None, "ans": [], "e": "", "code": ""}
            continue
        if q is not None:
            if line.startswith("- ") or line.startswith("+ "):
                if line.startswith("+ "):
                    q["a"] = len(q["o"])
                q["o"].append(inline(line[2:].strip()))
            elif line.startswith("> "):
                q["ans"].append(line[2:])
            elif line.startswith("= "):
                q["e"] = inline(line[2:].strip())
            elif line.strip():
                errors.append(f"{path.name}:{ln} stray line in question: {line[:40]}")
            continue
        if cur not in (None, "exam"):
            if line.startswith("! "):
                flush_para()
                cur["tips"].append(inline(line[2:].strip()))
            elif not line.strip():
                flush_para()
            else:
                flush_para()
                para.append(line.strip())
    flush_para(); end_question()

    # validation
    def check_q(qq, where):
        if qq["type"] == "mc":
            if len(qq["o"]) < 2 or qq["a"] is None:
                errors.append(f"{where}: mc needs options and one '+'")
        else:
            if not qq["ans"]:
                errors.append(f"{where}: {qq['type']} needs answers")
        if not qq["e"]:
            errors.append(f"{where}: missing explanation")

    for i, les in enumerate(lang["lessons"]):
        if not les["code"]:
            errors.append(f"{path.name} lesson {i+1}: no code")
        if len(les["q"]) < 4:
            errors.append(f"{path.name} lesson {i+1}: {len(les['q'])} questions")
        for j, qq in enumerate(les["q"]):
            check_q(qq, f"{path.name} L{i+1}Q{j+1}")
    for j, qq in enumerate(lang["exam"]):
        check_q(qq, f"{path.name} EXAM Q{j+1}")
    if len(lang["lessons"]) != 8:
        errors.append(f"{path.name}: {len(lang['lessons'])} lessons")
    if len(lang["exam"]) < 12:
        errors.append(f"{path.name}: exam has {len(lang['exam'])}")
    for key in ("id", "name", "land", "color", "about", "project"):
        if key not in lang:
            errors.append(f"{path.name}: missing {key}")
    return lang, errors


def compact(lang):
    """Shrink question objects for the bundle."""
    def cq(q):
        out = {"t": q["type"], "q": q["q"], "e": q["e"]}
        if q["code"]: out["c"] = q["code"]
        if q["type"] == "mc":
            out["o"] = q["o"]; out["a"] = q["a"]
        else:
            out["ans"] = q["ans"]
        return out
    return {
        "id": lang["id"], "name": lang["name"], "land": lang["land"], "color": lang["color"],
        "about": lang["about"], "project": lang["project"],
        "lessons": [{"t": l["t"], "body": l["body"], "code": l["code"], "tips": l["tips"], "q": [cq(q) for q in l["q"]]} for l in lang["lessons"]],
        "exam": [cq(q) for q in lang["exam"]],
    }


def main(out_path):
    langs, all_err = {}, []
    for p in sorted((ROOT / "content").glob("*.txt")):
        lang, errs = parse(p)
        all_err += errs
        langs[lang["id"]] = compact(lang)
    missing = [i for i in ORDER if i not in langs]
    if missing:
        all_err.append(f"missing languages: {missing}")
    if all_err:
        print("\n".join(all_err)); sys.exit(1)
    data = [langs[i] for i in ORDER]
    norun_file = ROOT / "content" / "norun.list"
    norun = {l.strip() for l in norun_file.read_text(encoding="utf-8").splitlines() if l.strip() and not l.startswith("#")} if norun_file.exists() else set()
    for L in data:
        for i, les in enumerate(L["lessons"]):
            if f'{L["id"]}:{i}' in norun:
                les["run"] = False
    Path(out_path).write_text("window.AVA_CONTENT=" + json.dumps(data, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    nl = sum(len(l["lessons"]) for l in data)
    nq = sum(len(x["q"]) for l in data for x in l["lessons"]) + sum(len(l["exam"]) for l in data)
    print(f"ok: {len(data)} languages, {nl} lessons, {nq} questions, {Path(out_path).stat().st_size//1024} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else ROOT / "src" / "content.js")
