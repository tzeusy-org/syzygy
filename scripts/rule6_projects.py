#!/usr/bin/env python3
"""Shared by the rule-6 mutant tools (rule6_mutation_runner.py, rerun_rule6_mutants_selected_tests.py, rule6_timeout_rerun.py), loaded by path
because the tools may run under `python3 -I`, which puts no script directory on sys.path (syzygy-l9vt).
`resolve_project(tree, project, tests)`: vitest projects are the tiers of vitest.tiers.ts (unit, integration, e2e, live). A record written
before the tier split names `@syzygy/<package>`, which matches no project now; it maps to the one tier all of its test files are in at
`tree`, and is refused (SystemExit, naming the files) when they span tiers never guessed; a file no tier list names is unit (the unit tier is the complement of the lists), and a missing one runs no test and scores `errored`. Any other name is refused.
`run_limited(cmd, cwd, timeout)`: (returncode, output, timed_out); a run past `timeout` seconds is killed with its whole process group
(a hung vitest worker would otherwise outlive `npx`). `--selftest` runs the fixtures."""
import os, re, signal, subprocess, sys
TIERS = ('unit', 'integration', 'e2e', 'live')
SYSTEM_SUFFIX = '.system.test.ts'
def tier_lists(tiers_source):
    """{export name: set of quoted test paths} for each `export const X_TESTS` list in vitest.tiers.ts text."""
    lists = {}
    for name, body in re.findall(r'export const (\w+_TESTS): readonly string\[\] = \[(.*?)\n\];', tiers_source, re.S):
        lists[name] = set(re.findall(r"'([^']+\.test\.ts)'", body))
    return lists
def tier_of(lists, test):
    """The tier of one test path. The unit tier is the complement of the listed tiers (vitest.tiers.ts lists only e2e, integration and live), so
    a path no list names is `unit` by definition and an unknown file cannot be told from a unit one here; a missing file fails at vitest, which
    runs nothing and scores `errored`."""
    if test in lists.get('E2E_TESTS', ()) or test.endswith(SYSTEM_SUFFIX): return 'e2e'
    if test in lists.get('INTEGRATION_TESTS', ()): return 'integration'
    if test in lists.get('LIVE_TESTS', ()): return 'live'
    return 'unit'
def resolve_project(tree, project, tests, tiers_source=None):
    if project in TIERS: return project
    if not project.startswith('@syzygy/'):
        sys.exit('refusing project %r: not a tier (%s) and not a legacy @syzygy/ package name' % (project, ', '.join(TIERS)))
    if tiers_source is None: tiers_source = open(os.path.join(tree, 'vitest.tiers.ts'), encoding='utf8').read()
    lists = tier_lists(tiers_source)
    if not lists.get('INTEGRATION_TESTS') or 'E2E_TESTS' not in lists: sys.exit('refusing legacy project %r: vitest.tiers.ts lists were not read' % project)
    by_tier = {}
    for t in tests: by_tier.setdefault(tier_of(lists, t), []).append(t)
    if len(by_tier) != 1:
        sys.exit('refusing legacy project %r: its test files span tiers %s; split the record by tier (or give each mutant a `project`)' % (project, {k: v for k, v in by_tier.items()}))
    return next(iter(by_tier))
def run_limited(cmd, cwd, timeout):
    p = subprocess.Popen(cmd, cwd=cwd, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True, start_new_session=True)
    try:
        out, _ = p.communicate(timeout=timeout)
        return p.returncode, out, False
    except subprocess.TimeoutExpired:
        try: os.killpg(p.pid, signal.SIGKILL)
        except ProcessLookupError: pass
        out, _ = p.communicate()
        return None, out or '', True
def selftest():
    src = "export const INTEGRATION_TESTS: readonly string[] = [\n  'a/src/i.test.ts',\n];\nexport const E2E_TESTS: readonly string[] = [\n  'a/src/e.test.ts',\n];\nexport const LIVE_TESTS: readonly string[] = [\n  'a/src/l.test.ts',\n];\n"
    ok = lambda p, tests: resolve_project('.', p, tests, src)
    def refused(p, tests):
        try: ok(p, tests)
        except SystemExit as e: return str(e)
        return None
    def refused_with(source):
        try: resolve_project('.', '@syzygy/x', ['a/src/u.test.ts'], source)
        except SystemExit as e: return str(e)
        return None
    checks = [('tier name passes through', ok('e2e', ['a/src/u.test.ts']) == 'e2e'),
              ('legacy unit file', ok('@syzygy/x', ['a/src/u.test.ts']) == 'unit'),
              ('legacy integration file', ok('@syzygy/x', ['a/src/i.test.ts']) == 'integration'),
              ('legacy system suffix is e2e', ok('@syzygy/x', ['b/src/s.system.test.ts']) == 'e2e'),
              ('legacy live file', ok('@syzygy/x', ['a/src/l.test.ts']) == 'live'),
              ('spanning tiers refused', 'span tiers' in (refused('@syzygy/x', ['a/src/u.test.ts', 'a/src/i.test.ts']) or '')),
              ('unknown name refused', 'not a tier' in (refused('nonsense', ['a/src/u.test.ts']) or '')),
              ('unreadable lists refused', 'were not read' in (refused_with('nothing here') or ''))]
    rc, out, timed = run_limited([sys.executable, '-c', 'print(1); import sys; sys.exit(3)'], '.', 30)
    checks.append(('exit code is read', (rc, out.strip(), timed) == (3, '1', False)))
    import time
    t0 = time.time()
    rc, out, timed = run_limited([sys.executable, '-c', 'import time; time.sleep(60)'], '.', 1)
    checks.append(('a hung run is killed at the limit', timed and rc is None and time.time() - t0 < 20))
    import tempfile
    with tempfile.TemporaryDirectory() as d:
        pidfile = os.path.join(d, 'grandchild.pid')
        child = "import subprocess,sys,time; g=subprocess.Popen([sys.executable,'-c','import time; time.sleep(60)']); open(%r,'w').write(str(g.pid)); time.sleep(60)" % pidfile
        rc, out, timed = run_limited([sys.executable, '-c', child], '.', 3)
        gpid = int(open(pidfile).read()) if os.path.exists(pidfile) else None
        def dead(pid):
            for _ in range(50):
                try: os.kill(pid, 0)
                except ProcessLookupError: return True
                except PermissionError: return False
                try:
                    if open('/proc/%d/stat' % pid).read().rsplit(')', 1)[1].split()[0] == 'Z': return True
                except OSError: return True
                time.sleep(0.1)
            return False
        checks.append(('the whole process group dies on timeout', timed and gpid is not None and dead(gpid)))
        if gpid and not dead(gpid): os.kill(gpid, signal.SIGKILL)
    bad = [n for n, good in checks if not good]
    sys.exit('selftest FAIL: %r' % (bad,)) if bad else print('rule6_projects selftest ok: %d cases' % len(checks))
if __name__ == '__main__' and sys.argv[1:] == ['--selftest']: selftest()
