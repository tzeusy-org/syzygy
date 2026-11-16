#!/usr/bin/env python3
"""rev-520c probes of the stop handling of scripts/measure_vitest_test_durations.py --profile (PR 520 round 3). Evidence tool, not
authority. It writes OUTDIR, one private /tmp/r520c-* directory per attempt (the script's TMPDIR, removed afterwards) and, only to
undo what it records, the two instrumented files in TREE (git checkout) and a TREE/.git/index.lock it created itself (LOCK, LOCKN).

usage: python3 -I probe.py TREE OUTDIR BATCH VERSIONS [--repeats N] [--no-profile]
  --no-profile  run the script without --profile (records go to OUTDIR/BATCH-np), as the PR would be with --profile taken out
  VERSIONS  comma-separated: head (TREE's own script) and/or r1 (dc60c5bc's, tools/r1_measure_vitest_test_durations.py). Where a
            batch runs two versions, their attempts alternate, so load drift falls on both.
  BATCH     each attempt is one `--profile --mode alone --runs 1` run of package-reader.test.ts in the consent project:
    E       SIGTERM to the PID D us (busy wait) after the instrumented test-file write is seen, D in 800..2200 (R2 F2)
    ET      E under inject.py trace, so each record says whether vitest's Popen was entered and had returned when the signal landed
    G       two SIGTERMs to the PID G us apart, 0.5 s after vitest's worker is seen, G in 0..1000 (R2 F3 (a))
    K       a run to the end under inject.py killpg-race (R2 F3 (b)); passes only with exit 0, 299 tests, 299 profile rows, and the
            injected answer followed by the script's SIGTERM killpg
    H       SIGHUP to the PID 3 s after vitest's worker is seen, SIGHUP inherited ignored (R2 N7); passes only with exit 0, 299/299
    EARLYW  SIGTERM D us after the instrumented test-file write, D in 0..400, under inject.py trace: a stop before Popen is entered
    EARLYS  SIGTERM D ms after the script is spawned, D in 0..400, under inject.py trace: during start-up, `git status`, instrument
    MIX     SIGINT, SIGTERM and SIGHUP interleaved, under inject.py trace, at point P: `write` (a burst right after the test-file
            write), `run` (a burst 0.5 s after vitest's worker is seen), `cleanup` (SIGINT 0.5 s into vitest, then a mixed signal to
            the PID or SIGINT to the script's group every 20 ms for 2 s, through end_group and the restore)
    RSTOP   a fake git on PATH sleeps 1.5 s inside `git checkout`; SIGTERM to the PID 0.5 s into vitest; once the checkout is entered,
            SIGINT to the script's group and SIGTERM, SIGHUP, SIGINT to its PID, one every 100 ms for 1.2 s
    LOCK    TREE/.git/index.lock is created 0.5 s into vitest (as a concurrent git process holds it), then SIGTERM to the PID
    LOCKN   the same lock, created 3 s into vitest, and no signal: the run ends normally and restores while the lock is held
    PIPE    fake npx writes 64 KiB blocks to stdout flat out; SIGTERM to the PID 1 s after it starts
    PIPEX   fake npx writes 32 MiB, then exits 0; no signal
    LINGER  fake npx exits at once, leaving a child in its group holding stdout for 6 s; SIGTERM 0.5 s after the parent exits
    LINGERN the same, no signal
    DETACH  fake npx's child calls setsid() and holds stdout for 20 s; SIGTERM 0.5 s after the child starts (a documented limit:
            "A process that has left vitest's process group is out of the cleanup's reach"); records the exit code and stderr
    DETACHX the same, the fake parent exiting at once, and no signal
    NOTERM  fake npx ignores SIGTERM; SIGTERM to the PID 0.5 s after it starts (the SIGKILL-after-GRACE_SECONDS path)
    PTY     the script's stdin/stdout/stderr and controlling terminal are a pty; the master is closed 3 s after vitest's worker is
            seen, a real hangup
    BADUTF8 fake npx writes one PROF line and one byte that is not UTF-8, then exits 0; no signal (the reader thread's decode)
    P0      a profiled run to the end under strace without -f (the script's own main thread, not its children), recording every
            path it opens for writing or creates, renames or removes; passes only with exit 0 and 299/299, and a write set inside
            OUT.json, the two instrumented files and the script's own temporary directory (fd-relative removals listed apart)
Each attempt starts the script in a session of its own, SIGINT and SIGHUP reset to the default (SIGHUP ignored for H). Descendants
are found every 50 ms by walking /proc parent links from the script's PID, and as any process whose cwd is inside TREE and which
started after the attempt began. 3 s after the script exits, a process survives if its PID still has the recorded start time, or
if it started after the attempt began and sits in a seen process group or session, or has its cwd inside TREE. An attempt passes
only if `git status --porcelain --untracked-files=no` is then empty and nothing survives, plus the extra conditions above. Each
record also says whether the exit code is the claimed 128 + the first signal sent (`exitAsClaimed`). Survivors get SIGKILL by PID;
a dirty tree is restored after it is recorded."""
import hashlib, json, os, pty, shutil, signal, subprocess, sys, tempfile, termios, threading, time, fcntl

