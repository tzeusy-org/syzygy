import { isRecord, sha256 } from '@syzygy/support';

/** The public-source screening scope's `project-documentation` class (policy version 2, `publicSourceScope.contentClassification`,
 * the rule whose `class` is `project-documentation`; RFC5-14 as amended 2026-10-07), shared by the any-repo reader's screen and the
 * dossier's screen so the two cannot read the rule differently (`syzygy-2coz`; the rest of the screen is still copied, syzygy-qkea.17).
 *
 * Every parameter is read from the policy's bytes. The rule's prose is not: this module implements one reading of one text, so the
 * texts it implements are pinned by digest and any other text refuses the screen rather than being matched under a stale reading.
 *
 * Choices the rule text leaves open, each fail-closed:
 * - The rule's lists are compared, as given, against the ASCII-folded path. An entry that could never match a folded path (an A-Z
 *   letter, a '/' or a backslash), an extension that is not '.' plus at least one character, or an excluded token that contains a
 *   separator is malformed and refuses the screen.
 * - `rootStemNumericPrefix` is removed when present, so a name that starts with it is compared without it; when `optional` is false a
 *   name without it matches nothing.
 * - Where more than one of a rule's extensions fits a file name, the excluded-word test must pass with each one removed.
 * - The policy says no blob has two classes by extension and that a blob this rule matches is never code-content. The screen refuses a
 *   policy whose suffix and extension lists meet `sourceExtensions` (the statement would be false), and a path this rule matches is
 *   project-documentation whatever it ends with.
 * - A path matched by more than one path rule is not in the class ("exactly one"); if no code-content extension ends it, it is
 *   indeterminate. */

export type DocumentationPathRuleId = 'root-document' | 'docs-tree' | 'licenses-tree' | 'owner-placement';
const PATH_RULE_IDS: readonly DocumentationPathRuleId[] = ['root-document', 'docs-tree', 'licenses-tree'];
/** Version 5 (variants `bd` and `bcd`, approved 2026-11-03 as `bcd`) adds a fourth path rule, the owner's placements. */
const PATH_RULE_IDS_V5: readonly DocumentationPathRuleId[] = [...PATH_RULE_IDS, 'owner-placement'];

/** sha256 of each rule text this module implements, UTF-8. The class rule has two texts: version 2's ("exactly one of the three path
 * rules"), read with the three path rules and no `ownerPlacements`, and version 5's ("exactly one of the four path rules"), read with the
 * fourth rule `owner-placement` and its `ownerPlacements`. Each text is read only with its own path rules. */
const IMPLEMENTED_TEXTS = {
  rule: '99453acf1524976e5416fa4291d55aa6ad2530418efe802aac6a675748ddfe46',
  ruleV5: '3b1edf6c5b03f3ac1cec847a4791ecd076a8b70c1cb149d6f249a3f736f3674b',
  'owner-placement': '3b58e5f5959e8a80d7e3fd362ce7936d43c7a9ad2bcbb2555d0708832631f1e2',
  disjointFromSourceExtensions: '9dba52f576eced78b2fd95f4d1bb05afc2e401a57b49164edc998ae141872455',
  rootStemNumericPrefixNote: '720a1f94189844e4cc480ba6cf3d98eaf7bebbf91c4b2e8ed6046af0e6b11605',
  'root-document': 'c42e03ee183319bbc448e6cdd89aa731dca793e07c4da60e71c792921fa90981',
  'docs-tree': 'ad1eba9e457805b71fb69753181f055698f53e52b37188d7d5f5b79a0b5d1ce9',
  'licenses-tree': 'f73a27ee4f83cf2754e1037069453c2f32c16cf83e032518fca91013d378e2d2',
} as const;

/** The literal the docs-tree rule names for its build-file exclusion ("a name ending in .txt"); it is rule text, not a parameter. */
const TXT = '.txt';

