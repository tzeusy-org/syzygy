"""PR 553 round-1 reviewer's own mutants (rule 6), each one edit to a scratch copy, run over the clone given.
Part G: the probes' ancestor guard, against the lane's three cases plus a great-grandparent package.json case.
Part T: the root-exception probe's timestamp mask, the re-run compared byte for byte with the committed record.
Part R: record.py checks (8.39, bpyt.39, bpyt.49), --check and --selftest; part D: extra selftest entries in bpyt.49's record.
Usage: python3 -I own_mutants.py <clone> <empty work dir, outside any npm project> <out.json>
"""
import hashlib, json, os, re, subprocess, sys
tree, work, out = (os.path.realpath(a) for a in sys.argv[1:4])
assert not os.listdir(work)
P839 = 'docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py'
P39 = 'docs/evidence/syzygy-bpyt-39/root_exception_probe.py'
R839, R39, R49 = (f'docs/evidence/{d}/record.py' for d in ('syzygy-bpyt-8-39', 'syzygy-bpyt-39', 'syzygy-bpyt-49'))
ROOT_RECORD = os.path.join(tree, 'docs/evidence/syzygy-bpyt-39/root-exception-probe.json')
src = lambda p: open(os.path.join(tree, p)).read()
sha = lambda b: hashlib.sha256(b).hexdigest()
n = [0]
def copy_with(path, old, new):
    s = src(path)
    assert old is None or (s.count(old) == 1 and old != new), (path, old)
    n[0] += 1
    c = os.path.join(work, f'{n[0]}-{os.path.basename(path)}')
    open(c, 'w').write(s if old is None else s.replace(old, new))
    return c
CASES = {'parent-package-json': ('p', 'package.json', 'p/s'), 'parent-node-modules': ('p', 'node_modules', 'p/s'),
         'grandparent-package-json': ('g', 'package.json', 'g/p/s'), 'great-grandparent-package-json': ('gg', 'package.json', 'gg/g/p/s')}
LANE = ['parent-package-json', 'parent-node-modules', 'grandparent-package-json']
G = [('M-G0-unmutated', None, None),
     ('M-G1-two-levels-only', 'while True:\n', 'for _ in range(2):\n'),
     ('M-G2-isfile-not-exists', 'os.path.exists(os.path.join(up, name))', 'os.path.isfile(os.path.join(up, name))'),
     ('M-G3-parent-skipped', 'up = os.path.dirname(scratch)\n', 'up = os.path.dirname(os.path.dirname(scratch))\n'),
     ('M-G4-package-json-only', "('package.json', 'node_modules')", "('package.json', 'package.json')")]
rows = []
for probe in (P839, P39):
    for mid, old, new in G:
        c = copy_with(probe, old, new)
        cases = {}
        for case, (anchor, marker, rel) in CASES.items():
            d = os.path.join(work, f'{n[0]}-{case}')
            os.makedirs(os.path.join(d, anchor) if marker == 'package.json' else os.path.join(d, anchor, marker))
            if marker == 'package.json':
                open(os.path.join(d, anchor, marker), 'w').write('{}\n')
            s = os.path.join(d, rel); os.makedirs(s)
            r = subprocess.run(['python3', '-I', c, s, os.path.join(d, 'record.json')], capture_output=True, text=True, timeout=1800)
            cases[case] = {'exit': r.returncode, 'refused': r.returncode != 0 and 'holds a package.json or node_modules' in r.stderr}
        unref = [k for k, v in cases.items() if not v['refused']]
        rows.append({'part': 'G', 'file': probe, 'id': mid, 'old': old, 'new': new, 'unrefused': unref,
                     'killedByLaneCases': any(k in LANE for k in unref) if old else None})
        print(rows[-1]['file'][-24:], mid, unref, rows[-1]['killedByLaneCases'], flush=True)
T = [('M-T0-unmutated', None, None),
     ('M-T1-mask-two-digit-ms', r"_\d{3}Z-debug-", r"_\d{2}Z-debug-"),
     ('M-T2-mask-dropped', "re.sub(r'/_logs/", "(lambda a, b, c: c)(r'/_logs/")]
for mid, old, new in T:
    c = copy_with(P39, old, new)
    d = os.path.join(work, f'{n[0]}-t'); os.makedirs(os.path.join(d, 's'))
    r = subprocess.run(['python3', '-I', c, os.path.join(d, 's'), os.path.join(d, 'record.json')], capture_output=True, text=True, timeout=1800)
    data = open(os.path.join(d, 'record.json'), 'rb').read() if os.path.exists(os.path.join(d, 'record.json')) else b''
    committed = open(ROOT_RECORD, 'rb').read()
    diff = sum(1 for a, b in zip(data.split(b'\n'), committed.split(b'\n')) if a != b)
    rows.append({'part': 'T', 'file': P39, 'id': mid, 'old': old, 'new': new, 'exit': r.returncode, 'recordSha256': sha(data),
                 'equalsCommitted': data == committed, 'linesDiffering': diff})
    print(mid, r.returncode, data == committed, diff, flush=True)
