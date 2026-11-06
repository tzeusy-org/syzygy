import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { POLICY_PATH } from '@syzygy/polaris-generation-consent';
import { loadRecorderForms, renderPolicyAct } from '@syzygy/polaris-generation-consent/testing';
import { readProjectDocumentationRule, readScopeDetectors, readSecretRedaction } from '@syzygy/polaris-generation-core/live';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDossierScreen, loadDossierScreen, screenLoaderOf, type DossierScreen } from './screen.js';

// The recorder forms render once, before the file collects its tests.
await loadRecorderForms();

// syzygy-n5jm: the install of screening scope version 6, variant p (owner act of 2026-11-05,
// decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V6-ACT.md): redis.conf placed in project-documentation at the trial
// commit of repository:redis-redis, paired with the config-secret-directive scope detector. Both screens, the dossier's and the
// any-repo reader's, are built from the policy bytes the act binds (the file in this checkout) and held to the version-6 builder's
// own fixtures and oracle (scripts/build_public_source_screening_scope_v6.py: CLASS_FIXTURES, COUNTEREXAMPLES, content_class, screen),
// as the impact ledger requires: each counterexample at its own repository and commit, again with its line ends rewritten to CRLF
// and to bare CR. The builder's oracle is Python `re`; the screens are JavaScript. The version-5 bytes are recovered through the
// builder's base_bytes (its patch reversed); the screens refuse them, so the builder's v5 column is held by its oracle alone.
// Every other expected value below is a literal written from the policy text.

const execFileAsync = promisify(execFile);
const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE_TEXT = fs.readFileSync(path.join(REAL_ROOT, POLICY_PATH), 'utf8');
const LIVE = JSON.parse(LIVE_TEXT);
const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);
const REDIS = 'repository:redis-redis';
const TRIAL = '498ecd0d6d007db11ddb3aea9428552598a78622';
// The other three revisions the Redis observation consent admits (public-repo-admission/instances/redis/params.json).
const OTHER_REDIS = ['d2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7', 'c9d29f6a918c335bc1778d9f68e521c1bbb36a0f', 'e91a340e241cf0abe3c6a0c254214fbe4aa1d95f'];
const AT_TRIAL = { repository: REDIS, commit: TRIAL };
const V6_VERSION = '1.7.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd.v6-p';
const V6_INSTANT = Date.parse('2026-11-05T09:43:08Z');

type Subject = { readonly repository: string; readonly commit: string } | null;
type AnyScreen = Pick<DossierScreen, 'screenPath' | 'contentClass' | 'screenBody' | 'screenTargetBody' | 'scopeDetectors'>;
const APP_SCREENING = path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/public-source-screening.ts');
const appScreen = async (policy: string, classAct: boolean, subject: Subject): Promise<AnyScreen> => {
  const app = await import(APP_SCREENING);
  const port = { read: async () => ({ actRecord: renderPolicyAct(sha(policy), '2026-10-04', '2026-10-04T10:00:00Z'), policy: encode(policy), classActInForce: classAct }) };
  return app.loadPublicSourceScreen(port, new Uint8Array(32).fill(7), subject);
};
const ours = (policy: string, classAct: boolean, subject: Subject): AnyScreen => {
  const built = buildDossierScreen(encode(policy), classAct, subject);
  if (!built.ok) throw new Error(built.why);
  return built.screen;
};
const both = async (policy: string = LIVE_TEXT, subject: Subject = AT_TRIAL, classAct = true): Promise<readonly [string, AnyScreen][]> =>
  [['dossier', ours(policy, classAct, subject)], ['app', await appScreen(policy, classAct, subject)]];
const refusalOf = (policy: string): string => { const built = buildDossierScreen(encode(policy), true, AT_TRIAL); return built.ok ? 'built' : built.why; };
const appRefusalOf = async (policy: string): Promise<string> => appScreen(policy, true, AT_TRIAL).then(() => 'built', (error: unknown) => (error as Error).message);

type Outcome = readonly unknown[];
const outcomeOf = (screen: AnyScreen, repositoryPath: string, body: string): Outcome => {
  const byPath = screen.screenPath(repositoryPath);
  if (byPath !== undefined) return ['excluded', byPath];
  const got = screen.screenTargetBody(body, repositoryPath);
  return got.kind === 'excluded' ? ['excluded', got.outcome] : got.kind === 'redacted' ? ['redacted', [...got.withheld].sort((a, b) => a - b)] : ['admitted'];
};

