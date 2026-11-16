"""R-GP-IMPL-SOURCE-RESOLUTION-3: sweep tracked TypeScript modules for a triple-slash reference (F3 replacement), two methods.

python3 -I tripleslash_sweep.py CHECKOUT REV
"""
import re, subprocess, sys
repo, rev = sys.argv[1:3]
def git(*a): return subprocess.run(["git", "-C", repo, *a], capture_output=True, text=True).stdout
files = [p for p in git("ls-tree", "-r", "--name-only", "-z", rev).split("\0") if re.search(r"\.(?:ts|mts|cts|tsx)$", p)]
pat = re.compile(r"^\s*///\s*<reference\b[^\n]*", re.M)
hits = {}
for p in files:
    text = git("show", f"{rev}:{p}")
    for m in pat.finditer(text):
        hits.setdefault(p, []).append(m.group(0).strip())
print("method 1 (python re over git show):", len(files), "tracked .ts/.mts/.cts/.tsx files;", sum(map(len, hits.values())), "reference directives in", len(hits), "files")
for p, h in hits.items(): print("  ", p, h)
path_hits = {p: [x for x in h if re.search(r"\bpath\s*=", x)] for p, h in hits.items()}
print("  of which reference path:", sum(map(len, path_hits.values())))
g = subprocess.run(["git", "-C", repo, "grep", "-c", "-F", "<reference", rev, "--", "*.ts", "*.mts", "*.cts", "*.tsx"], capture_output=True, text=True).stdout.strip()
print("method 2 (git grep -F '<reference' over the same suffixes):", repr(g) if g else "no hits")
