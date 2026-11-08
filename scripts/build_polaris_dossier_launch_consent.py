#!/usr/bin/env python3
"""Build and verify the Polaris dossier launch-consent candidate (bead syzygy-pdja.21).

The change holds its two ADDED requirements (REQ-polaris-generation-046 and
047) in
``openspec/changes/polaris-dossier-launch-consent/proposed/polaris-generation/spec.md``,
not ``specs/``, because a file under ``specs/`` joins the Polaris effective
composition that ``scripts/count_polaris_effective_scenarios.py`` recounts.
Moving it there is the install step of the owner's version-tagged sign-off,
and this module is the builder ``scripts/record_versioned_signoff.py`` runs
for it. No digest argument exists: the sign-off binds the tag
``polaris-dossier-launch-consent-v1.0``. It mirrors the local-agent mode's
v1.0 builder (``build_polaris_dossier_local_agent_mode.py``).

``--check`` verifies the package in either state and writes nothing:

- unapplied: the spec is in ``proposed/`` only; it carries exactly one
  ``## ADDED Requirements`` section naming the two requirements below, on
  which the recount tool's two parsers agree; the status page's effective
  figure equals the recount of the tree as it stands; a scratch copy of the
  composition with the spec installed composes and carries both names; and
  the sign-off brief cites the proposed path in full (the install rewrites it);
- applied: the spec is in ``specs/`` only, with the same shape; the status
  page's effective figure equals the recount, which composes both names; the
  page names the installed spec and the v1.0 sign-off record; and no file in
  the candidate or change directory cites the proposed path, in full or as
  the short ``proposed/…`` span.

The CLI writes nothing. The sign-off recorder (``--record``) is the one
writer: it verifies the reviewed bytes, calls ``apply()``, and writes the
record. ``apply()`` refuses unless the unapplied package verifies; then it
moves the spec, removes the emptied ``proposed/`` directories, rewrites the
full-path citation with a note keeping the path the review read, unquotes
the short spans (keeping the words), and rewrites both figures on the status
page with the local-agent builder's ``refigure()`` (the "without" figure is
the composition without the local-agent addition, which now includes this
one), naming this addition and its record after the effective figure. The
change's generated dependency union is then written by
``scripts/check_spec_reconciliation.py --regenerate`` in the same commit, as
for every installed addition. A candidate commit, review or merge performs
no owner act.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
import pathlib
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import count_polaris_effective_scenarios as counter  # noqa: E402
import build_polaris_dossier_local_agent_mode as lam  # noqa: E402

CHANGE = pathlib.Path("openspec/changes/polaris-dossier-launch-consent")
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-launch-consent"
)
KEY = "polaris-dossier-launch-consent"
PROPOSED_SPEC = CHANGE / "proposed/polaris-generation/spec.md"
INSTALLED_SPEC = CHANGE / "specs/polaris-generation/spec.md"
STATUS = lam.STATUS
DECISIONS = lam.DECISIONS
SIGNOFF_RECORD = DECISIONS / "POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v1.0.md"
BRIEF = CANDIDATE / "REVIEW-BRIEF-SIGNOFF.md"
REQUIREMENTS = (
    "Launch-time consent",
    "Trunk-tip revision pinned at launch",
)
SHORT_SPAN = "`proposed/polaris-generation/spec.md`"
#: The sentence after the effective figure that the install extends.
WITH_IT = "in the effective composition with it."


class Refusal(RuntimeError):
    """The package does not verify; nothing is written."""


def state(root: pathlib.Path) -> str:
    if not (root / CHANGE).is_dir():
        return "absent"
    proposed = (root / PROPOSED_SPEC).is_file()
    installed = (root / INSTALLED_SPEC).is_file()
    if proposed and not installed:
        return "unapplied"
    if installed and not proposed:
        return "applied"
    return "both" if proposed else "neither"


def spec_findings(text: str, label: str) -> list[str]:
    findings = []
    sections = [m.group(1) for m in counter.SECTION_HEADER_RE.finditer(text)]
    if sections != ["ADDED"]:
        findings.append(f"{label}: sections {sections}, expected exactly one ADDED section")
    try:
        names = tuple(entry.name for entry in counter.parse_regex(text, label).added)
        manual = tuple(entry.name for entry in counter.parse_manual(text, label).added)
    except counter.ScenarioCountError as exc:
        return findings + [str(exc)]
    if names != manual:
        findings.append(f"{label}: the recount tool's two parsers disagree on requirement names")
    if names != REQUIREMENTS:
        findings.append(f"{label}: requirements {list(names)}, expected {list(REQUIREMENTS)}")
    return findings


def recount_installed(root: pathlib.Path) -> tuple[int, int, set[str]]:
    """Recount a scratch copy of the composition with the proposed spec installed."""
    with tempfile.TemporaryDirectory(prefix="launch-consent-recount-") as tmp:
        scratch = pathlib.Path(tmp)
        for path in counter.discover_composition_files(root):
            rel = path.relative_to(root)
            (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
            (scratch / rel).write_bytes(path.read_bytes())
        (scratch / INSTALLED_SPEC).parent.mkdir(parents=True, exist_ok=True)
        (scratch / INSTALLED_SPEC).write_bytes((root / PROPOSED_SPEC).read_bytes())
        return lam.recount(scratch)


def brief_note() -> str:
    return (f" (installed there by the v1.0 sign-off, whose record gives the date; "
            f"the review read it at {PROPOSED_SPEC.as_posix()})")


def _package_files(root: pathlib.Path) -> list[pathlib.Path]:
    return [p for d in (CANDIDATE, CHANGE) for p in sorted((root / d).rglob("*.md"))
            if p.name != "GOVERNING-DEPENDENCIES.md"]


def check(root: pathlib.Path = ROOT) -> list[str]:
    current = state(root)
    if current == "absent":
        signed = sorted(p.name for p in (root / DECISIONS).glob(
            "POLARIS-DOSSIER-LAUNCH-CONSENT-SIGNOFF-v*.md")) if (root / DECISIONS).is_dir() else []
        return [f"the change directory is absent but {signed} records a sign-off"] if signed else []
    if current not in ("unapplied", "applied"):
        return [f"the spec is in {current} of proposed/ and specs/"]
    spec = PROPOSED_SPEC if current == "unapplied" else INSTALLED_SPEC
    findings = spec_findings((root / spec).read_text(encoding="utf-8"), spec.as_posix())
    if findings:
        return findings
    try:
        reqs, scenarios, names = lam.recount(root)
        if lam.status_figure(root) != (reqs, scenarios):
            findings.append(f"{STATUS} figure {lam.status_figure(root)} differs from the recount "
                            f"{(reqs, scenarios)}")
        if current == "unapplied":
            _r, _s, names = recount_installed(root)
        missing = {counter.normalize_name(n) for n in REQUIREMENTS} - names
        if missing:
            findings.append(f"the composition does not carry {sorted(missing)}")
    except (counter.ScenarioCountError, lam.Refusal, Refusal, OSError) as exc:
        findings.append(str(exc))
    full = f"`{PROPOSED_SPEC.as_posix()}`"
    status = (root / STATUS).read_text(encoding="utf-8")
    if current == "unapplied":
        if not (root / BRIEF).is_file() or full not in (root / BRIEF).read_text(encoding="utf-8"):
            findings.append(f"{BRIEF}: does not cite {full}; the install would rewrite nothing")
        if WITH_IT not in status:
            findings.append(f"{STATUS}: no '{WITH_IT}' after the effective figure to extend")
        if INSTALLED_SPEC.as_posix() in status:
            findings.append(f"{STATUS}: names {INSTALLED_SPEC.as_posix()} before it is installed")
    else:
        for needed in (INSTALLED_SPEC.as_posix(), SIGNOFF_RECORD.as_posix()):
            if needed not in status:
                findings.append(f"{STATUS}: does not name {needed}")
        for path in _package_files(root):
            text = path.read_text(encoding="utf-8")
            for span in (full, SHORT_SPAN):
                if span in text:
                    findings.append(f"{path.relative_to(root)}: still cites {span}")
        if (root / BRIEF).is_file() and brief_note() not in (root / BRIEF).read_text(encoding="utf-8"):
            findings.append(f"{BRIEF}: does not keep the path its review read")
    return findings


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def apply(root: pathlib.Path = ROOT) -> int:
    if state(root) != "unapplied":
        print(f"REFUSED: the package is {state(root)}, not unapplied; nothing written")
        return 2
    findings = check(root)
    if findings:
        print("REFUSED: the package does not verify; nothing written")
        for finding in findings:
            print(f"  - {finding}")
        return 2
    src, dst = root / PROPOSED_SPEC, root / INSTALLED_SPEC
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    for leftover in (src.parent, src.parent.parent):
        if leftover.is_dir() and not any(leftover.iterdir()):
            leftover.rmdir()
    full, installed = f"`{PROPOSED_SPEC.as_posix()}`", f"`{INSTALLED_SPEC.as_posix()}`"
    brief = root / BRIEF
    brief.write_text(brief.read_text(encoding="utf-8").replace(full, installed + brief_note()),
                     encoding="utf-8")
    for path in _package_files(root):
        text = path.read_text(encoding="utf-8")
        if SHORT_SPAN in text:
            path.write_text(text.replace(SHORT_SPAN, SHORT_SPAN.strip("`")), encoding="utf-8")
    status = root / STATUS
    text = lam.refigure(root, status.read_text(encoding="utf-8"))
    text = text.replace(WITH_IT, (
        "in the effective composition with it and with the signed-off\n"
        f"    [launch-consent addition]({INSTALLED_SPEC.as_posix()})\n"
        f"    ([v1.0 sign-off]({SIGNOFF_RECORD.as_posix()}))."), 1)
    status.write_text(text, encoding="utf-8")
    after = check(root)
    if after:
        print("FAILED after apply: " + " | ".join(after))
        return 1
    reqs, scenarios = lam.status_figure(root)
    print(f"installed {installed}; {STATUS} now reads {reqs} requirements and {scenarios} scenarios")
    return 0


# --- selftest ---------------------------------------------------------------

LAM_SPEC = pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md")


def _req(name: str, scenarios: int) -> str:
    return f"### Requirement: {name}\n\nText.\n\n" + "".join(
        f"#### Scenario: s{i}\n\n- WHEN x\n- THEN y\n\n" for i in range(scenarios))


def _fixture(root: pathlib.Path, *, spec: str | None = None, status: str | None = None,
             brief: bool = True) -> None:
    def write(rel: pathlib.Path | str, text: str) -> None:
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text, encoding="utf-8")
    write("openspec/changes/base/specs/polaris-generation/spec.md",
          "## ADDED Requirements\n\n" + _req("Alpha", 1) + _req("Beta", 1))
    write("openspec/changes/overlay/specs/polaris-generation/spec.md",
          "## MODIFIED Requirements\n\n" + _req("Beta", 2))
    write(LAM_SPEC, "## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in lam.REQUIREMENTS))
    write(STATUS, status if status is not None else (
        "- Polaris: 2 requirements and 3 scenarios without the signed-off\n"
        f"    [dossier local-agent addition]({LAM_SPEC.as_posix()}), and\n"
        "    6 requirements and 7 scenarios in the effective composition with it.\n"))
    write(PROPOSED_SPEC, spec if spec is not None else
          "## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in REQUIREMENTS))
    write(CHANGE / "design.md", f"The spec is {SHORT_SPAN}.\n")
    write(BRIEF, f"Subject: `{PROPOSED_SPEC.as_posix()}`\n" if brief else "Subject: elsewhere\n")


def selftest() -> int:
    import contextlib
    import io

    results: list[tuple[str, bool]] = []

    def quiet(fn, *args):
        with contextlib.redirect_stdout(io.StringIO()):
            return fn(*args)

    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        results.append(("unapplied package verifies", check(root) == []))
        results.append(("unapplied package is not applied", not applied(root)))
        results.append(("apply installs and returns 0", quiet(apply, root) == 0))
        results.append(("applied package verifies", applied(root)))
        results.append(("proposed directory removed", not (root / CHANGE / "proposed").exists()))
        status = (root / STATUS).read_text()
        results.append(("both figures follow the recount",
                        "4 requirements and 5 scenarios without the signed-off" in status
                        and "8 requirements and 9 scenarios in the effective composition" in status))
        results.append(("status names the addition and its record",
                        INSTALLED_SPEC.as_posix() in status and SIGNOFF_RECORD.as_posix() in status))
        results.append(("brief rewritten with its note",
                        (root / BRIEF).read_text() == f"Subject: `{INSTALLED_SPEC.as_posix()}`"
                        + brief_note() + "\n"))
        results.append(("short span unquoted, words kept",
                        (root / CHANGE / "design.md").read_text()
                        == "The spec is proposed/polaris-generation/spec.md.\n"))
        results.append(("the local-agent builder's figures still hold",
                        lam.status_figure(root) == lam.recount(root)[:2]))
        results.append(("second apply refuses", quiet(apply, root) == 2))
        (root / STATUS).write_text(status.replace(SIGNOFF_RECORD.as_posix(), "elsewhere"))
        results.append(("applied: status not naming the record fails",
                        any("does not name" in f for f in check(root))))
        (root / STATUS).write_text(status)
        (root / CHANGE / "design.md").write_text(f"Still {SHORT_SPAN}.\n")
        results.append(("applied: a short span left behind fails",
                        any("still cites" in f for f in check(root))))

    def refused(name: str, mutate=None, expect: str = "", **fixture) -> None:
        with tempfile.TemporaryDirectory() as t:
            root = pathlib.Path(t)
            _fixture(root, **fixture)
            if mutate:
                mutate(root)
            before = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            code = quiet(apply, root)
            after = {p: p.read_bytes() for p in root.rglob("*") if p.is_file()}
            found = check(root)
            results.append((f"refused: {name}", bool(found) and code == 2 and before == after
                            and any(expect in f for f in found)))

    refused("a third requirement",
            spec="## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in (*REQUIREMENTS, "Extra")),
            expect="expected [")
    refused("a requirement missing",
            spec="## ADDED Requirements\n\n" + _req(REQUIREMENTS[0], 1), expect="expected [")
    refused("a MODIFIED section in the candidate",
            spec="## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in REQUIREMENTS)
            + "## MODIFIED Requirements\n\n" + _req("Beta", 1),
            expect="expected exactly one ADDED section")
    refused("status figure stale before install",
            status="- 6 requirements and 8 scenarios in the effective composition with it.\n",
            expect="differs from the recount")
    refused("status has nothing to extend",
            status=("- Polaris: 2 requirements and 3 scenarios without the signed-off\n"
                    f"    [dossier local-agent addition]({LAM_SPEC.as_posix()}), and\n"
                    "    6 requirements and 7 scenarios in the effective composition.\n"),
            expect="to extend")
    refused("the brief no longer cites the proposed path", brief=False, expect="rewrite nothing")
    refused("spec in both proposed/ and specs/", mutate=lambda root: (
        (root / INSTALLED_SPEC).parent.mkdir(parents=True),
        shutil.copy(root / PROPOSED_SPEC, root / INSTALLED_SPEC)), expect="in both of")
    refused("spec in neither", mutate=lambda root: (root / PROPOSED_SPEC).unlink(),
            expect="in neither of")

    def collide(root: pathlib.Path) -> None:
        base = root / "openspec/changes/base/specs/polaris-generation/spec.md"
        base.write_text(base.read_text() + _req(REQUIREMENTS[0], 1))
    refused("a name colliding with the composition", mutate=collide)

    real_manual = counter.parse_manual
    def dropping_manual(text, label):
        parsed = real_manual(text, label)
        if parsed.added and label == PROPOSED_SPEC.as_posix():
            parsed.added.pop()
        return parsed
    counter.parse_manual = dropping_manual
    try:
        refused("the recount tool's parsers disagree", expect="two parsers disagree")
    finally:
        counter.parse_manual = real_manual

    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        (root / CHANGE).rename(root / "gone")
        results.append(("absent change with no record passes", check(root) == []))
        (root / SIGNOFF_RECORD).parent.mkdir(parents=True, exist_ok=True)
        (root / SIGNOFF_RECORD).write_text("x")
        results.append(("absent change with a record fails", bool(check(root))))

    failing = 0
    for name, ok in results:
        print(f"{'PASS' if ok else 'FAIL'}  {name}")
        failing += not ok
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
    findings = check(ROOT)
    if findings:
        print("FAILED")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print("OK: the change directory is not present; nothing to verify"
          if state(ROOT) == "absent" else f"OK: the package verifies ({state(ROOT)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
