#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# dependencies = []
# ///
"""Record/check an owner's version-tagged sign-off of a candidate package.

Scope A of `decisions/OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`:
for implementation-phase governed artifacts the owner signs off by selecting an
option in a structured question that names the package and a `major.minor`
version. No typed phrase and no digest argument exists. The sign-off binds a
git tag, `<package>-v<major>.<minor>`, on the commit that carries the applied
result; a later edit is a new version, never a retirement of the earlier one.

`--record <package> --version M.m --date YYYY-MM-DD --review <raw>
--owner-selection-quote "<the option label and question the owner answered>"`
validates, in this order, and writes nothing until every step passes:

1. the version is `major.minor` (no leading zeros) and the date a calendar
   form; the owner's selection quote is one non-empty line carrying no
   64-hex digest;
2. the version is not already recorded for the package;
3. the review raw's first four non-blank lines carry exactly one
   `Reviewed commit: <40 hex>`, one `Manifest SHA-256: <64 hex>` and one
   `Verdict:` line, which is `CONFIRM` or `CONFIRM WITH EXCEPTIONS`; REVISE or
   any other verdict refuses. A package that declares its reviewed `subject`
   is bound by that head digest: it must equal the sha256 of the subject's
   bytes in the working tree, before anything is applied. The reviewed commit
   is provenance and the base of step 5's comparison, never the binding; a
   rebase-merged review commit stays fetchable from its pull request's ref.
   The raw must also name the package's key, or the `review_alias` the
   package declares (its builder's script), so a review of another package
   cannot be offered for this one. A raw judging two packages at once carries
   a two-package head instead: its first six non-blank lines hold exactly one
   `Reviewed commit:` line and, for exactly two distinct labels, one
   `<LABEL> manifest SHA-256: <64 hex>` and one `<LABEL> verdict:` line each;
   a package declaring that `head_label` binds by its own two lines only, and
   an unlabelled manifest or verdict line beside them, any other head line
   naming a verdict or a digest, a half-labelled or repeated label, or a
   package with no label or a label the head lacks refuses as ambiguous. A
   package with no manifest (`package_digest`) binds instead by one
   `Package digest: <64 hex>` line in place of the manifest line: it must
   equal `sha256sum $(git ls-files <candidate dir> | LC_ALL=C sort) |
   sha256sum` over exactly the files the reviewed commit tracked there, each
   hashed from the working tree (a sibling disposition record added since is
   outside that set). A head carrying both digest lines, or more than one
   `Package digest:` line, refuses as ambiguous; a `Package digest:` head
   binds no package that has a manifest, and a manifest head never binds a
   `package_digest` package. Such a package's record carries its applied
   subject rows in manifest row form, in place of a manifest. A
   package signed under a plain owner direction extending Scope A names that
   direction (`extension`), which must exist;
4. for `CONFIRM WITH EXCEPTIONS`, the raw's `## Findings` section numbers its
   findings continuously as `**Finding N — title** (blocking|revise|note)`,
   where the severity word may carry a qualifier after it ("(note, for the
   owner)", "(note: reported for the owner, not resolved)"); the leading
   word is the severity, and a `note` whose qualifier names "blocking" or
   "revise" is refused as ambiguous rather than read either way; every
   finding is a `note`. A note's qualifier fails closed: it is read as a note
   only when each comma-separated clause is one of `QUALIFIER_CLAUSES`
   ("for the owner", "for the owner's view", "reported for the owner", "not
   resolved", "editorial"), and any other wording refuses as ambiguous; and `--disposition <record>` names the raw on a
   `Reviewed record:` line and numbers exactly the raw's findings. For either
   verdict the `## Findings` section is read and fails closed: a line that
   opens a finding in any other form (a heading, a bullet, an `F<n>` label),
   or a blocking or revise severity written as a tag (first in parentheses or
   brackets, or after `Severity:`) that the classifier did not consume,
   refuses; a bare `CONFIRM` over a blocking or revise finding refuses as
   self-contradictory. A package may declare the opening line of a
   prior-round recap that closes the raw's findings section
   (`findings_end`); findings are then read before it only, the opener must
   occur exactly once, and a finding or blocking/revise tag inside the recap
   refuses. The package key or alias binds only as a whole token
   on a line outside any fenced block, never as part of a longer name;
5. the candidate package directory, and any further directory the package
   declares (a specification change under `openspec/changes/`), at the
   working tree equals the package at the commit the review read (sibling
   `ROUND-<n>-DISPOSITIONS.md` records inside the candidate directory, and
   the named disposition, are not package bytes; in a further directory
   every file is);
6. the package's own builder check passes on the unapplied package.

Then the package's patches are applied through its builder, the dedicated
record `decisions/<STEM>-SIGNOFF-v<M.m>.md` is written (for a package that
installs a registry entry, naming that entry and the SHA-256 of its installed
bytes, which `--check` re-hashes), one marked block is
appended to `ACCEPTANCE-ACT-RECORD.md`, and the tag to create is printed.

`--check <package> --version M.m` reports "not performed" and exits 0 when no
record exists, fails on a partial record, re-validates the review head and
findings, regenerates the record and the aggregate block exactly, and, when the
version is the package's latest, requires the applied tree. `--selftest` runs
a mutation fixture per predicate in temporary git repositories.
"""
from __future__ import annotations

import argparse
import datetime
import hashlib
import importlib
import json
import os
import pathlib
import re
import subprocess
import sys
import tempfile
import traceback
import shutil
import stat
from dataclasses import dataclass, replace as dataclasses_replace
from typing import Callable

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import record_pwb_behavior_amendment_acts as beh  # noqa: E402

DECISIONS = pathlib.Path(".syzygy/governance/decisions")
AGGREGATE_REL = DECISIONS / "ACCEPTANCE-ACT-RECORD.md"
DIRECTION_REL = DECISIONS / "OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md"
POC_EXTENSION_REL = DECISIONS / "OWNER-DIRECTION-SCOPE-A-POC-AMENDMENTS-2026-10-14.md"
#: The owner's 2026-10-15 extension of Scope A to the one CAP1 package.
CAP1_CONSENT_EXTENSION_REL = (DECISIONS /
                              "OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md")
CANDIDATES = pathlib.Path(".syzygy/governance/contracts/candidates")
VERSION_RE = re.compile(r"^(0|[1-9][0-9]*)\.(0|[1-9][0-9]*)$")
DATE_RE = re.compile(r"^\d{4}-\d{2}-\d{2}$")
HEX64_RE = re.compile(r"[0-9a-f]{64}")
COMMIT_LINE_RE = re.compile(r"^Reviewed commit: ([0-9a-f]{40})$")
MANIFEST_LINE_RE = re.compile(r"^Manifest SHA-256: [0-9a-f]{64}$")
VERDICT_LINE_RE = re.compile(r"^Verdict:\s*(.*?)\s*$")
VERDICTS = ("CONFIRM", "CONFIRM WITH EXCEPTIONS")
SEVERITY_RE = re.compile(
    r"^\*\*Finding (\d+) [—–-] [^\n]*?\*\*\s*\((blocking|revise|note)(?![A-Za-z])([^)\n]*)\)",
    re.MULTILINE)
#: A line that opens a finding in any markup: optional heading, bullet, ordered
#: or quote prefixes and emphasis, then `Finding <n>` or a short `F<n>` label,
#: then a title separator (a dash, colon, full stop or opening bracket) or the
#: line end, so a wrapped prose line that merely begins "F20 row was" or
#: "Finding 2)." is not an opener. What ``SEVERITY_RE`` consumed is blanked
#: before this is tried.
FINDING_OPENER_RE = re.compile(
    r"^[ \t]{0,3}(?:(?:#{1,6}|[-*+]|\d+[.)])[ \t]+|>[ \t]*)*[*_`\[]*[ \t]*"
    r"(?:Finding[ \t]+#?\d+|F\d+)[*_`\]]*[ \t]*(?:[—–\-:.(\[]|$)", re.IGNORECASE)
#: A blocking or revise severity written as a tag: first in parentheses or
#: brackets, or after a `Severity:` label. A bare word in prose is not a tag.
SEVERITY_TAG_RE = re.compile(
    r"(?:[(\[][ \t]*|severity[ \t]*[:=][ \t]*)[*_`]*[ \t]*(?:blocking|revise)(?![A-Za-z])",
    re.IGNORECASE)
#: The only clauses a `note` qualifier may carry; anything else, a stronger
#: severity in any spelling included, makes the finding ambiguous.
QUALIFIER_CLAUSES = ("for the owner", "for the owner's view", "reported for the owner",
                     "not resolved", "editorial")
MANIFEST_DIGEST_RE = re.compile(r"^Manifest SHA-256: ([0-9a-f]{64})$")
#: A package with no manifest (P-100's round-3 raw) binds by a directory
#: digest: the brief's `sha256sum $(git ls-files <dir> | LC_ALL=C sort) |
#: sha256sum`, recomputed here over exactly the files the reviewed commit
#: tracked under the package directory.
PACKAGE_DIGEST_RE = re.compile(r"^Package digest: ([0-9a-f]{64})$")
#: A two-package head (one raw judging two packages, as N9's round 2 did):
#: each package binds by its own labelled manifest line and its own labelled
#: verdict line, all within the first six non-blank lines.
LABELLED_MANIFEST_RE = re.compile(r"^([A-Z][A-Z0-9]*) manifest SHA-256: ([0-9a-f]{64})$")
LABELLED_VERDICT_RE = re.compile(r"^([A-Z][A-Z0-9]*) verdict:\s*(.*?)\s*$")
#: Any head line naming a verdict or a digest; in a two-package head each must
#: be one exact labelled form, so a near miss is refused rather than skipped.
HEAD_KEYWORD_RE = re.compile(r"verdict|sha-?256|digest", re.IGNORECASE)
TWO_PACKAGE_HEAD_LINES = 6
SIBLING_RECORD_RE = re.compile(r"(^|/)ROUND-\d+-DISPOSITIONS\.md$")
FINDINGS_HEADING = "## Findings"


@dataclass(frozen=True)
class Package:
    """One covered package. The three callables take the repository root."""
    key: str
    title: str
    kind: str                        # "contract successor" | "behavior amendment"
    candidate: pathlib.Path
    record_stem: str
    check: Callable[[pathlib.Path], list[str]]
    apply: Callable[[pathlib.Path], int]
    applied: Callable[[pathlib.Path], bool]
    #: Further directories whose bytes the review read (an OpenSpec change).
    also: tuple[pathlib.Path, ...] = ()
    #: The reviewed subject, pre-apply; the raw's head digest must hash it.
    subject: pathlib.Path | None = None
    #: A registry entry the sign-off installs. The record then names it with
    #: the SHA-256 of its installed bytes (RFC3-16(b) item 3: approving a path
    #: never approves later content at it), and `--check` re-hashes it.
    installed: pathlib.Path | None = None
    #: The subject's reviewed bytes when they are not the file on disk (a
    #: successor carried as patches to an installed version): computed
    #: pre-apply from the tree, and hashed in place of ``subject``.
    subject_bytes: Callable[[pathlib.Path], bytes] | None = None
    #: Owner-selectable options (``--option``); the record names those taken.
    options: tuple[str, ...] = ()
    #: For a package with options: apply with the options taken.
    apply_with: Callable[[pathlib.Path, frozenset[str]], int] | None = None
    #: For a package with options: the options the applied tree carries, so
    #: ``--check`` holds the record's options line to the tree.
    applied_options: Callable[[pathlib.Path], frozenset[str]] | None = None
    #: The label this package's lines carry in a two-package review head
    #: (``<LABEL> manifest SHA-256:`` and ``<LABEL> verdict:``). A package
    #: without one is never bound by a two-package head.
    head_label: str | None = None
    #: A plain owner direction extending Scope A to this package's kind; the
    #: record names it, and recording or checking refuses when it is missing.
    extension: pathlib.Path | None = None
    #: A second name the raw may use for the package, its builder's script
    #: (a two-package raw named the POC half only by the builder it ran). The
    #: subject digest still binds; this only satisfies the naming guard.
    review_alias: str | None = None
    #: A fixed paragraph the dedicated record carries under "Consequences
    #: recorded with the sign-off" (a known effect of signing, such as pins it
    #: makes stale); part of the regenerated bytes.
    record_note: str = ""
    #: The package has no manifest: its review head carries `Package digest:`,
    #: which must equal the directory digest over exactly the files the
    #: reviewed commit tracked under ``candidate``, recomputed from the tree.
    #: A `Manifest SHA-256:` head never binds it, and a `Package digest:` head
    #: binds no other package.
    package_digest: bool = False
    #: For a package without a manifest: the subjects whose applied SHA-256
    #: rows the dedicated record carries in its place (`<sha256>  <path>`, the
    #: manifest row form, so the reconciliation and later-row readers take the
    #: record as this package's manifest). Regenerated by ``--check`` from the
    #: recorded rows, never from the tree.
    applied_subjects: tuple[pathlib.Path, ...] = ()
    #: The opening of a prior-round recap that closes the raw's findings
    #: section (``split_recap``); findings are read before it only.
    findings_end: str | None = None


def _module(name: str):
    return importlib.import_module(name)


def _rows_hash_tree(root: pathlib.Path, manifest: pathlib.Path) -> bool:
    target = root / manifest
    if not target.is_file():
        return False
    rows = beh.ROW_RE.findall(target.read_text(encoding="utf-8"))
    if not rows:
        return False
    for sha, path in rows:
        file = root / path
        if not file.is_file():
            return False
        actual = beh.digest(file.read_bytes())
        # A later performed act or sign-off may have re-patched this row; it
        # is history when the tree hashes to that source's own manifest row.
        if actual != sha and actual not in beh._later_rows(
                root, None, path, skip_manifest=manifest):
            return False
    return True


# --- a package of bare patches (no manifest, no builder) --------------------

POC_CHANGE = pathlib.Path("openspec/changes/three-surface-poc-experience")
POC_SPEC = POC_CHANGE / "specs/three-surface-poc-experience/spec.md"
POC_GOVERNING = POC_CHANGE / "GOVERNING-DEPENDENCIES.md"
#: The six signed POC subjects, the same population and order as the
#: block-provenance manifest's rows.
POC_SUBJECTS = tuple(sorted((
    POC_CHANGE / ".openspec.yaml", POC_CHANGE / "CONTRACT-COVERAGE.md", POC_GOVERNING,
    POC_CHANGE / "design.md", POC_CHANGE / "proposal.md", POC_SPEC,
), key=lambda path: path.as_posix()))
PATCH_TARGET_RE = re.compile(r"^\+\+\+ b/(.+)$", re.MULTILINE)


def _patches(root: pathlib.Path, proposed: pathlib.Path) -> list[pathlib.Path]:
    return sorted((root / proposed).glob("*.patch"), key=lambda path: path.name)


def patch_package_findings(root: pathlib.Path, proposed: pathlib.Path,
                           subjects: tuple[pathlib.Path, ...], spec: pathlib.Path,
                           governing: pathlib.Path, generate: Callable) -> list[str]:
    """The checks the package's review ran, in a scratch copy of the subjects:
    every patch targets a subject, applies (`git apply --check`, then in
    order), and the generator over the patched spec reproduces the patched
    dependency declaration byte for byte."""
    patches = _patches(root, proposed)
    if not patches:
        return [f"no patches under {proposed.as_posix()}"]
    names = {rel.as_posix() for rel in subjects}
    findings = []
    for patch in patches:
        targets = PATCH_TARGET_RE.findall(patch.read_text(encoding="utf-8"))
        if len(targets) != 1 or targets[0] not in names:
            findings.append(f"{patch.name} targets {targets}, not exactly one subject")
    if findings:
        return findings
    with tempfile.TemporaryDirectory() as directory:
        base = pathlib.Path(directory)
        for rel in subjects:
            (base / rel).parent.mkdir(parents=True, exist_ok=True)
            (base / rel).write_bytes((root / rel).read_bytes())
        for patch in patches:
            done = subprocess.run(["git", "apply", "--check", "--whitespace=nowarn", str(patch)],
                                  cwd=base, capture_output=True, text=True)
            if done.returncode != 0:
                findings.append(f"{patch.name} does not apply: {done.stderr.strip()}")
        if findings:
            return findings
        for patch in patches:
            done = subprocess.run(["git", "apply", "--whitespace=nowarn", str(patch)],
                                  cwd=base, capture_output=True, text=True)
            if done.returncode != 0:
                return [f"{patch.name} does not apply in order: {done.stderr.strip()}"]
        out, errors = generate((base / spec).read_text(encoding="utf-8"))
        if errors or out is None:
            return ["patched spec warrants do not validate: " + " | ".join(errors)]
        if out.encode("utf-8") != (base / governing).read_bytes():
            findings.append("patched GOVERNING-DEPENDENCIES.md differs from its regeneration")
    return findings


def patch_package_apply(root: pathlib.Path, proposed: pathlib.Path, findings) -> int:
    """Apply the patches in place, only after the package's checks pass."""
    problems = findings(root)
    if problems:
        print("refusing to apply: " + " | ".join(problems))
        return 1
    for patch in _patches(root, proposed):
        done = subprocess.run(["git", "apply", "--whitespace=nowarn", str(patch)],
                              cwd=root, capture_output=True, text=True)
        if done.returncode != 0:
            print(f"{patch.name} did not apply: {done.stderr.strip()}")
            return 1
        print(f"applied {patch.name}")
    return 0


def p115_package_apply(root: pathlib.Path) -> int:
    """Existing internal subject-only operation, with its own single ledger."""
    return p115_attempt(root, operation="apply")


def p115_tracked(root: pathlib.Path, head: bytes, index: bytes,
                  exempt: frozenset[pathlib.Path] = frozenset()) -> None:
    """Read actual Git blob bytes/modes, independent of the index stat cache.

    Only the separately checked intended target bodies may be exempted during
    publication. Their tracked modes and every index flag are still checked.
    No index refresh, normalization or optional-lock write is performed.
    """
    entries = {}
    for row in index.split(b"\0"):
        if not row:
            continue
        metadata, path = row.split(b"\t", 1)
        mode, oid, stage = metadata.split()
        if stage != b"0" or mode not in {b"100644", b"100755", b"120000"} or path in entries:
            raise ValueError("P115 tracked checkout has an unsupported index stage, kind or duplicate path")
        entries[path] = mode, oid
    tree = {}
    data = subprocess.run(["git", "ls-tree", "-r", "-z", head.decode().strip()], cwd=root,
                          capture_output=True, check=True).stdout
    for row in data.split(b"\0"):
        if row:
            metadata, path = row.split(b"\t", 1)
            mode, kind, oid = metadata.split()
            if kind != b"blob" or path in tree:
                raise ValueError("P115 tracked checkout has an unsupported HEAD kind or duplicate path")
            tree[path] = mode, oid
    if entries != tree:
        raise ValueError("P115 tracked index bytes/modes do not match the admitted HEAD")
    for option in ("-v", "-f"):
        flags = subprocess.run(["git", "--no-optional-locks", "ls-files", option, "-z"],
                               cwd=root, capture_output=True, check=True).stdout.split(b"\0")
        flags = [row for row in flags if row]
        if (len(flags) != len(entries) or any(row[:2] != b"H " for row in flags)
                or {row[2:] for row in flags} != set(entries)):
            raise ValueError("P115 tracked checkout has unsupported index flags")
    algorithm = subprocess.run(["git", "rev-parse", "--show-object-format"], cwd=root,
                               capture_output=True, text=True, check=True).stdout.strip()
    if algorithm not in {"sha1", "sha256"}:
        raise ValueError("P115 tracked checkout has an unsupported Git object format")
    for raw_path, (mode, oid) in entries.items():
        rel = pathlib.Path(os.fsdecode(raw_path))
        if rel.is_absolute() or ".." in rel.parts:
            raise ValueError("P115 tracked path escapes the checkout")
        path = root / rel
        info = path.lstat()
        if stat.S_ISLNK(info.st_mode):
            actual_mode, body = b"120000", os.fsencode(os.readlink(path))
        elif stat.S_ISREG(info.st_mode):
            fd = os.open(path, os.O_RDONLY | os.O_NOFOLLOW | os.O_NONBLOCK)
            with os.fdopen(fd, "rb") as stream:
                info = os.fstat(stream.fileno())
                if not stat.S_ISREG(info.st_mode):
                    raise ValueError(f"P115 tracked path is not a regular file: {rel}")
                actual_mode = b"100755" if info.st_mode & 0o111 else b"100644"
                body = stream.read() if rel not in exempt else None
        else:
            raise ValueError(f"P115 tracked path has an unsupported working kind: {rel}")
        if actual_mode != mode:
            raise ValueError(f"P115 tracked working mode differs from the admitted object: {rel}")
        if rel not in exempt:
            actual = hashlib.new(algorithm, b"blob " + str(len(body)).encode() + b"\0" + body).hexdigest().encode()
            if actual != oid:
                raise ValueError(f"P115 tracked working bytes differ from the admitted object: {rel}")


