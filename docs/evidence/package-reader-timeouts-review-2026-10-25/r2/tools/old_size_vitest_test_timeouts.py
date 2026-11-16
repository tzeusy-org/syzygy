#!/usr/bin/env python3
"""Explicit per-test timeouts for one vitest file, sized from measured durations (syzygy-bpyt.4.13). Evidence tool, not authority.

usage: python3 -I scripts/size_vitest_test_timeouts.py TREE --file FILE --project PROJECT --record R.json [--record ...]
           [--report REPORT.json COMMIT LOAD1-START LOAD1-END ...] [--after A.json ...] --out OUT.json [--check]

The rule: a test whose worst measured duration exceeds THRESHOLD_MS gets an explicit timeout of that worst case x MARGIN, rounded up
to a whole STEP_MS; every other test keeps the configured default. The worst case is the largest duration over every observation of
the test: the runs in each `--record` (written by scripts/measure_vitest_test_durations.py) and each `--report` (a vitest JSON
reporter output, with the commit it ran at and the 1-minute load at its start and end, given on the command line). A test that failed
in a run stopped early, so its duration there is a lower bound and is marked so. `--after` records are not inputs to the rule: each
test's worst duration in them is listed beside its timeout.

The denominator is every test vitest collects from FILE in TREE (all of them skipped, so no test or hook runs), with the timeout each
carries. With `--check`, the script exits 1 unless each sized test carries exactly its sized timeout, every other test carries the
default, and every collected test was measured in at least one `--record`. It writes only OUT.json."""
import datetime, hashlib, json, math, os, subprocess, sys, tempfile

THRESHOLD_MS, MARGIN, STEP_MS = 2500, 3, 5000
RULE = (f'A test whose worst measured duration exceeds {THRESHOLD_MS} ms (half the 5000 ms default) gets an explicit timeout of that worst case x {MARGIN}, '
        f'rounded up to a whole {STEP_MS} ms. The worst case is the largest duration over every observation listed for the test, under load or inside a full run; '
        'a duration from a run in which the test failed is a lower bound. Every other test keeps the configured default.')
REPORTER = r"""import { writeFileSync } from 'node:fs';
export default class {
  onFinished(files) {
    const rows = [];
    const walk = (task, names) => {
      if (task.type === 'test') rows.push({ file: task.file?.filepath ?? null, name: [...names, task.name].join(' '), timeout: task.timeout });
      for (const child of task.tasks ?? []) walk(child, task.type === 'suite' ? [...names, task.name] : names);
    };
    for (const file of files) for (const task of file.tasks) walk(task, []);
    writeFileSync(process.env.SIZE_COLLECT_OUT, JSON.stringify(rows));
  }
}
"""

args = sys.argv[1:]
def opts(name, arity=1):
    found = []
    for i, a in enumerate(args):
        if a == name: found.append(args[i + 1:i + 1 + arity] if arity > 1 else args[i + 1])
    return found
if not args or args[0].startswith('--') or not opts('--file') or not opts('--project') or not opts('--record') or not opts('--out'):
    sys.exit(__doc__.split('\n\n')[1])
tree, test_file, project, out_path, check = os.path.abspath(args[0]), opts('--file')[0], opts('--project')[0], opts('--out')[0], '--check' in args
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()

def collect():
    with tempfile.TemporaryDirectory() as tmp:
        reporter, rows = os.path.join(tmp, 'collect-reporter.mjs'), os.path.join(tmp, 'rows.json')
        open(reporter, 'w', encoding='utf8').write(REPORTER)
        done = subprocess.run(['npx', 'vitest', 'run', '--project', project, test_file, f'--reporter={reporter}', '-t', 'syzygy-bpyt.4.13: a name no test has'],
                              cwd=tree, capture_output=True, text=True, env={**os.environ, 'SIZE_COLLECT_OUT': rows})
        if done.returncode != 0 or not os.path.exists(rows): sys.exit(f'collection failed ({done.returncode}): {done.stderr[-2000:]}')
        found = [r for r in json.load(open(rows, encoding='utf8')) if r['file'] and os.path.relpath(r['file'], tree) == test_file]
    if len({r['name'] for r in found}) != len(found): sys.exit('two collected tests share a name; durations cannot be told apart')
    return found

observations = {}
def observe(name, row):
    observations.setdefault(name, []).append(row)
inputs = []
for path in opts('--record'):
    record = json.load(open(path, encoding='utf8'))
    if record.get('schema') != 'vitest-test-durations/1' or record['subject']['file'] != test_file: sys.exit(f'{path}: not a duration record of {test_file}')
    inputs.append({'kind': 'record', 'path': path, 'sha256': sha(path), 'commit': record['subject']['commit'], 'mode': record['mode'], 'runs': len(record['runs'])})
    for run in record['runs']:
        for t in run['tests']:
            if t['durationMs'] is not None:
                observe(t['name'], {'input': path, 'run': run['index'], 'commit': record['subject']['commit'], 'mode': record['mode'], 'load1': run['load1'],
                                    'durationMs': t['durationMs'], 'lowerBound': t['status'] != 'passed'})
