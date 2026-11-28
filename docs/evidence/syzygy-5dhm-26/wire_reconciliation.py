#!/usr/bin/env python3
"""syzygy-5dhm.26: wire REQ-polaris-generation-033 version 2.45 into the spec reconciliation, after close step measures v2.31.

Usage: wire_reconciliation.py <worktree> <spec-sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place, mirroring how version 2.31 is
wired: constants, the row, disposition and binding functions, R1 and R2 accounting, composition, the scenario count, the generated-file
and warrant-union inputs, the route check, the selftest family and every ledger filter that strips v2.31's row. Each edit asserts its
anchor occurs exactly as often as expected, so a drifted script stops the wiring instead of half-applying it.
"""
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
digest = sys.argv[2]
check = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
text = check.read_text(encoding='utf-8')


def once(old: str, new: str, times: int = 1) -> None:
    global text
    assert text.count(old) == times, (text.count(old), old[:100])
    text = text.replace(old, new)


once('STEP_MEASURES_BOUND_PARTS = len(STEP_MEASURES_SUBJECTS)\n', f'''STEP_MEASURES_BOUND_PARTS = len(STEP_MEASURES_SUBJECTS)
# The v2.45 session usage and cost line (syzygy-5dhm.26): one MODIFIED REQ-polaris-generation-033
# after the v2.31 close step measures, adopted by an agent row and its version tag.
SESSION_USAGE_CHANGE = "dossier-session-usage"
SESSION_USAGE_HOME = f"{{CHANGES}}/{{SESSION_USAGE_CHANGE}}"
SESSION_USAGE_SPEC = f"{{SESSION_USAGE_HOME}}/proposed/polaris-generation/spec.md"
SESSION_USAGE_UNION = f"{{SESSION_USAGE_HOME}}/GOVERNING-DEPENDENCIES.json"
SESSION_USAGE_TAG = "polaris-dossier-session-usage-v2.45"
SESSION_USAGE_STATUS_PREFIX = f"[Session usage amendment 2.45]({{SESSION_USAGE_HOME}})"
SESSION_USAGE_REPLACES = (POLARIS_ID + "033",)
SESSION_USAGE_SUBJECTS = {{
    SESSION_USAGE_SPEC: "{digest}",
}}
SESSION_USAGE_BOUND_PARTS = len(SESSION_USAGE_SUBJECTS)
''')

once('''def step_measures_binding(root):
    """Apply close measures only over the effective scripted benchmark REQ-033."""
    return _reviewed_version_binding(
        root, step_measures_rows(root), step_measures_disposition,
        version_tag=STEP_MEASURES_TAG, subjects_map=STEP_MEASURES_SUBJECTS, spec=STEP_MEASURES_SPEC,
        predecessor=scripted_grade_binding, predecessor_label="v2.30 scripted benchmark", version="v2.31",
        label="dossier close measures",
    )
''', '''def step_measures_binding(root):
    """Apply close measures only over the effective scripted benchmark REQ-033."""
    return _reviewed_version_binding(
        root, step_measures_rows(root), step_measures_disposition,
        version_tag=STEP_MEASURES_TAG, subjects_map=STEP_MEASURES_SUBJECTS, spec=STEP_MEASURES_SPEC,
        predecessor=scripted_grade_binding, predecessor_label="v2.30 scripted benchmark", version="v2.31",
        label="dossier close measures",
    )


def is_session_usage_row(line):
    return _is_reviewed_version_row(line, SESSION_USAGE_TAG, SESSION_USAGE_SUBJECTS)


def session_usage_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_session_usage_row(line)]


def session_usage_disposition(root, rows):
    if SESSION_USAGE_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), SESSION_USAGE_TAG,
                                    SESSION_USAGE_SUBJECTS, plain_revert=True)
    return None


def session_usage_binding(root):
    """Apply session usage only over the effective close-measures REQ-033."""
    return _reviewed_version_binding(
        root, session_usage_rows(root), session_usage_disposition,
        version_tag=SESSION_USAGE_TAG, subjects_map=SESSION_USAGE_SUBJECTS, spec=SESSION_USAGE_SPEC,
        predecessor=step_measures_binding, predecessor_label="v2.31 close measures", version="v2.45",
        label="dossier session usage",
    )
''')

