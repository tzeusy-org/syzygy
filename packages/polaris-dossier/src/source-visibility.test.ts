import { sha256 } from '@syzygy/support';
import { describe, expect, it } from 'vitest';

import { pairVisibility, PUBLIC_BY_FORM_ACTS, readSecretRedaction, readSourceVisibility, redactionFor } from '@syzygy/polaris-generation-core/live';
import { V7, V8, V8_ROW } from './screening-v8.testkit.js';

const scopeOf = (text: string): Record<string, unknown> => (JSON.parse(text) as { publicSourceScope: Record<string, unknown> }).publicSourceScope;
const detectorIds = (text: string): string[] => {
  const doc = JSON.parse(text) as { detectors: { id: string }[]; publicSourceScope: { scopeDetectors: { detectors: { id: string }[] } } };
  return [...doc.detectors.map(d => d.id), ...doc.publicSourceScope.scopeDetectors.detectors.map(d => d.id)];
};
const withVisibility = (change: (sv: Record<string, unknown>) => void): Record<string, unknown> => {
  const scope = scopeOf(V8);
  const sv = { ...(scope['sourceVisibility'] as Record<string, unknown>) };
  change(sv);
  return { ...scope, sourceVisibility: sv };
};

describe('the version-8 fixture', () => {
  it('is the package manifest row', () => {
    expect(sha256(V8)).toBe(V8_ROW);
  });
});

describe('readSourceVisibility (sourceVisibility, version 8)', () => {
  it('reads the version-8 scope as admitting public and private', () => {
    expect(readSourceVisibility(scopeOf(V8))).toEqual({ ok: true, declared: true, admitsPrivate: true });
  });
  it.runIf(V7 !== null)('reads a scope without the key (version 7) as public only', () => {
    expect(readSourceVisibility(scopeOf(V7!))).toEqual({ ok: true, declared: false, admitsPrivate: false });
  });
  it.each(['rule', 'privateSourceRules', 'unchanged', 'agentSessions', 'consequence', 'consentRecordMetadata'])('refuses an edited %s', (key) => {
    const scope = withVisibility(sv => { sv[key] = `${sv[key] as string} `; });
    expect(readSourceVisibility(scope)).toEqual({ ok: false, why: `its source visibility ${key} is not the text this screen implements` });
  });
  it.each([
    ['values', ['public'], 'its source visibility values is not exactly public, private'],
    ['values', ['private', 'public'], 'its source visibility values is not exactly public, private'],
    ['admitted', ['public'], 'its source visibility admitted is not exactly public, private'],
    ['admitted', ['public', 'private', 'internal'], 'its source visibility admitted is not exactly public, private'],
  ])('refuses %s %j', (key, value, why) => {
    expect(readSourceVisibility(withVisibility(sv => { sv[key] = value; }))).toEqual({ ok: false, why });
  });
  it('refuses an added or a missing field, and a value that is not an object', () => {
    expect(readSourceVisibility(withVisibility(sv => { sv['extra'] = 'x'; }))).toMatchObject({ ok: false, why: expect.stringContaining('carries the fields') });
    expect(readSourceVisibility(withVisibility(sv => { delete sv['consequence']; }))).toMatchObject({ ok: false, why: expect.stringContaining('carries the fields') });
    expect(readSourceVisibility({ ...scopeOf(V8), sourceVisibility: 'private' })).toEqual({ ok: false, why: 'its source visibility is not an object' });
  });
  it('pins the two acts public by form, and the pinned rule names both', () => {
    expect(PUBLIC_BY_FORM_ACTS).toEqual([
      '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md',
      '.syzygy/governance/decisions/PUBLIC-REPO-ADMISSION-REQUESTS-OBSERVATION-ACT.md',
    ]);
    const rule = (scopeOf(V8)['sourceVisibility'] as { rule: string }).rule;
    for (const file of PUBLIC_BY_FORM_ACTS) expect(rule).toContain(file);
  });
});

describe('pairVisibility (sourceVisibility.rule)', () => {
  it.each([
    [[], 'private'],
    [['public'], 'public'],
    [['public', 'public'], 'public'],
    [['public', 'private'], 'private'],
    [['public', 'states-nothing'], 'private'],
    [['states-nothing'], 'private'],
    [['private'], 'private'],
  ] as const)('%j is %s', (carriers, visibility) => {
    expect(pairVisibility(carriers)).toBe(visibility);
  });
});

describe('secretRedaction.appliesTo under version 8', () => {
  it('reads the version-8 text beside sourceVisibility', () => {
    const read = readSecretRedaction(scopeOf(V8), detectorIds(V8));
    expect(read.ok && read.redaction !== null).toBe(true);
  });
  it('refuses the version-8 text without sourceVisibility, and the version-4 text beside it', () => {
    const v8 = scopeOf(V8);
    const { sourceVisibility: _dropped, ...without } = v8;
    expect(readSecretRedaction(without, detectorIds(V8))).toEqual({ ok: false, why: 'its secret redaction appliesTo is not the text this screen implements' });
    if (V7 !== null) {
      const v4Text = (scopeOf(V7)['secretRedaction'] as { appliesTo: string }).appliesTo;
      const mixed = { ...v8, secretRedaction: { ...(v8['secretRedaction'] as Record<string, unknown>), appliesTo: v4Text } };
      expect(readSecretRedaction(mixed, detectorIds(V8))).toEqual({ ok: false, why: 'its secret redaction appliesTo is not the text this screen implements' });
    }
  });
  it('redactionFor: a public repository keeps the redaction, a private one has none', () => {
    const read = readSecretRedaction(scopeOf(V8), detectorIds(V8));
    if (!read.ok) throw new Error(read.why);
    expect(redactionFor(read.redaction, 'public')).toBe(read.redaction);
    expect(redactionFor(read.redaction, 'private')).toBeNull();
  });
});
