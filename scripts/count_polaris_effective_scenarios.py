#!/usr/bin/env python3
"""Recount the Polaris generation specification's effective scenario total.

Owner direction: `.syzygy/governance/decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md`
Sec 5, "Before sign-off, a small script, with its own test, recounts the
effective composition's full scenario total from scratch, so the number the
page asserts is checked rather than carried forward." This is that script,
written for bead `syzygy-dov.23`.

It never edits any governed file. It reads the tree (or, with
`--with-proposed`, a scratch copy of the tree with one candidate package's
`proposed/*.patch` files applied) and independently recomputes, by two
different parsing methods, the scenario total the Polaris generation
capability's effective composition carries.

## What "effective composition" means here

AGENTS.md's Architecture note: "Polaris generation requirement lookup
composes the original `openspec/changes/polaris-manifesto-generation/` with
the explicit `polaris-manifesto-understanding-amendment/` overlay." This
script does not hard-code those two directory names. It globs every
`openspec/changes/*/specs/polaris-generation/spec.md` file, classifies each
by which OpenSpec delta sections it carries (a file with only an
`## ADDED Requirements` section is the base; a file carrying any
`MODIFIED`/`REMOVED`/`RENAMED` section is an overlay applied on top of the
base), and requires exactly one base and exactly one overlay -- refusing to
guess an order if a second overlay ever appears (verification rule 9: an
absence/uniqueness claim needs an enumerated sweep, not an assumption).

A further file with only `## ADDED Requirements` (a change adopted after the
overlay that adds requirements and modifies none) is an addition, applied
after the overlay. The base is then derived, not named: it is the one
ADDED-only file that carries every requirement the overlay MODIFIES, REMOVES
or RENAMES. If none or more than one does, the script refuses.

The explicit declared-source version2.0 amendment follows those additions
only when its existing adoption record, D10 record and reviewed bytes verify.
Its five MODIFIED requirements are counted independently by this tool's two
parsers, with046's declared name change applied before replacement. Invalid
binding inputs refuse counting; a wholly absent historical amendment is inactive.

The explicit URL declared-source version2.1 amendment follows version2.0
when its own adoption binding verifies. Each parser counts its four replacements
and one addition against that predecessor.

The figure-homes-and-fit version2.2 amendment follows them when its own
adoption binding verifies; each parser counts its one replacement (034).

The derived-observed-facts version2.3 amendment follows version2.2 when its
own adoption binding verifies; each parser counts its one replacement (034).

The ledger-packs-thesis version2.4 amendment follows version2.3 when its own
adoption binding verifies; each parser counts its one replacement (034).

The figure-kinds version2.5 amendment follows version2.4 when its own
adoption binding verifies; each parser counts its one replacement (034).

The manifest-recognizers version2.7 amendment follows version2.5 when its own
adoption binding verifies; each parser counts its one replacement (034).

The spec-repairs version2.8 amendment follows version2.7 when its own
adoption binding verifies; each parser counts its one replacement (034).

The computed-maps version2.9 amendment follows version2.8 when its own
adoption binding verifies; each parser counts its one replacement (034).

The record-bounds version2.10 amendment follows version2.9 when its own
adoption binding verifies; each parser counts its one replacement (034).

The spec-corrections version2.11 amendment follows version2.10 when its own
adoption binding verifies; each parser counts its one replacement (034).

The coverage-precheck version2.12 amendment follows version2.11 when its own
adoption binding verifies; each parser counts its one replacement (034).

The infrastructure-recognizers version2.14 amendment follows version2.12 when its
own adoption binding verifies; each parser counts its one replacement (034).

The index-and-task-routes version2.15 amendment follows version2.14 when its own
adoption binding verifies; each parser counts its one replacement (034).

The verify-text version2.21 amendment replaces 033 after the run-tree
read-bounds version2.18 when its own adoption binding verifies; each parser
counts its one replacement (033).

The declared-source reach version2.6 amendment follows version2.0 when its own
adoption binding verifies; each parser counts its one replacement (046).

The declared-source re-admission version2.13 amendment follows version2.6 when
its own adoption binding verifies; each parser counts its one replacement (046).

## Overlay semantics

Applied in the order the real OpenSpec tool uses at archive time (confirmed
2026-09-26 against `Fission-AI/OpenSpec`'s own
`openspec/specs/openspec-conventions/spec.md`, "Archiving changes with
deltas": RENAMED, then REMOVED, then MODIFIED, then ADDED), matching by
whitespace/case-normalized requirement name:

- RENAMED: `- FROM: \\`### Requirement: X\\`` / `- TO: \\`### Requirement: Y\\``
  renames a requirement already in the composition; its scenario count is
  carried over unchanged.
- REMOVED: drops a requirement (and every scenario under it) from the
  composition entirely.
- MODIFIED: REPLACES a requirement's entire scenario count with the
  overlay's version. It does not add to the predecessor's count -- this is
  the exact mistake this script exists to catch (see the "MODIFIED
  double-count" selftest fixture below).
- ADDED: inserts a new requirement. Colliding with an existing name is a
  fatal finding, not a silent merge.

Any dangling reference (a MODIFIED/REMOVED/RENAMED-FROM naming a requirement
absent from the composition so far, or an ADDED/RENAMED-TO colliding with an
existing one) is a fatal finding: this script fails closed rather than
guessing.

## Two independent methods (verification rule 2)

`parse_regex()` locates section and requirement boundaries with compiled
regular expressions. `parse_manual()` is a hand-written line-by-line state
machine that uses no regular expressions at all. Both run over the exact
same bytes; `build_composition()` composes each parser's output
independently and requires the two composed results to agree member-for-
member before trusting either one.

Usage:
  python3 scripts/count_polaris_effective_scenarios.py
  python3 scripts/count_polaris_effective_scenarios.py --check
  python3 scripts/count_polaris_effective_scenarios.py --check --expect 178
  python3 scripts/count_polaris_effective_scenarios.py --with-proposed \\
      .syzygy/governance/contracts/candidates/polaris-edit-repair-deletion-scenario --check
  python3 scripts/count_polaris_effective_scenarios.py --selftest
"""
from __future__ import annotations

import argparse
import contextlib
import re
import shutil
import subprocess
import sys
import tempfile
from dataclasses import dataclass, field
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
SPEC_CAPABILITY = "polaris-generation"
STATUS_PAGE_REL = "PROJECT-STATUS.md"

SECTION_KINDS = ("ADDED", "MODIFIED", "REMOVED", "RENAMED")
SECTION_HEADER_RE = re.compile(r"^## (ADDED|MODIFIED|REMOVED|RENAMED) Requirements[ \t]*$", re.M)
REQ_HEADER_RE = re.compile(r"^### Requirement: (.+?)[ \t]*$", re.M)
SCENARIO_RE = re.compile(r"^#### Scenario:", re.M)
RENAME_FROM_RE = re.compile(r"^-\s*FROM:\s*`### Requirement:\s*(.+?)`\s*$", re.M)
RENAME_TO_RE = re.compile(r"^-\s*TO:\s*`### Requirement:\s*(.+?)`\s*$", re.M)
STATUS_FIGURE_RE = re.compile(rb"(\d+) requirements and (\d+) scenarios in the effective composition")


