#!/usr/bin/env python3
"""S10 bundle bytes at several clones (R-GP-IMPL-SUPPORT-LEAF-GUARDS-1).

Usage: bundle_diff.py <out.json> <tmpdir> <label>=<clone> ...

In each clone, one edit to no-egress.test.ts makes afterAll copy the driver bundle to <tmpdir>/<label>.mjs before it removes
the directory; the file is run once with vitest and the edit restored. Records each bundle's commit, dist/ count, size,
sha256, the vitest counts, and the module paths esbuild's `// <path>` region comments name, so the inputs can be compared
with the paths another commit changed.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

TEST = 'packages/polaris-dossier/src/no-egress.test.ts'
OLD = "afterAll(() => { if (dir !== undefined) fs.rmSync(dir, { recursive: true, force: true }); });\n"
NEW = "afterAll(() => { fs.copyFileSync(bundle, process.env['BUNDLE_COPY']!); if (dir !== undefined) fs.rmSync(dir, { recursive: true, force: true }); });\n"


def main():
    out_path, tmpdir, *pairs = sys.argv[1:]
    os.makedirs(tmpdir, exist_ok=True)
    runs = []
    for pair in pairs:
        label, clone = pair.split('=', 1)
        git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, text=True, check=True).stdout
        assert git('status', '--porcelain') == '', (label, 'clone must start clean')
        dist = sorted(f'{p}/{d}' for p in ['apps', 'packages'] for d in os.listdir(os.path.join(clone, p))
                      if os.path.isdir(os.path.join(clone, p, d, 'dist')))
        path = os.path.join(clone, TEST)
        text = open(path).read()
        assert text.count(OLD) == 1, label
        copy = os.path.join(tmpdir, f'{label}.mjs')
        report = os.path.join(tmpdir, f'{label}.vitest.json')
        load = open('/proc/loadavg').read().split()[:3]
        open(path, 'w').write(text.replace(OLD, NEW))
        try:
            proc = subprocess.run(['npx', 'vitest', 'run', TEST, '--reporter=json', f'--outputFile={report}'], cwd=clone,
                                  env=dict(os.environ, TMPDIR=tmpdir, BUNDLE_COPY=copy), capture_output=True, text=True, timeout=900)
        finally:
            open(path, 'w').write(text)
        d = json.load(open(report))
        data = open(copy, 'rb').read()
        inputs = sorted(set(re.findall(r'^// ((?:packages|apps)/[^\s]+\.ts)$', data.decode('utf8'), re.M)))
        runs.append({'label': label, 'commit': git('rev-parse', 'HEAD').strip(), 'distDirs': len(dist), 'loadavg': load,
                     'exit': proc.returncode, 'passed': d['numPassedTests'], 'failed': d['numFailedTests'],
                     'pending': d['numPendingTests'], 'bytes': len(data), 'sha256': hashlib.sha256(data).hexdigest(),
                     'workspaceInputs': len(inputs), 'inputs': inputs, 'statusAfter': git('status', '--porcelain')})
        os.remove(copy)
        print(label, runs[-1]['commit'][:8], 'dist', len(dist), 'exit', proc.returncode, 'passed', d['numPassedTests'], 'failed',
              d['numFailedTests'], 'bytes', len(data), runs[-1]['sha256'], 'inputs', len(inputs), flush=True)
    json.dump({'runs': runs, 'distinctSha256': sorted({r['sha256'] for r in runs}),
               'sameInputs': len({tuple(r['inputs']) for r in runs}) == 1}, open(out_path, 'w'), indent=1)


if __name__ == '__main__':
    main()
