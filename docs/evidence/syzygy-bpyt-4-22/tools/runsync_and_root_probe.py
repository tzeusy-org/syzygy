#!/usr/bin/env python3
"""Rule-6 evidence for syzygy-bpyt.4.22 and syzygy-bpyt.4.25, two system tests in packages/cap1-system. Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-22/tools/runsync_and_root_probe.py TREE BASE_COMMIT OUT.json [PRIOR_COMMIT]

TREE must be a checkout with `npm ci` run and its tracked files clean. BASE_COMMIT is the commit the branch was cut from.
PRIOR_COMMIT, if given, is an earlier head of the branch whose daemon-entry-unchanged.system.test.ts the P1 control runs. The suite
runs the built daemon, so the tool runs `npm run build` first and again after each mutant. Every run is `npx vitest run --config
packages/cap1-system/vitest.config.ts` with the JSON reporter, in a session of its own. The cases:

- base, head: both touched files as at BASE_COMMIT, then as at HEAD, unmutated. Each must exit 0 with no failed test. The record
  keeps every test's title and status, and compares the two populations.
- R5, R9, P1, P2: source mutants, each applied, built, and then daemon-entry-unchanged.system.test.ts runs at HEAD. R5 and R9 are
  the argv-reader mutants of docs/evidence/syzygy-bpyt-8-2/mutants/: each edit's `old` and `new` are read from that record, whose
  sha256 is stored. P1 drops the default port from apps/syzygy/src/main.ts's port resolution, and P2 reads SYZYGY_PORT before
  --port there (round 1 of the PR 525 review, F1). Each edit's `old` must occur exactly once. A mutant that does not type-check
  still counts if `tsc -b` emitted it: the build's exit code and type errors are recorded, and each edit's `new` fragment,
  whitespace collapsed, must be in the emitted dist file. A mutant passes (is killed) when vitest exits non-zero within 300 s and
  the failed rows are exactly the rows named for it: for R5, R9 and P2 each by ETIMEDOUT (runSync's timeout) in its failure
  message, for P1 each without one. Every failed row must take under the timeout plus 5 s. While a run goes, `ss -ltnpH` is
  sampled, with a 0.25 s sleep between samples: no socket may listen on port 7477, and the record lists the ports that the run's
  own processes listened on, the mean interval between samples and load1 at the start and end. 3 s after vitest exits, no
  process of the run may survive. Survivors are found by walking /proc parent links from vitest's PID and by vitest's session.
- P1-at-prior, with PRIOR_COMMIT: P1 again, with daemon-entry-unchanged.system.test.ts as at PRIOR_COMMIT. It passes when the
  mutant survives there (vitest exits 0, no row failed): the control that shows the HEAD file is what kills P1.
- root-shim, root-shim-base: state-dir.system.test.ts, filtered with -t to the mode-000 row, with NODE_OPTIONS importing a shim
  that makes process.getuid() return 0. At HEAD the row must be skipped. At BASE_COMMIT, which has no skipIf, it must run and
  pass. This checks the skip's condition only. The process is not root, so chmod 000 still blocks it, and the run says nothing
  about the row under a real root.
- root-control: the same filter at HEAD without the shim. The row must run and pass.

Each case writes back the files it changed, and rebuilds after a mutant, however it ends short of a SIGKILL of the tool. Each
case's record stores its command, its edits as old and new fragments, every test's status and duration, and its findings. The
record also cites, by line, the runs of round 1 of the PR 525 review that mutate the change's own predicates. This tool does not
re-run those."""
import hashlib, json, os, re, signal, subprocess, sys, tempfile, time

