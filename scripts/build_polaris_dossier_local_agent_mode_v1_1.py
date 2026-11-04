#!/usr/bin/env python3
"""Build and verify version 1.1 of the Polaris dossier local-agent mode (PR #368).

Version 1.0 is installed under ``specs/`` and signed off (tag
``polaris-dossier-local-agent-mode-v1.0``). Version 1.1 is carried as patches
under ``.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-1/proposed/``:
three that every install applies (``spec.md``, ``design.md``, ``proposal.md``)
and one option the owner may take or leave, ``n6``
(``spec.md.n6-optional.patch``, applied after the spec patch). This module is
the builder ``scripts/record_versioned_signoff.py`` runs for v1.1; no digest
argument exists, the sign-off binds the tag
``polaris-dossier-local-agent-mode-v1.1``.

``--check`` verifies the package in either state and writes nothing:

- the v1.0 builder's own check passes and v1.0 is installed;
- every patch is present;
- unapplied: the status page links the v1.0 record exactly once (the
  install names the v1.1 record beside it); the installed spec hashes to the v1.0 signed bytes (the
  ``Manifest SHA-256`` of the review the v1.0 record names); the three patches
  apply, and the option applies after them; each post-apply spec (with and
  without the option) carries exactly the v1.0 requirement names under one
  ADDED section;
- applied: reversing the patches (the option first, when it was taken)
  restores the v1.0 signed bytes, so the tree is v1.0 plus exactly these
  patches.

``signed_findings()`` is the check that tells signed from unsigned bytes. The
v1.0 builder's ``--check`` runs it (so the battery runs it) once any dossier
sign-off is recorded: with v1.0 the latest recorded version, the installed
spec must hash to v1.0's signed bytes and no v1.1 patch may be applied; with
v1.1 the latest, the tree must be v1.0's signed bytes plus the v1.1 patches
with exactly the options the v1.1 record names, and the spec without the
option must hash to the digest the v1.1 review read; with a later version the
latest, the v1.2 builder (``build_polaris_dossier_local_agent_mode_v1_2.py``)
decides, and any version it does not know is a finding.

Version 1.2 patches the installed v1.1. Once its patches are applied, every
predicate here reads the v1.1 layer: the targets with the v1.2 patches peeled
off (``peeled()``). With v1.1 the latest recorded version, a tree that carries
the v1.2 patches is a finding.

The CLI writes nothing. The sign-off recorder
(``record_versioned_signoff.py --record polaris-dossier-local-agent-mode
--version 1.1 [--option n6]``) is the one writer: it verifies the reviewed
bytes and calls ``apply()``, which applies the patches, rewrites the status
page's figures with ``refigure()`` and names the v1.1 record beside v1.0's.
Regenerating the change's union and the reconciliation census
(``check_spec_reconciliation.py --regenerate``) follows the recording, as it
did for v1.0. A candidate commit, review or merge performs no owner act.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
import hashlib
import os
import pathlib
import re
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_polaris_dossier_local_agent_mode as v10  # noqa: E402

KEY = v10.KEY
VERSION = "1.1"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-1"
)
PROPOSED = CANDIDATE / "proposed"
SPEC = v10.INSTALLED_SPEC
#: (patch file under ``proposed/``, the file it patches), in apply order.
MAIN_PATCHES = (
    ("spec.md.patch", SPEC),
    ("design.md.patch", CHANGE / "design.md"),
    ("proposal.md.patch", CHANGE / "proposal.md"),
)
#: Owner-selectable options, each one patch applied after the main patches.
OPTIONS = {"n6": "spec.md.n6-optional.patch"}
TARGETS = tuple(dict.fromkeys(target for _patch, target in MAIN_PATCHES))
DECISIONS = v10.DECISIONS
RECORD_STEM = "POLARIS-DOSSIER-LOCAL-AGENT-MODE"
V10_RECORD = v10.SIGNOFF_RECORD
V11_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status page's link to the v1.0 record, as v1.0's ``apply()`` wrote it.
V10_LINK = f"([sign-off record]({V10_RECORD.as_posix()}))"
BOTH_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
              f"    [v1.1 sign-off]({V11_RECORD.as_posix()}))")
MANIFEST_RE = re.compile(r"^Manifest SHA-256: ([0-9a-f]{64})$")
RECORD_FIELD_RE = r"^{}: (.+)$"


class Refusal(RuntimeError):
    """The package does not verify; nothing is written."""


def sha(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


# --- records -----------------------------------------------------------------

def recorded_versions(root: pathlib.Path) -> list[tuple[int, int]]:
    found = []
    directory = root / DECISIONS
    if not directory.is_dir():
        return []
    for path in directory.glob(f"{RECORD_STEM}-SIGNOFF-v*.md"):
        m = re.fullmatch(rf"{RECORD_STEM}-SIGNOFF-v(\d+)\.(\d+)\.md", path.name)
        if m:
            found.append((int(m.group(1)), int(m.group(2))))
    return sorted(found)


def record_field(root: pathlib.Path, record: pathlib.Path, key: str) -> str | None:
    path = root / record
    if not path.is_file():
        return None
    m = re.search(RECORD_FIELD_RE.format(re.escape(key)), path.read_text(encoding="utf-8"),
                  re.MULTILINE)
    return m.group(1) if m else None


def review_digest(root: pathlib.Path, record: pathlib.Path) -> str | None:
    """The ``Manifest SHA-256`` in the head of the review a record names."""
    review = record_field(root, record, "Review")
    if review is None or not (root / review).is_file():
        return None
    head = [line for line in (root / review).read_text(encoding="utf-8").splitlines()
            if line.strip()][:4]
    digests = [m.group(1) for line in head if (m := MANIFEST_RE.fullmatch(line))]
    return digests[0] if len(digests) == 1 else None


def recorded_options(root: pathlib.Path) -> frozenset[str] | None:
    """The options the v1.1 record names; None when it names none legibly."""
    value = record_field(root, V11_RECORD, "Options")
    if value is None:
        return None
    if value == "none":
        return frozenset()
    names = frozenset(part.strip() for part in value.split(","))
    return names if names <= set(OPTIONS) else None


# --- patches in a scratch copy -------------------------------------------------

def peeled(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets with the v1.2 patches reversed, when the tree carries them.

    Every v1.1 predicate reads the v1.1 layer: once v1.2 is applied, that is
    the tree with the v1.2 patches peeled off. None when nothing is peeled.
    """
    import build_polaris_dossier_local_agent_mode_v1_2 as v12
    if not (root / v12.CANDIDATE).is_dir():
        return None
    return v12.backward(root)


