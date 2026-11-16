#!/usr/bin/env python3
"""Reviewer mutants of the aggregation code in assemble_census.py at the reviewed commit.

Usage: my_mutants.py <evidence-dir> <worktree> <run-commit> <scratch (short, absolute, absent)> <out.json>

For each mutant: apply old -> new (old must occur exactly once above `def selftest(`), run `--classify-fixture`, and compare with the
unmutated file's answer (killed = the answer differs or the mutant stops). For every survivor, also run the full assembler on the
stored runs from a copy of the six tool files and list the JSON paths of the census record that change, so the survivor's effect on
the real record is shown. Each record stores old/new.
"""
import json
import pathlib
import re
import shutil
import subprocess
import sys

EV, WT, COMMIT, SCRATCH, OUT = (pathlib.Path(sys.argv[1]).resolve(), pathlib.Path(sys.argv[2]).resolve(), sys.argv[3], pathlib.Path(sys.argv[4]), pathlib.Path(sys.argv[5]).resolve())
assert SCRATCH.is_absolute() and len(str(SCRATCH)) <= 14 and not SCRATCH.exists()
TOOLS = ('assemble_census.py', 'census_run.py', 'collect_runs.py', 'scratch_trace.cjs', 'static_sites.py', 'tmp_sampler.py')
MUTANTS = {
    'gap-from-first-sightings-only': ("for edge in ('first', 'last')})", "for edge in ('first',)})"),
    'gap-takes-the-smallest-single-gap': ("return {'gapSeconds': max(single, default=interval),", "return {'gapSeconds': min(single, default=interval),"),
    'sampler-only-names-dropped-from-exposure': ("for name in set(entries) | set(index.seen):", "for name in set(index.seen):"),
    'sum-check-only-catches-too-many': ("if sum(n for _, n in parts) != len(table):", "if sum(n for _, n in parts) > len(table):"),
    'kill-leftover-count-doubled': ("slot['entries'] += 1", "slot['entries'] += 2"),
    'kill-leftovers-not-reported': ("'leftAfterSIGKILL': killed_left,", "'leftAfterSIGKILL': {},"),
    'seed-entries-counted-as-the-runs-own': ("slot = item['leftFromSeed' if name in seed_names else 'leftAtEnd']", "slot = item['leftAtEnd']"),
    'mkdtemp-count-includes-derived': ("sum(1 for r in table if r['family'] == 'mkdtemp')", "sum(1 for r in table if r['family'] in ('mkdtemp', 'derived'))"),
}
source = (EV / 'assemble_census.py').read_text()
code = source[:source.index('def selftest(')]
base = subprocess.run([sys.executable, '-I', str(EV / 'assemble_census.py'), '--classify-fixture'], capture_output=True, text=True, check=True).stdout
base_answer = json.loads(base)
committed = json.loads((EV / 'census-2026-10-24.json').read_text())


def walk(x, y, path, out):
    if isinstance(x, dict) and isinstance(y, dict):
        for k in sorted(set(x) | set(y)):
            if k not in x or k not in y:
                out.append(path + '/' + k)
            else:
                walk(x[k], y[k], path + '/' + k, out)
    elif isinstance(x, list) and isinstance(y, list) and len(x) == len(y):
        for i, (p, q) in enumerate(zip(x, y)):
            walk(p, q, '%s[%d]' % (path, i), out)
    elif x != y:
        out.append(path)


SCRATCH.mkdir(parents=True)
record = {'subject': str(EV / 'assemble_census.py'), 'mutants': {}}
try:
    for index, (name, (old, new)) in enumerate(MUTANTS.items()):
        assert code.count(old) == 1, (name, code.count(old))
        tools = SCRATCH / f't{index}'
        tools.mkdir()
        for tool in TOOLS:
            shutil.copyfile(EV / tool, tools / tool)
        (tools / 'assemble_census.py').write_text(source.replace(old, new, 1))
        ran = subprocess.run([sys.executable, '-I', str(tools / 'assemble_census.py'), '--classify-fixture'], capture_output=True, text=True, timeout=60)
        try:
            answer = json.loads(ran.stdout)
        except json.JSONDecodeError:
            answer = None
        killed = answer != base_answer
        entry = {'old': old, 'new': new, 'killedByTheFixture': killed, 'fixtureStopped': answer is None}
        if answer is not None and killed:
            entry['fixtureDiverges'] = sorted(f'{part}: {k}' for part in base_answer for k in base_answer[part] if answer[part].get(k) != base_answer[part][k])
        if not killed:
            out = SCRATCH / f'o{index}.json'
            full = subprocess.run([sys.executable, '-I', str(tools / 'assemble_census.py'), str(WT), COMMIT, str(EV / 'static-sites-2026-10-24.json'), str(EV / 'runs'),
                                   str(SCRATCH / f'p{index}'), str(out)], capture_output=True, text=True, timeout=600, cwd=WT)
            if full.returncode == 0:
                mutated = json.loads(out.read_text())
                paths = []
                walk(committed, mutated, '', paths)
                paths = [p for p in paths if p != '/subject/toolSha256/assemble_census.py']
                entry['realRecordPathsChanged'] = len(paths)
                entry['realRecordPathGroups'] = sorted({re.sub(r'\[\d+\]', '[]', p) for p in paths})[:12]
            else:
                entry['realRecordRun'] = {'exit': full.returncode, 'lastLine': (full.stderr.strip().splitlines() or [''])[-1][:200]}
        record['mutants'][name] = entry
finally:
    shutil.rmtree(SCRATCH, ignore_errors=True)
OUT.write_text(json.dumps(record, indent=1) + '\n')
print(json.dumps({n: {'killed': m['killedByTheFixture'], **({'real': m.get('realRecordPathsChanged'), 'groups': m.get('realRecordPathGroups')} if not m['killedByTheFixture'] else {})} for n, m in record['mutants'].items()}, indent=1))
