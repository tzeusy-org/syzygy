"""Static checks for review round 2 of PR 554 at 330dd894: fix-file bytes, F1's replaced texts, F1(b)/(c) texts in the body,
testkit importers, the POC surface version, and the changed-path classes. Usage: static_checks.py <clone> <body.md> <out.json>"""
import hashlib, json, re, subprocess, sys

clone, body_path, out = sys.argv[1:4]
S = '/tmp/claude-1000/-home-tze-GitHub-syzygy/9297eba3-858b-4aca-a313-05ea0802ad02/scratchpad'
R1 = f'{S}/rev-554'
HEAD = '330dd89458801e7a150134efa15f3d4af8215304'
BASE = 'a15b6a04da2cda0c5871a05c538b72943b1d660c'
git = lambda *a: subprocess.run(['git', '-C', clone, *a], capture_output=True, check=True).stdout
show = lambda rev, p: git('show', f'{rev}:{p}').decode('utf8')
res = {}

# 1. The round-1 fix files, byte for byte, in their targets at the head.
fixes = {
    'fix-f2-object-entry-row.ts.txt': 'packages/polaris-generation-core/src/workspace-reach.test.ts',
    'fix-n-write-rows.ts.txt': 'packages/support/src/support-purity.test.ts',
    'fix-n-import-reader.ts.txt': 'packages/support/src/support-purity.test.ts',
    'fix-n-import-row.ts.txt': 'packages/support/src/support-purity.test.ts',
    'fix-n-import-reader-rows.ts.txt': 'packages/support/src/support-purity.test.ts',
}
res['fixFiles'] = {}
for name, target in fixes.items():
    text = open(f'{R1}/tools/{name}', encoding='utf8').read()
    head = show(HEAD, target)
    res['fixFiles'][name] = {'sha256': hashlib.sha256(text.encode()).hexdigest(), 'target': target, 'occurrences': head.count(text),
                             'nbspInFix': text.count('\xa0'), 'nbspInTarget': head.count('\xa0')}

# 2. F1's five replaced texts (round-1 body) and the replacements, in the round-2 body.
body = open(body_path, encoding='utf8').read()
raw = open(f'{R1}/R-GP-IMPL-SUPPORT-LEAF-FOLLOWUPS-1-RAW.md', encoding='utf8').read()
r1body = open(f'{S}/lead/b46/body.txt', encoding='utf8').read()
r1lines = r1body.split('\n')
old = {
    'a': '8 test or test-support files',
    'b': r1lines[47], 'c56': r1lines[55], 'd': r1lines[62],
    'e': 'and lists the six entries the config leaves to their built dist:',
}
res['f1OldTexts'] = {k: {'text': v[:200], 'inR1Body': r1body.count(v), 'inR2Body': body.count(v)} for k, v in old.items()}
# The raw's quoted replacements (lines 169 and 181, without the outer quoting backticks).
rawlines = raw.split('\n')
rb = rawlines[168].strip()[3:-1]
rc = rawlines[180].strip()[3:-1]
res['f1b'] = {'rawText': rb, 'inR2Body': body.count(rb)}
res['f1c'] = {'rawText': rc, 'inR2Body': body.count(rc)}
for k in ('f1b', 'f1c'):
    res[k]['nbsp'] = res[k]['rawText'].count('\xa0')

# 3. Importers of the two testkits, over every tracked code/config file outside docs/ at the head.
files = [f for f in git('ls-tree', '-r', '-z', '--name-only', HEAD).decode().split('\0') if f]
needles = {'purity.testkit': re.compile(r'purity\.testkit'), 'workspace-reach.testkit': re.compile(r'workspace-reach\.testkit')}
imp = {k: [] for k in needles}
scanned = 0
for f in files:
    if not re.search(r'\.(?:[cm]?[jt]sx?|json|py|ya?ml)$', f) or f.startswith('docs/'):
        continue
    scanned += 1
    text = show(HEAD, f) if True else ''
    for k, rx in needles.items():
        if rx.search(text) and not f.endswith(k + '.ts'):
            imp[k].append(f)
res['importers'] = {'trackedFiles': len(files), 'scanned': scanned, 'byTestkit': imp,
                    'distinct': sorted(set(imp['purity.testkit']) | set(imp['workspace-reach.testkit'])),
                    'nonTest': sorted(f for v in imp.values() for f in v if not f.endswith('.test.ts'))}
res['importers']['distinctCount'] = len(res['importers']['distinct'])

# 4. The POC surface version, by pwbSurfaceVersion's rule (sha256 over the two src tree ids, newline-joined, first 12 hex).
def surface(rev):
    trees = [git('rev-parse', f'{rev}:{p}').decode().strip() for p in ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src']]
    return 'polaris@' + hashlib.sha256('\n'.join(trees).encode()).hexdigest()[:12]
res['surfaceVersion'] = {r: surface(r) for r in (BASE, HEAD, 'b87e7a40')}

# 5. The changed paths and their classes.
paths = git('diff', '--name-only', '-z', BASE, HEAD).decode().split('\0')
paths = [p for p in paths if p]
res['changedPaths'] = paths
res['nonTestNonDoc'] = [p for p in paths if not (p.startswith('docs/evidence/syzygy-bpyt-46/') or p.endswith('.test.ts') or p.endswith('.testkit.ts') or p == 'AGENTS.md')]
res['configOrWorkflow'] = [p for p in paths if p.endswith('package.json') or p.startswith('.github/') or 'vitest.config' in p or p.endswith('tsconfig.json')]
# Which PR paths main changed between the round-1 base and the merge base, and since.
res['mainChangedPrPaths'] = {
    '1a8864d9..a15b6a04': [p for p in git('diff', '--name-only', '1a8864d9', BASE).decode().split('\n') if p in paths],
    'a15b6a04..b87e7a40': [p for p in git('diff', '--name-only', BASE, 'b87e7a40').decode().split('\n') if p in paths],
}
json.dump(res, open(out, 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v for k, v in res.items() if k not in ('changedPaths',)}, indent=1, ensure_ascii=False)[:9000])
