#!/usr/bin/env python3
"""Build and verify version 1.2 of the Polaris dossier local-agent mode.

Version 1.1 is installed under ``specs/`` over the signed v1.0 and signed off
with the options its record names (tag ``polaris-dossier-local-agent-mode-v1.1``).
Version 1.2 is carried as three patches under
``.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-2/proposed/``
(``spec.md``, ``design.md``, ``proposal.md``) and offers no option. This module
is the builder ``scripts/record_versioned_signoff.py`` runs for v1.2; no digest
argument exists, the sign-off binds the tag
``polaris-dossier-local-agent-mode-v1.2``.

``--check`` verifies the package in either state and writes nothing:

- the v1.1 builder's own check passes on the v1.1 layer, v1.1 is installed,
  and that layer is the signed v1.1 (v1.0's signed bytes plus the v1.1
  patches with the options the v1.1 record names, the spec without them
  hashing to the digest the v1.1 review read);
- every patch is present;
- unapplied: the status page names the v1.0 and v1.1 records exactly once
  together (the install names the v1.2 record beside them); the three
  patches apply, and the post-apply spec carries exactly the v1.0
  requirement names under one ADDED section;
- applied: the patches reverse, so the tree is v1.1 plus exactly these
  patches, and the installed spec keeps that shape.

``signed_findings()`` tells signed from unsigned bytes once v1.2 or later is
the latest recorded version; the v1.1 builder delegates to it, and the v1.0
builder's ``--check`` runs the v1.1 builder's, so the battery runs it. With
v1.2 the latest, the v1.1 layer must be the signed v1.1, the tree must be that
layer plus the v1.2 patches, and the installed spec must hash to the digest
the v1.2 review read. With a later version the latest, the v1.3 builder
(``build_polaris_dossier_local_agent_mode_v1_3.py``) decides, and any version
it does not know is a finding.

Version 1.3 patches the installed v1.2. Once its patches are applied, every
predicate here reads the v1.2 layer: the targets with the v1.3 patches peeled
off (``peeled()``). With v1.2 the latest recorded version, a tree that carries
the v1.3 patches is a finding.

The CLI writes nothing. The sign-off recorder
(``record_versioned_signoff.py --record polaris-dossier-local-agent-mode
--version 1.2``) is the one writer: it verifies the reviewed bytes and calls
``apply()``, which applies the patches, rewrites the status page's figures
with ``refigure()`` and names the v1.2 record beside v1.0's and v1.1's.
Regenerating the change's union and the reconciliation census
(``check_spec_reconciliation.py --regenerate``) follows the recording. A
candidate commit, review or merge performs no owner act.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
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
import build_polaris_dossier_local_agent_mode_v1_1 as v11  # noqa: E402

KEY = v10.KEY
VERSION = "1.2"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-2"
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
V12_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status page's links to the v1.0 and v1.1 records, as v1.1's ``apply()`` wrote them.
V11_LINKS = v11.BOTH_LINKS
THREE_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
               f"    [v1.1 sign-off]({V11_RECORD.as_posix()});\n"
               f"    [v1.2 sign-off]({V12_RECORD.as_posix()}))")

sha = v11.sha


# --- patches in a scratch copy -------------------------------------------------

def peeled(root: pathlib.Path) -> dict[pathlib.Path, bytes] | None:
    """The targets with the v1.3 patches reversed, when the tree carries them.

    Every v1.2 predicate reads the v1.2 layer: once v1.3 is applied, that is
    the tree with the v1.3 patches peeled off. None when nothing is peeled.
    """
    import build_polaris_dossier_local_agent_mode_v1_3 as v13
    if not (root / v13.CANDIDATE).is_dir():
        return None
    return v13.backward(root)


def _spec(root: pathlib.Path) -> bytes:
    later = peeled(root)
    return later[SPEC] if later is not None else (root / SPEC).read_bytes()


def _copy_targets(root: pathlib.Path, scratch: pathlib.Path) -> None:
    """The v1.2 layer: the tree's bytes, with any v1.3 patches peeled off."""
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
    return [root / PROPOSED / name for name, _target in MAIN_PATCHES]


