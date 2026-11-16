#!/usr/bin/env python3
"""rev-532c (round 3): show what the text-row survivors really do, and run every test that reads main.ts on them. Reviewer tool, not authority.

usage: python3 -I demo_loads_r3.py TREE VARIANTS.py OUT.json ID...

For each variant ID of VARIANTS.py: apply its edits to apps/syzygy/src/main.ts, rebuild with `npx tsc -b apps/syzygy`
(recording the compiler's verdict; a variant that does not compile stops there), then
  hook:   run the built entry with the variant's demo argv and env, preloading the same load hook the PR's load-hook row
          writes (NODE_OPTIONS=--import, logging every URL under apps/three-surface-poc/), once with the demo env and once
          without it; read stdout until `listening at` (or exit), GET / once, SIGINT the entry (its own PID), and record the
          exit code, the listening line, the GET status and the POC-app URLs the hook logged;
  strace: the same run under `strace -f -qq -e trace=openat`, without the hook, recording every opened path under
          apps/three-surface-poc/dist (an observer independent of Node's module hooks); the entry is SIGINTed by the PID
          strace started (read from /proc/<strace>/task/*/children);
  tests:  the whole daemon-entry file under the system config, and the four static files that read main.ts or walk its
          import graph (subpath-imports, island-boundary, argv, workspace-reach), each with the JSON reporter.
Restores main.ts and rebuilds after each variant; checks the tree clean at the end.
"""
import json, os, select, signal, subprocess, sys, tempfile, time, urllib.request
from pathlib import Path

tree, variants_py, out_path, ids = os.path.abspath(sys.argv[1]), sys.argv[2], sys.argv[3], sys.argv[4:]
MAIN, TEST = 'apps/syzygy/src/main.ts', 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
STATIC = ['packages/polaris-dossier/src/subpath-imports.test.ts', 'packages/polaris-generation-core/src/island-boundary.test.ts',
          'packages/polaris-dossier/src/argv.test.ts', 'packages/polaris-generation-core/src/workspace-reach.test.ts']
ns = {}
exec(compile(open(variants_py, encoding='utf8').read(), variants_py, 'exec'), ns)
entry = os.path.join(tree, 'apps/syzygy/dist/main.js')
app = Path(os.path.realpath(os.path.join(tree, 'apps/three-surface-poc'))).as_uri() + '/'
work = tempfile.mkdtemp(prefix='demo-')
hook, log = os.path.join(work, 'hook.mjs'), os.path.join(work, 'loads.txt')
open(hook, 'w').write("\n".join([
    "import { appendFileSync } from 'node:fs';",
    "import { registerHooks } from 'node:module';",
    "registerHooks({ load(url, context, nextLoad) {",
    "  if (url.startsWith(process.env.POC_APP_URL)) appendFileSync(process.env.POC_LOAD_LOG, `${url}\\n`);",
    "  return nextLoad(url, context);",
    "} });"]))
base_env = {k: v for k, v in os.environ.items() if not k.startswith(('SYZYGY_', 'VITEST'))}
vitest_env = {k: v for k, v in os.environ.items() if not k.startswith('VITEST')}

def build():
    d = subprocess.run(['npx', 'tsc', '-b', 'apps/syzygy'], cwd=tree, capture_output=True, text=True)
    return d.returncode, (d.stdout + d.stderr)[-1500:]

def fixture():
    d = tempfile.mkdtemp(prefix='root-', dir=work)
    root = os.path.join(d, 'root')
    for sub in ('.syzygy/governance/decisions', '.syzygy/intent', 'openspec'): os.makedirs(os.path.join(root, sub))
    open(os.path.join(root, 'README.md'), 'w').write('# fixture readme\n')
    return d, root, os.path.join(d, 'state')

