import { execFile } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { POLICY_PATH } from '@syzygy/polaris-generation-consent';
import { loadRecorderForms, renderPolicyAct } from '@syzygy/polaris-generation-consent/testing';
import { readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule, readScopeDetectors, readSecretRedaction } from '@syzygy/polaris-generation-core/live';
import { beforeAll, describe, expect, it } from 'vitest';
import { unconsentedClass } from './class-gate.js';
import { buildDossierScreen, loadDossierScreen, placementSubjectOf, screenLoaderOf, type DossierScreen, type ScreenLoad } from './screen.js';

// The recorder forms render once, before the file collects its tests: some tables render at collection (syzygy-bpyt.4.8).
await loadRecorderForms();

// syzygy-mea.4 (P-116): the install of screening scope version 5, variant bcd (owner act of 2026-11-03,
// decisions/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V5-ACT.md). Both screens, the dossier's and the any-repo reader's,
// are built from the policy bytes the act binds (the file in this checkout) and held to the version-5 builder's own fixtures and oracle
// (scripts/build_public_source_screening_scope_v5.py: CLASS_FIXTURES, COUNTEREXAMPLES, content_class, screen), as the impact ledger
// requires; the version-4 bytes are recovered by reversing the bcd patch, so the same fixtures also pin the change. Every other expected
// value below is a literal written from the policy text.

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

type Subject = { readonly repository: string; readonly commit: string } | null;
type AnyScreen = Pick<DossierScreen, 'screenPath' | 'contentClass' | 'screenBody' | 'screenTargetBody' | 'governanceText' | 'documentationExemption' | 'scopeDetectors' | 'projectDocumentation'>;
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
const withScope = (over: (scope: Record<string, unknown>) => Record<string, unknown>): string => `${JSON.stringify({ ...LIVE, publicSourceScope: over(structuredClone(LIVE.publicSourceScope)) }, null, 2)}\n`;
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
  readonly classes: { path: string; repository: string; commit: string; want: string | null; oracle: string | null }[];
  readonly counter: { name: string; path: string; body: string; want: Outcome; v4: Outcome; oracle: Outcome }[];
  readonly v4Bodies: { name: string; body: string; want: Outcome; oracle: Outcome }[];
  readonly v4: string;
}
let F: Fixtures;
beforeAll(async () => {
  const py = `import json, sys; sys.path.insert(0, 'scripts')
import build_public_source_screening_scope_v5 as b, build_public_source_screening_scope_v4 as b4

policy = open(str(b.ROOT / b.POLICY)).read()
v4, mode = b.base_bytes()
assert mode == 'performed-v5' and b.propose(v4, 'bcd') == policy
enc = lambda o: [o[0], sorted(o[1])] if o[0] == 'redacted' else list(o)
w5 = lambda w: ['excluded', 'secret-detector-match'] if w is None else (['redacted', sorted(w)] if w else ['admitted'])
sys.stdout.write(json.dumps({
  'classes': [{'path': p, 'repository': r, 'commit': c, 'want': b._expected(t, 'bcd'), 'oracle': b.content_class(p, policy, r, c)} for p, r, c, t in b.CLASS_FIXTURES],
  'counter': [{'name': n, 'path': p, 'body': body, 'want': enc(b._expected(t, 'bcd')), 'v4': enc(b._expected(t, 'v4')), 'oracle': enc(b.screen(p, body, policy, b._R, b._C))} for n, p, body, _m, t in b.COUNTEREXAMPLES],
  'v4Bodies': [{'name': n, 'body': body, 'want': w5(w), 'oracle': enc(b.screen('README.md', body, policy))} for n, body, w in b4.BODY_FIXTURES],
  'v4': v4}))`;
  F = JSON.parse((await execFileAsync('python3', ['-c', py], { cwd: REAL_ROOT, maxBuffer: 16 * 1024 * 1024 })).stdout) as Fixtures;
});

