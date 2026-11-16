#!/usr/bin/env python3
"""rev-525b probe: run one case of packages/cap1-system's vitest suite under watch, judge it, and write its record.

usage: python3 -I probe.py TREE CASE OUT.json

Adapted from round 1's rev-525/tools/probe.py (same watch and kill rules), with round 2's cases and an expected outcome per
case. TREE is a clean checkout with `npm ci` and `npm run build` done. A case may
  - replace tracked test files with their blobs at a commit (`files`),
  - apply source or test edits, each an exact `old` that must occur exactly once (`edits`); a source edit is built with
    `npm run build` (type errors allowed and recorded) and its `new` fragment, whitespace collapsed, must reach dist,
  - set extra environment for vitest itself (`env`), and pass vitest filters.
Refuses to start while anything listens on 7477. The run gets its own session and a private short TMPDIR (/tmp/r525b-<case>-XXXX,
removed after). Every 0.25 s (sleep between samples) the probe walks /proc from vitest's PID and samples `ss -ltnpH`. It kills
only processes it saw descend from its own vitest: a descendant listening on 7477 on the first sample that shows it, and the
whole session at the case deadline. 3 s after vitest exits, any process it saw descend (same start time) or in its session is a
survivor; survivors are recorded and SIGKILLed. Touched files are written back and a source mutant is rebuilt away.

Judging (`expect`): 'pass' = exit 0, no failed row; 'survives' = the same, for a mutant; ('killed', by, rows) = exit non-zero and
the failed rows are exactly `rows` (title suffix match), each failing by ETIMEDOUT when by == 'timeout' and without it when
by == 'diff'; 'binds7477' = a descendant of this run listened on 7477 (and was killed on first sight), nothing else did, and
vitest exited non-zero. Every case but 'binds7477' also needs: no deadline hit, nothing on 7477 before or during, 0 survivors."""
import hashlib, json, os, re, shutil, signal, subprocess, sys, tempfile, time

tree, case_name, out_path = os.path.realpath(sys.argv[1]), sys.argv[2], sys.argv[3]
ENTRY_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATE_TEST = 'packages/cap1-system/src/state-dir.system.test.ts'
ARGV = 'packages/polaris-dossier/src/argv.ts'
MAIN = 'apps/syzygy/src/main.ts'
BASE = '3ec6929951080613b3c5cb7205fe303c5449be58'
PRIOR = 'f7bbb93a005b45c2866d8a9993afbca44cd1a34f'
R5 = {'file': ARGV, 'old': "if (!spec.positionals || arg.startsWith('-')) return", 'new': "if (arg.startsWith('-')) return"}
R9 = {'file': ARGV, 'old': 'if (token.value === undefined || (spec.dashValue', 'new': 'if ((spec.dashValue'}
PORT_LINE = "const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);"
P1 = {'file': MAIN, 'old': PORT_LINE, 'new': "const portText = flags.get('--port') ?? env['SYZYGY_PORT'];"}
P2 = {'file': MAIN, 'old': PORT_LINE, 'new': "const portText = env['SYZYGY_PORT'] ?? flags.get('--port') ?? String(DEFAULT_PORT);"}
# The repair's own predicate: the governed-plane row's empty portEnv.
ARG_DROPPED = {'file': ENTRY_TEST, 'old': "path.join(root, '.syzygy', 'x')], dir, {})).toEqual({",
               'new': "path.join(root, '.syzygy', 'x')], dir)).toEqual({"}
DEFAULT_PARAM = "portEnv: Record<string, string> = { SYZYGY_PORT: '0' }"
DEFAULT_NOTAPORT = {'file': ENTRY_TEST, 'old': DEFAULT_PARAM, 'new': "portEnv: Record<string, string> = { SYZYGY_PORT: 'notaport' }"}
DEFAULT_EMPTY = {'file': ENTRY_TEST, 'old': DEFAULT_PARAM, 'new': 'portEnv: Record<string, string> = {}'}
GOVERNED_NOTAPORT = {'file': ENTRY_TEST, 'old': ARG_DROPPED['old'],
                     'new': "path.join(root, '.syzygy', 'x')], dir, { SYZYGY_PORT: 'notaport' })).toEqual({"}
