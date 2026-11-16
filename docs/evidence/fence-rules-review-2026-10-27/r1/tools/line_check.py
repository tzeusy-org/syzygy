#!/usr/bin/env python3
"""Line-level comment-only check (independent of ts.transpileModule, which also erases type-only edits).

Usage: line_check.py <repo> <base> <head> <path>...
For each path: every changed line pairs one removed line with one added line; the added line is the removed line plus a
trailing `// ...` comment, or both lines sit inside the same `/** ... */` block (the block's line count unchanged and every
non-comment byte equal). Prints one JSON row per path; exit 1 when any row is not comment-only.
"""
import difflib
import json
import subprocess
import sys


def show(repo, rev, path):
    return subprocess.run(['git', '-C', repo, 'show', f'{rev}:{path}'], check=True, capture_output=True).stdout.decode('utf8')


def in_block_comment(lines, index):
    # The line at `index` lies between a `/**` opener and its `*/` closer (inclusive).
    opener = None
    for i in range(index, -1, -1):
        if '*/' in lines[i] and i != index:
            return False
        if lines[i].lstrip().startswith('/**'):
            opener = i
            break
    if opener is None:
        return False
    for i in range(index, len(lines)):
        if '*/' in lines[i]:
            return True
    return False


def main():
    repo, base, head, *paths = sys.argv[1:]
    bad = 0
    for path in paths:
        a, b = show(repo, base, path).split('\n'), show(repo, head, path).split('\n')
        rows = []
        ok = True
        for tag, i1, i2, j1, j2 in difflib.SequenceMatcher(a=a, b=b, autojunk=False).get_opcodes():
            if tag == 'equal':
                continue
            if tag != 'replace' or (i2 - i1) != (j2 - j1):
                ok = False
                rows.append({'tag': tag, 'old': a[i1:i2], 'new': b[j1:j2]})
                continue
            for k in range(i2 - i1):
                old, new = a[i1 + k], b[j1 + k]
                trailing = new.startswith(old) and new[len(old):].startswith(' // ')
                block = in_block_comment(a, i1 + k) and in_block_comment(b, j1 + k)
                rows.append({'line': i1 + k + 1, 'kind': 'trailing-line-comment' if trailing else 'inside-block-comment' if block else 'CODE'})
                ok = ok and (trailing or block)
        print(json.dumps({'path': path, 'commentOnly': ok, 'changes': rows}))
        bad += 0 if ok else 1
    sys.exit(1 if bad else 0)


if __name__ == '__main__':
    main()
