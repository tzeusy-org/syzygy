import { mkdirSync, mkdtempSync, readdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, relative, sep } from 'node:path';
import { afterEach, describe, expect, it, vi } from 'vitest';


import { evaluateProject } from './pipeline.js';
import { DAEMON_CAPTURE_VERSIONS } from './source-snapshot.js';
import {
  createDaemon,
  minimalRootRoute,
  type Route,
  type RunningDaemon,
} from './server.js';

// RT3 — server tests over real sockets (port 0, 127.0.0.1) and real
// temp state dirs; no mocks. The load-bearing assertions:
//
// - admission runs BEFORE any machine-credentialed handler: a missing
//   or invalid credential gets the named refusal and the handler is
//   NEVER invoked (spy flag, not a mock);
// - refusal bodies are the core vocabulary verbatim — hard-coded
//   literal `{"admitted":false,"served":"nothing"}` (oracle
//   independence);
// - startup performs NO writes outside the state directory — judged by
//   a harness-external filesystem snapshot diff, never by the daemon's
//   own claims (the CAP1-REQ-023/053 oracle discipline applied to the
//   daemon's own boundary).

const cleanups: string[] = [];
const running: RunningDaemon[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

afterEach(async () => {
  for (const daemon of running.splice(0)) {
    await daemon.close().catch(() => undefined);
  }
  for (const dir of cleanups.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

async function startDaemon(
  stateDir: string,
  routes: readonly Route[],
): Promise<RunningDaemon> {
  const start = await createDaemon({ stateDir, routes, port: 0 });
  if (!start.started) {
    throw new Error(`daemon failed to start: ${start.failure.kind}: ${start.failure.detail}`);
  }
  running.push(start.daemon);
  return start.daemon;
}

interface HandlerSpy {
  invoked: number;
  route: Route;
}

function machineRoute(path: string): HandlerSpy {
  const spy: HandlerSpy = {
    invoked: 0,
    route: {
      method: 'GET',
      path,
      credentialClass: 'machine-credentialed',
      handle() {
        spy.invoked += 1;
        return { status: 200, contentType: 'application/json', body: '{"served":"machine-facts"}' };
      },
    },
  };
  return spy;
}

/** Recursive file listing relative to `base` — the harness's own
 * external record of what exists, independent of the daemon. */
function snapshotFiles(base: string): readonly string[] {
  return readdirSync(base, { recursive: true, withFileTypes: false })
    .map((entry) => String(entry))
    .sort();
}

describe('RT3 — credential-classed admission at the transport', () => {
  it('writes one content-blind JSONL diagnostic per non-2xx socket outcome and none for success', async () => {
    const machine = machineRoute('/machine');
    const routes: Route[] = [
      machine.route,
      { method: 'GET', path: '/origin', credentialClass: 'human-open', handle: () => ({ status: 403, contentType: 'application/json', body: '{"reason":"request-body-sentinel"}' }) },
      { method: 'GET', path: '/failure', credentialClass: 'human-open', handle: () => { throw new Error('handler-secret-sentinel'); } },
      { method: 'GET', path: '/success', credentialClass: 'human-open', handle: () => ({ status: 200, contentType: 'text/plain', body: 'ok' }) },
    ];
    const daemon = await startDaemon(join(tempDir('rt3-diagnostic-'), 'state'), routes);
    const lines: string[] = [];
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { lines.push(String(chunk)); return true; });
    try {
      const base = `http://127.0.0.1:${daemon.port}`;
      expect((await fetch(`${base}/unknown%3Cscript%3E?query-secret-sentinel`)).status).toBe(404);
      expect((await fetch(`${base}/machine`, { headers: { authorization: 'Bearer credential-secret-sentinel' } })).status).toBe(401);
      expect((await fetch(`${base}/origin`)).status).toBe(403);
      expect((await fetch(`${base}/failure`)).status).toBe(500);
      expect((await fetch(`${base}/success`)).status).toBe(200);
    } finally {
      stderr.mockRestore();
    }
    expect(lines).toHaveLength(4);
    const events = lines.map(line => JSON.parse(line) as Record<string, unknown>);
    expect(events.map(event => event.status)).toEqual([404, 401, 403, 500]);
    expect(events.map(event => event.reason)).toEqual(['unknown-route', 'credential-refused', 'route-non-success', 'handler-failure']);
    expect(events[0]).toMatchObject({ method: 'UNKNOWN', pathLength: '/unknown%3Cscript%3E'.length });
    expect(events.slice(1).map(event => event.route)).toEqual(['/machine', '/origin', '/failure']);
    expect(lines.every(line => line.endsWith('\n'))).toBe(true);
    const logged = lines.join('');
    for (const sentinel of ['script', 'query-secret-sentinel', 'credential-secret-sentinel', 'request-body-sentinel', 'handler-secret-sentinel']) {
      expect(logged).not.toContain(sentinel);
    }
  });

  // syzygy-bpyt.7.14: each Unknown population the host lists keeps its
  // breach line and reason; any other reason is free text and withholds
  // the whole diagnostic.
  it('logs a 503 breach diagnostic for each listed Unknown population and withholds an unlisted one', async () => {
    // syzygy-bpyt.7.16: the list is matched exactly, so a case variant of a
    // listed reason is unlisted too.
    const reasons = ['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed', 'project shape unlisted-sentinel', 'Project shape not-admitted'];
    const routes: Route[] = reasons.map((reason, index) => ({
      method: 'GET',
      path: `/breach-${index}`,
      credentialClass: 'human-open',
      handle: () => ({
        status: 503,
        contentType: 'application/json',
        body: '{"served":"nothing"}',
        diagnostic: {
          kind: 'response-limit-breached',
          evaluation: { inputsDigest: 'c'.repeat(64), asOf: '2026-10-27T00:00:00Z' },
          limit: 'maxHumanResponseBytes',
          declared: 5,
          observed: 6,
          population: { kind: 'unknown', reason },
          sequence: index + 1,
        },
      }),
    }));
    const daemon = await startDaemon(join(tempDir('rt3-breach-'), 'state'), routes);
    const lines: string[] = [];
    const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { lines.push(String(chunk)); return true; });
    try {
      for (const index of reasons.keys()) {
        expect((await fetch(`http://127.0.0.1:${daemon.port}/breach-${index}`)).status).toBe(503);
      }
    } finally {
      stderr.mockRestore();
    }
    const events = lines.map(line => JSON.parse(line) as Record<string, unknown>);
    expect(events.map(({ at: _at, ...event }) => event)).toEqual([
      ...['project shape not-evaluated', 'project shape not-admitted', 'project shape observation-failed'].map((reason, index) => ({
        kind: 'daemon-http-outcome', method: 'GET', route: `/breach-${index}`, status: 503, reason: 'response-limit-breached',
        contentType: 'application/json',
        evaluation: { inputsDigest: 'c'.repeat(64), asOf: '2026-10-27T00:00:00Z' },
        limit: 'maxHumanResponseBytes', declared: 5, observed: 6, population: { kind: 'unknown', reason }, sequence: index + 1,
      })),
      ...['/breach-3', '/breach-4'].map(route => ({
        kind: 'daemon-http-outcome', method: 'GET', route, status: 503, reason: 'route-non-success', contentType: 'application/json',
      })),
    ]);
    expect(lines.join('')).not.toContain('unlisted-sentinel');
    expect(lines.join('')).not.toContain('Project shape');
  });

  it.each([
    ['missing', undefined],
    ['scheme without separator', 'Bearer'],
    ['empty bearer token', 'Bearer '],
    ['wrong scheme', 'Basic x'],
    ['whitespace-only bearer token', 'Bearer    '],
    ['malformed scheme casing', `bearer ${'a'.repeat(64)}`],
    ['wrong-length bearer token', 'Bearer definitely-not-the-minted-token'],
    ['wrong bearer token', `Bearer ${'f'.repeat(64)}`],
  ])('refuses %s credentials before invoking the handler', async (_case, authorization) => {
    const spy = machineRoute('/machine');
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), [spy.route]);

    const response = await fetch(`http://127.0.0.1:${daemon.port}/machine`, {
      ...(authorization === undefined ? {} : { headers: { authorization } }),
    });
    expect(response.status).toBe(401);
    expect(response.headers.get('content-type')).toBe('application/json');
    // The named refusal bytes, verbatim core vocabulary — hard-coded literal.
    expect(await response.text()).toBe('{"admitted":false,"served":"nothing"}');
    expect(spy.invoked).toBe(0);
  });

  it('the correct bearer token (read from the credential file) admits and the handler runs', async () => {
    const spy = machineRoute('/machine');
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), [spy.route]);

    const token = readFileSync(daemon.credentialPath, 'utf8').trim();
    const response = await fetch(`http://127.0.0.1:${daemon.port}/machine`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ served: 'machine-facts' });
    expect(spy.invoked).toBe(1);
  });

  it('a human-open route serves without any credential', async () => {
    const route: Route = {
      method: 'GET',
      path: '/open',
      credentialClass: 'human-open',
      handle: () => ({ status: 200, contentType: 'text/plain', body: 'open' }),
    };
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), [route]);

    const response = await fetch(`http://127.0.0.1:${daemon.port}/open`);
    expect(response.status).toBe(200);
    expect(await response.text()).toBe('open');
  });

  it('an unknown route is an explicit named 404 body, never silence', async () => {
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), []);
    const response = await fetch(`http://127.0.0.1:${daemon.port}/nowhere`);
    expect(response.status).toBe(404);
    expect(await response.json()).toEqual({
      served: 'nothing',
      reason: 'unknown-route',
      method: 'GET',
      path: '/nowhere',
    });
  });

  it('binds 127.0.0.1 only', async () => {
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), []);
    expect(daemon.host).toBe('127.0.0.1');
    expect(daemon.port).toBeGreaterThan(0);
  });
});

