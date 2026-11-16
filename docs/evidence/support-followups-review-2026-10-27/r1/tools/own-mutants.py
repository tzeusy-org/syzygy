#!/usr/bin/env python3
"""Reviewer's mutants for PR #538, and an independent re-run of five of the lane's, with a runner that is not the lane's.

Usage: own-mutants.py <clone with node_modules> <private tmpdir> <out.json> [--only id,id]

Each row: check out the commit (detached, -f), assert `old` occurs exactly once in `file`, write `new`, run the named test
files with Vitest's JSON reporter, record exit, totals and every failed test's full name, then restore with `git checkout -f`.
A run that reports zero tests is an error. 'killed' means exit != 0 and at least one failed assertion row; a file that fails
to load is listed separately and is never a kill by itself.
"""
import json
import os
import subprocess
import sys

BASE = 'f7477f52c49ee347f96b92703887c31f6be49e07'
HEAD = 'b214ef1015c134dbc821c4f4dec654a16314c354'
CORE = 'packages/three-surface-poc-core/src/'
GEN = 'packages/polaris-generation-core/src/'
APP = 'apps/three-surface-poc/src/'
INSTALL = 'scripts/check_generator_install.mjs'
INSTALL_TEST = [APP + 'polaris-generation/generator-install-check.test.ts']
SUPPORT_LINE = "join(process.cwd(), 'node_modules', '@syzygy', 'support')"

# (id, commit, file, old, new, test files, expectation)
ROWS = [
    # --- reviewer's own mutants, at the head ---
    ('M1-preflight-checks-the-scope-dir-not-support', HEAD, INSTALL, SUPPORT_LINE, "join(process.cwd(), 'node_modules', '@syzygy')", INSTALL_TEST, 'killed'),
    ('M2-preflight-support-resolved-from-the-script-not-cwd', HEAD, INSTALL, SUPPORT_LINE,
     "join(new URL('..', import.meta.url).pathname, 'node_modules', '@syzygy', 'support')", INSTALL_TEST, 'killed'),
    ('M3-preflight-support-joined-with-and', HEAD, INSTALL, "))\n  || !existsSync(" + SUPPORT_LINE, "))\n  && !existsSync(" + SUPPORT_LINE, INSTALL_TEST, 'killed'),
    ('M4-headroom-shallow-freeze', HEAD, CORE + 'model.ts', 'resourceHeadroom: deepFreeze(deriveResourceHeadroom(', 'resourceHeadroom: Object.freeze(deriveResourceHeadroom(',
     [CORE + 'model.test.ts'], 'killed'),
    ('M5-body-authority-shallow-freeze', HEAD, CORE + 'body-read-authority.ts', '  return deepFreeze({\n    evaluationId: inputs.evaluationId,',
     '  return Object.freeze({\n    evaluationId: inputs.evaluationId,', [CORE + 'body-read-authority.test.ts'], 'killed'),
    ('M6-junitDigest-hashes-the-backing-buffer', HEAD, CORE + 'test-artifact-verification.ts', 'return `sha256:${sha256(rawJUnit)}`;',
     'return `sha256:${sha256(new Uint8Array(rawJUnit.buffer))}`;', [CORE + 'test-artifact-verification.test.ts'], 'killed'),
    ('M7-deepFreeze-walks-but-freezes-nothing', HEAD, 'packages/support/src/deep-freeze.ts', '    Object.freeze(value);\n', '',
     ['packages/support/src/deep-freeze.test.ts'], 'killed'),
    ('M8-census-skips-arrays', HEAD, CORE + 'test-frozen.ts', '    seen.add(node);\n', '    if (Array.isArray(node)) return;\n    seen.add(node);\n',
     [CORE + 'test-frozen.test.ts'], 'killed'),
    ('M9-attempt-ordinal-off-by-one', HEAD, APP + 'polaris-generation/durable-lifecycle.ts', '\\0${input.ordinal}`', '\\0${input.ordinal + 1}`',
     [APP + 'polaris-generation/durable-lifecycle.test.ts'], 'killed'),
    ('M10-artifact-digest-last-hex-replaced', HEAD, CORE + 'model.ts', 'return { path: artifactPath, digest: sha256(bytes) };',
     "return { path: artifactPath, digest: sha256(bytes).slice(0, 63) + '0' };", [CORE + 'model.test.ts'], 'killed'),
    ('M11-fixture-sha256-latin1', HEAD, APP + 'test-walkthrough-judgment-fixture.ts', "import { sha256 } from '@syzygy/support';",
     "import { createHash } from 'node:crypto';\nconst sha256 = (text: string): string => createHash('sha256').update(text, 'latin1').digest('hex');",
     [APP + 'polaris-walkthrough-readiness.test.ts', APP + 'polaris-copy.test.ts', APP + 'response-identity-independent.test.ts', APP + 'keyboard-sweep-record.test.ts'], 'report'),
    ('M12-questions-freeze-compared-with-another-digest', HEAD, GEN + 'dossier-evaluation.ts',
     'input.expectedQuestionsSha256 !== questionsSha256)', "input.expectedQuestionsSha256 !== sha256(input.questionsText + '\\n'))",
     [GEN + 'dossier-evaluation.test.ts'], 'killed'),
    ('M12-at-base', BASE, GEN + 'dossier-evaluation.ts',
     'input.expectedQuestionsSha256 !== questionsSha256)', "input.expectedQuestionsSha256 !== sha256(input.questionsText + '\\n'))",
     [GEN + 'dossier-evaluation.test.ts'], 'report'),
    # --- five of the lane's mutants, reproduced at base (must pass) and head (must fail on the new row) ---
]
LANE = [
    ('C11', GEN + 'dossier-evaluation.ts', 'const questionsSha256 = sha256(input.questionsText);', "const questionsSha256 = sha256(input.questionsText + ' ');", [GEN + 'dossier-evaluation.test.ts']),
    ('R3', GEN + 'dossier-profile.ts', 'sha256(JSON.stringify([q.id, q.question, q.scope, q.reason]))', 'sha256(JSON.stringify([q.id, q.scope, q.question, q.reason]))', [GEN + 'dossier-profile.test.ts']),
    ('R9', APP + 'polaris-generation/durable-lifecycle.ts', '`${input.requestId}\\0${input.stage}\\0${input.ordinal}`', '`${input.stage}\\0${input.requestId}\\0${input.ordinal}`',
     [APP + 'polaris-generation/durable-lifecycle.test.ts']),
    ('F3', CORE + 'body-read-authority.ts', '  return deepFreeze({\n    evaluationId: inputs.evaluationId,', '  return ({\n    evaluationId: inputs.evaluationId,', [CORE + 'body-read-authority.test.ts']),
    ('D3', 'packages/support/src/deep-freeze.ts', '    Object.freeze(value);\n    for (const member of Object.values(value)) deepFreeze(member);\n',
     '    const members = Object.values(value);\n    Object.freeze(value);\n    for (const member of members) deepFreeze(member);\n', ['packages/support/src/deep-freeze.test.ts']),
]
for lid, path, old, new, files in LANE:
    ROWS.append((f'L-{lid}-at-base', BASE, path, old, new, files, 'survives'))
    ROWS.append((f'L-{lid}-at-head', HEAD, path, old, new, files, 'killed'))
