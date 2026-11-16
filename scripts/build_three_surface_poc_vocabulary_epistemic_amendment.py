#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Build and verify the inert Three-Surface POC vocabulary and epistemic-record amendment.

Ruling P-75 (2026-09-21) directed one CC-REV-2 amendment against the
three-surface-poc-experience specification alone. The first package drafted
under it (``three-surface-poc-identity-amendment/``, register row P-84) was
parked by the owner on 2026-10-14 after six REVISE rounds, and redrafted
narrower: this package carries POC-REQ-055 (every relationship is a
closed-vocabulary name in a role pair the table assigns it, or flagged
outside it) and an in-place amendment to POC-REQ-060 (one epistemic record
shape on every entity and relationship, and the Inferred label). The subject
identity requirement (POC-REQ-054) and the three-state ribbon are deferred
and must not appear here. The signed bytes are never edited while this
package is a candidate: proposed bytes live as patches, and the manifest
hashes the six-artifact subject after those patches. Applying them is a
sign-off-time operation.

    --check      verify patches, structure, regeneration and the manifest
    --selftest   rule-6 mutants for the structure predicates, the two
                 subject-change predicates, patch drift, manifest order and
                 subject drift; each mutant names the one finding it must
                 produce, and the selftest fails if any REQUIRED_PHRASES,
                 COVERAGE_ROW_PHRASES, UNKNOWN_ROWS or READER_NOTE_PHRASES
                 entry has no mutant of its own. Sentences outside those
                 guards are frozen by the manifest digest, not by a phrase.
    --write      regenerate the manifest over the proposed bytes
    --diff       print the proposed patches
    --apply --at-adoption   write the proposed bytes (sign-off change only)

Guards, each a predicate the selftest mutates:

- the requirement population is the signed one plus POC-REQ-055 before
  POC-REQ-060; every other requirement block is byte-identical;
- POC-REQ-055 and POC-REQ-060 carry every phrase REQUIRED_PHRASES names,
  and cite the ruling's decision key; POC-REQ-060's signed scenario is kept
  verbatim;
- no proposed subject names POC-REQ-054, the deferred identity requirement;
- every signed reader-notes line survives except READER_NOTE_EDITS, whose
  replacements READER_NOTE_PHRASES checks;
- the one signed coverage row ruling P-75 Q3 names survives byte for byte;
  every other signed row survives, except the one Part B2 belief that moves
  (MOVED_FROM_B2); every added row carries AMENDMENT_MARK; the rows
  UNKNOWN_ROWS names exist once each and are Unknown; the rows
  COVERAGE_ROW_PHRASES names carry their justification;
- every other signed line of the matrix and of the proposal survives,
  except the computed figures COMPUTED_LINES names and the table rows the
  totals and row checks cover; the printed totals equal computation;
