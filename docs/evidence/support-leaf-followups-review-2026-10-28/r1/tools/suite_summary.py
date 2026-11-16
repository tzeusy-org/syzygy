# Usage: suite_summary.py <vitest json> <commit> <dist> <load-start> <load-end> <out.json> [title ...]: counts, failures and the named titles' statuses.
import hashlib, json, sys
path, commit, dist, l0, l1, out, *titles = sys.argv[1:]
d = json.load(open(path))
files = d['testResults']
tests = {t['fullName']: t['status'] for f in files for t in f['assertionResults']}
s = {'commit': commit, 'dist': dist, 'load1Start': l0, 'load1End': l1, 'files': len(files), 'filesPassed': sum(f['status'] == 'passed' for f in files),
     'numTotalTests': d['numTotalTests'], 'numPassedTests': d['numPassedTests'], 'numFailedTests': d['numFailedTests'], 'numPendingTests': d['numPendingTests'],
     'success': d['success'], 'failedFiles': [f['name'] for f in files if f['status'] != 'passed'],
     'reportSha256': hashlib.sha256(open(path, 'rb').read()).hexdigest()}
if titles:
    s['titles'] = {t: tests.get(t, 'absent') for t in titles}
json.dump(s, open(out, 'w'), indent=1); print(json.dumps(s, indent=1))
