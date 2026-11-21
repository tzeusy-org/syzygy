import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import {
  classDecision, deniedDirectory, documentationExempt, codeContentExempt, readGovernanceTextRule, readProjectDocumentationExemption, readProjectDocumentationRule,
  readSecondStage, secondStageRules, type ClassDecision, type ProjectDocumentationRule, type SecondStageRules,
} from './public-source-classification.js';
import { readSecretRedaction } from './secret-redaction.js';
import { readSourceVisibility } from './source-visibility.js';

// syzygy-3efd.24: the two-stage class decision of the dossier declared-source policy 2.0.0 (REQ-polaris-generation-046 from
// specification version 2.6, adoption row A-22). The input is the committed successor; every expected class below is a literal written
// from the policy text, path by path, never computed by the module under test.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const V2_PATH = '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v2.json';
const V2 = JSON.parse(readFileSync(path.join(ROOT, V2_PATH), 'utf8'));
const CLASSIFICATION: Record<string, unknown> = V2.publicSourceScope.contentClassification;
const ALL_RULES = CLASSIFICATION['rules'] as Record<string, unknown>[];
const STAGE_ONE = ALL_RULES.filter(rule => !Object.hasOwn(rule, 'id'));
const EXTENSIONS = STAGE_ONE.find(rule => rule['class'] === 'code-content')!['sourceExtensions'] as string[];
const copy = <T>(value: T): T => JSON.parse(JSON.stringify(value)) as T;

const documentationRule = (): ProjectDocumentationRule => {
  const read = readProjectDocumentationRule(STAGE_ONE, EXTENSIONS);
  if (!read.ok || read.rule === null) throw new Error('the successor carries no readable project-documentation rule');
  return read.rule;
};
const stageOf = (classification: unknown = CLASSIFICATION) => readSecondStage(classification, documentationRule(), EXTENSIONS);
const second = (): SecondStageRules => {
  const read = stageOf();
  if (!read.ok || read.stage === null) throw new Error(read.ok ? 'no second stage' : read.why);
  return read.stage;
};
const governanceTextPaths = (): readonly string[] => {
  const read = readGovernanceTextRule({ ...CLASSIFICATION, rules: STAGE_ONE });
  if (!read.ok || read.paths === null) throw new Error('no governance-text paths');
  return read.paths;
};
const decide = (repositoryPath: string): ClassDecision | undefined =>
  classDecision(repositoryPath, EXTENSIONS, documentationRule(), { governanceTextPaths: governanceTextPaths(), subject: null }, second());
const outcome = (repositoryPath: string): string => {
  const found = decide(repositoryPath);
  return found === undefined ? 'indeterminate' : `${found.contentClass}/${found.stage}`;
};

