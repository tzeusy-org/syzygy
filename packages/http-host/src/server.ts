import * as http from 'node:http';

import type { AdmissionResult } from '@syzygy/cap1-core';

import {
  credentialFromAuthorizationHeader,
  ensureCredential,
  verifyCredential,
} from './credentials.js';

// The generic HTTP host both apps serve through (syzygy-bpyt.7.3): the
// Capability 1 daemon and the Three-Surface POC. Admission happens at
// the transport, under RFC5-3: by the credential presented, never by
// network location. The server binds 127.0.0.1 only, and the gate
// consults nothing but the Authorization header (CAP1-REQ-012).
//
// The server is a ROUTE REGISTRY that owns no route: each app passes
// its `Route` values to `createDaemon` (the Capability 1 root route
// lives in @syzygy/cap1-daemon). The load-bearing mount property:
// credential admission runs BEFORE any machine-credentialed handler. A
// missing or invalid credential gets core's named refusal and the
// handler is NEVER invoked — no partial answer can exist, because the
// handler that would compute one never ran. Refusal bodies are core's
// named vocabulary (`{ admitted: false, served: 'nothing' }`), never a
// bare 401 string.
//
// Startup writes: exactly the credential/state files inside the
// explicit state directory (via `ensureCredential`, whose writes are
// routed through the state-write boundary). Nothing else is written.

// Local-only binding, fixed. Not configurable: the daemon is a LOCAL
// daemon; exposure beyond loopback is out of Capability 1's scope.
export const DAEMON_HOST = '127.0.0.1' as const;

export type CredentialClass = 'human-open' | 'machine-credentialed';

export interface RouteRequest {
  readonly method: string;
  /** URL pathname only (no query string). */
  readonly path: string;
  readonly query: URLSearchParams;
  readonly headers: Readonly<Record<string, string | string[] | undefined>>;
}

/** A complete response. Handlers return the WHOLE body — the mount
 * writes it in one step, so a throwing handler can never have sent a
 * partial answer. */
export interface RouteResponse {
  readonly status: number;
  readonly contentType: string;
  readonly body: string;
  /** Only the POC machine validator may populate these transport headers. */
  readonly revalidation?: { readonly etag: string; readonly cacheControl: 'private, no-cache' };
  /** Trusted transport metadata for a bounded final response. Never sourced
   * from request text or parsed out of a response body. */
  readonly diagnostic?: {
    readonly kind: 'response-limit-breached';
    readonly evaluation: { readonly inputsDigest: string; readonly asOf: string };
    readonly limit: 'maxHumanResponseBytes' | 'maxMachineResponseBytes';
    readonly declared: number;
    readonly observed: number;
    readonly population:
      | { readonly kind: 'counted'; readonly sources: number; readonly items: number; readonly facts: number; readonly exclusions: number }
      | { readonly kind: 'unknown'; readonly reason: string };
    readonly sequence: number;
  };
}

export interface RouteContext {
  readonly request: RouteRequest;
  /** Present exactly for machine-credentialed routes, and always the
   * ADMITTED arm — a refused admission never reaches a handler. */
  readonly admission?: Extract<AdmissionResult, { admitted: true }> | undefined;
}

// The route-registry contract every app builds on: one value per
// (method, path), classed by credential requirement. Registration is
// data — pass the Route in `DaemonOptions.routes`; the mount applies
// admission for 'machine-credentialed' routes before `handle` runs.
export interface Route {
  readonly method: 'GET' | 'HEAD' | 'POST' | 'PUT' | 'DELETE';
  readonly path: string;
  readonly credentialClass: CredentialClass;
  handle(ctx: RouteContext): RouteResponse | Promise<RouteResponse>;
}

// Named bodies — every non-handler response is a named value, never a
// bare status string.
//
// The refusal body is core's admission vocabulary VERBATIM: refused
// admission serves 'nothing' (CAP1-REQ-015 oracle limb (c)).
export const REFUSAL_BODY = { admitted: false, served: 'nothing' } as const;
export const REFUSAL_STATUS = 401;

// Unknown route: an explicit named 404 body, never silence.
export const UNKNOWN_ROUTE_REASON = 'unknown-route' as const;
export const UNKNOWN_ROUTE_STATUS = 404;