def p115_clean(root: pathlib.Path) -> tuple[bytes, bytes]:
    """Whole checkout boundary; ignored build outputs are outside this gate."""
    state = subprocess.run(["git", "--no-optional-locks", "status", "--porcelain=v1", "-z",
                            "--untracked-files=all", "--ignore-submodules=none"],
                           cwd=root, capture_output=True, check=True).stdout
    if state:
        raise ValueError("refusing P115 recording: index, worktree and untracked-not-ignored files must be clean")
    head = subprocess.run(["git", "rev-parse", "HEAD"], cwd=root,
                          capture_output=True, check=True).stdout
    index = subprocess.run(["git", "ls-files", "--stage", "-z"], cwd=root,
                           capture_output=True, check=True).stdout
    p115_tracked(root, head, index)
    return head, index


def p115_apply_batch(root: pathlib.Path, journal: pathlib.Path, before: dict,
                       proposed: dict, patches: tuple, evidence: dict) -> None:
    """The identical captured batch runs only in an owned private projection."""
    reference = _module("prepare_three_surface_poc_governedby_reference_recording")
    projection, copies, metadata = (journal / name for name in ("projection", "patches", "git"))
    projection.mkdir()
    copies.mkdir()
    for rel in reference.SUBJECTS:
        path = projection / rel
        path.parent.mkdir(parents=True, exist_ok=True)
        path.write_bytes(before[rel])
    names = []
    rows = []
    for number, (rel, body) in enumerate(patches):
        path = copies / f"{number}.patch"
        path.write_bytes(body)
        names.append(str(path))
        rows.append({"source": rel.as_posix(), "copy": str(path), "bytes": len(body),
                     "sha256": hashlib.sha256(body).hexdigest()})
    # Child repository location is closed; credentials/config/PATH and the
    # process environment are unchanged. No parent Git metadata is discovered.
    env = os.environ.copy()
    for name in ("GIT_DIR", "GIT_WORK_TREE", "GIT_COMMON_DIR", "GIT_INDEX_FILE",
                 "GIT_OBJECT_DIRECTORY", "GIT_ALTERNATE_OBJECT_DIRECTORIES", "GIT_QUARANTINE_PATH",
                 "GIT_GRAFT_FILE", "GIT_SHALLOW_FILE", "GIT_PREFIX", "GIT_NAMESPACE",
                 "GIT_CEILING_DIRECTORIES", "GIT_DISCOVERY_ACROSS_FILESYSTEM"):
        env.pop(name, None)
    env.update(GIT_DIR=str(metadata), GIT_WORK_TREE=str(projection), GIT_INDEX_FILE=str(metadata / "index"))
    batch = ["git", "apply", "--whitespace=nowarn", "--unidiff-zero"]
    evidence.update(orderedPatches=rows, batchSha256=hashlib.sha256(json.dumps(
        [(r["source"], r["sha256"]) for r in rows], separators=(",", ":")).encode()).hexdigest(),
        cwd=str(projection), gitDir=str(metadata), gitWorkTree=str(projection),
        gitIndexFile=str(metadata / "index"), commands=[])

    def run(argv):
        row = {"argv": argv, "cwd": str(projection), "returncode": None}
        evidence["commands"].append(row)
        done = subprocess.run(argv, cwd=projection, env=env, capture_output=True, text=True)
        row.update(returncode=done.returncode, stdout=done.stdout, stderr=done.stderr)
        return done

    done = run(["git", "init", "--quiet", "--template="])
    if done.returncode:
        raise ValueError("P115 private Git initialization failed: " + done.stderr.strip())
    done = run([*batch, "--check", *names])
    if done.returncode:
        raise ValueError("P115 preflight refused: " + done.stderr.strip())
    if any(p115_read(pathlib.Path(row["copy"])) != body for row, (_rel, body) in zip(rows, patches)):
        raise ValueError("P115 captured private patch copies changed after preflight")
    done = run([*batch, *names])
    if done.returncode:
        raise ValueError(f"P115 batch apply failed ({done.returncode}): " + done.stderr.strip())
    files = set()
    directories = {parent for rel in reference.SUBJECTS for parent in rel.parents if parent != pathlib.Path(".")}
    for path in projection.rglob("*"):
        kind = path.lstat().st_mode
        rel = path.relative_to(projection)
        if stat.S_ISREG(kind):
            files.add(rel)
        elif not stat.S_ISDIR(kind) or rel not in directories:
            raise ValueError("P115 private projection has unexpected/nonregular output: " + str(rel))
    if (files != set(reference.SUBJECTS)
            or any(p115_read(projection / rel) != proposed[rel] for rel in reference.SUBJECTS)
            or p115_read(projection / reference.SUBJECTS[0]) != before[reference.SUBJECTS[0]]
            or sum(p115_read(projection / rel) != before[rel] for rel in reference.SUBJECTS) != 5
            or any(hashlib.sha256(p115_read(projection / rel)).hexdigest() != sha
                   for sha, rel in reference.manifest_rows(root))):
        raise ValueError("P115 private batch outputs differ from exact six subjects/five changes/manifest")
    evidence["validatedOutputs"] = {str(rel): hashlib.sha256(proposed[rel]).hexdigest()
                                    for rel in reference.SUBJECTS}


def p115_read(path: pathlib.Path) -> bytes | None:
    if path.is_symlink() or (path.exists() and not path.is_file()):
        raise ValueError(f"P115 transaction path is not a regular file: {path}")
    return path.read_bytes() if path.exists() else None


def p115_identity(path: pathlib.Path) -> tuple[int, int] | None:
    return (path.lstat().st_dev, path.lstat().st_ino) if path.exists() else None


def p115_exception(failure: BaseException) -> dict:
    """Freeze both visible and suppressed diagnostic edges, without locals."""
    pending, identities, nodes = [failure], {id(failure): 0}, []
    for error in pending:
        node = {"id": identities[id(error)],
                "type": type(error).__module__ + "." + type(error).__qualname__,
                "message": str(error), "suppressContext": error.__suppress_context__}
        for name, target in (("cause", error.__cause__), ("context", error.__context__)):
            if target is not None and id(target) not in identities:
                identities[id(target)] = len(pending)
                pending.append(target)
            node[name] = None if target is None else identities[id(target)]
        if isinstance(error, OSError):
            node["errno"] = error.errno
            for field in ("filename", "filename2"):
                value = getattr(error, field)
                kind = type(value).__module__ + "." + type(value).__qualname__
                if value is None:
                    node[field], evidence = None, {"type": kind}
                else:
                    try:
                        raw = os.fsencode(value)
                        node[field] = os.fsdecode(raw)
                        evidence = {"type": kind, "filesystemBytesHex": raw.hex()}
                    except TypeError:
                        # OSError accepts non-path diagnostic objects too.
                        node[field], evidence = repr(value), {"type": kind, "representation": "repr"}
                node[field + "Evidence"] = evidence
        if isinstance(error, subprocess.CalledProcessError):
            # Native captures are diagnostic evidence, including empty/absent
            # values and arbitrary bytes. Do not normalize or replacement-decode.
            def captured(value):
                field = {"type": type(value).__module__ + "." + type(value).__qualname__}
                if value is None:
                    field["value"] = None
                elif isinstance(value, bytes):
                    field["bytesHex"] = value.hex()
                elif isinstance(value, str):
                    field["text"] = value
                elif isinstance(value, os.PathLike):
                    raw = os.fspath(value)
                    field["path"] = ({"type": "builtins.bytes", "bytesHex": raw.hex()}
                                     if isinstance(raw, bytes) else {"type": "builtins.str", "text": raw})
                else:
                    field["representation"] = repr(value)
                return field
            command = error.cmd
            command_evidence = ({"type": type(command).__module__ + "." + type(command).__qualname__,
                                 "items": [captured(value) for value in command]}
                                if isinstance(command, (list, tuple)) else captured(command))
            node["process"] = {"returncode": error.returncode, "command": command_evidence,
                               "stdout": captured(error.stdout), "output": captured(error.output),
                               "stderr": captured(error.stderr)}
        nodes.append(node)
    return {"root": 0, "nodes": nodes, "secondaryExceptions": getattr(failure, "_p115_secondary", []),
            "traceback": "".join(traceback.format_exception(type(failure), failure,
                                                            failure.__traceback__, chain=True))}


def p115_cleanup_stage(staged: pathlib.Path, identity: tuple[int, int]) -> None:
    """Only the regular inode created for this stage may be removed."""
    try:
        info = staged.lstat()
    except FileNotFoundError:
        return  # Replacement consumed the stage; no unlink is necessary.
    if not stat.S_ISREG(info.st_mode) or (info.st_dev, info.st_ino) != identity:
        raise ValueError(f"P115 stage cleanup ownership unproven: {staged}")
    staged.unlink()


def p115_stage(path: pathlib.Path, body: bytes, *, on_stage=lambda path, identity: None) -> pathlib.Path:
    """Close complete bytes on the target filesystem before publication."""
    fd, name = tempfile.mkstemp(prefix=".p115-", dir=path.parent)
    staged = pathlib.Path(name)
    identity = os.fstat(fd).st_dev, os.fstat(fd).st_ino
    try:
        with os.fdopen(fd, "wb") as stream:
            stream.write(body)
            if path.exists():
                os.fchmod(stream.fileno(), path.stat().st_mode & 0o777)
            stream.flush()
            os.fsync(stream.fileno())
        on_stage(staged, identity)
        return staged
    except BaseException as failure:
        try:
            p115_cleanup_stage(staged, identity)
        except BaseException as cleanup_error:
            failure._p115_secondary = [*getattr(failure, "_p115_secondary", []), p115_exception(cleanup_error)]
        raise


def p115_publish(path: pathlib.Path, body: bytes, *, expected: bytes | None,
                  expected_identity, guard=lambda staged, identity, body: None,
                  published=lambda identity: None) -> None:
    """One bounded native publication; equality alone never grants ownership."""
    token = {}
    staged = p115_stage(path, body, on_stage=lambda _p, identity: token.update(identity=identity))
    operation_error = None
    try:
        if p115_identity(staged) != token["identity"] or p115_read(staged) != body:
            raise ValueError(f"P115 owned stage changed: {staged}")
        guard(staged, token["identity"], body)
        if p115_observe(staged) != (body, token["identity"]):
            raise ValueError(f"P115 owned stage changed: {staged}")
        if p115_observe(path) != (expected, expected_identity):
            raise ValueError(f"P115 publication destination changed: {path}")
        if expected is None:
            os.link(staged, path)  # EEXIST refuses even a same-byte foreign creator.
        else:
            os.replace(staged, path)
        # This must precede fallible private cleanup and caller wrapper faults.
        published(token["identity"])
    except BaseException as failure:
        operation_error = failure
        raise
    finally:
        try:
            p115_cleanup_stage(staged, token["identity"])
        except BaseException as cleanup_error:
            # Retain the first native-unlink error even when a retry cleans up.
            try:
                p115_cleanup_stage(staged, token["identity"])
            except BaseException as retry_error:
                cleanup_error._p115_secondary = [p115_exception(retry_error)]
            if operation_error is None:
                raise
            operation_error._p115_secondary = [*getattr(operation_error, "_p115_secondary", []),
                                              p115_exception(cleanup_error)]


def p115_write(path: pathlib.Path, body: bytes, **publication) -> None:
    p115_publish(path, body, **publication)


@dataclass(frozen=True)
class P115Publication:
    attempt: str
    path: pathlib.Path
    identity: tuple[int, int]
    kind: int
    body: bytes
    sha256: str


def p115_publications(publications: dict) -> dict:
    return {str(rel): {"attempt": token.attempt, "path": str(token.path), "kind": "regular",
                      "device": token.identity[0], "inode": token.identity[1], "sha256": token.sha256}
            for rel, token in publications.items()}


def p115_observe(path: pathlib.Path) -> tuple[bytes | None, tuple[int, int] | None]:
    """One bounded regular-file/absence observation; reader errors are not absence."""
    try:
        info = path.lstat()
    except FileNotFoundError:
        return None, None
    if not stat.S_ISREG(info.st_mode):
        raise ValueError(f"P115 recovery path is not a regular file: {path}")
    identity = info.st_dev, info.st_ino
    body = p115_read(path)
    after = path.lstat()
    if body is None or not stat.S_ISREG(after.st_mode) or (after.st_dev, after.st_ino) != identity:
        raise ValueError(f"P115 recovery path changed during observation: {path}")
    return body, identity


def p115_recovery_observation(root: pathlib.Path, before: dict, before_identity: dict,
                               owned_order: list[pathlib.Path], restored: dict, blocked: set,
                               conflicts: list[str], errors: list[dict], identity: str) -> dict:
    """Observe every captured target; known conflicts remain negative without duplication."""
    started = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
    rows = []
    for rel, original in before.items():
        try:
            body, actual_identity = p115_observe(root / rel)
            row = {"path": str(rel), "sha256": None if body is None else hashlib.sha256(body).hexdigest(),
                   "identity": actual_identity, "kind": "absent" if body is None else "regular"}
            if rel not in blocked:
                witnessed = rel not in owned_order or rel in restored
                expected_identity = restored.get(rel) if rel in owned_order else before_identity[rel]
                if not witnessed or body != original or actual_identity != expected_identity:
                    reason = ("restored preimage/identity unverified" if rel in owned_order else
                              "independent change retained; no owned write")
                    conflicts.append(f"{rel}: {reason}")
                    blocked.add(rel)
            row["verified"] = rel not in blocked
        except BaseException as error:
            snapshot = p115_exception(error)
            node = snapshot["nodes"][0]
            row = {"path": str(rel), "verified": False, "kind": "unverified",
                   "error": {k: node[k] for k in ("type", "message", "errno") if k in node}}
            if rel not in blocked:
                conflicts.append(f"{rel}: recovery inspection failed: {error}")
                errors.append(snapshot)
                blocked.add(rel)
        rows.append(row)
    return {"observationId": identity, "startedAt": started,
            "endedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
            "scope": "exclusive-checkout sequential read-only observation; no atomic/CAS/beyond-window guarantee",
            "targetCount": len(before), "targets": rows,
            "complete": not conflicts and not errors and all(r["verified"] for r in rows)}


def p115_recover(root: pathlib.Path, before: dict, outputs: dict, before_identity: dict,
                  owned_order: list[pathlib.Path], publications: dict, *,
                  restored: dict | None = None, blocked: set | None = None) -> tuple[list[str], list[dict]]:
    """Every governed output needs the same successful-native-publication token."""
    conflicts, errors = [], []
    restored = {} if restored is None else restored
    blocked = set() if blocked is None else blocked
    for rel in reversed(owned_order):
        try:
            path, token = root / rel, publications[rel]
            def owned():
                return (token.path == rel and token.kind == stat.S_IFREG
                        and token.body == outputs[rel] and p115_read(path) == token.body
                        and p115_identity(path) == token.identity)
            if not owned():
                conflicts.append(f"{rel}: independently changed or deleted; publication ownership unproven")
                blocked.add(rel)
                continue
            if before[rel] is None:
                if not owned():
                    conflicts.append(f"{rel}: recovery ownership changed")
                    blocked.add(rel)
                    continue
                path.unlink()
                restored[rel] = None  # Only a successful native return witnesses absence.
            else:
                def guard(_staged, _identity, _body):
                    if not owned():
                        raise ValueError(f"{rel}: recovery ownership changed")
                p115_publish(path, before[rel], expected=outputs[rel], expected_identity=token.identity,
                    guard=guard, published=lambda identity: restored.update({rel: identity}))
            if p115_observe(path) != (before[rel], restored[rel]):
                raise ValueError(f"{rel}: recovery native result differs from captured preimage/identity")
        except BaseException as error:
            conflicts.append(f"{rel}: restoration failed: {type(error).__name__}: {error}")
            errors.append(p115_exception(error))
            blocked.add(rel)
    p115_recovery_observation(root, before, before_identity, owned_order, restored, blocked,
                              conflicts, errors, "recovery-loop-observation")
    return conflicts, errors


def p115_payload_inventory(journal: pathlib.Path) -> list[dict]:
    return [{"path": p.name, "bytes": p.stat().st_size,
             "sha256": hashlib.sha256(p.read_bytes()).hexdigest()}
            for p in sorted(journal.iterdir()) if p.is_file()] if journal.exists() else []


def p115_private_inventory(journal: pathlib.Path) -> list[dict]:
    """Recursive private payload is separate from the unchanged preimage list."""
    rows = []
    if journal.exists():
        for path in sorted(journal.rglob("*")):
            rel, kind = path.relative_to(journal).as_posix(), path.lstat().st_mode
            if path.parent == journal and path.name.endswith(".before"):
                continue
            if stat.S_ISREG(kind):
                body = path.read_bytes()
                rows.append({"path": rel, "kind": "regular", "bytes": len(body),
                             "sha256": hashlib.sha256(body).hexdigest()})
            else:
                rows.append({"path": rel, "kind": "directory" if stat.S_ISDIR(kind) else "nonregular"})
    return rows


def p115_report_receipt(path: pathlib.Path, published: dict, *, completed: bool) -> dict:
    """A pathname is not retention evidence; observe a confirmed publication."""
    try:
        body = p115_read(path)
        if body is None:
            state = "absent"
        elif (published["body"] is None or published["identity"] is None
              or body != published["body"] or p115_identity(path) != published["identity"]):
            state = "unverified"
        else:
            record = json.loads(body)
            phase = record["state"]
            labels = {"failed": "updated failed", "prepared": "older prepared", "completed": "completed"}
            if phase not in labels or completed and phase != "completed":
                state = "unverified"
            else:
                print("P115 verified retained receipt phase: " + labels[phase])
                prefix = ("P115 completed outcome receipt retained: " if completed else
                          "P115 failed-attempt evidence retained: ")
                print(prefix + str(path))
                if not completed and "recoveryObservation" in record:
                    print("P115 retained receipt recovery observation: "
                          + record["recoveryObservation"]["observationId"]
                          + "; historical observation only; final recovery reported separately")
                return {"verified": True, "phase": phase}
    except BaseException as verification_error:
        snapshot = p115_exception(verification_error)
        print("P115 secondary receipt verification error: " + json.dumps(snapshot))
        state = "unverified/read-error"
        print(f"P115 receipt verification: {state}; no retained receipt claimed: {path}")
        return {"verified": False, "state": state, "exception": snapshot}
    print(f"P115 receipt verification: {state}; no retained receipt claimed: {path}")
    return {"verified": False, "state": state}


def p115_record(root: pathlib.Path, pkg: Package, version: str, date: str, quote: str,
                 review_rel: str, disposition_rel: str | None,
                 options: frozenset[str]) -> int:
    return p115_attempt(root, operation="record", pkg=pkg, version=version, date=date,
                        quote=quote, review_rel=review_rel, disposition_rel=disposition_rel, options=options)


