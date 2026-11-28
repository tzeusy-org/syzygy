import { unconsentedClass } from './class-gate.js';
import { shownPath } from './census.js';
import { secretOrUnder, setApartPath } from './derive.js';
import { NPM_PACKAGE_MANIFEST } from './derive-rules.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { scanImports, type ImportForm } from './import-facts-lexer.js';
import { MANIFEST_PATH_LIMIT, type ManifestFacts, type ManifestInputs } from './manifest-facts.js';
import { lineIndex } from './manifest-model.js';
import { secretPathOf } from './screen.js';

/** Lexical import facts (REQ-polaris-generation-034 version 2.39, syzygy-3efd.89): for each TypeScript file of the pinned tree whose whole
 * body the bound screening policy admits, each top-level static import or re-export statement its text holds, collapsed to the
 * `package-manifest` units of version 2.19 (a unit is the raw path of its `package.json`). Stored as the draft check record's member
 * `importFacts`, immediately before `manifestFacts`.
 *
 * An import fact states only that a file's text holds a statement whose operand names, by two finite rules, a file or a package of a unit, or
 * names no unit of the tree; never that code is compiled, loaded or called, or that any resolver configuration applies. Every fact is
 * Inferred: the label is a constant. The member is derived from the pinned tree, its blobs, the screen, the run's content classes and the
 * same check's `manifestFacts` alone, never from the draft, so two checks of one run in which no read is refused write the same bytes. */

export const IMPORT_FACTS_FORMAT = 'polaris-dossier-import-facts/1';
/** The reader's object bound for a candidate: one byte more is refused before it is inflated whole (`too-large`). */
export const IMPORT_BLOB_LIMIT = 262_144;
/** How many named files the member reads: the 2,001st in path order that no earlier reason reaches is `over-read-limit`. */
export const IMPORT_READ_LIMIT = 2_000;
/** The bytes read for the member: a file that would take the total past this is `over-read-limit`, and so is every later file. */
export const IMPORT_BYTE_BUDGET = 16_777_216;
/** The listed entries of `edges`, `files` and `facts` together, measured as the check record writes them. */
export const IMPORT_LIST_BUDGET = 1_900_000;
export const TYPESCRIPT_RELATIVE_IMPORT = Object.freeze({ id: 'typescript-relative-import', version: 1 } as const);
export const TYPESCRIPT_PACKAGE_IMPORT = Object.freeze({ id: 'typescript-package-import', version: 1 } as const);

export type ImportUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'too-large' | 'not-utf8-text' | 'secret-detector-match' | 'active-content' | 'redacted-body';
export type StatementOutcome = 'edge' | 'same-unit' | 'external' | 'no-unit' | 'unknown';
export type StatementUnknownReason = 'source-unit-undecidable' | 'target-undecidable' | 'target-ambiguous' | 'target-absent' | 'target-unit-undecidable';

export interface ImportEdgeEntry { readonly from: string; readonly to: string; readonly statements: number }
export interface ImportFileEntry {
  readonly path: string;
  readonly outcome: 'scanned' | 'incomplete' | 'unknown';
  readonly unknownReason: ImportUnknownReason | null;
  readonly statements: number | null;
  readonly outsideGrammar: number | null;
}
export interface ImportFact {
  readonly id: string;
  readonly rule: string;
  readonly ruleVersion: number;
  readonly path: string;
  readonly lines: readonly [number, number];
  readonly form: ImportForm;
  readonly outcome: StatementOutcome;
  readonly from: string | null;
  readonly to: string | null;
  readonly unknownReason: StatementUnknownReason | null;
  readonly epistemic: 'inferred' | 'unknown';
}
export type ImportFacts =
  | {
    readonly format: typeof IMPORT_FACTS_FORMAT;
    readonly state: 'derived';
    readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
    readonly rules: readonly { readonly rule: string; readonly ruleVersion: number }[];
    readonly label: 'inferred';
    readonly languages: readonly { readonly language: string; readonly state: 'assessed' | 'unevaluated' }[];
    readonly coverage: 'complete' | 'partial' | 'unknown';
    readonly candidates: number;
    readonly secretPathsLeftOut: number;
    readonly setApart: number;
    readonly scanned: number;
    readonly incomplete: number;
    readonly unknown: number;
    readonly statements: { readonly edge: number; readonly sameUnit: number; readonly external: number; readonly noUnit: number; readonly unknown: number };
    readonly outsideGrammar: number;
    readonly edges: readonly ImportEdgeEntry[];
    readonly edgesNotListed: number;
    readonly files: readonly ImportFileEntry[];
    readonly filesNotListed: number;
    readonly facts: readonly ImportFact[];
    readonly factsNotListed: number;
  }
  | { readonly format: typeof IMPORT_FACTS_FORMAT; readonly state: 'unknown'; readonly why: string };

