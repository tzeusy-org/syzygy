import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  computeDiscoverabilityWithProposal,
  computeDiscoverability,
  deriveEffectiveStatus,
  proposeEntryLink,
  renderHuman,
  serveMachine,
  HUMAN_ENTRY_PATH,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { fullDisclosure } from '@syzygy/cap1-core/testing';

import { writeConsent } from '../test-support/consent-acts.js';
import { evaluateProject, type ProjectEvaluation } from './pipeline.js';
import { DAEMON_CAPTURE_VERSIONS } from './source-snapshot.js';
import { createDaemon, type Route, type RunningDaemon } from './server.js';
import {
  humanRoutes,
  HUMAN_ENTRY_ROUTE_PATH,
  HUMAN_PAGE_PATH,
  type HumanRouteDependencies,
} from './routes-human.js';

// RT5 — human-page tests over a REAL daemon (real sockets, port 0,
// 127.0.0.1), a REAL temp state dir, and a getEvaluation built by the
// REAL pipeline over a REAL on-disk fixture repository. No mocks.
//
// Oracle independence: every expected literal below is HARD-CODED —
// 'Why this answer?', 'Further facts', 'Observed'/'Unknown',
// 'missing-declaration', 'unconsented-source-or-provider',
// '.syzygy/intent/OVERVIEW.md' — never imported from vocabulary
// modules. (Core functions are used to BUILD inputs and to enumerate
// the sweep denominator, never to phrase an expectation.)

// The capture's explicit as-of; the snapshot is the capture's own digest.
const CAPTURE = { asOf: '2026-08-22T12:00:00Z', versions: DAEMON_CAPTURE_VERSIONS } as const;

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

// --- The fixture repository (mirrors pipeline.test.ts) -----------------

const DECLARATION_SOURCE = `
schema_version: "1"
project:
  id: prj-rt5-human
  name: RT5 Human Page Fixture
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

const ENTRY_TEXT =
  '# RT5 fixture overview\n\nAn XSS probe from an observed file: <script>alert("xss")</script>\n';

function writeConsentRecord(decisionsDir: string, id: string, repository: string): void {
  writeConsent(decisionsDir, { id, project: 'prj-rt5-human', repository });
}

function fixtureRepo(options?: { readonly withEntry?: boolean }): {
  root: string;
  observedSourceDir: string;
} {
  const root = tempDir('rt5-human-root-');
  const decisionsDir = join(root, '.syzygy', 'governance', 'decisions');
  mkdirSync(decisionsDir, { recursive: true });
  writeFileSync(join(root, '.syzygy', 'project.yaml'), DECLARATION_SOURCE, 'utf8');
  writeConsentRecord(decisionsDir, 'consent-gov-root', 'repo-governance-root');
  writeConsentRecord(decisionsDir, 'consent-observed', 'repo-observed-source');
  // A legacy record with no owner act admits nothing; an unloadable
  // reference would instead refuse every pair (§5 rule 4).
  writeConsent(
    decisionsDir,
    { id: 'consent-unconsented', project: 'prj-rt5-human', repository: 'repo-unconsented' },
    false,
  );
  if (options?.withEntry !== false) {
    mkdirSync(join(root, '.syzygy', 'intent'), { recursive: true });
    writeFileSync(join(root, '.syzygy', 'intent', 'OVERVIEW.md'), ENTRY_TEXT, 'utf8');
  }
  const observedSourceDir = tempDir('rt5-human-observed-');
  writeFileSync(join(observedSourceDir, 'README.md'), '# observed source\n', 'utf8');
  return { root, observedSourceDir };
}

async function startDaemon(routes: readonly Route[]): Promise<RunningDaemon> {
  const start = await createDaemon({ stateDir: tempDir('rt5-human-state-'), routes, port: 0 });
  if (!start.started) {
    throw new Error(`daemon failed to start: ${start.failure.kind}: ${start.failure.detail}`);
  }
  running.push(start.daemon);
  return start.daemon;
}

async function fetchText(daemon: RunningDaemon, path: string): Promise<{
  status: number;
  contentType: string | null;
  body: string;
}> {
  const response = await fetch(`http://${daemon.host}:${daemon.port}${path}`);
  return {
    status: response.status,
    contentType: response.headers.get('content-type'),
    body: await response.text(),
  };
}

async function evaluatedFixture(): Promise<{
  root: string;
  evaluation: ProjectEvaluation;
  deps: HumanRouteDependencies;
}> {
  const { root, observedSourceDir } = fixtureRepo();
  const evaluation = await evaluateProject(root, {
    ...CAPTURE,
    repositoryRoots: {
      'repo-governance-root': root,
      'repo-observed-source': observedSourceDir,
    },
  });
  const deps: HumanRouteDependencies = {
    getEvaluation: () => evaluation,
    entryAuthorities: [{ identifier: 'VIS-2', kind: 'doctrine' }],
  };
  return { root, evaluation, deps };
}

