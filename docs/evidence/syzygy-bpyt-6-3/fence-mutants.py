#!/usr/bin/env python3
"""Rule-6 mutants for the fence-rule checks of syzygy-bpyt.6.3 stack 3: does each check fail when the rule it pins changes?

Usage: fence-mutants.py <scratch clone at the head commit, built, with node_modules, full history> <head commit>
                        <expected fence-probe output (the tracked docs/evidence/syzygy-bpyt-6-3/fence-probe-output.json)>
                        <tmpdir> <out json> [--only id,id]

For each mutant: reset the clone to the head commit, replace `old` by `new` in `file` (`old` must occur exactly once), commit it
(a scratch commit in the throwaway clone: it is discarded with the clone and reachable from no ref, so the row stays re-runnable from
`old`/`new` and the head commit, not from its own `commit`), then run the detectors:
  test        apps/three-surface-poc/src/fence-rules.test.ts (the characterization test); a failing exit is a kill. Every failed test is
              stored with its first error line, so an assertion can be told from a load timeout.
  newRows     the rows added after the first review round: the tests named GAP G2 and GAP G3 and the renderer tab pin, of the same file.
  consentNew  for a consent mutant, the describe 'fence reading of the act records' of package-reader.test.ts (the public-reader pins).
  probe       rebuild (npm run build:poc), run fence-probe.mjs, compare with the expected output through compare-fence-probe.py. A kill
              by an inline-span row alone shows as inlineCasesThatDiffer with casesThatDiffer 0.
  existing    the test files nearest the rule, which were there before this change (for package-reader.test.ts, every test but the
              describe above). What the new checks add is the difference.
  prior       a mutant marked `prior`: the same test files as of the reviewed head 9d9c98a6 (fence-rules.test.ts; package-reader.test.ts
              for a consent mutant), run against the mutant. A mutant they pass and a new test fails is one the repair kills.
A mutant no detector kills is SURVIVED. PR5 and the other mutants marked `closes-a-gap` change a rule the way the recorded gaps
would be closed: they are expected to fail the pins, because the pins document the gap.
"""
import hashlib
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = 'packages/three-surface-poc-core/src/'
APP = 'apps/three-surface-poc/src/'
CONSENT = 'packages/polaris-generation-consent/src/'
P_CORE, P_APP, P_CONSENT = '@syzygy/three-surface-poc-core', '@syzygy/three-surface-poc-app', '@syzygy/polaris-generation-consent'

