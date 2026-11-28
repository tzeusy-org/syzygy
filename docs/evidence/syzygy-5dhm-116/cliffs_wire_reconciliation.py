#!/usr/bin/env python3
"""syzygy-5dhm.116: wire REQ-polaris-generation-034 VERSION (the cliffs) into the reconciliation scripts after PRED.

Usage: cliffs_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.50 view levels
(syzygy-3efd.39) is wired gains the same wiring for this version with the view levels as its predecessor, every filter that leaves out the
view levels' row also leaves out this one (this version stands on v2.50, so it leaves with it), and a selftest case mirrors the view
levels'. Every name moves one version on: the names of the versions before the predecessor (the imports corroboration, the docs and code)
are marked first, the predecessor is renamed to this version, and the marks are restored, so no rename collides. Each edit asserts its
anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once, over main's two scripts.

History: this version was first built as 2.49 over the v2.48 docs and code; the imports corroboration took 2.49 on main first, so it was
rebuilt as 2.50 over that; the view levels then took 2.50 on main first, so the script was rewritten for that predecessor and the cliffs
rebuilt as 2.51 (the dispatch's rebuild recipe). The 2.50 form of this script is in git history.
"""
import pathlib
import re
import sys

VERSION = '2.51'
PRED = '2.50'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'CLIFFS_' not in s, 'already wired'
assert f'VIEWLVL_TAG = "polaris-dossier-view-levels-v{PRED}"' in s, 'predecessor is not the v2.50 view levels'


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


MARKS = (('IMPWIT', '@I@'), ('impwit', '@i@'), ('DOCCODE', '@D@'), ('doccode', '@d@'))
WORDS = (('imports corroboration', '@n@'), ('docs and code', '@m@'), ('v2.49', '@v@'), ('v2.48', '@w@'))


def rename(text: str) -> str:
    """The view levels' wiring as the cliffs': earlier versions' names marked first, then the view levels renamed, then the marks
    restored, so no rename collides."""
    for old, mark in MARKS:
        text = re.sub(rf'(?<![A-Za-z]){old}(?=_)|(?<=_){old}(?![A-Za-z])', mark, text)
    for old, mark in WORDS:
        text = text.replace(old, mark)
    for old, new in (('dossier-view-levels', 'dossier-cliffs'), ('view-levels-', 'cliffs-'), ("view levels's", "cliffs'"),
                     ("view levels'", "cliffs'"), ('view levels', 'cliffs'), ('View levels', 'Cliffs'),
                     (f'v{PRED}', f'v{VERSION}'), (f'amendment {PRED}]', f'amendment {VERSION}]'), ('syzygy-3efd.39', 'syzygy-5dhm.116')):
        text = text.replace(old, new)
    text = re.sub(r'(?<![A-Za-z])VIEWLVL(?=_)', 'CLIFFS', text)
    text = re.sub(r'(?<![A-Za-z])viewlvl(?=_)|(?<=_)viewlvl(?![A-Za-z])', 'cliffs', text)
    assert re.search(r'viewlvl|view.levels', text, re.I) is None, 'a view-levels name is left'
    for old, mark in MARKS + WORDS:
        text = text.replace(mark, old)
    return text


# 0. Every filter that leaves out the view levels' row leaves out this one too (before any mirrored code exists).
n = s.count('not is_viewlvl_row(line)')
s = s.replace('not is_viewlvl_row(line)', 'not is_viewlvl_row(line) and not is_cliffs_row(line)')
m = s.count('not is_viewlvl_row(line.rstrip("\\n"))')
s = s.replace('not is_viewlvl_row(line.rstrip("\\n"))', 'not is_viewlvl_row(line.rstrip("\\n")) and not is_cliffs_row(line.rstrip("\\n"))')
assert n == 21 and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{PRED} view levels (syzygy-3efd.39)', 'VIEWLVL_BOUND_PARTS = len(VIEWLVL_SUBJECTS)\n')
mine = rename(consts)
mine = re.sub(r'CLIFFS_SPEC: "[0-9a-f]{64}"', f'CLIFFS_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-cliffs-v{VERSION}"', f'[Cliffs amendment {VERSION}]', subject, '"dossier-cliffs"', '"With the cliffs"',
               f'# The v{VERSION} cliffs (syzygy-5dhm.116)'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_viewlvl_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_cliffs_row(line):') == 1 and mine_funcs.count('if is_cliffs_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def viewlvl_binding(root):\n', '    )\n')
