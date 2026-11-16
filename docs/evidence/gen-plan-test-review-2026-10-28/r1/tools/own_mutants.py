#!/usr/bin/env python3
"""Reviewer mutants against generation-mutation.test.ts after syzygy-vsqr
(R-GP-IMPL-GEN-PLAN-TEST-1, PR #546 round 1).

usage: python3 -I own_mutants.py <clone> <out.json> [id ...]

Each mutant edits one or more tracked files in the clone (the plan, a guarded
source, the runner or the test), and may create untracked files as byte copies
of a tracked one. It runs the one test file under vitest's JSON reporter,
writes every edited file back (sha256 checked), deletes every created file,
and records the run. An edit whose `old` is the empty string appends `new` to
the file. "killed" means the run failed (exit non-zero with a failed test or a
file error). Each mutant carries the reviewer's prediction, written before the
run; the record says whether the observation matched it.
"""
import hashlib
import json
import os
import subprocess
import sys

PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"
RUNNER = "apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts"
PIPELINE = "packages/polaris-generation-core/src/pipeline.ts"
DRAFT_MODEL = "packages/polaris-generation-core/src/draft-model.ts"
GUARD = "      if (calls >= budget.maxCalls) stop('budget-exhausted');"
REWRITTEN = "      if (budget.maxCalls <= calls) stop('budget-exhausted');"
OLD_TEXT = "if (calls >= budget.maxCalls) stop('budget-exhausted');"
MAX_CALLS_TO = "to: \"if (false) stop('budget-exhausted');\","
POLLUTION = "mustFail: ['rejects pollution keys'],"
DUP_FILE = "    file: DRAFT_MODEL_SOURCE,"


def point_dup_at(path):
    return {PLAN: [(DUP_FILE, f"    file: '{path}',")]}


