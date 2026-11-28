#!/usr/bin/env python3
"""syzygy-5dhm.116: wire REQ-polaris-generation-034 VERSION (the cliffs) into the reconciliation scripts after PRED.

Usage: cliffs_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the v2.48 docs and code
(syzygy-5dhm.119) are wired gains the same wiring for this version with the docs and code as its predecessor, every filter that leaves out
the docs and code's row also leaves out this one (this version stands on v2.48, so it leaves with it), and a selftest case mirrors the docs
and code's. It is the docs and code's wiring script (docs/evidence/syzygy-5dhm-119/) with every name moved one version on: their
predecessor (the rough-edge markers) is marked first, they are renamed to this version, and the marks are restored as them, so no rename
collides; `rough` is marked only as an identifier part, never inside a word such as "through". Each edit asserts its anchor occurs once,
so a run over a changed predecessor stops rather than guessing. Run once, over main's two scripts.
"""
import pathlib
import re
import sys

VERSION = '2.49'
PRED = '2.48'
root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'CLIFFS_' not in s, 'already wired'
assert f'DOCCODE_TAG = "polaris-dossier-docs-and-code-v{PRED}"' in s, 'predecessor is not the v2.48 docs and code'


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
    """The docs and code's wiring as the cliffs': its predecessor marked first, then itself renamed, then the marks restored as the docs
    and code, so no rename collides."""
    text = re.sub(r'(?<![A-Za-z])ROUGH(?=_)', '@T@', text)
    text = re.sub(r'(?<![A-Za-z])rough(?=_)|(?<=_)rough(?![A-Za-z])', '@t@', text)
    for old, mark in (('rough-edge markers', '@n@'), ('v2.44', '@v@')):
        text = text.replace(old, mark)
    for old, new in (('dossier-docs-and-code', 'dossier-cliffs'), ('docs-and-code-', 'cliffs-'), ('docs and code', 'cliffs'),
                     ('Docs and code', 'Cliffs'), (f'v{PRED}', f'v{VERSION}'), (f'amendment {PRED}]', f'amendment {VERSION}]'),
                     ('syzygy-5dhm.119', 'syzygy-5dhm.116')):
        text = text.replace(old, new)
    text = re.sub(r'(?<![A-Za-z])DOCCODE(?=_)', 'CLIFFS', text)
    text = re.sub(r'(?<![A-Za-z])doccode(?=_)|(?<=_)doccode(?![A-Za-z])', 'cliffs', text)
    assert re.search(r'doccode|DOCCODE|docs and code|docs-and-code', text, re.I) is None, 'a docs-and-code name is left'
    assert re.search(r'(?<![A-Za-z])rough(?![A-Za-z])|ROUGH', text) is None, 'a rough-edge name is left unmarked'
    for mark, new in (('@t@', 'doccode'), ('@T@', 'DOCCODE'), ('@n@', 'docs and code'), ('@v@', f'v{PRED}')):
        text = text.replace(mark, new)
    return text


# 0. Every filter that leaves out the docs and code's row leaves out this one too (before any mirrored code exists).
n = s.count('not is_doccode_row(line)')
s = s.replace('not is_doccode_row(line)', 'not is_doccode_row(line) and not is_cliffs_row(line)')
m = s.count('not is_doccode_row(line.rstrip("\\n"))')
s = s.replace('not is_doccode_row(line.rstrip("\\n"))', 'not is_doccode_row(line.rstrip("\\n")) and not is_cliffs_row(line.rstrip("\\n"))')
assert n == 19 and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{PRED} docs and code (syzygy-5dhm.119)', 'DOCCODE_BOUND_PARTS = len(DOCCODE_SUBJECTS)\n')
mine = rename(consts)
mine = re.sub(r'CLIFFS_SPEC: "[0-9a-f]{64}"', f'CLIFFS_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-cliffs-v{VERSION}"', f'[Cliffs amendment {VERSION}]', subject, '"dossier-cliffs"', '"With the cliffs"'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, 'def is_doccode_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_cliffs_row(line):') == 1 and mine_funcs.count('if is_cliffs_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, 'def doccode_binding(root):\n', '    )\n')
delta = block(s, 'def doccode_delta(root, findings):\n', '    return added\n')
mine = rename(binding)
assert f'only over the effective v{PRED} docs and code REQ-034.' in mine, mine
assert f'predecessor=doccode_binding, predecessor_label="v{PRED} docs and code", version="v{VERSION}"' in mine, mine
assert 'label="cliffs"' in mine
mine_delta = rename(delta)
assert 'the cliffs add to REQ-034 over the docs and code, counted' in mine_delta, mine_delta
assert 'read_text(root, DOCCODE_SPEC)' in mine_delta and 'read_text(root, CLIFFS_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, '    doccode_retired_by = doccode_disposition(root, doccode_rows(root))\n', '    r2 += doccode_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{PRED} inactive by {{doccode_retired_by}}"\n',
          f'    if cliffs_retired_by:\n        retirement += f"; v{VERSION} inactive by {{cliffs_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective v2.48.
