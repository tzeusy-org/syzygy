"""syzygy-bpyt.65, rule 6: each check this bead adds fails when the input it guards is mutated.

Run from the root of a clean Syzygy checkout: `python3 -I <this file> > record.json`. Each mutant makes one or more edits, each
replacing one exact fragment of one file (it must occur exactly once), runs the named test files, and restores every byte whatever
happens. The record keeps every fragment with the file's sha256, the commit, the unmutated run of each test set, each run's counts,
and the full name and first message line of each failing test. A mutant is killed when the run exits non-zero with a failing test
and, where the row names one, a failing message that contains the expected text.

X9* put a resolver plugin into vitest.config.ts (the PR 549 review's X9) and P1 drops the refusal; X10* add a triple-slash
reference to test support (its X10) and P2 restores the import-only model; C* drop or weaken one clean_build.mjs refusal.
DEFENCE holds mutants run and recorded but not scored, and EQUIVALENT names one not run, each with its reason.
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
]
DEFENCE = [
    ("C6a", "clean_build drops only the own outDir refusal: expected to survive, because the effective check refuses the same trees",
     BUILD, None, [(SCRIPT, *OWN_OUTDIR)]),
]
EQUIVALENT = [
    {"id": "E1", "mutation": "clean_build drops only the effective outDir and tsBuildInfoFile refusals",
     "fragment": {"file": SCRIPT, "old": "!underDist(effective.outDir) || !underDist(effective.tsBuildInfoFile) || ", "new": ""},
     "reason": "Equivalent while the own-options check stands: it requires the tsconfig's own outDir to be 'dist' and its own "
               "tsBuildInfoFile to be 'dist/.tsbuildinfo', and a tsconfig's own option overrides any inherited one, so the effective "
               "values are always <project>/dist and <project>/dist/.tsbuildinfo when this check runs. C6 and C6a show the effective "
               "outDir check refuses alone once the own check is gone. Not run and not scored."},
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


def run(ident, what, tests, expect, edits):
    originals, rows = {}, []
    try:
        for path, old, new in edits:
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
            open(path, "wb").write(original)
    matched = expect is None or any(expect in f["message"] for f in outcome["failing"])
    return {"id": ident, "mutation": what, "edits": rows, "tests": tests, "expectedMessage": expect, **outcome,
            "killed": outcome["exit"] != 0 and (outcome["failed"] or 0) > 0 and matched}


record = {"subject": "rule-6 mutants of syzygy-bpyt.65's guards and clean_build.mjs refusals", "commit": git("rev-parse", "HEAD").strip(),
          "worktreeClean": git("status", "--porcelain") == "",
          "tool": {"path": "docs/evidence/syzygy-bpyt-65/tools/mutants.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()},
          "loadavgBefore": open("/proc/loadavg").read().split()[:3],
          "unmutated": {"guard": vitest(GUARD), "build": vitest(BUILD)}, "mutants": [], "defence": [], "equivalent": EQUIVALENT}
for spec in MUTANTS:
    record["mutants"].append(run(*spec))
for spec in DEFENCE:
    record["defence"].append(run(*spec))
record["loadavgAfter"] = open("/proc/loadavg").read().split()[:3]
record["worktreeCleanAfter"] = git("status", "--porcelain") == ""
record["killed"] = sum(m["killed"] for m in record["mutants"])
record["of"] = len(record["mutants"])
print(json.dumps(record, indent=1, ensure_ascii=False))
