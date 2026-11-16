"""Check the reviewer's proposed repair of 8.39 record.py's `@since` hook: move the hook before the evidence-directory filter, and add
one entry that injects another bead's evidence path. With the repair, the unmutated selftest must kill every entry, and the filter
mutants H3 (exclusion widened to docs/) and H4 (every path but the testkit excluded), the hook bypass H1 and the path-test drop S5
must each leave a path entry SURVIVED.
Usage: python3 -I hook_fix_839.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
REC = 'docs/evidence/syzygy-bpyt-8-39/record.py'
source = open(os.path.join(tree, REC)).read()
SINCE = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
FIXED = "    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]\n"
ENTRY = "    'a non-evidence path changed since the suite ran': {'@since': lambda names: [*names, 'README.md']},\n"
ADDED = ENTRY + "    \"another bead's evidence path changed since the suite ran\": {'@since': lambda names: [*names, 'docs/evidence/syzygy-bpyt-8-36/x.json']},\n"
assert source.count(SINCE) == 1 and source.count(ENTRY) == 1
fixed = source.replace(SINCE, FIXED).replace(ENTRY, ADDED)
B = ['a non-evidence path changed since the suite ran', "another bead's evidence path changed since the suite ran"]
MUTANTS = [
    ('F0', None, None, []),
    ('F-H1', FIXED, FIXED.replace("hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split())", "git('diff', '--name-only', REPAIR1, HEAD).split()"), B),
    ('F-H3', FIXED, FIXED.replace("f'{HERE_REL}/'", "'docs/'"), [B[1]]),
    ('F-H4', FIXED, FIXED.replace("if not p.startswith(f'{HERE_REL}/')", 'if p == KIT'), B),
    ('F-S5', 'if since != [KIT] or not late', 'if not late', B),
]


def run(text, flag):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    ls = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': ls[-1] if ls else r.stderr[-300:], 'survived': [l.split(' | ')[1] for l in ls if l.startswith('SURVIVED | ')]}


os.makedirs(scratch, exist_ok=True)
rows = []
for mid, old, new, expected in MUTANTS:
    text = fixed if old is None else (fixed.replace(old, new) if fixed.count(old) == 1 else None)
    assert text is not None and (old is None or old != new), mid
    r = {'id': mid, 'old': old, 'new': new, 'check': run(text, '--check'), 'selftest': run(text, '--selftest'), 'expected': expected}
    r['asExpected'] = r['selftest']['survived'] == expected
    rows.append(r)
    print(mid, '| check', r['check']['exit'], r['check']['last'], '| selftest', r['selftest']['exit'], r['selftest']['last'], '| survived',
          r['selftest']['survived'], 'as expected' if r['asExpected'] else 'UNEXPECTED', flush=True)
os.remove(os.path.join(scratch, 'record.py'))
json.dump({'record': REC, 'recordSha256': hashlib.sha256(source.encode()).hexdigest(), 'fix': {'old': SINCE, 'new': FIXED, 'entryAdded': ADDED[len(ENTRY):]},
           'rows': rows}, open(out, 'w'), indent=1)
