// Exact Git object reader — the PWB-REQ-006 read guard (task 2.3).
//
// This is the only door through which a phase B body may enter the POC.
// A path is read only when it is already a normalized repository-relative
// path (relative, NUL-free, no `.`/`..`/empty segments), its final segment
// passes the adopted secret policy's denied basename/prefix/suffix rules,
// the exact revision's tree lists a regular blob at that path (symlinks
// `120000`, submodules `160000` and trees are refused by mode, so the
// working tree is never consulted), and the declared resource limits are
// not breached. The reader then issues exactly one Git command, `cat-file
// blob <object-id>`, never a path-addressed read, verifies the returned
// bytes hash to the tree-named object id, and rejects NUL bytes, invalid
// UTF-8 and active content (raw HTML, scripts, SVG, event handlers,
// unsafe or entity-obfuscated URL schemes).
//
// Every attempt is ledgered by a body-free record: path, object id,
// outcome, byte count, sha256 content digest (hash, never body) and a
// closed reason. A refused, over-limit or active source stays counted —
// `readManifestSources` returns one result per manifest source, in
// manifest order, so the population never shrinks. The body itself is
// handed only to the caller's `consume` callback and is never stored on
// any record this module returns.
//
// The registry's resource limits are evaluation inputs: `evaluateLimit`
// is the one comparison every consumer uses (the reader for source count
// and bytes; the observer for index depth; later extraction/rendering for
// parse time and rendered bytes), so a breach is always the same shape.

import { decodeUtf8, sha256 } from '@syzygy/support';

import { type GitTreeEntry, type GitTreeIndex, normalizeRepositoryPath, posixBasename } from './git-tree.js';
import { type MalformedCodeContext, maskMarkdownCodeContexts } from './markdown-code-context.js';
import type { ManifestSource, ProjectShapeSourceManifest } from './project-shape-manifest.js';
import { type GitRunner, PWB_RESOURCE_LIMITS, type PwbResourceLimits, type ResourceLimitBreach, gitBlobObjectId } from './project-shape-observation.js';
import { createResourceLedger, ParsePassBudgetExceeded, type ParsePassCharge, type ResourceLedger } from './resource-ledger.js';

// ---------------------------------------------------------------------
// Policy-bound path rules (copies of the act-bound secret policy's
// `sourceAdmission`; proven byte-equal in the test).

export const PWB_POLICY_IDENTITY = {
  policyId: 'polaris-butlers-project-shape-secrets',
  policyVersion: '1.5.0-public-source-candidate.1.none.code-all.redact-span',
} as const;

export const PWB_DENIED_PATH_RULES = {
  basenames: ['.env', '.env.local', '.env.production', 'credentials.json', 'secrets.json', 'id_rsa', 'id_ed25519'],
  prefixes: ['.env.'],
  suffixes: ['.pem', '.key', '.p12', '.pfx'],
} as const;

export type DeniedPathRules = {
  readonly basenames: readonly string[];
  readonly prefixes: readonly string[];
  readonly suffixes: readonly string[];
};

// ---------------------------------------------------------------------
// Resource limits as evaluation inputs.

export function evaluateLimit(
  limits: PwbResourceLimits,
  limit: keyof PwbResourceLimits,
  observed: number,
  path?: string,
): ResourceLimitBreach | undefined {
  const declared = limits[limit];
  if (Number.isFinite(observed) && observed <= declared) return undefined;
  return path === undefined ? { limit, declared, observed } : { limit, declared, observed, path };
}

// ---------------------------------------------------------------------
// Read guard.

export const READ_REFUSAL_REASONS = [
  'path-escapes-repository', // absolute, NUL-bearing, empty, or `..` above the root
  'path-not-normalized', // contains `.`/`..`/empty segments or a trailing slash
  'denied-basename',
  'denied-prefix',
  'denied-suffix',
  'not-in-tree',
  'not-a-regular-blob', // symlink, submodule or tree entry
  'object-id-differs-from-tree',
] as const;
type ReadRefusalReason = (typeof READ_REFUSAL_REASONS)[number];

