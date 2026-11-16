#!/usr/bin/env python3
"""Script check of the stack-4 evidence record against the git objects (R-GP-IMPL-OBJECT-ISO-HELPERS-1).

Usage: python3 -I record-check.py <repo> <reviewed commit> <evidence dir relative to repo>
Checks: commits exist and chain; base is the merge base; tool and output digests; each mutant row's `old` at its recorded commit (in
file, on its line); each outcome against its exit code and failed count; controls; survivors listed in the record equal the
survivors in mutants-C.json; summary counts; changed-file list against git.
"""
import hashlib, json, subprocess, sys

repo, reviewed, edir = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout
show = lambda c, p: git('show', f'{c}:{p}').decode()
problems, notes = [], []
rec = json.loads(show(reviewed, f'{edir}/dc4-object-and-iso-helpers-2026-10-28.json'))

# commits
for c in [rec['baseCommit'], rec['codeCommit'], *rec['codeCommits']]:
    if git('cat-file', '-t', c).decode().strip() != 'commit':
        problems.append(f'not a commit: {c}')
chain = git('rev-list', '--reverse', f"{rec['baseCommit']}..{reviewed}").decode().split()
if chain[:3] != rec['codeCommits']:
    problems.append(f'codeCommits {rec["codeCommits"]} are not the first three commits after base: {chain}')
if rec['codeCommit'] != rec['codeCommits'][-1]:
    problems.append('codeCommit is not the last code commit')
mb = git('merge-base', reviewed, 'gh/main').decode().strip()
notes.append(f'merge base of reviewed commit with gh/main: {mb}; record base {rec["baseCommit"]}; equal {mb == rec["baseCommit"]}')

# digests at the reviewed commit
for sect in ('toolDigests', 'outputDigests'):
    for f, d in rec[sect].items():
        if hashlib.sha256(git('show', f'{reviewed}:{edir}/{f}')).hexdigest() != d:
            problems.append(f'{sect} mismatch {f}')
notes.append(f"digests checked: {len(rec['toolDigests'])} tools + {len(rec['outputDigests'])} outputs")

# changed files
changed = sorted(git('diff', '--name-only', rec['baseCommit'], rec['codeCommit']).decode().split())
rf = rec['changedFiles']
rf_paths = sorted(x if isinstance(x, str) else x.get('path') for x in rf)
if rf_paths != changed:
    problems.append(f'changedFiles differ from git diff base..code: record {len(rf_paths)}, git {len(changed)}')
notes.append(f'changedFiles {len(rf_paths)} vs git diff base..code {len(changed)}')

# mutants
tally = {}
for g in 'SIC':
    d = json.loads(show(reviewed, f'{edir}/mutants-{g}.json'))
    commit = d['commit']
    rows = d['mutants']
    t = tally.setdefault(g, {'rows': 0, 'killed': 0, 'oldOnceInFile': 0, 'oldOnceOnLine': 0, 'outcomeConsistent': 0, 'commit': commit,
                             'occurrenceIsCallIndex': 0})
    calls_by_file = {}
    for m in rows:
        t['rows'] += 1
        text = show(commit, m['file'])
        line = text.split('\n')[m['line'] - 1]
        if text.count(m['old']) == 1: t['oldOnceInFile'] += 1
        if line.count(m['old']) == 1: t['oldOnceOnLine'] += 1
        else: problems.append(f"{m['id']}: old occurs {line.count(m['old'])} times on line {m['line']}")
        k = m['exit'] != 0 and m['failed'] > 0
        kr = bool(m.get('escalated')) and m['escalated']['exit'] != 0 and m['escalated']['failed'] > 0
        consistent = (m['killed'] == k) and (m.get('killedByRelated', False) == kr) and (m['failed'] == 0 or len(m['failedTests']) > 0)
        if consistent: t['outcomeConsistent'] += 1
        else: problems.append(f"{m['id']}: outcome inconsistent with exit/failed")
        if m['killed'] or m.get('killedByRelated'): t['killed'] += 1
        if g == 'C':
            if m['file'] not in calls_by_file:
                import re
                calls_by_file[m['file']] = [mm.start() for mm in re.finditer(r'(?<![\w$.])isRecord\(', text)]
            starts = calls_by_file[m['file']]
            off = sum(len(x) + 1 for x in text.split('\n')[:m['line'] - 1]) + line.index(m['old'])
            if starts.index(off) == m['occurrence']: t['occurrenceIsCallIndex'] += 1
    for c in d['controls']:
        if not (c['passed_clean'] == (c['exit'] == 0 and c['failed'] == 0) and c['passed_clean']):
            problems.append(f"control {c['id']} not clean")
    t['controls'] = len(d['controls'])

summ = rec['mutants']
if (summ['support']['mutants'], summ['support']['killed']) != (tally['S']['rows'], tally['S']['killed']): problems.append('support summary')
if (summ['iso']['mutants'], summ['iso']['killed']) != (tally['I']['rows'], tally['I']['killed']): problems.append('iso summary')
if (summ['callSites']['mutants'], summ['callSites']['killed']) != (tally['C']['rows'], tally['C']['killed']): problems.append('call-site summary')
csurv = sorted(m['id'] for m in json.loads(show(reviewed, f'{edir}/mutants-C.json'))['mutants'] if not (m['killed'] or m.get('killedByRelated')))
if csurv != sorted(s['id'] for s in summ['callSites']['survivors']): problems.append('survivor list differs from mutants-C.json')
for g in 'SI':
    if tally[g]['commit'] != summ['support' if g == 'S' else 'iso']['commit']: problems.append(f'{g} commit differs')
if tally['C']['commit'] != summ['callSites']['commit']: problems.append('C commit differs')
# S and I bytes unchanged from their run commit to the call-site commit
same = git('diff', '--stat', summ['support']['commit'], summ['callSites']['commit'], '--', 'packages/support/src/is-record.ts',
           'packages/support/src/is-record.test.ts', 'packages/polaris-dossier/src/iso-of.ts', 'packages/polaris-dossier/src/iso-of.test.ts').decode().strip()
if (same == '') != summ['unchangedBetweenSupportRunAndCallSiteRun']: problems.append('unchangedBetweenSupportRunAndCallSiteRun is false')

print(json.dumps({'tally': tally, 'notes': notes, 'problems': problems}, indent=1))
sys.exit(1 if problems else 0)
