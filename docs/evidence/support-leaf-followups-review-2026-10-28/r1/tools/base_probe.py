#!/usr/bin/env python3
"""Usage: base_probe.py <base clone at 1a8864d9> <out.json> <tmpdir>: which of the forms PR 554's body lists as new refusals 1-4
the base guards already refused (rows that fail here were not accepted at 1a8864d9). Fragments come from the committed records by id."""
import importlib.util, os, sys
spec = importlib.util.spec_from_file_location('rm', os.path.join(os.path.dirname(os.path.abspath(__file__)), 'rev_mutants.py'))
rm = importlib.util.module_from_spec(spec); spec.loader.exec_module(rm)
D2D5 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'

STATE_EXPORT = '      "default": "./dist/state-directory.js"\n    }\n'
ARGV_ALIAS = rm.e(rm.CONFIG, "      '@syzygy/polaris-dossier': fileURLToPath(", "      '@syzygy/polaris-dossier/argv': fileURLToPath(new URL('./packages/polaris-dossier/src/argv.ts', import.meta.url)),\n      '@syzygy/polaris-dossier': fileURLToPath(")

def base_rows(fn, res):
    lane = importlib.util.spec_from_file_location('lane614', os.path.join(sys.argv[1], D2D5))
    m = importlib.util.module_from_spec(lane); lane.loader.exec_module(m)
    drafter, _ = m.reviewer_fragments(sys.argv[1])
    SPREAD_WRITE = rm.e(rm.SHA, rm.SRC_TAIL, rm.SRC_TAIL + '[...Object.freeze] = [];\n')
    return [
        ('B0-support-unmutated', [rm.PURITY], [], 'passes'),
        ('B-V7', [rm.PURITY], fn['FN-V7'], 'passes (accepted at base)'),
        ('B-V9', [rm.PURITY], fn['FN-V9'], 'passes'),
        ('B-Y5b', [rm.PURITY], fn['FN-Y5b'], 'passes'),
        ('B-Y5c', [rm.PURITY], fn['FN-Y5c'], 'passes'),
        ('B-R2', [rm.PURITY], res['R2-dynamic-import-with-a-space-of-an-allowed-name'], 'passes'),
        ('B-U4', [rm.PURITY], fn['FN-U4'], 'passes'),
        ('B-U5', [rm.PURITY], fn['FN-U5'], 'passes'),
        ('B-paren-write', [rm.PURITY], [rm.PAREN_WRITE], 'passes'),
        ('B-default-write', [rm.PURITY], [rm.DEFAULT_WRITE], 'killed? (the inner assignment is a property write)'),
        ('B-spread-write', [rm.PURITY], [SPREAD_WRITE], 'passes'),
        ('B-nested-write', [rm.PURITY], [rm.NESTED_WRITE], 'passes'),
        ('B-D2', [rm.DRAFTER_TEST], drafter['D2-drafter-globalThis-bracket-read'], 'passes'),
        ('B-D5', [rm.DRAFTER_TEST], drafter['D5-drafter-WebSocket'], 'passes'),
        ('B-Map', [rm.DRAFTER_TEST], [rm.MAP_ONLY], 'passes'),
        ('B-A4-new-export-without-alias', ['packages/polaris-dossier/src/no-egress.test.ts'],
         [rm.e(rm.DOSSIER_PKG, STATE_EXPORT, STATE_EXPORT[:-1] + ',\n    "./cli": "./dist/cli.js"\n')], 'killed by the S10 alias-map row (refused at base)'),
        ('B-uniform-dotdot-entry', ['packages/polaris-dossier/src/no-egress.test.ts'], [rm.E4_UNIFORM], 'passes (accepted at base)'),
        ('B-E4-the-lane-dotdot-entry', ['packages/polaris-dossier/src/no-egress.test.ts'], [rm.E4], 'killed (refused at base by the unreadable-entry throw)'),
        ('B-correct-alias-for-a-left-out-entry', ['apps/three-surface-poc/src/sync-child-process-guard.test.ts', 'packages/polaris-dossier/src/subpath-imports.test.ts',
          'packages/polaris-generation-core/src/workspace-reach.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts'], [ARGV_ALIAS], 'passes (accepted at base)'),
    ]

if __name__ == '__main__':
    rm.main(base_rows)
