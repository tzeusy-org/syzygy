// Final-output ceilings: registry `resourceLimits.maxHumanResponseBytes`
// and `maxMachineResponseBytes` with `resourceLimitSemantics.breachResult`
// (registry amendment act, 2026-09-05) under PWB-REQ-006 as amended.
// A breach serves only a bounded typed failure; never a truncated page.

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterAll, beforeAll, describe, expect, it, vi } from 'vitest';

import { tempDir } from '@syzygy/test-kit';
import { createDaemon, type RouteContext, type RouteResponse } from '@syzygy/http-host';
import { PWB_RESOURCE_LIMITS, describeReevaluation, type PocModel, type PwbResourceLimits, type Reevaluation } from '@syzygy/three-surface-poc-core';

import { TAILNET_HOST } from './browser-origin.js';
import { ORRERY_HUMAN_PATH } from './orrery.js';
import { POLARIS_HUMAN_PATH } from './polaris.js';
import { boundedResponse, POC_HUMAN_PATH, POC_MACHINE_PATH, pocRoutes, type ResponseLimitFailure } from './routes.js';
import { resourceHeadroomLine } from './resource-headroom-line.js';
import { ServedResponseRecorder } from './served-response-recorder.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { TRAJECTORY_HUMAN_PATH } from './trajectory.js';

const cleanups: string[] = [];
let model: PocModel;

beforeAll(() => {
  model = buildFixtureModel(cleanups);
});

afterAll(() => {
  for (const path of cleanups.splice(0)) rmSync(path, { recursive: true, force: true });
});

function context(path: string, headers: Record<string, string> = { host: '127.0.0.1:1' }): RouteContext {
  return { request: { method: 'GET', path, query: new URLSearchParams(), headers } };
}

function route(path: string, limits?: PwbResourceLimits): { handle(ctx: RouteContext): RouteResponse } {
  const found = pocRoutes(() => model, limits).find((candidate) => candidate.path === path);
  if (found === undefined) throw new Error(`no route at ${path}`);
  return {
    handle: (ctx) => {
      const response = found.handle(ctx);
      if (response instanceof Promise) throw new Error('POC routes answer synchronously');
      return response;
    },
  };
}

function bytes(body: string): number {
  return Buffer.byteLength(body, 'utf8');
}

function failureOf(body: string): ResponseLimitFailure {
  return JSON.parse(body) as ResponseLimitFailure;
}

