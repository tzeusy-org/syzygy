#!/usr/bin/env python3
"""Check the round-1 repair mutants record by script (rules 6 and 11).
Usage: python3 -I check_repair_mutants.py <repo> <mutants.json> <out.json>

For each row: `old` occurs exactly once in `file` at the record's head and `new` occurs zero times; `old` occurs
in the file at the reviewed head (or why not); each detector's `killed` agrees with its summary line (a
"N failed" in the Tests line) and with its failed list; a full-suite kill is not timeout-only; the full-suite
failures include one of the repair's new test titles; and the verdict text names exactly the detectors that killed."""
import json
import re
import subprocess
import sys

repo, path, out = sys.argv[1:4]
rec = json.load(open(path))
NEW_TITLES = [
    'drops one leading byte-order mark from the decoded text and keeps a second',
    'a seed with a leading byte-order mark is read without it',
    'a seed whose bytes are not UTF-8 is refused with its reason and a not-utf-8 read record',
    'drops one leading byte-order mark from the tree listing before parsing it',
    "drops one leading byte-order mark from git's listing before parsing it",
    'reports a gitlink filter that cannot allocate its copy as it reports bytes it cannot decode',
]
TIMEOUT = re.compile(r'timed out|Timeout|deadline', re.I)


def show(commit, p):
    r = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], capture_output=True)
    return r.stdout.decode('utf-8') if r.returncode == 0 else None


rows = []
for m in rec['mutants']:
    src = show(rec['head'], m['file'])
    src_r1 = show(rec['reviewedHead'], m['file'])
    det = m['detectors']
    checks = {
        'oldCountAtHead': src.count(m['old']),
        'newCountAtHead': src.count(m['new']),
        'oldCountAtReviewedHead': src_r1.count(m['old']) if src_r1 is not None else None,
    }
    for name in ('new', 'prior', 'full'):
        d = det[name]
        tests_line = [s for s in d['summary'] if s.strip().startswith('Tests')]
        failed_in_summary = 0
        if tests_line:
            mm = re.search(r'(\d+) failed', tests_line[0])
            failed_in_summary = int(mm.group(1)) if mm else 0
        non_timeout = [f for f in d['failed'] if not TIMEOUT.search(f['firstError'])]
        checks[f'{name}KilledField'] = d['killed']
        checks[f'{name}FailedInSummary'] = failed_in_summary
        checks[f'{name}FailedListed'] = len(d['failed'])
        checks[f'{name}NonTimeoutFailures'] = len(non_timeout)
        checks[f'{name}Consistent'] = (d['killed'] == (len(non_timeout) > 0)) and failed_in_summary == len(d['failed']) == d.get('failedCount', len(d['failed']))
    full_titles = [f['test'] for f in det['full']['failed']]
    checks['fullKilledByANewTitle'] = any(any(t.endswith(nt) or nt in t for nt in NEW_TITLES) for t in full_titles)
    checks['probeKilled'] = det['probe']['killed']
    checks['probeConsistent'] = det['probe']['killed'] == (det['probe']['rowsDiffer'] > 0)
    killed_by = [n for n in ('new', 'full', 'probe') if det[n]['killed']]
    verdict_head = m['verdict'].split('(')[0]
    checks['verdictNames'] = verdict_head.strip()
    checks['verdictConsistent'] = verdict_head.strip() == ('killed by ' + ', '.join(killed_by))
    checks['priorSurvives'] = not det['prior']['killed']
    rows.append({'id': m['id'], **checks})
summary = {
    'rows': len(rows),
    'oldExactlyOnceAtHead': sum(1 for r in rows if r['oldCountAtHead'] == 1 and r['newCountAtHead'] == 0),
    'detectorsConsistent': sum(1 for r in rows if r['newConsistent'] and r['priorConsistent'] and r['fullConsistent'] and r['probeConsistent']),
    'verdictConsistent': sum(1 for r in rows if r['verdictConsistent']),
    'killedByNewAndFull': sum(1 for r in rows if r['newKilledField'] and r['fullKilledField'] and r['fullNonTimeoutFailures'] > 0),
    'fullKilledByANewTitle': sum(1 for r in rows if r['fullKilledByANewTitle']),
    'priorSurvives': [r['id'] for r in rows if r['priorSurvives']],
}
json.dump({'record': path, 'head': rec['head'], 'summary': summary, 'rows': rows}, open(out, 'w'), indent=1)
print(json.dumps(summary))
for r in rows:
    print(r['id'], 'old@head', r['oldCountAtHead'], 'old@r1', r['oldCountAtReviewedHead'], 'full nonTimeout', r['fullNonTimeoutFailures'], 'verdictOK', r['verdictConsistent'], 'byNewTitle', r['fullKilledByANewTitle'])
