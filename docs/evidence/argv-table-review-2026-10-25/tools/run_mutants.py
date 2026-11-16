"""rev-521: my own mutant runner, independent of the lane's mutate.py. For each mutant: apply each edit (an `old` that must occur
exactly once, replaced by `new`; or `create`, a new file), run the command in the tree, restore every file byte for byte (and delete
created files), and record the exit, vitest's Tests line and the failed test titles. A mutant is killed when the command exits
nonzero; a control must exit 0. The tree must be clean before and after. Usage: run_mutants.py <tree> <mutants.json> <out.json>"""
import json, os, re, subprocess, sys

tree, spec_file, out_file = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
assert git('status', '--porcelain') == '', 'tree not clean before'
head = git('rev-parse', 'HEAD').strip()
results = []
for m in json.load(open(spec_file)):
    originals, created = {}, []
    try:
        for e in m['edits']:
            p = os.path.join(tree, e['file'])
            if 'create' in e:
                assert not os.path.exists(p), p
                open(p, 'w').write(e['create']); created.append(p); continue
            originals.setdefault(p, open(p, 'rb').read())
            text = open(p).read()
            n = text.count(e['old'])
            assert n == 1, (m['id'], e['file'], n)
            open(p, 'w').write(text.replace(e['old'], e['new']))
        run = subprocess.run(m['command'], shell=True, cwd=tree, capture_output=True, text=True, timeout=1500)
    finally:
        for p, data in originals.items(): open(p, 'wb').write(data)
        for p in created: os.remove(p)
    plain = re.sub(r'\x1b\[[0-9;]*m', '', run.stdout + run.stderr)
    tests = [l.strip() for l in plain.split('\n') if re.match(r'\s*Tests\s', l)]
    failed = [l.strip() for l in plain.split('\n') if re.match(r'\s*×\s', l)]
    control = m.get('control', False)
    verdict = ('passes' if run.returncode == 0 else 'FAILS') if control else ('killed' if run.returncode != 0 else 'SURVIVED')
    results.append({**m, 'exit': run.returncode, 'tests': tests, 'failed': failed[:12], 'tail': plain.strip().split('\n')[-3:], 'verdict': verdict})
    print(m['id'], verdict, run.returncode, tests, flush=True)
clean = git('status', '--porcelain') == ''
json.dump({'commit': head, 'restoredClean': clean, 'results': results}, open(out_file, 'w'), indent=1, ensure_ascii=False)
print('restoredClean', clean)
