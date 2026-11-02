import { readFileSync } from 'node:fs';
import { join, resolve, sep } from 'node:path';

import {
  parseDeclarationSource,
  type ConsentRecord,
  type GrantState,
  type ProjectId,
  type RepositoryId,
} from '@syzygy/cap1-core';

// RT2 — exact consent-reference loading (CAP1-REQ-010…016; RFC3-6/7).
//
// Consent records are governance acts stored under the governance
// decisions home, referenced — never embedded — from the declaration
// (RFC3-7). This module resolves each reference to EXACTLY ONE on-disk
// location and loads that record into the core's `ConsentRecord` shape.
// It closes the gap syzygy-ydr's finding (1) named: the declaration
// entry's consent *reference* is now consulted for real, and RFC3-6's
// "consent reference does not resolve" condition is reachable as a
// named failure from this layer.
//
// Polarity (the load-bearing invariant, CAP1-REQ-011): every arm of
// this module either yields a loaded record or a NAMED failure. No
// failure arm carries a record, so no failure can reach
// `resolveConsent` as a grant — an unresolvable reference is absence
// of consent, never implied consent. Conflicting records (grant plus
// withdrawal for one pair) both load fully and are handed to the core
// unchanged, where withdrawal defeats grant; nothing here re-derives
// or filters that decision.
//
// Discipline: zero writes, zero clock reads, deterministic — a pure
// function of (decisionsDir, reference, bytes on disk). Exact
// resolution only: one reference → one candidate path; no fuzzy
// matching, no directory scanning, no fallback locations.

// The pinned on-disk record convention this loader resolves against:
// `<decisionsDir>/<reference>.yaml`, parsed with the core's pinned
// declaration dialect (RFC3-1 — one parser, one option set). Field
// names are snake_case, matching the declaration manifest's own
// convention (`schema_version`); the loaded projection is exactly the
// core `ConsentRecord` field set. Fields beyond the projection (e.g.
// RFC3-7's grant timestamp) are record content this loader does not
// consume — and returned facts carry no clock-derived values.
export const CONSENT_RECORD_EXTENSION = '.yaml';

// The owner-act record beside each artifact: `<reference>.act.yaml`
// (cap1-owner-act/v1; docs/design/CAP1-CONSENT-RECORD-ENCODING-AND-AUTHORITY-INTERFACE.md §2).
export const OWNER_ACT_SUFFIX = '.act';
export const OWNER_ACT_EXTENSION = `${OWNER_ACT_SUFFIX}${CONSENT_RECORD_EXTENSION}`;

// Refuses a reference that is not a bare record name — before any I/O.
export function consentReferenceFormProblem(reference: string): string | undefined {
  return invalidReferenceForm(reference);
}

export const CONSENT_RECORD_FIELDS = [
  'id',
  'project',
  'repository',
  'scope',
  'attribution',
  'grant_state',
] as const;

// The named failure arms. None of them is, or can become, a grant:
// the discriminated union has no record on any failure arm.
export type ConsentLoadFailure =
  | {
      // The reference does not resolve to a record at its exact
      // location (RFC3-6 "consent reference does not resolve") — the
      // file is absent, or the reference is not a bare record name and
      // is refused before any filesystem access.
      readonly kind: 'reference-unresolvable';
      readonly reference: string;
      readonly detail: string;
    }
  | {
      // The record exists at the exact location but its bytes could
      // not be read (permissions, a directory in file position, I/O
      // failure).
      readonly kind: 'record-unreadable';
      readonly reference: string;
      readonly path: string;
      readonly detail: string;
    }
  | {
      // The bytes were read but do not parse in the pinned dialect, or
      // do not carry the record field set with valid values.
      readonly kind: 'record-malformed';
      readonly reference: string;
      readonly path: string;
      readonly detail: string;
    }
  | {
      // A well-formed record was found at the referenced location, but
      // it is not the referenced record: its declared `id` differs
      // from the reference.
      readonly kind: 'record-identity-mismatch';
      readonly reference: string;
      readonly path: string;
      readonly recordId: string;
      readonly detail: string;
    };

export type ConsentReferenceLoad =
  | {
      readonly ok: true;
      readonly reference: string;
      readonly path: string;
      readonly record: ConsentRecord;
    }
  | {
      readonly ok: false;
      readonly reference: string;
      readonly failure: ConsentLoadFailure;
    };

