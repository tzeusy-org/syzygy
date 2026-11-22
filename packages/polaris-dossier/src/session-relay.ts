import * as fs from 'node:fs';
import * as http from 'node:http';
import * as net from 'node:net';
import * as https from 'node:https';
import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { deepFreeze, sha256 } from '@syzygy/support';
import { SESSION_CONTENT_CLASSES, type SessionAdmission, type SessionBinding, type SessionConsumedToolResult, type SessionTool } from './session-egress-policy.js';
import { isSessionMachineTransport, openSessionMachineConnection, prepareSessionMachineTransport, sessionMachineEffectContext, stopSessionMachineIngress,
  type SessionMachineTransport, type SessionMachineEffectContext } from './session-machine-transport.js';
import type { SessionResponseStopReason, SessionResponseUsage } from './session-response.js';

export interface SessionRelayLimits {
  readonly requestBytes: number; readonly responseBytes: number;
  readonly milliseconds: number; readonly connections: number;
}
export const SESSION_RELAY_LIMITS: SessionRelayLimits = Object.freeze({
  requestBytes: 2_097_152, responseBytes: 8_388_608, milliseconds: 180_000, connections: 4,
});
export interface SessionRelaySubject {
  readonly binding: SessionBinding;
  readonly project: string; readonly pin: string; readonly principal: string;
}
export const SESSION_RELAY_EVENTS = ['attempt-allowed', 'attempt-refused', 'send-attempt', 'send-outcome', 'transport-failed',
  'response-refused', 'response-admitted'] as const;
export interface SessionResponseObservation {
  readonly stopReason: SessionResponseStopReason;
  readonly textBlocks: number;
  readonly tool: { readonly id: string; readonly name: SessionTool; readonly inputSha256: string } | null;
}
export interface SessionAuditEvent {
  readonly event: typeof SESSION_RELAY_EVENTS[number];
  readonly subject: SessionRelaySubject;
  readonly requestId: string; readonly at: string;
  readonly credentialIdentity: 'Unknown'; readonly exposureMode: 'private-local-cli';
  readonly governingRule: 'GOVERNANCE-SIMPLIFICATION-D10';
  readonly admission: SessionAdmission | null;
  /** Identity of received bytes before the explicit protocol metadata projection. */
  readonly received: { readonly digest: string; readonly bytes: number } | null;
  readonly route: 'messages' | 'count-tokens' | null;
  readonly consumedToolResults: readonly SessionConsumedToolResult[];
  readonly response: (SessionResponseObservation & { readonly digest: string; readonly bytes: number;
    readonly content: 'messages-json' | 'messages-event-stream' }) | null;
  readonly outcome: 'allowed' | 'refused' | 'attempted' | 'local-request-flushed' | 'Unknown' | 'response-admitted';
  readonly status: number | null;
}
export type SessionRequestDecision = { readonly ok: true; readonly body: Uint8Array; readonly admission: SessionAdmission;
  readonly consumedToolResults: readonly SessionConsumedToolResult[] } | { readonly ok: false };
export type SessionResponseDecision = { readonly ok: true; readonly observation: SessionResponseObservation;
  readonly usage?: SessionResponseUsage } | { readonly ok: false };
