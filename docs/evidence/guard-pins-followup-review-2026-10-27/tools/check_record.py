"""rev-536: check the lane's 8.38 evidence against the git objects, independently of its record.py.

Usage: python3 -I check_record.py <repo> <rev-536 dir>
Reads every lane file from the evidence commit's blob (never the worktree), and compares the lane's mutant runs with this
reviewer's own reproductions (rev531-at-base.json, rev531-at-code.json) by outcome and failed-row set.
"""
import hashlib, json, re, subprocess, sys

repo, mine = sys.argv[1], sys.argv[2]
BASE, CODE, EVID = 'e5080f4dcdcc208127ae5dc0b915acf413df9764', '831f40c1ab98e4c9b40d98322109506b15ac8b97', 'c12276679a8ed4d3b6b9642215115b77dbfc49d4'
DIR = 'docs/evidence/syzygy-bpyt-8-38'
problems, notes = [], []


def git(*args, text=True):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True, text=text).stdout


def blob(commit, path):
    try:
        return git('show', f'{commit}:{path}', text=False)
    except subprocess.CalledProcessError:
        return None


sha = lambda data: hashlib.sha256(data).hexdigest()
lane = lambda name: json.loads(blob(EVID, f'{DIR}/{name}'))

# Commits and ancestry.
if git('rev-parse', f'{CODE}^').strip() != BASE:
    problems.append('code commit parent is not BASE')
if git('rev-parse', f'{EVID}^').strip() != CODE:
    problems.append('evidence commit parent is not CODE')
evid_paths = git('diff', '--name-only', CODE, EVID).split()
if any(not p.startswith(DIR + '/') for p in evid_paths):
    problems.append(f'evidence commit touches paths outside {DIR}: {[p for p in evid_paths if not p.startswith(DIR + "/")]}')
notes.append(f'evidence commit adds {len(evid_paths)} files, all under {DIR}')
code_paths = git('diff', '--name-only', BASE, CODE).split()
notes.append(f'code commit paths: {code_paths}')
digests = {
    'subject (BASE..EVID)': sha(git('diff', BASE, EVID, text=False)),
    'code (BASE..CODE)': sha(git('diff', BASE, CODE, text=False)),
}
for path in ['docs/evidence/guard-pins-review-2026-10-27/tools/mut.py', 'docs/evidence/argv-guards-review-2026-10-25/tools/mut.py',
             'docs/evidence/syzygy-bpyt-8-36/island_diff.py', f'{DIR}/npa_probe.cjs', f'{DIR}/record.py', f'{DIR}/summary.json',
             f'{DIR}/own_specs.py', 'docs/evidence/guard-pins-review-2026-10-27/rev-specs-head.json',
             'docs/evidence/syzygy-bpyt-8-36/repeat.py', 'docs/evidence/syzygy-bpyt-8-36/titles.py']:
    digests[path] = {c[:8]: (sha(blob(c, path)) if blob(c, path) is not None else None) for c in (BASE, CODE, EVID)}

