import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';

/** The run's state directory (REQ-polaris-generation-033, design "The state directory").
 *
 * Syzygy writes only here for a run, never into the clone and never to a location derived from the
 * clone's path: the run directory is `<state root>/<run id>`, where the state root is the operator's
 * choice and the run id is random. On a single-user host the agent sessions can write every file
 * here too, so nothing Observed rests on a stored file (owner direction
 * `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`); every value read back from it is Inferred. */

/** Where `init` has a copy-class run's copy made (REQ-polaris-generation-047): beside the run directories, outside every run's own. */
export const COPY_DIRECTORY = 'copies';

/** The names the run directory holds. `drafts/`, `checks/` and `reviews/` hold numbered or
 * digest-named files whose forms are fixed here so every later step and `status` agree. */
export const RUN_LAYOUT = Object.freeze({
  config: 'run.json',
  brief: 'brief.md',
  briefRecord: 'brief.json',
  executionChoice: 'execution-choice.json',
  credentialBreaches: 'credential-breaches.jsonl',
  steps: 'steps.jsonl',
  draftSchema: 'draft.schema.json',
  drafts: 'drafts',
  checks: 'checks',
  inventory: 'inventory',
  reviews: 'reviews',
  site: 'site',
  record: 'record.json',
  launched: 'launched.json',
  launchDisclosure: 'launch.json',
});
export const REVISION_FILE = /^rev-(0|[1-9][0-9]*)\.json$/;
export const REVIEW_PACKET_DIR = /^(fidelity|design)-packet-([0-9a-f]{64})$/;
export const REVIEW_VERDICT_FILE = /^(fidelity|design)-verdict-(0|[1-9][0-9]*)\.json$/;
export const RUN_ID = /^run-[0-9a-f]{32}$/;

type PathIntent =
  | { readonly resolved: true; readonly realPath: string }
  | { readonly resolved: false; readonly reason: 'symlink-loop' | 'path-unreadable'; readonly detail: string };

/** Resolve symbolic links component by component without requiring the target to exist, so a
 * dangling link is judged by where it would land. Loops and unreadable components are refusals.
 * The one copy: the daemon judges its state directory with it too (RTF-1). */
export function resolvePathIntent(absolutePath: string): PathIntent {
  let candidate = path.resolve(absolutePath);
  const visited = new Set<string>();
  for (;;) {
    const parsed = path.parse(candidate);
    const components = candidate.slice(parsed.root.length).split(path.sep).filter((part) => part !== '');
    let current = parsed.root;
    let rewritten = false;
    for (let index = 0; index < components.length; index++) {
      current = path.join(current, components[index]!);
      let stats: fs.Stats;
      try {
        stats = fs.lstatSync(current);
      } catch (cause) {
        const code = (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
        if (code === 'ENOENT') return { resolved: true, realPath: candidate };
        return { resolved: false, reason: 'path-unreadable', detail: `filesystem inspection failed at ${current} (${code})` };
      }
      if (!stats.isSymbolicLink()) continue;
      if (visited.has(current)) return { resolved: false, reason: 'symlink-loop', detail: `symbolic link cycle revisits ${current}` };
      visited.add(current);
      let target: string;
      try {
        target = fs.readlinkSync(current);
      } catch (cause) {
        return { resolved: false, reason: 'path-unreadable', detail: `symbolic link target could not be read at ${current} (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
      }
      candidate = path.resolve(path.isAbsolute(target) ? target : path.resolve(path.dirname(current), target),
        ...components.slice(index + 1));
      rewritten = true;
      break;
    }
    if (!rewritten) return { resolved: true, realPath: candidate };
  }
}

export const within = (inner: string, outer: string): boolean => inner === outer || inner.startsWith(outer + path.sep);

/** Why a state root may not hold a run for this clone, or null when it may. Judged on real paths:
 * the state root may not lie inside the clone, nor contain it, and neither may resolve unreadably. */
export function stateRootViolation(stateRoot: string, clone: string): string | null {
  if (!path.isAbsolute(stateRoot)) return `state root ${stateRoot} must be an absolute path`;
  const root = resolvePathIntent(stateRoot);
  if (!root.resolved) return `state root is invalid: ${root.detail}`;
  const repo = resolvePathIntent(path.resolve(clone));
  if (!repo.resolved) return `clone path is invalid: ${repo.detail}`;
  if (within(root.realPath, repo.realPath)) {
    return `state root ${stateRoot} resolves to ${root.realPath}, inside the clone (${repo.realPath}); choose a location outside it`;
  }
  if (within(repo.realPath, root.realPath)) {
    return `state root ${stateRoot} resolves to ${root.realPath}, which contains the clone (${repo.realPath}); choose a location that does not`;
  }
  return null;
}

export interface RunPorts {
  /** A random run id; the default draws 16 bytes. Never derived from the clone's path. */
  readonly runId?: () => string;
}

export type CreateRunResult =
  | { readonly created: true; readonly runId: string; readonly runDir: string }
  | { readonly created: false; readonly detail: string };

/** Make a new, empty run directory under the state root and write its configuration document and, where given, the run record's launch
 * disclosure (`launch-disclosure.ts`).
 * The directory is the operator's alone (mode 0700) and the configuration file 0600. An existing run
 * directory is never reused. Nothing is written anywhere else. */
export function createRunDirectory(
  stateRoot: string, clone: string, configJson: string, ports: RunPorts = {}, files: { readonly launchDisclosure?: string } = {},
): CreateRunResult {
  const violation = stateRootViolation(stateRoot, clone);
  if (violation !== null) return { created: false, detail: violation };
  const runId = (ports.runId ?? (() => `run-${randomBytes(16).toString('hex')}`))();
  if (!RUN_ID.test(runId)) return { created: false, detail: `run id ${runId} is not of the form run-<32 hex>` };
  fs.mkdirSync(stateRoot, { recursive: true, mode: 0o700 });
  const runDir = path.join(stateRoot, runId);
  try {
    fs.mkdirSync(runDir, { mode: 0o700 });
  } catch (cause) {
    return { created: false, detail: `run directory ${runDir} could not be created (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
  fs.writeFileSync(path.join(runDir, RUN_LAYOUT.config), configJson, { mode: 0o600, flag: 'wx' });
  if (files.launchDisclosure !== undefined) {
    fs.writeFileSync(path.join(runDir, RUN_LAYOUT.launchDisclosure), files.launchDisclosure, { mode: 0o600, flag: 'wx' });
  }
  return { created: true, runId, runDir };
}
