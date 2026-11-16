"""rev-531: independent check of docs/evidence/syzygy-bpyt-8-37/ against the git objects (rules 6 and 11).

Usage: python3 -I check_record.py <repo at 138010d5> <out.json>
For every run record: the commit it names; for every result: its edits equal its spec's, each `old` occurs exactly once in its
file at that commit (a `create` names no existing file), outcome agrees with exit and failed rows, tree clean after. Also the
summary's subject digest, tool digests and the PR-body figures, recomputed from the run records, not read from summary.json.
"""
import hashlib, json, subprocess, sys
from collections import Counter

repo, out = sys.argv[1:3]
EV = 'docs/evidence/syzygy-bpyt-8-37'
EVC = '138010d5beda4a1d39945265388fda0b35d34194'
BASE, HEAD = '8ff50172b127cba676ff32ce62c12c91b2b0d924', 'c90cd7327a24fee44d0e7135872a3b08277c73b0'
def git(*a, binary=False):
    r = subprocess.run(['git', '-C', repo, *a], capture_output=True)
    if r.returncode: return None
    return r.stdout if binary else r.stdout.decode()
def ev(name): return json.loads(git('show', f'{EVC}:{EV}/{name}'))
sha = lambda b: hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()
problems, facts = [], {}
own_specs = {m['id']: m for m in ev('own-specs.json')['mutants']}
review_specs = {m['id']: m for m in json.loads(git('show', f'{EVC}:docs/evidence/argv-fail-closed-review-2026-10-25/tools/own-specs-head.json'))['mutants']}
retained_specs = {m['id']: m for m in ev('retained-specs.json')['mutants']}
runs = {'premise-base.json': (BASE, review_specs), 'targets-head.json': (HEAD, review_specs), 'own-head.json': (HEAD, own_specs),
        'own-base-tree.json': (BASE, own_specs), 'retained-base.json': (BASE, retained_specs), 'retained-head.json': (HEAD, retained_specs)}
outcomes = {}
for name, (commit, specs) in runs.items():
    d = ev(name)
    if d['head'] != commit: problems.append(f'{name}: head {d["head"]} != {commit}')
    ids = [r['id'] for r in d['results']]
    if len(ids) != len(set(ids)): problems.append(f'{name}: duplicate ids')
    oc = {}
    for r in d['results']:
        s = specs.get(r['id'])
        if s is None: problems.append(f'{name} {r["id"]}: no spec'); continue
        if r.get('edits') != s['edits']: problems.append(f'{name} {r["id"]}: edits differ from spec')
        for e in s['edits']:
            text = git('show', f'{commit}:{e["file"]}')
            if 'old' in e:
                n = (text or '').count(e['old'])
                if n != 1: problems.append(f'{name} {r["id"]}: old occurs {n}x in {e["file"]} at {commit[:8]}')
                if e['old'] == e['new']: problems.append(f'{name} {r["id"]}: no-op edit')
            if 'create' in e and text is not None: problems.append(f'{name} {r["id"]}: create over existing {e["file"]}')
        exp = 'survives' if r.get('exit') == 0 else ('killed' if r.get('failed') else 'error')
        if r.get('outcome') != exp: problems.append(f'{name} {r["id"]}: outcome {r.get("outcome")} vs exit {r.get("exit")}')
        if r.get('outcome') == 'killed' and not any(t.startswith('Tests') and 'failed' in t for t in r.get('tests', [])):
            problems.append(f'{name} {r["id"]}: killed but no failed count in Tests line')
        if r.get('outcome') == 'survives' and any('failed' in t for t in r.get('tests', [])):
            problems.append(f'{name} {r["id"]}: survives with a failed count')
        if not r.get('cleanAfter'): problems.append(f'{name} {r["id"]}: dirty after')
        oc[r['id']] = (r.get('outcome'), tuple(sorted(r.get('failed', []))))
    outcomes[name] = oc
    facts[name] = {'results': len(d['results']), 'outcomes': dict(Counter(v[0] for v in oc.values()))}
