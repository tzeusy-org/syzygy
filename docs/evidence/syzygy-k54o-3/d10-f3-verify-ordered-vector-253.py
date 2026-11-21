from hashlib import sha256
import json
from pathlib import Path

root = Path('d10-f3-transport-offering-253')
vector = json.loads((root / 'CANONICAL-VECTOR.json').read_bytes())
encode = lambda value: json.dumps(value, ensure_ascii=False, separators=(',', ':'), sort_keys=True).encode()
digest = lambda value: sha256(value).hexdigest()
manifest = vector['manifest']
envelope = vector['envelope'].encode()
source = vector['sample'].encode()
manifest_bytes = encode(manifest)
assert manifest_bytes == vector['manifestBytes'].encode()
assert digest(manifest_bytes) == vector['manifestSha256']
assert digest(encode(vector['refs'])) == manifest['binding']['parentSetSha256']
assert len(set(vector['refs'])) < len(vector['refs'])
assert digest(envelope) == manifest['envelopeSha256']
assert len(envelope) == manifest['envelopeBytes']
assert digest(source) == manifest['originalSha256']
assert len(source) == manifest['originalBytes']
assert encode(json.loads(envelope)) == envelope
actual = [item.encode() for item in vector['replyBytes']]
fragments = []
assert len(actual) == manifest['partCount'] == len(manifest['parts'])
for reply, row, plan in zip(actual, manifest['parts'], vector['plan'], strict=True):
    obj = json.loads(reply)
    assert reply == encode(obj)
    assert digest(reply) == plan['sha256']
    assert len(reply) == plan['bytes']
    assert plan['manifestSha256'] == obj['manifestSha256'] == vector['manifestSha256']
    fragment = envelope[row['offset']:row['offset'] + row['bytes']]
    assert fragment.decode('utf-8', 'strict') == obj['text']
    assert digest(fragment) == obj['sha256'] == row['sha256']
    assert obj['ordinal'] == row['ordinal'] == plan['ordinal']
    assert obj['count'] == manifest['partCount']
    fragments.append(fragment)
assert b''.join(fragments) == envelope
offset = vector['utf8Boundary']['scalarOffset']
cut = vector['utf8Boundary']['cut']
assert cut - offset == 4 and envelope[offset:cut].decode() == chr(0x1fabf)
assert b'\\\\n' in envelope
print(f'Independent JSON/digest/UTF-8 verifier matched {len(fragments)} exact replies and the full original.')