describe('RT3 — credential stability across daemon restarts', () => {
  it('a restarted daemon reuses the same credential file and token', async () => {
    const stateDir = join(tempDir('rt3-srv-'), 'state');

    const first = await startDaemon(stateDir, []);
    expect(first.credentialProvision).toBe('minted');
    const token = readFileSync(first.credentialPath, 'utf8');
    await first.close();
    running.splice(running.indexOf(first), 1);

    const second = await startDaemon(stateDir, []);
    expect(second.credentialProvision).toBe('reused');
    expect(second.credentialPath).toBe(first.credentialPath);
    expect(readFileSync(second.credentialPath, 'utf8')).toBe(token);
  });
});

describe('RT3 — startup write boundary (harness-external snapshot diff)', () => {
  it('daemon startup writes nothing outside the state directory', async () => {
    // One base dir holds a real fixture repository AND the state dir's
    // parent, so the diff's denominator covers both planes.
    const base = tempDir('rt3-srv-writes-');
    const repoRoot = join(base, 'repo');
    mkdirSync(join(repoRoot, '.syzygy'), { recursive: true });
    writeFileSync(
      join(repoRoot, '.syzygy', 'project.yaml'),
      'schema_version: "1"\n',
      'utf8',
    );
    const stateDir = join(base, 'daemon-state');

    const before = snapshotFiles(base);
    const projectEvaluation = await evaluateProject(repoRoot, {
      asOf: '2026-08-22T11:00:00Z',
      versions: DAEMON_CAPTURE_VERSIONS,
    });
    const daemon = await startDaemon(stateDir, [minimalRootRoute(projectEvaluation)]);
    // Exercise the pipeline-backed root route before judging writes.
    const response = await fetch(`http://127.0.0.1:${daemon.port}/`);
    expect(response.status).toBe(200);
    const after = snapshotFiles(base);

    const beforeSet = new Set(before);
    const added = after.filter((path) => !beforeSet.has(path));
    // Every added path lies under the state dir; nothing was removed.
    const statePrefix = relative(base, stateDir);
    expect(added.length).toBeGreaterThan(0);
    for (const path of added) {
      expect(
        path === statePrefix || path.startsWith(statePrefix + sep),
        `unexpected write outside the state dir: ${path}`,
      ).toBe(true);
    }
    const afterSet = new Set(after);
    expect(before.filter((path) => !afterSet.has(path))).toEqual([]);
  });
});

