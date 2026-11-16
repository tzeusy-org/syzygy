"""rev-540: check the syzygy-bpyt.6.15 evidence against the git objects, independently of the lane's record.py.

Usage: python3 -I check_record.py <tree>   (tree: a clone with 6ef18990 and bb05df7e; nothing is written)
Every value is read from the committed blobs at 6ef18990 (git show), never from the working tree.
"""
import hashlib, json, subprocess, sys

tree = sys.argv[1]
EVID = '6ef18990d3704a4f16588966a6620fb47cd0f3f9'
CODE = 'f207d758eb11830eda2831caa911011e84a966b7'
BASE = 'bb05df7ea409039c5a6465e7179f9d0c66931ad3'
DIR = 'docs/evidence/syzygy-bpyt-6-15'
problems, notes = [], []


def git(*args, text=True):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, check=True, text=text).stdout


def blob(commit, path):
    return git('show', f'{commit}:{path}')


def js(name):
    return json.loads(blob(EVID, f'{DIR}/{name}'))


def expect(cond, msg):
    (notes if cond else problems).append(('ok   ' if cond else 'FAIL ') + msg)


# Commits and subjects.
expect(git('rev-parse', f'{EVID}^').strip() == CODE, 'evidence commit parent is the code commit')
expect(git('rev-parse', f'{CODE}^').strip() == BASE, 'code commit parent is BASE')
expect(git('merge-base', BASE, EVID).strip() == BASE, 'merge base is BASE')
expect(hashlib.sha256(git('diff', BASE, EVID, text=False)).hexdigest() == 'c6cd844feec49fb585f2235de362b18728020276ab690e5c432b6c55ffa6b393', 'full subject digest')
expect(hashlib.sha256(git('diff', BASE, CODE, text=False)).hexdigest() == 'a527579c89d53a6c38af519261fd4f6d918dbb1a27fdb9420db61dba3dd082fa', 'code subject digest')
expect(sorted(git('diff', '--name-only', CODE, EVID).split()) == sorted(p for p in git('ls-tree', '-r', '--name-only', EVID, DIR + '/').split()), 'evidence commit adds only the evidence directory')
expect(git('diff', '--name-only', CODE, EVID, '--', 'apps', 'packages') == '', 'evidence commit changes no apps/ or packages/ byte')

# Mutant records: commit, edits as specified, each old once at the recorded commit, outcome = f(exit, failed), clean, no timeout.
summary = js('summary.json')
specs = {}
for spec_file in ('host-pins-review-2026-10-27/rev535-specs.json', 'host-pins-review-2026-10-27/rev535-gate-specs.json'):
    for m in json.loads(blob(EVID, f'docs/evidence/{spec_file}'))['mutants']:
        specs.setdefault(m['id'], m['edits'])
for m in js('own-specs.json')['mutants']:
    specs[m['id']] = m['edits']
want_commit = {'v12-base.json': BASE, 'v12-head.json': CODE, 'v14-v15-base.json': BASE, 'v14-v15-head.json': CODE, 'own-head.json': CODE}
seen = {}
for name, commit in want_commit.items():
    d = js(name)
    expect(d['commit'] == commit, f'{name} ran at {commit[:8]}')
    for r in d['results']:
        rid = r['id']
        if rid not in specs:
            continue
        side = 'base' if commit == BASE else 'head'
        expect(r['edits'] == specs[rid], f'{name} {rid}: edits equal the spec')
        for e in r['edits']:
            n = blob(commit, e['file']).count(e['old'])
            expect(n == 1, f'{name} {rid}: old occurs {n}x in {e["file"]} at {commit[:8]}')
            expect(e['old'] != e['new'], f'{name} {rid}: new differs from old')
        failed_titles = sorted({f['title'] for f in r['failed']})
        derived = 'killed' if r['exit'] != 0 and ((r['failedTests'] or 0) > 0 or r['failedFiles'] > 0) else \
                  'survived' if r['exit'] == 0 and r['failedTests'] == 0 else 'error'
        expect(derived == r['outcome'], f'{name} {rid}: outcome {r["outcome"]} agrees with exit {r["exit"]}, failedTests {r["failedTests"]}')
        expect((r['outcome'] == 'killed') == bool(failed_titles), f'{name} {rid}: failed rows present iff killed')
        expect(r['failedTests'] == len(r['failed']) or r['failedFiles'] > 0, f'{name} {rid}: failedTests {r["failedTests"]} = {len(r["failed"])} failed rows')
        expect(r['cleanAfter'] and not any(f['timedOut'] for f in r['failed']), f'{name} {rid}: clean after, no timeout')
        expect(r['counts'] == [{'file': e['file'], 'oldCount': 1} for e in r['edits']], f'{name} {rid}: runner counted old once')
        s = summary['mutants'].get(f'{rid}@{side}')
        expect(s is not None and s['outcome'] == r['outcome'] and s['failed'] == failed_titles and s['totalTests'] == r['totalTests'],
               f'{name} {rid}: summary row equals the raw record')
        seen[f'{rid}@{side}'] = (r['outcome'], failed_titles, r['exit'], r['totalTests'])
