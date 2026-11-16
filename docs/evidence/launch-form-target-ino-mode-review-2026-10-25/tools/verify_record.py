"""rev-526: independent check of the 8.35 mutant records against git objects (rules 4, 6, 11). Reads git objects only.
Usage: python3 -I verify_record.py <clone> <reviewed commit>"""
import hashlib, json, subprocess, sys, collections
CL, HEAD = sys.argv[1], sys.argv[2]
EV = 'docs/evidence/launch-form-target-ino-mode-2026-10-25'
FIX, BASE, PRE = '2a21f2b0e95e3731a3f975a0cbad8aaccd3a9b3b', '71334012548cccd46a5a95e313a6014da87c8e3c', 'df6046a153fe130202abdf6bd3045a79ba143879'
READER, TEST = 'packages/polaris-dossier/src/launched.ts', 'packages/polaris-dossier/src/launched.test.ts'
TOOL = 'docs/evidence/launch-form-target-ctime-review-2026-10-25/tools/rev523_mutants.py'
ROW = 'launch forms in a run whose marker is unreadable count neither a declared form nor a syzygy-launched one: '
LINK = 'a symbolic link to the marker Syzygy writes'
def git(*a): return subprocess.run(['git', '-C', CL, *a], capture_output=True, check=True).stdout
def sha(b): return hashlib.sha256(b).hexdigest()
problems = []; table = collections.defaultdict(lambda: collections.Counter()); rowsets = collections.defaultdict(set); nruns = 0
toolsha = sha(git('show', f'{HEAD}:{TOOL}'))
for fs in ('tmpfs', 'ext4'):
    for part in 'abc':
        name = f'mutants-{part}-{fs}.json'
        d = json.loads(git('show', f'{HEAD}:{EV}/{name}'))
        exp_base = PRE if part == 'c' else BASE
        hdr = {k: d.get(k) for k in ('reviewedCommit', 'base', 'kernel', 'node', 'tmpRoot', 'statF', 'dfT', 'toolSha256', 'trackedTreeCleanAfter', 'recordFragmentsFrom')}
        print(name, json.dumps(hdr))
        if d['reviewedCommit'] != FIX: problems.append(f'{name}: commit {d["reviewedCommit"]}')
        if d['base'] != exp_base: problems.append(f'{name}: base {d["base"]}')
        if d['toolSha256'] != toolsha: problems.append(f'{name}: tool digest')
        if not d['kernel'] or not d['statF'] or not d['dfT']: problems.append(f'{name}: kernel/fs missing')
        want = {'tmpfs': ('tmpfs', 'tmpfs'), 'ext4': ('ext2/ext3', 'ext4')}[fs]
        if (d['statF'], d['dfT']) != want: problems.append(f'{name}: fs names {d["statF"]} {d["dfT"]}')
        sides = {'fix': git('show', f'{FIX}:{TEST}'), 'base': git('show', f'{d["base"]}:{TEST}')}
        readers = {'fix': git('show', f'{FIX}:{READER}'), 'base': git('show', f'{d["base"]}:{READER}')}
        for r in d['runs']:
            nruns += 1
            tag = f'{name} {r["id"]} {r["side"]} {r["rep"]}'
            if r['testSha256'] != sha(sides[r['side']]): problems.append(f'{tag}: test digest')
            for e in r['edits']:
                src = (readers if e['file'] == READER else sides)[r['side']].decode()
                if e['file'] not in (READER, TEST): problems.append(f'{tag}: edits {e["file"]}')
                if src.count(e['old']) != 1: problems.append(f'{tag}: old occurs {src.count(e["old"])} in {e["file"]} at {r["side"]}')
                if e['old'] == e['new']: problems.append(f'{tag}: old == new')
            failed_names = [t['test'] for t in r['failedTests']]
            c = r['counts']
            if c is None: problems.append(f'{tag}: no counts'); continue
            if c['numFailedTests'] != len(failed_names): problems.append(f'{tag}: failed count {c["numFailedTests"]} vs {len(failed_names)} listed')
            if c['numPassedTests'] + c['numFailedTests'] != c['numTotalTests']: problems.append(f'{tag}: counts do not sum {c}')
            exp_outcome = 'killed' if (r['exitCode'] is None or (r['exitCode'] != 0 and failed_names)) else 'survived'
            if r['outcome'] != exp_outcome: problems.append(f'{tag}: outcome {r["outcome"]} vs exit {r["exitCode"]} failed {len(failed_names)}')
            if (r['exitCode'] == 0) != (len(failed_names) == 0): problems.append(f'{tag}: exit {r["exitCode"]} with {len(failed_names)} failed')
            rows = sorted(n[len(ROW):] for n in failed_names if n.startswith(ROW))
            if rows != r['failedRows']: problems.append(f'{tag}: failedRows mismatch')
            if (LINK in rows) != r['linkRowFailed']: problems.append(f'{tag}: linkRowFailed mismatch')
            if not r['restored']: problems.append(f'{tag}: not restored')
            if not r['oldOccursOnce']: problems.append(f'{tag}: oldOccursOnce false')
            at = FIX[:8] if r['side'] == 'fix' else d['base'][:8]
            key = (r['id'], at, fs)
            table[key][r['outcome']] += 1
            table[key]['runs'] += 1
            if r['linkRowFailed'] and failed_names == [ROW + LINK]: table[key]['linkRowOnly'] += 1
            rowsets[key] |= set(failed_names)
        if not d['trackedTreeCleanAfter']: problems.append(f'{name}: tree not clean after')
print(f'runs checked: {nruns}')
for k in sorted(table):
    if k[0].startswith(('X3c', 'X3d', 'X5', 'unmutated', 'M-')):
        print(k, dict(table[k]))
print('problems:', len(problems))
for p in problems[:40]: print(' ', p)