def drive(argv_t, env, strace):
    d, root, state = fixture()
    argv = [a.replace('{ROOT}', root).replace('{STATE}', state) for a in argv_t]
    open(log, 'w').close()
    trace = os.path.join(d, 'strace.txt')
    cmd = (['strace', '-f', '-qq', '-e', 'trace=openat', '-o', trace] if strace else []) + ['node', entry, *argv]
    p = subprocess.Popen(cmd, cwd=d, env=env, stdout=subprocess.PIPE, stderr=subprocess.PIPE, text=True, start_new_session=True)
    out, listening, status, began = '', None, None, time.time()
    while time.time() - began < 90:
        r, _, _ = select.select([p.stdout], [], [], 1.0)
        if r:
            line = p.stdout.readline()
            if not line: break
            out += line
            if 'listening at' in line:
                listening = line.strip()
                port = line.split('127.0.0.1:')[1].split('/')[0]
                try: status = urllib.request.urlopen(f'http://127.0.0.1:{port}/', timeout=20).status
                except Exception as e: status = f'error: {e}'
                break
        elif p.poll() is not None: break
    target = p.pid
    if strace:
        kids = [int(c) for t in os.listdir(f'/proc/{p.pid}/task') for c in open(f'/proc/{p.pid}/task/{t}/children').read().split()] if os.path.exists(f'/proc/{p.pid}') else []
        target = kids[0] if kids else None
    if target and p.poll() is None: os.kill(target, signal.SIGINT)
    try: rest, err = p.communicate(timeout=60)
    except subprocess.TimeoutExpired:
        os.killpg(p.pid, signal.SIGKILL); rest, err = p.communicate()
    rec = {'argv': argv_t, 'env': {k: env[k] for k in env if k.startswith('SYZYGY_')}, 'exit': p.returncode, 'listening': listening, 'getStatus': status,
           'stdoutTail': (out + rest)[-300:], 'stderrTail': err[-300:]}
    if strace:
        lines = open(trace).read().splitlines() if os.path.exists(trace) else []
        opened = sorted({l.split('"')[1] for l in lines if '"' in l and '/apps/three-surface-poc/dist/' in l.split('"')[1] and 'ENOENT' not in l})
        rec.update(straceOpenedPocDistFiles=len(opened), straceFirst=opened[:3])
    else:
        loads = [l for l in open(log).read().splitlines() if l]
        rec.update(hookLoggedPocUrls=len(loads), hookFirst=loads[:3])
    return rec

def vitest(files, config, tag):
    report = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'demo-{tag}.json')
    load = open('/proc/loadavg').read().split()[0]
    cmd = ['npx', 'vitest', 'run', *(['--config', config] if config else []), *files, '--reporter=json', f'--outputFile={report}']
    d = subprocess.run(cmd, cwd=tree, capture_output=True, text=True, timeout=1200, env=vitest_env)
    rows = [a for s in json.load(open(report, encoding='utf8'))['testResults'] for a in s['assertionResults']] if os.path.exists(report) else []
    if os.path.exists(report): os.remove(report)
    return {'exit': d.returncode, 'load1Start': load, 'passed': sum(r['status'] == 'passed' for r in rows), 'failed': sorted(r['fullName'] for r in rows if r['status'] == 'failed'),
            'total': len(rows)}

if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree is not clean')
main0 = open(os.path.join(tree, MAIN), encoding='utf8').read()
code, text = build()
if code: sys.exit(f'control build failed: {text}')
results = []
for vid in ids:
    v = ns['VARIANTS'][vid]
    rec = {'id': vid, 'kind': v['kind'], 'note': v['note'], 'edits': ns['edits_of'](main0, v['edits'])}
    try:
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(ns['apply'](main0, v['edits']))
        code, text = build()
        rec['build'] = {'exit': code, 'tail': text if code else ''}
        if code == 0:
            demo = v.get('demo', {'argv': ['--help'], 'env': {'SYZYGY_PRELOAD_RENDERER': '1'}})
            hooked = {**base_env, 'NODE_OPTIONS': f'--import={Path(hook).as_uri()}', 'POC_APP_URL': app, 'POC_LOAD_LOG': log}
            rec['hook'] = [drive(demo['argv'], {**hooked, **demo['env']}, False)]
            if demo['env']: rec['hook'].append(drive(demo['argv'], hooked, False))
            rec['strace'] = [drive(demo['argv'], {**base_env, **demo['env']}, True)]
            rec['daemonEntryTest'] = vitest([TEST], 'packages/cap1-system/vitest.config.ts', f'{vid}-de')
            rec['staticTests'] = vitest(STATIC, None, f'{vid}-static')
    finally:
        open(os.path.join(tree, MAIN), 'w', encoding='utf8').write(main0)
        build()
    results.append(rec)
    print(json.dumps({'id': vid, 'build': rec['build']['exit'], 'buildTail': rec['build']['tail'][-200:],
                      'hook': [(h['env'], h['exit'], h['listening'] is not None, h['getStatus'], h['hookLoggedPocUrls']) for h in rec.get('hook', [])],
                      'strace': [(s['exit'], s['listening'] is not None, s['straceOpenedPocDistFiles']) for s in rec.get('strace', [])],
                      'de': (rec.get('daemonEntryTest') or {}).get('passed'), 'deFailed': (rec.get('daemonEntryTest') or {}).get('failed'),
                      'static': ((rec.get('staticTests') or {}).get('passed'), (rec.get('staticTests') or {}).get('total'))}), flush=True)
if subprocess.run(['git', 'diff', '--quiet'], cwd=tree).returncode: sys.exit('tree not restored')
json.dump({'tool': os.path.basename(__file__), 'commit': subprocess.run(['git', 'rev-parse', 'HEAD'], cwd=tree, capture_output=True, text=True).stdout.strip(),
           'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(), 'results': results}, open(out_path, 'w', encoding='utf8'), indent=1)
