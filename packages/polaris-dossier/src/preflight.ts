import { RECORDS_WITHIN_REACH, type GateSources } from './gate-sources.js';
import { deriveIdentity, readLocator } from './launch-identity.js';
import { quote } from './launch-revision.js';
import type { Outcome } from './outcome.js';
import type { PolicyBinding } from './policy-snapshot.js';

/** `syzygy dossier preflight <url>` (D10 F-3): whether a run can start for the repository. It reads no consent, registry, provider-
 * statement or act record: reading a repository needs none (VIS-4 as amended by D10). It checks that the locator is admitted and that the
 * committed screening policy a run binds is readable, and prints the commands that make the one-commit clone of the remote's trunk.
 * The URL is parsed, never fetched; no object is read; nothing is written. */

export interface PreflightReport {
  readonly command: 'preflight';
  readonly outcome: 'ready' | 'not-ready';
  readonly url: string;
  /** The identity a run derives from the locator, or null when none derives unambiguously (init then needs `--identity`). */
  readonly repository: { readonly repositoryId: string | null };
  /** The committed policy a new run binds (SEC-5), or why it cannot be read. */
  readonly screeningPolicy: { readonly state: 'ok'; readonly binding: PolicyBinding } | { readonly state: 'absent'; readonly why: string };
  /** What stops a run; empty when ready. */
  readonly missing: readonly string[];
  readonly cloneCommands: readonly string[];
  readonly disclosures: readonly string[];
}

interface PreflightRefusal {
  readonly command: 'preflight';
  readonly outcome: 'refused';
  readonly reason: string;
}

export type PreflightResult = Outcome<PreflightReport, PreflightRefusal>;

export async function preflight(input: string, sources: GateSources): Promise<PreflightResult> {
  const parsed = readLocator(input, 'operator');
  if (!parsed.ok) return { ok: false, refusal: { command: 'preflight', outcome: 'refused', reason: `the repository URL is not admitted: ${parsed.rule}; it is not printed, stored or recorded` } };
  const url = parsed.url;
  const identity = deriveIdentity(url);
  const snapshot = await sources.declaredPolicy?.();
  const screeningPolicy: PreflightReport['screeningPolicy'] = snapshot === undefined
    ? { state: 'absent', why: 'no committed dossier policy source is available' }
    : snapshot.ok ? { state: 'ok', binding: snapshot.binding } : { state: 'absent', why: snapshot.why };
  const missing = screeningPolicy.state === 'ok' ? [] : [`classification and screening policy: ${screeningPolicy.why}`];
  return {
    ok: true,
    report: {
      command: 'preflight',
      outcome: missing.length === 0 ? 'ready' : 'not-ready',
      url: url.url,
      repository: { repositoryId: identity === null ? null : identity.slice('repository:'.length) },
      screeningPolicy,
      missing,
      // The remote's trunk fetched alone into an empty repository, never a full clone: the agent reads whatever the clone holds.
      // The URL single-quoted: the locator rule admits `;`, `$(`, backticks and `|` in a path (R-PDJA-33-SLICE-C-1 finding 7).
      cloneCommands: [
        'git init <dir>   # a new, empty directory for this run alone',
        `git -C <dir> fetch --depth=1 ${quote(input)} HEAD`,
        'git -C <dir> checkout --detach FETCH_HEAD',
      ],
      disclosures: [
        'the URL was parsed, not fetched; Syzygy made no network request and read no repository object',
        'no observation consent, registry entry, provider statement or act record is read or required (VIS-4 as amended by D10)',
        RECORDS_WITHIN_REACH,
      ],
    },
  };
}
