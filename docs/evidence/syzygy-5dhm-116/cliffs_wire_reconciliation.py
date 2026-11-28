#!/usr/bin/env python3
"""syzygy-5dhm.116: wire REQ-polaris-generation-034 VERSION (the cliffs) into the reconciliation scripts after PRED.

Usage: cliffs_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.49 imports
corroboration (syzygy-3efd.86) is wired gains the same wiring for this version with the imports corroboration as its predecessor, every
filter that leaves out the imports corroboration's row also leaves out this one (this version stands on v2.49, so it leaves with it), and a
selftest case mirrors the imports corroboration's. Every name moves one version on: the predecessor's own predecessor (the docs and code) is
marked first, the predecessor is renamed to this version, and the marks are restored as the predecessor, so no rename collides. Each edit
asserts its anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once, over main's two scripts.

This version was first built as 2.49 over the v2.48 docs and code; the imports corroboration took 2.49 on main first, so the script was
rewritten for that predecessor and the cliffs rebuilt as 2.50 (the dispatch's rebuild recipe).
"""
import pathlib
import re
import sys

VERSION = '2.50'
PRED = '2.49'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'CLIFFS_' not in s, 'already wired'
assert f'IMPWIT_TAG = "polaris-dossier-imports-corroboration-v{PRED}"' in s, 'predecessor is not the v2.49 imports corroboration'


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
    """The imports corroboration's wiring as the cliffs': its predecessor marked first, then itself renamed, then the marks restored as
    the imports corroboration, so no rename collides."""
    text = re.sub(r'(?<![A-Za-z])DOCCODE(?=_)', '@T@', text)
    text = re.sub(r'(?<![A-Za-z])doccode(?=_)|(?<=_)doccode(?![A-Za-z])', '@t@', text)
    for old, mark in (('docs and code', '@n@'), ('v2.48', '@v@')):
        text = text.replace(old, mark)
    for old, new in (('dossier-imports-corroboration', 'dossier-cliffs'), ('imports-corroboration-', 'cliffs-'),
                     ("imports corroboration's", "cliffs'"), ('imports corroboration', 'cliffs'), ('Imports corroboration', 'Cliffs'),
                     (f'v{PRED}', f'v{VERSION}'), (f'amendment {PRED}]', f'amendment {VERSION}]'), ('syzygy-3efd.86', 'syzygy-5dhm.116')):
        text = text.replace(old, new)
    text = re.sub(r'(?<![A-Za-z])IMPWIT(?=_)', 'CLIFFS', text)
    text = re.sub(r'(?<![A-Za-z])impwit(?=_)|(?<=_)impwit(?![A-Za-z])', 'cliffs', text)
    assert re.search(r'impwit|IMPWIT|imports corroboration|imports-corroboration', text, re.I) is None, 'an imports-corroboration name is left'
    assert re.search(r'(?<![A-Za-z])rough(?![A-Za-z])|ROUGH', text) is None, 'a rough-edge name in the predecessor wiring'
    for mark, new in (('@t@', 'impwit'), ('@T@', 'IMPWIT'), ('@n@', 'imports corroboration'), ('@v@', f'v{PRED}')):
        text = text.replace(mark, new)
    return text


# 0. Every filter that leaves out the imports corroboration's row leaves out this one too (before any mirrored code exists).
n = s.count('not is_impwit_row(line)')
s = s.replace('not is_impwit_row(line)', 'not is_impwit_row(line) and not is_cliffs_row(line)')
m = s.count('not is_impwit_row(line.rstrip("\\n"))')
s = s.replace('not is_impwit_row(line.rstrip("\\n"))', 'not is_impwit_row(line.rstrip("\\n")) and not is_cliffs_row(line.rstrip("\\n"))')
assert n == 20 and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{PRED} imports corroboration (syzygy-3efd.86)', 'IMPWIT_BOUND_PARTS = len(IMPWIT_SUBJECTS)\n')
mine = rename(consts)
mine = re.sub(r'CLIFFS_SPEC: "[0-9a-f]{64}"', f'CLIFFS_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-cliffs-v{VERSION}"', f'[Cliffs amendment {VERSION}]', subject, '"dossier-cliffs"', '"With the cliffs"'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_impwit_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_cliffs_row(line):') == 1 and mine_funcs.count('if is_cliffs_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def impwit_binding(root):\n', '    )\n')
delta = block(s, 'def impwit_delta(root, findings):\n', '    return added\n')
mine = rename(binding)
assert f'only over the effective v{PRED} imports corroboration REQ-034.' in mine, mine
assert f'predecessor=impwit_binding, predecessor_label="v{PRED} imports corroboration", version="v{VERSION}"' in mine, mine
assert 'label="cliffs"' in mine
mine_delta = rename(delta)
assert 'the cliffs add to REQ-034 over the imports corroboration, counted' in mine_delta, mine_delta
assert 'read_text(root, IMPWIT_SPEC)' in mine_delta and 'read_text(root, CLIFFS_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    impwit_retired_by = impwit_disposition(root, impwit_rows(root))\n', '    r2 += impwit_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{PRED} inactive by {{impwit_retired_by}}"\n',
          f'    if cliffs_retired_by:\n        retirement += f"; v{VERSION} inactive by {{cliffs_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.49.
