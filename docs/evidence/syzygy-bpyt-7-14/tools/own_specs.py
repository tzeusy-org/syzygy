#!/usr/bin/env python3
"""The lane's own mutants for syzygy-bpyt.7.14 (rule 6), written as specs.

Usage: python3 -I own_specs.py <vitest-specs.json> <tsc-specs.json>

The vitest specs are in the input form of PR 524's reviewer runner
(docs/evidence/argv-guards-review-2026-10-25/tools/mut.py). Each one varies
a predicate that a new row pins, in a way the PR 529 reviewer's R3, R8, R13,
R18 and R19 do not. The run uses the PR 529 reviewer's file list (HOST in
docs/evidence/http-host-review-2026-10-27/tools/mutants.py), so its
population matches theirs.

The tsc specs are for tsc_mutants.py. Each one drops or swaps one type that
a cap1-daemon shim re-exports from @syzygy/http-host. A type has no runtime
binding, so only the compiler can kill these mutants.
"""
import json
import sys

POC = 'apps/three-surface-poc/src/'
HOST = [
    'packages/http-host/src/credentials.test.ts', 'packages/http-host/src/shutdown.test.ts',
    'packages/http-host/src/package.test.ts', 'packages/cap1-daemon/src/', 'packages/cap1-conformance/src/',
    POC + 'routes.test.ts', POC + 'response-limits.test.ts', POC + 'main.test.ts', POC + 'surface-routes.test.ts',
    POC + 'reobserve-action.test.ts', POC + 'materialize-action.test.ts', POC + 'browser-origin.test.ts',
    POC + 'git-observation.test.ts', POC + 'verbatim-route.test.ts', POC + 'polaris-source-route.test.ts',
    POC + 'polaris-presentation-route.test.ts', POC + 'evaluation-footer.test.ts', POC + 'page-size-delta.test.ts',
    POC + 'tuple-encoding.test.ts',
]
CRED = 'packages/http-host/src/credentials.ts'
SERVER = 'packages/http-host/src/server.ts'
ORIGIN = POC + 'browser-origin.ts'
SHIM_S = 'packages/cap1-daemon/src/server.ts'
SHIM_C = 'packages/cap1-daemon/src/credentials.ts'

BEARER = "  const match = /^Bearer (.+)$/.exec(header);"
LISTED = "['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed']"
ORIGIN_CHECK = "  return origin === undefined || origin === expectedOrigin(host);"

# (id, the row expected to kill it, edits)
VITEST = [
    ('O1-bearer-separator-space-run', 'R3', [(CRED, BEARER, "  const match = /^Bearer +(.+)$/.exec(header);")]),
    ('O2-bearer-separator-any-whitespace', 'R3', [(CRED, BEARER, "  const match = /^Bearer\\s(.+)$/.exec(header);")]),
    ('O3-bearer-trailing-whitespace-trimmed', 'R3', [(CRED, BEARER, "  const match = /^Bearer (.+?)\\s*$/.exec(header);")]),
    ('O4-bearer-end-matches-before-newline', 'R3', [(CRED, BEARER, "  const match = /^Bearer (.+)$/m.exec(header);")]),
    ('O5-presented-token-trimmed-before-compare', 'R3', [(CRED,
        "  const a = createHash('sha256').update(presented, 'utf8').digest();",
        "  const a = createHash('sha256').update(presented.trim(), 'utf8').digest();")]),
    ('O6-lexical-containment-without-separator', 'R19', [(CRED,
        "  if (!isWithin(root, resolved)) {",
        "  if (!resolved.startsWith(root)) {")]),
    ('O7-real-containment-without-separator', 'R19', [(CRED,
        "  if (!isWithin(realRoot, realTarget) || realTarget === realRoot) {",
        "  if (!realTarget.startsWith(realRoot) || realTarget === realRoot) {")]),
    ('O8-not-evaluated-population-dropped', 'R8', [(SERVER, LISTED,
        "['project shape not-admitted', 'project shape observation-failed']")]),
    ('O9-observation-failed-population-dropped', 'R8', [(SERVER, LISTED,
        "['project shape not-evaluated', 'project shape not-admitted']")]),
    ('O10-any-project-shape-reason-logged', 'R8', [(SERVER,
        f"population.kind === 'unknown' && {LISTED}.includes(population.reason)",
        "population.kind === 'unknown' && population.reason.startsWith('project shape ')")]),
    ('O11-breach-reason-keyed-by-status', 'R8', [(SERVER,
        "    reason: diagnostic === undefined ? input.reason : 'response-limit-breached',",
        "    reason: input.response.status === 503 ? 'response-limit-breached' : input.reason,")]),
    ('O12-origin-reversed-prefix', 'R18', [(ORIGIN, ORIGIN_CHECK,
        "  return origin === undefined || expectedOrigin(host).startsWith(origin);")]),
    ('O13-origin-required', 'R18', [(ORIGIN, ORIGIN_CHECK, "  return origin === expectedOrigin(host);")]),
    ('O14-tailnet-origin-over-http', 'R18', [(ORIGIN,
        "  return host === TAILNET_HOST ? `https://${host}` : `http://${host}`;",
        "  return `http://${host}`;")]),
    ('O15-shim-function-aliased', 'R13', [(SHIM_C, "  authorizeStateWrite,\n", "  ensureCredential as authorizeStateWrite,\n")]),
    ('O16-shim-constant-aliased', 'R13', [(SHIM_C, "  STATE_DIR_MODE,\n", "  CREDENTIAL_FILE_MODE as STATE_DIR_MODE,\n")]),
    # A named residual: a local constant equal to the host's is the same value, so `toBe` cannot tell it apart.
    ('O17-shim-equal-local-constant', 'residual', [
        (SHIM_S, "  DAEMON_HOST,\n", ""),
        (SHIM_S, "// --- This wave's minimal root route",
         "export const DAEMON_HOST = '127.0.0.1' as const;\n\n// --- This wave's minimal root route"),
    ]),
]

SHIM_TYPES = [
    (SHIM_C, 'CredentialInspection'), (SHIM_C, 'CredentialProvision'), (SHIM_C, 'CredentialStat'),
    (SHIM_C, 'StateWriteAuthorization'), (SHIM_C, 'StateWriteRefusalName'),
    (SHIM_S, 'CredentialClass'), (SHIM_S, 'DaemonOptions'), (SHIM_S, 'DaemonStart'), (SHIM_S, 'Route'),
    (SHIM_S, 'RouteContext'), (SHIM_S, 'RouteRequest'), (SHIM_S, 'RouteResponse'), (SHIM_S, 'RunningDaemon'),
]
TSC = [(f'T-drop-{name}', [(file, f"  type {name},\n", "")]) for file, name in SHIM_TYPES] + [
    ('T-swap-RouteContext', [(SHIM_S, "  type RouteContext,\n", "  type RouteRequest as RouteContext,\n")]),
    ('T-swap-CredentialStat', [(SHIM_C, "  type CredentialStat,\n", "  type CredentialInspection as CredentialStat,\n")]),
]


def edits(items):
    return [{'file': file, 'old': old, 'new': new} for file, old, new in items]


vitest_out, tsc_out = sys.argv[1:3]
json.dump({'mutants': [{'id': mid, 'row': row, 'edits': edits(items), 'projects': [], 'files': HOST}
                       for mid, row, items in VITEST]}, open(vitest_out, 'w'), indent=1)
json.dump({'mutants': [{'id': mid, 'edits': edits(items)} for mid, items in TSC]}, open(tsc_out, 'w'), indent=1)
print(len(VITEST), 'vitest specs', len(TSC), 'tsc specs')
