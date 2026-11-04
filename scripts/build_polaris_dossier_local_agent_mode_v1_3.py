#!/usr/bin/env python3
"""Build and verify version 1.3 of the Polaris dossier local-agent mode.

Version 1.2 is installed under ``specs/`` over the signed v1.1 and signed off
(tag ``polaris-dossier-local-agent-mode-v1.2``). Version 1.3, the presentation
elements of owner direction ``OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04``,
is carried as three patches under
``.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-3/proposed/``
(``spec.md``, ``design.md``, ``proposal.md``) and offers no option. This module
is the builder ``scripts/record_versioned_signoff.py`` runs for v1.3; no digest
argument exists, the sign-off binds the tag
``polaris-dossier-local-agent-mode-v1.3``.

``--check`` verifies the package in either state and writes nothing:

- the v1.2 builder's own check passes on the v1.2 layer, v1.2 is installed,
  and that layer is the signed v1.2 (``signed_v12_findings()``: the v1.1 layer
  is the signed v1.1, the v1.2 layer is it plus the v1.2 patches, and its spec
  hashes to the digest the v1.2 review read);
- every patch is present;
- unapplied: the status page names the v1.0, v1.1 and v1.2 records exactly
  once together (the install names the v1.3 record beside them); the three
  patches apply, and the post-apply spec carries exactly the v1.0
  requirement names under one ADDED section;
- applied: the patches reverse, so the tree is v1.2 plus exactly these
  patches, and the installed spec keeps that shape.

``signed_findings()`` tells signed from unsigned bytes once v1.3 or later is
the latest recorded version. The v1.2 builder delegates to it, the v1.1
builder to the v1.2 builder, and the v1.0 builder's ``--check`` runs the v1.1
builder's, so the battery runs it. With v1.3 the latest, the v1.2 layer must
be the signed v1.2, the tree must be that layer plus the v1.3 patches, and the
installed spec must hash to the digest the v1.3 review read. Any later version
is a finding until a builder knows it.

The CLI writes nothing. The sign-off recorder
(``record_versioned_signoff.py --record polaris-dossier-local-agent-mode
--version 1.3``) is the one writer: it verifies the reviewed bytes and calls
``apply()``, which applies the patches, rewrites the status page's figures
with ``refigure()`` and names the v1.3 record beside the earlier three.
Regenerating the change's union and the reconciliation census
(``check_spec_reconciliation.py --regenerate``) follows the recording. A
candidate commit, review or merge performs no owner act.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
import os
import pathlib
import shutil
import subprocess
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import build_polaris_dossier_local_agent_mode as v10  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_1 as v11  # noqa: E402
import build_polaris_dossier_local_agent_mode_v1_2 as v12  # noqa: E402

KEY = v10.KEY
VERSION = "1.3"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-3"
)
PROPOSED = CANDIDATE / "proposed"
SPEC = v10.INSTALLED_SPEC
#: (patch file under ``proposed/``, the file it patches), in apply order.
MAIN_PATCHES = (
    ("spec.md.patch", SPEC),
    ("design.md.patch", CHANGE / "design.md"),
    ("proposal.md.patch", CHANGE / "proposal.md"),
)
TARGETS = tuple(dict.fromkeys(target for _patch, target in MAIN_PATCHES))
DECISIONS = v10.DECISIONS
RECORD_STEM = v11.RECORD_STEM
V10_RECORD = v11.V10_RECORD
V11_RECORD = v11.V11_RECORD
V12_RECORD = v12.V12_RECORD
V13_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status page's links to the v1.0, v1.1 and v1.2 records, as v1.2's ``apply()`` wrote them.
V12_LINKS = v12.THREE_LINKS
FOUR_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
              f"    [v1.1 sign-off]({V11_RECORD.as_posix()});\n"
              f"    [v1.2 sign-off]({V12_RECORD.as_posix()});\n"
              f"    [v1.3 sign-off]({V13_RECORD.as_posix()}))")

sha = v11.sha


# --- patches in a scratch copy -------------------------------------------------

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
    return [root / PROPOSED / name for name, _target in MAIN_PATCHES]


def _run(root: pathlib.Path, *, reverse: bool) -> dict[pathlib.Path, bytes] | None:
    if any(not patch.is_file() for patch in _patches(root)):
        return None
    with tempfile.TemporaryDirectory(prefix="dossier-v13-") as tmp:
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
    """The targets' bytes after applying the patches to the tree, or None."""
    return _run(root, reverse=False)


