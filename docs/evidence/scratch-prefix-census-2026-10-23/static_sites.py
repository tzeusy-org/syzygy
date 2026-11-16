#!/usr/bin/env python3
"""Every line of a tracked file that creates, or builds a path in, the system temp directory, with its literal prefix where there is one.

Usage: static_sites.py <worktree> <commit> <out.json>
       static_sites.py --selftest <out.json>

Population: every blob of <commit> (git ls-tree -r -z, read through git cat-file --batch, so the worktree's own files are not
read) whose name ends .ts .mts .cts .js .mjs .cjs .py or .sh. A site is a line that matches at least one of PATTERNS below (the
exact regexes, published so the count can be re-derived); a line matching several is one site with several kinds:
  js-mkdtemp             mkdtemp( or mkdtempSync(
  js-mkdtemp-disposable  mkdtempDisposable( or mkdtempDisposableSync(  (Node 24; the tracer does not wrap it)
  js-tmpdir              tmpdir()  (any use of Node's temp directory: join(tmpdir(), ...), a lock path, a log path)
  py-tempfile            tempfile.mkdtemp( / TemporaryDirectory( / NamedTemporaryFile( / mkstemp( / gettempdir(
  sh-mktemp              the word mktemp
  literal-tmp-path       a string that starts with /tmp/
A site's `literal` is the first string literal on the line that starts with a letter, digit, `.` or `_`, continues in letters,
digits, `.`, `_` and `-`, and ends in `-` or `_` followed by a closing quote or `${` (the shape of a prefix, one segment or several:
'dossier-records-', 'syzygy-poc-browser-'), else None; a None site builds its prefix some other way and is attributed by a run's
trace or by hand. Round 1 of the review found that the first version of this rule (no `-` allowed inside the literal) read 2 of
591 sites; --selftest holds one fixture line per shape, the answer written as a literal, and mutants of the rule and the patterns.
The census over-counts on purpose (a line that only reads the temp directory is a site); it is the denominator for "which
files that touch the temp directory did the runs reach".
"""
import hashlib
import json
import pathlib
import re
import subprocess
import sys
import tempfile

PATTERNS = {
    'js-mkdtemp': r'\bmkdtemp(?:Sync)?\(',
    'js-mkdtemp-disposable': r'\bmkdtempDisposable(?:Sync)?\(',
    'js-tmpdir': r'\btmpdir\(\)',
    'py-tempfile': r'\btempfile\.(?:mkdtemp|TemporaryDirectory|NamedTemporaryFile|mkstemp|gettempdir)\(',
    'sh-mktemp': r'\bmktemp\b',
    'literal-tmp-path': r'''['"`]/tmp/''',
}
COMPILED = {k: re.compile(v) for k, v in PATTERNS.items()}
LITERAL = re.compile(r'''['"`]([A-Za-z0-9._][A-Za-z0-9._-]*[-_])(?=['"`]|\$\{)''')
SUFFIXES = ('.ts', '.mts', '.cts', '.js', '.mjs', '.cjs', '.py', '.sh')


def site_of(line: str):
    """The kinds a line matches and its prefix literal, or None when it matches no pattern."""
    kinds = [kind for kind, pattern in COMPILED.items() if pattern.search(line)]
    if not kinds:
        return None
    literal = LITERAL.search(line)
    return {'kinds': kinds, 'literal': literal.group(1) if literal else None}


# One line per shape, with the answer written as a literal. A line that matches no pattern is None.
FIXTURE = [
    ("const d = mkdtempSync(join(tmpdir(), 'dossier-records-'));", {'kinds': ['js-mkdtemp', 'js-tmpdir'], 'literal': 'dossier-records-'}),
    ("const p = await mkdtemp(join(tmpdir(), 'syzygy-poc-browser-'));", {'kinds': ['js-mkdtemp', 'js-tmpdir'], 'literal': 'syzygy-poc-browser-'}),
    ("const q = join(tmpdir(), `polaris-view-probe-${id}`);", {'kinds': ['js-tmpdir'], 'literal': 'polaris-view-probe-'}),
    ('const r = mkdtempSync(join(tmpdir(), "run_"));', {'kinds': ['js-mkdtemp', 'js-tmpdir'], 'literal': 'run_'}),
    ("const s = join(tmpdir(), 'a.b-c_d-');", {'kinds': ['js-tmpdir'], 'literal': 'a.b-c_d-'}),
    ("const t = join(tmpdir(), '.hidden-');", {'kinds': ['js-tmpdir'], 'literal': '.hidden-'}),
    ("const u = mkdtempSync(join(tmpdir(), prefix));", {'kinds': ['js-mkdtemp', 'js-tmpdir'], 'literal': None}),
    ("const v = join(tmpdir(), 'syzygy');", {'kinds': ['js-tmpdir'], 'literal': None}),
    ("d = tempfile.mkdtemp(prefix='py-scratch-')", {'kinds': ['js-mkdtemp', 'py-tempfile'], 'literal': 'py-scratch-'}),  # \bmkdtemp( also matches the Python call
    ("using w = mkdtempDisposableSync(join(tmpdir(), 'disposable-'));", {'kinds': ['js-mkdtemp-disposable', 'js-tmpdir'], 'literal': 'disposable-'}),
    ('dir=$(mktemp -d)', {'kinds': ['sh-mktemp'], 'literal': None}),
    ("const x = '/tmp/fixed-name-';", {'kinds': ['literal-tmp-path'], 'literal': None}),
    ("const y = join(root, 'dossier-records-');", None),
]


def fixture_answers() -> list:
    return [site_of(line) for line, _ in FIXTURE]


