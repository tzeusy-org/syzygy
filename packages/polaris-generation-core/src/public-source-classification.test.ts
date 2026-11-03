import { readFileSync } from 'node:fs';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

import { documentationPathRules, publicSourceContentClass, readProjectDocumentationRule, type ProjectDocumentationRule } from './public-source-classification.js';

// syzygy-2coz: the project-documentation class of the public-source screening scope, version 2. The input is the policy in this
// checkout; every expected value below is written from the rule text (quoted where it decides the case), never computed by the module.

const ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const POLICY = JSON.parse(readFileSync(path.join(ROOT, '.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json'), 'utf8'));
const RULES: Record<string, unknown>[] = POLICY.publicSourceScope.contentClassification.rules;
const LIVE_DOC = RULES.find(rule => rule['class'] === 'project-documentation')!;
const LIVE_EXTENSIONS = RULES.find(rule => rule['class'] === 'code-content')!['sourceExtensions'] as string[];

const read = (doc: Record<string, unknown> = LIVE_DOC, extensions: readonly string[] = LIVE_EXTENSIONS) => readProjectDocumentationRule([...RULES.filter(rule => rule['class'] !== 'project-documentation'), doc], extensions);
const ruleOf = (doc: Record<string, unknown> = LIVE_DOC): ProjectDocumentationRule => {
  const result = read(doc);
  if (!result.ok || result.rule === null) throw new Error(result.ok ? 'no rule' : result.why);
  return result.rule;
};
const withField = (field: string, value: unknown): Record<string, unknown> => ({ ...LIVE_DOC, [field]: value });
const withPrefix = (field: string, value: unknown): Record<string, unknown> => withField('rootStemNumericPrefix', { ...(LIVE_DOC['rootStemNumericPrefix'] as object), [field]: value });

