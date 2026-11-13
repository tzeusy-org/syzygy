import * as fs from 'node:fs';
import * as path from 'node:path';
import { resolveCloneHead } from './clone-head.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { RECORDS_WITHIN_REACH, otherActsOf, providerStatementGate, type GateSources, type GateState } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { dossierLocator } from './launch-identity.js';
import { governedSubject, type GovernedDecision } from './governed.js';
import type { Outcome } from './outcome.js';
import { parseRunConfig, type RunConfigRefusal } from './run-config.js';
import { NO_WORK_ITEM_REASON, encodeRunRecord, type RunSubject } from './run-record.js';
import { createRunDirectory, stateRootViolation, type RunPorts } from './state-directory.js';
import { isoOf } from './iso-of.js';
import { failureText, launchConsent, type LaunchCopy, type LaunchOutcome, type LaunchPorts, type LaunchRefusal } from './launch.js';
import { copyEndStatement, removeCopy, type CopyEnd } from './launch-copy.js';
import { LAUNCH_DISCLOSURE_FORMAT, launchDisclosureItems, publicDeclarationOf, type LaunchDisclosure } from './launch-disclosure.js';
import { stageStatements } from './launch-statements.js';
import { withLaunchRecords } from './launch-sources.js';

/** `syzygy dossier init <clone> --url <url> --config <run.json> --state-root <dir>` (REQ-polaris-generation-033, 036).
 *
 * Syzygy's start gates pass before it reads any object for the run: the observation consent found by the URL, the source-acquisition
 * registry entry and the classification and screening policy, each in force by its act. Then the clone's HEAD must be a revision the
 * consent names; it becomes the pinned revision. The clone's `.git` must hold that commit alone (clone-shape.ts): only the entries the
 * consented form leaves there, a config `git init` could have written, no ref but a detached HEAD, shallow at that commit, and no object beyond its tree. Only then does Syzygy list the pinned tree, through the re-hashing object reader, to
 * decide whether the subject is governed; a governed subject, or one whose project input is silent, needs the per-project statement.
 * Any failure refuses the run with its reason in human and machine form, and nothing is written. On success the run directory is made
 * under the state root, never inside or around the clone, and holds only `run.json`, which records the clone's real path as the one
 * location every later step reads objects from, and `launch.json`, the run record's launch disclosure (REQ-polaris-generation-046). */

export type InitStage = 'failure' | 'launch' | 'url' | 'config' | 'state-root' | 'repository' | 'start-gates' | 'head' | 'revision' | 'clone-shape' | 'listing' | 'statement' | 'write';

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
  /** The repository URL that finds an observation consent made by another act. Absent, or naming no consent for the clone's HEAD, the
   * run is a launch (REQ-polaris-generation-046) where the launch port is given. */
  readonly url?: string;
  readonly revision?: string;
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
  /** The launch's ports (terminal, governance home, write consent). Absent, `init` takes the observation consent another act made only,
   * as before launch consent existed. */
  readonly launch?: Omit<LaunchPorts, 'sources' | 'now' | 'openReader' | 'copyRoot'>;
}

/** Where `init` has a copy-class run's copy made (REQ-polaris-generation-047): beside the run directories, outside every run's own. */
export const COPY_DIRECTORY = 'copies';

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'HEAD was read from the clone\'s own .git files, which the agent sessions can write; it is compared with the revisions the consent names, and every object at the pinned revision is read by identifier and re-hashed',
  'the clone\'s .git was checked at init to hold the consented commit alone, and is not checked again; the working tree outside .git is not inspected, though the agent reads the checked-out files, so anything placed there, a nested repository included, is not seen by that check; nor is the content of the hook samples, info/exclude, description and index, or FETCH_HEAD\'s text other than identifiers; the clone\'s own config was checked, but global, system and environment git configuration (~/.gitconfig, /etc/gitconfig, GIT_CONFIG_*) is on the operator\'s host and was not',
  'the dossier commands serve no route, accept no network request and hold no credential that authenticates to Syzygy; the principal is the operator, operator-declared, with credential identity Unknown',
];

