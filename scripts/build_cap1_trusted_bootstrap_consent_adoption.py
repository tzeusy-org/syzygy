#!/usr/bin/env python3
# /// script
# requires-python = ">=3.11"
# ///
"""Check and apply the CAP1 trusted-bootstrap consent amendment's adoption (P-109).

The candidate `openspec/changes/cap1-trusted-bootstrap-consent/` fully
replaces CAP1-REQ-011 and CAP1-REQ-046 of the adopted Capability 1
specification. The predecessor's bytes are act-bound and are never edited:
the adopted amendment is an overlay, and the effective specification is the
composition its `GOVERNING-DEPENDENCIES.json` declares (the predecessor with
exactly those two requirement blocks replaced).

    --check      verify the package (pre-apply) or the applied overlay
    --apply      write the adoption overlay (the sign-off change only)
    --selftest   one rule-6 mutant per predicate, in scratch trees

Predicates, each mutated by the selftest:

- **subject**: every file the round-4 review subject
  (`docs/evidence/cap1-trusted-bootstrap-consent-2026-10-15/review-4-subject.json`)
  lists hashes as recorded, and the change directory holds exactly those
  files (plus `ADOPTION.md` once applied; `README.md` is then the adopted
  banner, compared byte for byte with its rendering);
- **baseline**: every protected predecessor in `BASELINE.json` hashes as
  recorded, so no act-bound byte moved;
- **composition**: the dependency record's source files hash as recorded,
  the composed specification hashes to `composed_spec_sha256`, it parses
  through `build_capability_1_spec_dependencies.parse()` to
  `requirement_count` requirements, and its warrant union per class equals
  the record's `dependencies`;
- **anchors**: each predecessor coverage surface the adoption supersedes
  (round-4 finding 1) is found by its literal in the bound
  `CONTRACT-COVERAGE.md`, exactly once;
- **figures**: the predecessor's RFC3 and total mapped counts equal the
  bound union, and the composed figures are computed from the composed
  union, never transcribed; the literal expectations 38 and 40 (round-4 raw,
  finding 1) are an independent oracle;
- **applied**: after `--apply`, `ADOPTION.md` and `README.md` equal their
  regeneration from the tree.
"""
from __future__ import annotations

import argparse
import hashlib
import json
import pathlib
import re
import shutil
import sys
import tempfile

ROOT = pathlib.Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

CHANGE = pathlib.Path("openspec/changes/cap1-trusted-bootstrap-consent")
PRED = pathlib.Path("openspec/changes/project-registration-and-honest-shape-visibility")
PRED_SPEC = PRED / "specs/project-registration-and-honest-shape-visibility/spec.md"
PRED_COVERAGE = PRED / "CONTRACT-COVERAGE.md"
PRED_DEPS = PRED / "GOVERNING-DEPENDENCIES.md"
CAND_SPEC = CHANGE / "specs/project-registration-and-honest-shape-visibility/spec.md"
CAND_COVERAGE = CHANGE / "CONTRACT-COVERAGE.md"
DEPS_JSON = CHANGE / "GOVERNING-DEPENDENCIES.json"
BASELINE = CHANGE / "BASELINE.json"
README = CHANGE / "README.md"
ADOPTION = CHANGE / "ADOPTION.md"
SUBJECT = pathlib.Path("docs/evidence/cap1-trusted-bootstrap-consent-2026-10-15/review-4-subject.json")
RECORD = pathlib.Path(".syzygy/governance/decisions/CAP1-TRUSTED-BOOTSTRAP-CONSENT-SIGNOFF-v1.0.md")
DIRECTION = pathlib.Path(".syzygy/governance/decisions/"
                         "OWNER-DIRECTION-SCOPE-A-CAP1-TRUSTED-BOOTSTRAP-CONSENT-2026-10-15.md")
IMPLEMENTATION = pathlib.Path(".syzygy/governance/decisions/"
                              "OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md")
