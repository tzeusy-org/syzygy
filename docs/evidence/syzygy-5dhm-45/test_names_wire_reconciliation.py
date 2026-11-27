#!/usr/bin/env python3
"""syzygy-5dhm.45: wire REQ-polaris-generation-034 v2.38 (test-name recognizers) into the reconciliation scripts after v2.37.

Usage: test_names_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.37 choice
floor (syzygy-5dhm.43) is wired gains the same wiring for v2.38 with the choice floor as its predecessor, every filter that leaves out
the choice floor's row also leaves out this one (v2.38 stands on v2.37, so it leaves with it), and a selftest case mirrors the choice
floor's. Each edit asserts its anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once.
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
assert 'CHOICE_TAG = "polaris-dossier-choice-floor-v2.37"' in s, 'predecessor is not the v2.37 choice floor'


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
    """The choice floor's wiring as the test-name recognizers': its predecessor first, then itself, so the renames never collide."""
    pred = [('p5_advice_effective', '@P1@'), ('p5_advice_member_delta', '@PMD@'), ('P5_ADVICE_SPEC', '@P2@'),
            ('"v2.36 source-example advice"', '@P3@'), ('source-example advice v2.36', '@P4@'), ('prior v2.36 source-example advice', '@P5@'),
            ('requires effective v2.36', '@P6@'), ('is_choice_row', '@P7@'), ('advice is None', '@P8@')]
    for old, mark in pred:
        text = text.replace(old, mark)
    text = (text.replace('CHOICE_', 'TNAMES_').replace('choice_', 'tnames_').replace('choice floor', 'test-name recognizers')
            .replace('dossier-choice-floor', 'dossier-test-names').replace('choice-floor-', 'test-names-').replace('v2.37', 'v2.38'))
    back = {'@P1@': 'choice_binding', '@PMD@': 'p5_advice_member_delta', '@P2@': 'CHOICE_SPEC', '@P3@': '"v2.37 choice floor"',
            '@P4@': 'choice floor v2.37', '@P5@': 'prior v2.37 choice floor', '@P6@': 'requires effective v2.37', '@P7@': 'is_choice_row',
            '@P8@': 'choice_amendment is None'}
    for mark, new in back.items():
        text = text.replace(mark, new)
    assert not re.search(r'@P[0-9A-Z]+@', text), text
    return text


# 0. Every filter that leaves out the choice floor's row leaves out this one too (before any mirrored code exists).
n = s.count('not is_choice_row(line)')
s = s.replace('not is_choice_row(line)', 'not is_choice_row(line) and not is_tnames_row(line)')
m = s.count('not is_choice_row(line.rstrip("\\n"))')
s = s.replace('not is_choice_row(line.rstrip("\\n"))', 'not is_choice_row(line.rstrip("\\n")) and not is_tnames_row(line.rstrip("\\n"))')
assert n == 12 and m == 1, (n, m)

# 1. Constants.
consts = block(s, '# The v2.37 choice floor (syzygy-5dhm.43)', 'CHOICE_BOUND_PARTS = len(CHOICE_SUBJECTS)\n')
mine = rename(consts).replace('(syzygy-5dhm.43)', '(syzygy-5dhm.45)').replace('the v2.36 source-example advice', 'the v2.37 choice floor')
mine = mine.replace('[Choice floor amendment 2.37]', '[Test-name recognizers amendment 2.38]')
mine = mine.replace('"With the choice floor"', '"With the test-name recognizers"')
mine = mine.replace('"With the choice floor version effective', '"With the test-name recognizers version effective')
mine = re.sub(r'TNAMES_SPEC: "[0-9a-f]{64}"', f'TNAMES_SPEC: "{subject}"', mine)
for needle in ('"polaris-dossier-test-names-v2.38"', '[Test-name recognizers amendment 2.38]', subject, '"dossier-test-names"',
               '"With the test-name recognizers"'):
    assert needle in mine, needle
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_choice_row(line):\n', '    return None\n')
# rename() keeps `is_choice_row` for predecessor references; here the cloned row test is this version's own.
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_choice_row(line):') == 1 and mine_funcs.count('if is_choice_row(line)') == 1, mine_funcs
mine_funcs = mine_funcs.replace('def is_choice_row(line):', 'def is_tnames_row(line):').replace('if is_choice_row(line)', 'if is_tnames_row(line)')
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def choice_binding(root):\n', '    )\n')
delta = block(s, 'def choice_delta(root, findings):\n', '    return added\n')
mine = rename(binding).replace('only over the effective v2.36 source-example advice REQ-034.', 'only over the effective v2.37 choice floor REQ-034.')
assert 'effective v2.37 choice floor REQ-034' in mine, mine
assert 'predecessor=choice_binding, predecessor_label="v2.37 choice floor", version="v2.38"' in mine, mine
assert 'label="test-name recognizers"' in mine
mine_delta = rename(delta).replace('the test-name recognizers adds to REQ-034 over the source-example advice', 'the test-name recognizers add to REQ-034 over the choice floor')
assert 'over the choice floor, counted' in mine_delta
assert '@PMD' not in mine_delta and 'read_text(root, CHOICE_SPEC)' in mine_delta and 'read_text(root, TNAMES_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    choice_retired_by = choice_disposition(root, choice_rows(root))\n', '    r2 += choice_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, '        retirement += f"; v2.37 inactive by {choice_retired_by}"\n',
          '    if tnames_retired_by:\n        retirement += f"; v2.38 inactive by {tnames_retired_by}"\n')

# 4. The census composition: v2.38 composes only over an effective v2.37.
comp = block(s, '        choice_amendment, choice_records, choice_subjects = choice_binding(root)\n        findings += choice_records + choice_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if choice_amendment is None:' in mine and 'requires effective choice floor v2.37' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection.
sel = block(s, '        choice_amendment, _records, _subjects = choice_binding(root)\n        if choice_amendment is not None:\n            by_id,',
            '            selected_population = by_id\n')
s = after(s, sel, rename(sel))

# 6. The scenario arithmetic.
s = after(s, '    if choice_binding(root)[0] is not None:\n        n_scen += choice_delta(root, findings)\n',
          '    if tnames_binding(root)[0] is not None:\n        n_scen += tnames_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if choice_amendment is not None:\n        files += tracked(root, CHOICE_HOME)\n',
          '    tnames_amendment, _records, _subjects = tnames_binding(root)\n'
          '    if tnames_amendment is not None:\n        files += tracked(root, TNAMES_HOME)\n')
s = s.replace('                        (choice_amendment, CHOICE_UNION)):',
              '                        (choice_amendment, CHOICE_UNION),\n                        (tnames_amendment, TNAMES_UNION)):', 1)
assert '(tnames_amendment, TNAMES_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    choice_amendment, _records, _subjects = choice_binding(root)\n    choice_fields = ',
               '`{OPENSPEC_README}` calls choice floor v2.37 adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count('test-name recognizers v2.38') == 4, mine
s = after(s, routes, mine)

# 9. The status census: v2.38's sentence states the current total, then v2.37's states its own.
cen = block(s, '        if choice_binding(root)[0] is not None:\n            # The choice floor\'s own sentence',
            'declares a choice floor census while it is not in force")\n')
mine = rename(cen).replace("# The test-name recognizers's own sentence states the current total; the earlier sentences state theirs.",
                           "# The test-name recognizers' own sentence states the current total; the earlier sentences state theirs.")
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {CHOICE_UNION, *CHOICE_SUBJECTS}\n', '    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the choice floor's (.43's d208c6135).
s = after(s, '    choice_subjects = CHOICE_BOUND_PARTS if choice_rows_now and not choice_retired else 0\n',
          '    tnames_rows_now = tnames_rows(tree)\n'
          '    tnames_retired = tnames_disposition(tree, tnames_rows_now)\n'
          '    tnames_records = 2 if tnames_retired else int(bool(tnames_rows_now))\n'
          '    tnames_subjects = TNAMES_BOUND_PARTS if tnames_rows_now and not tnames_retired else 0\n')
s = after(s, ' - vbase_records - choice_records', ' - tnames_records')
s = after(s, ' - vbase_subjects - choice_subjects', ' - tnames_subjects')

# 12. The earlier-history projection: v2.38 stands on v2.37, so its routes leave with it.
s = s.replace('    prefixes = (P5_ADVICE_STATUS_PREFIX, P5_ADVICE_COUNT_SCOPE, CHOICE_STATUS_PREFIX, CHOICE_COUNT_SCOPE)\n',
              '    prefixes = (P5_ADVICE_STATUS_PREFIX, P5_ADVICE_COUNT_SCOPE, CHOICE_STATUS_PREFIX, CHOICE_COUNT_SCOPE,\n'
              '                TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)\n', 1)
s = s.replace('        else _candidate_index_row(line) if line.strip().startswith(CHOICE_INDEX_PREFIX) else line\n',
              '        else _candidate_index_row(line) if line.strip().startswith((CHOICE_INDEX_PREFIX, TNAMES_INDEX_PREFIX)) else line\n', 1)
assert 'TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)' in s and '(CHOICE_INDEX_PREFIX, TNAMES_INDEX_PREFIX)' in s

# 13. The selftest case, mirroring the choice floor's.
case = block(s, 'def choice_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
mine = mine.replace('if not is_tnames_row(line) and not is_tnames_row(line))', 'if not is_tnames_row(line))')
mine = mine.replace('    """Guard the test-name recognizers\'s row,', '    """Guard the test-name recognizers\' row,')
old_floor = ('    changed = "A group with fewer than four items on record is one advisory"\n'
             '    current_capacity = "A group with fewer than three items on record is one advisory"\n')
