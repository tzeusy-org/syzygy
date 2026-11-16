#!/usr/bin/env python3
"""For the round-3 mutants the fixture does not kill, the record's published sentences under the mutant.

Usage: survivor_text.py <clone> <scratch-directory> <out.json>

Imports MUTANTS from my_mutants_r3.py beside it, runs each named survivor as the full assembler over the stored runs from a copy of the
six tool files, and stores every changed path outside exposureRanking.longGapsInTheTrace with its old and new value (the last sentence
of a text value). <scratch-directory> must not exist; it is removed at the end.
"""
import json
import pathlib
import shutil
import subprocess
import sys

text = (pathlib.Path(__file__).resolve().parent / 'my_mutants_r3.py').read_text()
ns = {}
exec(text[text.index('MUTANTS = {'):text.index('\n}\n') + 3], {}, ns)  # the mutant table only, as my_mutants_r3.py defines it
MUTANTS = ns['MUTANTS']
CLONE, SCRATCH, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
EV = CLONE / 'docs/evidence/scratch-prefix-census-2026-10-23'
COMMIT = 'a864e999645a071dda40325b2235976590e02973'
TOOLS = ('assemble_census.py', 'census_run.py', 'collect_runs.py', 'scratch_trace.cjs', 'static_sites.py', 'tmp_sampler.py')
SURVIVORS = ('r3-long-gap-strict-threshold', 'r3-published-filter-dropped')


def flatten(value, prefix=''):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from flatten(v, f'{prefix}/{k}')
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from flatten(v, f'{prefix}[{i}]')
    else:
        yield prefix, value


last_sentence = lambda v: v.rsplit('. ', 1)[-1] if isinstance(v, str) and len(v) > 200 else v
source = (EV / 'assemble_census.py').read_text()
committed = dict(flatten(json.loads((EV / 'census-2026-10-24.json').read_text())))
assert not SCRATCH.exists()
SCRATCH.mkdir()
out = {}
try:
    for name in SURVIVORS:
        old, new = MUTANTS[name]
        tools = SCRATCH / name
        tools.mkdir()
        for tool in TOOLS:
            shutil.copy(EV / tool, tools / tool)
        (tools / 'assemble_census.py').write_text(source.replace(old, new, 1))
        rec = tools / 'census.json'
        subprocess.run([sys.executable, '-I', str(tools / 'assemble_census.py'), str(CLONE), COMMIT, str(EV / 'static-sites-2026-10-24.json'), str(EV / 'runs'), str(SCRATCH / 'p'), str(rec)],
                       check=True, capture_output=True, text=True, timeout=600)
        got = dict(flatten(json.loads(rec.read_text())))
        changed = sorted(p for p in set(got) | set(committed) if got.get(p) != committed.get(p) and p != '/subject/toolSha256/assemble_census.py' and not p.startswith('/exposureRanking/longGapsInTheTrace'))
        dep = sorted({p.split('/')[4] for p in got if p.startswith('/exposureRanking/longGapsInTheTrace/publishedClassesThatDependOnThem/')})
        out[name] = {'changedOutsideTheTrace': {p: {'old': last_sentence(committed.get(p)), 'new': last_sentence(got.get(p))} for p in changed},
                     'dependentClassesUnderTheMutant': len(dep), 'dependentClasses': dep[:60]}
finally:
    shutil.rmtree(SCRATCH)
OUT.write_text(json.dumps(out, indent=1) + '\n')
print(json.dumps({n: {'paths': list(v['changedOutsideTheTrace']), 'dependent': v['dependentClassesUnderTheMutant']} for n, v in out.items()}, indent=1))
