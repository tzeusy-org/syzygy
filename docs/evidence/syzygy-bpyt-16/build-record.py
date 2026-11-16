#!/usr/bin/env python3
"""Builds crlf-mask-2026-10-27.json, the record of syzygy-bpyt.16, from the outputs beside it. Every digest and total is computed.

Usage: build-record.py <git repo> <base commit> <code commit> <evidence dir> <repair commit> <remeasure base> <reviewed commit>
                       <round-1 repair commit> <round-1 evidence commit>
  base, code   the parent of the fix and the fix commit: the subject of the production-file digests, the built modules and the
               digest-citer sweep
  repair       the commit of the round-2 repair (R-GP-IMPL-CRLF-MASK-2), on top of the round-1 repair of R-GP-IMPL-CRLF-MASK-1: the
               pins and the rows that measure them, no production byte changed. The subject of the mutant runs, the differential
               builds and the test report
  round-1 repair, round-1 evidence   the commit of the round-1 repair (224e8faa) and the commit that held its measurements
               (561e4f77), the baseline of round 2
  remeasure base, reviewed   main as merged into the branch (f7ea8584) and the commit the review was bound to (c399eda9): the base
               of the test report and of the differential re-run, and the commit the repair range starts from
Refuses (exit 1) unless the outputs say what the record is about to say: no differential failure, every non-equivalent mutant
killed (MU17 to MU24, each only by its listed pins), the self-test killing 7 of 7, the two digest-citer methods agreeing, the vet runner agreeing
at HEAD on every row, the repair touching no byte outside the two test files and docs/evidence, and the re-run differential equal
to the one the review was bound to on every field but the separator slice.
"""
import hashlib
import json
import os
import subprocess
import sys

repo, base_arg, code_arg, evidence, repair_arg, remeasure_arg, reviewed_arg, round1_repair_arg, round1_evidence_arg = sys.argv[1:]
MASK = 'packages/three-surface-poc-core/src/markdown-code-context.ts'
REPAIR_TESTS = [
    'packages/three-surface-poc-core/src/git-object-reader.test.ts',
    'packages/three-surface-poc-core/src/markdown-code-context.test.ts',
]
REVIEW_RAW = {
    'name': 'R-GP-IMPL-CRLF-MASK-1-RAW.md',
    'sha256': '1a2010ae4d7fe2de19aac036545b0ade689d69dcca0ef5c9f15333a161302964',
    'verdict': 'REVISE',
    'blockingFindings': ['F1'],
    'inThisTree': False,
}
REVIEW_RAW_2 = {
    'name': 'R-GP-IMPL-CRLF-MASK-2-RAW.md',
    'sha256': '165b3f71212e914b8f3a36e642b8d440a36e74ed7176cbe938e4f26676c8647a',
    'verdict': 'REVISE',
    'blockingFindings': ['F1 (a figure in the PR body)'],
    'notesTaken': ['N1', 'N2', 'N4', 'N5', 'N7'],
    'notesNotTaken': {'N3': 'goes to syzygy-bpyt.41 (a mixed-terminator row)', 'N6': 'a note only: start-gates.test.ts exceeds its 5 s default under load, outside this PR'},
    'inThisTree': False,
}


def git(*args):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


def load(name):
    return json.load(open(os.path.join(evidence, name), encoding='utf8'))


base = git('rev-parse', base_arg).decode().strip()
code = git('rev-parse', code_arg).decode().strip()
repair = git('rev-parse', repair_arg).decode().strip()
remeasure = git('rev-parse', remeasure_arg).decode().strip()
reviewed = git('rev-parse', reviewed_arg).decode().strip()
round1_repair = git('rev-parse', round1_repair_arg).decode().strip()
round1_evidence = git('rev-parse', round1_evidence_arg).decode().strip()
EVIDENCE_PATH = 'docs/evidence/syzygy-bpyt-16/'

