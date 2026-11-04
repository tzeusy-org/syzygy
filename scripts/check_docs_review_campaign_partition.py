#!/usr/bin/env python3
# /// script
# requires-python = ">=3.10"
# ///
"""Derive and check the tracked docs/reviews campaign partition."""

from __future__ import annotations

import argparse
import dataclasses
import datetime as dt
import json
import re
import subprocess
import sys
import tempfile
from unittest import mock
from pathlib import Path
from typing import Callable, Iterable


REVIEW_PREFIX = "docs/reviews/"
README = Path("docs/README.md")
HELPER = Path("scripts/check_docs_review_campaign_partition.py")
CAMPAIGN_DIR = Path("docs/review-campaigns")
CAMPAIGN_INDEX = "README.md"
KEY_PATTERN = re.compile(r"[a-z0-9][a-z0-9-]*")
PATTERNS_HEADING = "## Patterns"
SUBJECT_HEADING = "## What was under review"
VERDICT_HEADING = "## Last verdict of record, and where the findings landed"
SECTION_HEADINGS = (PATTERNS_HEADING, SUBJECT_HEADING, VERDICT_HEADING)
TABLE_HEADER = (
    "| Campaign | Files | Recorded | What was under review "
    "| Last verdict of record, and where the findings landed |"
)


@dataclasses.dataclass(frozen=True)
class Campaign:
    key: str
    display: str
    patterns: tuple[str, ...]
    subject: str = ""
    verdict: str = ""


def campaign(key: str, display: str, *patterns: str) -> Campaign:
    return Campaign(key, display, tuple(patterns))


class PartitionError(RuntimeError):
    pass


def parse_campaign_fragment(key: str, text: str) -> Campaign:
    """Parse one `docs/review-campaigns/<key>.md` fragment, strictly.

    A fragment holds what a person writes about a campaign: its display name,
    the anchored basename patterns, the subject and the verdict of record. It
    holds no figure the helper derives (file count, recorded dates, totals),
    so two branches that each retain a raw never edit the same line unless
    they touch the same campaign.
    """
    if not KEY_PATTERN.fullmatch(key):
        raise PartitionError(f"campaign fragment key is not kebab-case: {key}")
    lines = text.splitlines()
    if not lines or not lines[0].startswith("# ") or not lines[0][2:].strip():
        raise PartitionError(f"campaign fragment lacks a '# <display>' first line: {key}")
    display = lines[0][2:].strip()
    sections: dict[str, list[str]] = {}
    current: str | None = None
    for line in lines[1:]:
        if line.startswith("#"):
            if line not in SECTION_HEADINGS or line in sections:
                raise PartitionError(
                    f"campaign fragment has an unexpected or repeated heading: {key}: {line}"
                )
            current = line
            sections[current] = []
        elif current is None:
            if line.strip():
                raise PartitionError(f"campaign fragment text before its first section: {key}")
        else:
            sections[current].append(line)
    if tuple(sections) != SECTION_HEADINGS:
        raise PartitionError(
            f"campaign fragment sections must be exactly {list(SECTION_HEADINGS)} in order: {key}"
        )
    patterns: list[str] = []
    for line in sections[PATTERNS_HEADING]:
        if not line.strip():
            continue
        item = re.fullmatch(r"- `([^`]+)`", line)
        if not item:
            raise PartitionError(f"campaign pattern line is not '- `<regex>`': {key}: {line}")
        try:
            re.compile(item.group(1))
        except re.error as error:
            raise PartitionError(f"campaign pattern does not compile: {key}: {error}") from error
        patterns.append(item.group(1))
    if not patterns:
        raise PartitionError(f"campaign fragment has no pattern: {key}")
    subject = "\n".join(sections[SUBJECT_HEADING]).strip()
    verdict = "\n".join(sections[VERDICT_HEADING]).strip()
    if not subject or not verdict:
        raise PartitionError(f"campaign fragment has an empty section: {key}")
    return Campaign(key, display, tuple(patterns), subject, verdict)


