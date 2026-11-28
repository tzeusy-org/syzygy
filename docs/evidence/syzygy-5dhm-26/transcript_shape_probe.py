#!/usr/bin/env python3
"""syzygy-5dhm.26: what a Claude Code transcript gives a reader of usage, as numbers and key shapes only.

Usage: transcript_shape_probe.py <transcript.jsonl> <tool version> <out.json>
Prints and stores no string value of the transcript: entry types are counted by name only when the name is a short identifier, the
usage object is reduced to its keys and value types, and the rest is counts. It answers the questions session-usage.ts rests on: do
assistant entries carry a message identity and a usage object with the four token counts; do several entries share one identity, and
if so do their counts agree; how many responses are the tool's own `<synthetic>` notices; do entries carry 24-character UTC instants.
"""
import hashlib
import json
import re
import sys
from collections import Counter, defaultdict

KEYS = ('input_tokens', 'output_tokens', 'cache_creation_input_tokens', 'cache_read_input_tokens')


def shape(value, depth=0):
    if isinstance(value, dict):
        return {k: shape(v, depth + 1) for k, v in value.items()} if depth < 2 else 'dict'
    return 'list' if isinstance(value, list) else type(value).__name__


source, version, out = sys.argv[1], sys.argv[2], sys.argv[3]
raw = open(source, 'rb').read()
types, shapes, per_id = Counter(), Counter(), defaultdict(list)
synthetic = unparsable = stamped = 0
for line in raw.split(b'\n'):
    if not line.strip():
        continue
    try:
        entry = json.loads(line)
    except ValueError:
        unparsable += 1
        continue
    kind = entry.get('type')
    types[kind if isinstance(kind, str) and re.fullmatch(r'[a-z-]{1,40}', kind) else '<other>'] += 1
    if isinstance(entry.get('timestamp'), str) and re.fullmatch(r'\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d\.\d{3}Z', entry['timestamp']):
        stamped += 1
    if kind != 'assistant':
        continue
    message = entry.get('message') or {}
    if message.get('model') == '<synthetic>':
        synthetic += 1
        continue
    usage = message.get('usage')
    shapes[json.dumps({k: shape(usage.get(k)) for k in KEYS} if isinstance(usage, dict) else shape(usage), sort_keys=True)] += 1
    per_id[message.get('id') if isinstance(message.get('id'), str) else None].append(
        tuple(usage.get(k) for k in KEYS) if isinstance(usage, dict) else None)
shared = [k for k, v in per_id.items() if len(v) > 1]
doc = {
    'bead': 'syzygy-5dhm.26',
    'subject': {'what': 'one Claude Code session transcript of this operator (a coordinator session, not a dossier run)',
                'agentTool': f'claude-code {version}', 'bytes': len(raw), 'sha256': hashlib.sha256(raw).hexdigest()},
    'label': 'Observed',
    'basis': 'counted by this script from the transcript bytes; no string value of the transcript is stored',
    'entryTypes': dict(sorted(types.items())),
    'unparsableLines': unparsable,
    'entriesWithUtcInstant': stamped,
    'assistant': {
        'responsesWithoutIdentity': len(per_id.get(None, [])),
        'syntheticNotices': synthetic,
        'usageShapes': dict(shapes),
        'entries': sum(len(v) for v in per_id.values()),
        'distinctIdentities': len(per_id),
        'identitiesWithSeveralEntries': len(shared),
        'ofThoseWhoseCountsAgree': sum(1 for k in shared if len(set(per_id[k])) == 1),
    },
}
open(out, 'w', encoding='utf-8').write(json.dumps(doc, indent=2) + '\n')
print(json.dumps(doc['assistant']))
