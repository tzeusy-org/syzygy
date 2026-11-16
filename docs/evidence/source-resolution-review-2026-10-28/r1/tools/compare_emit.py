#!/usr/bin/env python3
"""Compare the emitted dist trees of two built checkouts (base, head), file by file.

Usage: compare_emit.py <base checkout> <head checkout> <out.json>
Every file under {apps,packages}/*/dist is enumerated in both. A file is a test output when its name, minus the emit
suffix, ends in `.test` (from `*.test.ts`). Reports counts per suffix class, the byte comparison of every file emitted at
head, and every file emitted at base and not at head.
"""
import hashlib, json, os, re, sys

SUFFIXES = ['.d.ts.map', '.js.map', '.d.ts', '.js', '.tsbuildinfo']


def emitted(root):
    out = {}
    for parent in ('apps', 'packages'):
        for project in sorted(os.listdir(os.path.join(root, parent))):
            dist = os.path.join(root, parent, project, 'dist')
            if not os.path.isdir(dist):
                continue
            for dirpath, _dirs, files in os.walk(dist):
                for name in files:
                    full = os.path.join(dirpath, name)
                    rel = os.path.relpath(full, root)
                    with open(full, 'rb') as fh:
                        out[rel] = hashlib.sha256(fh.read()).hexdigest()
    return out


def kind(path):
    for suffix in SUFFIXES:
        if path.endswith(suffix):
            stem = path[: -len(suffix)]
            return suffix, stem.endswith('.test')
    return 'other', False


def main():
    base, head, out = sys.argv[1:4]
    b, h = emitted(base), emitted(head)
    report = {'base': {}, 'head': {}, 'headVsBase': {}, 'baseOnlyNonTest': [], 'headOnly': [], 'differing': []}
    for name, tree in (('base', b), ('head', h)):
        counts = {}
        for path in tree:
            suffix, is_test = kind(path)
            key = f'{suffix} {"test" if is_test else "product"}'
            counts[key] = counts.get(key, 0) + 1
        report[name] = dict(sorted(counts.items()))
        report[name]['total'] = len(tree)
    same = 0
    for path, digest in sorted(h.items()):
        if path not in b:
            report['headOnly'].append(path)
        elif b[path] == digest:
            same += 1
        else:
            report['differing'].append(path)
    for path in sorted(b):
        if path not in h and not kind(path)[1]:
            report['baseOnlyNonTest'].append(path)
    report['headVsBase'] = {'headFiles': len(h), 'identical': same, 'differing': len(report['differing']), 'headOnly': len(report['headOnly'])}
    json.dump(report, open(out, 'w'), indent=2)
    json.dump(report['headVsBase'], sys.stdout)
    print()
    print('base', report['base'])
    print('head', report['head'])
    print('differing', report['differing'])
    print('headOnly', report['headOnly'])
    print('baseOnlyNonTest', report['baseOnlyNonTest'])


main()
