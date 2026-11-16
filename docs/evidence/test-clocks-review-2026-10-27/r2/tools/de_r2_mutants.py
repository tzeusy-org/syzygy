#!/usr/bin/env python3
"""rev-532b's daemon-entry mutants for PR 532 round 2 (syzygy-bpyt.4.5). Reviewer tool, not authority.

usage: python3 -I de_r2_mutants.py TREE OLD_TEST_COMMIT PRIOR_TEST_COMMIT OUT.json [ID,ID,...]

For each mutant of apps/syzygy/src/main.ts (and a control with none) it applies the fragment (its `old` must occur exactly
once), rebuilds with `npx tsc -b apps/syzygy`, and runs, recording each row's status and first failure line:
  new:    the tree's packages/cap1-system/src/daemon-entry-unchanged.system.test.ts under the system config;
  old:    the same file as it stood at OLD_TEST_COMMIT (the text pin), swapped in for the run and restored;
  prior:  the same file as it stood at PRIOR_TEST_COMMIT (the round-1 subject, 447d9f08), swapped in and restored;
  static: for kinds `defect` only, the unit tests that read main.ts or walk its import graph (subpath-imports,
          island-boundary, argv, workspace-reach).
Kinds: `defect` (a daemon-path load: the new test must fail), `equivalent` (nothing on any daemon path loads the POC app:
the new test should pass), `structural` (the branch layout the predicate requires is broken; reported, no expectation).
R1-R3 are copied verbatim from rev-532's de_rev_mutants.py; the E- equivalents from the lane's daemon_entry_probe.py.
Then it restores every file, rebuilds, and checks the tree clean.
"""
import json, os, subprocess, sys, time

tree, old_commit, prior_commit, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
only = set(sys.argv[5].split(',')) if len(sys.argv) > 5 else None
MAIN = 'apps/syzygy/src/main.ts'
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATIC = ['packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
          'packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts']
DAEMON = "  let parsed = parseCli(process.argv.slice(2), process.env);\n"
POLARIS_COMMENT = "  // `syzygy polaris <url>` is the one-command launched run"
ANCHOR = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
SITE = "'@syzygy/three-surface-poc-app/dossier-site'"
FLAG = "process.env.SYZYGY_PRELOAD_RENDERER === '1'"
DOSSIER_END = "    }, { renderer: renderLocalDossier });\n  }\n"
POLARIS_END = "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n  }\n"
POLARIS = ("    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
           "    const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');\n"
           "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n")
HOOK_BODY = ("    const { registerHooks } = process.getBuiltinModule('node:module');\n"
             "    const { readFileSync } = process.getBuiltinModule('node:fs');\n"
             "    registerHooks({ load: (url, context, nextLoad) => (url.includes('/apps/three-surface-poc/')\n"
             "      ? { format: 'module', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true } : nextLoad(url, context)) });\n"
             f"    await import({SITE});\n")
POLARIS_HEAD = ("  }\n\n"
                "  // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
                "  // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
                "  // `dossier` steps in process and starts the agent sessions in views.\n"
                "  if (argv[0] === 'polaris') {\n")
