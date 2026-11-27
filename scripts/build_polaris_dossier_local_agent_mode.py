#!/usr/bin/env python3
"""Build and verify the Polaris dossier local-agent mode candidate (PR #353).

The candidate holds its four ADDED requirements in
``openspec/changes/polaris-dossier-local-agent-mode/proposed/polaris-generation/spec.md``,
not ``specs/``, because a file under ``specs/`` joins the Polaris effective
composition that ``scripts/count_polaris_effective_scenarios.py`` recounts.
Placing it there is the install step of the owner's version-tagged sign-off
(``tasks.md``, "After sign-off"), and this module is the builder
``scripts/record_versioned_signoff.py`` runs for it. No digest argument
exists: the sign-off binds the tag ``polaris-dossier-local-agent-mode-v1.0``.

``--check`` verifies the package in either state and writes nothing:

- unapplied: the spec is in ``proposed/`` only; it carries exactly one
  ``## ADDED Requirements`` section naming the four requirements below; a
  scratch copy of the composition with it installed composes under both of
  the recount tool's parsers; the status page's figure equals the recount of
  the tree as it stands; and each package file that cites the proposed path
  in full, or as the short ``proposed/…`` span, still does (the install
  rewrites exactly those citations);
- applied: the spec is in ``specs/`` only, with the same shape; the status
  page's figure equals the recount, which composes the four requirements;
  its "without" figure equals the recount of the composition without the
  installed spec; and no file in either package directory cites the
  proposed path, in full or as the short span.

The CLI writes nothing. The sign-off recorder
(``record_versioned_signoff.py --record``) is the one writer: it verifies
the reviewed bytes, calls ``apply()``, and writes the sign-off record the
status sentence links to. An install without that record would leave a
tree no tool can record (R-364-2 Finding 2), so ``--apply`` is not offered
here. ``apply()`` refuses unless the unapplied package verifies; then
it moves the spec, removes the emptied ``proposed/`` directories, rewrites
the full-path citations, and rewrites the status page's figure as two
figures: the composition without the addition, and the effective
composition with it, naming the installed path and the v1.0 sign-off
record. The review brief keeps the path its reviews read, unquoted and
dated by the sign-off; a short ``proposed/polaris-generation/spec.md``
code span is prose about the move, so the install unquotes it and keeps the
words (CG-1b resolves it only while another change still has a
``proposed/`` spec, R-365-2 dry run). A later install that
changes the composition (the narrative profile's, in
``install_redis_sitting.py``) must rewrite both figures, which
``refigure()`` does. A candidate commit, review or merge performs no owner
act.

Before #353 merges the change directory is absent; ``--check`` then reports
the package not present and passes, unless a sign-off record for it exists.

``--selftest`` runs a mutation fixture per predicate in temporary trees.
"""

from __future__ import annotations

import argparse
import pathlib
import re
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))
import count_polaris_effective_scenarios as counter  # noqa: E402

CHANGE = pathlib.Path("openspec/changes/polaris-dossier-local-agent-mode")
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode"
)
KEY = "polaris-dossier-local-agent-mode"
PROPOSED_SPEC = CHANGE / "proposed/polaris-generation/spec.md"
INSTALLED_SPEC = CHANGE / "specs/polaris-generation/spec.md"
STATUS = pathlib.Path(counter.STATUS_PAGE_REL)
DECISIONS = pathlib.Path(".syzygy/governance/decisions")
SIGNOFF_RECORD = DECISIONS / "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md"
#: The review brief names the artifact its rounds read; the install keeps
#: that path, unquoted, beside the installed one.
BRIEF = CANDIDATE / "REVIEW-BRIEF.md"
REQUIREMENTS = (
    "Operator-agent authoring mode",
    "Agent brief and mechanically checked draft",
    "Fresh-context review in the operator-agent mode",
    "Self-reported discovery and in-session clarification",
)
#: Package files whose code spans name the proposed path in full. CG-1b
#: requires such a span to resolve, so the install rewrites them.
PATH_CITERS = (CANDIDATE / "REVIEW-BRIEF.md", CANDIDATE / "SEMANTIC-DELTA.md")
#: Package files whose code spans name the short `proposed/…` path, prose about
#: the move. CG-1b resolves a short span as a suffix of any tracked path, so it
#: stays green only while some other change still has a `proposed/` spec (the
#: narrative profile's, until the Redis sitting installs it); the install
#: unquotes them, leaving the words.
SHORT_CITERS = (CANDIDATE / "OWNER-DECISION-PACKET.md", CHANGE / "design.md")
SHORT_SPAN = "`proposed/polaris-generation/spec.md`"
FIGURE_RE = re.compile(r"(\d+) requirements and (\d+) scenarios in the effective composition")
#: The figure ``apply()`` writes for the composition without the addition.
WITHOUT_RE = re.compile(
    r"(\d+) requirements and (\d+) scenarios without the signed-off\s+\[dossier local-agent addition\]")


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


