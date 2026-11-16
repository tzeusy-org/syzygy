"""syzygy-bpyt.8.32: read a vitest JSON report and require that exactly one test carries the given title and that its status is the
expected one. Prints the status found; exits 0 only on a match. Usage: row_status.py <report.json> <title> <expected-status>"""
import json, sys

report_file, title, expected = sys.argv[1:4]
report = json.load(open(report_file))
found = [test['status'] for result in report['testResults'] for test in result['assertionResults'] if test['title'] == title]
if len(found) != 1:
    print(f'Error: {len(found)} tests are titled {title!r}')
    sys.exit(1)
if found[0] != expected:
    print(f'Error: {title!r} is {found[0]}, expected {expected}')
    sys.exit(1)
print(f'{title!r} is {found[0]}')
