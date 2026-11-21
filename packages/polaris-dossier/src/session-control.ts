import { randomBytes } from 'node:crypto';
import path from 'node:path';
import { encodeCanonicalJson, parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { deepFreeze, isRecord, sha256 } from '@syzygy/support';
import { CLARIFICATION_ANSWER_KINDS } from './draft-schema.js';
import { SESSION_CONTENT_CLASSES, type SessionBinding, type SessionContentClass } from './session-egress-policy.js';
import type { DossierScreen } from './screen.js';
import type { SessionToolOrigins } from './session-tools.js';
import type { ViewRole } from './session-view.js';

const BOUNDS = { maxBytes: 65_536, maxNodes: 512, maxDepth: 8 };
const ID = /^[A-Za-z0-9][A-Za-z0-9._:/-]{0,255}$/u;
const HEX = /^[a-f0-9]{64}$/u;
const ROLES: readonly ViewRole[] = ['author', 'inventory', 'fidelity', 'design'];
const canonical = (value: unknown): string => encodeCanonicalJson(value, BOUNDS);
const copy = <T>(value: T): T => deepFreeze(parseBoundedJson(canonical(value), BOUNDS)) as T;
const refusal = (): Error => new Error('session-control-unavailable');
const exact = (value: unknown, required: readonly string[], optional: readonly string[] = []): value is Record<string, unknown> =>
  isRecord(value) && required.every(key => Object.hasOwn(value, key)) && Object.keys(value).every(key => required.includes(key) || optional.includes(key));
const text = (value: unknown, bytes: number): value is string => typeof value === 'string' && value.length > 0
  && Buffer.byteLength(value) <= bytes && Buffer.from(value).toString('utf8') === value && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);
const revision = (value: unknown): value is number => Number.isSafeInteger(value) && (value as number) >= 0 && (value as number) <= 999_999;
type DesignRoundPrepared = { readonly event: 'design-round-prepared'; readonly round: number; readonly path: string;
  readonly packetSha256: string; readonly viewSha256: string };
export type UrlSessionControlEvent = { readonly event: 'draft-ready'; readonly revision: number }
  | { readonly event: 'review-blocked'; readonly review: 'fidelity' | 'design'; readonly revision: number }
  | { readonly event: 'inventory-repair'; readonly revision: number }
  | { readonly event: 'run-terminal'; readonly outcome: 'completed' | 'refused' | 'stopped' | 'Unknown' }
  | DesignRoundPrepared;
export function isDesignRoundPrepared(value: unknown, numbered = false): boolean {
  return exact(value, ['event', 'round', 'path', 'packetSha256', 'viewSha256', ...(numbered ? ['sequence'] : [])])
    && value.event === 'design-round-prepared' && revision(value.round) && value.round > 0
    && value.path === `round-${value.round}/design-view.json`
    && typeof value.packetSha256 === 'string' && HEX.test(value.packetSha256)
    && typeof value.viewSha256 === 'string' && HEX.test(value.viewSha256) && value.packetSha256 !== value.viewSha256;
}
export type UrlSessionControlFailure = 'binding-changed' | 'capacity-exhausted' | 'question-limit' | 'question-pending'
  | 'question-timeout' | 'question-declined' | 'invalid-answer' | 'audit-unavailable' | 'invalid-request';
export interface UrlSessionQuestion {
  readonly kind: 'question'; readonly question: string; readonly options?: readonly string[];
  readonly consequence?: string; readonly evidence?: string;
}
export interface UrlSessionQuestionFrame {
  readonly nonce: string; readonly questionSha256: string; readonly question: UrlSessionQuestion;
  readonly signal: AbortSignal;
}
export type UrlSessionAnswer = { readonly kind: 'answered'; readonly nonce: string; readonly questionSha256: string;
  readonly answerKind: typeof CLARIFICATION_ANSWER_KINDS[number]; readonly answer: string }
  | { readonly kind: 'declined'; readonly nonce: string; readonly questionSha256: string };
export type UrlSessionControlAudit = { readonly event: 'control-published'; readonly role: ViewRole; readonly eventSha256: string; readonly eventBytes: number }
  | { readonly event: 'clarification-question'; readonly questionSha256: string; readonly questionBytes: number; readonly nonceSha256: string; readonly questionNumber: number }
  | { readonly event: 'clarification-answer'; readonly questionSha256: string; readonly answerSha256: string; readonly answerBytes: number;
    readonly nonceSha256: string; readonly answerKind: typeof CLARIFICATION_ANSWER_KINDS[number] };