tree, base_commit, out_path = os.path.realpath(sys.argv[1]), sys.argv[2], sys.argv[3]
prior_commit = sys.argv[4] if len(sys.argv) > 4 else None
ENTRY_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATE_TEST = 'packages/cap1-system/src/state-dir.system.test.ts'
MUTANTS = 'docs/evidence/syzygy-bpyt-8-2/mutants'
ROW = 'rejects an unreadable state-dir path as named invalid before writes or a listener'
GOVERNED = 'a state directory inside the governed plane is refused with the same message'
refused = lambda argv: f'{argv} is refused with exit 1 and the same message'
PORT_LINE = "const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);"
P1 = [{'file': 'apps/syzygy/src/main.ts', 'old': PORT_LINE, 'new': "const portText = flags.get('--port') ?? env['SYZYGY_PORT'];"}]
P2 = [{'file': 'apps/syzygy/src/main.ts', 'old': PORT_LINE,
       'new': "const portText = env['SYZYGY_PORT'] ?? flags.get('--port') ?? String(DEFAULT_PORT);"}]
# (case, an 8.2 mutant record's name or the edits, how it must fail, the rows that must be exactly the failed ones, test file commit)
CASES = [('R5', 'R5-positional-taken-when-refused', 'timeout', [refused('["--port","0","dossier"]'), refused('["Dossier"]')], None),
         ('R9', 'R9-missing-value-unchecked', 'timeout', [refused('["--port"]')], None),
         ('P1', P1, 'fails', [GOVERNED], None),
         ('P2', P2, 'timeout', [refused('["--port","70000"]')], None)]
if prior_commit: CASES.append(('P1-at-prior', P1, 'survives', [], prior_commit))
REVIEW_RUNS = {
    'review': 'R-GP-IMPL-RUNSYNC-ROOT-SKIP-1, round 1, over f7bbb93a005b45c2866d8a9993afbca44cd1a34f',
    'raw': {'name': 'R-GP-IMPL-RUNSYNC-ROOT-SKIP-1-RAW.md',
            'sha256': '77a873ebca6497b7d17c04f5f39c15c71d4c12cbbac3b55b0475bedb01028535',
            'retained': 'by the coordinator under docs/reviews/ when PR 525 lands'},
    'text': "The reviewer's runs that mutate this change's own predicates, cited as their per-predicate evidence. Each outcome is "
            "quoted from the raw at the line named. This tool did not run them, and they ran against f7bbb93a's test file.",
    'runs': [
        {'case': 'base-R5-hang', 'predicate': 'the runSync timeout (base test file has none)', 'rawLine': 244, 'outcome': '**hangs**'},
        {'case': 'base-R5', 'predicate': 'the runSync timeout and SYZYGY_PORT=0 (base test file has neither)', 'rawLine': 245,
         'outcome': 'Then **`Dossier` bound 127.0.0.1:7477**'},
        {'case': 'base-R9', 'predicate': 'SYZYGY_PORT=0 (base test file has none)', 'rawLine': 246,
         'outcome': '**`--port` bound 127.0.0.1:7477**'},
        {'case': 'T1-no-port-env-R5', 'predicate': 'SYZYGY_PORT=0 on runSync rows', 'rawLine': 247,
         'outcome': '**killed by the 7477 predicate**'},
        {'case': 'T2-no-timeout-R5', 'predicate': "runSync's timeout and killSignal", 'rawLine': 248,
         'outcome': '**killed by the hang predicate**'},
        {'case': 'T3-no-throw-R5', 'predicate': "runSync's throw on result.error", 'rawLine': 249,
         'outcome': "**equivalent for pass/fail** ... Only the lane's `timedOutRows` predicate kills it."},
        {'case': 'S1-skip-always-noshim', 'predicate': "the root skip's condition", 'rawLine': 266,
         'outcome': "S1, `skipIf(true)` as the real user: `{'passed': 5, 'skipped': 1}`;"},
        {'case': 'S2-skip-inverted', 'predicate': "the root skip's condition", 'rawLine': 267,
         'outcome': "S2, `getuid?.() !== 0`: as the real user `{'passed': 5, 'skipped': 1}`, under the shim `{'passed': 6}`."},
    ]}
