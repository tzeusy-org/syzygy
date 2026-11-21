#!/usr/bin/env python3
"""Validate and summarize the consequence-granular Polaris RFC matrix.

Semantic judgments live in three frozen normalized matrix parts and an
explicit repair delta. This script makes no applicability judgment. It checks
identities, accepted-clause coverage, dispositions, current requirement
warrants and deterministic drift, then generates the matrix manifest.
"""

import hashlib
import os
import re
import subprocess
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import build_capability_1_spec_dependencies as base
import build_polaris_project_wide_spec_dependencies as dependencies

ROOT = os.path.normpath(os.path.join(os.path.dirname(os.path.abspath(__file__)), ".."))
CHANGE = os.path.join(ROOT, "openspec", "changes", "polaris-project-wide-butlers-model")
# This matrix verifies the 324 clauses reviewed in the third confirmation.
# Later contract additions belong to their own review and coverage artifacts.
REVIEW_INDEX = "f441517e5c036608ff9af1f2b76b8fd9828c2c84:.syzygy/governance/contracts/candidates/05-CONTRACT-INDEX.yaml"
PARTS = (
    os.path.join(CHANGE, "contract-coverage-matrix", "RFC-0001-0003.md"),
    os.path.join(CHANGE, "contract-coverage-matrix", "RFC-0004-0006.md"),
    os.path.join(CHANGE, "contract-coverage-matrix", "RFC-0007-0009.md"),
)
REPAIR = os.path.join(CHANGE, "CONTRACT-COVERAGE-REPAIR-DELTA.md")
OUT = os.path.join(CHANGE, "CONTRACT-COVERAGE.md")

INDEX_RE = re.compile(r"^\s+- \{id: (RFC[1-9]-\d+(?:\([a-z]\))?),", re.M)
COVERED_DISPOSITION = r"covered:PWB-REQ-\d{3}(?:,PWB-REQ-\d{3})*"
BASE_ROW_RE = re.compile(
    r"^\|\s*([^|]+\.c\d+[a-z]?)\s*\|\s*(RFC[1-9]-\d+(?:\([a-z]\))?)\s*\|"
    r"\s*([^|]+)\s*\|\s*([^|]+)\s*\|\s*(yes|no|unknown)\s*\|"
    rf"\s*([^|]+)\s*\|\s*({COVERED_DISPOSITION}|unknown-uncovered|believed-not-applicable)\s*\|$",
    re.M,
)
REPAIR_ROW_RE = re.compile(
    r"^\|\s*([^|]+\.r\d+)\s*\|\s*([^|]+\.c\d+[a-z]?)\s*\|"
    r"\s*(RFC[1-9]-\d+(?:\([a-z]\))?)\s*\|\s*([^|]+)\s*\|"
    rf"\s*({COVERED_DISPOSITION}|unknown-uncovered|believed-not-applicable)\s*\|$",
    re.M,
)
REQ_ID_RE = re.compile(r"PWB-REQ-\d{3}")
COUNT_ROW_RE = re.compile(
    r"^\|\s*RFC\s*(?:000)?([1-9])\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|"
    r"\s*(\d+)\s*\|\s*(\d+)\s*\|\s*(\d+)\s*\|$",
    re.M,
)
TOTAL_ROW_RE = re.compile(
    r"^\|\s*\*\*Total\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|"
    r"\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|"
    r"\s*\*\*(\d+)\*\*\s*\|\s*\*\*(\d+)\*\*\s*\|$",
    re.M,
)
REPAIR_TOTAL_RE = re.compile(
    r"Declared totals:\s*\*\*(\d+) rows; (\d+) superseded base rows; "
    r"(\d+) covered; (\d+) Unknown\s+uncovered; (\d+) believed not applicable\.\*\*",
    re.M,
)


def digest(text):
    return hashlib.sha256(text.encode()).hexdigest()


def consequence_id_matches_clause(consequence_id, clause, marker):
    stem = consequence_id.rsplit(marker, 1)[0]
    compact_clause = clause.replace("(", "").replace(")", "")
    return stem in {clause, compact_clause}


