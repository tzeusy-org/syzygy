#!/usr/bin/env python3
"""Prove a follow-up changed comments only, and that the retained export still resolves.

Usage: comment_only_check.py <tree> <old-commit> <out.json> [--merge-with <ref>]

For every file under packages/ and apps/ that differs between the baseline and
the tree's working files, prints both versions with TypeScript's printer,
removeComments true (ts_printer.py), and compares the prints. A print keeps the
text of strings and template literals byte for byte, so an edit to whitespace or
a blank line inside a literal is a code change here; layout outside literals is
normalised. (The earlier form compared strip_comments output with blank lines
and trailing blanks dropped everywhere, which read such an edit as comment-only:
review R-GP-IMPL-POC-CORE-HYGIENE-2, N8.) The baseline is <old-commit>, or,
with --merge-with, the tree git builds by merging <old-commit> with <ref>
(`git merge-tree --write-tree`): changes that arrived from <ref> (for example a
merge of main after the reviewed commit) are then part of the baseline, and only
this branch's own edits are tested. A file added or deleted since the baseline
counts as not comment-only. Then, from the tree's built dist (run `npm run
build` first), checks that dist/evidence-population.js exports
derivePopulationBlock and that the package barrel (dist/index.js) re-exports the
same function under the same name: the retained measurement script requires that
dist file by path.

The record names the tree's commit and whether packages/ or apps/ had tracked
changes at the time, the baseline, and, with --merge-with, the ref and its commit.
"""
import hashlib
import json
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from ts_printer import print_without_comments  # noqa: E402


def main() -> int:
    tree, old, out = Path(sys.argv[1]).resolve(), sys.argv[2], Path(sys.argv[3])
    git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
    baseline, merged_with = old, None
    if '--merge-with' in sys.argv:
        ref = sys.argv[sys.argv.index('--merge-with') + 1]
        baseline = git('merge-tree', '--write-tree', old, ref).splitlines()[0]
        merged_with = {'ref': ref, 'commit': git('rev-parse', ref).strip(), 'baselineTree': baseline}
    changed = []
    for line in git('diff', '--name-status', baseline, '--', 'packages', 'apps').splitlines():
        status, path = line.split('\t', 1)
        before = git('show', f'{baseline}:{path}') if status != 'A' else ''
        after = (tree / path).read_text(encoding='utf-8') if status != 'D' else ''
        changed.append((status, path, before, after))
    printable = [(status, path, before, after) for status, path, before, after in changed if status == 'M']
    prints = iter(print_without_comments([(path, text) for _, path, before, after in printable for text in (before, after)]))
    printed = {path: (next(prints), next(prints)) for _, path, _, _ in printable}
    files = []
    for status, path, before, after in changed:
        files.append({'file': path, 'status': status, 'sha256Before': hashlib.sha256(before.encode()).hexdigest(), 'sha256After': hashlib.sha256(after.encode()).hexdigest(),
                      'identicalAfterCommentStrip': status == 'M' and printed[path][0] == printed[path][1]})
    script = ("const m = await import(process.argv[1] + '/packages/three-surface-poc-core/dist/evidence-population.js');"
              "const b = await import(process.argv[1] + '/packages/three-surface-poc-core/dist/index.js');"
              "console.log(JSON.stringify({moduleExportsFunction: typeof m.derivePopulationBlock === 'function', barrelReexportsSameFunction: typeof b.derivePopulationBlock === 'function' && b.derivePopulationBlock === m.derivePopulationBlock}));")
    node = json.loads(subprocess.run(['node', '--input-type=module', '-e', script, str(tree)], capture_output=True, text=True, check=True).stdout)
    record = {
        'tool': 'comment_only_check.py',
        'toolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'oldCommit': old,
        'mergedWith': merged_with,
        'treeCommit': git('rev-parse', 'HEAD').strip(),
        'trackedChangesUnderPackagesAndApps': [l for l in git('status', '--porcelain', '--untracked-files=no', '--', 'packages', 'apps').splitlines() if l],
        'filesChanged': len(files),
        'allIdenticalAfterCommentStrip': all(f['identicalAfterCommentStrip'] for f in files),
        'files': files,
        'retainedExport': {'distPath': 'packages/three-surface-poc-core/dist/evidence-population.js', 'name': 'derivePopulationBlock', **node},
    }
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(f"changed={len(files)} allCommentOnly={record['allIdenticalAfterCommentStrip']} retainedExport={node}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