def recount(root: pathlib.Path) -> tuple[int, int, set[str]]:
    """Requirement and scenario totals, and normalized composed names, of a tree."""
    result = counter.build_composition(root)
    names = {counter.normalize_name(name) for name, _count in result.per_requirement.values()}
    return len(result.per_requirement), result.total, names


def _recount_scratch(root: pathlib.Path, files: list[pathlib.Path],
                     spec: bytes | None) -> tuple[int, int, set[str]]:
    with tempfile.TemporaryDirectory(prefix="dossier-recount-") as tmp:
        scratch = pathlib.Path(tmp)
        for path in files:
            rel = path.relative_to(root)
            (scratch / rel).parent.mkdir(parents=True, exist_ok=True)
            (scratch / rel).write_bytes(path.read_bytes())
        if spec is not None:
            (scratch / INSTALLED_SPEC).parent.mkdir(parents=True, exist_ok=True)
            (scratch / INSTALLED_SPEC).write_bytes(spec)
        return recount(scratch)


def recount_installed(root: pathlib.Path) -> tuple[int, int, set[str]]:
    """Recount a scratch copy of the composition with the proposed spec installed."""
    return _recount_scratch(root, counter.composition_inputs(root),
                            (root / PROPOSED_SPEC).read_bytes())


def recount_without(root: pathlib.Path) -> tuple[int, int, set[str]]:
    """The historical predecessor counterfactual, before the dependent v2.0.

    Removing requirements033–036 also removes the amendment's predecessors;
    this deliberately projects the earlier composition, without its adoption.
    """
    files = [p for p in counter.discover_composition_files(root)
             if p.relative_to(root) != INSTALLED_SPEC]
    return _recount_scratch(root, files, None)


def refigure(root: pathlib.Path, text: str) -> str:
    """The status text with both figures following the recount of ``root``.

    For an install that changes the composition after this one: rewriting
    only the effective-composition digits leaves the "without" figure stale.
    """
    with_, without = FIGURE_RE.findall(text), WITHOUT_RE.findall(text)
    if len(with_) != 1 or len(without) != 1:
        raise Refusal(f"{STATUS}: expected one figure of each kind, found "
                      f"{len(with_)} effective and {len(without)} without")
    reqs, scenarios, _n = recount(root)
    breqs, bscenarios, _n = recount_without(root)
    text = FIGURE_RE.sub(f"{reqs} requirements and {scenarios} scenarios in the effective composition",
                         text)
    return WITHOUT_RE.sub(lambda m: m.group(0).replace(
        f"{m.group(1)} requirements and {m.group(2)} scenarios",
        f"{breqs} requirements and {bscenarios} scenarios", 1), text)


def status_figure(root: pathlib.Path) -> tuple[int, int]:
    return counter.effective_status_assertion(root)