interface Fixtures {
  readonly classes: { path: string; repository: string; commit: string; want: string | null; v5: string | null; oracle: string | null; oracle5: string | null }[];
  readonly counter: { name: string; path: string; repository: string; commit: string; body: string; want: Outcome; v5: Outcome; oracle: Outcome; oracle5: Outcome;
    ends: { ending: string; body: string; oracle: Outcome }[] }[];
  readonly v5: string;
  readonly unmatched: string;
}
let F: Fixtures;
beforeAll(async () => {
  const py = `import json, sys; sys.path.insert(0, 'scripts')
import build_public_source_screening_scope_v6 as b

policy = open(str(b.ROOT / b.POLICY)).read()
v5, mode = b.base_bytes()
assert mode == 'performed-v6' and b.propose(v5) == policy
enc = lambda o: [o[0], sorted(o[1])] if o[0] == 'redacted' else list(o)
ends = lambda p, body, r, c: [{'ending': e, 'body': body.replace('\\n', t), 'oracle': enc(b.screen(p, body.replace('\\n', t), policy, r, c))} for e, t in (('crlf', '\\r\\n'), ('cr', '\\r')) if '\\n' in body]
sys.stdout.write(json.dumps({
  'classes': [{'path': p, 'repository': r, 'commit': c, 'want': t['p'], 'v5': t['v5'], 'oracle': b.content_class(p, policy, r, c), 'oracle5': b.content_class(p, v5, r, c)} for p, r, c, t in b.CLASS_FIXTURES],
  'counter': [{'name': n, 'path': p, 'repository': b._at(n)[0], 'commit': b._at(n)[1], 'body': body, 'want': enc(t['p']), 'v5': enc(t['v5']),
               'oracle': enc(b.screen(p, body, policy, *b._at(n))), 'oracle5': enc(b.screen(p, body, v5, *b._at(n))), 'ends': ends(p, body, *b._at(n))} for n, p, body, _m, t in b.COUNTEREXAMPLES],
  'v5': v5, 'unmatched': b._UNMATCHED}))`;
  F = JSON.parse((await execFileAsync('python3', ['-c', py], { cwd: REAL_ROOT, maxBuffer: 16 * 1024 * 1024 })).stdout) as Fixtures;
});

describe('screening scope version 6: the builder fixtures through both screens', () => {
  it('holds the builder\'s populations, and its oracle agrees with each stated expectation in both columns', () => {
    expect([F.classes.length, F.counter.length]).toEqual([9, 42]);
    for (const fixture of F.classes) expect([fixture.oracle, fixture.oracle5], fixture.path).toEqual([fixture.want, fixture.v5]);
    for (const fixture of F.counter) expect([fixture.oracle, fixture.oracle5], fixture.name).toEqual([fixture.want, fixture.v5]);
  });

  it('classifies every class fixture at its own repository and commit as the builder states for p, in both screens', async () => {
    for (const fixture of F.classes) {
      for (const [name, screen] of await both(LIVE_TEXT, { repository: fixture.repository, commit: fixture.commit })) {
        expect(screen.contentClass(fixture.path) ?? null, `${name}: ${fixture.path} at ${fixture.repository}@${fixture.commit.slice(0, 8)}`).toBe(fixture.want);
      }
    }
    expect(new Set(F.classes.map((fixture) => fixture.want))).toEqual(new Set(['project-documentation', null]));
  });

  it('screens every counterexample at its own repository and commit as the builder states for p, in both screens', async () => {
    for (const fixture of F.counter) {
      for (const [name, screen] of await both(LIVE_TEXT, { repository: fixture.repository, commit: fixture.commit })) {
        expect(outcomeOf(screen, fixture.path, fixture.body), `${name}: ${fixture.name}`).toEqual(fixture.want);
      }
    }
    // The population reaches every outcome, including a code body withheld whole by the new detector alone.
    expect(new Set(F.counter.map((fixture) => fixture.want[0]))).toEqual(new Set(['admitted', 'redacted', 'excluded']));
    expect(F.counter.filter((fixture) => fixture.want[1] === 'secret-detector-match').map((fixture) => fixture.path)).toEqual(['tests/acl.tcl', 'tests/limits.tcl']);
  });

  it('numbers the withheld lines the same under CRLF and bare CR line ends, in both screens and the oracle', async () => {
    let rewritten = 0;
    for (const fixture of F.counter) {
      for (const end of fixture.ends) {
        rewritten += 1;
        expect(end.oracle, `oracle: ${fixture.name} (${end.ending})`).toEqual(fixture.want);
        for (const [name, screen] of await both(LIVE_TEXT, { repository: fixture.repository, commit: fixture.commit })) {
          expect(outcomeOf(screen, fixture.path, end.body), `${name}: ${fixture.name} (${end.ending})`).toEqual(fixture.want);
        }
      }
    }
    // Every counterexample body but the one already written with bare CRs carries LF, so each is rewritten twice.
    expect(rewritten).toBe(2 * (F.counter.length - 1));
  });

  it('refuses the version-5 bytes in both screens: their scope-detector consequence is not the text these screens implement', async () => {
    expect(refusalOf(F.v5)).toBe('the screening policy cannot be applied: its scope detectors consequence is not the text this screen implements');
    expect(await appRefusalOf(F.v5)).toContain('public-source-policy: policy scope detectors consequence is not the text this screen implements');
  });
});

