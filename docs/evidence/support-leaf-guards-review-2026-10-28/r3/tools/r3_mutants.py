#!/usr/bin/env python3
"""Round-3 reviewer mutants for PR 545 (syzygy-bpyt.6.14), run in a clean clone, written independently of the lane's tools.

Usage: python3 -I r3_mutants.py <clone with node_modules> <fragments-r3.json> <r2_mutants.py> <out.json> <tmpdir> <absent|present> <set>

W5, W6 and W7's edits are read from fragments-r3.json (the lane's committed rows, which fragments_r3.py found equal to round 2's);
V7, V8, V9, U4 and U5 are read by AST from round 2's r2_mutants.py; the rest are this round's own, written below with their
expected outcome and failing set before any run. Each edit {path, old, new} replaces `old`, which must occur exactly once
(old None creates the file). A row is `killed` when vitest exits non-zero with a failed test or file, `survives` when it exits 0.
Every edit is undone and `git status --porcelain` is recorded after each row.
"""
import ast, json, os, subprocess, sys, time

clone, frag_path, r2_path, out_path, tmpdir, dist, which = sys.argv[1:8]
PURITY = 'packages/support/src/support-purity.test.ts'
INDEX = 'packages/support/src/index.ts'
N1_ROW = '@syzygy/support stays a pure leaf lists a module at any depth and with any extension, and skips only the tests and the testkit'
INDEX_LAST = "export { decodeUtf8 } from './decode-utf8.js';\n"


def e(path, old, new):
    return {'path': path, 'old': old, 'new': new}


def add_index(text):
    return e(INDEX, INDEX_LAST, INDEX_LAST + text)


frag = json.load(open(frag_path))['rows']
W = {rid.split('-')[0]: (rid, row['edits']) for rid, row in frag.items()}


def r2_rows(ids):
    """Read V/U rows' edits from round 2's tool by AST: add_index(...)/add_sha(...) calls, with its own constants."""
    tree = ast.parse(open(r2_path, encoding='utf8').read())
    env = {}
    for node in tree.body:
        if isinstance(node, ast.Assign) and len(node.targets) == 1 and isinstance(node.targets[0], ast.Name):
            try:
                env[node.targets[0].id] = ast.literal_eval(node.value)
            except Exception:
                pass
    paths = {'add_index': ('packages/support/src/index.ts', env['INDEX_LAST']), 'add_sha': ('packages/support/src/sha256.ts', env['SHA_LAST'])}
    found = {}
    for node in ast.walk(tree):
        if isinstance(node, ast.Tuple) and node.elts and isinstance(node.elts[0], ast.Constant) and isinstance(node.elts[0].value, str):
            rid = node.elts[0].value
            if rid.split('-')[0] not in ids:
                continue
            edits = []
            for sub in ast.walk(node.elts[2]):
                if isinstance(sub, ast.Call) and isinstance(sub.func, ast.Name) and sub.func.id in paths:
                    path, last = paths[sub.func.id]
                    edits.append(e(path, last, last + ast.literal_eval(sub.args[0])))
            found[rid.split('-')[0]] = (rid, edits, ast.literal_eval(node.elts[3]))
    return found


R2 = r2_rows({'V7', 'V8', 'V9', 'U4', 'U5'})
W6_EDITS = W['W6'][1]
ROWS = {
    'core': [
        ('C0-purity-unmutated', [], 'pass', None),
        *[(W[k][0], W[k][1], 'killed', [N1_ROW]) for k in ['W5', 'W6', 'W7']],
    ],
    'extra': [
        # W6 plus an ordinary module that exports node:crypto, re-exported by index.ts: round 2's W6b, now at the repaired head.
        ('W6b-W6-plus-latest-ts-exporting-node-crypto', [*W6_EDITS, e('packages/support/src/latest.ts', None, "export * from 'node:crypto';\n"),
                                                          add_index("export * from './latest.js';\n")], 'killed', [N1_ROW]),
        # Two further one-line weakenings of the exclusions, each expected killed by the fixture row alone.
        ('W8-test-exclusion-drops-the-dot', [e(PURITY, "!name.endsWith('.test.ts')", "!name.endsWith('test.ts')")], 'killed', [N1_ROW]),
        ('W9-testkit-exclusion-any-testkit-substring', [e(PURITY, "name !== 'purity.testkit.ts'", "!name.includes('testkit')")], 'killed', [N1_ROW]),
        # The body's residual lines, re-checked at this head: each expected to pass every row.
        *[(R2[k][0], R2[k][1], 'survives', None) for k in ['V7', 'V9', 'V8', 'U4', 'U5']],
        # The N3 disclosure's [Inferred] forms: each a write to an allowed global the visitor does not read.
        ('U6-for-of-target', [add_index('for (Object.freeze of [(value) => value]);\n')], 'survives', None),
        ('U7-for-in-target', [add_index('for (Object.values in Object);\n')], 'survives', None),
        ('U8-postfix-increment', [add_index('Object.isFrozen++;\n')], 'survives', None),
        ('U9-postfix-decrement', [add_index('Object.values--;\n')], 'survives', None),
        ('U10-delete', [add_index('delete Object.freeze;\n')], 'survives', None),
    ],
}
rows = ROWS['core'] + (ROWS['extra'] if which == 'all' else [])


