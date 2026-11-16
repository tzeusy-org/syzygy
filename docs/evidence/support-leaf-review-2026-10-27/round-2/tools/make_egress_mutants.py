#!/usr/bin/env python3
"""Write the reviewer's S10 mutant list (support-package sources with I/O of different kinds). Usage: make_egress_mutants.py <out.json> <e5 dir>"""
import json
import sys

out, e5dir = sys.argv[1], sys.argv[2]
SHA_IMPORT = "import { createHash } from 'node:crypto';\n"
SHA_FN = "export function sha256(value: string | Uint8Array): string {\n  return createHash('sha256').update(value).digest('hex');\n"
DF_HEAD = "/**\n * Freezes the value"
DF_FN = "export function deepFreeze<T>(value: T): T {\n"

mutants = [
    {'id': 'C0-clean', 'kind': 'control: unmutated tree', 'edits': []},
    {'id': 'M0-lane-udp4-bind-at-import', 'kind': "the lane's mutant: node:dgram UDP bind to 127.0.0.1 at import (sha256.ts)",
     'edits': [{'path': 'packages/support/src/sha256.ts', 'old': SHA_IMPORT,
                'new': SHA_IMPORT + "import { createSocket } from 'node:dgram';\ncreateSocket('udp4').bind(0, '127.0.0.1').unref();\n"}]},
    {'id': 'E1-dynamic-import-net-tcp-at-first-call', 'kind': "dynamic import('node:net'), TCP connect to 127.0.0.1:9 on the first sha256() call, not at import",
     'edits': [{'path': 'packages/support/src/sha256.ts', 'old': SHA_FN,
                'new': "let reached = false;\nexport function sha256(value: string | Uint8Array): string {\n"
                       "  if (!reached) { reached = true; void import('node:net').then((net) => { const s = net.connect(9, '127.0.0.1'); s.on('error', () => {}); s.unref(); }); }\n"
                       "  return createHash('sha256').update(value).digest('hex');\n"}]},
    {'id': 'E2-child-process-that-binds-udp4', 'kind': 'node:child_process execFileSync of a node child that binds a UDP socket, at import (deep-freeze.ts)',
     'edits': [{'path': 'packages/support/src/deep-freeze.ts', 'old': DF_HEAD,
                'new': "import { execFileSync } from 'node:child_process';\n"
                       "execFileSync(process.execPath, ['-e', \"require('node:dgram').createSocket('udp4').bind(0, '127.0.0.1', () => process.exit(0))\"]);\n" + DF_HEAD}]},
    {'id': 'E3-udp6-bind-at-import', 'kind': 'node:dgram udp6 (AF_INET6) bind to ::1 at import (deep-freeze.ts)',
     'edits': [{'path': 'packages/support/src/deep-freeze.ts', 'old': DF_HEAD,
                'new': "import { createSocket } from 'node:dgram';\nconst s6 = createSocket('udp6'); s6.on('error', () => {}); s6.bind(0, '::1'); s6.unref();\n" + DF_HEAD}]},
    {'id': 'E4-global-fetch-at-first-call', 'kind': 'global fetch() of http://127.0.0.1:9/ on the first deepFreeze() call, no import at all',
     'edits': [{'path': 'packages/support/src/deep-freeze.ts', 'old': DF_FN,
                'new': "let fetched = false;\n" + DF_FN + "  if (!fetched) { fetched = true; void fetch('http://127.0.0.1:9/').catch(() => {}); }\n"}]},
    {'id': 'E5-fs-write-at-import', 'kind': 'node:fs write at import (not network egress): writes <e5dir>/wrote-<pid> with process.argv[1]',
     'edits': [{'path': 'packages/support/src/sha256.ts', 'old': SHA_IMPORT,
                'new': SHA_IMPORT + "import { writeFileSync } from 'node:fs';\n"
                       f"try {{ writeFileSync(`{e5dir}/wrote-${{process.pid}}`, String(process.argv[1])); }} catch {{ /* reviewer mutant */ }}\n"}]},
]
json.dump(mutants, open(out, 'w'), indent=1)
print(len(mutants), 'entries')
