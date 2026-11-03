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
// Phase A's seed reads (`project-shape-observation.ts`) go through the same
// door: `readBoundedBlob` is the one bounded read — byte budgets, the one
// `cat-file blob`, object-id, NUL and UTF-8 validation, the phase's
// screening passes — and phase A and phase B differ only by the policy
// value they pass and by the admission each applies first (syzygy-bpyt.6.5).
//
// The registry's resource limits are evaluation inputs: `evaluateLimit`
// is the one comparison every consumer uses (the reader for source count
// and bytes; the observer for index depth; later extraction/rendering for
// parse time and rendered bytes), so a breach is always the same shape.

import { createHash } from 'node:crypto';
import { decodeUtf8, sha256 } from '@syzygy/support';

import { type GitTreeEntry, type GitTreeIndex, normalizeRepositoryPath, posixBasename } from './git-tree.js';
import { type MalformedCodeContext, maskMarkdownCodeContexts } from './markdown-code-context.js';
import type { ManifestSource, ProjectShapeSourceManifest } from './project-shape-manifest.js';
import type { GitRunner, PwbResourceLimits, ResourceLimitBreach } from './pwb-types.js';
import { createResourceLedger, type ParsePassCharge, type ParsePassIdentity, type ResourceLedger } from './resource-ledger.js';
import type { TransientBodies } from './transient-bodies.js';

// ---------------------------------------------------------------------
// Policy-bound path rules (copies of the act-bound secret policy's
// `sourceAdmission`; proven byte-equal in the test).

