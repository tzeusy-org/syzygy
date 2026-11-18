import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveCloneHead } from './clone-head.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import type { GateSources, GateState } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { deriveIdentity, normaliseIdentityOption, readLocator } from './launch-identity.js';
import { governedSubject, type GovernedDecision } from './governed.js';
import type { Outcome } from './outcome.js';
import { parseRunConfig, type RunConfigRefusal } from './run-config.js';
import { DOSSIER_CONTENT_CLASSES, NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { createRunDirectory, stateRootViolation, type RunPorts } from './state-directory.js';
import { isoOf } from './iso-of.js';
import type { LaunchPorts, LaunchRefusal } from './launch.js';
import type { CopyEnd } from './launch-copy.js';
import { buildDossierScreen } from './screen.js';

/** Declared local-source entry (033/046, D10). No consent, statement, act,
 * launch terminal or governance write is part of this operation. F-3 owns
 * acquisition; this entry reads the supplied pinned clone only. */
export type InitStage = 'failure' | 'launch' | 'url' | 'config' | 'state-root' | 'repository' | 'start-gates' | 'policy' | 'visibility' | 'head' | 'revision' | 'clone-shape' | 'listing' | 'statement' | 'write';

export interface InitRefusal {
  readonly command: 'init';
  readonly outcome: 'refused';
  readonly stage: InitStage;
  readonly reason: string;
  readonly refusals?: readonly RunConfigRefusal[];
  readonly startGates?: { readonly registryEntry: GateState; readonly screeningPolicy: GateState };
  readonly consentedRevisions?: readonly { readonly label: string; readonly commit: string }[];
  readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
  readonly governed?: GovernedDecision;
  /** A launch refusal (REQ-polaris-generation-046, 047): what is missing and the command the operator runs next. */
  readonly launch?: LaunchRefusal;
  /** In a copy-class launch whose copy step started: the copy removed, or kept where its removal failed (REQ-polaris-generation-047). */
  readonly copy?: CopyEnd | null;
  readonly copyStatement?: string;
  /** Whether any repository object was read before the refusal (the path listing, by object identifier). */
  readonly objectsRead: boolean;
  readonly disclosures: readonly string[];
}

export interface InitReport {
  readonly command: 'init';
  readonly outcome: 'initialized';
  readonly run: string;
  readonly runId: string;
  readonly label: 'Inferred';
  readonly subject: RunSubject;
  readonly governed: GovernedDecision;
  readonly disclosures: readonly string[];
}

export type InitResult = Outcome<InitReport, InitRefusal>;

export interface InitRequest {
  readonly clone: string;
  /** Declared locator of the supplied local clone; --upstream is the alternative input. */
  readonly url?: string;
  readonly revision?: string;
  readonly visibility?: 'public' | 'private';
  readonly identity?: string;
  readonly upstream?: string;
  /** The command line the operator ran, which a launch refusal names. */
  readonly command?: string;
  readonly configText: string;
  readonly stateRoot: string;
}

export interface InitPorts extends RunPorts {
  readonly sources: GateSources;
  readonly now: () => number;
  /** The object reader; the default is the re-hashing in-process reader. Injected only to observe that no read precedes the gates. */
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
  /** Legacy acquisition adapter retained for F-3 callers; the declared local entry never invokes it. */
  readonly launch?: Omit<LaunchPorts, 'sources' | 'now' | 'openReader' | 'copyRoot'>;
}

export { COPY_DIRECTORY } from './state-directory.js';

/** init's output where an interrupt arrived after the run directory was written, in the run's class (R-PDJA-33-SLICE-CD-3 finding 5): a
 * copy-class run names its copy; a no-copy run's form is that no copy was made. */
export const interruptAfterCreation = (copyDir: string | null): string => copyDir === null
  ? 'An interrupt arrived after the run was created; the run is kept, and nothing was undone. No copy was made. Remove the run directory to discard it.'
  : `An interrupt arrived after the run was created; the run is kept, with its copy at ${copyDir}, and nothing was undone. Remove the run directory and the copy to discard it.`;

const DISCLOSURES = [
  'the clone\'s .git was checked at init to hold the pinned commit alone, and is not checked again; the working tree outside .git is not inspected, though the agent reads the checked-out files, so anything placed there, a nested repository included, is not seen by that check; nor is the content of the hook samples, info/exclude, description and index, or FETCH_HEAD\'s text other than identifiers; the clone\'s own config was checked, but global, system and environment git configuration (~/.gitconfig, /etc/gitconfig, GIT_CONFIG_*) is on the operator\'s host and was not',
  'Run declarations and history lie in the local state directory within the agent sessions write reach and are Inferred; object integrity is rederived at each dependent step.',
  'The repository locator is a hint, never proof of ownership, public visibility or actual provider transmission. No network request verifies these declarations.',
  'No observation consent, registry act, provider or drawer statement is required or recorded for declared-source admission.',
  'The local clone is read only; its strict object-store form is checked at init, and every object later used is read by identifier and rehashed.',
  'The dossier commands serve no route and issue no credential authenticating to Syzygy; principal identity is declared and credential identity Unknown.',
];

export async function initRun(request: InitRequest, ports: InitPorts): Promise<InitResult> {
  let objectsRead = false;
  const refuse = (stage: InitStage, reason: string, extra: Partial<InitRefusal> = {}): InitResult => ({
    ok: false, refusal: { command: 'init', outcome: 'refused', stage, reason, ...extra, objectsRead, disclosures: DISCLOSURES },
  });
  const config = parseRunConfig(request.configText);
  if (!config.ok) return refuse('config', 'the run configuration is refused; there is no default', { refusals: config.refusals });
  const violation = stateRootViolation(request.stateRoot, request.clone);
  if (violation !== null) return refuse('state-root', violation);
  const locator = request.url ?? request.upstream;
  if (locator === undefined) return refuse('url', 'give --url or --upstream with the declared repository locator; no observation consent is consulted');
  const parsed = readLocator(locator, 'operator');
  if (!parsed.ok) return refuse('url', `the declared locator is refused: ${parsed.rule}; the locator is not printed or stored`);
  const identity = request.identity === undefined ? deriveIdentity(parsed.url) : normaliseIdentityOption(request.identity);
  if (identity === null) return refuse('repository', 'no unambiguous repository identity derives from the locator; give --identity repository:<id>');
  const repositoryId = identity.slice('repository:'.length);
  const visibility = request.visibility ?? 'private';
  if (visibility !== 'public' && visibility !== 'private') return refuse('visibility', 'visibility must be public or private; an absent declaration gets conservative private treatment');
  const snapshot = await ports.sources.declaredPolicy?.();
  if (snapshot === undefined || !snapshot.ok) return refuse('policy', snapshot === undefined ? 'no committed dossier policy source is available' : snapshot.why);
  const head = resolveCloneHead(request.clone);
  if (!head.ok) return refuse('head', head.reason);
  if (request.revision !== undefined && request.revision !== head.commit) return refuse('revision', 'the selected full commit must equal the supplied clone HEAD; acquisition of another revision belongs to the URL/acquisition path');
  let clonePath: string;
  try { clonePath = fs.realpathSync(path.resolve(request.clone)); }
  catch { return refuse('head', 'the clone real path cannot be resolved'); }
  const screened = buildDossierScreen(snapshot.bytes, true, { repository: identity, commit: head.commit }, visibility);
  if (!screened.ok) return refuse('policy', screened.why);
  if (screened.screen.policySha256 !== snapshot.binding.sha256) return refuse('policy', 'the policy bytes do not match their committed binding');
  const form = cloneGitDirShape(head.gitDir, head.commit);
  if (!form.ok) return refuse('clone-shape', form.reason);
  let paths: readonly string[];
  try {
    objectsRead = true;
    const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: head.gitDir, revision: head.commit });
    const store = cloneStoreShape(head.gitDir, head.commit, await reader.inventory());
    if (!store.ok) return refuse('clone-shape', store.reason);
    paths = (await reader.listTree()).map(entry => entry.path);
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('listing', `the pinned tree cannot be verified: ${cause.message}`, { objectRead: cause.toJSON() });
    throw cause;
  }
  const governed = governedSubject({ stated: false, why: 'D10 source admission does not require a drawer declaration' }, paths);
  const subject: RunSubject = {
    repository: { url: parsed.url.url, repositoryId, role: 'observed-source' },
    clone: { path: clonePath, declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: head.commit, label: request.revision === undefined ? head.via : 'explicit-full-commit', pinnedAt: isoOf(ports.now()) },
    screeningPolicy: snapshot.binding,
    contentClasses: DOSSIER_CONTENT_CLASSES,
    visibility: { value: visibility, source: request.visibility === undefined ? 'conservative-default' : 'declaration', declaredBy: config.config.operator, label: 'Inferred' },
    governed: { kind: governed.kind, because: governed.because },
    workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  };
  const created = createRunDirectory(request.stateRoot, clonePath, encodeRunRecord(config.config, subject), ports);
  if (!created.created) return refuse('write', created.detail);
  return { ok: true, report: {
    command: 'init', outcome: 'initialized', run: created.runDir, runId: created.runId,
    label: 'Inferred', subject, governed, disclosures: DISCLOSURES,
  } };
}
