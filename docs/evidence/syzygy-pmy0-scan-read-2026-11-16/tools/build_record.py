"""Rebuild docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json for the repair
of review R-PMY0-GUARDIAN-SCAN-READ-1 from the run outputs in SCRATCH.

Usage: python3 build_record.py REPO SCRATCH SUBJECT_COMMIT
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

repo, scratch, commit = Path(sys.argv[1]), Path(sys.argv[2]), sys.argv[3]
record_path = repo / 'docs/evidence/syzygy-pmy0-scan-read-2026-11-16.json'
tools = repo / 'docs/evidence/syzygy-pmy0-scan-read-2026-11-16/tools'


def sha(data):
    return hashlib.sha256(data).hexdigest()


def blob(path):
    return subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=repo, capture_output=True, check=True).stdout


def load(name):
    return json.loads((scratch / name).read_text())


previous = json.loads(record_path.read_text())
guardian = 'scripts/poc_browser_lifetime.py'
fixture = 'apps/three-surface-poc/src/test-fixtures/browser-parent-death.py'
race = load('race-r2.json')
race_aligned = load('race-r2-mutant.json')
sim = load('diff-r2.json')
prims = {mode: load(f'prim-r2-{mode}.json') for mode in ('default', 'clocale', 'utf8')}
mut = load('mutants-r2/mutation-result.json')
drains = [json.loads(line) for line in (scratch / 'drain17-r2.jsonl').read_text().splitlines()]


def probe(label):
    r = load(f'probe-{label}/result.json')
    row = {k: r.get(k) for k in ('source_sha256', 'guardian_returncode', 'guardian_elapsed_after_stop',
                                 'acknowledgement', 'proof_succeeded_before_recovery')}
    row.update(afterProcFamily=len(r['after_proc']['family']), afterPsFamily=len(r['after_ps']['family']),
               hostMetadataDenominator=r['after_proc']['metadata_denominator'],
               recoverySignals=len(r['recovery']['signals']))
    return row


subject_sha = sha(blob(guardian))
assert race['new'] == sim['newSha256'] == prims['default']['newSha256'] == subject_sha
assert all(d['sourceSha256'] in (subject_sha, race['old']) for d in drains)
ack = {'subject': probe('subject'), 'predecessor': probe('pred')}
assert ack['subject']['source_sha256'] == subject_sha
old_drain = [d['drainSeconds'] for d in drains if d['sourceSha256'] == race['old']]
new_drain = [d['drainSeconds'] for d in drains if d['sourceSha256'] == subject_sha]
ratio = sum(new_drain) / sum(old_drain)

record = {
    'epistemic': previous['epistemic'],
    'subject': {
        'bead': 'syzygy-pmy0', 'commit': commit,
        'files': {guardian: subject_sha, fixture: sha(blob(fixture))},
        'predecessorGuardianSha256': race['old'],
        'review': 'R-PMY0-GUARDIAN-SCAN-READ-1 (CONFIRM WITH EXCEPTIONS) reviewed 7060b9f6; this record is '
                  'the repair of its findings F1-F6 and retires that review for the changed bytes.',
    },
    'mechanism': 'Stat bodies are read with os.open/os.read and decoded whole with the same codec after the same '
                 'default-decoder warning, in place of a text stream. Scan rows still go through '
                 'identity(pid, with_namespace=False), owner lookup included, so a row whose process vanished by '
                 'that lookup is dropped exactly as before. process_names() lists /proc with os.scandir on every '
                 'interpreter. Per-signal full family scans, the 3 s deadline, escalation, refusals, two complete '
                 'empty scans and the acknowledgement are unchanged.',
    'repair': {
        'F3': 'The 80399fae lineage() reader kept a row whose process exited between its stat read and the '
              'former owner lookup; its parent edge could pull earlier-read children (after PID wrap) into the '
              'family. Restored: scan rows use identity() again. The intra-scan race differential now finds no '
              'difference in outcome, delivered signals or any descendants() result.',
        'F5': 'Python-version-gated listing removed; os.scandir is compared with Path.iterdir on a stable '
              'directory (stableListing) and live /proc (listing).',
        'F1': 'The earlier ack17Probe row "a" (source 3299de04...) was an intermediate draft, not the subject '
              'its note named. It is removed; ack17Probe below ran the subject bytes and records their digest.',
    },
    'equivalence': {
        'intraScanRace': {
            'tool': 'race_differential.py',
            'description': 'Predecessor and subject drain() with one or two process-table events injected after '
                           'chosen syscall indices (inside scans, including between a stat read and its owner '
                           'lookup); PID-wrap trees; compares outcome, delivered signals and every descendants() '
                           'family set.',
            'trees': race['trees'], 'runs': race['runs'], 'differences': race['differences'],
            'negativeControls': {
                'reviewedLineageReader': {'sha256': race['control'], 'differences': race['controlDifferences'],
                                          'note': 'syscall indices shift (no owner lookup), so this counts '
                                                  'index-shifted runs too; see the aligned control'},
                'keepVanishedRowMutant': {'sha256': race_aligned['control'],
                                          'differences': race_aligned['controlDifferences'],
                                          'note': "subject with the owner lookup's FileNotFoundError swallowed; "
                                                  'same syscall sequence, so every difference is the F3 window'},
            },
        },
        'simulatedDrain': {'tool': 'differential.py', 'cases': sim['cases'], 'identical': sim['identical'],
                           'scans': sim['scans'], 'seed': sim['seed'],
                           'note': 'process table fixed within a scan; changes only on signals'},
        'readerPrimitive': {mode: {
            'tool': 'primitive_differential.py', 'textEncoding': p['textEncoding'],
            'byteCases': p['byteCorpus']['cases'], 'rowMismatches': p['byteCorpus']['mismatches'],
            'textOnlyNewlineTranslation': p['byteCorpus']['textOnlyNewlineTranslation'],
            'rowOutcomes': p['byteCorpus']['rowOutcomes'], 'missingFileEqual': p['missingEqual'],
            'live': {k: (len(v) if k == 'readerDifferences' else v) for k, v in p['live'].items()},
            'stableListing': p['stableListing'], 'liveListingSymmetricDifferences':
                p['listing']['symmetricDifferenceSizes'],
            'scanSecondsBestOf7': p['scanSecondsBestOf7'],
        } for mode, p in prims.items()},
        'liveNote': 'Live comparisons exclude the volatile state field (counted as stateFlips); the byte corpus '
                    'checks state parsing exactly. Live listing differences are process churn between two '
                    'listings; stableListing is the mechanism comparison.',
    },
    'mutations': {'tool': 'mutate.py', 'commit': mut['commit'], 'mutants': mut['mutants'],
                  'killedByPredictedMarker': mut['killedByPredictedMarker'],
                  'killedByAnyNamedControl': mut['killedByAnyNamedControl'],
                  'case': "cdp-browser.browser.test.ts -t 'reaps children after failed endpoint'",
                  'records': mut['records']},
    'hostTimings': {
        'drain17': drains,
        'ack17Probe': ack,
        'note': 'One ACK17 execution per source, back to back, via probe.sh. Single measurements under shared '
                'load, not bounds.',
        'margin': {
            'drainRatioSubjectToPredecessor': round(ratio, 3),
            'predecessorFailureAt4774Pids': '4.03 s: a single instrumented SIGTERM-case attribution run of '
                                            'af485ea3 (the branch intermediate, not main) at 4,774 visible PIDs '
                                            'that was refused at the deadline after 18 full scans '
                                            '(syzygy-pmy0-guardian-outcome-2026-11-14.json). It is the time at '
                                            'refusal, not a completed drain, and its instrumentation overhead is '
                                            'unknown.',
            'estimateAt4774Pids': f'[Unknown] No completion estimate. Scaling that refusal time by the drain17 '
                                  f'ratio gives about {4.03 * ratio:.1f} s of work done without completing, on '
                                  'a different case; truncation pushes the true figure up and instrumentation '
                                  'may push it down. A refusal at about 4,774 PIDs under check:all load cannot '
                                  'be ruled out. [Observed] The subject is faster than both af485ea3 and main '
                                  'and behaves like main; the remaining margin is not created by this change.',
            'scaling': 'Scan cost still grows with visible PIDs times signals: one full /proc scan per signal '
                       'plus one per drain round.',
        },
    },
    'rejectedAlternatives': previous['rejectedAlternatives'],
    'earlierSubject80399fae': {
        'note': 'Measurements and the single check:all attempt of the reviewed lineage() form, kept for history; '
                'they do not describe this subject.',
        'mutations': {k: previous['mutations'][k] for k in ('commit', 'mutants', 'killedByPredictedMarker',
                                                             'killedByAnyNamedControl')},
        'checkAll': previous['checkAll'],
    },
    'tools': {path.name: sha(path.read_bytes()) for path in sorted(tools.iterdir()) if path.is_file()},
}
record_path.write_text(json.dumps(record, indent=1) + '\n')
print(record_path, sha(record_path.read_bytes()), f'ratio={ratio:.3f}')
