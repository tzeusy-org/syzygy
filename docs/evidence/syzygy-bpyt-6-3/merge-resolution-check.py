#!/usr/bin/env python3
"""Check that a merge commit is what git's own three-way merge computes, except where the merge had to be resolved by hand.

Usage: merge-resolution-check.py <repo> <merge commit> [--selftest]

For the merge commit M with parents P1 and P2, git merge-tree --write-tree P1 P2 computes the automatic merge. Then:
  every path of the tree git computed without a conflict must be the same blob in M;
  every path that merge-tree reports as conflicted holds conflict markers in git's blob; M's blob must equal that blob with each
    marked region replaced by anything (the resolution), and the text outside the regions must be unchanged;
  every path in M's tree that git's tree does not hold, or that differs, and is not conflicted, is a difference and fails the check.
The output lists, per conflicted path, each region's two sides (and the base when the markers carry one) and the resolution text
found in M, so a reader can check the resolution by eye. Python `re`; git is called with -z.
--selftest runs the region reader on fixtures, including three mutations that must fail.
"""
import json
import re
import subprocess
import sys

MARKER = re.compile(r'<<<<<<< [^\n]*\n(?P<ours>.*?)(?:\|\|\|\|\|\|\| [^\n]*\n(?P<base>.*?))?=======\n(?P<theirs>.*?)>>>>>>> [^\n]*\n', re.S)


def fill_regions(marked, merged):
    """Return (ok, resolutions): merged equals marked with each marked region replaced by some text."""
    regions = list(MARKER.finditer(marked))
    if not regions:
        return marked == merged, []
    pieces, pos = [], 0
    for m in regions:
        pieces.append(marked[pos:m.start()])
        pos = m.end()
    pieces.append(marked[pos:])
    pattern = '(.*?)'.join(re.escape(p) for p in pieces)
    full = re.fullmatch(pattern, merged, re.S)
    if full is None:
        return False, []
    out = [{'ours': m.group('ours'), 'base': m.group('base'), 'theirs': m.group('theirs'), 'resolution': full.group(i + 1)} for i, m in enumerate(regions)]
    return True, out


def git(repo, *args, check=True):
    return subprocess.run(['git', '-C', repo, *args], capture_output=True, check=check)


def tree_blobs(repo, treeish):
    out = git(repo, 'ls-tree', '-r', '-z', treeish).stdout.decode().split('\0')
    blobs = {}
    for entry in out:
        if entry:
            meta, path = entry.split('\t', 1)
            mode, kind, oid = meta.split()
            blobs[path] = (mode, oid)
    return blobs


def check(repo, merge):
    p1, p2 = git(repo, 'rev-parse', merge + '^1').stdout.decode().strip(), git(repo, 'rev-parse', merge + '^2').stdout.decode().strip()
    mt = git(repo, '-c', 'merge.conflictStyle=diff3', 'merge-tree', '--write-tree', '-z', '--name-only', p1, p2, check=False)
    fields = mt.stdout.decode().split('\0')
    computed_tree = fields[0].strip()
    conflicted = conflicted_paths(fields) if mt.returncode == 1 else set()
    computed = tree_blobs(repo, computed_tree)
    merged = tree_blobs(repo, merge + '^{tree}')
    differences, resolved = [], []
    for path in sorted(set(computed) | set(merged)):
        if computed.get(path) == merged.get(path):
            continue
        if path in conflicted and path in computed and path in merged:
            ok, regions = fill_regions(git(repo, 'cat-file', 'blob', computed[path][1]).stdout.decode(), git(repo, 'cat-file', 'blob', merged[path][1]).stdout.decode())
            if ok:
                resolved.append({'path': path, 'regions': regions})
                continue
        differences.append({'path': path, 'inComputedTree': computed.get(path), 'inMerge': merged.get(path)})
    return {
        'merge': merge, 'parents': [p1, p2], 'computedTree': computed_tree, 'mergeTree': git(repo, 'rev-parse', merge + '^{tree}').stdout.decode().strip(),
        'mergeTreeExit': mt.returncode, 'paths': len(set(computed) | set(merged)),
        'pathsEqualToGitsMerge': sum(1 for p in set(computed) | set(merged) if computed.get(p) == merged.get(p)),
        'conflictedPathsResolvedByHand': resolved, 'pathsThatDifferWithoutBeingAResolvedConflict': differences,
    }


def conflicted_paths(fields):
    # `git merge-tree -z --name-only`: <tree>\0<conflicted paths...>\0\0<messages>; a path is conflicted if it is listed before the empty field.
    names = []
    for f in fields[1:]:
        if f == '':
            break
        names.append(f)
    return set(names)


def selftest():
    marked = 'a\n<<<<<<< x\nours\n||||||| base\nb\n=======\ntheirs\n>>>>>>> y\nz\n<<<<<<< x\nO2\n=======\nT2\n>>>>>>> y\nend\n'
    good = 'a\nunion\nz\nboth\nend\n'
    cases = {
        'a hand resolution of both regions passes': fill_regions(marked, good)[0] is True,
        'the reader returns both regions with the base of the first': [r['base'] for r in fill_regions(marked, good)[1]] == ['b\n', None],
        'the resolutions are the text found in the merge': [r['resolution'] for r in fill_regions(marked, good)[1]] == ['union\n', 'both\n'],
        'mutant: a change outside a region fails': fill_regions(marked, good.replace('a\n', 'A\n', 1))[0] is False,
        'mutant: a region left unresolved still has its text outside matched, but a dropped later segment fails': fill_regions(marked, 'a\nunion\nz\nboth\n')[0] is False,
        'mutant: the last segment altered fails': fill_regions(marked, good.replace('end', 'END'))[0] is False,
        'no markers: equal text passes': fill_regions('x\n', 'x\n')[0] is True,
        'no markers: different text fails': fill_regions('x\n', 'y\n')[0] is False,
    }
    return {'cases': len(cases), 'failures': [k for k, v in cases.items() if not v]}


if __name__ == '__main__':
    if '--selftest' in sys.argv:
        result = selftest()
        print(json.dumps(result))
        sys.exit(1 if result['failures'] else 0)
    print(json.dumps(check(sys.argv[1], sys.argv[2]), indent=1))