describe('boundedResponse — the ceiling is measured on the final encoded body', () => {
  it('logs a single safe response-limit outcome per real-socket human and machine 503', async () => {
    const scratch = tempDir('syzygy-poc-limit-socket-');
    const stateDir = join(scratch, 'state');
    const recorder = new ServedResponseRecorder();
    const limits = { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 0, maxMachineResponseBytes: 0 };
    const started = await createDaemon({ stateDir, routes: pocRoutes(() => model, limits, undefined, recorder), port: 0 });
    if (!started.started) throw new Error(started.failure.kind);
    const daemon = started.daemon;
    const token = readFileSync(daemon.credentialPath, 'utf8').trim();
    const lines: string[] = [];
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(chunk => { lines.push(String(chunk)); return true; });
    try {
      const base = `http://${daemon.host}:${daemon.port}`;
      const human = await fetch(`${base}/`);
      const machine = await fetch(`${base}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } });
      expect(human.status).toBe(503);
      expect(machine.status).toBe(503);
      const failures = [failureOf(await human.text()), failureOf(await machine.text())];
      const records = lines.map(line => JSON.parse(line) as Record<string, unknown>);
      expect(records).toHaveLength(2);
      for (const [index, record] of records.entries()) {
        const failure = failures[index] as ResponseLimitFailure;
        expect(record).toMatchObject({
          reason: 'response-limit-breached', status: 503, contentType: 'application/json',
          evaluation: { inputsDigest: failure.evaluation.inputsDigest, asOf: failure.evaluation.asOf },
          limit: failure.limit, declared: failure.declared, observed: failure.observed,
          population: failure.population, sequence: index + 1,
        });
      }
      expect(records.map(record => record.route)).toEqual(['/', POC_MACHINE_PATH]);
      expect(recorder.snapshot(model.evaluation).count).toBe(2);
      expect(lines.join('')).not.toContain(token);
    } finally {
      stderr.mockRestore();
      await daemon.close();
    }
  });

  it('records concurrent and replayed final-output breaches once each and never clears them on success', async () => {
    const recorder = new ServedResponseRecorder();
    const body = 'héllo';
    const limits = { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 5, maxMachineResponseBytes: 5 };
    for (const limit of ['maxHumanResponseBytes', 'maxMachineResponseBytes'] as const) {
      const breached = boundedResponse(model, limits, limit, 'text/plain', body, recorder);
      expect(breached.status).toBe(503);
      expect(breached.diagnostic).toMatchObject({ kind: 'response-limit-breached', limit, declared: 5, observed: 6, population: failureOf(breached.body).population });
    }
    expect(recorder.snapshot(model.evaluation)).toMatchObject({ count: 2, latest: { sequence: 2, limit: 'maxMachineResponseBytes' } });
    const concurrent = await Promise.all(Array.from({ length: 8 }, async () =>
      boundedResponse(model, limits, 'maxHumanResponseBytes', 'text/plain', body, recorder)));
    expect(concurrent.map(response => response.diagnostic?.sequence)).toEqual([3, 4, 5, 6, 7, 8, 9, 10]);
    expect(boundedResponse(model, limits, 'maxMachineResponseBytes', 'text/plain', body, recorder).diagnostic?.sequence).toBe(11);
    expect(boundedResponse(model, { ...limits, maxHumanResponseBytes: 6 }, 'maxHumanResponseBytes', 'text/plain', body, recorder).status).toBe(200);
    expect(recorder.snapshot(model.evaluation).count).toBe(11);
    const next = { ...model.evaluation, asOf: '2026-09-24T00:00:00Z' };
    expect(recorder.snapshot(next).count).toBe(0);
    expect(recorder.record({ evaluation: next, limit: 'maxHumanResponseBytes', declared: 5, observed: 6, population: { kind: 'unknown', reason: 'project shape not-evaluated' } }).sequence).toBe(1);
    expect(recorder.snapshot(model.evaluation).count).toBe(0);
  });

  it('limit − 1 breaches, limit and limit + 1 serve, for each ceiling', () => {
    const body = 'héllo'; // 6 bytes, 5 code units: the ceiling counts bytes
    expect(bytes(body)).toBe(6);
    expect(body.length).toBe(5);
    for (const limit of ['maxHumanResponseBytes', 'maxMachineResponseBytes'] as const) {
      const at = (declared: number) => boundedResponse(model, { ...PWB_RESOURCE_LIMITS, [limit]: declared }, limit, 'text/plain', body);
      expect(at(5).status, `${limit} at 5`).toBe(503);
      expect(at(6), `${limit} at 6`).toEqual({ status: 200, contentType: 'text/plain', body });
      expect(at(7).status, `${limit} at 7`).toBe(200);
      const failure = failureOf(at(5).body);
      expect(failure).toEqual({
        served: 'nothing',
        failure: 'response-limit-breached',
        evaluation: model.evaluation,
        limit,
        declared: 5,
        observed: 6,
        population: failure.population,
        readiness: false,
      });
      expect(at(5).contentType).toBe('application/json');
      expect(at(5).body).not.toContain(body);
    }
  });

  it('the failure carries the counted population when the project shape is observed, else an Unknown reason', () => {
    const failure = failureOf(boundedResponse(model, { ...PWB_RESOURCE_LIMITS, maxMachineResponseBytes: 0 }, 'maxMachineResponseBytes', 'application/json', '{}').body);
    const shape = model.projectShape;
    if (shape.kind === 'observed') {
      expect(failure.population).toEqual({ kind: 'counted', sources: shape.counts.sources, items: shape.counts.items, facts: shape.counts.facts, exclusions: shape.counts.exclusions });
    } else {
      expect(failure.population).toEqual({ kind: 'unknown', reason: `project shape ${shape.kind}` });
    }
    const unknownShape = { ...model, projectShape: { ...model.projectShape, kind: 'unavailable' } } as unknown as PocModel;
    const unknown = failureOf(boundedResponse(unknownShape, { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 0 }, 'maxHumanResponseBytes', 'text/html', 'x').body);
    expect(unknown.population).toEqual({ kind: 'unknown', reason: 'project shape unavailable' });
  });
});

describe('pocRoutes — every human HTML sink is bounded by maxHumanResponseBytes', () => {
  const pages = [POC_HUMAN_PATH, POLARIS_HUMAN_PATH, TRAJECTORY_HUMAN_PATH, ORRERY_HUMAN_PATH] as const;

  it('places one compact factual status line before main on each direct and tailnet page', () => {
    for (const path of [...pages, ...pages.map(page => `${TAILNET_MOUNT_PREFIX}${page === '/' ? '' : page}`)]) {
      const headers = path.startsWith(TAILNET_MOUNT_PREFIX) ? { host: TAILNET_HOST } : { host: '127.0.0.1:1' };
      const response = route(path).handle(context(path, headers));
      expect(response.status, path).toBe(200);
      const lines = [...response.body.matchAll(/<p class="operability-status"[^>]*>[^<]*<\/p>/g)].map(match => match[0]);
      expect(lines, path).toHaveLength(1);
      const line = lines[0] as string;
      expect(response.body.indexOf(line)).toBeLessThan(response.body.indexOf('<main'));
      expect(line).toContain('data-human-status');
      expect(line).toContain('data-eval=');
      expect(line).toContain('data-breaches=');
      expect(line).toContain('Unknown (not supplied)');
      expect(bytes(line), path).toBeLessThan(400);
      expect(line).not.toMatch(/credential value|healthy|age|href=| id=/i);
    }
    const recorder = new ServedResponseRecorder();
    recorder.record({ evaluation: model.evaluation, limit: 'maxHumanResponseBytes', declared: 5, observed: 6, population: { kind: 'unknown', reason: 'project shape not-evaluated' } });
    const home = pocRoutes(() => model, PWB_RESOURCE_LIMITS, undefined, recorder).find(candidate => candidate.path === POC_HUMAN_PATH);
    if (home === undefined) throw new Error('home route missing');
    const served = home.handle(context(POC_HUMAN_PATH));
    if (served instanceof Promise) throw new Error('home route unexpectedly async');
    const statusLine = /<p class="operability-status"[^>]*>[^<]*<\/p>/.exec(served.body)?.[0];
    expect(statusLine).toContain('breaches input Unknown (no shape), served 1; human #1 6/5 B');
    expect(bytes(statusLine as string)).toBeLessThan(400);
  });

  it('places one resource-ledger entry in the status slot of every direct and tailnet page, Unknown when no block is supplied (syzygy-u05.3)', () => {
    for (const path of [...pages, ...pages.map(page => `${TAILNET_MOUNT_PREFIX}${page === '/' ? '' : page}`)]) {
      const headers = path.startsWith(TAILNET_MOUNT_PREFIX) ? { host: TAILNET_HOST } : { host: '127.0.0.1:1' };
      const body = route(path).handle(context(path, headers)).body;
      const entries = [...body.matchAll(/<p class="operability-resources"[^>]*>[\s\S]*?<\/p>/g)].map(match => match[0]);
      expect(entries, path).toHaveLength(1);
      const entry = entries[0] as string;
      expect(body.indexOf(entry), path).toBeGreaterThan(body.indexOf('<p class="operability-status"'));
      expect(body.indexOf(entry), path).toBeLessThan(body.indexOf('<main'));
      expect([...entry.matchAll(/data-resource-tuple="/g)], path).toHaveLength(8);
      expect(entry).toContain('data-non-citable');
      expect(entry).not.toMatch(/href=| id=|healthy/i);
    }
    expect(resourceHeadroomLine(undefined, value => value)).toBe('<p class="operability-resources" data-human-resources data-copy-role="epistemic-disclosure" data-claim-role="epistemic-claim" data-presentation-artifact data-non-citable>Resources: Unknown (not supplied)</p>');
    const unread = resourceHeadroomLine(model.resourceHeadroom, value => value);
    expect(unread).toContain('<span data-resource-tuple="resource-headroom:maxSources" data-declared="512" data-observed="unknown" data-remaining="unknown">sources Unknown (1) of 512</span>');
    expect(unread).toContain('<span data-resource-tuple="resource-cost" data-bodies-read="unknown" data-bytes="unknown" data-parse-passes="unknown" data-worst-source-passes="unknown">cost Unknown (1)</span>');
    expect(unread).toContain(' Unknown because: (1) no resource ledger ran: the project shape is not-evaluated.</p>');
    expect(unread).not.toMatch(/\b0 of\b|, 0 left/);
  });

  it('names the observed-project limb, the observatory limb and the Dolt clock separately, Unknown when not supplied (syzygy-u05.2)', () => {
    const limbsOf = (body: string): string | undefined => /<p class="operability-limbs"[^>]*>([^<]*)<\/p>/.exec(body)?.[1];
    const page = (reevaluation?: () => Reevaluation | null): string => {
      const home = pocRoutes(() => model, PWB_RESOURCE_LIMITS, undefined, new ServedResponseRecorder(), undefined, reevaluation).find(candidate => candidate.path === POC_HUMAN_PATH);
      if (home === undefined) throw new Error('home route missing');
      const served = home.handle(context(POC_HUMAN_PATH));
      if (served instanceof Promise) throw new Error('home route unexpectedly async');
      return served.body;
    };
    expect(limbsOf(page())).toBe('Observed-project limb: Unknown (not supplied); observatory limb: Unknown (not supplied); Dolt clock: Unknown (not supplied)');
    const reevaluation = describeReevaluation({
      prior: { evaluation: 'evaluation:first', clocks: { butlersHead: 'head-a', workingTreeDigest: 'tree-a', doltRevision: '0123456789abcdef0123' } },
      next: { evaluation: 'evaluation:second', clocks: { butlersHead: 'head-b', workingTreeDigest: 'tree-a', doltRevision: 'fedcba9876543210fedc' } },
      projectChange: { changedSources: 5, addedSources: 0 },
      observatory: { buildRevision: 'abcdef0123456789abcdef', currentRevision: 'later', commitsSinceBuild: 1 },
    });
    expect(limbsOf(page(() => reevaluation))).toBe('Observed-project limb: 5 changed, 0 added since the superseded evaluation; observatory limb: 1 Syzygy commit since build abcdef012345…; Dolt clock: fedcba987654… (moved)');
    const first = describeReevaluation({ prior: null, next: { evaluation: 'evaluation:first', clocks: { butlersHead: 'head-a', workingTreeDigest: 'tree-a', doltRevision: null } }, projectChange: null, observatory: { buildRevision: 'abc', currentRevision: null, commitsSinceBuild: null } });
    expect(limbsOf(page(() => first))).toBe('Observed-project limb: no prior evaluation this run; observatory limb: Unknown (commits since build abc unreadable); Dolt clock: Unknown (work items not observed)');
  });

  it.each(pages)('%s: limit − 1 fails closed, limit and limit + 1 serve the page', (path) => {
    const reference = route(path).handle(context(path));
    expect(reference.status).toBe(200);
    const size = bytes(reference.body);
    expect(size).toBeGreaterThan(0);
    const at = (declared: number) => route(path, { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: declared }).handle(context(path));
    const under = at(size - 1);
    expect(under.status).toBe(503);
    expect(under.contentType).toBe('application/json');
    expect(failureOf(under.body)).toMatchObject({ served: 'nothing', failure: 'response-limit-breached', limit: 'maxHumanResponseBytes', declared: size - 1, observed: size, readiness: false });
    expect(under.body).not.toContain('<html');
    expect(at(size)).toEqual(reference);
    expect(at(size + 1).status).toBe(200);
  });

  it('the tailnet mount (selected by Host) is measured on its own rendered body', () => {
    const path = `${TAILNET_MOUNT_PREFIX}/`;
    const size = bytes(route(path).handle(context(path, { host: TAILNET_HOST })).body);
    expect(size).not.toBe(bytes(route(POC_HUMAN_PATH).handle(context(POC_HUMAN_PATH)).body));
    const at = (declared: number) => route(path, { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: declared }).handle(context(path, { host: TAILNET_HOST }));
    expect(at(size - 1).status).toBe(503);
    expect(at(size).status).toBe(200);
  });

  it('an origin refusal still comes first and is never measured against the page ceiling', () => {
    const refused = route(POC_HUMAN_PATH, { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 0 }).handle(context(POC_HUMAN_PATH, { host: 'poc.attacker.invalid' }));
    expect(refused.status).toBe(403);
  });
});

describe('pocRoutes — the machine JSON sink is bounded by maxMachineResponseBytes', () => {
  it('does not turn a matching validator into a 304 when the complete body breaches its ceiling', () => {
    const full = route(POC_MACHINE_PATH).handle(context(POC_MACHINE_PATH));
    expect(full.status).toBe(200);
    const etag = full.revalidation?.etag;
    expect(etag).toMatch(/^W\/"sha256:[0-9a-f]{64}"$/);
    const size = bytes(full.body);
    const recorder = new ServedResponseRecorder();
    const candidate = pocRoutes(() => model, { ...PWB_RESOURCE_LIMITS, maxMachineResponseBytes: size - 1 }, undefined, recorder)
      .find((entry) => entry.path === POC_MACHINE_PATH);
    if (candidate === undefined) throw new Error('machine route missing');
    const result = candidate.handle(context(POC_MACHINE_PATH, { 'if-none-match': etag as string }));
    if (result instanceof Promise) throw new Error('POC route unexpectedly async');
    expect(result.status).toBe(503);
    expect(result.revalidation).toBeUndefined();
    expect(failureOf(result.body)).toMatchObject({ failure: 'response-limit-breached', observed: size, declared: size - 1, readiness: false });
    expect(recorder.snapshot(model.evaluation).count).toBe(1);
  });
  it.each([POC_MACHINE_PATH, `${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}`])('%s: limit − 1 fails closed, limit and limit + 1 serve the model', (path) => {
    const body = route(path).handle(context(path, {})).body;
    const size = bytes(body);
    const at = (declared: number) => route(path, { ...PWB_RESOURCE_LIMITS, maxMachineResponseBytes: declared }).handle(context(path, {}));
    const under = at(size - 1);
    expect(under.status).toBe(503);
    expect(bytes(under.body)).toBeLessThan(size);
    expect(failureOf(under.body)).toMatchObject({ served: 'nothing', limit: 'maxMachineResponseBytes', declared: size - 1, observed: size, evaluation: model.evaluation, readiness: false });
    expect(under.body).not.toContain('"surfaces"');
    expect(at(size)).toMatchObject({ status: 200, contentType: 'application/json', body });
    expect(at(size + 1).status).toBe(200);
  });

  it('the human ceiling does not bound the machine sink and vice versa', () => {
    const humanOnly = { ...PWB_RESOURCE_LIMITS, maxHumanResponseBytes: 0 };
    expect(route(POC_MACHINE_PATH, humanOnly).handle(context(POC_MACHINE_PATH, {})).status).toBe(200);
    const machineOnly = { ...PWB_RESOURCE_LIMITS, maxMachineResponseBytes: 0 };
    expect(route(POC_HUMAN_PATH, machineOnly).handle(context(POC_HUMAN_PATH)).status).toBe(200);
  });

  it('the registry values are the default ceilings', () => {
    expect(PWB_RESOURCE_LIMITS.maxHumanResponseBytes).toBe(2097152);
    expect(PWB_RESOURCE_LIMITS.maxMachineResponseBytes).toBe(16777216);
    expect(route(POC_HUMAN_PATH).handle(context(POC_HUMAN_PATH)).status).toBe(200);
    expect(route(POC_MACHINE_PATH).handle(context(POC_MACHINE_PATH, {})).status).toBe(200);
  });
});
