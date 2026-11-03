"""syzygy-bpyt.54: join the sweep's hits (spread_sweep.py, run here) with the hand classification below and write the
evidence record. Usage: python3 build_classification.py <clone> > spread-classification-<commit>.json
It fails unless the classified sites and the sweep's hits are the same set, line for line, with the same multiplicity.

A row's `bounded` is true when the spread array's length has a ceiling under the observed RangeError threshold at
node's default stack (about 125,000-130,000 arguments; `path.resolve` measured ok at 100,000 and RangeError at 130,000
on node v24.6.0). `held: "GP-Q0"` marks an unbounded site whose replacement would turn a crash into an observable
decision, so it is reported to the owner and not changed (bead syzygy-bpyt.54; OWNER-DIRECTION-GREENFIELD-PARITY-
FOLLOWUPS-2026-10-28.md, the row naming this bead)."""
import collections
import json
import os
import re
import subprocess
import sys

root = sys.argv[1]
HERE = os.path.dirname(os.path.abspath(__file__))
sweep = json.loads(subprocess.run([sys.executable, os.path.join(HERE, 'spread_sweep.py'), root], capture_output=True, check=True, text=True).stdout)
commit = subprocess.run(['git', '-C', root, 'rev-parse', 'HEAD'], capture_output=True, check=True, text=True).stdout.strip()

C, S, CEIL, OWN, OS_, BUD = 'code-constant', 'closed-schema-cap', 'response-ceiling', 'tool-own-state', 'os-limit', 'declared-budget'
DOSSIER_RUN_DIR = ('the run directory\'s numbered names, one per command this tool ran (it alone writes names matching the pattern) '
                   '[Inferred: from the writers in polaris-dossier/src]; 125,000 names need 125,000 invocations')
SEGMENTS = ('the pieces of one body: segmentBody cuts at least 80,000 characters per piece but the last (generation-source.ts:264-281), '
            'the redacted cut fills to SOURCE_TEXT_MAX_LENGTH = 100,000 but before a short marker; a V8 string holds at most 536,870,888 '
            'units, so at most 6,712 pieces')
