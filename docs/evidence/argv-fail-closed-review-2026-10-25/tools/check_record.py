"""rev-528: an independent check of the lane's evidence record, read from the git objects only (never a working tree).

Usage: python3 -I check_record.py <repo> <evidence commit> <rev-528 named-base.json> <rev-528 named-head.json>
Checks, and prints each with its count:
  - the subject digests (git diff base..code head, base..evidence commit) and the tool digests;
  - each reviewer spec equals its row in the retained #524 tools file named by `from`, at the code head;
  - every run file: its recorded commit; each result's edits equal its spec; each `old` occurs exactly once in its file at that
    commit and each `create` path is absent there; the outcome agrees with the exit code and the failed rows; a clean tree after;
  - the base/head tallies, the 9 stronger / 0 weaker / 70 unchanged split, the 13 head survivors;
  - the six targets agree with rev-528's own reruns of them (outcome and failed rows).
"""
import hashlib, json, subprocess, sys

repo, commit, my_base, my_head = sys.argv[1:5]
BASE = 'a088f1caf061c1a2062527ce8521c9b64c3c7fd1'
CODE = '1447b6bbd3954a271a1716d7866266e0fb908cfb'
EV = 'docs/evidence/syzygy-bpyt-8-36/'
TOOLS = 'docs/evidence/argv-guards-review-2026-10-25/tools/'
problems, counts = [], {}


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


def show(c, path):
    try:
        return git('show', f'{c}:{path}').decode()
    except subprocess.CalledProcessError:
        return None


def sha(b):
    return hashlib.sha256(b if isinstance(b, bytes) else b.encode()).hexdigest()


def tick(key, n=1):
    counts[key] = counts.get(key, 0) + n


ev = lambda name: json.loads(show(commit, EV + name))
digests = {'code diff': sha(git('diff', BASE, CODE)), 'evidence diff': sha(git('diff', BASE, commit)),
           'mut.py': sha(git('show', f'{commit}:{TOOLS}mut.py')), 'island_diff.py': sha(git('show', f'{commit}:{EV}island_diff.py')),
           'record.py': sha(git('show', f'{commit}:{EV}record.py')), 'summary.json': sha(git('show', f'{commit}:{EV}summary.json'))}
summary = ev('summary.json')
if summary['subject']['sha256'] != digests['code diff']:
    problems.append('summary subject digest differs from git diff base..code head')
if summary['mutRunnerSha256'] != digests['mut.py']:
    problems.append('summary mut.py digest differs')
if summary['islandDiff']['toolSha256'] != digests['island_diff.py']:
    problems.append('summary island_diff.py digest differs')

reviewer = {m['id']: m for m in ev('reviewer-specs.json')['mutants']}
own = {m['id']: m for m in ev('own-specs.json')['mutants']}
for i, m in reviewer.items():
    rows = json.loads(show(CODE, TOOLS + m['from']))['mutants']
    original = [s for s in rows if s['id'] == i]
    if len(original) != 1 or {k: v for k, v in m.items() if k != 'from'} != original[0]:
        problems.append(f'reviewer spec {i} is not its retained row')
    tick('reviewer specs equal to retained rows')


def check(name, at, specs):
    d = ev(name)
    if d['head'] != at:
        problems.append(f'{name}: recorded commit {d["head"]} is not {at}')
    out = {}
    for r in d['results']:
        s = specs[r['id']]
        if r.get('edits') != s['edits']:
            problems.append(f'{name} {r["id"]}: edits differ from spec')
        for e in s['edits']:
            text = show(at, e['file'])
            if 'old' in e:
                n = (text or '').count(e['old'])
                tick(f'{name}: old fragments occurring once at {at[:8]}', 1 if n == 1 else 0)
                tick(f'{name}: old fragments checked')
                if n != 1:
                    problems.append(f'{name} {r["id"]}: old occurs {n} times in {e["file"]} at {at[:8]}')
            else:
                tick(f'{name}: create paths checked')
                if text is not None:
                    problems.append(f'{name} {r["id"]}: {e["file"]} exists at {at[:8]}')
        want = 'survives' if r['exit'] == 0 else ('killed' if r['failed'] else 'error')
        if r['outcome'] != want or (r['outcome'] == 'killed' and not all(' > ' in f for f in r['failed'])):
            problems.append(f'{name} {r["id"]}: outcome {r["outcome"]} vs exit {r["exit"]}, {len(r["failed"])} failed rows')
        if not r['cleanAfter']:
            problems.append(f'{name} {r["id"]}: not clean after')
        out[r['id']] = r
    if set(out) != set(specs):
        problems.append(f'{name}: ran {len(out)} of {len(specs)} specs')
    tick(f'{name}: results', len(out))
    return out


b = check('reviewer-base.json', BASE, reviewer)
h = check('reviewer-head.json', CODE, reviewer)
o = check('own-head.json', CODE, own)
tally = lambda rs: {k: sum(1 for r in rs.values() if r['outcome'] == k) for k in ('killed', 'survives', 'error')}
counts['base tally'], counts['head tally'], counts['own tally'] = tally(b), tally(h), tally(o)
weaker, stronger, unchanged = [], [], []
for i in reviewer:
    bf, hf = set(b[i]['failed']), set(h[i]['failed'])
    if b[i]['outcome'] == 'killed' and (h[i]['outcome'] != 'killed' or not bf <= hf):
        weaker.append(i)
    elif (b[i]['outcome'], h[i]['outcome']) == ('survives', 'killed') or hf > bf:
        stronger.append(i)
    elif b[i]['outcome'] == h[i]['outcome'] and bf == hf:
        unchanged.append(i)
    else:
        weaker.append(i)
counts['weaker'], counts['stronger'], counts['unchanged'] = weaker, sorted(stronger), len(unchanged)
counts['head survivors'] = sorted(i for i in reviewer if h[i]['outcome'] != 'killed')
mine = {'base': {r['id']: r for r in json.load(open(my_base))['results']}, 'head': {r['id']: r for r in json.load(open(my_head))['results']}}
for i in summary['targets']:
    for side, lane in (('base', b), ('head', h)):
        me = mine[side][i]
        if (me['outcome'], sorted(me['failed'])) != (lane[i]['outcome'], sorted(lane[i]['failed'])):
            problems.append(f'target {i} at {side}: rev-528 {me["outcome"]} {me["failed"]} vs lane {lane[i]["outcome"]} {lane[i]["failed"]}')
        tick(f'targets agreeing with rev-528 at {side}')
print(json.dumps({'commit': commit, 'digests': digests, 'counts': counts, 'problems': problems}, indent=1))
sys.exit(1 if problems else 0)
