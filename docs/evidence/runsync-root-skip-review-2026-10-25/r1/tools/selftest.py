#!/usr/bin/env python3
"""rev-525 rule-6 selftest of check_record.py: each mutation of the record must turn at least one named check to FAIL.

usage: python3 -I selftest.py TREE REVIEWED_COMMIT"""
import copy, json, os, subprocess, sys, tempfile

tree, reviewed = sys.argv[1], sys.argv[2]
checker = os.path.join(os.path.dirname(os.path.realpath(__file__)), 'check_record.py')
rec = json.loads(subprocess.run(['git', 'show', f'{reviewed}:docs/evidence/syzygy-bpyt-4-22/runsync-and-root-probe.json'], cwd=tree,
                                capture_output=True, check=True).stdout)
flip = lambda h: ('0' if h[0] != '0' else '1') + h[1:]
def m_tool(r): r['tool']['sha256'] = flip(r['tool']['sha256'])
def m_file(r): k = next(iter(r['files'])); r['files'][k]['head'] = flip(r['files'][k]['head'])
def m_base(r): k = next(iter(r['files'])); r['files'][k]['base'] = flip(r['files'][k]['base'])
def m_old(r): r['mutants'][0]['edits'][0]['old'] += ' '
def m_failed(r): r['mutants'][0]['failedRows'] += 1
def m_port(r): r['mutants'][1]['port7477ListenersSeen'] = [{'t': 1.0, 'pids': [1]}]
def m_surv(r): r['mutants'][0]['survivors'] = {'1': 'x'}
def m_slow(r): next(t for t in r['mutants'][1]['tests'] if t['status'] == 'failed')['durationMs'] = 26000
def m_pop(r): r['unmutated'][1]['tests'][0]['status'] = 'skipped'
def m_shim(r): r['rootShim'][0]['tests'][-1]['status'] = 'passed'
def m_commit(r): r['commit'] = '56a4c81a784269feea23f934d6f454969322e084'
def m_mrec(r): r['mutants'][1]['mutantRecord']['sha256'] = flip(r['mutants'][1]['mutantRecord']['sha256'])
MUTANTS = {name[2:]: fn for name, fn in globals().items() if name.startswith('m_')}
def run(record):
    with tempfile.NamedTemporaryFile('w', suffix='.json', delete=False, dir='/tmp', prefix='r525-self-') as f:
        json.dump(record, f)
    try:
        done = subprocess.run([sys.executable, '-I', checker, tree, reviewed, f.name], capture_output=True, text=True)
    finally:
        os.unlink(f.name)
    fails = [l for l in done.stdout.split('\n') if l.startswith('FAIL')]
    return fails + ([f'CRASH exit {done.returncode}: {done.stderr.strip().splitlines()[-1]}'] if done.returncode else [])
control = run(rec)
print(f'control: {len(control)} FAIL')
killed = 0
for name, fn in MUTANTS.items():
    r = copy.deepcopy(rec); fn(r)
    fails = run(r)
    killed += bool(fails)
    print(f"{'killed  ' if fails else 'SURVIVED'} {name}: {fails[0] if fails else ''}")
print(f'{killed} of {len(MUTANTS)} mutants killed; control clean: {not control}')