M = lambda mid, kind, old, new, note: {'id': mid, 'kind': kind, 'file': MAIN, 'old': old, 'new': new, 'note': note}
MUTANTS = [
    None,
    # rev-532's R1-R3, verbatim.
    M('R1-flag-between-branches', 'defect', POLARIS_COMMENT, f"  if ({FLAG}) await import({SITE});\n\n" + POLARIS_COMMENT,
      'round 1: a dynamic import behind an environment flag, between the dossier and polaris branches'),
    M('R2-flag-createRequire-before-daemon', 'defect', DAEMON,
      f"  if ({FLAG}) process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n" + DAEMON,
      'round 1: a require through createRequire behind a flag, just before the daemon path'),
    M('R3-runtime-hook', 'defect', DAEMON, "  {\n" + HOOK_BODY + "  }\n" + DAEMON,
      'round 1: a runtime load hook short-circuiting POC-app URLs, then an unconditional import, just before the daemon path'),
    # Round 2: daemon-path loads whose text sits between a branch opening and the first following `  }` line.
    M('S1-else-if-flag-after-dossier', 'defect', DOSSIER_END,
      DOSSIER_END[:-4] + f"  }} else if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
      'an `else if` on the dossier branch: on every non-dossier argv with the flag set, the POC app loads'),
    M('S2-same-line-if-after-dossier', 'defect', DOSSIER_END,
      DOSSIER_END[:-4] + f"  }} if ({FLAG}) await import({SITE});\n",
      'the dossier close and a flag-gated import on one line: no `  }` line closes the dossier branch, so its window runs to the polaris close'),
    M('S3-else-if-flag-after-polaris', 'defect', POLARIS_END,
      POLARIS_END[:-4] + f"  }} else if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
      'an `else if` on the polaris branch, just before the daemon path'),
    M('S4-else-runtime-hook-after-dossier', 'defect', DOSSIER_END,
      DOSSIER_END[:-4] + "  } else {\n" + HOOK_BODY + "  }\n",
      "R3's runtime hook and import in an unconditional `else` on the dossier branch: every non-dossier argv loads the POC app, unseen by the test's hook"),
    M('S5-else-createRequire-flag-after-polaris', 'defect', POLARIS_END,
      POLARIS_END[:-4] + f"  }} else if ({FLAG}) {{\n    process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n  }}\n",
      "R2's createRequire in an `else if` on the polaris branch"),
    M('S6-misindented-close-after-dossier', 'defect', DOSSIER_END,
      DOSSIER_END[:-4] + f"    }} if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
      'the dossier branch closed by a 4-space `}` on a line that opens a flag-gated block, closed by `  }`'),
    # Legitimate shapes: nothing on any daemon path loads the POC app.
    M('E-comment-in-branch', 'equivalent', "  if (argv[0] === 'dossier') {\n",
      "  if (argv[0] === 'dossier') {\n    // renders through @syzygy/three-surface-poc-app/dossier-site\n", "the lane's: a comment naming the POC app inside the dossier branch"),
    M('E-renamed-binding', 'equivalent', POLARIS,
      POLARIS.replace('const { renderLocalDossier }', 'const { renderLocalDossier: render }').replace('renderer: renderLocalDossier', 'renderer: render'),
      "the lane's: the polaris branch binds the renderer under another name"),
    M('E-type-only-import', 'equivalent', ANCHOR, ANCHOR + "import type * as PocSite from '@syzygy/three-surface-poc-app/dossier-site';\n",
      "the lane's: a type-only import at module top (disclosed residual, N6)"),
    M('C1-comment-outside-branches', 'equivalent', "// One exception to all of the above:",
      "// The dossier renderer is @syzygy/three-surface-poc-app/dossier-site.\n// One exception to all of the above:",
      'a comment naming the POC app in the header (the residual says it fails like the type-only import)'),
    M('L1-else-if-chain', 'equivalent', POLARIS_HEAD,
      "  } else if (argv[0] === 'polaris') {\n"
      "    // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
      "    // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
      "    // `dossier` steps in process and starts the agent sessions in views.\n",
      'the two branches chained as `if … else if (argv[0] === \'polaris\')`'),
    M('L2-nested-function-in-dossier', 'equivalent',
      f"    const {{ renderLocalDossier }} = await import({SITE});\n    return runDossierCli(",
      f"    const renderLocalDossier = await (async () => {{\n      const site = await import({SITE});\n      return site.renderLocalDossier;\n    }})();\n    return runDossierCli(",
      'the dossier import moved into a nested async function inside the branch'),
    M('L3-nested-try-in-polaris', 'equivalent', POLARIS,
      "    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n    try {\n"
      f"      const {{ renderLocalDossier }} = await import({SITE});\n"
      "      return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n"
      "    } catch (cause: unknown) {\n      throw cause;\n    }\n",
      'the polaris import inside a nested try block in the branch'),
]
def branch_swap(text):
    i, j, k = text.index("  if (argv[0] === 'dossier') {\n"), text.index("  // `syzygy polaris <url>`"), text.index(DAEMON)
    return M('E-branch-swap', 'equivalent', text[i:k], text[j:k] + text[i:j], "the lane's: the polaris branch moved above the dossier branch")
def polaris_after_daemon(text):
    j, k = text.index("  // `syzygy polaris <url>`"), text.index(DAEMON)
    return M('D1-polaris-after-daemon', 'structural', text[j:k + len(DAEMON)], DAEMON + text[j:k],
             'the polaris branch moved below the daemon line: the predicate requires each branch to close before it')
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
main_text0 = open(os.path.join(tree, MAIN), encoding='utf8').read()
MUTANTS += [branch_swap(main_text0), polaris_after_daemon(main_text0)]

def build():
    done = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    return None if done.returncode == 0 else (done.stdout + done.stderr)[-1500:]

def vitest(args, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'de-r2-{tag}.json')
    began, load1 = time.time(), float(open('/proc/loadavg').read().split()[0])
    done = subprocess.run(['npx', 'vitest', 'run', *args, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True,
                          timeout=900, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST') and not k.startswith('SYZYGY_')})
    rows = []
    if os.path.exists(report):
        for suite in json.load(open(report, encoding='utf8'))['testResults']:
            rows += [{'title': a['fullName'], 'status': a['status'], 'failure': (a.get('failureMessages') or [''])[0][:400]} for a in suite['assertionResults']]
        os.remove(report)
    return {'exit': done.returncode, 'seconds': round(time.time() - began, 1), 'load1Start': load1, 'rows': len(rows),
            'passed': sum(r['status'] == 'passed' for r in rows),
            'failed': [{'title': r['title'], 'failure': r['failure']} for r in rows if r['status'] == 'failed']}

if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
tests = {'old': git('show', f'{old_commit}:{TEST}'), 'prior': git('show', f'{prior_commit}:{TEST}')}
results = []
for m in MUTANTS:
    mid = m['id'] if m else 'control'
    if only and mid not in only: continue
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
            for side in ('old', 'prior'):
                open(os.path.join(tree, TEST), 'w', encoding='utf8').write(tests[side])
                r[side] = vitest(['--config', 'packages/cap1-system/vitest.config.ts', TEST], f'{mid}-{side}')
            open(os.path.join(tree, TEST), 'w', encoding='utf8').write(saved.pop(TEST))
            if m is None or m['kind'] == 'defect': r['static'] = vitest(STATIC, f'{mid}-static')
        results.append(r)
        print(json.dumps({'id': mid, 'kind': m['kind'] if m else None, 'build': err is None,
                          **{k: (r[k]['exit'], r[k]['passed'], [f['title'][-90:] for f in r[k]['failed']]) for k in ('new', 'old', 'prior', 'static') if k in r}}), flush=True)
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
if build() is not None: sys.exit('final rebuild failed')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': 'de_r2_mutants.py', 'tree': git('rev-parse', 'HEAD').strip(), 'oldTestFrom': git('rev-parse', old_commit).strip(),
           'priorTestFrom': git('rev-parse', prior_commit).strip(), 'results': results}, open(out_path, 'w', encoding='utf8'), indent=1)