def figure_paragraph(text: str) -> str:
    """The status page's paragraph or list item that carries the figure."""
    m = FIGURE_RE.search(text)
    if m is None:
        # Both screening figures share the same specification links.
        prefix = counter.SCREENING_STATUS_PREFIXES[0]
        m = re.search(r"^[ \t]*" + re.escape(prefix), text, flags=re.M)
    if m is None:
        return ""
    start = max(text.rfind("\n\n", 0, m.start()),
                *(text.rfind(f"\n{indent}- ", 0, m.start()) for indent in ("", "  ", "    ")))
    return text[start + 1:m.end()]


def check(root: pathlib.Path = ROOT, signed: bool = True) -> list[str]:
    current = state(root)
    if current == "absent":
        signed = sorted(p.name for p in (root / DECISIONS).glob(
            "POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v*.md")) if (root / DECISIONS).is_dir() else []
        return [f"the change directory is absent but {signed} records a sign-off"] if signed else []
    if current not in ("unapplied", "applied"):
        return [f"the spec is in {current} of proposed/ and specs/"]
    spec = PROPOSED_SPEC if current == "unapplied" else INSTALLED_SPEC
    findings = spec_findings((root / spec).read_text(encoding="utf-8"), spec.as_posix())
    if findings:
        return findings
    try:
        reqs, scenarios, _names = recount(root)
        if status_figure(root) != (reqs, scenarios):
            findings.append(f"{STATUS} figure {status_figure(root)} differs from the recount "
                            f"{(reqs, scenarios)}")
        if (current == "applied" and INSTALLED_SPEC.as_posix() not in figure_paragraph(
                (root / STATUS).read_text(encoding="utf-8"))):
            findings.append(f"{STATUS}: the figure's paragraph does not name "
                            f"{INSTALLED_SPEC.as_posix()}, so it reads as the two-file composition")
        without = WITHOUT_RE.findall((root / STATUS).read_text(encoding="utf-8"))
        if current == "unapplied" and without:
            findings.append(f"{STATUS}: a figure without the dossier addition before it is installed")
        if current == "applied":
            if len(without) != 1:
                findings.append(f"{STATUS}: expected one figure without the dossier addition, "
                                f"found {len(without)}")
            elif (int(without[0][0]), int(without[0][1])) != recount_without(root)[:2]:
                findings.append(f"{STATUS} figure without the addition "
                                f"{(int(without[0][0]), int(without[0][1]))} differs from the recount "
                                f"{recount_without(root)[:2]}")
        if current == "unapplied":
            _r, _s, names = recount_installed(root)
        else:
            names = _names
        missing = {counter.normalize_name(n) for n in REQUIREMENTS} - names
        if missing:
            findings.append(f"the composition does not carry {sorted(missing)}")
    except (counter.ScenarioCountError, Refusal, OSError) as exc:
        findings.append(str(exc))
    full = f"`{PROPOSED_SPEC.as_posix()}`"
    for citer in PATH_CITERS:
        text = (root / citer).read_text(encoding="utf-8")
        if current == "unapplied" and full not in text:
            findings.append(f"{citer}: does not cite {full}; the install would rewrite nothing")
    for citer in SHORT_CITERS:
        if current == "unapplied" and SHORT_SPAN not in (root / citer).read_text(encoding="utf-8"):
            findings.append(f"{citer}: does not cite {SHORT_SPAN}; the install would unquote nothing")
    if current == "applied":
        # Every package file, not only the listed citers: a span left anywhere
        # resolves only while another change keeps a `proposed/` spec. The
        # change's union is generated: `--regenerate` replaces it in the same
        # commit, after the recorder's check, and R4 checks it.
        for directory in (CANDIDATE, CHANGE):
            for path in sorted((root / directory).rglob("*.md")):
                if path == root / CHANGE / "GOVERNING-DEPENDENCIES.md":
                    continue
                text = path.read_text(encoding="utf-8")
                for span in (full, SHORT_SPAN):
                    if span in text:
                        findings.append(f"{path.relative_to(root)}: still cites {span}")
    if current == "applied" and brief_note() not in (root / BRIEF).read_text(encoding="utf-8"):
        findings.append(f"{BRIEF}: does not keep the path its reviews read")
    if current == "applied" and signed:
        # Signed or unsigned: the installed bytes must be the latest recorded
        # sign-off's (v1.0's alone, or v1.0 plus the v1.1 patches as recorded).
        # The v1.1 builder skips this (``signed=False``) while it applies,
        # before the recorder writes the v1.1 record.
        import build_polaris_dossier_local_agent_mode_v1_1 as v11
        findings += v11.signed_findings(root)
    return findings