comp = block(s, '        doccode_amendment, doccode_records, doccode_subjects = doccode_binding(root)\n        findings += doccode_records + doccode_subjects\n',
             '                pb += extra_b\n')
mine = rename(comp)
assert 'if doccode_amendment is None:' in mine and f'require effective docs and code v{PRED}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside the docs and code's own branch.
sel = block(s, '                                    doccode_amendment, _records, _subjects = doccode_binding(root)\n                                    if doccode_amendment is not None:\n                                        by_id,',
            '                                        selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, '    if doccode_binding(root)[0] is not None:\n        n_scen += doccode_delta(root, findings)\n',
          '    if cliffs_binding(root)[0] is not None:\n        n_scen += cliffs_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, '    if doccode_amendment is not None:\n        files += tracked(root, DOCCODE_HOME)\n',
          '    cliffs_amendment, _records, _subjects = cliffs_binding(root)\n'
          '    if cliffs_amendment is not None:\n        files += tracked(root, CLIFFS_HOME)\n')
assert s.count('                        (doccode_amendment, DOCCODE_UNION)') == 1
s = s.replace('                        (doccode_amendment, DOCCODE_UNION)',
              '                        (doccode_amendment, DOCCODE_UNION),\n                        (cliffs_amendment, CLIFFS_UNION)', 1)

