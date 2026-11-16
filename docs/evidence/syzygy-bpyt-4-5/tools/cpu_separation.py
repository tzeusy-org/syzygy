#!/usr/bin/env python3
"""Each CPU-time bound's separation: the head's slowest run of the timed region against the fastest run of the quadratic
mutant the bound names (syzygy-bpyt.4.5). Evidence tool, not authority.

usage: python3 -I cpu_separation.py TREE CASES.json OUT.json [HEAD_RUNS [MUTANT_RUNS [CAP_MS]]]

Defaults: HEAD_RUNS 10, MUTANT_RUNS 10, CAP_MS 60000. CASES.json is tools/mutant-cases.json; each mutant below is named by
its id there and applied from its `old`/`new` fragments (each `old` must occur exactly once).

Probe. In the test file only, while a run lasts: every `const cpu = cpuUsage();` line gains a synchronous
append of {start: line, pid, cpuUs} to the file $CPU_PROBE, and every `expect(cpuMsSince(cpu)).toBeLessThan(NAME);` line is
replaced by an append of {end: line, pid, cpuMs: cpuMsSince(cpu)}; line numbers are the unprobed file's. The region is the
code between the two, on the thread that runs the test. A run is `npx vitest run FILE -t TITLE` in its own session.

Cap. While a start has no end, the region's CPU so far is read from /proc (utime + stime) less the start reading: from
/proc/<pid>/task/<pid>/stat, the main thread of the process that wrote the start, which in vitest's default forks pool
is the thread that runs the test, when the `node` on PATH has process.threadCpuUsage; from /proc/<pid>/stat, the whole
process, when it has not and the tests' cpuUsage falls back to process.cpuUsage (`cpuSource` in OUT.json). The tool
checks that this pid is not the vitest process itself. Past CAP_MS the session is SIGKILLed
and the run counts as `capped` at that reading: the region needed at least that much. A mutant row whose first 3 runs all
cap stops there, since every further run could only show the same lower bound. A mutant run that ends records its region.

Bound. For each probed line: headMax is the largest region over all head runs and every case the line runs for; mutantMin
is the smallest over the runs of every mutant row that reaches the region (its own smallest run at least 10 x headMax; a
capped run gives its reading, a lower bound). The proposed bound is their geometric mean rounded down to two significant
figures, and the line passes when bound / headMax >= 10 and mutantMin / bound >= 10. A mutant row whose smallest run is
under the proposed bound is recorded as not reached: the bound does not fail it. Each site also records the bound the
test file holds (`const NAME = N;`) and the same two ratios at it (`fileBound`).
The tree must be clean before and is checked clean (`git diff --quiet`) after; each run records load1 at its start and end.
"""
import hashlib, json, math, os, re, signal, subprocess, sys, tempfile, time

tree, cases_path, out_path = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3]
head_runs = int(sys.argv[4]) if len(sys.argv) > 4 else 10
mutant_runs = int(sys.argv[5]) if len(sys.argv) > 5 else 10
cap_ms = int(sys.argv[6]) if len(sys.argv) > 6 else 60_000
DP, EX, TA = ('packages/polaris-generation-core/src/dossier-profile.test.ts', 'packages/polaris-generation-core/src/excerpt.test.ts',
              'packages/three-surface-poc-core/src/test-artifact-verification.test.ts')
