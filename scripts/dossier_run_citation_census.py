#!/usr/bin/env python3
"""Count a dossier run's citations of one source path, from the run's metadata only.

Reads the JSON under `<run>/drafts/` and `<run>/inventory/` and, for every object carrying `path`, `startLine`,
`endLine` and `id`, counts those whose `path` equals `--path`. Prints per file: all citations, citations of the path,
distinct line ranges, lines covered and the longest range. It reads no repository body, no span text and nothing
under the run's `site/` (screening scope version 6 package, `syzygy-mcs4`, round 1 finding 9).

  python3 scripts/dossier_run_citation_census.py --run <run directory> [--path redis.conf]
"""

from __future__ import annotations

import argparse
import json
import pathlib
import sys


def cites(o, out: list) -> None:
    if isinstance(o, dict):
        if {"path", "startLine", "endLine", "id"} <= set(o):
            out.append(o)
        for v in o.values():
            cites(v, out)
    elif isinstance(o, list):
        for v in o:
            cites(v, out)


def main(argv: list[str]) -> int:
    ap = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    ap.add_argument("--run", required=True, type=pathlib.Path)
    ap.add_argument("--path", default="redis.conf")
    a = ap.parse_args(argv)
    for sub in ("drafts", "inventory"):
        d = a.run / sub
        if not d.is_dir():
            continue
        for f in sorted(d.glob("*.json")):
            c: list = []
            try:
                cites(json.loads(f.read_text()), c)
            except (OSError, ValueError) as exc:
                print(f"{sub}/{f.name}: unreadable ({type(exc).__name__})")
                continue
            rc = [x for x in c if x["path"] == a.path]
            covered = {n for x in rc for n in range(x["startLine"], x["endLine"] + 1)}
            longest = max([x["endLine"] - x["startLine"] + 1 for x in rc] or [0])
            print(f"{sub}/{f.name}: citations {len(c)}; {a.path} {len(rc)}; distinct ranges "
                  f"{len({(x['startLine'], x['endLine']) for x in rc})}; lines covered {len(covered)}; longest {longest}")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
