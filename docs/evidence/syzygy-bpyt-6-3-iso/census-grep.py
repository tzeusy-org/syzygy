#!/usr/bin/env python3
"""Method two of the stack-4 census: `git grep` over the same commit, reconciled with census.mjs (method one).

usage: census-grep.py <git repo> <commit> <census.json from census.mjs> <out.json>
       census-grep.py --selftest

Two populations are counted without the syntax tree:
  named  the lines `[export] const|function NAME` for NAME in isObj, isObject, isRecord, isoOf, isIsoDate;
  shape  every line that tests `typeof X === 'object'`, the opening move of every object-shape predicate.
Reconciliation, both ways, with the denominator printed:
  named  the multiset of (file, name) pairs must equal method one's named rows (the two must agree per file, not only in total);
  shape  every grep line is either inside a method-one row's line range or listed as a remainder: an inline test that is not a
         one-parameter function, with its exact line, so the population "object-shape tests" is enumerated and not asserted.
The tool exits 1 when the named multisets differ.
"""
import json
import re
import subprocess
import sys

NAMES = ['isObj', 'isObject', 'isRecord', 'isoOf', 'isIsoDate']
PATHSPEC = ['--', 'packages', 'apps', 'scripts']
EXT = ('.ts', '.mjs', '.cjs')

NAMED_RE = r'^[[:space:]]*(export[[:space:]]+)?(const|function)[[:space:]]+(' + '|'.join(NAMES) + r')\b'
SHAPE_RE = r"typeof[[:space:]]+[A-Za-z_][A-Za-z0-9_]*[[:space:]]*===[[:space:]]*'object'"


def git_grep(repo, commit, pattern):
    out = subprocess.run(
        ['git', '-C', repo, 'grep', '-n', '-I', '-z', '-E', pattern, commit] + PATHSPEC,
        capture_output=True, check=False,
    )
    if out.returncode not in (0, 1):
        raise RuntimeError(out.stderr.decode())
    hits = []
    # -z output: "<commit>:<path>\0<line>\0<text>\n"
    for record in out.stdout.decode('utf8').split('\n'):
        if not record:
            continue
        head, line, text = record.split('\0', 2)
        path = head.split(':', 1)[1]
        if path.endswith(EXT):
            hits.append({'file': path, 'line': int(line), 'text': text})
    return hits


def named_name(text):
    m = re.search(r'(?:const|function)\s+(' + '|'.join(NAMES) + r')\b', text)
    return m.group(1) if m else None


def reconcile(m1_rows, named_hits, shape_hits):
    m1_named = sorted((r['file'], r['name']) for r in m1_rows if 'named' in r['kinds'])
    m2_named = sorted((h['file'], named_name(h['text'])) for h in named_hits)
    ranges = [(r['file'], r['line'], r['endLine']) for r in m1_rows if 'shape' in r['kinds']]
    inside, remainder = [], []
    for h in shape_hits:
        if any(f == h['file'] and a <= h['line'] <= b for f, a, b in ranges):
            inside.append(h)
        else:
            remainder.append(h)
    return {
        'namedMethodOne': len(m1_named),
        'namedMethodTwo': len(m2_named),
        'namedEqualPerFile': m1_named == m2_named,
        'namedOnlyInMethodOne': [list(x) for x in m1_named if x not in m2_named],
        'namedOnlyInMethodTwo': [list(x) for x in m2_named if x not in m1_named],
        'shapeLinesMethodTwo': len(shape_hits),
        'shapeLinesInsideMethodOneRows': len(inside),
        'shapeRemainders': [f"{h['file']}:{h['line']} {h['text'].strip()}" for h in remainder],
    }


def selftest():
    # the named matcher sees the declaration forms and refuses a call, a comment and a longer identifier
    ok = [named_name(t) for t in ['const isObj = (v) => 1;', 'export function isIsoDate(v: string) {', '  function isRecord(v) {']]
    assert ok == ['isObj', 'isIsoDate', 'isRecord'], ok
    for t in ['isObj(x)', '// const isObject', 'const isObjective = 1;', 'const x = isRecord(y);']:
        assert not re.search(NAMED_RE.replace('[[:space:]]', r'\s').replace('^', r'^'), t), t
    # a method-two hit with no method-one row is reported, in both directions
    rows = [{'file': 'a.ts', 'line': 1, 'endLine': 1, 'name': 'isObj', 'kinds': ['named', 'shape']}]
    r = reconcile(rows, [], [{'file': 'a.ts', 'line': 1, 'text': 'x'}])
    assert not r['namedEqualPerFile'] and r['namedOnlyInMethodOne'] == [['a.ts', 'isObj']]
    r = reconcile([], [{'file': 'b.ts', 'line': 3, 'text': 'const isObj = 1'}], [])
    assert not r['namedEqualPerFile'] and r['namedOnlyInMethodTwo'] == [['b.ts', 'isObj']]
    # a shape line outside every row is a remainder, one inside is not
    rows = [{'file': 'a.ts', 'line': 5, 'endLine': 6, 'name': 'f', 'kinds': ['shape']}]
    r = reconcile(rows, [], [{'file': 'a.ts', 'line': 6, 'text': 'in'}, {'file': 'a.ts', 'line': 9, 'text': 'out'}])
    assert r['shapeLinesInsideMethodOneRows'] == 1 and len(r['shapeRemainders']) == 1
    print('census-grep selftest ok')


def main(argv):
    if argv[:1] == ['--selftest']:
        selftest()
        return 0
    repo, commit, census_json, out_path = argv
    rows = json.load(open(census_json))['rows']
    result = reconcile(rows, git_grep(repo, commit, NAMED_RE), git_grep(repo, commit, SHAPE_RE))
    result['commit'] = subprocess.run(['git', '-C', repo, 'rev-parse', commit], capture_output=True, text=True, check=True).stdout.strip()
    json.dump(result, open(out_path, 'w'), indent=1)
    print(json.dumps({k: v for k, v in result.items() if k != 'shapeRemainders'}, indent=1))
    print(f"shape remainders: {len(result['shapeRemainders'])}")
    return 0 if result['namedEqualPerFile'] else 1


if __name__ == '__main__':
    sys.exit(main(sys.argv[1:]))
