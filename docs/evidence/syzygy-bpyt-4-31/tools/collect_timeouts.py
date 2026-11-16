#!/usr/bin/env python3
"""The timeout vitest gives every collected test, base against head (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/collect_timeouts.py BASE-TREE HEAD-TREE OUT.json

In each tree (a clean checkout with `npm ci` run) vitest collects every test of the root config's projects, and of the system
tier's config, with a test-name filter no test matches, so no test or hook runs; a reporter records each test's file, full name
and `timeout`, the value the runner would enforce (an explicit timeout, else the project's testTimeout). OUT.json lists every test
whose timeout differs, every test present on one side only, and the counts. A hook's timeout is not a collected field; the AST
census (timeout_census.mjs) compares those."""
import hashlib, json, os, subprocess, sys, tempfile

REPORTER = r"""import { writeFileSync } from 'node:fs';
export default class {
  onFinished(files) {
    const rows = [];
    const walk = (task, names) => {
      if (task.type === 'test') rows.push({ file: task.file?.filepath ?? null, name: [...names, task.name].join(' > '), timeout: task.timeout });
      for (const child of task.tasks ?? []) walk(child, task.type === 'suite' && task.name ? [...names, task.name] : names);
    };
    for (const file of files) for (const task of file.tasks) walk(task, []);
    writeFileSync(process.env.COLLECT_TIMEOUTS_OUT, JSON.stringify(rows));
  }
}
"""
NO_MATCH = 'syzygy-bpyt.4.31: a name no test has'

def collect(tree, config):
    git = lambda *a: subprocess.run(['git', '-C', tree, *a], capture_output=True, text=True, check=True).stdout.strip()
    if git('status', '--porcelain', '--untracked-files=no'): sys.exit(f'{tree}: tracked files not clean')
    with tempfile.TemporaryDirectory() as tmp:
        reporter, rows = os.path.join(tmp, 'collect.mjs'), os.path.join(tmp, 'rows.json')
        open(reporter, 'w', encoding='utf8').write(REPORTER)
        done = subprocess.run(['npx', 'vitest', 'run', *(['--config', config] if config else []), f'--reporter={reporter}', '-t', NO_MATCH],
                              cwd=tree, capture_output=True, text=True, env={**os.environ, 'COLLECT_TIMEOUTS_OUT': rows, 'SYZYGY_FRESH_CLONE': '1'})
        if not os.path.exists(rows): sys.exit(f'{tree} {config}: collection wrote nothing (exit {done.returncode}): {done.stderr[-2000:]}')
        found = json.load(open(rows, encoding='utf8'))
    return git('rev-parse', 'HEAD'), [{**r, 'file': os.path.relpath(r['file'], tree)} for r in found if r['file']]

base_tree, head_tree, out_path = sys.argv[1:4]
sides = {}
for role, tree in (('base', base_tree), ('head', head_tree)):
    commit, rows = None, []
    for config in (None, 'packages/cap1-system/vitest.config.ts'):
        commit, got = collect(os.path.abspath(tree), config)
        rows += got
    keys = [(r['file'], r['name']) for r in rows]
    sides[role] = {'commit': commit, 'tests': len(rows), 'distinctKeys': len(set(keys)), 'rows': {f'{r["file"]} :: {r["name"]}': r['timeout'] for r in rows}}
b, h = sides['base']['rows'], sides['head']['rows']
out = {
    'tool': 'collect_timeouts.py', 'toolSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
    'base': {k: v for k, v in sides['base'].items() if k != 'rows'}, 'head': {k: v for k, v in sides['head'].items() if k != 'rows'},
    'changed': [{'test': k, 'base': b[k], 'head': h[k]} for k in sorted(b) if k in h and b[k] != h[k]],
    'onlyBase': sorted(set(b) - set(h)), 'onlyHead': sorted(set(h) - set(b)),
    'unchanged': sum(1 for k in b if k in h and b[k] == h[k]),
}
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
print(f"base {out['base']['tests']} tests, head {out['head']['tests']}; {out['unchanged']} unchanged, {len(out['changed'])} changed, "
      f"{len(out['onlyBase'])} only at base, {len(out['onlyHead'])} only at head")
for c in out['changed']: print(f"  {c['base']} -> {c['head']}  {c['test'][:150]}")
