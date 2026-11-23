#!/usr/bin/env python3
"""Wire the v2.22 reader's edition overlay into check_spec_reconciliation.py and count_polaris_effective_scenarios.py,
cloned from the v2.20 hero wiring and composed after it. Usage: wire.py <worktree> <spec sha256>. Every edit asserts its anchor once."""
import pathlib
import re
import sys

W = pathlib.Path(sys.argv[1])
DIGEST = sys.argv[2]
chk = W / 'scripts/check_spec_reconciliation.py'
t = chk.read_text(encoding='utf-8')


def once(text, anchor):
    n = text.count(anchor)
    assert n == 1, (n, anchor[:100])


def after(text, anchor, addition):
    once(text, anchor)
    return text.replace(anchor, anchor + addition, 1)


def segment(text, start, end):
    """The text from `start` up to (not including) `end`, each occurring once."""
    once(text, start)
    i = text.index(start)
    j = text.index(end, i + len(start))
    return text[i:j]


def to_readers(s):
    for a, b in (('HERO', 'READERS'), ('hero_', 'readers_'), ('_hero', '_readers'), ('"hero-', '"readers-'), ('f"hero-', 'f"readers-'),
                 ('hero figure', "reader's edition"), ('hero-figure', 'readers-edition'),
                 ('relation types', 'hero figure'), ('reltype_binding', 'hero_binding'), ('is_reltype_row', 'is_hero_row')):
        s = s.replace(a, b)
    s = s.replace('v2.20', 'v2.22').replace('v2.19', 'v2.20')
    return s


# 1. Constants.
consts = segment(t, '# The v2.20 hero-figure amendment (syzygy-3efd.29)', 'HERO_BOUND_PARTS = len(HERO_SUBJECTS)\n') + 'HERO_BOUND_PARTS = len(HERO_SUBJECTS)\n'
new_consts = ('# The v2.22 reader\'s edition amendment (syzygy-5dhm.136): one MODIFIED\n'
              '# REQ-polaris-generation-034 after v2.20, pending until its own VIS-4 ledger\n'
              '# row, found by its tag as v2.20\'s is. (v2.21 is allocated to a concurrent\n'
              '# candidate, syzygy-3efd.31.)\n'
              'READERS_CHANGE = "dossier-readers-edition"\n'
              'READERS_HOME = f"{CHANGES}/{READERS_CHANGE}"\n'
              'READERS_SPEC = f"{READERS_HOME}/proposed/polaris-generation/spec.md"\n'
              'READERS_UNION = f"{READERS_HOME}/GOVERNING-DEPENDENCIES.json"\n'
              'READERS_TAG = "polaris-dossier-readers-edition-v2.22"\n'
              'READERS_STATUS_PREFIX = f"[Reader\'s edition amendment 2.22]({READERS_HOME})"\n'
              'READERS_SUBJECTS = {\n'
              f'    READERS_SPEC: "{DIGEST}",\n'
              '}\n'
              'READERS_BOUND_PARTS = len(READERS_SUBJECTS)\n')
t = after(t, consts, new_consts)

# 2. Row predicates (is_hero_row, hero_rows, hero_disposition).
rows = segment(t, 'def is_hero_row(line):', '\n\ndef polaris_additions(root):')
t = after(t, rows, '\n\n' + to_readers(rows).rstrip('\n'))

# 3. Binding.
binding = segment(t, 'def hero_binding(root):', '\n\ndef is_raw_read_row(line):')
t = after(t, binding, '\n\n' + to_readers(binding).rstrip('\n'))

# 4. check_outcomes.
block = ('    hero_retired_by = hero_disposition(root, hero_rows(root))\n'
         '    hero_amendment, hero_records, hero_subjects = hero_binding(root)\n'
         '    if hero_retired_by:\n'
         '        records += 2\n'
         '    elif hero_amendment is not None or hero_records or hero_subjects:\n'
         '        records += 1\n'
         '        subjects_seen += HERO_BOUND_PARTS\n'
         '    r1 += hero_records\n'
         '    r2 += hero_subjects\n')
t = after(t, block, to_readers(block))
retire = ('    if hero_retired_by:\n'
          '        retirement += f"; v2.20 inactive by {hero_retired_by}"\n')
t = after(t, retire, '    if readers_retired_by:\n        retirement += f"; v2.22 inactive by {readers_retired_by}"\n')
msg = '"one v2.20 row over effective v2.19, pending until recorded" + retirement)'
once(t, msg)
t = t.replace(msg, '"one v2.20 row over effective v2.19, pending until recorded; reader\'s edition: "\n'
              '               "one v2.22 row over effective v2.20, pending until recorded" + retirement)', 1)

# 5. census.
census = ('        hero_amendment, hero_records, hero_subjects = hero_binding(root)\n'
          '        findings += hero_records + hero_subjects\n'
          '        if hero_amendment is not None:\n'
          '            if reltype_amendment is None:\n'
          '                findings.append("POLARIS: hero figure requires effective relation types v2.19")\n'
          '            else:\n'
          '                a, extra_a = compose_figure_by_id(a, hero_amendment)\n'
          '                b, extra_b = compose_figure_by_name(b, hero_amendment)\n'
          '                pa += extra_a\n'
          '                pb += extra_b\n')
t = after(t, census, ('        readers_amendment, readers_records, readers_subjects = readers_binding(root)\n'
                      '        findings += readers_records + readers_subjects\n'
                      '        if readers_amendment is not None:\n'
                      '            if hero_amendment is None:\n'
                      '                findings.append("POLARIS: reader\'s edition requires effective hero figure v2.20")\n'
                      '            else:\n'
                      '                a, extra_a = compose_figure_by_id(a, readers_amendment)\n'
                      '                b, extra_b = compose_figure_by_name(b, readers_amendment)\n'
                      '                pa += extra_a\n'
                      '                pb += extra_b\n'))

