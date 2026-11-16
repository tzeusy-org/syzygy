#!/usr/bin/env python3
"""Export census for one package or app source directory.

Usage:
  export_census.py <tree> --prefix <dir/> [--barrel <file>]... [--raw] [--json out.json] [--out-dir-label X]
  export_census.py --selftest

<tree> is a git checkout (the script reads `git ls-files -z` there, so it counts
tracked files only). --prefix names the directory whose non-test .ts files are
censused; --barrel names re-export files (their tokens are not uses).

Method (stated, re-runnable). Every tracked code file (.ts .mts .mjs .js .cjs)
is scanned once by a small lexer that drops line and block comments and keeps
string, template and regex-literal text, so a name quoted in a string still
counts as a use and the sweep errs toward keeping an export. The lexer replaces
the earlier regex stripper, which a glob string such as '**/*.ts' could turn
into an unclosed block comment and so lose later code. Identifier tokens are
then counted per file. For each export declared under the prefix:
  self          uses inside the declaring file beyond the declaration
  prod_inside   other non-test files under the prefix (barrels excluded)
  prod_outside  non-test files outside the prefix
  tests         *.test.ts / *.test.mjs files anywhere
Classes: dead (no use anywhere), self-only (uses only in its own file),
test-only (a test uses it, no other non-test file does), internal (other
non-test files under the prefix use it, none outside), public (a non-test file
outside the prefix uses it). --raw skips comment stripping (comments then count
as uses), the cross-check for the lexer.

Known limits of the lexer. Each can UNDER-count or OVER-count uses, so the
class of an export that a limit touches could be wrong in either direction (a
`dead` or `self-only` export lifted into `test-only`, `internal` or `public`,
or an export in use classed `dead`):
  - a regex literal after the `)` of a control header, as in
    `if (a) /\\/*/.test(s); X /* c */`, is read as division, so the `/*` inside it
    opens a comment that swallows code up to a later `*/` (under-count);
  - the same misread of a regex that holds a quote, as in
    `if (a) /'/.test(s); // X`, opens a string, and the lexer keeps string text,
    comments included (over-count);
  - a regex literal after `export default` is read as division the same way
    (under- or over-count by the same two routes).
Before trusting ANY class on a corpus that may contain one of these forms,
cross-check the identifier counts against TypeScript's createSourceFile printed
with removeComments (`lexer_vs_printer.py`, same directory, which does this over
every tracked code file and records the denominator).
"""
import json
import re
import subprocess
import sys
from pathlib import Path

REGEX_PRECEDERS = set('(,=:[!&|?{};+-*%<>~^')
REGEX_KEYWORDS = {'return', 'typeof', 'case', 'delete', 'void', 'throw', 'in', 'of', 'new', 'else', 'do', 'yield', 'await'}


def strip_comments(src: str) -> str:
    """Drop comments; keep string, template and regex-literal text."""
    out: list[str] = []
    i, n = 0, len(src)
    tpl: list[int] = []  # brace depth inside each open ${ } template expression
    in_template = False
    last_sig = ''  # last significant (non-space, non-comment) character
    last_word = ''
    while i < n:
        c = src[i]
        if in_template:
            if c == '\\' and i + 1 < n:
                out.append(src[i:i + 2]); i += 2; continue
            if c == '`':
                out.append(c); i += 1; in_template = False; last_sig = '`'; continue
            if c == '$' and i + 1 < n and src[i + 1] == '{':
                out.append('${'); i += 2; tpl.append(0); in_template = False; last_sig = '{'; continue
            out.append(c); i += 1; continue
        # code mode
        if c == '/' and i + 1 < n and src[i + 1] == '/':
            j = src.find('\n', i)
            i = n if j < 0 else j
            continue
        if c == '/' and i + 1 < n and src[i + 1] == '*':
            j = src.find('*/', i + 2)
            seg = src[i:] if j < 0 else src[i:j + 2]
            out.append('\n' * seg.count('\n') or ' ')
            i = n if j < 0 else j + 2
            continue
        if c in ('"', "'"):
            j = i + 1
            while j < n and src[j] != c and src[j] != '\n':
                j += 2 if src[j] == '\\' else 1
            out.append(src[i:j + 1]); i = j + 1; last_sig = c; continue
        if c == '`':
            out.append(c); i += 1; in_template = True; continue
        if c == '{' and tpl:
            tpl[-1] += 1
        if c == '}' and tpl:
            if tpl[-1] == 0:
                tpl.pop(); out.append(c); i += 1; in_template = True; continue
            tpl[-1] -= 1
        if c == '/':
            regex_ok = last_sig == '' or last_sig in REGEX_PRECEDERS or last_word in REGEX_KEYWORDS
            if regex_ok:
                j, in_class = i + 1, False
                while j < n and src[j] != '\n':
                    if src[j] == '\\':
                        j += 2; continue
                    if src[j] == '[':
                        in_class = True
                    elif src[j] == ']':
                        in_class = False
                    elif src[j] == '/' and not in_class:
                        break
                    j += 1
                if j < n and src[j] == '/':
                    j += 1
                    while j < n and (src[j].isalnum() or src[j] == '_'):
                        j += 1
                    out.append(src[i:j]); i = j; last_sig = '/'; last_word = ''
                    continue
        if c.isalnum() or c in '_$':
            j = i
            while j < n and (src[j].isalnum() or src[j] in '_$'):
                j += 1
            last_word = src[i:j]; last_sig = src[j - 1]
            out.append(src[i:j]); i = j; continue
        if not c.isspace():
            last_sig = c; last_word = ''
        out.append(c); i += 1
    return ''.join(out)


