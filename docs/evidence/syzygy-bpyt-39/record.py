"""syzygy-bpyt.39: derive summary.json from the records beside it, checking each against the git objects of the tree given.

The subject is HEAD over BASE (main at 81862261), both fixed commits, so a later merge into the tree changes nothing here: the
PR 541 round-3 review's notes N1, N3, N4 and N5's root-manifest exception, from
docs/reviews/R-GP-IMPL-GUARD-PINS-FOLLOWUP-2-3-RAW.md. Inputs (all in this directory):
  root-exception-probe.json   root_exception_probe.py: what npm 11.5.1 installs, offline, for the five LOCAL_VERSION forms declared
                              under a workspace's name in the root's manifest (R1-R5), in app's (A1-A5), and under a name no
                              workspace has in the root's (N1-N5);
  npmrc-trace-*.json          npmrc_trace.py: which npmrc files a probe opens, run from a directory holding a `.npmrc`: the lane's
                              npm_alias_probe.py at BASE and at HEAD, and root_exception_probe.py;
  comment-only.json           docs/evidence/syzygy-bpyt-8-39/comment_only.cjs over the testkit, BASE to HEAD, with its selftest;
  record-predicate-mutants.json  record_predicate_mutants.py: 8.39's record.py with each REPAIR1-to-HEAD predicate dropped in turn.
Usage: python3 -I record.py <tree> [--check | --selftest]
  --check: exit 1 unless summary.json equals what the inputs give and no check fails.
  --selftest: mutate one input at a time in memory (rule 6) and exit 1 unless every mutation makes a check fail.
"""
import copy, hashlib, json, subprocess, sys
from pathlib import Path

TREE = Path(sys.argv[1]).resolve()
HERE_REL = 'docs/evidence/syzygy-bpyt-39'
HERE = TREE / HERE_REL
BASE = '81862261ddbc2b3c8e8481851f3c27129217d477'
HEAD = 'fafe3669a5901c28a1058dc1c12790b788a66649'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
PROBE = 'docs/evidence/syzygy-bpyt-8-39/npm_alias_probe.py'
SUBJECT = sorted([KIT, PROBE, 'docs/evidence/syzygy-bpyt-8-39/record.py', 'docs/evidence/syzygy-bpyt-8-39/summary.json'])
FORMS = ['file:./nowhere', './nowhere', 'nowhere.tgz', 'link:../nowhere', 'workspace:*']
# What each case must show: a link to the workspace (`w`), a link to the directory the spec names, or npm's refusal by code.
EXPECTED = {**{f'R{i}': ('link', 'w') for i in range(1, 6)},
            'A1': ('link', 'app/nowhere'), 'A2': ('link', 'app/nowhere'), 'A3': ('refused', 'ENOENT'),
            'A4': ('refused', 'EUNSUPPORTEDPROTOCOL'), 'A5': ('refused', 'EUNSUPPORTEDPROTOCOL'),
            'N1': ('link', 'nowhere'), 'N2': ('link', 'nowhere'), 'N3': ('refused', 'ENOENT'),
            'N4': ('refused', 'EUNSUPPORTEDPROTOCOL'), 'N5': ('refused', 'EUNSUPPORTEDPROTOCOL')}
BUILTIN = '/lib/node_modules/npm/npmrc'
TEXT = {  # what HEAD's testkit says, each once (N4 and N5), and what it no longer says
    'present': ["as a directory or a file, except in the root's manifest under a workspace's own name, where npm links that workspace;",
                "the root's manifest under a workspace's own name, as above, and another package manager might link them (not observed here);",
                "package's name, which another package manager might link locally (not observed here); every alias is refused, failing closed."],
    'absent': ['which other package managers can link locally', 'and other package managers link them locally'],
}
PREDICATES = {'S5-path-test-dropped': ['a non-evidence path changed since the suite ran'],
              'S4-prefix-test-dropped': ['a non-comment line inside the span since the suite ran'],
              'S6-span-test-dropped': ['a comment line changed since the suite ran on the LOCAL_VERSION line']}
MUTATE = {}


def git(*args):
    return subprocess.run(['git', '-C', str(TREE), *args], capture_output=True, text=True, check=True).stdout


def sha(data):
    return hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()


def load(name):
    obj = json.loads((HERE / name).read_text())
    return MUTATE[name](copy.deepcopy(obj)) if name in MUTATE else obj


