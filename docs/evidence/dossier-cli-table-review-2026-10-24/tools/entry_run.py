"""Run argv through each tree's BUILT syzygy entry (apps/syzygy/dist/main.js) as a subprocess and compare exit, stdout and stderr.
Rows: (1) daemon argv my parse harness read as help or invalid (env 0), (2) polaris argv my harness read as a refusal or help exit,
(3) RTF-1 containment cases over a symlink fixture built here. Nothing that the base parse would start is run.
Usage: entry_run.py <base-tree> <head-tree> <parse-base.jsonl> <scratch> <out.json>"""
import json, os, subprocess, sys

base, head, parse_file, scratch, out = sys.argv[1:6]
home, cwd, fx = os.path.join(scratch, 'home'), os.path.join(scratch, 'cwd'), os.path.join(scratch, 'fx')
for d in (home, cwd):
    os.makedirs(d, exist_ok=True)
ENV = {'PATH': '/usr/bin:/bin', 'HOME': home, 'TMPDIR': scratch, 'LANG': 'C.UTF-8'}


def run(tree, args):
    try:
        p = subprocess.run([sys.executable and '/home/tze/.nvm/versions/node/v24.6.0/bin/node', os.path.join(tree, 'apps/syzygy/dist/main.js'), *args],
                           cwd=cwd, env=ENV, capture_output=True, timeout=30)
        mask = lambda b: b.decode('utf8', 'replace').replace(tree, '<TREE>')
        return {'exit': p.returncode, 'stdout': mask(p.stdout), 'stderr': mask(p.stderr)}
    except subprocess.TimeoutExpired:
        return {'timeout': True}


rows = [json.loads(l) for l in open(parse_file) if l.strip()]
cases = []
for r in rows:
    if r['env'] != 0:
        continue
    res = r['result'].get('value')
    if r['caller'] == 'daemon' and isinstance(res, dict) and res['kind'] in ('help', 'invalid'):
        cases.append(('daemon', r['argv']))
    if r['caller'] == 'polaris' and ('exited' in r['result'] or isinstance(res, str)):
        cases.append(('polaris', ['polaris', *r['argv']]))

# RTF-1 fixture
root = os.path.join(fx, 'root')
for d in ('.syzygy/governance', 'openspec', 'plain', 'locked/inner', 'elsewhere'):
    os.makedirs(os.path.join(root if not d.startswith('elsewhere') else fx, d), exist_ok=True)
open(os.path.join(root, 'README.md'), 'w').write('# fixture\n')
links = {
    'sd-in': os.path.join(root, '.syzygy', 'x'), 'sd-in-rel': 'root/openspec/y', 'loop-a': 'loop-b', 'loop-b': 'loop-a',
    'root-link': root, 'chain-1': 'chain-2', 'chain-2': os.path.join(root, '.syzygy'), 'self': 'self', 'sd-out': os.path.join(fx, 'elsewhere', 's'),
}
for name, target in links.items():
    p = os.path.join(fx, name)
    if not os.path.lexists(p):
        os.symlink(target, p)
os.chmod(os.path.join(root, 'locked'), 0o000)
J = lambda *p: os.path.join(fx, *p)
rtf = [
    ['--root', root, '--state-dir', J('sd-in'), '--port', '0'],
    ['--root', root, '--state-dir', J('sd-in-rel'), '--port', '0'],
    ['--root', root, '--state-dir', J('sd-in') + '/', '--port', '0'],
    ['--root', root, '--state-dir', J('loop-a'), '--port', '0'],
    ['--root', root, '--state-dir', J('loop-a', 'child'), '--port', '0'],
    ['--root', root, '--state-dir', J('self'), '--port', '0'],
    ['--root', root, '--state-dir', J('root', 'locked', 'inner', 's'), '--port', '0'],
    ['--root', root, '--state-dir', J('root', 'README.md', 'child'), '--port', '0'],
    ['--root', root, '--state-dir', J('chain-1', 'deep', 'er'), '--port', '0'],
    ['--root', J('root-link'), '--state-dir', J('root', '.syzygy', 'q'), '--port', '0'],
    ['--root', J('root-link') + '/', '--state-dir', J('sd-in'), '--port', '0'],
    ['--root', J('loop-a'), '--state-dir', J('sd-out'), '--port', '0'],
    ['--root', J('root', 'locked', 'inner'), '--state-dir', J('sd-out'), '--port', '0'],
    ['--root', root, '--state-dir', J('plain', '..', 'sd-in'), '--port', '0'],
    ['--root', root, '--state-dir', J('root', 'plain', '..', '.syzygy', 'z'), '--port', '0'],
    ['--root', root, '--state-dir', '//' + J('sd-in').lstrip('/'), '--port', '0'],
]
cases += [('rtf1', a) for a in rtf]

results, differ = [], []
for kind, args in cases:
    a, b = run(base, args), run(head, args)
    results.append({'kind': kind, 'argv': args, 'base': a, 'head': b})
    if a != b or 'timeout' in a:
        differ.append(results[-1])
os.chmod(os.path.join(root, 'locked'), 0o700)
summary = {'rows': len(results), 'byKind': {k: sum(1 for r in results if r['kind'] == k) for k in ('daemon', 'polaris', 'rtf1')}, 'differ': len(differ),
           'rtf1BaseExits': sorted({r['base'].get('exit') for r in results if r['kind'] == 'rtf1'}, key=str),
           'rtf1Details': [r['base'].get('stderr', '').split('\n')[0].replace(fx, '<FX>') for r in results if r['kind'] == 'rtf1']}
json.dump({'summary': summary, 'differ': differ, 'results': results}, open(out, 'w'), indent=1)
print(json.dumps(summary, indent=1))