assert mine.count(old_floor) == 1
mine = mine.replace(old_floor, '    changed = "each recognizer reads and lists at most 251 files"\n'
                               '    current_capacity = "each recognizer reads and lists at most 250 files"\n')
mine = mine.replace('record("modified-floor", TNAMES_SPEC', 'record("modified-limit", TNAMES_SPEC')
mine = mine.replace('# The row without an effective v2.36 predecessor is refused', '# The row without an effective v2.37 predecessor is refused')
mine = mine.replace('''    The selftest base is projected onto the history before the v2.36 source-example advice, whose
    effectiveness needs its protected Git tag, so the test-name recognizers can only be pending or refused here;''',
                    '''    The selftest base is projected onto the history before the v2.36 source-example advice, whose
    effectiveness needs its protected Git tag; the v2.37 choice floor leaves with it, so the test-name recognizers can only be
    pending or refused here;''')
assert 'effective v2.37 predecessor is refused' in mine and 'the v2.37 choice floor leaves with it' in mine
for needle in ('"R1 requires effective v2.37"', '"prior v2.37 choice floor"', 'at most 250 files', 'test-names-{name}',
               'Path(tmp) / "dossier-test-names"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: choice_cases(tmp, base, w, f),\n', '        lambda w, f: tnames_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose v2.38 over v2.37, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def choice_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('choice_amendment', 'tnames_amendment').replace('choice_binding', 'tnames_binding')
          .replace('choice floor', 'test-name recognizers'))