REVIEW = pathlib.Path("docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-RAW.md")
DISPOSITION = pathlib.Path("docs/reviews/R-CAP1-TRUSTED-BOOTSTRAP-CONSENT-4-DISPOSITION.md")
TAG = "cap1-trusted-bootstrap-consent-v1.0"
REPLACED = ("CAP1-REQ-011", "CAP1-REQ-046")
#: Independent literals from the round-4 raw, finding 1 (never computed here).
EXPECTED_PREDECESSOR_CONTRACTS = 38
EXPECTED_COMPOSED_CONTRACTS = 40
EXPECTED_ADDED = ("RFC3-16(b)", "RFC3-16(c)")
#: The bound family table's RFC3 row (`| RFC3 | 38 | 11 | 27 |`, an anchor).
RFC3_ACCEPTED, RFC3_MAPPED_BEFORE = 38, 11

REQ_RE = re.compile(r"^### Requirement: (CAP1-REQ-\d{3}) — ", re.M)
#: The superseded surfaces of the bound predecessor coverage (round-4
#: finding 1), each found by an exact literal that must occur once.
ANCHORS = (
    ("RFC3-16(a) row", "| RFC3-16(a) | valid state (1) or state (2) acts are effective and disclosed; "
                       "other invalid acts fail closed | **Unknown**"),
    ("family table RFC3 row", "| RFC3 | 38 | 11 | 27 |"),
    ("family table total", "| **Total** | **324** | **38** | **286** |"),
    ("mapped sentence", "The 38 mapped clauses are exactly the `contracts[]` union in the"),
    ("unmapped sentence", "The 286 unmapped clauses are disposed in Part B."),
    ("Part A totals", "**65 consequence rows over 38 clauses — 63 covered, 2"),
    ("Part B applicability sentence", "believes the 286\nunmapped clauses"),
    ("Part B RFC3 line", "| RFC 0003 remainder | 27 |"),
    ("Part B total", "| **Total** | **286** | |"),
    ("self-check", "`contracts[]` union (38 identifiers), and 38 + 286 = 324."),
)


def sha256(data: bytes) -> str:
    return hashlib.sha256(data).hexdigest()


def read(root: pathlib.Path, rel: pathlib.Path) -> bytes:
    return (root / rel).read_bytes()


def blocks(text: str) -> dict[str, tuple[int, int]]:
    heads = list(REQ_RE.finditer(text))
    return {m.group(1): (m.start(), heads[i + 1].start() if i + 1 < len(heads) else len(text))
            for i, m in enumerate(heads)}


def compose(base: str, candidate: str) -> str:
    """The predecessor with exactly the replaced requirement blocks swapped
    for the candidate's (each block runs to the next requirement heading)."""
    cand = blocks(candidate)
    if sorted(cand) != sorted(REPLACED):
        raise ValueError(f"candidate spec replaces {sorted(cand)}, not {list(REPLACED)}")
    out = base
    for rid in REPLACED:
        have = blocks(out)
        if rid not in have:
            raise ValueError(f"predecessor has no {rid} block")
        start, end = have[rid]
        cstart, cend = cand[rid]
        out = out[:start] + candidate[cstart:cend] + out[end:]
    return out


def union(reqs, classes) -> dict[str, list[str]]:
    import build_capability_1_spec_dependencies as gen
    found = {cls: set() for cls in classes}
    for _rid, warrants in reqs:
        for cls in classes:
            found[cls].update(warrants[cls])
    return {cls: sorted(found[cls], key=gen.natkey) for cls in classes}


