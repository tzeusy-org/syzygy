#!/usr/bin/env python3
"""Compare SHA-256 call traces of the full Vitest suite at the base and the head for syzygy-bpyt.6.3.

Usage: compare-hash-trace.py <base-run-1> <base-run-2> <head-run> --repo <git dir> --base <commit> --head <commit>
                             --tmp <private TMPDIR> [--sites <sweep.py output at the base>]

Each run directory holds the *.jsonl that hash-trace.cjs wrote while the suite ran (one record per finished
createHash: algorithm, digest encoding, input length, sha256 of the input bytes, sha256 of the output, and the
first stack frame outside node internals, node_modules and the shared helper). The preload interposes on
node:crypto, so it sees every hash the suite makes whichever source line made it. All three runs are made in the
same checkout path, so a hash of a path is the same in each.

Method
  key        (algorithm, encoding, input length, input digest, output digest) of one record.
  site       the record's frame, repository-relative. A frame under --tmp (a test's own temporary checkout) keeps
             its path below the random directory; a frame outside the repository and --tmp is <node-internal>.
  control    the base is run twice. A key whose count differs between the two runs is nondeterministic.
  1. Every site under packages/ or apps/ is counted per algorithm in the three runs. Equal counts, or a named move
     of a helper's calls between files, are the expected outcome.
  2. Every key with a stable count in the two base runs must have the same count in the head run. A key that does
     not is classified by its input: the input digest is the digest of a blob that exists only at the base
     (or only at the head) between the two commits, i.e. the suite hashed a source file the change edited; any
     other input is listed.
  3. Keys that appear in the head run and in neither base run are classified the same way, then by site and
     input length against the nondeterministic keys of the base runs.
  A key whose every site is <node-internal> or <none> is infrastructure (a frame inside node or node_modules, such as
  the test runner hashing a module's text); infrastructure keys are counted, never classified, and are outside the
  claim: the claim is about hashes made from repository code.
  The surface version (apps/three-surface-poc/src/walkthrough-inputs.ts, pwbSurfaceVersion) hashes the ids of two
  source trees, which the change moves by construction; its input digest is recomputed from git for both commits.
  Records whose site is under packages/support/ are the new package's own tests and are counted and set aside.
Exit status 0 when every difference is classified; 1 when any is left over.
"""
import hashlib
import json
import os
import re
import subprocess
import sys
from collections import Counter, defaultdict


def load(directory):
    records = []
    for name in sorted(os.listdir(directory)):
        if name.endswith('.jsonl'):
            with open(os.path.join(directory, name), encoding='utf-8') as fh:
                records.extend(json.loads(line) for line in fh if line.strip())
    return records


def option(name):
    return sys.argv[sys.argv.index(name) + 1]


def blob_digests(repo, commit):
    names = [n for n in subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout.decode().split('\0') if n]
    out = subprocess.run(['git', '-C', repo, 'cat-file', '--batch'], input=''.join(f'{commit}:{n}\n' for n in names).encode(), capture_output=True, check=True).stdout
    digests, pos = {}, 0
    for n in names:
        end = out.index(b'\n', pos)
        size = int(out[pos:end].decode().split()[2])
        digests[hashlib.sha256(out[end + 1:end + 1 + size]).hexdigest()] = n
        pos = end + 1 + size + 1
    return digests


