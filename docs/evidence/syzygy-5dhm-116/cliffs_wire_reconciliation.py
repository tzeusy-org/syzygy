#!/usr/bin/env python3
"""syzygy-5dhm.116: wire REQ-polaris-generation-034 VERSION (the cliffs) into the reconciliation scripts after its predecessor P.

Usage: cliffs_wire_reconciliation.py <worktree> <subject sha256>
Edits scripts/check_spec_reconciliation.py and scripts/count_polaris_effective_scenarios.py in place: each place the predecessor P is
wired gains the same wiring for this version with P as its predecessor, every filter that leaves out P's row also leaves out this one (this
version stands on P, so it leaves with it), and a selftest case mirrors P's. Every name moves one version on: the names of the versions
before P are marked first, P is renamed to this version, and the marks are restored, so no rename collides. Each edit asserts its anchor
occurs the expected number of times, so a run over a changed predecessor stops rather than guessing. Run once, over main's two scripts.

History: this version was first built as 2.49 over the v2.48 docs and code. The imports corroboration (2.49), the view levels (2.50) and the
walk advice (2.51) each took their number on main first, so it was rebuilt by its script each time (the dispatch's rebuild recipe); P
below names the predecessor it is wired after now. Earlier forms of this script are in git history.
"""
import pathlib
import re
import sys

VERSION = '2.52'
# The predecessor: its constant and function prefixes, its words in prose, its change slug, version and bead.
P = dict(UP='WALKADV', low='walkadv', words='walk advice', Words='Walk advice', slug='walk-advice', version='2.51', bead='syzygy-3efd.35',
         projection_indent=48, row_filters=22, count_guards=10,
         mutant=('    current_bound = "The threshold is zero new words: the rule never fires at one."\n'
                 '    changed = "The threshold is one new word."\n', 'modified-threshold'))
# P's predecessor, and the versions before it whose names P's wiring may carry (marked, never renamed).
PP = dict(UP='VIEWLVL', low='viewlvl', words='view levels', version='2.50')
EARLIER = (('VIEWLVL', 'viewlvl', 'view levels', '2.50'), ('IMPWIT', 'impwit', 'imports corroboration', '2.49'),
           ('DOCCODE', 'doccode', 'docs and code', '2.48'))

root, subject = pathlib.Path(sys.argv[1]), sys.argv[2]
assert re.fullmatch(r'[0-9a-f]{64}', subject)
recon = root / 'scripts/check_spec_reconciliation.py'
count = root / 'scripts/count_polaris_effective_scenarios.py'
s = recon.read_text(encoding='utf-8')
assert 'CLIFFS_' not in s, 'already wired'
U, L, W, V = P['UP'], P['low'], P['words'], P['version']
assert f'{U}_TAG = "polaris-dossier-{P["slug"]}-v{V}"' in s, 'predecessor is not the one this script names'


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
    """P's wiring as the cliffs': earlier versions' names marked first, then P renamed, then the marks restored."""
    marks = []
    for k, (up, low, words, version) in enumerate(EARLIER):
        for old, mark in ((up, f'@U{k}@'), (low, f'@L{k}@')):
            text = re.sub(rf'(?<![A-Za-z]){old}(?=_)|(?<=_){old}(?![A-Za-z])', mark, text)
            marks.append((mark, old))
        for old, mark in ((words, f'@W{k}@'), (f'v{version}', f'@V{k}@')):
            text = text.replace(old, mark)
            marks.append((mark, old))
    for old, new in ((f'dossier-{P["slug"]}', 'dossier-cliffs'), (f'{P["slug"]}-', 'cliffs-'), (f"{W}'s", "cliffs'"),
                     (f"{W}'", "cliffs'"), (W, 'cliffs'), (P['Words'], 'Cliffs'),
                     (f'v{V}', f'v{VERSION}'), (f'amendment {V}]', f'amendment {VERSION}]'), (P['bead'], 'syzygy-5dhm.116')):
        text = text.replace(old, new)
    text = re.sub(rf'(?<![A-Za-z]){U}(?=_)', 'CLIFFS', text)
    text = re.sub(rf'(?<![A-Za-z]){L}(?=_)|(?<=_){L}(?![A-Za-z])', 'cliffs', text)
    assert re.search(rf'{L}|{P["slug"]}|{W}', text, re.I) is None, 'a predecessor name is left'
    for mark, old in marks:
        text = text.replace(mark, old)
    return text


