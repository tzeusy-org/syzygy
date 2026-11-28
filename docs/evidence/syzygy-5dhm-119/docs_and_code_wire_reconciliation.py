#!/usr/bin/env python3
"""syzygy-5dhm.119: wire REQ-polaris-generation-034 VERSION (docs and code) into the reconciliation scripts after PRED.

Usage: docs_and_code_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.44 rough-edge
markers (syzygy-5dhm.46) are wired gains the same wiring for this version with the rough-edge markers as its predecessor, every filter
that leaves out the rough-edge markers' row also leaves out this one (this version stands on v2.44, so it leaves with it), and a selftest
case mirrors the rough-edge markers'. It is the rough-edge markers' wiring script (docs/evidence/syzygy-5dhm-46/) with every name moved
one version on: their predecessor (the migration bounds) is marked first, they are renamed to this version, and the marks are restored as
them, so no rename collides; `rough` is renamed only as an identifier part, never inside a word such as "through". Each edit asserts its
anchor occurs once, so a run over a changed predecessor stops rather than guessing. Run once, over main's two scripts.
"""
import pathlib
import re
import sys

VERSION = '2.48'
PRED = '2.44'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'DOCCODE_' not in s, 'already wired'
assert f'ROUGH_TAG = "polaris-dossier-rough-edges-v{PRED}"' in s, 'predecessor is not the v2.44 rough-edge markers'


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
    """The rough-edge markers' wiring as the docs and code's: its predecessor marked first, then itself renamed, then the marks restored as
    the rough-edge markers, so no rename collides."""
    for old, mark in (('migbound', '@t@'), ('MIGBOUND', '@T@'), ('migration bounds', '@n@'), ('v2.43', '@v@')):
        text = text.replace(old, mark)
    for old, new in (('dossier-rough-edges', 'dossier-docs-and-code'), ('rough-edges-', 'docs-and-code-'), ('rough-edge markers', 'docs and code'),
                     ('Rough-edge markers', 'Docs and code'), (f'v{PRED}', f'v{VERSION}'), (f'amendment {PRED}]', f'amendment {VERSION}]'),
                     ('syzygy-5dhm.46', 'syzygy-5dhm.119')):
        text = text.replace(old, new)
    text = re.sub(r'(?<![A-Za-z])ROUGH(?=_)', 'DOCCODE', text)
    text = re.sub(r'(?<![A-Za-z])rough(?=_)|(?<=_)rough(?![A-Za-z])', 'doccode', text)
    assert re.search(r'(?<![A-Za-z])rough(?![A-Za-z])|ROUGH', text) is None, 'a rough-edge name is left'
    for mark, new in (('@t@', 'rough'), ('@T@', 'ROUGH'), ('@n@', 'rough-edge markers'), ('@v@', f'v{PRED}')):
        text = text.replace(mark, new)
    return text


# 0. Every filter that leaves out the rough-edge markers' row leaves out this one too (before any mirrored code exists).
n = s.count('not is_rough_row(line)')
s = s.replace('not is_rough_row(line)', 'not is_rough_row(line) and not is_doccode_row(line)')
m = s.count('not is_rough_row(line.rstrip("\\n"))')
s = s.replace('not is_rough_row(line.rstrip("\\n"))', 'not is_rough_row(line.rstrip("\\n")) and not is_doccode_row(line.rstrip("\\n"))')
assert n == 18 and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{PRED} rough-edge markers (syzygy-5dhm.46)', 'ROUGH_BOUND_PARTS = len(ROUGH_SUBJECTS)\n')
mine = rename(consts)
mine = re.sub(r'DOCCODE_SPEC: "[0-9a-f]{64}"', f'DOCCODE_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-docs-and-code-v{VERSION}"', f'[Docs and code amendment {VERSION}]', subject, '"dossier-docs-and-code"',
               '"With the docs and code"', f'after\n# the v{PRED} rough-edge markers'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_rough_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_doccode_row(line):') == 1 and mine_funcs.count('if is_doccode_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def rough_binding(root):\n', '    )\n')
