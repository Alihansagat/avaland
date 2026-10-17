/* AVALAND: запуск Python-решений в Pyodide (WebAssembly), отдельный поток */
import { loadPyodide } from "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/pyodide.mjs";
const PKG_BASE = "https://cdn.jsdelivr.net/pyodide/v314.0.7/full/";
const PRELUDE = `
import json, sys, io, os, traceback, warnings
os.environ["MPLBACKEND"] = "Agg"
warnings.filterwarnings("ignore", message=".*non-interactive.*")
warnings.filterwarnings("ignore", category=DeprecationWarning)

def _ava_figs():
    plt = sys.modules.get("matplotlib.pyplot")
    if plt is None:
        return []
    import base64
    imgs = []
    for n in plt.get_fignums()[:6]:
        b = io.BytesIO()
        plt.figure(n).savefig(b, format="png", dpi=90, bbox_inches="tight")
        imgs.append(base64.b64encode(b.getvalue()).decode())
    plt.close("all")
    return imgs

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

class _AvaOut(io.StringIO):
    def write(self, s):
        if self.tell() > 200000:
            raise RuntimeError("Слишком большой вывод: больше 200 000 символов")
        return super().write(s)

def __ava_play(code, stdin):
    out = _AvaOut()
    old = (sys.stdout, sys.stderr, sys.stdin)
    sys.stdout = sys.stderr = out
    sys.stdin = io.StringIO(stdin)
    err = ""
    try:
        def _input(prompt=""):
            out.write(str(prompt))
            line = sys.stdin.readline()
            if not line:
                raise EOFError("input(): данные закончились — впишите строки в поле «Ввод программы»")
            return line.rstrip("\\n")
        import builtins
        ns = {"__name__": "__main__", "__builtins__": builtins, "input": _input}
        exec(compile(code, "main.py", "exec"), ns)
    except SystemExit as e:
        if e.code not in (None, 0):
            err = f"SystemExit: {e.code}"
    except BaseException as e:
        tb = traceback.format_exception(type(e), e, e.__traceback__)
        keep = [tb[0]] + [x for x in tb[1:] if 'File "main.py"' in x or not x.startswith("  File")]
        err = "".join(keep).rstrip()
    finally:
        sys.stdout, sys.stderr, sys.stdin = old
    try:
        imgs = _ava_figs()
    except BaseException:
        imgs = []
    return json.dumps({"out": out.getvalue(), "err": err, "imgs": imgs})
`;
let py = null, ready = null;
async function boot() {
  const base = "https://cdn.jsdelivr.net/npm/pyodide@314.0.7/";
  const web = false;
  let stdLibURL = base + "python_stdlib.zip";
  if (web) {
    const b64 = await (await fetch(base + "python_stdlib.b64.txt")).text();
    const bin = Uint8Array.from(atob(b64.trim()), c => c.charCodeAt(0));
    stdLibURL = URL.createObjectURL(new Blob([bin], { type: "application/zip" }));
  }
  const opts = { indexURL: base, stdLibURL, stdout: () => {}, stderr: () => {} };
  if (!PKG_BASE.includes("@PYODIDE")) opts.packageBaseUrl = PKG_BASE;   // wheels numpy/pandas/… с CDN Pyodide
  py = await loadPyodide(opts);
  py.runPython(PRELUDE);
}
self.onmessage = async e => {
  const { id, code, fn, tests, warm, play, stdin, pkgs } = e.data;
  try {
    if (!ready) ready = boot();
    await ready;
    if (warm) { self.postMessage({ id, ready: true }); return; }
    if (pkgs != null) {
      const names = [];
      try { await py.loadPackagesFromImports(pkgs, { messageCallback: m => { const k = /Loaded (.+)/.exec(m); if (k) names.push(k[1]); }, errorCallback: () => {} }); }
      catch (err) { self.postMessage({ id, pkgErr: String(err && err.message || err) }); return; }
      self.postMessage({ id, loaded: names.join(", ") }); return;
    }
    if (play != null) { self.postMessage({ id, ...JSON.parse(py.globals.get("__ava_play")(play, stdin || "")) }); return; }
    const out = py.globals.get("__ava_run")(code, fn, JSON.stringify(tests));
    self.postMessage({ id, ...JSON.parse(out) });
  } catch (err) {
    ready = null;
    self.postMessage({ id, fatal: String(err && err.message || err) });
  }
};
