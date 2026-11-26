#!/usr/bin/env python3
"""syzygy-5dhm.135: compare the before and after re-renders of each copied stored run, file by file, by SHA-256.

Usage: question_kind_rerender_compare.py <scratch out dir> <before commit> <after commit> <out.json>. Reads site-before-<id> and
site-after-<id> under the out dir (written by question_kind_rerender_all.sh); records per run the file count, each side's sorted path
set, and every path whose bytes differ. Prints no body.
"""
import hashlib
import json
import pathlib
import sys

out_dir, before, after, out = pathlib.Path(sys.argv[1]), sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])


def digests(root: pathlib.Path) -> dict:
    return {str(p.relative_to(root)): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}


runs = []
for site in sorted(out_dir.glob('site-before-*')):
    run_id = site.name[len('site-before-'):]
    a, b = digests(site), digests(out_dir / f'site-after-{run_id}')
    runs.append({
        'run': f'run-{run_id}',
        'filesBefore': len(a), 'filesAfter': len(b),
        'samePathSet': sorted(a) == sorted(b),
        'differing': sorted(path for path in set(a) | set(b) if a.get(path) != b.get(path)),
        'siteDigest': hashlib.sha256(json.dumps(b, sort_keys=True).encode()).hexdigest(),
    })
record = {
    'subject': 'syzygy-5dhm.135: the comprehension-regression rule (CONTRIBUTING.md) over the stored Redis runs, re-rendered before and after',
    'before': before, 'after': after,
    'harness': 'docs/evidence/syzygy-5dhm-135/question_kind_rerender_all.sh, through docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts',
    'runs': runs,
    'allIdentical': bool(runs) and all(r['samePathSet'] and not r['differing'] and r['filesBefore'] > 0 for r in runs),
    'readerShare': {
        'renderedSite': 'Observed: where every file is byte-identical, a reader of the re-rendered site reads what the kept pilot arms read, so the before and after shares of a stored run are equal by construction; no reader was run.',
        'briefV21': 'Unknown: brief v21 changes only what a new authoring session is asked; no new run was made (it needs consent this session never gives), so its effect on what a reader recovers is not measured.',
    },
}
out.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'runs': len(runs), 'allIdentical': record['allIdentical']}))
