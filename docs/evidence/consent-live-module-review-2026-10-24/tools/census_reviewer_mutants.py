"""Two reviewer mutants of the consent census (R-GP-IMPL-CONSENT-LIVE-MODULE-1), run like run_consent_census_mutants.py.

Usage: python3 -I census_reviewer_mutants.py <tree> <census-before.json> <out.json>
Each mutant: single-occurrence edit, `npx tsc -b packages/polaris-generation-consent`, the census with --against, restore from git, rebuild.
"""
import json, os, subprocess, sys, tempfile

tree, against, out = sys.argv[1:4]
PORTS = 'packages/polaris-generation-consent/src/consent-ports.ts'
IN_FORCE = 'packages/polaris-generation-consent/src/in-force.ts'
REEXPORT = "export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';"
MUTANTS = [
    ('R-C1-consent-ports-wraps-inForceRecords', PORTS, REEXPORT,
     "import { inForceRecords as inForceRecordsImpl } from './in-force.js';\n"
     "export { notInForceRecords, type NotInForce } from './in-force.js';\n"
     "export const inForceRecords: typeof inForceRecordsImpl = (records, now) => inForceRecordsImpl(records, now);",
     'killed', 'consent-ports.ts (so the root) exports a wrapper instead of re-exporting; ./live keeps the in-force object'),
    ('R-C2-NotInForce-shape-widened', IN_FORCE, "export type NotInForce = Dead | 'superseded';",
     "export type NotInForce = Dead | 'superseded' | 'reviewer-extra';",
     'survived', 'the type keeps its name and origin but changes shape: the census compares names and origins, not shapes'),
]
run = lambda cmd: subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
assert run(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip() == '', 'tree not clean'
results = []
for ident, f, old, new, expected, note in MUTANTS:
    path = os.path.join(tree, f)
    text = open(path, encoding='utf8').read()
    assert text.count(old) == 1, (ident, text.count(old))
    open(path, 'w', encoding='utf8').write(text.replace(old, new))
    try:
        build = run(['npx', 'tsc', '-b', 'packages/polaris-generation-consent'])
        with tempfile.TemporaryDirectory() as tmp:
            report = os.path.join(tmp, 'c.json')
            done = run(['node', 'scripts/census_consent_exports.mjs', tree, '--out', report, '--against', against])
            comparison = json.load(open(report))['comparison'] if done.returncode == 0 and os.path.exists(report) else None
    finally:
        run(['git', 'checkout', '--', f])
    outcome = 'errored' if comparison is None else ('survived' if comparison['unchanged'] else 'killed')
    results.append({'id': ident, 'file': f, 'old': old, 'new': new, 'expected': expected, 'outcome': outcome, 'buildExit': build.returncode, 'note': note,
                    'subpathsAdded': None if comparison is None else comparison['subpathsAdded']})
    print(ident, outcome, 'expected', expected, 'buildExit', build.returncode, flush=True)
rebuilt = run(['npx', 'tsc', '-b', 'packages/polaris-generation-consent'])
assert run(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip() == '', 'tree not restored'
json.dump({'commit': run(['git', 'rev-parse', 'HEAD']).stdout.strip(), 'mutants': results, 'restoredBuildExit': rebuilt.returncode}, open(out, 'w'), indent=1)
print('restoredBuildExit', rebuilt.returncode)
