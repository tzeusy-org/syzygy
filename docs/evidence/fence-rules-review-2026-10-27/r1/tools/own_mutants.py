#!/usr/bin/env python3
"""Reviewer's own rule-6 mutants for PR 533 (R-GP-IMPL-FENCE-RULES-1).

Usage: own_mutants.py <scratch clone at the reviewed commit, npm ci done> <out.json> [--probe]
Per mutant: restore the file from HEAD, replace `old` by `new` (old must occur exactly once), run the new test
(fence-rules.test.ts) and the reader's existing test files with vitest (source aliases, no build), record each run's exit
code, summary and failed test names; with --probe also rebuild and run fence-probe.mjs against the committed head output.
The file is restored from HEAD after every mutant. TMPDIR is taken from the environment.
"""
import json
import os
import re
import subprocess
import sys

CORE = 'packages/three-surface-poc-core/src/'
APP = 'apps/three-surface-poc/src/'
CONSENT = 'packages/polaris-generation-consent/src/'
NEW = [APP + 'fence-rules.test.ts']
EX = {
    'profile': [CORE + 'markdown-code-context.test.ts', CORE + 'git-object-reader.test.ts'],
    'links': [CORE + 'project-shape-manifest.test.ts'],
    'extraction': [CORE + 'project-shape-extraction.test.ts', CORE + 'project-shape-coverage.test.ts'],
    'renderer': [APP + 'polaris-markdown.test.ts'],
    'consent': [CONSENT + 'package-reader.test.ts', CONSENT + 'act-families.test.ts', CONSENT + 'digest-bound-act.test.ts'],
}
MUTANTS = [
    ('RV1-profile-closer-trailing-text', 'profile', CORE + 'markdown-code-context.ts',
     "const match = /^ {0,3}(`{3,}|~{3,}) *$/.exec(line);", "const match = /^ {0,3}(`{3,}|~{3,}).*$/.exec(line);"),
    ('RV2-links-opener-indent4', 'links', CORE + 'project-shape-manifest.ts',
     "const opener = /^\\s{0,3}(`{3,}|~{3,})/.exec(line);", "const opener = /^\\s{0,4}(`{3,}|~{3,})/.exec(line);"),
    ('RV3-profile-tilde-closed-by-backticks', 'profile', CORE + 'markdown-code-context.ts',
     "return run[0] === char && run.length >= length;", "return run.length >= length;"),
    ('RV4-profile-cr-stripped-before-read', 'profile', CORE + 'markdown-code-context.ts',
     "const lines = text.split('\\n');", "const lines = text.split('\\n').map((l) => (l.endsWith('\\r') ? l.slice(0, -1) : l));"),
    ('RV5-profile-span-closed-by-shorter-run', 'profile', CORE + 'markdown-code-context.ts',
     "} else if (runLength === span.length) {", "} else if (runLength <= span.length) {"),
    ('RV6-extraction-backtick-fences-only', 'extraction', CORE + 'project-shape-extraction.ts',
     "const FENCE = /^(`{3,}|~{3,})/;", "const FENCE = /^(`{3,})/;"),
    ('RV7-renderer-tab-indented-fence-ends-paragraph', 'renderer', APP + 'polaris-markdown.ts',
     "const fenceStart = /^ {0,3}(`{3,}|~{3,})(.*)$/;", "const fenceStart = /^[ \\t]{0,3}(`{3,}|~{3,})(.*)$/;"),
    ('RV8-consent-closer-any-fence-char', 'consent', CONSENT + 'package-reader.ts',
     "if (m !== null && m[1]![0] === open[0] && m[1]!.length >= open.length", "if (m !== null && m[1]!.length >= open.length"),
    ('RV9-links-inline-span-pairs-runs', 'links', CORE + 'project-shape-manifest.ts',
     "line.replace(/`[^`]*`/g, '')", "line.replace(/(`+)[^`]*?\\1/g, '')"),
    ('RV10-profile-closer-tolerates-cr', 'profile', CORE + 'markdown-code-context.ts',
     "const match = /^ {0,3}(`{3,}|~{3,}) *$/.exec(line);", "const match = /^ {0,3}(`{3,}|~{3,})[ \\r]*$/.exec(line);"),
    ('RV11-profile-fence-opener-drops-open-span', 'profile', CORE + 'markdown-code-context.ts',
     "if (opener !== null) {\n      if (span !== undefined) return { kind: 'malformed', reason: 'unclosed-inline-span', line: span.line };",
     "if (opener !== null) {\n      if (span !== undefined) span = undefined;"),
]