# R1 and R2 accounting.
once('''    r1 += step_measures_records
    r2 += step_measures_subjects
''', '''    r1 += step_measures_records
    r2 += step_measures_subjects
    session_usage_retired_by = session_usage_disposition(root, session_usage_rows(root))
    session_usage_amendment, session_usage_records, session_usage_subjects = session_usage_binding(root)
    if session_usage_retired_by:
        records += 2
    elif session_usage_amendment is not None or session_usage_records or session_usage_subjects:
        records += 1
        subjects_seen += SESSION_USAGE_BOUND_PARTS
    r1 += session_usage_records
    r2 += session_usage_subjects
''')
once('''    if step_measures_retired_by:
        retirement += f"; v2.31 inactive by {step_measures_retired_by}"
''', '''    if step_measures_retired_by:
        retirement += f"; v2.31 inactive by {step_measures_retired_by}"
    if session_usage_retired_by:
        retirement += f"; v2.45 inactive by {session_usage_retired_by}"
''')

# Composition.
once('''                a, extra_a = compose_figure_by_id(a, step_measures_amendment, STEP_MEASURES_REPLACES)
                b, extra_b = compose_figure_by_name(b, step_measures_amendment, STEP_MEASURES_REPLACES)
                pa += extra_a
                pb += extra_b
''', '''                a, extra_a = compose_figure_by_id(a, step_measures_amendment, STEP_MEASURES_REPLACES)
                b, extra_b = compose_figure_by_name(b, step_measures_amendment, STEP_MEASURES_REPLACES)
                pa += extra_a
                pb += extra_b
        session_usage_amendment, session_usage_records, session_usage_subjects = session_usage_binding(root)
        findings += session_usage_records + session_usage_subjects
        if session_usage_amendment is not None:
            if step_measures_amendment is None:
                findings.append("POLARIS: dossier session usage requires effective close measures v2.31")
            else:
                a, extra_a = compose_figure_by_id(a, session_usage_amendment, SESSION_USAGE_REPLACES)
                b, extra_b = compose_figure_by_name(b, session_usage_amendment, SESSION_USAGE_REPLACES)
                pa += extra_a
                pb += extra_b
''')

# The expected scenario count.
once('''            findings.append("POLARIS dossier close measures: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
''', '''            findings.append("POLARIS dossier close measures: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
    session_usage_amendment, _records, _subjects = session_usage_binding(root)
    if session_usage_amendment is not None:
        # Only 033 moves, after close measures v2.31.
        ident = SESSION_USAGE_REPLACES[0]
        prior = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(step_measures_amendment or "")
                 if len(b["ids"]) == 1}
        current = {b["ids"][0]: len(b["scenarios"]) for b in _polaris_blocks_manual(session_usage_amendment)
                   if len(b["ids"]) == 1}
        if set(current) != {ident} or ident not in prior:
            findings.append("POLARIS dossier session usage: cannot count predecessor and successor for 033")
        else:
            n_scen += current[ident] - prior[ident]
''')

# Generated files and warrant unions.
once('''    if step_measures_amendment is not None:
        files += tracked(root, STEP_MEASURES_HOME)
''', '''    if step_measures_amendment is not None:
        files += tracked(root, STEP_MEASURES_HOME)
    session_usage_amendment, _records, _subjects = session_usage_binding(root)
    if session_usage_amendment is not None:
        files += tracked(root, SESSION_USAGE_HOME)
''')
once('''                        (step_measures_amendment, STEP_MEASURES_UNION),
''', '''                        (step_measures_amendment, STEP_MEASURES_UNION),
                        (session_usage_amendment, SESSION_USAGE_UNION),
''')

# Routes.
once('''            findings.append(f"`{OPENSPEC_README}` calls dossier close measures v2.31 adopted while it is not in force")
''', '''            findings.append(f"`{OPENSPEC_README}` calls dossier close measures v2.31 adopted while it is not in force")
    session_usage_amendment, _records, _subjects = session_usage_binding(root)
    session_usage_fields = [line.strip() for line in visible_route_lines(status)
                            if line.strip().startswith(SESSION_USAGE_STATUS_PREFIX)]
    if session_usage_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and SESSION_USAGE_TAG in line
                   for line in rows.get(SESSION_USAGE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route dossier session usage v2.45 "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = session_usage_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or session_usage_fields != [f"{SESSION_USAGE_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route dossier session usage v2.45 and its adoption {identity}")
    elif SESSION_USAGE_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in session_usage_fields):
            findings.append(f"`{STATUS}` calls dossier session usage v2.45 adopted while it is not in force")
        if any("Agent adoption" in line for line in rows.get(SESSION_USAGE_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls dossier session usage v2.45 adopted while it is not in force")
''')

