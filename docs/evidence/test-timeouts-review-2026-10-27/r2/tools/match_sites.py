#!/usr/bin/env python3
"""Match base census sites to head census sites by mapped call line (round-2 reviewer tool, R-GP-IMPL-TEST-TIMEOUTS-2).

usage: python3 -I match_sites.py REPO BASE-COMMIT BASE-CENSUS.json HEAD-COMMIT HEAD-CENSUS.json REMOVAL-CHECK.json OUT.json

Both censuses are my_census.mjs output. For each file, base lines are mapped to head lines by difflib opcodes over the two
blobs: 'equal' blocks map line for line, 'replace' blocks of equal length map by position; any other line is unmapped. A
base site is anchored at its call line (or its own line for a config site), and is 'kept' when a head site of the same kind
sits at the mapped anchor, else 'absent'. Deferred files are the three #532 files. For each kept site it records the base and
head expression text and value, and flags a changed expression (ruling 5) or a value below the default (ruling 3: 5000 ms
for a test or suite, 10000 for a hook). The absent set is compared with REMOVAL-CHECK.json's holding rows (whose lines
count at the lane's base 546f1ff0; pass that as BASE-COMMIT)."""
import difflib, json, subprocess, sys

repo, base_c, base_p, head_c, head_p, rc_p, out_p = sys.argv[1:8]
DEFERRED = {'apps/three-surface-poc/src/main.test.ts', 'apps/three-surface-poc/src/polaris-generation/redis-shaped-discovery.test.ts',
            'packages/polaris-dossier/src/git-object-reader.test.ts'}
DEFAULT = {'test': 5000, 'suite': 5000, 'hook': 10000}
base, head = json.load(open(base_p))['sitesList'], json.load(open(head_p))['sitesList']
show = lambda c, p: subprocess.run(['git', '-C', repo, 'show', f'{c}:{p}'], capture_output=True, text=True).stdout.split('\n')
maps = {}
def line_map(path):
    if path not in maps:
        a, b = show(base_c, path), show(head_c, path)
        m = {}
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
            if tag == 'equal' or (tag == 'replace' and i2 - i1 == j2 - j1):
                for k in range(i2 - i1): m[i1 + k + 1] = j1 + k + 1
        maps[path] = m
    return maps[path]
anchor = lambda s: s['callLine'] or s['line']
head_at = {}
for s in head: head_at.setdefault((s['path'], anchor(s), s['kind']), []).append(s)
rows, used = [], set()
for s in base:
    m = line_map(s['path']).get(anchor(s))
    hits = head_at.get((s['path'], m, s['kind']), []) if m else []
    h = hits[0] if len(hits) == 1 else None
    if h: used.add(id(h))
    row = {'site546': f"{s['path']}:{s['line']}", 'kind': s['kind'], 'deferred': s['path'] in DEFERRED, 'baseExpr': s['expression'], 'baseValueMs': s['valueMs']}
    if h:
        row.update(status='kept', headSite=f"{h['path']}:{h['line']}", headExpr=h['expression'], headValueMs=h['valueMs'],
                   exprChanged=h['expression'] != s['expression'],
                   belowDefault=(h['valueMs'] is not None and s['kind'] in DEFAULT and h['valueMs'] < DEFAULT[s['kind']]))
    else:
        row.update(status='absent' if not hits else f'ambiguous({len(hits)})')
    rows.append(row)
unmatched_head = [f"{h['path']}:{h['line']}" for h in head if id(h) not in used]
rc = json.load(open(rc_p))
holding = sorted(r['site'] for r in rc['rows'] if r['holds'])
absent = sorted(r['site546'] for r in rows if r['status'] == 'absent')
work = [r for r in rows if not r['deferred']]
kept = [r for r in work if r['status'] == 'kept']
out = {'base': base_c, 'head': head_c, 'baseSites': len(base), 'headSites': len(head), 'workable': len(work),
       'keptWorkable': len(kept), 'absentWorkable': sum(r['status'] == 'absent' for r in work),
       'deferredKept': sum(r['status'] == 'kept' for r in rows if r['deferred']), 'ambiguous': [r for r in rows if r['status'].startswith('ambig')],
       'unmatchedHead': unmatched_head, 'absentEqualsHolding': absent == holding,
       'absentNotHolding': sorted(set(absent) - set(holding)), 'holdingNotAbsent': sorted(set(holding) - set(absent)),
       'keptExprChanged': [r for r in kept if r['exprChanged']], 'keptBelowDefault': [r for r in kept if r['belowDefault']],
       'keptValueUnknown': [r['site546'] + ' ' + r['headExpr'] for r in kept if r['headValueMs'] is None], 'rows': rows}
json.dump(out, open(out_p, 'w'), indent=1)
for k in ('baseSites', 'headSites', 'workable', 'keptWorkable', 'absentWorkable', 'deferredKept', 'unmatchedHead', 'absentEqualsHolding',
          'absentNotHolding', 'holdingNotAbsent', 'keptValueUnknown'):
    print(k, out[k])
print('ambiguous', len(out['ambiguous']), 'keptExprChanged', len(out['keptExprChanged']), 'keptBelowDefault', len(out['keptBelowDefault']))