export const PWB_POLICY_IDENTITY = {
  policyId: 'polaris-butlers-project-shape-secrets',
  policyVersion: '1.6.0-public-source-candidate.1.none.code-all.redact-span.v5-bcd',
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

// The one refusal set both phases draw on. Each phase's vocabulary is the
// subset its admission can return, derived below in this order; the
// admissions themselves keep their own check order.
export const BLOB_READ_REFUSAL_REASONS = [
  'path-escapes-repository', // absolute, NUL-bearing, empty, or `..` above the root
  'path-not-normalized', // contains `.`/`..`/empty segments or a trailing slash
  'denied-basename',
  'denied-prefix',
  'denied-suffix',
  'not-in-tree',
  'not-a-regular-blob', // symlink, submodule or tree entry
  'object-id-differs-from-tree',
  'not-a-phase-a-seed-path', // neither the root index nor a declared pillar index
] as const;
export type BlobReadRefusalReason = (typeof BLOB_READ_REFUSAL_REASONS)[number];

// Phase B (`admitExactObjectRead`): every reason but the phase-A allowlist.
type ReadRefusalReason = Exclude<BlobReadRefusalReason, 'not-a-phase-a-seed-path'>;
export const READ_REFUSAL_REASONS: readonly ReadRefusalReason[] = BLOB_READ_REFUSAL_REASONS.filter(
  (reason): reason is ReadRefusalReason => reason !== 'not-a-phase-a-seed-path',
);

// Phase A (`admitPhaseARead`): the seed allowlist and the three tree checks;
// a seed path is fixed by the manifest, so the path-shape and denied-path
// rules never apply to it.
const PHASE_A_ONLY: readonly BlobReadRefusalReason[] = ['not-a-phase-a-seed-path', 'not-in-tree', 'object-id-differs-from-tree', 'not-a-regular-blob'];
export type PhaseARefusalReason = Extract<BlobReadRefusalReason, 'not-a-phase-a-seed-path' | 'not-in-tree' | 'object-id-differs-from-tree' | 'not-a-regular-blob'>;
export const PHASE_A_REFUSAL_REASONS: readonly PhaseARefusalReason[] = BLOB_READ_REFUSAL_REASONS.filter(
  (reason): reason is PhaseARefusalReason => PHASE_A_ONLY.includes(reason),
);

type ReadAdmission =
  | { readonly kind: 'admitted'; readonly entry: GitTreeEntry }
  | { readonly kind: 'refused'; readonly reason: ReadRefusalReason };

export const REGULAR_BLOB_MODES: readonly string[] = ['100644', '100755'];
export const OBJECT_ID = /^[0-9a-f]{40}$|^[0-9a-f]{64}$/;

// Git's own blob identity: `blob <length>\0<bytes>` hashed with the object
// format the id length reveals. Checking it proves the bytes the runner
// returned are the exact object the tree named.
export function gitBlobObjectId(bytes: Uint8Array, format: 'sha1' | 'sha256' = 'sha1'): string {
  return createHash(format)
    .update(`blob ${bytes.byteLength}\0`)
    .update(bytes)
    .digest('hex');
}

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
// Each whitespace run before the scheme is matched by exactly one `\s*`.
// The earlier form, `(?:\]\(\s*<?|\]:\s*<?|=\s*["']?\s*|<)\s*`,
// put two or three `\s*` side by side, so a long run after `=` backtracked
// through every split of it: one 2 KB line took about 5 s.
// The two forms accept the same strings, and from any start a match must
// end at the one `:` the scheme's letters lead to, so `matchAll` yields the
// same index and text for every input (syzygy-bpyt.52; the old form is the
// oracle in `unsafe-url-equivalence.test.ts`).
const UNSAFE_URL = new RegExp(`(?:\\]\\(\\s*(?:<\\s*)?|\\]:\\s*(?:<\\s*)?|=\\s*(?:["']\\s*)?|<\\s*)${UNSAFE_SCHEME}`, 'gi');
// An HTML entity inside a Markdown link destination: `](`, optional
// whitespace, then the destination's run of characters that are neither
// `)` nor whitespace, ending at the run's last entity. The first branch is
// the earlier pattern, `\]\(\s*<?[^)\s]*&(?:…);`, unchanged; alone it
// rescanned the whole run from every `](` inside it, so a run of 100,000
// `](` took 28 s of CPU. When the first branch fails at a `](`, no entity
// ends the run after it, so every later `](` whose destination is the same
// run fails too: the second branch (group 1) consumes that run, stopping
// before a closing `](` that whitespace follows (its destination is the
// next run), and its matches are dropped. Each run is then scanned a
// bounded number of times, and the reported matches keep the index and text
// of the earlier pattern for every input (syzygy-rmax; the old pattern is
// the oracle in `obfuscated-destination-equivalence.test.ts`).
const OBFUSCATED_DESTINATION = /\]\(\s*(?:<?[^)\s]*&(?:#\d+|#[xX][0-9a-fA-F]+|[A-Za-z][A-Za-z0-9]*);|((?:[^)\s\]]|\](?!\(\s))*))/g;

// Every obfuscated-destination match the scan reports, in `matchAll` order:
// its index in `text` and the matched text. Exported for the equivalence
// test.
export function obfuscatedDestinationMatches(text: string): readonly { readonly index: number; readonly value: string }[] {
  const matches: { readonly index: number; readonly value: string }[] = [];
  for (const match of text.matchAll(OBFUSCATED_DESTINATION)) {
    if (match[1] === undefined) matches.push({ index: match.index, value: match[0] });
  }
  return matches;
}

// Every unsafe-URL match the scan reports, in `matchAll` order: its index
// in `text` and the matched text. Exported for the equivalence test.
export function unsafeUrlMatches(text: string): readonly { readonly index: number; readonly value: string }[] {
  return [...text.matchAll(UNSAFE_URL)].map((match) => ({ index: match.index, value: match[0] }));
}

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

export type ActiveContentScan =
  | { readonly kind: 'scanned'; readonly findings: readonly ActiveContentFinding[] }
  | { readonly kind: 'over-limit'; readonly breach: ResourceLimitBreach };

// The scan with no ledger in force (the verbatim route and public-source
// screening): no pass is charged, so it always completes.
export function scanActiveContent(raw: string): readonly ActiveContentFinding[] {
  const scan = scanActiveContentCharged(raw, () => undefined);
  if (scan.kind === 'over-limit') throw new Error('an uncharged scan cannot exceed a budget');
  return scan.findings;
}

// `charge` is billed one registry pass before each traversal: the
// code-context mask, the HTML/SVG/script/handler scan and the unsafe-URL
// scan. A spent budget stops the scan before the traversal it would have
// paid for and is returned as the breach.
export function scanActiveContentCharged(raw: string, charge: ParsePassCharge): ActiveContentScan {
  const spent = (pass: ParsePassIdentity): ActiveContentScan | undefined => {
    const breach = charge(pass);
    return breach === undefined ? undefined : { kind: 'over-limit', breach };
  };
  const maskSpent = spent('markdown-code-context-mask');
  if (maskSpent !== undefined) return maskSpent;
  const mask = maskMarkdownCodeContexts(raw);
  if (mask.kind === 'malformed') {
    return { kind: 'scanned', findings: [{ form: 'malformed-code-context', line: mask.line, column: 1, context: mask.reason }] };
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
  const tagSpent = spent('active-html-svg-script-handler');
  if (tagSpent !== undefined) return tagSpent;
  for (const match of text.matchAll(HTML_TAG)) {
    const name = (match[1] ?? '').toLowerCase();
    add(name === 'script' ? 'script-element' : name === 'svg' ? 'svg-element' : 'html-tag', match.index);
  }
  for (const match of text.matchAll(HTML_DECLARATION)) add('html-comment-or-declaration', match.index);
  for (const match of text.matchAll(EVENT_HANDLER)) add('event-handler-attribute', match.index);
  const urlSpent = spent('unsafe-url-positions');
  if (urlSpent !== undefined) return urlSpent;
  for (const match of unsafeUrlMatches(text)) add('unsafe-url-scheme', match.index);
  for (const match of obfuscatedDestinationMatches(text)) add('obfuscated-link-destination', match.index);
  return { kind: 'scanned', findings: findings.sort((a, b) => a.line - b.line || a.column - b.column || a.form.localeCompare(b.form)) };
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

type ExactObjectReaderInput = {
  readonly runGit: GitRunner;
  readonly tree: GitTreeIndex;
  readonly deniedPathRules?: DeniedPathRules;
  // The phase-A bodies still held: one is reused rather than taken from Git
  // again. Absent → every body is read.
  readonly bodies?: TransientBodies;
} & (
  // The evaluation-wide ledger (registry `resourceLimitSemantics`): total
  // bytes and parse passes continue from phase A.
  | { readonly ledger: ResourceLedger }
  // Or a private ledger over this envelope (no default here: the registry
  // values live with the observer, which this module does not import).
  | { readonly resourceLimits: PwbResourceLimits }
);

export function contentDigestOf(bytes: Uint8Array): string {
  return `sha256:${sha256(bytes)}`;
}

export function createExactObjectReader(input: ExactObjectReaderInput): ExactObjectReader {
  const ledger = 'ledger' in input ? input.ledger : createResourceLedger(input.resourceLimits);
  const limits = ledger.limits;
  const rules = input.deniedPathRules ?? PWB_DENIED_PATH_RULES;
  const records: ObjectReadRecord[] = [];
  let attempted = 0;

  const settle = (record: ObjectReadRecord): ExactObjectRead => {
    records.push(record);
    return { kind: 'unavailable', record };
  };

  const read = (path: string, expectedObjectId?: string): ExactObjectRead => {
    attempted += 1;
    const countBreach = evaluateLimit(limits, 'maxSources', attempted, path);
    if (countBreach !== undefined) {
      ledger.recordBreach(countBreach);
      return settle({ path, outcome: 'over-limit', bytes: 0, detail: 'maxSources' });
    }
    const admission = admitExactObjectRead(input.tree, path, expectedObjectId, rules);
    if (admission.kind === 'refused') return settle({ path, outcome: 'refused', bytes: 0, detail: admission.reason });
    const { objectId } = admission.entry;

    // A body phase A already took, counted and validated (object id, NUL,
    // UTF-8, active content) is the same (path, object id) body: it is
    // reused, counted no second time and traversed by no repeated pass.
    const held = input.bodies?.recall(path, objectId);
    if (held !== undefined) {
      const record: ObjectReadRecord = { path, objectId, bytes: held.bytes.byteLength, contentDigest: contentDigestOf(held.bytes), outcome: 'read' };
      records.push(record);
      return { kind: 'text', text: held.text, record };
    }

    const objectFormat = objectId.length === 64 ? 'sha256' : 'sha1';
    const result = readBoundedBlob({ runGit: input.runGit, ledger, limits, path, objectFormat }, admission.entry, PHASE_B_READ_POLICY);
    // A record that took bytes names them by count and digest.
    const takenRecord = (taken: BlobTaken, outcome: ObjectReadOutcome) => ({ path, objectId, bytes: taken.bytes, contentDigest: taken.contentDigest, outcome });
    switch (result.kind) {
      case 'bytes': {
        const record: ObjectReadRecord = takenRecord(result.taken, 'read');
        records.push(record);
        return { kind: 'text', text: result.text, record };
      }
      case 'over-limit':
        return settle(
          result.taken === undefined
            ? { path, objectId, outcome: 'over-limit', bytes: 0, detail: result.limit }
            : { ...takenRecord(result.taken, 'over-limit'), detail: result.limit },
        );
      case 'git-read-failed':
        return settle({ path, objectId, outcome: 'git-read-failed', bytes: 0, detail: result.detail });
      case 'object-id-mismatch':
      case 'contains-nul':
      case 'not-utf-8':
        return settle(takenRecord(result.taken, result.kind));
      case 'excluded':
        // Phase B's screen excludes only for active content.
        return settle({ ...takenRecord(result.taken, 'active-content'), ...(result.activeContent === undefined ? {} : { activeContent: result.activeContent }) });
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
// The one bounded blob read.
//
// Both phases read an admitted tree entry the same way, in this order:
// the declared size against maxBytesPerSource and the cumulative
// maxTotalBytes (before any byte moves); exactly one `cat-file blob
// <object-id>`; an undeclared size against maxBytesPerSource; the body
// charged once to maxTotalBytes; the bytes hashed to the tree-named
// object id; one charged `utf8-and-nul-validation` pass, NUL and strict
// UTF-8; the phase's screening passes; the phase's trailing passes. The
// first failure ends the read and is returned as a value — no breach is
// thrown — and the caller turns it into its own body-free record.

export type BlobScreen =
  | { readonly kind: 'safe' }
  | { readonly kind: 'excluded'; readonly reason: 'secret-matched' | 'active-content'; readonly detail: string; readonly activeContent?: readonly ActiveContentFinding[] }
  | { readonly kind: 'over-limit'; readonly breach: ResourceLimitBreach };

// What distinguishes the phases once an entry is admitted. Scan order is
// part of the policy because PWB-REQ-006 breach accounting depends on it:
// phase A screens the seed with the secret detectors and then the
// active-content scan before its link discovery; phase B scans active
// content here and leaves the secret detectors to `classifySource`.
export interface BlobReadPolicy {
  readonly phase: 'A' | 'B';
  // The refusals this phase's admission may return.
  readonly refusals: readonly BlobReadRefusalReason[];
  readonly screen: (text: string, charge: ParsePassCharge) => BlobScreen;
  // Passes charged after a safe screen, before the body is handed on.
  readonly trailingPasses: readonly ParsePassIdentity[];
}

export const PHASE_B_READ_POLICY: BlobReadPolicy = {
  phase: 'B',
  refusals: READ_REFUSAL_REASONS,
  screen: (text, charge) => {
    const scan = scanActiveContentCharged(text, charge);
    if (scan.kind === 'over-limit') return scan;
    if (scan.findings.length === 0) return { kind: 'safe' };
    return { kind: 'excluded', reason: 'active-content', detail: String(scan.findings.length), activeContent: scan.findings };
  },
  trailingPasses: [],
};

// Phase A's screen is the injected seed classifier (production:
// `classifyPhaseASeed`, secrets then active content), and its trailing pass
// is the link discovery the validated seed feeds.
export function phaseAReadPolicy(screen: BlobReadPolicy['screen']): BlobReadPolicy {
  return { phase: 'A', refusals: PHASE_A_REFUSAL_REASONS, screen, trailingPasses: ['phase-a-link-discovery'] };
}

export interface BlobReadContext {
  readonly runGit: GitRunner;
  readonly ledger: ResourceLedger;
  // The per-source byte limit this read is held to. The observer passes its
  // own envelope, which need not be the ledger's (see the observer).
  readonly limits: PwbResourceLimits;
  readonly path: string;
  readonly objectFormat: 'sha1' | 'sha256';
}

// The bytes Git returned, by count and digest (hash-not-body).
export interface BlobTaken {
  readonly bytes: number;
  readonly contentDigest: string;
}

export type BlobReadFailure =
  // `taken` is absent when the limit stopped the read before any byte moved.
  | { readonly kind: 'over-limit'; readonly limit: keyof PwbResourceLimits; readonly taken?: BlobTaken }
  | { readonly kind: 'git-read-failed'; readonly detail: string }
  | { readonly kind: 'object-id-mismatch'; readonly taken: BlobTaken }
  | { readonly kind: 'contains-nul'; readonly taken: BlobTaken }
  | { readonly kind: 'not-utf-8'; readonly taken: BlobTaken }
  | {
      readonly kind: 'excluded';
      readonly reason: 'secret-matched' | 'active-content';
      readonly detail: string;
      readonly activeContent?: readonly ActiveContentFinding[];
      readonly taken: BlobTaken;
    };

export type BoundedBlobRead =
  | { readonly kind: 'bytes'; readonly bytes: Uint8Array; readonly text: string; readonly taken: BlobTaken }
  | BlobReadFailure;

export function readBoundedBlob(ctx: BlobReadContext, entry: Pick<GitTreeEntry, 'objectId' | 'sizeBytes'>, policy: BlobReadPolicy): BoundedBlobRead {
  const { ledger, limits, path } = ctx;
  const { objectId, sizeBytes } = entry;
  if (sizeBytes !== undefined) {
    const perSource = evaluateLimit(limits, 'maxBytesPerSource', sizeBytes, path);
    if (perSource !== undefined) {
      ledger.recordBreach(perSource);
      return { kind: 'over-limit', limit: 'maxBytesPerSource' };
    }
    if (ledger.projectBody(path, objectId, sizeBytes) !== undefined) return { kind: 'over-limit', limit: 'maxTotalBytes' };
  }

  let bytes: Uint8Array;
  try {
    bytes = ctx.runGit(['cat-file', 'blob', objectId]);
  } catch (error) {
    return { kind: 'git-read-failed', detail: error instanceof Error ? error.message : String(error) };
  }
  const taken: BlobTaken = { bytes: bytes.byteLength, contentDigest: contentDigestOf(bytes) };

  // Sizes the listing did not declare are bounded after the read; the
  // bytes are dropped without being decoded.
  if (sizeBytes === undefined) {
    const perSource = evaluateLimit(limits, 'maxBytesPerSource', bytes.byteLength, path);
    if (perSource !== undefined) {
      ledger.recordBreach(perSource);
      return { kind: 'over-limit', limit: 'maxBytesPerSource', taken };
    }
  }
  // One cumulative counter across both phases, this body counted once.
  if (ledger.chargeBody(path, objectId, bytes.byteLength) !== undefined) return { kind: 'over-limit', limit: 'maxTotalBytes', taken };
  if (gitBlobObjectId(bytes, ctx.objectFormat) !== objectId) return { kind: 'object-id-mismatch', taken };

  // Every traversal of the decoded source is charged, by registry name,
  // before it runs; the budget's limit plus one is never traversed.
  const charge = ledger.chargeFor(path);
  if (charge('utf8-and-nul-validation') !== undefined) return { kind: 'over-limit', limit: 'maxParsePassesPerSource', taken };
  if (bytes.includes(0)) return { kind: 'contains-nul', taken };
  const text = decodeUtf8(bytes);
  if (text === undefined) return { kind: 'not-utf-8', taken };
  const screened = policy.screen(text, charge);
  if (screened.kind === 'over-limit') return { kind: 'over-limit', limit: screened.breach.limit, taken };
  if (screened.kind === 'excluded') {
    return { kind: 'excluded', reason: screened.reason, detail: screened.detail, ...(screened.activeContent === undefined ? {} : { activeContent: screened.activeContent }), taken };
  }
  for (const pass of policy.trailingPasses) {
    if (charge(pass) !== undefined) return { kind: 'over-limit', limit: 'maxParsePassesPerSource', taken };
  }
  return { kind: 'bytes', bytes, text, taken };
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
