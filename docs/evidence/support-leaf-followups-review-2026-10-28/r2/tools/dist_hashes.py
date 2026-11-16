# Usage: dist_hashes.py <tree> <out.json>: sha256 of every file under each apps/*/dist and packages/*/dist (tsbuildinfo included, flagged).
import hashlib, json, os, sys
tree, out = sys.argv[1:3]
rows = {}
for parent in ['apps', 'packages']:
    for name in sorted(os.listdir(os.path.join(tree, parent))):
        d = os.path.join(tree, parent, name, 'dist')
        if not os.path.isdir(d): continue
        for root, _, files in os.walk(d):
            for f in files:
                p = os.path.join(root, f)
                rows[os.path.relpath(p, tree)] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump(rows, open(out, 'w'), indent=0, sort_keys=True); print(len(rows))
