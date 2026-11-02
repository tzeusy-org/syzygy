import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  deterministicLayer,
  renderHuman,
  serveMachine,
  type MachineAnswer,
} from '@syzygy/cap1-core';
import { canonicalTupleMultiset, compareRenderings, disclosureOf } from '@syzygy/cap1-core/testing';

import { writeConsent } from '../test-support/consent-acts.js';
import { evaluateProject, type ProjectEvaluation } from './pipeline.js';
import { DAEMON_CAPTURE_VERSIONS } from './source-snapshot.js';
import { machineRoutes, MACHINE_PROJECT_PATH } from './routes-machine.js';
import { humanRoutes, HUMAN_PAGE_PATH } from './routes-human.js';
import { createDaemon, type RunningDaemon } from './server.js';

// RT4 — machine-endpoint tests over a REAL daemon, real sockets, and a
// REAL on-disk fixture repository (no mocks). The load-bearing oracles:
//
// - the parsed response's fact set is deep-equal to `serveMachine`
//   over the same model, with key verbatim strings HARD-CODED as
//   literals (oracle independence — nothing imported from vocabulary
//   modules stands as an expectation);
// - cross-channel parity is judged by core's independent oracle
//   (`compareRenderings`) between the SERVED machine answer (parsed
//   back off the wire) and `renderHuman` over the same model — never by
//   either channel's claim;
// - RT3's admission gate holds for this route: missing/wrong bearer
//   gets the literal named refusal and nothing else;
// - non-evaluated arms are served as named JSON, verbatim reasons kept;
// - two fetches of one evaluation are byte-identical (determinism —
//   stamps and identities survive re-serving unchanged).

// The capture's explicit as-of; the snapshot is the capture's own digest.
const CAPTURE = { asOf: '2026-08-22T14:00:00Z', versions: DAEMON_CAPTURE_VERSIONS } as const;

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

// The fixture mirrors pipeline.test.ts's composition: governance root
// (consented, observed), observed source (consented, observed), and an
// unconsented repository whose declared consent reference resolves to
// no record.
const DECLARATION_SOURCE = `
schema_version: "1"
project:
  id: prj-rt4-machine
  name: RT4 Machine Fixture
owner: test-owner@example.com
repositories:
  - id: repo-governance-root
    role: governance-root
    consent: consent-gov-root
  - id: repo-observed-source
    role: observed-source
    consent: consent-observed
  - id: repo-unconsented
    role: observed-source
    consent: consent-unconsented
consents:
  - consent-gov-root
  - consent-observed
  - consent-unconsented
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

function writeConsentRecord(decisionsDir: string, id: string, repository: string): void {
  writeConsent(decisionsDir, { id, project: 'prj-rt4-machine', repository });
}

function fixtureRepo(): { root: string; observedSourceDir: string } {
  const root = tempDir('rt4-mach-root-');
  const decisionsDir = join(root, '.syzygy', 'governance', 'decisions');
  mkdirSync(decisionsDir, { recursive: true });
  writeFileSync(join(root, '.syzygy', 'project.yaml'), DECLARATION_SOURCE, 'utf8');
  writeConsentRecord(decisionsDir, 'consent-gov-root', 'repo-governance-root');
  writeConsentRecord(decisionsDir, 'consent-observed', 'repo-observed-source');
  // A legacy record with no owner act admits nothing; an unloadable
  // reference would instead refuse every pair (§5 rule 4).
  writeConsent(
    decisionsDir,
    { id: 'consent-unconsented', project: 'prj-rt4-machine', repository: 'repo-unconsented' },
    false,
  );

  const observedSourceDir = tempDir('rt4-mach-observed-');
  writeFileSync(join(observedSourceDir, 'README.md'), '# observed source\n', 'utf8');
  return { root, observedSourceDir };
}

async function evaluatedFixture(): Promise<
  Extract<ProjectEvaluation, { kind: 'project-evaluated' }>
> {
  const { root, observedSourceDir } = fixtureRepo();
  const result = await evaluateProject(root, {
    ...CAPTURE,
    repositoryRoots: {
      'repo-governance-root': root,
      'repo-observed-source': observedSourceDir,
    },
  });
  if (result.kind !== 'project-evaluated') {
    throw new Error(`fixture did not evaluate: ${result.kind}`);
  }
  return result;
}

interface StartedMachineDaemon {
  readonly daemon: RunningDaemon;
  readonly token: string;
  readonly url: string;
}

async function startMachineDaemon(
  getEvaluation: () => ProjectEvaluation | Promise<ProjectEvaluation>,
): Promise<StartedMachineDaemon> {
  const start = await createDaemon({
    stateDir: join(tempDir('rt4-mach-state-'), 'state'),
    routes: machineRoutes({ getEvaluation }),
    port: 0,
  });
  if (!start.started) {
    throw new Error(`daemon failed to start: ${start.failure.kind}: ${start.failure.detail}`);
  }
  running.push(start.daemon);
  const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
  return {
    daemon: start.daemon,
    token,
    url: `http://127.0.0.1:${start.daemon.port}${MACHINE_PROJECT_PATH}`,
  };
}

