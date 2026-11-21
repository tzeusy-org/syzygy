import { readFileSync } from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { beforeAll, describe, expect, it } from 'vitest';

import { parseRunConfig } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, encodeRunRecord, NO_WORK_ITEM_REASON, readRunRecord, type RunSubject } from './run-record.js';
import { buildDossierScreen, type DossierScreen } from './screen.js';

// syzygy-3efd.24: the dossier's screen under the declared-source policy successor 2.0.0 (REQ-polaris-generation-046 from specification
// version 2.6, adoption row A-22), beside its predecessor. Expected outcomes are literals written from the policy text, path by path and
// body by body; the predecessor's outcomes over the same population are fixed by running the predecessor screen, as the requirement's
// oracle says. Planted values are fake and assembled from pieces, as the other detector tests write theirs.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const V1_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json';
const V2_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const V1 = readFileSync(path.join(ROOT, V1_PATH), 'utf8');
const V2 = readFileSync(path.join(ROOT, V2_PATH), 'utf8');
const SUBJECT = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
const build = (text: string, visibility: 'public' | 'private') => buildDossierScreen(new TextEncoder().encode(text), true, SUBJECT, visibility);
const screenOf = (text: string, visibility: 'public' | 'private' = 'public'): DossierScreen => {
  const load = build(text, visibility);
  if (!load.ok) throw new Error(load.why);
  return load.screen;
};
const outcomeOf = (screen: DossierScreen, repositoryPath: string): string => screen.screenPath(repositoryPath) ?? `${screen.contentClass(repositoryPath)}/${screen.stageOf(repositoryPath)}`;

const PW = ['pass', 'word'].join('');
const VALUE = ['hunter2', 'hunter2'].join('');
const CREDENTIAL_LINE = `${PW} = "${VALUE}"`;