describe('the live rule', () => {
  it('reads, with exactly the parameters the policy lists', () => {
    expect(ruleOf()).toEqual({
      rootStemNumericPrefix: { digitCount: 2, digits: '0123456789', separator: '-', optional: true },
      rootStems: ['readme', 'changelog', 'changes', 'release-notes', 'release_notes', 'releasenotes', 'contributing', 'license', 'licence', 'copying', 'notice', 'notices', 'news', 'history', 'authors', 'faq'],
      documentSuffixes: ['', '.md', '.rst', '.txt'],
      docTreeRoots: ['docs', 'doc'],
      docTreeExtensions: ['.md', '.rst', '.txt'],
      docExcludedTokens: ['adr', 'adrs', 'decision', 'decisions', 'rfc', 'rfcs', 'spec', 'specs', 'specification', 'specifications', 'design', 'designs', 'governance', 'policy', 'policies', 'security', 'conduct', 'doctrine', 'doctrines', 'principle', 'principles', 'architecture', 'architectures', 'manifesto', 'manifestos'],
      docTokenSeparators: '-_. ',
      docTxtExcludedNames: ['cmakelists.txt', 'robots.txt'],
      docTxtExcludedPrefixes: ['requirements'],
      licenseTreeRoots: ['licenses'],
      licenseTreeSuffixes: ['.md', '.txt'],
      // Version 5 (variant bcd): the fourth path rule's one entry.
      ownerPlacements: [{ repository: 'repository:redis-redis', commits: ['498ecd0d6d007db11ddb3aea9428552598a78622'], paths: ['tls.md', 'modules/modules.md'] }],
    });
  });

  // "a path with one segment whose name, after removing rootStemNumericPrefix when it is present and then one suffix from
  // documentSuffixes (any that fits), is one of rootStems"
  it.each<[string, string[]]>([
    ['README.md', ['root-document']], ['README', ['root-document']], ['readme.rst', ['root-document']], ['ReadMe.TXT', ['root-document']],
    ['LICENSE.txt', ['root-document']], ['LICENCE', ['root-document']], ['COPYING', ['root-document']], ['NOTICE', ['root-document']],
    ['NOTICES.md', ['root-document']], ['CHANGELOG.md', ['root-document']], ['CHANGES', ['root-document']], ['release-notes.md', ['root-document']],
    ['RELEASE_NOTES', ['root-document']], ['ReleaseNotes.rst', ['root-document']], ['CONTRIBUTING.md', ['root-document']], ['NEWS', ['root-document']],
    ['HISTORY.txt', ['root-document']], ['AUTHORS', ['root-document']], ['FAQ.md', ['root-document']],
    // The numeric prefix: exactly two of the listed digits, then '-'.
    ['01-README.md', ['root-document']], ['99-faq', ['root-document']],
    ['1-README.md', []], ['001-README.md', []], ['0a-README.md', []], ['01_README.md', []], ['01README.md', []], ['01-01-README.md', []],
    ['٠١-README.md', []], ['０１-README.md', []],
    // One suffix only, and only a listed one.
    ['README.md.md', []], ['README.markdown', []], ['README.html', []], ['README-dev.md', []], ['READMEmd', []],
    // Not a root stem: the notMapped root files and other prose.
    ['MANIFESTO', []], ['ARCHITECTURE.md', []], ['SECURITY.md', []], ['CODE_OF_CONDUCT.md', []], ['GOVERNANCE.md', []], ['DESIGN.md', []],
    ['redis.conf', []], ['Makefile', []], ['.md', []], ['', []],
    // One segment only: nested and vendored documentation is not mapped.
    ['src/README.md', []], ['deps/jemalloc/README', []], ['tests/LICENSE', []],
  ])('root-document: %s', (repositoryPath, expected) => {
    expect(documentationPathRules(repositoryPath, ruleOf())).toEqual(expected);
  });

  // "a path of two or more segments whose first segment is one of docTreeRoots, whose name ends with one of docTreeExtensions and is
  // longer than it, in which no directory name after the first, and no file name without its extension, has a word in
  // docExcludedTokens ..., and which is not a name ending in .txt that equals one of docTxtExcludedNames or starts with one of
  // docTxtExcludedPrefixes"
  it.each<[string, string[]]>([
    ['docs/guide.md', ['docs-tree']], ['doc/intro.rst', ['docs-tree']], ['DOCS/Guide.MD', ['docs-tree']], ['docs/a/b/c.txt', ['docs-tree']],
    ['docs/README.md', ['docs-tree']], ['docs/designer.md', ['docs-tree']], ['docs/requirements.md', ['docs-tree']], ['docs/my-requirements.txt', ['docs-tree']],
    ['docs/getting-started/install.md', ['docs-tree']], ['doc/0001-intro.md', ['docs-tree']],
    // Longer than the extension, and a listed extension.
    ['docs/.md', []], ['docs/guide.markdown', []], ['docs/guide.html', []], ['docs/guide', []], ['docs/conf.py', []], ['docs/index.MDX', []],
    // A word in docExcludedTokens, at each separator, in a directory after the first or the file name.
    ['docs/design.md', []], ['docs/adr/0001-use-x.md', []], ['docs/security-policy.md', []], ['docs/my_spec.md', []], ['docs/specs.v2.md', []],
    ['docs/design notes.md', []], ['docs/RFC/intro.md', []], ['docs/governance/x.md', []], ['docs/x/manifesto.md', []], ['docs/Architecture.rst', []],
    ['docs/code-of-conduct.md', []], ['docs/decisions/x.md', []], ['docs/principles.txt', []], ['docs/doctrine-v1.md', []],
    // Build and tooling .txt files.
    ['docs/CMakeLists.txt', []], ['docs/robots.txt', []], ['docs/requirements.txt', []], ['docs/requirements-dev.txt', []], ['docs/a/Requirements_x.txt', []],
    // Other roots.
    ['documentation/guide.md', []], ['src/docs/guide.md', []], ['Docs.md', []],
  ])('docs-tree: %s', (repositoryPath, expected) => {
    expect(documentationPathRules(repositoryPath, ruleOf())).toEqual(expected);
  });

  // "a path of exactly two segments whose first segment is one of licenseTreeRoots and whose name ends with one of licenseTreeSuffixes
  // and is longer than it, and in which no word of the file name without its extension is in docExcludedTokens"
  it.each<[string, string[]]>([
    ['LICENSES/MIT.txt', ['licenses-tree']], ['licenses/Apache-2.0.md', ['licenses-tree']], ['licenses/requirements.txt', ['licenses-tree']],
    ['licenses/a/b.txt', []], ['licenses/MIT.txt/notes.md', []], ['licenses/MIT', []], ['licenses/.txt', []], ['licenses/MIT.rst', []], ['licenses/security.txt', []],
    ['licenses/policy-x.md', []], ['license/MIT.txt', []], ['licenses', []],
  ])('licenses-tree: %s', (repositoryPath, expected) => {
    expect(documentationPathRules(repositoryPath, ruleOf())).toEqual(expected);
  });

  // "A path with an empty, '.' or '..' segment, a backslash or a leading or trailing '/' matches nothing."
  it.each(['/README.md', 'README.md/', './README.md', 'docs/./guide.md', 'docs/../README.md', 'docs//guide.md', 'docs\\guide.md', 'docs/a\\b.md', 'README\\', 'licenses//MIT.txt', 'docs/guide.md/'])(
    'matches nothing for the path %s', (repositoryPath) => {
      expect(documentationPathRules(repositoryPath, ruleOf())).toEqual([]);
    });
});

