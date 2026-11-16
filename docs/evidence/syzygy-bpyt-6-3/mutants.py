#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.6.3: does each detector fail when the property it guards is broken?

Usage: mutants.py <scratch clone at the head commit, built and with node_modules> <head commit> <base commit>
                  <base probe json> <tmpdir> <out json> [--only id,id]

For each mutant: reset the clone to the head commit, replace `old` by `new` in `file` (`old` must occur exactly
once), then run the detectors that can see it.
  static   site-equivalence.py over a commit of the mutant against the base: the argument text each hash and
           freeze call passes must equal the base's. Sees a changed argument; cannot see a changed helper.
  probe    rebuild (npm run build:poc -- --force), run diff-probe.mjs, compare byte for byte with the base's output.
  tests    the owning package's Vitest project; a failing exit is a kill.
A mutant no detector kills is reported as SURVIVED, with the reason when it is an equivalent mutant.
"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))

SHA = 'packages/support/src/sha256.ts'
FREEZE = 'packages/support/src/deep-freeze.ts'
CORE = 'packages/three-surface-poc-core/src/'
GEN = 'packages/polaris-generation-core/src/'
CONSENT = 'packages/polaris-generation-consent/src/'
DOSSIER = 'packages/polaris-dossier/src/'
P_SUPPORT, P_CORE, P_GEN, P_CONSENT, P_DOSSIER = ('@syzygy/support', '@syzygy/three-surface-poc-core', '@syzygy/polaris-generation-core', '@syzygy/polaris-generation-consent', '@syzygy/polaris-dossier')

# (id, file, old, new, vitest project, probe can see it)
MUTANTS = [
    ('S1-algorithm-sha1', SHA, "createHash('sha256')", "createHash('sha1')", P_SUPPORT, True),
    ('S2-encoding-base64', SHA, ".digest('hex')", ".digest('base64')", P_SUPPORT, True),
    ('S3-update-latin1', SHA, '.update(value)', ".update(value, 'latin1')", P_SUPPORT, True),
    ('S4-update-stringified', SHA, '.update(value)', '.update(String(value))', P_SUPPORT, True),
    ('S5-freeze-without-descent', FREEZE, 'for (const member of Object.values(value)) deepFreeze(member);', '', P_SUPPORT, True),
    ('S6-freeze-nothing', FREEZE, '    Object.freeze(value);\n', '', P_SUPPORT, True),
    ('S7-freeze-without-guard', FREEZE, ' && !Object.isFrozen(value)', '', P_SUPPORT, True),
    ('S8-forbidden-token-in-closure', FREEZE, 'export function deepFreeze', 'const closureProbe = (value: object) => value.constructor;\nexport function deepFreeze', P_CORE, False),
    ('C1-manifest-digest', CORE + 'project-shape-manifest.ts', 'sha256(canonicalManifestJson(manifest))', "sha256(canonicalManifestJson(manifest) + ' ')", P_CORE, True),
    ('C2-observation-digest', CORE + 'project-shape-observation.ts', 'sha256(canonicalJson(stripCaptureInstant(stable)))', "sha256(canonicalJson(stripCaptureInstant(stable)) + ' ')", P_CORE, True),
    ('C3-model-artifact-digest', CORE + 'model.ts', 'digest: sha256(bytes) };', 'digest: sha256(bytes.slice(1)) };', P_CORE, True),
    ('C4-response-identity', CORE + 'response-identity.ts', 'sha256(serialized)', "sha256(serialized + ' ')", P_CORE, True),
    ('C5-content-digest', CORE + 'git-object-reader.ts', 'return `sha256:${sha256(bytes)}`;', 'return `sha256:${sha256(bytes.slice(1))}`;', P_CORE, True),
    ('C6-canonical-json-digest', GEN + 'canonical-json.ts', 'sha256(encodeCanonicalJson(value, limits))', "sha256(encodeCanonicalJson(value, limits) + ' ')", P_GEN, True),
    ('C7-drafter-frozen-digest', CORE + 'owner-act-drafter.ts', 'sha256(input.artifact.bytes)', "sha256(input.artifact.bytes + ' ')", P_CORE, True),
    ('C8-body-read-authority-digest', CORE + 'body-read-authority.ts', 'const digest = sha256(bytes);', 'const digest = sha256(bytes.slice(1));', P_CORE, True),
    ('C9-judgment-run-digest', CORE + 'walkthrough-judgment.ts', 'const runDigest = sha256(runBytes);', 'const runDigest = sha256(runBytes.slice(1));', P_CORE, True),
    ('C10-consent-module-digest', CONSENT + 'package-reader.ts', 'if (act.digest !== sha256(module)) refuse();', "if (act.digest !== sha256(module + ' ')) refuse();", P_CONSENT, False),
    ('C11-dossier-evaluation-questions', GEN + 'dossier-evaluation.ts', 'const questionsSha256 = sha256(input.questionsText);', "const questionsSha256 = sha256(input.questionsText + ' ');", P_GEN, False),
    ('C12-handover-prompt-digest', DOSSIER + 'session-handover.ts', 'prompt, promptSha256: sha256(prompt), commands }', "prompt, promptSha256: sha256(prompt + ' '), commands }", P_DOSSIER, False),
    ('F1-headroom-not-frozen', CORE + 'model.ts', 'resourceHeadroom: deepFreeze(deriveResourceHeadroom(', 'resourceHeadroom: (deriveResourceHeadroom(', P_CORE, True),
    ('F2-observation-not-frozen', CORE + 'project-shape-observation.ts', 'return deepFreeze({ ...body, observationDigest });', 'return ({ ...body, observationDigest });', P_CORE, True),
    ('F3-body-authority-not-frozen', CORE + 'body-read-authority.ts', 'return deepFreeze({', 'return ({', P_CORE, True),
    ('F4-manifest-not-frozen', CORE + 'project-shape-manifest.ts', 'manifest: deepFreeze({ ...body, digest: digestOf(body) })', 'manifest: ({ ...body, digest: digestOf(body) })', P_CORE, True),
]


