#!/usr/bin/env python3
"""Successor daemon-entry campaign; fixture-only, with all attempts and exact mutations retained.

usage: python3 -I daemon_entry_probe.py TREE OUT.json [TEST-FILE-SOURCE-COMMIT]

TREE is one private installed clean committed fixture checkout. Its common current main/state/shutdown/current-test
identities are retained separately from the selected test-copy digest. Original cases are preserved; copied reviewed
G1-G7/Y1b definitions and current computed-island/machine-request witnesses extend them. Each source fragment must match
exactly once. Only predecessor hook absence can be an admissible skip. A build error, timeout, zero rows, unrelated
failure or skipped fragment is not a kill. Raw JSON and combined streams remain beside OUT, including build attempts.
The baseline clean build precedes this tool; incremental builds then re-emit changed/restored existing source files.
No observed repository, credential disclosure, provider call or historical result writer is used.
"""
import hashlib, json, os, signal, subprocess, sys, time

tree, out_path = os.path.abspath(sys.argv[1]), sys.argv[2]
test_source = sys.argv[3] if len(sys.argv) > 3 else None
MAIN = 'apps/syzygy/src/main.ts'
TEST = 'packages/cap1-system/src/daemon-entry-unchanged.system.test.ts'
LIMIT_S = 600
ANCHOR = "import { resolvePathIntent } from '@syzygy/polaris-dossier/state-directory';\n"
DAEMON = "  let parsed = parseCli(process.argv.slice(2), process.env);\n"
LOAD = "await import('@syzygy/three-surface-poc-app/dossier-site');"
SITE = "'@syzygy/three-surface-poc-app/dossier-site'"
POLARIS_COMMENT = "  // `syzygy polaris <url>` is the one-command launched run"
POLARIS = ("    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
           "    const { renderLocalDossier } = await import('@syzygy/three-surface-poc-app/dossier-site');\n"
           "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n")
SHUT = 'packages/http-host/src/shutdown.ts'
FLAG = "process.env.SYZYGY_PRELOAD_RENDERER === '1'"
DOSSIER_END = "    }, { renderer: renderLocalDossier });\n  }\n"
ARGV, DOSSIER_OPEN = "  const argv = process.argv.slice(2);\n", "  if (argv[0] === 'dossier') {\n"
DOSSIER_RETURN = "    return runDossierCli(argv.slice(1), {\n"
POLARIS_END = "    return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n  }\n"
POLARIS_HEAD = ("  }\n\n"
                "  // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
                "  // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
                "  // `dossier` steps in process and starts the agent sessions in views.\n"
                "  if (argv[0] === 'polaris') {\n")
HOOK_BODY = ("    const { registerHooks } = process.getBuiltinModule('node:module');\n"
             "    const { readFileSync } = process.getBuiltinModule('node:fs');\n"
             "    registerHooks({ load: (url, context, nextLoad) => (url.includes('/apps/three-surface-poc/')\n"
             "      ? { format: 'module', source: readFileSync(new URL(url), 'utf8'), shortCircuit: true } : nextLoad(url, context)) });\n"
             f"    await import({SITE});\n")
def after(anchor, line, mid, file=MAIN, kind='defect', note=''):
    return {'id': mid, 'kind': kind, 'file': file, 'note': note, 'old': anchor, 'new': anchor + line}
