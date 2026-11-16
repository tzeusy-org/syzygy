#!/usr/bin/env python3
"""Runs candidate-pins.test.ts in a scratch clone at the head and under production mutants (reusing mutants-r3.py's fragments).
Usage: python3 -I candidate-pins.py <clone, clean> <tmpdir> <out.json>"""
import importlib.util, json, os, shutil, subprocess, sys
here = os.path.dirname(os.path.abspath(__file__))
spec = importlib.util.spec_from_file_location('m3', os.path.join(here, 'mutants-r3.py')); m3 = importlib.util.module_from_spec(spec); spec.loader.exec_module(m3)
clone, tmpdir, out = sys.argv[1:4]
os.makedirs(tmpdir, exist_ok=True)
dest = 'packages/three-surface-poc-core/src/r3-candidate-pins.test.ts'
px = {mid: reps for mid, reps, _files, _note in m3.MUTANTS if mid.startswith('PX')}
jobs = [('head', []), ('MU22', [m3.MU22]), ('MU23', [m3.MU23]), ('MU24', [m3.MU24])] + [(k, v) for k, v in px.items()]
rows = []
shutil.copyfile(os.path.join(here, 'candidate-pins.test.ts'), os.path.join(clone, dest))
try:
    for label, reps in jobs:
        originals = {}
        for file, old, new in reps:
            p = os.path.join(clone, file); t = open(p, encoding='utf8').read(); originals[file] = t
            assert t.count(old) == 1, (label, old)
            open(p, 'w', encoding='utf8').write(t.replace(old, new))
        try:
            r = m3.detect(clone, tmpdir, label.split('-')[0], [dest])
        finally:
            for file, t in originals.items(): open(os.path.join(clone, file), 'w', encoding='utf8').write(t)
        rows.append({'id': label, 'replacements': [{'file': f, 'old': o, 'new': n} for f, o, n in reps], **r})
        print(label, r['tests'], r['failed'], [(f['test'][-60:], f['error'][:110]) for f in r['failures']], r['loadBefore'].split()[0], '->', r['loadAfter'].split()[0], flush=True)
finally:
    os.remove(os.path.join(clone, dest))
json.dump({'tool': 'rev-544-r3/tools/candidate-pins.py', 'rows': rows}, open(out, 'w', encoding='utf8'), indent=1)