export interface ProjectDocumentationRule {
  readonly rootStemNumericPrefix: { readonly digitCount: number; readonly digits: string; readonly separator: string; readonly optional: boolean };
  readonly rootStems: readonly string[];
  readonly documentSuffixes: readonly string[];
  readonly docTreeRoots: readonly string[];
  readonly docTreeExtensions: readonly string[];
  readonly docExcludedTokens: readonly string[];
  readonly docTokenSeparators: string;
  readonly docTxtExcludedNames: readonly string[];
  readonly docTxtExcludedPrefixes: readonly string[];
  readonly licenseTreeRoots: readonly string[];
  readonly licenseTreeSuffixes: readonly string[];
  /** The owner's placements (version 5, the `owner-placement` path rule); empty under version 2's three rules. */
  readonly ownerPlacements: readonly OwnerPlacement[];
}

/** One `ownerPlacements` entry: it places `paths` (each already folded) in the class for the blobs of `repository` read at one of
 * `commits`, and nothing else. It admits no repository, commit or object; the observation consent decides those. */
export interface OwnerPlacement {
  readonly repository: string;
  readonly commits: readonly string[];
  readonly paths: readonly string[];
}

/** The repository a blob is read from and the admitted commit it is read at, as the owner-placement path rule compares them
 * (`repository:<id>`, the observation consent's subject form, and the full commit id). A screen built without one places nothing. */
export interface PlacementSubject {
  readonly repository: string;
  readonly commit: string;
}

/** `rule` is null when the policy has no project-documentation rule (version 1). */
export type ProjectDocumentationRead = { readonly ok: true; readonly rule: ProjectDocumentationRule | null } | { readonly ok: false; readonly why: string };

// Never matchable against a folded path: an A-Z letter (folded away), a separator of segments, or a backslash (matches nothing).
const unmatchable = (entry: string): boolean => /[A-Z/\\]/u.test(entry);
// A placement path is a whole repository path, so it may hold '/' (round-2 note 3 of the v5 review: `unmatchable`'s segment test would
// refuse modules/modules.md). It is never matchable when it holds an A-Z letter or a backslash, or an empty, '.' or '..' segment, which
// also covers a leading or trailing '/': a folded path with any of those matches no path rule.
const placementPath = (entry: string): boolean => entry.length > 0 && !/[A-Z\\]/u.test(entry) && entry.split('/').every(part => part !== '' && part !== '.' && part !== '..');
const REPOSITORY_ID = /^repository:[a-z0-9][a-z0-9-]*$/u;
const COMMIT_ID = /^(?:[0-9a-f]{40}|[0-9a-f]{64})$/u;
const distinct = (value: unknown, valid: (entry: string) => boolean): value is readonly string[] =>
  Array.isArray(value) && value.length > 0 && value.every(entry => typeof entry === 'string' && valid(entry)) && new Set(value).size === value.length;
const PLACEMENT_KEYS = ['repository', 'commits', 'paths'] as const;
function readOwnerPlacements(value: unknown): readonly OwnerPlacement[] | null {
  if (!Array.isArray(value)) return null;
  const out: OwnerPlacement[] = [];
  for (const entry of value) {
    if (!isRecord(entry)) return null;
    const keys = Object.keys(entry);
    if (keys.length !== PLACEMENT_KEYS.length || PLACEMENT_KEYS.some(key => !keys.includes(key))) return null;
    const { repository, commits, paths } = entry;
    if (typeof repository !== 'string' || !REPOSITORY_ID.test(repository) || !distinct(commits, id => COMMIT_ID.test(id)) || !distinct(paths, placementPath)) return null;
    out.push(Object.freeze({ repository, commits: Object.freeze([...commits]), paths: Object.freeze([...paths]) }));
  }
  return Object.freeze(out);
}
const names = (value: unknown, minimum: number, valid: (entry: string) => boolean): value is readonly string[] =>
  Array.isArray(value) && value.length >= minimum && value.every(entry => typeof entry === 'string' && !unmatchable(entry) && valid(entry))
  && new Set(value).size === value.length;
const nonEmpty = (entry: string): boolean => entry.length > 0;
const extension = (entry: string): boolean => entry.length > 1 && entry.startsWith('.');
const segment = (entry: string): boolean => entry.length > 0 && entry !== '.' && entry !== '..';