def p115_attempt(root: pathlib.Path, *, operation: str, pkg: Package | None = None,
                  version: str = "1.0", date: str | None = None, quote: str = "",
                  review_rel: str | None = None, disposition_rel: str | None = None,
                  options: frozenset[str] = frozenset()) -> int:
    """P115-only provisional publication, receipt commit, then private cleanup.

    Assumes the admitted checkout is exclusively operated. Immediate drift
    checks and no-clobber creation are not a universal CAS or crash guarantee.
    """
    reference = _module("prepare_three_surface_poc_governedby_reference_recording")
    if operation not in {"record", "apply"}:
        raise ValueError("P115 supports only the existing record and internal apply operations")
    pkg = pkg or real_packages()[reference.KEY]
    owned_order, publications = [], {}
    journal = outcome = None
    before, before_identity, outputs, receipt, batch_evidence = {}, {}, {}, {}, {}
    receipt_state = {"body": None, "identity": None}
    committed = False
    try:
        head, index = p115_clean(root)
        paths = (*reference.SUBJECTS, reference.RECORD, reference.AGGREGATE)
        before = {rel: p115_read(root / rel) for rel in paths}
        before_identity = {rel: p115_identity(root / rel) for rel in paths}
        target_identity = dict(before_identity)
        family = reference.family_snapshot(root)
        inputs = {pathlib.Path(p) for p in reference.validation_inputs(root)}
        if review_rel is not None:
            inputs.add(pathlib.Path(review_rel))
        if disposition_rel:
            inputs.add(pathlib.Path(disposition_rel))
        if any(p.is_absolute() or ".." in p.parts for p in inputs):
            raise ValueError("P115 validation inputs must stay inside the repository")
        captured = {rel: p115_read(root / rel) for rel in inputs}
        if version != reference.VERSION or options:
            raise ValueError("P115 recording covers exactly v1.0 with no options")
        if reference.transaction_present(root):
            raise ValueError("P115 transaction is already present or partial")
        if before[reference.AGGREGATE] is None or any(before[p] is None for p in reference.SUBJECTS):
            raise ValueError("P115 transaction requires all six subjects and the aggregate")
        if operation == "record":
            validate_inputs(version, date, quote, pkg)
            commit, verdict = verify_reviewed(root, pkg, review_rel, disposition_rel)
            findings = pkg.check(root) + reference.chain_findings(root, date)
        else:
            findings = reference.recording_findings(root) + reference.chain_findings(root, predecessors_only=True)
        if findings:
            raise ValueError("package does not verify: " + " | ".join(findings))
        patch_paths = _patches(root, reference.CANDIDATE / "proposed")
        if len(patch_paths) != 5 or len(set(patch_paths)) != 5:
            raise ValueError("refusing P115 apply: exact five-patch population changed")
        patches = tuple((path.relative_to(root), p115_read(path)) for path in patch_paths)
        if any(body is None for _rel, body in patches):
            raise ValueError("P115 captured patch is absent")
        current, proposed = reference.load_frozen(root).collect()
        current = {pathlib.Path(p): body for p, body in current.items()}
        proposed = {pathlib.Path(p): body for p, body in proposed.items()}
        if set(current) != set(reference.SUBJECTS) or any(current[p] != before[p] for p in current):
            raise ValueError("P115 validated subjects differ from captured preimages")
        if (set(proposed) != set(reference.SUBJECTS) or any(
                hashlib.sha256(proposed[pathlib.Path(p)]).hexdigest() != sha
                for sha, p in reference.manifest_rows(root))):
            raise ValueError("P115 proposed outputs differ from the exact six-row manifest")
        outputs = {**before, **proposed}
        if operation == "record":
            disposition = disposition_rel if verdict == "CONFIRM WITH EXCEPTIONS" else None
            outputs[reference.RECORD] = render_record(
                pkg, version, date, quote, review_rel, commit, verdict, disposition,
                root=root, rows=tuple(reference.manifest_rows(root))).encode()
            outputs[reference.AGGREGATE] = (before[reference.AGGREGATE].decode().rstrip("\n")
                + "\n\n" + render_aggregate(pkg, version, date, review_rel, verdict, disposition)).encode()
        expected = dict(before)

        def unchanged(staged=None, identity=None, body=None):
            for rel, value in {**captured, **expected}.items():
                if p115_read(root / rel) != value:
                    raise ValueError(f"P115 transaction input changed: {rel}")
            expected_family = {"files": dict(family["files"]), "aggregate": expected[reference.AGGREGATE]}
            if expected[reference.RECORD] is not None:
                expected_family["files"][reference.RECORD.name] = {"kind": "regular", "body": expected[reference.RECORD]}
            if reference.family_snapshot(root) != expected_family:
                raise ValueError("P115 transaction reserved family changed")
            if any(p115_identity(root / rel) != target_identity[rel] for rel in paths):
                raise ValueError("P115 transaction target identity changed")
            if (subprocess.run(["git", "rev-parse", "HEAD"], cwd=root, capture_output=True,
                               check=True).stdout != head
                    or subprocess.run(["git", "ls-files", "--stage", "-z"], cwd=root,
                                      capture_output=True, check=True).stdout != index):
                raise ValueError("P115 transaction HEAD or index changed")
            p115_tracked(root, head, index, frozenset(paths))
            changed = subprocess.run(["git", "--no-optional-locks", "diff", "--name-only", "-z"], cwd=root,
                                     capture_output=True, check=True).stdout.split(b"\0")
            changed += subprocess.run(["git", "ls-files", "--others", "--exclude-standard", "-z"],
                                      cwd=root, capture_output=True, check=True).stdout.split(b"\0")
            allowed = {rel.as_posix() for rel in paths}
            if staged is not None:
                if p115_identity(staged) != identity or p115_read(staged) != body:
                    raise ValueError("P115 private stage ownership changed")
                # Only this exact verified live stage may be omitted from dirt.
                if staged.is_relative_to(root):
                    allowed.add(staged.relative_to(root).as_posix())
            if any(p and p.decode() not in allowed for p in changed):
                raise ValueError("P115 transaction acquired unrelated worktree changes")

        def persist(guard=lambda staged, identity, body: None):
            receipt["updatedAt"] = datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z")
            body = (json.dumps(receipt, indent=2) + "\n").encode()
            def published(identity):
                receipt_state.update(body=body, identity=identity)
            p115_publish(outcome, body, expected=receipt_state["body"],
                          expected_identity=receipt_state["identity"], guard=guard, published=published)
            if p115_read(outcome) != body or p115_identity(outcome) != receipt_state["identity"]:
                raise ValueError("P115 outcome receipt failed readback")

        unchanged()
        p115_clean(root)
        git_dir = pathlib.Path(subprocess.run(["git", "rev-parse", "--absolute-git-dir"],
                               cwd=root, capture_output=True, text=True, check=True).stdout.strip())
        recovery = git_dir / "p115-recording-recovery"
        recovery.mkdir(exist_ok=True)
        journal = pathlib.Path(tempfile.mkdtemp(prefix="attempt-", dir=recovery))
        outcome = journal.with_name(journal.name + ".ATTEMPT.json")
        receipt = {"scope": "P115 " + operation + " attempt; selftest calls are synthetic/no owner action",
                   "operation": operation, "batch": batch_evidence,
                   "ranAt": head.decode().strip(), "indexSha256": hashlib.sha256(index).hexdigest(),
                   "attemptId": journal.name,
                   "capturedAt": datetime.datetime.now(datetime.timezone.utc).isoformat().replace("+00:00", "Z"),
                   "state": "prepared", "paths": [],
                   "validationInputs": {str(p): None if b is None else hashlib.sha256(b).hexdigest()
                                        for p,b in sorted(captured.items())}}
        for number, rel in enumerate(paths):
            body = before[rel]
            name = journal.name + f"/{number}.before"
            if body is not None:
                (outcome.parent / name).write_bytes(body)
            receipt["paths"].append({"path": rel.as_posix(),
                "before": None if body is None else hashlib.sha256(body).hexdigest(),
                "after": None if outputs[rel] is None else hashlib.sha256(outputs[rel]).hexdigest(),
                "preimage": None if body is None else name})
        persist(unchanged)
        unchanged()
        p115_apply_batch(root, journal, before, proposed, patches, batch_evidence)
        unchanged()
        changed_subjects = tuple(p for p in reference.SUBJECTS if before[p] != outputs[p])
        publish_paths = (*changed_subjects, *((reference.RECORD, reference.AGGREGATE)
                                             if operation == "record" else ()))
        for rel in publish_paths:
            unchanged()
            def published(identity, rel=rel):
                publications[rel] = P115Publication(journal.name, rel, identity, stat.S_IFREG,
                    outputs[rel], hashlib.sha256(outputs[rel]).hexdigest())
                owned_order.append(rel)
                expected[rel], target_identity[rel] = outputs[rel], identity
            p115_write(root / rel, outputs[rel], expected=expected[rel],
                        expected_identity=target_identity[rel], guard=unchanged, published=published)
        unchanged()
        if not pkg.applied(root):
            raise ValueError("P115 applied postcondition failed")
        if operation == "record":
            findings = reference.signed_findings(root)
            if findings:
                raise ValueError("P115 recorded postcondition failed: " + " | ".join(findings))
        receipt.update(state="completed", postconditions={"sixSubjects": True, "exactRecords": operation == "record",
            "signedChain": operation == "record", "capturedInputsAndIndex": True},
            publications=p115_publications(publications),
            payloadCapturedAtCompletion=p115_payload_inventory(journal),
            privatePayloadCapturedAtCompletion=p115_private_inventory(journal))
        persist(unchanged)
        # Receipt I/O is precommit too: it must not conceal intervening drift.
        unchanged()
        committed = True
    except BaseException as failure:
        original = p115_exception(failure)  # Freeze BEFORE any recovery operation.
        message = f"{type(failure).__name__}: {failure}"
        diagnostic_errors = []
        try:
            print("P115 original exception: " + json.dumps(original))
        except BaseException as diagnostic_error:
            diagnostic_errors.append(p115_exception(diagnostic_error))
        restored, blocked = {}, set()
        conflicts, recovery_errors = p115_recover(root, before, outputs, before_identity,
            owned_order, publications, restored=restored, blocked=blocked)
        observation_prefix = (journal.name if journal is not None else
            "unstarted-" + datetime.datetime.now(datetime.timezone.utc).strftime("%Y%m%dT%H%M%S%fZ"))

        def observe(label):
            return p115_recovery_observation(root, before, before_identity, owned_order,
                restored, blocked, conflicts, recovery_errors, observation_prefix + ":" + label)

        def emit(text):
            try:
                print(text)
            except BaseException as diagnostic_error:
                diagnostic_errors.append(p115_exception(diagnostic_error))
                if "failure diagnostic output unavailable" not in conflicts:
                    conflicts.append("failure diagnostic output unavailable")

        def failure_receipt(observation):
            receipt.update(state="failed", originalError=message, originalException=original,
                recoveryConflicts=list(conflicts), recoveryExceptions=list(recovery_errors),
                diagnosticExceptions=list(diagnostic_errors), recoveryObservation=observation,
                recoveryPublications={str(rel): identity for rel, identity in restored.items()},
                publications=p115_publications(publications))

        def report_receipt():
            try:
                verified = p115_report_receipt(outcome, receipt_state, completed=False)
                if not verified["verified"] and not any("failure receipt" in c for c in conflicts):
                    conflicts.append("failure receipt verification unavailable; no final recovery proof")
                if verified.get("exception") is not None:
                    diagnostic_errors.append(verified["exception"])
            except BaseException as diagnostic_error:
                diagnostic_errors.append(p115_exception(diagnostic_error))
                conflicts.append("failure receipt diagnostic unavailable")

        if diagnostic_errors:
            conflicts.append("original failure diagnostic output unavailable")
        initial_observation = observe("after-recovery")
        if outcome is not None:
            failure_receipt(initial_observation)
            try:
                receipt["privatePayloadOnFailure"] = p115_private_inventory(journal)
            except BaseException as inventory_error:
                receipt["privatePayloadOnFailure"] = None
                receipt["privatePayloadInventoryException"] = p115_exception(inventory_error)
            try:
                persist()
            except BaseException as evidence_error:
                evidence = p115_exception(evidence_error)
                conflicts.append("failure receipt persistence failed; durable failure update unavailable")
                diagnostic_errors.append(evidence)
                emit("P115 secondary evidence error: " + json.dumps(evidence))
                emit("P115 diagnostic fallback: original exception snapshot printed above; "
                     "no durable failure update is claimed")
        for error in recovery_errors:
            emit("P115 secondary recovery error: " + json.dumps(error))
        emit("FAILED P115: " + message)
        if outcome is not None:
            report_receipt()
        # Receipt verification and its output are not preservation evidence.
        # This final read-only observation follows all their effects.
        final_observation = observe("after-receipt-and-diagnostics")
        corrected = False
        if outcome is not None and final_observation["targets"] != initial_observation["targets"]:
            corrected = True
            failure_receipt(final_observation)
            try:
                persist()  # One corrective update, never a persistence retry loop.
            except BaseException as evidence_error:
                diagnostic_errors.append(p115_exception(evidence_error))
                conflicts.append("corrective failure receipt unavailable; retained observation is historical")
                emit("P115 secondary corrective evidence error: " + json.dumps(diagnostic_errors[-1]))
            report_receipt()
            final_observation = observe("after-one-corrective-receipt")
        if final_observation["complete"] and not diagnostic_errors:
            terminal = ("P115 recovery complete; captured preimages preserved at observation "
                + final_observation["observationId"] + " [" + final_observation["startedAt"]
                + " .. " + final_observation["endedAt"] + "]; targets=" + str(len(before))
                + "; exclusive-checkout sequential read-only scope; no atomic/CAS/beyond-window guarantee")
        else:
            emit("P115 final recovery observation: " + json.dumps(final_observation))
            if corrected:
                emit("P115 retained receipt recovery scope: historical observation; "
                     "no current preservation claim beyond the final observation window")
            terminal = "P115 recovery incomplete: " + " | ".join(conflicts)
        # No receipt, inventory or diagnostic read follows a positive line.
        emit(terminal)
        if not isinstance(failure, Exception):
            raise
        return 1
    assert committed  # No governed recovery is permitted beyond this point.
    try:
        shutil.rmtree(journal)
        outcome.unlink()
    except BaseException as cleanup_error:
        cleanup = p115_exception(cleanup_error)
        print("P115 WARNING: recording completed; private cleanup failed: " + json.dumps(cleanup))
        try:
            survivors = p115_payload_inventory(journal)
            receipt.update(payloadSurvivors=survivors, privatePayloadSurvivors=p115_private_inventory(journal))
        except BaseException as inventory_error:
            receipt.update(payloadSurvivors=None, payloadInventoryException=p115_exception(inventory_error))
            print("P115 WARNING: surviving payload inventory unavailable: " + json.dumps(p115_exception(inventory_error)))
        receipt.update(state="completed", cleanupException=cleanup)
        try:
            persist()
        except BaseException as evidence_error:
            print("P115 WARNING: cleanup diagnostic persistence failed: " + json.dumps(p115_exception(evidence_error)))
        p115_report_receipt(outcome, receipt_state, completed=True)
    if operation == "apply":
        print("applied the exact five P115 patches as one preflighted batch")
        return 0
    print(f"wrote {reference.RECORD.as_posix()}; appended exact P115 aggregate block")
    print(f"next: review the logical Git transaction, commit, then `git tag -a {tag_for(pkg, version)}` on that commit")
    return 0


def patch_package_applied(root: pathlib.Path, proposed: pathlib.Path,
                          record: pathlib.Path) -> bool:
    """Before its record exists, every patch reverses over the tree; after,
    every row the record carries hashes the tree (or a later sign-off's row
    re-patched it, as for a manifest)."""
    if (root / record).is_file():
        return _rows_hash_tree(root, record)
    patches = _patches(root, proposed)
    return bool(patches) and all(subprocess.run(
        ["git", "apply", "-R", "--check", "--whitespace=nowarn", str(patch)],
        cwd=root, capture_output=True).returncode == 0 for patch in patches)