def composition(root: pathlib.Path) -> tuple[dict, list[str]]:
    """(figures, findings) for the composed specification."""
    import build_capability_1_spec_dependencies as gen
    findings: list[str] = []
    record = json.loads(read(root, DEPS_JSON))
    for rel, want in record["source_files"].items():
        path = root / rel
        if not path.is_file() or sha256(path.read_bytes()) != want:
            findings.append(f"composition source {rel} does not hash as recorded")
    if findings:
        return {}, findings
    composed = compose(read(root, PRED_SPEC).decode("utf-8"), read(root, CAND_SPEC).decode("utf-8"))
    if sha256(composed.encode("utf-8")) != record["composed_spec_sha256"]:
        findings.append("composed specification does not hash to composed_spec_sha256")
    reqs, errors = gen.parse(composed)
    if errors:
        return {}, findings + [f"composed specification does not parse: {errors[:2]}"]
    if len(reqs) != record["requirement_count"]:
        findings.append(f"composed specification has {len(reqs)} requirements, "
                        f"record says {record['requirement_count']}")
    composed_union = union(reqs, gen.CLASSES)
    if composed_union != record["dependencies"]:
        findings.append("composed warrant union differs from the recorded dependencies")
    base_reqs, base_errors = gen.parse(read(root, PRED_SPEC).decode("utf-8"))
    if base_errors:
        return {}, findings + ["predecessor specification does not parse"]
    base_union = union(base_reqs, gen.CLASSES)
    before, after = base_union["contracts"], composed_union["contracts"]
    figures = {
        "requirements": len(reqs),
        "before": len(before), "after": len(after),
        "added": sorted(set(after) - set(before), key=gen.natkey),
        "removed": sorted(set(before) - set(after), key=gen.natkey),
        "rfc3_before": sum(1 for x in before if x.startswith("RFC3-")),
        "rfc3_after": sum(1 for x in after if x.startswith("RFC3-")),
        "scenarios_before": len(re.findall(r"^#### Scenario:", read(root, PRED_SPEC).decode(), re.M)),
        "scenarios_after": len(re.findall(r"^#### Scenario:", composed, re.M)),
    }
    if (figures["before"], figures["after"]) != (EXPECTED_PREDECESSOR_CONTRACTS,
                                                 EXPECTED_COMPOSED_CONTRACTS):
        findings.append(f"contract union moves {figures['before']} -> {figures['after']}, "
                        f"not {EXPECTED_PREDECESSOR_CONTRACTS} -> {EXPECTED_COMPOSED_CONTRACTS}")
    if tuple(figures["added"]) != EXPECTED_ADDED or figures["removed"]:
        findings.append(f"contract union adds {figures['added']} and removes "
                        f"{figures['removed']}, not exactly {list(EXPECTED_ADDED)}")
    if figures["rfc3_before"] != RFC3_MAPPED_BEFORE:
        findings.append(f"bound union maps {figures['rfc3_before']} RFC3 clauses, "
                        f"the bound family table says {RFC3_MAPPED_BEFORE}")
    pred_deps = read(root, PRED_DEPS).decode("utf-8")
    if f"## contracts ({figures['before']})" not in pred_deps:
        findings.append("bound GOVERNING-DEPENDENCIES.md does not carry the predecessor contract count")
    return figures, findings


def anchors(root: pathlib.Path) -> tuple[dict[str, int], list[str]]:
    """Line number of each superseded surface in the bound coverage."""
    text = read(root, PRED_COVERAGE).decode("utf-8")
    lines, findings = {}, []
    for name, literal in ANCHORS:
        count = text.count(literal)
        if count != 1:
            findings.append(f"superseded surface '{name}' occurs {count} times in "
                            f"{PRED_COVERAGE.as_posix()}, not once")
            continue
        lines[name] = text[:text.index(literal)].count("\n") + 1
    return lines, findings


def overlay_rows(root: pathlib.Path) -> tuple[int, dict[str, int]]:
    """Rows of the candidate overlay's replacement table and their
    disposition classes (`covered…`, `Unknown…`, any other wording)."""
    text = read(root, CAND_COVERAGE).decode("utf-8")
    section = text.split("## Proposed scoped replacement and additional consequences", 1)[1]
    rows = [line for line in section.splitlines() if line.startswith("| RFC")]
    classes = {"covered": 0, "Unknown": 0, "other": 0}
    for row in rows:
        cell = row.rstrip(" |").rsplit("|", 1)[1].strip()
        key = "covered" if cell.startswith("covered") else (
            "Unknown" if cell.startswith("Unknown") else "other")
        classes[key] += 1
    return len(rows), classes


