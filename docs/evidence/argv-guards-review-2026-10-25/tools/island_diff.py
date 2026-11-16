"""rev-524: old-versus-new differential of the island guard's walk over every non-test source module of the workspace as an entry.

The old walk is island-boundary.test.ts at <base>, the new one island-boundary.test.ts at <head> (which calls the testkit): each file's
text before its first `describe(` is written as a scratch module beside the guard, read from the git objects, with one export line
appended. A scratch test runs both walks from every entry and writes the answers. Every scratch file is deleted; the tree must be clean.

Usage: python3 -I island_diff.py <tree> <base> <head> <tmpdir> <out.json>
"""
import hashlib, json, os, shutil, subprocess, sys

tree, base, head, tmpdir, out_file = sys.argv[1:6]
DIR = 'packages/polaris-generation-core/src'
GUARD = f'{DIR}/island-boundary.test.ts'


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout.decode()


assert git('status', '--porcelain') == ''
assert git('rev-parse', 'HEAD').strip() == head


def prelude(commit, name):
    text = git('show', f'{commit}:{GUARD}')
    return text[:text.index("describe('")] + f'export {{ reach as {name} }};\n'


entries = sorted(f for f in git('ls-files', '-z', '--', 'apps', 'packages').split('\0')
                 if f and '/src/' in f and f.endswith('.ts') and not f.endswith('.test.ts'))
scratch = {f'{DIR}/zz-r524-old-reach.ts': prelude(base, 'oldReach'), f'{DIR}/zz-r524-new-reach.ts': prelude(head, 'newReach')}
answers_file = os.path.join(tmpdir, 'answers.json')
scratch[f'{DIR}/zz-r524-island-diff.test.ts'] = (
    "import { writeFileSync } from 'node:fs';\nimport { it } from 'vitest';\n"
    "import { oldReach } from './zz-r524-old-reach.js';\nimport { newReach } from './zz-r524-new-reach.js';\n"
    f"const ENTRIES: string[] = {json.dumps(entries)};\n"
    "it('old and new walks answer alike from every entry', () => {\n"
    "  const rows = ENTRIES.map((entry) => ({ entry, old: JSON.stringify(oldReach(entry)), new: JSON.stringify(newReach(entry)) }));\n"
    f"  writeFileSync({json.dumps(answers_file)}, JSON.stringify(rows));\n"
    "}, 900_000);\n")
os.makedirs(tmpdir, exist_ok=True)
try:
    for path, text in scratch.items():
        assert not os.path.exists(os.path.join(tree, path))
        open(os.path.join(tree, path), 'w').write(text)
    run = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-generation-core', f'{DIR}/zz-r524-island-diff.test.ts'],
                         cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=1200)
    rows = json.load(open(answers_file))
finally:
    for path in scratch:
        if os.path.exists(os.path.join(tree, path)):
            os.remove(os.path.join(tree, path))
    shutil.rmtree(tmpdir, ignore_errors=True)
clean = git('status', '--porcelain') == ''
unequal = [r['entry'] for r in rows if r['old'] != r['new']]
stats = {}
for r in rows:
    if r['entry'] in ('apps/syzygy/src/main.ts', 'packages/polaris-generation-consent/src/index.ts'):
        a = json.loads(r['new'])
        stats[r['entry']] = {'reachable': len(a['reachable']), 'intoIsland': len(a['intoIsland']), 'unresolved': len(a['unresolved'])}
nonempty_into = sum(1 for r in rows if json.loads(r['new'])['intoIsland'])
nonempty_unres = sum(1 for r in rows if json.loads(r['new'])['unresolved'])
out = {'base': base, 'head': head, 'vitestExit': run.returncode, 'entries': len(rows), 'equal': len(rows) - len(unequal), 'unequal': unequal,
       'entriesWithEdgesIntoIsland': nonempty_into, 'entriesWithUnresolved': nonempty_unres, 'stats': stats,
       'answersSha256': hashlib.sha256(json.dumps([[r['entry'], r['new']] for r in rows]).encode()).hexdigest(), 'cleanAfter': clean,
       'scratchSha256': {p: hashlib.sha256(t.encode()).hexdigest() for p, t in scratch.items()}}
json.dump(out, open(out_file, 'w'), indent=1)
print(json.dumps(out, indent=1))