export const URL_CONTROL_LIMITS = Object.freeze({ callbackMilliseconds: 1000, questionMilliseconds: 60_000, pollMilliseconds: 50, designWaitMilliseconds: 60_000,
  maxEvents: 256, maxQueuedPerRole: 64 });
type Limits = { readonly [K in keyof typeof URL_CONTROL_LIMITS]: number };
export interface UrlSessionControlOptions {
  readonly run: string; readonly binding: Omit<SessionBinding, 'role'>; readonly screen: DossierScreen;
  readonly current: () => boolean | Promise<boolean>; readonly maxQuestions: number;
  /** Consumes the shared run slot before audit/UI. Refusal never rolls it back. */
  readonly reserveQuestion: () => boolean | Promise<boolean>;
  readonly audit: (event: UrlSessionControlAudit) => void | Promise<void>;
  readonly ask: (frame: UrlSessionQuestionFrame) => UrlSessionAnswer | Promise<UrlSessionAnswer>;
  readonly onFailure: (reason: UrlSessionControlFailure) => void | Promise<void>;
  readonly limits?: Partial<Limits>;
}
export interface UrlSessionControlPort { readonly role: ViewRole; readonly bindingSha256: string }
export interface UrlSessionControlDelivery {
  readonly reply: Readonly<Record<string, unknown>> & { readonly ok: true };
  readonly classes: readonly SessionContentClass[]; readonly originIds: readonly string[];
}
interface Port {
  readonly binding: SessionBinding; readonly run: string;
  readonly invoke: (operation: 'poll' | 'clarify', stdin: string | undefined, origins: SessionToolOrigins | null) => Promise<UrlSessionControlDelivery>;
}
const ports = new WeakMap<UrlSessionControlPort, Port>();
export function isUrlSessionControlPort(port: UrlSessionControlPort | undefined, binding: SessionBinding, run: string): boolean {
  try { const found = port === undefined ? undefined : ports.get(port); return found !== undefined && found.run === run && canonical(found.binding) === canonical(binding); }
  catch { return false; }
}
export function invokeUrlSessionControl(port: UrlSessionControlPort, binding: SessionBinding, run: string,
  operation: 'poll' | 'clarify', stdin: string | undefined, origins: SessionToolOrigins | null): Promise<UrlSessionControlDelivery> {
  if (!isUrlSessionControlPort(port, binding, run)) return Promise.reject(refusal());
  return ports.get(port)!.invoke(operation, stdin, origins);
}

/** Root-only typed state. It grants neither intent adoption nor source access.
 * Questions/answers stay ephemeral; audit receives only their hashes/counts.
 * The caller must close its terminal/readline when the supplied signal aborts. */