def subject_findings(root: pathlib.Path, applied: bool) -> list[str]:
    subject = json.loads(read(root, SUBJECT))
    findings = []
    for rel, want in subject.items():
        if applied and rel == "README.md":
            continue
        path = root / CHANGE / rel
        if not path.is_file() or sha256(path.read_bytes()) != want:
            findings.append(f"reviewed file {rel} does not hash as the review-4 subject records")
    present = sorted(p.relative_to(root / CHANGE).as_posix()
                     for p in (root / CHANGE).rglob("*") if p.is_file())
    expected = sorted(set(subject) | ({"ADOPTION.md"} if applied else set()))
    if present != expected:
        findings.append(f"change directory files {sorted(set(present) ^ set(expected))} "
                        "differ from the reviewed population")
    return findings


def baseline_findings(root: pathlib.Path) -> list[str]:
    record = json.loads(read(root, BASELINE))
    return [f"protected predecessor {row['path']} moved"
            for row in record["protected_predecessors"]
            if not (root / row["path"]).is_file()
            or sha256(read(root, pathlib.Path(row["path"]))) != row["sha256"]]


def render_readme() -> str:
    return f"""# cap1-trusted-bootstrap-consent

> **Adopted v1.0, 2026-10-15, by version tag under Scope A** — the owner's
> selection "Adopt P-109 v1.0", recorded in
> `{RECORD.as_posix()}`
> (annotated tag `{TAG}`). It fully replaces CAP1-REQ-011 and CAP1-REQ-046
> of the adopted Capability 1 specification, whose bound bytes are not
> edited. Read `ADOPTION.md` first: it states the effective composition and
> the predecessor coverage surfaces this adoption supersedes. The other
> files here keep their drafting heads ("Candidate", "Non-effective
> proposal"); as of 2026-10-15 those heads are history, and this banner and
> `ADOPTION.md` govern how they are read.

Consent-specific CAP1 amendment; the owner authorized drafting and
independent review only on 2026-09-14, and adopted v1.0 on 2026-10-15.
Implementation is authorized separately, bounded, by
`{IMPLEMENTATION.as_posix()}`.
"""


