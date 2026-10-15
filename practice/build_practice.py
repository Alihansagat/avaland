#!/usr/bin/env python3
"""Build practice problems: generate tests from Python reference solutions,
cross-check them against independent JavaScript solutions, write src/practice.js."""
import copy, html, json, random, re, subprocess, sys, tempfile
from pathlib import Path

HERE = Path(__file__).parent
sys.path.insert(0, str(HERE))
from common import P, camel  # noqa: E402
import p1_arrays, p2_pointers, p3_search_strings, p4_dp_graphs  # noqa: E402,F401
import sqlite3  # noqa: E402
from sql_problems import SCHEMA, seed_sql, SQLP  # noqa: E402

RANDOM_TESTS = 14


def canon(v, mode):
    if mode == "unordered":
        return sorted(json.dumps(x, sort_keys=True) for x in v)
    if mode == "groups":
        return sorted(json.dumps(sorted(json.dumps(y) for y in g)) for g in v)
    return json.dumps(v, sort_keys=True)


def same(a, b, mode):
    if mode == "float":
        return a is not None and b is not None and abs(float(a) - float(b)) < 1e-5
    return canon(a, mode) == canon(b, mode)


def inline(s):
    s = html.escape(s, quote=False)
    s = re.sub(r"\*\*([^*]+)\*\*", r"<b>\1</b>", s)
    return re.sub(r"`([^`]+)`", r"<code>\1</code>", s)


def main(out):
    errors, items, js_jobs = [], [], []
    ids = set()
    for p in P:
        if p["id"] in ids:
            errors.append(f"duplicate id {p['id']}")
        ids.add(p["id"])
        ns = {}
        exec(p["py"], ns)
        f = ns[p["fn"]]
        r = random.Random(p["id"])
        raw = [list(a) for a, _ in p["examples"]] + [list(a) for a in p["edge"]]
        seen = {json.dumps(a) for a in raw}
        tries = 0
        while len(raw) < len(p["examples"]) + len(p["edge"]) + RANDOM_TESTS and tries < 400:
            tries += 1
            a = p["gen"](r)
            k = json.dumps(a)
            if k not in seen:
                seen.add(k); raw.append(a)
        tests = []
        for a in raw:
            try:
                e = f(*copy.deepcopy(a))
            except Exception as ex:
                errors.append(f"{p['id']}: python ref failed on {a}: {ex}")
                continue
            if isinstance(e, tuple):
                e = list(e)
            tests.append({"a": a, "e": e})
        jsfn = camel(p["fn"])
        if f"function {jsfn}(" not in p["js"]:
            errors.append(f"{p['id']}: js function name should be {jsfn}")
        js_jobs.append({"id": p["id"], "fn": jsfn, "code": p["js"], "tests": tests, "mode": p["compare"]})
        ne = len(p["examples"])
        params_js = [camel(x) for x in p["params"]]
        items.append({
            "id": p["id"], "title": p["title"], "diff": p["diff"], "topic": p["topic"], "lc": p["lc"],
            "fn": p["fn"], "jsfn": jsfn, "params": p["params"], "jsparams": params_js,
            "text": inline(p["text"]), "limits": p["limits"], "hint": inline(p["hint"]), "complexity": inline(p["complexity"]),
            "examples": [{"a": tests[i]["a"], "e": tests[i]["e"], "note": p["examples"][i][1]} for i in range(ne)],
            "tests": tests, "compare": p["compare"],
            "sol": {"py": p["py"].rstrip() + "\n", "js": p["js"].rstrip() + "\n"},
            "starter": {
                "py": f"def {p['fn']}({', '.join(p['params'])}):\n    # ваше решение\n    pass\n",
                "js": f"function {jsfn}({', '.join(params_js)}) {{\n  // ваше решение\n}}\n",
            },
        })
    # cross-check with JavaScript
    with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False) as fh:
        json.dump(js_jobs, fh)
        jobs_path = fh.name
    runner = r"""
const jobs = require(process.argv[1]);
const out = {};
for (const j of jobs) {
  const f = new Function(j.code + "\nreturn " + j.fn + ";")();
  out[j.id] = j.tests.map(t => { try { return { v: f(...JSON.parse(JSON.stringify(t.a))) }; } catch (e) { return { err: String(e) }; } });
}
console.log(JSON.stringify(out));
"""
    res = subprocess.run(["node", "-e", runner, jobs_path], capture_output=True, text=True)
    if res.returncode:
        errors.append("node failed: " + res.stderr[-800:])
    else:
        got = json.loads(res.stdout)
        for j in js_jobs:
            for t, g in zip(j["tests"], got[j["id"]]):
                if "err" in g or not same(g.get("v"), t["e"], j["mode"]):
                    errors.append(f"{j['id']}: JS {g} != PY {t['e']} on {t['a']}")
                    break
    if errors:
        print("\n".join(errors[:40]))
        sys.exit(1)
    # SQL problems: expected result computed by SQLite
    db = sqlite3.connect(":memory:")
    db.executescript(SCHEMA)
    seed = seed_sql()
    db.executescript(seed)
    tables = {}
    for t in ["customers", "products", "orders", "order_items"]:
        cur = db.execute(f"SELECT * FROM {t} LIMIT 5")
        tables[t] = {"cols": [d[0] for d in cur.description], "rows": cur.fetchall(), "count": db.execute(f"SELECT COUNT(*) FROM {t}").fetchone()[0]}
    for q in SQLP:
        if q["id"] in ids:
            errors.append(f"duplicate id {q['id']}")
        ids.add(q["id"])
        cur = db.execute(q["sol"])
        rows = [list(r) for r in cur.fetchall()]
        if not rows:
            errors.append(f"{q['id']}: reference returned no rows")
        items.append({
            "id": q["id"], "title": q["title"], "diff": q["diff"], "topic": q["topic"], "lc": q["lc"], "kind": "sql",
            "text": inline(q["text"]), "limits": "База магазина: customers, products, orders, order_items", "hint": inline(q["hint"]),
            "complexity": "Сравните свой план запроса с эталоном через EXPLAIN QUERY PLAN.",
            "ordered": q["ordered"], "cols": [d[0] for d in cur.description], "rows": rows,
            "sol": {"sql": q["sol"].replace(" FROM ", "\nFROM ").replace(" JOIN ", "\nJOIN ").replace(" WHERE ", "\nWHERE ").replace(" GROUP BY ", "\nGROUP BY ").replace(" HAVING ", "\nHAVING ").replace(" ORDER BY ", "\nORDER BY ").replace(" LIMIT ", "\nLIMIT ") + "\n"},
            "starter": {"sql": "-- ваш запрос\nSELECT \n"},
        })
    if errors:
        print("\n".join(errors[:40]))
        sys.exit(1)
    Path(out).with_name("sqldb.js").write_text("window.AVA_SQLDB=" + json.dumps({"schema": SCHEMA.strip(), "seed": seed, "tables": tables}, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    diff_rank = {"easy": 0, "medium": 1, "hard": 2}
    Path(out).write_text("window.AVA_PRACTICE=" + json.dumps(items, ensure_ascii=False, separators=(",", ":")) + ";\n", encoding="utf-8")
    cnt = {d: sum(1 for i in items if i["diff"] == d) for d in diff_rank}
    print(f"practice ok: {len(items)} problems {cnt} ({len(SQLP)} SQL), {sum(len(i.get('tests', [])) for i in items)} tests, cross-checked in JS, {Path(out).stat().st_size // 1024} KB")


if __name__ == "__main__":
    main(sys.argv[1] if len(sys.argv) > 1 else HERE.parent / "src" / "practice.js")