// Independent HTML-entity decoder for read-back comparisons (never the
// module's own escaper).
function decodeEntities(text: string): string {
  return text
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'")
    .replace(/&amp;/g, '&');
}

describe('RT5 — GET / project page over a real daemon', () => {
  it('serves HTML on the human-open root with no credential', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const response = await fetchText(daemon, HUMAN_PAGE_PATH);

    expect(response.status).toBe(200);
    expect(response.contentType).toBe('text/html; charset=utf-8');
    expect(response.body).toContain('data-evaluation-kind="project-evaluated"');
  });

  it('renders EVERY fact of the core full disclosure — sweep with a denominator', async () => {
    const { evaluation, deps } = await evaluatedFixture();
    if (evaluation.kind !== 'project-evaluated') throw new Error('fixture must evaluate');
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    // The denominator: the core human view's own full disclosure over
    // the SAME model the page serves from. Seven facts — asserted, so
    // an empty sweep can never pass vacuously.
    const disclosure = fullDisclosure(renderHuman(evaluation.model));
    expect(disclosure).toHaveLength(7);

    // The full-disclosure section is core's verbatim heading.
    expect(html).toContain('data-section-heading="Further facts"');
    expect(html).toContain('<h2>Further facts</h2>');

    for (const fact of disclosure) {
      const unit = html.match(
        new RegExp(`<li data-fact-name="${fact.name.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')}"[^>]*>(.*?)</li>`),
      );
      expect(unit, `fact unit for ${fact.name} must be rendered`).not.toBeNull();
      const [whole, inner] = unit as RegExpMatchArray;
      expect(whole).toContain(`data-epistemic-label="${fact.epistemic.label}"`);
      expect(decodeEntities(inner as string)).toContain(fact.value);
      expect(decodeEntities(inner as string)).toContain(`[${fact.epistemic.label}]`);
    }
  });

  it('renders the seven shape answers with hard-coded names, values, and verbatim reasons', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    for (const name of [
      'Registered',
      'Shape present',
      'Human-understandable',
      'Observable',
      'Traceable',
      'Mission-ready',
      'Reconciled',
    ]) {
      expect(html).toContain(`data-answer-name="${name}"`);
    }

    // Registered: satisfied, Observed — hard-coded literals.
    expect(html).toContain('data-answer-name="Registered" data-answer-value="satisfied" data-epistemic-label="Observed"');
    // Observable: Unknown with its verbatim reason from the closed twelve.
    expect(html).toContain('data-answer-name="Observable" data-answer-value="Unknown" data-epistemic-label="Unknown"');
    expect(html).toContain('data-unknown-reason-primary="unconsented-source-or-provider"');
    expect(html).toContain('reason: unconsented-source-or-provider');
    // Mission-ready: the deferred posture, three verbatim coordinates.
    expect(html).toContain('data-answer-name="Mission-ready" data-answer-value="not evaluated" data-epistemic-label="Unknown"');
    expect(html).toContain('data-unknown-basis="deferred"');
  });

  it("serves one verbatim 'Why this answer?' drawer per answer, with citations", async () => {
    const { deps, evaluation } = await evaluatedFixture();
    if (evaluation.kind !== 'project-evaluated') throw new Error('fixture must evaluate');
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    // The literal public-facing name, hard-coded, once per answer.
    const summaries = html.match(/<summary>Why this answer\?<\/summary>/g) ?? [];
    expect(summaries).toHaveLength(7);
    for (const name of ['Registered', 'Observable', 'Mission-ready']) {
      expect(html).toContain(`data-explains="${name}"`);
    }

    // Drawer citations: the evaluation identity, the coverage-and-consent
    // boundary, constituent facts, and a followed-references sweep with
    // its denominator disclosed.
    expect(html).toMatch(/data-evaluation-snapshot="sha256:[0-9a-f]{64}"/);
    expect(html).toContain(`data-evaluation-snapshot="${evaluation.model.evaluation.snapshot}"`);
    expect(html).toContain('data-evaluation-as-of="2026-08-22T12:00:00Z"');
    expect(html).toContain('Coverage and consent boundary');
    expect(html).toContain('data-constituent-fact="declaration"');
    expect(html).toContain('data-present-classes=');
    expect(html).toContain('data-reference-count=');
    expect(html).toContain('data-unresolved-count="0"');
  });

  it('page facts match the machine channel — parity oracle over served output', async () => {
    const { evaluation, deps } = await evaluatedFixture();
    if (evaluation.kind !== 'project-evaluated') throw new Error('fixture must evaluate');
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    // Extract the page's served fact units (name, value, label) from
    // the HTML itself — the page's own output, not its self-description.
    const units = [...html.matchAll(
      /<li data-fact-name="([^"]*)"[^>]*data-epistemic-label="([^"]*)"[^>]*>.*?<span class="fact-value">([^<]*)<\/span>/g,
    )].map((match) => ({
      name: decodeEntities(match[1] as string),
      label: decodeEntities(match[2] as string),
      value: decodeEntities(match[3] as string),
    }));
    // Disclosure section + aggregate members render the same seven units.
    const distinct = new Map(units.map((unit) => [unit.name, unit]));

    const machine = serveMachine(evaluation.model);
    expect(distinct.size).toBe(machine.facts.length);
    for (const fact of machine.facts) {
      const onPage = distinct.get(fact.name);
      expect(onPage, `machine fact ${fact.name} must be on the page`).toBeDefined();
      expect(onPage?.value).toBe(fact.value);
      expect(onPage?.label).toBe(fact.epistemic.label);
    }
  });

  it('degradation is honest: no client script, no green styling, unconsented is policy', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    // JS-free: no fact computation on the client — no script at all.
    expect(html).not.toContain('<script');
    // No colour-coded state: the page styles no state, so an Unknown can
    // never read as success by styling.
    expect(html.toLowerCase()).not.toContain('green');
    // The unconsented repository renders as a standing policy state with
    // its resolution route — never silently, never as success.
    expect(html).toContain('data-consent-state="unconsented"');
    expect(html).toContain('data-presentation="policy"');
    expect(html).toContain('record consent');
    // The aggregate disclosed its membership and full label composition.
    expect(html).toContain('data-membership-count="7"');
    expect(html).toContain('Observed 1');
    expect(html).toContain('Inferred 0');
    expect(html).toContain('Unknown 6');
  });

  it('a no-declaration fixture renders the named degraded state, never a fake page', async () => {
    const emptyRoot = tempDir('rt5-human-empty-');
    const evaluation = await evaluateProject(emptyRoot, CAPTURE);
    const daemon = await startDaemon(
      humanRoutes({ getEvaluation: () => evaluation }),
    );
    const { status, body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    expect(status).toBe(200);
    expect(html).toContain('data-evaluation-kind="no-declaration-observed"');
    expect(html).toContain('data-epistemic-label="Unknown"');
    expect(html).toContain('data-unknown-reason="missing-declaration"');
    expect(html).toContain('reason: missing-declaration');
    // No shape answer is fabricated for a project that never evaluated.
    expect(html).not.toContain('data-fact-name=');
    expect(html).not.toContain('Why this answer?');
  });

  it('an invalid declaration renders its named validation failures', async () => {
    const root = tempDir('rt5-human-invalid-');
    mkdirSync(join(root, '.syzygy'), { recursive: true });
    writeFileSync(join(root, '.syzygy', 'project.yaml'), 'schema_version: "1"\n', 'utf8');
    const evaluation = await evaluateProject(root, CAPTURE);
    const daemon = await startDaemon(
      humanRoutes({ getEvaluation: () => evaluation }),
    );
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    expect(html).toContain('data-evaluation-kind="declaration-invalid"');
    expect(html).toContain('data-failure-kind="missing-field"');
    expect(html).not.toContain('data-fact-name=');
  });

  it('renders supplied authority exposures with stamp and effective status readable apart', async () => {
    const { deps } = await evaluatedFixture();
    // Fixture: stamped `accepted`, NO owner-act record — core derives
    // effectively unadopted with the disagreement disclosed.
    const exposure = deriveEffectiveStatus(
      {
        artifactId: 'artifact-rt5',
        digest: 'digest-abc',
        selfDeclaredStamp: 'accepted',
        owningAuthority: { authority: 'SDR-36', governingRevision: 'rev-1' },
      },
      [],
    );
    const daemon = await startDaemon(
      humanRoutes({ ...deps, getAuthorityExposures: () => [exposure] }),
    );
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    expect(html).toContain('data-self-declared-stamp="accepted"');
    expect(html).toContain('data-effective-status="unadopted"');
    expect(html).toContain('data-governs="effective-status"');
    expect(html).toContain('data-disagreement-disclosed="true"');
    expect(html).toContain('no-owner-act-record-at-this-digest');
  });

  it('renders supplied discoverability findings; a proposal never renders as applied', async () => {
    const { deps } = await evaluatedFixture();
    const finding = computeDiscoverability(
      'repo-governance-root' as RepositoryId,
      'governance-root',
      { state: 'captured', linksToEntry: false },
    );
    const withProposal = computeDiscoverabilityWithProposal(
      finding,
      proposeEntryLink('repo-governance-root' as RepositoryId, HUMAN_ENTRY_PATH),
    );
    const daemon = await startDaemon(
      humanRoutes({ ...deps, getDiscoverability: () => [withProposal] }),
    );
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    // The finding stays a truthful `no` — the closed four-value
    // vocabulary verbatim — while the proposal renders as proposed,
    // machine-readably distinct, with no status authority.
    expect(html).toContain('data-discoverability-value="no"');
    expect(html).toContain('data-proposed-vs-current="proposed"');
    expect(html).toContain('data-adopted-vs-unadopted="false"');
    expect(html).toContain('data-status-authority="none"');
    expect(html).toContain('proposed (unapplied)');
  });

  it('when no discoverability or authority provenance is supplied, absence is disclosed', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_PAGE_PATH);

    expect(html).toContain('No discoverability findings were supplied at this evaluation.');
    expect(html).toContain('No authority exposures were supplied at this evaluation.');
  });
});

