#!/usr/bin/env python3
"""syzygy-5dhm.41: compare the before and after re-renders of each stored run file by file, and record the result.

Every stored draft predates schema v13, so none carries a worth-knowing mark; the change must leave each rendered file byte-identical.
Usage: worth_knowing_compare.py <scratch dir> <before commit> <after commit> <out.json>
"""
import hashlib
import json
import pathlib
import sys

S = pathlib.Path(sys.argv[1])
before_commit, after_commit, out = sys.argv[2], sys.argv[3], pathlib.Path(sys.argv[4])


def tree(root: pathlib.Path) -> dict[str, str]:
    return {p.relative_to(root).as_posix(): hashlib.sha256(p.read_bytes()).hexdigest() for p in sorted(root.rglob('*')) if p.is_file()}


runs = []
for run in sorted((S / 'runs').iterdir()):
    rid = run.name.removeprefix('run-')
    before, after = tree(S / f'site-before-{rid}'), tree(S / f'site-after-{rid}')
    log = json.loads((S / f'log-after-{rid}.out').read_text().strip().splitlines()[-1])
    differing = sorted(k for k in before.keys() | after.keys() if before.get(k) != after.get(k))
    site = hashlib.sha256(json.dumps(after, sort_keys=True).encode()).hexdigest()
    runs.append({'run': run.name, 'schemaVersion': log['schemaVersion'], 'draftRevision': log['draftRevision'], 'inputs': log['inputs'],
                 'filesBefore': len(before), 'filesAfter': len(after), 'differing': differing, 'siteSha256': site,
                 'worthKnowingMentions': sum(1 for k in after if k.endswith('.html') and b'worth-knowing' in (S / f'site-after-{rid}' / k).read_bytes())})
record = {
    'subject': 'syzygy-5dhm.41: re-render of the seven stored runs\' latest passed drafts, main tree against the worth-knowing branch',
    'before': before_commit, 'after': after_commit,
    'harness': 'docs/evidence/syzygy-5dhm-136/reader_edition_rerender.ts (syzygy-a70b form: placement subject, run content classes, injected stored verdict)',
    'runs': runs,
    'identical': sum(1 for r in runs if not r['differing'] and r['filesBefore'] == r['filesAfter']),
    'total': len(runs),
}
out.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'identical': record['identical'], 'total': record['total'], 'differing': {r['run']: r['differing'][:5] for r in runs if r['differing']}}))
