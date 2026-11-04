#!/usr/bin/env python3
"""Derive agent default-load omissions from ROUND-ESTATE's literal table.

Navigation only: never use this predicate for citation, reliance, digest,
consent, evidence, budget or governance sweeps. The task router uses it only
for its Load line; an explicit_history task (or a direct path request) keeps
history navigable. Nothing is moved, cached, or written by this module.
"""

from __future__ import annotations

import re
from pathlib import Path

CANDIDATES = ".syzygy/governance/contracts/candidates"
SOURCE = f"{CANDIDATES}/ROUND-ESTATE.md"
HEADING = "## The eleven rounds"
ROUND_NAME = re.compile(r"round-[0-9]{4}-[0-9]{2}[a-z]*")


def _relative_parts(path: str) -> tuple[str, ...]:
    parts = tuple(path.split("/"))
    if "\\" in path or "\0" in path or any(p in ("", ".", "..") for p in parts):
        raise ValueError(f"routing path must be a literal repository-relative path: {path!r}")
    return parts


def _inside(root: Path, path: Path) -> Path:
    resolved = path.resolve(strict=True)
    if not resolved.is_relative_to(root):
        raise ValueError(f"routing source or directory escapes checkout: {path}")
    return resolved


def declared_rounds(root: Path) -> frozenset[str]:
    """Generate one validated membership set; refuse an incomplete source."""
    root = root.resolve(strict=True)
    source = _inside(root, root / SOURCE)
    lines = source.read_text(encoding="utf-8").splitlines()
    starts = [i for i, line in enumerate(lines) if line == HEADING]
    if len(starts) != 1:
        raise ValueError("ROUND-ESTATE must have one rounds-table heading")
    start = starts[0] + 1
    end = next((i for i in range(start, len(lines)) if lines[i].startswith("## ")), len(lines))
    section = [line for line in lines[start:end] if line.strip()]
    table = next((i for i, line in enumerate(section) if line.startswith("|")), None)
    if table is None:
        raise ValueError("ROUND-ESTATE rounds table missing")
    rows = section[table:]
    if rows[0] != "| Round | Span | Files | What it settled | Where that settlement lives now |":
        raise ValueError("ROUND-ESTATE rounds-table header malformed")
    if len(rows) < 3 or not re.fullmatch(r"\|(?::?-+:?\|){5}", rows[1].replace(" ", "")):
        raise ValueError("ROUND-ESTATE rounds-table separator or entries missing")
    rounds: set[str] = set()
    for row in rows[2:]:
        cells = row.split("|")
        if len(cells) != 7 or cells[0] or cells[-1]:
            raise ValueError("ROUND-ESTATE rounds-table row malformed")
        first = cells[1].strip()
        name = first[1:-1]
        if not (first.startswith("`") and first.endswith("`") and ROUND_NAME.fullmatch(name)):
            raise ValueError(f"ROUND-ESTATE round name malformed: {first!r}")
        if name in rounds:
            raise ValueError(f"ROUND-ESTATE duplicate round: {name}")
        directory = _inside(root, root / CANDIDATES / name)
        if not directory.is_dir():
            raise ValueError(f"ROUND-ESTATE round directory missing: {name}")
        rounds.add(name)
    return frozenset(rounds)


def is_spent_round(path: str, rounds: frozenset[str]) -> bool:
    """Match a declared directory component, including that directory itself."""
    parts = _relative_parts(path)
    prefix = tuple(CANDIDATES.split("/"))
    return parts[:len(prefix)] == prefix and len(parts) > len(prefix) and parts[len(prefix)] in rounds


def agent_load_paths(paths: list[str], rounds: frozenset[str], *, explicit_history: bool = False) -> list[str]:
    """Select agent reads only; preserve input order and explicit history."""
    for path in paths:
        _relative_parts(path)
    return [path for path in paths if explicit_history or not is_spent_round(path, rounds)]
