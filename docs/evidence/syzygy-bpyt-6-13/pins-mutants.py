#!/usr/bin/env python3
"""Rule-6 mutants for the pins syzygy-bpyt.6.13 adds (review R-GP-IMPL-SUPPORT-LEAF-1 N2, N5; round 2 N12).

Usage: pins-mutants.py <scratch clone with node_modules> <base commit> <head commit> <tmpdir> <out.json> [--only id,id]

For each mutant the same `old` -> `new` fragment is applied twice, each time to a clean detached checkout:
  before   the BASE commit (main before this change): the owning Vitest project (or the named files) must PASS with the mutant, which is
           what N2 reported (the suite did not see it). Rows with no test at the base (a new test file) record before = null.
  after    the HEAD commit: the same run must FAIL, and the failed tests are listed so the kill is attributed to the new row, not to a
           test that already existed.
A run that reports no test counts is an error, never a kill and never a survival. Controls: C0 runs each project unmutated at HEAD and
must pass; N* are equivalent edits that must pass at HEAD. Every fragment is stored, so each row can be re-run by hand at the stored
commits. The failed-test list is never truncated: `failedTestCount` is the full count and `failedTests` holds every name up to 60.
Vitest's JSON reporter, one run per call; the host's load shows in `durationMs` (a load timeout would appear as a failed test whose name
the record keeps, and is re-run alone before it is scored).
"""
import json
import os
import subprocess
import sys
import time

# The polaris-dossier tests start git processes and time out under host load (the review's round 1 saw four such files; an unmutated control of
# this tool failed 22 tests at the default budget, and every one of them passes alone). The longer budget is the review's own remedy.
VITEST_FLAGS = ['--testTimeout=120000', '--hookTimeout=120000']
CORE = '@syzygy/three-surface-poc-core'
GEN = '@syzygy/polaris-generation-core'
DOSSIER = '@syzygy/polaris-dossier'
SUPPORT = '@syzygy/support'
APP = '@syzygy/three-surface-poc-app'
APP_LIFECYCLE = ['apps/three-surface-poc/src/polaris-generation/durable-lifecycle-generate.test.ts', 'apps/three-surface-poc/src/polaris-generation/durable-lifecycle.test.ts', 'apps/three-surface-poc/src/polaris-generation/dossier-trigger.test.ts']
INSTALL_TEST = ['apps/three-surface-poc/src/polaris-generation/generator-install-check.test.ts']
CENSUS_TEST = ['packages/three-surface-poc-core/src/test-frozen.test.ts']

# Test selections: (project flags, file filters).
SEL_CORE = ([CORE], [])
SEL_GEN = ([GEN, DOSSIER], [])
SEL_LIFECYCLE = ([], APP_LIFECYCLE)
SEL_SUPPORT = ([SUPPORT], [])
SEL_INSTALL = ([], INSTALL_TEST)
SEL_CENSUS = ([], CENSUS_TEST)

C = 'packages/three-surface-poc-core/src/'
G = 'packages/polaris-generation-core/src/'
FREEZE = 'packages/support/src/deep-freeze.ts'
CENSUS = C + 'test-frozen.ts'
INSTALL = 'scripts/check_generator_install.mjs'
FREEZE_GUARD = "  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {\n    Object.freeze(value);\n    for (const member of Object.values(value)) deepFreeze(member);\n  }"
INSTALL_ALL = ("if (!existsSync(join(process.cwd(), 'node_modules', '.bin', 'tsc'))\n"
               "  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))\n"
               "  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'support'))) {")

