#!/usr/bin/env python3
"""Compare the emitted code of two built trees, comments removed.

Usage: dist_code_diff.py <base-tree> <head-tree> <out.json> [--unexported <targets.json>]

For every built project (the ten `tsc -b` projects of `npm run build`) this
reads each `*.js` and `*.d.ts` under `<project>/dist` in both trees, prints each
with TypeScript's printer, removeComments true (ts_printer.py), and compares the
prints line by line. A print keeps string and template-literal text byte for
byte, so a whitespace edit inside a literal shows as a difference (the earlier
form, the census lexer with blank lines and trailing blanks dropped, hid it).
The record lists every file that differs with its removed and added lines, and
every file present in only one tree. Source maps and tsbuildinfo are not
compared.

With `--unexported <targets.json>` (a list of {"file": "<repo path of a source
file>", "name": ...}, the names whose `export` keyword the change removed) each
differing file is also explained at the statement level, from the parse trees of
both prints (ts_statements.mjs). A file is `explained` when all of these hold:
  - its head export set equals its base export set minus the unexported names
    of that module;
  - every head statement is a base statement unchanged, or a base statement of
    an unexported name with its leading `export ` taken off, in the base order
    (the `export {};` marker TypeScript writes once a declaration file's last
    export is gone is also allowed), or an import whose specifiers are a subset
    of a base import of the same module;
  - every base statement with no head counterpart is, in a declaration file
    only, an exported declaration of unexported names (TypeScript drops what
    nothing public refers to), a local declaration whose name no head statement
    mentions, or an import whose dropped specifiers no head statement mentions.
Any other difference makes the file unexplained and is listed as such.
"""
import difflib
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_census import TOKEN  # noqa: E402
from ts_printer import print_without_comments, top_level_statements  # noqa: E402

PROJECTS = [
    'packages/cap1-core', 'packages/cap1-daemon', 'packages/cap1-conformance', 'packages/three-surface-poc-core',
    'apps/syzygy', 'apps/three-surface-poc', 'packages/cap1-system', 'packages/polaris-generation-core',
    'packages/polaris-generation-consent', 'packages/polaris-dossier',
]


def emitted(tree: Path, project: str) -> dict[str, list[str]]:
    dist = tree / project / 'dist'
    paths = [path for path in sorted(dist.rglob('*')) if path.is_file() and (path.name.endswith('.js') or path.name.endswith('.d.ts'))]
    prints = print_without_comments([(str(path.relative_to(dist)), path.read_text(encoding='utf-8')) for path in paths])
    return {str(path.relative_to(dist)): text.splitlines() for path, text in zip(paths, prints)}


EXPORT_PREFIX = re.compile(r'^export (?:default )?')
FROM_MODULE = re.compile(r"""(?:from\s+|^import\s+)(['"][^'"]+['"])""")


def explain(base: list[dict], head: list[dict], unexported: set[str], dts: bool) -> list[str]:
    """Why the head statements are not the base statements minus unexported names; [] when they are."""
    problems: list[str] = []
    exports = lambda stmts: {n for s in stmts if s['exported'] for n in s['names']}
    if exports(head) != exports(base) - unexported:
        problems.append(f'export set differs: lost {sorted(exports(base) - exports(head) - unexported)}, gained {sorted(exports(head) - exports(base))}, kept {sorted(exports(head) & unexported)}')
    head_text_tokens: set[str] = set()
    for h in head:
        if h['kind'] != 'ImportDeclaration':
            head_text_tokens |= set(TOKEN.findall(h['text']))
    matched: set[int] = set()
    last = -1
    for h in head:
        if h['kind'] == 'ImportDeclaration':
            module = FROM_MODULE.search(h['text'])
            candidates = [i for i, b in enumerate(base) if b['kind'] == 'ImportDeclaration' and FROM_MODULE.search(b['text']) and module and FROM_MODULE.search(b['text']).group(1) == module.group(1) and i not in matched]
            hit = next((i for i in candidates if set(h['names']) <= set(base[i]['names'])), None)
            if hit is None:
                problems.append(f'head import has no base import of the same module with those specifiers: {h["text"][:100]}')
                continue
            matched.add(hit)
            dropped = set(base[hit]['names']) - set(h['names'])
            if dropped & head_text_tokens:
                problems.append(f'import specifier dropped but still mentioned: {sorted(dropped & head_text_tokens)}')
            continue
        hit = None
        for i, b in enumerate(base):
            if i in matched or i <= last:
                continue
            if b['text'] == h['text'] or (b['exported'] and b['names'] and set(b['names']) <= unexported and EXPORT_PREFIX.sub('', b['text'], count=1) == h['text']):
                hit = i
                break
        if hit is None:
            if h['text'] == 'export {};' and dts:
                continue
            problems.append(f'head statement is no base statement, with or without `export `: {h["text"][:100]}')
            continue
        matched.add(hit)
        last = hit
    for i, b in enumerate(base):
        if i in matched:
            continue
        if b['kind'] == 'ImportDeclaration':
            if set(b['names']) & head_text_tokens:
                problems.append(f'base import dropped but its names are still mentioned: {sorted(set(b["names"]) & head_text_tokens)}')
        elif dts and b['exported'] and b['names'] and set(b['names']) <= unexported:
            continue
        elif dts and not b['exported'] and b['names'] and not (set(b['names']) & head_text_tokens):
            continue
        else:
            problems.append(f'base statement missing from head: {b["text"][:100]}')
    return problems


