"""Reviewer check of the proposed N2/N3 test fixes for PR #556, in a scratch clone at 5d73176a (cwd = its root).
Usage: python3 -I rev_fixes.py <out.json>
Runs git-observation.test.ts for: R5 (support's tsconfig extends a tracked configs/mid.json outside every prefix, which extends
tsconfig.base.json) without fixes; the fixes alone; fixes + R2 (gate prefix matched anywhere); fixes + R5. Restores every byte
and the index after each run."""
import json, os, subprocess, sys, tempfile

OUT = sys.argv[1]
TESTF = "apps/three-surface-poc/src/git-observation.test.ts"
GATE = "apps/three-surface-poc/src/git-observation.ts"
SUPPORT = "packages/support/tsconfig.json"

FIX_N3 = (TESTF, "`${dir}/src/__untracked__.ts`, `${dir}x/a.ts`]), 'scripts/clean_build.mjs.bak'];\n    expect(probes).toHaveLength(49);",
          "`${dir}/src/__untracked__.ts`, `${dir}x/a.ts`, `docs/${dir}/a.ts`]), 'scripts/clean_build.mjs.bak'];\n    expect(probes).toHaveLength(61);")
FIX_N2 = (TESTF, "      expect(chain.at(-1), project).toBe('tsconfig.base.json');\n",
          "      expect(chain.at(-1), project).toBe('tsconfig.base.json');\n"
          "      expect(chain.filter((link) => link !== 'tsconfig.base.json' && !projects.some((dir) => link.startsWith(`${dir}/`))), project).toEqual([]);\n")
R2 = (GATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.includes(prefix))")
R5 = [(SUPPORT, '"extends": "../../tsconfig.base.json"', '"extends": "../../configs/mid.json"'),
      ("configs/mid.json", None, '{ "extends": "../tsconfig.base.json" }\n')]

CASES = [("R5-nofix", R5), ("fixes", [FIX_N3, FIX_N2]), ("fixes+R2", [FIX_N3, FIX_N2, R2]), ("fixes+R5", [FIX_N3, FIX_N2, *R5])]


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "r.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    rows = [r for f in counts.get("testResults", []) for r in f.get("assertionResults", [])]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "failing": [{"test": r["fullName"], "message": (r.get("failureMessages") or [""])[0].split("\n")[0][:300]} for r in rows if r["status"] == "failed"]}


rec = {"commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip(), "load": [open("/proc/loadavg").read().split()[:3]], "cases": []}
for name, edits in CASES:
    saved, created = {}, []
    try:
        for path, old, new in edits:
            if old is None:
                os.makedirs(os.path.dirname(path), exist_ok=True)
                open(path, "w").write(new)
                created.append(path)
                subprocess.run(["git", "add", path], check=True)
                continue
            saved.setdefault(path, open(path, "rb").read())
            text = open(path, encoding="utf8").read()
            assert text.count(old) == 1, (name, path, text.count(old))
            open(path, "w", encoding="utf8").write(text.replace(old, new))
        out = vitest()
    finally:
        for path, data in saved.items():
            open(path, "wb").write(data)
        for path in created:
            subprocess.run(["git", "rm", "-q", "--cached", path], check=True)
            os.remove(path)
            if not os.listdir(os.path.dirname(path)):
                os.rmdir(os.path.dirname(path))
    rec["cases"].append({"case": name, "edits": [{"path": p, "old": o if o is not None else "<new file>", "new": n} for p, o, n in edits], **out})
    rec["load"].append(open("/proc/loadavg").read().split()[:3])
rec["cleanAfter"] = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == ""
json.dump(rec, open(OUT, "w"), indent=1)
