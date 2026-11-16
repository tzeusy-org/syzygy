#!/usr/bin/env python3
"""rev-532b: rule-6 mutants against the lane's record checks (build_record.py) for PR 532 round 2. Reviewer tool, not authority.

usage: python3 -I build_record_mutants_r2.py TREE OUT.json

TREE is a scratch clone at 9e00252a. For each mutant it edits one retained result file in the working tree (never a git
object), runs `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py TREE c104771f 8ff50172 bb5df680 447d9f08`,
records the exit code and the last output line, and restores the evidence directory with `git checkout`. `expect` is what
a sound check must do: `fail` (build_record exits non-zero) when the mutant breaks a claim the docstring says it checks.
A mutant with `expect: fail` whose run exits 0 survives. The tree is checked clean before and after.
"""
import json, os, subprocess, sys

tree, out_path = os.path.abspath(sys.argv[1]), sys.argv[2]
EV = 'docs/evidence/syzygy-bpyt-4-5'
ARGS = ['c104771f', '8ff50172', 'bb5df680', '447d9f08']
def site(d, bound): return next(s for s in d['sites'] if s['bound'] == bound)
def res(d, mid): return next(r for r in d['results'] if (r['mutant'] or {}).get('id', 'control') == mid)
def set_head_max(name, bound, value):
    def f(d): site(d, bound)['headMaxMs'] = value
    return name, f
