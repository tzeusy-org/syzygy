#!/usr/bin/env python3
"""Rule-6 mutants against docs/evidence/syzygy-bpyt-6-3/line-level-check.mjs (new in the PR 533 round-1 repair).
Usage: r2_tool_mutants.py <clone at 815d93bb, npm ci done> <out.json>
Per mutant: replace `old` (exactly once) in the tool in place, run `--selftest` and the PR range f7477f52..ba7fce36, record exit codes,
the selftest's failing cases and the range's counts, then restore the file with git checkout. Also runs two probe inputs through the
unmutated and mutated check() (a statement reflowed across lines, which is print-equal and not comment-only)."""
import json
import os
import subprocess
import sys

clone, out = os.path.abspath(sys.argv[1]), sys.argv[2]
TOOL = 'docs/evidence/syzygy-bpyt-6-3/line-level-check.mjs'
MUTANTS = [
    ('T0-none', None, None),
    ('T1-lines-equal-count-check-off', 'ok = ok && same;', 'ok = ok;'),
    ('T2-print-predicate-off', 'const printEqual = printed(before, path) === printed(after, path);', 'const printEqual = true;'),
    ('T3-unequal-hunk-accepts-code', 'ok = ok && onlyComment;', 'ok = ok;'),
    ('T4-comment-range-end-inclusive', 'pos <= from + k && from + k < end', 'pos <= from + k && from + k <= end'),
    ('T5-trailing-space-not-trimmed', 'return out.trimEnd();', 'return out;'),
    ('T6-production-filter-drops-apps', "/^(packages|apps)\\/[^/]+\\/src\\/.*\\.ts$/", "/^(packages)\\/[^/]+\\/src\\/.*\\.ts$/"),
]
# Inputs the selftest does not carry. Each is (name, before, after, what a correct comment-only check must say).
BASE = "export function f(a: number, b: number): number {\n  return g(a, b);\n}\nfunction g(a: number, b: number): number { return a + b; }\n"
PROBES = [
    ('statement reflowed across two lines', BASE, BASE.replace('  return g(a, b);', '  return g(a,\n    b);'), False),
    ('code after an inline block comment edited', "const x = 1 /* c */+ 2;\n", "const x = 1 /* c */- 2;\n", False),
]
PROBE_JS = """
import { pathToFileURL } from 'node:url';
const { check } = await import(pathToFileURL(process.argv[2]).href);
const probes = JSON.parse(process.argv[3]);
console.log(JSON.stringify(probes.map(([name, before, after, want]) => { const r = check(before, after); return { name, want, got: r.commentOnly, printEqual: r.printEqual, linesOk: r.linesOk }; })));
"""


def run(cmd, cwd):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=900)


rows = []
tmp = os.environ.get('TMPDIR', '/tmp')
probe_file = os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/zz-probe-check.mjs')
open(probe_file, 'w').write(PROBE_JS)
try:
    for mid, old, new in MUTANTS:
        path = os.path.join(clone, TOOL)
        text = open(path, encoding='utf8').read()
        row = {'id': mid, 'old': old, 'new': new}
        if old is not None:
            row['oldCount'] = text.count(old)
            assert row['oldCount'] == 1, (mid, row['oldCount'])
            open(path, 'w', encoding='utf8').write(text.replace(old, new))
        try:
            st = run(['node', TOOL, '--selftest'], clone)
            sj = json.loads(st.stdout) if st.stdout.strip().startswith('{') else None
            row['selftest'] = {'exit': st.returncode, 'failingCases': [r['name'] for r in sj['selftest'] if not r['ok']] if sj else None}
            rout = os.path.join(tmp, f'll-{mid}.json')
            rg = run(['node', TOOL, '.', 'f7477f52', 'ba7fce36', rout], clone)
            rj = json.load(open(rout)) if os.path.exists(rout) else None
            row['prRange'] = {'exit': rg.returncode, 'stdout': rg.stdout.strip(), 'changedProductionFiles': rj and rj['changedProductionFiles'], 'commentOnly': rj and rj['commentOnly']}
            if os.path.exists(rout):
                os.remove(rout)
            pr = run(['node', probe_file, os.path.join(clone, TOOL), json.dumps(PROBES)], clone)
            row['probes'] = json.loads(pr.stdout) if pr.returncode == 0 else {'error': pr.stderr[-500:]}
        finally:
            run(['git', 'checkout', '--', TOOL], clone)
        row['selftestKills'] = row['selftest']['exit'] != 0
        rows.append(row)
        print(mid, 'selftest exit', row['selftest']['exit'], row['selftest']['failingCases'], '| range', row['prRange']['stdout'], '| probes', [(p['name'][:20], p['got']) for p in row['probes']] if isinstance(row['probes'], list) else row['probes'], flush=True)
finally:
    os.remove(probe_file)
status = run(['git', 'status', '--porcelain'], clone).stdout
json.dump({'tool': TOOL, 'mutants': rows, 'probes': PROBES, 'treeCleanAfter': status.strip() == ''}, open(out, 'w'), indent=1)
