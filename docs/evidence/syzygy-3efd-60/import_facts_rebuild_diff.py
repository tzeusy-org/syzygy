#!/usr/bin/env python3
"""Compare the import facts edits over version 2.38 with the reviewed edits over version 2.33 (syzygy-3efd.60).

Usage: import_facts_rebuild_diff.py <worktree>. The reviewed (repaired) text is read from commit 3497af414, where it was
built over figure plan 2.33 with the placeholder 2.NN; the rebuilt text and its predecessor, migration parity 2.38, are
read from the worktree. Each text is reduced to its line edits against its own predecessor (a line diff); the file head
(title and banner) is excluded, and in the reviewed edits the predecessor number `version 2.33` reads `version 2.38` and
the placeholder `2.NN` reads `2.39`. The script prints both digests and the edit counts and exits non-zero unless the two
edit lists are equal.
"""
import difflib
import hashlib
import pathlib
import subprocess
import sys

W = pathlib.Path(sys.argv[1])
REVIEWED_AT = "3497af414bd2332a41201976c87669a292ebafff"
OLD_PRED = "openspec/changes/dossier-figure-plan/proposed/polaris-generation/spec.md"
NEW_PRED = "openspec/changes/dossier-migration-parity/proposed/polaris-generation/spec.md"
SPEC = "openspec/changes/dossier-import-facts/proposed/polaris-generation/spec.md"


def at(rev, path):
    return subprocess.run(["git", "-C", str(W), "show", f"{rev}:{path}"], capture_output=True, check=True).stdout


def edits(pred, succ):
    a, b = pred.decode("utf-8").split("\n"), succ.decode("utf-8").split("\n")
    out = []
    for op, i1, i2, j1, j2 in difflib.SequenceMatcher(None, a, b, autojunk=False).get_opcodes():
        if op != "equal" and i1 >= 3:  # lines 1 and 3 are the file head
            out.append((op, tuple(a[i1:i2]), tuple(b[j1:j2])))
    return out


reviewed_pred, reviewed = at(REVIEWED_AT, OLD_PRED), at(REVIEWED_AT, SPEC)
rebuilt_pred, rebuilt = (W / NEW_PRED).read_bytes(), (W / SPEC).read_bytes()


def relabel(line):
    return line.replace("version 2.33", "version 2.38").replace("2.NN", "2.39")


old = [(op, a, tuple(relabel(x) for x in b)) for op, a, b in edits(reviewed_pred, reviewed)]
new = edits(rebuilt_pred, rebuilt)
sha = lambda b: hashlib.sha256(b).hexdigest()
print("reviewed", sha(reviewed), "over", sha(reviewed_pred))
print("rebuilt ", sha(rebuilt), "over", sha(rebuilt_pred))
print("edits", len(old), len(new), "lines removed", sum(len(a) for _, a, _ in new),
      "lines added", sum(len(b) for _, _, b in new))
for k, (x, y) in enumerate(zip(old, new)):
    print(k, x[0], len(x[1]), "->", len(x[2]), "equal" if x == y else "DIFFERENT")
sys.exit(0 if old == new else 1)
