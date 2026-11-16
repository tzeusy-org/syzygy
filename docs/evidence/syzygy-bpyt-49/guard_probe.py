"""syzygy-bpyt.49 (the PR 547 round-1 review's N1): the ancestor guard both npm probes now carry, run and mutated (rule 6).

For each probe (docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py and docs/evidence/syzygy-bpyt-39/root_exception_probe.py), three
scratch directories the guard must refuse, each in a fresh tree under <work>:
  parent-package-json       <work>/<run>/p/package.json, scratch <work>/<run>/p/s;
  parent-node-modules       <work>/<run>/p/node_modules/, scratch <work>/<run>/p/s;
  grandparent-package-json  <work>/<run>/g/package.json, scratch <work>/<run>/g/p/s.
Each guard mutant edits a copy of the probe; a case it leaves unrefused runs the probe in full, offline against an unreachable
registry, as the probe always does. Last, the unmutated root_exception_probe.py runs in a scratch directory outside any npm project
and its record is compared byte for byte with the committed root-exception-probe.json. <work> must lie outside any npm project.
Usage: python3 -I guard_probe.py <tree> <empty work dir> <out.json>
"""
import hashlib, json, os, subprocess, sys

tree, work, out = (os.path.realpath(a) for a in sys.argv[1:4])
if os.listdir(work):
    sys.exit(f'{work} is not empty')
PROBES = ['docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py', 'docs/evidence/syzygy-bpyt-39/root_exception_probe.py']
RECORD = 'docs/evidence/syzygy-bpyt-39/root-exception-probe.json'
CASES = {'parent-package-json': ('p', 'package.json', 'p/s'), 'parent-node-modules': ('p', 'node_modules', 'p/s'),
         'grandparent-package-json': ('g', 'package.json', 'g/p/s')}
MESSAGE = '{} holds a package.json or node_modules, so npm would read its .npmrc: use a scratch directory outside any npm project'
# (id, old, new, the cases it must leave unrefused)
MUTANTS = [
    ('G0-unmutated', None, None, []),
    ('G1-node-modules-not-looked-for', "('package.json', 'node_modules')", "('package.json',)", ['parent-node-modules']),
    ('G2-package-json-not-looked-for', "('package.json', 'node_modules')", "('node_modules',)", ['parent-package-json', 'grandparent-package-json']),
    ('G3-only-the-parent-looked-at', '    up = os.path.dirname(up)\n', '    break\n', ['grandparent-package-json']),
]
sha = lambda data: hashlib.sha256(data).hexdigest()
commit = subprocess.run(['git', '-C', tree, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
rows, n = [], 0
for probe in PROBES:
    source = open(os.path.join(tree, probe)).read()
    for mid, old, new, unrefused in MUTANTS:
        assert old is None or (source.count(old) == 1 and old != new), (probe, mid)
        n += 1
        copy = os.path.join(work, f'{n}-{os.path.basename(probe)}')
        open(copy, 'w').write(source if old is None else source.replace(old, new))
        cases = {}
        for case, (anchor, marker, rel) in CASES.items():
            run_dir = os.path.join(work, f'{n}-{case}')
            if marker == 'package.json':
                os.makedirs(os.path.join(run_dir, anchor))
                open(os.path.join(run_dir, anchor, marker), 'w').write('{}\n')
            else:
                os.makedirs(os.path.join(run_dir, anchor, marker))
            scratch = os.path.join(run_dir, rel)
            os.makedirs(scratch)
            r = subprocess.run(['python3', '-I', copy, scratch, os.path.join(run_dir, 'record.json')], capture_output=True, text=True,
                               timeout=1800)
            want = MESSAGE.format(os.path.join(run_dir, anchor))
            cases[case] = {'exit': r.returncode, 'refused': r.returncode != 0 and r.stderr.strip() == want,
                           'recordWritten': os.path.exists(os.path.join(run_dir, 'record.json')),
                           'stderrTail': r.stderr.strip().splitlines()[-1].replace(work, '<work>') if r.stderr.strip() else ''}
        row = {'probe': probe, 'probeSha256': sha(source.encode()), 'id': mid, 'old': old, 'new': new, 'cases': cases,
               'expectedUnrefused': unrefused}
        row['asExpected'] = all(c['refused'] == (case not in unrefused) and c['recordWritten'] == (case in unrefused)
                                for case, c in cases.items())
        rows.append(row)
        print(probe, mid, {k: (v['exit'], v['refused']) for k, v in cases.items()}, 'as expected' if row['asExpected'] else 'UNEXPECTED',
              flush=True)
rerun = os.path.join(work, 'rerun')
os.makedirs(os.path.join(rerun, 's'))
r = subprocess.run(['python3', '-I', os.path.join(tree, PROBES[1]), os.path.join(rerun, 's'), os.path.join(rerun, 'record.json')],
                   capture_output=True, text=True, timeout=1800)
data = open(os.path.join(rerun, 'record.json'), 'rb').read() if os.path.exists(os.path.join(rerun, 'record.json')) else b''
result = {'commit': commit, 'rows': rows,
          'rootExceptionRerun': {'exit': r.returncode, 'record': RECORD, 'recordSha256': sha(data),
                                 'equalsCommitted': data == open(os.path.join(tree, RECORD), 'rb').read()}}
json.dump(result, open(out, 'w'), indent=1)
open(out, 'a').write('\n')
print('rerun', result['rootExceptionRerun'])
