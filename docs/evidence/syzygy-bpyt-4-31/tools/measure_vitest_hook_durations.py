#!/usr/bin/env python3
"""Per-suite beforeAll and afterAll durations of one vitest file run by itself (syzygy-bpyt.4.31). Evidence tool, not a check and
not authority. It is the hook-side companion of scripts/measure_vitest_test_durations.py, whose JSON reporter records no hook
time, and it follows that script's run discipline: a clean tracked tree, `--testTimeout=600000 --hookTimeout=600000` (a hook's own
explicit timeout still applies), the 1-minute load average sampled every 5 s, and the run's process group ended after each run.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/measure_vitest_hook_durations.py TREE --file FILE [--project PROJECT]
           [--config CONFIG] [--env NAME=VALUE ...] --runs N --out OUT.json

FILE may be a directory, which selects every test file under it. Each run is `npx vitest run [--config CONFIG] [--project PROJECT] FILE` with a reporter that reads the runner's own task results
when the run ends, and each `--env` set in its environment. The record also keeps every test's state and duration (which
includes its beforeEach and afterEach hooks), for a tier scripts/measure_vitest_test_durations.py cannot select: that script
runs only the root config's projects. For every suite (the file itself and each describe) whose children ran, beforeAllMs is the time from the
suite's start to its first child's start, and afterAllMs the time from its last child's end to the suite's end. A child is a test
or a nested suite; a test's duration includes its beforeEach and afterEach hooks, so the two figures hold only the suite's own
beforeAll and afterAll hooks and the runner's bookkeeping between them. A suite with no child that ran records nulls.

Each run also records the unhandled errors vitest hands its reporters (`onFinished`'s second argument), which make a run exit 1
with every test passing, and, for a run that exits nonzero, the last 40 lines of vitest's output.

The `--hookTimeout=600000` in each command does not reach a project: in vitest 3.2.7, cli-api's `overridesOptions` carries
`testTimeout` and not `hookTimeout`, so in a `--project` run every hook ran under its own explicit timeout or the project's
10000 ms default (the review R-GP-IMPL-TEST-TIMEOUTS-1, §3.4 and §3.13). No recorded duration is wrong as a duration, but a hook
past that budget records a failure rather than a time.

It writes only OUT.json. A SIGKILL of the script itself can leave vitest running."""
import datetime, hashlib, json, os, re, signal, subprocess, sys, tempfile, threading, time

GRACE_SECONDS = 10
TAIL_LINES = 40
ANSI = re.compile(r'\x1b\[[0-9;]*m')
SCRIPT = 'docs/evidence/syzygy-bpyt-4-31/tools/measure_vitest_hook_durations.py'
REPORTER = r"""import { writeFileSync } from 'node:fs';
const span = (task) => task.result && typeof task.result.startTime === 'number' && typeof task.result.duration === 'number'
  ? [task.result.startTime, task.result.startTime + task.result.duration] : null;
export default class {
  onFinished(files, errors) {
    const rows = [];
    const walk = (suite, names) => {
      const children = (suite.tasks ?? []).map(span).filter(Boolean);
      const own = span(suite);
      rows.push({
        file: suite.file?.filepath ?? suite.filepath ?? null, suite: names.join(' > ') || '(file)', tests: (suite.tasks ?? []).filter((t) => t.type === 'test').length,
        state: suite.result?.state ?? null,
        beforeAllMs: own && children.length ? Math.round(Math.min(...children.map((c) => c[0])) - own[0]) : null,
        afterAllMs: own && children.length ? Math.round(own[1] - Math.max(...children.map((c) => c[1]))) : null,
        suiteMs: own ? Math.round(own[1] - own[0]) : null,
      });
      for (const child of suite.tasks ?? []) if (child.type === 'suite') walk(child, [...names, child.name]);
    };
    const tests = [];
    const walkTests = (task, names) => {
      if (task.type === 'test') tests.push({ file: task.file?.filepath ?? null, name: [...names, task.name].join(' '), state: task.result?.state ?? task.mode,
        durationMs: typeof task.result?.duration === 'number' ? Math.round(task.result.duration) : null });
      for (const child of task.tasks ?? []) walkTests(child, task.type === 'suite' && task.name ? [...names, task.name] : names);
    };
    for (const file of files) { walk(file, []); for (const task of file.tasks) walkTests(task, []); }
    const unhandledErrors = (errors ?? []).map((e) => ({ name: e?.name ?? null, message: String(e?.message ?? e).slice(0, 500) }));
    writeFileSync(process.env.HOOK_DURATIONS_OUT, JSON.stringify({ rows, tests, unhandledErrors }));
  }
}
"""

stopped_by = []
for _signal in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
    if signal.getsignal(_signal) is not signal.SIG_IGN: signal.signal(_signal, lambda number, _frame: stopped_by.append(number))
args = sys.argv[1:]
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default
if not args or args[0].startswith('--') or None in (opt('--file'), opt('--out')):
    sys.exit(__doc__.split('\n\n')[1])
