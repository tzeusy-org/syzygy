"""Re-derive r2-review.diff: each '### <command>' header then its output; print sha256 and compare."""
import hashlib, subprocess, sys
repo, ref = sys.argv[1], sys.argv[2]
cmds = ["git diff 2f249d2c cf2b7d32", "git show --remerge-diff --format=%H 8fb78d1b", "git diff 8fb78d1b a607bb62"]
out = b""
for c in cmds:
    out += f"### {c}\n".encode() + subprocess.run(c.split(), cwd=repo, capture_output=True, check=True).stdout
h = hashlib.sha256(out).hexdigest()
ref_bytes = open(ref, "rb").read()
print("derived", h, len(out)); print("frozen ", hashlib.sha256(ref_bytes).hexdigest(), len(ref_bytes)); print("EQUAL" if out == ref_bytes else "DIFFER")
