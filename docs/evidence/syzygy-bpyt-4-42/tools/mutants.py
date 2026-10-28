"""syzygy-bpyt.4.42, rule 6: each check syzygy-bpyt.65 and this bead add fails when the input it guards is mutated.

A copy of docs/evidence/syzygy-bpyt-65/tools/mutants.py, left unchanged because its record and the PR 558 review's name its bytes.
This copy moves E1 from EQUIVALENT into MUTANTS (the review's F2 falsified its reason; the backslash row now kills it), adds C10
(the review's N2, killed by the dist-x row), the N3 routes (a project entry of vitest.config.ts that reaches another config file
by `extends`, a string entry, an entry with no `extends`) and two mutants of the new guard (G1, G2), and runs one probe for N6.

Run from the root of a clean Syzygy checkout: `python3 -I <this file> > record.json`. Each mutant makes one or more edits, each
replacing one exact fragment of one file (it must occur exactly once), runs the named test files, and restores every byte whatever
happens; an edit whose old fragment is None creates the file, which must not exist, and removes it. The record keeps every fragment with the file's sha256, the commit, the unmutated run of each test set, each run's counts,
and the full name and first message line of each failing test. A mutant is killed when the run exits non-zero with a failing test
and, where the row names one, a failing message that contains the expected text and a failing test whose name contains the
expected name.

X9* put a resolver plugin into vitest.config.ts (the PR 549 review's X9) and P1 drops the refusal; X10* add a triple-slash
reference to test support (its X10) and P2 restores the import-only model; C* drop or weaken one clean_build.mjs refusal.
DEFENCE holds mutants run and recorded but not scored, each with its reason. PROBES are runs that are compared, not scored.
"""
import hashlib, json, os, subprocess, tempfile

GUARD = ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]
BUILD = ["apps/three-surface-poc/src/product-build.test.ts"]
CFG = "vitest.config.ts"
GUARD_FILE = GUARD[0]
BUILD_FILE = BUILD[0]
SCRIPT = "scripts/clean_build.mjs"
APP_ENTRY = "        test: {\n          name: '@syzygy/three-surface-poc-app',"
RESOLVER = "enforce: 'pre', resolveId(id: string) { return id === '@syzygy/support' ? fileURLToPath(new URL('./packages/support/dist/index.js', import.meta.url)) : null; } }],\n"
PLUGIN_MESSAGE = "a plugin may load a workspace package by other than its source condition"
NEW_MODEL = ("  const program = ts.createProgram({ rootNames: parsed.fileNames, options: parsed.options, projectReferences: parsed.projectReferences });\n"
             "  return program.getSourceFiles().map(({ fileName }) => fileName)\n"
             "    .filter((file) => file.startsWith(`${base}${project}/src/`) && !file.endsWith('.d.ts')).map((file) => file.slice(base.length)).sort();\n")
OLD_MODEL = ("  const seen = new Set(parsed.fileNames.map((file) => file.slice(base.length)));\n"
             "  const queue = [...seen];\n"
             "  for (let from = queue.shift(); from !== undefined; from = queue.shift()) {\n"
             "    for (const specifier of ts.preProcessFile(readFileSync(join(base, from), 'utf8'), true, true).importedFiles.map(({ fileName }) => fileName)) {\n"
             "      const to = resolve(from, specifier);\n"
             "      if (typeof to === 'string' && to.startsWith(`${project}/src/`) && !seen.has(to)) { seen.add(to); queue.push(to); }\n"
             "    }\n"
             "  }\n"
             "  return [...seen].sort();\n")
OWN_OUTDIR = ("options.outDir !== 'dist' || ", "")
EFFECTIVE_OUTDIR = ("!underDist(effective.outDir) || ", "")
APP_EXTENDS = "        extends: true,\n" + APP_ENTRY
OTHER_CONFIG = "vitest.r442-plugins.config.ts"
DETACHED = "no project entry detached from the root config"
OUTSIDE = ("  if (!realpathSync(project).startsWith(`${realpathSync('.')}/`)) throw new Error(`${project}: resolves outside the checkout`);\n", "")
CLEAR = "    // A row whose refusal fails leaves its outside path behind; it is not the next row's (syzygy-bpyt.4.42).\n    KEPT_OUTSIDE.length = 0;\n"
KEPT_LOOP = ("...KEPT_OUTSIDE]) expect(", "...KEPT_OUTSIDE.splice(0)]) expect(")

