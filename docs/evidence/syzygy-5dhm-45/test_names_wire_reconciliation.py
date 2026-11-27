#!/usr/bin/env python3
"""syzygy-5dhm.45: wire REQ-polaris-generation-034 v2.40 (test-name recognizers) into the reconciliation scripts after v2.38.

Usage: test_names_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.38 migration
parity (syzygy-3efd.85) is wired gains the same wiring for v2.40 with the migration parity as its predecessor, every filter that leaves
out the migration parity's row also leaves out this one (v2.40 stands on v2.38, so it leaves with it), and a selftest case mirrors the
migration parity's. Derived from the v2.38 build's script (which cloned the choice floor) when migration parity took v2.38 first.
Each edit asserts its anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once.
"""
import pathlib
import re
import sys

root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'TNAMES_' not in s, 'already wired'
assert 'MIGPAR_TAG = "polaris-dossier-migration-parity-v2.38"' in s, 'predecessor is not the v2.38 migration parity'


def after(text: str, anchor: str, add: str) -> str:
    assert text.count(anchor) == 1, anchor[:90]
    return text.replace(anchor, anchor + add, 1)


def before(text: str, anchor: str, add: str) -> str:
    assert text.count(anchor) == 1, anchor[:90]
    return text.replace(anchor, add + anchor, 1)


def block(text: str, start: str, end: str) -> str:
    """The text from `start` through the first `end` after it; `start` once."""
    assert text.count(start) == 1, start[:90]
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j + len(end)]


def rename(text: str) -> str:
    """The migration parity's wiring as the test-name recognizers': its predecessor first, then itself, so the renames never collide."""
    pred = [('choice_binding', '@P1@'), ('p5_advice_member_delta', '@PMD@'), ('CHOICE_SPEC', '@P2@'),
            ('"v2.37 choice floor"', '@P3@'), ('choice floor v2.37', '@P4@'), ('prior v2.37 choice floor', '@P5@'),
            ('requires effective v2.37', '@P6@'), ('is_migpar_row', '@P7@'), ('choice_amendment is None', '@P8@')]
    for old, mark in pred:
        text = text.replace(old, mark)
    text = (text.replace('MIGPAR_', 'TNAMES_').replace('migpar_', 'tnames_').replace('migration parity', 'test-name recognizers')
            .replace('dossier-migration-parity', 'dossier-test-names').replace('migration-parity-', 'test-names-').replace('v2.38', 'v2.40'))
    back = {'@P1@': 'migpar_binding', '@PMD@': 'p5_advice_member_delta', '@P2@': 'MIGPAR_SPEC', '@P3@': '"v2.38 migration parity"',
            '@P4@': 'migration parity v2.38', '@P5@': 'prior v2.38 migration parity', '@P6@': 'requires effective v2.38', '@P7@': 'is_migpar_row',
            '@P8@': 'migpar_amendment is None'}
    for mark, new in back.items():
        text = text.replace(mark, new)
    assert not re.search(r'@P[0-9A-Z]+@', text), text
    return text


# 0. Every filter that leaves out the migration parity's row leaves out this one too (before any mirrored code exists).
n = s.count('not is_migpar_row(line)')
s = s.replace('not is_migpar_row(line)', 'not is_migpar_row(line) and not is_tnames_row(line)')
m = s.count('not is_migpar_row(line.rstrip("\\n"))')
s = s.replace('not is_migpar_row(line.rstrip("\\n"))', 'not is_migpar_row(line.rstrip("\\n")) and not is_tnames_row(line.rstrip("\\n"))')
assert n == 13 and m == 1, (n, m)

