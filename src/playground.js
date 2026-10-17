/* ---------------- компилятор: редактор и запуск кода на 14 языках ---------------- */
const PLAY_LANGS = ["py", "js", "ts", "sql", "java", "cpp", "cs", "go", "rs", "kt", "swift", "dart", "php", "rb"];
const PLAY_NAME = { py: "Python", js: "JavaScript", ts: "TypeScript", sql: "SQL", java: "Java", cpp: "C++", cs: "C#", go: "Go", rs: "Rust", kt: "Kotlin", swift: "Swift", dart: "Dart", php: "PHP", rb: "Ruby", base: "Python" };
const LOCAL_LANGS = new Set(["py", "js", "ts", "sql", "base"]);
const PLAY_START = {
  py: `name = input("Как вас зовут? ")\nprint(f"Привет, {name}!")\n\nnums = [5, 3, 8, 1]\nprint("Отсортировано:", sorted(nums))\nprint("Сумма квадратов:", sum(n * n for n in nums))\n`,
  js: `const nums = [5, 3, 8, 1];\nconsole.log("Отсортировано:", [...nums].sort((a, b) => a - b));\nconsole.log("Сумма квадратов:", nums.reduce((s, n) => s + n * n, 0));\n\nconst name = readline() ?? "мир"; // строка из поля «Ввод»\nconsole.log(\`Привет, \${name}!\`);\n`,
  ts: `interface User { name: string; age: number }\n\nconst users: User[] = [\n  { name: "Аля", age: 21 },\n  { name: "Тимур", age: 19 },\n];\n\nconst adults = users.filter(u => u.age >= 20).map(u => u.name);\nconsole.log("Старше 20:", adults);\n`,
  sql: `-- Учебная база магазина: customers, products, orders, order_items\nSELECT c.name, COUNT(o.id) AS orders\nFROM customers c\nLEFT JOIN orders o ON o.customer_id = c.id\nGROUP BY c.id\nORDER BY orders DESC\nLIMIT 5;\n`,
  java: `import java.util.*;\n\npublic class Main {\n    public static void main(String[] args) {\n        Scanner in = new Scanner(System.in);\n        String name = in.hasNextLine() ? in.nextLine() : "мир";\n        System.out.println("Привет, " + name + "!");\n\n        int[] nums = {5, 3, 8, 1};\n        Arrays.sort(nums);\n        System.out.println("Отсортировано: " + Arrays.toString(nums));\n    }\n}\n`,
  cpp: `#include <iostream>\n#include <vector>\n#include <algorithm>\nusing namespace std;\n\nint main() {\n    string name;\n    if (!getline(cin, name)) name = "мир";\n    cout << "Привет, " << name << "!" << endl;\n\n    vector<int> nums = {5, 3, 8, 1};\n    sort(nums.begin(), nums.end());\n    for (int n : nums) cout << n << ' ';\n    cout << endl;\n}\n`,
  cs: `using System;\nusing System.Linq;\n\nvar name = Console.ReadLine() ?? "мир";\nConsole.WriteLine($"Привет, {name}!");\n\nint[] nums = { 5, 3, 8, 1 };\nConsole.WriteLine("Отсортировано: " + string.Join(", ", nums.OrderBy(n => n)));\n`,
  go: `package main\n\nimport (\n\t"bufio"\n\t"fmt"\n\t"os"\n\t"sort"\n\t"strings"\n)\n\nfunc main() {\n\tr := bufio.NewReader(os.Stdin)\n\tname, _ := r.ReadString('\\n')\n\tname = strings.TrimSpace(name)\n\tif name == "" {\n\t\tname = "мир"\n\t}\n\tfmt.Printf("Привет, %s!\\n", name)\n\n\tnums := []int{5, 3, 8, 1}\n\tsort.Ints(nums)\n\tfmt.Println("Отсортировано:", nums)\n}\n`,
  rs: `use std::io;\n\nfn main() {\n    let mut name = String::new();\n    io::stdin().read_line(&mut name).unwrap();\n    let name = if name.trim().is_empty() { "мир" } else { name.trim() };\n    println!("Привет, {}!", name);\n\n    let mut nums = vec![5, 3, 8, 1];\n    nums.sort();\n    println!("Отсортировано: {:?}", nums);\n}\n`,
  kt: `fun main() {\n    val nums = listOf(5, 3, 8, 1)\n    println("Отсортировано: \${nums.sorted()}")\n    println("Сумма квадратов: \${nums.sumOf { it * it }}")\n}\n`,
  swift: `let name = readLine() ?? "мир"\nprint("Привет, \\(name)!")\n\nlet nums = [5, 3, 8, 1]\nprint("Отсортировано:", nums.sorted())\nprint("Сумма квадратов:", nums.map { $0 * $0 }.reduce(0, +))\n`,
  dart: `void main() {\n  final nums = [5, 3, 8, 1];\n  print('Отсортировано: \${[...nums]..sort()}');\n  print('Сумма квадратов: \${nums.map((n) => n * n).reduce((a, b) => a + b)}');\n}\n`,
  php: `<?php\n$name = trim(fgets(STDIN) ?: "") ?: "мир";\necho "Привет, $name!\\n";\n\n$nums = [5, 3, 8, 1];\nsort($nums);\necho "Отсортировано: " . implode(", ", $nums) . "\\n";\n`,
  rb: `name = (gets || "").strip\nname = "мир" if name.empty?\nputs "Привет, #{name}!"\n\nnums = [5, 3, 8, 1]\nputs "Отсортировано: #{nums.sort}"\nputs "Сумма квадратов: #{nums.sum { |n| n * n }}"\n`,
};
PLAY_START.base = PLAY_START.py;
const PLAY_STDIN = { py: "Аня", js: "Аня", java: "Аня", cpp: "Аня", cs: "Аня", go: "Аня", rs: "Аня", swift: "Аня", php: "Аня", rb: "Аня" };

