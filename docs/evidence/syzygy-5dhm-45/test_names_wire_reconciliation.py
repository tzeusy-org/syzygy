#!/usr/bin/env python3
"""syzygy-5dhm.45: wire REQ-polaris-generation-034 v2.42 (test-name recognizers) into the reconciliation scripts after v2.40.

Usage: test_names_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.40 figure
walks (syzygy-3efd.32) is wired gains the same wiring for v2.42 with the figure walks as its predecessor, every filter that leaves
out the figure walks' row also leaves out this one (v2.42 stands on v2.40, so it leaves with it), and a selftest case mirrors the
figure walks'. Derived from the earlier builds' scripts as each predecessor took a number first.
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
assert 'WALK_TAG = "polaris-dossier-figure-walks-v2.40"' in s, 'predecessor is not the v2.40 figure walks'


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
    """The figure walks's wiring as the test-name recognizers': its predecessor first, then itself, so the renames never collide."""
    pred = [('impfacts_binding', '@P1@'), ('p5_advice_member_delta', '@PMD@'), ('IMPFACTS_SPEC', '@P2@'),
            ('"v2.39 import facts"', '@P3@'), ('import facts v2.39', '@P4@'), ('prior v2.39 import facts', '@P5@'),
            ('requires effective v2.39', '@P6@'), ('is_walk_row', '@P7@'), ('impfacts_amendment is None', '@P8@')]
    for old, mark in pred:
        text = text.replace(old, mark)
    text = (text.replace('WALK_', 'TNAMES_').replace('walk_', 'tnames_').replace('figure walks', 'test-name recognizers')
            .replace('dossier-figure-walks', 'dossier-test-names').replace('figure-walks-', 'test-names-').replace('v2.40', 'v2.42'))
    back = {'@P1@': 'walk_binding', '@PMD@': 'p5_advice_member_delta', '@P2@': 'WALK_SPEC', '@P3@': '"v2.40 figure walks"',
            '@P4@': 'figure walks v2.40', '@P5@': 'prior v2.40 figure walks', '@P6@': 'requires effective v2.40', '@P7@': 'is_walk_row',
            '@P8@': 'walk_amendment is None'}
    for mark, new in back.items():
        text = text.replace(mark, new)
    assert not re.search(r'@P[0-9A-Z]+@', text), text
    return text


# 0. Every filter that leaves out the figure walks's row leaves out this one too (before any mirrored code exists).
n = s.count('not is_walk_row(line)')
s = s.replace('not is_walk_row(line)', 'not is_walk_row(line) and not is_tnames_row(line)')
m = s.count('not is_walk_row(line.rstrip("\\n"))')
s = s.replace('not is_walk_row(line.rstrip("\\n"))', 'not is_walk_row(line.rstrip("\\n")) and not is_tnames_row(line.rstrip("\\n"))')
assert n == 15 and m == 1, (n, m)

# 1. Constants.
consts = block(s, '# The v2.40 figure walks (syzygy-3efd.32)', 'WALK_BOUND_PARTS = len(WALK_SUBJECTS)\n')
mine = rename(consts).replace('(syzygy-3efd.32)', '(syzygy-5dhm.45)').replace('the v2.39 import facts', 'the v2.40 figure walks')
mine = mine.replace('[Figure walks amendment 2.40]', '[Test-name recognizers amendment 2.42]')
mine = mine.replace('# The v2.42 lexical test-name recognizers', '# The v2.42 test-name recognizers').replace(' (drafted over 2.33 as 2.NN)', '')
mine = mine.replace('"With the figure walks"', '"With the test-name recognizers"')
mine = mine.replace('"With the figure walks version effective', '"With the test-name recognizers version effective')
mine = re.sub(r'TNAMES_SPEC: "[0-9a-f]{64}"', f'TNAMES_SPEC: "{subject}"', mine)
for needle in ('"polaris-dossier-test-names-v2.42"', '[Test-name recognizers amendment 2.42]', subject, '"dossier-test-names"',
               '"With the test-name recognizers"'):
    assert needle in mine, needle
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_walk_row(line):\n', '    return None\n')
# rename() keeps `is_walk_row` for predecessor references; here the cloned row test is this version's own.
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_walk_row(line):') == 1 and mine_funcs.count('if is_walk_row(line)') == 1, mine_funcs
mine_funcs = mine_funcs.replace('def is_walk_row(line):', 'def is_tnames_row(line):').replace('if is_walk_row(line)', 'if is_tnames_row(line)')
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def walk_binding(root):\n', '    )\n')
delta = block(s, 'def walk_delta(root, findings):\n', '    return added\n')
mine = rename(binding).replace('only over the effective v2.39 import facts REQ-034.', 'only over the effective v2.40 figure walks REQ-034.')
assert 'effective v2.40 figure walks REQ-034' in mine, mine
assert 'predecessor=walk_binding, predecessor_label="v2.40 figure walks", version="v2.42"' in mine, mine
assert 'label="test-name recognizers"' in mine
mine_delta = rename(delta).replace('the test-name recognizers add to REQ-034 over the import facts', 'the test-name recognizers add to REQ-034 over the figure walks')
assert 'over the figure walks, counted' in mine_delta
assert '@PMD' not in mine_delta and 'read_text(root, WALK_SPEC)' in mine_delta and 'read_text(root, TNAMES_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    walk_retired_by = walk_disposition(root, walk_rows(root))\n', '    r2 += walk_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, '        retirement += f"; v2.40 inactive by {walk_retired_by}"\n',
          '    if tnames_retired_by:\n        retirement += f"; v2.42 inactive by {tnames_retired_by}"\n')

# 4. The census composition: v2.42 composes only over an effective v2.40.
comp = block(s, '        walk_amendment, walk_records, walk_subjects = walk_binding(root)\n        findings += walk_records + walk_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if walk_amendment is None:' in mine and 'require effective figure walks v2.40' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection.
sel = block(s, '                    walk_amendment, _records, _subjects = walk_binding(root)\n                    if walk_amendment is not None:\n                        by_id,',
            '                        selected_population = by_id\n')
# Nested one level deeper, inside the figure walks' own branch: v2.42 projects only over an effective v2.40.
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if walk_binding(root)[0] is not None:\n        n_scen += walk_delta(root, findings)\n',
          '    if tnames_binding(root)[0] is not None:\n        n_scen += tnames_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if walk_amendment is not None:\n        files += tracked(root, WALK_HOME)\n',
          '    tnames_amendment, _records, _subjects = tnames_binding(root)\n'
          '    if tnames_amendment is not None:\n        files += tracked(root, TNAMES_HOME)\n')
s = s.replace('                        (walk_amendment, WALK_UNION)):',
              '                        (walk_amendment, WALK_UNION),\n                        (tnames_amendment, TNAMES_UNION)):', 1)
assert '(tnames_amendment, TNAMES_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    walk_amendment, _records, _subjects = walk_binding(root)\n    walk_fields = ',
               '`{OPENSPEC_README}` calls figure walks v2.40 adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count('test-name recognizers v2.42') == 4, mine
s = after(s, routes, mine)

# 9. The status census: v2.42's sentence states the current total, then v2.40's states its own.
cen = block(s, '        if walk_binding(root)[0] is not None:\n            # The figure walks\' own sentence',
            'declares an figure walks census while it is not in force")\n')
mine = rename(cen).replace('declares an test-name recognizers census', 'declares a test-name recognizers census').replace("# The test-name recognizers' own sentence states the current total; the earlier sentences state theirs.",
                           "# The test-name recognizers' own sentence states the current total; the earlier sentences state theirs.")
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {WALK_UNION, *WALK_SUBJECTS}\n', '    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the figure walks's (3efd.60's d208c6135).
s = after(s, '    walk_subjects = WALK_BOUND_PARTS if walk_rows_now and not walk_retired else 0\n',
          '    tnames_rows_now = tnames_rows(tree)\n'
          '    tnames_retired = tnames_disposition(tree, tnames_rows_now)\n'
          '    tnames_records = 2 if tnames_retired else int(bool(tnames_rows_now))\n'
          '    tnames_subjects = TNAMES_BOUND_PARTS if tnames_rows_now and not tnames_retired else 0\n')
s = after(s, ' - impfacts_records - walk_records', ' - tnames_records')
s = after(s, ' - impfacts_subjects - walk_subjects', ' - tnames_subjects')

# 12. The earlier-history projection: v2.42 stands on v2.40, so its routes leave with it.
s = s.replace('                WALK_STATUS_PREFIX, WALK_COUNT_SCOPE)\n',
              '                WALK_STATUS_PREFIX, WALK_COUNT_SCOPE, TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)\n', 1)
s = s.replace('the v2.40 figure walks on v2.39, so their routes leave with it.', 'the v2.40 figure walks on v2.39 and\n    # the v2.42 test-name recognizers on v2.40, so their routes leave with it.', 1)
s = s.replace(' WALK_INDEX_PREFIX)) else line\n',
              ' WALK_INDEX_PREFIX, TNAMES_INDEX_PREFIX)) else line\n', 1)
assert 'TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE)' in s and 'WALK_INDEX_PREFIX, TNAMES_INDEX_PREFIX)) else line' in s

# 13. The selftest case, mirroring the figure walks's.
case = block(s, 'def walk_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
mine = mine.replace('if not is_tnames_row(line) and not is_tnames_row(line))', 'if not is_tnames_row(line))')
mine = mine.replace('    """Guard the test-name recognizers\'s row,', '    """Guard the test-name recognizers\' row,')
old_floor = ('    current_bound = "is a list of 2 to 12 steps in reading order"\n'
             '    changed = "is a list of 2 to 16 steps in reading order"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "each recognizer reads and lists at most 250 files"\n'
                               '    changed = "each recognizer reads and lists at most 251 files"\n')
