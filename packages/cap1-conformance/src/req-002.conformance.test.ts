import { describe, expect, it } from 'vitest';
import { readDeclaration, registerProject } from '@syzygy/cap1-core';
import { corrupt, projectYaml } from './fixtures/index.js';

// CAP1-REQ-002 — An invalid declaration is a named failure, never a
// partial registration.
//
// Case: the checker corrupts one field of an otherwise valid declaration
// (or the file's syntax). Oracle: the output contains at least one named
// failure identifying the corrupted element and contains no registration
// fact sourced from the invalid declaration. The checker knows which
// element it corrupted — expectations are derived from that act.

const VALID_SOURCE = projectYaml({
  id: 'prj-opaque-7f3a',
  name: 'Orbital Mechanics',
  repositories: [
    { id: 'repo-opaque-01', role: 'governance-root', consent: 'consent-record-01' },
  ],
  consents: ['consent-record-01'],
});

describe('CAP1-REQ-002 — invalid declaration is a named failure, never a partial registration', () => {
  it('scenario: one invalid field yields a failure naming that field, and no registered project', () => {
    // The checker corrupts `repositories[0].role` to a value outside the
    // closed pair.
    const corrupted = VALID_SOURCE.replace('role: governance-root', 'role: primary');
    const read = readDeclaration(corrupted);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      const naming = read.failures.filter((f) => f.field === 'repositories[0].role');
      expect(naming.length).toBeGreaterThan(0);
    }
    const result = registerProject(read, 'rev-1');
    expect(result.status).toBe('failed');
  });

  it('scenario: an unparseable file is served as a named failure carrying the dialect error', () => {
    // Duplicate keys do not parse under the pinned dialect.
    const unparseable = 'project: one\nproject: two\n';
    const read = readDeclaration(unparseable);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.failures).toHaveLength(1);
      const failure = read.failures[0];
      expect(failure?.kind).toBe('unparseable');
      expect(failure?.detail.length).toBeGreaterThan(0);
    }
  });

  it('renders every dependent claim Unknown with the verbatim reason', () => {
    const result = registerProject(readDeclaration('not: [valid'), 'rev-1');
    expect(result.status).toBe('failed');
    if (result.status === 'failed') {
      expect(result.dependentClaims).toBe('Unknown');
      // Verbatim from the closed twelve-reason vocabulary (RFC2-24).
      expect(result.reason).toBe('missing-declaration');
    }
  });

  it('falsifier: no partial registration — the failed result carries no facts at all', () => {
    const corrupted = VALID_SOURCE.replace('role: governance-root', 'role: primary');
    const result = registerProject(readDeclaration(corrupted), 'rev-1');
    expect(result.status).toBe('failed');
    // No mixture of registered and unregistered facts: the failed arm
    // has no `facts` member, and no declaration-derived value leaks out.
    expect('facts' in result).toBe(false);
    expect(JSON.stringify(result)).not.toContain('prj-opaque-7f3a');
    expect(JSON.stringify(result)).not.toContain('Orbital Mechanics');
  });

  it('falsifier: no silent failure — every failure names what failed', () => {
    const corrupted = corrupt(VALID_SOURCE, 'owner: uniquosity@gmail.com', 'owner: ""');
    const read = readDeclaration(corrupted);
    expect(read.ok).toBe(false);
    if (!read.ok) {
      expect(read.failures.length).toBeGreaterThan(0);
      for (const failure of read.failures) {
        expect(failure.detail.length).toBeGreaterThan(0);
      }
      expect(read.failures.some((f) => f.field === 'owner')).toBe(true);
    }
  });
});
