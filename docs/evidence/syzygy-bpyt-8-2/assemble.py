"""syzygy-bpyt.8.2: assemble the evidence directory from the golden runs. Raw outputs carry the whole usage text in every usage error
(7.8 MB a dossier run), so the retained goldens are compact: each row keeps its argv, environment, exit and first stderr line, and
the SHA-256 of its stdout and stderr; parse rows keep their whole result. Every raw output's own SHA-256 is recorded, so a rerun can
be compared byte for byte. Usage: assemble.py <scratch-golden-dir> <tree> <out-dir> <runs-commit>
"""
import hashlib, json, os, shutil, subprocess, sys

scratch, tree, out, runs = sys.argv[1:5]
BASE = '9a30237ed700e6579f3fcc1c6292e6c759861c3f'
OUTCOME_COMMIT = 'a14b6d1c29e6d456bbfcf8970d78f7628164d445'
FINDING_COMMIT = '856d5c5c07863bc16468b5dbc1b04eec852d4204'
OUTCOME_FILES = [f'packages/polaris-dossier/src/{n}.ts' for n in ('brief', 'check', 'close', 'execution-choice', 'init', 'inventory', 'render',
                                                                 'review', 'session-handover', 'waiting-sessions')]
os.makedirs(os.path.join(out, 'mutants'), exist_ok=True)
sha = lambda data: hashlib.sha256(data if isinstance(data, bytes) else data.encode()).hexdigest()
file_sha = lambda path: sha(open(path, 'rb').read())
S = lambda name: os.path.join(scratch, name)
git = lambda *args: subprocess.run(['git', '-C', tree, *args], capture_output=True, check=True).stdout
assert git('rev-parse', 'HEAD').decode().strip() == runs, 'assemble at the commit the runs were on'
CLEAN = git('status', '--porcelain') == b''


def compact(row):
    kept = {'argv': row['argv']}
    for key in ('env', 'exit', 'threw', 'exited', 'result'):
        if key in row:
            kept[key] = row[key]
    for key in ('stdout', 'stderr', 'written'):
        if key in row:
            kept[f'{key}Sha256'] = sha(row[key])
    if 'stderr' in row:
        kept['stderrHead'] = row['stderr'].split('\n')[0]
    return kept


def write_jsonl(name, rows):
    with open(os.path.join(out, name), 'w') as f:
        for row in rows:
            f.write(json.dumps(row, ensure_ascii=False) + '\n')
    return {'sha256': file_sha(os.path.join(out, name)), 'rows': len(rows)}


def diff(kind, a, b):
    done = subprocess.run([sys.executable, '-I', S('diff_golden.py'), kind, S(a), S(b)], capture_output=True, text=True)
    return json.loads(done.stdout.split('\n')[0])


def jsonl(name):
    return [json.loads(line) for line in open(S(name)) if line.startswith('{')]


for name in ('edge_corpus.py', 'build_corpus.py', 'extract_parsers.py', 'parse_corpus.py', 'parse-golden.mjs', 'subprocess_golden.py',
             'diff_golden.py', 'mutate.py', 'assemble.py', 'emit_compare.mjs'):
    shutil.copyfile(S(name), os.path.join(out, name))
shutil.copyfile(S('dossier-golden.test.ts'), os.path.join(out, 'dossier-golden-harness.ts'))
shutil.copyfile(os.path.join(scratch, '..', 'argv-capture.jsonl'), os.path.join(out, 'argv-capture.jsonl'))
for name in ('edge-corpus.json', 'dossier-corpus.json', 'daemon-corpus.json', 'polaris-corpus.json'):
    shutil.copyfile(S(name), os.path.join(out, name))
specs = sorted(n for n in os.listdir(S('mutants')) if n.endswith('.json') and not n.endswith('.result.json'))


def portable(text):
    """A spec's command with the scratch directory replaced: $EVIDENCE is this directory, $OUT an empty one for the outputs (its
    oracle/ made first by extract_parsers.py <tree> $OUT/oracle); mutate.py runs it from the tree root."""
    for old, new in ((S('dossier-golden.test.ts'), '$EVIDENCE/dossier-golden-harness.ts'), (S('mutants-out') + '/', '$OUT/'),
                     (S('dossier-negctl.json'), '$OUT/dossier-negctl.json'), (S('parse-negctl.json'), '$OUT/parse-negctl.json'),
                     (S('oracle-head'), '$OUT/oracle'), (scratch, '$EVIDENCE')):
        text = text.replace(old, new)
    assert '/tmp/claude' not in text, text
    return text


for name, source in [(n, f'mutants/{n}') for n in specs] + [('R2-short-group-read-as-its-first-option.856d5c5c.json',
                                                             'mutants-856d5c5c/R2-short-group-read-as-its-first-option.json')]:
    open(os.path.join(out, 'mutants', name), 'w').write(portable(open(S(source)).read()))