def table_data_lines(text, header, expected_columns):
    lines = text.splitlines()
    header_indexes = [i for i, line in enumerate(lines) if line.strip() == header]
    if not header_indexes:
        raise ValueError(f"missing matrix table header: {header}")
    rows = []
    for header_index in header_indexes:
        if header_index + 1 >= len(lines) or not re.fullmatch(
            r"\|(?:\s*:?-+:?\s*\|){%d}" % expected_columns,
            lines[header_index + 1].strip(),
        ):
            raise ValueError(f"invalid matrix table separator after: {header}")
        for line_number, line in enumerate(lines[header_index + 2 :], start=header_index + 3):
            if not line.startswith("|"):
                break
            cells = [cell.strip() for cell in line.strip()[1:-1].split("|")]
            if len(cells) != expected_columns:
                raise ValueError(
                    f"invalid matrix column count at line {line_number}: "
                    f"{len(cells)} != {expected_columns}"
                )
            rows.append((line_number, line))
    if not rows:
        raise ValueError(f"matrix table has no data rows: {header}")
    return rows


def parse_inputs(part_texts=None, repair_text=None):
    if part_texts is None:
        part_texts = [base.read(path) for path in PARTS]
    if repair_text is None:
        repair_text = base.read(REPAIR)

    index = subprocess.check_output(
        ["git", "show", REVIEW_INDEX], cwd=ROOT, encoding="utf-8"
    )
    accepted = INDEX_RE.findall(index)
    if len(accepted) != 324 or len(set(accepted)) != 324:
        raise ValueError(
            f"accepted denominator must be 324 unique clauses, got {len(accepted)}/{len(set(accepted))}"
        )
    accepted_set = set(accepted)

    base_rows = {}
    for part_text in part_texts:
        data_lines = table_data_lines(
            part_text,
            "| Consequence ID | Clause | Authority file:lines | Consequence | Applicability | Reason | Disposition |",
            7,
        )
        for line_number, line in data_lines:
            match = BASE_ROW_RE.fullmatch(line)
            if match is None:
                raise ValueError(f"unparseable consequence row at line {line_number}: {line}")
            consequence_id, clause, authority, consequence, applicability, reason, disposition = (
                value.strip() for value in match.groups()
            )
            if consequence_id in base_rows:
                raise ValueError(f"duplicate base consequence ID: {consequence_id}")
            if clause not in accepted_set:
                raise ValueError(f"base row uses unaccepted clause: {clause}")
            if not consequence_id_matches_clause(consequence_id, clause, ".c"):
                raise ValueError(
                    f"base consequence ID prefix does not match clause: {consequence_id} / {clause}"
                )
            base_rows[consequence_id] = {
                "id": consequence_id,
                "clause": clause,
                "authority": authority,
                "consequence": consequence,
                "applicability": applicability,
                "reason": reason,
                "disposition": disposition,
            }

        declared_counts = {
            int(family): tuple(int(value) for value in values)
            for family, *values in COUNT_ROW_RE.findall(part_text)
        }
        actual_counts = {}
        for _line_number, line in data_lines:
            match = BASE_ROW_RE.fullmatch(line)
            clause = match.group(2)
            disposition = match.group(7)
            family = int(clause[3])
            row = actual_counts.setdefault(
                family,
                {"clauses": set(), "consequences": 0, "covered": 0, "unknown": 0, "not_applicable": 0},
            )
            row["clauses"].add(clause)
            row["consequences"] += 1
            if disposition.startswith("covered:"):
                row["covered"] += 1
            elif disposition == "unknown-uncovered":
                row["unknown"] += 1
            else:
                row["not_applicable"] += 1
        if set(declared_counts) != set(actual_counts):
            raise ValueError(
                f"embedded family count set mismatch: {sorted(declared_counts)} != {sorted(actual_counts)}"
            )
        for family, actual in actual_counts.items():
            expected = (
                len(actual["clauses"]),
                actual["consequences"],
                actual["covered"],
                actual["unknown"],
                actual["not_applicable"],
            )
            if declared_counts[family] != expected:
                raise ValueError(
                    f"embedded RFC{family} counts mismatch: {declared_counts[family]} != {expected}"
                )
        total_rows = TOTAL_ROW_RE.findall(part_text)
        if len(total_rows) != 1:
            raise ValueError(f"embedded Total row count must be 1, got {len(total_rows)}")
        declared_total = tuple(int(value) for value in total_rows[0])
        actual_total = tuple(
            sum(values[index] for values in declared_counts.values())
            for index in range(5)
        )
        if declared_total != actual_total:
            raise ValueError(f"embedded Total counts mismatch: {declared_total} != {actual_total}")

    repair_rows = {}
    superseded = set()
    repair_data_lines = table_data_lines(
        repair_text,
        "| Repair consequence ID | Supersedes | Clause | Effective consequence | Disposition |",
        5,
    )
    for line_number, line in repair_data_lines:
        match = REPAIR_ROW_RE.fullmatch(line)
        if match is None:
            raise ValueError(f"unparseable repair row at line {line_number}: {line}")
        consequence_id, prior_id, clause, consequence, disposition = (
            value.strip() for value in match.groups()
        )
        if consequence_id in repair_rows:
            raise ValueError(f"duplicate repair consequence ID: {consequence_id}")
        if prior_id not in base_rows:
            raise ValueError(f"repair supersedes missing base consequence: {prior_id}")
        if clause != base_rows[prior_id]["clause"]:
            raise ValueError(
                f"repair clause mismatch for {consequence_id}: {clause} != {base_rows[prior_id]['clause']}"
            )
        if not consequence_id_matches_clause(consequence_id, clause, ".r"):
            raise ValueError(
                f"repair consequence ID prefix does not match clause: {consequence_id} / {clause}"
            )
        repair_rows[consequence_id] = {
            "id": consequence_id,
            "clause": clause,
            "authority": base_rows[prior_id]["authority"],
            "consequence": consequence,
            "applicability": "yes" if disposition != "believed-not-applicable" else "no",
            "reason": "repair delta",
            "disposition": disposition,
            "supersedes": prior_id,
        }
        superseded.add(prior_id)

    declared_repair_totals = REPAIR_TOTAL_RE.findall(repair_text)
    if len(declared_repair_totals) != 1:
        raise ValueError(
            f"declared repair totals count must be 1, got {len(declared_repair_totals)}"
        )
    repair_dispositions = {"covered": 0, "unknown": 0, "not_applicable": 0}
    for row in repair_rows.values():
        if row["disposition"].startswith("covered:"):
            repair_dispositions["covered"] += 1
        elif row["disposition"] == "unknown-uncovered":
            repair_dispositions["unknown"] += 1
        else:
            repair_dispositions["not_applicable"] += 1
    actual_repair_totals = (
        len(repair_rows),
        len(superseded),
        repair_dispositions["covered"],
        repair_dispositions["unknown"],
        repair_dispositions["not_applicable"],
    )
    declared_repair_total = tuple(int(value) for value in declared_repair_totals[0])
    if declared_repair_total != actual_repair_totals:
        raise ValueError(
            f"declared repair totals mismatch: {declared_repair_total} != {actual_repair_totals}"
        )

    effective = {
        consequence_id: row
        for consequence_id, row in base_rows.items()
        if consequence_id not in superseded
    }
    effective.update(repair_rows)

    represented = {row["clause"] for row in effective.values()}
    missing_clauses = accepted_set - represented
    if missing_clauses:
        raise ValueError(f"accepted clauses without a consequence row: {sorted(missing_clauses)}")

    requirements, errors = dependencies.parse(base.read(dependencies.SPEC))
    if errors:
        raise ValueError("spec warrants do not validate: " + " | ".join(errors))
    warrants = {
        requirement_id: set(requirement_warrants["contracts"])
        for requirement_id, requirement_warrants in requirements
    }
    for row in effective.values():
        disposition = row["disposition"]
        if not disposition.startswith("covered:"):
            continue
        requirement_ids = REQ_ID_RE.findall(disposition)
        if not requirement_ids:
            raise ValueError(f"covered consequence has no requirement: {row['id']}")
        for requirement_id in requirement_ids:
            if requirement_id not in warrants:
                raise ValueError(
                    f"covered consequence cites missing requirement {requirement_id}: {row['id']}"
                )
            if row["clause"] not in warrants[requirement_id]:
                raise ValueError(
                    f"covered consequence {row['id']} cites {requirement_id}, but its warrants omit {row['clause']}"
                )

    return accepted, base_rows, repair_rows, effective


