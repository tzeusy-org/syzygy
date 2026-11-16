#!/usr/bin/env python3
"""Round-3 reviewer mutants of long_gap_trace (and its call site), run against the fixture and against the stored runs.

Usage: my_mutants_r3.py <clone> <scratch-directory> <out.json>

For each mutant: the fragment `old` must occur in the code above `def selftest(` exactly once, as the assembler's own self-test
requires; the first occurrence is replaced by `new`. The mutant runs `--classify-fixture` and is killed when its answer differs from
the committed self-test record's `expected`. Every mutant then also runs as the full assembler over the stored runs, from a copy of
the six tool files, and the census paths it changes are listed. <scratch-directory> must not exist; it is removed at the end.
"""
import json
import pathlib
import shutil
import subprocess
import sys

CLONE, SCRATCH, OUT = pathlib.Path(sys.argv[1]), pathlib.Path(sys.argv[2]), pathlib.Path(sys.argv[3])
EV = CLONE / 'docs/evidence/scratch-prefix-census-2026-10-23'
COMMIT = 'a864e999645a071dda40325b2235976590e02973'
TOOLS = ('assemble_census.py', 'census_run.py', 'collect_runs.py', 'scratch_trace.cjs', 'static_sites.py', 'tmp_sampler.py')
MUTANTS = {
    'r3-long-gap-strict-threshold': (
        "is_long = lambda earlier, later: round(later - earlier, 2) >= 2 * interval",
        "is_long = lambda earlier, later: round(later - earlier, 2) > 2 * interval"),
    'r3-trace-offset-wrong-sign': (
        "created = {name: row['t'] / 1000 - offset for name, row in first_row.items()}",
        "created = {name: row['t'] / 1000 + offset for name, row in first_row.items()}"),
    'r3-offset-is-the-upper-bound': (
        "offset = (lower + upper) / 2",
        "offset = upper"),
    'r3-start-instant-dropped': (
        "known = sorted({seen[edge] for seen in entries.values() for edge in ('first', 'last')} | {0.0})",
        "known = sorted({seen[edge] for seen in entries.values() for edge in ('first', 'last')})"),
    'r3-gap-membership-closed-at-the-start': (
        "inside = [name for name, made in created.items() if earlier < made <= later]",
        "inside = [name for name, made in created.items() if earlier <= made < later]"),
    'r3-gap-before-the-first-sighting-is-the-sighting-itself': (
        "        before = known[max(bisect.bisect_left(known, first) - 1, 0)]\n        after = bisect.bisect_right(known, last)",
        "        before = known[max(bisect.bisect_right(known, first) - 1, 0)]\n        after = bisect.bisect_right(known, last)"),
    'r3-dependent-needs-both-reasons': (
        "if slot['neverSampledCreatedInALongGap'] or slot['sampledWithALongGapBesideItsSightings']}",
        "if slot['neverSampledCreatedInALongGap'] and slot['sampledWithALongGapBesideItsSightings']}"),
    'r3-published-filter-dropped': (
        "        if cls not in published:\n            continue\n        slot = by_class",
        "        slot = by_class"),
}


def flatten(value, prefix=''):
    if isinstance(value, dict):
        for k, v in value.items():
            yield from flatten(v, f'{prefix}/{k}')
    elif isinstance(value, list):
        for i, v in enumerate(value):
            yield from flatten(v, f'{prefix}[{i}]')
    else:
        yield prefix, value


source = (EV / 'assemble_census.py').read_text()
code = source[:source.index('def selftest(')]
expected = json.loads((EV / 'assemble-selftest-2026-10-24.json').read_text())['expected']
committed = dict(flatten(json.loads((EV / 'census-2026-10-24.json').read_text())))
assert not SCRATCH.exists(), 'give a scratch directory that does not exist'
SCRATCH.mkdir()
results = {}
try:
    for name, (old, new) in MUTANTS.items():
        assert code.count(old) == 1, (name, code.count(old))
        tools = SCRATCH / name
        tools.mkdir()
        for tool in TOOLS:
            shutil.copy(EV / tool, tools / tool)
        (tools / 'assemble_census.py').write_text(source.replace(old, new, 1))
        ran = subprocess.run([sys.executable, '-I', str(tools / 'assemble_census.py'), '--classify-fixture'], capture_output=True, text=True, timeout=120)
        try:
            answer = json.loads(ran.stdout)
        except json.JSONDecodeError:
            answer = None
        diverges = 'stopped with an error: ' + (ran.stderr.strip().splitlines() or [''])[-1] if answer is None else sorted(
            f'{part}: {k}' for part in expected for k in expected[part] if answer[part].get(k) != expected[part][k])
        probe = SCRATCH / f'p{len(results)}'
        out = tools / 'census.json'
        full = subprocess.run([sys.executable, '-I', str(tools / 'assemble_census.py'), str(CLONE), COMMIT, str(EV / 'static-sites-2026-10-24.json'), str(EV / 'runs'), str(probe), str(out)],
                              capture_output=True, text=True, timeout=600)
        if full.returncode == 0:
            got = dict(flatten(json.loads(out.read_text())))
            changed = sorted(p for p in set(got) | set(committed) if got.get(p, '<absent>') != committed.get(p, '<absent>') and p != '/subject/toolSha256/assemble_census.py')
            record_effect = {'paths': len(changed), 'firstPaths': changed[:12]}
        else:
            record_effect = {'exit': full.returncode, 'lastLine': (full.stderr.strip().splitlines() or [''])[-1]}
        results[name] = {'old': old, 'new': new, 'killedByTheFixture': answer != expected, 'fixtureExit': ran.returncode, 'diverges': diverges, 'effectOnTheRecord': record_effect}
        print(name, results[name]['killedByTheFixture'], json.dumps(record_effect)[:300], flush=True)
finally:
    shutil.rmtree(SCRATCH)
OUT.write_text(json.dumps({'tool': 'my_mutants_r3.py', 'assembler': 'docs/evidence/scratch-prefix-census-2026-10-23/assemble_census.py at 367dbb7b', 'mutants': results}, indent=1) + '\n')
