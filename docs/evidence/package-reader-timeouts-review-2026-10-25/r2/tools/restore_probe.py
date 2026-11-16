#!/usr/bin/env python3
"""rev-520b probes of scripts/measure_vitest_test_durations.py --profile restore and process-group paths (PR 520 round 2).

usage: python3 -I restore_probe.py TREE VERSION MODE OUT.json [--param N] [--inject INJECT_MODE]
  VERSION old | new: old is `git show 3e563ec4:scripts/measure_vitest_test_durations.py` copied into rev-520b/tools/; new is TREE's.
  MODE:
    p0         a profiled run to the end, no signal; also snapshots every non-.git file under TREE changed after the start,
               the ignored/untracked status, and TMPDIR afterwards (what the script writes).
    d1         --file consent-ports.test.ts (its vitest import line is not the anchor); no signal.
    inject     no signal. Any mode may add --inject INJECT_MODE: the script then runs under tools/inject.py INJECT_MODE
               (second-write, killpg-log, killpg-race, trace-exit).
    term       SIGTERM to the script's PID, 3 s after vitest's worker is seen.
    hup        SIGHUP to the script's PID, same point.
    int-group  SIGINT to the script's process group (it leads its own session, so this is every process still in it), same point.
    term-twice SIGTERM to the script's PID, then a second SIGTERM PARAM ms later (default 100), same point.
    term-gap   two SIGTERMs PARAM microseconds apart (busy wait), 0.5 s after vitest's worker is seen.
    term-early SIGTERM PARAM microseconds (busy wait) after the test file's instrumented write is seen, before or while vitest starts.
    hup-nohup  as hup, but the script starts with SIGHUP ignored, as `nohup` starts it.
    timeout    no signal from the probe: the script runs as `timeout PARAM <script ...>` (GNU coreutils), which on expiry sends
               SIGTERM to the script and then to its own process group, which holds the script.
The script starts in a session of its own with SIGINT and SIGHUP reset to SIG_DFL (except hup-nohup), TMPDIR a private /tmp/r520b-* dir.
Descendants: every process seen by walking /proc ppid links from the script's PID every 50 ms while it runs, plus any process whose
cwd is inside TREE and which started after this probe (the second method catches a child orphaned before a walk saw it). 3 s after
the script exits, a descendant survives if its PID still has the recorded start time, or if it is in a recorded process group or
session, or if it is a cwd-in-TREE process started after this probe. Survivors are listed, then sent SIGKILL by PID only. A dirty
tree is recorded, then restored with git checkout of the two instrumented files."""
import hashlib, json, os, shutil, signal, subprocess, sys, time

tree, version, mode, out_path = os.path.realpath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
argv = sys.argv[5:]
param = float(argv[argv.index('--param') + 1]) if '--param' in argv else None
inject = argv[argv.index('--inject') + 1] if '--inject' in argv else None
HERE = os.path.dirname(os.path.realpath(__file__))
FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
D1_FILE = 'packages/polaris-generation-consent/src/consent-ports.test.ts'
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
status = lambda: git('status', '--porcelain', '--untracked-files=no')
if status(): sys.exit('tree not clean')
old_script = os.path.join(HERE, 'old_measure_vitest_test_durations.py')
if not os.path.exists(old_script):
    open(old_script, 'wb').write(subprocess.run(['git', 'show', '3e563ec4:scripts/measure_vitest_test_durations.py'], cwd=tree, capture_output=True, check=True).stdout)
script = old_script if version == 'old' else os.path.join(tree, 'scripts/measure_vitest_test_durations.py')
script_sha = hashlib.sha256(open(script, 'rb').read()).hexdigest()
TICKS = os.sysconf('SC_CLK_TCK')

def stat(pid):
    try: text = open(f'/proc/{pid}/stat').read()
    except OSError: return None
    f = text[text.rindex(')') + 2:].split()
    return {'ppid': int(f[1]), 'pgid': int(f[2]), 'sid': int(f[3]), 'start': int(f[19]), 'state': f[0]}
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace').strip()[:160]
    except OSError: return None
