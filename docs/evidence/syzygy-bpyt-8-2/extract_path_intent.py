"""syzygy-bpyt.8.2: lift one tree's resolvePathIntent callers into a directory Node 24 can import with its types stripped.
  - state-directory.ts: packages/polaris-dossier/src/state-directory.ts copied byte for byte, or the file given as the third
    argument (a mutated copy, for the negative control). It must import node: built-ins alone, so it runs where it is copied.
  - daemon-path-intent.ts: apps/syzygy/src/main.ts cut between two literal markers that must each occur exactly once: the RTF-1
    region, which holds governedPlaneViolation and, at base, the daemon's own resolvePathIntent. When the region defines no
    resolvePathIntent, it imports the copied state-directory.ts, as main.ts imports @syzygy/polaris-dossier/state-directory.
Usage: extract_path_intent.py <tree> <out-dir> [<state-directory.ts>]
"""
import hashlib, json, os, re, sys

tree, out = sys.argv[1], sys.argv[2]
state_file = sys.argv[3] if len(sys.argv) > 3 else os.path.join(tree, 'packages/polaris-dossier/src/state-directory.ts')
os.makedirs(out, exist_ok=True)


def region(text, start, end):
    assert text.count(start) == 1, (start, text.count(start))
    assert text.count(end) == 1, (end, text.count(end))
    a = text.index(start)
    return text[a:text.index(end, a)]


state = open(state_file, 'rb').read()
imports = re.findall(rb"^import [^;]*? from '([^']+)';$", state, re.M)
assert imports and all(name.startswith(b'node:') for name in imports), imports
open(os.path.join(out, 'state-directory.ts'), 'wb').write(state)

main = open(os.path.join(tree, 'apps/syzygy/src/main.ts')).read()
body = region(main, '// --- Governed-plane containment by symlink reality (RTF-1)', 'async function main(): Promise<number> {')
assert body.count('function governedPlaneViolation(root: string, stateDir: string): string | null {') == 1
local = 'function resolvePathIntent(absolutePath: string)' in body
if not local:
    assert "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n" in main
head = "import * as fs from 'node:fs';\nimport * as path from 'node:path';\n"
if not local:
    head += "import { resolvePathIntent } from './state-directory.ts';\n"
exports = 'governedPlaneViolation, resolvePathIntent' if local else 'governedPlaneViolation'
open(os.path.join(out, 'daemon-path-intent.ts'), 'w').write(head + body + f'\nexport {{ {exports} }};\n')
open(os.path.join(out, 'package.json'), 'w').write('{"type": "module"}\n')
json.dump({'tree': os.path.abspath(tree), 'stateFile': os.path.abspath(state_file),
           'stateSha256': hashlib.sha256(state).hexdigest(), 'daemonOwnCopy': local,
           'regionSha256': hashlib.sha256(body.encode()).hexdigest()},
          open(os.path.join(out, 'lifted.json'), 'w'), indent=1)
print('lifted', 'daemon-own-copy' if local else 'daemon-imports-shared-copy', len(body), 'bytes')
