#!/usr/bin/env python3
"""rev-532b's own CPU-separation re-measurement for PR 532 round 2 (syzygy-bpyt.4.5). Reviewer tool, not authority.

usage: python3 -I cpu_sep_r2.py TREE CASES.json OUT.json HEAD_RUNS MUTANT_RUNS [BOUND,BOUND,...]

Adapted from rev-532's cpu_sep_rev.py to the repaired helper (`const cpu = cpuUsage();`). Independent of the lane's
cpu_separation.py in three ways: every (mutant, title) row runs MUTANT_RUNS times with no early stop; each site's cap is
11x the bound COMMITTED in the test file (a capped run proves >= 11x on the mutant side), except HOSTILE_LINE, which runs
to completion (cap 120 s); and the ratios are taken against the committed constant.

CPU source: the `node` on PATH decides. With process.threadCpuUsage the cap reads /proc/<pid>/task/<pid>/stat (the
worker's main thread); without it (Node 22, where the tests fall back to process.cpuUsage) the cap reads /proc/<pid>/stat
(the whole worker process), matching what the test measures. The recorded region figures are what the test's own
cpuMsSince returns. The tree is checked clean before and after. Load1 is recorded at each run's start and end.
"""
import json, os, re, signal, subprocess, sys, tempfile, time

tree, cases_path, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
head_runs, mutant_runs = int(sys.argv[4]), int(sys.argv[5])
only = set(sys.argv[6].split(',')) if len(sys.argv) > 6 else None
DP = 'packages/polaris-generation-core/src/dossier-profile.test.ts'
EX = 'packages/polaris-generation-core/src/excerpt.test.ts'
TA = 'packages/three-surface-poc-core/src/test-artifact-verification.test.ts'
SITES = [
    (DP, 'EDGE_TRIM_CPU_MS', 'trims a long run of spaces in linear time',
     [('edge-backtracking-regex', 'trims a long run of spaces in linear time')]),
    (EX, 'HOSTILE_LINE_CPU_MS', 'stays linear on one 100k line of spaces after',
     [('excerpt-no-cap-quadratic-pattern', 'stays linear on one 100k line of spaces after an identifier')]),
    (TA, 'TAG_SCAN_CPU_MS', 'scans (unterminated opening tags|unterminated plural tags|near-miss tag names) at the ceiling',
     [('junit-tag-regex', 'scans unterminated opening tags at the ceiling'), ('junit-tag-regex', 'scans unterminated plural tags at the ceiling'),
      ('junit-tag-regex', 'scans near-miss tag names at the ceiling')]),
    (TA, 'ATTRIBUTE_SCAN_CPU_MS', 'scans one tag body that is a single word run at the ceiling',
     [('junit-attr-regex', 'scans one tag body that is a single word run at the ceiling')]),
]
START = re.compile(r'^(\s*)const cpu = cpuUsage\(\);$')
END = re.compile(r'^(\s*)expect\(cpuMsSince\(cpu\)\)\.toBeLessThan\((\w+)\);$')
TICK_MS = 1000 / os.sysconf('SC_CLK_TCK')
NODE = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()
THREAD = subprocess.run(['node', '-p', 'typeof process.threadCpuUsage'], capture_output=True, text=True).stdout.strip() == 'function'
loadavg = lambda: float(open('/proc/loadavg').read().split()[0])
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
cases = {c['id']: c for c in json.load(open(cases_path, encoding='utf8'))}

def committed(file, name):
    m = re.search(rf'^const {name} = ([\d_]+);', open(os.path.join(tree, file), encoding='utf8').read(), re.M)
    return int(m.group(1).replace('_', ''))

def probed(text):
    out = ["import { appendFileSync as revProbe } from 'node:fs';"]
    starts = ends = 0
    for n, line in enumerate(text.split('\n'), 1):
        if (m := START.match(line)):
            starts += 1
            out += [line, f"{m.group(1)}revProbe(process.env.REV_PROBE!, JSON.stringify({{ start: {n}, pid: process.pid, cpuUs: cpu.user + cpu.system }}) + '\\n');"]
        elif (m := END.match(line)):
            ends += 1
            out.append(f"{m.group(1)}revProbe(process.env.REV_PROBE!, JSON.stringify({{ end: {n}, bound: '{m.group(2)}', cpuMs: cpuMsSince(cpu) }}) + '\\n');")
        else: out.append(line)
    if starts == 0 or starts != ends: sys.exit(f'probe matched {starts} starts and {ends} ends')
    return '\n'.join(out)

def cpu_ms(pid):
    stat = f'/proc/{pid}/task/{pid}/stat' if THREAD else f'/proc/{pid}/stat'
    fields = open(stat).read().rsplit(')', 1)[1].split()
    return (int(fields[11]) + int(fields[12])) * TICK_MS

