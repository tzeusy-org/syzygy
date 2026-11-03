#!/usr/bin/env python3
"""Rule-6 runner (AGENTS.md verification rule 6): apply each mutant fragment, run the named vitest files, record the outcome, restore.
usage: python3 scripts/rule6_mutation_runner.py [--tree DIR] SPEC.json OUT.json   (DIR, default the cwd: a worktree root, committed and clean)
SPEC.json carries `project` and `mutants` (id, file, old, new, tests, optional project and note); a previous OUT.json is a valid SPEC.
OUT.json records the commit, the sha256 of each mutated file and of each test file as committed, and this runner's path and sha256; each
mutant's record carries the command it ran and, for each failed test (or test file that failed to load), its name and first error line.
An outcome is `killed` only when vitest ran at least one test and one failed; a run that ran no test (no project matched, a file that
failed to load, a compile error) is `errored`, never killed, and the runner exits 1 after writing OUT.json if any mutant errored.
`--selftest` runs the classifier's fixtures and exits."""
import hashlib, json, os, re, subprocess, sys, tempfile, datetime
def parse_counts(text):
    """(failed, total) from vitest's summary text; (None, None) when the run printed no `Tests` line (it errored before running a test)."""
    f = re.search(r'Tests\s+(\d+) failed', text)
    tot = re.search(r'Tests\s+.*?\((\d+)\)', text)
    return (int(f.group(1)) if f else (0 if tot else None)), (int(tot.group(1)) if tot else None)
def classify(failed, total):
    """killed: some test ran and failed. survived: tests ran and all passed. errored: no test ran (never a kill)."""
    if total is None or total == 0: return 'errored'
    return 'killed' if (failed or 0) > 0 else 'survived'
def selftest():
    cases = [('Test Files  1 failed (1)\n      Tests  2 failed | 5 passed (7)', 'killed'), ('      Tests  7 passed (7)', 'survived'),
             ('No projects matched the filter "@syzygy/gone".', 'errored'), ('Test Files  1 failed (1)\n      Tests  no tests', 'errored'),
             ('      Tests  0 passed (0)', 'errored'), ('', 'errored')]
    bad = [(text, want, classify(*parse_counts(text))) for text, want in cases if classify(*parse_counts(text)) != want]
    sys.exit('selftest FAIL: %r' % (bad,)) if bad else print('selftest ok: %d cases' % len(cases))
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
       'project': spec['project'], 'ranAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'mutants': []}
for m in spec['mutants']:
    target = os.path.join(tree, m['file'])
    orig = open(target, encoding='utf8').read()
    if orig.count(m['old']) < 1: sys.exit(f"fragment not found for {m['id']}")
    open(target, 'w', encoding='utf8').write(orig.replace(m['old'], m['new'], 1))
    command = ['npx','vitest','run','--project',m.get('project',spec['project']),*m['tests']]
    with tempfile.TemporaryDirectory() as tmp:
        report_path = os.path.join(tmp, 'report.json')
        try:
            r = run([*command,'--reporter=default','--reporter=json',f'--outputFile.json={report_path}'])
        finally:
            run(['git','checkout','--',m['file']])
        try: report = json.load(open(report_path))
        except (OSError, ValueError): report = {}
    text = r.stdout + r.stderr
    failed, total = parse_counts(text)
    outcome = classify(failed, total)
    out['mutants'].append({'id': m['id'], 'file': m['file'], 'old': m['old'], 'new': m['new'], 'tests': m['tests'], 'command': ' '.join(command), 'outcome': outcome, 'failedTests': failed, 'totalTests': total, 'failures': failures(report), **({'note': m['note']} if 'note' in m else {})})
    print(m['id'], out['mutants'][-1]['outcome'], failed, flush=True)
assert not run(['git','status','--porcelain','--untracked-files=no']).stdout.strip(), 'tree not restored'
json.dump(out, open(args[1], 'w'), indent=2); open(args[1], 'a').write('\n')
if any(m['outcome'] == 'errored' for m in out['mutants']): sys.exit('errored mutants: ' + ', '.join(m['id'] for m in out['mutants'] if m['outcome'] == 'errored'))
