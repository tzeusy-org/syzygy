#!/usr/bin/env python3
"""syzygy-5dhm.46: wire REQ-polaris-generation-034 VERSION (rough-edge markers) into the reconciliation scripts after PRED.

Usage: rough_edges_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.43 migration
bounds (syzygy-3efd.87) are wired gains the same wiring for this version with the migration bounds as its predecessor, every filter that
leaves out the migration bounds' row also leaves out this one (this version stands on v2.43, so it leaves with it), and a selftest case
mirrors the migration bounds'. The first wiring stood on the v2.42 test-name recognizers; main took 2.43 for the migration bounds before
this landed, so this one clones the migration bounds' wiring instead and renames their predecessor (the test-name recognizers) to them.
Each edit asserts its anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once, over main's two
scripts.
"""
import pathlib
import re
import sys

VERSION = '2.44'
PRED = '2.43'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'ROUGH_' not in s, 'already wired'
assert f'MIGBOUND_TAG = "polaris-dossier-migration-bounds-v{PRED}"' in s, 'predecessor is not the v2.43 migration bounds'


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
    """The migration bounds' wiring as the rough-edge markers': its predecessor marked first, then itself renamed, then the marks
    restored as the migration bounds, so no rename collides."""
    for old, mark in (('tnames', '@t@'), ('TNAMES', '@T@'), ('test-name recognizers', '@n@'), ('v2.42', '@v@')):
        text = text.replace(old, mark)
    for old, new in (('MIGBOUND', 'ROUGH'), ('migbound', 'rough'), ('dossier-migration-bounds', 'dossier-rough-edges'),
                     ('migration-bounds-', 'rough-edges-'), ('migration bounds', 'rough-edge markers'),
                     ('Migration bounds', 'Rough-edge markers'), (f'v{PRED}', f'v{VERSION}'),
                     (f'amendment {PRED}]', f'amendment {VERSION}]'), ('syzygy-3efd.87', 'syzygy-5dhm.46')):
        text = text.replace(old, new)
    for mark, new in (('@t@', 'migbound'), ('@T@', 'MIGBOUND'), ('@n@', 'migration bounds'), ('@v@', f'v{PRED}')):
        text = text.replace(mark, new)
    return text


# 0. Every filter that leaves out the migration bounds' row leaves out this one too (before any mirrored code exists).
n = s.count('not is_migbound_row(line)')
s = s.replace('not is_migbound_row(line)', 'not is_migbound_row(line) and not is_rough_row(line)')
m = s.count('not is_migbound_row(line.rstrip("\\n"))')
s = s.replace('not is_migbound_row(line.rstrip("\\n"))', 'not is_migbound_row(line.rstrip("\\n")) and not is_rough_row(line.rstrip("\\n"))')
assert n == 17 and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{PRED} migration bounds (syzygy-3efd.87)', 'MIGBOUND_BOUND_PARTS = len(MIGBOUND_SUBJECTS)\n')
mine = rename(consts)
mine = re.sub(r'ROUGH_SPEC: "[0-9a-f]{64}"', f'ROUGH_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-rough-edges-v{VERSION}"', f'[Rough-edge markers amendment {VERSION}]', subject, '"dossier-rough-edges"',
               '"With the rough-edge markers"', f'after\n# the v{PRED} migration bounds'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_migbound_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_rough_row(line):') == 1 and mine_funcs.count('if is_rough_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def migbound_binding(root):\n', '    )\n')