export interface SessionRelayPorts {
  /** Must revalidate the run/pin/policy/provider binding, not consult consent records. */
  readonly current: () => boolean | Promise<boolean>;
  /** Host commits the new opaque policy state before returning success. */
  readonly request: (bytes: Uint8Array, context: SessionMachineEffectContext | null) => SessionRequestDecision | Promise<SessionRequestDecision>;
  /** Independently pinned protocol headers and host-owned credentials only.
   * Incoming CLI values must not become an unchecked content/credential channel.
   * The host may validate a fixed synthetic CLI marker and substitute its own
   * credential here, without giving the role the credential or its source file.
   */
  readonly providerHeaders: (incoming: Readonly<Record<string, string>>, context: SessionMachineEffectContext | null) => Readonly<Record<string, string>> | null;
  /** Complete buffered response ingest, including SSE reconstruction and screening,
   * must succeed before any response body is released to the CLI. */
  readonly response: (bytes: Uint8Array, contentType: string, context: SessionMachineEffectContext | null) => SessionResponseDecision | Promise<SessionResponseDecision>;
  readonly audit: (event: SessionAuditEvent, context: SessionMachineEffectContext | null) => void | Promise<void>;
}
export interface SessionRelay {
  readonly socket: string;
  /** Synchronous terminal state of the actual relay. A peer disconnect,
   * deadline, refusal, server failure or close cannot be undone by an audit
   * callback that was already awaiting completion. Not a delivery receipt. */
  healthy(): boolean;
  /** The current admitted response was handed off to the local socket. This
   * does not establish that the CLI received it. */
  responseFlushed(): boolean;
  close(): Promise<void>;
}
interface SessionRelayAuditEvidence {
  readonly usage: SessionResponseUsage | null;
}
const relayEvidence = new WeakMap<SessionRelay, WeakMap<SessionAuditEvent, SessionRelayAuditEvidence>>();

/** Read the observation only for the exact callback from the selected relay.
 * Keep response usage outside the serialized legacy callback envelope. */
export function readSessionRelayAuditEvidence(relay: SessionRelay, event: SessionAuditEvent): SessionRelayAuditEvidence | null {
  return relayEvidence.get(relay)?.get(event) ?? null;
}
interface ProviderResponse {
  readonly status: number; readonly contentType: string; readonly body: Uint8Array;
  /** Observed local transport flush, with no claim about what the provider received. */
  readonly requestFlushed: boolean;
}
type Forward = (input: {
  readonly route: string; readonly headers: Readonly<Record<string, string>>;
  readonly body: Uint8Array; readonly signal: AbortSignal; readonly limits: SessionRelayLimits;
}) => Promise<ProviderResponse>;
const ROUTES = new Set(['/v1/messages', '/v1/messages?beta=true', '/v1/messages/count_tokens', '/v1/messages/count_tokens?beta=true']);
const HEADER_NAMES = ['authorization', 'x-api-key', 'anthropic-version', 'anthropic-beta', 'content-type', 'user-agent', 'x-app'];
const SAFE_FAILURE = '{"type":"error","error":{"type":"invalid_request_error","message":"The session policy or bounded provider transport refused this operation."}}';

/** Production destination is compiled, never read from a URL, header, CLI
 * setting, repository, environment proxy or test override. */
const forwardToAnthropic: Forward = input => new Promise((resolve, reject) => {
  const request = https.request({ hostname: 'api.anthropic.com', servername: 'api.anthropic.com', port: 443,
    method: 'POST', path: input.route, agent: false, rejectUnauthorized: true, signal: input.signal,
    maxHeaderSize: 16_384, headers: { ...input.headers, host: 'api.anthropic.com', 'accept-encoding': 'identity', 'content-length': input.body.byteLength },
  }, response => {
    const status = response.statusCode ?? 502;
    const contentType = response.headers['content-type'];
    if (status !== 200 || typeof contentType !== 'string'
      || !/^(?:application\/json|text\/event-stream)(?:\s*;\s*charset=utf-8)?$/iu.test(contentType)
      || (response.headers['content-encoding'] !== undefined && response.headers['content-encoding'] !== 'identity')) {
      response.destroy(); reject(new Error('provider-response-refused')); return;
    }
    const chunks: Buffer[] = [];
    let bytes = 0;
    response.on('data', (chunk: Buffer) => {
      bytes += chunk.length;
      if (bytes > input.limits.responseBytes) { response.destroy(); reject(new Error('provider-response-limit')); return; }
      chunks.push(chunk);
    });
    response.on('error', () => reject(new Error('provider-response-incomplete')));
    response.on('end', () => {
      if (!response.complete) { reject(new Error('provider-response-incomplete')); return; }
      resolve({ status, contentType, body: Buffer.concat(chunks, bytes), requestFlushed: request.writableFinished });
    });
  });
  request.on('error', () => reject(new Error('provider-transport-failed')));
  request.end(input.body);
});

