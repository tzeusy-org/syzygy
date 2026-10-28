"""syzygy-bpyt.4.42: what sync-child-process-guard.test.ts refuses in vitest.config.ts's `test.projects`, before and after this bead.

Run from the root of a clean Syzygy checkout: `python3 -I <this file> <base commit> > record.json`. For each case it edits
vitest.config.ts (and creates any file the case names), runs the guard file once with its bytes at the base commit and once as it
stands, and restores every byte whatever happens. A case is refused when the run exits non-zero with a failing test; the record
keeps each failing test's name and first message line, the counts, and each fragment with the config's sha256.
"""
import hashlib, json, os, subprocess, sys, tempfile

GUARD = "apps/three-surface-poc/src/sync-child-process-guard.test.ts"
CFG = "vitest.config.ts"
APP = "        extends: true,\n        test: {\n          name: '@syzygy/three-surface-poc-app',"
APP_TAIL = "\n        test: {\n          name: '@syzygy/three-surface-poc-app',"
FIRST = "    projects: [\n"
OTHER = "vitest.r442-plugins.config.ts"
STRING = "vitest.r442-string.config.ts"
CASES = [
    ("today", "vitest.config.ts as it stands", []),
    ("quoted-key", "the POC app entry spells its key 'extends': true", [(CFG, APP, "        'extends': true," + APP_TAIL)]),
    ("extends-path", "the POC app entry extends another config file, which declares a plugin",
     [(OTHER, None, "export default { plugins: [{ name: 'r442-n3', resolveId: () => null }] };\n"),
      (CFG, APP, f"        extends: './{OTHER}'," + APP_TAIL)]),
    ("extends-false", "the POC app entry sets extends: false", [(CFG, APP, "        extends: false," + APP_TAIL)]),
    ("extends-string-true", "the POC app entry sets extends: 'true', a string", [(CFG, APP, "        extends: 'true'," + APP_TAIL)]),
    ("extends-missing", "the POC app entry has no extends", [(CFG, APP, APP_TAIL[1:])]),
    ("string-entry", "a string entry, a path to a config file, before the first entry",
     [(STRING, None, "export default { test: { name: 'r442-string', include: ['packages/r442-none/**/*.test.ts'] } };\n"),
      (CFG, FIRST, f"{FIRST}      './{STRING}',\n")]),
    ("function-entry", "a function entry before the first entry", [(CFG, FIRST, f"{FIRST}      () => ({{}}),\n")]),
    ("promise-entry", "a promise entry before the first entry", [(CFG, FIRST, f"{FIRST}      Promise.resolve({{}}),\n")]),
]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", GUARD, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    failing = [{"test": r["fullName"], "message": ((r.get("failureMessages") or [""])[0].split("\n") or [""])[0][:300]}
               for f in counts.get("testResults", []) for r in f.get("assertionResults", []) if r.get("status") == "failed"]
    startup = None if counts else (done.stderr.strip().split("\n") or [""])[0][:300]
    return {"exit": done.returncode, "passed": counts.get("numPassedTests"), "failed": counts.get("numFailedTests"), "failing": failing,
            "startupError": startup, "refused": done.returncode != 0 and (counts.get("numFailedTests") or 0) > 0}


def run(ident, what, edits, base_guard):
    originals, rows, out = {}, [], {}
    head_guard = open(GUARD, "rb").read()
    try:
        for path, old, new in edits:
            if old is None:
                if os.path.exists(path):
                    raise SystemExit(f"{ident}: {path} already exists")
                originals[path] = None
                open(path, "w", encoding="utf8").write(new)
                rows.append({"file": path, "old": None, "new": new, "fileSha256": None})
                continue
            original = originals.get(path) or open(path, "rb").read()
            originals.setdefault(path, original)
            text = open(path, encoding="utf8").read()
            if text.count(old) != 1:
                raise SystemExit(f"{ident}: the fragment occurs {text.count(old)} times in {path}")
            open(path, "w", encoding="utf8").write(text.replace(old, new))
            rows.append({"file": path, "old": old, "new": new, "fileSha256": hashlib.sha256(original).hexdigest()})
        open(GUARD, "wb").write(base_guard)
        out["base"] = vitest()
        open(GUARD, "wb").write(head_guard)
        out["head"] = vitest()
    finally:
        open(GUARD, "wb").write(head_guard)
        for path, original in originals.items():
            if original is None:
                os.remove(path)
            else:
                open(path, "wb").write(original)
    return {"id": ident, "case": what, "edits": rows, **out,
            "change": {(False, False): "accepted by both", (False, True): "newly refused", (True, True): "refused by both",
                       (True, False): "newly accepted"}[(out["base"]["refused"], out["head"]["refused"])]}


base = git("rev-parse", sys.argv[1]).strip()
base_guard = subprocess.run(["git", "show", f"{base}:{GUARD}"], capture_output=True, check=True).stdout
record = {"subject": "sync-child-process-guard.test.ts over test.projects entry shapes, base against head", "base": base,
          "baseGuardSha256": hashlib.sha256(base_guard).hexdigest(), "commit": git("rev-parse", "HEAD").strip(),
          "headGuardSha256": hashlib.sha256(open(GUARD, "rb").read()).hexdigest(), "worktreeClean": git("status", "--porcelain") == "",
          "tool": {"path": "docs/evidence/syzygy-bpyt-4-42/tools/project_entry_differential.py",
                   "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
          "loadavgBefore": open("/proc/loadavg").read().split()[:3], "cases": []}
for spec in CASES:
    record["cases"].append(run(*spec, base_guard))
record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
record["worktreeCleanAfter"] = git("status", "--porcelain") == ""
record["summary"] = {change: [c["id"] for c in record["cases"] if c["change"] == change]
                     for change in ("accepted by both", "newly refused", "refused by both", "newly accepted")}
print(json.dumps(record, indent=1, ensure_ascii=False))
