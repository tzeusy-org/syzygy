#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.6.14 (the PR 530 round-2 review's N9 and N10), run in a clean clone.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present>

The fourth argument is the dist/ state the run asserts before it starts: `absent` (no packages/*/dist or apps/*/dist) or
`present` (all twelve built). Every row records its edits verbatim: {path, old, new} replaces `old`, which must occur exactly
once, by `new`; old null creates the file `new` names (and any directory it needs); {path, link} creates that symbolic link.
The reviewer's fragments are read from the round-2 records committed in the clone (by id; each record's sha256 is stored),
never retyped; the PR 545 round-1 review's (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1) are read the same way from reviewer-r1-fragments.json,
which tools/reviewer_r1_fragments.py copied from that review's records. A row's test is one file or a list of files. A row is `killed` when vitest exits non-zero with a failed test or a failed file, `survives` when it exits 0,
and `error` when it writes no JSON report. The expectation was written before the run. Restores every edit, removes every
file, link and directory it created, and records `git status --porcelain` after (expected empty).
"""
import hashlib
import json
import os
import subprocess
import sys

ROUND2 = 'docs/evidence/support-leaf-review-2026-10-27/round-2'
ROUND1_PR545 = 'docs/evidence/syzygy-bpyt-6-14/reviewer-r1-fragments.json'
PURITY = 'packages/support/src/support-purity.test.ts'
DRAFTER_TEST = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
DRAFTER = 'packages/three-surface-poc-core/src/owner-act-drafter.ts'
NO_EGRESS = 'packages/polaris-dossier/src/no-egress.test.ts'
TESTKIT = 'packages/support/src/purity.testkit.ts'
PKG = 'packages/support/package.json'
EXPORTS = '"types": "./dist/index.d.ts",\n      "import": "./dist/index.js",\n      "default": "./dist/index.js"'
READ_TS = "import { readFileSync } from 'node:fs';\nexport const read = (p: string): string => readFileSync(p, 'utf8');\n"
SITE = 'apps/three-surface-poc/src/polaris-generation/dossier-site.ts'
SITE_FIRST = "import { DESIGN_TOKENS_CSS } from '../design-tokens.js';\n"
LEAK = [
    {'path': 'packages/leak/package.json', 'old': None,
     'new': '{\n  "name": "@syzygy/leak",\n  "version": "0.0.0",\n  "private": true,\n  "type": "module"\n}\n'},
    {'path': 'packages/leak/index.js', 'old': None, 'new': 'export const LEAK = 1;\n'},
    {'path': 'node_modules/@syzygy/leak', 'link': '../../packages/leak'},
    {'path': SITE, 'old': SITE_FIRST, 'new': "import '@syzygy/leak';\n" + SITE_FIRST},
]
HEAD_ALIAS = "      aliases[specifier] = path.join(SOURCE_ROOT, module);\n"
BASE_ALIAS = "      '@syzygy/support': src('packages/support/src/index.ts'),\n"


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


# (id, test, head edits or None, base edits or None, expected at head, expected at base). A reviewer row's edits are the
# string 'reviewer' (round 2 of PR 530) or 'reviewer-r1' (round 1 of PR 545) and are read from its record; None means the row
# does not apply at that commit.
ROWS = [
    ('C0-purity-unmutated', PURITY, [], [], 'pass', 'pass'),
    *[(rid, PURITY, 'reviewer', 'reviewer', 'killed', base) for rid, base in [
        ('RP1-re-export-from-node-fs', 'killed'),
        ('RP2-globalThis-bracket-read-of-process-env', 'survives'),
        ('RP3-top-level-side-effect-console-write', 'survives'),
        ('RP4-createRequire-of-node-fs', 'killed'),
        ('RP5-network-through-an-unnamed-global-WebSocket', 'survives'),
        ('RP6-file-read-via-globalThis-process-getBuiltinModule', 'survives'),
        ('RP7-clock-via-performance-now', 'survives'),
        ('RP8-randomness-from-the-allowed-node-crypto', 'survives'),
        ('RP9-ts-import-equals-require', 'killed'),
        ('RP10-subdirectory-module-re-exported', 'killed'),
        ('RP11-mts-module-re-exported', 'killed'),
        ('RP12-computed-dynamic-import-with-a-space', 'survives'),
        ('RP13-fetch-by-reference-not-call', 'survives'),
        ('RP14-subpath-export-of-an-unscanned-subdirectory-module', 'survives'),
        ('RP15-optional-call-fetch-at-import', 'survives'),
        ('RP16-optional-chained-process-env-read', 'survives'),
        ('E4b-global-fetch-at-first-call-port-65530', 'killed'),
        ('E6-console-write-at-import', 'survives'),
        ('E7-optional-call-fetch-at-import', 'survives'),
        ('E8-websocket-at-import', 'survives'),
        ('E9-obfuscated-file-read-at-import (RP6 form)', 'survives'),
    ]],
    # (a) a module under a subdirectory that nothing reaches; (b) the "." entry moved, and a second entry added.
    ('L1-unreached-subdirectory-module', PURITY, [edit('packages/support/src/io/read.ts', None, READ_TS)],
     [edit('packages/support/src/io/read.ts', None, READ_TS)], 'killed', 'survives'),
    ('X1-dot-entry-redirected-to-deep-freeze', PURITY,
     [edit(PKG, EXPORTS, EXPORTS.replace('/index.', '/deep-freeze.'))], [edit(PKG, EXPORTS, EXPORTS.replace('/index.', '/deep-freeze.'))],
     'killed', 'survives'),
    ('X2-package-json-subpath-added', PURITY,
     [edit(PKG, '      "default": "./dist/index.js"\n    }\n', '      "default": "./dist/index.js"\n    },\n    "./package.json": "./package.json"\n')],
     [edit(PKG, '      "default": "./dist/index.js"\n    }\n', '      "default": "./dist/index.js"\n    },\n    "./package.json": "./package.json"\n')],
     'killed', 'survives'),
    # The readers' and the list's own rows: each mutant of the shared testkit or the identifier reader fails a row.
    ('K1-specifier-reader-drops-import-and-require-calls', PURITY,
     [edit(TESTKIT, "    ...[...code.matchAll(/\\b(?:import|require)\\s*\\(\\s*['\"`]([^'\"`]+)['\"`]/g)].map((match) => match[1]!),\n", '')], None,
     'killed', None),
    ('K2-forbidden-list-drops-mkdir', PURITY, [edit(TESTKIT, ' /\\bmkdir/,', '')], None, 'killed', None),
    ('K3-identifier-reader-skips-private-names', PURITY,
     [edit(PURITY, 'if (ts.isIdentifier(node) || ts.isPrivateIdentifier(node))', 'if (ts.isIdentifier(node))')], None, 'killed', None),
    # Attribution: with the scan made non-recursive again, only the scan's own fixture row fails (round 1's N1), so the
    # recursion is what kills L1 and that row is what pins the recursion.
    ('T1-scan-without-recursion-plus-L1', PURITY,
     [edit(PURITY, "readdirSync(dir, { recursive: true, encoding: 'utf8' })", "readdirSync(dir, { encoding: 'utf8' })"),
      edit('packages/support/src/io/read.ts', None, READ_TS)], None, 'killed', None),
    # Round 1's F1: a module binding that names no identifier, each alone, and Y7 with the drafter taking randomness through
    # the leaf; N2: a shared token narrowed; N3: an allowed global's member rewritten. Each must fail the row its fix added.
    *[(rid, test, 'reviewer-r1', None, 'killed', None) for rid, test in [
        ('Y7-export-star-from-node-crypto', PURITY),
        ('Y9-export-star-as-allowed-name', PURITY),
        ('Y10-string-named-re-export', PURITY),
        ('Y11-string-named-import-called-at-import', PURITY),
        ('Y12-namespace-import-re-exported', PURITY),
        ('Y14-drafter-takes-randomness-through-support', [PURITY, DRAFTER_TEST]),
        ('K4-shared-Date-token-weakened-plus-DK1', [PURITY, DRAFTER_TEST]),
        ('Y6-allowed-global-member-replaced', PURITY),
    ]],
    # Round 2's F2: the scan's fixture row weakened three more ways, each alone; each must fail that row alone. Fragments copied
    # by script from the round-2 review's tools/r2_mutants.py (sha256 3b954d84e97771016b6dcccf2d3e826a9225e46d02330d9c94b23831fb0a5a4f).
    ('W5-filter-drops-the-x-forms', PURITY, [edit(PURITY, '/\\.[cm]?[jt]sx?$/u.test(name)', '/\\.[cm]?[jt]s$/u.test(name)')], None, 'killed', None),
    ('W6-test-exclusion-broadened-to-any-test-substring', PURITY, [edit(PURITY, "!name.endsWith('.test.ts')", "!name.includes('test')")], None, 'killed', None),
    ('W7-testkit-exclusion-broadened-to-any-depth', PURITY, [edit(PURITY, "name !== 'purity.testkit.ts'", "!name.endsWith('purity.testkit.ts')")], None, 'killed', None),
    # The owner-act drafter's purity test on the shared reader and list: the reviewer's D2 and D5 survive it (its own
    # guard stays a denylist, disclosed), while a forbidden token and a forbidden specifier each fail it.
    ('D0-drafter-unmutated', DRAFTER_TEST, [], [], 'pass', 'pass'),
    ('D2-drafter-globalThis-bracket-read', DRAFTER_TEST, 'reviewer', 'reviewer', 'survives', 'survives'),
    ('D5-drafter-WebSocket', DRAFTER_TEST, 'reviewer', 'reviewer', 'survives', 'survives'),
    ('DK1-drafter-clock-read', DRAFTER_TEST, 'drafter:export const now = (): number => Date.now();\n',
     'drafter:export const now = (): number => Date.now();\n', 'killed', 'killed'),
    ('DK2-drafter-re-export-from-node-fs', DRAFTER_TEST, "drafter:export { readFileSync } from 'node:fs';\n",
     "drafter:export { readFileSync } from 'node:fs';\n", 'killed', 'killed'),
    # N10: the S10 proof and its alias map.
    ('N0-no-egress-unmutated', NO_EGRESS, [], [], 'pass', 'pass'),
    ('M1-dot-entry-redirected-to-an-egressing-src-main', NO_EGRESS,
     [edit(PKG, EXPORTS, EXPORTS.replace('/index.', '/main.')),
      edit('packages/support/src/main.ts', None, "import { createSocket } from 'node:dgram';\nexport * from './index.js';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n")],
     [edit(PKG, EXPORTS, EXPORTS.replace('/index.', '/main.')),
      edit('packages/support/src/main.ts', None, "import { createSocket } from 'node:dgram';\nexport * from './index.js';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n")],
     'killed', 'survives'),
    ('M2-new-package-with-no-entry-imported-by-the-closure', NO_EGRESS, LEAK, LEAK, 'killed', 'survives'),
    ('M3-dot-entry-outside-dist', NO_EGRESS,
     [edit(PKG, EXPORTS, EXPORTS.replace('./dist/index.d.ts', './lib/index.d.ts').replace('./dist/index.js', './lib/index.js')),
      edit('packages/support/lib/index.js', None, 'export {};\n')],
     [edit(PKG, EXPORTS, EXPORTS.replace('./dist/index.d.ts', './lib/index.d.ts').replace('./dist/index.js', './lib/index.js')),
      edit('packages/support/lib/index.js', None, 'export {};\n')],
     'killed', 'survives'),
    # Attribution: the alias map loses @syzygy/support. Under the guard the bundle fails either way; at base it fails only
    # when dist/ is absent (otherwise it bundles packages/support/dist).
    ('M4-alias-for-support-dropped', NO_EGRESS,
     [edit(NO_EGRESS, HEAD_ALIAS, "      if (specifier !== '@syzygy/support') aliases[specifier] = path.join(SOURCE_ROOT, module);\n")],
     [edit(NO_EGRESS, BASE_ALIAS, '')], 'killed', 'dist-dependent'),
    # Attribution: without the guard plugin, only round 1's N4 row fails (it bundles the driver with an alias outside the
    # sources and expects the guard's refusal), so M2 itself passes every other row and the guard is what kills it. G0 is
    # the plugin removed alone.
    ('M5-guard-removed-plus-M2', NO_EGRESS,
     [edit(NO_EGRESS, '    plugins: [sourcesOnly(SOURCE_ROOT)],\n  });\n}\n', '    plugins: [],\n  });\n}\n'), *LEAK], None, 'killed', None),
    ('G0-guard-removed-alone', NO_EGRESS, 'reviewer-r1', None, 'killed', None),
]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def reviewer_r1_fragments(clone):
    """Every PR 545 round-1 reviewer row by id, from the committed copy of that review's records, with the copy's digest."""
    path = os.path.join(clone, ROUND1_PR545)
    if not os.path.exists(path):
        return {}, None
    return {rid: f['edits'] for rid, f in json.load(open(path))['fragments'].items()}, sha256_file(path)


def reviewer_fragments(clone):
    """Every reviewer row by id, from the committed round-2 records, with each record's digest."""
    by_id, records = {}, {}
    for name in ['purity-mutants.json', 'purity-mutants-2.json', 'egress-mutants-2.json', 'egress-mutants-3.json']:
        path = os.path.join(clone, ROUND2, name)
        records[f'{ROUND2}/{name}'] = sha256_file(path)
        data = json.load(open(path))
        for row in data['rows'] if isinstance(data, dict) else data:
            by_id[row['id']] = [{'path': e['path'], 'old': e['old'], 'new': e['new']} for e in row['edits']]
    return by_id, records


