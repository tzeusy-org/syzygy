#!/usr/bin/env python3
"""syzygy-5dhm.46: wire REQ-polaris-generation-034 VERSION (rough-edge markers) into the reconciliation scripts after v2.42.

Usage: rough_edges_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.42 test-name
recognizers (syzygy-5dhm.45) are wired gains the same wiring for this version with the test-name recognizers as its predecessor, every
filter that leaves out the test-name recognizers' row also leaves out this one (this version stands on v2.42, so it leaves with it), and a
selftest case mirrors the test-name recognizers'. Cloned from syzygy-5dhm.45's own wiring script.
Each edit asserts its anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once. A renumber is a re-run
over a fresh copy of the two scripts with VERSION changed.
"""
import pathlib
import re
import sys

VERSION = '2.43'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'ROUGH_' not in s, 'already wired'
assert 'TNAMES_TAG = "polaris-dossier-test-names-v2.42"' in s, 'predecessor is not the v2.42 test-name recognizers'


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
    """The test-name recognizers' wiring as the rough-edge markers': its predecessor first, then itself, so the renames never collide."""
    pred = [('walk_binding', '@P1@'), ('WALK_SPEC', '@P2@'), ('"v2.40 figure walks"', '@P3@'), ('prior v2.40 figure walks', '@P5@'),
            ('figure walks v2.40', '@P4@'), ('requires effective v2.40', '@P6@'), ('is_walk_row', '@P7@'),
            ('walk_amendment is None', '@P8@')]
    for old, mark in pred:
        text = text.replace(old, mark)
    text = (text.replace('TNAMES_', 'ROUGH_').replace('tnames_', 'rough_').replace('test-name recognizers', 'rough-edge markers')
            .replace('Test-name recognizers', 'Rough-edge markers').replace('dossier-test-names', 'dossier-rough-edges')
            .replace('test-names-', 'rough-edges-').replace('v2.42', f'v{VERSION}').replace('amendment 2.42]', f'amendment {VERSION}]').replace('syzygy-5dhm.45', 'syzygy-5dhm.46'))
    back = {'@P1@': 'tnames_binding', '@P2@': 'TNAMES_SPEC', '@P3@': '"v2.42 test-name recognizers"',
            '@P4@': 'test-name recognizers v2.42', '@P5@': 'prior v2.42 test-name recognizers', '@P6@': 'requires effective v2.42',
            '@P7@': 'is_tnames_row', '@P8@': 'tnames_amendment is None'}
    for mark, new in back.items():
        text = text.replace(mark, new)
    assert not re.search(r'@P[0-9A-Z]+@', text), text
    return text


# 0. Every filter that leaves out the test-name recognizers' row leaves out this one too (before any mirrored code exists).
n = s.count('not is_tnames_row(line)')
s = s.replace('not is_tnames_row(line)', 'not is_tnames_row(line) and not is_rough_row(line)')
m = s.count('not is_tnames_row(line.rstrip("\\n"))')
s = s.replace('not is_tnames_row(line.rstrip("\\n"))', 'not is_tnames_row(line.rstrip("\\n")) and not is_rough_row(line.rstrip("\\n"))')
assert n == 16 and m == 1, (n, m)

# 1. Constants.
consts = block(s, '# The v2.42 test-name recognizers (syzygy-5dhm.45)', 'TNAMES_BOUND_PARTS = len(TNAMES_SUBJECTS)\n')
mine = rename(consts).replace('the v2.40 figure walks', 'the v2.42 test-name recognizers')
mine = re.sub(r'ROUGH_SPEC: "[0-9a-f]{64}"', f'ROUGH_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-rough-edges-v{VERSION}"', f'[Rough-edge markers amendment {VERSION}]', subject, '"dossier-rough-edges"',
               '"With the rough-edge markers"', 'after\n# the v2.42 test-name recognizers'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_tnames_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_rough_row(line):') == 1 and mine_funcs.count('if is_rough_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def tnames_binding(root):\n', '    )\n')