def onto_p(text: str) -> str:
    """Point a mirrored predecessor reference (to PP) at P instead."""
    for old, new in ((f'{PP["low"]}_binding', f'{L}_binding'), (f'{PP["UP"]}_SPEC', f'{U}_SPEC'), (f'{PP["low"]}_amendment', f'{L}_amendment'),
                     (f'v{PP["version"]} {PP["words"]}', f'v{V} {W}'), (f'{PP["words"]} v{PP["version"]}', f'{W} v{V}'),
                     (f'over the {PP["words"]}', f'over the {W}')):
        text = text.replace(old, new)
    return text


# 0. Every filter that leaves out P's row leaves out this one too (before any mirrored code exists).
n = s.count(f'not is_{L}_row(line)')
s = s.replace(f'not is_{L}_row(line)', f'not is_{L}_row(line) and not is_cliffs_row(line)')
m = s.count(f'not is_{L}_row(line.rstrip("\\n"))')
s = s.replace(f'not is_{L}_row(line.rstrip("\\n"))', f'not is_{L}_row(line.rstrip("\\n")) and not is_cliffs_row(line.rstrip("\\n"))')
assert n == P['row_filters'] and m == 1, (n, m)

# 1. Constants.
consts = block(s, f'# The v{V} {W} ({P["bead"]})', f'{U}_BOUND_PARTS = len({U}_SUBJECTS)\n')
mine = rename(consts).replace(f'# the v{PP["version"]} {PP["words"]},', f'# the v{V} {W},')
mine = re.sub(r'CLIFFS_SPEC: "[0-9a-f]{64}"', f'CLIFFS_SPEC: "{subject}"', mine)
for needle in (f'"polaris-dossier-cliffs-v{VERSION}"', f'[Cliffs amendment {VERSION}]', subject, '"dossier-cliffs"', '"With the cliffs"',
               f'# The v{VERSION} cliffs (syzygy-5dhm.116)', f'# the v{V} {W},'):
    assert needle in mine, (needle, mine)
s = after(s, consts, '\n' + mine)

# 2. Row, rows, disposition, binding and delta.
funcs = block(s, f'def is_{L}_row(line):\n', '    return None\n')
mine_funcs = rename(funcs)
assert mine_funcs.count('def is_cliffs_row(line):') == 1 and mine_funcs.count('if is_cliffs_row(line)') == 1, mine_funcs
s = after(s, funcs, '\n\n' + mine_funcs)
binding = block(s, f'def {L}_binding(root):\n', '    )\n')
delta = block(s, f'def {L}_delta(root, findings):\n', '    return added\n')
mine = onto_p(rename(binding))
assert f'only over the effective v{V} {W} REQ-034.' in mine, mine
assert f'predecessor={L}_binding, predecessor_label="v{V} {W}", version="v{VERSION}"' in mine, mine
assert 'label="cliffs"' in mine
mine_delta = onto_p(rename(delta))
assert f'the cliffs add to REQ-034 over the {W}, counted' in mine_delta, mine_delta
assert f'read_text(root, {U}_SPEC)' in mine_delta and 'read_text(root, CLIFFS_SPEC)' in mine_delta, mine_delta
s = after(s, delta, '\n\n' + mine + '\n\n' + mine_delta)

# 3. The R1/R2 accounting and its retirement note.
acct = block(s, f'    {L}_retired_by = {L}_disposition(root, {L}_rows(root))\n', f'    r2 += {L}_subjects\n')
s = after(s, acct, rename(acct))
s = after(s, f'        retirement += f"; v{V} inactive by {{{L}_retired_by}}"\n',
          f'    if cliffs_retired_by:\n        retirement += f"; v{VERSION} inactive by {{cliffs_retired_by}}"\n')

