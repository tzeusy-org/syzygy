#!/usr/bin/env python3
"""Per-file and slow-test durations from hosted node-ci runs (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/ci_durations.py OUT.json [--sites CENSUS.json] RUN-ID [RUN-ID ...]
       python3 -I docs/evidence/syzygy-bpyt-4-31/tools/ci_durations.py OUT.json [--sites CENSUS.json] --local LOG COMMIT EXIT [--local ...]

For each run, `gh run view RUN-ID --log` and `gh run view RUN-ID --json headSha,conclusion,createdAt` are read. In the test
steps (`npm test`, `npm run test:system`; older logs name every step UNKNOWN STEP, so lines are read from any step) vitest's
default reporter prints one line per test file (its project, path, test count and duration) and, beneath it, one line per test
slower than its 300 ms slowTestThreshold (full name and duration). Every such line is kept verbatim, with its parse; colour codes,
which gh prints as a literal caret and bracket, are removed. A test with no
line of its own took under 300 ms in that run; a file's duration is an upper bound for each of its tests, since a file's tests
run one after another in one worker.

With --local, each LOG is the saved output of a local `npx vitest run` (the default reporter, written to a file, so with no
colour and the project printed between bars), recorded with the COMMIT it ran at and its EXIT status; its lines carry no step
prefix and are all read as one step. Lines `load1 start N` and `load1 end N`, which the driver writes around the run, give its
1-minute load average. Runs may be given in any mix of the two forms. With --sites, only the files that hold a site of the
given census (timeout_census.mjs output) are kept, each with every line printed beneath it."""
import json, os, re, subprocess, sys

ANSI = re.compile(r'(\x1b|\^\[)\[[0-9;]*m')  # gh prints the escape as a literal caret and bracket
STEP = re.compile(r'^[^\t]+\t([^\t]+)\t\ufeff?(\S+) (.*)$')
FILE = re.compile(r'^ ([✓×↓❯]) +(?:\|?(@[^\s|]+)\|? +)?(\S+\.test\.ts) \((\d+) tests?(?: \| [^)]*)?\) (\d+)ms')
TEST = re.compile(r'^ {3,}([✓×↓]) (.*?) +(\d+)ms$')
def parse(lines):
    """(step, text) pairs to file rows, each with the slow-test lines printed beneath it in the same step."""
    files, current = [], None
    for step, text in lines:
        f = FILE.match(text)
        if f:
            current = {'step': step, 'mark': f.group(1), 'project': f.group(2), 'file': f.group(3), 'tests': int(f.group(4)), 'ms': int(f.group(5)), 'line': text.strip(), 'slowTests': []}
            files.append(current)
            continue
        t = TEST.match(text)
        if t and current is not None and current['step'] == step:
            current['slowTests'].append({'mark': t.group(1), 'name': t.group(2), 'ms': int(t.group(3)), 'line': text.strip()})
    return files

def hosted(raw):
    m = STEP.match(ANSI.sub('', raw))
    return (m.group(1), m.group(3)) if m else None

out_path, rest = sys.argv[1], sys.argv[2:]
keep = None
if rest[:1] == ['--sites']:
    census = json.load(open(rest[1], encoding='utf8'))
    keep = {s['path'] for s in census['sites']} | {s['path'].removeprefix('packages/cap1-system/') for s in census['sites']}
    rest = rest[2:]
runs = []
while rest:
    if rest[0] == '--local':
        log_path, commit, code = rest[1:4]; rest = rest[4:]
        rid = os.path.basename(log_path)
        text = open(log_path, encoding='utf8').read()
        load = {m.group(1): float(m.group(2)) for m in re.finditer(r'^load1 (start|end) ([0-9.]+)$', text, re.M)}
        meta = {'headSha': commit, 'conclusion': 'success' if code == '0' else f'exit {code}', 'local': True, 'load1': load}
        files = parse(('local', ANSI.sub('', raw)) for raw in text.split('\n'))
    else:
        rid, rest = rest[0], rest[1:]
        meta = json.loads(subprocess.run(['gh', 'run', 'view', rid, '--json', 'headSha,conclusion,createdAt,workflowName'], capture_output=True, text=True, check=True).stdout)
        log = subprocess.run(['gh', 'run', 'view', rid, '--log'], capture_output=True, text=True, check=True).stdout
        files = parse(p for p in map(hosted, log.split('\n')) if p)
    if keep is not None: files = [f for f in files if f['file'] in keep]
    runs.append({'runId': int(rid) if rid.isdigit() else rid, **meta, 'files': files})
    print(f"run {rid} {meta['headSha'][:8]} {meta['conclusion']}: {len(files)} files, {sum(len(f['slowTests']) for f in files)} slow tests")
open(out_path, 'w', encoding='utf8').write(json.dumps({'tool': 'ci_durations.py', **({'sitesOf': census['commit']} if keep is not None else {}), 'runs': runs},
                                                   indent=1, ensure_ascii=False) + '\n')
