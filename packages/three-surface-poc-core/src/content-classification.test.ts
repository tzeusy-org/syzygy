// PWB-REQ-003 counterexample + sweep: the secret policy applied before model
// admission.
//
// Oracle independence: the fixture repository, the secret sentinels, the
// injected faults (a removed source, a denied read, a classifier-excluded
// source) and the Git spy all live here. Expected reasons, redaction classes
// and Unknown reasons are hand-typed literals — never imported from the
// module under test or from the vocabulary modules it uses. Sink scans
// serialize everything the module returns and look for the sentinel bytes
// and for any `text` field.

import { createHash } from 'node:crypto';
import { readFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  EXCLUSION_REASONS,
  PWB_SECRET_POLICY,
  REDACTION_CLASSES,
  UNAVAILABLE_REASONS,
  classifyManifestSources,
  classifySource,
  compileDetectors,
  detectSecrets,
  detectSecretsCharged,
  parseFailureExclusion,
  type ClassificationRecord,
  type SecretClassificationPolicy,
  classifyPhaseASeed,
} from './content-classification.js';
import { createExactObjectReader, type ExactObjectReader, type ObjectReadRecord } from './git-object-reader.js';
import { indexGitTree, type GitTreeEntry } from './git-tree.js';
import type { ManifestSource } from './project-shape-manifest.js';
import { PWB_RESOURCE_LIMITS } from './project-shape-observation.js';
import type { PwbResourceLimits } from './pwb-types.js';
import { createResourceLedger, type ParsePassIdentity } from './resource-ledger.js';

// ---------------------------------------------------------------------
// Fixture repository.

const enc = new TextEncoder();
const sha1Blob = (bytes: Uint8Array): string =>
  createHash('sha1').update(`blob ${bytes.byteLength}\0`).update(bytes).digest('hex');
const sha256Hex = (bytes: Uint8Array): string => createHash('sha256').update(bytes).digest('hex');

// Secret sentinels: each fires exactly one policy detector. The bytes must
// never reach any sink.
const SECRETS = {
  privateKey: '-----BEGIN RSA PRIVATE KEY-----\nMIIpwbsentinelA\n-----END RSA PRIVATE KEY-----',
  awsKey: 'AKIAPWBSENTINELB0000',
  githubToken: 'ghp_pwbsentinelC0000000000000000000',
  slackToken: 'xoxb-pwbsentinelD00000',
  assignment: 'password = "pwbsentinelE-hunter2"',
  url: 'https://pwbsentinelF:hunter2@example.org/repo.git',
} as const;
const SENTINEL_BYTES = ['pwbsentinelA', 'PWBSENTINELB', 'pwbsentinelC', 'pwbsentinelD', 'pwbsentinelE', 'pwbsentinelF', 'hunter2', 'pwb-active-sentinel', 'pwb-inert-example'] as const;

const TEXTS: Record<string, string> = {
  'about/README.md': '# About\n\n- [Heart](heart-and-soul/README.md)\n',
  'about/heart-and-soul/README.md': '# Heart and soul\n\nPlain words. token: short\n',
  'about/heart-and-soul/vision.md': '# Vision\n\nThe api key is rotated monthly; see https://example.org/docs?a=1&b=2.\n',
  'about/heart-and-soul/principles.md': '# Principles\n\n- honesty\n',
  'openspec/specs/one/spec.md': '# One\n',
  'roster/alpha/butler.toml': 'name = "alpha"\n',
  'secrets/private-key.md': `# Key\n\n${SECRETS.privateKey}\n`,
  'secrets/aws.md': `id: ${SECRETS.awsKey}\n`,
  'secrets/github.md': `${SECRETS.githubToken}\n`,
  'secrets/slack.md': `${SECRETS.slackToken}\n`,
  'secrets/assignment.md': `config\n${SECRETS.assignment}\n`,
  'secrets/url.md': `remote: ${SECRETS.url}\n`,
  'secrets/two.md': `${SECRETS.githubToken} and ${SECRETS.url}\n`,
  'notes/active.md': '# Notes\n\n<script>pwb-active-sentinel()</script>\n',
  // Amended PWB-REQ-006: markup only inside closed code contexts is inert…
  'notes/inert-code.md': '# Notes\n\n```html\n<script>pwb-inert-example()</script>\n```\n\nUse `<img onerror=x>` and `[x](javascript:1)` as text.\n',
  // …a malformed context excludes the whole artifact…
  'notes/unclosed-fence.md': '# Notes\n\n```\nnever closed\n',
  // …and a secret in a code context is still a secret (detectors ignore the mask).
  'secrets/in-code.md': `# Key\n\n\`\`\`\n${SECRETS.githubToken}\n\`\`\`\n`,
  'secrets/in-span.md': `Set \`${SECRETS.assignment}\` first.\n`,
  '.env': 'X=1\n',
  'certs/server.pem': 'x\n',
};
const BYTES: Record<string, Uint8Array> = Object.fromEntries(Object.entries(TEXTS).map(([path, text]) => [path, enc.encode(text)]));
const NUL_BYTES = enc.encode('a\0b');
const BAD_UTF8 = new Uint8Array([0x23, 0x20, 0xff, 0xfe, 0x0a]);
const oidOf = (path: string): string => sha1Blob(BYTES[path] as Uint8Array);
const NUL_OID = sha1Blob(NUL_BYTES);
const BAD_UTF8_OID = sha1Blob(BAD_UTF8);
const SUBMODULE_OID = 'b'.repeat(40);
const SYMLINK_OID = 'a'.repeat(40);
const MISSING_OID = 'd'.repeat(40);

