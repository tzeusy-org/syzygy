#!/usr/bin/env python3
"""Re-derive the round-2 subject and delta digests and the path-overlap claims of the brief."""
import hashlib
import subprocess
import sys

REPO = sys.argv[1]
BASE = "3ec6929951080613b3c5cb7205fe303c5449be58"
HEAD = "6dcf94906b2989345f5b03dfeaa2d64c56632886"
R1 = "490332aa7cc1cdf818ae01bd46e375f8280d8b7d"
R1_BASE = "9a30237ed700e6579f3fcc1c6292e6c759861c3f"
MAIN = sys.argv[2] if len(sys.argv) > 2 else None


def git(*args, raw=False):
    out = subprocess.run(["git", "-C", REPO, *args], check=True, capture_output=True).stdout
    return out if raw else out.decode()


def names(a, b):
    return [p for p in git("diff", "--name-only", "-z", a, b).split("\0") if p]


subject = names(BASE, HEAD)
print("subject paths:", len(subject))
review = git("diff", BASE, HEAD, raw=True)
print("review diff sha256:", hashlib.sha256(review).hexdigest())
delta = git("diff", R1, HEAD, "--", *subject, raw=True)
print("delta diff sha256:", hashlib.sha256(delta).hexdigest())
print("delta shortstat:", git("diff", "--shortstat", R1, HEAD, "--", *subject).strip())
delta_files = [p for p in git("diff", "--name-only", "-z", R1, HEAD, "--", *subject).split("\0") if p]
print("delta files:", len(delta_files))
for p in delta_files:
    print("  ", p)
print("merge-base(R1, HEAD):", git("merge-base", R1, HEAD).strip())
print("R1 is ancestor of HEAD:", subprocess.run(["git", "-C", REPO, "merge-base", "--is-ancestor", R1, HEAD]).returncode == 0)
main_r1 = names(R1_BASE, BASE)
overlap = sorted(set(main_r1) & set(subject))
print(f"files changed {R1_BASE[:8]}..{BASE[:8]}:", len(main_r1), "overlap with subject:", len(overlap), overlap)
if MAIN:
    main_now = names(BASE, MAIN)
    overlap2 = sorted(set(main_now) & set(subject))
    print(f"files changed {BASE[:8]}..{MAIN}:", len(main_now), "overlap with subject:", len(overlap2), overlap2)
# commits on the branch since round 1
print("commits R1..HEAD (first-parent):")
print(git("log", "--first-parent", "--format=%h %s", f"{R1}..{HEAD}"))
print("non-merge commits R1..HEAD not on BASE:")
print(git("log", "--no-merges", "--format=%h %s", f"{BASE}..{HEAD}", f"^{R1}"))