REVIEWED_HEAD = '9d9c98a6f265393fcb46dae6e1484eea097aad20'
NEW_ROWS = 'GAP G2|GAP G3|indented with a tab'
NEW_CONSENT = 'fence reading of the act records'
# (id, file, old, new, existing-test project, existing test files, kind[, prior])
MUTANTS = [
    ('PR1-profile-opener-indent4', CORE + 'markdown-code-context.ts', "const FENCE_OPENER = /^ {0,3}(", "const FENCE_OPENER = /^ {0,4}(", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'rule'),
    ('PR2-profile-closer-any-whitespace', CORE + 'markdown-code-context.ts', "(`{3,}|~{3,}) *$/.exec(line)", "(`{3,}|~{3,})\\s*$/.exec(line)", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'rule'),
    ('PR3-profile-closer-strictly-longer', CORE + 'markdown-code-context.ts', "run.length >= length", "run.length > length", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'rule'),
    ('PR4-profile-backtick-info-allowed', CORE + 'markdown-code-context.ts', "if (run[0] === '`' && info.includes('`')) {", "if (false) {", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'rule'),
    ('PR5-profile-opener-tolerates-CR', CORE + 'markdown-code-context.ts', "const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})(.*)$/;", "const FENCE_OPENER = /^ {0,3}(`{3,}|~{3,})([^\\n]*)$/;", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'closes-a-gap'),
    ('L1-links-opener-spaces-only', CORE + 'project-shape-manifest.ts', "/^\\s{0,3}(`{3,}|~{3,})/.exec(line)", "/^ {0,3}(`{3,}|~{3,})/.exec(line)", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'rule'),
    ('L2-links-closer-any-length', CORE + 'project-shape-manifest.ts', " && (opener[1] ?? '').length >= fence.length", "", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'rule'),
    ('L3-links-closer-any-fence-char', CORE + 'project-shape-manifest.ts', ".startsWith(fence[0] ?? '')", ".startsWith('`')", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'rule'),
    ('L4-links-inline-span-needs-content', CORE + 'project-shape-manifest.ts', "line.replace(/`[^`]*`/g, '')", "line.replace(/`[^`]+`/g, '')", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'closes-a-gap'),
    ('E1-extraction-opener-indent3', CORE + 'project-shape-extraction.ts', "const FENCE = /^(`{3,}|~{3,})/;", "const FENCE = /^ {0,3}(`{3,}|~{3,})/;", P_CORE, [CORE + 'project-shape-extraction.test.ts'], 'closes-a-gap'),
    ('E2-extraction-closer-trim-both-sides', CORE + 'project-shape-extraction.ts', "line.trimEnd() === fence", "line.trim() === fence", P_CORE, [CORE + 'project-shape-extraction.test.ts'], 'closes-a-gap'),
    ('E3-extraction-closer-any-text', CORE + 'project-shape-extraction.ts', "(line.startsWith(fence) && line.trim().replace(/[`~]/g, '') === '')", "line.startsWith(fence)", P_CORE, [CORE + 'project-shape-extraction.test.ts'], 'rule'),
    ('R1-renderer-opener-indent4', APP + 'polaris-markdown.ts', "const fenceStart = /^ {0,3}(", "const fenceStart = /^ {0,4}(", P_APP, [APP + 'polaris-markdown.test.ts'], 'rule'),
    ('R2-renderer-closer-longer-than-opener', APP + 'polaris-markdown.ts', "${marker[0]}{${marker.length},}", "${marker[0]}{${marker.length + 1},}", P_APP, [APP + 'polaris-markdown.test.ts'], 'rule'),
    ('R3-renderer-heading-depth-closer-longer', APP + 'polaris-markdown.ts', "${fence.marker}{${fence.length},}", "${fence.marker}{${fence.length + 1},}", P_APP, [APP + 'polaris-markdown.test.ts'], 'rule'),
    ('K1-consent-opener-indent4', CONSENT + 'package-reader.ts', "const m = /^ {0,3}(`{3,}|~{3,})(.*)$/.exec(line);", "const m = /^ {0,4}(`{3,}|~{3,})(.*)$/.exec(line);", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'rule'),
    ('K2-consent-closer-strictly-longer', CONSENT + 'package-reader.ts', "m[1]!.length >= open.length", "m[1]!.length > open.length", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'rule'),
    ('K3-consent-closer-any-text', CONSENT + 'package-reader.ts', "&& m[2]!.trim() === '') open = null;", ") open = null;", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'rule'),
    ('K4-consent-backtick-info-opens', CONSENT + 'package-reader.ts', "!(m[1]![0] === '`' && m[2]!.includes('`'))", "true", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'rule'),
    # Added in the round-1 repair. RV7 and RV11 are the reviewer's (R-GP-IMPL-FENCE-RULES-1 N7); each survived the test at 9d9c98a6.
    ('RV7-renderer-tab-indented-fence-ends-paragraph', APP + 'polaris-markdown.ts', "const fenceStart = /^ {0,3}(`{3,}|~{3,})(.*)$/;", "const fenceStart = /^[ \\t]{0,3}(`{3,}|~{3,})(.*)$/;", P_APP, [APP + 'polaris-markdown.test.ts'], 'rule'),
    ('RV11-profile-fence-opener-drops-open-span', CORE + 'markdown-code-context.ts', "if (opener !== null) {\n      if (span !== undefined) return { kind: 'malformed', reason: 'unclosed-inline-span', line: span.line };", "if (opener !== null) {\n      if (span !== undefined) span = undefined;", P_CORE, [CORE + 'markdown-code-context.test.ts'], 'rule'),
    # The three that close the new GAP rows the way an owner ruling would: the extractor takes the profile's closer; the link reader takes
    # the profile's closer; the link reader strips a span across lines.
    ('E4-extraction-closer-is-the-profile-closer', CORE + 'project-shape-extraction.ts', "if (line.trimEnd() === fence || (line.startsWith(fence) && line.trim().replace(/[`~]/g, '') === '')) fence = undefined;", "if (/^ {0,3}(`{3,}|~{3,}) *$/.test(line) && line.trim()[0] === fence[0] && line.trim().length >= fence.length) fence = undefined;", P_CORE, [CORE + 'project-shape-extraction.test.ts'], 'closes-a-gap'),
    ('L5-links-closer-is-the-profile-closer', CORE + 'project-shape-manifest.ts', ".length >= fence.length) {", ".length >= fence.length && /^ {0,3}(`{3,}|~{3,}) *$/.test(line)) {", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'closes-a-gap'),
    ('L6-links-strip-spans-across-lines', CORE + 'project-shape-manifest.ts', "    kept.push(stripInlineCode ? line.replace(/`[^`]*`/g, '') : line);\n  }\n  return kept;", "    kept.push(line);\n  }\n  return stripInlineCode ? kept.join('\\n').replace(/(`+)[\\s\\S]*?\\1/g, '').split('\\n') : kept;", P_CORE, [CORE + 'project-shape-manifest.test.ts'], 'closes-a-gap'),
    # The two CRLF refusals of package-reader.test.ts: a title check, then a table check, that tolerate CR.
    ('N1a-consent-act-title-check-tolerates-crlf', CONSENT + 'package-reader.ts', "if (!text.startsWith(`${form.title}\\n`)) refuse();", "if (!text.startsWith(form.title)) refuse();", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'closes-a-gap'),
    ('N1b-consent-instance-table-check-tolerates-crlf', CONSENT + 'package-reader.ts', "const lines = outsideFences(text).split('\\n'), head = lines.indexOf('| Label | Commit object id |');", "const lines = outsideFences(text).replace(/\\r/g, '').split('\\n'), head = lines.indexOf('| Label | Commit object id |');", P_CONSENT, [CONSENT + 'package-reader.test.ts'], 'closes-a-gap'),
]
PRIOR = {'RV7-renderer-tab-indented-fence-ends-paragraph', 'RV11-profile-fence-opener-drops-open-span', 'E4-extraction-closer-is-the-profile-closer', 'L5-links-closer-is-the-profile-closer',
         'L6-links-strip-spans-across-lines', 'K1-consent-opener-indent4', 'K2-consent-closer-strictly-longer', 'N1a-consent-act-title-check-tolerates-crlf', 'N1b-consent-instance-table-check-tolerates-crlf'}


