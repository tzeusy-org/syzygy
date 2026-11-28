import { unconsentedClass } from './class-gate.js';
import { CENSUS_LISTED_LIMIT, shownPath } from './census.js';
import { secretOrUnder, vendoredOrGeneratedPath } from './derive.js';
import { DOC_REFERENCE, LANGUAGE_BY_EXTENSION } from './derive-rules.js';
import { recognizeDocReferences, type DocCandidate, type ReferenceWritten } from './doc-references-recognize.js';
import { BLOB_MODES, GitObjectReadRefusal, type TreeEntry, type VerifiedBlob } from './git-object-reader.js';
import { MANIFEST_BLOB_LIMIT, MANIFEST_PATH_LIMIT, MANIFEST_VALUE_LIMIT, type ManifestInputs } from './manifest-facts.js';
import { markerLanguageOf } from './rough-edges-recognize.js';
import { secretPathOf } from './screen.js';
import { scanCLike, scanPython } from './test-names-lexer.js';

/** Docs and code (REQ-polaris-generation-034 version 2.48, syzygy-5dhm.119, pursuit move R24 slice 1): every path and identifier recognizer
 * `doc-reference` v1 reads in the admitted Markdown documents of the pinned tree, each resolved against that tree.
 *
 * A path resolves when the tree lists a file or a directory at one of the paths its form names; where it names none, it is
 * `document-only`, Observed: the listing is the whole tree. An identifier resolves when its last name is an identifier token of a code
 * file read; where no code file read holds it, it is `document-only` only if every code file the rule searches was read, and Unknown
 * otherwise (VIS-2). No stated value is compared, so no row is `agrees` or `disagrees`: existence is never reported as agreement. A row
 * says what the tree holds, never that the document is wrong.
 *
 * Documents and code files take the rough-edge markers' dispositions, in the same order: a path a secret detector matches, or any of
 * whose directory prefixes it matches, is counted and named nowhere; a vendored or generated path is set apart and named nowhere; every
 * other candidate is named, and Unknown and never read where its path is not citable, it is a symbolic link, the screen's path outcome
 * excludes it, the class gate withholds its class, or it is past its read limit. A body is read alone through the reader bound at 1 MiB
 * and screened whole; only a body the screen admits whole is read. A row whose value or quoted line the value checks refuse, or whose
 * path form a secret detector matches, is left out and counted. */

export const DOCS_AND_CODE_FORMAT = 'polaris-dossier-docs-and-code/1';
/** How many documents, and how many code files, the recognizer reads, and how many entries of each it lists. */
export const DOC_READ_LIMIT = 1_000;
export const CODE_READ_LIMIT = 1_000;
/** How many rows the member lists. */
export const DOC_ROWS_LISTED = 2_000;

export type DocsUnknownReason =
  | 'path-not-citable' | 'symbolic-link' | 'denied-path' | 'unknown-extraction-class' | 'class-not-consented' | 'over-read-limit'
  | 'object-read-refused' | 'not-utf8-text' | 'too-large' | 'secret-detector-match' | 'active-content' | 'redacted-body' | 'unparsed';
/** Why a row is Unknown. */
export type RowUnknownReason = 'ambiguous-form' | 'outside-tree' | 'submodule' | 'symbolic-link' | 'build-output-path' | 'code-not-fully-read';

export interface DocsFileEntry {
  readonly path: string;
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: DocsUnknownReason | null;
  readonly parseFault: string | null;
  /** For a document read: its rows by outcome, and the rows the value checks left out. Null for every other entry. */
  readonly resolves: number | null;
  readonly documentOnly: number | null;
  readonly unknown: number | null;
  readonly valuesLeftOut: number | null;
}
export interface DocsPopulation {
  readonly candidates: number;
  readonly secretPathsLeftOut: number;
  readonly setApart: number;
  readonly observed: number;
  readonly unknown: number;
  readonly files: readonly DocsFileEntry[];
  readonly filesNotListed: number;
}
/** Where an identifier's token was found: the lexer's code text, a comment or string interior of a lexed file (its code text holds it
 * nowhere), or the whole text of a file no lexer reads. */