def apply(clone, edits):
    undo = []
    try:
        for e in edits:
            p = os.path.join(clone, e['path'])
            if 'link' in e:
                assert not os.path.lexists(p), e['path']
                os.symlink(e['link'], p)
                undo.append(('remove', p))
                continue
            if e['old'] is None:
                assert not os.path.lexists(p), e['path']
                made = []
                d = os.path.dirname(p)
                while not os.path.isdir(d):
                    made.append(d)
                    d = os.path.dirname(d)
                for m in reversed(made):
                    os.mkdir(m)
                    undo.append(('rmdir', m))
                open(p, 'w').write(e['new'])
                undo.append(('remove', p))
                continue
            text = open(p).read()
            assert text.count(e['old']) == 1, (e['path'], e['old'], text.count(e['old']))
            undo.append(('write', p, text))
            open(p, 'w').write(text.replace(e['old'], e['new']))
    except BaseException:
        restore(undo)
        raise
    return undo


def restore(undo):
    for step in reversed(undo):
        if step[0] == 'write':
            open(step[1], 'w').write(step[2])
        elif step[0] == 'remove':
            os.remove(step[1])
        else:
            os.rmdir(step[1])


def run(clone, test, tmpdir):
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    proc = subprocess.run(['npx', 'vitest', 'run', *([test] if isinstance(test, str) else test), '--reporter=json', f'--outputFile={out}'], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=900)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'error': 'no json output', 'stderrTail': proc.stderr[-800:]}
    d = json.load(open(out))
    files = d['testResults']
    return {
        'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'pending': d['numPendingTests'],
        'total': d['numTotalTests'], 'failedFiles': [f['name'].replace(clone + '/', '') for f in files if f['status'] == 'failed'],
        'fileMessages': [f['message'][:600] for f in files if f.get('message')],
        'failedTests': [{'name': t['fullName'], 'message': (t.get('failureMessages') or [''])[0][:400]}
                        for f in files for t in f['assertionResults'] if t['status'] == 'failed'],
    }