def hooked(key, value):
    return MUTATE[f'@{key}'](value) if f'@{key}' in MUTATE else value


def observed(r):
    """A probe case as ('link', where node_modules/<name> points, from the root) or ('refused', npm's error code)."""
    if r['lockExit'] != 0:
        return ('refused', r['errorCode'])
    entries = r.get('lockEntries') or {}
    if r.get('installExit') != 0 or not entries or not all(e.get('link') for e in entries.values()):
        return ('other', None)
    inner = [e['resolved'] for k, e in entries.items() if k != f"node_modules/{r['inspect']}"]
    return ('link', inner[0] if inner else entries[f"node_modules/{r['inspect']}"]['resolved'])


def summary():
    problems = []
    probe = load('root-exception-probe.json')
    if (probe['npm'], probe['npa'], probe['registry'], probe['offline']) != ('11.5.1', '12.0.2', 'http://127.0.0.1:9/', True):
        problems.append('root-exception-probe: not npm 11.5.1 and npa 12.0.2, offline against the unreachable registry')
    cases = {r['id']: r for r in probe['results']}
    if sorted(cases) != sorted(EXPECTED) or len(cases) != len(probe['results']):
        problems.append(f'root-exception-probe: the cases are not the {len(EXPECTED)} named here, each once')
    for cid, want in EXPECTED.items():
        r = cases.get(cid)
        if r is None:
            continue
        spec = next(iter(next(iter(r['declarations'].values()))['dependencies'].values()))
        where = next(iter(r['declarations']))
        if spec != FORMS[int(cid[1:]) - 1] or where != ('app' if cid[0] == 'A' else ''):
            problems.append(f'root-exception-probe {cid}: declares {spec} in {where or "the root"}, not the form named')
        if observed(r) != want:
            problems.append(f'root-exception-probe {cid}: {observed(r)}, not {want}')
        if cid[0] == 'R' and r.get('loads', {}).get('app', {}).get('path') != 'w/package.json':
            problems.append(f'root-exception-probe {cid}: app does not load the workspace')
    traces = {}
    for name, sha_of in (('lane-probe-before', git('show', f'{BASE}:{PROBE}')), ('lane-probe-after', git('show', f'{HEAD}:{PROBE}')),
                         ('root-exception-probe', (HERE / 'root_exception_probe.py').read_text())):
        t = load(f'npmrc-trace-{name}.json')
        outside = [r for r in t['npmrcOutsideScratch'] if not r['path'].endswith(BUILTIN)]
        builtin = [r for r in t['npmrcOutsideScratch'] if r['path'].endswith(BUILTIN)]
        if t['exit'] != 0 or t['probeSha256'] != sha(sha_of) or not builtin or any(r['result'] != 'ENOENT' for r in builtin):
            problems.append(f'npmrc-trace {name}: a failed run, another probe, or npm builtin npmrc not seen absent')
        if name == 'lane-probe-before':
            if outside != t['callerNpmrcOpened'] or [r['result'] for r in outside] != ['ok']:
                problems.append("npmrc-trace lane-probe-before: the old probe did not read the caller's .npmrc, or read another")
        elif outside:
            problems.append(f'npmrc-trace {name}: opens an npmrc outside the scratch directory: {outside}')
        if name.startswith('lane') and t['recordEqualsReference'] is not True:
            problems.append(f'npmrc-trace {name}: the record differs from the committed npm-alias-probe.json')
        if name.startswith('lane') and t['reference'] != 'docs/evidence/syzygy-bpyt-8-39/npm-alias-probe.json':
            problems.append(f'npmrc-trace {name}: compared with another record')
        if name == 'root-exception-probe' and t['recordSha256'] != sha((HERE / 'root-exception-probe.json').read_bytes()):
            problems.append('npmrc-trace root-exception-probe: the traced run did not write the committed root-exception-probe.json')
        traces[name] = {'callerNpmrc': [r['result'] for r in t['callerNpmrcOpened']], 'builtinOpens': sum(r['count'] for r in builtin),
                        'otherOutside': len(outside) - len(t['callerNpmrcOpened'])}
    only = load('comment-only.json')
    if (only['base'], only['head'], only['file']) != (BASE, HEAD, KIT) or only['baseSha256'] != sha(git('show', f'{BASE}:{KIT}')) \
            or only['headSha256'] != sha(git('show', f'{HEAD}:{KIT}')) or not (only['emitEqual'] and only['printEqual'] and only['bytesDiffer']):
        problems.append('comment-only: not BASE to HEAD of the testkit, or not comment-only')
    st = only.get('selftest', {})
    if st != {'identifierRenamed': {'emitEqual': False, 'printEqual': False}, 'literalChanged': {'emitEqual': False, 'printEqual': False},
              'commentAdded': {'emitEqual': True, 'printEqual': True}}:
        problems.append('comment-only: the selftest does not separate a code change from a comment change')
    kit = hooked('kit', git('show', f'{HEAD}:{KIT}'))
    lines = kit.splitlines()
    if [i + 1 for i, line in enumerate(lines) if line.startswith('const LOCAL_VERSION = ')] != [79]:
        problems.append('testkit: LOCAL_VERSION is not at line 79')
    if any(kit.count(t) != 1 for t in TEXT['present']) or any(t in kit for t in TEXT['absent']):
        problems.append('testkit: a hedge or a root exception is missing, or a retired sentence remains')
    mutants = load('record-predicate-mutants.json')
    rows = {r['id']: r for r in mutants['rows']}
    if mutants['record'] != 'docs/evidence/syzygy-bpyt-8-39/record.py' or mutants['recordSha256'] != sha(git('show', f'{HEAD}:docs/evidence/syzygy-bpyt-8-39/record.py')):
        problems.append('record-predicate-mutants: not HEAD\'s 8.39 record.py')
    if rows.get('S0-unmutated', {}).get('survived') != [] or rows.get('S0-unmutated', {}).get('exit') != 0:
        problems.append('record-predicate-mutants: the unmutated selftest does not pass')
    for mid, want in PREDICATES.items():
        r = rows.get(mid, {})
        if r.get('survived') != want or r.get('exit') == 0 or r.get('old') is None or r.get('old') == r.get('new'):
            problems.append(f'record-predicate-mutants {mid}: survived {r.get("survived")}, not {want}')
    changed = hooked('names', sorted(p for p in git('diff', '--name-only', BASE, HEAD).split()))
    if changed != SUBJECT:
        problems.append(f'subject: {changed}')
    return {
        'bead': 'syzygy-bpyt.39', 'base': BASE, 'head': HEAD, 'subject': SUBJECT,
        'subjectSha256': {p: sha(subprocess.run(['git', '-C', str(TREE), 'show', f'{HEAD}:{p}'], capture_output=True, check=True).stdout) for p in SUBJECT},
        'rootException': {cid: list(observed(cases[cid])) for cid in sorted(cases)},
        'npmrcTraces': traces, 'commentOnly': {k: only[k] for k in ('emitEqual', 'printEqual', 'typescript')},
        'predicateMutants': {mid: rows.get(mid, {}).get('survived') for mid in ['S0-unmutated', *PREDICATES]},
        'tools': {name: sha((HERE / name).read_text()) for name in ['root_exception_probe.py', 'npmrc_trace.py', 'record_predicate_mutants.py', 'record.py']},
        'problems': problems,
    }


