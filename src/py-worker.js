/* AVALAND: запуск Python-решений в Pyodide (WebAssembly), отдельный поток */
import { loadPyodide } from "./pyodide/pyodide.mjs";
const PRELUDE = `
import json, sys, io, traceback

class _AvaEnc(json.JSONEncoder):
    def default(self, o):
        if isinstance(o, (set, frozenset, tuple)):
            return list(o)
        return str(o)

def _ava_fmt(e):
    if isinstance(e, SyntaxError):
        return f"{type(e).__name__}: {e.msg} (строка {e.lineno})"
    tb = traceback.extract_tb(e.__traceback__)
    line = next((fr.lineno for fr in reversed(tb) if fr.filename == "solution.py"), getattr(e, "lineno", None))
    return f"{type(e).__name__}: {e}" + (f" (строка {line})" if line else "")

def __ava_run(code, fn, tests_json):
    buf = io.StringIO()
    old = sys.stdout
    sys.stdout = buf
    try:
        ns = {"__name__": "solution"}
        try:
            exec(compile(code, "solution.py", "exec"), ns)
        except BaseException as e:
            return json.dumps({"error": _ava_fmt(e), "log": buf.getvalue()[-4000:]})
        f = ns.get(fn)
        if not callable(f):
            return json.dumps({"error": f"Функция {fn} не найдена. Не меняйте её имя.", "log": buf.getvalue()[-4000:]})
        res = []
        for args in json.loads(tests_json):
            try:
                v = f(*args)
                res.append({"v": json.loads(json.dumps(v, cls=_AvaEnc))})
            except RecursionError:
                res.append({"err": "RecursionError: слишком глубокая рекурсия"})
            except BaseException as e:
                res.append({"err": _ava_fmt(e)})
        return json.dumps({"results": res, "log": buf.getvalue()[-4000:]})
    finally:
        sys.stdout = old
`;
let py = null, ready = null;
async function boot() {
  const base = new URL("pyodide/", import.meta.url).href;
  const web = new URL(self.location.href).searchParams.has("web");
  let stdLibURL = base + "python_stdlib.zip";
  if (web) {
    const b64 = await (await fetch(base + "python_stdlib.b64.txt")).text();
    const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0));
    stdLibURL = URL.createObjectURL(new Blob([bin], { type: "application/zip" }));
  }
  py = await loadPyodide({ indexURL: base, stdLibURL, stdout: () => {}, stderr: () => {} });
  py.runPython(PRELUDE);
}
self.onmessage = async e => {
  const { id, code, fn, tests, warm } = e.data;
  try {
    if (!ready) ready = boot();
    await ready;
    if (warm) { self.postMessage({ id, ready: true }); return; }
    const out = py.globals.get("__ava_run")(code, fn, JSON.stringify(tests));
    self.postMessage({ id, ...JSON.parse(out) });
  } catch (err) {
    ready = null;
    self.postMessage({ id, fatal: String(err && err.message || err) });
  }
};
