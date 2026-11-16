"""Compare a re-run of the lane's mutants.py with its committed record, row by row (failing set, exit, passed, failed).
Usage: compare_lane_records.py <committed.json> <rerun.json>"""
import json, sys
a, b = (json.load(open(p)) for p in sys.argv[1:3])
ra, rb = ({r['id']: r for r in d['rows']} for d in (a, b))
diff = [i for i in ra if i not in rb or any(ra[i][k] != rb[i][k] for k in ('failing', 'exit', 'passed', 'failed', 'asExpected'))]
print({'committedCommit': a['commit'], 'rerunCommit': b['commit'], 'rows': len(ra), 'rerunRows': len(rb), 'differing': diff,
       'rerunSummary': b['summary'], 'rerunStatusAfter': b['statusAfter']})
