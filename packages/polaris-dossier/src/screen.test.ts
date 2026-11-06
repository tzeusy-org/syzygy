import { execFile, execFileSync } from 'node:child_process';
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { promisify } from 'node:util';
import { DECISIONS_DIR, POLICY_PATH } from '@syzygy/polaris-generation-consent';
import { loadRecorderForms, renderClassAct, renderPolicyAct } from '@syzygy/polaris-generation-consent/testing';
import { beforeAll, describe, expect, it } from 'vitest';
import { buildDossierScreen, loadDossierScreen } from './screen.js';
import { tempDir } from '@syzygy/test-kit';

// The recorder forms render once, before the file collects its tests: some tables render at collection (syzygy-bpyt.4.8).
await loadRecorderForms();

// Asynchronous, so a slow command cannot starve the vitest worker's RPC (syzygy-w90k).
const execFileAsync = promisify(execFile);

// syzygy-qkea.7 (S6): the screen every blob a check reads passes (REQ-polaris-generation-033, 025). The records root is a temporary
// Syzygy checkout whose policy act is rendered by the real recorder; the policy carries this checkout's detectors and denied paths.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE = JSON.parse(fs.readFileSync(path.join(REAL_ROOT, POLICY_PATH), 'utf8'));
const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const sha = (text: string): string => createHash('sha256').update(text, 'utf8').digest('hex');
const policyOf = (scope: unknown = { contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c', '.txt'] }] } }, over: Record<string, unknown> = {}): string =>
  `${JSON.stringify({ policyId: 'fixture', policyVersion: '1', detectors: LIVE.detectors, sourceAdmission: LIVE.sourceAdmission, publicSourceScope: scope, ...over }, null, 2)}\n`;
const encode = (text: string): Uint8Array => new TextEncoder().encode(text);

// syzygy-2coz: the live scope carries the project-documentation rule (screening scope version 2), classified only while the RFC5-14
// class amendment act is in force. The class act's argument is the sha256 of the RFC-0005 module in the records root.
const DOC_SCOPE = { contentClassification: LIVE.publicSourceScope.contentClassification };
const docScopeWith = (over: Record<string, unknown>) => ({ contentClassification: { ...DOC_SCOPE.contentClassification, rules: DOC_SCOPE.contentClassification.rules.map((rule: Record<string, unknown>) => (rule['class'] === 'project-documentation' ? { ...rule, ...over } : rule)) } });
const RFC5_MODULE = '.syzygy/governance/contracts/rfcs/RFC-0005/consent-egress-secrets.md';
const MODULE_TEXT = '# RFC-0005 fixture module\n\n- `project-documentation`\n';
const CLASS_ACT_FILE = `${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-CLASS-AMENDMENT-ACT.md`;
type ClassAct = { readonly argument?: string; readonly date?: string; readonly withdrawn?: boolean } | null;
const recordsRoot = (policy: string, actArgument: string = sha(policy), classAct: ClassAct = null): string => {
  const root = tempDir('dossier-screen-');
  const files: [string, string][] = [[POLICY_PATH, policy], [`${DECISIONS_DIR}/PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md`, renderPolicyAct(actArgument, '2026-10-04', '2026-10-04T10:00:00Z')]];
  if (classAct !== null) files.push([RFC5_MODULE, MODULE_TEXT], [CLASS_ACT_FILE, renderClassAct(classAct.argument ?? sha(MODULE_TEXT), classAct.date ?? '2026-10-04', `${classAct.date ?? '2026-10-04'}T09:00:00Z`)]);
  if (classAct?.withdrawn === true) files.push([`${DECISIONS_DIR}/RFC5-PROJECT-DOCUMENTATION-WITHDRAWAL-2026-10-06.md`, '# Owner withdrawal\n\nWithdraws `RFC5-PROJECT-DOCUMENTATION-AMEND-2026-10-04`.\n']);
  for (const [rel, body] of files) {
    fs.mkdirSync(path.dirname(path.join(root, rel)), { recursive: true });
    fs.writeFileSync(path.join(root, rel), body);
  }
  return root;
};

describe('the screen', () => {
  const loaded = buildDossierScreen(encode(policyOf()));
  const screen = loaded.ok ? loaded.screen : null;

  it.each<[string, string | undefined]>([
    ['src/server.c', undefined],
    ['docs/notes.txt', undefined],
    ['README.md', 'unknown-extraction-class'],
    ['src/server.C', 'unknown-extraction-class'],
    ['config/.env', 'denied-path'],
    ['keys/server.pem.c', undefined],
    ['keys/server.pem', 'denied-path'],
    [`docs/${['AK', 'IA'].join('')}${'Q'.repeat(16)}.c`, 'secret-detector-match'],
  ])('screens the path %s', (repositoryPath, outcome) => {
    expect(screen?.screenPath(repositoryPath)).toBe(outcome);
  });

  it.each<[string, string, string | undefined]>([
    ['plain code', 'int main(void) { return 0; }\n', undefined],
    ['a credential assignment', `${['to', 'ken'].join('')} = "${'z'.repeat(12)}"\n`, 'secret-detector-match'],
    ['an HTML tag', 'List<String> names;\n', 'active-content'],
    ['a script element', '<script>run()</script>\n', 'active-content'],
  ])('screens a body with %s', (_name, body, outcome) => {
    expect(screen?.screenBody(body)).toBe(outcome);
  });

  it.each<[string, string]>([
    ['no public-source scope', policyOf(null)],
    ['no code-content extensions', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: [] }] } })],
    ['two code-content rules', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c'] }, { class: 'code-content', sourceExtensions: ['.h'] }] } })],
    ['an extension that is a path', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['./c'] }] } })],
    ['unreadable denied-path rules', policyOf(undefined, { sourceAdmission: { deniedPathBasenames: [] } })],
    ['detectors that do not compile', policyOf(undefined, { detectors: [{ id: 'x', kind: 'regular-expression', pattern: '(', flags: 'g' }] })],
    ['no identity', policyOf(undefined, { policyId: 7 })],
    ['bytes that are not JSON', '{'],
  ])('is refused for a policy with %s', (_name, policy) => {
    expect(buildDossierScreen(encode(policy))).toMatchObject({ ok: false });
  });
});

