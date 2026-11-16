#!/usr/bin/env python3
"""Round-2 copy of rev-557/tools/rev_mutants.py, rows replaced. Reviewer rule-6 mutants for PR 557 (R-GP-IMPL-SEGMENT-RULES-2), run through the lane's own runner.

Usage: rev_mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present> [mine|lane|both]

Each vitest run's failing assertions (keyed '<run index>:<row id>', since lane and reviewer rows share the ids RX3, RX4 and RX7) (first 400 characters of each failure message) go to <out.json>.messages.json, by row id,
so a kill can be read as an assertion rather than a timeout.

Loads the clone's docs/evidence/syzygy-bpyt-70/tools/mutants.py unedited, replaces its ROWS with the rows below (each expected
failing set written before the run) and calls its main(). Edits are {path, old, new}, applied and restored by the lane's tools.
"""
import importlib.util
import os
import sys

clone = sys.argv[1]
spec = importlib.util.spec_from_file_location('lane70', os.path.join(clone, 'docs/evidence/syzygy-bpyt-70/tools/mutants.py'))
lane = importlib.util.module_from_spec(spec)
spec.loader.exec_module(lane)
edit, case = lane.edit, lane.case
KIT, TEST, GUARD, CONFIG = lane.REACH_KIT, lane.REACH_TEST, lane.GUARD, lane.CONFIG
kit = open(os.path.join(clone, KIT)).read().split('\n')
inv = next(l for l in kit if l.startswith('export const INVALID_SEGMENT = ')) + '\n'
ref = next(l for l in kit if l.startswith('export const REFUSED_SEGMENT = ')) + '\n'
RPC = lane.RPC
SHORT_TOOLS = RPC + 'runs only short local tools synchronously in a suite test file or any module it imports'
RIGHT = "fileURLToPath(new URL('./packages/support/src/index.ts', import.meta.url))"
WRONG = "'/nonexistent/support/index.ts'"
PLUGIN = 'vitest-alias-plugin.ts'
IMPORTS = "import { defineConfig } from 'vitest/config';\n"
def plugin(target):
    return ("import { fileURLToPath } from 'node:url';\n\nconst alias = { '@syzygy/support': " + target + " };\n\n"
            "export default { name: 'alias-by-hook', config: () => ({ resolve: { alias } }) };\n")
cfg = open(os.path.join(clone, CONFIG)).read()
GS = next(l for l in cfg.split('\n') if 'globalSetup' in l) + '\n'
APP = cfg[cfg.rindex('      {\n', 0, cfg.index("name: '@syzygy/three-surface-poc-app'")):cfg.rindex('    ],\n')]
def hook(target, shorthand):
    body = 'resolve: { alias }' if shorthand else "resolve: { alias: { '@syzygy/support': " + target + ' } }'
    pre = "const alias = { '@syzygy/support': " + target + ' };\n\n' if shorthand else ''
    return pre + "export default defineConfig({\n  plugins: [{ name: 'alias-by-hook', config: () => ({ " + body + ' }) }],\n'

lane.ROWS = [
    ('RX0-entries-unmutated', TEST, [], []),
    # Round 1's RX3 and RX4, which survived the suite at 9fd03a8e: each must now fail the row round 2 added for it.
    ('RX3-both-rules-drop-encoded-capital-n', TEST, [edit(KIT, inv, inv.replace('(n|%6e|%4e)', '(n|%6e)')), edit(KIT, ref, ref.replace('(n|%6e|%4e)', '(n|%6e)'))],
     [case('./dist/%4Eode_modules/index.js', 'refuses')]),
    ('RX4-require-not-a-node-condition', TEST, [edit(KIT, "'node', 'import', 'require',", "'node', 'import',")], [lane.UNREAD_ROW]),
    # The condition-key check: its depth prefix dropped from the message, and its predicate widened to '/..'.
    ('RK4-key-message-drops-the-path', TEST, [edit(KIT, "${conditions.map((condition) => `${condition} > `).join('')}condition key", 'condition key')], [lane.KEY_ROW]),
    ('RK5-key-predicate-widened', TEST, [edit(KIT, ".filter(([, key]) => key.includes('/../'))", ".filter(([, key]) => key.includes('/..'))")], [lane.KEY_ROW]),
    # The key fault ranked first: no row combines a key fault with a target fault, so I expect it to survive.
    ('RK3-key-fault-ranked-first', TEST, [edit(KIT, '    rank: 2,\n', '    rank: -1,\n')], []),
    # The key walk skips arrays: the resolver refuses an array entry as unreadable anyway, so I expect it to survive.
    ('RK2-key-walk-skips-arrays', TEST, [edit(KIT, '  if (Array.isArray(entry)) return entry.flatMap((fallback) => conditionKeysOf(fallback, conditions));\n', '  if (Array.isArray(entry)) return [];\n')], []),
    # Round 1's RX7: the POC app project moved to the front of test.projects. Round 1 expected the config row to fail; it must now pass.
    ('RX7-projects-reordered', GUARD, [edit(CONFIG, APP + '    ],\n', '    ],\n'), edit(CONFIG, '    projects: [\n', '    projects: [\n' + APP)], []),
    # The globalSetup removed from the config entirely: the any-project assertion must fail the config row.
    ('RX8-global-setup-removed', GUARD, [edit(CONFIG, GS, '')], [lane.CONFIG_ROW]),
]
which = sys.argv[5] if len(sys.argv) > 5 else 'mine'
MINE = lane.ROWS
spec2 = importlib.util.spec_from_file_location('lane70b', os.path.join(clone, 'docs/evidence/syzygy-bpyt-70/tools/mutants.py'))
fresh = importlib.util.module_from_spec(spec2)
spec2.loader.exec_module(fresh)
lane.ROWS = {'mine': MINE, 'lane': fresh.ROWS, 'both': [*fresh.ROWS, *MINE], 'plugin': [r for r in MINE if r[0].startswith('RP3')], 'reorder': [r for r in MINE if r[0].startswith('RX7')]}[which]
messages, order = {}, [rid for rid, test, _, _ in lane.ROWS if test != 'tool']
original_load = lane.load
def load(clone_, path, name):
    module = original_load(clone_, path, name)
    if name == 'lane614':
        run = module.run
        def recorded(*args):
            res = run(*args)
            messages[f'{len(messages):02d}:{order[len(messages)]}'] = [[t['name'], t['message']] for t in res.get('failedTests', [])] + [['file', m] for m in res.get('fileMessages', [])]
            return res
        module.run = recorded
    return module
lane.load = load
sys.argv = [sys.argv[0], *sys.argv[1:5]]
try:
    lane.main()
finally:
    import json
    json.dump(messages, open(sys.argv[2] + '.messages.json', 'w'), indent=1)