export interface ImportInputs extends Omit<ManifestInputs, 'read'> {
  /** Read one blob at the pinned revision, in its own call of the pinned reader whose object bound is `IMPORT_BLOB_LIMIT`. */
  readonly read: (path: string) => Promise<VerifiedBlob>;
  /** The same check's `manifestFacts` member. */
  readonly manifestFacts: ManifestFacts;
}

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
const FILE_MODES = new Set(['100644', '100755']);
const SYMLINK = '120000';
const citable = (path: string): boolean => path.length <= MANIFEST_PATH_LIMIT && !CONTROL.test(path);
const dirOf = (path: string): string => (path.includes('/') ? path.slice(0, path.lastIndexOf('/')) : '');
const join = (dir: string, name: string): string => (dir === '' ? name : `${dir}/${name}`);

/** A statement's target before its unit: a file of the tree, a package's unit, or why it names none. */
type Target =
  | { readonly kind: 'file'; readonly path: string }
  | { readonly kind: 'unit'; readonly unit: string }
  | { readonly kind: 'external' }
  | { readonly kind: 'unknown'; readonly reason: 'target-undecidable' | 'target-ambiguous' | 'target-absent' };
/** A unit as the unit rule finds it: a `package.json` path, no unit, or undecidable. */
type UnitOf = { readonly kind: 'unit'; readonly path: string } | { readonly kind: 'none' } | { readonly kind: 'undecidable' };

interface Statement { readonly path: string; readonly first: number; readonly last: number; readonly position: number; readonly form: ImportForm; readonly rule: string; readonly outcome: StatementOutcome; readonly from: string | null; readonly to: string | null; readonly unknownReason: StatementUnknownReason | null }

