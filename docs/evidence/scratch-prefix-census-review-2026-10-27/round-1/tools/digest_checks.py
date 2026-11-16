#!/usr/bin/env python3
"""Rule 3/11 checks on the census evidence directory, run read-only at the reviewed commit.

Usage: digest_checks.py <clone> <evidence-dir-relative> <run-commit>

1. Every file in the directory against verification-2026-10-24.json fileSha256 (and the reverse: every listed file exists).
2. Each run record's tool sha256 (census_run.py, scratch_trace.cjs, tmp_sampler.py) against the blob of that name at <run-commit>
   and at HEAD.
3. Each run record's trace digest and line count against the gunzipped stored trace.
4. The census record's toolSha256 and staticSitesSha256 against the files at HEAD.
5. Every run record names <run-commit>; the static census names it too.
6. listingAtEnd counts recomputed: kill-run entries, bytes (MB) and marker counts against the finding sentence.
"""
import gzip
import hashlib
import json
import pathlib
import subprocess
import sys

clone, rel, run_commit = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3]
d = clone / rel
sha = lambda b: hashlib.sha256(b).hexdigest()
blob = lambda commit, name: subprocess.run(['git', 'show', f'{commit}:{rel}/{name}'], cwd=clone, capture_output=True, check=True).stdout
ver = json.loads((d / 'verification-2026-10-24.json').read_text())
files = {p.relative_to(d).as_posix() for p in d.rglob('*') if p.is_file() and p.name != 'verification-2026-10-24.json'}
listed = set(ver['fileSha256'])
bad = [f for f in sorted(files & listed) if sha((d / f).read_bytes()) != ver['fileSha256'][f]]
print('1. files on disk', len(files), 'listed', len(listed), 'onDiskNotListed', sorted(files - listed), 'listedNotOnDisk', sorted(listed - files), 'mismatched', bad)
census = json.loads((d / 'census-2026-10-24.json').read_text())
runs = sorted(p for p in (d / 'runs').glob('*.json') if not p.name.endswith('.samples.json') and p.name != 'operator-notes.json')
print('2/3/5. run records', len(runs))
for p in runs:
    r = json.loads(p.read_text())
    tools = {n: (r['sha256'][n] == sha(blob(run_commit, n)), r['sha256'][n] == sha((d / n).read_bytes())) for n in r['sha256']}
    raw = gzip.decompress((d / 'runs' / (p.stem + '.trace.jsonl.gz')).read_bytes())
    print(' ', p.stem, 'commit ok', r['treeCommit'] == run_commit, 'tools (atRunCommit, atHead)', tools,
          'trace sha ok', sha(raw) == r['trace']['sha256'], 'lines ok', len(raw.decode().splitlines()) == r['trace']['lines'])
static = json.loads((d / 'static-sites-2026-10-24.json').read_text())
print('5. static treeCommit ok', static['treeCommit'] == run_commit)
print('4. census toolSha256 vs HEAD', {n: v == sha((d / n).read_bytes()) for n, v in census['subject']['toolSha256'].items()},
      'staticSitesSha256 ok', census['subject']['staticSitesSha256'] == sha((d / 'static-sites-2026-10-24.json').read_bytes()))
print('4b. census toolSha256 vs run commit', {n: (v == sha(blob(run_commit, n))) if n != 'assemble_census.py' else 'not at run commit' for n, v in census['subject']['toolSha256'].items()})
kills = [json.loads((d / 'runs' / f'{l}.json').read_text()) for l in ('k1-kill-40s', 'k2-kill-75s', 'k3-kill-115s')]
print('6. kill entries', [len(k['listingAtEnd']) for k in kills], 'MB', [round(sum(e['bytes'] for e in k['listingAtEnd']) / 1e6, 1) for k in kills],
      'marker', [k['processesCarryingTheMarker']['count'] for k in kills], 'leaders', [k['processesCarryingTheMarker']['byKind'].get('leader') for k in kills])
print('   finding[0]:', census['finding'][0])
