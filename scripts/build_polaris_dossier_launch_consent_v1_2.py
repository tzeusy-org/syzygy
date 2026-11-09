#!/usr/bin/env python3
"""Build and verify version 1.2 of the Polaris dossier launch-consent spec (epic syzygy-pdja).

Version 1.1 is installed under ``specs/`` and signed off (tag
``polaris-dossier-launch-consent-v1.1``). Version 1.2 carries the owner's two
answers of 2026-11-09 (``OWNER-DIRECTION-CLONE-AND-URL-SCOPE-2026-11-09``):
a launch-consented run reads an existing full clone at the pinned trunk tip
with no fetch, and any https or ssh locator on any host, with no embedded
credentials, is admitted. It amends REQ-polaris-generation-046 and 047 in
place, as one patch,
``.syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-2/proposed/spec.md.patch``,
to the installed spec alone, and offers no option. This module is the
builder ``scripts/record_versioned_signoff.py`` runs for v1.2; no digest
argument exists, the sign-off binds the tag
``polaris-dossier-launch-consent-v1.2``. It mirrors the v1.1 builder, whose
``_copy_targets()`` peels this layer and whose ``signed_findings()``
delegates here once v1.2 or later is recorded.

``--check`` verifies the package in either state and writes nothing:

- the v1.1 builder's own check passes and v1.1 is installed;
- the patch is present;
- unapplied: the status page links the v1.0 and v1.1 records exactly once
  (the install names the v1.2 record beside them); the installed spec hashes
  to the v1.1 signed bytes (the ``Manifest SHA-256`` of the review the v1.1
  record names); the patch applies; the post-apply spec carries exactly the
  v1.0 requirement names under one ADDED section, the v1.1 warning scenario
  once and each v1.2 scenario once; ``PROPOSED-SUBJECTS.json``, where
  present, is the one this builder derives;
- applied: reversing the patch restores the v1.1 signed bytes, and the spec
  keeps that shape.

``signed_findings()`` tells signed from unsigned bytes once v1.2 or later is
the latest recorded version; for an earlier one it is the v1.1 builder's.

The CLI writes nothing but ``--write-subjects``, which writes
``PROPOSED-SUBJECTS.json`` from the unapplied tree. The sign-off recorder
(``record_versioned_signoff.py --record polaris-dossier-launch-consent
--version 1.2``) is the one writer of the tree: it verifies the reviewed
bytes and calls ``apply()``, which applies the patch, rewrites both figures
on the status page with the local-agent builder's ``refigure()`` and names
the v1.2 record beside the others. A candidate commit, review or merge
performs no owner act.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
import json
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_polaris_dossier_launch_consent as v10  # noqa: E402
import build_polaris_dossier_launch_consent_v1_1 as v11  # noqa: E402

KEY = v10.KEY
VERSION = "1.2"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-launch-consent-v1-2"
)
PROPOSED = CANDIDATE / "proposed"
SPEC = v10.INSTALLED_SPEC
#: (patch file under ``proposed/``, the file it patches), in apply order.
MAIN_PATCHES = (("spec.md.patch", SPEC),)
TARGETS = tuple(dict.fromkeys(target for _patch, target in MAIN_PATCHES))
DECISIONS = v10.DECISIONS
RECORD_STEM = v11.RECORD_STEM
V10_RECORD = v11.V10_RECORD
V11_RECORD = v11.V11_RECORD
V12_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status links written by the installed v1.1 layer.
V11_LINKS = v11.BOTH_LINKS
THREE_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
               f"    [v1.1 sign-off]({V11_RECORD.as_posix()});\n"
               f"    [v1.2 sign-off]({V12_RECORD.as_posix()}))")
#: The scenarios v1.2 adds: ten to REQ-polaris-generation-046, sixteen to 047.
V12_SCENARIOS = tuple(f"#### Scenario: {name}\n" for name in (
    "Locator on another host over ssh",
    "GitHub identities keep their form",
    "Same-named repository on two hosts",
    "Consent found by its upstream URL",
    "Remote or given URL over http or git",
    "Credentials in a given URL",
    "Credentials in a remote URL",
    "Locator not admitted",
    "Remote URL that is not a locator",
    "Visibility on another host",
    "HEAD elsewhere with no copy",
    "Existing full clone at the trunk tip",
    "Repeat run at a launch-consented HEAD",
    "Several remote defaults",
    "Local branch ahead of the remote default",
    "Partial clone missing an object",
    "Clone with an alternate",
    "Configuration and hooks of the operator's clone",
    "Revision naming an annotated tag",
    "Ambiguous abbreviation",
    "References in the reftable backend",
    "A consent that states the clone's form",
    "Revision with launch records while HEAD is at another act's revision",
    "Repeat run under a launch consent recorded by version 1.1",
    "Revision naming a blob",
    "Commit whose checkout fails",
))
SUBJECTS = CANDIDATE / "PROPOSED-SUBJECTS.json"
SUBJECTS_BASE = "version 1.1 installed bytes; the proposed bytes are the patch applied to them"

sha = v11.sha
review_digest = v11.review_digest
recorded_versions = v11.recorded_versions


# --- the patch in a scratch copy ---------------------------------------------

def _copy_targets(root: pathlib.Path, scratch: pathlib.Path) -> None:
    """The tree's own bytes: this layer is the top one, so nothing is peeled."""
    for rel in TARGETS:
        if (root / rel).is_file():
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
    if any(not patch.is_file() for patch in _patches(root)):
        return None
    with tempfile.TemporaryDirectory(prefix="launch-consent-v12-") as tmp:
        scratch = pathlib.Path(tmp) / "tree"
        scratch.mkdir()
        _copy_targets(root, scratch)
        patches = _patches(root)
        for patch in (reversed(patches) if reverse else patches):
            if not _git_apply(scratch, patch, reverse=reverse):
                return None
        if any(not (scratch / rel).is_file() for rel in TARGETS):
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
    """The reviewed subject: the installed spec with the v1.2 patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patch does not apply to the tree")
    return after[SPEC]


def proposed_subjects(root: pathlib.Path = ROOT) -> str:
    """PROPOSED-SUBJECTS.json as the builder derives it from the unapplied tree."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patch does not apply to the tree")
    rows = [{"path": rel.as_posix(),
             "current_sha256": sha((root / rel).read_bytes()),
             "proposed_sha256": sha(after[rel]),
             "patch_sha256": sha((root / PROPOSED / name).read_bytes())}
            for name, rel in MAIN_PATCHES]
    return json.dumps({"base": SUBJECTS_BASE, "subjects": rows}, indent=2) + "\n"


