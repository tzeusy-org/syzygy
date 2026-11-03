#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.7.1: the compose step (model.ts) and the
table-driven seed mapping (seed-graph.ts).

Usage: python3 mutants.py <clone at the subject commit, npm ci done> <out.json>

Each mutant replaces exactly one occurrence of `old` with `new` in one file,
runs the test selection below with vitest, records killed (vitest exit != 0
with at least one failed test) or survived, and restores the file. The record
names the commit and the sha256 of each subject file before mutation, so a
reader can re-run any row against the same bytes (AGENTS.md rules 6 and 11).
"""
import hashlib
import json
import os
import re
import subprocess
import sys

ROOT, OUT = sys.argv[1], sys.argv[2]
MODEL = 'packages/three-surface-poc-core/src/model.ts'
GRAPH = 'packages/three-surface-poc-core/src/seed-graph.ts'
TESTS = [
    'packages/three-surface-poc-core/src/model.test.ts',
    'packages/three-surface-poc-core/src/model-observations.test.ts',
    'packages/three-surface-poc-core/src/response-identity.test.ts',
    'apps/three-surface-poc/src/unknown-route-sweep.test.ts',
    'apps/three-surface-poc/src/trajectory.test.ts',
    'apps/three-surface-poc/src/orrery.test.ts',
    'apps/three-surface-poc/src/materialize-action.test.ts',
    'apps/three-surface-poc/src/polaris-walkthrough-readiness.test.ts',
    'apps/three-surface-poc/src/polaris-parity-sweep.test.ts',
    'apps/three-surface-poc/src/response-identity-independent.test.ts',
]

MUTANTS = [
    # Compose step.
    ('compose-drops-acceptance', MODEL, '(input.acceptance ?? walkthroughAcceptance())(project.projectShape)', 'walkthroughAcceptance()(project.projectShape)'),
    ('compose-proposed-work-null-for-unknowns', MODEL, '      proposedWork: project.proposedWork,\n    })),', '      proposedWork: null,\n    })),'),
    ('compose-dispatch-null', MODEL, '    dispatch: trajectory.dispatch,', '    dispatch: null,'),
    ('compose-surfaces-empty', MODEL, '    surfaces: graph.surfaces,', '    surfaces: [],'),
    ('compose-ignores-evidence', MODEL, 'evidence: input.evidence ?? zeroDriftEvidence(input),', 'evidence: zeroDriftEvidence(input),'),
    ('compose-raw-snapshot-label', MODEL, 'const snapshotLabel = snapshotLabelFor(input.evaluation.snapshot, input.seeds.project.repositoryId);', 'const snapshotLabel = input.evaluation.snapshot;'),
    ('compose-skips-validation', MODEL, '  validateSeedGraph(input.seeds);\n', ''),
    ('compose-identity-over-other-model', MODEL, 'responseIdentity: buildResponseIdentity(model) }', 'responseIdentity: buildResponseIdentity({ ...model, entities: [] }) }'),
    ('compose-materialized-bead-null', MODEL, 'materializedBeadId: trajectory.materialization.beadId,', 'materializedBeadId: null,'),
    ('compose-graph-unmaterialized', MODEL, 'buildGraphSlice(input.seeds, seed, trajectory.materialization)', 'buildGraphSlice(input.seeds, seed, { ...trajectory.materialization, beadId: null })'),
    # Table-driven mapping.
    ('table-work-detail-kept', GRAPH, 'context.materialization.beadId === null ? detail :', 'true ? detail :'),
    ('table-capability-provenance-short', GRAPH, "provenance: (context) => [file('design')(context), file('requirement')(context)],", "provenance: (context) => [file('requirement')(context)],"),
    ('table-materialization-verb-swapped', GRAPH, "origin === 'created' ? 'created'", "origin === 'reused' ? 'created'"),
    ('table-test-definition-maps-code', GRAPH, "    provenance: mapped('test'),\n  },\n  work:", "    provenance: mapped('code'),\n  },\n  work:"),
    ('table-code-kind-renamed', GRAPH, "  code: {\n    kind: 'code-region',", "  code: {\n    kind: 'code',"),
    ('table-relationship-uses-entity-row', GRAPH, '    statement: renderSeedText(seed.statement, seeds),\n    epistemic: role.epistemic(context),', '    statement: renderSeedText(seed.statement, seeds),\n    epistemic: ENTITY_ROLES.project.epistemic(context),'),
    ('table-orrery-membership-moved', GRAPH, "entityIds: surface.id === 'orrery' ?", "entityIds: surface.id === 'polaris' ?"),
    ('table-unknown-region-reason', GRAPH, "epistemic: () => unknown('mapping-coverage-absent', 'The first slice", "epistemic: () => unknown('missing-evidence', 'The first slice"),
    ('table-code-to-evidence-reason', GRAPH, "  'code-to-evidence': {\n    kind: 'verified-by',\n    epistemic: () => unknown('missing-evidence',", "  'code-to-evidence': {\n    kind: 'verified-by',\n    epistemic: () => unknown('mapping-coverage-absent',"),
    ('table-unsupported-role-accepted', GRAPH, '    if (expectedKind === undefined) {\n      errors.push(`entity ${entity.id} has unsupported role', '    if (expectedKind === undefined && false) {\n      errors.push(`entity ${entity.id} has unsupported role'),
]


def sha(path):
    with open(path, 'rb') as handle:
        return hashlib.sha256(handle.read()).hexdigest()


def run_tests():
    env = {**os.environ, 'TMPDIR': os.environ.get('TMPDIR', '/tmp/b71')}
    proc = subprocess.run(['npx', 'vitest', 'run', *TESTS], cwd=ROOT, env=env, capture_output=True, text=True)
    text = re.sub(r'\x1b\[[0-9;]*m', '', proc.stdout + proc.stderr)
    tests = re.search(r'Tests\s+(.*)', text)
    return proc.returncode, tests.group(1).strip() if tests else None, text


commit = subprocess.run(['git', '-C', ROOT, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
subjects = {path: sha(os.path.join(ROOT, path)) for path in (MODEL, GRAPH)}
code, summary, _ = run_tests()
baseline = {'exitCode': code, 'tests': summary}
if code != 0:
    raise SystemExit(f'baseline not green: {summary}')
rows = []
for mutant_id, path, old, new in MUTANTS:
    full = os.path.join(ROOT, path)
    original = open(full, encoding='utf8').read()
    count = original.count(old)
    if count != 1:
        rows.append({'id': mutant_id, 'file': path, 'old': old, 'new': new, 'outcome': 'not-applied', 'occurrences': count})
        continue
    open(full, 'w', encoding='utf8').write(original.replace(old, new, 1))
    try:
        code, summary, text = run_tests()
    finally:
        open(full, 'w', encoding='utf8').write(original)
    failed = re.findall(r'FAIL\s+\S*\s*(\S+\.test\.ts) > ([^\n]+)', text)
    killed = code != 0 and summary is not None and 'failed' in summary
    rows.append({
        'id': mutant_id, 'file': path, 'old': old, 'new': new,
        'outcome': 'killed' if killed else ('error' if code != 0 else 'survived'),
        'tests': summary,
        'firstFailures': [f'{f} > {t}'[:200] for f, t in failed[:3]],
    })
    print(mutant_id, rows[-1]['outcome'], summary, flush=True)
assert {path: sha(os.path.join(ROOT, path)) for path in subjects} == subjects, 'subject not restored'
record = {
    'bead': 'syzygy-bpyt.7.1',
    'commit': commit,
    'subjects': [{'path': path, 'sha256': digest} for path, digest in subjects.items()],
    'command': ['npx', 'vitest', 'run', *TESTS],
    'baseline': baseline,
    'mutants': rows,
    'totals': {outcome: sum(1 for row in rows if row['outcome'] == outcome) for outcome in ('killed', 'survived', 'error', 'not-applied')},
}
with open(OUT, 'w', encoding='utf8') as handle:
    json.dump(record, handle, indent=1)
    handle.write('\n')
print(json.dumps(record['totals']))