TIMEOUT_MS, DEADLINE_S, PORT = 20_000, 300, '7477'
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
status = lambda: git('status', '--porcelain', '--untracked-files=no')
sha = lambda data: hashlib.sha256(data).hexdigest()
load1 = lambda: float(open('/proc/loadavg').read().split()[0])
if status(): sys.exit('tracked files not clean')
head = git('rev-parse', 'HEAD').strip()
base = git('rev-parse', base_commit).strip()
prior = git('rev-parse', prior_commit).strip() if prior_commit else None
at = lambda commit, path: subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=tree, capture_output=True, check=True).stdout

def build(allow_errors=False):
    """`npm run build`; with allow_errors, a type error is returned rather than fatal (tsc -b still emits)."""
    done = subprocess.run(['npm', 'run', 'build'], cwd=tree, capture_output=True, text=True)
    errors = [line for line in (done.stdout + done.stderr).split('\n') if ': error TS' in line]
    if done.returncode and not allow_errors: sys.exit(f'npm run build exited {done.returncode}:\n{done.stdout[-2000:]}{done.stderr[-2000:]}')
    return {'exitCode': done.returncode, 'typeErrors': errors}

def stat(pid):
    try: text = open(f'/proc/{pid}/stat').read()
    except OSError: return None
    f = text[text.rindex(')') + 2:].split()
    return {'ppid': int(f[1]), 'sid': int(f[3]), 'start': int(f[19])}
def procs():
    found = {}
    for p in os.listdir('/proc'):
        if p.isdigit() and (s := stat(int(p))) is not None: found[int(p)] = s
    return found
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace').strip()[:120]
    except OSError: return None
def walk(root, seen):
    ps = procs()
    children = {}
    for pid, s in ps.items(): children.setdefault(s['ppid'], []).append(pid)
    todo = [root]
    while todo:
        for child in children.get(todo.pop(), []):
            if child not in seen: seen[child] = {**ps[child], 'cmdline': cmdline(child)}
            todo.append(child)
def listeners():
    """(port, pids) for every listening TCP socket ss shows."""
    out = subprocess.run(['ss', '-ltnpH'], capture_output=True, text=True).stdout
    found = []
    for line in out.split('\n'):
        fields = line.split()
        if len(fields) >= 4: found.append((fields[3].rsplit(':', 1)[1], [int(p) for p in re.findall(r'pid=(\d+)', line)]))
    return found

def vitest(name, filters, extra_args=(), env_extra=None):
    with tempfile.TemporaryDirectory(prefix='laneb-422-') as tmp:
        report = os.path.join(tmp, 'report.json')
        command = ['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', *filters, *extra_args,
                   '--reporter=json', f'--outputFile={report}']
        before = [port for port, _ in listeners() if port == PORT]
        load_start = load1()
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env={**os.environ, 'TMPDIR': tmp, **(env_extra or {})},
                                stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        seen, t0, on_port, own_ports, samples, killed = {}, time.monotonic(), [], set(), 0, False
        while proc.poll() is None:
            if time.monotonic() - t0 > DEADLINE_S:
                os.killpg(proc.pid, signal.SIGKILL); killed = True; proc.wait(); break
            walk(proc.pid, seen)
            for port, pids in listeners():
                if port == PORT: on_port.append({'t': round(time.monotonic() - t0, 2), 'pids': pids})
                if set(pids) & (set(seen) | {proc.pid}): own_ports.add(port)
            samples += 1
            time.sleep(0.25)
        wall = round(time.monotonic() - t0, 1)
        load_end = load1()
        time.sleep(3)
        survivors = {}
        for pid, s in procs().items():
            if (pid in seen and seen[pid]['start'] == s['start']) or s['sid'] == proc.pid:
                survivors[str(pid)] = cmdline(pid)
        for pid in survivors:
            try: os.kill(int(pid), signal.SIGKILL)
            except ProcessLookupError: pass
        data = json.load(open(report)) if os.path.exists(report) else {}
    tests = [{'name': a['fullName'], 'status': a['status'], 'durationMs': None if a.get('duration') is None else round(a['duration']),
              'failure': (a.get('failureMessages') or [''])[0][:300] or None}
             for s in data.get('testResults', []) for a in s.get('assertionResults', [])]
    run = {'case': name, 'command': ' '.join(command).replace(tmp, '<tmp>'), 'env': env_extra or {}, 'exitCode': proc.returncode,
           'wallSeconds': wall, 'load1': {'start': load_start, 'end': load_end}, 'killedAtDeadline': killed,
           'port7477ListenersBefore': len(before), 'samples': samples,
           'meanSampleIntervalSeconds': round(wall / samples, 2) if samples else None,
           'port7477ListenersSeen': on_port, 'portsTheRunListenedOn': sorted(own_ports, key=int), 'processesSeen': len(seen),
           'survivors': survivors, 'tests': tests}
    print(f"{name}: exit {proc.returncode}, {wall} s, {len(tests)} tests ({sum(t['status'] == 'failed' for t in tests)} failed), "
          f"7477 seen {len(on_port)} of {samples} samples, own ports {run['portsTheRunListenedOn']}, {len(survivors)} survivors", flush=True)
    return run