# kind `defect`: the daemon path loads the POC app (on some argv or event), so the new test must fail; `equivalent`: nothing
# on the daemon path loads it, so the new test should pass (the old text pin fails most of these); `hook`: a mutant of the
# new row's own hook, which must fail it (absent from the old test, so skipped there); `residual`: a daemon-path load in
# code no row reads and on a path no row drives, disclosed in the record.
MUTANTS = [
    None,
    after(ANCHOR, "import '@syzygy/three-surface-poc-app/dossier-site';\n", 'P-static', note='a static side-effect import at module top'),
    after("  const argv = process.argv.slice(2);\n", f"  {LOAD}\n", 'P-before-branches', note='a dynamic load before both branches, so every argv runs it'),
    {'id': 'P-daemon-dynamic', 'kind': 'defect', 'file': MAIN, 'note': 'a dynamic load where the daemon path begins',
     'old': DAEMON, 'new': f"  {LOAD}\n" + DAEMON},
    after("  if (parsed.kind === 'help') {\n", f"    {LOAD}\n", 'P-help-branch', note='a load in the usage branch'),
    after("  if (parsed.kind === 'invalid') {\n", f"    {LOAD}\n", 'P-invalid-branch', note='a load in the refusal branch'),
    after("  if (!start.started) {\n", f"    {LOAD}\n", 'P-start-failure', note='a load in the branch a daemon that fails to start takes'),
    after("    const { readFile } = await import('node:fs/promises');\n", f"    {LOAD}\n", 'P-entry-read', note='a load at request time, in the entry reader'),
    # X1-X3 are rev-532b's (R-GP-IMPL-TEST-CLOCKS-2, section 3.2): main's #529 moved the shutdown handler into
    # @syzygy/http-host (`closeOnSignal`), so the lane's P-close-failure and P-shutdown fragments no longer occur in main.ts.
    after("    closeFailed: (cause) => {\n", f"      void import({SITE});\n", 'X1-close-failed-callback-in-main',
          note="a load in main.ts's closeFailed callback (the lane's P-close-failure, re-targeted)"),
    after("      if (closing) return;\n", f"      void import({SITE});\n", 'X3-shutdown-in-http-host', file=SHUT,
          note="a load in http-host's shutdown function (the lane's P-shutdown, re-targeted); main.ts unchanged"),
    after("      void daemon.close().then(resolve, (cause: unknown) => {\n", f"        void import({SITE});\n", 'X2-close-failure-in-http-host',
          file=SHUT, kind='residual', note="a load in http-host's close-failure branch; main.ts unchanged. No row reaches it: round 1's N5 follow-up"),
    after("import * as path from 'node:path';\n", "import '@syzygy/three-surface-poc-app/dossier-site';\n", 'P-transitive',
          file='packages/polaris-dossier/src/state-directory.ts', note='a module main.ts imports statically (polaris-dossier state-directory) imports the POC app; main.ts is unchanged'),
    # R1-R3 are rev-532's (R-GP-IMPL-TEST-CLOCKS-1, section 3.3): daemon-path loads between or after the two branches that the
    # old text pin failed and the first version of the kept text row passed, because it checked the whole window from the
    # first branch to the daemon line.
    {'id': 'R1-flag-between-branches', 'kind': 'defect', 'file': MAIN, 'old': POLARIS_COMMENT,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') {LOAD}\n\n" + POLARIS_COMMENT,
     'note': 'a dynamic import behind an environment flag, between the dossier and polaris branches; runs on the daemon path when the flag is set'},
    {'id': 'R2-flag-createRequire-before-daemon', 'kind': 'defect', 'file': MAIN, 'old': DAEMON,
     'new': f"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n" + DAEMON,
     'note': 'a require through createRequire (taken by process.getBuiltinModule, no import edge), behind a flag, just before the daemon path'},
    {'id': 'R3-runtime-hook', 'kind': 'defect', 'file': MAIN, 'old': DAEMON,
     'new': "  {\n" + HOOK_BODY + "  }\n" + DAEMON,
     'note': 'a load hook registered at runtime that short-circuits every POC-app URL, then an unconditional import of the POC app, just before the daemon path'},
    after(ANCHOR, "import type * as PocSite from '@syzygy/three-surface-poc-app/dossier-site';\n", 'E-type-only-import', kind='equivalent',
          note='a type-only import at module top: erased by tsc, so nothing loads'),
    after("  if (argv[0] === 'dossier') {\n", "    // renders through @syzygy/three-surface-poc-app/dossier-site\n", 'E-comment-in-branch', kind='equivalent',
          note='a comment naming the POC app inside the dossier branch'),
    {'id': 'E-renamed-binding', 'kind': 'equivalent', 'file': MAIN, 'note': "the polaris branch binds the renderer under another name",
     'old': POLARIS, 'new': POLARIS.replace('const { renderLocalDossier }', 'const { renderLocalDossier: render }').replace('renderer: renderLocalDossier', 'renderer: render')},
    # S1-S6, C1 and L1-L3 are rev-532b's (R-GP-IMPL-TEST-CLOCKS-2, section 3.1). S1-S6 are daemon-path loads whose text sits
    # between a branch opening and the first `  }` line after it, which the round-1 text row took for the branch's close.
    {'id': 'S1-else-if-flag-after-dossier', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_END,
     'new': DOSSIER_END[:-4] + f"  }} else if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
     'note': 'an `else if` on the dossier branch: on every non-dossier argv with the flag set, the POC app loads'},
    {'id': 'S2-same-line-if-after-dossier', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_END,
     'new': DOSSIER_END[:-4] + f"  }} if ({FLAG}) await import({SITE});\n",
     'note': 'the dossier close and a flag-gated import on one line'},
    {'id': 'S3-else-if-flag-after-polaris', 'kind': 'defect', 'file': MAIN, 'old': POLARIS_END,
     'new': POLARIS_END[:-4] + f"  }} else if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
     'note': 'an `else if` on the polaris branch, just before the daemon path'},
    {'id': 'S4-else-runtime-hook-after-dossier', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_END,
     'new': DOSSIER_END[:-4] + "  } else {\n" + HOOK_BODY + "  }\n",
     'note': "R3's runtime hook and import in an unconditional `else` on the dossier branch: every non-dossier argv loads the POC app, unseen by the test's hook"},
    {'id': 'S5-else-createRequire-flag-after-polaris', 'kind': 'defect', 'file': MAIN, 'old': POLARIS_END,
     'new': POLARIS_END[:-4] + f"  }} else if ({FLAG}) {{\n    process.getBuiltinModule('node:module').createRequire(import.meta.url)({SITE});\n  }}\n",
     'note': "R2's createRequire in an `else if` on the polaris branch"},
    {'id': 'S6-misindented-close-after-dossier', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_END,
     'new': DOSSIER_END[:-4] + f"    }} if ({FLAG}) {{\n    await import({SITE});\n  }}\n",
     'note': 'the dossier branch closed by a 4-space `}` on a line that opens a flag-gated block, closed by `  }`'},
    # The lane's: S1 with the specifier split, so main.ts never names the POC app and only the row's else check sees the load.
    {'id': 'S7-else-split-specifier-after-dossier', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_END,
     'new': DOSSIER_END[:-4] + f"  }} else if ({FLAG}) {{\n    await import('@syzygy/three-surface-poc' + '-app/dossier-site');\n  }}\n",
     'note': "S1's `else if` with the specifier split in two, so no text in main.ts names the POC app"},
    {'id': 'C1-comment-outside-branches', 'kind': 'equivalent', 'file': MAIN, 'old': "// One exception to all of the above:",
     'new': "// The dossier renderer is @syzygy/three-surface-poc-app/dossier-site.\n// One exception to all of the above:",
     'note': 'a comment naming the POC app in the header, outside both branches (a disclosed residual: the text row fails it)'},
    {'id': 'L1-else-if-chain', 'kind': 'equivalent', 'file': MAIN, 'old': POLARIS_HEAD,
     'new': ("  } else if (argv[0] === 'polaris') {\n"
             "    // `syzygy polaris <url>` is the one-command launched run (prototype under\n"
             "    // owner direction POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): it runs the\n"
             "    // `dossier` steps in process and starts the agent sessions in views.\n"),
     'note': "the two branches chained as `if … else if (argv[0] === 'polaris')`"},
    {'id': 'L2-nested-function-in-dossier', 'kind': 'equivalent', 'file': MAIN,
     'old': f"    const {{ renderLocalDossier }} = await import({SITE});\n    return runDossierCli(",
     'new': f"    const renderLocalDossier = await (async () => {{\n      const site = await import({SITE});\n      return site.renderLocalDossier;\n    }})();\n    return runDossierCli(",
     'note': 'the dossier import moved into a nested async function inside the branch'},
    {'id': 'L3-nested-try-in-polaris', 'kind': 'equivalent', 'file': MAIN, 'old': POLARIS,
     'new': ("    const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n    try {\n"
             f"      const {{ renderLocalDossier }} = await import({SITE});\n"
             "      return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n"
             "    } catch (cause: unknown) {\n      throw cause;\n    }\n"),
     'note': 'the polaris import inside a nested try block in the branch'},
    # Y1-Y5 are rev-532c's (R-GP-IMPL-TEST-CLOCKS-3, F1; the bytes of rev-532c/tools/r3_variants.py): a then-block that loads
    # the POC app and then reaches the daemon path in the same process. The compiler-API row and the load-hook row pass each;
    # the restored base pin fails each, since each adds a line naming the app.
    {'id': 'Y1-dossier-serve-falls-through', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_RETURN,
     'new': ("    if (argv[1] === 'serve') {\n"
             "      // `syzygy dossier serve …` serves the daemon below, with the renderer loaded for its routes.\n"
             f"      await import({SITE});\n"
             "      process.argv.splice(2, 2);\n"
             "    } else return runDossierCli(argv.slice(1), {\n"),
     'note': 'a missing `return`: `dossier serve` loads the app in the dossier then-block, drops its two words from process.argv and falls through to the daemon path'},
    {'id': 'Y2-dossier-serve-reenters-main', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_OPEN,
     'new': (DOSSIER_OPEN + "    if (argv[1] === 'serve') {\n"
             "      // `syzygy dossier serve …`: load the renderer, then serve the daemon with the rest of argv.\n"
             f"      await import({SITE});\n"
             "      process.argv.splice(2, 2);\n"
             "      return main();\n"
             "    }\n"),
     'note': 'the then-block returns, but through `return main()` after loading the app, so the daemon path runs in the same process'},
    {'id': 'Y3-flag-rewrites-argv-into-dossier', 'kind': 'defect', 'file': MAIN, 'old': ARGV + DOSSIER_OPEN,
     'new': (f"  const argv = {FLAG} ? ['dossier', '--preload'] : process.argv.slice(2);\n" + DOSSIER_OPEN +
             "    if (argv[1] === '--preload') {\n"
             "      // SYZYGY_PRELOAD_RENDERER=1 warms the renderer, then serves the daemon as asked.\n"
             f"      await import({SITE});\n"
             "      delete process.env.SYZYGY_PRELOAD_RENDERER;\n"
             "      return main();\n"
             "    }\n"),
     'note': "a rewritten argv: with the flag set, a plain daemon invocation enters the dossier then-block, loads the app and re-enters main() as the daemon"},
    {'id': 'Y4-polaris-labelled-break', 'kind': 'defect', 'file': MAIN, 'old': POLARIS + "  }\n",
     'new': ("    polaris: {\n"
             "      if (argv[1] === '--serve') {\n"
             "        // `syzygy polaris --serve …`: the daemon below, with the renderer loaded for its routes.\n"
             f"        await import({SITE});\n"
             "        process.argv.splice(2, 2);\n"
             "        break polaris;\n"
             "      }\n"
             "      const { runPolarisCli } = await import('@syzygy/polaris-dossier');\n"
             f"      const {{ renderLocalDossier }} = await import({SITE});\n"
             "      return runPolarisCli(argv.slice(1), { renderer: renderLocalDossier });\n"
             "    }\n"
             "  }\n"),
     'note': 'a nested labelled block in the polaris then-block: `break` leaves the branch after loading the app, and control falls through to the daemon path'},
    {'id': 'Y5-dossier-serve-callback-after-branch', 'kind': 'defect', 'file': MAIN, 'old': DOSSIER_RETURN,
     'new': ("    if (argv[1] === 'serve') {\n"
             "      // `syzygy dossier serve …` serves the daemon below; the renderer loads once it is up.\n"
             f"      setImmediate(() => void import({SITE}));\n"
             "      process.argv.splice(2, 2);\n"
             "    } else return runDossierCli(argv.slice(1), {\n"),
     'note': 'a callback scheduled in the dossier then-block that runs after the branch, while the daemon starts'},
    {'id': 'H-hook-blind', 'kind': 'hook', 'file': TEST, 'note': "the hook's POC-app prefix points at a directory nothing loads from",
     'old': "    const app = `${pathToFileURL(realpathSync(path.join(REPO_ROOT, 'apps', 'three-surface-poc'))).href}/`;\n",
     'new': "    const app = `${pathToFileURL(realpathSync(path.join(REPO_ROOT, 'apps', 'three-surface-poc'))).href}/no-such-dir/`;\n"},
    {'id': 'H-no-preload', 'kind': 'hook', 'file': TEST, 'note': 'NODE_OPTIONS carries no --import, so no hook runs',
     'old': "    const hooked = { NODE_OPTIONS: `--import=${pathToFileURL(hook).href}`, POC_APP_URL: app, POC_LOAD_LOG: log };\n",
     'new': "    const hooked = { NODE_OPTIONS: '', POC_APP_URL: app, POC_LOAD_LOG: log };\n"},
]
def branch_swap():
    """The polaris branch moved above the dossier branch, its fragments cut from main.ts as it stands."""
    text = open(os.path.join(tree, MAIN), encoding='utf8').read()
    i, j, k = text.index("  if (argv[0] === 'dossier') {\n"), text.index("  // `syzygy polaris <url>`"), text.index(DAEMON)
    return {'id': 'E-branch-swap', 'kind': 'equivalent', 'file': MAIN, 'note': 'the polaris branch moved above the dossier branch',
            'old': text[i:k], 'new': text[j:k] + text[i:j]}
