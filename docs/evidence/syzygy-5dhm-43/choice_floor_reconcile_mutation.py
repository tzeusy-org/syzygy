#!/usr/bin/env python3
"""syzygy-5dhm.43: rule-6 mutants for the choice floor's reconciler and counter wiring, on the delivered tree.

Usage: choice_floor_reconcile_mutation.py <worktree> <out.json>. The tree must be clean. Each mutant replaces one
fragment (found exactly once) in one file, runs `scripts/check_spec_reconciliation.py --check` (or the counter),
records whether the expected finding appears, and restores the file with `git checkout`. The selftest base is
projected before the v2.36 advice, so the choice floor is effective only here, on the delivered tree.
"""
import json
import pathlib
import subprocess
import sys

root, out = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2])
STATUS = 'PROJECT-STATUS.md'
README = 'openspec/README.md'
SPEC = 'openspec/changes/dossier-choice-floor/proposed/polaris-generation/spec.md'
LEDGER = '.syzygy/governance/decisions/AGENT-ADOPTIONS.md'
CHECK = 'scripts/check_spec_reconciliation.py'
COUNT = 'scripts/count_polaris_effective_scenarios.py'
CHECK_RUN = ['python3', CHECK, '--check']
COUNT_RUN = ['python3', COUNT]

MUTANTS = [
    ('status-count-off', STATUS, 'Polaris has 39 requirements and 612 scenarios.', 'Polaris has 39 requirements and 611 scenarios.',
     CHECK_RUN, 'does not declare the exact choice floor census'),
    ('status-count-off-counter', STATUS, 'Polaris has 39 requirements and 612 scenarios.', 'Polaris has 39 requirements and 611 scenarios.',
     COUNT_RUN, 'choice floor count differs'),
    ('status-route-old-id', STATUS, 'is agent-adopted in A-336.', 'is agent-adopted in A-321.',
     CHECK_RUN, 'does not route choice floor v2.37'),
    ('index-old-tag', README, '`polaris-dossier-choice-floor-v2.37`', '`polaris-dossier-choice-floor-v2.33`',
     CHECK_RUN, 'does not route choice floor v2.37'),
    ('spec-floor-four', SPEC, 'A group with fewer than three items on record is one advisory',
     'A group with fewer than four items on record is one advisory', CHECK_RUN, 'differs from the reviewed v2.37 subject'),
    ('row-old-tag', LEDGER, '| `polaris-dossier-choice-floor-v2.37` |', '| `polaris-dossier-choice-floor-v2.33` |',
     CHECK_RUN, 'calls choice floor v2.37 adopted while it is not in force'),
    ('census-skips-choice', CHECK, '                a, extra_a = compose_figure_by_id(a, choice_amendment, CHOICE_REPLACES)\n'
     '                b, extra_b = compose_figure_by_name(b, choice_amendment, CHOICE_REPLACES)\n',
     '                extra_a = extra_b = []\n', CHECK_RUN, 'FAIL  R3'),
    ('expected-skips-choice', CHECK, '        n_scen += choice_delta(root, findings)\n', '        pass\n', CHECK_RUN, 'FAIL  R3'),
    ('projection-skips-choice', CHECK, '            selected_population = by_id\n    if selected_population != current:',
     '    if selected_population != current:', CHECK_RUN, 'selected census differs'),
    ('status-want-unadjusted', CHECK, "            want = (want[0], str(int(want[1]) - choice_delta(root, findings)))\n", '',
     CHECK_RUN, 'FAIL  R5'),
]

results = []
for name, rel, old, new, command, expect in MUTANTS:
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
out.write_text(json.dumps({'commit': commit, 'script': 'docs/evidence/syzygy-5dhm-43/choice_floor_reconcile_mutation.py',
                           'mutants': results}, indent=2) + '\n', encoding='utf-8')
print(sum(r['outcome'] == 'killed' for r in results), 'of', len(results), 'killed')
