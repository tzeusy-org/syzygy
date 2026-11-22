import { afterEach, describe, expect, it, vi } from 'vitest';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { createUrlSessionControl, invokeUrlSessionControl, isUrlSessionControlPort, type UrlSessionAnswer, type UrlSessionControlAudit,
  type UrlSessionControlOptions, type UrlSessionControlPort, type UrlSessionQuestionFrame } from './session-control.js';
import type { DossierScreen } from './screen.js';
import type { ViewRole } from './session-view.js';
import type { SessionToolOrigins } from './session-tools.js';

const RUN = '/own/run-fixture';
const BASE = { run: 'run-fixture', sourceBinding: 'a'.repeat(64), policy: '7'.repeat(64), provider: 'anthropic', model: 'own-model' };
const encode = (value: unknown) => encodeCanonicalJson(value, { maxBytes: 65_536, maxNodes: 512, maxDepth: 8 });
const scan = (s: string) => /SYNTHETIC_SECRET|CROSSBOUNDARY/u.test(s) ? 'secret-detector-match' as const : undefined;
const screen: DossierScreen = { policyId: 'own-policy', policyVersion: '8', policySha256: BASE.policy, projectDocumentation: true,
  codeContentExemption: true, governanceText: true, documentationExemption: true, scopeDetectors: 1, secretRedaction: true, visibility: 'private',
  stageOf: () => 1, twoStage: false, configurationDetectors: 0,
  scannedAsBefore: s => scan(s) !== undefined || s.includes('<script'),
  screenPath: () => undefined, contentClass: () => 'project-documentation', screenSecrets: scan,
  screenBody: s => scan(s) ?? (s.includes('<script') ? 'active-content' : undefined),
  screenTargetBody: () => ({ kind: 'admitted' }), activeContentAsBefore: s => s.includes('<script') };
const controls: ReturnType<typeof createUrlSessionControl>[] = [];
afterEach(() => { for (const control of controls.splice(0)) control.close(); });
const flush = async () => { for (let n = 0; n < 100; n++) await Promise.resolve(); };
function deferred<T>() { let resolve!: (value: T) => void; const promise = new Promise<T>(r => { resolve = r; }); return { promise, resolve }; }
function fixture(changes: Partial<UrlSessionControlOptions> = {}) {
  const audits: UrlSessionControlAudit[] = [], failures: string[] = [], frames: UrlSessionQuestionFrame[] = [], order: string[] = [];
  const answer = deferred<UrlSessionAnswer>();
  const config: UrlSessionControlOptions = { run: RUN, binding: BASE, screen, maxQuestions: 2, current: () => true,
    reserveQuestion: () => { order.push('reserve'); return true; },
    audit: event => { audits.push(event); order.push(event.event); },
    ask: frame => { frames.push(frame); order.push('UI'); return answer.promise; }, onFailure: reason => { failures.push(reason); },
    limits: { callbackMilliseconds: 20, pollMilliseconds: 1 }, ...changes };
  const control = createUrlSessionControl(config); controls.push(control);
  const rolePorts = new Map((['author', 'inventory', 'fidelity', 'design'] as const).map(role => [role, control.forRole(role)]));
  const port = (role: ViewRole = 'author') => rolePorts.get(role)!;
  const origin = (payload: string, id = 'provider:issued-question'): SessionToolOrigins => ({ digest: sha256(payload),
    classes: ['derived-composites', 'project-documentation'], originIds: [id] });
  const invoke = (value?: unknown, role: ViewRole = 'author', origins?: SessionToolOrigins | null) => {
    const payload = value === undefined ? undefined : typeof value === 'string' ? value : encode(value);
    return invokeUrlSessionControl(port(role), { ...BASE, role }, RUN, payload === undefined ? 'poll' : 'clarify', payload,
      payload === undefined ? null : origins === undefined ? origin(payload) : origins);
  };
  return { control, config, audits, failures, frames, order, answer, invoke, origin, port };
}
const QUESTION = { kind: 'question', question: 'Which description matches your intent?', options: ['Own option A', 'Own option B'], consequence: 'The answer is attributed as an inference.' };
const answered = (frame: UrlSessionQuestionFrame, extra = {}): UrlSessionAnswer => ({ kind: 'answered', nonce: frame.nonce,
  questionSha256: frame.questionSha256, answerKind: 'selected-interpretation', answer: 'Own option B', ...extra });

