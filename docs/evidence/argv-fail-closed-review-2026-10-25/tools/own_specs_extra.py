"""rev-528: the absolute-path and file: URL forms again, from an intermediate module, so the entry row (which matches any main.ts
specifier containing `polaris-dossier`) cannot be what kills them; and a # pattern alias from an intermediate module.

Usage: python3 -I own_specs_extra.py <tree> <out.json>
"""
import json, sys

tree, out = sys.argv[1:3]
tree = tree.rstrip('/')
DOSSIER = (['@syzygy/polaris-dossier'], ['packages/polaris-dossier/src/subpath-imports.test.ts'])
APP_MAIN = '  "main": "./dist/main.js",\n'
ENTRY_ANCHOR = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"


def via_bridge(line):
    return [{'file': 'apps/syzygy/src/bridge.ts', 'create': line + '\n'},
            {'file': 'apps/syzygy/src/main.ts', 'old': ENTRY_ANCHOR, 'new': ENTRY_ANCHOR + "import './bridge.js';\n"}]


specs = [
    {'id': 'RV-T14b-absolute-path-via-bridge', 'what': 'bridge.ts re-exports the barrel by its absolute path; main.ts imports bridge.ts',
     'expect': {'base': 'survives', 'head': 'killed'}, 'projects': DOSSIER[0], 'files': DOSSIER[1],
     'edits': via_bridge(f"export * from '{tree}/packages/polaris-dossier/src/index.js';")},
    {'id': 'RV-T15b-file-url-via-bridge', 'what': 'bridge.ts re-exports the barrel by a File:// URL; main.ts imports bridge.ts',
     'expect': {'base': 'survives', 'head': 'killed'}, 'projects': DOSSIER[0], 'files': DOSSIER[1],
     'edits': via_bridge(f"export * from 'File://{tree}/packages/polaris-dossier/src/index.js';")},
    {'id': 'RV-T1b-hash-pattern-alias-via-bridge', 'what': 'a #d/* pattern alias to the barrel, used by bridge.ts; main.ts imports bridge.ts',
     'expect': {'base': 'survives', 'head': 'killed'}, 'projects': DOSSIER[0], 'files': DOSSIER[1],
     'edits': [{'file': 'apps/syzygy/package.json', 'old': APP_MAIN, 'new': APP_MAIN + '  "imports": {"#d/*": "@syzygy/polaris-dossier"},\n'}]
     + via_bridge("export * from '#d/barrel';")},
]
json.dump({'what': f'rev-528 own mutants, extra, tree {tree}', 'mutants': specs}, open(out, 'w'), indent=1)
print(len(specs))
