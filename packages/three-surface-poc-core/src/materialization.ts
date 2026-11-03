import { execFileSync } from 'node:child_process';
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

// The one bounded work item this POC slice may materialize (POC-REQ:
// approved intent -> human-triggered work). `externalRef` is the
// idempotency key persisted on the created Bead itself, so a lost local
// record can still be reconciled without creating a duplicate.
export const MATERIALIZATION_EXTERNAL_REF =
  'syzygy-poc:work:whatsapp-single-event-normalization' as const;

export const MATERIALIZATION_TARGET_BEAD_PREFIX = 'bu' as const;

export interface MaterializationGoverningIntent {
  readonly requirementId: 'REQ-switchboard-identity-001';
  readonly proposalPath: string;
  readonly designPath: string;
}

export interface MaterializationPacket {
  readonly title: string;
  readonly description: string;
  readonly labels: readonly string[];
  readonly issueType: string;
  readonly priority: number;
  readonly externalRef: string;
  readonly targetRepoRoot: string;
  readonly targetBeadPrefix: string;
  readonly governingIntent: MaterializationGoverningIntent;
}

/** The one read-only dispatch disclosure beside proposedWork. The packet is
 * shared by the Trajectory preview, the human-triggered POST and the machine
 * model; no consumer rebuilds it from presentation fields. */
export type DispatchDisclosure =
  | {
      readonly dispatchState: 'undispatched';
      readonly packet: MaterializationPacket;
    }
  | {
      readonly dispatchState: 'dispatched';
      readonly packet: MaterializationPacket;
      readonly beadId: string;
      readonly createdAt: string;
    };

const MATERIALIZATION_SUPPORTED_REPOSITORY_ID =
  'repository:butlers-configured-poc' as const;

interface BuildDispatchDisclosureInput extends BuildMaterializationPacketInput {
  readonly seedRepositoryId: string;
  readonly materializedBeadId: string | null;
  readonly materializedCreatedAt: string | null;
}

/** Build the packet once in the core model from the same observed roots and
 * intent paths that the human action uses. Unsupported seed sets never fall
 * back to the Butlers packet. */
export function buildDispatchDisclosure(
  input: BuildDispatchDisclosureInput,
): DispatchDisclosure | null {
  if (input.seedRepositoryId !== MATERIALIZATION_SUPPORTED_REPOSITORY_ID) return null;
  const packet = buildMaterializationPacket(input);
  if (input.materializedBeadId === null || input.materializedCreatedAt === null) {
    return { dispatchState: 'undispatched', packet };
  }
  return {
    dispatchState: 'dispatched',
    packet,
    beadId: input.materializedBeadId,
    createdAt: input.materializedCreatedAt,
  };
}

interface BuildMaterializationPacketInput {
  readonly targetRepoRoot: string;
  readonly proposalPath: string;
  readonly designPath: string;
}

/**
 * The exact, deterministic Bead packet the human-triggered action would
 * create — a pure function of its inputs, so the preview shown before
 * the trigger is byte-identical to what a trigger would submit.
 */
export function buildMaterializationPacket(
  input: BuildMaterializationPacketInput,
): MaterializationPacket {
  return {
    title: 'Single-event WhatsApp sender normalization (Syzygy POC materialization)',
    description:
      'Materialized by the Syzygy Three-Surface POC human-triggered action. ' +
      'Governing intent: REQ-switchboard-identity-001 (owner sign-off 2026-08-24), ' +
      `${input.proposalPath}. This item demonstrates approved-intent-to-human-triggered-work ` +
      'materialization; it names no code change and authorizes no autonomous execution.',
    labels: ['syzygy-poc', 'human-triggered'],
    issueType: 'task',
    priority: 2,
    externalRef: MATERIALIZATION_EXTERNAL_REF,
    targetRepoRoot: input.targetRepoRoot,
    targetBeadPrefix: MATERIALIZATION_TARGET_BEAD_PREFIX,
    governingIntent: {
      requirementId: 'REQ-switchboard-identity-001',
      proposalPath: input.proposalPath,
      designPath: input.designPath,
    },
  };
}

export interface MaterializationRecord {
  readonly beadId: string;
  readonly externalRef: string;
  readonly targetRepoRoot: string;
  readonly createdAt: string;
  readonly doltRevisionAtCreation: string | null;
  readonly attribution: string;
  /** Whether the action created the Bead or adopted one found by
   * external_ref. Absent on records written before this field existed —
   * readers must render that as "created or reused", never guess. */
  readonly origin?: 'created' | 'reused';
}

