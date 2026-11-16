#!/usr/bin/env python3
"""Reviewer mutants for PR 534 (R-GP-IMPL-UTF8-CANONICAL-1): decodeUtf8 and its four call sites.

Usage: my_mutants.py <scratch clone at the reviewed head, npm ci done> <head commit> <expected probe output> <tmp dir> <out.json> [--only id,id] [--full]

For each mutant: restore packages/ to the head, replace `old` by `new` in `file` (`old` must occur exactly once), then
  tests   npx vitest run --project @syzygy/support --project @syzygy/three-surface-poc-core (every test file of both
          projects; the root config aliases @syzygy/support to source, so no build is needed); with --full, the whole
          suite (npx vitest run) instead
  probe   (when the row says so) npx tsc -b --force packages/support packages/three-surface-poc-core, then utf8-probe.mjs
          and compare-utf8-probe.py against the expected output
Each record stores file, old, new, the head commit and every detector's exit code, summary lines and failing tests.
The clone is restored and rebuilt at the end.
"""
import json, os, re, subprocess, sys

SUP = 'packages/support/src/decode-utf8.ts'
GOR = 'packages/three-surface-poc-core/src/git-object-reader.ts'
OBS = 'packages/three-surface-poc-core/src/project-shape-observation.ts'
AAF = 'packages/three-surface-poc-core/src/authority-artifact-fields.ts'
CST = 'packages/three-surface-poc-core/src/code-structure.ts'
KEEP_BOM = "((): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return undefined; } })()"

M = [
    # the three the brief names
    ('R1-decoder-keeps-bom', SUP, "{ fatal: true }", "{ fatal: true, ignoreBOM: true }", True),
    ('R2-decoder-not-fatal', SUP, "new TextDecoder('utf-8', { fatal: true })", "new TextDecoder('utf-8')", True),
    ('R3-refusal-returns-empty-text', SUP, "return undefined;", "return '';", True),
    # the reviewer's own
    ('M1-decoder-strips-every-bom', SUP, "return STRICT_UTF8.decode(bytes);", "return STRICT_UTF8.decode(bytes).replace(/\\uFEFF/g, '');", True),
    ('M2-decoder-refuses-empty-input', SUP, "  try {\n    return STRICT_UTF8.decode(bytes);", "  if (bytes.byteLength === 0) return undefined;\n  try {\n    return STRICT_UTF8.decode(bytes);", True),
    ('M3-decoder-reads-whole-buffer', SUP, "return STRICT_UTF8.decode(bytes);", "return STRICT_UTF8.decode(bytes.buffer);", True),
    ('S1-object-reader-keeps-bom', GOR, "const text = decodeUtf8(bytes);\n      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });",
     f"const text = {KEEP_BOM};\n      if (text === undefined) return unavailable({{ ...taken, outcome: 'not-utf-8' }});", True),
    ('S2-seed-reader-keeps-bom', OBS, "const text = decodeUtf8(bytes);\n    if (text === undefined) {\n      reads.push(",
     f"const text = {KEEP_BOM};\n    if (text === undefined) {{\n      reads.push(", True),
    ('S3-object-reader-refusal-labelled-nul', GOR, "if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });",
     "if (text === undefined) return unavailable({ ...taken, outcome: 'contains-nul' });", True),
    ('S4-seed-reader-refusal-reason', OBS, "return { kind: 'unavailable', reason: 'seed is not valid UTF-8' };",
     "return { kind: 'unavailable', reason: 'seed is not readable' };", True),
    ('S5-code-structure-generic-error', CST, "if (text === undefined) throw new NonUtf8GitOutput();", "if (text === undefined) throw new Error('not utf-8');", True),
    ('S6-consent-falls-back-to-lenient', AAF, "const text = decodeUtf8(bytes);\n  if (text === undefined) return { kind: 'undecodable', detail: 'not strict UTF-8' };",
     "const text = (decodeUtf8(bytes) ?? new TextDecoder().decode(bytes)) as string | undefined;\n  if (text === undefined) return { kind: 'undecodable', detail: 'not strict UTF-8' };", True),
    ('S7-json-artifact-refusal-detail', AAF, "if (text === undefined) return { ok: false, detail: 'not strict UTF-8' };", "if (text === undefined) return { ok: false, detail: 'not JSON' };", True),
    ('S8-git-text-refusal-detail', OBS, "produced non-UTF-8 output", "produced output that is not UTF-8", True),
    ('S9-git-text-keeps-bom', OBS, "const text = decodeUtf8(bytes);\n  return text === undefined ? { kind: 'failed'",
     f"const text = {KEEP_BOM};\n  return text === undefined ? {{ kind: 'failed'", True),
    ('S10-code-structure-keeps-bom', CST, "const text = decodeUtf8(withoutGitlinkRecords(bytes));",
     "const text = ((b: Buffer): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); } catch { return undefined; } })(withoutGitlinkRecords(bytes));", True),
]


