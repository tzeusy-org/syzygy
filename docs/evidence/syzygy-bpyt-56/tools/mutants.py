"""syzygy-bpyt.56, rule 6: each check the derived gate test adds fails when the input it guards is mutated.

Run from the root of a clean Syzygy checkout: `python3 -I <this file> > record.json`. Each mutant makes one or more edits, each
replacing one exact fragment of one file (it must occur exactly once; an empty `old` appends `new` to the file, and `old` None
creates a file that must not exist), runs the named test files, and restores every byte whatever happens. The record keeps every fragment, the commit, the unmutated run of the same files, each run's counts, and the
full name and first message line of each failing test. A mutant is killed when the run exits non-zero with a failing test or suite.
M1-M6, R2 mutate the gate; M7-M11, D1t, R5 mutate what the test derives the set from or reads, so the gate or the extends row must
follow them. R2, R5 and D1t are the round-1 review's (R-GP-IMPL-OBSERVER-GATE-1 N2, N3, N4).
"""
import hashlib, json, os, subprocess, tempfile

GATE = "apps/three-surface-poc/src/git-observation.ts"
TEST = ["apps/three-surface-poc/src/git-observation.test.ts"]
MUTANTS = [
    ("M1", "the gate drops polaris-generation-core", GATE, "    'packages/polaris-generation-core/',\n", ""),
    ("M2", "the gate drops cap1-daemon, which build:poc builds", GATE, "    'packages/cap1-daemon/',\n", ""),
    ("M3", "the gate drops polaris-generation-consent, which the app's tsconfig references", GATE, "    'packages/polaris-generation-consent/',\n", ""),
    ("M4", "the gate protects a project the start neither compiles nor loads", GATE, "    'packages/polaris-generation-consent/',\n", "    'packages/polaris-generation-consent/',\n    'packages/polaris-dossier/',\n"),
    ("M5", "the gate drops the build step's program", GATE, ", 'scripts/clean_build.mjs']);", "]);"),
    ("M6", "the gate protects only each project's src/ (the PR 535 review's N6)", GATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.startsWith(`${prefix}src/`))"),
    ("M7", "build:poc builds one more project", "package.json", "packages/polaris-generation-core apps/three-surface-poc\",", "packages/polaris-generation-core packages/polaris-dossier apps/three-surface-poc\","),
    ("M8", "the app's tsconfig references one more project", "apps/three-surface-poc/tsconfig.json", "      \"path\": \"../../packages/support\"\n", "      \"path\": \"../../packages/support\"\n    },\n    {\n      \"path\": \"../../packages/polaris-dossier\"\n"),
    ("M9", "the POC entry imports one more workspace", "apps/three-surface-poc/src/main.ts", "", "export type {} from '@syzygy/polaris-dossier';\n"),
    ("M10", "a protected project's tsconfig extends no base", "packages/support/tsconfig.json", "  \"extends\": \"../../tsconfig.base.json\",\n", ""),
    ("M11", "the poc script takes a shape the derivation does not read", "package.json", "\"poc\": \"npm run build:poc --silent && node", "\"poc\": \"npm run build:poc && node"),
    ("R2", "the gate matches a protected prefix anywhere in the path", GATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.includes(prefix))"),
    ("R5", "a protected project's extends chain passes through a file outside every protected project", [
        ("packages/support/tsconfig.json", '"extends": "../../tsconfig.base.json"', '"extends": "../../configs/mid.json"'),
        ("configs/mid.json", None, '{ "extends": "../tsconfig.base.json" }\n')]),
    ("D1t", "a project only a depth-2 reference reaches: the consent package's tsconfig references polaris-dossier", "packages/polaris-generation-consent/tsconfig.json", "      \"path\": \"../support\"\n", "      \"path\": \"../support\"\n    },\n    {\n      \"path\": \"../polaris-dossier\"\n"),
]


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    failing = [{"test": r["fullName"], "message": ((r.get("failureMessages") or [""])[0].split("\n") or [""])[0][:300]}
               for f in counts.get("testResults", []) for r in f.get("assertionResults", []) if r.get("status") == "failed"]
    failing += [{"suite": os.path.relpath(f["name"]), "message": (f.get("message") or "").split("\n")[0][:300]}
                for f in counts.get("testResults", []) if f.get("status") == "failed" and not any(r.get("status") == "failed" for r in f.get("assertionResults", []))]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "failedSuites": counts.get("numFailedTestSuites"), "total": counts.get("numTotalTests"), "failing": failing}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


record = {"subject": "rule-6 mutants of syzygy-bpyt.56's gate and its derived test", "commit": git("rev-parse", "HEAD").strip(),
          "worktreeClean": git("status", "--porcelain") == "",
          "tool": {"path": "docs/evidence/syzygy-bpyt-56/tools/mutants.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
          "loadavgBefore": open("/proc/loadavg").read().split()[:3], "unmutated": vitest(TEST), "mutants": []}
for ident, what, *spec in MUTANTS:
    edits = spec[0] if len(spec) == 1 else [tuple(spec)]
    originals, rows = {}, []
    try:
        for path, old, new in edits:
            if old is None:
                if os.path.exists(path):
                    raise SystemExit(f"{ident}: {path} exists")
                originals[path] = None
                os.makedirs(os.path.dirname(path) or ".", exist_ok=True)
                open(path, "w").write(new)
                rows.append({"file": path, "old": None, "new": new, "fileSha256": None})
                continue
            original = open(path, "rb").read()
            originals[path] = original
            text = original.decode()
            if old == "":
                text += new
            else:
                if text.count(old) != 1:
                    raise SystemExit(f"{ident}: the fragment occurs {text.count(old)} times in {path}")
                text = text.replace(old, new)
            open(path, "w").write(text)
            rows.append({"file": path, "old": old, "new": new, "fileSha256": hashlib.sha256(original).hexdigest()})
        outcome = vitest(TEST)
    finally:
        for path, original in originals.items():
            if original is None:
                os.remove(path)
                if os.path.isdir(os.path.dirname(path)) and not os.listdir(os.path.dirname(path)):
                    os.rmdir(os.path.dirname(path))
            else:
                open(path, "wb").write(original)
    record["mutants"].append({"id": ident, "mutation": what, "edits": rows, "tests": TEST, **outcome,
                              "killed": outcome["exit"] != 0 and (outcome["failed"] or 0) + (outcome["failedSuites"] or 0) > 0})
record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
record["worktreeCleanAfter"] = git("status", "--porcelain") == ""
record["killed"] = sum(m["killed"] for m in record["mutants"])
record["of"] = len(record["mutants"])
print(json.dumps(record, indent=1, ensure_ascii=False))
