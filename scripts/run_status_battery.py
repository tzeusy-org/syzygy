#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Run the canonical governance battery that PROJECT-STATUS.md owns.

`PROJECT-STATUS.md` section "How to verify this page" holds the one battery
block; this script reads that block at run time and runs each command, so the
list is never copied (AGENTS.md, Validation). `npm run check:all` calls it.

    python3 scripts/run_status_battery.py            # run every command
    python3 scripts/run_status_battery.py --list     # print the commands, run none
    python3 scripts/run_status_battery.py --selftest

A line of the form NAME=value sets a variable for the commands after it; a
blank line and a `#` line are skipped; every other line is one shell command.
The exit status is 0 only when every command exits 0. A failing command's
output is printed after the summary; a passing command's output is not.
"""

from __future__ import annotations

import argparse
import concurrent.futures
import os
import re
import subprocess
import sys
from pathlib import Path

STATUS = Path("PROJECT-STATUS.md")
HEADING = "## How to verify this page"
ASSIGNMENT = re.compile(r"^([A-Za-z_][A-Za-z0-9_]*)=(\S*)$")


def battery(text: str) -> list[tuple[str, dict[str, str]]]:
    """The (command, variables) rows of the first sh block under the heading."""
    lines = text.splitlines()
    try:
        start = lines.index(HEADING)
    except ValueError:
        raise SystemExit(f"{STATUS}: no heading {HEADING!r}") from None
    opening = next((i for i in range(start + 1, len(lines)) if lines[i].startswith("```sh")), None)
    if opening is None:
        raise SystemExit(f"{STATUS}: no sh block under {HEADING!r}")
    closing = next((i for i in range(opening + 1, len(lines)) if lines[i].startswith("```")), None)
    if closing is None:
        raise SystemExit(f"{STATUS}: the sh block under {HEADING!r} never closes")
    variables: dict[str, str] = {}
    rows: list[tuple[str, dict[str, str]]] = []
    for line in lines[opening + 1 : closing]:
        stripped = line.strip()
        if not stripped or stripped.startswith("#"):
            continue
        assignment = ASSIGNMENT.match(stripped)
        if assignment:
            variables[assignment.group(1)] = assignment.group(2)
            continue
        rows.append((stripped, dict(variables)))
    return rows


def run_one(row: tuple[str, dict[str, str]]) -> tuple[str, int, str]:
    command, variables = row
    done = subprocess.run(
        command, shell=True, env={**os.environ, **variables}, capture_output=True, text=True, check=False
    )
    return command, done.returncode, done.stdout + done.stderr


def label(command: str) -> str:
    one = " ".join(command.split())
    return one if len(one) <= 110 else one[:107] + "..."


def selftest() -> int:
    block = "x\n" + HEADING + "\n\n```sh\n# c\nA=1\n\necho $A\nB=two\nexit 3   # trailing\n```\n```sh\necho later\n```\n"
    assert battery(block) == [("echo $A", {"A": "1"}), ("exit 3   # trailing", {"A": "1", "B": "two"})], battery(block)
    assert run_one(("echo $A", {"A": "1"}))[1:] == (0, "1\n")
    assert run_one(("exit 3", {}))[1] == 3
    for bad in ("no heading here", HEADING + "\nno block\n", HEADING + "\n```sh\necho open\n"):
        try:
            battery(bad)
        except SystemExit:
            continue
        raise AssertionError(f"accepted {bad!r}")
    real = battery(STATUS.read_text(encoding="utf-8"))
    assert len(real) > 100 and all(cmd for cmd, _ in real), len(real)
    print(f"selftest PASS: parser fixtures and {len(real)} commands read from {STATUS}")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--list", action="store_true", help="print the commands and run none")
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("-j", "--jobs", type=int, default=4, help="commands run at once (default 4; each is read-only)")
    args = parser.parse_args()
    if args.selftest:
        return selftest()
    rows = battery(STATUS.read_text(encoding="utf-8"))
    if args.list:
        for command, _ in rows:
            print(command)
        return 0
    failures: list[tuple[str, int, str]] = []
    with concurrent.futures.ThreadPoolExecutor(max_workers=max(1, args.jobs)) as pool:
        for command, code, output in pool.map(run_one, rows):
            print(f"{'ok  ' if code == 0 else 'FAIL'} {label(command)}", flush=True)
            if code != 0:
                failures.append((command, code, output))
    for command, code, output in failures:
        print(f"\n--- exit {code}: {label(command)}\n{output.rstrip()}", file=sys.stderr)
    print(f"battery: {len(rows) - len(failures)} ok, {len(failures)} failed, {len(rows)} commands")
    return 1 if failures else 0


if __name__ == "__main__":
    sys.exit(main())