- the generated GOVERNING-DEPENDENCIES.md equals regeneration.
"""

from __future__ import annotations

import argparse
import collections
import hashlib
import pathlib
import re
import subprocess
import sys
import tempfile


ROOT = pathlib.Path(__file__).resolve().parents[1]
CHANGE = pathlib.Path("openspec/changes/three-surface-poc-experience")
CANDIDATE = pathlib.Path(
    ".syzygy/governance/contracts/candidates/three-surface-poc-vocabulary-epistemic-amendment"
)
PROPOSED = CANDIDATE / "proposed"
MANIFEST_OUT = CANDIDATE / "THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-MANIFEST.txt"
TITLE = "THREE-SURFACE POC VOCABULARY AND EPISTEMIC-RECORD AMENDMENT MANIFEST"

SPEC = CHANGE / "specs/three-surface-poc-experience/spec.md"
DEPENDENCIES = CHANGE / "GOVERNING-DEPENDENCIES.md"
PROPOSAL = CHANGE / "proposal.md"
COVERAGE = CHANGE / "CONTRACT-COVERAGE.md"

SUBJECTS = tuple(
    sorted(
        (
            CHANGE / ".openspec.yaml",
            COVERAGE,
            DEPENDENCIES,
            CHANGE / "design.md",
            PROPOSAL,
            SPEC,
        ),
        key=lambda path: path.as_posix(),
    )
)
PATCHED = tuple(
    sorted((COVERAGE, DEPENDENCIES, PROPOSAL, SPEC), key=lambda path: path.as_posix())
)
ROW = re.compile(r"^([0-9a-f]{64})  ([^\n]+)$", re.MULTILINE)
REQ_HEADING = re.compile(r"^### Requirement: (POC-REQ-\d{3}) — ", re.MULTILINE)
COVERAGE_ROW = re.compile(r"^\| (RFC\d+-[^ |]+) \|", re.MULTILINE)

NEW_IDS = ("POC-REQ-055",)
AMENDED_IDS = ("POC-REQ-060",)
#: Deferred by the owner's 2026-10-14 direction; no proposed subject names it.
DEFERRED_ID = "POC-REQ-054"
#: The signed row ruling P-75 Q3 names; it is edited on no arm.
BOUND_ROW = (
    "| RFC1-26 | Relations outside the closed table don't exist; "
    "no prose-widening | covered | POC-REQ-052 |"
)
#: The one Part B2 belief that moves to Part A because POC-REQ-060 now
#: covers one of its consequences.
MOVED_FROM_B2 = ("RFC2-25",)
AMENDMENT_MARK = "Amendment row (vocabulary and record shape)"
POC_DIR_KEY = "`POC-DIR-2026-09-21`"
POC_DIR_FILE = "`POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md`"

#: Whitespace-normalized phrases each new or amended block must carry.
REQUIRED_PHRASES: dict[str, tuple[tuple[str, str], ...]] = {
    "POC-REQ-055": (
        ("cross-cutting group", "Group: Cross-cutting experience. Form: **invariant**."),
        ("closed-table name in its roles", "a relation name from RFC1-25's closed table, emitted with its source and target in the roles that table assigns the relation"),
        ("outside flag with a reason", "carry an explicit outside-closed-vocabulary flag with a stated reason"),
        ("declared kind-to-class correspondence", "read through a checked-in declaration that maps each shared-model entity kind to the RFC 0001 class it corresponds to, or to none"),
        ("flag carried and rendered", "carried in the machine answer and rendered in every rendered element that marks the relationship"),
        ("a marker names the relationship's served id", "an element marks a relationship when it carries the relationship's served `id` in one of the surfaces' declared relationship markers"),
        ("unmarked renderings outside the sweep", "A rendering of a relationship that carries no declared relationship marker is outside this requirement's sweep."),
        ("marker population is the rendering denominator", "the denominator is the complete marker population, which the check counts and reports — and checks every flagged relationship for a non-empty reason in the machine answer and in every element that marks it"),
        ("flag never widens the vocabulary", "it never adds a kind or a role pair to that vocabulary"),
        ("unassigned role pairs decide", "zero unflagged relationships whose mapped role pair the table does not assign that relation"),
        ("admitted relationships never flagged", "zero flagged relationships whose kind and mapped role pair the table assigns"),
        ("reversed roles falsify", "(reversed roles included)"),
        ("literals never imported from the model", "none is imported from the model"),
        ("disclosure scenario", "#### Scenario: A kind outside the closed table is disclosed"),
    ),
    "POC-REQ-060": (
        ("cross-cutting group", "Group: Cross-cutting experience. Form: **invariant**."),
        ("three labels encoded", "(Observed, Inferred, Unknown, and their reasons) identically wherever they appear"),
        ("entities and relationships carry one record shape", "Every entity and every relationship the shared model holds SHALL carry its epistemic state in one record shape, in the shared model and in the machine answer"),
        ("tier only where carried, inside its parent", "a rendering tier, where the record carries one, from RFC2-25's closed six and always inside its parent label"),
        ("closed reasons with a route", "exactly one primary reason from RFC2-24's closed twelve with its resolution route"),
        ("Inferred only from an agent", "An Inferred state SHALL arise only from an agent's assertion"),
        ("Inferred never Observed or clearing", "SHALL never count toward an Observed total or clear an Unknown"),
        ("Inferred names its assertion", "SHALL name the agent assertion it arises from"),
        ("Inferred encoded distinctly", "SHALL render with the declared table's Inferred entry in every rendered element that marks its record"),
        ("label entries pairwise distinct", "The declared token/encoding table SHALL give Observed, Inferred and Unknown three pairwise distinct entries"),
        ("label entries compared", "a pairwise comparison of the table's Observed, Inferred and Unknown entries"),
        ("shared model observed through the machine answer", "The shared model's records are observed through the machine answer"),
        ("Observed totals named", "An Observed total is every count the machine answer serves, except a count the machine answer declares to be of Inferred records"),
        ("Inferred marker denominator", "for that record the checker extracts every rendered element carrying a declared record marker that names it — the denominator is that marker population, which the check counts and reports"),
        ("record-shape population bounded", "No other epistemic value the machine answer serves is in the record-shape population"),
        ("lists are the record denominator", "enumerates every element of the machine answer's entity and relationship lists — the denominator is that population — checks that each carries exactly one epistemic record"),
        ("Inferred fixture limb", "the Inferred limbs are exercised by a fixture record injected at the model seam"),
        ("Observed totals recounted", "a recount of every Observed total without it, each of which must equal the count served with it"),
        ("Unknown records recounted", "a recount of the entity and relationship records labelled Unknown with and without it"),
        ("Unknown sets compared by list and served identifier", "each member keyed by the list it is served in and the identifier the machine answer serves it under and the injected record excluded, must be equal"),
        ("a missing record falsifies", "an entity or relationship with no epistemic record or with more than one"),
        ("Inferred scenario leaves every Unknown", "changes no Observed total the machine answer serves, leaves every Unknown entity and relationship record in the machine answer Unknown, and renders with the declared Inferred encoding in every rendered element that marks it"),
        ("signed scenario kept", "#### Scenario: Unknown looks the same everywhere"),
        ("Inferred scenario heading", "#### Scenario: An agent assertion stays Inferred"),
    ),
}

#: (clause, label, phrase): an amendment row of the clause must carry the
#: phrase, whitespace-normalized.
COVERAGE_ROW_PHRASES = (
    ("RFC1-25", "the slice-written correspondence", "the slice that emits the relationships also writes it"),
    ("RFC2-25", "the Inferred reading of never green", "`[Inferred]` the covered reading of \"never green\" is \"rendered unlike Observed\""),
    ("RFC2-25", "the bounded Unknown recount", "it clears no Unknown among the machine answer's entity and relationship records"),
    ("RFC1-26", "the marked-rendering disclosure", "in the machine answer and in every rendered element that marks it with a declared relationship marker"),
    ("RFC2-25", "the marked-rendering encoding", "which differs from its Observed entry, in every rendered element that marks it with a declared record marker"),
    ("RFC6-14", "the list denominator", "POC-REQ-060's denominator is every element of the machine answer's entity and relationship lists"),
)

#: (clause, consequence prefix): exactly one Part A row, and it is Unknown.
UNKNOWN_ROWS = (
    ("RFC1-25", "The declared kind-to-class correspondence matches RFC 0001's class definitions"),
    ("RFC1-26", "No relation outside the closed table is emitted at all"),
    ("RFC1-26", "A flagged relationship rendered in an element that carries no declared relationship marker shows its flag and reason there"),
    ("RFC2-25", "An `asserted-by-worker` claim renders unlike Observed in a rendering that carries no declared record marker"),
    ("RFC2-25", "A record carries a tier only where that tier's Semantics column holds"),
    ("RFC2-25", "An `asserted-by-worker` claim clears no Unknown outside the machine answer's entity and relationship lists"),
    ("RFC6-14", "Every claim instance, and every other epistemic value the machine answer serves outside its entity and relationship lists, carries the same record"),
)

#: The three signed reader-notes lines the amendment rewrites (the group
#: range and the decision-key list); every other signed line must survive.
READER_NOTE_EDITS = (
    "  (040–043), *Orrery* (050–053), *Cross-cutting experience* (060–061).",
    "  `THREE-SURFACE-POC-MODE-DIRECTION.md` and `POC-DIR-2026-08-30` names",
    "  `THREE-SURFACE-POC-REDESIGN-DIRECTION.md`. `contracts[]` entries come",
)
#: Whitespace-normalized phrases the rewritten reader notes must carry.
READER_NOTE_PHRASES = (
    ("the cross-cutting group range", "*Cross-cutting experience* (055, 060–061)."),
    ("the Group-line placement sentence", "its number range does not place it in the Orrery group; its `Group` line places it in *Cross-cutting experience*."),
    ("the signed decision keys", "`POC-DIR-2026-08-29` names `THREE-SURFACE-POC-MODE-DIRECTION.md`, `POC-DIR-2026-08-30` names `THREE-SURFACE-POC-REDESIGN-DIRECTION.md`"),
)
#: The proposal sentence that makes P-75 Q4's "no production constructor"
#: binding; whitespace-normalized.
PROPOSAL_Q4 = (
    "This amendment does not make the arm constructible in production; "
    "that needs its own owner act."
)
PROPOSAL_HEADING = "## Amendment — one relation vocabulary, one epistemic record shape"
PROPOSAL_DEFERRAL = (
    "A subject identity shared across the surfaces, and a per-claim view of "
    "the desired, execution and observed states, are not specified here."
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def normalized(text: str) -> str:
    return " ".join(text.split())


def current_bytes(
    overrides: dict[pathlib.Path, bytes] | None = None,
) -> dict[pathlib.Path, bytes]:
    overrides = overrides or {}
    values: dict[pathlib.Path, bytes] = {}
    for rel in SUBJECTS:
        if rel in overrides:
            values[rel] = overrides[rel]
        elif (ROOT / rel).is_file():
            values[rel] = (ROOT / rel).read_bytes()
        else:
            raise ValueError(f"missing amendment subject: {rel}")
    return values


def patch_files() -> list[pathlib.Path]:
    return sorted((ROOT / PROPOSED).glob("*.patch"), key=lambda path: path.name)


def apply_patches(base: pathlib.Path, patches: list[pathlib.Path]) -> None:
    for patch in patches:
        done = subprocess.run(
            ["git", "apply", "--whitespace=nowarn", str(patch)],
            cwd=base,
            capture_output=True,
            text=True,
        )
        if done.returncode != 0:
            raise ValueError(f"{patch.name} does not apply: {done.stderr.strip()}")


def proposed_bytes(
    overrides: dict[pathlib.Path, bytes] | None = None,
    patches: list[pathlib.Path] | None = None,
) -> dict[pathlib.Path, bytes]:
    current = current_bytes(overrides)
    patches = patch_files() if patches is None else patches
    with tempfile.TemporaryDirectory() as scratch:
        base = pathlib.Path(scratch)
        for rel, body in current.items():
            (base / rel).parent.mkdir(parents=True, exist_ok=True)
            (base / rel).write_bytes(body)
        apply_patches(base, patches)
        return {rel: (base / rel).read_bytes() for rel in SUBJECTS}


# --- the specification -------------------------------------------------------

def requirement_blocks(spec: str) -> tuple[str, list[tuple[str, str]]]:
    """(preamble, [(id, block)]) in file order; a block runs to the next heading."""
    marks = list(REQ_HEADING.finditer(spec))
    if not marks:
        return spec, []
    blocks = []
    for index, mark in enumerate(marks):
        end = marks[index + 1].start() if index + 1 < len(marks) else len(spec)
        blocks.append((mark.group(1), spec[mark.start():end]))
    return spec[: marks[0].start()], blocks


def _lost_lines(old: str, new: str, skip) -> list[str]:
    remaining = collections.Counter(new.split("\n"))
    lost = []
    for line in old.split("\n"):
        if skip(line):
            continue
        if remaining[line]:
            remaining[line] -= 1
        else:
            lost.append(line)
    return lost


def spec_findings(proposed: bytes, current: bytes) -> list[str]:
    findings: list[str] = []
    new_pre, new_blocks = requirement_blocks(proposed.decode("utf-8"))
    old_pre, old_blocks = requirement_blocks(current.decode("utf-8"))
    expected: list[str] = []
    for rid, _block in old_blocks:
        if rid == "POC-REQ-060":
            expected.extend(NEW_IDS)
        expected.append(rid)
    new_ids = [rid for rid, _ in new_blocks]
    if new_ids != expected:
        findings.append(
            "requirement population or order differs: expected "
            f"{len(expected)} with POC-REQ-055 between POC-REQ-053 and "
            f"POC-REQ-060, found {new_ids}"
        )
        return findings
    old_by_id = dict(old_blocks)
    for rid, block in new_blocks:
        if rid in NEW_IDS or rid in AMENDED_IDS:
            text = normalized(block)
            for label, phrase in REQUIRED_PHRASES[rid]:
                if normalized(phrase) not in text:
                    findings.append(f"{rid} lacks {label}")
            if "POC-DIR-2026-09-21" not in block:
                findings.append(f"{rid} warrants do not cite ruling P-75's decision key")
        elif block != old_by_id[rid]:
            findings.append(f"{rid} changed; the amendment touches only POC-REQ-055 and POC-REQ-060")
    if "## ADDED Requirements" not in new_pre or (
        new_pre.split("## ADDED Requirements")[0] != old_pre.split("## ADDED Requirements")[0]
    ):
        findings.append("the specification's title, banner or Purpose changed")
    if POC_DIR_KEY not in new_pre or POC_DIR_FILE not in new_pre:
        findings.append("reader notes do not define the POC-DIR-2026-09-21 decision key")
    old_notes = old_pre.split("## ADDED Requirements", 1)[-1]
    new_notes = new_pre.split("## ADDED Requirements", 1)[-1]
    lost = _lost_lines(old_notes, new_notes, lambda line: line in READER_NOTE_EDITS)
    if lost:
        findings.append(f"signed reader-notes line edited or removed: {lost[0]!r}")
    for label, phrase in READER_NOTE_PHRASES:
        if normalized(phrase) not in normalized(new_notes):
            findings.append(f"reader notes lack {label}")
    old_scenario = old_by_id["POC-REQ-060"].split("#### Scenario:", 1)[1].split("```yaml", 1)[0]
    new_060 = dict(new_blocks)["POC-REQ-060"]
    if "#### Scenario:" + old_scenario.rstrip("\n") not in new_060:
        findings.append("POC-REQ-060's signed scenario is not preserved verbatim")
    return findings


def deferred_findings(proposed: dict[pathlib.Path, bytes]) -> list[str]:
    """The identity requirement is deferred: no proposed subject may name it."""
    return [
        f"{rel.name} names the deferred {DEFERRED_ID}"
        for rel in PATCHED
        if DEFERRED_ID.encode("utf-8") in proposed[rel]
    ]


def dependency_findings(proposed: dict[pathlib.Path, bytes]) -> list[str]:
    sys.path.insert(0, str(ROOT / "scripts"))
    import build_three_surface_poc_spec_dependencies as generator

    rendered, errors = generator.generate(proposed[SPEC].decode("utf-8"))
    if errors:
        return [f"proposed warrants do not validate: {'; '.join(errors)}"]
    if rendered.encode("utf-8") != proposed[DEPENDENCIES]:
        return [
            "proposed GOVERNING-DEPENDENCIES.md differs from regeneration "
            "over the proposed spec bytes"
        ]
    return []


# --- the coverage matrix -----------------------------------------------------

def _section(text: str, start: str, end: str) -> str:
    begin = text.index(start)
    return text[begin: text.index(end, begin)]


def coverage_parts(text: str) -> dict[str, list[str]]:
    parts = {
        "A": _section(text, "## Part A", "## Part B1"),
        "B1": _section(text, "## Part B1", "## Part B2"),
        "B2": _section(text, "## Part B2", "## Verifying"),
    }
    return {
        key: [line for line in body.split("\n") if COVERAGE_ROW.match(line)]
        for key, body in parts.items()
    }


def _clause(row: str) -> str:
    return row.split("|")[1].strip()


def _consequence(row: str) -> str:
    return row.split("|")[2].strip()


def _disposition(row: str) -> str:
    return row.split("|")[3].strip()


def coverage_totals(text: str) -> dict[str, object]:
    parts = coverage_parts(text)
    families: dict[str, collections.Counter] = {}
    for key, rows in parts.items():
        families[key] = collections.Counter(
            re.match(r"(RFC\d+)-", clause).group(1) for clause in {_clause(r) for r in rows}
        )
    part_a = parts["A"]
    return {
        "a_rows": len(part_a),
        "a_clauses": len({_clause(r) for r in part_a}),
        "a_covered": sum(_disposition(r).startswith("covered") for r in part_a),
        "a_unknown": sum(_disposition(r).startswith("**Unknown**") for r in part_a),
        "b1_rows": len(parts["B1"]),
        "b1_clauses": len({_clause(r) for r in parts["B1"]}),
        "b2_clauses": len({_clause(r) for r in parts["B2"]}),
        "families": families,
    }


def totals_findings(text: str) -> list[str]:
    findings: list[str] = []
    totals = coverage_totals(text)
    families = totals["families"]
    for family in sorted(
        set().union(*(set(counter) for counter in families.values())),
        key=lambda name: int(name[3:]),
    ):
        match = re.search(rf"^\| {family} \| (\d+) \| (\d+) \| (\d+) \| (\d+) \|$", text, re.MULTILINE)
        if not match:
            findings.append(f"family table has no {family} row")
            continue
        accepted, a, b1, b2 = (int(value) for value in match.groups())
        computed = (families["A"][family], families["B1"][family], families["B2"][family])
        if (a, b1, b2) != computed:
            findings.append(f"family table {family} reads {(a, b1, b2)}, computed {computed}")
        if a + b1 + b2 != accepted:
            findings.append(f"family table {family} parts do not sum to {accepted}")
    a, b1, b2 = (totals["a_clauses"], totals["b1_clauses"], totals["b2_clauses"])
    printed = {
        "family total": f"| **Total** | **{a + b1 + b2}** | **{a}** | **{b1}** | **{b2}** |",
        "Part A totals": normalized(
            f"**{totals['a_rows']} consequence rows over {a} clauses — "
            f"{totals['a_covered']} covered, {totals['a_unknown']} Unknown.**"
        ),
        "Part B1 totals": normalized(
            f"**{totals['b1_rows']} consequence rows over {b1} clauses — all Unknown.**"
        ),
        "Part B2 total": f"**{b2} clauses.**",
        "denominator sum": f"{a} + {b1} + {b2} = {a + b1 + b2}.",
        "mapped-set count": f"`contracts[]` union ({a} identifiers).",
    }
    flat = normalized(text)
    for label, sentence in printed.items():
        if normalized(sentence) not in flat:
            findings.append(f"{label} is not the computed figure ({sentence})")
    return findings


def coverage_findings(
    proposed: dict[pathlib.Path, bytes], current: dict[pathlib.Path, bytes]
) -> list[str]:
    findings: list[str] = []
    new = proposed[COVERAGE].decode("utf-8")
    old = current[COVERAGE].decode("utf-8")
    if new.split("\n").count(BOUND_ROW) != 1:
        findings.append("the signed RFC1-26 closure row ruling P-75 Q3 names is not preserved exactly once")
    new_parts, old_parts = coverage_parts(new), coverage_parts(old)
    new_rows = {key: set(rows) for key, rows in new_parts.items()}
    for key, rows in old_parts.items():
        for row in rows:
            if row in new_rows[key]:
                continue
            if key == "B2" and _clause(row) in MOVED_FROM_B2:
                continue
            findings.append(f"signed Part {key} row edited or removed: {_clause(row)}")
    old_all = {row for rows in old_parts.values() for row in rows}
    for key, rows in new_parts.items():
        for row in rows:
            if row not in old_all and AMENDMENT_MARK not in row:
                findings.append(f"added Part {key} row does not say it is an amendment row: {_clause(row)}")
    clauses = {key: {_clause(r) for r in rows} for key, rows in new_parts.items()}
    for first, second in (("A", "B1"), ("A", "B2"), ("B1", "B2")):
        both = clauses[first] & clauses[second]
        if both:
            findings.append(f"clauses in both Part {first} and Part {second}: {sorted(both)}")
    for clause in MOVED_FROM_B2:
        if clause not in clauses["A"]:
            findings.append(f"{clause} left Part B2 but is not in Part A")
    for clause, label, phrase in COVERAGE_ROW_PHRASES:
        rows = [normalized(r) for r in new_parts["A"] if _clause(r) == clause and AMENDMENT_MARK in r]
        if not any(normalized(phrase) in row for row in rows):
            findings.append(f"{clause} amendment rows lack {label}")
    for clause, prefix in UNKNOWN_ROWS:
        rows = [r for r in new_parts["A"] if _clause(r) == clause and _consequence(r).startswith(prefix)]
        if len(rows) != 1 or not _disposition(rows[0]).startswith("**Unknown**"):
            findings.append(f"{clause} Unknown row missing or not Unknown: {prefix}")

    sys.path.insert(0, str(ROOT / "scripts"))
    import build_three_surface_poc_spec_dependencies as generator

    reqs, errors = generator.parse(proposed[SPEC].decode("utf-8"))
    if not errors:
        union = {cid for _rid, warrants in reqs for cid in warrants["contracts"]}
        if union != clauses["A"]:
            findings.append(
                "Part A's clause set differs from the proposed contracts[] union: "
                f"only in Part A {sorted(clauses['A'] - union)}, "
                f"only in the union {sorted(union - clauses['A'])}"
            )
    if "**Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**" not in new:
        findings.append("the amendment disclosure for the preserved RFC1-26 row is missing")
    if "**Amendment disclosure — the RFC6-14 fold note.**" not in new:
        findings.append("the amendment disclosure for the signed RFC6-14 fold note is missing")
    findings.extend(totals_findings(new))
    return findings


#: Signed matrix prose lines that carry a computed figure; totals_findings
#: checks their replacements.
COMPUTED_LINES = (
    'table"]`: **122 consequence rows over 77 clauses — 98 covered,',
    "24 Unknown.**",
    "Part B2 total `[Observed, computed]`: **219 clauses.**",
    "  return 324 for RFC1–9, and 77 + 28 + 219 = 324.",
    "  `contracts[]` union (77 identifiers).",
)
TABLE_LINE = re.compile(r"^\| (?:RFC\d+[ -]|\*\*Total\*\* )")


def companion_findings(
    proposed: dict[pathlib.Path, bytes], current: dict[pathlib.Path, bytes]
) -> list[str]:
    proposal = proposed[PROPOSAL].decode("utf-8")
    findings = []
    lost = _lost_lines(current[PROPOSAL].decode("utf-8"), proposal, lambda line: False)
    if lost:
        findings.append(f"signed proposal line edited or removed: {lost[0]!r}")
    lost = _lost_lines(
        current[COVERAGE].decode("utf-8"),
        proposed[COVERAGE].decode("utf-8"),
        lambda line: line in COMPUTED_LINES or bool(TABLE_LINE.match(line)),
    )
    if lost:
        findings.append(f"signed matrix prose edited or removed: {lost[0]!r}")
    if PROPOSAL_HEADING not in proposal:
        findings.append("proposal does not carry the amendment section")
    if normalized(PROPOSAL_Q4) not in normalized(proposal):
        findings.append("proposal does not carry P-75 Q4's own-owner-act sentence")
    if normalized(PROPOSAL_DEFERRAL) not in normalized(proposal):
        findings.append("proposal does not say the identity and the three-state view are not specified")
    return findings


# --- the manifest ------------------------------------------------------------

def render(values: dict[pathlib.Path, bytes]) -> str:
    lines = [
        f"# {TITLE}",
        "# Candidate: binds nothing until the owner signs it off.",
        f"# {len(SUBJECTS)} artifacts; rows sorted by codepoint path.",
        "# All rows take effect together or none do.",
        "# Rows hash the PROPOSED bytes: current bytes with proposed/*.patch",
        "# applied. They match the tree only after --apply, the sign-off step.",
    ]
    lines.extend(f"{sha256(values[rel])}  {rel.as_posix()}" for rel in SUBJECTS)
    return "\n".join(lines) + "\n"


def verify_manifest(text: str, expected: str) -> list[str]:
    rows = ROW.findall(text)
    if [path for _digest, path in rows] != [path.as_posix() for path in SUBJECTS]:
        return ["manifest path population or order differs"]
    if text != expected:
        return ["manifest differs from exact regeneration over proposed bytes"]
    return []


def structure_findings(
    proposed: dict[pathlib.Path, bytes], current: dict[pathlib.Path, bytes]
) -> list[str]:
    return (
        spec_findings(proposed[SPEC], current[SPEC])
        + deferred_findings(proposed)
        + dependency_findings(proposed)
        + coverage_findings(proposed, current)
        + companion_findings(proposed, current)
    )


def subject_change_findings(
    proposed: dict[pathlib.Path, bytes], current: dict[pathlib.Path, bytes]
) -> list[str]:
    findings = []
    for rel in SUBJECTS:
        changed = proposed[rel] != current[rel]
        if changed and rel not in PATCHED:
            findings.append(f"undeclared subject change: {rel}")
        if not changed and rel in PATCHED:
            findings.append(f"declared patched subject is unchanged: {rel}")
    return findings


def check() -> list[str]:
    findings: list[str] = []
    patches = patch_files()
    if [patch.name for patch in patches] != sorted(f"{path.name}.patch" for path in PATCHED):
        findings.append("proposed patch population differs from declared subjects")
    try:
        proposed = proposed_bytes()
    except ValueError as error:
        return findings + [str(error)]
    current = current_bytes()
    findings.extend(subject_change_findings(proposed, current))
    findings.extend(structure_findings(proposed, current))
    target = ROOT / MANIFEST_OUT
    if not target.is_file():
        findings.append(f"manifest missing: {MANIFEST_OUT}")
    else:
        findings.extend(verify_manifest(target.read_text(encoding="utf-8"), render(proposed)))
    return findings


# --- selftest ----------------------------------------------------------------

def _replace(data: bytes, old: str, new: str) -> bytes:
    if data.count(old.encode("utf-8")) != 1:
        raise AssertionError(f"selftest fixture must match exactly once: {old[:60]!r}")
    return data.replace(old.encode("utf-8"), new.encode("utf-8"), 1)


def build_mutants(
    proposed: dict[pathlib.Path, bytes],
) -> dict[str, tuple[pathlib.Path, bytes, str]]:
    """Every fixture is built here, before any mutant runs, so a fixture that
    matches nothing fails the selftest loudly instead of scoring a survivor."""
    spec, cov = proposed[SPEC].decode("utf-8"), proposed[COVERAGE].decode("utf-8")
    first_052 = spec.index("### Requirement: POC-REQ-052")
    req_055 = spec.index("### Requirement: POC-REQ-055")
    req_060 = spec.index("### Requirement: POC-REQ-060")
    S, C, P, D = SPEC, COVERAGE, PROPOSAL, DEPENDENCIES
    p055 = "POC-REQ-055 lacks "
    p060 = "POC-REQ-060 lacks "
    return {
        # population and placement
        "new requirement missing": (
            S, (spec[:req_055] + spec[req_060:]).encode("utf-8"),
            "requirement population or order differs",
        ),
        "new requirement misplaced": (
            S, (spec[:first_052] + spec[req_055:req_060] + spec[first_052:req_055] + spec[req_060:]).encode("utf-8"),
            "requirement population or order differs",
        ),
        "deferred identity requirement minted": (
            S, _replace(proposed[S], "### Requirement: POC-REQ-055 — Every relationship", "### Requirement: POC-REQ-054 — Every relationship"),
            "requirement population or order differs",
        ),
        "deferred identity named in the matrix": (
            C, _replace(proposed[C], "| covered — Amendment row (vocabulary and record shape); the oracle observes naming-or-flag, not closure | POC-REQ-055 |", "| covered — Amendment row (vocabulary and record shape); the oracle observes naming-or-flag, not closure | POC-REQ-054, POC-REQ-055 |"),
            "CONTRACT-COVERAGE.md names the deferred POC-REQ-054",
        ),
        "unrelated requirement drift": (
            S, _replace(proposed[S], "Orrery SHALL NOT render an edge", "Orrery SHALL NOT draw an edge"),
            "POC-REQ-052 changed; the amendment touches only POC-REQ-055 and POC-REQ-060",
        ),
        "governing-intent requirement drift": (
            S, _replace(proposed[S], "declared table of POC-REQ-060 gives Unknown, never with an encoding for a", "declared table gives Unknown, never with an encoding for a"),
            "POC-REQ-014 changed; the amendment touches only POC-REQ-055 and POC-REQ-060",
        ),
        "Purpose changed": (
            S, _replace(proposed[S], "three honest, visually distinct surface experiences", "three honest surface experiences"),
            "the specification's title, banner or Purpose changed",
        ),
        # POC-REQ-055
        "055 regrouped": (
            S, _replace(proposed[S], "Group: Cross-cutting experience. Form: **invariant**.\n\n**Required behavior.** Every relationship", "Group: Orrery. Form: **invariant**.\n\n**Required behavior.** Every relationship"),
            p055 + "cross-cutting group",
        ),
        "055 closed name without roles": (
            S, _replace(proposed[S], "carry a relation name from RFC1-25's closed table, emitted with its source and\ntarget in the roles that table assigns the relation", "carry a relation name from RFC1-25's closed table"),
            p055 + "closed-table name in its roles",
        ),
        "055 flag without a reason": (
            S, _replace(proposed[S], "outside-closed-vocabulary flag with a stated reason.", "outside-closed-vocabulary flag."),
            p055 + "outside flag with a reason",
        ),
        "055 scenario renamed": (
            S, _replace(proposed[S], "#### Scenario: A kind outside the closed table is disclosed", "#### Scenario: A kind outside the table"),
            p055 + "disclosure scenario",
        ),
        "055 flag widens the vocabulary": (
            S, _replace(proposed[S], "it never adds a kind or a role pair to that vocabulary.", "it adds the kind to that vocabulary."),
            p055 + "flag never widens the vocabulary",
        ),
        "055 correspondence dropped": (
            S, _replace(proposed[S], "target in the roles that table assigns the relation — read through a\nchecked-in declaration that maps each shared-model entity kind to the RFC 0001\nclass it corresponds to, or to none — or carry", "target in the roles that table assigns the relation, or carry"),
            p055 + "declared kind-to-class correspondence",
        ),
        "055 flag not rendered": (
            S, _replace(proposed[S], "SHALL be carried in the machine answer and rendered in every rendered element\nthat marks the relationship;", "SHALL be carried in the machine answer;"),
            p055 + "flag carried and rendered",
        ),
        "055 role pairs undecided": (
            S, _replace(proposed[S], "table, zero unflagged relationships whose mapped role pair the table\n  does not assign that relation, zero flagged", "table, zero flagged"),
            p055 + "unassigned role pairs decide",
        ),
        "055 over-flagging passes": (
            S, _replace(proposed[S], "zero flagged relationships whose kind\n  and mapped role pair the table assigns, and zero", "and zero"),
            p055 + "admitted relationships never flagged",
        ),
        "055 reversed roles pass": (
            S, _replace(proposed[S], " (reversed roles included)", ""),
            p055 + "reversed roles falsify",
        ),
        "055 literals imported": (
            S, _replace(proposed[S], "none is\n  imported from the model", "each is\n  imported from the model"),
            p055 + "literals never imported from the model",
        ),
        "055 marker attribution dropped": (
            S, _replace(proposed[S], " an element marks a relationship when it carries\nthe relationship's served `id` in one of the surfaces' declared relationship\nmarkers.", " an element marks a relationship when it renders it."),
            p055 + "a marker names the relationship's served id",
        ),
        "055 unmarked renderings claimed": (
            S, _replace(proposed[S], " A\nrendering of a relationship that carries no declared relationship marker is\noutside this requirement's sweep.", ""),
            p055 + "unmarked renderings outside the sweep",
        ),
        "055 marker denominator dropped": (
            S, _replace(proposed[S], "it loads each surface and extracts every\n  rendered element carrying a declared relationship marker — the\n  denominator is the complete marker population, which the check counts\n  and reports — and checks every flagged relationship for a non-empty\n  reason in the machine answer and in every element that marks it.", "it checks every flagged relationship for a non-empty\n  reason in the machine answer and beside every rendering."),
            p055 + "marker population is the rendering denominator",
        ),
        "055 warrants drop the ruling key": (
            S, _replace(proposed[S], "  contracts: [RFC1-25, RFC1-26]\n  policies: []\n  decisions: [POC-DIR-2026-09-21]", "  contracts: [RFC1-25, RFC1-26]\n  policies: []\n  decisions: [POC-DIR-2026-08-30]"),
            "POC-REQ-055 warrants do not cite ruling P-75's decision key",
        ),
        # POC-REQ-060
        "060 regrouped": (
            S, _replace(proposed[S], "Group: Cross-cutting experience. Form: **invariant**.\n\n**Required behavior.** The three surfaces SHALL draw", "Group: Polaris. Form: **invariant**.\n\n**Required behavior.** The three surfaces SHALL draw"),
            p060 + "cross-cutting group",
        ),
        "060 Inferred encoded like Observed": (
            S, _replace(proposed[S], "SHALL render with the declared table's Inferred entry in\nevery rendered element that marks its record;", "MAY render with the Observed encoding;"),
            p060 + "Inferred encoded distinctly",
        ),
        "060 signed scenario renamed": (
            S, _replace(proposed[S], "#### Scenario: Unknown looks the same everywhere", "#### Scenario: Unknown looks alike"),
            p060 + "signed scenario kept",
        ),
        "060 Inferred scenario renamed": (
            S, _replace(proposed[S], "#### Scenario: An agent assertion stays Inferred", "#### Scenario: An agent assertion"),
            p060 + "Inferred scenario heading",
        ),
        "060 Inferred label dropped": (
            S, _replace(proposed[S], "encode epistemic states (Observed, Inferred, Unknown,\nand their reasons)", "encode epistemic states (Observed, Unknown,\nand their reasons)"),
            p060 + "three labels encoded",
        ),
        "060 relationships leave the record shape": (
            S, _replace(proposed[S], "Every entity and every\nrelationship the shared model holds SHALL carry", "Every entity the\nshared model holds SHALL carry"),
            p060 + "entities and relationships carry one record shape",
        ),
        "060 tier made mandatory": (
            S, _replace(proposed[S], "a rendering tier, where the record\ncarries one, from", "a rendering tier from"),
            p060 + "tier only where carried, inside its parent",
        ),
        "060 Unknown route dropped": (
            S, _replace(proposed[S], "closed twelve with its resolution route. The declared", "closed twelve. The declared"),
            p060 + "closed reasons with a route",
        ),
        "060 Inferred counted as Observed": (
            S, _replace(proposed[S], "SHALL never count\ntoward an Observed total or clear an Unknown,", "MAY count\ntoward an Observed total,"),
            p060 + "Inferred never Observed or clearing",
        ),
        "060 Inferred names nothing": (
            S, _replace(proposed[S], " SHALL name the agent assertion\nit arises from, and SHALL render", " and SHALL render"),
            p060 + "Inferred names its assertion",
        ),
        "060 Inferred from any source": (
            S, _replace(proposed[S], "An\nInferred state SHALL arise only from an agent's assertion,", "An\nInferred state MAY arise from any source,"),
            p060 + "Inferred only from an agent",
        ),
        "060 population unbounded": (
            S, _replace(proposed[S], " No other epistemic value the machine answer serves is\n  in the record-shape population.", ""),
            p060 + "record-shape population bounded",
        ),
        "060 records counted instead of objects": (
            S, _replace(proposed[S], "it\n  enumerates every element of the machine answer's entity and\n  relationship lists — the denominator is that population — checks that\n  each carries exactly one epistemic record,", "it\n  enumerates every epistemic record in the machine answer,"),
            p060 + "lists are the record denominator",
        ),
        "060 fixture limb dropped": (
            S, _replace(proposed[S], " While no agent\n  has asserted anything, the Inferred limbs are exercised by a fixture\n  record injected at the model seam;", " Then"),
            p060 + "Inferred fixture limb",
        ),
        "060 Observed totals not recounted": (
            S, _replace(proposed[S], "a recount of every Observed total without\n  it, each of which must equal the count served with it,", "a sample of one Observed total,"),
            p060 + "Observed totals recounted",
        ),
        "060 Unknown records not recounted": (
            S, _replace(proposed[S], "a recount of\n  the entity and relationship records labelled Unknown with and without\n  it, whose two sets,", "a count of\n  Unknown records, whose two sets,"),
            p060 + "Unknown records recounted",
        ),
        "060 Unknown sets compared by count": (
            S, _replace(proposed[S], "each member keyed by the list it is served in and\n  the identifier the machine answer serves it under", "each member named by\n  the identifier the machine answer serves it under"),
            p060 + "Unknown sets compared by list and served identifier",
        ),
        "060 missing record passes": (
            S, _replace(proposed[S], "an entity or relationship with no epistemic record or with more\n  than one; ", ""),
            p060 + "a missing record falsifies",
        ),
        "060 Inferred scenario keeps no Unknown": (
            S, _replace(proposed[S], "changes no Observed total the machine answer serves,\n  leaves every Unknown entity and relationship record in the machine\n  answer Unknown, and renders", "changes no Observed total the machine answer serves,\n  and renders"),
            p060 + "Inferred scenario leaves every Unknown",
        ),
        "060 label entries may coincide": (
            S, _replace(proposed[S], " The declared token/encoding table\nSHALL give Observed, Inferred and Unknown three pairwise distinct entries.", ""),
            p060 + "label entries pairwise distinct",
        ),
        "060 label entries not compared": (
            S, _replace(proposed[S], " a pairwise\n  comparison of the table's Observed, Inferred and Unknown entries, and", " and"),
            p060 + "label entries compared",
        ),
        "060 shared model read directly": (
            S, _replace(proposed[S], " The shared model's records are observed\n  through the machine answer,", " The shared model's records are read\n  directly,"),
            p060 + "shared model observed through the machine answer",
        ),
        "060 Observed total undefined": (
            S, _replace(proposed[S], " An Observed\n  total is every count the machine answer serves, except a count the\n  machine answer declares to be of Inferred records.", ""),
            p060 + "Observed totals named",
        ),
        "060 Inferred marker denominator dropped": (
            S, _replace(proposed[S], "; for that record the checker\n  extracts every rendered element carrying a declared record marker that\n  names it — the denominator is that marker population, which the check\n  counts and reports.", "."),
            p060 + "Inferred marker denominator",
        ),
        "060 signed scenario edited": (
            S, _replace(proposed[S], "- **THEN** all three render it with the declared Unknown encoding from\n  the shared token set", "- **THEN** all three render it with an Unknown encoding"),
            "POC-REQ-060's signed scenario is not preserved verbatim",
        ),
        "060 warrants drop the ruling key": (
            S, _replace(proposed[S], "  decisions: [POC-DIR-2026-08-30, POC-DIR-2026-09-21]", "  decisions: [POC-DIR-2026-08-30]"),
            "POC-REQ-060 warrants do not cite ruling P-75's decision key",
        ),
        # reader notes
        "decision key undefined": (
            S, _replace(proposed[S], "`POC-DIR-2026-09-21`\n  names", "`POC-DIR-2026-09-22`\n  names"),
            "reader notes do not define the POC-DIR-2026-09-21 decision key",
        ),
        "reader-notes signed line edited": (
            S, _replace(proposed[S], "Each requirement ends with a machine-readable", "Each requirement may end with a machine-readable"),
            "signed reader-notes line edited or removed",
        ),
        "reader-notes group range edited": (
            S, _replace(proposed[S], "*Cross-cutting experience* (055, 060–061).", "*Cross-cutting experience* (060–061)."),
            "reader notes lack the cross-cutting group range",
        ),
        "reader-notes placement sentence dropped": (
            S, _replace(proposed[S], "range does not place it in the Orrery group; its `Group` line places it\n  in *Cross-cutting experience*.", "range does not place it in the Orrery group, its `Group` line does."),
            "reader notes lack the Group-line placement sentence",
        ),
        "reader-notes signed key dropped": (
            S, _replace(proposed[S], "`THREE-SURFACE-POC-MODE-DIRECTION.md`, `POC-DIR-2026-08-30` names", "`THREE-SURFACE-POC-MODE-DIRECTION.md`, `POC-DIR-2026-08-31` names"),
            "reader notes lack the signed decision keys",
        ),
        # coverage matrix
        "bound row edited": (
            C, _replace(proposed[C], BOUND_ROW, BOUND_ROW.replace("covered | POC-REQ-052", "covered | POC-REQ-055")),
            "the signed RFC1-26 closure row ruling P-75 Q3 names is not preserved exactly once",
        ),
        "signed row edited elsewhere": (
            C, _replace(proposed[C], "| RFC9-48 | A tabular/non-3D equivalent", "| RFC9-48 | A tabular equivalent"),
            "signed Part A row edited or removed: RFC9-48",
        ),
        "deferred clause moved out of Part B2": (
            C, "\n".join(line for line in cov.split("\n") if not line.startswith("| RFC6-1 |")).encode("utf-8"),
            "signed Part B2 row edited or removed: RFC6-1",
        ),
        "unmarked added row": (
            C, _replace(proposed[C], "| covered — Amendment row (vocabulary and record shape); the oracle observes naming-or-flag, not closure |", "| covered — the oracle observes naming-or-flag, not closure |"),
            "added Part A row does not say it is an amendment row: RFC1-25",
        ),
        "moved clause kept in B2": (
            C, _replace(proposed[C], "| RFC2-26 | The RFC-vs-OpenSpec", "| RFC2-25 | Six-tier claim-rendering registry |\n| RFC2-26 | The RFC-vs-OpenSpec"),
            "clauses in both Part A and Part B2: ['RFC2-25']",
        ),
        "Part A union drift": (
            C, "\n".join(line for line in cov.split("\n") if not line.startswith("| RFC2-25 |")).encode("utf-8"),
            "Part A's clause set differs from the proposed contracts[] union",
        ),
        "closure claimed covered": (
            C, _replace(proposed[C], "| No relation outside the closed table is emitted at all | **Unknown** —", "| No relation outside the closed table is emitted at all | covered —"),
            "RFC1-26 Unknown row missing or not Unknown: No relation outside the closed table is emitted at all",
        ),
        "correspondence claimed covered": (
            C, _replace(proposed[C], "| The declared kind-to-class correspondence matches RFC 0001's class definitions | **Unknown** —", "| The declared kind-to-class correspondence matches RFC 0001's class definitions | covered —"),
            "RFC1-25 Unknown row missing or not Unknown: The declared kind-to-class correspondence matches RFC 0001's class definitions",
        ),
        "outside-list Unknown row dropped": (
            C, "\n".join(line for line in cov.split("\n") if not line.startswith("| RFC6-14 | Every claim instance,")).encode("utf-8"),
            "RFC6-14 Unknown row missing or not Unknown: Every claim instance, and every other epistemic value the machine answer serves outside its entity and relationship lists, carries the same record",
        ),
        "outside-list clearing claimed covered": (
            C, _replace(proposed[C], "outside the machine answer's entity and relationship lists | **Unknown** —", "outside the machine answer's entity and relationship lists | covered —"),
            "RFC2-25 Unknown row missing or not Unknown: An `asserted-by-worker` claim clears no Unknown outside the machine answer's entity and relationship lists",
        ),
        "unmarked relationship rendering claimed covered": (
            C, _replace(proposed[C], "carries no declared relationship marker shows its flag and reason there | **Unknown** —", "carries no declared relationship marker shows its flag and reason there | covered —"),
            "RFC1-26 Unknown row missing or not Unknown: A flagged relationship rendered in an element that carries no declared relationship marker shows its flag and reason there",
        ),
        "unmarked Inferred rendering claimed covered": (
            C, _replace(proposed[C], "in a rendering that carries no declared record marker | **Unknown** —", "in a rendering that carries no declared record marker | covered —"),
            "RFC2-25 Unknown row missing or not Unknown: An `asserted-by-worker` claim renders unlike Observed in a rendering that carries no declared record marker",
        ),
        "tier Semantics row dropped": (
            C, "\n".join(line for line in cov.split("\n") if not line.startswith("| RFC2-25 | A record carries a tier only where")).encode("utf-8"),
            "RFC2-25 Unknown row missing or not Unknown: A record carries a tier only where that tier's Semantics column holds",
        ),
        "disclosure row widened to every rendering": (
            C, _replace(proposed[C], ", in the machine answer and in every rendered element that marks it with a declared relationship marker, never presented", ", wherever it is rendered, never presented"),
            "RFC1-26 amendment rows lack the marked-rendering disclosure",
        ),
        "never-green row widened to every rendering": (
            C, _replace(proposed[C], "which differs from its Observed entry, in every rendered element that marks it with a declared record marker |", "which differs from its Observed entry, wherever it is rendered |"),
            "RFC2-25 amendment rows lack the marked-rendering encoding",
        ),
        "correspondence author unstated": (
            C, _replace(proposed[C], ", the slice that emits the relationships also writes it,", ","),
            "RFC1-25 amendment rows lack the slice-written correspondence",
        ),
        "never-green reading untagged": (
            C, _replace(proposed[C], "; `[Inferred]` the covered reading of", "; the covered reading of"),
            "RFC2-25 amendment rows lack the Inferred reading of never green",
        ),
        "status-input row widened": (
            C, _replace(proposed[C], "and it clears no Unknown among the machine answer's entity and relationship records |", "and it clears no Unknown |"),
            "RFC2-25 amendment rows lack the bounded Unknown recount",
        ),
        "RFC6-14 denominator dropped": (
            C, _replace(proposed[C], "; POC-REQ-060's denominator is every element of the machine answer's entity and relationship lists, not the records that exist |", " |"),
            "RFC6-14 amendment rows lack the list denominator",
        ),
        "closure disclosure dropped": (
            C, _replace(proposed[C], "**Amendment disclosure — the RFC1-26 closure row (ruling P-75 Q3).**", "**Note.**"),
            "the amendment disclosure for the preserved RFC1-26 row is missing",
        ),
        "RFC6-14 disclosure dropped": (
            C, _replace(proposed[C], "**Amendment disclosure — the RFC6-14 fold note.**", "**Note.**"),
            "the amendment disclosure for the signed RFC6-14 fold note is missing",
        ),
        "computed total drift": (
            C, _replace(proposed[C], "105 covered,", "106 covered,"),
            "Part A totals is not the computed figure",
        ),
        "family table drift": (
            C, _replace(proposed[C], "| RFC2 | 27 | 8 | 0 | 19 |", "| RFC2 | 27 | 7 | 0 | 20 |"),
            "family table RFC2 reads",
        ),
        "matrix banner edited": (
            C, _replace(proposed[C], "**No N/A is minted on the author's authority.**", "**N/A may be minted.**"),
            "signed matrix prose edited or removed",
        ),
        # companions
        "dependency drift": (
            D, _replace(proposed[D], "26 requirement(s)", "27 requirement(s)"),
            "proposed GOVERNING-DEPENDENCIES.md differs from regeneration",
        ),
        "proposal heading renamed": (
            P, _replace(proposed[P], "## Acceptance inputs", "## Inputs"),
            "signed proposal line edited or removed",
        ),
        "proposal amendment section renamed": (
            P, _replace(proposed[P], PROPOSAL_HEADING, "## Amendment"),
            "proposal does not carry the amendment section",
        ),
        "proposal Q4 sentence deleted": (
            P, _replace(proposed[P], "production; that needs its own owner act. ", "production. "),
            "proposal does not carry P-75 Q4's own-owner-act sentence",
        ),
        "proposal deferral deleted": (
            P, _replace(proposed[P], "\nA subject identity shared across the surfaces, and a per-claim view of the\ndesired, execution and observed states, are not specified here.", ""),
            "proposal does not say the identity and the three-state view are not specified",
        ),
    }


def selftest() -> int:
    proposed = proposed_bytes()
    current = current_bytes()
    baseline = structure_findings(proposed, current)
    if baseline:
        print(f"SELFTEST FAILED: the package does not verify before mutation: {baseline}")
        return 1
    try:
        mutants = build_mutants(proposed)
    except AssertionError as error:
        print(f"SELFTEST FAILED: {error}")
        return 1
    expectations = {expected for _rel, _mutated, expected in mutants.values()}
    guards = (
        [f"{rid} lacks {label}" for rid, pairs in REQUIRED_PHRASES.items() for label, _ in pairs]
        + [f"{clause} amendment rows lack {label}" for clause, label, _ in COVERAGE_ROW_PHRASES]
        + [f"{clause} Unknown row missing or not Unknown: {prefix}" for clause, prefix in UNKNOWN_ROWS]
        + [f"reader notes lack {label}" for label, _ in READER_NOTE_PHRASES]
    )
    unmutated = [guard for guard in guards if guard not in expectations]
    if unmutated:
        print(f"SELFTEST FAILED: guards with no mutant of their own: {unmutated}")
        return 1
    for name, (rel, mutated, expected) in mutants.items():
        values = dict(proposed)
        values[rel] = mutated
        found = structure_findings(values, current)
        if mutated == proposed[rel] or not any(f.startswith(expected) for f in found):
            print(f"SELFTEST FAILED: {name} did not fail on its predicate ({expected!r}); found {found}")
            return 1
    unpatched = next(rel for rel in SUBJECTS if rel not in PATCHED)
    drifted_subject = dict(proposed)
    drifted_subject[unpatched] = proposed[unpatched] + b"\nsubject drift\n"
    if not any(f.startswith("undeclared subject change") for f in subject_change_findings(drifted_subject, current)):
        print("SELFTEST FAILED: an undeclared subject change passed")
        return 1
    if not any(f.startswith("declared patched subject is unchanged") for f in subject_change_findings(current, current)):
        print("SELFTEST FAILED: an unchanged patched subject passed")
        return 1
    with tempfile.TemporaryDirectory() as scratch:
        broken = pathlib.Path(scratch) / "spec.md.patch"
        original = (ROOT / PROPOSED / "spec.md.patch").read_text(encoding="utf-8")
        context = next(line for line in original.splitlines() if line.startswith(" ") and line.strip())
        broken.write_text(original.replace(context, context + " drifted", 1), encoding="utf-8")
        try:
            proposed_bytes(patches=[broken])
        except ValueError:
            pass
        else:
            print("SELFTEST FAILED: a drifted patch applied")
            return 1
    manifest = render(proposed)
    rows = ROW.findall(manifest)
    reordered = manifest.replace(
        f"{rows[0][0]}  {rows[0][1]}\n{rows[1][0]}  {rows[1][1]}",
        f"{rows[1][0]}  {rows[1][1]}\n{rows[0][0]}  {rows[0][1]}",
    )
    if verify_manifest(reordered, manifest) != ["manifest path population or order differs"]:
        print("SELFTEST FAILED: manifest path-order mutation passed")
        return 1
    drifted = render(proposed_bytes({unpatched: current[unpatched] + b"\nsubject drift\n"}))
    if verify_manifest(drifted, manifest) != ["manifest differs from exact regeneration over proposed bytes"]:
        print("SELFTEST FAILED: subject drift did not stale the manifest")
        return 1
    print(
        f"selftest: {len(mutants)} structure mutants, two subject-change mutants, "
        "patch drift, manifest order and subject drift all fail closed on their "
        "own predicates"
    )
    return 0


# --- entry -------------------------------------------------------------------

def apply(at_adoption: bool) -> int:
    if not at_adoption:
        print(
            "refusing: --apply is a sign-off-time operation; pass --at-adoption "
            "only in the owner's sign-off change"
        )
        return 2
    findings = check()
    if findings:
        print("refusing to apply: package does not verify")
        for finding in findings:
            print(f"  {finding}")
        return 1
    proposed = proposed_bytes()
    for rel in PATCHED:
        (ROOT / rel).write_bytes(proposed[rel])
        print(f"applied {rel.as_posix()}")
    return 0


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n\n")[0])
    parser.add_argument("--check", action="store_true")
    parser.add_argument("--selftest", action="store_true")
    parser.add_argument("--diff", action="store_true")
    parser.add_argument("--write", action="store_true")
    parser.add_argument("--apply", action="store_true")
    parser.add_argument("--at-adoption", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        import pwb_signed_selftest
        rerun = pwb_signed_selftest.rerun_before_signoff(
            __file__,
            ".syzygy/governance/decisions/THREE-SURFACE-POC-VOCABULARY-EPISTEMIC-AMENDMENT-SIGNOFF-v1.0.md",
            "a4a864e657d586e783fb3f5febc1ad9a990a34bd")
        if rerun is not None:
            return rerun
        return selftest()
    if args.diff:
        for patch in patch_files():
            sys.stdout.write(patch.read_text(encoding="utf-8"))
        return 0
    if args.apply:
        return apply(args.at_adoption)
    if args.check:
        findings = check()
        if findings:
            print("Three-Surface POC vocabulary and epistemic-record amendment package does not verify:")
            for finding in findings:
                print(f"  {finding}")
            return 1
        proposed = proposed_bytes()
        totals = coverage_totals(proposed[COVERAGE].decode("utf-8"))
        requirements = len(REQ_HEADING.findall(proposed[SPEC].decode("utf-8")))
        print(
            "Three-Surface POC vocabulary and epistemic-record amendment manifest "
            f"matches {len(SUBJECTS)} proposed subjects ({len(PATCHED)} patched, "
            f"{len(SUBJECTS) - len(PATCHED)} unchanged); {requirements} requirements, "
            f"Part A {totals['a_clauses']} clauses over {totals['a_rows']} rows "
            f"({totals['a_covered']} covered, {totals['a_unknown']} Unknown); structure, "
            "regeneration and the preserved RFC1-26 row verify"
        )
        return 0
    if not args.write:
        print("refusing: pass --write to regenerate the manifest, or --check to verify it")
        return 2
    proposed = proposed_bytes()
    structure = structure_findings(proposed, current_bytes())
    if structure:
        for finding in structure:
            print(f"  {finding}")
        return 1
    target = ROOT / MANIFEST_OUT
    target.write_text(render(proposed), encoding="utf-8")
    print(f"wrote {MANIFEST_OUT.as_posix()}")
    return 0


if __name__ == "__main__":
    raise SystemExit(main(sys.argv[1:]))
