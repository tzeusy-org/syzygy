#!/usr/bin/env python3
"""Assemble or re-check the verification record for the NON_HUMAN_PRINCIPAL pin harness change.

Usage:
  assemble_verification.py <tree> <base-commit> <mutants.json> <selftest.json> <scratch-governance-dir> <out.json>
  assemble_verification.py --verify <record.json>

Successor of the 2026-10-22 assembler (syzygy-bpyt.6.11). The logs are retained
beside the record in logs/ (vitest-full.log, typecheck.log, governance-base.txt,
governance-head.txt, authority-sweep.log, quotations-base.txt, quotations-head.txt),
so every digest in logDigests can be re-derived: --verify re-hashes the retained
files and stops on any mismatch. The two governance logs are NOT retained: they
quote a retired acceptance phrase, which CG-2a refuses in a tracked file. They
are read from <scratch-governance-dir> (governance-base.txt, governance-head.txt),
and the record carries their last lines and the computed difference, no digest. The governance note is computed from the line
difference of the two governance logs, never written by hand.
"""
import difflib
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
LOG_NAMES = ['vitest-full.log', 'typecheck.log',
             'authority-sweep.log', 'quotations-base.txt', 'quotations-head.txt']
GATE_FILES = [
    'packages/three-surface-poc-core/src/act-fields.ts',
    'packages/three-surface-poc-core/src/body-read-authority.ts',
    'packages/three-surface-poc-core/src/walkthrough-judgment.ts',
]


def sha256(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def git(tree: Path, *args: str) -> str:
    return subprocess.run(['git', '-C', str(tree), *args], capture_output=True, text=True, check=True).stdout


def line_matching(path: Path, pattern: str) -> str:
    matches = [ln.strip() for ln in path.read_text(encoding='utf-8').splitlines() if re.search(pattern, ln)]
    if len(matches) != 1:
        raise SystemExit(f'{path.name}: expected exactly one line matching {pattern!r}, found {len(matches)}')
    return matches[0]


def log_difference(a: Path, b: Path) -> list[str]:
    """Lines that differ between two logs, as -/+ lines, computed."""
    return [ln for ln in difflib.unified_diff(a.read_text(encoding='utf-8').splitlines(), b.read_text(encoding='utf-8').splitlines(), lineterm='', n=0)
            if ln[:1] in '+-' and not ln.startswith(('---', '+++'))]


def verify(record_path: Path) -> int:
    record = json.loads(record_path.read_text(encoding='utf-8'))
    bad = []
    for name, digest in record['logDigests'].items():
        p = record_path.parent / 'logs' / name
        if not p.is_file() or sha256(p) != digest:
            bad.append(name)
    if sorted(record['logDigests']) != sorted(LOG_NAMES):
        bad.append('log set differs from the five expected')
    print(json.dumps({'checked': len(record['logDigests']), 'mismatched': bad}))
    return 1 if bad else 0


def main() -> int:
    if sys.argv[1:2] == ['--verify']:
        return verify(Path(sys.argv[2]))
    tree, base, mutants_path, selftest_path, scratch, out = Path(sys.argv[1]), sys.argv[2], Path(sys.argv[3]), Path(sys.argv[4]), Path(sys.argv[5]), Path(sys.argv[6])
    logs = HERE / 'logs'
    head = git(tree, 'rev-parse', 'HEAD').strip()
    mutants = json.loads(mutants_path.read_text(encoding='utf-8'))
    selftest = json.loads(selftest_path.read_text(encoding='utf-8'))
    gate_diff = git(tree, 'diff', '--stat', base, 'HEAD', '--', *GATE_FILES)
    changed = git(tree, 'diff', '--name-only', base, 'HEAD').split()
    gov_base, gov_head = scratch / 'governance-base.txt', scratch / 'governance-head.txt'
    quot_base, quot_head = logs / 'quotations-base.txt', logs / 'quotations-head.txt'
    last = lambda p: p.read_text(encoding='utf-8').strip().splitlines()[-1]

    record = {
        'subject': 'verification of the NON_HUMAN_PRINCIPAL pin harness and owner-table comment change (syzygy-bpyt.6.11)',
        'tree': {'head': head, 'base': base},
        'gateFiles': {'paths': GATE_FILES, 'gitDiffStatBaseToHead': gate_diff, 'byteIdentical': gate_diff == ''},
        'filesChangedBaseToHead': changed,
        'fullSuite': {
            'command': 'npx vitest run', 'ranAt': head,
            'testFilesLine': line_matching(logs / 'vitest-full.log', r'^\s*Test Files\s'),
            'testsLine': line_matching(logs / 'vitest-full.log', r'^\s*Tests\s'),
            'exitLine': line_matching(logs / 'vitest-full.log', r'^exit='),
        },
        'gates': {
            'typecheck': {'command': 'npm run typecheck', 'exitLine': line_matching(logs / 'typecheck.log', r'^exit=')},
            'governance': {
                'command': 'python3 scripts/check_governance.py',
                'baseLastLine': last(gov_base), 'headLastLine': last(gov_head),
                'logsRetained': False, 'lineDifferenceBaseToHead': log_difference(gov_base, gov_head),
            },
            'quotations': {'command': 'python3 scripts/check_quotations.py', 'outputsByteIdentical': quot_base.read_bytes() == quot_head.read_bytes()},
            'authoritySweep': {
                'command': 'npx vitest run apps/three-surface-poc/src/polaris-authority-sweep.test.ts',
                'testsLine': line_matching(logs / 'authority-sweep.log', r'^\s*Tests\s'),
            },
        },
        'harness': {
            'digestsInMutantsRecord': mutants['harnessDigests'],
            'digestsOnDisk': {n: sha256(HERE / n) for n in ('mutate_non_human_principal.py', 'regex-differential.mjs')},
            'selftestHarnessDigest': selftest['harnessDigest'],
            'selftestAllRefused': selftest['allRefused'],
            'selftestCases': len(selftest['cases']),
        },
        'mutants': {
            'commit': mutants['commit'], 'baselineTotal': mutants['baseline']['total'], 'baselineFailed': mutants['baseline']['failed'],
            'planned': mutants['summary']['planned'], 'killed': mutants['summary']['killed'], 'survivors': mutants['summary']['survivors'],
            'survivorsEquivalentWithArgument': mutants['summary']['survivorsEquivalentWithArgument'],
            'survivorsWithCorpusWitness': mutants['summary']['survivorsWithCorpusWitness'],
            'everyObservedTotalEqualsBaseline': all(m['observed']['total'] == mutants['baseline']['total'] for m in mutants['mutants']),
            'section3HKilled': mutants['summary']['section3HKilled'], 'allRestored': mutants['summary']['allRestored'],
        },
        'logDigests': {n: sha256(logs / n) for n in LOG_NAMES},
    }
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(json.dumps({k: record[k] for k in ('gateFiles', 'fullSuite', 'gates', 'harness', 'mutants')}, indent=1))
    return 0


if __name__ == '__main__':
    sys.exit(main())
