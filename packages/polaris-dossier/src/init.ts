import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveCloneHead } from './clone-head.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { RECORDS_WITHIN_REACH, providerStatementGate, type GateSources, type GateState } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { dossierRepositoryUrl } from './github-url.js';
import { governedSubject, type GovernedDecision } from './governed.js';
import type { Outcome } from './outcome.js';
import { parseRunConfig, type RunConfigRefusal } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { createRunDirectory, stateRootViolation, type RunPorts } from './state-directory.js';
import { isoOf } from './iso-of.js';

/** `syzygy dossier init <clone> --url <url> --config <run.json> --state-root <dir>` (REQ-polaris-generation-033, 036).
 *
 * Syzygy's start gates pass before it reads any object for the run: the observation consent found by the URL, the source-acquisition
 * registry entry and the classification and screening policy, each in force by its act. Then the clone's HEAD must be a revision the
 * consent names; it becomes the pinned revision. The clone's `.git` must hold that commit alone (clone-shape.ts): only the entries the
 * consented form leaves there, a config `git init` could have written, no ref but a detached HEAD, shallow at that commit, and no object beyond its tree. Only then does Syzygy list the pinned tree, through the re-hashing object reader, to
 * decide whether the subject is governed; a governed subject, or one whose project input is silent, needs the per-project statement.
 * Any failure refuses the run with its reason in human and machine form, and nothing is written. On success the run directory is made
 * under the state root, never inside or around the clone, and holds only `run.json`, which records the clone's real path as the one
 * location every later step reads objects from. */

export type InitStage = 'url' | 'config' | 'state-root' | 'repository' | 'start-gates' | 'head' | 'revision' | 'clone-shape' | 'listing' | 'statement' | 'write';

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
  readonly url: string;
  readonly configText: string;
  readonly stateRoot: string;
}

export interface InitPorts extends RunPorts {
  readonly sources: GateSources;
  readonly now: () => number;
  /** The object reader; the default is the re-hashing in-process reader. Injected only to observe that no read precedes the gates. */
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'HEAD was read from the clone\'s own .git files, which the agent sessions can write; it is compared with the revisions the consent names, and every object at the pinned revision is read by identifier and re-hashed',
  'the clone\'s .git was checked at init to hold the consented commit alone, and is not checked again; the working tree outside .git is not inspected, though the agent reads the checked-out files, so anything placed there, a nested repository included, is not seen by that check; nor is the content of the hook samples, info/exclude, description and index, or FETCH_HEAD\'s text other than identifiers; the clone\'s own config was checked, but global, system and environment git configuration (~/.gitconfig, /etc/gitconfig, GIT_CONFIG_*) is on the operator\'s host and was not',
  'the dossier commands serve no route, accept no network request and hold no credential that authenticates to Syzygy; the principal is the operator, operator-declared, with credential identity Unknown',
];

