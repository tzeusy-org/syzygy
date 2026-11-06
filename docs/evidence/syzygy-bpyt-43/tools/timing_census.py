#!/usr/bin/env python3
r"""Census of timing sites in the vitest test files at one commit (syzygy-bpyt.4.5). Evidence tool, not authority; it reads git objects only.

usage: python3 -I timing_census.py REPO COMMIT OUT.json

Population: every tracked file under apps/ or packages/ whose name ends .test.ts, .test.mts, .test.js or .test.mjs.
Predicates (Python re, per line):
  ELAPSED  a clock reading minus a name, compared by a toBeLessThan/toBeGreaterThan matcher:
           `(Date\.now\(\)|performance\.now\(\))\s*-\s*\w+\)?\s*\)?\s*\.toBe(Less|Greater)Than`.
  CLOCK    any other line matching `Date\.now\(\)|performance\.now\(\)|process\.hrtime`; classed `deadline` when the line
           holds `deadline`, else `now-input` (a clock reading passed as an input).
  RACE     a line holding both `setTimeout(` and `reject` (a wall-clock race against a promise).
  CPU      a line holding `expect(cpuMsSince(` (a CPU-time bound, syzygy-bpyt.4.5).
  TIMEOUT  an explicit timeout: `\},\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)\s*\)` (a test, suite or hook closed with a timeout
           argument; a literal under 100 does not count), `\btimeout\s*:\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)` (an options
           object), or `\b(testTimeout|hookTimeout)\b`. A named-constant argument counts only when the file declares it
           (`const NAME = ...;`) with a value matching `[0-9_]+`, or its name ends _MS, TIMEOUT or BUDGET.
  REASON   for a TIMEOUT line: `//` after the match on the line itself; or, for a named constant, `//` on its declaration
           line, or a line directly above it that starts `//` or ends `*/`.
Second method for ELAPSED (rule 2), independent of the first: every name the file assigns from a clock
(`(\w+)\s*=\s*(?:Date\.now|performance\.now)\(\)`), and every line subtracting one of them (`-\s*NAME\b` or
`\bNAME\s*-`) or subtracting from a clock call inline (`(Date\.now|performance\.now)\(\)\s*-`). Reported as `secondMethod`.
"""
import hashlib, json, os, re, subprocess, sys

repo, commit, out = sys.argv[1:4]
git = lambda *a: subprocess.run(['git', '-C', repo, *a], capture_output=True, check=True).stdout
paths = [p for p in git('ls-tree', '-r', '-z', '--name-only', commit).decode().split('\0')
         if re.match(r'^(apps|packages)/', p) and re.search(r'\.test\.(ts|mts|js|mjs)$', p)]
CLOCK = re.compile(r'Date\.now\(\)|performance\.now\(\)|process\.hrtime')
ELAPSED = re.compile(r'(Date\.now\(\)|performance\.now\(\))\s*-\s*\w+\)?\s*\)?\s*\.toBe(Less|Greater)Than')
CLOSE = re.compile(r'\},\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)\s*\)')
OPT = re.compile(r'\btimeout\s*:\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)')
CONF = re.compile(r'\b(testTimeout|hookTimeout)\b')
rows, files, second = [], {}, []
for path in paths:
    lines = git('show', f'{commit}:{path}').decode('utf8').split('\n')
    names = {m.group(1) for l in lines for m in re.finditer(r'(\w+)\s*=\s*(?:Date\.now|performance\.now)\(\)', l)}
    for i, l in enumerate(lines):
        if any(re.search(r'-\s*' + re.escape(n) + r'\b', l) or re.search(r'\b' + re.escape(n) + r'\s*-', l) for n in names) \
           or re.search(r'(Date\.now|performance\.now)\(\)\s*-', l):
            second.append({'path': path, 'line': i + 1, 'text': l.strip()[:200]})
    decl = {}
    for i, text in enumerate(lines):
        m = re.match(r'\s*(?:export\s+)?const\s+([A-Z][A-Z0-9_]*)\s*=\s*([^;]*);?(.*)$', text)
        if m:
            above = lines[i - 1].strip() if i > 0 else ''
            decl[m.group(1)] = {'line': i + 1, 'value': m.group(2).strip(), 'reason': '//' in m.group(3) or above.startswith('//') or above.endswith('*/')}
    for i, text in enumerate(lines):
        kinds = []
        if ELAPSED.search(text): kinds.append('elapsed')
        elif CLOCK.search(text): kinds.append('clock')
        for rx, kind in ((CLOSE, 'timeout-arg'), (OPT, 'timeout-option')):
            for m in rx.finditer(text):
                arg = m.group(1)
                if arg[0].isalpha() and (arg not in decl or not (re.fullmatch(r'[0-9_]+', decl[arg]['value']) or re.search(r'(_MS|TIMEOUT|BUDGET)$', arg))): continue
                if kind == 'timeout-arg' and not arg[0].isalpha() and int(arg.replace('_', '')) < 100: continue
                reason = '//' in text[m.end():] or (arg in decl and decl[arg]['reason'])
                kinds.append(kind)
                rows.append({'path': path, 'line': i + 1, 'kind': kind, 'arg': arg, 'const': decl.get(arg), 'reason': bool(reason), 'text': text.strip()[:200]})
        if CONF.search(text):
            rows.append({'path': path, 'line': i + 1, 'kind': 'timeout-config', 'arg': None, 'const': None, 'reason': '//' in text, 'text': text.strip()[:200]})
        if kinds and kinds[0] in ('elapsed', 'clock'):
            cls = None if kinds[0] == 'elapsed' else ('deadline' if 'deadline' in text else 'now-input')
            rows.append({'path': path, 'line': i + 1, 'kind': kinds[0], 'class': cls, 'text': text.strip()[:200]})
        if 'setTimeout(' in text and 'reject' in text:
            rows.append({'path': path, 'line': i + 1, 'kind': 'race', 'text': text.strip()[:200]})
        if 'expect(cpuMsSince(' in text:
            rows.append({'path': path, 'line': i + 1, 'kind': 'cpu-bound', 'text': text.strip()[:200]})
summary = {}
for r in rows:
    s = summary.setdefault(r['kind'], {'lines': 0, 'files': set(), 'withReason': 0})
    s['lines'] += 1; s['files'].add(r['path']); s['withReason'] += 1 if r.get('reason') else 0
summary = {k: {'lines': v['lines'], 'files': len(v['files']), 'withReason': v['withReason']} for k, v in summary.items()}
timeout_files = sorted({r['path'] for r in rows if r['kind'].startswith('timeout')})
unreasoned_files = sorted({r['path'] for r in rows if r['kind'].startswith('timeout') and not r['reason']})
json.dump({'tool': {'name': os.path.basename(__file__), 'sha256': hashlib.sha256(open(os.path.abspath(__file__), 'rb').read()).hexdigest()},
           'commit': git('rev-parse', commit).decode().strip(), 'population': len(paths), 'summary': summary,
           'timeoutFiles': len(timeout_files), 'unreasonedTimeoutFiles': unreasoned_files, 'rows': rows, 'secondMethod': second}, open(out, 'w'), indent=1)
print(json.dumps({'population': len(paths), 'summary': summary, 'timeoutFiles': len(timeout_files), 'unreasonedTimeoutFiles': len(unreasoned_files),
                  'secondMethodLines': len(second)}))