def brief_note() -> str:
    return (f" (installed there by the v1.0 sign-off, whose record gives the date; "
            f"the reviews read it at {PROPOSED_SPEC.as_posix()})")


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
    before = recount(root)
    src, dst = root / PROPOSED_SPEC, root / INSTALLED_SPEC
    dst.parent.mkdir(parents=True, exist_ok=True)
    shutil.move(str(src), str(dst))
    for leftover in (src.parent, src.parent.parent):
        if leftover.is_dir() and not any(leftover.iterdir()):
            leftover.rmdir()
    full, installed = f"`{PROPOSED_SPEC.as_posix()}`", f"`{INSTALLED_SPEC.as_posix()}`"
    for citer in PATH_CITERS:
        path = root / citer
        new = installed + (brief_note() if citer == BRIEF else "")
        path.write_text(path.read_text(encoding="utf-8").replace(full, new), encoding="utf-8")
    for citer in SHORT_CITERS:
        path = root / citer
        path.write_text(path.read_text(encoding="utf-8").replace(SHORT_SPAN, SHORT_SPAN.strip("`")),
                        encoding="utf-8")
    reqs, scenarios, _names = recount(root)
    status = root / STATUS
    text = status.read_text(encoding="utf-8")
    figure = FIGURE_RE.search(text)
    assert figure is not None  # check() required exactly one
    status.write_text(text.replace(figure.group(0), (
        f"{before[0]} requirements and {before[1]} scenarios without the signed-off\n"
        f"    [dossier local-agent addition]({INSTALLED_SPEC.as_posix()})\n"
        f"    ([sign-off record]({SIGNOFF_RECORD.as_posix()})), and\n"
        f"    {reqs} requirements and {scenarios} scenarios in the effective composition with it")),
        encoding="utf-8")
    after = check(root)
    if after:
        print("FAILED after apply: " + " | ".join(after))
        return 1
    print(f"installed {installed}; {STATUS} now reads {reqs} requirements and {scenarios} scenarios")
    return 0


# --- selftest ---------------------------------------------------------------

def _req(name: str, scenarios: int) -> str:
    return f"### Requirement: {name}\n\nText.\n\n" + "".join(
        f"#### Scenario: s{i}\n\n- WHEN x\n- THEN y\n\n" for i in range(scenarios))