def load_campaigns(directory: Path) -> tuple[Campaign, ...]:
    if not directory.is_dir():
        raise PartitionError(f"campaign directory missing: {directory}")
    campaigns: list[Campaign] = []
    displays: dict[str, str] = {}
    for path in sorted(directory.iterdir()):
        if path.name == CAMPAIGN_INDEX:
            continue
        if path.suffix != ".md" or not path.is_file():
            raise PartitionError(f"unexpected entry in campaign directory: {path.name}")
        item = parse_campaign_fragment(path.stem, path.read_text(encoding="utf-8"))
        if item.display in displays:
            raise PartitionError(
                f"duplicate campaign display: {item.display}: {displays[item.display]}, {item.key}"
            )
        displays[item.display] = item.key
        campaigns.append(item)
    if not campaigns:
        raise PartitionError(f"campaign directory has no fragment: {directory}")
    return tuple(campaigns)


def git(*args: str, cwd: Path | None = None) -> bytes:
    return subprocess.check_output(("git", *args), cwd=cwd, stderr=subprocess.STDOUT)


def repository_root() -> Path:
    return Path(git("rev-parse", "--show-toplevel").decode().strip()).resolve()


def head_commit_date() -> str:
    value = git("show", "-s", "--format=%cs", "HEAD").decode().strip()
    if not re.fullmatch(r"\d{4}-\d{2}-\d{2}", value):
        raise PartitionError(f"HEAD has invalid commit date: {value!r}")
    return value


def head_input_drift(repo_root: Path) -> list[str]:
    output = git(
        "diff",
        "--name-only",
        "-z",
        "HEAD",
        "--",
        README.as_posix(),
        REVIEW_PREFIX,
        CAMPAIGN_DIR.as_posix(),
        HELPER.as_posix(),
        cwd=repo_root,
    )
    return sorted(
        path.decode("utf-8", "surrogateescape") for path in output.split(b"\0") if path
    )


def assert_head_bound_inputs(readme_path: Path, repo_root: Path | None = None) -> None:
    root = repo_root or repository_root()
    supplied = (
        readme_path if readme_path.is_absolute() else Path.cwd() / readme_path
    ).resolve()
    canonical = (root / README).resolve()
    if supplied != canonical:
        raise PartitionError(
            f"check target must be the HEAD-bound {README.as_posix()}: {readme_path}"
        )
    drift = head_input_drift(root)
    if drift:
        raise PartitionError(
            "check inputs differ from HEAD\n"
            + "\n".join(f"HEAD input drift: {path}" for path in drift)
        )


def tracked_regular_paths() -> list[str]:
    records = git("ls-files", "--stage", "-z", "--", "docs/reviews/").split(b"\0")
    paths: list[str] = []
    for record in records:
        if not record:
            continue
        metadata, raw_path = record.split(b"\t", 1)
        mode, _object_id, stage = metadata.decode("ascii").split()
        path = raw_path.decode("utf-8", "surrogateescape")
        if stage == "0" and mode.startswith("100") and path.startswith(REVIEW_PREFIX):
            paths.append(path)
    return sorted(paths)


def tree_regular_paths() -> list[str]:
    records = git("ls-tree", "-r", "-z", "HEAD", "--", "docs/reviews/").split(b"\0")
    paths: list[str] = []
    for record in records:
        if not record:
            continue
        metadata, raw_path = record.split(b"\t", 1)
        mode, object_type, _object_id = metadata.decode("ascii").split()
        path = raw_path.decode("utf-8", "surrogateescape")
        if (
            mode.startswith("100")
            and object_type == "blob"
            and path.startswith(REVIEW_PREFIX)
        ):
            paths.append(path)
    return sorted(paths)


def matches(path: str, campaigns: Iterable[Campaign]) -> list[str]:
    basename = path.removeprefix(REVIEW_PREFIX)
    return [
        item.key
        for item in campaigns
        if any(re.fullmatch(pattern, basename) for pattern in item.patterns)
    ]


def partition(
    paths: Iterable[str], campaigns: Iterable[Campaign]
) -> dict[str, list[str]]:
    campaigns = tuple(campaigns)
    result = {item.key: [] for item in campaigns}
    unmatched: list[str] = []
    overlaps: dict[str, list[str]] = {}
    for path in paths:
        memberships = matches(path, campaigns)
        if not memberships:
            unmatched.append(path)
        elif len(memberships) > 1:
            overlaps[path] = memberships
        else:
            result[memberships[0]].append(path)
    if unmatched or overlaps:
        lines = ["review campaign partition failed"]
        lines.extend(f"unmatched: {path}" for path in unmatched)
        lines.extend(
            f"overlap: {path}: {', '.join(groups)}" for path, groups in overlaps.items()
        )
        raise PartitionError("\n".join(lines))
    return result