assert mine.count('record("modified-step-bound", TNAMES_SPEC') == 1
mine = mine.replace('record("modified-step-bound", TNAMES_SPEC', 'record("modified-limit", TNAMES_SPEC')
mine = mine.replace('# The row without an effective v2.39 predecessor is refused', '# The row without an effective v2.40 predecessor is refused')
old_doc = ('    v2.39 import facts this version stands on is not effective there either, and the test-name recognizers\n'
           '    can only be pending or refused here;')
assert mine.count(old_doc) == 1, mine[:900]
mine = mine.replace(old_doc, '    v2.39 import facts and the v2.40 figure walks this version stands on are not effective there either,\n'
                             '    and the test-name recognizers can only be pending or refused here;')
assert 'effective v2.40 predecessor is refused' in mine and 'the v2.40 figure walks this version stands on' in mine
for needle in ('"R1 requires effective v2.40"', '"prior v2.40 figure walks"', 'at most 250 files', 'test-names-{name}',
               'Path(tmp) / "dossier-test-names"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: walk_cases(tmp, base, w, f),\n', '        lambda w, f: tnames_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose v2.42 over v2.40, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def walk_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('walk_amendment', 'tnames_amendment').replace('walk_binding', 'tnames_binding')
          .replace('figure walks', 'test-name recognizers'))