# (id, expect at HEAD, file, old, new, selection, expectation at BASE: 'pass' = survives, 'fail' = an existing test kills it, None = no test at the base)
MUTANTS = [
    # --- N2: the eight predicates (C* and F* are the lane's ids in docs/evidence/syzygy-bpyt-6-3/mutants.py, R* the reviewer's) ---
    ('C1-manifest-digest', 'killed', C + 'project-shape-manifest.ts', 'sha256(canonicalManifestJson(manifest))', "sha256(canonicalManifestJson(manifest) + ' ')", SEL_CORE, 'pass'),
    ('C2-observation-digest', 'killed', C + 'project-shape-observation.ts', 'sha256(canonicalJson(stripCaptureInstant(stable)))', "sha256(canonicalJson(stripCaptureInstant(stable)) + ' ')", SEL_CORE, 'pass'),
    ('C3-model-artifact-digest', 'killed', C + 'model.ts', 'return { path: artifactPath, digest: sha256(bytes) };', 'return { path: artifactPath, digest: sha256(bytes.slice(1)) };', SEL_CORE, 'pass'),
    ('C11-dossier-evaluation-questions', 'killed', G + 'dossier-evaluation.ts', 'const questionsSha256 = sha256(input.questionsText);', "const questionsSha256 = sha256(input.questionsText + ' ');", SEL_GEN, 'pass'),
    ('F1-headroom-not-frozen', 'killed', C + 'model.ts', 'resourceHeadroom: deepFreeze(deriveResourceHeadroom(projectShape, input.projectShape?.resourceLimits)),', 'resourceHeadroom: (deriveResourceHeadroom(projectShape, input.projectShape?.resourceLimits)),', SEL_CORE, 'pass'),
    ('F3-body-authority-not-frozen', 'killed', C + 'body-read-authority.ts', '  return deepFreeze({\n    evaluationId: inputs.evaluationId,', '  return ({\n    evaluationId: inputs.evaluationId,', SEL_CORE, 'pass'),
    ('R3-equal-length-reordered-question-digest', 'killed', G + 'dossier-profile.ts', 'sha256(JSON.stringify([q.id, q.question, q.scope, q.reason]))', 'sha256(JSON.stringify([q.id, q.scope, q.question, q.reason]))', SEL_GEN, 'pass'),
    ('R9-equal-length-reordered-attempt-id', 'killed', 'apps/three-surface-poc/src/polaris-generation/durable-lifecycle.ts', '`${input.requestId}\\0${input.stage}\\0${input.ordinal}`', '`${input.stage}\\0${input.requestId}\\0${input.ordinal}`', SEL_LIFECYCLE, 'pass'),
    # --- N12: the partial-freeze state ---
    ('D1-freeze-after-the-walk', 'killed', FREEZE, FREEZE_GUARD, FREEZE_GUARD.replace("    Object.freeze(value);\n    for (const member of Object.values(value)) deepFreeze(member);\n", "    for (const member of Object.values(value)) deepFreeze(member);\n    Object.freeze(value);\n"), SEL_SUPPORT, 'fail'),
    ('D3-members-read-before-the-owner-is-frozen', 'killed', FREEZE, FREEZE_GUARD, FREEZE_GUARD.replace("    Object.freeze(value);\n    for (const member of Object.values(value)) deepFreeze(member);\n", "    const members = Object.values(value);\n    Object.freeze(value);\n    for (const member of members) deepFreeze(member);\n"), SEL_SUPPORT, 'pass'),
    # --- the census helper the freeze pins stand on ---
    ('H1-census-never-reports', 'killed', CENSUS, '    if (!Object.isFrozen(node)) unfrozen.push(path);\n', '', SEL_CENSUS, None),
    ('H2-census-stops-at-a-frozen-shell', 'killed', CENSUS, '    for (const [key, member] of Object.entries(node)) walk(member, `${path}.${key}`);\n', '    if (Object.isFrozen(node)) return;\n    for (const [key, member] of Object.entries(node)) walk(member, `${path}.${key}`);\n', SEL_CENSUS, None),
    ('H3-census-counts-nothing', 'killed', CENSUS, '  return { visited: seen.size, unfrozen };', '  return { visited: 0, unfrozen };', SEL_CENSUS, None),
    # --- N5: the install check ---
    ('I1-support-not-required', 'killed', INSTALL, "\n  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'support'))", '', SEL_INSTALL, None),
    ('I2-generation-core-not-required', 'killed', INSTALL, "\n  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))", '', SEL_INSTALL, None),
    ('I3-tsc-not-required', 'killed', INSTALL, "if (!existsSync(join(process.cwd(), 'node_modules', '.bin', 'tsc'))\n  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))", "if (!existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))", SEL_INSTALL, None),
    ('I4-refusal-exits-zero', 'killed', INSTALL, 'process.exitCode = 1;', 'process.exitCode = 0;', SEL_INSTALL, None),
    ('I5-wrong-entry-name-for-support', 'killed', INSTALL, "'@syzygy', 'support'))", "'@syzygy', 'supports'))", SEL_INSTALL, None),
    ('I6-refusal-says-nothing', 'killed', INSTALL, "process.stderr.write('Generator dependencies are missing. Run npm ci from the repository root, then retry.\\n');", "process.stderr.write('');", SEL_INSTALL, None),
    # --- negative controls: edits that change nothing a test may see; they must pass at HEAD ---
    ('N1-support-checked-first', 'pass', INSTALL, INSTALL_ALL,
     "if (!existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'support'))\n  || !existsSync(join(process.cwd(), 'node_modules', '.bin', 'tsc'))\n  || !existsSync(join(process.cwd(), 'node_modules', '@syzygy', 'polaris-generation-core'))) {", SEL_INSTALL, None),
    ('N2-freeze-comment-only', 'pass', FREEZE, FREEZE_GUARD, '  // walk\n' + FREEZE_GUARD, SEL_SUPPORT, 'pass'),
    ('N3-census-comment-only', 'pass', CENSUS, '    seen.add(node);\n', '    seen.add(node); // visited\n', SEL_CENSUS, None),
]


