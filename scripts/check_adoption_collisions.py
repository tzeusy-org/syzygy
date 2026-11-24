#!/usr/bin/env python3
"""Compare new adoption and specification claims in two exact Git commits."""

from __future__ import annotations

import argparse
from dataclasses import asdict, dataclass, replace
import json
import os
from pathlib import Path
import re
import subprocess
import sys
import tempfile

sys.dont_write_bytecode = True

from check_spec_reconciliation import AGENT_ADOPTIONS, adoption_table_rows, valid_adoption_date
from count_polaris_effective_scenarios import ScenarioCountError, parse_regex


OID = re.compile(r"[0-9a-f]{40}")
ROW_ID = re.compile(r"A-[1-9][0-9]*")
ROW_COMMITS = re.compile(r"`[0-9a-f]{7,40}`(?:, (?:repaired by )?`[0-9a-f]{7,40}`)*")
TAG = re.compile(r"`([a-z0-9-]+)-v([0-9]+\.[0-9]+)`")
SPEC_PATH = re.compile(r"openspec/changes/[a-z0-9-]+/(proposed|specs)/([a-z0-9-]+)/spec\.md")
SPEC_LINK = re.compile(r"\]\(https://github\.com/tzeusy-org/syzygy/blob/([0-9a-f]{40})/(openspec/changes/[^)]+)\)")
VERSION = re.compile(r"^Candidate version ([0-9]+\.[0-9]+)(?=[:;,.]?(?:[ \t]|$))", re.M)
INSTALLED_REQUIREMENT = re.compile(r"^### Requirement: [^\r\n]+", re.M)
MODIFIED_ID = re.compile(r"\bMODIFIED requirement,? (REQ-[a-z0-9-]+-\d{3})\b")


class ComparisonUnavailable(Exception):
    pass


@dataclass(frozen=True)
class Row:
    identity: str
    text: str
    subjects: tuple[str, ...]
    change: str
    tag: str


@dataclass(frozen=True)
class Claim:
    row: str
    family: str
    series: str
    version: str
    tag: str
    subject: str
    spec_path: str
    modified_requirements: tuple[str, ...]


def git(*args: str) -> bytes:
    result = subprocess.run(
        ["git", *args], stdout=subprocess.PIPE, stderr=subprocess.DEVNULL,
        env={**os.environ, "GIT_NO_REPLACE_OBJECTS": "1", "GIT_NO_LAZY_FETCH": "1",
             "GIT_OPTIONAL_LOCKS": "0"},
        check=False,
    )
    if result.returncode:
        raise ComparisonUnavailable(f"Git could not read the requested {args[0]} input")
    return result.stdout


def exact_commit(value: str, kind: str) -> str:
    if not OID.fullmatch(value):
        raise ComparisonUnavailable(f"{kind} must be a full 40-character Git commit ID")
    if git("cat-file", "-t", value) != b"commit\n":
        raise ComparisonUnavailable(f"{kind} must identify a commit object")
    return value


def introduced_subject(value: str, commit: str, identity: str) -> str:
    candidates = [value] if OID.fullmatch(value) else (
        git("rev-parse", f"--disambiguate={value}").decode("ascii").splitlines()
    )
    if len(candidates) != 1:
        raise ComparisonUnavailable(f"adoption {identity} has an ambiguous or missing subject at {commit}")
    subject = exact_commit(candidates[0], f"adoption {identity} subject")
    try:
        git("merge-base", "--is-ancestor", subject, commit)
    except ComparisonUnavailable as error:
        raise ComparisonUnavailable(
            f"adoption {identity} subject {subject} is outside the history of {commit}"
        ) from error
    return subject


def blob(commit: str, path: str) -> bytes:
    entry = git("ls-tree", "-z", commit, "--", path)
    fields = entry.partition(b"\t")[0].split()
    if len(fields) != 3 or fields[:2] not in ([b"100644", b"blob"], [b"100755", b"blob"]):
        raise ComparisonUnavailable(f"{path} is unavailable as a regular blob at {commit}")
    return git("cat-file", "blob", fields[2].decode("ascii"))


def ledger(commit: str, scratch: Path) -> dict[str, Row]:
    (scratch / AGENT_ADOPTIONS).write_bytes(blob(commit, AGENT_ADOPTIONS))
    lines = adoption_table_rows(scratch)
    if not lines:
        raise ComparisonUnavailable(f"canonical adoption table is missing, ambiguous or empty at {commit}")
    rows = {}
    for line in lines:
        cells = [cell.strip() for cell in line.split("|")[1:-1]]
        if len(cells) != 7 or not line.endswith("|") or not all(cells):
            raise ComparisonUnavailable(f"malformed adoption table row at {commit}")
        identity, date, subjects, change, _, _, tag = cells
        if not ROW_ID.fullmatch(identity) or not valid_adoption_date(date) or not ROW_COMMITS.fullmatch(subjects):
            raise ComparisonUnavailable(f"malformed adoption row {identity} at {commit}")
        if identity in rows:
            raise ComparisonUnavailable(f"repeated adoption identity {identity} at {commit}")
        if tag != "—" and not TAG.fullmatch(tag):
            raise ComparisonUnavailable(f"malformed version tag for {identity} at {commit}")
        rows[identity] = Row(identity, line, tuple(re.findall(r"`([^\x60]+)`", subjects)), change, tag)
    return rows