MUTANTS = [
    ('control', 'cpu-separation.json', lambda d: None, 'pass',
     'no edit: the rebuild exits 0'),
    ('K1-thread-headMax-9.97x', 'cpu-separation.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS').__setitem__('headMaxMs', 301.0), 'fail',
     'Node 24 thread-CPU ATTRIBUTE_SCAN head max raised to 301 ms: bound / head = 9.97x'),
    ('K2-thread-mutantMin-9.67x', 'cpu-separation.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS').__setitem__('mutantMinMs', 29000.0), 'fail',
     'Node 24 thread-CPU ATTRIBUTE_SCAN mutant min lowered to 29,000 ms: mutant / bound = 9.67x'),
    ('K3-node22-headMax-9.97x', 'cpu-separation-node22.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS').__setitem__('headMaxMs', 301.0), 'fail',
     'Node 22 process-CPU ATTRIBUTE_SCAN head max raised to 301 ms (bound / head = 9.97x); fileBound left as measured'),
    ('K4-node22-mutantMin-9.67x', 'cpu-separation-node22.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS').__setitem__('mutantMinMs', 29000.0), 'fail',
     'Node 22 process-CPU ATTRIBUTE_SCAN mutant min lowered to 29,000 ms (9.67x); fileBound left as measured'),
    ('K5-node22-recorded-margin-9.5x', 'cpu-separation-node22.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS')['fileBound'].__setitem__('overHeadMax', 9.5), 'fail',
     "Node 22 ATTRIBUTE_SCAN's recorded margin fileBound.overHeadMax set to 9.5 (the figure build_record copies into the record)"),
    ('K6-node22-separated-false', 'cpu-separation-node22.json', lambda d: site(d, 'ATTRIBUTE_SCAN_CPU_MS')['fileBound'].__setitem__('separated', False), 'fail',
     "Node 22 ATTRIBUTE_SCAN's fileBound.separated flag set false"),
    ('K7-thread-headRun-over-max', 'cpu-separation.json',
     lambda d: next(r for r in site(d, 'ATTRIBUTE_SCAN_CPU_MS')['headRuns'][0]['regions'] if r['bound'] == 'ATTRIBUTE_SCAN_CPU_MS').__setitem__('cpuMs', 400.0), 'fail',
     'one Node 24 ATTRIBUTE_SCAN head run region set to 400 ms (bound / 400 = 7.5x) with headMaxMs left at 148.9'),
    ('K8-node22-cases-digest', 'cpu-separation-node22.json', lambda d: d['cases'].__setitem__('sha256', '0' * 64), 'fail',
     "Node 22 separation's cases digest replaced"),
    ('K9-node22-on-node24', 'cpu-separation-node22.json', lambda d: d.__setitem__('node', 'v24.6.0'), 'fail',
     'the fallback separation claims Node 24'),
    ('K10-de-head-S1-shape-R1-passes', 'daemon-entry-head.json', lambda d: res(d, 'R1-flag-between-branches').update({'failed': [], 'passed': 16}), 'fail',
     'R1 recorded as passing the new test'),
    ('K11-de-prior-R2-fails', 'daemon-entry-prior-test.json',
     lambda d: res(d, 'R2-flag-createRequire-before-daemon').update({'failed': ['x every line of main.ts naming the POC app sits in the `dossier` and `polaris` branches'], 'passed': 15}), 'fail',
     'R2 recorded as failing the 447d9f08 test (so not the survivor round 1 found)'),
    ('K12-de-head-equivalent-fails', 'daemon-entry-head.json',
     lambda d: res(d, 'E-branch-swap').update({'failed': ['daemon entry: x every line of main.ts naming the POC app sits inside the `dossier` or the `polaris` branch'], 'passed': 15}), 'fail',
     'E-branch-swap recorded as failing the new test'),
    ('K13-mutants-timeout-text', 'bound-and-pin-mutants.json',
     lambda d: [r.__setitem__('byTimeout', False) for c in d['results'] if c['id'] == 'reader-no-depth-cap' for s in c['sides'] for r in s.get('rows', [])], 'pass',
     "reader-no-depth-cap's byTimeout flags cleared: the record should then say `fail`, not `fail (by the test timeout)` (a wording change, not a check)"),
]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True)
if git('status', '--porcelain').stdout.strip(): sys.exit('tree is not clean')
results = []
for mid, rel, edit, expect, note in MUTANTS:
    path = os.path.join(tree, EV, rel)
    try:
        d = json.load(open(path, encoding='utf8'))
        edit(d)
        if mid != 'control': open(path, 'w', encoding='utf8').write(json.dumps(d, indent=1))
        run = subprocess.run([sys.executable, '-I', os.path.join(tree, EV, 'tools/build_record.py'), tree, *ARGS], capture_output=True, text=True)
        last = (run.stderr.strip().splitlines() or run.stdout.strip().splitlines() or [''])[-1][:400]
        rec = json.load(open(os.path.join(tree, EV, 'bounds-and-pins.json'), encoding='utf8')) if run.returncode == 0 else None
        attr = rec and next(s for s in rec['sites'] if s.get('bound') == 'ATTRIBUTE_SCAN_CPU_MS')['separation']
        timeout_words = rec and next(s for s in rec['sites'] if 'git-object-reader' in s['site'])['outcomes'].get('reader-no-depth-cap')
        outcome = 'pass' if run.returncode == 0 else 'fail'
        results.append({'id': mid, 'file': rel, 'note': note, 'expect': expect, 'exit': run.returncode, 'outcome': outcome,
                        'survives': expect == 'fail' and outcome == 'pass', 'lastLine': last,
                        'recordedAttribute': attr and {k: attr[k] for k in ('headMaxMs', 'mutantMinMs', 'boundOverHeadMax', 'mutantMinOverBound')},
                        'recordedAttributeFallback': attr and {k: attr['underProcessCpuFallback'][k] for k in ('headMaxMs', 'mutantMinMs', 'boundOverHeadMax', 'mutantMinOverBound')},
                        'recordedReaderNoDepthCap': timeout_words})
        print(json.dumps({k: results[-1][k] for k in ('id', 'expect', 'exit', 'survives', 'lastLine', 'recordedAttributeFallback')}), flush=True)
    finally:
        git('checkout', '--', EV)
if git('status', '--porcelain').stdout.strip(): sys.exit('tree not restored')
json.dump({'tool': 'build_record_mutants_r2.py', 'tree': git('rev-parse', 'HEAD').stdout.strip(), 'args': ARGS, 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