def render_adoption(root: pathlib.Path) -> str:
    figures, _ = composition(root)
    lines, _ = anchors(root)
    n_rows, classes = overlay_rows(root)
    f = figures
    rfc3_unmapped_after = RFC3_ACCEPTED - f["rfc3_after"]
    unmapped_after = 324 - f["after"]
    at = lambda name: f"line {lines[name]}"  # noqa: E731
    added = " and ".join(f"`{x}`" for x in f["added"])
    return f"""# Adoption overlay — cap1-trusted-bootstrap-consent v1.0

> **GENERATED at adoption — do not edit.** Written by
> `python3 scripts/build_cap1_trusted_bootstrap_consent_adoption.py --apply`
> in the sign-off change and re-checked by its `--check`. Figures are
> computed from the tree, never transcribed. This file binds nothing on its
> own: the adoption is the owner's selection recorded in
> `{RECORD.as_posix()}`, bound by the annotated tag `{TAG}`.

## What is adopted

Version 1.0 of this change, the bytes the round-4 review read
(`{REVIEW.as_posix()}`, `CONFIRM WITH EXCEPTIONS`, notes only; subject
`{SUBJECT.as_posix()}`). It fully replaces **CAP1-REQ-011** and
**CAP1-REQ-046**. Every other Capability 1 requirement stays as adopted.

**The effective Capability 1 specification** is the composition
`GOVERNING-DEPENDENCIES.json` declares: the bound predecessor
`{PRED_SPEC.as_posix()}` with exactly the CAP1-REQ-011 and CAP1-REQ-046
blocks replaced by this change's `specs/…/spec.md`. [Observed, computed by
the builder] It has {f["requirements"]} requirements and {f["scenarios_after"]} scenarios (the bound
file alone has {f["scenarios_before"]}), and its generated warrant union is
`GOVERNING-DEPENDENCIES.json`. [Observed] `scripts/check_spec_reconciliation.py`
still counts the bound file alone for CAP1; composing this overlay there is
bead `syzygy-5oqc`.

## Predecessor surfaces this adoption supersedes

CC-REV-2 forbids leaving an invalidated authoritative artifact asserting
the old truth. The predecessor's `CONTRACT-COVERAGE.md` and its generated
`GOVERNING-DEPENDENCIES.md` are act-bound and may not be edited, so this
overlay supersedes the following statements in place. Each is read as
written below for the effective composition; the bound bytes stay as
history. The set is the one round-4 finding 1 names
(`{DISPOSITION.as_posix()}`, note 1).

[Observed, computed by the builder] The composed contract union has
{f["after"]} identifiers; the bound union has {f["before"]}. The difference is exactly {added}.

In `{PRED_COVERAGE.as_posix()}`:

| Surface | Where | Superseded by |
|---|---|---|
| RFC3-16(a) row, valid/invalid act states, **Unknown** | {at("RFC3-16(a) row")} | The consent consequences map to the amended CAP1-REQ-011/046 in this change's `CONTRACT-COVERAGE.md`; the general non-consent owner-act admission consequence stays **Unknown** (its last row). |
| Family table, RFC3 row `38 \\| 11 \\| 27` | {at("family table RFC3 row")} | RFC3: 38 accepted, **{f["rfc3_after"]} mapped, {rfc3_unmapped_after} not mapped**. |
| Family table total `324 \\| 38 \\| 286` | {at("family table total")} | **324 accepted, {f["after"]} mapped, {unmapped_after} not mapped**. |
| "The 38 mapped clauses are exactly the `contracts[]` union in the generated `GOVERNING-DEPENDENCIES.md`" | {at("mapped sentence")} | The {f["after"]} mapped clauses are exactly the `contracts` union in this change's generated `GOVERNING-DEPENDENCIES.json`. |
| "The 286 unmapped clauses are disposed in Part B." | {at("unmapped sentence")} | {unmapped_after} unmapped clauses; {added} leave Part B. |
| Part A totals, "65 consequence rows over 38 clauses — 63 covered, 2 Unknown" | {at("Part A totals")} | Part A is the bound table without the RFC3-16(a) row above, plus this change's {n_rows} overlay rows ({classes["covered"]} whose disposition opens "covered", {classes["Unknown"]} "Unknown", {classes["other"]} in other words, each as written there). The composed covered/Unknown totals are not restated here: [Unknown] the {classes["other"]} other-worded row(s) are not classified by this builder. |
| Part B applicability sentence, "the 286 unmapped clauses" | {at("Part B applicability sentence")} | {unmapped_after} unmapped clauses. |
| Part B "RFC 0003 remainder \\| 27" | {at("Part B RFC3 line")} | RFC 0003 remainder: {rfc3_unmapped_after}. |
| Part B total 286 | {at("Part B total")} | {unmapped_after}. |
| Self-check: "`contracts[]` union (38 identifiers), and 38 + 286 = 324" | {at("self-check")} | The composed union has {f["after"]} identifiers and {f["after"]} + {unmapped_after} = 324; check it with this builder's `--check`. `build_capability_1_spec_dependencies.py --check` still checks the bound file against the bound spec, which remains true of those bytes. |

In `{PRED_DEPS.as_posix()}` (generated, bound): it is the union of the bound
specification, not of the effective composition. The effective union is
`GOVERNING-DEPENDENCIES.json` here.

## Known gap carried with v1.0

Round-4 note 2 (`{DISPOSITION.as_posix()}`): CAP1-REQ-046's refusal
disclosure is a disjunction that does not on its own require the refused
artifact's identity and digest, and RFC3-16(a)'s "blocking is not deletion"
consequence has no overlay row. The owner adopted v1.0 as reviewed; closing
it needs a v1.1 with its own review round (bead `syzygy-0v4l`).

## What this does not do

It edits no act-bound byte, grants no consent for any repository, reads no
target repository and authorizes nothing. Implementation is authorized
separately and bounded by `{IMPLEMENTATION.as_posix()}`; the route is
`{DIRECTION.as_posix()}`.
"""