def backward(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets' bytes after reversing the patches on the tree, or None."""
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
    """The reviewed subject: the installed spec with the v1.3 spec patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    return after[SPEC]


# --- checks ------------------------------------------------------------------

def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V13_RECORD.as_posix()} exists"]
                if (root / V13_RECORD).exists() else [])
    findings = [f"v1.2 builder: {f}" for f in v12.check(root)]
    base = v12.state(root)
    if base != "applied":
        findings.append(f"v1.2 is {base}, not installed; v{VERSION} patches the installed v1.2")
    missing = [p.relative_to(root).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    if not (root / V12_RECORD).is_file():
        findings.append(f"{V12_RECORD.as_posix()} is absent; the v1.2 signed bytes are unknown")
    elif base == "applied":
        findings += [f"v1.2 signed bytes: {f}" for f in v12.signed_v12_findings(root)]
    if current == "neither":
        return findings + [f"the tree is neither v1.2 nor v1.2 with the v{VERSION} patches"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V12_LINKS) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0, v1.1 and v1.2 record links "
                            f"exactly once; the install would name no v{VERSION} record")
        after = forward(root)
        assert after is not None  # state() applied it
        findings += v11._shape(after[SPEC], f"{SPEC.as_posix()} with the v{VERSION} patches")
    else:
        findings += v11._shape((root / SPEC).read_bytes(), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def signed_findings(root: pathlib.Path) -> list[str]:
    """Whether the installed bytes are the latest recorded sign-off's (v1.3 or later)."""
    versions = v11.recorded_versions(root)
    if not versions or versions[-1] < (1, 3):
        return v12.signed_findings(root)
    latest = versions[-1]
    if latest != (1, 3):
        return [f"recorded version {latest[0]}.{latest[1]} has no builder; its bytes cannot be "
                "told from unsigned ones"]
    if not (root / CANDIDATE).is_dir():
        return [f"{V13_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    findings = [f"v1.2 signed bytes: {f}" for f in v12.signed_v12_findings(root)]
    current = state(root)
    if current != "applied":
        return findings + [f"the tree is not v1.2 plus the v{VERSION} patches as recorded "
                           f"(found {current})"]
    reviewed = v11.review_digest(root, V13_RECORD)
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
    assert after is not None  # state() applied it
    for rel, data in after.items():
        (root / rel).write_bytes(data)
    text = v10.refigure(root, text.replace(V12_LINKS, FOUR_LINKS))
    status.write_text(text, encoding="utf-8")
    remaining = check(root)
    if state(root) != "applied" or remaining:
        print("FAILED after apply: " + " | ".join(remaining or [state(root)]))
        return 1
    reqs, scenarios = v10.status_figure(root)
    print(f"applied v{VERSION}; {STATUS} now reads {reqs} requirements and {scenarios} "
          "scenarios; next: check_spec_reconciliation.py --regenerate")
    return 0


# --- selftest ----------------------------------------------------------------

V13_MARKER = "#### Scenario: added in v1.3\n"


def _fixture(root: pathlib.Path, *, install_v12: bool = True, record_v12: bool = True,
             v12_digest: str | None = None, extra: bool = False) -> None:
    """A tree with v1.0, v1.1 and v1.2 installed and signed, and the v1.3 patches beside it."""
    import contextlib
    import io
    v12._fixture(root)
    if install_v12:
        with contextlib.redirect_stdout(io.StringIO()):
            assert v12.apply(root) == 0
    if record_v12:
        v12._record_v12(root, digest=v12_digest)
    spec12 = (root / SPEC).read_text()
    if install_v12:
        spec13 = spec12.replace(v12.V12_MARKER, V13_MARKER + "\n- WHEN g\n- THEN h\n\n"
                                + v12.V12_MARKER, 1)
    else:
        spec13 = spec12 + "\n"
    if extra:
        spec13 += v10._req("Extra", 1)
    design12 = (root / CHANGE / "design.md").read_text()
    proposal12 = (root / CHANGE / "proposal.md").read_text()
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, spec12, spec13))
    (root / PROPOSED / "design.md.patch").write_text(
        v11._unified(CHANGE / "design.md", design12, design12 + "Design v1.3.\n"))
    (root / PROPOSED / "proposal.md.patch").write_text(
        v11._unified(CHANGE / "proposal.md", proposal12, "Proposal v1.3.\n"))