function blob(path: string, mode = '100644'): GitTreeEntry {
  return { mode, type: 'blob', objectId: oidOf(path), sizeBytes: (BYTES[path] as Uint8Array).byteLength, path };
}

const TREE: readonly GitTreeEntry[] = [
  ...Object.keys(TEXTS).map((path) => blob(path)),
  { mode: '100644', type: 'blob', objectId: NUL_OID, sizeBytes: NUL_BYTES.byteLength, path: 'binary/nul.md' },
  { mode: '100644', type: 'blob', objectId: BAD_UTF8_OID, sizeBytes: BAD_UTF8.byteLength, path: 'binary/latin1.md' },
  { mode: '120000', type: 'blob', objectId: SYMLINK_OID, sizeBytes: 11, path: 'about/link.md' },
  { mode: '160000', type: 'commit', objectId: SUBMODULE_OID, path: 'vendor/sub' },
  { mode: '100644', type: 'blob', objectId: MISSING_OID, sizeBytes: 5, path: 'gone/object.md' },
];

function gitSpy(): { readonly runGit: (args: readonly string[]) => Uint8Array; readonly calls: string[][] } {
  const byOid = new Map<string, Uint8Array>();
  for (const [path, bytes] of Object.entries(BYTES)) byOid.set(oidOf(path), bytes);
  byOid.set(NUL_OID, NUL_BYTES);
  byOid.set(BAD_UTF8_OID, BAD_UTF8);
  byOid.set(SYMLINK_OID, enc.encode('/etc/passwd'));
  const calls: string[][] = [];
  const runGit = (args: readonly string[]): Uint8Array => {
    calls.push([...args]);
    if (args.length !== 3 || args[0] !== 'cat-file' || args[1] !== 'blob' || !/^[0-9a-f]{40}$/.test(args[2] ?? '')) {
      throw new Error(`spy: request escaped the object reader: git ${args.join(' ')}`);
    }
    const bytes = byOid.get(args[2] as string);
    if (bytes === undefined) throw new Error('fatal: Not a valid object name');
    return bytes;
  };
  return { runGit, calls };
}

function reader(limits: Partial<PwbResourceLimits> = {}): { readonly reader: ExactObjectReader; readonly calls: string[][] } {
  const spy = gitSpy();
  return {
    reader: createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), resourceLimits: { ...PWB_RESOURCE_LIMITS, ...limits } }),
    calls: spy.calls,
  };
}

const treeIndex = indexGitTree(TREE);
function source(path: string, extractionClasses: readonly string[] = ['principle'], overrides: Partial<ManifestSource> = {}): ManifestSource {
  const entry = treeIndex.entryAt(path);
  const anchor: ManifestSource['anchor'] =
    entry === undefined
      ? { kind: 'missing-at-revision' }
      : entry.type === 'blob'
        ? { kind: 'blob', mode: entry.mode, objectId: entry.objectId }
        : { kind: 'not-a-blob', mode: entry.mode, type: entry.type === 'tree' ? 'tree' : 'commit' };
  return { path, rule: 'pillar-named-file', pillar: 'heart-and-soul', extractionClasses: extractionClasses as ManifestSource['extractionClasses'], anchor, ...overrides };
}

// The phase-B population under test: benign, secret, active, binary,
// denied, missing, non-blob and unreadable sources, sorted by path as the
// manifest would.
const POPULATION: readonly ManifestSource[] = [
  source('.env', []),
  source('about/README.md', []),
  source('about/heart-and-soul/README.md', ['project-account-section']),
  source('about/heart-and-soul/principles.md', ['principle']),
  source('about/heart-and-soul/vision.md', ['principle', 'success-criterion']),
  source('about/link.md'),
  source('about/missing.md'),
  source('binary/latin1.md'),
  source('binary/nul.md'),
  source('certs/server.pem', []),
  source('gone/object.md'),
  source('notes/active.md'),
  source('notes/inert-code.md', ['principle']),
  source('notes/unclosed-fence.md'),
  source('openspec/specs/one/spec.md', ['baseline-spec']),
  source('roster/alpha/butler.toml', ['roster-identity']),
  source('secrets/assignment.md'),
  source('secrets/aws.md'),
  source('secrets/github.md'),
  source('secrets/in-code.md'),
  source('secrets/in-span.md'),
  source('secrets/private-key.md'),
  source('secrets/slack.md'),
  source('secrets/two.md'),
  source('secrets/url.md'),
  source('vendor/sub'),
].sort((a, b) => (a.path < b.path ? -1 : 1));

// Hand-typed expectation for every source in the population.
type Expected =
  | { readonly outcome: 'classified' }
  | { readonly outcome: 'excluded'; readonly redactionClass: string; readonly detectorId?: string; readonly exclusionReason?: string; readonly digest: boolean; readonly unknownReason: string; readonly degradationState: string }
  | { readonly outcome: 'unavailable'; readonly reason: string; readonly unknownReason: string; readonly degradationState: string };