def state(root: pathlib.Path) -> str:
    adoption = root / ADOPTION
    if not adoption.exists():
        return "unapplied"
    if (adoption.read_text(encoding="utf-8") == render_adoption(root)
            and read(root, README).decode("utf-8") == render_readme()):
        return "applied"
    return "drift"


def check(root: pathlib.Path = ROOT) -> list[str]:
    try:
        current = state(root)
        findings = []
        if current == "drift":
            findings.append("ADOPTION.md or README.md differs from its regeneration")
        findings += subject_findings(root, current != "unapplied")
        findings += baseline_findings(root)
        _figures, found = composition(root)
        findings += found
        _lines, found = anchors(root)
        findings += found
        return findings
    except (OSError, ValueError, KeyError, json.JSONDecodeError) as exc:
        return [f"cannot evaluate the package: {exc}"]


def applied(root: pathlib.Path = ROOT) -> bool:
    return state(root) == "applied" and not check(root)


def apply(root: pathlib.Path = ROOT) -> int:
    if state(root) != "unapplied":
        print(f"REFUSED: the adoption is {state(root)}, not unapplied; nothing written")
        return 2
    findings = check(root)
    if findings:
        print("REFUSED: the package does not verify; nothing written")
        for finding in findings:
            print(f"  - {finding}")
        return 2
    (root / README).write_text(render_readme(), encoding="utf-8")
    (root / ADOPTION).write_text(render_adoption(root), encoding="utf-8")
    after = check(root)
    if after:
        print("FAILED after apply: " + " | ".join(after))
        return 1
    print(f"applied {README.as_posix()} and {ADOPTION.as_posix()}")
    return 0


# --- selftest ----------------------------------------------------------------

def _copy(root: pathlib.Path, dest: pathlib.Path) -> None:
    rels = {CHANGE, PRED, SUBJECT}
    rels |= {pathlib.Path(r["path"]) for r in json.loads(read(root, BASELINE))["protected_predecessors"]}
    for rel in rels:
        src = root / rel
        if src.is_dir():
            shutil.copytree(src, dest / rel, dirs_exist_ok=True)
        else:
            (dest / rel).parent.mkdir(parents=True, exist_ok=True)
            shutil.copy2(src, dest / rel)


def _edit(rel: pathlib.Path, old: str, new: str):
    def mutate(tmp: pathlib.Path) -> None:
        text = (tmp / rel).read_text(encoding="utf-8")
        assert old in text, f"selftest fragment missing from {rel}: {old!r}"
        (tmp / rel).write_text(text.replace(old, new), encoding="utf-8")
    return mutate


def _json_edit(rel: pathlib.Path, change):
    def mutate(tmp: pathlib.Path) -> None:
        data = json.loads((tmp / rel).read_text(encoding="utf-8"))
        change(data)
        (tmp / rel).write_text(json.dumps(data, indent=2) + "\n", encoding="utf-8")
    return mutate


