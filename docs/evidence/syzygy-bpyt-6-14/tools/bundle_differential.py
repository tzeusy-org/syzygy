#!/usr/bin/env python3
"""N10: the S10 bundle under the derived alias map and the guard, against the bundle under the hand-written map it replaces.

Usage: bundle_differential.py <out.json> <tmpdir> <clone>...

In each clone, one edit to packages/polaris-dossier/src/no-egress.test.ts copies the driver bundle to <tmpdir>/bundle-<n>.mjs
before afterAll removes it; the file is run once and the edit restored. Records each bundle's commit, dist/ state, size and
sha256, whether all are byte-identical, and the vitest counts of each run. esbuild writes source paths relative to the clone,
so the bundles of two clones are comparable byte for byte.
"""
import difflib
import hashlib
import json
import os
import subprocess
import sys

TEST = 'packages/polaris-dossier/src/no-egress.test.ts'
OLD = "afterAll(() => { if (dir !== undefined) fs.rmSync(dir, { recursive: true, force: true }); });\n"
NEW = "afterAll(() => { fs.copyFileSync(bundle, process.env['BUNDLE_COPY']!); if (dir !== undefined) fs.rmSync(dir, { recursive: true, force: true }); });\n"


def main():
    out_path, tmpdir, *clones = sys.argv[1:]
    os.makedirs(tmpdir, exist_ok=True)
    runs = []
    for n, clone in enumerate(clones):
        commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
        dist = sorted(f'{p}/{d}' for p in ['apps', 'packages'] for d in os.listdir(os.path.join(clone, p)) if os.path.isdir(os.path.join(clone, p, d, 'dist')))
        path = os.path.join(clone, TEST)
        text = open(path).read()
        assert text.count(OLD) == 1
        copy = os.path.join(tmpdir, f'bundle-{n}.mjs')
        report = os.path.join(tmpdir, f'vitest-{n}.json')
        open(path, 'w').write(text.replace(OLD, NEW))
        try:
            proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={report}'], cwd=clone,
                                  env=dict(os.environ, TMPDIR=tmpdir, BUNDLE_COPY=copy), capture_output=True, text=True, timeout=900)
        finally:
            open(path, 'w').write(text)
        d = json.load(open(report))
        data = open(copy, 'rb').read()
        runs.append({'clone': clone, 'commit': commit, 'distDirs': len(dist), 'exit': proc.returncode, 'passed': d['numPassedTests'],
                     'failed': d['numFailedTests'], 'pending': d['numPendingTests'], 'bytes': len(data),
                     'sha256': hashlib.sha256(data).hexdigest(), 'copy': copy,
                     'statusAfter': subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout})
    identical = len({run['sha256'] for run in runs}) == 1
    diff = [] if identical else list(difflib.unified_diff(open(runs[0]['copy']).read().splitlines(), open(runs[1]['copy']).read().splitlines(), lineterm='', n=0))[:80]
    json.dump({'runs': runs, 'identical': identical, 'diffHead': diff}, open(out_path, 'w'), indent=1)
    print(json.dumps({'identical': identical, 'runs': [{k: r[k] for k in ['commit', 'distDirs', 'exit', 'passed', 'failed', 'bytes', 'sha256']} for r in runs]}, indent=1))


if __name__ == '__main__':
    main()
