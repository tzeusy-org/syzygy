#!/usr/bin/env python3
"""Reviewer rule-6 mutants for PR 557 (R-GP-IMPL-SEGMENT-RULES-1), run through the lane's own runner.

Usage: rev_mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present> [mine|lane|both]

Each vitest run's failing assertions (first 400 characters of each failure message) go to <out.json>.messages.json, by row id,
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
APP = cfg[cfg.rindex('      {\n', 0, cfg.index("name: '@syzygy/three-surface-poc-app'")):cfg.rindex('    ],\n')]
def hook(target, shorthand):
    body = 'resolve: { alias }' if shorthand else "resolve: { alias: { '@syzygy/support': " + target + ' } }'
    pre = "const alias = { '@syzygy/support': " + target + ' };\n\n' if shorthand else ''
    return pre + "export default defineConfig({\n  plugins: [{ name: 'alias-by-hook', config: () => ({ " + body + ' }) }],\n'

lane.ROWS = [
    ('RX0-entries-unmutated', TEST, [], []),
    # Percent-decoding weakened: the refused rule no longer reads %2e, so an encoded '.' or '..' reads as an empty segment.
    ('RX1-refused-rule-drops-encoded-dot', TEST, [edit(KIT, ref, ref.replace('((\\.|%2e)(\\.|%2e)?|', '((\\.)(\\.)?|'))],
     [case('./dist/%2e%2e/index.js', 'refuses'), case('./dist/%2E/index.js', 'refuses')]),
    # Case folding weakened in the other copy than E8's: the invalid rule loses /i.
    ('RX2-invalid-rule-case-sensitive', TEST, [edit(KIT, inv, inv.replace('/i;', '/;'))],
     [case('./dist/NODE_MODULES/index.js', 'refuses'), case('./dist/%2E/index.js', 'refuses')]),
    # Percent-decoding of an encoded capital N dropped from both copies: no case row writes %4E, so only the pin tool sees it.
    ('RX3-both-rules-drop-encoded-capital-n', TEST, [edit(KIT, inv, inv.replace('(n|%6e|%4e)', '(n|%6e)')), edit(KIT, ref, ref.replace('(n|%6e|%4e)', '(n|%6e)'))], []),
    ('RX3T-same-under-the-pin-tool', 'tool', [edit(KIT, inv, inv.replace('(n|%6e|%4e)', '(n|%6e)')), edit(KIT, ref, ref.replace('(n|%6e|%4e)', '(n|%6e)'))], 1),
    # Percent-decoding weakened in the refused copy only: %6e no longer read, so %6eode_modules reads as an empty segment.
    ('RX5-refused-rule-drops-encoded-n', TEST, [edit(KIT, ref, ref.replace('(n|%6e|%4e)', '(n|%4e)'))],
     [case('./dist/%6eode_modules/index.js', 'refuses')]),
    # require dropped from the conditions Node reads: no row names a require target.
    ('RX4-require-not-a-node-condition', TEST, [edit(KIT, "'node', 'import', 'require',", "'node', 'import',")], []),
    # The refused rule applied to the whole target, './' included.
    ('RX6-refused-rule-reads-the-leading-dot', TEST,
     [edit(KIT, ": REFUSED_SEGMENT.test(target.replace(/^\\.\\//u, ''))", ': REFUSED_SEGMENT.test(target)')], [case('./dist//index.js', 'warns')]),
    # The plugin residual: an alias set by a plugin's config hook, in shorthand.
    ('RP1-plugin-hook-shorthand-right-target', [GUARD, TEST], [edit(CONFIG, lane.CONFIG_HEAD, hook(RIGHT, True))], []),
    ('RP1W-plugin-hook-shorthand-wrong-target', [GUARD, TEST], [edit(CONFIG, lane.CONFIG_HEAD, hook(WRONG, True))], [lane.LOAD_ROW]),
    # The same hook written with an 'alias:' key in the config text: #549's text check refuses it.
    ('RP2-plugin-hook-inline-right-target', [GUARD, TEST], [edit(CONFIG, lane.CONFIG_HEAD, hook(RIGHT, False))], [SHORT_TOOLS]),
    # RP1 and RP1W name the plugin inline, and its `name:` key is counted as a project by the guard's text parser. RP3 and RP3W
    # import the plugin from a module of its own, as a plugin from a package would be, so the config text names neither key.
    ('RP3-imported-plugin-hook-right-target', [GUARD, TEST], [edit(PLUGIN, None, plugin(RIGHT)), edit(CONFIG, IMPORTS, IMPORTS + "import aliasPlugin from './vitest-alias-plugin.ts';\n"), edit(CONFIG, lane.CONFIG_HEAD, lane.CONFIG_HEAD + '  plugins: [aliasPlugin],\n')], []),
    ('RP3W-imported-plugin-hook-wrong-target', [GUARD, TEST], [edit(PLUGIN, None, plugin(WRONG)), edit(CONFIG, IMPORTS, IMPORTS + "import aliasPlugin from './vitest-alias-plugin.ts';\n"), edit(CONFIG, lane.CONFIG_HEAD, lane.CONFIG_HEAD + '  plugins: [aliasPlugin],\n')], [lane.LOAD_ROW]),
    # The config row's anchor paths: moving the POC app project, which holds the only globalSetup, to the front of the list (a
    # reorder Vitest does not care about) leaves no test.globalSetup at index 8.
    ('RX7-projects-reordered', GUARD, [edit(CONFIG, APP + '    ],\n', '    ],\n'), edit(CONFIG, '    projects: [\n', '    projects: [\n' + APP)], [lane.CONFIG_ROW]),
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
            messages[order[len(messages)]] = [[t['name'], t['message']] for t in res.get('failedTests', [])] + [['file', m] for m in res.get('fileMessages', [])]
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
