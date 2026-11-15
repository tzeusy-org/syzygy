#!/usr/bin/env python3
"""Build and verify version 1.1 of the Polaris dossier launch-consent spec (bead syzygy-pdja.21).

Version 1.0 is installed under ``specs/`` and signed off (tag
``polaris-dossier-launch-consent-v1.0``). Version 1.1 adds one warning to
REQ-polaris-generation-046, the owner's answer C to
``syzygy-pdja.23-confidence`` (``OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-08-2``):
for a repository the operator does not declare public, the launch question
states that the repository's name and URL go onto the dedicated records
branch, which one push would publish. It is carried as one patch,
``.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-1/proposed/spec.md.patch``,
to the installed spec alone, and offers no option. This module is the
builder ``scripts/record_versioned_signoff.py`` runs for v1.1; no digest
argument exists, the sign-off binds the tag
``polaris-dossier-launch-consent-v1.1``. It mirrors the local-agent mode's
v1.1 builder (``build_polaris_dossier_local_agent_mode_v1_1.py``).

``--check`` verifies the package in either state and writes nothing:

- the v1.0 builder's own check passes and v1.0 is installed;
- the patch is present;
- unapplied: the status page links the v1.0 record exactly once (the
  install names the v1.1 record beside it); the installed spec hashes to the
  v1.0 signed bytes (the ``Manifest SHA-256`` of the review the v1.0 record
  names); the patch applies; the post-apply spec carries exactly the v1.0
  requirement names under one ADDED section, and the warning's scenario
  exactly once;
- applied: reversing the patch restores the v1.0 signed bytes, so the tree
  is v1.0 plus exactly this patch, and the spec keeps that shape.

``signed_findings()`` tells signed from unsigned bytes. The v1.0 builder's
``--check`` runs it (so the battery runs it) once any launch-consent sign-off
is recorded: with v1.0 the latest recorded version, the installed spec must
hash to v1.0's signed bytes and the v1.1 patch may not be applied; with v1.1
the latest, the tree must be v1.0's signed bytes plus the patch, and the spec
must hash to the digest the v1.1 review read; any later version is a finding
until its own builder exists.

The CLI writes nothing. The sign-off recorder
(``record_versioned_signoff.py --record polaris-dossier-launch-consent
--version 1.1``) is the one writer: it verifies the reviewed bytes and calls
``apply()``, which applies the patch, rewrites both figures on the status
page with the local-agent builder's ``refigure()`` and names the v1.1 record
beside v1.0's. Once the v1.2 package exists, ``_copy_targets()`` peels its
applied patch, so this layer is read beneath it, and ``signed_findings()``
delegates to the v1.2 builder when v1.2 or later is recorded. Regenerating the change's union and the reconciliation census
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
import build_polaris_dossier_launch_consent as v10  # noqa: E402

KEY = v10.KEY
VERSION = "1.1"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-1"
)
PROPOSED = CANDIDATE / "proposed"
SPEC = v10.INSTALLED_SPEC
#: (patch file under ``proposed/``, the file it patches), in apply order.
MAIN_PATCHES = (("spec.md.patch", SPEC),)
TARGETS = tuple(dict.fromkeys(target for _patch, target in MAIN_PATCHES))
DECISIONS = v10.DECISIONS
RECORD_STEM = "POLARIS-DOSSIER-LAUNCH-CONSENT"
V10_RECORD = v10.SIGNOFF_RECORD
V11_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status page's link to the v1.0 record, as v1.0's ``apply()`` wrote it.
V10_LINK = f"([v1.0 sign-off]({V10_RECORD.as_posix()}))"
BOTH_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
              f"    [v1.1 sign-off]({V11_RECORD.as_posix()}))")
#: The one scenario v1.1 adds to REQ-polaris-generation-046.
WARNING_SCENARIO = "#### Scenario: Name and URL warning for a repository not declared public\n"
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


# --- the patch in a scratch copy ---------------------------------------------

def peeled(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The v1.1 layer, with an applied v1.2 patch reversed, or None when there is none to peel."""
    import build_polaris_dossier_launch_consent_v1_2 as v12
    if not (root / v12.CANDIDATE).is_dir():
        return None
    return v12.backward(root)