def _run(root: pathlib.Path, *, reverse: bool) -> dict[pathlib.Path, bytes] | None:
    if any(not patch.is_file() for patch in _patches(root)):
        return None
    with tempfile.TemporaryDirectory(prefix="dossier-v12-") as tmp:
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
    """The reviewed subject: the installed spec with the v1.2 spec patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    return after[SPEC]


# --- checks ------------------------------------------------------------------

def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V12_RECORD.as_posix()} exists"]
                if (root / V12_RECORD).exists() else [])
    findings = [f"v1.1 builder: {f}" for f in v11.check(root)]
    base, _options = v11.state(root)
    if base != "applied":
        findings.append(f"v1.1 is {base}, not installed; v{VERSION} patches the installed v1.1")
    missing = [p.relative_to(root).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    if not (root / V11_RECORD).is_file():
        findings.append(f"{V11_RECORD.as_posix()} is absent; the v1.1 signed bytes are unknown")
    elif base == "applied":
        findings += [f"v1.1 signed bytes: {f}" for f in v11.signed_v11_findings(root)]
    if current == "neither":
        return findings + [f"the tree is neither v1.1 nor v1.1 with the v{VERSION} patches"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V11_LINKS) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0 and v1.1 record links exactly "
                            f"once; the install would name no v{VERSION} record")
        after = forward(root)
        assert after is not None  # state() applied it
        findings += v11._shape(after[SPEC], f"{SPEC.as_posix()} with the v{VERSION} patches")
    else:
        findings += v11._shape(_spec(root), SPEC.as_posix())
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def signed_findings(root: pathlib.Path) -> list[str]:
    """Whether the installed bytes are the latest recorded sign-off's (v1.2 or later)."""
    versions = v11.recorded_versions(root)
    if not versions or versions[-1] < (1, 2):
        return v11.signed_findings(root)
    latest = versions[-1]
    if latest == (1, 2):
        findings = signed_v12_findings(root)
        if peeled(root) is not None:
            findings.append("the tree carries the v1.3 patches, which no sign-off record covers")
        return findings
    # A later version: its own builder tells its signed bytes from unsigned ones.
    import build_polaris_dossier_local_agent_mode_v1_3 as v13
    return v13.signed_findings(root)


def signed_v12_findings(root: pathlib.Path) -> list[str]:
    """Whether the v1.2 layer (any later patches peeled) is the signed v1.2."""
    if not (root / CANDIDATE).is_dir():
        return [f"{V12_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    findings = [f"v1.1 signed bytes: {f}" for f in v11.signed_v11_findings(root)]
    current = state(root)
    if current != "applied":
        return findings + [f"the tree is not v1.1 plus the v{VERSION} patches as recorded "
                           f"(found {current})"]
    reviewed = v11.review_digest(root, V12_RECORD)
    if reviewed is None or sha(_spec(root)) != reviewed:
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
    text = v10.refigure(root, text.replace(V11_LINKS, THREE_LINKS))
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

V12_MARKER = "#### Scenario: added in v1.2\n"


def _fixture(root: pathlib.Path, *, v11_options: str = "none", install_v11: bool = True,
             record_v11: bool = True, v11_digest: str | None = None,
             extra: bool = False) -> None:
    """A tree with v1.0 and v1.1 installed and signed, and the v1.2 patches beside it."""
    import contextlib
    import io
    v11._fixture(root)
    options = v11.recorded_or(v11_options)
    if install_v11:
        with contextlib.redirect_stdout(io.StringIO()):
            assert v11.apply(root, options) == 0
    if record_v11:
        v11._record_v11(root, options=v11_options, digest=v11_digest)
    spec11 = (root / SPEC).read_text()
    if install_v11:
        spec12 = spec11.replace("#### Scenario: added in v1.1\n",
                                V12_MARKER + "\n- WHEN e\n- THEN f\n\n"
                                "#### Scenario: added in v1.1\n", 1)
    else:
        spec12 = spec11 + "\n"
    if extra:
        spec12 += v10._req("Extra", 1)
    design11 = (root / CHANGE / "design.md").read_text()
    proposal11 = (root / CHANGE / "proposal.md").read_text()
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, spec11, spec12))
    (root / PROPOSED / "design.md.patch").write_text(
        v11._unified(CHANGE / "design.md", design11, design11 + "Design v1.2.\n"))
    (root / PROPOSED / "proposal.md.patch").write_text(
        v11._unified(CHANGE / "proposal.md", proposal11, "Proposal v1.2.\n"))


