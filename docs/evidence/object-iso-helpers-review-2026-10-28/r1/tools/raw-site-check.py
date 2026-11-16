#!/usr/bin/env python3
"""Independent raw-source check of the stack-4 call-site edit (R-GP-IMPL-OBJECT-ISO-HELPERS-1).

Usage: python3 -I raw-site-check.py <repo> <base> <head> <out.json>

For every modified production .ts file under packages/*/src or apps/*/src it compares the RAW source text (comments, blank lines,
types and template-literal bytes included; no transpile, no blank-line drop) of
    T(base) = base with the exact censused definition lines deleted, isObj/isObject renamed to isRecord, the support import's
              isRecord name removed
    N(head) = head with the support import's isRecord name removed and the added isoOf / isRecord import lines dropped
and lists every residual line-level difference verbatim. A residual is classed 'blank-beside-definition' only when it is a deletion of
whitespace-only base lines immediately adjacent (in the base) to a deleted definition; anything else is 'other' and fails.
"""
import difflib, json, re, subprocess, sys

DEF_LINES = {
    "const isObj = (value: unknown): value is Readonly<Record<string, unknown>> => value !== null && typeof value === 'object' && !Array.isArray(value);",
    "const isObject = (value: unknown): value is Readonly<Record<string, unknown>> => value !== null && typeof value === 'object' && !Array.isArray(value);",
    "const isObject = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);",
    "const isRecord = (value: unknown): value is Record<string, unknown> => value !== null && typeof value === 'object' && !Array.isArray(value);",
    "const isObject = (value: unknown): value is Fields => value !== null && typeof value === 'object' && !Array.isArray(value);",
    "const isoOf = (instant: number): string => new Date(instant).toISOString();",
}
DEF_BLOCK = [
    "function isRecord(value: unknown): value is Record<string, unknown> {",
    "  return typeof value === 'object' && value !== null && !Array.isArray(value);",
    "}",
]
SUPPORT = re.compile(r"^import \{ ([^}]*) \} from '@syzygy/support';$")
RENAME = re.compile(r"\bisObj(?:ect)?\b")


def git(repo, *args):
    return subprocess.run(['git', '-C', repo, *args], check=True, capture_output=True).stdout


def norm_import(line):
    m = SUPPORT.match(line)
    if not m:
        return line
    kept = [n.strip() for n in m.group(1).split(',') if n.strip() != 'isRecord']
    return None if not kept else "import { %s } from '@syzygy/support';" % ', '.join(kept)


def transform_base(lines):
    out, deleted_at, renames = [], [], 0
    i = 0
    while i < len(lines):
        if lines[i:i + 3] == DEF_BLOCK:
            deleted_at.extend(range(i, i + 3)); i += 3; continue
        if lines[i] in DEF_LINES:
            deleted_at.append(i); i += 1; continue
        line, n = RENAME.subn('isRecord', lines[i])
        renames += n
        line = norm_import(line)
        if line is not None:
            out.append((i, line))
        i += 1
    return out, deleted_at, renames


def transform_head(lines):
    out = []
    for i, line in enumerate(lines):
        if line in ("import { isoOf } from './iso-of.js';", "import { isRecord } from '@syzygy/support';"):
            continue
        line = norm_import(line)
        if line is not None:
            out.append((i, line))
    return out


def main():
    repo, base, head, out_path = sys.argv[1:5]
    rows = git(repo, 'diff', '--name-status', '-z', base, head).decode().split('\0')
    pairs = [(rows[k], rows[k + 1]) for k in range(0, len(rows) - 1, 2)]
    files = [p for s, p in pairs if s == 'M' and re.match(r'^(packages|apps)/[^/]+/src/.*\.ts$', p) and not p.endswith('.test.ts')]
    report, failures = [], 0
    for path in files:
        b = git(repo, 'show', f'{base}:{path}').decode().split('\n')
        h = git(repo, 'show', f'{head}:{path}').decode().split('\n')
        tb, deleted_at, renames = transform_base(b)
        th = transform_head(h)
        sm = difflib.SequenceMatcher(a=[x for _, x in tb], b=[x for _, x in th], autojunk=False)
        residuals = []
        deleted = set(deleted_at)
        for tag, i1, i2, j1, j2 in sm.get_opcodes():
            if tag == 'equal':
                continue
            base_lines = [(tb[k][0] + 1, tb[k][1]) for k in range(i1, i2)]
            head_lines = [(th[k][0] + 1, th[k][1]) for k in range(j1, j2)]
            klass = 'other'
            if tag == 'delete' and all(t.strip() == '' for _, t in base_lines):
                # every deleted blank base line must touch a deleted definition, directly or through other deleted blank lines
                idx = [n - 1 for n, _ in base_lines]
                lo, hi = min(idx), max(idx)
                if (lo - 1) in deleted or (hi + 1) in deleted:
                    klass = 'blank-beside-definition'
            if klass == 'other':
                failures += 1
            residuals.append({'tag': tag, 'class': klass, 'base': base_lines, 'head': head_lines})
        report.append({'path': path, 'baseLines': len(b), 'headLines': len(h), 'definitionLinesDeleted': len(deleted_at),
                       'renamedOccurrences': renames, 'residuals': residuals,
                       'ok': all(r['class'] != 'other' for r in residuals)})
    result = {'base': git(repo, 'rev-parse', base).decode().strip(), 'head': git(repo, 'rev-parse', head).decode().strip(),
              'files': len(files), 'ok': sum(r['ok'] for r in report), 'otherResiduals': failures, 'rows': report}
    with open(out_path, 'w') as f:
        json.dump(result, f, indent=1)
        f.write('\n')
    print(json.dumps({k: v for k, v in result.items() if k != 'rows'}))
    for r in report:
        print(r['path'], 'defs', r['definitionLinesDeleted'], 'renames', r['renamedOccurrences'],
              'residuals', [(x['class'], x['base'], x['head']) for x in r['residuals']])
    sys.exit(1 if failures else 0)


if __name__ == '__main__':
    main()