def tree_state(tree: Path) -> dict:
    git = lambda *args: subprocess.run(['git', *args], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    return {'commit': git('rev-parse', 'HEAD'), 'trackedFilesModified': git('status', '--porcelain', '--untracked-files=no') != ''}


def statements(tree: Path, project: str, names: list[str]) -> dict[str, list[dict]]:
    dist = tree / project / 'dist'
    return dict(zip(names, top_level_statements([(n, (dist / n).read_text(encoding='utf-8')) for n in names])))


def main() -> int:
    base, head, out = Path(sys.argv[1]), Path(sys.argv[2]), Path(sys.argv[3])
    targets = json.loads(Path(sys.argv[sys.argv.index('--unexported') + 1]).read_text()) if '--unexported' in sys.argv else []
    projects = []
    for project in PROJECTS:
        a, b = emitted(base, project), emitted(head, project)
        unexported_by_module: dict[str, set[str]] = {}
        for t in targets:
            prefix = f'{project}/src/'
            if t['file'].startswith(prefix):
                unexported_by_module.setdefault(t['file'][len(prefix):].removesuffix('.ts'), set()).add(t['name'])
        differing_names = [n for n in sorted(set(a) & set(b)) if a[n] != b[n]]
        base_statements, head_statements = statements(base, project, differing_names), statements(head, project, differing_names)
        differing = []
        for name in differing_names:
            delta = [line for line in difflib.unified_diff(a[name], b[name], lineterm='', n=0) if not line.startswith(('---', '+++', '@@'))]
            module = name.removesuffix('.d.ts').removesuffix('.js')
            problems = explain(base_statements[name], head_statements[name], unexported_by_module.get(module, set()), name.endswith('.d.ts'))
            differing.append({'file': name, 'explained': not problems, 'problems': problems, 'removedOrAddedLines': delta})
        projects.append({
            'project': project,
            'filesCompared': len(set(a) & set(b)),
            'onlyInBase': sorted(set(a) - set(b)),
            'onlyInHead': sorted(set(b) - set(a)),
            'differingAfterCommentStrip': differing,
        })
    record = {
        'tool': 'dist_code_diff.py',
        'baseTree': tree_state(base),
        'headTree': tree_state(head),
        'projects': projects,
        'filesCompared': sum(p['filesCompared'] for p in projects),
        'filesDiffering': sum(len(p['differingAfterCommentStrip']) for p in projects),
        'unexportedNamesGiven': len(targets),
        'filesDifferingExplained': sum(1 for p in projects for d in p['differingAfterCommentStrip'] if d['explained']),
        'linesRemovedAndAdded': {'removed': sum(1 for p in projects for d in p['differingAfterCommentStrip'] for l in d['removedOrAddedLines'] if l.startswith('-')),
                                 'added': sum(1 for p in projects for d in p['differingAfterCommentStrip'] for l in d['removedOrAddedLines'] if l.startswith('+'))},
        'filesInOnlyOneTree': sum(len(p['onlyInBase']) + len(p['onlyInHead']) for p in projects),
    }
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(f"compared={record['filesCompared']} differing={record['filesDiffering']} explained={record['filesDifferingExplained']} "
          f"lines={record['linesRemovedAndAdded']} inOnlyOneTree={record['filesInOnlyOneTree']}")
    for p in projects:
        for d in p['differingAfterCommentStrip']:
            if not d['explained']:
                print(f"  UNEXPLAINED {p['project']}/dist/{d['file']}: {d['problems'][:3]}")
    return 0


if __name__ == '__main__':
    sys.exit(main())