describe('P: the redis.conf placement', () => {
  const PLACED = ['redis.conf', 'REDIS.CONF', 'Redis.Conf'];
  it('places redis.conf beside tls.md and modules/modules.md at the trial commit of repository:redis-redis', async () => {
    for (const [name, screen] of await both()) {
      expect([...PLACED, 'TLS.md', 'modules/MODULES.md'].map((p) => [screen.screenPath(p), screen.contentClass(p)]), name)
        .toEqual([...PLACED, 'TLS.md', 'modules/MODULES.md'].map(() => [undefined, 'project-documentation']));
      // Only the listed path: not a directory, a suffix or another .conf.
      expect(['src/redis.conf', 'redis.conf.md', 'redis.conf/x', 'sentinel.conf', 'xredis.conf', 'redis.conf.bak'].map((p) => screen.contentClass(p)), name)
        .toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    }
  });

  it.each<[string, Subject]>([
    ...OTHER_REDIS.map((commit): [string, Subject] => [`the admitted Redis revision ${commit.slice(0, 8)}`, { repository: REDIS, commit }]),
    ['another repository at the trial commit', { repository: 'repository:other', commit: TRIAL }],
    ['no subject', null],
  ])('places nothing for %s: redis.conf stays indeterminate', async (_name, subject) => {
    for (const [name, screen] of await both(LIVE_TEXT, subject)) expect(screen.screenPath('redis.conf'), name).toBe('unknown-extraction-class');
  });

  it('places nothing while the class act is not in force', async () => {
    for (const [name, screen] of await both(LIVE_TEXT, AT_TRIAL, false)) expect(screen.screenPath('redis.conf'), name).toBe('unknown-extraction-class');
  });

  it('reads the live placement entry with redis.conf appended', () => {
    const rules = LIVE.publicSourceScope.contentClassification.rules as Record<string, unknown>[];
    const extensions = rules.find((rule) => rule['class'] === 'code-content')!['sourceExtensions'] as string[];
    expect(readProjectDocumentationRule(rules, extensions)).toMatchObject({ ok: true, rule: { ownerPlacements: [{ repository: REDIS, commits: [TRIAL], paths: ['tls.md', 'modules/modules.md', 'redis.conf'] }] } });
  });
});