export async function initRun(request: InitRequest, ports: InitPorts): Promise<InitResult> {
  let objectsRead = false;
  const refuse = (stage: InitStage, reason: string, extra: Partial<InitRefusal> = {}): InitResult =>
    ({ ok: false, refusal: { command: 'init', outcome: 'refused', stage, reason, ...extra, objectsRead, disclosures: DISCLOSURES } });

  const url = dossierRepositoryUrl(request.url);
  if (!url.ok) return refuse('url', url.reason);
  const config = parseRunConfig(request.configText);
  if (!config.ok) return refuse('config', 'the run configuration is refused; there is no default', { refusals: config.refusals });
  const violation = stateRootViolation(request.stateRoot, request.clone);
  if (violation !== null) return refuse('state-root', violation);

  const ids = await ports.sources.repositoryIdsFor(url.url);
  if (ids.length !== 1) {
    return refuse('repository', ids.length === 0
      ? `no observation consent in force names ${url.url} as its Upstream${ports.sources.consentAbsenceFor === undefined ? '' : `: ${await ports.sources.consentAbsenceFor(url.url)}`}`
      : `${ids.length} observation consents in force name ${url.url} (${ids.join(', ')}); which one governs is ambiguous`);
  }
  const repositoryId = ids[0]!;

  const [registryEntry, screeningPolicy] = await Promise.all([ports.sources.registryEntry(), ports.sources.screeningPolicy()]);
  if (registryEntry.state !== 'ok' || screeningPolicy.state !== 'ok') {
    const why = [registryEntry.state === 'ok' ? null : `source-acquisition registry entry: ${registryEntry.why}`,
      screeningPolicy.state === 'ok' ? null : `classification and screening policy: ${screeningPolicy.why}`].filter((w): w is string => w !== null);
    return refuse('start-gates', `a start gate is not in force: ${why.join('; ')}`, { startGates: { registryEntry, screeningPolicy } });
  }

  const head = resolveCloneHead(request.clone);
  if (!head.ok) return refuse('head', head.reason);
  let clonePath: string;
  try { clonePath = fs.realpathSync(path.resolve(request.clone)); } catch (cause) {
    return refuse('head', `the clone's real path cannot be resolved (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})`);
  }
  const revisions = (await ports.sources.consentedRevisionsFor(repositoryId)).map(r => ({ label: r.label, commit: r.commitId }));
  const consent = await ports.sources.observationConsentFor(repositoryId, head.commit);
  const pinned = revisions.find(r => r.commit === head.commit);
  if (!consent.satisfied || pinned === undefined) {
    return refuse('revision', `the clone's HEAD ${head.commit} (${head.via}) is not a revision the in-force observation consent for ${repositoryId} names${consent.satisfied ? '' : `: ${consent.why}`}`, { consentedRevisions: revisions });
  }

  const gitDirShape = cloneGitDirShape(head.gitDir, head.commit);
  if (!gitDirShape.ok) return refuse('clone-shape', gitDirShape.reason);

  let paths: readonly string[];
  try {
    objectsRead = true;
    const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: head.gitDir, revision: head.commit });
    const storeShape = cloneStoreShape(head.gitDir, head.commit, await reader.inventory());
    if (!storeShape.ok) return refuse('clone-shape', storeShape.reason);
    paths = (await reader.listTree()).map(entry => entry.path);
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('listing', `the pinned tree could not be listed: ${cause.message}`, { objectRead: cause.toJSON() });
    throw cause;
  }

  const governed = governedSubject(await ports.sources.projectInput.drawerFor(repositoryId), paths);
  let providerStatement: string | null = null;
  if (governed.statementRequired) {
    const statement = providerStatementGate(await ports.sources.providerStatements.statementsFor(repositoryId), config.config.agentTool, config.config.agentProvider, ports.now());
    if (statement.state !== 'ok') {
      return refuse('statement', `the subject is ${governed.kind} and the per-project statement is missing: ${statement.why}`, { governed });
    }
    providerStatement = statement.record;
  }

  const subject: RunSubject = {
    repository: { url: url.url, repositoryId },
    clone: { path: clonePath, declaredBy: 'operator', label: 'Inferred', use: 'read' },
    pinnedRevision: { commit: head.commit, label: pinned.label, consentRecord: consent.record, pinnedAt: isoOf(ports.now()) },
    startGates: { registryEntry: registryEntry.record, screeningPolicy: screeningPolicy.record },
    governed: { kind: governed.kind, because: governed.because },
    providerStatement,
    workItem: { identity: null, reason: NO_WORK_ITEM_REASON },
  };
  const created = createRunDirectory(request.stateRoot, request.clone, encodeRunRecord(config.config, subject), ports.runId === undefined ? {} : { runId: ports.runId });
  if (!created.created) return refuse('write', created.detail);
  return {
    ok: true,
    report: {
      command: 'init',
      outcome: 'initialized',
      run: created.runDir,
      runId: created.runId,
      label: 'Inferred',
      subject,
      governed,
      disclosures: [
        ...DISCLOSURES,
        governed.kind === 'non-governed'
          ? 'the subject is non-governed, so no per-project statement is required; the agent sessions\' sends to their provider are the operator\'s own act'
          : `the subject is ${governed.kind}; the run relies on the per-project statement ${providerStatement}, a consent record and not an egress record; neither the content classes it names nor the screening policies bind what the agent reads or sends`,
      ],
    },
  };
}
