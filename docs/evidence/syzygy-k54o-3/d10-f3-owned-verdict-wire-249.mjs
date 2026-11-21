import assert from 'node:assert/strict';
import { createHash } from 'node:crypto';
import fs from 'node:fs/promises';
import http from 'node:http';
import net from 'node:net';
import os from 'node:os';
import path from 'node:path';
import { performance } from 'node:perf_hooks';
import { pathToFileURL } from 'node:url';

const checkout = '/home/orca/orca/projects/syzygy/.worktrees/parallel-agents/syzygy-k54o.3';
const from = name => import(pathToFileURL(path.join(checkout, 'packages/polaris-dossier/dist', name + '.js')));
const [{ startSessionBroker, SESSION_BROKER_LIMITS }, { createSessionController }, { createSessionProfile, DEFAULT_SESSION_MODEL },
  { prepareRestrictedUrlSession, launchRestrictedUrlSession, verifySupportedUrlCli, URL_CLI_PROGRAM },
  { createUrlSessionBudget }, { SESSION_CONTENT_CLASSES, SESSION_POLICY_LIMITS }, { SESSION_RELAY_LIMITS },
  { inspectUrlDesignSecretContribution, verifyUrlDesignView }, { validateDesignVerdict },
  { policyFixture }, { buildDossierScreen }] = await Promise.all(
  ['session-broker', 'session-controller', 'session-profile', 'session-launch', 'url-session-budget',
    'session-egress-policy', 'session-relay', 'url-design-view', 'design-review', 'full-run.testkit', 'screen'].map(from));
const { default: ts } = await import(pathToFileURL(path.join(checkout, 'node_modules/typescript/lib/typescript.js')));
const { encodeCanonicalJson } = await import(pathToFileURL(path.join(checkout, 'packages/polaris-generation-core/dist/live.js')));