def run(cmd, cwd, env=None, timeout=1800):
    full_env = {**os.environ, **(env or {})}
    return subprocess.run(cmd, cwd=cwd, env=full_env, capture_output=True, text=True, timeout=timeout)


def main():
    clone, head, base, base_probe, tmpdir, out = sys.argv[1:7]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    env = {'TMPDIR': tmpdir}
    results = []
    for mid, file, old, new, project, probe_sees in MUTANTS:
        if only and mid not in only:
            continue
        run(['git', 'checkout', '-q', '--detach', head], clone)
        run(['git', 'clean', '-fdq'], clone)
        path = os.path.join(clone, file)
        text = open(path, encoding='utf-8').read()
        if text.count(old) != 1:
            results.append({'id': mid, 'error': f'old fragment occurs {text.count(old)} times in {file}'})
            continue
        open(path, 'w', encoding='utf-8').write(text.replace(old, new))
        run(['git', 'commit', '-qa', '-m', f'mutant {mid}'], clone)
        mutant_commit = run(['git', 'rev-parse', 'HEAD'], clone).stdout.strip()
        record = {'id': mid, 'file': file, 'old': old, 'new': new, 'commit': mutant_commit, 'detectors': {}}

        static = run([sys.executable, os.path.join(HERE, 'site-equivalence.py'), clone, base, mutant_commit], clone)
        sj = json.loads(static.stdout)
        differing = sj['filesWhoseHashArgumentsDiffer'] + sj['filesWhoseFreezeArgumentsDiffer']
        record['detectors']['static'] = {'killed': bool(differing) or not sj['globalHashArguments']['equal'] or not sj['globalFreezeArguments']['equal'], 'files': differing}

        if probe_sees:
            built = run(['npm', 'run', 'build:poc', '--', '--force'], clone, env)
            probe_out = os.path.join(tmpdir, f'probe-{mid}.json')
            ran = run(['node', os.path.join(HERE, 'diff-probe.mjs'), clone, probe_out, base], clone, env) if built.returncode == 0 else None
            if ran is None or ran.returncode != 0:
                record['detectors']['probe'] = {'killed': True, 'how': 'build or probe failed', 'detail': ((built.stdout + built.stderr) if ran is None else (ran.stdout + ran.stderr))[-300:]}
            else:
                cmp = run([sys.executable, os.path.join(HERE, 'compare-probe.py'), base_probe, probe_out], clone)
                cj = json.loads(cmp.stdout)
                record['detectors']['probe'] = {'killed': cj['rowsThatDiffer'] > 0, 'rowsThatDiffer': cj['rowsThatDiffer'], 'rowsCompared': cj['rowsCompared']}
            if os.path.exists(probe_out):
                os.remove(probe_out)
        else:
            record['detectors']['probe'] = {'killed': None, 'note': 'outside the probe closure'}

        tests = run(['npx', 'vitest', 'run', '--project', project], clone, env)
        tail = [line for line in (tests.stdout + tests.stderr).splitlines() if 'Tests ' in line or 'Test Files ' in line]
        record['detectors']['tests'] = {'killed': tests.returncode != 0, 'project': project, 'summary': [t.strip() for t in tail][-2:]}

        record['verdict'] = 'killed by ' + ', '.join(k for k, v in record['detectors'].items() if v['killed']) if any(v['killed'] for v in record['detectors'].values()) else 'SURVIVED'
        results.append(record)
        print(mid, record['verdict'], flush=True)
        run(['git', 'checkout', '-q', '--detach', head], clone)
    json.dump({'head': head, 'base': base, 'mutants': results}, open(out, 'w'), indent=1)
    run(['npm', 'run', 'build:poc', '--', '--force'], clone, env)


if __name__ == '__main__':
    main()