delta = block(s, 'def tnames_delta(root, findings):\n', '    return added\n')
mine = rename(binding).replace('only over the effective v2.40 figure walks REQ-034.', 'only over the effective v2.42 test-name recognizers REQ-034.')
assert 'effective v2.42 test-name recognizers REQ-034' in mine, mine
assert f'predecessor=tnames_binding, predecessor_label="v2.42 test-name recognizers", version="v{VERSION}"' in mine, mine
assert 'label="rough-edge markers"' in mine
mine_delta = rename(delta).replace('the rough-edge markers add to REQ-034 over the figure walks', 'the rough-edge markers add to REQ-034 over the test-name recognizers')
assert 'over the test-name recognizers, counted' in mine_delta, mine_delta
assert 'read_text(root, TNAMES_SPEC)' in mine_delta and 'read_text(root, ROUGH_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    tnames_retired_by = tnames_disposition(root, tnames_rows(root))\n', '    r2 += tnames_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, '        retirement += f"; v2.42 inactive by {tnames_retired_by}"\n',
          f'    if rough_retired_by:\n        retirement += f"; v{VERSION} inactive by {{rough_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.42.
comp = block(s, '        tnames_amendment, tnames_records, tnames_subjects = tnames_binding(root)\n        findings += tnames_records + tnames_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if tnames_amendment is None:' in mine and 'require effective test-name recognizers v2.42' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the test-name recognizers' own branch.
sel = block(s, '                        tnames_amendment, _records, _subjects = tnames_binding(root)\n                        if tnames_amendment is not None:\n                            by_id,',
            '                            selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if tnames_binding(root)[0] is not None:\n        n_scen += tnames_delta(root, findings)\n',
          '    if rough_binding(root)[0] is not None:\n        n_scen += rough_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if tnames_amendment is not None:\n        files += tracked(root, TNAMES_HOME)\n',
          '    rough_amendment, _records, _subjects = rough_binding(root)\n'
          '    if rough_amendment is not None:\n        files += tracked(root, ROUGH_HOME)\n')
s = s.replace('                        (tnames_amendment, TNAMES_UNION)):',
              '                        (tnames_amendment, TNAMES_UNION),\n                        (rough_amendment, ROUGH_UNION)):', 1)
assert '(rough_amendment, ROUGH_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    tnames_amendment, _records, _subjects = tnames_binding(root)\n    tnames_fields = ',
               '`{OPENSPEC_README}` calls test-name recognizers v2.42 adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'rough-edge markers v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, then v2.42's states its own.
cen = block(s, '        if tnames_binding(root)[0] is not None:\n            # The test-name recognizers\' own sentence',
            'declares a test-name recognizers census while it is not in force")\n')
mine = rename(cen)
assert 'declares a rough-edge markers census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {TNAMES_UNION, *TNAMES_SUBJECTS}\n', '    paths |= {ROUGH_UNION, *ROUGH_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the test-name recognizers'.
s = after(s, '    tnames_subjects = TNAMES_BOUND_PARTS if tnames_rows_now and not tnames_retired else 0\n',
          '    rough_rows_now = rough_rows(tree)\n'
          '    rough_retired = rough_disposition(tree, rough_rows_now)\n'
          '    rough_records = 2 if rough_retired else int(bool(rough_rows_now))\n'
          '    rough_subjects = ROUGH_BOUND_PARTS if rough_rows_now and not rough_retired else 0\n')
s = after(s, ' - walk_records - tnames_records', ' - rough_records')
s = after(s, ' - walk_subjects - tnames_subjects', ' - rough_subjects')

# 12. The earlier-history projection: this version stands on v2.42, so its routes leave with it.
s = after(s, 'WALK_STATUS_PREFIX, WALK_COUNT_SCOPE, TNAMES_STATUS_PREFIX, TNAMES_COUNT_SCOPE', ', ROUGH_STATUS_PREFIX, ROUGH_COUNT_SCOPE')
s = s.replace('    # the v2.42 test-name recognizers on v2.40, so their routes leave with it.',
              f'    # the v2.42 test-name recognizers on v2.40 and the v{VERSION} rough-edge markers on v2.42, so their routes leave with it.', 1)
s = after(s, 'WALK_INDEX_PREFIX, TNAMES_INDEX_PREFIX', ', ROUGH_INDEX_PREFIX')
assert f'rough-edge markers on v2.42, so their routes leave with it.' in s

# 13. The selftest case, mirroring the test-name recognizers'.
case = block(s, 'def tnames_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_tnames_row(line) and not is_rough_row(line) and not is_rough_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_tnames_row(line) and not is_rough_row(line))')
old_floor = ('    current_bound = "each recognizer reads and lists at most 250 files"\n'
             '    changed = "each recognizer reads and lists at most 251 files"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "the recognizer reads and lists at most 1000 files"\n'
                               '    changed = "the recognizer reads and lists at most 1001 files"\n')
mine = mine.replace('# The row without an effective v2.40 predecessor is refused', '# The row without an effective v2.42 predecessor is refused')
old_doc = ('    v2.39 import facts and the v2.40 figure walks this version stands on are not effective there either,\n'
           '    and the rough-edge markers can only be pending or refused here;')
assert mine.count(old_doc) == 1, mine[:900]
mine = mine.replace(old_doc, '    v2.39 import facts, the v2.40 figure walks and the v2.42 test-name recognizers this version stands on are\n'
                             '    not effective there either, and the rough-edge markers can only be pending or refused here;')
for needle in ('"R1 requires effective v2.42"', '"prior v2.42 test-name recognizers"', 'at most 1000 files', 'rough-edges-{name}',
               'Path(tmp) / "dossier-rough-edges"', 'effective v2.42 predecessor is refused'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: tnames_cases(tmp, base, w, f),\n', '        lambda w, f: rough_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.42, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def tnames_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('tnames_amendment', 'rough_amendment').replace('tnames_binding', 'rough_binding')
          .replace('test-name recognizers', 'rough-edge markers'))
c = after(c, '                        (adoption.TNAMES_SPEC, tnames_amendment(root))', ',\n'
          '                        (adoption.ROUGH_SPEC, rough_amendment(root))')
c = after(c, '    tnames_amendment(root)\n', '    rough_amendment(root)\n')
c = after(c, '*adoption.TNAMES_SUBJECTS,', ' *adoption.ROUGH_SUBJECTS,')
# Every not-in-force guard that refuses a test-name recognizers count also refuses this version's.
n = c.count('adoption.TNAMES_COUNT_SCOPE))')
assert n == 4, n
c = c.replace('adoption.TNAMES_COUNT_SCOPE))', 'adoption.TNAMES_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE))')
old = '            if any(line.startswith(adoption.TNAMES_COUNT_SCOPE) for line in lines):\n'
assert c.count(old) == 1
c = c.replace(old, '            if any(line.startswith((adoption.TNAMES_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE)) for line in lines):\n', 1)
old_ret = ('            raise ScenarioCountError(f"{path} test-name recognizers count differs from its two source members")\n'
           '        return int(tname[1]), int(tname[2])\n')
assert c.count(old_ret) == 1
new_ret = ('            raise ScenarioCountError(f"{path} test-name recognizers count differs from its two source members")\n'
           '        tnames_figure = int(tname[1]), int(tname[2])\n'
           '        if rough_amendment(root) is None:\n'
           '            if any(line.startswith(adoption.ROUGH_COUNT_SCOPE) for line in lines):\n'
           '                raise ScenarioCountError(f"{path} declares a rough-edge markers count while it is not in force")\n'
           '            return tnames_figure\n'
           '        roughs = [line for line in lines if line.startswith(adoption.ROUGH_COUNT_SCOPE)]\n'
           '        rough = CHOICE_COUNT.fullmatch(roughs[0].removeprefix(adoption.ROUGH_COUNT_PREFIX)) if len(roughs) == 1 else None\n'
           '        if rough is None:\n'
           '            raise ScenarioCountError(f"{path} needs one complete rough-edge markers count")\n'
           '        added = adoption.rough_delta(root, findings)\n'
           '        if findings or (int(rough[1]), int(rough[2])) != (tnames_figure[0], tnames_figure[1] + added):\n'
           '            raise ScenarioCountError(f"{path} rough-edge markers count differs from its two source members")\n'
           '        return int(rough[1]), int(rough[2])\n')
c = c.replace(old_ret, new_ret, 1)
for needle in ('    rough_amendment(root)\n', '(adoption.ROUGH_SPEC, rough_amendment(root))', '*adoption.ROUGH_SUBJECTS',
               '(adoption.TNAMES_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE)) for line in lines', 'return int(rough[1]), int(rough[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
