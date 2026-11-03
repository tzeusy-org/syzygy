#!/usr/bin/env python3
"""Rule-6 mutants for compare_capture.py / compare_capture_v2.py (syzygy-i5fv).

Usage: run_capture_mutants.py COMPARATOR BASE.json HEAD.json

Each mutant is an exact text fragment of the head output (old -> new, first
occurrence only; asserted to occur) fed to the comparator with the unmutated
base output. Prints one JSON record: per mutant its old/new fragments, exit
status and whether the comparator died with a traceback instead of a finding.
`noop-control` must exit 0; every other mutant must exit 1 with no traceback
for the comparator to pass.
"""
import json
import subprocess
import sys
import tempfile
import os

BASE_REV = "217150de40b1108e632829d0954b6e9728323974"
FIRST_CAT = '"cat-file blob 14fd6e025ebd486127572eb984fe0a51d8cbb83c",'
LS = f'"ls-tree -r -z -l {BASE_REV}",'
MUTANTS = [
    ("noop-control", '"mode": "real-git-fixture"', '"mode": "real-git-fixture"'),
    ("shape-digest", '"digest": "db28dfc6b0a534dde8ca07916168da46da8fcb6c2ff8b4c897bcd19614c43f29"', '"digest": "db28dfc6b0a534dde8ca07916168da46da8fcb6c2ff8b4c897bcd19614c43f2a"'),
    ("shape-field", '"sourceCount": 15,', '"sourceCount": 16,'),
    ("extra-cat-file", FIRST_CAT, FIRST_CAT + "\n      " + FIRST_CAT),
    ("extra-ls-tree", LS, LS + "\n      " + LS),
    ("ls-tree-removed", LS, '"rev-parse --verify HEAD",'),
    ("revision", f'"base": "{BASE_REV}"', '"base": "317150de40b1108e632829d0954b6e9728323974"'),
    ("scenario-missing", '"base": {', '"basex": {'),
    ("mode", '"mode": "real-git-fixture"', '"mode": "live"'),
    ("shapes-section-absent", '"shapes":', '"shapez":'),
    ("gitCalls-section-absent", '"gitCalls":', '"gitCallz":'),
    ("mode-section-absent", '"mode": "real-git-fixture"', '"modez": "real-git-fixture"'),
]


def main(comparator: str, base: str, head: str) -> int:
    text = open(head, encoding="utf-8").read()
    results = []
    for mid, old, new in MUTANTS:
        assert old in text, f"fragment for {mid} not in head output"
        mutated = text.replace(old, new, 1)
        with tempfile.NamedTemporaryFile("w", suffix=".json", delete=False, encoding="utf-8") as f:
            f.write(mutated)
        try:
            p = subprocess.run([sys.executable, comparator, base, f.name], capture_output=True, text=True)
        finally:
            os.unlink(f.name)
        results.append({"id": mid, "old": old, "new": new, "exit": p.returncode,
                        "traceback": "Traceback" in p.stderr})
    ok = all((r["exit"] == 0 and not r["traceback"]) if r["id"] == "noop-control" else (r["exit"] == 1 and not r["traceback"]) for r in results)
    print(json.dumps({"comparator": os.path.basename(comparator), "allPass": ok, "mutants": results}, indent=1))
    return 0 if ok else 1


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
