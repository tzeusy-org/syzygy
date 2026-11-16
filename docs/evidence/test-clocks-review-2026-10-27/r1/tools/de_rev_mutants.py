#!/usr/bin/env python3
"""rev-532's own daemon-entry mutants for PR 532 (syzygy-bpyt.4.5). Reviewer tool, not authority.

usage: python3 -I de_rev_mutants.py TREE OLD_TEST_COMMIT OUT.json

Each mutant loads the POC app (or a provider-island module) on the daemon path by a route the lane's population lacks. For
each (and a control) it applies the fragment (its `old` must occur exactly once), rebuilds with `npx tsc -b apps/syzygy`,
and runs three things, recording each row's status:
  new:    the tree's packages/cap1-system/src/daemon-entry-unchanged.system.test.ts under the system config;
  old:    the same file as it stood at OLD_TEST_COMMIT (the text pin), swapped in for the run and restored;
  static: the unit tests that read main.ts or walk its import graph (subpath-imports, island-boundary, argv, workspace-reach).
Then it restores every file, rebuilds, and checks the tree clean.
"""
import json, os, subprocess, sys, time

tree, old_commit, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
MAIN = 'apps/syzygy/src/main.ts'
SD = 'packages/polaris-dossier/src/state-directory.ts'
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATIC = ['packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
          'packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts']
DAEMON = "  let parsed = parseCli(process.argv.slice(2), process.env);\n"
POLARIS = "  // `syzygy polaris <url>` is the one-command launched run"
FIRST = "import * as path from 'node:path';\n"
SITE = "'@syzygy/three-surface-poc-app/dossier-site'"
MUTANTS = [
    None,
    {'id': 'R0-first-import', 'file': MAIN, 'old': FIRST, 'new': f"import {SITE};\n" + FIRST,
     'note': "a static side-effect import of the POC app as main.ts's first import: is the hook in place before it?"},
    {'id': 'R1-flag-between-branches', 'file': MAIN, 'old': POLARIS,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') await import({SITE});\n\n" + POLARIS,
     'note': 'a dynamic import behind an environment flag, between the dossier and polaris branches; runs on the daemon path when the flag is set'},
    {'id': 'R2-flag-createRequire-before-daemon', 'file': MAIN, 'old': DAEMON,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n" + DAEMON,
     'note': 'a require through createRequire (taken by process.getBuiltinModule, no import edge), behind a flag, just before the daemon path'},
    {'id': 'R3-runtime-hook', 'file': MAIN, 'old': DAEMON,
     'new': ("  {\n"
             "    const { registerHooks } = process.getBuiltinModule('node:module');\n"
             "    const { readFileSync } = process.getBuiltinModule('node:fs');\n"
             "    registerHooks({ load: (url, context, nextLoad) => (url.includes('/apps/three-surface-poc/')\n"
             "      ? { format: 'module', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true } : nextLoad(url, context)) });\n"
             f"    await import({SITE});\n"
             "  }\n") + DAEMON,
     'note': 'a load hook registered at runtime that short-circuits every POC-app URL, then an unconditional import of the POC app, just before the daemon path'},
    {'id': 'R4-createRequire-transitive', 'file': SD, 'old': FIRST,
     'new': FIRST + f"process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n",
     'note': 'state-directory.ts (imported statically by main.ts) requires the POC app at module top through createRequire; main.ts unchanged'},
    {'id': 'R5-worker-thread', 'file': MAIN, 'old': DAEMON,
     'new': f"  new (process.getBuiltinModule('node:worker_threads').Worker)(new URL(import.meta.resolve({SITE})));\n" + DAEMON,
     'note': 'a worker thread of the daemon process evaluates the POC app, started unconditionally just before the daemon path'},
    {'id': 'R6-island-barrel', 'file': MAIN, 'old': DAEMON,
     'new': "  await import('@syzygy/polaris-generation-core');\n" + DAEMON,
     'note': 'the provider island (polaris-generation-core root barrel) imported unconditionally just before the daemon path; no POC-app text'},
    {'id': 'R7-island-computed-flag', 'file': MAIN, 'old': DAEMON,
     'new': "  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') process.getBuiltinModule('node:module').createRequire(import.meta.url)(['@syzygy', 'polaris-generation-core'].join('/'));\n" + DAEMON,
     'note': 'the provider island required by a computed name behind a flag; no POC-app text, no import edge'},
]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout

def build():
    done = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    return None if done.returncode == 0 else (done.stdout + done.stderr)[-1500:]

def vitest(args, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'de-rev-{tag}.json')
    began = time.time()
    done = subprocess.run(['npx', 'vitest', 'run', *args, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True,
                          timeout=900, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
    rows = []
    if os.path.exists(report):
        for suite in json.load(open(report, encoding='utf8'))['testResults']:
            rows += [{'title': a['fullName'], 'status': a['status'], 'failure': (a.get('failureMessages') or [''])[0][:300]} for a in suite['assertionResults']]
        os.remove(report)
    return {'exit': done.returncode, 'seconds': round(time.time() - began, 1), 'rows': len(rows), 'passed': sum(r['status'] == 'passed' for r in rows),
            'failed': [{'title': r['title'], 'failure': r['failure']} for r in rows if r['status'] == 'failed']}

if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
old_test = git('show', f'{old_commit}:{TEST}')
results = []
for m in MUTANTS:
    mid = m['id'] if m else 'control'
    saved = {}
    try:
        if m:
            text = open(os.path.join(tree, m['file']), encoding='utf8').read()
            if text.count(m['old']) != 1: sys.exit(f'{mid}: old occurs {text.count(m["old"])} times')
            saved[m['file']] = text
            open(os.path.join(tree, m['file']), 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
        err = build()
        r = {'mutant': m, 'id': mid, 'buildError': err}
        if err is None:
            r['new'] = vitest(['--config', 'packages/cap1-system/vitest.config.ts', TEST], f'{mid}-new')
            saved[TEST] = open(os.path.join(tree, TEST), encoding='utf8').read()
            open(os.path.join(tree, TEST), 'w', encoding='utf8').write(old_test)
            r['old'] = vitest(['--config', 'packages/cap1-system/vitest.config.ts', TEST], f'{mid}-old')
            open(os.path.join(tree, TEST), 'w', encoding='utf8').write(saved.pop(TEST))
            r['static'] = vitest(STATIC, f'{mid}-static')
        results.append(r)
        print(json.dumps({'id': mid, 'build': err is None, **{k: (r[k]['exit'], r[k]['passed'], [f['title'][-70:] for f in r[k]['failed']]) for k in ('new', 'old', 'static') if k in r}}), flush=True)
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
if build() is not None: sys.exit('final rebuild failed')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': 'de_rev_mutants.py', 'tree': git('rev-parse', 'HEAD').strip(), 'oldTestFrom': git('rev-parse', old_commit).strip(), 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
