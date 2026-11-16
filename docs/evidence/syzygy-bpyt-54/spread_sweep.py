"""syzygy-bpyt.54: re-derived sweep for argument-spread calls (a call handed a whole array as arguments).

Usage: python3 spread_sweep.py <clone>
Population: tracked (`git ls-files -z`) `.ts`, `.mts`, `.tsx`, `.mjs`, `.js` files under packages/*/src, apps/*/src
and scripts/, less `*.test.ts`, `*.test.mjs`, `*.d.ts` and test support (`*.testkit.ts`, `test-*.ts`, `*-test-*.ts`,
`testing.ts`, anything under a `testing/` or `fixtures/` directory).

Method 1 (structural, Python only): strip comments and string/template text (keeping `${...}` code), track
brackets, and report every `...` whose innermost open bracket is a call's `(` -- the `(` follows an identifier,
`)`, `]` or `>` that is not a control keyword. A `...` is a rest parameter, not a spread, when the matching `)`
is followed by `=>`, `{` or a `:` return annotation, or the spread operand is followed by `:`; those are dropped.
Also reported: every `.apply(` and `Reflect.apply(` call (an array handed over as arguments).
Method 2 (literal, independent): the regex SECOND below, per raw line, which only knows the method names.
Method 3 (raw, independent of the stripper): the regex THIRD below, per raw line. Its differences from method 1 are
enumerated both ways (rest parameters, comments and strings on one side; later-argument and multi-line spreads on the
other), so every line either method alone reports is named in the output.
`--selftest` runs method 1 over must-hit and never-hit fixtures and exits 1 on any miss.
"""
import json
import re
import subprocess
import sys

root = sys.argv[1] if len(sys.argv) > 1 and sys.argv[1] != '--selftest' else '.'
SECOND = re.compile(r'\.(push|unshift|splice)\(\s*\.\.\.|Math\.(max|min)\(\s*\.\.\.|String\.fromCharCode\(\s*\.\.\.|\.apply\(')
# Method 3 (raw, per line, no stripping): a call-shaped `(` whose first argument is a spread, plus `.apply(`.
THIRD = re.compile(r'(?:[\w$)\]>]|\?\.)\s*\(\s*\.\.\.|\.apply\(')
KEYWORDS = {'if', 'for', 'while', 'switch', 'catch', 'function', 'return', 'typeof', 'await', 'yield', 'in', 'of', 'new', 'void', 'case', 'else', 'do'}
in_scope = re.compile(r'^((packages|apps)/[^/]+/src/|scripts/)')
test = re.compile(r'(\.test\.(ts|mts|mjs|js)$|\.d\.ts$|\.testkit\.ts$|/test-[^/]*\.(ts|mjs)$|-test-[^/]*\.(ts|mjs)$|/testing\.ts$|/testing/|/fixtures/)')


def scan_text(path, raw):
    # template substitution depth bookkeeping: simple re-implementation with explicit depth
    code = strip_with_depth(raw)
    hits = []
    stack = []  # (char, index, is_call)
    for m in re.finditer(r'\.apply\(|\.\.\.|[()\[\]{}]', code):
        tok = m.group(0)
        pos = m.start()
        if tok.endswith('.apply('):
            hits.append((pos, 'apply'))
            stack.append(('(', pos + len(tok) - 1, True))
            continue
        if tok in '([{':
            is_call = False
            if tok == '(':
                k = pos - 1
                while k >= 0 and code[k] in ' \t\n': k -= 1
                if k >= 0 and (code[k] in ')]>' or code[k].isalnum() or code[k] in '_$' or code[k - 1:k + 1] == '?.'):
                    w = re.search(r'[\w$]+$', code[:k + 1])
                    is_call = not (w and w.group(0) in KEYWORDS and code[k] not in ')]>.')
                    if w and code[:w.start()].rstrip().endswith('function'):
                        is_call = False
            stack.append((tok, pos, is_call))
        elif tok in ')]}':
            if stack: stack.pop()
        elif tok == '...':
            if stack and stack[-1][0] == '(' and stack[-1][2]:
                hits.append((pos, 'spread'))
    found = []
    for pos, kind in hits:
        if kind == 'spread' and rest_param(code, pos):
            continue
        line = code.count('\n', 0, pos) + 1
        found.append({'path': path, 'line': line, 'kind': kind, 'text': raw.split('\n')[line - 1].strip()[:200]})
    return found


def rest_param(code, pos):
    after = code[pos + 3:]
    m = re.match(r'\s*[\w$]+\s*(\??\s*:)', after)
    if m: return True
    # find matching ')' of the enclosing paren
    depth, j = 1, pos
    while j < len(code) and depth:
        j += 1
        if j >= len(code): return False
        if code[j] in '([{': depth += 1
        elif code[j] in ')]}': depth -= 1
    tail = code[j + 1:j + 40].lstrip()
    return tail.startswith('=>') or tail.startswith('{')


