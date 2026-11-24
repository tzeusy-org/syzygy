#!/usr/bin/env python3
"""Build openspec/changes/dossier-coverage-hold/proposed/polaris-generation/spec.md (version 2.27, syzygy-5dhm.29).

One complete MODIFIED REQ-polaris-generation-035, rebuilt from the effective text: version 2.18's bytes
(openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md, sha256 asserted below), from its
requirement heading to the line before the next one. One paragraph is inserted after the version 2.18 paragraph and four
scenarios after the last scenario, and one case line after the Form block's falsifier line; every predecessor line is carried byte for byte, which the script asserts and prints.

Usage: python3 coverage_hold_build_spec.py <repository root> [--check]
"""
import hashlib
import sys
from pathlib import Path

PREDECESSOR = "openspec/changes/dossier-run-tree-read-bounds/proposed/polaris-generation/spec.md"
PREDECESSOR_SHA256 = "84fc7c71221705b6a2b614e3acf4496d10bb2e3ba4815c1e776ad450b3bc19a5"
TARGET = "openspec/changes/dossier-coverage-hold/proposed/polaris-generation/spec.md"
HEADING = "### Requirement: Fresh-context review in the operator-agent mode\n"
NEXT_HEADING = "### Requirement: Declared URL dossier supervisor\n"
PARAGRAPH_ANCHOR = "Since version 2.18 every reader of a file this requirement states"
SCENARIO_ANCHOR = "Form: lifecycle transition.\n"
FALSIFIER_ANCHOR = "- **Falsifier:** "
CASE = ("- **Case, oracle and falsifier (coverage hold):** A run whose inventory of record has an entry that a passed draft of schema v5 "
        "neither covers nor records as omitted, then the same draft with that entry represented, its path named in a claim block, or "
        "its omission recorded with a reason, and a draft of schema v4 leaving it uncovered; the oracle is the literal refusal stage "
        "`coverage`, the entry's identifier and path written in the fixture, and whether a packet file, session directory or delivery "
        "record exists after each command; a fidelity packet issued while the entry has no outcome, a refusal that names the entry's "
        "statement, or a refusal for the schema v4 draft or once the entry has an outcome falsifies it.\n")

HEAD = """# Dossier coverage hold

Candidate version 2.27. This amendment makes the fidelity review of REQ-polaris-generation-035 wait until every listed inventory entry has an outcome, for bead syzygy-5dhm.29 (pursuit 2026-11-21b, move R4 slice 2). It composes over the effective text of 035 (after version 2.18) and binds by its agent adoption and version tag.

## MODIFIED Requirements

"""

PARAGRAPH = """Since version 2.27 the fidelity review waits until every listed inventory entry has an outcome. Where the latest passed draft revision is of a draft schema that has `inventoryOmissions` (schema v5 and later), Syzygy SHALL NOT issue a fidelity packet, by `syzygy dossier review-packet`, by a review session's `session-prompt` or by a delivery to a waiting fidelity session (and so not by the URL supervisor of REQ-polaris-generation-048), while an entry of the inventory of record has no outcome in that draft. An entry has an outcome when the rule of check's inventory-coverage advice (REQ-polaris-generation-034 since version 2.12, `overlap-or-path-named`) finds a block of the draft's reading content covering it, or when the draft's `inventoryOmissions` records its identifier with a non-empty reason; an entry screening withholds (every span it cites withheld, or relying on a quotation from a withheld span) takes its outcome, `withheld`, from Syzygy and never holds the review. The refusal SHALL write no packet, session directory or delivery; SHALL have the stage `coverage`; SHALL name each entry without an outcome by its identifier and the distinct paths it cites only, never its statement, kind or line ranges, each written as a JSON string, a path a secret detector matches counted and never named, in one paragraph that names at most twelve entries and counts the rest and in a list of every one; and SHALL say in plain words what the author does next: represent each entry in a block that cites what it states, or record it in `inventoryOmissions` with the reason a reader of the dossier does not need it, and check the draft again. The URL supervisor SHALL tell the authoring session that refusal once for each pair of draft and inventory revisions and SHALL NOT count it as a refused delivery it retries or gives up on; where the draft has no repair cycle left, it SHALL end the run blocked, naming the hold. The hold settles only whether every entry has an outcome: the reviewer still judges every entry, every recorded omission and every claim block, and the hold SHALL NOT change a packet byte, a verdict rule, a screen or a disclosure. A draft of schema v2 to v4, which can record no omission, is issued as before; review check and the review of record rebuild the packet without the hold, so a verdict written for a packet issued before version 2.27 is validated and counted as before.

"""