# Mutant runs: commit, edits == spec, each old once at the recorded commit, outcome vs exit and failed rows.
review = {m['id']: m for m in json.loads(blob(EVID, 'docs/evidence/guard-pins-review-2026-10-27/rev-specs-head.json'))['mutants']}
own = {m['id']: m for m in lane('own-specs.json')['mutants']}
runs = {}
for name, commit, specs in (('premise-base.json', BASE, review), ('targets-head.json', CODE, review), ('own-base.json', BASE, own),
                            ('own-head.json', CODE, own)):
    d = lane(name)
    if d['head'] != commit:
        problems.append(f'{name}: head {d["head"]} != {commit}')
    ids = [r['id'] for r in d['results']]
    if sorted(ids) != sorted(specs) or len(ids) != len(set(ids)):
        problems.append(f'{name}: ids are not exactly the spec ids')
    for r in d['results']:
        spec = specs[r['id']]
        if r['edits'] != spec['edits']:
            problems.append(f'{name} {r["id"]}: edits differ from the spec')
        for e in spec['edits']:
            text = blob(commit, e['file'])
            count = None if text is None else text.decode().count(e['old'])
            if count != 1:
                problems.append(f'{name} {r["id"]}: old occurs {count} times in {e["file"]} at {commit[:8]}')
            if e['old'] == e['new']:
                problems.append(f'{name} {r["id"]}: old == new')
        want = 'survives' if r['exit'] == 0 else ('killed' if r['failed'] else 'error')
        if r['outcome'] != want or (r['outcome'] == 'survives' and r['failed']):
            problems.append(f'{name} {r["id"]}: outcome {r["outcome"]} vs exit {r["exit"]} and {len(r["failed"])} failed rows')
        if r['outcome'] == 'killed':
            m = re.search(r'(\d+) failed', ' '.join(r['tests']))
            if not m or int(m.group(1)) != len(r['failed']):
                problems.append(f'{name} {r["id"]}: Tests line {r["tests"]} does not count {len(r["failed"])} failed rows')
        if r['timeouts'] or not r['cleanAfter']:
            problems.append(f'{name} {r["id"]}: timeouts {r["timeouts"]} or dirty tree')
    runs[name] = {r['id']: (r['outcome'], sorted(r['failed'])) for r in d['results']}

# Compare with this reviewer's own reproductions of the 18 review mutants.
for lane_name, my_name in (('premise-base.json', 'rev531-at-base.json'), ('targets-head.json', 'rev531-at-code.json')):
    my = {r['id']: (r['outcome'], sorted(r['failed'])) for r in json.load(open(f'{mine}/{my_name}'))['results']}
    for i, value in runs[lane_name].items():
        if my.get(i) != value:
            problems.append(f'{lane_name} {i}: lane {value} != reviewer {my.get(i)}')
    notes.append(f'{lane_name}: {sum(1 for i in runs[lane_name] if my.get(i) == runs[lane_name][i])}/{len(runs[lane_name])} equal to {my_name}')

# Island diff records.
for name in ('island-diff.json', 'island-diff-selftest.json'):
    d = lane(name)
    if (d['base'], d['head'], d['vitestExit'], d['cleanAfter'], d['toolSha256']) != (BASE, CODE, 0, True, digests['docs/evidence/syzygy-bpyt-8-36/island_diff.py']['c1227667']):
        problems.append(f'{name}: base/head/exit/clean/tool not as required')
    if d['scratchSha256']['packages/polaris-generation-core/src/zz-836-old-testkit.ts'] != sha(blob(BASE, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts')):
        problems.append(f'{name}: old testkit copy is not BASE testkit')
    notes.append(f'{name}: walks {d["walks"]["equal"]}/{d["walks"]["entries"]}, resolves {d["resolves"]["equal"]}/{d["resolves"]["specifiers"]}, byAnswer {d["resolves"].get("byAnswer")}')

# Repeat runs and titles.
rep = lane('repeat-runs.json')
notes.append(f'repeat-runs: {[(r["exit"], r["passed"], r["total"], r["load1"]) for r in rep["runs"]]}')
tit = lane('titles.json')
notes.append(f'titles: base {tit["base"]} head {tit["head"]} added {tit["added"]} removed {tit["removed"]} perFile {tit["perFile"]}')
probe = lane('npa-probe.json')
kit_line = [l for l in blob(CODE, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts').decode().split('\n') if l.startswith('const LOCAL_VERSION = ')]
if probe['pattern'] != kit_line[0] or kit_line[0] not in blob(BASE, 'packages/polaris-generation-core/src/workspace-reach.testkit.ts').decode():
    problems.append('npa-probe pattern is not the (unchanged) testkit line')
summary = lane('summary.json')
if summary['subject']['sha256'] != digests['code (BASE..CODE)']:
    problems.append('summary subject digest != code diff digest')
print(json.dumps({'problems': problems, 'notes': notes, 'digests': digests}, indent=1))