CHECK_ONLY_DATE = "unused under --check"


def add_date(path: str) -> str:
    output = (
        git(
            "log",
            "--follow",
            "--diff-filter=A",
            "--format=%cs",
            "HEAD",
            "--",
            path,
        )
        .decode()
        .splitlines()
    )
    if not output:
        raise PartitionError(f"no add date: {path}")
    return output[-1]


def date_span(
    paths: Iterable[str], add_date_for_path: Callable[[str], str] = add_date
) -> str:
    dates = sorted({add_date_for_path(path) for path in paths})
    if not dates:
        raise PartitionError("campaign has no paths")
    return dates[0] if len(dates) == 1 else f"{dates[0]} → {dates[-1]}"


def report(
    paths: list[str],
    observed_date: str,
    campaigns: Iterable[Campaign],
    add_date_for_path: Callable[[str], str] = add_date,
) -> dict[str, object]:
    campaigns = tuple(campaigns)
    grouped = partition(paths, campaigns)
    rows = []
    for item in campaigns:
        members = grouped[item.key]
        if not members:
            raise PartitionError(f"empty campaign: {item.key}")
        rows.append(
            {
                "key": item.key,
                "display": item.display,
                "count": len(members),
                "recorded": date_span(members, add_date_for_path=add_date_for_path),
                "subject": item.subject,
                "verdict": item.verdict,
                "paths": members,
            }
        )
    return {
        "denominator_predicate": "stage-0 tracked regular files recursively under docs/reviews/ at HEAD",
        "total": len(paths),
        "raw": sum(path.endswith("-RAW.md") for path in paths),
        "other": sum(not path.endswith("-RAW.md") for path in paths),
        "assigned": sum(int(row["count"]) for row in rows),
        "unmatched": [],
        "overlaps": {},
        "observed_date": observed_date,
        "campaigns": rows,
    }


def logical_markdown_lines(text: str) -> list[str]:
    logical: list[str] = []
    pending = ""
    fence: str | None = None
    for physical in text.splitlines():
        marker = re.match(r"^\s*(```+|~~~+)", physical)
        if marker:
            token = marker.group(1)[0]
            fence = None if fence == token else token
            if pending:
                logical.append(pending)
                pending = ""
            logical.append(physical)
            continue
        if fence:
            logical.append(physical)
            continue
        pending = f"{pending}{physical.lstrip()}" if pending else physical
        if len(re.findall(r"(?<!\\)`", pending)) % 2 == 0:
            logical.append(pending)
            pending = ""
    if pending:
        raise PartitionError("unclosed Markdown code span")
    return logical


def path_line_citations(text: str) -> list[tuple[str, int]]:
    joined = "\n".join(logical_markdown_lines(text))
    return [
        (path, int(line)) for path, line in re.findall(r"`([^`\n]+\.md):(\d+)`", joined)
    ]


ID_SEED = re.compile(r"(?P<prefix>[A-Z][A-Z0-9]*(?:-[A-Z0-9]+)*-)(?P<number>\d+)")


def expand_continuation_ids(text: str) -> tuple[set[str], list[str]]:
    joined = "\n".join(logical_markdown_lines(text))
    found = {match.group(0) for match in ID_SEED.finditer(joined)}
    unresolved: list[str] = []
    for seed in ID_SEED.finditer(joined):
        prefix = seed.group("prefix")
        width = len(seed.group("number"))
        start = int(seed.group("number"))
        tail = joined[seed.end() : seed.end() + 120]
        range_match = re.match(
            r"\s*(\.\.|…|–)\s*(?:" + re.escape(prefix) + r")?(\d+)", tail
        )
        if range_match:
            end = int(range_match.group(2))
            if end < start or end - start > 500:
                unresolved.append(seed.group(0) + range_match.group(0))
            else:
                found.update(
                    f"{prefix}{number:0{width}d}" for number in range(start, end + 1)
                )
            continue
        list_tail = tail
        while True:
            item = re.match(
                r"\s*(?:/|,|\band\b)\s*(?:" + re.escape(prefix) + r")?(\d+)",
                list_tail,
            )
            if not item:
                break
            found.add(f"{prefix}{int(item.group(1)):0{width}d}")
            list_tail = list_tail[item.end() :]
        dangling = re.match(r"\s*(?:/|,|\band\b|\.\.|…|–)(?:\s|$)", list_tail)
        if dangling:
            unresolved.append(seed.group(0) + dangling.group(0))
    return found, sorted(set(unresolved))


