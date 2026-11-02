import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { writeConsent } from '../test-support/consent-acts.js';
import { evaluateProject } from './pipeline.js';
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
