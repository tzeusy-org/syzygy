#!/usr/bin/env python3
"""Wire the figure-walks overlay into the reconciliation checker and the scenario counter (syzygy-3efd.32).

Each edit asserts its anchor occurs the stated number of times. Usage: walk_wire_checker.py <worktree> <spec sha256>.
Modelled on the figure-plan wiring (commit 1c35aed09); the walk is composed after the figure plan.
"""
import pathlib
import sys

W = pathlib.Path(sys.argv[1])
SHA = sys.argv[2]
CHK = W / 'scripts/check_spec_reconciliation.py'
CNT = W / 'scripts/count_polaris_effective_scenarios.py'
t = CHK.read_text(encoding='utf-8')


def sub(old, new, count=1):
    global t
    n = t.count(old)
    assert n == count, (n, count, old[:100])
    t = t.replace(old, new)


# 1. Constants.
sub('FIGPLAN_BOUND_PARTS = len(FIGPLAN_SUBJECTS)\n', 'FIGPLAN_BOUND_PARTS = len(FIGPLAN_SUBJECTS)\n'
    '\n# The v2.NN figure walks (syzygy-3efd.32): one MODIFIED REQ-polaris-generation-034\n'
    '# after the v2.33 figure plan, pending until its own VIS-4 ledger row. Its label\n'
    '# stays a placeholder until adoption, after derived-base views (syzygy-3efd.38).\n'
    'WALK_CHANGE = "dossier-figure-walks"\n'
    'WALK_HOME = f"{CHANGES}/{WALK_CHANGE}"\n'
    'WALK_SPEC = f"{WALK_HOME}/proposed/polaris-generation/spec.md"\n'
    'WALK_UNION = f"{WALK_HOME}/GOVERNING-DEPENDENCIES.json"\n'
    'WALK_TAG = "polaris-dossier-figure-walks-v2.NN"\n'
    'WALK_STATUS_PREFIX = f"[Figure walks amendment 2.NN]({WALK_HOME})"\n'
    'WALK_REPLACES = (POLARIS_ID + "034",)\n'
    'WALK_SUBJECTS = {\n'
    f'    WALK_SPEC: "{SHA}",\n'
    '}\n'
    'WALK_BOUND_PARTS = len(WALK_SUBJECTS)\n')

# 2. Row, disposition and binding.
anchor = 'def url_source_contract_findings(root):\n'
sub(anchor, '''def is_walk_row(line):
    return _is_reviewed_version_row(line, WALK_TAG, WALK_SUBJECTS)


def walk_rows(root):
    return [[cell.strip() for cell in line.split("|")[1:-1]]
            for line in adoption_table_rows(root) if is_walk_row(line)]


def walk_disposition(root, rows):
    if WALK_TAG is not None and len(rows) == 1 and len(rows[0]) == 7:
        identity, _date, commit, _changed, _why, _revert, _tag = rows[0]
        return recorded_disposition(root, identity, commit.strip("`"), WALK_TAG,
                                    WALK_SUBJECTS, plain_revert=True)
    return None


def walk_binding(root):
    """Apply the figure walks only over the effective v2.33 figure-plan REQ-034."""
    return _reviewed_version_binding(
        root, walk_rows(root), walk_disposition,
        version_tag=WALK_TAG, subjects_map=WALK_SUBJECTS, spec=WALK_SPEC,
        predecessor=figplan_binding, predecessor_label="v2.33 figure plan", version="v2.NN",
        label="figure walks",
    )


''' + anchor)

# 3. check_outcomes.
sub('''    r1 += figplan_records
    r2 += figplan_subjects
''', '''    r1 += figplan_records
    r2 += figplan_subjects
    walk_retired_by = walk_disposition(root, walk_rows(root))
    walk_amendment, walk_records, walk_subjects = walk_binding(root)
    if walk_retired_by:
        records += 2
    elif walk_amendment is not None or walk_records or walk_subjects:
        records += 1
        subjects_seen += WALK_BOUND_PARTS
    r1 += walk_records
    r2 += walk_subjects
''')
sub('''        retirement += f"; v2.33 inactive by {figplan_retired_by}"
''', '''        retirement += f"; v2.33 inactive by {figplan_retired_by}"
    if walk_retired_by:
        retirement += f"; figure walks inactive by {walk_retired_by}"
''')

