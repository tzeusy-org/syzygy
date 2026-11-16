#!/usr/bin/env python3
"""Check every workspace export's `source` condition against the module its built target was compiled from.

Usage, from a checkout root with every dist built: source_entry_identity.py > record.json
Population: every entry of every `exports` map of every apps/* and packages/* package.json. For each entry the compiler's own
record decides: the `.js.map` beside the entry's `import` (or `default`) target names, in `sources`, the module tsc compiled it
from. The entry passes when `source` is that module, `source` is the first condition, `import` and `default` agree where both are
present, and `types` is the target's sibling `.d.ts`.
"""
import json, os, sys

rows = []
for parent in ('apps', 'packages'):
    for name in sorted(os.listdir(parent)):
        manifest_path = os.path.join(parent, name, 'package.json')
        if not os.path.exists(manifest_path):
            continue
        manifest = json.load(open(manifest_path))
        for subpath, entry in (manifest.get('exports') or {}).items():
            row = {'package': manifest['name'], 'subpath': subpath}
            if not isinstance(entry, dict):
                row.update(ok=False, why='entry is not a condition object')
                rows.append(row)
                continue
            target = entry.get('import', entry.get('default'))
            keys = list(entry)
            map_path = os.path.normpath(os.path.join(parent, name, target + '.map'))
            sources = json.load(open(map_path))['sources'] if os.path.exists(map_path) else None
            compiled_from = os.path.normpath(os.path.join(os.path.dirname(map_path), sources[0])) if sources else None
            declared = os.path.normpath(os.path.join(parent, name, entry['source'])) if 'source' in entry else None
            types_ok = 'types' not in entry or entry['types'] == target[:-3] + '.d.ts'
            agree = 'import' not in entry or 'default' not in entry or entry['import'] == entry['default']
            row.update(conditions=keys, target=target, compiledFrom=compiled_from, source=declared,
                       ok=keys[0] == 'source' and declared == compiled_from and types_ok and agree and len(sources or []) == 1)
            rows.append(row)
print(json.dumps({'entries': len(rows), 'ok': sum(r['ok'] for r in rows), 'rows': rows}, indent=1))
