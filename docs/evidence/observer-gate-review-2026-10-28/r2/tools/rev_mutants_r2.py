"""Reviewer's own rule-6 mutants for PR #556, round 2 (R-GP-IMPL-OBSERVER-GATE-2).

Usage, from the root of a clean clone at the reviewed commit: python3 -I <this> <out.json>
Each mutant is a list of edits (path, old, new): old must occur exactly once; old "" appends; old None writes new as the whole
file (the file is created when absent and removed again afterwards). Runs git-observation.test.ts once per mutant with a JSON
reporter, restores every byte and removes every created file and directory, and records counts and each failing test's full name
and message (first 3000 characters), plus the load average before and after each run.
"""
import hashlib, json, os, subprocess, sys, tempfile

OUT = sys.argv[1]
GATE = "apps/three-surface-poc/src/git-observation.ts"
TESTF = "apps/three-surface-poc/src/git-observation.test.ts"
CONSENT = "packages/polaris-generation-consent/tsconfig.json"
SUPPORT = "packages/support/tsconfig.json"
MAIN = "apps/three-surface-poc/src/main.ts"
BASE_GATE = subprocess.run(["git", "show", f"29db2b11:{GATE}"], capture_output=True, text=True, check=True).stdout
PREDICATE = "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix))"
REF_WALK = "for (const reference of config.references ?? []) visit(posix.normalize(posix.join(project, reference.path)));"
DEPTH1 = "for (const reference of config.references ?? []) projects.add(posix.normalize(posix.join(project, reference.path)));"
DEPTH2_TREE = (CONSENT, '      "path": "../support"\n', '      "path": "../support"\n    },\n    {\n      "path": "../polaris-dossier"\n')
M9_TREE = (MAIN, "", "export type {} from '@syzygy/polaris-dossier';\n")
N2_LINE = "      expect(chain.filter((link) => link !== 'tsconfig.base.json' && !projects.some((dir) => link.startsWith(`${dir}/`))), project).toEqual([]);\n"
R5_TREE = [(SUPPORT, '"extends": "../../tsconfig.base.json"', '"extends": "../../configs/mid.json"'), ("configs/mid.json", None, '{ "extends": "../tsconfig.base.json" }\n')]
DOCS_PROBE = ", `docs/${dir}/a.ts`]"