# 4. census.
sub('''                a, extra_a = compose_figure_by_id(a, figplan_amendment, FIGPLAN_REPLACES)
                b, extra_b = compose_figure_by_name(b, figplan_amendment, FIGPLAN_REPLACES)
                pa += extra_a
                pb += extra_b
''', '''                a, extra_a = compose_figure_by_id(a, figplan_amendment, FIGPLAN_REPLACES)
                b, extra_b = compose_figure_by_name(b, figplan_amendment, FIGPLAN_REPLACES)
                pa += extra_a
                pb += extra_b
        walk_amendment, walk_records, walk_subjects = walk_binding(root)
        findings += walk_records + walk_subjects
        if walk_amendment is not None:
            if figplan_amendment is None:
                findings.append("POLARIS: figure walks require effective figure plan v2.33")
            else:
                a, extra_a = compose_figure_by_id(a, walk_amendment, WALK_REPLACES)
                b, extra_b = compose_figure_by_name(b, walk_amendment, WALK_REPLACES)
                pa += extra_a
                pb += extra_b
''')

# 5. polaris_expected.
sub('''            findings.append("POLARIS figure plan: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
''', '''            findings.append("POLARIS figure plan: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
    walk_amendment, _records, _subjects = walk_binding(root)
    if walk_amendment is not None:
        # Only 034 moves, after the figure plan v2.33.
        ident = WALK_REPLACES[0]
        previous = [len(block["scenarios"]) for block in _polaris_blocks_manual(figplan_amendment or "")
                    if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        replacement = [len(block["scenarios"]) for block in _polaris_blocks_manual(walk_amendment)
                       if block["section"] == "MODIFIED" and tuple(block["ids"]) == (ident,)]
        if len(previous) != 1 or len(replacement) != 1:
            findings.append("POLARIS figure walks: cannot count predecessor and successor for 034")
        else:
            n_scen += replacement[0] - previous[0]
''')

# 6. check_generated.
sub('''    if figplan_amendment is not None:
        files += tracked(root, FIGPLAN_HOME)
''', '''    if figplan_amendment is not None:
        files += tracked(root, FIGPLAN_HOME)
    walk_amendment, _records, _subjects = walk_binding(root)
    if walk_amendment is not None:
        files += tracked(root, WALK_HOME)
''')
sub('''                        (figplan_amendment, FIGPLAN_UNION)):''', '''                        (figplan_amendment, FIGPLAN_UNION),
                        (walk_amendment, WALK_UNION)):''')

# 7. check_routes.
sub('''            findings.append(f"`{OPENSPEC_README}` calls figure plan v2.33 adopted while it is not in force")
''', '''            findings.append(f"`{OPENSPEC_README}` calls figure plan v2.33 adopted while it is not in force")
    walk_amendment, _records, _subjects = walk_binding(root)
    walk_fields = [line.strip() for line in visible_route_lines(status)
                   if line.strip().startswith(WALK_STATUS_PREFIX)]
    if walk_amendment is not None:
        examined += 2
        if not any(Path(AGENT_ADOPTIONS).name in line and WALK_TAG in line
                   for line in rows.get(WALK_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` does not route figure walks "
                            f"to `{AGENT_ADOPTIONS}` and its version tag")
        identity = walk_rows(root)[0][0]
        if AGENT_ADOPTIONS not in status or walk_fields != [f"{WALK_STATUS_PREFIX} is agent-adopted in {identity}."]:
            findings.append(f"`{STATUS}` does not route figure walks and its adoption {identity}")
    elif WALK_CHANGE in changes:
        examined += 2
        if any("is agent-adopted" in field for field in walk_fields):
            findings.append(f"`{STATUS}` calls figure walks adopted while they are not in force")
        if any("Agent adoption" in line for line in rows.get(WALK_CHANGE, [])):
            findings.append(f"`{OPENSPEC_README}` calls figure walks adopted while they are not in force")
''')

# 8. inputs.
sub('    paths |= {FIGPLAN_UNION, *FIGPLAN_SUBJECTS}\n',
    '    paths |= {FIGPLAN_UNION, *FIGPLAN_SUBJECTS}\n    paths |= {WALK_UNION, *WALK_SUBJECTS}\n')

