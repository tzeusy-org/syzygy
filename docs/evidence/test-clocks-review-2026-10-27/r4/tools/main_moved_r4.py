#!/usr/bin/env python3
"""rev-532d (round 4): which PR paths, daemon-entry-bound inputs and CPU-region closure files main changed. Reviewer tool, not authority.

usage: python3 -I main_moved_r4.py CLONE REGION_CLOSURE_JSON OUT.json FROM TO PR_HEAD

Lists every path `git diff --name-only FROM TO` gives, the PR's paths (`git diff --name-only FROM PR_HEAD`), the four
inputs the daemon-entry runs bind (build_record's MAIN, STATE, SHUT, DE_TEST) and the files of rev-532c's region closures,
and for each watched path whether TO changed it since FROM, with the blob at FROM, TO and PR_HEAD and the commits.
"""
import json, subprocess, sys

clone, closure_path, out_path, frm, to, head = sys.argv[1:7]
git = lambda *a: subprocess.run(['git', *a], cwd=clone, capture_output=True, text=True, check=True).stdout
blob = lambda c, p: (subprocess.run(['git', 'rev-parse', f'{c}:{p}'], cwd=clone, capture_output=True, text=True).stdout.strip() or None)
moved = set(p for p in git('diff', '--name-only', frm, to).split('\n') if p)
pr = sorted(p for p in git('diff', '--name-only', frm, head).split('\n') if p)
bound = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/src/state-directory.ts', 'packages/http-host/src/shutdown.ts',
         'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts']
closure = sorted({f for v in json.load(open(closure_path, encoding='utf8')).values() for f in v['closure']})
def row(p):
    return {'path': p, 'movedOnMain': p in moved, 'blob': {frm: blob(frm, p), to: blob(to, p), head: blob(head, p)},
            'commits': git('log', '--format=%h %s', f'{frm}..{to}', '--', p).splitlines()}
out = {'from': git('rev-parse', frm).strip(), 'to': git('rev-parse', to).strip(), 'prHead': git('rev-parse', head).strip(),
       'mainChangedPaths': len(moved), 'prPaths': len(pr), 'closureFiles': len(closure),
       'prPathsMoved': [row(p) for p in pr if p in moved], 'boundInputs': [row(p) for p in bound],
       'closureMoved': [row(p) for p in closure if p in moved]}
json.dump(out, open(out_path, 'w', encoding='utf8'), indent=1)
print(json.dumps({'mainChangedPaths': len(moved), 'prPaths': len(pr), 'prPathsMoved': [r['path'] for r in out['prPathsMoved']],
                  'boundMoved': [r['path'] for r in out['boundInputs'] if r['movedOnMain']], 'closureFiles': len(closure),
                  'closureMoved': [r['path'] for r in out['closureMoved']]}))
