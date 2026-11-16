#!/usr/bin/env python3
"""rev-535's own mutants against the predicates PR 535 pins (rule 6), written as specs.

Usage: python3 -I rev535_specs.py <vitest-specs.json> <tsc-specs.json>

Vitest specs run under tools/rev535_mut.py over the PR 529 reviewer's HOST file list (copied
literally from docs/evidence/http-host-review-2026-10-27/tools/mutants.py, so the population matches
theirs). tsc specs run under the lane's tsc_mutants.py input form ({"mutants": [{"id", "edits"}]}).
None of these fragments is one the lane's own_specs.py or the reviewer's mutants.py writes.
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
GATE = POC + 'git-observation.ts'
SHIM_S = 'packages/cap1-daemon/src/server.ts'

BEARER = "  const match = /^Bearer (.+)$/.exec(header);"
WITHIN = "  return candidate === root || candidate.startsWith(root + path.sep);"
ORIGIN_CHECK = "  return origin === undefined || origin === expectedOrigin(host);"
HOST_CHECK = "    (/^(?:127\\.0\\.0\\.1|localhost):[0-9]+$/.test(host) || host === TAILNET_HOST);"
GATE_PREFIX = "    'packages/http-host/',\n"
ROOT_ROUTE = "// --- This wave's minimal root route"

VITEST = [
    ('CONTROL', []),
    # Bearer admission (R3's predicate)
    ('V1-token-compare-not-constant-time', [(CRED, "  return timingSafeEqual(a, b);", "  return presented === expected;")]),
    ('V2-bearer-leading-whitespace-admitted', [(CRED, BEARER, "  const match = /^\\s*Bearer (.+)$/.exec(header);")]),
    ('V3-bearer-token-first-non-space-run', [(CRED, BEARER, "  const match = /^Bearer (\\S+)/.exec(header);")]),
    # State-write containment (R19's predicate)
    ('V4-containment-case-insensitive', [(CRED, WITHIN,
        "  return candidate.toLowerCase() === root.toLowerCase() || candidate.toLowerCase().startsWith(root.toLowerCase() + path.sep);")]),
    ('V5-lexical-check-before-normalising', [(CRED, "  if (!isWithin(root, resolved)) {",
        "  if (!isWithin(root, root + path.sep + candidatePath)) {")]),
    # Browser origin (R18's predicate)
    ('V6-origin-suffix-match', [(ORIGIN, ORIGIN_CHECK, "  return origin === undefined || origin.endsWith(expectedOrigin(host));")]),
    ('V7-origin-compared-case-insensitively', [(ORIGIN, ORIGIN_CHECK,
        "  return origin === undefined || origin.toLowerCase() === expectedOrigin(host).toLowerCase();")]),
    ('V8-host-lower-cased-before-check', [(ORIGIN, HOST_CHECK,
        "    (/^(?:127\\.0\\.0\\.1|localhost):[0-9]+$/.test(host.toLowerCase()) || host.toLowerCase() === TAILNET_HOST);")]),
    # Content-blind breach log (R8's predicate)
    ('V9-withheld-diagnostic-leaks-one-reason-character', [(SERVER, "    ...(diagnostic === undefined ? {} : diagnostic),",
        "    ...(diagnostic === undefined ? (input.response.diagnostic?.population.kind === 'unknown' ? "
        "{ hint: input.response.diagnostic.population.reason.slice(-1) } : {}) : diagnostic),")]),
    ('V10-listed-reason-matched-case-insensitively', [(SERVER,
        "['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed'].includes(population.reason)",
        "['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed'].includes(population.reason.toLowerCase())")]),
    # Observer-input gate (R17's predicate)
    ('V11-gate-prefix-without-trailing-slash', [(GATE, GATE_PREFIX, "    'packages/http-host',\n")]),
    ('V12-gate-prefix-src-and-manifest-only', [(GATE, GATE_PREFIX,
        "    'packages/http-host/src/',\n    'packages/http-host/package.json',\n")]),
    # Shim binding (R13's predicate): an object-valued local copy, the case O17 does not cover
    ('V13-shim-local-copy-of-object-export', [
        (SHIM_S, "  REFUSAL_BODY,\n", ""),
        (SHIM_S, ROOT_ROUTE, "export const REFUSAL_BODY = { admitted: false, served: 'nothing' } as const;\n\n" + ROOT_ROUTE)]),
]

TSC = [
    # A local type structurally equal to the host's: the type-level analogue of O17.
    ('TT1-local-equal-type', [
        (SHIM_S, "  type CredentialClass,\n", ""),
        (SHIM_S, ROOT_ROUTE, "export type CredentialClass = 'human-open' | 'machine-credentialed';\n\n" + ROOT_ROUTE)]),
    # A local type wider than the host's.
    ('TT2-local-wider-type', [
        (SHIM_S, "  type CredentialClass,\n", ""),
        (SHIM_S, ROOT_ROUTE, "export type CredentialClass = string;\n\n" + ROOT_ROUTE)]),
]


def edits(items):
    return [{'file': f, 'old': o, 'new': n} for f, o, n in items]


vitest_out, tsc_out = sys.argv[1:3]
json.dump({'files': HOST, 'mutants': [{'id': i, 'edits': edits(e)} for i, e in VITEST]}, open(vitest_out, 'w'), indent=1)
json.dump({'mutants': [{'id': i, 'edits': edits(e)} for i, e in TSC]}, open(tsc_out, 'w'), indent=1)
print(len(VITEST), 'vitest specs', len(TSC), 'tsc specs')