class ScenarioCountError(RuntimeError):
    """Raised on any check failure; the CLI prints str(e) and exits 1."""


def normalize_name(name: str) -> str:
    return " ".join(name.split()).casefold()


@dataclass
class ReqEntry:
    name: str
    scenario_count: int


@dataclass
class FileDelta:
    added: list[ReqEntry] = field(default_factory=list)
    modified: list[ReqEntry] = field(default_factory=list)
    removed: list[str] = field(default_factory=list)
    renamed: list[tuple[str, str]] = field(default_factory=list)

    def section_kinds(self) -> set[str]:
        kinds: set[str] = set()
        if self.added:
            kinds.add("ADDED")
        if self.modified:
            kinds.add("MODIFIED")
        if self.removed:
            kinds.add("REMOVED")
        if self.renamed:
            kinds.add("RENAMED")
        return kinds


# --------------------------------------------------------------------------
# Method 1: regex-based structural parser.
# --------------------------------------------------------------------------

def parse_regex(text: str, source: str) -> FileDelta:
    delta = FileDelta()
    section_matches = list(SECTION_HEADER_RE.finditer(text))
    if not section_matches:
        raise ScenarioCountError(f"{source}: no '## ... Requirements' section headers found (method 1)")
    for i, m in enumerate(section_matches):
        kind = m.group(1)
        start = m.end()
        end = section_matches[i + 1].start() if i + 1 < len(section_matches) else len(text)
        body = text[start:end]
        if kind == "RENAMED":
            froms = RENAME_FROM_RE.findall(body)
            tos = RENAME_TO_RE.findall(body)
            if len(froms) != len(tos):
                raise ScenarioCountError(
                    f"{source}: RENAMED section FROM/TO count mismatch ({len(froms)} vs {len(tos)}) (method 1)"
                )
            for old, new in zip(froms, tos):
                delta.renamed.append((old.strip(), new.strip()))
            continue
        req_matches = list(REQ_HEADER_RE.finditer(body))
        for j, rm in enumerate(req_matches):
            rname = rm.group(1).strip()
            rstart = rm.end()
            rend = req_matches[j + 1].start() if j + 1 < len(req_matches) else len(body)
            rbody = body[rstart:rend]
            scount = len(SCENARIO_RE.findall(rbody))
            if kind == "ADDED":
                delta.added.append(ReqEntry(rname, scount))
            elif kind == "MODIFIED":
                delta.modified.append(ReqEntry(rname, scount))
            elif kind == "REMOVED":
                delta.removed.append(rname)
    return delta


# --------------------------------------------------------------------------
# Method 2: manual line-by-line state machine. No regular expressions.
# --------------------------------------------------------------------------

def _extract_backtick_requirement_name(line: str, source: str) -> str:
    first = line.find("`")
    last = line.rfind("`")
    if first == -1 or last == -1 or last <= first:
        raise ScenarioCountError(f"{source}: malformed FROM/TO line (method 2): {line!r}")
    inner = line[first + 1 : last]
    prefix = "### Requirement:"
    if not inner.startswith(prefix):
        raise ScenarioCountError(f"{source}: malformed FROM/TO requirement header (method 2): {inner!r}")
    return inner[len(prefix):].strip()


def parse_manual(text: str, source: str) -> FileDelta:
    delta = FileDelta()
    section: str | None = None
    saw_section = False
    cur_name: str | None = None
    cur_count = 0
    pending_from: str | None = None

    def flush() -> None:
        nonlocal cur_name, cur_count
        if cur_name is not None:
            if section == "ADDED":
                delta.added.append(ReqEntry(cur_name, cur_count))
            elif section == "MODIFIED":
                delta.modified.append(ReqEntry(cur_name, cur_count))
            elif section == "REMOVED":
                delta.removed.append(cur_name)
        cur_name = None
        cur_count = 0

    for raw_line in text.split("\n"):
        line = raw_line.rstrip("\r")
        stripped = line.strip()
        section_label = None
        if line.startswith("## "):
            candidate = line[3:].strip()
            for kind in SECTION_KINDS:
                if candidate == f"{kind} Requirements":
                    section_label = kind
                    break
        if section_label is not None:
            flush()
            section = section_label
            saw_section = True
            pending_from = None
            continue
        if section is None:
            continue
        if line.startswith("### Requirement: "):
            flush()
            cur_name = line[len("### Requirement: "):].strip()
            cur_count = 0
            continue
        if section == "RENAMED":
            if stripped.startswith("- FROM:"):
                pending_from = _extract_backtick_requirement_name(stripped, source)
                continue
            if stripped.startswith("- TO:"):
                if pending_from is None:
                    raise ScenarioCountError(f"{source}: RENAMED TO with no preceding FROM (method 2)")
                to_name = _extract_backtick_requirement_name(stripped, source)
                delta.renamed.append((pending_from, to_name))
                pending_from = None
                continue
            continue
        if stripped.startswith("#### Scenario:"):
            if cur_name is not None and section in ("ADDED", "MODIFIED"):
                cur_count += 1
            continue
    flush()
    if not saw_section:
        raise ScenarioCountError(f"{source}: no '## ... Requirements' section headers found (method 2)")
    return delta


# --------------------------------------------------------------------------
# Composition.
# --------------------------------------------------------------------------

def compose(deltas: list[tuple[str, FileDelta]]) -> dict[str, tuple[str, int]]:
    """deltas: [(source_label, FileDelta), ...], base first, overlays after,
    in application order. Returns {normalized_name: (display_name, count)}.
    Raises ScenarioCountError on any dangling reference or collision --
    never silently drops or double-counts a requirement."""
    composed: dict[str, tuple[str, int]] = {}
    findings: list[str] = []
    for idx, (label, delta) in enumerate(deltas):
        if idx == 0:
            if delta.modified or delta.removed or delta.renamed:
                findings.append(f"{label}: base file carries MODIFIED/REMOVED/RENAMED sections")
            for req in delta.added:
                key = normalize_name(req.name)
                if key in composed:
                    findings.append(f"{label}: duplicate base requirement name {req.name!r}")
                    continue
                composed[key] = (req.name, req.scenario_count)
            continue
        # Overlay application order per the OpenSpec archive convention:
        # RENAMED, REMOVED, MODIFIED, ADDED.
        for old, new in delta.renamed:
            key_old = normalize_name(old)
            if key_old not in composed:
                findings.append(f"{label}: RENAMED FROM {old!r} not found in composition")
                continue
            _display, count = composed.pop(key_old)
            key_new = normalize_name(new)
            if key_new in composed:
                findings.append(f"{label}: RENAMED TO {new!r} collides with an existing requirement")
                composed[key_old] = (_display, count)
                continue
            composed[key_new] = (new, count)
        for name in delta.removed:
            key = normalize_name(name)
            if key not in composed:
                findings.append(f"{label}: REMOVED {name!r} not found in composition")
                continue
            del composed[key]
        for req in delta.modified:
            key = normalize_name(req.name)
            if key not in composed:
                findings.append(f"{label}: MODIFIED {req.name!r} has no predecessor in composition")
                continue
            composed[key] = (req.name, req.scenario_count)  # REPLACE, never add.
        for req in delta.added:
            key = normalize_name(req.name)
            if key in composed:
                findings.append(f"{label}: ADDED {req.name!r} collides with an existing requirement")
                continue
            composed[key] = (req.name, req.scenario_count)
    if findings:
        raise ScenarioCountError("composition findings:\n" + "\n".join(f"  - {f}" for f in findings))
    return composed