def changed_spec_paths(subject: str) -> list[str]:
    parent_line = git("rev-list", "--parents", "-n", "1", subject).decode("ascii").split()
    start = [parent_line[1], subject] if len(parent_line) > 1 else ["--root", subject]
    return git("diff-tree", "--no-commit-id", "-r", "--name-only", "--no-renames", "-z",
               "--diff-filter=AMT", *start, "--", "openspec/changes").decode().split("\0")


def specification_claims(row: Row, tip: str) -> list[Claim]:
    tag = TAG.fullmatch(row.tag)
    if tag is None:
        return []
    tag_stem, version = tag.groups()
    if len(row.subjects) != 1:
        raise ComparisonUnavailable(f"version claim {row.identity} has several subjects")
    subject = row.subjects[0]
    links = [
        path for commit, path in SPEC_LINK.findall(row.change)
        if commit == subject and SPEC_PATH.fullmatch(path)
    ]
    paths = list(dict.fromkeys(links)) if links else changed_spec_paths(subject)
    claims = []
    for path in paths:
        binding = SPEC_PATH.fullmatch(path)
        if binding is None:
            continue
        layout, family = binding.groups()
        series = tag_stem
        requirements: tuple[str, ...] = ()
        installed = blob(tip, path)
        if layout == "proposed":
            series = family
            payload_bytes = blob(subject, path)
            if payload_bytes != installed:
                raise ComparisonUnavailable(f"version claim {row.identity} differs from {path} at {tip}")
            payload = payload_bytes.decode("utf-8")
            preamble = payload.partition("\n## ")[0]
            version_markers = VERSION.findall(preamble)
            if version_markers != [version] or path not in links:
                raise ComparisonUnavailable(f"version claim {row.identity} does not bind {path} at {subject}")
            delta = parse_regex(payload, path)
            if not delta.section_kinds():
                raise ComparisonUnavailable(f"version claim {row.identity} has no requirement entries in {path}")
            declared = MODIFIED_ID.findall(preamble)
            if len(declared) == len(delta.modified) == 1:
                requirements = tuple(declared)
        else:
            committed = blob(subject, path).decode("utf-8")
            if not all(INSTALLED_REQUIREMENT.search(body) for body in (committed, installed.decode("utf-8"))):
                raise ComparisonUnavailable(f"version claim {row.identity} has no installed requirement in {path}")
        claims.append(Claim(row.identity, family, series, version, row.tag[1:-1],
                            subject, path, requirements))
    if not claims and not (tag_stem.endswith("-design") and any(p.endswith("/design.md") for p in paths)):
        raise ComparisonUnavailable(f"version claim {row.identity} has no changed specification path")
    return claims


def introduced_rows(commit: str, scratch: Path, inherited: dict[str, Row]) -> dict[str, Row]:
    rows = ledger(commit, scratch)
    for identity, original in inherited.items():
        if rows.get(identity) != original:
            raise ComparisonUnavailable(f"inherited adoption row {identity} differs at {commit}")
    return {
        key: replace(row, subjects=tuple(introduced_subject(oid, commit, key) for oid in row.subjects))
        for key, row in rows.items() if key not in inherited
    }


def compare(head: str, base: str) -> dict:
    exact_commit(head, "candidate")
    exact_commit(base, "base")
    common = git("merge-base", "--all", head, base).decode("ascii").splitlines()
    if len(common) != 1:
        raise ComparisonUnavailable("candidate and base lack a unique merge base")
    ancestor = common[0]
    with tempfile.TemporaryDirectory(prefix="syzygy-adoption-preflight-") as directory:
        scratch = Path(directory)
        (scratch / AGENT_ADOPTIONS).parent.mkdir(parents=True)
        inherited = ledger(ancestor, scratch)
        new_head = introduced_rows(head, scratch, inherited)
        new_base = introduced_rows(base, scratch, inherited)
    adoptions = [
        {"id": key, "candidate_subjects": new_head[key].subjects, "base_subjects": new_base[key].subjects}
        for key in sorted(new_head.keys() & new_base.keys(), key=lambda key: int(key[2:]))
        if new_head[key].text != new_base[key].text
    ]
    head_specs = [claim for row in new_head.values() for claim in specification_claims(row, head)]
    base_specs = [claim for row in new_base.values() for claim in specification_claims(row, base)]
    versions = [
        {"family": candidate.family, "series": candidate.series, "version": candidate.version,
         "candidate": asdict(candidate), "base": asdict(incumbent),
         "shared_modified_requirements": sorted(
             set(candidate.modified_requirements) & set(incumbent.modified_requirements))}
        for candidate in head_specs for incumbent in base_specs
        if (candidate.family, candidate.series, candidate.version) ==
           (incumbent.family, incumbent.series, incumbent.version)
        and (candidate.tag, candidate.subject, candidate.spec_path) !=
            (incumbent.tag, incumbent.subject, incumbent.spec_path)
    ]
    return {"merge_base": ancestor, "adoption_collisions": adoptions,
            "version_collisions": versions, "outcome": "collision" if adoptions or versions else "clear"}


def main(argv: list[str] | None = None) -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--head", required=True, help="exact candidate commit ID")
    parser.add_argument("--base", required=True, help="exact freshly fetched main commit ID")
    args = parser.parse_args(argv)
    result = {"head": args.head, "base": args.base}
    try:
        result.update(compare(args.head, args.base))
    except (ComparisonUnavailable, UnicodeError, OSError, ScenarioCountError) as error:
        result.update(outcome="unavailable", reason=str(error))
    print(json.dumps(result, indent=2))
    return {"clear": 0, "collision": 1, "unavailable": 2}[result["outcome"]]


if __name__ == "__main__":
    sys.exit(main())
