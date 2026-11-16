"""R-GP-IMPL-LAUNCH-FORM-CTIME-1: check the syzygy-bpyt.8.30 rule-6 record and probes by script against the git objects and the PR body.
Usage: python3 -I check_record.py <clone> <pr-body.md>"""
import hashlib, json, re, subprocess, sys
from pathlib import Path

ROOT, BODY = Path(sys.argv[1]), Path(sys.argv[2]).read_text()
BASE, FIX, HEAD = 'ce322e1a65b784c6304d51b05fb347351912a926', 'ab59b666dbf1e3936a004c7a4237fb0c5ff3c6e8', '3fb7380945bd8ac0374e38792a814aed070bd8c6'
TEST, READER = 'packages/polaris-dossier/src/launched.test.ts', 'packages/polaris-dossier/src/launched.ts'
REC = 'docs/evidence/launch-form-snapshot-ctime-mutants-2026-10-23.json'
DIR = 'docs/evidence/launch-form-snapshot-ctime-2026-10-23'
OLD = 'docs/evidence/launch-form-snapshot-oracle-mutants-2026-10-22.json'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
sha = lambda b: hashlib.sha256(b).hexdigest()
show = lambda c, p: subprocess.run(['git', '-C', str(ROOT), 'show', f'{c}:{p}'], capture_output=True, check=True).stdout
ok = []
def check(name, cond, detail=''):
    ok.append(bool(cond)); print(('PASS' if cond else 'FAIL'), name, detail)

rec_bytes = show(HEAD, REC); rec = json.loads(rec_bytes)
check('record sha256 equals the PR body digest', sha(rec_bytes) in BODY, sha(rec_bytes))
for p in ('probe-tmpfs.json', 'probe-ext4.json'):
    b = show(HEAD, f'{DIR}/{p}'); check(f'{p} sha256 in PR body', sha(b) in BODY, sha(b))
