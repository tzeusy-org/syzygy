#!/usr/bin/env python3
"""Rule-6 mutants for syzygy-bpyt.76 (the node-ci step that runs scripts/check_node_segment_rules.mjs), run in a clean clone.

Usage: mutants.py <clone with node_modules> <out.json> <tmpdir>

Each row runs the step's own command, read from the clone's .github/workflows/node-ci.yml by the step's name, under bash from the
clone's root, as the hosted job does. A row either edits the clone (syzygy-bpyt.6.14's apply and restore, imported from the clone
unedited; each edit recorded verbatim as {path, old, new}) or preloads a module through NODE_OPTIONS that takes away what the
check reads from Node: process.binding itself, the resolver's source in process.binding('natives'), or one literal in that source.
The O rows run the original, docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs, under the same preloads. Each row names before
the run the exit status it must give and a line its output must hold; the clone's `git status --porcelain` is recorded after
(expected empty).
"""
import hashlib
import importlib.util
import json
import os
import re
import subprocess
import sys

LANE_614 = 'docs/evidence/syzygy-bpyt-6-14/tools/mutants.py'
WORKFLOW = '.github/workflows/node-ci.yml'
STEP = 'Node segment rules (scripts/check_node_segment_rules.mjs)'
ORIGINAL = 'node docs/evidence/syzygy-bpyt-70/tools/node_segments.mjs'
KIT = 'packages/polaris-generation-core/src/workspace-reach.testkit.ts'
TEST = 'packages/polaris-generation-core/src/workspace-reach.test.ts'
UNREADABLE = 'check_node_segment_rules: cannot read the segment rules of Node '

PRELOADS = {
    'binding-removed': 'delete process.binding;\n',
    'binding-throws': "process.binding = (name) => { throw new Error(`No such module: ${name}`); };\n",
    'natives-without-resolver': ("const real = process.binding.bind(process);\n"
                                 "process.binding = (name) => {\n  const module = real(name);\n  if (name !== 'natives') return module;\n"
                                 "  const { ['internal/modules/esm/resolve']: _, ...rest } = module;\n  return rest;\n};\n"),
    'literal-renamed': ("const real = process.binding.bind(process);\n"
                        "process.binding = (name) => {\n  const module = real(name);\n  if (name !== 'natives') return module;\n"
                        "  const source = module['internal/modules/esm/resolve'];\n"
                        "  return { ...module, 'internal/modules/esm/resolve': source.replace('const invalidSegmentRegEx = ', 'const invalidSegmentRegExp = ') };\n};\n"),
}


def edit(path, old, new):
    return {'path': path, 'old': old, 'new': new}


def rows(clone, node):
    kit = open(os.path.join(clone, KIT), encoding='utf-8').read().split('\n')
    inv = next(line for line in kit if line.startswith('export const INVALID_SEGMENT = ')) + '\n'
    ref = next(line for line in kit if line.startswith('export const REFUSED_SEGMENT = ')) + '\n'
    assert inv.count('(n|%6e|%4e)') == 1 and ref.endswith('/i;\n')
    # (id, the command, edits, preload, the exit status expected, a line the output must hold, or for the O rows a line it must not).
    return [
        ('U0-unmutated', None, [], None, 0, f'{node} regexes true true cases 15/15 mismatches 0', None),
        ('G1-invalid-segment-copy-drops-encoded-capital-n', None, [edit(KIT, inv, inv.replace('(n|%6e|%4e)', '(n|%6e)'))], None, 1,
         'mismatch: invalidSegmentRegEx is ', None),
        ('G2-refused-segment-copy-case-sensitive', None, [edit(KIT, ref, ref.replace('/i;\n', '/;\n'))], None, 1,
         'mismatch: deprecatedInvalidSegmentRegEx is ', None),
        ('G3-case-row-outcome-flipped', None, [edit(TEST, "['./dist//index.js', 'warns']", "['./dist//index.js', 'refuses']")], None, 1,
         'mismatch: "./dist//index.js" Node warns (then loads), reader warns, test refuses', None),
        *[(f'B-{name}', None, [], name, 2, UNREADABLE, None) for name in PRELOADS],
        *[(f'O-{name}', ORIGINAL, [], name, 1, None, UNREADABLE) for name in PRELOADS],
    ]


def step_command(clone):
    text = open(os.path.join(clone, WORKFLOW), encoding='utf-8').read()
    found = re.findall(r'^      - name: ' + re.escape(STEP) + r'\n        run: ([^\n]+)\n', text, re.M)
    assert len(found) == 1, found
    return found[0]


def sha256_file(path):
    return hashlib.sha256(open(path, 'rb').read()).hexdigest()


def main():
    clone, out_path, tmpdir = sys.argv[1:4]
    os.makedirs(tmpdir, exist_ok=True)
    spec = importlib.util.spec_from_file_location('lane614', os.path.join(clone, LANE_614))
    lane614 = importlib.util.module_from_spec(spec)
    spec.loader.exec_module(lane614)
    git = lambda *args: subprocess.run(['git', '-C', clone, *args], capture_output=True, text=True, check=True).stdout
    commit = git('rev-parse', 'HEAD').strip()
    assert git('status', '--porcelain') == '', 'the clone must start clean'
    step = step_command(clone)
    preloads = {}
    for name, body in PRELOADS.items():
        preloads[name] = os.path.join(tmpdir, f'preload-{name}.mjs')
        open(preloads[name], 'w').write(body)
    out = []
    node = subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip()
    for rid, command, edits, preload, want_exit, want_line, not_line in rows(clone, node):
        command = command or step
        env = dict(os.environ, TMPDIR=tmpdir)
        if preload is not None:
            env['NODE_OPTIONS'] = f'--import={preloads[preload]}'
        undo = lane614.apply(clone, edits)
        try:
            proc = subprocess.run(['bash', '-e', '-c', command], cwd=clone, env=env, capture_output=True, text=True, timeout=600)
        finally:
            lane614.restore(undo)
        lines = [line for line in (proc.stdout + proc.stderr).split('\n') if line.strip()]
        ok = proc.returncode == want_exit if want_line is not None else proc.returncode != 0
        if want_line is not None:
            ok = ok and any(line.startswith(want_line) for line in lines)
        if not_line is not None:
            ok = ok and not any(line.startswith(not_line) for line in lines)
        out.append({'id': rid, 'command': command, 'edits': edits, 'preload': preload and PRELOADS[preload],
                    'expectedExit': want_exit if want_line is not None else 'nonzero', 'expectedLine': want_line, 'absentLine': not_line,
                    'exit': proc.returncode, 'asExpected': ok, 'stdout': proc.stdout[-1500:], 'stderrHead': proc.stderr[:1200]})
        print(rid, 'as expected' if ok else 'UNEXPECTED', proc.returncode, (lines or [''])[0][:160], flush=True)
    status = git('status', '--porcelain')
    summary = {'rows': len(out), 'asExpected': sum(r['asExpected'] for r in out), 'unexpected': [r['id'] for r in out if not r['asExpected']]}
    json.dump({'commit': commit, 'workflow': WORKFLOW, 'step': STEP, 'stepCommand': step, 'distDirs': lane614.dist_dirs(clone),
               'importedTools': {LANE_614: sha256_file(os.path.join(clone, LANE_614))},
               'node': subprocess.run(['node', '--version'], capture_output=True, text=True).stdout.strip(),
               'summary': summary, 'statusAfter': status, 'rows': out}, open(out_path, 'w'), indent=1)
    print('summary', summary, 'status after', repr(status))


if __name__ == '__main__':
    main()