def with_files(contents, body):
    """Writes {path: bytes} into TREE, runs body, writes the original bytes back."""
    originals = {path: open(os.path.join(tree, path), 'rb').read() for path in contents}
    try:
        for path, data in contents.items(): open(os.path.join(tree, path), 'wb').write(data)
        return body()
    finally:
        for path, data in originals.items(): open(os.path.join(tree, path), 'wb').write(data)

def target(run):
    rows = [t for t in run['tests'] if t['name'].endswith(ROW)]
    return rows[0]['status'] if len(rows) == 1 else f'{len(rows)} rows'

def judge(run, how, rows):
    """Whether a mutant run came out as `how` says, with exactly `rows` failing; records what it counted."""
    failed = [t for t in run['tests'] if t['status'] == 'failed']
    timed = [t for t in failed if 'ETIMEDOUT' in (t['failure'] or '')]
    named = sorted(t['name'] for t in run['tests'] if any(t['name'].endswith(row) for row in rows))
    run.update({'mustFail': rows, 'mustFailBy': how, 'failedRows': len(failed), 'timedOutRows': len(timed),
                'slowestFailedRowMs': max((t['durationMs'] or 0 for t in failed), default=None)})
    clean = (not run['killedAtDeadline'] and not run['port7477ListenersSeen'] and run['port7477ListenersBefore'] == 0
             and not run['survivors'])
    if how == 'survives': return clean and run['exitCode'] == 0 and not failed
    killed = (clean and run['exitCode'] not in (0, None) and len(named) == len(rows) and sorted(t['name'] for t in failed) == named
              and all((t['durationMs'] or 0) < TIMEOUT_MS + 5000 for t in failed))
    return killed and (len(timed) == len(failed) if how == 'timeout' else not timed)

def mutant(name, spec, how, rows, test_commit):
    if isinstance(spec, str):
        record_path = f'{MUTANTS}/{spec}.json'
        raw = open(os.path.join(tree, record_path), 'rb').read()
        edits, record = json.loads(raw)['edits'], {'path': record_path, 'sha256': sha(raw)}
    else: edits, record = spec, None
    contents = {}
    for edit in edits:
        text = contents.get(edit['file']) or open(os.path.join(tree, edit['file']), 'rb').read()
        if text.count(edit['old'].encode()) != 1: sys.exit(f"{name}: the old fragment occurs {text.count(edit['old'].encode())} times")
        contents[edit['file']] = text.replace(edit['old'].encode(), edit['new'].encode())
    if test_commit: contents[ENTRY_TEST] = at(test_commit, ENTRY_TEST)
    def mutated():
        built = build(allow_errors=True)
        squash = lambda text: re.sub(r'\s+', ' ', text)
        carried = [squash(edit['new']) in squash(open(os.path.join(tree, edit['file'].replace('/src/', '/dist/')[:-3] + '.js'), encoding='utf8').read())
                   for edit in edits]
        if not all(carried): sys.exit(f'{name}: the build did not carry the mutant into dist')
        return {**vitest(name, ['daemon-entry-unchanged']), 'build': built, 'distCarriesMutant': True}
    try: run = with_files(contents, mutated)
    finally: build()
    run.update({'mutantRecord': record, 'edits': edits,
                'entryTestAt': {'commit': test_commit or head, 'sha256': sha(at(test_commit or head, ENTRY_TEST))}})
    run['passes'] = judge(run, how, rows)
    return run