type ReadAdmission =
  | { readonly kind: 'admitted'; readonly entry: GitTreeEntry }
  | { readonly kind: 'refused'; readonly reason: ReadRefusalReason };

const REGULAR_BLOB_MODES: readonly string[] = ['100644', '100755'];
const OBJECT_ID = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;

// The policy applies basename and prefix rules to the final segment and
// suffix rules to the complete final segment. Comparison is
// case-insensitive: that only ever denies more.
export function deniedPathReason(path: string, rules: DeniedPathRules = PWB_DENIED_PATH_RULES): 'denied-basename' | 'denied-prefix' | 'denied-suffix' | undefined {
  const segment = posixBasename(path).toLowerCase();
  if (rules.basenames.some((name) => name.toLowerCase() === segment)) return 'denied-basename';
  if (rules.prefixes.some((prefix) => segment.startsWith(prefix.toLowerCase()))) return 'denied-prefix';
  if (rules.suffixes.some((suffix) => segment.endsWith(suffix.toLowerCase()))) return 'denied-suffix';
  return undefined;
}

export function admitExactObjectRead(
  tree: GitTreeIndex,
  path: string,
  expectedObjectId?: string,
  rules: DeniedPathRules = PWB_DENIED_PATH_RULES,
): ReadAdmission {
  const normalized = normalizeRepositoryPath(path);
  if (normalized === undefined) return { kind: 'refused', reason: 'path-escapes-repository' };
  if (normalized !== path) return { kind: 'refused', reason: 'path-not-normalized' };
  const denied = deniedPathReason(path, rules);
  if (denied !== undefined) return { kind: 'refused', reason: denied };
  const entry = tree.entryAt(path);
  if (entry === undefined) return { kind: 'refused', reason: 'not-in-tree' };
  if (entry.type !== 'blob' || !REGULAR_BLOB_MODES.includes(entry.mode) || !OBJECT_ID.test(entry.objectId)) {
    return { kind: 'refused', reason: 'not-a-regular-blob' };
  }
  if (expectedObjectId !== undefined && expectedObjectId !== entry.objectId) return { kind: 'refused', reason: 'object-id-differs-from-tree' };
  return { kind: 'admitted', entry };
}

// ---------------------------------------------------------------------
// Active content.
//
// The closed set of forms PWB-REQ-006 forbids from ever reaching a sink.
// A match excludes the whole source; the finding names only the form and
// where it starts, never the matched bytes.
//
// Since the 2026-09-05 truth-and-readiness amendment (PWB-REQ-006) and the
// policy amendment's `activeContentClassification.markdownProfile`, closed
// inline code spans and fenced code blocks are inert Markdown contexts:
// `scanActiveContent` masks them first (`markdown-code-context.ts`) and the
// active forms are matched only outside them. A malformed context —
// unclosed fence, unclosed span, backtick fence with a backtick in its info
// string — is itself a finding (`malformed-code-context`), because the
// policy's `malformedContextAction` is exclude-whole-artifact. Secret
// detectors never see the mask; they scan the raw text elsewhere.

export const ACTIVE_CONTENT_FORMS = [
  'html-tag', // any raw HTML tag (CommonMark autolinks are not tags)
  'html-comment-or-declaration', // `<!-- -->`, `<!DOCTYPE …>`, `<![CDATA[`, `<?…?>`
  'script-element',
  'svg-element',
  'event-handler-attribute', // `onload=`, `onerror=` … inside a tag
  'unsafe-url-scheme', // javascript:, vbscript:, data:, file: as a link or attribute target
  'obfuscated-link-destination', // an HTML entity inside a Markdown link destination
  'malformed-code-context', // an inert context that never closed, or an invalid backtick info string
] as const;
type ActiveContentForm = (typeof ACTIVE_CONTENT_FORMS)[number];