MUTANTS.insert(-2, branch_swap())
# Exact reviewed G/Y definitions are copied without changes; any retargeted source fragments are recorded per case.
import importlib.util
from pathlib import Path
variants_path = Path(__file__).with_name('r3_variants.py')
spec = importlib.util.spec_from_file_location('reviewed_variants', variants_path)
reviewed = importlib.util.module_from_spec(spec); spec.loader.exec_module(reviewed)
current_main = Path(tree, MAIN).read_text()
existing = {m['id'] for m in MUTANTS if m}
for mid, variant in reviewed.VARIANTS.items():
    if mid in existing or not (mid.startswith('G') or mid.startswith('Y1b')): continue
    edits = reviewed.edits_of(current_main, variant['edits'])
    MUTANTS.append({'id': mid, 'kind': 'equivalent' if mid.startswith('G') else 'defect', 'file': MAIN,
                    'note': variant['note'], 'edits': edits, 'reviewedDefinitionsSha256': hashlib.sha256(variants_path.read_bytes()).hexdigest()})
# Original computed-island witness, now covered by the unchanged finite static loader guard.
MUTANTS.append({'id':'R7-island-computed-flag','kind':'static-defect','file':MAIN,'old':DAEMON,
 'new':"  if (process.env.SYZYGY_PRELOAD_RENDERER === '1') process.getBuiltinModule('node:module').createRequire(import.meta.url)(['@syzygy', 'polaris-generation-core'].join('/'));\n"+DAEMON,
 'note':'Original R1 N5 witness: unchanged island guard must refuse the computed createRequire loader.'})
