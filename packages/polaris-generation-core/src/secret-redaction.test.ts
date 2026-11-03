import { execFile } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';

import { beforeAll, describe, expect, it, vi } from 'vitest';

import { bodyLines, compileEveryOffsetMatcher, readSecretRedaction, redactBody, retainedWithMarkers, spanTouchesWithheld, type RedactionDetector, type SecretRedaction } from './secret-redaction.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const POLICY_PATH = '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json';

interface BuilderFixtures {
  readonly body: readonly { readonly name: string; readonly body: string; readonly expected: readonly number[] | null; readonly oracle: readonly number[] | null }[];
  readonly whole: readonly { readonly name: string; readonly path: string; readonly body: string; readonly oracle: readonly number[] | null }[];
}

/** The version-4 builder's own body and whole-file fixtures, each with its stated expectation and the builder's reference oracle
 * (`withheld_lines`) run over the policy on disk: the impact ledger requires the builder's fixtures to run through the TypeScript screens,
 * because the oracle runs the patterns in Python `re`. */
async function builderFixtures(): Promise<BuilderFixtures> {
  const py = `import json, sys; sys.path.insert(0, 'scripts'); import build_public_source_screening_scope_v4 as b
policy = open(str(b.ROOT / b.POLICY)).read()
srt = lambda s: None if s is None else sorted(s)
print(json.dumps({'body': [{'name': n, 'body': body, 'expected': srt(w), 'oracle': srt(b.withheld_lines(body, policy))} for n, body, w in b.BODY_FIXTURES],
  'whole': [{'name': n, 'path': p, 'body': body, 'oracle': srt(b.withheld_lines(body, policy, p))} for n, p, body in b.WHOLE_FIXTURES]}))`;
  // Run without blocking the worker: a synchronous python3 child is not a short local tool (sync-child-process-guard.test.ts).
  const run = await promisify(execFile)('python3', ['-c', py], { cwd: ROOT, encoding: 'utf8', maxBuffer: 16 * 1024 * 1024 });
  return JSON.parse(run.stdout) as BuilderFixtures;
}

const policyDoc = (): Record<string, unknown> => JSON.parse(readFileSync(`${ROOT}${POLICY_PATH}`, 'utf8')) as Record<string, unknown>;
const scopeOf = (doc: Record<string, unknown>): Record<string, unknown> => doc['publicSourceScope'] as Record<string, unknown>;
// The detectors this scope runs: the policy's, then (version 5) the scope's own, which wholeArtifactDetectors may name.
const detectorsOf = (doc: Record<string, unknown>): RedactionDetector[] => [...doc['detectors'] as RedactionDetector[],
  ...((scopeOf(doc)['scopeDetectors'] as { detectors?: RedactionDetector[] } | undefined)?.detectors ?? [])];
const idsOf = (doc: Record<string, unknown>): string[] => detectorsOf(doc).map(d => d.id);
const TOKEN = 'tok' + 'en=' + 'abcdefgh12345678';

