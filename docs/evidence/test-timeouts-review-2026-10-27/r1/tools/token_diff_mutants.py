"""token_diff_mutants.py: rule-6 mutants of token_diff.py's input (R-GP-IMPL-TEST-TIMEOUTS-1).
Usage: python3 token_diff_mutants.py <tools-dir> <base-tokens> <head-tokens> <base-census> <head-census> <scratch-dir>
Each mutant rewrites the head token stream one way and expects token_diff.py to report a violation or a
seen/expected mismatch. Prints KILLED/SURVIVED per mutant.
"""
import json, os, subprocess, sys

tools, bt, ht, bc, hc, scratch = sys.argv[1:]
rows = [json.loads(l) for l in open(ht)]

def find(path, pred):
    r = next(r for r in rows if r['path'] == path)
    for i, t in enumerate(r['tokens']):
        if pred(i, t, r['tokens']): return r, i
    raise SystemExit(f'no token in {path}')

def m_title(rs):  # a test title changes
    r, i = find('apps/three-surface-poc/src/cdp-browser.test.ts', lambda i, t, ts: t[0] == 'StringLiteral' and 'Chromium form' in t[1])
    r['tokens'][i][1] = r['tokens'][i][1].replace('Chromium', 'Chromiun')

def m_assert(rs):  # an assertion matcher changes
    r, i = find('apps/three-surface-poc/src/fixture-directories.test.ts', lambda i, t, ts: t[1] == 'toEqual')
    r['tokens'][i][1] = 'toStrictEqual'

def m_extra_removal(rs):  # a kept timeout is removed as well
    r, i = find('apps/three-surface-poc/src/tuple-encoding.test.ts', lambda i, t, ts: t[1] == '60_000' and ts[i - 1][1] == ',')
    del r['tokens'][i - 1:i + 1]

def m_resize(rs):  # a kept timeout is resized
    r, i = find('apps/three-surface-poc/src/proposal-disclosure.test.ts', lambda i, t, ts: t[1] == '45_000')
    r['tokens'][i][1] = '40_000'

def m_const_kept(rs):  # the deleted constant is still used at the head
    r, i = find('apps/three-surface-poc/src/polaris-generation/durable-lifecycle-generate.test.ts', lambda i, t, ts: t[1] == ')' and ts[i - 1][1] == '}')
    r['tokens'][i:i] = [[',', ',', 0], ['Identifier', 'T', 0]]

def m_added(rs):  # a new timeout appears
    r, i = find('apps/three-surface-poc/src/orrery.browser.test.ts', lambda i, t, ts: t[1] == ')' and ts[i - 1][1] == '}')
    r['tokens'][i:i] = [[',', ',', 0], ['NumericLiteral', '60_000', 0]]

for name, fn in [('title', m_title), ('assertion', m_assert), ('extra-removal', m_extra_removal), ('resize', m_resize),
                 ('const-still-used', m_const_kept), ('added-timeout', m_added)]:
    rows = [json.loads(l) for l in open(ht)]
    fn(rows)
    out = os.path.join(scratch, f'mut-{name}.jsonl')
    with open(out, 'w') as f:
        for r in rows: f.write(json.dumps(r) + '\n')
    res = subprocess.run(['python3', os.path.join(tools, 'token_diff.py'), bt, out, bc, hc], capture_output=True, text=True).stdout
    killed = 'violations 0' not in res or 'seen != expected: []' not in res
    print(name, 'KILLED' if killed else 'SURVIVED', '|', [l for l in res.splitlines() if l.startswith(('files', 'VIOLATION', 'seen'))][:3])
    os.remove(out)