# A real lazy transitive load on the authenticated machine request; no entry-point app mention is introduced.
MUTANTS.append({'id':'P-machine-transitive','kind':'defect','file':'packages/cap1-daemon/src/routes-machine.ts',
 'old':'      async handle() {\n',
 'new':"      async handle() {\n        await import('@syzygy/three-surface-poc-app/dossier-site');\n",
 'note':'Transitive lazy authenticated machine-request load; the hook must see it without relying on main.ts text.'})
# The close-failure arm is unexercised by normal shutdown: the static import guard is its intended predicate.
for mutant in MUTANTS:
    if mutant and mutant['id'] == 'X2-close-failure-in-http-host': mutant['kind'] = 'defect'

# Isolated property witnesses make diagnostics and the branch proof non-vacuous.
for mid,old,new in [
 ('D-wrong-operator',DOSSIER_OPEN,DOSSIER_OPEN.replace('===','==')),
 ('D-wrong-index',DOSSIER_OPEN,DOSSIER_OPEN.replace('argv[0]','argv[1]')),
 ('D-wrong-name',DOSSIER_OPEN,DOSSIER_OPEN.replace("'dossier'","'Dossier'")),
 ('D-duplicate-branch',DOSSIER_OPEN,"  if (argv[0] === 'dossier') return 2;\n"+DOSSIER_OPEN),
 ('D-missing-branch',DOSSIER_OPEN,DOSSIER_OPEN.replace("'dossier'","'other'")),
 ('D-unexpected-else',DOSSIER_END,DOSSIER_END[:-4]+"  } else { throw new Error('unexpected'); }\n"),
 ('D-fallthrough-without-argv-write',DOSSIER_RETURN,DOSSIER_RETURN.replace('return ','')),
 ('E-multiline-type-only-import',ANCHOR,ANCHOR+"import type {\n  renderLocalDossier,\n} from '@syzygy/three-surface-poc-app/dossier-site';\n"),
]:
    MUTANTS.append({'id':mid,'kind':'equivalent' if mid.startswith('E-') else 'defect','file':MAIN,'old':old,'new':new,
                    'note':'Isolated compiler-row property witness; a source/build exception is not a kill.'})
