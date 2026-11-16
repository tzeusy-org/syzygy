#!/usr/bin/env python3
"""Export gate: no export of a package is used only inside its own file, unless a non-code file cites it.

Usage:
  export_gate.py <tree> --prefix <dir/> [--barrel <file>]... [--json out.json]
  export_gate.py --selftest

Exit 0 when the gate holds, 1 when it fails. Three stages, each with a stated
denominator (verification rule 9); the record carries all of them:

1. Census. export_census.census() (the lexer version) classes every export
   declared under the prefix: dead, self-only, test-only, internal or public.
2. Parse-tree cross-check of the census's own population. ts_exports.mjs lists
   each declaring file's exports from the TypeScript parse tree; the (file,
   name) set must equal the census's. A mismatch (a statement declaring several
   names, a form the declaration regexes do not see) fails the gate, because
   the census would then be counting a different population than the one the
   package exposes. The lexer's own identifier counts are cross-checked
   separately, by lexer_vs_printer.py over every tracked code file.
3. Non-code citers. Every export classed `self-only` or `dead` (no code file,
   test or not, outside its declaring file uses it) is looked up in every
   tracked file that is not code (not .ts .mts .mjs .js .cjs) by two methods,
   a Python identifier-token scan and `git grep -w -o -F`, which must agree.
   A name with at least one citer outside MACHINE_RECORDS is an EXCEPTION: kept
   exported, with the citing files recorded. A name with none is a VIOLATION.
   MACHINE_RECORDS are tool output and tool source under docs/evidence/ and
   pursuit data under docs/pursuits/: files that list names as data because a
   tool enumerated them, not statements anyone relies on. A citation is not a
   reliance (AGENTS.md rule 5), so they do not keep an export public. The record
   also counts the names that would be exceptions if those records counted
   (`withMachineRecordsCounted`), so the choice is visible.

The gate fails when any violation exists, or when the two citer methods
disagree, or when the parse-tree cross-check fails.
"""
import json
import re
import subprocess
import sys
import tempfile
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_census import CODE_EXT, TOKEN, census  # noqa: E402

TS_EXPORTS = Path(__file__).resolve().parent / 'ts_exports.mjs'
MACHINE_RECORDS = [
    (re.compile(r'^docs/evidence/.*\.(json|jsonl|diff|patch|txt|log|py)$'), 'tool output or tool source under docs/evidence'),
    (re.compile(r'^docs/pursuits/.*\.json$'), 'pursuit data under docs/pursuits'),
]
HOLDS = ('self-only', 'dead')


def machine_record(path: str) -> bool:
    return any(rx.search(path) for rx, _ in MACHINE_RECORDS)


def tracked(tree: Path) -> list[str]:
    return [p for p in subprocess.run(['git', 'ls-files', '-z'], cwd=tree, capture_output=True, check=True).stdout.decode().split('\0') if p]


def parse_tree_exports(tree: Path, files: list[str]) -> dict[str, set[str]]:
    import json as _json
    payload = _json.dumps([{'name': f, 'text': (tree / f).read_text(encoding='utf-8', errors='replace')} for f in files])
    run = subprocess.run(['node', str(TS_EXPORTS)], input=payload.encode(), capture_output=True, check=False)
    if run.returncode != 0:
        raise SystemExit(f'ts_exports.mjs failed: {run.stderr.decode(errors="replace")[-400:]}')
    return {item['name']: set(item['exports']) for item in _json.loads(run.stdout)}


def citers(tree: Path, names: set[str]) -> tuple[dict[str, set[str]], dict[str, set[str]], int, int]:
    """(python-token citers, git-grep citers, non-code files read, binary files skipped)."""
    non_code = [p for p in tracked(tree) if not p.endswith(CODE_EXT)]
    by_py: dict[str, set[str]] = {n: set() for n in names}
    skipped = 0
    for p in non_code:
        data = (tree / p).read_bytes() if (tree / p).is_file() else b''
        if b'\0' in data:
            skipped += 1
            continue
        for tok in set(TOKEN.findall(data.decode('utf-8', errors='replace'))) & names:
            by_py[tok].add(p)
    by_grep: dict[str, set[str]] = {n: set() for n in names}
    with tempfile.NamedTemporaryFile('w', suffix='.txt', delete=False) as fh:
        fh.write('\n'.join(sorted(names)) + '\n')
        pattern_file = fh.name
    try:
        excludes = [f':(exclude)*{ext}' for ext in CODE_EXT]
        out = subprocess.run(['git', 'grep', '-I', '-z', '-o', '-w', '-F', '-f', pattern_file, '--', '.', *excludes], cwd=tree, capture_output=True, check=False).stdout.decode('utf-8', errors='replace')
    finally:
        Path(pattern_file).unlink()
    # With -z and -o each record is `path NUL matched-text NEWLINE`.
    for record in out.split('\n'):
        path, sep, match = record.partition('\0')
        if sep and match in by_grep:
            by_grep[match].add(path)
    return by_py, by_grep, len(non_code) - skipped, skipped