export function createUrlSessionControl(options: UrlSessionControlOptions) {
  const binding = copy(options.binding), run = options.run, maxQuestions = options.maxQuestions;
  const current = options.current, reserveQuestion = options.reserveQuestion, audit = options.audit, ask = options.ask, onFailure = options.onFailure;
  const screenBody = options.screen.screenBody, scanSecrets = options.screen.screenSecrets, policySha256 = options.screen.policySha256;
  const limits: Limits = Object.freeze({ ...URL_CONTROL_LIMITS, ...options.limits });
  if (!path.isAbsolute(run) || path.resolve(run) !== run || binding.run !== path.basename(run)
    || !exact(binding, ['run', 'sourceBinding', 'policy', 'provider', 'model']) || binding.policy !== policySha256
    || !Object.values(binding).every(value => typeof value === 'string' && ID.test(value))
    || !Number.isSafeInteger(maxQuestions) || maxQuestions < 0 || maxQuestions > 1000
    || [current, reserveQuestion, audit, ask, onFailure, screenBody, scanSecrets].some(port => typeof port !== 'function')
    || Object.keys(limits).length !== Object.keys(URL_CONTROL_LIMITS).length || Object.entries(limits).some(([key, value]) =>
      !Object.hasOwn(URL_CONTROL_LIMITS, key) || !Number.isSafeInteger(value) || value <= 0 || value > URL_CONTROL_LIMITS[key as keyof Limits])) throw refusal();
  const safe = (value: unknown): void => {
    const fields: string[] = [], values: string[] = [];
    const field = (s: string): void => { if (!text(s, BOUNDS.maxBytes) || screenBody(s) !== undefined || scanSecrets(s) !== undefined) throw refusal(); fields.push(s); };
    const visit = (v: unknown): void => {
      if (typeof v === 'string') { field(v); values.push(v); }
      else if (Array.isArray(v)) for (const child of v) visit(child);
      else if (isRecord(v)) for (const [key, child] of Object.entries(v)) { field(key); visit(child); }
    };
    field(canonical(value)); visit(value);
    for (const composition of [fields.join(''), values.join('')]) if (screenBody(composition) !== undefined || scanSecrets(composition) !== undefined) throw refusal();
  };
  safe(binding);
  let closed = false, fault: UrlSessionControlFailure | null = null, running = 0, questionCount = 0, eventCount = 0, eventSequence = 0;
  let wakeDesignWaiter: (() => void) | undefined;
  const queues = new Map(ROLES.map(role => [role, [] as unknown[]])), published = new Set<string>();
  const reserved = new Map(ROLES.map(role => [role, 0]));
  const hostOrigin = `url-control:host:${sha256(canonical(binding))}`;
  const check = (): void => { if (closed || fault !== null) throw refusal(); };
  const track = <T>(fn: () => T | Promise<T>): Promise<T> => {
    running++; return Promise.resolve().then(fn).finally(() => { running--; });
  };
  const call = async <T>(fn: () => T | Promise<T>): Promise<T> => {
    let timer: ReturnType<typeof setTimeout> | undefined;
    try { return await Promise.race([track(fn), new Promise<never>((_resolve, reject) => { timer = setTimeout(() => reject(refusal()), limits.callbackMilliseconds); })]); }
    finally { clearTimeout(timer); }
  };
  interface Pending {
    readonly nonce: string; readonly digest: string; readonly question: UrlSessionQuestion; readonly origins: SessionToolOrigins;
    readonly abort: AbortController; timer: ReturnType<typeof setTimeout> | undefined;
    answer?: Extract<UrlSessionAnswer, { kind: 'answered' }>;
  }
  let pending: Pending | undefined;
  const fail = (reason: UrlSessionControlFailure): void => {
    if (closed || fault !== null) return; fault = reason;
    pending?.abort.abort(); clearTimeout(pending?.timer); pending = undefined;
    for (const queue of queues.values()) queue.length = 0;
    wakeDesignWaiter?.();
    void call(() => onFailure(reason)).catch(() => {});
  };
  const verify = async (): Promise<void> => {
    check(); try { if (await call(current) !== true) throw refusal(); check(); }
    catch { fail('binding-changed'); throw refusal(); }
  };
  const record = async (event: UrlSessionControlAudit): Promise<void> => {
    check(); safe(event); try { await call(() => audit(copy(event))); check(); }
    catch { fail('audit-unavailable'); throw refusal(); }
  };
  const origin = (given: SessionToolOrigins | null, payload: string): SessionToolOrigins => {
    if (!given || given.digest !== sha256(payload) || !Array.isArray(given.classes) || given.classes.length < 1
      || given.classes.some(v => !SESSION_CONTENT_CLASSES.includes(v)) || !Array.isArray(given.originIds) || given.originIds.length < 1
      || given.originIds.length > 120 || given.originIds.some(v => typeof v !== 'string' || !ID.test(v))) throw refusal();
    const result = copy(given); safe(result); return result;
  };
  const deliver = (reply: UrlSessionControlDelivery['reply'], inputs: readonly SessionToolOrigins[] = [], ids: readonly string[] = []): UrlSessionControlDelivery => {
    const result: UrlSessionControlDelivery = copy({ reply, classes: [...new Set<SessionContentClass>(['work-history', ...inputs.flatMap(v => v.classes)])].sort(),
      originIds: [...new Set([hostOrigin, ...ids, ...inputs.flatMap(v => v.originIds)])].sort() });
    if (result.originIds.length > 128) throw refusal(); safe(result); return result;
  };
  const question = (value: unknown): UrlSessionQuestion => {
    if (!exact(value, ['kind', 'question'], ['options', 'consequence', 'evidence']) || value.kind !== 'question' || !text(value.question, 4096)
      || (value.options !== undefined && (!Array.isArray(value.options) || value.options.length < 2 || value.options.length > 3
        || value.options.some(v => !text(v, 1024)) || new Set(value.options).size !== value.options.length))
      || (value.consequence !== undefined && !text(value.consequence, 2048)) || (value.evidence !== undefined && !text(value.evidence, 4096))) throw refusal();
    safe(value);
    const display = [value.question, ...(value.options as string[] | undefined ?? []), value.consequence ?? '', value.evidence ?? ''].join('');
    if (screenBody(display) !== undefined || scanSecrets(display) !== undefined) throw refusal();
    return copy(value) as unknown as UrlSessionQuestion;
  };
  const startAnswer = (item: Pending): void => {
    item.timer = setTimeout(() => { if (pending === item) fail('question-timeout'); }, limits.questionMilliseconds);
    void track(() => { check(); return ask(Object.freeze({ nonce: item.nonce, questionSha256: item.digest, question: item.question, signal: item.abort.signal })); })
      .then(async value => {
        if (closed || fault !== null || pending !== item) return;
        const answer = copy(value); safe(answer);
        if (!exact(answer, ['kind', 'nonce', 'questionSha256'], ['answerKind', 'answer']) || answer.nonce !== item.nonce || answer.questionSha256 !== item.digest) throw refusal();
        if (answer.kind === 'declined' && exact(answer, ['kind', 'nonce', 'questionSha256'])) { fail('question-declined'); return; }
        if (answer.kind !== 'answered' || !exact(answer, ['kind', 'nonce', 'questionSha256', 'answerKind', 'answer'])
          || !CLARIFICATION_ANSWER_KINDS.includes(answer.answerKind as typeof CLARIFICATION_ANSWER_KINDS[number]) || !text(answer.answer, 8192)
          || (answer.answerKind === 'selected-interpretation' && !item.question.options?.includes(answer.answer))) throw refusal();
        await verify();
        await record({ event: 'clarification-answer', questionSha256: item.digest, nonceSha256: sha256(item.nonce),
          answerSha256: sha256(answer.answer), answerBytes: Buffer.byteLength(answer.answer), answerKind: answer.answerKind as typeof CLARIFICATION_ANSWER_KINDS[number] });
        await verify(); if (pending !== item) throw refusal();
        item.answer = answer as unknown as Extract<UrlSessionAnswer, { kind: 'answered' }>; clearTimeout(item.timer);
      }).catch(() => { if (!closed && fault === null) fail('invalid-answer'); });
  };
  const waitForDesignEvent = (): Promise<void> => {
    if (wakeDesignWaiter !== undefined) throw refusal();
    return new Promise<void>(resolve => {
      const wake = (): void => { clearTimeout(timer); wakeDesignWaiter = undefined; resolve(); };
      const timer = setTimeout(wake, limits.designWaitMilliseconds);
      wakeDesignWaiter = wake;
    });
  };
  const invoke = async (role: ViewRole, operation: 'poll' | 'clarify', stdin: string | undefined, supplied: SessionToolOrigins | null): Promise<UrlSessionControlDelivery> => {
    const suppliedSnapshot = supplied === null ? null : copy(supplied);
    await verify();
    if (operation === 'poll') {
      if (stdin !== undefined) throw refusal();
      const queue = queues.get(role)!;
      if (queue.length === 0) {
        if (role === 'design') await waitForDesignEvent();
        else await new Promise<void>(resolve => setTimeout(resolve, limits.pollMilliseconds));
        await verify();
      }
      return deliver({ ok: true, kind: 'session-control', state: queue.length ? 'events' : 'pending', events: queue.splice(0, 16) });
    }
    if (operation !== 'clarify' || role !== 'author' || typeof stdin !== 'string') throw refusal();
    const input: unknown = parseBoundedJson(stdin, BOUNDS); safe(input); const provenance = origin(suppliedSnapshot, stdin);
    if (isRecord(input) && input.kind === 'answer') {
      if (!exact(input, ['kind', 'nonce', 'questionSha256']) || typeof input.nonce !== 'string' || !/^[a-f0-9]{32}$/u.test(input.nonce)
        || typeof input.questionSha256 !== 'string' || !HEX.test(input.questionSha256) || !pending
        || pending.nonce !== input.nonce || pending.digest !== input.questionSha256) { fail('invalid-request'); throw refusal(); }
      const item = pending, ids = [`url-control:question:${item.digest}`];
      if (!item.answer) return deliver({ ok: true, kind: 'session-clarification', state: 'pending', nonce: item.nonce, questionSha256: item.digest }, [item.origins, provenance], ids);
      pending = undefined;
      return deliver({ ok: true, kind: 'session-clarification', state: 'answered', nonce: item.nonce, questionSha256: item.digest,
        answerKind: item.answer.answerKind, answer: item.answer.answer, attribution: 'operator', label: 'Inferred' }, [item.origins, provenance], [...ids, `url-control:answer:${sha256(item.answer.answer)}`]);
    }
    const proposed = question(input);
    if (pending) { fail('question-pending'); throw refusal(); }
    if (questionCount >= maxQuestions) { fail('question-limit'); throw refusal(); }
    questionCount++;
    // Install before the first await: concurrent requests cannot reserve another UI.
    const item: Pending = { nonce: randomBytes(16).toString('hex'), digest: sha256(canonical(proposed)), question: proposed, origins: provenance, abort: new AbortController(), timer: undefined };
    pending = item;
    try { if (await call(reserveQuestion) !== true) { fail('question-limit'); throw refusal(); } }
    catch { fail('question-limit'); throw refusal(); }
    await verify(); await record({ event: 'clarification-question', questionSha256: item.digest, questionBytes: Buffer.byteLength(canonical(proposed)), nonceSha256: sha256(item.nonce), questionNumber: questionCount });
    await verify(); if (pending !== item) throw refusal();
    const reply = deliver({ ok: true, kind: 'session-clarification', state: 'pending', nonce: item.nonce, questionSha256: item.digest }, [provenance], [`url-control:question:${item.digest}`]);
    startAnswer(item); return reply;
  };
  const rolePorts = new Map<ViewRole, UrlSessionControlPort>();
  return Object.freeze({
    forRole: (role: ViewRole): UrlSessionControlPort => {
      check(); if (!ROLES.includes(role)) throw refusal(); const existing = rolePorts.get(role); if (existing) return existing;
      const roleBinding = copy({ ...binding, role }), port = Object.freeze({ role, bindingSha256: sha256(canonical(roleBinding)) });
      ports.set(port, { binding: roleBinding, run, invoke: async (op, stdin, origins) => {
        try { return await invoke(role, op, stdin, origins); }
        catch { fail('invalid-request'); throw refusal(); }
      } }); rolePorts.set(role, port); return port;
    },
    publish: async (role: ViewRole, given: UrlSessionControlEvent): Promise<boolean> => {
      try {
        const event: Record<string, unknown> = copy(given); safe(event);
        const valid = exact(event, ['event', 'revision']) && ['draft-ready', 'inventory-repair'].includes(event.event as string) && revision(event.revision)
          || exact(event, ['event', 'review', 'revision']) && event.event === 'review-blocked' && ['fidelity', 'design'].includes(event.review as string) && revision(event.revision)
          || exact(event, ['event', 'outcome']) && event.event === 'run-terminal' && ['completed', 'refused', 'stopped', 'Unknown'].includes(event.outcome as string)
          || role === 'design' && isDesignRoundPrepared(event);
        if (!ROLES.includes(role) || !valid) throw refusal(); await verify();
        const encoded = canonical(event), id = sha256(canonical([role, event])); if (published.has(id)) return true;
        if (eventCount >= limits.maxEvents || queues.get(role)!.length + reserved.get(role)! >= limits.maxQueuedPerRole) { fail('capacity-exhausted'); throw refusal(); }
        eventCount++; published.add(id); reserved.set(role, reserved.get(role)! + 1);
        try {
          await record({ event: 'control-published', role, eventSha256: sha256(encoded), eventBytes: Buffer.byteLength(encoded) }); await verify();
          queues.get(role)!.push(copy({ ...event, sequence: ++eventSequence }));
          if (role === 'design') wakeDesignWaiter?.();
          return true;
        } finally { reserved.set(role, reserved.get(role)! - 1); }
      } catch { return false; }
    },
    close: (): { readonly pendingCallbacks: number; readonly termination: 'settled' | 'Unknown' } => {
      closed = true; pending?.abort.abort(); clearTimeout(pending?.timer); pending = undefined;
      for (const queue of queues.values()) queue.length = 0;
      wakeDesignWaiter?.();
      return Object.freeze({ pendingCallbacks: running, termination: running === 0 ? 'settled' : 'Unknown' });
    },
  });
}