# 9. declared_source_historical_cases.
sub('''    figplan_subjects = FIGPLAN_BOUND_PARTS if figplan_rows_now and not figplan_retired else 0
''', '''    figplan_subjects = FIGPLAN_BOUND_PARTS if figplan_rows_now and not figplan_retired else 0
    walk_rows_now = walk_rows(tree)
    walk_retired = walk_disposition(tree, walk_rows_now)
    walk_records = 2 if walk_retired else int(bool(walk_rows_now))
    walk_subjects = WALK_BOUND_PARTS if walk_rows_now and not walk_retired else 0
''')
sub(' - qkind_subjects - figplan_subjects\n', ' - qkind_subjects - figplan_subjects - walk_subjects\n')

# 10. Every pending filter that leaves out the figure plan's row leaves out the walk's too.
n = t.count('and not is_figplan_row(line)')
t = t.replace('and not is_figplan_row(line)', 'and not is_figplan_row(line) and not is_walk_row(line)')
print('pending filters extended', n)
n2 = t.count('if not is_figplan_row(line))')
assert n2 == 1, n2
t = t.replace('if not is_figplan_row(line))', 'if not is_figplan_row(line) and not is_walk_row(line))')
sub('(TERM_BRIEF_STATUS_PREFIX, QKIND_STATUS_PREFIX, FIGPLAN_STATUS_PREFIX)',
    '(TERM_BRIEF_STATUS_PREFIX, QKIND_STATUS_PREFIX, FIGPLAN_STATUS_PREFIX, WALK_STATUS_PREFIX)')

