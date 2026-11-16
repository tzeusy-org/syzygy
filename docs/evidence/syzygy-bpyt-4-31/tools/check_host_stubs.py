#!/usr/bin/env python3
"""Whether every duration record's host stub agrees with host.json (syzygy-bpyt.4.31). Evidence tool, not authority.

usage: python3 -I docs/evidence/syzygy-bpyt-4-31/tools/check_host_stubs.py EVIDENCE-DIR OUT.json [--mutants]

host.json is the one host record (ruling 7). Each record the duration scripts write also carries a two-field stub,
`"host": {"cores": N, "node": "vX"}`; a stub agrees when `cores` equals host.json's `logicalCpus` and `node` its `node`. Every
.json under EVIDENCE-DIR but OUT.json is read; one whose top-level `host` has any other shape is listed by shape and not
compared. OUT.json lists every stub with its record's sha256 and its verdict, and the tool exits 1 when one disagrees.
`--mutants` changes one stub's `cores`, then its `node`, and fails unless the comparison catches each."""
import copy, hashlib, json, os, subprocess, sys

evidence_dir, out_path = sys.argv[1:3]
host = json.load(open(os.path.join(evidence_dir, 'host.json'), encoding='utf8'))
want = {'cores': host['logicalCpus'], 'node': host['node']}

def stubs_of(records, digests):
    rows, other = [], []
    for path, doc in sorted(records.items()):
        stub = doc.get('host') if isinstance(doc, dict) else None
        if stub is None: continue
        if isinstance(stub, dict) and set(stub) == set(want):
            rows.append({'record': path, 'sha256': digests[path], 'stub': stub, 'agrees': stub == want})
        else:
            other.append({'record': path, 'shape': sorted(stub) if isinstance(stub, dict) else type(stub).__name__})
    return rows, other

records, digests = {}, {}
for root, _, names in os.walk(evidence_dir):
    for name in names:
        path = os.path.join(root, name)
        if name.endswith('.json') and os.path.abspath(path) != os.path.abspath(out_path):
            raw = open(path, 'rb').read()
            records[os.path.relpath(path, evidence_dir)] = json.loads(raw)
            digests[os.path.relpath(path, evidence_dir)] = hashlib.sha256(raw).hexdigest()
rows, other = stubs_of(records, digests)
out = {'tool': 'check_host_stubs.py', 'toolSha256': hashlib.sha256(open(__file__, 'rb').read()).hexdigest(),
       'headAtRun': subprocess.run(['git', '-C', evidence_dir, 'rev-parse', 'HEAD'], capture_output=True, text=True, check=True).stdout.strip(),
       'hostRecord': {'path': 'host.json', 'logicalCpus': want['cores'], 'node': want['node']},
       'jsonFiles': len(records), 'stubs': len(rows), 'agreeing': sum(r['agrees'] for r in rows),
       'disagreeing': [r['record'] for r in rows if not r['agrees']], 'otherHostShapes': other, 'rows': rows}
if '--mutants' in sys.argv:
    target = rows[0]['record']
    out['mutants'] = []
    for mid, field, new in (('H1', 'cores', want['cores'] - 1), ('H2', 'node', want['node'] + '-mutant')):
        mutated = copy.deepcopy(records)
        old = mutated[target]['host'][field]
        mutated[target]['host'][field] = new
        caught = target in [r['record'] for r in stubs_of(mutated, digests)[0] if not r['agrees']]
        out['mutants'].append({'id': mid, 'record': target, 'path': f'host.{field}', 'old': old, 'new': new, 'outcome': 'killed' if caught else 'survived'})
open(out_path, 'w', encoding='utf8').write(json.dumps(out, indent=1, ensure_ascii=False) + '\n')
print(f"{out['agreeing']} of {out['stubs']} stubs agree with host.json over {out['jsonFiles']} JSON files; disagreeing: {out['disagreeing']}; "
      f"other host shapes: {len(other)}" + (f"; mutants {[m['id'] + ' ' + m['outcome'] for m in out['mutants']]}" if 'mutants' in out else ''))
if out['disagreeing'] or any(m['outcome'] != 'killed' for m in out.get('mutants', [])): sys.exit(1)
