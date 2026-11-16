#!/usr/bin/env python3
"""Rule-6 evidence for syzygy-bpyt.4.30: packages/cap1-system/src/skipped-population.system.test.ts. Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-30/tools/skipped_population_probe.py TREE BASE_COMMIT ROOT_SKIP_COMMIT OUT.json

TREE must be a checkout with `npm ci` run and its tracked files clean. BASE_COMMIT is the commit the branch was cut from.
ROOT_SKIP_COMMIT is a commit whose state-dir.system.test.ts carries syzygy-bpyt.4.25's root skip (PR 525). Every case runs only the
check, `npx vitest run --config packages/cap1-system/vitest.config.ts skipped-population` with the JSON reporter, in a session of its
own with a private TMPDIR and a 180 s deadline. The check itself collects the whole tier, so a mutant anywhere in it reaches the
check without the mutated test running. No build is needed: collection runs nothing. The cases:

- control, control-fresh-clone: unmutated, with SYZYGY_FRESH_CLONE unset and set to 1. The check must pass.
- S1: the state-dir mode-000 row skipped always (`it(` to `it.skipIf(true)(`). BASE_COMMIT has no root skip on that row, so this is
  the state S1 of the PR 525 review produces by widening it. The check must fail, its message naming that row as skipped but not
  expected.
- skip-added, describe-skipped: a skip added elsewhere, as `it.skip` on a credentials row and as `describe.skip` on the write-boundary
  file. The check must fail, its message naming the newly skipped file.
- guard-narrowed: the fresh-clone guard made `skipIf(false)`, so that row is no longer skipped. The check must fail, its message
  naming that row as expected but not skipped.
- import-fails: a tier file that throws while it loads. The check must fail with the thrown message.
- collection-hangs: the check's own collection waits 600 s before it prints. The check must fail at its 45 s timeout (its row
  takes at least 45 s), which kills the collection's process group, and no process of it may survive.
- root-shim, root-shim-with-skip, with-skip: NODE_OPTIONS imports a shim that makes process.getuid() return 0 in every node process,
  the check's and the collection's. root-shim runs at BASE_COMMIT's bytes, where the row has no root skip: the check must fail,
  naming that row as expected but not skipped, as that row itself fails under root. root-shim-with-skip runs with
  state-dir.system.test.ts as at ROOT_SKIP_COMMIT: the check must pass. with-skip is the same file without the shim: the check
  must pass. The shim checks the uid condition only; the processes are not root.

While a case runs, its descendants are found every 0.25 s by /proc parent links, which also reach the collection's own session.
Every case must leave none of them, and no process of vitest's session, running 3 s after vitest exits. Each case writes back the
files it changed, however it ends short of a SIGKILL of the tool. The record stores every edit as old and new fragments, each
found exactly once."""
import hashlib, json, os, signal, subprocess, sys, tempfile, time

tree, base_commit, skip_commit, out_path = os.path.realpath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
SRC = 'packages/cap1-system/src'
CHECK = f'{SRC}/skipped-population.system.test.ts'
STATE_TEST = f'{SRC}/state-dir.system.test.ts'
STATE_ROW = 'rejects an unreadable state-dir path as named invalid before writes or a listener'
DEADLINE_S = 180
MIN_CHECK_MS = {'collection-hangs': 45_000}
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
status = lambda: git('status', '--porcelain', '--untracked-files=no')
sha = lambda data: hashlib.sha256(data).hexdigest()
at = lambda commit, path: subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=tree, capture_output=True, check=True).stdout
if status(): sys.exit('tracked files not clean')
head = git('rev-parse', 'HEAD').strip()
base = git('rev-parse', base_commit).strip()
skip = git('rev-parse', skip_commit).strip()