export type IdentifierSearched = 'code-text' | 'comment-or-string' | 'file-text';
export type DocRowResolution =
  | { readonly entry: 'file' | 'directory'; readonly path: string }
  | { readonly entry: 'identifier'; readonly path: string; readonly line: number; readonly blob: string; readonly searched: IdentifierSearched };
export interface DocRow {
  readonly id: string;
  readonly document: string;
  readonly line: number;
  readonly quote: string;
  /** The quote is an exact excerpt of a line longer than 256 characters, holding the reading's start. */
  readonly quoteExcerpt: boolean;
  readonly written: ReferenceWritten;
  readonly value: string;
  readonly form: 'path' | 'identifier';
  readonly outcome: 'resolves' | 'document-only' | 'unknown';
  readonly epistemic: 'observed' | 'unknown';
  readonly unknownReason: RowUnknownReason | null;
  readonly resolution: DocRowResolution | null;
}
export type DocsAndCode =
  | {
      readonly format: typeof DOCS_AND_CODE_FORMAT;
      readonly state: 'derived';
      readonly screeningPolicy: { readonly policyId: string; readonly policyVersion: string; readonly sha256: string };
      readonly rule: { readonly rule: string; readonly ruleVersion: number };
      /** The Markdown documents, every listed entry with its rows by outcome; `spansNotChecked` and `linksNotChecked` count the code
       * spans and links of the documents read whose form the rule does not read, `valuesLeftOut` the rows left out. */
      readonly documents: DocsPopulation & { readonly spansNotChecked: number; readonly linksNotChecked: number; readonly valuesLeftOut: number };
      /** The code files searched for identifiers; only Unknown entries are listed. `read` is false where no row is an identifier, so no
       * code file was read. */
      readonly code: DocsPopulation & { readonly read: boolean };
      readonly counts: { readonly resolves: number; readonly documentOnly: number; readonly unknown: number };
      readonly rows: readonly DocRow[];
      readonly rowsNotListed: number;
    }
  | { readonly format: typeof DOCS_AND_CODE_FORMAT; readonly state: 'unknown'; readonly why: string };

const byCodeUnit = (a: string, b: string): number => (a < b ? -1 : a > b ? 1 : 0);
const CONTROL = /[\u0000-\u001f\u007f]/u;
const STRICT_UTF8 = new TextDecoder('utf-8', { fatal: true, ignoreBOM: true });
/** An identifier token of a code file, published verbatim in the requirement. */
export const TOKEN = /(?<![A-Za-z0-9_$])[A-Za-z_$][A-Za-z0-9_$]*/g;
const SUBMODULE_MODE = '160000';

type Entry = Pick<TreeEntry, 'path' | 'mode' | 'id'>;
type Screen = ManifestInputs['screen'];
type Read = { readonly ok: true; readonly text: string; readonly blob: string } | { readonly ok: false; readonly reason: DocsUnknownReason };

const unknownEntry = (path: string, reason: DocsUnknownReason, parseFault: string | null = null): DocsFileEntry => ({
  path: reason === 'path-not-citable' ? shownPath(path) : path, epistemic: 'unknown', unknownReason: reason, parseFault,
  resolves: null, documentOnly: null, unknown: null, valuesLeftOut: null,
});

const lastExtension = (path: string): string | undefined => {
  const base = path.slice(path.lastIndexOf('/') + 1);
  const dot = base.lastIndexOf('.');
  return dot <= 0 ? undefined : base.slice(dot).toLowerCase();
};
const isDocument = (path: string): boolean => {
  const base = path.slice(path.lastIndexOf('/') + 1).toLowerCase();
  return DOC_REFERENCE.documentExtensions.some((e) => base.endsWith(e) && base.length > e.length);
};
const isSearchedCode = (path: string): boolean => {
  const ext = lastExtension(path);
  const language = ext === undefined ? undefined : LANGUAGE_BY_EXTENSION.table[ext];
  return language !== undefined && !(DOC_REFERENCE.notSearched as readonly string[]).includes(language);
};

