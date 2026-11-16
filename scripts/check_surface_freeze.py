#!/usr/bin/env python3
"""Fail a change that touches a frozen surface path while the surface merge freeze is active.

The owner direction OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06 (item pdja-surface-freeze) starts the freeze when a
candidate head's readiness run begins. scripts/surface-merge-freeze.json records whether it is active, because nothing else
can say so: a merge that lands an active state in the same change as a frozen path is refused too.

  check_surface_freeze.py --base <ref>   compare <ref>...HEAD against the recorded state
  check_surface_freeze.py --selftest     the fixtures below
"""
from __future__ import annotations

import argparse
import json
import pathlib
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parent.parent
STATE_FILE = ROOT / "scripts" / "surface-merge-freeze.json"
FROZEN_PREFIXES = ("apps/three-surface-poc/src/", "packages/three-surface-poc-core/src/")
STATES = ("inactive", "frozen")


def findings(state: object, changed: list[str]) -> list[str]:
    if not isinstance(state, dict) or state.get("state") not in STATES:
        return ["surface-merge-freeze.json: state must be one of inactive, frozen"]
    if state["state"] == "inactive":
        return [] if state.get("candidateHead") is None else ["surface-merge-freeze.json: an inactive freeze names no head"]
    head = state.get("candidateHead")
    if not isinstance(head, str) or len(head) != 40:
        return ["surface-merge-freeze.json: a frozen state names the candidate head's full commit"]
    return [f"frozen path, freeze active at {head}: {path}" for path in changed if path.startswith(FROZEN_PREFIXES)]


def selftest() -> int:
    frozen = {"state": "frozen", "candidateHead": "a" * 40}
    inactive = {"state": "inactive", "candidateHead": None}
    app = "apps/three-surface-poc/src/main.ts"
    core = "packages/three-surface-poc-core/src/model.ts"
    cases = [
        ("inactive passes a frozen path", findings(inactive, [app, core]) == []),
        ("frozen refuses the app tree", len(findings(frozen, [app])) == 1),
        ("frozen refuses the core tree", len(findings(frozen, [core])) == 1),
        ("frozen names every path", len(findings(frozen, [app, core])) == 2),
        ("frozen passes other paths", findings(frozen, ["docs/README.md", "apps/three-surface-poc/package.json"]) == []),
        ("a sibling of a prefix passes", findings(frozen, ["apps/three-surface-poc/srcx/a.ts"]) == []),
        ("an unknown state fails", len(findings({"state": "paused"}, [])) == 1),
        ("a non-object fails", len(findings([], [])) == 1),
        ("frozen without a head fails", len(findings({"state": "frozen", "candidateHead": None}, [])) == 1),
        ("frozen with a short head fails", len(findings({"state": "frozen", "candidateHead": "abc"}, [])) == 1),
        ("inactive naming a head fails", len(findings({"state": "inactive", "candidateHead": "a" * 40}, [])) == 1),
    ]
    failed = [name for name, passed in cases if not passed]
    for name in failed:
        print(f"FAIL {name}")
    print(f"check_surface_freeze selftest: {len(cases) - len(failed)} of {len(cases)} passed")
    return 1 if failed else 0


def main() -> int:
    parser = argparse.ArgumentParser()
    parser.add_argument("--base")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    if not args.base:
        parser.error("--base or --selftest is required")
    changed = subprocess.run(
        ["git", "diff", "-z", "--name-only", f"{args.base}...HEAD"], cwd=ROOT, check=True, capture_output=True, text=True
    ).stdout.split("\0")
    problems = findings(json.loads(STATE_FILE.read_text(encoding="utf-8")), [path for path in changed if path])
    for problem in problems:
        print(problem)
    print(f"check_surface_freeze: {len(problems)} finding(s) over {len([p for p in changed if p])} changed path(s)")
    return 1 if problems else 0


if __name__ == "__main__":
    sys.exit(main())
