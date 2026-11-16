"""Check the rule-6 record's per-mutant fields against the bytes at the commits it names."""
import collections
import hashlib
import json
import subprocess
import sys

record_path, clone = sys.argv[1], sys.argv[2]
rec = json.load(open(record_path))


def blob(commit, path):
    return subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], check=True, capture_output=True).stdout


def sha(data):
    return hashlib.sha256(data).hexdigest()


TEST = 'packages/polaris-dossier/src/launched.test.ts'
READER = 'packages/polaris-dossier/src/launched.ts'
print('subject:', json.dumps(rec['subject']))
print('command:', rec['command'])
print('title:', rec['title'])
for label, commit in [('base', rec['base']), ('fix', rec['commit']), ('head', 'bddbbf6c3ef2cd3fff2b73946356c57fc5bd5353'), ('merge-base', '9a30237ed700e6579f3fcc1c6292e6c759861c3f')]:
    print(f'{label} {commit}: test sha256 {sha(blob(commit, TEST))} reader sha256 {sha(blob(commit, READER))}')
print('record testSha256', rec['testSha256'], 'readerSha256', rec['readerSha256'])
print('unmutated counts', json.dumps(rec['unmutated']['base']['counts']), json.dumps(rec['unmutated']['fix']['counts']))

reader_at_base = blob(rec['base'], READER).decode()
test_at_base = blob(rec['base'], TEST).decode()
for m in rec['mutants']:
    first_lines = collections.Counter()
    for t in m['failedTests']:
        keys = [k for k in t if k not in ('name', 'title', 'fullName')]
        line = t.get('firstError') or t.get('error') or t.get('message') or ''
        first_lines[(line[:90])] += 1
    print('---', m['id'], m['kind'], m['tests'], 'exit', m['exitCode'], 'counts', json.dumps(m['counts']), 'outcome', m['outcome'],
          'failedRows', len(m['failedRows']), 'blocked', m['blocked'], 'restored', m['restored'])
    for line, n in first_lines.items():
        print(f'     {n} x {line!r}')
    for e in m['edits']:
        target = e.get('file') or e.get('path')
        source = reader_at_base if target and target.endswith('launched.ts') else test_at_base
        occurrences = source.count(e['old'])
        print(f'     edit {target}: old once-at-base={occurrences} oldlen={len(e["old"])} newlen={len(e["new"])} keys={sorted(e)}')
if rec['mutants'] and rec['mutants'][0]['failedTests'] == [] and len(rec['mutants']) > 1:
    print('sample failedTests keys:', sorted(rec['mutants'][1]['failedTests'][0]) if rec['mutants'][1]['failedTests'] else None)
print('failedRows sample', json.dumps(rec['mutants'][1]['failedRows'][:2]))
print('trackedTreeCleanAfter', rec['trackedTreeCleanAfter'])