MUTANTS = [
    ("B0", "the base gate (29db2b11 bytes) under the head test file", [(GATE, None, BASE_GATE)]),
    ("R1", "gate prefixes compared without their trailing slash", [(GATE, PREDICATE, "inputPrefixes.every((prefix) => !changedPath.startsWith(prefix.slice(0, -1)))")]),
    ("R2", "gate matches a prefix anywhere in the path (full message)", [(GATE, PREDICATE, "inputPrefixes.every((prefix) => !changedPath.includes(prefix))")]),
    ("R2-N3", "R2 with the docs/<dir>/a.ts probe removed and the pin put back to 49 (does the N3 probe carry the kill?)",
     [(GATE, PREDICATE, "inputPrefixes.every((prefix) => !changedPath.includes(prefix))"), (TESTF, DOCS_PROBE, "]"), (TESTF, "toHaveLength(61)", "toHaveLength(49)")]),
    ("R3", "one new prefix written without its slash", [(GATE, "    'packages/polaris-generation-consent/',\n", "    'packages/polaris-generation-consent',\n")]),
    ("R4", "gate refuses only when every changed path is an input (every -> some)", [(GATE, "observation.changedPaths.every(", "observation.changedPaths.some(")]),
    ("M4dir", "the lane's M4 (an extra polaris-dossier prefix), for the mismatch direction", [(GATE, "    'packages/polaris-generation-consent/',\n", "    'packages/polaris-generation-consent/',\n    'packages/polaris-dossier/',\n")]),
    ("M5dir", "the lane's M5 (scripts/clean_build.mjs dropped), for the mismatch direction", [(GATE, ", 'scripts/clean_build.mjs']);", "]);")]),
    ("R5-N2", "the lane's R5 tree with the N2 assertion removed (does the N2 assertion carry the kill?)", [*R5_TREE, (TESTF, N2_LINE, "")]),
    ("N2ok", "an intermediate link under a protected project (support extends cap1-core/mid.json, which extends the base): must pass",
     [(SUPPORT, '"extends": "../../tsconfig.base.json"', '"extends": "../cap1-core/mid.json"'), ("packages/cap1-core/mid.json", None, '{ "extends": "../../tsconfig.base.json" }\n')]),
    ("N2dossier", "an intermediate link in an unprotected workspace (support extends polaris-dossier/mid.json)",
     [(SUPPORT, '"extends": "../../tsconfig.base.json"', '"extends": "../polaris-dossier/mid.json"'), ("packages/polaris-dossier/mid.json", None, '{ "extends": "../../tsconfig.base.json" }\n')]),
    ("D1", "derivation: tsconfig reference walk stops at depth 1 (today's tree)", [(TESTF, REF_WALK, DEPTH1)]),
    ("D1x", "D1 plus the lane's D1t tree (does the D1t row report a depth-1 rewrite?)", [(TESTF, REF_WALK, DEPTH1), DEPTH2_TREE]),
    ("D4x", "derivation: the import walk adds no project, plus the lane's M9 tree", [(TESTF, "projects.add(owner);", "void owner;"), M9_TREE]),
    ("P1", "the probe list gains a sixth per-workspace probe (the length-pin message)", [(TESTF, DOCS_PROBE, ", `docs/${dir}/a.ts`, `${dir}/b.ts`]")]),
]


def vitest():
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", TESTF, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    rows = [r for f in counts.get("testResults", []) for r in f.get("assertionResults", [])]
    failing = [{"test": r["fullName"], "message": (r.get("failureMessages") or [""])[0][:3000]} for r in rows if r.get("status") == "failed"]
    suiteErrors = [(f.get("message") or "")[:1000] for f in counts.get("testResults", []) if f.get("status") == "failed" and not failing]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "total": counts.get("numTotalTests"), "failing": failing, "suiteErrors": suiteErrors}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout


rec = {"subject": "reviewer rule-6 mutants of PR #556's gate and git-observation.test.ts", "commit": git("rev-parse", "HEAD").strip(),
       "gateSha256": hashlib.sha256(open(GATE, "rb").read()).hexdigest(), "testSha256": hashlib.sha256(open(TESTF, "rb").read()).hexdigest(),
       "cleanBefore": git("status", "--porcelain") == "", "tool_sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(),
       "load": [open("/proc/loadavg").read().split()[:3]], "unmutated": vitest(), "mutants": []}
for ident, what, edits in MUTANTS:
    originals, created = {}, []
    try:
        for path, old, new in edits:
            if old is None and not os.path.exists(path):
                created.append(path)
                d = os.path.dirname(path)
                if d and not os.path.isdir(d):
                    os.makedirs(d)
                    created.append(d + "/")
                open(path, "w", encoding="utf8").write(new)
                continue
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
        for path in created:
            if path.endswith("/"):
                os.rmdir(path)
            else:
                os.remove(path)
    rec["mutants"].append({"id": ident, "what": what, "edits": [{"path": p, "old": o if p != GATE or o is not None else "<whole file>", "new": n if p != GATE or o is not None else "<29db2b11 bytes>"} for p, o, n in edits],
                           **out, "killed": out["exit"] != 0 and ((out["failed"] or 0) > 0 or bool(out["suiteErrors"]))})
    rec["load"].append(open("/proc/loadavg").read().split()[:3])
    json.dump(rec, open(OUT, "w"), indent=1)
rec["cleanAfter"] = git("status", "--porcelain") == ""
json.dump(rec, open(OUT, "w"), indent=1)