// The object test in @syzygy/support decides at every container the loader reads (syzygy-bpyt.6.3 stack 4): a container that is an array,
// null or a primitive is refused, or passed over, in the loader's own words; it is never read as an object and never thrown on. The policy
// arrives as JSON bytes, so an array here never carries a field by name.
describe('the loader reads each container as an object only when it is one', () => {
  const REFUSED = (why: string) => ({ ok: false, why: `the screening policy cannot be applied: ${why}` });
  // `a number` is not redundant with `a string`: a test written as `typeof value !== 'string'` refuses the string and admits the number.
  const NOT_OBJECTS: ReadonlyArray<readonly [string, unknown]> = [['an array', []], ['null', null], ['a string', 'x'], ['a number', 1]];
  const CODE_CONTENT = { class: 'code-content', sourceExtensions: ['.c', '.txt'] };

  it.each(NOT_OBJECTS)('refuses a policy document that is %s', (_label, doc) => {
    expect(buildDossierScreen(encode(JSON.stringify(doc)))).toEqual(REFUSED('its identity is unreadable'));
  });
  it.each(NOT_OBJECTS)('refuses a public-source scope that is %s', (_label, scope) => {
    expect(buildDossierScreen(encode(policyOf(scope)))).toEqual(REFUSED('it carries no publicSourceScope'));
  });
  it.each(NOT_OBJECTS)('refuses source admission that is %s', (_label, admission) => {
    expect(buildDossierScreen(encode(policyOf(undefined, { sourceAdmission: admission })))).toEqual(REFUSED('its denied-path rules are unreadable'));
  });
  it.each(NOT_OBJECTS)('refuses a content classification that is %s, which names no code-content rule', (_label, classification) => {
    expect(buildDossierScreen(encode(policyOf({ contentClassification: classification })))).toEqual(REFUSED('its code-content sourceExtensions are unreadable'));
  });
  it('refuses a classification with no rules at all, which names no code-content rule', () => {
    expect(buildDossierScreen(encode(policyOf({ contentClassification: { rules: [] } })))).toEqual(REFUSED('its code-content sourceExtensions are unreadable'));
  });
  it('passes over a rules entry that is not an object, as if it were not there', () => {
    const noisy = buildDossierScreen(encode(policyOf({ contentClassification: { rules: [null, 'x', 1, true, [], CODE_CONTENT] } })));
    expect(noisy.ok).toBe(true);
    expect(noisy.ok && noisy.screen.screenPath('src/server.c')).toBeUndefined();
    expect(noisy.ok && noisy.screen.screenPath('README.md')).toBe('unknown-extraction-class');
  });
  it('passes over a detector entry that is not an object when it collects the detector ids, and leaves the refusal to the compiler', () => {
    const loaded = buildDossierScreen(encode(policyOf(undefined, { detectors: [null, 'x', 1] })));
    expect(loaded).toMatchObject({ ok: false, why: expect.stringContaining('its detectors do not compile') });
  });
});

