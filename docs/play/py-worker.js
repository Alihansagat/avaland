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
const FA_SHIM = String.raw`
# Однопоточный TestClient для Pyodide: в браузере нет потоков, поэтому
# ASGI-приложение выполняется вручную, а run_in_threadpool вызывает функцию сразу.
def _ava_fastapi_shim():
    import json as _json, sys, functools
    from urllib.parse import urlsplit, urlencode

    import importlib, types
    for modname in ("starlette.concurrency", "starlette.background", "starlette.routing", "fastapi.routing", "fastapi.dependencies.utils", "fastapi.concurrency"):
        try:
            importlib.import_module(modname)
        except Exception:
            pass

    async def _direct(func, *args, **kwargs):
        return func(*args, **kwargs)
    import anyio.to_thread
    async def _run_sync(func, *args, abandon_on_cancel=False, cancellable=None, limiter=None):
        return func(*args)
    anyio.to_thread.run_sync = _run_sync
    for modname in ("starlette.concurrency", "fastapi.concurrency", "fastapi.routing", "fastapi.dependencies.utils", "starlette.routing", "starlette.background", "starlette.responses"):
        m = sys.modules.get(modname)
        if m is not None and hasattr(m, "run_in_threadpool"):
            m.run_in_threadpool = _direct

    def _drive(coro):
        try:
            while True:
                coro.send(None)
        except StopIteration as e:
            return e.value

    class _Resp:
        def __init__(self, status, headers, body):
            self.status_code = status
            self.headers = {k.decode().lower(): v.decode() for k, v in headers}
            self.content = body
            self.text = body.decode("utf-8", "replace")
        def json(self):
            return _json.loads(self.text)
        def __repr__(self):
            return f"<Response [{self.status_code}]>"

    class TestClient:
        def __init__(self, app, base_url="http://testserver", raise_server_exceptions=True, **kw):
            self.app, self.headers, self.raise_exc = app, {}, raise_server_exceptions
        def __enter__(self):
            return self
        def __exit__(self, *a):
            return False
        def request(self, method, url, json=None, data=None, params=None, headers=None, **kw):
            parts = urlsplit(url)
            query = parts.query
            if params:
                query = (query + "&" if query else "") + urlencode(params, doseq=True)
            hdrs = {**self.headers, **(headers or {})}
            body = b""
            if json is not None:
                body = _json.dumps(json).encode(); hdrs.setdefault("content-type", "application/json")
            elif data is not None:
                body = urlencode(data).encode() if isinstance(data, dict) else (data.encode() if isinstance(data, str) else data)
                if isinstance(data, dict): hdrs.setdefault("content-type", "application/x-www-form-urlencoded")
            hdrs.setdefault("host", "testserver")
            hdrs["content-length"] = str(len(body))
            scope = {"type": "http", "asgi": {"version": "3.0"}, "http_version": "1.1", "method": method.upper(), "scheme": "http",
                     "path": parts.path or "/", "raw_path": (parts.path or "/").encode(), "root_path": "", "query_string": query.encode(),
                     "headers": [(k.lower().encode(), str(v).encode()) for k, v in hdrs.items()], "server": ("testserver", 80), "client": ("testclient", 50000), "state": {}}
            sent, state = [], {"done": False}
            async def receive():
                if not state["done"]:
                    state["done"] = True
                    return {"type": "http.request", "body": body, "more_body": False}
                return {"type": "http.disconnect"}
            async def send(msg):
                sent.append(msg)
            try:
                _drive(self.app(scope, receive, send))
            except Exception:
                if self.raise_exc or not any(m["type"] == "http.response.start" for m in sent):
                    raise
            start = next((m for m in sent if m["type"] == "http.response.start"), {"status": 500, "headers": []})
            data_out = b"".join(m.get("body", b"") for m in sent if m["type"] == "http.response.body")
            return _Resp(start["status"], start.get("headers", []), data_out)
        def get(self, url, **kw): return self.request("GET", url, **kw)
        def post(self, url, **kw): return self.request("POST", url, **kw)
        def put(self, url, **kw): return self.request("PUT", url, **kw)
        def patch(self, url, **kw): return self.request("PATCH", url, **kw)
        def delete(self, url, **kw): return self.request("DELETE", url, **kw)

    TestClient.__module__ = "fastapi.testclient"
    for name in ("starlette.testclient", "fastapi.testclient"):
        m = types.ModuleType(name)
        m.TestClient = TestClient
        sys.modules[name] = m
        parent, _, child = name.rpartition(".")
        if parent in sys.modules:
            setattr(sys.modules[parent], child, m)
_ava_fastapi_shim()
`;
let py = null, ready = null, faShim = false;
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
      if (!faShim && /^\s*(?:from|import)\s+(?:fastapi|starlette)\b/m.test(pkgs)) {
        try { py.runPython(FA_SHIM); faShim = true; } catch (err) { self.postMessage({ id, pkgErr: "FastAPI: " + String(err && err.message || err).slice(-300) }); return; }
      }
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
