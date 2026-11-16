#!/usr/bin/env python3
"""Second batch of reviewer S10 mutants (E4 redone on a port fetch() does not refuse; global-only forms the purity test
accepts). Usage: make_egress_mutants_2.py <out.json>. Port 9 is on the Fetch standard's bad-port list, so E4's fetch was
refused before any socket existed; 65530 is a closed port fetch() will try."""
import json
import sys

DF_HEAD = "/**\n * Freezes the value"
DF_FN = "export function deepFreeze<T>(value: T): T {\n"
SHA_IMPORT = "import { createHash } from 'node:crypto';\n"
mutants = [
    {'id': 'E4b-global-fetch-at-first-call-port-65530', 'kind': 'global fetch() of http://127.0.0.1:65530/ on the first deepFreeze() call, no import',
     'edits': [{'path': 'packages/support/src/deep-freeze.ts', 'old': DF_FN,
                'new': "let fetched = false;\n" + DF_FN + "  if (!fetched) { fetched = true; void fetch('http://127.0.0.1:65530/').catch(() => {}); }\n"}]},
    {'id': 'E6-console-write-at-import', 'kind': "console.log at import (the purity test's survivor RP3)",
     'edits': [{'path': 'packages/support/src/deep-freeze.ts', 'old': DF_HEAD, 'new': "console.log('support loaded');\n" + DF_HEAD}]},
    {'id': 'E7-optional-call-fetch-at-import', 'kind': "globalThis.fetch?.() at import (the purity test's survivor RP15)",
     'edits': [{'path': 'packages/support/src/sha256.ts', 'old': SHA_IMPORT,
                'new': SHA_IMPORT + "void globalThis.fetch?.('http://127.0.0.1:65530/').catch(() => {});\n"}]},
    {'id': 'E8-websocket-at-import', 'kind': "new WebSocket() at import (the purity test's survivor RP5, called)",
     'edits': [{'path': 'packages/support/src/sha256.ts', 'old': SHA_IMPORT,
                'new': SHA_IMPORT + "try { const ws = new WebSocket('ws://127.0.0.1:65530/'); ws.onerror = () => {}; } catch { /* reviewer mutant */ }\n"}]},
]
json.dump(mutants, open(sys.argv[1], 'w'), indent=1)
print(len(mutants), 'entries')
