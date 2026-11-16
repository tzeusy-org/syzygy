#!/usr/bin/env python3
"""rev-532: do the committed CPU-time bounds fail under load? Reviewer tool, not authority.

usage: python3 -I cpu_flake_rev.py TREE OUT.json RUNS PARALLEL

For each of the three files holding a CPU-time bound, the test file gains, before each
`expect(cpuMsSince(cpu)).toBeLessThan(NAME);` line, a synchronous append of {line, bound, cpuMs}; the assertion itself stays,
so a run is the real test plus one file append inside the measured region. Each run is the WHOLE file
(`npx vitest run FILE --reporter=json`), so the region sits after the file's other tests, as in a suite run. RUNS runs per
file, PARALLEL at a time across all three files (adding load). Records each run's exit, failed titles and region values.
The tree is restored and checked clean at the end.
"""
import json, os, re, subprocess, sys, tempfile, time
from concurrent.futures import ThreadPoolExecutor

tree, out_path, runs, parallel = os.path.abspath(sys.argv[1]), sys.argv[2], int(sys.argv[3]), int(sys.argv[4])
FILES = ['packages/polaris-generation-core/src/dossier-profile.test.ts', 'packages/polaris-generation-core/src/excerpt.test.ts',
         'packages/three-surface-poc-core/src/test-artifact-verification.test.ts']
END = re.compile(r'^(\s*)expect\(cpuMsSince\(cpu\)\)\.toBeLessThan\((\w+)\);$')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
saved = {f: open(os.path.join(tree, f), encoding='utf8').read() for f in FILES}
loadavg = lambda: float(open('/proc/loadavg').read().split()[0])

def probed(text):
    out = ["import { appendFileSync as revFlake } from 'node:fs';"]
    for n, line in enumerate(text.split('\n'), 1):
        if (m := END.match(line)):
            out.append(f"{m.group(1)}revFlake(process.env.REV_FLAKE!, JSON.stringify({{ line: {n}, bound: '{m.group(2)}', cpuMs: cpuMsSince(cpu) }}) + '\\n');")
        out.append(line)
    return '\n'.join(out)

def one(job):
    file, k = job
    probe, report = tempfile.mktemp(suffix='.jsonl'), tempfile.mktemp(suffix='.json')
    open(probe, 'w').close()
    load1, began = loadavg(), time.time()
    done = subprocess.run(['npx', 'vitest', 'run', file, '--reporter=json', f'--outputFile={report}'], cwd=tree, capture_output=True, text=True,
                          env={**{k2: v for k2, v in os.environ.items() if not k2.startswith('VITEST')}, 'REV_FLAKE': probe}, timeout=900)
    failed, total = [], 0
    if os.path.exists(report):
        for suite in json.load(open(report, encoding='utf8'))['testResults']:
            for a in suite['assertionResults']:
                total += 1
                if a['status'] != 'passed': failed.append({'title': a['fullName'], 'status': a['status'], 'msg': (a.get('failureMessages') or [''])[0][:400]})
        os.remove(report)
    regions = [json.loads(l) for l in open(probe).read().splitlines() if l.strip()]
    os.remove(probe)
    return {'file': file, 'run': k, 'exit': done.returncode, 'seconds': round(time.time() - began, 1), 'load1Start': load1, 'load1End': loadavg(),
            'rows': total, 'failed': failed, 'regions': regions}

try:
    for f in FILES: open(os.path.join(tree, f), 'w', encoding='utf8').write(probed(saved[f]))
    jobs = [(f, k) for k in range(runs) for f in FILES]
    results = []
    with ThreadPoolExecutor(parallel) as pool:
        for r in pool.map(one, jobs):
            results.append(r)
            print(json.dumps({'file': r['file'].split('/')[-1], 'run': r['run'], 'exit': r['exit'], 'rows': r['rows'], 'failed': [x['title'] for x in r['failed']],
                              'max': max((x['cpuMs'] for x in r['regions']), default=None), 'load1': r['load1Start']}), flush=True)
finally:
    for f, text in saved.items(): open(os.path.join(tree, f), 'w', encoding='utf8').write(text)
summary = {}
for r in results:
    for g in r['regions']:
        s = summary.setdefault(g['bound'], {'n': 0, 'max': 0.0, 'values': []})
        s['n'] += 1; s['max'] = max(s['max'], g['cpuMs']); s['values'].append(round(g['cpuMs'], 3))
for s in summary.values():
    v = sorted(s['values']); s['p50'] = v[len(v) // 2]; s['p99'] = v[min(len(v) - 1, int(len(v) * 0.99))]
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': 'cpu_flake_rev.py', 'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
           'runsPerFile': runs, 'parallel': parallel, 'nonzeroExits': sum(r['exit'] != 0 for r in results),
           'failedRows': [dict(x, file=r['file'], run=r['run']) for r in results for x in r['failed']],
           'load1Range': [min(r['load1Start'] for r in results), max(r['load1Start'] for r in results)],
           'summary': summary, 'runs': [{k: v for k, v in r.items() if k != 'regions'} | {'regions': r['regions']} for r in results]},
          open(out_path, 'w', encoding='utf8'), indent=1)
