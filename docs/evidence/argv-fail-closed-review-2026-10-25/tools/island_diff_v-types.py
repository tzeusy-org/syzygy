"""syzygy-bpyt.8.36: old-versus-new differential of the shared resolver, from the PR 524 reviewer's island_diff.py
(docs/evidence/argv-guards-review-2026-10-25/tools/island_diff.py), adapted because both guards' walk now lives in the testkit.

The reviewer's tool wrote each side's island-boundary.test.ts prelude beside the guard, and both preludes then imported the one
testkit in the tree. Here the old side's prelude imports the testkit as it stood at <base>, written beside it as a scratch module;
the new side's imports the tree's own testkit at <head>. One scratch test then answers, on both sides:
  - the island walk from every non-test source module as an entry (reachable list, edges into the island, unresolved specifiers);
  - `resolve(module, specifier)` for every specifier TypeScript's preprocessor reports in every tracked source module, tests included,
    which covers every input the daemon-path walk can give the resolver.
Every scratch file is deleted; the tree must be clean before and after.
--selftest (rule 6): the same run with the tree's testkit mutated so a relative `./X.js` no longer resolves to `X.ts`; the
differential must then report unequal answers. The testkit's bytes are restored afterwards.

Usage: python3 -I island_diff.py <tree> <base> <head> <tmpdir> <out.json> [--selftest]
"""
import hashlib, json, os, shutil, subprocess, sys

tree, base, head, tmpdir, out_file = sys.argv[1:6]
SELFTEST = sys.argv[6:] == ['--selftest']
MUTANT = ("filter(([condition]) => condition !== 'types')", "filter(() => true)")
DIR = 'packages/polaris-generation-core/src'
GUARD = f'{DIR}/island-boundary.test.ts'
KIT = f'{DIR}/workspace-reach.testkit.ts'


def git(*args):
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, check=True).stdout.decode()


assert git('status', '--porcelain') == ''
assert git('rev-parse', 'HEAD').strip() == head


def prelude(commit):
    text = git('show', f'{commit}:{GUARD}')
    return text[:text.index("describe('")]


old_prelude = prelude(base)
assert old_prelude.count("from './workspace-reach.testkit.js';") == 1
old_prelude = old_prelude.replace("from './workspace-reach.testkit.js';", "from './zz-836-old-testkit.js';")
files = sorted(f for f in git('ls-files', '-z', '--', 'apps', 'packages').split('\0') if f and '/src/' in f and f.endswith('.ts'))
entries = [f for f in files if not f.endswith('.test.ts')]
scratch = {
    f'{DIR}/zz-836-old-testkit.ts': git('show', f'{base}:{KIT}'),
    f'{DIR}/zz-836-old-reach.ts': old_prelude + "export { reach as oldReach };\nexport { resolve as oldResolve } from './zz-836-old-testkit.js';\n",
    f'{DIR}/zz-836-new-reach.ts': prelude(head) + "export { reach as newReach };\nexport { resolve as newResolve } from './workspace-reach.testkit.js';\n",
}
answers_file = os.path.join(tmpdir, 'answers.json')
scratch[f'{DIR}/zz-836-diff.test.ts'] = (
    "import { readFileSync, writeFileSync } from 'node:fs';\nimport { join } from 'node:path';\nimport ts from 'typescript';\nimport { it } from 'vitest';\n"
    "import { ROOT } from './workspace-reach.testkit.js';\n"
    "import { oldReach, oldResolve } from './zz-836-old-reach.js';\nimport { newReach, newResolve } from './zz-836-new-reach.js';\n"
    f"const ENTRIES: string[] = {json.dumps(entries)};\nconst FILES: string[] = {json.dumps(files)};\n"
    "it('old and new answer alike', () => {\n"
    "  const walks = ENTRIES.map((entry) => ({ entry, old: JSON.stringify(oldReach(entry)), new: JSON.stringify(newReach(entry)) }));\n"
    "  const edges = FILES.flatMap((file) => ts.preProcessFile(readFileSync(join(ROOT, file), 'utf8'), true, true).importedFiles\n"
    "    .map((imported) => ({ file, specifier: imported.fileName, old: String(oldResolve(file, imported.fileName)), new: String(newResolve(file, imported.fileName)) })));\n"
    f"  writeFileSync({json.dumps(answers_file)}, JSON.stringify({{ walks, edges }}));\n"
    "}, 900_000);\n")
os.makedirs(tmpdir, exist_ok=True)
kit_bytes = open(os.path.join(tree, KIT), 'rb').read()
try:
    if SELFTEST:
        kit_text = kit_bytes.decode()
        assert kit_text.count(MUTANT[0]) == 1
        open(os.path.join(tree, KIT), 'w').write(kit_text.replace(MUTANT[0], MUTANT[1]))
    for path, text in scratch.items():
        assert not os.path.exists(os.path.join(tree, path))
        open(os.path.join(tree, path), 'w').write(text)
    run = subprocess.run(['npx', 'vitest', 'run', '--project', '@syzygy/polaris-generation-core', f'{DIR}/zz-836-diff.test.ts'],
                         cwd=tree, capture_output=True, text=True, env={**os.environ, 'TMPDIR': tmpdir, 'CI': '1'}, timeout=1200)
    answers = json.load(open(answers_file))
finally:
    open(os.path.join(tree, KIT), 'wb').write(kit_bytes)
    for path in scratch:
        if os.path.exists(os.path.join(tree, path)):
            os.remove(os.path.join(tree, path))
    shutil.rmtree(tmpdir, ignore_errors=True)
clean = git('status', '--porcelain') == ''
walks, edges = answers['walks'], answers['edges']
unequal_walks = [w['entry'] for w in walks if w['old'] != w['new']]
unequal_edges = [f"{e['file']} imports {e['specifier']}: {e['old']} -> {e['new']}" for e in edges if e['old'] != e['new']]
stats = {}
for w in walks:
    if w['entry'] in ('apps/syzygy/src/main.ts', 'packages/polaris-generation-consent/src/index.ts'):
        a = json.loads(w['new'])
        stats[w['entry']] = {'reachable': len(a['reachable']), 'intoIsland': len(a['intoIsland']), 'unresolved': len(a['unresolved'])}
out = {'base': base, 'head': head, 'selftest': SELFTEST, 'vitestExit': run.returncode,
       'walks': {'entries': len(walks), 'equal': len(walks) - len(unequal_walks), 'unequal': unequal_walks,
                 'entriesWithEdgesIntoIsland': sum(1 for w in walks if json.loads(w['new'])['intoIsland']),
                 'entriesWithUnresolved': sum(1 for w in walks if json.loads(w['new'])['unresolved']), 'stats': stats,
                 'answersSha256': hashlib.sha256(json.dumps([[w['entry'], w['new']] for w in walks]).encode()).hexdigest()},
       'resolves': {'files': len(files), 'specifiers': len(edges), 'equal': len(edges) - len(unequal_edges), 'unequal': unequal_edges,
                    'byAnswer': {kind: sum(1 for e in edges if (e['new'] == kind if kind in ('null', 'undefined') else e['new'] not in ('null', 'undefined'))) for kind in ('module', 'null', 'undefined')},
                    'answersSha256': hashlib.sha256(json.dumps([[e['file'], e['specifier'], e['new']] for e in edges]).encode()).hexdigest()},
       'cleanAfter': clean, 'toolSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
       'scratchSha256': {p: hashlib.sha256(t.encode()).hexdigest() for p, t in scratch.items()}}
json.dump(out, open(out_file, 'w'), indent=1)
print(json.dumps(out, indent=1))