GOVERNED = 'a state directory inside the governed plane is refused with the same message'
refused = lambda argv: f'{argv} is refused with exit 1 and the same message'
BOTH = ['daemon-entry-unchanged', 'state-dir.system']
ENTRY_ONLY = ['daemon-entry-unchanged']
# Runner environment a shell might export: if the governed-plane row read any of it, its port resolution or root would change.
LEAK_BAD = {'SYZYGY_PORT': 'notaport', 'SYZYGY_STATE_DIR': '/nonexistent-r525b/state', 'SYZYGY_OBSERVED_ROOT': '/nonexistent-r525b'}
LEAK_MASK = {'SYZYGY_PORT': '0'}
CASES = {
    'head': dict(filters=BOTH, expect='pass'),
    'head-runner-env': dict(filters=ENTRY_ONLY, env=LEAK_BAD, expect='pass'),
    'P1-head': dict(filters=ENTRY_ONLY, edits=[P1], expect=('killed', 'diff', [GOVERNED])),
    'P1-head-runner-env': dict(filters=ENTRY_ONLY, edits=[P1], env=LEAK_MASK, expect=('killed', 'diff', [GOVERNED])),
    'P2-head': dict(filters=ENTRY_ONLY, edits=[P2], expect=('killed', 'timeout', [refused('["--port","70000"]')])),
    'P1-prior': dict(filters=ENTRY_ONLY, edits=[P1], files={ENTRY_TEST: PRIOR}, expect='survives'),
    'P2-prior': dict(filters=ENTRY_ONLY, edits=[P2], files={ENTRY_TEST: PRIOR}, expect=('killed', 'timeout', [refused('["--port","70000"]')])),
    'P1-base': dict(filters=ENTRY_ONLY, edits=[P1], files={ENTRY_TEST: BASE}, expect=('killed', 'diff', [GOVERNED])),
    'P2-base': dict(filters=ENTRY_ONLY, edits=[P2], files={ENTRY_TEST: BASE}, expect='survives'),
    'ARG-dropped-P1-head': dict(filters=ENTRY_ONLY, edits=[P1, ARG_DROPPED], expect='survives'),
    'R5-head': dict(filters=ENTRY_ONLY, edits=[R5], expect=('killed', 'timeout', [refused('["--port","0","dossier"]'), refused('["Dossier"]')])),
    'R9-head': dict(filters=ENTRY_ONLY, edits=[R9], expect=('killed', 'timeout', [refused('["--port"]')])),
    # Which rows read SYZYGY_PORT on a faithful run: an invalid value fails exactly the rows that read it.
    'READS-PORT-default-rows': dict(filters=ENTRY_ONLY, edits=[DEFAULT_NOTAPORT], expect='pass'),
    'READS-PORT-governed-row': dict(filters=ENTRY_ONLY, edits=[GOVERNED_NOTAPORT], expect=('killed', 'diff', [GOVERNED])),
    # Round 1's T1 in the head file's form: the default portEnv emptied, under R5. The 7477 predicate must see it.
    'T1-head-R5': dict(filters=ENTRY_ONLY, edits=[R5, DEFAULT_EMPTY], expect='binds7477'),
}
DEADLINE_S, TIMEOUT_MS = 240, 20_000
case = CASES[case_name]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
blob = lambda commit, path: subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=tree, capture_output=True, check=True).stdout
sha = lambda data: hashlib.sha256(data).hexdigest()
load1 = lambda: float(open('/proc/loadavg').read().split()[0])
if git('status', '--porcelain', '--untracked-files=no'):
    sys.exit('tracked files not clean')
head = git('rev-parse', 'HEAD').strip()


def build():
    done = subprocess.run(['npm', 'run', 'build'], cwd=tree, capture_output=True, text=True)
    return {'exitCode': done.returncode, 'typeErrors': [l for l in (done.stdout + done.stderr).split('\n') if ': error TS' in l]}


def stat(pid):
    try: text = open(f'/proc/{pid}/stat').read()
    except OSError: return None
    f = text[text.rindex(')') + 2:].split()
    return {'ppid': int(f[1]), 'sid': int(f[3]), 'start': int(f[19])}
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace').strip()
    except OSError: return None
def procs():
    return {int(p): s for p in os.listdir('/proc') if p.isdigit() and (s := stat(int(p))) is not None}
def listeners():
    out = subprocess.run(['ss', '-ltnpH'], capture_output=True, text=True).stdout
    found = []
    for line in out.split('\n'):
        fields = line.split()
        if len(fields) >= 4:
            found.append((fields[3], fields[3].rsplit(':', 1)[1], [int(p) for p in re.findall(r'pid=(\d+)', line)]))
    return found