delta = block(s, 'def migbound_delta(root, findings):\n', '    return added\n')
mine = rename(binding)
assert f'only over the effective v{PRED} migration bounds REQ-034.' in mine, mine
assert f'predecessor=migbound_binding, predecessor_label="v{PRED} migration bounds", version="v{VERSION}"' in mine, mine
assert 'label="rough-edge markers"' in mine
mine_delta = rename(delta)
assert 'the rough-edge markers add to REQ-034 over the migration bounds, counted' in mine_delta, mine_delta
assert 'read_text(root, MIGBOUND_SPEC)' in mine_delta and 'read_text(root, ROUGH_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    migbound_retired_by = migbound_disposition(root, migbound_rows(root))\n', '    r2 += migbound_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{PRED} inactive by {{migbound_retired_by}}"\n',
          f'    if rough_retired_by:\n        retirement += f"; v{VERSION} inactive by {{rough_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.43.
comp = block(s, '        migbound_amendment, migbound_records, migbound_subjects = migbound_binding(root)\n        findings += migbound_records + migbound_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if migbound_amendment is None:' in mine and f'require effective migration bounds v{PRED}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the migration bounds' own branch.
sel = block(s, '                            migbound_amendment, _records, _subjects = migbound_binding(root)\n                            if migbound_amendment is not None:\n                                by_id,',
            '                                selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if migbound_binding(root)[0] is not None:\n        n_scen += migbound_delta(root, findings)\n',
          '    if rough_binding(root)[0] is not None:\n        n_scen += rough_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if migbound_amendment is not None:\n        files += tracked(root, MIGBOUND_HOME)\n',
          '    rough_amendment, _records, _subjects = rough_binding(root)\n'
          '    if rough_amendment is not None:\n        files += tracked(root, ROUGH_HOME)\n')
s = s.replace('                        (migbound_amendment, MIGBOUND_UNION)):',
              '                        (migbound_amendment, MIGBOUND_UNION),\n                        (rough_amendment, ROUGH_UNION)):', 1)
assert '(rough_amendment, ROUGH_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    migbound_amendment, _records, _subjects = migbound_binding(root)\n    migbound_fields = ',
               f'`{{OPENSPEC_README}}` calls migration bounds v{PRED} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'rough-edge markers v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, then v2.43's states its own.
cen = block(s, '        if migbound_binding(root)[0] is not None:\n            # The migration bounds\' own sentence',
            'declares a migration bounds census while it is not in force")\n')
mine = rename(cen)
assert 'declares a rough-edge markers census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {MIGBOUND_UNION, *MIGBOUND_SUBJECTS}\n', '    paths |= {ROUGH_UNION, *ROUGH_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the migration bounds'.
s = after(s, '    migbound_subjects = MIGBOUND_BOUND_PARTS if migbound_rows_now and not migbound_retired else 0\n',
          '    rough_rows_now = rough_rows(tree)\n'
          '    rough_retired = rough_disposition(tree, rough_rows_now)\n'
          '    rough_records = 2 if rough_retired else int(bool(rough_rows_now))\n'
          '    rough_subjects = ROUGH_BOUND_PARTS if rough_rows_now and not rough_retired else 0\n')
s = after(s, ' - tnames_records - migbound_records', ' - rough_records')
s = after(s, ' - tnames_subjects - migbound_subjects', ' - rough_subjects')

# 12. The earlier-history projection: this version stands on v2.43, so its routes leave with it.
s = after(s, 'MIGBOUND_STATUS_PREFIX, MIGBOUND_COUNT_SCOPE', ', ROUGH_STATUS_PREFIX, ROUGH_COUNT_SCOPE')
old_comment = (f'    # on v2.38, the v2.40 figure walks on v2.39, the v2.42 test-name recognizers on v2.40 and the v{PRED}\n'
               '    # migration bounds on v2.42, so their routes leave with it.')
assert s.count(old_comment) == 1
s = s.replace(old_comment, f'    # on v2.38, the v2.40 figure walks on v2.39, the v2.42 test-name recognizers on v2.40, the v{PRED}\n'
                           f'    # migration bounds on v2.42 and the v{VERSION} rough-edge markers on v{PRED}, so their routes leave with it.', 1)
s = after(s, 'TNAMES_INDEX_PREFIX, MIGBOUND_INDEX_PREFIX', ', ROUGH_INDEX_PREFIX')

# 13. The selftest case, mirroring the migration bounds'.
case = block(s, 'def migbound_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_rough_row(line) and not is_rough_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_rough_row(line))')
old_floor = ('    current_bound = "number at most 200 in all, across every diagram,"\n'
             '    changed = "number at most 220 in all, across every diagram,"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "the recognizer reads and lists at most 1000 files"\n'
                               '    changed = "the recognizer reads and lists at most 1001 files"\n')
for needle in (f'"R1 requires effective v{PRED}"', f'"prior v{PRED} migration bounds"', 'at most 1000 files', 'rough-edges-{name}',
               'Path(tmp) / "dossier-rough-edges"', f'effective v{PRED} predecessor is refused'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: migbound_cases(tmp, base, w, f),\n', '        lambda w, f: rough_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.43, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def migbound_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('migbound_amendment', 'rough_amendment').replace('migbound_binding', 'rough_binding')
          .replace('migration bounds', 'rough-edge markers'))
c = after(c, '                        (adoption.MIGBOUND_SPEC, migbound_amendment(root))', ',\n'
          '                        (adoption.ROUGH_SPEC, rough_amendment(root))')
c = after(c, '    migbound_amendment(root)\n', '    rough_amendment(root)\n')
c = after(c, '*adoption.MIGBOUND_SUBJECTS,', ' *adoption.ROUGH_SUBJECTS,')
# Every not-in-force guard that refuses a migration bounds count also refuses this version's.
n = c.count('adoption.MIGBOUND_COUNT_SCOPE))')
assert n == 5, n
c = c.replace('adoption.MIGBOUND_COUNT_SCOPE))', 'adoption.MIGBOUND_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE))')
old = '            if any(line.startswith(adoption.MIGBOUND_COUNT_SCOPE) for line in lines):\n'
assert c.count(old) == 1
c = c.replace(old, '            if any(line.startswith((adoption.MIGBOUND_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE)) for line in lines):\n', 1)
old_ret = ('            raise ScenarioCountError(f"{path} migration bounds count differs from its two source members")\n'
           '        return int(migbound[1]), int(migbound[2])\n')
assert c.count(old_ret) == 1
new_ret = ('            raise ScenarioCountError(f"{path} migration bounds count differs from its two source members")\n'
           '        migbound_figure = int(migbound[1]), int(migbound[2])\n'
           '        if rough_amendment(root) is None:\n'
           '            if any(line.startswith(adoption.ROUGH_COUNT_SCOPE) for line in lines):\n'
           '                raise ScenarioCountError(f"{path} declares a rough-edge markers count while it is not in force")\n'
           '            return migbound_figure\n'
           '        roughs = [line for line in lines if line.startswith(adoption.ROUGH_COUNT_SCOPE)]\n'
           '        rough = CHOICE_COUNT.fullmatch(roughs[0].removeprefix(adoption.ROUGH_COUNT_PREFIX)) if len(roughs) == 1 else None\n'
           '        if rough is None:\n'
           '            raise ScenarioCountError(f"{path} needs one complete rough-edge markers count")\n'
           '        added = adoption.rough_delta(root, findings)\n'
           '        if findings or (int(rough[1]), int(rough[2])) != (migbound_figure[0], migbound_figure[1] + added):\n'
           '            raise ScenarioCountError(f"{path} rough-edge markers count differs from its two source members")\n'
           '        return int(rough[1]), int(rough[2])\n')
c = c.replace(old_ret, new_ret, 1)
for needle in ('    rough_amendment(root)\n', '(adoption.ROUGH_SPEC, rough_amendment(root))', '*adoption.ROUGH_SUBJECTS',
               '(adoption.MIGBOUND_COUNT_SCOPE, adoption.ROUGH_COUNT_SCOPE)) for line in lines', 'return int(rough[1]), int(rough[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