function authed(token: string): RequestInit {
  return { headers: { authorization: `Bearer ${token}` } };
}

// Parsed JSON off the wire, deliberately untyped: the hard-coded
// assertions below are the judge of its structure — a type here would
// re-state the implementation's claim instead.
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type WireJson = any;

async function jsonOf(response: Response): Promise<WireJson> {
  return response.json();
}

describe('RT4 — the authenticated JSON machine endpoint', () => {
  it('serves 200 JSON whose facts are deep-equal to serveMachine over the same model', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const response = await fetch(url, authed(token));
    expect(response.status).toBe(200);
    expect(response.headers.get('content-type')).toBe('application/json');

    const body = await jsonOf(response);
    expect(body.kind).toBe('project-evaluated');

    // Losslessness: the served current answer, parsed back off the
    // wire, is deep-equal to the core output it was built from —
    // byte-equal in core's own canonical deterministic layer.
    const expected = serveMachine(evaluation.model);
    expect(body.state.current).toEqual(expected);
    expect(deterministicLayer(body.state.current)).toBe(deterministicLayer(expected));

    // Key verbatim strings, HARD-CODED (oracle independence — nothing
    // here is imported from a vocabulary module).
    expect(body.state.current.channel).toBe('machine');
    expect(body.state.current.selection).toBe('project:prj-rt4-machine');
    expect(body.state.current.scenarioContext).toBe('daemon-runtime');
    expect(body.state.current.evaluation.asOf).toBe('2026-08-22T14:00:00Z');
    expect(body.state.current.evaluation.snapshot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(body.evaluationId).toBe(`${body.state.current.evaluation.snapshot}@2026-08-22T14:00:00Z`);

    const facts: { name: string; value: string; epistemic: { label: string } }[] =
      body.state.current.facts;
    expect(facts.map((f) => f.name)).toEqual([
      'Registered',
      'Shape present',
      'Human-understandable',
      'Observable',
      'Traceable',
      'Mission-ready',
      'Reconciled',
    ]);
    const byName = new Map(facts.map((f) => [f.name, f]));
    expect(byName.get('Registered')).toEqual({
      name: 'Registered',
      value: 'satisfied',
      epistemic: { label: 'Observed' },
    });
    expect(byName.get('Mission-ready')).toEqual({
      name: 'Mission-ready',
      value: 'not evaluated',
      epistemic: { label: 'Unknown', basis: 'deferred' },
    });
    // A machine-invisible Unknown is CAP1-REQ-041's falsifier: the
    // Unknown and its reason travel verbatim.
    expect(byName.get('Observable')).toEqual({
      name: 'Observable',
      value: 'Unknown',
      epistemic: {
        label: 'Unknown',
        reasons: { primary: 'unconsented-source-or-provider', secondary: [] },
      },
    });
  });

  it('REQ-060: stable identities are served exactly as core enumerates them', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const body = await jsonOf(await fetch(url, authed(token)));
    // Hard-coded literals: the declared opaque identifiers, never a
    // URL, path, or display name.
    expect(body.identities.registration).toEqual([
      { field: 'facts.projectId', value: 'prj-rt4-machine' },
    ]);
    expect(body.identities.coverage).toEqual([
      { field: 'projectId', value: 'prj-rt4-machine' },
      { field: 'repositories[0].repositoryId', value: 'repo-governance-root' },
      { field: 'repositories[1].repositoryId', value: 'repo-observed-source' },
      { field: 'repositories[2].repositoryId', value: 'repo-unconsented' },
    ]);
  });

  it('REQ-063: proposed-vs-current is core renderState — nothing proposed merges into current', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const body = await jsonOf(await fetch(url, authed(token)));
    // The pipeline evaluation carries no open proposal, so the proposed
    // plane is served empty — and `current` is the machine answer
    // untouched (deep-equal above); no status value rests on a
    // proposal.
    expect(body.state.proposed).toEqual([]);
  });

  it('REQ-064: distinctions are machine-readable attributes, and the sweep is honest about gaps', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const body = await jsonOf(await fetch(url, authed(token)));

    const perFact: { fact: string; distinctions: { name: string; value: string; recoverableBy: string }[] }[] =
      body.distinctions.perFact;
    expect(perFact.map((entry) => entry.fact)).toEqual([
      'Registered',
      'Shape present',
      'Human-understandable',
      'Observable',
      'Traceable',
      'Mission-ready',
      'Reconciled',
    ]);
    const registered = perFact.find((entry) => entry.fact === 'Registered');
    expect(registered?.distinctions).toEqual([
      { name: 'epistemic-label', value: 'Observed', recoverableBy: 'text-attribute' },
    ]);
    const observable = perFact.find((entry) => entry.fact === 'Observable');
    expect(observable?.distinctions).toEqual([
      { name: 'epistemic-label', value: 'Unknown', recoverableBy: 'text-attribute' },
      {
        name: 'unknown-reason',
        value: 'unconsented-source-or-provider',
        recoverableBy: 'text-attribute',
      },
    ]);

    // Consent state per declared repository, from the coverage result.
    expect(body.distinctions.perRepositoryConsent).toEqual([
      {
        repositoryId: 'repo-governance-root',
        distinctions: [
          { name: 'consent-state', value: 'observed', recoverableBy: 'text-attribute' },
        ],
      },
      {
        repositoryId: 'repo-observed-source',
        distinctions: [
          { name: 'consent-state', value: 'observed', recoverableBy: 'text-attribute' },
        ],
      },
      {
        repositoryId: 'repo-unconsented',
        distinctions: [
          { name: 'consent-state', value: 'unconsented', recoverableBy: 'text-attribute' },
        ],
      },
    ]);

    // Discoverability value per declared repository (syzygy-u2a.7).
    expect(body.distinctions.perRepositoryDiscoverability).toEqual([
      {
        repositoryId: 'repo-governance-root',
        distinctions: [{ name: 'discoverability-value', value: 'Unknown', recoverableBy: 'text-attribute' }],
      },
      {
        repositoryId: 'repo-observed-source',
        distinctions: [{ name: 'discoverability-value', value: 'not-applicable', recoverableBy: 'text-attribute' }],
      },
      {
        repositoryId: 'repo-unconsented',
        distinctions: [{ name: 'discoverability-value', value: 'not-applicable', recoverableBy: 'text-attribute' }],
      },
    ]);

    // The sweep NEVER claims coverage this response does not carry: the
    // unavailable authority plane, tier, freshness, and the not-produced
    // proposal plane are listed missing — hard-coded literals.
    expect(body.distinctions.sweep).toEqual({
      totalDistinctions: 9,
      coveredDistinctions: ['epistemic-label', 'unknown-reason', 'consent-state', 'discoverability-value'],
      missingDistinctions: [
        'rendering-tier',
        'freshness-state',
        'adopted-vs-unadopted',
        'proposed-vs-current',
        'effective-status-vs-stamp',
      ],
    });
  });

  it('cross-channel parity: the SERVED machine answer agrees with renderHuman, per the independent oracle', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const body = await jsonOf(await fetch(url, authed(token)));
    const servedAnswer = body.state.current as MachineAnswer;

    // Core's independent parity oracle over the two channels' OUTPUTS:
    // the machine answer as actually served over the wire, and the
    // human rendering of the same model. No channel's self-description
    // is consulted — there is none to consult.
    const comparison = compareRenderings(
      disclosureOf(servedAnswer),
      disclosureOf(renderHuman(evaluation.model)),
    );
    expect(comparison).toEqual({
      comparable: true,
      verdict: 'parity',
      comparedFacts: 7,
    });
  });

  it("RT3's gate holds for this route: no bearer → the literal named refusal, nothing served", async () => {
    const evaluation = await evaluatedFixture();
    const { url } = await startMachineDaemon(() => evaluation);

    const response = await fetch(url);
    expect(response.status).toBe(401);
    // The named refusal body, byte-for-byte (hard-coded literal).
    expect(await response.text()).toBe('{"admitted":false,"served":"nothing"}');
  });

  it("RT3's gate holds for this route: wrong bearer → the literal named refusal", async () => {
    const evaluation = await evaluatedFixture();
    const { url } = await startMachineDaemon(() => evaluation);

    const response = await fetch(url, authed('f'.repeat(64)));
    expect(response.status).toBe(401);
    expect(await response.text()).toBe('{"admitted":false,"served":"nothing"}');
  });

  it('a missing declaration is served as the named JSON arm with its verbatim reason — never a 500, never empty', async () => {
    const emptyRoot = tempDir('rt4-mach-empty-');
    const evaluation = await evaluateProject(emptyRoot, CAPTURE);
    const { token, url } = await startMachineDaemon(() => evaluation);

    const response = await fetch(url, authed(token));
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body).toEqual({
      kind: 'no-declaration-observed',
      declarationObservation: {
        kind: 'declaration-missing',
        relativePath: '.syzygy/project.yaml',
        label: 'Unknown',
        reason: 'missing-declaration',
      },
    });
  });

  it('an invalid declaration is served as the named JSON arm carrying every failure verbatim', async () => {
    const root = tempDir('rt4-mach-invalid-');
    mkdirSync(join(root, '.syzygy'), { recursive: true });
    writeFileSync(join(root, '.syzygy', 'project.yaml'), 'schema_version: "1"\n', 'utf8');
    const evaluation = await evaluateProject(root, CAPTURE);
    const { token, url } = await startMachineDaemon(() => evaluation);

    const response = await fetch(url, authed(token));
    expect(response.status).toBe(200);
    const body = await jsonOf(response);
    expect(body.kind).toBe('declaration-invalid');
    expect(Array.isArray(body.failures)).toBe(true);
    expect(body.failures.length).toBeGreaterThan(0);
    // Every failure travels as a named arm with its detail.
    for (const failure of body.failures) {
      expect(typeof failure.kind).toBe('string');
      expect(failure.kind.length).toBeGreaterThan(0);
    }
  });

  it('determinism: a second fetch serves byte-identical stamps, identities, and facts', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);

    const first = await (await fetch(url, authed(token))).text();
    const second = await (await fetch(url, authed(token))).text();
    expect(second).toBe(first);
  });
});