delta = block(s, 'def viewlvl_delta(root, findings):\n', '    return added\n')
mine = rename(binding).replace(f'only over the effective v2.49 imports corroboration REQ-034.',
                               f'only over the effective v{PRED} view levels REQ-034.')
mine = mine.replace('predecessor=impwit_binding, predecessor_label="v2.49 imports corroboration"',
                    f'predecessor=viewlvl_binding, predecessor_label="v{PRED} view levels"')
assert f'only over the effective v{PRED} view levels REQ-034.' in mine, mine
assert f'predecessor=viewlvl_binding, predecessor_label="v{PRED} view levels", version="v{VERSION}"' in mine, mine
assert 'label="cliffs"' in mine
mine_delta = rename(delta).replace('over the imports corroboration, counted', 'over the view levels, counted')
mine_delta = mine_delta.replace('read_text(root, IMPWIT_SPEC)', 'read_text(root, VIEWLVL_SPEC)')
assert 'the cliffs add to REQ-034 over the view levels, counted' in mine_delta, mine_delta
assert 'read_text(root, VIEWLVL_SPEC)' in mine_delta and 'read_text(root, CLIFFS_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    viewlvl_retired_by = viewlvl_disposition(root, viewlvl_rows(root))\n', '    r2 += viewlvl_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{PRED} inactive by {{viewlvl_retired_by}}"\n',
          f'    if cliffs_retired_by:\n        retirement += f"; v{VERSION} inactive by {{cliffs_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.50.