# 1. Constants.
consts = block(s, '# The v2.38 migration parity (syzygy-3efd.85)', 'MIGPAR_BOUND_PARTS = len(MIGPAR_SUBJECTS)\n')
mine = rename(consts).replace('(syzygy-3efd.85)', '(syzygy-5dhm.45)').replace('the v2.37 choice floor', 'the v2.38 migration parity')
mine = mine.replace('[Migration parity amendment 2.38]', '[Test-name recognizers amendment 2.40]')
mine = mine.replace('"With the migration parity"', '"With the test-name recognizers"')
mine = mine.replace('"With the migration parity version effective', '"With the test-name recognizers version effective')
mine = re.sub(r'TNAMES_SPEC: "[0-9a-f]{64}"', f'TNAMES_SPEC: "{subject}"', mine)
for needle in ('"polaris-dossier-test-names-v2.40"', '[Test-name recognizers amendment 2.40]', subject, '"dossier-test-names"',
               '"With the test-name recognizers"'):
    assert needle in mine, needle
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_migpar_row(line):\n', '    return None\n')
# rename() keeps `is_migpar_row` for predecessor references; here the cloned row test is this version's own.
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_migpar_row(line):') == 1 and mine_funcs.count('if is_migpar_row(line)') == 1, mine_funcs
mine_funcs = mine_funcs.replace('def is_migpar_row(line):', 'def is_tnames_row(line):').replace('if is_migpar_row(line)', 'if is_tnames_row(line)')
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def migpar_binding(root):\n', '    )\n')
delta = block(s, 'def migpar_delta(root, findings):\n', '    return added\n')
mine = rename(binding).replace('only over the effective v2.37 choice floor REQ-034.', 'only over the effective v2.38 migration parity REQ-034.')
assert 'effective v2.38 migration parity REQ-034' in mine, mine
assert 'predecessor=migpar_binding, predecessor_label="v2.38 migration parity", version="v2.40"' in mine, mine
assert 'label="test-name recognizers"' in mine
mine_delta = rename(delta).replace('the test-name recognizers adds to REQ-034 over the choice floor', 'the test-name recognizers add to REQ-034 over the migration parity')
assert 'over the migration parity, counted' in mine_delta
assert '@PMD' not in mine_delta and 'read_text(root, MIGPAR_SPEC)' in mine_delta and 'read_text(root, TNAMES_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    migpar_retired_by = migpar_disposition(root, migpar_rows(root))\n', '    r2 += migpar_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, '        retirement += f"; v2.38 inactive by {migpar_retired_by}"\n',
          '    if tnames_retired_by:\n        retirement += f"; v2.40 inactive by {tnames_retired_by}"\n')

# 4. The census composition: v2.40 composes only over an effective v2.38.
comp = block(s, '        migpar_amendment, migpar_records, migpar_subjects = migpar_binding(root)\n        findings += migpar_records + migpar_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if migpar_amendment is None:' in mine and 'requires effective migration parity v2.38' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection.
sel = block(s, '            migpar_amendment, _records, _subjects = migpar_binding(root)\n            if migpar_amendment is not None:\n                by_id,',
            '                selected_population = by_id\n')
s = after(s, sel, rename(sel))

# 6. The scenario arithmetic.
s = after(s, '    if migpar_binding(root)[0] is not None:\n        n_scen += migpar_delta(root, findings)\n',
          '    if tnames_binding(root)[0] is not None:\n        n_scen += tnames_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if migpar_amendment is not None:\n        files += tracked(root, MIGPAR_HOME)\n',
          '    tnames_amendment, _records, _subjects = tnames_binding(root)\n'
          '    if tnames_amendment is not None:\n        files += tracked(root, TNAMES_HOME)\n')
s = s.replace('                        (migpar_amendment, MIGPAR_UNION)):',
              '                        (migpar_amendment, MIGPAR_UNION),\n                        (tnames_amendment, TNAMES_UNION)):', 1)
assert '(tnames_amendment, TNAMES_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    migpar_amendment, _records, _subjects = migpar_binding(root)\n    migpar_fields = ',
               '`{OPENSPEC_README}` calls migration parity v2.38 adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count('test-name recognizers v2.40') == 4, mine
s = after(s, routes, mine)

# 9. The status census: v2.40's sentence states the current total, then v2.38's states its own.
cen = block(s, '        if migpar_binding(root)[0] is not None:\n            # The migration parity\'s own sentence',
            'declares an migration parity census while it is not in force")\n')
mine = rename(cen).replace('declares an test-name recognizers census', 'declares a test-name recognizers census').replace("# The test-name recognizers's own sentence states the current total; the earlier sentences state theirs.",
                           "# The test-name recognizers' own sentence states the current total; the earlier sentences state theirs.")
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {MIGPAR_UNION, *MIGPAR_SUBJECTS}\n', '    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the migration parity's (3efd.85's d208c6135).
s = after(s, '    migpar_subjects = MIGPAR_BOUND_PARTS if migpar_rows_now and not migpar_retired else 0\n',
          '    tnames_rows_now = tnames_rows(tree)\n'
          '    tnames_retired = tnames_disposition(tree, tnames_rows_now)\n'
          '    tnames_records = 2 if tnames_retired else int(bool(tnames_rows_now))\n'
          '    tnames_subjects = TNAMES_BOUND_PARTS if tnames_rows_now and not tnames_retired else 0\n')
s = after(s, ' - choice_records - migpar_records', ' - tnames_records')
s = after(s, ' - choice_subjects - migpar_subjects', ' - tnames_subjects')

# 12. The earlier-history projection: v2.40 stands on v2.38, so its routes leave with it.
s = s.replace('                MIGPAR_STATUS_PREFIX, MIGPAR_COUNT_SCOPE)\n',
              '                MIGPAR_STATUS_PREFIX, MIGPAR_COUNT_SCOPE, TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)\n', 1)
s = s.replace('startswith((CHOICE_INDEX_PREFIX, MIGPAR_INDEX_PREFIX)) else line\n',
              'startswith((CHOICE_INDEX_PREFIX, MIGPAR_INDEX_PREFIX, TNAMES_INDEX_PREFIX)) else line\n', 1)
