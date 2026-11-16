#!/usr/bin/env python3
"""Which daemon-entry rows fail when the daemon path loads the POC app (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I daemon_entry_probe.py TREE OUT.json [TEST-FILE-SOURCE-COMMIT]

For each mutant of apps/syzygy/src/main.ts, of a module it imports, or of the test file (and a control with none) it applies the fragment; a
mutant whose `old` does not occur exactly once is recorded as skipped (the H- mutants exist only in the new test). Each
mutant carries a kind: `defect` (something on the daemon path loads the POC app: the new test must fail), `equivalent`
(nothing on any daemon path loads it: the old text pin fails these, and the new test should not) or `hook` (the new row's
own hook is broken: it must fail). It rebuilds apps/syzygy with `tsc -b`, runs packages/cap1-system/src/daemon-entry-unchanged.system.test.ts
under the system-tier config with the JSON reporter, records every row's status, restores main.ts and rebuilds. With
TEST-FILE-SOURCE-COMMIT, the test file is first replaced by that commit's copy (and restored afterwards), so one tree
can be probed with the old and the new test. Each run is its own session; one that outlives LIMIT_S is SIGKILLed as
a group. It checks the tree is clean (`git diff --quiet`) at the end.
"""
import hashlib, json, os, signal, subprocess, sys, time

tree, out_path = os.path.abspath(sys.argv[1]), sys.argv[2]
test_source = sys.argv[3] if len(sys.argv) > 3 else None
MAIN = 'apps/syzygy/src/main.ts'
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
LIMIT_S = 600
ANCHOR = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
DAEMON = "  let parsed = parseCli(process.argv.slice(2), process.env);\n"
LOAD = "await import('@syzygy/three-surface-poc-app/dossier-site');"
SITE = "'@syzygy/three-surface-poc-app/dossier-site'"
POLARIS_COMMENT = "  // `syzygy polaris <url>` is the one-command launched run"
POLARIS = ("    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
           "    const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');\n"
           "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n")
def after(anchor, line, mid, file=MAIN, kind='defect', note=''):
    return {'id': mid, 'kind': kind, 'file': file, 'note': note, 'old': anchor, 'new': anchor + line}
# kind `defect`: the daemon path loads the POC app (on some argv or event), so the new test must fail; `equivalent`: nothing
# on the daemon path loads it, so the new test should pass (the old text pin fails these); `hook`: a mutant of the new row's
# own hook, which must fail it (absent from the old test, so skipped there).
MUTANTS = [
    None,
    after(ANCHOR, "import '@syzygy/three-surface-poc-app/dossier-site';\n", 'P-static', note='a static side-effect import at module top'),
    after("  const argv = process.argv.slice(2);\n", f"  {LOAD}\n", 'P-before-branches', note='a dynamic load before both branches, so every argv runs it'),
    {'id': 'P-daemon-dynamic', 'kind': 'defect', 'file': MAIN, 'note': 'a dynamic load where the daemon path begins',
     'old': DAEMON, 'new': f"  {LOAD}\n" + DAEMON},
    after("  if (parsed.kind === 'help') {\n", f"    {LOAD}\n", 'P-help-branch', note='a load in the usage branch'),
    after("  if (parsed.kind === 'invalid') {\n", f"    {LOAD}\n", 'P-invalid-branch', note='a load in the refusal branch'),
    after("  if (!start.started) {\n", f"    {LOAD}\n", 'P-start-failure', note='a load in the branch a daemon that fails to start takes'),
    after("    const { readFile } = await import('node:fs/promises');\n", f"    {LOAD}\n", 'P-entry-read', note='a load at request time, in the entry reader'),
    after("      if (closing) return;\n", "      void import('@syzygy/three-surface-poc-app/dossier-site');\n", 'P-shutdown', note='a load in the shutdown handler'),
    after("      void daemon.close().then(resolve, (cause: unknown) => {\n", "        void import('@syzygy/three-surface-poc-app/dossier-site');\n",
          'P-close-failure', note='a load in the branch a failed close takes'),
    after("import * as path from 'node:path';\n", "import '@syzygy/three-surface-poc-app/dossier-site';\n", 'P-transitive',
          file='packages/polaris-dossier/src/state-directory.ts', note='a module main.ts imports statically (polaris-dossier state-directory) imports the POC app; main.ts is unchanged'),
    # R1-R3 are rev-532's (R-GP-IMPL-TEST-CLOCKS-1, section 3.3): daemon-path loads between or after the two branches that the
    # old text pin failed and the first version of the kept text row passed, because it checked the whole window from the
    # first branch to the daemon line.
    {'id': 'R1-flag-between-branches', 'kind': 'defect', 'file': MAIN, 'old': POLARIS_COMMENT,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') {LOAD}\n\n" + POLARIS_COMMENT,
     'note': 'a dynamic import behind an environment flag, between the dossier and polaris branches; runs on the daemon path when the flag is set'},
    {'id': 'R2-flag-createRequire-before-daemon', 'kind': 'defect', 'file': MAIN, 'old': DAEMON,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n" + DAEMON,
     'note': 'a require through createRequire (taken by process.getBuiltinModule, no import edge), behind a flag, just before the daemon path'},
    {'id': 'R3-runtime-hook', 'kind': 'defect', 'file': MAIN, 'old': DAEMON,
     'new': ("  {\n"
             "    const { registerHooks } = process.getBuiltinModule('node:module');\n"
             "    const { readFileSync } = process.getBuiltinModule('node:fs');\n"
             "    registerHooks({ load: (url, context, nextLoad) => (url.includes('/apps/three-surface-poc/')\n"
             "      ? { format: 'module', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true } : nextLoad(url, context)) });\n"
             f"    await import({SITE});\n"
             "  }\n") + DAEMON,
     'note': 'a load hook registered at runtime that short-circuits every POC-app URL, then an unconditional import of the POC app, just before the daemon path'},
    after(ANCHOR, "import type * as PocSite from '@syzygy/three-surface-poc-app/dossier-site';\n", 'E-type-only-import', kind='equivalent',
          note='a type-only import at module top: erased by tsc, so nothing loads'),
    after("  if (argv[0] === 'dossier') {\n", "    // renders through @syzygy/three-surface-poc-app/dossier-site\n", 'E-comment-in-branch', kind='equivalent',
          note='a comment naming the POC app inside the dossier branch'),
    {'id': 'E-renamed-binding', 'kind': 'equivalent', 'file': MAIN, 'note': "the polaris branch binds the renderer under another name",
     'old': POLARIS, 'new': POLARIS.replace('const { renderLocalDossier }', 'const { renderLocalDossier: render }').replace('renderer: renderLocalDossier', 'renderer: render')},
    {'id': 'H-hook-blind', 'kind': 'hook', 'file': TEST, 'note': "the hook's POC-app prefix points at a directory nothing loads from",
     'old': "    const app = `${pathToFileURL(realpathSync(path.join(REPO_ROOT, 'apps', 'three-surface-poc'))).href}/`;\n",
     'new': "    const app = `${pathToFileURL(realpathSync(path.join(REPO_ROOT, 'apps', 'three-surface-poc'))).href}/no-such-dir/`;\n"},
    {'id': 'H-no-preload', 'kind': 'hook', 'file': TEST, 'note': 'NODE_OPTIONS carries no --import, so no hook runs',
     'old': "    const hooked = { NODE_OPTIONS: `--import=${pathToFileURL(hook).href}`, POC_APP_URL: app, POC_LOAD_LOG: log };\n",
     'new': "    const hooked = { NODE_OPTIONS: '', POC_APP_URL: app, POC_LOAD_LOG: log };\n"},
]
def branch_swap():
    """The polaris branch moved above the dossier branch, its fragments cut from main.ts as it stands."""
    text = open(os.path.join(tree, MAIN), encoding='utf8').read()
    i, j, k = text.index("  if (argv[0] === 'dossier') {\n"), text.index("  // `syzygy polaris <url>`"), text.index(DAEMON)
    return {'id': 'E-branch-swap', 'kind': 'equivalent', 'file': MAIN, 'note': 'the polaris branch moved above the dossier branch',
            'old': text[i:k], 'new': text[j:k] + text[i:j]}
