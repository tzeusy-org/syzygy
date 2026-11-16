"""Round-3 reviewer mutants (rev-509c) over the reviewed sweep.

Each mutant replaces exactly one fragment of one source file (asserted to occur exactly once), runs the two
subject test files with Vitest's JSON reporter under a private TMPDIR, restores the file and checks its sha256.
A mutant counts as killed only when at least one named test fails with an assertion (its first failure line is
not a timeout or STACK_TRACE_ERROR). The control run must pass every test.

Usage: python3 my_mutants.py <worktree> <out.json> <private-tmpdir>
The private TMPDIR must sit under /tmp/r509c- and is created empty and removed afterwards.
"""
import hashlib
import json
import os
import shutil
import subprocess
import sys

worktree, out, tmp = sys.argv[1:4]
tmp = os.path.realpath(tmp)
assert tmp.startswith('/tmp/r509c-') and not os.path.exists(tmp), 'need a new /tmp/r509c-<n> path'
SRC = 'apps/three-surface-poc/src/fixture-directories.ts'
FILES = ['apps/three-surface-poc/src/fixture-directories.test.ts', 'apps/three-surface-poc/src/test-model-fixture.test.ts']
MUTANTS = [
    ('drop-early-return', SRC, "  if (namespace === undefined) return;\n", ''),
    ('unreadable-reads-as-0', SRC, "  } catch {\n    return undefined;\n  }", "  } catch {\n    return '0';\n  }"),
    ('unparseable-reads-as-0', SRC, "readlinkSync('/proc/self/ns/pid'))?.[1];", "readlinkSync('/proc/self/ns/pid'))?.[1] ?? '0';"),
    ('empty-inode-accepted', SRC, "return /\\[(\\d+)\\]$/.exec(", "return /\\[(\\d*)\\]$/.exec("),
    ('namespace-prefix-match', SRC, "owner[2] !== namespace", "!namespace.startsWith(owner[2])"),
    ('namespace-extension-match', SRC, "owner[2] !== namespace", "!owner[2].startsWith(namespace)"),
    ('uid-guard-dropped', SRC, "(user === undefined || stat.uid === user)", "true"),
    ('uid-undefined-means-keep', SRC, "(user === undefined || stat.uid === user)", "(user !== undefined && stat.uid === user)"),
    ('name-anchor-dropped', SRC, "/^syzygy-poc-surface-fixture-(?:template-)?p", "/syzygy-poc-surface-fixture-(?:template-)?p"),
    ('eperm-counts-dead', SRC, "return (error as NodeJS.ErrnoException).code !== 'ESRCH';", "return false;"),
    ('lstat-follows-links', SRC, "const stat = lstatSync(entry);", "const stat = statSync(entry);"),
]
# lstat-follows-links needs statSync imported.
EXTRA = {'lstat-follows-links': (SRC, "import { lstatSync, readdirSync, readlinkSync, rmSync } from 'node:fs';", "import { lstatSync, readdirSync, readlinkSync, rmSync, statSync } from 'node:fs';")}


def sha(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def run(label):
    os.makedirs(tmp)
    report = os.path.join(os.path.dirname(os.path.abspath(out)), f'mutant-report-{label}.json')
    if os.path.exists(report):
        os.remove(report)
    env = {**os.environ, 'TMPDIR': tmp}
    proc = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/three-surface-poc-app', *FILES, '--reporter=json', f'--outputFile={report}'],
                          cwd=worktree, env=env, capture_output=True, text=True, timeout=900)
    left = sorted(os.listdir(tmp))
    shutil.rmtree(tmp)
    data = json.load(open(report))
    failing = []
    passed = 0
    for result in data['testResults']:
        for test in result['assertionResults']:
            if test['status'] == 'passed':
                passed += 1
            elif test['status'] == 'failed':
                first = (test.get('failureMessages') or [''])[0].splitlines()[0][:300]
                failing.append({'test': test['fullName'], 'first': first})
        if result.get('status') == 'failed' and not result['assertionResults']:
            failing.append({'test': f"suite {result['name']}", 'first': (result.get('message') or '')[:300]})
    load_bound = [f for f in failing if 'timed out' in f['first'] or 'STACK_TRACE_ERROR' in f['first']]
    return {'exit': proc.returncode, 'passed': passed, 'failing': failing, 'loadBound': load_bound, 'tmpLeft': left, 'report': report}


head = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=worktree, capture_output=True, text=True, check=True).stdout.strip()
status = subprocess.run(['git', 'status', '--porcelain', '--', 'apps', 'packages', 'vitest.config.ts'], cwd=worktree, capture_output=True, text=True, check=True).stdout
assert status == '', f'worktree not clean: {status}'
src_path = os.path.join(worktree, SRC)
original = open(src_path, encoding='utf8').read()
original_sha = sha(src_path)
results = {'tool': 'rev-509c my_mutants.py', 'toolSha256': sha(__file__), 'treeCommit': head, 'sourceSha256AtCommit': {SRC: original_sha},
           'control': run('control'), 'mutants': []}
try:
    for label, path, old, new in MUTANTS:
        text = original
        edits = [(old, new)]
        if label in EXTRA:
            edits.insert(0, EXTRA[label][1:])
        for o, n in edits:
            assert text.count(o) == 1, f'{label}: fragment occurs {text.count(o)} times'
            text = text.replace(o, n)
        open(src_path, 'w', encoding='utf8').write(text)
        outcome = run(label)
        open(src_path, 'w', encoding='utf8').write(original)
        assert sha(src_path) == original_sha
        assertion_kills = [f for f in outcome['failing'] if f not in outcome['loadBound']]
        results['mutants'].append({'id': label, 'file': path, 'edits': [{'old': o, 'new': n} for o, n in edits],
                                   'verdict': 'killed' if assertion_kills else 'SURVIVED', **outcome})
        print(label, 'killed' if assertion_kills else 'SURVIVED', len(outcome['failing']), 'failing', flush=True)
finally:
    open(src_path, 'w', encoding='utf8').write(original)
    assert sha(src_path) == original_sha
json.dump(results, open(out, 'w'), indent=1)
c = results['control']
print('control exit', c['exit'], 'passed', c['passed'], 'failing', len(c['failing']))
print('survivors', [m['id'] for m in results['mutants'] if m['verdict'] != 'killed'])