def dist_dirs(clone):
    return sorted(f'{parent}/{name}/dist' for parent in ['apps', 'packages'] for name in os.listdir(os.path.join(clone, parent))
                  if os.path.isdir(os.path.join(clone, parent, name, 'dist')))


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = dist_dirs(clone)
    assert (dist == 'absent' and present == []) or (dist == 'present' and len(present) == 12), (dist, present)
    side = 'head' if os.path.exists(os.path.join(clone, TESTKIT)) else 'base'
    fragments, records = reviewer_fragments(clone)
    fragments_r1, record_r1 = reviewer_r1_fragments(clone)
    drafter_first = open(os.path.join(clone, DRAFTER)).read().split('\n')[0] + '\n'
    rows = []
    for rid, test, head_edits, base_edits, head_expect, base_expect in ROWS:
        edits, expected = (head_edits, head_expect) if side == 'head' else (base_edits, base_expect)
        if edits is None:
            continue
        if edits == 'reviewer':
            edits = fragments[rid]
        elif edits == 'reviewer-r1':
            edits = fragments_r1[rid]
        elif isinstance(edits, str):
            edits = [edit(DRAFTER, drafter_first, drafter_first + edits.removeprefix('drafter:'))]
        if expected == 'dist-dependent':
            expected = 'killed' if dist == 'absent' else 'survives'
        undo = apply(clone, edits)
        try:
            res = run(clone, test, tmpdir)
        finally:
            restore(undo)
        observed = 'error' if 'error' in res else ('survives' if res['exit'] == 0 else
                                                   ('killed' if res['failed'] > 0 or res['failedFiles'] else 'error'))
        if expected == 'pass' and observed == 'survives':
            observed = 'pass'
        rows.append({'id': rid, 'test': test, 'edits': edits, 'expected': expected, 'observed': observed, **res})
        print(rid, 'expected', expected, 'observed', observed, res.get('passed'), res.get('failed'),
              [t['name'] for t in res.get('failedTests', [])], flush=True)
    status = git('status', '--porcelain')
    leftovers = [p for p in ['packages/leak', 'node_modules/@syzygy/leak', 'packages/support/lib', 'packages/support/src/io']
                 if os.path.lexists(os.path.join(clone, p))]
    summary = {'rows': len(rows), 'asExpected': sum(r['observed'] == r['expected'] for r in rows),
               'unexpected': [r['id'] for r in rows if r['observed'] != r['expected']]}
    json.dump({'commit': commit, 'side': side, 'dist': dist, 'distDirs': present, 'reviewerRecords': records, 'reviewerR1Record': record_r1,
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'leftovers': leftovers, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status), 'leftovers', leftovers)


if __name__ == '__main__':
    main()