export const startSessionRelay = (socket: string, subject: SessionRelaySubject, ports: SessionRelayPorts,
  limits: SessionRelayLimits = SESSION_RELAY_LIMITS, machine?: SessionMachineTransport): Promise<SessionRelay> =>
  start(socket, subject, ports, limits, forwardToAnthropic, undefined, machine, false);
/** Internal own-fixture seam, absent from workspace exports and CLI options. */
export const sessionRelayTestPort = (forward: Forward, observe?: (server: http.Server) => void) => (socket: string, subject: SessionRelaySubject, ports: SessionRelayPorts,
  limits: SessionRelayLimits = SESSION_RELAY_LIMITS, machine?: SessionMachineTransport): Promise<SessionRelay> =>
  start(socket, subject, ports, limits, forward, observe, machine, machine === undefined);

async function start(socket: string, subject: SessionRelaySubject, ports: SessionRelayPorts, limits: SessionRelayLimits, forward: Forward,
  observe: ((server: http.Server) => void) | undefined, machine: SessionMachineTransport | undefined, fixture: boolean): Promise<SessionRelay> {
  if ((!fixture && (machine === undefined || !isSessionMachineTransport(machine))) || !path.isAbsolute(socket) || Buffer.byteLength(socket) > 103 || subject.binding.provider !== 'anthropic'
    || Object.keys(limits).sort().join(',') !== Object.keys(SESSION_RELAY_LIMITS).sort().join(',')
    || Object.entries(limits).some(([key, value]) => !Number.isSafeInteger(value) || value <= 0
      || value > SESSION_RELAY_LIMITS[key as keyof SessionRelayLimits])
    || ['current', 'request', 'providerHeaders', 'response', 'audit'].some(key => typeof ports[key as keyof SessionRelayPorts] !== 'function')) throw new Error('invalid-session-relay-configuration');
  limits = Object.freeze({ ...limits });
  subject = Object.freeze({ binding: Object.freeze({ ...subject.binding }), project: subject.project, pin: subject.pin, principal: subject.principal });
  ports = Object.freeze({ current: ports.current, request: ports.request, providerHeaders: ports.providerHeaders, response: ports.response, audit: ports.audit });
  const controllers = new Set<AbortController>();
  const evidence = new WeakMap<SessionAuditEvent, SessionRelayAuditEvidence>();
  let pending = false, poisoned = false, closing = false, responseFlushed = false;
  const server = http.createServer({ maxHeaderSize: 16_384, requestTimeout: limits.milliseconds, headersTimeout: Math.min(limits.milliseconds, 10_000) }, (incoming, outgoing) => {
    const context = fixture ? null : sessionMachineEffectContext(incoming.socket);
    if ((!fixture && context === null) || pending || poisoned || closing) {
      if (!fixture) { poisoned = true; incoming.socket.destroy(); return; }
      outgoing.writeHead(503, { 'content-type': 'application/json', connection: 'close' }); outgoing.end(SAFE_FAILURE); incoming.resume(); return;
    }
    pending = true;
    responseFlushed = false;
    const controller = new AbortController(); controllers.add(controller);
    const requestId = randomUUID();
    const effect = async <T>(act: (boundary: () => boolean) => T | Promise<T>): Promise<T> => {
      if (fixture) return act(() => true);
      if (context === null) throw new Error('session-machine-transport-unavailable');
      const result = await context.mediate('inference-forward', act);
      if (!result.ok) throw new Error('session-machine-transport-unavailable');
      return result.value;
    };
    const audit = (row: SessionAuditEvent): Promise<void> => effect(async boundary => {
      if (!boundary()) throw new Error('session-machine-transport-unavailable');
      await ports.audit(row, context);
    });
    let terminal = false, refusing = false, writingAdmittedResponse = false, admission: SessionAdmission | null = null;
    let received: SessionAuditEvent['received'] = null;
    let consumedToolResults: SessionAuditEvent['consumedToolResults'] = [];
    let observedResponse: SessionAuditEvent['response'] = null;
    let observedUsage: SessionResponseUsage | null = null;
    let size = 0;
    const chunks: Buffer[] = [];
    const finish = (): void => { terminal = true; clearTimeout(timer); pending = false; controllers.delete(controller); };
    const event = (kind: SessionAuditEvent['event'], outcome: SessionAuditEvent['outcome'], status: number | null): SessionAuditEvent => {
      const row = deepFreeze({
        event: kind, subject, requestId, at: new Date().toISOString(), credentialIdentity: 'Unknown', exposureMode: 'private-local-cli',
        governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', admission, received,
        route: ROUTES.has(incoming.url ?? '') ? incoming.url!.includes('/count_tokens') ? 'count-tokens' : 'messages' : null,
        consumedToolResults, response: kind === 'response-admitted' ? observedResponse : null, outcome, status,
      } satisfies SessionAuditEvent);
      evidence.set(row, Object.freeze({ usage: kind === 'response-admitted' ? observedUsage : null }));
      return row;
    };
    const refuse = (status: number): void => {
      if (terminal) return;
      poisoned = true; refusing = true; controller.abort(); incoming.resume();
      if (!outgoing.headersSent && !outgoing.destroyed) {
        outgoing.writeHead(status, { 'content-type': 'application/json', connection: 'close' }); outgoing.end(SAFE_FAILURE);
      } else outgoing.destroy();
    };
    const auditRefusal = async (status: number): Promise<void> => {
      if (terminal || refusing) return;
      refusing = true;
      try { await audit(event('attempt-refused', 'refused', null)); } catch { /* No body/send occurs if the audit is unavailable. */ }
      refuse(status);
    };
    const timer = setTimeout(() => {
      void Promise.resolve().then(() => audit(event('transport-failed', 'Unknown', null))).catch(() => undefined);
      // An absolute transport deadline includes output backpressure. Destroy
      // immediately; a complete HTTP error cannot be promised to a stalled peer.
      poisoned = true; refusing = true; controller.abort(); incoming.destroy(); outgoing.destroy(); finish();
    }, limits.milliseconds);
    outgoing.once('finish', () => {
      if (writingAdmittedResponse && !terminal && !refusing) responseFlushed = true;
      finish();
    });
    outgoing.on('close', () => { if (!terminal) { poisoned = true; controller.abort(); finish(); } });
    outgoing.on('error', () => { poisoned = true; controller.abort(); outgoing.destroy(); finish(); });
    incoming.on('error', () => refuse(400));
    if (incoming.method !== 'POST' || !ROUTES.has(incoming.url ?? '')
      || !/^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(incoming.headers['content-type'] ?? '')
      || (incoming.headers['content-encoding'] !== undefined && incoming.headers['content-encoding'] !== 'identity')) {
      void auditRefusal(400); return;
    }
    const headers: Record<string, string> = {};
    const seenHeaders = new Set<string>();
    for (let index = 0; index < incoming.rawHeaders.length; index += 2) {
      const name = incoming.rawHeaders[index]!.toLowerCase();
      if (seenHeaders.has(name)) { void auditRefusal(400); return; }
      seenHeaders.add(name);
    }
    for (const name of HEADER_NAMES) {
      const value = incoming.headers[name];
      if (value === undefined) continue;
      if (typeof value !== 'string' || value.length > 8192 || /[\0\r\n]/u.test(value)) { void auditRefusal(400); return; }
      headers[name] = value;
    }
    if ((headers['authorization'] === undefined) === (headers['x-api-key'] === undefined)
      || (headers['authorization'] !== undefined && !/^Bearer [^\s]+$/u.test(headers['authorization']))) { void auditRefusal(401); return; }
    incoming.on('data', (chunk: Buffer) => {
      if (terminal || refusing) return;
      size += chunk.length;
      if (size > limits.requestBytes) { void auditRefusal(413); return; }
      chunks.push(chunk);
    });
    incoming.on('end', () => { void (async () => {
      if (terminal || refusing) return;
      try {
        if (!fixture && !stopSessionMachineIngress(incoming.socket)) throw new Error('session-machine-transport-unavailable');
        if (!(await ports.current()) || terminal) { await auditRefusal(409); return; }
        const body = Buffer.concat(chunks, size);
        received = { digest: sha256(body), bytes: body.byteLength };
        const decision = await effect(boundary => {
          if (!boundary()) throw new Error('session-machine-transport-unavailable');
          return ports.request(body, context);
        });
        if (!decision.ok) { await auditRefusal(403); return; }
        if (!(decision.body instanceof Uint8Array) || decision.body.byteLength > limits.requestBytes) { await auditRefusal(403); return; }
        const forwardingBody = Buffer.from(decision.body);
        if (decision.admission.digest !== sha256(forwardingBody) || decision.admission.bytes !== forwardingBody.byteLength) { await auditRefusal(403); return; }
        admission = { digest: decision.admission.digest, bytes: decision.admission.bytes,
          originIds: [...decision.admission.originIds], classes: [...decision.admission.classes] };
        consumedToolResults = Object.freeze(decision.consumedToolResults.map(result => Object.freeze({ ...result })));
        const admittedHeaders = (): Readonly<Record<string, string>> | null => {
          const projected = ports.providerHeaders(Object.freeze({ ...headers }), context);
          if (projected === null || Object.entries(projected).some(([name, value]) => !HEADER_NAMES.includes(name)
          || typeof value !== 'string' || value.length > 8192 || /[\0\r\n]/u.test(value))
            || (projected['authorization'] === undefined) === (projected['x-api-key'] === undefined)) return null;
          return { ...projected };
        };
        if (await effect(boundary => boundary() ? admittedHeaders() : null) === null) { await auditRefusal(403); return; }
        // This await is the actual choke point ordering, not an after-send log.
        await audit(event('attempt-allowed', 'allowed', null));
        if (terminal) return;
        if (!(await ports.current()) || terminal) { await auditRefusal(409); return; }
        // Credential expiry and current policy are checked after the audit,
        // without another await between header preparation and native send.
        const sending = await effect(boundary => {
          const forwardingHeaders = admittedHeaders();
          if (forwardingHeaders === null) return null;
          if (!boundary()) throw new Error('session-machine-transport-unavailable');
          return { exchange: forward({ route: incoming.url!, headers: forwardingHeaders, body: forwardingBody, signal: controller.signal, limits }) };
        });
        if (sending === null) { await auditRefusal(403); return; }
        const exchange = sending.exchange;
        // Keep a rejection observed while persisting the actual invocation.
        void exchange.catch(() => undefined);
        await audit(event('send-attempt', 'attempted', null));
        const response = await exchange;
        if (terminal) return;
        if (!response.requestFlushed) throw new Error('provider-send-unconfirmed');
        await audit(event('send-outcome', 'local-request-flushed', null));
        if (terminal) return;
        if (!(response.body instanceof Uint8Array) || response.body.byteLength > limits.responseBytes) {
          await audit(event('response-refused', 'refused', response.status)); refuse(502); return;
        }
        const responseBody = Buffer.from(response.body), responseStatus = response.status, responseType = response.contentType;
        if (!(await ports.current()) || terminal) {
          if (!terminal) { await audit(event('response-refused', 'refused', responseStatus)); refuse(409); } return;
        }
        const checkingBody = Buffer.from(responseBody), responseDigest = sha256(responseBody);
        const content = /^text\/event-stream(?:\s*;\s*charset=utf-8)?$/iu.test(responseType) ? 'messages-event-stream'
          : /^application\/json(?:\s*;\s*charset=utf-8)?$/iu.test(responseType) ? 'messages-json' : null;
        const accepted = responseStatus === 200 && content !== null ? await effect(boundary => {
          if (!boundary()) throw new Error('session-machine-transport-unavailable');
          return ports.response(checkingBody, responseType, context);
        }) : { ok: false } as const;
        if (!content || !accepted.ok || sha256(checkingBody) !== responseDigest) {
          await audit(event('response-refused', 'refused', responseStatus)); refuse(502); return;
        }
        const { stopReason, textBlocks, tool } = accepted.observation;
        const usage = accepted.usage;
        if (usage !== undefined) {
          const { inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens } = usage;
          observedUsage = Object.freeze({ inputTokens, outputTokens, cacheCreationInputTokens, cacheReadInputTokens });
        }
        observedResponse = Object.freeze({ digest: responseDigest, bytes: responseBody.byteLength, content, stopReason, textBlocks,
          tool: tool === null ? null : Object.freeze({ id: tool.id, name: tool.name, inputSha256: tool.inputSha256 }) });
        await audit(event('response-admitted', 'response-admitted', responseStatus));
        if (terminal) return;
        if (!(await ports.current()) || terminal) {
          if (!terminal) { await audit(event('response-refused', 'refused', responseStatus)); refuse(409); } return;
        }
        await effect(boundary => new Promise<void>((resolve, reject) => {
          if (!boundary()) { reject(new Error('session-machine-transport-unavailable')); return; }
          outgoing.once('finish', resolve);
          outgoing.once('error', () => reject(new Error('session-machine-transport-unavailable')));
          outgoing.once('close', () => { if (!outgoing.writableFinished) reject(new Error('session-machine-transport-unavailable')); });
          outgoing.writeHead(responseStatus, { 'content-type': responseType, 'content-length': responseBody.byteLength, connection: 'close' });
          writingAdmittedResponse = true;
          outgoing.end(responseBody);
        }));
      } catch {
        try { await audit(event('transport-failed', 'Unknown', null)); } catch { /* Retained attempt never becomes a receipt. */ }
        refuse(502);
      }
    })(); });
  });
  const rawSockets = new Set<net.Socket>();
  const listener = fixture ? server : net.createServer({ allowHalfOpen: true, pauseOnConnect: true }, raw => {
    rawSockets.add(raw); raw.on('error', () => undefined); raw.once('close', () => rawSockets.delete(raw));
    if (closing || poisoned || rawSockets.size > limits.connections) { raw.destroy(); return; }
    void openSessionMachineConnection(raw, machine!, { bytes: limits.requestBytes + 16_384, milliseconds: limits.milliseconds }).then(stream => {
      if (!stream || closing || poisoned) { poisoned = true; stream?.destroy(); raw.destroy(); return; }
      stream.once('error', () => { poisoned = true; for (const controller of controllers) controller.abort(); });
      server.emit('connection', stream);
    }, () => { poisoned = true; raw.destroy(); });
  });
  listener.maxConnections = limits.connections;
  observe?.(server);
  try {
    await new Promise<void>((resolve, reject) => {
      const failed = (): void => { reject(new Error('session-relay-start-failed')); };
      listener.once('error', failed); listener.listen(socket, () => { listener.off('error', failed); resolve(); });
    });
    if (!fixture && !(await prepareSessionMachineTransport(machine!, listener))) throw new Error('session-relay-start-failed');
    listener.on('error', () => { poisoned = true; for (const controller of controllers) controller.abort(); server.closeAllConnections();
      for (const raw of rawSockets) raw.destroy(); });
    fs.chmodSync(socket, 0o600);
  }
  catch { listener.close(); throw new Error('session-relay-start-failed'); }
  const relay = Object.freeze({ socket, healthy: () => !poisoned && !closing, responseFlushed: () => responseFlushed && !poisoned && !closing, close: async () => {
    closing = true; poisoned = true;
    for (const controller of controllers) controller.abort();
    server.closeAllConnections();
    for (const raw of rawSockets) raw.destroy();
    await new Promise<void>(resolve => listener.close(() => resolve()));
    try { fs.unlinkSync(socket); } catch { /* Retain only safe lifecycle metadata outside this transport. */ }
  } });
  relayEvidence.set(relay, evidence);
  return relay;
}

