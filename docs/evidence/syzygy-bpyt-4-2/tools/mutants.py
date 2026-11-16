"""syzygy-bpyt.4.2, rule 6: each new or changed check fails when the input it guards is mutated.

Run from the root of a Syzygy checkout at a clean commit, with its product built (`npm run build`, so a check that would only
fail for want of a dist is not credited): `python3 <this file> > record.json`. For each mutant it replaces one exact fragment
of one file (the fragment must occur exactly once), runs the named test files, and restores the file's bytes, whatever happens.
The record keeps every fragment, the commit, the unmutated run of the same files, and each run's failed and passed counts and
the full name of each failing test."""
import hashlib, json, os, subprocess, tempfile

MUTANTS = [
    ("M1", "the resolver reads a source condition as a target that must agree with the others",
     "packages/polaris-generation-core/src/workspace-reach.testkit.ts",
     "filter(([condition]) => condition !== 'types' && condition !== 'source')", "filter(([condition]) => condition !== 'types')",
     ["packages/polaris-generation-core/src/workspace-reach.test.ts"]),
    ("M2", "the resolver accepts a source condition naming any module",
     "packages/polaris-generation-core/src/workspace-reach.testkit.ts",
     "return source === first.replace(/^\\.\\/dist\\//u, './src/').replace(/\\.js$/u, '.ts') ? first : undefined;", "return first;",
     ["packages/polaris-generation-core/src/workspace-reach.test.ts"]),
    ("M3", "an export's source condition names another module",
     "packages/support/package.json", '"source": "./src/index.ts",', '"source": "./src/sha256.ts",',
     ["packages/polaris-generation-core/src/workspace-reach.test.ts"]),
    ("M4", "an export lists its source condition after types",
     "packages/http-host/package.json", '"source": "./src/index.ts",\n      "types": "./dist/index.d.ts",',
     '"types": "./dist/index.d.ts",\n      "source": "./src/index.ts",',
     ["packages/http-host/src/package.test.ts", "packages/polaris-generation-core/src/workspace-reach.test.ts"]),
    ("M5", "a project's build includes its tests", "packages/support/tsconfig.json", ',\n  "exclude": ["src/**/*.test.ts"]', "",
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M6", "a built module imports a test", "packages/support/src/index.ts", "export { sha256 } from './sha256.js';\n",
     "export { sha256 } from './sha256.js';\nexport type {} from './support-purity.test.js';\n",
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M7", "the build leaves a project out", "package.json", " packages/polaris-generation-consent packages/polaris-dossier\"",
     " packages/polaris-generation-consent\"", ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M8", "the clean build removes nothing", "scripts/clean_build.mjs",
     "for (const project of built) rmSync(join(project, 'dist'), { recursive: true, force: true });", "",
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M9", "the clean build removes only the named projects' dist, not their references'", "scripts/clean_build.mjs",
     "  for (const reference of config.references ?? []) visit(posix.normalize(posix.join(project, reference.path)));\n", "",
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M10", "the clean build accepts a project whose outputs leave dist", "scripts/clean_build.mjs",
     "config.compilerOptions?.outDir !== 'dist' || ", "",
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M11", "build:poc forces an incremental build again", "package.json",
     '"build:poc": "node scripts/clean_build.mjs packages/support', '"build:poc": "tsc -b --force packages/support',
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M12", "a tool runs a built module without building", "package.json",
     '"poc:keyboard-sweep": "npm run build:poc --silent && node', '"poc:keyboard-sweep": "node',
     ["apps/three-surface-poc/src/product-build.test.ts"]),
    ("M13", "the suite scan accepts a config that does not resolve the source condition first",
     "apps/three-surface-poc/src/sync-child-process-guard.test.ts",
     "if (!SOURCE_CONDITION.test(config) || ALIAS_KEY.test(config))", "if (ALIAS_KEY.test(config))",
     ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]),
    ("M14", "the suite scan accepts a config with an alias", "apps/three-surface-poc/src/sync-child-process-guard.test.ts",
     "if (!SOURCE_CONDITION.test(config) || ALIAS_KEY.test(config))", "if (!SOURCE_CONDITION.test(config))",
     ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]),
    ("M15", "the suite resolves workspace packages by their built entries", "vitest.config.ts",
     "conditions: ['source', 'module', 'node', 'development|production']", "conditions: ['module', 'node', 'development|production']",
     ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]),
    ("M16", "the suite scan follows relative imports only", "apps/three-surface-poc/src/sync-child-process-guard.test.ts",
     "const target = resolveIn(workspace, path, match[1]!);",
     "const target = match[1]!.startsWith('.') ? resolveIn(workspace, path, match[1]!) : undefined;",
     ["apps/three-surface-poc/src/sync-child-process-guard.test.ts"]),
    ("M17", "the typecheck resolves workspace packages by their built declarations", "tsconfig.json",
     ',\n    "customConditions": ["source"]', "", ["apps/three-surface-poc/src/product-build.test.ts"]),
]


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, "report.json")
        done = subprocess.run(["npx", "vitest", "run", *files, "--reporter=json", f"--outputFile={report}"], capture_output=True, text=True)
        counts = json.load(open(report)) if os.path.exists(report) else {}
    failing = [result["fullName"] for file in counts.get("testResults", []) for result in file.get("assertionResults", []) if result.get("status") == "failed"]
    return {"exit": done.returncode, "failed": counts.get("numFailedTests"), "passed": counts.get("numPassedTests"),
            "failedSuites": counts.get("numFailedTestSuites"), "total": counts.get("numTotalTests"), "failing": failing}


record = {
    "subject": "rule-6 mutants of the checks syzygy-bpyt.4.2 adds or changes",
    "commit": subprocess.run(["git", "rev-parse", "HEAD"], capture_output=True, text=True).stdout.strip(),
    "worktreeClean": subprocess.run(["git", "status", "--porcelain"], capture_output=True, text=True).stdout == "",
    "unmutated": vitest(sorted({file for *_, files in MUTANTS for file in files})),
    "mutants": [],
}
for ident, what, path, old, new, files in MUTANTS:
    original = open(path, "rb").read()
    text = original.decode()
    if text.count(old) != 1:
        raise SystemExit(f"{ident}: the fragment occurs {text.count(old)} times in {path}")
    try:
        open(path, "w").write(text.replace(old, new))
        outcome = vitest(files)
    finally:
        open(path, "wb").write(original)
    record["mutants"].append({"id": ident, "mutation": what, "file": path, "fileSha256": hashlib.sha256(original).hexdigest(),
                              "old": old, "new": new, "tests": files, **outcome,
                              "killed": outcome["exit"] != 0 and (outcome["failed"] or 0) + (outcome["failedSuites"] or 0) > 0})
record["killed"] = sum(mutant["killed"] for mutant in record["mutants"])
record["of"] = len(record["mutants"])
print(json.dumps(record, indent=1))
