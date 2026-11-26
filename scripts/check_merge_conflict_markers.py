#!/usr/bin/env python3
"""Reject unresolved Git conflict delimiters in the checked-out commit."""

from __future__ import annotations

import argparse
from pathlib import Path
import re
import subprocess
import sys
import tempfile

from check_governance import _is_raw_review

START = b"<<<<<<< "
DIVIDER = b"======="
END = b">>>>>>> "
FENCE = re.compile(rb"^ {0,3}(`{3,}|~{3,})")


def marker_lines(body: bytes) -> list[int]:
    """Find delimiters at physical line starts outside fenced examples."""
    findings: list[int] = []
    pending_dividers: list[int] | None = None
    fence = b""
    for number, line in enumerate(body.splitlines(), 1):
        match = FENCE.match(line)
        if match:
            delimiter, info = match[1], line[match.end():]
            if fence:
                if delimiter.startswith(fence) and not info.strip(b" \t"):
                    fence = b""
                continue
            if delimiter.startswith(b"~") or b"`" not in info:
                fence = delimiter
                continue
        if fence:
            continue
        if line.startswith(START):
            findings.append(number)
            if pending_dividers is None:
                pending_dividers = []
        elif line.startswith(END):
            if pending_dividers is not None:
                findings.extend(pending_dividers)
            findings.append(number)
            pending_dividers = None
        elif line == DIVIDER and pending_dividers is not None:
            pending_dividers.append(number)
    return sorted(findings)


def git(repo: Path, *args: str, no_match_is_ok: bool = False) -> bytes:
    result = subprocess.run(("git", "--no-replace-objects", *args), cwd=repo, capture_output=True)
    if no_match_is_ok and result.returncode == 1:
        return b""
    result.check_returncode()
    return result.stdout


def scan(repo: Path, commit: str) -> tuple[int, list[tuple[str, int]]]:
    """Select candidate Git blobs, then classify exact bytes and report lines."""
    tree = git(repo, "ls-tree", "-r", "-z", commit)
    regular_blobs = {}
    for row in tree.split(b"\0")[:-1]:
        entry, path = row.split(b"\t", 1)
        mode, _, oid = entry.split(b" ")
        if mode in (b"100644", b"100755"):
            regular_blobs[path] = oid.decode("ascii")

    # A substring search also selects CR-only line endings. Force byte
    # searches independent of attributes, then exclude NUL-bearing blobs.
    candidates = git(
        repo, "grep", "-a", "-l", "-z", "-F", "--full-name", "--no-textconv",
        "--no-recurse-submodules", "-e", START.decode(), "-e", END.decode(),
        commit, "--", no_match_is_ok=True,
    )
    findings = []
    for candidate in candidates.split(b"\0")[:-1]:
        path = candidate.split(b":", 1)[1]
        if path not in regular_blobs:
            continue
        name = path.decode("utf-8", errors="surrogateescape")
        if name.endswith("-RAW.md") and _is_raw_review(name):
            continue
        body = git(repo, "cat-file", "blob", regular_blobs[path])
        if b"\0" not in body:
            findings.extend((name, line) for line in marker_lines(body))
    return len(regular_blobs), findings


def check(repo: Path) -> int:
    try:
        commit = git(repo, "rev-parse", "--verify", "HEAD^{commit}").strip().decode("ascii")
        population, findings = scan(repo, commit)
    except (OSError, subprocess.CalledProcessError):
        print("FAIL: unable to inspect the checked-out Git commit", file=sys.stderr)
        return 1

    for name, line in findings:
        print(f"{name!r}:{line}: unresolved merge conflict delimiter", file=sys.stderr)
    verdict = "FAIL" if findings else "PASS"
    print(f"{verdict}: {len(findings)} merge conflict delimiters in "
          f"{population} tracked regular blobs at {commit}")
    return int(bool(findings))