/** Reads the project-documentation rule from a policy's content-classification rules. Any malformed field refuses. */
export function readProjectDocumentationRule(rules: readonly unknown[], sourceExtensions: readonly string[]): ProjectDocumentationRead {
  const refuse = (why: string): ProjectDocumentationRead => ({ ok: false, why: `its project-documentation rule ${why}` });
  const found = rules.filter(rule => isRecord(rule) && rule['class'] === 'project-documentation');
  if (found.length === 0) return { ok: true, rule: null };
  if (found.length > 1) return refuse('appears more than once');
  const rule = found[0] as Readonly<Record<string, unknown>>;
  const text = typeof rule['rule'] === 'string' ? sha256(rule['rule']) : null;
  if (text !== IMPLEMENTED_TEXTS.rule && text !== IMPLEMENTED_TEXTS.ruleV5) return refuse('text is not the text this screen implements');
  const ids = text === IMPLEMENTED_TEXTS.ruleV5 ? PATH_RULE_IDS_V5 : PATH_RULE_IDS;
  if (typeof rule['disjointFromSourceExtensions'] !== 'string' || sha256(rule['disjointFromSourceExtensions']) !== IMPLEMENTED_TEXTS.disjointFromSourceExtensions) {
    return refuse('disjointness statement is not the text this screen implements');
  }
  const pathRules = rule['pathRules'];
  if (!Array.isArray(pathRules) || pathRules.length !== ids.length
    || !pathRules.every((pathRule: unknown, index) => isRecord(pathRule) && pathRule['id'] === ids[index] && typeof pathRule['rule'] === 'string'
      && sha256(pathRule['rule']) === IMPLEMENTED_TEXTS[ids[index]!])) {
    return refuse(ids === PATH_RULE_IDS_V5 ? 'path rules are not the four this screen implements for its text (root-document, docs-tree, licenses-tree, owner-placement, in that order and text)'
      : 'path rules are not the three this screen implements (root-document, docs-tree, licenses-tree, in that order and text)');
  }
  // The owner's placements exist only beside the rule that reads them: under the three-rule text an `ownerPlacements` field places nothing
  // the text names, so it refuses rather than being ignored.
  const placements = ids === PATH_RULE_IDS_V5 ? readOwnerPlacements(rule['ownerPlacements']) : Object.hasOwn(rule, 'ownerPlacements') ? null : Object.freeze([]);
  if (placements === null) return refuse('ownerPlacements is unreadable');
  const prefix = rule['rootStemNumericPrefix'];
  if (!isRecord(prefix) || !Number.isSafeInteger(prefix['digitCount']) || (prefix['digitCount'] as number) < 1
    || typeof prefix['digits'] !== 'string' || !/^[\x21-\x7e]+$/u.test(prefix['digits']) || unmatchable(prefix['digits']) || new Set(prefix['digits']).size !== prefix['digits'].length
    || typeof prefix['separator'] !== 'string' || !/^[\x21-\x7e]+$/u.test(prefix['separator']) || unmatchable(prefix['separator'])
    || typeof prefix['optional'] !== 'boolean' || typeof prefix['note'] !== 'string' || sha256(prefix['note']) !== IMPLEMENTED_TEXTS.rootStemNumericPrefixNote) {
    return refuse('rootStemNumericPrefix is unreadable');
  }
  const separators = rule['docTokenSeparators'];
  if (typeof separators !== 'string' || separators.length === 0 || unmatchable(separators)) return refuse('docTokenSeparators is unreadable');
  const lists: [string, number, (entry: string) => boolean][] = [
    ['rootStems', 1, nonEmpty], ['documentSuffixes', 1, entry => entry === '' || extension(entry)], ['docTreeRoots', 1, segment],
    ['docTreeExtensions', 1, extension], ['docExcludedTokens', 0, entry => entry.length > 0 && ![...separators].some(sep => entry.includes(sep))],
    ['docTxtExcludedNames', 0, nonEmpty], ['docTxtExcludedPrefixes', 0, nonEmpty], ['licenseTreeRoots', 1, segment], ['licenseTreeSuffixes', 1, extension],
  ];
  for (const [field, minimum, valid] of lists) if (!names(rule[field], minimum, valid)) return refuse(`${field} is unreadable`);
  const read = rule as unknown as ProjectDocumentationRule;
  const overlap = [...read.documentSuffixes, ...read.docTreeExtensions, ...read.licenseTreeSuffixes].filter(entry => sourceExtensions.includes(entry));
  if (overlap.length > 0) return refuse(`meets sourceExtensions (${overlap.join(', ')}), which the policy says it never does`);
  return {
    ok: true,
    rule: Object.freeze({
      rootStemNumericPrefix: Object.freeze({ digitCount: prefix['digitCount'] as number, digits: prefix['digits'], separator: prefix['separator'], optional: prefix['optional'] }),
      rootStems: Object.freeze([...read.rootStems]), documentSuffixes: Object.freeze([...read.documentSuffixes]), docTreeRoots: Object.freeze([...read.docTreeRoots]),
      docTreeExtensions: Object.freeze([...read.docTreeExtensions]), docExcludedTokens: Object.freeze([...read.docExcludedTokens]), docTokenSeparators: separators,
      docTxtExcludedNames: Object.freeze([...read.docTxtExcludedNames]), docTxtExcludedPrefixes: Object.freeze([...read.docTxtExcludedPrefixes]),
      licenseTreeRoots: Object.freeze([...read.licenseTreeRoots]), licenseTreeSuffixes: Object.freeze([...read.licenseTreeSuffixes]),
      ownerPlacements: placements,
    }),
  };
}

