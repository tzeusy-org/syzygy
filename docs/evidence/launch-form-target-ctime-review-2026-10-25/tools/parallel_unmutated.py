"""R-GP-IMPL-LAUNCH-FORM-TARGET-CTIME-1: the unmutated launched.test.ts at the reviewed commit, N runs at once, each under its own TMPDIR
below the root given, vitest JSON reporter. The clone's tracked tree must be clean and at the reviewed commit; the tool writes nothing in it.
Usage: python3 -I parallel_unmutated.py <clone> <tmp root> <n> <out.json>"""
import hashlib, json, os, subprocess, sys
from pathlib import Path

CLONE, TMPROOT, N, OUT = Path(sys.argv[1]).resolve(), sys.argv[2], int(sys.argv[3]), Path(sys.argv[4])
TEST = 'packages/polaris-dossier/src/launched.test.ts'
assert subprocess.run(['git', '-C', str(CLONE), 'status', '--porcelain', '--untracked-files=no'], capture_output=True, text=True).stdout == ''
head = subprocess.run(['git', '-C', str(CLONE), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
os.makedirs(TMPROOT, exist_ok=True)
load_before = os.getloadavg()
procs = []
for i in range(N):
    tmp = f'{TMPROOT}/par-{i}'
    os.makedirs(tmp)
    report = Path(TMPROOT) / f'report-{i}.json'
    procs.append((subprocess.Popen(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={report}', TEST], cwd=CLONE,
                                   env={**os.environ, 'CI': '1', 'TMPDIR': tmp}, stdout=subprocess.DEVNULL, stderr=subprocess.DEVNULL, start_new_session=True), report))
runs = []
for proc, report in procs:
    code = proc.wait(timeout=600)
    data = json.loads(report.read_text()) if report.exists() else None
    runs.append({'exitCode': code, 'counts': {k: data[k] for k in ('numTotalTests', 'numPassedTests', 'numFailedTests')} if data else None,
                 'failed': [t['fullName'] for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed'] if data else None})
OUT.write_text(json.dumps({'tool': 'parallel_unmutated.py', 'toolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(), 'commit': head,
                           'testSha256': hashlib.sha256((CLONE / TEST).read_bytes()).hexdigest(), 'kernel': os.uname().release,
                           'statF': subprocess.run(['stat', '-f', '-c', '%T', TMPROOT], capture_output=True, text=True).stdout.strip(),
                           'dfT': subprocess.run(['df', '--output=fstype', TMPROOT], capture_output=True, text=True).stdout.split()[-1],
                           'atOnce': N, 'loadBefore': load_before, 'loadAfter': os.getloadavg(), 'runs': runs,
                           'allPassed43': all(r['exitCode'] == 0 and r['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0} for r in runs)}, indent=1) + '\n')
print(json.dumps({'atOnce': N, 'passed43': sum(r['exitCode'] == 0 and r['counts'] == {'numTotalTests': 43, 'numPassedTests': 43, 'numFailedTests': 0} for r in runs), 'loadBefore': load_before}))
