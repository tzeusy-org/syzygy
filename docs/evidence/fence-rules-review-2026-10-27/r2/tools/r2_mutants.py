#!/usr/bin/env python3
"""Reviewer's round-2 mutants for PR 533 (R-GP-IMPL-FENCE-RULES-2).

Usage: r2_mutants.py <scratch clone at 815d93bb, npm ci done> <out.json> [--only id,id]
Per mutant: `old` must occur exactly once in `file` at HEAD; it is replaced by `new` in the working tree (no commit), the named
test files are run with vitest (source aliases, no build) and the JSON reporter, and every failed test is recorded by file and full
name with its first failure message line. The file is restored with `git checkout -- <file>` after every mutant, and the tree is
checked clean at the end. Fixtures are synthetic; nothing outside the clone is read. TMPDIR comes from the environment.
"""
import json
import os
import subprocess
import sys

CORE = 'packages/three-surface-poc-core/src/'
APP = 'apps/three-surface-poc/src/'
CONSENT = 'packages/polaris-generation-consent/src/'
FR = APP + 'fence-rules.test.ts'
PR = CONSENT + 'package-reader.test.ts'
EXTRACT_T = [CORE + 'project-shape-extraction.test.ts', CORE + 'project-shape-coverage.test.ts']
LINKS_T = [CORE + 'project-shape-manifest.test.ts']

# (id, purpose, file, old, new, test files)
MUTANTS = [
    # Fixes, one direction at a time: each should flip the GAP rows of that direction and no other GAP row.
    ('FX1-extraction-indented-closer-closes', 'fix G2 (indent direction only)', CORE + 'project-shape-extraction.ts',
     "if (line.trimEnd() === fence ||", "if (line.replace(/^ {1,3}/, '').trimEnd() === fence ||", [FR, *EXTRACT_T]),
    ('FX2-extraction-tab-line-does-not-close', 'fix G2 (tab direction only)', CORE + 'project-shape-extraction.ts',
     "if (line.trimEnd() === fence || (line.startsWith(fence) && line.trim().replace(/[`~]/g, '') === '')) fence = undefined;",
     "if (line.replace(/ +$/, '') === fence || (line.startsWith(fence) && line.replace(/ +$/, '').replace(/[`~]/g, '') === '')) fence = undefined;",
     [FR, *EXTRACT_T]),
    ('FX3-links-span-across-lines-blanked', 'fix G3 (multi-line span direction only)', CORE + 'project-shape-manifest.ts',
     "    kept.push(stripInlineCode ? line.replace(/`[^`]*`/g, '') : line);\n  }\n  return kept;",
     "    kept.push(line);\n  }\n  if (!stripInlineCode) return kept;\n  return kept.join('\\n').replace(/(?<!`)(`+)(?!`)([\\s\\S]*?[^`])\\1(?!`)/g, (m) => m.replace(/[^\\n]/g, '')).split('\\n');",
     [FR, *LINKS_T]),
    ('FX4-links-closer-needs-only-spaces-after', 'fix G3 (early-close and hide direction only)', CORE + 'project-shape-manifest.ts',
     "(opener[1] ?? '').length >= fence.length) {",
     "(opener[1] ?? '').length >= fence.length && line.trimStart().slice((opener[1] ?? '').length).replace(/ /g, '') === '') {",
     [FR, *LINKS_T]),
    # Worse: a further early close or a further hidden link. Which pin, if any, catches each?
    ('WS1-extraction-backtick-fence-closed-by-tildes', 'worse G2 (a further early close)', CORE + 'project-shape-extraction.ts',
     "(line.startsWith(fence) && line.trim().replace(/[`~]/g, '') === '')",
     "(/^[`~]{3,}/.test(line) && line.trim().replace(/[`~]/g, '') === '')", [FR, *EXTRACT_T]),
    ('WS2-extraction-opener-anywhere-in-line', 'worse G2 (a further hide)', CORE + 'project-shape-extraction.ts',
     "const FENCE = /^(`{3,}|~{3,})/;", "const FENCE = /(`{3,}|~{3,})/;", [FR, *EXTRACT_T]),
    ('WS3-links-closer-any-fence-char', 'worse G3 (a further early close, then a hide)', CORE + 'project-shape-manifest.ts',
     "if (opener !== null && (opener[1] ?? '').startsWith(fence[0] ?? '') && ", "if (opener !== null && ", [FR, *LINKS_T]),
    ('WS4-links-inline-strip-greedy', 'worse G3 (a further hidden link on one line)', CORE + 'project-shape-manifest.ts',
     "line.replace(/`[^`]*`/g, '')", "line.replace(/`.*`/g, '')", [FR, *LINKS_T]),
    ('WS5-links-line-after-a-closer-dropped', 'worse G3 (a further hidden link after a fence)', CORE + 'project-shape-manifest.ts',
     "        fence = undefined;\n      }\n      continue;",
     "        fence = undefined;\n        skip = true;\n      }\n      continue;\n    }\n    if (skip) {\n      skip = false;\n      continue;",
     [FR, *LINKS_T]),
    # Against the new consent pins.
    ('KC1-consent-opener-any-indent', 'consent opener indent', CONSENT + 'package-reader.ts',
     "const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);", "const m = /^ *(`{3,}|~{3,})(.*)$/.exec(line);", [PR]),
    ('KC2-consent-shorter-closer-closes', 'consent closer length, the other direction', CONSENT + 'package-reader.ts',
     "m[1]!.length >= open.length", "m[1]!.length >= 3", [PR]),
    ('KC3-consent-fence-guard-cr-tolerant', 'consent: G4 mechanism closed (the pins say they pin the refusal, not this)', CONSENT + 'package-reader.ts',
     "const unfenced = text.split('\\n').map(line => {\n    const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);",
     "const unfenced = text.split('\\n').map(line => {\n    const m = /^ {0,3}(`{3,}|~{3,})(.*?)\\r?$/.exec(line);", [PR]),
    ('KC4-consent-section-heading-tolerates-cr', 'consent: the third LF-exact check the record names (:153)', CONSENT + 'package-reader.ts',
     "const at = lines.map((line, i) => (line === heading ? i : -1)).filter(i => i >= 0);\n  if (at.length !== 1 || source.split('\\n').filter(line => line === heading).length !== 1) return refuse();",
     "const at = lines.map((line, i) => (line.replace(/\\r$/, '') === heading ? i : -1)).filter(i => i >= 0);\n  if (at.length !== 1 || source.split('\\n').filter(line => line.replace(/\\r$/, '') === heading).length !== 1) return refuse();",
     [PR]),
    # Against the whole-text reading column (N7).
    ('WR1-profile-unclosed-fence-reported-as-span', 'profile malformation reason swapped', CORE + 'markdown-code-context.ts',
     "reason: 'unclosed-fence'", "reason: 'unclosed-inline-span'", [FR]),
]