export async function initRun(request: InitRequest, ports: InitPorts): Promise<InitResult> {
  let objectsRead = false;
  // A copy-class run's copy, once the launch made it: a refusal after the launch ends the run before its brief and removes it.
  let copy: LaunchCopy | null = null;
  const refuse = (stage: InitStage, reason: string, extra: Partial<InitRefusal> = {}): InitResult => {
    if (copy === null) return { ok: false, refusal: { command: 'init', outcome: 'refused', stage, reason, ...extra, objectsRead, disclosures: DISCLOSURES } };
    const end = removeCopy(copy.dir, ports.launch?.removeCopy);
    return { ok: false, refusal: { command: 'init', outcome: 'refused', stage, reason, ...extra, copy: end, copyStatement: copyEndStatement(end), objectsRead, disclosures: DISCLOSURES } };
  };

  // Whether any object was read, decided from the reads themselves (R-PDJA-33-SLICE-B-1 finding 6): the launch's object reads go through
  // this reader, which marks the first call of any of its methods, so a refusal before any (a copy-stage one included) reports false.
  const trackedReader = (options: PinnedObjectReaderOptions): PinnedObjectReader => {
    const reader = (ports.openReader ?? openPinnedObjectReader)(options);
    const marked = <A extends unknown[], R>(f: (...args: A) => R) => (...args: A): R => { objectsRead = true; return f(...args); };
    return {
      revision: reader.revision, algorithm: reader.algorithm,
      tree: marked(reader.tree), readBlobs: marked(reader.readBlobs), listTree: marked(reader.listTree), inventory: marked(reader.inventory),
      commitHead: marked(reader.commitHead), storedType: marked(reader.storedType),
    };
  };

  // A thrown error after the launch made a copy ends the run before its brief: the copy is removed and the refusal says so
  // (R-PDJA-33-SLICE-B-1 finding 2).
  try {
    return await steps();
  } catch (cause) {
    if (copy === null) throw cause;
    return refuse('failure', `init failed after the launch made the copy: ${failureText(cause)}`);
  }

  async function steps(): Promise<InitResult> {
    // The --url, read as an admitted locator and normalised (046, line 17): refused by its rule, never quoted.
    let normalisedUrl: string | undefined;
    if (request.url !== undefined) {
      const given = dossierLocator(request.url);
      if (!given.ok) return refuse('url', given.reason);
      normalisedUrl = given.url;
    }
    const config = parseRunConfig(request.configText);
    if (!config.ok) return refuse('config', 'the run configuration is refused; there is no default', { refusals: config.refusals });
    const violation = stateRootViolation(request.stateRoot, request.clone);
    if (violation !== null) return refuse('state-root', violation);

    let sources = ports.sources;
    let launched: Exclude<LaunchOutcome, { kind: 'refused' } | { kind: 'head-consented' }> | null = null;
    // REQ-polaris-generation-047's first branch: no --revision, and an observation consent another act made names the clone's HEAD.
    let headConsentedElsewhere = false;
    // Decided from the other acts' records alone: a launch consent naming HEAD makes the run copy-class, never this branch.
    if (normalisedUrl !== undefined && request.revision === undefined) {
      const elsewhere = otherActsOf(sources);
      const ids = await elsewhere.repositoryIdsFor(normalisedUrl);
      const head = resolveCloneHead(request.clone);
      headConsentedElsewhere = ids.length === 1 && head.ok && (await elsewhere.observationConsentFor(ids[0]!, head.commit)).satisfied;
    }
    if (!headConsentedElsewhere && ports.launch !== undefined) {
      const startGates = await Promise.all([sources.registryEntry(), sources.screeningPolicy()]);
      if (startGates[0].state !== 'ok' || startGates[1].state !== 'ok') {
        const [registryEntry, screeningPolicy] = startGates;
        const why = [registryEntry.state === 'ok' ? null : `source-acquisition registry entry: ${registryEntry.why}`,
          screeningPolicy.state === 'ok' ? null : `classification and screening policy: ${screeningPolicy.why}`].filter((w): w is string => w !== null);
        return refuse('start-gates', `a start gate is not in force: ${why.join('; ')}`, { startGates: { registryEntry, screeningPolicy } });
      }
      const outcome = await launchConsent({
        clone: request.clone, ...(request.revision === undefined ? {} : { revision: request.revision }),
        ...(request.identity === undefined ? {} : { identity: request.identity }), ...(request.upstream === undefined ? {} : { upstream: request.upstream }),
        agentTool: config.config.agentTool, agentProvider: config.config.agentProvider, operator: config.config.operator,
        headConsentedElsewhere: false, command: request.command ?? 'syzygy dossier init <clone> --config <run.json> --state-root <dir>',
      }, { ...ports.launch, sources, now: ports.now, copyRoot: path.join(request.stateRoot, COPY_DIRECTORY), openReader: trackedReader });
      if (outcome.kind === 'refused') {
        return refuse('launch', outcome.refusal.reason, { launch: outcome.refusal });
      }
      if (outcome.kind !== 'head-consented') {
        launched = outcome;
        copy = outcome.copy;
        // The launch's normalised URL, for every host: the GitHub-only refusal is retired (046, line 17).
        normalisedUrl = outcome.subject.url;
        sources = withLaunchRecords(ports.sources, { home: ports.launch.home, now: ports.now });
      }
    }
    if (normalisedUrl === undefined) return refuse('url', 'no --url names an observation consent made by another act, and no launch is possible here');
    const url = { url: normalisedUrl };

    const ids = await sources.repositoryIdsFor(url.url);
    if (ids.length !== 1) {
      return refuse('repository', ids.length === 0
        ? `no observation consent in force has an Upstream that normalises to ${url.url}${sources.consentAbsenceFor === undefined ? '' : `: ${await sources.consentAbsenceFor(url.url)}`}`
        : `${ids.length} observation consents in force have an Upstream that normalises to ${url.url} (${ids.join(', ')}); which one governs is ambiguous`);
    }
    const repositoryId = ids[0]!;
    if (launched !== null && repositoryId !== launched.subject.identity.slice('repository:'.length)) {
      return refuse('repository', `the launch declared ${launched.subject.identity}, but the consent in force for ${url.url} names repository:${repositoryId}`);
    }

    const [registryEntry, screeningPolicy] = await Promise.all([sources.registryEntry(), sources.screeningPolicy()]);
    if (registryEntry.state !== 'ok' || screeningPolicy.state !== 'ok') {
      const why = [registryEntry.state === 'ok' ? null : `source-acquisition registry entry: ${registryEntry.why}`,
        screeningPolicy.state === 'ok' ? null : `classification and screening policy: ${screeningPolicy.why}`].filter((w): w is string => w !== null);
      return refuse('start-gates', `a start gate is not in force: ${why.join('; ')}`, { startGates: { registryEntry, screeningPolicy } });
    }

    // The run's clone: in a copy-class run the copy, which REQ-polaris-generation-033 to 036 then name; otherwise the operator's clone.
    const runClone = copy === null ? request.clone : copy.dir;
    const head = resolveCloneHead(runClone);
    if (!head.ok) return refuse('head', head.reason);
    let clonePath: string;
    try { clonePath = fs.realpathSync(path.resolve(runClone)); } catch (cause) {
      return refuse('head', `the clone's real path cannot be resolved (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})`);
    }
    const revisions = (await sources.consentedRevisionsFor(repositoryId)).map(r => ({ label: r.label, commit: r.commitId }));
    const consent = await sources.observationConsentFor(repositoryId, head.commit);
    const pinned = revisions.find(r => r.commit === head.commit);
    if (!consent.satisfied || pinned === undefined) {
      return refuse('revision', `the clone's HEAD ${head.commit} (${head.via}) is not a revision the in-force observation consent for ${repositoryId} names${consent.satisfied ? '' : `: ${consent.why}`}`, { consentedRevisions: revisions });
    }

    const gitDirShape = cloneGitDirShape(head.gitDir, head.commit, { objectFormatSetting: copy !== null });
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

    const governed = governedSubject(await sources.projectInput.drawerFor(repositoryId), paths);
    let providerStatement: string | null = null;
    if (governed.statementRequired) {
      const statement = providerStatementGate(await sources.providerStatements.statementsFor(repositoryId), config.config.agentTool, config.config.agentProvider, ports.now());
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
    let operatorClone: string;
    try { operatorClone = fs.realpathSync(path.resolve(request.clone)); } catch (cause) {
      return refuse('head', `the operator's clone's real path cannot be resolved (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})`);
    }
    const launch = launchDisclosure(launched, { operatorClone, url: url.url, repositoryId, head, drawer: governed.drawer.stated ? governed.drawer.record : null });
    const created = createRunDirectory(request.stateRoot, request.clone, encodeRunRecord(config.config, subject), ports.runId === undefined ? {} : { runId: ports.runId },
      { launchDisclosure: `${JSON.stringify(launch, null, 2)}\n` });
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
          ...launchDisclosureItems(launch, null).map(item => item.text),
          governed.kind === 'non-governed'
            ? 'the subject is non-governed, so no per-project statement is required; the agent sessions\' sends to their provider are the operator\'s own act'
            : `the subject is ${governed.kind}; the run relies on the per-project statement ${providerStatement}, a consent record and not an egress record; neither the content classes it names nor the screening policies bind what the agent reads or sends`,
        ],
      },
    };
  }
}