comp = block(s, '        viewlvl_amendment, viewlvl_records, viewlvl_subjects = viewlvl_binding(root)\n        findings += viewlvl_records + viewlvl_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp).replace('            if impwit_amendment is None:\n', '            if viewlvl_amendment is None:\n')
mine = mine.replace('require effective imports corroboration v2.49', f'require effective view levels v{PRED}')
assert 'if viewlvl_amendment is None:' in mine and f'require effective view levels v{PRED}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the view levels' own branch.
sel = block(s, ' ' * 44 + 'viewlvl_amendment, _records, _subjects = viewlvl_binding(root)\n' + ' ' * 44 + 'if viewlvl_amendment is not None:\n',
            ' ' * 48 + 'selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if viewlvl_binding(root)[0] is not None:\n        n_scen += viewlvl_delta(root, findings)\n',
          '    if cliffs_binding(root)[0] is not None:\n        n_scen += cliffs_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if viewlvl_amendment is not None:\n        files += tracked(root, VIEWLVL_HOME)\n',
          '    cliffs_amendment, _records, _subjects = cliffs_binding(root)\n'
          '    if cliffs_amendment is not None:\n        files += tracked(root, CLIFFS_HOME)\n')
union = '                        (viewlvl_amendment, VIEWLVL_UNION),'
assert s.count(union) == 1
s = s.replace(union, union + '\n                        (cliffs_amendment, CLIFFS_UNION),', 1)

# 8. The status and index routes.
routes = block(s, '    viewlvl_amendment, _records, _subjects = viewlvl_binding(root)\n    viewlvl_fields = ',
               f'`{{OPENSPEC_README}}` calls view levels v{PRED} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'cliffs v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, so its block peels first.
cen = block(s, '        if viewlvl_binding(root)[0] is not None:\n            # The view levels\'s own sentence',
            'declares a view levels census while it is not in force")\n')
mine = rename(cen)
assert 'declares a cliffs census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {VIEWLVL_UNION, *VIEWLVL_SUBJECTS}\n', '    paths |= {CLIFFS_UNION, *CLIFFS_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the view levels'.
s = after(s, '    viewlvl_subjects = VIEWLVL_BOUND_PARTS if viewlvl_rows_now and not viewlvl_retired else 0\n',
          '    cliffs_rows_now = cliffs_rows(tree)\n'
          '    cliffs_retired = cliffs_disposition(tree, cliffs_rows_now)\n'
          '    cliffs_records = 2 if cliffs_retired else int(bool(cliffs_rows_now))\n'
          '    cliffs_subjects = CLIFFS_BOUND_PARTS if cliffs_rows_now and not cliffs_retired else 0\n')
s = after(s, ' - impwit_records - viewlvl_records', ' - cliffs_records')
s = after(s, ' - impwit_subjects - viewlvl_subjects', ' - cliffs_subjects')

# 12. The earlier-history projection: this version stands on v2.50, so its routes leave with it.
s = after(s, 'VIEWLVL_STATUS_PREFIX, VIEWLVL_COUNT_SCOPE', ', CLIFFS_STATUS_PREFIX, CLIFFS_COUNT_SCOPE')
old_comment = '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43 and the v2.48 docs and code on v2.44,\n'
assert s.count(old_comment) == 1
s = s.replace(old_comment, '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43, the v2.48 docs and code on v2.44, the\n'
                           f'    # v2.49 imports corroboration on v2.48, the v{PRED} view levels on v2.49 and the v{VERSION} cliffs on v{PRED},\n', 1)
s = after(s, 'IMPWIT_INDEX_PREFIX, VIEWLVL_INDEX_PREFIX', ', CLIFFS_INDEX_PREFIX')

# 13. The selftest case, mirroring the view levels'.
case = block(s, 'def viewlvl_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_cliffs_row(line) and not is_cliffs_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_cliffs_row(line))')
mine = mine.replace('"R1 requires effective v2.49"', f'"R1 requires effective v{PRED}"')
mine = mine.replace('"prior v2.49 imports corroboration"', f'"prior v{PRED} view levels"')
old_floor = ('    current_bound = "a container view, those three and the five container types, every type but `module`;"\n'
             '    changed = "a container view, every type;"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "past the read limit of 1000 source files or 250 configuration files"\n'
                               '    changed = "past the read limit of 1001 source files or 250 configuration files"\n')
mine = mine.replace('record("modified-level-table", CLIFFS_SPEC', 'record("modified-read-limit", CLIFFS_SPEC')
for needle in (f'"R1 requires effective v{PRED}"', f'"prior v{PRED} view levels"', 'read limit of 1000 source files', 'cliffs-{name}',
               'Path(tmp) / "dossier-cliffs"', 'record("modified-read-limit"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: viewlvl_cases(tmp, base, w, f),\n', '        lambda w, f: cliffs_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.50, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def viewlvl_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('viewlvl_amendment', 'cliffs_amendment').replace('viewlvl_binding', 'cliffs_binding')
          .replace('view levels', 'cliffs'))
c = after(c, '                        (adoption.VIEWLVL_SPEC, viewlvl_amendment(root))', ',\n'
          '                        (adoption.CLIFFS_SPEC, cliffs_amendment(root))')
c = after(c, '    viewlvl_amendment(root)\n', '    cliffs_amendment(root)\n')
c = after(c, '*adoption.VIEWLVL_SUBJECTS,', ' *adoption.CLIFFS_SUBJECTS,')
# Every not-in-force guard that refuses a view levels count (a stage before this one) also refuses this version's.
n = c.count('adoption.VIEWLVL_COUNT_SCOPE))')
assert n == 9, n
c = c.replace('adoption.VIEWLVL_COUNT_SCOPE))', 'adoption.VIEWLVL_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))')
guard = '            if any(line.startswith(adoption.VIEWLVL_COUNT_SCOPE) for line in lines):\n'
assert c.count(guard) == 1
c = c.replace(guard, '            if any(line.startswith((adoption.VIEWLVL_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE)) for line in lines):\n', 1)
old_tail = '        return int(viewlvl[1]), int(viewlvl[2])\n'
assert c.count(old_tail) == 1
new_tail = """        cliffs_pred_figure = int(viewlvl[1]), int(viewlvl[2])
        if cliffs_amendment(root) is None:
            if any(line.startswith(adoption.CLIFFS_COUNT_SCOPE) for line in lines):
                raise ScenarioCountError(f"{path} declares a cliffs count while it is not in force")
            return cliffs_pred_figure
        cliffs_lines = [line for line in lines if line.startswith(adoption.CLIFFS_COUNT_SCOPE)]
        cliffs = (CHOICE_COUNT.fullmatch(cliffs_lines[0].removeprefix(adoption.CLIFFS_COUNT_PREFIX))
                  if len(cliffs_lines) == 1 else None)
        if cliffs is None:
            raise ScenarioCountError(f"{path} needs one complete cliffs count")
        added = adoption.cliffs_delta(root, findings)
        if findings or (int(cliffs[1]), int(cliffs[2])) != (cliffs_pred_figure[0], cliffs_pred_figure[1] + added):
            raise ScenarioCountError(f"{path} cliffs count differs from its two source members")
        return int(cliffs[1]), int(cliffs[2])
"""
c = c.replace(old_tail, new_tail, 1)
for needle in ('    cliffs_amendment(root)\n', '(adoption.CLIFFS_SPEC, cliffs_amendment(root))', '*adoption.CLIFFS_SUBJECTS',
               'adoption.VIEWLVL_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))', 'return int(cliffs[1]), int(cliffs[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