delta = block(s, 'def rough_delta(root, findings):\n', '    return added\n')
mine = rename(binding)
assert f'only over the effective v{PRED} rough-edge markers REQ-034.' in mine, mine
assert f'predecessor=rough_binding, predecessor_label="v{PRED} rough-edge markers", version="v{VERSION}"' in mine, mine
assert 'label="docs and code"' in mine
mine_delta = rename(delta)
assert 'the docs and code add to REQ-034 over the rough-edge markers, counted' in mine_delta, mine_delta
assert 'read_text(root, ROUGH_SPEC)' in mine_delta and 'read_text(root, DOCCODE_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    rough_retired_by = rough_disposition(root, rough_rows(root))\n', '    r2 += rough_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{PRED} inactive by {{rough_retired_by}}"\n',
          f'    if doccode_retired_by:\n        retirement += f"; v{VERSION} inactive by {{doccode_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.44.
comp = block(s, '        rough_amendment, rough_records, rough_subjects = rough_binding(root)\n        findings += rough_records + rough_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if rough_amendment is None:' in mine and f'require effective rough-edge markers v{PRED}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the rough-edge markers' own branch.
sel = block(s, '                                rough_amendment, _records, _subjects = rough_binding(root)\n                                if rough_amendment is not None:\n                                    by_id,',
            '                                    selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if rough_binding(root)[0] is not None:\n        n_scen += rough_delta(root, findings)\n',
          '    if doccode_binding(root)[0] is not None:\n        n_scen += doccode_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if rough_amendment is not None:\n        files += tracked(root, ROUGH_HOME)\n',
          '    doccode_amendment, _records, _subjects = doccode_binding(root)\n'
          '    if doccode_amendment is not None:\n        files += tracked(root, DOCCODE_HOME)\n')
s = s.replace('                        (rough_amendment, ROUGH_UNION)):',
              '                        (rough_amendment, ROUGH_UNION),\n                        (doccode_amendment, DOCCODE_UNION)):', 1)
assert '(doccode_amendment, DOCCODE_UNION)):' in s

# 8. The status and index routes.
routes = block(s, '    rough_amendment, _records, _subjects = rough_binding(root)\n    rough_fields = ',
               f'`{{OPENSPEC_README}}` calls rough-edge markers v{PRED} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'docs and code v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, then v2.44's states its own.
cen = block(s, '        if rough_binding(root)[0] is not None:\n            # The rough-edge markers\' own sentence',
            'declares a rough-edge markers census while it is not in force")\n')
mine = rename(cen)
assert 'declares a docs and code census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {ROUGH_UNION, *ROUGH_SUBJECTS}\n', '    paths |= {DOCCODE_UNION, *DOCCODE_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the rough-edge markers'.
s = after(s, '    rough_subjects = ROUGH_BOUND_PARTS if rough_rows_now and not rough_retired else 0\n',
          '    doccode_rows_now = doccode_rows(tree)\n'
          '    doccode_retired = doccode_disposition(tree, doccode_rows_now)\n'
          '    doccode_records = 2 if doccode_retired else int(bool(doccode_rows_now))\n'
          '    doccode_subjects = DOCCODE_BOUND_PARTS if doccode_rows_now and not doccode_retired else 0\n')
s = after(s, ' - migbound_records - rough_records', ' - doccode_records')
s = after(s, ' - migbound_subjects - rough_subjects', ' - doccode_subjects')

# 12. The earlier-history projection: this version stands on v2.44, so its routes leave with it.
s = after(s, 'ROUGH_STATUS_PREFIX, ROUGH_COUNT_SCOPE', ', DOCCODE_STATUS_PREFIX, DOCCODE_COUNT_SCOPE')
old_comment = ('    # on v2.38, the v2.40 figure walks on v2.39, the v2.42 test-name recognizers on v2.40, the v2.43\n'
               f'    # migration bounds on v2.42 and the v{PRED} rough-edge markers on v2.43, so their routes leave with it.')
assert s.count(old_comment) == 1
s = s.replace(old_comment, '    # on v2.38, the v2.40 figure walks on v2.39, the v2.42 test-name recognizers on v2.40, the v2.43\n'
                           f'    # migration bounds on v2.42, the v{PRED} rough-edge markers on v2.43 and the v{VERSION} docs and code on v{PRED},\n'
                           '    # so their routes leave with it.', 1)
s = after(s, 'MIGBOUND_INDEX_PREFIX, ROUGH_INDEX_PREFIX', ', DOCCODE_INDEX_PREFIX')

# 13. The selftest case, mirroring the rough-edge markers'.
case = block(s, 'def rough_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_doccode_row(line) and not is_doccode_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_doccode_row(line))')
old_floor = ('    current_bound = "the recognizer reads and lists at most 1000 files"\n'
             '    changed = "the recognizer reads and lists at most 1001 files"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "past the read limit of 1000 documents or 1000 code files"\n'
                               '    changed = "past the read limit of 1001 documents or 1000 code files"\n')
for needle in (f'"R1 requires effective v{PRED}"', f'"prior v{PRED} rough-edge markers"', 'read limit of 1000 documents', 'docs-and-code-{name}',
               'Path(tmp) / "dossier-docs-and-code"', f'effective v{PRED} predecessor is refused'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: rough_cases(tmp, base, w, f),\n', '        lambda w, f: doccode_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.44, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def rough_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('rough_amendment', 'doccode_amendment').replace('rough_binding', 'doccode_binding')
          .replace('rough-edge markers', 'docs and code'))
c = after(c, '                        (adoption.ROUGH_SPEC, rough_amendment(root))', ',\n'
          '                        (adoption.DOCCODE_SPEC, doccode_amendment(root))')
c = after(c, '    rough_amendment(root)\n', '    doccode_amendment(root)\n')
c = after(c, '*adoption.ROUGH_SUBJECTS,', ' *adoption.DOCCODE_SUBJECTS,')
# Every not-in-force guard that refuses a rough-edge markers count also refuses this version's.
n = c.count('adoption.ROUGH_COUNT_SCOPE))')
assert n == 6, n
c = c.replace('adoption.ROUGH_COUNT_SCOPE))', 'adoption.ROUGH_COUNT_SCOPE, adoption.DOCCODE_COUNT_SCOPE))')
old = '            if any(line.startswith(adoption.ROUGH_COUNT_SCOPE) for line in lines):\n'
assert c.count(old) == 1
c = c.replace(old, '            if any(line.startswith((adoption.ROUGH_COUNT_SCOPE, adoption.DOCCODE_COUNT_SCOPE)) for line in lines):\n', 1)
old_ret = ('            raise ScenarioCountError(f"{path} rough-edge markers count differs from its two source members")\n'
           '        return int(rough[1]), int(rough[2])\n')
assert c.count(old_ret) == 1
new_ret = ('            raise ScenarioCountError(f"{path} rough-edge markers count differs from its two source members")\n'
           '        rough_figure = int(rough[1]), int(rough[2])\n'
           '        if doccode_amendment(root) is None:\n'
           '            if any(line.startswith(adoption.DOCCODE_COUNT_SCOPE) for line in lines):\n'
           '                raise ScenarioCountError(f"{path} declares a docs and code count while it is not in force")\n'
           '            return rough_figure\n'
           '        doccodes = [line for line in lines if line.startswith(adoption.DOCCODE_COUNT_SCOPE)]\n'
           '        doccode = CHOICE_COUNT.fullmatch(doccodes[0].removeprefix(adoption.DOCCODE_COUNT_PREFIX)) if len(doccodes) == 1 else None\n'
           '        if doccode is None:\n'
           '            raise ScenarioCountError(f"{path} needs one complete docs and code count")\n'
           '        added = adoption.doccode_delta(root, findings)\n'
           '        if findings or (int(doccode[1]), int(doccode[2])) != (rough_figure[0], rough_figure[1] + added):\n'
           '            raise ScenarioCountError(f"{path} docs and code count differs from its two source members")\n'
           '        return int(doccode[1]), int(doccode[2])\n')
c = c.replace(old_ret, new_ret, 1)
for needle in ('    doccode_amendment(root)\n', '(adoption.DOCCODE_SPEC, doccode_amendment(root))', '*adoption.DOCCODE_SUBJECTS',
               '(adoption.ROUGH_COUNT_SCOPE, adoption.DOCCODE_COUNT_SCOPE)) for line in lines', 'return int(doccode[1]), int(doccode[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