for path, commit, load_start, load_end in opts('--report', 4):
    report = json.load(open(path, encoding='utf8'))
    suites = [s for s in report['testResults'] if s['name'].endswith('/' + test_file)]
    if len(suites) != 1: sys.exit(f'{path}: {len(suites)} results for {test_file}')
    tests = suites[0]['assertionResults']
    inputs.append({'kind': 'vitest-report', 'path': path, 'sha256': sha(path), 'commit': commit, 'load1': {'start': float(load_start), 'end': float(load_end)},
                   'startTime': datetime.datetime.fromtimestamp(report['startTime'] / 1000, datetime.timezone.utc).isoformat(timespec='seconds'), 'tests': len(tests)})
    for t in tests:
        if t.get('duration') is not None:
            observe(t['fullName'], {'input': path, 'commit': commit, 'mode': 'report', 'load1': {'start': float(load_start), 'end': float(load_end)},
                                    'durationMs': round(t['duration']), 'lowerBound': t['status'] != 'passed'})
after = {}
for path in opts('--after'):
    record = json.load(open(path, encoding='utf8'))
    inputs.append({'kind': 'after', 'path': path, 'sha256': sha(path), 'commit': record['subject']['commit'], 'mode': record['mode'], 'runs': len(record['runs'])})
    for run in record['runs']:
        for t in run['tests']:
            if t['durationMs'] is not None and t['durationMs'] >= after.get(t['name'], {}).get('durationMs', -1):
                after[t['name']] = {'durationMs': t['durationMs'], 'status': t['status'], 'input': path, 'run': run['index'], 'load1': run['load1']}

collected = collect()
names = [r['name'] for r in collected]
default = max(set(r['timeout'] for r in collected), key=[r['timeout'] for r in collected].count)
problems = [f'observed but not collected: {n}' for n in sorted(set(observations) - set(names))]
rows = []
for r in collected:
    seen = observations.get(r['name'], [])
    if not any(o['mode'] != 'report' for o in seen): problems.append(f'collected but measured in no --record: {r["name"]}')
    worst = max(seen, key=lambda o: o['durationMs'], default=None)
    sized = worst is not None and worst['durationMs'] > THRESHOLD_MS
    timeout = math.ceil(worst['durationMs'] * MARGIN / STEP_MS) * STEP_MS if sized else None
    if (timeout or default) != r['timeout']: problems.append(f'carries {r["timeout"]} ms, the rule gives {timeout or default} ms: {r["name"]}')
    rows.append({'name': r['name'], 'worstMs': worst and worst['durationMs'], 'worstIsLowerBound': worst and worst['lowerBound'], 'worstFrom': worst and {k: worst[k] for k in ('input', 'commit', 'mode', 'load1') if k in worst},
                 'sized': sized, 'timeoutMs': timeout, 'collectedTimeoutMs': r['timeout'], 'afterWorst': after.get(r['name']),
                 'observations': sorted(o['durationMs'] for o in seen)})
rows.sort(key=lambda row: -(row['worstMs'] or 0))
out = {
    'schema': 'vitest-test-timeout-sizing/1', 'bead': 'syzygy-bpyt.4.13',
    'text': 'Evidence record, not authority: the per-test timeouts the stated rule gives for one vitest file, from the measured durations listed. Generated by the script named here; do not edit.',
    'script': {'path': 'scripts/size_vitest_test_timeouts.py', 'sha256': sha(__file__)},
    'subject': {'commit': git('rev-parse', 'HEAD'), 'dirty': bool(git('status', '--porcelain', '--untracked-files=no')), 'file': test_file, 'fileSha256': sha(os.path.join(tree, test_file)), 'project': project},
    'rule': {'text': RULE, 'thresholdMs': THRESHOLD_MS, 'margin': MARGIN, 'stepMs': STEP_MS, 'defaultMs': default},
    'inputs': inputs,
    'denominator': {'collected': len(collected), 'measured': sum(1 for row in rows if row['worstMs'] is not None), 'sized': sum(row['sized'] for row in rows),
                    'sizedFromALowerBound': sum(bool(row['sized'] and row['worstIsLowerBound']) for row in rows)},
    'check': {'problems': problems, 'holds': not problems},
    'tests': rows,
}
with open(out_path, 'w', encoding='utf8') as f: f.write(json.dumps(out, indent=1) + '\n')
print(f"{len(collected)} collected, {out['denominator']['sized']} sized ({out['denominator']['sizedFromALowerBound']} from a lower bound), {len(problems)} problems")
for row in rows:
    if row['sized']: print(f"  {row['timeoutMs']:>6} ms  worst {row['worstMs']} ms{' (lower bound)' if row['worstIsLowerBound'] else ''}  carries {row['collectedTimeoutMs']}  {row['name'][:110]}")
for p in problems[:40]: print('  problem:', p[:200])
if check and problems: sys.exit(1)