describe('secretRedaction (policy version 4): the builder fixtures through the TypeScript reading', () => {
  let fixtures: BuilderFixtures;
  let redaction: SecretRedaction;
  let matcher: ReturnType<typeof compileEveryOffsetMatcher>;
  beforeAll(async () => {
    fixtures = await builderFixtures();
    const doc = policyDoc();
    const read = readSecretRedaction(scopeOf(doc), idsOf(doc));
    if (!read.ok || read.redaction === null) throw new Error('the policy on disk declares no readable secretRedaction');
    redaction = read.redaction;
    matcher = compileEveryOffsetMatcher(detectorsOf(doc));
  });

  it('reads the parameters of the approved bytes', () => {
    expect(redaction.redactedClasses).toEqual(['project-documentation']);
    expect(redaction.wholeArtifactDetectors).toEqual(['private-key-material', 'known-token-formats', 'private-key-header', 'known-token-formats-extended']);
    expect(redaction.wholeArtifactFragments).toEqual(['-----BEGIN ', '---- BEGIN ', 'LS0tLS1CRUdJT', 'LS0tLSBCRUdJT']);
    expect(redaction.guardLines).toBe(1);
  });

  it('holds sixteen body fixtures and three whole-file fixtures, and the oracle agrees with each stated expectation', () => {
    expect(fixtures.body).toHaveLength(16);
    expect(fixtures.whole).toHaveLength(3);
    for (const fixture of fixtures.body) expect(fixture.oracle, fixture.name).toEqual(fixture.expected);
    for (const fixture of fixtures.whole) expect(fixture.oracle, fixture.name).toBeNull();
  });

  it('withholds exactly the oracle\'s lines for every body fixture, as project documentation', () => {
    for (const fixture of fixtures.body) {
      const got = redactBody(fixture.body, 'project-documentation', matcher, redaction);
      const withheld = got.kind === 'redacted' ? got.withheld : got.kind === 'clean' ? [] : null;
      expect(withheld, fixture.name).toEqual(fixture.expected);
    }
  });

  it('excludes every whole-file fixture whole: code content, an unclassified path and a nested README', () => {
    const classes = { 'src/config.py': 'code-content', 'redis.conf': undefined, 'src/README.md': undefined } as const;
    for (const fixture of fixtures.whole) {
      expect(redactBody(fixture.body, classes[fixture.path as keyof typeof classes], matcher, redaction).kind, fixture.name).toBe('excluded');
    }
  });

  it('keeps every non-withheld line byte for byte and empties each withheld line, keeping its terminator', () => {
    const body = `a\r\nb\r\nc ${TOKEN}\r\nd\r\ne\r\n`;
    const got = redactBody(body, 'project-documentation', matcher, redaction);
    expect(got).toEqual({ kind: 'redacted', withheld: [2, 3, 4], retained: 'a\r\n\r\n\r\n\r\ne\r\n',
      retainedLines: ['a\r\n', '\r\n', '\r\n', '\r\n', 'e\r\n'], lineByteOffsets: [0, 3, 6, 32, 35], originalBytes: 38, contentSha256: 'ac3d3a121c857077ab58a87128795ec4624ecef4db4472d6a9e36579930d8f21', detectorIds: ['credential-assignment'] });
    expect(bodyLines(got.kind === 'redacted' ? got.retained : '')).toHaveLength(bodyLines(body).length);
    const mixed = redactBody(`a\rg\n${TOKEN}\nh\nvisible\nlast\n`, 'project-documentation', matcher, redaction);
    expect(mixed.kind).toBe('redacted');
    if (mixed.kind !== 'redacted') throw new Error('expected retained mixed-ending body');
    expect(mixed.retainedLines).toEqual(['a\r', '\n', '\n', '\n', 'visible\n', 'last\n']);
    expect(mixed.lineByteOffsets).toEqual([0, 2, 4, 27, 29, 37]);
    expect(mixed.originalBytes).toBe(42);
    expect(retainedWithMarkers(mixed.retainedLines, mixed.withheld)).toBe('a\r[redacted-span: 3 withheld line(s) in this file]\nvisible\nlast\n');
  });

  it.each([
    ['overlapping long matches', 'token='.repeat(4_000)],
    ['too many short matches', 'token=abcdefgh\n'.repeat(10_001)],
  ])('bounds matching work and fails closed for %s', (_name, body) => {
    expect(redactBody(body, 'project-documentation', matcher, redaction)).toEqual({ kind: 'excluded', cause: 'match-limit' });
    // A class that cannot redact needs only the ordinary detector check, never the every-offset pass.
    expect(redactBody(body, 'code-content', matcher, redaction)).toEqual({ kind: 'excluded', cause: 'class-not-redacted' });
  });

  it('bounds failed URL searches in the overlap scan and retained-text first search without invoking the quadratic expression', () => {
    const suffix = 'https://' + 'a:'.repeat(32_000) + 'end\n';
    const body = 'token=abcdefgh\nsafe\nsafe\n' + suffix;
    const riskyPattern = new RegExp(String.raw`https?://[^/@\s]+:[^/@\s]+@`, 'i').source;
    const native = vi.spyOn(RegExp.prototype, 'exec');
    try {
      expect(matcher.all(body, 10_000)).toEqual({ matches: [{ detectorId: 'credential-assignment', start: 0, end: 14 }], limited: false });
      expect(matcher.first(suffix)).toBeUndefined();
      expect(redactBody(body, 'project-documentation', matcher, redaction).kind).toBe('redacted');
      expect(native.mock.contexts.filter(re => (re as RegExp).source === riskyPattern)).toHaveLength(0);
    } finally { native.mockRestore(); }
    // Literal match coordinates independently cover prefix case, multiple colons, and rejected empty user/password or / boundaries.
    const urls = compileEveryOffsetMatcher([{ id: 'different-id', kind: 'regular-expression', pattern: String.raw`https?://[^/@\s]+:[^/@\s]+@`, flags: 'gi' }]);
    expect(urls.all('HTTP://a:b:c@ https://:b@ https://a:@ https://a/b:c@ https://a::@', 10)).toEqual({
      matches: [{ detectorId: 'different-id', start: 0, end: 13 }, { detectorId: 'different-id', start: 53, end: 65 }], limited: false });
  });

  it('preserves the pinned URL regex semantics on bounded native-oracle fixtures, including nested prefixes and flags', () => {
    const pattern = String.raw`https?://[^/@\s]+:[^/@\s]+@`;
    const match = compileEveryOffsetMatcher([{ id: 'url', kind: 'regular-expression', pattern, flags: 'gi' }]);
    const bodies = ['https://a:http://b:c@', 'http://a:b@http://x:y@', 'https://a:b:c@', 'HTTP://a:b@', 'http://a:b\u00a0@'];
    for (let n = 0; n < 1_024; n++) {
      let value = n, authority = '';
      for (let k = 0; k < 5; k++) { authority += ['a', ':', '@', '/'][value % 4]; value = Math.floor(value / 4); }
      bodies.push('http://' + authority + ' tail');
    }
    for (const body of bodies) {
      const expected = [...body.matchAll(new RegExp(pattern, 'gi'))].map(hit => ({ detectorId: 'url', start: hit.index, end: hit.index + hit[0].length }));
      expect(match.all(body, 100), body).toEqual({ matches: expected, limited: false });
      expect(match.first(body), body).toEqual(expected[0]);
      expect(match.first(body), `repeat: ${body}`).toEqual(expected[0]);
      expect(match.all(body, 100), `after first: ${body}`).toEqual({ matches: expected, limited: false });
    }
    expect(compileEveryOffsetMatcher([{ id: 'credential-bearing-url', kind: 'regular-expression', pattern, flags: 'g' }]).first('HTTP://a:b@')).toBeUndefined();
    expect(compileEveryOffsetMatcher([{ id: 'credential-bearing-url', kind: 'regular-expression', pattern: 'http://only', flags: 'gi' }]).first('http://only')).toEqual({ detectorId: 'credential-bearing-url', start: 0, end: 11 });
  });

  it('applies the line pattern to each line, not to the body: a six-dash header on line 3 excludes the body (round-4 note 5)', () => {
    // Neither fragment is present ("------BEGIN-" has no space after BEGIN), so only a per-line reading of the pattern catches it.
    const body = `[b](https://x/y?${TOKEN})\n\n------BEGIN-KEY\nAAAA\n`;
    expect(redaction.wholeArtifactFragments.some(fragment => body.includes(fragment))).toBe(false);
    expect(redactBody(body, 'project-documentation', matcher, redaction)).toEqual({ kind: 'excluded', cause: 'key-header-line' });
  });

  it('compares each fragment anywhere in the body, mid-line included (round-4 note 5)', () => {
    const body = `[b](https://x/y?${TOKEN})\n\nsee "x-----BEGIN EC KEY" here\n`;
    expect(redactBody(body, 'project-documentation', matcher, redaction)).toEqual({ kind: 'excluded', cause: 'key-header-fragment' });
  });

  it('admits a body no detector matches unredacted, whatever it holds', () => {
    expect(redactBody('-----BEGIN CERTIFICATE-----\nMIIB\n', 'project-documentation', matcher, redaction)).toEqual({ kind: 'clean' });
  });

  it('excludes every matching body whole when the scope declares no redaction (versions 1 to 3)', () => {
    expect(redactBody(`a\n${TOKEN}\nb\n`, 'project-documentation', matcher, null)).toEqual({ kind: 'excluded', cause: 'no-redaction-rule' });
  });

  it('marks one marker per run of withheld lines, naming the total', () => {
    expect(retainedWithMarkers(['a\n', '\n', '\n', 'd\n', '\n'], [2, 3, 5])).toBe('a\n[redacted-span: 3 withheld line(s) in this file]\nd\n[redacted-span: 3 withheld line(s) in this file]\n');
    expect(spanTouchesWithheld([2, 3], 3, 9)).toBe(true);
    expect(spanTouchesWithheld([2, 3], 4, 9)).toBe(false);
    expect(spanTouchesWithheld([2, 3], 1, 1)).toBe(false);
  });
});

