import { createHash } from 'node:crypto';

// Source-snapshot identity (CAP1-REQ-042/060; RFC2-1/2/3). An evaluation's
// snapshot coordinate is the SHA-256 of a canonical manifest of every
// input the evaluation consumed — never a caller-supplied label and never
// a clock reading. The as-of instant is the separate second coordinate
// and is excluded from the manifest.
//
// Implementation conventions, not conformance authority: the encoding is
// frozen in docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md
// §6 (reviewed; dispositions in CAP1-CONSENT-INTERFACE-REVIEW-DISPOSITION.md).
// Pure: hashing is the only operation; no I/O, no clock.

export type Sha256Digest = `sha256:${string}`;

export const SNAPSHOT_SCHEMA = 'cap1-source-snapshot/v1' as const;
export type SnapshotSchema = typeof SNAPSHOT_SCHEMA;

const DIGEST_PATTERN = /^sha256:[0-9a-f]{64}$/;

export function isSha256Digest(value: unknown): value is Sha256Digest {
  return typeof value === 'string' && DIGEST_PATTERN.test(value);
}

export function sha256Digest(bytes: Uint8Array | string): Sha256Digest {
  const hash = createHash('sha256');
  hash.update(typeof bytes === 'string' ? new TextEncoder().encode(bytes) : bytes);
  return `sha256:${hash.digest('hex')}`;
}

// Canonical JSON: UTF-8, no insignificant whitespace, object keys sorted by
// UTF-16 code unit. It REFUSES what it cannot spell — `undefined`, a
// function, a symbol, a bigint, a non-finite number — rather than dropping
// or coercing it, so two different values can never share bytes. Kept apart
// from cap1's `deterministicLayer` and the shared encoders on purpose (cap1
// imports nothing shared).
export function canonicalJson(value: unknown): string {
  return encode(value, '$');
}

function encode(value: unknown, at: string): string {
  if (value === null) return 'null';
  switch (typeof value) {
    case 'string':
    case 'boolean':
      return JSON.stringify(value);
    case 'number':
      if (!Number.isFinite(value)) {
        throw new TypeError(`canonicalJson: non-finite number at ${at}`);
      }
      return JSON.stringify(value);
    case 'object': {
      if (Array.isArray(value)) {
        const parts: string[] = [];
        for (let index = 0; index < value.length; index += 1) {
          parts.push(encode(value[index], `${at}[${index}]`));
        }
        return `[${parts.join(',')}]`;
      }
      const record = value as Record<string, unknown>;
      const keys = Object.keys(record).sort((a, b) => (a < b ? -1 : a > b ? 1 : 0));
      const parts: string[] = [];
      for (const key of keys) {
        parts.push(`${JSON.stringify(key)}:${encode(record[key], `${at}.${key}`)}`);
      }
      return `{${parts.join(',')}}`;
    }
    default:
      throw new TypeError(`canonicalJson: cannot encode ${typeof value} at ${at}`);
  }
}

export function canonicalDigest(value: unknown): Sha256Digest {
  return sha256Digest(canonicalJson(value));
}

// --- The manifest ---------------------------------------------------------

export const SNAPSHOT_INPUT_KINDS = [
  'declaration',
  'consent-artifact',
  'owner-act',
  'consent-correlation',
  'repository-root',
  'entry',
  'readme',
  'link-context',
] as const;
export type SnapshotInputKind = (typeof SNAPSHOT_INPUT_KINDS)[number];

export type SnapshotInputState = 'captured' | 'missing' | 'unreadable' | 'not-read';

export interface SnapshotInputDescriptor {
  readonly kind: SnapshotInputKind;
  readonly subjectId: string;
  readonly ordinal: number | null;
  readonly logicalPath: string | null;
  readonly state: SnapshotInputState;
  readonly digest: Sha256Digest | null;
  readonly failureCode: string | null;
}