def _assert_composed_agree(
    composed_1: dict[str, tuple[str, int]],
    composed_2: dict[str, tuple[str, int]],
    label_1: str,
    label_2: str,
) -> None:
    if composed_1 == composed_2:
        return
    keys_1, keys_2 = set(composed_1), set(composed_2)
    diffs: list[str] = []
    for key in sorted(keys_1 - keys_2):
        diffs.append(f"only in {label_1}: {composed_1[key][0]!r} ({composed_1[key][1]} scenarios)")
    for key in sorted(keys_2 - keys_1):
        diffs.append(f"only in {label_2}: {composed_2[key][0]!r} ({composed_2[key][1]} scenarios)")
    for key in sorted(keys_1 & keys_2):
        if composed_1[key] != composed_2[key]:
            diffs.append(f"{key!r}: {label_1}={composed_1[key]!r} vs {label_2}={composed_2[key]!r}")
    raise ScenarioCountError(
        f"the two counting methods disagree ({label_1} vs {label_2}):\n" + "\n".join(f"  - {d}" for d in diffs)
    )


# --------------------------------------------------------------------------
# Discovery and top-level composition build.
# --------------------------------------------------------------------------

def _added_names(path: Path) -> set[str]:
    text = path.read_text(encoding="utf-8")
    return {normalize_name(r.name) for r in parse_regex(text, str(path)).added}


def _referenced_names(path: Path) -> set[str]:
    """Names an overlay needs to exist already: MODIFIED, REMOVED, RENAMED FROM."""
    d = parse_regex(path.read_text(encoding="utf-8"), str(path))
    return ({normalize_name(r.name) for r in d.modified}
            | {normalize_name(n) for n in d.removed}
            | {normalize_name(old) for old, _new in d.renamed})


def discover_composition_files(root: Path) -> list[Path]:
    pattern = f"openspec/changes/*/specs/{SPEC_CAPABILITY}/spec.md"
    candidates = sorted(root.glob(pattern))
    if not candidates:
        raise ScenarioCountError(f"no spec.md files found under {pattern} (rooted at {root})")
    bases: list[Path] = []
    overlays: list[Path] = []
    for p in candidates:
        text = p.read_text(encoding="utf-8")
        kinds = {m.group(1) for m in SECTION_HEADER_RE.finditer(text)}
        if not kinds:
            raise ScenarioCountError(f"{p}: no recognized '## ... Requirements' section found")
        if kinds & {"MODIFIED", "REMOVED", "RENAMED"}:
            overlays.append(p)
        elif kinds == {"ADDED"}:
            bases.append(p)
        else:
            raise ScenarioCountError(f"{p}: unrecognized section shape {sorted(kinds)}")
    additions: list[Path] = []
    if len(bases) > 1 and len(overlays) == 1:
        # A change that only ADDS requirements, adopted after the base, is an
        # addition and not a second base. The base is derived, never named: it
        # is the one ADDED-only file that carries every requirement the
        # overlay MODIFIES, REMOVES or RENAMES. Exactly one must; more or fewer
        # is ambiguity, and the script refuses to guess.
        needed = _referenced_names(overlays[0])
        holders = [b for b in bases if needed and needed <= _added_names(b)]
        if len(holders) == 1:
            additions = sorted(b for b in bases if b != holders[0])
            bases = holders
    if len(bases) != 1:
        raise ScenarioCountError(
            f"expected exactly one base spec.md under {pattern}, found {len(bases)}: "
            f"{[str(b) for b in bases]}"
        )
    if len(overlays) != 1:
        raise ScenarioCountError(
            f"expected exactly one overlay spec.md under {pattern} (this script refuses to guess "
            f"a composition order for more than one overlay), found {len(overlays)}: "
            f"{[str(o) for o in overlays]}"
        )
    return [bases[0], overlays[0], *additions]


@dataclass
class CompositionResult:
    files: list[str]
    per_file: list[tuple[str, FileDelta, FileDelta]]  # label, method-1 delta, method-2 delta
    per_requirement: dict[str, tuple[str, int]]
    total: int


