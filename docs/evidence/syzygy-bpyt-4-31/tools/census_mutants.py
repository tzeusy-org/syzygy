#!/usr/bin/env python3
"""Rule-6 mutants of timeout_census.mjs, one per predicate (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/census_mutants.py OUT.json

Each mutant replaces one fragment of the tool (exactly one occurrence) and runs the mutated copy's --selftest; the mutant is
killed when the selftest exits 1 on its own assertions. A mutant whose copy does not parse (a `SyntaxError` in its output) is
an error, never a kill, and fails the suite: a deleted fragment can leave a brace unmatched. The copy is written beside the tool, so it resolves the same `typescript`, and removed after.
The unmutated tool's selftest must pass first. OUT.json records each mutant's old and new fragment, its outcome and the
selftest's output, with the commit and the tool's sha256."""
import hashlib, json, os, subprocess, sys

HERE = os.path.dirname(os.path.abspath(__file__))
TOOL = os.path.join(HERE, 'timeout_census.mjs')
MUTANTS = [
    ('M1', 'modifiers are stripped', "new Set(['skip', 'only', 'concurrent', ", "new Set(['skip', 'only', "),
    ('M2', 'curried forms are unwrapped', "new Set(['each', 'for', 'skipIf', 'runIf', 'extend'])", "new Set(['each', 'for', 'runIf', 'extend'])"),
    ('M3', 'const aliases resolve', "if (root && (ROOTS.has(root) || HOOKS.has(root)) && root !== node.name.text) aliases.set(node.name.text, root);", ''),
    ('M4', 'options-first object', "const t = timeoutProp(args[1]); if (t) { expr = t.initializer; form = 'options-first'; }", ''),
    ('M5', 'options-last object', "const t = timeoutProp(args[2]); if (t) { expr = t.initializer; form = 'options-last'; }", ''),
    ('M6', 'a function third argument is not a timeout', "args.length >= 3 && !ts.isFunctionLike(args[2])", 'args.length >= 3'),
    ('M7', 'hooks', "kind = 'hook'; expr = args[1]; form = 'second-argument';", ''),
    ('M8', 'vi.setConfig', "node.expression.name.text === 'setConfig'", "node.expression.name.text === 'setConfigX'"),
    ('M9', 'config properties', "push(sf, node.initializer, 'config', node.name.text, 'config-property');", ''),
    ('M10', 'population excludes docs/', "(/^(apps|packages)\\//.test(p)", "(/^(apps|packages|docs)\\//.test(p)"),
    ('M11', 'reason on the timeout line', "if (onLine) return { where: `${sf.fileName}:${endLine}`, text: onLine };", ''),
    ('M12', 'reason above a declaration', "if (above) return { where: `${d.sf.fileName}:${dl - 1}`, text: above };", ''),
    ('M13', 'reason above a declaration group', "if (group) return { where: `${d.sf.fileName}:${dl}`, text: group, group: true };", ''),
    ('M14', 'a cited hex run must be a commit', "].filter(isCommit);", '];'),
    ('M15', 'a cited evidence path must exist', ")))].filter((p) => tracked.has(p));", ')))];'),
    ('M16', 'relative imports are followed', "if (other) return declaration(other, (el.propertyName ?? el.name).text, seen);", ''),
    ('M17', 'arithmetic is evaluated', "case ts.SyntaxKind.AsteriskToken: return a * b;", ''),
    ('M18', 'a comment above the call is never a reason', "let reason = reasonFor(sf, expr);", "let reason = reasonFor(sf, expr) ?? (callLine ? { where: 'call', text: commentAbove(sf, callLine) } : null);\n    if (reason && reason.text === null) reason = null;"),
    ('M19', 'second method: the closing regex', "const CLOSE = /\\},\\s*([0-9][0-9_]*|[A-Z][A-Z0-9_]*)\\s*\\)/;", "const CLOSE = /\\},\\s*([0-9][0-9_]*)\\s*\\)/;"),
    ('M20', 'config reason on a group', "else if (group) reason = { where: `${sf.fileName}:${l}`, text: group, group: true };", ''),
    ('M21', 'reason above an own-line timeout', "if (aboveOwnLine) return { where: `${sf.fileName}:${startLine - 1}`, text: aboveOwnLine };", ''),
]

def sha(path): return hashlib.sha256(open(path, 'rb').read()).hexdigest()
def selftest(path):
    done = subprocess.run(['node', path, '--selftest'], capture_output=True, text=True)
    return done.returncode, (done.stdout + done.stderr).strip()

source = open(TOOL, encoding='utf8').read()
code, output = selftest(TOOL)
if code != 0: sys.exit(f'the unmutated selftest fails:\n{output}')
rows = []
for mid, predicate, old, new in MUTANTS:
    if source.count(old) != 1: sys.exit(f'{mid}: the fragment occurs {source.count(old)} times')
    copy = os.path.join(HERE, f'.mutant-{mid}-timeout_census.mjs')
    try:
        open(copy, 'w', encoding='utf8').write(source.replace(old, new))
        code, output = selftest(copy)
    finally:
        os.remove(copy)
    outcome = 'error' if 'SyntaxError' in output else 'killed' if code == 1 else 'survived' if code == 0 else f'exit {code}'
    rows.append({'id': mid, 'predicate': predicate, 'old': old, 'new': new, 'exit': code, 'outcome': outcome, 'killed': outcome == 'killed', 'output': output[:1500]})
    print(f"{mid} {outcome}: {predicate}")
commit = subprocess.run(['git', '-C', HERE, 'rev-parse', 'HEAD'], capture_output=True, text=True).stdout.strip()
out = {'tool': 'census_mutants.py', 'subject': {'path': 'docs/evidence/syzygy-bpyt-4-31/tools/timeout_census.mjs', 'sha256': sha(TOOL), 'commit': commit},
       'unmutatedSelftest': output_unmutated if (output_unmutated := selftest(TOOL)[1]) else None,
       'mutants': len(rows), 'killed': sum(r['killed'] for r in rows), 'rows': rows}
open(sys.argv[1], 'w', encoding='utf8').write(json.dumps(out, indent=1) + '\n')
print(f"{out['killed']} of {out['mutants']} killed")
if out['killed'] != out['mutants']: sys.exit(1)
