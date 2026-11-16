#!/usr/bin/env python3
"""rev-525 probe: run one case of packages/cap1-system's vitest suite under watch, and write its record.

usage: python3 -I probe.py TREE CASE OUT.json

TREE is a clean checkout with `npm ci` and `npm run build` done. CASE names one entry of CASES below. A case may
  - replace tracked test files with their blobs at a commit (`files`),
  - apply source or test edits, each an exact `old` that must occur exactly once (`edits`); a source edit is built with
    `npm run build` (type errors allowed and recorded) and its `new` fragment, whitespace collapsed, must reach dist,
  - set extra environment (`env`), and pass vitest filters and -t.
The run gets its own session and a private short TMPDIR (/tmp/r525-<case>-XXXX, removed after). Every 0.25 s the probe walks
/proc from vitest's PID, and samples `ss -ltnpH`. It kills only processes it saw descend from its own vitest:
  - `kill7477`: a descendant daemon listening on 127.0.0.1:7477 is SIGKILLed on the sample that first sees it;
  - `unstick`: a descendant daemon (`apps/syzygy/dist/main.js` in its argv) alive longer than that many seconds is SIGKILLed;
  - `deadline`: past it, the whole session is SIGKILLed.
3 s after vitest exits, any process it saw descend (same start time) or in its session is a survivor; survivors are recorded and
SIGKILLed. Every touched file is written back, and a source mutant is rebuilt away, whatever happens short of a SIGKILL of the
probe. The record keeps the case, the edits as old/new, the commit, every test's status, duration and failure head."""
import hashlib, json, os, re, shutil, signal, subprocess, sys, tempfile, time

tree, case_name, out_path = os.path.realpath(sys.argv[1]), sys.argv[2], sys.argv[3]
ENTRY_TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATE_TEST = 'packages/cap1-system/src/state-dir.system.test.ts'
ARGV = 'packages/polaris-dossier/src/argv.ts'
MAIN = 'apps/syzygy/src/main.ts'
BASE = '3ec6929951080613b3c5cb7205fe303c5449be58'
ROW = 'rejects an unreadable state-dir path as named invalid before writes or a listener'
R5 = {'file': ARGV, 'old': "if (!spec.positionals || arg.startsWith('-')) return", 'new': "if (arg.startsWith('-')) return"}
R9 = {'file': ARGV, 'old': 'if (token.value === undefined || (spec.dashValue', 'new': 'if ((spec.dashValue'}
RUNSYNC_ENV = {'file': ENTRY_TEST, 'old': "env: { ...ENV, SYZYGY_PORT: '0' }", 'new': 'env: ENV'}
RUNSYNC_TIMEOUT = {'file': ENTRY_TEST, 'old': ", timeout: RUN_SYNC_TIMEOUT_MS, killSignal: 'SIGKILL',", 'new': ','}
RUNSYNC_THROW = {'file': ENTRY_TEST, 'old': '  if (result.error) throw new Error(', 'new': '  if (false) throw new Error('}
DEFAULT_DROPPED = {'file': MAIN, 'old': "const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);",
                   'new': "const portText = flags.get('--port') ?? env['SYZYGY_PORT'];"}
ENV_OVER_FLAG = {'file': MAIN, 'old': "const portText = flags.get('--port') ?? env['SYZYGY_PORT'] ?? String(DEFAULT_PORT);",
                 'new': "const portText = env['SYZYGY_PORT'] ?? flags.get('--port') ?? String(DEFAULT_PORT);"}
