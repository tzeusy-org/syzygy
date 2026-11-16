import * as path from 'node:path';
import { isRecord } from '@syzygy/support';

/** The flags on the agent's reported commands where execution was permitted (REQ-polaris-generation-033 as of v1.1, N6).
 *
 * A permitting brief asks, for every command, the working directory it ran in and whether it falls within the scope the owner's choice
 * names. The draft is admitted whether or not a command carries them. Syzygy flags, as a finding disclosed beside the command and
 * labelled Inferred, each command whose reported working directory lies outside the clone, that reports none, or that the agent states
 * falls outside that scope. A flag refuses no step and hides no command: under D9, SEC-3 governs what Syzygy does about the session,
 * not what the session does. Every input is the agent's self-report, so a command without a flag is not shown to lie within the clone
 * or the scope either; it is only not flagged.
 *
 * "Outside the clone" is decided lexically: the reported directory, normalised, against the clone's real path the run record names.
 * Syzygy reads no file system for it, so a link inside the clone that leads elsewhere is not seen, and a directory that is not an
 * absolute path cannot be placed within the clone and is flagged as such. Under SEC-3's rule nothing is permitted and nothing is
 * flagged; a brief record that cannot be read counts as permitting, so the flags fail toward being shown. */

export const EXECUTION_SCOPES = Object.freeze(['within-scope', 'outside-scope'] as const);
export type ExecutionScope = (typeof EXECUTION_SCOPES)[number];

export type ExecutionFlagKind = 'no-working-directory' | 'working-directory-outside-clone' | 'stated-outside-scope';

export interface ExecutionFlag {
  readonly kind: ExecutionFlagKind;
  readonly detail: string;
  readonly label: 'Inferred';
}

export interface FlaggedCommand {
  /** The command's place in the draft's `executions`, from 1. */
  readonly position: number;
  readonly id: string | null;
  /** The scope the agent states, or `not-stated`; never Syzygy's judgement. */
  readonly scope: ExecutionScope | 'not-stated';
  readonly flags: readonly ExecutionFlag[];
}

export type ExecutionFlags =
  | { readonly applies: false; readonly why: string }
  | { readonly applies: true; readonly clone: string; readonly flagged: number; readonly commands: readonly FlaggedCommand[]; readonly label: 'Inferred'; readonly basis: string };

export const EXECUTION_FLAGS_BASIS = 'the agent\'s own report of each command\'s working directory and scope. Whether a command falls within the scope of the owner\'s execution choice is the agent\'s own statement, labelled Inferred; Syzygy does not judge it. Syzygy compares the reported directory with the clone\'s path as text, after resolving `..`, by path component and never by shared string prefix, and cannot observe where or what the agent ran. A flag refuses no step and hides no command.';

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** The flags on one reported command. */
export function flagCommand(entry: Readonly<Record<string, unknown>>, clone: string): ExecutionFlag[] {
  const flags: ExecutionFlag[] = [];
  const directory = text(entry['workingDirectory']);
  if (directory === undefined || directory.trim() === '') {
    flags.push({ kind: 'no-working-directory', detail: 'the agent reports no working directory for this command', label: 'Inferred' });
  } else if (!path.isAbsolute(directory)) {
    flags.push({ kind: 'working-directory-outside-clone', detail: 'the reported working directory is not an absolute path, so Syzygy cannot place it within the clone', label: 'Inferred' });
  } else {
    const relative = path.relative(path.resolve(clone), path.resolve(directory));
    if (relative === '..' || relative.startsWith(`..${path.sep}`) || path.isAbsolute(relative)) {
      flags.push({ kind: 'working-directory-outside-clone', detail: 'the reported working directory lies outside the clone the run record names', label: 'Inferred' });
    }
  }
  if (entry['scope'] === 'outside-scope') {
    flags.push({ kind: 'stated-outside-scope', detail: 'the agent states that this command falls outside the scope the owner\'s execution choice names', label: 'Inferred' });
  }
  return flags;
}

/** The flags on every reported command, or why none apply. `arm` is the rule the stored brief record names; null when it cannot be read. */
export function executionFlags(executions: unknown, clone: string, arm: 'sec-3' | 'permitting' | null): ExecutionFlags {
  if (arm === 'sec-3') return { applies: false, why: 'the brief carried SEC-3\'s rule and permitted no execution, so no reported command is flagged' };
  const entries = (Array.isArray(executions) ? executions : []).filter(isRecord);
  const commands = entries.map((entry, index): FlaggedCommand => {
    const scope = entry['scope'] === 'within-scope' || entry['scope'] === 'outside-scope' ? entry['scope'] : 'not-stated';
    return { position: index + 1, id: text(entry['id']) ?? null, scope, flags: flagCommand(entry, clone) };
  });
  return { applies: true, clone, flagged: commands.filter((command) => command.flags.length > 0).length, commands, label: 'Inferred', basis: EXECUTION_FLAGS_BASIS };
}
