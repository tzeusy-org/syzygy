#!/usr/bin/env python3
"""Reviewer identity checks for PR 529 (rev-529), by git objects only.

Usage: identity.py <repo> <base> <head>
"""
import re
import subprocess
import sys

repo, base, head = sys.argv[1:4]


def show(commit, path):
    r = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{path}'],
                       capture_output=True)
    if r.returncode != 0:
        return None
    return r.stdout.decode('utf-8')


def rev(commit, path):
    r = subprocess.run(['git', '-C', repo, 'rev-parse', f'{commit}:{path}'],
                       capture_output=True, text=True)
    return r.stdout.strip() if r.returncode == 0 else None


out = []
# 1. blob ids
for p in ['credentials.ts', 'credentials.test.ts']:
    b = rev(base, f'packages/cap1-daemon/src/{p}')
    h = rev(head, f'packages/http-host/src/{p}')
    out.append(f'blob {p}: base cap1-daemon {b} head http-host {h} equal={b == h}')

# 2. root-route tail
MARK = "// --- This wave's minimal root route"
bs = show(base, 'packages/cap1-daemon/src/server.ts')
hs = show(head, 'packages/cap1-daemon/src/server.ts')
bt = bs[bs.index(MARK):]
ht = hs[hs.index(MARK):]
out.append(f'shim tail equal to base tail: {bt == ht} (base tail {len(bt)} chars, '
           f'mark count base={bs.count(MARK)} shim={hs.count(MARK)})')
hh = show(head, 'packages/http-host/src/server.ts')
out.append(f'http-host server.ts head == base[:mark] minus edits? '
           f'{hh.count(MARK)} marks in http-host server.ts')

# 3. escapeHtml block
brh = show(base, 'packages/cap1-daemon/src/routes-human.ts')
esc = show(head, 'packages/http-host/src/escape-html.ts')
out.append(f'escape-html.ts occurs verbatim in base routes-human.ts: {esc in brh} '
           f'(count {brh.count(esc)}; {len(esc.splitlines())} lines)')
hrh = show(head, 'packages/cap1-daemon/src/routes-human.ts')
out.append(f'escape-html.ts occurs in head routes-human.ts: {esc in hrh}')
out.append('escapeHtml definitions at head routes-human: '
           f'{len(re.findall(r"function escapeHtml", hrh))}')


# 4. export names of base server.ts / credentials.ts vs shim re-exports
def exports(src):
    names = set()
    for m in re.finditer(r'^export\s+(?:async\s+)?(?:function|const|let|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)',
                         src, re.M):
        names.add(m.group(1))
    for m in re.finditer(r'^export\s*\{([^}]*)\}', src, re.M):
        for part in m.group(1).split(','):
            part = part.strip()
            if not part:
                continue
            part = re.sub(r'^type\s+', '', part)
            names.add(part.split(' as ')[-1].strip())
    return names


for p in ['server.ts', 'credentials.ts']:
    be = exports(show(base, f'packages/cap1-daemon/src/{p}'))
    he = exports(show(head, f'packages/cap1-daemon/src/{p}'))
    hoste = exports(show(head, f'packages/http-host/src/{p}'))
    out.append(f'{p}: base exports {len(be)}; head shim exports {len(he)}; '
               f'missing={sorted(be - he)} extra={sorted(he - be)}')
    out.append(f'{p}: http-host exports {len(hoste)}; base-not-in-host={sorted(be - hoste)} '
               f'host-not-in-base={sorted(hoste - be)}')

print('\n'.join(out))
