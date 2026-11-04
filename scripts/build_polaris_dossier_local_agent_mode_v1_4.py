#!/usr/bin/env python3
"""Build and verify the proposed dossier local-agent mode version 1.4.

The three candidate patches extend signed v1.3. --check and --selftest
write no repository target; apply() is called only by the existing
versioned-signoff recorder after the owner's actual version selection.
The predecessor builder peels this layer and delegates latest-signed
checks here. Review binding remains the recorder's existing spec binding;
its candidate-package drift guards remain unchanged. No product behavior,
P115 act, consent, or observed-project execution permission is added.
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
import build_polaris_dossier_local_agent_mode_v1_3 as v13  # noqa: E402

KEY = v10.KEY
VERSION = "1.4"
CHANGE = v10.CHANGE
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-4"
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
V12_RECORD = v13.V12_RECORD
V13_RECORD = v13.V13_RECORD
V14_RECORD = DECISIONS / f"{RECORD_STEM}-SIGNOFF-v{VERSION}.md"
STATUS = v10.STATUS
#: The status links written by the installed v1.3 layer.
V13_LINKS = v13.FOUR_LINKS
FIVE_LINKS = (f"([v1.0 sign-off]({V10_RECORD.as_posix()});\n"
              f"    [v1.1 sign-off]({V11_RECORD.as_posix()});\n"
              f"    [v1.2 sign-off]({V12_RECORD.as_posix()});\n"
              f"    [v1.3 sign-off]({V13_RECORD.as_posix()});\n"
              f"    [v1.4 sign-off]({V14_RECORD.as_posix()}))")

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
    with tempfile.TemporaryDirectory(prefix="dossier-v14-") as tmp:
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
    """The reviewed subject: the installed spec with the v1.4 spec patch applied."""
    after = forward(root)
    if after is None:
        raise ValueError(f"the v{VERSION} patches do not apply to the tree")
    return after[SPEC]


# --- checks ------------------------------------------------------------------

def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        return ([f"the v{VERSION} package is absent but {V14_RECORD.as_posix()} exists"]
                if (root / V14_RECORD).exists() else [])
    findings = [f"v1.3 builder: {f}" for f in v13.check(root)]
    base = v13.state(root)
    if base != "applied":
        findings.append(f"v1.3 is {base}, not installed; v{VERSION} patches the installed v1.3")
    missing = [p.relative_to(root).as_posix() for p in _patches(root) if not p.is_file()]
    if missing:
        return findings + [f"missing patch {m}" for m in missing]
    if not (root / V13_RECORD).is_file():
        findings.append(f"{V13_RECORD.as_posix()} is absent; the v1.3 signed bytes are unknown")
    elif base == "applied":
        findings += [f"v1.3 signed bytes: {f}" for f in v13.signed_v13_findings(root)]
    if current == "neither":
        return findings + [f"the tree is neither v1.3 nor v1.3 with the v{VERSION} patches"]
    if current == "unapplied":
        if (root / STATUS).is_file() and (
                (root / STATUS).read_text(encoding="utf-8").count(V13_LINKS) != 1):
            findings.append(f"{STATUS}: does not carry the v1.0, v1.1, v1.2 and v1.3 record links "
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
    """Whether the installed bytes are the latest recorded sign-off's (v1.4 or later)."""
    versions = v11.recorded_versions(root)
    if not versions or versions[-1] < (1, 4):
        return v13.signed_findings(root)
    latest = versions[-1]
    if latest != (1, 4):
        return [f"recorded version {latest[0]}.{latest[1]} has no builder; its bytes cannot be "
                "told from unsigned ones"]
    if not (root / CANDIDATE).is_dir():
        return [f"{V14_RECORD.as_posix()} exists but the v{VERSION} package is absent"]
    findings = [f"v1.3 signed bytes: {f}" for f in v13.signed_v13_findings(root)]
    current = state(root)
    if current != "applied":
        return findings + [f"the tree is not v1.3 plus the v{VERSION} patches as recorded "
                           f"(found {current})"]
    reviewed = v11.review_digest(root, V14_RECORD)
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
    text = v10.refigure(root, text.replace(V13_LINKS, FIVE_LINKS))
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

V14_MARKER = "#### Scenario: added in v1.4\n"


def _fixture(root: pathlib.Path, *, install_v13: bool = True, record_v13: bool = True,
             v13_digest: str | None = None, extra: bool = False) -> None:
    """A tree with v1.0 through v1.3 installed and signed, and the v1.4 patches beside it."""
    import contextlib
    import io
    v13._fixture(root)
    if install_v13:
        with contextlib.redirect_stdout(io.StringIO()):
            assert v13.apply(root) == 0
    if record_v13:
        v13._record_v13(root, digest=v13_digest)
    base_spec = (root / SPEC).read_text()
    if install_v13:
        successor_spec = base_spec.replace(v13.V13_MARKER, V14_MARKER + "\n- WHEN g\n- THEN h\n\n"
                                          + v13.V13_MARKER, 1)
    else:
        successor_spec = base_spec + "\n"
    if extra:
        successor_spec += v10._req("Extra", 1)
    base_design = (root / CHANGE / "design.md").read_text()
    base_proposal = (root / CHANGE / "proposal.md").read_text()
    (root / PROPOSED).mkdir(parents=True, exist_ok=True)
    (root / PROPOSED / "spec.md.patch").write_text(v11._unified(SPEC, base_spec, successor_spec))
    (root / PROPOSED / "design.md.patch").write_text(
        v11._unified(CHANGE / "design.md", base_design, base_design + "Design v1.4.\n"))
    (root / PROPOSED / "proposal.md.patch").write_text(
        v11._unified(CHANGE / "proposal.md", base_proposal, "Proposal v1.4.\n"))