def selftest() -> int:
    results: list[tuple[str, bool]] = []
    unapplied_root = ROOT
    with tempfile.TemporaryDirectory() as t:
        base = pathlib.Path(t) / "base"
        _copy(unapplied_root, base)
        if (base / ADOPTION).exists():  # selftest from an applied tree: restore the reviewed README
            (base / ADOPTION).unlink()
            subject = json.loads(read(base, SUBJECT))
            readme = subprocess_show(unapplied_root, subject["README.md"])
            (base / README).write_bytes(readme)
        results.append(("the unmutated unapplied package verifies", check(base) == []))

        mutants = (
            ("subject: a reviewed file edited", "subject",
             _edit(CHANGE / "design.md", "a", "b"), "does not hash as the review-4 subject"),
            ("subject: an extra file in the change", "subject",
             lambda tmp: (tmp / CHANGE / "EXTRA.md").write_text("x\n"), "differ from the reviewed population"),
            ("baseline: a protected predecessor moved", "baseline",
             _edit(PRED / "tasks.md", "a", "b"), "protected predecessor"),
            ("composition: a source file moved", "composition",
             _json_edit(DEPS_JSON, lambda d: d["source_files"].update(
                 {CAND_SPEC.as_posix(): "0" * 64})), "does not hash as recorded"),
            ("composition: composed digest wrong", "composition",
             _json_edit(DEPS_JSON, lambda d: d.update(composed_spec_sha256="0" * 64)),
             "does not hash to composed_spec_sha256"),
            ("composition: requirement count wrong", "composition",
             _json_edit(DEPS_JSON, lambda d: d.update(requirement_count=41)), "requirements, record says"),
            ("composition: recorded union differs", "composition",
             _json_edit(DEPS_JSON, lambda d: d["dependencies"]["contracts"].remove("RFC3-16(c)")),
             "differs from the recorded dependencies"),
            ("anchors: a superseded surface not found", "anchors",
             _edit(PRED_COVERAGE, "| RFC 0003 remainder | 27 |", "| RFC 0003 remainder | 26 |"),
             "occurs 0 times"),
            ("figures: bound dependency count differs", "figures",
             _edit(PRED_DEPS, "## contracts (38)", "## contracts (37)"),
             "does not carry the predecessor contract count"),
        )
        for name, _pred, mutate, expect in mutants:
            with tempfile.TemporaryDirectory() as m:
                tmp = pathlib.Path(m) / "t"
                shutil.copytree(base, tmp)
                mutate(tmp)
                found = check(tmp)
                results.append((f"refused: {name}", any(expect in f for f in found)))
        # figures: the independent literals catch a changed union even when the
        # record is regenerated to agree with it.
        with tempfile.TemporaryDirectory() as m:
            tmp = pathlib.Path(m) / "t"
            shutil.copytree(base, tmp)
            global EXPECTED_COMPOSED_CONTRACTS
            saved = EXPECTED_COMPOSED_CONTRACTS
            EXPECTED_COMPOSED_CONTRACTS = 41
            try:
                found = check(tmp)
            finally:
                EXPECTED_COMPOSED_CONTRACTS = saved
            results.append(("refused: figures differ from the independent literals",
                            any("not 38 -> 41" in f for f in found)))
            global RFC3_MAPPED_BEFORE
            saved = RFC3_MAPPED_BEFORE
            RFC3_MAPPED_BEFORE = 12
            try:
                found = check(tmp)
            finally:
                RFC3_MAPPED_BEFORE = saved
            results.append(("refused: the bound union's RFC3 count differs from the family table",
                            any("RFC3 clauses, the bound family table says 12" in f for f in found)))
        # apply, then the applied predicates.
        with tempfile.TemporaryDirectory() as m:
            tmp = pathlib.Path(m) / "t"
            shutil.copytree(base, tmp)
            import contextlib
            import io
            with contextlib.redirect_stdout(io.StringIO()):
                code = apply(tmp)
                again = apply(tmp)
            adoption = (tmp / ADOPTION).read_text(encoding="utf-8")
            results.append(("apply writes the overlay and the applied tree verifies",
                            code == 0 and applied(tmp) and again == 2))
            results.append(("the overlay names every superseded surface with its line",
                            adoption.count(" | line ") == len(ANCHORS)))
            results.append(("the overlay carries the computed figures",
                            "**13 mapped, 25 not mapped**" in adoption
                            and "**324 accepted, 40 mapped, 284 not mapped**" in adoption
                            and "exactly `RFC3-16(b)` and `RFC3-16(c)`" in adoption))
            (tmp / ADOPTION).write_text(adoption.replace("284", "286", 1), encoding="utf-8")
            results.append(("applied: an edited overlay fails --check",
                            any("differs from its regeneration" in f for f in check(tmp))
                            and not applied(tmp)))
            (tmp / ADOPTION).write_text(adoption, encoding="utf-8")
            readme = (tmp / README).read_text(encoding="utf-8")
            (tmp / README).write_text(readme.replace("Adopted v1.0", "Candidate"), encoding="utf-8")
            results.append(("applied: an edited README fails --check",
                            any("differs from its regeneration" in f for f in check(tmp))))
            (tmp / README).write_text(readme, encoding="utf-8")
            (tmp / CHANGE / "design.md").write_text("edited\n", encoding="utf-8")
            results.append(("applied: a reviewed file edited after adoption fails --check",
                            any("does not hash as the review-4 subject" in f for f in check(tmp))))
    failing = sum(1 for _name, ok in results if not ok)
    for name, ok in results:
        print(f"{'PASS' if ok else 'FAIL'} {name}")
    print(f"{len(results)} fixtures, {failing} failing")
    return 0 if failing == 0 else 1


