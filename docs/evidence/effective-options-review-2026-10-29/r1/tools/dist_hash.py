"""rev-558: sha256 of every file under every apps/*/dist and packages/*/dist, as one JSON object. Usage from a checkout root."""
import glob, hashlib, json, os
out = {}
for d in sorted(glob.glob("apps/*/dist") + glob.glob("packages/*/dist")):
    for dp, dns, fns in os.walk(d):
        for f in fns:
            p = os.path.join(dp, f); out[p] = hashlib.sha256(open(p, "rb").read()).hexdigest()
print(json.dumps({"files": len(out), "dists": sorted({p.split("/dist/")[0] for p in out}), "combined": hashlib.sha256(json.dumps(out, sort_keys=True).encode()).hexdigest(), "hashes": out}))
