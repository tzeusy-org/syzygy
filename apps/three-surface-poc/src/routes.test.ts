import { createHash } from 'node:crypto';
import { lstatSync, mkdirSync, readFileSync, readdirSync, rmSync, writeFileSync } from 'node:fs';
import { request as httpRequest } from 'node:http';
import { dirname, join } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { createDaemon, type Route, type RunningDaemon } from '@syzygy/http-host';
import { tempDir } from '@syzygy/test-kit';
import { BUTLERS_POC_SEEDS, buildPocModel, buildResponseIdentity, type PocModel } from '@syzygy/three-surface-poc-core';

import { POC_MACHINE_PATH, POLARIS_PRESENTATION_PATH, pocRoutes, renderPocPage } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { ADMITTING_AUTHORITY, projectShapeFixtureGit } from './test-project-shape-fixture.js';
import { buildFixtureModel } from './test-model-fixture.js';

const cleanups: string[] = [];
const running: RunningDaemon[] = [];

afterEach(async () => {
  for (const daemon of running.splice(0)) {
    await daemon.close().catch(() => undefined);
  }
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function stateDirectorySnapshot(root: string): readonly { path: string; kind: string; bytes?: string; mtimeNs: string }[] {
  const entries: { path: string; kind: string; bytes?: string; mtimeNs: string }[] = [];
  const visit = (relative: string): void => {
    const absolute = join(root, relative);
    const stat = lstatSync(absolute, { bigint: true });
    const kind = stat.isDirectory() ? 'directory' : stat.isFile() ? 'file' : 'other';
    entries.push({
      path: relative || '.',
      kind,
      ...(stat.isFile() ? { bytes: readFileSync(absolute).toString('base64') } : {}),
      mtimeNs: String(stat.mtimeNs),
    });
    if (stat.isDirectory()) {
      for (const name of readdirSync(absolute).sort()) visit(join(relative, name));
    }
  };
  visit('');
  return entries;
}

function modelFixture(): PocModel {
  const repoRoot = tempDir('syzygy-poc-route-butlers-');
  const files: Readonly<Record<string, string>> = {
    'docs/plans/2026-08-24-whatsapp-identity-reconciliation-design.md':
      '# design\nStatus: Approved for implementation\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/proposal.md':
      '# proposal\n- Sign-off: owner approved the design and end-to-end implementation on 2026-08-24.\n',
    'openspec/changes/repair-whatsapp-identity-reconciliation/specs/switchboard-identity/spec.md':
      '# REQ-switchboard-identity-001\nwhatsapp_user_client -> whatsapp_jid\n',
    'src/butlers/identity.py': 'def canonical_identity(): pass\n',
    'tests/core/test_identity.py': 'def test_identity(): pass\n',
  };
  for (const [relativePath, contents] of Object.entries(files)) {
    const absolutePath = join(repoRoot, relativePath);
    mkdirSync(dirname(absolutePath), { recursive: true });
    writeFileSync(absolutePath, contents, 'utf8');
  }
  return buildPocModel({
    seeds: BUTLERS_POC_SEEDS,
    repoRoot,
    repositoryRevision: 'c13894238989d3bebb24094730992970b31fe546',
    observerRevision: 'bfdb7963e4ff5628d0d1ec0f59e831d7e8209abe',
    evaluation: { snapshot: 'butlers@c1389423', asOf: '2026-08-29T12:00:00Z' },
  });
}

function idsFromHtml(html: string, attribute: string): string[] {
  return [...html.matchAll(new RegExp(`(?:\\s|<)${attribute}="([^"]+)"`, 'g'))]
    .map((match) => match[1])
    .filter((value): value is string => value !== undefined);
}

function parityTuples(model: PocModel): string[] {
  return [
    ...model.entities.map((entity) =>
      JSON.stringify([
        'entity',
        entity.id,
        entity.kind,
        entity.title,
        entity.detail,
        entity.epistemic,
        entity.provenance,
      ]),
    ),
    ...model.relationships.map((relationship) =>
      JSON.stringify([
        'relationship',
        relationship.id,
        relationship.kind,
        relationship.from,
        relationship.to,
        relationship.statement,
        relationship.epistemic,
        relationship.provenance,
      ]),
    ),
  ].sort();
}

function decodeHtmlText(text: string): string {
  return text
    .replaceAll('&lt;', '<')
    .replaceAll('&gt;', '>')
    .replaceAll('&quot;', '"')
    .replaceAll('&#39;', "'")
    .replaceAll('&amp;', '&');
}

function visibleField(row: string, field: string): string {
  const match = new RegExp(`data-parity-field="${field}"[^>]*>([^<]*)</`).exec(row);
  if (match?.[1] === undefined) {
    throw new Error(`visible parity field missing: ${field}`);
  }
  return decodeHtmlText(match[1]);
}

function visibleProvenance(row: string): PocModel['entities'][number]['provenance'] {
  return [...row.matchAll(/<li data-parity-provenance>([\s\S]*?)<\/li>/g)].map(
    (match) => {
      const item = match[1] ?? '';
      const digestMatch = /data-parity-field="provenance-digest">([^<]*)</.exec(item);
      return {
        kind: visibleField(item, 'provenance-kind') as
          | 'repository-file'
          | 'git-revision'
          | 'manual-mapping',
        source: visibleField(item, 'provenance-source'),
        revision: visibleField(item, 'provenance-revision'),
        ...(digestMatch?.[1] === undefined
          ? {}
          : { digest: decodeHtmlText(digestMatch[1]) }),
      };
    },
  );
}

// An Unknown row's closed reason is on its disclosure marker; each route's
// machine form is on its route span; the action route is its link.
function visibleEpistemic(row: string): unknown {
  const label = visibleField(row, 'epistemic-label');
  const explanation = visibleField(row, 'epistemic-explanation');
  if (label === 'Observed') return { label: 'Observed', basis: explanation };
  const closedReason = /\sdata-unknown-disclosure="[^"]*" data-unknown-reason="([^"]*)"/.exec(row)?.[1];
  const resolutionRoutes = [
    ...row.matchAll(/<span data-unknown-route="([^"]*)" data-route-actor="([^"]*)" data-route-verb="([^"]*)" data-route-target="([^"]*)">([^<]*)<\/span>/g),
  ].map((route) => ({ reason: route[1], route: decodeHtmlText(route[5] ?? ''), actor: route[2], verb: route[3], target: route[4] }));
  const action = /<a href="[^"#]*\/(trajectory)#([^"]*)"[^>]*data-cross-surface-class="action-route"/.exec(row);
  return {
    label: 'Unknown',
    reason: explanation,
    closedReason,
    resolutionRoutes,
    ...(action === null ? {} : { actionRoute: { surface: action[1], anchor: action[2] } }),
  };
}

function visibleParityTuples(html: string): string[] {
  const entityRows = [
    ...html.matchAll(/<tr[^>]*data-entity-id="[^"]+"[^>]*>([\s\S]*?)<\/tr>/g),
  ].map((match) => {
    const row = match[1] ?? '';
    return JSON.stringify([
      'entity',
      visibleField(row, 'entity-id'),
      visibleField(row, 'entity-kind'),
      visibleField(row, 'entity-title'),
      visibleField(row, 'entity-detail'),
      visibleEpistemic(row),
      visibleProvenance(row),
    ]);
  });
  const relationshipRows = [
    ...html.matchAll(
      /<tr[^>]*data-relationship-id="[^"]+"[^>]*>([\s\S]*?)<\/tr>/g,
    ),
  ].map((match) => {
    const row = match[1] ?? '';
    return JSON.stringify([
      'relationship',
      visibleField(row, 'relationship-id'),
      visibleField(row, 'relationship-kind'),
      visibleField(row, 'relationship-from'),
      visibleField(row, 'relationship-to'),
      visibleField(row, 'relationship-statement'),
      visibleEpistemic(row),
      visibleProvenance(row),
    ]);
  });
  return [...entityRows, ...relationshipRows].sort();
}

// Independent wire oracle for responseIdentity: deliberately separate from
// the core walker's path grammar and canonicalJson implementation.
function independentCanonicalJson(value: unknown): string {
  const canonicalize = (candidate: unknown): unknown => {
    if (Array.isArray(candidate)) return candidate.map(canonicalize);
    if (candidate !== null && typeof candidate === 'object') {
      const record = candidate as Record<string, unknown>;
      return Object.fromEntries(
        Object.keys(record)
          .filter((key) => record[key] !== undefined)
          .sort()
          .map((key) => [key, canonicalize(record[key])]),
      );
    }
    return candidate;
  };
  return JSON.stringify(canonicalize(value));
}

function independentDeletePath(root: Record<string, unknown>, path: string): boolean {
  const segments = path.split('.').map((raw) => ({
    key: raw.endsWith('[]') ? raw.slice(0, -2) : raw,
    all: raw.endsWith('[]'),
  }));
  const remove = (value: unknown, index: number): boolean => {
    if (value === null || typeof value !== 'object' || Array.isArray(value)) return false;
    const record = value as Record<string, unknown>;
    const segment = segments[index];
    if (segment === undefined || !(segment.key in record)) return false;
    if (index === segments.length - 1) {
      delete record[segment.key];
      return true;
    }
    const child = record[segment.key];
    if (segment.all) {
      if (!Array.isArray(child)) throw new Error(`independent path ${path} expected an array`);
      return child.reduce((found, member) => remove(member, index + 1) || found, false);
    }
    return remove(child, index + 1);
  };
  return remove(root, 0);
}

function independentResponseKey(body: Record<string, unknown>): string {
  const identity = body.responseIdentity as { contentKey?: string; readonly excludes: readonly string[] };
  delete identity.contentKey;
  for (const path of identity.excludes) independentDeletePath(body, path);
  return `sha256:${createHash('sha256').update(independentCanonicalJson(body)).digest('hex')}`;
}

async function startPoc(model: PocModel): Promise<{
  readonly daemon: RunningDaemon;
  readonly token: string;
  readonly stateDir: string;
}> {
  const stateDir = join(tempDir('syzygy-poc-route-state-'), 'state');
  const start = await createDaemon({
    stateDir,
    routes: pocRoutes(() => model),
    port: 0,
  });
  if (!start.started) {
    throw new Error(`daemon failed to start: ${start.failure.kind}`);
  }
  running.push(start.daemon);
  return {
    daemon: start.daemon,
    token: readFileSync(start.daemon.credentialPath, 'utf8').trim(),
    stateDir,
  };
}

describe('three-surface POC routes', () => {
  it('projects all 15 registered route tuples into both machine answers, with one request-form self', async () => {
    const model = modelFixture();
    const { daemon, token } = await startPoc(model);
    const base = `http://${daemon.host}:${daemon.port}`;
    const routes = pocRoutes(() => model);
    const expected = routes.map(({ path, method, credentialClass }) => JSON.stringify([path, method, credentialClass])).sort();
    expect(expected).toHaveLength(15);
    const forms = [
      { path: POC_MACHINE_PATH, host: undefined, self: POC_MACHINE_PATH },
      { path: POC_MACHINE_PATH, host: 'tzeusy.parrot-hen.ts.net', self: `${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}` },
      { path: `${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}`, host: undefined, self: `${TAILNET_MOUNT_PREFIX}${POC_MACHINE_PATH}` },
      { path: POLARIS_PRESENTATION_PATH, host: undefined, self: POLARIS_PRESENTATION_PATH },
      { path: POLARIS_PRESENTATION_PATH, host: 'tzeusy.parrot-hen.ts.net', self: `${TAILNET_MOUNT_PREFIX}${POLARIS_PRESENTATION_PATH}` },
    ];
    const truthKeys: string[] = [];
    for (const form of forms) {
      const served = form.host === undefined
        ? await fetch(`${base}${form.path}`, { headers: { authorization: `Bearer ${token}` } }).then(async (response) => ({ status: response.status, body: await response.text() }))
        : await new Promise<{ status: number; body: string }>((resolve, reject) => {
          const request = httpRequest(`${base}${form.path}`, { headers: { authorization: `Bearer ${token}`, host: form.host } }, (response) => {
            const chunks: Buffer[] = [];
            response.on('data', (chunk: Buffer) => chunks.push(chunk));
            response.on('end', () => resolve({ status: response.statusCode ?? 0, body: Buffer.concat(chunks).toString('utf8') }));
          });
          request.on('error', reject);
          request.end();
        });
      expect(served.status).toBe(200);
      const body = JSON.parse(served.body) as { links: NonNullable<PocModel['links']> };
      expect(body.links.map(({ path, method, credentialClass }) => JSON.stringify([path, method, credentialClass])).sort()).toEqual(expected);
      expect(body.links.filter((link) => link.self).map((link) => link.path), `${form.path} Host=${form.host ?? 'direct'}`).toEqual([form.self]);
      if (form.path.endsWith(POC_MACHINE_PATH)) truthKeys.push((JSON.parse(served.body) as PocModel).responseIdentity.contentKey);
    }
    expect(truthKeys).toHaveLength(3);
    expect(truthKeys[0]).not.toBe(truthKeys[1]);
    expect(truthKeys[1]).toBe(truthKeys[2]);
  });

  it('derives links and response identity from the live registered array, including an injected route and order', async () => {
    const model = modelFixture();
    const routes = pocRoutes(() => model) as Route[];
    routes.reverse();
    routes.push({ method: 'GET', path: '/injected', credentialClass: 'human-open', handle: () => ({ status: 200, contentType: 'text/plain', body: 'injected' }) });
    const stateDir = join(tempDir('syzygy-poc-route-injected-'), 'state');
    const start = await createDaemon({ stateDir, routes, port: 0 });
    if (!start.started) throw new Error(start.failure.kind);
    running.push(start.daemon);
    const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
    const response = await fetch(`http://${start.daemon.host}:${start.daemon.port}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } });
    expect(response.status).toBe(200);
    const served = JSON.parse(await response.text()) as PocModel & { links: NonNullable<PocModel['links']> };
    expect(served.links).toHaveLength(16);
    expect(served.links.map(({ path }) => path)).toEqual(routes.map(({ path }) => path));
    expect(served.links.at(-1)).toEqual({ path: '/injected', method: 'GET', credentialClass: 'human-open', self: false });
    expect(served.links.filter(({ self }) => self)).toHaveLength(1);
    expect(served.responseIdentity.contentKey).not.toBe(model.responseIdentity.contentKey);
    expect(independentResponseKey(JSON.parse(JSON.stringify(served)) as Record<string, unknown>)).toBe(served.responseIdentity.contentKey);
  });

  it('revalidates only the complete bounded /api/poc representation, after credential admission', async () => {
    const initial = modelFixture();
    let current: PocModel = initial;
    let handled = 0;
    const stateDir = join(tempDir('syzygy-poc-conditional-state-'), 'state');
    const start = await createDaemon({ stateDir, routes: pocRoutes(() => { handled += 1; return current; }), port: 0 });
    if (!start.started) throw new Error(start.failure.kind);
    running.push(start.daemon);
    const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
    const base = `http://${start.daemon.host}:${start.daemon.port}`;
    const url = `${base}${POC_MACHINE_PATH}`;
    const auth = { authorization: `Bearer ${token}` };
    const first = await fetch(url, { headers: auth });
    const firstBody = await first.text();
    const etag = first.headers.get('etag');
    expect(first.status).toBe(200);
    expect(etag).toBe(`W/"${(JSON.parse(firstBody) as PocModel).responseIdentity.contentKey}"`);
    expect(first.headers.get('cache-control')).toBe('private, no-cache');
    const beforeRefusal = handled;
    for (const authorization of [undefined, 'Bearer wrong']) {
      const refused = await fetch(url, { headers: { 'if-none-match': etag as string, ...(authorization === undefined ? {} : { authorization }) } });
      expect(refused.status).toBe(401);
      expect(refused.headers.get('etag')).toBeNull();
    }
    expect(handled).toBe(beforeRefusal);
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation(() => true);
    try {
      for (const condition of [etag as string, `"other", "${(JSON.parse(firstBody) as PocModel).responseIdentity.contentKey}"`, '*']) {
        const cached = await fetch(url, { headers: { ...auth, 'if-none-match': condition } });
        expect(cached.status).toBe(304);
        expect(await cached.text()).toBe('');
        expect(cached.headers.get('etag')).toBe(etag);
        expect(cached.headers.get('cache-control')).toBe('private, no-cache');
      }
      expect(stderr).not.toHaveBeenCalled();
    } finally { stderr.mockRestore(); }
    for (const condition of ['invalid', 'W/"unterminated', '"other"', '*, "other"']) {
      const response = await fetch(url, { headers: { ...auth, 'if-none-match': condition } });
      expect(response.status).toBe(200);
      expect(await response.text()).toBe(firstBody);
    }
    const presentation = await fetch(`${base}${POLARIS_PRESENTATION_PATH}`, { headers: { ...auth, 'if-none-match': etag as string } });
    expect(presentation.status).toBe(200);
    expect(presentation.headers.get('etag')).toBeNull();
    current = { ...initial, evaluation: { ...initial.evaluation, asOf: '2026-08-29T12:01:00Z' } };
    const recaptured = await fetch(url, { headers: { ...auth, 'if-none-match': etag as string } });
    expect(recaptured.status).toBe(304);
    expect(await recaptured.text()).toBe('');
    expect((JSON.parse(firstBody) as PocModel).evaluation.asOf).toBe(initial.evaluation.asOf);
    current = { ...initial, project: { ...initial.project, name: `${initial.project.name} changed` } };
    const changed = await fetch(url, { headers: { ...auth, 'if-none-match': etag as string } });
    expect(changed.status).toBe(200);
    expect(changed.headers.get('etag')).not.toBe(etag);
  });

  it('refuses a stale validator after a project-shape fact changes while inputsDigest stays fixed', async () => {
    const baseline = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    if (baseline.projectShape.kind !== 'observed') throw new Error('fixture must observe shape');
    const firstFact = baseline.projectShape.facts[0];
    if (firstFact === undefined) throw new Error('fixture must carry a fact');
    let current: PocModel = baseline;
    const stateDir = join(tempDir('syzygy-poc-fact-conditional-'), 'state');
    const started = await createDaemon({ stateDir, routes: pocRoutes(() => current), port: 0 });
    if (!started.started) throw new Error(started.failure.kind);
    running.push(started.daemon);
    const token = readFileSync(started.daemon.credentialPath, 'utf8').trim();
    const url = `http://${started.daemon.host}:${started.daemon.port}${POC_MACHINE_PATH}`;
    const first = await fetch(url, { headers: { authorization: `Bearer ${token}` } });
    expect(first.status).toBe(200);
    const etag = first.headers.get('etag') as string;
    current = { ...baseline, projectShape: { ...baseline.projectShape, facts: [{ ...firstFact, fact: { ...firstFact.fact, fact: `${firstFact.fact.fact}-changed` } }, ...baseline.projectShape.facts.slice(1)] } };
    expect(current.evaluation.inputsDigest).toBe(baseline.evaluation.inputsDigest);
    const changed = await fetch(url, { headers: { authorization: `Bearer ${token}`, 'if-none-match': etag } });
    expect(changed.status).toBe(200);
    expect(changed.headers.get('etag')).not.toBe(etag);
  });
  it('serves one model through human and authenticated machine views', async () => {
    const model = modelFixture();
    const { daemon, token } = await startPoc(model);
    const baseUrl = `http://${daemon.host}:${daemon.port}`;

    const humanResponse = await fetch(`${baseUrl}/`);
    expect(humanResponse.status).toBe(200);
    expect(humanResponse.headers.get('content-type')).toBe('text/html; charset=utf-8');
    const html = await humanResponse.text();
    expect(html).toContain('<h2>Polaris</h2>');
    expect(html).toContain('<h2>Trajectory</h2>');
    expect(html).toContain('<h2>Orrery</h2>');
    expect(html).toContain('No POC work item has been materialized.');
    expect(html).toContain('No test artifact has been captured for this evaluation.');
    expect(html).toContain('No current runtime observation was supplied.');

    expect(new Set(idsFromHtml(html, 'data-entity-id'))).toEqual(
      new Set(model.entities.map((entity) => entity.id)),
    );
    expect(new Set(idsFromHtml(html, 'data-relationship-id'))).toEqual(
      new Set(model.relationships.map((relationship) => relationship.id)),
    );
    const targetIds = new Set(idsFromHtml(html, 'id'));
    for (const href of idsFromHtml(html, 'href')) {
      if (href.startsWith('#')) {
        expect(targetIds.has(href.slice(1))).toBe(true);
      }
    }

    const sameOrigin = await fetch(`${baseUrl}/`, { headers: { origin: baseUrl } });
    expect(sameOrigin.status).toBe(200);
    const rebound = await fetch(`${baseUrl}/`, {
      headers: {
        host: 'poc.attacker.invalid',
        origin: 'http://poc.attacker.invalid',
      },
    });
    expect(rebound.status).toBe(403);
    expect(await rebound.json()).toEqual({
      served: 'nothing',
      reason: 'browser-origin-refused',
    });

    const refused = await fetch(`${baseUrl}${POC_MACHINE_PATH}`);
    expect(refused.status).toBe(401);
    expect(await refused.json()).toEqual({ admitted: false, served: 'nothing' });

    const machineResponse = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(machineResponse.status).toBe(200);
    expect(machineResponse.headers.get('content-type')).toBe('application/json');
    const wireModel = (await machineResponse.json()) as PocModel;
    expect({ ...wireModel, links: undefined, responseIdentity: model.responseIdentity }).toEqual({ ...JSON.parse(JSON.stringify(model)), links: undefined });
    expect(wireModel.links).toHaveLength(15);
    expect(visibleParityTuples(html)).toEqual(parityTuples(wireModel));
  });

  it('recomputes the authenticated served-body contentKey with an independent walker and canonicalizer', async () => {
    const model = modelFixture();
    const { daemon, token } = await startPoc(model);
    const response = await fetch(`http://${daemon.host}:${daemon.port}${POC_MACHINE_PATH}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    const served = JSON.parse(await response.text()) as Record<string, unknown>;
    const declared = (served.responseIdentity as { readonly excludes: readonly string[] }).excludes;
    expect(declared).toHaveLength(25);
    const servedKey = (served.responseIdentity as { readonly contentKey: string }).contentKey;
    expect(independentResponseKey(served)).toBe(servedKey);
    expect(servedKey).not.toBe(model.responseIdentity.contentKey);
  });

  it('keeps GET read-only and byte-identical under five sequential and concurrent requests', async () => {
    const model = modelFixture();
    const { daemon, token, stateDir } = await startPoc(model);
    const marker = join(stateDir, 'read-only-marker.txt');
    writeFileSync(marker, 'GET must not mutate state\n', 'utf8');
    const before = stateDirectorySnapshot(stateDir);
    const url = `http://${daemon.host}:${daemon.port}${POC_MACHINE_PATH}`;
    const fetchMachine = async () => (await fetch(url, { headers: { authorization: `Bearer ${token}` } })).text();
    const sequential: string[] = [];
    for (let index = 0; index < 5; index += 1) sequential.push(await fetchMachine());
    expect(stateDirectorySnapshot(stateDir)).toEqual(before);
    const concurrent = await Promise.all([fetchMachine(), fetchMachine(), fetchMachine(), fetchMachine(), fetchMachine()]);
    expect(new Set([...sequential, ...concurrent]).size).toBe(1);
    expect(JSON.parse(sequential[0] as string).links).toHaveLength(15);
    const etag = `W/"${(JSON.parse(sequential[0] as string) as PocModel).responseIdentity.contentKey}"`;
    const revalidated = await fetch(url, { headers: { authorization: `Bearer ${token}`, 'if-none-match': etag } });
    expect(revalidated.status).toBe(304);
    expect(await revalidated.text()).toBe('');
    expect(stateDirectorySnapshot(stateDir)).toEqual(before);
  });

  it('recomputes response identity when dispatch or mayNot content changes', () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    if (model.dispatch === null) throw new Error('fixture should carry the packet');
    const dispatched = JSON.parse(JSON.stringify(model)) as any;
    dispatched.dispatch = {
      dispatchState: 'dispatched',
      packet: model.dispatch.packet,
      beadId: 'bu-response-identity',
      createdAt: '2026-09-23T00:00:00Z',
    };
    dispatched.responseIdentity = { ...model.responseIdentity, contentKey: '' };
    expect(buildResponseIdentity(dispatched).contentKey).not.toBe(model.responseIdentity.contentKey);

    const constrained = JSON.parse(JSON.stringify(model)) as any;
    if (constrained.projectShape.kind === 'not-evaluated') throw new Error('fixture should carry authority');
    constrained.projectShape.authority.mayNot = constrained.projectShape.authority.mayNot.map((row: any, index: number) => index === 0 ? { ...row, statement: `${row.statement} extra constraint` } : row);
    constrained.responseIdentity = { ...model.responseIdentity, contentKey: '' };
    expect(buildResponseIdentity(constrained).contentKey).not.toBe(model.responseIdentity.contentKey);
  });

  it('projects the same mayNot tuples in human Polaris and authenticated machine JSON', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const { daemon, token } = await startPoc(model);
    const html = await (await fetch(`http://${daemon.host}:${daemon.port}/polaris`)).text();
    const machine = JSON.parse(await (await fetch(`http://${daemon.host}:${daemon.port}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } })).text()) as PocModel;
    if (machine.projectShape.kind === 'not-evaluated') throw new Error('fixture should carry authority');
    const human = [...html.matchAll(/<li[^>]*data-authority-may-not-id="([^"]+)"[^>]*>([\s\S]*?)<\/li>/g)].map((match) => {
      const row = match[2] ?? '';
      const statement = /data-parity-field="authority-may-not-statement">([^<]*)</.exec(row)?.[1] ?? '';
      const act = /data-parity-field="authority-may-not-act">([^<]*)</.exec(row)?.[1];
      const digest = /data-parity-field="authority-may-not-digest">([^<]*)</.exec(row)?.[1];
      return [match[1], decodeHtmlText(statement), act === undefined ? undefined : decodeHtmlText(act), digest === undefined ? undefined : decodeHtmlText(digest)];
    });
    expect(human).toEqual(machine.projectShape.authority.mayNot.map((row) => [row.id, row.statement, row.actIdentity, row.artifactDigest]));
  });

  it('escapes observed text before rendering it into HTML', () => {
    const model = modelFixture();
    const injected: PocModel = {
      ...model,
      dispatch: model.dispatch,
      entities: model.entities.map((entity, index) =>
        index === 0
          ? { ...entity, title: '<script>alert("title")</script>', detail: '<img src=x>' }
          : entity,
      ),
    };

    const html = renderPocPage(injected);
    expect(html).not.toContain('<script>alert("title")</script>');
    expect(html).not.toContain('<img src=x>');
    expect(html).toContain('&lt;script&gt;alert(&quot;title&quot;)&lt;/script&gt;');
    expect(html).toContain('&lt;img src=x&gt;');
  });

  it('keeps empty-seed human and machine responses in parity', async () => {
    const seeded = modelFixture();
    const empty: PocModel = {
      ...seeded,
      dispatch: null,
      project: { ...seeded.project, name: 'Unknown project' },
      capabilityId: 'capability:unknown',
      entities: [],
      relationships: [],
      surfaces: [],
      trajectory: { kind: 'unknown', reason: 'No seed-backed work-item graph was supplied to this evaluation.' },
      orrery: { kind: 'unknown', reason: 'No seed-backed capability-to-path mappings were supplied to this evaluation.' },
    };
    const { daemon, token } = await startPoc(empty);
    const baseUrl = `http://${daemon.host}:${daemon.port}`;
    const html = await (await fetch(`${baseUrl}/`)).text();
    const machineResponse = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } });
    expect(machineResponse.status).toBe(200);
    const wireModel = (await machineResponse.json()) as PocModel;
    expect({ ...wireModel, links: undefined, responseIdentity: empty.responseIdentity }).toEqual({ ...JSON.parse(JSON.stringify(empty)), links: undefined });
    expect(visibleParityTuples(html)).toEqual(parityTuples(wireModel));
  });
});
