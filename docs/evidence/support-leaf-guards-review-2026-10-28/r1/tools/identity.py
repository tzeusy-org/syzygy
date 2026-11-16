#!/usr/bin/env python3
"""Re-derive the shared reader/list byte-identity claim (syzygy-bpyt.6.14, R-GP-IMPL-SUPPORT-LEAF-GUARDS-1).

Usage: identity.py <clone> <base> <head>

Reads the comment filter, the three specifier regexes and the forbidden list from the testkit at <head>, and from the two
copies it replaced at <base> (support-purity.test.ts and owner-act-drafter.test.ts), and compares them byte for byte after
stripping only the surrounding JavaScript (`.map(...)` tails and the `!` non-null assertion are reported, not hidden).
"""
import json
import re
import subprocess
import sys

clone, base, head = sys.argv[1:4]


def show(commit, path):
    return subprocess.run(['git', '-C', clone, 'show', f'{commit}:{path}'], capture_output=True, text=True, check=True).stdout


FILTER = re.compile(r"source\.split\('\\n'\)\.filter\(\(line\) => !line\.trimStart\(\)\.startsWith\('//'\)\)\.join\('\\n'\)")
REGEX = re.compile(r"code\.matchAll\((/.*?/g?m?)\)\]\.map\(\(match\) => match\[1\](!?)\)")
LIST = re.compile(r"(\[/\\brequire\\\(/.*?/\])(?:;|\))")


def parts(text):
    return {
        'filter': FILTER.findall(text),
        'regexes': [r for r, _ in REGEX.findall(text)],
        'nonNull': [b for _, b in REGEX.findall(text)],
        'forbidden': LIST.findall(text),
    }


kit = parts(show(head, 'packages/support/src/purity.testkit.ts'))
old_support = parts(show(base, 'packages/support/src/support-purity.test.ts'))
old_drafter = parts(show(base, 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'))
new_support = parts(show(head, 'packages/support/src/support-purity.test.ts'))
new_drafter = parts(show(head, 'packages/three-surface-poc-core/src/owner-act-drafter.test.ts'))
out = {
    'base': base, 'head': head,
    'counts': {k: {n: len(v[n]) for n in v} for k, v in
               [('testkit', kit), ('baseSupport', old_support), ('baseDrafter', old_drafter), ('headSupport', new_support), ('headDrafter', new_drafter)]},
    'filterEqual': kit['filter'] == old_support['filter'] == old_drafter['filter'] and len(kit['filter']) == 1,
    'regexesEqual': kit['regexes'] == old_support['regexes'] == old_drafter['regexes'] and len(kit['regexes']) == 3,
    'forbiddenEqual': kit['forbidden'] == old_support['forbidden'] == old_drafter['forbidden'] and len(kit['forbidden']) == 1,
    'nonNullAssertions': {'testkit': kit['nonNull'], 'baseSupport': old_support['nonNull'], 'baseDrafter': old_drafter['nonNull']},
    'headCopiesLeft': {'support': new_support, 'drafter': new_drafter},
    'regexes': kit['regexes'],
    'forbidden': kit['forbidden'],
}
print(json.dumps(out, indent=1))