describe('the class', () => {
  it.each<[string, string | undefined]>([
    ['README.md', 'project-documentation'], ['docs/guide.md', 'project-documentation'], ['licenses/MIT.txt', 'project-documentation'],
    ['src/server.c', 'code-content'], ['docs/conf.py', 'code-content'], ['src/README.md', undefined], ['docs/design.md', undefined], ['redis.conf', undefined],
  ])('of %s under the live rule', (repositoryPath, expected) => {
    expect(publicSourceContentClass(repositoryPath, LIVE_EXTENSIONS, ruleOf())).toBe(expected);
  });

  // The scope's prerequisite: "a consumer that cannot confirm that treats every blob the rule names as indeterminate".
  it.each(['README.md', 'docs/guide.md', 'licenses/MIT.txt'])('of %s is indeterminate when the class is not classified', (repositoryPath) => {
    expect(publicSourceContentClass(repositoryPath, LIVE_EXTENSIONS, null)).toBeUndefined();
  });

  it('is code-content by extension whether or not the class is classified', () => {
    expect(publicSourceContentClass('src/server.c', LIVE_EXTENSIONS, null)).toBe('code-content');
  });

  // "a blob matched here is never code-content": a root stem that ends with a code extension is documentation.
  it('is project-documentation for a path the rule matches that a code extension also ends', () => {
    const rule = ruleOf(withField('rootStems', ['notes.c']));
    expect(documentationPathRules('notes.c', rule)).toEqual(['root-document']);
    expect(publicSourceContentClass('notes.c', LIVE_EXTENSIONS, rule)).toBe('project-documentation');
  });

  // "matched by exactly one of the three path rules": a licenses directory that is also a docs root matches two, so neither.
  it('is not project-documentation for a path two path rules match', () => {
    const rule = ruleOf(withField('docTreeRoots', ['docs', 'doc', 'licenses']));
    expect(documentationPathRules('licenses/MIT.txt', rule)).toEqual(['docs-tree', 'licenses-tree']);
    expect(publicSourceContentClass('licenses/MIT.txt', LIVE_EXTENSIONS, rule)).toBeUndefined();
  });

  // "with its ASCII letters A-Z folded to a-z and nothing else folded": KELVIN SIGN lower-cases to 'k' under a Unicode fold, not here.
  it('folds ASCII letters only', () => {
    const rule = ruleOf(withField('rootStems', ['kit']));
    expect(documentationPathRules('KIT', rule)).toEqual(['root-document']);
    expect(documentationPathRules('Kit', rule)).toEqual([]);
  });

  it('requires the numeric prefix when it is not optional', () => {
    const rule = ruleOf(withPrefix('optional', false));
    expect(documentationPathRules('README.md', rule)).toEqual([]);
    expect(documentationPathRules('01-README.md', rule)).toEqual(['root-document']);
  });

  it('reads the prefix digits, count and separator from the policy', () => {
    expect(documentationPathRules('1-README.md', ruleOf(withPrefix('digitCount', 1)))).toEqual(['root-document']);
    expect(documentationPathRules('ab-README.md', ruleOf(withPrefix('digits', 'ab')))).toEqual(['root-document']);
    expect(documentationPathRules('01-README.md', ruleOf(withPrefix('digits', 'ab')))).toEqual([]);
    expect(documentationPathRules('01~README.md', ruleOf(withPrefix('separator', '~')))).toEqual(['root-document']);
  });

  it('reads every list from the policy', () => {
    expect(documentationPathRules('MANIFESTO', ruleOf(withField('rootStems', ['manifesto'])))).toEqual(['root-document']);
    expect(documentationPathRules('README.adoc', ruleOf(withField('documentSuffixes', ['.adoc'])))).toEqual(['root-document']);
    expect(documentationPathRules('README', ruleOf(withField('documentSuffixes', ['.md'])))).toEqual([]);
    expect(documentationPathRules('guide/a.md', ruleOf(withField('docTreeRoots', ['guide'])))).toEqual(['docs-tree']);
    expect(documentationPathRules('docs/a.adoc', ruleOf(withField('docTreeExtensions', ['.adoc'])))).toEqual(['docs-tree']);
    expect(documentationPathRules('docs/design.md', ruleOf(withField('docExcludedTokens', [])))).toEqual(['docs-tree']);
    expect(documentationPathRules('docs/my+spec.md', ruleOf(withField('docTokenSeparators', '+')))).toEqual([]);
    expect(documentationPathRules('docs/my-spec.md', ruleOf(withField('docTokenSeparators', '+')))).toEqual(['docs-tree']);
    expect(documentationPathRules('docs/robots.txt', ruleOf(withField('docTxtExcludedNames', [])))).toEqual(['docs-tree']);
    expect(documentationPathRules('docs/requirements.txt', ruleOf(withField('docTxtExcludedPrefixes', [])))).toEqual(['docs-tree']);
    expect(documentationPathRules('third_party/MIT.txt', ruleOf(withField('licenseTreeRoots', ['third_party'])))).toEqual(['licenses-tree']);
    expect(documentationPathRules('licenses/MIT.rst', ruleOf(withField('licenseTreeSuffixes', ['.rst'])))).toEqual(['licenses-tree']);
  });
});