describe('the successor screen', () => {
  let screen: DossierScreen;
  beforeAll(() => { screen = screenOf(V2); });
  it('binds version 2.0.0 with its two stages and six configuration detectors', () => {
    expect([screen.policyVersion, screen.twoStage, screen.configurationDetectors, screen.scopeDetectors]).toEqual(['dossier-declared-source/2.0.0', true, 6, 4]);
    const predecessor = screenOf(V1);
    expect([predecessor.policyVersion, predecessor.twoStage, predecessor.configurationDetectors]).toEqual(['dossier-declared-source/1.0.0', false, 0]);
  });

  it('design and decision documents are governance-text, and the run record names that class', () => {
    expect(['design/storage.rst', 'pkg/design-overview.rst', 'docs/adr/0001-use-postgres.md', 'ARCHITECTURE.md'].map(p => outcomeOf(screen, p)))
      .toEqual(['governance-text/2', 'governance-text/2', 'unknown-extraction-class', 'unknown-extraction-class']);
    expect(screen.screenTargetBody('Use Postgres\n============\n\nWe chose it.\n', 'design/storage.rst')).toEqual({ kind: 'admitted' });
    const parsed = parseRunConfig(JSON.stringify({ operator: 'o', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic', model: 'm',
      deadline: 'PT1H', agentTurnBudget: 10, maxRepairCycles: 1, maxQuestions: 0, audience: 'a reader', operatorIsOwner: false }));
    if (!parsed.ok) throw new Error('fixture configuration refused');
    const subject: RunSubject = {
      repository: { url: 'github.com/o/r', repositoryId: 'o-r', role: 'observed-source' },
      clone: { path: '/srv/clones/r', declaredBy: 'operator', label: 'Inferred', use: 'read' },
      pinnedRevision: { commit: 'a'.repeat(40), label: 'HEAD', pinnedAt: '2026-11-22T10:00:00.000Z' },
      screeningPolicy: { path: V2_PATH, commit: 'b'.repeat(40), policyId: 'polaris-butlers-project-shape-secrets', policyVersion: 'dossier-declared-source/2.0.0', sha256: screen.policySha256 },
      contentClasses: DOSSIER_CONTENT_CLASSES,
      visibility: { value: 'public', source: 'declaration', declaredBy: 'o', label: 'Inferred' },
      governed: { kind: 'non-governed', because: ['fixture'] },
      workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
    };
    const read = readRunRecord(encodeRunRecord(parsed.config, subject));
    expect(read.ok && [read.record.subject.screeningPolicy.path, read.record.subject.contentClasses]).toEqual([V2_PATH, ['code-content', 'project-documentation', 'governance-text']]);
    for (const [bound, ok] of [[V1_PATH, true], [V2_PATH, true], ['.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v3.json', false]] as const) {
      const text = encodeRunRecord(parsed.config, { ...subject, screeningPolicy: { ...subject.screeningPolicy, path: bound } });
      expect(readRunRecord(text).ok).toBe(ok);
    }
  });

  it('the configuration and code paths the review found admitted stay indeterminate, beside an admitted control', () => {
    expect(['reports/benchmark-results.json', 'test-output.json', 'audit-log.yaml', 'security-policy.yaml', 'governance/decisions.json', 'SECURITY.yml', 'config/app.json']
      .map(p => outcomeOf(screen, p))).toEqual(['unknown-extraction-class', 'unknown-extraction-class', 'unknown-extraction-class', 'unknown-extraction-class',
      'unknown-extraction-class', 'unknown-extraction-class', 'code-content/2']);
  });

  it('withheld words, notebooks and vendored paths stay withheld', () => {
    for (const p of ['docs/security/policy.md', 'GOVERNANCE.md', 'CODE_OF_CONDUCT.md', 'SecurityPolicy.md', 'pkg/CodeOfConduct.md', 'docs/decisions/0001-x.md',
      'reports/q3-audit.md', 'notebooks/intro.ipynb', 'node_modules/x/README.md', 'vendor/k8s/deploy.yaml']) {
      expect([p, outcomeOf(screen, p)]).toEqual([p, 'unknown-extraction-class']);
    }
  });

  it('nested documentation is admitted and scanned, and the root README keeps its exemption', () => {
    const BADGE = '# API\n\n<img src="badge.svg" alt="build">\n';
    expect([outcomeOf(screen, 'packages/api/README.md'), outcomeOf(screen, 'packages/api/docs/guide.md'), outcomeOf(screen, 'packages/api/docs/guide.adoc'), outcomeOf(screen, 'README.md')])
      .toEqual(['project-documentation/2', 'project-documentation/2', 'unknown-extraction-class', 'project-documentation/1']);
    expect(screen.screenTargetBody('# Guide\n\nRun it.\n', 'packages/api/docs/guide.md')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody(BADGE, 'packages/api/README.md')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    expect(screen.screenBody(BADGE, 'packages/api/README.md')).toBe('active-content');
    expect(screen.screenTargetBody(BADGE, 'README.md')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody(BADGE, 'README.md')).toEqual(screenOf(V1).screenTargetBody(BADGE, 'README.md'));
  });

  it('a Stage-2 code-content body is scanned for active content with no exemption; a Stage-1 source file keeps its exemption', () => {
    expect(screen.screenTargetBody('{"a": "<b>x</b>"}\n', 'config/app.json')).toEqual({ kind: 'excluded', outcome: 'active-content' });
    expect(screen.screenTargetBody('int f(int a, int b) { return a<b && b>a; }\n', 'src/a.c')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody('int f(int a, int b) { return a<b && b>a; }\n', 'src/a.cxx')).toEqual({ kind: 'excluded', outcome: 'active-content' });
  });
});

describe.each(['public', 'private'] as const)('configuration under %s visibility', visibility => {
  let screen: DossierScreen;
  beforeAll(() => { screen = screenOf(V2, visibility); });
  it('the three planted secrets are excluded whole and Cargo.toml is admitted as code-content', () => {
    const json = `{"${PW}": "${VALUE}"}\n`;
    const yml = `${['SECRET', 'KEY', 'BASE'].join('_')}: ${['abcdef', '0123456789'].join('')}\n`;
    const manifest = 'apiVersion: v1\nkind: Secret\nmetadata:\n  name: app\n';
    const cargo = '[package]\nname = "x"\nversion = "0.1.0"\nedition = "2021"\n';
    expect([
      screen.screenTargetBody(json, 'config/app.json'), screen.screenTargetBody(yml, 'config/app.yml'), screen.screenTargetBody(manifest, 'deploy/secret.yaml'),
      screen.screenTargetBody(cargo, 'Cargo.toml'), outcomeOf(screen, 'Cargo.toml'),
    ]).toEqual([
      { kind: 'excluded', outcome: 'secret-detector-match' }, { kind: 'excluded', outcome: 'secret-detector-match' }, { kind: 'excluded', outcome: 'secret-detector-match' },
      { kind: 'admitted' }, 'code-content/2',
    ]);
    expect(screen.visibility).toBe(visibility);
  });
  it('a Stage-2 project-documentation body with one credential-assignment match is excluded whole, never redacted', () => {
    const body = ['# Guide', '', 'Run it.', '', CREDENTIAL_LINE, '', 'Then stop.', '', 'End.', ''].join('\n');
    expect(screen.screenTargetBody(body, 'packages/api/docs/guide.md')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    expect(screen.screenTargetBody(body, 'design/x.md')).toEqual({ kind: 'excluded', outcome: 'secret-detector-match' });
    // The same body under a Stage-1 path keeps the predecessor's outcome: redacted on a public repository, excluded whole on a private one.
    const stageOne = screen.screenTargetBody(body, 'docs/guide.md');
    expect(stageOne.kind === 'redacted' ? ['redacted', stageOne.withheld] : stageOne).toEqual(visibility === 'public' ? ['redacted', [4, 5, 6]] : { kind: 'excluded', outcome: 'secret-detector-match' });
    expect(stageOne).toEqual(screenOf(V1, visibility).screenTargetBody(body, 'docs/guide.md'));
  });
});

describe('the configuration detectors over agent text and cited spans', () => {
  let screen: DossierScreen, predecessor: DossierScreen;
  beforeAll(() => { screen = screenOf(V2); predecessor = screenOf(V1); });
  const QUOTED = `${['aws', 'secret', 'access', 'key'].join('_')} = AbCdEfGhIjKlMn`;
  const JSON_LINE = `  "${PW}": "${VALUE}",\n`;
  it('refuse agent text quoting a configuration secret, which the predecessor admits', () => {
    expect([screen.screenBody(QUOTED), predecessor.screenBody(QUOTED)]).toEqual(['secret-detector-match', undefined]);
    expect([screen.screenBody(JSON_LINE), predecessor.screenBody(JSON_LINE)]).toEqual(['secret-detector-match', undefined]);
  });
  // The render step's rescan of a whole admitted body (a page that cannot be confirmed to meet the renderCondition): the detectors of the
  // body's stage, then the active-content scan with no exemption. A Stage-1 body keeps the predecessor's answer, which is screenBody(body).
  it('rescan a Stage-2 body with them, and a Stage-1 body as the predecessor does', () => {
    const quoted = `# Setup\n\n${JSON_LINE}`;
    const badge = '# R\n\n<img src="badge.svg" alt="build">\n';
    expect([screen.scannedAsBefore(JSON_LINE, 'config/app.json'), screen.scannedAsBefore(quoted, 'docs/setup.md'), screen.scannedAsBefore(badge, 'README.md'),
      screen.scannedAsBefore('# R\n\nA store.\n', 'README.md')]).toEqual([true, false, true, false]);
    expect([predecessor.screenBody(quoted) !== undefined, predecessor.screenBody(badge) !== undefined]).toEqual([false, true]);
  });
  it('screen a Stage-2 span or body given its path, and never a Stage-1 one', () => {
    expect(screen.screenBody(JSON_LINE, 'config/app.json')).toBe('secret-detector-match');
    expect(screen.screenBody(JSON_LINE, 'docs/setup.md')).toBeUndefined();
    expect(screen.screenTargetBody(`# Setup\n\n${JSON_LINE}`, 'docs/setup.md')).toEqual({ kind: 'admitted' });
    expect(screen.screenTargetBody(`# Setup\n\n${JSON_LINE}`, 'docs/setup.md')).toEqual(predecessor.screenTargetBody(`# Setup\n\n${JSON_LINE}`, 'docs/setup.md'));
  });
});

// Every denied entry the successor adds, in its own and in upper case, and every predecessor entry.
const NEW_BASENAMES = ['.npmrc', '.netrc', '_netrc', '.pypirc', '.git-credentials', '.dockercfg', '.dockerconfigjson', '.pgpass', '.htpasswd', '.s3cfg', '.boto', 'kubeconfig',
  'kubeconfig.yaml', 'kubeconfig.yml', 'kubeconfig.json', 'id_dsa', 'id_ecdsa', 'id_ecdsa_sk', 'id_ed25519_sk', 'secrets.yml', 'secrets.yaml', 'secrets.toml',
  'credentials.yml', 'credentials.yaml', 'credentials.toml'];
const NEW_SUFFIXES = ['.tfstate', '.tfstate.backup', '.tfvars', '.tfvars.json', '.kubeconfig', '.ppk', '.jks', '.keystore'];
const NEW_DIRECTORIES = ['.ssh', '.gnupg', '.aws', '.kube', '.docker', '.terraform'];
const PREDECESSOR_DENIED = ['.env', '.env.local', '.env.production', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519', '.env.staging', 'keys/server.pem', 'a.key', 'cert.p12', 'cert.pfx'];
describe('credential paths are denied before any read', () => {
  let screen: DossierScreen, predecessor: DossierScreen;
  beforeAll(() => { screen = screenOf(V2); predecessor = screenOf(V1); });
  it('the scenario paths', () => {
    for (const p of ['terraform.tfstate', 'env/prod.tfvars', '.npmrc', '.netrc', 'kubeconfig', 'config/secrets.yml', '.kube/config', 'deploy/.docker/config.json', '.ssh/deploy.sh']) {
      expect([p, screen.screenPath(p), screen.contentClass(p), screen.stageOf(p)]).toEqual([p, 'denied-path', undefined, undefined]);
    }
  });
  it.each(NEW_BASENAMES)('basename %s, at the root, nested and in upper case', name => {
    for (const p of [name, `config/${name}`, `config/${name.toUpperCase()}`]) expect([p, screen.screenPath(p)]).toEqual([p, 'denied-path']);
    expect(screen.screenPath(`${name}.d/notes.md`)).not.toBe('denied-path');
  });
  it.each(NEW_SUFFIXES)('suffix %s, and in upper case', suffix => {
    for (const p of [`infra/prod${suffix}`, `infra/PROD${suffix.toUpperCase()}`]) expect([p, screen.screenPath(p)]).toEqual([p, 'denied-path']);
  });
  it.each(NEW_DIRECTORIES)('directory %s at each depth and in upper case, never the final segment', name => {
    for (const p of [`${name}/x.sh`, `home/u/${name}/config.yml`, `a/${name.toUpperCase()}/b/c.c`]) expect([p, screen.screenPath(p)]).toEqual([p, 'denied-path']);
    expect(screen.screenPath(`conf/${name}`)).toBe('unknown-extraction-class');
  });
  it('every path the predecessor denies is still denied', () => {
    for (const p of PREDECESSOR_DENIED) expect([p, predecessor.screenPath(p), screen.screenPath(p)]).toEqual([p, 'denied-path', 'denied-path']);
  });
});

// Screens are built in beforeAll, so a policy the screen refuses fails each test rather than the file's collection.
// The controlled tree of the requirement's "Predecessor outcomes preserved" scenario, screened under both versions: paths and bodies.
const POPULATION = ['README.md', 'docs/setup.md', 'docs/adr/x.md', 'docs/DesignDoc.md', 'docs/build-log.txt', 'licenses/MIT.txt', 'SECURITY.md', 'MANIFESTO.md', 'src/server.c',
  'setup.py', 'vendor/x.c', 'src/README.md', 'ARCHITECTURE.md', 'Cargo.toml', 'config/app.json', 'Dockerfile', 'main.tf', 'notebooks/a.ipynb', 'node_modules/x/README.md',
  'GOVERNANCE.md', 'pkg/DesignDoc.md', '.ssh/deploy.sh', '.aws/x.py', 'deploy/.docker/x.json', '.kube/config', 'terraform.tfstate', '.npmrc', '.env', 'keys/a.pem',
  'x/docs/n.txt', 'src/a.scala', 'bin/changes', 'design/x.md', 'docs/security.md', 'images/logo.png', 'Makefile', 'docs/rfc0001.md', 'licenses/x-spec.txt',
  'design/x.rst', 'reports/benchmark-results.json'];
const NEWLY_DENIED = ['.ssh/deploy.sh', '.aws/x.py', 'deploy/.docker/x.json', '.kube/config', 'terraform.tfstate', '.npmrc'];
describe('predecessor outcomes are preserved', () => {
  let before: DossierScreen, after: DossierScreen;
  beforeAll(() => { before = screenOf(V1); after = screenOf(V2); });
  it('every path the predecessor places keeps its class, except below a new denied directory', () => {
    const placed = POPULATION.filter(p => before.screenPath(p) === undefined);
    expect(placed.filter(p => !(outcomeOf(after, p) === `${before.contentClass(p)}/1` || (NEW_DIRECTORIES.some(d => p.split('/').slice(0, -1).includes(d)) && after.screenPath(p) === 'denied-path'))))
      .toEqual([]);
    expect(placed.filter(p => after.screenPath(p) === 'denied-path')).toEqual(['.ssh/deploy.sh', '.aws/x.py']);
  });
  it('a path the predecessor leaves indeterminate keeps that outcome, becomes denied, or is placed by the second stage', () => {
    const indeterminate = POPULATION.filter(p => before.screenPath(p) === 'unknown-extraction-class');
    expect(indeterminate.map(p => [p, outcomeOf(after, p)])).toEqual([
      ['docs/adr/x.md', 'unknown-extraction-class'], ['src/README.md', 'project-documentation/2'], ['ARCHITECTURE.md', 'unknown-extraction-class'], ['Cargo.toml', 'code-content/2'],
      ['config/app.json', 'code-content/2'], ['Dockerfile', 'code-content/2'], ['main.tf', 'code-content/2'], ['notebooks/a.ipynb', 'unknown-extraction-class'],
      ['node_modules/x/README.md', 'unknown-extraction-class'], ['GOVERNANCE.md', 'unknown-extraction-class'], ['pkg/DesignDoc.md', 'unknown-extraction-class'],
      ['deploy/.docker/x.json', 'denied-path'], ['.kube/config', 'denied-path'], ['terraform.tfstate', 'denied-path'], ['.npmrc', 'denied-path'],
      ['x/docs/n.txt', 'unknown-extraction-class'], ['src/a.scala', 'unknown-extraction-class'], ['bin/changes', 'unknown-extraction-class'], ['design/x.md', 'unknown-extraction-class'],
      ['docs/security.md', 'unknown-extraction-class'], ['images/logo.png', 'unknown-extraction-class'], ['Makefile', 'code-content/2'], ['licenses/x-spec.txt', 'unknown-extraction-class'],
      ['design/x.rst', 'governance-text/2'], ['reports/benchmark-results.json', 'unknown-extraction-class'],
    ]);
    expect(NEWLY_DENIED.every(p => after.screenPath(p) === 'denied-path')).toBe(true);
  });
  it('every Stage-1 body keeps its outcome under either visibility', () => {
    const BODIES: [string, string][] = [
      ['README.md', '# R\n\nA store.\n'], ['README.md', ['# Setup', '', 'Run.', '', CREDENTIAL_LINE, '', 'Stop.', '', 'End.', ''].join('\n')],
      ['README.md', '<script>alert(1)</script>\n'], ['README.md', '-----BEGIN RSA PRIVATE KEY-----\nabc\n'], ['src/server.c', 'int main(void) { return 0; }\n'],
      ['src/server.c', `const char *${PW} = "${VALUE}";\n`], ['src/server.c', 'List<String> a;\n'], ['SECURITY.md', '# Policy\n\n<b>x</b>\n'],
      ['docs/setup.md', `{"${PW}": "${VALUE}"}\n`], ['setup.py', `token = "${'z'.repeat(12)}"\n`],
    ];
    for (const visibility of ['public', 'private'] as const) {
      const one = screenOf(V1, visibility), two = screenOf(V2, visibility);
      expect(BODIES.map(([p, b]) => two.screenTargetBody(b, p))).toEqual(BODIES.map(([p, b]) => one.screenTargetBody(b, p)));
      expect(BODIES.map(([p, b]) => two.screenBody(b, p))).toEqual(BODIES.map(([p, b]) => one.screenBody(b, p)));
    }
  });
});

// Each text the screen reads beside the two-stage decision, and each structural requirement, mutated in the successor bytes: refused.
const v2With = (change: (policy: Record<string, any>) => void): string => { const policy = JSON.parse(V2); change(policy); return JSON.stringify(policy); };
const v1With = (change: (policy: Record<string, any>) => void): string => { const policy = JSON.parse(V1); change(policy); return JSON.stringify(policy); };
describe('a successor the screen does not implement refuses', () => {
  it.each<[string, string, string]>([
    ['an edited classDecision', v2With(p => { p.publicSourceScope.contentClassification.classDecision += ' '; }), 'its two-stage class decision text is not the text this screen implements'],
    ['no configurationDetectors', v2With(p => { delete p.publicSourceScope.configurationDetectors; }), 'its two-stage class decision comes without configurationDetectors'],
    ['an edited configuration-detector rule', v2With(p => { p.publicSourceScope.configurationDetectors.rule += ' '; }), 'its configuration detectors rule is not the text this screen implements'],
    ['a configuration detector that does not compile', v2With(p => { p.publicSourceScope.configurationDetectors.detectors[0].pattern = '('; }), 'its configuration detectors do not compile'],
    ['no deniedDirectoryNames', v2With(p => { delete p.sourceAdmission.deniedDirectoryNames; }), 'its two-stage class decision comes without deniedDirectoryNames'],
    ['an empty deniedDirectoryNames', v2With(p => { p.sourceAdmission.deniedDirectoryNames = []; }), 'its deniedDirectoryNames or the pathRuleScope that states them are not the rules this screen implements'],
    ['a directory name with a slash', v2With(p => { p.sourceAdmission.deniedDirectoryNames.push('a/b'); }), 'its deniedDirectoryNames or the pathRuleScope that states them are not the rules this screen implements'],
    ['the predecessor pathRuleScope', v2With(p => { p.sourceAdmission.pathRuleScope = JSON.parse(V1).sourceAdmission.pathRuleScope; }), 'its deniedDirectoryNames or the pathRuleScope that states them are not the rules this screen implements'],
    ['the predecessor project-documentation exemption', v2With(p => { p.publicSourceScope.activeContent.projectDocumentationExemption.appliesTo = JSON.parse(V1).publicSourceScope.activeContent.projectDocumentationExemption.appliesTo; }), 'its project-documentation exemption appliesTo is not the text this screen implements'],
    ['the predecessor redaction appliesTo', v2With(p => { p.publicSourceScope.secretRedaction.appliesTo = JSON.parse(V1).publicSourceScope.secretRedaction.appliesTo; }), 'its secret redaction appliesTo is not the text this screen implements'],
    ['the predecessor visibility unchanged', v2With(p => { p.publicSourceScope.sourceVisibility.unchanged = JSON.parse(V1).publicSourceScope.sourceVisibility.unchanged; }), 'its source visibility unchanged is not the text this screen implements'],
    ['configurationDetectors on the predecessor', v1With(p => { p.publicSourceScope.configurationDetectors = JSON.parse(V2).publicSourceScope.configurationDetectors; }), 'its configurationDetectors come without the two-stage class decision'],
    ['deniedDirectoryNames on the predecessor', v1With(p => { p.sourceAdmission.deniedDirectoryNames = ['.ssh']; }), 'its deniedDirectoryNames come without the two-stage class decision'],
  ])('%s', (_name, policy, why) => {
    for (const visibility of ['public', 'private'] as const) {
      const load = build(policy, visibility);
      expect(load.ok ? 'admitted' : load.why).toContain(`the screening policy cannot be applied: ${why}`);
    }
  });
});