diff = load('crlf-differential-output.json')
mut = load('crlf-mask-mutants-output.json')
self_test = load('crlf-differential-selftest-output.json')
citers = load('digest-citers-6928b50a.json')
vet_head = load('vet-run-at-head-summary.json')
tests = load('test-delta-output.json')
problems = []
if any(c['failures'] for c in diff['checks'].values()) or diff['failureCount'] != 0:
    problems.append('the differential has failures')
if mut['summary']['survived'] or mut['summary']['killed'] + mut['summary']['survivedEquivalent'] != mut['summary']['mutants']:
    problems.append('a non-equivalent mutant survived')
if self_test['killed'] != self_test['total'] or self_test['total'] != 7:
    problems.append('the differential self-test is not 7 of 7')
# The sweep's subject is the digest of the edited file; the repair changes no production byte, so the sweep stands for the repair too.
swept = {(d['at']): d['sha256'] for d in citers['digests']}
if swept != {'base': sha(git('show', f'{base}:{MASK}')), 'head': sha(git('show', f'{repair}:{MASK}'))}:
    problems.append('digest-citers: the swept digests are not the mask at the base and at the repair commit')
if not citers['methodsAgree'] or citers['codeHeadCommit'] != code or citers['baseCommit'] != base_arg:
    problems.append('digest-citers: methods disagree or another commit')
repair_paths = git('diff', '--name-only', reviewed, repair, '--', '.', f':(exclude){EVIDENCE_PATH}').decode().split()
if sorted(repair_paths) != REPAIR_TESTS:
    problems.append(f'the repair touches {repair_paths}, not exactly the two test files')
if subprocess.run(['git', '-C', repo, 'merge-base', '--is-ancestor', reviewed, repair]).returncode != 0:
    problems.append('the reviewed commit is not an ancestor of the repair commit')
if mut['summary']['codeCommit'] != repair:
    problems.append('the mutants ran at another commit than the repair commit')
if mut['summary']['expectedKillerNotAlone'] or mut['summary']['killedByExpectedKillerOnly'] != 8:
    problems.append('MU17 to MU24 are not each killed by their listed pins only')
if [r['id'] for r in mut['rows'] if r.get('failingPins') == []]:
    problems.append('a mutant with listed pins failed none of them')
for r in mut['rows']:
    if r['id'] in ('MU22-vt-ff-are-line-ends', 'MU23-closer-tolerates-separators', 'MU24-positionOf-counts-u2028') and (r['outcome'] != 'killed' or r['failingPins'] != r['expectedKillers'] or len(r['failingTests']) != 1):
        problems.append(f'{r["id"]} is not killed by its one pin alone')
vt_ff = load('vt-ff-slice-necessity.json')
if vt_ff['toolWithoutVtFf']['exit'] != 0 or vt_ff['toolWithVtFf']['exit'] != 1:
    problems.append('the VT/FF slice necessity record does not show the old tool surviving and the new tool failing')
slice_checks = diff['checks']['C1_lfUnchanged']
if not slice_checks.get('separatorSliceTexts'):
    problems.append('the differential has no separator slice')
previous_diff = json.loads(git('show', f'{reviewed}:{EVIDENCE_PATH}crlf-differential-output.json'))
current_diff = json.loads(json.dumps(diff))
del current_diff['checks']['C1_lfUnchanged']['separatorSliceTexts']
del current_diff['population']['separatorSlice']
if current_diff != previous_diff:
    problems.append('the re-run differential differs from the one the review was bound to on a field other than the separator slice')
vs = vet_head['summary']
for group in ('CRLF', 'CR', 'MRT'):
    for key in ('payload_today_vs_lf', 'payload_today_vs_oTerm', 'control_today_vs_lf'):
        t = vs[group][key]
        if t['same'] != t['denominator']:
            problems.append(f'vet runner at HEAD: {group} {key} {t["same"]} of {t["denominator"]}')
if vet_head['oracleDisagreeLf'] != 0:
    problems.append('vet oracle disagrees with the LF text')
if not (tests['allBasePassed'] and tests['allHeadPassed']):
    problems.append('a test did not pass')
if diff['baseDistModule'] == diff['headDistModule']:
    problems.append('the base and head builds are the same module')
if problems:
    print('REFUSED:', *problems, sep='\n  ')
    sys.exit(1)