def run(cmd, cwd, env=None, timeout=1800):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def failures(output):
    """The first error line of each failed test: a vitest line `× name` followed by `→ message`."""
    rows, lines = [], output.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r'^\s*[×✗]\s+(.*?)(?:\s+\d+ms)?$', line)
        if m:
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ''
            rows.append({'test': m.group(1)[:140], 'firstError': nxt[:200]})
    return rows


def vitest(clone, project, files, env, name=None):
    """Run the files in the project, optionally only the tests whose full name matches the regex `name`. A run that selected no test, or
    printed no summary, is an error and never a kill or a survival."""
    done = run(['npx', 'vitest', 'run', '--project', project, *files, *(['-t', name] if name else [])], clone, env)
    text = done.stdout + done.stderr
    tail = [l.strip() for l in text.splitlines() if re.match(r'^\s*(Tests|Test Files)\s', l)]
    if not any(re.match(r'^Tests\s', l) for l in tail):
        raise SystemExit(f'no test summary for {files} {name}: ' + text[-300:])
    return {'killed': done.returncode != 0, 'project': project, 'files': files, 'select': name, 'summary': tail[-2:], 'failed': failures(text), 'failedCount': len(failures(text))}


def prior_copy(clone, path, copy):
    """The file as of the reviewed head, written beside the current one under another name (untracked: the mutant commit leaves it)."""
    blob = run(['git', 'show', f'{REVIEWED_HEAD}:{path}'], clone)
    if blob.returncode != 0:
        raise SystemExit(f'git show {REVIEWED_HEAD}:{path} failed: {blob.stderr[-200:]}')
    open(os.path.join(clone, copy), 'w', encoding='utf-8').write(blob.stdout)
    return copy