def subprocess_show(root: pathlib.Path, blob_sha256: str) -> bytes:
    """The reviewed README bytes: the newest version in this branch's history
    of `README.md` whose SHA-256 is the review-4 subject's row (the review
    commit itself is on a rebase-merged branch, unreachable from main)."""
    import subprocess
    log = subprocess.run(["git", "-C", str(root), "log", "--format=%H", "--", README.as_posix()],
                         capture_output=True, text=True)
    for commit in log.stdout.split():
        done = subprocess.run(["git", "-C", str(root), "show", f"{commit}:{README.as_posix()}"],
                              capture_output=True)
        if done.returncode == 0 and sha256(done.stdout) == blob_sha256:
            return done.stdout
    raise SystemExit("cannot recover the reviewed README.md from history for the selftest")


def main(argv: list[str]) -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    mode = parser.add_mutually_exclusive_group(required=True)
    mode.add_argument("--check", action="store_true")
    mode.add_argument("--apply", action="store_true")
    mode.add_argument("--selftest", action="store_true")
    args = parser.parse_args(argv)
    if args.selftest:
        return selftest()
    if args.apply:
        return apply(ROOT)
    findings = check(ROOT)
    if findings:
        print("CAP1 trusted-bootstrap consent adoption does not verify:")
        for finding in findings:
            print(f"  - {finding}")
        return 1
    figures, _ = composition(ROOT)
    print(f"CAP1 trusted-bootstrap consent adoption: {state(ROOT)}; reviewed subject, "
          f"{len(json.loads(read(ROOT, BASELINE))['protected_predecessors'])} protected predecessors, "
          f"composition ({figures['requirements']} requirements, {figures['scenarios_after']} scenarios, "
          f"contracts {figures['before']} -> {figures['after']}) and {len(ANCHORS)} superseded "
          "surfaces verify")
    return 0


def _d10_superseded(modes):
    """True, after one SUPERSEDED line, when this run is one of `modes` and D10 is in effect.

    This run holds a performed act to bytes doctrine amendment D10 replaces;
    under RFC3-16 as D10 amends it, those bytes are history, not a lock, so the
    run stops instead of failing forever (`scripts/d10_supersession.py`).
    Without the helper beside this file (a partial copy) it always runs."""
    import importlib.util
    from pathlib import Path as _Path
    mode = next((m for m in modes if m in sys.argv[1:]), None)
    helper = _Path(__file__).resolve().with_name("d10_supersession.py")
    if mode is None or not helper.is_file():
        return False
    spec = importlib.util.spec_from_file_location("d10_supersession", helper)
    d10 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(d10)
    return d10.superseded(f"{_Path(__file__).name} {mode}")


if __name__ == "__main__" and _d10_superseded(('--check', '--selftest')):
    sys.exit(0)
if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
