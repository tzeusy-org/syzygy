#!/usr/bin/env python3
"""Builds docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-addendum-2026-10-29.json for syzygy-bpyt.55.

Usage: build-addendum.py <repo root>
Reads, from the repo root: the prior record dc3-fence-rules-2026-10-25.json, its tracked fence-probe-output.json (neither is edited),
this bead's two fence-probe runs (BASE and HEAD, from docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs), the differential output and the
rule-6 mutant outputs. Every figure in the addendum is computed from those files; nothing is typed in but the prose.
"""
import hashlib
import json
import subprocess
import sys

ROOT = sys.argv[1]
E55 = 'docs/evidence/syzygy-bpyt-55/'
E63 = 'docs/evidence/syzygy-bpyt-6-3/'
OUT = E63 + 'dc3-fence-rules-addendum-2026-10-29.json'


def read(path):
    with open(f'{ROOT}/{path}', 'rb') as handle:
        return handle.read()


def sha(path):
    return hashlib.sha256(read(path)).hexdigest()


def load(path):
    return json.loads(read(path))


def git(*args):
    return subprocess.run(['git', '-C', ROOT, *args], capture_output=True, text=True, check=True).stdout.strip()


prior = load(E63 + 'dc3-fence-rules-2026-10-25.json')
tracked = load(E63 + 'fence-probe-output.json')
before = load(E55 + 'fence-probe-output-base.json')
after = load(E55 + 'fence-probe-output-head.json')
diff = load(E55 + 'fence-differential-output.json')
mut = load(E55 + 'fence-mutants-output.json')
selftest = load(E55 + 'fence-differential-selftest-output.json')

# The well-formed fence-only cases: the 25 LF cases that no inline span touches (the prior record's denominator).
spanful = {'backtick-indent4', 'backtick-tab', 'two-backticks', 'blockquote'}
lf_cases = lambda out: [c for c in out['cases'] if c['eol'] == 'LF' and c['profileOnTheWholeCase'] == 'well-formed']
fence_only = lambda out: [c for c in lf_cases(out) if c['caseId'] not in spanful]
span_cases = lambda out: [c for c in lf_cases(out) if c['caseId'] in spanful]
differs = lambda cases, reader: sorted(c['caseId'] for c in cases if c['vectors'][reader] != c['vectors']['profile'])

denominators = {'fenceOnly': len(fence_only(after)), 'withAnInlineSpan': len(span_cases(after))}
assert denominators == {'fenceOnly': 25, 'withAnInlineSpan': 4}, denominators
assert len(fence_only(before)) == 25 and len(span_cases(before)) == 4


def reader_state(out):
    return {
        'fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile': {r: differs(fence_only(out), r) for r in ('links', 'extraction', 'consent', 'renderer')},
        'spanCasesWhereTheReaderDisagreesWithTheProfile': {r: differs(span_cases(out), r) for r in ('links', 'extraction', 'consent', 'renderer')},
        'singleLineSpanRowsWhereTheLinkReaderDisagrees': [c['id'] for c in out['inlineSpanCases'] if c['agree'] is False],
    }


b, a = reader_state(before), reader_state(after)
# the profile's own vectors and the active-content vectors must not move
profile_moved = [c['id'] for c in before['cases'] if c['vectors']['profile'] != next(x for x in after['cases'] if x['id'] == c['id'])['vectors']['profile']]
gate_moved = [c['id'] for c in before['cases'] if c['activeContent'] != next(x for x in after['cases'] if x['id'] == c['id'])['activeContent']]
whole_case_moved = [c['id'] for c in before['cases'] if (c['profileOnTheWholeCase'], c['profileFences'], c['profileInlineSpans']) != (lambda x: (x['profileOnTheWholeCase'], x['profileFences'], x['profileInlineSpans']))(next(x for x in after['cases'] if x['id'] == c['id']))]
consent_renderer_moved = [c['id'] for c in before['cases'] if any(c['vectors'][r] != next(x for x in after['cases'] if x['id'] == c['id'])['vectors'][r] for r in ('consent', 'renderer'))]
assert not profile_moved and not gate_moved and not whole_case_moved and not consent_renderer_moved, (profile_moved, gate_moved, whole_case_moved, consent_renderer_moved)