const EXPECTED: Record<string, Expected> = {
  '.env': { outcome: 'excluded', redactionClass: 'excluded-artifact', exclusionReason: 'denied-path', digest: false, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'about/README.md': { outcome: 'classified' },
  'about/heart-and-soul/README.md': { outcome: 'classified' },
  'about/heart-and-soul/principles.md': { outcome: 'classified' },
  'about/heart-and-soul/vision.md': { outcome: 'classified' },
  'about/link.md': { outcome: 'unavailable', reason: 'not-a-regular-blob', unknownReason: 'source-uncaptured-or-unreachable', degradationState: 'Source unreachable' },
  'about/missing.md': { outcome: 'unavailable', reason: 'missing-at-revision', unknownReason: 'source-uncaptured-or-unreachable', degradationState: 'Source unreachable' },
  'binary/latin1.md': { outcome: 'excluded', redactionClass: 'unclassifiable-excluded', exclusionReason: 'not-utf-8', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'binary/nul.md': { outcome: 'excluded', redactionClass: 'unclassifiable-excluded', exclusionReason: 'contains-nul', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'certs/server.pem': { outcome: 'excluded', redactionClass: 'excluded-artifact', exclusionReason: 'denied-path', digest: false, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'gone/object.md': { outcome: 'unavailable', reason: 'git-read-failed', unknownReason: 'source-uncaptured-or-unreachable', degradationState: 'Observer failed' },
  'notes/active.md': { outcome: 'excluded', redactionClass: 'unclassifiable-excluded', exclusionReason: 'active-content', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'notes/inert-code.md': { outcome: 'classified' },
  'notes/unclosed-fence.md': { outcome: 'excluded', redactionClass: 'unclassifiable-excluded', exclusionReason: 'active-content', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'openspec/specs/one/spec.md': { outcome: 'classified' },
  'roster/alpha/butler.toml': { outcome: 'classified' },
  'secrets/assignment.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'credential-assignment', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/aws.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'known-token-formats', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/github.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'known-token-formats', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/in-code.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'known-token-formats', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/in-span.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'credential-assignment', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/private-key.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'private-key-material', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/slack.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'known-token-formats', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  // Two detectors match; the first in policy order is named.
  'secrets/two.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'known-token-formats', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'secrets/url.md': { outcome: 'excluded', redactionClass: 'excluded-artifact', detectorId: 'credential-bearing-url', digest: true, unknownReason: 'excluded-content', degradationState: 'Excluded content' },
  'vendor/sub': { outcome: 'unavailable', reason: 'not-a-regular-blob', unknownReason: 'source-uncaptured-or-unreachable', degradationState: 'Source unreachable' },
};

function assertNoSentinel(sink: unknown): void {
  const json = JSON.stringify(sink);
  for (const sentinel of SENTINEL_BYTES) expect(json, `sink carries ${sentinel}`).not.toContain(sentinel);
  expect(json).not.toContain('"text"');
  expect(json).not.toContain('BEGIN RSA');
}

function population(policy?: SecretClassificationPolicy, limits?: Partial<PwbResourceLimits>) {
  const r = reader(limits);
  const consumed: string[] = [];
  const result = classifyManifestSources(
    { sources: POPULATION },
    r.reader,
    (s, text) => {
      consumed.push(s.path);
      return text.length;
    },
    policy,
  );
  return { result, consumed, calls: r.calls, reader: r.reader };
}

// ---------------------------------------------------------------------

describe('PWB-REQ-003 — the population survives every fault', () => {
  it('returns exactly one result per manifest source, in manifest order, with the hand-typed outcome', () => {
    const { result } = population();
    expect(result.results.map((r) => r.source.path)).toEqual(POPULATION.map((s) => s.path));
    expect(result.results).toHaveLength(Object.keys(EXPECTED).length);
    for (const r of result.results) {
      const expected = EXPECTED[r.record.path];
      expect(expected, r.record.path).toBeDefined();
      if (expected === undefined) continue;
      expect(r.record.outcome, r.record.path).toBe(expected.outcome);
      if (expected.outcome === 'classified') {
        expect(r.record.outcome === 'classified' && r.record.contentDigest).toBe(`sha256:${sha256Hex(BYTES[r.record.path] as Uint8Array)}`);
        expect(r.value).toBe(TEXTS[r.record.path]?.length);
      } else if (expected.outcome === 'excluded' && r.record.outcome === 'excluded') {
        const e = r.record.exclusion;
        expect(e.redactionClass).toBe(expected.redactionClass);
        expect(e.repositoryRelativePath).toBe(r.record.path);
        expect(e.policyId).toBe('polaris-butlers-project-shape-secrets');
        expect(e.policyVersion).toBe('1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd');
        expect(e.detectorId).toBe(expected.detectorId);
        expect(e.exclusionReason).toBe(expected.exclusionReason);
        expect(e.contentDigest !== undefined, `${r.record.path} digest presence`).toBe(expected.digest);
        if (expected.digest && BYTES[r.record.path] !== undefined) expect(e.contentDigest).toBe(`sha256:${sha256Hex(BYTES[r.record.path] as Uint8Array)}`);
        expect(r.record.unknown.unknownReason).toBe(expected.unknownReason);
        expect(r.record.unknown.degradationState).toBe(expected.degradationState);
        expect(r.value).toBeUndefined();
      } else if (expected.outcome === 'unavailable' && r.record.outcome === 'unavailable') {
        expect(r.record.reason).toBe(expected.reason);
        expect(r.record.unknown.unknownReason).toBe(expected.unknownReason);
        expect(r.record.unknown.degradationState).toBe(expected.degradationState);
        expect(r.value).toBeUndefined();
      }
    }
  });

  it('counts add up to the source denominator and the redaction classes are the two emitted ones', () => {
    const { result } = population();
    const c = result.counts;
    expect(c.sources).toBe(POPULATION.length);
    expect(c.classified + c.excluded + c.unavailable).toBe(c.sources);
    expect(c.classified).toBe(7);
    expect(c.classifiedByBasis).toEqual({ body: 7, 'path-only': 0 });
    expect(c.classifiedByBasis.body + c.classifiedByBasis['path-only']).toBe(c.classified);
    expect(c.excluded).toBe(15);
    expect(c.unavailable).toBe(4);
    expect(c.byRedactionClass).toEqual({ 'excluded-artifact': 11, 'unclassifiable-excluded': 4 });
    expect(result.exclusions).toHaveLength(15);
    expect(new Set(result.exclusions.map((e) => e.redactionClass))).toEqual(new Set(['excluded-artifact', 'unclassifiable-excluded']));
    expect(result.policyId).toBe('polaris-butlers-project-shape-secrets');
    expect(result.policyVersion).toBe('1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd');
  });

  it('hands a body only to the consumer, and only for classified sources', () => {
    const { consumed } = population();
    expect(consumed).toEqual(Object.entries(EXPECTED).filter(([, e]) => e.outcome === 'classified').map(([p]) => p).sort());
  });

  it('reads each admitted blob exactly once and nothing for denied, missing or non-blob sources', () => {
    const { calls } = population();
    const readOids = calls.map((c) => c[2]);
    const expectedOids = POPULATION.filter((s) => s.anchor.kind === 'blob' && s.anchor.mode !== '120000' && !['.env', 'certs/server.pem'].includes(s.path)).map((s) => (s.anchor as { objectId: string }).objectId);
    expect(readOids).toEqual(expectedOids);
    expect(readOids).not.toContain(oidOf('.env'));
    expect(readOids).not.toContain(oidOf('certs/server.pem'));
    expect(readOids).not.toContain(SYMLINK_OID);
  });

  it('no secret, active or body byte reaches the returned model, records, counts or exclusions', () => {
    const { result, reader: r } = population();
    assertNoSentinel(result);
    assertNoSentinel(r.records);
    assertNoSentinel(result.exclusions);
    // The consumer did see the benign bodies (the sentinels never were).
    expect(result.results.filter((x) => x.value !== undefined)).toHaveLength(7);
  });

  it('the three spec faults: a removed source, a denied read and a classifier-excluded source all stay counted', () => {
    // Removed: the population names a path the tree does not carry.
    // Denied: the policy denies `.env` before any read. Excluded: a detector
    // match. The Git population (tree blobs named by the manifest) and the
    // post-fault population are compared by path.
    const { result } = population();
    const paths = result.results.map((r) => r.record.path);
    expect(paths).toContain('about/missing.md');
    expect(paths).toContain('.env');
    expect(paths).toContain('secrets/private-key.md');
    const byPath = new Map(result.results.map((r) => [r.record.path, r.record]));
    expect(byPath.get('about/missing.md')?.outcome).toBe('unavailable');
    expect(byPath.get('.env')?.outcome).toBe('excluded');
    expect(byPath.get('secrets/private-key.md')?.outcome).toBe('excluded');
    for (const record of byPath.values()) {
      if (record.outcome !== 'classified') expect(record.unknown.unknownReason).toMatch(/^(excluded-content|source-uncaptured-or-unreachable)$/);
    }
  });

  it('an over-limit source is excluded unclassifiable with the limit named, never opened, and stays counted', () => {
    const { result, calls } = population(undefined, { maxBytesPerSource: 20 });
    const big = result.results.filter((r) => (BYTES[r.record.path]?.byteLength ?? 0) > 20 && r.source.anchor.kind === 'blob' && r.source.anchor.mode === '100644');
    expect(big.length).toBeGreaterThan(3);
    for (const r of big) {
      if (['.env', 'certs/server.pem'].includes(r.record.path)) continue;
      expect(r.record.outcome, r.record.path).toBe('excluded');
      if (r.record.outcome !== 'excluded') continue;
      expect(r.record.exclusion.redactionClass).toBe('unclassifiable-excluded');
      expect(r.record.exclusion.exclusionReason).toBe('resource-limit');
      expect(r.record.exclusion.detail).toBe('maxBytesPerSource');
      expect(r.record.exclusion.contentDigest).toBeUndefined();
      expect(r.record.unknown.unknownReason).toBe('source-uncaptured-or-unreachable');
      expect(r.record.unknown.degradationState).toBe('Partial snapshot');
      expect(calls.map((c) => c[2])).not.toContain((r.source.anchor as { objectId: string }).objectId);
    }
    expect(result.results).toHaveLength(POPULATION.length);
    assertNoSentinel(result);
  });
});

describe('PWB-REQ-003 — classifySource step by step', () => {
  const policy = PWB_SECRET_POLICY;
  const detectors = compileDetectors(policy);
  const input = { policy, detectors, manifest: { sources: POPULATION } };
  const readRecord = (path: string): ObjectReadRecord => ({
    path,
    objectId: oidOf(path),
    outcome: 'read',
    bytes: (BYTES[path] as Uint8Array).byteLength,
    contentDigest: `sha256:${sha256Hex(BYTES[path] as Uint8Array)}`,
  });

  it('step 1: a source outside the manifest, or a record about a different object, is unavailable not-in-manifest', () => {
    const stray = source('about/heart-and-soul/principles.md', ['principle'], { path: 'about/stray.md' });
    expect(classifySource(input, stray, readRecord('about/heart-and-soul/principles.md'), 'x').record).toMatchObject({ outcome: 'unavailable', reason: 'not-in-manifest' });
    const member = POPULATION.find((s) => s.path === 'about/heart-and-soul/principles.md') as ManifestSource;
    const wrongObject = { ...readRecord(member.path), objectId: oidOf('about/README.md') };
    expect(classifySource(input, member, wrongObject, 'x').record).toMatchObject({ outcome: 'unavailable', reason: 'not-in-manifest' });
    const wrongPath = { ...readRecord('about/README.md') };
    expect(classifySource(input, member, wrongPath, 'x').record).toMatchObject({ outcome: 'unavailable', reason: 'not-in-manifest' });
    // Same object, different path: the record is not about this source.
    const sameObjectOtherPath = { ...readRecord(member.path), path: 'about/other.md' };
    expect(classifySource(input, member, sameObjectOtherPath, 'x').record).toMatchObject({ outcome: 'unavailable', reason: 'not-in-manifest' });
    // An equal copy of a member (same path and anchor) is a member.
    const copy = { ...member };
    expect(classifySource(input, copy, readRecord(member.path), TEXTS[member.path] as string).kind).toBe('classified');
  });

  it('step 2: every reader refusal maps to its fixed outcome', () => {
    const member = POPULATION.find((s) => s.path === 'about/heart-and-soul/principles.md') as ManifestSource;
    const refused = (detail: string): ObjectReadRecord => ({ path: member.path, outcome: 'refused', bytes: 0, detail });
    const table: readonly (readonly [string, Partial<ClassificationRecord>])[] = [
      ['missing-at-revision', { outcome: 'unavailable', reason: 'missing-at-revision' }],
      ['denied-basename', { outcome: 'excluded' }],
      ['denied-prefix', { outcome: 'excluded' }],
      ['denied-suffix', { outcome: 'excluded' }],
      ['not-a-regular-blob', { outcome: 'unavailable', reason: 'not-a-regular-blob' }],
      ['not-in-tree', { outcome: 'unavailable', reason: 'not-in-tree' }],
      ['path-escapes-repository', { outcome: 'unavailable', reason: 'path-escapes-repository' }],
      ['path-not-normalized', { outcome: 'unavailable', reason: 'path-not-normalized' }],
      ['object-id-differs-from-tree', { outcome: 'unavailable', reason: 'object-id-mismatch' }],
      ['something-new', { outcome: 'unavailable', reason: 'not-a-regular-blob' }],
    ];
    for (const [detail, expected] of table) {
      const record = classifySource(input, member, refused(detail), undefined).record;
      expect(record, detail).toMatchObject(expected);
      if (record.outcome === 'excluded') {
        expect(record.exclusion).toEqual({
          redactionClass: 'excluded-artifact',
          repositoryRelativePath: member.path,
          exclusionReason: 'denied-path',
          detail,
          policyId: 'polaris-butlers-project-shape-secrets',
          policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd',
        });
      }
    }
    for (const outcome of ['git-read-failed', 'object-id-mismatch'] as const) {
      const record = classifySource(input, member, { path: member.path, objectId: oidOf(member.path), outcome, bytes: 0 }, undefined).record;
      expect(record).toMatchObject({ outcome: 'unavailable', reason: outcome });
      expect(record.outcome === 'unavailable' && record.unknown.degradationState).toBe(outcome === 'git-read-failed' ? 'Observer failed' : 'Source unreachable');
    }
    for (const [outcome, exclusionReason] of [
      ['contains-nul', 'contains-nul'],
      ['not-utf-8', 'not-utf-8'],
      ['active-content', 'active-content'],
      ['over-limit', 'resource-limit'],
    ] as const) {
      const record = classifySource(input, member, { ...readRecord(member.path), outcome, detail: 'maxTotalBytes', activeContent: [{ form: 'script-element', line: 1, column: 1 }] }, undefined).record;
      expect(record).toMatchObject({ outcome: 'excluded', exclusion: { redactionClass: 'unclassifiable-excluded', exclusionReason } });
    }
    // A `read` record without a body or digest cannot be classified.
    expect(classifySource(input, member, readRecord(member.path), undefined).record).toMatchObject({ outcome: 'unavailable', reason: 'git-read-failed' });
    expect(classifySource(input, member, { ...readRecord(member.path), contentDigest: undefined }, 'x').record).toMatchObject({ outcome: 'unavailable', reason: 'git-read-failed' });
  });

  it('step 3: every detector runs over the transient text and the first match in policy order is named', () => {
    const ran: string[] = [];
    const spies = detectors.map((d) => ({ id: d.id, matches: (t: string) => (ran.push(d.id), d.matches(t)) }));
    expect(detectSecrets(spies, TEXTS['secrets/two.md'] as string)).toBe('known-token-formats');
    expect(ran).toEqual(['private-key-material', 'known-token-formats', 'credential-assignment', 'credential-bearing-url']);
    expect(detectSecrets(spies, 'nothing here')).toBeUndefined();
    // Detector state does not leak between calls (global regexps).
    expect(detectSecrets(detectors, SECRETS.awsKey)).toBe('known-token-formats');
    expect(detectSecrets(detectors, SECRETS.awsKey)).toBe('known-token-formats');
    expect(detectSecrets(detectors, `x ${SECRETS.awsKey}`)).toBe('known-token-formats');
  });

  it('step 3: benign project prose passes every detector', () => {
    for (const path of ['about/README.md', 'about/heart-and-soul/README.md', 'about/heart-and-soul/vision.md', 'about/heart-and-soul/principles.md', 'openspec/specs/one/spec.md', 'roster/alpha/butler.toml']) {
      expect(detectSecrets(detectors, TEXTS[path] as string), path).toBeUndefined();
    }
    expect(detectSecrets(detectors, 'password: short')).toBeUndefined();
    expect(detectSecrets(detectors, 'https://example.org/user@host')).toBeUndefined();
    expect(detectSecrets(detectors, 'ghp_short')).toBeUndefined();
  });

  it('step 4: an extraction class outside the closed set, or a repeated class, withholds the source', () => {
    const member = POPULATION.find((s) => s.path === 'about/heart-and-soul/principles.md') as ManifestSource;
    const text = TEXTS[member.path] as string;
    for (const classes of [['principle', 'not-a-class'], ['principle', 'principle']]) {
      const odd = { ...member, extractionClasses: classes as ManifestSource['extractionClasses'] };
      const record = classifySource(input, odd, readRecord(member.path), text).record;
      expect(record).toMatchObject({ outcome: 'excluded', exclusion: { redactionClass: 'unclassifiable-excluded', exclusionReason: 'unknown-extraction-class' } });
      expect(record.outcome === 'excluded' && record.exclusion.contentDigest).toBe(`sha256:${sha256Hex(BYTES[member.path] as Uint8Array)}`);
    }
    const none = { ...member, extractionClasses: [] as ManifestSource['extractionClasses'] };
    expect(classifySource(input, none, readRecord(member.path), text).kind).toBe('classified');
  });

  it('step 5: a classified source whose parse fails is withheld whole, hash-not-body', () => {
    const member = POPULATION.find((s) => s.path === 'about/heart-and-soul/principles.md') as ManifestSource;
    const classified = classifySource(input, member, readRecord(member.path), TEXTS[member.path] as string);
    expect(classified.kind).toBe('classified');
    if (classified.kind !== 'classified') return;
    expect(classified.record).toEqual({
      path: member.path,
      outcome: 'classified',
      contentDigest: `sha256:${sha256Hex(BYTES[member.path] as Uint8Array)}`,
      extractionClasses: ['principle'],
      policyId: 'polaris-butlers-project-shape-secrets',
      policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd',
      detectorsRun: 4,
      basis: 'body',
    });
    const excluded = parseFailureExclusion(policy, classified.record);
    expect(excluded).toEqual({
      path: member.path,
      outcome: 'excluded',
      exclusion: {
        redactionClass: 'unclassifiable-excluded',
        repositoryRelativePath: member.path,
        contentDigest: classified.record.contentDigest,
        exclusionReason: 'parse-failure',
        policyId: 'polaris-butlers-project-shape-secrets',
        policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd',
      },
      unknown: { failureState: 'secretMatchedOrUnclassifiable', degradationState: 'Excluded content', unknownReason: 'excluded-content' },
    });
  });
});

describe('PWB-REQ-006 (amended) — phase-A seeds use the same context-aware guard', () => {
  const detectors = compileDetectors(PWB_SECRET_POLICY);

  it('markup only inside closed code contexts keeps a seed safe', () => {
    expect(classifyPhaseASeed(detectors, '# Index\n\n```\n<script>x</script>\n```\n\n- [a](a.md) and `<br>`\n')).toEqual({ kind: 'safe' });
  });

  it('the same markup outside a context, or a malformed context, excludes the seed', () => {
    expect(classifyPhaseASeed(detectors, '# Index\n\n<script>x</script>\n')).toEqual({ kind: 'excluded', reason: 'active-content', detail: '2' });
    expect(classifyPhaseASeed(detectors, '# Index\n\n```\nnever closed\n')).toEqual({ kind: 'excluded', reason: 'active-content', detail: '1' });
  });

  // syzygy-bpyt.16 (ruled on syzygy-bpyt.1.14): a CRLF or CR seed gets the decision its LF form gets. The first text was admitted under
  // CRLF and CR before the fix (a backtick opener with a backtick in its info text hides a script element as an inline span), the
  // second excluded (a tilde fence the mask did not recognize, leaving the script element it holds in the open).
  it.each([['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']])('%s: a seed is excluded or kept safe as its LF form is', (_name, end) => {
    const failOpen = ['# Index', '', '```a`b', '<script>x</script>', '```', ''].join(end);
    const benign = ['# Index', '', '~~~', '<script>x</script>', '~~~', '', '- [a](a.md)', ''].join(end);
    expect(classifyPhaseASeed(detectors, failOpen)).toEqual({ kind: 'excluded', reason: 'active-content', detail: '1' });
    expect(classifyPhaseASeed(detectors, benign)).toEqual({ kind: 'safe' });
  });

  it('a secret inside a code context is still a secret: detectors see the raw text', () => {
    expect(classifyPhaseASeed(detectors, `\`\`\`\n${SECRETS.awsKey}\n\`\`\`\n`)).toEqual({ kind: 'excluded', reason: 'secret-matched', detail: 'known-token-formats' });
    expect(classifyPhaseASeed(detectors, `see \`${SECRETS.url}\`\n`)).toEqual({ kind: 'excluded', reason: 'secret-matched', detail: 'credential-bearing-url' });
  });
});

describe('PWB-REQ-003 — the policy is the input', () => {
  it('a policy with different detectors and version screens differently and names its own version', () => {
    const custom: SecretClassificationPolicy = {
      ...PWB_SECRET_POLICY,
      policyVersion: '9.9.9-test',
      detectors: [{ id: 'honesty-word', kind: 'literal-fragment', values: ['honesty'] }],
    };
    const { result } = population(custom);
    const byPath = new Map(result.results.map((r) => [r.record.path, r.record]));
    expect(byPath.get('about/heart-and-soul/principles.md')).toMatchObject({ outcome: 'excluded', exclusion: { detectorId: 'honesty-word', policyVersion: '9.9.9-test' } });
    expect(byPath.get('secrets/private-key.md')?.outcome).toBe('classified');
    expect(result.policyVersion).toBe('9.9.9-test');
    expect(result.results).toHaveLength(POPULATION.length);
    assertNoSentinel(result);
  });

  it('a policy whose detectors cannot be compiled screens nothing: classification fails loudly', () => {
    const bad = (detectors: unknown): SecretClassificationPolicy => ({ ...PWB_SECRET_POLICY, detectors: detectors as SecretClassificationPolicy['detectors'] });
    expect(() => compileDetectors(bad([]))).toThrow(/no detectors/);
    expect(() => compileDetectors(bad([{ id: 'x', kind: 'regular-expression', pattern: '(', flags: 'g' }]))).toThrow(/does not compile/);
    expect(() => compileDetectors(bad([{ id: 'x', kind: 'other', values: ['a'] }]))).toThrow(/kind unknown/);
    expect(() => compileDetectors(bad([{ id: 'x', kind: 'literal-fragment', values: [] }]))).toThrow(/without values/);
    expect(() => compileDetectors(bad([{ id: '', kind: 'literal-fragment', values: ['a'] }]))).toThrow(/without an id/);
    expect(() => compileDetectors(bad([{ id: 'x', kind: 'literal-fragment', values: ['a'] }, { id: 'x', kind: 'literal-fragment', values: ['b'] }]))).toThrow(/repeated/);
    expect(() => compileDetectors(bad([{ id: 'x', kind: 'regular-expression', pattern: '', flags: 'g' }]))).toThrow(/malformed/);
    const r = reader();
    expect(() => classifyManifestSources({ sources: POPULATION }, r.reader, () => 0, bad([]))).toThrow(/no detectors/);
    expect(r.calls).toHaveLength(0);
  });

  it('PWB_SECRET_POLICY is byte-equal to the act-bound policy JSON', () => {
    const here = fileURLToPath(import.meta.url);
    const root = join(here, '..', '..', '..', '..');
    const policy = JSON.parse(readFileSync(join(root, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8')) as Record<string, unknown>;
    const admission = policy['sourceAdmission'] as Record<string, unknown>;
    const stable = (v: unknown): string => JSON.stringify(v);
    expect(PWB_SECRET_POLICY.policyId).toBe(policy['policyId']);
    expect(PWB_SECRET_POLICY.policyVersion).toBe(policy['policyVersion']);
    expect(stable(PWB_SECRET_POLICY.allowedTextEncodings)).toBe(stable(admission['allowedTextEncodings']));
    expect(stable(PWB_SECRET_POLICY.detectors)).toBe(stable(policy['detectors']));
    expect(stable(PWB_SECRET_POLICY.classificationOrder)).toBe(stable(policy['classificationOrder']));
    const match = policy['matchAction'] as Record<string, unknown>;
    expect(stable(PWB_SECRET_POLICY.matchAction)).toBe(stable({ redactionClass: match['redactionClass'], retainedFields: match['retainedFields'], retainBody: match['retainBody'] }));
    const unclassifiable = policy['unclassifiableExclusion'] as Record<string, unknown>;
    expect(stable(PWB_SECRET_POLICY.unclassifiableExclusion)).toBe(stable({ redactionClass: unclassifiable['redactionClass'], retainedFields: unclassifiable['retainedFields'], retainBody: unclassifiable['retainBody'] }));
    const classes = policy['redactionClasses'] as Record<string, unknown>;
    expect(stable(PWB_SECRET_POLICY.redactionClasses)).toBe(stable({ emitted: classes['emitted'], neverEmitted: classes['neverEmitted'] }));
    expect(policy['status']).toBe('candidate-amendment-no-effect-until-owner-act');
    const raw = policy['rawBodyHandling'] as Record<string, string>;
    expect(Object.values(raw).every((v) => v === 'never')).toBe(true);
  });

  it('exclusions carry only the policy-retained fields plus a closed detail word', () => {
    const { result } = population();
    for (const e of result.exclusions) {
      const keys = Object.keys(e).sort();
      const allowed = e.detectorId !== undefined ? ['contentDigest', 'detectorId', 'policyId', 'policyVersion', 'redactionClass', 'repositoryRelativePath'] : ['contentDigest', 'detail', 'exclusionReason', 'policyId', 'policyVersion', 'redactionClass', 'repositoryRelativePath'];
      for (const k of keys) expect(allowed, `${e.repositoryRelativePath}: ${k}`).toContain(k);
      expect(e.detectorId !== undefined || EXCLUSION_REASONS.includes(e.exclusionReason as (typeof EXCLUSION_REASONS)[number])).toBe(true);
      if (e.detail !== undefined) expect(e.detail).toMatch(/^(denied-(basename|prefix|suffix)|max[A-Za-z]+|\d+)$/);
    }
  });

  it('vocabularies are closed and hand-typed', () => {
    expect([...REDACTION_CLASSES]).toEqual(['excluded-artifact', 'redacted-span', 'unclassifiable-excluded']);
    expect([...EXCLUSION_REASONS]).toEqual(['denied-path', 'resource-limit', 'contains-nul', 'not-utf-8', 'active-content', 'unknown-extraction-class', 'parse-failure']);
    expect([...UNAVAILABLE_REASONS]).toEqual(['not-in-manifest', 'missing-at-revision', 'not-a-regular-blob', 'not-in-tree', 'path-escapes-repository', 'path-not-normalized', 'object-id-mismatch', 'git-read-failed']);
    const { result } = population();
    expect(JSON.stringify(result)).not.toContain('redacted-span');
  });
});

// ---------------------------------------------------------------------
// Phase B classification charges the same ledger (registry amendment
// 2026-09-05; PWB-REQ-006 as amended): each policy detector is one
// registry pass, repeated after phase A and charged again.

describe('PWB-REQ-006 (amended) — classification charges one shared resource ledger', () => {
  const policy = PWB_SECRET_POLICY;
  const detectors = compileDetectors(policy);
  const PATH = 'about/heart-and-soul/principles.md';

  function classified(limits: Partial<PwbResourceLimits>) {
    const ledger = createResourceLedger({ ...PWB_RESOURCE_LIMITS, ...limits });
    const spy = gitSpy();
    const r = createExactObjectReader({ runGit: spy.runGit, tree: indexGitTree(TREE), ledger });
    const consumed: string[] = [];
    const result = classifyManifestSources({ sources: POPULATION }, r, (s, text) => {
      consumed.push(s.path);
      return text.length;
    }, policy, undefined, ledger);
    return { result, consumed, ledger };
  }

  it('detectSecretsCharged charges each detector under its registry identity', () => {
    const charged: ParsePassIdentity[] = [];
    detectSecretsCharged(detectors, '# plain\n', (pass) => {
      charged.push(pass);
      return undefined;
    });
    expect(charged).toEqual(['secret-private-key-fragments', 'secret-known-token-formats', 'secret-credential-assignment', 'secret-credential-bearing-url']);
  });

  it('a read source costs four reader passes plus four detector passes', () => {
    const { result, consumed, ledger } = classified({});
    expect(consumed).toContain(PATH);
    expect(ledger.passesFor(PATH)).toBe(8);
    const summary = ledger.summary();
    // Every body the reader handed over was scanned by all four detectors:
    // the consumed ones and the ones a detector then excluded.
    const scanned = result.counts.classified + result.exclusions.filter((e) => e.detectorId !== undefined).length;
    expect(scanned).toBeGreaterThan(consumed.length);
    for (const pass of ['secret-private-key-fragments', 'secret-known-token-formats', 'secret-credential-assignment', 'secret-credential-bearing-url'] as const) {
      expect(summary.passesByIdentity[pass], pass).toBe(scanned);
    }
    expect(result.exclusions.filter((e) => e.exclusionReason === 'resource-limit')).toEqual([]);
  });

  it('maxParsePassesPerSource 7 excludes every read source as resource-limit before consume; 8 classifies them', () => {
    const under = classified({ maxParsePassesPerSource: 7 });
    expect(under.consumed).toEqual([]);
    expect(under.result.counts.classified).toBe(0);
    expect(under.result.results).toHaveLength(POPULATION.length);
    const excluded = under.result.exclusions.filter((e) => e.exclusionReason === 'resource-limit');
    expect(excluded.map((e) => e.repositoryRelativePath)).toContain(PATH);
    for (const e of excluded) expect(e).toMatchObject({ redactionClass: 'unclassifiable-excluded', detail: 'maxParsePassesPerSource', policyId: 'polaris-butlers-project-shape-secrets' });
    expect(under.ledger.breaches.filter((b) => b.limit === 'maxParsePassesPerSource').map((b) => b.observed)).toEqual(Array(excluded.length).fill(8));
    const at = classified({ maxParsePassesPerSource: 8 });
    expect(at.consumed).toContain(PATH);
    expect(at.result.exclusions.filter((e) => e.exclusionReason === 'resource-limit')).toEqual([]);
  });

  it('classifySource turns the budget breach into an excluded resource-limit record without the body', () => {
    const input = { policy, detectors, manifest: { sources: POPULATION } };
    const member = POPULATION.find((s) => s.path === PATH) as ManifestSource;
    const record: ObjectReadRecord = { path: PATH, objectId: oidOf(PATH), outcome: 'read', bytes: 3, contentDigest: `sha256:${sha256Hex(BYTES[PATH] as Uint8Array)}` };
    const breach = { limit: 'maxParsePassesPerSource' as const, declared: 1, observed: 2, path: PATH };
    const result = classifySource(input, member, record, 'SECRET-BODY', () => breach);
    expect(result.kind).toBe('withheld');
    expect(result.record).toMatchObject({ outcome: 'excluded', exclusion: { exclusionReason: 'resource-limit', detail: 'maxParsePassesPerSource', repositoryRelativePath: PATH } });
    expect(JSON.stringify(result)).not.toContain('SECRET-BODY');
  });

  it('classifyPhaseASeed reports over-limit when the budget runs out at the first active-content pass, after all four detectors', () => {
    const breach = { limit: 'maxParsePassesPerSource' as const, declared: 4, observed: 5, path: 'about/README.md' };
    const charged: ParsePassIdentity[] = [];
    const result = classifyPhaseASeed(detectors, '# root\n', (pass) => {
      charged.push(pass);
      return pass === 'markdown-code-context-mask' ? breach : undefined;
    });
    expect(result).toEqual({ kind: 'over-limit', breach });
    expect(charged).toEqual(['secret-private-key-fragments', 'secret-known-token-formats', 'secret-credential-assignment', 'secret-credential-bearing-url', 'markdown-code-context-mask']);
  });

  it('classifyPhaseASeed reports over-limit with the breach when a detector pass exceeds the budget', () => {
    const breach = { limit: 'maxParsePassesPerSource' as const, declared: 5, observed: 6, path: 'about/README.md' };
    let calls = 0;
    const result = classifyPhaseASeed(detectors, '# root\n', (pass) => {
      calls += 1;
      return calls === 2 && pass === 'secret-known-token-formats' ? breach : undefined;
    });
    expect(result).toEqual({ kind: 'over-limit', breach });
    // The detector the spent pass would have paid for never ran.
    expect(calls).toBe(2);
  });
});