def declared_source_amendment(root: Path) -> str | None:
    """Verified text, no historical amendment, or an explicit counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.declared_source_binding(root)
    if records or subjects:
        raise ScenarioCountError("declared-source adoption findings:\n" + "\n".join(records + subjects))
    return text


def url_source_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.url_source_binding(root)
    if records or subjects:
        raise ScenarioCountError("URL declared-source adoption findings:\n" + "\n".join(records + subjects))
    return text


def figure_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.figure_binding(root)
    if records or subjects:
        raise ScenarioCountError("figure homes and fit adoption findings:\n" + "\n".join(records + subjects))
    return text


def derived_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.derived_binding(root)
    if records or subjects:
        raise ScenarioCountError("derived observed facts adoption findings:\n" + "\n".join(records + subjects))
    return text


def ledger_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.ledger_binding(root)
    if records or subjects:
        raise ScenarioCountError("ledger packs thesis adoption findings:\n" + "\n".join(records + subjects))
    return text


def kinds_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.kinds_binding(root)
    if records or subjects:
        raise ScenarioCountError("figure kinds adoption findings:\n" + "\n".join(records + subjects))
    return text


def manifests_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.manifests_binding(root)
    if records or subjects:
        raise ScenarioCountError("manifest recognizers adoption findings:\n" + "\n".join(records + subjects))
    return text


def repairs_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.repairs_binding(root)
    if records or subjects:
        raise ScenarioCountError("spec repairs adoption findings:\n" + "\n".join(records + subjects))
    return text


def maps_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.maps_binding(root)
    if records or subjects:
        raise ScenarioCountError("computed maps adoption findings:\n" + "\n".join(records + subjects))
    return text


def bounds_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.bounds_binding(root)
    if records or subjects:
        raise ScenarioCountError("record bounds adoption findings:\n" + "\n".join(records + subjects))
    return text


def corr_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.corr_binding(root)
    if records or subjects:
        raise ScenarioCountError("spec corrections adoption findings:\n" + "\n".join(records + subjects))
    return text


def coverage_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.coverage_binding(root)
    if records or subjects:
        raise ScenarioCountError("coverage precheck adoption findings:\n" + "\n".join(records + subjects))
    return text


def infra_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.infra_binding(root)
    if records or subjects:
        raise ScenarioCountError("infrastructure recognizers adoption findings:\n" + "\n".join(records + subjects))
    return text


def findpages_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.findpages_binding(root)
    if records or subjects:
        raise ScenarioCountError("index and task routes adoption findings:\n" + "\n".join(records + subjects))
    return text


def subsec_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.subsec_binding(root)
    if records or subjects:
        raise ScenarioCountError("page subsections adoption findings:\n" + "\n".join(records + subjects))
    return text


def hero_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.hero_binding(root)
    if records or subjects:
        raise ScenarioCountError("hero figure adoption findings:\n" + "\n".join(records + subjects))
    return text


def model_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.model_binding(root)
    if records or subjects:
        raise ScenarioCountError("system model adoption findings:\n" + "\n".join(records + subjects))
    return text


def edit_account_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.edit_account_binding(root)
    if records or subjects:
        raise ScenarioCountError("edit and repair accounting adoption findings:\n" + "\n".join(records + subjects))
    return text


def cont_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.cont_binding(root)
    if records or subjects:
        raise ScenarioCountError("containment figure adoption findings:\n" + "\n".join(records + subjects))
    return text


def readers_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.readers_binding(root)
    if records or subjects:
        raise ScenarioCountError("reader's edition adoption findings:\n" + "\n".join(records + subjects))
    return text


def reltype_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.reltype_binding(root)
    if records or subjects:
        raise ScenarioCountError("relation types adoption findings:\n" + "\n".join(records + subjects))
    return text


def readmit_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.readmit_binding(root)
    if records or subjects:
        raise ScenarioCountError("declared-source re-admission adoption findings:\n" + "\n".join(records + subjects))
    return text


def reach_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption
    text, records, subjects = adoption.reach_binding(root)
    if records or subjects:
        raise ScenarioCountError("declared-source reach adoption findings:\n" + "\n".join(records + subjects))
    return text


def raw_read_amendment(root: Path) -> str | None:
    import check_spec_reconciliation as adoption

    text, records, subjects = adoption.raw_read_binding(root)
    if records or subjects:
        raise ScenarioCountError("\n".join(records + subjects))
    return text


def treeread_amendment(root: Path) -> str | None:
    import check_spec_reconciliation as adoption

    text, records, subjects = adoption.treeread_binding(root)
    if records or subjects:
        raise ScenarioCountError("\n".join(records + subjects))
    return text


def verify_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption

    text, records, subjects = adoption.verify_binding(root)
    if records or subjects:
        raise ScenarioCountError("verify text adoption findings:\n" + "\n".join(records + subjects))
    return text


def build_composition(root: Path) -> CompositionResult:
    import check_spec_reconciliation as adoption
    sources = [(path.relative_to(root).as_posix(), path.read_text(encoding="utf-8"))
               for path in discover_composition_files(root)]
    for label, text in ((adoption.DECLARED_SOURCE_SPEC, declared_source_amendment(root)),
                        (adoption.URL_SOURCE_SPEC, url_source_amendment(root)),
                        (adoption.FIGURE_SPEC, figure_amendment(root)),
                        (adoption.DERIVED_SPEC, derived_amendment(root)),
                        (adoption.LEDGER_SPEC, ledger_amendment(root)),
                        (adoption.KINDS_SPEC, kinds_amendment(root)),
                        (adoption.REACH_SPEC, reach_amendment(root)),
                        (adoption.READMIT_SPEC, readmit_amendment(root)),
                        (adoption.MANIFESTS_SPEC, manifests_amendment(root)),
                        (adoption.REPAIRS_SPEC, repairs_amendment(root)),
                        (adoption.MAPS_SPEC, maps_amendment(root)),
                        (adoption.BOUNDS_SPEC, bounds_amendment(root)),
                        (adoption.CORR_SPEC, corr_amendment(root)),
                        (adoption.COVERAGE_SPEC, coverage_amendment(root)),
                        (adoption.INFRA_SPEC, infra_amendment(root)),
                        (adoption.FINDPAGES_SPEC, findpages_amendment(root)),
                        (adoption.SUBSEC_SPEC, subsec_amendment(root)),
                        (adoption.RAW_READ_SPEC, raw_read_amendment(root)),
                        (adoption.TREEREAD_SPEC, treeread_amendment(root)),
                        (adoption.VERIFY_SPEC, verify_amendment(root)),
                        (adoption.RELTYPE_SPEC, reltype_amendment(root)),
                        (adoption.HERO_SPEC, hero_amendment(root)),
                        (adoption.READERS_SPEC, readers_amendment(root)),
                        (adoption.CONT_SPEC, cont_amendment(root)),
                        (adoption.MODEL_SPEC, model_amendment(root)),
                        (adoption.EDIT_ACCOUNT_SPEC, edit_account_amendment(root))):
        if text is not None:
            sources.append((label, text))

    per_file: list[tuple[str, FileDelta, FileDelta]] = []
    deltas_1: list[tuple[str, FileDelta]] = []
    deltas_2: list[tuple[str, FileDelta]] = []
    for label, text in sources:
        d1 = parse_regex(text, label)
        d2 = parse_manual(text, label)
        if label == adoption.DECLARED_SOURCE_SPEC:
            # REQ-046 keeps its identity but changes its name in version2.0.
            rename = ("Launch-time consent", "Declared local-source admission")
            deltas_1.append((label + " (REQ-046 rename)", FileDelta(renamed=[rename])))
            deltas_2.append((label + " (REQ-046 rename)", FileDelta(renamed=[rename])))
        per_file.append((label, d1, d2))
        deltas_1.append((label, d1))
        deltas_2.append((label, d2))
    composed_1 = compose(deltas_1)
    composed_2 = compose(deltas_2)
    _assert_composed_agree(composed_1, composed_2, "method 1 (regex)", "method 2 (manual scan)")
    total = sum(count for _name, count in composed_1.values())
    return CompositionResult(
        files=[label for label, _d1, _d2 in per_file],
        per_file=per_file,
        per_requirement=composed_1,
        total=total,
    )


def composition_inputs(root: Path) -> list[Path]:
    """Composition files plus the adoption inputs a projected install must keep."""
    import check_spec_reconciliation as adoption
    declared_source_amendment(root)
    url_source_amendment(root)
    figure_amendment(root)
    derived_amendment(root)
    ledger_amendment(root)
    kinds_amendment(root)
    reach_amendment(root)
    readmit_amendment(root)
    manifests_amendment(root)
    repairs_amendment(root)
    maps_amendment(root)
    bounds_amendment(root)
    corr_amendment(root)
    coverage_amendment(root)
    infra_amendment(root)
    findpages_amendment(root)
    subsec_amendment(root)
    raw_read_amendment(root)
    treeread_amendment(root)
    verify_amendment(root)
    reltype_amendment(root)
    hero_amendment(root)
    readers_amendment(root)
    cont_amendment(root)
    model_amendment(root)
    edit_account_amendment(root)
    paths = adoption.declared_source_inputs(root) | {
        adoption.URL_SOURCE_REPLACEMENTS, *adoption.URL_SOURCE_SUBJECTS,
        *adoption.URL_SOURCE_RFC_PATHS, *adoption.FIGURE_SUBJECTS, *adoption.DERIVED_SUBJECTS,
        *adoption.LEDGER_SUBJECTS, *adoption.KINDS_SUBJECTS, *adoption.MANIFESTS_SUBJECTS,
        *adoption.REPAIRS_SUBJECTS, *adoption.MAPS_SUBJECTS, *adoption.BOUNDS_SUBJECTS, *adoption.CORR_SUBJECTS,
        *adoption.COVERAGE_SUBJECTS, *adoption.INFRA_SUBJECTS, *adoption.FINDPAGES_SUBJECTS, *adoption.SUBSEC_SUBJECTS, *adoption.RELTYPE_SUBJECTS, *adoption.HERO_SUBJECTS, *adoption.READERS_SUBJECTS, *adoption.CONT_SUBJECTS, *adoption.MODEL_SUBJECTS,
        *adoption.REACH_SUBJECTS, *adoption.READMIT_SUBJECTS, *adoption.RAW_READ_SUBJECTS, *adoption.TREEREAD_SUBJECTS,
        *adoption.VERIFY_SUBJECTS, *adoption.EDIT_ACCOUNT_SUBJECTS,
    }
    files = discover_composition_files(root)
    files += [root / rel for rel in sorted(paths) if (root / rel).is_file()]
    return list(dict.fromkeys(files))


def read_status_assertion(root: Path) -> tuple[int, int]:
    path = root / STATUS_PAGE_REL
    if not path.is_file():
        raise ScenarioCountError(f"missing {STATUS_PAGE_REL} at {root}")
    data = path.read_bytes()
    m = STATUS_FIGURE_RE.search(data)
    if not m:
        raise ScenarioCountError(
            f"could not find 'N requirements and N scenarios in the effective composition' "
            f"sentence in {path}"
        )
    return int(m.group(1)), int(m.group(2))


# --------------------------------------------------------------------------
# --with-proposed: apply a candidate package's proposed/*.patch files in a
# scratch copy. The tracked tree is never touched.
# --------------------------------------------------------------------------

def _run_git_apply(cwd: Path, patch_file: Path, check_only: bool) -> None:
    args = ["git", "apply", "--whitespace=nowarn"]
    if check_only:
        args.append("--check")
    args.append(str(patch_file))
    result = subprocess.run(args, cwd=cwd, capture_output=True, text=True)
    if result.returncode != 0:
        raise ScenarioCountError(
            f"git apply {'--check ' if check_only else ''}failed for {patch_file.name}:\n"
            f"{result.stdout}{result.stderr}"
        )


def _patch_target_path(patch_file: Path) -> str:
    for line in patch_file.read_text(errors="replace").splitlines():
        if line.startswith("+++ b/"):
            return line[len("+++ b/"):]
        if line.startswith("+++ "):
            candidate = line[4:]
            return candidate[2:] if candidate.startswith("b/") else candidate
    raise ScenarioCountError(f"could not find a patch target line in {patch_file}")


@contextlib.contextmanager
def with_proposed_scratch(root: Path, package_dir: Path):
    proposed = package_dir / "proposed"
    if not proposed.is_dir():
        raise ScenarioCountError(f"no 'proposed' directory under {package_dir}")
    patch_files = sorted(proposed.glob("*.patch"))
    if not patch_files:
        raise ScenarioCountError(f"no *.patch files found under {proposed}")
    comp_files = composition_inputs(root)
    targets = {_patch_target_path(p) for p in patch_files}
    needed = {f.relative_to(root).as_posix() for f in comp_files} | {STATUS_PAGE_REL} | targets
    with tempfile.TemporaryDirectory(prefix="polaris-scenario-recount-") as tmp:
        scratch = Path(tmp)
        for rel in sorted(needed):
            src = root / rel
            if not src.is_file():
                continue  # a patch creating a brand-new file: nothing to seed
            dest = scratch / rel
            dest.parent.mkdir(parents=True, exist_ok=True)
            dest.write_bytes(src.read_bytes())
        for pf in patch_files:
            _run_git_apply(scratch, pf, check_only=True)
        for pf in patch_files:
            _run_git_apply(scratch, pf, check_only=False)
        yield scratch


# --------------------------------------------------------------------------
# Reporting.
# --------------------------------------------------------------------------

def render_report(result: CompositionResult, label: str) -> str:
    lines = [f"Composition ({label}):"]
    for f in result.files:
        lines.append(f"  - {f}")
    lines.append("")
    lines.append("Per-file raw counts (before composition; MODIFIED/ADDED scenario tallies only):")
    for file_label, d1, _d2 in result.per_file:
        added_n = sum(r.scenario_count for r in d1.added)
        modified_n = sum(r.scenario_count for r in d1.modified)
        lines.append(
            f"  {file_label}: ADDED {len(d1.added)} requirements/{added_n} scenarios, "
            f"MODIFIED {len(d1.modified)} requirements/{modified_n} scenarios, "
            f"REMOVED {len(d1.removed)}, RENAMED {len(d1.renamed)}"
        )
    lines.append("")
    lines.append(f"Per-requirement composed scenario counts ({len(result.per_requirement)} requirements):")
    for _key, (name, count) in sorted(result.per_requirement.items()):
        lines.append(f"  {count:3d}  {name}")
    lines.append("")
    lines.append(f"TOTAL: {len(result.per_requirement)} requirements, {result.total} scenarios")
    return "\n".join(lines)


# --------------------------------------------------------------------------
# selftest: rule-6 mutation fixtures, each built in an isolated temp dir.
# --------------------------------------------------------------------------

GOOD_BASE_SPEC = """# Fixture base capability

