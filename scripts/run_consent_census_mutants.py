#!/usr/bin/env python3
"""Rule-6 mutants of the consent export census comparison (syzygy-bpyt.8.19). Evidence tool, not a check and not authority.

usage: python3 -I scripts/run_consent_census_mutants.py TREE --against EARLIER.json --out OUT.json

TREE must be a clean checkout with `npm ci` run. For the unmutated tree first (M0) and then for each mutant below, the script applies
the mutant's edits (each `old` must occur exactly once in its file when it is applied), runs `npx tsc -b packages/polaris-generation-consent`
in TREE (its exit code is recorded; a type error still emits), runs `node scripts/census_consent_exports.mjs TREE --out <tmp> --against
EARLIER.json`, records the comparison, and restores every file from git and rebuilds. A mutant is killed when the comparison's
`unchanged` is false, survived when it is true, and errored when the census does not run. OUT.json names the commit, the sha256 of the
census script and of each mutated file as committed, the command, and per mutant its edits, the expected outcome, the outcome, the
comparison and the wall time. It writes only OUT.json, the mutated files while a mutant runs, and the package's `dist/`."""
import datetime, hashlib, json, os, subprocess, sys, tempfile, time

SCRIPT = 'scripts/run_consent_census_mutants.py'
CENSUS = 'scripts/census_consent_exports.mjs'
PKG = 'packages/polaris-generation-consent'
PORTS, INDEX, LIVE, MANIFEST = f'{PKG}/src/consent-ports.ts', f'{PKG}/src/index.ts', f'{PKG}/src/live.ts', f'{PKG}/package.json'
REEXPORT = "export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';"
ROOT_PORTS = "export { UNCONSENTED, createConsentPorts, inForceRecords, notInForceRecords, withConsent, type NotInForce, "
LIVE_IN_FORCE = "export { inForceRecords, notInForceRecords, type NotInForce } from './in-force.js';\n"
LIVE_RECORDER = "export { SLOT, recorderTemplate, templateFields, type RecorderTemplate } from './recorder-template.js';\n"
MUTANTS = [
    ('M0-unmutated', [], 'survived', 'the tree as committed: the census must read unchanged'),
    ('C1-type-dropped-from-consent-ports', [(PORTS, REEXPORT, REEXPORT.replace(', type NotInForce', '')), (INDEX, ROOT_PORTS, ROOT_PORTS.replace('type NotInForce, ', ''))],
     'killed', 'consent-ports.ts and the root stop exporting the type NotInForce'),
    ('C2-value-dropped-from-consent-ports', [(PORTS, REEXPORT, REEXPORT.replace('inForceRecords, notInForceRecords', 'notInForceRecords')), (INDEX, ROOT_PORTS, ROOT_PORTS.replace('inForceRecords, notInForceRecords', 'notInForceRecords'))],
     'killed', 'consent-ports.ts and the root stop exporting the value inForceRecords'),
    ('C3-name-added-to-consent-ports', [(PORTS, REEXPORT, f'{REEXPORT}\nexport const EXTRA = 1;')], 'killed', 'consent-ports.ts exports one name more'),
    ('C4-live-exports-a-non-root-name', [(LIVE, LIVE_IN_FORCE, LIVE_IN_FORCE.replace('{ inForceRecords', '{ ref, inForceRecords'))], 'killed', './live exports `ref`, which the root does not'),
    ('C5-live-value-is-not-the-root-object', [(LIVE, LIVE_IN_FORCE, LIVE_IN_FORCE.replace('inForceRecords, ', '') + "import { inForceRecords as inForce } from './in-force.js';\nexport const inForceRecords: typeof inForce = (records, now) => inForce(records, now);\n")],
     'killed', './live exports a wrapper under the root value name inForceRecords'),
    ('C6-live-type-is-not-the-root-declaration', [(LIVE, LIVE_RECORDER, LIVE_RECORDER.replace(', type RecorderTemplate', '') + 'export type RecorderTemplate = string;\n')],
     'killed', './live declares its own type under the root type name RecorderTemplate'),
    ('C7-subpath-removed', [(MANIFEST, '    "./testing": {\n      "types": "./dist/testing.d.ts",\n      "import": "./dist/testing.js",\n      "default": "./dist/testing.js"\n    }\n', ''),
                             (MANIFEST, '      "default": "./dist/live.js"\n    },\n', '      "default": "./dist/live.js"\n    }\n')],
     'killed', 'the package stops exporting ./testing'),
]