# (id, aim, edits {file: [(old, new)]}, creates {new path: copy-of path}, prediction, why)
MUTANTS = [
    ("Q1", "R1: the fragment's only occurrence is inside a string literal (guard rewritten)",
     {PIPELINE: [(GUARD, REWRITTEN + ' void "' + OLD_TEXT + '";')]}, {},
     "survived", "a string literal survives removeComments, so the emit still changes"),
    ("Q2", "R1: the fragment's only occurrence is inside a template literal (guard rewritten)",
     {PIPELINE: [(GUARD, REWRITTEN + " void `" + OLD_TEXT + "`;")]}, {},
     "survived", "as Q1"),
    ("Q3", "R1: the fragment's only occurrence is inside a /*! comment (guard rewritten)",
     {PIPELINE: [(GUARD, REWRITTEN + " /*! was: " + OLD_TEXT + " */")]}, {},
     "unknown", "depends on whether removeComments keeps /*! comments in statement position"),
    ("Q3b", "R1: the fragment's only occurrence is inside a detached /*! comment at the head of the file (guard rewritten)",
     {PIPELINE: [("import { quotableGenerationSources,", "/*! was: " + OLD_TEXT + " */\n\nimport { quotableGenerationSources,"),
                 (GUARD, REWRITTEN)]}, {},
     "survived", "removeComments keeps a detached /*! comment at the head of a file (probed beforehand on a scratch input)"),
    ("Q4", "R1: the fragment's only occurrence is inside a JSDoc on an exported declaration (guard rewritten)",
     {PIPELINE: [(GUARD, REWRITTEN), ("", "\n/** was: " + OLD_TEXT + " */\nexport const WAS_GUARD = 1;\n")]}, {},
     "killed", "removeComments drops JSDoc"),
    ("Q5", "R5: a `to` that changes only a type assertion, which emit drops",
     {PLAN: [("to: 'const sorted = (keys as string[]);',", "to: 'const sorted = (keys as readonly string[]).sort();',")]}, {},
     "killed", "type syntax is erased, so the emit is unchanged"),
    ("Q6", "R5: a `to` that differs from `from` only by redundant parentheses",
     {PLAN: [(MAX_CALLS_TO, "to: \"if ((calls >= budget.maxCalls)) stop('budget-exhausted');\",")]}, {},
     "survived", "TypeScript's emitter keeps parenthesized expressions"),
    ("Q7", "R5: a `to` that differs from `from` only in quote style",
     {PLAN: [(MAX_CALLS_TO, "to: \"if (calls >= budget.maxCalls) stop(\\\"budget-exhausted\\\");\",")]}, {},
     "survived", "the emitter keeps a string literal's source spelling"),
    ("Q8", "R4: a must-fail name that matches a describe title only",
     {PLAN: [(POLLUTION, "mustFail: ['bounded provider JSON parsing'],")]}, {},
     "killed", "the reader reads it/test titles, not describe titles"),
    ("Q9", "R4: a must-fail name that is a strict substring of a longer title",
     {PLAN: [(POLLUTION, "mustFail: ['rejects pollution'],")]}, {},
     "survived", "the check matches by substring, as the runner does"),
    ("Q10", "R4: a must-fail name that is a title in a test file the runner does not run",
     {PLAN: [(POLLUTION, "mustFail: ['reaches no island module from the CLI entry'],")]}, {},
     "killed", "island-boundary.test.ts is not among the four files read"),
    ("Q11", "R4: a must-fail name that carries the each template's literal %s",
     {PLAN: [(POLLUTION, "mustFail: ['rejects pollution keys: %s'],")]}, {},
     "survived", "the template title contains %s; vitest's fullName never does"),
    ("Q12", "R4: a must-fail name that carries an each row's substituted value",
     {PLAN: [(POLLUTION, "mustFail: ['rejects pollution keys: __proto__'],")]}, {},
     "killed", "the template keeps %s, so the instantiated name is not a substring of it"),
    ("Q13", "R4: a must-fail name spanning the describe title and the test title (vitest's fullName form)",
     {PLAN: [(POLLUTION, "mustFail: ['bounded provider JSON parsing rejects pollution keys'],")]}, {},
     "killed", "the reader holds the it title alone"),
    ("Q14", "R4: an empty must-fail name",
     {PLAN: [(POLLUTION, "mustFail: [''],")]}, {},
     "survived", "every string includes the empty string"),
    ("Q15", "the runner check: a TEST_FILES entry commented out, its quoted path kept in the comment",
     {RUNNER: [("  'packages/polaris-generation-core/src/provider-draft.test.ts',\n] as const;",
                "  // 'packages/polaris-generation-core/src/provider-draft.test.ts',\n] as const;")]}, {},
     "survived", "the check is a textual toContain of the quoted path"),
    ("Q16", "R2: a path with .. that starts with the prefix and resolves to the plan module",
     point_dup_at("packages/polaris-generation-core/src/../../../apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"), {},
     "survived", "startsWith on the unnormalized path; join() resolves the .. on read; the plan holds the fragment once in a string"),
    ("Q17", "R2: a .spec.ts copy of draft-model.ts under the prefix",
     point_dup_at("packages/polaris-generation-core/src/draft-model.spec.ts"),
     {"packages/polaris-generation-core/src/draft-model.spec.ts": DRAFT_MODEL},
     "survived", "only .test.ts is excluded"),
    ("Q18", "R2: a .test.tsx copy of draft-model.ts under the prefix",
     point_dup_at("packages/polaris-generation-core/src/draft-model.test.tsx"),
     {"packages/polaris-generation-core/src/draft-model.test.tsx": DRAFT_MODEL},
     "survived", "only .test.ts is excluded"),
    ("Q19", "R2: a .d.ts copy of draft-model.ts under the prefix",
     point_dup_at("packages/polaris-generation-core/src/draft-model.d.ts"),
     {"packages/polaris-generation-core/src/draft-model.d.ts": DRAFT_MODEL},
     "unknown", "R2 admits it; the emit check may refuse it if a .d.ts emits nothing"),
    ("Q20", "N2: three drifts at once (R4's name, T3's twice-occurring fragment, R2's wrong file)",
     {PLAN: [(POLLUTION, "mustFail: ['rejects pollution keyz'],"),
             ("from: \"if (Array.isArray(record.sourceIds) && record.sourceIds.some(id => !sources.has(id))) throw new Error('unknown-source');\",",
              "from: \"throw new Error('unknown-source');\","),
             (DUP_FILE, "    file: 'apps/three-surface-poc/src/polaris-generation/generation-mutation.ts',")]}, {},
     "killed", "three rows fail, each naming its id"),
    ("Q21", "robustness: the TypeScript import cannot be resolved",
     {TEST: [("import ts from 'typescript';", "import ts from 'typescript-missing';")]}, {},
     "killed", "the file fails to load; vitest reports a failed file and exits non-zero"),
    ("Q22", "check-side: removeComments dropped, with R1's source edit",
     {TEST: [("compilerOptions: { removeComments: true, target:", "compilerOptions: { target:")],
      PIPELINE: [(GUARD, REWRITTEN + " // was: " + OLD_TEXT)]}, {},
     "survived", "without removeComments the comment edit changes the emit; shows the option is load-bearing"),
    ("Q23", "check-side: substring title match replaced by equality",
     {TEST: [("titles.some((title) => title.includes(name))", "titles.some((title) => title === name)")]}, {},
     "killed", "the two parse-json names are prefixes of each templates, so substring matching is load-bearing"),
]


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_test(clone, scratch, label):
    out = os.path.join(scratch, label + ".json")
    proc = subprocess.run(["npx", "vitest", "run", TEST, "--reporter=json", "--outputFile=" + out],
                          cwd=clone, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, "CI": "1"})
    with open(out, encoding="utf-8") as handle:
        report = json.load(handle)
    tests = [t for f in report["testResults"] for t in f["assertionResults"]]
    file_errors = [f.get("message", "") for f in report["testResults"] if f.get("status") == "failed" and not f["assertionResults"]]
    return {"exit": proc.returncode, "total": report["numTotalTests"], "failed": report["numFailedTests"],
            "failedTitles": [t["title"] for t in tests if t["status"] == "failed"],
            "failureMessages": [m.splitlines()[0] for t in tests for m in t.get("failureMessages", [])],
            "fileErrors": [e.splitlines()[0] if e else "" for e in file_errors]}