c = c.replace('                        (adoption.CHOICE_SPEC, choice_amendment(root))):',
              '                        (adoption.CHOICE_SPEC, choice_amendment(root)),\n'
              '                        (adoption.TNAMES_SPEC, tnames_amendment(root))):', 1)
c = c.replace('    choice_amendment(root)\n    paths = ', '    choice_amendment(root)\n    tnames_amendment(root)\n    paths = ', 1)
c = c.replace('*adoption.CHOICE_SUBJECTS,\n', '*adoption.CHOICE_SUBJECTS, *adoption.TNAMES_SUBJECTS,\n', 1)
c = c.replace('''            if any(line.startswith(adoption.CHOICE_COUNT_SCOPE) for line in lines):
                raise ScenarioCountError(f"{path} declares a choice floor count while it is not in force")
''', '''            if any(line.startswith((adoption.CHOICE_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines):
                raise ScenarioCountError(f"{path} declares a choice floor count while it is not in force")
''', 1)
old_ret = '''            raise ScenarioCountError(f"{path} choice floor count differs from its two source members")
        return int(choice[1]), int(choice[2])
'''
assert c.count(old_ret) == 1
c = c.replace(old_ret, '''            raise ScenarioCountError(f"{path} choice floor count differs from its two source members")
        choice_figure = int(choice[1]), int(choice[2])
        if tnames_amendment(root) is None:
            if any(line.startswith(adoption.TNAMES_COUNT_SCOPE) for line in lines):
                raise ScenarioCountError(f"{path} declares a test-name recognizers count while it is not in force")
            return choice_figure
        tnames = [line for line in lines if line.startswith(adoption.TNAMES_COUNT_SCOPE)]
        tname = CHOICE_COUNT.fullmatch(tnames[0].removeprefix(adoption.TNAMES_COUNT_PREFIX)) if len(tnames) == 1 else None
        if tname is None:
            raise ScenarioCountError(f"{path} needs one complete test-name recognizers count")
        added = adoption.tnames_delta(root, findings)
        if findings or (int(tname[1]), int(tname[2])) != (choice_figure[0], choice_figure[1] + added):
            raise ScenarioCountError(f"{path} test-name recognizers count differs from its two source members")
        return int(tname[1]), int(tname[2])
''', 1)
for needle in ('tnames_amendment(root)\n    paths', '(adoption.TNAMES_SPEC, tnames_amendment(root))', '*adoption.TNAMES_SUBJECTS',
               'adoption.TNAMES_COUNT_SCOPE)) for line in lines'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
