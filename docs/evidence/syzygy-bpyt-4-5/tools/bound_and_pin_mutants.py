#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.4.5: each replaced bound or pin, the old test against the new one (evidence tool, not authority).

usage: python3 -I bound_and_pin_mutants.py TREE BASE_COMMIT CASES.json OUT.json [CASE-ID ...]

CASES.json is a list of cases {id, test, title, mutations: [{file, old, new}], expect: {base, head}, limitSeconds, vitestArgs}
(vitestArgs, optional, are extra arguments to `vitest run`). For each
case and side it sets the test file to BASE_COMMIT's copy (side "base") or leaves the tree's (side "head"), applies each
mutation (its `old` must occur exactly once in that side's file), runs `npx vitest run <test> -t <title>` with the JSON
reporter in its own session (SIGKILLed as a group past limitSeconds, after summing the session's CPU seconds from /proc),
restores every file, and records the row's status,
the first failure line, the exit code and whether it was killed. A row whose failure begins `Error: STACK_TRACE_ERROR` failed
by vitest's own timeout (`byTimeout`): @vitest/runner's makeTimeoutError gives its "timed out" error the stack of an error
named STACK_TRACE_ERROR, and the JSON reporter writes the stack, so the message itself is not in the report. A side's outcome is "pass" (exit 0, every matched row
passed, at least one matched), "fail" (a matched row failed), "killed" (past the limit) or "error". `expect` names the
outcome each side must have; "fail-or-killed" accepts either. Rows are matched by `title` as a substring of the full name.
Runs with TMPDIR set by the caller. The tree must be clean before and is checked clean (`git diff --quiet`) after.
"""
import hashlib, json, os, signal, subprocess, sys, tempfile, time

tree, base, cases_path, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
only = set(sys.argv[5:])
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
cases = json.load(open(cases_path, encoding='utf8'))

def session_cpu_seconds(sid):
    """user + system CPU seconds of every live process in session `sid` (the vitest run and its workers), from /proc."""
    total = 0
    for name in os.listdir('/proc'):
        if not name.isdigit(): continue
        try: fields = open(f'/proc/{name}/stat').read().rsplit(')', 1)[1].split()
        except OSError: continue
        if int(fields[3]) == sid: total += int(fields[11]) + int(fields[12])
    return round(total / os.sysconf('SC_CLK_TCK'), 2)

def side_run(case, side):
    saved = {}
    def put(rel, text):
        if rel not in saved: saved[rel] = open(os.path.join(tree, rel), encoding='utf8').read()
        open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
    try:
        if side == 'base': put(case['test'], git('show', f'{base}:{case["test"]}'))
        applied = []
        for m in case.get('mutations', []):
            text = open(os.path.join(tree, m['file']), encoding='utf8').read()
            n = text.count(m['old'])
            if n != 1: return {'side': side, 'outcome': 'error', 'error': f'{m["file"]}: old occurs {n} times'}
            put(m['file'], text.replace(m['old'], m['new'])); applied.append(m['file'])
        report = tempfile.mktemp(suffix='.json')
        began, load = time.time(), float(open('/proc/loadavg').read().split()[0])
        child = subprocess.Popen(['npx', 'vitest', 'run', case['test'], '-t', case['title'], *case.get('vitestArgs', []), '--reporter=json', f'--outputFile={report}'],
                                 cwd=tree, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True,
                                 env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        killed, cpu_at_kill = False, None
        try: stdout, _ = child.communicate(timeout=case.get('limitSeconds', 300))
        except subprocess.TimeoutExpired:
            cpu_at_kill = session_cpu_seconds(child.pid)
            os.killpg(child.pid, signal.SIGKILL); killed = True; stdout, _ = child.communicate()
        rows = []
        if os.path.exists(report):
            for suite in json.load(open(report, encoding='utf8'))['testResults']:
                rows += [{'title': a['fullName'], 'status': a['status'], 'durationMs': a.get('duration'),
                          'failure': ((a.get('failureMessages') or [''])[0].split('\n')[0])[:300],
                          'byTimeout': (a.get('failureMessages') or [''])[0].split('\n')[0] == 'Error: STACK_TRACE_ERROR'} for a in suite['assertionResults'] if case['title'] in a['fullName']]
            os.remove(report)
        if killed: outcome = 'killed'
        elif any(r['status'] == 'failed' for r in rows): outcome = 'fail'
        elif child.returncode == 0 and rows and all(r['status'] == 'passed' for r in rows): outcome = 'pass'
        else: outcome = 'error'
        return {'side': side, 'outcome': outcome, 'exit': child.returncode, 'killedAfterLimit': killed, 'sessionCpuSecondsAtKill': cpu_at_kill,
                'seconds': round(time.time() - began, 1),
                'load1Start': load, 'rows': rows, 'tail': [] if outcome in ('pass', 'fail') else stdout.splitlines()[-15:]}
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)

results = []
for case in cases:
    if only and case['id'] not in only: continue
    entry = {'id': case['id'], 'note': case.get('note'), 'test': case['test'], 'title': case['title'], 'mutations': case.get('mutations', []),
             'expect': case['expect'], 'sides': []}
    for side in ('base', 'head'):
        if side not in case['expect']: continue
        r = side_run(case, side); want = case['expect'][side]
        r['asExpected'] = r['outcome'] == want or (want == 'fail-or-killed' and r['outcome'] in ('fail', 'killed'))
        entry['sides'].append(r)
        print(json.dumps({'id': case['id'], 'side': side, 'outcome': r['outcome'], 'asExpected': r['asExpected'], 'seconds': r.get('seconds'),
                          'failure': next((x['failure'] for x in r.get('rows', []) if x['status'] == 'failed'), None)})[:500], flush=True)
    results.append(entry)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': {'name': 'bound_and_pin_mutants.py', 'sha256': sha(os.path.abspath(__file__))}, 'cases': {'path': os.path.basename(cases_path), 'sha256': sha(cases_path)},
           'tree': git('rev-parse', 'HEAD').strip(), 'treeDirty': False, 'base': git('rev-parse', base).strip(), 'results': results,
           'allAsExpected': all(s['asExpected'] for e in results for s in e['sides'])}, open(out_path, 'w'), indent=1)
print('allAsExpected', all(s['asExpected'] for e in results for s in e['sides']))
