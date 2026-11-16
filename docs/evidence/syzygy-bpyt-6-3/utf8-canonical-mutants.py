#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.6.3 stack 2: does each check fail when the predicate it pins changes?

Usage: utf8-canonical-mutants.py <scratch clone at the head commit, built, with node_modules> <head commit> <expected utf8-probe output>
                                 <tmpdir> <out json> [--only id,id]

For each mutant: reset the clone to the head commit, replace `old` by `new` in `file` (`old` must occur exactly once), commit it, then run
  test      the tests this change added for that predicate
  existing  the test files nearest the predicate that were there before this change
  probe     (decoder mutants only) rebuild with `npm run build:poc`, run utf8-probe.mjs, compare with the expected output
            through compare-utf8-probe.py. A build that fails counts as a kill only when the mutant is type-correct on its face; every
            decoder mutant here is written to type-check, so a failed build is reported as `build-failed`, not as a kill.
A mutant no detector kills is SURVIVED. Each failed test is stored with its first error line.
"""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
SUP = 'packages/support/src/'
CORE = 'packages/three-surface-poc-core/src/'
GEN = 'packages/polaris-generation-core/src/'
APP = 'apps/three-surface-poc/src/'
P_SUP, P_CORE, P_GEN, P_APP = '@syzygy/support', '@syzygy/three-surface-poc-core', '@syzygy/polaris-generation-core', '@syzygy/three-surface-poc-app'
LENIENT = 'new TextDecoder().decode(bytes)'

# (id, file, old, new, new tests [(project, files)], existing tests [(project, files)], probe)
M = [
    ('D1-decoder-not-fatal', SUP + 'decode-utf8.ts', "{ fatal: true }", "{ fatal: false }", [(P_SUP, [SUP + 'decode-utf8.test.ts'])], [], True),
    ('D2-decoder-keeps-bom', SUP + 'decode-utf8.ts', "{ fatal: true }", "{ fatal: true, ignoreBOM: true }", [(P_SUP, [SUP + 'decode-utf8.test.ts']), (P_CORE, [CORE + 'authority-artifact-fields.test.ts'])], [], True),
    ('D3-refusal-returns-empty-text', SUP + 'decode-utf8.ts', "return undefined;", "return '';", [(P_SUP, [SUP + 'decode-utf8.test.ts'])], [], True),
    ('D4-decoder-streams', SUP + 'decode-utf8.ts', "STRICT_UTF8.decode(bytes)", "STRICT_UTF8.decode(bytes, { stream: true })", [(P_SUP, [SUP + 'decode-utf8.test.ts'])], [], True),
    ('G1-object-reader-decodes-leniently', CORE + 'git-object-reader.ts', "const text = decodeUtf8(bytes);\n      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });",
     "const text: string | undefined = " + LENIENT + ";\n      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });", [], [(P_CORE, [CORE + 'git-object-reader.test.ts'])], True),
    ('O1-seed-reader-decodes-leniently', CORE + 'project-shape-observation.ts', "const text = decodeUtf8(bytes);\n    if (text === undefined) {\n      reads.push(",
     "const text: string | undefined = " + LENIENT + ";\n    if (text === undefined) {\n      reads.push(", [], [(P_CORE, [CORE + 'project-shape-observation.test.ts'])], True),
    ('O2-git-text-decodes-leniently', CORE + 'project-shape-observation.ts', "const text = decodeUtf8(bytes);\n  return text === undefined ? { kind: 'failed'",
     "const text: string | undefined = " + LENIENT + ";\n  return text === undefined ? { kind: 'failed'", [(P_CORE, [CORE + 'project-shape-git-text.test.ts'])], [(P_CORE, [CORE + 'project-shape-observation.test.ts'])], True),
    ('A1-consent-decodes-leniently', CORE + 'authority-artifact-fields.ts', "const text = decodeUtf8(bytes);\n  if (text === undefined) return { kind: 'undecodable', detail: 'not strict UTF-8' };",
     "const text: string | undefined = " + LENIENT + ";\n  if (text === undefined) return { kind: 'undecodable', detail: 'not strict UTF-8' };", [(P_CORE, [CORE + 'authority-artifact-fields.test.ts'])], [], True),
    ('A2-json-artifact-decodes-leniently', CORE + 'authority-artifact-fields.ts', "const text = decodeUtf8(bytes);\n  if (text === undefined) return { ok: false, detail: 'not strict UTF-8' };",
     "const text: string | undefined = " + LENIENT + ";\n  if (text === undefined) return { ok: false, detail: 'not strict UTF-8' };", [(P_CORE, [CORE + 'authority-artifact-fields.test.ts'])], [], True),
    ('C1-code-structure-lets-bad-path-through', CORE + 'code-structure.ts', "if (text === undefined) throw new NonUtf8GitOutput();", "if (text === undefined) return '';", [], [(P_CORE, [CORE + 'code-structure.test.ts'])], True),
    ('K1-lenient-keys-unsorted', CORE + 'project-shape-manifest.ts', "        .sort()\n        .map((key) => [key, canonicalize(record[key])]),", "        .map((key) => [key, canonicalize(record[key])]),",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_CORE, [CORE + 'project-shape-manifest.test.ts', CORE + 'response-identity.test.ts'])], False),
    ('K2-lenient-arrays-as-objects', CORE + 'project-shape-manifest.ts', "  if (Array.isArray(value)) return value.map(canonicalize);\n", "",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_CORE, [CORE + 'project-shape-manifest.test.ts', CORE + 'response-identity.test.ts'])], False),
    ('K3-strict-keys-unsorted', GEN + 'canonical-json.ts', "const sorted = (keys as string[]).sort();", "const sorted = (keys as string[]);",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_GEN, [GEN + 'canonical-json.test.ts'])], False),
    ('K4-strict-accepts-non-finite', GEN + 'canonical-json.ts', "if (!Number.isFinite(item)) reject('unsupported-value');", "",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_GEN, [GEN + 'canonical-json.test.ts'])], False),
    ('K5-strict-accepts-non-plain-objects', GEN + 'canonical-json.ts', "if (array ? prototype !== Array.prototype : prototype !== Object.prototype && prototype !== null) {", "if (false) {",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_GEN, [GEN + 'canonical-json.test.ts'])], False),
    ('K6-strict-accepts-proto-key', GEN + 'canonical-json.ts', "['__proto__', 'prototype', 'constructor'].includes(key)", "['prototype', 'constructor'].includes(key)",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_GEN, [GEN + 'canonical-json.test.ts'])], False),
    ('K7-strict-accepts-accessors', GEN + 'canonical-json.ts', "if (!('value' in property) || !property.enumerable) reject('unsupported-property');", "",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_GEN, [GEN + 'canonical-json.test.ts'])], False),
    ('K8-lenient-reads-dates', CORE + 'project-shape-manifest.ts', "if (value !== null && typeof value === 'object') {\n    const record", "if (value !== null && typeof value === 'object' && !(value instanceof Date)) {\n    const record",
     [(P_APP, [APP + 'canonical-json-divergence.test.ts'])], [(P_CORE, [CORE + 'project-shape-manifest.test.ts', CORE + 'response-identity.test.ts'])], False),
]


def run(cmd, cwd, env=None, timeout=1800):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def failures(output):
    rows, lines = [], output.splitlines()
    for i, line in enumerate(lines):
        m = re.match(r'^\s*[×✗]\s+(.*?)(?:\s+\d+ms)?$', line)
        if m:
            nxt = lines[i + 1].strip() if i + 1 < len(lines) else ''
            rows.append({'test': m.group(1)[:140], 'firstError': nxt[:200]})
    return rows


def vitest(clone, groups, env):
    killed, summaries, failed = False, [], []
    for project, files in groups:
        done = run(['npx', 'vitest', 'run', '--testTimeout=60000', '--hookTimeout=60000', '--project', project, *files], clone, env)
        text = done.stdout + done.stderr
        found = [l.strip() for l in text.splitlines() if re.match(r'^\s*(Tests|Test Files)\s', l)]
        ran = any(re.match(r'^\s*Tests\s', l) for l in found)
        killed = killed or done.returncode != 0
        summaries += found[-2:]
        failed += failures(text)
        if not ran:
            return {'killed': False, 'noTestOutput': True, 'project': project, 'files': files, 'detail': text[-300:]}
    return {'killed': killed, 'files': [f for _, fs in groups for f in fs], 'summary': summaries, 'failed': failed[:6], 'failedCount': len(failed)}


def main():
    clone, head, expected, tmpdir, out = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    env = {'TMPDIR': tmpdir}
    results = []
    for mid, file, old, new, tests, existing, probe in M:
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
        record = {'id': mid, 'file': file, 'old': old, 'new': new, 'commit': commit, 'detectors': {}}
        if tests:
            record['detectors']['test'] = vitest(clone, tests, env)
        if existing:
            record['detectors']['existing'] = vitest(clone, existing, env)
        if probe:
            built = run(['npm', 'run', 'build:poc'], clone, env)
            probe_out = os.path.join(tmpdir, f'utf8-{mid}.json')
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
        problems = [k for k, v in record['detectors'].items() if v.get('noTestOutput') or v.get('buildFailed') or v.get('probeFailed')]
        record['verdict'] = ('killed by ' + ', '.join(killers)) if killers else 'SURVIVED'
        if problems:
            record['verdict'] += f" (detector problem: {', '.join(problems)})"
        results.append(record)
        print(mid, record['verdict'], flush=True)
        run(['git', 'checkout', '-q', '--detach', head], clone)
    json.dump({'head': head, 'expectedProbeOutput': expected, 'mutants': results}, open(out, 'w'), indent=1)
    run(['npm', 'run', 'build:poc'], clone, env)


if __name__ == '__main__':
    main()
