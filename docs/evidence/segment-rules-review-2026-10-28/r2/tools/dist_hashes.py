"""sha256 of every file under each apps/*/dist and packages/*/dist of a checkout (argv[1]), written as JSON to argv[2]."""
import hashlib, json, os, sys
root = sys.argv[1]; out = {}
for parent in ('apps', 'packages'):
    for name in sorted(os.listdir(os.path.join(root, parent))):
        d = os.path.join(root, parent, name, 'dist')
        for dp, _, fs in os.walk(d):
            for f in fs:
                p = os.path.join(dp, f)
                out[os.path.relpath(p, root)] = hashlib.sha256(open(p, 'rb').read()).hexdigest()
json.dump(out, open(sys.argv[2], 'w'), indent=0, sort_keys=True)
print(len(out), 'files')