# Files this change adds or edits, at the code commit.
changed = []
names = git('diff', '--name-status', '-z', base, code).decode().split('\0')
for i in range(0, len(names) - 1, 2):
    status, path = names[i], names[i + 1]
    blob = git('show', f'{code}:{path}')
    changed.append({'path': path, 'status': status, 'bytesAtCode': len(blob), 'sha256AtCode': sha(blob)})
base_mask, head_mask = git('show', f'{base}:{MASK}'), git('show', f'{code}:{MASK}')
repair_changed = []
names = git('diff', '--name-status', '-z', reviewed, repair, '--', '.', f':(exclude){EVIDENCE_PATH}').decode().split('\0')
for i in range(0, len(names) - 1, 2):
    status, path = names[i], names[i + 1]
    blob = git('show', f'{repair}:{path}')
    before = git('show', f'{reviewed}:{path}')
    repair_changed.append({'path': path, 'status': status, 'bytesBefore': len(before), 'sha256Before': sha(before), 'bytesAtRepair': len(blob), 'sha256AtRepair': sha(blob)})
previous_tests = json.loads(git('show', f'{reviewed}:{EVIDENCE_PATH}test-delta-output.json'))
round1_tests = json.loads(git('show', f'{round1_evidence}:{EVIDENCE_PATH}test-delta-output.json'))

# Files of this directory, except the record itself.
own = []
for root, _dirs, files in os.walk(evidence):
    for f in sorted(files):
        path = os.path.join(root, f)
        rel = os.path.relpath(path, evidence)
        if rel == 'crlf-mask-2026-10-27.json':
            continue
        data = open(path, 'rb').read()
        own.append({'path': 'docs/evidence/syzygy-bpyt-16/' + rel, 'bytes': len(data), 'sha256': sha(data)})
own.sort(key=lambda r: r['path'])