// --- File-backed record state --------------------------------------------
//
// One JSON file under the daemon's own state directory (same posture as
// the machine credential: 0700 dir, 0600 file). Read failures are never
// treated as "not yet materialized" — a corrupt or unreadable record
// throws, and callers must render that as a named Unknown rather than
// silently risking a duplicate create.

const MATERIALIZATION_RECORD_FILE_NAME = 'materialization-record.json' as const;
const MATERIALIZATION_STATE_DIR_MODE = 0o700;
const MATERIALIZATION_RECORD_FILE_MODE = 0o600;

export function materializationRecordPath(stateDir: string): string {
  return join(stateDir, MATERIALIZATION_RECORD_FILE_NAME);
}

function isMaterializationRecord(value: unknown): value is MaterializationRecord {
  if (typeof value !== 'object' || value === null) {
    return false;
  }
  const record = value as Record<string, unknown>;
  return (
    typeof record.beadId === 'string' &&
    typeof record.externalRef === 'string' &&
    typeof record.targetRepoRoot === 'string' &&
    typeof record.createdAt === 'string' &&
    (record.doltRevisionAtCreation === null || typeof record.doltRevisionAtCreation === 'string') &&
    typeof record.attribution === 'string' &&
    (record.origin === undefined || record.origin === 'created' || record.origin === 'reused')
  );
}

/** Reads the record; returns `null` only when no file exists yet. Throws
 * on an unreadable or malformed file — never silently treats corruption
 * as "unmaterialized". */
export function readMaterializationRecordFile(stateDir: string): MaterializationRecord | null {
  const path = materializationRecordPath(stateDir);
  if (!existsSync(path)) {
    return null;
  }
  const raw = readFileSync(path, 'utf8');
  const parsed: unknown = JSON.parse(raw);
  if (!isMaterializationRecord(parsed)) {
    throw new Error('materialization record file is malformed');
  }
  return parsed;
}

export function writeMaterializationRecordFile(stateDir: string, record: MaterializationRecord): void {
  mkdirSync(stateDir, { recursive: true, mode: MATERIALIZATION_STATE_DIR_MODE });
  writeFileSync(materializationRecordPath(stateDir), JSON.stringify(record, null, 2), {
    encoding: 'utf8',
    mode: MATERIALIZATION_RECORD_FILE_MODE,
  });
}

export function clearMaterializationRecordFile(stateDir: string): void {
  const path = materializationRecordPath(stateDir);
  if (existsSync(path)) {
    rmSync(path);
  }
}

// --- Materialize action -----------------------------------------------

type ReadMaterializationRecord = () => MaterializationRecord | null;
type WriteMaterializationRecord = (record: MaterializationRecord) => void;
type ClearMaterializationRecord = () => void;

export type MaterializeResult =
  | { readonly kind: 'created'; readonly beadId: string; readonly record: MaterializationRecord }
  | { readonly kind: 'reused'; readonly beadId: string; readonly record: MaterializationRecord }
  | { readonly kind: 'unknown'; readonly reason: string; readonly beadId?: string };

interface MaterializeWorkItemInput {
  readonly targetRepoRoot: string;
  readonly packet: MaterializationPacket;
  readonly attribution: string;
  readonly now: () => string;
  readonly readRecord: ReadMaterializationRecord;
  readonly writeRecord: WriteMaterializationRecord;
  readonly runQuery?: (repoRoot: string, sql: string) => string;
  readonly runCreate?: (
    repoRoot: string,
    packet: MaterializationPacket,
    attribution: string,
  ) => string;
}

