#!/usr/bin/env python3
"""rev-529: the surviving mutants re-run at BASE (cap1-daemon paths), to show whether each gap predates PR 529.

Usage: python3 -I mutants.py <tree> <out.json> [id ...]
Each mutant replaces exactly one occurrence of `old` with `new` in `file` (asserted),
runs `npx vitest run <files>` (JSON reporter) in <tree>, restores the original bytes and
asserts `git status --porcelain` is empty. Outcome: killed iff exit != 0 and >= 1 failed test;
survived iff exit == 0 and 0 failed; anything else is 'error'.
"""
import json
import os
import subprocess
import sys
import tempfile

tree, out = sys.argv[1:3]
only = set(sys.argv[3:])

POC = 'apps/three-surface-poc/src/'
HOST = [
    'packages/cap1-daemon/src/credentials.test.ts',
    'packages/cap1-daemon/src/', 'packages/cap1-conformance/src/',
    POC + 'routes.test.ts', POC + 'response-limits.test.ts', POC + 'main.test.ts', POC + 'surface-routes.test.ts',
    POC + 'reobserve-action.test.ts', POC + 'materialize-action.test.ts', POC + 'browser-origin.test.ts',
    POC + 'git-observation.test.ts', POC + 'verbatim-route.test.ts', POC + 'polaris-source-route.test.ts',
    POC + 'polaris-presentation-route.test.ts', POC + 'evaluation-footer.test.ts', POC + 'page-size-delta.test.ts',
    POC + 'tuple-encoding.test.ts',
]
CRED = 'packages/cap1-daemon/src/credentials.ts'
SERVER = 'packages/cap1-daemon/src/server.ts'
SHUT = 'packages/http-host/src/shutdown.ts'
ESC = 'packages/http-host/src/escape-html.ts'
SHIM_S = 'packages/cap1-daemon/src/server.ts'
SHIM_C = 'packages/cap1-daemon/src/credentials.ts'
GATE = POC + 'git-observation.ts'

MUTANTS = [
    ('R1-hash-compares-presented-to-itself', CRED,
     "  const b = createHash('sha256').update(expected, 'utf8').digest();",
     "  const b = createHash('sha256').update(presented, 'utf8').digest();", HOST),
    ('R2-bearer-scheme-case-insensitive', CRED,
     "  const match = /^Bearer (.+)$/.exec(header);",
     "  const match = /^Bearer (.+)$/i.exec(header);", HOST),
    ('R3-bearer-token-whitespace-trimmed', CRED,
     "  const match = /^Bearer (.+)$/.exec(header);",
     "  const match = /^Bearer\\s+(.+?)\\s*$/.exec(header);", HOST),
    ('R4-loopback-address-admits', SERVER,
     "      const result = verifyCredential(expectedToken, credential);",
     "      const result = req.socket.remoteAddress === '127.0.0.1' ? { admitted: true as const, clientClass: 'machine' as const } : verifyCredential(expectedToken, credential);",
     HOST),
    ('R5-machine-get-routes-treated-as-human-open', SERVER,
     "    if (route.credentialClass === 'machine-credentialed') {",
     "    if (route.credentialClass === 'machine-credentialed' && route.method !== 'GET') {", HOST),
    ('R6-handler-invoked-before-admission', SERVER,
     "    let admission: Extract<AdmissionResult, { admitted: true }> | undefined;\n",
     "    let admission: Extract<AdmissionResult, { admitted: true }> | undefined;\n"
     "    await route.handle({ request: { method, path: url.pathname, query: url.searchParams, headers: req.headers }, admission: undefined });\n",
     HOST),
    ('R7-breach-line-loses-its-reason', SERVER,
     "    reason: diagnostic === undefined ? input.reason : 'response-limit-breached',",
     "    reason: input.reason,", HOST),
    ('R8-not-admitted-population-dropped', SERVER,
     "['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed']",
     "['project shape not-evaluated', 'project shape observation-failed']", HOST),
    ('R9-304-logged-as-non-success', SERVER,
     "  if (input.response.status < 300 || input.response.status === 304 || input.response.status > 599) return;",
     "  if (input.response.status < 300 || input.response.status > 599) return;", HOST),
    ('R10-daemon-binds-all-interfaces', SERVER,
     "export const DAEMON_HOST = '127.0.0.1' as const;",
     "export const DAEMON_HOST = '0.0.0.0' as const;", HOST),
    ('R11-clean-close-never-resolves', SHUT,
     "      void daemon.close().then(resolve, (cause: unknown) => {",
     "      void daemon.close().then(() => undefined, (cause: unknown) => {", HOST),
    ('R12-poc-sigterm-registered-as-sigint', POC + 'poc-main.ts',
     "      onSignal: (signal, listener) => { io.onSignal(signal, listener); },",
     "      onSignal: (_signal, listener) => { io.onSignal('SIGINT', listener); },", HOST),
    ('R13-shim-unknown-route-status-swapped', SHIM_S,
     "  UNKNOWN_ROUTE_REASON,\n  UNKNOWN_ROUTE_STATUS,\n",
     "  UNKNOWN_ROUTE_REASON,\n  HANDLER_FAILURE_STATUS as UNKNOWN_ROUTE_STATUS,\n", HOST),
    ('R14-credentials-shim-drops-a-type', SHIM_C,
     "  type StateWriteRefusalName,\n", "", HOST),
    ('R15-escape-ampersand-last', ESC,
     "    .replace(/&/g, '&amp;')\n    .replace(/</g, '&lt;')\n",
     "    .replace(/</g, '&lt;')\n    .replace(/&/g, '&amp;')\n", HOST),
    ('R16-gate-host-prefix-removed', GATE,
     "    'packages/http-host/',\n", "", [POC + 'git-observation.test.ts', POC + 'main.test.ts']),
    ('R17-gate-host-prefix-narrowed-to-src', GATE,
     "    'packages/http-host/',\n", "    'packages/http-host/src/',\n", [POC + 'git-observation.test.ts', POC + 'main.test.ts']),
    ('R18-origin-prefix-match', POC + 'browser-origin.ts',
     "  return origin === undefined || origin === expectedOrigin(host);",
     "  return origin === undefined || origin.startsWith(expectedOrigin(host));", HOST),
]


