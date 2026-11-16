"""Independent reviewer tool (rev-530): for paths both branches change from one merge base, the base-side line
ranges each touches, and whether they overlap or abut. Usage: shared_paths.py <repo> <base> <a> <b>"""
import re, subprocess, sys
repo, base, a, b = sys.argv[1:5]
names = lambda x: set(subprocess.run(['git', '-C', repo, 'diff', '--name-only', base, x], capture_output=True, text=True, check=True).stdout.split())
def ranges(x, path):
    d = subprocess.run(['git', '-C', repo, 'diff', '-U0', base, x, '--', path], capture_output=True, text=True, check=True).stdout
    out = []
    for m in re.finditer(r'^@@ -(\d+)(?:,(\d+))? \+', d, re.M):
        s, n = int(m.group(1)), int(m.group(2) or 1)
        out.append((s, s + n - 1) if n else (s, s))  # n==0: insertion after line s
    return out
shared = sorted(names(a) & names(b))
print(f'shared paths: {len(shared)}')
for p in shared:
    ra, rb = ranges(a, p), ranges(b, p)
    touch = [(x, y) for x in ra for y in rb if x[0] <= y[1] + 1 and y[0] <= x[1] + 1]
    print(f"{p}: A {ra} | B {rb} | {'SAME/ADJACENT LINES ' + str(touch) if touch else 'disjoint'}")
