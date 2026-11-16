#!/usr/bin/env python3
"""Summarize run_files.py output for the two repaired sites (round-2 reviewer tool).
usage: python3 -I summarize_runs.py RUNDIR LABEL"""
import glob, json, os, sys
d, label = sys.argv[1:3]
T = 're-evaluates an unchanged repository twice: two distinct named identities, the first result unchanged (syzygy-u05.2)'
rows = [json.loads(l) for l in open(os.path.join(d, f'{label}.jsonl'))]
for r in rows:
    p = os.path.join(d, f"{label}-r{r['round']}-{os.path.basename(r['file']).removesuffix('.ts')}.json")
    rep = json.load(open(p)) if os.path.exists(p) else None
    f = rep['files'][0] if rep and rep['files'] else {}
    if 'dossier' in r['file']:
        fs = next((s for s in f.get('suites', []) if s['name'] == '(file)'), {})
        what = f"file-level hookMs {fs.get('hookMs')} fileMs {round(f.get('durationMs') or 0)}"
    else:
        t = next((t for t in f.get('tests', []) if t['name'].endswith(T)), {})
        what = f":160 test {t.get('state')} {round(t.get('durationMs') or 0)} ms; slowest other {max((round(x['durationMs'] or 0) for x in f.get('tests', []) if not x['name'].endswith(T)), default=None)} ms"
    print(f"{label} r{r['round']} {os.path.basename(r['file'])} exit {r['exit']} load1 {r['load1Start']}->{r['load1End']} unhandled {len(rep['unhandled']) if rep else '?'} | {what}")