def run(cmd, cwd, timeout=1800):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=os.environ.copy())


def vitest(clone, files, tag):
    out = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'vitest-{tag}.json')
    done = run(['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={out}', *files], clone)
    res = {'exit': done.returncode, 'killed': done.returncode != 0, 'perFile': {}}
    try:
        data = json.load(open(out))
    except Exception as e:  # no report: the run itself failed
        res['error'] = f'{type(e).__name__}: {e}'
        res['stderrTail'] = (done.stderr or '')[-1500:]
        return res
    res['numTotalTests'] = data.get('numTotalTests')
    res['numFailedTests'] = data.get('numFailedTests')
    for tr in data.get('testResults', []):
        name = os.path.relpath(tr['name'], clone)
        failed = [{'test': a['fullName'], 'message': ((a.get('failureMessages') or [''])[0].split('\n')[0])[:300]}
                  for a in tr.get('assertionResults', []) if a.get('status') == 'failed']
        res['perFile'][name] = {'tests': len(tr.get('assertionResults', [])), 'failed': failed,
                                'fileStatus': tr.get('status'), 'fileMessage': (tr.get('message') or '')[:300]}
    os.remove(out)
    return res


def main():
    clone, out = sys.argv[1:3]
    only = None
    if '--only' in sys.argv:
        only = set(sys.argv[sys.argv.index('--only') + 1].split(','))
    head = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    rows = []
    for mid, purpose, path, old, new, files in MUTANTS:
        if only is not None and mid not in only:
            continue
        full = os.path.join(clone, path)
        text = open(full, encoding='utf8').read()
        n = text.count(old)
        row = {'id': mid, 'purpose': purpose, 'file': path, 'old': old, 'new': new, 'head': head, 'oldCount': n, 'testFiles': files}
        if n != 1:
            row['error'] = 'old does not occur exactly once'
            rows.append(row)
            print(mid, 'ERROR old count', n, flush=True)
            continue
        new_text = text.replace(old, new)
        if mid.startswith('WS5'):  # declare the flag beside `fence`
            decl = 'function stripFences(text: string, stripInlineCode = true): readonly string[] {'
            assert new_text.count(decl) == 1
            new_text = new_text.replace(decl, decl + '\n  let skip = false;')
        open(full, 'w', encoding='utf8').write(new_text)
        try:
            row['run'] = vitest(clone, files, mid)
        finally:
            run(['git', 'checkout', '--', path], clone)
        killers = [f for f, v in row['run'].get('perFile', {}).items() if v['failed'] or v['fileStatus'] == 'failed']
        row['killedBy'] = killers
        row['verdict'] = ('killed by ' + ', '.join(os.path.basename(k) for k in killers)) if killers else ('SURVIVED' if not row['run'].get('error') else 'RUN ERROR')
        rows.append(row)
        print(mid, row['verdict'], [len(v['failed']) for v in row['run'].get('perFile', {}).values()], flush=True)
    status = run(['git', 'status', '--porcelain'], clone).stdout
    json.dump({'head': head, 'mutants': rows, 'treeCleanAfter': status.strip() == ''}, open(out, 'w'), indent=1)


if __name__ == '__main__':
    main()