MUTANTS = [
    ("X9s", "a resolver plugin in the POC app's project entry, single-quoted name", GUARD, PLUGIN_MESSAGE,
     [(CFG, APP_ENTRY, "        plugins: [{ name: 'r65-x9', " + RESOLVER + APP_ENTRY)]),
    ("X9d", "a resolver plugin in the POC app's project entry, double-quoted name", GUARD, PLUGIN_MESSAGE,
     [(CFG, APP_ENTRY, "        plugins: [{ name: \"r65-x9\", " + RESOLVER + APP_ENTRY)]),
    ("X9r", "a resolver plugin at the root of the config", GUARD, PLUGIN_MESSAGE,
     [(CFG, "  ssr: { resolve:", "  plugins: [{ name: \"r65-x9r\", " + RESOLVER + "  ssr: { resolve:")]),
    ("X9q", "a plugins key written quoted, in the POC app's project entry", GUARD, PLUGIN_MESSAGE,
     [(CFG, APP_ENTRY, "        'plugins': [],\n" + APP_ENTRY)]),
    ("P1", "the guard drops the plugins refusal", GUARD, None,
     [(GUARD_FILE, "  if (PLUGINS_KEY.test(config)) throw new Error(`${VITEST_CONFIG}: " + PLUGIN_MESSAGE + "`);\n", "")]),
    ("X10", "the POC core's index names test-frozen.ts in a triple-slash reference", BUILD, None,
     [("packages/three-surface-poc-core/src/index.ts", "export * from './model.js';\n", "/// <reference path=\"./test-frozen.ts\" />\nexport * from './model.js';\n")]),
    ("X10b", "the app's git-observation.ts names test-http-client.ts in a triple-slash reference", BUILD, None,
     [("apps/three-surface-poc/src/git-observation.ts", "import { execFileSync } from 'node:child_process';\nimport { realpathSync }",
       "/// <reference path=\"./test-http-client.ts\" />\nimport { execFileSync } from 'node:child_process';\nimport { realpathSync }")]),
    ("P2", "the emitted set goes back to the import-only model", BUILD, None, [(BUILD_FILE, NEW_MODEL, OLD_MODEL)]),
    ("C1", "clean_build drops the effective declarationDir refusal", BUILD, None,
     [(SCRIPT, " || ('declarationDir' in effective && !underDist(effective.declarationDir))", "")]),
    ("C2", "clean_build drops the effective outFile refusal", BUILD, None, [(SCRIPT, "\n    || 'outFile' in effective) {", ") {")]),
    ("C3", "clean_build drops the non-composite reference refusal", BUILD, None,
     [(SCRIPT, "for (const project of referenced) if (!composite.get(project)) throw", "for (const project of referenced) if (false) throw")]),
    ("C4", "clean_build takes an unset composite as composite", BUILD, None,
     [(SCRIPT, "composite.set(project, effective.composite === true);", "composite.set(project, effective.composite !== false);")]),
    ("C5", "clean_build reads composite from the tsconfig's own options, not through extends", BUILD, None,
     [(SCRIPT, "composite.set(project, effective.composite === true);", "composite.set(project, options.composite === true);")]),
    ("C6", "clean_build drops both the own and the effective outDir refusal", BUILD, None, [(SCRIPT, *OWN_OUTDIR), (SCRIPT, *EFFECTIVE_OUTDIR)]),
    ("C7", "clean_build requires composite of every project it builds, not only referenced ones", BUILD, None,
     [(SCRIPT, "for (const project of referenced) if", "for (const project of built) if")]),
    # syzygy-bpyt.4.42.
    ("E1", "clean_build drops only the effective outDir and tsBuildInfoFile refusals", BUILD, None,
     [(SCRIPT, "!underDist(effective.outDir) || !underDist(effective.tsBuildInfoFile) || ", "")], "directory name holds a backslash"),
    ("C10", "underDist loses the / after dist, so a declarationDir dist-x passes", BUILD, None,
     [(SCRIPT, "file.startsWith(`${dist}/`)", "file.startsWith(dist)")], "sibling of dist"),
    ("N3p", "the POC app's project entry extends another config file, which declares a plugin", GUARD, "test.projects.8.extends is not true",
     [(OTHER_CONFIG, None, "export default { plugins: [{ name: 'r442-n3', resolveId: () => null }] };\n"),
      (CFG, APP_EXTENDS, f"        extends: './{OTHER_CONFIG}',\n" + APP_ENTRY)], DETACHED),
    ("N3s", "a string project entry, a path to a config file, before the first entry", GUARD, "test.projects.0 is not an object",
     [(CFG, "    projects: [\n", "    projects: [\n      'packages/r442-none/vitest.config.ts',\n")], DETACHED),
    ("N3m", "the POC app's project entry drops extends: true", GUARD, "test.projects.8.extends is not true",
     [(CFG, APP_EXTENDS, APP_ENTRY)], DETACHED),
    ("G1", "the guard takes any extends but false as inheriting", GUARD, None,
     [(GUARD_FILE, ".extends === true ? [] :", ".extends !== false ? [] :")], "reads every project entry that does not inherit"),
    ("G2", "the guard drops its object check, so only null is not an object", GUARD, None,
     [(GUARD_FILE, "if (typeof entry !== 'object' || entry === null || Array.isArray(entry)) return", "if (entry === null) return")],
     "reads every project entry that does not inherit"),
]
DEFENCE = [
    ("C6a", "clean_build drops only the own outDir refusal: expected to survive, because the effective check refuses the same trees",
     BUILD, None, [(SCRIPT, *OWN_OUTDIR)]),
]
# N6: with the outside-checkout refusal dropped, its row fails. Before this bead (KEPT_OUTSIDE emptied only after a passing
# rejects) the next row failed too, on the path the failed row left behind; with the bead's clearing, only that row fails.
PROBES = [
    ("N6-before", "outside refusal dropped, KEPT_OUTSIDE emptied only after the rejects, as before this bead", BUILD, None,
     [(SCRIPT, *OUTSIDE), (BUILD_FILE, CLEAR, ""), (BUILD_FILE, *KEPT_LOOP)]),
    ("N6-after", "outside refusal dropped, the test as it stands", BUILD, None, [(SCRIPT, *OUTSIDE)]),
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
            "total": counts.get("numTotalTests"), "failing": failing}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True).stdout