def verdict(methods_agree: bool, violations: list, only_census: list, only_parsed: list) -> bool:
    """The gate holds only when the citer methods agree, no violation remains and the census population equals the parse tree's."""
    return methods_agree and not violations and not only_census and not only_parsed


def gate(tree: Path, prefix: str, barrels: set[str]) -> dict:
    rows, star_files, declaring = census(tree, prefix, barrels, False)
    declaring_files = sorted({r['file'] for r in rows} | set())
    all_declaring = [f for f in tracked(tree) if f.startswith(prefix) and f.endswith('.ts') and not re.search(r'\.test\.(ts|mjs|js)$', f) and f not in barrels]
    parsed = parse_tree_exports(tree, all_declaring)
    census_set = {(r['file'], r['name']) for r in rows}
    parsed_set = {(f, n) for f, names in parsed.items() for n in names}
    only_census, only_parsed = sorted(census_set - parsed_set), sorted(parsed_set - census_set)
    holds = [r for r in rows if r['class'] in HOLDS]
    names = {r['name'] for r in holds}
    by_py, by_grep, read, skipped = citers(tree, names)
    methods_agree = by_py == by_grep
    entries, violations, exceptions = [], [], []
    for r in sorted(holds, key=lambda r: (r['file'], r['name'])):
        cites = sorted(by_py[r['name']])
        counted = [c for c in cites if not machine_record(c)]
        entry = {'file': r['file'], 'name': r['name'], 'class': r['class'], 'citers': counted, 'machineRecordCitersOnly': (not counted) and bool(cites), 'machineRecordCiters': len(cites) - len(counted)}
        entries.append(entry)
        (exceptions if counted else violations).append(entry)
    summary: dict[str, int] = {}
    for r in rows:
        summary[r['class']] = summary.get(r['class'], 0) + 1
    git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    return {
        'tool': 'export_gate.py',
        'treeCommit': git('rev-parse', 'HEAD'),
        'trackedChangesInTree': git('status', '--porcelain', '--untracked-files=no') != '',
        'prefix': prefix,
        'barrels': sorted(barrels),
        'denominators': {
            'trackedFiles': len(tracked(tree)),
            'declaringFiles': declaring,
            'exportsScanned': len(rows),
            'classes': dict(sorted(summary.items())),
            'selfOnlyOrDead': len(holds),
            'nonCodeFilesRead': read,
            'nonCodeFilesSkippedAsBinary': skipped,
            'machineRecordRules': [reason for _, reason in MACHINE_RECORDS],
        },
        'parseTreeCrossCheck': {'parseTreeExports': len(parsed_set), 'censusExports': len(census_set), 'inCensusOnly': only_census, 'inParseTreeOnly': only_parsed,
                                'starReexportFiles': star_files, 'agrees': not only_census and not only_parsed},
        'citerMethodsAgree': methods_agree,
        'exceptions': exceptions,
        'violations': violations,
        'withMachineRecordsCounted': sum(1 for e in entries if e['citers'] or e['machineRecordCitersOnly']),
        'holds': verdict(methods_agree, violations, only_census, only_parsed),
    }


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    args = sys.argv[1:]
    tree = Path(args[0]).resolve()
    prefix = args[args.index('--prefix') + 1]
    barrels = {args[i + 1] for i, a in enumerate(args) if a == '--barrel'}
    record = gate(tree, prefix, barrels)
    if '--json' in args:
        Path(args[args.index('--json') + 1]).write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    d = record['denominators']
    print(f"exports={d['exportsScanned']} classes={d['classes']} selfOnlyOrDead={d['selfOnlyOrDead']} exceptions={len(record['exceptions'])} violations={len(record['violations'])} "
          f"parseTreeAgrees={record['parseTreeCrossCheck']['agrees']} citerMethodsAgree={record['citerMethodsAgree']} holds={record['holds']}")
    for v in record['violations']:
        print(f"  VIOLATION {v['file']}: {v['name']} ({v['class']})")
    for side in ('inCensusOnly', 'inParseTreeOnly'):
        for item in record['parseTreeCrossCheck'][side]:
            print(f'  CROSS-CHECK {side}: {item}')
    return 0 if record['holds'] else 1


