#!/usr/bin/env python3
"""rev-520c: one table over every probe record under PROBES (each */*.json written by probe.py, plus P0-wave2-*.json), by batch and
script version: attempts, passed, dirty, with survivors, exit codes, exit as claimed, record written on a stop. Also re-applies the
corrected P0 write predicate to the wave-2 P0 record. usage: python3 -I summarize_probes.py PROBES"""
import collections, glob, json, os, re, sys

root = sys.argv[1]
rows = collections.defaultdict(list)
for path in sorted(glob.glob(os.path.join(root, '*', '*.json'))):
    r = json.load(open(path))
    label = os.path.basename(os.path.dirname(path))
    rows[(label, r['version'])].append(r)
total = collections.Counter()
print(f"{'batch':<14}{'version':<8}{'att':>4}{'pass':>5}{'dirty':>6}{'surv':>5}{'asClaimed':>10}  exit codes / stop runs recorded")
for (label, version), rs in sorted(rows.items()):
    att, passed = len(rs), sum(r['passes'] for r in rs)
    dirty, surv = sum(bool(r['treeAfterExit']) for r in rs), sum(bool(r['survivors']) for r in rs)
    claimed = sum(r['exitAsClaimed'] for r in rs)
    exits = dict(sorted(collections.Counter(r['exitCode'] for r in rs).items()))
    stop_recorded = sum(1 for r in rs if r['sent'] and r.get('recordRuns'))
    print(f'{label:<14}{version:<8}{att:>4}{passed:>5}{dirty:>6}{surv:>5}{claimed:>10}  {exits} / {stop_recorded}')
    for k, v in (('attempts', att), ('passed', passed), ('dirty', dirty), ('withSurvivors', surv)):
        total[(version, k)] += v
print('totals', dict(total))
head_all = [r for (l, v), rs in rows.items() if v == 'head' for r in rs]
print('head attempts', len(head_all), 'dirty', sum(bool(r['treeAfterExit']) for r in head_all),
      'with survivors', sum(bool(r['survivors']) for r in head_all))
print('head dirty batches', sorted({r['batch'] + ('' if r.get('profile', True) else '-np') for r in head_all if r['treeAfterExit']}))
print('head survivor batches', sorted({r['batch'] + ('' if r.get('profile', True) else '-np') for r in head_all if r['survivors']}))
print('head stop attempts with a record written', sum(1 for r in head_all if r['sent'] and r['batch'] not in ('H',) and r.get('recordRuns')))
not_claimed = [(r['batch'] + ('' if r.get('profile', True) else '-np'), r['param'], r['exitCode'], r['claimedExit']) for r in head_all
               if r['sent'] and r['batch'] != 'H' and not r['exitAsClaimed']]
print('head stop attempts whose exit is not 128 + first signal sent', len(not_claimed), collections.Counter((b, e) for b, _, e, _ in not_claimed))
# the wave-2 P0 record under the corrected predicate (the one probe.py now uses)
for p in glob.glob(os.path.join(root, 'P0-wave2-head-*.json')):
    r = json.load(open(p))
    writes = r['scriptWrites']
    target = lambda l: (re.search(r'"([^"]*)"', l) or [None, ''])[1]
    unlinked = {target(l) for l in writes if l.startswith('unlink(')}
    FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
    KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
    def allowed(l):
        t = target(l)
        return (t == '<tmp>/measure-out.json' or t in ('<tree>/' + FILE, '<tree>/' + KIT) or t.startswith('<tmp>/tmp') or t == '/dev/null'
                or (t.startswith('<tmp>/') and '/' not in t[len('<tmp>/'):] and t in unlinked))
    fd_rel = [l for l in writes if re.match(r'(unlinkat|openat|mkdirat|renameat2?)\(\d+,', l)]
    outside = [l for l in writes if l not in fd_rel and not allowed(l)]
    print('P0 wave 2 record under the corrected predicate:', os.path.basename(p), 'writes', len(writes), 'fd-relative', fd_rel, 'outside', outside,
          'exit', r['exitCode'], 'tests', r['recordTests'], 'profile rows', r['recordProfileRows'])