dossier, parse, sub = (json.load(open(S(n))) for n in ('dossier-base.json', 'parse-base.json', 'sub-base.json'))
retained = {
    'golden-dossier-base.jsonl': write_jsonl('golden-dossier-base.jsonl', [compact(r) for r in dossier]),
    'golden-parse-base.jsonl': write_jsonl('golden-parse-base.jsonl', [{'family': k, **compact(r)} for k in ('daemon', 'polaris') for r in parse[k]]),
    'golden-subprocess-base.jsonl': write_jsonl('golden-subprocess-base.jsonl', [{'family': k, **compact(r)} for k in ('daemon', 'rtf', 'polaris') for r in sub[k]]),
}
usage = jsonl('usage-mutants.jsonl')
reader = jsonl('reader-mutants.jsonl')
finding = next(r for r in jsonl('reader-mutants-856d5c5c.jsonl') if r['id'] == 'R2-short-group-read-as-its-first-option')
code = [p for p in git('diff', '--name-only', BASE, runs).decode().split() if not p.startswith('docs/') and p != 'packages/polaris-dossier/src/launched.test.ts']
record = {
    'schema': 'dossier-cli-table-golden/1',
    'bead': 'syzygy-bpyt.8.2',
    'text': 'Evidence record, not authority: the argv golden for the `syzygy` entry before and after the one command table and the one '
            'argument reader, the negative control that shows the golden can differ, a rule-6 mutant per reader predicate, and the rule-6 '
            'mutants of the table-driven usage test. Generated by assemble.py from the runs it names; do not edit.',
    'subject': {'base': BASE, 'runsAt': runs, 'cleanBeforeAssembly': CLEAN,
                'files': {p: file_sha(os.path.join(tree, p)) for p in code},
                'diffSha256': sha(git('diff', BASE, runs, '--', *code)),
                'note': 'runsAt merges origin/main at ce322e1a, whose only change near this subject is launched.test.ts (syzygy-bpyt.8.24); '
                        'that file is left out of files and diffSha256'},
    'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
    'rerun': 'From the tree root, with empty directories /tmp/la-b82/g, /tmp/la-b82/gcwd and /tmp/la-b82/home: the goldens fix those '
             'paths so that every message naming one is byte-comparable between runs. A mutant spec runs as mutate.py <tree> <spec> <log> '
             'with EVIDENCE set to this directory and OUT to an empty one holding oracle/ from extract_parsers.py <tree> $OUT/oracle.',
    'capture': {
        'what': 'every argv the @syzygy/polaris-dossier test project handed runDossierCli at base, one JSON line per call',
        'instrumentation': {'file': 'packages/polaris-dossier/src/cli.ts', 'commit': BASE,
                            'old': "export async function runDossierCli(argv: readonly string[], io: CliIo, ports: CliPorts = {}): Promise<number> {\n",
                            'new': "export async function runDossierCli(argv: readonly string[], io: CliIo, ports: CliPorts = {}): Promise<number> {\n"
                                   "  if (process.env['ARGV_CAPTURE']) fs.appendFileSync(process.env['ARGV_CAPTURE'], `${JSON.stringify(argv)}\\n`);\n",
                            'reverted': 'git checkout -- packages/polaris-dossier/src/cli.ts, then git status --porcelain printed nothing'},
        'command': 'ARGV_CAPTURE=<scratch>/argv-capture.jsonl TMPDIR=/tmp/la-b82/c CI=1 npx vitest run --project @syzygy/polaris-dossier --testTimeout=60000',
        'run': {'testFiles': '26 passed, 3 failed (29)', 'tests': '1174 passed, 2 failed, 21 skipped (1197)',
                'failures': 'load timeouts (load average 95 to 121): one test each in gate-acts.test.ts and git-object-reader.test.ts, and two '
                            'screen.test.ts hooks; none of the three files calls runDossierCli'},
        'calls': sum(1 for _ in open(os.path.join(out, 'argv-capture.jsonl'))),
        'sha256': file_sha(os.path.join(out, 'argv-capture.jsonl')),
    },
    'corpora': {name: {'sha256': file_sha(S(name)), 'rows': len(json.load(open(S(name))))}
                for name in ('edge-corpus.json', 'dossier-corpus.json', 'daemon-corpus.json', 'polaris-corpus.json')},
    'goldens': {
        'dossier': {
            'what': 'runDossierCli in process over dossier-corpus.json (the capture, each test temporary path rewritten under '
                    '/nonexistent-la-b82, then the edge corpus), env {}, a fixed clock, no sleep, no standard input, from an empty directory',
            'command': 'cp dossier-golden-harness.ts packages/polaris-dossier/src/zz-golden.test.ts; GOLDEN_CORPUS=dossier-corpus.json '
                       'GOLDEN_OUT=<out> GOLDEN_CWD=/tmp/la-b82/gcwd npx vitest run --project @syzygy/polaris-dossier '
                       'packages/polaris-dossier/src/zz-golden.test.ts; rm packages/polaris-dossier/src/zz-golden.test.ts',
            'base': file_sha(S('dossier-base.json')), 'baseRerun': file_sha(S('dossier-base2.json')),
            'head': file_sha(S('dossier-head-final.json')), 'diff': diff('dossier', 'dossier-base.json', 'dossier-head-final.json'),
        },
        'parse': {
            'what': "the daemon's parseCli and `syzygy polaris`'s parseArgs, lifted byte for byte from each tree by extract_parsers.py, "
                    'over daemon-corpus.json under four environments and polaris-corpus.json under two',
            'command': 'extract_parsers.py <tree> <oracle>; node parse-golden.mjs <oracle> <corpus-dir> <out>',
            'base': file_sha(S('parse-base.json')), 'baseRerun': file_sha(S('parse-base2.json')),
            'head': file_sha(S('parse-head-final.json')), 'diff': diff('parse', 'parse-base.json', 'parse-head-final.json'),
        },
        'subprocess': {
            'what': 'the built entry (apps/syzygy/dist/main.js) as a subprocess: every daemon pair the base parse read as help or invalid, '
                    'nine RTF-1 containment refusals over a symbolic-link fixture, and every polaris pair but supervise, with no tmux on '
                    'PATH and HOME and the state root in scratch',
            'command': 'npm run build; subprocess_golden.py <tree> parse-base.json <out>',
            'base': file_sha(S('sub-base.json')), 'head': file_sha(S('sub-head3.json')), 'diff': diff('sub', 'sub-base.json', 'sub-head3.json'),
        },
    },
    'negativeControl': {'mutant': 'mutants/NEG.json', 'what': 'argv.ts reading a valued option by its token name, so `--name=value` is taken',
                        'result': next(r for r in reader if r['id'] == 'NEG')},
    'readerMutants': {
        'what': 'one mutant per predicate of readArgv, each rerunning the dossier and parse goldens; a mutant is killed when a golden differs',
        'commit': runs, 'specs': 'mutants/R*.json',
        'results': [r for r in reader if r['id'] != 'NEG'],
        'killed': sum(1 for r in reader if r['id'] != 'NEG' and (r['dossier']['differ'] or r['parse']['differ'])),
        'of': sum(1 for r in reader if r['id'] != 'NEG'),
        'finding': {'commit': FINDING_COMMIT, 'mutant': 'mutants/R2-short-group-read-as-its-first-option.856d5c5c.json', 'result': finding,
                    'disposition': 'survived: the raw-name clause it mutated was redundant, since every later branch compares the whole '
                                   'argument with the literal names; c5908cc0 removed the clause, and R2b mutates the property where it now lives'},
        'typeOnly': "the `token.kind === 'option'` conjunct narrows the token's type for its value; the only other token kind that reaches it "
                    "is `--`, which is no valued name, so no mutant of it can change a result",
    },
    'usageTestMutants': {'test': 'packages/polaris-dossier/src/cli-table.test.ts', 'commit': runs, 'specs': 'mutants/U*.json',
                         'results': usage,
                         'killed': sum(1 for r in usage if r['id'] != 'U0-none' and r['exit'] != 0),
                         'of': sum(1 for r in usage if r['id'] != 'U0-none'),
                         'unmutated': next(r for r in usage if r['id'] == 'U0-none')},
    'outcomeType': {
        'what': 'the Outcome<R, F> commit is type-only: each module it touched emits the same JavaScript at base and at that commit',
        'commit': OUTCOME_COMMIT,
        'command': f'node emit_compare.mjs <tree> {BASE} {OUTCOME_COMMIT} <file>...',
        'result': subprocess.run(['node', S('emit_compare.mjs'), tree, BASE, OUTCOME_COMMIT, *OUTCOME_FILES], capture_output=True, text=True,
                                 check=True).stdout.strip(),
        'files': OUTCOME_FILES,
    },
    'retained': retained,
}
json.dump(record, open(os.path.join(out, 'evidence.json'), 'w'), indent=1, ensure_ascii=False)
print(json.dumps({k: v['diff'] for k, v in record['goldens'].items()}), json.dumps(record['negativeControl']['result']),
      'reader', record['readerMutants']['killed'], '/', record['readerMutants']['of'],
      'usage', record['usageTestMutants']['killed'], '/', record['usageTestMutants']['of'], record['outcomeType']['result'])