SCENARIOS = """#### Scenario: Fidelity review waits for an entry without an outcome

- **WHEN** the latest passed draft revision, of draft schema v5 or later, cites no span overlapping a citation of inventory entry `e-snap`, names none of its paths in a claim block, and does not record `e-snap` in `inventoryOmissions`
- **THEN** `syzygy dossier review-packet --kind fidelity`, a fidelity review `session-prompt` and a delivery to a waiting fidelity session each refuse with the stage `coverage`, naming `"e-snap"` and the paths it cites and never its statement
- **AND** no packet, session directory or delivery record is written
- **AND** the refusal tells the author to represent the entry in a block that cites what it states, or record its omission with a reason, and check the draft again

#### Scenario: The review proceeds once every entry has an outcome

- **WHEN** a later passed draft revision represents that entry, names one of its paths in a claim block, or records it in `inventoryOmissions` with a non-empty reason
- **THEN** the fidelity packet is issued, with the bytes it would have without the hold
- **AND** the reviewer still judges the entry, and any recorded reason, from the packet

#### Scenario: Earlier drafts and withheld entries do not hold the review

- **WHEN** the latest passed draft revision is of draft schema v2, v3 or v4, or every entry without an outcome is one screening withholds
- **THEN** the fidelity packet is issued as before version 2.27

#### Scenario: The supervisor tells the author once

- **WHEN** the URL supervisor's delivery of a fidelity packet is refused with the stage `coverage`
- **THEN** it types the refusal into the authoring session once for that pair of draft and inventory revisions, and neither retries nor gives up on that delivery
- **AND** where the draft's repair cycles are spent it ends the run blocked, naming the hold

"""


def build(root: Path) -> bytes:
    source = (root / PREDECESSOR).read_bytes()
    digest = hashlib.sha256(source).hexdigest()
    if digest != PREDECESSOR_SHA256:
        raise SystemExit(f"{PREDECESSOR} has sha256 {digest}, not the asserted {PREDECESSOR_SHA256}")
    text = source.decode("utf-8")
    assert text.count(HEADING) == 1 and text.count(NEXT_HEADING) == 1
    block = text[text.index(HEADING):text.index(NEXT_HEADING)]
    assert block.count("ID: REQ-polaris-generation-035\n") == 1
    lines = block.splitlines(keepends=True)
    paragraph_at = [i for i, line in enumerate(lines) if line.startswith(PARAGRAPH_ANCHOR)]
    scenario_at = [i for i, line in enumerate(lines) if line == SCENARIO_ANCHOR]
    assert len(paragraph_at) == 1 and len(scenario_at) == 1
    p, s = paragraph_at[0], scenario_at[0]
    assert lines[p + 1] == "\n"
    falsifier_at = [i for i, line in enumerate(lines) if line.startswith(FALSIFIER_ANCHOR)]
    assert len(falsifier_at) == 1 and falsifier_at[0] > s
    f = falsifier_at[0]
    out = lines[:p + 2] + [PARAGRAPH] + lines[p + 2:s] + [SCENARIOS] + lines[s:f + 1] + [CASE] + lines[f + 1:]
    built = HEAD + "".join(out).rstrip("\n") + "\n"
    # Every predecessor line is carried byte for byte, in order.
    carried = [line for line in built.splitlines(keepends=True) if line in set(lines)]
    assert all(line in carried for line in lines)
    before = block.count("#### Scenario:")
    after = built.count("#### Scenario:")
    print(f"predecessor 035: {len(lines)} lines, {before} scenarios; successor: {after} scenarios (+{after - before})")
    return built.encode("utf-8")


def main() -> None:
    root = Path(sys.argv[1])
    built = build(root)
    target = root / TARGET
    if "--check" in sys.argv:
        if target.read_bytes() != built:
            raise SystemExit(f"{TARGET} differs from the build")
        print(f"{TARGET} matches the build")
        return
    target.parent.mkdir(parents=True, exist_ok=True)
    target.write_bytes(built)
    print(f"wrote {TARGET} sha256 {hashlib.sha256(built).hexdigest()}")


if __name__ == "__main__":
    main()
