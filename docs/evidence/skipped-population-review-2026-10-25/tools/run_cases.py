#!/usr/bin/env python3
"""rev-527: runs syzygy-bpyt.4.30's skipped-population check (or the whole system tier) under named cases.

usage: python3 -I run_cases.py CLONE OUTDIR CASE[:REPEAT] ...

Each case applies its edits to CLONE's worktree (each old fragment must occur exactly once), runs vitest with the JSON
reporter in a session of its own with a private TMPDIR (/tmp/r527-<case>-<n>, deleted afterwards), walks its descendants by
/proc parent links every 0.25 s, waits 3 s after vitest exits, and reports every process still alive that was seen as a
descendant (same start time) or that sits in a session one of them led. The edits are written back however the run ends.
'full' cases run the whole tier unfiltered; the others run only the check row's file. 'shim' imports a getuid() -> 0 shim
that patches only processes whose argv[1] is tinypool's worker entry (test workers, the collection's workers) or which have
no argv[1] (the `node -e` collection child), never npx, vitest's main process or the daemon. 'merged' swaps in
state-dir.system.test.ts from PR 525's head ab980492.
"""
import json, os, shutil, signal, subprocess, sys, time

clone, outdir = os.path.realpath(sys.argv[1]), os.path.realpath(sys.argv[2])
SRC = 'packages/cap1-system/src'
CHECK = f'{SRC}/skipped-population.system.test.ts'
STATE = f'{SRC}/state-dir.system.test.ts'
CFG = 'packages/cap1-system/vitest.config.ts'
PR525 = 'ab98049294f06d3b58c1ca3bf8d2dde3e75bfad8'
STATE_ROW = 'rejects an unreadable state-dir path as named invalid before writes or a listener'
SHIM = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'getuid-zero-scoped.mjs')
DEADLINE_S = 900


def E(file, old, new):
    return (file if '/' in file else f'{SRC}/{file}', old, new)