def real_packages() -> dict[str, Package]:
    missing = lambda: _module("build_pwb_missing_currency_disclosure_scenario")  # noqa: E731
    dismissal = lambda: _module("build_pwb_dismissal_expiry_amendment")  # noqa: E731
    container = lambda: _module("build_pwb_container_shape_profile_amendment")  # noqa: E731
    item_depth = lambda: _module("build_pwb_item_depth_amendment")  # noqa: E731
    readability = lambda: _module("build_pwb_readability_successor")  # noqa: E731
    tree_framing = lambda: _module("build_pwb_tree_framing_amendment")  # noqa: E731
    dossier = lambda: _module("build_polaris_dossier_local_agent_mode")  # noqa: E731
    git_source = lambda: _module("build_public_git_source_acquisition_local_agent")  # noqa: E731
    dossier11 = lambda: _module("build_polaris_dossier_local_agent_mode_v1_1")  # noqa: E731
    dossier12 = lambda: _module("build_polaris_dossier_local_agent_mode_v1_2")  # noqa: E731
    dossier13 = lambda: _module("build_polaris_dossier_local_agent_mode_v1_3")  # noqa: E731
    anchor = lambda: _module("build_pwb_anchor_resolution_amendment")  # noqa: E731
    provenance = lambda: _module("build_three_surface_poc_block_provenance_amendment")  # noqa: E731
    anchor_dir = CANDIDATES / "pwb-anchor-resolution-amendment"
    provenance_dir = CANDIDATES / "three-surface-poc-block-provenance-amendment"
    class_granular = lambda: _module("build_pwb_class_granular_extraction_amendment")  # noqa: E731
    accessible = lambda: _module("build_pwb_accessible_name_amendment")  # noqa: E731
    poc_dependencies = lambda: _module("build_three_surface_poc_spec_dependencies")  # noqa: E731
    class_dir = CANDIDATES / "pwb-class-granular-extraction-amendment"
    accessible_dir = CANDIDATES / "pwb-accessible-name-amendment"
    opening = lambda: _module("build_pwb_opening_index_amendment")  # noqa: E731
    opening_dir = CANDIDATES / "pwb-opening-index-amendment"
    intent_dir = CANDIDATES / "three-surface-poc-governing-intent-amendment"
    intent_record = DECISIONS / "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT-SIGNOFF-v1.0.md"
    vocabulary = lambda: _module("build_three_surface_poc_vocabulary_epistemic_amendment")  # noqa: E731
    vocabulary_dir = CANDIDATES / "three-surface-poc-vocabulary-epistemic-amendment"
    reference = lambda: _module("prepare_three_surface_poc_governedby_reference_recording")  # noqa: E731
    consent = lambda: _module("build_cap1_trusted_bootstrap_consent_adoption")  # noqa: E731
    consent_change = pathlib.Path("openspec/changes/cap1-trusted-bootstrap-consent")

    def intent_findings(root):
        return patch_package_findings(root, intent_dir / "proposed", POC_SUBJECTS, POC_SPEC,
                                      POC_GOVERNING, poc_dependencies().generate)
    repin_note = (
        "Signing this version moves the PWB `spec.md` again, so it re-stales the\n"
        "P-95 behaviour-contract re-pin package\n"
        "(`pwb-behavior-contract-repin-tree-framing`, tracked by `syzygy-fxro` and\n"
        "`syzygy-2g0d`): it must be redrafted over this sign-off and re-reviewed\n"
        "before its acts can be offered. The P-95 package is not edited by this\n"
        "sign-off. The body-read gate does not read the pin, so no Butlers read is\n"
        "refused; the pins read Unknown until the next re-pin.\n")
    return {
        "pwb-missing-currency-disclosure-scenario": Package(
            "pwb-missing-currency-disclosure-scenario",
            "PWB missing-currency disclosure scenario",
            "behavior amendment",
            CANDIDATES / "pwb-missing-currency-disclosure-scenario",
            "PWB-MISSING-CURRENCY-DISCLOSURE-SCENARIO",
            lambda root: missing().check(),
            lambda root: missing().apply(True),
            lambda root: _rows_hash_tree(root, missing().MANIFEST_OUT),
        ),
        "pwb-dismissal-expiry-amendment": Package(
            "pwb-dismissal-expiry-amendment",
            "PWB dismissal-expiry amendment",
            "behavior amendment",
            CANDIDATES / "pwb-dismissal-expiry-amendment",
            "PWB-DISMISSAL-EXPIRY-AMENDMENT",
            lambda root: dismissal().check(),
            lambda root: dismissal().apply(True),
            lambda root: _rows_hash_tree(root, dismissal().MANIFEST_OUT),
        ),
        "pwb-container-shape-profile-amendment": Package(
            "pwb-container-shape-profile-amendment",
            "PWB container-shape profile amendment",
            "behavior amendment",
            CANDIDATES / "pwb-container-shape-profile-amendment",
            "PWB-CONTAINER-SHAPE-PROFILE-AMENDMENT",
            lambda root: container().check(),
            lambda root: container().apply(True),
            lambda root: _rows_hash_tree(root, container().MANIFEST_OUT),
        ),
        "pwb-item-depth-amendment": Package(
            "pwb-item-depth-amendment",
            "PWB item-depth amendment",
            "behavior amendment",
            CANDIDATES / "pwb-item-depth-amendment",
            "PWB-ITEM-DEPTH-AMENDMENT",
            lambda root: item_depth().check()[0],
            lambda root: item_depth().apply(True),
            lambda root: _rows_hash_tree(root, item_depth().MANIFEST_OUT),
        ),
        "pwb-readability-successor": Package(
            "pwb-readability-successor",
            "PWB readability successor",
            "behavior amendment",
            CANDIDATES / "pwb-readability-successor",
            "PWB-READABILITY-SUCCESSOR",
            lambda root: readability().check()[0],
            lambda root: readability().apply(True),
            lambda root: _rows_hash_tree(root, readability().MANIFEST_OUT),
        ),
        "pwb-tree-framing-amendment": Package(
            "pwb-tree-framing-amendment",
            "PWB tree-framing amendment",
            "behavior amendment",
            CANDIDATES / "pwb-tree-framing-amendment",
            "PWB-TREE-FRAMING-AMENDMENT",
            lambda root: tree_framing().check()[0],
            lambda root: tree_framing().apply(True),
            lambda root: _rows_hash_tree(root, tree_framing().MANIFEST_OUT),
        ),
        # The N9 pair, judged by one raw with a two-package head: each binds
        # by its own labelled manifest digest and verdict line.
        "pwb-anchor-resolution-amendment": Package(
            "pwb-anchor-resolution-amendment",
            "PWB anchor-resolution amendment",
            "behavior amendment",
            anchor_dir,
            "PWB-ANCHOR-RESOLUTION-AMENDMENT",
            lambda root: anchor().check(anchor().PACKAGE)[0],
            lambda root: anchor().apply(anchor().PACKAGE, True),
            lambda root: _rows_hash_tree(root, anchor().PACKAGE.manifest),
            subject=anchor_dir / "PWB-ANCHOR-RESOLUTION-AMENDMENT-MANIFEST.txt",
            head_label="PWB",
            record_note=(
                "Signing this version moves the PWB `spec.md` again, so it re-stales the\n"
                "P-95 behaviour-contract re-pin package\n"
                "(`pwb-behavior-contract-repin-tree-framing`, tracked by `syzygy-fxro` and\n"
                "`syzygy-2g0d`): that package's builder now refuses it as stale, and it\n"
                "must be redrafted over this sign-off and re-reviewed before its acts can\n"
                "be offered (the package's `IMPACT-LEDGER.md`, \"The behaviour-contract\n"
                "pins\"). The P-95 package is not edited by this sign-off. The\n"
                "body-read gate does not read the pin, so no Butlers read is refused; the\n"
                "pins read Unknown until the next re-pin.\n"),
        ),
        # A Three-Surface POC specification amendment: Scope A reaches it only
        # through the owner's 2026-10-14 extension, which the record names.
        "three-surface-poc-block-provenance-amendment": Package(
            "three-surface-poc-block-provenance-amendment",
            "Three-Surface POC block-provenance amendment",
            "specification amendment",
            provenance_dir,
            "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT",
            lambda root: provenance().engine.check(provenance().PACKAGE)[0],
            lambda root: provenance().engine.apply(provenance().PACKAGE, True),
            lambda root: _rows_hash_tree(root, provenance().PACKAGE.manifest),
            subject=provenance_dir / "THREE-SURFACE-POC-BLOCK-PROVENANCE-AMENDMENT-MANIFEST.txt",
            head_label="POC",
            extension=POC_EXTENSION_REL,
            # The N9 round-2 raw names this half by the builder it ran
            # (raw lines 27-28), never by the package key.
            review_alias="build_three_surface_poc_block_provenance_amendment.py",
        ),
        # Cycle-2 clearances of 2026-10-14 (P-86, P-99, P-100).
        "pwb-class-granular-extraction-amendment": Package(
            "pwb-class-granular-extraction-amendment",
            "PWB class-granular extraction amendment",
            "behavior amendment",
            class_dir,
            "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT",
            lambda root: class_granular().check()[0],
            lambda root: class_granular().apply(True),
            lambda root: _rows_hash_tree(root, class_granular().MANIFEST),
            subject=class_dir / "PWB-CLASS-GRANULAR-EXTRACTION-AMENDMENT-MANIFEST.txt",
            record_note=repin_note + (
                "\n"
                "It also moves `design.md` and `CAPABILITY-COVERAGE.md`, where the pending\n"
                "release-label amendment (P-85) adds the same design decision 12 and\n"
                "capability row 34: under Q5 \"First ready lands first\" that package is\n"
                "regenerated over this one's applied bytes, renumbered and reviewed again\n"
                "before it is offered.\n"),
        ),
        "pwb-accessible-name-amendment": Package(
            "pwb-accessible-name-amendment",
            "PWB accessible-name amendment",
            "behavior amendment",
            accessible_dir,
            "PWB-ACCESSIBLE-NAME-AMENDMENT",
            lambda root: accessible().engine.check(accessible().AMENDMENT)[0],
            lambda root: accessible().engine.apply(accessible().AMENDMENT, True),
            lambda root: _rows_hash_tree(root, accessible().AMENDMENT.manifest_path),
            subject=accessible_dir / "PWB-ACCESSIBLE-NAME-AMENDMENT-MANIFEST.txt",
            # Signed on the round-4 regeneration-confirmation raw under the
            # owner's cycle-3 "Carry if review clears" answer: Q1 of cycle 2
            # carries to the manifest regenerated over P-86.
            record_note=(
                "Q1 \"Sign v1.0\" was answered on 2026-10-14 for the version round 3\n"
                "cleared. The owner's cycle-3 answer \"Carry if review clears\"\n"
                "(`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`) carries\n"
                "it to the version regenerated over the P-86 sign-off, on two\n"
                "conditions, each verified before recording: the round-4 review named\n"
                "above is notes-only, and `proposed/spec.md.patch` is byte-identical to\n"
                "the version round 3 read.\n"
                "\n" + repin_note + (
                "\n"
                "It also moves `spec.md` and `GOVERNING-DEPENDENCIES.md` under the two\n"
                "pending PWB packages: the opening-index amendment (P-98) and the\n"
                "release-label amendment (P-85) are regenerated over this sign-off's\n"
                "applied bytes and reviewed again before they are offered.\n")),
        ),
        "pwb-opening-index-amendment": Package(
            "pwb-opening-index-amendment",
            "PWB opening-index amendment",
            "behavior amendment",
            opening_dir,
            "PWB-OPENING-INDEX-AMENDMENT",
            lambda root: opening().engine.check(opening().AMENDMENT)[0],
            lambda root: opening().engine.apply(opening().AMENDMENT, True),
            lambda root: _rows_hash_tree(root, opening().AMENDMENT.manifest_path),
            subject=opening_dir / "PWB-OPENING-INDEX-AMENDMENT-MANIFEST.txt",
            # Signed on the round-5 regeneration-confirmation raw under the
            # owner's cycle-3 "Carry if review clears" answer: Q1 carries to
            # the manifest regenerated over P-99.
            record_note=(
                "Q1 \"Sign v1.0\" was answered on 2026-10-15 for the version round 4\n"
                "cleared. The owner's cycle-3 answer \"Carry if review clears\"\n"
                "(`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`) carries\n"
                "it to the version regenerated over the P-99 sign-off, on two\n"
                "conditions, each verified before recording: the round-5 review named\n"
                "above is notes-only, and `proposed/spec.md.patch` is byte-identical to\n"
                "the version round 4 read.\n"
                "\n" + repin_note + (
                "\n"
                "It also moves `spec.md` and `GOVERNING-DEPENDENCIES.md` under the\n"
                "pending release-label amendment (P-85), which is regenerated over this\n"
                "sign-off's applied bytes and reviewed again before it is offered.\n"
                "Implementation is covered on landing by\n"
                "`decisions/OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md`\n"
                "(bead `syzygy-u05.23`, gate `syzygy-00ls`); this record authorizes\n"
                "nothing itself.\n")),
        ),
        # No manifest and no builder: the round-3 raw binds a directory digest
        # (`Package digest:`), and the record carries the applied rows.
        "three-surface-poc-governing-intent-amendment": Package(
            "three-surface-poc-governing-intent-amendment",
            "Three-Surface POC governing-intent amendment",
            "specification amendment",
            intent_dir,
            "THREE-SURFACE-POC-GOVERNING-INTENT-AMENDMENT",
            intent_findings,
            lambda root: patch_package_apply(root, intent_dir / "proposed", intent_findings),
            lambda root: patch_package_applied(root, intent_dir / "proposed", intent_record),
            extension=POC_EXTENSION_REL,
            package_digest=True,
            applied_subjects=POC_SUBJECTS,
            record_note=(
                "Q1 \"Syzygy's records only\" is recorded as the owner's direction for the\n"
                "later amendment that defines the governing-intent link: Syzygy keeps the\n"
                "intent reference in its own record when it creates a work item and shows\n"
                "the link from there, and reads no new Butlers field (no `external_ref`,\n"
                "`description` or `design`). That amendment, its sign-off and an\n"
                "implementation authorization are still needed; this direction authorizes\n"
                "nothing now. Q3 \"Keep deferred\": the source-to-claims index stays\n"
                "deferred to a later PWB change.\n"
                "\n"
                "The pending identity amendment (P-84) patches the same four files, and\n"
                "the two are a declared mutually exclusive pair, so P-84 is regenerated\n"
                "over this sign-off's applied bytes before it is offered. Its next review\n"
                "also re-judges POC-REQ-014's encoding arm and its RFC2-24 and RFC8-24\n"
                "rows against P-84's amended POC-REQ-060, which that arm now reads (the\n"
                "round-3 raw's note 4). The P-84 package is not edited by this sign-off.\n"),
        ),
        # Prospective P-115: registration is neither signature nor installation.
        "three-surface-poc-governedby-reference-amendment": Package(
            "three-surface-poc-governedby-reference-amendment",
            "Three-Surface POC governedBy reference amendment",
            "specification amendment",
            CANDIDATES / "three-surface-poc-governedby-reference-amendment",
            "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT",
            lambda root: reference().recording_findings(root),
            p115_package_apply,
            lambda root: reference().applied_rows_match(root),
            subject=CANDIDATES / "three-surface-poc-governedby-reference-amendment" /
                    "THREE-SURFACE-POC-GOVERNEDBY-REFERENCE-AMENDMENT-MANIFEST.txt",
            extension=POC_EXTENSION_REL,
            review_alias="build_three_surface_poc_governedby_reference_amendment.py",
        ),
        # P-108, cleared by its round-2 notes-only raw; signed 2026-10-15
        # under the POC extension (its item 1 reaches any package patching
        # the POC change).
        "three-surface-poc-vocabulary-epistemic-amendment": Package(
            "three-surface-poc-vocabulary-epistemic-amendment",
            "Three-Surface POC vocabulary and epistemic-record amendment",
            "specification amendment",
            vocabulary_dir,
            "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT",
            lambda root: vocabulary().check(),
            lambda root: vocabulary().apply(True),
            lambda root: _rows_hash_tree(root, vocabulary().MANIFEST_OUT),
            subject=vocabulary_dir / "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt",
            extension=POC_EXTENSION_REL,
            # The round-2 raw closes `## Findings` with a numbered recap of
            # round 1's findings 1-9 (raw lines 276-309).
            findings_end="**Round-1 findings, closed or not, at the reviewed bytes**",
            # The raw names the package only by its builder (raw line 25)
            # and its manifest filename; the subject digest still binds.
            review_alias="build_three_surface_poc_vocabulary_epistemic_amendment.py",
            record_note=(
                "Question 2 is answered with its recommended arm, \"Marked renderings only\",\n"
                "which this version carries: the packet says \"Signing v1.0 answers this with\n"
                "the recommended option\". Review-2 note 13 (a zero or implementation-chosen\n"
                "marker population passes both rendering limbs at a reported zero) is not\n"
                "closed by this version; the owner's option named a follow-up, bead\n"
                "`syzygy-nw3o`, a later POC amendment so that zero reads Unknown.\n"
                "\n"
                "Deferred-scope questions D1-D4 were not asked and stay open (bead\n"
                "`syzygy-vk3f`). Signing starts no implementation: under the POC extension\n"
                "each amendment needs its own implementation authorization, and none\n"
                "covers this one yet.\n"
                "\n"
                "Review-2 note 11: the package's sentences saying the owner's two\n"
                "directions are \"not recorded under `decisions/`\" (`SEMANTIC-DELTA.md`,\n"
                "and the packet's D4) and the packet's \"unconfirmed pending round 2\" are\n"
                "no longer true; both directions are in\n"
                "`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-3-2026-10-14.md`. The cleared\n"
                "package is not edited; this record and `decisions/DECISION-HISTORY.md`\n"
                "carry the correction.\n"),
        ),
        # P-109: a CAP1 OpenSpec change adopted under the owner's 2026-10-15
        # extension of Scope A to this one package. The candidate is the
        # change directory itself; the reviewed subject is the round-4
        # subject record, and the builder checks every file it lists.
        "cap1-trusted-bootstrap-consent": Package(
            "cap1-trusted-bootstrap-consent",
            "CAP1 trusted-bootstrap consent amendment",
            "specification adoption",
            consent_change,
            "CAP1-TRUSTED-BOOTSTRAP-CONSENT",
            lambda root: consent().check(root),
            lambda root: consent().apply(root),
            lambda root: consent().applied(root),
            subject=pathlib.Path("docs/evidence/cap1-trusted-bootstrap-consent-2026-10-15/"
                                 "review-4-subject.json"),
            extension=CAP1_CONSENT_EXTENSION_REL,
            record_note=(
                "Adopted as the full replacement of CAP1-REQ-011 and CAP1-REQ-046. The\n"
                "bound Capability 1 change is not edited: the effective specification is\n"
                "the composition the change's `GOVERNING-DEPENDENCIES.json` declares, and\n"
                "the change's generated `ADOPTION.md` supersedes, in place, every\n"
                "predecessor coverage surface round-4 note 1 names (the RFC3-16(a) row,\n"
                "the Part A totals, the family table, the 38-mapped and 286-unmapped\n"
                "sentences, the Part B RFC3 line and total, the self-check, and the\n"
                "generated `GOVERNING-DEPENDENCIES.md`).\n"
                "\n"
                "Round-4 note 2 stays a known gap: CAP1-REQ-046's refusal disclosure does\n"
                "not on its own require the refused artifact's identity (bead\n"
                "`syzygy-0v4l`, a v1.1). Implementation is authorized separately, bounded,\n"
                "by `decisions/OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md`;\n"
                "this record authorizes nothing itself.\n"),
        ),
        "polaris-dossier-local-agent-mode": Package(
            "polaris-dossier-local-agent-mode",
            "Polaris dossier local-agent mode",
            "specification delta",
            CANDIDATES / "polaris-dossier-local-agent-mode",
            "POLARIS-DOSSIER-LOCAL-AGENT-MODE",
            lambda root: dossier().check(root),
            lambda root: dossier().apply(root),
            lambda root: dossier().applied(root),
            also=(pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode"),),
            subject=pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode/"
                                 "proposed/polaris-generation/spec.md"),
        ),
        # Offered only if the owner extends Scope A to this entry at the
        # sitting. The sitting review's head binds the sitting manifest, whose
        # row for the proposed entry the builder check requires to be current.
        "public-git-source-acquisition-local-agent": Package(
            "public-git-source-acquisition-local-agent",
            "Public Git source acquisition, local-agent version",
            "registry entry",
            CANDIDATES / "public-git-source-acquisition-local-agent",
            "PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT",
            lambda root: git_source().check(root),
            lambda root: git_source().apply(root),
            lambda root: git_source().applied(root),
            subject=CANDIDATES / "dossier-local-agent-acts/DOSSIER-LOCAL-AGENT-SITTING-MANIFEST.txt",
            installed=pathlib.Path(".syzygy/governance/declarations/adapter-registry/"
                                   "POLARIS-PUBLIC-GIT-SOURCE-ACQUISITION-LOCAL-AGENT-CANDIDATE.json"),
        ),
        # Version 1.1 patches the installed v1.0: its own candidate directory,
        # builder and reviewed bytes, under the same key, record stem and tag
        # series. ``package_for`` selects it for ``--version 1.1``.
        "polaris-dossier-local-agent-mode@1.1": Package(
            "polaris-dossier-local-agent-mode",
            "Polaris dossier local-agent mode",
            "specification delta",
            CANDIDATES / "polaris-dossier-local-agent-mode-v1-1",
            "POLARIS-DOSSIER-LOCAL-AGENT-MODE",
            lambda root: dossier11().check(root),
            lambda root: dossier11().apply(root),
            lambda root: dossier11().applied(root),
            also=(pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode"),),
            subject=pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode/"
                                 "specs/polaris-generation/spec.md"),
            subject_bytes=lambda root: dossier11().subject_bytes(root),
            options=("n6",),
            apply_with=lambda root, options: dossier11().apply(root, options),
            applied_options=lambda root: dossier11().state(root)[1],
        ),
        # Version 1.2 patches the installed v1.1 (as signed, with its options)
        # the same way, and offers no option.
        "polaris-dossier-local-agent-mode@1.2": Package(
            "polaris-dossier-local-agent-mode",
            "Polaris dossier local-agent mode",
            "specification delta",
            CANDIDATES / "polaris-dossier-local-agent-mode-v1-2",
            "POLARIS-DOSSIER-LOCAL-AGENT-MODE",
            lambda root: dossier12().check(root),
            lambda root: dossier12().apply(root),
            lambda root: dossier12().applied(root),
            also=(pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode"),),
            subject=pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode/"
                                 "specs/polaris-generation/spec.md"),
            subject_bytes=lambda root: dossier12().subject_bytes(root),
        ),
        # Version 1.3 (presentation elements) patches the installed, signed
        # v1.2 the same way, and offers no option.
        "polaris-dossier-local-agent-mode@1.3": Package(
            "polaris-dossier-local-agent-mode",
            "Polaris dossier local-agent mode",
            "specification delta",
            CANDIDATES / "polaris-dossier-local-agent-mode-v1-3",
            "POLARIS-DOSSIER-LOCAL-AGENT-MODE",
            lambda root: dossier13().check(root),
            lambda root: dossier13().apply(root),
            lambda root: dossier13().applied(root),
            also=(pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode"),),
            subject=pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode/"
                                 "specs/polaris-generation/spec.md"),
            subject_bytes=lambda root: dossier13().subject_bytes(root),
        ),
    }


def package_for(packages: dict[str, Package], key: str, version: str) -> Package | None:
    """The entry for ``key`` at ``version``: a ``key@version`` entry, else ``key``."""
    return packages.get(f"{key}@{version}") or packages.get(key)


# --- names ------------------------------------------------------------------

def tag_for(pkg: Package, version: str) -> str:
    return f"{pkg.key}-v{version}"


def record_rel(pkg: Package, version: str) -> pathlib.Path:
    return DECISIONS / f"{pkg.record_stem}-SIGNOFF-v{version}.md"


def block_markers(pkg: Package, version: str) -> tuple[str, str]:
    return (f"<!-- versioned-signoff:{pkg.key}:v{version} -->",
            f"<!-- /versioned-signoff:{pkg.key}:v{version} -->")


def recorded_versions(root: pathlib.Path, pkg: Package) -> list[tuple[int, int]]:
    found = []
    for path in (root / DECISIONS).glob(f"{pkg.record_stem}-SIGNOFF-v*.md"):
        m = re.fullmatch(rf"{re.escape(pkg.record_stem)}-SIGNOFF-v(\d+)\.(\d+)\.md", path.name)
        if m:
            found.append((int(m.group(1)), int(m.group(2))))
    return sorted(found)


# --- validation -------------------------------------------------------------

#: The Scope A direction names "the observer registry entry" of the PWB work. A
#: package that installs any other registry entry is signed under Scope A only
#: if the owner extends it, so its selection quote must name that extension.
SCOPE_A_EXTENSION = "Extend Scope A"


def validate_inputs(version: str, date: str, quote: str, pkg: Package | None = None) -> None:
    if not VERSION_RE.fullmatch(version):
        raise ValueError(f"version {version!r} is not major.minor without leading zeros")
    if not DATE_RE.fullmatch(date):
        raise ValueError("--date must be YYYY-MM-DD")
    if not quote.strip() or "\n" in quote or "\r" in quote:
        raise ValueError("owner selection quote must be one non-empty line")
    if HEX64_RE.search(quote):
        raise ValueError("owner selection quote must not carry a digest; "
                         "a version-tagged sign-off names the version, not bytes")
    if pkg is not None and pkg.installed is not None and SCOPE_A_EXTENSION not in quote:
        raise ValueError(f"owner selection quote must name the Scope A extension "
                         f"({SCOPE_A_EXTENSION!r}): this package installs a registry entry "
                         f"Scope A does not name")


def _verdict_allowed(verdict: str) -> str:
    if verdict not in VERDICTS:
        raise ValueError(f"review verdict {verdict!r} is not CONFIRM or "
                         "CONFIRM WITH EXCEPTIONS")
    return verdict


def parse_two_package_head(head: list[str], label: str | None) -> tuple[str, str, str]:
    """(commit, verdict, manifest digest) for ``label`` from a two-package head.

    The head is the first six non-blank lines. It carries exactly one
    `Reviewed commit:` line and, for exactly two distinct labels, exactly one
    `<LABEL> manifest SHA-256:` and one `<LABEL> verdict:` line each. Anything
    ambiguous refuses: an unlabelled manifest or verdict line beside the
    labelled ones, any other line naming a verdict or a digest, a label with
    one line and not the other, a repeated label, or a package that declares
    no label or a label the head does not carry."""
    commits = [m.group(1) for line in head if (m := COMMIT_LINE_RE.fullmatch(line))]
    if len(commits) != 1:
        raise ValueError("review head does not carry exactly one `Reviewed commit:` line")
    if any(MANIFEST_LINE_RE.fullmatch(line) or VERDICT_LINE_RE.fullmatch(line) for line in head):
        raise ValueError("two-package review head also carries an unlabelled "
                         "`Manifest SHA-256:` or `Verdict:` line; ambiguous")
    manifests: dict[str, list[str]] = {}
    verdicts: dict[str, list[str]] = {}
    for line in head:
        if (m := LABELLED_MANIFEST_RE.fullmatch(line)):
            manifests.setdefault(m.group(1), []).append(m.group(2))
        elif (m := LABELLED_VERDICT_RE.fullmatch(line)):
            verdicts.setdefault(m.group(1), []).append(m.group(2))
        elif not line.startswith("#") and HEAD_KEYWORD_RE.search(line):
            raise ValueError(f"two-package review head line {line!r} names a verdict or "
                             "a digest in no labelled form; ambiguous")
    if set(manifests) != set(verdicts):
        raise ValueError(f"two-package review head labels its manifests {sorted(manifests)} "
                         f"and its verdicts {sorted(verdicts)}; each label needs both")
    if len(manifests) != 2:
        raise ValueError(f"two-package review head carries {len(manifests)} labels, not 2")
    repeated = sorted(k for k in manifests if len(manifests[k]) != 1 or len(verdicts[k]) != 1)
    if repeated:
        raise ValueError(f"two-package review head repeats the lines of label(s) {repeated}")
    if label is None:
        raise ValueError("a two-package review head binds a package only by its declared "
                         "head label, and this package declares none")
    if label not in manifests:
        raise ValueError(f"two-package review head carries no `{label}` lines "
                         f"(labels: {sorted(manifests)})")
    return commits[0], _verdict_allowed(verdicts[label][0]), manifests[label][0]