def _spec(root: pathlib.Path) -> bytes:
    later = peeled(root)
    return later[SPEC] if later is not None else (root / SPEC).read_bytes()


def _copy_targets(root: pathlib.Path, scratch: pathlib.Path) -> None:
    """The v1.1 layer, with any applied v1.2 patch peeled off."""
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


def _patches(root: pathlib.Path) -> list[pathlib.Path]:
    return [root.resolve() / PROPOSED / name for name, _target in MAIN_PATCHES]


def _run(root: pathlib.Path, *, reverse: bool) -> dict[pathlib.Path, bytes] | None:
    with tempfile.TemporaryDirectory(prefix="launch-consent-v11-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        patches = _patches(root)
        for patch in (reversed(patches) if reverse else patches):
            if not _git_apply(scratch, patch, reverse=reverse):
                return None
        return {rel: (scratch / rel).read_bytes() for rel in TARGETS}


def forward(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after applying the patch to the tree, or None."""
    return _run(root, reverse=False)


def backward(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after reversing the patch on the tree, or None."""
    return _run(root, reverse=True)


def state(root: pathlib.Path) -> str:
    """"absent" | "unapplied" | "applied" | "neither"."""
    if not (root / CANDIDATE).is_dir():
        return "absent"
    if forward(root) is not None:
        return "unapplied"
    if backward(root) is not None:
        return "applied"
    return "neither"


def subject_bytes(root: pathlib.Path = ROOT) -> bytes:
    """The reviewed subject: the installed spec with the v1.1 patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patch does not apply to the tree")
    return after[SPEC]


# --- checks ------------------------------------------------------------------

def _shape(text: bytes, label: str) -> list[str]:
    decoded = text.decode("utf-8")
    findings = v10.spec_findings(decoded, label)
    count = decoded.count(WARNING_SCENARIO)
    if count != 1:
        findings.append(f"{label}: carries the warning scenario {count} times, expected once")
    return findings


def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V11_RECORD.as_posix()} exists"]
                if (root / V11_RECORD).exists() else [])
    findings = [f"v1.0 builder: {f}" for f in v10.check(root, signed=False)]
    if v10.state(root) != "applied":
        findings.append(f"v1.0 is {v10.state(root)}, not installed; v{VERSION} patches the installed v1.0")
    missing = [p.relative_to(root.resolve()).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    signed = review_digest(root, V10_RECORD)
    if signed is None:
        findings.append(f"{V10_RECORD.as_posix()} names no review whose head carries one "
                        "Manifest SHA-256; the v1.0 signed bytes are unknown")
    if current == "neither":
        return findings + [f"the tree is neither v1.0 nor v1.0 with the v{VERSION} patch"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V10_LINK) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0 record link exactly once; "
                            "the install would name no v1.1 record")
        if signed is not None and sha((root / SPEC).read_bytes()) != signed:
            findings.append(f"{SPEC.as_posix()} is not the v1.0 signed bytes")
        after = forward(root)
        assert after is not None  # state() found it applicable
        findings += _shape(after[SPEC], f"{SPEC.as_posix()} with the v{VERSION} patch")
    else:
        before = backward(root)
        assert before is not None  # state() found it reversible
        if signed is not None and sha(before[SPEC]) != signed:
            findings.append(f"reversing the v{VERSION} patch does not restore the v1.0 signed bytes")
        findings += _shape(_spec(root), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


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
        if (root / CANDIDATE).is_dir() and state(root) == "applied":
            findings.append(f"the tree carries the v{VERSION} patch, which no sign-off "
                            "record covers")
        return findings
    if latest > (1, 1):
        import build_polaris_dossier_launch_consent_v1_2 as v12
        return v12.signed_findings(root)
    if latest == (1, 1):
        if not (root / CANDIDATE).is_dir():
            return [f"{V11_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
        if state(root) != "applied":
            return [f"the tree is not v1.0 plus the v{VERSION} patch as recorded "
                    f"(found {state(root)})"]
        findings = []
        before = backward(root)
        if before is None or sha(before[SPEC]) != signed:
            findings.append(f"reversing the v{VERSION} patch does not restore the v1.0 signed bytes")
        reviewed = review_digest(root, V11_RECORD)
        if reviewed is None or sha(_spec(root)) != reviewed:
            findings.append(f"the v{VERSION} spec is not the bytes its review read")
        if peeled(root) is not None:
            findings.append("the tree carries the v1.2 patch, which no sign-off record covers")
        return findings
    return [f"{RECORD_STEM}-SIGNOFF-v{latest[0]}.{latest[1]}.md is recorded, but that "
            "version has no builder that tells its signed bytes from unsigned ones"]


# --- apply -------------------------------------------------------------------

def apply(root: pathlib.Path = ROOT) -> int:
    current = state(root)
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
    after = forward(root)
    assert after is not None  # check() applied it
    for rel, data in after.items():
        (root / rel).write_bytes(data)
    text = v10.lam.refigure(root, text.replace(V10_LINK, BOTH_LINKS))
    status.write_text(text, encoding="utf-8")
    remaining = check(root)
    if state(root) != "applied" or remaining:
        print("FAILED after apply: " + " | ".join(remaining or [state(root)]))
        return 1
    reqs, scenarios = v10.lam.status_figure(root)
    print(f"applied v{VERSION}; {STATUS} now reads {reqs} requirements and {scenarios} scenarios; "
          "next: check_spec_reconciliation.py --regenerate")
    return 0


# --- selftest ----------------------------------------------------------------

def _unified(rel: pathlib.Path, old: str, new: str) -> str:
    import difflib
    lines = difflib.unified_diff(old.splitlines(keepends=True), new.splitlines(keepends=True),
                                 fromfile=f"a/{rel.as_posix()}", tofile=f"b/{rel.as_posix()}")
    return "".join(lines)


def _fixture(root: pathlib.Path, *, record_v10: bool = True, signed_digest: str | None = None,
             third: bool = False, scenario: int = 1) -> None:
    """A v1.0-installed fixture tree with a v1.1 patch.

    ``third`` adds a third requirement in the patch; ``scenario`` is how many
    copies of the warning scenario the patch adds.
    """
    import contextlib
    import io
    v10._fixture(root)
    with contextlib.redirect_stdout(io.StringIO()):
        assert v10.apply(root) == 0
    spec10 = (root / SPEC).read_text()
    if record_v10:
        review = pathlib.Path("docs/reviews/R-LC-V10-RAW.md")
        (root / review).parent.mkdir(parents=True, exist_ok=True)
        (root / review).write_text(
            f"# Review\nReviewed commit: {'a' * 40}\n"
            f"Manifest SHA-256: {signed_digest or sha(spec10.encode())}\nVerdict: CONFIRM\n")
        (root / V10_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (root / V10_RECORD).write_text(f"# v1.0\n\nReview: {review.as_posix()}\n")
    marker = "#### Scenario: s0\n"
    added = ((WARNING_SCENARIO + "\n- WHEN a\n- THEN b\n\n") * scenario
             or "#### Scenario: another\n\n- WHEN a\n- THEN b\n\n")
    spec11 = spec10.replace(marker, added + marker, 1)
    if third:
        spec11 += v10._req("Extra", 1)
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(_unified(SPEC, spec10, spec11))


def _record_v11(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-LC-V11-RAW.md")
    (root / review).write_text(
        f"# Review\nReviewed commit: {'b' * 40}\n"
        f"Manifest SHA-256: {digest or sha((root / SPEC).read_bytes())}\nVerdict: CONFIRM\n")
    (root / V11_RECORD).write_text(f"# v1.1\n\nReview: {review.as_posix()}\n")


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
        results.append(("subject is the spec with the patch applied",
                        WARNING_SCENARIO.encode() in subject
                        and WARNING_SCENARIO.encode() not in (root / SPEC).read_bytes()))
        before_figure = v10.lam.status_figure(root)
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == "applied"))
        results.append(("applied: the spec is the reviewed subject", (root / SPEC).read_bytes() == subject))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names both records",
                        v10.lam.status_figure(root) == (before_figure[0], before_figure[1] + 1)
                        and V11_RECORD.as_posix() in status
                        and V10_RECORD.as_posix() in status and V10_LINK not in status))
        results.append(("applied: the v1.0 builder's install checks still pass",
                        v10.check(root, signed=False) == []))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.1 bytes with only v1.0 signed.
        results.append(("applied without a v1.1 record: the battery check fails",
                        any("which no sign-off record covers" in f for f in v10.check(root))
                        and any("not the signed v1.0 bytes" in f for f in signed_findings(root))))
        _record_v11(root)
        results.append(("applied with a v1.1 record: signed", signed_findings(root) == []
                        and v10.check(root) == []))
        review10 = root / "docs/reviews/R-LC-V10-RAW.md"
        good = review10.read_text()
        review10.write_text(re.sub(r"Manifest SHA-256: [0-9a-f]{64}", "Manifest SHA-256: " + "d" * 64, good))
        results.append(("v1.1 recorded over bytes that are not the signed v1.0: fails",
                        any("does not restore the v1.0 signed bytes" in f for f in signed_findings(root))
                        and any("does not restore" in f for f in check(root))))
        review10.write_text(good)
        _record_v11(root, digest="f" * 64)
        results.append(("a v1.1 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))))
        _record_v11(root)
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.3.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))

    tmp, root = tree()
    with tmp:
        _record_v11(root)
        results.append(("a v1.1 record over an unapplied tree fails",
                        any("not v1.0 plus" in f for f in signed_findings(root))))

    tmp, root = tree()
    with tmp:
        spec = root / SPEC
        spec.write_bytes(spec.read_bytes() + b"\n")
        results.append(("v1.0 latest, installed spec edited: fails",
                        any("not the signed v1.0 bytes" in f for f in signed_findings(root))))

    def refused(name: str, expect: str, mutate=None, **fixture) -> None:
        tmp, root = tree(**fixture)
        with tmp:
            if mutate:
                mutate(root)
            before = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            code = quiet(apply, root)
            after = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            results.append((f"refused: {name}", code == 2 and before == after
                            and any(expect in f for f in check(root))))

    refused("installed spec is not the v1.0 signed bytes", "is not the v1.0 signed bytes",
            signed_digest="e" * 64)
    refused("no v1.0 record", "signed bytes are unknown", record_v10=False)
    refused("the patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "spec.md.patch").unlink())
    refused("a post-apply spec with a third requirement", "expected [", third=True)
    refused("a post-apply spec without the warning scenario", "0 times", scenario=0)
    refused("a post-apply spec with the warning scenario twice", "2 times", scenario=2)

    def uninstall(root: pathlib.Path) -> None:
        (root / v10.PROPOSED_SPEC).parent.mkdir(parents=True, exist_ok=True)
        shutil.move(str(root / SPEC), str(root / v10.PROPOSED_SPEC))
    refused("v1.0 not installed", "not installed", mutate=uninstall)
    refused("the tree is neither state", "neither v1.0 nor", mutate=lambda root: (
        root / SPEC).write_text((root / SPEC).read_text().replace("#### Scenario: s0\n", "#### Scenario: t0\n")))
    refused("the status page lacks the v1.0 link", "record link exactly once",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V10_LINK, "(link)")))
    refused("the v1.0 builder's own check fails", "v1.0 builder:",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(SPEC.as_posix(), "elsewhere")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        patch = root / PROPOSED / "spec.md.patch"
        patch.write_text(patch.read_text().replace("+- THEN b", "+- THEN c"))
        results.append(("applied, then the patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v11(root)
        results.append(("absent package with a v1.1 record fails",
                        any("is absent but" in f for f in check(root))
                        and any("package is absent" in f for f in signed_findings(root))))

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
    current = state(ROOT)
    print("OK: the v1.1 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.1 package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
