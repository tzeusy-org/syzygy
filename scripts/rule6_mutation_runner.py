#!/usr/bin/env python3
"""Rule-6 runner (AGENTS.md verification rule 6): apply each mutant fragment, run the named vitest files, record the outcome, restore.
usage: python3 scripts/rule6_mutation_runner.py [--tree DIR] SPEC.json OUT.json   (DIR, default the cwd: a worktree root, committed and clean)
SPEC.json carries `project` and `mutants` (id, file, old, new, tests, optional project and note); a previous OUT.json is a valid SPEC.
OUT.json records the commit, the sha256 of each mutated file and of each test file as committed, and this runner's path and sha256; each
mutant's record carries the command it ran and, for each failed test (or test file that failed to load), its name and first error line.
An outcome is `killed` only when vitest ran at least one test and one failed; a run that ran no test (no project matched, a file that
failed to load, a compile error, every test skipped) is `errored`, never killed or survived; so is a run whose exit code disagrees with
its counts (0 with a failed test, nonzero with none) or that outlives the per-mutant timeout (`timeoutSec` in a mutant or the spec,
default 900; the whole process group is killed). The runner exits 1 after writing OUT.json if any mutant errored. A legacy `@syzygy/...`
project name maps to the tier its test files are in (scripts/rule6_projects.py) or the run is refused. `--selftest` runs the classifier's fixtures and exits."""
import hashlib, importlib.util, json, os, re, subprocess, sys, tempfile, datetime
_spec = importlib.util.spec_from_file_location('rule6_projects', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rule6_projects.py'))
projects = importlib.util.module_from_spec(_spec); _spec.loader.exec_module(projects)
def parse_counts(text):
    """(failed, total, skipped) from vitest's summary text; (None, None, 0) when the run printed no `Tests` line (it errored before running a test).
    Skipped and todo tests did not run: a run of only those has no answer."""
    f = re.search(r'Tests\s+(\d+) failed', text)
    tot = re.search(r'Tests\s+.*?\((\d+)\)', text)
    line = re.search(r'^\s*Tests\s+(.*)$', text, re.M)
    skipped = sum(int(n) for n in re.findall(r'(\d+) (?:skipped|todo)', line.group(1))) if line else 0
    return (int(f.group(1)) if f else (0 if tot else None)), (int(tot.group(1)) if tot else None), skipped
def classify(failed, total, skipped=0, returncode=0, timed_out=False):
    """killed: some test ran and failed, exit nonzero. survived: tests ran, all passed, exit 0. errored: no test ran (none, or all skipped),
    the run timed out, or the exit code contradicts the counts (never a kill)."""
    if timed_out or total is None or total - skipped <= 0: return 'errored'
    if (failed or 0) > 0: return 'killed' if returncode not in (0, None) else 'errored'
    return 'survived' if returncode == 0 else 'errored'
def selftest():
    cases = [('Test Files  1 failed (1)\n      Tests  2 failed | 5 passed (7)', 1, 'killed'), ('      Tests  7 passed (7)', 0, 'survived'),
             ('No projects matched the filter "@syzygy/gone".', 1, 'errored'), ('Test Files  1 failed (1)\n      Tests  no tests', 1, 'errored'),
             ('      Tests  0 passed (0)', 0, 'errored'), ('', 1, 'errored'),
             ('      Tests  5 skipped (5)', 0, 'errored'), ('      Tests  3 skipped | 2 todo (5)', 0, 'errored'),
             ('      Tests  2 skipped | 3 passed (5)', 0, 'survived'), ('      Tests  1 failed | 4 skipped (5)', 1, 'killed'),
             ('      Tests  7 passed (7)', 1, 'errored'), ('      Tests  1 failed | 6 passed (7)', 0, 'errored')]
    bad = [(text, rc, want, classify(*parse_counts(text), returncode=rc)) for text, rc, want in cases if classify(*parse_counts(text), returncode=rc) != want]
    if classify(0, 7, 0, None, True) != 'errored': bad.append(('timed out', None, 'errored', classify(0, 7, 0, None, True)))
    sys.exit('selftest FAIL: %r' % (bad,)) if bad else print('selftest ok: %d cases' % (len(cases) + 1))
if sys.argv[1:] == ['--selftest']: selftest(); sys.exit(0)
args = sys.argv[1:]
tree = '.'
if '--tree' in args:
    i = args.index('--tree'); tree = args[i + 1]; del args[i:i + 2]
spec = json.load(open(args[0]))
sha = lambda b: hashlib.sha256(b).hexdigest()
def run(cmd): return subprocess.run(cmd, capture_output=True, text=True, cwd=tree)
def failures(report):
    """Each failed test's name and first error line from vitest's JSON report; a file that failed to load is named by its path."""
    out = []
    for result in report.get('testResults', []):
        failed = [a for a in result.get('assertionResults', []) if a.get('status') == 'failed']
        for a in failed: out.append({'test': a.get('fullName', ''), 'firstErrorLine': ((a.get('failureMessages') or [''])[0].strip().split('\n') or [''])[0]})
        if result.get('status') == 'failed' and not failed: out.append({'test': os.path.relpath(result.get('name', ''), os.path.abspath(tree)), 'firstErrorLine': (result.get('message') or '').strip().split('\n')[0]})
    return out
head = run(['git','rev-parse','HEAD']).stdout.strip()
dirty = run(['git','status','--porcelain','--untracked-files=no']).stdout.strip()
if dirty: sys.exit('tree not clean:\n'+dirty)
tests = sorted({t for m in spec['mutants'] for t in m['tests']})
subject = {f: sha(run(['git','show',f'HEAD:{f}']).stdout.encode()) for f in sorted({m['file'] for m in spec['mutants']} | set(spec.get('subjectFiles', [])))}
out = {'subject': {'commit': head, 'branch': run(['git','rev-parse','--abbrev-ref','HEAD']).stdout.strip(), 'fileSha256': subject, 'testFileSha256': {t: sha(run(['git','show',f'HEAD:{t}']).stdout.encode()) for t in tests}},
       'runnerPath': 'scripts/rule6_mutation_runner.py', 'runnerSha256': sha(run(['git','show','HEAD:scripts/rule6_mutation_runner.py']).stdout.encode()),
       'runner': 'single-occurrence textual replacement of `old` by `new` in `file`, then `npx vitest run --project <project> <testFiles>` in the tree; killed = at least one failed test; file restored from git after each run',
       'project': spec['project'], 'helperSha256': sha(run(['git','show','HEAD:scripts/rule6_projects.py']).stdout.encode()), 'ranAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'mutants': []}
for m in spec['mutants']:
    target = os.path.join(tree, m['file'])
    orig = open(target, encoding='utf8').read()
    if orig.count(m['old']) < 1: sys.exit(f"fragment not found for {m['id']}")
    open(target, 'w', encoding='utf8').write(orig.replace(m['old'], m['new'], 1))
    project = projects.resolve_project(tree, m.get('project', spec['project']), m['tests'])
    command = ['npx','vitest','run','--project',project,*m['tests']]
    with tempfile.TemporaryDirectory() as tmp:
        report_path = os.path.join(tmp, 'report.json')
        try:
            returncode, text, timed_out = projects.run_limited([*command,'--reporter=default','--reporter=json',f'--outputFile.json={report_path}'], tree, m.get('timeoutSec', spec.get('timeoutSec', 900)))
        finally:
            run(['git','checkout','--',m['file']])
        try: report = json.load(open(report_path))
        except (OSError, ValueError): report = {}
    failed, total, skipped = parse_counts(text)
    outcome = classify(failed, total, skipped, returncode, timed_out)
    out['mutants'].append({'id': m['id'], 'file': m['file'], 'old': m['old'], 'new': m['new'], 'tests': m['tests'], 'command': ' '.join(command), 'outcome': outcome, 'failedTests': failed, 'totalTests': total, 'skippedTests': skipped, 'exitCode': returncode, 'timedOut': timed_out, 'failures': failures(report), **({'note': m['note']} if 'note' in m else {})})
    print(m['id'], out['mutants'][-1]['outcome'], failed, flush=True)
assert not run(['git','status','--porcelain','--untracked-files=no']).stdout.strip(), 'tree not restored'
json.dump(out, open(args[1], 'w'), indent=2); open(args[1], 'a').write('\n')
if any(m['outcome'] == 'errored' for m in out['mutants']): sys.exit('errored mutants: ' + ', '.join(m['id'] for m in out['mutants'] if m['outcome'] == 'errored'))
