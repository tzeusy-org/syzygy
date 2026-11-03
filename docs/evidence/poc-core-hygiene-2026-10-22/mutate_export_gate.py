#!/usr/bin/env python3
"""Rule-6 mutation record for export_gate.py.

Usage: mutate_export_gate.py <tree> <out.json> --prefix <dir/> [--barrel <file>]...

Two kinds of mutant, each recorded with its old and new fragment and the commit
it ran at.

A. Tree mutants. In <tree>, which must satisfy the gate and have no tracked
   change, the `export` keyword is put back on one self-only declaration per
   declaring file (the first name the committed census record lists for that
   file, one file at a time, bytes restored in a finally block). The gate must
   fail and name that declaration among its violations. The set of kinds
   (const, function, type, interface, class, enum) the sample covers is
   recorded; the denominator is the list of names the un-export removed.
   --names <names.json> gives that list: [{"file", "name"}, ...].
B. Tool mutants. One fragment of export_gate.py is replaced in a scratch copy
   and the copy's --selftest must fail.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

HERE = Path(__file__).resolve().parent
sys.path.insert(0, str(HERE))
import export_gate  # noqa: E402

TOOL_MUTANTS = [
    ('dead-exports-not-held', "HOLDS = ('self-only', 'dead')", "HOLDS = ('self-only',)"),
    ('no-citer-counts-as-exception', "(exceptions if counted else violations).append(entry)", "(exceptions if True else violations).append(entry)"),
    ('every-citer-counts-as-exception-inverted', "(exceptions if counted else violations).append(entry)", "(violations if counted else exceptions).append(entry)"),
    ('machine-records-never-recognised', "return any(rx.search(path) for rx, _ in MACHINE_RECORDS)", "return False"),
    ('every-path-is-a-machine-record', "return any(rx.search(path) for rx, _ in MACHINE_RECORDS)", "return True"),
    ('evidence-rule-narrowed-to-json-only', r"re.compile(r'^docs/evidence/.*\.(json|jsonl|diff|patch|txt|log|py)$')", r"re.compile(r'^docs/evidence/.*\.jsonl$')"),
    ('parse-tree-population-replaced-by-census', "only_census, only_parsed = sorted(census_set - parsed_set), sorted(parsed_set - census_set)", "only_census, only_parsed = [], []"),
    ('citer-methods-agreement-ignored', "return methods_agree and not violations and not only_census and not only_parsed", "return not violations and not only_census and not only_parsed"),
    ('violations-ignored', "return methods_agree and not violations and not only_census and not only_parsed", "return methods_agree and not only_census and not only_parsed"),
    ('census-only-names-ignored', "return methods_agree and not violations and not only_census and not only_parsed", "return methods_agree and not violations and not only_parsed"),
    ('parse-tree-only-names-ignored', "return methods_agree and not violations and not only_census and not only_parsed", "return methods_agree and not violations and not only_census"),
    ('git-grep-citers-dropped', "if sep and match in by_grep:\n            by_grep[match].add(path)", "if False:\n            by_grep[match].add(path)"),
    ('python-scan-skips-markdown', "        if b'\\0' in data:\n            skipped += 1\n            continue", "        if b'\\0' in data or p.endswith('.md'):\n            skipped += 1\n            continue"),
]


def git(tree: Path, *args: str) -> str:
    return subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()


def main() -> int:
    tree = Path(sys.argv[1]).resolve()
    out = Path(sys.argv[2])
    args = sys.argv[1:]
    prefix = args[args.index('--prefix') + 1]
    barrels = {args[i + 1] for i, a in enumerate(args) if a == '--barrel'}
    names = json.loads(Path(args[args.index('--names') + 1]).read_text())
    commit = git(tree, 'rev-parse', 'HEAD')
    if git(tree, 'status', '--porcelain', '--untracked-files=no'):
        raise SystemExit('the tree has tracked changes; commit or restore them first')
    control = export_gate.gate(tree, prefix, barrels)
    if not control['holds']:
        raise SystemExit('the unmutated tree does not satisfy the gate')

    first_per_file: dict[str, str] = {}
    for item in names:
        first_per_file.setdefault(item['file'], item['name'])
    tree_records = []
    for file, name in sorted(first_per_file.items()):
        path = tree / file
        original = path.read_bytes()
        text = original.decode('utf-8')
        decl = re.compile(rf'^((?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+{re.escape(name)}\b)', re.M)
        found = decl.findall(text)
        if len(found) < 1:
            tree_records.append({'file': file, 'name': name, 'placed': False})
            continue
        match = decl.search(text)
        old, new = match.group(1), 'export ' + match.group(1)
        kind = re.search(r'(function|const|let|var|class|interface|type|enum)', old).group(1)
        try:
            path.write_text(text[:match.start()] + new + text[match.end():], encoding='utf-8')
            record = export_gate.gate(tree, prefix, barrels)
        finally:
            path.write_bytes(original)
        named = [v for v in record['violations'] if v['file'] == file and v['name'] == name]
        tree_records.append({'file': file, 'name': name, 'kind': kind, 'old': old, 'new': new, 'placed': True, 'gateHolds': record['holds'],
                             'violationsNamingIt': len(named), 'killed': record['holds'] is False and len(named) == 1})
    if git(tree, 'status', '--porcelain', '--untracked-files=no'):
        raise SystemExit('the tree was not restored')

    source = (HERE / 'export_gate.py').read_text(encoding='utf-8')
    tool_records = []
    # The copy sits beside the tool so its helpers (and `typescript`, resolved from the repository) are found.
    copy = HERE / '_mutant_export_gate.py'
    base = subprocess.run([sys.executable, str(HERE / 'export_gate.py'), '--selftest'], capture_output=True, text=True)
    try:
        for mutant_id, old, new in TOOL_MUTANTS:
            if source.count(old) != 1:
                raise SystemExit(f'{mutant_id}: old fragment occurs {source.count(old)} times, expected 1')
            copy.write_text(source.replace(old, new), encoding='utf-8')
            run = subprocess.run([sys.executable, str(copy), '--selftest'], capture_output=True, text=True)
            failed = [line for line in run.stdout.splitlines() if line.startswith('FAIL')]
            tool_records.append({'id': mutant_id, 'old': old, 'new': new, 'exitCode': run.returncode, 'killed': run.returncode != 0, 'failedCases': failed,
                                 'crash': run.stderr.strip().splitlines()[-1] if run.returncode not in (0, 1) and run.stderr.strip() else None})
    finally:
        copy.unlink(missing_ok=True)
    placed = [r for r in tree_records if r['placed']]
    summary = {
        'subject': 'export_gate.py',
        'subjectSha256': hashlib.sha256(source.encode('utf-8')).hexdigest(),
        'ranAtCommit': commit,
        'unmutatedSelftestLast': base.stdout.strip().splitlines()[-1],
        'treeMutants': {'sampledFiles': len(first_per_file), 'placed': len(placed), 'killed': sum(1 for r in placed if r['killed']),
                        'kindsCovered': sorted({r['kind'] for r in placed}), 'survivors': [r['name'] for r in placed if not r['killed']],
                        'unplaced': [r['name'] for r in tree_records if not r['placed']], 'records': tree_records},
        'toolMutants': {'mutants': len(tool_records), 'killed': sum(1 for r in tool_records if r['killed']), 'survivors': [r['id'] for r in tool_records if not r['killed']], 'records': tool_records},
    }
    out.write_text(json.dumps(summary, indent=1) + '\n', encoding='utf-8')
    print(f"tree mutants: placed={summary['treeMutants']['placed']} killed={summary['treeMutants']['killed']} kinds={summary['treeMutants']['kindsCovered']} survivors={summary['treeMutants']['survivors']}")
    print(f"tool mutants: {summary['toolMutants']['mutants']} killed={summary['toolMutants']['killed']} survivors={summary['toolMutants']['survivors']}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