const fold = (text: string): string => text.replace(/[A-Z]/gu, letter => letter.toLowerCase());

function hasExcludedWord(name: string, rule: ProjectDocumentationRule): boolean {
  let word = '';
  for (const character of `${name}${rule.docTokenSeparators[0]}`) {
    if (!rule.docTokenSeparators.includes(character)) { word += character; continue; }
    if (rule.docExcludedTokens.includes(word)) return true;
    word = '';
  }
  return false;
}

/** The names left once each fitting extension is removed (the name must be longer than the extension), or none when none fits. */
const stemsWithout = (name: string, extensions: readonly string[]): string[] =>
  extensions.filter(entry => name.length > entry.length && name.endsWith(entry)).map(entry => name.slice(0, name.length - entry.length));

function rootDocument(segments: readonly string[], rule: ProjectDocumentationRule): boolean {
  if (segments.length !== 1) return false;
  const { digitCount, digits, separator, optional } = rule.rootStemNumericPrefix;
  let name = segments[0]!;
  const head = name.slice(0, digitCount);
  const present = head.length === digitCount && [...head].every(character => digits.includes(character)) && name.startsWith(separator, digitCount);
  if (present) name = name.slice(digitCount + separator.length);
  else if (!optional) return false;
  return rule.documentSuffixes.some(suffix => name.endsWith(suffix) && rule.rootStems.includes(name.slice(0, name.length - suffix.length)));
}

function docsTree(segments: readonly string[], rule: ProjectDocumentationRule): boolean {
  if (segments.length < 2 || !rule.docTreeRoots.includes(segments[0]!)) return false;
  const name = segments.at(-1)!;
  const stems = stemsWithout(name, rule.docTreeExtensions);
  if (stems.length === 0) return false;
  if (segments.slice(1, -1).some(directory => hasExcludedWord(directory, rule)) || stems.some(stem => hasExcludedWord(stem, rule))) return false;
  return !(name.endsWith(TXT) && (rule.docTxtExcludedNames.includes(name) || rule.docTxtExcludedPrefixes.some(prefix => name.startsWith(prefix))));
}

function licensesTree(segments: readonly string[], rule: ProjectDocumentationRule): boolean {
  if (segments.length !== 2 || !rule.licenseTreeRoots.includes(segments[0]!)) return false;
  const stems = stemsWithout(segments[1]!, rule.licenseTreeSuffixes);
  return stems.length > 0 && !stems.some(stem => hasExcludedWord(stem, rule));
}

/** The path rules that match a repository-relative path; a path with an empty, '.' or '..' segment, a backslash or a leading or
 * trailing '/' matches none. `owner-placement` is listed once for each `ownerPlacements` entry that places the path for `subject` (the
 * repository it is read from and the admitted commit it is read at); with no subject no placement matches. */
export function documentationPathRules(repositoryPath: string, rule: ProjectDocumentationRule, subject: PlacementSubject | null = null): DocumentationPathRuleId[] {
  const folded = fold(repositoryPath);
  if (folded.includes('\\')) return [];
  const segments = folded.split('/');
  if (segments.some(part => part === '' || part === '.' || part === '..')) return [];
  const matched = PATH_RULE_IDS.filter(id => (id === 'root-document' ? rootDocument : id === 'docs-tree' ? docsTree : licensesTree)(segments, rule));
  if (subject === null) return matched;
  const placed = rule.ownerPlacements.filter(entry => entry.repository === subject.repository && entry.commits.includes(subject.commit) && entry.paths.includes(folded));
  return [...matched, ...placed.map((): DocumentationPathRuleId => 'owner-placement')];
}