CODE_EXT = ('.ts', '.mts', '.mjs', '.js', '.cjs')
TOKEN = re.compile(r'[A-Za-z_$][\w$]*')


def count_tokens(body: str) -> dict[str, int]:
    counts: dict[str, int] = {}
    for tok in TOKEN.findall(body):
        counts[tok] = counts.get(tok, 0) + 1
    return counts


DECL = re.compile(
    r'^export\s+(?:declare\s+)?(?:abstract\s+)?(?:async\s+)?(?:function\*?|const|let|var|class|interface|type|enum)\s+([A-Za-z_$][\w$]*)',
    re.M,
)
LIST = re.compile(r'^export\s+(?:type\s+)?\{([^}]*)\}(?:\s+from\s+[^;]+)?;', re.M | re.S)
STAR = re.compile(r'^export\s+\*(?:\s+as\s+\w+)?\s+from\s+', re.M)


def selftest() -> int:
    cases = [
        ('glob then block comment later', "const g = '**/*.ts'; const Y = 1; /* c */ X", 'X', 1),
        ('name only in comments', "// X\n/* X */\nconst a = 1;", 'X', 0),
        ('name in string kept', "const s = 'X'; // X", 'X', 1),
        ('name in template text kept', "const s = `/* X */`;", 'X', 1),
        ('template expression is code', "const s = `a ${X} b`;", 'X', 1),
        ('nested braces in template expression', "const s = `${ {a: X}.a } tail`; X", 'X', 2),
        ('quote inside regex class', "const r = /[\"'`]/; X", 'X', 1),
        ('division is not a regex', "const q = a / b; // X\nX", 'X', 1),
        ('regex after return', "function f() { return /\\/*/.test(s); }\nX", 'X', 1),
        ('url in string is not a comment', "const u = 'http://h/x'; X", 'X', 1),
        ('escaped quote does not end the string', "const s = 'a\\'/*'; X /* */", 'X', 1),
        ('comment inside a template expression is a comment', "const s = `${/* X */ 1}`; X", 'X', 1),
        ('comment after a nested template in a template expression is a comment', "const s = `${`x`}${/* X */ 1}`; X", 'X', 1),
        ('comment after braces inside a template expression is a comment', "const s = `${ {a: 1}.a /* X */ } tail`; X", 'X', 1),
        ('slash inside a regex character class does not end the regex', "const r = /[/]\\/*x/; X /* c */", 'X', 1),
        ('division after a parenthesis is not a regex', "const q = (a) / b; // X\nX", 'X', 1),
        # A backtick inside a template expression opens a nested template; text after
        # the expression's closing brace is template text again, not code.
        ('nested template inside a template expression is entered', "const s = `${`/* X`}`; X", 'X', 2),
        ('text after a template expression close is template text', "const g = `${d}/*`; X /* c */", 'X', 1),
    ]
    failed = 0
    for label, src, name, expected in cases:
        got = count_tokens(strip_comments(src)).get(name, 0)
        status = 'ok' if got == expected else 'FAIL'
        if got != expected:
            failed += 1
        print(f'{status}  {label}: {name} expected {expected} got {got}')
    failed += classification_selftest()
    total = len(cases) + len(CLASS_EXPECTED) + len(RAW_EXPECTED)
    print(f'selftest: {total - failed} of {total} cases hold')
    return 1 if failed else 0


# One fixture package: a barrel, a declaring file, an internal user, a test, an
# outside (app) user. Expected classes are literals, never read from the tool.
CLASS_FILES = {
    'pkg/src/a.ts': (
        'export const deadThing = 1;\n'
        'export const selfOnlyThing = 2;\n'
        'export const testOnlyThing = 3;\n'
        'export const internalThing = 4;\n'
        'export const publicThing = 5;\n'
        'export const commentOnlyThing = 6;\n'
        'export const barrelOnlyThing = 7;\n'
        'export const listedThing = 8;\n'
        'export { listedThing as aliasedThing };\n'
        'export const useSelf = selfOnlyThing + 1;\n'
        '// commentOnlyThing is only named in this comment\n'
    ),
    'pkg/src/b.ts': "import { internalThing } from './a.js';\nexport const useInternal = internalThing;\n",
    'pkg/src/a.test.ts': "import { testOnlyThing } from './a.js';\nvoid testOnlyThing;\n",
    'app/x.ts': "import { publicThing } from '@pkg/core';\nvoid publicThing;\n",
    'app/x.test.ts': "import { testOnlyThing } from '@pkg/core';\nvoid testOnlyThing;\n",
    'pkg/src/index.ts': "export * from './a.js';\nexport { barrelOnlyThing } from './a.js';\n",
}
CLASS_EXPECTED = {
    'deadThing': 'dead',
    'selfOnlyThing': 'self-only',
    'testOnlyThing': 'test-only',
    'internalThing': 'internal',
    'publicThing': 'public',
    'commentOnlyThing': 'dead',
    'barrelOnlyThing': 'dead',
    'aliasedThing': 'dead',
    'listedThing': 'self-only',
    'useSelf': 'dead',
    'useInternal': 'dead',
}