def parse_head_form(review: str, label: str | None = None) -> tuple[str, str, str, str]:
    """(reviewed commit, verdict, head digest, form), the form being
    ``manifest``, ``package`` (a `Package digest:` line) or ``two-package``.

    A single-package head is the first four non-blank lines and carries
    exactly one digest line: one `Manifest SHA-256:` or one `Package digest:`,
    never both. A head whose first six non-blank lines carry a labelled
    manifest line is a two-package head, read by ``parse_two_package_head``
    for ``label``."""
    lines = [line for line in review.splitlines() if line.strip()]
    if any(LABELLED_MANIFEST_RE.fullmatch(line) for line in lines[:TWO_PACKAGE_HEAD_LINES]):
        return (*parse_two_package_head(lines[:TWO_PACKAGE_HEAD_LINES], label), "two-package")
    head = lines[:4]
    commits = [m.group(1) for line in head if (m := COMMIT_LINE_RE.fullmatch(line))]
    manifests = [m.group(1) for line in head if (m := MANIFEST_DIGEST_RE.fullmatch(line))]
    packages = [m.group(1) for line in head if (m := PACKAGE_DIGEST_RE.fullmatch(line))]
    verdicts = [m.group(1) for line in head if (m := VERDICT_LINE_RE.fullmatch(line))]
    if len(commits) != 1:
        raise ValueError("review head does not carry exactly one `Reviewed commit:` line")
    if manifests and packages:
        raise ValueError("review head carries both a `Manifest SHA-256:` and a "
                         "`Package digest:` line; ambiguous")
    if len(packages) > 1:
        raise ValueError("review head does not carry exactly one `Package digest:` line")
    if not packages and len(manifests) != 1:
        raise ValueError("review head does not carry exactly one `Manifest SHA-256:` line")
    if len(verdicts) != 1:
        raise ValueError("review head does not carry exactly one `Verdict:` line")
    if packages:
        return commits[0], _verdict_allowed(verdicts[0]), packages[0], "package"
    return commits[0], _verdict_allowed(verdicts[0]), manifests[0], "manifest"


def parse_head(review: str, label: str | None = None) -> tuple[str, str, str]:
    """(reviewed commit, verdict, head digest); see ``parse_head_form``."""
    return parse_head_form(review, label)[:3]


def reviewed_package_digest(root: pathlib.Path, pkg: Package, commit: str) -> str:
    """The brief's directory digest, `sha256sum $(git ls-files <dir> | LC_ALL=C
    sort) | sha256sum`, over exactly the files the reviewed commit tracked
    under the package directory, each hashed from the working tree.

    Files added since (sibling disposition records) are outside the reviewed
    set and so outside the digest; a reviewed file missing, a symlink, or a
    path `sha256sum` would escape refuses rather than hashing something else."""
    listed = _git(root, "ls-tree", "-r", "-z", "--name-only", commit, "--",
                  pkg.candidate.as_posix() + "/")
    if listed.returncode != 0:
        raise ValueError(f"cannot list the package at the reviewed commit: {listed.stderr.strip()}")
    paths = sorted((p for p in listed.stdout.split("\0") if p), key=lambda p: p.encode("utf-8"))
    if not paths:
        raise ValueError(f"the reviewed commit tracks no file under {pkg.candidate.as_posix()}")
    lines = []
    for rel in paths:
        if "\\" in rel or "\n" in rel or "\r" in rel:
            raise ValueError(f"reviewed path {rel!r} would be escaped by sha256sum; ambiguous")
        file = root / rel
        if file.is_symlink() or not file.is_file():
            raise ValueError(f"reviewed package file {rel} is missing or not a regular file")
        lines.append(f"{beh.digest(file.read_bytes())}  {rel}\n")
    return beh.digest("".join(lines).encode("utf-8"))


def qualifier_allowed(qualifier: str) -> bool:
    """True for no qualifier, or one whose every clause is an allowed one."""
    if not qualifier.strip():
        return True
    if qualifier[0] not in ",:":
        return False
    clauses = [c.strip().replace("\u2019", "'") for c in qualifier[1:].split(",")]
    return all(c in QUALIFIER_CLAUSES for c in clauses)


def unconsumed_finding_marks(section: str) -> list[str]:
    """Lines of a fence-stripped findings section that open a finding, or tag
    a blocking or revise severity, in a form ``SEVERITY_RE`` did not consume.

    The classifier reads one form, `**Finding N — title** (severity)` at a
    line start; a finding written any other way (an ATX heading, a list
    bullet, a short `F<n>` label) was silently uncounted, so a blocking
    finding in such a form read as no finding at all (R-364-2 F5). Each
    classified span is blanked first, so what remains is exactly what the
    classifier left. Cross-references inside prose ("round-2 Finding 1") are
    not openers and stay readable; a severity is refused only as a tag, in
    parentheses or brackets or after `Severity:`, never as a bare word, since
    retained raws say "No finding is blocking or revise" in their prose."""
    left = SEVERITY_RE.sub(lambda m: " " * len(m.group(0)), section)
    return [line.strip() for line in left.splitlines()
            if FINDING_OPENER_RE.match(line) or SEVERITY_TAG_RE.search(line)]


def split_recap(section: str, findings_end: str | None) -> str:
    """The findings section before a declared prior-round recap.

    Some raws close their `## Findings` section with a recap of the previous
    round's findings as a numbered list (`1. *title* — **closed.**`), which
    the line-leading `N. ` form would read as this round's findings. A
    package may declare the recap's opening line (``findings_end``); it must
    open exactly one line of the section, and the findings are read before
    it only. The recap fails closed: a line in it that opens a finding in the
    `**Finding N —` form or any marked form, or tags a blocking or revise
    severity, refuses rather than being dropped."""
    if findings_end is None:
        return section
    lines = section.splitlines(keepends=True)
    starts = [i for i, line in enumerate(lines) if line.startswith(findings_end)]
    if len(starts) != 1:
        raise ValueError(f"declared recap opener {findings_end!r} opens {len(starts)} lines "
                         "of the findings section, not exactly one")
    head, recap = "".join(lines[:starts[0]]), "".join(lines[starts[0]:])
    marks = [line.strip() for line in recap.splitlines()
             if SEVERITY_RE.match(line) or beh.FINDING_BOLD_RE.match(line)
             or FINDING_OPENER_RE.match(line) or SEVERITY_TAG_RE.search(line)]
    if marks:
        raise ValueError(f"the declared recap carries a finding or a blocking/revise severity: "
                         f"{marks[:3]}")
    return head


def review_findings(review: str, findings_end: str | None = None) -> dict[int, str]:
    section = split_recap(beh._raw_findings_section(review, FINDINGS_HEADING), findings_end)
    numbers = beh._finding_number_set(
        section, label="review findings", forms=beh.RAW_FINDING_FORMS)
    severities = {}
    for n, sev, qualifier in SEVERITY_RE.findall(section):
        if sev == "note" and not qualifier_allowed(qualifier):
            raise ValueError(f"review finding {n} is tagged ({sev}{qualifier}); a note "
                             f"qualifier other than {list(QUALIFIER_CLAUSES)} is ambiguous")
        severities[int(n)] = sev
    unclassified = sorted(numbers - set(severities))
    if unclassified:
        raise ValueError(f"review findings {unclassified} carry no "
                         "(blocking|revise|note) severity")
    unread = unconsumed_finding_marks(section)
    if unread:
        raise ValueError(f"review findings section carries a finding or a blocking/revise "
                         f"severity in a form the classifier does not read: {unread[:3]}; "
                         "only `**Finding N — title** (severity)` at a line start counts")
    return {n: severities[n] for n in numbers}


def validate_disposition(root: pathlib.Path, review_rel: str, disposition_rel: str | None,
                         findings: dict[int, str]) -> None:
    if not disposition_rel:
        raise ValueError("CONFIRM WITH EXCEPTIONS needs --disposition: a record "
                         "beside the package that dispositions every note")
    path = root / disposition_rel
    if not path.is_file():
        raise ValueError(f"missing disposition record: {disposition_rel}")
    text = path.read_text(encoding="utf-8")
    if f"Reviewed record: {review_rel}" not in text.splitlines():
        raise ValueError("disposition record does not name the reviewed raw on a "
                         "`Reviewed record:` line")
    actual = beh._finding_number_set(
        text, label="disposition record", forms=beh.DISPOSITION_FINDING_FORMS)
    if actual != set(findings):
        raise ValueError(f"disposition record findings {sorted(actual)} do not match "
                         f"the review's {sorted(findings)}")


def validate_review(root: pathlib.Path, review_rel: str, disposition_rel: str | None,
                    label: str | None = None,
                    findings_end: str | None = None) -> tuple[str, str]:
    path = root / review_rel
    if not path.is_file():
        raise ValueError(f"missing review raw: {review_rel}")
    review = path.read_text(encoding="utf-8")
    commit, verdict, _digest = parse_head(review, label)
    if verdict == "CONFIRM WITH EXCEPTIONS":
        findings = review_findings(review, findings_end)
        if not findings:
            raise ValueError("CONFIRM WITH EXCEPTIONS carries no countable finding; "
                             "a notes-only verdict with no note is a parse failure")
        bad = {n: s for n, s in findings.items() if s != "note"}
        if bad:
            raise ValueError(f"review carries non-note findings {bad}; "
                             "only a notes-only round clears the bytes")
        validate_disposition(root, review_rel, disposition_rel, findings)
    else:
        # A bare CONFIRM's findings are read too (R-364-2 F5): a raw whose
        # verdict line says CONFIRM over a blocking or revise finding is
        # contradictory, and contradiction refuses rather than trusting the head.
        bad = {n: s for n, s in review_findings(review, findings_end).items() if s != "note"}
        if bad:
            raise ValueError(f"CONFIRM review carries non-note findings {bad}; "
                             "the verdict contradicts its own findings")
    return commit, verdict


def names_token(review: str, name: str) -> bool:
    """True when ``name`` stands as a whole token on a line outside any fenced
    code block (R-364-2 F4: a substring test let `<key>-v2`, or the key quoted
    only inside a fence, satisfy the naming guard). A token is bounded by
    anything but a letter, digit, `_` or `-`; a `.` ends it only when no word
    character follows, so `<key>.` closes a sentence but `<key>.v2` is another
    name."""
    token = re.compile(r"(?<![\w.-])" + re.escape(name) + r"(?![\w-]|\.\w)")
    return bool(token.search(beh._strip_fenced_code(review)))


def review_binds(root: pathlib.Path, pkg: Package, review_rel: str) -> None:
    """The raw names this package and, when one is declared, its subject digest."""
    review = (root / review_rel).read_text(encoding="utf-8")
    if not names_token(review, pkg.key) and not (
            pkg.review_alias and names_token(review, pkg.review_alias)):
        raise ValueError(f"review raw does not name the package `{pkg.key}`"
                         + (f" or `{pkg.review_alias}`" if pkg.review_alias else ""))
    commit, _verdict, head_digest, form = parse_head_form(review, pkg.head_label)
    if pkg.package_digest:
        if form != "package":
            raise ValueError("this package has no manifest and binds only by a "
                             "`Package digest:` head line")
        if head_digest != reviewed_package_digest(root, pkg, commit):
            raise ValueError(f"review head package digest is not the directory digest over "
                             f"the files the reviewed commit tracked under "
                             f"{pkg.candidate.as_posix()}")
        return
    if form == "package":
        raise ValueError("a `Package digest:` head binds only a package that declares "
                         "it has no manifest")
    if pkg.subject is None:
        return
    subject = root / pkg.subject
    if not subject.is_file():
        raise ValueError(f"reviewed subject {pkg.subject.as_posix()} is missing")
    actual = beh.digest(pkg.subject_bytes(root) if pkg.subject_bytes else subject.read_bytes())
    if head_digest != actual:
        raise ValueError(f"review head digest is not the sha256 of the reviewed subject "
                         f"{pkg.subject.as_posix()}")


def extension_present(root: pathlib.Path, pkg: Package) -> None:
    """A package signed under an extension of Scope A needs that direction."""
    if pkg.extension is not None and not (root / pkg.extension).is_file():
        raise ValueError(f"missing Scope A extension direction: {pkg.extension.as_posix()}")


def verify_reviewed(root: pathlib.Path, pkg: Package, review_rel: str,
                    disposition_rel: str | None) -> tuple[str, str]:
    """Every check that binds the bytes on disk to the review; writes nothing."""
    commit, verdict = validate_review(root, review_rel, disposition_rel, pkg.head_label,
                                      pkg.findings_end)
    extension_present(root, pkg)
    review_binds(root, pkg, review_rel)
    package_unchanged(root, pkg, commit, disposition_rel)
    return commit, verdict


def _git(root: pathlib.Path, *args: str) -> subprocess.CompletedProcess:
    return subprocess.run(["git", "-C", str(root), *args], capture_output=True, text=True)


def package_unchanged(root: pathlib.Path, pkg: Package, commit: str,
                      disposition_rel: str | None) -> None:
    if _git(root, "cat-file", "-e", f"{commit}^{{commit}}").returncode != 0:
        raise ValueError(f"reviewed commit {commit[:12]} is not in this repository; fetch "
                         "it (a rebase-merged review commit stays on its pull request's ref)")
    directories = [d.as_posix() for d in (pkg.candidate, *pkg.also)]
    changed = _git(root, "diff", "--name-only", commit, "--", *directories).stdout.split()
    changed += _git(root, "ls-files", "--others", "--exclude-standard",
                    "--", *directories).stdout.split()
    candidate = pkg.candidate.as_posix() + "/"
    subject = [c for c in changed
               if not (c.startswith(candidate) and SIBLING_RECORD_RE.search(c))
               and c != disposition_rel]
    if subject:
        raise ValueError(f"package bytes changed since the commit the review read: "
                         f"{sorted(set(subject))}")


# --- records ----------------------------------------------------------------

DIRECTION_NOTE = (
    "Signed under `" + DIRECTION_REL.as_posix() + "`: the owner's selection of "
    "an option naming this package and version is the sign-off; no phrase or "
    "digest argument exists.")


INSTANT_RE = re.compile(r"^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}Z$")
RECORDED_RE = re.compile(r"^Recorded at \(UTC\): (\S+)$", re.MULTILINE)


def installed_lines(pkg: Package, root: pathlib.Path | None, instant: str | None) -> str:
    """For a package that installs a registry entry, the RFC3-16(b) binding set
    the tag alone does not carry: the entry and the SHA-256 of its installed
    bytes (item 3), the act type (4), the instant (6), the scope (7), the
    supersession (8), the provenance state and the explicit A1 absence (9).
    RFC4-7 honours an entry only under RFC3-16(a), and RFC3-16(b) makes a
    record that omits item 9 invalid."""
    if pkg.installed is None:
        return ""
    path = (root or ROOT) / pkg.installed
    sha = beh.digest(path.read_bytes()) if path.is_file() else "absent"
    return (f"Recorded at (UTC): {instant}\n\n"
            "Act type: `adopt-registry-entry`\n\n"
            "Project identity: `project:syzygy`\n\n"
            f"Installed entry: {pkg.installed.as_posix()}\n\n"
            f"Installed entry SHA-256: {sha}\n\n"
            "Scope: the entry's own subject and read authority, nothing wider\n\n"
            f"Scope A extension: the owner's selection quoted above names it "
            f"(\"{SCOPE_A_EXTENSION}\"); the extension is a plain owner direction "
            "and this record is its only record\n\n"
            "Supersession / revocation: supersedes nothing; revoked only by a later\n"
            "exact owner act naming it\n\n"
            "Provenance state: `owner-adopted (bootstrap, uncorrelated)` — state (1),\n"
            "the owner's option selection quoted above\n\n"
            "A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**\n\n")


def does_not(pkg: Package) -> str:
    if pkg.installed is None:
        return ("It authorizes no implementation of the signed semantics, widens no consent,\n"
                "read, write or egress, and approves no registry or policy byte. Every\n"
                "exclusion of the acts in force stands.\n")
    return ("It approves the registry entry named above at exactly the SHA-256 above and\n"
            "no other byte: a later edit at that path is unsigned. It is one of the\n"
            "separate acts a read needs; it gives no observation consent, adopts no\n"
            "classification or screening policy, widens no egress, write or execution,\n"
            "and authorizes no implementation. Every exclusion of the acts in force\n"
            "stands.\n")


def options_line(pkg: Package, options: frozenset[str]) -> str:
    """The record's options line; empty for a package that declares none."""
    if not pkg.options:
        return ""
    return f"Options: {', '.join(sorted(options)) or 'none'}\n\n"


def extension_line(pkg: Package) -> str:
    """The record's Scope A extension line; empty for a package Scope A names."""
    if pkg.extension is None:
        return ""
    return (f"Scope A extension: `{pkg.extension.as_posix()}` extends the direction "
            "below to this package's kind\n\n")


def note_section(pkg: Package) -> str:
    """The record's consequences section; empty for a package that declares none."""
    if not pkg.record_note:
        return ""
    return f"\n## Consequences recorded with the sign-off\n\n{pkg.record_note.strip()}\n"


def checked_phrase(pkg: Package) -> str:
    """How the record says the package was checked and applied."""
    if pkg.key == "three-surface-poc-governedby-reference-amendment":
        return ("that the frozen P115 builder check passed before the exact five patches were applied\n"
                "as one preflighted Git batch through the P115 recording adapter.")
    if pkg.applied_subjects:
        return ("that the package's checks passed (every patch applies to the signed\n"
                "bytes, and the dependency generator over the patched specification\n"
                "reproduces the patched declaration) before its patches were applied.")
    return ("that the package's own builder check passed before its patches were applied\n"
            "through the builder.")


def applied_rows(root: pathlib.Path, pkg: Package) -> tuple[tuple[str, str], ...]:
    """(sha256, path) of each declared applied subject, hashed from the tree."""
    return tuple((beh.digest((root / rel).read_bytes()), rel.as_posix())
                 for rel in pkg.applied_subjects)


def recorded_rows(pkg: Package, text: str) -> tuple[tuple[str, str], ...]:
    """The applied rows a record carries; their paths must be exactly the
    package's declared subjects, in order."""
    if not pkg.applied_subjects:
        return ()
    rows = tuple(beh.ROW_RE.findall(text))
    if [path for _sha, path in rows] != [rel.as_posix() for rel in pkg.applied_subjects]:
        raise ValueError("record's applied rows do not name exactly the package's subjects")
    return rows


def rows_section(pkg: Package, rows: tuple[tuple[str, str], ...]) -> str:
    """The applied-subject rows standing in for a manifest; empty otherwise."""
    if not pkg.applied_subjects:
        return ""
    body = "".join(f"{sha}  {path}\n" for sha, path in rows)
    return ("\n## Applied subjects\n\n"
            "This package carries no manifest. Each row below is the SHA-256 of one\n"
            "subject as this sign-off applied it, in manifest row form; the\n"
            "reconciliation and later-row readers take this record as the package's\n"
            "manifest.\n\n"
            f"```text\n{body}```\n")


def render_record(pkg: Package, version: str, date: str, quote: str, review: str,
                  commit: str, verdict: str, disposition: str | None,
                  options: frozenset[str] = frozenset(), *,
                  root: pathlib.Path | None = None, instant: str | None = None,
                  rows: tuple[tuple[str, str], ...] = ()) -> str:
    return f"""# {pkg.title} — version-tagged sign-off v{version}

Date: {date}

Owner: Tzeusy

Package: {pkg.key}

Version: {version}

Tag: {tag_for(pkg, version)}

Kind: {pkg.kind}

Owner selection: {quote}

Review: {review}

Reviewed commit: {commit}

Review verdict: {verdict}

Disposition: {disposition or "none"}

{installed_lines(pkg, root, instant)}{options_line(pkg, options)}{extension_line(pkg)}{DIRECTION_NOTE}

## What this records

The owner signed off version {version} of `{pkg.candidate.as_posix()}` by the
selection quoted above. The review named above read the package bytes this
sign-off applies; the recorder confirmed that the package directory still
equals the package at the reviewed commit (disposition records excepted) and
{checked_phrase(pkg)}

The binding is the annotated tag `{tag_for(pkg, version)}` on the commit that
carries this record and the applied result. A later edit to the package is a
new version signed separately; it does not retire this one.
{note_section(pkg)}{rows_section(pkg, rows)}
## What this does not do

{does_not(pkg)}"""