# retained comparison, recomputed
rb, rh = outcomes['retained-base.json'], outcomes['retained-head.json']
cmp = Counter(); stronger = []; weaker = []
for i in retained_specs:
    b, h = rb.get(i), rh.get(i)
    if b is None or h is None: cmp['missing'] += 1; continue
    if b == h: cmp['unchanged'] += 1
    elif b[0] == 'killed' and (h[0] != 'killed' or not set(b[1]) <= set(h[1])): weaker.append(i)
    elif (b[0], h[0]) == ('survives', 'killed') or (h[0] == 'killed' and set(h[1]) > set(b[1])): stronger.append(i)
    else: weaker.append(i)
surv_h = sorted(i for i, v in rh.items() if v[0] != 'killed'); surv_b = sorted(i for i, v in rb.items() if v[0] != 'killed')
facts['retainedCompare'] = {'specs': len(retained_specs), 'unchanged': cmp['unchanged'], 'missing': cmp['missing'], 'stronger': sorted(stronger),
                            'weaker': weaker, 'survivorsHead': surv_h, 'headSurvivorsNotSurvivingAtBase': sorted(set(surv_h) - set(surv_b))}
# own-head: all killed? own-base-tree: survives
facts['ownHeadNotKilled'] = sorted(i for i, v in outcomes['own-head.json'].items() if v[0] != 'killed')
facts['ownBaseTree'] = {i: v[0] for i, v in outcomes['own-base-tree.json'].items()}
# subject and tools
facts['subjectCodeDiffSha256'] = sha(git('diff', BASE, HEAD, binary=True))
facts['subjectFullDiffSha256'] = sha(git('diff', BASE, EVC, binary=True))
summary = ev('summary.json')
facts['summarySubjectSha256'] = summary['subject']['sha256']
facts['summaryMutRunner'] = summary['mutRunnerSha256']
facts['mutPySha256AtEvc'] = sha(git('show', f'{EVC}:docs/evidence/argv-guards-review-2026-10-25/tools/mut.py', binary=True))
facts['islandDiffToolAtEvc'] = sha(git('show', f'{EVC}:docs/evidence/syzygy-bpyt-8-36/island_diff.py', binary=True))
facts['recordPy'] = sha(git('show', f'{EVC}:{EV}/record.py', binary=True))
facts['summaryJson'] = sha(git('show', f'{EVC}:{EV}/summary.json', binary=True))
idf = ev('island-diff.json'); ist = ev('island-diff-selftest.json')
facts['islandDiff'] = {'tool': idf['toolSha256'], 'walks': [idf['walks']['entries'], idf['walks']['equal']], 'resolves': [idf['resolves']['files'], idf['resolves']['specifiers'], idf['resolves']['equal']],
                       'walksSha': idf['walks']['answersSha256'], 'selftestUnequal': [len(ist['walks']['unequal']), len(ist['resolves']['unequal'])], 'selftestTool': ist['toolSha256']}
rep = ev('repeat-runs.json'); facts['repeat'] = {'commit': rep['commit'], 'tests': [r['tests'] for r in rep['runs']], 'load1': [r.get('load1') for r in rep['runs']]}
t = ev('titles.json'); facts['titles'] = {'base': t['titles']['base'], 'head': t['titles']['head'], 'added': len(t['added']), 'removed': len(t['removed']),
                                          'addedPerFile': dict(Counter(f for f, _ in t['added']))}
# premise/targets table
facts['targets'] = {i: [outcomes['premise-base.json'].get(i, ('-',))[0], outcomes['targets-head.json'].get(i, ('-',))[0],
                        len(outcomes['targets-head.json'].get(i, ('', ()))[1])] for i in sorted(set(outcomes['premise-base.json']) | set(outcomes['targets-head.json']))}
json.dump({'problems': problems, 'facts': facts}, open(out, 'w'), indent=1)
print('problems', len(problems), problems[:10]); print(json.dumps(facts, indent=1)[:6000])
