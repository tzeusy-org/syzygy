"""syzygy-bpyt.39 (the PR 541 round-3 review's N1): rule 6 for docs/evidence/syzygy-bpyt-8-39/record.py's REPAIR1-to-HEAD check,
one predicate at a time. Each mutant drops one of the check's three predicates from a scratch copy of record.py and runs that copy's
--selftest over the tree; the entries that then survive are exactly the ones that predicate alone kills. Before syzygy-bpyt.39,
dropping the path test (the review's S5) or the ` * ` prefix test (S4) left every entry killed.
Usage: python3 -I record_predicate_mutants.py <tree> <scratch dir> <out.json>
"""
import hashlib, json, os, re, subprocess, sys

tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
RECORD = 'docs/evidence/syzygy-bpyt-8-39/record.py'
source = open(os.path.join(tree, RECORD)).read()
CHECK = "    if since != [KIT] or not late or any(late_spans[s] is None or not late_spans[s][0] < n <= late_spans[s][1] or not re.match(r' \\* ', text)\n"
MUTANTS = [
    ('S5-path-test-dropped', CHECK, CHECK.replace('since != [KIT] or ', '')),
    ('S4-prefix-test-dropped', CHECK, CHECK.replace(" or not re.match(r' \\* ', text)", '')),
    ('S6-span-test-dropped', CHECK, CHECK.replace(' or not late_spans[s][0] < n <= late_spans[s][1]', '')),
]
EXPECTED = {'S5-path-test-dropped': ['a non-evidence path changed since the suite ran'],
            'S4-prefix-test-dropped': ['a non-comment line inside the span since the suite ran'],
            'S6-span-test-dropped': ['a comment line changed since the suite ran on the LOCAL_VERSION line']}
os.makedirs(scratch, exist_ok=True)
git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout.strip()


def selftest(text):
    path = os.path.join(scratch, 'record.py')
    open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, '--selftest'], capture_output=True, text=True, timeout=1800)
    survived = [line.split(' | ')[1] for line in r.stdout.splitlines() if line.startswith('SURVIVED | ')]
    total = re.search(r'selftest: (\d+)/(\d+)', r.stdout)
    return {'exit': r.returncode, 'survived': survived, 'tally': total.group(0) if total else r.stdout[-300:]}


rows = [{'id': 'S0-unmutated', 'old': None, 'new': None, **selftest(source), 'expected': []}]
for mid, old, new in MUTANTS:
    assert source.count(old) == 1 and old != new, mid
    rows.append({'id': mid, 'old': old, 'new': new, **selftest(source.replace(old, new)), 'expected': EXPECTED[mid]})
for row in rows:
    row['asExpected'] = row['survived'] == row['expected'] and (row['exit'] == 0) == (row['expected'] == [])
os.remove(os.path.join(scratch, 'record.py'))
result = {'commit': git('rev-parse', 'HEAD'), 'record': RECORD, 'recordSha256': hashlib.sha256(source.encode()).hexdigest(),
          'clean': git('status', '--porcelain') == '', 'rows': rows, 'allAsExpected': all(r['asExpected'] for r in rows)}
json.dump(result, open(out, 'w'), indent=1)
for row in rows:
    print(row['id'], row['tally'], 'survived', row['survived'], 'as expected' if row['asExpected'] else 'UNEXPECTED')
