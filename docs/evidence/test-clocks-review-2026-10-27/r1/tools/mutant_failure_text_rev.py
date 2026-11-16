#!/usr/bin/env python3
"""rev-532: re-run named rule-6 cases from the lane's mutant-cases.json at the head and keep each failed row's full
failure message, to see WHICH predicate fails (the lane's record keeps only the first line). Reviewer tool, not authority.

usage: python3 -I mutant_failure_text_rev.py TREE CASES.json OUT.json CASE-ID ...
"""
import json, os, subprocess, sys, tempfile

tree, cases_path, out_path, ids = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4:]
cases = {c['id']: c for c in json.load(open(cases_path, encoding='utf8'))}
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
out = []
for cid in ids:
    c, saved = cases[cid], {}
    try:
        for m in c['mutations']:
            t = open(os.path.join(tree, m['file']), encoding='utf8').read()
            assert t.count(m['old']) == 1, (cid, m['file'])
            saved.setdefault(m['file'], t); open(os.path.join(tree, m['file']), 'w', encoding='utf8').write(t.replace(m['old'], m['new']))
        report = tempfile.mktemp(suffix='.json')
        d = subprocess.run(['npx', 'vitest', 'run', c['test'], '-t', c['title'], *c.get('vitestArgs', []), '--reporter=json', f'--outputFile={report}'],
                           cwd=tree, capture_output=True, text=True, timeout=c.get('limitSeconds', 300) + 60,
                           env={k: v for k, v in os.environ.items() if not k.startswith('VITEST')})
        rows = []
        if os.path.exists(report):
            for s in json.load(open(report))['testResults']:
                rows += [{'title': a['fullName'], 'status': a['status'], 'failure': '\n'.join((a.get('failureMessages') or [''])[0].split('\n')[:4])[:600]}
                         for a in s['assertionResults'] if c['title'] in a['fullName']]
            os.remove(report)
        out.append({'id': cid, 'exit': d.returncode, 'rows': rows})
        print(json.dumps(out[-1])[:900], flush=True)
    finally:
        for rel, t in saved.items(): open(os.path.join(tree, rel), 'w', encoding='utf8').write(t)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump(out, open(out_path, 'w'), indent=1)