export interface ConsentLoadReport {
  // Every loaded record, in first-occurrence reference order — the
  // caller's stable governance-plane order, so downstream resolution
  // is reproducible per evaluation (see resolveConsent's contract).
  readonly records: readonly ConsentRecord[];
  // Every named failure, same order. A failure NEVER contributes a
  // record: feeding `records` onward renders failed references
  // unconsented by the core's own absence polarity.
  readonly failures: readonly ConsentLoadFailure[];
  // The per-reference loads, one per distinct reference.
  readonly loads: readonly ConsentReferenceLoad[];
}

const GRANT_STATES: readonly GrantState[] = ['in-force', 'withdrawn'];

function isPlainObject(value: unknown): value is Record<string, unknown> {
  return typeof value === 'object' && value !== null && !Array.isArray(value);
}

function isNonEmptyString(value: unknown): value is string {
  return typeof value === 'string' && value.length > 0;
}

function describe(value: unknown): string {
  if (value === null) return 'null';
  if (Array.isArray(value)) return 'a sequence';
  return typeof value === 'object' ? 'a mapping' : typeof value;
}

// A reference is a bare record name — never a path. Anything
// path-shaped (separators, traversal segments, absolute forms, NUL) is
// refused as unresolvable BEFORE any filesystem access: exact
// resolution admits exactly one candidate location inside the
// decisions home, so a reference that tries to name any other location
// resolves nothing. (Same lesson as the authorizeWrite traversal
// warning: never let un-normalized caller strings choose a path.)
function invalidReferenceForm(reference: string): string | undefined {
  if (reference.length === 0) return 'reference is empty';
  if (reference.includes('\0')) return 'reference contains a NUL byte';
  if (reference.includes('/') || reference.includes('\\')) {
    return 'reference contains a path separator; a consent reference is a bare record name';
  }
  if (reference === '.' || reference === '..') {
    return 'reference is a filesystem traversal segment, not a record name';
  }
  if (reference.endsWith(OWNER_ACT_SUFFIX)) {
    // `<ref>.act.yaml` is `<ref>`'s owner-act record; no reference may name
    // another reference's act file as its artifact.
    return 'reference names an owner-act record, not a consent artifact';
  }
  return undefined;
}

export type ConsentReferencePathResolution =
  | { readonly ok: true; readonly path: string }
  | {
      readonly ok: false;
      readonly failure: Extract<ConsentLoadFailure, { kind: 'reference-unresolvable' }>;
    };

// Resolves a reference to its single exact candidate path, or refuses.
// Pure string computation — no filesystem access.
export function resolveConsentReferencePath(
  decisionsDir: string,
  reference: string,
): ConsentReferencePathResolution {
  const invalid = invalidReferenceForm(reference);
  if (invalid !== undefined) {
    return {
      ok: false,
      failure: { kind: 'reference-unresolvable', reference, detail: invalid },
    };
  }
  const root = resolve(decisionsDir);
  const path = join(root, `${reference}${CONSENT_RECORD_EXTENSION}`);
  // Defense in depth: the form check above already forbids everything
  // that could escape, so a resolved path outside the decisions home is
  // unreachable by construction — but the containment is asserted, not
  // assumed.
  if (!resolve(path).startsWith(root + sep)) {
    return {
      ok: false,
      failure: {
        kind: 'reference-unresolvable',
        reference,
        detail: 'reference resolves outside the decisions home',
      },
    };
  }
  return { ok: true, path };
}

interface ParsedRecordShape {
  readonly id: string;
  readonly projectId: ProjectId;
  readonly repositoryId: RepositoryId;
  readonly scope: string;
  readonly attribution: string;
  readonly grantState: GrantState;
}

// Validates the parsed document against the record field set. Reports
// only — never fills in, corrects, or defaults a field; an unknown
// grant state is malformed, never coerced toward either polarity.
function recordShape(
  doc: unknown,
): { ok: true; record: ParsedRecordShape } | { ok: false; detail: string } {
  if (!isPlainObject(doc)) {
    return { ok: false, detail: `consent record must be a mapping; got ${describe(doc)}` };
  }
  const problems: string[] = [];
  for (const field of CONSENT_RECORD_FIELDS) {
    if (!(field in doc)) {
      problems.push(`required field \`${field}\` is missing`);
    } else if (field === 'grant_state') {
      if (!GRANT_STATES.includes(doc[field] as GrantState)) {
        problems.push(
          `\`grant_state\` must be one of ${GRANT_STATES.join(' | ')}; got ${describe(doc[field])}`,
        );
      }
    } else if (!isNonEmptyString(doc[field])) {
      problems.push(`\`${field}\` must be a non-empty string; got ${describe(doc[field])}`);
    }
  }
  if (problems.length > 0) {
    return { ok: false, detail: problems.join('; ') };
  }
  return {
    ok: true,
    record: {
      id: doc['id'] as string,
      projectId: doc['project'] as ProjectId,
      repositoryId: doc['repository'] as RepositoryId,
      scope: doc['scope'] as string,
      attribution: doc['attribution'] as string,
      grantState: doc['grant_state'] as GrantState,
    },
  };
}

