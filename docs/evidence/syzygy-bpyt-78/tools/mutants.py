#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.78 (the PR 557 round-2 review's N2 and N3, workspace-reach.test.ts), run in a clean clone.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir> <absent|present>

The edit, run and restore steps are syzygy-bpyt.6.14's (docs/evidence/syzygy-bpyt-6-14/tools/mutants.py), and the failing-set form
is syzygy-bpyt.46's (docs/evidence/syzygy-bpyt-46/tools/mutants.py), both imported from the clone and unedited. Every row records its
edits verbatim as {path, old, new}, and the clone's `git status --porcelain` is recorded after (expected empty). Each row names,
before the run, the exact set of failing test names it must give: [] for a row that must pass.

The N3 rows (RX4, R2, and each again with the unread row's assertions turned into message equality, the form the bead proposed)
also run the file under vitest's default reporter (NO_COLOR=1) and record its `Expected:` and `Received:` lines. Each must print
both messages whole there, and each must give a first failure line, the one the JSON reporter keeps, that vitest truncates: the
two forms print the same, so the row stays a `toThrow` (see record.json, item 4).
"""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys

LANE_614 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'
LANE_46 = 'docs/evidence/syzygy-bpyt-46/tools/mutants.py'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'

ENTRIES = 'the workspace entry modules '
UNREAD_ROW = ENTRIES + 'throws on such a target under a condition Node does not read, or in a main, and names the one Node refuses first'
KEY_ROW = ENTRIES + 'throws on a condition key with a /../ segment, at any depth'
UNREAD_START = "  it('throws on such a target under a condition Node does not read, or in a main, and names the one Node refuses first', () => {\n"
UNREAD_END = "  // The PR 557 round-1 review's N2:"
DESCRIBE = "// syzygy-bpyt.46: the entries the S10 bundle aliases by.\n"

REFUSES = 'which Node refuses (ERR_INVALID_PACKAGE_TARGET)'
DOES_NOT_READ = 'which Node does not read'
REQUIRE = '@syzygy/lib: its require condition target "./dist/./index.js" has an empty, \'.\', \'..\' or \'node_modules\' segment, '
TYPES = '@syzygy/lib: its types condition target "./dist/x/../index.d.ts" has an empty, \'.\', \'..\' or \'node_modules\' segment, '

KEY_ADDED = ("    // A key fault beside a target Node refuses: the target is named, as the more severe (the PR 557 round-2 review's N2, its RK3).\n"
             "    expect(() => entryModulesIn(workspace({}, { 'a/../b': './dist/index.js', import: './dist/./index.js', default: './dist/./index.js' })))\n"
             "      .toThrow(`@syzygy/lib: its import condition target \"./dist/./index.js\" has an empty, '.', '..' or 'node_modules' segment, which Node refuses (ERR_INVALID_PACKAGE_TARGET)`);\n")
RK3 = ('    rank: 2,\n', '    rank: -1,\n')
RK2 = ('  if (Array.isArray(entry)) return entry.flatMap((fallback) => conditionKeysOf(fallback, conditions));\n', '  if (Array.isArray(entry)) return [];\n')
RX4 = ("'node', 'import', 'require',", "'node', 'import',")
R2 = ("[2, main ? 'which Node reads without its exports rules' : 'which Node does not read']", "[0, 'which Node refuses (ERR_INVALID_PACKAGE_TARGET)']")
HELPER = ("function thrownBy(read: () => unknown): string {\n  try {\n    read();\n  } catch (error) {\n    return (error as Error).message;\n  }\n"
          "  throw new Error('expected the call to throw');\n}\n\n")


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


def equality_form(clone):
    """The edits that turn each of the unread row's six assertions into `expect(thrownBy(...)).toBe(<message>)`."""
    s = open(os.path.join(clone, TEST), encoding='utf-8').read()
    row = s[s.index(UNREAD_START):s.index(UNREAD_END)]
    new = row.replace('expect(() => entryModulesIn(', 'expect(thrownBy(() => entryModulesIn(').replace(')))\n      .toThrow(`', '))))\n      .toBe(`')
    new = new.replace('}))\n      .toThrow(`', '})))\n      .toBe(`')
    assert new.count('.toBe(`') == row.count('.toThrow(`') == 6 and '.toThrow(' not in new
    assert s.count(DESCRIBE) == 1
    return [edit(TEST, row, new), edit(TEST, DESCRIBE, HELPER + DESCRIBE)]


def rows(clone):
    equality = equality_form(clone)
    rx4 = [REQUIRE + REFUSES, REQUIRE + DOES_NOT_READ]
    r2 = [TYPES + DOES_NOT_READ, TYPES + REFUSES]
    # (id, edits, the failing test names expected, the [Expected, Received] messages the default reporter must print whole, or None).
    return [
        ('U0-unmutated', [], [], None),
        # N2: the key fault ranked first fails the key row by the reviewer's key-plus-target expectation, and only by it.
        ('RK3-key-fault-ranked-first', [edit(KIT, *RK3)], [KEY_ROW], None),
        ('RK3B-key-fault-ranked-first-without-the-added-expectation', [edit(KIT, *RK3), edit(TEST, KEY_ADDED, '')], [], None),
        # RK2 stays equivalent in outcome: the resolver refuses an array entry as unreadable anyway.
        ('RK2-key-walk-skips-arrays', [edit(KIT, *RK2)], [], None),
        # N3: the row as it stands, and in the message-equality form, print the same under both reporters.
        ('RX4-require-not-a-node-condition', [edit(KIT, *RX4)], [UNREAD_ROW], rx4),
        ('RX4E-require-not-a-node-condition-equality-form', [edit(KIT, *RX4), *equality], [UNREAD_ROW], rx4),
        ('R2-unread-target-claims-node-refuses', [edit(KIT, *R2)], [UNREAD_ROW], r2),
        ('R2E-unread-target-claims-node-refuses-equality-form', [edit(KIT, *R2), *equality], [UNREAD_ROW], r2),
        ('U0E-equality-form-unmutated', equality, [], None),
    ]


def printed(clone, tmpdir):
    proc = subprocess.run(['npx', 'vitest', 'run', TEST], cwd=clone, env=dict(os.environ, TMPDIR=tmpdir, NO_COLOR='1', FORCE_COLOR='0'),
                          capture_output=True, text=True, timeout=900)
    text = re.sub(r'\x1b\[[0-9;]*m', '', proc.stdout + proc.stderr)
    return [line.strip() for line in text.split('\n') if re.match(r'\s*(Expected|Received):', line)]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main():
    clone, out_path, tmpdir, dist = sys.argv[1:5]
    os.makedirs(tmpdir, exist_ok=True)
    load = lambda path, name: (lambda spec: (lambda module: (spec.loader.exec_module(module), module)[1])(importlib.util.module_from_spec(spec)))(
        importlib.util.spec_from_file_location(name, os.path.join(clone, path)))
    lane614, lane46 = load(LANE_614, 'lane614'), load(LANE_46, 'lane46')
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    present = lane614.dist_dirs(clone)
    built = sorted(f'{project}/dist' for project in json.load(open(os.path.join(clone, 'package.json')))['scripts']['build'].split()[2:])
    assert (dist == 'absent' and present == []) or (dist == 'present' and present == built), (dist, present, built)
    out = []
    for rid, edits, want, whole in rows(clone):
        undo = lane614.apply(clone, edits)
        try:
            res = lane614.run(clone, TEST, tmpdir)
            lines = printed(clone, tmpdir) if whole is not None else None
        finally:
            lane614.restore(undo)
        failing = lane46.failing_set(res)
        firsts = {t['name']: t['message'].splitlines()[0][:300] for t in res.get('failedTests', [])}
        ok = 'error' not in res and failing == sorted(want) and (res['exit'] == 0) == (want == [])
        expected_lines = None if whole is None else [f'Expected: "{whole[0]}"', f'Received: "{whole[1]}"']
        if whole is not None:
            ok = ok and lines == expected_lines and all('…' in line for line in firsts.values())
        out.append({'id': rid, 'edits': edits, 'expected': sorted(want), 'failing': failing, 'asExpected': ok,
                    'expectedPrinted': expected_lines, 'printed': lines, 'messages': firsts,
                    **{k: res.get(k) for k in ('exit', 'passed', 'failed', 'total', 'fileMessages', 'error')}})
        print(rid, 'as expected' if ok else 'UNEXPECTED', res.get('exit'), res.get('passed'), res.get('failed'), failing, lines, flush=True)
    status = git('status', '--porcelain')
    summary = {'rows': len(out), 'asExpected': sum(r['asExpected'] for r in out), 'unexpected': [r['id'] for r in out if not r['asExpected']]}
    json.dump({'commit': commit, 'dist': dist, 'distDirs': present,
               'importedTools': {LANE_614: sha256_file(os.path.join(clone, LANE_614)), LANE_46: sha256_file(os.path.join(clone, LANE_46))},
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'rows': out}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status))


if __name__ == '__main__':
    main()
