#!/usr/bin/env python3
"""N9(d): the shared testkit's reader and forbidden list are the two copies they replace, byte for byte.

Usage: shared_reader_identity.py <repo> <base commit> <head commit> <out.json>

Reads, by `git show`, the base copies (packages/support/src/support-purity.test.ts and
packages/three-surface-poc-core/src/owner-act-drafter.test.ts) and the head testkit (packages/support/src/purity.testkit.ts), and
extracts from each with Python `re`: the comment-line filter, the three `code.matchAll(...)` regex literals in order, and the
forbidden list's bracketed text. Every extraction must find exactly what it names; the record says whether the three agree.
"""
import hashlib
import json
import re
import subprocess
import sys

FILTER = re.compile(r"const code = (source\.split\('\\n'\)\.filter\(\(line\) => !line\.trimStart\(\)\.startsWith\('//'\)\)\.join\('\\n'\));")
MATCH_ALL = re.compile(r"code\.matchAll\((/[^\n]+?/(?:gm|g))\)\]")
LISTS = {
    'support-base': re.compile(r"^const FORBIDDEN = (\[[^\n]*\]);$", re.M),
    'drafter-base': re.compile(r"^    for \(const forbidden of (\[[^\n]*\])\) \{$", re.M),
    'testkit-head': re.compile(r"^export const FORBIDDEN: readonly RegExp\[\] = (\[[^\n]*\]);$", re.M),
}
COPIES = {
    'support-base': ('base', 'packages/support/src/support-purity.test.ts'),
    'drafter-base': ('base', 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'),
    'testkit-head': ('head', 'packages/support/src/purity.testkit.ts'),
}


def main():
    repo, base, head, out_path = sys.argv[1:5]
    commits = {'base': base, 'head': head}
    copies = {}
    for name, (side, path) in COPIES.items():
        text = subprocess.run(['git', '-C', repo, 'show', f'{commits[side]}:{path}'], capture_output=True, text=True, check=True).stdout
        filters = FILTER.findall(text)
        regexes = MATCH_ALL.findall(text)
        lists = LISTS[name].findall(text)
        assert len(filters) == 1 and len(regexes) == 3 and len(lists) == 1, (name, len(filters), len(regexes), len(lists))
        copies[name] = {'commit': commits[side], 'path': path, 'blob': subprocess.run(['git', '-C', repo, 'rev-parse', f'{commits[side]}:{path}'],
                                                                                    capture_output=True, text=True, check=True).stdout.strip(),
                        'filter': filters[0], 'regexes': regexes, 'forbidden': lists[0],
                        'sha256': hashlib.sha256('\n'.join([filters[0], *regexes, lists[0]]).encode()).hexdigest()}
    names = list(copies)
    agree = {part: all(copies[n][part] == copies[names[0]][part] for n in names) for part in ['filter', 'regexes', 'forbidden']}
    record = {'base': base, 'head': head, 'copies': copies, 'agree': agree, 'allAgree': all(agree.values())}
    json.dump(record, open(out_path, 'w'), indent=1)
    print(json.dumps({'agree': agree, 'sha256': {n: copies[n]['sha256'] for n in names}}, indent=1))


if __name__ == '__main__':
    main()
