"""Rule-6 mutants for generation-mutation.test.ts after syzygy-bpyt.47 (PR #546
round-1 notes N1, N2, N3 and N5).

Each mutant edits one or more files (the plan, a guarded source, a runner test
file, the runner or the test itself), may create untracked files as byte
copies of a tracked one, runs the one test file under vitest's JSON reporter,
writes every edited file back (sha256 checked) and deletes every created
file. A mutant counts as killed only when the run fails, the expected number
of tests fail (when one is given) and every expected failure-message substring
is among the messages; a mutant expected to survive must pass. Each
expectation was written before the first run that scored it in its present
form. The mutants are:

- R1-R8, T1-T7, V1-V4: docs/evidence/syzygy-vsqr/test_mutants.py's rows, edits
  byte for byte (imported from that file), with the messages the new checks
  print: R2 and V3 the path check (N2), R4 and V4 the title count (N1), T6 the
  duplicate-id filter and T7 the id list (N5), V2 the parsed TEST_FILES (N3);
- Q8-Q22: the PR #546 round-1 reviewer's mutants
  (docs/evidence/gen-plan-test-review-2026-10-28/r1/tools/own_mutants.py),
  edits and created files byte for byte (imported from that file). Q11, Q14,
  Q15, Q16, Q17, Q18 and Q19 survived the reviewed test; each is now killed by
  a named assertion. Q9 (a distinctive strict substring of one title) and Q22
  (a check-side mutant showing removeComments is load-bearing) still survive,
  as the reviewer expected;
- Q23a: the reviewer's Q23 (substring title match replaced by equality),
  adapted to the new count expression, since its fragment no longer occurs;
- W1-W7: one per new arm the rows above do not isolate. W1 (`$`) and W2
  (blank) plant a runner-test title that holds the name exactly once, so only
  the literal-fragment arm can refuse it; W3 names a fragment many titles
  hold; W4 spells the right file through `./`, so only the normalize arm can
  refuse it; W5 points at a `.testkit.ts` copy that holds the fragment; W6
  adds a second TEST_FILES declaration and W7 a spread element naming a fifth
  file, which the parsed list reports by its source text;
- K1-K5: W1-W5's inputs again, each with only the arm it isolates taken out
  of the test. Each must survive, which shows that arm alone refuses it.

    python3 -I docs/evidence/syzygy-bpyt-47/test_mutants.py OUT.json

Run it from the root of a clean, committed checkout with node_modules (the
tool's own path may lie outside that checkout). It exits 0 only when the
control passes, every mutant runs as expected, every edited file is restored
and every created file is gone.
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
EVIDENCE = os.path.dirname(HERE)
VSQR_TOOL = os.path.join(EVIDENCE, "syzygy-vsqr", "test_mutants.py")
REVIEWER_TOOL = os.path.join(EVIDENCE, "gen-plan-test-review-2026-10-28", "r1", "tools", "own_mutants.py")

PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
TEST = "apps/three-surface-poc/src/polaris-generation/generation-mutation.test.ts"
RUNNER = "apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts"
PARSE_JSON_TEST = "packages/polaris-generation-core/src/parse-json.test.ts"
DRAFT_MODEL = "packages/polaris-generation-core/src/draft-model.ts"
POLLUTION = "mustFail: ['rejects pollution keys'],"
POLLUTION_TITLE = "('rejects pollution keys: %s', (key) => {"
DUP_FILE = "    file: DRAFT_MODEL_SOURCE,"
PROVIDER_ENTRY = "  'packages/polaris-generation-core/src/provider-draft.test.ts',\n] as const;"
PATH_CHECK = "is a normalized non-test .ts file under packages/polaris-generation-core/src/"


def load(path, name):
    spec = importlib.util.spec_from_file_location(name, path)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


# (expect, expected failed-test count or None, [message substrings]) for each carried row.
VSQR_EXPECT = {
    "R1": ("killed", 1, ["pipeline-max-calls-disabled: the mutation changes the emitted JavaScript"]),
    "R2": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: apps/three-surface-poc/src/polaris-generation/generation-mutation.ts " + PATH_CHECK]),
    "R3": ("survived", None, []),
    "R4": ("killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects pollution keyz": expected +0 to be 1']),
    "R5": ("killed", 1, ["pipeline-max-calls-disabled: the mutation changes the emitted JavaScript"]),
    "R6": ("killed", 1, ["ENOENT"]),
    "R7": ("killed", 1, ["canonical-json-sorted-keys-disabled: occurrences of the fragment in packages/polaris-generation-core/src/canonical-json.ts"]),
    "R8": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/draft-model.ts: expected 4 to be 1"]),
    "T1": ("killed", 1, ["pipeline-repair-cycle-cap-disabled: occurrences of the fragment in packages/polaris-generation-core/src/pipeline.ts: expected +0 to be 1"]),
    "T2": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected +0 to be 1"]),
    "T3": ("killed", 1, ["provider-draft-unknown-source-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected 2 to be 1"]),
    "T4": ("killed", 1, ["canonical-json-sorted-keys-disabled: the mutation changes the emitted JavaScript"]),
    "T5": ("killed", 1, ["provider-draft-unknown-finding-target-check-disabled: must-fail names: expected 0 to be greater than 0"]),
    "T6": ("killed", 1, ["duplicate mutation ids: expected 'canonical-json-sorted-keys-disabled' to be ''"]),
    "T7": ("killed", 1, ["AssertionError: canonical-json-cycle-check-disabled, canonical-json-proxy-check-disabled, ", ": expected 11 to be 12"]),
    "V1": ("killed", 2, ["pipeline-repair-cycle-cap-disabled: occurrences of the fragment",
                         "provider-draft-duplicate-handle-check-disabled: occurrences of the fragment"]),
    "V2": ("killed", 1, ["the runner's TEST_FILES declarations: expected [ [ "]),
    "V3": ("killed", 1, ["canonical-json-sorted-keys-disabled: packages/polaris-generation-core/src/canonical-json.test.ts " + PATH_CHECK]),
    "V4": ("killed", 2, ['parse-json-duplicate-key-check-disabled: test titles holding must-fail "rejects duplicate decoded keys": expected +0 to be 1',
                         'parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects pollution keys": expected +0 to be 1']),
}

REVIEWER_EXPECT = {
    "Q8": ("killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "bounded provider JSON parsing": expected +0 to be 1']),
    "Q9": ("survived", None, []),
    "Q10": ("killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "reaches no island module from the CLI entry": expected +0 to be 1']),
    "Q11": ("killed", 1, ['parse-json-pollution-key-check-disabled: must-fail "rejects pollution keys: %s" is a literal title fragment: expected false to be true']),
    "Q12": ("killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects pollution keys: __proto__": expected +0 to be 1']),
    "Q13": ("killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "bounded provider JSON parsing rejects pollution keys": expected +0 to be 1']),
    "Q14": ("killed", 1, ['parse-json-pollution-key-check-disabled: must-fail "" is a literal title fragment: expected false to be true']),
    "Q15": ("killed", 1, ["the runner's TEST_FILES declarations: expected [ [ "]),
    "Q16": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/../../../apps/three-surface-poc/src/polaris-generation/generation-mutation.ts " + PATH_CHECK]),
    "Q17": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/draft-model.spec.ts " + PATH_CHECK]),
    "Q18": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/draft-model.test.tsx " + PATH_CHECK]),
    "Q19": ("killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/draft-model.d.ts " + PATH_CHECK]),
    "Q20": ("killed", 3, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects pollution keyz": expected +0 to be 1',
                          "provider-draft-unknown-source-check-disabled: occurrences of the fragment in packages/polaris-generation-core/src/provider-draft.ts: expected 2 to be 1",
                          "provider-draft-duplicate-handle-check-disabled: apps/three-surface-poc/src/polaris-generation/generation-mutation.ts " + PATH_CHECK]),
    "Q21": ("killed", None, ["typescript-missing"]),
    "Q22": ("survived", None, []),
}

# (id, aim, edits {file: [(old, new)]}, creates {new path: copy-of path}, expect, count, messages)
OWN = [
    ("Q23a", "check-side: the reviewer's Q23 adapted, the substring title count replaced by equality",
     {TEST: [("titles.filter((title) => title.includes(name)).length", "titles.filter((title) => title === name).length")]}, {},
     "killed", 2, ['parse-json-duplicate-key-check-disabled: test titles holding must-fail "rejects duplicate decoded keys": expected +0 to be 1',
                   'parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects pollution keys": expected +0 to be 1']),
    ("W1", "N1, the `$` arm alone: a name with `$` that exactly one runner-test title holds",
     {PARSE_JSON_TEST: [(POLLUTION_TITLE, "('rejects pollution keys$: %s', (key) => {")],
      PLAN: [(POLLUTION, "mustFail: ['rejects pollution keys$'],")]}, {},
     "killed", 1, ['parse-json-pollution-key-check-disabled: must-fail "rejects pollution keys$" is a literal title fragment: expected false to be true']),
    ("W2", "N1, the blank arm alone: a whitespace-only name that exactly one runner-test title holds",
     {PARSE_JSON_TEST: [(POLLUTION_TITLE, "('rejects pollution keys:   %s', (key) => {")],
      PLAN: [(POLLUTION, "mustFail: ['   '],")]}, {},
     "killed", 1, ['parse-json-pollution-key-check-disabled: must-fail "   " is a literal title fragment: expected false to be true']),
    ("W3", "N1, the exactly-one arm: a literal fragment many titles hold",
     {PLAN: [(POLLUTION, "mustFail: ['rejects'],")]}, {},
     "killed", 1, ['parse-json-pollution-key-check-disabled: test titles holding must-fail "rejects": expected']),
    ("W4", "N2, the normalize arm alone: the right file spelled through ./",
     {PLAN: [(DUP_FILE, "    file: 'packages/polaris-generation-core/src/./draft-model.ts',")]}, {},
     "killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/./draft-model.ts " + PATH_CHECK]),
    ("W5", "N2, the testkit arm: a .testkit.ts copy of draft-model.ts under the prefix",
     {PLAN: [(DUP_FILE, "    file: 'packages/polaris-generation-core/src/draft-model.testkit.ts',")]},
     {"packages/polaris-generation-core/src/draft-model.testkit.ts": DRAFT_MODEL},
     "killed", 1, ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src/draft-model.testkit.ts " + PATH_CHECK]),
    ("W6", "N3: a second TEST_FILES declaration in the runner",
     {RUNNER: [("", "\nexport function shadowed(): readonly string[] {\n  const TEST_FILES = ['packages/polaris-generation-core/src/canonical-json.test.ts'];\n  return TEST_FILES;\n}\n")]}, {},
     "killed", 1, ["the runner's TEST_FILES declarations: expected [ [ "]),
    ("W7", "N3: a spread element in TEST_FILES naming a fifth file",
     {RUNNER: [(PROVIDER_ENTRY, "  'packages/polaris-generation-core/src/provider-draft.test.ts',\n  ...['packages/polaris-generation-core/src/island-boundary.test.ts'],\n] as const;")]}, {},
     "killed", 1, ["the runner's TEST_FILES declarations: expected [ [ "]),
]

# K1-K5: each W row's input with only the arm it isolates taken out of the test; each must survive, so that
# arm, and no other check, is what refuses the input.
LITERAL_CHECK = "expect(name.trim() !== '' && !/%|\\$/.test(name), "
COUNT_CHECK = "expect(titles.filter((title) => title.includes(name)).length, `${id}: test titles holding must-fail \"${name}\"`).toBe(1);"
PATH_PREDICATE = "posix.normalize(file) === file && file.startsWith(SUBJECT_ROOT) && file.endsWith('.ts') && !/\\.(test|spec|testkit|d)\\.ts$/.test(file)"


def without(row_id, test_old, test_new, aim):
    _, _, edits, creates, _, _, _ = next(row for row in OWN if row[0] == row_id)
    return (f"K{row_id[1:]}", f"isolation: {row_id}'s input with {aim} taken out of the test",
            {**edits, TEST: [(test_old, test_new)]}, creates, "survived", None, [])


ISOLATION = [
    without("W1", LITERAL_CHECK, "expect(name.trim() !== '' && !/%/.test(name), ", "the `$` arm"),
    without("W2", LITERAL_CHECK, "expect(!/%|\\$/.test(name), ", "the blank arm"),
    without("W3", COUNT_CHECK, COUNT_CHECK.replace(".length, `", ".length > 0, `").replace(".toBe(1);", ".toBe(true);"), "the exactly-one count (any title suffices)"),
    without("W4", PATH_PREDICATE, PATH_PREDICATE.replace("posix.normalize(file) === file && ", ""), "the normalize arm"),
    without("W5", PATH_PREDICATE, PATH_PREDICATE.replace("test|spec|testkit|d", "test|spec|d"), "the testkit arm"),
]


def mutants():
    vsqr = load(VSQR_TOOL, "vsqr_test_mutants")
    reviewer = load(REVIEWER_TOOL, "reviewer_own_mutants")
    rows = []
    for mutant_id, predicate, edits, _expect, _count, _messages in vsqr.MUTANTS:
        expect, count, messages = VSQR_EXPECT[mutant_id]
        rows.append((mutant_id, "syzygy-vsqr: " + predicate, edits, {}, expect, count, messages))
    for mutant_id, aim, edits, creates, _prediction, _why in reviewer.MUTANTS:
        if mutant_id in REVIEWER_EXPECT:
            expect, count, messages = REVIEWER_EXPECT[mutant_id]
            rows.append((mutant_id, "reviewer: " + aim, edits, creates, expect, count, messages))
    if [r[0] for r in rows] != list(VSQR_EXPECT) + list(REVIEWER_EXPECT):
        sys.exit("an imported row is missing or out of order")
    return rows + OWN + ISOLATION


def sha256(data):
    return hashlib.sha256(data).hexdigest()


def run_test(scratch, label):
    out = os.path.join(scratch, label + ".json")
    proc = subprocess.run(["npx", "vitest", "run", TEST, "--reporter=json", "--outputFile=" + out],
                          stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, env={**os.environ, "CI": "1"})
    with open(out, encoding="utf-8") as handle:
        report = json.load(handle)
    tests = [t for f in report["testResults"] for t in f["assertionResults"]]
    file_errors = [f.get("message", "") for f in report["testResults"] if f.get("status") == "failed" and not f["assertionResults"]]
    return {"exit": proc.returncode, "total": report["numTotalTests"], "failed": report["numFailedTests"],
            "failureMessages": [m.splitlines()[0] for t in tests for m in t.get("failureMessages", [])],
            "fileErrors": [e.splitlines()[0] if e else "" for e in file_errors]}


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout


def main(out_path):
    rows = mutants()
    commit = git("rev-parse", "HEAD").strip()
    if git("status", "--porcelain").strip():
        sys.exit("the checkout is not clean")
    touched = sorted({f for _, _, edits, _, _, _, _ in rows for f in edits})
    digests = {f: sha256(open(f, "rb").read()) for f in touched}
    results = []
    with tempfile.TemporaryDirectory(prefix="b47-test-mutants-") as scratch:
        control = run_test(scratch, "control")
        for mutant_id, predicate, edits, creates, expect, count, messages in rows:
            originals = {f: open(f, "rb").read() for f in edits}
            try:
                for new_path, copy_of in creates.items():
                    if os.path.exists(new_path):
                        sys.exit(f"{mutant_id}: {new_path} already exists")
                    open(new_path, "wb").write(open(copy_of, "rb").read())
                for f, pairs in edits.items():
                    text = originals[f].decode("utf-8")
                    for old, new in pairs:
                        if old == "":
                            text = text + new
                            continue
                        if text.count(old) != 1:
                            sys.exit(f"{mutant_id}: {f}: the fragment occurs {text.count(old)} times")
                        text = text.replace(old, new)
                    open(f, "wb").write(text.encode("utf-8"))
                run = run_test(scratch, mutant_id)
            finally:
                for f, data in originals.items():
                    open(f, "wb").write(data)
                for new_path in creates:
                    if os.path.exists(new_path):
                        os.remove(new_path)
            restored = all(sha256(open(f, "rb").read()) == digests[f] for f in edits) and not any(os.path.exists(p) for p in creates)
            failed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
            said = all(any(m in line for line in run["failureMessages"] + run["fileErrors"]) for m in messages)
            outcome = "killed" if failed else "survived"
            as_expected = outcome == expect and (expect == "survived" or (said and (count is None or run["failed"] == count)))
            results.append({"id": mutant_id, "predicate": predicate,
                            "edits": {f: [{"old": o, "new": n} for o, n in pairs] for f, pairs in edits.items()},
                            "creates": creates, "expect": expect, "expectedFailedTests": count, "expectedMessages": messages,
                            "observed": run, "outcome": outcome, "asExpected": as_expected, "restored": restored})
            print(f"{mutant_id} {outcome} asExpected={as_expected} restored={restored} {(run['failureMessages'] + run['fileErrors'])[:1]}", flush=True)
    clean = not git("status", "--porcelain").strip()
    record = {"subject": "generation-mutation.test.ts after syzygy-bpyt.47, by mutating the plan, a guarded source, a runner test file, the runner and the test",
              "commit": commit,
              "tool": {"path": "docs/evidence/syzygy-bpyt-47/test_mutants.py", "sha256": sha256(open(__file__, "rb").read())},
              "importedRows": [{"path": "docs/evidence/syzygy-vsqr/test_mutants.py", "sha256": sha256(open(VSQR_TOOL, "rb").read())},
                               {"path": "docs/evidence/gen-plan-test-review-2026-10-28/r1/tools/own_mutants.py", "sha256": sha256(open(REVIEWER_TOOL, "rb").read())}],
              "files": [{"path": f, "sha256": digests[f]} for f in touched],
              "control": control, "controlPassed": control["exit"] == 0 and control["failed"] == 0 and control["total"] > 0,
              "mutants": results, "treeCleanAfter": clean,
              "summary": {"mutants": len(results), "asExpected": sum(r["asExpected"] for r in results),
                          "killed": sum(r["outcome"] == "killed" for r in results),
                          "survived": [r["id"] for r in results if r["outcome"] == "survived"],
                          "restored": sum(r["restored"] for r in results)}}
    with open(out_path, "w", encoding="utf-8") as handle:
        handle.write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    ok = record["controlPassed"] and clean and record["summary"]["asExpected"] == len(rows) == record["summary"]["restored"]
    print(f"control {'passed' if record['controlPassed'] else 'FAILED'}; {record['summary']}; tree clean {clean}")
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(sys.argv[1]))
