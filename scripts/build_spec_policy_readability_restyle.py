#!/usr/bin/env python3
"""Build and verify the inert specification-policy readability-restyle package.

This script performs no owner act and writes no act record. The package
restyles the two in-force specification policies to CC-REV-8:

- `SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md` (CC-SPEC-1…11), bound by
  craft act 6 and row 7 of the general trusted-bootstrap transaction;
- `SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md` (CC-IMPACT-1…7), bound by craft
  act 7.

Its act phrase is `CONFIRM SPECIFICATION POLICY READABILITY RESTYLE` over
this package's manifest digest (`scripts/record_spec_policy_readability_restyle.py`).

Layout, under `.syzygy/governance/contracts/candidates/spec-policy-readability-restyle/`:

- `proposed/<file name>.patch` — one unified diff per policy. A patch, not a
  full copy: a second copy of every `**CC-SPEC-n — …**` lead would register
  duplicate clause definitions.
- `SPEC-POLICY-AMENDMENT-MANIFEST.txt` — two rows, codepoint-sorted, each
  the sha256 of the policy bytes its patch produces and the repo-relative
  path.

The proposed bytes are not applied while the package is a candidate: CG-7h
binds CC-SPEC to its performed digests until the act is performed.
`--apply --at-adoption` writes them in the change that records the act, and
refuses unless the recorder's `check` finds the act records valid. The order
is fixed: record, then apply.

`--check` prints `absent` and exits 0 when the package directory does not
exist. Otherwise it verifies:

1. the patch population is exactly the two policies;
2. each patch applies cleanly to its policy, touches only it and changes it;
3. structure is preserved per policy: the sequence of clause leads
   (`**CC-SPEC-n — Title.**`), the sequence of heading lines outside code
   fences, and no identifier (CC-*, RFCn-m, VIS-n, SEC-n, SDR-n) lost;
4. the manifest equals an exact regeneration over the patched bytes.

After adoption the patches no longer apply, so `--check` instead reports the
package as applied when both rows equal the current bytes.

Bare invocation refuses to overwrite the manifest; pass `--write` to
regenerate it. Once a packet quotes the manifest digest, a regeneration
retires the packet's argument.
"""

from __future__ import annotations

import argparse
import difflib
import hashlib
import importlib.util
import pathlib
import re
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
POLICIES = pathlib.PurePosixPath(
    ".syzygy/governance/contracts/candidates/policy-candidates")
PACKAGE = pathlib.PurePosixPath(
    ".syzygy/governance/contracts/candidates/spec-policy-readability-restyle")
PROPOSED = PACKAGE / "proposed"
MANIFEST = PACKAGE / "SPEC-POLICY-AMENDMENT-MANIFEST.txt"
RECORDER = pathlib.PurePosixPath("scripts/record_spec_policy_readability_restyle.py")
PATHS = tuple(sorted(str(POLICIES / name) for name in (
    "SHAPE-TO-SPEC-IMPACT-POLICY-CANDIDATE.md",
    "SPECIFICATION-ACCEPTANCE-POLICY-CANDIDATE.md")))
TITLE = "SPECIFICATION POLICY READABILITY RESTYLE AMENDMENT MANIFEST"
ROW = re.compile(r"^([0-9a-f]{64})  (\S[^\n]*)$", re.MULTILINE)
LEAD = re.compile(r"^\*\*CC-(?:SPEC|IMPACT)-\d+ — [^\n]*?\.\*\*", re.MULTILINE)
HEADING = re.compile(r"^#{1,6}\s")
FENCE = re.compile(r"^\s*(```|~~~)")
IDENTIFIER = re.compile(
    r"\bCC-[A-Z]+-\d+\b|\bRFC\d+-\d+\b|\bVIS-\d+\b|\bSEC-\d+\b|\bSDR-\d+\b")


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def patch_for(path: str) -> pathlib.PurePosixPath:
    return PROPOSED / f"{pathlib.PurePosixPath(path).name}.patch"


def patch_files(root: pathlib.Path) -> list[str]:
    base = root / PROPOSED
    if not base.is_dir():
        return []
    return sorted(p.relative_to(root).as_posix() for p in base.rglob("*")
                  if p.is_file())


