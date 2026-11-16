"""syzygy-bpyt.8.2: assemble path-intent.json, the record of the resolvePathIntent census, the differential of its callers, the
negative control and the rule-6 mutants of the one copy and of the subpath guard, from the runs named below. It also retains the
base answers compactly (path-intent-base.jsonl) and the AC1 argv-loop sweep at base and at head (argv-loop-sweep.json).
Usage: assemble_path_intent.py <base-tree> <head-tree> <scratch> <out-dir>
  <scratch> holds census.json, census.rows.jsonl, neg.json, lift-*/lifted.json (path_intent_census.mjs, extract_path_intent.py),
  mutants/results.jsonl (mutate.py over mutants/P*.json and mutants/G*.json), commit.txt and status-*.txt, sweep-base.json and
  sweep-head.json (argv_loop_sweep.py), superseded/census.json and superseded-dup/census.json.
"""
import hashlib, json, os, re, subprocess, sys

base_tree, head_tree, scratch, out = sys.argv[1:5]
here = os.path.dirname(os.path.abspath(__file__))


def sha_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def sha_text(text):
    return hashlib.sha256(text.encode()).hexdigest()


def load(name):
    return json.load(open(os.path.join(scratch, name)))


def git(tree, *args):
    return subprocess.run(['git', '-C', tree, *args], capture_output=True, text=True, check=True).stdout.strip()


commit = open(os.path.join(scratch, 'commit.txt')).read().strip()
assert git(head_tree, 'rev-parse', 'HEAD') == commit, 'the head tree moved after the runs'
before = open(os.path.join(scratch, 'status-before.txt')).read()
after = open(os.path.join(scratch, 'status-after.txt')).read()
assert before == '' and after == '', (before, after)
base_commit = git(base_tree, 'rev-parse', 'HEAD')

census = load('census.json')
neg = load('neg.json')
superseded = load('superseded/census.json')
duplicated = {'run': load('superseded-dup/census.json')}
lifted = {side: load(f'lift-{side}/lifted.json') for side in ('base', 'head', 'neg')}
assert census['rows']['sha256'] == sha_file(os.path.join(scratch, 'census.rows.jsonl'))

# The `dangling` flag only the daemon's copy returned: read by no caller at base.
base_main = open(os.path.join(base_tree, 'apps/syzygy/src/main.ts')).read()
dangling_reads = len(re.findall(r'\.dangling\b', base_main))
assert dangling_reads == 0

# Compact base answers: the census rows whole, each caller and entry row as its arguments and the base answer's digest and head.
rows = [json.loads(line) for line in open(os.path.join(scratch, 'census.rows.jsonl'))]


def unique(values):
    return list(dict.fromkeys(values))


inputs = [row['input'] for row in rows if row['kind'] == 'resolve']
roots = unique(row['args'][0] for row in rows if row['kind'] == 'governedPlaneViolation')
clones = unique(row['args'][1] for row in rows if row['kind'] == 'stateRootViolation')
assert len(inputs) == census['inputs'] and len(roots) == census['roots'] and len(clones) == census['clones']
INDEX = {'governedPlaneViolation': (roots, inputs), 'stateRootViolation': (inputs, clones), 'sessionsRootViolation': (inputs, clones)}
compact = [{'inputs': inputs, 'roots': roots, 'clones': clones}]
for row in rows:
    if row['kind'] == 'resolve':
        compact.append({'k': 'resolve', 'i': inputs.index(row['input']), 'daemon': row['daemon'], 'state': row['state']})
        continue
    assert json.dumps(row['base'], sort_keys=True) == json.dumps(row['head'], sort_keys=True), row
    digest = sha_text(json.dumps(row['base'], sort_keys=True))
    if row['kind'] in INDEX:
        xs, ys = INDEX[row['kind']]
        compact.append({'k': row['kind'], 'a': [xs.index(row['args'][0]), ys.index(row['args'][1])],
                        'refused': row['base'].get('value') is not None, 's': digest})
    elif row['kind'] == 'entry-daemon':
        compact.append({'k': row['kind'], 'a': [roots.index(row['args'][1]), inputs.index(row['args'][3])], 'exit': row['base']['exit'], 's': digest})
    else:
        compact.append({'k': row['kind'], 'a': [inputs.index(row['args'][-1]), clones.index(row['args'][2])], 'exit': row['base']['exit'], 's': digest})
