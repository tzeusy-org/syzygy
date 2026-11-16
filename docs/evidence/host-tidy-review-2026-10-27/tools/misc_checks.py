"""R-GP-IMPL-HOST-TIDY-1 reviewer tool: the smaller checks, in one record.
Usage: python3 -I misc_checks.py <repo> <base tree> <head tree> <merge tree> <out.json>
  - main moved: the paths #536 changed against the subject's paths, and `git merge-tree --write-tree` of bb05df7e and 561c80b3;
  - the POC surface version (sha256 over the two tree ids, newline-joined, 12 hex) at each commit;
  - the polaris-authority-sweep walk's population (tracked .md/.json/.yml/.yaml/.ts under its five roots) at each commit;
  - server.ts's header block at both commits;
  - the npm-installed tree (every file and link under each node_modules, with sizes) at each built tree;
  - every built file under apps/*/dist and packages/*/dist, base tree against head tree."""
import hashlib, json, os, re, subprocess, sys

repo, base_t, head_t, merge_t, out = sys.argv[1:6]
BASE, HEAD, EVID, MAIN = ('9dba258992667f62ad503ec76d8a6b99efcc4bac', 'f2304fd5d2bfd0e50c48d6ea356ddea3f7be162d',
                          '561c80b38d447a56e4c1542e0a8fbbdb2dd1d845', 'bb05df7ea409039c5a6465e7179f9d0c66931ad3')
git = lambda *a, cwd=repo: subprocess.run(['git', '-C', cwd, *a], capture_output=True, text=True, check=True).stdout
rec = {}
m536, subj = set(git('diff', '--name-only', BASE, MAIN).split()), set(git('diff', '--name-only', BASE, EVID).split())
rec['main536'] = {'pathsChanged': len(m536), 'subjectPaths': len(subj), 'overlap': sorted(m536 & subj),
                  'mergeTree': git('merge-tree', '--write-tree', MAIN, EVID).strip(),
                  'localMergeTree': git('rev-parse', 'HEAD^{tree}', cwd=merge_t).strip()}
rec['surfaceVersion'] = {}
for c in (BASE, HEAD, EVID, MAIN):
    trees = [git('rev-parse', f'{c}:{p}').strip() for p in ('apps/three-surface-poc/src', 'packages/three-surface-poc-core/src')]
    rec['surfaceVersion'][c[:8]] = 'polaris@' + hashlib.sha256('\n'.join(trees).encode()).hexdigest()[:12]
rec['sweepPopulation'] = {}
for c in (BASE, HEAD, EVID, MAIN):
    n = b = 0
    for r in git('ls-tree', '-r', '-l', '-z', c, '--', '.syzygy/governance', 'openspec', 'packages', 'apps', 'docs').split('\0'):
        if not r:
            continue
        meta, path = r.split('\t', 1)
        if re.search(r'\.(md|json|ya?ml|ts)$', path) and not any(p in ('node_modules', 'dist', '.git') for p in path.split('/')):
            n += 1
            b += int(meta.split()[3])
    rec['sweepPopulation'][c[:8]] = {'files': n, 'bytes': b}
rec['serverHeader'] = {}
for c in (BASE, HEAD):
    lines = git('show', f'{c}:packages/http-host/src/server.ts').split('\n')
    rec['serverHeader'][c[:8]] = {'lines': len(lines), 'lines11to29AllComment': all(l.startswith('//') for l in lines[10:29]),
                                  'line10Blank': lines[9] == '', 'line30Blank': lines[29] == ''}


def installed(t):
    rows = []
    for top in ['node_modules'] + [f'{d}/{p}/node_modules' for d in ('apps', 'packages') for p in sorted(os.listdir(os.path.join(t, d)))]:
        root = os.path.join(t, top)
        if not os.path.isdir(root):
            continue
        for dirpath, dirs, files in os.walk(root):
            # .vite holds Vitest's results cache, written by test runs after the install, not by npm ci.
            dirs[:] = [d for d in dirs if d not in ('.cache', '.vite') and not os.path.islink(os.path.join(dirpath, d))]
            for name in sorted(os.listdir(dirpath)):
                p = os.path.join(dirpath, name)
                rel = os.path.relpath(p, t)
                if rel == 'node_modules/.package-lock.json' or name in ('.cache', '.vite'):
                    continue
                if os.path.islink(p):
                    rows.append(f'{rel} -> {os.readlink(p)}')
                elif os.path.isfile(p):
                    rows.append(f'{rel} {os.path.getsize(p)}')
    return len(rows), hashlib.sha256('\n'.join(sorted(rows)).encode()).hexdigest()


hidden = {k: json.load(open(os.path.join(t, 'node_modules/.package-lock.json'))) for k, t in (('base', base_t), ('head', head_t), ('merge', merge_t))}
hidden['base']['packages']['apps/three-surface-poc']['dependencies'].pop('@syzygy/cap1-daemon')
rec['hiddenLockEqualModuloTheEdge'] = hidden['base'] == hidden['head'] == hidden['merge']
rec['installedTree'] = {k: dict(zip(('entries', 'sha256'), installed(t))) for k, t in (('base', base_t), ('head', head_t), ('merge', merge_t))}


def built(t):
    outp = {}
    for d in ('apps', 'packages'):
        for p in os.listdir(os.path.join(t, d)):
            for dirpath, _, files in os.walk(os.path.join(t, d, p, 'dist')):
                for f in files:
                    fp = os.path.join(dirpath, f)
                    outp[os.path.relpath(fp, t)] = hashlib.sha256(open(fp, 'rb').read()).hexdigest()
    return outp


a, b = built(base_t), built(head_t)
rec['builtFiles'] = {'base': len(a), 'head': len(b), 'onlyBase': sorted(set(a) - set(b)), 'onlyHead': sorted(set(b) - set(a)),
                     'differing': sorted(p for p in set(a) & set(b) if a[p] != b[p])}
json.dump(rec, open(out, 'w'), indent=1)
print(json.dumps({k: v for k, v in rec.items() if k != 'builtFiles'}, indent=1))
print('builtFiles:', rec['builtFiles']['base'], rec['builtFiles']['head'], 'differing', len(rec['builtFiles']['differing']))
