import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord } from '@syzygy/support';
import { briefIssuedAt } from './check.js';
import { type GateSources } from './gate-sources.js';
import { isoOf } from './iso-of.js';
import { reverifyPinnedRevision, type ReverifiedRevision, type ReverifyOptions, type ReverifyRefusal } from './reverify.js';
import type { RunConfig } from './run-config.js';
import type { RunSubject } from './run-record.js';
import { RUN_ID, RUN_LAYOUT, resolvePathIntent, within } from './state-directory.js';

/** A run step's opening, step log, stored-record reader and the sessions root's paths; split out of `inventory.ts` unchanged. */

/** A session's directory, under the run's sessions root. */
export const SESSION_DIR = /^session-([1-9][0-9]*)$/;
export const sessionDirName = (n: number): string => `session-${n}`;
/** The run's sessions root, `<state root>/<run id>.sessions/`: a sibling of the run directory, never inside it, so that no ancestor
 * of a session's working directory below the state root is the run directory and `..` from it never reaches `drafts/`. */
export const sessionsRoot = (run: string): string => path.join(path.dirname(run), `${path.basename(run)}.sessions`);
export const sessionDirectory = (run: string, n: number): string => path.join(sessionsRoot(run), sessionDirName(n));

/** Why the run's sessions root may not hold a session, or null when it may. Judged on real paths, as the state root is: the sessions
 * root may lie neither inside the run directory or the clone nor around either, and none may resolve unreadably. */
export function sessionsRootViolation(run: string, clone: string): string | null {
  const root = sessionsRoot(run);
  const resolved = [root, run, path.resolve(clone)].map(resolvePathIntent);
  const real: string[] = [];
  for (const intent of resolved) {
    if (!intent.resolved) return `the sessions root ${root} cannot be judged: ${intent.detail}`;
    real.push(intent.realPath);
  }
  const [sessions, realRun, realClone] = real as [string, string, string];
  for (const [what, other] of [['run directory', realRun], ['clone', realClone]] as const) {
    if (within(sessions, other)) return `the sessions root ${root} resolves to ${sessions}, inside the ${what} (${other}); choose a state root where it is a sibling of the run directory`;
    if (within(other, sessions)) return `the sessions root ${root} resolves to ${sessions}, which contains the ${what} (${other}); choose a state root where it does not`;
  }
  return null;
}

const RECORD_JSON_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });
export const errno = (cause: unknown): string => (cause as NodeJS.ErrnoException).code ?? 'unknown-error';

/** A run step's common opening: the run directory, the pinned revision verified again, a brief issued and its deadline not passed.
 * `revision` is the label and consent record the live consent gives the pinned commit now, never the run record's copy. */
export type OpenedRun =
  | { readonly ok: true; readonly run: string; readonly runId: string; readonly subject: RunSubject; readonly declared: RunConfig; readonly deadlineEnds: number; readonly revision: ReverifiedRevision; readonly contentClasses: readonly string[] | null }
  | { readonly ok: false; readonly stage: 'run' | 'reverify' | 'not-briefed' | 'deadline'; readonly reason: string; readonly reasons?: readonly string[]; readonly refusals?: readonly ReverifyRefusal[] };

export async function openRun(runDir: string, sources: GateSources, now: number, what: string, options: ReverifyOptions = {}): Promise<OpenedRun> {
  const run = path.resolve(runDir);
  const runId = path.basename(run);
  if (!RUN_ID.test(runId) || !fs.existsSync(path.join(run, RUN_LAYOUT.config))) return { ok: false, stage: 'run', reason: `${run} is not a run directory` };
  const checked = await reverifyPinnedRevision(run, sources, now, options);
  if (!checked.ok) return { ok: false, stage: 'reverify', reason: `the pinned revision could not be verified again, so ${what}`, reasons: checked.reasons, refusals: checked.refusals };
  const { subject, declared } = checked.record;
  const issued = briefIssuedAt(run, subject.pinnedRevision.commit);
  if (typeof issued === 'string') return { ok: false, stage: 'not-briefed', reason: issued };
  const deadlineEnds = issued + declared.deadline.seconds * 1000;
  if (now >= deadlineEnds) return { ok: false, stage: 'deadline', reason: `the deadline ${declared.deadline.declared} from the brief ended at ${isoOf(deadlineEnds)} on Syzygy's clock; no step runs after it` };
  return { ok: true, run, runId, subject, declared, deadlineEnds, revision: checked.revision, contentClasses: checked.contentClasses };
}

/** Append one entry to the run's step log; a failure to append changes no result. */
export function logStep(run: string, step: string, at: number, entry: Record<string, unknown>): void {
  try {
    fs.appendFileSync(path.join(run, RUN_LAYOUT.steps), `${JSON.stringify({ format: 'polaris-dossier-step/1', step, at: isoOf(at), ...entry })}\n`, { mode: 0o600 });
  } catch { /* the step log is a convenience within the agent's reach */ }
}

/** A stored record, parsed within bounds, or undefined. */
export function readRecord(file: string): Readonly<Record<string, unknown>> | undefined {
  try {
    const value = parseBoundedJson(fs.readFileSync(file, 'utf8'), RECORD_JSON_LIMITS);
    return isRecord(value) ? value : undefined;
  } catch { return undefined; }
}