def main():
    runs = [a for a in sys.argv[1:4]]
    repo, base, head, tmp = option('--repo'), option('--base'), option('--head'), option('--tmp').rstrip('/')
    tmp_site = re.compile('^' + re.escape(tmp) + r'/[^/]+/(?:checkout/)?')

    def site_of(raw):
        if raw.startswith(('packages/', 'apps/', 'scripts/')) or raw == '<none>':
            return raw
        if tmp_site.match(raw):
            return '<tmp>/' + tmp_site.sub('', raw)
        return '<node-internal>'

    b1, b2, h = (load(d) for d in runs)
    for r in b1 + b2 + h:
        r['site'] = site_of(r['site'])
    own = [r for r in h if r['site'].startswith('packages/support/')]
    h = [r for r in h if not r['site'].startswith('packages/support/')]

    def key(r):
        return (r['alg'], r['enc'], r['inLen'], r['inDigest'], r['outDigest'])

    def describe(k):
        return {'algorithm': k[0], 'encoding': k[1], 'inputBytes': k[2], 'inputSha256': k[3]}

    def by_alg(records):
        return dict(sorted(Counter(r['alg'] for r in records).items()))

    # 1. per-site counts, repository code only
    def per_site(records):
        c = Counter()
        for r in records:
            if r['site'].startswith(('packages/', 'apps/')):
                c[(r['site'], r['alg'])] += 1
        return c
    s1, s2, sh = per_site(b1), per_site(b2), per_site(h)
    site_rows = [{'site': s, 'algorithm': a, 'base1': s1[(s, a)], 'base2': s2[(s, a)], 'head': sh[(s, a)]}
                 for (s, a) in sorted(set(s1) | set(s2) | set(sh)) if not (s1[(s, a)] == s2[(s, a)] == sh[(s, a)])]
    sites_compared = len(set(s1) | set(s2) | set(sh))

    # 2. stable keys
    k1, k2, kh = Counter(map(key, b1)), Counter(map(key, b2)), Counter(map(key, h))
    sites_b1, sites_h = defaultdict(set), defaultdict(set)
    for r in b1:
        sites_b1[key(r)].add(r['site'])
    for r in h:
        sites_h[key(r)].add(r['site'])
    stable = {k for k in set(k1) | set(k2) if k1[k] == k2[k]}
    nondeterministic = (set(k1) | set(k2)) - stable
    base_blobs, head_blobs = blob_digests(repo, base), blob_digests(repo, head)
    def surface_digest(commit):
        trees = [subprocess.run(['git', '-C', repo, 'rev-parse', f'{commit}:{path}'], capture_output=True, text=True, check=True).stdout.strip()
                 for path in ('apps/three-surface-poc/src', 'packages/three-surface-poc-core/src')]
        return hashlib.sha256('\n'.join(trees).encode()).hexdigest()
    surface = {surface_digest(base): 'base', surface_digest(head): 'head'}
    infra_sites = {'<node-internal>', '<none>'}
    infrastructure = Counter()
    only_base = {d: p for d, p in base_blobs.items() if d not in head_blobs}
    only_head = {d: p for d, p in head_blobs.items() if d not in base_blobs}
    stable_differs = [k for k in stable if kh[k] != k1[k]]
    explained = Counter()
    left_over = []
    for k in stable_differs:
        if k[3] in only_base:
            explained['the input is the content of a file the change edited, base version'] += 1
        elif k[3] in only_head:
            explained['the input is the content of a file the change edited, head version'] += 1
        elif k[3] in surface:
            explained['the input is the surface tree-id pair of the ' + surface[k[3]] + ' commit'] += 1
        elif sites_b1[k] <= infra_sites:
            infrastructure['stable keys whose head count differs'] += 1
        else:
            left_over.append({**describe(k), 'base1': k1[k], 'base2': k2[k], 'head': kh[k], 'sites': sorted(sites_b1[k])})

    # 3. head-only keys
    head_only = [k for k in kh if k not in k1 and k not in k2]
    head_only_explained = Counter()
    nd_buckets = Counter((r['site'], r['alg'], r['enc'], r['inLen']) for r in b1 + b2 if key(r) in nondeterministic)
    head_left = []
    for k in head_only:
        if k[3] in only_head:
            head_only_explained['the input is the content of a file the change edited, head version'] += kh[k]
            continue
        if k[3] in surface:
            head_only_explained['the input is the surface tree-id pair of the ' + surface[k[3]] + ' commit'] += kh[k]
            continue
        sites = sites_h[k]
        if sites <= infra_sites:
            infrastructure['head keys no base run has'] += 1
            continue
        if any((s, k[0], k[1], k[2]) in nd_buckets for s in sites):
            head_only_explained['the key is nondeterministic: a base run has an unstable key of the same site, algorithm and input length'] += kh[k]
        else:
            head_left.append({**describe(k), 'head': kh[k], 'sites': sorted(sites)})

    result = {
        'records': {'base1': len(b1), 'base2': len(b2), 'head': len(h) + len(own), 'headSupportOwnTests': len(own), 'headCompared': len(h)},
        'byAlgorithm': {'base1': by_alg(b1), 'base2': by_alg(b2), 'head': by_alg(h)},
        'repositorySites': {'comparedSiteAlgorithmPairs': sites_compared, 'withDifferentCounts': site_rows},
        'keys': {'distinctBase1': len(k1), 'distinctBase2': len(k2), 'distinctHead': len(kh), 'stable': len(stable), 'nondeterministic': len(nondeterministic)},
        'blobsEditedByTheChange': {'baseOnly': len(only_base), 'headOnly': len(only_head)},
        'stableKeysWhoseHeadCountDiffers': {'total': len(stable_differs), 'explained': dict(explained), 'leftOver': left_over},
        'infrastructureKeysSetAside': dict(infrastructure),
        'infrastructureRecords': {'base1': sum(1 for r in b1 if r['site'] in infra_sites), 'base2': sum(1 for r in b2 if r['site'] in infra_sites), 'head': sum(1 for r in h if r['site'] in infra_sites)},
        'headKeysNoBaseRunHas': {'distinct': len(head_only), 'recordsExplained': dict(head_only_explained), 'leftOver': head_left},
    }
    if '--sites' in sys.argv:
        sweep = json.load(open(option('--sites')))
        files = sorted({row['file'] for row in sweep['sha256Sites']['rows'] if row['form'] == 'replaceable'})
        seen_base = {r['site'] for r in b1 if r['alg'] == 'sha256'}
        seen_head = {r['site'] for r in h if r['alg'] == 'sha256'}
        result['coverage'] = {
            'filesWithAReplaceableSiteAtTheBase': len(files),
            'reachedAtBase': sum(1 for f in files if f in seen_base),
            'reachedAtHead': sum(1 for f in files if f in seen_head),
            'notReachedAtBase': [f for f in files if f not in seen_base],
            'reachedAtBaseOnlyOrHeadOnly': [f for f in files if (f in seen_base) != (f in seen_head)],
        }
    print(json.dumps(result, indent=1))
    sys.exit(1 if left_over or head_left else 0)


if __name__ == '__main__':
    main()
