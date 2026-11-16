#!/usr/bin/env python3
"""rev-532b: rule-6 mutants of PR 532's kept daemon-entry text row (round 2). Reviewer tool, not authority.

usage: python3 -I text_row_mutants_r2.py TREE R2_MUTANTS_TOOL LANE_PROBE OUT.json

Runs only the kept text row (`-t` its title) of packages/cap1-system/src/daemon-entry-unchanged.system.test.ts, under
the system config, so no build is needed: the row reads apps/syzygy/src/main.ts from disk. For each row mutant T (an edit
of the test file, or none) and each main.ts variant M (the control, every main.ts mutant of de_r2_mutants.py and of the
lane's daemon_entry_probe.py, and four written here), it records whether the row passed. T x M is run only where it
decides something: every M against the unmutated row and against T2 and T9 (the two suspected equivalents), and each
other T against the control and the M named as its killer. A T is killed when some M's outcome differs from the
unmutated row's. Constants and MUTANTS lists are taken from the two tools without running their main loops.
"""
import json, os, re, subprocess, sys, time

tree, r2_tool, lane_tool, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4]
MAIN, TEST = 'apps/syzygy/src/main.ts', 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
TITLE = 'every line of main.ts naming the POC app sits inside'
def take(tool, stop, argv):
    src, ns = open(tool, encoding='utf8').read(), {}
    sys.argv = argv
    exec(compile(src[: src.index(stop)], tool, 'exec'), ns)
    return ns
r2 = take(r2_tool, 'def build():', [r2_tool, tree, 'x', 'y', '/dev/null'])
lane = take(lane_tool, 'git = lambda', [lane_tool, tree, '/dev/null'])
base = open(os.path.join(tree, MAIN), encoding='utf8').read()
SITE_Q = "'@syzygy/three-surface-poc-app/dossier-site'"
def rep(old, new):
    def f(text):
        if text.count(old) != 1: raise ValueError(f'old occurs {text.count(old)} times')
        return text.replace(old, new)
    return f
VARIANTS = {'control': lambda t: t}
for m in r2['MUTANTS']:
    if m and m['file'] == MAIN: VARIANTS[m['id']] = rep(m['old'], m['new'])
for m in lane['MUTANTS']:
    if m and m['file'] == MAIN and m['id'] not in VARIANTS: VARIANTS['lane:' + m['id']] = rep(m['old'], m['new'])
VARIANTS['V1-no-naming-line'] = lambda t: t.replace(SITE_Q, "'@syzygy/three-surface-' + 'poc-app/dossier-site'")
VARIANTS['Q1-template-specifier-between-branches'] = rep(r2['POLARIS_COMMENT'], f"  if ({r2['FLAG']}) await import(`@syzygy/three-surface-poc-app/dossier-site`);\n\n" + r2['POLARIS_COMMENT'])
VARIANTS['Z3-renamed-opening-and-top-level-load'] = lambda t: rep("  if (argv[0] === 'dossier') {\n", '  if (argv[0] === "dossier") {\n')(
    rep("const DEFAULT_PORT = 7477;\n", f"if ({r2['FLAG']}) await import({SITE_Q});\nconst DEFAULT_PORT = 7477;\n")(t))
ROW = {
    'T1-no-daemon-after-close': ('      expect(daemon).toBeGreaterThan(close);\n', '', ['D1-polaris-after-daemon']),
    'T2-non-strict-window': ('index > open && index < close', 'index >= open && index <= close', None),
    'T3-no-vacuity-guard': ('    expect(naming.length).toBeGreaterThan(0);\n', '', ['V1-no-naming-line']),
    'T6-every-block': ('!blocks.some(', '!blocks.every(', ['control']),
    'T7-dossier-block-only': ('["  if (argv[0] === \'dossier\') {", "  if (argv[0] === \'polaris\') {"].map(', '["  if (argv[0] === \'dossier\') {"].map(', ['control']),
    'T9-no-close-after-open': ('      expect(close).toBeGreaterThan(open);\n', '', None),
    'T12-no-open-found': ('      expect(open).toBeGreaterThan(-1);\n', '', ['Z3-renamed-opening-and-top-level-load', 'L1-else-if-chain']),
    'T14-quoted-specifier-only': ("text.includes('three-surface-poc-app')", "text.includes(\"'@syzygy/three-surface-poc-app\")", ['Q1-template-specifier-between-branches']),
}
test0 = open(os.path.join(tree, TEST), encoding='utf8').read()
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
def run(test_text, main_text, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'trm-{tag}.json')
    try:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test_text)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main_text)
        subprocess.run(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '-t', TITLE, '--reporter=json', f'--outputFile={report}'],
                       cwd=tree, capture_output=True, text=True, timeout=300, env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        rows = [a for s in json.load(open(report, encoding='utf8'))['testResults'] for a in s['assertionResults'] if TITLE in a['fullName']]
        if len(rows) != 1: return {'status': f'rows={len(rows)}'}
        return {'status': rows[0]['status'], 'failure': (rows[0].get('failureMessages') or [''])[0].split('\n')[0][:200]}
    finally:
        open(os.path.join(tree, TEST), 'w', encoding='utf8').write(test0)
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(base)
        if os.path.exists(report): os.remove(report)
mains = {}
for vid, f in VARIANTS.items():
    try: mains[vid] = f(base)
    except ValueError as e: mains[vid] = None; print(json.dumps({'variant': vid, 'skipped': str(e)}), flush=True)
out = {'tool': 'text_row_mutants_r2.py', 'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
       'unmutated': {}, 'rowMutants': {}}
began = time.time()
for vid, text in mains.items():
    if text is None: continue
    out['unmutated'][vid] = run(test0, text, f'u-{vid}')
    print(json.dumps({'row': 'unmutated', 'variant': vid, **out['unmutated'][vid]}), flush=True)
for tid, (old, new, killers) in ROW.items():
    if test0.count(old) != 1: sys.exit(f'{tid}: old occurs {test0.count(old)} times')
    ttext = test0.replace(old, new)
    targets = [v for v in mains if mains[v] is not None] if killers is None else ['control'] + [k for k in killers if k != 'control']
    cells = {}
    for vid in targets:
        cells[vid] = run(ttext, mains[vid], f'{tid}-{vid}')
    differs = sorted(v for v in cells if cells[v]['status'] != out['unmutated'][v]['status'])
    out['rowMutants'][tid] = {'old': old, 'new': new, 'variantsRun': len(cells), 'cells': cells, 'killedBy': differs, 'survives': not differs}
    print(json.dumps({'row': tid, 'variantsRun': len(cells), 'killedBy': differs, 'survives': not differs}), flush=True)
out['seconds'] = round(time.time() - began, 1)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
