"""rev-521 phase 2: are OR1/OR2 (which survive argv.test.ts) killed by any CI suite, and does a drift between a caller's spec and
argv.test.ts's copy go unseen in CI (D1-D3)? Usage: build_phase2.py <tree> <tools-dir> <tmp> <out.json>"""
import json, os, sys
tree, tools, tmp, out = sys.argv[1:5]
CORPUS = f'{tree}/docs/evidence/dossier-cli-table-review-2026-10-24/corpus/dossier.json'
RUN = f'{tree}/docs/evidence/dossier-cli-table-review-2026-10-24/tools/dossier_run.mjs'
BASE = '54983601a3d783ee442719858e6e1d5fecad9f6589c170d71969b7a4e1a4762b'
PROJECT = f'npx tsc -b packages/polaris-dossier apps/syzygy; TMPDIR={tmp} CI=1 npx vitest run --project @syzygy/polaris-dossier'
DAEMON = (f'npx tsc -b packages/polaris-dossier apps/syzygy && TMPDIR={tmp} CI=1 npx vitest run --config packages/cap1-system/vitest.config.ts '
          'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts')
def golden(mid):
    return (f'npx tsc -b packages/polaris-dossier apps/syzygy; b=$?; mkdir -p {tmp}/cwd-{mid} && cd {tmp}/cwd-{mid} && TMPDIR={tmp} node {RUN} {tree} {CORPUS} {tmp}/{mid}.jsonl '
            f'&& d=$(sha256sum < {tmp}/{mid}.jsonl | cut -c1-64) && echo "golden sha256 $d build $b" && test "$d" = {BASE}')
ARGV_TS = 'packages/polaris-dossier/src/argv.ts'
OR1 = (ARGV_TS,
       "      if (spec.repeat === 'refuse' && values.has(arg)) return { fault: 'repeated', arg };\n      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };\n",
       "      if (token.value === undefined || (spec.dashValue === 'refuse' && token.value.startsWith('-'))) return { fault: 'missing-value', arg };\n      if (spec.repeat === 'refuse' && values.has(arg)) return { fault: 'repeated', arg };\n")
OR2 = (ARGV_TS, 'if (token.value === undefined ||', 'if (!token.value ||')
D1 = ('packages/polaris-dossier/src/polaris.ts', "'-h'], dashValue: 'take', repeat: 'last', positionals: true,", "'-h'], dashValue: 'take', repeat: 'refuse', positionals: true,")
D2 = ('apps/syzygy/src/main.ts', "    repeat: 'last',\n    positionals: false,\n", "    repeat: 'refuse',\n    positionals: false,\n")
D3 = ('packages/polaris-dossier/src/cli.ts', "{ valued: shape.options, dashValue: 'refuse',", "{ valued: shape.options, dashValue: 'take',")
plan = [('C0-daemon', None, DAEMON), ('OR1-project', OR1, PROJECT), ('OR1-golden', OR1, golden('OR1-golden')),
        ('OR2-project', OR2, PROJECT), ('OR2-golden', OR2, golden('OR2-golden')), ('OR2-daemon', OR2, DAEMON),
        ('D1-polaris-repeat-refused-project', D1, PROJECT), ('D2-daemon-repeat-refused-project', D2, PROJECT), ('D2-daemon-repeat-refused-daemon', D2, DAEMON),
        ('D3-dossier-dash-value-taken-project', D3, PROJECT), ('D3-dossier-dash-value-taken-golden', D3, golden('D3-golden')),
        ('C1-rebuilt-head-golden', None, golden('C1-golden'))]
ms = []
for mid, edit, cmd in plan:
    ms.append({'id': mid, 'control': edit is None, 'edits': [] if edit is None else [{'file': edit[0], 'old': edit[1], 'new': edit[2]}], 'command': cmd})
json.dump(ms, open(out, 'w'), indent=1)
print(len(ms))
