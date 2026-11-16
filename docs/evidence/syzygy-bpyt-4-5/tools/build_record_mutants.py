#!/usr/bin/env python3
"""Rule-6 mutants against build_record.py's checks (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I build_record_mutants.py TREE OUT.json BASE MAIN EVIDENCE PRIOR ROUND1 LATER_MAIN

TREE is a clean checkout of the evidence head with node_modules installed (tools/emit_equal.mjs loads the tree's
TypeScript). The last six arguments are build_record.py's own. For each mutant it edits retained result files in the
working tree (never a git object), runs `python3 -I docs/evidence/syzygy-bpyt-4-5/tools/build_record.py TREE BASE MAIN
EVIDENCE PRIOR ROUND1 LATER_MAIN`, records the exit code and the last output line, and restores the evidence directory
with `git checkout`. Each edit is recorded as its file, its JSON pointer, the value it replaced and the value it wrote,
with the commit, so any mutant can be re-run by hand (`oldAbsent` marks a key the edit added; a `new` of null deletes
the entry, and NULL writes a JSON null). `expect` is what a sound check must do: `fail` (build_record exits
non-zero) when the edit breaks a claim the docstring says it checks, `pass` for the control and a wording-only edit.
K1-K13 are rev-532b's (R-GP-IMPL-TEST-CLOCKS-2, section 3.6); K3, K4, K5 and K7 survived there. B3 and B4 are rev-532c's
(R-GP-IMPL-TEST-CLOCKS-3, F2 and F3), which survived there. The tree is checked clean before and after.
"""
import copy, json, os, subprocess, sys

tree, out_path, args = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3:9]
NULL = object()
EV = 'docs/evidence/syzygy-bpyt-4-5'
ATTR, EDGE = 'ATTRIBUTE_SCAN_CPU_MS', 'EDGE_TRIM_CPU_MS'
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True)

def site(bound, *rest):
    return lambda d: ['sites', next(i for i, s in enumerate(d['sites']) if s['bound'] == bound), *rest]
def result(mid, *rest):
    return lambda d: ['results', next(i for i, r in enumerate(d['results']) if (r['mutant'] or {}).get('id', 'control') == mid), *rest]
def head_region(bound):
    def path(d):
        s = site(bound)(d)
        runs = d['sites'][s[1]]['headRuns']
        return [*s, 'headRuns', 0, 'regions', next(i for i, g in enumerate(runs[0]['regions']) if g['bound'] == bound), 'cpuMs']
    return path
def fastest_reached_row(bound):
    """The mutant row whose minimum is the site's mutant minimum, and its run giving that minimum."""
    def path(d):
        s = site(bound)(d)
        entry = d['sites'][s[1]]
        m = next(i for i, m in enumerate(entry['mutants']) if m['min'] == entry['mutantMinMs'])
        runs = entry['mutants'][m]['runs']
        value = lambda r: r['capped']['regionCpuMsAtLeast'] if r['capped'] else min(g['cpuMs'] for g in r['regions'] if g['bound'] == bound)
        k = next(i for i, r in enumerate(runs) if value(r) == entry['mutantMinMs'])
        if runs[k]['capped']: return [*s, 'mutants', m, 'runs', k, 'capped', 'regionCpuMsAtLeast']
        g = next(i for i, g in enumerate(runs[k]['regions']) if g['bound'] == bound and g['cpuMs'] == entry['mutantMinMs'])
        return [*s, 'mutants', m, 'runs', k, 'regions', g, 'cpuMs']
    return path
TAG = 'TAG_SCAN_CPU_MS'
def plural(*rest):
    """The thread-CPU TAG_SCAN mutant row on unterminated plural tags (rev-532c's B3 row)."""
    def path(d):
        s = site(TAG)(d)
        return [*s, 'mutants', next(i for i, m in enumerate(d['sites'][s[1]]['mutants']) if 'plural' in m['title']), *rest]
    return path
def plural_runs(field):
    def path(d):
        row = plural()(d)
        return [[*row, 'runs', k, field] for k in range(len(get(d, row)['runs']))]
    return path
