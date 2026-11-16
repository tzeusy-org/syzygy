#!/usr/bin/env python3
"""Interrupt a profiled scripts/measure_vitest_test_durations.py run mid-run and record whether the tree is left dirty and
whether any of its own descendant processes survive (rev-520).

usage: python3 -I signal_probe.py TREE MODE OUT.json      MODE: term-pid | int-pid | int-group
The run is started in its own session. Descendants are found by walking /proc ppid links from the script's PID only; any
survivor is listed, then sent SIGKILL by PID (never by name or pattern). A dirty tree is recorded, then restored with git."""
import json, os, shutil, signal, subprocess, sys, time

tree, mode, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
FILE = 'packages/polaris-generation-consent/src/package-reader.test.ts'
KIT = 'packages/polaris-generation-consent/src/recorder-fixtures.testkit.ts'
status = lambda: subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=tree, capture_output=True, text=True, check=True).stdout
assert not status(), 'tree not clean'
tmp = f'/tmp/r520-sig-{mode}'
os.mkdir(tmp)
scratch_out = os.path.join(tmp, 'measure-out.json')

def children():
    kids = {}
    for p in os.listdir('/proc'):
        if not p.isdigit(): continue
        try:
            stat = open(f'/proc/{p}/stat').read()
            ppid = int(stat[stat.rindex(')') + 2:].split()[1])
            kids.setdefault(ppid, []).append(int(p))
        except (OSError, ValueError):
            pass
    return kids
def descendants(root):
    kids, seen, todo = children(), [], [root]
    while todo:
        p = todo.pop()
        for c in kids.get(p, []): seen.append(c); todo.append(c)
    return seen
def cmdline(pid):
    try: return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode()[:160]
    except OSError: return None

proc = subprocess.Popen(['python3', '-I', 'scripts/measure_vitest_test_durations.py', '.', '--file', FILE, '--project', '@syzygy/polaris-generation-consent',
                         '--mode', 'alone', '--runs', '1', '--out', scratch_out, '--profile'], cwd=tree, start_new_session=True,
                        env={**os.environ, 'TMPDIR': tmp}, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True)
t0 = time.monotonic()
while time.monotonic() - t0 < 60 and KIT not in status(): time.sleep(0.2)
instrumented_after = round(time.monotonic() - t0, 1)
time.sleep(4)   # let vitest start its worker
tree_before_signal = status()
desc = descendants(proc.pid)
snapshot = {pid: cmdline(pid) for pid in desc}
sent_at = round(time.monotonic() - t0, 1)
if mode == 'term-pid': os.kill(proc.pid, signal.SIGTERM)
elif mode == 'int-pid': os.kill(proc.pid, signal.SIGINT)
elif mode == 'int-group': os.killpg(proc.pid, signal.SIGINT)
else: sys.exit('unknown mode')
try:
    output, _ = proc.communicate(timeout=120)
except subprocess.TimeoutExpired:
    proc.kill(); output, _ = proc.communicate()
time.sleep(3)
tree_after = status()
survivors = {pid: cmdline(pid) for pid in desc if cmdline(pid) is not None}
for pid in survivors:
    try: os.kill(pid, signal.SIGKILL)
    except ProcessLookupError: pass
diff = subprocess.run(['git', 'diff', '--stat'], cwd=tree, capture_output=True, text=True).stdout
if tree_after: subprocess.run(['git', 'checkout', '--', KIT, FILE], cwd=tree, check=True)
result = {'mode': mode, 'instrumentedAfterSeconds': instrumented_after, 'signalSentAtSeconds': sent_at, 'treeBeforeSignal': tree_before_signal,
          'descendantsAtSignal': snapshot, 'scriptExitCode': proc.returncode, 'scriptOutputTail': output[-800:],
          'treeAfterExit': tree_after, 'diffStatAfterExit': diff, 'survivingDescendants3sAfterExit': survivors,
          'treeCleanAfterReviewerRestore': not status()}
time.sleep(1)
shutil.rmtree(tmp, ignore_errors=True)
json.dump(result, open(out_path, 'w'), indent=1)
print(json.dumps({k: result[k] for k in ('mode', 'scriptExitCode', 'treeBeforeSignal', 'treeAfterExit', 'survivingDescendants3sAfterExit', 'treeCleanAfterReviewerRestore')}, indent=1))
print('descendants at signal:', len(snapshot), list(snapshot.values())[:4])
