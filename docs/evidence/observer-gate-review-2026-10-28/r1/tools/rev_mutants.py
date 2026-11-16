"""Reviewer's own rule-6 mutants for PR #556 (R-GP-IMPL-OBSERVER-GATE-1).

Usage, from the root of a clean clone at the reviewed commit: python3 -I <this> <out.json>
Each mutant is a list of edits (path, old, new); old must occur exactly once (old None replaces the whole file with new). Runs
git-observation.test.ts once per mutant with a JSON reporter, restores every byte, and records counts, each failing test's full
name, its first message line and its duration, plus the load average before and after.
"""
import hashlib, json, os, subprocess, sys, tempfile

OUT = sys.argv[1]
GATE = "apps/three-surface-poc/src/git-observation.ts"
TESTF = "apps/three-surface-poc/src/git-observation.test.ts"
CONSENT = "packages/polaris-generation-consent/tsconfig.json"
MAIN = "apps/three-surface-poc/src/main.ts"
BASE_GATE = subprocess.run(["git", "show", f"29db2b11:{GATE}"], capture_output=True, text=True, check=True).stdout

REF_WALK = "for (const reference of config.references ?? []) visit(posix.normalize(posix.join(project, reference.path)));"
DEPTH1 = "for (const reference of config.references ?? []) projects.add(posix.normalize(posix.join(project, reference.path)));"
DEPTH2_TREE = (CONSENT, '      "path": "../support"\n', '      "path": "../support"\n    },\n    {\n      "path": "../polaris-dossier"\n')
M9_TREE = (MAIN, "", "export type {} from '@syzygy/polaris-dossier';\n")
REEXPORT_TREE = (MAIN, "", "export type {} from '@syzygy/polaris-dossier';\n")

MUTANTS = [
    ("B0", "the base gate (29db2b11) under the head test file", [(GATE, None, BASE_GATE)]),
    ("R1", "gate prefixes compared without their trailing slash", [(GATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix.slice(0, -1)))")]),
    ("R2", "gate matches a prefix anywhere in the path", [(GATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))", "inputPrefixes.every((prefix) => !changedPath.includes(prefix))")]),
    ("R3", "one new prefix written without its slash", [(GATE, "    'packages/polaris-generation-consent/',\n", "    'packages/polaris-generation-consent',\n")]),
    ("R4", "gate refuses only when every changed path is an input (every -> some)", [(GATE, "observation.changedPaths.every(", "observation.changedPaths.some(")]),
    ("D1", "derivation: tsconfig reference walk stops at depth 1 (today's tree)", [(TESTF, REF_WALK, DEPTH1)]),
    ("D1t", "derivation unmutated; tree: polaris-generation-consent references polaris-dossier (depth 2 from the app)", [DEPTH2_TREE]),
    ("D1x", "D1 plus the D1t tree", [(TESTF, REF_WALK, DEPTH1), DEPTH2_TREE]),
    ("D2", "derivation: the import walk drops every re-export edge (today's tree)", [(TESTF, "ts.preProcessFile(readModule(file), true, true)", "ts.preProcessFile(readModule(file).replace(/^export [^;]*? from [^;]*;$/gmu, ''), true, true)")]),
    ("D2x", "D2 plus the lane's M9 tree (main.ts re-exports a type from polaris-dossier)", [(TESTF, "ts.preProcessFile(readModule(file), true, true)", "ts.preProcessFile(readModule(file).replace(/^export [^;]*? from [^;]*;$/gmu, ''), true, true)"), REEXPORT_TREE]),
    ("D3", "derivation: the build-step parser takes only the first project", [(TESTF, "build.forEach(visit);", "build.slice(0, 1).forEach(visit);")]),
    ("D4", "derivation: the import walk contributes no project (today's tree)", [(TESTF, "projects.add(owner);", "void owner;")]),
    ("D4x", "D4 plus the lane's M9 tree", [(TESTF, "projects.add(owner);", "void owner;"), M9_TREE]),
    ("D5", "derivation: reference walk dropped entirely (build list plus imports only)", [(TESTF, REF_WALK, "void config;")]),
]


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    rows = [r for f in counts.get("testResults", []) for r in f.get("assertionResults", [])]
    failing = [{"test": r["fullName"], "message": ((r.get("failureMessages") or [""])[0].split("\n") or [""])[0][:400], "ms": r.get("duration")}
               for r in rows if r.get("status") == "failed"]
    suiteErrors = [(f.get("message") or "")[:400] for f in counts.get("testResults", []) if f.get("status") == "failed" and not failing]
    durations = {r["title"]: r.get("duration") for r in rows if "refuse" in r["title"] or "extends" in r["title"]}
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "total": counts.get("numTotalTests"), "failing": failing, "suiteErrors": suiteErrors, "durations": durations}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout


rec = {"commit": git("rev-parse", "HEAD").strip(), "cleanBefore": git("status", "--porcelain") == "",
       "tool_sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(), "load": [open("/proc/loadavg").read().split()[:3]],
       "unmutated": vitest(), "mutants": []}
for ident, what, edits in MUTANTS:
    originals = {}
    try:
        for path, old, new in edits:
            if path not in originals:
                originals[path] = open(path, "rb").read()
            text = open(path, encoding="utf8").read()
            if old is None:
                text = new
            elif old == "":
                text += new
            else:
                assert text.count(old) == 1, f"{ident}: fragment occurs {text.count(old)} times in {path}"
                text = text.replace(old, new)
            open(path, "w", encoding="utf8").write(text)
        out = vitest()
    finally:
        for path, data in originals.items():
            open(path, "wb").write(data)
    rec["mutants"].append({"id": ident, "what": what, "edits": [{"path": p, "old": o if o is not None else "<whole file>", "new": n if o is not None else "<29db2b11 bytes>"} for p, o, n in edits],
                           **out, "killed": out["exit"] != 0 and ((out["failed"] or 0) > 0 or bool(out["suiteErrors"]))})
    rec["load"].append(open("/proc/loadavg").read().split()[:3])
    json.dump(rec, open(OUT, "w"), indent=1)
rec["cleanAfter"] = git("status", "--porcelain") == ""
json.dump(rec, open(OUT, "w"), indent=1)
