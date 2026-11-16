"""syzygy-bpyt.4.2 after the PR 549 round-1 repairs, rule 6: each new or changed check fails when the input it guards is mutated.

Run from the root of a Syzygy checkout at a clean commit, with its product built (`npm run build`, so a check that would only
fail for want of a dist is not credited, and X2b's plugin has a dist to send the suite to): `python3 -I <this file> > record.json`
(the tool's own path may lie outside the checkout). Each mutant replaces exact fragments of one or more files (each must occur
exactly once), runs the named test files, and restores every file's bytes, whatever happens. The record keeps every fragment,
the commit, the unmutated run of the same files, and each run's counts and the full name and first message line of each failing
test. A mutant is killed when the run exits non-zero with a failing test or suite.

The mutants:
- M1-M17: tools/mutants.py's rows (read from it with ast, not retyped). M10's fragment is rewritten for the new refusal line,
  which reads `options` (the review's F4 code).
- X2b, X3b, X4, X8: the reviewer's (R-GP-IMPL-SOURCE-RESOLUTION-1, tools/reviewer_mutants.py and tools/x2b_probe.py), copied by
  script with those files' sha256 below.
- R1-R11: one per check the round-1 repairs add.
"""
import ast, hashlib, json, os, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PB = "apps/three-surface-poc/src/product-build.test.ts"
PG = "packages/polaris-generation-core/src/workspace-reach.test.ts"
GO = "apps/three-surface-poc/src/git-observation.test.ts"


def lane_rows():
    tree = ast.parse(open(os.path.join(HERE, "mutants.py"), encoding="utf-8").read())
    value = next(node.value for node in tree.body if isinstance(node, ast.Assign) and any(getattr(t, "id", None) == "MUTANTS" for t in node.targets))
    rows = []
    for ident, what, path, old, new, files in ast.literal_eval(value):
        if ident == "M10":
            what, old = what + " (fragment rewritten for the round-1 refusal line)", "options.outDir !== 'dist' || "
        rows.append((ident, what, {path: [(old, new)]}, files))
    return rows


REVIEWER_SOURCES = {"reviewer_mutants.py": "5dfd3f210d1fc0d71d0b48056724bbdd45595d17e1b9da971b900caa29641815",
                    "x2b_probe.py": "19c2951edf7fccd16a68f30a3137dc156738e268c95f21a03a9c248317f5d98f"}
REVIEWER = [
    ('X3b', "the clean build follows only the named projects' references, not their references' references", 'scripts/clean_build.mjs', '  for (const reference of config.references ?? []) visit(', '  if (projects.includes(project)) for (const reference of config.references ?? []) visit(', ['apps/three-surface-poc/src/product-build.test.ts']),
    ('X4', "a project's tsconfig adds a test by `files`", 'packages/support/tsconfig.json', '"include": ["src"],', '"files": ["src/sha256.test.ts"],\n  "include": ["src"],', ['apps/three-surface-poc/src/product-build.test.ts']),
    ('X8', 'the clean build drops its workspace-path predicate, keeping only the tsconfig check', 'scripts/clean_build.mjs', 'if (!/^(?:apps|packages)\\/[^/]+$/u.test(project) || !existsSync(path))', 'if (!existsSync(path))', ['apps/three-surface-poc/src/product-build.test.ts']),
    ('X2b', "X2 with the plugin name double-quoted, so the suite scan does not count it as a project (the reviewer's x2b_probe.py)", 'vitest.config.ts', 'export default defineConfig({\n', 'export default defineConfig({\n  plugins: [{ name: "r549-dist", enforce: \'pre\', resolveId(id: string) { return id === \'@syzygy/support\' ? fileURLToPath(new URL(\'./packages/support/dist/index.js\', import.meta.url)) : null; } }],\n', ['packages/polaris-generation-core/src/workspace-reach.test.ts']),
]