/** The classes this screen classifies a blob's body into: RFC5-14's `governance-text` (version 5, variants b, bd and bcd),
 * `project-documentation` (version 2) and `code-content`. */
export type PublicSourceContentClass = 'governance-text' | 'project-documentation' | 'code-content';

/** The governance-text class's inputs beside the other two: its folded root names (null when the policy classifies no such class, as
 * versions 1 to 4 do), and the subject the owner's placements are compared with. */
export interface ClassificationContext {
  readonly governanceTextPaths?: readonly string[] | null;
  readonly subject?: PlacementSubject | null;
}

/** The class a public-source blob's body is admitted under, or undefined when it is indeterminate. `documentation` is null when the
 * project-documentation class is not classified: the policy has no such rule, or the in-force RFC-0005 vocabulary cannot be confirmed
 * to list the class (the scope's `prerequisite`). A path that this documentation rule matches is never code-content, whatever it ends
 * with; a path that the governance-text rule and another class's rule both match has two classes and is indeterminate (version 5). */
export function publicSourceContentClass(repositoryPath: string, sourceExtensions: readonly string[], documentation: ProjectDocumentationRule | null,
  context: ClassificationContext = {}): PublicSourceContentClass | undefined {
  const governanceText = context.governanceTextPaths != null && context.governanceTextPaths.includes(fold(repositoryPath));
  const projectDocumentation = documentation !== null && documentationPathRules(repositoryPath, documentation, context.subject ?? null).length === 1;
  const name = repositoryPath.split('/').at(-1) ?? '';
  const codeContent = !projectDocumentation && sourceExtensions.some(entry => name.endsWith(entry));
  const classes = ([['governance-text', governanceText], ['project-documentation', projectDocumentation], ['code-content', codeContent]] as const)
    .filter(([, matched]) => matched).map(([found]) => found);
  return classes.length === 1 ? classes[0] : undefined;
}

/** sha256 of the governance-text rule text this module implements (version 5, UTF-8). */
const GOVERNANCE_TEXT_RULE = 'a5530c34f0c3c45b57245e9e028685a0b33058fe235871a3a36cdf9650bbbadc';
/** The governance-text class's folded root names, or null when the policy classifies no such class (versions 1 to 4: no rule and an
 * empty `governanceTextPaths`). */
export type GovernanceTextRead = { readonly ok: true; readonly paths: readonly string[] | null } | { readonly ok: false; readonly why: string };

/** Reads the governance-text rule and its `governanceTextPaths` from a policy's `contentClassification`. A path is classified only when
 * it has exactly one segment and, after the ASCII fold, equals a listed name, so a listed name that could never equal a folded
 * one-segment path (an A-Z letter, a '/', a backslash, an empty, '.' or '..' name) refuses, as does any other text or field. Such a
 * body is data, never policy: nothing here reads a target body as an input to this policy. */
export function readGovernanceTextRule(classification: unknown): GovernanceTextRead {
  const refuse = (why: string): GovernanceTextRead => ({ ok: false, why: `its governance-text rule ${why}` });
  if (!isRecord(classification)) return { ok: true, paths: null };
  const rules = Array.isArray(classification['rules']) ? classification['rules'] : [];
  const found = rules.filter((rule: unknown) => isRecord(rule) && rule['class'] === 'governance-text');
  const paths = classification['governanceTextPaths'];
  if (found.length === 0) {
    return paths === undefined || (Array.isArray(paths) && paths.length === 0) ? { ok: true, paths: null } : refuse('is absent, yet governanceTextPaths lists names');
  }
  if (found.length > 1) return refuse('appears more than once');
  const rule = found[0] as Readonly<Record<string, unknown>>;
  const keys = Object.keys(rule);
  if (keys.length !== 2 || typeof rule['rule'] !== 'string' || sha256(rule['rule']) !== GOVERNANCE_TEXT_RULE) return refuse('text is not the text this screen implements');
  const classified = classification['classesClassified'];
  if (!Array.isArray(classified) || !classified.includes('governance-text')) return refuse('names a class classesClassified does not list');
  if (!names(paths, 1, segment)) return refuse('governanceTextPaths is unreadable');
  return { ok: true, paths: Object.freeze([...paths]) };
}

