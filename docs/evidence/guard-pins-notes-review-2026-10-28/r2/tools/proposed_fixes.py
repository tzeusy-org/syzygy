"""PR 553 round-1 reviewer: verify the note fixes proposed in the raw, each on a scratch copy run over the clone given.
A: 8.39 record.py, a negative control in --selftest that pins the hook before the filter (kills M-R1).
B: bpyt.49 record.py, six entries and the guard-row edit check (kill M-X1..M-X5 and M-D1).
Usage: python3 -I proposed_fixes.py <clone> <scratch dir> <out.json>
"""
import json, os, subprocess, sys
tree, scratch, out = (os.path.realpath(a) for a in sys.argv[1:4])
os.makedirs(scratch, exist_ok=True)
src = lambda p: open(os.path.join(tree, p)).read()
def edit(text, pairs):
    for old, new in pairs:
        assert text.count(old) == 1 and old != new, old
        text = text.replace(old, new)
    return text
def run(text, flag):
    path = os.path.join(scratch, 'record.py'); open(path, 'w').write(text)
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    lines = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': lines[-1] if lines else r.stderr[-200:], 'survived': [l.split(' | ')[1] for l in lines if l.startswith('SURVIVED | ')]}
rows = []
R839 = 'docs/evidence/syzygy-bpyt-8-39/record.py'
GUARD_A = ("            print('selftest: the unmutated inputs already fail')\n            sys.exit(1)\n",
           "            print('selftest: the unmutated inputs already fail')\n            sys.exit(1)\n"
           "        MUTATE.update({'@since': lambda names: [*names, f'{HERE_REL}/x.json']})\n"
           "        if main_summary()['problems']:\n"
           "            print(\"selftest: this bead's own evidence path, added before the filter, is not filtered\")\n"
           "            sys.exit(1)\n")
FIXED = "    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]\n"
BACK = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
a = edit(src(R839), [GUARD_A])
rows.append({'id': 'A0 fix alone', 'check': run(a, '--check'), 'selftest': run(a, '--selftest')})
rows.append({'id': 'A1 fix + M-R1 hook moved back', 'selftest': run(edit(a, [(FIXED, BACK)]), '--selftest')})
rows.append({'id': 'A2 fix + M-H3 widened filter', 'selftest': run(edit(a, [("f'{HERE_REL}/')]\n", "'docs/')]\n")]), '--selftest')})
R49 = 'docs/evidence/syzygy-bpyt-49/record.py'
OLD94 = "        if r['probeSha256'] != sha(source) or (r['old'] is not None and"
NEW94 = "        if r['probeSha256'] != sha(source) or (r['old'] is None) != (r['id'] == 'G0-unmutated') or (r['old'] is not None and"
END = "    'a product file in the subject': {'@names': lambda names: sorted([*names, 'packages/support/src/index.ts'])},\n}\n"
ENTRIES = ("    'a root-exception re-run that failed': {'guard.json': lambda d: (d['rootExceptionRerun'].update(exit=1), d)[1]},\n"
           "    'a root-exception re-run of another path': {'guard.json': lambda d: (d['rootExceptionRerun'].update(record=PROBE), d)[1]},\n"
           "    'a lane trace whose run failed': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(exit=1), d)[1]},\n"
           "    'a lane trace of another probe path': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(probe=ROOT_PROBE), d)[1]},\n"
           "    'an unmutated row of the other record': {'mutants.json': lambda d: (row(d, 'N2-0-unmutated').update(record=R39, recordSha256=sha(blob(R39).decode())), d)[1]},\n"
           "    'a guard mutant row with no edit': {'guard.json': lambda d: (guard_row(d, PROBE, 'G1-node-modules-not-looked-for').update(old=None, new=None), d)[1]},\n")
b = edit(src(R49), [(OLD94, NEW94), (END, END[:-2] + ENTRIES + '}\n')])
rows.append({'id': 'B0 fix alone', 'check': run(b, '--check'), 'selftest': run(b, '--selftest')})
for mid, old, new in [('M-X1', "rerun['exit'] != 0 or ", ''), ('M-X2', "rerun['record'] != ROOT_RECORD or ", ''), ('M-X3', " or t['exit'] != 0", ''),
                      ('M-X4', "t['probe'] != PROBE or ", ''), ('M-X5', "r['record'] != (R839 if r['id'].startswith('N2') else R39) or ", ''),
                      ('M-D1 guard-row edit check dropped', NEW94, OLD94)]:
    rows.append({'id': f'B fix + {mid}', 'old': old, 'new': new, 'selftest': run(edit(b, [(old, new)]), '--selftest')})
for r in rows:
    print(r['id'], '|', r.get('check', {}).get('last', ''), '|', r['selftest']['exit'], r['selftest']['last'][:70], r['selftest']['survived'], flush=True)
os.remove(os.path.join(scratch, 'record.py'))
json.dump({'tool': 'proposed_fixes.py', 'rows': rows, 'A': GUARD_A, 'B': {'old94': OLD94, 'new94': NEW94, 'entries': ENTRIES}}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