describe('screening scope version 5: the builder fixtures through both screens', () => {
  it('holds the builder\'s populations, and its oracle agrees with each stated expectation', () => {
    expect([F.classes.length, F.counter.length, F.v4Bodies.length]).toEqual([24, 24, 16]);
    for (const fixture of F.classes) expect(fixture.oracle, fixture.path).toEqual(fixture.want);
    for (const fixture of F.counter) expect(fixture.oracle, fixture.name).toEqual(fixture.want);
    for (const fixture of F.v4Bodies) expect(fixture.oracle, fixture.name).toEqual(fixture.want);
  });

  it('classifies every class fixture at its own repository and commit as the builder states, in both screens', async () => {
    for (const fixture of F.classes) {
      for (const [name, screen] of await both(LIVE_TEXT, { repository: fixture.repository, commit: fixture.commit })) {
        expect(screen.contentClass(fixture.path) ?? null, `${name}: ${fixture.path} at ${fixture.repository}@${fixture.commit.slice(0, 8)}`).toBe(fixture.want);
      }
    }
    // The population reaches every class and none, so agreement is not agreement on one answer.
    expect(new Set(F.classes.map((fixture) => fixture.want))).toEqual(new Set(['governance-text', 'project-documentation', 'code-content', null]));
  });

  it('screens every counterexample at the trial commit as the builder states for bcd, in both screens', async () => {
    for (const [name, screen] of await both()) {
      for (const fixture of F.counter) expect(outcomeOf(screen, fixture.path, fixture.body), `${name}: ${fixture.name}`).toEqual(fixture.want);
    }
    expect(new Set(F.counter.map((fixture) => fixture.want[0]))).toEqual(new Set(['admitted', 'redacted', 'excluded']));
  });

  it('screens every counterexample under the version-4 bytes as the builder\'s v4 column states, in both screens', async () => {
    for (const [name, screen] of await both(F.v4)) {
      for (const fixture of F.counter) expect(outcomeOf(screen, fixture.path, fixture.body), `${name}: ${fixture.name}`).toEqual(fixture.v4);
    }
    // Version 5 changes the outcome of every counterexample but one ("README: quoted JSON password (no detector)").
    expect(F.counter.filter((fixture) => JSON.stringify(fixture.v4) === JSON.stringify(fixture.want)).map((fixture) => fixture.name)).toEqual(['README: quoted JSON password (no detector)']);
  });

  it('keeps every version-4 body fixture\'s answer as README.md under version 5, in both screens', async () => {
    for (const [name, screen] of await both()) {
      for (const fixture of F.v4Bodies) expect(outcomeOf(screen, 'README.md', fixture.body), `${name}: ${fixture.name}`).toEqual(fixture.want);
    }
  });
});