# 6. polaris_expected, nested inside the hero branch.
ind = ' ' * 68
expected = (f'{ind}n_scen += sum(len(row["scenarios"]) for row in hero_a.values()) - sum(\n'
            f'{ind}    len(row["scenarios"]) for row in rel_a.values())\n')
t = after(t, expected, (f'{ind}readers_amendment, _records, _subjects = readers_binding(root)\n'
                        f'{ind}if readers_amendment is not None:\n'
                        f'{ind}    readers_a, pa = compose_figure_by_id(hero_a, readers_amendment)\n'
                        f'{ind}    readers_b, pb = compose_figure_by_name(hero_b, readers_amendment)\n'
                        f'{ind}    if pa or pb or readers_a != readers_b or set(readers_a) != set(hero_a):\n'
                        f'{ind}        findings.append("POLARIS reader\'s edition: methods disagree or change identities")\n'
                        f'{ind}    n_scen += sum(len(row["scenarios"]) for row in readers_a.values()) - sum(\n'
                        f'{ind}        len(row["scenarios"]) for row in hero_a.values())\n'))

# 7. check_generated: tracked files and the union list.
gen = ('    hero_amendment, _records, _subjects = hero_binding(root)\n'
       '    if hero_amendment is not None:\n'
       '        files += tracked(root, HERO_HOME)\n')
t = after(t, gen, to_readers(gen))
t = after(t, '                        (hero_amendment, HERO_UNION),\n', '                        (readers_amendment, READERS_UNION),\n')

# 8. check_routes.
routes = segment(t, '    hero_amendment, _records, _subjects = hero_binding(root)\n    hero_fields = ', '    readmit_amendment, _records, _subjects = readmit_binding(root)\n    readmit_fields')
t = after(t, routes, to_readers(routes).replace('hero_fields', 'readers_fields'))

# 9. inputs.
t = after(t, '    paths |= {HERO_UNION, *HERO_SUBJECTS}\n', '    paths |= {READERS_UNION, *READERS_SUBJECTS}\n')

# 10. Every ledger filter that drops the hero row drops the reader's edition row too, and hero_cases' own filter.
n = t.count(' and not is_hero_row(line))')
t = t.replace(' and not is_hero_row(line))', ' and not is_hero_row(line) and not is_readers_row(line))')
own = '                      if not is_hero_row(line))\n'
once(t, own)
t = t.replace(own, '                      if not is_hero_row(line) and not is_readers_row(line))\n', 1)

# 11. declared_source_historical_cases.
t = after(t, '    had_hero = any(is_hero_row(line) for line in original.splitlines())\n',
          '    had_readers = any(is_readers_row(line) for line in original.splitlines())\n')
t = after(t, ' - had_reltype - had_hero', ' - had_readers')
t = after(t, '            - (HERO_BOUND_PARTS if had_hero else 0)\n', '            - (READERS_BOUND_PARTS if had_readers else 0)\n')

# 12. Selftest cases, cloned from hero_cases.
cases = segment(t, 'def hero_cases(tmp, base, witnesses, failures):', '\n\ndef reach_cases(')
rc = to_readers(cases)
rc = rc.replace('"""The v2.22 pending-to-adopted transition over v2.20', '"""The v2.22 pending-to-adopted transition over v2.20')
rc = rc.replace('if not is_readers_row(line) and not is_readers_row(line))', 'if not is_readers_row(line))')
rc = rc.replace('len(predecessor[ident]["scenarios"]) == 168', 'len(predecessor[ident]["scenarios"]) == 178')
rc = rc.replace('len(current[ident]["scenarios"]) == 178', 'len(current[ident]["scenarios"]) == 183')
rc = rc.replace('"v2.22 replaces exactly 034 (168 to 178 scenarios)"', '"v2.22 replaces exactly 034 (178 to 183 scenarios)"')
rc = rc.replace('"### Requirement: Agent brief and reader\'s edition"', '"### Requirement: Agent brief and reader\'s edition"')
rc = rc.replace('Path(tmp) / "readers-edition"', 'Path(tmp) / "readers-edition"')
t = after(t, cases, '\n\n' + rc.rstrip('\n'))
t = after(t, '    hero_cases(tmp, base, witnesses, failures)\n', '    readers_cases(tmp, base, witnesses, failures)\n')
chk.write_text(t, encoding='utf-8')
print('check_spec_reconciliation: filters extended', n + 1)

# count_polaris_effective_scenarios.py
cnt = W / 'scripts/count_polaris_effective_scenarios.py'
c = cnt.read_text(encoding='utf-8')
fn = segment(c, 'def hero_amendment(root: Path) -> str | None:', '\n\ndef reltype_amendment(')
c = after(c, fn, '\n\n' + fn.replace('hero_amendment', 'readers_amendment').replace('hero_binding', 'readers_binding').replace('hero figure', "reader's edition"))
c = after(c, '                        (adoption.HERO_SPEC, hero_amendment(root))', ',\n                        (adoption.READERS_SPEC, readers_amendment(root))')
c = after(c, '    hero_amendment(root)\n    paths', '')
once(c, '    hero_amendment(root)\n    paths')
c = c.replace('    hero_amendment(root)\n    paths', '    hero_amendment(root)\n    readers_amendment(root)\n    paths', 1)
c = after(c, '*adoption.HERO_SUBJECTS,', ' *adoption.READERS_SUBJECTS,')
cnt.write_text(c, encoding='utf-8')
print('count_polaris_effective_scenarios: wired')