DE = ('daemon-entry-head.json', 'daemon-entry-base-test.json', 'daemon-entry-prior-test.json', 'daemon-entry-round1-test.json')
TEXT = 'daemon entry: the one changed input, `dossier` as the first argument > every mention of the POC app in main.ts lies inside the `dossier` or the `polaris` branch, x'
HOOK = 'daemon entry: the one changed input, `dossier` as the first argument > the daemon path never loads the POC app, and the `dossier render` branch does'
PIN = 'daemon entry: the one changed input, `dossier` as the first argument > the daemon path never loads the POC app: each import is dynamic and inside the `dossier` or `polaris` branch'
E = lambda file, path, value: (file, path, value)
MUTANTS = [
    ('control', [], 'pass', 'no edit: the rebuild exits 0'),
    ('K1-thread-headMax-9.97x', [E('cpu-separation.json', site(ATTR, 'headMaxMs'), 301.0)], 'fail', 'thread-CPU ATTRIBUTE_SCAN head max raised to 301 ms: bound / head = 9.97x'),
    ('K2-thread-mutantMin-9.67x', [E('cpu-separation.json', site(ATTR, 'mutantMinMs'), 29000.0)], 'fail', 'thread-CPU ATTRIBUTE_SCAN mutant min lowered to 29,000 ms: 9.67x'),
    ('K3-node22-headMax-9.97x', [E('cpu-separation-node22.json', site(ATTR, 'headMaxMs'), 301.0)], 'fail', 'Node 22 ATTRIBUTE_SCAN head max raised to 301 ms; fileBound left as measured'),
    ('K4-node22-mutantMin-9.67x', [E('cpu-separation-node22.json', site(ATTR, 'mutantMinMs'), 29000.0)], 'fail', 'Node 22 ATTRIBUTE_SCAN mutant min lowered to 29,000 ms; fileBound left as measured'),
    ('K5-node22-recorded-margin-9.5x', [E('cpu-separation-node22.json', site(ATTR, 'fileBound', 'overHeadMax'), 9.5)], 'fail', "Node 22 ATTRIBUTE_SCAN's recorded fileBound.overHeadMax set to 9.5"),
    ('K6-node22-separated-false', [E('cpu-separation-node22.json', site(ATTR, 'fileBound', 'separated'), False)], 'fail', "Node 22 ATTRIBUTE_SCAN's fileBound.separated set false"),
    ('K7-thread-headRun-over-max', [E('cpu-separation.json', head_region(ATTR), 400.0)], 'fail', 'one thread-CPU ATTRIBUTE_SCAN head-run region set to 400 ms (7.5x), headMaxMs left as recorded'),
    ('K8-node22-cases-digest', [E('cpu-separation-node22.json', lambda d: ['cases', 'sha256'], '0' * 64)], 'fail', "the Node 22 separation's cases digest replaced"),
    ('K9-node22-on-node24', [E('cpu-separation-node22.json', lambda d: ['node'], 'v24.6.0')], 'fail', 'the fallback separation claims Node 24'),
    ('K10-de-head-R1-passes', [E('daemon-entry-head.json', result('R1-flag-between-branches', 'failed'), [])], 'fail', 'R1 recorded as passing the new test'),
    ('K11-de-prior-R2-fails', [E('daemon-entry-prior-test.json', result('R2-flag-createRequire-before-daemon', 'failed'),
                                 ['x every line of main.ts naming the POC app sits in the `dossier` and `polaris` branches'])], 'fail', 'R2 recorded as failing the prior test'),
    ('K12-de-head-equivalent-fails', [E('daemon-entry-head.json', result('E-branch-swap', 'failed'), [TEXT])], 'fail', 'E-branch-swap recorded as failing the new test'),
    ('K13-mutants-timeout-text', [E('bound-and-pin-mutants.json',
                                    lambda d: [['results', i, 'sides', j, 'rows', k, 'byTimeout'] for i, c in enumerate(d['results']) if c['id'] == 'reader-no-depth-cap'
                                               for j, s in enumerate(c['sides']) for k, _ in enumerate(s.get('rows', []))], False)], 'pass',
     "reader-no-depth-cap's byTimeout flags cleared: the record then says `fail`, not `fail (by the test timeout)` (wording, not a check)"),
    ('K14-thread-mutant-row-min', [E('cpu-separation.json', lambda d: [*site(EDGE)(d), 'mutants', 0, 'min'], 1.0)], 'fail', "a thread-CPU mutant row's recorded min no longer its runs' minimum"),
    ('K15-node22-fastest-run-lowered', [E('cpu-separation-node22.json', fastest_reached_row(ATTR), 1000.0)], 'fail',
     "the Node 22 ATTRIBUTE_SCAN run giving the mutant minimum lowered to 1,000 ms, every summary figure left as recorded"),
    ('K16-thread-capped-count', [E('cpu-separation.json', lambda d: [*site(EDGE)(d), 'mutants', 0, 'cappedRuns'], 0)], 'fail', "a thread-CPU mutant row's capped-run count no longer its runs'"),
    ('K17-node22-lower-bound-flag', [E('cpu-separation-node22.json', site(EDGE, 'mutantMinIsLowerBound'), False)], 'fail', "Node 22 EDGE_TRIM's lower-bound flag flipped"),
    ('K18-thread-tree-not-emit-equal', [E('cpu-separation.json', lambda d: ['tree'], args[0])], 'fail',
     'the thread separation claims to have run at BASE, whose timed test files differ from the evidence commit in code'),
    ('K19-de-head-S1-passes', [E('daemon-entry-head.json', result('S1-else-if-flag-after-dossier', 'failed'), [])], 'fail', 'S1 recorded as passing the new test'),
    ('K20-de-round1-S2-fails', [E('daemon-entry-round1-test.json', result('S2-same-line-if-after-dossier', 'failed'), ['x'])], 'fail', 'S2 recorded as failing the round-1 test'),
    ('K21-de-old-S3-passes-pin', [E('daemon-entry-base-test.json', result('S3-else-if-flag-after-polaris', 'failed'), [])], 'fail', 'S3 recorded as passing the old pin'),
    ('K22-de-head-L1-fails', [E('daemon-entry-head.json', result('L1-else-if-chain', 'failed'), [TEXT])], 'fail', 'L1 recorded as failing the new text row'),
    ('K23-de-head-X2-fails', [E('daemon-entry-head.json', result('X2-close-failure-in-http-host', 'failed'), [TEXT])], 'fail', 'X2 recorded as failing the new test'),
    ('K24-de-prior-X2-fails', [E('daemon-entry-prior-test.json', result('X2-close-failure-in-http-host', 'failed'), ['x'])], 'fail', 'X2 recorded as failing the prior test'),
    ('K25-de-head-C1-fails-hook', [E('daemon-entry-head.json', result('C1-comment-outside-branches', 'failed'), [TEXT, HOOK])], 'fail', 'C1 recorded as failing the load-hook row too'),
    ('K26-de-head-X3-passes-hook', [E('daemon-entry-head.json', result('X3-shutdown-in-http-host', 'failed'), ['x'])], 'fail', 'X3 recorded as failing some row other than the load-hook row'),
    ('K27-de-head-S4-skipped', [E('daemon-entry-head.json', result('S4-else-runtime-hook-after-dossier', 'skipped'), 'old occurs 0 times')], 'fail', 'S4 recorded as skipped in the new run'),
    ('K28-de-relabel-S5', [E(f, result('S5-else-createRequire-flag-after-polaris', 'mutant', 'kind'), 'equivalent') for f in DE], 'fail', 'S5 relabelled an equivalent in all four runs'),
    ('K29-de-round1-from', [E('daemon-entry-round1-test.json', lambda d: ['testFileFrom'], args[3])], 'fail', 'the round-1 run names the prior commit as its test source'),
    ('K30-de-old-drops-L3', [E('daemon-entry-base-test.json', result('L3-nested-try-in-polaris'), None)], 'fail', "L3's row removed from the old-test run"),
    ('K31-de-head-S7-passes', [E('daemon-entry-head.json', result('S7-else-split-specifier-after-dossier', 'failed'), [])], 'fail', 'S7 recorded as passing the new test'),
    ('B3-thread-tag-plural-row-under-bound', [E('cpu-separation.json', plural_runs('exit'), 0), E('cpu-separation.json', plural_runs('capped'), NULL),
                                              E('cpu-separation.json', plural_runs('regions'), [{'line': 110, 'bound': TAG, 'cpuMs': 600.0}]),
                                              E('cpu-separation.json', plural('min'), 600.0), E('cpu-separation.json', plural('cappedRuns'), 0),
                                              E('cpu-separation.json', plural('reached'), False)], 'fail',
     "rev-532c's B3: thread-CPU TAG_SCAN's `plural` row finishes its runs uncapped at 600 ms, under the 1,500 bound, every summary agreeing"),
    ('B4-thread-attr-geometric-mean', [E('cpu-separation.json', site(ATTR, 'proposedBoundMs'), 9900)], 'fail',
     "rev-532c's B4: thread-CPU ATTRIBUTE_SCAN's recorded geometric mean 2900 -> 9900, which its runs do not give"),
    ('K32-de-head-Y2-fails-hook-not-pin', [E('daemon-entry-head.json', result('Y2-dossier-serve-reenters-main', 'failed'), [HOOK])], 'fail',
     'Y2 recorded as failing the load-hook row and passing the restored pin'),
    ('K33-de-head-Y3-fails-text-row-too', [E('daemon-entry-head.json', result('Y3-flag-rewrites-argv-into-dossier', 'failed'), [PIN, TEXT])], 'fail',
     'Y3 recorded as failing the text row as well as the restored pin'),
    ('K34-de-old-Y4-passes-pin', [E('daemon-entry-base-test.json', result('Y4-polaris-labelled-break', 'failed'), [])], 'fail', 'Y4 recorded as passing the old pin'),
    ('K35-de-head-L2-passes-pin', [E('daemon-entry-head.json', result('L2-nested-function-in-dossier', 'failed'), [])], 'fail',
     'L2, a known false refusal of the restored pin, recorded as passing it'),
    ('K36-de-head-E-comment-fails-text-too', [E('daemon-entry-head.json', result('E-comment-in-branch', 'failed'), [PIN, TEXT])], 'fail',
     'E-comment-in-branch recorded as failing the text row as well as the restored pin'),
    ('K37-de-head-C1-passes-pin', [E('daemon-entry-head.json', result('C1-comment-outside-branches', 'failed'), [TEXT])], 'fail',
     'C1 recorded as failing the text row and passing the restored pin'),
]

