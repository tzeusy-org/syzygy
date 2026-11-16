"""Run the lane's reader mutants (R1..R10 specs, edits applied verbatim) against the COMMITTED suites only, not the evidence goldens:
the 11 polaris-dossier test files that call runDossierCli (vitest on src) and the daemon entry system test (the built entry, after
rebuilding polaris-dossier's dist). Restores and rebuilds after each mutant. Usage: committed_suite_mutants.py <tree> <scratch> <out.json>"""
import glob, json, os, re, subprocess, sys

tree, scratch, out = sys.argv[1:4]
env = {**os.environ, 'TMPDIR': scratch, 'CI': '1'}
specs = sorted(glob.glob(os.path.join(tree, 'docs/evidence/syzygy-bpyt-8-2/mutants/R*.json')))
specs = [s for s in specs if '856d5c5c' not in s]
dossier_files = subprocess.run(['grep', '-rl', 'runDossierCli', '--include=*.test.ts', 'packages/polaris-dossier/src'], cwd=tree, capture_output=True, text=True).stdout.split()


def sh(cmd, log):
    p = subprocess.run(cmd, cwd=tree, env=env, capture_output=True, text=True)
    open(log, 'w').write(p.stdout + p.stderr)
    text = re.sub(r'\x1b\[[0-9;]*m', '', p.stdout + p.stderr)
    tests = re.findall(r'^\s+Tests\s+(.*)$', text, re.M)
    return {'exit': p.returncode, 'tests': tests[-1].strip() if tests else None,
            'failed': sorted(set(re.findall(r'^\s+× (.*?)(?: \d+ms)?$', text, re.M)))[:8]}


def build():
    return subprocess.run(['npx', 'tsc', '-b', 'packages/polaris-dossier'], cwd=tree, env=env, capture_output=True, text=True).returncode


results = []
for spec in [None, *specs]:
    m = json.load(open(spec)) if spec else {'id': 'R0-unmutated', 'edits': []}
    for e in m['edits']:
        p = os.path.join(tree, e['file'])
        s = open(p).read()
        assert s.count(e['old']) == 1, (m['id'], s.count(e['old']))
        open(p, 'w').write(s.replace(e['old'], e['new']))
    row = {'id': m['id'], 'edits': m['edits'], 'build': build()}
    log = os.path.join(scratch, f"{m['id']}")
    row['dossierTests'] = sh(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-dossier', *dossier_files], log + '-dossier.log')
    row['daemonSystemTest'] = sh(['npx', 'vitest', 'run', '--config', 'packages/cap1-system/vitest.config.ts', 'src/daemon-entry-unchanged.system.test.ts'], log + '-system.log')
    row['killed'] = row['dossierTests']['exit'] != 0 or row['daemonSystemTest']['exit'] != 0
    subprocess.run(['git', 'checkout', '--', 'packages/polaris-dossier/src/argv.ts'], cwd=tree)
    row['restoredClean'] = subprocess.run(['git', 'status', '--porcelain'], cwd=tree, capture_output=True, text=True).stdout == ''
    results.append(row)
    json.dump({'tree': tree, 'dossierFiles': dossier_files, 'results': results}, open(out, 'w'), indent=1)
    print(m['id'], 'killed' if row['killed'] else 'SURVIVED', row['dossierTests']['tests'], '|', row['daemonSystemTest']['tests'], flush=True)
print('final build', build())