export interface CaptureVersions {
  readonly manifestSchema: SnapshotSchema;
  readonly observer: string;
  readonly consentAdapter: string;
  readonly actEncoding: 'cap1-owner-act/v1';
  readonly yamlParser: 'yaml@2.9.0';
  // The README hyperlink reader (syzygy-u2a.7): both exact parser pins.
  readonly markdownParser: string;
  readonly kernel: string;
  readonly evaluationEngine: string;
  // The correlation provider's id, or 'absent' when none is wired.
  readonly correlationProvider: string;
}

export interface SnapshotConfiguration {
  readonly digestAlgorithm: 'sha256';
  readonly pathNormalization: 'relative-posix-v1';
  // The applicable consent currency bound, or 'none' (no bound declared).
  readonly consentCurrencyBound:
    | 'none'
    | { readonly maxAgeSeconds: number; readonly declaredBy: string };
}

export interface SourceSnapshotManifest {
  readonly schema: SnapshotSchema;
  readonly versions: CaptureVersions;
  readonly configuration: SnapshotConfiguration;
  readonly inputs: readonly SnapshotInputDescriptor[];
}

function compareCodeUnits(a: string, b: string): number {
  return a < b ? -1 : a > b ? 1 : 0;
}

// Rows sort by (kind, subjectId); order of discovery never reaches the
// bytes. Repository declaration order survives as the explicit ordinal.
export function sortSnapshotInputs(
  inputs: readonly SnapshotInputDescriptor[],
): readonly SnapshotInputDescriptor[] {
  return [...inputs].sort(
    (a, b) => compareCodeUnits(a.kind, b.kind) || compareCodeUnits(a.subjectId, b.subjectId),
  );
}

// A logical path is root-relative POSIX: never absolute, never NUL, never a
// `..` segment, never a backslash. Host paths never enter the manifest.
export function isLogicalPath(path: string): boolean {
  if (path.length === 0 || path.includes('\0') || path.includes('\\')) return false;
  if (path.startsWith('/')) return false;
  return path.split('/').every((segment) => segment !== '..' && segment !== '' && segment !== '.');
}

export function canonicalSnapshotBytes(manifest: SourceSnapshotManifest): Uint8Array {
  for (const input of manifest.inputs) {
    if (input.logicalPath !== null && !isLogicalPath(input.logicalPath)) {
      throw new TypeError(`canonicalSnapshotBytes: not a logical path: ${input.logicalPath}`);
    }
  }
  return new TextEncoder().encode(
    canonicalJson({ ...manifest, inputs: sortSnapshotInputs(manifest.inputs) }),
  );
}

export function snapshotDigest(manifest: SourceSnapshotManifest): Sha256Digest {
  return sha256Digest(canonicalSnapshotBytes(manifest));
}

// --- Instants -------------------------------------------------------------

// The one instant grammar for act instants, expiries and asOf:
// `YYYY-MM-DDTHH:MM:SSZ` or `YYYY-MM-DDTHH:MM:SS.sssZ`, a real calendar
// instant. Returns epoch milliseconds, or undefined when malformed.
const INSTANT_PATTERN = /^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):(\d{2})(?:\.(\d{3}))?Z$/;

export function instantMillis(value: unknown): number | undefined {
  if (typeof value !== 'string') return undefined;
  const match = INSTANT_PATTERN.exec(value);
  if (match === null) return undefined;
  const [, y, mo, d, h, mi, s, ms] = match;
  const millis = Date.UTC(
    Number(y),
    Number(mo) - 1,
    Number(d),
    Number(h),
    Number(mi),
    Number(s),
    ms === undefined ? 0 : Number(ms),
  );
  const check = new Date(millis);
  if (
    check.getUTCFullYear() !== Number(y) ||
    check.getUTCMonth() !== Number(mo) - 1 ||
    check.getUTCDate() !== Number(d) ||
    check.getUTCHours() !== Number(h) ||
    check.getUTCMinutes() !== Number(mi) ||
    check.getUTCSeconds() !== Number(s)
  ) {
    return undefined;
  }
  return millis;
}