def get(d, path):
    for key in path: d = d[key]
    return d
if git('status', '--porcelain').stdout.strip(): sys.exit('tree is not clean')
commit = git('rev-parse', 'HEAD').stdout.strip()
results = []
for mid, edits, expect, note in MUTANTS:
    recorded = []
    try:
        docs = {}
        for rel, path_fn, value in edits:
            d = docs.setdefault(rel, json.load(open(os.path.join(tree, EV, rel), encoding='utf8')))
            found = path_fn(d)
            for path in (found if found and isinstance(found[0], list) else [found]):
                parent, key = get(d, path[:-1]), path[-1]
                absent = isinstance(parent, dict) and key not in parent
                written = None if value is NULL else value
                recorded.append({'file': rel, 'pointer': '/' + '/'.join(str(p) for p in path), 'old': None if absent else copy.deepcopy(parent[key]),
                                 **({'oldAbsent': True} if absent else {}), 'new': written, **({'newIsJsonNull': True} if value is NULL else {})})
                if value is None: del parent[key]
                else: parent[key] = written
        for rel, d in docs.items(): open(os.path.join(tree, EV, rel), 'w', encoding='utf8').write(json.dumps(d, indent=1))
        run = subprocess.run([sys.executable, '-I', os.path.join(tree, EV, 'tools/build_record.py'), tree, *args], capture_output=True, text=True)
        last = (run.stderr.strip().splitlines() or run.stdout.strip().splitlines() or [''])[-1][:400]
        outcome = 'pass' if run.returncode == 0 else 'fail'
        results.append({'id': mid, 'note': note, 'edits': recorded, 'expect': expect, 'exit': run.returncode, 'outcome': outcome,
                        'asExpected': outcome == expect, 'lastLine': last})
        print(json.dumps({k: results[-1][k] for k in ('id', 'expect', 'exit', 'asExpected', 'lastLine')}), flush=True)
    finally:
        git('checkout', '--', EV)
if git('status', '--porcelain').stdout.strip(): sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': commit, 'args': args, 'allAsExpected': all(r['asExpected'] for r in results), 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
