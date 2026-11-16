"""Reviewer mutants of docs/evidence/syzygy-bpyt-8-39/record.py's new `@since` hook and the REPAIR1-to-HEAD path test (rule 6).

Each mutant is one textual edit (its `old` must occur exactly once) to a scratch copy of record.py, optionally with extra SELFTEST
entries appended to the table; the copy runs --check and --selftest over the tree given. The tree is never written.
Usage: python3 -I hook_mutants_839.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, re, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
REC = os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-39/record.py')
source = open(REC).read()
SINCE = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
TABLE_END = "    'a product module importing the testkit': {'@importers': lambda names: sorted([*names, 'apps/syzygy/src/main.ts'])},\n}\n"
MUTANTS = [
    # (id, what, old, new, extra SELFTEST lines)
    ('H0', 'unmutated, with three extra entries: identity, an emptied list, an evidence path added through the hook', None, None,
     ["    'R: hook identity (negative control)': {'@since': lambda names: names},\n",
      "    'R: hook empties the list': {'@since': lambda names: []},\n",
      "    'R: an evidence path added after the filter': {'@since': lambda names: [*names, 'docs/evidence/syzygy-bpyt-8-39/x.json']},\n"]),
    ('H1', 'the hook bypassed', SINCE, SINCE.replace("hooked('since', ", '').replace("/')])\n", "/')]\n"), []),
    ('H2', 'the hook under another key', SINCE, SINCE.replace("hooked('since', ", "hooked('sinc', "), []),
    ('H3', 'the evidence-directory exclusion widened to all of docs/', SINCE, SINCE.replace("f'{HERE_REL}/'", "'docs/'"), []),
    ('H4', 'the exclusion widened to every path but the testkit', SINCE, SINCE.replace("if not p.startswith(f'{HERE_REL}/')", 'if p == KIT'), []),
    ('H5', 'the exclusion dropped', SINCE, SINCE.replace(" if not p.startswith(f'{HERE_REL}/')", ''), []),
    ('H6', 'the path test weakened to membership', 'if since != [KIT] or not late', 'if KIT not in since or not late', []),
]


def run(text, flag):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    lines = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': lines[-1] if lines else r.stderr[-300:],
            'survived': [l.split(' | ')[1] for l in lines if l.startswith('SURVIVED | ')],
            'extra': [l for l in lines if ' | R: ' in l]}


os.makedirs(scratch, exist_ok=True)
rows = []
for mid, what, old, new, extra in MUTANTS:
    text = source
    if old is not None:
        assert text.count(old) == 1 and old != new, mid
        text = text.replace(old, new)
    if extra:
        assert text.count(TABLE_END) == 1, mid
        text = text.replace(TABLE_END, TABLE_END[:-2] + ''.join(extra) + '}\n')
    row = {'id': mid, 'what': what, 'old': old, 'new': new, 'extraEntries': extra, 'check': run(text, '--check'), 'selftest': run(text, '--selftest')}
    rows.append(row)
    print(mid, '| check', row['check']['exit'], row['check']['last'], '| selftest', row['selftest']['exit'], row['selftest']['last'],
          '| survived', row['selftest']['survived'], flush=True)
    for line in row['selftest']['extra']:
        print('   ', line)
os.remove(os.path.join(scratch, 'record.py'))
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
json.dump({'tree': commit, 'record': 'docs/evidence/syzygy-bpyt-8-39/record.py', 'recordSha256': hashlib.sha256(source.encode()).hexdigest(),
           'rows': rows}, open(out, 'w'), indent=1)