def git(clone, *args):
    return subprocess.run(["git", "-C", clone, *args], capture_output=True, text=True, check=True).stdout


def main(clone, out_path, only):
    clone = os.path.abspath(clone)
    scratch = os.environ["TMPDIR"]
    if git(clone, "status", "--porcelain").strip():
        sys.exit("the clone is not clean")
    commit = git(clone, "rev-parse", "HEAD").strip()
    control = run_test(clone, scratch, "own-control")
    results = []
    for mutant_id, aim, edits, creates, prediction, why in MUTANTS:
        if only and mutant_id not in only:
            continue
        originals = {f: open(os.path.join(clone, f), "rb").read() for f in edits}
        try:
            for new_path, copy_of in creates.items():
                target = os.path.join(clone, new_path)
                if os.path.exists(target):
                    sys.exit(f"{mutant_id}: {new_path} already exists")
                open(target, "wb").write(open(os.path.join(clone, copy_of), "rb").read())
            for f, pairs in edits.items():
                text = originals[f].decode("utf-8")
                for old, new in pairs:
                    if old == "":
                        text = text + new
                        continue
                    if text.count(old) != 1:
                        sys.exit(f"{mutant_id}: {f}: the fragment occurs {text.count(old)} times")
                    text = text.replace(old, new)
                open(os.path.join(clone, f), "wb").write(text.encode("utf-8"))
            run = run_test(clone, scratch, f"own-{mutant_id}")
        finally:
            for f, data in originals.items():
                open(os.path.join(clone, f), "wb").write(data)
            for new_path in creates:
                target = os.path.join(clone, new_path)
                if os.path.exists(target):
                    os.remove(target)
        restored = all(sha256(open(os.path.join(clone, f), "rb").read()) == sha256(d) for f, d in originals.items()) \
            and not any(os.path.exists(os.path.join(clone, p)) for p in creates)
        killed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
        outcome = "killed" if killed else "survived"
        results.append({"id": mutant_id, "aim": aim,
                        "edits": {f: [{"old": o, "new": n} for o, n in p] for f, p in edits.items()},
                        "creates": creates, "prediction": prediction, "why": why,
                        "observed": run, "outcome": outcome,
                        "matchesPrediction": prediction == "unknown" or prediction == outcome, "restored": restored})
        print(f"{mutant_id} {outcome} predicted={prediction} restored={restored} "
              f"{run['failed']}/{run['total']} {(run['failureMessages'] + run['fileErrors'])[:3]}", flush=True)
    clean = not git(clone, "status", "--porcelain").strip()
    record = {"subject": "generation-mutation.test.ts at the reviewed commit, reviewer mutants (R-GP-IMPL-GEN-PLAN-TEST-1)",
              "commit": commit,
              "tool": {"path": "rev-546/tools/own_mutants.py", "sha256": sha256(open(__file__, "rb").read())},
              "control": control, "controlPassed": control["exit"] == 0 and control["failed"] == 0 and control["total"] > 0,
              "mutants": results, "treeCleanAfter": clean,
              "summary": {"mutants": len(results), "killed": sum(r["outcome"] == "killed" for r in results),
                          "survived": sum(r["outcome"] == "survived" for r in results),
                          "matchesPrediction": sum(r["matchesPrediction"] for r in results),
                          "restored": sum(r["restored"] for r in results)}}
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(f"control {'passed' if record['controlPassed'] else 'FAILED'}; {record['summary']}; tree clean {clean}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1], sys.argv[2], set(sys.argv[3:])))