def run(file, title, mutations, cap_ms):
    saved, probe = {}, tempfile.mktemp(suffix='.jsonl')
    try:
        for m in mutations:
            text = open(os.path.join(tree, m['file']), encoding='utf8').read()
            if text.count(m['old']) != 1: sys.exit(f'{m["file"]}: old occurs {text.count(m["old"])} times')
            saved.setdefault(m['file'], text); open(os.path.join(tree, m['file']), 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
        text = open(os.path.join(tree, file), encoding='utf8').read(); saved.setdefault(file, text)
        open(os.path.join(tree, file), 'w', encoding='utf8').write(probed(text))
        open(probe, 'w').close()
        began, load1 = time.time(), loadavg()
        child = subprocess.Popen(['npx', 'vitest', 'run', file, '-t', title], cwd=tree, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL,
                                 start_new_session=True, env={**{k: v for k, v in os.environ.items() if not k.startswith('VITEST')}, 'REV_PROBE': probe})
        capped = None
        while child.poll() is None:
            time.sleep(0.2)
            recs = [json.loads(l) for l in open(probe).read().splitlines() if l.strip()]
            if recs and 'start' in recs[-1]:
                pid = recs[-1]['pid']
                if pid == child.pid: sys.exit('probe ran in the vitest process itself')
                try: reading = cpu_ms(pid) - recs[-1]['cpuUs'] / 1000
                except OSError: continue
                if reading >= cap_ms:
                    capped = round(reading, 1); os.killpg(child.pid, signal.SIGKILL); child.wait(); break
        recs = [json.loads(l) for l in open(probe).read().splitlines() if l.strip()]
        return {'title': title, 'exit': child.returncode, 'seconds': round(time.time() - began, 1), 'load1Start': load1, 'load1End': loadavg(),
                'regions': [{'line': r['end'], 'bound': r['bound'], 'cpuMs': round(r['cpuMs'], 3)} for r in recs if 'end' in r],
                'cappedAtLeastMs': capped}
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
        if os.path.exists(probe): os.remove(probe)

out = {'tool': 'cpu_sep_r2.py', 'tree': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
       'node': NODE, 'cpuSource': 'thread' if THREAD else 'process', 'cpus': os.cpu_count(), 'headRunsPerSite': head_runs,
       'mutantRunsPerRow': mutant_runs, 'sites': []}
print(json.dumps({'node': NODE, 'cpuSource': out['cpuSource'], 'only': sorted(only) if only else None}), flush=True)
for file, name, head_title, mutants in SITES:
    if only and name not in only: continue
    bound = committed(file, name)
    cap = 120_000 if name == 'HOSTILE_LINE_CPU_MS' else 11 * bound
    head = []
    for _ in range(head_runs):
        head.append(run(file, head_title, [], cap)); h = head[-1]
        print(json.dumps({'bound': name, 'head': [r['cpuMs'] for r in h['regions'] if r['bound'] == name], 'exit': h['exit'], 'load1': h['load1Start']}), flush=True)
    vals = [r['cpuMs'] for h in head for r in h['regions'] if r['bound'] == name]
    rows = []
    for mid, title in mutants:
        runs = []
        for _ in range(mutant_runs):
            runs.append(run(file, title, cases[mid]['mutations'], cap)); r = runs[-1]
            print(json.dumps({'bound': name, 'mutant': mid, 'title': title, 'capped': r['cappedAtLeastMs'],
                              'regions': [g['cpuMs'] for g in r['regions'] if g['bound'] == name], 'seconds': r['seconds'], 'load1': r['load1Start']}), flush=True)
        per = [r['cappedAtLeastMs'] if r['cappedAtLeastMs'] is not None else min((g['cpuMs'] for g in r['regions'] if g['bound'] == name), default=None) for r in runs]
        rows.append({'mutant': mid, 'title': title, 'runs': runs, 'min': min(v for v in per if v is not None) if any(v is not None for v in per) else None,
                     'unmeasured': sum(v is None for v in per), 'cappedRuns': sum(r['cappedAtLeastMs'] is not None for r in runs)})
    reached = [r for r in rows if r['min'] is not None and r['min'] >= bound]
    loads = [x for h in head for x in (h['load1Start'], h['load1End'])] + [x for r in rows for g in r['runs'] for x in (g['load1Start'], g['load1End'])]
    out['sites'].append({'bound': name, 'committedMs': bound, 'capMs': cap, 'headRuns': head, 'headExitsNonzero': sum(h['exit'] != 0 for h in head),
                         'headRegions': len(vals), 'headMaxMs': max(vals), 'boundOverHeadMax': round(bound / max(vals), 1), 'mutants': rows,
                         'reachedMutantMinMs': min(r['min'] for r in reached) if reached else None,
                         'mutantMinOverBound': round(min(r['min'] for r in reached) / bound, 1) if reached else None,
                         'notReached': [(r['title'], r['min']) for r in rows if r not in reached], 'load1Range': [min(loads), max(loads)]})
    s = out['sites'][-1]
    print(json.dumps({k: v for k, v in s.items() if k not in ('headRuns', 'mutants')}), flush=True)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
