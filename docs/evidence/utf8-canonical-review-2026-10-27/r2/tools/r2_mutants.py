#!/usr/bin/env python3
"""Round-2 reviewer mutants for PR 534 (R-GP-IMPL-UTF8-CANONICAL-2).

Usage: python3 -I r2_mutants.py <clone, npm ci done> <tmp dir> <out.json> <id[#detector][@commit]>...

Each argument names a mutant below, optionally a detector after `#` (default: the mutant's own), and after `@` the
commit to run it at (default b81010c8). For each one:
check out the commit (detached), require `old` exactly once in `file` and `new` zero times, write the mutation, run
the mutant's detector with vitest (json reporter, --testTimeout=60000 --hookTimeout=60000, TMPDIR=<tmp dir>), restore
the file with `git checkout -- <file>`, and store: id, commit, file, old, new, the detector's file list, /proc/loadavg
before and after, vitest's exit code, the counts, and every failing test with its first failure line. Then the same
detector runs once on the unmutated commit as a control (one control per commit and detector, cached in the output).

Detectors:
  four   the four test files the repair touches in three-surface-poc-core (git-object-reader, project-shape-observation,
         project-shape-git-text, code-structure)
  core   every test of the @syzygy/support and @syzygy/three-surface-poc-core vitest projects
"""
import json
import os
import re
import subprocess
import sys

GOR = 'packages/three-surface-poc-core/src/git-object-reader.ts'
OBS = 'packages/three-surface-poc-core/src/project-shape-observation.ts'
CST = 'packages/three-surface-poc-core/src/code-structure.ts'
KEEP_BOM = "((): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(bytes); } catch { return undefined; } })()"
FOUR = [
    'packages/three-surface-poc-core/src/git-object-reader.test.ts',
    'packages/three-surface-poc-core/src/project-shape-observation.test.ts',
    'packages/three-surface-poc-core/src/project-shape-git-text.test.ts',
    'packages/three-surface-poc-core/src/code-structure.test.ts',
]
REPAIRED_TRY = ("  try {\n    const text = decodeUtf8(withoutGitlinkRecords(bytes));\n    if (text !== undefined) return text;\n"
                "  } catch {\n    // falls through to the refusal below\n  }\n  throw new NonUtf8GitOutput();\n}")

MUTANTS = {
    # round 1's S1 and S2, byte for byte (rev-534/my-mutants.json)
    'S1': (GOR, "const text = decodeUtf8(bytes);\n      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });",
           f"const text = {KEEP_BOM};\n      if (text === undefined) return unavailable({{ ...taken, outcome: 'not-utf-8' }});"),
    'S2': (OBS, "const text = decodeUtf8(bytes);\n    if (text === undefined) {\n      reads.push(",
           f"const text = {KEEP_BOM};\n    if (text === undefined) {{\n      reads.push("),
    # round 1's form of defaultRunGit (the filter outside the try), written over the repaired try
    'F2': (CST, REPAIRED_TRY,
           "  const text = decodeUtf8(withoutGitlinkRecords(bytes));\n  if (text === undefined) throw new NonUtf8GitOutput();\n  return text;\n}"),
    # mine: the object reader strips one more byte-order mark (a second BOM the test expects kept)
    'X1': (GOR, "const text = decodeUtf8(bytes);\n      if (text === undefined) return unavailable",
           "const text = decodeUtf8(bytes)?.replace(/^\\uFEFF/, '');\n      if (text === undefined) return unavailable"),
    # mine: the seed reader strips one more byte-order mark
    'X2': (OBS, "const text = decodeUtf8(bytes);\n    if (text === undefined) {\n      reads.push(",
           "const text = decodeUtf8(bytes)?.replace(/^\\uFEFF/, '');\n    if (text === undefined) {\n      reads.push("),
    # mine: the repaired catch rethrows instead of converting (the round-1 reason comes back by another route)
    'X3': (CST, "  } catch {\n    // falls through to the refusal below\n  }\n  throw new NonUtf8GitOutput();",
           "  } catch (error) {\n    throw error;\n  }\n  throw new NonUtf8GitOutput();"),
    # mine: the catch swallows the fault and returns an empty listing (an observed, empty inventory)
    'X4': (CST, "  } catch {\n    // falls through to the refusal below\n  }",
           "  } catch {\n    return '';\n  }"),
    # mine: the seed reader's refusal read record names the wrong outcome
    'X5': (OBS, "outcome: 'not-utf-8', bytes: bytes.byteLength });\n      return { kind: 'unavailable', reason: 'seed is not valid UTF-8' };",
           "outcome: 'refused', bytes: bytes.byteLength });\n      return { kind: 'unavailable', reason: 'seed is not valid UTF-8' };"),
    # round 1's S10 on the repaired line, reached only by the fake git's byte-order-mark-led listing
    'S10': (CST, "    const text = decodeUtf8(withoutGitlinkRecords(bytes));",
            "    const text = ((b: Buffer): string | undefined => { try { return new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(b); } catch { return undefined; } })(withoutGitlinkRecords(bytes));"),
    # round 1's S9, reached only by the tree-listing case
    'S9': (OBS, "const text = decodeUtf8(bytes);\n  return text === undefined ? { kind: 'failed'",
           f"const text = {KEEP_BOM};\n  return text === undefined ? {{ kind: 'failed'"),
    # mine: the git-text decode strips one more byte-order mark
    'X6': (OBS, "const text = decodeUtf8(bytes);\n  return text === undefined ? { kind: 'failed'",
           "const text = decodeUtf8(bytes)?.replace(/^\\uFEFF/, '');\n  return text === undefined ? { kind: 'failed'"),
    # mine: a pure refactor of the gitlink filter that skips the copy when nothing is dropped (not a bug)
    'X7': (CST, "  if (start < bytes.length) kept.push(bytes.subarray(start));\n  return Buffer.concat(kept);",
           "  if (start < bytes.length) kept.push(bytes.subarray(start));\n  if (kept.length === 1 && kept[0]!.length === bytes.length) return bytes;\n  return Buffer.concat(kept);"),
}
DETECTOR = {'S1': 'four', 'S2': 'four', 'F2': 'four', 'X1': 'four', 'X2': 'four', 'X3': 'four', 'X4': 'four',
            'X5': 'four', 'S10': 'four', 'S9': 'four', 'X6': 'four', 'X7': 'four'}


