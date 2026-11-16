"""Round-2 emit comparison, independent of the lane's compare_emit.py.
python3 emit_r2.py <head root> <ref root> <ref label>... prints JSON: per suffix (.js .js.map .d.ts .d.ts.map other), each tree's
file and test-output counts, files only on one side, and for common files with differing bytes, for maps, which top-level JSON
fields differ; for .d.ts/.js a unified-diff line count. A test output is a path whose name less its suffix ends in .test."""
import difflib, json, os, sys
SUF = (".d.ts.map", ".js.map", ".d.ts", ".js")
def suf(p): return next((s for s in SUF if p.endswith(s)), "other")
def files(root):
    out = {}
    for top in ("apps", "packages"):
        for name in sorted(os.listdir(os.path.join(root, top))):
            d = os.path.join(root, top, name, "dist")
            for dp, _, fs in os.walk(d):
                for f in fs:
                    p = os.path.join(dp, f); out[os.path.relpath(p, root)] = open(p, "rb").read()
    return out
def is_test(p):
    s = suf(p); return s != "other" and p[:-len(s)].endswith(".test")
head = files(sys.argv[1]); res = {"headFiles": len(head)}
for ref, label in zip(sys.argv[2::2], sys.argv[3::2]):
    r = files(ref); row = {}
    for s in (*SUF, "other"):
        a = {p for p in r if suf(p) == s}; b = {p for p in head if suf(p) == s}
        diff = []
        for p in sorted(a & b):
            if r[p] == head[p] or s == "other": continue
            if s.endswith(".map"):
                ja, jb = json.loads(r[p]), json.loads(head[p])
                diff.append({"path": p, "fields": sorted(k for k in set(ja) | set(jb) if ja.get(k) != jb.get(k))})
            else:
                d = [l for l in difflib.unified_diff(r[p].decode().splitlines(), head[p].decode().splitlines(), lineterm="", n=0) if l[:1] in "+-" and l[:3] not in ("+++", "---")]
                diff.append({"path": p, "changedLines": d})
        row[s] = {"ref": len(a), "refTests": sum(map(is_test, a)), "head": len(b), "headTests": sum(map(is_test, b)),
                  "identical": sum(r[p] == head[p] for p in a & b), "differ": diff,
                  "onlyRefNonTest": sorted(p for p in a - b if not is_test(p)), "onlyRefTests": sum(map(is_test, a - b)), "onlyHead": sorted(b - a)}
    res[label] = row
print(json.dumps(res, indent=1))