/** The dispositions before any read, shared by both populations; returns the entries to read and the Unknown entries. */
function dispose(candidates: readonly Entry[], inputs: ManifestInputs, isSecretPath: (p: string) => boolean, limit: number) {
  let secretPathsLeftOut = 0, setApart = 0, readable = 0;
  const unknown: DocsFileEntry[] = [];
  const toRead: Entry[] = [];
  for (const entry of candidates) {
    const { path, mode } = entry;
    if (secretOrUnder(path.split('/'), isSecretPath)) { secretPathsLeftOut++; continue; }
    if (vendoredOrGeneratedPath(path)) { setApart++; continue; }
    if (path.length > MANIFEST_PATH_LIMIT || CONTROL.test(path)) { unknown.push(unknownEntry(path, 'path-not-citable')); continue; }
    if (mode === '120000') { unknown.push(unknownEntry(path, 'symbolic-link')); continue; }
    const excluded = inputs.screen.screenPath(path);
    if (excluded === 'denied-path' || excluded === 'unknown-extraction-class') { unknown.push(unknownEntry(path, excluded)); continue; }
    if (excluded !== undefined) throw new Error(`docs and code: the path screen gave ${excluded} for a path the secret test passed`);
    if (unconsentedClass(inputs.screen.contentClass(path), inputs.consented) !== undefined) { unknown.push(unknownEntry(path, 'class-not-consented')); continue; }
    if (readable >= limit) { unknown.push(unknownEntry(path, 'over-read-limit')); continue; }
    readable++;
    toRead.push(entry);
  }
  return { secretPathsLeftOut, setApart, unknown, toRead };
}

/** One body, read alone, decoded strictly and screened whole. */
async function readBody({ path, id }: Entry, inputs: ManifestInputs): Promise<Read> {
  let blob: VerifiedBlob;
  try {
    blob = await inputs.read(path);
  } catch (cause) {
    if (!(cause instanceof GitObjectReadRefusal)) throw cause;
    return { ok: false, reason: cause.overBound && cause.objectId === id ? 'too-large' : 'object-read-refused' };
  }
  if (blob.bytes.byteLength > MANIFEST_BLOB_LIMIT) return { ok: false, reason: 'too-large' };
  let text: string;
  try { text = STRICT_UTF8.decode(blob.bytes); } catch { return { ok: false, reason: 'not-utf8-text' }; }
  const screened = inputs.screen.screenTargetBody(text, path);
  if (screened.kind === 'excluded') {
    if (screened.outcome !== 'secret-detector-match' && screened.outcome !== 'active-content') throw new Error(`docs and code: the body screen gave ${screened.outcome}`);
    return { ok: false, reason: screened.outcome };
  }
  if (screened.kind === 'redacted') return { ok: false, reason: 'redacted-body' };
  return { ok: true, text, blob: blob.id };
}

interface Pending { readonly document: string; readonly candidate: DocCandidate }
interface Found { readonly path: string; readonly line: number; readonly blob: string; readonly searched: IdentifierSearched }