def git(*args):
    return subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout


def dist_dirs():
    return sorted(f'{p}/{n}/dist' for p in ['apps', 'packages'] for n in os.listdir(os.path.join(clone, p))
                  if os.path.isdir(os.path.join(clone, p, n, 'dist')))


def apply(edits):
    undo = []
    for ed in edits:
        path = os.path.join(clone, ed['path'])
        if ed['old'] is None:
            assert not os.path.exists(path), path
            open(path, 'w', encoding='utf8').write(ed['new'])
            undo.append(('rm', path, None))
        else:
            text = open(path, encoding='utf8').read()
            assert text.count(ed['old']) == 1, (ed['path'], text.count(ed['old']))
            undo.append(('restore', path, text))
            open(path, 'w', encoding='utf8').write(text.replace(ed['old'], ed['new']))
    return undo


def restore(undo):
    for kind, path, text in reversed(undo):
        if kind == 'rm':
            os.remove(path)
        else:
            open(path, 'w', encoding='utf8').write(text)


def run():
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    t0 = time.time()
    proc = subprocess.run(['npx', 'vitest', 'run', PURITY, '--reporter=json', f'--outputFile={out}'], cwd=clone,
                          env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=900)
    wall = round(time.time() - t0, 1)
    if not os.path.exists(out):
        return {'exit': proc.returncode, 'error': 'no json output', 'stderrTail': proc.stderr[-800:], 'wall': wall}
    d = json.load(open(out))
    files = d['testResults']
    return {'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'total': d['numTotalTests'],
            'failedFileMessages': [f['message'][:400] for f in files if f.get('message')],
            'failing': sorted(t['fullName'] for f in files for t in f['assertionResults'] if t['status'] == 'failed'),
            'messages': [(t.get('failureMessages') or [''])[0][:300] for f in files for t in f['assertionResults'] if t['status'] == 'failed'],
            'wall': wall}


os.makedirs(tmpdir, exist_ok=True)
assert git('status', '--porcelain') == '', 'the clone must start clean'
present = dist_dirs()
assert (len(present) == 12) if dist == 'present' else (present == []), present
results = []
for rid, edits, expected, failing in rows:
    load = open('/proc/loadavg').read().split()[0]
    undo = apply(edits)
    try:
        r = run()
    finally:
        restore(undo)
    status = git('status', '--porcelain')
    observed = 'error' if 'error' in r else ('pass' if r['exit'] == 0 and r['failed'] == 0 else
                                             ('killed' if r['exit'] != 0 and (r['failed'] or r['failedFileMessages']) else 'survives'))
    if expected == 'survives' and observed == 'pass':
        observed = 'survives'
    ok = observed == expected and (failing is None or r.get('failing') == sorted(failing)) and status == ''
    results.append({'id': rid, 'edits': edits, 'expected': expected, 'expectedFailing': failing, 'observed': observed, 'asExpected': ok,
                    'load1': load, 'statusAfter': status, **r})
    print(rid, 'expected', expected, 'observed', observed, r.get('passed'), r.get('failed'), r.get('failing'), 'ok' if ok else 'UNEXPECTED',
          'load1', load, 'wall', r.get('wall'), flush=True)
summary = {'rows': len(results), 'asExpected': sum(r['asExpected'] for r in results),
           'unexpected': [r['id'] for r in results if not r['asExpected']]}
record = {'commit': git('rev-parse', 'HEAD').strip(), 'dist': dist, 'distDirs': present, 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
          'summary': summary, 'statusAfter': git('status', '--porcelain'), 'rows': results}
json.dump(record, open(out_path, 'w'), indent=1)
print('summary', summary, 'status after', repr(record['statusAfter']))