describe('the project-documentation class (syzygy-2coz)', () => {
  const build = (inForce: boolean) => {
    const loaded = buildDossierScreen(encode(policyOf(DOC_SCOPE)), inForce);
    if (!loaded.ok) throw new Error(loaded.why);
    return loaded.screen;
  };

  // Expected values from the rule text: root documents, the docs trees minus the withheld words and build .txt files, the licenses tree.
  it.each<[string, string | undefined]>([
    ['README.md', undefined], ['LICENSE.txt', undefined], ['01-CONTRIBUTING.md', undefined], ['COPYING', undefined],
    ['docs/guide.md', undefined], ['doc/intro.rst', undefined], ['licenses/MIT.txt', undefined], ['src/server.c', undefined],
    // Version 5: a root MANIFESTO is governance-text, not project-documentation, and is admitted under that class.
    ['MANIFESTO', undefined], ['redis.conf', 'unknown-extraction-class'], ['src/README.md', 'unknown-extraction-class'],
    ['docs/design.md', 'unknown-extraction-class'], ['docs/adr/0001.md', 'unknown-extraction-class'], ['docs/requirements.txt', 'unknown-extraction-class'],
    ['licenses/a/MIT.txt', 'unknown-extraction-class'], ['docs//guide.md', 'unknown-extraction-class'],
    // The steps before the class are unchanged: a denied path or a detector match in a documentation path is still withheld.
    ['docs/server.pem', 'denied-path'], [`docs/${['AK', 'IA'].join('')}${'Q'.repeat(16)}.md`, 'secret-detector-match'],
  ])('screens %s while the class act is in force', (repositoryPath, outcome) => {
    expect(build(true).screenPath(repositoryPath)).toBe(outcome);
  });

  it.each(['README.md', 'LICENSE.txt', 'docs/guide.md', 'licenses/MIT.txt'])('leaves %s indeterminate while the class act is not in force', (repositoryPath) => {
    const screen = build(false);
    expect(screen.projectDocumentation).toBe(false);
    expect(screen.screenPath(repositoryPath)).toBe('unknown-extraction-class');
    expect(screen.screenPath('src/server.c')).toBeUndefined();
  });

  // R-PR403-SCREEN-DOCS-1 finding 1: the screen names the class it admits each path under, and none for a path it excludes.
  it.each<[string, boolean, string | undefined]>([
    ['README.md', true, 'project-documentation'], ['docs/guide.md', true, 'project-documentation'], ['licenses/MIT.txt', true, 'project-documentation'],
    ['src/server.c', true, 'code-content'], ['docs/design.md', true, undefined], ['docs/server.pem', true, undefined],
    ['README.md', false, undefined], ['src/server.c', false, 'code-content'],
  ])('names the content class of %s (class act in force: %s)', (repositoryPath, inForce, contentClass) => {
    expect(build(inForce).contentClass(repositoryPath)).toBe(contentClass);
  });

  it('builds without the class act by default', () => {
    expect(buildDossierScreen(encode(policyOf(DOC_SCOPE)))).toMatchObject({ ok: true, screen: { projectDocumentation: false } });
  });

  // A documentation body goes through every detector and the active-content scan, inert contexts included for the detectors.
  it.each<[string, string, string | undefined]>([
    ['plain prose', '# Redis\n\nAn in-memory data store.\n', undefined],
    ['a credential in a fenced block', `\`\`\`\n${['to', 'ken'].join('')} = "${'z'.repeat(12)}"\n\`\`\`\n`, 'secret-detector-match'],
    ['an HTML element', '<img src="logo.png">\n', 'active-content'],
    ['a javascript link', '[x](javascript:alert(1))\n', 'active-content'],
    ['markup inside a fence', '```html\n<b>shown as code</b>\n```\n', undefined],
  ])('screens a documentation body with %s', (_name, body, outcome) => {
    expect(build(true).screenBody(body)).toBe(outcome);
  });

  // syzygy-bpyt.16 (ruled on syzygy-bpyt.1.14): a CRLF or CR body gets the active-content decision its LF form gets. The first body was
  // admitted under CRLF and CR before the fix (a backtick opener with a backtick in its info text hides a script element as an inline
  // span), the second withheld (a tilde fence the mask did not recognize, leaving the script element it holds in the open).
  it.each([['LF', '\n'], ['CRLF', '\r\n'], ['CR', '\r']])('%s: a documentation body is withheld as active content or admitted as its LF form is', (_name, end) => {
    const failOpen = ['# Guide', '', '```a`b', '<script>alert(1)</script>', '```', ''].join(end);
    const benign = ['# Guide', '', '~~~', '<script>alert(1)</script>', '~~~', 'after', ''].join(end);
    expect(build(true).screenBody(failOpen)).toBe('active-content');
    expect(build(true).screenBody(benign)).toBeUndefined();
    expect(build(true).screenTargetBody(failOpen, 'README.md')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    expect(build(true).screenTargetBody(benign, 'README.md')).toEqual({ kind: 'admitted' });
  });

  it.each<[string, Record<string, unknown>]>([
    ['an edited path rule', { pathRules: [{ id: 'root-document', rule: 'any' }] }],
    ['an unreadable root stem list', { rootStems: 'readme' }],
    ['a suffix that is a code extension', { documentSuffixes: ['', '.c'] }],
  ])('refuses a policy whose project-documentation rule has %s, in force or not', (_name, over) => {
    const policy = encode(policyOf(docScopeWith(over)));
    for (const inForce of [true, false]) expect(buildDossierScreen(policy, inForce)).toMatchObject({ ok: false, why: expect.stringContaining('its project-documentation rule') });
  });
});

// Parity with the any-repo reader's screen, which these rules copy (TODO(syzygy-qkea.17): move the rules into one shared package, then
// delete the copy and this test). The app module is imported at test time by a computed path, so the package's own build never reaches
// into the app. Both screens are built from the same policy bytes and must agree on every path and body of the population, and on
// which malformed policies they refuse.
const APP_SCREENING = path.join(REAL_ROOT, 'apps/three-surface-poc/src/polaris-generation/public-source-screening.ts');
type AppScreen = { screenPath: (p: string) => string | undefined; screenBody: (b: string, p?: string) => string | undefined; contentClass: (p: string) => string | undefined; projectDocumentation: boolean };
// The app's port states whether the class act is in force; `classAct` gives it the same answer the dossier's screen is built with.
// `checkoutAppScreen` instead lets the app's own checkout port decide it from a records root at `now`, as the dossier's loader does.
const appScreen = async (policy: string, classAct = false): Promise<AppScreen> => {
  const app = await import(APP_SCREENING);
  const port = { read: async () => ({ actRecord: renderPolicyAct(sha(policy), '2026-10-04', '2026-10-04T10:00:00Z'), policy: encode(policy), classActInForce: classAct }) };
  return app.loadPublicSourceScreen(port, new Uint8Array(32).fill(7));
};
const checkoutAppScreen = async (root: string, now: number): Promise<AppScreen> => {
  const app = await import(APP_SCREENING);
  return app.loadPublicSourceScreen(app.checkoutPolicyActPort(root, () => now), new Uint8Array(32).fill(7));
};

describe('parity with the any-repo reader\'s screen (syzygy-qkea.17)', () => {
  const policies: [string, string, boolean][] = [
    ['the fixture scope', policyOf(), false],
    ['a wider scope', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.md', '.ts', '.json', '.py', '.pem.c'] }] } }), false],
    ['the live scope, class act in force', policyOf(DOC_SCOPE), true],
    ['the live scope, class act not in force', policyOf(DOC_SCOPE), false],
  ];
  const tracked = execFileSync('git', ['-C', REAL_ROOT, 'ls-files', '-z'], { encoding: 'utf8' }).split('\0').filter(Boolean);
  const paths = [...tracked, 'src/server.c', 'src/server.C', 'config/.env', '.env.local', 'keys/server.pem', 'keys/server.pem.c', 'id_rsa',
    `docs/${['AK', 'IA'].join('')}${'Q'.repeat(16)}.c`, `docs/${['gh', 'p_'].join('')}${'k'.repeat(24)}.txt`, 'a/b/README', 'notes.txt',
    'README', 'LICENSE.txt', '01-README.md', '001-README.md', 'MANIFESTO', 'docs/guide.md', 'DOCS/Guide.MD', 'docs/design.md', 'docs/adr/x.md',
    'docs/CMakeLists.txt', 'docs/requirements-dev.txt', 'licenses/MIT.txt', 'LICENSES/a/MIT.txt', 'licenses/security.txt', '/README.md', 'docs/../README.md',
    'docs\\guide.md', 'docs//guide.md'];
  const bodies = [
    'int main(void) { return 0; }\n', `${['to', 'ken'].join('')} = "${'z'.repeat(12)}"\n`, 'List<String> names;\n', '<script>run()</script>\n',
    `${['-----BEGIN ', 'PRIVATE KEY-----'].join('')}\n`, `https://u:${'p'.repeat(4)}@example.invalid/\n`, '', 'plain words\n',
    '<a href="x">link</a>\n', 'if (a < b && c > d) {}\n', '<!-- note -->\n', `${['api', '_key'].join('')}: ${'q'.repeat(10)}\n`,
  ];

  it.each(policies)('agrees on every path and body under %s', async (_name, policy, classAct) => {
    const ours = buildDossierScreen(encode(policy), classAct);
    if (!ours.ok) throw new Error(ours.why);
    const theirs = await appScreen(policy, classAct);
    expect(ours.screen.projectDocumentation).toBe(classAct && policy.includes('project-documentation'));
    expect(paths.length).toBeGreaterThan(1000);
    const pathDisagreements = paths.filter((p) => ours.screen.screenPath(p) !== theirs.screenPath(p) || ours.screen.contentClass(p) !== theirs.contentClass(p));
    const bodyDisagreements = bodies.map((b, i) => [i, ours.screen.screenBody(b), theirs.screenBody(b)]).filter(([, a, b]) => a !== b);
    expect({ pathDisagreements, bodyDisagreements }).toEqual({ pathDisagreements: [], bodyDisagreements: [] });
    // The population exercises every outcome, so agreement is not agreement on one answer.
    expect(new Set(paths.map((p) => ours.screen.screenPath(p) ?? 'admitted'))).toEqual(new Set(['admitted', 'denied-path', 'secret-detector-match', 'unknown-extraction-class']));
    expect(new Set(bodies.map((b) => ours.screen.screenBody(b) ?? 'admitted'))).toEqual(new Set(['admitted', 'secret-detector-match', 'active-content']));
    expect(theirs.projectDocumentation).toBe(ours.screen.projectDocumentation);
    // Under the live scope the class decides real paths both ways, so agreement covers it.
    if (policy.includes('project-documentation')) expect(['README.md', 'docs/design.md'].map((p) => ours.screen.screenPath(p))).toEqual([classAct ? undefined : 'unknown-extraction-class', 'unknown-extraction-class']);
    // The class each admitted path is admitted under, so that agreement on classes is not agreement on one class.
    // Version 5's governance-text class is classified whether or not the class act is in force: RFC5-14 already lists it.
    expect(new Set(paths.map((p) => ours.screen.contentClass(p) ?? 'excluded'))).toEqual(new Set(['code-content', 'excluded', ...(classAct && policy.includes('project-documentation') ? ['project-documentation'] : []),
      ...(policy.includes('governanceTextPaths') ? ['governance-text'] : [])]));
  });

  // R-PR403-SCREEN-DOCS-1 finding 2: each screen decides the class prerequisite from the same records at the same `now`, so a class act
  // not yet in force, a withdrawn one, or one that binds other module bytes leaves both screens with the class unclassified.
  it.each<[string, ClassAct, boolean]>([
    ['in force', {}, true],
    ['absent', null, false],
    ['dated after now', { date: '2026-10-08' }, false],
    ['withdrawn', { withdrawn: true }, false],
    ['binding other module bytes', { argument: sha(`${MODULE_TEXT} `) }, false],
  ])('decides the class prerequisite as the app does from the same records at now: %s', async (_name, classAct, classified) => {
    const root = recordsRoot(policyOf(DOC_SCOPE), undefined, classAct);
    const ours = await loadDossierScreen(root, NOW);
    if (!ours.ok) throw new Error(ours.why);
    const theirs = await checkoutAppScreen(root, NOW);
    expect([ours.screen.projectDocumentation, theirs.projectDocumentation]).toEqual([classified, classified]);
    expect(['README.md', 'licenses/MIT.txt', 'src/server.c'].map((p) => [ours.screen.screenPath(p), theirs.screenPath(p), ours.screen.contentClass(p), theirs.contentClass(p)])).toEqual([
      classified ? [undefined, undefined, 'project-documentation', 'project-documentation'] : ['unknown-extraction-class', 'unknown-extraction-class', undefined, undefined],
      classified ? [undefined, undefined, 'project-documentation', 'project-documentation'] : ['unknown-extraction-class', 'unknown-extraction-class', undefined, undefined],
      [undefined, undefined, 'code-content', 'code-content'],
    ]);
  });

  it.each<[string, string]>([
    ['no public-source scope', policyOf(null)],
    ['no code-content extensions', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: [] }] } })],
    ['two code-content rules', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.c'] }, { class: 'code-content', sourceExtensions: ['.h'] }] } })],
    ['an extension that is a path', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['./c'] }] } })],
    ['an extension with a double dot', policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['..c'] }] } })],
    ['unreadable denied-path rules', policyOf(undefined, { sourceAdmission: { deniedPathBasenames: [] } })],
    ['detectors that do not compile', policyOf(undefined, { detectors: [{ id: 'x', kind: 'regular-expression', pattern: '(', flags: 'g' }] })],
    ['no identity', policyOf(undefined, { policyId: 7 })],
    ['an edited project-documentation path rule', policyOf(docScopeWith({ pathRules: [] }))],
    ['a project-documentation suffix that is a code extension', policyOf(docScopeWith({ licenseTreeSuffixes: ['.c'] }))],
    ['two project-documentation rules', policyOf({ contentClassification: { ...DOC_SCOPE.contentClassification, rules: [...DOC_SCOPE.contentClassification.rules, ...DOC_SCOPE.contentClassification.rules.filter((rule: Record<string, unknown>) => rule['class'] === 'project-documentation')] } })],
  ])('refuses a policy with %s, as the app does', async (_name, policy) => {
    for (const classAct of [false, true]) {
      expect(buildDossierScreen(encode(policy), classAct)).toMatchObject({ ok: false });
      await expect(appScreen(policy, classAct)).rejects.toThrow();
    }
  });
});