## ADDED Requirements

### Requirement: Alpha

Alpha body.

#### Scenario: A1

- **WHEN** one
- **THEN** two

#### Scenario: A2

- **WHEN** one
- **THEN** two

### Requirement: Beta

Beta body.

#### Scenario: B1

- **WHEN** one
- **THEN** two

### Requirement: Gamma

Gamma body.

#### Scenario: G1

- **WHEN** one
- **THEN** two
"""

GOOD_OVERLAY_SPEC = """# Fixture overlay

## RENAMED Requirements
- FROM: `### Requirement: Gamma`
- TO: `### Requirement: Gamma Prime`

## REMOVED Requirements

### Requirement: Beta

(no longer needed)

## MODIFIED Requirements

### Requirement: Alpha

Alpha modified body.

#### Scenario: A1

- **WHEN** one
- **THEN** two (modified)

## ADDED Requirements

### Requirement: Delta

Delta body.

#### Scenario: D1

- **WHEN** one
- **THEN** two

#### Scenario: D2

- **WHEN** one
- **THEN** two
"""

GOOD_THIRD_SPEC = """# Third change

## ADDED Requirements

### Requirement: Epsilon

Epsilon body.

#### Scenario: E1

- **WHEN** one
- **THEN** two
"""

# Composed: Alpha(1, replaced) + Gamma Prime(1, renamed) + Delta(2, added) = 4
# scenarios over 3 requirements. Beta(1) is removed.
GOOD_TOTAL_SCENARIOS = 4
GOOD_TOTAL_REQUIREMENTS = 3

GOOD_STATUS_PAGE = (
    "# Fixture project status\n\n"
    f"Read the predecessor together with the overlay: {GOOD_TOTAL_REQUIREMENTS} requirements "
    f"and {GOOD_TOTAL_SCENARIOS} scenarios in the effective composition.\n"
)


def _write_good_fixture(base: Path) -> None:
    base_spec = base / "openspec/changes/fixture-base-change/specs/polaris-generation/spec.md"
    overlay_spec = base / "openspec/changes/fixture-overlay-change/specs/polaris-generation/spec.md"
    base_spec.parent.mkdir(parents=True, exist_ok=True)
    overlay_spec.parent.mkdir(parents=True, exist_ok=True)
    base_spec.write_text(GOOD_BASE_SPEC)
    overlay_spec.write_text(GOOD_OVERLAY_SPEC)
    (base / STATUS_PAGE_REL).write_text(GOOD_STATUS_PAGE)


def _check_totals(result: CompositionResult, status_reqs: int, status_scenarios: int, *, expect: int | None = None) -> None:
    expected = expect if expect is not None else status_scenarios
    if result.total != expected:
        raise ScenarioCountError(
            f"scenario total mismatch: recomputed {result.total}, expected {expected} "
            f"({'--expect override' if expect is not None else 'PROJECT-STATUS.md assertion'})"
        )
    if expect is None and len(result.per_requirement) != status_reqs:
        raise ScenarioCountError(
            f"requirement count mismatch: recomputed {len(result.per_requirement)}, "
            f"PROJECT-STATUS.md asserts {status_reqs}"
        )


def _run_check(root: Path, *, expect: int | None = None) -> tuple[CompositionResult, int, int]:
    result = build_composition(root)
    status_reqs, status_scenarios = read_status_assertion(root)
    _check_totals(result, status_reqs, status_scenarios, expect=expect)
    return result, status_reqs, status_scenarios


def _expect_fail(label: str, fn) -> None:
    try:
        fn()
    except ScenarioCountError:
        print(f"  [ok] {label}: check failed closed as expected")
        return
    raise ScenarioCountError(f"selftest fixture '{label}' did not fail: the check passed on a mutated input")


def _copy_composition_inputs(root: Path, dest: Path) -> None:
    for source in [*composition_inputs(root), root / STATUS_PAGE_REL]:
        target = dest / source.relative_to(root)
        target.parent.mkdir(parents=True, exist_ok=True)
        target.write_bytes(source.read_bytes())


def _later_row_predicates(adoption, keep: tuple[str, ...]) -> list[tuple[str, object, str]]:
    """Every Polaris amendment row predicate the adoption module defines, but those named in `keep`,
    each as `(name, predicate, tag)`.

    A historical control projects the ledger as it stood at its version by removing the rows of every
    later amendment. Read from the module rather than listed here, so an amendment added later is
    removed too: listing only the next row left every later amendment in force, and from raw-read
    disclosure 2.17, which requires URL source v2.1, the projection refused to count at all
    (syzygy-3efd.82). Each predicate `is_<x>_row` is paired with the tag constant `<X>_TAG`, and every
    tag constant but the declared source's own (v2.0, which has no row predicate) must have its
    predicate, so an amendment whose predicate escapes the naming convention names itself here.
    """
    names = sorted(name for name in dir(adoption) if re.fullmatch(r"is_[a-z_]+_row", name))
    tags = sorted(name for name in dir(adoption) if re.fullmatch(r"[A-Z0-9_]+_TAG", name))
    paired = {name: name[3:-4].upper() + "_TAG" for name in names}
    unpaired_tags = sorted(set(tags) - set(paired.values()) - {"DECLARED_SOURCE_TAG"})
    unpaired_names = sorted(name for name, tag in paired.items() if tag not in tags)
    if unpaired_tags or unpaired_names or "DECLARED_SOURCE_TAG" not in tags:
        raise ScenarioCountError("selftest setup error: amendment tags and row predicates do not pair: "
                                 f"tags without a predicate {unpaired_tags}, predicates without a tag {unpaired_names}")
    if "is_url_source_row" not in names or any(name not in names for name in keep):
        raise ScenarioCountError("selftest setup error: the adoption module's row predicates are not as expected")
    return [(name, getattr(adoption, name), getattr(adoption, paired[name])) for name in names if name not in keep]


def _project_ledger(ledger: Path, predicates: list[tuple[str, object, str]]) -> None:
    """Remove from `ledger` every row any of `predicates` claims, refusing a projection that cannot be trusted.

    Each predicate must remove every row that names its amendment's tag. A predicate may remove no row
    only when no row names its tag: that amendment is pending, so nothing of it is in force to project
    away (a drafted package carries its predicate before its row lands).
    """
    lines = ledger.read_text(encoding="utf-8").splitlines(keepends=True)
    for name, claims, tag in predicates:
        tagged = [line for line in lines if tag in line]
        removed = [line for line in lines if claims(line.rstrip("\n"))]
        if any(line not in removed for line in tagged):
            raise ScenarioCountError(f"selftest setup error: `{name}` misses a ledger row naming `{tag}`")
    kept = [line for line in lines if not any(claims(line.rstrip("\n")) for _name, claims, _tag in predicates)]
    if len(kept) == len(lines):
        raise ScenarioCountError("selftest setup error: the ledger projection removed no row")
    ledger.write_text("".join(kept), encoding="utf-8")


def _declared_source_selftest(base: Path) -> None:
    """Exercise the reviewed v2.0 predecessor before the v2.1 adoption row."""
    if declared_source_amendment(ROOT) is None:
        return  # Historical tools/trees have no such amendment to project.
    import check_spec_reconciliation as adoption
    fixture = base / "declared-source"
    _copy_composition_inputs(ROOT, fixture)
    _project_ledger(fixture / adoption.AGENT_ADOPTIONS, _later_row_predicates(adoption, keep=()))
    status = fixture / STATUS_PAGE_REL
    status.write_bytes(STATUS_FIGURE_RE.sub(
        b"38 requirements and 277 scenarios in the effective composition", status.read_bytes(), count=1))
    result, _reqs, _scenarios = _run_check(fixture)
    expected = {"Operator-agent authoring mode": 5,
                "Agent brief and mechanically checked draft": 28,
                "Fresh-context review in the operator-agent mode": 17,
                "Self-reported discovery and in-session clarification": 6,
                "Declared local-source admission": 3}
    if (len(result.per_requirement), result.total) != (38, 277) or any(
            result.per_requirement.get(normalize_name(name)) != (name, count)
            for name, count in expected.items()):
        raise ScenarioCountError("declared-source control differs from literal five-requirement counts")
    print("  [ok] declared-source: verified five replacements and046 rename total38/277")
    projected = base / "declared-source-projected"
    _copy_composition_inputs(fixture, projected)
    if _run_check(projected)[0].per_requirement != result.per_requirement:
        raise ScenarioCountError("projected declared-source inputs lose the effective composition")
    print("  [ok] declared-source: projected install keeps binding inputs and effective composition")
    for name, target_kind in (("missing-row", "row"), ("changed-spec", "spec")):
        tree = base / ("declared-source-" + name)
        shutil.copytree(fixture, tree)
        target = tree / (adoption.AGENT_ADOPTIONS if target_kind == "row" else adoption.DECLARED_SOURCE_SPEC)
        text = target.read_text()
        if target_kind == "row":
            row = next(line for line in text.splitlines() if line.startswith("| A-4 |"))
            target.write_text(text.replace(row + "\n", "", 1))
        else:
            target.write_text(text + "\nchanged\n")
        _expect_fail("declared-source " + name + " refuses counting", lambda: build_composition(tree))
    (projected / adoption.AGENT_ADOPTIONS).unlink()
    _expect_fail("projected declared-source missing binding refuses instead of recounting329",
                 lambda: build_composition(projected))


def _url_source_selftest(base: Path) -> None:
    if url_source_amendment(ROOT) is None:
        return  # The transaction or an archived tree may precede adoption.
    import check_spec_reconciliation as adoption

    fixture = base / "url-source"
    _copy_composition_inputs(ROOT, fixture)
    _project_ledger(fixture / adoption.AGENT_ADOPTIONS,
                    _later_row_predicates(adoption, keep=("is_url_source_row",)))
    status = fixture / STATUS_PAGE_REL
    status.write_bytes(STATUS_FIGURE_RE.sub(
        b"39 requirements and 333 scenarios in the effective composition", status.read_bytes(), count=1))
    result, _reqs, _scenarios = _run_check(fixture)
    expected = {"Provenance-bound source policy": 14,
                "Operator-agent authoring mode": 6,
                "Fresh-context review in the operator-agent mode": 37,
                "Trunk-tip revision pinned at launch": 24,
                "Declared URL dossier supervisor": 27}
    if (len(result.per_requirement), result.total) != (39, 333) or any(
            result.per_requirement.get(normalize_name(name)) != (name, count)
            for name, count in expected.items()):
        raise ScenarioCountError("URL declared-source control differs from literal v2.1 counts")
    print("  [ok] URL declared-source: four replacements and one addition total 39/333")

    projected = base / "url-source-projected"
    _copy_composition_inputs(fixture, projected)
    if _run_check(projected)[0].per_requirement != result.per_requirement:
        raise ScenarioCountError("projected URL declared-source inputs lose the effective composition")
    print("  [ok] URL declared-source: projected install keeps binding inputs and effective composition")

    (projected / adoption.URL_SOURCE_RFC_PATHS[-1]).unlink()
    _expect_fail("projected URL declared-source missing contract binding refuses counting",
                 lambda: build_composition(projected))


def selftest() -> None:
    print("Running rule-6 mutation fixtures (each must make the check fail closed)...")

    with tempfile.TemporaryDirectory(prefix="polaris-scenario-count-selftest-") as tmp:
        base = Path(tmp)
        _declared_source_selftest(base)
        _url_source_selftest(base)

        # Sanity: the good fixture itself must pass, with the exact literal
        # totals hard-coded above (never imported from the module).
        good = base / "good"
        _write_good_fixture(good)
        result, status_reqs, status_scenarios = _run_check(good)
        if result.total != GOOD_TOTAL_SCENARIOS or len(result.per_requirement) != GOOD_TOTAL_REQUIREMENTS:
            raise ScenarioCountError(
                f"good fixture did not recompute the expected literal total: "
                f"got {len(result.per_requirement)} requirements / {result.total} scenarios, "
                f"expected {GOOD_TOTAL_REQUIREMENTS} / {GOOD_TOTAL_SCENARIOS}"
            )
        if (status_reqs, status_scenarios) != (GOOD_TOTAL_REQUIREMENTS, GOOD_TOTAL_SCENARIOS):
            raise ScenarioCountError("good fixture's own PROJECT-STATUS.md sentence did not parse as authored")
        print("  [ok] good fixture: recomputed total matches the hard-coded literal and PROJECT-STATUS.md")

        # Fixture 1: dropped scenario. Delete one '#### Scenario:' block from
        # the overlay's ADDED Delta requirement (which the composition keeps
        # verbatim); PROJECT-STATUS.md is left stating the old, now-stale
        # total. --check must catch the drift.
        f1 = base / "f1"
        _write_good_fixture(f1)
        overlay_path = f1 / "openspec/changes/fixture-overlay-change/specs/polaris-generation/spec.md"
        dropped = overlay_path.read_text().replace(
            "#### Scenario: D2\n\n- **WHEN** one\n- **THEN** two\n", ""
        )
        if dropped == overlay_path.read_text():
            raise ScenarioCountError("selftest setup error: dropped-scenario replacement made no change")
        overlay_path.write_text(dropped)
        _expect_fail("dropped scenario not reflected in a stale PROJECT-STATUS.md", lambda: _run_check(f1))

        # Fixture 2: MODIFIED double-count. A requirement is (erroneously)
        # listed under both MODIFIED and ADDED in the same overlay. If
        # compose() ever summed instead of raising, Alpha's scenarios would
        # be double-counted. The collision must be a fatal finding.
        f2 = base / "f2"
        _write_good_fixture(f2)
        overlay_path2 = f2 / "openspec/changes/fixture-overlay-change/specs/polaris-generation/spec.md"
        doubled = overlay_path2.read_text() + (
            "\n### Requirement: Alpha\n\nDuplicated erroneously.\n\n"
            "#### Scenario: A-dup\n\n- **WHEN** one\n- **THEN** two\n"
        )
        overlay_path2.write_text(doubled)
        _expect_fail("requirement double-listed under MODIFIED and ADDED", lambda: _run_check(f2))

        # Fixture 3: digit mismatch. Spec files are untouched; PROJECT-STATUS.md
        # states a scenario total inconsistent with the (correct) recount.
        f3 = base / "f3"
        _write_good_fixture(f3)
        status_path3 = f3 / STATUS_PAGE_REL
        status_path3.write_text(
            status_path3.read_text().replace(f"{GOOD_TOTAL_SCENARIOS} scenarios", "999 scenarios")
        )
        _expect_fail("PROJECT-STATUS.md digit inconsistent with the recount", lambda: _run_check(f3))

        # Fixture 4: disagreement between the two methods. Exercised directly
        # against the comparison primitive (bypassing text parsing, which
        # cannot itself be made to disagree on well-formed input without
        # reintroducing a parser bug) -- the fatal path in build_composition
        # must fire whenever the two independently-derived composed results
        # differ at all, in either direction.
        composed_a = {"alpha": ("Alpha", 2)}
        composed_b = {"alpha": ("Alpha", 3)}

        def _disagree():
            _assert_composed_agree(composed_a, composed_b, "method A", "method B")

        _expect_fail("the two counting methods disagree", _disagree)

        # Fixture 5: RENAMED FROM names a requirement absent from the
        # composition (a dangling reference must not be silently ignored).
        f5 = base / "f5"
        _write_good_fixture(f5)
        overlay_path5 = f5 / "openspec/changes/fixture-overlay-change/specs/polaris-generation/spec.md"
        overlay_path5.write_text(
            overlay_path5.read_text().replace(
                "- FROM: `### Requirement: Gamma`", "- FROM: `### Requirement: Nonexistent`"
            )
        )
        _expect_fail("RENAMED FROM names an absent requirement", lambda: _run_check(f5))

        # Fixture 6: discovery finds two overlays (ambiguous composition
        # order) and must refuse rather than guess.
        f6 = base / "f6"
        _write_good_fixture(f6)
        second_overlay = f6 / "openspec/changes/fixture-second-overlay/specs/polaris-generation/spec.md"
        second_overlay.parent.mkdir(parents=True, exist_ok=True)
        second_overlay.write_text(GOOD_OVERLAY_SPEC)
        _expect_fail("two overlays found (no derivable order)", lambda: build_composition(f6))

        # Fixture 7: a third file that only ADDS requirements is an addition,
        # applied after the overlay; the total moves by exactly its scenarios.
        f7 = base / "f7"
        _write_good_fixture(f7)
        third = f7 / "openspec/changes/fixture-third-change/specs/polaris-generation/spec.md"
        third.parent.mkdir(parents=True, exist_ok=True)
        third.write_text(GOOD_THIRD_SPEC)
        (f7 / STATUS_PAGE_REL).write_text(GOOD_STATUS_PAGE.replace(
            f"{GOOD_TOTAL_REQUIREMENTS} requirements and {GOOD_TOTAL_SCENARIOS} scenarios",
            "4 requirements and 5 scenarios"))
        r7, _, _ = _run_check(f7)
        if (len(r7.per_requirement), r7.total) != (4, 5) or r7.files[-1].split("/")[2] != "fixture-third-change":
            raise ScenarioCountError(f"added-only third file did not compose as an addition: {r7.files}, {r7.total}")
        print("  [ok] third ADDED-only file composes as an addition (4 requirements, 5 scenarios)")

        # Fixture 8: the third file collides with a composed requirement name.
        f8 = base / "f8"
        _write_good_fixture(f8)
        collide = f8 / "openspec/changes/fixture-third-change/specs/polaris-generation/spec.md"
        collide.parent.mkdir(parents=True, exist_ok=True)
        collide.write_text(GOOD_THIRD_SPEC.replace("Epsilon", "Delta"))
        (f8 / STATUS_PAGE_REL).write_text(GOOD_STATUS_PAGE)
        _expect_fail("added-only third file collides with a composed requirement", lambda: _run_check(f8))

        # Fixture 9: with two ADDED-only files and an overlay whose MODIFIED
        # target both carry, the base is ambiguous and the script refuses.
        f9 = base / "f9"
        _write_good_fixture(f9)
        twin = f9 / "openspec/changes/fixture-twin-base/specs/polaris-generation/spec.md"
        twin.parent.mkdir(parents=True, exist_ok=True)
        twin.write_text(GOOD_BASE_SPEC)
        _expect_fail("two ADDED-only files both hold the overlay's predecessor", lambda: build_composition(f9))

        # Fixture 10: two ADDED-only files and an overlay that references
        # nothing in either: no base is derivable.
        f10 = base / "f10"
        _write_good_fixture(f10)
        third10 = f10 / "openspec/changes/fixture-third-change/specs/polaris-generation/spec.md"
        third10.parent.mkdir(parents=True, exist_ok=True)
        third10.write_text(GOOD_THIRD_SPEC)
        ov10 = f10 / "openspec/changes/fixture-overlay-change/specs/polaris-generation/spec.md"
        ov10.write_text(ov10.read_text().replace("### Requirement: Alpha", "### Requirement: Unrelated"))
        _expect_fail("overlay references no ADDED-only file's requirement", lambda: build_composition(f10))

    print("selftest PASS: expected refusals and positive controls held.")


# --------------------------------------------------------------------------
# CLI
# --------------------------------------------------------------------------

def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__, formatter_class=argparse.RawDescriptionHelpFormatter)
    parser.add_argument("--check", action="store_true", help="compare the recomputed total to PROJECT-STATUS.md's digit (or --expect)")
    parser.add_argument("--expect", type=int, default=None, metavar="N", help="compare against N instead of PROJECT-STATUS.md's stated scenario total")
    parser.add_argument("--with-proposed", metavar="DIR", default=None, help="apply DIR/proposed/*.patch in a scratch copy before counting")
    parser.add_argument("--selftest", action="store_true")
    args = parser.parse_args()

    try:
        if args.selftest:
            selftest()
            return 0

        if args.with_proposed:
            package_dir = Path(args.with_proposed)
            if not package_dir.is_absolute():
                package_dir = (ROOT / package_dir).resolve()
            with with_proposed_scratch(ROOT, package_dir) as scratch:
                result = build_composition(scratch)
                status_reqs, status_scenarios = read_status_assertion(scratch)
                label = f"scratch copy with {package_dir.relative_to(ROOT) if package_dir.is_relative_to(ROOT) else package_dir}'s proposed patches applied"
                print(render_report(result, label))
                print()
                print(f"(scratch) PROJECT-STATUS.md asserts: {status_reqs} requirements, {status_scenarios} scenarios")
        else:
            result = build_composition(ROOT)
            status_reqs, status_scenarios = read_status_assertion(ROOT)
            print(render_report(result, "tracked tree (HEAD)"))
            print()
            print(f"PROJECT-STATUS.md asserts: {status_reqs} requirements, {status_scenarios} scenarios")

        if args.check:
            _check_totals(result, status_reqs, status_scenarios, expect=args.expect)
            expected = args.expect if args.expect is not None else status_scenarios
            print(f"CHECK PASS: recomputed total {result.total} matches expected {expected}.")
    except ScenarioCountError as exc:
        print(f"FAIL: {exc}", file=sys.stderr)
        return 1
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