ROWS = {
    # --- shipped: apps/*/src, packages/*/src -------------------------------------------------------------------------------------
    'apps/three-surface-poc/src/fresh-checkout-demo-main.ts:445': (1, True, CEIL, 63_550,
        'distinct exact-source identities linked from the served /polaris page; that page is at most maxHumanResponseBytes = 2,097,152 '
        'bytes or it is a 503 (routes.ts boundedResponse), and each link spends at least 33 bytes (href="/polaris/source?identity=" plus one)'),
    'apps/three-surface-poc/src/polaris-accessibility-main.ts:69': (1, True, C, 6, 'one report per ACCESSIBILITY_VARIANTS entry (six)'),
    'apps/three-surface-poc/src/polaris-accessibility.ts:523': (1, True, C, None,
        'text-bearing elements under the :target of a page rendered from the in-memory fixtures (polaris-accessibility-variants.ts: '
        '"no Butlers repository is read"); fixed by the fixture bytes'),
    'apps/three-surface-poc/src/polaris-accessible-names.ts:336': (1, False, CEIL, None,
        'one served page\'s name and heading violations: up to one per interactive element and heading of a page up to 2,097,152 bytes, '
        'over every exact-source page of the registered repository the machine answer lists; at minimal markup the ceiling admits more '
        'than the threshold, and whether the renderer can emit that many is [Unknown]'),
    'apps/three-surface-poc/src/polaris-accessible-names.ts:338': (1, False, CEIL, None,
        'coverage violations: at most every listed page plus every swept one; the listed pages are 1 + the machine answer\'s '
        'projectShape.sources, which grow with the observed repository\'s manifest (not capped by maxSources, which caps reads) and '
        'are bounded only by maxMachineResponseBytes = 16,777,216'),
    'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts:85': (1, True, S, 40, 'one layer per diagram node; nodes: list(..., 1, 40) in draft-model.ts:29 and draft-schema.ts'),
    'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts:99': (1, True, S, 40, 'one entry per layer, at most one layer per node (40)'),
    'apps/three-surface-poc/src/polaris-generation/diagram-layout.ts:190': (1, True, C, 2, 'shown(label, epistemic, 18, 2) returns at most two lines'),
    'apps/three-surface-poc/src/polaris-generation/dossier-site.ts:272': (1, True, S, 20_000,
        'claims built for one page; every claim is an element of a draft that passed the closed schema [Inferred: render reads only '
        'a checked revision], whose list caps sum to under 20,000 on any page (sections 30 x blocks 30 x 13 per block = 11,700; '
        'diagrams 20 x 120 nodes and edges = 2,400; unresolved 100; inventory terms 2,000; understanding 11 x 100 = 1,100)'),
    'apps/three-surface-poc/src/polaris-generation/repo-corpus.ts:246': (1, True, OS_, 6_712, SEGMENTS),
    'apps/three-surface-poc/src/polaris-generation/repo-corpus.ts:250': (1, True, OS_, 6_712, SEGMENTS),
    'apps/three-surface-poc/src/walkthrough-preflight.ts:312': (1, True, C, 2, 'two indexOf candidates, filtered'),
    'packages/cap1-core/src/drawer.ts:324': (1, True, C, 11, 'secondary reasons are distinct.slice(1) over the closed twelve (facets.ts:112)'),
    'packages/polaris-dossier/src/check.ts:206': (1, False, S, None,
        'every finding deriveFindings reports over a submitted draft, inventory or verdict; the walkers report every fault, e.g. one '
        'duplicate-id per repeated id, and DRAFT_JSON_LIMITS (4 MiB, 500,000 nodes) admit far more than 125,000 repeated {"id":"x"} '
        'objects [Observed: 200,000 of them, 2,200,014 bytes, parse under those limits through parseBoundedJson; that each '
        'repeat yields one finding is Inferred from the walker]'),
    'packages/polaris-dossier/src/check.ts:282': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/clone-head.ts:59': (1, True, C, 2_049, 'segments of a ref read with readSmall(HEAD, MAX_REF_BYTES = 4096)'),
    'packages/polaris-dossier/src/clone-shape.ts:151': (1, True, C, 3, 'the rest parameter of at(); every caller passes one to three literals'),
    'packages/polaris-dossier/src/design-review.ts:44': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/inventory.ts:54': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/inventory.ts:355': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/polaris.ts:426': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/render.ts:245': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/render.ts:321': (1, True, OS_, 6_712, SEGMENTS),
    'packages/polaris-dossier/src/review-model.ts:44': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/review-verdict.ts:15': (1, True, OWN, None, DOSSIER_RUN_DIR),
    'packages/polaris-dossier/src/state-directory.ts:71': (1, True, OS_, 67_584,
        'path components after a rewritten link: the tail of a path that entered as an argv or environment string (Linux '
        'MAX_ARG_STRLEN = 131,072 bytes, so at most 65,536 components) plus one readlink target (PATH_MAX 4,096, 2,048 components). '
        'Margin about 1.5x at the default stack only: the threshold halves at half the stack'),
    'packages/polaris-generation-core/src/closed-schema.ts:36': (1, True, C, None, 'choice() callers pass module-constant enum lists'),
    'packages/polaris-generation-core/src/discovery.ts:283': (2, True, BUD, 40,
        'one group\'s blobs; partitionSubsystems chunks every group at maxGroupBlobs, 40 in both DEFAULT_ and DOSSIER_DISCOVERY_BUDGET'),
    'packages/polaris-generation-core/src/discovery.ts:339': (1, False, None, None,
        'the reduce reply\'s ranked ids, kept up to byId.size = every candidate blob of the corpus, which grows with the observed '
        'repository; the reply is provider (or replayed) output'),
    'packages/polaris-generation-core/src/dossier-profile.ts:202': (1, True, C, 3, 'openQuestions emits at most three questions (purpose, audience, scope)'),
    'packages/polaris-generation-core/src/dossier-profile.ts:218': (1, True, C, 3, 'a slice of the at most three questions'),
    'packages/polaris-generation-core/src/dossier-profile.ts:222': (1, True, C, 3, 'the at most three questions'),
    'packages/three-surface-poc-core/src/resource-ledger.ts:286': (1, True, BUD, 512 + 1 + 5,
        'one entry per path charged a parse pass: the exact reader admits maxSources = 512 reads (git-object-reader.ts:391-396) and '
        'phase A reads the root index plus one index per PillarKey (declaredPillarRoots is keyed by PILLAR_KEYS, five)'),
    'packages/three-surface-poc-core/src/resource-ledger.ts:298': (1, True, BUD, 512 + 1 + 5, 'one entry per charged body, read only through the same two readers'),
    # --- operator scripts: scripts/ -----------------------------------------------------------------------------------------------
    'scripts/derive_generator_sent_text.mjs:142': (1, True, C, None, 'one row per input field name and class of the generator stages'),
    'scripts/differential_line_slot.mjs:287': (1, True, C, None, 'one row per job of the differential\'s own corpus over committed records'),
    'scripts/dossier_scale_measure.mjs:91': (1, True, C, None, 'paths of the synthetic Redis-scale fixture plan() writes (about 1,700 files)'),
    'scripts/dossier_scale_measure.mjs:94': (1, True, C, None, 'sizes of the same synthetic files'),
    'scripts/measure_consent_gate_recognition.mjs:185': (1, True, OWN, None, 'one timing per read: 1 + 3 x the non-blank lines of one tracked act record of this repository'),
    'scripts/measure_decisions_sweep.mjs:67': (2, True, C, None, 'one sample per role per round of a fixed round count'),
    'scripts/measure_decisions_sweep.mjs:84': (2, True, C, None, 'the same samples'),
    'scripts/measure_decisions_sweep.mjs:85': (1, True, C, None, 'the same samples'),
    'scripts/measure_decisions_sweep.mjs:86': (1, True, C, None, 'two load readings per sample'),
    'scripts/measure_line_slot_reads.mjs:64': (1, True, C, 20, 'twenty timed reads'),
    'scripts/measure_line_slot_reads.mjs:87': (1, True, C, 5, 'five timed reads'),
    'scripts/measure_line_slot_reads.mjs:101': (1, True, C, 3, 'three timed reads'),
    'scripts/measure_line_slot_reads.mjs:125': (1, True, C, 20, 'the twenty timed reads'),
    'scripts/measure_line_slot_reads.mjs:127': (1, True, C, 20, 'the twenty timed reads'),
    'scripts/measure_line_slot_reads.mjs:132': (1, True, C, None, 'one row per template case of a fixed case list'),
    'scripts/measure_line_slot_reads.mjs:133': (2, True, C, None, 'the same rows'),
    'scripts/measure_line_slot_reads.mjs:139': (1, True, C, 20, 'the twenty timed reads'),
}
GP_Q0 = {
    'apps/three-surface-poc/src/polaris-accessible-names.ts:336': 'the PWB-REQ-016 sweep exits 0 only when every listed page is served with zero violations; a loop turns the crash into that exit code and evidence record',
    'apps/three-surface-poc/src/polaris-accessible-names.ts:338': 'the same exit code and record, through the coverage arm',
    'packages/polaris-dossier/src/check.ts:206': 'the line sits outside the try around deriveFindings, so the RangeError escapes `syzygy dossier check`; a loop turns it into a recorded check result refusing the submission, and its exit code',
    'packages/polaris-generation-core/src/discovery.ts:339': 'the RangeError is not a DiscoveryRefusal, so dossier-trigger.ts:165-166 rethrows it; a loop turns it into a model-reduce selection of which sources go to the generation provider (an egress decision)',
}
counts = collections.Counter(f"{h['path']}:{h['line']}" for h in sweep['hits'])
assert set(counts) == set(ROWS), (sorted(set(counts) - set(ROWS)), sorted(set(ROWS) - set(counts)))
assert all(counts[k] == ROWS[k][0] for k in ROWS), [k for k in ROWS if counts[k] != ROWS[k][0]]
assert all(not ROWS[k][1] for k in GP_Q0) and all(k in GP_Q0 for k in ROWS if not ROWS[k][1])
text = {f"{h['path']}:{h['line']}": h['text'] for h in sweep['hits']}
sites = []
for key, (calls, bounded, source, ceiling, why) in ROWS.items():
    row = {'site': key, 'calls': calls, 'shipped': not key.startswith('scripts/'), 'text': text[key], 'bounded': bounded,
           'boundClass': source if bounded else 'unbounded', 'ceiling': ceiling, 'bound': why}
    row['disposition'] = 'held: GP-Q0' if key in GP_Q0 else 'unchanged: bounded'
    if key in GP_Q0: row['whyHeld'] = GP_Q0[key]
    sites.append(row)
