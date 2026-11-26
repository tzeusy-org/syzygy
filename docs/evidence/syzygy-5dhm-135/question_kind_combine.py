#!/usr/bin/env python3
"""syzygy-5dhm.135: combine the per-run replay records into one evidence record, Redis runs only.

The comprehension pilot graded Redis dossiers alone, so only those runs are compared with it; a run of another repository is counted
and left out (its unit names are that repository's paths). Usage: question_kind_combine.py <replay dir> <commit> <out.json>
"""
import json
import pathlib
import sys

src, commit, out = pathlib.Path(sys.argv[1]), sys.argv[2], pathlib.Path(sys.argv[3])
records = [json.loads(p.read_text()) for p in sorted(src.glob('run-*.json'))]
kept = [r for r in records if r['repositoryId'] == 'redis-redis']
summary = []
for r in kept:
    units = r['advice']['units'] if r['advice']['state'] == 'compared' else []
    summary.append({'run': r['run'], 'draftRevision': r['draft']['revision'], 'schemaVersion': r['draft']['schemaVersion'],
                    'taggedBlocks': r['declarations']['taggedBlocks'], 'inferredBlocks': r['declarations']['inferredBlocks'],
                    'missing': {u['unit']: u['missing'] for u in units}})
record = {
    'subject': 'syzygy-5dhm.135: the per-kind floor (REQ-polaris-generation-034 version 2.32) replayed over every stored Redis run\'s latest passed draft',
    'commit': commit,
    'caution': 'No stored draft declares questionKinds, so these declarations are a keyword proxy for an author\'s, and what follows shows what the floor reports over proxy tags, not that declarations reproduce the pilot\'s per-kind shares; any comparison with the pilot is Inferred.',
    'changeMissingInEveryMajorDirectory': None,
    'harness': 'docs/evidence/syzygy-5dhm-135/question_kind_replay.ts via question_kind_replay_all.sh',
    'label': 'Inferred',
    'basis': 'the declarations are the harness keyword rule, not an author\'s; the units are derived from each run\'s pinned tree',
    'leftOut': {'runs': len(records) - len(kept), 'why': 'not a Redis run, so not comparable with the pilot'},
    'pilot': {
        'basis': 'docs/pursuits/2026-11-21b-vision-pursuit.md, the pilot section: by question kind (third grader) the five graded dossiers '
                 'scored 0.00 to 0.50 on where to change something and 0.29 to 0.57 on how the parts fit; the newest, 658f2f90, scored '
                 '0.04 on the first',
    },
    'summary': summary,
    'runs': kept,
}
record['changeMissingInEveryMajorDirectory'] = {r['run']: all('change' in missing for unit, missing in r['missing'].items() if unit != '.') for r in summary}
out.write_text(json.dumps(record, indent=2) + '\n')
print(json.dumps({'kept': len(kept), 'leftOut': len(records) - len(kept)}))
