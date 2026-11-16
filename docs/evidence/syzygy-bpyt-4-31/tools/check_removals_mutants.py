#!/usr/bin/env python3
"""Rule-6 mutants of check_removals.py, one per predicate, made on its inputs (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/check_removals_mutants.py DECISIONS.json HEAD-SITE-DURATIONS.json HEAD-RECORDS-DIR FULL-RUNS.json LATER.json OUT.json

The unmutated inputs must give a test site and a hook site that hold. Each mutant then changes one input fact about one of them,
by the path and the old and new value recorded in OUT.json, and runs the tool on the mutated copies: the mutant is killed when
that site no longer holds, and every row outside its file is unchanged (a mutant of a whole file's line in a full run reaches
every site of that file). The three boundary controls set a figure to exactly its threshold,
which must still hold. OUT.json records each mutant, its outcome, the commit it ran at, the tool's sha256 and the inputs' sha256."""
import copy, hashlib, json, os, subprocess, sys, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, 'check_removals.py')
decisions_path, durations_path, records_dir, full_path, later_path, out_path = sys.argv[1:7]
sha = lambda p: hashlib.sha256(open(p, 'rb').read()).hexdigest()
durations, full = json.load(open(durations_path, encoding='utf8')), json.load(open(full_path, encoding='utf8'))
later = json.load(open(later_path, encoding='utf8'))

def run(durations_doc, full_doc, later_doc=later):
    with tempfile.TemporaryDirectory() as tmp:
        d, f, l, o = (os.path.join(tmp, n) for n in ('d.json', 'f.json', 'l.json', 'o.json'))
        json.dump(durations_doc, open(d, 'w', encoding='utf8')); json.dump(full_doc, open(f, 'w', encoding='utf8'))
        json.dump(later_doc, open(l, 'w', encoding='utf8'))
        subprocess.run([sys.executable, '-I', TOOL, decisions_path, d, records_dir, f, o, '--later', l], check=True, capture_output=True)
        return {r['site']: r['holds'] for r in json.load(open(o, encoding='utf8'))['rows']}

base = run(durations, full)
rows = {r['site']: r for r in json.load(open(decisions_path, encoding='utf8'))['rows'] if r['decision'] == 'remove'}
# The subjects: the first holding test site whose file passed in every full run with a line of its own, and the first holding hook.
def own_lines(site):
    path, row = site.rsplit(':', 1)[0], rows[site]
    name = ' > '.join([*(rows[site].get('suites') or []), rows[site].get('title') or ''])
    return [(i, j, k) for i, r in enumerate(full['runs']) for j, f in enumerate(r['files']) if f['file'] == path
            for k, t in enumerate(f['slowTests']) if t['name'] == name]
test = next(s for s, ok in base.items() if ok and rows[s]['kind'] == 'test' and len(own_lines(s)) >= 1)
hook = next(s for s, ok in base.items() if ok and rows[s]['kind'] == 'hook')
d_index = {r['site']: i for i, r in enumerate(durations['rows'])}

def mutate_duration(site, field, value):
    doc = copy.deepcopy(durations); row = doc['rows'][d_index[site]]
    old = row[field]; row[field] = value
    return doc, full, {'input': 'HEAD-SITE-DURATIONS', 'path': f"rows[{d_index[site]}].{field}", 'old': old, 'new': value}

def mutate_line(site, field, value):
    i, j, k = own_lines(site)[0]
    doc = copy.deepcopy(full); line = doc['runs'][i]['files'][j]['slowTests'][k]
    old = line[field]; line[field] = value
    return durations, doc, {'input': 'FULL-RUNS', 'path': f"runs[{i}].files[{j}].slowTests[{k}].{field}", 'old': old, 'new': value}

def file_of(site, run_index=0):
    path = site.rsplit(':', 1)[0]
    return next(j for j, f in enumerate(full['runs'][run_index]['files']) if f['file'] == path)

def mutate_file(site, change, describe):
    doc = copy.deepcopy(full); j = file_of(site); f = doc['runs'][0]['files'][j]
    old = describe(f); change(f)
    return durations, doc, {'input': 'FULL-RUNS', 'path': f'runs[0].files[{j}]', 'old': old, 'new': describe(f)}

def drop_file(site):
    doc = copy.deepcopy(full); j = file_of(site); gone = doc['runs'][0]['files'].pop(j)
    return durations, doc, {'input': 'FULL-RUNS', 'path': f'runs[0].files[{j}]', 'old': gone['file'], 'new': None}