def _spec(root: pathlib.Path) -> bytes:
    later = peeled(root)
    return later[SPEC] if later is not None else (root / SPEC).read_bytes()


def _copy_targets(root: pathlib.Path, scratch: pathlib.Path) -> None:
    later = peeled(root)
    for rel in TARGETS:
        if later is not None:
            (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
            (scratch / rel).write_bytes(later[rel])
        elif (root / rel).is_file():
            (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copyfile(root / rel, scratch / rel)


def _git_apply(scratch: pathlib.Path, patch: pathlib.Path, *, reverse: bool = False) -> bool:
    """Apply one patch inside ``scratch``, which no repository encloses."""
    env = {**os.environ, "GIT_CEILING_DIRECTORIES": str(scratch.parent)}
    args = ["git", "apply", *(["-R"] if reverse else []), str(patch)]
    return subprocess.run(args, cwd=scratch, env=env, capture_output=True).returncode == 0


def _patches(root: pathlib.Path, options: frozenset[str]) -> list[pathlib.Path]:
    return ([root / PROPOSED / name for name, _target in MAIN_PATCHES]
            + [root / PROPOSED / OPTIONS[name] for name in sorted(options)])


def forward(root: pathlib.Path, options: frozenset[str] = frozenset()) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after applying the patches to the tree, or None."""
    with tempfile.TemporaryDirectory(prefix="dossier-v11-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        for patch in _patches(root, options):
            if not _git_apply(scratch, patch):
                return None
        return {rel: (scratch / rel).read_bytes() for rel in TARGETS}


def backward(root: pathlib.Path, options: frozenset[str]) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after reversing the patches on the tree, or None."""
    with tempfile.TemporaryDirectory(prefix="dossier-v11-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        for patch in reversed(_patches(root, options)):
            if not _git_apply(scratch, patch, reverse=True):
                return None
        return {rel: (scratch / rel).read_bytes() for rel in TARGETS}


def _option_sets() -> list[frozenset[str]]:
    names = sorted(OPTIONS)
    sets = [frozenset(n for i, n in enumerate(names) if mask >> i & 1)
            for mask in range(1 << len(names))]
    return sorted(sets, key=len, reverse=True)


def state(root: pathlib.Path) -> tuple[str, frozenset[str]]:
    """("absent" | "unapplied" | "applied" | "neither", the options applied)."""
    if not (root / CANDIDATE).is_dir():
        return "absent", frozenset()
    if forward(root) is not None:
        return "unapplied", frozenset()
    for options in _option_sets():
        if backward(root, options) is not None:
            return "applied", options
    return "neither", frozenset()


def subject_bytes(root: pathlib.Path = ROOT) -> bytes:
    """The reviewed subject: the spec with the main patches alone applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    return after[SPEC]


# --- checks ------------------------------------------------------------------

def _shape(text: bytes, label: str) -> list[str]:
    return v10.spec_findings(text.decode("utf-8"), label)


def check(root: pathlib.Path = ROOT) -> list[str]:
    current, options = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V11_RECORD.as_posix()} exists"]
                if (root / V11_RECORD).exists() else [])
    findings = [f"v1.0 builder: {f}" for f in v10.check(root, signed=False)]
    if v10.state(root) != "applied":
        findings.append(f"v1.0 is {v10.state(root)}, not installed; v{VERSION} patches the installed v1.0")
    missing = [p.relative_to(root).as_posix() for p in _patches(root, frozenset(OPTIONS))
               if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    signed = review_digest(root, V10_RECORD)
    if signed is None:
        findings.append(f"{V10_RECORD.as_posix()} names no review whose head carries one "
                        "Manifest SHA-256; the v1.0 signed bytes are unknown")
    if current == "neither":
        return findings + [f"the tree is neither v1.0 nor v1.0 with the v{VERSION} patches"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V10_LINK) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0 record link exactly once; "
                            "the install would name no v1.1 record")
        if signed is not None and sha(_spec(root)) != signed:
            findings.append(f"{SPEC.as_posix()} is not the v1.0 signed bytes")
        for opts in _option_sets():
            after = forward(root, opts)
            label = f"{SPEC.as_posix()} with the v{VERSION} patches" + (
                f" and {sorted(opts)}" if opts else "")
            if after is None:
                findings.append(f"{label}: does not apply")
            else:
                findings += _shape(after[SPEC], label)
    else:
        before = backward(root, options)
        assert before is not None  # state() found it reversible
        if signed is not None and sha(before[SPEC]) != signed:
            findings.append(f"reversing the v{VERSION} patches does not restore the v1.0 signed bytes")
        findings += _shape(_spec(root), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root)[0] == "applied" and not check(root)


def signed_findings(root: pathlib.Path) -> list[str]:
    """Whether the installed bytes are the latest recorded sign-off's bytes."""
    versions = recorded_versions(root)
    if not versions:
        return []
    signed = review_digest(root, V10_RECORD)
    if signed is None:
        return [f"{V10_RECORD.as_posix()} names no review whose head carries the v1.0 signed digest"]
    latest = versions[-1]
    if latest == (1, 0):
        findings = []
        if sha((root / SPEC).read_bytes()) != signed:
            findings.append(f"{SPEC.as_posix()} is not the signed v1.0 bytes, and no later "
                            "version is recorded")
        if (root / CANDIDATE).is_dir():
            current, _options = state(root)
            if current == "applied":
                findings.append(f"the tree carries the v{VERSION} patches, which no sign-off "
                                "record covers")
        return findings
    if latest == (1, 1):
        findings = signed_v11_findings(root)
        if peeled(root) is not None:
            findings.append("the tree carries the v1.2 patches, which no sign-off record covers")
        return findings
    # A later version: its own builder tells its signed bytes from unsigned ones.
    import build_polaris_dossier_local_agent_mode_v1_2 as v12
    return v12.signed_findings(root)


def signed_v11_findings(root: pathlib.Path) -> list[str]:
    """Whether the v1.1 layer (any later patches peeled) is the signed v1.1."""
    signed = review_digest(root, V10_RECORD)
    if signed is None:
        return [f"{V10_RECORD.as_posix()} names no review whose head carries the v1.0 signed digest"]
    options = recorded_options(root)
    if options is None:
        return [f"{V11_RECORD.as_posix()} names no legible `Options:` line"]
    if not (root / CANDIDATE).is_dir():
        return [f"{V11_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    current, applied_options = state(root)
    if current != "applied" or applied_options != options:
        return [f"the tree is not v1.0 plus the v{VERSION} patches with options "
                f"{sorted(options)} as recorded (found {current}, {sorted(applied_options)})"]
    findings = []
    before = backward(root, options)
    if before is None or sha(before[SPEC]) != signed:
        findings.append(f"reversing the v{VERSION} patches does not restore the v1.0 signed bytes")
    reviewed = review_digest(root, V11_RECORD)
    spec = _without_options(root, options) if options else _spec(root)
    if reviewed is None or spec is None or sha(spec) != reviewed:
        findings.append(f"the v{VERSION} spec without options is not the bytes its review read")
    return findings


def _without_options(root: pathlib.Path, options: frozenset[str]) -> bytes | None:
    """The installed spec with the option patches reversed."""
    with tempfile.TemporaryDirectory(prefix="dossier-v11-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        for name in sorted(options, reverse=True):
            if not _git_apply(scratch, root / PROPOSED / OPTIONS[name], reverse=True):
                return None
        return (scratch / SPEC).read_bytes()


# --- apply -------------------------------------------------------------------

def apply(root: pathlib.Path = ROOT, options: frozenset[str] = frozenset()) -> int:
    unknown = sorted(set(options) - set(OPTIONS))
    if unknown:
        print(f"REFUSED: unknown options {unknown}; known: {sorted(OPTIONS)}; nothing written")
        return 2
    current, _opts = state(root)
    if current != "unapplied":
        print(f"REFUSED: the package is {current}, not unapplied; nothing written")
        return 2
    findings = check(root)
    if findings:
        print("REFUSED: the package does not verify; nothing written")
        for finding in findings:
            print(f"  - {finding}")
        return 2
    status = root / STATUS
    text = status.read_text(encoding="utf-8")
    after = forward(root, frozenset(options))
    assert after is not None  # check() applied every option set
    for rel, data in after.items():
        (root / rel).write_bytes(data)
    text = v10.refigure(root, text.replace(V10_LINK, BOTH_LINKS))
    status.write_text(text, encoding="utf-8")
    current, applied_options = state(root)
    remaining = check(root)
    if current != "applied" or applied_options != frozenset(options) or remaining:
        print("FAILED after apply: " + " | ".join(remaining or [f"{current} {sorted(applied_options)}"]))
        return 1
    reqs, scenarios = v10.status_figure(root)
    print(f"applied v{VERSION}" + (f" with {sorted(options)}" if options else "")
          + f"; {STATUS} now reads {reqs} requirements and {scenarios} scenarios; "
          "next: check_spec_reconciliation.py --regenerate")
    return 0


# --- selftest ----------------------------------------------------------------

def _unified(rel: pathlib.Path, old: str, new: str) -> str:
    import difflib
    lines = difflib.unified_diff(old.splitlines(keepends=True), new.splitlines(keepends=True),
                                 fromfile=f"a/{rel.as_posix()}", tofile=f"b/{rel.as_posix()}")
    return "".join(lines)


def _fixture(root: pathlib.Path, *, record_v10: bool = True, signed_digest: str | None = None,
             n6_breaks: bool = False, fifth: bool = False) -> None:
    import contextlib
    import io
    v10._fixture(root)
    with contextlib.redirect_stdout(io.StringIO()):
        assert v10.apply(root) == 0
    (root / CHANGE / "proposal.md").write_text("Proposal v1.0.\n")
    spec10 = (root / SPEC).read_text()
    if record_v10:
        review = pathlib.Path("docs/reviews/R-V10-RAW.md")
        (root / review).parent.mkdir(parents=True, exist_ok=True)
        (root / review).write_text(
            f"# Review\nReviewed commit: {'a' * 40}\n"
            f"Manifest SHA-256: {signed_digest or sha(spec10.encode())}\nVerdict: CONFIRM\n")
        (root / V10_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (root / V10_RECORD).write_text(f"# v1.0\n\nReview: {review.as_posix()}\n")
    marker = f"#### Scenario: s0\n"
    spec11 = spec10.replace(marker, "#### Scenario: added in v1.1\n\n- WHEN a\n- THEN b\n\n" + marker, 1)
    if fifth:
        spec11 += v10._req("Extra", 1)
    spec11n6 = spec11.replace("#### Scenario: added in v1.1\n",
                              "#### Scenario: added by n6\n\n- WHEN c\n- THEN d\n\n"
                              "#### Scenario: added in v1.1\n", 1)
    design10 = (root / CHANGE / "design.md").read_text()
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(_unified(SPEC, spec10, spec11))
    (root / PROPOSED / "design.md.patch").write_text(
        _unified(CHANGE / "design.md", design10, design10 + "Design v1.1.\n"))
    (root / PROPOSED / "proposal.md.patch").write_text(
        _unified(CHANGE / "proposal.md", "Proposal v1.0.\n", "Proposal v1.1.\n"))
    n6 = _unified(SPEC, spec11, spec11n6)
    if n6_breaks:
        n6 = n6.replace("added in v1.1", "not in the file")
    (root / PROPOSED / OPTIONS["n6"]).write_text(n6)


def _record_v11(root: pathlib.Path, options: str = "none", digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-V11-RAW.md")
    main_only = _without_options(root, recorded_or(options) & frozenset(OPTIONS))
    (root / review).write_text(
        f"# Review\nReviewed commit: {'b' * 40}\n"
        f"Manifest SHA-256: {digest or sha(main_only or b'')}\nVerdict: CONFIRM\n")
    (root / V11_RECORD).write_text(f"# v1.1\n\nReview: {review.as_posix()}\n\nOptions: {options}\n")


def recorded_or(options: str) -> frozenset[str]:
    return frozenset() if options == "none" else frozenset(p.strip() for p in options.split(","))


def selftest() -> int:
    import contextlib
    import io

    results: list[tuple[str, bool]] = []

    def quiet(fn, *args):
        with contextlib.redirect_stdout(io.StringIO()):
            return fn(*args)

    def tree(**fixture):
        tmp = tempfile.TemporaryDirectory()
        root = pathlib.Path(tmp.name)
        _fixture(root, **fixture)
        return tmp, root

    tmp, root = tree()
    with tmp:
        results.append(("unapplied package verifies", check(root) == []))
        results.append(("unapplied: v1.0 bytes are signed", signed_findings(root) == []))
        results.append(("unapplied: the v1.0 builder's battery check passes", v10.check(root) == []))
        subject = subject_bytes(root)
        results.append(("subject is the spec with the main patches alone",
                        b"added in v1.1" in subject and b"added by n6" not in subject))
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == ("applied", frozenset())))
        results.append(("applied: the targets carry v1.1",
                        b"added in v1.1" in (root / SPEC).read_bytes()
                        and (root / CHANGE / "proposal.md").read_text() == "Proposal v1.1.\n"))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names both records",
                        v10.status_figure(root) == (6, 8) and V11_RECORD.as_posix() in status
                        and V10_RECORD.as_posix() in status and V10_LINK not in status))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.1 bytes with only v1.0 signed.
        results.append(("applied without a v1.1 record: the battery check fails",
                        any("which no sign-off record covers" in f for f in v10.check(root))
                        and any("not the signed v1.0 bytes" in f for f in signed_findings(root))))
        _record_v11(root)
        results.append(("applied with a v1.1 record: signed", signed_findings(root) == []
                        and v10.check(root) == []))
        _record_v11(root, options="n6")
        results.append(("a record naming an option the tree lacks fails",
                        any("as recorded" in f for f in signed_findings(root))))
        _record_v11(root)
        review10 = root / "docs/reviews/R-V10-RAW.md"
        good = review10.read_text()
        review10.write_text(re.sub(r"Manifest SHA-256: [0-9a-f]{64}", "Manifest SHA-256: " + "d" * 64, good))
        results.append(("v1.1 recorded over bytes that are not the signed v1.0: fails",
                        any("does not restore the v1.0 signed bytes" in f for f in signed_findings(root))
                        and any("does not restore" in f for f in check(root))))
        review10.write_text(good)
        _record_v11(root, digest="f" * 64)
        results.append(("a v1.1 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))))
        _record_v11(root, options="n7")
        results.append(("an illegible options line fails",
                        any("no legible" in f for f in signed_findings(root))))
        _record_v11(root)
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.5.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))))

    tmp, root = tree()
    with tmp:
        results.append(("apply with n6 returns 0", quiet(apply, root, frozenset({"n6"})) == 0))
        results.append(("applied with n6 verifies", applied(root)
                        and state(root) == ("applied", frozenset({"n6"}))))
        _record_v11(root, options="n6")
        results.append(("applied with n6 and a record naming it: signed", signed_findings(root) == []))
        _record_v11(root)
        results.append(("applied with n6, record naming none: fails",
                        any("as recorded" in f for f in signed_findings(root))))

    def refused(name: str, expect: str, mutate=None, options=frozenset(), **fixture) -> None:
        tmp, root = tree(**fixture)
        with tmp:
            if mutate:
                mutate(root)
            before = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            code = quiet(apply, root, options)
            after = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            found = check(root) if expect != "unknown options" else ["unknown options"]
            results.append((f"refused: {name}", code == 2 and before == after
                            and any(expect in f for f in found)))

    refused("installed spec is not the v1.0 signed bytes", "is not the v1.0 signed bytes",
            signed_digest="e" * 64)
    refused("no v1.0 record", "signed bytes are unknown", record_v10=False)
    refused("a patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "design.md.patch").unlink())
    refused("the option does not apply after the main patches", "['n6']: does not apply",
            n6_breaks=True)
    refused("a post-apply spec with a fifth requirement", "expected", fifth=True)
    refused("an unknown option", "unknown options", options=frozenset({"n7"}))
    def uninstall(root: pathlib.Path) -> None:
        (root / v10.PROPOSED_SPEC).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(root / SPEC), str(root / v10.PROPOSED_SPEC))
    refused("v1.0 not installed", "not installed", mutate=uninstall)
    refused("the tree is neither state", "neither v1.0 nor", mutate=lambda root: (
        root / CHANGE / "proposal.md").write_text("Edited.\n"))
    refused("the status page lacks the v1.0 link", "record link exactly once", mutate=lambda root: (root / STATUS).write_text(
        (root / STATUS).read_text().replace(V10_LINK, "(link)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        (root / PROPOSED / "proposal.md.patch").write_text(_unified(
            CHANGE / "proposal.md", "Proposal v1.0.\n", "Proposal v1.1, edited.\n"))
        results.append(("applied, then a patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v11(root)
        results.append(("absent package with a v1.1 record fails",
                        any("is absent but" in f for f in check(root))))

    failing = 0
    for name, ok in results:
        failing += 0 if ok else 1
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    print(f"{len(results)} fixtures, {failing} failing")
    return 0 if failing == 0 else 1


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    findings = check(ROOT) + signed_findings(ROOT)
    if findings:
        print("FAILED")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    current, options = state(ROOT)
    print("OK: the v1.1 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.1 package verifies ({current}"
          + (f", options {sorted(options)}" if options else "") + ")")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
