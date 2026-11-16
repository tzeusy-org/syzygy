"""R-GP-IMPL-GEN-PLAN-TEST-2 reviewer's own mutants against the checks syzygy-bpyt.47 adds.

Rows come in pairs: an input row (plan, runner or runner-test edit) run against
the reviewed test, and the same input with one new check weakened in the test.
The prediction for each row is written before the run. Runs reuse the PR tool's
run_test (imported by path) so the JSON reading is the same.

    python3 -I own_mutants.py <checkout> <pr-tool> OUT.json [ID,ID,...]
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys
import tempfile

CHECKOUT, PR_TOOL, OUT = sys.argv[1:4]
ONLY = set(sys.argv[4].split(",")) if len(sys.argv) > 4 else None
os.chdir(CHECKOUT)
spec = importlib.util.spec_from_file_location("pr_tool", PR_TOOL)
pr = importlib.util.module_from_spec(spec)
spec.loader.exec_module(pr)

PLAN, TEST, RUNNER = pr.PLAN, pr.TEST, pr.RUNNER
PJT = pr.PARSE_JSON_TEST
PATH_PRED = pr.PATH_PREDICATE
COUNT_EXPR = "titles.filter((title) => title.includes(name)).length"
LIT = "!/%|\\$/.test(name)"
DUP = "ids.filter((id, index) => ids.indexOf(id) !== index).join(', ')"
READER_ELEM = "init.elements.map((element) => (ts.isStringLiteralLike(element) ? element.text : element.getText()))"
T6 = ("id: 'canonical-json-cycle-check-disabled',", "id: 'canonical-json-sorted-keys-disabled',")
W6 = ("", "\nexport function shadowed(): readonly string[] {\n  const TEST_FILES = ['packages/polaris-generation-core/src/canonical-json.test.ts'];\n  return TEST_FILES;\n}\n")
W7 = (pr.PROVIDER_ENTRY, "  'packages/polaris-generation-core/src/provider-draft.test.ts',\n  ...['packages/polaris-generation-core/src/island-boundary.test.ts'],\n] as const;")
DSLASH = (pr.DUP_FILE, "    file: 'packages/polaris-generation-core/src//draft-model.ts',")
CASE = (pr.POLLUTION, "mustFail: ['Rejects Pollution Keys'],")
PCT_TITLE = (pr.POLLUTION_TITLE, "('rejects pollution keys %%: %s', (key) => {")
PCT_NAME = (pr.POLLUTION, "mustFail: ['rejects pollution keys %%'],")
VALIDATION = ("mustFail: ['refuses missing admitted sources, unknown support and duplicate local identities'],", "mustFail: ['validation'],")
SPAWN = ("'run', ...TEST_FILES, '--reporter=json'", "'run', ...TEST_FILES.slice(1), '--reporter=json'")

EMPTY_A = ("id: 'canonical-json-sorted-keys-disabled',", "id: '',")
EMPTY_B = ("id: 'canonical-json-cycle-check-disabled',", "id: '',")
DUP_CHECK = "expect(ids.filter((id, index) => ids.indexOf(id) !== index).join(', '), 'duplicate mutation ids').toBe('');"
PROBE_DUP_CHECK = "expect(ids.filter((id, index) => ids.indexOf(id) !== index), 'duplicate mutation ids').toEqual([]);"
NORM_FIRST = ("posix.normalize(file).startsWith(SUBJECT_ROOT) && posix.normalize(file).endsWith('.ts') && "
              "!/\\.(test|spec|testkit|d)\\.ts$/.test(posix.normalize(file))")

# (id, aim, edits, expect, failed count or None, message substrings)
ROWS = [
    ("O1a", "input: the right file spelled with a doubled slash, reviewed test",
     {PLAN: [DSLASH]}, "killed", 1,
     ["provider-draft-duplicate-handle-check-disabled: packages/polaris-generation-core/src//draft-model.ts " + pr.PATH_CHECK]),
    ("O1b", "O1a's input, path check normalizes before comparing",
     {PLAN: [DSLASH], TEST: [(PATH_PRED, NORM_FIRST)]}, "survived", None, []),
    ("O2a", "input: a must-fail name in the wrong case, reviewed test",
     {PLAN: [CASE]}, "killed", 1,
     ['parse-json-pollution-key-check-disabled: test titles holding must-fail "Rejects Pollution Keys": expected +0 to be 1']),
    ("O2b", "O2a's input, title count case-insensitive",
     {PLAN: [CASE], TEST: [(COUNT_EXPR, "titles.filter((title) => title.toLowerCase().includes(name.toLowerCase())).length")]},
     "survived", None, []),
    ("O3", "W6's second declaration, reader keeps only the first declaration",
     {RUNNER: [W6], TEST: [("return lists;", "return lists.slice(0, 1);")]}, "survived", None, []),
    ("O4a", "T6's duplicate id, reviewed test",
     {PLAN: [T6]}, "killed", 1, ["duplicate mutation ids: expected 'canonical-json-sorted-keys-disabled' to be ''"]),
    ("O4b", "T6's duplicate id, duplicate check over a Set",
     {PLAN: [T6], TEST: [(DUP, "[...new Set(ids)].filter((id, index, unique) => unique.indexOf(id) !== index).join(', ')")]},
     "survived", None, []),
    ("O5a", "input: a `%%` title and name (vitest prints `%`), reviewed test",
     {PJT: [PCT_TITLE], PLAN: [PCT_NAME]}, "killed", 1,
     ['parse-json-pollution-key-check-disabled: must-fail "rejects pollution keys %%" is a literal title fragment: expected false to be true']),
    ("O5b", "O5a's input, `%` arm matches only `%` before a letter",
     {PJT: [PCT_TITLE], PLAN: [PCT_NAME], TEST: [(LIT, "!/%[a-z]|\\$/.test(name)")]}, "survived", None, []),
    ("O6", "W7's spread element, reader drops non-literal elements (the probe's reader)",
     {RUNNER: [W7], TEST: [(READER_ELEM, "init.elements.filter(ts.isStringLiteralLike).map((element) => element.text)")]},
     "survived", None, []),
    ("O7", "finding hunt: a name held by one it title and by a describe title (21 runner fullNames)",
     {PLAN: [VALIDATION]}, "survived", None, []),
    ("O8", "finding hunt: the runner runs TEST_FILES.slice(1); the declaration is unchanged",
     {RUNNER: [SPAWN]}, "survived", None, []),
    ("O9a", "deviation N5: two mutations with the empty id, reviewed test (join of [''] is '')",
     {PLAN: [EMPTY_A, EMPTY_B]}, "survived", None, []),
    ("O9b", "O9a's input, the probe's array form of the duplicate check",
     {PLAN: [EMPTY_A, EMPTY_B], TEST: [(DUP_CHECK, PROBE_DUP_CHECK)]}, "killed", 1, ["duplicate mutation ids: expected"]),
]
ROWS = [r for r in ROWS if ONLY is None or r[0] in ONLY]


def sha(path):
    return hashlib.sha256(open(path, "rb").read()).hexdigest()


def main():
    commit = pr.git("rev-parse", "HEAD").strip()
    if pr.git("status", "--porcelain").strip():
        sys.exit("checkout not clean")
    touched = sorted({f for r in ROWS for f in r[2]})
    digests = {f: sha(f) for f in touched}
    results = []
    with tempfile.TemporaryDirectory(prefix="r550-own-") as scratch:
        control = pr.run_test(scratch, "control")
        print("control", control["exit"], control["total"], control["failed"], flush=True)
        for rid, aim, edits, expect, count, messages in ROWS:
            originals = {f: open(f, "rb").read() for f in edits}
            try:
                for f, pairs in edits.items():
                    text = originals[f].decode("utf-8")
                    for old, new in pairs:
                        if old == "":
                            text += new
                            continue
                        if text.count(old) != 1:
                            sys.exit(f"{rid}: {f}: fragment occurs {text.count(old)} times")
                        text = text.replace(old, new)
                    open(f, "wb").write(text.encode("utf-8"))
                load_before = open("/proc/loadavg").read().split()[:3]
                run = pr.run_test(scratch, rid)
                load_after = open("/proc/loadavg").read().split()[:3]
            finally:
                for f, data in originals.items():
                    open(f, "wb").write(data)
            restored = all(sha(f) == digests[f] for f in edits)
            killed = run["exit"] != 0 and (run["failed"] > 0 or bool(run["fileErrors"]))
            outcome = "killed" if killed else "survived"
            lines = run["failureMessages"] + run["fileErrors"]
            said = all(any(m in line for line in lines) for m in messages)
            ok = outcome == expect and (expect == "survived" or (said and (count is None or run["failed"] == count)))
            results.append({"id": rid, "aim": aim, "edits": {f: [{"old": o, "new": n} for o, n in p] for f, p in edits.items()},
                            "expect": expect, "expectedFailedTests": count, "expectedMessages": messages,
                            "observed": run, "outcome": outcome, "matchesPrediction": ok, "restored": restored,
                            "loadBefore": load_before, "loadAfter": load_after})
            print(rid, outcome, f"{run['failed']}/{run['total']}", "matches" if ok else "MISMATCH", lines[:1], flush=True)
    clean = not pr.git("status", "--porcelain").strip()
    summary = {"mutants": len(results), "killed": sum(r["outcome"] == "killed" for r in results),
               "survived": sum(r["outcome"] == "survived" for r in results),
               "matchesPrediction": sum(r["matchesPrediction"] for r in results), "restored": sum(r["restored"] for r in results)}
    record = {"commit": commit, "tool": {"sha256": sha(os.path.abspath(__file__))}, "prTool": {"path": PR_TOOL, "sha256": sha(PR_TOOL)},
              "files": [{"path": f, "sha256": digests[f]} for f in touched], "control": control, "mutants": results,
              "treeCleanAfter": clean, "summary": summary}
    open(OUT, "w", encoding="utf-8").write(json.dumps(record, indent=2, ensure_ascii=False) + "\n")
    print(summary, "tree clean", clean)


main()
