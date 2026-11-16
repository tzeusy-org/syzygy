#!/usr/bin/env python3
"""Run one rev-542 probe test, unmutated and under named mutants, and record what it wrote.

Usage: python3 -I probe.py <tree> <specs.json> <probe.test.ts> <dest relative to tree> <out.json> <tmpdir> <id|NONE>...

Per id: copy the probe into the tree, apply the mutant's edits (each `old` once), run
`npx vitest run <dest>` with TMPDIR=<tmpdir> and PROBE_OUT=<tmpdir>/probe.json, read that file,
restore every byte, remove the probe, and require `git status --porcelain` to be empty.
"""
import json
import os
import shutil
import subprocess
import sys

tree, specs_path, probe, dest, out, tmpdir, *ids = sys.argv[1:]
specs = {m['id']: m for m in json.load(open(specs_path))['mutants']}


def git(*args):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, text=True, check=True).stdout


head = git('rev-parse', 'HEAD').strip()
results = []
for mid in ids:
    assert git('status', '--porcelain') == ''
    edits = [] if mid == 'NONE' else specs[mid]['edits']
    originals = {}
    target = os.path.join(tree, dest)
    try:
        shutil.copyfile(probe, target)
        for e in edits:
            path = os.path.join(tree, e['file'])
            text = open(path, encoding='utf8').read()
            assert text.count(e['old']) == 1, (mid, e['file'])
            originals.setdefault(path, open(path, 'rb').read())
            open(path, 'w', encoding='utf8').write(text.replace(e['old'], e['new'], 1))
        os.makedirs(tmpdir, exist_ok=False)
        probe_out = os.path.join(tmpdir, 'probe.json')
        run = subprocess.run(['npx', 'vitest', 'run', dest], cwd=tree, capture_output=True, text=True,
                             env={**os.environ, 'TMPDIR': tmpdir, 'PROBE_OUT': probe_out}, timeout=900)
        recorded = json.load(open(probe_out)) if os.path.exists(probe_out) else None
    finally:
        for path, data in originals.items():
            open(path, 'wb').write(data)
        if os.path.exists(target):
            os.remove(target)
        shutil.rmtree(tmpdir, ignore_errors=True)
    clean = git('status', '--porcelain') == ''
    results.append({'id': mid, 'commit': head, 'edits': edits, 'exit': run.returncode, 'recorded': recorded,
                    'cleanAfter': clean, 'load': open('/proc/loadavg').read().split()[0]})
    print(mid, 'exit', run.returncode, json.dumps(recorded, ensure_ascii=True)[:400], 'clean', clean, flush=True)
    assert clean
json.dump({'probe': os.path.basename(probe), 'dest': dest, 'commit': head, 'results': results}, open(out, 'w'),
          indent=1, ensure_ascii=True)
