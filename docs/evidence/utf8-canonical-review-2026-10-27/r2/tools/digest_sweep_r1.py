#!/usr/bin/env python3
"""Digest-citer sweep for the edited production files of PR 534 (review R-GP-IMPL-UTF8-CANONICAL-1).

For each edited file, at the base and at the head, the needles are: sha256 hex (full) and its first 8 hex,
and the git blob sha1 (full) and its first 8 hex. Every tracked file at the population commit is read as bytes
(git cat-file --batch); a hit records the file, its top-level tree, and how many hex characters of the digest
the occurrence matches. Method 2 is `git grep -F -l` of each 8-hex prefix at the same commit; the two file sets
must agree. Usage: digest_sweep.py <clone> <base> <head> <population-commit> <out.json>
"""
import hashlib, json, subprocess, sys

FILES = [
    'packages/three-surface-poc-core/src/authority-artifact-fields.ts',
    'packages/three-surface-poc-core/src/code-structure.ts',
    'packages/three-surface-poc-core/src/git-object-reader.ts',
    'packages/three-surface-poc-core/src/project-shape-manifest.ts',
    'packages/three-surface-poc-core/src/project-shape-observation.ts',
    'packages/polaris-generation-core/src/canonical-json.ts',
    'packages/support/src/index.ts',
    'packages/support/src/decode-utf8.ts',
]
GOVERNED = ('.syzygy/', 'openspec/', 'scripts/', '.github/')


def git(clone, *args, data=None):
    return subprocess.run(['git', '-C', clone, *args], input=data, capture_output=True, check=True).stdout


def blob(clone, commit, path):
    try:
        return git(clone, 'show', f'{commit}:{path}')
    except subprocess.CalledProcessError:
        return None


def main():
    clone, base, head, pop, out = sys.argv[1:6]
    needles = []
    for path in FILES:
        for side, commit in (('base', base), ('head', head)):
            b = blob(clone, commit, path)
            if b is None:
                continue
            s256 = hashlib.sha256(b).hexdigest()
            s1 = hashlib.sha1(b'blob %d\0' % len(b) + b).hexdigest()
            needles.append({'path': path, 'side': side, 'commit': commit, 'bytes': len(b), 'sha256': s256, 'gitBlob': s1})
    names = git(clone, 'ls-tree', '-r', '-z', '--name-only', pop).split(b'\0')
    names = [n.decode() for n in names if n]
    req = ''.join(f'{pop}:{n}\n' for n in names).encode()
    raw = git(clone, 'cat-file', '--batch', data=req)
    bodies, i = {}, 0
    for n in names:
        nl = raw.index(b'\n', i)
        header = raw[i:nl].split()
        size = int(header[2])
        bodies[n] = raw[nl + 1:nl + 1 + size]
        i = nl + 1 + size + 1
    hits = []
    for nd in needles:
        for kind in ('sha256', 'gitBlob'):
            full = nd[kind]
            pre = full[:8].encode()
            for n, body in bodies.items():
                start = body.find(pre)
                while start != -1:
                    k = 8
                    while k < len(full) and start + k < len(body) and body[start + k:start + k + 1].lower() == full[k].encode():
                        k += 1
                    hits.append({'needle': f"{nd['path']}@{nd['side']}:{kind}", 'file': n, 'offset': start,
                                 'matchedHex': k, 'governedTree': n.startswith(GOVERNED)})
                    start = body.find(pre, start + 1)
    # method 2: git grep -F -l per 8-hex prefix
    m2 = {}
    for nd in needles:
        for kind in ('sha256', 'gitBlob'):
            pre = nd[kind][:8]
            r = subprocess.run(['git', '-C', clone, 'grep', '-F', '-l', '-i', pre, pop], capture_output=True)
            m2[f"{nd['path']}@{nd['side']}:{kind}"] = sorted(x.split(':', 1)[1] for x in r.stdout.decode().split('\n') if x)
    m1 = {}
    for h in hits:
        m1.setdefault(h['needle'], set()).add(h['file'])
    agree = all(sorted(m1.get(k, set())) == v for k, v in m2.items())
    result = {
        'tool': 'digest_sweep.py', 'population': pop, 'filesInPopulation': len(names), 'needles': needles,
        'needleCount': len(needles) * 2, 'hits': hits, 'hitsInGovernedTrees': [h for h in hits if h['governedTree']],
        'method2FileSets': m2, 'methodsAgree': agree,
    }
    json.dump(result, open(out, 'w'), indent=1)
    print('files', len(names), 'needles', len(needles) * 2, 'hits', len(hits),
          'governedHits', len(result['hitsInGovernedTrees']), 'methodsAgree', agree)
    for h in hits:
        print(h['needle'], h['file'], 'matchedHex', h['matchedHex'])


if __name__ == '__main__':
    main()