interface ActiveContentFinding {
  readonly form: ActiveContentForm;
  readonly line: number;
  readonly column: number;
  // Present only for `malformed-code-context`: the profile's closed reason.
  readonly context?: MalformedCodeContext;
}

// A tag name must be followed by whitespace, `/>` or `>`, so CommonMark
// autolinks (`<https://…>`, `<me@…>`) never match: `:` and `@` end them.
const HTML_TAG = /<\/?([A-Za-z][A-Za-z0-9-]*)(?:\s[^<>]*)?\/?>/g;
const HTML_DECLARATION = /<(?:!--|!\[CDATA\[|![A-Za-z]|\?)/g;
const EVENT_HANDLER = /<[A-Za-z][^<>]*\son[a-z]+\s*=/gi;
// `scheme:` where a URL starts: a Markdown link/image destination, a
// reference definition, an attribute value, or an autolink. Whitespace and
// control characters inside the scheme are tolerated the way browsers
// tolerate them.
const UNSAFE_SCHEME = '(?:j\\s*a\\s*v\\s*a\\s*s\\s*c\\s*r\\s*i\\s*p\\s*t|v\\s*b\\s*s\\s*c\\s*r\\s*i\\s*p\\s*t|d\\s*a\\s*t\\s*a|f\\s*i\\s*l\\s*e)\\s*:';
const UNSAFE_URL = new RegExp(`(?:\\]\\(\\s*<?|\\]:\\s*<?|=\\s*["']?\\s*|<)\\s*${UNSAFE_SCHEME}`, 'gi');
const OBFUSCATED_DESTINATION = /\]\(\s*<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);/g;

function positionOf(text: string, index: number): { readonly line: number; readonly column: number } {
  let line = 1;
  let lineStart = 0;
  for (let i = 0; i < index; i += 1) {
    if (text.charCodeAt(i) === 10) {
      line += 1;
      lineStart = i + 1;
    }
  }
  return { line, column: index - lineStart + 1 };
}

// `charge`, when a ledger is in force, is billed one registry pass before
// each traversal: the code-context mask, the HTML/SVG/script/handler scan
// and the unsafe-URL scan. It throws instead of letting a traversal run
// past the source's budget.
export function scanActiveContent(raw: string, charge?: ParsePassCharge): readonly ActiveContentFinding[] {
  charge?.('markdown-code-context-mask');
  const mask = maskMarkdownCodeContexts(raw);
  if (mask.kind === 'malformed') {
    return [{ form: 'malformed-code-context', line: mask.line, column: 1, context: mask.reason }];
  }
  // The mask keeps every newline and length, so positions found in the
  // masked text are positions in the raw text.
  const text = mask.masked;
  const findings: ActiveContentFinding[] = [];
  const found = new Set<string>();
  const add = (form: ActiveContentForm, index: number): void => {
    const key = `${form}@${index}`;
    if (found.has(key)) return;
    found.add(key);
    findings.push({ form, ...positionOf(text, index) });
  };
  charge?.('active-html-svg-script-handler');
  for (const match of text.matchAll(HTML_TAG)) {
    const name = (match[1] ?? '').toLowerCase();
    add(name === 'script' ? 'script-element' : name === 'svg' ? 'svg-element' : 'html-tag', match.index);
  }
  for (const match of text.matchAll(HTML_DECLARATION)) add('html-comment-or-declaration', match.index);
  for (const match of text.matchAll(EVENT_HANDLER)) add('event-handler-attribute', match.index);
  charge?.('unsafe-url-positions');
  for (const match of text.matchAll(UNSAFE_URL)) add('unsafe-url-scheme', match.index);
  for (const match of text.matchAll(OBFUSCATED_DESTINATION)) add('obfuscated-link-destination', match.index);
  return findings.sort((a, b) => a.line - b.line || a.column - b.column || a.form.localeCompare(b.form));
}

// ---------------------------------------------------------------------
// Reader.

const OBJECT_READ_OUTCOMES = [
  'read',
  'not-read',
  'refused',
  'over-limit',
  'git-read-failed',
  'object-id-mismatch',
  'contains-nul',
  'not-utf-8',
  'active-content',
] as const;
type ObjectReadOutcome = (typeof OBJECT_READ_OUTCOMES)[number];

// Body-free. `detail` is always a closed reason or limit name, never bytes
// of the source.
export interface ObjectReadRecord {
  readonly path: string;
  readonly objectId?: string;
  readonly outcome: ObjectReadOutcome;
  readonly bytes: number;
  // `sha256:<hex>` of the exact bytes Git returned (hash-not-body).
  readonly contentDigest?: string;
  readonly detail?: string;
  readonly activeContent?: readonly ActiveContentFinding[];
}

type ExactObjectRead =
  | { readonly kind: 'text'; readonly text: string; readonly record: ObjectReadRecord }
  | { readonly kind: 'unavailable'; readonly record: ObjectReadRecord };

export interface ExactObjectReader {
  readonly read: (path: string, expectedObjectId?: string) => ExactObjectRead;
  // Every attempt, in order, body-free.
  readonly records: readonly ObjectReadRecord[];
  readonly breaches: readonly ResourceLimitBreach[];
  readonly limits: PwbResourceLimits;
  readonly ledger: ResourceLedger;
  readonly attempted: () => number;
  readonly totalBytes: () => number;
}

interface ExactObjectReaderInput {
  readonly runGit: GitRunner;
  readonly tree: GitTreeIndex;
  readonly resourceLimits?: PwbResourceLimits;
  readonly deniedPathRules?: DeniedPathRules;
  // The evaluation-wide ledger (registry `resourceLimitSemantics`): total
  // bytes and parse passes continue from phase A, and a phase-A body the
  // ledger still holds is reused rather than taken from Git again. A reader
  // without one keeps a private ledger over `resourceLimits`.
  readonly ledger?: ResourceLedger;
}

export function contentDigestOf(bytes: Uint8Array): string {
  return `sha256:${sha256(bytes)}`;
}

export function createExactObjectReader(input: ExactObjectReaderInput): ExactObjectReader {
  const ledger = input.ledger ?? createResourceLedger(input.resourceLimits ?? PWB_RESOURCE_LIMITS);
  const limits = ledger.limits;
  const rules = input.deniedPathRules ?? PWB_DENIED_PATH_RULES;
  const records: ObjectReadRecord[] = [];
  let attempted = 0;

  const unavailable = (record: ObjectReadRecord): ExactObjectRead => {
    records.push(record);
    return { kind: 'unavailable', record };
  };

  const read = (path: string, expectedObjectId?: string): ExactObjectRead => {
    attempted += 1;
    const countBreach = evaluateLimit(limits, 'maxSources', attempted, path);
    if (countBreach !== undefined) {
      ledger.recordBreach(countBreach);
      return unavailable({ path, outcome: 'over-limit', bytes: 0, detail: 'maxSources' });
    }
    const admission = admitExactObjectRead(input.tree, path, expectedObjectId, rules);
    if (admission.kind === 'refused') return unavailable({ path, outcome: 'refused', bytes: 0, detail: admission.reason });
    const { objectId, sizeBytes } = admission.entry;
    const objectFormat = objectId.length === 64 ? 'sha256' : 'sha1';

    // A body phase A already took, counted and validated (object id, NUL,
    // UTF-8, active content) is the same (path, object id) body: it is
    // reused, counted no second time and traversed by no repeated pass.
    const held = ledger.recall(path, objectId);
    if (held !== undefined) {
      const record: ObjectReadRecord = { path, objectId, bytes: held.bytes.byteLength, contentDigest: contentDigestOf(held.bytes), outcome: 'read' };
      records.push(record);
      return { kind: 'text', text: held.text, record };
    }

    if (sizeBytes !== undefined) {
      const perSource = evaluateLimit(limits, 'maxBytesPerSource', sizeBytes, path);
      if (perSource !== undefined) {
        ledger.recordBreach(perSource);
        return unavailable({ path, objectId, outcome: 'over-limit', bytes: 0, detail: 'maxBytesPerSource' });
      }
      if (ledger.projectBody(path, objectId, sizeBytes) !== undefined) {
        return unavailable({ path, objectId, outcome: 'over-limit', bytes: 0, detail: 'maxTotalBytes' });
      }
    }

    let bytes: Uint8Array;
    try {
      bytes = input.runGit(['cat-file', 'blob', objectId]);
    } catch (error) {
      const detail = error instanceof Error ? error.message : String(error);
      return unavailable({ path, objectId, outcome: 'git-read-failed', bytes: 0, detail });
    }
    const contentDigest = contentDigestOf(bytes);
    const taken = { path, objectId, bytes: bytes.byteLength, contentDigest };

    // Sizes the listing did not declare are bounded after the read; the
    // bytes are dropped without being decoded.
    if (sizeBytes === undefined) {
      const perSource = evaluateLimit(limits, 'maxBytesPerSource', bytes.byteLength, path);
      if (perSource !== undefined) {
        ledger.recordBreach(perSource);
        return unavailable({ ...taken, outcome: 'over-limit', detail: 'maxBytesPerSource' });
      }
    }
    if (ledger.chargeBody(path, objectId, bytes.byteLength) !== undefined) {
      return unavailable({ ...taken, outcome: 'over-limit', detail: 'maxTotalBytes' });
    }

    if (gitBlobObjectId(bytes, objectFormat) !== objectId) return unavailable({ ...taken, outcome: 'object-id-mismatch' });
    // Every traversal of the decoded source is charged, by registry name,
    // before it runs; the budget's limit plus one is never traversed.
    const charge = ledger.chargeFor(path);
    try {
      charge('utf8-and-nul-validation');
      if (bytes.includes(0)) return unavailable({ ...taken, outcome: 'contains-nul' });
      const text = decodeUtf8(bytes);
      if (text === undefined) return unavailable({ ...taken, outcome: 'not-utf-8' });
      const activeContent = scanActiveContent(text, charge);
      if (activeContent.length > 0) return unavailable({ ...taken, outcome: 'active-content', activeContent });
      const record: ObjectReadRecord = { ...taken, outcome: 'read' };
      records.push(record);
      return { kind: 'text', text, record };
    } catch (error) {
      if (error instanceof ParsePassBudgetExceeded) return unavailable({ ...taken, outcome: 'over-limit', detail: 'maxParsePassesPerSource' });
      throw error;
    }
  };

  return {
    read,
    records,
    breaches: ledger.breaches,
    limits,
    ledger,
    attempted: () => attempted,
    totalBytes: () => ledger.totalBytes(),
  };
}

// ---------------------------------------------------------------------
// Phase B population read — one result per manifest source, in manifest
// order; the body reaches only `consume` and is not retained here.

interface SourceReadResult<T> {
  readonly source: ManifestSource;
  readonly record: ObjectReadRecord;
  readonly value?: T;
}

export function readManifestSources<T>(
  manifest: Pick<ProjectShapeSourceManifest, 'sources'>,
  reader: ExactObjectReader,
  consume: (source: ManifestSource, text: string) => T,
): readonly SourceReadResult<T>[] {
  return manifest.sources.map((source) => {
    if (source.anchor.kind !== 'blob') {
      const record: ObjectReadRecord = {
        path: source.path,
        outcome: 'refused',
        bytes: 0,
        detail: source.anchor.kind === 'missing-at-revision' ? 'missing-at-revision' : 'not-a-regular-blob',
      };
      return { source, record };
    }
    const read = reader.read(source.path, source.anchor.objectId);
    if (read.kind === 'unavailable') return { source, record: read.record };
    return { source, record: read.record, value: consume(source, read.text) };
  });
}