def run(ident, what, tests, expect, edits, name=None):
    originals, rows = {}, []
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
        outcome = vitest(tests)
    finally:
        for path, original in originals.items():
            if original is None:
                os.remove(path)
            else:
                open(path, "wb").write(original)
    matched = ((expect is None or any(expect in f["message"] for f in outcome["failing"]))
               and (name is None or any(name in f.get("test", "") for f in outcome["failing"])))
    return {"id": ident, "mutation": what, "edits": rows, "tests": tests, "expectedMessage": expect, "expectedTest": name, **outcome,
            "killed": outcome["exit"] != 0 and (outcome["failed"] or 0) > 0 and matched}


record = {"subject": "rule-6 mutants of syzygy-bpyt.65's and syzygy-bpyt.4.42's guards and clean_build.mjs refusals", "commit": git("rev-parse", "HEAD").strip(),
          "worktreeClean": git("status", "--porcelain") == "",
          "tool": {"path": "docs/evidence/syzygy-bpyt-4-42/tools/mutants.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
          "loadavgBefore": open("/proc/loadavg").read().split()[:3],
          "unmutated": {"guard": vitest(GUARD), "build": vitest(BUILD)}, "mutants": [], "defence": [], "probes": []}
for spec in MUTANTS:
    record["mutants"].append(run(*spec))
for spec in DEFENCE:
    record["defence"].append(run(*spec))
for spec in PROBES:
    record["probes"].append(run(*spec))
record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
record["worktreeCleanAfter"] = git("status", "--porcelain") == ""
record["killed"] = sum(m["killed"] for m in record["mutants"])
record["of"] = len(record["mutants"])
print(json.dumps(record, indent=1, ensure_ascii=False))
