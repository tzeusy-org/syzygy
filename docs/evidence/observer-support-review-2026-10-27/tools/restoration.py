"""rev-540: the restoration premise. Which pre-#530 daemon-closure files did #530 change, did each lose a sha256/deepFreeze
implementation, and was each under a pre-#530 observer-input prefix?
Usage: python3 -I restoration.py <tree> <closure-independent-pre530.json>
"""
import json, re, subprocess, sys
tree, closure = sys.argv[1:3]
PRE, MERGE = 'e5080f4dcdcc208127ae5dc0b915acf413df9764', 'f7477f52c49ee347f96b92703887c31f6be49e07'
PREFIXES = ['apps/three-surface-poc/', 'packages/three-surface-poc-core/', 'packages/cap1-daemon/', 'packages/http-host/', 'packages/cap1-core/']
mods = json.load(open(closure))['modules']
changed = set(subprocess.run(['git', '-C', tree, 'diff', '--name-only', PRE, MERGE], capture_output=True, text=True, check=True).stdout.split())
IMPL = re.compile(r"^-.*(createHash\(|function deepFreeze|deepFreeze<T>|export function sha256|function sha256)", re.M)
rows = []
for m in sorted(set(mods) & changed):
    d = subprocess.run(['git', '-C', tree, 'diff', PRE, MERGE, '--', m], capture_output=True, text=True, check=True).stdout
    lost = len(IMPL.findall(d))
    rows.append((m, lost, any(m.startswith(p) for p in PREFIXES)))
for r in rows: print(r)
print('closure files changed by #530:', len(rows), '| losing an implementation line:', sum(1 for r in rows if r[1]), '| outside the pre-#530 prefixes:', [r[0] for r in rows if not r[2]])
print('pre-#530 closure modules outside the prefixes:', [m for m in mods if not any(m.startswith(p) for p in PREFIXES)])
