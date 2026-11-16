#!/usr/bin/env python3
"""Rule-6 mutants for the round-1 repair of syzygy-bpyt.6.3 stack 2 (review R-GP-IMPL-UTF8-CANONICAL-1): the byte-order-mark predicate at
each decode site, the seed reader's refusal reason, and the code-structure fault arms.

Usage: utf8-repair-mutants.py <scratch clone at the tested commit, built, with node_modules, full history> <tested commit>
                              <expected utf8-probe output (the tracked utf8-probe-output-base.json)> <tmpdir> <out json> [--only id,id] [--full]

For each mutant: reset the clone to the tested commit, replace `old` by `new` in `file` (`old` must occur exactly once), commit it (a scratch
commit in the throwaway clone: it is discarded with the clone and reachable from no ref, so a row stays re-runnable from `old`, `new` and
the tested commit, not from its own `commit`), then run the detectors:
  new     the four test files that carry this repair's new tests, at the tested commit
  prior   the same four files as of the reviewed head 2d3f9375, installed beside them as *-r1.test.ts and run against the mutant; a mutant
          they pass and `new` fails is one the repair kills. (The reviewer's own run of S1, S2, S4 and S9 against the whole suite at
          2d3f9375 found each surviving; `prior` is the four-file version of that, re-run here.)
  full    (with --full) the whole suite, `npx vitest run --testTimeout=60000 --hookTimeout=60000`; the failing tests and the first error
          line of each are stored, so a kill by an assertion can be told from a load timeout
  probe   npm run build:poc, utf8-probe.mjs, compare-utf8-probe.py against the expected output
A mutant no detector kills is SURVIVED. A kill whose only failing tests failed on a timeout is flagged `timeoutOnly`, not counted.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
CORE = 'packages/three-surface-poc-core/src/'
P_CORE = '@syzygy/three-surface-poc-core'
REVIEWED_HEAD = '2d3f93759a28d35e7b04facb5aaebbcc29697d09'
NEW_FILES = [CORE + 'git-object-reader.test.ts', CORE + 'project-shape-observation.test.ts', CORE + 'project-shape-git-text.test.ts', CORE + 'code-structure.test.ts']
KEEP_BOM = "((): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return undefined; } })()"
REPAIRED_TRY = """  try {
    const text = decodeUtf8(withoutGitlinkRecords(bytes));
    if (text !== undefined) return text;
  } catch {
    // falls through to the refusal below
  }
  throw new NonUtf8GitOutput();
}"""
REVIEWED_HEAD_FORM = """  const text = decodeUtf8(withoutGitlinkRecords(bytes));
  if (text === undefined) throw new NonUtf8GitOutput();
  return text;
}"""

# (id, file, old, new, kind)
M = [
    ('S1-object-reader-keeps-bom', CORE + 'git-object-reader.ts', "const text = decodeUtf8(bytes);\n      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });",
     f"const text = {KEEP_BOM};\n      if (text === undefined) return unavailable({{ ...taken, outcome: 'not-utf-8' }});", 'predicate'),
    ('S2-seed-reader-keeps-bom', CORE + 'project-shape-observation.ts', "const text = decodeUtf8(bytes);\n    if (text === undefined) {\n      reads.push(",
     f"const text = {KEEP_BOM};\n    if (text === undefined) {{\n      reads.push(", 'predicate'),
    ('S4-seed-reader-refusal-reason', CORE + 'project-shape-observation.ts', "return { kind: 'unavailable', reason: 'seed is not valid UTF-8' };", "return { kind: 'unavailable', reason: 'seed is not readable' };", 'refusal-string'),
    ('S9-git-text-keeps-bom', CORE + 'project-shape-observation.ts', "const text = decodeUtf8(bytes);\n  return text === undefined ? { kind: 'failed'",
     f"const text = {KEEP_BOM};\n  return text === undefined ? {{ kind: 'failed'", 'predicate'),
    ('S10-code-structure-keeps-bom', CORE + 'code-structure.ts', "    const text = decodeUtf8(withoutGitlinkRecords(bytes));",
     "    const text = ((b: Buffer): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); } catch { return undefined; } })(withoutGitlinkRecords(bytes));", 'predicate'),
    ('F2-gitlink-filter-outside-the-try', CORE + 'code-structure.ts', REPAIRED_TRY, REVIEWED_HEAD_FORM, 'refusal-string'),
    ('C1-code-structure-lets-a-bad-path-through', CORE + 'code-structure.ts', "    if (text !== undefined) return text;", "    return text ?? '';", 'refusal'),
    ('S5-code-structure-generic-error', CORE + 'code-structure.ts', "  throw new NonUtf8GitOutput();\n}", "  throw new Error('not utf-8');\n}", 'refusal-string'),
]


def run(cmd, cwd, env=None, timeout=3600):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def failures(output):
    rows, lines = [], output.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r'^\s*[×✗]\s+(.*?)(?:\s+\d+ms)?$', line)
        if m:
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ''
            rows.append({'test': m.group(1)[:160], 'firstError': nxt[:200]})
    return rows


def vitest(clone, files, env, project=None):
    cmd = ['npx', 'vitest', 'run', '--testTimeout=60000', '--hookTimeout=60000']
    if project is not None:
        cmd += ['--project', project]
    done = run(cmd + list(files), clone, env)
    text = done.stdout + done.stderr
    found = [l.strip() for l in text.splitlines() if re.match(r'^\s*(Tests|Test Files)\s', l)]
    if not any(re.match(r'^\s*Tests\s', l) for l in found):
        return {'killed': False, 'noTestOutput': True, 'detail': text[-300:]}
    failed = failures(text)
    timeout_only = bool(failed) and all(re.search(r'timed out|Timeout', f['firstError'] + f['test']) for f in failed)
    return {'killed': done.returncode != 0 and not timeout_only, 'files': list(files) if files else 'whole suite', 'summary': found[-2:], 'failed': failed, 'failedCount': len(failed), 'timeoutOnly': timeout_only}


def main():
    clone, head, expected, tmpdir, out = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    full = '--full' in sys.argv
    env = {'TMPDIR': tmpdir}
    results = []
    for mid, file, old, new, kind in M:
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
        record = {'id': mid, 'kind': kind, 'file': file, 'old': old, 'new': new, 'commit': commit, 'detectors': {}}
        record['detectors']['new'] = vitest(clone, NEW_FILES, env, P_CORE)
        # the reviewed head's copies of the same four files, installed beside the new ones
        copies = []
        for name in NEW_FILES:
            copy = name.replace('.test.ts', '-r1.test.ts')
            blob = run(['git', 'show', f'{REVIEWED_HEAD}:{name}'], clone).stdout
            open(os.path.join(clone, copy), 'w', encoding='utf-8').write(blob)
            copies.append(copy)
        record['detectors']['prior'] = vitest(clone, copies, env, P_CORE)
        for copy in copies:
            os.remove(os.path.join(clone, copy))
        if full:
            record['detectors']['full'] = vitest(clone, [], env)
        built = run(['npm', 'run', 'build:poc'], clone, env)
        probe_out = os.path.join(tmpdir, f'utf8-repair-{mid}.json')
        if built.returncode != 0:
            record['detectors']['probe'] = {'killed': False, 'buildFailed': True, 'detail': (built.stdout + built.stderr)[-300:]}
        else:
            ran = run(['node', os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/utf8-probe.mjs'), clone, probe_out, '--tmp', tmpdir], clone, env)
            if ran.returncode != 0:
                record['detectors']['probe'] = {'killed': False, 'probeFailed': True, 'detail': (ran.stdout + ran.stderr)[-300:]}
            else:
                cmp = run([sys.executable, os.path.join(HERE, 'compare-utf8-probe.py'), expected, probe_out], clone)
                cj = json.loads(cmp.stdout)
                record['detectors']['probe'] = {'killed': cmp.returncode != 0, 'rowsCompared': cj['rowsCompared'], 'rowsDiffer': cj['rowsDiffer'], 'differPerDriver': cj['differPerDriver'], 'firstDiffering': cj['firstDiffering'][:4]}
        if os.path.exists(probe_out):
            os.remove(probe_out)
        killers = [k for k, v in record['detectors'].items() if v.get('killed')]
        problems = [k for k, v in record['detectors'].items() if v.get('noTestOutput') or v.get('buildFailed') or v.get('probeFailed') or v.get('timeoutOnly')]
        record['verdict'] = ('killed by ' + ', '.join(killers)) if killers else 'SURVIVED'
        tests_kill = any(record['detectors'][k].get('killed') for k in ('new', 'full') if k in record['detectors'])
        prior = record['detectors']['prior']
        if record['detectors']['new'].get('killed') and not prior.get('killed'):
            record['verdict'] += ' (the tests at the reviewed head pass this mutant and the new ones kill it)'
        if not tests_kill and record['detectors']['probe'].get('killed'):
            record['verdict'] += ' (the probe alone, which CI does not run)'
        if problems:
            record['verdict'] += f" (detector problem: {', '.join(problems)})"
        results.append(record)
        print(mid, record['verdict'], flush=True)
        run(['git', 'checkout', '-q', '--detach', head], clone)
    json.dump({'head': head, 'reviewedHead': REVIEWED_HEAD, 'node': run(['node', '--version'], clone).stdout.strip(), 'buildCommand': 'npm run build:poc',
               'expectedProbeOutput': 'docs/evidence/syzygy-bpyt-6-3/utf8-probe-output-base.json', 'fullSuite': full,
               'commitNote': 'each mutant commit is a scratch commit in a throwaway clone, discarded with it and reachable from no ref; re-run a row from old, new and head',
               'mutants': results}, open(out, 'w'), indent=1)
    run(['npm', 'run', 'build:poc'], clone, env)


if __name__ == '__main__':
    main()
