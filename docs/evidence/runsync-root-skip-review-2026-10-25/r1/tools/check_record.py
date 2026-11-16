#!/usr/bin/env python3
"""rev-525 record check: docs/evidence/syzygy-bpyt-4-22/runsync-and-root-probe.json against the git objects.

usage: python3 -I check_record.py TREE REVIEWED_COMMIT [RECORD_FILE]

Reads every byte from git objects (git show), never the worktree. Prints one line per check, `OK` or `FAIL`, and a final count."""
import hashlib, json, re, subprocess, sys

tree, reviewed = sys.argv[1], sys.argv[2]
REC = 'docs/evidence/syzygy-bpyt-4-22/runsync-and-root-probe.json'
TOOL = 'docs/evidence/syzygy-bpyt-4-22/tools/runsync_and_root_probe.py'
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, check=True).stdout
show = lambda commit, path: git('show', f'{commit}:{path}')
sha = lambda b: hashlib.sha256(b).hexdigest()
results = []
def check(name, ok, detail=''):
    results.append(ok)
    print(f"{'OK  ' if ok else 'FAIL'} {name}{': ' + detail if detail else ''}")

# An optional third argument names a record file to check instead of the git blob: only for the rule-6 selftest (selftest.py).
rec = json.loads(open(sys.argv[3]).read() if len(sys.argv) > 3 else show(reviewed, REC))
commit, base = rec['commit'], rec['baseCommit']
check('record commit resolves', git('rev-parse', commit).decode().strip() == commit, commit)
check('record commit is an ancestor of the reviewed commit',
      subprocess.run(['git', 'merge-base', '--is-ancestor', commit, reviewed], cwd=tree).returncode == 0)
check('baseCommit is the merge base of reviewed and main 71334012',
      git('merge-base', reviewed, '71334012548cccd46a5a95e313a6014da87c8e3c').decode().strip() == base, base)
between = git('diff', '--name-only', commit, reviewed).decode().split()
check('files changed between the record commit and the reviewed commit', between == [REC], ' '.join(between))
check('tool path', rec['tool']['path'] == TOOL)
for c in (commit, reviewed):
    check(f'tool sha256 at {c[:8]}', sha(show(c, TOOL)) == rec['tool']['sha256'], rec['tool']['sha256'][:12])
for path, d in rec['files'].items():
    check(f'{path.split("/")[-1]} base sha256', sha(show(base, path)) == d['base'])
    check(f'{path.split("/")[-1]} head sha256 at record commit', sha(show(commit, path)) == d['head'])
    check(f'{path.split("/")[-1]} head sha256 at reviewed commit', sha(show(reviewed, path)) == d['head'])

for run in rec['mutants']:
    mid = run['case']
    mpath = run['mutantRecord']['path']
    raw = show(commit, mpath)
    check(f'{mid} mutant record sha256', sha(raw) == run['mutantRecord']['sha256'], mpath)
    check(f'{mid} stored edits equal the 8.2 record edits', json.loads(raw)['edits'] == run['edits'])
    for e in run['edits']:
        for c, label in ((commit, 'record commit'), (reviewed, 'reviewed commit'), (base, 'base')):
            n = show(c, e['file']).count(e['old'].encode())
            check(f'{mid} old occurs once in {e["file"]} at {label}', n == 1, f'{n}')
    failed = [t for t in run['tests'] if t['status'] == 'failed']
    timed = [t for t in failed if 'ETIMEDOUT' in (t['failure'] or '')]
    check(f'{mid} exit non-zero', run['exitCode'] not in (0, None), str(run['exitCode']))
    check(f'{mid} failedRows recomputed', run['failedRows'] == len(failed), f"{run['failedRows']} vs {len(failed)}")
    check(f'{mid} timedOutRows recomputed', run['timedOutRows'] == len(timed), f"{run['timedOutRows']} vs {len(timed)}")
    check(f'{mid} every failed row timed out', len(timed) == len(failed))
    check(f'{mid} every failed row under timeout + 5 s', all(t['durationMs'] < 25_000 for t in failed),
          ', '.join(f"{t['durationMs']}" for t in failed))
    check(f'{mid} no 7477 listener seen, none before', not run['port7477ListenersSeen'] and run['port7477ListenersBefore'] == 0,
          f"samples {run['samples']}")
    check(f'{mid} no survivors', not run['survivors'])
    check(f'{mid} not killed at deadline', not run['killedAtDeadline'])
    check(f'{mid} distCarriesMutant', run['distCarriesMutant'] is True)
    print(f"     {mid}: exit {run['exitCode']}, wall {run['wallSeconds']} s, samples {run['samples']}, own ports "
          f"{run['portsTheRunListenedOn']}, build exit {run['build']['exitCode']}, type errors {len(run['build']['typeErrors'])}, "
          f"failed {[(re.sub(r'.*unchanged ', '', t['name'])[:30], t['durationMs']) for t in failed]}")

for run in rec['unmutated']:
    failed = [t for t in run['tests'] if t['status'] == 'failed']
    check(f"unmutated {run['case']}: exit 0, no failed, {len(run['tests'])} tests", run['exitCode'] == 0 and not failed)
titles = lambda run: [(t['name'], t['status']) for t in run['tests']]
pops = rec['populations']
check('populations recomputed', pops == {'baseTests': len(rec['unmutated'][0]['tests']), 'headTests': len(rec['unmutated'][1]['tests']),
                                         'sameTitlesAndStatuses': titles(rec['unmutated'][0]) == titles(rec['unmutated'][1])}, str(pops))
ROW = 'rejects an unreadable state-dir path as named invalid before writes or a listener'
for run, wanted in zip(rec['rootShim'], (('skipped', 'pending'), ('passed',), ('passed',))):
    rows = [t for t in run['tests'] if t['name'].endswith(ROW)]
    others = [t['status'] for t in run['tests'] if not t['name'].endswith(ROW)]
    check(f"{run['case']}: row {rows[0]['status'] if len(rows) == 1 else len(rows)}, others {sorted(set(others))}, exit {run['exitCode']}",
          len(rows) == 1 and rows[0]['status'] in wanted and run['exitCode'] == 0 and run['row'] == rows[0]['status'])
check('allPass recomputed', rec['allPass'] == (all(r['passes'] for r in rec['unmutated'] + rec['mutants'] + rec['rootShim'])
                                                and pops['sameTitlesAndStatuses']))
# PR-body figures that are not checks of the record's own consistency, reported for the reader.
RUNSYNC = ('prints the usage', 'is refused with exit 1', 'governed plane is refused', '` alone', '`dossier status', '`dossier render')
for run in rec['unmutated']:
    rows = [t for t in run['tests'] if any(k in t['name'] for k in RUNSYNC)]
    slow = max(rows, key=lambda t: t['durationMs'])
    print(f"     unmutated {run['case']}: {len(rows)} runSync rows, slowest {slow['durationMs']} ms ({slow['name'][-60:]})")
for run in rec['mutants']:
    print(f"     {run['case']}: mean sample interval {run['wallSeconds'] / run['samples']:.2f} s over {run['samples']} samples")
text = show(reviewed, REC).decode()
print(f"     record mentions '341': {'341' in text}; mentions a load average (load1/loadavg/load average): {any(k in text.lower() for k in ('load1', 'loadavg', 'load average'))}")
print(f'{sum(results)} OK, {len(results) - sum(results)} FAIL, of {len(results)} checks')
