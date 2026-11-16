#!/usr/bin/env python3
"""Per-test durations of one vitest file, alone or inside a full suite run (syzygy-bpyt.4.13). Evidence tool, not a check and not authority.

usage: python3 -I scripts/measure_vitest_test_durations.py TREE --file FILE --project PROJECT --mode alone|full --runs N --out OUT.json [--profile]

TREE must be a checkout with `npm ci` run and its tracked files clean. Each run is `npx vitest run` with the JSON reporter and
`--testTimeout=600000 --hookTimeout=600000`, so a slow test is measured rather than cut at vitest's 5 s default (a test's own explicit
timeout still applies). `alone` runs FILE in PROJECT by itself; `full` runs every project, as `npx vitest run` does, and keeps FILE's
tests. For each run OUT.json records the start time, wall time, exit code, the 1-minute load average at the start and the end and its
minimum and maximum over 5 s samples, and every test of FILE with its status and the duration vitest reports.

With `--profile`, each run first applies the instrumentation below: the recorder testkit's `spawnSync` is wrapped to add up its wall
time and calls, and FILE gets a `beforeEach`/`afterEach` pair that prints, per test, the test's wall time between the hooks and the
render time and calls inside it. Both anchors are checked before either file is written. The instrumentation's `old` and `new`
fragments are in OUT.json.

Stopping: SIGINT, SIGTERM and SIGHUP only record that they arrived. No handler raises, so no stop signal, however many and however
timed, can interrupt starting vitest or the cleanup. A stop signal the script inherits ignored, as under `nohup`, stays ignored. A
stop takes effect at the next check: before instrumenting, before starting vitest, or within 0.05 s while vitest runs. The run in
progress then gets the cleanup below and is not recorded, and the script exits 128 + the first signal's number. Runs already
finished stay in OUT.json.

Cleanup, after every run however it ends short of a SIGKILL of the script: vitest runs in a session of its own, and its process
group gets SIGTERM, then SIGKILL after GRACE_SECONDS; a group found empty at any step is already gone. Then, even if ending the group
raised, each instrumented file that was written is restored with `git checkout`, itself run in a session of its own so that a
signal to the script's group cannot cut it short. A process that has left vitest's process group is out of the cleanup's reach.

It writes OUT.json and, only while a profiled run is in progress, the two instrumented files. A SIGKILL of the script itself can
leave them written and vitest running; the next run then refuses, since the tracked files are not clean."""
import datetime, hashlib, json, os, signal, subprocess, sys, tempfile, threading, time

GRACE_SECONDS = 10
stopped_by = []   # the stop signals received, in order
for _signal in (signal.SIGINT, signal.SIGTERM, signal.SIGHUP):
    if signal.getsignal(_signal) is not signal.SIG_IGN: signal.signal(_signal, lambda number, _frame: stopped_by.append(number))

SCRIPT = 'scripts/measure_vitest_test_durations.py'
TESTKIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
KIT_OLD = "import { spawnSync } from 'node:child_process';\n"
KIT_NEW = ("import { spawnSync as realSpawnSync } from 'node:child_process';\n"
           "const prof = ((globalThis as any).__prof ??= { spawnMs: 0, spawns: 0 });\n"
           "const spawnSync = ((...args: any[]) => { const t = performance.now(); try { return (realSpawnSync as any)(...args); } "
           "finally { prof.spawnMs += performance.now() - t; prof.spawns += 1; } }) as typeof realSpawnSync;\n")
FILE_OLD = "import { afterEach, beforeAll, describe, expect, it, vi } from 'vitest';\n"
FILE_NEW = FILE_OLD + (
    "import { afterEach as profAfter, beforeEach as profBefore } from 'vitest';\n"
    "let profSpawn = 0, profSpawns = 0, profT = 0;\n"
    "profBefore(() => { const p = (globalThis as any).__prof ?? { spawnMs: 0, spawns: 0 }; profSpawn = p.spawnMs; profSpawns = p.spawns; profT = performance.now(); });\n"
    "profAfter(ctx => { const p = (globalThis as any).__prof ?? { spawnMs: 0, spawns: 0 }; process.stdout.write(`PROF\\t${ctx.task.suite?.name ?? ''} > ${ctx.task.name}\\t"
    "${(performance.now() - profT).toFixed(0)}\\t${(p.spawnMs - profSpawn).toFixed(0)}\\t${p.spawns - profSpawns}\\n`); });\n")

args = sys.argv[1:]
def opt(name, default=None):
    return args[args.index(name) + 1] if name in args else default
if not args or args[0].startswith('--') or None in (opt('--file'), opt('--project'), opt('--mode'), opt('--out')) or opt('--mode') not in ('alone', 'full'):
    sys.exit(__doc__.split('\n\n')[1])
tree, test_file, project, mode, runs, out_path, profile = os.path.abspath(args[0]), opt('--file'), opt('--project'), opt('--mode'), int(opt('--runs', '1')), opt('--out'), '--profile' in args
sha = lambda b: hashlib.sha256(b).hexdigest()
def git(*a): return subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
def at_head(path): return subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=tree, capture_output=True, check=True).stdout
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tracked files not clean')

