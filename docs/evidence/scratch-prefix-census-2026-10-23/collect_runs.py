#!/usr/bin/env python3
"""Copy the files of finished census_run.py runs into one directory, checking each against the digest its record names.

Usage: collect_runs.py <destination> <label>=<run-record.json> [<label>=<run-record.json> ...]
       collect_runs.py --digest-existing <destination>

For each label writes <destination>/<label>.json (the run record), <destination>/<label>.trace.jsonl.gz (the tracer's log, gzip with
a zero timestamp so the bytes are reproducible; the digest in the run record is of the uncompressed log) and
<destination>/<label>.samples.json (the sampler's record), after checking that the trace's sha256 and line count equal the ones in
the run record. It refuses a label it has already written. It reads and copies; nothing is removed.

The run record names the sampler's file by path only, so the copy is bound by <destination>/sampler-digests.json instead: {"note": ...,
"sha256": {label: sha256 of <label>.samples.json}}. A normal collection adds each label's digest as it copies the file. The runs of
2026-10-24 were collected before this existed; `--digest-existing` writes the file for the sampler records already in <destination>
(it refuses when the file is there already), and the digests it writes are those of the committed bytes, which verification can set
beside `git show <commit>:<path> | sha256sum`.
"""
import gzip
import hashlib
import json
import pathlib
import shutil
import sys

NOTE = 'sha256 of each <label>.samples.json as collected; assemble_census.py refuses a sampler record whose bytes differ'


def digests_file(destination: pathlib.Path) -> pathlib.Path:
    return destination / 'sampler-digests.json'


def add_digests(destination: pathlib.Path, additions: dict) -> None:
    path = digests_file(destination)
    current = json.loads(path.read_text()) if path.exists() else {'note': NOTE, 'sha256': {}}
    assert not set(current['sha256']) & set(additions), ('a digest is already recorded for', sorted(set(current['sha256']) & set(additions)))
    current['sha256'] = dict(sorted({**current['sha256'], **additions}.items()))
    path.write_text(json.dumps(current, indent=1) + '\n')


if len(sys.argv) == 3 and sys.argv[1] == '--digest-existing':
    existing = pathlib.Path(sys.argv[2])
    assert not digests_file(existing).exists(), 'sampler-digests.json is already there'
    found = {p.name[:-len('.samples.json')]: hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(existing.glob('*.samples.json'))}
    assert found, 'no sampler record here'
    add_digests(existing, found)
    print(json.dumps(found, indent=1))
    sys.exit(0)

destination = pathlib.Path(sys.argv[1])
destination.mkdir(parents=True, exist_ok=True)
for pair in sys.argv[2:]:
    label, record_path = pair.split('=', 1)
    record_file = pathlib.Path(record_path)
    record = json.loads(record_file.read_text())
    private = pathlib.Path(record['privateDirectory'])
    trace, samples = private / 'trace.jsonl', pathlib.Path(record['samplerRecord'])
    digest = hashlib.sha256(trace.read_bytes()).hexdigest()
    lines = len(trace.read_text().splitlines())
    assert digest == record['trace']['sha256'] and lines == record['trace']['lines'], (label, 'the trace is not the one the record names')
    targets = [destination / f'{label}.json', destination / f'{label}.trace.jsonl.gz', destination / f'{label}.samples.json']
    assert not any(t.exists() for t in targets), (label, 'already collected')
    shutil.copyfile(record_file, targets[0])
    with open(targets[1], 'wb') as raw, gzip.GzipFile(filename='', mode='wb', fileobj=raw, mtime=0, compresslevel=9) as packed:
        packed.write(trace.read_bytes())
    shutil.copyfile(samples, targets[2])
    add_digests(destination, {label: hashlib.sha256(targets[2].read_bytes()).hexdigest()})
    print(label, digest, lines)