def run(cmd, cwd, timeout=1800):
    return subprocess.run(cmd, cwd=cwd, capture_output=True, text=True, timeout=timeout, env=os.environ.copy())


def vitest(clone, files):
    done = run(['npx', 'vitest', 'run', *files], clone)
    text = done.stdout + done.stderr
    summary = [l.strip() for l in text.split('\n') if re.match(r'^\s*(Tests|Test Files)\s', l)]
    failed = sorted(set(re.findall(r'(?:FAIL|×)\s+(.+?)(?:\s+\d+ms)?$', text, re.M)))
    return {'exit': done.returncode, 'killed': done.returncode != 0, 'summary': summary[-2:], 'failed': failed[:12]}


def main():
    clone, out = sys.argv[1:3]
    probe = '--probe' in sys.argv
    head = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    rows = []
    for mid, reader, path, old, new in MUTANTS:
        full = os.path.join(clone, path)
        text = open(full, encoding='utf8').read()
        n = text.count(old)
        row = {'id': mid, 'reader': reader, 'file': path, 'old': old, 'new': new, 'commit': head, 'oldCount': n}
        if n != 1:
            row['error'] = 'old does not occur exactly once'
            rows.append(row)
            continue
        open(full, 'w', encoding='utf8').write(text.replace(old, new))
        try:
            row['newTest'] = vitest(clone, NEW)
            row['existing'] = vitest(clone, EX[reader])
            if probe:
                built = run(['npm', 'run', 'build:poc'], clone)
                if reader == 'consent':
                    run(['npx', 'tsc', '-b', '--force', 'packages/polaris-generation-consent'], clone)
                pout = os.path.join(os.environ.get('TMPDIR', '/tmp'), f'probe-{mid}.json')
                ran = run(['node', 'docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs', '.', pout], clone)
                cmp = run([sys.executable, 'docs/evidence/syzygy-bpyt-6-3/compare-fence-probe.py', 'docs/evidence/syzygy-bpyt-6-3/fence-probe-output.json', pout], clone)
                cj = json.loads(cmp.stdout) if cmp.stdout.strip().startswith('{') else {}
                row['probe'] = {'buildExit': built.returncode, 'probeExit': ran.returncode, 'compareExit': cmp.returncode, 'killed': cmp.returncode != 0,
                                'casesThatDiffer': cj.get('casesThatDiffer'), 'inlineCasesThatDiffer': cj.get('inlineCasesThatDiffer'),
                                'consentFunctionTextDiffers': cj.get('consentFunctionTextDiffers'), 'differing': [d['case'] for d in cj.get('differing', [])][:12]}
                if os.path.exists(pout):
                    os.remove(pout)
        finally:
            run(['git', 'checkout', '--', path], clone)
        killers = [k for k in ('newTest', 'existing', 'probe') if k in row and row[k]['killed']]
        row['verdict'] = 'killed by ' + ', '.join(killers) if killers else 'SURVIVED'
        rows.append(row)
        print(mid, row['verdict'], flush=True)
    if probe:
        run(['npm', 'run', 'build:poc'], clone)
        run(['npx', 'tsc', '-b', '--force', 'packages/polaris-generation-consent'], clone)
    status = run(['git', 'status', '--porcelain'], clone).stdout
    json.dump({'head': head, 'mutants': rows, 'treeCleanAfter': status.strip() == ''}, open(out, 'w'), indent=1)


if __name__ == '__main__':
    main()