def strip_with_depth(src):
    out, i, n = [], 0, len(src)
    tmpl, depth, prev_sig = [], 0, ''
    def text(i):
        while i < n:
            if src[i] == '\\': out.append('  '); i += 2; continue
            if src[i] == '`': out.append(' '); return i + 1
            if src.startswith('${', i):
                out.append('  '); tmpl.append(depth); return i + 2
            out.append('\n' if src[i] == '\n' else ' '); i += 1
        return i
    while i < n:
        c = src[i]
        if c == '}' and tmpl and depth == tmpl[-1]:
            tmpl.pop(); out.append(' '); i = text(i + 1); prev_sig = 'x'; continue
        if src.startswith('//', i):
            j = src.find('\n', i); j = n if j < 0 else j
            out.append(' ' * (j - i)); i = j; continue
        if src.startswith('/*', i):
            j = src.find('*/', i + 2); j = n if j < 0 else j + 2
            out.append(''.join(ch if ch == '\n' else ' ' for ch in src[i:j])); i = j; continue
        if c in '"\'':
            j = i + 1
            while j < n and src[j] != c and src[j] != '\n':
                j += 2 if src[j] == '\\' else 1
            out.append(' ' * (min(j + 1, n) - i)); i = j + 1; prev_sig = 'x'; continue
        if c == '`':
            out.append(' '); i = text(i + 1); prev_sig = 'x'; continue
        if c == '/' and (prev_sig == '' or prev_sig in '(,=:[!&|?{};+-*%<>~^'):
            j, cls = i + 1, False
            while j < n and src[j] != '\n':
                if src[j] == '\\': j += 2; continue
                if src[j] == '[': cls = True
                elif src[j] == ']': cls = False
                elif src[j] == '/' and not cls: break
                j += 1
            out.append(' ' * (min(j + 1, n) - i)); i = j + 1; prev_sig = 'x'; continue
        if c == '{': depth += 1
        elif c == '}': depth -= 1
        out.append(c)
        if not c.isspace(): prev_sig = c
        i += 1
    return ''.join(out)


def sweep(population, read):
    hits, second, third = [], [], []
    for path in population:
        raw = read(path)
        hits.extend(scan_text(path, raw))
        for number, line in enumerate(raw.split('\n'), 1):
            for m in SECOND.finditer(line):
                second.append({'path': path, 'line': number, 'match': m.group(0)})
            for m in THIRD.finditer(line):
                third.append({'path': path, 'line': number, 'match': m.group(0)})
    return hits, second, third


def selftest():
    """Rule 6: every predicate of method 1 must flip a fixture, and each mutant of it must fail one."""
    must = {
        'push': 'a.push(...b);', 'call': 'f(...b);', 'later-arg': 'f(x, ...b);', 'new': 'new Set(...b);', 'optional': 'f?.(...b);',
        'generic': 'f<T>(...b);', 'max': 'Math.max(0, ...m.values());', 'apply': 'f.apply(null, b);', 'multiline': 'f(\n  ...b);',
        'after-template': 'const s = `${x}`; f(...b);', 'after-regex': 'const r = /[(]/; f(...b);',
    }
    never = {
        'array-literal': 'const a = [...b];', 'object-literal': 'const o = { ...b };', 'rest-arrow': 'const g = (...xs) => xs;',
        'rest-typed': 'function g(...xs: string[]) {}', 'rest-method': 'class C { m(...xs) { return xs; } }', 'comment': '// f(...b)',
        'block-comment': '/* f(...b) */', 'string': "const s = 'f(...b)';", 'template': 'const s = `f(...b)`;', 'array-in-call': 'f([...b]);',
        'object-in-call': 'f({ ...b });', 'regex': 'const r = /f(...b)/;', 'if': 'if (x) { const a = [...b]; }',
    }
    failures = [f'missed {k}' for k, src in must.items() if not scan_text('fixture', src)]
    failures += [f'false hit {k}' for k, src in never.items() if scan_text('fixture', src)]
    return failures


if '--selftest' in sys.argv:
    failures = selftest()
    print(json.dumps({'selftest': 'pass' if not failures else 'fail', 'failures': failures}, indent=1))
    sys.exit(1 if failures else 0)

files = subprocess.run(['git', '-C', root, 'ls-files', '-z', 'packages', 'apps', 'scripts'], capture_output=True, check=True).stdout.decode().split('\0')
population = sorted(f for f in files if in_scope.match(f) and f.endswith(('.ts', '.mts', '.tsx', '.mjs', '.js')) and not test.search(f))
hits, second, third = sweep(population, lambda path: open(f'{root}/{path}', encoding='utf-8').read())
first_keys = {(h['path'], h['line']) for h in hits}
second_keys = {(h['path'], h['line']) for h in second}
third_keys = {(h['path'], h['line']) for h in third}
print(json.dumps({
    'population': len(population),
    'structuralHits': len(hits),
    'structuralLines': len(first_keys),
    'literalHits': len(second),
    'literalLines': len(second_keys),
    'literalLinesMissedByStructural': sorted(f'{p}:{l}' for p, l in second_keys - first_keys),
    'rawCallLines': len(third_keys),
    'rawCallLinesNotStructural': sorted(f'{p}:{l}' for p, l in third_keys - first_keys),
    'structuralLinesNotRawCall': sorted(f'{p}:{l}' for p, l in first_keys - third_keys),
    'hits': hits,
}, indent=1))