describe('the successor second stage reads', () => {
  it('with exactly the lists the policy gives', () => {
    expect(second()).toEqual({
      governanceTextExtensions: ['.md', '.mdx', '.rst', '.adoc', '.asciidoc'],
      governanceTextTokens: ['adr', 'adrs', 'rfc', 'rfcs', 'spec', 'specs', 'specification', 'specifications', 'design', 'designs', 'architecture', 'architectures', 'manifesto', 'manifestos'],
      proseExtensions: ['.md', '.mdx', '.rst', '.adoc', '.asciidoc'],
      docTreeRootsAnyDepth: ['docs', 'doc', 'documentation'],
      configurationExtensions: ['.yml', '.yaml', '.toml', '.json', '.tf', '.hcl', '.proto', '.cmake', '.mk', '.mak', '.dockerfile', '.Dockerfile'],
      languageExtensions: LANGUAGE_EXTENSIONS,
      sourceFileNames: ['Dockerfile', 'Containerfile', 'Makefile', 'makefile', 'GNUmakefile', 'CMakeLists.txt'],
      sourceFileNamePrefixes: ['Dockerfile.', 'Containerfile.'],
      withheldTokens: ['decision', 'decisions', 'governance', 'policy', 'policies', 'security', 'conduct', 'doctrine', 'doctrines', 'principle', 'principles'],
      vendoredDirectoryNames: ['node_modules', 'bower_components', 'jspm_packages', 'vendor', 'vendored', 'third_party', 'third-party', 'thirdparty', 'external', 'externals', 'extern'],
      withheldStems: ['governance', 'polic', 'security', 'conduct', 'doctrine', 'principle', 'decision', 'report', 'benchmark'],
      evidenceWords: ['result', 'results', 'log', 'logs', 'audit', 'audits', 'output', 'outputs'],
      governanceStems: ['design', 'architecture', 'specification', 'manifesto'],
    });
  });

  it('is absent from a one-stage policy, and refuses a one-stage policy carrying any part of it', () => {
    const v1 = JSON.parse(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json'), 'utf8'));
    expect(stageOf(v1.publicSourceScope.contentClassification)).toEqual({ ok: true, stage: null });
    const { classDecision: _dropped, ...withoutDecision } = copy(CLASSIFICATION);
    expect(stageOf(withoutDecision)).toEqual({ ok: false, why: 'its two-stage class decision is absent, yet the policy carries a rule with an id or a list only that decision reads' });
    const onlyList = { ...copy(v1.publicSourceScope.contentClassification), withheldTokens: ['policy'] };
    expect(stageOf(onlyList)).toMatchObject({ ok: false });
  });
});

// Mutations of the successor's second stage, each refused (the texts are pinned by digest; the lists are read as the texts state them).
const mutated = (change: (classification: Record<string, any>) => void): unknown => { const c = copy(CLASSIFICATION) as Record<string, any>; change(c); return c; };
const ruleWithId = (c: Record<string, any>, id: string): Record<string, any> => c['rules'].find((rule: Record<string, unknown>) => rule['id'] === id);
describe('a successor whose second stage differs from the text implemented refuses', () => {
  it.each<[string, (c: Record<string, any>) => void, string]>([
    ['an edited classDecision', c => { c['classDecision'] += ' '; }, 'its two-stage class decision text is not the text this screen implements'],
    ['an edited governance-text-by-name text', c => { ruleWithId(c, 'governance-text-by-name')['rule'] += ' '; }, 'its two-stage class decision rule governance-text-by-name text is not the text this screen implements'],
    ['an edited project-documentation-extended text', c => { ruleWithId(c, 'project-documentation-extended')['rule'] += ' '; }, 'its two-stage class decision rule project-documentation-extended text is not the text this screen implements'],
    ['an edited code-content-extended text', c => { ruleWithId(c, 'code-content-extended')['rule'] += ' '; }, 'its two-stage class decision rule code-content-extended text is not the text this screen implements'],
    ['an edited nested-root-document text', c => { ruleWithId(c, 'project-documentation-extended')['pathRules'][1]['rule'] += ' '; }, 'its two-stage class decision project-documentation-extended path rules are not the three this screen implements (prose-document, nested-root-document, docs-tree-text, in that order and text)'],
    ['path rules out of order', c => { const r = ruleWithId(c, 'project-documentation-extended')['pathRules']; r.reverse(); }, 'its two-stage class decision project-documentation-extended path rules are not the three this screen implements (prose-document, nested-root-document, docs-tree-text, in that order and text)'],
    ['rules with an id out of order', c => { const r = c['rules']; [r[5], r[6]] = [r[6], r[5]]; }, 'its two-stage class decision rules with an id are not the three this screen implements (governance-text-by-name, project-documentation-extended, code-content-extended, in that order)'],
    ['a rule with an id before one without', c => { const r = c['rules']; [r[4], r[5]] = [r[5], r[4]]; }, 'its two-stage class decision places a rule with an id before a rule without one'],
    ['a rule naming another class', c => { ruleWithId(c, 'code-content-extended')['class'] = 'project-documentation'; }, 'its two-stage class decision rule code-content-extended names the class project-documentation, not code-content'],
    ['an extra field', c => { ruleWithId(c, 'governance-text-by-name')['extra'] = []; }, 'its two-stage class decision rule governance-text-by-name carries the fields id, class, rule, governanceTextExtensions, governanceTextTokens, extra, not exactly id, class, rule, governanceTextExtensions, governanceTextTokens'],
    ['a folded list with an upper-case entry', c => { c['withheldTokens'].push('Readme'); }, 'its two-stage class decision withheldTokens is unreadable'],
    ['a token holding a separator', c => { c['evidenceWords'].push('build-log'); }, 'its two-stage class decision evidenceWords is unreadable'],
    ['an empty stem list', c => { c['withheldStems'] = []; }, 'its two-stage class decision withheldStems is unreadable'],
    ['a repeated vendored name', c => { c['vendoredDirectoryNames'].push('vendor'); }, 'its two-stage class decision vendoredDirectoryNames is unreadable'],
    ['a configuration extension without its dot', c => { ruleWithId(c, 'code-content-extended')['configurationExtensions'].push('yml'); }, 'its two-stage class decision configurationExtensions is unreadable'],
    ['a governance token outside docExcludedTokens', c => { ruleWithId(c, 'governance-text-by-name')['governanceTextTokens'].push('guide'); }, 'its two-stage class decision governanceTextTokens is not within docExcludedTokens, which classDecision says it is'],
    ['a word in both token lists', c => { c['withheldTokens'].push('adr'); }, 'its two-stage class decision governanceTextTokens and withheldTokens share a word'],
    ['a language extension Stage 1 already places', c => { ruleWithId(c, 'code-content-extended')['languageExtensions'].push('.py'); }, 'its two-stage class decision code-content-extended repeats a sourceExtensions entry, which Stage 1 already places'],
  ])('%s', (_name, change, why) => {
    expect(stageOf(mutated(change))).toEqual({ ok: false, why });
  });
  it('without a project-documentation rule to read', () => {
    expect(readSecondStage(CLASSIFICATION, null, EXTENSIONS)).toEqual({ ok: false, why: 'its two-stage class decision reads a project-documentation rule the policy does not carry' });
  });
});

const LANGUAGE_EXTENSIONS = ['.cxx', '.hxx', '.hh', '.mts', '.cts', '.scala', '.sc', '.kts', '.groovy', '.gradle', '.clj', '.cljs', '.cljc', '.ex', '.exs', '.erl', '.hrl', '.hs', '.ml',
  '.mli', '.fs', '.fsx', '.dart', '.r', '.R', '.jl', '.m', '.mm', '.pl', '.pm', '.ps1', '.psm1', '.bash', '.zsh', '.fish', '.zig', '.nim', '.vb', '.elm'];

// Every expected value is a literal: `<class>/<stage>` or `indeterminate`.
describe('classDecision, path by path', () => {
  it.each<[string, string]>([
    // governance-text-by-name: a word of governanceTextTokens in a directory or the stem, in a governanceTextExtensions document.
    ['docs/adr/0001-use-postgres.md', 'governance-text/2'],
    ['ARCHITECTURE.md', 'governance-text/2'],
    ['rfcs/0001-thing.md', 'governance-text/2'],
    ['design/overview.mdx', 'governance-text/2'],
    ['spec/api.rst', 'governance-text/2'],
    ['handbook/specifications/x.adoc', 'governance-text/2'],
    ['MANIFESTO.asciidoc', 'governance-text/2'],
    ['Docs/ADRS/One.MD', 'governance-text/2'],
    // ... one word short of it: no governance word, so the documentation rule decides.
    ['notes/adrx/0001.md', 'project-documentation/2'],
    ['design.txt', 'indeterminate'],
    ['design/notes.txt', 'indeterminate'],
    // ... a word of withheldTokens beside a governance word, a stem of withheldStems, a word of evidenceWords.
    ['design/security-review.md', 'indeterminate'],
    ['adr/decision-0001.md', 'indeterminate'],
    ['design/SecurityPolicy.md', 'indeterminate'],
    ['rfcs/benchmark-results.md', 'indeterminate'],
    ['design/test-output.md', 'indeterminate'],
    ['spec/build-log.md', 'indeterminate'],
    ['design/reporting.md', 'indeterminate'],
    // project-documentation-extended: prose at any depth, a nested root document with a suffix, a .txt under docs/doc/documentation.
    ['packages/api/README.md', 'project-documentation/2'],
    ['packages/api/docs/guide.adoc', 'project-documentation/2'],
    ['src/app/CHANGELOG.rst', 'project-documentation/2'],
    ['packages/api/LICENSE.txt', 'project-documentation/2'],
    ['pkg/01-README.md', 'project-documentation/2'],
    ['x/docs/notes.txt', 'project-documentation/2'],
    ['lib/documentation/usage.txt', 'project-documentation/2'],
    ['guide.mdx', 'project-documentation/2'],
    // ... one short: an extensionless root stem below the root, a .txt outside a docs root, an excluded build or tooling name.
    ['bin/changes', 'indeterminate'],
    ['packages/api/README', 'indeterminate'],
    ['lib/notes.txt', 'indeterminate'],
    ['lib/docs/requirements-dev.txt', 'indeterminate'],
    ['lib/docs/robots.txt', 'indeterminate'],
    // ... the four-rule words, run-on governance and withheld stems, evidence words.
    ['GOVERNANCE.md', 'indeterminate'],
    ['CODE_OF_CONDUCT.md', 'indeterminate'],
    ['docs/security/policy.md', 'indeterminate'],
    ['docs/decisions/0001-x.md', 'indeterminate'],
    ['SecurityPolicy.md', 'indeterminate'],
    ['pkg/CodeOfConduct.md', 'indeterminate'],
    ['pkg/DesignDoc.md', 'indeterminate'],
    ['pkg/ArchitectureOverview.md', 'indeterminate'],
    ['pkg/PrinciplesOfX.md', 'indeterminate'],
    ['reports/q3-audit.md', 'indeterminate'],
    ['guides/build-log.md', 'indeterminate'],
    ['notes/results.md', 'indeterminate'],
    // code-content-extended: configuration and language extensions, case-sensitive, and the named files.
    ['config/app.json', 'code-content/2'], ['app.yml', 'code-content/2'], ['deploy/x.yaml', 'code-content/2'], ['Cargo.toml', 'code-content/2'],
    ['main.tf', 'code-content/2'], ['x.hcl', 'code-content/2'], ['api.proto', 'code-content/2'], ['x.cmake', 'code-content/2'],
    ['rules.mk', 'code-content/2'], ['build.mak', 'code-content/2'], ['web.dockerfile', 'code-content/2'], ['web.Dockerfile', 'code-content/2'],
    ['Dockerfile', 'code-content/2'], ['Containerfile', 'code-content/2'], ['Makefile', 'code-content/2'], ['makefile', 'code-content/2'],
    ['GNUmakefile', 'code-content/2'], ['CMakeLists.txt', 'code-content/2'], ['src/CMakeLists.txt', 'code-content/2'],
    ['Dockerfile.dev', 'code-content/2'], ['images/Containerfile.prod', 'code-content/2'],
    ['x.YML', 'indeterminate'], ['DOCKERFILE', 'indeterminate'], ['Makefile.am', 'indeterminate'], ['x.Toml', 'indeterminate'],
    // A notebook, and a path two Stage-2 rules match (code-content-extended by prefix, and a documentation rule).
    ['notebooks/intro.ipynb', 'indeterminate'],
    ['design/Dockerfile.md', 'indeterminate'],
    ['pkg/Dockerfile.md', 'indeterminate'],
    // Vendored directories at each depth; the final segment is not a directory; Stage 1 is never re-read.
    ['vendor/k8s/deploy.yaml', 'indeterminate'],
    ['node_modules/x/README.md', 'indeterminate'],
    ['a/b/node_modules/x/README.md', 'indeterminate'],
    ['Vendor/x.yml', 'indeterminate'],
    ['third-party/design/x.md', 'indeterminate'],
    ['src/extern/x.scala', 'indeterminate'],
    ['vendor.yml', 'code-content/2'],
    ['vendor/x.c', 'code-content/1'],
    // Paths the predecessor already places keep their class and stage.
    ['README.md', 'project-documentation/1'],
    ['01-README.md', 'project-documentation/1'],
    ['docs/setup.md', 'project-documentation/1'],
    ['docs/DesignDoc.md', 'project-documentation/1'],
    ['docs/build-log.txt', 'project-documentation/1'],
    ['licenses/MIT.txt', 'project-documentation/1'],
    ['SECURITY.md', 'governance-text/1'],
    ['MANIFESTO.md', 'governance-text/1'],
    ['src/server.c', 'code-content/1'],
    ['setup.py', 'code-content/1'],
    // A path with an empty, '.' or '..' segment or a backslash matches neither documentation rule; the code rule reads only its name.
    ['design//x.md', 'indeterminate'],
    ['design/./x.md', 'indeterminate'],
    ['design\\x.md', 'indeterminate'],
  ])('%s is %s', (repositoryPath, expected) => {
    expect(outcome(repositoryPath)).toBe(expected);
  });

  it.each(LANGUAGE_EXTENSIONS)('a file ending %s is code-content by Stage 2', extension => {
    expect(outcome(`src/module${extension}`)).toBe('code-content/2');
  });

  it('never reads a path Stage 1 finds two classes for', () => {
    // README.md is a root document; listing it as a governance-text path too gives it two Stage-1 classes. Stage 2 would place it.
    const twoClasses = classDecision('README.md', EXTENSIONS, documentationRule(), { governanceTextPaths: ['readme.md'], subject: null }, second());
    expect(twoClasses).toBeUndefined();
    expect(secondStageRules('README.md', second(), documentationRule())).toEqual(['project-documentation-extended']);
  });

  it('places nothing when the project-documentation class is not classified, or the policy has one stage', () => {
    for (const repositoryPath of ['ARCHITECTURE.md', 'config/app.json', 'packages/api/README.md']) {
      expect(classDecision(repositoryPath, EXTENSIONS, null, { governanceTextPaths: governanceTextPaths() }, second())).toBeUndefined();
      expect(classDecision(repositoryPath, EXTENSIONS, documentationRule(), { governanceTextPaths: governanceTextPaths() }, null)).toBeUndefined();
    }
  });

  it('names the rules each Stage-2 path matches before the two-match refusal', () => {
    expect(secondStageRules('pkg/Dockerfile.md', second(), documentationRule())).toEqual(['project-documentation-extended', 'code-content-extended']);
    expect(secondStageRules('design/Dockerfile.md', second(), documentationRule())).toEqual(['governance-text-by-name', 'code-content-extended']);
    expect(secondStageRules('vendor/design/x.md', second(), documentationRule())).toEqual([]);
  });
});

describe('the exemptions read the stage', () => {
  it('never exempt a body Stage 2 places', () => {
    expect([documentationExempt('project-documentation', true, 1), documentationExempt('project-documentation', true, 2)]).toEqual([true, false]);
    const exemption = { exemptExtensions: ['.c'] };
    expect([codeContentExempt('src/a.c', 'code-content', exemption, 1), codeContentExempt('src/a.c', 'code-content', exemption, 2)]).toEqual([true, false]);
  });
});

describe('deniedDirectoryNames', () => {
  const NAMES = ['.ssh', '.gnupg', '.aws', '.kube', '.docker', '.terraform'];
  it.each<[string, boolean]>([
    ['.ssh/deploy.sh', true], ['home/.SSH/id', true], ['deploy/.docker/config.json', true], ['.kube/config', true], ['a/b/.terraform/x.tf', true],
    ['.gnupg/pubring.kbx', true], ['infra/.Aws/credentials', true],
    ['conf/.aws', false], ['.ssh', false], ['ssh/config', false], ['x.ssh/config', false], ['.kubex/config', false],
  ])('%s is denied: %s', (repositoryPath, denied) => {
    expect(deniedDirectory(repositoryPath, NAMES)).toBe(denied);
  });
});

describe('a reader that does not implement the two-stage decision refuses the successor texts', () => {
  const scope = V2.publicSourceScope;
  it('source visibility, project-documentation exemption and secret redaction, each read without twoStage', () => {
    expect(readSourceVisibility(scope)).toEqual({ ok: false, why: 'its source visibility unchanged is not the text this screen implements' });
    expect(readProjectDocumentationExemption(scope)).toEqual({ ok: false, why: 'its project-documentation exemption appliesTo is not the text this screen implements' });
    const ids = [...V2.detectors, ...scope.scopeDetectors.detectors].map((detector: { id: string }) => detector.id);
    expect(readSecretRedaction(scope, ids)).toEqual({ ok: false, why: 'its secret redaction appliesTo is not the text this screen implements' });
  });
  it('and reads them with it', () => {
    expect(readSourceVisibility(scope, true)).toEqual({ ok: true, declared: true, admitsPrivate: true });
    expect(readProjectDocumentationExemption(scope, true)).toEqual({ ok: true, declared: true });
    const ids = [...V2.detectors, ...scope.scopeDetectors.detectors].map((detector: { id: string }) => detector.id);
    expect(readSecretRedaction(scope, ids, true)).toMatchObject({ ok: true });
  });
  it('and the predecessor texts refuse under twoStage', () => {
    const v1 = JSON.parse(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-DOSSIER-DECLARED-SOURCE-POLICY-v1.json'), 'utf8')).publicSourceScope;
    expect(readSourceVisibility(v1, true)).toMatchObject({ ok: false });
    expect(readProjectDocumentationExemption(v1, true)).toMatchObject({ ok: false });
    const ids = [...V2.detectors, ...v1.scopeDetectors.detectors].map((detector: { id: string }) => detector.id);
    expect(readSecretRedaction(v1, ids, true)).toMatchObject({ ok: false });
  });
});

// Two checks the committed lists make redundant, each held on its own (the mutation run found both unreached by the policy's lists alone).
describe('checks the committed lists do not reach on their own', () => {
  it('a withheld token refuses governance-text-by-name even with no withheld stem beside it', () => {
    const stage = { ...second(), withheldStems: Object.freeze([]) } as SecondStageRules;
    expect([secondStageRules('docs/design/decisions.md', stage, documentationRule()), secondStageRules('docs/design/notes.md', stage, documentationRule())])
      .toEqual([[], ['governance-text-by-name']]);
  });
  it('a path two Stage-1 documentation path rules place is never read by Stage 2', () => {
    const subject = { repository: 'repository:o-r', commit: 'a'.repeat(40) };
    const documentation: ProjectDocumentationRule = { ...documentationRule(), ownerPlacements: [{ repository: subject.repository, commits: [subject.commit], paths: ['docs/notes.txt'] }] };
    const at = (repositoryPath: string, rule: ProjectDocumentationRule) => classDecision(repositoryPath, EXTENSIONS, rule, { governanceTextPaths: governanceTextPaths(), subject }, second());
    // docs-tree and owner-placement both place docs/notes.txt: Stage 1 finds two placements, and docs-tree-text never reads it.
    expect([at('docs/notes.txt', documentation), at('docs/notes.txt', documentationRule()), at('x/docs/notes.txt', documentation)])
      .toEqual([undefined, { contentClass: 'project-documentation', stage: 1 }, { contentClass: 'project-documentation', stage: 2 }]);
  });
});
