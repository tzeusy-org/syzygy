"""Summarise the lane's evidence records: subject commit, digests, headline figures (read-only)."""
import json
import pathlib
import sys

root = pathlib.Path(sys.argv[1])
for name in sorted(root.glob('*.json')):
    data = json.loads(name.read_text())
    keys = list(data)[:14] if isinstance(data, dict) else type(data).__name__
    print('==', name.name)
    print('  keys:', keys)
    for key in ('tool', 'treeCommit', 'commit', 'subjectCommit', 'headCommit', 'baseCommit', 'sha256AtCommit', 'mode', 'killed', 'mutants', 'control'):
        if isinstance(data, dict) and key in data:
            print(f'  {key}:', json.dumps(data[key])[:400])
