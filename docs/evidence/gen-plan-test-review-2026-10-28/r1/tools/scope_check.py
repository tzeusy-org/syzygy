#!/usr/bin/env python3
"""Scope check for PR #546 (syzygy-vsqr), reviewer R-GP-IMPL-GEN-PLAN-TEST-1.

usage: python3 -I scope_check.py <clone> <base> <head>

Prints every changed path between base and head with its status, whether any
of them is the runner, the gate workflow, or a file under
packages/polaris-generation-core/src/, and whether the plan module's emitted
JavaScript with comments removed is byte-equal at base and head (that is, the
plan's data and code did not change, only comments). The emit is produced by
the clone's own TypeScript, through emit.cjs beside this script.
"""
import hashlib
import json
import os
import subprocess
import sys

RUNNER = "apps/three-surface-poc/src/polaris-generation/generation-mutation-run-main.ts"
WORKFLOW = ".github/workflows/generation-mutation-gate.yml"
PLAN = "apps/three-surface-poc/src/polaris-generation/generation-mutation.ts"
GUARDED = "packages/polaris-generation-core/src/"
EMIT = os.path.join(os.path.dirname(os.path.abspath(__file__)), "emit.cjs")


def git(clone, *args):
    return subprocess.run(["git", "-C", clone, *args], capture_output=True, text=True, check=True).stdout


def emit(clone, text):
    proc = subprocess.run(["node", EMIT, clone, PLAN], input=text, capture_output=True, text=True, check=True)
    return proc.stdout


def main(clone, base, head):
    rows = [line.split("\t") for line in git(clone, "diff", "--name-status", base, head).splitlines() if line]
    print(f"changed paths {base}..{head}: {len(rows)}")
    for row in rows:
        print("  " + "\t".join(row))
    paths = [row[-1] for row in rows]
    print("runner changed:", RUNNER in paths)
    print("gate workflow changed:", WORKFLOW in paths)
    guarded = [p for p in paths if p.startswith(GUARDED)]
    print(f"paths under {GUARDED}: {len(guarded)} {guarded}")
    whole = git(clone, "diff", "--name-only", base, head, "--", GUARDED, RUNNER, WORKFLOW).split()
    print("second method (git diff -- <those paths>):", len(whole), whole)
    plan_base = git(clone, "show", f"{base}:{PLAN}")
    plan_head = git(clone, "show", f"{head}:{PLAN}")
    e_base, e_head = emit(clone, plan_base), emit(clone, plan_head)
    print("plan raw bytes equal:", plan_base == plan_head)
    print("plan emit (removeComments) equal:", e_base == e_head,
          hashlib.sha256(e_base.encode()).hexdigest(), hashlib.sha256(e_head.encode()).hexdigest())
    changed = [l for l in git(clone, "diff", "-U0", base, head, "--", PLAN).splitlines()
               if l[:1] in "+-" and not l.startswith(("+++", "---"))]
    print(f"plan changed lines: {len(changed)}")
    for l in changed:
        print("  " + l)
    return 0


if __name__ == "__main__":
    sys.exit(main(*sys.argv[1:4]))