check('record base is the full base commit', rec['base'] == BASE, rec['base'])
check('record commit is the full fix commit', rec['commit'] == FIX, rec['commit'])
check('record names its subject', rec['subject'] == [TEST], rec['subject'])
t_base, t_fix, t_head = sha(show(BASE, TEST)), sha(show(FIX, TEST)), sha(show(HEAD, TEST))
check('testSha256.base == launched.test.ts at base', rec['testSha256']['base'] == t_base, t_base)
check('testSha256.fix == launched.test.ts at ab59b666', rec['testSha256']['fix'] == t_fix, t_fix)
check('launched.test.ts at ab59b666 == at head 3fb73809', t_fix == t_head, t_head)
r = {c: sha(show(c, READER)) for c in (BASE, FIX, HEAD)}
check('launched.ts identical at base, fix and head, and == readerSha256', len(set(r.values())) == 1 and rec['readerSha256'] in r.values(), r[BASE])
check('launched.ts digest quoted in PR body', r[BASE] in BODY)
changed = subprocess.run(['git', '-C', str(ROOT), 'diff', '--name-only', FIX, HEAD], capture_output=True, text=True, check=True).stdout.split()
check('ab59b666..head touches only docs/evidence', all(p.startswith('docs/evidence/') for p in changed), changed)
check('harnessSource == committed mutants.py', rec['harnessSource'].encode() == show(HEAD, f'{DIR}/mutants.py'))
check('tracked tree clean after', rec['trackedTreeCleanAfter'] is True)
for side in ('base', 'fix'):
    u = rec['unmutated'][side]
    check(f'unmutated {side} 43/43, exit 0', u['exitCode'] == 0 and u['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0}, u['counts'])
rep = rec['unmutatedFixRepeats']
check('20 repeats, each 43/43 exit 0', rep['runs'] == 20 == len(rep['results']) and all(x['exitCode'] == 0 and x['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0} for x in rep['results']),
      f"runs={rep['runs']} allPassed={rep['allPassed']}")
side_src = {'base': {READER: show(BASE, READER).decode(), TEST: show(BASE, TEST).decode()}, 'fix': {READER: show(FIX, READER).decode(), TEST: show(FIX, TEST).decode()}}
outcomes = {}
for m in rec['mutants']:
    applies = all(side_src[m['tests']][e['file']].count(e['old']) == 1 and e['new'] and e['new'] != e['old'] for e in m['edits'])
    consistent = m['outcome'] == ('killed' if m['blocked'] or (m['exitCode'] != 0 and m['failedTests']) else 'survived') and len(m['failedRows']) == len({t['test'] for t in m['failedTests'] if t['test'].startswith(ROW)})
    check(f"{m['id']} / {m['tests']}: old/new stored, old occurs once, outcome consistent", applies and consistent and m['restored'], f"{m['outcome']} rows={len(m['failedRows'])} counts={m['counts']}")
    outcomes[(m['id'], m['tests'])] = (m['outcome'], m['failedRows'])
# The PR body table, parsed: | Mutant | Base | Fix |
table = {}
for line in BODY.splitlines():
    cells = [c.strip() for c in line.strip().strip('|').split('|')] if line.startswith('| ') else []
    if len(cells) == 3 and not cells[0].startswith('Mutant') and not set(cells[0]) <= set('-'):
        for name in re.sub(r'\*\*|\(.*?\)', '', cells[0]).split(','):
            table[name.strip()] = (cells[1], cells[2])
def parse(cell):
    word = 'survived' if 'survived' in cell else 'killed' if 'killed' in cell else None
    n = re.search(r'(\d+)(?: of 17)? rows?', cell.replace('**', ''))
    return word, (int(n.group(1)) if n else (0 if word == 'survived' else None))
for name, (b, f) in table.items():
    if name == 'unmutated': continue
    for side, cell in (('base', b), ('fix', f)):
        word, n = parse(cell)
        got = outcomes.get((name, side))
        check(f'PR table {name} / {side}: "{cell}"', got is not None and got[0] == word and len(got[1]) == n, got and (got[0], len(got[1])))
check('every record mutant appears in the PR table', {m for m, _ in outcomes} == set(table) - {'unmutated'}, sorted({m for m, _ in outcomes} ^ (set(table) - {'unmutated'})))
f = outcomes[('R-chmod-cycle-rewrite', 'fix')][1]
check('R-chmod-cycle-rewrite fix kills exactly the mode-000 row', f == ['a file its reader may not read'], f)
fails = [t['firstErrorLine'] for m in rec['mutants'] if m['id'] == 'R-chmod-cycle-rewrite' and m['tests'] == 'fix' for t in m['failedTests']]
print('   R-chmod-cycle-rewrite fix first error lines:', fails)
d4b, d4f = outcomes[('D4-truncate', 'base')][1], outcomes[('D4-truncate', 'fix')][1]
check('D4-truncate fix adds exactly "an empty file"', sorted(set(d4f) - set(d4b)) == ['an empty file'] and set(d4b) <= set(d4f), sorted(set(d4f) - set(d4b)))
# AC2: against the #516 record's fix side (this base)
old = json.loads(show(HEAD, OLD))
check('#516 record fix test == this base test', old.get('testSha256', {}).get('fix') == t_base, old.get('testSha256'))
for m in old['mutants']:
    if m['tests'] != 'fix': continue
    mine = outcomes.get((m['id'], 'fix'))
    if mine is None: print('   (#516 mutant not re-run here:', m['id'], ')'); continue
    stronger = set(m.get('failedRows', [])) <= set(mine[1]) and (m['outcome'] != 'killed' or mine[0] == 'killed')
    print(f"   #516 fix {m['id']}: {m['outcome']} {len(m.get('failedRows', []))} -> this fix {mine[0]} {len(mine[1])}", 'unchanged-or-stronger' if stronger else 'WEAKER')
    ok.append(stronger)
print(f'{sum(ok)} of {len(ok)} checks pass')
