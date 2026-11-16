"""GP-B2 draft 2, Q1: the drafter's re-derivation of the vetter's sweep for argument-spread calls (one call handed a whole array).
Usage: python3 spread_sweep.py <clone>. Population: tracked (`git ls-files`) `.ts`, `.mts` and `.tsx` files under packages/*/src and
apps/*/src, less `*.test.ts` and `*.d.ts`; the second figure also leaves out the test-support files the Q5 census leaves out
(`*.testkit.ts`, `test-*.ts`, `*-test-*.ts`, `testing.ts` and anything under a `testing/` or `fixtures/` directory). Predicate:
the vetter's regex, verbatim, per line. Second method: the literal substrings `(...` after `push`, `unshift`, `splice`, `max`, `min`
and `fromCharCode`, and `.apply(`, counted with str.count over the same lines."""
import json
import re
import subprocess
import sys

root = sys.argv[1]
REGEX = re.compile(r'\.(push|unshift|splice)\(\s*\.\.\.|Math\.(max|min)\(\s*\.\.\.|String\.fromCharCode\(\s*\.\.\.|\.apply\(')
LITERALS = ['.push(...', '.unshift(...', '.splice(...', 'Math.max(...', 'Math.min(...', 'String.fromCharCode(...', '.apply(']
files = subprocess.run(['git', '-C', root, 'ls-files', '-z', 'packages', 'apps'], capture_output=True, check=True).stdout.decode().split('\0')
in_src = re.compile(r'^(packages|apps)/[^/]+/src/')
population = sorted(f for f in files if in_src.match(f) and f.endswith(('.ts', '.mts', '.tsx')) and not f.endswith(('.test.ts', '.d.ts')))
support = re.compile(r'(\.testkit\.ts$|/test-[^/]*\.ts$|-test-[^/]*\.ts$|/testing\.ts$|/testing/|/fixtures/)')
hits, literal_total = [], 0
for path in population:
    for number, line in enumerate(open(f'{root}/{path}', encoding='utf-8').read().split('\n'), 1):
        literal_total += sum(line.count(s) for s in LITERALS)
        for m in REGEX.finditer(line):
            hits.append({'path': path, 'line': number, 'match': m.group(0), 'text': line.strip()[:160], 'testSupport': bool(support.search(path))})
print(json.dumps({
    'population': len(population),
    'populationLessTestSupport': sum(1 for p in population if not support.search(p)),
    'regexHits': len(hits),
    'regexHitsLessTestSupport': sum(1 for h in hits if not h['testSupport']),
    'literalCount': literal_total,
    'hits': hits,
}, indent=1))