def render_table(data: dict[str, object]) -> str:
    """The campaign table, with every figure derived at HEAD (never stored)."""
    rows = sorted(
        data["campaigns"],  # type: ignore[arg-type]
        key=lambda row: (str(row["recorded"]), str(row["key"])),
    )
    lines = [TABLE_HEADER, "|---|---|---|---|---|"]
    for row in rows:
        cells = [
            str(row["display"]),
            str(row["count"]),
            str(row["recorded"]),
            " ".join(str(row["subject"]).split()),
            " ".join(str(row["verdict"]).split()),
        ]
        lines.append("| " + " | ".join(cell.replace("|", "\\|") for cell in cells) + " |")
    lines.append("")
    lines.append(
        f"The {len(rows)} rows partition the tracked directory at HEAD: "
        f"{data['total']} files, {data['assigned']} assigned, no remainder "
        f"[Observed — derived for HEAD dated {data['observed_date']} by "
        f"`{HELPER.as_posix()}`]."
    )
    return "\n".join(lines)


def validate_verdict_citation(verdict: str, display: str, root: Path) -> None:
    citations = path_line_citations(verdict)
    if not citations:
        raise PartitionError(f"campaign lacks exact verdict citation: {display}")
    resolved = False
    for raw_path, line_number in citations:
        path = root / (
            Path(raw_path)
            if raw_path.startswith(REVIEW_PREFIX)
            else Path("docs/reviews") / raw_path
        )
        if not path.is_file():
            raise PartitionError(
                f"missing verdict citation target: {display}: {raw_path}"
            )
        lines = path.read_text(encoding="utf-8").splitlines()
        if line_number < 1 or line_number > len(lines):
            raise PartitionError(
                f"verdict citation line out of range: {display}: {raw_path}:{line_number}"
            )
        if re.search(
            r"CONFIRM|PASS|READY|REVISE|CHANGES REQUESTED|FAIL",
            lines[line_number - 1],
            re.IGNORECASE,
        ):
            resolved = True
    if not resolved:
        raise PartitionError(
            f"campaign citation does not resolve to a verdict line: {display}"
        )


def check_campaigns(
    readme_path: Path, campaigns: Iterable[Campaign], root: Path
) -> None:
    text = readme_path.read_text(encoding="utf-8")
    if f"{CAMPAIGN_DIR.relative_to('docs').as_posix()}/" not in text:
        raise PartitionError(
            f"{README.as_posix()} does not route to {CAMPAIGN_DIR.as_posix()}/"
        )
    for item in campaigns:
        validate_verdict_citation(item.verdict, item.display, root)


def validate_denominator_sets(primary: list[str], secondary: list[str]) -> None:
    only_primary = sorted(set(primary) - set(secondary))
    only_secondary = sorted(set(secondary) - set(primary))
    if only_primary or only_secondary:
        raise PartitionError(
            "denominator methods disagree\n"
            + "\n".join(f"ls-files only: {path}" for path in only_primary)
            + "\n"
            + "\n".join(f"ls-tree only: {path}" for path in only_secondary)
        )


def second_method(primary: list[str]) -> None:
    secondary = tree_regular_paths()
    validate_denominator_sets(primary, secondary)
    print(
        f"second-method PASS: git ls-files={len(primary)}; git ls-tree={len(secondary)}; exact path sets equal"
    )


