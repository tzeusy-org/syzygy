"""syzygy-bpyt.39 (the PR 541 round-3 review's N3): which npmrc files an npm probe opens, traced, when it is run from a caller's
directory that holds a `.npmrc`.

Runs `python3 -I <probe> <scratch> <record>` under `strace -f` (openat, stat, newfstatat, access) with <caller> as its working
directory, after creating an empty <caller>/.npmrc. Every traced path containing `npmrc` is kept, with its call and result, and
sorted into inside the scratch directory and outside it. With --compare, the probe's record is compared byte for byte with a
reference record. Nothing is fetched: the probes run npm offline against an unreachable registry.
Usage: python3 -I npmrc_trace.py <probe.py> <caller dir> <empty scratch dir> <record out> <out.json> [--compare <reference.json>]
"""
import collections, hashlib, json, os, re, subprocess, sys

probe, caller, scratch, record, out = (os.path.realpath(a) for a in sys.argv[1:6])
reference = sys.argv[sys.argv.index('--compare') + 1] if '--compare' in sys.argv else None
os.makedirs(caller, exist_ok=True)
open(os.path.join(caller, '.npmrc'), 'w').close()
trace = scratch.rstrip('/') + '.strace'
run = subprocess.run(['strace', '-f', '-qq', '-e', 'trace=openat,stat,newfstatat,access', '-o', trace, 'python3', '-I', probe, scratch, record],
                     cwd=caller, capture_output=True, text=True, timeout=1800)
calls = collections.Counter()
for line in open(trace):
    for m in re.finditer(r'(\w+)\((?:AT_FDCWD, )?"([^"]*npmrc[^"]*)"[^)]*\)\s*=\s*(-?\d+)(?: (\w+))?', line):
        call, path, ret, err = m.groups()
        calls[(path, call, 'ok' if int(ret) >= 0 else err)] += 1
rows = [{'path': p.replace(scratch, '<scratch>'), 'call': c, 'result': r, 'count': n} for (p, c, r), n in sorted(calls.items())]
outside = [r for r in rows if not r['path'].startswith('<scratch>')]
data = open(record, 'rb').read() if os.path.exists(record) else b''
result = {'probe': os.path.relpath(probe, os.getcwd()) if probe.startswith(os.getcwd()) else probe,
          'probeSha256': hashlib.sha256(open(probe, 'rb').read()).hexdigest(), 'caller': caller,
          'callerNpmrcOpened': [r for r in outside if r['path'] == os.path.join(caller, '.npmrc')],
          'exit': run.returncode, 'recordSha256': hashlib.sha256(data).hexdigest(),
          'recordEqualsReference': None if reference is None else data == open(reference, 'rb').read(),
          'reference': reference, 'npmrcOutsideScratch': outside, 'npmrcInsideScratch': [r for r in rows if r['path'].startswith('<scratch>')]}
os.remove(trace)
json.dump(result, open(out, 'w'), indent=1)
print(json.dumps({k: result[k] for k in ('exit', 'callerNpmrcOpened', 'npmrcOutsideScratch', 'recordEqualsReference')}, indent=1))