# Inputs.
once('''    paths |= {STEP_MEASURES_UNION, *STEP_MEASURES_SUBJECTS}
''', '''    paths |= {STEP_MEASURES_UNION, *STEP_MEASURES_SUBJECTS}
    paths |= {SESSION_USAGE_UNION, *SESSION_USAGE_SUBJECTS}
''')

# The historical declared-source case: one more row and bound subject leave with the ledger.
once('''    step_subjects = STEP_MEASURES_BOUND_PARTS if step_rows and not step_retired else 0
''', '''    step_subjects = STEP_MEASURES_BOUND_PARTS if step_rows and not step_retired else 0
    usage_rows_now = session_usage_rows(tree)
    usage_retired = session_usage_disposition(tree, usage_rows_now)
    usage_records = 2 if usage_retired else int(bool(usage_rows_now))
    usage_subjects = SESSION_USAGE_BOUND_PARTS if usage_rows_now and not usage_retired else 0
''')
once(' - edit_records - step_records - qkind_records', ' - edit_records - step_records - usage_records - qkind_records')
once(' - 3 - edit_subjects - step_subjects - qkind_subjects', ' - 3 - edit_subjects - step_subjects - usage_subjects - qkind_subjects')

# Every ledger filter that strips v2.31's row strips v2.45's, which cannot stand without it.
filters = text.count('not is_step_measures_row(line)')
assert filters == 10, filters
text = text.replace('not is_step_measures_row(line)', 'not is_step_measures_row(line) and not is_session_usage_row(line)')

# The selftest family.
once('''        lambda w, f: step_measures_cases(tmp, base, w, f),
''', '''        lambda w, f: step_measures_cases(tmp, base, w, f),
        lambda w, f: session_usage_cases(tmp, base, w, f),
''')
once('''

def qkind_cases(tmp, base, witnesses, failures):''', '''

def session_usage_cases(tmp, base, witnesses, failures):
    """Guard the REQ033 succession over close measures, the checked spec bytes and retirement."""
    original = read_text(base, SESSION_USAGE_SPEC)
    if original is None or SESSION_USAGE_TAG is None or step_measures_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"session-usage-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-session-usage"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_session_usage_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = SESSION_USAGE_REPLACES[0]
    held = (session_usage_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 25)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 033 has 25 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{SESSION_USAGE_SPEC}"
    row = (f"| A-999 | 2026-11-27 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{SESSION_USAGE_TAG}` |\\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-27 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\\n"),
        ("tag-in-reason", unrelated + f"Other work | `{SESSION_USAGE_TAG}` | `git revert {later}` | — |\\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = session_usage_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (session_usage_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 28
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 033 moves from 25 to 28 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", SESSION_USAGE_TAG, SESSION_USAGE_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = session_usage_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_step_measures_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = session_usage_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.31", r1 + r2,
           text is None and not r2 and any("prior v2.31" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / SESSION_USAGE_SPEC
    current = "Money SHALL always be Unknown (`no-price-receipt`)."
    changed = "Money SHALL be estimated from a price list."
    assert original.count(current) == 1
    spec.write_text(original.replace(current, changed, 1))
    text, r1, r2 = session_usage_binding(tree)
    record("modified-money", SESSION_USAGE_SPEC, current, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and SESSION_USAGE_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-27 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (session_usage_disposition(tree, session_usage_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 033", found, held, baseline=True)


def qkind_cases(tmp, base, witnesses, failures):''')
check.write_text(text, encoding='utf-8')

text = count.read_text(encoding='utf-8')
once('''def qkind_amendment(root: Path) -> str | None:''', '''def session_usage_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption

    text, records, subjects = adoption.session_usage_binding(root)
    if records or subjects:
        raise ScenarioCountError("session usage adoption findings:\\n" + "\\n".join(records + subjects))
    return text


def qkind_amendment(root: Path) -> str | None:''')
once('''                        (adoption.STEP_MEASURES_SPEC, step_measures_amendment(root)),
''', '''                        (adoption.STEP_MEASURES_SPEC, step_measures_amendment(root)),
                        (adoption.SESSION_USAGE_SPEC, session_usage_amendment(root)),
''')
once('''    step_measures_amendment(root)
''', '''    step_measures_amendment(root)
    session_usage_amendment(root)
''')
once('*adoption.STEP_MEASURES_SUBJECTS, ', '*adoption.STEP_MEASURES_SUBJECTS, *adoption.SESSION_USAGE_SUBJECTS, ')
count.write_text(text, encoding='utf-8')
print('wired; filters extended:', filters)