// A handler that threw: the named failure, never a partial answer (the
// handler's body never started writing — see RouteResponse).
export const HANDLER_FAILURE_REASON = 'handler-failure' as const;
export const HANDLER_FAILURE_STATUS = 500;

export interface DaemonOptions {
  /** The daemon state directory — the ONLY location startup may write. */
  readonly stateDir: string;
  readonly routes: readonly Route[];
  /** TCP port; 0 (the default) binds an ephemeral port for tests. */
  readonly port?: number | undefined;
}

export interface RunningDaemon {
  readonly host: typeof DAEMON_HOST;
  readonly port: number;
  /** Where the machine credential lives — the PATH, never the value. */
  readonly credentialPath: string;
  readonly credentialProvision: 'minted' | 'reused';
  close(): Promise<void>;
}

export type DaemonStart =
  | { readonly started: true; readonly daemon: RunningDaemon }
  | {
      readonly started: false;
      readonly failure:
        | { readonly kind: 'credential-unprovisionable'; readonly detail: string }
        | { readonly kind: 'duplicate-route'; readonly detail: string }
        | { readonly kind: 'bind-failed'; readonly detail: string };
    };

function routeKey(method: string, path: string): string {
  return `${method} ${path}`;
}

function respond(res: http.ServerResponse, response: RouteResponse): void {
  res.writeHead(response.status, {
    'content-type': response.contentType,
    ...(response.revalidation === undefined ? {} : {
      etag: response.revalidation.etag,
      'cache-control': response.revalidation.cacheControl,
    }),
  });
  res.end(response.body);
}

function safeResponseDiagnostic(response: RouteResponse): Record<string, unknown> | undefined {
  const diagnostic = response.diagnostic;
  if (diagnostic?.kind !== 'response-limit-breached'
    || !/^[0-9a-f]{64}$/.test(diagnostic.evaluation.inputsDigest)
    || !/^\d{4}-\d\d-\d\dT\d\d:\d\d:\d\d(?:\.\d+)?Z$/.test(diagnostic.evaluation.asOf)
    || !['maxHumanResponseBytes', 'maxMachineResponseBytes'].includes(diagnostic.limit)
    || ![diagnostic.declared, diagnostic.observed, diagnostic.sequence].every(value => Number.isSafeInteger(value) && value >= 0)) return undefined;
  const population = diagnostic.population;
  const safePopulation = population.kind === 'counted'
    && [population.sources, population.items, population.facts, population.exclusions].every(value => Number.isSafeInteger(value) && value >= 0)
    ? { kind: 'counted', sources: population.sources, items: population.items, facts: population.facts, exclusions: population.exclusions }
    : population.kind === 'unknown' && ['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed'].includes(population.reason)
      ? { kind: 'unknown', reason: population.reason }
      : undefined;
  if (safePopulation === undefined) return undefined;
  return {
    evaluation: { inputsDigest: diagnostic.evaluation.inputsDigest, asOf: diagnostic.evaluation.asOf },
    limit: diagnostic.limit,
    declared: diagnostic.declared,
    observed: diagnostic.observed,
    population: safePopulation,
    sequence: diagnostic.sequence,
  };
}

function emitNonSuccess(input: {
  readonly method: Route['method'] | 'UNKNOWN';
  readonly route: string | null;
  readonly pathLength?: number;
  readonly response: RouteResponse;
  readonly reason: 'unknown-route' | 'credential-refused' | 'handler-failure' | 'route-non-success' | 'response-limit-breached';
}): void {
  if (input.response.status < 300 || input.response.status === 304 || input.response.status > 599) return;
  const diagnostic = safeResponseDiagnostic(input.response);
  process.stderr.write(`${JSON.stringify({
    kind: 'daemon-http-outcome',
    at: new Date().toISOString(),
    method: input.method,
    ...(input.route === null ? { pathLength: input.pathLength } : { route: input.route }),
    status: input.response.status,
    reason: diagnostic === undefined ? input.reason : 'response-limit-breached',
    contentType: input.response.contentType === 'application/json' ? 'application/json' : 'other',
    ...(diagnostic === undefined ? {} : diagnostic),
  })}\n`);
}

/**
 * Create and start the daemon: provision the credential (the one
 * startup write, inside `stateDir`), mount the routes, bind 127.0.0.1.
 * Every failure is a named arm; a started daemon is closed via
 * `close()`.
 */