def run_vitest(env_extra):
    tmp = tempfile.mkdtemp(prefix=f'r525b-{case_name[:12]}-', dir='/tmp')
    report = os.path.join(tmp, 'report.json')
    log = os.path.join(tmp, 'vitest.log')
    command = ['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', *case['filters'],
               '--reporter=json', f'--outputFile={report}']
    env = {**os.environ, 'TMPDIR': tmp, **(env_extra or {})}
    before7477 = [l for l in listeners() if l[1] == '7477']
    load_start = load1()
    with open(log, 'w') as logf:
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env=env, stdout=logf, stderr=subprocess.STDOUT)
    seen, t0 = {}, time.monotonic()
    on7477, own_ports, killed_7477, samples, deadline_hit = [], set(), [], 0, False
    while proc.poll() is None:
        now = time.monotonic() - t0
        if now > DEADLINE_S:
            os.killpg(proc.pid, signal.SIGKILL); deadline_hit = True; proc.wait(); break
        ps = procs()
        children = {}
        for pid, s in ps.items(): children.setdefault(s['ppid'], []).append(pid)
        todo = [proc.pid]
        while todo:
            for child in children.get(todo.pop(), []):
                if child not in seen:
                    seen[child] = {**ps[child], 'cmdline': (cmdline(child) or '').replace(tree, '<tree>')}
                todo.append(child)
        mine = {pid for pid in seen if pid in ps and ps[pid]['start'] == seen[pid]['start']} | {proc.pid}
        for addr, port, pids in listeners():
            if set(pids) & mine: own_ports.add(port)
            if port == '7477':
                on7477.append({'t': round(now, 2), 'addr': addr, 'pids': pids, 'own': bool(set(pids) & mine)})
                for pid in set(pids) & mine:
                    argv = (cmdline(pid) or '').replace(tree, '<tree>')
                    try: os.kill(pid, signal.SIGKILL); killed_7477.append({'t': round(now, 2), 'pid': pid, 'argv': argv})
                    except ProcessLookupError: pass
        samples += 1
        time.sleep(0.25)
    wall = round(time.monotonic() - t0, 1)
    load_end = load1()
    time.sleep(3)
    survivors = {}
    for pid, s in procs().items():
        if (pid in seen and seen[pid]['start'] == s['start']) or s['sid'] == proc.pid:
            survivors[str(pid)] = (cmdline(pid) or '')[:160]
    for pid in survivors:
        try: os.kill(int(pid), signal.SIGKILL)
        except ProcessLookupError: pass
    data = json.load(open(report)) if os.path.exists(report) else {}
    log_tail = open(log, errors='replace').read()[-3000:]
    leftovers = sorted(os.listdir(tmp))
    shutil.rmtree(tmp, ignore_errors=True)
    tests = [{'name': a['fullName'], 'status': a['status'],
              'durationMs': None if a.get('duration') is None else round(a['duration']),
              'failure': ((a.get('failureMessages') or [''])[0] or '')[:400] or None}
             for s in data.get('testResults', []) for a in s.get('assertionResults', [])]
    return {'command': ' '.join(command).replace(tmp, '<tmp>'), 'exitCode': proc.returncode, 'wallSeconds': wall,
            'load1': {'start': load_start, 'end': load_end}, 'deadlineHit': deadline_hit, 'samples': samples,
            'meanSampleIntervalSeconds': round(wall / samples, 2) if samples else None,
            'port7477Before': [l[0] for l in before7477], 'port7477Seen': on7477, 'killedOn7477': killed_7477,
            'ownListeningPorts': sorted(own_ports, key=int), 'processesSeen': len(seen), 'survivors': survivors,
            'tmpLeftoversBeforeRemoval': leftovers, 'logTail': log_tail.replace(tmp, '<tmp>'), 'tests': tests}