def run_record(path, flag):
    r = subprocess.run(['python3', '-I', path, tree, flag], capture_output=True, text=True, timeout=1800)
    lines = r.stdout.splitlines()
    return {'exit': r.returncode, 'last': lines[-1] if lines else r.stderr[-200:],
            'survived': [l.split(' | ')[1] for l in lines if l.startswith('SURVIVED | ')]}
base_since = "    since = hooked('since', [p for p in git('diff', '--name-only', REPAIR1, HEAD).split() if not p.startswith(f'{HERE_REL}/')])\n"
fixed_since = "    since = [p for p in hooked('since', git('diff', '--name-only', REPAIR1, HEAD).split()) if not p.startswith(f'{HERE_REL}/')]\n"
R = [(R839, 'M-R1-hook-moved-back-after-the-filter', fixed_since, base_since),
     (R39, 'M-R2-recordSha256-compare-strips-whitespace', "sha((HERE / 'root-exception-probe.json').read_bytes())", "sha((HERE / 'root-exception-probe.json').read_bytes().strip())"),
     (R39, 'M-R3-recordSha256-compare-prefix-only', "t['recordSha256'] != sha((HERE / 'root-exception-probe.json').read_bytes())", "t['recordSha256'][:8] != sha((HERE / 'root-exception-probe.json').read_bytes())[:8]"),
     (R49, 'M-X1-rerun-exit-not-read', "rerun['exit'] != 0 or ", ''),
     (R49, 'M-X2-rerun-record-path-not-read', "rerun['record'] != ROOT_RECORD or ", ''),
     (R49, 'M-X3-lane-trace-exit-not-read', " or t['exit'] != 0", ''),
     (R49, 'M-X4-lane-trace-probe-path-not-read', "t['probe'] != PROBE or ", ''),
     (R49, 'M-X5-mutant-record-path-not-read', "r['record'] != (R839 if r['id'].startswith('N2') else R39) or ", ''),
     (R49, 'M-X6-lane-trace-other-outside-not-counted', "len(builtin) != len(t['npmrcOutsideScratch']) or ", ''),
     (R49, 'M-X7-guard-case-exit-not-read', " or (c['exit'] == 0) != open_case", ''),
     (R49, 'M-X8-mutants-tally-not-read', "r['selftest']['tally'] != TALLIES[r['id']]", 'False')]
for path, mid, old, new in R:
    c = copy_with(path, old, new)
    rows.append({'part': 'R', 'file': path, 'id': mid, 'old': old, 'new': new, 'check': run_record(c, '--check'), 'selftest': run_record(c, '--selftest')})
    print(mid, rows[-1]['check']['exit'], rows[-1]['check']['last'][:90], '|', rows[-1]['selftest']['last'][:60], rows[-1]['selftest']['survived'], flush=True)
END = "    'a product file in the subject': {'@names': lambda names: sorted([*names, 'packages/support/src/index.ts'])},\n}\n"
D = [('M-D1-a-guard-mutant-row-with-no-edit', "    'z guard mutant row with no edit': {'guard.json': lambda d: (guard_row(d, PROBE, 'G1-node-modules-not-looked-for').update(old=None, new=None), d)[1]},\n"),
     ('M-D2-a-rerun-that-failed', "    'z rerun that failed': {'guard.json': lambda d: (d['rootExceptionRerun'].update(exit=1), d)[1]},\n"),
     ('M-D3-a-lane-trace-that-failed', "    'z lane trace that failed': {'npmrc-trace-lane-probe-guarded.json': lambda d: (d.update(exit=1), d)[1]},\n"),
     ('M-D4-a-row-of-the-other-record', "    'z row of the other record': {'mutants.json': lambda d: (row(d, 'N3-E5').update(record=R839), d)[1]},\n")]
for mid, entry in D:
    c = copy_with(R49, END, entry.join([END[:-2], '}\n']) if False else END[:-2] + entry + '}\n')
    st = run_record(c, '--selftest')
    rows.append({'part': 'D', 'file': R49, 'id': mid, 'old': END, 'new': END[:-2] + entry + '}\n', 'selftest': st})
    print(mid, st['last'][:60], st['survived'], flush=True)
json.dump({'commit': subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip(),
           'tool': 'own_mutants.py', 'rows': rows}, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