def cwd(pid):
    try: return os.readlink(f'/proc/{pid}/cwd')
    except OSError: return None
my_start = stat(os.getpid())['start']
def procs():
    out = {}
    for p in os.listdir('/proc'):
        if p.isdigit() and (s := stat(int(p))) is not None: out[int(p)] = s
    return out
def walk(root, seen):
    ps = procs()
    kids = {}
    for pid, s in ps.items(): kids.setdefault(s['ppid'], []).append(pid)
    todo = [root]
    while todo:
        for c in kids.get(todo.pop(), []):
            if c not in seen: seen[c] = {**ps[c], 'cmdline': cmdline(c)}
            todo.append(c)
    for pid, s in ps.items():   # second method: cwd inside TREE, started after this probe
        if pid not in seen and pid != os.getpid() and s['start'] >= my_start and (d := cwd(pid)) and (d == tree or d.startswith(tree + '/')):
            seen[pid] = {**s, 'cmdline': cmdline(pid), 'byCwd': True}
def vitest_started(seen): return sum('vitest' in (d['cmdline'] or '') for d in seen.values()) >= 2

tmp = f'/tmp/r520b-{mode}-{os.getpid()}'
os.mkdir(tmp)
out_json = os.path.join(tmp, 'measure-out.json')
file_arg = D1_FILE if mode == 'd1' else FILE
cmd = ['python3', '-I', script, '.', '--file', file_arg, '--project', '@syzygy/polaris-generation-consent', '--mode', 'alone', '--runs', '1', '--out', out_json, '--profile']
if inject: cmd = ['python3', '-I', os.path.join(HERE, 'inject.py'), inject, script, *cmd[3:]]
if mode == 'timeout': cmd = ['timeout', str(param), *cmd]
def pre():
    signal.signal(signal.SIGINT, signal.SIG_DFL)
    signal.signal(signal.SIGHUP, signal.SIG_IGN if mode == 'hup-nohup' else signal.SIG_DFL)
marker = time.time()
time.sleep(0.05)
proc = subprocess.Popen(cmd, cwd=tree, start_new_session=True, env={**os.environ, 'TMPDIR': tmp}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, preexec_fn=pre)
import threading
chunks = []
reader = threading.Thread(target=lambda: chunks.append(proc.stdout.read()), daemon=True); reader.start()
seen, t0, events = {}, time.monotonic(), []
def ev(what): events.append({'t': round(time.monotonic() - t0, 4), 'what': what, 'groupAlive': any(stat(p) and stat(p)['start'] == d['start'] for p, d in seen.items())})
def send(sig, whom='pid'):
    try:
        (os.killpg if whom == 'group' else os.kill)(proc.pid, sig)
        ev(f'sent {signal.Signals(sig).name} to {whom}')
    except ProcessLookupError: ev(f'{signal.Signals(sig).name}: script already gone')
def busy(us):
    end = time.perf_counter() + us / 1e6
    while time.perf_counter() < end: pass

if mode in ('term', 'hup', 'hup-nohup', 'int-group', 'term-twice', 'term-gap'):
    while time.monotonic() - t0 < 120 and proc.poll() is None:
        walk(proc.pid, seen)
        if vitest_started(seen): break
        time.sleep(0.05)
    ev('vitest worker seen' if vitest_started(seen) else 'vitest worker NOT seen')
    end = time.monotonic() + (0.5 if mode == 'term-gap' else 3)
    while time.monotonic() < end: walk(proc.pid, seen); time.sleep(0.05)
    ev('tree at signal: ' + repr(status()))
    if mode == 'term': send(signal.SIGTERM)
    elif mode in ('hup', 'hup-nohup'): send(signal.SIGHUP)
    elif mode == 'int-group': send(signal.SIGINT, 'group')
    elif mode == 'term-twice':
        send(signal.SIGTERM); time.sleep((param or 100) / 1000); walk(proc.pid, seen); send(signal.SIGTERM)
    elif mode == 'term-gap':
        os.kill(proc.pid, signal.SIGTERM); busy(param or 0); os.kill(proc.pid, signal.SIGTERM); ev(f'sent 2 SIGTERM {param} us apart')
