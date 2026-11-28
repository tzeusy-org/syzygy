#!/usr/bin/env python3
"""syzygy-5dhm.116: rule-6 mutants for the cliffs' reconciler and counter wiring, on the delivered tree.

Usage: cliffs_reconcile_mutation.py <worktree> <out.json>. The tree must be clean. Each mutant replaces one
fragment (found exactly once) in one file, runs `scripts/check_spec_reconciliation.py --check` (or the counter),
records whether the expected finding appears, and restores the file with `git checkout`. The selftest base is
projected before the v2.36 advice, so v2.49 is effective only here, on the delivered tree.
"""
import json
import pathlib
import subprocess
import sys

root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
STATUS = 'PROJECT-STATUS.md'
README = 'openspec/README.md'
SPEC = 'openspec/changes/dossier-cliffs/proposed/polaris-generation/spec.md'
LEDGER = '.syzygy/governance/decisions/AGENT-ADOPTIONS.md'
CHECK = 'scripts/check_spec_reconciliation.py'
COUNT = 'scripts/count_polaris_effective_scenarios.py'
CHECK_RUN = ['python3', CHECK, '--check']
COUNT_RUN = ['python3', COUNT]

MUTANTS = [
    ('status-count-off', STATUS, 'Polaris has 39 requirements and 642 scenarios.', 'Polaris has 39 requirements and 641 scenarios.',
     CHECK_RUN, 'does not declare the exact cliffs census'),
    ('status-count-off-counter', STATUS, 'Polaris has 39 requirements and 642 scenarios.', 'Polaris has 39 requirements and 641 scenarios.',
     COUNT_RUN, 'cliffs count differs'),
    ('status-route-old-id', STATUS, 'is agent-adopted in A-343.', 'is agent-adopted in A-338.',
     CHECK_RUN, 'does not route cliffs v2.49'),
    ('index-old-tag', README, '`polaris-dossier-cliffs-v2.49`', '`polaris-dossier-cliffs-v2.40`',
     CHECK_RUN, 'does not route cliffs v2.49'),
    ('spec-one-byte', SPEC, '# Dossier cliffs', '# Dossier cliffz',
     CHECK_RUN, 'differs from the reviewed v2.49 subject'),
    ('row-old-tag', LEDGER, '| `polaris-dossier-cliffs-v2.49` |', '| `polaris-dossier-cliffs-v2.40` |',
     CHECK_RUN, 'calls cliffs v2.49 adopted while it is not in force'),
    ('row-test-is-choice', CHECK, 'for line in adoption_table_rows(root) if is_cliffs_row(line)]',
     'for line in adoption_table_rows(root) if is_choice_row(line)]', CHECK_RUN, 'cliffs: malformed adoption identity'),
    ('census-skips-cliffs', CHECK, '                a, extra_a = compose_figure_by_id(a, cliffs_amendment, CLIFFS_REPLACES)\n'
     '                b, extra_b = compose_figure_by_name(b, cliffs_amendment, CLIFFS_REPLACES)\n',
     '                extra_a = extra_b = []\n', CHECK_RUN, 'FAIL  R3'),
    ('expected-skips-cliffs', CHECK, '        n_scen += cliffs_delta(root, findings)\n', '        pass\n', CHECK_RUN, 'FAIL  R3'),
    ('projection-skips-cliffs', CHECK, '                                                findings.append("POLARIS cliffs: selected census projections disagree")\n'
     '                                            selected_population = by_id\n',
     '                                                findings.append("POLARIS cliffs: selected census projections disagree")\n',
     CHECK_RUN, 'selected census differs'),
    ('status-want-unadjusted', CHECK, "            want = (want[0], str(int(want[1]) - cliffs_delta(root, findings)))\n", '',
     CHECK_RUN, 'FAIL  R5'),
]

baseline = {}
for command in (CHECK_RUN, COUNT_RUN):
    run = subprocess.run(command, cwd=root, capture_output=True, text=True)
    baseline[' '.join(command)] = {'exit': run.returncode, 'output': run.stdout + run.stderr}
    assert run.returncode == 0, f"baseline {' '.join(command)} is not green (exit {run.returncode}); a kill would prove nothing"

results = []
for name, rel, old, new, command, expect in MUTANTS:
    assert expect not in baseline[' '.join(command)]['output'], f"{name}: expected string already on the green baseline"
    path = root / rel
    body = path.read_text(encoding='utf-8')
    assert body.count(old) == 1, (name, body.count(old))
    path.write_text(body.replace(old, new, 1), encoding='utf-8')
    try:
        run = subprocess.run(command, cwd=root, capture_output=True, text=True)
        output = run.stdout + run.stderr
    finally:
        subprocess.run(['git', 'checkout', '--', rel], cwd=root, check=True)
    killed = run.returncode != 0 and expect in output
    results.append({'mutant': name, 'path': rel, 'old': old, 'new': new, 'command': ' '.join(command),
                    'expected': expect, 'exit': run.returncode, 'outcome': 'killed' if killed else 'SURVIVED'})
    print(f"{name}: {'killed' if killed else 'SURVIVED'} (exit {run.returncode})", flush=True)

commit = subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=root, capture_output=True, text=True).stdout.strip()
out.write_text(json.dumps({'commit': commit, 'script': 'docs/evidence/syzygy-5dhm.116/cliffs_reconcile_mutation.py',
                           'baseline': {k: {'exit': v['exit']} for k, v in baseline.items()},
                           'mutants': results}, indent=2) + '\n', encoding='utf-8')
print(sum(r['outcome'] == 'killed' for r in results), 'of', len(results), 'killed')