c = after(c, '                        (adoption.WALK_SPEC, walk_amendment(root))', ',\n'
          '                        (adoption.TNAMES_SPEC, tnames_amendment(root))')
c = after(c, '    walk_amendment(root)\n', '    tnames_amendment(root)\n')
c = after(c, '*adoption.WALK_SUBJECTS,', ' *adoption.TNAMES_SUBJECTS,')
# Every not-in-force guard that refuses a figure-walks count also refuses this version's.
n = c.count(', adoption.WALK_COUNT_SCOPE))') + c.count('\n                                    adoption.WALK_COUNT_SCOPE))')
assert n == 3, n
c = c.replace(', adoption.WALK_COUNT_SCOPE))', ', adoption.WALK_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE))')
c = c.replace('\n                                    adoption.WALK_COUNT_SCOPE))', '\n                                    adoption.WALK_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE))')
old = '            if any(line.startswith(adoption.WALK_COUNT_SCOPE) for line in lines):\n'
assert c.count(old) == 1
c = c.replace(old, '            if any(line.startswith((adoption.WALK_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines):\n', 1)
old_ret = ('            raise ScenarioCountError(f"{path} figure walks count differs from its two source members")\n'
           '        return int(walk[1]), int(walk[2])\n')
assert c.count(old_ret) == 1
new_ret = ('            raise ScenarioCountError(f"{path} figure walks count differs from its two source members")\n'
           '        walk_figure = int(walk[1]), int(walk[2])\n'
           '        if tnames_amendment(root) is None:\n'
           '            if any(line.startswith(adoption.TNAMES_COUNT_SCOPE) for line in lines):\n'
           '                raise ScenarioCountError(f"{path} declares a test-name recognizers count while it is not in force")\n'
           '            return walk_figure\n'
           '        tnames = [line for line in lines if line.startswith(adoption.TNAMES_COUNT_SCOPE)]\n'
           '        tname = CHOICE_COUNT.fullmatch(tnames[0].removeprefix(adoption.TNAMES_COUNT_PREFIX)) if len(tnames) == 1 else None\n'
           '        if tname is None:\n'
           '            raise ScenarioCountError(f"{path} needs one complete test-name recognizers count")\n'
           '        added = adoption.tnames_delta(root, findings)\n'
           '        if findings or (int(tname[1]), int(tname[2])) != (walk_figure[0], walk_figure[1] + added):\n'
           '            raise ScenarioCountError(f"{path} test-name recognizers count differs from its two source members")\n'
           '        return int(tname[1]), int(tname[2])\n')
c = c.replace(old_ret, new_ret, 1)
for needle in ('    tnames_amendment(root)\n', '(adoption.TNAMES_SPEC, tnames_amendment(root))', '*adoption.TNAMES_SUBJECTS',
               '(adoption.WALK_COUNT_SCOPE, adoption.TNAMES_COUNT_SCOPE)) for line in lines', 'return int(tname[1]), int(tname[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