export async function deriveImportFacts(inputs: ImportInputs): Promise<ImportFacts> {
  const { screen } = inputs;
  const isSecretPath = secretPathOf(screen);
  const secret = (path: string): boolean => secretOrUnder(path.split('/'), isSecretPath);
  const modeAt = new Map(inputs.entries.map((entry) => [entry.path, entry.mode]));
  /** Whether the listing holds the path, or any of its directory prefixes, as a symbolic link. */
  const throughLink = (path: string): boolean => {
    const segments = path.split('/');
    for (let i = 1; i <= segments.length; i++) if (modeAt.get(segments.slice(0, i).join('/')) === SYMLINK) return true;
    return false;
  };
  /** Whether a blob would be admitted as a cited blob: citable, no secret path, the path screen and the class gate admit it. */
  const admittedBlob = (path: string): boolean =>
    citable(path) && !secret(path) && screen.screenPath(path) === undefined && unconsentedClass(screen.contentClass(path), inputs.consented) === undefined;

  const unitCache = new Map<string, UnitOf>();
  /** The unit rule: the `package.json` entry of the nearest directory enclosing the file, its own first and the root last. */
  const unitOf = (file: string): UnitOf => {
    let dir = dirOf(file);
    const cached = unitCache.get(dir);
    if (cached !== undefined) return cached;
    const start = dir;
    let found: UnitOf = { kind: 'none' };
    for (;;) {
      const manifest = join(dir, 'package.json');
      const mode = modeAt.get(manifest);
      if (mode !== undefined) {
        const decidable = FILE_MODES.has(mode) && citable(manifest) && !secret(manifest) && screen.screenPath(manifest) !== 'denied-path' && !setApartPath(manifest);
        found = decidable ? { kind: 'unit', path: manifest } : { kind: 'undecidable' };
        break;
      }
      if (dir === '') break;
      dir = dirOf(dir);
    }
    unitCache.set(start, found);
    return found;
  };

  const npm = inputs.manifestFacts.state === 'derived' ? inputs.manifestFacts.recognizers.find((r) => r.rule === NPM_PACKAGE_MANIFEST.id && r.ruleVersion === NPM_PACKAGE_MANIFEST.version) : undefined;
  const packagesDecide = inputs.manifestFacts.state === 'derived' && inputs.manifestFacts.factsNotListed === 0 && npm !== undefined
    && npm.secretPathsLeftOut === 0 && npm.setApart === 0 && npm.unknown === 0 && npm.valuesLeftOut === 0 && npm.filesNotListed === 0;
  const declarers = new Map<string, string[]>();
  if (packagesDecide && inputs.manifestFacts.state === 'derived') {
    for (const fact of inputs.manifestFacts.facts) {
      if (fact.fact !== 'package' || fact.rule !== NPM_PACKAGE_MANIFEST.id || fact.ruleVersion !== NPM_PACKAGE_MANIFEST.version || typeof fact['name'] !== 'string') continue;
      const list = declarers.get(fact['name'] as string) ?? [];
      list.push(fact.path);
      declarers.set(fact['name'] as string, list);
    }
  }

  /** Rule `typescript-relative-import` version 1, or `outside` where the operand is outside the grammar. */
  const relative = (file: string, operand: string): Target | 'outside' => {
    if (operand === '.' || operand === '..' || operand.endsWith('/')) return 'outside';
    const segments = operand.split('/');
    if (segments.some((segment) => segment === '')) return 'outside';
    const out = dirOf(file) === '' ? [] : dirOf(file).split('/');
    let throughLinkedDirectory = false;
    for (const segment of segments) {
      if (segment === '.') continue;
      if (segment === '..') {
        if (out.length === 0) return 'outside';
        if (modeAt.get(out.join('/')) === SYMLINK) throughLinkedDirectory = true;
        out.pop();
        continue;
      }
      out.push(segment);
    }
    const path = out.join('/');
    const last = out[out.length - 1] ?? '';
    let addresses: string[];
    if (last.endsWith('.ts')) addresses = [path];
    else if (last.endsWith('.js')) addresses = [`${path.slice(0, -3)}.ts`];
    else if (!last.includes('.')) addresses = [`${path}.ts`, `${path}/index.ts`];
    else return 'outside';
    if (throughLinkedDirectory) return { kind: 'unknown', reason: 'target-undecidable' };
    // An address the listing does not hold, or holds as a directory or a submodule, is passed over; the first other one decides.
    for (const address of addresses) {
      if (throughLink(address)) return { kind: 'unknown', reason: 'target-undecidable' };
      const mode = modeAt.get(address);
      if (mode === undefined || !FILE_MODES.has(mode)) continue;
      return admittedBlob(address) ? { kind: 'file', path: address } : { kind: 'unknown', reason: 'target-undecidable' };
    }
    return { kind: 'unknown', reason: 'target-absent' };
  };

  /** Rule `typescript-package-import` version 1, or `outside` where neither rule takes the operand. */
  const packaged = (operand: string): Target | 'outside' => {
    const segments = operand.split('/');
    const first = segments[0]!;
    if (first === '' || /^[./#_]/u.test(first)) return 'outside';
    if (first.startsWith('@') && (segments.length < 2 || segments[1] === '')) return 'outside';
    const name = first.startsWith('@') ? `${first}/${segments[1]}` : first;
    if (!packagesDecide) return { kind: 'unknown', reason: 'target-undecidable' };
    const found = declarers.get(name) ?? [];
    if (found.length > 1) return { kind: 'unknown', reason: 'target-ambiguous' };
    if (found.length === 1) return { kind: 'unit', unit: found[0]! };
    return { kind: 'external' };
  };

  const blobs = [...inputs.entries].filter((entry) => BLOB_MODES.has(entry.mode) && entry.path.endsWith('.ts')).sort((a, b) => byCodeUnit(a.path, b.path));
  let secretPathsLeftOut = 0, setApart = 0, readable = 0, budget = 0, spent = false;
  const unread: ImportFileEntry[] = [];
  const read: ImportFileEntry[] = [];
  const statements: Statement[] = [];
  let outsideGrammar = 0;
  const unknownFile = (path: string, reason: ImportUnknownReason): ImportFileEntry =>
    ({ path: reason === 'path-not-citable' ? shownPath(path) : path, outcome: 'unknown', unknownReason: reason, statements: null, outsideGrammar: null });
  const toRead: Pick<TreeEntry, 'path' | 'mode' | 'id'>[] = [];
  for (const candidate of blobs) {
    const { path } = candidate;
    if (secret(path)) { secretPathsLeftOut++; continue; }
    if (setApartPath(path)) { setApart++; continue; }
    if (!citable(path)) { unread.push(unknownFile(path, 'path-not-citable')); continue; }
    if (candidate.mode === SYMLINK) { unread.push(unknownFile(path, 'symbolic-link')); continue; }
    const excluded = screen.screenPath(path);
    if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { unread.push(unknownFile(path, excluded)); continue; }
    if (excluded !== undefined) throw new Error(`import facts: the path screen gave ${excluded} for a path the secret test passed`);
    if (unconsentedClass(screen.contentClass(path), inputs.consented) !== undefined) { unread.push(unknownFile(path, 'class-not-consented')); continue; }
    if (readable >= IMPORT_READ_LIMIT) { unread.push(unknownFile(path, 'over-read-limit')); continue; }
    readable++;
    toRead.push(candidate);
  }
  // One read per file, in path order, one after another: a refused read makes that file Unknown and no other.
  const outcomes: ImportFileEntry[] = [];
  for (const entry of toRead) {
    const { path, id } = entry;
    if (spent) { outcomes.push(unknownFile(path, 'over-read-limit')); continue; }
    let blob: VerifiedBlob;
    try {
      blob = await inputs.read(path);
    } catch (cause) {
      if (!(cause instanceof GitObjectReadRefusal)) throw cause;
      outcomes.push(unknownFile(path, cause.overBound && cause.objectId === id ? 'too-large' : 'object-read-refused'));
      continue;
    }
    if (blob.bytes.byteLength > IMPORT_BLOB_LIMIT) { outcomes.push(unknownFile(path, 'too-large')); continue; }
    if (budget + blob.bytes.byteLength > IMPORT_BYTE_BUDGET) { spent = true; outcomes.push(unknownFile(path, 'over-read-limit')); continue; }
    budget += blob.bytes.byteLength;
    let text: string;
    try { text = STRICT_UTF8.decode(blob.bytes); } catch { outcomes.push(unknownFile(path, 'not-utf8-text')); continue; }
    const screened = screen.screenTargetBody(text, path);
    if (screened.kind === 'excluded') {
      if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`import facts: the body screen gave ${screened.outcome}`);
      outcomes.push(unknownFile(path, screened.outcome));
      continue;
    }
    if (screened.kind === 'redacted') { outcomes.push(unknownFile(path, 'redacted-body')); continue; }
    const scan = scanImports(text);
    const line = lineIndex(text);
    const source = unitOf(path);
    let kept = 0, outside = scan.outsideGrammar;
    scan.statements.forEach((statement, position) => {
      const isRelative = statement.operand === '.' || statement.operand === '..' || statement.operand.startsWith('./') || statement.operand.startsWith('../');
      const target = isRelative ? relative(path, statement.operand) : packaged(statement.operand);
      if (target === 'outside') { outside++; return; }
      kept++;
      const rule = isRelative ? TYPESCRIPT_RELATIVE_IMPORT.id : TYPESCRIPT_PACKAGE_IMPORT.id;
      const decided = outcomeOf(source, target, unitOf);
      statements.push({ path, first: line(statement.start), last: line(statement.end - 1), position, form: statement.form, rule, ...decided });
    });
    outsideGrammar += outside;
    outcomes.push({ path, outcome: scan.complete ? 'scanned' : 'incomplete', unknownReason: null, statements: kept, outsideGrammar: outside });
  }
  for (const outcome of outcomes) (outcome.outcome === 'unknown' ? unread : read).push(outcome);
  read.sort((a, b) => byCodeUnit(a.path, b.path));
  unread.sort((a, b) => byCodeUnit(a.path, b.path));
  const files = [...read, ...unread];

  statements.sort((a, b) => byCodeUnit(a.path, b.path) || a.first - b.first || a.last - b.last || a.position - b.position);
  const facts: ImportFact[] = statements.map((s, k) => ({
    id: `_import-${k + 1}`, rule: s.rule, ruleVersion: 1, path: s.path, lines: [s.first, s.last], form: s.form, outcome: s.outcome,
    from: s.from, to: s.to, unknownReason: s.unknownReason, epistemic: s.outcome === 'unknown' ? 'unknown' : 'inferred',
  }));
  const pairs = new Map<string, ImportEdgeEntry>();
  for (const s of statements) {
    if (s.outcome !== 'edge') continue;
    const key = `${s.from}\u0000${s.to}`;
    const entry = pairs.get(key);
    pairs.set(key, { from: s.from!, to: s.to!, statements: (entry?.statements ?? 0) + 1 });
  }
  const edges = [...pairs.values()].sort((a, b) => byCodeUnit(a.from, b.from) || byCodeUnit(a.to, b.to));
  const count = (outcome: StatementOutcome): number => statements.filter((s) => s.outcome === outcome).length;
  const scanned = files.filter((f) => f.outcome === 'scanned').length;
  const incomplete = files.filter((f) => f.outcome === 'incomplete').length;
  const unknown = files.filter((f) => f.outcome === 'unknown').length;
  const unknownStatements = count('unknown');
  const keptInIncomplete = files.some((f) => f.outcome === 'incomplete' && ((f.statements ?? 0) > 0 || (f.outsideGrammar ?? 0) > 0));
  const coverage = secretPathsLeftOut === 0 && incomplete === 0 && unknown === 0 && outsideGrammar === 0 && unknownStatements === 0 ? 'complete'
    : scanned > 0 || keptInIncomplete ? 'partial' : 'unknown';
  const listed = listWithinBudget([edges, files, facts]);
  return {
    format: IMPORT_FACTS_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    rules: [{ rule: TYPESCRIPT_RELATIVE_IMPORT.id, ruleVersion: 1 }, { rule: TYPESCRIPT_PACKAGE_IMPORT.id, ruleVersion: 1 }],
    label: 'inferred',
    languages: [{ language: 'typescript', state: 'assessed' }, { language: 'python', state: 'unevaluated' }],
    coverage, candidates: blobs.length, secretPathsLeftOut, setApart, scanned, incomplete, unknown,
    statements: { edge: count('edge'), sameUnit: count('same-unit'), external: count('external'), noUnit: count('no-unit'), unknown: unknownStatements },
    outsideGrammar,
    edges: listed[0] as ImportEdgeEntry[], edgesNotListed: edges.length - listed[0]!.length,
    files: listed[1] as ImportFileEntry[], filesNotListed: files.length - listed[1]!.length,
    facts: listed[2] as ImportFact[], factsNotListed: facts.length - listed[2]!.length,
  };
}

/** A statement's outcome, the first that applies, from its file's unit and its target. */
function outcomeOf(source: UnitOf, target: Target, unitOf: (file: string) => UnitOf): Pick<Statement, 'outcome' | 'from' | 'to' | 'unknownReason'> {
  const unknown = (reason: StatementUnknownReason) => ({ outcome: 'unknown' as const, from: null, to: null, unknownReason: reason });
  if (source.kind === 'undecidable') return unknown('source-unit-undecidable');
  if (target.kind === 'unknown') return unknown(target.reason);
  const targetUnit: UnitOf | undefined = target.kind === 'file' ? unitOf(target.path) : target.kind === 'unit' ? { kind: 'unit', path: target.unit } : undefined;
  if (targetUnit?.kind === 'undecidable') return unknown('target-unit-undecidable');
  const from = source.kind === 'unit' ? source.path : null;
  if (source.kind === 'none' || targetUnit?.kind === 'none') return { outcome: 'no-unit', from, to: null, unknownReason: null };
  if (target.kind === 'external' || targetUnit === undefined) return { outcome: 'external', from, to: null, unknownReason: null };
  const to = (targetUnit as { readonly path: string }).path;
  if (to === from) return { outcome: 'same-unit', from, to, unknownReason: null };
  return { outcome: 'edge', from, to, unknownReason: null };
}

/** The size of an entry of one of the three lists as the check record writes it: two-space JSON at the list's indentation (six spaces under
 * the record's root and the member), with a separating comma and newline, as though every entry were followed by both. */
export const listedEntrySize = (entry: unknown): number =>
  UTF8.encode(`      ${JSON.stringify(entry, null, 2).replace(/\n/gu, '\n      ')},\n`).length;
const UTF8 = new TextEncoder();

/** Each list's longest prefix whose entries, with those listed before them in the three lists, stay within `IMPORT_LIST_BUDGET` bytes. */
export function listWithinBudget(lists: readonly (readonly unknown[])[], budget = IMPORT_LIST_BUDGET): unknown[][] {
  let used = 0;
  return lists.map((list) => {
    const out: unknown[] = [];
    for (const entry of list) {
      const size = listedEntrySize(entry);
      if (used + size > budget) break;
      used += size;
      out.push(entry);
    }
    return out;
  });
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and nothing else. */
export const importFactsUnknown = (reason: string): ImportFacts => ({
  format: IMPORT_FACTS_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