def judge(run, expect):
    failed = [t for t in run['tests'] if t['status'] == 'failed']
    clean = not run['deadlineHit'] and not run['port7477Before'] and not run['port7477Seen'] and not run['survivors']
    if expect == 'binds7477':
        own = [s for s in run['port7477Seen'] if s['own']]
        return (not run['deadlineHit'] and not run['port7477Before'] and not run['survivors'] and bool(own)
                and len(own) == len(run['port7477Seen']) and bool(run['killedOn7477']) and run['exitCode'] not in (0, None))
    if expect in ('pass', 'survives'):
        return clean and run['exitCode'] == 0 and not failed and len(run['tests']) > 0
    _, by, rows = expect
    named = sorted(t['name'] for t in run['tests'] if any(t['name'].endswith(r) for r in rows))
    ok = clean and run['exitCode'] not in (0, None) and len(named) == len(rows) and sorted(t['name'] for t in failed) == named
    timed = ['ETIMEDOUT' in (t['failure'] or '') for t in failed]
    return ok and (all(timed) if by == 'timeout' else not any(timed))


originals = {}
record = {'tool': 'rev-525b/tools/probe.py', 'toolSha256': sha(open(os.path.realpath(__file__), 'rb').read()),
          'case': case_name, 'commit': head, 'files': case.get('files', {}), 'edits': case.get('edits', []),
          'env': case.get('env', {}), 'filters': case['filters'], 'expect': case['expect']}
source_edit = any(not e['file'].endswith('.test.ts') for e in case.get('edits', []))
busy = [l for l in listeners() if l[1] == '7477']
if busy: sys.exit(f'{case_name}: port 7477 is in use, not starting: {busy}')
try:
    for path, commit in case.get('files', {}).items():
        originals.setdefault(path, open(os.path.join(tree, path), 'rb').read())
        open(os.path.join(tree, path), 'wb').write(blob(commit, path))
        record.setdefault('fileShas', {})[path] = sha(blob(commit, path))
    for edit in case.get('edits', []):
        full = os.path.join(tree, edit['file'])
        originals.setdefault(edit['file'], open(full, 'rb').read())
        text = open(full, 'rb').read()
        count = text.count(edit['old'].encode())
        record.setdefault('editChecks', []).append({**edit, 'occurrences': count})
        if count != 1: raise SystemExit(f"{case_name}: old occurs {count} times in {edit['file']}")
        open(full, 'wb').write(text.replace(edit['old'].encode(), edit['new'].encode()))
    if source_edit:
        record['build'] = build()
        squash = lambda s: re.sub(r'\s+', ' ', s)
        record['distCarries'] = []
        for edit in case['edits']:
            if edit['file'].endswith('.test.ts'): continue
            dist = os.path.join(tree, edit['file'].replace('/src/', '/dist/')[:-3] + '.js')
            record['distCarries'].append({'dist': os.path.relpath(dist, tree), 'carries': squash(edit['new']) in squash(open(dist).read())})
        if not all(d['carries'] for d in record['distCarries']): raise SystemExit(f'{case_name}: dist does not carry the mutant')
    record['run'] = run_vitest(case.get('env'))
finally:
    for path, data in originals.items(): open(os.path.join(tree, path), 'wb').write(data)
    if source_edit: record['rebuild'] = build()
    record['treeCleanAfter'] = not git('status', '--porcelain', '--untracked-files=no')
    if 'run' in record:
        run = record['run']
        failed = [t for t in run['tests'] if t['status'] == 'failed']
        record['passesExpectation'] = judge(run, case['expect']) and record['treeCleanAfter']
        record['summary'] = {
            'exitCode': run['exitCode'], 'wallSeconds': run['wallSeconds'], 'deadlineHit': run['deadlineHit'],
            'statuses': {s: sum(t['status'] == s for t in run['tests']) for s in sorted({t['status'] for t in run['tests']})},
            'failed': [{'name': t['name'][-90:], 'ms': t['durationMs'], 'etimedout': 'ETIMEDOUT' in (t['failure'] or ''),
                        'head': (t['failure'] or '')[:200]} for t in failed],
            'port7477Seen': len(run['port7477Seen']), 'samples': run['samples'], 'meanInterval': run['meanSampleIntervalSeconds'],
            'load1': run['load1'], 'killedOn7477': len(run['killedOn7477']), 'ownListeningPorts': run['ownListeningPorts'],
            'survivors': len(run['survivors']), 'slowestMs': max((t['durationMs'] or 0 for t in run['tests']), default=None),
            'passesExpectation': record['passesExpectation']}
    open(out_path, 'w').write(json.dumps(record, indent=1) + '\n')
    print(json.dumps({'case': case_name, 'treeCleanAfter': record['treeCleanAfter'], **record.get('summary', {})}, indent=1))
