#!/usr/bin/env python3
"""Rule-6 mutants for the stack-4 predicates and their class-1 and class-4 call sites (syzygy-bpyt.6.3).

Usage: mutants.py <clone with node_modules, at the commit under test> <out.json> [--only S|I|C|N] [--tmpdir <dir>] [--selftest]
The scratch directory for the vitest reports is --tmpdir, else $TMPDIR; with neither the run refuses (no fixed /tmp path).

For each mutant: apply the stored fragment change, run the stated test files, restore. A mutant is killed when the run exits non-zero
with at least one failed test; a run that reports no test counts is an error, never a kill. Every row stores the file, the 1-based
line, the exact text replaced (`old`) and its replacement (`new`), the index, from 0, of the call among the file's `isRecord(` calls
(the line alone locates it: `old` occurs once on its line in every row), and the commit of the clone, so each can be re-run by hand.

  C0 / N0   control: the unmutated test set passes; a harmless comment added to the mutated file passes
  S*        the support predicate (packages/support/src/is-record.ts), against its own test
  I*        the dossier formatter (packages/polaris-dossier/src/iso-of.ts), against its own test
  C-*       one call to the support predicate in a class-1 or class-4 importer, three ways:
              A  admits an array      isRecord(x) -> (typeof x === 'object' && x !== null)
              B  admits null          isRecord(x) -> (typeof x === 'object' && !Array.isArray(x))
              D  admits anything      isRecord(x) -> true
            run against that importer's own test file; a survivor is re-run against `vitest related <file>` (the escalation)
            and, when it still survives, reported as a survivor for the evidence record to explain.
  N-*       the rows added by round 1 of the review (R-GP-IMPL-OBJECT-ISO-HELPERS-1, N3 and N8), run with `--only N`; every failing test is stored:
              E  names strings and admits every other primitive   isRecord(x) -> (x !== null && typeof x !== 'string' && !Array.isArray(x))
                 at each call of the two importers whose `NOT_OBJECTS` tables hold the `a number` row; that row is not redundant with `a string`
                 where E is killed by an `a number` test and by no `a string` test (`failsOnANumberRow`, `failsOnAStringRow`)
              O8 a function is admitted at the secret-redaction declaration read (the reviewer's mutant)
"""
import json
import os
import re
import subprocess
import sys

IMPORTERS = [
    ('packages/three-surface-poc-core/src/authority-artifact-fields.ts', ['packages/three-surface-poc-core/src/authority-artifact-fields.test.ts'], 1),
    ('packages/polaris-generation-core/src/secret-redaction.ts', ['packages/polaris-generation-core/src/secret-redaction.test.ts'], 4),
    ('packages/polaris-generation-core/src/public-source-classification.ts', ['packages/polaris-generation-core/src/public-source-classification.test.ts', 'packages/polaris-generation-core/src/public-source-exemption.test.ts'], 4),
    ('packages/polaris-dossier/src/screen.ts', ['packages/polaris-dossier/src/screen.test.ts'], 4),
]
SUPPORT = 'packages/support/src/is-record.ts'
SUPPORT_TESTS = ['packages/support/src/is-record.test.ts']
ISO = 'packages/polaris-dossier/src/iso-of.ts'
ISO_TESTS = ['packages/polaris-dossier/src/iso-of.test.ts']

SUPPORT_BODY = "return value !== null && typeof value === 'object' && !Array.isArray(value);"
SUPPORT_MUTANTS = [
    ('S1-admits-null', SUPPORT_BODY, "return typeof value === 'object' && !Array.isArray(value);"),
    ('S2-admits-primitives', SUPPORT_BODY, 'return value !== null && !Array.isArray(value);'),
    ('S3-admits-arrays', SUPPORT_BODY, "return value !== null && typeof value === 'object';"),
    ('S4-admits-functions', SUPPORT_BODY, "return value !== null && (typeof value === 'object' || typeof value === 'function') && !Array.isArray(value);"),
    ('S5-instanceof-array-for-array-is-array', SUPPORT_BODY, "return value !== null && typeof value === 'object' && !(value instanceof Array);"),
    ('S6-plain-objects-only', SUPPORT_BODY, "return value !== null && typeof value === 'object' && !Array.isArray(value) && [Object.prototype, null].includes(Object.getPrototypeOf(value) as object | null);"),
    ('S7-swallows-the-revoked-proxy-throw', SUPPORT_BODY, "try { return value !== null && typeof value === 'object' && !Array.isArray(value); } catch { return false; }"),
    ('S8-always-true', SUPPORT_BODY, 'return true;'),
    ('S9-always-false', SUPPORT_BODY, 'return false;'),
]
ISO_BODY = 'new Date(instant).toISOString();'
ISO_MUTANTS = [
    ('I1-http-date-form', ISO_BODY, 'new Date(instant).toUTCString();'),
    ('I2-drops-the-milliseconds', ISO_BODY, "new Date(instant).toISOString().slice(0, 19) + 'Z';"),
    ('I3-absolute-value', ISO_BODY, 'new Date(Math.abs(instant)).toISOString();'),
    ('I4-swallows-the-range-error', 'export const isoOf = (instant: number): string => new Date(instant).toISOString();',
     "export const isoOf = (instant: number): string => { try { return new Date(instant).toISOString(); } catch { return ''; } };"),
    ('I5-local-time-form', ISO_BODY, 'new Date(instant).toString();'),
]
NOT_OBJECT_IMPORTERS = ['packages/three-surface-poc-core/src/authority-artifact-fields.ts', 'packages/polaris-dossier/src/screen.ts']
PRIMITIVE_VARIANT = lambda x: f"({x} !== null && typeof {x} !== 'string' && !Array.isArray({x}))"
SECRET = 'packages/polaris-generation-core/src/secret-redaction.ts'
SECRET_TESTS = ['packages/polaris-generation-core/src/secret-redaction.test.ts']
O8_OLD = "if (!isRecord(red)) return refuse('is not an object');"
O8_NEW = "if (!isRecord(red) && typeof red !== 'function') return refuse('is not an object');"
MUTANT_VARIANTS = {
    'A': lambda x: f"(typeof {x} === 'object' && {x} !== null)",
    'B': lambda x: f"(typeof {x} === 'object' && !Array.isArray({x}))",
    'D': lambda x: 'true',
}