elif mode == 'term-early':
    full = os.path.join(tree, FILE)
    base = os.stat(full).st_mtime_ns
    deadline = time.monotonic() + 60
    while time.monotonic() < deadline and proc.poll() is None and os.stat(full).st_mtime_ns == base: pass
    busy(param or 0)
    os.kill(proc.pid, signal.SIGTERM)
    ev(f'test file write seen; SIGTERM {param} us after')
while proc.poll() is None and time.monotonic() - t0 < 900:
    walk(proc.pid, seen); time.sleep(0.05)
if proc.poll() is None: proc.kill(); ev('probe killed the script after 900 s')
exit_t = round(time.monotonic() - t0, 3)
time.sleep(3)
reader.join(5)
output = (chunks[0] if chunks else b'').decode(errors='replace')
tree_after = status()
walk(-1, seen)   # cwd scan only
groups = {d['pgid'] for d in seen.values()} | {d['sid'] for d in seen.values()}
survivors = {}
for pid, s in procs().items():
    if pid == os.getpid(): continue
    if (pid in seen and seen[pid]['start'] == s['start']) or ((s['pgid'] in groups or s['sid'] in groups) and s['start'] >= my_start):
        survivors[pid] = {'cmdline': cmdline(pid), 'state': s['state'], 'pgid': s['pgid'], 'sid': s['sid']}
for pid in survivors:
    try: os.kill(pid, signal.SIGKILL)
    except ProcessLookupError: pass
diffstat = git('diff', '--stat')
written_snapshot = None
if mode == 'p0':
    changed = subprocess.run(['find', tree, '-path', os.path.join(tree, '.git'), '-prune', '-o', '-newermt', f'@{marker}', '-print'], capture_output=True, text=True).stdout.split('\n')
    written_snapshot = {'changedPathsUnderTree': sorted(os.path.relpath(p, tree) for p in changed if p and p != tree),
                        'untrackedOrIgnoredStatus': git('status', '--porcelain', '--untracked-files=all'),
                        'tmpdirAfter': sorted(os.listdir(tmp))}
if tree_after: subprocess.run(['git', 'checkout', '--', KIT, FILE], cwd=tree, check=True)
record = json.load(open(out_json)) if os.path.exists(out_json) else None
result = {'mode': mode, 'version': version, 'param': param, 'inject': inject, 'script': os.path.relpath(script, tree) if script.startswith(tree) else script,
          'scriptSha256': script_sha, 'commit': git('rev-parse', 'HEAD').strip(), 'command': ' '.join(cmd).replace(tmp, '<tmp>'),
          'events': events, 'scriptExitAt': exit_t, 'exitCode': proc.returncode, 'outputTail': output[-1500:],
          'descendantsSeen': len(seen), 'descendantsByCwdOnly': sum(1 for d in seen.values() if d.get('byCwd')),
          'treeAfterExit': tree_after, 'diffStatAfterExit': diffstat, 'survivors3sAfterExit': survivors,
          'recordWritten': record is not None, 'recordTests': record['runs'][0]['fileTests'] if record and record.get('runs') else None,
          'recordProfileRows': len(record['runs'][0].get('profile') or []) if record and record.get('runs') else None,
          'writtenSnapshot': written_snapshot, 'treeCleanAfterReviewerRestore': not status()}
result['clean'] = not tree_after
result['noSurvivor'] = not survivors
shutil.rmtree(tmp, ignore_errors=True)
json.dump(result, open(out_path, 'w'), indent=1)
print(json.dumps({k: result[k] for k in ('mode', 'version', 'param', 'inject', 'exitCode', 'scriptExitAt', 'clean', 'noSurvivor', 'descendantsSeen', 'recordTests', 'recordProfileRows')}))
if tree_after: print('  DIRTY:', tree_after.strip().replace('\n', ' | '))
if survivors: print('  SURVIVORS:', {p: (v['cmdline'] or '')[:70] for p, v in survivors.items()})
print('  events:', [(e['t'], e['what'][:60], e['groupAlive']) for e in events])