args = sys.argv[1:]
if len(args) != 5 or args[1] != '--against' or args[3] != '--out': sys.exit(__doc__.split('\n\n')[1])
tree, against, out_path = os.path.abspath(args[0]), os.path.abspath(args[2]), args[4]
sha = lambda b: hashlib.sha256(b).hexdigest()
def run(cmd): return subprocess.run(cmd, cwd=tree, capture_output=True, text=True)
def at_head(path): return subprocess.run(['git', 'show', f'HEAD:{path}'], cwd=tree, capture_output=True, check=True).stdout
def clean(): return run(['git', 'status', '--porcelain', '--untracked-files=no']).stdout.strip() == ''
if not clean(): sys.exit('tree not clean')
BUILD = ['npx', 'tsc', '-b', PKG]

def census():
    with tempfile.TemporaryDirectory() as tmp:
        report = os.path.join(tmp, 'census.json')
        done = run(['node', os.path.join(tree, CENSUS), tree, '--out', report, '--against', against])
        if done.returncode != 0 or not os.path.exists(report): return None, (done.stderr.strip().split('\n') or [''])[-1]
        return json.load(open(report, encoding='utf8')), None

files = sorted({f for _, edits, _, _ in MUTANTS for f, _, _ in edits})
out = {
    'schema': 'consent-census-rule6/1', 'bead': 'syzygy-bpyt.8.19',
    'text': 'Evidence record, not authority: rule-6 mutants of the consent export census comparison. Generated by the script named here; do not edit.',
    'script': {'path': SCRIPT, 'sha256': sha(at_head(SCRIPT))}, 'census': {'path': CENSUS, 'sha256': sha(at_head(CENSUS))},
    'subject': {'commit': run(['git', 'rev-parse', 'HEAD']).stdout.strip(), 'fileSha256': {f: sha(at_head(f)) for f in files}},
    'against': {'path': os.path.basename(against), 'sha256': sha(open(against, 'rb').read())},
    'command': ' '.join(BUILD) + f' && node {CENSUS} <tree> --out <tmp> --against <earlier>',
    'ranAt': datetime.datetime.now(datetime.timezone.utc).isoformat(timespec='seconds'), 'mutants': [],
}
for ident, edits, expected, note in MUTANTS:
    started = time.monotonic()
    try:
        for f, old, new in edits:
            path = os.path.join(tree, f)
            text = open(path, encoding='utf8').read()
            if text.count(old) != 1: sys.exit(f'{ident}: `old` occurs {text.count(old)} times in {f}')
            open(path, 'w', encoding='utf8').write(text.replace(old, new))
        build = run(BUILD)
        document, error = census()
    finally:
        for f in sorted({f for f, _, _ in edits}): run(['git', 'checkout', '--', f])
    comparison = None if document is None else document['comparison']
    outcome = 'errored' if comparison is None else 'survived' if comparison['unchanged'] else 'killed'
    out['mutants'].append({'id': ident, 'edits': [{'file': f, 'old': old, 'new': new} for f, old, new in edits], 'expected': expected, 'outcome': outcome,
                           'note': note, 'buildExit': build.returncode, 'censusError': error, 'comparison': comparison, 'wallSeconds': round(time.monotonic() - started, 1)})
    print(ident, outcome, flush=True)
rebuilt = run(BUILD)
if not clean(): sys.exit('tree not restored')
out['restoredBuildExit'] = rebuilt.returncode
out['totals'] = {'mutants': len(out['mutants']), 'asExpected': sum(m['outcome'] == m['expected'] for m in out['mutants'])}
with open(out_path, 'w', encoding='utf8') as f: f.write(json.dumps(out, indent=1) + '\n')
print('totals', out['totals'])
sys.exit(0 if out['totals']['asExpected'] == len(MUTANTS) and rebuilt.returncode == 0 else 1)