def loadavg():
    return open('/proc/loadavg').read().strip()


def git(clone, *args):
    return subprocess.run(['git', '-C', clone, *args], check=True, capture_output=True, text=True).stdout


def vitest(clone, tmp, detector, tag):
    out = os.path.join(tmp, f'vitest-{tag}.json')
    if os.path.exists(out):
        os.remove(out)
    if detector == 'four':
        target = FOUR
    elif detector == 'core':
        target = ['--project', '@syzygy/support', '--project', '@syzygy/three-surface-poc-core']
    else:
        target = detector.split(',')
    cmd = ['npx', 'vitest', 'run', *target, '--testTimeout=60000', '--hookTimeout=60000', '--reporter=json', f'--outputFile={out}']
    before = loadavg()
    r = subprocess.run(cmd, cwd=clone, env={**os.environ, 'TMPDIR': tmp}, capture_output=True, text=True, timeout=3600)
    after = loadavg()
    try:
        rep = json.load(open(out))
    except Exception as e:  # noqa: BLE001
        return {'exit': r.returncode, 'reportError': str(e), 'stderrTail': r.stderr[-2000:], 'loadavgBefore': before, 'loadavgAfter': after}
    failed = []
    for f in rep['testResults']:
        for a in f['assertionResults']:
            if a['status'] == 'failed':
                msg = (a.get('failureMessages') or [''])[0]
                failed.append({'file': os.path.relpath(f['name'], clone), 'test': a['fullName'], 'firstLine': msg.splitlines()[0][:300] if msg else ''})
        if f['status'] == 'failed' and not f['assertionResults']:
            failed.append({'file': os.path.relpath(f['name'], clone), 'test': '(file failed to run)', 'firstLine': (f.get('message') or '')[:300]})
    return {
        'exit': r.returncode, 'command': ' '.join(cmd), 'loadavgBefore': before, 'loadavgAfter': after,
        'numTotalTests': rep['numTotalTests'], 'numPassedTests': rep['numPassedTests'], 'numFailedTests': rep['numFailedTests'],
        'numPendingTests': rep.get('numPendingTests'), 'numTotalTestSuites': rep.get('numTotalTestSuites'),
        'numFailedTestSuites': rep.get('numFailedTestSuites'), 'failed': failed,
    }


def main():
    clone, tmp, out = sys.argv[1:4]
    specs = sys.argv[4:]
    result = json.load(open(out)) if os.path.exists(out) else {'controls': {}, 'mutants': []}
    for spec in specs:
        idpart, _, commit = spec.partition('@')
        mid, _, det = idpart.partition('#')
        detector = det or DETECTOR[mid]
        commit = commit or 'b81010c8'
        full = git(clone, 'rev-parse', commit).strip()
        git(clone, 'checkout', '-q', '--detach', full)
        key = f'{full[:8]}:{detector}'
        if key not in result['controls']:
            result['controls'][key] = vitest(clone, tmp, detector, f'control-{full[:8]}-{detector}')
            json.dump(result, open(out, 'w'), indent=1)
        path, old, new = MUTANTS[mid]
        src_path = os.path.join(clone, path)
        src = open(src_path, encoding='utf-8').read()
        row = {'id': mid, 'commit': full, 'file': path, 'old': old, 'new': new, 'detector': detector,
               'oldCount': src.count(old), 'newCountBefore': src.count(new)}
        if row['oldCount'] != 1 or row['newCountBefore'] != 0:
            row['skipped'] = 'old does not occur exactly once, or new already occurs'
        else:
            open(src_path, 'w', encoding='utf-8').write(src.replace(old, new))
            try:
                row['run'] = vitest(clone, tmp, detector, f'{mid}-{full[:8]}')
            finally:
                git(clone, 'checkout', '--', path)
            row['restored'] = open(src_path, encoding='utf-8').read() == src
        result['mutants'].append(row)
        json.dump(result, open(out, 'w'), indent=1)
        r = row.get('run', {})
        print(mid, full[:8], detector, 'exit', r.get('exit'), 'failed', r.get('numFailedTests'), 'of', r.get('numTotalTests'),
              [f['test'][-110:] for f in r.get('failed', [])], row.get('skipped', ''), flush=True)


if __name__ == '__main__':
    main()
