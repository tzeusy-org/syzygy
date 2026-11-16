"""Run the clone's launched.test.ts (unmutated) N times, P at a time, each under its own TMPDIR beneath <tmp root>, with vitest's JSON
reporter; record each run's counts and failed tests. Usage: python3 -I repeat_head.py <clone> <tmp root> <n> <parallel> <out.json>"""
import concurrent.futures, hashlib, json, os, subprocess, sys
from pathlib import Path
root, tmproot, n, par, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2]), int(sys.argv[3]), int(sys.argv[4]), Path(sys.argv[5])
TEST = 'packages/polaris-dossier/src/launched.test.ts'
def one(i):
    tmp = tmproot / f'run-{i}'; tmp.mkdir(parents=True, exist_ok=True); rep = tmproot / f'report-{i}.json'
    r = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', '--reporter=json', f'--outputFile={rep}', TEST], cwd=root,
                       env={**os.environ, 'CI': '1', 'TMPDIR': str(tmp)}, capture_output=True, text=True, timeout=600)
    d = json.loads(rep.read_text())
    failed = [t['fullName'] for f in d['testResults'] for t in f['assertionResults'] if t['status'] != 'passed']
    left = sorted(os.listdir(tmp))
    return {'run': i, 'exit': r.returncode, 'total': d['numTotalTests'], 'passed': d['numPassedTests'], 'failed': failed, 'tmpdirLeftovers': len(left)}
with concurrent.futures.ThreadPoolExecutor(par) as ex:
    results = list(ex.map(one, range(n)))
summary = {'testSha256': hashlib.sha256((root / TEST).read_bytes()).hexdigest(), 'head': subprocess.run(['git', '-C', str(root), 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
           'tmpRoot': str(tmproot), 'filesystem': subprocess.run(['stat', '-f', '-c', '%T', str(tmproot)], capture_output=True, text=True).stdout.strip(),
           'runs': n, 'parallel': par, 'allPassed43': all(x['exit'] == 0 and x['total'] == 43 == x['passed'] for x in results),
           'loadavgAtEnd': os.getloadavg(), 'results': results}
out.write_text(json.dumps(summary, indent=1) + '\n')
print({k: v for k, v in summary.items() if k != 'results'})
