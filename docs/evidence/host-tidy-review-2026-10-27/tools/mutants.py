"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: the reviewer's own mutants against the subject, one at a time in a scratch clone of
the evidence commit, each restored afterwards (rule 6). Each mutant records its file, its `old` and `new` fragments, the
commit it ran at, and every check's command, exit code and verdict.
Usage: python3 -I mutants.py <mutant tree> <base tree> <surface.mjs> <tmpdir> <out.json> [mutant id]...
Checks:
  typecheck   `npx tsc -b <the root typecheck list>` (exit 0 = the mutant survives it);
  poc-alone   every dist removed, then `npx tsc -b apps/three-surface-poc`;
  vitest:F,F  `npx vitest run <files>` over the named projects' files (exit 0 = survives);
  npm-ci      `npm ci --ignore-scripts` (the lock and the manifests must agree);
  surface     surface.mjs at the base tree and the mutant tree, compared by the 7.15 key
              (name, value, type, declaredIn, declaredAs); equal = survives."""
import glob, json, os, shutil, subprocess, sys, time

tree, base_tree, surface_tool, tmpdir, out = sys.argv[1:6]
only = sys.argv[6:]
ROOT_LIST = ['packages/support', 'packages/cap1-core', 'packages/http-host', 'packages/cap1-daemon', 'packages/cap1-conformance',
             'packages/three-surface-poc-core', 'apps/syzygy', 'apps/three-surface-poc', 'packages/cap1-system',
             'packages/polaris-generation-core', 'packages/polaris-generation-consent', 'packages/polaris-dossier']
ENTRIES = ['packages/cap1-daemon/src/index.ts', 'packages/cap1-daemon/src/server.ts', 'packages/cap1-daemon/src/credentials.ts',
           'packages/cap1-daemon/src/routes-human.ts', 'packages/http-host/src/index.ts']
RETARGETED = ['evaluation-footer', 'main', 'materialize-action', 'page-size-delta', 'polaris-accessible-names.browser',
              'polaris-presentation-route', 'polaris-source-route', 'reobserve-action', 'response-limits', 'routes', 'surface-routes',
              'tuple-encoding', 'verbatim-route']
RETARGETED = [f'apps/three-surface-poc/src/{n}.test.ts' for n in RETARGETED]
MUTANTS = [
    ('M1-poc-source-imports-cap1-daemon', 'apps/three-surface-poc/src/routes.ts',
     "import { escapeHtml, type Route, type RouteResponse } from '@syzygy/http-host';\n",
     "import { type Route, type RouteResponse } from '@syzygy/http-host';\nimport { escapeHtml } from '@syzygy/cap1-daemon';\n",
     ['typecheck', 'poc-alone', 'vitest:' + ','.join(['apps/three-surface-poc/src/routes.test.ts', 'apps/three-surface-poc/src/surface-routes.test.ts'])]),
    ('M2-poc-banner-one-char', 'apps/three-surface-poc/src/poc-main.ts',
     "'Credential value is never printed. POC is local, experimental, and non-release.',",
     "'Credential value is never printed. POC is local, experimental, and non-release!',",
     ['vitest:apps/three-surface-poc/src/main.test.ts']),
    ('M3-host-refusal-status', 'packages/http-host/src/server.ts',
     'export const REFUSAL_STATUS = 401;', 'export const REFUSAL_STATUS = 403;',
     ['vitest:' + ','.join(RETARGETED)]),
    ('M4-host-type-unexported', 'packages/http-host/src/server.ts',
     'export interface RouteContext {', 'interface RouteContext {',
     ['typecheck', 'vitest:' + ','.join(['apps/three-surface-poc/src/reobserve-action.test.ts', 'apps/three-surface-poc/src/verbatim-route.test.ts'])]),
    ('M5-poc-tsconfig-drops-http-host-reference', 'apps/three-surface-poc/tsconfig.json',
     '    {\n      "path": "../../packages/http-host"\n    },\n', '',
     ['typecheck', 'poc-alone']),
    ('M6-lock-keeps-cap1-daemon-edge', 'package-lock.json',
     '      "dependencies": {\n        "@syzygy/http-host": "0.0.0",\n        "@syzygy/polaris-generation-consent": "0.0.0",',
     '      "dependencies": {\n        "@syzygy/cap1-daemon": "0.0.0",\n        "@syzygy/http-host": "0.0.0",\n        "@syzygy/polaris-generation-consent": "0.0.0",',
     ['npm-ci']),
    ('S1-shim-credential-binding-swapped', 'packages/cap1-daemon/src/credentials.ts',
     '  CREDENTIAL_FILE_MODE,\n', '  STATE_DIR_MODE as CREDENTIAL_FILE_MODE,\n', ['surface']),
    ('S2-shim-value-made-type-only', 'packages/cap1-daemon/src/server.ts',
     '  REFUSAL_BODY,\n', '  type REFUSAL_BODY,\n', ['surface', 'typecheck']),
    ('S3-host-option-type-widened', 'packages/http-host/src/server.ts',
     '  readonly port?: number | undefined;', '  readonly port?: number | string | undefined;', ['surface', 'typecheck']),
    ('S4-host-request-type-member-added', 'packages/http-host/src/server.ts',
     '  readonly query: URLSearchParams;\n', '  readonly query: URLSearchParams;\n  readonly remoteAddress?: string;\n',
     ['surface', 'typecheck', 'vitest:' + ','.join(RETARGETED)]),
]


def sh(args, cwd, timeout=3600):
    t0 = time.time()
    r = subprocess.run(args, cwd=cwd, capture_output=True, text=True, timeout=timeout, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'})
    return r, round(time.time() - t0, 1)


def git(*a):
    return subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout


def surface(t, outfile):
    sh(['node', surface_tool, t, outfile, *ENTRIES], cwd=t)
    e = json.load(open(outfile))['entries']
    return {k: sorted([r['name'], r['value'], r['type'], r['declaredIn'], r['declaredAs']] for r in v) for k, v in e.items()}


def run_check(check):
    if check == 'typecheck':
        r, s = sh(['npx', 'tsc', '-b', *ROOT_LIST], tree)
        return {'command': 'npx tsc -b <root typecheck list>', 'exit': r.returncode, 'seconds': s,
                'errors': [l for l in (r.stdout + r.stderr).splitlines() if 'error TS' in l][:4], 'survives': r.returncode == 0}
    if check == 'poc-alone':
        for d in glob.glob(os.path.join(tree, 'apps', '*', 'dist')) + glob.glob(os.path.join(tree, 'packages', '*', 'dist')):
            shutil.rmtree(d)
        r, s = sh(['npx', 'tsc', '-b', 'apps/three-surface-poc'], tree)
        return {'command': 'rm -rf */*/dist; npx tsc -b apps/three-surface-poc', 'exit': r.returncode, 'seconds': s,
                'errors': [l for l in (r.stdout + r.stderr).splitlines() if 'error TS' in l][:4], 'survives': r.returncode == 0}
    if check.startswith('vitest:'):
        files = check[len('vitest:'):].split(',')
        os.makedirs(tmpdir, exist_ok=True)
        rep = os.path.join(tmpdir, 'v.json')
        r, s = sh(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile.json={rep}'], tree)
        d = json.load(open(rep))
        failed = [a['fullName'][:160] for f in d['testResults'] for a in f['assertionResults'] if a['status'] == 'failed']
        return {'command': f'npx vitest run <{len(files)} files>', 'files': files, 'exit': r.returncode, 'seconds': s,
                'total': d['numTotalTests'], 'passed': d['numPassedTests'], 'failed': d['numFailedTests'], 'firstFailures': failed[:3],
                'survives': r.returncode == 0}
    if check == 'npm-ci':
        r, s = sh(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], tree)
        tail = [l for l in (r.stdout + r.stderr).splitlines() if l.strip()][-3:]
        return {'command': 'npm ci --ignore-scripts', 'exit': r.returncode, 'seconds': s, 'tail': tail, 'survives': r.returncode == 0}
    if check == 'surface':
        os.makedirs(tmpdir, exist_ok=True)
        a = surface(base_tree, os.path.join(tmpdir, 'sb.json'))
        b = surface(tree, os.path.join(tmpdir, 'sm.json'))
        changed = {k: [x for x in b[k] if x not in a[k]] for k in a if a[k] != b[k]}
        return {'command': 'surface.mjs base vs mutant, 7.15 key', 'surfaceEqual': a == b, 'changedRows': changed, 'survives': a == b}
    raise ValueError(check)


commit = git('rev-parse', 'HEAD').strip()
assert git('status', '--porcelain') == '', 'mutant tree not clean'
results = []
for mid, file, old, new, checks in MUTANTS:
    if only and mid not in only:
        continue
    path = os.path.join(tree, file)
    original = open(path, 'rb').read()
    text = original.decode()
    count = text.count(old)
    row = {'mutant': mid, 'file': file, 'old': old, 'new': new, 'commit': commit, 'oldCount': count, 'checks': {}}
    if count != 1:
        row['error'] = f'old occurs {count} times'
        results.append(row)
        continue
    try:
        open(path, 'w').write(text.replace(old, new))
        for c in checks:
            row['checks'][c.split(':')[0] if not c.startswith('vitest:') else 'vitest'] = run_check(c)
    finally:
        open(path, 'wb').write(original)
        if file == 'package-lock.json':
            sh(['npm', 'ci', '--ignore-scripts', '--no-audit', '--no-fund'], tree)
    row['killedBy'] = [k for k, v in row['checks'].items() if not v['survives']]
    row['cleanAfter'] = git('status', '--porcelain') == ''
    results.append(row)
    print(mid, '| killed by:', row['killedBy'] or 'NOTHING (survives)', '|',
          {k: (v.get('exit'), v.get('surfaceEqual'), v.get('failed'), (v.get('errors') or v.get('tail') or [''])[:1]) for k, v in row['checks'].items()}, flush=True)
    json.dump({'tree': tree, 'commit': commit, 'mutants': results}, open(out, 'w'), indent=1)
shutil.rmtree(tmpdir, ignore_errors=True)
json.dump({'tree': tree, 'commit': commit, 'mutants': results}, open(out, 'w'), indent=1)
