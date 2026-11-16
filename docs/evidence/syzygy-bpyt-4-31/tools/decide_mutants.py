#!/usr/bin/env python3
"""Rule-6 mutants of decide.py's two removal guards, made on its inputs (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/decide_mutants.py CENSUS.json SITE-DURATIONS.json CI-DURATIONS.json CITED.json OUT.json

The unmutated inputs must give a test site and a hook site that decide.py removes, and keep the cap1-system testTimeout config
on a measurement. Each mutant changes one input fact, by the path and the old and new value recorded in OUT.json, and runs the
tool on the mutated copies. A guard mutant is killed when its site is kept on that guard's basis and every other row is
unchanged; a boundary control sets the value to exactly the default, which must still be removed. No population site reaches
either guard today (the one site below its default is in a blocked file, and both configs are kept on a measurement), so these
mutants are the only evidence that the guards act.

The source mutants T1-T3 (the review R-GP-IMPL-TEST-TIMEOUTS-1's) each replace one fragment of a copy of decide.py: the test
threshold set to the default, the hook threshold set to the default, and the hosted-run condition dropped. Each runs on inputs
where one site separates it from the tool: a test site the unmutated tool keeps on a local worst between half its default and
its default (T1); a removed hook whose local worst is moved to 7500 ms, between the hook's two figures, which the unmutated tool
must keep on that worst (T2, input D4; no population hook lies between them); and a site the unmutated tool keeps on a hosted
bound alone (T3). A source mutant is killed when that site's decision changes. OUT.json records each mutant, its outcome, the
commit it ran at, the tool's sha256 and the inputs' sha256."""
import copy, hashlib, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, 'decide.py')
census_path, durations_path, ci_path, cited_path, out_path = sys.argv[1:6]
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
census, durations = json.load(open(census_path, encoding='utf8')), json.load(open(durations_path, encoding='utf8'))
CONFIG = 'packages/cap1-system/vitest.config.ts:18'

SOURCE = open(TOOL, encoding='utf8').read()

def run(census_doc, durations_doc, source=None):
    with tempfile.TemporaryDirectory() as tmp:
        c, d, o = (os.path.join(tmp, n) for n in ('c.json', 'd.json', 'o.json'))
        json.dump(census_doc, open(c, 'w', encoding='utf8')); json.dump(durations_doc, open(d, 'w', encoding='utf8'))
        tool = TOOL
        if source is not None:
            tool = os.path.join(tmp, 'decide.py')
            open(tool, 'w', encoding='utf8').write(source)
        subprocess.run([sys.executable, '-I', tool, c, d, ci_path, cited_path, o], check=True, capture_output=True)
        return {r['site']: (r['decision'], r['basis']) for r in json.load(open(o, encoding='utf8'))['rows']}

base = run(census, durations)
site_of = lambda key: next(s for s in census['sites'] if f"{s['path']}:{s['line']}" == key)
removed = lambda kind, at_least: next(k for k, (decision, _) in base.items()
                                      if decision == 'remove' and site_of(k)['kind'] == kind and site_of(k)['valueMs'] >= at_least)
test_site, hook_site = removed('test', 5000), removed('hook', 10000)
assert base[CONFIG][0] == 'keep' and '(ruling 4)' not in base[CONFIG][1], base[CONFIG]

def census_value(key, value):
    doc = copy.deepcopy(census)
    for s in doc['sites']:
        if f"{s['path']}:{s['line']}" == key: old, s['valueMs'] = s['valueMs'], value
    return doc, {'input': 'census', 'site': key, 'path': 'valueMs', 'old': old, 'new': value}

def measured_under(key):
    doc = copy.deepcopy(durations)
    row = next(r for r in doc['rows'] if r['site'] == key)
    old = {k: row.get(k) for k in ('observations', 'worstMs', 'anyFailed')}
    row.update(observations=max(row.get('observations') or 0, 5), worstMs=100, anyFailed=False)
    return doc, {'input': 'site-durations', 'site': key, 'path': 'observations, worstMs, anyFailed', 'old': old,
                 'new': {k: row[k] for k in ('observations', 'worstMs', 'anyFailed')}}

cases = []
for mid, kind, (c_doc, change), want in [
        ('D1', 'guard', census_value(test_site, 4999), ('keep', '(ruling 3)')),
        ('D1c', 'control', census_value(test_site, 5000), ('remove', None)),
        ('D2', 'guard', census_value(hook_site, 9999), ('keep', '(ruling 3)')),
        ('D2c', 'control', census_value(hook_site, 10000), ('remove', None))]:
    cases.append((mid, kind, change, run(c_doc, durations), want))
