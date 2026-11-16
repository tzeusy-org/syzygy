import { describe, expect, it } from 'vitest';
import { readDeclaration, registerProject } from '@syzygy/cap1-core';
import { corrupt, projectYaml } from './fixtures/index.js';

// CAP1-REQ-005 — Registration facts are deterministic per declaration
// and revision (invariant).
//
// Case: all pairs of evaluations over one identical (declaration bytes,
// source snapshot). Oracle: byte-level equality of the deterministic
// layer of the two answers, judged by comparison of two independent
// runs — never by either run's own claim of determinism.

const VALID_SOURCE = projectYaml({
  id: 'prj-opaque-7f3a',
  name: 'Orbital Mechanics',
  repositories: [
    { id: 'repo-opaque-01', role: 'governance-root', consent: 'consent-record-01' },
  ],
  consents: ['consent-record-01'],
});

describe('CAP1-REQ-005 — registration facts are deterministic per (declaration, revision)', () => {
  it('scenario: same declaration, same revision — same facts, byte-level', () => {
    const first = registerProject(readDeclaration(VALID_SOURCE), 'rev-1');
    const second = registerProject(readDeclaration(VALID_SOURCE), 'rev-1');
    expect(second).toEqual(first);
    // Byte-level equality of the deterministic layer (there is no
    // display layer in this pure structure).
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('invalid input is deterministic too — failure sets are deeply equal across runs', () => {
    const corrupted = corrupt(VALID_SOURCE, 'owner: uniquosity@gmail.com', 'owner: ""');
    const first = registerProject(readDeclaration(corrupted), 'rev-1');
    const second = registerProject(readDeclaration(corrupted), 'rev-1');
    expect(second).toEqual(first);
    expect(JSON.stringify(second)).toBe(JSON.stringify(first));
  });

  it('every registration answer names the identified evaluation it was computed at', () => {
    const result = registerProject(readDeclaration(VALID_SOURCE), 'rev-42');
    expect(result.status).toBe('registered');
    if (result.status === 'registered') {
      // The facts name their source snapshot verbatim; the as-of instant
      // belongs to the serving layer, which this pure layer cannot hold
      // without breaking the invariant (no clock, no randomness).
      expect(result.facts.revision).toBe('rev-42');
    }
  });

  it('a one-byte change in the source changes the result', () => {
    const original = registerProject(readDeclaration(VALID_SOURCE), 'rev-1');
    // One byte: the display-name label's final character.
    const mutated = VALID_SOURCE.replace('Orbital Mechanics', 'Orbital Mechanicz');
    const changed = registerProject(readDeclaration(mutated), 'rev-1');
    expect(changed).not.toEqual(original);
    if (original.status === 'registered' && changed.status === 'registered') {
      expect(changed.facts.displayName).toBe('Orbital Mechanicz');
    }
  });

  it('a revision change is visible in the facts — the evaluation identity is not shared', () => {
    const first = registerProject(readDeclaration(VALID_SOURCE), 'rev-1');
    const second = registerProject(readDeclaration(VALID_SOURCE), 'rev-2');
    expect(second).not.toEqual(first);
  });

  it('falsifier: two runs of one identified evaluation never serve different facts', () => {
    // Ten repetitions — a stand-in for the "all pairs" quantification —
    // must all be identical to the first.
    const runs = Array.from({ length: 10 }, () =>
      JSON.stringify(registerProject(readDeclaration(VALID_SOURCE), 'rev-1')),
    );
    expect(new Set(runs).size).toBe(1);
  });
});
