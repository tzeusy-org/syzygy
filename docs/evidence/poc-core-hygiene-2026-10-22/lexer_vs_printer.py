#!/usr/bin/env python3
"""Cross-check export_census.py's lexer against TypeScript's printer, file by file.

Usage: lexer_vs_printer.py <tree> <out.json>

For every tracked code file of <tree> (git ls-files -z; .ts .mts .mjs .js .cjs,
node_modules excluded, the census's own code set) this counts identifier tokens
twice with the census's own TOKEN regex: once over strip_comments(text) (the
lexer) and once over TypeScript's createSourceFile printed with removeComments
(ts_printer.py). A file agrees when the two multisets are equal. The record
lists every differing file with the tokens whose counts differ, the file count,
and the tree's commit; it is valid only for that commit (rule 7). A numeric
literal with separators (`1_000_000n`) reads as an identifier tail (`_000_000n`)
in the census's TOKEN regex and the printer rewrites it, so both sides drop
digit-led word runs (NUMBER) before counting; nothing else is dropped.
Exit code 1 when any file differs, so a caller sees it.
"""
import hashlib
import json
import re
import subprocess
import sys
from pathlib import Path

sys.path.insert(0, str(Path(__file__).resolve().parent))
from export_census import CODE_EXT, count_tokens, strip_comments  # noqa: E402
from ts_printer import print_without_comments  # noqa: E402


NUMBER = re.compile(r'(?<![\w$])\d[\w$]*')


def identifier_counts(text: str) -> dict[str, int]:
    return count_tokens(NUMBER.sub(' ', text))


def code_files(tree: Path) -> list[str]:
    listed = subprocess.run(['git', 'ls-files', '-z'], cwd=tree, capture_output=True, check=True).stdout.decode().split('\0')
    return [f for f in listed if f.endswith(CODE_EXT) and not f.startswith('node_modules/')]


def compare(tree: Path) -> dict:
    files = code_files(tree)
    texts = [(f, (tree / f).read_text(encoding='utf-8', errors='replace')) for f in files]
    printed = print_without_comments(texts)
    differing = []
    for (name, text), out in zip(texts, printed):
        lexer, printer = identifier_counts(strip_comments(text)), identifier_counts(out)
        if lexer != printer:
            tokens = {t: {'lexer': lexer.get(t, 0), 'printer': printer.get(t, 0)} for t in sorted(set(lexer) | set(printer)) if lexer.get(t, 0) != printer.get(t, 0)}
            differing.append({'file': name, 'tokens': tokens})
    git = lambda *a: subprocess.run(['git', *a], cwd=tree, capture_output=True, text=True, check=True).stdout.strip()
    return {
        'tool': 'lexer_vs_printer.py',
        'toolSha256': hashlib.sha256(Path(__file__).read_bytes()).hexdigest(),
        'treeCommit': git('rev-parse', 'HEAD'),
        'trackedChangesInTree': git('status', '--porcelain', '--untracked-files=no') != '',
        'denominator': {'trackedCodeFiles': len(files), 'extensions': list(CODE_EXT)},
        'filesAgreeing': len(files) - len(differing),
        'filesDiffering': len(differing),
        'differing': differing,
    }


def main() -> int:
    tree, out = Path(sys.argv[1]).resolve(), Path(sys.argv[2])
    record = compare(tree)
    out.write_text(json.dumps(record, indent=1) + '\n', encoding='utf-8')
    print(f"files={record['denominator']['trackedCodeFiles']} agreeing={record['filesAgreeing']} differing={record['filesDiffering']}")
    for d in record['differing']:
        print(f"  {d['file']}: {d['tokens']}")
    return 1 if record['filesDiffering'] else 0


if __name__ == '__main__':
    sys.exit(main())