def git_clean():
    return subprocess.run(['git', '-C', tree, 'status', '--porcelain'], capture_output=True, text=True).stdout == ''


results = []
head = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
assert git_clean(), 'tree not clean'
for mid, rel, old, new, files in MUTANTS:
    if only and mid not in only:
        continue
    path = os.path.join(tree, rel)
    original = open(path, 'rb').read()
    text = original.decode()
    count = text.count(old)
    if count != 1:
        results.append({'id': mid, 'file': rel, 'old': old, 'new': new, 'outcome': 'error', 'why': f'old occurs {count} times'})
        continue
    fd, report = tempfile.mkstemp(suffix='.json')
    os.close(fd)
    try:
        open(path, 'w').write(text.replace(old, new, 1))
        run = subprocess.run(['npx', 'vitest', 'run', *files, '--reporter=json', f'--outputFile={report}'],
                             cwd=tree, capture_output=True, text=True, timeout=1800)
    finally:
        open(path, 'wb').write(original)
    clean = git_clean()
    failed, total, titles = None, None, []
    try:
        rep = json.load(open(report))
        failed, total = rep['numFailedTests'], rep['numTotalTests']
        for r in rep['testResults']:
            for a in r['assertionResults']:
                if a['status'] == 'failed':
                    titles.append(r['name'].split(tree.rstrip('/') + '/')[-1] + ' > ' + a['fullName'])
            if r['status'] == 'failed' and not r['assertionResults']:
                titles.append(r['name'].split(tree.rstrip('/') + '/')[-1] + ' > (file failed: ' + r.get('message', '')[:160] + ')')
        failed_files = sum(1 for r in rep['testResults'] if r['status'] == 'failed')
    except Exception as exc:  # noqa: BLE001
        failed_files = None
        titles.append(f'no report: {exc}; stderr tail: {run.stderr[-400:]}')
    os.unlink(report)
    if run.returncode != 0 and ((failed or 0) > 0 or (failed_files or 0) > 0):
        outcome = 'killed'
    elif run.returncode == 0 and failed == 0:
        outcome = 'survived'
    else:
        outcome = 'error'
    results.append({'id': mid, 'file': rel, 'old': old, 'new': new, 'commit': head, 'files': files, 'exit': run.returncode,
                    'failedTests': failed, 'failedFiles': failed_files, 'totalTests': total, 'outcome': outcome,
                    'cleanAfter': clean, 'failedTitles': titles[:6]})
    print(f'{mid}: {outcome} exit={run.returncode} failed={failed}/{total} files={failed_files} clean={clean}', flush=True)
    assert clean, 'tree dirty after restore'

json.dump({'commit': head, 'mutants': results}, open(out, 'w'), indent=1)
print('killed', sum(r['outcome'] == 'killed' for r in results), 'survived', sum(r['outcome'] == 'survived' for r in results),
      'error', sum(r['outcome'] == 'error' for r in results), 'of', len(results))