/** New segment only. The supervisor chooses a directory absent from every role
 * view. A failed/partial write poisons this segment and therefore all later sends.
 * Every complete event is hash-linked and fsynced before append returns. */
export function createSessionAuditSegment(file: string, scanSecrets: (text: string) => boolean): { append(event: SessionAuditEvent): void; close(): void } {
  const parent = path.dirname(file);
  if (!path.isAbsolute(file) || fs.realpathSync(parent) !== parent || !/^audit-[a-z0-9-]+\.jsonl$/u.test(path.basename(file))) throw new Error('invalid-audit-segment');
  const fd = fs.openSync(file, fs.constants.O_CREAT | fs.constants.O_EXCL | fs.constants.O_WRONLY | fs.constants.O_APPEND | fs.constants.O_NOFOLLOW, 0o600);
  let previous: string | null = null, sequence = 0, poisoned = false, closed = false;
  return { append: event => {
    if (closed || poisoned) throw new Error('audit-segment-unavailable');
    try {
      const text = (value: string): string => {
        if (typeof value !== 'string' || value.length > 1024 || /[\0\r\n]/u.test(value) || scanSecrets(value)) throw new Error('audit-metadata-refused');
        return value;
      };
      if (!['attempt-allowed', 'attempt-refused', 'transport-failed', 'response-refused', 'response-admitted'].includes(event.event)
        || !['allowed', 'refused', 'Unknown', 'response-admitted'].includes(event.outcome)
        || event.credentialIdentity !== 'Unknown' || event.exposureMode !== 'private-local-cli' || event.governingRule !== 'GOVERNANCE-SIMPLIFICATION-D10'
        || (event.status !== null && (!Number.isInteger(event.status) || event.status < 100 || event.status > 599))) throw new Error('audit-metadata-refused');
      const binding = event.subject.binding;
      const admission = event.admission;
      const received = event.received;
      if (received !== null && (!/^[0-9a-f]{64}$/u.test(received.digest) || !Number.isSafeInteger(received.bytes) || received.bytes < 0)) throw new Error('audit-received-refused');
      if (admission !== null && (!/^[0-9a-f]{64}$/u.test(admission.digest) || !Number.isSafeInteger(admission.bytes) || admission.bytes < 0
        || admission.classes.length > SESSION_CONTENT_CLASSES.length || admission.classes.some(item => !SESSION_CONTENT_CLASSES.includes(item))
        || admission.originIds.length > 1024)) throw new Error('audit-admission-refused');
      const safe = {
        event: event.event, requestId: text(event.requestId), at: text(event.at), credentialIdentity: 'Unknown', exposureMode: 'private-local-cli',
        governingRule: 'GOVERNANCE-SIMPLIFICATION-D10', outcome: event.outcome, status: event.status,
        subject: { project: text(event.subject.project), pin: text(event.subject.pin), principal: text(event.subject.principal),
          binding: { run: text(binding.run), role: text(binding.role), sourceBinding: text(binding.sourceBinding), policy: text(binding.policy), provider: text(binding.provider), model: text(binding.model) } },
        admission: admission === null ? null : { digest: admission.digest, bytes: admission.bytes, classes: [...admission.classes], originIds: admission.originIds.map(text) },
        received: received === null ? null : { digest: received.digest, bytes: received.bytes },
      };
      const encoded = JSON.stringify({ format: 'polaris-session-egress-audit/1', sequence: sequence + 1, previousSha256: previous, ...safe });
      if (Buffer.byteLength(encoded) > 262_144) throw new Error('audit-event-limit');
      if (scanSecrets(encoded)) throw new Error('audit-metadata-refused');
      const bytes = Buffer.from(`${encoded}\n`);
      let offset = 0;
      while (offset < bytes.length) {
        const written = fs.writeSync(fd, bytes, offset, bytes.length - offset);
        if (written === 0) throw new Error('audit-write-incomplete');
        offset += written;
      }
      fs.fsyncSync(fd); previous = sha256(encoded); sequence++;
    } catch { poisoned = true; throw new Error('audit-write-failed'); }
  }, close: () => { if (!closed) { closed = true; fs.closeSync(fd); } } };
}
