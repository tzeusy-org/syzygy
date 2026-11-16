"""R-GP-IMPL-OBSERVER-GATE-2: two tree forms the derived test refuses and the PR body does not list, run under the base and head
test files. Usage, from the root of a clean clone at the commit to test: python3 -I <this> <out.json>
J: the POC entry imports the root package.json (a module the import walk reaches that lies in no workspace).
F: the app's tsconfig names a reference by its tsconfig file instead of its directory (TypeScript accepts both).
Each runs git-observation.test.ts with a JSON reporter and restores every byte."""
import hashlib, json, os, subprocess, sys, tempfile

OUT = sys.argv[1]
TESTF = "apps/three-surface-poc/src/git-observation.test.ts"
MUTANTS = [
    ("J", "apps/three-surface-poc/src/main.ts", "", "import '../../../package.json';\n"),
    ("F", "apps/three-surface-poc/tsconfig.json", '"path": "../../packages/http-host"', '"path": "../../packages/http-host/tsconfig.json"'),
]


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    rows = [r for f in counts.get("testResults", []) for r in f.get("assertionResults", [])]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "failing": [{"test": r["fullName"], "message": ((r.get("failureMessages") or [""])[0].split("\n") or [""])[0][:400]} for r in rows if r.get("status") == "failed"]}


git = lambda *a: subprocess.run(["git", *a], capture_output=True, text=True).stdout
rec = {"subject": "git-observation.test.ts at this commit under two tree forms", "commit": git("rev-parse", "HEAD").strip(),
       "testSha256": hashlib.sha256(open(TESTF, "rb").read()).hexdigest(), "cleanBefore": git("status", "--porcelain") == "",
       "tool_sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(), "load": [open("/proc/loadavg").read().split()[:3]],
       "unmutated": vitest(), "mutants": []}
for ident, path, old, new in MUTANTS:
    original = open(path, "rb").read()
    try:
        text = original.decode()
        if old:
            assert text.count(old) == 1, ident
            text = text.replace(old, new)
        else:
            text += new
        open(path, "w").write(text)
        rec["mutants"].append({"id": ident, "file": path, "old": old, "new": new, "fileSha256": hashlib.sha256(original).hexdigest(), **vitest()})
    finally:
        open(path, "wb").write(original)
    rec["load"].append(open("/proc/loadavg").read().split()[:3])
rec["cleanAfter"] = git("status", "--porcelain") == ""
json.dump(rec, open(OUT, "w"), indent=1)
