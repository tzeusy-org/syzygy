"""Rule 6 per predicate for docs/evidence/syzygy-bpyt-39/record.py: neutralize one `problems.append(` site at a time in a scratch
copy, and run the copy's --check and --selftest over the tree. A site whose neutralizing leaves --selftest at every entry killed has
no selftest entry that it alone kills; one that leaves an entry SURVIVED is exercised. Then a few expression-level mutants.
Usage: python3 -I site_drop_b39.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, re, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
REC = 'docs/evidence/syzygy-bpyt-39/record.py'
source = open(os.path.join(tree, REC)).read()
lines = source.splitlines(keepends=True)
sites = [i for i, l in enumerate(lines) if 'problems.append(' in l and not l.lstrip().startswith('#')]
EXPR = [
    ('E1', 'observed(): a lock entry that is not a link is still read as a link', " or not all(e.get('link') for e in entries.values())", ''),
    ('E2', 'observed(): the install exit is not read', "r.get('installExit') != 0 or ", ''),
    ('E3', 'the trace digest check dropped', " or t['probeSha256'] != sha(sha_of)", ''),
    ('E4', 'the retired-sentence check dropped', " or any(t in kit for t in TEXT['absent'])", ''),
    ('E5', 'the hedge must appear at least once, not exactly once', 'kit.count(t) != 1', 'kit.count(t) < 1'),
    ('E6', 'the subject may grow', 'if changed != SUBJECT:', 'if not set(SUBJECT) <= set(changed):'),
    ('E7', 'the R-case load check reads w instead of app', ".get('app', {}).get('path') != 'w/package.json'", ".get('w', {}).get('path') != 'w/package.json'"),
]


def run(text, flag):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    ls = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': ls[-1] if ls else r.stderr[-300:], 'survived': [l.split(' | ')[1] for l in ls if l.startswith('SURVIVED | ')]}


os.makedirs(scratch, exist_ok=True)
rows = []
for i in sites:
    old = lines[i]
    new = old.replace('problems.append(', '(lambda *a: None)(', 1)
    text = ''.join(lines[:i] + [new] + lines[i + 1:])
    row = {'id': f'P{len(rows) + 1}', 'line': i + 1, 'old': old, 'new': new, 'check': run(text, '--check'), 'selftest': run(text, '--selftest')}
    rows.append(row)
    print(row['id'], f"line {i + 1}", '| check', row['check']['exit'], '| selftest', row['selftest']['exit'], row['selftest']['last'],
          '| survived', row['selftest']['survived'], '|', old.strip()[:90], flush=True)
for mid, what, old, new in EXPR:
    assert source.count(old) == 1, mid
    text = source.replace(old, new)
    row = {'id': mid, 'what': what, 'old': old, 'new': new, 'check': run(text, '--check'), 'selftest': run(text, '--selftest')}
    rows.append(row)
    print(mid, what, '| check', row['check']['exit'], '| selftest', row['selftest']['exit'], row['selftest']['last'], '| survived',
          row['selftest']['survived'], flush=True)
os.remove(os.path.join(scratch, 'record.py'))
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
json.dump({'tree': commit, 'record': REC, 'recordSha256': hashlib.sha256(source.encode()).hexdigest(), 'sites': len(sites), 'rows': rows},
          open(out, 'w'), indent=1)