/* --- превращаем фрагмент из урока в полную программу --- */
const DECL_RE = {
  go: /^(type|func|var|const|import)\s/,
  cpp: /^(#include|using\s|template\s*<|struct\s|class\s|enum\s|(static\s+|inline\s+|constexpr\s+)*(void|int|long|double|bool|auto|char|float|size_t|std::[\w:<>, ]+|[A-Z]\w*)\s*[&*]?\s+\w+\s*\([^;]*\)\s*(const\s*)?(\{.*)?$)/,
  java: /^(@\w+|import\s|static\s|((public|private|protected|abstract|final|sealed|non-sealed)\s+)*(class|record|interface|enum)\s)/,
  cs: /^(\[\w|namespace\s|((public|private|protected|internal|static|abstract|sealed|partial|readonly|file|ref)\s+)*(class|record|interface|enum|struct)\s)/,
  rs: /^(#\[|(pub\s+)?(fn|struct|enum|impl|trait|use|mod|const|static|type)\s)/,
  kt: /^(import\s|fun\s|class\s|data\s+class|enum\s+class|object\s|interface\s|sealed\s|abstract\s|open\s+class|typealias\s|inline\s|suspend\s+fun|const\s+val)/,
  dart: /^(import\s|class\s|abstract\s|enum\s|mixin\s|extension\s|typedef\s|sealed\s|base\s+class|final\s+class|interface\s+class|(Future<[^>]*>|Stream<[^>]*>|void|int|double|num|String|bool|dynamic|List<[^>]*>|Map<[^>]*>|Set<[^>]*>|Iterable<[^>]*>|[A-Z]\w*(<[^>]*>)?\??)\s+\w+\s*(<[^>]*>)?\s*\(.*\)\s*(async\*?|sync\*)?\s*(\{|=>))/,
};
function splitDecls(lang, code) {
  const re = DECL_RE[lang], decls = [], stmts = [], L = code.split("\n");
  let depth = 0, inDecl = false, paren = 0;
  for (let k = 0; k < L.length; k++) {
    const line = L[k];
    if (/^\s*\/\/\s*в main/i.test(line)) continue;
    if (!inDecl && depth === 0 && re.test(line)) inDecl = true;
    (inDecl ? decls : stmts).push(line);
    if (!inDecl) continue;
    const s = line.replace(/"(?:[^"\\]|\\.)*"|'(?:[^'\\]|\\.)*'|\/\/.*$/g, "");
    depth += (s.match(/\{/g) || []).length - (s.match(/\}/g) || []).length;
    paren += (s.match(/\(/g) || []).length - (s.match(/\)/g) || []).length;
    if (depth > 0 || paren > 0) continue;
    // a declaration whose body starts on the next line (C# / Allman style, annotations, base lists)
    const next = (L.slice(k + 1).find(x => x.trim()) || "").trim();
    const attr = /^(@\w+|#\[|\[\w)/.test(line.trim()) && !/[;{}]\s*$/.test(s);
    if (attr || (!/[;}]\s*$/.test(s) && /^(\{|=>|:|where\b|extends\b|implements\b|throws\b)/.test(next))) continue;
    inDecl = false; depth = 0; paren = 0;
  }
  return [decls.join("\n"), stmts.join("\n")];
}
const GO_PKGS = ["fmt", "strings", "sort", "errors", "strconv", "sync", "time", "os", "math", "slices", "maps", "unicode", "bufio", "context"];
function wrapProgram(lang, code) {
  const usings = [];
  code = String(code || "").replace(/\s+$/, "") + "\n";
  const ind = s => s.split("\n").map(x => x ? "    " + x : x).join("\n");
  switch (lang) {
    case "php": return /^\s*<\?php/.test(code) ? code : "<?php\n" + code;
    case "swift": return /\b(URL|URLSession|Date|DispatchQueue|JSONDecoder|JSONEncoder|NSString|Data|localizedDescription|String\(format)\b/.test(code) && !/^import\s+Foundation/m.test(code) ? "import Foundation\n\n" + code : code;
    case "cpp": {
      const pre = /bits\/stdc\+\+/.test(code) ? "" : "#include <bits/stdc++.h>\n";
      if (/\bint\s+main\s*\(/.test(code)) return pre + code;
      const [d, s] = splitDecls("cpp", code);
      return pre + (d ? d + "\n\n" : "") + "int main() {\n" + ind(s.trim()) + "\n}\n";
    }
    case "java": {
      const JI = "import java.util.*;\nimport java.util.function.*;\nimport java.util.stream.*;\nimport java.util.concurrent.*;\nimport java.util.concurrent.atomic.*;\n";
      if (/static\s+void\s+main/.test(code)) return JI + code;
      const [d, s] = splitDecls("java", code);
      const imports = d.split("\n").filter(x => /^import\s/.test(x)).join("\n");
      const members = d.split("\n").filter(x => !/^import\s/.test(x)).join("\n")
        .replace(/^((?:public|private|protected|abstract|final|sealed|non-sealed)\s+)*(class|record|interface|enum)\s/gm, m => "static " + m.replace(/\bpublic\s+/, ""));
      return `${JI}${imports ? imports + "\n" : ""}\npublic class Main {\n${members ? ind(members) + "\n\n" : ""}    public static void main(String[] args) throws Exception {\n${ind(ind(s.trim()))}\n    }\n}\n`;
    }
    case "cs": {
      if (!/static\s+(async\s+)?(void|int|Task)\s+Main\s*\(/.test(code)) {
        const [d, s] = splitDecls("cs", code.replace(/^using\s[^\n]*\n/gm, m => (usings.push(m), "")));
        if (d && s.trim()) code = usings.join("") + s.trim() + "\n\n" + d + "\n"; else code = usings.join("") + code.replace(/^using\s[^\n]*\n/gm, "");
      }
      const need = ["System", "System.Collections.Generic", "System.Linq", "System.Text", "System.Threading", "System.Threading.Tasks"].filter(u => !new RegExp("^using\\s+" + u.replace(/\./g, "\\.") + ";", "m").test(code));
      return need.map(u => `using ${u};`).join("\n") + (need.length ? "\n\n" : "") + code;
    }
    case "go": {
      if (/^package\s+main/m.test(code)) return code;
      let body = code;
      if (!/\bfunc\s+main\s*\(/.test(code)) { const [d, s] = splitDecls("go", code); body = (d ? d + "\n\n" : "") + "func main() {\n" + s.trim().split("\n").map(x => x ? "\t" + x : x).join("\n") + "\n}\n"; }
      const used = GO_PKGS.filter(p => new RegExp("\\b" + p + "\\.").test(body.replace(/"(?:[^"\\]|\\.)*"/g, "")));
      return "package main\n\n" + (used.length ? `import (\n${used.map(p => `\t"${p}"`).join("\n")}\n)\n\n` : "") + body;
    }
    case "rs": {
      if (/\bfn\s+main\s*\(/.test(code)) return code;
      const [d, s] = splitDecls("rs", code);
      return (d ? d + "\n\n" : "") + "fn main() {\n" + ind(s.trim()) + "\n}\n";
    }
    case "kt": {
      if (/\bfun\s+main\s*\(/.test(code)) return code;
      const [d, s] = splitDecls("kt", code);
      return (d ? d + "\n\n" : "") + "fun main() {\n" + ind(s.trim()) + "\n}\n";
    }
    case "dart": {
      if (/\bmain\s*\(/.test(code)) return code;
      const [d, s] = splitDecls("dart", code);
      const async = /\bawait\b/.test(s);
      return (d ? d + "\n\n" : "") + `${async ? "Future<void>" : "void"} main()${async ? " async" : ""} {\n` + s.trim().split("\n").map(x => x ? "  " + x : x).join("\n") + "\n}\n";
    }
    default: return code;
  }
}

/* --- JavaScript / TypeScript: отдельный поток, вывод приходит по строкам --- */
const PLAY_JS = `
const fmt = (v, d = 0) => {
  if (typeof v === "string") return d ? "'" + v + "'" : v;
  if (typeof v === "function") return "[Function: " + (v.name || "anonymous") + "]";
  if (typeof v === "bigint") return v + "n";
  if (typeof v === "symbol") return v.toString();
  if (v === null || typeof v !== "object") return String(v);
  if (d > 3) return Array.isArray(v) ? "[Array]" : "[Object]";
  if (Array.isArray(v)) return "[" + v.map(x => fmt(x, d + 1)).join(", ") + "]";
  if (v instanceof Map) return "Map(" + v.size + ") {" + (v.size ? " " + [...v].map(([k, x]) => fmt(k, d + 1) + " => " + fmt(x, d + 1)).join(", ") + " " : "") + "}";
  if (v instanceof Set) return "Set(" + v.size + ") {" + (v.size ? " " + [...v].map(x => fmt(x, d + 1)).join(", ") + " " : "") + "}";
  if (v instanceof Error) return v.name + ": " + v.message;
  if (v instanceof Date) return v.toISOString();
  const keys = Object.keys(v), name = v.constructor && v.constructor !== Object ? v.constructor.name + " " : "";
  return name + (keys.length ? "{ " + keys.map(k => k + ": " + fmt(v[k], d + 1)).join(", ") + " }" : "{}");
};
self.onmessage = async e => {
  const { code, stdin } = e.data;
  let n = 0;
  const send = (k, a) => { if (n++ < 3000) self.postMessage({ k, t: a.map(x => fmt(x)).join(" ") }); else if (n === 3001) self.postMessage({ k: "e", t: "… вывод обрезан: больше 3000 строк" }); };
  console.log = console.info = console.debug = (...a) => send("o", a);
  console.error = console.warn = (...a) => send("e", a);
  console.table = a => send("o", [a]);
  const lines = String(stdin || "").split("\\n"); let li = 0;
  self.readline = self.prompt = () => (li < lines.length && !(li === lines.length - 1 && lines[li] === "") ? lines[li++] : null);
  const st = self.setTimeout, sti = self.setInterval, ct = self.clearTimeout, live = new Set();
  let mainDone = false, finished = false;
  const check = () => { if (mainDone && !live.size && !finished) { finished = true; st(() => self.postMessage({ done: true }), 0); } };
  self.setTimeout = (f, ms, ...r) => { const id = st(() => { live.delete(id); try { typeof f === "function" && f(...r); } catch (err) { send("e", [err]); } check(); }, ms); live.add(id); return id; };
  self.setInterval = (f, ms, ...r) => { const id = sti(() => { try { f(...r); } catch (err) { send("e", [err]); } }, ms); live.add(id); return id; };
  self.clearTimeout = self.clearInterval = id => { live.delete(id); ct(id); check(); };
  self.addEventListener("unhandledrejection", ev => { ev.preventDefault(); send("e", ["Uncaught (in promise) " + fmt(ev.reason)]); });
  try {
    const AsyncFunction = Object.getPrototypeOf(async function () {}).constructor;
    await new AsyncFunction(code)();
  } catch (err) { send("e", [err && err.name ? err.name + ": " + err.message : String(err)]); }
  mainDone = true; check();
};`;
let playJsURL = null;
function runJsPlay(code, stdin, onLine) {
  return new Promise(resolve => {
    playJsURL = playJsURL || URL.createObjectURL(new Blob([PLAY_JS], { type: "text/javascript" }));
    const w = new Worker(playJsURL);
    const t = setTimeout(() => { w.terminate(); resolve({ timeout: true }); }, 6000);
    w.onmessage = e => { if (e.data.done) { clearTimeout(t); w.terminate(); resolve({ code: 0 }); } else onLine(e.data.k, e.data.t); };
    w.onerror = e => { e.preventDefault(); clearTimeout(t); w.terminate(); onLine("e", e.message || "Ошибка выполнения"); resolve({ code: 1 }); };
    w.postMessage({ code, stdin });
  });
}
let tsLoading = null;
function loadScript(src) { return new Promise((ok, bad) => { const s = document.createElement("script"); s.src = src; s.onload = ok; s.onerror = () => bad(new Error("не удалось загрузить " + src)); document.head.appendChild(s); }); }
async function tsToJs(code) {
  if (!window.AvaTS) { tsLoading = tsLoading || loadScript((window.AVA_VENDOR || "vendor/") + "ts.js"); await tsLoading; }
  return window.AvaTS.toJS(code);
}

/* --- удалённая компиляция: Compiler Explorer (godbolt.org), Kotlin Playground, Wandbox --- */
const GODBOLT = { cpp: ["g142", "c++"], cs: ["dotnet90csharpcoreclr", "csharp"], java: ["java2502", "java"], go: ["gl1257", "go"], rs: ["r1900", "rust"], swift: ["swift62", "swift"], rb: ["ruby347", "ruby"], dart: ["dart373", "dart"] };
const REMOTE_NAME = { kt: "play.kotlinlang.org", php: "wandbox.org" };
async function httpJSON(url, body, ms = 45000) {
  if (NATIVE && P.CapacitorHttp) {
    const r = await P.CapacitorHttp.request({ url, method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, data: body, connectTimeout: 15000, readTimeout: ms });
    if (r.status >= 400) throw new Error("HTTP " + r.status);
    return typeof r.data === "string" ? JSON.parse(r.data) : r.data;
  }
  const ctl = new AbortController(), t = setTimeout(() => ctl.abort(), ms);
  try {
    const r = await fetch(url, { method: "POST", headers: { "Content-Type": "application/json", Accept: "application/json" }, body: JSON.stringify(body), signal: ctl.signal });
    if (r.status === 429) throw new Error("Сервер компиляции перегружен. Подождите минуту и запустите снова.");
    if (!r.ok) throw new Error("HTTP " + r.status);
    return await r.json();
  } finally { clearTimeout(t); }
}
const lines = a => (a || []).map(x => x.text).join("\n").replace(/\x1b\[[0-9;]*m/g, "");
async function runRemote(lang, code, stdin) {
  if (lang === "kt") {
    const j = await httpJSON("https://api.kotlinlang.org/api/2.4.21/compiler/run", { args: "", files: [{ name: "File.kt", text: code, publicId: "" }], confType: "java" });
    const errs = Object.values(j.errors || {}).flat().filter(x => x.severity === "ERROR").map(x => `строка ${x.interval.start.line + 1}: ${x.message}`);
    const text = String(j.text || "");
    const out = (text.match(/<outStream>([\s\S]*?)<\/outStream>/g) || []).map(s => s.replace(/<\/?outStream>/g, "")).join("");
    const err = (text.match(/<errStream>([\s\S]*?)<\/errStream>/g) || []).map(s => s.replace(/<\/?errStream>/g, "")).join("");
    const exc = j.exception ? `${j.exception.fullName || "Exception"}: ${j.exception.message || ""}` : "";
    return { compile: errs.join("\n"), out: unesc(out), err: unesc(err) + (exc ? "\n" + exc : ""), code: errs.length || exc ? 1 : 0 };
  }
  if (lang === "php") {
    const j = await httpJSON("https://wandbox.org/api/compile.json", { compiler: "php-8.3.12", code, stdin });
    return { compile: j.compiler_error || "", out: j.program_output || "", err: j.program_error || "", code: +j.status || 0 };
  }
  const [id, glang] = GODBOLT[lang];
  let src = code;
  if (lang === "java") {
    // godbolt runs Java with an ASCII console: switch stdout/stderr to UTF-8 inside the main class (same line, so line numbers stay)
    const UTF = 'static { try { System.setOut(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.out), true, "UTF-8")); System.setErr(new java.io.PrintStream(new java.io.FileOutputStream(java.io.FileDescriptor.err), true, "UTF-8")); } catch (Exception e) {} } ';
    src = src.replace(/public\s+(final\s+)?class\s+(\w+)/, "class $2");
    src = src.replace(/(class\s+\w+[^{]*\{)(?=[\s\S]*static\s+void\s+main)/, m => m + UTF);
  }
  if (lang === "rb") src = 'Encoding.default_external = Encoding::UTF_8; Encoding.default_internal = Encoding::UTF_8; $stdin.set_encoding("UTF-8")\n' + src;
  const shift = lang === "rb" ? 1 : 0;
  const fix = t => t.replace(/(?:\/app\/)?(?:<source>|example\.\w+|output\.s)(:(\d+))?/g, (m, a, n) => "main" + (n ? ":" + Math.max(1, +n - shift) : ""));
  const j = await httpJSON(`https://godbolt.org/api/compiler/${id}/compile`, { source: src, options: { userArguments: lang === "cpp" ? "-std=c++20 -O1" : "", executeParameters: { args: [], stdin }, compilerOptions: { executorRequest: true }, filters: { execute: true }, tools: [], libraries: [] }, lang: glang, allowStoreCodeDebug: false });
  const b = j.buildResult || {};
  const compile = b.code ? (lines(b.stderr) || lines(b.stdout) || "Ошибка компиляции") : "";
  return { compile: fix(compile), out: lines(j.stdout), err: compile ? "" : fix(lines(j.stderr)), code: j.code, timeout: !!j.timedOut };
}
const unesc = s => s.replace(/&lt;/g, "<").replace(/&gt;/g, ">").replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/&amp;/g, "&");

/* --- Python и SQL локально --- */
const PY_LIBS = new Set(["numpy", "pandas", "matplotlib", "sklearn", "scipy", "torch", "seaborn", "statsmodels", "sympy", "networkx", "PIL", "bs4", "requests", "yaml", "fastapi", "starlette", "pydantic", "sqlalchemy", "httpx", "bcrypt", "pytest"]);
async function runPyPlay(code, stdin) {
  if (!pyReady) {
    playStatus("Загружаю Python… Это нужно один раз за запуск, около 5 секунд.");
    const r = await pyCall({ warm: true }, 60000);
    if (r.fatal) return { compile: "Не удалось загрузить Python: " + r.fatal };
    pyReady = true;
  }
  const libs = [...new Set((code.match(/^\s*(?:import|from)\s+([A-Za-z_]\w*)/gm) || []).map(m => m.trim().split(/\s+/)[1]))].filter(m => PY_LIBS.has(m));
  if (libs.includes("torch")) return { compile: "PyTorch не работает в браузере: запустите этот код у себя (pip install torch) или в Google Colab. NumPy, pandas, Matplotlib и scikit-learn работают прямо здесь." };
  if (libs.length) {
    if (!navigator.onLine) return { compile: "Нет интернета. Библиотеки " + libs.join(", ") + " загружаются из сети один раз — подключитесь и запустите снова." };
    playStatus(`Загружаю библиотеки: ${libs.join(", ")}… В первый раз это занимает до минуты.`);
    const p = await pyCall({ pkgs: code }, 180000);
    if (p.fatal || p.pkgErr) return { compile: "Не удалось загрузить библиотеки: " + (p.fatal || p.pkgErr) };
  }
  playStatus("Выполняю…");
  const r = await pyCall({ play: code, stdin }, libs.length ? 60000 : 10000);
  if (r.fatal) return { compile: r.fatal };
  if (r.error && !("out" in r)) return { timeout: true };
  return { out: r.out || "", err: r.err || "", imgs: r.imgs || [], code: r.err ? 1 : 0 };
}
async function runSqlPlay(code) {
  let db;
  try { db = await sqlEngine(); } catch (err) { return { compile: "Не удалось загрузить SQLite: " + err.message }; }
  try {
    const res = db.exec(code), changed = db.getRowsModified();
    return { tables: res.map(r => ({ cols: r.columns, rows: r.values })), out: res.length ? "" : `Выполнено. Изменено строк: ${changed}.`, code: 0 };
  } catch (err) { return { err: String(err.message || err), code: 1 }; }
  finally { db.close(); }
}

/* --- общий запуск --- */
async function runCode(lang, code, stdin, onLine) {
  const t0 = performance.now();
  let r;
  if (lang === "js" || lang === "ts") {
    let js = code;
    if (lang === "ts") { try { js = await tsToJs(code); } catch (err) { return { compile: "TypeScript: " + (err.message || err), ms: 0, where: "local" }; } }
    const buf = { o: [], e: [] };
    r = await runJsPlay(js, stdin, (k, t) => { (k === "o" ? buf.o : buf.e).push(t); onLine && onLine(k, t); });
    r.streamed = true;
  } else if (lang === "py" || lang === "base") r = await runPyPlay(code, stdin);
  else if (lang === "sql") r = await runSqlPlay(code);
  else {
    if (!navigator.onLine) return { compile: `Нет интернета. Код на ${PLAY_NAME[lang]} компилируется на сервере. Без интернета работают Python, JavaScript, TypeScript и SQL.`, ms: 0 };
    try { r = await runRemote(lang, code, stdin); }
    catch (err) { r = { compile: err.name === "AbortError" ? "Сервер компиляции не ответил за 45 секунд. Попробуйте ещё раз." : `Не удалось связаться с сервером компиляции (${err.message}). Проверьте интернет и попробуйте ещё раз.` }; }
  }
  r.ms = Math.round(performance.now() - t0);
  r.where = LOCAL_LANGS.has(lang) ? "local" : REMOTE_NAME[lang] || "godbolt.org";
  return r;
}

/* --- редактор (CodeMirror), с запасным вариантом textarea --- */
let ED = null, edLoading = null, edSeq = 0;
function ensureEditor() {
  if (window.AvaEditor) return Promise.resolve(true);
  edLoading = edLoading || loadScript((window.AVA_VENDOR || "vendor/") + "editor.js").then(() => true, () => { edLoading = null; return false; });
  return edLoading;
}
async function mountEditor(host, lang, value, onChange, onRun) {
  if (ED) { try { ED.destroy(); } catch (e) {} ED = null; }
  if (!host) return null;
  const seq = ++edSeq;
  if (!window.AvaEditor) {
    host.innerHTML = '<p class="note" style="padding:12px 14px;margin:0">Загружаю редактор…</p>';
    await ensureEditor();
    if (seq !== edSeq || !document.contains(host)) return null;
    host.innerHTML = "";
  }
  if (window.AvaEditor) {
    ED = window.AvaEditor.create(host, { lang, value, onChange, onRun, label: "Редактор кода" });
  } else {
    host.innerHTML = `<textarea class="editor" spellcheck="false" autocapitalize="off" autocorrect="off" autocomplete="off" aria-label="Редактор кода"></textarea>`;
    const ta = host.firstChild; ta.value = value;
    ta.addEventListener("input", () => onChange && onChange(ta.value));
    ED = { get value() { return ta.value; }, set value(v) { ta.value = v; }, insert(t) { ta.setRangeText(t, ta.selectionStart, ta.selectionEnd, "end"); ta.focus(); onChange && onChange(ta.value); }, focus() { ta.focus(); }, destroy() {}, setLang() {}, undo() { document.execCommand("undo"); }, redo() { document.execCommand("redo"); } };
  }
  return ED;
}
const KEYS = {
  sql: ["SELECT", "FROM", "WHERE", "JOIN", "ON", "GROUP BY", "ORDER BY", "(", ")", "*", ",", "=", "'", ";"],
  py: ["⇥", "(", ")", "[", "]", "{", "}", ":", "=", "\"", "'", "+", "-", "<", ">", "_", ",", "#"],
  def: ["⇥", "{", "}", "(", ")", "[", "]", ";", "=", "\"", "'", "+", "-", "<", ">", "&", "|", "!", ".", ",", ":", "_"],
};
const keysFor = l => KEYS[l === "base" || l === "rb" ? "py" : l] || KEYS.def;
function keyBar(lang) {
  return `<div class="keys" aria-label="Символы"><button data-act="edUndo" tabindex="-1" aria-label="Отменить">↶</button><button data-act="edRedo" tabindex="-1" aria-label="Повторить">↷</button>${keysFor(lang).map(k => `<button data-act="ins" data-t="${esc(k)}" tabindex="-1">${esc(k)}</button>`).join("")}</div>`;
}
function insertKey(t, lang) {
  if (!ED) return;
  const tab = lang === "go" ? "\t" : ["rb", "dart", "js", "ts"].includes(lang) ? "  " : "    ";
  if (t === "⇥") return ED.insert(tab);
  if (lang === "sql" && /^[A-Z]/.test(t)) return ED.insert(t + " ");
  ED.insert(t);
}

/* --- экран компилятора --- */
let PL = null; // { lang, from }
function playCode(lang) { return (S.play && S.play[lang]) ?? PLAY_START[lang]; }
function openPlay(lang, code, from) {
  lang = PLAY_LANGS.includes(lang) ? lang : lang === "base" ? "py" : "py";
  S.play = S.play || {};
  if (code != null) { S.play[lang] = code; save(); }
  PL = { lang, from: from || null };
  const local = LOCAL_LANGS.has(lang), stdin = (S.playIn || {})[lang] ?? (code == null ? PLAY_STDIN[lang] || "" : "");
  shell("", `Компилятор · ${local ? "работает без интернета" : "компиляция на сервере"}`, `${PLAY_NAME[lang]}`,
    `<div class="playbar"><label class="sr" for="pl-lang">Язык</label><select id="pl-lang" class="select">${PLAY_LANGS.map(l => `<option value="${l}" ${l === lang ? "selected" : ""}>${PLAY_NAME[l]}</option>`).join("")}</select>
       <button class="btn ghost" data-act="plReset">Пример</button><button class="btn ghost" data-act="plCopy">Копировать</button></div>
     ${from ? `<p class="note">Код из урока «${esc(from)}». Меняйте его и запускайте — так быстрее всего понять, как он работает.</p>` : ""}
     <div class="edwrap cm" id="pl-ed"></div>
     ${lang === "sql" ? "" : keyBar(lang)}
     <details class="stdin" ${stdin ? "open" : ""}><summary>Ввод программы (stdin)</summary><textarea id="pl-in" class="input stdin-ta" rows="3" spellcheck="false" autocapitalize="off" placeholder="Строки, которые программа прочитает через input(), Scanner, cin, readLine…">${esc(stdin)}</textarea></details>
     <div class="acts" style="justify-content:flex-start"><button class="btn pri big" data-act="plRun">▶ Запустить</button><span class="note">${NATIVE || /Mac|iPhone|iPad/.test(navigator.platform) ? "⌘" : "Ctrl"}+Enter</span></div>
     <div id="pl-out" class="console" aria-live="polite"><p class="note">${local ? "Код выполняется прямо на устройстве." : `Код отправляется на открытый сервер компиляции (${REMOTE_NAME[lang] || "godbolt.org"}) и возвращается результат. Нужен интернет, обычно 2–6 секунд.`}${lang === "sql" ? " В базе есть учебные таблицы магазина — посмотрите схему ниже." : ""}</p></div>
     ${lang === "sql" ? schemaHTML() : ""}`);
  openOv();
  mountEditor($("#pl-ed"), lang, playCode(lang), v => { clearTimeout(draftT); draftT = setTimeout(() => { S.play[PL.lang] = v; save(); }, 400); }, () => playRun())
    .then(ed => { if (ed && window.innerWidth > 700) ed.focus(); });
  if (lang === "py" || lang === "base") warmPython(true);
}
function playStatus(t) { const el = $("#pl-out"); if (el) el.innerHTML = `<p class="note">${esc(t)}</p>`; }
let playBusy = false;
async function playRun() {
  if (!PL || !ED || playBusy) return;
  const lang = PL.lang, code = ED.value, stdin = ($("#pl-in") || {}).value || "";
  S.play[lang] = code; S.playIn = S.playIn || {}; S.playIn[lang] = stdin; save();
  playBusy = true;
  const btn = dlg.querySelector("[data-act=plRun]"); if (btn) { btn.disabled = true; btn.textContent = "Выполняется…"; }
  const out = $("#pl-out");
  out.innerHTML = `<pre class="cout" id="pl-stream"></pre><p class="note" id="pl-wait">${LOCAL_LANGS.has(lang) ? "Выполняю…" : "Компилирую на сервере…"}</p>`;
  const stream = $("#pl-stream");
  const r = await runCode(lang, code, stdin, (k, t) => { if (stream) stream.insertAdjacentHTML("beforeend", `<span class="${k === "e" ? "err" : ""}">${esc(t)}\n</span>`); });
  playBusy = false;
  if (btn) { btn.disabled = false; btn.textContent = "▶ Запустить"; }
  if (!PL || PL.lang !== lang || !$("#pl-out")) return;
  S.counts.runs = (S.counts.runs || 0) + 1; save();
  const parts = [];
  if (r.compile) parts.push(`<div class="verdict no"><b>${/интернет|сервер|загрузить/.test(r.compile) ? "Не удалось запустить" : "Ошибка компиляции"}</b></div><pre class="cout err">${esc(r.compile)}</pre>`);
  if (r.streamed) parts.push(stream && stream.innerHTML ? `<pre class="cout">${stream.innerHTML}</pre>` : "");
  else if (r.out || r.err) parts.push(`<pre class="cout">${r.out ? esc(r.out) : ""}${r.err ? `<span class="err">${esc(r.err)}</span>` : ""}</pre>`);
  if (r.tables) parts.push(r.tables.map(t => tableHTML(t.cols, t.rows, 50)).join(""));
  if (r.imgs && r.imgs.length) parts.push(r.imgs.map((b, k) => `<img class="plot" src="data:image/png;base64,${b}" alt="График ${k + 1}">`).join(""));
  if (!r.compile && !r.out && !r.err && !r.tables && !(r.imgs && r.imgs.length) && !(r.streamed && stream && stream.innerHTML)) parts.push(`<p class="note">Программа ничего не вывела.</p>`);
  const ok = !r.compile && !r.timeout && !r.code;
  parts.push(`<p class="note">${r.timeout ? "⏱ Превышено время выполнения — возможно, бесконечный цикл. " : ""}${r.compile ? "" : ok ? "✓ Завершено" : `Код завершения: ${r.code}`} · ${r.ms} мс · ${r.where === "local" ? "на устройстве" : esc(r.where)}</p>`);
  $("#pl-out").innerHTML = parts.join("");
  beep(ok ? "ok" : "no");
  if (ok && S.counts.runs === 1) toast("Первая программа запущена!");
  checkAch();
}
function playAction(a, b) {
  switch (a) {
    case "play": openPlay(b.dataset.lang || "py"); return true;
    case "playLesson": { const L = LANGS[+b.dataset.l], t = L.lessons[+b.dataset.i], lg = L.cave || L.id; openPlay(lg === "base" ? "py" : lg, wrapProgram(lg, t.code), t.t); return true; }
    case "plRun": playRun(); return true;
    case "plReset": if (ED) { ED.value = PLAY_START[PL.lang]; S.play[PL.lang] = PLAY_START[PL.lang]; const i = $("#pl-in"); if (i) { i.value = PLAY_STDIN[PL.lang] || ""; i.closest("details").open = !!i.value; } save(); } return true;
    case "plCopy": if (ED) { navigator.clipboard && navigator.clipboard.writeText(ED.value).then(() => toast("Код скопирован"), () => toast("Не удалось скопировать")); } return true;
    case "edUndo": ED && ED.undo(); return true;
    case "edRedo": ED && ED.redo(); return true;
  }
  return false;
}
document.addEventListener("change", e => { if (e.target.id === "pl-lang") openPlay(e.target.value); });
function playCardHTML() {
  return `<section class="card stack"><div><div class="eyebrow">Компилятор</div><h2 class="h-sec">Пишите и запускайте код</h2></div>
    <p class="muted" style="margin:0">Редактор с подсветкой и запуск программ на ${PLAY_LANGS.length} языках прямо в приложении. Python, JavaScript, TypeScript и SQL работают без интернета.</p>
    <div class="chips">${PLAY_LANGS.map(l => `<button class="lchip lang" data-act="play" data-lang="${l}">${PLAY_NAME[l]}</button>`).join("")}</div></section>`;
}