SKIP_ALWAYS = {'file': STATE_TEST, 'old': "it.skipIf(isRoot)('rejects an unreadable", 'new': "it.skipIf(true)('rejects an unreadable"}
SKIP_INVERTED = {'file': STATE_TEST, 'old': 'const isRoot = process.getuid?.() === 0;', 'new': 'const isRoot = process.getuid?.() !== 0;'}
# A proposed repair (rev-525 F1), tried in the scratch clone only: the one runSync row whose argv reaches port resolution without
# --port runs with no SYZYGY_PORT, as captured; every other row keeps SYZYGY_PORT=0.
FIX = [
    {'file': ENTRY_TEST, 'old': 'function runSync(args: readonly string[], cwd: string): {',
     'new': "function runSync(args: readonly string[], cwd: string, portEnv: Record<string, string> = { SYZYGY_PORT: '0' }): {"},
    {'file': ENTRY_TEST, 'old': "env: { ...ENV, SYZYGY_PORT: '0' }", 'new': 'env: { ...ENV, ...portEnv }'},
    {'file': ENTRY_TEST, 'old': "path.join(root, '.syzygy', 'x')], dir)).toEqual({", 'new': "path.join(root, '.syzygy', 'x')], dir, {})).toEqual({"},
]
BOTH = ['daemon-entry-unchanged', 'state-dir.system']
ENTRY_ONLY = ['daemon-entry-unchanged']
BASE_ENTRY = {ENTRY_TEST: BASE}
BASE_BOTH = {ENTRY_TEST: BASE, STATE_TEST: BASE}
SHIM = 'shim'  # placeholder: replaced by the shim's NODE_OPTIONS at run time
CASES = {
    'head': dict(filters=BOTH),
    'base': dict(filters=BOTH, files=BASE_BOTH),
    'head-R5': dict(filters=ENTRY_ONLY, edits=[R5], deadline=240, kill7477=True),
    'head-R9': dict(filters=ENTRY_ONLY, edits=[R9], deadline=240, kill7477=True),
    'base-R5': dict(filters=ENTRY_ONLY, edits=[R5], files=BASE_ENTRY, deadline=240, kill7477=True, unstick=30),
    'base-R5-hang': dict(filters=ENTRY_ONLY, edits=[R5], files=BASE_ENTRY, deadline=120, kill7477=True),
    'base-R9': dict(filters=ENTRY_ONLY, edits=[R9], files=BASE_ENTRY, deadline=240, kill7477=True, unstick=30),
    'T1-no-port-env-R5': dict(filters=ENTRY_ONLY, edits=[R5, RUNSYNC_ENV], deadline=240, kill7477=True),
    'T2-no-timeout-R5': dict(filters=ENTRY_ONLY, edits=[R5, RUNSYNC_TIMEOUT], deadline=90, kill7477=True),
    'T3-no-throw-R5': dict(filters=ENTRY_ONLY, edits=[R5, RUNSYNC_THROW], deadline=240, kill7477=True),
    'P1-default-dropped-head': dict(filters=ENTRY_ONLY, edits=[DEFAULT_DROPPED], deadline=240, kill7477=True),
    'P1-default-dropped-base': dict(filters=ENTRY_ONLY, edits=[DEFAULT_DROPPED], files=BASE_ENTRY, deadline=240, kill7477=True, unstick=30),
    'P1-default-dropped-system-head': dict(filters=[], edits=[DEFAULT_DROPPED], deadline=500, kill7477=True),
    'P1-default-dropped-system-base': dict(filters=[], edits=[DEFAULT_DROPPED], files=BASE_ENTRY, deadline=500, kill7477=True, unstick=30),
    'P2-env-over-flag-head': dict(filters=ENTRY_ONLY, edits=[ENV_OVER_FLAG], deadline=240, kill7477=True),
    'P2-env-over-flag-base': dict(filters=ENTRY_ONLY, edits=[ENV_OVER_FLAG], files=BASE_ENTRY, deadline=240, kill7477=True, unstick=30),
    # Counts the rows that call runSync: every one of them fails, and only they do.
    'COUNT-runSync-rows': dict(filters=ENTRY_ONLY, edits=[{'file': ENTRY_TEST,
        'old': '  const result = spawnSync(process.execPath, [ENTRY, ...args], {\n',
        'new': "  throw new Error('rev-525 count');\n  const result = spawnSync(process.execPath, [ENTRY, ...args], {\n"}]),
    'FIX-head': dict(filters=BOTH, edits=FIX),
    'FIX-P1': dict(filters=ENTRY_ONLY, edits=[DEFAULT_DROPPED, *FIX], deadline=240, kill7477=True),
    'FIX-P2': dict(filters=ENTRY_ONLY, edits=[ENV_OVER_FLAG, *FIX], deadline=240, kill7477=True),
    'FIX-R5': dict(filters=ENTRY_ONLY, edits=[R5, *FIX], deadline=240, kill7477=True),
    'FIX-R9': dict(filters=ENTRY_ONLY, edits=[R9, *FIX], deadline=240, kill7477=True),
    'shim-row-head': dict(filters=['state-dir.system'], t=ROW, env={'NODE_OPTIONS': SHIM}),
    'shim-row-base': dict(filters=['state-dir.system'], t=ROW, env={'NODE_OPTIONS': SHIM}, files={STATE_TEST: BASE}),
    'noshim-row-head': dict(filters=['state-dir.system'], t=ROW),
    'shim-file-head': dict(filters=['state-dir.system'], env={'NODE_OPTIONS': SHIM}),
    'shim-file-base': dict(filters=['state-dir.system'], env={'NODE_OPTIONS': SHIM}, files={STATE_TEST: BASE}),
    'S1-skip-always-noshim': dict(filters=['state-dir.system'], edits=[SKIP_ALWAYS]),
    'S2-skip-inverted-noshim': dict(filters=['state-dir.system'], edits=[SKIP_INVERTED]),
    'S2-skip-inverted-shim': dict(filters=['state-dir.system'], edits=[SKIP_INVERTED], env={'NODE_OPTIONS': SHIM}),
}
case = CASES[case_name]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
blob = lambda commit, path: subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=tree, capture_output=True, check=True).stdout
sha = lambda data: hashlib.sha256(data).hexdigest()
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