compact_text = ''.join(json.dumps(row) + '\n' for row in compact)
open(os.path.join(out, 'path-intent-base.jsonl'), 'w').write(compact_text)

# Mutants: each spec's fragments and command, its result, and which describe block's tests failed.
results = {}
for line in open(os.path.join(scratch, 'mutants/results.jsonl')):
    if line.startswith('exit='):
        continue
    result = json.loads(line)
    results[result['id']] = result
NEW_BLOCKS = ('symbolic-link intent, the one copy', 'the subpaths the daemon entry imports')
EQUIVALENT = {
    'P7-empty-component-kept': 'equivalent: every candidate comes from path.resolve, which leaves no empty component except the '
    'one of "/" itself; kept, that component joins to "/", whose lstat is a directory and not a link, so the answer is the same. '
    'The test of "/" runs the one input where the filter acts.',
}
mutants = []
for prefix in ('P', 'G'):
    for name in sorted(os.listdir(os.path.join(here, 'mutants'))):
        if not re.match(rf'{prefix}\d', name):
            continue
        spec = json.load(open(os.path.join(here, 'mutants', name)))
        result = results[spec['id']]
        failed = [line for line in result['failed'] if line.startswith('×')]
        control = spec['edits'] == []
        killed = result['exit'] != 0
        entry = {'spec': f'mutants/{name}', 'id': spec['id'], 'edits': spec['edits'], 'command': spec['command'],
                 'exit': result['exit'], 'failedTests': len(failed),
                 'failedInNewTests': sum(1 for line in failed if any(block in line for block in NEW_BLOCKS)),
                 'failedInEarlierTests': sum(1 for line in failed if not any(block in line for block in NEW_BLOCKS)),
                 'failed': failed, 'firstErrors': result['firstErrors']}
        if control:
            entry['outcome'] = 'control: passes unmutated' if not killed else 'control FAILED'
            assert not killed, spec['id']
        else:
            entry['outcome'] = 'killed' if killed else 'survived'
            if not killed:
                entry['disposition'] = EQUIVALENT[spec['id']]
        mutants.append(entry)

sweep = {side: load(f'sweep-{side}.json') for side in ('base', 'head')}
json.dump({'schema': 'argv-loop-sweep/1', 'bead': 'syzygy-bpyt.8.2',
           'text': 'Evidence record, not authority: the AC1 sweep for a hand-rolled argv loop at base and at head, every hit listed. '
           'Generated by assemble_path_intent.py from argv_loop_sweep.py; do not edit.',
           'base': base_commit, 'head': commit, 'script': 'argv_loop_sweep.py', 'scriptSha256': sha_file(os.path.join(here, 'argv_loop_sweep.py')),
           'excluded': {'file': 'apps/three-surface-poc/src/polaris-generation/dossier-main.ts',
                        'why': 'the POC app\'s `poc:dossier` entry, outside the `syzygy` entry this bead changes; reading argv '
                        'through @syzygy/polaris-dossier/argv would add an edge from the island to polaris-dossier, against the GP-Q8 '
                        'decoupling (coordinator ruling for syzygy-bpyt.8.2)'},
           'atBase': {k: sweep['base'][k] for k in ('roots', 'patterns', 'files', 'hits')},
           'atHead': {k: sweep['head'][k] for k in ('roots', 'patterns', 'files', 'hits')}},
          open(os.path.join(out, 'argv-loop-sweep.json'), 'w'), indent=1)

SUBJECT = ['apps/syzygy/src/main.ts', 'packages/polaris-dossier/package.json', 'packages/polaris-dossier/src/state-directory.ts',
           'packages/polaris-dossier/src/inventory.ts', 'packages/polaris-dossier/src/argv.ts',
           'packages/polaris-dossier/src/state-directory.test.ts', 'packages/polaris-dossier/src/subpath-imports.test.ts',
           'packages/polaris-dossier/src/fs-patch.testkit.ts', 'packages/polaris-dossier/src/cli.test.ts']