# --- checks ------------------------------------------------------------------

def _shape(text: bytes, label: str) -> list[str]:
    findings = v11._shape(text, label)
    decoded = text.decode("utf-8")
    for heading in V12_SCENARIOS:
        count = decoded.count(heading)
        if count != 1:
            findings.append(f"{label}: carries {heading.strip()!r} {count} times, expected once")
    return findings


def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V12_RECORD.as_posix()} exists"]
                if (root / V12_RECORD).exists() else [])
    findings = [f"v1.1 builder: {f}" for f in v11.check(root)]
    base = v11.state(root)
    if base != "applied":
        findings.append(f"v1.1 is {base}, not installed; v{VERSION} patches the installed v1.1")
    missing = [p.relative_to(root.resolve()).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    signed = review_digest(root, V11_RECORD)
    if signed is None:
        findings.append(f"{V11_RECORD.as_posix()} names no review whose head carries one "
                        "Manifest SHA-256; the v1.1 signed bytes are unknown")
    if current == "neither":
        return findings + [f"the tree is neither v1.1 nor v1.1 with the v{VERSION} patch"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V11_LINKS) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0 and v1.1 record links exactly "
                            f"once; the install would name no v{VERSION} record")
        if signed is not None and sha((root / SPEC).read_bytes()) != signed:
            findings.append(f"{SPEC.as_posix()} is not the v1.1 signed bytes")
        after = forward(root)
        assert after is not None  # state() found it applicable
        findings += _shape(after[SPEC], f"{SPEC.as_posix()} with the v{VERSION} patch")
        if (root / SUBJECTS).is_file() and (
                (root / SUBJECTS).read_text(encoding="utf-8") != proposed_subjects(root)):
            findings.append(f"{SUBJECTS.as_posix()} is stale; regenerate it with --write-subjects")
    else:
        before = backward(root)
        assert before is not None  # state() found it reversible
        if signed is not None and sha(before[SPEC]) != signed:
            findings.append(f"reversing the v{VERSION} patch does not restore the v1.1 signed bytes")
        findings += _shape((root / SPEC).read_bytes(), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def signed_findings(root: pathlib.Path) -> list[str]:
    """Whether the installed bytes are the latest recorded sign-off's (v1.2 or later)."""
    versions = recorded_versions(root)
    if not versions or versions[-1] < (1, 2):
        return v11.signed_findings(root)
    latest = versions[-1]
    if latest != (1, 2):
        return [f"{RECORD_STEM}-SIGNOFF-v{latest[0]}.{latest[1]}.md is recorded, but that "
                "version has no builder that tells its signed bytes from unsigned ones"]
    if not (root / CANDIDATE).is_dir():
        return [f"{V12_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    if state(root) != "applied":
        return [f"the tree is not v1.1 plus the v{VERSION} patch as recorded (found {state(root)})"]
    findings = []
    before = backward(root)
    signed11 = review_digest(root, V11_RECORD)
    if before is None or signed11 is None or sha(before[SPEC]) != signed11:
        findings.append(f"reversing the v{VERSION} patch does not restore the v1.1 signed bytes")
    reviewed = review_digest(root, V12_RECORD)
    if reviewed is None or sha((root / SPEC).read_bytes()) != reviewed:
        findings.append(f"the v{VERSION} spec is not the bytes its review read")
    return findings


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
    text = v10.lam.refigure(root, text.replace(V11_LINKS, THREE_LINKS))
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

def _fixture(root: pathlib.Path, *, install_v11: bool = True, record_v11: bool = True,
             v11_digest: str | None = None, extra: bool = False,
             drop: int | None = None, twice: int | None = None) -> None:
    """A tree with v1.0 and v1.1 installed and signed, and the v1.2 patch beside it.

    ``drop`` leaves out, and ``twice`` doubles, the v1.2 scenario at that index;
    ``extra`` adds a requirement in the patch.
    """
    import contextlib
    import io
    v11._fixture(root)
    if install_v11:
        with contextlib.redirect_stdout(io.StringIO()):
            assert v11.apply(root) == 0
    if record_v11:
        v11._record_v11(root, digest=v11_digest)
    base = (root / SPEC).read_text()
    added = ""
    for i, heading in enumerate(V12_SCENARIOS):
        copies = 0 if i == drop else 2 if i == twice else 1
        added += (heading + "\n- WHEN c\n- THEN d\n\n") * copies
    marker = "#### Scenario: s0\n"
    successor = base.replace(marker, added + marker, 1)
    if extra:
        successor += v10._req("Extra", 1)
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, base, successor))