MUTANTS.extend([
 {'id':'D-after-daemon','kind':'defect','file':MAIN,'edits':[[DAEMON,''],[ARGV,ARGV+DAEMON]],
  'note':'The daemon parse moves before both CLI branches; the placement assertion must name the branch.'},
 {'id':'D-mutable-argv-binding','kind':'defect','file':MAIN,'old':ARGV,'new':ARGV.replace('const argv','let argv'),
  'note':'An isolated const-origin predicate witness without a process.argv mutation.'},
])
git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout
sha = lambda path: hashlib.sha256(Path(path).read_bytes()).hexdigest()
subject = git('rev-parse', 'HEAD').strip()
original_inputs = {file: sha(Path(tree,file)) for file in [MAIN,TEST,'packages/polaris-dossier/src/state-directory.ts',SHUT]}
if git('status', '--porcelain').strip(): sys.exit('campaign subject is dirty')
out = Path(out_path); out.parent.mkdir(parents=True,exist_ok=True)
raw = out.with_suffix(''); raw.mkdir(exist_ok=False)
# Retain reports and full streams per row; no old wrapper or historical log is executed/appended.
def build(tag):
    done = subprocess.run(['npx','--no-install','tsc','-b','apps/syzygy'],cwd=tree,capture_output=True,text=True)
    (raw/(tag+'-build.log')).write_text(done.stdout+done.stderr)
    return done.returncode