export async function createDaemon(options: DaemonOptions): Promise<DaemonStart> {
  const provision = ensureCredential(options.stateDir);
  if (provision.kind === 'unprovisionable') {
    return {
      started: false,
      failure: { kind: 'credential-unprovisionable', detail: provision.detail },
    };
  }
  const expectedToken = provision.token;

  const registry = new Map<string, Route>();
  for (const route of options.routes) {
    const key = routeKey(route.method, route.path);
    if (registry.has(key)) {
      return {
        started: false,
        failure: {
          kind: 'duplicate-route',
          detail: `two routes registered for \`${key}\``,
        },
      };
    }
    registry.set(key, route);
  }

  const server = http.createServer((req, res) => {
    void handleRequest(req, res);
  });

  async function handleRequest(
    req: http.IncomingMessage,
    res: http.ServerResponse,
  ): Promise<void> {
    const url = new URL(req.url ?? '/', `http://${DAEMON_HOST}`);
    const method = req.method ?? 'GET';
    const route = registry.get(routeKey(method, url.pathname));

    if (route === undefined) {
      const response: RouteResponse = { status: UNKNOWN_ROUTE_STATUS, contentType: 'application/json', body: JSON.stringify({
        served: 'nothing',
        reason: UNKNOWN_ROUTE_REASON,
        method,
        path: url.pathname,
      }) };
      emitNonSuccess({ method: 'UNKNOWN', route: null, pathLength: url.pathname.length, response, reason: 'unknown-route' });
      respond(res, response);
      return;
    }

    let admission: Extract<AdmissionResult, { admitted: true }> | undefined;
    if (route.credentialClass === 'machine-credentialed') {
      // Admission BEFORE the handler: a refused credential means the
      // handler is never invoked and nothing but the named refusal is
      // served. The decision consults the presented credential alone —
      // no address, no route detail (RFC5-3).
      const credential = credentialFromAuthorizationHeader(req.headers.authorization);
      const result = verifyCredential(expectedToken, credential);
      if (!result.admitted) {
        const response: RouteResponse = { status: REFUSAL_STATUS, contentType: 'application/json', body: JSON.stringify(REFUSAL_BODY) };
        emitNonSuccess({ method: route.method, route: route.path, response, reason: 'credential-refused' });
        respond(res, response);
        return;
      }
      admission = result;
    }

    const context: RouteContext = {
      request: {
        method,
        path: url.pathname,
        query: url.searchParams,
        headers: req.headers,
      },
      admission,
    };

    try {
      const response = await route.handle(context);
      emitNonSuccess({ method: route.method, route: route.path, response, reason: 'route-non-success' });
      respond(res, response);
    } catch (cause) {
      // The handler returns a complete body or nothing (RouteResponse),
      // so no partial answer preceded this named failure.
      const response: RouteResponse = { status: HANDLER_FAILURE_STATUS, contentType: 'application/json', body: JSON.stringify({
        served: 'nothing',
        reason: HANDLER_FAILURE_REASON,
        detail: cause instanceof Error ? cause.message : String(cause),
      }) };
      emitNonSuccess({ method: route.method, route: route.path, response, reason: 'handler-failure' });
      respond(res, response);
    }
  }

  const port = options.port ?? 0;
  const bound = await new Promise<
    { readonly ok: true; readonly port: number } | { readonly ok: false; readonly detail: string }
  >((resolve) => {
    server.once('error', (cause) => {
      resolve({ ok: false, detail: cause.message });
    });
    server.listen(port, DAEMON_HOST, () => {
      const address = server.address();
      if (address === null || typeof address === 'string') {
        server.close();
        resolve({ ok: false, detail: 'server bound without a TCP address' });
        return;
      }
      resolve({ ok: true, port: address.port });
    });
  });

  if (!bound.ok) {
    return { started: false, failure: { kind: 'bind-failed', detail: bound.detail } };
  }

  return {
    started: true,
    daemon: {
      host: DAEMON_HOST,
      port: bound.port,
      credentialPath: provision.path,
      credentialProvision: provision.kind,
      close: () =>
        new Promise<void>((resolve, reject) => {
          server.close((cause) => (cause ? reject(cause) : resolve()));
        }),
    },
  };
}
