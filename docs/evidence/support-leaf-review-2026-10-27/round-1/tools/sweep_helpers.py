"""Independent reviewer sweep (rev-530): helper definitions and createHash sites over committed
blobs at one commit. Population: production .ts under packages/*/src and apps/*/src (not *.test.ts,
not .d.ts). Usage: sweep_helpers.py <repo> <commit>"""
import re, subprocess, sys, json
repo, commit = sys.argv[1:3]
names = subprocess.run(['git', '-C', repo, 'ls-tree', '-r', '-z', '--name-only', commit], capture_output=True, check=True).stdout.decode().split('\0')
pop = [n for n in names if re.match(r'^(packages|apps)/[^/]+/src/.*\.ts$', n) and not n.endswith('.test.ts') and not n.endswith('.d.ts')]
DEF_SHA = re.compile(r'(?m)^\s*(?:export\s+)?(?:(?:async\s+)?function\s+(sha256\w*)\b|(?:const|let|var)\s+(sha256\w*)\s*=)')
DEF_FREEZE = re.compile(r'(?m)^\s*(?:export\s+)?(?:function\s+(\w*[Ff]reeze\w*)\b|(?:const|let|var)\s+(\w*[Ff]reeze\w*)\s*=\s*(?:<[^>]*>)?\s*\()')
CH = re.compile(r"""createHash\(\s*(['"`])sha256\1\s*\)""")
CH_ANY = re.compile(r'createHash\(')
out = {'commit': commit, 'population': len(pop), 'sha256Defs': [], 'freezeDefs': [], 'createHashSha256': [], 'createHashOther': []}
for p in pop:
    text = subprocess.run(['git', '-C', repo, 'show', f'{commit}:{p}'], capture_output=True, check=True).stdout.decode('utf8')
    for m in DEF_SHA.finditer(text): out['sha256Defs'].append(f"{p}:{text.count(chr(10), 0, m.start())+1}:{m.group(1) or m.group(2)}")
    for m in DEF_FREEZE.finditer(text): out['freezeDefs'].append(f"{p}:{text.count(chr(10), 0, m.start())+1}:{m.group(1) or m.group(2)}")
    for m in CH.finditer(text): out['createHashSha256'].append(f"{p}:{text.count(chr(10), 0, m.start())+1}")
    for m in CH_ANY.finditer(text):
        if not CH.match(text, m.start()): out['createHashOther'].append(f"{p}:{text.count(chr(10), 0, m.start())+1}:{text[m.start():m.start()+40]!r}")
for k in ('sha256Defs', 'freezeDefs', 'createHashSha256', 'createHashOther'): out[k + 'Count'] = len(out[k])
print(json.dumps(out, indent=1))
