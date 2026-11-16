#!/usr/bin/env python3
"""The lane's 17 mutants (docs/evidence/syzygy-bpyt-4-2/tools/mutants.py at 2f249d2c), re-run through reviewer_mutants.py's
runner so each kill's failure message is kept (R-GP-IMPL-SOURCE-RESOLUTION-1). Run as reviewer_mutants.py is run."""
import hashlib, json, os, subprocess, tempfile

_lane = open('docs/evidence/syzygy-bpyt-4-2/tools/mutants.py').read().split('\n\n\ndef vitest', 1)[0]
_ns = {}
exec(_lane.split('import hashlib, json, os, subprocess, tempfile', 1)[1], _ns)
MUTANTS = _ns['MUTANTS']


def vitest(files):
    with tempfile.TemporaryDirectory() as scratch:
        report = os.path.join(scratch, 'report.json')
        done = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'], capture_output=True, text=True)
        data = json.load(open(report)) if os.path.exists(report) else {}
    failing = []
    for f in data.get('testResults', []):
        for a in f.get('assertionResults', []):
            if a.get('status') == 'failed':
                failing.append({'test': a['fullName'], 'message': (a.get('failureMessages') or [''])[0][:300]})
        if f.get('status') == 'failed' and not any(a.get('status') == 'failed' for a in f.get('assertionResults', [])):
            failing.append({'suite': os.path.relpath(f['name']), 'message': (f.get('message') or '')[:300]})
    return {'exit': done.returncode, 'failed': data.get('numFailedTests'), 'passed': data.get('numPassedTests'),
            'failedSuites': data.get('numFailedTestSuites'), 'total': data.get('numTotalTests'), 'failing': failing}


def loadavg():
    return open('/proc/loadavg').read().split()[:3]


record = {
    'subject': 'the lane mutants re-run with failure messages, R-GP-IMPL-SOURCE-RESOLUTION-1',
    'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
    'worktreeClean': subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == '',
    'distsPresent': sorted(d for p in ('apps', 'packages') for d in os.listdir(p) if os.path.isdir(os.path.join(p, d, 'dist'))),
    'loadavgBefore': loadavg(),
    'unmutated': vitest(sorted({f for *_, files in MUTANTS for f in files})),
    'mutants': [],
}
for ident, what, path, old, new, files in MUTANTS:
    original = open(path, 'rb').read()
    text = original.decode()
    if text.count(old) != 1:
        raise SystemExit(f'{ident}: the fragment occurs {text.count(old)} times in {path}')
    try:
        open(path, 'w').write(text.replace(old, new))
        load = loadavg()
        outcome = vitest(files)
    finally:
        open(path, 'wb').write(original)
    record['mutants'].append({'id': ident, 'mutation': what, 'file': path, 'fileSha256': hashlib.sha256(original).hexdigest(),
                              'old': old, 'new': new, 'tests': files, 'loadavg': load, **outcome,
                              'killed': outcome['exit'] != 0 and (outcome['failed'] or 0) + (outcome['failedSuites'] or 0) > 0})
record['killed'] = sum(m['killed'] for m in record['mutants'])
record['of'] = len(record['mutants'])
record['worktreeCleanAfter'] = subprocess.run(['git', 'status', '--porcelain'], capture_output=True, text=True).stdout == ''
print(json.dumps(record, indent=1))