record = {
    'schema': 'path-intent-unification/1',
    'bead': 'syzygy-bpyt.8.2',
    'text': 'Evidence record, not authority: the census of the two resolvePathIntent copies at base, the old-versus-new '
    'differential of each caller over one path corpus, its negative control, and a rule-6 mutant per predicate of the one copy '
    'and of the subpath guard. Generated by assemble_path_intent.py from the runs it names; do not edit.',
    'subject': {
        'base': base_commit, 'runsAt': commit, 'cleanDuringRuns': True,
        'filesAtRunsAt': {path: sha_file(os.path.join(head_tree, path)) for path in SUBJECT},
        'filesAtBase': {path: sha_file(os.path.join(base_tree, path)) for path in SUBJECT[:4]},
        'lifted': lifted,
    },
    'node': census['node'],
    'rerun': 'From empty /tmp/la-b82/g and /tmp/la-b82/home, with both trees built (npm ci; npm run build): '
    'extract_path_intent.py <base> <lift-base>; extract_path_intent.py <head> <lift-head>; '
    'node path_intent_census.mjs <base> <lift-base> <head> <lift-head> /tmp/la-b82/piX/fx <out>/census.json --entries. '
    'The fixture path is fixed so every message naming it is byte-comparable between runs. A mutant runs as '
    'mutate.py <tree> <spec> <log>, from the tree root.',
    'corpus': {
        'script': 'path_intent_census.mjs', 'scriptSha256': sha_file(os.path.join(here, 'path_intent_census.mjs')),
        'fixture': census['fixture'], 'pathInputs': census['inputs'], 'daemonRoots': census['roots'], 'clones': census['clones'],
        'answersAtBaseDaemonCopy': census['census']['arms'], 'byClass': census['census']['classes'],
        'notReached': 'a link whose target cannot be read: readlink fails after lstat only in a race, so no on-disk corpus reaches '
        'that arm; the new test in state-directory.test.ts reaches it by patching readlinkSync, and mutants P8 and P9c are killed there',
    },
    'census': {
        'what': 'the daemon\'s own copy and the state directory\'s copy, both at base, over every path input',
        'compared': ['resolved', 'realPath (the daemon copy calls it intendedRealPath)', 'detail'],
        'rows': census['census']['rows'], 'disagree': len(census['census']['disagree']), 'disagreements': census['census']['disagree'],
        'fieldsOnlyInTheDaemonCopy': {
            'reason': {'failures': census['census']['arms'].get('path-unreadable', 0) + census['census']['arms'].get('symlink-loop', 0),
                       'reasonMatchesDetail': census['census']['reasonMatchesDetail'],
                       'note': 'the state copy returned no reason at base; the one copy returns the daemon copy\'s reason (shared.againstDaemon), '
                       'and neither stateRootViolation nor sessionsRootViolation reads it'},
            'dangling': {'trueOnResolved': census['census']['danglingTrue'], 'readsInBaseMainTs': dangling_reads,
                         'note': 'no caller read it, so the one copy drops it'},
        },
    },
    'shared': {
        'againstDaemon': {'compared': ['resolved', 'realPath', 'reason', 'detail'], 'rows': census['shared']['againstDaemon']['rows'],
                          'differ': len(census['shared']['againstDaemon']['differ'])},
        'againstState': {'compared': ['resolved', 'realPath', 'detail'], 'rows': census['shared']['againstState']['rows'],
                         'differ': len(census['shared']['againstState']['differ'])},
    },
    'callers': {name: {'pairs': v['pairs'], 'differ': len(v['differ']), 'refusedAtBase': v['refusedAtBase']}
                for name, v in census['callers'].items()},
    'entries': {
        'what': 'the built syzygy entry of each tree, for every daemon pair with root <fixture>/root and every `dossier init` pair with '
        'clone <fixture>/root that the base caller refuses; exit, signal, stdout and stderr compared byte for byte',
        **{name: {'runs': v['runs'], 'differ': len(v['differ'])} for name, v in census['entries'].items()},
    },
    'negativeControl': {
        'what': 'the one copy reading EACCES as a missing component, lifted into lift-neg; sessionsRootViolation reads the built dist '
        'and so runs unmutated here',
        'file': 'packages/polaris-dossier/src/state-directory.ts',
        'old': "if (code === 'ENOENT') return { resolved: true, realPath: candidate };",
        'new': "if (code === 'ENOENT' || code === 'EACCES') return { resolved: true, realPath: candidate };",
        'stateSha256': lifted['neg']['stateSha256'],
        'shared': {'againstDaemon': len(neg['shared']['againstDaemon']['differ']), 'againstState': len(neg['shared']['againstState']['differ'])},
        'callers': {name: {'pairs': v['pairs'], 'differ': len(v['differ'])} for name, v in neg['callers'].items()},
    },
    'superseded': [
        {'what': 'a first --entries run at 6e3f56f6, the new tests being written uncommitted, made while mutant G6 re-pointed '
         'package.json\'s ./argv export, with the repeated daemon root of the next entry; not evidence',
         'entries': {name: {'runs': v['runs'], 'differ': len(v['differ'])} for name, v in superseded['entries'].items()},
         'cause': 'every one of its init differences is the head entry failing to load @syzygy/polaris-dossier/argv while G6 was applied',
         'headErrors': sorted({next(line for line in row['head']['stderr'].split('\n') if line.startswith('SyntaxError'))
                               for row in superseded['entries']['init']['differ']})},
        {'what': 'the first run at runsAt, whose daemon roots named <fixture>/root twice: path.join folded the root written as '
         'plain/../root into it, so its governedPlaneViolation pairs and daemon entry runs counted that root twice; not evidence',
         'scriptChange': [{'old': "j('plain/../root'), ", 'new': "`${F}/plain/../root`, "},
                          {'old': '', 'new': 'the loop after CLONES that throws when inputs, ROOTS or CLONES repeat a value'}],
         'callers': {name: {'pairs': v['pairs'], 'differ': len(v['differ'])} for name, v in duplicated['run']['callers'].items()},
         'entries': {name: {'runs': v['runs'], 'differ': len(v['differ'])} for name, v in duplicated['run']['entries'].items()},
         'cause': 'the script now keeps that root unnormalised and refuses a repeated input, root or clone'},
    ],
    'mutants': {
        'commit': commit,
        'what': 'P: one mutant per predicate of the one resolvePathIntent copy, and one per refusal reason; G: the subpath guard. '
        'A mutant is killed when its command exits nonzero',
        'results': mutants,
        'killed': sum(1 for m in mutants if m['outcome'] == 'killed'),
        'survived': [m['id'] for m in mutants if m['outcome'] == 'survived'],
        'controls': [m['id'] for m in mutants if m['outcome'].startswith('control')],
    },
    'retained': {
        'path-intent-base.jsonl': {'rows': len(compact), 'sha256': sha_text(compact_text),
                                   'form': 'line 1 lists the path inputs, daemon roots and clones; resolve rows hold both base answers '
                                   'whole; caller and entry rows hold their arguments as indexes into line 1 and the sha256 of the base '
                                   'answer\'s sorted-key JSON (the head answer was equal on every one)'},
        'argv-loop-sweep.json': {'sha256': sha_file(os.path.join(out, 'argv-loop-sweep.json'))},
        'fullRows': {'count': census['rows']['count'], 'sha256': census['rows']['sha256'], 'kept': 'scratch only (5.3 MB)'},
    },
}
json.dump(record, open(os.path.join(out, 'path-intent.json'), 'w'), indent=1)
print(json.dumps({'census': record['census']['disagree'], 'shared': record['shared'], 'callers': record['callers'],
                  'entries': {k: v for k, v in record['entries'].items() if k != 'what'}, 'neg': record['negativeControl']['callers'],
                  'killed': record['mutants']['killed'], 'survived': record['mutants']['survived'], 'controls': record['mutants']['controls']}))
