#!/usr/bin/env python3
"""Run lesson examples of Python caves and print their output next to the code (to check the # comments)."""
import json, subprocess, sys, os, tempfile
from pathlib import Path
ROOT = Path(__file__).resolve().parent.parent
tmp = Path(tempfile.mkdtemp())
subprocess.run([sys.executable, str(ROOT / "build_content.py"), str(tmp / "c.js")], check=True, stdout=subprocess.DEVNULL)
js = (tmp / "c.js").read_text().split("\nwindow.AVA_TRACKS=")[0]
data = json.loads(js[js.index("=") + 1:].rstrip().rstrip(";"))
only = set(sys.argv[1:])
for L in data:
    if L.get("cave") != "py" or (only and L["id"] not in only): continue
    for i, les in enumerate(L["lessons"]):
        d = tmp / f"{L['id']}{i}"; d.mkdir()
        (d / "a.py").write_text(les["code"])
        p = subprocess.run([sys.executable, "a.py"], cwd=d, capture_output=True, text=True, env={**os.environ, "MPLBACKEND": "Agg"}, timeout=300)
        print(f"===== {L['id']} {i+1} {les['t']} rc={p.returncode}")
        print(p.stdout[-1500:]); print(p.stderr[-800:]) if p.returncode else None
