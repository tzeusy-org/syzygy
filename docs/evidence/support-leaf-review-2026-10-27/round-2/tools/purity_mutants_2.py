#!/usr/bin/env python3
"""Second batch of reviewer purity mutants; reuses purity_mutants.py's apply/restore/run. Usage: purity_mutants_2.py <clone> <out.json> <tmpdir>"""
import json
import os
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import purity_mutants as pm  # noqa: E402

PKG = 'packages/support/package.json'
EXPORTS_OLD = '      "default": "./dist/index.js"\n    }\n'
ROWS = [
    ('RP14-subpath-export-of-an-unscanned-subdirectory-module', pm.PURITY,
     [('packages/support/src/io/read.ts', None, "import { readFileSync } from 'node:fs';\nexport const read = (p: string): string => readFileSync(p, 'utf8');\n"),
      (PKG, EXPORTS_OLD, EXPORTS_OLD.rstrip('\n') + ',\n    "./io": { "types": "./dist/io/read.d.ts", "import": "./dist/io/read.js" }\n')], 'survives'),
    ('RP15-optional-call-fetch-at-import', pm.PURITY,
     [(pm.SHA, pm.HASH_IMPORT, pm.HASH_IMPORT + "void globalThis.fetch?.('http://127.0.0.1:65530/').catch(() => {});\n")], 'survives'),
    ('RP16-optional-chained-process-env-read', pm.PURITY,
     [(pm.SHA, pm.HASH_IMPORT, pm.HASH_IMPORT + "export const HOME = globalThis.process?.env['HOME'];\n")], 'survives'),
]


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    head = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    rows = []
    for rid, test, edits, expect in ROWS:
        undo = pm.apply(clone, edits)
        try:
            res = pm.run(clone, test, tmpdir)
        finally:
            pm.restore(undo)
        outcome = 'error' if 'error' in res else ('killed' if res['exit'] != 0 and res['failed'] > 0 else 'survives')
        rows.append({'id': rid, 'test': test, 'edits': [{'path': p, 'old': o, 'new': n} for p, o, n in edits], 'expected': expect, 'observed': outcome, **res})
        print(rid, 'expected', expect, 'observed', outcome, res.get('passed'), res.get('failed'), res.get('failedTests'), flush=True)
    status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
    json.dump({'clone': head, 'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('status after:', repr(status))


if __name__ == '__main__':
    main()