selection = diff['vetSelection']
record = {
    'record': 'syzygy-bpyt.16: the code-context mask ends a line at CRLF, CR and LF',
    'date': '2026-10-27',
    'bead': 'syzygy-bpyt.16',
    'authority': {
        'decisionBead': 'syzygy-bpyt.1.14',
        'ownerAnswer': 'Arm (a) + bare CR (Recommended)',
        'authorized': 'Inside maskMarkdownCodeContexts a line ends at CRLF, CR or LF. The split keeps every terminator and offset. A CRLF or CR text gets exactly the decision its LF form gets.',
        'notAuthorized': [
            'any specification or policy byte (the PWB-REQ-006 clarifying sentence was not chosen)',
            'the extraction, index-link and consent readers (G2, G3 and G4 of the fence-rule record stay open owner questions)',
            'any change to how an LF text is read',
            'normalizing the text at the scanner entry, which would renumber findings in a bare-CR file',
        ],
    },
    'subject': {
        'baseCommit': base,
        'codeCommit': code,
        'note': 'The record is committed after the code commit. The code commit is the subject of the production-file digests, the built modules and the digest-citer sweep; the repair commit (subject.repair) is the subject of the mutant runs, the test report and the differential\'s head build, whose mask is the code commit\'s. Beyond the code commit, the PR head adds this directory, the merge of main f7ea8584 and the repair\'s two test files.',
        'productionFile': {
            'path': MASK,
            'base': {'bytes': len(base_mask), 'sha256': sha(base_mask)},
            'code': {'bytes': len(head_mask), 'sha256': sha(head_mask)},
        },
        'builtModule': {'base': diff['baseDistModule'], 'code': diff['headDistModule'], 'what': 'sha256 of dist/markdown-code-context.js, each built with tsc -b in its own checkout'},
        'changedFiles': changed,
        'repair': {
            'what': 'round 1 of the CC-REV-1 review of this change (R-GP-IMPL-CRLF-MASK-1) returned REVISE with one blocking finding, F1: a mutant that widens LINE_END to U+2028, U+0085 or the JavaScript line-terminator set changes LF decisions and no test, mutant or differential row failed. The repair adds the pins and the rows that measure them; no production byte changes',
            'review': dict(REVIEW_RAW, reviewedCommit=reviewed, why='the raw is retained by the coordinator, not in this tree'),
            'round2': {
                'what': 'round 2 (R-GP-IMPL-CRLF-MASK-2) returned REVISE on one PR-body figure (F1) and eight notes; no production byte changed and the review found no LF decision changed. The repair takes N1 (a general pin over every UTF-16 code unit, and VT and FF in the separator slice with the self-test mutant S7), N2 (a separator after a closing fence, and a U+2028 finding position) and the wording notes N4, N5 and N7; the mutants MU22 to MU24 are the reviewer\'s RW3, RW5 and RW10',
                'review': dict(REVIEW_RAW_2, reviewedCommit=round1_evidence, why='the raw is retained by the coordinator, not in this tree'),
                'roundOneRepairCommit': round1_repair,
                'roundOneEvidenceCommit': round1_evidence,
                'range': {'from': round1_evidence, 'to': repair},
                'vtFfSliceNecessity': {'output': 'docs/evidence/syzygy-bpyt-16/vt-ff-slice-necessity.json', 'what': 'rule 6 for the VT and FF addition to the separator slice: the round-1 differential survives a build whose LINE_END ends a line at VT and FF; the differential of this commit fails it'},
            },
            'range': {'from': reviewed, 'to': repair},
            'productionFileUnchanged': {'path': MASK, 'sha256AtCode': sha(head_mask), 'sha256AtRepair': sha(git('show', f'{repair}:{MASK}'))},
            'changedFiles': repair_changed,
            'measuredAtRepair': 'the mutant runs (crlf-mask-mutants-output.json), the test report (test-delta-output.json) and the head build of the differential; the differential and the test report take main as merged into the branch, ' + remeasure + ', as their base: its mask is byte-equal to the base of the fix, and the re-run differential equals the one the review was bound to on every field but the separator slice (checked by this script)',
            'remeasureBase': remeasure,
        },
    },
    'ccRev1Classes': {
        'touched': [4, 3],
        'class4': 'security: the mask decides which text the active-content scan (SEC-3 untrusted-content gate) reads; scanActiveContent is the only caller',
        'class3': 'deterministic observation: the same bytes now give one admit/refuse decision whatever their line terminator',
        'notClaimed': {'class1': 'authority boundaries: body-read-authority, the write-universe and the typed-authority table are untouched'},
        'rule': 'Class membership is never finally determined by the agent performing the change; a reviewer or the owner may reclassify.',
    },
    'vetPackage': {
        'directory': 'docs/evidence/syzygy-bpyt-16/vet-v-crlf-mask-1/',
        'what': 'the files of the V-CRLF-MASK-1 vet (verdict REPRODUCED at 8ff50172) copied byte for byte: its corpus, runner, mutant runner, pin tests, prototype diff and result files',
        'rawReview': {
            'name': 'V-CRLF-MASK-1-RAW.md',
            'sha256': '4f1b16f3fd9c2130e3a0ccae5ec447e676592ec4b012d0e1cbf8cb1cc3f62ac3',
            'inThisTree': False,
            'why': 'the raw quotes an act argument, which check_governance CG-7e accepts only in a file under the raw-review lane (docs/reviews, a -RAW.md name) or in a registered copy, and a file in that lane needs a campaign pattern and a docs/README.md row, the shared count that one integration edit per batch of raws changes; the coordinator retains it',
        },
    },
    'corpora': {
        'vet': diff['population']['vet'],
        'fenceCases': diff['population']['fence']['cases'],
        'n2Cases': diff['population']['n2']['cases'],
        'renderings': diff['population']['renderings'],
        'texts': diff['population']['texts'],
        'distinctTexts': diff['population']['distinctTexts'],
        'distinctLfForms': diff['population']['distinctLfForms'],
        'inputs': diff['corpusFiles'],
        'readsNoRepository': 'every text is synthetic, written in the corpus files named here',
    },
    'differential': {
        'tool': 'docs/evidence/syzygy-bpyt-16/crlf-differential.mjs',
        'output': 'docs/evidence/syzygy-bpyt-16/crlf-differential-output.json',
        'checks': diff['checks'],
        'meaning': {
            'C1': 'every LF text decides identically at BASE and HEAD: findings and mask deep-equal, over the distinct LF forms of the rows and over the separator slice (LF texts whose lines hold U+2028, U+2029, U+0085, VT (U+000B) or FF (U+000C) at fence and span positions)',
            'C2': 'at HEAD every CRLF, CR and mixed rendering decides as its LF form: same finding multiset (form, context, malformed line), equal mask once terminators read as LF',
            'C3': 'at HEAD the masked text has the text length, every terminator at its offset, every other byte its own or a space',
            'C4': 'at HEAD a CRLF text has findings deep-equal to its LF form, line and column included',
        },
        'anyOtherDifference': 'none: every check above has 0 failures; a failure would have stopped the work',
        'positionOf': diff['positionOf'],
    },
    'acceptRefuseDelta': {
        'definition': 'BASE and HEAD each decide the same CRLF, CR or mixed text; refuses = BASE admits and HEAD excludes (a fail-open closed); accepts = BASE excludes and HEAD admits (a fail-closed reading the LF form admits); the others keep their decision',
        'vetCorpus': {
            'CRLF': {'payloadPositions': selection['CRLF']['payload'], 'controls': selection['CRLF']['control']},
            'CR': {'payloadPositions': selection['CR']['payload'], 'controls': selection['CR']['control']},
            'mixedAndTrailingCrVariants': {'payloadPositions': selection['variants']['payload'], 'controls': selection['variants']['control']},
            'sumOfRows': diff['delta']['vet/all'],
            'vetBaseSummary': 'vet-v-crlf-mask-1/summary.json, the vet run over the BASE build, holds the same 32/48, 32/44 and 4/44 (controls 7/5, 7/3, 1/9)',
        },
        'fenceCorpus': diff['delta']['fence/all'],
        'n2Corpus': diff['delta']['n2/all'],
        'byRenderingAndCorpus': diff['delta'],
        'byCase': diff['deltaByCase'],
        'changedOutputsByClass': diff['transitions'],
        'vetChangedDecisions': diff['vetChangedDecisions'],
    },
    'secondMethod': {
        'what': 'the vet runner (vet-v-crlf-mask-1/tools/run.mjs, unchanged) over the HEAD build, with the vet independent oracle written from the PWB-REQ-006 bullets (CR read as a line terminator)',
        'output': 'docs/evidence/syzygy-bpyt-16/vet-run-at-head-summary.json',
        'rows': vs['rows'],
        'headEqualsLfAndEqualsOracle': {g: {'payload': vs[g]['payload_today_vs_lf']['same'], 'oracle': vs[g]['payload_today_vs_oTerm']['same'], 'of': vs[g]['payload_today_vs_lf']['denominator']} for g in ('CRLF', 'CR', 'MRT')},
        'oracleDisagreesWithLfCode': vet_head['oracleDisagreeLf'],
        'crEqualsCrlf': vs['crEqualsCrlf'],
    },
    'rule6': {
        'differentialSelftest': {
            'tool': 'docs/evidence/syzygy-bpyt-16/crlf-differential-selftest.mjs',
            'output': 'docs/evidence/syzygy-bpyt-16/crlf-differential-selftest-output.json',
            'killed': self_test['killed'],
            'of': self_test['total'],
            'mutants': [{k: m[k] for k in ('id', 'predicate', 'file', 'old', 'new', 'failingChecks')} for m in self_test['mutants']],
        },
        'maskMutants': {
            'tool': 'docs/evidence/syzygy-bpyt-16/crlf-mask-mutants.py',
            'output': 'docs/evidence/syzygy-bpyt-16/crlf-mask-mutants-output.json',
            'ranAt': mut['summary']['codeCommit'],
            'detectors': 'the seven test files this change adds or edits, one vitest run per mutant',
            'summary': mut['summary'],
            'mutants': [{'id': r['id'], 'outcome': r['outcome'], 'failedTests': {k: v['failed'] for k, v in r['detectors'].items()}, **({'expectedKillers': r['expectedKillers'], 'failingPins': r['failingPins'], 'failingTests': r['failingTests']} if 'expectedKillers' in r else {})} for r in mut['rows'] if r['id'].startswith(('MU', 'BASE'))],
            'equivalent': 'MU16: a line holds no CR or LF now (both are split points), so blanking by [^\\n] and by length agree; no test can tell them apart',
        },
    },
    'digestCitersSweep': {
        'tool': 'docs/evidence/syzygy-bpyt-6-3/digest-citers.py',
        'output': 'docs/evidence/syzygy-bpyt-16/digest-citers-6928b50a.json',
        'population': citers['population'],
        'editedProductionFiles': citers['editedProductionFiles'],
        'methodsAgree': citers['methodsAgree'],
        'headDigestCitedBy': sorted(set(citers['needlesCited'].get(citers['digests'][1]['sha256'][:12], []))),
        'baseDigestCitedBy': sorted(set(citers['needlesCited'].get(citers['digests'][0]['sha256'][:12], []))),
        'reading': 'the base digest is cited only by retained review-measurement records of the fence-rule review (they name the file as it was then); no act, manifest, acceptance record or .syzygy or openspec file cites either digest',
    },
    'tests': {
        'line': tests['line'],
        'method': 'by (file, full name) identity from vitest reports of the seven files at each commit, and by call text for a changed it.each call (tool: test-delta.py, test-inventory.mjs); a helper the callbacks call is not followed',
        'baseCommit': remeasure,
        'headCommit': repair,
        'roundOneMeasurement': {'baseCommit': remeasure, 'headCommit': round1_repair, 'line': round1_tests['line'], 'baseTests': round1_tests['baseTests'], 'headTests': round1_tests['headTests'], 'why': 'the count at the round-1 repair commit, read from test-delta-output.json at ' + round1_evidence + '; round 2 adds the three tests of its repair'},
        'previousMeasurement': {'baseCommit': base, 'codeCommit': code, 'line': previous_tests['line'], 'baseTests': previous_tests['baseTests'], 'headTests': previous_tests['headTests'], 'why': 'the count before the repair, read from test-delta-output.json at ' + reviewed + '; the base then was the parent of the fix, which holds one test fewer in the seven files than ' + remeasure + ' (the BOM test, main)'},
        'baseTests': tests['baseTests'],
        'headTests': tests['headTests'],
        'output': 'docs/evidence/syzygy-bpyt-16/test-delta-output.json',
    },
    'residuals': [
        '[Observed] positionOf in git-object-reader counts LF only and is unchanged (the ruling). In a text that holds a bare CR, a non-malformed finding keeps the LF-only line and column, while a malformed finding takes the mask line, which counts every CR, CRLF and LF; a text whose terminators are only LF and CRLF reports the LF form positions. No production path reads a finding line or column. The differential counts those rows under positionOf, and git-object-reader.test.ts pins the reading (the GAP test, which kills MU20 and MU21). A follow-up bead holds the line-model question; it is not G2 or G3.',
        '[Observed] The extractor splits at LF and drops one trailing CR; the link reader splits at LF only. For a bare-CR text each differs from the profile (links in 30 of the 33 fence cases, extraction in all 33, pinned in fence-rules.test.ts rows named GAP G2/G3). They are open owner questions G2 and G3 and are not changed here.',
        '[Observed] The consent reader (outsideFences) is unchanged and stays CR-blind (G4).',
        '[Observed] docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json and its probe outputs record G1 as measured before this fix; they are not edited.',
        '[Unknown] No Butlers body or other observed repository was read; the measurement is over synthetic corpora only, so how many real CRLF sources the exclusions change is Unknown.',
    ],
    'files': own,
}
text = json.dumps(record, indent=1) + '\n'
open(os.path.join(evidence, 'crlf-mask-2026-10-27.json'), 'w', encoding='utf8').write(text)
print('wrote', len(text), 'bytes;', len(own), 'files;', tests['line'], 'mutants', mut['summary'])