describe('readSecretRedaction refuses what it does not implement', () => {
  const read = (mutate: (red: Record<string, unknown>) => void) => {
    const doc = policyDoc();
    const red = structuredClone(scopeOf(doc)['secretRedaction']) as Record<string, unknown>;
    mutate(red);
    return readSecretRedaction({ ...scopeOf(doc), secretRedaction: red }, idsOf(doc));
  };
  it('reads null for a scope without the object', () => {
    expect(readSecretRedaction({ activeContent: {} }, ['a'])).toEqual({ ok: true, redaction: null });
  });
  // The object test in @syzygy/support decides at both reads (syzygy-bpyt.6.3 stack 4): a scope that is not an object declares nothing, and
  // a declaration that is not an object is refused in its own words. An array that carries the field by name is still an array.
  const validRedaction = (): Record<string, unknown> => structuredClone(scopeOf(policyDoc())['secretRedaction']) as Record<string, unknown>;
  it.each<[string, () => unknown]>([
    ['null', () => null],
    ['undefined', () => undefined],
    ['a string', () => 'x'],
    ['a number', () => 1],
    ['an array', () => []],
    ['an array that carries the field', () => Object.assign([], { secretRedaction: validRedaction() })],
  ])('reads null for a scope that is %s', (_name, scope) => {
    expect(readSecretRedaction(scope(), ['a'])).toEqual({ ok: true, redaction: null });
  });
  it.each<[string, () => unknown]>([
    ['an array', () => []],
    ['null', () => null],
    ['a string', () => 'x'],
    ['a number', () => 1],
    ['an array that carries every field', () => Object.assign([], validRedaction())],
    ['a function that carries every field', () => Object.assign(() => 1, validRedaction())],
  ])('refuses a declaration that is %s', (_name, declaration) => {
    expect(readSecretRedaction({ secretRedaction: declaration() }, ['a'])).toEqual({ ok: false, why: 'its secret redaction is not an object' });
  });
  it.each<[string, (red: Record<string, unknown>) => void]>([
    ['an edited rule text', red => { red['rule'] = `${String(red['rule'])} `; }],
    ['an edited cited-span rule', red => { red['citedSpanRule'] = 'a span shows its surviving lines'; }],
    ['another line pattern', red => { red['wholeArtifactLinePattern'] = '^-----BEGIN '; }],
    ['an extra field', red => { red['extra'] = 1; }],
    ['a missing field', red => { delete red['guardLines']; }],
    ['another redaction class', red => { red['redactionClass'] = 'excluded-artifact'; }],
    ['an unknown redacted class', red => { red['redactedClasses'] = ['governance-text']; }],
    ['a whole-artifact detector naming no detector', red => { red['wholeArtifactDetectors'] = ['no-such-detector']; }],
    ['an empty fragment list', red => { red['wholeArtifactFragments'] = []; }],
    ['a zero guard', red => { red['guardLines'] = 0; }],
    ['a fractional guard', red => { red['guardLines'] = 1.5; }],
  ])('refuses %s', (_name, mutate) => {
    expect(read(mutate).ok).toBe(false);
  });
});
