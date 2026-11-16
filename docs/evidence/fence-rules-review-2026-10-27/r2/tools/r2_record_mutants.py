#!/usr/bin/env python3
"""Re-run the record's 26 mutants from their `old`/`new` fragments against the committed tests (no probe, no build).
Usage: r2_record_mutants.py <clone at 815d93bb, npm ci done> <out.json>
Per row: `old` must occur once in the file at HEAD; the working-tree file is mutated, fence-rules.test.ts (and, for a consent row,
package-reader.test.ts) runs with vitest's JSON reporter, the failed test names are kept, and the file is restored. The kill is then
compared with the record's own `test`/`newRows`/`consentNew` detectors."""
import json
import os
import subprocess
import sys

clone, out = os.path.abspath(sys.argv[1]), sys.argv[2]
FR = 'apps/three-surface-poc/src/fence-rules.test.ts'
PR = 'packages/polaris-generation-consent/src/package-reader.test.ts'
rec = json.load(open(os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/dc3-fence-rules-2026-10-25.json')))
tmp = os.environ.get('TMPDIR', '/tmp')
rows = []
for m in rec['mutants']['run']['mutants']:
    path = os.path.join(clone, m['file'])
    text = open(path, encoding='utf8').read()
    row = {'id': m['id'], 'oldCount': text.count(m['old'])}
    if row['oldCount'] != 1:
        rows.append(row)
        continue
    files = [FR, PR] if 'polaris-generation-consent' in m['file'] else [FR]
    open(path, 'w', encoding='utf8').write(text.replace(m['old'], m['new']))
    try:
        rep = os.path.join(tmp, f"rm-{m['id']}.json")
        done = subprocess.run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={rep}', *files], cwd=clone, capture_output=True, text=True, timeout=1200)
        data = json.load(open(rep))
        os.remove(rep)
        failed = {os.path.relpath(t['name'], clone): [a['fullName'] for a in t['assertionResults'] if a['status'] == 'failed'] for t in data['testResults']}
    finally:
        subprocess.run(['git', '-C', clone, 'checkout', '--', m['file']])
    d = m['detectors']
    recorded_fr = d['test']['killed'] or d.get('newRows', {}).get('killed', False)
    recorded_pr = d.get('consentNew', {}).get('killed', False) or (d.get('existing', {}).get('killed', False) and 'polaris-generation-consent' in m['file'])
    row.update({'exit': done.returncode, 'failedPerFile': {k: len(v) for k, v in failed.items()}, 'failed': failed,
                'killedByFenceRules': len(failed.get(FR, [])) > 0, 'recordSaysFenceRulesKills': recorded_fr,
                'killedByPackageReader': len(failed.get(PR, [])) > 0 if PR in files else None, 'recordSaysPackageReaderKills': recorded_pr if PR in files else None})
    row['agrees'] = row['killedByFenceRules'] == recorded_fr and (PR not in files or row['killedByPackageReader'] == recorded_pr)
    rows.append(row)
    print(m['id'], 'fence-rules', row['failedPerFile'].get(FR), 'package-reader', row['failedPerFile'].get(PR), 'agrees', row['agrees'], flush=True)
status = subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True).stdout
json.dump({'rows': rows, 'allAgree': all(r.get('agrees') for r in rows), 'treeCleanAfter': status.strip() == ''}, open(out, 'w'), indent=1)