def _fixture(root: pathlib.Path, *, dossier: str | None = None, figure: str = "2 requirements and 3 scenarios",
             citers: bool = True) -> None:
    def write(rel: pathlib.Path | str, text: str) -> None:
        (root / rel).parent.mkdir(parents=True, exist_ok=True)
        (root / rel).write_text(text, encoding="utf-8")
    write("openspec/changes/base/specs/polaris-generation/spec.md",
          "## ADDED Requirements\n\n" + _req("Alpha", 1) + _req("Beta", 1))
    write("openspec/changes/overlay/specs/polaris-generation/spec.md",
          "## MODIFIED Requirements\n\n" + _req("Beta", 2))
    write(STATUS, f"Polaris carries {figure} in the effective composition.\n")
    write(PROPOSED_SPEC, dossier if dossier is not None else
          "## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in REQUIREMENTS))
    for citer in PATH_CITERS:
        write(citer, f"Subject: `{PROPOSED_SPEC.as_posix()}`\n" if citers else "Subject: elsewhere\n")
    for citer in SHORT_CITERS:
        write(citer, f"It moves {SHORT_SPAN} to `specs/`.\n" if citers else "Moves it.\n")


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
        results.append(("status figure follows the recount",
                        status_figure(root) == (6, 7)))
        results.append(("full-path citations rewritten",
                        all(INSTALLED_SPEC.as_posix() in (root / c).read_text() for c in PATH_CITERS)))
        results.append(("short citations unquoted, words kept",
                        all((root / c).read_text() == "It moves proposed/polaris-generation/spec.md to `specs/`.\n"
                            for c in SHORT_CITERS)))
        results.append(("second apply refuses", quiet(apply, root) == 2))

    def refused(name: str, mutate=None, expect: str = "", **fixture) -> None:
        """Refused, nothing written, and (when given) by the predicate whose finding says `expect`."""
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

    refused("a fifth requirement",
            dossier="## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in (*REQUIREMENTS, "Extra")))
    refused("a requirement missing",
            dossier="## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in REQUIREMENTS[:3]))
    refused("a MODIFIED section in the candidate",
            dossier="## ADDED Requirements\n\n" + "".join(_req(n, 1) for n in REQUIREMENTS)
            + "## MODIFIED Requirements\n\n" + _req("Beta", 1),
            expect="expected exactly one ADDED section")
    def collide(root: pathlib.Path) -> None:
        base = root / "openspec/changes/base/specs/polaris-generation/spec.md"
        base.write_text(base.read_text() + _req(REQUIREMENTS[0], 1))
        (root / STATUS).write_text("Polaris carries 3 requirements and 4 scenarios in the effective composition.\n")
    refused("a name colliding with the composition", mutate=collide)
    refused("status figure stale before install", figure="2 requirements and 4 scenarios")
    refused("a citer no longer naming the proposed path", citers=False)
    refused("spec in both proposed/ and specs/", mutate=lambda root: (
        (root / INSTALLED_SPEC).parent.mkdir(parents=True),
        shutil.copy(root / PROPOSED_SPEC, root / INSTALLED_SPEC)), expect="in both of")
    refused("spec in neither", mutate=lambda root: (root / PROPOSED_SPEC).unlink())

    # The parsers agree on every input the fixtures can build, so the
    # agreement predicate is pinned by making one of them disagree.
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
        quiet(apply, root)
        status = (root / STATUS).read_text()
        results.append(("applied: the status page gives both figures and names the addition",
                        "2 requirements and 3 scenarios without the signed-off" in status
                        and INSTALLED_SPEC.as_posix() in figure_paragraph(status)
                        and SIGNOFF_RECORD.as_posix() in status))
        (root / STATUS).write_text(status.replace(INSTALLED_SPEC.as_posix(), "elsewhere"))
        results.append(("applied: a figure paragraph not naming the installed spec fails",
                        any("does not name" in f for f in check(root))))
        (root / STATUS).write_text(f"See {INSTALLED_SPEC.as_posix()}.\n\n"
                                   + status.replace(INSTALLED_SPEC.as_posix(), "elsewhere"))
        results.append(("applied: naming the installed spec outside the figure's paragraph fails",
                        any("does not name" in f for f in check(root))))

    profile = pathlib.Path("openspec/changes/profile/specs/polaris-generation/spec.md")

    def add_profile(root: pathlib.Path) -> None:
        (root / profile).parent.mkdir(parents=True, exist_ok=True)
        (root / profile).write_text("## ADDED Requirements\n\n" + _req("Gamma", 2))

    def digits_only(root: pathlib.Path) -> None:
        """The narrative-profile installer's rewrite before R-364-2: the second figure only."""
        reqs, scenarios, _n = recount(root)
        text = (root / STATUS).read_text()
        (root / STATUS).write_text(FIGURE_RE.sub(
            f"{reqs} requirements and {scenarios} scenarios in the effective composition", text))

    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        quiet(apply, root)
        status = (root / STATUS).read_text()
        (root / STATUS).write_text(status.replace("2 requirements and 3 scenarios without",
                                                  "2 requirements and 4 scenarios without"))
        results.append(("applied: a stale figure without the addition fails",
                        any("without the addition (2, 4) differs" in f for f in check(root))))
        (root / STATUS).write_text(status.replace(" without the signed-off", " without the signed off"))
        results.append(("applied: no figure without the addition fails",
                        any("found 0" in f for f in check(root))))
        (root / STATUS).write_text(status)
        add_profile(root)
        digits_only(root)
        results.append(("profile after dossier, digits only: the stale figure without the addition fails",
                        status_figure(root) == (7, 9)
                        and any("without the addition (2, 3) differs" in f for f in check(root))))
        (root / STATUS).write_text(refigure(root, (root / STATUS).read_text()))
        results.append(("profile after dossier, refigured: both figures follow the recount",
                        check(root) == [] and "3 requirements and 5 scenarios without"
                        in (root / STATUS).read_text()))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root, figure="3 requirements and 5 scenarios")
        add_profile(root)
        results.append(("profile before dossier: apply composes it into both figures",
                        quiet(apply, root) == 0 and check(root) == []
                        and status_figure(root) == (7, 9)
                        and "3 requirements and 5 scenarios without" in (root / STATUS).read_text()))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        (root / STATUS).write_text((root / STATUS).read_text() + "2 requirements and 3 scenarios "
                                   "without the signed-off\n[dossier local-agent addition](x)\n")
        results.append(("unapplied: a figure without the addition fails",
                        any("before it is installed" in f for f in check(root))))
    with contextlib.redirect_stderr(io.StringIO()):
        try:
            main(["--apply"])
            offered = True
        except SystemExit:
            offered = False
    results.append(("the CLI offers no --apply; the sign-off recorder is the one writer", not offered))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        quiet(apply, root)
        brief = root / BRIEF
        results.append(("applied: the brief keeps the path its reviews read, unquoted",
                        brief_note() in brief.read_text()
                        and f"`{PROPOSED_SPEC.as_posix()}`" not in brief.read_text()))
        brief.write_text(brief.read_text().replace(brief_note(), ""))
        results.append(("applied: a brief without that note fails",
                        any("does not keep" in f for f in check(root))))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        shutil.rmtree(root / CHANGE)
        results.append(("absent change directory: nothing to verify", check(root) == []))
        (root / SIGNOFF_RECORD).parent.mkdir(parents=True)
        (root / SIGNOFF_RECORD).write_text("record\n")
        results.append(("absent change directory with a sign-off record fails",
                        any("records a sign-off" in f for f in check(root))))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        quiet(apply, root)
        (root / STATUS).write_text("Polaris carries 2 requirements and 3 scenarios in the effective composition.\n")
        results.append(("applied: a stale status figure fails", not applied(root)))
        quiet(apply, root)
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        quiet(apply, root)
        citer = root / PATH_CITERS[0]
        citer.write_text(citer.read_text() + f"`{PROPOSED_SPEC.as_posix()}`\n")
        results.append(("applied: a remaining full-path citation fails", not applied(root)))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        quiet(apply, root)
        other = root / CHANGE / "tasks.md"
        other.write_text(f"Then {SHORT_SPAN} moves.\n")
        results.append(("applied: a short span in any package file fails",
                        any("tasks.md: still cites" in f for f in check(root))))
    with tempfile.TemporaryDirectory() as t:
        root = pathlib.Path(t)
        _fixture(root)
        (root / SHORT_CITERS[1]).write_text("Moves it.\n")
        results.append(("unapplied: a short citer without the span fails",
                        any("would unquote nothing" in f for f in check(root))))

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
    findings = check(ROOT)
    if findings:
        print("FAILED")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    print("OK: the change directory is not present (PR #353 not merged); nothing to verify"
          if state(ROOT) == "absent" else f"OK: the package verifies ({state(ROOT)})")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