def run_vitest(env_extra, shim_path):
    tmp = tempfile.mkdtemp(prefix=f'r525-{case_name[:12]}-', dir='/tmp')
    report = os.path.join(tmp, 'report.json')
    log = os.path.join(tmp, 'vitest.log')
    command = ['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', *case['filters']]
    if 't' in case: command += ['-t', case['t']]
    command += ['--reporter=json', f'--outputFile={report}']
    env = {**os.environ, 'TMPDIR': tmp}
    for k, v in (env_extra or {}).items(): env[k] = f'--import=file://{shim_path}' if v == SHIM else v
    before7477 = [l for l in listeners() if l[1] == '7477']
    with open(log, 'w') as logf:
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env=env, stdout=logf, stderr=subprocess.STDOUT)
    seen, first_seen, t0 = {}, {}, time.monotonic()
    on7477, own_ports, killed_7477, unstuck, samples, deadline_hit = [], set(), [], [], 0, False
    while proc.poll() is None:
        now = time.monotonic() - t0
        if now > case.get('deadline', 300):
            os.killpg(proc.pid, signal.SIGKILL); deadline_hit = True; proc.wait(); break
        ps = procs()
        children = {}
        for pid, s in ps.items(): children.setdefault(s['ppid'], []).append(pid)
        todo = [proc.pid]
        while todo:
            for child in children.get(todo.pop(), []):
                if child not in seen:
                    seen[child] = {**ps[child], 'cmdline': (cmdline(child) or '').replace(tree, '<tree>')}
                    first_seen[child] = now
                todo.append(child)
        mine = {pid for pid in seen if pid in ps and ps[pid]['start'] == seen[pid]['start']} | {proc.pid}
        for addr, port, pids in listeners():
            if set(pids) & mine: own_ports.add(port)
            if port == '7477':
                on7477.append({'t': round(now, 2), 'addr': addr, 'pids': pids, 'own': bool(set(pids) & mine)})
                if case.get('kill7477'):
                    for pid in set(pids) & mine:
                        argv = (cmdline(pid) or '').replace(tree, '<tree>')
                        try: os.kill(pid, signal.SIGKILL); killed_7477.append({'t': round(now, 2), 'pid': pid, 'argv': argv})
                        except ProcessLookupError: pass
        if case.get('unstick'):
            for pid in mine - {proc.pid}:
                if 'apps/syzygy/dist/main.js' in (cmdline(pid) or '') and now - first_seen[pid] > case['unstick'] \
                        and not any(u['pid'] == pid for u in unstuck):
                    try: os.kill(pid, signal.SIGKILL); unstuck.append({'t': round(now, 2), 'pid': pid, 'aliveSeconds': round(now - first_seen[pid], 1)})
                    except ProcessLookupError: pass
        samples += 1
        time.sleep(0.25)
    wall = round(time.monotonic() - t0, 1)
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
            'deadlineHit': deadline_hit, 'samples': samples, 'port7477Before': [l[0] for l in before7477],
            'port7477Seen': on7477, 'killedOn7477': killed_7477, 'unstuck': unstuck,
            'ownListeningPorts': sorted(own_ports, key=int), 'processesSeen': len(seen), 'survivors': survivors,
            'tmpLeftoversBeforeRemoval': leftovers, 'logTail': log_tail.replace(tmp, '<tmp>'), 'tests': tests}