def aggregate_scope(pkg: Package) -> str:
    """The aggregate's closing sentence, tailored as `does_not` is."""
    if pkg.installed is None:
        return ("This sign-off authorizes no implementation, widens no consent, read, write or\n"
                "egress, and a later version of the package is signed separately.")
    return ("This sign-off approves the registry entry its dedicated record names, at the\n"
            "SHA-256 recorded there, under the Scope A extension the owner's selection\n"
            "names. That is one of the separate acts a read needs. It gives no observation\n"
            "consent, widens no write, egress or execution, authorizes no implementation,\n"
            "and a later version of the package is signed separately.")


def render_aggregate(pkg: Package, version: str, date: str, review: str,
                     verdict: str, disposition: str | None) -> str:
    start, end = block_markers(pkg, version)
    direction = f"`{DIRECTION_REL.as_posix()}`"
    if pkg.extension is not None:
        direction += f", extended by `{pkg.extension.as_posix()}`"
    review_row = f"`{review}`: `{verdict}`"
    if disposition:
        review_row += f"; disposition: `{disposition}`"
    selection = ("The owner signed off version " + version + " by selecting an option in the\n"
                 "Claude Code CLI (quoted in the dedicated record).")
    if pkg.key == "three-surface-poc-governedby-reference-amendment":
        selection = (f"The owner signed off version {version} by selecting an option in a structured\n"
                     "question naming this package and version (quoted in the dedicated record).")
    return f"""{start}
## Versioned sign-off — {pkg.key} — v{version} — recorded {date}

{selection}

| | |
|---|---|
| Project / owner | `project:syzygy` / Tzeusy |
| Kind | {pkg.kind} |
| Review outcome | {review_row} |
| Recording | `{record_rel(pkg, version).as_posix()}`; annotated tag `{tag_for(pkg, version)}` on the commit carrying these records and the applied result |
| Direction | {direction} |

{aggregate_scope(pkg)}
{end}
"""


def aggregate_text(root: pathlib.Path) -> str:
    return (root / AGGREGATE_REL).read_text(encoding="utf-8")


def aggregate_copies(root: pathlib.Path, pkg: Package, version: str) -> int:
    start, _end = block_markers(pkg, version)
    return aggregate_text(root).count(start)


def parse_record(text: str) -> dict[str, str]:
    fields = {}
    for key in ("Date", "Owner selection", "Review", "Reviewed commit",
                "Review verdict", "Disposition"):
        m = re.search(rf"^{re.escape(key)}: (.+)$", text, re.MULTILINE)
        if not m:
            raise ValueError(f"record carries no `{key}:` line")
        fields[key] = m.group(1)
    return fields


# --- commands ---------------------------------------------------------------

def parse_options(pkg: Package, text: str) -> frozenset[str]:
    if not pkg.options:
        return frozenset()
    m = re.search(r"^Options: (.+)$", text, re.MULTILINE)
    if not m:
        raise ValueError("record carries no `Options:` line")
    return frozenset() if m.group(1) == "none" else frozenset(m.group(1).split(", "))


def record(root: pathlib.Path, pkg: Package, version: str, date: str, quote: str,
           review_rel: str, disposition_rel: str | None,
           options: frozenset[str] = frozenset(), *, instant: str | None = None) -> int:
    if pkg.key == "three-surface-poc-governedby-reference-amendment":
        return p115_record(root, pkg, version, date, quote, review_rel, disposition_rel, options)
    if instant is None:
        instant = datetime.datetime.now(datetime.timezone.utc).strftime("%Y-%m-%dT%H:%M:%SZ")
    try:
        validate_inputs(version, date, quote, pkg)
        if pkg.installed is not None and not (INSTANT_RE.fullmatch(instant)
                                              and instant.startswith(date + "T")):
            raise ValueError("instant must be YYYY-MM-DDTHH:MM:SSZ (UTC) on the sign-off's date")
        unknown = sorted(set(options) - set(pkg.options))
        if unknown:
            raise ValueError(f"options {unknown} are not this package's; "
                             f"it offers {list(pkg.options) or 'none'}")
        if (root / record_rel(pkg, version)).exists():
            raise ValueError(f"sign-off already recorded: {record_rel(pkg, version).as_posix()}")
        if aggregate_copies(root, pkg, version):
            raise ValueError("the aggregate record already carries this version's block")
        commit, verdict = verify_reviewed(root, pkg, review_rel, disposition_rel)
        findings = pkg.check(root)
        if findings:
            raise ValueError("package does not verify: " + " | ".join(findings))
    except (ValueError, OSError) as exc:
        print(f"FAILED (before applying anything): {exc}")
        return 1
    code = pkg.apply_with(root, options) if pkg.apply_with else pkg.apply(root)
    if code != 0:
        print(f"FAILED: the builder's apply returned {code}; nothing recorded")
        return 1
    if not pkg.applied(root):
        print("FAILED after apply: the tree does not carry the applied package; "
              "restore it with git checkout before retrying")
        return 1
    disposition = disposition_rel if verdict == "CONFIRM WITH EXCEPTIONS" else None
    (root / record_rel(pkg, version)).write_text(
        render_record(pkg, version, date, quote, review_rel, commit, verdict, disposition,
                      options, root=root,
                      instant=instant if pkg.installed is not None else None,
                      rows=applied_rows(root, pkg)),
        encoding="utf-8")
    block = render_aggregate(pkg, version, date, review_rel, verdict, disposition)
    aggregate = root / AGGREGATE_REL
    body = aggregate.read_text(encoding="utf-8")
    aggregate.write_text(body.rstrip("\n") + "\n\n" + block, encoding="utf-8")
    print(f"wrote {record_rel(pkg, version).as_posix()}")
    print(f"appended the {pkg.key} v{version} block to {AGGREGATE_REL.as_posix()}")
    print(f"next: git add the applied subjects and both records, commit, then "
          f"`git tag -a {tag_for(pkg, version)}` on that commit and push the tag")
    return 0


def check(root: pathlib.Path, pkg: Package, version: str) -> int:
    if not VERSION_RE.fullmatch(version):
        print(f"FAILED: version {version!r} is not major.minor")
        return 1
    if pkg.key == "three-surface-poc-governedby-reference-amendment":
        reference = _module("prepare_three_surface_poc_governedby_reference_recording")
        state, findings = reference.family_state(root)
        if version != reference.VERSION:
            findings.append("P115 checker supports only exact canonical v1.0")
        if not findings and state != "ABSENT":
            try:
                findings = reference.binding_findings(root)
            except (OSError, ValueError, KeyError, TypeError, subprocess.CalledProcessError) as exc:
                findings = [str(exc)]
        if findings:
            print("FAILED: " + " | ".join(findings))
            return 1
    rec = root / record_rel(pkg, version)
    copies = aggregate_copies(root, pkg, version)
    if not rec.exists() and not copies:
        print(f"{pkg.key} v{version}: not performed")
        return 0
    try:
        if not rec.exists() or copies != 1:
            raise ValueError(f"partial record: record exists={rec.exists()}, "
                             f"aggregate copies={copies}")
        text = rec.read_text(encoding="utf-8")
        f = parse_record(text)
        disposition = None if f["Disposition"] == "none" else f["Disposition"]
        validate_inputs(version, f["Date"], f["Owner selection"], pkg)
        commit, verdict = validate_review(root, f["Review"], disposition, pkg.head_label,
                                          pkg.findings_end)
        extension_present(root, pkg)
        if (commit, verdict) != (f["Reviewed commit"], f["Review verdict"]):
            raise ValueError("record's reviewed commit or verdict differs from the review")
        instant = None
        if pkg.installed is not None:
            found = RECORDED_RE.findall(text)
            if len(found) != 1:
                raise ValueError(f"record carries {len(found)} 'Recorded at (UTC)' lines, not 1")
            instant = found[0]
        if text != render_record(pkg, version, f["Date"], f["Owner selection"], f["Review"],
                                 commit, verdict, disposition, parse_options(pkg, text),
                                 root=root, instant=instant,
                                 rows=recorded_rows(pkg, text)):
            raise ValueError("dedicated record differs from its regeneration")
        block = render_aggregate(pkg, version, f["Date"], f["Review"], verdict, disposition)
        if aggregate_text(root).count(block) != 1:
            raise ValueError("aggregate block differs from its regeneration")
        versions = recorded_versions(root, pkg)
        latest = versions[-1] == tuple(int(x) for x in version.split("."))
        if latest and not pkg.applied(root):
            raise ValueError("the latest signed version is not applied to the tree")
        if latest and pkg.applied_options and (
                pkg.applied_options(root) != parse_options(pkg, text)):
            raise ValueError(f"the tree carries options {sorted(pkg.applied_options(root))}, "
                             f"the record names {sorted(parse_options(pkg, text))}")
    except (ValueError, OSError) as exc:
        print(f"FAILED: {exc}")
        return 1
    print(f"recorded {pkg.key} v{version} sign-off regenerates exactly"
          + ("; applied tree verified" if latest else "; superseded by a later version"))
    return 0


# --- selftest ---------------------------------------------------------------

STUB_REVIEW = "docs/reviews/R-STUB-RAW.md"
STUB_DISPOSITION = "pkg/stub/ROUND-1-DISPOSITIONS.md"
STUB_DIR = pathlib.Path("pkg/stub")


STUB_ALSO = pathlib.Path("spec/stub")


def stub_package() -> Package:
    def check_fn(root):
        return ["stub builder failure"] if (root / STUB_DIR / "BROKEN").exists() else []

    def apply_fn(root):
        (root / "applied.txt").write_text("applied\n")
        return 0

    return Package("stub-package", "Stub package", "behavior amendment", STUB_DIR,
                   "STUB", check_fn, apply_fn, lambda root: (root / "applied.txt").exists(),
                   also=(STUB_ALSO,), subject=STUB_ALSO / "spec.md")


STUB_SUBJECT_BYTES = b"specification bytes\n"


def stub_review(commit: str, verdict: str = "CONFIRM", findings: str = "No findings.",
                extra_head: str = "") -> str:
    return (f"# Review — stub-package\nReviewed commit: {commit}\n"
            f"Manifest SHA-256: {beh.digest(STUB_SUBJECT_BYTES)}\nVerdict: {verdict}\n{extra_head}\n"
            f"## Findings\n\n{findings}\n")


NOTES = ("**Finding 1 — first** (note) evidence\n\n"
         "**Finding 2 — second** (note) evidence\n")


def stub_disposition(review: str = STUB_REVIEW, numbers=(1, 2)) -> str:
    body = "".join(f"### {n} — note\n\nLeft.\n\n" for n in numbers)
    return f"Reviewed record: {review}\n\n{body}"


def make_fixture(tmp: pathlib.Path, review_text=None, disposition_text=None,
                 aggregate: str = "# Record\n",
                 package_files: dict | None = None) -> tuple[pathlib.Path, str]:
    def run(*args):
        subprocess.run(["git", "-C", str(tmp), "-c", "user.email=t@t", "-c", "user.name=t",
                        *args], check=True, capture_output=True)
    run("init", "-q")
    # No automatic gc or maintenance in the fixture: git may detach one after a commit, and it then writes under objects/ while
    # TemporaryDirectory removes the tree ("Directory not empty: 'objects'" in hosted CI, syzygy-y733). Set in the repository's own
    # config, so every later git command in it, the recorder's included, honours it.
    run("config", "gc.auto", "0")
    run("config", "maintenance.auto", "false")
    (tmp / STUB_DIR).mkdir(parents=True)
    (tmp / STUB_DIR / "manifest.txt").write_text("package bytes\n")
    (tmp / STUB_ALSO).mkdir(parents=True)
    (tmp / STUB_ALSO / "spec.md").write_bytes(STUB_SUBJECT_BYTES)
    (tmp / STUB_ALSO / "proposal.md").write_text("proposal bytes\n")
    for name, body in (package_files or {}).items():
        (tmp / STUB_DIR / name).write_text(body)
    (tmp / AGGREGATE_REL).parent.mkdir(parents=True)
    (tmp / AGGREGATE_REL).write_text(aggregate)
    run("add", "-A")
    run("commit", "-qm", "package")
    commit = subprocess.run(["git", "-C", str(tmp), "rev-parse", "HEAD"],
                            capture_output=True, text=True).stdout.strip()
    (tmp / "docs/reviews").mkdir(parents=True)
    (tmp / STUB_REVIEW).write_text(
        review_text(commit) if callable(review_text) else (review_text or stub_review(commit)))
    if disposition_text is not None:
        (tmp / STUB_DISPOSITION).write_text(disposition_text)
    run("add", "-A")
    run("commit", "-qm", "review")
    return tmp, commit


STUB_ROUND1 = "ROUND-1-DISPOSITIONS.md"
STUB_ROUND1_BYTES = b"an earlier round's dispositions, reviewed\n"


def stub_dir_digest(files: dict[str, bytes]) -> str:
    """The brief's directory digest over ``files`` (names under STUB_DIR)."""
    rows = sorted((f"{STUB_DIR.as_posix()}/{name}", body) for name, body in files.items())
    rows.sort(key=lambda row: row[0].encode("utf-8"))
    return beh.digest("".join(f"{beh.digest(body)}  {rel}\n" for rel, body in rows).encode())


def package_digest_fixtures(results, refused, run_record, run_check, pkg) -> None:
    """Fixtures for a manifest-less package bound by a `Package digest:` head,
    its applied rows, and the bare-patch package helpers."""
    import dataclasses as _dc
    reviewed = {"manifest.txt": b"package bytes\n", STUB_ROUND1: STUB_ROUND1_BYTES}
    good = stub_dir_digest(reviewed)

    def head(commit, digest_lines=None, verdict="CONFIRM", findings="No findings."):
        lines = digest_lines if digest_lines is not None else [f"Package digest: {good}"]
        return ("# Review — stub-package (directory digest)\n"
                f"Reviewed commit: {commit}\n" + "".join(f"{x}\n" for x in lines)
                + f"Verdict: {verdict}\n\n## Findings\n\n{findings}\n")

    def applied(root):
        rec = root / record_rel(pkg, "1.0")
        if rec.is_file():
            return _rows_hash_tree(root, record_rel(pkg, "1.0"))
        return (root / "applied.txt").exists()

    nomanifest = _dc.replace(pkg, subject=None, package_digest=True, applied=applied,
                             applied_subjects=(pathlib.Path("applied.txt"),))

    def fixture(t, review, extra=None, mutate=None):
        tmp, commit = make_fixture(pathlib.Path(t), review,
                                   package_files={STUB_ROUND1: STUB_ROUND1_BYTES.decode()})
        for name, body in (extra or {}).items():
            (tmp / STUB_DIR / name).write_text(body)
        if mutate:
            mutate(tmp)
        return tmp, commit

    def attempt(name, review, *, package=nomanifest, extra=None, mutate=None, expect=None):
        with tempfile.TemporaryDirectory() as t:
            tmp, _commit = fixture(t, review, extra, mutate)
            code, out = run_record(tmp, package)
            clean = not (tmp / "applied.txt").exists() and not (tmp / record_rel(pkg, "1.0")).exists()
            results.append((f"refused: {name}",
                            code == 1 and clean and (expect is None or expect in out)))

    with tempfile.TemporaryDirectory() as t:
        tmp, commit = fixture(t, head, extra={"ROUND-2-DISPOSITIONS.md": "added after the review\n"})
        code, out = run_record(tmp, nomanifest)
        rec = tmp / record_rel(pkg, "1.0")
        text = rec.read_text() if rec.exists() else ""
        row = f"{beh.digest(b'applied' + bytes([10]))}  applied.txt\n"
        results.append(("a `Package digest:` head binds a manifest-less package over the reviewed "
                        "file set (a sibling record added since left out), records its applied "
                        "rows, and checks",
                        code == 0 and "## Applied subjects" in text and row in text
                        and run_check(tmp, "1.0", nomanifest) == 0))
        # Same bytes at another path, so only the population predicate decides.
        (tmp / "other.txt").write_text("applied\n")
        rec.write_text(text.replace(row, row.replace("applied.txt", "other.txt")))
        results.append(("--check fails when the record's applied rows name other subjects",
                        run_check(tmp, "1.0", nomanifest) == 1))
        rec.write_text(text)
        (tmp / "applied.txt").write_text("drifted\n")
        results.append(("--check fails when the tree no longer hashes to the recorded rows",
                        run_check(tmp, "1.0", nomanifest) == 1))
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = fixture(t, lambda c: head(c, verdict="CONFIRM WITH EXCEPTIONS",
                                                findings=NOTES),
                              extra=None)
        later = (STUB_DIR / "ROUND-3-DISPOSITIONS.md").as_posix()
        (tmp / later).write_text(stub_disposition())
        code, _ = run_record(tmp, nomanifest, disposition_rel=later)
        results.append(("a notes-only `Package digest:` head records with a disposition added "
                        "after the review", code == 0 and run_check(tmp, "1.0", nomanifest) == 0))
    results.append(("parse_head reads a `Package digest:` head as the package form",
                    parse_head_form(head("c" * 40))[2:] == (good, "package")))
    attempt("a head carrying both a manifest and a package digest line",
            lambda c: head(c, [f"Manifest SHA-256: {good}", f"Package digest: {good}"]),
            expect="carries both")
    attempt("a head carrying two package digest lines",
            lambda c: head(c, [f"Package digest: {good}", f"Package digest: {good}"]),
            expect="exactly one `Package digest:`")
    attempt("a manifest-less package offered a manifest head",
            lambda c: head(c, [f"Manifest SHA-256: {good}"]),
            expect="binds only by a `Package digest:`")
    attempt("a manifest package offered a package digest head", head,
            package=pkg, expect="binds only a package that declares")
    attempt("a package digest that is not the reviewed set's",
            lambda c: head(c, [f"Package digest: {'f' * 64}"]), expect="not the directory digest")
    attempt("a reviewed sibling record edited after the review",
            head, mutate=lambda tmp: (tmp / STUB_DIR / STUB_ROUND1).write_text("edited\n"),
            expect="not the directory digest")
    attempt("a reviewed sibling record removed after the review",
            head, mutate=lambda tmp: (tmp / STUB_DIR / STUB_ROUND1).unlink(),
            expect="missing or not a regular file")
    attempt("a digest over the whole directory, sibling record added since included",
            lambda c: head(c, [f"Package digest: " + stub_dir_digest(
                {**reviewed, "ROUND-2-DISPOSITIONS.md": b"added after the review\n"})]),
            extra={"ROUND-2-DISPOSITIONS.md": "added after the review\n"},
            expect="not the directory digest")
    with tempfile.TemporaryDirectory() as t:
        odd = {"a\\b.txt": b"escaped by sha256sum\n"}
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: head(c, [
            f"Package digest: {stub_dir_digest({**reviewed, **odd})}"]),
            package_files={STUB_ROUND1: STUB_ROUND1_BYTES.decode(), "a\\b.txt": odd["a\\b.txt"].decode()})
        code, out = run_record(tmp, nomanifest)
        results.append(("refused: a reviewed path sha256sum would escape is ambiguous",
                        code == 1 and "would be escaped" in out
                        and not (tmp / "applied.txt").exists()))
    attempt("a near-miss package digest line",
            lambda c: head(c, [f"Package Digest: {good}"]),
            expect="exactly one `Manifest SHA-256:`")
    labelled = _dc.replace(pkg, head_label="PWB")
    stub_digest = beh.digest(STUB_SUBJECT_BYTES)
    attempt("a package digest line inside a two-package head",
            lambda c: (f"# R\nReviewed commit: {c}\nPWB manifest SHA-256: {stub_digest}\n"
                       f"POC manifest SHA-256: {'cd' * 32}\nPWB verdict: CONFIRM\n"
                       f"Package digest: {good}\nPOC verdict: CONFIRM\n\nstub-package\n"),
            package=labelled, expect="no labelled form")

    # The bare-patch helpers: a patch that applies and a declaration the
    # generator reproduces pass; each broken input is a finding.
    def generate(text):
        return f"declaration of {beh.digest(text.encode())}\n", []

    old, new = "old\n", "new\n"
    spec, gov = pathlib.Path("a/spec.md"), pathlib.Path("a/gov.md")

    def patch(rel, before, after):
        return (f"--- a/{rel.as_posix()}\n+++ b/{rel.as_posix()}\n@@ -1 +1 @@\n"
                f"-{before}+{after}")

    def bare(spec_patch=None, gov_after=None, extra_patch=None):
        t = tempfile.TemporaryDirectory()
        root = pathlib.Path(t.name)
        (root / "a").mkdir()
        (root / spec).write_text(old)
        (root / gov).write_text(generate(old)[0])
        (root / "p").mkdir()
        (root / "p/spec.md.patch").write_text(spec_patch or patch(spec, old, new))
        (root / "p/gov.md.patch").write_text(
            patch(gov, generate(old)[0], gov_after or generate(new)[0]))
        if extra_patch:
            (root / "p/z.patch").write_text(extra_patch)
        return t, root

    def findings_of(root):
        return patch_package_findings(root, pathlib.Path("p"), (gov, spec), spec, gov, generate)

    t, root = bare()
    with t:
        ok = findings_of(root) == []
        import io
        import contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            applied_code = patch_package_apply(root, pathlib.Path("p"), findings_of)
        rec = pathlib.Path("rec.md")
        before_record = patch_package_applied(root, pathlib.Path("p"), rec)
        (root / rec).write_text(f"{beh.digest(new.encode())}  {spec.as_posix()}\n")
        after_record = patch_package_applied(root, pathlib.Path("p"), rec)
        # A later sign-off re-patches a file the record has no row for: the
        # patches no longer reverse, but the recorded rows still decide.
        (root / gov).write_text("a later sign-off's bytes\n")
        after_record = after_record and patch_package_applied(root, pathlib.Path("p"), rec)
        (root / spec).write_text("drifted\n")
        drifted = patch_package_applied(root, pathlib.Path("p"), rec)
        results.append(("bare patches: check passes, apply writes, applied reads reversal "
                        "before the record and its rows after",
                        ok and applied_code == 0 and (root / spec).exists() and before_record
                        and after_record and not drifted))
    for name, kwargs, expect in (
            ("a patch that does not apply", {"spec_patch": patch(spec, "other\n", new)},
             "does not apply"),
            ("a declaration the generator does not reproduce",
             {"gov_after": "declaration of something else\n"}, "differs from its regeneration"),
            ("a patch targeting no subject", {"extra_patch": patch(pathlib.Path("b/x.md"), old, new)},
             "not exactly one subject")):
        t, root = bare(**kwargs)
        with t:
            found = findings_of(root)
            with contextlib.redirect_stdout(io.StringIO()):
                refused_apply = patch_package_apply(root, pathlib.Path("p"), findings_of)
            results.append((f"bare patches refused: {name}",
                            any(expect in f for f in found) and refused_apply == 1
                            and (root / spec).read_text() == old))
    real = real_packages()
    intent = real["three-surface-poc-governing-intent-amendment"]
    results.append(("the real P-100 entry binds by package digest, records the six POC subjects "
                    "and names the POC extension",
                    intent.package_digest and intent.subject is None
                    and intent.applied_subjects == POC_SUBJECTS and len(POC_SUBJECTS) == 6
                    and intent.extension == POC_EXTENSION_REL
                    and not real["pwb-class-granular-extraction-amendment"].package_digest
                    and not real["pwb-accessible-name-amendment"].package_digest))
    vocabulary = real["three-surface-poc-vocabulary-epistemic-amendment"]
    vocabulary_builder = _module("build_three_surface_poc_vocabulary_epistemic_amendment")
    results.append(("the real P-108 entry binds its builder's manifest and names the POC extension",
                    vocabulary.subject == vocabulary_builder.MANIFEST_OUT
                    and vocabulary.extension == POC_EXTENSION_REL and not vocabulary.package_digest))
    consent = real["cap1-trusted-bootstrap-consent"]
    consent_builder = _module("build_cap1_trusted_bootstrap_consent_adoption")
    results.append(("the real P-109 entry is the CAP1 change itself, binds the builder's review "
                    "subject and names only the CAP1 extension",
                    consent.candidate == consent_builder.CHANGE
                    and consent.subject == consent_builder.SUBJECT
                    and consent.extension == CAP1_CONSENT_EXTENSION_REL
                    and consent.extension != POC_EXTENSION_REL
                    and consent.installed is None and consent.also == ()))