def calls_of(text):
    """Every `isRecord(ARG)` call outside the import line, as (start, end, ARG), by balanced parentheses."""
    found = []
    for m in re.finditer(r'(?<![\w$.])isRecord\(', text):
        depth, i = 1, m.end()
        while i < len(text) and depth:
            depth += {'(': 1, ')': -1}.get(text[i], 0)
            i += 1
        found.append((m.start(), i, text[m.end():i - 1]))
    return found


def run_tests(clone, tmpdir, tests, related=None, keep=3):
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    cmd = ['npx', 'vitest', 'related', related, '--run'] if related else ['npx', 'vitest', 'run'] + tests
    cmd += ['--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={out}']
    proc = subprocess.run(cmd, cwd=clone, env=dict(os.environ, TMPDIR=tmpdir), capture_output=True, text=True, timeout=1500)
    if not os.path.exists(out):
        raise SystemExit('no json reporter output: ' + proc.stderr[-400:])
    data = json.load(open(out))
    if data['numTotalTests'] == 0:
        raise SystemExit('the run reported no tests')
    failed = [t['fullName'] for f in data['testResults'] for t in f['assertionResults'] if t['status'] == 'failed']
    return {'exit': proc.returncode, 'passed': data['numPassedTests'], 'failed': data['numFailedTests'], 'total': data['numTotalTests'], 'failedTests': failed[:keep]}


def with_edit(clone, path, start, end, new):
    full = os.path.join(clone, path)
    text = open(full).read()
    open(full, 'w').write(text[:start] + new + text[end:])
    return lambda: open(full, 'w').write(text)


def line_of(text, offset):
    return text.count('\n', 0, offset) + 1


def mutate_fragment(clone, tmpdir, path, tests, ident, old, new, group, results, keep=3):
    full = os.path.join(clone, path)
    text = open(full).read()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: old fragment of {ident} occurs {text.count(old)} times, not once')
    at = text.index(old)
    restore = with_edit(clone, path, at, at + len(old), new)
    try:
        r = run_tests(clone, tmpdir, tests, keep=keep)
    finally:
        restore()
    results.append({'id': ident, 'group': group, 'file': path, 'line': line_of(text, at), 'old': old, 'new': new, 'tests': tests, **r, 'killed': r['exit'] != 0 and r['failed'] > 0})


def selftest():
    text = "import { isRecord } from 'x';\nif (!isRecord(a.b) || isRecord(f(g(1)))) {}\nconst k = isRecord(z) ? 1 : 2;\n"
    got = [a for _, _, a in calls_of(text)]
    assert got == ['a.b', 'f(g(1))', 'z'], got
    assert MUTANT_VARIANTS['A']('z') == "(typeof z === 'object' && z !== null)"
    print('mutants selftest ok')