stale = [c['id'] for c in tracked['cases'] if c != next(x for x in before['cases'] if x['id'] == c['id'])]

mutants = [r for r in mut['rows'] if not r['id'].startswith(('CONTROL', 'BASE'))]
base_row = next(r for r in mut['rows'] if r['id'].startswith('BASE'))
checks = diff['checks']
shapes = {}
for c in diff['constructs']:
    cell = c['renderings']
    row = {'rowsPerRendering': cell['lf']['rows'], 'linksNewlyHiddenLf': cell['lf']['links']['newlyHidden'], 'linksNewlyShownLf': cell['lf']['links']['newlyShown'], 'headingsNewlyHiddenLf': cell['lf']['extraction']['newlyHidden'], 'headingsNewlyShownLf': cell['lf']['extraction']['newlyShown']}
    if any(v for k, v in row.items() if k != 'rowsPerRendering'):
        shapes[c['id']] = row

result = {
    'bead': 'syzygy-bpyt.55',
    'finding': 'Addendum to docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json (DC-3, the fence-rule finding). That record, its fence-probe-output.json and its mutant record are not edited; they describe the state before this change. This addendum records what the owner ruling of 2026-10-28 moved: the extractor, the index-link reader and the root-index reader now recognize fences by the PWB-REQ-006 profile, the link reader alone also its code spans, and G2 and G3 are fixed.',
    'authority': {
        'ruling': '.syzygy/governance/decisions/OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md, section Q2, answer C',
        'whatTheOwnerChose': 'The extractor, the index-link reader and the root-index reader recognize fences by the PWB-REQ-006 profile; the link reader alone also recognizes the profile code spans; they use the profile recognizer, never its mask.',
        'whatTheOwnerDidNotChoose': 'C, and signal the stray span. Under plain C, two stray single backticks around a list of links make those links a span, and they drop with no signal.',
        'gateRule': 'GP-Q0: a change to what a gate accepts or refuses needs the owner; the mask, the policy action and scanActiveContent are unchanged (see differential.gate).',
    },
    'priorRecord': {
        'path': E63 + 'dc3-fence-rules-2026-10-25.json',
        'sha256': sha(E63 + 'dc3-fence-rules-2026-10-25.json'),
        'trackedProbeOutput': {'path': E63 + 'fence-probe-output.json', 'sha256': sha(E63 + 'fence-probe-output.json')},
        'trackedProbeOutputIsStaleAgainstBase': {
            'note': 'The tracked probe output predates syzygy-bpyt.16 (the CRLF mask): re-run at the base commit it differs in the cases listed. It is left as it is; the before column below is the base re-run.',
            'casesThatDiffer': len(stale),
            'cases': stale,
        },
    },
    'subject': {
        'baseCommit': git('rev-parse', 'eb6183b5'),
        'codeCommit': git('rev-parse', '7a7cf664'),
        'testRepairCommit': git('rev-parse', '3747f846'),
        'note': 'The code commit holds every non-test source change; the test repair commit changes one test file only. Evidence commits after them change no code.',
    },
    'readersAfter': {
        'profile': {
            'file': 'packages/three-surface-poc-core/src/markdown-code-context.ts',
            'change': 'recognizeCodeContexts exposes the fence ranges, the span ranges and the first malformation beside the mask; maskMarkdownCodeContexts is built from those ranges. The mask is byte-identical to the base on every text of the differential.',
            'recovery': 'The recognizer is total: an unclosed fence runs to the end of the text, a backtick opener whose info string holds a backtick still opens a fence, and a span still open at a fence opener or at the end of the text is dropped. The first malformation in scan order is reported. A caller handed a text with malformed set treats it as excluded (the gate does) and never acts on the ranges.',
        },
        'extraction': {
            'file': 'packages/three-surface-poc-core/src/project-shape-extraction.ts',
            'before': prior['readers'][1]['rule'],
            'after': {
                'opener': 'the profile: zero to three spaces, then three or more identical backticks or tildes',
                'closer': 'the profile: zero to three spaces, the opener character repeated at least the opener length, then spaces only',
                'unclosedFence': 'the recognizer runs the fence to the end of the text; a text the profile reads as malformed is excluded before this reader',
                'lineModel': 'LF split with one trailing CR removed (unchanged); a line is fenced when the profile marks its first character fenced, so a text with bare CRs is a residual',
            },
        },
        'links': {
            'file': 'packages/three-surface-poc-core/src/project-shape-manifest.ts',
            'before': prior['readers'][2]['rule'],
            'after': {
                'opener': 'the profile (as above)',
                'closer': 'the profile (as above)',
                'unclosedFence': 'as above',
                'inlineCode': 'each character of a profile code span is deleted from its line, a CR or LF inside the span is kept, and a span may cross lines; the root-index pillar table reader keeps its code-span directory cells (it deletes none)',
                'lineModel': 'LF split (unchanged); a line is fenced when the profile marks its first character fenced',
            },
        },
        'unchanged': ['consent (outsideFences, packages/polaris-generation-consent)', 'renderer (renderPolarisMarkdown)', 'ceremony-block (owner-act-record.ts)'],
    },
    'gaps': {
        'G2': {
            'ruling': 'fixed: the extractor reads the profile fences',
            'before': {'denominator': f"{len(b['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['extraction'])} of 25 well-formed fence-only LF cases differ from the profile", 'cases': b['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['extraction']},
            'after': {'denominator': f"{len(a['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['extraction'])} of 25", 'cases': a['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['extraction']},
            'pinnedBy': 'apps/three-surface-poc/src/fence-rules.test.ts, describe "G2, fixed: the extractor reads the profile\'s fences" (4 tests)',
        },
        'G3': {
            'ruling': "fixed: the link reader reads the profile's fences and code spans",
            'before': {
                'denominator': f"{len(b['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['links'])} of 25 fence-only cases, {len(b['spanCasesWhereTheReaderDisagreesWithTheProfile']['links'])} of 4 span cases and {len(b['singleLineSpanRowsWhereTheLinkReaderDisagrees'])} single-line span rows differ from the profile",
                'fenceOnlyCases': b['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['links'],
                'spanCases': b['spanCasesWhereTheReaderDisagreesWithTheProfile']['links'],
                'singleLineSpanRows': b['singleLineSpanRowsWhereTheLinkReaderDisagrees'],
            },
            'after': {
                'denominator': f"{len(a['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['links'])} of 25 fence-only cases, {len(a['spanCasesWhereTheReaderDisagreesWithTheProfile']['links'])} of 4 span cases and {len(a['singleLineSpanRowsWhereTheLinkReaderDisagrees'])} single-line span rows",
                'fenceOnlyCases': a['fenceOnlyCasesWhereTheReaderDisagreesWithTheProfile']['links'],
                'spanCases': a['spanCasesWhereTheReaderDisagreesWithTheProfile']['links'],
                'singleLineSpanRows': a['singleLineSpanRowsWhereTheLinkReaderDisagrees'],
            },
            'pinnedBy': 'apps/three-surface-poc/src/fence-rules.test.ts, describe "G3, fixed: the link reader reads the profile\'s fences and spans" (6 tests)',
        },
        'extractorOnSpanCases': {
            'note': 'The extractor reads fences only, by the owner ruling, so the 4 span cases still differ for it (it never reads a span); this is not a gap.',
            'cases': a['spanCasesWhereTheReaderDisagreesWithTheProfile']['extraction'],
        },
        'G1_G4': 'unchanged (G1 was fixed by syzygy-bpyt.16; G4 is the consent reader, not moved)',
    },
    'probe': {
        'tool': E63 + 'fence-probe.mjs',
        'base': {'path': E55 + 'fence-probe-output-base.json', 'sha256': sha(E55 + 'fence-probe-output-base.json'), 'commit': 'eb6183b5'},
        'head': {'path': E55 + 'fence-probe-output-head.json', 'sha256': sha(E55 + 'fence-probe-output-head.json'), 'commit': '3747f846'},
        'casesCompared': len(before['cases']),
        'profileVectorsMoved': profile_moved,
        'activeContentVectorsMoved': gate_moved,
        'wholeCaseProfileReadingMoved': whole_case_moved,
        'consentAndRendererVectorsMoved': consent_renderer_moved,
        'casesWhoseReaderVectorsMoved': sorted(c['id'] for c in before['cases'] if c['vectors'] != next(x for x in after['cases'] if x['id'] == c['id'])['vectors']),
        'casesWhoseReaderVectorsMovedAndTheProfileReadsMalformed': sorted(c['id'] for c in before['cases'] if c['vectors'] != next(x for x in after['cases'] if x['id'] == c['id'])['vectors'] and c['profileOnTheWholeCase'] != 'well-formed'),
        'malformedNote': 'A case the profile reads as malformed never reaches a reader (the gate excludes it first), so its reader vector is the recognizer recovery, not an admitted reading.',
    },
    'differential': {
        'tool': E55 + 'fence-differential.mjs',
        'output': {'path': E55 + 'fence-differential-output.json', 'sha256': sha(E55 + 'fence-differential-output.json')},
        'selftest': {'path': E55 + 'fence-differential-selftest-output.json', 'sha256': sha(E55 + 'fence-differential-selftest-output.json'), 'mutants': selftest['mutants'], 'killed': selftest['killed']},
        'population': diff['population'],
        'checks': checks,
        'gate': diff['gate'],
        'shapesWhoseReaderOutputMoves': shapes,
        'manifest': {'rowsChecked': diff['manifest']['rowsChecked'], 'rowsWhoseReadSetMoves': diff['manifest']['rowsChanged']},
    },
    'mutants': {
        'tool': E55 + 'fence-mutants.py',
        'output': {'path': E55 + 'fence-mutants-output.json', 'sha256': sha(E55 + 'fence-mutants-output.json')},
        'ranAt': mut['summary']['codeCommit'],
        'mutants': len(mutants),
        'killed': sum(1 for r in mutants if r['outcome'] == 'killed'),
        'survived': [r['id'] for r in mutants if r['outcome'] != 'killed'],
        'baseReadersFailingTests': len(base_row['failingTests']),
    },
    'residuals': [
        'Two stray single backticks around a list of links make those links a code span: they drop with no signal, and the text is well formed so the gate admits it. The owner chose plain C over "C, and signal the stray span". Pinned by a RESIDUAL test in fence-rules.test.ts.',
        'The extractor and the link reader keep their LF-only line model. In a text with bare CRs (no LF) a fence that opens inside one reader line reaches the lines after it; the differential tallies base against head for those texts (diff.readerChanges, bareCrOrMixed) and makes no oracle claim for them. The bare-CR GAP rows stay.',
        'The consent reader (outsideFences) and the Polaris renderer keep their own rules; G4 and the renderer departures stand.',
        'A malformed text never reaches the readers; the recognizer recovery that makes it total is pinned by tests and is not a decision (the policy action is exclude-whole-artifact).',
    ],
}
with open(f'{ROOT}/{OUT}', 'w', encoding='utf8') as handle:
    json.dump(result, handle, indent=1, ensure_ascii=True)
    handle.write('\n')
print(OUT, sha(OUT))
