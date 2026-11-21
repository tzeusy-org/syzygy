import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import { readFile } from 'node:fs/promises';
import { registerHooks } from 'node:module';
import { pathToFileURL } from 'node:url';

const dist = '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-k54o.3/packages/polaris-dossier/dist/';
const source = dist + 'session-egress-policy.js';
const url = pathToFileURL(source).href;
const hooks = registerHooks({ load(candidate, context, next) {
  const loaded = next(candidate, context);
  return candidate === url ? { ...loaded, source: Buffer.from(loaded.source).toString('utf8') + '\nexport { screenSteps };\n' } : loaded;
}});
let isolated;
try { isolated = await import(url); } finally { hooks.deregister(); }
const { SESSION_POLICY_LIMITS: limits, screenSteps } = isolated;
const { policyFixture } = await import(pathToFileURL(dist + 'full-run.testkit.js'));
const { buildDossierScreen } = await import(pathToFileURL(dist + 'screen.js'));
const { inspectUrlDesignSecretContribution } = await import(pathToFileURL(dist + 'url-design-view.js'));
const { encodeCanonicalJson } = await import(pathToFileURL(dist.replace('polaris-dossier', 'polaris-generation-core') + 'live.js'));
const canonical = value => encodeCanonicalJson(value, limits);
const sha = text => createHash('sha256').update(text).digest('hex');
const size = text => Buffer.byteLength(text);
const proof = JSON.parse(await readFile('d10-f3-native-output-242-evidence.json'));
const raw = await readFile(proof.savedDesignResult.path);
assert.equal(sha(raw), proof.savedDesignResult.sha256);
const whole = JSON.parse(raw);
assert.equal(canonical(whole), raw.toString());
const envelope = JSON.parse(whole.text);
const entities = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};
const original = envelope.payload.replace(/&(?:amp|lt|gt|quot|#39);/gu, token => entities[token]);
const { runId } = JSON.parse(original);
assert.equal(sha(original), envelope.originalSha256);
const loaded = buildDossierScreen(policyFixture().bytes, true, null, 'private');
assert(loaded.ok);
const { screen } = loaded;
const binding = { run: runId, role: 'design' };
const callId = 'toolu_own_design';
const initial = {role:'user', content:'Owned projection fixture before the design packet.'};
const tail = {role:'assistant', content:[{type:'text', text:'Owned projection fixture after the design packet.'}]};
const reminder = '<system-reminder>Owned fixture accounting.</system-reminder>';
const tool = 'mcp__syzygy__artifact_read';
const use = (id, path) => ({role:'assistant', content:[{type:'tool_use', id, name:tool, input:{path}}]});
const result = (id, artifact) => ({role:'user', content:[{type:'tool_result', tool_use_id:id,
  content:[{type:'text', text:canonical(artifact)+'\n'}, {type:'text', text:reminder}]}]});
const legacy = [initial, use(callId, whole.path), result(callId, whole), tail];
const legacyReceipt = {kind:'tool-result', toolName:tool, toolUseId:callId, toolInput:{path:whole.path}, canonicalText:canonical(whole)};
const characters = Array.from(whole.text);
const half = Math.floor(characters.length / 2);
const pieces = [characters.slice(0, half).join(''), characters.slice(half).join('')];
const segmentPairs = pieces.map((text, index) => {
  const id = callId + '_' + (index + 1);
  const path = 'round-1/design-view-part-' + (index + 1) + '.json';
  const body = {kind:'design-view-part', ok:true, path, ordinal:index+1, count:pieces.length, sha256:sha(text), text};
  return [use(id,path), result(id, body)];
});
const actual = [initial, ...segmentPairs.flat(), tail];
const expected = pieces.map((text, index) => ({ordinal:index+1, bytes:size(text), sha256:sha(text)}));
const deliveredPieces = actual.slice(1, -1).filter(item => item.role === 'user').map((item, index) => {
  const parsed = JSON.parse(item.content[0].content[0].text);
  const row = expected[index];
  assert.equal(parsed.ordinal, row.ordinal);
  assert.equal(size(parsed.text), row.bytes);
  assert.equal(sha(parsed.text), row.sha256);
  return parsed.text;
});
const combined = deliveredPieces.join('');
assert.equal(sha(combined), whole.sha256);
assert.equal(size(combined), size(whole.text));
assert.equal(inspectUrlDesignSecretContribution(combined, runId, (_, decoded) => sha(decoded)), envelope.originalSha256);
const rebuilt = {kind:'artifact', ok:true, path:whole.path, sha256:sha(combined), text:combined};
const projected = [actual[0], use(callId, rebuilt.path), result(callId, rebuilt), actual.at(-1)];
const projectedReceipt = {...legacyReceipt, canonicalText:canonical(rebuilt)};
assert.equal(canonical(rebuilt), raw.toString());
assert.equal(canonical(projected), canonical(legacy));

function projections(messages, receipts, rejectedDigest = null) {
  const seen = [];
  const add = (kind, text, checker) => {
    const digest = sha(text);
    seen.push({kind, bytes:size(text), sha256:digest});
    return digest === rejectedDigest || checker(text) !== undefined;
  };
  const steps = screenSteps({messages}, {
    binding, limits,
    scanSecrets: text => add('secret', text, screen.screenSecrets),
    scanDesignView: text => add('inert', text, screen.screenBody),
  }, receipts);
  let refused = false;
  try { for (const _ of steps) { /* Exhaust current production checks. */ } } catch { refused = true; }
  return {seen, refused};
}
const old = projections(legacy, [legacyReceipt]);
const shadow = projections(projected, [projectedReceipt]);
const real = projections(actual, []);
assert(!old.refused && !shadow.refused && !real.refused);
assert.deepEqual(old.seen, shadow.seen);
const trials = [
  { label:'reassembled-encoded-body', digest:sha(whole.text), input:'shadow', present:shadow.seen },
  { label:'whole-reply-wrapper', digest:sha(canonical(whole)), input:'shadow', present:shadow.seen },
  { label:'whole-logical-request', digest:sha(canonical({messages:legacy})), input:'shadow', present:shadow.seen },
  { label:'numbered-native-request', digest:sha(canonical({messages:actual})), input:'actual', present:real.seen },
];
for (const trial of trials) {
  assert(trial.present.some(projection => projection.sha256 === trial.digest));
  const actualInput = trial.input === 'actual';
  const run = projections(actualInput ? actual : projected, actualInput ? [] : [projectedReceipt], trial.digest);
  assert(run.refused && run.seen.at(-1).sha256 === trial.digest);
}
const summarize = rows => ({
  count: rows.length, digest:sha(canonical(rows)),
  bytes: rows.reduce((total, row) => total + row.bytes, 0),
  peakBytes: Math.max(...rows.map(row => row.bytes)),
  inert:rows.filter(row => row.kind === 'inert').length
});
process.stdout.write(canonical({ whole: summarize(old.seen), reconstructed: summarize(shadow.seen), numbered: summarize(real.seen),
  controls: trials.map(({label,digest,input}) => ({label,digest,input,refused:true})),
  envelopeSha256:whole.sha256, inputPathFlag:'own-fixture-only', instrumentedCompiledSourceSha256:sha(await readFile(source)) })+'\n');