describe('P: the config-secret-directive scope detector', () => {
  const ids = LIVE.detectors.map((d: { id: string }) => d.id) as string[];
  it('reads four scope detectors, the fourth config-secret-directive with flags gi, and declares four in both screens', async () => {
    const read = readScopeDetectors(LIVE.publicSourceScope, ids);
    expect(read.ok && read.detectors.map((d) => d.id)).toEqual(['private-key-header', 'credential-url-any-scheme', 'known-token-formats-extended', 'config-secret-directive']);
    expect(read.ok && read.detectors[3]).toMatchObject({ kind: 'regular-expression', flags: 'gi' });
    for (const [name, screen] of await both()) expect(screen.scopeDetectors, name).toBe(4);
  });

  it('is line-redactable: secretRedaction names it in no whole-artifact list', () => {
    const allIds = [...ids, ...LIVE.publicSourceScope.scopeDetectors.detectors.map((d: { id: string }) => d.id)];
    const read = readSecretRedaction(LIVE.publicSourceScope, allIds);
    expect(read.ok && read.redaction !== null && read.redaction.wholeArtifactDetectors).toEqual(['private-key-material', 'known-token-formats', 'private-key-header', 'known-token-formats-extended']);
  });

  // render.ts and close.ts screen agent-written prose through screenBody, which runs every scope detector over the whole text.
  it('refuses agent text quoting a line that opens with a password directive, and passes one that names it mid-line', async () => {
    for (const [name, screen] of await both()) {
      expect(screen.screenBody(`The sample config reads:\nrequirepass ${F.unmatched}\n`), name).toBe('secret-detector-match');
      expect(screen.screenBody(`The sample config reads:\n# masterauth ${F.unmatched}\n`), name).toBe('secret-detector-match');
      expect(screen.screenBody(`At run time it calls CONFIG SET requirepass ${F.unmatched}.\n`), name).toBeUndefined();
    }
  });

  // The builder's adversarial lines (linear_time_findings), at its node length: every-offset matching stays linear in the shipped
  // matcher, through both the redaction scan (screenTargetBody) and the whole-text scan (screenBody).
  it.each([
    ['blanks', ' '.repeat(80_000)], ['hashes', '#'.repeat(80_000)], ['hash-blank', '# '.repeat(40_000)], ['acl', `user ${'a '.repeat(40_000)}`],
    ['tabs', '\t'.repeat(80_000)], ['vertical tabs', '\v'.repeat(80_000)], ['hash-vt', '#\v'.repeat(40_000)], ['quotes', '"'.repeat(80_000)],
    ['acl hashes', `user ${' #'.repeat(40_000)}`], ['acl quotes', `user ${' "'.repeat(40_000)}`], ['acl near-hash', `user ${` #${'a'.repeat(63)}`.repeat(1_200)}`],
    ['quoted acl bangs', `"user" ${' !'.repeat(40_000)}`], ['quoted acl near-bang', `'user' ${` !${'a'.repeat(63)}`.repeat(1_200)}`],
  ])('scans a long %s line in linear time in both screens', async (_name, line) => {
    const body = `# Redis configuration\n${line}\nport 6379\n`;
    for (const [name, screen] of await both()) {
      const started = performance.now();
      screen.screenTargetBody(body, 'redis.conf');
      screen.screenBody(body);
      expect(performance.now() - started, name).toBeLessThan(1_500);
    }
  });
});

// The any-repo reader's checkout port reads the act chain this install extended, so both loaders put the version-6 bytes in force from
// this checkout at a time after the act, and neither before it (the version-5 act then in force binds other bytes).
describe('the real checkout after the version-6 act', () => {
  const AFTER = Date.UTC(2026, 10, 5, 12, 0, 0);
  it('loads the version-6 policy in both loaders', async () => {
    const app = await import(APP_SCREENING);
    const theirs = await app.loadPublicSourceScreen(app.checkoutPolicyActPort(REAL_ROOT, () => AFTER), new Uint8Array(32).fill(7), AT_TRIAL);
    const loaded = await loadDossierScreen(REAL_ROOT, AFTER, undefined, AT_TRIAL);
    if (!loaded.ok) throw new Error(loaded.why);
    for (const screen of [loaded.screen, theirs]) {
      expect([screen.policyVersion, screen.policySha256]).toEqual([V6_VERSION, 'c44058c02c244e8460c1e33ab01f0343ed0612043d7bf53e0d36410c9f9ebfa2']);
      expect([screen.governanceText, screen.documentationExemption, screen.scopeDetectors, screen.contentClass('redis.conf')]).toEqual([true, true, 4, 'project-documentation']);
    }
  });
  it('refuses the checkout\'s bytes before the version-6 act\'s instant', async () => {
    const loaded = await loadDossierScreen(REAL_ROOT, V6_INSTANT - 1_000, undefined, AT_TRIAL);
    expect(loaded.ok).toBe(false);
    const own = screenLoaderOf(undefined, REAL_ROOT, V6_INSTANT);
    const at = await own(AT_TRIAL);
    expect(at.ok && [at.screen.policyVersion, at.screen.contentClass('redis.conf')]).toEqual([V6_VERSION, 'project-documentation']);
  });
});