// P-105 (owner act of 2026-10-08; syzygy-wsev): the version-3 scope's code-content exemption, in both screens. The scopes are the
// builder's proposed bytes for each variant (scripts/build_public_source_screening_scope_v3.py). Since the version-4 act the policy on
// disk is neither the version-3 base nor a version-3 row, so the version-3 base is recovered as the version-4 builder recovers its own:
// version 4's base (the version-3 row `all`) with version 3's own `all` patch reversed.
describe('the code-content exemption of screening scope version 3', () => {
  let V3: Record<string, Record<string, unknown>> = {};
  beforeAll(async () => {
    const py = `import json, sys; sys.path.insert(0, 'scripts')
import build_public_source_screening_scope_v2 as b2, build_public_source_screening_scope_v3 as b, build_public_source_screening_scope_v4 as b4, build_public_source_screening_scope_v5 as b5
import build_public_source_screening_scope_v6 as b6
v5_bcd, _mode = b6.base_bytes()
v4_span = b2.reverse_patch((b5.ROOT / b5.patch_path(b6.V5_BASE_VARIANT)).read_text(), v5_bcd)
assert b5.sha(v4_span) == b5.v4.manifest_rows(b5.ROOT)[b5.V4_BASE_VARIANT] and b5.propose(v4_span, b6.V5_BASE_VARIANT) == v5_bcd
v3_all = b2.reverse_patch((b4.ROOT / b4.patch_path(b5.V4_BASE_VARIANT)).read_text(), v4_span)
assert b4.sha(v3_all) == b4.v3.manifest_rows(b4.ROOT)[b4.V3_BASE_VARIANT] and b4.propose(v3_all, b5.V4_BASE_VARIANT) == v4_span
base = b2.reverse_patch((b.ROOT / b.patch_path('all')).read_text(), v3_all)
assert b.sha(base) != b.sha(v3_all) and b.propose(base, 'all') == v3_all
sys.stdout.write(json.dumps({v: json.loads(b.propose(base, v))[b.SCOPE_KEY] for v in b.VARIANTS}))`;
    V3 = JSON.parse((await execFileAsync('python3', ['-c', py], { cwd: REAL_ROOT })).stdout) as Record<string, Record<string, unknown>>;
  });
  const both = async (variant: string, classAct = true) => {
    const policy = policyOf(V3[variant]);
    const ours = buildDossierScreen(encode(policy), classAct);
    if (!ours.ok) throw new Error(ours.why);
    return { ours: ours.screen, theirs: await appScreen(policy, classAct) };
  };
  const COMPARISON = 'if (a<b && c>d) { return; }\n';
  it('admits a C body whose comparisons read as tags, given its path, and scans it without one: both screens', async () => {
    const { ours, theirs } = await both('all');
    expect([ours.codeContentExemption, (theirs as { codeContentExemption?: boolean }).codeContentExemption]).toEqual([true, true]);
    for (const screen of [ours, theirs]) {
      expect(screen.screenBody(COMPARISON, 'src/server.c')).toBeUndefined();
      expect(screen.screenBody(COMPARISON)).toBe('active-content');
      expect(screen.screenBody('<script>x()</script>\n', 'src/server.c')).toBeUndefined();
    }
  });
  it('still runs every detector over an exempt body', async () => {
    const { ours, theirs } = await both('all');
    const secret = `${['to', 'ken'].join('')} = "${'z'.repeat(12)}"\n<b>\n`;
    expect([ours.screenBody(secret, 'src/server.c'), theirs.screenBody(secret, 'src/server.c')]).toEqual(['secret-detector-match', 'secret-detector-match']);
  });
  it('scans a project-documentation body as before, whatever path it is given', async () => {
    const { ours, theirs } = await both('all');
    for (const screen of [ours, theirs]) {
      expect(screen.contentClass('README.md')).toBe('project-documentation');
      expect(screen.screenBody('<img src="logo.png">\n', 'README.md')).toBe('active-content');
      expect(screen.screenBody('# Redis\n\nAn in-memory data store.\n', 'README.md')).toBeUndefined();
    }
  });
  it('scans .js and the other web extensions as before under variant non-web, and exempts C', async () => {
    const { ours, theirs } = await both('non-web');
    for (const screen of [ours, theirs]) {
      expect(screen.screenBody('<script>x()</script>\n', 'web/app.js')).toBe('active-content');
      expect(screen.screenBody(COMPARISON, 'src/server.c')).toBeUndefined();
    }
  });
  it('scans a body at a path no class admits as before', async () => {
    const { ours, theirs } = await both('all');
    expect([ours.screenBody(COMPARISON, 'redis.conf'), theirs.screenBody(COMPARISON, 'redis.conf')]).toEqual(['active-content', 'active-content']);
  });
  it('scans a body at a screened-out path as before, though it ends in an exempt extension: the class decides, not the extension', async () => {
    const { ours, theirs } = await both('all');
    for (const screen of [ours, theirs]) {
      // Denied by the `.env.` prefix, so no class admits it, although `.c` is exempt.
      expect(screen.contentClass('config/.env.c')).toBeUndefined();
      expect(screen.screenBody(COMPARISON, 'config/.env.c')).toBe('active-content');
    }
  });
  it.each(['all', 'non-web'])('agrees with the app on every path and body under variant %s, given the path', async (variant) => {
    const { ours, theirs } = await both(variant);
    const paths = ['src/server.c', 'src/server.h', 'deps/lua/src/lapi.c', 'web/app.js', 'web/app.ts', 'index.php', 'tests/test.tcl', 'README.md',
      'docs/guide.md', 'redis.conf', 'src/server.C', 'licenses/MIT.txt'];
    const bodies = ['int main(void) { return 0; }\n', COMPARISON, '<script>run()</script>\n', '<a href="x">link</a>\n', '<!-- note -->\n',
      `${['api', '_key'].join('')}: ${'q'.repeat(10)}\n`, '[x](javascript:alert(1))\n'];
    const disagreements = paths.flatMap(p => bodies.map((b, i) => [p, i, ours.screenBody(b, p), theirs.screenBody(b, p)] as const)).filter(([, , a, b]) => a !== b);
    expect(disagreements).toEqual([]);
    expect(new Set(paths.flatMap(p => bodies.map(b => ours.screenBody(b, p) ?? 'admitted')))).toEqual(new Set(['admitted', 'secret-detector-match', 'active-content']));
  });
  it.each([
    ['another rule text', (e: Record<string, unknown>) => ({ ...e, rule: `${e['rule'] as string} ` })],
    ['an extension that is no source extension', (e: Record<string, unknown>) => ({ ...e, exemptExtensions: ['.c', '.md'] })],
    ['an extra field', (e: Record<string, unknown>) => ({ ...e, scope: 'all' })],
  ])('refuses a policy whose exemption has %s, as the app does', async (_name, mutate) => {
    const scope = V3['all']!, active = scope['activeContent'] as Record<string, unknown>;
    const policy = policyOf({ ...scope, activeContent: { ...active, codeContentExemption: mutate(active['codeContentExemption'] as Record<string, unknown>) } });
    expect(buildDossierScreen(encode(policy), true)).toMatchObject({ ok: false, why: expect.stringContaining('its code-content exemption') });
    await expect(appScreen(policy, true)).rejects.toThrow();
  });
});

