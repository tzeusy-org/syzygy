#!/usr/bin/env python3
"""Mutate the merge 767588d4 (as new commits with the same parents, built with a private index; the worktree is not touched),
then run the lane's merge-resolution-check.py and the reviewer's union_order_check.py on each.
Usage: merge_check_mutants.py <repo> <merge-resolution-check.py> <union_order_check.py> <tmpdir> <out.json>"""
import json
import os
import subprocess
import sys

repo, mrc, uoc, tmp, out_path = sys.argv[1:6]
MERGE, P1, P2, BASE = '767588d4e1be3916839d57de5a976fe69885d6f7', '094cc542c127bdf672f9b676f959f44867c222ab', '546f1ff066e2ffef749c757cdb4621336039113b', 'c104771ff90f47ffd070f2339c36010458679c71'
os.makedirs(tmp, exist_ok=True)
INDEX = os.path.join(tmp, 'mutant.index')


def git(*a, inp=None, env=None):
    return subprocess.run(['git', '-C', repo, *a], input=inp, capture_output=True, check=True, env=env).stdout


def blob(path):
    return git('cat-file', 'blob', f'{MERGE}:{path}').decode()


def make(edits):
    env = dict(os.environ, GIT_INDEX_FILE=INDEX)
    git('read-tree', f'{MERGE}^{{tree}}', env=env)
    for e in edits:
        if e['op'] == 'write':
            oid = git('hash-object', '-w', '--stdin', inp=e['text'].encode()).decode().strip()
            git('update-index', '--add', '--cacheinfo', f"{e.get('mode', '100644')},{oid},{e['path']}", env=env)
        elif e['op'] == 'remove':
            git('update-index', '--force-remove', e['path'], env=env)
        elif e['op'] == 'chmod':
            oid = git('rev-parse', f"{MERGE}:{e['path']}").decode().strip()
            git('update-index', '--cacheinfo', f"100755,{oid},{e['path']}", env=env)
    tree = git('write-tree', env=env).decode().strip()
    return git('commit-tree', tree, '-p', P1, '-p', P2, '-m', 'reviewer merge mutant', env=dict(env, GIT_AUTHOR_NAME='r', GIT_AUTHOR_EMAIL='r@x', GIT_COMMITTER_NAME='r', GIT_COMMITTER_EMAIL='r@x', GIT_AUTHOR_DATE='2026-10-27T00:00:00Z', GIT_COMMITTER_DATE='2026-10-27T00:00:00Z')).decode().strip()


pkg = blob('package.json')
app_pkg = blob('apps/three-surface-poc/package.json')
HH = ' packages/http-host'
MUTANTS = [
    ('MM0-unmutated', []),
    ('MM1-lane-drop-http-host-dependency-line', [{'op': 'write', 'path': 'apps/three-surface-poc/package.json', 'text': app_pkg.replace('    "@syzygy/http-host": "0.0.0",\n', '', 1)}]),
    ('MM2-region-drops-http-host-from-build-only', [{'op': 'write', 'path': 'package.json', 'text': pkg.replace('"build": "tsc -b packages/support packages/cap1-core packages/http-host', '"build": "tsc -b packages/support packages/cap1-core', 1)}]),
    ('MM3-region-keeps-ours-only', [{'op': 'write', 'path': 'package.json', 'text': pkg.replace(HH, '')}]),
    ('MM4-region-drops-support-from-typecheck', [{'op': 'write', 'path': 'package.json', 'text': pkg.replace('"typecheck": "tsc -b packages/support ', '"typecheck": "tsc -b ', 1)}]),
    ('MM5-region-misorders-support-after-its-importers', [{'op': 'write', 'path': 'package.json', 'text': pkg.replace('"build": "tsc -b packages/support packages/cap1-core', '"build": "tsc -b packages/cap1-core', 1).replace('packages/polaris-dossier",\n    "build:poc"', 'packages/polaris-dossier packages/support",\n    "build:poc"', 1)}]),
    ('MM6-outside-region-edit-in-package-json', [{'op': 'write', 'path': 'package.json', 'text': pkg.replace('"test": "vitest run",', '"test": "vitest run --passWithNoTests",', 1)}]),
    ('MM7-file-added', [{'op': 'write', 'path': 'packages/support/src/extra.ts', 'text': 'export const X = 1;\n'}]),
    ('MM8-file-removed', [{'op': 'remove', 'path': 'packages/http-host/src/escape-html.ts'}]),
    ('MM9-mode-change', [{'op': 'chmod', 'path': 'packages/support/src/sha256.ts'}]),
]
rows = []
for mid, edits in MUTANTS:
    commit = make(edits) if edits else MERGE
    r = subprocess.run([sys.executable, '-I', mrc, repo, commit], capture_output=True, text=True)
    res = json.loads(r.stdout)
    u = subprocess.run([sys.executable, '-I', uoc, repo, commit, P1, P2, BASE], capture_output=True, text=True)
    union = json.loads(u.stdout)['union'] if u.returncode == 0 else {'error': u.stderr[-300:]}
    union_ok = all(v['setEqualsUnion'] and v['noDuplicates'] and v['oursOrderKept'] and v['theirsOrderKept'] for v in union.values()) if 'error' not in union else None
    rows.append({'id': mid, 'commit': commit, 'edits': [{k: (v if k != 'text' else f'<{len(v)} chars>') for k, v in e.items()} for e in edits],
                 'mergeCheckExit': r.returncode, 'pathsEqualToGitsMerge': res['pathsEqualToGitsMerge'], 'paths': res['paths'],
                 'differences': [d['path'] for d in res['pathsThatDifferWithoutBeingAResolvedConflict']],
                 'resolvedByHand': [d['path'] for d in res['conflictedPathsResolvedByHand']],
                 'mergeCheckReports': bool(res['pathsThatDifferWithoutBeingAResolvedConflict']),
                 'unionCheck': {k: {x: y for x, y in v.items() if x != 'merge'} for k, v in union.items()} if 'error' not in union else union,
                 'unionCheckPasses': union_ok})
    print(mid, 'merge-check exit', r.returncode, 'reports', rows[-1]['mergeCheckReports'], rows[-1]['differences'], 'union ok', union_ok, flush=True)
json.dump({'merge': MERGE, 'rows': rows}, open(out_path, 'w'), indent=1)