export async function deriveDocsAndCode(inputs: ManifestInputs): Promise<DocsAndCode> {
  const { screen } = inputs;
  const isSecretPath = secretPathOf(screen);
  const refusedValue = (value: string): boolean => value.length === 0 || value.length > MANIFEST_VALUE_LIMIT || CONTROL.test(value) || screen.screenBody(value) === 'secret-detector-match';
  const sorted = [...inputs.entries].sort((a, b) => byCodeUnit(a.path, b.path));
  const blobs = sorted.filter((entry) => BLOB_MODES.has(entry.mode));
  const submodules = sorted.filter((entry) => entry.mode === SUBMODULE_MODE).map((entry) => entry.path);

  // The tree the rows resolve against: every blob no secret detector matches, and every directory holding one; and, by each of its
  // tails (the whole path, and the text after each `/`), the first such file and directory in the order of the sorted file paths.
  // A symbolic link is listed as a file, and a path at or under it whose own entry is not listed is Unknown: the link is not followed.
  // A submodule's ancestors are directories; the submodule and what lies under it are Unknown. A directory that holds only paths a secret
  // detector matches is in no listing: a row naming it is left out and counted, never document-only.
  const files = new Set<string>(), directories = new Set<string>(['']);
  const fileByTail = new Map<string, string>(), directoryByTail = new Map<string, string>();
  const symlinks = new Set<string>(), symlinkByTail = new Map<string, string>();
  const submoduleSet = new Set<string>(), submoduleByTail = new Map<string, string>();
  const secretDirectories = new Set<string>(), secretDirectoryByTail = new Map<string, string>();
  const addDirectories = (segments: readonly string[]): void => {
    for (let i = 1; i < segments.length; i++) {
      const directory = segments.slice(0, i).join('/');
      if (!directories.has(directory)) { directories.add(directory); tails(directory, directoryByTail); }
    }
  };
  const tails = (path: string, into: Map<string, string>): void => {
    for (let at = 0; ;) {
      const tail = path.slice(at);
      if (!into.has(tail)) into.set(tail, path);
      const slash = path.indexOf('/', at);
      if (slash < 0) return;
      at = slash + 1;
    }
  };
  for (const { path, mode } of blobs) {
    const segments = path.split('/');
    if (secretOrUnder(segments, isSecretPath)) {
      for (let i = 1; i < segments.length && !isSecretPath(segments.slice(0, i).join('/')); i++) {
        const directory = segments.slice(0, i).join('/');
        if (!secretDirectories.has(directory)) { secretDirectories.add(directory); tails(directory, secretDirectoryByTail); }
      }
      continue;
    }
    files.add(path);
    tails(path, fileByTail);
    if (mode === '120000') { symlinks.add(path); tails(path, symlinkByTail); }
    addDirectories(segments);
  }
  for (const path of submodules) {
    const segments = path.split('/');
    if (secretOrUnder(segments, isSecretPath)) continue;
    submoduleSet.add(path);
    tails(path, submoduleByTail);
    addDirectories(segments);
  }
  /** Whether `path`, or a path it lies under, is in `set`. */
  const atOrUnder = (path: string, has: (p: string) => boolean): boolean => {
    for (let at = path.indexOf('/'); ; at = path.indexOf('/', at + 1)) {
      if (has(at < 0 ? path : path.slice(0, at))) return true;
      if (at < 0) return false;
    }
  };
  const secretOnlyDirectory = (c: Extract<DocCandidate, { form: 'path' }>): boolean =>
    c.tryPaths.some((p) => secretDirectories.has(p) && !directories.has(p))
    || (c.tail !== null && secretDirectoryByTail.has(c.tail) && !directoryByTail.has(c.tail) && !fileByTail.has(c.tail));

  // The documents.
  const docCandidates = blobs.filter((entry) => isDocument(entry.path));
  const docs = dispose(docCandidates, inputs, isSecretPath, DOC_READ_LIMIT);
  const pending: Pending[] = [];
  const read: { path: string; valuesLeftOut: number }[] = [];
  const docUnknown = [...docs.unknown];
  let spansNotChecked = 0, linksNotChecked = 0, valuesLeftOut = 0;
  for (const entry of docs.toRead) {
    const body = await readBody(entry, inputs);
    if (!body.ok) { docUnknown.push(unknownEntry(entry.path, body.reason)); continue; }
    const recognized = recognizeDocReferences(body.text, entry.path);
    if (!recognized.ok) { docUnknown.push(unknownEntry(entry.path, 'unparsed', recognized.parseFault)); continue; }
    spansNotChecked += recognized.spansNotChecked;
    linksNotChecked += recognized.linksNotChecked;
    let leftOut = 0;
    for (const candidate of recognized.candidates) {
      const secretForm = candidate.form === 'path'
        && ([candidate.value, ...candidate.tryPaths, ...(candidate.tail === null ? [] : [candidate.tail])].some((p) => p !== '' && secretOrUnder(p.split('/'), isSecretPath))
          || secretOnlyDirectory(candidate));
      if (secretForm || refusedValue(candidate.value) || refusedValue(candidate.quote)) leftOut++;
      else pending.push({ document: entry.path, candidate });
    }
    valuesLeftOut += leftOut;
    read.push({ path: entry.path, valuesLeftOut: leftOut });
  }

  // The code files, read only where some row is an identifier.
  const wanted = new Set(pending.flatMap((p) => (p.candidate.form === 'identifier' ? [p.candidate.name] : [])));
  const codeCandidates = blobs.filter((entry) => isSearchedCode(entry.path));
  const code = dispose(codeCandidates, inputs, isSecretPath, CODE_READ_LIMIT);
  const codeUnknown = [...code.unknown];
  const found = new Map<string, Found>(), foundInText = new Map<string, Found>();
  let searched = 0;
  if (wanted.size > 0) {
    for (const entry of code.toRead) {
      const body = await readBody(entry, inputs);
      if (!body.ok) { codeUnknown.push(unknownEntry(entry.path, body.reason)); continue; }
      const language = markerLanguageOf(entry.path);
      let text = body.text;
      if (language !== undefined) {
        const scanned = language === 'python' ? scanPython(text) : scanCLike(text, language === 'javascript' ? { javascript: true } : language === 'go' ? { go: true } : { java: true });
        if (!scanned.ok) { codeUnknown.push(unknownEntry(entry.path, 'unparsed', scanned.fault)); continue; }
        text = scanned.code;
      }
      searched++;
      const where = (into: Map<string, Found>, body_: string, searchedAs: IdentifierSearched, skip: Map<string, Found>): void => {
        let line = 1, at = 0;
        for (const m of body_.matchAll(TOKEN)) {
          if (!wanted.has(m[0]) || into.has(m[0]) || skip.has(m[0])) continue;
          for (; at < m.index; at++) {
            const c = body_.charCodeAt(at);
            if (c === 0x0d && body_.charCodeAt(at + 1) === 0x0a) { at++; line++; } else if (c === 0x0d || c === 0x0a) line++;
          }
          into.set(m[0], { path: entry.path, line, blob: body.blob, searched: searchedAs });
        }
      };
      where(found, text, language === undefined ? 'file-text' : 'code-text', new Map());
      // The lexer blanks comments and string interiors in place, so the whole text keeps every line and offset.
      if (language !== undefined) where(foundInText, body.text, 'comment-or-string', found);
    }
  }
  const codeComplete = wanted.size > 0 && code.secretPathsLeftOut === 0 && codeUnknown.length === 0;

  // The rows.
  pending.sort((a, b) => byCodeUnit(a.document, b.document) || a.candidate.offset - b.candidate.offset);
  const rows = pending.map(({ document, candidate }) => ({ document, candidate, ...resolve(candidate) }));
  function resolve(c: DocCandidate): Pick<DocRow, 'outcome' | 'unknownReason' | 'resolution'> {
    const unknown = (reason: RowUnknownReason) => ({ outcome: 'unknown' as const, unknownReason: reason, resolution: null });
    if (c.form === 'identifier') {
      const hit = found.get(c.name) ?? foundInText.get(c.name);
      if (hit !== undefined) return { outcome: 'resolves', unknownReason: null, resolution: { entry: 'identifier', ...hit } };
      return codeComplete ? { outcome: 'document-only', unknownReason: null, resolution: null } : unknown('code-not-fully-read');
    }
    if (c.outside) return unknown('outside-tree');
    const tries = c.tryPaths;
    if (tries.some((p) => atOrUnder(p, (q) => submoduleSet.has(q)))) return unknown('submodule');
    for (const p of tries) {
      if (directories.has(p)) return { outcome: 'resolves', unknownReason: null, resolution: { entry: 'directory', path: p } };
      if (!c.directory && files.has(p)) return { outcome: 'resolves', unknownReason: null, resolution: { entry: 'file', path: p } };
    }
    if (c.tail !== null) {
      const file = c.directory ? undefined : fileByTail.get(c.tail);
      if (file !== undefined) return { outcome: 'resolves', unknownReason: null, resolution: { entry: 'file', path: file } };
      const directory = directoryByTail.get(c.tail);
      if (directory !== undefined) return { outcome: 'resolves', unknownReason: null, resolution: { entry: 'directory', path: directory } };
    }
    if (tries.some((p) => atOrUnder(p, (q) => symlinks.has(q))) || (c.tail !== null && atOrUnder(c.tail, (q) => symlinkByTail.has(q)))) return unknown('symbolic-link');
    if (c.tail !== null && atOrUnder(c.tail, (q) => submoduleByTail.has(q))) return unknown('submodule');
    if (c.ambiguous) return unknown('ambiguous-form');
    if ([...tries, ...(c.tail === null ? [] : [c.tail])].some((p) => vendoredOrGeneratedPath(p))) return unknown('build-output-path');
    return { outcome: 'document-only', unknownReason: null, resolution: null };
  }

  const tally = (list: readonly { outcome: DocRow['outcome'] }[]) => ({
    resolves: list.filter((r) => r.outcome === 'resolves').length,
    documentOnly: list.filter((r) => r.outcome === 'document-only').length,
    unknown: list.filter((r) => r.outcome === 'unknown').length,
  });
  const perDocument = new Map<string, { resolves: number; documentOnly: number; unknown: number }>();
  for (const { path } of read) perDocument.set(path, { resolves: 0, documentOnly: 0, unknown: 0 });
  for (const r of rows) {
    const t = perDocument.get(r.document)!;
    if (r.outcome === 'resolves') t.resolves++; else if (r.outcome === 'document-only') t.documentOnly++; else t.unknown++;
  }
  const docEntries: DocsFileEntry[] = [
    ...read.map(({ path, valuesLeftOut: leftOut }) => ({ path, epistemic: 'observed' as const, unknownReason: null, parseFault: null, ...perDocument.get(path)!, valuesLeftOut: leftOut })),
    ...docUnknown,
  ];
  const listed: DocRow[] = rows.slice(0, DOC_ROWS_LISTED).map(({ document, candidate, outcome, unknownReason, resolution }, index) => ({
    id: `_docref-${index + 1}`, document, line: candidate.line, quote: candidate.quote, quoteExcerpt: candidate.quoteExcerpt, written: candidate.written, value: candidate.value,
    form: candidate.form, outcome, epistemic: outcome === 'unknown' ? 'unknown' : 'observed', unknownReason, resolution,
  }));
  return {
    format: DOCS_AND_CODE_FORMAT, state: 'derived',
    screeningPolicy: { policyId: screen.policyId, policyVersion: screen.policyVersion, sha256: screen.policySha256 },
    rule: { rule: DOC_REFERENCE.id, ruleVersion: DOC_REFERENCE.version },
    documents: {
      candidates: docCandidates.length, secretPathsLeftOut: docs.secretPathsLeftOut, setApart: docs.setApart, observed: read.length, unknown: docUnknown.length,
      files: docEntries.slice(0, DOC_READ_LIMIT), filesNotListed: Math.max(0, docEntries.length - DOC_READ_LIMIT), spansNotChecked, linksNotChecked, valuesLeftOut,
    },
    code: {
      read: wanted.size > 0, candidates: codeCandidates.length, secretPathsLeftOut: code.secretPathsLeftOut, setApart: code.setApart, observed: searched,
      unknown: wanted.size > 0 ? codeUnknown.length : 0,
      files: wanted.size > 0 ? codeUnknown.slice(0, CENSUS_LISTED_LIMIT) : [], filesNotListed: wanted.size > 0 ? Math.max(0, codeUnknown.length - CENSUS_LISTED_LIMIT) : 0,
    },
    counts: tally(rows), rows: listed, rowsNotListed: rows.length - listed.length,
  };
}

/** The member when the pinned tree cannot be listed: Unknown, with the reader's refusal reason, and no row. */
export const docsAndCodeUnknown = (reason: string): DocsAndCode => ({
  format: DOCS_AND_CODE_FORMAT, state: 'unknown', why: `the pinned tree could not be listed (${reason})`,
});