/** The version-3 scope's code-content exemption (`publicSourceScope.activeContent.codeContentExemption`, approved 2026-10-08, variant
 * `all`; package `contracts/candidates/public-source-screening-scope-v3/`), shared by both screens for the reason the class above is.
 *
 * Its rule lifts, for an exempt body only, the active-content scan, its success condition and the malformed-code-context exclusion;
 * every detector still runs, and a project-documentation body, or a code-content body whose extension the exemption does not list, is
 * scanned as before. Its `renderCondition` binds every page sink the body reaches: a consumer that cannot confirm it for a page scans
 * the body as before for that page (`pageSinkCspFinding` below checks the policy half; the dossier's `render.ts` applies it).
 *
 * As for the class rule, the texts are pinned by digest: the screen implements one reading of one text, and any other text (either
 * variant's `appliesTo` is accepted, the extension list deciding the variant) refuses the screen. */
const EXEMPTION_TEXTS = {
  appliesTo: ['d202ff90a058d968503ef1de9f1de6f13cb31d4217b6761dee2579e8fc0f97b4', '215d99e9b193efd3be87442cf55fec0b4c37d3482767917b0ddfacee987fcbca'],
  // Version 3's text, and version 5's, which names projectDocumentationExemption for the bodies this exemption does not name.
  rule: ['b2d0ec79e84ac51239073b9c84040d92951400575c6204825d990681d0b4a41c', 'f08bb1c9462d3c73f184e715665523bc0a56d0db69eab64230ae6ffbf640337e'],
  renderCondition: '2942af13a00058568faaf88e6a3abe9f43a9a1f0c056f1531fd2aff4797265a9',
  egress: '4ffff86212a31309259037674aa7d95f4458c2f460335ef12198ba7a453148fd',
} as const;
const EXEMPTION_KEYS = ['appliesTo', 'exemptExtensions', 'rule', 'renderCondition', 'egress'] as const;
const EXTENSION_SHAPE = /^\.[^/\s]+$/u;

export interface CodeContentExemption {
  /** The extensions whose code-content bodies skip the active-content scan, each one of `sourceExtensions`. */
  readonly exemptExtensions: readonly string[];
}
/** `exemption` is null when the scope declares none (versions 1 and 2). */
export type CodeContentExemptionRead = { readonly ok: true; readonly exemption: CodeContentExemption | null } | { readonly ok: false; readonly why: string };

/** Reads the exemption from a policy's `publicSourceScope`. Any malformed or unrecognised field refuses. */
export function readCodeContentExemption(scope: unknown, sourceExtensions: readonly string[]): CodeContentExemptionRead {
  const refuse = (why: string): CodeContentExemptionRead => ({ ok: false, why: `its code-content exemption ${why}` });
  const active = isRecord(scope) ? scope['activeContent'] : undefined;
  if (!isRecord(active) || !Object.hasOwn(active, 'codeContentExemption')) return { ok: true, exemption: null };
  const exemption = active['codeContentExemption'];
  if (!isRecord(exemption)) return refuse('is not an object');
  const keys = Object.keys(exemption);
  if (keys.length !== EXEMPTION_KEYS.length || EXEMPTION_KEYS.some(key => !keys.includes(key))) return refuse(`carries the fields ${keys.join(', ')}, not exactly ${EXEMPTION_KEYS.join(', ')}`);
  const applies = exemption['appliesTo'];
  if (typeof applies !== 'string' || !(EXEMPTION_TEXTS.appliesTo as readonly string[]).includes(sha256(applies))) return refuse('appliesTo is not a text this screen implements');
  const ruleText = exemption['rule'];
  if (typeof ruleText !== 'string' || !(EXEMPTION_TEXTS.rule as readonly string[]).includes(sha256(ruleText))) return refuse('rule is not a text this screen implements');
  for (const key of ['renderCondition', 'egress'] as const) {
    const value = exemption[key];
    if (typeof value !== 'string' || sha256(value) !== EXEMPTION_TEXTS[key]) return refuse(`${key} is not the text this screen implements`);
  }
  const extensions = exemption['exemptExtensions'];
  if (!Array.isArray(extensions) || extensions.length === 0 || new Set(extensions).size !== extensions.length
    || !extensions.every(entry => typeof entry === 'string' && sourceExtensions.includes(entry))) {
    return refuse('exemptExtensions is not a non-empty list of distinct sourceExtensions entries');
  }
  // `codeContentExempt` matches on the final path segment, which is sound only for an extension with no `/`: the shape is checked here,
  // not left to each caller's own `sourceExtensions` check.
  if (!extensions.every(entry => EXTENSION_SHAPE.test(entry) && !entry.includes('..'))) {
    return refuse('exemptExtensions lists an entry that is not a dot followed by no slash, no whitespace and no `..`');
  }
  return { ok: true, exemption: Object.freeze({ exemptExtensions: Object.freeze([...extensions as string[]]) }) };
}