// P-110 (owner act of 2026-10-20; syzygy-3sjj): the version-4 scope's secret redaction, in both screens. The scope is the live
// policy's (the variant-span bytes the act binds); the bodies are the version-4 builder's own fixtures with its reference oracle's answers
// (scripts/build_public_source_screening_scope_v4.py `withheld_lines`), so the TypeScript reading is held to the oracle in both screens.
describe('the secret redaction of screening scope version 4', () => {
  type TargetScreen = { screenTargetBody: (b: string, p: string) => { kind: string; withheld?: readonly number[]; retained?: string }; screenBody: (b: string, p?: string) => string | undefined; secretRedaction: boolean };
  let fixtures: { body: { name: string; body: string; oracle: number[] | null }[]; whole: { name: string; path: string; body: string; oracle: number[] | null }[]; v4Scope: Record<string, unknown> } = { body: [], whole: [], v4Scope: {} };
  beforeAll(async () => {
    const py = `import json, sys; sys.path.insert(0, 'scripts'); import build_public_source_screening_scope_v4 as b, build_public_source_screening_scope_v5 as b5, build_public_source_screening_scope_v6 as b6
policy = open(str(b.ROOT / b.POLICY)).read()
v5_bcd, _mode = b6.base_bytes()
v4 = b5.v2.reverse_patch((b5.ROOT / b5.patch_path(b6.V5_BASE_VARIANT)).read_text(), v5_bcd)
assert b5.sha(v4) == b5.v4.manifest_rows(b5.ROOT)[b5.V4_BASE_VARIANT]
srt = lambda s: None if s is None else sorted(s)
sys.stdout.write(json.dumps({'body': [{'name': n, 'body': body, 'oracle': srt(b.withheld_lines(body, policy))} for n, body, _w in b.BODY_FIXTURES],
  'whole': [{'name': n, 'path': p, 'body': body, 'oracle': srt(b.withheld_lines(body, policy, p))} for n, p, body in b.WHOLE_FIXTURES],
  'v4Scope': json.loads(v4)[b.SCOPE_KEY]}))`;
    fixtures = JSON.parse((await execFileAsync('python3', ['-c', py], { cwd: REAL_ROOT })).stdout) as typeof fixtures;
  });
  const both = async (scope: unknown = LIVE.publicSourceScope): Promise<readonly [TargetScreen, TargetScreen]> => {
    const policy = policyOf(scope);
    const ours = buildDossierScreen(encode(policy), true);
    if (!ours.ok) throw new Error(ours.why);
    return [ours.screen, (await appScreen(policy, true)) as unknown as TargetScreen];
  };
  const withheldOf = (got: { kind: string; withheld?: readonly number[] }): readonly number[] | null => (got.kind === 'redacted' ? got.withheld! : got.kind === 'admitted' ? [] : null);

  it('declares the redaction in both screens', async () => {
    expect((await both()).map((screen) => screen.secretRedaction)).toEqual([true, true]);
  });
  it('withholds the oracle\'s lines for every builder body fixture, as README.md, in both screens', async () => {
    expect(fixtures.body.length).toBe(16);
    for (const screen of await both()) {
      for (const fixture of fixtures.body) expect(withheldOf(screen.screenTargetBody(fixture.body, 'README.md')), fixture.name).toEqual(fixture.oracle);
    }
    // The population reaches all three outcomes, so agreement is not agreement on one answer.
    const [ours] = await both();
    expect(new Set(fixtures.body.map((fixture) => ours.screenTargetBody(fixture.body, 'README.md').kind))).toEqual(new Set(['admitted', 'redacted', 'excluded']));
  });
  it('excludes every builder whole-file fixture whole at its own path, in both screens', async () => {
    expect(fixtures.whole.length).toBe(3);
    for (const screen of await both()) {
      for (const fixture of fixtures.whole) {
        expect(fixture.oracle, fixture.name).toBeNull();
        expect(screen.screenTargetBody(fixture.body, fixture.path), fixture.name).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
      }
    }
  });
  it('keeps screenBody whole-text: agent text and untaught consumers still exclude a redactable body whole', async () => {
    const body = `a\n${['to', 'ken'].join('')}=${'abcdefgh12345678'}\nb\nc\n`;
    for (const screen of await both()) {
      expect(screen.screenTargetBody(body, 'README.md')).toMatchObject({ kind: 'redacted', withheld: [1, 2, 3], retained: '\n\n\nc\n' });
      expect(screen.screenBody(body, 'README.md')).toBe('secret-detector-match');
      expect(screen.screenBody(body)).toBe('secret-detector-match');
    }
  });
  // Under the version-4 bytes (recovered by reversing version 5's patch) a project-documentation body is scanned for active content.
  // Under version 5 (variant bcd) projectDocumentationExemption lifts that scan, so the same bodies are retained redacted; a page that
  // cannot confirm the renderCondition rescans the complete body (render.ts), which the render tests pin.
  it('runs the active-content scan over the complete body of a redacted one, excluding it whole (version 4), and not under version 5', async () => {
    const body = `${['to', 'ken'].join('')}=${'abcdefgh12345678'}\nx\ny\n<script>run()</script>\n`;
    for (const screen of await both(fixtures.v4Scope)) expect(screen.screenTargetBody(body, 'README.md')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    for (const screen of await both()) expect(screen.screenTargetBody(body, 'README.md')).toMatchObject({ kind: 'redacted', withheld: [1, 2] });
  });
  it('runs the active-content scan over the withheld lines too: active content only on a matched line excludes the body whole (version 4)', async () => {
    // The retained text (lines 2 to 4 emptied) holds no active content, so a scan of the retained text alone would admit it.
    const body = `a\nb\n<script>run()</script> ${['to', 'ken'].join('')}=${'abcdefgh12345678'}\nc\nd\n`;
    for (const screen of await both(fixtures.v4Scope)) expect(screen.screenTargetBody(body, 'README.md')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    for (const screen of await both()) expect(screen.screenTargetBody(body, 'README.md')).toMatchObject({ kind: 'redacted', withheld: [2, 3, 4] });
  });
  it.each([
    ['another rule text', (r: Record<string, unknown>) => ({ ...r, rule: `${r['rule'] as string} ` })],
    ['a line pattern anchored to the body', (r: Record<string, unknown>) => ({ ...r, wholeArtifactLinePattern: '^-----BEGIN ' })],
    ['an extra field', (r: Record<string, unknown>) => ({ ...r, scope: 'all' })],
  ])('refuses a policy whose redaction has %s, as the app does', async (_name, mutate) => {
    const scope = LIVE.publicSourceScope as Record<string, unknown>;
    const policy = policyOf({ ...scope, secretRedaction: mutate(scope['secretRedaction'] as Record<string, unknown>) });
    expect(buildDossierScreen(encode(policy), true)).toMatchObject({ ok: false, why: expect.stringContaining('its secret redaction') });
    await expect(appScreen(policy, true)).rejects.toThrow();
  });
});

describe('the screen of the policy in force', () => {
  it('loads the policy the act chain puts in force, naming its digest', async () => {
    const policy = policyOf();
    const result = await loadDossierScreen(recordsRoot(policy), NOW);
    expect(result).toMatchObject({ ok: true, screen: { policyId: 'fixture', policyVersion: '1', policySha256: sha(policy) } });
  });

  it('refuses a policy whose bytes are not the act\'s argument', async () => {
    const policy = policyOf();
    expect(await loadDossierScreen(recordsRoot(policy, sha(`${policy} `)), NOW)).toMatchObject({ ok: false, why: expect.stringContaining('no screening policy is in force') });
  });

  it('refuses a policy changed between the act check and the read the screen is built from', async () => {
    const policy = policyOf();
    const edited = policyOf({ contentClassification: { rules: [{ class: 'code-content', sourceExtensions: ['.md'] }] } });
    expect(await loadDossierScreen(recordsRoot(policy), NOW, () => Buffer.from(edited))).toEqual({
      ok: false, why: 'the screening policy changed after its act was checked; its bytes differ from the act\'s argument',
    });
  });

  it('refuses before the act takes effect', async () => {
    expect(await loadDossierScreen(recordsRoot(policyOf()), Date.UTC(2026, 9, 3))).toMatchObject({ ok: false });
  });

  // syzygy-2coz, the scope's prerequisite: the class is classified only while the RFC5-14 class amendment act is in force.
  it.each<[string, ClassAct, boolean]>([
    ['in force', {}, true],
    ['absent', null, false],
    ['naming another module digest', { argument: sha(`${MODULE_TEXT} `) }, false],
    ['not yet in force', { date: '2026-10-08' }, false],
    ['withdrawn', { withdrawn: true }, false],
  ])('classifies project documentation only while the class act is in force: %s', async (_name, classAct, classified) => {
    const result = await loadDossierScreen(recordsRoot(policyOf(DOC_SCOPE), undefined, classAct), NOW);
    if (!result.ok) throw new Error(result.why);
    expect(result.screen.projectDocumentation).toBe(classified);
    expect(result.screen.screenPath('README.md')).toBe(classified ? undefined : 'unknown-extraction-class');
    expect(result.screen.screenPath('src/server.c')).toBeUndefined();
  });

  // syzygy-s6xo: this checkout's own state, read from the tree, so the pin holds on either side of the sitting that records the
  // screening acts: refused while no screening-scope act is recorded, built once one is and the policy declares the scope.
  it('builds the screen on this checkout exactly when a screening-scope act is recorded and the policy declares the scope', async () => {
    const recorded = ['PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-ACT.md', 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md']
      .some(file => fs.existsSync(path.join(REAL_ROOT, DECISIONS_DIR, file)));
    const load = await loadDossierScreen(REAL_ROOT, Date.now());
    if (!recorded) expect(load).toEqual({ ok: false, why: 'no screening policy is in force: no screening-scope policy act is recorded' });
    else if (Object.hasOwn(LIVE, 'publicSourceScope')) expect(load).toMatchObject({ ok: true });
    else expect(load).toEqual({ ok: false, why: 'the screening policy cannot be applied: it carries no publicSourceScope' });
  });

  // syzygy-2coz: on this checkout the class is classified exactly when its act is recorded and the policy carries its rule.
  it('classifies project documentation on this checkout exactly when the class act is recorded and the policy carries the rule', async () => {
    const load = await loadDossierScreen(REAL_ROOT, Date.now());
    if (!load.ok) {
      expect(fs.existsSync(path.join(REAL_ROOT, DECISIONS_DIR, 'PWB-SECRET-CLASSIFICATION-POLICY-PUBLIC-SOURCE-SCOPE-V2-ACT.md'))).toBe(false);
      return;
    }
    const hasRule = JSON.stringify(LIVE.publicSourceScope ?? {}).includes('"class":"project-documentation"');
    const recorded = fs.existsSync(path.join(REAL_ROOT, CLASS_ACT_FILE));
    expect(load.screen.projectDocumentation).toBe(hasRule && recorded);
    expect(load.screen.screenPath('README.md')).toBe(hasRule && recorded ? undefined : 'unknown-extraction-class');
  });
});
