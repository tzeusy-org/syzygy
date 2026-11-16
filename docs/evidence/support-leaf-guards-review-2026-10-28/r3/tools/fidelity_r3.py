#!/usr/bin/env python3
"""Round 3: is support-purity.test.ts at 191d8277 / 12d70cf0 exactly ecea355b with lines 60 and 64 replaced
by round 2's two fix texts, and is every other test or source file under packages/ and apps/ unchanged?"""
import hashlib, json, subprocess, sys

repo, r2tools, out = sys.argv[1], sys.argv[2], sys.argv[3]
PATH = 'packages/support/src/support-purity.test.ts'


def show(rev, path):
    return subprocess.run(['git', '-C', repo, 'show', f'{rev}:{path}'], check=True, capture_output=True).stdout


def lines(b):
    return b.split(b'\n')


res = {}
fix_list = open(f'{r2tools}/fix-r2-sources-list.ts.txt', 'rb').read()
fix_expect = open(f'{r2tools}/fix-r2-sources-expect.ts.txt', 'rb').read()
res['fixFiles'] = {
    'list': {'sha256': hashlib.sha256(fix_list).hexdigest(), 'bytes': len(fix_list), 'nbsp': fix_list.decode().count(chr(0xa0)),
             'endsNewline': fix_list.endswith(b'\n')},
    'expect': {'sha256': hashlib.sha256(fix_expect).hexdigest(), 'bytes': len(fix_expect), 'nbsp': fix_expect.decode().count(chr(0xa0)),
               'endsNewline': fix_expect.endswith(b'\n')},
}
fl = fix_list.rstrip(b'\n')
fe = fix_expect.rstrip(b'\n')
assert b'\n' not in fl and b'\n' not in fe
base = lines(show('ecea355b', PATH))
for rev in ['191d8277', '12d70cf0']:
    new = lines(show(rev, PATH))
    expected = list(base)
    expected[59] = fl
    expected[63] = fe
    diffs = [i + 1 for i in range(max(len(base), len(new))) if i >= len(base) or i >= len(new) or base[i] != new[i]]
    res[rev] = {
        'lineCountBase': len(base), 'lineCountNew': len(new),
        'line60EqualsFix': new[59] == fl, 'line64EqualsFix': new[63] == fe,
        'fileEqualsBaseWithTwoLinesReplaced': new == expected,
        'linesDifferingFromBase': diffs,
        'nbspInFile': b'\xc2\xa0' in b'\n'.join(new),
        'sha256': hashlib.sha256(b'\n'.join(new)).hexdigest(),
    }
# Every path under packages/ or apps/ that differs between ecea355b and each head.
for rev in ['191d8277', '12d70cf0']:
    names = subprocess.run(['git', '-C', repo, 'diff', '--name-only', 'ecea355b', rev, '--', 'packages', 'apps'],
                           check=True, capture_output=True, text=True).stdout.split()
    res[f'implPathsChanged_{rev}'] = names
# Every tracked path changed between the code head and the evidence head.
res['paths_191d8277_to_12d70cf0'] = subprocess.run(['git', '-C', repo, 'diff', '--name-only', '191d8277', '12d70cf0'],
                                                   check=True, capture_output=True, text=True).stdout.split()
json.dump(res, open(out, 'w'), indent=2)
print(json.dumps(res, indent=2))