originals = {}
record = {'tool': 'rev-525/tools/probe.py', 'toolSha256': sha(open(os.path.realpath(__file__), 'rb').read()),
          'case': case_name, 'commit': head, 'files': case.get('files', {}), 'edits': case.get('edits', []),
          'env': case.get('env', {}), 'filters': case['filters'], 't': case.get('t')}
source_edit = any(not e['file'].endswith('.test.ts') for e in case.get('edits', []))
shim_dir = tempfile.mkdtemp(prefix='r525-shim-', dir='/tmp')
shim = os.path.join(shim_dir, 'getuid-zero.mjs')
# The shim reports uid 0 in every node process except the daemon itself, so the daemon's own uid checks see the real user.
open(shim, 'w').write("if (!(process.argv[1] ?? '').endsWith('apps/syzygy/dist/main.js')) process.getuid = () => 0;\n")
try:
    for path, commit in case.get('files', {}).items():
        originals.setdefault(path, open(os.path.join(tree, path), 'rb').read())
        open(os.path.join(tree, path), 'wb').write(blob(commit, path))
    for edit in case.get('edits', []):
        full = os.path.join(tree, edit['file'])
        originals.setdefault(edit['file'], open(full, 'rb').read())
        text = open(full, 'rb').read()
        count = text.count(edit['old'].encode())
        edit_rec = {**edit, 'occurrences': count}
        record.setdefault('editChecks', []).append(edit_rec)
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
    record['run'] = run_vitest(case.get('env'), shim)
finally:
    for path, data in originals.items(): open(os.path.join(tree, path), 'wb').write(data)
    if source_edit: record['rebuild'] = build()
    shutil.rmtree(shim_dir, ignore_errors=True)
    record['treeCleanAfter'] = not git('status', '--porcelain', '--untracked-files=no')
    if 'run' in record:
        failed = [t for t in record['run']['tests'] if t['status'] == 'failed']
        record['summary'] = {
            'exitCode': record['run']['exitCode'], 'wallSeconds': record['run']['wallSeconds'],
            'deadlineHit': record['run']['deadlineHit'],
            'statuses': {s: sum(t['status'] == s for t in record['run']['tests']) for s in sorted({t['status'] for t in record['run']['tests']})},
            'failed': [{'name': t['name'][-90:], 'ms': t['durationMs'], 'etimedout': 'ETIMEDOUT' in (t['failure'] or ''),
                        'head': (t['failure'] or '')[:160]} for t in failed],
            'port7477Seen': len(record['run']['port7477Seen']), 'samples': record['run']['samples'],
            'killedOn7477': len(record['run']['killedOn7477']), 'unstuck': len(record['run']['unstuck']),
            'ownListeningPorts': record['run']['ownListeningPorts'], 'survivors': len(record['run']['survivors']),
            'slowestMs': max((t['durationMs'] or 0 for t in record['run']['tests']), default=None)}
    open(out_path, 'w').write(json.dumps(record, indent=1) + '\n')
    print(json.dumps({'case': case_name, 'treeCleanAfter': record['treeCleanAfter'], **record.get('summary', {})}, indent=1))