ROWS.append(('CTRL-head-unmutated', HEAD, None, None, None, sorted({f for r in ROWS for f in r[5]}), 'survives'))


def sh(cmd, cwd, env=None):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True)


def checkout(clone, commit):
    sh(['git', 'checkout', '-q', '-f', '--detach', commit], clone)
    got = sh(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    assert got == commit, (got, commit)
    return got


def run(clone, tmp, files):
    out = os.path.join(tmp, 'v.json')
    if os.path.exists(out):
        os.remove(out)
    p = sh(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={out}', '--testTimeout=120000', '--hookTimeout=120000', *files], clone, {'TMPDIR': tmp})
    d = json.load(open(out))
    if d['numTotalTests'] == 0:
        raise SystemExit('zero tests: ' + p.stderr[-300:])
    failed = [f"{f['name'].split('/')[-1]} > {t['fullName']}" for f in d['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    unloaded = [f['name'].split('/')[-1] for f in d['testResults'] if f['status'] == 'failed' and not f['assertionResults']]
    return {'exit': p.returncode, 'total': d['numTotalTests'], 'failed': d['numFailedTests'], 'failedTests': failed, 'filesFailedToLoad': unloaded}


def main():
    clone, tmp, out_path = sys.argv[1:4]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    os.makedirs(tmp, exist_ok=True)
    results = []
    for rid, commit, path, old, new, files, expect in ROWS:
        if only and rid not in only:
            continue
        checkout(clone, commit)
        if path is not None:
            full = os.path.join(clone, path)
            text = open(full, encoding='utf-8').read()
            count = text.count(old)
            if count != 1:
                raise SystemExit(f'{rid}: old occurs {count} times in {path} at {commit[:8]}')
            open(full, 'w', encoding='utf-8').write(text.replace(old, new))
        try:
            r = run(clone, tmp, files)
        finally:
            checkout(clone, commit)
        killed = r['exit'] != 0 and r['failed'] > 0
        outcome = 'killed' if killed else ('survives' if r['exit'] == 0 else 'error')
        row = {'id': rid, 'commit': commit, 'file': path, 'old': old, 'new': new, 'files': files, 'expect': expect, 'outcome': outcome,
               'agrees': expect == 'report' or outcome == expect, **r}
        results.append(row)
        print(('ok  ' if row['agrees'] else 'BAD ') + rid, outcome, f"exit={r['exit']} failed={r['failed']}/{r['total']}", r['failedTests'], flush=True)
        json.dump({'node': sh(['node', '-v'], clone).stdout.strip(), 'rows': results}, open(out_path, 'w'), indent=1)
    bad = [r['id'] for r in results if not r['agrees']]
    print({'rows': len(results), 'disagree': bad})
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