describe('RT5 — GET /entry human entry document', () => {
  it('serves the fixture entry content with the fixed path and non-citable attributes', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const { status, contentType, body: html } = await fetchText(daemon, HUMAN_ENTRY_ROUTE_PATH);

    expect(status).toBe(200);
    expect(contentType).toBe('text/html; charset=utf-8');
    // The one fixed publication location, verbatim, never an identity.
    expect(html).toContain('data-entry-path=".syzygy/intent/OVERVIEW.md"');
    expect(html).toContain('data-entry-path-is-identity="false"');
    expect(html).toContain('.syzygy/intent/OVERVIEW.md');
    // Non-citability travels on the rendering (CAP1-REQ-021).
    expect(html).toContain('data-non-citable="true"');
    expect(html).toContain('data-artifact-class="presentation-artifact"');
    // The fixture content is served (escaped — see the XSS test).
    expect(html).toContain('data-entry-state="present"');
    expect(html).toContain('RT5 fixture overview');
    // The supplied authority citation routes the reader to authority.
    expect(html).toContain('data-authority-identifier="VIS-2"');
    expect(html).toContain('data-authority-kind="doctrine"');
  });

  it('an observed-file <script> value arrives escaped, and the page stays script-free', async () => {
    const { deps } = await evaluatedFixture();
    const daemon = await startDaemon(humanRoutes(deps));
    const { body: html } = await fetchText(daemon, HUMAN_ENTRY_ROUTE_PATH);

    expect(html).not.toContain('<script');
    expect(html).toContain('&lt;script&gt;alert(&quot;xss&quot;)&lt;/script&gt;');
  });

  it('an absent entry renders as a finding, never a fake page', async () => {
    const { root, observedSourceDir } = fixtureRepo({ withEntry: false });
    const evaluation = await evaluateProject(root, {
      ...CAPTURE,
      repositoryRoots: {
        'repo-governance-root': root,
        'repo-observed-source': observedSourceDir,
      },
    });
    const daemon = await startDaemon(
      humanRoutes({ getEvaluation: () => evaluation }),
    );
    const { status, body: html } = await fetchText(daemon, HUMAN_ENTRY_ROUTE_PATH);

    expect(status).toBe(200);
    expect(html).toContain('data-entry-state="absent"');
    expect(html).toContain('data-assessment-kind="finding"');
    expect(html).toContain('entry-absent');
    expect(html).not.toContain('data-entry-state="present"');
  });

  it('an unreadable entry renders Unknown with its reason', async () => {
    const { root, observedSourceDir } = fixtureRepo({ withEntry: false });
    // Make the entry path a DIRECTORY: the capture's read fails with a
    // non-ENOENT error — a real unreadable front door.
    mkdirSync(join(root, '.syzygy', 'intent', 'OVERVIEW.md'), { recursive: true });
    const evaluation = await evaluateProject(root, {
      ...CAPTURE,
      repositoryRoots: {
        'repo-governance-root': root,
        'repo-observed-source': observedSourceDir,
      },
    });
    const daemon = await startDaemon(
      humanRoutes({ getEvaluation: () => evaluation }),
    );
    const { body: html } = await fetchText(daemon, HUMAN_ENTRY_ROUTE_PATH);

    expect(html).toContain('data-entry-state="unreadable"');
    expect(html).toContain('data-assessment-kind="unknown-with-reason"');
    expect(html).toContain('data-epistemic-label="Unknown"');
    expect(html).toContain('Unknown — reason:');
  });
});