def make_patch(path: str, old: bytes, new: bytes) -> str:
    """A `git apply`-able unified diff turning `old` into `new` at `path`."""
    if not (old.endswith(b"\n") and new.endswith(b"\n")):
        raise ValueError(f"{path}: make_patch needs newline-terminated bytes")
    lines = difflib.unified_diff(
        old.decode("utf-8").splitlines(keepends=True),
        new.decode("utf-8").splitlines(keepends=True),
        fromfile=f"a/{path}", tofile=f"b/{path}")
    return f"diff --git a/{path} b/{path}\n" + "".join(lines)


def apply_patch(path: str, body: bytes, patch: pathlib.Path) -> bytes:
    """`body` at repo-relative `path` with one diff applied, in a scratch tree."""
    with tempfile.TemporaryDirectory() as scratch:
        base = pathlib.Path(scratch)
        (base / path).parent.mkdir(parents=True, exist_ok=True)
        (base / path).write_bytes(body)
        touched = subprocess.run(["git", "apply", "--numstat", str(patch)],
                                 cwd=base, capture_output=True, text=True)
        names = [line.split("\t", 2)[2] for line in touched.stdout.splitlines()
                 if line.count("\t") >= 2]
        if touched.returncode == 0 and names != [path]:
            raise ValueError(f"{patch.name} touches {names or 'nothing'}, "
                             f"expected exactly `{path}`")
        done = subprocess.run(["git", "apply", "--whitespace=nowarn", str(patch)],
                              cwd=base, capture_output=True, text=True)
        if done.returncode != 0:
            raise ValueError(f"{patch.name} does not apply to the current bytes "
                             f"of `{path}`: {done.stderr.strip()}")
        return (base / path).read_bytes()


def proposed_bytes(root: pathlib.Path) -> tuple[dict[str, bytes], list[str]]:
    findings: list[str] = []
    out: dict[str, bytes] = {}
    for path in PATHS:
        current = root / path
        patch = root / patch_for(path)
        if not current.is_file():
            findings.append(f"policy absent: `{path}`")
            continue
        if not patch.is_file():
            continue  # reported by the population check
        try:
            body = apply_patch(path, current.read_bytes(), patch)
        except ValueError as error:
            findings.append(str(error))
            continue
        if body == current.read_bytes():
            findings.append(f"patch for `{path}` changes nothing")
        out[path] = body
    return out, findings


def headings(text: str) -> list[str]:
    out, fenced = [], False
    for line in text.splitlines():
        if FENCE.match(line):
            fenced = not fenced
            continue
        if not fenced and HEADING.match(line):
            out.append(line.rstrip())
    return out


def structure_findings(path: str, old: bytes, new: bytes) -> list[str]:
    before, after = old.decode("utf-8"), new.decode("utf-8")
    findings = []
    if LEAD.findall(before) != LEAD.findall(after):
        findings.append(f"`{path}` clause leads changed")
    if headings(before) != headings(after):
        findings.append(f"`{path}` heading lines changed")
    lost = sorted(set(IDENTIFIER.findall(before)) - set(IDENTIFIER.findall(after)))
    if lost:
        findings.append(f"`{path}` loses identifier(s) {', '.join(lost)}")
    return findings


def render(proposed: dict[str, bytes]) -> str:
    lines = [
        f"# {TITLE}",
        "# The two in-force specification policies; rows sorted by codepoint path.",
        "# Paths are relative to the repository root.",
        "# These rows bind only by the owner act that names this file's digest in",
        "# ACCEPTANCE-ACT-RECORD.md; until that act is performed they bind nothing.",
        "# Rows hash the PROPOSED bytes: each policy with its",
        "# proposed/<file name>.patch applied. They match the tree only after",
        "# --apply --at-adoption.",
    ]
    lines.extend(f"{sha256(proposed[path])}  {path}" for path in PATHS)
    return "\n".join(lines) + "\n"


def manifest_rows(text: str) -> list[tuple[str, str]]:
    return ROW.findall(text)


def applied(root: pathlib.Path) -> bool:
    """Both manifest rows already equal the current policy bytes."""
    target = root / MANIFEST
    if not target.is_file():
        return False
    rows = manifest_rows(target.read_text(encoding="utf-8"))
    if tuple(path for _sha, path in rows) != PATHS:
        return False
    return all((root / path).is_file()
               and sha256((root / path).read_bytes()) == sha
               for sha, path in rows)


