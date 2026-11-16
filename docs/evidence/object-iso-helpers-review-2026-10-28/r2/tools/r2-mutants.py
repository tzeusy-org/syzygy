#!/usr/bin/env python3
"""Round-2 reviewer mutants for PR #548 (R-GP-IMPL-OBJECT-ISO-HELPERS-2): N3's row and #545's allow-list.
Usage: r2-mutants.py <clean repo at the reviewed commit> <out.json> <tmpdir>
Each row applies its edits (each `old` must occur exactly once; `old` None creates the file), runs vitest on its test files with
the JSON reporter, stores every failing test title and the first 600 characters of each failure message, then restores the files
and checks the tree is clean again. One vitest at a time; /proc/loadavg is stored per row."""
import json, os, subprocess, sys

repo, out, tmp = sys.argv[1:]
os.makedirs(tmp, exist_ok=True)
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == '', 'repository not clean'
commit = git('rev-parse', 'HEAD').strip()

SR = 'packages/polaris-generation-core/src/secret-redaction.ts'
SRT = ['packages/polaris-generation-core/src/secret-redaction.test.ts']
PUR = 'packages/support/src/support-purity.test.ts'
PURT = [PUR]
SHA = 'packages/support/src/sha256.ts'
IMP = "import { createHash } from 'node:crypto';\n"
O8 = ('if (!isRecord(red)) return refuse(\'is not an object\');', "if (!isRecord(red) && typeof red !== 'function') return refuse('is not an object');")
FROW = "    ['a function that carries every field', () => Object.assign(() => 1, validRedaction())],\n"

ROWS = [
    ('N3-control-head', SRT, []),
    ('N3-O8-at-head', SRT, [(SR, *O8)]),
    ('N3-O8-without-the-function-row', SRT, [(SR, *O8), (SRT[0], FROW, '')]),
    ('AL-control-head', PURT, []),
]
for name in ['Array', 'Readonly', 'Record', 'isArray', 'isRecord']:
    ROWS.append((f'AL-remove-{name}', PURT, [(PUR, f"'{name}', ", '')]))
# #545's review pins that name a global or a loader, replayed with the five names added (fragments from
# docs/evidence/support-leaf-guards-review-2026-10-28/r1/*-present.json, as recorded there)
PINS = {
    'RP2-globalThis-bracket-read-of-process-env': "export const HOME = (globalThis as Record<string, any>)['process']['env']['HOME'];\n",
    'RP5-WebSocket': "export const open = (url: string): WebSocket => new WebSocket(url);\n",
    'RP7-performance-now': "export const started = performance.now();\n",
    'RP16-optional-chained-process-env-read': "export const HOME = globalThis.process?.env['HOME'];\n",
    'Y1-reflect-get-globalThis-env': "export const HOME = Reflect.get(globalThis, 'process').env.HOME;\n",
    'Y2-eval-under-an-allowed-name': "const value = eval;\nexport { value };\n",
    'Y4-new-Function': "export const value = new Function('return 1');\n",
    'Y13-import-meta': "export const value = import.meta.dirname;\n",
}
for pid, line in PINS.items():
    ROWS.append((f'PIN-{pid}', PURT, [(SHA, IMP, IMP + line)]))
# own: reach the Function constructor through the newly allowed Array, and a Record-typed global read
ROWS.append(('OWN-Array-constructor-chain', PURT, [(SHA, IMP, IMP + "export const F = Array.isArray.constructor('return 1');\n")]))
ROWS.append(('OWN-Array-from-globalThis', PURT, [(SHA, IMP, IMP + "export const G = Array.from([globalThis]);\n")]))
ROWS.append(('OWN-Record-typed-only', PURT, [(SHA, IMP, IMP + "export type R = Readonly<Record<string, unknown>>;\nexport const value = Array.isArray([]);\n")]))

results = []
for rid, tests, edits in ROWS:
    saved = {}
    try:
        for path, old, new in edits:
            p = os.path.join(repo, path)
            if path not in saved:
                saved[path] = open(p, encoding='utf8').read() if os.path.exists(p) else None
            text = open(p, encoding='utf8').read()
            n = text.count(old)
            if n != 1:
                raise SystemExit(f'{rid}: {old!r} occurs {n} times in {path}')
            open(p, 'w', encoding='utf8').write(text.replace(old, new))
        load = open('/proc/loadavg').read().strip()
        jf = os.path.join(tmp, f'{rid}.json')
        r = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={jf}', *tests], cwd=repo, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmp})
        j = json.load(open(jf))
        failed = []
        for f in j['testResults']:
            for a in f['assertionResults']:
                if a['status'] == 'failed':
                    failed.append({'title': a['fullName'], 'message': (a['failureMessages'] or [''])[0][:600]})
        results.append({'id': rid, 'ranAt': commit, 'tests': tests, 'edits': [{'path': p, 'old': o, 'new': n} for p, o, n in edits], 'loadavg': load,
                        'exit': r.returncode, 'passed': j['numPassedTests'], 'failed': j['numFailedTests'], 'total': j['numTotalTests'], 'failedTests': failed})
        print(rid, 'exit', r.returncode, f"{j['numFailedTests']}/{j['numTotalTests']} failed", '|', '; '.join(x['title'] for x in failed)[:300], flush=True)
    finally:
        for path, text in saved.items():
            p = os.path.join(repo, path)
            if text is None:
                os.remove(p)
            else:
                open(p, 'w', encoding='utf8').write(text)
    assert git('status', '--porcelain') == '', f'{rid}: tree not restored'
json.dump(results, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