FC = {'SYZYGY_FRESH_CLONE': '1'}
# name: dict(edits=[...], env={}, shim=False, full=False, merged=False)
CASES = {
    # controls
    'control': {},
    'control-fc': {'env': FC},
    'control-ci': {'env': {'CI': 'true'}},
    'full': {'full': True},
    'full-merged': {'full': True, 'merged': True},
    'full-fc': {'full': True, 'env': FC},
    'full-fc-merged': {'full': True, 'env': FC, 'merged': True},
    # the lane's forms, reproduced
    'S1': {'edits': [E('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  it.skipIf(true)('{STATE_ROW}'")]},
    'S1-fc': {'env': FC, 'edits': [E('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  it.skipIf(true)('{STATE_ROW}'")]},
    'S1-merged-literal': {'merged': True, 'edits': [E('state-dir.system.test.ts', f"it.skipIf(isRoot)('{STATE_ROW}'", f"it.skipIf(true)('{STATE_ROW}'")]},
    'it-skip': {'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'", "  it.skip('the token file is owner-only (mode 0600)'")]},
    'describe-skip': {'edits': [E('write-boundary.system.test.ts', "describe('RT6 — write boundary by harness-external filesystem observation'", "describe.skip('RT6 — write boundary by harness-external filesystem observation'")]},
    'guard-narrowed': {'edits': [E('fresh-clone.system.test.ts', 'it.skipIf(!RUN_FRESH_CLONE)(', 'it.skipIf(false)(')]},
    # my own forms
    'skipIf-process': {'edits': [E('process.system.test.ts', "describe('RT6 — process reality', () => {\n  it(", "describe('RT6 — process reality', () => {\n  it.skipIf(process.platform === 'linux')(")]},
    'test-skip': {'edits': [E('degradation.system.test.ts', "import { afterEach, describe, expect, it } from 'vitest';", "import { afterEach, describe, expect, it, test } from 'vitest';"),
                            E('degradation.system.test.ts', "describe('RT6 — honest degradation over real disk state', () => {\n  it(", "describe('RT6 — honest degradation over real disk state', () => {\n  test.skip(")]},
    'describe-skipIf': {'edits': [E('full-facts.system.test.ts', "describe('RT6 — full-facts demonstration over the spawned daemon'", "describe.skipIf(process.env['HOME'] !== undefined)('RT6 — full-facts demonstration over the spawned daemon'")]},
    'it-runIf-false': {'edits': [E('daemon-entry-unchanged.system.test.ts', "  it('a state directory inside the governed plane is refused with the same message'", "  it.runIf(false)('a state directory inside the governed plane is refused with the same message'")]},
    'it-only': {'edits': [E('process.system.test.ts', "describe('RT6 — process reality', () => {\n  it(", "describe('RT6 — process reality', () => {\n  it.only(")]},
    'it-only-ci': {'env': {'CI': 'true'}, 'edits': [E('process.system.test.ts', "describe('RT6 — process reality', () => {\n  it(", "describe('RT6 — process reality', () => {\n  it.only(")]},
    'it-todo': {'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'", "  it.todo('a todo row added by rev-527');\n  it('the token file is owner-only (mode 0600)'")]},
    'describe-todo': {'edits': [E('effect-observer.system.test.ts', "describe('system effect-observer lifecycle'", "describe.todo('a todo suite added by rev-527');\ndescribe('system effect-observer lifecycle'")]},
    'it-concurrent-skip': {'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'", "  it.concurrent.skip('the token file is owner-only (mode 0600)'")]},
    'it-only-credentials': {'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'", "  it.only('the token file is owner-only (mode 0600)'")]},
    'it-only-credentials-ci': {'env': {'CI': 'true'}, 'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)'", "  it.only('the token file is owner-only (mode 0600)'")]},
    'describe-todo-existing': {'edits': [E('write-boundary.system.test.ts', "describe('RT6 — write boundary by harness-external filesystem observation'", "describe.todo('RT6 — write boundary by harness-external filesystem observation'")]},
    'each-empty': {'edits': [E('process.system.test.ts', "describe('RT6 — process reality', () => {\n  it(", "describe('RT6 — process reality', () => {\n  it.each([] as number[])(")]},
    # forms collection cannot see as skipped
    'config-exclude': {'edits': [E(CFG, "    include: ['src/**/*.system.test.ts'],", "    include: ['src/**/*.system.test.ts'],\n    exclude: ['src/write-boundary.system.test.ts'],")]},
    'config-include-narrowed': {'edits': [E(CFG, "    include: ['src/**/*.system.test.ts'],", "    include: ['src/{d,e,f,s}*.system.test.ts'],")]},
    'conditional-registration': {'edits': [E('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  if (process.platform !== 'linux') it('{STATE_ROW}'")]},
    'runtime-ctx-skip': {'edits': [E('credentials.system.test.ts', "  it('the token file is owner-only (mode 0600)', async () => {", "  it('the token file is owner-only (mode 0600)', async (ctx) => {\n    ctx.skip();")]},
    # the check's own literal widened
    'expected-widened': {'edits': [E(CHECK, "      ...(process.getuid?.() === 0 ? [ROOT_ROW] : []),", "      ROOT_ROW,")]},
    'expected-widened-S1': {'edits': [E(CHECK, "      ...(process.getuid?.() === 0 ? [ROOT_ROW] : []),", "      ROOT_ROW,"),
                                      E('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  it.skipIf(true)('{STATE_ROW}'")]},
    # census-parse mutants (fail closed)
    'vacuous-census-fc': {'env': FC, 'edits': [E(CHECK, "const tests = testModules.flatMap(", "const tests = [].flatMap(")]},
    'vacuous-census-fc-no-self-check': {'env': FC, 'edits': [E(CHECK, "const tests = testModules.flatMap(", "const tests = [].flatMap("),
                                                             E(CHECK, "    expect(rows.find((test) => test.row === THIS_ROW)?.state).toBe('pending');\n", "")]},
    'import-fails': {'edits': [E('degradation.system.test.ts', "describe('RT6 — honest degradation over real disk state'", "throw new Error('rev-527 mutant: this file fails to load');\ndescribe('RT6 — honest degradation over real disk state'")]},
    'import-fails-no-errors-check': {'edits': [E('degradation.system.test.ts', "describe('RT6 — honest degradation over real disk state'", "throw new Error('rev-527 mutant: this file fails to load');\ndescribe('RT6 — honest degradation over real disk state'"),
                                               E(CHECK, "    expect(census.errors, `collection errors: ${JSON.stringify(census.errors)}`).toEqual([]);\n", "")]},
    'import-fails-no-errors-check-fc': {'env': FC, 'edits': [E('degradation.system.test.ts', "describe('RT6 — honest degradation over real disk state'", "throw new Error('rev-527 mutant: this file fails to load');\ndescribe('RT6 — honest degradation over real disk state'"),
                                                             E(CHECK, "    expect(census.errors, `collection errors: ${JSON.stringify(census.errors)}`).toEqual([]);\n", "")]},
    'api-renamed': {'edits': [E(CHECK, "await vitest.collect();", "await vitest.collectTests();")]},
    'state-renamed-fc': {'env': FC, 'edits': [E(CHECK, "const skipped = rows.filter((test) => test.state === 'skipped')", "const skipped = rows.filter((test) => test.state === 'skip')")]},
    'state-renamed-fc-S1': {'env': FC, 'edits': [E(CHECK, "const skipped = rows.filter((test) => test.state === 'skipped')", "const skipped = rows.filter((test) => test.state === 'skip')"),
                                                 E('state-dir.system.test.ts', f"  it('{STATE_ROW}'", f"  it.skipIf(true)('{STATE_ROW}'")]},
    'exit-nonzero': {'edits': [E(CHECK, "console.log('CENSUS ' + JSON.stringify({ tests, errors }));", "console.log('CENSUS ' + JSON.stringify({ tests, errors }));\nprocess.exitCode = 3;")]},
    'exit-nonzero-no-code-check': {'edits': [E(CHECK, "console.log('CENSUS ' + JSON.stringify({ tests, errors }));", "console.log('CENSUS ' + JSON.stringify({ tests, errors }));\nprocess.exitCode = 3;"),
                                             E(CHECK, "    expect(code).toBe(0);\n", "")]},
    'hang-interrupted': {'interruptAfter': 12, 'edits': [E(CHECK, "await vitest.close();\nconsole.log('CENSUS '", "await new Promise((resolve) => setTimeout(resolve, 600_000));\nconsole.log('CENSUS '")]},
    'lifeline-control': {'edits': [E(CHECK, "const COLLECT = `\nconst { createVitest }", "const COLLECT = `\nconst parent = process.ppid;\nsetInterval(() => { if (process.ppid !== parent) process.kill(-process.pid, 'SIGKILL'); }, 500).unref();\nconst { createVitest }")]},
    'lifeline-hang-interrupted': {'interruptAfter': 12, 'edits': [E(CHECK, "const COLLECT = `\nconst { createVitest }", "const COLLECT = `\nconst parent = process.ppid;\nsetInterval(() => { if (process.ppid !== parent) process.kill(-process.pid, 'SIGKILL'); }, 500).unref();\nconst { createVitest }"), E(CHECK, "await vitest.close();\nconsole.log('CENSUS '", "await new Promise((resolve) => setTimeout(resolve, 600_000));\nconsole.log('CENSUS '")]},
    'lifeline-hang': {'edits': [E(CHECK, "const COLLECT = `\nconst { createVitest }", "const COLLECT = `\nconst parent = process.ppid;\nsetInterval(() => { if (process.ppid !== parent) process.kill(-process.pid, 'SIGKILL'); }, 500).unref();\nconst { createVitest }"), E(CHECK, "await vitest.close();\nconsole.log('CENSUS '", "await new Promise((resolve) => setTimeout(resolve, 600_000));\nconsole.log('CENSUS '")]},
    'fileset-control': {'edits': [E(CHECK, "console.log('CENSUS ' + JSON.stringify({ tests, errors }));", "console.log('CENSUS ' + JSON.stringify({ tests, errors, files: testModules.map((module) => module.moduleId) }));"),
                 E(CHECK, "    expect(code).toBe(0);\n", "    expect(code).toBe(0);\n    const onDisk = readdirSync(path.join(PACKAGE_ROOT, 'src')).filter((name) => name.endsWith('.system.test.ts')).map((name) => `src/${name}`).sort();\n    expect((census as unknown as { files: string[] }).files.map((file) => path.relative(PACKAGE_ROOT, file)).sort(), 'tier files collected vs on disk').toEqual(onDisk);\n"),
                 E(CHECK, "import * as path from 'node:path';", "import { readdirSync } from 'node:fs';\nimport * as path from 'node:path';")]},
    'fileset-config-exclude': {'edits': [E(CHECK, "console.log('CENSUS ' + JSON.stringify({ tests, errors }));", "console.log('CENSUS ' + JSON.stringify({ tests, errors, files: testModules.map((module) => module.moduleId) }));"),
                 E(CHECK, "    expect(code).toBe(0);\n", "    expect(code).toBe(0);\n    const onDisk = readdirSync(path.join(PACKAGE_ROOT, 'src')).filter((name) => name.endsWith('.system.test.ts')).map((name) => `src/${name}`).sort();\n    expect((census as unknown as { files: string[] }).files.map((file) => path.relative(PACKAGE_ROOT, file)).sort(), 'tier files collected vs on disk').toEqual(onDisk);\n"),
                 E(CHECK, "import * as path from 'node:path';", "import { readdirSync } from 'node:fs';\nimport * as path from 'node:path';"), E(CFG, "    include: ['src/**/*.system.test.ts'],", "    include: ['src/**/*.system.test.ts'],\n    exclude: ['src/write-boundary.system.test.ts'],")]},
    'fileset-config-include-narrowed': {'edits': [E(CHECK, "console.log('CENSUS ' + JSON.stringify({ tests, errors }));", "console.log('CENSUS ' + JSON.stringify({ tests, errors, files: testModules.map((module) => module.moduleId) }));"),
                 E(CHECK, "    expect(code).toBe(0);\n", "    expect(code).toBe(0);\n    const onDisk = readdirSync(path.join(PACKAGE_ROOT, 'src')).filter((name) => name.endsWith('.system.test.ts')).map((name) => `src/${name}`).sort();\n    expect((census as unknown as { files: string[] }).files.map((file) => path.relative(PACKAGE_ROOT, file)).sort(), 'tier files collected vs on disk').toEqual(onDisk);\n"),
                 E(CHECK, "import * as path from 'node:path';", "import { readdirSync } from 'node:fs';\nimport * as path from 'node:path';"), E(CFG, "    include: ['src/**/*.system.test.ts'],", "    include: ['src/{d,e,f,s}*.system.test.ts'],")]},
    'hang': {'edits': [E(CHECK, "await vitest.close();\nconsole.log('CENSUS '", "await new Promise((resolve) => setTimeout(resolve, 600_000));\nconsole.log('CENSUS '")]},
    # run at a real merge of the subject and PR 525's head (checked out by hand)
    'real-merge-full': {'full': True},
    'real-merge-fc': {'full': True, 'env': FC},
    'real-merge-shim': {'full': True, 'shim': True},
    'main-merge-full': {'full': True},
    'main-merge-fc': {'full': True, 'env': FC},
    'main-merge-shim': {'full': True, 'shim': True},
    # uid-0 arm by shim
    'shim-subject': {'shim': True, 'full': True},
    'shim-merged': {'shim': True, 'full': True, 'merged': True},
    'noshim-merged': {'full': True, 'merged': True},
}

for _name in ('conditional-registration', 'config-exclude', 'each-empty', 'runtime-ctx-skip', 'it-only'):
    CASES[f'full-{_name}'] = {**CASES[_name], 'full': True}

def stat(pid):
    try:
        text = open(f'/proc/{pid}/stat').read()
    except OSError:
        return None
    f = text[text.rindex(')') + 2:].split()
    return {'ppid': int(f[1]), 'sid': int(f[3]), 'start': int(f[19])}


def procs():
    out = {}
    for p in os.listdir('/proc'):
        if p.isdigit() and (s := stat(int(p))) is not None:
            out[int(p)] = s
    return out


def cmdline(pid):
    try:
        return open(f'/proc/{pid}/cmdline', 'rb').read().replace(b'\0', b' ').decode(errors='replace').strip()[:160]
    except OSError:
        return None


def walk(root, seen):
    ps = procs()
    kids = {}
    for pid, s in ps.items():
        kids.setdefault(s['ppid'], []).append(pid)
    todo = [root]
    while todo:
        for c in kids.get(todo.pop(), []):
            if c not in seen:
                seen[c] = {**ps[c], 'cmdline': cmdline(c)}
            todo.append(c)


def git(*a):
    return subprocess.run(['git', *a], cwd=clone, capture_output=True, check=True).stdout


def run(name, n, spec):
    edits = spec.get('edits', [])
    files = {}
    if spec.get('merged'):
        files[STATE] = git('show', f'{PR525}:{STATE}')
    for file, old, new in edits:
        text = files.get(file) or open(os.path.join(clone, file), 'rb').read()
        count = text.count(old.encode())
        if count != 1:
            sys.exit(f'{name}: old fragment occurs {count} times in {file}')
        files[file] = text.replace(old.encode(), new.encode())
    originals = {p: open(os.path.join(clone, p), 'rb').read() for p in files}
    tmp = f'/tmp/r527-{name}-{n}'
    os.makedirs(tmp, exist_ok=False)
    report = os.path.join(tmp, 'report.json')
    cmd = ['npx', 'vitest', 'run', '--config', CFG] + ([] if spec.get('full') else ['skipped-population']) + [
        '--reporter=json', f'--outputFile={report}']
    env = {k: v for k, v in os.environ.items() if k not in ('SYZYGY_FRESH_CLONE', 'CI', 'NODE_OPTIONS')}
    env.update({'TMPDIR': tmp, **spec.get('env', {})})
    if spec.get('shim'):
        env['NODE_OPTIONS'] = f'--import=file://{SHIM}'
    load0 = open('/proc/loadavg').read().split()[:3]
    try:
        for p, data in files.items():
            open(os.path.join(clone, p), 'wb').write(data)
        t0 = time.monotonic()
        proc = subprocess.Popen(cmd, cwd=clone, env=env, start_new_session=True,
                                stdout=open(os.path.join(tmp, 'stdout.txt'), 'wb'), stderr=subprocess.STDOUT)
        seen, killed, interrupted = {}, False, None
        while proc.poll() is None:
            if spec.get('interruptAfter') and interrupted is None and time.monotonic() - t0 > spec['interruptAfter']:
                walk(proc.pid, seen)
                os.killpg(proc.pid, signal.SIGTERM)
                interrupted = round(time.monotonic() - t0, 1)
            if time.monotonic() - t0 > DEADLINE_S:
                os.killpg(proc.pid, signal.SIGKILL)
                killed = True
                proc.wait()
                break
            walk(proc.pid, seen)
            time.sleep(0.25)
        wall = round(time.monotonic() - t0, 1)
    finally:
        for p, data in originals.items():
            open(os.path.join(clone, p), 'wb').write(data)
    load1 = open('/proc/loadavg').read().split()[:3]
    time.sleep(3)
    sids = {s['sid'] for s in seen.values()} | {proc.pid}
    survivors = {str(pid): cmdline(pid) for pid, s in procs().items()
                 if (pid in seen and seen[pid]['start'] == s['start']) or s['sid'] in sids}
    for pid in survivors:
        try:
            os.kill(int(pid), signal.SIGKILL)
        except ProcessLookupError:
            pass
    data = json.load(open(report)) if os.path.exists(report) else {}
    tail = open(os.path.join(tmp, 'stdout.txt'), 'rb').read().decode(errors='replace')[-3000:]
    shutil.rmtree(tmp, ignore_errors=True)
    tests = [{'file': os.path.relpath(s['name'], clone), 'name': a['fullName'], 'status': a['status'],
              'durationMs': None if a.get('duration') is None else round(a['duration']),
              'failure': (a.get('failureMessages') or [''])[0][:1200] or None}
             for s in data.get('testResults', []) for a in s.get('assertionResults', [])]
    suites = [{'file': os.path.relpath(s['name'], clone), 'status': s.get('status'), 'message': (s.get('message') or '')[:600]}
              for s in data.get('testResults', [])]
    check = [t for t in tests if t['name'].startswith('system tier: the skipped population')]
    counts = {}
    for t in tests:
        counts[t['status']] = counts.get(t['status'], 0) + 1
    clean = subprocess.run(['git', 'status', '--porcelain', '--untracked-files=no'], cwd=clone, capture_output=True, text=True).stdout
    return {'case': name, 'n': n, 'head': git('rev-parse', 'HEAD').decode().strip(), 'command': ' '.join(cmd).replace(tmp, '<tmp>'),
            'env': {**spec.get('env', {}), **({'NODE_OPTIONS': '--import=<getuid-zero-scoped.mjs>'} if spec.get('shim') else {})},
            'merged': bool(spec.get('merged')), 'edits': [{'file': f, 'old': o, 'new': nw} for f, o, nw in edits],
            'exitCode': proc.returncode, 'wallSeconds': wall, 'killedAtDeadline': killed, 'loadavgStart': load0, 'loadavgEnd': load1,
            'processesSeen': len(seen), 'sessionsSeen': len(sids), 'survivors': survivors, 'counts': counts,
            'interruptedAt': interrupted, 'seenCmdlines': sorted({(c['cmdline'] or '').replace(clone, '<clone>') for c in seen.values()}),
            'numTotalTests': data.get('numTotalTests'), 'suites': suites, 'checkRow': check[0] if len(check) == 1 else check,
            'tests': tests, 'stdoutTail': tail, 'treeCleanAfter': clean == ''}


results = []
for arg in sys.argv[3:]:
    name, _, rep = arg.partition(':')
    for _ in range(int(rep or 1)):
        n = 0
        while os.path.exists(os.path.join(outdir, f'run-{name}-{n}.json')):
            n += 1
        r = run(name, n, CASES[name])
        out = os.path.join(outdir, f'run-{name}-{n}.json')
        json.dump(r, open(out, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
        cr = r['checkRow']
        crs = (cr.get('status'), cr.get('durationMs')) if isinstance(cr, dict) else ('rows', len(cr))
        print(f"{name}#{n}: exit {r['exitCode']} wall {r['wallSeconds']}s counts {r['counts']} check {crs} "
              f"survivors {len(r['survivors'])} sessions {r['sessionsSeen']} load {r['loadavgStart'][0]}->{r['loadavgEnd'][0]} clean {r['treeCleanAfter']}",
              flush=True)
        if isinstance(cr, dict) and cr.get('status') == 'failed':
            print('   failure: ' + (cr.get('failure') or '')[:400].replace('\n', ' | '), flush=True)
        results.append(r)
