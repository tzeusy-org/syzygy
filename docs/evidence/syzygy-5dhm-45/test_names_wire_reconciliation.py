#!/usr/bin/env python3
"""syzygy-5dhm.45: wire REQ-polaris-generation-034 v2.34 (test-name recognizers) into the reconciliation scripts after v2.33.

Usage: test_names_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.33 choice
floor is wired gains the same wiring for v2.34 with the choice floor as its predecessor, every pending filter that leaves out the choice
floor's row also leaves out this one, and a selftest case mirrors the choice floor's. Each edit asserts its anchor occurs once, so a
run over a changed predecessor stops rather than guessing. Run once.
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


def after(text: str, anchor: str, add: str) -> str:
    assert text.count(anchor) == 1, anchor[:90]
    return text.replace(anchor, anchor + add, 1)


def block(text: str, start: str, end: str) -> str:
    """The text from `start` through `end`, each once."""
    assert text.count(start) == 1, start[:90]
    i = text.index(start)
    j = text.index(end, i)
    return text[i:j + len(end)]


def rename(text: str) -> str:
    """The choice floor's wiring as the test-name recognizers', predecessor first so the two renames never collide."""
    text = text.replace('qkind_binding', '@PRED_BINDING@').replace('qkind_amendment', '@PRED_AMENDMENT@')
    text = text.replace('is_qkind_row', '@PRED_ROW@').replace('v2.32 question-kind floor', '@PRED_LABEL@')
    text = text.replace('question-kind floor v2.32', '@PRED_LABEL2@').replace('question-kind-floor', '@PRED_SLUG@')
    text = text.replace('"prior v2.32"', '"@PRED_PRIOR@"').replace('requires effective v2.32', 'requires effective @PRED_V@')
    text = (text.replace('CHOICE_', 'TNAMES_').replace('choice_', 'tnames_').replace('choice floor', 'test-name recognizers')
            .replace('dossier-choice-floor', 'dossier-test-names').replace('choice-floor-', 'test-names-').replace('v2.33', 'v2.34'))
    text = (text.replace('@PRED_BINDING@', 'choice_binding').replace('@PRED_AMENDMENT@', 'choice_amendment')
            .replace('@PRED_ROW@', 'is_choice_row').replace('@PRED_LABEL@', 'v2.33 choice floor')
            .replace('@PRED_LABEL2@', 'choice floor v2.33').replace('@PRED_SLUG@', 'choice-floor')
            .replace('@PRED_PRIOR@', 'prior v2.33').replace('@PRED_V@', 'v2.33'))
    return text


# 1. Constants.
consts = block(s, '# The v2.33 choice floor (syzygy-5dhm.43)', 'CHOICE_BOUND_PARTS = len(CHOICE_SUBJECTS)\n')
mine = rename(consts).replace('(syzygy-5dhm.43)', '(syzygy-5dhm.45)').replace('the v2.32 question-kind floor', 'the v2.33 choice floor')
mine = mine.replace('[Choice floor amendment 2.33]', '[Test-name recognizers amendment 2.34]')
mine = re.sub(r'TNAMES_SPEC: "[0-9a-f]{64}"', f'TNAMES_SPEC: "{subject}"', mine)
assert '"polaris-dossier-test-names-v2.34"' in mine and '[Test-name recognizers amendment 2.34]' in mine and subject in mine
s = after(s, consts, mine)

# 2. Row, disposition and binding functions.
funcs = block(s, 'def is_choice_row(line):\n', '        label="choice floor",\n    )\n')
mine = rename(funcs).replace('Apply the test-name recognizers only over the effective v2.32 choice-floor REQ-034.',
                             'Apply the test-name recognizers only over the effective v2.33 choice-floor REQ-034.')
assert 'predecessor=choice_binding, predecessor_label="v2.33 choice floor", version="v2.34"' in mine
s = after(s, funcs, '\n\n' + mine)

# 3. check_outcomes.
outcome = block(s, '    choice_retired_by = choice_disposition(root, choice_rows(root))\n', '    r2 += choice_subjects\n')
s = after(s, outcome, rename(outcome))
s = after(s, '        retirement += f"; v2.33 inactive by {choice_retired_by}"\n',
          '    if tnames_retired_by:\n        retirement += f"; v2.34 inactive by {tnames_retired_by}"\n')

# 4. census: the choice floor's composition, then this one's over it.
census = block(s, '        choice_amendment, choice_records, choice_subjects = choice_binding(root)\n        findings += choice_records + choice_subjects\n',
               '                pb += extra_b\n')
mine = rename(census)
mine = mine.replace('if choice_amendment is None:', '@X@').replace('if qkind_amendment is None:', 'if choice_amendment is None:')
assert 'if choice_amendment is None:\n                findings.append("POLARIS: test-name recognizers requires effective choice floor v2.33")' in mine.replace('@X@', 'if choice_amendment is None:'), mine
s = after(s, census, mine.replace('@X@', 'if choice_amendment is None:'))

# 5. polaris_expected.
expected = block(s, '    choice_amendment, _records, _subjects = choice_binding(root)\n    if choice_amendment is not None:\n        # Only 034 moves',
                 '            n_scen += replacement[0] - previous[0]\n')
mine = rename(expected).replace('after the question-kind floor v2.32', 'after the choice floor v2.33')
assert '_polaris_blocks_manual(choice_amendment or "")' in mine and '_polaris_blocks_manual(tnames_amendment)' in mine
s = after(s, expected, mine)

# 6. check_generated: tracked files and the warrant union.
s = after(s, '    if choice_amendment is not None:\n        files += tracked(root, CHOICE_HOME)\n',
          '    tnames_amendment, _records, _subjects = tnames_binding(root)\n    if tnames_amendment is not None:\n        files += tracked(root, TNAMES_HOME)\n')
s = after(s, '                        (choice_amendment, CHOICE_UNION)):', '')
s = s.replace('                        (choice_amendment, CHOICE_UNION)):',
              '                        (choice_amendment, CHOICE_UNION),\n                        (tnames_amendment, TNAMES_UNION)):', 1)

# 7. check_routes.
routes = block(s, '    choice_amendment, _records, _subjects = choice_binding(root)\n    choice_fields = ',
               '`{OPENSPEC_README}` calls choice floor v2.33 adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count('test-name recognizers v2.34') == 4
s = after(s, routes, mine)

# 8. inputs.
s = after(s, '    paths |= {CHOICE_UNION, *CHOICE_SUBJECTS}\n', '    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}\n')

# 9. Every pending filter that leaves out the choice floor's row leaves out this one too.
n = s.count('not is_choice_row(line)')
s = s.replace('not is_choice_row(line)', 'not is_choice_row(line) and not is_tnames_row(line)')
assert n >= 10, n

# 10. term_brief_cases: this route stands on the brief as the choice floor's does.
s = s.replace('(TERM_BRIEF_STATUS_PREFIX, QKIND_STATUS_PREFIX, CHOICE_STATUS_PREFIX)',
              '(TERM_BRIEF_STATUS_PREFIX, QKIND_STATUS_PREFIX, CHOICE_STATUS_PREFIX, TNAMES_STATUS_PREFIX)', 1)
s = s.replace('for successor in (QKIND_CHANGE, CHOICE_CHANGE):', 'for successor in (QKIND_CHANGE, CHOICE_CHANGE, TNAMES_CHANGE):', 1)
assert 'TNAMES_STATUS_PREFIX)' in s and 'CHOICE_CHANGE, TNAMES_CHANGE)' in s

# 11. The selftest case, mirroring the choice floor's.
case = block(s, 'def choice_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
mine = mine.replace('Guard the REQ034 succession over the question-kind floor', 'Guard the REQ034 succession over the choice floor')
mine = mine.replace('or qkind_binding(base)[0] is None', 'or choice_binding(base)[0] is None')
mine = mine.replace('== 220)', '== 222)').replace('"prior 034 has 220 scenarios"', '"prior 034 has 222 scenarios"')
mine = mine.replace('== 222\n', '== 228\n').replace('"only 034 moves from 220 to 222 scenarios"', '"only 034 moves from 222 to 228 scenarios"')
mine = mine.replace('if is_qkind_row(line))', 'if is_choice_row(line))')
mine = mine.replace('if not is_tnames_row(line) and not is_tnames_row(line))', 'if not is_tnames_row(line))')
old_floor = ('    changed = "A group with fewer than four items on record is one advisory"\n'
             '    current_capacity = "A group with fewer than three items on record is one advisory"\n')
assert mine.count(old_floor) == 1
mine = mine.replace(old_floor, '    changed = "each recognizer reads and lists at most 251 files"\n'
                               '    current_capacity = "each recognizer reads and lists at most 250 files"\n')
mine = mine.replace('record("modified-floor", TNAMES_SPEC', 'record("modified-limit", TNAMES_SPEC')
for needle in ('== 222)', '== 228\n', 'if is_choice_row(line))', 'choice_binding(base)[0] is None', 'at most 250 files', '"prior v2.33"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '    choice_cases(tmp, base, witnesses, failures)\n', '    tnames_cases(tmp, base, witnesses, failures)\n')
recon.write_text(s, encoding='utf-8')

# 12. The scenario counter's composition.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def choice_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('choice_amendment', 'tnames_amendment').replace('choice_binding', 'tnames_binding').replace('choice floor', 'test-name recognizers'))
c = c.replace('                        (adoption.CHOICE_SPEC, choice_amendment(root))):',
              '                        (adoption.CHOICE_SPEC, choice_amendment(root)),\n                        (adoption.TNAMES_SPEC, tnames_amendment(root))):', 1)
c = after(c, '    choice_amendment(root)\n    paths = ', '')
c = c.replace('    choice_amendment(root)\n    paths = ', '    choice_amendment(root)\n    tnames_amendment(root)\n    paths = ', 1)
c = c.replace('*adoption.CHOICE_SUBJECTS,', '*adoption.CHOICE_SUBJECTS, *adoption.TNAMES_SUBJECTS,', 1)
assert c.count('tnames_amendment(root)') == 2 and 'TNAMES_SUBJECTS' in c and 'adoption.TNAMES_SPEC' in c
count.write_text(c, encoding='utf-8')
print('wired')