def _record_v12(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-V12-RAW.md")
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

    for v11_options in ("none", "n6"):
        tmp, root = tree(v11_options=v11_options)
        with tmp:
            tag = f"(v1.1 options {v11_options})"
            results.append((f"unapplied package verifies {tag}", check(root) == []))
            results.append((f"unapplied: the battery's v1.0 and v1.1 checks pass {tag}",
                            battery(root) == []))
            subject = subject_bytes(root)
            results.append((f"subject is the installed spec with the v1.2 patch {tag}",
                            V12_MARKER.encode() in subject
                            and V12_MARKER.encode() not in (root / SPEC).read_bytes()))
            results.append((f"apply returns 0 {tag}", quiet(apply, root) == 0))
            results.append((f"applied package verifies {tag}",
                            applied(root) and state(root) == "applied"))
            results.append((f"applied: the targets carry v1.2 {tag}",
                            V12_MARKER.encode() in (root / SPEC).read_bytes()
                            and (root / CHANGE / "proposal.md").read_text() == "Proposal v1.2.\n"
                            and (root / CHANGE / "design.md").read_text().endswith("Design v1.2.\n")))
            status = (root / STATUS).read_text()
            figure = (6, 10) if v11_options == "n6" else (6, 9)
            results.append((f"applied: the status figure follows the recount and names three "
                            f"records {tag}",
                            v10.status_figure(root) == figure and THREE_LINKS in status
                            and V11_LINKS not in status))
            results.append((f"applied: the v1.1 builder reads its own layer {tag}",
                            v11.check(root) == []
                            and v11.state(root) == ("applied", v11.recorded_or(v11_options))))
            results.append((f"second apply refuses {tag}", quiet(apply, root) == 2))
            # The distinguishing check: v1.2 bytes with only v1.1 signed.
            results.append((f"applied without a v1.2 record: the battery fails {tag}",
                            any("v1.2 patches, which no sign-off record covers" in f
                                for f in v10.check(root))
                            and any("v1.2 patches, which no sign-off record covers" in f
                                    for f in v11.signed_findings(root))))
            _record_v12(root)
            results.append((f"applied with a v1.2 record: signed {tag}",
                            signed_findings(root) == [] and battery(root) == []))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        _record_v12(root, digest="f" * 64)
        results.append(("a v1.2 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))
                        and any("not the bytes its review read" in f for f in v10.check(root))))
        _record_v12(root)
        v11._record_v11(root, digest="e" * 64)
        results.append(("v1.2 recorded over a v1.1 layer that is not the signed v1.1: fails",
                        any("v1.1 signed bytes" in f and "without options" in f
                            for f in signed_findings(root))
                        and any("v1.1 signed bytes" in f for f in check(root))))
        v11._record_v11(root)
        v11._record_v11(root, options="n6")
        results.append(("v1.2 recorded over a v1.1 layer lacking the recorded option: fails",
                        any("as recorded" in f for f in signed_findings(root))))
        v11._record_v11(root)
        results.append(("restored: signed", signed_findings(root) == [] and battery(root) == []))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.4.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.4.md").unlink()
        spec = (root / SPEC).read_text()
        (root / SPEC).write_text(spec.replace(V12_MARKER, "#### Scenario: edited after v1.2\n"))
        results.append(("applied and signed, then the spec edited: the tree is neither state",
                        state(root) == "neither"
                        and any("not v1.1 plus the v1.2 patches" in f for f in signed_findings(root))))

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
    refused("the v1.1 layer is not the bytes the v1.1 review read", "without options",
            v11_digest="d" * 64)
    refused("the v1.1 record names an option the tree lacks", "as recorded",
            mutate=lambda root: v11._record_v11(root, options="n6"))
    refused("a patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "design.md.patch").unlink())
    refused("a post-apply spec with an extra requirement", "expected", extra=True)
    refused("the tree is neither state", "neither v1.1 nor", mutate=lambda root: (
        root / CHANGE / "proposal.md").write_text("Edited.\n"))
    refused("the status page lacks the v1.0 and v1.1 links", "record links exactly once",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V11_LINKS, "(links)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        (root / PROPOSED / "proposal.md.patch").write_text(v11._unified(
            CHANGE / "proposal.md", "Proposal v1.1.\n", "Proposal v1.2, edited.\n"))
        results.append(("applied, then a patch edited: the tree is neither state",
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
    print("OK: the v1.2 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.2 package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
