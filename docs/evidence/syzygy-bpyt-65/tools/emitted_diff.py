"""syzygy-bpyt.65, E3: runs emitted-diff.test.ts.txt once from the root of a clean Syzygy checkout and prints one JSON record.
Usage: `python3 -I emitted_diff.py > record.json`. The probe is copied into the app's src tree, run alone, and removed; the
checkout must be clean before and after."""
import hashlib, json, os, subprocess, tempfile

HERE = os.path.dirname(os.path.abspath(__file__))
PROBE = os.path.join(HERE, "emitted-diff.test.ts.txt")
TARGET = "apps/three-surface-poc/src/zz-emitted-diff.test.ts"
git = lambda *a: subprocess.run(["git", *a], capture_output=True, text=True).stdout
clean_before = git("status", "--porcelain") == ""
with tempfile.TemporaryDirectory() as scratch:
    out = os.path.join(scratch, "rows.json")
    open(TARGET, "w").write(open(PROBE).read())
    try:
        done = subprocess.run(["npx", "vitest", "run", TARGET], capture_output=True, text=True, env={**os.environ, "EMITTED_DIFF_OUT": out})
    finally:
        os.remove(TARGET)
    rows = json.load(open(out)) if os.path.exists(out) else None
print(json.dumps({"subject": "the emitted-set models of product-build.test.ts against tsc --listFilesOnly", "commit": git("rev-parse", "HEAD").strip(),
                  "tool": {"path": "docs/evidence/syzygy-bpyt-65/tools/emitted_diff.py", "sha256": hashlib.sha256(open(__file__, "rb").read()).hexdigest(),
                           "probeSha256": hashlib.sha256(open(PROBE, "rb").read()).hexdigest()},
                  "loadavg": open("/proc/loadavg").read().split()[:3], "vitestExit": done.returncode,
                  "worktreeCleanBefore": clean_before, "worktreeCleanAfter": git("status", "--porcelain") == "", **(rows or {})}, indent=1))
