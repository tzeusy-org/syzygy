import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConsent } from '../test-support/consent-acts.js';
import { evaluateProject } from './pipeline.js';
import { humanRoutes } from './routes-human.js';
import { machineProjectBody } from './routes-machine.js';
import { DAEMON_CAPTURE_VERSIONS } from './source-snapshot.js';

// RT3 — pipeline tests over a REAL on-disk fixture repository (no
// mocks). The fixture mirrors the integration conformance test's
// composition: three declared repositories — governance root
// (consented, observed), observed source (consented, observed), and an
// unconsented repository whose consent record is a legacy record with no owner act.
//
// Oracle independence: every expected value below is a HARD-CODED
// string literal — facet names, answer values, Unknown reasons — never
// imported from the vocabulary modules.

// The capture's explicit as-of; the snapshot is never supplied — it is the
// digest of what the capture read.
const CAPTURE = { asOf: '2026-08-22T10:00:00Z', versions: DAEMON_CAPTURE_VERSIONS } as const;

const cleanups: string[] = [];

function tempDir(prefix: string): string {
  const dir = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(dir);
  return dir;
}

afterEach(() => {
  for (const dir of cleanups.splice(0)) {
    rmSync(dir, { recursive: true, force: true });
  }
});

const DECLARATION_SOURCE = `
schema_version: "1"
project:
  id: prj-rt3-pipeline
  name: RT3 Pipeline Fixture
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

function writeConsentRecord(
  decisionsDir: string,
  id: string,
  repository: string,
): void {
  writeConsent(decisionsDir, { id, project: 'prj-rt3-pipeline', repository });
}

// The standard fixture: a governed repository root holding the
// declaration and two in-force consent records; the third declared
// consent reference (consent-unconsented) is a legacy record with no owner act.
function fixtureRepo(): { root: string; observedSourceDir: string } {
  const root = tempDir('rt3-pipe-root-');
  const decisionsDir = join(root, '.syzygy', 'governance', 'decisions');
  mkdirSync(decisionsDir, { recursive: true });
  writeFileSync(join(root, '.syzygy', 'project.yaml'), DECLARATION_SOURCE, 'utf8');
  writeConsentRecord(decisionsDir, 'consent-gov-root', 'repo-governance-root');
  writeConsentRecord(decisionsDir, 'consent-observed', 'repo-observed-source');
  // A legacy record with no owner act: a visible recorded fact that admits
  // nothing (an unloadable reference would refuse every pair, §5 rule 4).
  writeConsent(
    decisionsDir,
    { id: 'consent-unconsented', project: 'prj-rt3-pipeline', repository: 'repo-unconsented' },
    false,
  );

  const observedSourceDir = tempDir('rt3-pipe-observed-');
  writeFileSync(join(observedSourceDir, 'README.md'), '# observed source\n', 'utf8');
  return { root, observedSourceDir };
}

function fixtureDeps(observedSourceDir: string, root: string) {
  return {
    ...CAPTURE,
    repositoryRoots: {
      'repo-governance-root': root,
      'repo-observed-source': observedSourceDir,
    },
  };
}

describe('RT3 — evaluateProject over a real fixture repository', () => {
  it('produces the FactModel the integration composition establishes', async () => {
    const { root, observedSourceDir } = fixtureRepo();
    const result = await evaluateProject(root, fixtureDeps(observedSourceDir, root));

    expect(result.kind).toBe('project-evaluated');
    if (result.kind !== 'project-evaluated') return;

    expect(result.projectId).toBe('prj-rt3-pipeline');
    expect(result.model.selection).toBe('project:prj-rt3-pipeline');
    // The snapshot is the capture's own digest — no caller label survives.
    expect(result.model.evaluation.asOf).toBe('2026-08-22T10:00:00Z');
    expect(result.model.evaluation.snapshot).toMatch(/^sha256:[0-9a-f]{64}$/);
    expect(result.model.evaluation.snapshot).toBe(result.capture.snapshot);
    expect(result.model.scenarioContext).toBe('daemon-runtime');
    expect(result.model.declaredFilters).toEqual({});

    // All seven answers, exact names in order — hard-coded literals.
    expect(result.model.facts.map((f) => f.name)).toEqual([
      'Registered',
      'Shape present',
      'Human-understandable',
      'Observable',
      'Traceable',
      'Mission-ready',
      'Reconciled',
    ]);

    // Values and epistemic states, hard-coded per the core polarity:
    // a registered project with registration+coverage inputs only.
    const byName = new Map(result.model.facts.map((f) => [f.name, f]));
    expect(byName.get('Registered')).toEqual({
      name: 'Registered',
      value: 'satisfied',
      epistemic: { label: 'Observed' },
    });
    expect(byName.get('Shape present')?.value).toBe('Unknown');
    expect(byName.get('Mission-ready')).toEqual({
      name: 'Mission-ready',
      value: 'not evaluated',
      epistemic: { label: 'Unknown', basis: 'deferred' },
    });

    // Every Unknown carries its reason verbatim from the closed twelve.
    const observable = byName.get('Observable');
    expect(observable?.value).toBe('Unknown');
    if (observable?.epistemic.label === 'Unknown' && 'reasons' in observable.epistemic) {
      expect(observable.epistemic.reasons.primary).toBe('unconsented-source-or-provider');
      expect(observable.epistemic.reasons.secondary).toEqual([]);
    } else {
      throw new Error('Observable must be Unknown with reasons');
    }
  });

  it('coverage joins real observation and real consent loading', async () => {
    const { root, observedSourceDir } = fixtureRepo();
    const result = await evaluateProject(root, fixtureDeps(observedSourceDir, root));
    if (result.kind !== 'project-evaluated') throw new Error('expected evaluation');

    const states = result.coverage.repositories.map((r) => [r.repositoryId, r.state]);
    expect(states).toEqual([
      ['repo-governance-root', 'observed'],
      ['repo-observed-source', 'observed'],
      ['repo-unconsented', 'unconsented'],
    ]);

    // The failed consent reference travels as a NAMED refusal — kept,
    // never thrown away — and admitted nothing.
    expect(
      result.consentDecisions.map((d) => [
        d.repositoryId,
        d.authorization,
        d.authorization === 'admitted' ? d.provenance : d.diagnostic,
      ]),
    ).toEqual([
      ['repo-governance-root', 'admitted', 'owner-adopted (bootstrap, uncorrelated)'],
      ['repo-observed-source', 'admitted', 'owner-adopted (bootstrap, uncorrelated)'],
      ['repo-unconsented', 'Unknown', 'owner-act-missing'],
    ]);
  });

  it('a declared repository with no known root renders capture-failed, never green', async () => {
    const { root } = fixtureRepo();
    // Only the governance root has a known on-disk location (default
    // mapping); the consented observed-source repository is uncaptured.
    const result = await evaluateProject(root, CAPTURE);
    if (result.kind !== 'project-evaluated') throw new Error('expected evaluation');

    const observedSource = result.coverage.repositories.find(
      (r) => r.repositoryId === 'repo-observed-source',
    );
    expect(observedSource?.state).toBe('capture-failed');
    if (observedSource?.state === 'capture-failed') {
      expect(observedSource.reason).toBe('source-uncaptured-or-unreachable');
    }
  });

  it('is deterministic given the same disk state and evaluation', async () => {
    const { root, observedSourceDir } = fixtureRepo();
    const deps = fixtureDeps(observedSourceDir, root);
    const first = await evaluateProject(root, deps);
    const second = await evaluateProject(root, deps);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('a missing declaration is the named no-declaration arm with its verbatim reason', async () => {
    const emptyRoot = tempDir('rt3-pipe-empty-');
    const result = await evaluateProject(emptyRoot, CAPTURE);

    expect(result.kind).toBe('no-declaration-observed');
    if (result.kind !== 'no-declaration-observed') return;
    expect(result.declarationObservation.kind).toBe('declaration-missing');
    expect(result.declarationObservation.label).toBe('Unknown');
    expect(result.declarationObservation.reason).toBe('missing-declaration');
  });

  it('an unreachable root is the named no-declaration arm, distinct from missing', async () => {
    const result = await evaluateProject(
      join(tempDir('rt3-pipe-gone-'), 'does-not-exist'),
      CAPTURE,
    );
    expect(result.kind).toBe('no-declaration-observed');
    if (result.kind !== 'no-declaration-observed') return;
    expect(result.declarationObservation.kind).toBe('declaration-unreachable');
    expect(result.declarationObservation.reason).toBe('source-uncaptured-or-unreachable');
  });

  it('an invalid declaration is the named declaration-invalid arm carrying every failure', async () => {
    const root = tempDir('rt3-pipe-invalid-');
    mkdirSync(join(root, '.syzygy'), { recursive: true });
    writeFileSync(join(root, '.syzygy', 'project.yaml'), 'schema_version: "1"\n', 'utf8');

    const result = await evaluateProject(root, CAPTURE);
    expect(result.kind).toBe('declaration-invalid');
    if (result.kind !== 'declaration-invalid') return;
    expect(result.registration.status).toBe('failed');
    expect(result.failures.length).toBeGreaterThan(0);
  });
});

// syzygy-u2a.6 — the coverage and route layers carry Task 1's closed
// decision; they never reload a record or re-verify an act.
describe('coverage preserves the closed consent decision (syzygy-u2a.6)', () => {
  it('a closed unverified decision keeps its untrusted record, effective Unknown and owner-adjudication route through coverage and both channels', async () => {
    const { root, observedSourceDir } = fixtureRepo();
    // A state-(2) claim with no correlation provider: Task 1 refuses it
    // `correlation-unavailable`, never downgrades it to bootstrap.
    writeConsent(
      join(root, '.syzygy', 'governance', 'decisions'),
      { id: 'consent-observed', project: 'prj-rt3-pipeline', repository: 'repo-observed-source' },
      {
        provenance: 'syzygy-verified',
        a1_audit_record: { id: 'a1-fixture', digest: `sha256:${'d'.repeat(64)}` },
      },
    );
    const result = await evaluateProject(root, fixtureDeps(observedSourceDir, root));
    if (result.kind !== 'project-evaluated') throw new Error('expected evaluation');

    const decision = result.consentDecisions[1];
    const row = result.coverage.repositories[1];
    if (decision?.authorization !== 'Unknown' || row?.state !== 'unconsented') {
      throw new Error('expected a refused decision and an unconsented row');
    }
    expect(decision.diagnostic).toBe('correlation-unavailable');
    expect(row.basis).toBe('no-resolvable-in-force-record');
    if (row.basis !== 'no-resolvable-in-force-record') return;
    expect([row.label, row.reason, row.reference, row.diagnostic, row.diagnosticReference, row.route]).toEqual([
      'Unknown',
      'unconsented-source-or-provider',
      'consent-observed',
      'correlation-unavailable',
      'consent-observed',
      'owner-adjudication',
    ]);
    // The untrusted view is the decision's own, field for field.
    expect(row.untrustedRecord).toEqual(decision.untrustedRecord);
    expect(row.untrustedRecord).toMatchObject({
      trust: 'untrusted content',
      recordId: 'consent-observed',
      attribution: 'test-owner',
      grantState: 'in-force',
    });
    // Nothing was read for the refused pair, so nothing is observed.
    expect(result.observations.map((o) => o.repositoryId)).toEqual(['repo-governance-root']);

    // Both channels serve the row as computed.
    const machine = machineProjectBody(result);
    if (machine.kind !== 'project-evaluated') throw new Error('expected evaluated body');
    expect(JSON.parse(JSON.stringify(machine.coverageBoundary.records[1]))).toEqual(row);
    const routes = humanRoutes({ getEvaluation: () => result });
    const page = await routes[0]?.handle({} as never);
    const html = String(page?.body);
    const span = html.match(/<span class="coverage-record" data-repository-id="repo-observed-source"[^>]*>/)?.[0];
    expect(span).toContain('data-consent-diagnostic="correlation-unavailable"');
    expect(span).toContain('data-resolution-route="owner-adjudication"');
    expect(span).toContain('data-untrusted-record-id="consent-observed"');
    expect(span).toContain('data-untrusted-attribution="test-owner"');
  });

  it('static review: coverage and route modules import neither the consent loader nor the act verifier', () => {
    const source = (path: string): string => readFileSync(new URL(path, import.meta.url), 'utf8');
    const modules = {
      coverage: source('../../cap1-core/src/coverage.ts'),
      'routes-machine': source('./routes-machine.ts'),
      'routes-human': source('./routes-human.ts'),
    };
    const forbidden =
      /\b(?:decideRepositoryConsent|evaluateConsentActBeforeCorrelation|correlationBindingDigest|relationsOf|resolveConsent|loadConsentReferences?|resolveConsentReferencePath|captureProjectInputs|evaluateProject)\b|consent-loading|source-snapshot/;
    const findings = Object.entries(modules).flatMap(([name, text]) =>
      forbidden.test(text) ? [name] : [],
    );
    expect(findings).toEqual([]);
    // Coverage's only consent-decision import is type-only.
    const decisionImports = modules.coverage.match(/^import[^;]*from '\.\/consent-decision\.js';/gm) ?? [];
    expect(decisionImports.map((statement) => statement.startsWith('import type'))).toEqual([true]);
    expect(modules.coverage).not.toMatch(/from '\.\/consent\.js'/);
  });
});
