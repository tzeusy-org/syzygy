"""Reviewer runner: the PROJECT-STATUS.md canonical battery block, one command at a time, from the checkout root (cwd).
Prints commands=<n> nonzero=<m> and each nonzero command with its exit code and last output line. Variable assignments
(NAME=value lines) are applied to the environment and not counted as commands."""
import os, re, subprocess, sys

text = open("PROJECT-STATUS.md", encoding="utf8").read()
section = text[text.index("## How to verify this page"):]
block = re.search(r"```sh\n(.*?)\n```", section, re.S).group(1)
joined = re.sub(r"\\\n", " ", block)
env = dict(os.environ)
n = bad = 0
for line in joined.split("\n"):
    s = line.strip()
    if not s or s.startswith("#"):
        continue
    m = re.fullmatch(r"([A-Z_]+)=(\S+)", s)
    if m:
        env[m.group(1)] = m.group(2)
        continue
    n += 1
    r = subprocess.run(s, shell=True, env=env, capture_output=True, text=True)
    if r.returncode != 0:
        bad += 1
        tail = (r.stdout + r.stderr).strip().split("\n")[-1:]
        print(f"NONZERO {r.returncode}: {s[:160]} :: {tail}", flush=True)
print(f"commands={n} nonzero={bad}")