OWN = [
    ("R1", "F1: a product tsconfig re-includes a test-support module", {
        "packages/three-surface-poc-core/tsconfig.json": [(',\n    "src/test-frozen.ts"', "")]}, [PB]),
    ("R2", "F1: a built module imports a test-support module, its tsconfig unchanged", {
        "packages/three-surface-poc-core/src/index.ts": [("", "export type {} from './test-frozen.js';\n")]}, [PB]),
    ("R3", "F1: a built module imports a kit the build already keeps, so the emitted set is unchanged", {
        "packages/polaris-dossier/src/index.ts": [("", "export type {} from './full-run.testkit.js';\n")]}, [PB]),
    ("R4", "F1: a product tsconfig drops the exclude of a kit", {
        "packages/polaris-dossier/tsconfig.json": [(', "src/fs-patch.testkit.ts"', "")]}, [PB]),
    ("R5", "F2: the observer-input gate stops protecting the clean-build script", {
        "apps/three-surface-poc/src/git-observation.ts": [(", 'scripts/clean_build.mjs']);", "]);")]}, [GO]),
    ("R6", "F4: the clean build follows a reference cycle without refusing it", {
        "scripts/clean_build.mjs": [("  if (visiting.includes(project)) throw new Error(`${[...visiting, project].join(' -> ')}: project references form a cycle`);\n", "")]}, [PB]),
    ("R7", "F4: the clean build accepts a declarationDir", {
        "scripts/clean_build.mjs": [(" || 'declarationDir' in options", "")]}, [PB]),
    ("R8", "F4: the clean build accepts an outFile", {
        "scripts/clean_build.mjs": [(" || 'outFile' in options", "")]}, [PB]),
    ("R9", "N1: the clean build follows a project directory that resolves outside the checkout", {
        "scripts/clean_build.mjs": [("  if (!realpathSync(project).startsWith(`${realpathSync('.')}/`)) throw new Error(`${project}: resolves outside the checkout`);\n", "")]}, [PB]),
    ("R10", "N10: the clean build lets a JSON parse error name no file", {
        "scripts/clean_build.mjs": [("  try { config = JSON.parse(readFileSync(path, 'utf8')); } catch { throw new Error(`${path}: not plain JSON`); }\n",
                                     "  config = JSON.parse(readFileSync(path, 'utf8'));\n")]}, [PB]),
    ("R11", "F5: a workspace export's source names a module other than the one Node resolves it to, under a resolver plugin", {
        "vitest.config.ts": [("export default defineConfig({\n", "export default defineConfig({\n  plugins: [{ name: \"r549-cap1\", enforce: 'pre', resolveId(id: string) { return id === '@syzygy/cap1-core/testing' ? fileURLToPath(new URL('./packages/cap1-core/dist/testing.js', import.meta.url)) : null; } }],\n")]}, [PG]),
]


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    failing = [{"test": result["fullName"], "message": ((result.get("failureMessages") or [""])[0].split("\n") or [""])[0][:300]}
               for file in counts.get("testResults", []) for result in file.get("assertionResults", []) if result.get("status") == "failed"]
    failing += [{"suite": os.path.relpath(file["name"]), "message": (file.get("message") or "").split("\n")[0][:300]}
                for file in counts.get("testResults", []) if file.get("status") == "failed" and not any(r.get("status") == "failed" for r in file.get("assertionResults", []))]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "failedSuites": counts.get("numFailedTestSuites"), "total": counts.get("numTotalTests"), "failing": failing}


def main():
    rows = lane_rows() + [(i, w, {p: [(o, n)]}, f) for i, w, p, o, n, f in REVIEWER] + OWN
    record = {
        "subject": "rule-6 mutants of the checks syzygy-bpyt.4.2 adds or changes, after the PR 549 round-1 repairs",
        "commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip(),
        "worktreeClean": subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == "",
        "tool": {"path": "docs/evidence/syzygy-bpyt-4-2/tools/mutants_r1.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
        "lanerows": {"path": "docs/evidence/syzygy-bpyt-4-2/tools/mutants.py", "sha256": hashlib.sha256(open(os.path.join(HERE, "mutants.py"), "rb").read()).hexdigest()},
        "reviewerSources": REVIEWER_SOURCES,
        "loadavgBefore": open("/proc/loadavg").read().split()[:3],
        "unmutated": vitest(sorted({file for *_, files in rows for file in files})),
        "mutants": [],
    }
    for ident, what, edits, files in rows:
        originals = {path: open(path, "rb").read() for path in edits}
        try:
            for path, pairs in edits.items():
                text = originals[path].decode()
                for old, new in pairs:
                    if old == "":
                        text += new
                        continue
                    if text.count(old) != 1:
                        raise SystemExit(f"{ident}: the fragment occurs {text.count(old)} times in {path}")
                    text = text.replace(old, new)
                open(path, "w").write(text)
            outcome = vitest(files)
        finally:
            for path, data in originals.items():
                open(path, "wb").write(data)
        record["mutants"].append({"id": ident, "mutation": what,
                                  "edits": {path: [{"old": o, "new": n} for o, n in pairs] for path, pairs in edits.items()},
                                  "fileSha256": {path: hashlib.sha256(data).hexdigest() for path, data in originals.items()},
                                  "tests": files, **outcome,
                                  "killed": outcome["exit"] != 0 and (outcome["failed"] or 0) + (outcome["failedSuites"] or 0) > 0})
    record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
    record["worktreeCleanAfter"] = subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == ""
    record["killed"] = sum(mutant["killed"] for mutant in record["mutants"])
    record["of"] = len(record["mutants"])
    print(json.dumps(record, indent=1, ensure_ascii=False))


main()