def main(argv):
    if argv[:1] == ['--selftest']:
        selftest()
        return 0
    clone, out_path = argv[0], argv[1]
    only = argv[argv.index('--only') + 1] if '--only' in argv else None
    tmpdir = argv[argv.index('--tmpdir') + 1] if '--tmpdir' in argv else os.environ.get('TMPDIR')
    if not tmpdir:
        raise SystemExit('give --tmpdir <dir> or set TMPDIR: the run keeps vitest reports there')
    os.makedirs(tmpdir, exist_ok=True)
    commit = subprocess.run(['git', '-C', clone, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip()
    if subprocess.run(['git', '-C', clone, 'status', '--porcelain'], capture_output=True, text=True, check=True).stdout.strip():
        raise SystemExit('the clone is not clean')
    results, controls = [], []

    def control(ident, path, tests, mutate):
        full = os.path.join(clone, path)
        text = open(full).read()
        restore = mutate(full, text)
        try:
            r = run_tests(clone, tmpdir, tests)
        finally:
            restore()
        controls.append({'id': ident, 'file': path, 'tests': tests, **r, 'passed_clean': r['exit'] == 0 and r['failed'] == 0})

    if only in (None, 'S'):
        control('C0-support', SUPPORT, SUPPORT_TESTS, lambda f, t: (lambda: None))
        control('N0-support-comment', SUPPORT, SUPPORT_TESTS, lambda f, t: (open(f, 'w').write(t + '// harmless\n'), lambda: open(f, 'w').write(t))[1])
        for ident, old, new in SUPPORT_MUTANTS:
            mutate_fragment(clone, tmpdir, SUPPORT, SUPPORT_TESTS, ident, old, new, 'S', results)
    if only in (None, 'I'):
        control('C0-iso', ISO, ISO_TESTS, lambda f, t: (lambda: None))
        control('N0-iso-comment', ISO, ISO_TESTS, lambda f, t: (open(f, 'w').write(t + '// harmless\n'), lambda: open(f, 'w').write(t))[1])
        for ident, old, new in ISO_MUTANTS:
            mutate_fragment(clone, tmpdir, ISO, ISO_TESTS, ident, old, new, 'I', results)
    if only in (None, 'C'):
        for path, tests, klass in IMPORTERS:
            control(f'C0-{os.path.basename(path)}', path, tests, lambda f, t: (lambda: None))
            control(f'N0-{os.path.basename(path)}-comment', path, tests, lambda f, t: (open(f, 'w').write(t + '// harmless\n'), lambda: open(f, 'w').write(t))[1])
            text = open(os.path.join(clone, path)).read()
            for n, (start, end, arg) in enumerate(calls_of(text)):
                for variant, make in MUTANT_VARIANTS.items():
                    ident = f'C-{os.path.basename(path)[:-3]}-L{line_of(text, start)}n{n}-{variant}'
                    old, new = text[start:end], make(arg)
                    restore = with_edit(clone, path, start, end, new)
                    try:
                        r = run_tests(clone, tmpdir, tests)
                        escalated = None
                        if r['exit'] == 0 and r['failed'] == 0:
                            escalated = run_tests(clone, tmpdir, [], related=path)
                    finally:
                        restore()
                    killed = r['exit'] != 0 and r['failed'] > 0
                    killed_by_related = escalated is not None and escalated['exit'] != 0 and escalated['failed'] > 0
                    results.append({'id': ident, 'group': 'C', 'class': klass, 'file': path, 'line': line_of(text, start), 'occurrence': n, 'old': old, 'new': new,
                                    'tests': tests, **r, 'killed': killed, 'escalated': escalated, 'killedByRelated': killed_by_related})
    if only in (None, 'N'):
        control('C0-secret-redaction', SECRET, SECRET_TESTS, lambda f, t: (lambda: None))
        mutate_fragment(clone, tmpdir, SECRET, SECRET_TESTS, 'N3-O8-function-admitted', O8_OLD, O8_NEW, 'N', results, keep=None)
        for path, tests, klass in IMPORTERS:
            if path not in NOT_OBJECT_IMPORTERS:
                continue
            control(f'C0-{os.path.basename(path)}', path, tests, lambda f, t: (lambda: None))
            text = open(os.path.join(clone, path)).read()
            for n, (start, end, arg) in enumerate(calls_of(text)):
                ident = f'N-{os.path.basename(path)[:-3]}-L{line_of(text, start)}n{n}-E'
                old, new = text[start:end], PRIMITIVE_VARIANT(arg)
                restore = with_edit(clone, path, start, end, new)
                try:
                    r = run_tests(clone, tmpdir, tests, keep=None)
                finally:
                    restore()
                killed = r['exit'] != 0 and r['failed'] > 0
                results.append({'id': ident, 'group': 'N', 'class': klass, 'file': path, 'line': line_of(text, start), 'occurrence': n, 'old': old, 'new': new, 'tests': tests, **r,
                                'killed': killed, 'failsOnANumberRow': any(' a number' in t for t in r['failedTests']), 'failsOnAStringRow': any(' a string' in t for t in r['failedTests'])})
    json.dump({'commit': commit, 'controls': controls, 'mutants': results}, open(out_path, 'w'), indent=1)
    killed = sum(1 for r in results if r['killed'] or r.get('killedByRelated'))
    print(f'commit {commit}: {len(results)} mutants, {killed} killed, {len(results) - killed} survived; controls clean: {all(c["passed_clean"] for c in controls)}')
    for r in results:
        if not (r['killed'] or r.get('killedByRelated')):
            print('SURVIVED', r['id'], r['old'][:60])
    return 0


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
