"""rev-558: the reviewer's own rule-6 mutants over syzygy-bpyt.65, run from the root of a clean checkout at 807024b8.

Usage: python3 -I mutants2.py > out.json. Each mutant replaces exact fragments (each must occur once), runs the named vitest
files with the JSON reporter, restores every byte, and records exit, counts and the failing tests' first message lines."""
import hashlib, json, os, subprocess, tempfile

GUARD = ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]
BUILD = ["apps/three-surface-poc/src/product-build.test.ts"]
S = "scripts/clean_build.mjs"
B = BUILD[0]
G = GUARD[0]
RM = "for (const project of built) rmSync(join(project, 'dist'), { recursive: true, force: true });\n"
COMPOSITE = "for (const project of referenced) if (!composite.get(project)) throw new Error(`${join(project, 'tsconfig.json')}: a referenced project is not composite`);\n"
PLUG = "  if (PLUGINS_KEY.test(config)) throw new Error(`${VITEST_CONFIG}: a plugin may load a workspace package by other than its source condition`);\n"
COUNT_END = "    throw new Error(`${VITEST_CONFIG}: ${projects} projects but ${includes.length} recognized single-glob includes`);\n  }\n"
MUTANTS = [
    ("O1", "the non-composite reference check moves after the removal", BUILD, [(S, COMPOSITE + "\n" + RM, RM + COMPOSITE)]),
    ("O2", "the effective outputs check is deferred until after the removal", BUILD, [
        (S, "const visiting = [];\n", "const visiting = [];\nconst late = [];\n"),
        (S, "    throw new Error(`${path}: its outputs and incremental state are not both under dist`);\n  }\n  composite.set",
            "    late.push(path);\n  }\n  composite.set"),
        (S, RM, RM + "if (late.length) throw new Error(`${late[0]}: its outputs and incremental state are not both under dist`);\n")]),
    ("MF1", "the emitted-set model keeps only the files the tsconfig names", BUILD,
     [(B, ".filter((file) => file.startsWith(`${base}${project}/src/`)", ".filter((file) => parsed.fileNames.includes(file) && file.startsWith(`${base}${project}/src/`)")]),
    ("MF2", "the emitted-set model keeps declaration files", BUILD, [(B, " && !file.endsWith('.d.ts')).map(", ").map(")]),
    ("MF3", "the emitted-set model widens from <project>/src/ to <project>/", BUILD,
     [(B, ".filter((file) => file.startsWith(`${base}${project}/src/`)", ".filter((file) => file.startsWith(`${base}${project}/`)")]),
    ("PK1", "PLUGINS_KEY no longer takes a quoted key", GUARD, [(G, "const PLUGINS_KEY = /\\bplugins\\b['\"]?\\s*:/;", "const PLUGINS_KEY = /\\bplugins\\s*:/;")]),
    ("PK2", "the plugins check moves after the project-count check", GUARD, [(G, PLUG, ""), (G, COUNT_END, COUNT_END + PLUG)]),
    ("C9", "underDist drops the exact-dist arm", BUILD, [(S, "(file === dist || file.startsWith(`${dist}/`))", "file.startsWith(`${dist}/`)")]),
    ("C10", "underDist drops the separator (dist-x passes)", BUILD, [(S, "file.startsWith(`${dist}/`)", "file.startsWith(dist)")]),
    ("E1", "the lane's E1: drop the effective outDir and tsBuildInfoFile refusals", BUILD,
     [(S, "!underDist(effective.outDir) || !underDist(effective.tsBuildInfoFile) || ", "")]),
    ("R7h", "the unrecoverable-diagnostic handler no longer throws", BUILD,
     [(S, "onUnRecoverableConfigFileDiagnostic: () => { throw new Error(`${path}: TypeScript cannot read it`); }", "onUnRecoverableConfigFileDiagnostic: () => {}")]),
]


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    failing = [{"test": r["fullName"], "message": ((r.get("failureMessages") or [""])[0].split("\n") or [""])[0][:300]}
               for f in counts.get("testResults", []) for r in f.get("assertionResults", []) if r.get("status") == "failed"]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"), "failing": failing}


def git(*a):
    return subprocess.run(["git", *a], capture_output=True, text=True).stdout


rows = []
clean = git("status", "--porcelain") == ""
for ident, what, tests, edits in MUTANTS:
    originals, applied = {}, []
    try:
        for path, old, new in edits:
            originals.setdefault(path, open(path, "rb").read())
            text = open(path, encoding="utf8").read()
            if text.count(old) != 1:
                raise SystemExit(f"{ident}: fragment occurs {text.count(old)} times in {path}")
            open(path, "w", encoding="utf8").write(text.replace(old, new))
            applied.append({"file": path, "old": old, "new": new, "fileSha256": hashlib.sha256(originals[path]).hexdigest()})
        load = open("/proc/loadavg").read().split()[:3]
        out = vitest(tests)
    finally:
        for path, original in originals.items():
            open(path, "wb").write(original)
    rows.append({"id": ident, "mutation": what, "edits": applied, "tests": tests, "loadavg": load, **out,
                 "killed": out["exit"] != 0 and (out["failed"] or 0) > 0})
    print(ident, rows[-1]["killed"], out["failed"], file=__import__("sys").stderr, flush=True)
print(json.dumps({"tool": {"sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest()}, "commit": git("rev-parse", "HEAD").strip(),
                  "cleanBefore": clean, "cleanAfter": git("status", "--porcelain") == "", "rows": rows}, indent=1))
