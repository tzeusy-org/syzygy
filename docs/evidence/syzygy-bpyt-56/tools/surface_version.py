"""syzygy-bpyt.56: the POC surface version at each named commit, as pwbSurfaceVersion computes it (walkthrough-inputs.ts):
`polaris@` and the first 12 hex digits of the sha256 of the two src tree ids, joined by a newline, in POLARIS_SURFACE_TREES order.

`python3 -I surface_version.py <commit>...` from inside a Syzygy checkout prints one JSON record."""
import hashlib, json, subprocess, sys

TREES = ["apps/three-surface-poc/src", "packages/three-surface-poc-core/src"]


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout.strip()


rows = []
for commit in sys.argv[1:]:
    full = git("rev-parse", f"{commit}^{{commit}}")
    trees = {path: git("rev-parse", f"{full}:{path}") for path in TREES}
    rows.append({"commit": full, "trees": trees,
                 "version": "polaris@" + hashlib.sha256("\n".join(trees[path] for path in TREES).encode()).hexdigest()[:12]})
print(json.dumps({"subject": "pwbSurfaceVersion at each commit", "rows": rows}, indent=1))
