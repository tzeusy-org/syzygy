import json, subprocess, sys, os
root = sys.argv[1]; p = os.path.join(root, 'packages/three-surface-poc-core/src/git-object-reader.ts')
orig = open(p).read()
HEAD = r'''`(?:\\]\\(\\s*(?:<\\s*)?|\\]:\\s*(?:<\\s*)?|=\\s*(?:["']\\s*)?|<\\s*)${UNSAFE_SCHEME}`, 'gi')'''
assert orig.count(HEAD) == 1
M = [
 ('m1-drop-ws-after-link-angle', HEAD.replace(r'\\]\\(\\s*(?:<\\s*)?', r'\\]\\(\\s*(?:<)?')),
 ('m2-refdef-angle-without-ws', HEAD.replace(r'\\]:\\s*(?:<\\s*)?', r'\\]:\\s*<?')),
 ('m3-drop-quote', HEAD.replace(r'''=\\s*(?:["']\\s*)?''', r'=\\s*')),
 ('m4-drop-ws-after-quote', HEAD.replace(r'''(?:["']\\s*)?''', r'''["']?''')),
 ('m5-drop-ws-after-autolink', HEAD.replace(r'|<\\s*)', r'|<)')),
 ('m6-drop-refdef', HEAD.replace(r'|\\]:\\s*(?:<\\s*)?', '')),
 ('m7-drop-case-fold', HEAD.replace("'gi')", "'g')")),
 ('m8-sticky-flag', HEAD.replace("'gi')", "'giy')")),
]
rows = []
for mid, new in M:
    assert new != HEAD, mid
    open(p, 'w').write(orig.replace(HEAD, new))
    r = subprocess.run(['npx', 'vitest', 'run', 'packages/three-surface-poc-core/src/unsafe-url-equivalence.test.ts', '-t', 'matches the replaced pattern'], cwd=root, capture_output=True, text=True, timeout=600)
    tail = [l for l in r.stdout.splitlines() if 'Tests ' in l]
    rows.append({'id': mid, 'old': HEAD, 'new': new, 'exit': r.returncode, 'tests': tail[-1].strip() if tail else None, 'killed': r.returncode != 0})
    open(p, 'w').write(orig)
print(json.dumps(rows, indent=1))