# 8. The status and index routes.
routes = block(s, '    doccode_amendment, _records, _subjects = doccode_binding(root)\n    doccode_fields = ',
               f'`{{OPENSPEC_README}}` calls docs and code v{PRED} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'cliffs v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, so its block peels first, before the docs and code's.
cen = block(s, '        if doccode_binding(root)[0] is not None:\n            # The docs and code\' own sentence',
            'declares a docs and code census while it is not in force")\n')
mine = rename(cen)
assert 'declares a cliffs census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, '    paths |= {DOCCODE_UNION, *DOCCODE_SUBJECTS}\n', '    paths |= {CLIFFS_UNION, *CLIFFS_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does the docs and code's.
s = after(s, '    doccode_subjects = DOCCODE_BOUND_PARTS if doccode_rows_now and not doccode_retired else 0\n',
          '    cliffs_rows_now = cliffs_rows(tree)\n'
          '    cliffs_retired = cliffs_disposition(tree, cliffs_rows_now)\n'
          '    cliffs_records = 2 if cliffs_retired else int(bool(cliffs_rows_now))\n'
          '    cliffs_subjects = CLIFFS_BOUND_PARTS if cliffs_rows_now and not cliffs_retired else 0\n')
s = after(s, ' - rough_records - doccode_records', ' - cliffs_records')
s = after(s, ' - rough_subjects - doccode_subjects', ' - cliffs_subjects')

# 12. The earlier-history projection: this version stands on v2.48, so its routes leave with it.
s = after(s, 'DOCCODE_STATUS_PREFIX, DOCCODE_COUNT_SCOPE', ', CLIFFS_STATUS_PREFIX, CLIFFS_COUNT_SCOPE')
old_comment = f'    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43 and the v{PRED} docs and code on v2.44,\n'
assert s.count(old_comment) == 1
s = s.replace(old_comment, f'    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43, the v{PRED} docs and code on v2.44 and the\n'
                           f'    # v{VERSION} cliffs on v{PRED},\n', 1)
s = after(s, 'ROUGH_INDEX_PREFIX, DOCCODE_INDEX_PREFIX', ', CLIFFS_INDEX_PREFIX')

# 13. The selftest case, mirroring the docs and code's.
case = block(s, 'def doccode_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_cliffs_row(line) and not is_cliffs_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_cliffs_row(line))')
old_floor = ('    current_bound = "past the read limit of 1000 documents or 1000 code files"\n'
             '    changed = "past the read limit of 1001 documents or 1000 code files"\n')
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "past the read limit of 1000 source files or 250 configuration files"\n'
                               '    changed = "past the read limit of 1001 source files or 250 configuration files"\n')
for needle in (f'"R1 requires effective v{PRED}"', f'"prior v{PRED} docs and code"', 'read limit of 1000 source files', 'cliffs-{name}',
               'Path(tmp) / "dossier-cliffs"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, '        lambda w, f: doccode_cases(tmp, base, w, f),\n', '        lambda w, f: cliffs_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over v2.48, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, 'def doccode_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace('doccode_amendment', 'cliffs_amendment').replace('doccode_binding', 'cliffs_binding')
          .replace('docs and code', 'cliffs'))
c = after(c, '                        (adoption.DOCCODE_SPEC, doccode_amendment(root))', ',\n'
          '                        (adoption.CLIFFS_SPEC, cliffs_amendment(root))')
c = after(c, '    doccode_amendment(root)\n', '    cliffs_amendment(root)\n')
c = after(c, '*adoption.DOCCODE_SUBJECTS,', ' *adoption.CLIFFS_SUBJECTS,')
# Every not-in-force guard that refuses a docs and code count (the stage before this one) also refuses this version's.
n = c.count('adoption.DOCCODE_COUNT_SCOPE))')
assert n == 7, n
c = c.replace('adoption.DOCCODE_COUNT_SCOPE))', 'adoption.DOCCODE_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))')
old_tail = """        if doccode_amendment(root) is None:
            if any(line.startswith(adoption.DOCCODE_COUNT_SCOPE) for line in lines):
                raise ScenarioCountError(f"{path} declares a docs and code count while it is not in force")
            return base_figure
        doccodes = [line for line in lines if line.startswith(adoption.DOCCODE_COUNT_SCOPE)]
        doccode = CHOICE_COUNT.fullmatch(doccodes[0].removeprefix(adoption.DOCCODE_COUNT_PREFIX)) if len(doccodes) == 1 else None
        if doccode is None:
            raise ScenarioCountError(f"{path} needs one complete docs and code count")
        added = adoption.doccode_delta(root, findings)
        if findings or (int(doccode[1]), int(doccode[2])) != (base_figure[0], base_figure[1] + added):
            raise ScenarioCountError(f"{path} docs and code count differs from its two source members")
        return int(doccode[1]), int(doccode[2])
"""
assert c.count(old_tail) == 1, 'docs and code tail'
new_tail = """        if doccode_amendment(root) is None:
            if any(line.startswith((adoption.DOCCODE_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE)) for line in lines):
                raise ScenarioCountError(f"{path} declares a docs and code count while it is not in force")
            return base_figure
        doccodes = [line for line in lines if line.startswith(adoption.DOCCODE_COUNT_SCOPE)]
        doccode = CHOICE_COUNT.fullmatch(doccodes[0].removeprefix(adoption.DOCCODE_COUNT_PREFIX)) if len(doccodes) == 1 else None
        if doccode is None:
            raise ScenarioCountError(f"{path} needs one complete docs and code count")
        added = adoption.doccode_delta(root, findings)
        if findings or (int(doccode[1]), int(doccode[2])) != (base_figure[0], base_figure[1] + added):
            raise ScenarioCountError(f"{path} docs and code count differs from its two source members")
        doccode_figure = int(doccode[1]), int(doccode[2])
        if cliffs_amendment(root) is None:
            if any(line.startswith(adoption.CLIFFS_COUNT_SCOPE) for line in lines):
                raise ScenarioCountError(f"{path} declares a cliffs count while it is not in force")
            return doccode_figure
        cliffs_lines = [line for line in lines if line.startswith(adoption.CLIFFS_COUNT_SCOPE)]
        cliffs = CHOICE_COUNT.fullmatch(cliffs_lines[0].removeprefix(adoption.CLIFFS_COUNT_PREFIX)) if len(cliffs_lines) == 1 else None
        if cliffs is None:
            raise ScenarioCountError(f"{path} needs one complete cliffs count")
        added = adoption.cliffs_delta(root, findings)
        if findings or (int(cliffs[1]), int(cliffs[2])) != (doccode_figure[0], doccode_figure[1] + added):
            raise ScenarioCountError(f"{path} cliffs count differs from its two source members")
        return int(cliffs[1]), int(cliffs[2])
"""
c = c.replace(old_tail, new_tail, 1)
for needle in ('    cliffs_amendment(root)\n', '(adoption.CLIFFS_SPEC, cliffs_amendment(root))', '*adoption.CLIFFS_SUBJECTS',
               'adoption.DOCCODE_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))', 'return int(cliffs[1]), int(cliffs[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
