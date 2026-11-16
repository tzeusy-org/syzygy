#!/usr/bin/env python3
"""rev-532b: check a syntax-based replacement of the kept text row against every main.ts variant (PR 532 round 2).
Reviewer tool, not authority; the replacement is a scratch check, not a proposal of exact bytes.

usage: python3 -I fix_check_r2.py TREE TEXT_ROW_TOOL R2_MUTANTS_TOOL LANE_PROBE FIX_ROW OUT.json

Builds the same main.ts variant population as text_row_mutants_r2.py (its code up to `ROW = {`, never its main loop),
replaces the kept text row (from its `// The kept part of the old text pin.` comment to the end of the file) with FIX_ROW
and adds `import ts from 'typescript';`, then runs only that row (`-t`) for every variant. Restores and checks the tree clean.
"""
import json, os, subprocess, sys

tree, tr_tool, r2_tool, lane_tool, fix_path, out_path = (os.path.abspath(sys.argv[1]), *sys.argv[2:7])
src = open(tr_tool, encoding='utf8').read()
sys.argv = [tr_tool, tree, r2_tool, lane_tool, '/dev/null']
ns = {}
exec(compile(src[: src.index('ROW = {')], tr_tool, 'exec'), ns)
MAIN, TEST, TITLE, VARIANTS, base = ns['MAIN'], ns['TEST'], ns['TITLE'], ns['VARIANTS'], ns['base']
test0 = open(os.path.join(tree, TEST), encoding='utf8').read()
cut = test0.index('  // The kept part of the old text pin.')
fixed = test0[:cut] + open(fix_path, encoding='utf8').read()
anchor = "import { afterEach, describe, expect, it } from 'vitest';\n"
if fixed.count(anchor) != 1: sys.exit('import anchor not found once')
fixed = fixed.replace(anchor, "import ts from 'typescript';\n" + anchor)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
def run(main_text, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'fix-{tag}.json')
    try:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(fixed)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main_text)
        subprocess.run(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '-t', TITLE, '--reporter=json', f'--outputFile={report}'],
                       cwd=tree, capture_output=True, text=True, timeout=300, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        rows = [a for s in json.load(open(report, encoding='utf8'))['testResults'] for a in s['assertionResults'] if TITLE in a['fullName']]
        if len(rows) != 1: return {'status': f'rows={len(rows)}'}
        return {'status': rows[0]['status'], 'failure': (rows[0].get('failureMessages') or [''])[0].split('\n')[0][:240]}
    finally:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test0)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(base)
        if os.path.exists(report): os.remove(report)
out = {'tool': 'fix_check_r2.py', 'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
       'fixRow': open(fix_path, encoding='utf8').read(), 'results': {}}
for vid, f in VARIANTS.items():
    try: text = f(base)
    except ValueError as e: out['results'][vid] = {'status': 'skipped', 'failure': str(e)}; continue
    out['results'][vid] = run(text, vid)
    print(json.dumps({'variant': vid, **out['results'][vid]}), flush=True)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
