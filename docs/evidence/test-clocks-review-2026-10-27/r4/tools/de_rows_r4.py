#!/usr/bin/env python3
"""rev-532d (round 4): run named main.ts mutants against the whole daemon-entry test at a tree. Reviewer tool, not authority.

usage: python3 -I de_rows_r4.py TREE R3_VARIANTS OUT.json ID...

Each ID is taken from the tree's own docs/evidence/syzygy-bpyt-4-5/tools/daemon_entry_probe.py MUTANTS (executing only the
module up to its `git = lambda` line, so E-branch-swap is cut from the tree's main.ts as the lane's probe cuts it), or, when
absent there, from rev-532c's r3_variants.py VARIANTS (its `edits`, a list of (old, new) or a function of the text). For
each it applies the edit, rebuilds with `npx tsc -b apps/syzygy`, runs packages/cap1-system/src/daemon-entry-unchanged.
system.test.ts under the system config with the JSON reporter (its own session; SIGKILLed as a group after 600 s), and
records every row's status, duration and first failure message (600 chars), with /proc/loadavg at start and end. It
restores the file and rebuilds; the tree must be clean before and after. `control` is the tree unchanged.
"""
import json, os, signal, subprocess, sys, time

tree, r3_path, out_path, ids = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4:]
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
MAIN = 'apps/syzygy/src/main.ts'
probe_path = os.path.join(tree, 'docs/evidence/syzygy-bpyt-4-5/tools/daemon_entry_probe.py')
saved = sys.argv
sys.argv = [probe_path, tree, '/dev/null']
src, lane = open(probe_path, encoding='utf8').read(), {}
exec(compile(src[: src.index('git = lambda')], probe_path, 'exec'), lane)
sys.argv = saved
by_id = {m['id']: m for m in lane['MUTANTS'] if m}
r3 = {}
exec(open(r3_path, encoding='utf8').read(), r3)
env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST')}
loadavg = lambda: open('/proc/loadavg').read().split()[0]

def build():
    d = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    return d.returncode, (d.stdout + d.stderr)[-1500:]

def edits_for(mid, text):
    if mid in by_id:
        m = by_id[mid]
        return 'lane', m['file'], [(m['old'], m['new'])]
    v = r3['VARIANTS'][mid]
    e = v['edits'](text) if callable(v['edits']) else v['edits']
    return 'rev-532c', MAIN, e

if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
results = []
for mid in ['control', *ids]:
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'de-{mid}.json')
    source, rel, edits, path, original = None, None, [], None, None
    try:
        if mid != 'control':
            main_text = open(os.path.join(tree, MAIN), encoding='utf8').read()
            source, rel, edits = edits_for(mid, main_text)
            path = os.path.join(tree, rel)
            original = open(path, encoding='utf8').read()
            text = original
            for old, new in edits:
                if text.count(old) != 1: sys.exit(f'{mid}: old occurs {text.count(old)} times in {rel}')
                text = text.replace(old, new)
            open(path, 'w', encoding='utf8').write(text)
        code, tail = build()
        if code:
            results.append({'id': mid, 'source': source, 'file': rel, 'edits': edits, 'build': code, 'buildTail': tail})
            print(json.dumps({'id': mid, 'build': code}), flush=True)
            continue
        start, began = loadavg(), time.time()
        child = subprocess.Popen(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', TEST, '--reporter=json',
                                  f'--outputFile={report}'], cwd=tree, stdout=subprocess.PIPE, stderr=subprocess.STDOUT, text=True,
                                 start_new_session=True, env=env)
        killed = False
        try: child.communicate(timeout=600)
        except subprocess.TimeoutExpired:
            os.killpg(child.pid, signal.SIGKILL); killed = True; child.communicate()
        rows = []
        if os.path.exists(report):
            for suite in json.load(open(report, encoding='utf8'))['testResults']:
                rows += [{'title': a['title'], 'status': a['status'], 'durationMs': a.get('duration'),
                          'failure': (a.get('failureMessages') or [''])[0][:600]} for a in suite['assertionResults']]
        results.append({'id': mid, 'source': source, 'file': rel, 'edits': edits, 'build': 0, 'exit': child.returncode, 'killed': killed,
                        'seconds': round(time.time() - began, 1), 'load1': [start, loadavg()], 'rows': rows,
                        'passed': sum(r['status'] == 'passed' for r in rows), 'failed': [r['title'] for r in rows if r['status'] == 'failed']})
        print(json.dumps({'id': mid, 'exit': child.returncode, 'passed': results[-1]['passed'], 'failed': results[-1]['failed'],
                          'load1': results[-1]['load1']}), flush=True)
    finally:
        if path: open(path, 'w', encoding='utf8').write(original)
        if os.path.exists(report): os.remove(report)
code, tail = build()
if code: sys.exit(f'final rebuild failed: {tail}')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
           'results': results}, open(out_path, 'w', encoding='utf8'), indent=1, ensure_ascii=False)