describe('T: the scope detectors', () => {
  const EC = ['-----BEGIN EC ', 'PRIVATE KEY-----'].join('');
  const PGP = ['-----BEGIN PGP ', 'PRIVATE KEY BLOCK-----'].join('');
  const PUTTY = ['PuTTY-User-', 'Key-File-3: ssh-ed25519'].join('');
  const ASIA = ['AS', 'IA'].join('') + 'QWERTYUIOPASDFGH';
  const PG = ['postgres', '://app:'].join('') + 'Hunter2Hunter2@db.internal/app';

  it('declares three scope detectors in both screens, and none under the version-4 bytes', async () => {
    for (const [name, screen] of await both()) expect(screen.scopeDetectors, name).toBe(3);
    for (const [name, screen] of await both(F.v4)) expect(screen.scopeDetectors, name).toBe(0);
  });

  // "every detector in this policy, and every detector in scopeDetectors, applies unchanged to every body under this scope"
  it.each([['an EC key header', EC], ['a PGP private key block', PGP], ['a PuTTY key file', PUTTY], ['an ASIA key id', ASIA], ['a postgres URL with a password', PG]])(
    'screens agent text carrying %s whole (screenBody), where the version-4 bytes passed it', async (_name, secret) => {
      const text = `The project states: "${secret}"\n`;
      for (const [name, screen] of await both()) expect(screen.screenBody(text), name).toBe('secret-detector-match');
      for (const [name, screen] of await both(F.v4)) expect(screen.screenBody(text), name).toBeUndefined();
    });

  // wholeArtifactDetectors: private-key-header and known-token-formats-extended keep a body whole; credential-url-any-scheme redacts.
  it('keeps a project-documentation body whole on a private-key-header or extended-token match, and redacts a URL match by line', async () => {
    for (const [name, screen] of await both()) {
      expect(screen.screenTargetBody(`# A\nb\n${PUTTY}\nd\ne\n`, 'README.md'), name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
      expect(screen.screenTargetBody(`# A\nb\nid = ${ASIA}\nd\ne\n`, 'README.md'), name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
      expect(screen.screenTargetBody(`# A\nb\nurl = ${PG}\nd\ne\n`, 'README.md'), name).toMatchObject({ kind: 'redacted', withheld: [2, 3, 4], detectorIds: ['credential-url-any-scheme'] });
      // Code content is never redacted: any match keeps it whole, the scope's detectors included.
      expect(screen.screenTargetBody(`int a;\nconst char *u = "${PG}";\n`, 'src/db.c'), name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    }
  });

  it('screens a path that carries a scope detector match as secret-detector-match', async () => {
    for (const [name, screen] of await both()) expect(screen.screenPath(`docs/${ASIA}.md`), name).toBe('secret-detector-match');
  });

  // Round 1, finding 3: credential-url-any-scheme runs as a native expression from every offset; its user part excludes ':' and its
  // scheme is bounded, so a long colon run, a long letter run and many scheme starts each stay linear. The quadratic form (a password
  // part that admits '/') takes seconds on the third input.
  it.each([
    ['a long colon run after one scheme', `a://${':'.repeat(64_000)}`],
    ['a long letter run before one scheme', `${'a'.repeat(64_000)}://u:${'p'.repeat(64_000)}`],
    ['many scheme starts with no @', 'a://:x'.repeat(12_000)],
    ['a long user and password run with no @', `x://${'u'.repeat(32_000)}:${'p:'.repeat(32_000)}`],
  ])('scans %s in linear time in both screens', async (_name, line) => {
    const body = `# A\n${line}\n`;
    for (const [name, screen] of await both()) {
      const started = performance.now();
      screen.screenTargetBody(body, 'README.md');
      screen.screenBody(body);
      expect(performance.now() - started, name).toBeLessThan(1_500);
    }
  });
});

describe('B: the governance-text class', () => {
  const NAMES = ['SECURITY', 'Security.md', 'security.rst', 'SECURITY.TXT', 'MANIFESTO', 'manifesto.md', 'Manifesto.rst', 'MANIFESTO.txt'];
  // "exactly one segment and, compared after the fold ... equals one of governanceTextPaths"
  it('classifies the eight folded root names as governance-text in both screens, with the class act in force or not', async () => {
    for (const classAct of [true, false]) {
      for (const [name, screen] of await both(LIVE_TEXT, null, classAct)) {
        expect(screen.governanceText, name).toBe(true);
        expect(NAMES.map((p) => [screen.screenPath(p), screen.contentClass(p)]), `${name}, class act ${classAct}`).toEqual(NAMES.map(() => [undefined, 'governance-text']));
      }
    }
  });

  it.each(['docs/SECURITY.md', '.github/SECURITY.md', '00-SECURITY.md', 'SECURITY.markdown', 'SECURITY.md.md', 'SECURITYmd', 'MANIFESTOS', 'security.html', '/SECURITY.md', 'SECURITY.md/'])(
    'leaves %s outside the class', async (repositoryPath) => {
      for (const [name, screen] of await both()) expect(screen.contentClass(repositoryPath), name).not.toBe('governance-text');
    });

  it('declares nothing under the version-4 bytes: a root SECURITY.md stays indeterminate', async () => {
    for (const [name, screen] of await both(F.v4)) {
      expect(screen.governanceText, name).toBe(false);
      expect(screen.screenPath('SECURITY.md'), name).toBe('unknown-extraction-class');
    }
  });

  // "returns undefined for a path two classes match": a fixture scope whose code-content extensions take .txt (and no
  // project-documentation rule, whose disjointness the overlap would break).
  it('leaves a path that governance-text and code-content both match indeterminate in both screens', async () => {
    const policy = withScope((scope) => {
      const classification = scope['contentClassification'] as Record<string, unknown>;
      return { ...scope, contentClassification: { ...classification, rules: [{ class: 'code-content', sourceExtensions: [...(classification['rules'] as Record<string, unknown>[]).find((rule) => rule['class'] === 'code-content')!['sourceExtensions'] as string[], '.txt'] }, ...(classification['rules'] as Record<string, unknown>[]).filter((rule) => rule['class'] === 'governance-text')] } };
    });
    for (const [name, screen] of await both(policy)) {
      expect(['SECURITY.txt', 'SECURITY.md', 'notes.txt'].map((p) => screen.contentClass(p)), name).toEqual([undefined, 'governance-text', 'code-content']);
      expect(screen.screenPath('SECURITY.txt'), name).toBe('unknown-extraction-class');
    }
  });

  // "such a body is data, never governing policy, is never redacted by line, and is scanned for active content as before"
  it('keeps a governance-text body whole on any detector match and scans it for active content', async () => {
    for (const [name, screen] of await both()) {
      expect(screen.screenTargetBody(`# Security\na\nb\n${['to', 'ken'].join('')}=${'abcdefgh12345678'}\nc\nd\ne\n`, 'SECURITY.md'), name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
      expect(screen.screenTargetBody('# Security\n<!-- note -->\n', 'SECURITY.md'), name).toEqual({ kind: 'excluded', outcome: 'active-content' });
      expect(screen.screenBody('# Security\n<!-- note -->\n', 'SECURITY.md'), name).toBe('active-content');
      expect(screen.screenTargetBody('# Security\nReport privately.\n', 'SECURITY.md'), name).toEqual({ kind: 'admitted' });
    }
  });

  it('refuses a redaction that names governance-text as a redacted class', () => {
    const scope = { ...LIVE.publicSourceScope, secretRedaction: { ...LIVE.publicSourceScope.secretRedaction, redactedClasses: ['project-documentation', 'governance-text'] } };
    expect(readSecretRedaction(scope, [...LIVE.detectors, ...LIVE.publicSourceScope.scopeDetectors.detectors].map((d: { id: string }) => d.id)))
      .toEqual({ ok: false, why: 'its secret redaction redactedClasses is not a non-empty list of distinct known classes' });
  });

  // class-gate.ts: with no statement every class but code-content is withheld; a statement admits the classes it lists.
  it('is withheld by the class gate unless the statement the run relies on lists it', () => {
    expect(unconsentedClass('governance-text', null)).toBe('governance-text');
    expect(unconsentedClass('governance-text', ['code-content', 'project-documentation'])).toBe('governance-text');
    expect(unconsentedClass('governance-text', ['code-content', 'project-documentation', 'governance-text'])).toBeUndefined();
  });

  const classification = (): Record<string, unknown> => structuredClone(LIVE.publicSourceScope.contentClassification);
  const ruleOf = (c: Record<string, unknown>): Record<string, unknown> => (c['rules'] as Record<string, unknown>[]).find((rule) => rule['class'] === 'governance-text')!;
  it('reads the live rule and its eight paths', () => {
    expect(readGovernanceTextRule(classification())).toEqual({ ok: true, paths: ['security', 'security.md', 'security.rst', 'security.txt', 'manifesto', 'manifesto.md', 'manifesto.rst', 'manifesto.txt'] });
    expect(readGovernanceTextRule({ rules: [] })).toEqual({ ok: true, paths: null });
    expect(readGovernanceTextRule({ rules: [], governanceTextPaths: [] })).toEqual({ ok: true, paths: null });
  });
  it.each<[string, (c: Record<string, unknown>) => void, string]>([
    ['another rule text', (c) => { ruleOf(c)['rule'] = `${ruleOf(c)['rule'] as string} `; }, 'text is not the text this screen implements'],
    ['an extra rule field', (c) => { ruleOf(c)['paths'] = []; }, 'text is not the text this screen implements'],
    ['a second rule', (c) => { (c['rules'] as unknown[]).push(ruleOf(c)); }, 'appears more than once'],
    ['no class listed', (c) => { c['classesClassified'] = (c['classesClassified'] as string[]).filter((entry) => entry !== 'governance-text'); }, 'names a class classesClassified does not list'],
    ['paths without the rule', (c) => { c['rules'] = (c['rules'] as Record<string, unknown>[]).filter((rule) => rule['class'] !== 'governance-text'); }, 'is absent, yet governanceTextPaths lists names'],
    ['an A-Z letter', (c) => { c['governanceTextPaths'] = ['SECURITY.md']; }, 'governanceTextPaths is unreadable'],
    ['a two-segment path', (c) => { c['governanceTextPaths'] = ['docs/security.md']; }, 'governanceTextPaths is unreadable'],
    ['a backslash', (c) => { c['governanceTextPaths'] = ['docs\\security.md']; }, 'governanceTextPaths is unreadable'],
    ['a dot name', (c) => { c['governanceTextPaths'] = ['..']; }, 'governanceTextPaths is unreadable'],
    ['an empty name', (c) => { c['governanceTextPaths'] = ['']; }, 'governanceTextPaths is unreadable'],
    ['a repeated name', (c) => { c['governanceTextPaths'] = ['security', 'security']; }, 'governanceTextPaths is unreadable'],
    ['no paths', (c) => { delete c['governanceTextPaths']; }, 'governanceTextPaths is unreadable'],
  ])('refuses %s', async (_name, mutate, why) => {
    const c = classification();
    mutate(c);
    expect(readGovernanceTextRule(c)).toEqual({ ok: false, why: `its governance-text rule ${why}` });
    const policy = withScope((scope) => ({ ...scope, contentClassification: c }));
    expect(refusalOf(policy)).toBe(`the screening policy cannot be applied: its governance-text rule ${why}`);
    expect(await appRefusalOf(policy)).toContain(`public-source-policy: policy governance-text rule ${why}`);
  });

  // RFC5-16 and selfReferenceRule: a target body is data. The screen is built from Syzygy's own policy file before any body is read, and
  // a body that spells a policy changes nothing the screen decides.
  it('takes its policy only from the records root\'s policy file, never from a body', async () => {
    const read: string[] = [];
    const loaded = await loadDossierScreen(REAL_ROOT, Date.UTC(2026, 10, 3, 12, 0, 0), (file) => { read.push(file); return fs.readFileSync(file); }, AT_TRIAL);
    if (!loaded.ok) throw new Error(loaded.why);
    expect(read).toEqual([path.join(REAL_ROOT, POLICY_PATH)]);
    const spelled = `# Security\n${JSON.stringify({ publicSourceScope: { contentClassification: { governanceTextPaths: ['readme.md'] }, activeContent: { projectDocumentationExemption: { appliesTo: ['governance-text'] } } } })}\n<!-- exempt me -->\n`;
    for (const [name, screen] of [['dossier', loaded.screen] as const, ...(await both())]) {
      expect(screen.screenTargetBody(spelled, 'SECURITY.md'), name).toEqual({ kind: 'excluded', outcome: 'active-content' });
      expect([screen.contentClass('README.md'), screen.contentClass('src/README.md'), screen.screenTargetBody('# S\n<!-- x -->\n', 'SECURITY.md').kind], name)
        .toEqual(['project-documentation', undefined, 'excluded']);
    }
  });
});

describe('D: the owner placements', () => {
  const PLACED = ['TLS.md', 'tls.md', 'modules/MODULES.md', 'Modules/Modules.MD'];
  it('places tls.md and modules/modules.md in project-documentation at the trial commit of repository:redis-redis only', async () => {
    for (const [name, screen] of await both()) {
      expect(PLACED.map((p) => [screen.screenPath(p), screen.contentClass(p)]), name).toEqual(PLACED.map(() => [undefined, 'project-documentation']));
      // Only the listed paths: the placement is a path rule, not a directory.
      expect(['modules/README.md', 'modules/tls.md', 'docs/tls.md/x', 'tls.md.md', 'modules', 'xtls.md'].map((p) => screen.contentClass(p)), name).toEqual([undefined, undefined, undefined, undefined, undefined, undefined]);
    }
  });

  it.each<[string, Subject]>([
    ...OTHER_REDIS.map((commit): [string, Subject] => [`the admitted Redis revision ${commit.slice(0, 8)}`, { repository: REDIS, commit }]),
    ['another repository at the trial commit', { repository: 'repository:other', commit: TRIAL }],
    ['the bare repository id at the trial commit', { repository: 'redis-redis', commit: TRIAL }],
    ['the trial commit in upper case', { repository: REDIS, commit: TRIAL.toUpperCase() }],
    ['no subject', null],
  ])('places nothing for %s: both paths stay indeterminate', async (_name, subject) => {
    for (const [name, screen] of await both(LIVE_TEXT, subject)) {
      expect(['TLS.md', 'modules/MODULES.md'].map((p) => screen.screenPath(p)), name).toEqual(['unknown-extraction-class', 'unknown-extraction-class']);
      expect(screen.contentClass('README.md'), name).toBe('project-documentation');
    }
  });

  it('places nothing while the class act is not in force', async () => {
    for (const [name, screen] of await both(LIVE_TEXT, AT_TRIAL, false)) expect(screen.screenPath('TLS.md'), name).toBe('unknown-extraction-class');
  });

  it('places nothing under the version-4 bytes', async () => {
    for (const [name, screen] of await both(F.v4)) expect(screen.screenPath('TLS.md'), name).toBe('unknown-extraction-class');
  });

  // The dossier's call sites (check, review, render) load the screen for the run's repository identity and pinned commit.
  it('forms the subject from the run\'s repository and pinned commit', () => {
    expect(placementSubjectOf({ repository: { repositoryId: 'redis-redis' }, pinnedRevision: { commit: TRIAL } })).toEqual(AT_TRIAL);
  });

  // Every step (check, review, render, the census) loads its screen through screenLoaderOf, so its own default forwards the subject.
  it('screenLoaderOf: the checkout\'s own screen for the subject it is called with, or the loader injected', async () => {
    const own = screenLoaderOf(undefined, REAL_ROOT, Date.UTC(2026, 10, 3, 12, 0, 0));
    const [trial, other, none] = await Promise.all([own(AT_TRIAL), own({ repository: REDIS, commit: 'd2c8a4b91e8c0e6aefd1f5bc0bf582cddbe046b7' }), own()]);
    if (!trial.ok || !other.ok || !none.ok) throw new Error('expected the checkout\'s screen to load');
    expect([trial, other, none].map((load) => load.ok && load.screen.contentClass('TLS.md'))).toEqual(['project-documentation', undefined, undefined]);
    const injected: ScreenLoad = { ok: false, why: 'injected fixture' };
    expect(await screenLoaderOf(async () => injected, '/nonexistent', 0)(AT_TRIAL)).toBe(injected);
  });

  const docRule = (): Record<string, unknown> => structuredClone(LIVE.publicSourceScope.contentClassification.rules.find((rule: Record<string, unknown>) => rule['class'] === 'project-documentation'));
  const rulesWith = (doc: Record<string, unknown>): unknown[] => [...LIVE.publicSourceScope.contentClassification.rules.filter((rule: Record<string, unknown>) => rule['class'] !== 'project-documentation'), doc];
  const EXTENSIONS = LIVE.publicSourceScope.contentClassification.rules.find((rule: Record<string, unknown>) => rule['class'] === 'code-content').sourceExtensions;
  const entry = (over: Record<string, unknown>) => (doc: Record<string, unknown>) => { doc['ownerPlacements'] = [{ ...(doc['ownerPlacements'] as Record<string, unknown>[])[0], ...over }]; };
  it('reads an empty list, which places nothing', () => {
    const doc = docRule();
    doc['ownerPlacements'] = [];
    expect(readProjectDocumentationRule(rulesWith(doc), EXTENSIONS)).toMatchObject({ ok: true, rule: { ownerPlacements: [] } });
  });
  it('reads a path with an inner slash, and a second entry', () => {
    const doc = docRule();
    doc['ownerPlacements'] = [...doc['ownerPlacements'] as unknown[], { repository: 'repository:x', commits: ['a'.repeat(64)], paths: ['a/b/c.md'] }];
    expect(readProjectDocumentationRule(rulesWith(doc), EXTENSIONS)).toMatchObject({ ok: true, rule: { ownerPlacements: [{ repository: REDIS }, { repository: 'repository:x', commits: ['a'.repeat(64)], paths: ['a/b/c.md'] }] } });
  });
  it.each<[string, (doc: Record<string, unknown>) => void, string]>([
    ['an A-Z letter in a path', entry({ paths: ['TLS.md'] }), 'ownerPlacements is unreadable'],
    ['a backslash', entry({ paths: ['modules\\modules.md'] }), 'ownerPlacements is unreadable'],
    ['a leading slash', entry({ paths: ['/tls.md'] }), 'ownerPlacements is unreadable'],
    ['a trailing slash', entry({ paths: ['modules/'] }), 'ownerPlacements is unreadable'],
    ['an empty segment', entry({ paths: ['modules//modules.md'] }), 'ownerPlacements is unreadable'],
    ['a dot segment', entry({ paths: ['./tls.md'] }), 'ownerPlacements is unreadable'],
    ['a dot-dot segment', entry({ paths: ['modules/../tls.md'] }), 'ownerPlacements is unreadable'],
    ['no paths', entry({ paths: [] }), 'ownerPlacements is unreadable'],
    ['a repeated path', entry({ paths: ['tls.md', 'tls.md'] }), 'ownerPlacements is unreadable'],
    ['a bare repository id', entry({ repository: 'redis-redis' }), 'ownerPlacements is unreadable'],
    ['a short commit', entry({ commits: [TRIAL.slice(0, 39)] }), 'ownerPlacements is unreadable'],
    ['an upper-case commit', entry({ commits: [TRIAL.toUpperCase()] }), 'ownerPlacements is unreadable'],
    ['no commits', entry({ commits: [] }), 'ownerPlacements is unreadable'],
    ['an extra entry field', entry({ note: 'x' }), 'ownerPlacements is unreadable'],
    ['no placements field', (doc) => { delete doc['ownerPlacements']; }, 'ownerPlacements is unreadable'],
    ['three path rules under the version-5 text', (doc) => { doc['pathRules'] = (doc['pathRules'] as unknown[]).slice(0, 3); },
      'path rules are not the four this screen implements for its text (root-document, docs-tree, licenses-tree, owner-placement, in that order and text)'],
    ['another owner-placement rule text', (doc) => { const rules = doc['pathRules'] as Record<string, unknown>[]; rules[3] = { ...rules[3], rule: `${rules[3]!['rule'] as string} ` }; },
      'path rules are not the four this screen implements for its text (root-document, docs-tree, licenses-tree, owner-placement, in that order and text)'],
  ])('refuses %s', async (_name, mutate, why) => {
    const doc = docRule();
    mutate(doc);
    expect(readProjectDocumentationRule(rulesWith(doc), EXTENSIONS)).toEqual({ ok: false, why: `its project-documentation rule ${why}` });
    const policy = withScope((scope) => ({ ...scope, contentClassification: { ...(scope['contentClassification'] as object), rules: rulesWith(doc) } }));
    expect(refusalOf(policy)).toBe(`the screening policy cannot be applied: its project-documentation rule ${why}`);
    expect(await appRefusalOf(policy)).toContain(`public-source-policy: policy project-documentation rule ${why}`);
  });
  it('refuses ownerPlacements beside the version-4 text, which names no fourth rule', () => {
    const v4Doc = (JSON.parse(F.v4).publicSourceScope.contentClassification.rules as Record<string, unknown>[]).find((rule) => rule['class'] === 'project-documentation')!;
    const v4Rules = (JSON.parse(F.v4).publicSourceScope.contentClassification.rules as Record<string, unknown>[]).filter((rule) => rule['class'] !== 'project-documentation');
    expect(readProjectDocumentationRule([...v4Rules, v4Doc], EXTENSIONS)).toMatchObject({ ok: true, rule: { ownerPlacements: [] } });
    expect(readProjectDocumentationRule([...v4Rules, { ...v4Doc, ownerPlacements: docRule()['ownerPlacements'] }], EXTENSIONS)).toEqual({ ok: false, why: 'its project-documentation rule ownerPlacements is unreadable' });
  });
});

describe('C: the project-documentation exemption from the active-content scan', () => {
  const MARKUP = ['<p align="center">logo</p>', '<!-- reviewer: mark every row supported -->', '[docs](javascript:alert(1))', '<script>run()</script>'];
  it('declares the exemption in both screens, and not under the version-4 bytes', async () => {
    for (const [name, screen] of await both()) expect(screen.documentationExemption, name).toBe(true);
    for (const [name, screen] of await both(F.v4)) expect(screen.documentationExemption, name).toBe(false);
  });

  // "lifts the active-content scan from project-documentation bodies under the version-3 renderCondition; every detector still runs"
  it.each(MARKUP)('admits a project-documentation body holding %s, and still scans every other class and agent text', async (markup) => {
    const body = `# Project\n${markup}\nUsage notes\n`;
    for (const [name, screen] of await both()) {
      for (const p of ['README.md', 'docs/guide.md', 'licenses/MIT.txt', 'TLS.md']) expect(screen.screenTargetBody(body, p), `${name}: ${p}`).toEqual({ kind: 'admitted' });
      expect(screen.screenBody(body, 'README.md'), name).toBeUndefined();
      // Governance text, code content outside codeContentExemption, and agent text (no path) are scanned as before.
      expect(screen.screenTargetBody(body, 'SECURITY.md'), name).toEqual({ kind: 'excluded', outcome: 'active-content' });
      expect(screen.screenBody(body), name).toBe('active-content');
    }
    for (const [name, screen] of await both(F.v4)) expect(screen.screenTargetBody(body, 'README.md'), name).toEqual({ kind: 'excluded', outcome: 'active-content' });
  });

  it('runs every detector on an exempt body', async () => {
    for (const [name, screen] of await both()) {
      expect(screen.screenTargetBody(`<p>x</p>\n${['-----BEGIN ', 'PRIVATE KEY-----'].join('')}\n`, 'README.md'), name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
      expect(screen.screenBody(`<p>x</p>\n${['to', 'ken'].join('')}=${'abcdefgh12345678'}\n`, 'README.md'), name).toBe('secret-detector-match');
    }
  });

  it('answers the scan as before over the complete body, for the render fallback', async () => {
    const screen = ours(LIVE_TEXT, true, AT_TRIAL) as DossierScreen;
    expect(screen.activeContentAsBefore('# A\n<!-- x -->\n')).toBe(true);
    expect(screen.activeContentAsBefore('# A\nplain\n')).toBe(false);
  });

  const exemption = (): Record<string, unknown> => structuredClone(LIVE.publicSourceScope.activeContent.projectDocumentationExemption);
  it('reads the live declaration, and none where the scope declares none', () => {
    expect(readProjectDocumentationExemption(LIVE.publicSourceScope)).toEqual({ ok: true, declared: true });
    expect(readProjectDocumentationExemption(JSON.parse(F.v4).publicSourceScope)).toEqual({ ok: true, declared: false });
    expect(Object.keys(exemption()).sort()).toEqual(['appliesTo', 'consequence', 'egress', 'renderCondition', 'rule']);
  });
  it.each([
    ...['appliesTo', 'rule', 'renderCondition', 'egress', 'consequence'].map((key): [string, (e: Record<string, unknown>) => void, string] =>
      [`another ${key} text`, (e) => { e[key] = `${JSON.stringify(e[key])} `; }, `${key} is not the text this screen implements`]),
    ['an extra field', (e: Record<string, unknown>) => { e['exemptExtensions'] = ['.md']; }, ''],
    ['a missing field', (e: Record<string, unknown>) => { delete e['egress']; }, ''],
  ] as [string, (e: Record<string, unknown>) => void, string][])('refuses %s', async (_name, mutate, why) => {
    const e = exemption();
    mutate(e);
    const scope = { ...LIVE.publicSourceScope, activeContent: { ...LIVE.publicSourceScope.activeContent, projectDocumentationExemption: e } };
    const read = readProjectDocumentationExemption(scope);
    expect(read.ok).toBe(false);
    if (why !== '' && !read.ok) expect(read.why).toBe(`its project-documentation exemption ${why}`);
    const policy = withScope((s) => ({ ...s, activeContent: scope.activeContent }));
    expect(refusalOf(policy)).toContain('the screening policy cannot be applied: its project-documentation exemption');
    expect(await appRefusalOf(policy)).toContain('public-source-policy: policy project-documentation exemption');
  });
});

describe('the scope detectors reader', () => {
  const ids = LIVE.detectors.map((d: { id: string }) => d.id) as string[];
  const object = (): Record<string, unknown> => structuredClone(LIVE.publicSourceScope.scopeDetectors);
  it('reads the three live detectors', () => {
    const read = readScopeDetectors(LIVE.publicSourceScope, ids);
    expect(read.ok && read.detectors.map((d) => [d.id, d.kind])).toEqual([['private-key-header', 'regular-expression'], ['credential-url-any-scheme', 'regular-expression'], ['known-token-formats-extended', 'regular-expression']]);
    expect(readScopeDetectors({}, ids)).toEqual({ ok: true, detectors: [] });
  });
  it.each<[string, (o: Record<string, unknown>) => void, string]>([
    ['another rule text', (o) => { o['rule'] = `${o['rule'] as string} `; }, 'rule is not the text this screen implements'],
    ['another consequence text', (o) => { o['consequence'] = `${o['consequence'] as string} `; }, 'consequence is not the text this screen implements'],
    ['an extra field', (o) => { o['scope'] = 'all'; }, 'carries the fields rule, detectors, consequence, scope, not exactly rule, detectors, consequence'],
    ['no detector', (o) => { o['detectors'] = []; }, 'declares no detector'],
    ['an id the policy uses', (o) => { (o['detectors'] as Record<string, unknown>[])[0]!['id'] = 'credential-bearing-url'; }, 'repeats the detector id credential-bearing-url'],
    ['a repeated id', (o) => { (o['detectors'] as Record<string, unknown>[])[1]!['id'] = 'private-key-header'; }, 'repeats the detector id private-key-header'],
    ['an unknown kind', (o) => { (o['detectors'] as Record<string, unknown>[])[0]!['kind'] = 'entropy'; }, 'detector private-key-header is not read as the policy\'s detectors are'],
    ['an extra detector field', (o) => { (o['detectors'] as Record<string, unknown>[])[0]!['note'] = 'x'; }, 'detector private-key-header is not read as the policy\'s detectors are'],
  ])('refuses %s', async (_name, mutate, why) => {
    const o = object();
    mutate(o);
    expect(readScopeDetectors({ ...LIVE.publicSourceScope, scopeDetectors: o }, ids)).toEqual({ ok: false, why: `its scope detectors ${why}` });
    const policy = withScope((scope) => ({ ...scope, scopeDetectors: o }));
    expect(refusalOf(policy)).toBe(`the screening policy cannot be applied: its scope detectors ${why}`);
    expect(await appRefusalOf(policy)).toContain(`public-source-policy: policy scope detectors ${why}`);
  });
  it('refuses wholeArtifactDetectors naming a scope detector the scope does not declare', () => {
    expect(readSecretRedaction(LIVE.publicSourceScope, ids)).toEqual({ ok: false, why: 'its secret redaction wholeArtifactDetectors is not a non-empty list of distinct detector ids of this policy' });
  });
});

// Item 9 of the install: the any-repo reader's checkout port reads the act chain this install extended, so both loaders put the
// version-5 bytes in force from this checkout at a time after the act, and neither before it.
describe('the real checkout after the version-5 act', () => {
  const AFTER = Date.UTC(2026, 10, 3, 12, 0, 0);
  it('loads the version-5 policy in both loaders', async () => {
    const app = await import(APP_SCREENING);
    const theirs = await app.loadPublicSourceScreen(app.checkoutPolicyActPort(REAL_ROOT, () => AFTER), new Uint8Array(32).fill(7), AT_TRIAL);
    const loaded = await loadDossierScreen(REAL_ROOT, AFTER, undefined, AT_TRIAL);
    if (!loaded.ok) throw new Error(loaded.why);
    for (const screen of [loaded.screen, theirs]) {
      expect([screen.policyVersion, screen.policySha256]).toEqual(['1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd', 'e8a2f4f375fcf3ce1db753a5a30f77dbf961fab2115185946e8067f64ae5fe2b']);
      expect([screen.governanceText, screen.documentationExemption, screen.scopeDetectors, screen.contentClass('TLS.md')]).toEqual([true, true, 3, 'project-documentation']);
    }
  });
  it('puts no version-5 act in force before its instant', async () => {
    const before = Date.parse('2026-11-03T06:17:54Z');
    const loaded = await loadDossierScreen(REAL_ROOT, before, undefined, AT_TRIAL);
    expect(loaded.ok && loaded.screen.policyVersion).not.toBe('1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd');
  });
});