# 11. Selftest cases, after the figure plan's.
sub('def covhold_cases(tmp, base, witnesses, failures):\n', '''def walk_cases(tmp, base, witnesses, failures):
    """Guard the REQ034 succession over the figure plan, the checked spec bytes and retirement."""
    original = read_text(base, WALK_SPEC)
    if original is None or WALK_TAG is None or figplan_binding(base)[0] is None:
        return

    def record(name, rel, old, new, expected, found, held, baseline=False):
        mutant = f"figure-walks-{name}"
        witnesses.append({"mutant": mutant, "path": rel, "old": old, "new": new,
                          "expected": expected, "failed": found,
                          "outcome": ("held" if baseline else "killed") if held else "SURVIVED"})
        if not held:
            failures.append(mutant)

    tree = Path(tmp) / "dossier-figure-walks"
    shutil.copytree(base, tree)
    ledger = tree / AGENT_ADOPTIONS
    pending = "".join(line for line in ledger.read_text().splitlines(keepends=True)
                      if not is_walk_row(line))
    ledger.write_text(pending)
    before, before_findings = census(tree)
    prior = before["POLARIS"]
    requirement = WALK_REPLACES[0]
    held = (walk_binding(tree) == (None, [], []) and not before_findings
            and len(prior[requirement]["scenarios"]) == 232)
    record("pending", AGENT_ADOPTIONS, "<no row>", "<unchanged>", "prior 034 has 232 scenarios",
           before_findings, held, baseline=True)

    oid = "0123456789abcdef0123456789abcdef01234567"
    snapshot = f"https://github.com/tzeusy-org/syzygy/blob/{oid}/{WALK_SPEC}"
    row = (f"| A-999 | 2026-11-27 | `{oid}` | [spec]({snapshot}) | Selftest | "
           f"`git revert -m 1 {oid}` | `{WALK_TAG}` |\\n")
    later = "f" * 40
    unrelated = f"| A-1001 | 2026-11-27 | `{later}` | "
    citations = (
        ("prior-snapshot", unrelated + f"[prior spec]({snapshot}) | Other work | `git revert {later}` | — |\\n"),
        ("tag-in-reason", unrelated + f"Other work | `{WALK_TAG}` | `git revert {later}` | — |\\n"),
    )
    for state, prefix, expected in (("pending", pending, None), ("adopted", pending + row, original)):
        for name, citation in citations:
            ledger.write_text(prefix + citation)
            text, r1, r2 = walk_binding(tree)
            record(f"{state}-{name}", AGENT_ADOPTIONS, "<no citation>", citation,
                   "an unrelated row does not claim this adoption", r1 + r2,
                   text == expected and not r1 and not r2, baseline=True)

    ledger.write_text(pending + row)
    after, after_findings = census(tree)
    effective = after["POLARIS"]
    held = (walk_binding(tree) == (original, [], []) and not after_findings
            and len(effective[requirement]["scenarios"]) == 244
            and set(prior) == set(effective)
            and all(prior[other] == body for other, body in effective.items() if other != requirement))
    record("adopted", AGENT_ADOPTIONS, "<no row>", row, "only 034 moves from 232 to 244 scenarios",
           after_findings, held, baseline=True)

    for name, old, new, detail in (
        ("duplicate-row", row, row + row, "seven-column"),
        ("malformed-tagged", "| Selftest | ", "| ", "seven-column"),
        ("wrong-tag", WALK_TAG, WALK_TAG + "-wrong", "malformed"),
        ("wrong-snapshot", snapshot, snapshot.replace("/blob/", "/tree/"), "does not name"),
        ("wrong-revert", f"git revert -m 1 {oid}", f"git revert {'0' * 40}", "revert"),
    ):
        assert row.count(old) == 1 and old != new
        ledger.write_text(pending + row.replace(old, new, 1))
        text, r1, r2 = walk_binding(tree)
        record(name, AGENT_ADOPTIONS, old, new, f"R1 refusal mentioning {detail}", r1 + r2,
               text is None and not r2 and any(detail in finding for finding in r1))

    predecessor = next(line for line in pending.splitlines(keepends=True) if is_figplan_row(line))
    ledger.write_text(pending.replace(predecessor, "", 1) + row)
    text, r1, r2 = walk_binding(tree)
    record("prior-unavailable", AGENT_ADOPTIONS, predecessor, "", "R1 requires effective v2.33", r1 + r2,
           text is None and not r2 and any("prior v2.33" in finding for finding in r1))

    ledger.write_text(pending + row)
    spec = tree / WALK_SPEC
    current_steps = "`steps` is a list of 2 to 12 steps in reading order"
    changed = "`steps` is a list of 2 to 13 steps in reading order"
    assert original.count(current_steps) == 1
    spec.write_text(original.replace(current_steps, changed, 1))
    text, r1, r2 = walk_binding(tree)
    record("modified-steps", WALK_SPEC, current_steps, changed, "R2 bound-subject refusal",
           r1 + r2, text is None and not r1 and len(r2) == 1 and WALK_SPEC in r2[0])
    spec.write_text(original)

    veto = "| A-1000 | 2026-11-27 | `8a468bc` | Veto A-999 | Test only | `git revert 8a468bc` | — |\\n"
    ledger.write_text(pending + row + veto)
    retired, found = census(tree)
    held = (walk_disposition(tree, walk_rows(tree)) == "A-1000"
            and not found and retired["POLARIS"] == prior)
    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)

def covhold_cases(tmp, base, witnesses, failures):
''')
sub('    figplan_cases(tmp, base, witnesses, failures)\n',
    '    figplan_cases(tmp, base, witnesses, failures)\n    walk_cases(tmp, base, witnesses, failures)\n')
CHK.write_text(t, encoding='utf-8')

# The counter.
t = CNT.read_text(encoding='utf-8')
sub('def covhold_amendment(root: Path) -> str | None:\n', '''def walk_amendment(root: Path) -> str | None:
    """Verified text, a pending or retired amendment, or a counting refusal."""
    import check_spec_reconciliation as adoption

    text, records, subjects = adoption.walk_binding(root)
    if records or subjects:
        raise ScenarioCountError("figure walks adoption findings:\\n" + "\\n".join(records + subjects))
    return text


def covhold_amendment(root: Path) -> str | None:
''')
sub('''                        (adoption.FIGPLAN_SPEC, figplan_amendment(root))):''',
    '''                        (adoption.FIGPLAN_SPEC, figplan_amendment(root)),
                        (adoption.WALK_SPEC, walk_amendment(root))):''')
sub('    figplan_amendment(root)\n    paths', '    figplan_amendment(root)\n    walk_amendment(root)\n    paths')
sub('*adoption.QKIND_SUBJECTS, *adoption.FIGPLAN_SUBJECTS,', '*adoption.QKIND_SUBJECTS, *adoption.FIGPLAN_SUBJECTS, *adoption.WALK_SUBJECTS,')
CNT.write_text(t, encoding='utf-8')
print('ok')