def _record_v14(root: pathlib.Path, digest: str | None = None) -> None:
    review = pathlib.Path("docs/reviews/R-V14-RAW.md")
    (root / review).write_text(
        f"# Review\nReviewed commit: {'d' * 40}\n"
        f"Manifest SHA-256: {digest or sha((root / SPEC).read_bytes())}\nVerdict: CONFIRM\n")
    (root / V14_RECORD).write_text(f"# v1.4\n\nReview: {review.as_posix()}\n")


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
        """What the v1.0, v1.1, v1.2 and v1.3 builders' --check report over the tree."""
        return (v10.check(root) + v11.check(root) + v11.signed_findings(root)
                + v13.check(root) + v13.signed_findings(root))

    tmp, root = tree()
    with tmp:
        results.append(("unapplied package verifies", check(root) == []))
        results.append(("unapplied: the battery's earlier checks pass", battery(root) == []))
        subject = subject_bytes(root)
        results.append(("subject is the installed spec with the v1.4 patch",
                        V14_MARKER.encode() in subject
                        and V14_MARKER.encode() not in (root / SPEC).read_bytes()))
        results.append(("apply returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root) and state(root) == "applied"))
        results.append(("applied: the targets carry v1.4",
                        V14_MARKER.encode() in (root / SPEC).read_bytes()
                        and (root / CHANGE / "proposal.md").read_text() == "Proposal v1.4.\n"
                        and (root / CHANGE / "design.md").read_text().endswith("Design v1.4.\n")))
        status = (root / STATUS).read_text()
        results.append(("applied: the status figure follows the recount and names five records",
                        v10.status_figure(root) == (6, 11) and FIVE_LINKS in status
                        and V13_LINKS not in status))
        results.append(("applied: the v1.3 and v1.1 builders read their own layers",
                        v13.check(root) == [] and v13.state(root) == "applied"
                        and v11.check(root) == []
                        and v11.state(root) == ("applied", frozenset())))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        # The distinguishing check: v1.4 bytes with only v1.3 signed.
        results.append(("applied without a v1.4 record: the battery fails",
                        any("v1.4 patches, which no sign-off record covers" in f
                            for f in v10.check(root))
                        and any("v1.4 patches, which no sign-off record covers" in f
                                for f in v13.signed_findings(root))))
        _record_v14(root)
        results.append(("applied with a v1.4 record: signed",
                        signed_findings(root) == [] and battery(root) == []))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        _record_v14(root, digest="f" * 64)
        results.append(("a v1.4 review digest that is not the spec fails",
                        any("not the bytes its review read" in f for f in signed_findings(root))
                        and any("not the bytes its review read" in f for f in v10.check(root))))
        _record_v14(root)
        base_digest = v11.review_digest(root, V13_RECORD)
        v13._record_v13(root, digest="e" * 64)
        results.append(("v1.4 recorded over a v1.3 layer that is not the signed v1.3: fails",
                        any("v1.3 signed bytes" in f and "not the bytes its review read" in f
                            for f in signed_findings(root))
                        and any("v1.3 signed bytes" in f for f in check(root))))
        v13._record_v13(root, digest=base_digest)
        results.append(("restored: signed", signed_findings(root) == [] and battery(root) == []))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.5.md").write_text("Review: x\n")
        results.append(("a later version no builder knows fails",
                        any("has no builder" in f for f in signed_findings(root))
                        and any("has no builder" in f for f in v10.check(root))))
        (root / DECISIONS / f"{RECORD_STEM}-SIGNOFF-v1.5.md").unlink()
        spec = (root / SPEC).read_text()
        (root / SPEC).write_text(spec.replace(V14_MARKER, "#### Scenario: edited after v1.4\n"))
        results.append(("applied and signed, then the spec edited: the tree is neither state",
                        state(root) == "neither"
                        and any("not v1.3 plus the v1.4 patches" in f for f in signed_findings(root))))

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

    refused("v1.3 not installed", "not installed", install_v13=False)
    refused("no v1.3 record", "the v1.3 signed bytes are unknown", record_v13=False)
    refused("the v1.3 layer is not the bytes the v1.3 review read",
            "not the bytes its review read", v13_digest="d" * 64)
    refused("a patch missing", "missing patch",
            mutate=lambda root: (root / PROPOSED / "design.md.patch").unlink())
    refused("a post-apply spec with an extra requirement", "expected", extra=True)
    refused("the tree is neither state", "neither v1.3 nor", mutate=lambda root: (
        root / CHANGE / "proposal.md").write_text("Edited.\n"))
    refused("the status page lacks the v1.0, v1.1, v1.2 and v1.3 links", "record links",
            mutate=lambda root: (root / STATUS).write_text(
                (root / STATUS).read_text().replace(V13_LINKS, "(links)")))

    tmp, root = tree()
    with tmp:
        quiet(apply, root)
        (root / PROPOSED / "proposal.md.patch").write_text(v11._unified(
            CHANGE / "proposal.md", "Proposal v1.3.\n", "Proposal v1.4, edited.\n"))
        results.append(("applied, then a patch edited: the tree is neither state",
                        any("neither" in f for f in check(root)) and not applied(root)))
    tmp, root = tree()
    with tmp:
        shutil.rmtree(root / CANDIDATE)
        results.append(("absent package: nothing to verify", check(root) == []))
        _record_v14(root)
        results.append(("absent package with a v1.4 record fails",
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
    print("OK: the v1.4 package is not present; nothing to verify" if current == "absent"
          else f"OK: the v1.4 package verifies ({current})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
