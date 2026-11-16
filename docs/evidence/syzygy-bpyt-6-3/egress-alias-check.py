#!/usr/bin/env python3
"""Does the S10 no-egress proof read @syzygy/support from source? Four arms in one built clone.

Usage: egress-alias-check.py <built clone> <out.json> [--tmpdir <short private dir>]

The proof, packages/polaris-dossier/src/no-egress.test.ts, bundles the dossier driver with esbuild and runs it under strace.
It bundles only the workspace specifiers its `alias` map names; any other `@syzygy/*` specifier resolves through
node_modules to the package's `dist`. This tool runs that one test file in four arms of the clone it is given, and records
what each reports:

  clean-dist-present   unchanged tree, every dist/ built from clean source        expected: passes (control)
  clean-dist-absent    unchanged tree, every dist/ moved aside                    expected: passes only if the alias exists
  mutant-dist-present  support source binds a loopback UDP socket (AF_INET) at import; dist/ still the clean build
                                                                                  expected: fails only if the alias exists
  mutant-dist-absent   the same mutant, every dist/ moved aside                   expected: fails only if the alias exists

Run it once in a clone at the commit that lacks the alias (fe3855a1) and once at the commit that has it. The mutant
is applied to packages/support/src/sha256.ts and restored afterwards; the dist/ directories are moved back afterwards.
A run that reports no test counts is an error, never a pass. The record names the clone's commit and whether the alias
is present, read from the file, so the arms cannot be attributed to the wrong tree.
"""
import json
import os
import shutil
import subprocess
import sys

TEST = 'packages/polaris-dossier/src/no-egress.test.ts'
MUTATED = 'packages/support/src/sha256.ts'
ALIAS = "'@syzygy/support': src('packages/support/src/index.ts')"
MUTANT_OLD = "import { createHash } from 'node:crypto';\n"
MUTANT_NEW = "import { createHash } from 'node:crypto';\nimport { createSocket } from 'node:dgram';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n"
AWAY = 'dist.away-egress-check'


def run(clone, tmpdir):
    out = os.path.join(tmpdir, 'vitest-egress.json')
    if os.path.exists(out):
        os.remove(out)
    env = dict(os.environ, TMPDIR=tmpdir)
    proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={out}'], cwd=clone, env=env, capture_output=True, text=True, timeout=900)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'error': 'no json reporter output', 'stderrTail': proc.stderr[-600:]}
    data = json.load(open(out))
    failures = [m for f in data['testResults'] for t in f['assertionResults'] for m in (t.get('failureMessages') or [])]
    suite_messages = [f['message'] for f in data['testResults'] if f.get('status') == 'failed' and f.get('message')]
    return {
        'exit': proc.returncode,
        'testFiles': {'total': len(data['testResults']), 'failed': sum(1 for f in data['testResults'] if f.get('status') == 'failed')},
        'tests': {'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'pending': data['numPendingTests'], 'total': data['numTotalTests']},
        'failedTests': [t['fullName'] for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed'],
        'firstFailure': (failures + suite_messages + [''])[0][:700],
    }


def dist_dirs(clone):
    found = []
    for top in ('packages', 'apps'):
        for name in sorted(os.listdir(os.path.join(clone, top))):
            path = os.path.join(clone, top, name, 'dist')
            if os.path.isdir(path):
                found.append(path)
    return found


def main():
    clone, out_path = sys.argv[1], sys.argv[2]
    tmpdir = sys.argv[sys.argv.index('--tmpdir') + 1] if '--tmpdir' in sys.argv else '/tmp/lc63e'
    os.makedirs(tmpdir, exist_ok=True)
    commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    dirty = subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout.strip()
    if dirty:
        raise SystemExit('clone has tracked changes: ' + dirty)
    alias_present = ALIAS in open(os.path.join(clone, TEST)).read()
    dists = dist_dirs(clone)
    if not dists:
        raise SystemExit('no dist/ directory: build the clone first (npm run build)')
    target = os.path.join(clone, MUTATED)
    original = open(target).read()
    if original.count(MUTANT_OLD) != 1:
        raise SystemExit('mutant anchor not found exactly once')
    arms = []
    try:
        for mutant in (False, True):
            for absent in (False, True):
                name = ('mutant' if mutant else 'clean') + ('-dist-absent' if absent else '-dist-present')
                if mutant:
                    open(target, 'w').write(original.replace(MUTANT_OLD, MUTANT_NEW))
                if absent:
                    for d in dists:
                        shutil.move(d, d + '.' + AWAY)
                try:
                    result = run(clone, tmpdir)
                finally:
                    if absent:
                        for d in dists:
                            shutil.move(d + '.' + AWAY, d)
                    open(target, 'w').write(original)
                arms.append(dict(arm=name, mutantApplied=mutant, distAbsent=absent, **result))
    finally:
        open(target, 'w').write(original)
    after = subprocess.run(['git', '-C', clone, 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True, check=True).stdout.strip()
    record = {
        'clone': {'commit': commit, 'aliasForSupportPresentInTest': alias_present, 'testFile': TEST, 'distDirectoriesMovedAside': len(dists), 'trackedChangesAfter': after},
        'mutant': {'path': MUTATED, 'old': MUTANT_OLD, 'new': MUTANT_NEW},
        'arms': arms,
    }
    json.dump(record, open(out_path, 'w'), indent=1)
    for a in arms:
        print(a['arm'], 'exit', a.get('exit'), a.get('tests'), a.get('failedTests'), (a.get('firstFailure') or '')[:140].replace('\n', ' '))


if __name__ == '__main__':
    main()
