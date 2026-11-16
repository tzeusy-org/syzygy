"""rev-524: collect every retained island-boundary mutant of the 8.1 and 8.23-era reviews whose tests include island-boundary.test.ts,
and keep those whose `old` (and every `also` edit) occurs exactly once at both base and head, read from the git objects.

Usage: python3 -I island_specs.py <repo> <base> <head> <out.json>
"""
import ast, json, subprocess, sys

repo, base, head, out_file = sys.argv[1:5]
SOURCES = ['docs/evidence/island-decoupling-review-2026-10-22/mutants-reviewer.json',
           'docs/evidence/island-decoupling-review-2026-10-22/mutants-lane-rerun.json',
           'docs/evidence/consent-live-module-review-2026-10-24/reviewer-boundary-mutants.json']
TEST = 'packages/polaris-generation-core/src/island-boundary.test.ts'


def show(commit, path):
    r = subprocess.run(['git', 'show', f'{commit}:{path}'], cwd=repo, capture_output=True)
    return r.stdout.decode() if r.returncode == 0 else None


kept, skipped = [], []
for source in SOURCES:
    record = json.loads(show(head, source))
    for m in record['mutants']:
        tests = m['tests'] if isinstance(m['tests'], list) else ast.literal_eval(m['tests'])
        if TEST not in tests:
            continue
        edits = [{'file': m['file'], 'old': m['old'], 'new': m['new']}]
        also = m.get('also') or []
        if isinstance(also, str):
            also = ast.literal_eval(also)
        edits += [{'file': a.get('file', m['file']), 'old': a['old'], 'new': a['new']} for a in also]
        counts = []
        for e in edits:
            counts.append({'file': e['file'], 'base': (show(base, e['file']) or '').count(e['old']),
                           'head': (show(head, e['file']) or '').count(e['old'])})
        row = {'id': f"{source.split('/')[2][:6]}:{m['id']}", 'source': source, 'recordedOutcome': m['outcome'], 'counts': counts}
        if all(c['base'] == 1 and c['head'] == 1 for c in counts):
            kept.append({**row, 'edits': edits, 'projects': [m['project']], 'files': [TEST]})
        else:
            skipped.append(row)
json.dump({'mutants': kept, 'skipped': skipped}, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('kept', len(kept), 'skipped', len(skipped))
for k in kept:
    print('  keep', k['id'], k['recordedOutcome'])
for s in skipped:
    print('  skip', s['id'], s['recordedOutcome'], s['counts'])