comp = block(s, '        impwit_amendment, impwit_records, impwit_subjects = impwit_binding(root)\n        findings += impwit_records + impwit_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if impwit_amendment is None:' in mine and f'require effective imports corroboration v{PRED}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the imports corroboration's own branch.
sel = block(s, '                                        impwit_amendment, _records, _subjects = impwit_binding(root)\n                                        if impwit_amendment is not None:\n',
            '                                            selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if impwit_binding(root)[0] is not None:\n        n_scen += impwit_delta(root, findings)\n',
          '    if cliffs_binding(root)[0] is not None:\n        n_scen += cliffs_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if impwit_amendment is not None:\n        files += tracked(root, IMPWIT_HOME)\n',
          '    cliffs_amendment, _records, _subjects = cliffs_binding(root)\n'
          '    if cliffs_amendment is not None:\n        files += tracked(root, CLIFFS_HOME)\n')
union = '                        (impwit_amendment, IMPWIT_UNION)'
assert s.count(union) == 1
s = s.replace(union, union + ',\n                        (cliffs_amendment, CLIFFS_UNION)', 1)

# 8. The status and index routes.
routes = block(s, '    impwit_amendment, _records, _subjects = impwit_binding(root)\n    impwit_fields = ',
               f'`{{OPENSPEC_README}}` calls imports corroboration v{PRED} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'cliffs v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, so its block peels first.
cen = block(s, '        if impwit_binding(root)[0] is not None:\n            # The imports corroboration\'s own sentence',
            'declares a imports corroboration census while it is not in force")\n')
mine = rename(cen)
assert 'declares a cliffs census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {IMPWIT_UNION, *IMPWIT_SUBJECTS}\n', '    paths |= {CLIFFS_UNION, *CLIFFS_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the imports corroboration's.
s = after(s, '    impwit_subjects = IMPWIT_BOUND_PARTS if impwit_rows_now and not impwit_retired else 0\n',
          '    cliffs_rows_now = cliffs_rows(tree)\n'
          '    cliffs_retired = cliffs_disposition(tree, cliffs_rows_now)\n'
          '    cliffs_records = 2 if cliffs_retired else int(bool(cliffs_rows_now))\n'
          '    cliffs_subjects = CLIFFS_BOUND_PARTS if cliffs_rows_now and not cliffs_retired else 0\n')
s = after(s, ' - doccode_records - impwit_records', ' - cliffs_records')
s = after(s, ' - doccode_subjects - impwit_subjects', ' - cliffs_subjects')

# 12. The earlier-history projection: this version stands on v2.49, so its routes leave with it.
s = after(s, 'IMPWIT_STATUS_PREFIX, IMPWIT_COUNT_SCOPE', ', CLIFFS_STATUS_PREFIX, CLIFFS_COUNT_SCOPE')
old_comment = '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43 and the v2.48 docs and code on v2.44,\n'
assert s.count(old_comment) == 1
s = s.replace(old_comment, '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43, the v2.48 docs and code on v2.44, the\n'
                           f'    # v{PRED} imports corroboration on v2.48 and the v{VERSION} cliffs on v{PRED},\n', 1)
s = after(s, 'LEANRUN_INDEX_PREFIX, IMPWIT_INDEX_PREFIX', ', CLIFFS_INDEX_PREFIX')

# 13. The selftest case, mirroring the imports corroboration's.
case = block(s, 'def impwit_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_cliffs_row(line) and not is_cliffs_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_cliffs_row(line))')
old_floor = ('    current_bound = "never `challenged`, whatever the member\'s `coverage`,"\n'
             '    changed = "`challenged` where the member\'s `coverage` is `complete`,"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "past the read limit of 1000 source files or 250 configuration files"\n'
                               '    changed = "past the read limit of 1001 source files or 250 configuration files"\n')
mine = mine.replace('record("modified-absence-rule", CLIFFS_SPEC', 'record("modified-read-limit", CLIFFS_SPEC')
for needle in (f'"R1 requires effective v{PRED}"', f'"prior v{PRED} imports corroboration"', 'read limit of 1000 source files', 'cliffs-{name}',
               'Path(tmp) / "dossier-cliffs"', 'record("modified-read-limit"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: impwit_cases(tmp, base, w, f),\n', '        lambda w, f: cliffs_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.49, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def impwit_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('impwit_amendment', 'cliffs_amendment').replace('impwit_binding', 'cliffs_binding')
          .replace('imports corroboration', 'cliffs'))
c = after(c, '                        (adoption.IMPWIT_SPEC, impwit_amendment(root))', ',\n'
          '                        (adoption.CLIFFS_SPEC, cliffs_amendment(root))')
c = after(c, '    impwit_amendment(root)\n', '    cliffs_amendment(root)\n')
c = after(c, '*adoption.IMPWIT_SUBJECTS,', ' *adoption.CLIFFS_SUBJECTS,')
# Every not-in-force guard that refuses an imports corroboration count (a stage before this one) also refuses this version's.
n = c.count('adoption.IMPWIT_COUNT_SCOPE))')
assert n == 8, n
c = c.replace('adoption.IMPWIT_COUNT_SCOPE))', 'adoption.IMPWIT_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))')
guard = '            if any(line.startswith(adoption.IMPWIT_COUNT_SCOPE) for line in lines):\n'
assert c.count(guard) == 1
c = c.replace(guard, '            if any(line.startswith((adoption.IMPWIT_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE)) for line in lines):\n', 1)
old_tail = '        return int(impwit[1]), int(impwit[2])\n'
assert c.count(old_tail) == 1
new_tail = """        cliffs_pred_figure = int(impwit[1]), int(impwit[2])
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
               'adoption.IMPWIT_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))', 'return int(cliffs[1]), int(cliffs[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
