import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { writeFileSync } from 'node:fs';
import { encodeCanonicalJson } from '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-k54o.3/packages/polaris-generation-core/dist/canonical-json.js';

const limits = { maxBytes: 2097152, maxNodes: 65536, maxDepth: 32 };
const canonical = value => encodeCanonicalJson(value, limits);
const sha256 = value => createHash('sha256').update(value).digest('hex');
const bytes = value => Buffer.byteLength(value, 'utf8');
const strict = data => new TextDecoder('utf-8', { fatal: true, ignoreBOM: true }).decode(data);
const sample = '{"owned":"fixture < & \\n 🪿 \\" escape"}\n';
const entities = { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' };
const payload = sample.replace(/[&<>"']/gu, char => entities[char]);
const view = {
  format: 'polaris-dossier-url-design-inert-view/1',
  encoding: 'html-entities-five/1',
  originalSha256: sha256(sample),
  originalBytes: bytes(sample),
  payloadSha256: sha256(payload),
  payloadBytes: bytes(payload),
  payload,
};
const envelope = canonical(view);
const buffer = Buffer.from(envelope);
const scalar = Buffer.from('🪿');
const boundary = buffer.indexOf(scalar);
assert(boundary > 0);
const cut = boundary + scalar.byteLength;
assert(buffer.includes(Buffer.from('\\\\n')));
const refs = ['fixture-parent-b', 'fixture-parent-a', 'fixture-parent-b'].map(sha256);
const pathFor = (round, ordinal) => 'round-' + round + '/design-view-part-' + ordinal + '.json';
const parts = [[0, cut], [cut, buffer.byteLength]].map(([offset, end], index) => ({
  bytes: end - offset,
  offset,
  ordinal: index + 1,
  path: pathFor(1, index + 1),
  sha256: sha256(buffer.subarray(offset, end)),
}));
const manifest = {
  format: 'polaris-dossier-url-design-ordered-delivery/1',
  originalBytes: view.originalBytes,
  originalSha256: view.originalSha256,
  envelopeBytes: buffer.byteLength,
  envelopeSha256: sha256(buffer),
  partCount: parts.length,
  parts,
  binding: {
    basePolicySha256: sha256('fixture base policy'),
    deadline: '2026-11-22T00:00:00.000Z',
    encoding: view.encoding,
    originPolicySha256: sha256('fixture origin policy'),
    originalReceiptSha256: sha256('fixture original receipt identity'),
    parentSetSha256: sha256(canonical(refs)),
    pin: sha256('fixture pin'),
    producerSha256: sha256('fixture producer'),
    profileSha256: sha256('fixture profile'),
    project: 'own-fixture-project',
    provider: 'own-fixture-provider',
    role: 'design',
    round: 1,
    run: 'own-fixture-run',
    session: 'own-fixture-session',
    transferEpoch: 1,
  },
};
const manifestBytes = canonical(manifest);
const manifestSha256 = sha256(manifestBytes);

function buildReply(entry) {
  const text = strict(buffer.subarray(entry.offset, entry.offset + entry.bytes));
  return {
    ...entry,
    text,
    count: manifest.partCount,
    envelopeSha256: manifest.envelopeSha256,
    kind: 'design-view-part',
    manifestSha256,
    ok: true,
  };
}

const replies = manifest.parts.map(buildReply);
const replyBytes = replies.map(canonical);
const plan = replyBytes.map((reply, index) => ({
  manifestSha256,
  ordinal: index + 1,
  bytes: bytes(reply),
  sha256: sha256(reply),
}));
assert(!manifestBytes.includes(plan[0].sha256));
assert(!manifestBytes.includes(manifestSha256));

function joinedText(received) {
  assert.equal(received.length, manifest.partCount);
  for (const [index, reply] of received.entries()) {
    const expected = buildReply(manifest.parts[index]);
    assert.deepEqual(reply, expected);
    assert.equal(sha256(canonical(reply)), plan[index].sha256);
  }
  const result = received.map(reply => reply.text).join('');
  assert.equal(sha256(result), manifest.envelopeSha256);
  assert.equal(result, envelope);
  return result;
}

const inverse = Object.fromEntries(Object.entries(entities).map(([raw, encoded]) => [encoded, raw]));
const original = JSON.parse(joinedText(replies)).payload.replace(/&(?:amp|lt|gt|quot|#39);/gu, token => inverse[token]);
assert.equal(original, sample);
assert.equal(sha256(original), manifest.originalSha256);

const badReply = (key, value) => [{ ...replies[0], [key]: value }, replies[1]];
const controls = [
  ['reordered', () => joinedText(replies.toReversed())],
  ['duplicate', () => joinedText([replies[0], replies[0]])],
  ['missing', () => joinedText([replies[0]])],
  ['alternate-decimal-path', () => joinedText(badReply('path', 'round-01/design-view-part-1.json'))],
  ['alternate-count', () => joinedText(badReply('count', 3))],
  ['different-envelope', () => joinedText(badReply('envelopeSha256', sha256('different')))],
  ['different-text', () => joinedText(badReply('text', replies[0].text + ' '))],
  ['unknown-member', () => joinedText(badReply('extra', 'fixture'))],
  ['split-scalar', () => buildReply({ ...parts[0], bytes: cut - 1 })],
];
for (const [, control] of controls) {
  assert.throws(control);
}

const report = {
  scope: 'Owned synthetic transport encoding vector. Uses the frozen Polaris canonical encoder. No real dossier, host send, normalization, admission or runtime conformance is claimed.',
  sample, refs, envelope, manifest, manifestBytes, manifestSha256, replyBytes, plan,
  utf8Boundary: { scalarOffset: boundary, cut },
  controls: controls.map(([name]) => name),
};
writeFileSync('d10-f3-transport-offering-253/CANONICAL-VECTOR.json', JSON.stringify(report, null, 2) + '\n', { flag: 'wx' });
