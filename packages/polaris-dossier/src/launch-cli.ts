import * as fs from 'node:fs';
import * as path from 'node:path';
import * as readline from 'node:readline';
import { POLICY_PATH, readPolicyActChain } from '@syzygy/polaris-generation-consent/live';
import { readSourceVisibility } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import type { LaunchPorts, LaunchTerminal, NonPublicAdmission } from './launch.js';
import { readWriteConsent } from './launch-write-consent.js';
import { loadDossierScreen } from './screen.js';

/** The launch's process-facing ports for `syzygy dossier init`: the terminal the command was started from, the checkout's own records
 * as the governance home, the write consent read by its act, the classification preview from the policy in force, and no A1 mechanism.
 *
 * "Syzygy SHALL ask only through the terminal the command was started from, as an interactive question that the operator answers by
 * typing" (REQ-polaris-generation-046, line 11): standard input must be a TTY, and every line is read from it; nothing is taken from an
 * argument, an environment variable or a file. */

/** The screening-policy successor a repository not declared public needs (REQ-polaris-generation-046, line 25). */
export const NON_PUBLIC_SUCCESSOR = 'a screening-policy successor that admits non-public sources (public-source screening scope version 8, OWNER-SELECTION-SCREENING-SCOPE-V8-2026-11-08, performed as its own owner act)';

/** An interrupt (Ctrl-C) or the end of input at a question is "an answer is not given" (046, line 11): the question resolves to no answer, so
 * the launch refuses and, in a copy-class run, removes the copy and says so (047), instead of the process dying with the copy left behind
 * (R-PDJA-33-SLICE-B-1 finding 2). Once input has ended or been interrupted, every later question has no answer too. `input`, `signals`
 * and `errors` are injected only by tests. */
export function processTerminal(
  input: NodeJS.ReadableStream & { readonly isTTY?: boolean } = process.stdin,
  signals: Pick<NodeJS.EventEmitter, 'on' | 'removeListener'> = process,
  errors: Pick<NodeJS.WritableStream, 'write'> = process.stderr,
): LaunchTerminal {
  const isTTY = input.isTTY === true;
  let name = 'not a terminal';
  if (isTTY && input === process.stdin) { try { name = fs.readlinkSync('/proc/self/fd/0'); } catch { name = 'a terminal (name not readable)'; } }
  let rl: readline.Interface | null = null, lines: AsyncIterator<string> | null = null, ended = false;
  return {
    isTTY, name,
    print: text => { errors.write(`${text}\n`); },
    ask: async prompt => {
      errors.write(prompt);
      if (ended) return null;
      rl ??= readline.createInterface({ input, terminal: false, crlfDelay: Infinity });
      lines ??= rl[Symbol.asyncIterator]();
      const interrupt = () => { ended = true; errors.write('\n'); rl?.close(); };
      signals.on('SIGINT', interrupt);
      try {
        const next = await lines.next();
        if (next.done === true) { ended = true; return null; }
        return ended ? null : next.value;
      } finally {
        signals.removeListener('SIGINT', interrupt);
      }
    },
  };
}

/** Whether the screening policy in force at `now` admits non-public sources: its act chain is in force over the bytes on disk, and those
 * bytes declare the version-8 `sourceVisibility` with `private` admitted. Anything else, an unreadable policy included, admits none. */
export async function policyAdmitsNonPublic(root: string, now: number): Promise<NonPublicAdmission> {
  const none: NonPublicAdmission = { admitted: false, successor: NON_PUBLIC_SUCCESSOR };
  const chain = await readPolicyActChain({ root, now });
  if (chain.state !== 'ok') return none;
  let doc: unknown;
  try {
    const bytes = fs.readFileSync(path.join(root, POLICY_PATH));
    if (sha256(bytes) !== chain.final.digest) return none;
    doc = JSON.parse(new TextDecoder('utf-8', { fatal: true }).decode(bytes));
  } catch { return none; }
  if (!isRecord(doc)) return none;
  const read = readSourceVisibility(doc['publicSourceScope']);
  return read.ok && read.admitsPrivate ? { admitted: true, successor: NON_PUBLIC_SUCCESSOR } : none;
}

export function processLaunchPorts(root: string, now: () => number, nonPublic: () => Promise<NonPublicAdmission> = () => policyAdmitsNonPublic(root, now())): Omit<LaunchPorts, 'sources' | 'now' | 'openReader'> {
  return {
    home: root,
    terminal: processTerminal(),
    writeConsent: () => readWriteConsent({ root, now: now() }),
    nonPublic,
    previewClasses: async (identity, commit, paths) => {
      const load = await loadDossierScreen(root, now(), undefined, { repository: identity, commit });
      if (!load.ok) return { why: load.why };
      const classes = new Set<string>();
      for (const p of paths) { const c = load.screen.contentClass(p); if (c !== undefined) classes.add(c); }
      return { classes: [...classes].sort() };
    },
    a1InForce: () => false,
  };
}