expect(sorted(seen) == sorted(summary['mutants']), f'every summary mutant has a raw row ({len(seen)} raw, {len(summary["mutants"])} summary)')

# Gate differential.
g = js('gate-diff.json')
expect((g['base'], g['head']) == (BASE, CODE), 'gate-diff is BASE against the code commit')
expect(g['toolSha256'] == hashlib.sha256(blob(EVID, 'docs/evidence/syzygy-bpyt-7-3/tools/gate-diff.mjs').encode()).hexdigest(), 'gate-diff tool digest')
paths = sorted({p for c in (BASE, CODE) for p in git('ls-tree', '-r', '--name-only', '-z', c).split('\0') if p} | set(g['probes']))
expect(len(paths) == g['paths'] == 5598, f'paths {len(paths)} = {g["paths"]}')
expect(hashlib.sha256('\0'.join(paths).encode()).hexdigest() == g['pathsSha256'], 'paths digest re-derived from both trees and the probes')
expect(g['refused'] == {'base': 319, 'head': 328} and len(g['differing']) == 9, 'refused 319 -> 328, 9 differing')

# Surface version, by the formula in walkthrough-inputs.ts (pwbSurfaceVersion).
def surface(commit):
    trees = [git('rev-parse', f'{commit}:{p}').strip() for p in ('apps/three-surface-poc/src', 'packages/three-surface-poc-core/src')]
    return 'polaris@' + hashlib.sha256('\n'.join(trees).encode()).hexdigest()[:12]
sv = {'base': surface(BASE), 'code': surface(CODE), 'evidence': surface(EVID)}
expect(sv['base'] == 'polaris@e4fd613eed56' and sv['code'] == sv['evidence'] == 'polaris@3f91047d44cf', f'surface versions {sv}')
core_same = git('rev-parse', f'{BASE}:packages/three-surface-poc-core/src') == git('rev-parse', f'{CODE}:packages/three-surface-poc-core/src')
expect(core_same, 'core tree unchanged')

# Tests.
t, s, a = js('titles.json'), js('suite-head.json'), js('dist-absent-head.json')
expect((t['base'], t['head'], len(t['added']), len(t['removed'])) == (1134, 1136, 2, 0), f'titles {t["base"]} -> {t["head"]}, +{len(t["added"])} -{len(t["removed"])}')
expect((s['total'], s['passed'], s['failed'], s['skipped'], s['exit'], s['commit']) == (1138, 1136, 0, 2, 0, CODE), f'suite {s["total"]}/{s["passed"]}/{s["failed"]}/{s["skipped"]} exit {s["exit"]}')
expect((a['total'], a['passed'], a['failed'], a['exit'], a['commit'], a['distAfterRemoval']) == (37, 37, 0, 0, CODE, []), f'dist-absent {a["passed"]}/{a["total"]}')

# The bound-record claim: no tracked file at EVID carries either surface version, other than this bead's own evidence.
carriers = [l for l in git('grep', '-l', '-F', '-e', '3f91047d44cf', '-e', 'e4fd613eed56', EVID, '--').splitlines()] if True else []
expect(all(c.split(':', 1)[1].startswith(DIR + '/') for c in carriers), f'surface-version carriers at EVID: {[c.split(":",1)[1] for c in carriers]}')

for line in notes + problems:
    print(line)
print(f'{len(notes)} ok, {len(problems)} problems')
sys.exit(1 if problems else 0)