MUTANTS.insert(-2, branch_swap())
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()

def build():
    done = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    if done.returncode != 0: sys.exit(f'build failed: {done.stdout[-2000:]}{done.stderr[-2000:]}')

def run(mutant):
    main_text = open(os.path.join(tree, MAIN), encoding='utf8').read()
    test_text = open(os.path.join(tree, TEST), encoding='utf8').read()
    other = mutant['file'] if mutant and mutant['file'] not in (MAIN, TEST) else None
    other_text = open(os.path.join(tree, other), encoding='utf8').read() if other else None
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'daemon-entry-{mutant["id"] if mutant else "control"}.json')
    try:
        if test_source: open(os.path.join(tree, TEST), 'w', encoding='utf8').write(git('show', f'{test_source}:{TEST}'))
        if mutant:
            target = open(os.path.join(tree, mutant['file']), encoding='utf8').read()
            if target.count(mutant['old']) != 1:
                return {'mutant': mutant, 'skipped': f'old occurs {target.count(mutant["old"])} times in {mutant["file"]}', 'failed': [], 'passed': 0, 'exit': None}
            open(os.path.join(tree, mutant['file']), 'w', encoding='utf8').write(target.replace(mutant['old'], mutant['new']))
        build()
        began, load = time.time(), float(open('/proc/loadavg').read().split()[0])
        child = subprocess.Popen(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '--reporter=json',
                                  f'--outputFile={report}'], cwd=tree, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                 start_new_session=True, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        killed = False
        try: child.communicate(timeout=LIMIT_S)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL); killed = True; child.communicate()
        rows = []
        if os.path.exists(report):
            for suite in json.load(open(report, encoding='utf8'))['testResults']:
                rows += [{'title': a['fullName'], 'status': a['status'], 'failure': (a.get('failureMessages') or [''])[0][:300]} for a in suite['assertionResults']]
        return {'mutant': mutant, 'exit': child.returncode, 'killedAfterLimit': killed, 'seconds': round(time.time() - began, 1), 'load1Start': load,
                'rows': rows, 'failed': sorted(r['title'] for r in rows if r['status'] == 'failed'), 'passed': sum(r['status'] == 'passed' for r in rows)}
    finally:
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main_text)
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test_text)
        if other: open(os.path.join(tree, other), 'w', encoding='utf8').write(other_text)
        if os.path.exists(report): os.remove(report)

results = []
for m in MUTANTS:
    results.append(run(m)); r = results[-1]
    print(json.dumps({'mutant': m['id'] if m else 'control', 'kind': m['kind'] if m else None, 'exit': r['exit'], 'passed': r['passed'], 'failed': r['failed']}), flush=True)
build()
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': {'name': os.path.basename(__file__), 'sha256': sha(os.path.abspath(__file__))}, 'commit': git('rev-parse', 'HEAD').strip(),
           'testFileFrom': test_source or 'the tree', 'testFileSha256': hashlib.sha256((git('show', f'{test_source}:{TEST}') if test_source else
           open(os.path.join(tree, TEST), encoding='utf8').read()).encode()).hexdigest(), 'results': results}, open(out_path, 'w'), indent=1)
