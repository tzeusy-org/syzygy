"""syzygy-bpyt.8.2: the end-to-end golden for the built `syzygy` entry (apps/syzygy/dist/main.js in <tree>): argv in, exit code,
stdout and stderr out. It runs
  - every daemon (argv, environment) pair the parse-level golden at base read as help or invalid (a pair read as `run` would start
    a daemon, so it is compared at parse level only);
  - eight RTF-1 containment refusals over a fixture of symbolic-link loops, an unreadable directory and links into the governed
    plane, which reach governedPlaneViolation and so resolvePathIntent;
  - every `syzygy polaris` pair the parse-level golden at base read as anything but supervise, with no tmux on PATH, HOME and the
    state root in scratch, so an accepted form ends at a refusal before any session or file.
Nothing runs from or reads a repository but this tree's own build. Usage: subprocess_golden.py <tree> <parse-base.json> <out.json>
"""
import json, os, shutil, subprocess, sys

tree, parse_file, out_file = sys.argv[1], sys.argv[2], sys.argv[3]
ENTRY = os.path.join(tree, 'apps/syzygy/dist/main.js')
NODE = shutil.which('node')
CWD, HOME, RTF = '/tmp/la-b82/gcwd', '/tmp/la-b82/home', '/tmp/la-b82/rtf'
BASE_ENV = {'PATH': '/nonexistent-la-b82/bin', 'HOME': HOME, 'TMPDIR': '/tmp/la-b82/g'}


def fixture():
    if os.path.isdir(f'{RTF}/noperm'):
        os.chmod(f'{RTF}/noperm', 0o755)
    shutil.rmtree(RTF, ignore_errors=True)
    for d in ('root/.syzygy/governance/decisions', 'root/.syzygy/intent', 'root/openspec', 'root2/openspec', 'root3/.syzygy', 'noperm/x', 'state'):
        os.makedirs(f'{RTF}/{d}')
    for r in ('root', 'root2', 'root3'):
        open(f'{RTF}/{r}/README.md', 'w').write('# fixture readme\n')
    os.symlink(f'{RTF}/loop', f'{RTF}/loop')
    os.symlink(f'{RTF}/b', f'{RTF}/a')
    os.symlink(f'{RTF}/a', f'{RTF}/b')
    os.symlink(f'{RTF}/root/.syzygy/x', f'{RTF}/sd-in')
    os.symlink(f'{RTF}/root/openspec', f'{RTF}/sd-in-existing')
    os.symlink(f'{RTF}/root2/.syzygy', f'{RTF}/root2/.syzygy-tmp')
    os.rename(f'{RTF}/root2/.syzygy-tmp', f'{RTF}/root2/.syzygy')
    os.symlink(f'{RTF}/noperm/x', f'{RTF}/root3/openspec')
    os.chmod(f'{RTF}/noperm', 0o000)


RTF_CASES = [
    (['--root', f'{RTF}/loop/sub', '--state-dir', f'{RTF}/state', '--port', '0'], {}),
    (['--root', f'{RTF}/root', '--state-dir', f'{RTF}/a/sub', '--port', '0'], {}),
    (['--root', f'{RTF}/root', '--state-dir', f'{RTF}/noperm/x/y', '--port', '0'], {}),
    (['--root', f'{RTF}/noperm/x/r', '--port', '0'], {}),
    (['--root', f'{RTF}/root', '--state-dir', f'{RTF}/sd-in', '--port', '0'], {}),
    (['--root', f'{RTF}/root', '--state-dir', f'{RTF}/sd-in-existing/sub', '--port', '0'], {}),
    (['--root', f'{RTF}/root2', '--state-dir', f'{RTF}/state', '--port', '0'], {}),
    (['--root', f'{RTF}/root3', '--state-dir', f'{RTF}/state', '--port', '0'], {}),
    (['--root', f'{RTF}/root', '--port', '0'], {'SYZYGY_STATE_DIR': f'{RTF}/sd-in'}),
]


def run(args, env):
    try:
        done = subprocess.run([NODE, ENTRY, *args], cwd=CWD, env={**BASE_ENV, **env},
                              stdin=subprocess.DEVNULL, capture_output=True, text=True, timeout=120)
        return {'exit': done.returncode, 'stdout': done.stdout, 'stderr': done.stderr}
    except subprocess.TimeoutExpired as expired:
        return {'exit': 'timeout', 'stdout': str(expired.stdout), 'stderr': str(expired.stderr)}


parse = json.load(open(parse_file))
os.makedirs(HOME, exist_ok=True)
out = {'daemon': [], 'rtf': [], 'polaris': []}
for row in parse['daemon']:
    if row['result']['kind'] != 'run':
        out['daemon'].append({'argv': row['argv'], 'env': row['env'], **run(row['argv'], row['env'])})
fixture()
for args, env in RTF_CASES:
    out['rtf'].append({'argv': args, 'env': env, **run(args, env)})
os.chmod(f'{RTF}/noperm', 0o755)
shutil.rmtree(RTF)
for row in parse['polaris']:
    result = row['result']
    if isinstance(result, dict) and result.get('mode') == 'supervise':
        continue
    out['polaris'].append({'argv': row['argv'], 'env': row['env'], **run(['polaris', *row['argv']], row['env'])})
assert os.listdir(CWD) == [] and os.listdir(HOME) == [], (os.listdir(CWD), os.listdir(HOME))
json.dump(out, open(out_file, 'w'), indent=1)
print({k: len(v) for k, v in out.items()})