describe('reading the rule', () => {
  it('reads no rule from a policy without one (version 1)', () => {
    expect(readProjectDocumentationRule(RULES.filter(rule => rule['class'] !== 'project-documentation'), LIVE_EXTENSIONS)).toEqual({ ok: true, rule: null });
  });

  const pathRule = (index: number, over: Record<string, unknown>): Record<string, unknown> =>
    withField('pathRules', (LIVE_DOC['pathRules'] as Record<string, unknown>[]).map((rule, at) => (at === index ? { ...rule, ...over } : rule)));
  it.each<[string, Record<string, unknown>]>([
    ['the class rule text edited', withField('rule', `${LIVE_DOC['rule'] as string} `)],
    ['the disjointness statement edited', withField('disjointFromSourceExtensions', 'none')],
    ['the root-document text edited', pathRule(0, { rule: 'any path' })],
    ['the docs-tree text edited', pathRule(1, { rule: 'any path' })],
    ['the licenses-tree text edited', pathRule(2, { rule: 'any path' })],
    ['a path rule renamed', pathRule(1, { id: 'doc-tree' })],
    ['a path rule missing', withField('pathRules', (LIVE_DOC['pathRules'] as unknown[]).slice(0, 2))],
    ['the path rules reordered', withField('pathRules', [...(LIVE_DOC['pathRules'] as unknown[])].reverse())],
    ['two path rule ids swapped over their texts', withField('pathRules', (LIVE_DOC['pathRules'] as Record<string, unknown>[]).map((rule, at) => ({ ...rule, id: ['root-document', 'licenses-tree', 'docs-tree'][at] })))],
    ['the prefix note edited', withPrefix('note', 'any digit')],
    ['a zero digit count', withPrefix('digitCount', 0)],
    ['a fractional digit count', withPrefix('digitCount', 1.5)],
    ['a digit count that is a string', withPrefix('digitCount', '2')],
    ['empty digits', withPrefix('digits', '')],
    ['a non-ASCII digit', withPrefix('digits', '0123456789٠')],
    ['a repeated digit', withPrefix('digits', '00')],
    ['an empty separator', withPrefix('separator', '')],
    ['a separator that is a slash', withPrefix('separator', '/')],
    ['an optional flag that is a string', withPrefix('optional', 'true')],
    ['no prefix object', withField('rootStemNumericPrefix', null)],
    ['a prefix that is an array carrying the fields', withField('rootStemNumericPrefix', Object.assign([], LIVE_DOC['rootStemNumericPrefix']))],
    ['a prefix that is a string', withField('rootStemNumericPrefix', 'x')],
    ['a path rule that is null', withField('pathRules', [null, ...(LIVE_DOC['pathRules'] as unknown[]).slice(1)])],
    ['a path rule that is a string', withField('pathRules', ['x', ...(LIVE_DOC['pathRules'] as unknown[]).slice(1)])],
    ['a path rule that is an array carrying the fields', withField('pathRules', [Object.assign([], (LIVE_DOC['pathRules'] as unknown[])[0]), ...(LIVE_DOC['pathRules'] as unknown[]).slice(1)])],
    ['no root stems', withField('rootStems', [])],
    ['an upper-case root stem', withField('rootStems', ['README'])],
    ['an empty root stem', withField('rootStems', [''])],
    ['a repeated root stem', withField('rootStems', ['readme', 'readme'])],
    ['a document suffix without a dot', withField('documentSuffixes', ['', 'md'])],
    ['a document suffix that is only a dot', withField('documentSuffixes', ['', '.'])],
    ['no document suffixes', withField('documentSuffixes', [])],
    ['a docs root that is a path', withField('docTreeRoots', ['docs/api'])],
    ['a docs root that is a dot segment', withField('docTreeRoots', ['..'])],
    ['no docs roots', withField('docTreeRoots', [])],
    ['an empty docs extension', withField('docTreeExtensions', [''])],
    ['no docs extensions', withField('docTreeExtensions', [])],
    ['an excluded token with a separator in it', withField('docExcludedTokens', ['code-of-conduct'])],
    ['an upper-case excluded token', withField('docExcludedTokens', ['ADR'])],
    ['excluded tokens that are not a list', withField('docExcludedTokens', 'adr')],
    ['no separators', withField('docTokenSeparators', '')],
    ['separators that are a list', withField('docTokenSeparators', ['-'])],
    ['an upper-case excluded .txt name', withField('docTxtExcludedNames', ['CMakeLists.txt'])],
    ['an empty excluded .txt name', withField('docTxtExcludedNames', [''])],
    ['excluded .txt prefixes that are not a list', withField('docTxtExcludedPrefixes', 'requirements')],
    ['an empty excluded .txt prefix', withField('docTxtExcludedPrefixes', [''])],
    ['a licenses root with a backslash', withField('licenseTreeRoots', ['licenses\\'])],
    ['no licenses roots', withField('licenseTreeRoots', [])],
    ['a licenses suffix without a dot', withField('licenseTreeSuffixes', ['txt'])],
    ['no licenses suffixes', withField('licenseTreeSuffixes', [])],
  ])('refuses %s', (_name, doc) => {
    expect(read(doc)).toMatchObject({ ok: false, why: expect.stringMatching(/^its project-documentation rule /u) });
  });

  // The object test in @syzygy/support decides which rules entries are rules at all (syzygy-bpyt.6.3 stack 4): an entry that is not an object
  // is not the project-documentation rule and is passed over, never read and never thrown on; an array that carries the class by name is still
  // an array.
  it('passes over a rules entry that is not an object, as if it were not there', () => {
    const others = RULES.filter(rule => rule['class'] !== 'project-documentation');
    const noise = [null, 'x', 1, true, [], Object.assign([], { class: 'project-documentation' })];
    expect(readProjectDocumentationRule([...noise, ...others, LIVE_DOC], LIVE_EXTENSIONS)).toEqual(read());
    expect(readProjectDocumentationRule([...noise, ...others], LIVE_EXTENSIONS)).toEqual({ ok: true, rule: null });
  });

  it('refuses two project-documentation rules', () => {
    expect(readProjectDocumentationRule([...RULES, LIVE_DOC], LIVE_EXTENSIONS)).toEqual({ ok: false, why: 'its project-documentation rule appears more than once' });
  });

  // "none of documentSuffixes, docTreeExtensions or licenseTreeSuffixes is in sourceExtensions"
  it.each(['.md', '.rst', '.txt'])('refuses sourceExtensions that list %s', (overlap) => {
    expect(read(LIVE_DOC, [...LIVE_EXTENSIONS, overlap])).toMatchObject({ ok: false, why: expect.stringContaining('meets sourceExtensions') });
  });
});