// R-S2 non-blocking finding #4 — a consented-but-capture-failed
// repository and a withdrawn pair each cite a specific consent/
// withdrawal record now, and the human page (RT5) and the machine
// endpoint (RT4) must cite the SAME record for the SAME repository. Both
// route sets are mounted on one REAL daemon over one REAL evaluated
// fixture (real filesystem observation, real consent-record files); the
// two fetched outputs are compared directly — neither channel's claim
// is consulted, only what each actually served (CAP1-REQ-041 parity by
// construction, judged by an independent comparison).
describe('R-S2 finding #4 — human/machine citation parity for capture-failed and withdrawn repositories', () => {
  const CITATION_PROJECT_ID = 'prj-rt4-citation';
  const CITATION_DECLARATION_SOURCE = `
schema_version: "1"
project:
  id: ${CITATION_PROJECT_ID}
  name: RT4 Citation Fixture
owner: test-owner@example.com
repositories:
  - id: repo-governance-root
    role: governance-root
    consent: consent-gov-root
  - id: repo-capture-failed
    role: observed-source
    consent: consent-capture-failed
  - id: repo-withdrawn
    role: observed-source
    consent: consent-withdrawn
  - id: repo-unverified
    role: observed-source
    consent: consent-unverified
consents:
  - consent-gov-root
  - consent-capture-failed
  - consent-withdrawn
  - consent-unverified
declarations:
  spec_root: openspec/
relations: []
profiles: []
`;

  function writeCitationConsentRecord(
    decisionsDir: string,
    id: string,
    repository: string,
    grantState: 'in-force' | 'withdrawn',
  ): void {
    writeConsent(decisionsDir, { id, project: CITATION_PROJECT_ID, repository, grantState });
  }

  async function citationFixture(): Promise<
    Extract<ProjectEvaluation, { kind: 'project-evaluated' }>
  > {
    const root = tempDir('rt4-citation-root-');
    const decisionsDir = join(root, '.syzygy', 'governance', 'decisions');
    mkdirSync(decisionsDir, { recursive: true });
    writeFileSync(join(root, '.syzygy', 'project.yaml'), CITATION_DECLARATION_SOURCE, 'utf8');
    writeCitationConsentRecord(decisionsDir, 'consent-gov-root', 'repo-governance-root', 'in-force');
    writeCitationConsentRecord(
      decisionsDir,
      'consent-capture-failed',
      'repo-capture-failed',
      'in-force',
    );
    writeCitationConsentRecord(decisionsDir, 'consent-withdrawn', 'repo-withdrawn', 'withdrawn');
    // A state-(2) claim no provider correlates: refused correlation-unavailable,
    // its record kept visible as untrusted content (syzygy-u2a.6).
    writeConsent(
      decisionsDir,
      { id: 'consent-unverified', project: CITATION_PROJECT_ID, repository: 'repo-unverified' },
      {
        provenance: 'syzygy-verified',
        a1_audit_record: { id: 'a1-fixture', digest: `sha256:${'d'.repeat(64)}` },
      },
    );

    // repo-capture-failed is deliberately given NO on-disk root — it
    // never reaches an observation outcome, so core renders it
    // capture-failed (source-uncaptured-or-unreachable) even though it
    // IS consented; repo-withdrawn resolves unconsented on consent
    // grounds alone, before any observation is consulted.
    const result = await evaluateProject(root, {
      ...CAPTURE,
      repositoryRoots: { 'repo-governance-root': root },
    });
    if (result.kind !== 'project-evaluated') {
      throw new Error(`fixture did not evaluate: ${result.kind}`);
    }
    return result;
  }

  it('capture-failed and withdrawal citations agree between the human page and the machine endpoint', async () => {
    const evaluation = await citationFixture();

    const routes = [
      ...humanRoutes({ getEvaluation: () => evaluation }),
      ...machineRoutes({ getEvaluation: () => evaluation }),
    ];
    const start = await createDaemon({
      stateDir: join(tempDir('rt4-citation-state-'), 'state'),
      routes,
      port: 0,
    });
    if (!start.started) {
      throw new Error(`daemon failed to start: ${start.failure.kind}: ${start.failure.detail}`);
    }
    running.push(start.daemon);
    const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
    const base = `http://127.0.0.1:${start.daemon.port}`;

    const humanHtml = await (await fetch(`${base}${HUMAN_PAGE_PATH}`)).text();
    const machineBody = await jsonOf(
      await fetch(`${base}${MACHINE_PROJECT_PATH}`, authed(token)),
    );

    function machineCitation(repositoryId: string): string | undefined {
      const entry = machineBody.distinctions.perRepositoryConsent.find(
        (candidate: { repositoryId: string }) => candidate.repositoryId === repositoryId,
      );
      const structureEntry = entry?.distinctions.find(
        (d: { recoverableBy: string }) => d.recoverableBy === 'structure',
      );
      return structureEntry?.value;
    }

    // capture-failed: both channels cite the same in-force record.
    expect(humanHtml).toContain('data-repository-id="repo-capture-failed"');
    expect(humanHtml).toMatch(
      /repo-capture-failed:[^<]*consent record consent-capture-failed \(sha256:[0-9a-f]{64}\) via reference consent-capture-failed: scope observe, attribution test-owner, grant state in-force/,
    );
    expect(machineCitation('repo-capture-failed')).toBe(
      'record:consent-capture-failed scope:observe attribution:test-owner grantState:in-force',
    );

    // unconsented-by-withdrawal: both channels cite the WITHDRAWAL
    // record, never a favourable or absent citation.
    expect(humanHtml).toContain('data-withdrawn-record-id="consent-withdrawn"');
    expect(humanHtml).toMatch(
      /repo-withdrawn:[^<]*withdrawn by consent record consent-withdrawn \(sha256:[0-9a-f]{64}\) via reference consent-withdrawn: scope observe, attribution test-owner, grant state withdrawn/,
    );
    expect(machineCitation('repo-withdrawn')).toBe(
      'record:consent-withdrawn scope:observe attribution:test-owner grantState:withdrawn',
    );
  });

  // syzygy-u2a.6 — the independent coverage wire oracle. Each channel is
  // parsed on its own into complete tuples (every field of a row, by name),
  // then the two multisets are compared in both directions and against the
  // declared repository count, a literal of this fixture. Neither channel's
  // claim and no implementation structure is consulted.
  const COVERAGE_FIELDS: readonly (readonly [string, string])[] = [
    ['repositoryId', 'data-repository-id'],
    ['state', 'data-coverage-state'],
    ['label', 'data-epistemic-label'],
    ['reason', 'data-unknown-reason'],
    ['presentation', 'data-presentation'],
    ['resolutionRoute', 'data-policy-resolution-route'],
    ['basis', 'data-coverage-basis'],
    ['reference', 'data-consent-reference'],
    ['diagnostic', 'data-consent-diagnostic'],
    ['diagnosticReference', 'data-consent-diagnostic-reference'],
    ['route', 'data-resolution-route'],
    ['capturedScope', 'data-captured-scope'],
    ['declaredScope', 'data-declared-scope'],
    ['uncaptured.label', 'data-uncaptured-label'],
    ['uncaptured.reason', 'data-uncaptured-reason'],
    ['consent.reference', 'data-consent-record-reference'],
    ['consent.recordId', 'data-consent-record-id'],
    ['consent.artifactDigest', 'data-consent-record-digest'],
    ['consent.scope', 'data-consent-scope'],
    ['consent.attribution', 'data-consent-attribution'],
    ['consent.grantState', 'data-consent-grant-state'],
    ['consent.provenance', 'data-consent-provenance'],
    ['untrustedRecord.trust', 'data-untrusted-trust'],
    ['untrustedRecord.recordId', 'data-untrusted-record-id'],
    ['untrustedRecord.artifactDigest', 'data-untrusted-record-digest'],
    ['untrustedRecord.projectId', 'data-untrusted-project-id'],
    ['untrustedRecord.repositoryId', 'data-untrusted-repository-id'],
    ['untrustedRecord.scope', 'data-untrusted-scope'],
    ['untrustedRecord.attribution', 'data-untrusted-attribution'],
    ['untrustedRecord.grantState', 'data-untrusted-grant-state'],
  ];

  function leaves(value: unknown, prefix = ''): [string, string][] {
    if (value === null || value === undefined) return [];
    if (typeof value !== 'object') return [[prefix, String(value)]];
    return Object.entries(value as Record<string, unknown>).flatMap(([key, inner]) =>
      leaves(inner, prefix === '' ? key : `${prefix}.${key}`),
    );
  }

  function jsonTuples(body: WireJson): { tuples: string[]; escaped: string[] } {
    const known = new Set(COVERAGE_FIELDS.map(([path]) => path));
    const rows: unknown[] = body.coverageBoundary.records;
    const escaped = rows.flatMap((row) => leaves(row).map(([path]) => path)).filter((path) => !known.has(path));
    const tuples = rows.map((row) => {
      const flat = new Map(leaves(row));
      return JSON.stringify(COVERAGE_FIELDS.map(([path]) => flat.get(path) ?? null));
    });
    return { tuples, escaped };
  }

  function unescape(text: string): string {
    return text
      .replace(/&quot;/g, '"')
      .replace(/&#39;/g, "'")
      .replace(/&lt;/g, '<')
      .replace(/&gt;/g, '>')
      .replace(/&amp;/g, '&');
  }

  function htmlTuples(html: string): string[] {
    const section = html.match(/<section class="coverage" data-section="coverage-and-consent">[\s\S]*?<\/section>/)?.[0] ?? '';
    return [...section.matchAll(/<span class="coverage-record"([^>]*)>/g)].map((match) => {
      const attrs = new Map(
        [...(match[1] ?? '').matchAll(/ ([a-z-]+)="([^"]*)"/g)].map((a) => [a[1] as string, unescape(a[2] as string)]),
      );
      return JSON.stringify(COVERAGE_FIELDS.map(([, name]) => attrs.get(name) ?? null));
    });
  }

  // Disagreements in both directions, plus the denominator check.
  function coverageWireDisagreements(body: WireJson, html: string, declared: number): string[] {
    const { tuples: machine, escaped } = jsonTuples(body);
    const human = htmlTuples(html);
    const m = canonicalTupleMultiset(machine, (t) => t);
    const h = canonicalTupleMultiset(human, (t) => t);
    const problems: string[] = escaped.map((path) => `machine field outside the tuple: ${path}`);
    for (const key of new Set([...m.keys(), ...h.keys()])) {
      if ((m.get(key) ?? 0) !== (h.get(key) ?? 0)) {
        problems.push(`count ${m.get(key) ?? 0} machine vs ${h.get(key) ?? 0} human: ${key}`);
      }
    }
    if (machine.length !== declared) problems.push(`machine rows ${machine.length} != declared ${declared}`);
    if (human.length !== declared) problems.push(`human rows ${human.length} != declared ${declared}`);
    return problems;
  }

  it('coverage rows agree as complete tuple multisets over the declared denominator, and every row mutation is caught', async () => {
    const evaluation = await citationFixture();
    const routes = [
      ...humanRoutes({ getEvaluation: () => evaluation }),
      ...machineRoutes({ getEvaluation: () => evaluation }),
    ];
    const start = await createDaemon({
      stateDir: join(tempDir('rt4-wire-state-'), 'state'),
      routes,
      port: 0,
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
    const base = `http://127.0.0.1:${start.daemon.port}`;
    const html = await (await fetch(`${base}${HUMAN_PAGE_PATH}`)).text();
    const machineText = await (await fetch(`${base}${MACHINE_PROJECT_PATH}`, authed(token))).text();
    const machine = (): WireJson => JSON.parse(machineText);

    expect(coverageWireDisagreements(machine(), html, 4)).toEqual([]);
    // Every declared state the fixture carries reaches the wire.
    expect(
      (machine().coverageBoundary.records as { repositoryId: string; state: string; basis?: string; diagnostic?: string }[]).map(
        (row) => [row.repositoryId, row.state, row.basis ?? row.diagnostic ?? null, row.diagnostic ?? null],
      ),
    ).toEqual([
      ['repo-governance-root', 'observed', null, null],
      ['repo-capture-failed', 'capture-failed', null, null],
      ['repo-withdrawn', 'unconsented', 'withdrawn', null],
      ['repo-unverified', 'unconsented', 'no-resolvable-in-force-record', 'correlation-unavailable'],
    ]);

    // Human mutants edit the coverage section only: the drawers above it
    // repeat the same rows, and a page-wide first match would land there.
    const section = html.match(/<section class="coverage" data-section="coverage-and-consent">[\s\S]*?<\/section>/)?.[0];
    const rows = section?.match(/<span class="coverage-record" data-repository-id="repo-withdrawn"[^>]*>[^<]*<\/span> /)?.[0];
    const firstHtmlRow = section?.match(/<span class="coverage-record"[^>]*>[^<]*<\/span> /)?.[0];
    if (section === undefined || rows === undefined || firstHtmlRow === undefined) {
      throw new Error('fixture rows not found');
    }
    const inSection = (edit: (text: string) => string): string => html.replace(section, edit(section));
    const mutants: Record<string, [WireJson, string]> = {
      'machine omits a row': (() => {
        const body = machine();
        body.coverageBoundary.records.pop();
        return [body, html];
      })(),
      'machine duplicates a row': (() => {
        const body = machine();
        body.coverageBoundary.records.push(body.coverageBoundary.records[0]);
        return [body, html];
      })(),
      'machine alters a citation digest': (() => {
        const body = machine();
        body.coverageBoundary.records[1].consent.artifactDigest = `sha256:${'e'.repeat(64)}`;
        return [body, html];
      })(),
      'machine drops the untrusted record': (() => {
        const body = machine();
        body.coverageBoundary.records[3].untrustedRecord = null;
        return [body, html];
      })(),
      'machine adds an unparitied field': (() => {
        const body = machine();
        body.coverageBoundary.records[0].note = 'extra';
        return [body, html];
      })(),
      'human omits a row': [machine(), inSection((t) => t.replace(rows, ''))],
      'human duplicates a row': [machine(), inSection((t) => t.replace(firstHtmlRow, firstHtmlRow + firstHtmlRow))],
      'human swaps the diagnostic': [
        machine(),
        inSection((t) =>
          t.replace('data-consent-diagnostic="correlation-unavailable"', 'data-consent-diagnostic="correlation-not-found"'),
        ),
      ],
      'human drops the withdrawal attribution': [
        machine(),
        inSection((t) => t.replace(rows, rows.replace(/ data-consent-attribution="[^"]*"/, ''))),
      ],
    };
    const survivors = Object.entries(mutants).flatMap(([name, [body, page]]) =>
      coverageWireDisagreements(body, page, 4).length === 0 ? [name] : [],
    );
    expect(survivors).toEqual([]);
  });
});

// syzygy-u2a.7 — the required planes on the machine channel, and the
// consent-refused entry's own state on both channels (syzygy-s6cp).
describe('required evaluated planes on the machine channel', () => {
  it('serves discoverability rows with their explanation, and the named authority, proposal and entry states', async () => {
    const evaluation = await evaluatedFixture();
    const { token, url } = await startMachineDaemon(() => evaluation);
    const body = await jsonOf(await fetch(url, authed(token)));

    expect(body.discoverability.state).toBe('available');
    expect(body.discoverability.rows.map((row: WireJson) => [row.repositoryId, row.value, row.basis.kind, row.proposal])).toEqual([
      ['repo-governance-root', 'Unknown', 'readme-uncaptured', 'not-produced'],
      ['repo-observed-source', 'not-applicable', 'no-governance-root', 'not-produced'],
      ['repo-unconsented', 'not-applicable', 'no-governance-root', 'not-produced'],
    ]);
    const first = body.discoverability.rows[0];
    expect(first.evaluationId).toBe(body.evaluationId);
    expect(first.explanation.selection).toBe('project:prj-rt4-machine/discoverability:repo-governance-root');
    expect(first.explanation.unknownReasons).toEqual({ primary: 'source-uncaptured-or-unreachable', secondary: [] });
    expect(body.authorityExposures).toEqual({ state: 'unavailable', reason: 'authority-input-not-designed' });
    expect(body.proposals).toEqual({ state: 'not-produced', reason: 'proposal-input-not-designed' });
    expect(body.state.proposed).toEqual([]);
    expect(body.entry).toEqual({ state: 'missing', failureCode: 'missing' });
  });

  it('a consent-refused governance root serves the not-read entry on both channels, never unreadable', async () => {
    const { root, observedSourceDir } = fixtureRepo();
    rmSync(join(root, '.syzygy', 'governance', 'decisions', 'consent-gov-root.act.yaml'));
    const evaluation = await evaluateProject(root, {
      ...CAPTURE,
      repositoryRoots: { 'repo-governance-root': root, 'repo-observed-source': observedSourceDir },
    });
    const { token, url } = await startMachineDaemon(() => evaluation);
    const body = await jsonOf(await fetch(url, authed(token)));
    expect(body.entry).toEqual({
      state: 'not-read',
      reason: 'unconsented-governance-root',
      label: 'Unknown',
      unknownReason: 'unconsented-source-or-provider',
    });
    const entryRoute = humanRoutes({ getEvaluation: () => evaluation }).find((route) => route.path === '/entry');
    const html = (await entryRoute?.handle({} as never))?.body ?? '';
    expect(html).toContain('<section data-section="entry-content" data-entry-state="not-read">');
    expect(html).toContain('data-unknown-reason="unconsented-source-or-provider" data-not-read-reason="unconsented-governance-root"');
    expect(html).not.toContain('data-entry-state="unreadable"');
  });
});