FIXTURE = {
    'pkg/src/a.ts': (
        'export const keptByDoc = 1;\n'
        'export const keptByNothing = 2;\n'
        'export const keptByMachineRecordOnly = 3;\n'
        'export const useAll = keptByDoc + keptByNothing + keptByMachineRecordOnly;\n'
        'export const sharedA = 4, sharedB = 5;\n'
        'export const publicThing = 6;\n'
    ),
    'pkg/src/index.ts': "export * from './a.js';\n",
    'app/x.ts': "import { publicThing } from '@pkg/core';\nvoid publicThing;\n",
    'docs/note.md': 'The export keptByDoc is cited here.\n',
    'docs/evidence/census.json': '{"names": ["keptByMachineRecordOnly", "keptByNothing"]}\n',
}
# (name, expected verdict). Literals, never read from the tool.
FIXTURE_EXPECTED_VIOLATIONS = {'keptByNothing', 'keptByMachineRecordOnly', 'useAll', 'sharedA'}
FIXTURE_EXPECTED_EXCEPTIONS = {'keptByDoc'}


def selftest() -> int:
    failed, total = 0, 0

    def check(label: str, ok: bool, detail: str = '') -> None:
        nonlocal failed, total
        total += 1
        failed += 0 if ok else 1
        print(f"{'ok' if ok else 'FAIL'}  {label}{(': ' + detail) if detail and not ok else ''}")

    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, body in FIXTURE.items():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(body)
        subprocess.run(['git', 'init', '-q'], cwd=root, check=True)
        subprocess.run(['git', 'add', '-A'], cwd=root, check=True)
        subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'fixture'], cwd=root, check=True)
        record = gate(root, 'pkg/src/', {'pkg/src/index.ts'})
        violations = {v['name'] for v in record['violations']}
        exceptions = {e['name'] for e in record['exceptions']}
        check('a name cited by a doc is an exception', exceptions == FIXTURE_EXPECTED_EXCEPTIONS, str(exceptions))
        check('uncited, machine-record-only and unused names are violations', violations == FIXTURE_EXPECTED_VIOLATIONS, str(violations))
        check('a machine-record citer is counted apart', next(v for v in record['violations'] if v['name'] == 'keptByMachineRecordOnly')['machineRecordCitersOnly'] is True)
        check('a public export is not held', 'publicThing' not in violations | exceptions)
        check('the gate fails with violations', record['holds'] is False)
        cross = record['parseTreeCrossCheck']
        check('a statement declaring several names is a cross-check mismatch', ('pkg/src/a.ts', 'sharedB') in {tuple(x) for x in cross['inParseTreeOnly']}, str(cross['inParseTreeOnly']))
        check('the two citer methods agree on the fixture', record['citerMethodsAgree'] is True)
    # The verdict, one failing input at a time: each of the four conditions alone fails the gate.
    check('verdict holds when nothing is wrong', verdict(True, [], [], []) is True)
    check('verdict fails when the citer methods disagree', verdict(False, [], [], []) is False)
    check('verdict fails on a violation', verdict(True, [{}], [], []) is False)
    check('verdict fails on a name only the census has', verdict(True, [], [('f', 'n')], []) is False)
    check('verdict fails on a name only the parse tree has', verdict(True, [], [], [('f', 'n')]) is False)
    # A clean fixture (every held name cited by a doc) passes end to end.
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, body in {'pkg/src/a.ts': 'export const held = 1;\nexport const user = held;\nexport const used = 2;\n', 'pkg/src/index.ts': "export * from './a.js';\n",
                          'app/x.ts': "import { used, user } from '@pkg/core';\nvoid used; void user;\n", 'docs/note.md': 'held is cited.\n'}.items():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(body)
        subprocess.run(['git', 'init', '-q'], cwd=root, check=True)
        subprocess.run(['git', 'add', '-A'], cwd=root, check=True)
        subprocess.run(['git', '-c', 'user.name=t', '-c', 'user.email=t@t', 'commit', '-q', '-m', 'fixture'], cwd=root, check=True)
        clean = gate(root, 'pkg/src/', {'pkg/src/index.ts'})
        check('a tree whose only held name is cited by a doc passes', clean['holds'] is True and [e['name'] for e in clean['exceptions']] == ['held'], str(clean['violations']))
    print(f'selftest: {total - failed} of {total} cases hold')
    return 1 if failed else 0


if __name__ == '__main__':
    sys.exit(main())