describe('typed URL session control', () => {
  it('requires a genuine role/run/binding capability and does not admit a copied port', async () => {
    const f = fixture(), port = f.port();
    expect(isUrlSessionControlPort(port, { ...BASE, role: 'author' }, RUN)).toBe(true);
    for (const [candidate, binding, run] of [[{ ...port }, { ...BASE, role: 'author' }, RUN], [port, { ...BASE, role: 'design' }, RUN],
      [port, { ...BASE, role: 'author', model: 'other-model' }, RUN], [port, { ...BASE, role: 'author' }, '/other/run-fixture']] as const) {
      expect(isUrlSessionControlPort(candidate as UrlSessionControlPort, binding, run)).toBe(false);
      await expect(invokeUrlSessionControl(candidate as UrlSessionControlPort, binding, run, 'poll', undefined, null)).rejects.toThrow('session-control-unavailable');
    }
    expect(f.audits).toEqual([]);
  });

  it('delivers only closed per-role events after audit, deduplicates, and leaves safe empty polls pending', async () => {
    const f = fixture();
    expect(await f.control.publish('author', { event: 'draft-ready', revision: 3 })).toBe(true);
    expect(await f.control.publish('author', { event: 'draft-ready', revision: 3 })).toBe(true);
    expect(await f.control.publish('design', { event: 'review-blocked', review: 'design', revision: 3 })).toBe(true);
    expect(await f.control.publish('inventory', { event: 'inventory-repair', revision: 4 })).toBe(true);
    expect(await f.control.publish('fidelity', { event: 'run-terminal', outcome: 'Unknown' })).toBe(true);
    expect((await f.invoke()).reply).toEqual({ ok: true, kind: 'session-control', state: 'events', events: [{ event: 'draft-ready', revision: 3, sequence: 1 }] });
    expect((await f.invoke()).reply).toMatchObject({ state: 'pending', events: [] });
    expect((await f.invoke(undefined, 'design')).reply).toMatchObject({ events: [{ event: 'review-blocked', review: 'design', revision: 3, sequence: 2 }] });
    expect(f.audits).toHaveLength(4);
    expect(encode(f.audits)).not.toContain('question');
    expect(Object.isFrozen((await f.invoke(undefined, 'inventory')).reply)).toBe(true);
  });

  it('wakes the design waiter only after the scoped round notice is audited', async () => {
    const held = deferred<void>();
    const f = fixture({ audit: () => held.promise, limits: { callbackMilliseconds: 500, designWaitMilliseconds: 500, pollMilliseconds: 1 } });
    const notice = { event: 'design-round-prepared', round: 2, path: 'round-2/design-view.json',
      packetSha256: 'a'.repeat(64), viewSha256: 'b'.repeat(64) } as const;
    for (const role of ['author', 'inventory', 'fidelity'] as const) expect(await f.control.publish(role, notice)).toBe(false);
    expect(await f.control.publish('design', { ...notice, path: 'round-1/design-view.json' })).toBe(false);
    expect(await f.control.publish('design', { ...notice, viewSha256: notice.packetSha256 })).toBe(false);
    let delivered = false;
    const waiting = f.invoke(undefined, 'design').then(value => { delivered = true; return value; });
    const publication = f.control.publish('design', notice);
    await flush();
    expect(delivered).toBe(false);
    expect((await f.invoke()).reply).toMatchObject({ state: 'pending', events: [] });
    held.resolve();
    expect(await publication).toBe(true);
    expect((await waiting).reply).toEqual({ ok: true, kind: 'session-control', state: 'events', events: [{ ...notice, sequence: 1 }] });
    const stopped = f.invoke(undefined, 'design');
    await flush();
    f.control.close();
    await expect(stopped).rejects.toThrow('session-control-unavailable');
  });

  it.each([{ event: 'draft-ready', revision: -1 }, { event: 'draft-ready', revision: 1, message: 'arbitrary text' },
    { event: 'review-blocked', review: 'author', revision: 1 }, { event: 'run-terminal', outcome: 'accepted' }])('refuses open or invalid event metadata %j', async event => {
    const f = fixture(); expect(await f.control.publish('author', event as never)).toBe(false);
    expect(f.audits).toEqual([]); expect((await f.invoke()).reply).toMatchObject({ events: [] });
  });

  it('reserves queue space before a deferred audit so concurrent publications cannot exceed capacity', async () => {
    const held = deferred<void>();
    const f = fixture({ limits: { maxQueuedPerRole: 1, callbackMilliseconds: 100 }, audit: () => held.promise });
    const first = f.control.publish('author', { event: 'draft-ready', revision: 1 }); await flush();
    expect(await f.control.publish('author', { event: 'draft-ready', revision: 2 })).toBe(false);
    expect(f.failures).toEqual(['capacity-exhausted']); held.resolve(); expect(await first).toBe(false);
    await expect(f.invoke()).rejects.toThrow();
  });

  it('spends the question slot before UI, binds the exact question/nonce/answer, and delivers one checked Inferred answer with provider provenance', async () => {
    const f = fixture(); const start = await f.invoke(QUESTION); await flush();
    expect(start.reply).toMatchObject({ kind: 'session-clarification', state: 'pending' });
    expect(f.order).toEqual(['reserve', 'clarification-question', 'UI']);
    expect(f.frames).toHaveLength(1); const frame = f.frames[0]!;
    expect(frame.questionSha256).toBe(sha256(encode(QUESTION))); expect(frame.nonce).toMatch(/^[a-f0-9]{32}$/u);
    expect(Object.isFrozen(frame.question)).toBe(true);
    const request = { kind: 'answer', nonce: frame.nonce, questionSha256: frame.questionSha256 };
    expect((await f.invoke(request)).reply).toMatchObject({ state: 'pending' });
    f.answer.resolve(answered(frame)); await flush();
    const result = await f.invoke(request, 'author', f.origin(encode(request), 'provider:issued-retrieval'));
    expect(result.reply).toMatchObject({ state: 'answered', attribution: 'operator', label: 'Inferred', answer: 'Own option B', answerKind: 'selected-interpretation' });
    expect(result.classes).toEqual(['derived-composites', 'project-documentation', 'work-history']);
    expect(result.originIds).toContain('provider:issued-question'); expect(result.originIds).toContain('provider:issued-retrieval');
    expect(result.originIds).toContain(`url-control:question:${frame.questionSha256}`);
    expect(result.originIds).toContain(`url-control:answer:${sha256('Own option B')}`);
    expect(f.audits.map(v => v.event)).toEqual(['clarification-question', 'clarification-answer']);
    const audit = encode(f.audits); expect(audit).not.toContain(QUESTION.question); expect(audit).not.toContain('Own option B'); expect(audit).not.toContain(frame.nonce);
    await expect(f.invoke(request)).rejects.toThrow(); expect(f.failures).toEqual(['invalid-request']);
  });

  it.each(['inventory', 'fidelity', 'design'] as const)('refuses %s questions before budget/UI', async role => {
    const f = fixture(); await expect(f.invoke(QUESTION, role)).rejects.toThrow(); expect(f.order).toEqual([]);
  });

  it.each([null, { digest: '0'.repeat(64), classes: ['work-history'], originIds: ['provider:forged'] },
    { digest: sha256(encode(QUESTION)), classes: [], originIds: ['provider:forged'] }])('requires exact independently supplied question origins %j', async origins => {
    const f = fixture(); await expect(f.invoke(QUESTION, 'author', origins as SessionToolOrigins | null)).rejects.toThrow(); expect(f.order).toEqual([]);
  });

  it.each([{ ...QUESTION, sourceAccess: true }, { ...QUESTION, originIds: ['provider:claimed'] }, { ...QUESTION, options: ['only one'] },
    { ...QUESTION, evidence: 'SYNTHETIC_SECRET' }, { ...QUESTION, evidence: '<script>owned()</script>' },
    { kind: 'question', question: 'CROSS', options: ['BOUNDARY', 'safe'] },
    '{"kind":"question","question":"safe","evidence":"SYNTHETIC_\\u0053ECRET"}'])('screens decoded fields/compositions and rejects question extensions before UI %j', async question => {
    const f = fixture(); await expect(f.invoke(question)).rejects.toThrow(); expect(f.order).toEqual([]);
  });

  it('enforces one pending question and consumes a refused shared-budget slot before any UI', async () => {
    const denied = fixture({ reserveQuestion: () => false }); await expect(denied.invoke(QUESTION)).rejects.toThrow(); expect(denied.frames).toEqual([]);
    const zero = fixture({ maxQuestions: 0 }); await expect(zero.invoke(QUESTION)).rejects.toThrow(); expect(zero.order).toEqual([]);
    const f = fixture(); await f.invoke(QUESTION); await flush(); await expect(f.invoke(QUESTION)).rejects.toThrow();
    expect(f.order.filter(v => v === 'reserve')).toHaveLength(1); expect(f.frames[0]!.signal.aborted).toBe(true);
  });

  it('rejects changed retrieval binding and does not permit role/nonce replay', async () => {
    const f = fixture(); await f.invoke(QUESTION); await flush(); const frame = f.frames[0]!;
    const request = { kind: 'answer', nonce: '0'.repeat(32), questionSha256: frame.questionSha256 };
    await expect(f.invoke(request)).rejects.toThrow(); expect(f.failures).toEqual(['invalid-request']); expect(frame.signal.aborted).toBe(true);
  });

  it.each([{ nonce: '0'.repeat(32) }, { questionSha256: '0'.repeat(64) }, { answerKind: 'owner-intent' },
    { answer: 'not an offered option' }, { answerKind: 'free-text', answer: 'SYNTHETIC_SECRET' }, { answerKind: 'free-text', answer: '<script>owned()</script>' },
    { answer: 'safe', grantSource: true }])('refuses malformed, changed, excluded or untyped answers %j', async extra => {
    const f = fixture(); await f.invoke(QUESTION); await flush(); const frame = f.frames[0]!;
    f.answer.resolve(answered(frame, extra)); await flush(); expect(f.failures).toEqual(['invalid-answer']);
    expect(f.audits.map(v => v.event)).toEqual(['clarification-question']); await expect(f.invoke()).rejects.toThrow();
  });

  it('screens answer field compositions as well as individually safe fields', async () => {
    const f = fixture(); await f.invoke(QUESTION); await flush(); const frame = f.frames[0]!;
    // This detector matches only a decoded field joined to a following metadata key.
    const custom = fixture({ screen: { ...screen, screenSecrets: value => value.includes('OWN_JOINanswerKind') ? 'secret-detector-match' : scan(value) } });
    await custom.invoke(QUESTION); await flush(); const cf = custom.frames[0]!;
    custom.answer.resolve(answered(cf, { answerKind: 'free-text', answer: 'OWN_JOIN' })); await flush();
    expect(custom.failures).toEqual(['invalid-answer']); f.answer.resolve(answered(frame));
  });

  it('requires a fresh nonce for a repeated question and stops at the finite question limit', async () => {
    const frames: UrlSessionQuestionFrame[] = [];
    const f = fixture({ maxQuestions: 2, ask: frame => { frames.push(frame); return answered(frame); } });
    for (let index = 0; index < 2; index++) {
      await f.invoke(QUESTION); await flush(); const frame = frames[index]!;
      expect((await f.invoke({ kind: 'answer', nonce: frame.nonce, questionSha256: frame.questionSha256 })).reply.state).toBe('answered');
    }
    expect(frames[0]!.nonce).not.toBe(frames[1]!.nonce); expect(frames[0]!.questionSha256).toBe(frames[1]!.questionSha256);
    await expect(f.invoke(QUESTION)).rejects.toThrow(); expect(f.failures).toEqual(['question-limit']);
  });

  it('refuses a throwing audit before UI and a stale binding after response audit before delivery', async () => {
    const bad = fixture({ audit: () => { throw new Error('own audit unavailable'); } });
    await expect(bad.invoke(QUESTION)).rejects.toThrow(); expect(bad.frames).toEqual([]); expect(bad.failures).toEqual(['audit-unavailable']);
    let current = true; const f = fixture({ current: () => current, audit: event => { if (event.event === 'clarification-answer') current = false; } });
    await f.invoke(QUESTION); await flush(); f.answer.resolve(answered(f.frames[0]!)); await flush();
    expect(f.failures).toEqual(['binding-changed']); await expect(f.invoke()).rejects.toThrow();
  });

  it('does not release events before a deferred audit and invalidates them if closed during audit', async () => {
    const held = deferred<void>(), f = fixture({ audit: () => held.promise });
    const published = f.control.publish('author', { event: 'draft-ready', revision: 1 }); await flush();
    expect((await f.invoke()).reply).toMatchObject({ state: 'pending', events: [] });
    expect(f.control.close()).toEqual({ pendingCallbacks: 1, termination: 'Unknown' }); held.resolve(); expect(await published).toBe(false);
    expect(f.control.close()).toEqual({ pendingCallbacks: 0, termination: 'settled' });
  });

  it.each(['current', 'reserveQuestion', 'audit'] as const)('bounds a never-settling %s callback and honestly retains its pending state', async name => {
    const held = deferred<never>(), f = fixture({ [name]: () => held.promise });
    await expect(f.invoke(QUESTION)).rejects.toThrow(); await flush();
    expect(f.frames).toEqual([]); expect(f.control.close()).toEqual({ pendingCallbacks: 1, termination: 'Unknown' });
    held.resolve(undefined as never); await flush(); expect(f.control.close()).toEqual({ pendingCallbacks: 0, termination: 'settled' });
  });

  it('enforces the declared callback clock bound rather than relying on the test runner timeout', async () => {
    vi.useFakeTimers(); const held = deferred<boolean>(); const f = fixture({ current: () => held.promise });
    let refused = false; const operation = f.invoke(QUESTION).catch(() => { refused = true; });
    try {
      await flush(); await vi.advanceTimersByTimeAsync(21); expect(refused).toBe(true); expect(f.frames).toEqual([]);
    } finally { held.resolve(false); await operation; vi.useRealTimers(); }
  });

  it('bounds unanswered UI lifetime, aborts its signal, and ignores late answer completion', async () => {
    const f = fixture({ limits: { questionMilliseconds: 5, callbackMilliseconds: 20 } });
    await f.invoke(QUESTION); await flush(); const frame = f.frames[0]!;
    await new Promise(resolve => setTimeout(resolve, 15)); await flush();
    expect(frame.signal.aborted).toBe(true); expect(f.failures).toEqual(['question-timeout']);
    expect(f.control.close()).toEqual({ pendingCallbacks: 1, termination: 'Unknown' });
    f.answer.resolve(answered(frame)); await flush(); expect(f.audits).toHaveLength(1); expect(f.control.close().termination).toBe('settled');
  });

  it('screens actual origin metadata and snapshots origins before waiting for current state', async () => {
    const f = fixture(); const question = encode(QUESTION);
    await expect(f.invoke(question, 'author', f.origin(question, 'provider:SYNTHETIC_SECRET'))).rejects.toThrow(); expect(f.order).toEqual([]);
    const composed = fixture(), splitOrigins = { ...composed.origin(question), originIds: ['CROSS', 'BOUNDARY'] };
    await expect(composed.invoke(question, 'author', splitOrigins)).rejects.toThrow(); expect(composed.order).toEqual([]);
    const held = deferred<boolean>(), g = fixture({ current: () => held.promise });
    const origins = { digest: sha256(question), classes: ['project-documentation'] as const, originIds: ['provider:original'] };
    const started = g.invoke(question, 'author', origins); origins.originIds[0] = 'provider:changed'; held.resolve(true);
    expect((await started).originIds).toContain('provider:original'); expect(g.frames).toHaveLength(1);
  });

  it('reports a declined answer and a throwing UI as fixed failure reasons without retaining callback details', async () => {
    const declined = fixture(); await declined.invoke(QUESTION); await flush(); const frame = declined.frames[0]!;
    declined.answer.resolve({ kind: 'declined', nonce: frame.nonce, questionSha256: frame.questionSha256 }); await flush();
    expect(declined.failures).toEqual(['question-declined']);
    const thrown = fixture({ ask: () => { throw new Error('SYNTHETIC_SECRET callback detail'); } });
    await thrown.invoke(QUESTION); await flush(); expect(thrown.failures).toEqual(['invalid-answer']);
    expect(encode(thrown.audits)).not.toContain('SYNTHETIC_SECRET');
  });

  it('snapshots callback/screen/config ports before awaiting and ignores callbacks after explicit close', async () => {
    const held = deferred<boolean>(); const f = fixture({ current: () => held.promise });
    const operation = f.invoke(QUESTION);
    Object.assign(f.config, { current: () => true, ask: () => { throw new Error('replacement callback'); }, maxQuestions: 0 });
    f.control.close(); held.resolve(true); await expect(operation).rejects.toThrow(); expect(f.frames).toEqual([]);
    const normal = fixture(); await normal.invoke(QUESTION); await flush(); const frame = normal.frames[0]!;
    normal.control.close(); expect(frame.signal.aborted).toBe(true); normal.answer.resolve(answered(frame)); await flush(); expect(normal.audits).toHaveLength(1);
  });
});