def render(part_texts=None, repair_text=None):
    accepted, base_rows, repair_rows, effective = parse_inputs(part_texts, repair_text)
    counts = {key: 0 for key in ("covered", "unknown-uncovered", "believed-not-applicable")}
    for row in effective.values():
        disposition = row["disposition"]
        key = "covered" if disposition.startswith("covered:") else disposition
        counts[key] += 1

    lines = [
        "# Contract coverage — polaris-project-wide-butlers-model",
        "",
        "> **GENERATED MANIFEST — do not edit.** The consequence judgments live in",
        "> `contract-coverage-matrix/`; reviewed repairs live in",
        "> `CONTRACT-COVERAGE-REPAIR-DELTA.md`. This file summarizes and verifies",
        "> them. The generator makes no semantic applicability decision.",
        "",
        "## Effective population",
        "",
        f"Accepted RFC 0001–0009 clauses: **{len(accepted)}**.",
        f"Effective consequence rows: **{len(effective)}** — "
        f"{counts['covered']} covered, {counts['unknown-uncovered']} Unknown uncovered, "
        f"{counts['believed-not-applicable']} believed not applicable.",
        "",
        "Every accepted clause has at least one effective consequence row. A",
        "`believed-not-applicable` row is an author/reviewer judgment, never an",
        "owner-reviewed N/A. Every `unknown-uncovered` row remains a disclosed gap.",
        "",
        "## Matrix parts",
        "",
        "| Artifact | sha256 | Base consequences |",
        "|---|---|---:|",
    ]
    for path in PARTS:
        text = base.read(path)
        count = len(BASE_ROW_RE.findall(text))
        rel = os.path.relpath(path, CHANGE)
        lines.append(f"| `{rel}` | `{digest(text)}` | {count} |")
    repair_text_actual = base.read(REPAIR) if repair_text is None else repair_text
    lines.extend(
        [
            "",
            "## Repair overlay",
            "",
            f"`CONTRACT-COVERAGE-REPAIR-DELTA.md` sha256 `{digest(repair_text_actual)}`",
            f"supersedes {len({row['supersedes'] for row in repair_rows.values()})} base rows with {len(repair_rows)} effective rows.",
            "",
            "## Verification",
            "",
            "```sh",
            "python3 scripts/build_polaris_project_wide_spec_dependencies.py --check",
            "python3 scripts/build_polaris_project_wide_contract_coverage.py --check",
            "python3 scripts/build_polaris_project_wide_contract_coverage.py --selftest",
            "```",
            "",
            "The checks enforce accepted-clause representation, unique consequence",
            "identities, valid repair supersession, closed dispositions and exact",
            "requirement-warrant agreement. They do not confirm semantic judgments;",
            "fresh review does.",
            "",
        ]
    )
    return "\n".join(lines)