SELFTEST = {
    'a root case that npm reads as a directory': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R1')['lockEntries'].update(
        {'node_modules/wlib': {'resolved': 'nowhere', 'link': True}}), d)[1]},
    'a root link: case npm refuses': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R4').update(lockExit=1, errorCode='EUNSUPPORTEDPROTOCOL'), d)[1]},
    'an app workspace: case npm installs': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'A5').update(
        lockExit=0, errorCode=None, lockEntries={'node_modules/wlib': {'resolved': 'w', 'link': True}}, installExit=0), d)[1]},
    'a case declared in another manifest': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R2').update(
        declarations={'app': {'dependencies': {'wlib': './nowhere'}}}), d)[1]},
    'a probe missing a case': {'root-exception-probe.json': lambda d: (d.update(results=d['results'][:-1]), d)[1]},
    'a probe against a reachable registry': {'root-exception-probe.json': lambda d: (d.update(registry='https://registry.npmjs.org/'), d)[1]},
    "a fixed probe that still reads the caller's npmrc": {'npmrc-trace-lane-probe-after.json': lambda d: (d['npmrcOutsideScratch'].append(
        {'path': '/tmp/caller/.npmrc', 'call': 'openat', 'result': 'ok', 'count': 1}), d)[1]},
    "an old probe that never read the caller's npmrc": {'npmrc-trace-lane-probe-before.json': lambda d: (d.update(callerNpmrcOpened=[],
        npmrcOutsideScratch=[r for r in d['npmrcOutsideScratch'] if r['path'].endswith(BUILTIN)]), d)[1]},
    'a fixed probe whose record changed': {'npmrc-trace-lane-probe-after.json': lambda d: (d.update(recordEqualsReference=False), d)[1]},
    'a trace of another probe': {'npmrc-trace-lane-probe-after.json': lambda d: (d.update(probeSha256='0' * 64), d)[1]},
    'a new probe that reads a home npmrc': {'npmrc-trace-root-exception-probe.json': lambda d: (d['npmrcOutsideScratch'].append(
        {'path': '/home/x/.npmrc', 'call': 'openat', 'result': 'ENOENT', 'count': 1}), d)[1]},
    'a testkit change that is not comment-only': {'comment-only.json': lambda d: (d.update(emitEqual=False), d)[1]},
    'a comment-only check of another blob': {'comment-only.json': lambda d: (d.update(headSha256='0' * 64), d)[1]},
    'a testkit that keeps the unhedged sentence': {'@kit': lambda kit: kit + '// which other package managers can link locally\n'},
    'a testkit without the root exception': {'@kit': lambda kit: kit.replace(', where npm links that workspace;', ';', 1)},
    'a testkit whose LOCAL_VERSION moved': {'@kit': lambda kit: '\n' + kit},
    'a predicate dropped and still unseen': {'record-predicate-mutants.json': lambda d: (next(r for r in d['rows'] if r['id'] == 'S5-path-test-dropped').update(survived=[]), d)[1]},
    'a predicate mutant of another record.py': {'record-predicate-mutants.json': lambda d: (d.update(recordSha256='0' * 64), d)[1]},
    'a product file in the subject': {'@names': lambda names: sorted([*names, 'packages/support/src/index.ts'])},
    'a root case app does not load from the workspace': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R3')['loads']['app'].update(path='nowhere/package.json'), d)[1]},
    'a lane trace compared with another record': {'npmrc-trace-lane-probe-before.json': lambda d: (d.update(reference='docs/evidence/syzygy-bpyt-39/root-exception-probe.json'), d)[1]},
    'a comment-only selftest that misses a rename': {'comment-only.json': lambda d: (d['selftest']['identifierRenamed'].update(printEqual=True), d)[1]},
    'an unmutated predicate run that fails': {'record-predicate-mutants.json': lambda d: (next(r for r in d['rows'] if r['id'] == 'S0-unmutated').update(survived=['x'], exit=1), d)[1]},
    'a root case npm installs as a copy': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R5')['lockEntries']['node_modules/wlib'].update(link=False), d)[1]},
    'a root case whose install fails': {'root-exception-probe.json': lambda d: (next(r for r in d['results'] if r['id'] == 'R2').update(installExit=1), d)[1]},
    'a testkit that states a root exception twice': {'@kit': lambda kit: kit + "// as a directory or a file, except in the root's manifest under a workspace's own name, where npm links that workspace;\n"},
    'a root-exception trace of another run': {'npmrc-trace-root-exception-probe.json': lambda d: (d.update(recordSha256='0' * 64), d)[1]},
}


def main():
    if '--selftest' in sys.argv[2:]:
        if summary()['problems']:
            print('selftest: the unmutated inputs already fail', summary()['problems'])
            sys.exit(1)
        survived = []
        for label, mutation in SELFTEST.items():
            MUTATE.clear()
            MUTATE.update(mutation)
            problems = summary()['problems']
            print('killed' if problems else 'SURVIVED', '|', label, '|', problems[:1])
            if not problems:
                survived.append(label)
        MUTATE.clear()
        print(f'selftest: {len(SELFTEST) - len(survived)}/{len(SELFTEST)} mutations make a check fail')
        sys.exit(1 if survived else 0)
    text = json.dumps(summary(), indent=1) + '\n'
    if '--check' in sys.argv[2:]:
        same = (HERE / 'summary.json').read_text() == text
        problems = json.loads(text)['problems']
        print('summary.json', 'matches' if same else 'DIFFERS', '; problems:', len(problems), problems[:3])
        sys.exit(0 if same and not problems else 1)
    (HERE / 'summary.json').write_text(text)
    print('wrote summary.json; problems:', json.loads(text)['problems'])


main()
