#!/usr/bin/env python3
"""Rule-6 mutation pass over the screening-scope version-8 reading predicates (syzygy-pdja.21).

As `launch_consent_mutations.py`: each mutant rewrites one predicate's fragment in place, runs the test file that owns it, and
restores the file. A mutant counts as killed only when vitest reports at least one failed test. Every fragment must occur exactly once
in its file. The record stores each mutant's `old`/`new` fragment, file, test, outcome and the commit it ran at.

Usage: python3 scripts/screening_v8_mutations.py --out <evidence.json>
Never edit or commit while it runs: it rewrites sources in place.
"""
import argparse
import json
import pathlib
import subprocess
import sys

import re

ROOT = pathlib.Path(__file__).resolve().parents[1]

CORE = "packages/polaris-generation-core/src"
DOSSIER = "packages/polaris-dossier/src"
APP = "apps/three-surface-poc/src/polaris-generation"
VIS_TEST = f"{DOSSIER}/source-visibility.test.ts"
GATE_TEST = f"{DOSSIER}/source-visibility-gate.test.ts"
SCREEN_TEST = f"{DOSSIER}/screen-scope-v8.test.ts"
RENDER_TEST = f"{DOSSIER}/render.test.ts"
APP_TEST = f"{APP}/public-source-screening.test.ts"