def selftest():
    part_texts = [base.read(path) for path in PARTS]
    repair_text = base.read(REPAIR)
    output = render(part_texts, repair_text)

    first_repair = REPAIR_ROW_RE.search(repair_text)
    if first_repair is None:
        print("SELFTEST FAILED: no repair rows")
        return 1
    duplicated = repair_text.replace(
        first_repair.group(0), first_repair.group(0) + "\n" + first_repair.group(0), 1
    )
    try:
        render(part_texts, duplicated)
    except ValueError as error:
        if "duplicate repair" not in str(error):
            print(f"SELFTEST FAILED: wrong duplicate error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: duplicate repair passed")
        return 1

    mutated = repair_text.replace("covered:PWB-REQ-001", "covered:PWB-REQ-999", 1)
    try:
        render(part_texts, mutated)
    except ValueError as error:
        if "missing requirement" not in str(error):
            print(f"SELFTEST FAILED: wrong warrant error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: missing requirement passed")
        return 1

    malformed_parts = list(part_texts)
    first_base = BASE_ROW_RE.search(malformed_parts[0])
    if first_base is None:
        print("SELFTEST FAILED: no base rows")
        return 1
    malformed_parts[0] = malformed_parts[0].replace(first_base.group(1), "BROKEN-ID", 1)
    try:
        render(malformed_parts, repair_text)
    except ValueError as error:
        if "unparseable consequence row" not in str(error):
            print(f"SELFTEST FAILED: wrong malformed-row error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: malformed consequence row passed")
        return 1

    broken_columns = list(part_texts)
    broken_columns[0] = broken_columns[0].replace(
        first_base.group(0), first_base.group(0).replace(" | ", " ", 1), 1
    )
    try:
        render(broken_columns, repair_text)
    except ValueError as error:
        if "column count" not in str(error):
            print(f"SELFTEST FAILED: wrong column-count error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: broken base columns passed")
        return 1

    covered_repair = next(
        match
        for match in REPAIR_ROW_RE.finditer(repair_text)
        if match.group(5).strip().startswith("covered:")
    )
    invalid_disposition = repair_text.replace(
        covered_repair.group(0), covered_repair.group(0).replace("covered:", "maybe:"), 1
    )
    try:
        render(part_texts, invalid_disposition)
    except ValueError as error:
        if "unparseable repair row" not in str(error):
            print(f"SELFTEST FAILED: wrong repair-disposition error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: invalid repair disposition passed")
        return 1

    invalid_repair_id = repair_text.replace(first_repair.group(1), "BROKEN-REPAIR-ID", 1)
    try:
        render(part_texts, invalid_repair_id)
    except ValueError as error:
        if "unparseable repair row" not in str(error):
            print(f"SELFTEST FAILED: wrong repair-ID error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: invalid repair ID passed")
        return 1

    wrong_prefix_base = list(part_texts)
    wrong_prefix_base[0] = wrong_prefix_base[0].replace(
        first_base.group(1), "RFC9-99.c1", 1
    )
    try:
        render(wrong_prefix_base, repair_text)
    except ValueError as error:
        if "base consequence ID prefix" not in str(error):
            print(f"SELFTEST FAILED: wrong base-prefix error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: wrong-prefix base ID passed")
        return 1

    wrong_prefix_repair = repair_text.replace(first_repair.group(1), "RFC9-99.r1", 1)
    try:
        render(part_texts, wrong_prefix_repair)
    except ValueError as error:
        if "repair consequence ID prefix" not in str(error):
            print(f"SELFTEST FAILED: wrong repair-prefix error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: wrong-prefix repair ID passed")
        return 1

    broken_repair_columns = repair_text.replace(
        first_repair.group(0), first_repair.group(0).replace(" | ", " ", 1), 1
    )
    try:
        render(part_texts, broken_repair_columns)
    except ValueError as error:
        if "column count" not in str(error):
            print(f"SELFTEST FAILED: wrong repair-column error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: broken repair columns passed")
        return 1

    junk_covered = repair_text.replace(
        covered_repair.group(0),
        covered_repair.group(0).replace(
            covered_repair.group(5).strip(), covered_repair.group(5).strip() + "junk"
        ),
        1,
    )
    try:
        render(part_texts, junk_covered)
    except ValueError as error:
        if "unparseable repair row" not in str(error):
            print(f"SELFTEST FAILED: wrong covered-junk error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: covered junk suffix passed")
        return 1

    semicolon_covered = repair_text.replace(
        covered_repair.group(0),
        covered_repair.group(0).replace(
            covered_repair.group(5).strip(), "covered:PWB-REQ-001;PWB-REQ-005"
        ),
        1,
    )
    try:
        render(part_texts, semicolon_covered)
    except ValueError as error:
        if "unparseable repair row" not in str(error):
            print(f"SELFTEST FAILED: wrong covered-separator error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: covered semicolon separator passed")
        return 1

    stale_counts = list(part_texts)
    stale_counts[0] = stale_counts[0].replace(
        "| RFC 0001 | 39 | 100 | 7 | 55 | 38 |",
        "| RFC 0001 | 39 | 99 | 7 | 55 | 38 |",
        1,
    )
    try:
        render(stale_counts, repair_text)
    except ValueError as error:
        if "embedded RFC1 counts mismatch" not in str(error):
            print(f"SELFTEST FAILED: wrong embedded-count error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: stale embedded counts passed")
        return 1

    missing_total = list(part_texts)
    total_line = TOTAL_ROW_RE.search(missing_total[0])
    if total_line is None:
        print("SELFTEST FAILED: no embedded Total row")
        return 1
    missing_total[0] = missing_total[0].replace(total_line.group(0) + "\n", "", 1)
    try:
        render(missing_total, repair_text)
    except ValueError as error:
        if "Total row count" not in str(error):
            print(f"SELFTEST FAILED: wrong missing-Total error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: missing Total row passed")
        return 1

    stale_total = list(part_texts)
    stale_total[0] = stale_total[0].replace("**210**", "**209**", 1)
    try:
        render(stale_total, repair_text)
    except ValueError as error:
        if "Total counts mismatch" not in str(error):
            print(f"SELFTEST FAILED: wrong stale-Total error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: stale Total row passed")
        return 1

    deleted_repair = repair_text.replace(first_repair.group(0) + "\n", "", 1)
    try:
        render(part_texts, deleted_repair)
    except ValueError as error:
        if "declared repair totals mismatch" not in str(error):
            print(f"SELFTEST FAILED: wrong deleted-repair error: {error}")
            return 1
    else:
        print("SELFTEST FAILED: deleted repair row passed")
        return 1

    if output != render(part_texts, repair_text):
        print("SELFTEST FAILED: output is nondeterministic")
        return 1
    print("selftest: exact IDs/dispositions, columns, family/total/repair counts, warrants and determinism hold")
    return 0


def main(argv):
    if "--selftest" in argv:
        return selftest()
    output = render()
    if "--check" in argv:
        if not os.path.exists(OUT) or base.read(OUT) != output:
            print("DRIFT: CONTRACT-COVERAGE.md differs from verified matrices")
            return 1
        print("Polaris consequence matrix matches regeneration — 324 clauses represented")
        return 0
    with open(OUT, "w", encoding="utf-8") as file_handle:
        file_handle.write(output)
    print("wrote CONTRACT-COVERAGE.md consequence manifest")
    return 0


if __name__ == "__main__":
    sys.exit(main(sys.argv[1:]))