/** Whether a body at `repositoryPath`, admitted under `contentClass`, skips the active-content scan: the exemption is declared, the
 * class is code-content and the final path segment ends with one of its extensions, compared case-sensitively as `sourceExtensions` are.
 * A project-documentation body never does, whatever it ends with. */
export function codeContentExempt(repositoryPath: string, contentClass: PublicSourceContentClass | undefined, exemption: CodeContentExemption | null): boolean {
  if (exemption === null || contentClass !== 'code-content') return false;
  const name = repositoryPath.split('/').at(-1) ?? '';
  return exemption.exemptExtensions.some(entry => name.endsWith(entry));
}

/** The version-5 scope's project-documentation exemption (`publicSourceScope.activeContent.projectDocumentationExemption`, approved
 * 2026-11-03, variant `bcd`): a body this scope classifies project-documentation, under any of its path rules, skips the active-content
 * scan, its success condition and the malformed-code-context exclusion; every detector and `secretRedaction` still apply, and a
 * governance-text body is scanned as before. It holds at a page sink only under version 3's `renderCondition`, read for this body, so
 * a consumer that cannot confirm that condition for a page scans the body as before there (`render.ts`). Every text is pinned. */
const DOCUMENTATION_EXEMPTION_TEXTS = {
  appliesTo: 'fbf912d13faabc2b96b6e0563895df3a9f325e6f4a528a56704408eddbfa326b',
  rule: '1f9f0cf62ebeb0010866f546afde331a34d34f3190424dd89377f8d8482c5b7e',
  renderCondition: '8e599d1e618ffd959431a4b10a83ed4e9de9c17a30f7b01c950696af60b110e9',
  egress: 'cb5e93b4ed5e935a1b793100cdf89a895da1c7180545a4ae423abbcbea67b29d',
  consequence: 'cc2c14cbc95f157fd56886e222a09e26edb5fa1bb370efa602849c683e4488d4',
} as const;
/** `declared` is false when the scope declares no such exemption (versions 1 to 4). */
export type DocumentationExemptionRead = { readonly ok: true; readonly declared: boolean } | { readonly ok: false; readonly why: string };

/** Reads the exemption from a policy's `publicSourceScope`. Any other field set or text refuses. */
export function readProjectDocumentationExemption(scope: unknown): DocumentationExemptionRead {
  const refuse = (why: string): DocumentationExemptionRead => ({ ok: false, why: `its project-documentation exemption ${why}` });
  const active = isRecord(scope) ? scope['activeContent'] : undefined;
  if (!isRecord(active) || !Object.hasOwn(active, 'projectDocumentationExemption')) return { ok: true, declared: false };
  const exemption = active['projectDocumentationExemption'];
  if (!isRecord(exemption)) return refuse('is not an object');
  const expected = Object.keys(DOCUMENTATION_EXEMPTION_TEXTS) as (keyof typeof DOCUMENTATION_EXEMPTION_TEXTS)[];
  const keys = Object.keys(exemption);
  if (keys.length !== expected.length || expected.some(key => !keys.includes(key))) return refuse(`carries the fields ${keys.join(', ')}, not exactly ${expected.join(', ')}`);
  for (const key of expected) {
    const value = exemption[key];
    if (typeof value !== 'string' || sha256(value) !== DOCUMENTATION_EXEMPTION_TEXTS[key]) return refuse(`${key} is not the text this screen implements`);
  }
  return { ok: true, declared: true };
}