tree, test_file, project, config, runs, out_path = os.path.abspath(args[0]), opt('--file'), opt('--project'), opt('--config'), int(opt('--runs', '1')), opt('--out')
extra_env = dict(args[i + 1].split('=', 1) for i, a in enumerate(args) if a == '--env')
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*a): return subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tracked files not clean')

def end_group(proc):
    def alive():
        proc.poll()
        try: os.killpg(proc.pid, 0)
        except ProcessLookupError: return False
        return True
    def signal_group(number):
        try: os.killpg(proc.pid, number)
        except ProcessLookupError: pass
    if alive():
        signal_group(signal.SIGTERM)
        deadline = time.monotonic() + GRACE_SECONDS
        while alive() and time.monotonic() < deadline: time.sleep(0.2)
        if alive(): signal_group(signal.SIGKILL)
    proc.wait()

def one_run(index):
    with tempfile.TemporaryDirectory() as tmp:
        reporter, rows_path, log_path = os.path.join(tmp, 'hook-reporter.mjs'), os.path.join(tmp, 'rows.json'), os.path.join(tmp, 'output.log')
        open(reporter, 'w', encoding='utf8').write(REPORTER)
        command = ['npx', 'vitest', 'run', *(['--config', config] if config else []), *(['--project', project] if project else []), test_file,
                   f'--reporter={reporter}', '--testTimeout=600000', '--hookTimeout=600000']
        samples, stop = [os.getloadavg()[0]], threading.Event()
        def sample():
            while not stop.wait(5): samples.append(os.getloadavg()[0])
        sampler = threading.Thread(target=sample, daemon=True)
        started_at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
        load_start, t0 = os.getloadavg()[0], time.monotonic()
        proc = None
        sampler.start()
        try:
            if not stopped_by:
                with open(log_path, 'w', encoding='utf8') as log:
                    proc = subprocess.Popen(command, cwd=tree, stdout=log, stderr=subprocess.STDOUT, start_new_session=True,
                                            env={**os.environ, **extra_env, 'HOOK_DURATIONS_OUT': rows_path})
                    while proc.poll() is None and not stopped_by: time.sleep(0.05)
        finally:
            stop.set(); sampler.join()
            if proc is not None: end_group(proc)
        if stopped_by: sys.exit(128 + stopped_by[0])
        wall, load_end = round(time.monotonic() - t0, 1), os.getloadavg()[0]
        data = json.load(open(rows_path, encoding='utf8')) if os.path.exists(rows_path) else {'rows': [], 'tests': [], 'unhandledErrors': None}
        output = [ANSI.sub('', l).rstrip().replace(tmp, '<tmp>') for l in open(log_path, encoding='utf8', errors='replace')] if proc is not None else []
    mine = lambda r: r['file'] and (os.path.relpath(r['file'], tree) == test_file or os.path.relpath(r['file'], tree).startswith(test_file.rstrip('/') + '/'))
    relative = lambda r: {**r, 'file': os.path.relpath(r['file'], tree)} if os.path.isdir(os.path.join(tree, test_file)) else {k: v for k, v in r.items() if k != 'file'}
    suites = [relative(r) for r in data['rows'] if mine(r)]
    tests = [relative(t) for t in data['tests'] if mine(t)]
    run = {'index': index, 'startedAt': started_at, 'command': ' '.join(command).replace(reporter, '<tmp>/hook-reporter.mjs'), 'exitCode': proc.returncode,
           'wallSeconds': wall, 'load1': {'start': round(load_start, 2), 'end': round(load_end, 2), 'min': round(min(samples), 2), 'max': round(max(samples), 2), 'samples': len(samples)},
           'unhandledErrors': data.get('unhandledErrors'),
           **({'outputTail': [l for l in output if l][-TAIL_LINES:]} if proc.returncode != 0 else {}),
           'suites': suites, 'tests': tests}
    print(f"run {index}: exit {proc.returncode}, {wall} s, load1 {run['load1']}, " +
          ', '.join(f"{s['suite'][:40]} before {s['beforeAllMs']} after {s['afterAllMs']}" for s in suites if s['beforeAllMs'] is not None), flush=True)
    return run

at_head = lambda p: subprocess.run(['git', 'show', f'HEAD:{p}'], cwd=tree, capture_output=True, check=True).stdout
out = {
    'schema': 'vitest-hook-durations/1', 'bead': 'syzygy-bpyt.4.31',
    'text': 'Evidence record, not authority: the beforeAll and afterAll time of every suite of one vitest file, per run, with the load it ran under. Generated by the script named here; do not edit.',
    'script': {'path': SCRIPT, 'sha256': sha(open(__file__, 'rb').read())},
    'subject': {'commit': git('rev-parse', 'HEAD'), 'file': test_file,
                **({'treeId': git('rev-parse', f'HEAD:{test_file}')} if os.path.isdir(os.path.join(tree, test_file)) else {'fileSha256': sha(at_head(test_file))})},
    'project': project, 'config': config, 'env': extra_env, 'host': {'cores': os.cpu_count(), 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()},
    'runs': [],
}
for i in range(1, runs + 1):
    out['runs'].append(one_run(i))
    with open(out_path, 'w', encoding='utf8') as f: f.write(json.dumps(out, indent=1) + '\n')
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tracked files changed while the script ran')
