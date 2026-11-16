#!/usr/bin/env python3
"""rev-532c (round 3): rule-6 mutants of PR 532's build_record.py margin derivation. Reviewer tool, not authority.

usage: python3 -I build_record_mutants_r3.py TREE OUT.json BASE MAIN EVIDENCE PRIOR ROUND1

TREE is a clean checkout of d0467aeb with node_modules installed. Each mutant edits one retained separation (or census)
file in the working tree, written back with json.dumps(indent=1), runs `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/
build_record.py TREE BASE MAIN EVIDENCE PRIOR ROUND1`, records the exit code, the last output line and, on exit 0, the
figures the rebuilt record carries for the edited site; then restores the evidence directory with `git checkout`. Unlike
the lane's K-mutants, most edits here are CONSISTENT: every summary figure the producer would have written is edited to
agree with the edited runs, so only a check that derives from the runs and applies the 10x rule can refuse them.
`expect` is what a sound check does.
"""
import copy, json, math, os, subprocess, sys

tree, out_path, args = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:8]
EV = 'docs/evidence/syzygy-bpyt-4-5'
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True)
def site(d, bound): return next(s for s in d['sites'] if s['bound'] == bound)
def region_value(r, bound): return r['capped']['regionCpuMsAtLeast'] if r['capped'] else min(g['cpuMs'] for g in r['regions'] if g['bound'] == bound)

def b1(docs):
    """Node 24 ATTRIBUTE_SCAN: the slowest head region raised to 301 ms (3000 / 301 = 9.967x), and every summary made to agree."""
    s = site(docs['cpu-separation.json'], 'ATTRIBUTE_SCAN_CPU_MS')
    g = max((g for h in s['headRuns'] for g in h['regions'] if g['bound'] == s['bound']), key=lambda g: g['cpuMs'])
    g['cpuMs'] = 301.0; s['headMaxMs'] = 301.0
    s['fileBound'].update(overHeadMax=round(3000 / 301.0, 1), separated=True)
def b2(docs):
    """Node 22 EDGE_TRIM: every run of its one mutant row set to a capped reading of 18,999 ms (9.9995x the 1,900 bound), summaries agreeing."""
    s = site(docs['cpu-separation-node22.json'], 'EDGE_TRIM_CPU_MS')
    m = s['mutants'][0]
    for r in m['runs']: r['capped']['regionCpuMsAtLeast'] = 18999.0
    m['min'] = 18999.0; s['mutantMinMs'] = 18999.0
    s['fileBound'].update(mutantMinOver=round(18999.0 / 1900, 1), separated=True)
def b3(docs):
    """Node 24 TAG_SCAN: the `plural` row's three runs finish at 600 ms of CPU, under the 1,500 bound (the mutant passes that case)."""
    s = site(docs['cpu-separation.json'], 'TAG_SCAN_CPU_MS')
    m = next(m for m in s['mutants'] if 'plural' in m['title'])
    for r in m['runs']:
        r.update(exit=0, capped=None, regions=[{'line': 110, 'bound': 'TAG_SCAN_CPU_MS', 'cpuMs': 600.0}])
    m.update(min=600.0, cappedRuns=0, reached=False)
def b4(docs):
    """Node 24 ATTRIBUTE_SCAN: the producer's geometric mean `proposedBoundMs` 2900 -> 9900 (sqrt(head max x mutant min) is about 2,989)."""
    site(docs['cpu-separation.json'], 'ATTRIBUTE_SCAN_CPU_MS')['proposedBoundMs'] = 9900
def b5(docs):
    """Node 22 HOSTILE_LINE: one uncapped mutant run lowered to 1,300 ms (9.29x the 140 bound); summaries left as recorded."""
    s = site(docs['cpu-separation-node22.json'], 'HOSTILE_LINE_CPU_MS')
    r = s['mutants'][0]['runs'][0]
    next(g for g in r['regions'] if g['bound'] == s['bound'])['cpuMs'] = 1300.0
def b6(docs):
    """Node 24 EDGE_TRIM: only the slowest of the ten head runs kept, so every derived figure is unchanged."""
    s = site(docs['cpu-separation.json'], 'EDGE_TRIM_CPU_MS')
    s['headRuns'] = [max(s['headRuns'], key=lambda h: max(g['cpuMs'] for g in h['regions'] if g['bound'] == s['bound']))]
def b7(docs):
    """Node 24 HOSTILE_LINE: one head run's exit set to 1."""
    site(docs['cpu-separation.json'], 'HOSTILE_LINE_CPU_MS')['headRuns'][3]['exit'] = 1
def b8(docs):
    """Node 22 ATTRIBUTE_SCAN: the slowest head region raised to 300.0 ms, exactly 10.0x, summaries agreeing (the boundary: a sound >= 10 check passes it)."""
    s = site(docs['cpu-separation-node22.json'], 'ATTRIBUTE_SCAN_CPU_MS')
    g = max((g for h in s['headRuns'] for g in h['regions'] if g['bound'] == s['bound']), key=lambda g: g['cpuMs'])
    g['cpuMs'] = 300.0; s['headMaxMs'] = 300.0
    s['fileBound'].update(overHeadMax=10.0, separated=True)