tree, outdir, batch, versions = os.path.realpath(sys.argv[1]), os.path.realpath(sys.argv[2]), sys.argv[3], sys.argv[4].split(',')
rest = sys.argv[5:]
repeats = int(rest[rest.index('--repeats') + 1]) if '--repeats' in rest else 1
no_profile = '--no-profile' in rest
label = batch + ('-np' if no_profile else '')
PROFILE_ROWS = 0 if no_profile else 299
HERE = os.path.dirname(os.path.realpath(__file__))
FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
PROJECT = '@syzygy/polaris-generation-consent'
SCRIPTS = {'head': os.path.join(tree, 'scripts/measure_vitest_test_durations.py'), 'r1': os.path.join(HERE, 'r1_measure_vitest_test_durations.py')}
DIGESTS = {'head': '72a0fabdd0dd12f85ad35fde4b3ee032125757d5276b85802d76fdf5288f0195', 'r1': '920c5f120209904b37cfe14320ea00edfa18eafbda12fd7dcb02ec8fcf4f1e97'}
REAL_GIT = shutil.which('git')
PARAMS = {'E': [800, 1000, 1200, 1500, 1800, 2200], 'ET': [800, 1000, 1200, 1500, 1800, 2200], 'G': [0, 30, 60, 100, 150, 200, 300, 500, 1000], 'EARLYW': [0, 50, 100, 200, 400],
          'EARLYS': [0, 20, 40, 60, 100, 150, 250, 400], 'MIX': ['write', 'run', 'cleanup']}
TRACED = ('ET', 'EARLYW', 'EARLYS', 'MIX', 'RSTOP')
FAKE_NPX = {'PIPE': 'pipe', 'PIPEX': 'pipex', 'LINGER': 'linger', 'LINGERN': 'linger', 'DETACH': 'detach', 'DETACHX': 'detachx', 'NOTERM': 'noterm', 'BADUTF8': 'badutf8'}
TICKS = os.sysconf('SC_CLK_TCK')
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()
git = lambda *a: subprocess.run([REAL_GIT, *a], cwd=tree, capture_output=True, text=True, check=True).stdout
status = lambda: git('status', '--porcelain', '--untracked-files=no')
for v in versions:
    if sha(SCRIPTS[v]) != DIGESTS[v]: sys.exit(f'{v} script digest is not {DIGESTS[v]}')
if status(): sys.exit('tracked files not clean')
os.makedirs(os.path.join(outdir, label), exist_ok=True)


def stat(pid):
    try: text = open(f'/proc/{pid}/stat').read()
    except OSError: return None
    f = text[text.rindex(')') + 2:].split()
    return {'state': f[0], 'ppid': int(f[1]), 'pgid': int(f[2]), 'sid': int(f[3]), 'start': int(f[19])}
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace').strip()[:160]
    except OSError: return None
def cwd(pid):
    try: return os.readlink(f'/proc/{pid}/cwd')
    except OSError: return None
def procs():
    found = {}
    for p in os.listdir('/proc'):
        if p.isdigit() and (s := stat(int(p))) is not None: found[int(p)] = s
    return found