const scenario = process.argv[2];
assert(['ready', 'stale'].includes(scenario));
const started = performance.now();
const elapsed = () => Math.round(performance.now() - started);
const size = value => Buffer.byteLength(value, 'utf8');
const sha = value => createHash('sha256').update(value).digest('hex');
const canonical = value => encodeCanonicalJson(value, SESSION_POLICY_LIMITS);
const retained = JSON.parse(await fs.readFile('d10-f3-native-output-242-evidence.json')).savedDesignResult;
const captured = await fs.readFile(retained.path);
assert.equal(sha(captured), retained.sha256);
const reply = JSON.parse(captured);
assert.equal(sha(reply.text), reply.sha256);
const envelope = JSON.parse(reply.text);
const inverse = {'&amp;':'&','&lt;':'<','&gt;':'>','&quot;':'"','&#39;':"'"};
const original = envelope.payload.replace(/&(?:amp|lt|gt|quot|#39);/gu, token => inverse[token]);
assert.equal(sha(original), envelope.originalSha256);
const subject = JSON.parse(original);
const { runId, pinnedRevision } = subject;
const screenResult = buildDossierScreen(policyFixture().bytes, true, null, 'private');
assert(screenResult.ok);
const screen = screenResult.screen;
const wholeCheckStarted = elapsed();
const whole = verifyUrlDesignView({ view: Buffer.from(reply.text), original: Buffer.from(original), screen,
  expected: { runId, pinnedRevision, sha256: envelope.originalSha256, bytes: envelope.originalBytes } });
const wholeCheckMs = elapsed() - wholeCheckStarted;
assert.equal(whole.sha256, reply.sha256);
assert.equal(whole.rawActive.status, 'failed');
const packet = { sha256: whole.originalSha256, files: subject.files.map(file => file.path),
  pages: subject.files.map(file => file.path).filter(file => file.endsWith('.html')) };
assert.equal(packet.files.length, 15);
assert.equal(packet.pages.length, 12);

const source = Array.from(reply.text);
const midpoint = Math.floor(source.length / 2);
let offset = 0;
const parts = [source.slice(0, midpoint).join(''), source.slice(midpoint).join('')].map((text, index) => {
  const bytes = size(text);
  const part = { ordinal: index + 1, offset, bytes, sha256: sha(text), path: 'round-1/design-view-part-' + (index + 1) + '.json' };
  offset += bytes;
  return { part, text };
});
assert.equal(offset, whole.byteLength);
assert.equal(parts.map(part => part.text).join(''), reply.text);
const sessionId = '12345678-1234-4234-8234-123456789012';
const authorIds = new Set(['12345678-1234-4234-8234-123456789011']);
const manifest = { count: parts.length, envelopeSha256: whole.sha256, originalSha256: packet.sha256, runId,
  sessionId, round: 1, parts: parts.map(entry => entry.part) };
const manifestSha256 = sha(canonical(manifest));

const verdict = { schemaVersion: 'polaris-dossier-local-design-verdict-v1', pinnedRevision,
  packetSha256: scenario === 'stale' ? sha('stale owned packet fixture') : packet.sha256,
  sessionId, readiness: 'ready', pageReview: packet.pages.map(page => ({ page, verdict: 'acceptable', reason: 'Owned fixture review.' })),
  findings: [] };
const submission = canonical(verdict);
const problems = value => validateDesignVerdict(value, packet, pinnedRevision, authorIds).map(problem => problem.kind);

const cleanup = [];
const work = await fs.mkdtemp(path.join(os.tmpdir(), 'sg-'));
const at = relative => path.join(work, relative);
cleanup.push(() => fs.rm(work, { recursive: true, force: true }));
const sse = (type, fields) => 'event: ' + type + '\ndata: ' + JSON.stringify({type, ...fields}) + '\n\n';
try {
  for (const name of ['support','home','work','broker','relay','hidden']) await fs.mkdir(at(name), { mode: 0o700 });
  const canaries = ['source','auth','audit'].map(name => at('hidden/' + name));
  for (const file of canaries) await fs.writeFile(file, 'OWN FIXTURE CANARY');
  const audit = await fs.open(at('hidden/receipt-audit'), 'wx', 0o600);
  cleanup.push(() => audit.close());
  const supportSha256 = {};
  for (const name of ['session-bridge.js','session-mcp.js']) {
    let raw = await fs.readFile(path.join(checkout, 'packages/polaris-dossier/src', name.replace(/js$/, 'ts')), 'utf8');
    if (name === 'session-mcp.js') {
      const anchor = "{ name: 'artifact_read',";
      assert.equal(raw.split(anchor).length, 2);
      raw = raw.replace(anchor, anchor + " _meta: { 'anthropic/maxResultSizeChars': 500000 },");
    }
    const js = ts.transpileModule(raw, { compilerOptions: { target: ts.ScriptTarget.ES2022, module: ts.ModuleKind.ES2022 } }).outputText;
    supportSha256[name] = sha(js);
    await fs.writeFile(at('support/' + name), js);
  }
  const cli = await fs.realpath(path.join(os.homedir(), '.local/share/claude/versions', URL_CLI_PROGRAM.version));
  assert(await verifySupportedUrlCli(cli));
  const binding = { run: runId, role: 'design', sourceBinding: sha(pinnedRevision), policy: screen.policySha256,
    provider: 'anthropic', model: DEFAULT_SESSION_MODEL };
  const selected = createSessionProfile({ binding, sessionId,
    systemPrompt: 'Use the owned design fixture and its fixed tool instructions.', initialPrompt: 'Inspect the entire owned design packet.',
    utcDate: new Date().toISOString().slice(0,10), kernelRelease: os.release() });
  assert(selected.ok);
  const profile = selected.value.profile;
  const plans = [];
  const add = (tool, input, result) => {
    const id = 'toolu_own_' + (plans.length + 1);
    plans.push({ tool, input, call: { type: 'tool_use', id, name: 'mcp__syzygy__' + tool, input },
      result, canonical: canonical(result) });
  };
  add('dossier_step', { argv: ['dossier','poll',runId] }, { kind: 'session-control', ok: true, state: 'events',
    events: [{ event: 'design-round-prepared', round: 1, count: parts.length, manifestSha256,
      packetSha256: packet.sha256, originalBytes: whole.originalBytes, envelopeSha256: whole.sha256,
      envelopeBytes: whole.byteLength, paths: parts.map(entry => entry.part.path), pages: packet.pages.length,
      files: packet.files.length, encoding: envelope.encoding }] });
  for (const { part, text } of parts)
    add('artifact_read', { path: part.path }, { kind: 'design-view-part', ok: true, ...part,
      envelopeSha256: whole.sha256, count: parts.length, manifestSha256, text });
  add('dossier_step', { argv: ['dossier','await',at('work'),'--submit','round-1/verdict.json','--stdin'], stdin: submission },
    { kind: 'dossier-result', ok: true, stdout: canonical({ outcome: 'submitted', validatedPacketSha256: packet.sha256,
      verdictSha256: sha(submission) }), stderr: '', exit: 0 });

  let effects = 0;
  const controller = createSessionController({ profile,
    initialOrigin: { binding, id: 'initial:own', kind: 'initial-prompt', canonicalText: profile.input.initialPrompt,
      classes: ['governance-text'], originIds: ['host:own-fixture-prompt'] },
    declaredClasses: SESSION_CONTENT_CLASSES, scanSecrets: text => screen.screenSecrets(text) !== undefined,
    validateToolInput: (name, input) => plans[effects]?.call.name === name && canonical(plans[effects].input) === canonical(input),
  });
  const budget = createUrlSessionBudget({ deadline: Date.now() + 3600000, now: Date.now, turnBudget: 20, tokenBudget: 1000 });
  const requests = [], receipts = [], refused = [];
  let reconstructed = null, committed = null, brokerFaults = 0;
  const probe = net.createServer(socket => socket.end());
  await new Promise((resolve, reject) => probe.once('error', reject).listen(0, '127.0.0.1', resolve));
  cleanup.push(() => new Promise(resolve => probe.close(resolve)));
  const nodeExecutable = await fs.realpath(process.execPath);
  const prep = await prepareRestrictedUrlSession({
    view: { role: 'design', cliExecutable: cli, nodeExecutable, supportDirectory: at('support'),
      homeDirectory: at('home'), workDirectory: at('work'), brokerSocketDirectory: at('broker'),
      relaySocketDirectory: at('relay'), protectedPaths: [at('hidden')] },
    profile, expected: { nodeSha256: sha(await fs.readFile(nodeExecutable)), supportSha256 },
    current: () => true, audit: () => {}, canaries, hostLoopbackPort: probe.address().port, limits: { milliseconds: 30000 },
  });
  const broker = await startSessionBroker(at('broker/b.sock'), async (invocation, release) => {
    const plan = plans[effects];
    assert(controller.beginTool(invocation));
    assert.equal(invocation.tool, plan.tool);
    assert.equal(canonical(invocation.input), canonical(plan.input));
    if (effects === 3) {
      assert(reconstructed && reconstructed.digest === packet.sha256);
      const parsed = JSON.parse(invocation.input.stdin);
      const inputs = controller.inputOrigins('dossier_step', invocation.input, Buffer.from(invocation.input.stdin));
      assert(inputs && inputs.digest === sha(submission));
      const findings = problems(parsed);
      if (findings.length > 0) {
        refused.push({ state: 'verdict-validation', kinds: findings });
        throw new Error('owned verdict refused');
      }
    }
    const entry = { ordinal: effects + 1, tool: plan.call.name, inputSha256: sha(canonical(plan.input)),
      digest: sha(plan.canonical), bytes: size(plan.canonical), elapsedMs: elapsed() };
    const origin = { binding, id: 'tool-' + sha(plan.call.id), kind: 'tool-result', toolName: plan.call.name,
      toolInput: plan.input, canonicalText: plan.canonical, digest: entry.digest, bytes: entry.bytes,
      classes: ['governance-text'], originIds: ['host:own-fixture-manifest'] };
    await controller.onReceipt(origin);
    await audit.writeFile(canonical(entry) + '\n');
    await audit.sync();
    assert(controller.completeTool(plan.result));
    effects++;
    receipts.push(entry);
    if (effects === 4) committed = { packetSha256: packet.sha256, verdictSha256: sha(submission), elapsedMs: elapsed() };
    release(plan.result);
  }, () => brokerFaults++);
  cleanup.push(() => broker.close());

  function stream(index) {
    const plan = plans[index];
    return Buffer.from(sse('message_start', { message: { id: 'msg_own_fixture_' + index, type: 'message',
      role: 'assistant', model: DEFAULT_SESSION_MODEL, content: [], stop_reason: null, stop_sequence: null,
      usage: { input_tokens: 3, output_tokens: 0, cache_creation_input_tokens: 0, cache_read_input_tokens: 0 } } }) +
      sse('content_block_start', { index: 0, content_block: plan ? { ...plan.call, input: {} } : { type: 'text', text: '' } }) +
      sse('content_block_delta', { index: 0, delta: plan ? { type: 'input_json_delta', partial_json: canonical(plan.input) } :
        { type: 'text_delta', text: 'Owned fixture complete.' } }) + sse('content_block_stop', { index: 0 }) +
      sse('message_delta', { delta: { stop_reason: plan ? 'tool_use' : 'end_turn', stop_sequence: null }, usage: { output_tokens: 4 } }) +
      sse('message_stop', {}));
  }
  function respond(outgoing, body, status = 200, type = 'text/event-stream') {
    outgoing.writeHead(status, { 'content-type': type, 'content-length': body.length, connection: 'close' });
    outgoing.end(body);
  }
  const no = Buffer.from('{}');
  const relay = http.createServer({ requestTimeout: 30000, headersTimeout: 30000, maxHeaderSize: 16384 }, (incoming, outgoing) => {
    let bytes = 0;
    const chunks = [];
    incoming.on('data', chunk => {
      bytes += chunk.length;
      if (bytes > SESSION_RELAY_LIMITS.requestBytes) incoming.destroy();
      else chunks.push(chunk);
    });
    incoming.on('end', () => {
      let stage = 'request';
      try {
        const count = requests.length;
        if (incoming.url !== '/v1/messages?beta=true' || incoming.method !== 'POST' || count !== effects) throw new Error();
        const wire = Buffer.concat(chunks, bytes);
        const checked = controller.request(wire);
        if (!checked.ok || !budget.reserve('design', checked.admission)) throw new Error();
        assert(checked.body.byteLength <= SESSION_RELAY_LIMITS.requestBytes);
        const request = JSON.parse(Buffer.from(checked.body));
        const messages = request.messages;
        assert.equal(messages.length, 2 * count + 1);
        const results = messages.flatMap(message => Array.isArray(message.content) ? message.content.filter(block => block.type === 'tool_result') : []);
        assert.equal(results.length, count);
        const projections = results.map((result, index) => {
          assert.equal(result.tool_use_id, plans[index].call.id);
          assert.equal(result.content[0].text, plans[index].canonical + '\n');
          assert.equal(result.content.length, 2);
          return { bytes: size(result.content[0].text), sha256: sha(result.content[0].text), reminderBytes: size(result.content[1].text) };
        });
        stage = 'reassembly';
        if (count === 3) {
          const strings = results.slice(1).map(result => JSON.parse(result.content[0].text).text);
          assert.equal(strings.join(''), reply.text);
          reconstructed = inspectUrlDesignSecretContribution(strings.join(''), runId, (_view, original, fields) => {
            assert.equal(sha(original), packet.sha256);
            for (const file of fields.files) assert.equal(sha(file.content), file.sha256);
            return { digest: sha(original), bytes: size(original), files: fields.files.length, pages: packet.pages.length };
          });
        }
        stage = 'response';
        const response = stream(count);
        assert(controller.response(response, 'text/event-stream').ok);
        assert(budget.observeUsage('design', { inputTokens: 3, outputTokens: 4, cacheCreationInputTokens: 0, cacheReadInputTokens: 0 }));
        requests.push({ rawBytes: bytes, projectedBytes: checked.body.byteLength, projectedSha256: sha(checked.body),
          messages: messages.length, replyBytes: response.length, projections, elapsedMs: elapsed() });
        respond(outgoing, response);
      } catch {
        refused.push({ state: stage, rawBytes: bytes });
        respond(outgoing, no, 403, 'application/json');
      }
    });
  });
  const relaySocket = at('relay/r.sock');
  await new Promise((resolve, reject) => relay.once('error', reject).listen(relaySocket, resolve));
  await fs.chmod(relaySocket, 0o600);
  let closed;
  const close = () => closed ??= (async () => {
    relay.closeAllConnections();
    await new Promise(resolve => relay.close(resolve));
    await fs.rm(relaySocket, {force: true});
    return broker.close();
  })();
  cleanup.push(close);
  const child = await launchRestrictedUrlSession({ preparation: prep, host: { brokerSocket: broker.socket, relaySocket, close } });
  cleanup.push(child.stop);
  const result = await child.finished;
  const written = await fs.readFile(at('hidden/receipt-audit'));
  assert.equal(written.toString(), receipts.map(entry => canonical(entry) + '\n').join(''));
  const peak = Math.max(0, ...requests.flatMap(row => [row.rawBytes, row.projectedBytes]));
  process.stdout.write(canonical({ scenario, retainedSha256: retained.sha256, fullReplyBytes: captured.length,
    envelopeSha256: whole.sha256, wholeCheckMs, requests, receipts, manifestSha256, reconstructed, committed, refused,
    brokerFaults, budget: budget.snapshot(), auditSha256: sha(written), peakBytes: peak,
    requestHeadroom: SESSION_RELAY_LIMITS.requestBytes - peak, brokerLimit: SESSION_BROKER_LIMITS?.maxBytes ?? null,
    groupTermination: result.groupTermination, outcome: result.outcome, exitCode: result.exitCode,
    elapsedMs: elapsed(), version: URL_CLI_PROGRAM.version, supportSha256 }) + '\n');
} finally {
  for (const release of cleanup.reverse()) await release();
}