def check(root: pathlib.Path = ROOT) -> list[str]:
    findings: list[str] = []
    expected = sorted(patch_for(path).as_posix() for path in PATHS)
    actual = patch_files(root)
    missing = sorted(set(expected) - set(actual))
    extra = sorted(set(actual) - set(expected))
    if missing:
        findings.append("missing patch(es): " + ", ".join(missing))
    if extra:
        findings.append("file(s) outside the two-policy population: "
                        + ", ".join(extra))
    proposed, applying = proposed_bytes(root)
    findings.extend(applying)
    for path, body in proposed.items():
        findings.extend(structure_findings(path, (root / path).read_bytes(), body))
    if findings:
        return findings
    target = root / MANIFEST
    if not target.is_file():
        findings.append(f"manifest missing: {MANIFEST}")
    elif target.read_text(encoding="utf-8") != render(proposed):
        findings.append("manifest differs from exact regeneration over the "
                        "proposed bytes")
    return findings


def _recorder():
    spec = importlib.util.spec_from_file_location("spec_policy_recorder",
                                                  ROOT / RECORDER)
    module = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(module)
    return module


def apply(root: pathlib.Path, at_adoption: bool, pins=None) -> int:
    """Install the proposed bytes, only once the owner's act is recorded."""
    if not at_adoption:
        print("refusing: --apply is the adoption step; pass --at-adoption in "
              "the change that records the act")
        return 2
    try:
        recorded = _recorder().check(root, pins=pins)
    except (ValueError, OSError) as error:
        print(f"refusing to apply: the act records do not validate: {error}")
        return 1
    if not recorded:
        print(f"refusing to apply: no owner act is recorded; run {RECORDER} "
              f"--record first")
        return 1
    findings = check(root)
    if findings:
        print("refusing to apply: the package does not verify")
        for finding in findings:
            print(f"  {finding}")
        return 1
    proposed, _ = proposed_bytes(root)
    for path in PATHS:
        (root / path).write_bytes(proposed[path])
        print(f"applied {path}")
    return 0


def write(root: pathlib.Path) -> int:
    proposed, findings = proposed_bytes(root)
    if findings or set(proposed) != set(PATHS):
        print("refusing to write: the patches do not produce both policies")
        for finding in findings:
            print(f"  {finding}")
        return 1
    (root / MANIFEST).write_text(render(proposed), encoding="utf-8")
    print(f"wrote {MANIFEST}")
    return 0


def author(root: pathlib.Path, drafts: pathlib.Path) -> int:
    """Write both patches from full draft files named like the policies."""
    for path in PATHS:
        draft = drafts / pathlib.PurePosixPath(path).name
        patch = root / patch_for(path)
        patch.parent.mkdir(parents=True, exist_ok=True)
        patch.write_text(make_patch(path, (root / path).read_bytes(),
                                    draft.read_bytes()), encoding="utf-8")
        print(f"wrote {patch_for(path)}")
    return write(root)


# --------------------------------------------------------------- selftest

def _fixture(scratch: pathlib.Path) -> pathlib.Path:
    """A root holding the real current policies and the real package."""
    root = scratch / "repo"
    for path in PATHS + tuple(patch_for(p).as_posix() for p in PATHS) + (
            MANIFEST.as_posix(),):
        (root / path).parent.mkdir(parents=True, exist_ok=True)
        (root / path).write_bytes((ROOT / path).read_bytes())
    return root