describe('RT3 — the minimal root route', () => {
  it('serves a plain served-facts statement for an evaluated project', async () => {
    const root = tempDir('rt3-srv-root-');
    const decisionsDir = join(root, '.syzygy', 'governance', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(
      join(root, '.syzygy', 'project.yaml'),
      [
        'schema_version: "1"',
        'project:',
        '  id: prj-rt3-root',
        '  name: RT3 Root Fixture',
        'owner: test-owner@example.com',
        'repositories:',
        '  - id: repo-governance-root',
        '    role: governance-root',
        '    consent: consent-gov-root',
        'consents:',
        '  - consent-gov-root',
        'declarations:',
        '  spec_root: openspec/',
        'relations: []',
        'profiles: []',
        '',
      ].join('\n'),
      'utf8',
    );
    writeFileSync(
      join(decisionsDir, 'consent-gov-root.yaml'),
      [
        'id: consent-gov-root',
        'project: prj-rt3-root',
        'repository: repo-governance-root',
        'scope: full',
        'attribution: test-owner',
        'grant_state: in-force',
        '',
      ].join('\n'),
      'utf8',
    );

    const projectEvaluation = await evaluateProject(root, {
      asOf: '2026-08-22T12:00:00Z',
      versions: DAEMON_CAPTURE_VERSIONS,
    });
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), [
      minimalRootRoute(projectEvaluation),
    ]);

    const response = await fetch(`http://127.0.0.1:${daemon.port}/`);
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toContain('text/plain');
    const body = await response.text();
    expect(body).toContain('selection: project:prj-rt3-root');
    expect(body).toMatch(/evaluation: sha256:[0-9a-f]{64}@2026-08-22T12:00:00Z/);
    expect(body).toContain('- Registered: satisfied [Observed]');
    expect(body).toContain(
      '- Mission-ready: not evaluated [Unknown]',
    );
  });

  it('states a missing declaration honestly, with its verbatim reason', async () => {
    const emptyRoot = tempDir('rt3-srv-empty-');
    const projectEvaluation = await evaluateProject(emptyRoot, {
      asOf: '2026-08-22T12:30:00Z',
      versions: DAEMON_CAPTURE_VERSIONS,
    });
    const daemon = await startDaemon(join(tempDir('rt3-srv-'), 'state'), [
      minimalRootRoute(projectEvaluation),
    ]);

    const body = await (await fetch(`http://127.0.0.1:${daemon.port}/`)).text();
    expect(body).toContain('declaration: Unknown (reason: missing-declaration)');
  });
});