d_doc, change = measured_under(CONFIG)
cases.append(('D3', 'guard', change, run(census, d_doc), ('keep', '(ruling 4)')))

worst = {r['site']: r.get('worstMs') for r in durations['rows']}
between = lambda key, low, high: worst.get(key) is not None and low < worst[key] <= high
t1_site = next(k for k in sorted(base) if base[k] == ('keep', 'local worst over the threshold') and site_of(k)['kind'] == 'test' and between(k, 2500, 5000))
t3_site = next(k for k in sorted(base) if base[k][0] == 'keep' and base[k][1].startswith('a hosted run'))

def measured_between(key, ms):
    doc = copy.deepcopy(durations)
    row = next(r for r in doc['rows'] if r['site'] == key)
    old = {k: row.get(k) for k in ('observations', 'worstMs', 'anyFailed')}
    row.update(observations=max(row.get('observations') or 0, 5), worstMs=ms, anyFailed=False)
    return doc, {'input': 'site-durations', 'site': key, 'path': 'observations, worstMs, anyFailed', 'old': old,
                 'new': {k: row[k] for k in ('observations', 'worstMs', 'anyFailed')}}
d4_doc, d4_change = measured_between(hook_site, 7500)
d4 = run(census, d4_doc)
cases.append(('D4', 'guard', d4_change, d4, ('keep', 'local worst over the threshold')))

THRESHOLDS = "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook'] // 2"
HOSTED = "hosted_ok = bool(hosted) and all(b['boundMs'] is not None and b['boundMs'] <= threshold for b in hosted)"
sources = []
for mid, what, old, new, site, inputs, before in [
        ('T1', 'the test threshold is half the test default', THRESHOLDS,
         "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'], DEFAULT_MS['hook'] // 2", t1_site, (census, durations), base),
        ('T2', 'the hook threshold is half the hook default', THRESHOLDS,
         "TEST_THRESHOLD_MS, HOOK_THRESHOLD_MS = DEFAULT_MS['test'] // 2, DEFAULT_MS['hook']", hook_site, (census, d4_doc), d4),
        ('T3', 'a removal needs every hosted run to bound the site', HOSTED, 'hosted_ok = True', t3_site, (census, durations), base)]:
    if SOURCE.count(old) != 1: sys.exit(f'{mid}: the fragment occurs {SOURCE.count(old)} times')
    got = run(*inputs, source=SOURCE.replace(old, new))
    sources.append({'id': mid, 'kind': 'source', 'predicate': what, 'change': {'file': 'decide.py', 'old': old, 'new': new},
                    'input': 'D4' if inputs[1] is d4_doc else 'unmutated', 'site': site, 'siteWorstMs': (d4_change['new']['worstMs'] if inputs[1] is d4_doc else worst.get(site)),
                    'before': {'decision': before[site][0], 'basis': before[site][1]}, 'got': {'decision': got[site][0], 'basis': got[site][1]},
                    'outcome': 'killed' if got[site] != before[site] else 'survived'})

results = []
for mid, kind, change, got, (decision, mark) in cases:
    site = change['site']
    others = all(got[k] == v for k, v in base.items() if k != site)
    hit = got[site][0] == decision and (mark is None or mark in got[site][1])
    results.append({'id': mid, 'kind': kind, 'change': change, 'expected': {'decision': decision, 'basisNames': mark},
                    'got': {'decision': got[site][0], 'basis': got[site][1]}, 'otherRowsUnchanged': others,
                    'outcome': ('killed' if kind == 'guard' else 'holds') if hit and others else 'survived' if kind == 'guard' else 'broken'})
commit = subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
out = {'tool': 'decide_mutants.py', 'commit': commit, 'decideSha256': sha(TOOL),
       'inputs': {n: sha(p) for n, p in (('census', census_path), ('siteDurations', durations_path), ('ciDurations', ci_path), ('cited', cited_path))},
       'baseline': {'testSite': [test_site, *base[test_site]], 'hookSite': [hook_site, *base[hook_site]], 'config': [CONFIG, *base[CONFIG]]},
       'mutants': results + sources}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(json.dumps({r['id']: r['outcome'] for r in out['mutants']}))
if any(r['outcome'] not in ('killed', 'holds') for r in out['mutants']): sys.exit(1)
