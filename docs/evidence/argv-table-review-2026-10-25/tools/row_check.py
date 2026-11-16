"""rev-521: exactly one test titled <title> in a vitest JSON report, with status <expected>. Usage: row_check.py <report> <title> <expected>"""
import json, sys
report, title, expected = sys.argv[1:4]
found = [t['status'] for r in json.load(open(report))['testResults'] for t in r['assertionResults'] if t['title'] == title]
print(f'row {title!r}: {found}')
sys.exit(0 if found == [expected] else 1)