def selftest() -> int:
    pkg = stub_package()
    results: list[tuple[str, bool]] = []
    args = dict(version="1.0", date="2026-10-02", quote='Selected "Sign off" on the stub question',
                review_rel=STUB_REVIEW, disposition_rel=None)

    def run_record(tmp, package=None, **override):
        merged = {**args, **override}
        import io
        import contextlib
        with contextlib.redirect_stdout(io.StringIO()) as out:
            code = record(tmp, package or pkg, merged["version"], merged["date"], merged["quote"],
                          merged["review_rel"], merged["disposition_rel"])
        return code, out.getvalue()

    def run_check(tmp, version, package=None):
        import io
        import contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            return check(tmp, package or pkg, version)

    def refused(name, *, review=None, disposition=None, mutate=None, expect=None, package=None,
                **override):
        with tempfile.TemporaryDirectory() as t:
            tmp, commit = make_fixture(pathlib.Path(t), review, disposition)
            if mutate:
                mutate(tmp, commit)
            code, out = run_record(tmp, package, **override)
            clean = not (tmp / "applied.txt").exists() and not (tmp / record_rel(pkg, "1.0")).exists()
            results.append((f"refused: {name}",
                            code == 1 and clean and (expect is None or expect in out)))

    # the happy paths, and --check over them
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t))
        code, _ = run_record(tmp)
        rec = tmp / record_rel(pkg, "1.0")
        results.append(("CONFIRM records, applies and writes both records",
                        code == 0 and rec.exists() and (tmp / "applied.txt").exists()
                        and aggregate_copies(tmp, pkg, "1.0") == 1))
        results.append(("check passes over a fresh record", run_check(tmp, "1.0") == 0))
        results.append(("check reports not performed for an unrecorded version",
                        run_check(tmp, "9.9") == 0))
        code2, out2 = run_record(tmp)
        results.append(("refused: version already recorded",
                        code2 == 1 and "already recorded" in out2))
        code3, _ = run_record(tmp, version="1.1")
        results.append(("a second version records beside the first", code3 == 0))
        results.append(("check on the superseded version passes",
                        run_check(tmp, "1.0") == 0 and run_check(tmp, "1.1") == 0))
        original = rec.read_text()
        rec.write_text(original.replace("Stub package", "Edited package", 1))
        results.append(("check fails on an edited record", run_check(tmp, "1.0") == 1))
        rec.write_text(original)
        agg = (tmp / AGGREGATE_REL).read_text()
        (tmp / AGGREGATE_REL).write_text(agg.replace("recorded 2026-10-02", "recorded 2026-10-03", 1))
        results.append(("check fails on an edited aggregate block", run_check(tmp, "1.0") == 1))
        start, end = block_markers(pkg, "1.0")
        block = agg[agg.index(start):agg.index(end) + len(end) + 1]
        (tmp / AGGREGATE_REL).write_text(agg + "\n" + block)
        results.append(("check fails on a duplicated aggregate block", run_check(tmp, "1.0") == 1))
        (tmp / AGGREGATE_REL).write_text(agg)
        (tmp / record_rel(pkg, "1.1")).unlink()
        results.append(("check fails on a partial record (aggregate without dedicated)",
                        run_check(tmp, "1.1") == 1))
        (tmp / "applied.txt").unlink()
        results.append(("check fails when the latest version is not applied",
                        run_check(tmp, "1.0") == 1))

    with tempfile.TemporaryDirectory() as t:
        # A row a later performed sign-off re-patched is history; any other
        # drift still fails.
        root = pathlib.Path(t)
        later_record, later_manifest = next(iter(beh.VERSIONED_LATER.values()))
        own = pathlib.Path("own-manifest.txt")
        target = "subject.md"
        (root / target).write_text("v2\n")
        sha_old, sha_new = beh.digest(b"v1\n"), beh.digest(b"v2\n")
        (root / own).write_text(f"{sha_old}  {target}\n")
        results.append(("applied: a row the tree no longer hashes to fails with no later source",
                        not _rows_hash_tree(root, own)))
        (root / later_record).parent.mkdir(parents=True, exist_ok=True)
        (root / later_record).write_text("record\n")
        (root / later_manifest).parent.mkdir(parents=True, exist_ok=True)
        (root / later_manifest).write_text(f"{sha_new}  {target}\n")
        results.append(("applied: a row a later performed sign-off re-patched is history",
                        _rows_hash_tree(root, own)))
        (root / later_manifest).write_text(f"{beh.digest(b'other')}  {target}\n")
        results.append(("applied: a later manifest digest the tree does not hash to still fails",
                        not _rows_hash_tree(root, own)))

    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: stub_review(
            c, "CONFIRM WITH EXCEPTIONS", NOTES), stub_disposition())
        code, _ = run_record(tmp, disposition_rel=STUB_DISPOSITION)
        results.append(("CONFIRM WITH EXCEPTIONS, notes only and dispositioned, records",
                        code == 0 and run_check(tmp, "1.0") == 0))
        results.append(("the disposition record is not package bytes",
                        "Disposition: " + STUB_DISPOSITION in (tmp / record_rel(pkg, "1.0")).read_text()))

    for bad in ("1", "1.0.0", "v1.0", "01.0", "1.00", "1.x", ""):
        refused(f"version {bad!r}", version=bad, expect="major.minor")
    refused("bad date", date="2026-1-2", expect="YYYY-MM-DD")
    refused("empty selection quote", quote="  ", expect="one non-empty line")
    refused("multi-line selection quote", quote="a\nb", expect="one non-empty line")
    refused("selection quote carrying a digest", quote="Sign " + "ab" * 32, expect="digest")
    refused("REVISE verdict", review=lambda c: stub_review(c, "REVISE"), expect="not CONFIRM")
    refused("free-form verdict", review=lambda c: stub_review(c, "APPROVED"), expect="not CONFIRM")
    refused("two verdict lines in the head",
            review=lambda c: f"Reviewed commit: {c}\nManifest SHA-256: {'ab' * 32}\n"
                             f"Verdict: CONFIRM\nVerdict: CONFIRM\n", expect="exactly one `Verdict:`")
    refused("head without a reviewed commit",
            review="# R\nManifest SHA-256: " + "ab" * 32 + "\nVerdict: CONFIRM\n", expect="Reviewed commit")
    refused("head without a manifest line",
            review=lambda c: f"# R\nReviewed commit: {c}\nVerdict: CONFIRM\n", expect="Manifest SHA-256")
    refused("verdict pushed past the four-line head",
            review=lambda c: f"# R\nReviewed commit: {c}\n\nManifest SHA-256: {'ab' * 32}\n"
                             f"\nsome line\nVerdict: CONFIRM\n", expect="exactly one `Verdict:`")
    # A two-package head (the N9 round-2 raw's form): each package binds by
    # its own labelled manifest and verdict line.
    import dataclasses as _dc
    labelled = _dc.replace(pkg, head_label="PWB")
    other_label = _dc.replace(pkg, head_label="POC")
    stub_digest = beh.digest(STUB_SUBJECT_BYTES)

    def two_head(commit, *, lines=None, findings="No findings.", title=True):
        head = lines if lines is not None else [
            f"Reviewed commit: {commit}",
            f"PWB manifest SHA-256: {stub_digest}",
            f"POC manifest SHA-256: {'cd' * 32}",
            "PWB verdict: CONFIRM",
            "POC verdict: CONFIRM WITH EXCEPTIONS"]
        return (("# Review — stub-package (two halves)\n" if title else "")
                + "\n".join(head) + "\n\nstub-package"
                + f"\n\n## Findings\n\n{findings}\n")

    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), two_head)
        code, _ = run_record(tmp, labelled)
        results.append(("a two-package head binds a labelled package by its own lines, and checks",
                        code == 0 and run_check(tmp, "1.0", labelled) == 0
                        and "Review verdict: CONFIRM\n" in (tmp / record_rel(pkg, "1.0")).read_text()))
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: two_head(c, findings=NOTES),
                                   stub_disposition())
        swapped = _dc.replace(other_label)
        code, _ = run_record(tmp, _dc.replace(swapped, subject=None),
                             disposition_rel=STUB_DISPOSITION)
        results.append(("the other label reads its own verdict (CONFIRM WITH EXCEPTIONS) "
                        "and needs the disposition",
                        code == 0 and "Review verdict: CONFIRM WITH EXCEPTIONS\n"
                        in (tmp / record_rel(pkg, "1.0")).read_text()))

    def head_lines(commit, **change):
        lines = {"commit": f"Reviewed commit: {commit}",
                 "pwb_manifest": f"PWB manifest SHA-256: {stub_digest}",
                 "poc_manifest": f"POC manifest SHA-256: {'cd' * 32}",
                 "pwb_verdict": "PWB verdict: CONFIRM",
                 "poc_verdict": "POC verdict: CONFIRM"}
        lines.update(change)
        return [v for v in lines.values() if v is not None]

    refused("two-package head: a package with no head label",
            review=lambda c: two_head(c), expect="declares none")
    refused("two-package head: a label the head does not carry",
            review=lambda c: two_head(c), package=_dc.replace(pkg, head_label="CAP"),
            expect="carries no `CAP` lines")
    refused("two-package head: an unlabelled manifest line beside the labelled ones",
            review=lambda c: two_head(c, lines=head_lines(
                c, poc_verdict=f"Manifest SHA-256: {stub_digest}")),
            package=labelled, expect="unlabelled")
    refused("two-package head: an unlabelled verdict line beside the labelled ones",
            review=lambda c: two_head(c, lines=head_lines(c, poc_verdict="Verdict: CONFIRM")),
            package=labelled, expect="unlabelled")
    refused("two-package head: a label with a manifest line and no verdict line",
            review=lambda c: two_head(c, lines=head_lines(c, poc_verdict=None)),
            package=labelled, expect="each label needs both")
    refused("two-package head: one label only",
            review=lambda c: two_head(c, lines=head_lines(
                c, poc_manifest=f"PWB manifest SHA-256: {stub_digest}",
                poc_verdict="PWB verdict: CONFIRM")),
            package=labelled, expect="carries 1 labels, not 2")
    refused("two-package head: a repeated label (untitled head)",
            review=lambda c: two_head(c, title=False, lines=head_lines(c)[:2]
                                      + [f"PWB manifest SHA-256: {stub_digest}"]
                                      + head_lines(c)[2:]),
            package=labelled, expect="repeats the lines of label(s) ['PWB']")
    refused("two-package head: a stray label with one line",
            review=lambda c: two_head(c, lines=head_lines(
                c, pwb_verdict=f"CAP manifest SHA-256: {'ef' * 32}")),
            package=labelled, expect="each label needs both")
    refused("two-package head: a near-miss verdict line",
            review=lambda c: two_head(c, lines=head_lines(c, pwb_verdict="PWB Verdict: CONFIRM")),
            package=labelled, expect="no labelled form")
    refused("two-package head: a near-miss digest line",
            review=lambda c: two_head(c, lines=head_lines(
                c, poc_manifest=f"POC manifest sha256: {'cd' * 32}")),
            package=labelled, expect="no labelled form")
    refused("two-package head: two reviewed-commit lines",
            review=lambda c: two_head(c, lines=head_lines(c, poc_verdict=f"Reviewed commit: {c}")),
            package=labelled, expect="exactly one `Reviewed commit:`")
    refused("two-package head: this label's verdict REVISE",
            review=lambda c: two_head(c, lines=head_lines(c, pwb_verdict="PWB verdict: REVISE")),
            package=labelled, expect="not CONFIRM")
    refused("two-package head: the other label's digest is not this subject's",
            review=lambda c: two_head(c, lines=head_lines(
                c, pwb_manifest=f"PWB manifest SHA-256: {'cd' * 32}",
                poc_manifest=f"POC manifest SHA-256: {stub_digest}")),
            package=labelled, expect="head digest is not the sha256")
    refused("two-package head: a verdict line pushed past the six-line head",
            review=lambda c: two_head(c, lines=head_lines(c, poc_verdict=None)
                                      + ["Reviewer: x", "POC verdict: CONFIRM"]),
            package=labelled, expect="each label needs both")
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), two_head)
        results.append(("a single-package head still reads its four lines (no label needed)",
                        parse_head(stub_review(commit)) == (commit, "CONFIRM", stub_digest)))
    # A package signed under a Scope A extension names the direction.
    extended = _dc.replace(pkg, extension=DECISIONS / "EXTENSION.md")
    refused("an extension direction that is missing", package=extended,
            expect="missing Scope A extension direction")
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t))
        (tmp / DECISIONS / "EXTENSION.md").write_text("direction\n")
        code, _ = run_record(tmp, extended)
        text = (tmp / record_rel(pkg, "1.0")).read_text()
        agg = (tmp / AGGREGATE_REL).read_text()
        ok = (code == 0 and "Scope A extension: `" + (DECISIONS / "EXTENSION.md").as_posix() in text
              and "extended by `" in agg and run_check(tmp, "1.0", extended) == 0)
        (tmp / DECISIONS / "EXTENSION.md").unlink()
        results.append(("an extension direction is named in both records; --check refuses "
                        "once it is gone", ok and run_check(tmp, "1.0", extended) == 1))
    real_pair = real_packages()
    results.append(("the real N9 pair bind by labels PWB and POC, and only the POC half "
                    "names the extension",
                    real_pair["pwb-anchor-resolution-amendment"].head_label == "PWB"
                    and real_pair["pwb-anchor-resolution-amendment"].extension is None
                    and real_pair["three-surface-poc-block-provenance-amendment"].head_label == "POC"
                    and real_pair["three-surface-poc-block-provenance-amendment"].extension
                    == POC_EXTENSION_REL))
    package_digest_fixtures(results, refused, run_record, run_check, pkg)
    refused("missing review raw", review_rel="docs/reviews/none-RAW.md", expect="missing review raw")
    refused("reviewed commit unknown to the repository",
            review=lambda c: stub_review("1" * 40), expect="not in this repository")
    revise_findings = "**Finding 1 — first** (revise) evidence\n"
    refused("a revise-severity finding under CONFIRM WITH EXCEPTIONS",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS", revise_findings),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="non-note")
    refused("a blocking finding under CONFIRM WITH EXCEPTIONS",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                         "**Finding 1 — first** (blocking) evidence\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="non-note")
    refused("an ASCII-hyphen revise finding under CONFIRM WITH EXCEPTIONS",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                         "**Finding 1 - first** (revise) evidence\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="non-note")
    for qualified in ("(note, for the owner's view)", "(note, for the owner)",
                      "(note: reported for the owner, not resolved)"):
        with tempfile.TemporaryDirectory() as t:
            tmp, commit = make_fixture(pathlib.Path(t), lambda c, q=qualified: stub_review(
                c, "CONFIRM WITH EXCEPTIONS",
                f"**Finding 1 — first** {q} evidence\n\n**Finding 2 — second** (note) evidence\n"),
                stub_disposition())
            code, _ = run_record(tmp, disposition_rel=STUB_DISPOSITION)
            results.append((f"a qualified note {qualified} reads as a note and records",
                            code == 0 and run_check(tmp, "1.0") == 0))
    for qualified in ("(blocking, for the owner)", "(revise: before sign-off)", "(revise — owner)"):
        refused(f"a qualified non-note {qualified} stays non-note",
                review=lambda c, q=qualified: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                                          f"**Finding 1 — first** {q} evidence\n"),
                disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
                expect="non-note")
    for qualified in ("(note, editorial)", "(note: not resolved)",
                      "(note, for the owner\u2019s view)"):
        with tempfile.TemporaryDirectory() as t:
            tmp, commit = make_fixture(pathlib.Path(t), lambda c, q=qualified: stub_review(
                c, "CONFIRM WITH EXCEPTIONS",
                f"**Finding 1 — first** {q} evidence\n\n**Finding 2 — second** (note) evidence\n"),
                stub_disposition())
            code, _ = run_record(tmp, disposition_rel=STUB_DISPOSITION)
            results.append((f"an allowed qualifier {qualified} records", code == 0))
    for qualified in ("(note_blocking)", "(note, blocker)", "(note, revises the clause)",
                      "(note, REVISE)", "(note, Blocking)", "(note, non-blocking)",
                      "(note — for the owner)", "(note for the owner)",
                      "(note, for the owner, blocking)"):
        refused(f"a note qualifier outside the allow-list {qualified} is ambiguous",
                review=lambda c, q=qualified: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                                          f"**Finding 1 — first** {q} evidence\n"),
                disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
                expect="ambiguous")
    refused("a note whose qualifier names a stronger severity",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                         "**Finding 1 — first** (note, but revise-level) evidence\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="ambiguous")
    refused("a severity word run into another word",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                         "**Finding 1 — first** (notes) evidence\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="no (blocking|revise|note) severity")
    refused("a finding with no severity",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS", "**Finding 1 — first** evidence\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="no (blocking|revise|note) severity")
    refused("CONFIRM WITH EXCEPTIONS with no countable finding",
            review=lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS", "No findings.\n"),
            disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
            expect="no countable finding")
    # R-364-2 F5: a finding in a form the classifier does not read, or a
    # blocking/revise tag it did not consume, refuses; so does a bare CONFIRM
    # over its own blocking finding. Each base below records once the
    # offending line is gone (the notes-only fixture above).
    one_note = "**Finding 1 — first** (note) evidence\n\n"
    for form in ("### Finding 2 - x (blocking)", "- **Finding 2 - x** (blocking)",
                 "**F2 - x** (blocking)", "### F2 — x", "1) Finding 2: x",
                 "Finding 2 reads as a note. [revise]", "Severity: blocking"):
        refused(f"an unread finding form {form!r}",
                review=lambda c, f=form: stub_review(c, "CONFIRM WITH EXCEPTIONS",
                                                     one_note + f + "\n"),
                disposition=stub_disposition(numbers=(1,)), disposition_rel=STUB_DISPOSITION,
                expect="form the classifier does not read")
    refused("a bare CONFIRM over its own blocking finding",
            review=lambda c: stub_review(c, "CONFIRM", "**Finding 1 — first** (blocking) evidence\n"),
            expect="contradicts its own findings")
    refused("a bare CONFIRM over a blocking finding in an unread form",
            review=lambda c: stub_review(c, "CONFIRM", "### F1 — first (revise)\n"),
            expect="form the classifier does not read")
    refused("a bare CONFIRM with no findings section",
            review=lambda c: stub_review(c).replace("## Findings", "## Notes"),
            expect="missing its configured raw findings heading")
    with tempfile.TemporaryDirectory() as t:
        prose = ("No finding is blocking or revise; it is not revise-level. Round-2 Finding 1\n"
                 "Finding 2) is cited, and F20 row was read. Not blocking.\n")
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: stub_review(
            c, "CONFIRM WITH EXCEPTIONS", NOTES + "\n" + prose), stub_disposition())
        code, _ = run_record(tmp, disposition_rel=STUB_DISPOSITION)
        results.append(("prose naming severities and cross-referencing findings is not a "
                        "finding form", code == 0))
    cwe = lambda c: stub_review(c, "CONFIRM WITH EXCEPTIONS", NOTES)  # noqa: E731
    refused("CONFIRM WITH EXCEPTIONS without --disposition", review=cwe, expect="needs --disposition")
    refused("CONFIRM WITH EXCEPTIONS with a missing disposition file", review=cwe,
            disposition_rel="pkg/stub/ROUND-9-DISPOSITIONS.md", expect="missing disposition record")
    refused("disposition missing a finding", review=cwe, disposition=stub_disposition(numbers=(1,)),
            disposition_rel=STUB_DISPOSITION, expect="do not match")
    refused("disposition with an extra finding", review=cwe,
            disposition=stub_disposition(numbers=(1, 2, 3)), disposition_rel=STUB_DISPOSITION,
            expect="do not match")
    refused("disposition naming another raw", review=cwe,
            disposition=stub_disposition(review="docs/reviews/other-RAW.md"),
            disposition_rel=STUB_DISPOSITION, expect="does not name the reviewed raw")

    def edit_package(tmp, commit):
        (tmp / STUB_DIR / "manifest.txt").write_text("edited after the review\n")

    def add_package_file(tmp, commit):
        (tmp / STUB_DIR / "new.txt").write_text("new\n")

    def edit_also(tmp, commit):
        (tmp / STUB_ALSO / "proposal.md").write_text("edited after the review\n")

    def add_also_file(tmp, commit):
        (tmp / STUB_ALSO / "new.md").write_text("untracked\n")

    def add_also_sibling(tmp, commit):
        (tmp / STUB_ALSO / "ROUND-9-DISPOSITIONS.md").write_text("not a candidate record\n")

    def edit_subject(tmp, commit):
        (tmp / STUB_ALSO / "spec.md").write_text("edited after the review\n")

    refused("a file added to a declared further directory", mutate=add_also_file,
            expect="package bytes changed")
    refused("a sibling-named record inside a further directory is package bytes",
            mutate=add_also_sibling, expect="package bytes changed")
    refused("the reviewed subject edited after the review", mutate=edit_subject,
            expect="head digest is not the sha256")
    refused("a head digest that is not the subject's",
            review=lambda c: stub_review(c).replace(beh.digest(STUB_SUBJECT_BYTES), "f" * 64),
            expect="head digest is not the sha256")
    refused("a raw that does not name the package",
            review=lambda c: stub_review(c).replace("stub-package", "other-package"),
            expect="does not name the package")
    aliased = dataclasses_replace(pkg, review_alias="build_stub.py")
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: stub_review(c).replace(
            "stub-package", "the builder build_stub.py"))
        code, _ = run_record(tmp, aliased)
        results.append(("a raw naming the package only by its declared alias records", code == 0))
    refused("a raw naming neither the package nor its declared alias",
            review=lambda c: stub_review(c).replace("stub-package", "build_other.py"),
            package=aliased, expect="or `build_stub.py`")
    # R-364-2 F4: the key and the alias bind only as whole tokens outside a fence.
    for name, swap in (("only a longer name `<key>-v2`", "stub-package-v2"),
                       ("only a dotted extension `<key>.v2`", "stub-package.v2"),
                       ("only a prefixed name", "old-stub-package"),
                       ("the key only inside a fence", None)):
        refused(f"a raw naming {name}",
                review=lambda c, s=swap: (
                    stub_review(c).replace("stub-package", s) if s else
                    stub_review(c).replace("stub-package", "R") + "\n```\nstub-package\n```\n"),
                expect="does not name the package")
    refused("a raw naming the alias only as a longer name",
            review=lambda c: stub_review(c).replace("stub-package", "build_stub.py_old"),
            package=aliased, expect="or `build_stub.py`")
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), lambda c: stub_review(c).replace(
            "stub-package", "candidates/stub-package/, the package."))
        code, _ = run_record(tmp)
        results.append(("a raw naming the key as a path segment records", code == 0))
    refused("the reviewed subject missing",
            mutate=lambda tmp, commit: (tmp / STUB_ALSO / "spec.md").unlink(),
            expect="reviewed subject " + (STUB_ALSO / "spec.md").as_posix() + " is missing")
    real = real_packages()["polaris-dossier-local-agent-mode"]
    results.append(("the real dossier package binds its builder's proposed spec as the subject",
                    real.subject is not None
                    and real.subject == _module("build_polaris_dossier_local_agent_mode").PROPOSED_SPEC))

    # Versioned entries, options and a computed subject (dossier v1.1).
    import contextlib
    import dataclasses
    import io
    packages = real_packages()
    results.append(("package_for selects a key@version entry and falls back to the key",
                    package_for(packages, "polaris-dossier-local-agent-mode", "1.1")
                    is packages["polaris-dossier-local-agent-mode@1.1"]
                    and package_for(packages, "polaris-dossier-local-agent-mode", "1.0")
                    is packages["polaris-dossier-local-agent-mode"]))
    real11 = packages["polaris-dossier-local-agent-mode@1.1"]
    v11 = _module("build_polaris_dossier_local_agent_mode_v1_1")
    results.append(("the real v1.1 entry shares v1.0's key and record stem, binds the computed "
                    "subject and offers n6",
                    real11.key == real.key and real11.record_stem == real.record_stem
                    and real11.subject == v11.SPEC and real11.subject_bytes is not None
                    and real11.options == tuple(v11.OPTIONS) and real11.apply_with is not None
                    and real11.applied_options is not None))
    real12 = packages["polaris-dossier-local-agent-mode@1.2"]
    v12 = _module("build_polaris_dossier_local_agent_mode_v1_2")
    results.append(("the real v1.2 entry shares v1.0's key and record stem, binds the computed "
                    "subject in its own candidate directory and offers no option",
                    package_for(packages, real.key, "1.2") is real12
                    and real12.key == real.key and real12.record_stem == real.record_stem
                    and real12.candidate == v12.CANDIDATE and real12.subject == v12.SPEC
                    and real12.subject_bytes is not None and real12.options == ()
                    and real12.apply_with is None and real12.applied_options is None))
    real13 = packages["polaris-dossier-local-agent-mode@1.3"]
    v13 = _module("build_polaris_dossier_local_agent_mode_v1_3")
    results.append(("the real v1.3 entry shares v1.0's key and record stem, binds the computed "
                    "subject in its own candidate directory and offers no option",
                    package_for(packages, real.key, "1.3") is real13
                    and real13.key == real.key and real13.record_stem == real.record_stem
                    and real13.candidate == v13.CANDIDATE and real13.subject == v13.SPEC
                    and real13.subject_bytes is not None and real13.options == ()
                    and real13.apply_with is None and real13.applied_options is None))
    taken: list[frozenset[str]] = []

    def apply_with(root, options):
        taken.append(options)
        (root / "applied.txt").write_text(f"applied {sorted(options)}\n")
        return 0

    def applied_options(root):
        text = (root / "applied.txt").read_text()
        return frozenset(["n6"]) if "n6" in text else frozenset()

    optioned = dataclasses.replace(pkg, options=("n6",), apply_with=apply_with,
                                   applied_options=applied_options)

    def run(package, tmp, *, options=frozenset(), version="1.0"):
        with contextlib.redirect_stdout(io.StringIO()) as out:
            code = record(tmp, package, version, args["date"], args["quote"], STUB_REVIEW,
                          None, options)
        return code, out.getvalue()

    def checked(package, tmp, version="1.0"):
        with contextlib.redirect_stdout(io.StringIO()):
            return check(tmp, package, version)

    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, _ = run(optioned, tmp, options=frozenset({"n6"}))
        rec = tmp / record_rel(optioned, "1.0")
        results.append(("an option taken is applied and named in the record",
                        code == 0 and taken[-1] == frozenset({"n6"})
                        and "\nOptions: n6\n" in rec.read_text()
                        and checked(optioned, tmp) == 0))
        rec.write_text(rec.read_text().replace("Options: n6", "Options: none"))
        results.append(("an edited options line fails --check", checked(optioned, tmp) == 1))
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, _ = run(optioned, tmp)
        results.append(("no option taken: the record says none",
                        code == 0 and taken[-1] == frozenset()
                        and "\nOptions: none\n" in (tmp / record_rel(optioned, "1.0")).read_text()))
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, out = run(optioned, tmp, options=frozenset({"n7"}))
        results.append(("refused: an option the package does not offer",
                        code == 1 and "not this package's" in out and not (tmp / "applied.txt").exists()))
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, out = run(pkg, tmp, options=frozenset({"n6"}))
        results.append(("refused: an option for a package that offers none",
                        code == 1 and "offers none" in out))
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, _ = run(pkg, tmp)
        results.append(("a package without options writes no options line",
                        code == 0 and "Options:" not in (tmp / record_rel(pkg, "1.0")).read_text()))
        results.append(("a package without a record note writes no consequences section",
                        "Consequences recorded" not in (tmp / record_rel(pkg, "1.0")).read_text()))
    noted = dataclasses.replace(pkg, record_note="Signing re-stales the stub pins.\n")
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, _ = run(noted, tmp)
        rec = tmp / record_rel(noted, "1.0")
        ok = (code == 0 and "## Consequences recorded with the sign-off\n\nSigning re-stales the "
              "stub pins.\n" in rec.read_text() and checked(noted, tmp) == 0)
        rec.write_text(rec.read_text().replace("re-stales the stub pins", "leaves the pins"))
        results.append(("a record note is rendered, and an edit to it fails --check",
                        ok and checked(noted, tmp) == 1))
    # The subject file holds other bytes than the reviewed ones (the installed
    # predecessor); only the computed bytes match the review head.
    on_disk = dataclasses.replace(pkg, subject=STUB_DIR / "manifest.txt")
    computed = dataclasses.replace(on_disk, subject_bytes=lambda root: STUB_SUBJECT_BYTES)
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, _ = run(computed, tmp)
        results.append(("a computed subject equal to the reviewed bytes records", code == 0))
    with tempfile.TemporaryDirectory() as t:
        tmp, _commit = make_fixture(pathlib.Path(t))
        code, out = run(on_disk, tmp)
        results.append(("refused: the same subject hashed from disk, not computed",
                        code == 1 and "head digest is not the sha256" in out))
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t))
        wrong = dataclasses.replace(pkg, subject_bytes=lambda root: b"other bytes\n")
        code, out = run(wrong, tmp)
        results.append(("refused: a computed subject that is not the reviewed bytes",
                        code == 1 and "head digest is not the sha256" in out
                        and not (tmp / "applied.txt").exists()))

    refused("package edited after the review", mutate=edit_package, expect="package bytes changed")
    refused("a declared further directory edited after the review", mutate=edit_also,
            expect="package bytes changed")
    refused("a package file added after the review", mutate=add_package_file,
            expect="package bytes changed")
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), package_files={"BROKEN": "x\n"})
        code, out = run_record(tmp)
        results.append(("refused: builder check failing, before anything is applied",
                        code == 1 and "does not verify" in out
                        and not (tmp / "applied.txt").exists()))
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t), None, stub_disposition())
        (tmp / STUB_DISPOSITION).write_text(stub_disposition() + "edited note\n")
        code, _ = run_record(tmp)
        results.append(("an edited sibling disposition record is not package bytes", code == 0))

    with tempfile.TemporaryDirectory() as t:
        tmp = pathlib.Path(t)
        entry = pathlib.Path("declarations/ENTRY.json")
        (tmp / "declarations").mkdir()
        entry_bytes = b'{"entry": 1}\n'
        (tmp / entry).write_bytes(entry_bytes)
        base = stub_package()
        reg = Package(base.key, base.title, "registry entry", base.candidate, base.record_stem,
                      base.check, base.apply, base.applied, installed=entry)
        args = ("1.0", "2026-10-06", "Extend Scope A to this entry and sign v1.0", "r.md", "c" * 40, "CONFIRM", None)
        at = dict(root=tmp, instant="2026-10-06T09:30:00Z")
        first = render_record(reg, *args, **at)
        results.append(("a registry-entry record names the installed entry and its SHA-256",
                        "Installed entry SHA-256: " + beh.digest(entry_bytes) in first
                        and "approves no registry or policy byte" not in first))
        results.append(("a registry-entry record carries RFC3-16(b) items 4, 6, 8 and 9",
                        all(line in first for line in (
                            "Recorded at (UTC): 2026-10-06T09:30:00Z",
                            "Act type: `adopt-registry-entry`",
                            "Supersession / revocation:",
                            "A1 audit-record identity (RFC3-16(b) item 9): **explicitly absent**"))))
        (tmp / entry).write_bytes(b'{"entry": 2}\n')
        results.append(("an edit to the installed entry changes its record's regeneration",
                        render_record(reg, *args, **at) != first))
        plain = render_record(base, *args, **at)
        results.append(("a package without an installed entry renders no entry lines",
                        "Installed entry" not in plain and "approves no registry or policy byte" in plain
                        and "Scope A extension" not in plain))
        results.append(("a registry-entry record names the Scope A extension",
                        'Scope A extension: the owner\'s selection quoted above names it ("Extend Scope A")' in first))
        reg_block = render_aggregate(reg, "1.0", "2026-10-06", "r.md", "CONFIRM", None)
        results.append(("the aggregate block of a registry entry says it is one of the acts a read "
                        "needs, and no longer that it widens no read",
                        "one of the separate acts a read needs" in reg_block and "widens no consent, read" not in reg_block
                        and "widens no consent, read" in render_aggregate(base, "1.0", "2026-10-06", "r.md", "CONFIRM", None)))
    with tempfile.TemporaryDirectory() as t:
        tmp, commit = make_fixture(pathlib.Path(t))
        entry = pathlib.Path("declarations/ENTRY.json")
        base = stub_package()

        def install(root):
            (root / entry).parent.mkdir(parents=True, exist_ok=True)
            (root / entry).write_text('{"entry": 1}\n')
            return 0
        reg = Package(base.key, base.title, "registry entry", base.candidate, base.record_stem,
                      base.check, install, lambda root: (root / entry).is_file(),
                      also=base.also, subject=base.subject, installed=entry)
        import io
        import contextlib
        with contextlib.redirect_stdout(io.StringIO()):
            no_extension = record(tmp, reg, "1.0", "2026-10-02", "Sign it", STUB_REVIEW, None,
                                  instant="2026-10-02T09:30:00Z")
            off_date = record(tmp, reg, "1.0", "2026-10-02", "Extend Scope A and sign it", STUB_REVIEW, None,
                              instant="2026-10-03T00:00:00Z")
            wrote = record(tmp, reg, "1.0", "2026-10-02", "Extend Scope A and sign it", STUB_REVIEW, None,
                           instant="2026-10-02T09:30:00Z")
            checked = check(tmp, reg, "1.0")
            rec = tmp / record_rel(reg, "1.0")
            signed = rec.read_text(encoding="utf-8")
            rec.write_text(signed.replace("Owner selection: Extend Scope A and sign it",
                                          "Owner selection: Sign it"), encoding="utf-8")
            requoted = check(tmp, reg, "1.0")
            rec.write_text(signed, encoding="utf-8")
            (tmp / entry).write_text('{"entry": 2}\n')
            drifted = check(tmp, reg, "1.0")
        results.append(("a registry-entry sign-off refuses a quote not naming the Scope A extension "
                        "and an instant off its date, then records and checks, and an edit to the "
                        "installed entry fails its check",
                        no_extension == 1 and off_date == 1 and wrote == 0 and checked == 0 and drifted == 1))
        results.append(("--check refuses a registry-entry record whose quote no longer names the "
                        "Scope A extension", requoted == 1))
    real_reg = real_packages()["public-git-source-acquisition-local-agent"]
    results.append(("the real registry package installs its builder's entry and binds the sitting manifest",
                    real_reg.installed == _module("build_public_git_source_acquisition_local_agent").INSTALLED
                    and real_reg.subject == _module(
                        "build_public_git_source_acquisition_local_agent").SITTING_MANIFEST))

    # A declared prior-round recap closes the findings section (P-108's
    # round-2 raw): read before it, and fail closed on anything inside it.
    opener = "**Round-1 findings, closed or not**"
    recap_raw = ("## Findings\n\n**Finding 10 — a note** (note)\nbody\n\n" + opener + "\n\n"
                 "1. *old one* — **closed.**\n2. *old two* — **closed.**\n")

    def recap_result(text, end):
        try:
            return review_findings(text, end)
        except ValueError as exc:
            return str(exc)
    results.append(("recap: undeclared, the recap's numbered list is read as findings and refuses",
                    "carry no (blocking|revise|note) severity" in str(recap_result(recap_raw, None))))
    results.append(("recap: declared, only the findings before it are read",
                    recap_result(recap_raw, opener) == {10: "note"}))
    results.append(("recap: a declared opener absent from the section refuses",
                    "opens 0 lines" in str(recap_result(recap_raw.replace(opener, "Recap"), opener))))
    results.append(("recap: a declared opener on two lines refuses",
                    "opens 2 lines" in str(recap_result(recap_raw + opener + "\n", opener))))
    results.append(("recap: a finding inside the recap refuses",
                    "recap carries a finding" in str(recap_result(
                        recap_raw + "**Finding 11 — hidden** (note)\n", opener))))
    results.append(("recap: a revise tag inside the recap refuses",
                    "recap carries a finding" in str(recap_result(
                        recap_raw + "3. *old three* (revise) still open\n", opener))))
    results.append(("the real P-108 entry declares its raw's recap opener",
                    real_packages()["three-surface-poc-vocabulary-epistemic-amendment"].findings_end
                    == "**Round-1 findings, closed or not, at the reviewed bytes**"))

    failing = 0
    for name, ok in results:
        failing += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    print(f"{len(results)} fixtures, {failing} failing")
    return 0 if failing == 0 else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--record", metavar="PACKAGE")
    mode.add_argument("--check", metavar="PACKAGE")
    mode.add_argument("--selftest", action="store_true")
    parser.add_argument("--version")
    parser.add_argument("--date")
    parser.add_argument("--review", help="the retained raw review, repo-relative")
    parser.add_argument("--disposition", help="the record beside the package (notes-only)")
    parser.add_argument("--owner-selection-quote", dest="quote")
    parser.add_argument("--instant", help="UTC YYYY-MM-DDTHH:MM:SSZ on --date (default now); "
                        "recorded only for a package that installs a registry entry")
    parser.add_argument("--option", action="append", default=[],
                        help="an option the owner took (repeatable; the package declares them)")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    packages = real_packages()
    key = args.record or args.check
    if key not in packages:
        print(f"unknown package {key!r}; covered: {sorted(k for k in packages if '@' not in k)}")
        return 2
    if not args.version:
        parser.error("--version is required")
    pkg = package_for(packages, key, args.version)
    if args.check:
        return check(ROOT, pkg, args.version)
    for needed in ("date", "review", "quote"):
        if not getattr(args, needed):
            parser.error(f"--{ 'owner-selection-quote' if needed == 'quote' else needed} "
                         "is required with --record")
    return record(ROOT, pkg, args.version, args.date, args.quote,
                  args.review, args.disposition, frozenset(args.option), instant=args.instant)


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