function sqlQuote(value: string): string {
  return value.replace(/'/g, "''");
}

function defaultRunQuery(repoRoot: string, sql: string): string {
  return execFileSync('bd', ['--readonly', '--json', '-C', repoRoot, 'sql', sql], {
    encoding: 'utf8',
    maxBuffer: 64 * 1024 * 1024,
    stdio: ['ignore', 'pipe', 'pipe'],
  });
}

function defaultRunCreate(
  repoRoot: string,
  packet: MaterializationPacket,
  attribution: string,
): string {
  return execFileSync(
    'bd',
    [
      '-C',
      repoRoot,
      'create',
      packet.title,
      '--description',
      packet.description,
      '--labels',
      packet.labels.join(','),
      '--type',
      packet.issueType,
      '--priority',
      String(packet.priority),
      '--external-ref',
      packet.externalRef,
      '--actor',
      attribution,
      '--json',
    ],
    { encoding: 'utf8', maxBuffer: 64 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

function describeMutationFailure(cause: unknown, activity: string): string {
  if (cause instanceof Error && (cause as NodeJS.ErrnoException).code === 'ENOENT') {
    return `the bd CLI is not available on PATH while ${activity}`;
  }
  return `the Beads mutation failed while ${activity}: ${
    cause instanceof Error ? cause.message : String(cause)
  }`;
}

interface ExternalRefRow {
  readonly id?: unknown;
}

type ExternalRefLookup =
  | { readonly kind: 'found'; readonly beadId: string }
  | { readonly kind: 'not-found' }
  | { readonly kind: 'failed'; readonly reason: string };

function findByExternalRef(
  repoRoot: string,
  externalRef: string,
  runQuery: (repoRoot: string, sql: string) => string,
): ExternalRefLookup {
  let stdout: string;
  try {
    stdout = runQuery(
      repoRoot,
      `SELECT id FROM issues WHERE id LIKE '${sqlQuote(
        MATERIALIZATION_TARGET_BEAD_PREFIX,
      )}-%' AND external_ref = '${sqlQuote(externalRef)}' LIMIT 5`,
    );
  } catch (cause) {
    return { kind: 'failed', reason: describeMutationFailure(cause, 'checking for an existing materialization') };
  }
  let rows: unknown;
  try {
    rows = JSON.parse(stdout);
  } catch {
    return { kind: 'failed', reason: 'the existing-materialization check returned a non-JSON response' };
  }
  if (!Array.isArray(rows)) {
    return { kind: 'failed', reason: 'the existing-materialization check returned an unexpected shape' };
  }
  const first = (rows as readonly ExternalRefRow[])[0];
  if (first === undefined || typeof first.id !== 'string') {
    return { kind: 'not-found' };
  }
  return { kind: 'found', beadId: first.id };
}

function captureDoltRevision(
  repoRoot: string,
  runQuery: (repoRoot: string, sql: string) => string,
): string | null {
  try {
    const stdout = runQuery(repoRoot, "SELECT dolt_hashof('HEAD') AS revision");
    const rows = JSON.parse(stdout) as readonly { revision?: unknown }[];
    const revision = rows[0]?.revision;
    return typeof revision === 'string' ? revision : null;
  } catch {
    return null;
  }
}

/**
 * Materializes the one bounded POC work item as a real Bead in the
 * configured target repository. Idempotent: a present file-backed
 * record short-circuits without any `bd` call; an absent record falls
 * back to an `external_ref` lookup before creating, so a lost local
 * record never produces a duplicate Bead. Every non-success path names
 * an Unknown reason — this function never returns a partial success.
 */
export function materializeWorkItem(input: MaterializeWorkItemInput): MaterializeResult {
  if (input.packet.targetRepoRoot !== input.targetRepoRoot) {
    return {
      kind: 'unknown',
      reason: `target repository mismatch: packet names ${input.packet.targetRepoRoot}, action targets ${input.targetRepoRoot}`,
    };
  }

  let existing: MaterializationRecord | null;
  try {
    existing = input.readRecord();
  } catch (cause) {
    return {
      kind: 'unknown',
      reason: `the local materialization record could not be read: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    };
  }
  if (existing !== null) {
    if (
      existing.targetRepoRoot !== input.targetRepoRoot ||
      existing.externalRef !== input.packet.externalRef
    ) {
      return {
        kind: 'unknown',
        reason: 'the recorded materialization targets a different repository or work item than this action',
      };
    }
    return { kind: 'reused', beadId: existing.beadId, record: existing };
  }

  const runQuery = input.runQuery ?? defaultRunQuery;
  const runCreate = input.runCreate ?? defaultRunCreate;

  const lookup = findByExternalRef(input.targetRepoRoot, input.packet.externalRef, runQuery);
  if (lookup.kind === 'failed') {
    return { kind: 'unknown', reason: lookup.reason };
  }
  if (lookup.kind === 'found') {
    const record: MaterializationRecord = {
      beadId: lookup.beadId,
      externalRef: input.packet.externalRef,
      targetRepoRoot: input.targetRepoRoot,
      createdAt: input.now(),
      doltRevisionAtCreation: captureDoltRevision(input.targetRepoRoot, runQuery),
      attribution: input.attribution,
      origin: 'reused',
    };
    try {
      input.writeRecord(record);
    } catch (cause) {
      return {
        kind: 'unknown',
        reason: `an existing materialized Bead ${record.beadId} was found but its record could not be persisted: ${
          cause instanceof Error ? cause.message : String(cause)
        }`,
        beadId: record.beadId,
      };
    }
    return { kind: 'reused', beadId: record.beadId, record };
  }

  let stdout: string;
  try {
    stdout = runCreate(input.targetRepoRoot, input.packet, input.attribution);
  } catch (cause) {
    return { kind: 'unknown', reason: describeMutationFailure(cause, 'creating the materialized Bead') };
  }
  let created: unknown;
  try {
    created = JSON.parse(stdout);
  } catch {
    return { kind: 'unknown', reason: 'Bead creation returned a non-JSON response' };
  }
  const beadId = (created as { id?: unknown } | null)?.id;
  if (typeof beadId !== 'string' || beadId.trim() === '') {
    return { kind: 'unknown', reason: 'Bead creation did not return a usable identifier' };
  }

  const record: MaterializationRecord = {
    beadId,
    externalRef: input.packet.externalRef,
    targetRepoRoot: input.targetRepoRoot,
    createdAt: input.now(),
    doltRevisionAtCreation: captureDoltRevision(input.targetRepoRoot, runQuery),
    attribution: input.attribution,
    origin: 'created',
  };
  try {
    input.writeRecord(record);
  } catch (cause) {
    return {
      kind: 'unknown',
      reason: `Bead ${beadId} was created but its record could not be persisted; a retry will reconcile it via external_ref: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
      beadId,
    };
  }
  return { kind: 'created', beadId, record };
}

// --- Rollback path -------------------------------------------------------
//
// The design's own safety valve: closes (never deletes) only the one
// POC-created Bead, attributed, and clears the local record. Code and
// governance are never touched.

type RollbackResult =
  | { readonly kind: 'rolled-back'; readonly beadId: string }
  | { readonly kind: 'no-materialization' }
  | { readonly kind: 'unknown'; readonly reason: string };

interface RollbackMaterializedWorkItemInput {
  readonly targetRepoRoot: string;
  readonly attribution: string;
  readonly reason: string;
  readonly readRecord: ReadMaterializationRecord;
  readonly clearRecord: ClearMaterializationRecord;
  readonly runClose?: (repoRoot: string, beadId: string, reason: string, attribution: string) => string;
}

function defaultRunClose(
  repoRoot: string,
  beadId: string,
  reason: string,
  attribution: string,
): string {
  return execFileSync(
    'bd',
    ['-C', repoRoot, 'close', beadId, '--reason', reason, '--actor', attribution, '--json'],
    { encoding: 'utf8', maxBuffer: 16 * 1024 * 1024, stdio: ['ignore', 'pipe', 'pipe'] },
  );
}

// Test seam: no route or command calls it yet; materialization.test.ts pins its
// verdicts (closed and cleared, no materialization, close failure keeps the record).
export function rollbackMaterializedWorkItem(input: RollbackMaterializedWorkItemInput): RollbackResult {
  let existing: MaterializationRecord | null;
  try {
    existing = input.readRecord();
  } catch (cause) {
    return {
      kind: 'unknown',
      reason: `the local materialization record could not be read: ${
        cause instanceof Error ? cause.message : String(cause)
      }`,
    };
  }
  if (existing === null) {
    return { kind: 'no-materialization' };
  }
  if (existing.targetRepoRoot !== input.targetRepoRoot) {
    return {
      kind: 'unknown',
      reason: 'the recorded materialization targets a different repository than this rollback',
    };
  }
  const runClose = input.runClose ?? defaultRunClose;
  try {
    runClose(input.targetRepoRoot, existing.beadId, input.reason, input.attribution);
  } catch (cause) {
    return { kind: 'unknown', reason: describeMutationFailure(cause, 'closing the materialized Bead') };
  }
  input.clearRecord();
  return { kind: 'rolled-back', beadId: existing.beadId };
}
