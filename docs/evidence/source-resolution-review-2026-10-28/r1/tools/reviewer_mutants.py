#!/usr/bin/env python3
"""Reviewer's own rule-6 mutants for syzygy-bpyt.4.2 (R-GP-IMPL-SOURCE-RESOLUTION-1).

Run from the root of a checkout at 2f249d2c with every dist built (`npm run build`), TMPDIR set to a private directory:
  python3 -I reviewer_mutants.py > record.json
Each mutant replaces one exact fragment (it must occur exactly once), runs the named test files with vitest's JSON reporter,
restores the file's bytes whatever happens, and records each failing test with the first 300 characters of its first failure
message, so a timeout cannot pass for a kill. The unmutated run of the union of the files comes first.
"""
import hashlib, json, os, subprocess, tempfile

PG = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
PB = 'apps/three-surface-poc/src/product-build.test.ts'
SG = 'apps/three-surface-poc/src/sync-child-process-guard.test.ts'
OA = 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'
MUTANTS = [
    ('X1', "an export's source condition names a module that does not exist", 'packages/support/package.json',
     '"source": "./src/index.ts",', '"source": "./src/missing.ts",', [PG, OA]),
    ('X2', 'the vitest config sends one workspace package to its dist by a plugin, with the source condition and no alias key kept',
     'vitest.config.ts', 'export default defineConfig({\n',
     "export default defineConfig({\n  plugins: [{ name: 'r549-dist', enforce: 'pre', resolveId(id: string) { return id === '@syzygy/support' ? fileURLToPath(new URL('./packages/support/dist/index.js', import.meta.url)) : null; } }],\n",
     [SG, OA, PG]),
    ('X3', 'the clean build removes the dist of one project fewer than it builds', 'scripts/clean_build.mjs',
     'for (const project of built) rmSync(', 'for (const project of [...built].slice(1)) rmSync(', [PB]),
    ('X3b', "the clean build follows only the named projects' references, not their references' references", 'scripts/clean_build.mjs',
     '  for (const reference of config.references ?? []) visit(',
     '  if (projects.includes(project)) for (const reference of config.references ?? []) visit(', [PB]),
    ('X4', "a project's tsconfig adds a test by `files`", 'packages/support/tsconfig.json',
     '"include": ["src"],', '"files": ["src/sha256.test.ts"],\n  "include": ["src"],', [PB]),
    ('X4b', "the app's tsconfig includes its tests again", 'apps/three-surface-poc/tsconfig.json',
     ',\n  "exclude": [\n    "src/**/*.test.ts"\n  ]', '', [PB]),
    ('X5', 'the typecheck program drops test-support', 'tsconfig.json',
     '"include": ["apps/*/src", "packages/*/src", "packages/*/test-support"]', '"include": ["apps/*/src", "packages/*/src"]', [PB]),
    ('X6', "an app export's source condition names another module", 'apps/three-surface-poc/package.json',
     '"source": "./src/polaris-generation/dossier-site.ts",', '"source": "./src/polaris-generation/dossier-render.ts",', [PG]),
    ('X7', 'the clean build removes each dist as it visits, before a later project is refused', 'scripts/clean_build.mjs',
     '  built.add(project);\n', "  built.add(project);\n  rmSync(join(project, 'dist'), { recursive: true, force: true });\n", [PB]),
    ('X8', 'the clean build drops its workspace-path predicate, keeping only the tsconfig check', 'scripts/clean_build.mjs',
     'if (!/^(?:apps|packages)\\/[^/]+$/u.test(project) || !existsSync(path))', 'if (!existsSync(path))', [PB]),
]


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, 'report.json')
        done = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'], capture_output=True, text=True)
        data = json.load(open(report)) if os.path.exists(report) else {}
    failing = []
    for f in data.get('testResults', []):
        for a in f.get('assertionResults', []):
            if a.get('status') == 'failed':
                failing.append({'test': a['fullName'], 'message': (a.get('failureMessages') or [''])[0][:300]})
        if f.get('status') == 'failed' and not any(a.get('status') == 'failed' for a in f.get('assertionResults', [])):
            failing.append({'suite': os.path.relpath(f['name']), 'message': (f.get('message') or '')[:300]})
    return {'exit': done.returncode, 'failed': data.get('numFailedTests'), 'passed': data.get('numPassedTests'),
            'failedSuites': data.get('numFailedTestSuites'), 'total': data.get('numTotalTests'), 'failing': failing}


def loadavg():
    return open('/proc/loadavg').read().split()[:3]


record = {
    'subject': 'reviewer rule-6 mutants, R-GP-IMPL-SOURCE-RESOLUTION-1',
    'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
    'worktreeClean': subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == '',
    'distsPresent': sorted(d for p in ('apps', 'packages') for d in os.listdir(p) if os.path.isdir(os.path.join(p, d, 'dist'))),
    'loadavgBefore': loadavg(),
    'unmutated': vitest(sorted({f for *_, files in MUTANTS for f in files})),
    'mutants': [],
}
for ident, what, path, old, new, files in MUTANTS:
    original = open(path, 'rb').read()
    text = original.decode()
    if text.count(old) != 1:
        raise SystemExit(f'{ident}: the fragment occurs {text.count(old)} times in {path}')
    try:
        open(path, 'w').write(text.replace(old, new))
        load = loadavg()
        outcome = vitest(files)
    finally:
        open(path, 'wb').write(original)
    record['mutants'].append({'id': ident, 'mutation': what, 'file': path, 'fileSha256': hashlib.sha256(original).hexdigest(),
                              'old': old, 'new': new, 'tests': files, 'loadavg': load, **outcome,
                              'killed': outcome['exit'] != 0 and (outcome['failed'] or 0) + (outcome['failedSuites'] or 0) > 0})
record['killed'] = sum(m['killed'] for m in record['mutants'])
record['of'] = len(record['mutants'])
record['worktreeCleanAfter'] = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
print(json.dumps(record, indent=1))