src = open(os.path.join(HERE, 'spread_sweep.py'), encoding='utf-8').read()
regex = {name: re.search(name + r" = re\.compile\((r'.*?')\)\n", src).group(1) for name in ('SECOND', 'THIRD')}
shipped = [s for s in sites if s['shipped']]
def tally(rows): return {'lines': len(rows), 'calls': sum(r['calls'] for r in rows), 'boundedLines': sum(r['bounded'] for r in rows),
                         'unboundedLines': sum(not r['bounded'] for r in rows), 'fixed': 0, 'heldGpQ0': sum(r['disposition'] == 'held: GP-Q0' for r in rows)}
print(json.dumps({
    'subject': 'argument-spread calls (one call handed a whole array as arguments) in tracked implementation code',
    'bead': 'syzygy-bpyt.54', 'commit': commit, 'tool': 'docs/evidence/syzygy-bpyt-54/spread_sweep.py',
    'toolSha256': __import__('hashlib').sha256(src.encode()).hexdigest(),
    'population': sweep['population'],
    'methods': {'structural': 'spread_sweep.py method 1 (bracket tracker over comment- and string-stripped code, rest parameters dropped)',
                'literalRegex': regex['SECOND'], 'rawCallRegex': regex['THIRD']},
    'agreement': {k: sweep[k] for k in ('structuralHits', 'structuralLines', 'literalLines', 'literalLinesMissedByStructural', 'rawCallLines',
                                        'rawCallLinesNotStructural', 'structuralLinesNotRawCall')},
    'carriedElsewhere': 'syzygy-bpyt.1.18\'s two sites (markdown-code-context.ts, project-shape-extraction.ts) are loops at this commit and not hits',
    'threshold': 'RangeError past about 125,000 arguments at node v24.6.0\'s default stack (path.resolve: 100,000 ok, 130,000 RangeError)',
    'totals': {'all': tally(sites), 'shipped': tally(shipped), 'scripts': tally([s for s in sites if not s['shipped']])},
    'sites': sites,
}, indent=1, ensure_ascii=False))