def edit(file, old, new): return {'file': f'{SRC}/{file}', 'old': old, 'new': new}
# (case, edits, files swapped in from ROOT_SKIP_COMMIT, shim, extra env, must pass, a fragment the failure message must carry)
CASES = [
    ('control', [], [], False, {}, True, None),
    ('control-fresh-clone', [], [], False, {'SYZYGY_FRESH_CLONE': '1'}, True, None),
    ('S1', [edit('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  it.skipIf(true)('{STATE_ROW}'")], [], False, {}, False,
     'skipped but not expected: ["src/state-dir.system.test.ts > RTF-1'),
    ('skip-added', [edit('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'",
                         "  it.skip('the token file is owner-only (mode 0600)'")], [], False, {}, False,
     'skipped but not expected: ["src/credentials.system.test.ts'),
    ('describe-skipped', [edit('write-boundary.system.test.ts', "describe('RT6 — write boundary by harness-external filesystem observation'",
                               "describe.skip('RT6 — write boundary by harness-external filesystem observation'")], [], False, {}, False,
     'skipped but not expected: ["src/write-boundary.system.test.ts'),
    ('guard-narrowed', [edit('fresh-clone.system.test.ts', 'it.skipIf(!RUN_FRESH_CLONE)(', 'it.skipIf(false)(')], [], False, {}, False,
     'expected but not skipped: ["src/fresh-clone.system.test.ts'),
    ('import-fails', [edit('degradation.system.test.ts', "describe('RT6 — honest degradation over real disk state'",
                           "throw new Error('census mutant: this file fails to load');\ndescribe('RT6 — honest degradation over real disk state'")],
     [], False, {}, False, 'census mutant: this file fails to load'),
    ('collection-hangs', [{'file': CHECK, 'old': "await vitest.close();\nconsole.log('CENSUS '",
                           'new': "await new Promise((resolve) => setTimeout(resolve, 600_000));\nconsole.log('CENSUS '"}], [], False, {}, False,
     'with no census; it is killed at 45000 ms'),
    ('root-shim', [], [], True, {}, False, 'expected but not skipped: ["src/state-dir.system.test.ts > RTF-1'),
    ('root-shim-with-skip', [], [STATE_TEST], True, {}, True, None),
    ('with-skip', [], [STATE_TEST], False, {}, True, None),
]

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
    """Adds every current descendant of root to seen, by /proc parent links."""
    ps = procs()
    children = {}
    for pid, s in ps.items(): children.setdefault(s['ppid'], []).append(pid)
    todo = [root]
    while todo:
        for child in children.get(todo.pop(), []):
            if child not in seen: seen[child] = {**ps[child], 'cmdline': cmdline(child)}
            todo.append(child)

def vitest(name, env_extra):
    with tempfile.TemporaryDirectory(prefix='laneb-430-') as tmp:
        report = os.path.join(tmp, 'report.json')
        command = ['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', 'skipped-population',
                   '--reporter=json', f'--outputFile={report}']
        env = {**{k: v for k, v in os.environ.items() if k != 'SYZYGY_FRESH_CLONE'}, 'TMPDIR': tmp, **env_extra}
        t0 = time.monotonic()
        proc = subprocess.Popen(command, cwd=tree, start_new_session=True, env=env, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL)
        seen, killed = {}, False
        while proc.poll() is None:
            if time.monotonic() - t0 > DEADLINE_S:
                os.killpg(proc.pid, signal.SIGKILL); killed = True; proc.wait(); break
            walk(proc.pid, seen)
            time.sleep(0.25)
        wall = round(time.monotonic() - t0, 1)
        time.sleep(3)
        survivors = {str(pid): cmdline(pid) for pid, s in procs().items()
                     if (pid in seen and seen[pid]['start'] == s['start']) or s['sid'] == proc.pid}
        for pid in survivors:
            try: os.kill(int(pid), signal.SIGKILL)
            except ProcessLookupError: pass
        data = json.load(open(report)) if os.path.exists(report) else {}
    tests = [{'name': a['fullName'], 'status': a['status'], 'durationMs': None if a.get('duration') is None else round(a['duration']),
              'failure': (a.get('failureMessages') or [''])[0][:1500] or None}
             for s in data.get('testResults', []) for a in s.get('assertionResults', [])]
    return {'case': name, 'command': ' '.join(command).replace(tmp, '<tmp>'), 'exitCode': proc.returncode, 'wallSeconds': wall,
            'killedAtDeadline': killed, 'processesSeen': len(seen),
            'sessionsSeen': len({s['sid'] for s in seen.values()}), 'survivors': survivors, 'tests': tests}

def with_files(contents, body):
    """Writes {path: bytes} into TREE, runs body, writes the original bytes back."""
    originals = {path: open(os.path.join(tree, path), 'rb').read() for path in contents}
    try:
        for path, data in contents.items(): open(os.path.join(tree, path), 'wb').write(data)
        return body()
    finally:
        for path, data in originals.items(): open(os.path.join(tree, path), 'wb').write(data)

runs = []
with tempfile.TemporaryDirectory(prefix='laneb-430-shim-') as shim_dir:
    shim = os.path.join(shim_dir, 'getuid-zero.mjs')
    open(shim, 'w', encoding='utf8').write('process.getuid = () => 0;\n')
    for name, edits, swapped, shimmed, env_extra, must_pass, needle in CASES:
        contents = {path: at(skip, path) for path in swapped}
        for e in edits:
            text = contents.get(e['file']) or open(os.path.join(tree, e['file']), 'rb').read()
            if text.count(e['old'].encode()) != 1: sys.exit(f"{name}: the old fragment occurs {text.count(e['old'].encode())} times")
            contents[e['file']] = text.replace(e['old'].encode(), e['new'].encode())
        env = {**env_extra, **({'NODE_OPTIONS': f'--import=file://{shim}'} if shimmed else {})}
        run = with_files(contents, lambda: vitest(name, env))
        rows = [t for t in run['tests'] if t['name'].startswith('system tier: the skipped population')]
        row = rows[0] if len(rows) == 1 else None
        clean = not run['killedAtDeadline'] and not run['survivors']
        if must_pass: passes = clean and run['exitCode'] == 0 and row is not None and row['status'] == 'passed'
        else: passes = (clean and run['exitCode'] not in (0, None) and row is not None and row['status'] == 'failed'
                        and needle in (row['failure'] or '') and (row['durationMs'] or 0) >= MIN_CHECK_MS.get(name, 0))
        run.update({'edits': edits, 'filesFrom': {path: {'commit': skip, 'sha256': sha(contents[path])} for path in swapped},
                    'env': {**env_extra, **({'NODE_OPTIONS': '--import=file://<tmp>/getuid-zero.mjs'} if shimmed else {})},
                    'mustPass': must_pass, 'failureMustCarry': needle, 'checkRow': row, 'passes': passes})
        print(f"{name}: exit {run['exitCode']}, {run['wallSeconds']} s, check {row and row['status']}, {len(run['survivors'])} survivors, "
              f"passes {passes}", flush=True)
        runs.append(run)
if status(): sys.exit('tree not restored')
out = {'schema': 'skipped-population-probe/1', 'bead': 'syzygy-bpyt.4.30',
       'text': 'Evidence record, not authority: the skipped-population check of the system tier run unmutated, under mutants of the tier that skip too often, too rarely or fail to load, and under a getuid shim with and without the root skip of syzygy-bpyt.4.25. Generated by the tool named here; do not edit.',
       'tool': {'path': 'docs/evidence/syzygy-bpyt-4-30/tools/skipped_population_probe.py', 'sha256': sha(open(os.path.realpath(__file__), 'rb').read())},
       'commit': head, 'baseCommit': base, 'rootSkipCommit': skip,
       'files': {path: {'head': sha(at(head, path))} for path in [CHECK] + sorted({e['file'] for c in CASES for e in c[1]} | {STATE_TEST})},
       'host': {'cores': os.cpu_count(), 'uid': os.getuid(),
                'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()},
       'runs': runs}
out['allPass'] = all(r['passes'] for r in runs)
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(json.dumps({r['case']: r['passes'] for r in runs}), 'allPass', out['allPass'])