def selftest() -> int:
    triplet = b"<<<<<<< HEAD\nours\n=======\ntheirs\n>>>>>>> main\n"
    cases = [
        (triplet, [1, 3, 5]),
        (triplet.replace(b"\n", b"\r\n"), [1, 3, 5]),
        (triplet.replace(b"\n", b"\r"), [1, 3, 5]),
        (b"<<<<<<< HEAD\n=======\n", [1]),
        (b"=======\n>>>>>>> main\n", [2]),
        (b"example <<<<<<< HEAD\n=======\n >>>>>>> main\n", []),
        (b"````text\n```\n" + triplet + b"````\n" + triplet, [9, 11, 13]),
        (b"   ~~~text\n" + triplet + b"   ~~~~\t\n" + triplet, [8, 10, 12]),
        (b"```bad`info\n" + triplet, [2, 4, 6]),
        (b"\t~~~text\n" + triplet, [2, 4, 6]),
        (b"~~~~\n" + triplet + b"~~~~ not a close\n" + triplet, []),
    ]
    for body, expected in cases:
        assert marker_lines(body) == expected, (body, expected)

    with tempfile.TemporaryDirectory(prefix="merge-conflict-fixture-") as tmp:
        repo = Path(tmp)
        git(repo, "init", "--quiet", "--template=")
        paths = {
            "changed\tline\nname.md": triplet.replace(b"\n", b"\r"),
            "dossier-RAW.md": triplet,
            "docs/reviews/REVIEW-RAW.md": triplet,
            "docs/reviews/REVIEW.md": triplet,
            ".syzygy/governance/contracts/candidates/topic/reviews/REVIEW-RAW.md": triplet,
            ".syzygy/governance/contracts/candidates/topic/reviews/REVIEW.md": triplet,
            "binary": b"\0" + triplet,
            "fenced": b"```diff\n" + triplet + b"```\n",
            ".gitattributes": b"*.md -diff\n",
        }
        for name, contents in paths.items():
            path = repo / name
            path.parent.mkdir(parents=True, exist_ok=True)
            path.write_bytes(contents)
        (repo / "symlink").symlink_to("<<<<<<< HEAD")
        git(repo, "add", "--all")
        git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
            "-c", f"core.hooksPath={repo / 'no-hooks'}", "commit", "--quiet",
            "--no-gpg-sign", "-m", "fixture with committed delimiters")
        commit = git(repo, "rev-parse", "HEAD").strip().decode("ascii")

        # Neither changed tracked files nor new working-tree files can
        # change the population or verdict for the pinned commit.
        (repo / "dossier-RAW.md").write_text("uncorrupted worktree copy\n")
        (repo / "untracked").write_bytes(triplet)
        population, findings = scan(repo, commit)
        conflict_paths = (
            ".syzygy/governance/contracts/candidates/topic/reviews/REVIEW.md",
            "changed\tline\nname.md", "docs/reviews/REVIEW.md", "dossier-RAW.md",
        )
        expected = [(name, line) for name in conflict_paths for line in (1, 3, 5)]
        assert population == len(paths), population
        assert sorted(findings) == sorted(expected), (findings, expected)
        result = subprocess.run((sys.executable, __file__), cwd=repo, capture_output=True)
        assert result.returncode == 1, result.returncode
        assert triplet.splitlines()[0] not in result.stderr, result.stderr
        assert b"12 merge conflict delimiters" in result.stdout, result.stdout

        for name in conflict_paths:
            (repo / name).write_text("clean committed text\n")
            git(repo, "add", "--", name)
        git(repo, "-c", "user.name=Fixture", "-c", "user.email=fixture@example.invalid",
            "-c", f"core.hooksPath={repo / 'no-hooks'}", "commit", "--quiet",
            "--no-gpg-sign", "-m", "remove the unresolved delimiters")
        result = subprocess.run((sys.executable, __file__), cwd=repo, capture_output=True)
        assert result.returncode == 0 and not result.stderr, result.stderr
        assert b"0 merge conflict delimiters" in result.stdout, result.stdout

        clean = git(repo, "rev-parse", "HEAD").strip().decode("ascii")
        git(repo, "checkout", "--detach", "--quiet", commit)
        git(repo, "replace", commit, clean)
        assert git(repo, "rev-parse", f"refs/replace/{commit}").strip().decode("ascii") == clean
        result = subprocess.run((sys.executable, __file__), cwd=repo, capture_output=True)
        assert result.returncode == 1, result.stdout
        assert b"12 merge conflict delimiters" in result.stdout, result.stdout
        assert f"at {commit}".encode() in result.stdout, result.stdout
    print(f"selftest PASS: {len(cases)} line fixtures and one committed Git fixture")
    return 0


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument("--selftest", action="store_true")
    return selftest() if parser.parse_args().selftest else check(Path.cwd())


if __name__ == "__main__":
    raise SystemExit(main())
