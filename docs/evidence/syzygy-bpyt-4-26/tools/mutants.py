#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.4.26 (the PR 524 review's N4: review.test.ts's leaf check matched a TMPDIR path), run in a clean
clone.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present>

The edit, run and restore steps are syzygy-bpyt.6.14's (docs/evidence/syzygy-bpyt-6-14/tools/mutants.py), and the failing-set form
is syzygy-bpyt.46's (docs/evidence/syzygy-bpyt-46/tools/mutants.py), both imported from the clone and unedited. Every row records its
edits verbatim as {path, old, new}, and the clone's `git status --porcelain` is recorded after (expected empty). Each row runs the
suite under one of two TMPDIRs: `<tmpdir>/plain`, whose path holds no verdict leaf, or `<tmpdir>/p1-leaf`, whose path holds the
verdict's block id `p1`. Each row names, before the run, the exact set of failing test names it must give: [] for a row that must
pass.
"""
import hashlib
import importlib.util
import json
import os
import subprocess
import sys

LANE_614 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'
LANE_46 = 'docs/evidence/syzygy-bpyt-46/tools/mutants.py'
TEST = 'packages/polaris-dossier/src/review.test.ts'
REVIEW = 'packages/polaris-dossier/src/review.ts'

VALIDATES = 'review-check validates a complete, consistent verdict bound to the rebuilt packet and records it; it counts once its launch form is recorded'
OBSERVES = "review-check observes only the packet, its digest and that the verdict names it: the reviewer's reading, independence, completeness, identifiers and launch form stay Inferred"
LEAFY_ROW = 'review-check observes only the packet and its digest under a TMPDIR whose path holds a verdict leaf'

REPLACED = "    const text = JSON.stringify(holder, (_key, value: unknown) => typeof value === 'string' ? value.split(run).join('<run>') : value);\n    expect(text).not.toContain(tmpdir());\n"
OBSERVED = "    observed: { packetSha256: packet.sha256, verdictNamesPacket: named === packet.sha256, label: 'Observed' },\n"


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


# (id, TMPDIR kind, edits, the failing test names expected).
ROWS = [
    ('U0-unmutated', 'plain', [], []),
    ('U0P-unmutated-under-a-p1-tmpdir', 'p1-leaf', [], []),
    # The check as it stood at main eb6183b5: the holder's JSON as emitted, the run path in it. Under a plain TMPDIR only the new row,
    # which makes its own p1 TMPDIR, fails; under a p1 TMPDIR the old row fails too, as it did for the PR 524 review.
    ('M1-run-path-kept-in-the-holder', 'plain', [edit(TEST, REPLACED, '    const text = JSON.stringify(holder);\n')], [LEAFY_ROW]),
    ('M1P-run-path-kept-under-a-p1-tmpdir', 'p1-leaf', [edit(TEST, REPLACED, '    const text = JSON.stringify(holder);\n')], [OBSERVES, LEAFY_ROW]),
    # A verdict leaf really in an Observed holder: the review-check report's observed digest carries the verdict's declared
    # readiness. The leaf check fails both observed-only rows; the validates row pins the holder's value too.
    ('M2-verdict-leaf-in-the-observed-holder', 'plain',
     [edit(REVIEW, OBSERVED, OBSERVED.replace('packetSha256: packet.sha256,', "packetSha256: `${packet.sha256} ${declared ?? ''}`,"))],
     [VALIDATES, OBSERVES, LEAFY_ROW]),
    # The replacement made vacuous: every string replaced, so no leaf could ever match. The digest each holder keeps fails it.
    ('M3-every-string-replaced', 'plain', [edit(TEST, "value.split(run).join('<run>')", "'<run>'")], [OBSERVES, LEAFY_ROW]),
    # The row run under the outer TMPDIR: its own check that os.tmpdir() reads the leafy directory fails, and with that check dropped
    # too, its check that the emitted holders carry the leafy path fails.
    ('M4-row-keeps-the-outer-tmpdir', 'plain', [edit(TEST, "    process.env['TMPDIR'] = leafy;\n", '')], [LEAFY_ROW]),
    ('M4B-row-keeps-the-outer-tmpdir-unchecked', 'plain',
     [edit(TEST, "    process.env['TMPDIR'] = leafy;\n", ''), edit(TEST, '      expect(tmpdir()).toBe(leafy);\n', '')], [LEAFY_ROW]),
]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    load = lambda path, name: (lambda spec: (lambda module: (spec.loader.exec_module(module), module)[1])(importlib.util.module_from_spec(spec)))(
        importlib.util.spec_from_file_location(name, os.path.join(clone, path)))
    lane614, lane46 = load(LANE_614, 'lane614'), load(LANE_46, 'lane46')
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = lane614.dist_dirs(clone)
    built = sorted(f'{project}/dist' for project in json.load(open(os.path.join(clone, 'package.json')))['scripts']['build'].split()[2:])
    assert (dist == 'absent' and present == []) or (dist == 'present' and present == built), (dist, present, built)
    dirs = {kind: os.path.join(tmpdir, kind) for kind in ['plain', 'p1-leaf']}
    assert 'p1' not in dirs['plain'] and 'p1' in dirs['p1-leaf'], dirs
    rows = []
    for rid, kind, edits, want in ROWS:
        os.makedirs(dirs[kind], exist_ok=True)
        undo = lane614.apply(clone, edits)
        try:
            res = lane614.run(clone, TEST, dirs[kind])
        finally:
            lane614.restore(undo)
        failing = lane46.failing_set(res)
        ok = 'error' not in res and failing == sorted(want) and (res['exit'] == 0) == (want == [])
        rows.append({'id': rid, 'tmpdir': dirs[kind], 'edits': edits, 'expected': sorted(want), 'failing': failing, 'asExpected': ok,
                     'messages': {t['name']: t['message'].splitlines()[0][:300] for t in res.get('failedTests', [])},
                     **{k: res.get(k) for k in ('exit', 'passed', 'failed', 'total', 'fileMessages', 'error')}})
        print(rid, 'as expected' if ok else 'UNEXPECTED', res.get('exit'), res.get('passed'), res.get('failed'), failing, flush=True)
    status = git('status', '--porcelain')
    summary = {'rows': len(rows), 'asExpected': sum(r['asExpected'] for r in rows), 'unexpected': [r['id'] for r in rows if not r['asExpected']]}
    json.dump({'commit': commit, 'dist': dist, 'distDirs': present,
               'importedTools': {LANE_614: sha256_file(os.path.join(clone, LANE_614)), LANE_46: sha256_file(os.path.join(clone, LANE_46))},
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'rows': rows}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status))


if __name__ == '__main__':
    main()