SITES = [
    {'file': DP, 'bound': 'EDGE_TRIM_CPU_MS', 'head': 'trims a long run of spaces in linear time',
     'mutants': [('edge-backtracking-regex', 'trims a long run of spaces in linear time')]},
    {'file': EX, 'bound': 'HOSTILE_LINE_CPU_MS', 'head': 'stays linear on one 100k line of spaces after',
     'mutants': [('excerpt-no-cap-quadratic-pattern', 'stays linear on one 100k line of spaces after an identifier')]},
    {'file': TA, 'bound': 'TAG_SCAN_CPU_MS', 'head': 'scans (unterminated opening tags|unterminated plural tags|near-miss tag names) at the ceiling',
     'mutants': [('junit-tag-regex', 'scans unterminated opening tags at the ceiling'), ('junit-tag-regex', 'scans unterminated plural tags at the ceiling'),
                 ('junit-tag-regex', 'scans near-miss tag names at the ceiling')]},
    {'file': TA, 'bound': 'ATTRIBUTE_SCAN_CPU_MS', 'head': 'scans one tag body that is a single word run at the ceiling',
     'mutants': [('junit-attr-regex', 'scans one tag body that is a single word run at the ceiling')]},
]
START = re.compile(r'^(\s*)const cpu = cpuUsage\(\);$')
END = re.compile(r'^(\s*)expect\(cpuMsSince\(cpu\)\)\.toBeLessThan\((\w+)\);$')
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
sha = lambda path: hashlib.sha256(open(path, 'rb').read()).hexdigest()
loadavg = lambda: float(open('/proc/loadavg').read().split()[0])
TICK_MS = 1000 / os.sysconf('SC_CLK_TCK')
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree is not clean')
cases = {c['id']: c for c in json.load(open(cases_path, encoding='utf8'))}

def probed(text):
    out = ["import { appendFileSync as cpuProbeAppend } from 'node:fs';"]
    for n, line in enumerate(text.split('\n'), 1):
        if (m := START.match(line)):
            out += [line, f"{m.group(1)}cpuProbeAppend(process.env.CPU_PROBE!, JSON.stringify({{ start: {n}, pid: process.pid, cpuUs: cpu.user + cpu.system }}) + '\\n');"]
        elif (m := END.match(line)):
            out.append(f"{m.group(1)}cpuProbeAppend(process.env.CPU_PROBE!, JSON.stringify({{ end: {n}, bound: '{m.group(2)}', pid: process.pid, cpuMs: cpuMsSince(cpu) }}) + '\\n');")
        else: out.append(line)
    return '\n'.join(out)

CPU_SOURCE = 'thread' if subprocess.run(['node', '-p', 'typeof process.threadCpuUsage'], capture_output=True, text=True).stdout.strip() == 'function' else 'process'

def thread_ms(pid):
    stat = f'/proc/{pid}/task/{pid}/stat' if CPU_SOURCE == 'thread' else f'/proc/{pid}/stat'
    fields = open(stat).read().rsplit(')', 1)[1].split()
    return (int(fields[11]) + int(fields[12])) * TICK_MS

def run(file, title, mutations):
    saved = {}
    probe = tempfile.mktemp(suffix='.jsonl')
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
                                 start_new_session=True, env={**{k: v for k, v in os.environ.items() if not k.startswith('VITEST')}, 'CPU_PROBE': probe})
        capped, reading = None, None
        while child.poll() is None:
            time.sleep(0.2)
            records = [json.loads(l) for l in open(probe).read().splitlines() if l.strip()]
            if records and 'start' in records[-1]:
                pid = records[-1]['pid']
                if pid == child.pid: sys.exit('the probe ran in the vitest process itself, not a forked worker')
                try: reading = thread_ms(pid) - records[-1]['cpuUs'] / 1000
                except OSError: continue
                if reading >= cap_ms:
                    capped = {'line': records[-1]['start'], 'regionCpuMsAtLeast': round(reading, 1)}
                    os.killpg(child.pid, signal.SIGKILL); child.wait(); break
        records = [json.loads(l) for l in open(probe).read().splitlines() if l.strip()]
        return {'title': title, 'exit': child.returncode, 'seconds': round(time.time() - began, 1), 'load1Start': load1, 'load1End': loadavg(),
                'regions': [{'line': r['end'], 'bound': r['bound'], 'cpuMs': round(r['cpuMs'], 3)} for r in records if 'end' in r], 'capped': capped}
    finally:
        for rel, text in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(text)
        if os.path.exists(probe): os.remove(probe)