def run(cmd, cwd, env=None, timeout=3600):
    return subprocess.run(cmd, cwd=cwd, env={**os.environ, **(env or {})}, capture_output=True, text=True, timeout=timeout)


def summarize(text):
    lines = text.splitlines()
    summary = [l.strip() for l in lines if re.match(r'^\s*(Test Files|Tests)\s', l)]
    failing = sorted({l.strip()[:200] for l in lines if re.match(r'^\s*(FAIL|×|✗)\s', l)})
    return summary[-2:], failing


def main():
    clone, head, expected, tmp, out = sys.argv[1:6]
    only = set(sys.argv[sys.argv.index('--only') + 1].split(',')) if '--only' in sys.argv else None
    full = '--full' in sys.argv
    env = {'TMPDIR': tmp}
    probe_tool = os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/utf8-probe.mjs')
    compare_tool = os.path.join(clone, 'docs/evidence/syzygy-bpyt-6-3/compare-utf8-probe.py')
    results = []
    for mid, file, old, new, probe in M:
        if only and mid not in only:
            continue
        run(['git', 'checkout', '-q', '--', 'packages'], clone)
        path = os.path.join(clone, file)
        text = open(path, encoding='utf-8').read()
        rec = {'id': mid, 'file': file, 'old': old, 'new': new, 'head': head, 'oldCount': text.count(old), 'detectors': {}}
        if text.count(old) != 1:
            rec['verdict'] = 'NOT RUN (old fragment count is not 1)'
            results.append(rec)
            print(mid, rec['verdict'], flush=True)
            continue
        open(path, 'w', encoding='utf-8').write(text.replace(old, new))
        # Raised timeouts: on this loaded host the default 5 s test timeout fails git-heavy tests that have nothing to
        # do with the mutant (the first --full run lost start-gates.test.ts that way; S1 and S2 lost a live-source test).
        timeouts = ['--testTimeout=60000', '--hookTimeout=60000']
        cmd = ['npx', 'vitest', 'run', *timeouts] if full else ['npx', 'vitest', 'run', *timeouts, '--project', '@syzygy/support', '--project', '@syzygy/three-surface-poc-core']
        t = run(cmd, clone, env)
        summary, failing = summarize(t.stdout + t.stderr)
        rec['detectors']['tests'] = {'command': ' '.join(cmd), 'exit': t.returncode, 'summary': summary, 'failing': failing[:12], 'failingCount': len(failing), 'killed': t.returncode != 0}
        if probe:
            b = run(['npx', 'tsc', '-b', '--force', 'packages/support', 'packages/three-surface-poc-core'], clone, env)
            if b.returncode != 0:
                rec['detectors']['probe'] = {'buildFailed': True, 'detail': (b.stdout + b.stderr)[-400:], 'killed': False}
            else:
                po = os.path.join(tmp, f'probe-{mid}.json')
                p = run(['node', probe_tool, clone, po, '--tmp', tmp], clone, env)
                if p.returncode != 0:
                    rec['detectors']['probe'] = {'probeFailed': True, 'detail': (p.stdout + p.stderr)[-400:], 'killed': False}
                else:
                    c = run([sys.executable, '-I', compare_tool, expected, po], clone)
                    cj = json.loads(c.stdout)
                    rec['detectors']['probe'] = {'exit': c.returncode, 'rowsDiffer': cj['rowsDiffer'], 'differPerDriver': cj['differPerDriver'], 'firstDiffering': cj['firstDiffering'][:4], 'killed': c.returncode != 0}
                if os.path.exists(po):
                    os.remove(po)
        killers = [k for k, v in rec['detectors'].items() if v.get('killed')]
        rec['verdict'] = ('killed by ' + ', '.join(killers)) if killers else 'SURVIVED'
        results.append(rec)
        print(mid, rec['verdict'], json.dumps(rec['detectors']['tests']['summary']), json.dumps(rec['detectors'].get('probe', {}).get('differPerDriver')), flush=True)
        json.dump({'head': head, 'expectedProbeOutput': expected, 'mutants': results}, open(out, 'w'), indent=1)
    run(['git', 'checkout', '-q', '--', 'packages'], clone)
    run(['npx', 'tsc', '-b', '--force', 'packages/support', 'packages/three-surface-poc-core'], clone, env)
    json.dump({'head': head, 'expectedProbeOutput': expected, 'mutants': results}, open(out, 'w'), indent=1)
    print('done', len(results), flush=True)


if __name__ == '__main__':
    main()