# --raw counts comments as uses, so a name only a comment mentions is self-only.
RAW_EXPECTED = {'commentOnlyThing': 'self-only'}


def classification_selftest() -> int:
    import tempfile
    failed = 0
    with tempfile.TemporaryDirectory() as tmp:
        root = Path(tmp)
        for rel, body in CLASS_FILES.items():
            (root / rel).parent.mkdir(parents=True, exist_ok=True)
            (root / rel).write_text(body)
        subprocess.run(['git', 'init', '-q'], cwd=root, check=True)
        subprocess.run(['git', 'add', '-A'], cwd=root, check=True)
        rows, _, _ = census(root, 'pkg/src/', {'pkg/src/index.ts'}, False)
        got = {r['name']: r['class'] for r in rows}
        for name, expected in CLASS_EXPECTED.items():
            actual = got.get(name)
            status = 'ok' if actual == expected else 'FAIL'
            if actual != expected:
                failed += 1
            print(f'{status}  class of {name}: expected {expected} got {actual}')
        raw_rows, _, _ = census(root, 'pkg/src/', {'pkg/src/index.ts'}, True)
        raw_got = {r['name']: r['class'] for r in raw_rows}
        for name, expected in RAW_EXPECTED.items():
            actual = raw_got.get(name)
            status = 'ok' if actual == expected else 'FAIL'
            if actual != expected:
                failed += 1
            print(f'{status}  raw class of {name}: expected {expected} got {actual}')
    return failed


def census(tree: Path, prefix: str, barrels: set[str], raw: bool) -> tuple[list[dict], list[str], int]:
    """Return (rows, star re-export files, declaring file count) for one tree."""
    files = subprocess.run(['git', 'ls-files', '-z'], cwd=tree, capture_output=True, check=True).stdout.decode().split('\0')
    code = [f for f in files if f.endswith(CODE_EXT) and not f.startswith('node_modules/')]
    is_test = lambda f: bool(re.search(r'\.test\.(ts|mjs|js)$', f))
    text = {f: (tree / f).read_text(encoding='utf-8', errors='replace') for f in code}
    counts = {f: count_tokens(text[f] if raw else strip_comments(text[f])) for f in code}

    declared = [f for f in code if f.startswith(prefix) and f.endswith('.ts') and not is_test(f) and f not in barrels]
    rows = []
    star_files = []
    for f in declared:
        src = text[f]
        names = [(m.group(1), m.start()) for m in DECL.finditer(src)]
        for m in LIST.finditer(src):
            for part in m.group(1).split(','):
                part = re.sub(r'^type\s+', '', part.strip())
                if part:
                    names.append((part.split(' as ')[-1].strip(), m.start()))
        if STAR.search(src):
            star_files.append(f)
        for name, pos in names:
            self_uses = counts[f].get(name, 0) - 1
            others = [g for g in code if g != f and g not in barrels and name in counts[g]]
            prod_inside = [g for g in others if g.startswith(prefix) and not is_test(g)]
            prod_outside = [g for g in others if not g.startswith(prefix) and not is_test(g)]
            tests = [g for g in others if is_test(g)]
            if prod_outside:
                cls = 'public'
            elif prod_inside:
                cls = 'internal'
            elif tests:
                cls = 'test-only'
            elif self_uses > 0:
                cls = 'self-only'
            else:
                cls = 'dead'
            rows.append({'file': f, 'name': name, 'line': src.count('\n', 0, pos) + 1, 'class': cls, 'self': self_uses,
                         'prodInside': prod_inside, 'prodOutside': prod_outside, 'tests': tests})
    return rows, star_files, len(declared)


def main() -> int:
    if '--selftest' in sys.argv:
        return selftest()
    args = sys.argv[1:]
    tree = Path(args[0])
    prefix = args[args.index('--prefix') + 1]
    barrels = {args[i + 1] for i, a in enumerate(args) if a == '--barrel'}
    raw = '--raw' in args
    out = args[args.index('--json') + 1] if '--json' in args else None
    rows, star_files, declaring = census(tree, prefix, barrels, raw)
    summary = {}
    for r in rows:
        summary[r['class']] = summary.get(r['class'], 0) + 1
    print(f'prefix {prefix}: declaring files {declaring}; star re-export files {star_files}; mode {"raw" if raw else "lexer"}')
    print(f'exports scanned: {len(rows)}; ' + '; '.join(f'{k}={v}' for k, v in sorted(summary.items())))
    if out:
        Path(out).write_text(json.dumps(rows, indent=1) + '\n')
    return 0


if __name__ == '__main__':
    sys.exit(main())