def round_down_2sf(x):
    e = math.floor(math.log10(x)) - 1
    return math.floor(x / 10 ** e) * 10 ** e

results = []
for site in SITES:
    head = [run(site['file'], site['head'], []) for _ in range(head_runs)]
    for h in head: print(json.dumps({'bound': site['bound'], 'head': h['regions'], 'exit': h['exit'], 'load1': h['load1Start']}), flush=True)
    if any(h['exit'] != 0 or not h['regions'] for h in head): sys.exit(f'{site["bound"]}: a head run failed or probed nothing')
    lines = sorted({r['line'] for h in head for r in h['regions'] if r['bound'] == site['bound']})
    head_max = max(r['cpuMs'] for h in head for r in h['regions'] if r['bound'] == site['bound'])
    mutants = []
    for mid, title in site['mutants']:
        runs = []
        for k in range(mutant_runs):
            runs.append(run(site['file'], title, cases[mid]['mutations']))
            r = runs[-1]; print(json.dumps({'bound': site['bound'], 'mutant': mid, 'title': title, 'capped': r['capped'], 'regions': r['regions'], 'seconds': r['seconds']}), flush=True)
            if k == 2 and all(x['capped'] for x in runs): break
        values = [x['capped']['regionCpuMsAtLeast'] if x['capped'] else min((g['cpuMs'] for g in x['regions'] if g['bound'] == site['bound']), default=None) for x in runs]
        if None in values: sys.exit(f'{mid} / {title}: a run neither capped nor probed its region')
        mutants.append({'id': mid, 'title': title, 'mutations': cases[mid]['mutations'], 'runs': runs, 'min': min(values),
                        'cappedRuns': sum(1 for x in runs if x['capped'])})
    reached = [m for m in mutants if m['min'] >= 10 * head_max]
    mutant_min = min(m['min'] for m in reached) if reached else None
    bound = round_down_2sf(math.sqrt(head_max * mutant_min)) if reached else None
    held = re.search(rf'^const {site["bound"]} = ([0-9_]+);', open(os.path.join(tree, site['file']), encoding='utf8').read(), re.M)
    file_bound = int(held.group(1).replace('_', '')) if held else None
    for m in mutants: m['reached'] = bound is not None and m['min'] >= bound
    results.append({'bound': site['bound'], 'file': site['file'], 'lines': lines, 'headRuns': head, 'headMaxMs': head_max,
                    'mutants': mutants, 'mutantMinMs': mutant_min, 'mutantMinIsLowerBound': any(m['cappedRuns'] and m['min'] == mutant_min for m in reached),
                    'proposedBoundMs': bound, 'boundOverHeadMax': round(bound / head_max, 1) if bound else None,
                    'mutantMinOverBound': round(mutant_min / bound, 1) if bound else None,
                    'separated': bool(bound and bound / head_max >= 10 and mutant_min / bound >= 10),
                    'fileBound': {'ms': file_bound, 'overHeadMax': round(file_bound / head_max, 1) if file_bound else None,
                                  'mutantMinOver': round(mutant_min / file_bound, 1) if file_bound and mutant_min else None,
                                  'separated': bool(file_bound and mutant_min and file_bound / head_max >= 10 and mutant_min / file_bound >= 10)}})
    print(json.dumps({k: v for k, v in results[-1].items() if k not in ('headRuns', 'mutants')}), flush=True)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode != 0: sys.exit('tree not restored')
json.dump({'tool': {'name': 'cpu_separation.py', 'sha256': sha(os.path.abspath(__file__))}, 'cases': {'path': os.path.basename(cases_path), 'sha256': sha(cases_path)},
           'tree': git('rev-parse', 'HEAD').strip(), 'headRuns': head_runs, 'mutantRuns': mutant_runs, 'capMs': cap_ms, 'cpus': os.cpu_count(), 'cpuSource': CPU_SOURCE,
           'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(), 'sites': results},
          open(out_path, 'w', encoding='utf8'), indent=1)