def selftest(out: pathlib.Path) -> None:
    source = pathlib.Path(__file__).resolve().read_text()
    mutants = {
        'literal-rule-without-hyphen-inside-the-literal': ("([A-Za-z0-9._][A-Za-z0-9._-]*[-_])(?=", "([A-Za-z0-9._]+[-_])(?="),
        'literal-rule-without-underscore-ending': ("*[-_])(?=", "*[-])(?="),
        'literal-rule-without-template-form': ("(?=['\"`]|\\$\\{)'''", "(?=['\"`])'''"),
        'literal-rule-without-leading-dot': ("([A-Za-z0-9._][A-Za-z0-9._-]*", "([A-Za-z0-9_][A-Za-z0-9._-]*"),
        'disposable-pattern-dropped': ("    'js-mkdtemp-disposable': r'\\bmkdtempDisposable(?:Sync)?\\(',\n", ""),
        'tmp-path-pattern-dropped': ("    'literal-tmp-path': r'''['\"`]/tmp/''',\n", ""),
        'a-line-matching-no-pattern-reports-a-site': ("    if not kinds:\n        return None\n", "    if not kinds:\n        return {'kinds': kinds, 'literal': None}\n"),
    }
    expected = [answer for _, answer in FIXTURE]
    record = {'tool': 'static_sites.py --selftest', 'sha256': hashlib.sha256(source.encode()).hexdigest(), 'fixture': [{'line': line, 'expected': answer} for line, answer in FIXTURE]}
    got = fixture_answers()
    record['unmutated'] = {'got': got, 'meets': got == expected}
    record['mutants'] = {}
    with tempfile.TemporaryDirectory(prefix='ss-') as scratch:
        for name, (old, new) in mutants.items():
            code = source[:source.index('def selftest(')]  # the mutants' own text below it names the same fragments
            assert code.count(old) == 1, (name, code.count(old))
            path = pathlib.Path(scratch) / f'mutant_{name.replace("-", "_")}.py'
            path.write_text(source.replace(old, new, 1))
            ran = subprocess.run([sys.executable, '-I', str(path), '--fixture'], capture_output=True, text=True, timeout=60)
            try:
                answer = json.loads(ran.stdout)
            except json.JSONDecodeError:
                answer = None
            record['mutants'][name] = {'old': old, 'new': new, 'killed': answer != expected, 'exit': ran.returncode,
                                       'diverges': 'the mutant stopped with an error' if answer is None else [FIXTURE[i][0] for i in range(len(FIXTURE)) if answer[i] != expected[i]]}
    record['holds'] = record['unmutated']['meets'] and all(m['killed'] for m in record['mutants'].values())
    out.write_text(json.dumps(record, indent=1) + '\n')
    print(json.dumps({'unmutated': record['unmutated']['meets'], 'killed': {n: m['killed'] for n, m in record['mutants'].items()}, 'holds': record['holds']}))
    sys.exit(0 if record['holds'] else 1)


if len(sys.argv) >= 2 and sys.argv[1] == '--fixture':
    print(json.dumps(fixture_answers()))
    sys.exit(0)
if len(sys.argv) >= 2 and sys.argv[1] == '--selftest':
    selftest(pathlib.Path(sys.argv[2]).resolve())

WT, COMMIT, OUT = pathlib.Path(sys.argv[1]).resolve(), sys.argv[2], pathlib.Path(sys.argv[3]).resolve()
assert re.fullmatch(r'[0-9a-f]{40}', COMMIT), 'give the full 40-hex commit'


def blobs(names: list) -> dict:
    """Read blobs of COMMIT through one git cat-file --batch process."""
    ran = subprocess.run(['git', 'cat-file', '--batch'], cwd=WT, input=''.join(f'{COMMIT}:{n}\n' for n in names).encode(), capture_output=True, check=True)
    data, position, found = ran.stdout, 0, {}
    for name in names:
        end = data.index(b'\n', position)
        header = data[position:end].split()
        assert header[1] == b'blob', (name, header)
        size = int(header[2])
        found[name] = data[end + 1:end + 1 + size]
        position = end + 1 + size + 1
    assert position == len(data)
    return found


listing = subprocess.run(['git', 'ls-tree', '-r', '-z', '--name-only', COMMIT], cwd=WT, capture_output=True, text=True, check=True).stdout.split('\0')
names = [n for n in listing if n.endswith(SUFFIXES)]
rows: dict = {}
for name, raw in blobs(names).items():
    try:
        text = raw.decode('utf-8')
    except UnicodeDecodeError:
        continue
    sites = []
    for number, line in enumerate(text.splitlines(), 1):
        found = site_of(line)
        if found:
            sites.append({'line': number, **found})
    if sites:
        rows[name] = sites
by_tree: dict = {}
for name, sites in rows.items():
    entry = by_tree.setdefault(name.split('/')[0], {'files': 0, 'sites': 0})
    entry['files'] += 1
    entry['sites'] += len(sites)
by_kind = {kind: sum(1 for sites in rows.values() for s in sites if kind in s['kinds']) for kind in PATTERNS}
record = {'tool': 'static_sites.py', 'treeCommit': COMMIT, 'patterns': PATTERNS, 'filePopulation': {'suffixes': list(SUFFIXES), 'blobsRead': len(names)},
          'filesWithASite': len(rows), 'sites': sum(len(v) for v in rows.values()), 'sitesByKind': by_kind, 'byTree': dict(sorted(by_tree.items())), 'files': rows}
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({k: record[k] for k in ('filePopulation', 'filesWithASite', 'sites', 'sitesByKind', 'byTree')}))