def b9(docs):
    """census-head.json: a fourth cpu-bound row, in a file no separation measured."""
    c = docs['census-head.json']
    c['rows'].append({'path': 'packages/polaris-generation-core/src/excerpt-extra.test.ts', 'line': 9, 'kind': 'cpu-bound',
                      'text': 'expect(cpuMsSince(cpu)).toBeLessThan(EXTRA_CPU_MS);'})

MUTANTS = [
    ('B0-control', None, [], 'pass'),
    ('B1-thread-attr-headmax-9.97x-consistent', b1, ['cpu-separation.json'], 'fail'),
    ('B2-node22-edge-mutantmin-9.9995x-consistent', b2, ['cpu-separation-node22.json'], 'fail'),
    ('B3-thread-tag-plural-row-under-bound', b3, ['cpu-separation.json'], 'fail'),
    ('B4-thread-attr-geometric-mean', b4, ['cpu-separation.json'], 'fail'),
    ('B5-node22-hostile-one-run-9.3x', b5, ['cpu-separation-node22.json'], 'fail'),
    ('B6-thread-edge-one-head-run', b6, ['cpu-separation.json'], 'fail'),
    ('B7-thread-hostile-head-exit-1', b7, ['cpu-separation.json'], 'fail'),
    ('B8-node22-attr-headmax-exactly-10x', b8, ['cpu-separation-node22.json'], 'pass'),
    ('B9-census-cpu-bound-unmeasured-file', b9, ['census-head.json'], 'fail'),
]

def leaves(a, b, path=''):
    """Every JSON pointer whose value differs between a and b."""
    if isinstance(a, dict) and isinstance(b, dict):
        return [p for k in sorted(set(a) | set(b)) for p in leaves(a.get(k, '<absent>'), b.get(k, '<absent>'), f'{path}/{k}')]
    if isinstance(a, list) and isinstance(b, list) and len(a) == len(b):
        return [p for i, (x, y) in enumerate(zip(a, b)) for p in leaves(x, y, f'{path}/{i}')]
    return [] if a == b else [{'pointer': path, 'old': a, 'new': b}]

if git('status', '--porcelain').stdout.strip(): sys.exit('tree is not clean')
commit = git('rev-parse', 'HEAD').stdout.strip()
results = []
for mid, fn, files, expect in MUTANTS:
    try:
        docs = {f: json.load(open(os.path.join(tree, EV, f), encoding='utf8')) for f in files}
        before = copy.deepcopy(docs)
        if fn: fn(docs)
        for f, d in docs.items(): open(os.path.join(tree, EV, f), 'w', encoding='utf8').write(json.dumps(d, indent=1))
        run = subprocess.run([sys.executable, '-I', os.path.join(tree, EV, 'tools/build_record.py'), tree, *args], capture_output=True, text=True)
        last = (run.stderr.strip().splitlines() or run.stdout.strip().splitlines() or [''])[-1][:400]
        carried = None
        if run.returncode == 0:
            rec = json.load(open(os.path.join(tree, EV, 'bounds-and-pins.json'), encoding='utf8'))
            sep = {s['bound']: s['separation'] for s in rec['sites'] if 'separation' in s}
            carried = {b: {k: v[k] for k in ('headRuns', 'headMaxMs', 'mutantMinMs', 'boundOverHeadMax', 'mutantMinOverBound', 'geometricMeanNowMs')} |
                          {'rows': [(r['title'][:40], r['minMs'], r['reached']) for r in v['mutants']],
                           'fallback': {k: v['underProcessCpuFallback'][k] for k in ('headRuns', 'headMaxMs', 'mutantMinMs', 'boundOverHeadMax', 'mutantMinOverBound')}}
                       for b, v in sep.items()}
            carried['cpuBoundCensusLines'] = len(rec['ac1Sweep']['cpuBounds']['lines'])
        outcome = 'pass' if run.returncode == 0 else 'fail'
        results.append({'id': mid, 'doc': fn.__doc__ if fn else 'no edit', 'edits': [{'file': f, **e} for f in files for e in leaves(before[f], docs[f])][:40],
                        'expect': expect, 'exit': run.returncode, 'outcome': outcome, 'asExpected': outcome == expect, 'lastLine': last, 'recordCarries': carried})
        print(json.dumps({k: results[-1][k] for k in ('id', 'expect', 'exit', 'asExpected', 'lastLine')}), flush=True)
    finally:
        git('checkout', '--', EV)
if git('status', '--porcelain').stdout.strip(): sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': commit, 'args': args, 'results': results}, open(out_path, 'w', encoding='utf8'), indent=1)
