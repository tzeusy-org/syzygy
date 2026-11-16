#!/usr/bin/env python3
"""Run PROJECT-STATUS.md's canonical battery block, one command at a time, in a clone.

Usage: battery.py <clone> <out-dir>

The block is the first ```sh fence after the heading "How to verify this page". Shell variable
assignments (NAME=value) are applied to the environment of later commands and are not counted;
every other non-blank, non-comment line is one command, run with bash -c from the clone root.
"""
import os
import re
import subprocess
import sys

clone, out = sys.argv[1], sys.argv[2]
os.makedirs(out, exist_ok=True)
text = open(os.path.join(clone, "PROJECT-STATUS.md"), encoding="utf-8").read()
start = text.index("## How to verify this page")
fence = re.compile(r"^```sh\n(.*?)^```$", re.M | re.S).search(text, start)
lines = fence.group(1).split("\n")
head = subprocess.run(["git", "-C", clone, "rev-parse", "HEAD"], capture_output=True, text=True, check=True).stdout.strip()
env = dict(os.environ)
assign = re.compile(r"^([A-Z][A-Z0-9_]*)=(\S+)$")
results = []
for n, line in enumerate(lines, 1):
    cmd = line.strip()
    if not cmd or cmd.startswith("#"):
        continue
    m = assign.match(cmd)
    if m:
        env[m.group(1)] = m.group(2)
        continue
    p = subprocess.run(["bash", "-c", cmd], cwd=clone, env=env, capture_output=True, text=True)
    with open(os.path.join(out, f"{n:03d}.log"), "w", encoding="utf-8") as f:
        f.write(f"$ {cmd}\nexit={p.returncode}\n--- stdout\n{p.stdout}\n--- stderr\n{p.stderr}\n")
    results.append((n, p.returncode, cmd))
    print(n, p.returncode, cmd[:100], flush=True)
bad = [r for r in results if r[1] != 0]
print(f"commit={head} commands={len(results)} nonzero={len(bad)}")
for r in bad:
    print("NONZERO", r[0], r[1], r[2][:120])
