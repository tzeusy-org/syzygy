#!/usr/bin/env python3
"""Rule-6 mutation pass over the launch-consent predicates (REQ-polaris-generation-046, 047; syzygy-pdja.21).

Each mutant rewrites one predicate's fragment in place, runs the test file that owns the predicate, and restores the file. A mutant
counts as killed only when vitest reports at least one failed test (a file that fails to load reports zero tests and scores as
survived). Every fragment must occur exactly once in its file, so a stale fragment fails loudly. The record stores each mutant's
`old`/`new` fragment, the file, the test file, the outcome and the commit it ran at (AGENTS.md: a rule-6 record must be re-runnable).

Usage: python3 scripts/launch_consent_mutations.py --out <evidence.json>
Never edit or commit while it runs: it rewrites sources in place.
"""
import argparse
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
SRC = "packages/polaris-dossier/src"

MUTANTS = [
    ("non-terminal refusal", "launch.ts", "if (!ports.terminal.isTTY) return refuse('terminal'", "if (false) return refuse('terminal'", "launch.test.ts"),
    ("exact phrase", "launch.ts", "if (a === phrase) return 'yes';", "if (a.trim() !== '') return 'yes';", "launch.test.ts"),
    ("write consent absent: ask nothing", "launch.ts", "if (writeConsent.state !== 'ok') return refuse('write-consent'", "if (false) return refuse('write-consent'", "launch.test.ts"),
    ("not declared public: refuse before any record", "launch.ts", "if (!admission.admitted) return refuse('not-public'", "if (false) return refuse('not-public'", "launch.test.ts"),
    ("warning only where non-public is admitted", "launch.ts", "    say(nameOnBranchWarning(identity, proposal.url));\n", "", "launch.test.ts"),
    ("self-observation refusal", "launch.ts", "if (clone === home.top || [home.gitDir, home.common].includes(real(snapshot.gitDir))) {", "if (false) {", "launch.test.ts"),
    ("records in force: ask nothing", "launch.ts", "  if (missing.length === 0) {", "  if (false) {", "launch.test.ts"),
    ("statement reuse needs covering classes", "launch.ts", "pair.find(s => preview.classes.every(c => s.contentClasses.includes(c)))", "pair.find(s => preview.classes.some(c => s.contentClasses.includes(c)))", "launch.test.ts"),
    ("A1 in force refuses", "launch.ts", "if (ports.a1InForce()) return refuse('a1'", "if (false) return refuse('a1'", "launch.test.ts"),
    ("identity disagreement refused", "launch-identity.ts", "  if (carried.length > 1) {", "  if (false) {", "launch-identity.test.ts"),
    ("identity from matching records", "launch-identity.ts", "  if (carried.length === 1) return", "  if (false) return", "launch-identity.test.ts"),
    ("normalise: strip leading www.", "launch-identity.ts", "host = host.replace(/^www\\./i, '');", "host = host;", "launch-identity.test.ts"),
    ("HEAD elsewhere refused", "launch-revision.ts", "  if (head !== commit) {", "  if (false) {", "launch-revision.test.ts"),
    ("trunk order main before master", "launch-revision.ts", "if (main !== null) { commit = main; via = 'refs/heads/main'; }\n      else if (master !== null)", "if (master !== null) { commit = master!; via = 'refs/heads/master'; }\n      else if (main !== null)", "launch-revision.test.ts"),
    ("ambiguous revision refused", "launch-revision.ts", "    if (found.size !== 1) {", "    if (found.size === 0) {", "launch-revision.test.ts"),
    ("reader: at most one parent", "launch-store.ts", "if (head.parents.length > 1) return", "if (false) return", "launch-store.test.ts"),
    ("reader: additions only", "launch-store.ts", "if (m === null || m[5] !== 'A' || m[1] !== '000000' ||", "if (m === null ||", "launch-store.test.ts"),
    ("reader: revocation by a decisions file", "launch-store.ts", "    if (revokedBy !== undefined) return", "    if (false) return", "launch-store.test.ts"),
    ("writer: tip moved", "launch-store.ts", "if (tipRead.tip !== input.expectedTip) return", "if (false) return", "launch-store.test.ts"),
    ("writer: new files only", "launch-store.ts", "if (entries.some(e => nameOf(e) === b.name)) return", "if (false) return", "launch-store.test.ts"),
    ("writer: not while the ref is checked out", "launch-store.ts", "if (worktrees.split('\\n').includes(`branch ${LAUNCH_REF}`)) return", "if (false) return", "launch-store.test.ts"),
    ("writer: hooks disabled", "launch-store.ts", "['-c', 'core.hooksPath=/dev/null', '-c', 'core.fsmonitor=false',", "['-c', 'core.fsmonitor=false',", "launch-store.test.ts"),
    ("record: digest binding", "launch-record.ts", "if (sha256(content) !== m[1]) return", "if (false) return", "launch-record.test.ts"),
    ("record: exact form", "launch-record.ts", "if (again !== text) return", "if (false) return", "launch-record.test.ts"),
    ("write consent: withdrawal sweep", "launch-write-consent.ts", "if (STEMS.some(stem =>", "if (false && STEMS.some(stem =>", "launch-write-consent.test.ts"),
    ("write consent: scope lines", "launch-write-consent.ts", "if (missing.length > 0 || !RECORD_CLASS_LINE.test(artifact)) {", "if (false) {", "launch-write-consent.test.ts"),
    ("write consent: instant not after now", "launch-write-consent.ts", "if (at > options.now) return absent(", "if (false) return absent(", "launch-write-consent.test.ts"),
]


def run_test(test: str) -> tuple[int, int]:
    proc = subprocess.run(["npx", "vitest", "run", f"{SRC}/{test}"], cwd=ROOT, capture_output=True, text=True, timeout=900)
    out = re.sub(r"\x1b\[[0-9;]*m", "", proc.stdout + proc.stderr)
    failed = re.search(r"Tests\s+(\d+) failed", out)
    passed = re.search(r"Tests\s+(?:\d+ failed \| )?(\d+) passed", out)
    return (int(failed.group(1)) if failed else 0, int(passed.group(1)) if passed else 0)


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(["git", "status", "--porcelain", "--", SRC], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    if dirty.strip():
        print("refused: the sources under test have uncommitted changes", file=sys.stderr)
        return 2
    results = []
    for name, file, old, new, test in MUTANTS:
        path = ROOT / SRC / file
        original = path.read_text()
        if original.count(old) != 1:
            print(f"refused: fragment for {name!r} occurs {original.count(old)} times in {file}", file=sys.stderr)
            return 2
        try:
            path.write_text(original.replace(old, new, 1))
            failed, passed = run_test(test)
        finally:
            path.write_text(original)
        outcome = "killed" if failed > 0 else "survived"
        print(f"{outcome:8} {name} ({failed} failed, {passed} passed)")
        results.append({"predicate": name, "file": f"{SRC}/{file}", "old": old, "new": new, "test": f"{SRC}/{test}", "failed": failed, "passed": passed, "outcome": outcome})
    record = {
        "subject": "launch-consent predicates (REQ-polaris-generation-046, 047)", "commit": commit,
        "runner": "scripts/launch_consent_mutations.py", "mutants": len(results),
        "killed": sum(r["outcome"] == "killed" for r in results), "survived": [r["predicate"] for r in results if r["outcome"] != "killed"],
        "results": results,
    }
    pathlib.Path(args.out).write_text(json.dumps(record, indent=2) + "\n")
    return 0 if not record["survived"] else 1


if __name__ == "__main__":
    sys.exit(main())