def _record_v12(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-LC-V12-RAW.md")
    (root / review).parent.mkdir(parents=True, exist_ok=True)
    (root / review).write_text(
        f"# Review\nReviewed commit: {'c' * 40}\n"
        f"Manifest SHA-256: {digest or sha((root / SPEC).read_bytes())}\nVerdict: CONFIRM\n")
    (root / V12_RECORD).write_text(f"# v1.2\n\nReview: {review.as_posix()}\n")


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

    def battery(root: pathlib.Path) -> list[str]:
        """What the v1.0 and v1.1 builders' --check report over the tree."""
        return v10.check(root) + v11.check(root) + v11.signed_findings(root)

    tmp, root = tree()
    with tmp:
        results.append(("unapplied package verifies", check(root) == []))
        results.append(("unapplied: v1.1 bytes are signed", signed_findings(root) == []))
        results.append(("unapplied: the v1.0 and v1.1 builders' checks pass", battery(root) == []))
        (root / SUBJECTS).write_text(proposed_subjects(root))
        results.append(("unapplied: the derived subjects file verifies", check(root) == []))
        (root / SUBJECTS).write_text(proposed_subjects(root).replace(
            "\"proposed_sha256\": \"", "\"proposed_sha256\": \"0", 1))
        results.append(("unapplied: a stale subjects file fails",
                        any("is stale" in f for f in check(root))))
        (root / SUBJECTS).unlink()
        subject = subject_bytes(root)
        results.append(("subject is the installed spec with the v1.2 patch",
                        V12_SCENARIOS[0].encode() in subject
                        and V12_SCENARIOS[0].encode() not in (root / SPEC).read_bytes()))
        before_figure = v10.lam.status_figure(root)
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == "applied"))
        results.append(("applied: the spec is the reviewed subject",
                        (root / SPEC).read_bytes() == subject))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names three records",
                        v10.lam.status_figure(root)
                        == (before_figure[0], before_figure[1] + len(V12_SCENARIOS))
                        and THREE_LINKS in status and V11_LINKS not in status))
        results.append(("applied: the v1.1 builder reads its own layer",
                        v11.check(root) == [] and v11.state(root) == "applied"
                        and v10.check(root, signed=False) == []))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.2 bytes with only v1.1 signed.
        results.append(("applied without a v1.2 record: the battery fails",
                        any("v1.2 patch, which no sign-off record covers" in f
                            for f in v10.check(root))
                        and any("v1.2 patch, which no sign-off record covers" in f
                                for f in v11.signed_findings(root))))
        _record_v12(root)
        results.append(("applied with a v1.2 record: signed",
                        signed_findings(root) == [] and battery(root) == []))
        review11 = root / "docs/reviews/R-LC-V11-RAW.md"
        good = review11.read_text()
        review11.write_text(good.replace(good.split("Manifest SHA-256: ")[1][:64], "d" * 64))
        results.append(("v1.2 recorded over a v1.1 layer that is not the signed v1.1: fails",
                        any("does not restore the v1.1 signed bytes" in f
                            for f in signed_findings(root))
                        and any("does not restore the v1.1 signed bytes" in f
                                for f in check(root))))
        review11.write_text(good)
        _record_v12(root, digest="f" * 64)
        results.append(("a v1.2 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))
                        and any("not the bytes its review read" in f for f in v10.check(root))))
        _record_v12(root)
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.3.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.3.md").unlink()
        spec = (root / SPEC).read_text()
        (root / SPEC).write_text(spec.replace(V12_SCENARIOS[0], "#### Scenario: edited after v1.2\n"))
        results.append(("applied and signed, then the spec edited: the tree is neither state",
                        state(root) == "neither"
                        and any("not v1.1 plus the v1.2 patch" in f for f in signed_findings(root))))

    tmp, root = tree()
    with tmp:
        _record_v12(root)
        results.append(("a v1.2 record over an unapplied tree fails",
                        any("not v1.1 plus" in f for f in signed_findings(root))))

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

    refused("v1.1 not installed", "not installed", install_v11=False)
    refused("no v1.1 record", "the v1.1 signed bytes are unknown", record_v11=False)
    refused("the installed spec is not the v1.1 signed bytes", "is not the v1.1 signed bytes",
            v11_digest="e" * 64)
    refused("the patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "spec.md.patch").unlink())
    refused("a post-apply spec with an extra requirement", "expected [", extra=True)
    refused("a post-apply spec without one v1.2 scenario", "0 times", drop=6)
    refused("a post-apply spec with one v1.2 scenario twice", "2 times", twice=3)
    refused("the tree is neither state", "neither v1.1 nor", mutate=lambda root: (
        root / SPEC).write_text((root / SPEC).read_text().replace("#### Scenario: s0\n",
                                                                  "#### Scenario: t0\n")))
    refused("the status page lacks the v1.0 and v1.1 links", "record links exactly once",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V11_LINKS, "(links)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        patch = root / PROPOSED / "spec.md.patch"
        patch.write_text(patch.read_text().replace("+- THEN d", "+- THEN e"))
        results.append(("applied, then the patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v12(root)
        results.append(("absent package with a v1.2 record fails",
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
    mode.add_argument("--write-subjects", action="store_true",
                      help=f"write {SUBJECTS.as_posix()} from the unapplied tree")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.write_subjects:
        if state(ROOT) != "unapplied":
            print(f"REFUSED: the package is {state(ROOT)}, not unapplied; nothing written")
            return 2
        (ROOT / SUBJECTS).write_text(proposed_subjects(ROOT), encoding="utf-8")
        print(f"wrote {SUBJECTS.as_posix()}")
        return 0
    findings = check(ROOT) + signed_findings(ROOT)
    if findings:
        print("FAILED")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    current = state(ROOT)
    print(f"OK: the v{VERSION} package is not present; nothing to verify" if current == "absent"
          else f"OK: the v{VERSION} package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
