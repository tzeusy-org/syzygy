"""Count tests per file with `vitest list --json` in a checkout (argv[1]) over the given test files (argv[2:]; missing ones count 0)."""
import collections, json, os, subprocess, sys, tempfile
root, files = sys.argv[1], sys.argv[2:]
present = [f for f in files if os.path.exists(os.path.join(root, f))]
with tempfile.TemporaryDirectory() as d:
    out = os.path.join(d, "l.json")
    subprocess.run(["npx", "vitest", "list", *present, "--json", out], cwd=root, capture_output=True, text=True)
    rows = json.load(open(out))
c = collections.Counter(os.path.relpath(r["file"], os.path.realpath(root)) if os.path.isabs(r["file"]) else r["file"] for r in rows)
for f in files: print(f, c.get(f, 0))
print("total", sum(c.get(f, 0) for f in files))
