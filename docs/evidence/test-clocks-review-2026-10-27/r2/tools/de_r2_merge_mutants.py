#!/usr/bin/env python3
"""rev-532b: daemon-entry mutants on a local merge of PR 532's head with current main (syzygy-bpyt.4.5, round 2). Reviewer
tool, not authority.

usage: python3 -I de_r2_merge_mutants.py TREE MUTANTS_TOOL OLD_TEST_COMMIT PRIOR_TEST_COMMIT OUT.json ID,ID,...

Takes the named mutants from MUTANTS_TOOL (de_r2_mutants.py; its constants and MUTANTS list only, never its main loop)
plus three mutants that exist only on the merge, where main moved the shutdown handler into @syzygy/http-host
(`closeOnSignal`, packages/http-host/src/shutdown.ts):
  X1-close-failed-callback-in-main  a load in main.ts's `closeFailed` callback (the lane's P-close-failure, re-targeted);
  X2-close-failure-in-http-host     a load in http-host's close-failure branch; main.ts unchanged;
  X3-shutdown-in-http-host          a load in http-host's shutdown function (the lane's P-shutdown, re-targeted).
A mutant whose `old` does not occur exactly once is recorded as skipped. Per mutant: rebuild (`npx tsc -b apps/syzygy`,
which follows project references), then the tree's daemon-entry test (new), the 8ff50172 copy (old) and the 447d9f08 copy
(prior), and for defects the four static files. Restores, rebuilds, checks the tree clean.
"""
import json, os, subprocess, sys, time

tree, tool, old_commit, prior_commit, out_path, ids = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4], sys.argv[5], sys.argv[6].split(',')
src = open(tool, encoding='utf8').read()
sys.argv = [tool, tree, 'x', 'y', '/dev/null']
ns = {}
exec(compile(src[: src.index('def build():')], tool, 'exec'), ns)
MAIN, TEST, STATIC, SITE = ns['MAIN'], ns['TEST'], ns['STATIC'], ns['SITE']
SHUT = 'packages/http-host/src/shutdown.ts'
EXTRA = [
    {'id': 'X1-close-failed-callback-in-main', 'kind': 'defect', 'file': MAIN, 'old': '    closeFailed: (cause) => {\n',
     'new': f'    closeFailed: (cause) => {{\n      void import({SITE});\n', 'note': "the lane's P-close-failure re-targeted to main.ts's closeFailed callback"},
    {'id': 'X2-close-failure-in-http-host', 'kind': 'defect', 'file': SHUT, 'old': '      void daemon.close().then(resolve, (cause: unknown) => {\n',
     'new': f'      void daemon.close().then(resolve, (cause: unknown) => {{\n        void import({SITE});\n', 'note': "a load in http-host's close-failure branch; main.ts unchanged"},
    {'id': 'X3-shutdown-in-http-host', 'kind': 'defect', 'file': SHUT, 'old': '      if (closing) return;\n',
     'new': f'      if (closing) return;\n      void import({SITE});\n', 'note': "the lane's P-shutdown re-targeted to http-host's shutdown function"},
]
pool = {m['id']: m for m in ns['MUTANTS'] if m} | {m['id']: m for m in EXTRA}
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
def build():
    done = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    return None if done.returncode == 0 else (done.stdout + done.stderr)[-1500:]
def vitest(args, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'de-r2m-{tag}.json')
    began, load1 = time.time(), float(open('/proc/loadavg').read().split()[0])
    done = subprocess.run(['npx', 'vitest', 'run', *args, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True,
                          timeout=900, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST') and not k.startswith('SYZYGY_')})
    rows = []
    if os.path.exists(report):
        for suite in json.load(open(report, encoding='utf8'))['testResults']:
            rows += [{'title': a['fullName'], 'status': a['status'], 'failure': (a.get('failureMessages') or [''])[0][:400]} for a in suite['assertionResults']]
        os.remove(report)
    return {'exit': done.returncode, 'seconds': round(time.time() - began, 1), 'load1Start': load1, 'rows': len(rows),
            'passed': sum(r['status'] == 'passed' for r in rows), 'failed': [{'title': r['title'], 'failure': r['failure']} for r in rows if r['status'] == 'failed']}
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
tests = {'old': git('show', f'{old_commit}:{TEST}'), 'prior': git('show', f'{prior_commit}:{TEST}')}
results = []
for mid in ids:
    m = None if mid == 'control' else pool[mid]
    saved = {}
    try:
        if m:
            text = open(os.path.join(tree, m['file']), encoding='utf8').read()
            if text.count(m['old']) != 1:
                results.append({'mutant': m, 'id': mid, 'skipped': f'old occurs {text.count(m["old"])} times in {m["file"]}'}); print(json.dumps(results[-1]['skipped']), flush=True); continue
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
        print(json.dumps({'id': mid, 'build': err is None, **{k: (r[k]['exit'], r[k]['passed'], [f['title'][-90:] for f in r[k]['failed']]) for k in ('new', 'old', 'prior', 'static') if k in r}}), flush=True)
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
if build() is not None: sys.exit('final rebuild failed')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': 'de_r2_merge_mutants.py', 'tree': git('rev-parse', 'HEAD').strip(), 'parents': git('rev-parse', 'HEAD^1', 'HEAD^2').split(),
           'oldTestFrom': git('rev-parse', old_commit).strip(), 'priorTestFrom': git('rev-parse', prior_commit).strip(), 'results': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
