"""syzygy-bpyt.4.2, R-GP-IMPL-SOURCE-RESOLUTION-1 N7: the POC surface version at each named commit.

`python3 -I surface_version.py <commit>...`, run from inside a Syzygy checkout, prints one JSON record. It recomputes
`pwbSurfaceVersion` (apps/three-surface-poc/src/walkthrough-inputs.ts): `polaris@` and the first 12 hex of the sha256 over
the Git tree ids of apps/three-surface-poc/src and packages/three-surface-poc-core/src at the commit, newline-joined."""
import hashlib, json, subprocess, sys

TREES = ("apps/three-surface-poc/src", "packages/three-surface-poc-core/src")


def git(*args):
    return subprocess.run(["git", *args], capture_output=True, text=True, check=True).stdout.strip()


rows = []
for commit in sys.argv[1:]:
    full = git("rev-parse", f"{commit}^{{commit}}")
    trees = [git("rev-parse", f"{full}:{path}") for path in TREES]
    rows.append({"commit": full, "trees": dict(zip(TREES, trees)),
                 "version": "polaris@" + hashlib.sha256("\n".join(trees).encode()).hexdigest()[:12]})
print(json.dumps({"subject": "pwbSurfaceVersion at each commit", "rows": rows}, indent=1))
