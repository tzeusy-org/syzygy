"""R-GP-IMPL-SOURCE-RESOLUTION-3: compare every workspace package.json `exports` map between two commits (Class 6 sentence).

python3 -I exports_census.py CHECKOUT BASE HEAD
"""
import json, subprocess, sys

repo, base, head = sys.argv[1:4]
def git(*a): return subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True, check=True).stdout
def manifests(rev):
    out = {}
    for p in git("ls-tree", "-r", "--name-only", "-z", rev).split("\0"):
        parts = p.split("/")
        if len(parts) == 3 and parts[0] in ("apps", "packages") and parts[2] == "package.json":
            out[p] = json.loads(git("show", f"{rev}:{p}"))
    return out
B, H = manifests(base), manifests(head)
print("workspaces base", len(B), "head", len(H), "same set", sorted(B) == sorted(H))
with_exports = [p for p in sorted(H) if "exports" in H[p]]
print("head workspaces with exports", len(with_exports), "private", sum(1 for p in H if H[p].get("private")), "without exports", [p for p in sorted(H) if "exports" not in H[p]])
total = 0; ok = 0
for p in with_exports:
    be, he = B[p].get("exports", {}), H[p]["exports"]
    if list(be) != list(he): print("  ENTRY SET DIFFERS", p, list(be), list(he))
    for k, hv in he.items():
        total += 1
        bv = be.get(k)
        first = list(hv)[0] if isinstance(hv, dict) else None
        rest_h = {c: t for c, t in hv.items() if c != "source"} if isinstance(hv, dict) else hv
        same_rest = rest_h == bv
        bare = isinstance(bv, str)
        bare_same_target = bare and isinstance(hv, dict) and all(t == bv for c, t in hv.items() if c not in ("source", "types"))
        good = first == "source" and (same_rest or bare_same_target)
        ok += good
        print(f"  {p} {k!r}: source first={first == 'source'} base bare={bare} rest unchanged={same_rest} bare->same target={bare_same_target} base={json.dumps(bv)} head={json.dumps(hv)}")
print("entries", total, "with source first and otherwise unchanged (or bare->object same target)", ok)