// Loads one consent record from its exact referenced location.
export function loadConsentReference(
  decisionsDir: string,
  reference: string,
): ConsentReferenceLoad {
  const resolution = resolveConsentReferencePath(decisionsDir, reference);
  if (!resolution.ok) {
    return { ok: false, reference, failure: resolution.failure };
  }
  const path = resolution.path;

  let text: string;
  try {
    text = readFileSync(path, 'utf8');
  } catch (cause) {
    const code = isPlainObject(cause) ? cause['code'] : undefined;
    if (code === 'ENOENT') {
      // Nothing exists at the one exact location the reference names —
      // the reference does not resolve (RFC3-6).
      return {
        ok: false,
        reference,
        failure: {
          kind: 'reference-unresolvable',
          reference,
          detail: `no consent record at the exact referenced location \`${path}\``,
        },
      };
    }
    return {
      ok: false,
      reference,
      failure: {
        kind: 'record-unreadable',
        reference,
        path,
        detail: cause instanceof Error ? cause.message : String(cause),
      },
    };
  }

  return consentLoadFromText(reference, path, text);
}

// The pure half of loading: bytes already read from the exact location
// become a loaded record or a named failure. Shared by the synchronous
// loader above and the capture pipeline, which reads through its own
// reader so it can count and revalidate every read.
export function consentLoadFromText(
  reference: string,
  path: string,
  text: string,
): ConsentReferenceLoad {
  const parsed = parseDeclarationSource(text);
  if (!parsed.ok) {
    return {
      ok: false,
      reference,
      failure: { kind: 'record-malformed', reference, path, detail: parsed.error },
    };
  }

  const shaped = recordShape(parsed.value);
  if (!shaped.ok) {
    return {
      ok: false,
      reference,
      failure: { kind: 'record-malformed', reference, path, detail: shaped.detail },
    };
  }

  if (shaped.record.id !== reference) {
    // The declaration references records by id (RFC3-7). A record whose
    // declared id differs from the reference is NOT the referenced
    // record, whatever pair it names — refused, never substituted.
    return {
      ok: false,
      reference,
      failure: {
        kind: 'record-identity-mismatch',
        reference,
        path,
        recordId: shaped.record.id,
        detail: `record at \`${path}\` declares id \`${shaped.record.id}\`, not the referenced \`${reference}\``,
      },
    };
  }

  return { ok: true, reference, path, record: shaped.record };
}

// For a record that failed to load: the (project, repository) pair its
// bytes name, when they parse to a mapping whose `project` and `repository`
// are non-empty strings; otherwise null (the pair cannot be read).
export function consentPairFromText(
  text: string,
): { readonly projectId: ProjectId; readonly repositoryId: RepositoryId } | null {
  const parsed = parseDeclarationSource(text);
  if (!parsed.ok || !isPlainObject(parsed.value)) return null;
  const project = parsed.value['project'];
  const repository = parsed.value['repository'];
  if (!isNonEmptyString(project) || !isNonEmptyString(repository)) return null;
  return { projectId: project as ProjectId, repositoryId: repository as RepositoryId };
}

// Loads every referenced record for one evaluation. References are
// deduplicated by first occurrence (one reference names one record; a
// second occurrence adds nothing), preserving caller order so the
// loaded record order is the declaration's own stable order.
//
// The report's `records` array feeds the existing pure core unchanged
// (`resolveConsent` / `computeCoverage`): a failed reference simply
// contributes no record, so the core renders its pair unconsented —
// fail-closed by the core's own polarity — and conflicting records
// (grant plus withdrawal) both arrive intact, so withdrawal defeats
// grant in the core, not here.
export function loadConsentReferences(
  decisionsDir: string,
  references: readonly string[],
): ConsentLoadReport {
  const seen = new Set<string>();
  const loads: ConsentReferenceLoad[] = [];
  for (const reference of references) {
    if (seen.has(reference)) continue;
    seen.add(reference);
    loads.push(loadConsentReference(decisionsDir, reference));
  }
  return {
    loads,
    records: loads.flatMap((load) => (load.ok ? [load.record] : [])),
    failures: loads.flatMap((load) => (load.ok ? [] : [load.failure])),
  };
}