def now_ticks(): return int(float(open('/proc/uptime').read().split()[0]) * TICKS)
def in_tree(d): return d is not None and (d == tree or d.startswith(tree + '/'))
def walk(root, seen, began):
    ps = procs()
    children = {}
    for pid, s in ps.items(): children.setdefault(s['ppid'], []).append(pid)
    todo = [root]
    while todo:
        for child in children.get(todo.pop(), []):
            if child not in seen: seen[child] = {**ps[child], 'cmdline': cmdline(child)}
            todo.append(child)
    for pid, s in ps.items():
        if pid not in seen and pid != os.getpid() and s['start'] >= began and in_tree(cwd(pid)):
            seen[pid] = {**s, 'cmdline': cmdline(pid), 'byCwd': True}
def vitest_started(seen): return sum('vitest' in (d['cmdline'] or '') for d in seen.values()) >= 2
def busy(us):
    end = time.perf_counter() + us / 1e6
    while time.perf_counter() < end: pass
def marks(path):
    try: return [json.loads(l) for l in open(path) if l.strip()]
    except OSError: return []


def attempt(version, param, n):
    tmp = tempfile.mkdtemp(prefix='r520c-', dir='/tmp')
    out = os.path.join(tmp, 'measure-out.json')
    mark = os.path.join(tmp, 'mark.jsonl')
    log_path = os.path.join(tmp, 'script.log')
    script = SCRIPTS[version]
    command = ['python3', '-I', script, '.', '--file', FILE, '--project', PROJECT, '--mode', 'alone', '--runs', '1', '--out', out, '--profile']
    if no_profile: command.remove('--profile')
    if batch == 'K': command = ['python3', '-I', os.path.join(HERE, 'inject.py'), 'killpg-race', script, *command[3:]]
    if batch in TRACED: command = ['python3', '-I', os.path.join(HERE, 'inject.py'), 'trace', script, *command[3:]]
    strace_log = os.path.join(tmp, 'strace.log')
    if batch == 'P0':
        command = ['strace', '-o', strace_log, '-e', 'trace=open,openat,creat,rename,renameat,renameat2,unlink,unlinkat,mkdir,mkdirat,rmdir,'
                   'truncate,ftruncate,link,linkat,symlink,symlinkat', *command]
    env = {**os.environ, 'TMPDIR': tmp, 'FAKE_MARK': mark}
    if batch in FAKE_NPX or batch == 'RSTOP':
        fakebin = os.path.join(tmp, 'bin'); os.mkdir(fakebin)
        if batch in FAKE_NPX:
            open(os.path.join(fakebin, 'npx'), 'w').write(f'#!/bin/sh\nexec python3 -I {os.path.join(HERE, "fake_npx.py")} "$@"\n')
            os.chmod(os.path.join(fakebin, 'npx'), 0o755)
            env['FAKE_NPX_MODE'] = FAKE_NPX[batch]
        if batch == 'RSTOP':
            open(os.path.join(fakebin, 'git'), 'w').write(f'#!/bin/sh\nexec python3 -I {os.path.join(HERE, "fake_git.py")} "$@"\n')
            os.chmod(os.path.join(fakebin, 'git'), 0o755)
            env.update(REAL_GIT=REAL_GIT, FAKE_GIT_DELAY='1.5')
        env['PATH'] = fakebin + ':' + env['PATH']
    master = slave = None
    if batch == 'PTY':
        master, slave = pty.openpty()
        os.set_blocking(master, False)
    def pre():
        signal.signal(signal.SIGINT, signal.SIG_DFL)
        signal.signal(signal.SIGHUP, signal.SIG_IGN if batch == 'H' else signal.SIG_DFL)
        if batch == 'PTY': fcntl.ioctl(0, termios.TIOCSCTTY, 0)
    began = now_ticks() - 1
    log = open(log_path, 'wb')
    if batch == 'PTY':
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env=env, stdin=slave, stdout=slave, stderr=slave, preexec_fn=pre)
        os.close(slave)
    else:
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env=env, stdin=subprocess.DEVNULL, stdout=log,
                                stderr=subprocess.STDOUT, preexec_fn=pre)
    t0 = time.monotonic()
    seen, sent, events, lock_made = {}, [], [], False
    pty_out = []
    def drain():
        if master is None: return
        try:
            while True:
                b = os.read(master, 65536)
                if not b: break
                pty_out.append(b)
        except (BlockingIOError, OSError): pass
    def ev(what): events.append({'t': round(time.monotonic() - t0, 4), 'what': what})
    def send(number, whom='pid'):
        try:
            (os.killpg if whom == 'group' else os.kill)(proc.pid, number)
            sent.append({'t': round(time.monotonic() - t0, 4), 'signal': signal.Signals(number).name, 'to': whom})
        except ProcessLookupError: ev(f'{signal.Signals(number).name} to {whom}: script already gone')
    def tick(seconds):
        end = time.monotonic() + seconds
        while time.monotonic() < end and proc.poll() is None:
            walk(proc.pid, seen, began); drain(); time.sleep(0.05)
    def until(pred, limit):
        end = time.monotonic() + limit
        while time.monotonic() < end and proc.poll() is None and not pred():
            walk(proc.pid, seen, began); drain(); time.sleep(0.05)
        return pred()
    def wait_write(limit=60):
        full = os.path.join(tree, FILE)
        base, deadline = os.stat(full).st_mtime_ns, time.monotonic() + limit
        while time.monotonic() < deadline and proc.poll() is None and os.stat(full).st_mtime_ns == base: pass
        return os.stat(full).st_mtime_ns != base
    def make_lock():
        nonlocal lock_made
        fd = os.open(os.path.join(tree, '.git', 'index.lock'), os.O_CREAT | os.O_EXCL | os.O_WRONLY); os.close(fd)
        lock_made = True; ev('index.lock created')

    if batch in ('E', 'ET'):
        if wait_write() and proc.poll() is None: busy(param); send(signal.SIGTERM)
    elif batch == 'EARLYW':
        if wait_write() and proc.poll() is None: busy(param); send(signal.SIGTERM)
    elif batch == 'EARLYS':
        busy(param * 1000); send(signal.SIGTERM)
    elif batch in ('G', 'H', 'PTY', 'LOCK', 'LOCKN', 'RSTOP') or (batch == 'MIX' and param in ('run', 'cleanup')):
        if until(lambda: vitest_started(seen), 120):
            ev('vitest worker seen')
            if batch == 'G':
                tick(0.5)
                if proc.poll() is None: send(signal.SIGTERM); busy(param); send(signal.SIGTERM)
            elif batch == 'H':
                tick(3); send(signal.SIGHUP)
            elif batch == 'PTY':
                tick(3); drain(); os.close(master); master = None
                ev('pty master closed'); sent.append({'t': round(time.monotonic() - t0, 4), 'signal': 'SIGHUP', 'to': 'pty hangup'})
            elif batch == 'LOCK':
                tick(0.5); make_lock(); send(signal.SIGTERM)
            elif batch == 'LOCKN':
                tick(3); make_lock()
            elif batch == 'RSTOP':
                tick(0.5); send(signal.SIGTERM)
                if until(lambda: any(m['what'] == 'checkout-enter' for m in marks(mark)), 30):
                    ev('checkout entered')
                    for i in range(12):
                        send([signal.SIGINT, signal.SIGTERM, signal.SIGHUP, signal.SIGINT][i % 4], 'group' if i % 4 == 0 else 'pid')
                        time.sleep(0.1)
            elif param == 'run':
                tick(0.5)
                for number in (signal.SIGTERM, signal.SIGINT, signal.SIGHUP, signal.SIGINT, signal.SIGTERM): send(number); busy(30)
            elif param == 'cleanup':
                tick(0.5); send(signal.SIGINT)
                end, i = time.monotonic() + 2, 0
                while time.monotonic() < end and proc.poll() is None:
                    number = [signal.SIGTERM, signal.SIGHUP, signal.SIGINT, signal.SIGINT][i % 4]
                    send(number, 'group' if i % 4 == 3 else 'pid'); i += 1; time.sleep(0.02)
    elif batch == 'MIX' and param == 'write':
        if wait_write() and proc.poll() is None:
            for number in (signal.SIGINT, signal.SIGTERM, signal.SIGINT, signal.SIGHUP, signal.SIGTERM): send(number); busy(50)
    elif batch in ('PIPE', 'DETACH', 'NOTERM'):
        what = {'PIPE': 'start', 'DETACH': 'child', 'NOTERM': 'ignoring-sigterm'}[batch]
        if until(lambda: any(m['what'] == what for m in marks(mark)), 60): tick(1 if batch == 'PIPE' else 0.5); send(signal.SIGTERM)
    elif batch == 'LINGER':
        if until(lambda: any(m['what'] == 'parent-exit' for m in marks(mark)), 60): tick(0.5); send(signal.SIGTERM)
    while proc.poll() is None and time.monotonic() - t0 < 900:
        walk(proc.pid, seen, began); drain(); time.sleep(0.05)
    if proc.poll() is None: proc.kill(); proc.wait(); ev('probe killed the script after 900 s')
    exited = round(time.monotonic() - t0, 3)
    drain()
    time.sleep(3)
    drain()
    if master is not None: os.close(master)
    log.close()
    output = open(log_path, 'rb').read().decode(errors='replace') + b''.join(pty_out).decode(errors='replace')
    walk(-1, seen, began)
    tree_after = status()
    groups = {d['pgid'] for d in seen.values()} | {d['sid'] for d in seen.values()} | {proc.pid}
    survivors = {}
    for pid, s in procs().items():
        if pid == os.getpid(): continue
        if (pid in seen and seen[pid]['start'] == s['start']) or (s['start'] >= began and ((s['pgid'] in groups or s['sid'] in groups) or in_tree(cwd(pid)))):
            survivors[str(pid)] = {'cmdline': cmdline(pid), 'state': s['state'], 'pgid': s['pgid'], 'sid': s['sid']}
    for pid in survivors:
        try: os.kill(int(pid), signal.SIGKILL)
        except ProcessLookupError: pass
    if lock_made:
        os.unlink(os.path.join(tree, '.git', 'index.lock')); ev('index.lock removed by the probe')
    if tree_after: subprocess.run([REAL_GIT, 'checkout', '--', KIT, FILE], cwd=tree, check=True, capture_output=True)
    record = json.load(open(out)) if os.path.exists(out) else None
    writes = None
    if batch == 'P0':
        writes = []
        for l in open(strace_log, errors='replace'):
            if ('= -1' in l) or l.startswith(('---', '+++')): continue
            call = l.split('(', 1)[0]
            if call in ('open', 'openat') and not any(f in l for f in ('O_WRONLY', 'O_RDWR', 'O_CREAT')): continue
            writes.append(l.strip()[:300].replace(tmp, '<tmp>').replace(tree + '/', '<tree>/'))
    tmp_left, mark_lines = sorted(os.listdir(tmp)), marks(mark)
    shutil.rmtree(tmp, ignore_errors=True)
    rows = record['runs'][0] if record and record.get('runs') else {}
    first = sent[0]['signal'] if sent else None
    claimed = 128 + int(getattr(signal, first)) if first else 0
    result = {'batch': batch, 'profile': not no_profile, 'version': version, 'param': param, 'n': n, 'scriptSha256': sha(script),
              'command': ' '.join(command).replace(tmp, '<tmp>').replace(tree + '/', '').replace(HERE, '<tools>'),
              'sent': sent, 'events': events, 'scriptExitedAtSeconds': exited, 'exitCode': proc.returncode, 'claimedExit': claimed,
              'exitAsClaimed': proc.returncode == claimed, 'descendantsSeen': len(seen), 'seenOnlyByCwd': sum(1 for d in seen.values() if d.get('byCwd')),
              'vitestSeen': vitest_started(seen), 'npxSeen': any('npx' in (d['cmdline'] or '') or 'fake_npx' in (d['cmdline'] or '') for d in seen.values()),
              'treeAfterExit': tree_after, 'survivors': survivors, 'recordWritten': record is not None,
              'recordRuns': len(record['runs']) if record else None, 'recordTests': rows.get('fileTests'),
              'recordProfileRows': len(rows.get('profile') or []) if rows else None, 'recordExitCode': rows.get('exitCode'),
              'marks': mark_lines, 'scriptWrites': writes, 'tmpdirLeft': tmp_left, 'trace': [l for l in output.split('\n') if l.startswith(('TRACE', 'KILLPG'))],
              'outputTail': output[-1500:]}
    ok = not tree_after and not survivors
    if batch in ('E', 'ET', 'G', 'H', 'EARLYW', 'EARLYS', 'MIX', 'RSTOP', 'LOCK', 'PIPE', 'LINGER', 'DETACH', 'NOTERM', 'PTY'):
        result['exercised'] = bool(sent) and (batch != 'RSTOP' or any(e['what'] == 'checkout entered' for e in events))
    if batch == 'K':
        calls = [l for l in output.split('\n') if l.startswith('KILLPG ')]
        at = next((i for i, l in enumerate(calls) if l.endswith('(injected)')), None)
        result['exercised'] = at is not None and at + 1 < len(calls) and calls[at + 1].split()[2] == str(int(signal.SIGTERM))
    if batch in ('K', 'H', 'P0'): ok = ok and proc.returncode == 0 and rows.get('fileTests') == 299 and len(rows.get('profile') or []) == PROFILE_ROWS
    if batch == 'P0':
        import re as _re
        def target(l):
            m = _re.search(r'"([^"]*)"', l)
            return m.group(1) if m else ''
        unlinked = {target(l) for l in writes if l.startswith('unlink(')}
        def allowed(l):
            # OUT.json, the two instrumented files, the TemporaryDirectory (<tmp>/tmp*), the /dev/null vitest's stderr goes to, and
            # tempfile's writability probe: a file created with O_EXCL directly in <tmp> and unlinked again
            t = target(l)
            return (t == '<tmp>/measure-out.json' or t in ('<tree>/' + FILE, '<tree>/' + KIT) or t.startswith('<tmp>/tmp') or t == '/dev/null'
                    or (t.startswith('<tmp>/') and '/' not in t[len('<tmp>/'):] and t in unlinked))
        fd_relative = [l for l in writes if _re.match(r'(unlinkat|openat|mkdirat|renameat2?)\(\d+,', l)]
        result['scriptWritesFdRelative'] = fd_relative
        result['scriptWritesOutsideAllowed'] = [l for l in writes if l not in fd_relative and not allowed(l)]
        ok = ok and not result['scriptWritesOutsideAllowed']
    result['passes'] = ok and result.get('exercised', True)
    path = os.path.join(outdir, label, f'{version}-{param}-{n}.json')
    json.dump(result, open(path, 'w'), indent=1)
    line = (f"{label} {version} {param} #{n}: exit {proc.returncode} (claimed {claimed}, {'as claimed' if result['exitAsClaimed'] else 'NOT as claimed'}), "
            f"exited {exited} s, tree {'clean' if not tree_after else 'DIRTY ' + repr(tree_after.strip())}, {len(survivors)} survivors of "
            f"{len(seen)} seen, vitest seen {result['vitestSeen']}, record runs {result['recordRuns']} tests {result['recordTests']}, "
            f"exercised {result.get('exercised', '-')} -> {'pass' if result['passes'] else 'FAIL'}")
    print(line, flush=True)
    if survivors: print('   survivors:', {p: (v['cmdline'] or '')[:80] for p, v in survivors.items()}, flush=True)
    if result['trace']: print('   trace:', result['trace'][:12], flush=True)
    if status(): sys.exit('tree not restored after an attempt')
    if os.path.exists(os.path.join(tree, '.git', 'index.lock')): sys.exit('index.lock left after an attempt')
    return result


params = PARAMS.get(batch, [None])
results = []
for n in range(1, repeats + 1):
    for param in params:
        for version in versions:
            results.append(attempt(version, param, n))
summary = {}
for version in versions:
    mine = [r for r in results if r['version'] == version]
    summary[version] = {'attempts': len(mine), 'passed': sum(r['passes'] for r in mine), 'dirty': sum(bool(r['treeAfterExit']) for r in mine),
                        'withSurvivors': sum(bool(r['survivors']) for r in mine), 'exitAsClaimed': sum(r['exitAsClaimed'] for r in mine),
                        'exercised': sum(bool(r.get('exercised', True)) for r in mine)}
json.dump({'batch': batch, 'profile': not no_profile, 'commit': git('rev-parse', 'HEAD').strip(), 'tool': {'path': os.path.realpath(__file__), 'sha256': sha(__file__)},
           'scripts': {v: {'path': SCRIPTS[v], 'sha256': sha(SCRIPTS[v])} for v in versions}, 'repeats': repeats, 'params': params,
           'summary': summary, 'loadAtEnd': os.getloadavg()}, open(os.path.join(outdir, f'{label}-summary.json'), 'w'), indent=1)
print('SUMMARY', label, json.dumps(summary), flush=True)
