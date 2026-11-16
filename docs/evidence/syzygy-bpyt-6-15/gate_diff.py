"""syzygy-bpyt.6.15: the POC observer-input gate, BASE against HEAD, on every path tracked at either commit and on boundary probes.
Each side's decisions come from its own build, by docs/evidence/syzygy-bpyt-7-3/tools/gate-diff.mjs (run unchanged; its sha256 is
recorded). Expected: the only decisions that differ are paths under packages/support/, accepted at BASE and refused at HEAD.
Usage: python3 -I gate_diff.py <base-tree> <head-tree> <tool> <scratch> <out.json>
"""
import hashlib, json, os, shutil, subprocess, sys

base, head, tool, scratch, out_file = sys.argv[1:6]
PROBES = ['packages/support/src/new.ts', 'packages/support/package.json', 'packages/support/tsconfig.json', 'packages/support',
          'packages/supportive/x.ts', 'packages/support-x/src/a.ts', 'packages/polaris-generation-core/src/index.ts',
          'packages/polaris-generation-consent/src/index.ts', 'apps/syzygy/src/main.ts']


def git(tree, *args):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, text=True, check=True).stdout


for tree in (base, head):
    assert git(tree, 'status', '--porcelain') == '', tree
shutil.rmtree(scratch, ignore_errors=True)
os.makedirs(scratch)
tracked = lambda tree: {p for p in git(tree, 'ls-tree', '-r', '--name-only', '-z', 'HEAD').split('\0') if p}
paths = sorted(tracked(base) | tracked(head) | set(PROBES))
json.dump(paths, open(f'{scratch}/paths.json', 'w'))
decisions = {}
for side, tree in (('base', base), ('head', head)):
    subprocess.run(['node', tool, tree, f'{scratch}/paths.json', f'{scratch}/{side}.json'], check=True, capture_output=True, text=True)
    decisions[side] = json.load(open(f'{scratch}/{side}.json'))
differing = [[p, decisions['base'][p], decisions['head'][p]] for p in paths if decisions['base'][p] != decisions['head'][p]]
record = {
    'base': git(base, 'rev-parse', 'HEAD').strip(), 'head': git(head, 'rev-parse', 'HEAD').strip(),
    'toolSha256': hashlib.sha256(open(tool, 'rb').read()).hexdigest(), 'probes': PROBES,
    'paths': len(paths), 'pathsSha256': hashlib.sha256('\0'.join(paths).encode()).hexdigest(),
    'refused': {side: sum(d == 'refused' for d in decisions[side].values()) for side in decisions},
    'probeDecisions': {p: [decisions['base'][p], decisions['head'][p]] for p in PROBES},
    'differing': differing,
    'onlySupportDiffers': bool(differing) and all(p.startswith('packages/support/') and b == 'accepted' and h == 'refused' for p, b, h in differing),
    'everySupportPathDiffers': sorted(p for p, _, _ in differing) == [p for p in paths if p.startswith('packages/support/')],
}
shutil.rmtree(scratch, ignore_errors=True)
json.dump(record, open(out_file, 'w'), indent=1)
print({k: v for k, v in record.items() if k not in ('differing', 'probes')})
