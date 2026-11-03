#!/usr/bin/env python3
"""Print the subject digests of a syzygy-bpyt.6.5 differential run.

Usage: subject_digests.py CHECKOUT...

For each checkout: its HEAD commit, whether tracked files are modified, and
the sha256 of every file under packages/three-surface-poc-core/src and
apps/three-surface-poc/src, with test files (*.test.ts) kept apart from the
rest, plus a sha256 over each group's sorted (path, digest) rows. The untracked
zz-bpyt65-*.test.ts harness copies and vitest.differential.config.ts are
listed under `harness`. Run it BEFORE the run it anchors (rule 11) and
retain the output next to the run record.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

ROOTS = ("packages/three-surface-poc-core/src", "apps/three-surface-poc/src")


def sha(path: Path) -> str:
    return hashlib.sha256(path.read_bytes()).hexdigest()


def rows_digest(rows: dict) -> str:
    text = "".join(f"{p}\t{d}\n" for p, d in sorted(rows.items()))
    return hashlib.sha256(text.encode()).hexdigest()


def describe(checkout: str) -> dict:
    root = Path(checkout)
    git = lambda *a: subprocess.run(["git", "-C", checkout, *a], capture_output=True, text=True, check=True).stdout
    groups = {"source": {}, "tests": {}, "harness": {}}
    for sub in ROOTS:
        for path in sorted((root / sub).rglob("*.ts")):
            rel = path.relative_to(root).as_posix()
            if path.name.startswith("zz-bpyt65-"):
                groups["harness"][rel] = sha(path)
            else:
                groups["tests" if path.name.endswith(".test.ts") else "source"][rel] = sha(path)
    config = root / "vitest.differential.config.ts"
    if config.exists():
        groups["harness"]["vitest.differential.config.ts"] = sha(config)
    return {
        "head": git("rev-parse", "HEAD").strip(),
        "trackedFilesModified": bool(git("status", "--porcelain", "--untracked-files=no").strip()),
        **{k: {"files": len(v), "groupSha256": rows_digest(v), "rows": v} for k, v in groups.items()},
    }


if __name__ == "__main__":
    print(json.dumps({c: describe(c) for c in sys.argv[1:]}, indent=1))