def later_seen(site, ms):
    doc = copy.deepcopy(later)
    doc['rows'] = [r for r in doc['rows'] if r['site'] != site] + [{'site': site, 'worstMs': ms, 'source': 'syzygy-mutant'}]
    return durations, full, doc, {'input': 'LATER', 'path': f'rows[site={site}].worstMs', 'old': None, 'new': ms}

def fail_without_line(f):
    f['mark'] = '❯'
    f['slowTests'] = [t for t in f['slowTests'] if t['name'] != ' > '.join([*(rows[test].get('suites') or []), rows[test].get('title') or ''])]

threshold = lambda s: rows[s]['thresholdMs']
rest = lambda f: f['ms'] - sum(t['ms'] for t in f['slowTests'])
MUTANTS = [
    ('M1', 'alone: worst at or under the threshold', test, lambda: mutate_duration(test, 'worstMs', threshold(test) + 1), False),
    ('M2', 'alone: at least 5 observations', test, lambda: mutate_duration(test, 'observations', 4), False),
    ('M3', 'alone: every observation passed', test, lambda: mutate_duration(test, 'anyFailed', True), False),
    ('M4', 'alone: a hook is held to its own threshold', hook, lambda: mutate_duration(hook, 'worstMs', threshold(hook) + 1), False),
    ('M5', "full: a test's own line at or under the threshold", test, lambda: mutate_line(test, 'ms', threshold(test) + 1), False),
    ('M6', "full: a test's own line is a pass", test, lambda: mutate_line(test, 'mark', '×'), False),
    ('M7', 'full: no line bounds nothing in a file with a failure', test, lambda: mutate_file(test, fail_without_line, lambda f: [f['mark'], len(f['slowTests'])]), False),
    ('M8', "full: a hook's file time less its tests at or under the threshold", hook,
     lambda: mutate_file(hook, lambda f: f.update(ms=f['ms'] + threshold(hook) - rest(f) + 1), lambda f: f['ms']), False),
    ('M9', 'full: a file missing from a run bounds nothing', test, lambda: drop_file(test), False),
    ('C1', 'control: an alone worst exactly at the threshold holds', test, lambda: mutate_duration(test, 'worstMs', threshold(test)), True),
    ('M10', 'later: an observation past the threshold refutes the removal', hook, lambda: later_seen(hook, threshold(hook) + 1), False),
    ('C2', "control: a hook's file time less its tests exactly at the threshold holds", hook,
     lambda: mutate_file(hook, lambda f: f.update(ms=f['ms'] + threshold(hook) - rest(f)), lambda f: f['ms']), True),
    ('C3', 'control: a later observation exactly at the threshold holds', hook, lambda: later_seen(hook, threshold(hook)), True),
]
out_rows = []
for mid, predicate, site, make, expect in MUTANTS:
    d_doc, f_doc, *l_doc, change = make()
    got = run(d_doc, f_doc, *l_doc)
    others = all(got[s] == base[s] for s in base if s.rsplit(':', 1)[0] != site.rsplit(':', 1)[0])
    ok = got[site] is expect and others
    out_rows.append({'id': mid, 'predicate': predicate, 'site': site, 'change': change, 'expectedHolds': expect, 'holds': got[site],
                     'otherRowsUnchanged': others, 'outcome': ('killed' if not expect else 'control held') if ok else 'SURVIVED'})
    print(f"{mid} {out_rows[-1]['outcome']}: {predicate}")
commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=HERE, capture_output=True, text=True, check=True).stdout.strip()
out = {'tool': 'check_removals_mutants.py', 'commit': commit, 'subject': {'path': 'docs/evidence/syzygy-bpyt-4-31/tools/check_removals.py', 'sha256': sha(TOOL)},
       'inputs': {os.path.basename(p): sha(p) for p in (decisions_path, durations_path, full_path, later_path)}, 'testSite': test, 'hookSite': hook,
       'unmutatedHolding': sum(base.values()), 'unmutatedRows': len(base),
       'killed': sum(r['outcome'] == 'killed' for r in out_rows), 'controlsHeld': sum(r['outcome'] == 'control held' for r in out_rows), 'rows': out_rows}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(f"{out['killed']} of 10 killed, {out['controlsHeld']} of 3 controls held")
sys.exit(0 if out['killed'] == 10 and out['controlsHeld'] == 3 else 1)