def selftest() -> None:
    fixtures = 0

    fixtures += 1
    assert logical_markdown_lines("See `R-EXAMPLE-\nRAW.md:3` now") == [
        "See `R-EXAMPLE-RAW.md:3` now"
    ]
    assert path_line_citations("See `R-EXAMPLE-\nRAW.md:3` now") == [
        ("R-EXAMPLE-RAW.md", 3)
    ]

    fixtures += 1
    ids, unresolved = expand_continuation_ids("Repair PWB-LIVE-02, 03, 05 and 15.")
    assert {
        "PWB-LIVE-02",
        "PWB-LIVE-03",
        "PWB-LIVE-05",
        "PWB-LIVE-15",
    } <= ids and not unresolved

    fixtures += 1
    ids, unresolved = expand_continuation_ids("P-68…P-83")
    assert {"P-68", "P-83"} <= ids and len(ids) == 16 and not unresolved
    ids, unresolved = expand_continuation_ids("PWB-LIVE-02/03/05/15")
    assert {
        "PWB-LIVE-02",
        "PWB-LIVE-03",
        "PWB-LIVE-05",
        "PWB-LIVE-15",
    } <= ids and not unresolved

    fixtures += 1
    _ids, unresolved = expand_continuation_ids("P-83..P-68")
    assert unresolved

    fixtures += 1
    try:
        partition(
            ["docs/reviews/R-OTHER-RAW.md"],
            (campaign("known", "known", r"R-KNOWN-RAW\.md"),),
        )
    except PartitionError as error:
        assert "unmatched" in str(error)
    else:
        raise AssertionError("unassigned-path mutant survived")

    fixtures += 1
    try:
        partition(
            ["docs/reviews/R-DUP-RAW.md"],
            (campaign("a", "a", r"R-.*"), campaign("b", "b", r"R-DUP-.*")),
        )
    except PartitionError as error:
        assert "overlap" in str(error)
    else:
        raise AssertionError("overlap mutant survived")

    live = load_campaigns(repository_root() / CAMPAIGN_DIR)

    fixtures += 1
    svg_paths = [
        "docs/reviews/R-POLARIS-SVG-GRAPH-DIAGRAMS-FEATURE-CANDIDATE-RAW.md",
        "docs/reviews/R-POLARIS-SVG-GRAPH-DIAGRAMS-FEATURE-CANDIDATE-REVIEW-1-RAW.md",
        "docs/reviews/R-POLARIS-SVG-GRAPH-DIAGRAMS-FEATURE-CANDIDATE-REVIEW-2-RAW.md",
        "docs/reviews/R-POLARIS-SVG-GRAPH-DIAGRAMS-FEATURE-CANDIDATE-REVIEW-3-RAW.md",
    ]
    assert all(matches(path, live) == ["polaris-svg-graph-candidate"] for path in svg_paths)
    assert not matches(
        "docs/reviews/R-POLARIS-SVG-GRAPH-DIAGRAMS-FEATURE-CANDIDATE-REVIEW-4-RAW.md", live
    )

    fixtures += 1
    missing_currency_paths = [
        "docs/reviews/R-PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-DELTA-RAW.md",
        "docs/reviews/R-PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-DELTA-CONFIRMATION-RAW.md",
        "docs/reviews/R-PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-DELTA-CONFIRMATION-2-RAW.md",
    ]
    assert all(matches(path, live) == ["missing-currency"] for path in missing_currency_paths)
    assert not matches(
        "docs/reviews/R-PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO-DELTA-REVIEW-RAW.md", live
    )

    fixtures += 1
    good_fragment = (
        "# Example campaign\n\n## Patterns\n\n- `R-EXAMPLE-RAW\\.md`\n\n"
        "## What was under review\n\nsubject\n\n"
        "## Last verdict of record, and where the findings landed\n\n"
        "`CONFIRM` (`R-EXAMPLE-RAW.md:1`)\n"
    )
    parsed = parse_campaign_fragment("example", good_fragment)
    assert parsed.display == "Example campaign" and parsed.patterns == (r"R-EXAMPLE-RAW\.md",)
    fragment_mutants = {
        "Example_Key": (good_fragment, "kebab-case"),
        "no-title": (good_fragment.replace("# Example campaign\n", ""), "first line"),
        "no-pattern": (good_fragment.replace("- `R-EXAMPLE-RAW\\.md`\n", ""), "no pattern"),
        "bad-pattern": (good_fragment.replace("R-EXAMPLE-RAW", "R-(EXAMPLE"), "compile"),
        "bare-pattern": (good_fragment.replace("- `R-EXAMPLE-RAW\\.md`", "- R-EXAMPLE"), "pattern line"),
        "stored-count": (good_fragment + "\n## Files\n\n3\n", "unexpected"),
        "empty-verdict": (good_fragment.replace("`CONFIRM` (`R-EXAMPLE-RAW.md:1`)", ""), "empty section"),
    }
    for key, (text, needle) in fragment_mutants.items():
        fixtures += 1
        try:
            parse_campaign_fragment(key, text)
        except PartitionError as error:
            assert needle in str(error), (key, str(error))
        else:
            raise AssertionError(f"fragment mutant survived: {key}")

    fixtures += 1
    rendered = render_table(
        report(
            ["docs/reviews/R-EXAMPLE-RAW.md"],
            "2026-09-23",
            campaigns=(parsed,),
            add_date_for_path=lambda _path: "2026-09-20",
        )
    )
    assert "| Example campaign | 1 | 2026-09-20 | subject |" in rendered
    assert "1 files, 1 assigned" in rendered

    fixtures += 1
    try:
        validate_denominator_sets(["docs/reviews/A.md"], ["docs/reviews/B.md"])
    except PartitionError as error:
        assert "denominator" in str(error)
    else:
        raise AssertionError("denominator-mismatch mutant survived")

    fixtures += 1
    fake_campaigns = (campaign("example", "example", r"R-EXAMPLE-RAW\.md"),)
    fake_paths = ["docs/reviews/R-EXAMPLE-RAW.md"]

    class EarlierAmbientDate(dt.date):
        @classmethod
        def today(cls) -> dt.date:
            return cls(2026, 9, 22)

    class LaterAmbientDate(dt.date):
        @classmethod
        def today(cls) -> dt.date:
            return cls(2026, 9, 24)

    with mock.patch.object(dt, "date", EarlierAmbientDate):
        earlier = report(
            fake_paths,
            "2026-09-23",
            campaigns=fake_campaigns,
            add_date_for_path=lambda _path: "2026-09-20",
        )
    with mock.patch.object(dt, "date", LaterAmbientDate):
        later = report(
            fake_paths,
            "2026-09-23",
            campaigns=fake_campaigns,
            add_date_for_path=lambda _path: "2026-09-20",
        )
    assert earlier == later and earlier["observed_date"] == "2026-09-23"

    with tempfile.TemporaryDirectory(prefix="review-partition-selftest-") as scratch:
        fixture_root = Path(scratch)
        (fixture_root / "docs/reviews").mkdir(parents=True)
        (fixture_root / "scripts").mkdir()
        fixture_readme = fixture_root / README
        fixture_review = fixture_root / "docs/reviews/R-EXAMPLE-RAW.md"
        fixture_helper = fixture_root / HELPER
        fixture_readme.write_text("see review-campaigns/\n", encoding="utf-8")
        fixture_review.write_text("CONFIRM\n", encoding="utf-8")
        fixture_helper.write_text("# helper\n", encoding="utf-8")
        fixture_fragment = fixture_root / CAMPAIGN_DIR / "example.md"
        fixture_fragment.parent.mkdir(parents=True)
        fixture_fragment.write_text(good_fragment, encoding="utf-8")
        subprocess.run(("git", "init", "-q"), cwd=fixture_root, check=True)
        subprocess.run(("git", "config", "gc.auto", "0"), cwd=fixture_root, check=True)
        subprocess.run(("git", "config", "maintenance.auto", "false"), cwd=fixture_root, check=True)
        subprocess.run(
            ("git", "config", "user.email", "selftest@example.invalid"),
            cwd=fixture_root,
            check=True,
        )
        subprocess.run(
            ("git", "config", "user.name", "partition selftest"),
            cwd=fixture_root,
            check=True,
        )
        subprocess.run(("git", "add", "."), cwd=fixture_root, check=True)
        subprocess.run(
            ("git", "commit", "-q", "-m", "fixture"),
            cwd=fixture_root,
            check=True,
        )
        assert_head_bound_inputs(fixture_readme, fixture_root)
        fixture_campaigns = load_campaigns(fixture_root / CAMPAIGN_DIR)
        check_campaigns(fixture_readme, fixture_campaigns, fixture_root)

        fixtures += 1
        fixture_review.write_text("no verdict word\n", encoding="utf-8")
        try:
            check_campaigns(fixture_readme, fixture_campaigns, fixture_root)
        except PartitionError as error:
            assert "does not resolve to a verdict line" in str(error)
        else:
            raise AssertionError("verdict-citation mutant survived")
        fixture_review.write_text("CONFIRM\n", encoding="utf-8")

        fixtures += 1
        fixture_readme.write_text("no route\n", encoding="utf-8")
        try:
            check_campaigns(fixture_readme, fixture_campaigns, fixture_root)
        except PartitionError as error:
            assert "does not route" in str(error)
        else:
            raise AssertionError("README-route mutant survived")
        fixture_readme.write_text("see review-campaigns/\n", encoding="utf-8")

        fixtures += 1
        fixture_fragment.write_text(good_fragment + "\nedited\n", encoding="utf-8")
        try:
            assert_head_bound_inputs(fixture_readme, fixture_root)
        except PartitionError as error:
            assert "HEAD input drift: docs/review-campaigns/example.md" in str(error)
        else:
            raise AssertionError("dirty-fragment mutant survived")
        fixture_fragment.write_text(good_fragment, encoding="utf-8")

        fixtures += 1
        fixture_readme.write_text("dirty README\n", encoding="utf-8")
        try:
            assert_head_bound_inputs(fixture_readme, fixture_root)
        except PartitionError as error:
            assert "HEAD input drift: docs/README.md" in str(error)
        else:
            raise AssertionError("dirty-README mutant survived")
        fixture_readme.write_text("see review-campaigns/\n", encoding="utf-8")

        fixtures += 1
        fixture_review.write_text("REVISE\n", encoding="utf-8")
        try:
            assert_head_bound_inputs(fixture_readme, fixture_root)
        except PartitionError as error:
            assert "HEAD input drift: docs/reviews/R-EXAMPLE-RAW.md" in str(error)
        else:
            raise AssertionError("dirty-citation mutant survived")
        fixture_review.write_text("CONFIRM\n", encoding="utf-8")

        fixtures += 1
        staged_review = fixture_root / "docs/reviews/R-STAGED-RAW.md"
        staged_review.write_text("CONFIRM\n", encoding="utf-8")
        subprocess.run(
            ("git", "add", staged_review.relative_to(fixture_root).as_posix()),
            cwd=fixture_root,
            check=True,
        )
        try:
            assert_head_bound_inputs(fixture_readme, fixture_root)
        except PartitionError as error:
            assert "HEAD input drift: docs/reviews/R-STAGED-RAW.md" in str(error)
        else:
            raise AssertionError("staged-denominator mutant survived")

    print(f"selftest PASS: {fixtures} fixtures")


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "--check",
        type=Path,
        nargs="?",
        const=README,
        metavar="README",
        help="fail unless the HEAD-bound campaign fragments partition docs/reviews/",
    )
    parser.add_argument("--json", action="store_true")
    parser.add_argument("--table", action="store_true", help="print the derived campaign table")
    parser.add_argument("--second-method", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()
    if args.selftest:
        selftest()
        return 0
    root = repository_root()
    if args.check:
        assert_head_bound_inputs(args.check, root)
    campaigns = load_campaigns(root / CAMPAIGN_DIR)
    paths = tracked_regular_paths()
    # --check never prints the add dates, and each costs a `git log --follow`
    # (about 700 of them, minutes); only the table, JSON and plain modes need them.
    date_for_path = (lambda _path: CHECK_ONLY_DATE) if args.check else add_date
    data = report(paths, head_commit_date(), campaigns, date_for_path)
    if args.check or args.second_method:
        second_method(paths)
    if args.check:
        check_campaigns(args.check, campaigns, root)
        print(
            f"partition PASS: denominator={data['total']}; assigned={data['assigned']}; "
            f"raw={data['raw']}; other={data['other']}; unmatched=0; overlaps=0; campaigns={len(campaigns)}"
        )
    elif args.json:
        print(json.dumps(data, indent=2, sort_keys=True, ensure_ascii=False))
    elif args.table:
        print(render_table(data))
    elif not args.second_method:
        for row in data["campaigns"]:  # type: ignore[index]
            print(f"{row['display']}\t{row['count']}\t{row['recorded']}")
        print(
            f"total={data['total']} assigned={data['assigned']} raw={data['raw']} "
            f"other={data['other']} unmatched=0 overlaps=0 observed={data['observed_date']}"
        )
    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except (PartitionError, subprocess.CalledProcessError) as error:
        print(f"ERROR: {error}", file=sys.stderr)
        raise SystemExit(1)