def sh(cmd, cwd, env=None, timeout=3600):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def checkout(clone, commit):
    sh(['git', 'checkout', '-q', '-f', '--detach', commit], clone)
    sh(['git', 'clean', '-fdq'], clone)
    head = sh(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
    if not head.startswith(commit[:8]):
        raise SystemExit(f'checkout of {commit} landed on {head}')
    return head


def apply(clone, path, old, new):
    full = os.path.join(clone, path)
    text = open(full, encoding='utf-8').read()
    if text.count(old) != 1:
        raise SystemExit(f'{path}: old fragment occurs {text.count(old)} times, not once: {old[:80]!r}')
    open(full, 'w', encoding='utf-8').write(text.replace(old, new))


def vitest(clone, tmpdir, selection):
    projects, files = selection
    out = os.path.join(tmpdir, 'vitest.json')
    if os.path.exists(out):
        os.remove(out)
    cmd = ['npx', 'vitest', 'run', '--reporter=json', f'--outputFile={out}', *VITEST_FLAGS]
    for project in projects:
        cmd += ['--project', project]
    cmd += files
    started = time.time()
    proc = sh(cmd, clone, {'TMPDIR': tmpdir})
    seconds = round(time.time() - started)
    if not os.path.exists(out):
        raise SystemExit('no json reporter output: ' + proc.stderr[-400:])
    data = json.load(open(out))
    if data['numTotalTests'] == 0:
        raise SystemExit('the run reported no tests')
    failed = [f"{f['name'].split('/')[-1]} > {t['fullName']}" if t['status'] == 'failed' else None for f in data['testResults'] for t in f['assertionResults']]
    failed = [name for name in failed if name]
    # A file that failed to load has no assertion rows; keep its message.
    broken = [f['name'] for f in data['testResults'] if f['status'] == 'failed' and not any(t['status'] == 'failed' for t in f['assertionResults'])]
    return {
        'exit': proc.returncode, 'total': data['numTotalTests'], 'passed': data['numPassedTests'], 'failed': data['numFailedTests'],
        'failedTestCount': len(failed), 'failedTests': failed[:60], 'filesFailedToLoad': broken, 'durationSeconds': seconds,
    }


def run_pair(clone, tmpdir, commit, path, old, new, selection):
    head = checkout(clone, commit)
    if path is not None:
        apply(clone, path, old, new)
    try:
        result = vitest(clone, tmpdir, selection)
    finally:
        checkout(clone, commit)
    return {'commit': head, **result}


def main():
    clone, base, head, tmpdir, out_path = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    os.makedirs(tmpdir, exist_ok=True)
    rows = []
    selections = {}
    for _, _, _, _, _, selection, _ in MUTANTS:
        selections[json.dumps(selection)] = selection
    controls = {}
    if not only:
        for key, selection in selections.items():
            controls[key] = run_pair(clone, tmpdir, head, None, None, None, selection)
            print('C0', key, controls[key]['exit'], f"{controls[key]['failed']} failed of {controls[key]['total']}", flush=True)
    for mid, expect, path, old, new, selection, base_expect in MUTANTS:
        if only and mid not in only:
            continue
        row = {'id': mid, 'expect': expect, 'file': path, 'old': old, 'new': new, 'selection': {'projects': selection[0], 'files': selection[1]}}
        row['beforeExpected'] = base_expect
        row['before'] = run_pair(clone, tmpdir, base, path, old, new, selection) if base_expect else None
        row['after'] = run_pair(clone, tmpdir, head, path, old, new, selection)
        after_fails = row['after']['exit'] != 0 and row['after']['failed'] + len(row['after']['filesFailedToLoad']) > 0
        before_ok = row['before'] is None or ((row['before']['exit'] == 0) == (base_expect == 'pass'))
        if expect == 'killed':
            row['ok'] = after_fails and before_ok
        else:
            row['ok'] = row['after']['exit'] == 0
        rows.append(row)
        print(('ok  ' if row['ok'] else 'BAD ') + mid, 'before:', None if row['before'] is None else (row['before']['exit'], row['before']['failed']), 'after:', (row['after']['exit'], row['after']['failed']), flush=True)
        json.dump({'base': base, 'head': head, 'rows': rows, 'controls': controls}, open(out_path, 'w'), indent=1)
    summary = {
        'mutants': sum(1 for r in rows if r['expect'] == 'killed'), 'killedAfterAndSurvivedBefore': sum(1 for r in rows if r['expect'] == 'killed' and r['ok']),
        'negativeControls': sum(1 for r in rows if r['expect'] == 'pass'), 'negativeControlsPassing': sum(1 for r in rows if r['expect'] == 'pass' and r['ok']),
        'controlProjectsPassing': sum(1 for c in controls.values() if c['exit'] == 0), 'controlProjects': len(controls),
        'rowsNotOk': [r['id'] for r in rows if not r['ok']],
    }
    json.dump({'base': base, 'head': head, 'node': sh(['node', '-v'], clone).stdout.strip(), 'vitestFlags': VITEST_FLAGS, 'summary': summary, 'rows': rows, 'controls': controls}, open(out_path, 'w'), indent=1)
    print(summary)
    sys.exit(0 if not summary['rowsNotOk'] and summary['controlProjectsPassing'] == summary['controlProjects'] else 1)


if __name__ == '__main__':
    main()
