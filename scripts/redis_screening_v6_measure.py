#!/usr/bin/env python3
"""Owner-run, count-only measurement for screening scope version 6 (`syzygy-mcs4`).

Agents never run this: it reads Redis bodies. The owner runs it over the local Redis clone at the trial commit and the
metadata of a dossier run. It prints counts and repository tree paths only, never a body, a line or a span's text.

What it answers (each figure the version-6 package marks Unknown until this runs):

1. `redis.conf` under version 5 and under version 6: its outcome and how many of its lines version 6 withholds.
2. Of the run's draft citations of `redis.conf` (per revision): how many would reach the reviewer whole under version 6,
   and how many touch a withheld line.
3. Over every blob at the commit: how many code-content files `config-secret-directive` withholds whole that version 5
   admitted (paths printed), and how many project-documentation files gain withheld lines.

The screen is the builders' Python reference oracle (`v5.screen`), not the shipped TypeScript screen, with one stated
change: its active-content scan reads no code context, so here it is switched off for both versions. Version 6 changes
no active-content rule, and redis.conf is project documentation under it (exempt from the scan since version 5's C),
so the comparison is unaffected, except that a file listed in (3) may also be withheld for markup under both versions.
The figures are [Inferred] estimates of the shipped screen until the install measures it.

Usage (from the Syzygy checkout, after the version-6 package exists):
  python3 scripts/redis_screening_v6_measure.py --clone <redis clone> --run <dossier run directory>
"""

from __future__ import annotations

import argparse
import json
import pathlib
import re
import subprocess
import sys

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_public_source_screening_scope_v6 as v6  # noqa: E402


def _cites(o, out):
    if isinstance(o, dict):
        if {"path", "startLine", "endLine"} <= set(o):
            out.append(o)
        for v in o.values():
            _cites(v, out)
    elif isinstance(o, list):
        for v in o:
            _cites(v, out)


def _blobs(clone: pathlib.Path, commit: str) -> list[tuple[str, str]]:
    raw = subprocess.run(["git", "-C", str(clone), "ls-tree", "-r", "-z", commit], capture_output=True, check=True).stdout
    out = []
    for rec in raw.split(b"\0"):
        if not rec:
            continue
        meta, path = rec.split(b"\t", 1)
        mode, kind, oid = meta.split(b" ")
        if kind == b"blob" and mode in (b"100644", b"100755"):
            out.append((path.decode("utf-8", "surrogateescape"), oid.decode()))
    return out


def _body(clone: pathlib.Path, oid: str) -> str | None:
    data = subprocess.run(["git", "-C", str(clone), "cat-file", "blob", oid], capture_output=True, check=True).stdout
    if b"\0" in data:
        return None
    try:
        return data.decode("utf-8")
    except UnicodeDecodeError:
        return None


def main() -> int:
    ap = argparse.ArgumentParser()
    ap.add_argument("--clone", required=True, type=pathlib.Path)
    ap.add_argument("--run", required=True, type=pathlib.Path)
    ap.add_argument("--commit", default=v6._C)
    a = ap.parse_args()
    v6.v5.has_active_content = lambda _body: False  # see the docstring: same rule both sides, not evaluated here
    base, mode = v6.base_bytes(ROOT)
    prop = v6.propose(base)
    print(f"policy base: {mode}; commit {a.commit}")

    blobs = dict(_blobs(a.clone, a.commit))
    conf = _body(a.clone, blobs["redis.conf"]) if "redis.conf" in blobs else None
    # what the run's citations of redis.conf meet under v6: None = nothing reaches (absent or excluded)
    withheld: frozenset | None = None
    why = "absent or not UTF-8 text at this commit"
    if conf is None:
        print(f"redis.conf: {why}")
    else:
        o5 = v6.screen("redis.conf", conf, base, v6._R, a.commit)
        o6 = v6.screen("redis.conf", conf, prop, v6._R, a.commit)
        lines = re.findall(r"[^\r\n]*(?:\r\n|\r|\n)|[^\r\n]+$", conf)
        print(f"redis.conf: {len(lines)} lines; v5 {_word(o5)}; v6 {_word(o6)}")
        if o6[0] == "excluded":
            why = f"file excluded: {o6[1]}"
        else:
            withheld = o6[1] if o6[0] == "redacted" else frozenset()
            print(f"redis.conf: v6 withholds {len(withheld)} lines")
            # prices the named residuals: lines naming a password word that the detector leaves readable
            named = [k + 1 for k, ln in enumerate(lines) if _KEYWORDS.search(ln) and k + 1 not in withheld]
            print(f"redis.conf: {len(named)} readable lines still name requirepass, masterauth, tls-*-pass, auth-pass, "
                  "password or a leading user")

    for sub in ("drafts", "inventory"):
        d = a.run / sub
        if not d.is_dir():
            continue
        for f in sorted(d.glob("*.json")):
            c: list = []
            try:
                _cites(json.loads(f.read_text()), c)
            except (OSError, ValueError):
                print(f"{sub}/{f.name}: unreadable")
                continue
            rc = [x for x in c if x["path"] == "redis.conf"]
            if not rc:
                continue
            if withheld is None:
                print(f"{sub}/{f.name}: {len(rc)} redis.conf citations; 0 reach ({why})")
                continue
            touch = sum(1 for x in rc if any(n in withheld for n in range(x["startLine"], x["endLine"] + 1)))
            print(f"{sub}/{f.name}: {len(rc)} redis.conf citations; {len(rc) - touch} reach whole under v6; "
                  f"{touch} touch a withheld line")

    transitions: dict[tuple[str, str], int] = {}
    newly_whole: list[str] = []
    scanned = 0
    for path, oid in sorted(blobs.items()):
        if path == "redis.conf":
            continue  # reported above
        cls = v6.content_class(path, prop, v6._R, a.commit)
        if cls is None:
            continue
        body = _body(a.clone, oid)
        if body is None:
            continue
        scanned += 1
        o5 = v6.screen(path, body, base, v6._R, a.commit)
        o6 = v6.screen(path, body, prop, v6._R, a.commit)
        if o6 == o5:
            continue
        key = (_word(o5, lines=False), _word(o6, lines=False))
        transitions[key] = transitions.get(key, 0) + 1
        if o6[0] == "excluded" and o5[0] != "excluded":
            newly_whole.append(f"{path} ({cls})")
    print(f"other classified text blobs screened: {scanned}")
    print(f"other files whose outcome changes: {sum(transitions.values())}")
    for (w5, w6), n in sorted(transitions.items()):
        print(f"  v5 {w5} -> v6 {w6}: {n}")
    print(f"other files withheld whole by v6 that v5 admitted or redacted: {len(newly_whole)}")
    for p in newly_whole:
        print(f"  {p}")
    return 0


_KEYWORDS = re.compile(r"requirepass|masterauth|tls-(?:client-)?key-file-pass|auth-pass|password|^[ \t#]*user[ \t]",
                       re.I)


def _word(o: tuple, lines: bool = True) -> str:
    if o[0] == "excluded":
        return f"excluded ({o[1]})"
    if o[0] == "redacted":
        return f"redacted ({len(o[1])} lines)" if lines else "redacted"
    return "admitted"


if __name__ == "__main__":
    sys.exit(main())