def main():
    clone, head, expected, tmpdir, out = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    env = {'TMPDIR': tmpdir}
    expected_sha = hashlib.sha256(open(expected, 'rb').read()).hexdigest()
    results = []
    for mid, file, old, new, project, existing, kind in MUTANTS:
        if only and mid not in only:
            continue
        run(['git', 'checkout', '-q', '--detach', head], clone)
        run(['git', 'clean', '-fdq', '--', 'packages', 'apps'], clone)
        path = os.path.join(clone, file)
        text = open(path, encoding='utf-8').read()
        if text.count(old) != 1:
            results.append({'id': mid, 'error': f'old fragment occurs {text.count(old)} times in {file}'})
            continue
        open(path, 'w', encoding='utf-8').write(text.replace(old, new))
        run(['git', 'commit', '-qa', '-m', f'mutant {mid}'], clone)
        commit = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
        consent = file.startswith(CONSENT)
        record = {'id': mid, 'kind': kind, 'file': file, 'old': old, 'new': new, 'commit': commit, 'detectors': {}}

        record['detectors']['test'] = vitest(clone, P_APP, [APP + 'fence-rules.test.ts'], env)
        if consent:
            record['detectors']['consentNew'] = vitest(clone, P_CONSENT, [CONSENT + 'package-reader.test.ts'], env, NEW_CONSENT)
        else:
            record['detectors']['newRows'] = vitest(clone, P_APP, [APP + 'fence-rules.test.ts'], env, NEW_ROWS)

        built = run(['npm', 'run', 'build:poc'], clone, env)
        probe_out = os.path.join(tmpdir, f'fence-{mid}.json')
        ran = run(['node', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/fence-probe.mjs'), clone, probe_out], clone, env) if built.returncode == 0 else None
        if ran is None or ran.returncode != 0:
            record['detectors']['probe'] = {'killed': True, 'how': 'build or probe failed', 'detail': ((built.stdout + built.stderr) if ran is None else (ran.stdout + ran.stderr))[-300:]}
        else:
            cmp = run([sys.executable, os.path.join(HERE, 'compare-fence-probe.py'), expected, probe_out], clone)
            cj = json.loads(cmp.stdout)
            record['detectors']['probe'] = {'killed': cmp.returncode != 0, 'casesThatDiffer': cj['casesThatDiffer'], 'casesCompared': cj['casesCompared'], 'inlineCasesThatDiffer': cj['inlineCasesThatDiffer'],
                                            'consentFunctionTextDiffers': cj['consentFunctionTextDiffers'], 'firstDifferingCases': [d['case'] for d in cj['differing'][:5]]}
        if os.path.exists(probe_out):
            os.remove(probe_out)

        # the tests that were there before this change; in package-reader.test.ts, every test but the new describe
        record['detectors']['existing'] = vitest(clone, project, existing, env, '^(?!fence reading of the act records)' if consent else None)

        if mid in PRIOR:
            copy = prior_copy(clone, CONSENT + 'package-reader.test.ts', CONSENT + 'package-reader-r1.test.ts') if consent else prior_copy(clone, APP + 'fence-rules.test.ts', APP + 'fence-rules-r1.test.ts')
            record['detectors']['prior'] = vitest(clone, P_CONSENT if consent else P_APP, [copy], env)
            os.remove(os.path.join(clone, copy))

        d = record['detectors']
        killers = [k for k, v in d.items() if v['killed']]
        record['verdict'] = 'killed by ' + ', '.join(killers) if killers else 'SURVIVED'
        if 'prior' in d:
            new_killers = [k for k in ('test', 'newRows', 'consentNew') if k in d and d[k]['killed']]
            record['repairEffect'] = ('the tests at the reviewed head pass this mutant and ' + ', '.join(new_killers) + ' kill it') if (new_killers and not d['prior']['killed']) else \
                ('killed by the tests at the reviewed head too' if d['prior']['killed'] else 'passes the tests at the reviewed head and the new tests')
        results.append(record)
        print(mid, record['verdict'], record.get('repairEffect', ''), flush=True)
        run(['git', 'checkout', '-q', '--detach', head], clone)
    run(['git', 'checkout', '-q', '--detach', head], clone)
    run(['npm', 'run', 'build:poc'], clone, env)
    json.dump({'head': head, 'reviewedHead': REVIEWED_HEAD, 'node': run(['node', '-v'], clone).stdout.strip(), 'buildCommand': 'npm run build:poc',
               'expectedProbeOutput': 'docs/evidence/syzygy-bpyt-6-3/fence-probe-output.json', 'expectedProbeOutputSha256': expected_sha,
               'commitNote': 'each mutant commit is a scratch commit in a throwaway clone, discarded with it and reachable from no ref; re-run a row from old, new and head', 'mutants': results}, open(out, 'w'), indent=1)


if __name__ == '__main__':
    main()