def selftest() -> int:
    if not (ROOT / PACKAGE).is_dir():
        print("absent — no package to exercise")
        return 0
    if applied(ROOT):
        print("applied — the fixtures need the unapplied package; nothing run")
        return 0
    cases: list[tuple[str, bool]] = []

    def refused(label, root, want):
        findings = check(root)
        ok = any(want in f for f in findings)
        if not ok:
            print(f"  ({label}: got {findings})")
        cases.append((label, ok))

    with tempfile.TemporaryDirectory() as scratch:
        root = _fixture(pathlib.Path(scratch))
        cases.append(("real package verifies", check(root) == []))
        cases.append(("real package is not applied", not applied(root)))
        spec_path = PATHS[1]
        spec_patch = root / patch_for(spec_path)
        saved_patch = spec_patch.read_bytes()
        proposed, _ = proposed_bytes(root)
        old = (root / spec_path).read_bytes()

        def with_draft(label, new, want):
            spec_patch.write_text(make_patch(spec_path, old, new), encoding="utf-8")
            refused(label, root, want)
            spec_patch.write_bytes(saved_patch)

        text = proposed[spec_path].decode()
        lead = LEAD.search(text).group(0)
        with_draft("changed clause lead refused",
                   text.replace(lead, lead.replace(" — ", " — Renamed "), 1).encode(),
                   "clause leads changed")
        heading = next(h for h in headings(text) if h.startswith("## "))
        with_draft("changed heading refused",
                   text.replace(heading + "\n", heading + " (renamed)\n", 1).encode(),
                   "heading lines changed")
        with_draft("lost identifier refused",
                   text.replace("RFC9-52", "RFC9-5x").encode(),
                   "loses identifier(s) RFC9-52")
        with_draft("empty patch refused", old, "does not apply")
        spec_patch.unlink()
        refused("missing patch refused", root, "missing patch(es)")
        spec_patch.write_bytes(saved_patch)
        stray = root / PROPOSED / "extra.patch"
        stray.write_text("x")
        refused("extra file refused", root, "outside the two-policy population")
        stray.unlink()
        (root / spec_path).write_bytes(old + b"\ndrift\n")
        refused("drifted policy refused", root, "differs from exact regeneration")
        (root / spec_path).write_bytes(old)
        manifest = root / MANIFEST
        saved_manifest = manifest.read_bytes()
        manifest.write_bytes(saved_manifest.replace(b"# Paths", b"# paths", 1))
        refused("stale manifest refused", root, "differs from exact regeneration")
        manifest.write_bytes(saved_manifest)
        cases.append(("apply without --at-adoption refused",
                      apply(root, at_adoption=False) == 2))
        recorder = _recorder()
        for rel in (recorder.AGGREGATE, recorder.INSTALL):
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text("# Synthetic record\n")
        cases.append(("apply before any act is recorded refused",
                      apply(root, at_adoption=True) == 1 and not applied(root)))
        cases.append(("restored fixture verifies again", check(root) == []))
        for path in PATHS:
            (root / path).write_bytes(proposed[path])
        cases.append(("installed bytes read as applied", applied(root)))
    failed = [label for label, ok in cases if not ok]
    for label, ok in cases:
        print(f"  {'PASS' if ok else 'FAIL'}  {label}")
    print(f"{len(cases)} fixtures, {len(failed)} failing")
    return 1 if failed else 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.splitlines()[0])
    mode = parser.add_mutually_exclusive_group()
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    mode.add_argument("--write", action="store_true")
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--author", metavar="DRAFTS",
                      help="write both patches from full drafts in DRAFTS")
    parser.add_argument("--at-adoption", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.author:
        return author(ROOT, pathlib.Path(args.author))
    if args.write:
        return write(ROOT)
    if args.apply:
        return apply(ROOT, args.at_adoption)
    if not args.check:
        print("refusing to overwrite the manifest; pass --write, or --check")
        return 2
    if not (ROOT / PACKAGE).is_dir():
        print("absent — no specification-policy restyle package")
        return 0
    if applied(ROOT):
        print("applied — both policies carry the manifest's bytes")
        return 0
    findings = check(ROOT)
    for finding in findings:
        print(f"FAIL {finding}")
    if findings:
        return 1
    print("specification-policy restyle manifest matches both patched policies; "
          "clause leads, headings and identifiers preserved")
    return 0


def _d10_superseded(modes):
    """True, after one SUPERSEDED line, when this run is one of `modes` and D10 is in effect.

    This run holds a performed act to bytes doctrine amendment D10 replaces;
    under RFC3-16 as D10 amends it, those bytes are history, not a lock, so the
    run stops instead of failing forever (`scripts/d10_supersession.py`).
    Without the helper beside this file (a partial copy) it always runs."""
    import importlib.util
    from pathlib import Path as _Path
    mode = next((m for m in modes if m in sys.argv[1:]), None)
    helper = _Path(__file__).resolve().with_name("d10_supersession.py")
    if mode is None or not helper.is_file():
        return False
    spec = importlib.util.spec_from_file_location("d10_supersession", helper)
    d10 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d10)
    return d10.superseded(f"{_Path(__file__).name} {mode}")


if __name__ == "__main__" and _d10_superseded(('--check', '--selftest')):
    sys.exit(0)
if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