/** Whether a body admitted under `contentClass` skips the active-content scan under the project-documentation exemption: the exemption
 * is declared and the class is project-documentation, whichever path rule placed it. A governance-text or code-content body never does. */
export function documentationExempt(contentClass: PublicSourceContentClass | undefined, declared: boolean): boolean {
  return declared && contentClass === 'project-documentation';
}

/** What a page renderer declares (as its `pageSinkContract` property) when it writes every byte of a source body or span it puts on a
 * page as text, each of `& < > " '` as a character reference, never parsed as Markdown or HTML and never minting a link, element,
 * attribute, script or handler: the encoding half of `renderCondition`. The declaration is the renderer's; its own tests must fail if a
 * page path stops encoding. A consumer reads it together with `pageSinkCspFinding` on every page drawn. */
export const PAGE_SINK_CONTRACT = 'polaris/page-sink/escaped-text-under-csp/1';

/** Directives a later declaration lets override `default-src` for script or plugin fetches; `renderCondition` forbids each. */
const FORBIDDEN_DIRECTIVES = ['script-src', 'script-src-elem', 'script-src-attr', 'object-src'] as const;
const CSP_META = /<meta\s[^>]*http-equiv\s*=\s*(["'])\s*content-security-policy(?:-report-only)?\s*\1[^>]*>/giu;
const decodeAttribute = (value: string): string =>
  value.replace(/&(?:#39|#x27|apos);/giu, '\'').replace(/&(?:#34|#x22|quot);/giu, '"').replace(/&(?:#38|#x26|amp);/giu, '&');

/** Why an HTML page does not meet the policy half of `renderCondition`, or null when it does: exactly one enforced
 * Content-Security-Policy `<meta>` (no Report-Only one) in `<head>`, before `<title>`, `<body` and any other element but the charset
 * and viewport metas; a `default-src` whose source list is exactly `'none'`; and none of `script-src`, `script-src-elem`,
 * `script-src-attr` or `object-src`. The encoding half (every body byte written as text, `& < > " '` as character references) is the
 * renderer's, confirmed by its own tests; this checks only what one page's bytes can show. */
export function pageSinkCspFinding(html: string): string | null {
  const metas = [...html.matchAll(CSP_META)];
  if (metas.length !== 1) return `the page carries ${metas.length} Content-Security-Policy meta elements, not exactly one`;
  const meta = metas[0]!;
  if (/content-security-policy-report-only/iu.test(meta[0])) return 'the page\'s Content-Security-Policy is Report-Only, which enforces nothing';
  const before = html.slice(0, meta.index);
  const head = /^<!doctype html>\s*<html(?:\s[^>]*)?>\s*<head>\s*/iu.exec(before);
  const rest = head === null ? null : before.slice(head[0].length).replace(/<meta\s+charset\s*=\s*"[^"<>]*"\s*\/?>\s*/iu, '').replace(/<meta\s+name\s*=\s*"viewport"\s+content\s*=\s*"[^"<>]*"\s*\/?>\s*/iu, '');
  if (rest !== '') return 'the page\'s Content-Security-Policy is not delivered first in <head>, before every other element but the charset and viewport metas';
  const content = /\scontent\s*=\s*"([^"]*)"/iu.exec(meta[0]) ?? /\scontent\s*=\s*'([^']*)'/iu.exec(meta[0]);
  if (content === null) return 'the page\'s Content-Security-Policy meta carries no content attribute';
  const directives = decodeAttribute(content[1]!).split(';').map(part => part.trim()).filter(part => part !== '').map(part => part.split(/\s+/u));
  const named = (name: string) => directives.filter(([directive]) => directive!.toLowerCase() === name);
  const defaults = named('default-src');
  if (defaults.length !== 1 || defaults[0]!.length !== 2 || defaults[0]![1]!.toLowerCase() !== '\'none\'') return 'the page\'s default-src source list is not exactly \'none\'';
  const forbidden = FORBIDDEN_DIRECTIVES.filter(name => named(name).length > 0);
  if (forbidden.length > 0) return `the page's Content-Security-Policy carries ${forbidden.join(', ')}, which may override default-src for script or plugins`;
  return null;
}