MUTANTS = [
    ("visibility: admitted pinned", f"{CORE}/source-visibility.ts", "if (!exactly(sv['admitted'], ['public', 'private'])) return", "if (false) return", VIS_TEST),
    ("visibility: texts pinned by digest", f"{CORE}/source-visibility.ts", "typeof value !== 'string' || sha256(value) !== VISIBILITY_TEXTS[key]", "typeof value !== 'string'", VIS_TEST),
    ("pair: every carrier public", f"{CORE}/source-visibility.ts", "carriers.every(carrier => carrier === 'public')", "carriers.some(carrier => carrier === 'public')", VIS_TEST),
    ("pair: at least one record", f"{CORE}/source-visibility.ts", "(carriers.length > 0 && carriers.every", "(carriers.every", VIS_TEST),
    ("redaction: v8 appliesTo only beside sourceVisibility", f"{CORE}/secret-redaction.ts", "Object.hasOwn(scope, 'sourceVisibility') ? APPLIES_TO_V8 : REDACTION_TEXTS.appliesTo", "REDACTION_TEXTS.appliesTo", VIS_TEST),
    ("redaction: none for a private repository", f"{CORE}/secret-redaction.ts", "(visibility === 'private' ? null : redaction);", "(redaction);", VIS_TEST),
    ("screen: v7 refuses private", f"{DOSSIER}/screen.ts", "if (visibility === 'private' && !visibilityRead.admitsPrivate) return", "if (false) return", SCREEN_TEST),
    ("screen: private screens without redaction", f"{DOSSIER}/screen.ts", "redactionFor(redaction, visibility)", "redaction", SCREEN_TEST),
    ("screen: v8 decides visibility", f"{DOSSIER}/screen.ts", "  if (declaresSourceVisibility(bytes)) {", "  if (false) {", SCREEN_TEST),
    ("screen: no subject builds private", f"{DOSSIER}/screen.ts", "if (subject === null) visibility = 'private';", "if (subject === null) visibility = 'public';", SCREEN_TEST),
    ("gate: unreadable launch record refuses", f"{DOSSIER}/source-visibility-gate.ts", "  if (!store.ok) return", "  if (false) return", GATE_TEST),
    ("gate: only active records", f"{DOSSIER}/source-visibility-gate.ts", "r.state === 'active' && r.record.recordClass", "r.record.recordClass", GATE_TEST),
    ("gate: only the pair's records", f"{DOSSIER}/source-visibility-gate.ts", " && r.record.identity === subject.repository\n", "\n", GATE_TEST),
    ("gate: only records in force", f"{DOSSIER}/source-visibility-gate.ts", "    && Date.parse(r.record.grantInstant) <= options.now);", "    );", GATE_TEST),
    ("gate: only observation records", f"{DOSSIER}/source-visibility-gate.ts", "r.record.recordClass === 'observation-consent' && r.record.identity", "r.record.identity", GATE_TEST),
    ("gate: not-public states private", f"{DOSSIER}/source-visibility-gate.ts", "r.record.publicDeclaration === 'not-public' ? 'private' : 'states-nothing'", "'public'", GATE_TEST),
    ("gate: only the affirmative answer states public", f"{DOSSIER}/source-visibility-gate.ts", "r.record.publicDeclaration === 'public' ? 'public'", "r.record.publicDeclaration !== 'not-public' ? 'public'", GATE_TEST),
    ("render: private excluded object id off the source population", f"{DOSSIER}/render.ts", "objectId: screen.visibility === 'private' ? null : cited.objectId,", "objectId: cited.objectId,", RENDER_TEST),
    ("render: private excluded object id off the discovery row", f"{DOSSIER}/render.ts", "cited.objectId === null || (screen.visibility === 'private' && (cited.outcome !== 'admitted' || (cited.path !== null && withheldClass.has(cited.path))))", "cited.objectId === null", RENDER_TEST),
    ("launch: non-public admitted only by v8", f"{DOSSIER}/launch-cli.ts", "return read.ok && read.admitsPrivate ?", "return read.ok ?", SCREEN_TEST),
    ("provider mode: private refused", f"{APP}/public-source-screening.ts", "  if (visibility === 'private') refuse(", "  if (false) refuse(", APP_TEST),
    ("provider mode: v8 needs a public decision", f"{APP}/public-source-screening.ts", "visibilityRead.declared && visibility !== 'public'", "visibilityRead.declared && visibility === 'private'", APP_TEST),
]


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--out", required=True)
    args = ap.parse_args()
    commit = subprocess.run(["git", "rev-parse", "HEAD"], cwd=ROOT, capture_output=True, text=True, check=True).stdout.strip()
    files = sorted({m[1] for m in MUTANTS})
    dirty = subprocess.run(["git", "status", "--porcelain", "--", *files], cwd=ROOT, capture_output=True, text=True, check=True).stdout
    if dirty.strip():
        print("refused: the sources under test have uncommitted changes", file=sys.stderr)
        return 2
    results = []
    for name, file, old, new, test in MUTANTS:
        path = ROOT / file
        original = path.read_text()
        if original.count(old) != 1:
            print(f"refused: fragment for {name!r} occurs {original.count(old)} times in {file}", file=sys.stderr)
            return 2
        try:
            path.write_text(original.replace(old, new, 1))
            failed, passed = run_test_at(test)
        finally:
            path.write_text(original)
        outcome = "killed" if failed > 0 else "survived"
        print(f"{outcome:8} {name} ({failed} failed, {passed} passed)", flush=True)
        results.append({"predicate": name, "file": file, "old": old, "new": new, "test": test, "failed": failed, "passed": passed, "outcome": outcome})
    record = {
        "subject": "screening scope version 8 reading predicates (sourceVisibility, private-pair rules)", "commit": commit,
        "runner": "scripts/screening_v8_mutations.py", "mutants": len(results),
        "killed": sum(r["outcome"] == "killed" for r in results), "survived": [r["predicate"] for r in results if r["outcome"] != "killed"],
        "results": results,
    }
    pathlib.Path(args.out).write_text(json.dumps(record, indent=2) + "\n")
    return 0 if not record["survived"] else 1


def run_test_at(test: str) -> tuple[int, int]:
    proc = subprocess.run(["npx", "vitest", "run", test], cwd=ROOT, capture_output=True, text=True, timeout=900)
    out = re.sub(r"\x1b\[[0-9;]*m", "", proc.stdout + proc.stderr)
    failed = re.search(r"Tests\s+(\d+) failed", out)
    passed = re.search(r"Tests\s+(?:\d+ failed \| )?(\d+) passed", out)
    return (int(failed.group(1)) if failed else 0, int(passed.group(1)) if passed else 0)


if __name__ == "__main__":
    sys.exit(main())