assert 'TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)' in s and 'MIGPAR_INDEX_PREFIX, TNAMES_INDEX_PREFIX)) else line' in s

# 13. The selftest case, mirroring the migration parity's.
case = block(s, 'def migpar_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
mine = mine.replace('if not is_tnames_row(line) and not is_tnames_row(line))', 'if not is_tnames_row(line))')
mine = mine.replace('    """Guard the test-name recognizers\'s row,', '    """Guard the test-name recognizers\' row,')
old_floor = ('    changed = "is not itself rendered as a withheld item, both of whose end nodes renders"\n'
             '    current_capacity = "is not itself rendered as a withheld item, either of whose end nodes renders"\n')
assert mine.count(old_floor) == 1
mine = mine.replace(old_floor, '    changed = "each recognizer reads and lists at most 251 files"\n'
                               '    current_capacity = "each recognizer reads and lists at most 250 files"\n')
mine = mine.replace('record("modified-exception", TNAMES_SPEC', 'record("modified-limit", TNAMES_SPEC')
mine = mine.replace('# The row without an effective v2.37 predecessor is refused', '# The row without an effective v2.38 predecessor is refused')
old_doc = ('    v2.37 choice floor this version stands on is not effective there either, and the test-name recognizers\n'
           '    can only be pending or refused here;')
assert mine.count(old_doc) == 1, mine[:900]
mine = mine.replace(old_doc, '    v2.37 choice floor and the v2.38 migration parity this version stands on are not effective there either,\n'
                             '    and the test-name recognizers can only be pending or refused here;')
assert 'effective v2.38 predecessor is refused' in mine and 'the v2.38 migration parity this version stands on' in mine
for needle in ('"R1 requires effective v2.38"', '"prior v2.38 migration parity"', 'at most 250 files', 'test-names-{name}',
               'Path(tmp) / "dossier-test-names"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: migpar_cases(tmp, base, w, f),\n', '        lambda w, f: tnames_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose v2.40 over v2.38, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def migpar_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('migpar_amendment', 'tnames_amendment').replace('migpar_binding', 'tnames_binding')
          .replace('migration parity', 'test-name recognizers'))
c = after(c, '                        (adoption.MIGPAR_SPEC, migpar_amendment(root))', ',\n'
          '                        (adoption.TNAMES_SPEC, tnames_amendment(root))')
c = after(c, '    migpar_amendment(root)\n', '    tnames_amendment(root)\n')
c = after(c, '*adoption.MIGPAR_SUBJECTS,', ' *adoption.TNAMES_SUBJECTS,')
c = c.replace('if any(line.startswith((adoption.CHOICE_COUNT_SCOPE, adoption.MIGPAR_COUNT_SCOPE)) for line in lines):',
              'if any(line.startswith((adoption.CHOICE_COUNT_SCOPE, adoption.MIGPAR_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines):', 1)
c = c.replace('            if any(line.startswith(adoption.MIGPAR_COUNT_SCOPE) for line in lines):\n',
              '            if any(line.startswith((adoption.MIGPAR_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines):\n', 1)
old_ret = ('            raise ScenarioCountError(f"{path} migration parity count differs from its two source members")\n'
           '        return int(migpar[1]), int(migpar[2])\n')
assert c.count(old_ret) == 1
new_ret = ('            raise ScenarioCountError(f"{path} migration parity count differs from its two source members")\n'
           '        migpar_figure = int(migpar[1]), int(migpar[2])\n'
           '        if tnames_amendment(root) is None:\n'
           '            if any(line.startswith(adoption.TNAMES_COUNT_SCOPE) for line in lines):\n'
           '                raise ScenarioCountError(f"{path} declares a test-name recognizers count while it is not in force")\n'
           '            return migpar_figure\n'
           '        tnames = [line for line in lines if line.startswith(adoption.TNAMES_COUNT_SCOPE)]\n'
           '        tname = CHOICE_COUNT.fullmatch(tnames[0].removeprefix(adoption.TNAMES_COUNT_PREFIX)) if len(tnames) == 1 else None\n'
           '        if tname is None:\n'
           '            raise ScenarioCountError(f"{path} needs one complete test-name recognizers count")\n'
           '        added = adoption.tnames_delta(root, findings)\n'
           '        if findings or (int(tname[1]), int(tname[2])) != (migpar_figure[0], migpar_figure[1] + added):\n'
           '            raise ScenarioCountError(f"{path} test-name recognizers count differs from its two source members")\n'
           '        return int(tname[1]), int(tname[2])\n')
c = c.replace(old_ret, new_ret, 1)
for needle in ('    tnames_amendment(root)\n', '(adoption.TNAMES_SPEC, tnames_amendment(root))', '*adoption.TNAMES_SUBJECTS',
               'adoption.MIGPAR_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines', 'return int(tname[1]), int(tname[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
