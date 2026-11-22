#!/usr/bin/env python3
"""Bind the owned diagnostic patch, built runtime and parent bytes."""
from datetime import datetime, timezone
from pathlib import Path
import hashlib
import json
import subprocess
import sys

BASE = 'db7dbbd88db2bfc50dd4e8bfd36e4fae5f28de28'
PRIOR = '27e83c50b66723f2b87c54e7ea254c7f401507a7'
TREE = '47a78059cdb43a89784de2c0ebf458267f88641d'
EXPECTED_DELTA = ['packages/polaris-dossier/src/session-launch.test.ts']

def sha(data):
    return hashlib.sha256(data).hexdigest()

def official(root, relative):
    if Path(relative).is_absolute() or '..' in Path(relative).parts:
        raise ValueError('invalid manifest path')
    return (root / relative).read_bytes()

def matches(root, item):
    raw = official(root, item['path'])
    return len(raw) == item['bytes'] and sha(raw) == item['sha256']

def bind(root, patch):
    def git(*args):
        return subprocess.check_output(['git', *args], cwd=root)
    if git('rev-parse', 'HEAD', 'HEAD^{tree}').decode().splitlines() != [BASE, TREE]:
        raise ValueError('unexpected diagnostic checkout identity')
    if git('diff', '--binary') != patch:
        raise ValueError('working tree differs from frozen diagnostic patch')
    delta = git('diff', '--name-only', PRIOR, BASE).decode().splitlines()
    if delta != EXPECTED_DELTA:
        raise ValueError('unexpected product delta from uninstrumented input')
    changed = git('diff', '--name-only').decode().splitlines()
    tracked = set(git('ls-files', '-z').decode().split('\0'))
    input_hashes = {relative: {'before': sha(git('show', f'{BASE}:{relative}')),
                                'after': sha(official(root, relative))} for relative in changed}
    runtime = root / 'packages/polaris-dossier/dist/runtime'
    manifest_file = runtime / 'manifest.json'
    manifest_raw = manifest_file.read_bytes()
    manifest = json.loads(manifest_raw)
    inputs, outputs = manifest['inputs'], manifest['files']
    current_inputs = sum(matches(root, item) for item in inputs)
    current_outputs = sum(matches(runtime, item) for item in outputs)
    changed_built = [item['path'] for item in inputs if item['path'] in input_hashes]
    unchanged_tracked = [item for item in inputs if item['path'] not in changed and item['path'] in tracked]
    checked_unmodified = sum(sha(git('show', f'{BASE}:{item["path"]}')) == item['sha256'] for item in unchanged_tracked)
    if current_inputs != len(inputs) or current_outputs != len(outputs) or checked_unmodified != len(unchanged_tracked):
        raise ValueError('runtime manifest does not bind the exact checkout')
    if any(input_hashes[p]['after'] != next(row['sha256'] for row in inputs if row['path'] == p) for p in changed_built):
        raise ValueError('runtime input does not bind diagnostic source')
    return {
        'sourceCommit': BASE, 'sourceTree': TREE, 'priorUninstrumentedBytesCommit': PRIOR,
        'baseDeltaFiles': delta, 'overlaySha256': sha(patch), 'changedSourceSha256': input_hashes,
        'runtime': {
            'manifestSha256': sha(manifest_raw),
            'manifestTimeUtc': datetime.fromtimestamp(manifest_file.stat().st_mtime, timezone.utc).isoformat(timespec='milliseconds'),
            'inputTreeSha256': manifest['inputTreeSha256'], 'manifestInputs': len(inputs),
            'inputsMatchingPhysicalBytes': current_inputs, 'unmodifiedTrackedInputsMatchingBase': checked_unmodified,
            'overlayManifestInputs': sorted(changed_built),
            'overlayFixtureOrUnbundledFiles': sorted(set(changed) - set(changed_built)),
            'installInputsMatchingManifest': len(inputs) - checked_unmodified - len(changed_built),
            'manifestOutputs': len(outputs), 'outputsMatchingPhysicalBytes': current_outputs,
        },
    }

if __name__ == '__main__':
    if len(sys.argv) != 3:
        raise SystemExit('usage: bind_source.py DIAGNOSTIC_CHECKOUT OVERLAY_PATCH')
    print(json.dumps(bind(Path(sys.argv[1]), Path(sys.argv[2]).read_bytes()), indent=2))