# 4. The census composition: this version composes only over an effective P.
comp = block(s, f'        {L}_amendment, {L}_records, {L}_subjects = {L}_binding(root)\n        findings += {L}_records + {L}_subjects\n',
             '                pb += extra_b\n')
mine = onto_p(rename(comp))
assert f'if {L}_amendment is None:' in mine and f'require effective {W} v{V}' in mine, mine
s = after(s, comp, mine)

# 5. The selected census projection, nested one level deeper, inside P's own branch.
I = P['projection_indent']
sel = block(s, ' ' * I + f'{L}_amendment, _records, _subjects = {L}_binding(root)\n' + ' ' * I + f'if {L}_amendment is not None:\n',
            ' ' * (I + 4) + 'selected_population = by_id\n')
s = after(s, sel, ''.join('    ' + line if line.strip() else line for line in rename(sel).splitlines(keepends=True)))

# 6. The scenario arithmetic.
s = after(s, f'    if {L}_binding(root)[0] is not None:\n        n_scen += {L}_delta(root, findings)\n',
          '    if cliffs_binding(root)[0] is not None:\n        n_scen += cliffs_delta(root, findings)\n')

# 7. Tracked files and the dependency unions.
s = after(s, f'    if {L}_amendment is not None:\n        files += tracked(root, {U}_HOME)\n',
          '    cliffs_amendment, _records, _subjects = cliffs_binding(root)\n'
          '    if cliffs_amendment is not None:\n        files += tracked(root, CLIFFS_HOME)\n')
union = f'                        ({L}_amendment, {U}_UNION),'
assert s.count(union) == 1
s = s.replace(union, union + '\n                        (cliffs_amendment, CLIFFS_UNION),', 1)

# 8. The status and index routes.
routes = block(s, f'    {L}_amendment, _records, _subjects = {L}_binding(root)\n    {L}_fields = ',
               f'`{{OPENSPEC_README}}` calls {W} v{V} adopted while it is not in force")\n')
mine = rename(routes)
assert mine.count(f'cliffs v{VERSION}') == 4, mine
s = after(s, routes, mine)

# 9. The status census: this version's sentence states the current total, so its block peels first.
cen = block(s, f'        if {L}_binding(root)[0] is not None:\n            # The {W}\'s own sentence',
            f'declares a {W} census while it is not in force")\n')
mine = rename(cen)
assert 'declares a cliffs census' in mine, mine
s = before(s, cen, mine)

# 10. Inputs.
s = after(s, f'    paths |= {{{U}_UNION, *{U}_SUBJECTS}}\n', '    paths |= {CLIFFS_UNION, *CLIFFS_SUBJECTS}\n')

# 11. The absent-amendment control subtracts this row's records and subjects, as it does P's.
s = after(s, f'    {L}_subjects = {U}_BOUND_PARTS if {L}_rows_now and not {L}_retired else 0\n',
          '    cliffs_rows_now = cliffs_rows(tree)\n'
          '    cliffs_retired = cliffs_disposition(tree, cliffs_rows_now)\n'
          '    cliffs_records = 2 if cliffs_retired else int(bool(cliffs_rows_now))\n'
          '    cliffs_subjects = CLIFFS_BOUND_PARTS if cliffs_rows_now and not cliffs_retired else 0\n')
s = after(s, f' - {PP["low"]}_records - {L}_records', ' - cliffs_records')
s = after(s, f' - {PP["low"]}_subjects - {L}_subjects', ' - cliffs_subjects')

# 12. The earlier-history projection: this version stands on P, so its routes leave with it.
s = after(s, f'{U}_STATUS_PREFIX, {U}_COUNT_SCOPE', ', CLIFFS_STATUS_PREFIX, CLIFFS_COUNT_SCOPE')
old_comment = '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43 and the v2.48 docs and code on v2.44,\n'
assert s.count(old_comment) == 1
s = s.replace(old_comment, '    # migration bounds on v2.42, the v2.44 rough-edge markers on v2.43, the v2.48 docs and code on v2.44, the\n'
                           '    # v2.49 imports corroboration on v2.48, the v2.50 view levels on v2.49, the v2.51 walk advice on v2.50\n'
                           f'    # and the v{VERSION} cliffs on v{V},\n', 1)
