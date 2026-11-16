#!/usr/bin/env python3
"""Compare two `npx vitest list` outputs as multisets of full test lines.

Usage: compare_test_lists.py <base-list.txt> <head-list.txt> <out.json> <base-tree> <head-tree>

<base-tree> and <head-tree> are the git checkouts the two lists were produced in
(`npx vitest list` run at each tree's root); the record names each tree's commit
and whether it had tracked changes, and the sha256 of each list file.

Each line is "[project] file > describe > test". A name present in both is
unchanged; "changed" is counted as a removed name together with an added name
in the same file, which this comparison reports separately by file.
"""
import hashlib
import json
import subprocess
import sys
from collections import Counter
from pathlib import Path


def tree_state(tree: Path) -> dict:
    git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    return {'commit': git('rev-parse', 'HEAD'), 'trackedFilesModified': bool(git('status', '--porcelain', '--untracked-files=no'))}


def main() -> int:
    base_path, head_path, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    base_tree, head_tree = Path(sys.argv[4]), Path(sys.argv[5])
    base = Counter(base_path.read_text(encoding='utf-8').splitlines())
    head = Counter(head_path.read_text(encoding='utf-8').splitlines())
    added, removed = head - base, base - head
    by_file = lambda counter: dict(sorted(Counter(line.split(' > ')[0] for line in counter.elements()).items()))
    record = {
        'tool': 'compare_test_lists.py',
        'baseTree': tree_state(base_tree) | {'listSha256': hashlib.sha256(base_path.read_bytes()).hexdigest()},
        'headTree': tree_state(head_tree) | {'listSha256': hashlib.sha256(head_path.read_bytes()).hexdigest()},
        'baseLines': sum(base.values()),
        'headLines': sum(head.values()),
        'baseDistinctNames': len(base),
        'headDistinctNames': len(head),
        'added': sum(added.values()),
        'removed': sum(removed.values()),
        'addedByFile': by_file(added),
        'removedByFile': by_file(removed),
        'testsLine': f'Tests: +{sum(added.values())} ~0 -{sum(removed.values())}',
    }
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(record['testsLine'], f"(base {record['baseLines']}, head {record['headLines']})")
    return 0


if __name__ == '__main__':
    sys.exit(main())
