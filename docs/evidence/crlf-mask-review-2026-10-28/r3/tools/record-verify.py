"""Re-derives the record's digests at the evidence head (rule 11): every `files` row, the repair's changed files, and the mutant and
test summaries it copies. Usage (from a clone): python3 -I record-verify.py <evidence head>"""
import hashlib, json, subprocess, sys
head = sys.argv[1]
D = 'docs/evidence/syzygy-bpyt-16/'
def show(c, p):
    return subprocess.run(['git', 'show', f'{c}:{p}'], capture_output=True, check=True).stdout
rec = json.loads(show(head, D + 'crlf-mask-2026-10-27.json'))
rows = rec['files']
bad = []
for r in rows:
    path = r.get('path')
    b = show(head, path if path.startswith('docs/') else D + path)
    if len(b) != r.get('bytes') or hashlib.sha256(b).hexdigest() != r.get('sha256'):
        bad.append(path)
listed = subprocess.run(['git', 'ls-tree', '-r', '--name-only', head, D], capture_output=True, text=True, check=True).stdout.split()
names = {(r['path'] if r['path'].startswith('docs/') else D + r['path']) for r in rows}
print('files rows', len(rows), 'mismatches', bad, '| tracked files in the directory', len(listed), '| not in the table', sorted(set(listed) - names))
rep = rec['subject']['repair']
for f in rep['changedFiles']:
    ok = hashlib.sha256(show(rep['range']['to'], f['path'])).hexdigest() == f['sha256AtRepair'] and hashlib.sha256(show(rep['range']['from'], f['path'])).hexdigest() == f['sha256Before']
    print('repair changed file', f['path'], f['status'], f['bytesBefore'], '->', f['bytesAtRepair'], 'digests verify', ok)
mut = json.loads(show(head, D + 'crlf-mask-mutants-output.json'))
print('record rule6 summary equals the output summary:', rec['rule6']['maskMutants']['summary'] == mut['summary'])
td = json.loads(show(head, D + 'test-delta-output.json'))
print('record tests line', rec['tests']['line'], '| output line', td['line'], '| base/head', rec['tests']['baseTests'], rec['tests']['headTests'], rec['tests']['baseCommit'][:8], rec['tests']['headCommit'][:8])
print('previous measurement', {k: v for k, v in rec['tests']['previousMeasurement'].items() if k != 'why'})
print('residual 1:', rec['residuals'][0])
# Round 3 additions: the round-2 block, the round-one measurement, and the repair range's paths.
r2 = rep['round2']
print('round2 review', r2['review']['sha256'][:12], r2['review']['reviewedCommit'][:8], '| range', r2['range']['from'][:8], '->', r2['range']['to'][:8], '| r1 repair', r2['roundOneRepairCommit'][:8])
print('roundOneMeasurement', {k: v for k, v in rec['tests']['roundOneMeasurement'].items() if k != 'why'})
paths = subprocess.run(['git', 'diff', '--name-only', rep['range']['from'], rep['range']['to']], capture_output=True, text=True, check=True).stdout.split()
outside = [p for p in paths if not p.startswith(D) and p not in ('packages/three-surface-poc-core/src/git-object-reader.test.ts', 'packages/three-surface-poc-core/src/markdown-code-context.test.ts')]
print('repair range paths', len(paths), 'outside the two test files and the evidence dir', outside)
print('note:', rec['subject']['note'])