s = after(s, f'{PP["UP"]}_INDEX_PREFIX, {U}_INDEX_PREFIX', ', CLIFFS_INDEX_PREFIX')

# 13. The selftest case, mirroring P's.
case = block(s, f'def {L}_cases(tmp, base, witnesses, failures):\n',
             '    record("vetoed", AGENT_ADOPTIONS, row, row + veto, "restore exact previous 034", found, held, baseline=True)\n')
mine = rename(case)
dup = 'if not is_cliffs_row(line) and not is_cliffs_row(line))'
assert mine.count(dup) == 1, mine[:1500]
mine = mine.replace(dup, 'if not is_cliffs_row(line))')
mine = mine.replace(f'"R1 requires effective v{PP["version"]}"', f'"R1 requires effective v{V}"')
mine = mine.replace(f'"prior v{PP["version"]} {PP["words"]}"', f'"prior v{V} {W}"')
old_floor, old_name = P['mutant']
assert mine.count(old_floor) == 1
# Mutate this version's own clause, not the predecessor's text it carries.
mine = mine.replace(old_floor, '    current_bound = "past the read limit of 1000 source files or 250 configuration files"\n'
                               '    changed = "past the read limit of 1001 source files or 250 configuration files"\n')
mine = mine.replace(f'record("{old_name}", CLIFFS_SPEC', 'record("modified-read-limit", CLIFFS_SPEC')
for needle in (f'"R1 requires effective v{V}"', f'"prior v{V} {W}"', 'read limit of 1000 source files', 'cliffs-{name}',
               'Path(tmp) / "dossier-cliffs"', 'record("modified-read-limit"'):
    assert needle in mine, needle
s = after(s, case, '\n\n' + mine)
s = after(s, f'        lambda w, f: {L}_cases(tmp, base, w, f),\n', '        lambda w, f: cliffs_cases(tmp, base, w, f),\n')
recon.write_text(s, encoding='utf-8')

# 14. The scenario counter: compose this version over P, read its inputs, and check its own status count.
c = count.read_text(encoding='utf-8')
fn = block(c, f'def {L}_amendment(root: Path) -> str | None:\n', '    return text\n')
c = after(c, fn, '\n\n' + fn.replace(f'{L}_amendment', 'cliffs_amendment').replace(f'{L}_binding', 'cliffs_binding').replace(W, 'cliffs'))
c = after(c, f'                        (adoption.{U}_SPEC, {L}_amendment(root)),', '\n'
          '                        (adoption.CLIFFS_SPEC, cliffs_amendment(root)),')
c = after(c, f'    {L}_amendment(root)\n', '    cliffs_amendment(root)\n')
c = after(c, f'*adoption.{U}_SUBJECTS,', ' *adoption.CLIFFS_SUBJECTS,')
# Every not-in-force guard that refuses a P count (a stage before this one) also refuses this version's.
n = c.count(f'adoption.{U}_COUNT_SCOPE))')
assert n == P['count_guards'], n
c = c.replace(f'adoption.{U}_COUNT_SCOPE))', f'adoption.{U}_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))')
guard = f'            if any(line.startswith(adoption.{U}_COUNT_SCOPE) for line in lines):\n'
assert c.count(guard) == 1
c = c.replace(guard, f'            if any(line.startswith((adoption.{U}_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE)) for line in lines):\n', 1)
old_tail = f'        return int({L}[1]), int({L}[2])\n'
assert c.count(old_tail) == 1
new_tail = f"""        cliffs_pred_figure = int({L}[1]), int({L}[2])
""" + """        if cliffs_amendment(root) is None:
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
               f'adoption.{U}_COUNT_SCOPE, adoption.CLIFFS_COUNT_SCOPE))', 'return int(cliffs[1]), int(cliffs[2])'):
    assert needle in c, needle
count.write_text(c, encoding='utf-8')
print('wired')