def run(mutant):
    mid = mutant['id'] if mutant else 'control'
    files = {MAIN,TEST} | ({mutant['file']} if mutant else set())
    saved = {file:Path(tree,file).read_bytes() for file in files}
    selected = git('show',f'{test_source}:{TEST}').encode() if test_source else saved[TEST]
    result = {'mutant':mutant,'subject':subject,'selectedTestSha256':hashlib.sha256(selected).hexdigest(),'passed':0,'failed':[],'rows':[],'staticRows':[]}
    try:
        Path(tree,TEST).write_bytes(selected)
        if mutant:
            target = Path(tree,mutant['file']).read_text()
            edits = mutant.get('edits',[[mutant.get('old',''),mutant.get('new','')]])
            # The no-preload case has one exact predecessor spelling and one exact repaired spelling.
            if mid == 'H-no-preload' and edits[0][0] not in target:
                old = "    const hooked = { NODE_OPTIONS: `--import=${pathToFileURL(hook).href}`, POC_APP_URL: app, ISLAND_URLS: JSON.stringify(core), POC_LOAD_LOG: log };\n"
                edits = [[old,old.replace('`--import=${pathToFileURL(hook).href}`',"''")]]
            result['appliedEdits'] = []
            for old,new in edits:
                if target.count(old)!=1:
                    result.update(skipped=f'old occurs {target.count(old)} times in {mutant["file"]}',exit=None);return result
                result['appliedEdits'].append({'file':mutant['file'],'old':old,'new':new});target=target.replace(old,new)
            Path(tree,mutant['file']).write_text(target)
        result['buildExit'] = build(mid)
        if result['buildExit']:
            result.update(exit=None,buildFailure=True);return result
        report = raw/(mid+'.json'); began=time.monotonic()
        command=['npx','--no-install','vitest','run','--config','packages/cap1-system/vitest.config.ts',TEST,'--reporter=json',f'--outputFile={report}']
        done=subprocess.run(command,cwd=tree,capture_output=True,text=True,timeout=LIMIT_S,env={k:v for k,v in os.environ.items() if not k.startswith('VITEST')})
        (raw/(mid+'.log')).write_text(done.stdout+done.stderr)
        rows=[]
        if report.exists():
            for suite in json.loads(report.read_text())['testResults']:
                rows.extend({'title':a['fullName'],'status':a['status'],'failureMessages':a.get('failureMessages',[])} for a in suite['assertionResults'])
        result.update(exit=done.returncode,seconds=round(time.monotonic()-began,3),rows=rows,
          failed=sorted(r['title'] for r in rows if r['status']=='failed'),passed=sum(r['status']=='passed' for r in rows),
          raw={'path':str(report),'sha256':sha(report) if report.exists() else None})
        if mutant and (mutant['kind']=='static-defect' or mid in ['P-transitive','X1-close-failed-callback-in-main','X3-shutdown-in-http-host']):
            static=raw/(mid+'-static.json')
            done=subprocess.run(['npx','--no-install','vitest','run','--project','unit','packages/polaris-generation-core/src/island-boundary.test.ts','--reporter=json',f'--outputFile={static}'],cwd=tree,capture_output=True,text=True,timeout=LIMIT_S)
            (raw/(mid+'-static.log')).write_text(done.stdout+done.stderr)
            result['staticExit']=done.returncode
            if static.exists():
                for suite in json.loads(static.read_text())['testResults']:
                    result['staticRows'].extend({'title':a['fullName'],'status':a['status'],'failureMessages':a.get('failureMessages',[])} for a in suite['assertionResults'])
        return result
    except subprocess.TimeoutExpired as failure:
        result.update(timeout=True,exit=None,exception=str(failure));return result
    finally:
        for file,content in saved.items():Path(tree,file).write_bytes(content)

results=[]
for mutant in MUTANTS:
    result=run(mutant);results.append(result)
    out.write_text(json.dumps({'tool':{'name':Path(__file__).name,'sha256':sha(__file__)},'commit':subject,'testFileFrom':test_source or 'the tree','commonInputs':original_inputs,'results':results},indent=1)+'\n')
    print(json.dumps({'mutant':mutant['id'] if mutant else 'control','exit':result.get('exit'),'passed':result['passed'],'failed':result['failed'],'skipped':result.get('skipped'),'buildFailure':result.get('buildFailure')}),flush=True)
if build('restored'):sys.exit('restoration build failed')
if git('status','--porcelain').strip():sys.exit('campaign tree not restored')