describe('RT3 — startup failure arms are named', () => {
  it('a second private daemon on the same port reports a bind failure with an available code', async () => {
    const first = await startDaemon(join(tempDir('rt3-bind-first-'), 'state'), []);
    const second = await createDaemon({ stateDir: join(tempDir('rt3-bind-second-'), 'state'), routes: [], port: first.port });
    expect(second.started).toBe(false);
    if (!second.started) {
      expect(second.failure.kind).toBe('bind-failed');
      expect(second.failure.detail).toContain('EADDRINUSE');
    }
  });

  it('two routes on one (method, path) refuse to start, named', async () => {
    const route: Route = {
      method: 'GET',
      path: '/dup',
      credentialClass: 'human-open',
      handle: () => ({ status: 200, contentType: 'text/plain', body: '' }),
    };
    const start = await createDaemon({
      stateDir: join(tempDir('rt3-srv-'), 'state'),
      routes: [route, { ...route }],
      port: 0,
    });
    expect(start.started).toBe(false);
    if (!start.started) {
      expect(start.failure.kind).toBe('duplicate-route');
    }
  });

  it('an unprovisionable credential refuses to start, named', async () => {
    const stateDir = tempDir('rt3-srv-');
    writeFileSync(join(stateDir, 'machine-credential.token'), '', 'utf8');
    const start = await createDaemon({ stateDir, routes: [], port: 0 });
    expect(start.started).toBe(false);
    if (!start.started) {
      expect(start.failure.kind).toBe('credential-unprovisionable');
    }
  });
});