/** The run record's launch disclosure (REQ-polaris-generation-046, line 37): of the launch where the run was launched; otherwise of a no-copy
 * run that rests on the observation consent another act recorded, whose named identifier is the clone's HEAD and which asked nothing. */
function launchDisclosure(
  l: Exclude<LaunchOutcome, { kind: 'refused' } | { kind: 'head-consented' }> | null,
  run: { readonly operatorClone: string; readonly url: string; readonly repositoryId: string; readonly head: { readonly commit: string; readonly via: string }; readonly drawer: string | null },
): LaunchDisclosure {
  const disclosure = (fields: Omit<LaunchDisclosure, 'format' | 'operatorClone' | 'drawer' | 'label'>): LaunchDisclosure => ({
    format: LAUNCH_DISCLOSURE_FORMAT, runClass: fields.runClass, launched: fields.launched, operatorClone: run.operatorClone, copy: fields.copy,
    consents: fields.consents, subject: fields.subject, drawer: run.drawer, statements: fields.statements, label: 'Inferred',
  });
  if (l === null) {
    return disclosure({
      runClass: 'no-copy', launched: false, copy: null, consents: { recorded: [], commit: null, relied: [] },
      subject: { identity: `repository:${run.repositoryId}`, url: run.url, source: 'the Upstream of the observation consent another act recorded, which --url names', proposedBy: null, publicDeclaration: null },
      statements: stageStatements({
        runClass: 'no-copy', named: { commit: run.head.commit, via: run.head.via, updateCommand: null, localElsewhere: null }, copy: null, copyEnd: null,
        pinned: { commit: run.head.commit, committerDate: 'not-read' }, questionAsked: false, beyondConsent: false,
      }),
    });
  }
  const recorded = l.kind === 'recorded' ? l.records : [];
  return disclosure({
    runClass: l.copy === null ? 'no-copy' : 'copy-class', launched: true, copy: l.copy === null ? null : l.copy.dir,
    consents: { recorded, commit: recorded.length > 0 && l.kind === 'recorded' ? l.commit : null, relied: l.relied },
    subject: {
      identity: l.subject.identity, url: l.subject.url, source: l.subject.urlSource, proposedBy: l.subject.identitySource,
      publicDeclaration: publicDeclarationOf(l.subject.publicDeclaration),
    },
    statements: l.statements,
  });
}