build()
runs = []
runs.append(with_files({ENTRY_TEST: at(base, ENTRY_TEST), STATE_TEST: at(base, STATE_TEST)},
                       lambda: vitest('base', ['daemon-entry-unchanged', 'state-dir.system'])))
runs.append(vitest('head', ['daemon-entry-unchanged', 'state-dir.system']))
for runner in runs: runner['passes'] = runner['exitCode'] == 0 and not any(t['status'] == 'failed' for t in runner['tests'])
mutants = [mutant(*case) for case in CASES]
with tempfile.TemporaryDirectory(prefix='laneb-422-shim-') as shim_dir:
    shim = os.path.join(shim_dir, 'getuid-zero.mjs')
    open(shim, 'w', encoding='utf8').write('process.getuid = () => 0;\n')
    shim_env = {'NODE_OPTIONS': f'--import=file://{shim}'}
    roots = [vitest('root-shim', ['state-dir.system'], ['-t', ROW], shim_env),
             with_files({STATE_TEST: at(base, STATE_TEST)}, lambda: vitest('root-shim-base', ['state-dir.system'], ['-t', ROW], shim_env)),
             vitest('root-control', ['state-dir.system'], ['-t', ROW])]
for run, wanted in zip(roots, (('skipped', 'pending'), ('passed',), ('passed',))):
    run['env'] = {'NODE_OPTIONS': '--import=file://<tmp>/getuid-zero.mjs'} if run['env'] else {}
    run['row'] = target(run)
    run['passes'] = run['exitCode'] == 0 and run['row'] in wanted
if status(): sys.exit('tree not restored')
titles = lambda run: [(t['name'], t['status']) for t in run['tests']]
out = {'schema': 'runsync-and-root-probe/2', 'beads': ['syzygy-bpyt.4.22', 'syzygy-bpyt.4.25'],
       'text': 'Evidence record, not authority: the unmutated runs of the two touched system tests at the base commit and at HEAD, the R5, R9, P1 and P2 source mutants against daemon-entry-unchanged.system.test.ts (and P1 against its prior head), and a getuid shim against the mode-000 row of state-dir.system.test.ts. Generated by the tool named here; do not edit.',
       'tool': {'path': 'docs/evidence/syzygy-bpyt-4-22/tools/runsync_and_root_probe.py', 'sha256': sha(open(os.path.realpath(__file__), 'rb').read())},
       'commit': head, 'baseCommit': base, 'priorCommit': prior,
       'files': {path: {'head': sha(at(head, path)), 'base': sha(at(base, path)), **({'prior': sha(at(prior, path))} if prior else {})}
                 for path in (ENTRY_TEST, STATE_TEST)},
       'host': {'cores': os.cpu_count(), 'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()},
       'runSyncTimeoutMs': TIMEOUT_MS,
       'populations': {'baseTests': len(runs[0]['tests']), 'headTests': len(runs[1]['tests']),
                       'sameTitlesAndStatuses': titles(runs[0]) == titles(runs[1])},
       'unmutated': runs, 'mutants': mutants, 'rootShim': roots, 'reviewRuns': REVIEW_RUNS}
out['allPass'] = all(r['passes'] for r in runs + mutants + roots) and out['populations']['sameTitlesAndStatuses']
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
print(json.dumps({r['case']: r['passes'] for r in runs + mutants + roots}), 'populations', out['populations'], 'allPass', out['allPass'])