def instrument(written):
    """Checks both anchors before writing either file; appends each path to `written` before writing it."""
    texts = {}
    for path, old, new in ((TESTKIT, KIT_OLD, KIT_NEW), (test_file, FILE_OLD, FILE_NEW)):
        text = open(os.path.join(tree, path), encoding='utf8').read()
        if text.count(old) != 1: sys.exit(f'{path}: the instrumentation anchor occurs {text.count(old)} times')
        texts[path] = text.replace(old, new)
    for path, text in texts.items():
        written.append(path)
        open(os.path.join(tree, path), 'w', encoding='utf8').write(text)

def leave_if_stopped():
    if stopped_by:
        print(f'stopped by {signal.Signals(stopped_by[0]).name}: the run in progress, if any, was ended and restored and is not recorded',
              file=sys.stderr, flush=True)
        sys.exit(128 + stopped_by[0])

def end_group(proc):
    """SIGTERM to the run's process group, then SIGKILL to whatever of it is left after GRACE_SECONDS. A group found empty at any
    step, including between a probe and the signal after it, is already gone, never an error."""
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
        report = os.path.join(tmp, 'report.json')
        selection = ['--project', project, test_file] if mode == 'alone' else []
        command = ['npx', 'vitest', 'run', *selection, '--reporter=json', f'--outputFile={report}', '--testTimeout=600000', '--hookTimeout=600000']
        samples, stop = [os.getloadavg()[0]], threading.Event()
        def sample():
            while not stop.wait(5): samples.append(os.getloadavg()[0])
        sampler = threading.Thread(target=sample, daemon=True)
        started_at = datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds')
        load_start, t0 = os.getloadavg()[0], time.monotonic()
        written, proc, output = [], None, []
        sampler.start()
        try:
            if profile and not stopped_by: instrument(written)
            if not stopped_by:
                proc = subprocess.Popen(command, cwd=tree, stdout=subprocess.PIPE, stderr=subprocess.DEVNULL, text=True, start_new_session=True)
                reader = threading.Thread(target=lambda: output.append(proc.stdout.read()), daemon=True)
                reader.start()
                while (proc.poll() is None or reader.is_alive()) and not stopped_by: time.sleep(0.05)
        finally:
            stop.set(); sampler.join()
            try:
                if proc is not None: end_group(proc)
            finally:
                if written: subprocess.run(['git', 'checkout', '--', *written], cwd=tree, check=True)
        leave_if_stopped()
        wall, load_end = round(time.monotonic() - t0, 1), os.getloadavg()[0]
        data = json.load(open(report, encoding='utf8')) if os.path.exists(report) else {}
    stdout = output[0] if output else ''
    suites = [s for s in data.get('testResults', []) if os.path.relpath(s['name'], tree) == test_file]
    tests = [{'name': a['fullName'], 'status': a['status'], 'durationMs': None if a.get('duration') is None else round(a['duration'])}
             for s in suites for a in s.get('assertionResults', [])]
    prof = [dict(zip(('name', 'totalMs', 'spawnMs', 'spawns'), (p[1], int(p[2]), int(p[3]), int(p[4]))))
            for p in (line.split('\t') for line in stdout.split('\n') if line.startswith('PROF\t'))] if profile else None
    run = {'index': index, 'startedAt': started_at, 'command': ' '.join(command).replace(report, '<tmp>'), 'exitCode': proc.returncode,
           'wallSeconds': wall, 'load1': {'start': round(load_start, 2), 'end': round(load_end, 2), 'min': round(min(samples), 2), 'max': round(max(samples), 2), 'samples': len(samples)},
           'suiteTotals': {k: data.get(k) for k in ('numTotalTests', 'numPassedTests', 'numFailedTests', 'numPendingTests')},
           'fileTests': len(tests), 'tests': tests}
    if prof is not None: run['profile'] = prof
    print(f"run {index}: exit {proc.returncode}, {wall} s, load1 {run['load1']}, {len(tests)} tests of the file, "
          f"{sum(t['status'] == 'failed' for t in tests)} failed", flush=True)
    return run

out = {
    'schema': 'vitest-test-durations/1', 'bead': 'syzygy-bpyt.4.13',
    'text': 'Evidence record, not authority: the duration vitest reports for every test of one file, per run, with the load it ran under. Generated by the script named here; do not edit.',
    'script': {'path': SCRIPT, 'sha256': sha(open(__file__, 'rb').read())},
    'subject': {'commit': git('rev-parse', 'HEAD'), 'file': test_file, 'fileSha256': sha(at_head(test_file)), 'testkit': TESTKIT, 'testkitSha256': sha(at_head(TESTKIT))},
    'mode': mode, 'project': project, 'profile': profile, 'host': {'cores': os.cpu_count(), 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()},
    'instrumentation': [{'file': TESTKIT, 'old': KIT_OLD, 'new': KIT_NEW}, {'file': test_file, 'old': FILE_OLD, 'new': FILE_NEW}] if profile else None,
    'runs': [],
}
for i in range(1, runs + 1):
    out['runs'].append(one_run(i))
    with open(out_path, 'w', encoding='utf8') as f: f.write(json.dumps(out, indent=1) + '\n')
leave_if_stopped()
if git('status', '--porcelain', '--untracked-files=no'): sys.exit('tree not restored')