def _record_v13(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-V13-RAW.md")
    (root / review).write_text(
        f"# Review\nReviewed commit: {'d' * 40}\n"
        f"Manifest SHA-256: {digest or sha((root / SPEC).read_bytes())}\nVerdict: CONFIRM\n")
    (root / V13_RECORD).write_text(f"# v1.3\n\nReview: {review.as_posix()}\n")


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
        """What the v1.0, v1.1 and v1.2 builders' --check report over the tree."""
        return (v10.check(root) + v11.check(root) + v11.signed_findings(root)
                + v12.check(root) + v12.signed_findings(root))

    tmp, root = tree()
    with tmp:
        results.append(("unapplied package verifies", check(root) == []))
        results.append(("unapplied: the battery's earlier checks pass", battery(root) == []))
        subject = subject_bytes(root)
        results.append(("subject is the installed spec with the v1.3 patch",
                        V13_MARKER.encode() in subject
                        and V13_MARKER.encode() not in (root / SPEC).read_bytes()))
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == "applied"))
        results.append(("applied: the targets carry v1.3",
                        V13_MARKER.encode() in (root / SPEC).read_bytes()
                        and (root / CHANGE / "proposal.md").read_text() == "Proposal v1.3.\n"
                        and (root / CHANGE / "design.md").read_text().endswith("Design v1.3.\n")))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names four records",
                        v10.status_figure(root) == (6, 10) and FOUR_LINKS in status
                        and V12_LINKS not in status))
        results.append(("applied: the v1.2 and v1.1 builders read their own layers",
                        v12.check(root) == [] and v12.state(root) == "applied"
                        and v11.check(root) == []
                        and v11.state(root) == ("applied", frozenset())))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.3 bytes with only v1.2 signed.
        results.append(("applied without a v1.3 record: the battery fails",
                        any("v1.3 patches, which no sign-off record covers" in f
                            for f in v10.check(root))
                        and any("v1.3 patches, which no sign-off record covers" in f
                                for f in v12.signed_findings(root))))
        _record_v13(root)
        results.append(("applied with a v1.3 record: signed",
                        signed_findings(root) == [] and battery(root) == []))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        _record_v13(root, digest="f" * 64)
        results.append(("a v1.3 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))
                        and any("not the bytes its review read" in f for f in v10.check(root))))
        _record_v13(root)
        signed12 = v11.review_digest(root, V12_RECORD)
        v12._record_v12(root, digest="e" * 64)
        results.append(("v1.3 recorded over a v1.2 layer that is not the signed v1.2: fails",
                        any("v1.2 signed bytes" in f and "not the bytes its review read" in f
                            for f in signed_findings(root))
                        and any("v1.2 signed bytes" in f for f in check(root))))
        v12._record_v12(root, digest=signed12)
        results.append(("restored: signed", signed_findings(root) == [] and battery(root) == []))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.4.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.4.md").unlink()
        spec = (root / SPEC).read_text()
        (root / SPEC).write_text(spec.replace(V13_MARKER, "#### Scenario: edited after v1.3\n"))
        results.append(("applied and signed, then the spec edited: the tree is neither state",
                        state(root) == "neither"
                        and any("not v1.2 plus the v1.3 patches" in f for f in signed_findings(root))))

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

    refused("v1.2 not installed", "not installed", install_v12=False)
    refused("no v1.2 record", "the v1.2 signed bytes are unknown", record_v12=False)
    refused("the v1.2 layer is not the bytes the v1.2 review read",
            "not the bytes its review read", v12_digest="d" * 64)
    refused("a patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "design.md.patch").unlink())
    refused("a post-apply spec with an extra requirement", "expected", extra=True)
    refused("the tree is neither state", "neither v1.2 nor", mutate=lambda root: (
        root / CHANGE / "proposal.md").write_text("Edited.\n"))
    refused("the status page lacks the v1.0, v1.1 and v1.2 links", "record links",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V12_LINKS, "(links)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        (root / PROPOSED / "proposal.md.patch").write_text(v11._unified(
            CHANGE / "proposal.md", "Proposal v1.2.\n", "Proposal v1.3, edited.\n"))
        results.append(("applied, then a patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v13(root)
        results.append(("absent package with a v1.3 record fails",
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
    print("OK: the v1.3 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.3 package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
