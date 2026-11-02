import { describe, expect, it } from 'vitest';
import {
  computeCoverage,
  coverageIdentityFields,
  isLocatorShaped,
  presentProject,
  presentRepository,
  readDeclaration,
  registerProject,
  registrationIdentityFields,
  type ConsentRecord,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';
import { decisionsFor, projectYaml } from './fixtures/index.js';

// CAP1-REQ-060 — Identities are the accepted, stable, literal ones
// (invariant).
//
// Case: every identity-bearing field in Capability 1's served answers;
// sweep: rename a fixture project and relocate a repository, then diff
// the identity fields of answers before and after — denominator: the
// identity-field set. Oracle: identity fields are unchanged by rename
// and relocation; labels change. Falsifier: a reference that breaks on
// rename, or a served identity equal to a URL or path.

const PROJECT = 'prj-stable-9c' as ProjectId;
const REPO = 'repo-stable-01' as RepositoryId;

const SOURCE_BEFORE = projectYaml({
  id: PROJECT,
  name: 'Original Name',
  repositories: [
    { id: 'repo-stable-01', role: 'governance-root', consent: 'consent-s1' },
  ],
  consents: ['consent-s1'],
});

// The rename fixture: display name changes, identifier does not.
const SOURCE_AFTER = SOURCE_BEFORE.replace('Original Name', 'Renamed Project');

const CONSENTS: readonly ConsentRecord[] = [
  {
    id: 'consent-s1',
    projectId: PROJECT,
    repositoryId: REPO,
    scope: 'observe',
    attribution: 'uniquosity@gmail.com',
    grantState: 'in-force',
  },
];

function coverageFor(source: string) {
  const read = readDeclaration(source);
  if (!read.ok) throw new Error('fixture must parse');
  return computeCoverage(read.declaration, decisionsFor(read.declaration, CONSENTS), [
    { repositoryId: REPO, outcome: 'captured', capturedScope: 'full' },
  ]);
}

describe('CAP1-REQ-060 — identities are the accepted, stable, literal ones', () => {
  it('scenario: rename changes no identity — every answer keys on the same identifier, the new name serves as a label', () => {
    const before = registerProject(readDeclaration(SOURCE_BEFORE), 'rev-1');
    const after = registerProject(readDeclaration(SOURCE_AFTER), 'rev-2');
    expect(before.status).toBe('registered');
    expect(after.status).toBe('registered');
    if (before.status === 'registered' && after.status === 'registered') {
      // Identity unchanged; label changed. Expected spellings written
      // literally from the fixture, not read from the implementation.
      expect(before.facts.projectId).toBe('prj-stable-9c');
      expect(after.facts.projectId).toBe('prj-stable-9c');
      expect(before.facts.displayName).toBe('Original Name');
      expect(after.facts.displayName).toBe('Renamed Project');
    }
  });

  it('sweep: the identity-field set of registration and coverage answers is byte-identical across the rename — denominator disclosed', () => {
    const registrationBefore = registrationIdentityFields(registerProject(readDeclaration(SOURCE_BEFORE), 'rev-1'));
    const registrationAfter = registrationIdentityFields(registerProject(readDeclaration(SOURCE_AFTER), 'rev-1'));
    const coverageBefore = coverageIdentityFields(coverageFor(SOURCE_BEFORE));
    const coverageAfter = coverageIdentityFields(coverageFor(SOURCE_AFTER));

    // The denominator: 1 registration identity field + (1 project +
    // 1 repository) coverage identity fields = 3, enumerated, none
    // silently absent.
    expect(registrationBefore.length).toBe(1);
    expect(coverageBefore.length).toBe(2);

    expect(JSON.stringify(registrationAfter)).toBe(JSON.stringify(registrationBefore));
    expect(JSON.stringify(coverageAfter)).toBe(JSON.stringify(coverageBefore));
  });

  it('relocation changes locator hints and no identity', () => {
    const before = presentRepository(REPO, {
      url: 'https://old-host.example/org/repo.git',
      path: '/srv/checkouts/old',
      branch: 'main',
    });
    const after = presentRepository(REPO, {
      url: 'https://new-host.example/other-org/renamed.git',
      path: '/srv/checkouts/new',
      branch: 'trunk',
    });
    expect(after.identity).toBe(before.identity);
    expect(after.identity).toBe('repo-stable-01');
    expect(after.locator).not.toEqual(before.locator);
  });

  it('a project presentation carries identity and label as distinct fields — a rename rebuilds the label only', () => {
    const before = presentProject(PROJECT, 'Original Name');
    const after = presentProject(PROJECT, 'Renamed Project');
    expect(after.identity).toBe(before.identity);
    expect(after.label).not.toBe(before.label);
  });

  it('falsifier sweep: locator-shaped strings are refused as identities — denominator: the prohibited-shape list', () => {
    // The three prohibited families of RFC1-2 — URL, path, branch/ref —
    // each represented; every entry must be caught.
    const locatorShaped = [
      'https://github.com/org/repo',
      'git://host/repo.git',
      'ssh://git@host/repo.git',
      '/home/user/repo',
      './repo',
      '../repo',
      '~/repo',
      'C:\\repos\\project',
      'refs/heads/main',
      'org/repo',
    ];
    expect(locatorShaped.length).toBe(10);
    for (const candidate of locatorShaped) {
      expect(isLocatorShaped(candidate)).toBe(true);
    }
  });

  it('declared opaque identifiers pass the locator-shape check', () => {
    for (const candidate of ['prj-stable-9c', 'repo-stable-01', 'prj-opaque-7f3a']) {
      expect(isLocatorShaped(candidate)).toBe(false);
    }
  });

  it('falsifier: served identity values equal no URL and no path — swept over the identity-field set', () => {
    const fields = [
      ...registrationIdentityFields(registerProject(readDeclaration(SOURCE_BEFORE), 'rev-1')),
      ...coverageIdentityFields(coverageFor(SOURCE_BEFORE)),
    ];
    expect(fields.length).toBe(3); // the sweep's denominator
    for (const field of fields) {
      expect(isLocatorShaped(field.value)).toBe(false);
    }
  });
});
