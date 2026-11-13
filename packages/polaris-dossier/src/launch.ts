import * as fs from 'node:fs';
import * as path from 'node:path';
import { otherActsOf, type GateSources, type ProviderStatementRecord } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, storedIdentifiers, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { governedSubject, type DrawerStatement } from './governed.js';
import { isoOf } from './iso-of.js';
import { cloneGitDirShape, cloneStoreShape } from './clone-shape.js';
import { linkedWorktrees, readCloneSnapshot, resolveRef } from './launch-clone.js';
import { copyEndStatement, copyRootViolation, gitReport, makeCopy, removeCopy, type CopyEnd, type CopyGitRun, type ForbiddenPlace } from './launch-copy.js';
import { normaliseUrl, proposeIdentity, type IdentitySource, type MatchableRecord } from './launch-identity.js';
import {
  DRAWER_QUESTION, PUBLIC_QUESTION, drawerPhrase, nameOnBranchWarning, observationPhrase, providerPhrase, questionOpening, statementText,
  type StatementOffer,
} from './launch-question.js';
import { recordIdFor, renderLaunchRecord, type LaunchRecord, type LaunchRecordClass, type PublicDeclaration } from './launch-record.js';
import { checkNoCopyPin, checkoutCommand, defaultRemote, nameLaunchRevision, updateCommand } from './launch-revision.js';
import { questionCopyStatements, stageStatements, type CopyProgress, type LaunchState, type LaunchStatement } from './launch-statements.js';
import { LAUNCH_REF, homeGitDirs, readLaunchRecords, recordingSubject, writeLaunchRecords, type StoreRead, type StoredRecord, type WriteResult } from './launch-store.js';
import type { WriteConsentState } from './launch-write-consent.js';

/** Launch-time consent (REQ-polaris-generation-046) and the trunk-tip pin (047), in the order the clauses fix.
 *
 * Before asking, from the clone's references, the pinned commit object (its root tree, parents and committer date only) and the trees
 * under it, never a blob: the identifier is named once and the run's class decided (047: a copy-class run unless an observation consent
 * made by another act names it); a copy-class run makes its copy (launch-copy.ts), is shown its commit by the copy's checkout, checks the
 * copy's form and reads every object from the copy, and a refusal removes the copy and says so; in a no-copy run a HEAD elsewhere is
 * refused with the checkout command; a clone that is the
 * governance home's is refused with the separate-clone command, records that disagree on the identity are refused, and, where anything
 * must be asked, an absent write consent or a standard input that is not a terminal is refused, naming what is missing and the command
 * to run. Records already in force are used and named and nothing is asked. Otherwise the question is asked on the terminal, each record
 * takes its own exact phrase, and every confirmed record is committed in one recording commit on the dedicated reference. A repository
 * the operator does not declare public is refused before any record while no effective policy admits non-public sources, naming the
 * screening-policy successor that is missing. Nothing read before the answer is stored except in the question, the launch output and,
 * after a confirmed answer, the records. */

export interface LaunchTerminal {
  /** Whether standard input is a terminal. */
  readonly isTTY: boolean;
  /** The terminal's name, recorded in the ceremony. */
  readonly name: string;
  /** One line typed by the operator, without its terminator; null at end of input. */
  ask(prompt: string): Promise<string | null>;
  print(text: string): void;
}

export interface NonPublicAdmission { readonly admitted: boolean; readonly successor: string }

export interface LaunchPorts {
  /** The governance home: the observing project's own repository, where the records are committed. */
  readonly home: string;
  readonly now: () => number;
  readonly terminal: LaunchTerminal;
  /** The gate sources of every other act (observation consents, drawer and provider statements not recorded at launch). */
  readonly sources: GateSources;
  readonly writeConsent: () => Promise<WriteConsentState>;
  /** Whether an effective screening policy admits non-public sources, and the successor to name while none does. */
  readonly nonPublic: () => Promise<NonPublicAdmission>;
  /** The content classes the effective classification policy assigns to `paths` for the subject at the commit (the preview). */
  readonly previewClasses: (identity: string, commit: string, paths: readonly string[]) => Promise<{ readonly classes: readonly string[] } | { readonly why: string }>;
  /** Whether an A1 audit mechanism is in force. None is today; while one is, Syzygy refuses to record (RFC3-16(c)(1) selection is not built). */
  readonly a1InForce: () => boolean;
  readonly readStore?: (home: string) => StoreRead;
  readonly writeStore?: typeof writeLaunchRecords;
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
  /** Where a copy-class run's copy is made (047): `init` gives `<state root>/copies`. Absent, a copy-class run is refused before its copy
   * step starts. */
  readonly copyRoot?: string;
  /** The Git processes for the copy and its removal; injected only by tests. */
  readonly copyGit?: CopyGitRun;
  readonly removeCopy?: (dir: string) => void;
}

export interface LaunchRequest {
  readonly clone: string;
  readonly revision?: string;
  readonly identity?: string;
  readonly upstream?: string;
  readonly agentTool: string;
  readonly agentProvider: string;
  readonly operator: string;
  /** Whether an observation consent made by another act already names the clone's HEAD (047's first branch). */
  readonly headConsentedElsewhere: boolean;
  /** The command the operator runs, for a refusal to name. */
  readonly command: string;
}

export type LaunchStage = 'failure' | 'clone' | 'self-observation' | 'revision' | 'head' | 'copy' | 'records' | 'listing' | 'identity' | 'policy' | 'write-consent' | 'terminal' | 'a1' | 'answer' | 'not-public' | 'write';

export interface LaunchRefusal {
  readonly stage: LaunchStage;
  readonly reason: string;
  /** The consents and statements the run still needs. */
  readonly missing: readonly string[];
  /** The command the operator runs next. */
  readonly command?: string;
  /** Whether a record was written (always false: a refusal before or at the answer writes nothing). */
  readonly recorded: false;
  /** In a copy-class run: the copy removed, or kept where its removal failed; null where its copy step never started (047). Absent in a
   * no-copy run and in a refusal made before the run's class was decided. */
  readonly copy?: CopyEnd | null;
  /** The launch output's statement of `copy`: removed, not removed (with its location and failure), or that no copy was made. */
  readonly copyStatement?: string;
  /** What the URL reading said of the clone's remote, where it said anything: its user information removed (046, line 17). */
  readonly locatorStatements?: readonly string[];
  /** The launch output's statements under 047's stage rule: each stage the run reached, and that each other was not reached. */
  readonly statements: readonly LaunchStatement[];
}

/** The run's class (047), decided at launch from the consents and the named identifier, and a copy-class run's copy. */
export interface LaunchCopy { readonly dir: string; readonly gitDir: string }

export interface LaunchPin {
  readonly commit: string;
  readonly via: string;
  readonly committerDate: string | null;
  readonly fetched: false;
  readonly updateCommand: string;
}

export interface LaunchSubject {
  readonly identity: string;
  readonly identitySource: IdentitySource;
  readonly url: string;
  readonly urlSource: string;
  readonly publicDeclaration: PublicDeclaration | null;
}

export type LaunchOutcome =
  | { readonly kind: 'head-consented'; readonly commit: string }
  | { readonly kind: 'covered'; readonly subject: LaunchSubject; readonly pin: LaunchPin; readonly relied: readonly string[]; readonly output: string; readonly copy: LaunchCopy | null;
      readonly statements: readonly LaunchStatement[]; readonly locatorStatements: readonly string[] }
  | { readonly kind: 'recorded'; readonly subject: LaunchSubject; readonly pin: LaunchPin; readonly commit: string; readonly records: readonly string[]; readonly relied: readonly string[];
      readonly statementDeclined: boolean; readonly output: string; readonly copy: LaunchCopy | null; readonly statements: readonly LaunchStatement[]; readonly locatorStatements: readonly string[] }
  | { readonly kind: 'refused'; readonly refusal: LaunchRefusal };

const real = (p: string): string => { try { return fs.realpathSync(p); } catch { return path.resolve(p); } };

/** The launch output's revision statement (047, line 184): the revision in full, its reference, the committer date, no fetch, the update command. */
export const pinStatement = (pin: LaunchPin): string =>
  `Pinned revision ${pin.commit} from ${pin.via}, committer date ${pin.committerDate ?? 'not recorded in the commit'}. Syzygy did not fetch; whether this is the upstream's latest commit is Inferred. Update the clone before a later run with: ${pin.updateCommand}`;

/** The in-force launch records the run can rely on, by class. */
function inForce(records: readonly StoredRecord[], identity: string, now: number): readonly StoredRecord[] {
  return records.filter(r => r.state === 'active' && r.record.identity === identity && Date.parse(r.record.grantInstant) <= now);
}

export function launchStatementRecord(r: StoredRecord): ProviderStatementRecord {
  const p = r.record.provider!;
  return {
    recordId: r.record.recordId, version: '1', digest: r.digest, agentTool: p.agentTool, provider: p.provider, contentClasses: p.contentClasses,
    withdrawn: r.state !== 'active', act: { identity: r.record.recordId, inForceAt: Date.parse(r.record.grantInstant) },
  };
}

/** A thrown error's own message, for a refusal to quote. */
export const failureText = (cause: unknown): string => cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);

export async function launchConsent(request: LaunchRequest, ports: LaunchPorts): Promise<LaunchOutcome> {
  // Every source answer here is another act's: the launch's own records come from its store, so launch records added to the sources
  // (`withLaunchRecords`) are set aside, and never satisfy an "another act" check (R-PDJA-33-SLICE-B-1 finding 1).
  const sources = otherActsOf(ports.sources);
  const missing: string[] = [];
  // The run's class, once decided, and its copy's directory once the copy step has started: a refusal then removes the copy and says so.
  let copyClass: boolean | null = null, copyDir: string | null = null;
  // What the URL reading says of the clone's remote, once read (046, line 17), for every outcome after it.
  let locatorStatements: readonly string[] = [];
  // How far the run got, for the stage rule's statements (047): the named identifier, the copy step, the pinned commit, the question, and
  // whether the run relies on a version 1.1 launch observation consent ("no fetch by Syzygy").
  let named: LaunchState['named'] = null, progress: CopyProgress = { reached: 'not-started' }, pinnedState: LaunchState['pinned'] = null;
  let questionAsked = false, beyondConsent = false;
  const stateOf = (copyEnd: LaunchState['copyEnd']): LaunchState => ({
    runClass: copyClass === null ? null : copyClass ? 'copy-class' : 'no-copy', named, copy: copyClass === true ? progress : null, copyEnd,
    pinned: pinnedState, questionAsked, beyondConsent,
  });
  const refuse = (stage: LaunchStage, reason: string, command?: string): LaunchOutcome => {
    const said = locatorStatements.length === 0 ? {} : { locatorStatements };
    if (copyClass !== true) {
      return { kind: 'refused', refusal: { stage, reason, missing: [...missing], ...(command === undefined ? {} : { command }), recorded: false, ...said, statements: stageStatements(stateOf(null)) } };
    }
    const end = copyDir === null ? null : removeCopy(copyDir, ports.removeCopy);
    return { kind: 'refused', refusal: { stage, reason, missing: [...missing], ...(command === undefined ? {} : { command }), recorded: false, ...said, copy: end, copyStatement: copyEndStatement(end), statements: stageStatements(stateOf(end)) } };
  };

  // Every path after the copy step starts ends in a refusal that removes the copy and says so, a thrown error included (R-PDJA-33-SLICE-B-1
  // finding 2): "Where the run ends before its brief, by a refusal or an answer that confirms nothing, Syzygy SHALL remove the copy".
  try {
    return await steps();
  } catch (cause) {
    if (copyClass !== true || copyDir === null) throw cause;
    return refuse('failure', `the launch failed after its copy step started: ${failureText(cause)}`);
  }

  async function steps(): Promise<LaunchOutcome> {
    // The closed list of launch reads (047; registry entry v1.1, reads (1) to (4)); a reftable clone is refused here, before any Git process.
    const read = readCloneSnapshot(request.clone, request.revision === undefined ? {} : { revision: request.revision });
    if (!read.ok) return refuse('clone', read.reason);
    const snapshot = read.snapshot;
    const clone = real(request.clone);

    // Self-observation from the governance home is refused before asking (line 27).
    const home = homeGitDirs(ports.home);
    if (home === null) return refuse('self-observation', `the governance home ${ports.home} is not a Git repository, so the records cannot be committed`);
    if (clone === home.top || [home.gitDir, home.common].includes(real(snapshot.gitDir))) {
      const head = resolveRef(snapshot, 'HEAD') ?? '<the pinned revision>';
      return refuse('self-observation', 'the clone is the governance home\'s own working tree or Git directory; observe it from a separate clone with its own Git directory',
        `git clone --no-local --no-checkout ${home.common} <new-dir> && git -C <new-dir> checkout --detach ${head}`);
    }

    // The launch records, read from the dedicated reference only.
    const store = (ports.readStore ?? readLaunchRecords)(ports.home);
    if (!store.ok) return refuse('records', `the launch consent records on ${LAUNCH_REF} cannot be read: ${store.why}`);
    const now = ports.now();
    const headOid = resolveRef(snapshot, 'HEAD');
    const launchNamesHead = headOid !== null && store.records.some(r => r.record.recordClass === 'observation-consent' && r.state === 'active' && r.record.revision === headOid && Date.parse(r.record.grantInstant) <= now);
    // Read (5)'s width: the object format the configuration records, SHA-1 where it records none, never the length of HEAD's value.
    const algorithm = snapshot.objectFormat === 'sha256' ? 'sha256' : 'sha1';
    const storedIds = async () => { try { return await storedIdentifiers(snapshot.gitDir, algorithm); } catch { return new Set<string>(); } };
    const naming = await nameLaunchRevision(
      { snapshot, ...(request.revision === undefined ? {} : { revision: request.revision }), headConsented: request.headConsentedElsewhere || launchNamesHead },
      { storedIds },
    );
    if (!naming.ok) return refuse(naming.refusal.stage, naming.refusal.reason, naming.refusal.command);
    if (naming.named.kind === 'head-consented' && request.headConsentedElsewhere) return { kind: 'head-consented', commit: naming.named.commit };
    const commit = naming.named.commit;
    const via = naming.named.kind === 'pinned' ? naming.named.via : 'the clone\'s HEAD, which an in-force launch observation consent names';
    const remoteName = naming.named.kind === 'pinned' && naming.named.remote !== null ? naming.named.remote : (snapshot.remotes.length > 0 ? (snapshot.remotes.find(r => r.name === 'origin') ?? snapshot.remotes[0]!).name : null);
    const update = updateCommand(clone, remoteName);
    named = { commit, via, updateCommand: update, localElsewhere: naming.named.kind === 'pinned' ? naming.named.localElsewhere ?? null : null };

    // The class (047): "SHALL run on a copy unless its named identifier is named by an in-force observation consent made by another act".
    copyClass = !(await sources.observationConsentNaming(commit)).satisfied;
    let runGitDir = snapshot.gitDir, copy: LaunchCopy | null = null;
    if (copyClass) {
      if (snapshot.alternates) return refuse('clone', 'the operator\'s clone has an objects/info/alternates file, and a copy-class run refuses a clone with an alternate before its copy step starts');
      if (ports.copyRoot === undefined) return refuse('copy', 'no location for the copy was given, so the copy step cannot start');
      const homeWorktrees = linkedWorktrees(home.common), cloneWorktrees = linkedWorktrees(snapshot.gitDir);
      if (!homeWorktrees.ok) return refuse('copy', `the governance home's linked worktrees cannot be located: ${homeWorktrees.reason}`);
      if (!cloneWorktrees.ok) return refuse('copy', `the operator's clone's linked worktrees cannot be located: ${cloneWorktrees.reason}`);
      const forbidden: ForbiddenPlace[] = [
        { path: home.top, what: 'the governance home\'s working tree' }, { path: home.gitDir, what: 'the governance home\'s Git directory' },
        { path: home.common, what: 'the governance home\'s common Git directory' },
        ...homeWorktrees.dirs.map(d => ({ path: d, what: 'a linked worktree of the governance home\'s repository' })),
        { path: clone, what: 'the operator\'s clone\'s working tree' }, { path: snapshot.gitDir, what: 'the operator\'s clone\'s Git directory' },
        ...(snapshot.worktree === null ? [] : [{ path: path.resolve(snapshot.gitDir, snapshot.worktree), what: 'the working tree the operator\'s clone\'s core.worktree names' }]),
        ...cloneWorktrees.dirs.map(d => ({ path: d, what: 'a linked worktree of the operator\'s clone\'s repository' })),
      ];
      const violation = copyRootViolation(ports.copyRoot, forbidden);
      if (violation !== null) return refuse('copy', violation);
      const made = makeCopy({ clone, named: commit, objectFormat: snapshot.objectFormat, copyRoot: ports.copyRoot }, ports.copyGit);
      copyDir = made.dir;
      if (made.dir !== null) progress = copyProgressOf(made);
      if (made.ok) pinnedState = { commit, committerDate: 'unread' };
      if (!made.ok) {
        const f = made.failure, given = request.revision === undefined ? '' : ` (--revision ${request.revision})`;
        const via = naming.named.kind === 'pinned' ? naming.named.via : 'the clone\'s HEAD';
        if (f.kind === 'directory') return refuse('copy', f.reason);
        if (f.kind === 'process') return refuse('copy', `git ${f.process} for the copy failed (exit ${f.status}): ${gitReport(f.stderr)}`);
        if (f.kind === 'checkout') {
          return refuse('revision', `the copy's detached checkout of ${commit}${given} failed (exit ${f.status}): ${gitReport(f.stderr)}; the object was not shown to be a commit: it is either not a commit or a commit that could not be checked out`);
        }
        return refuse('revision', `${via} names ${commit}, which is not a commit: the copy's detached checkout did not leave the copy's HEAD at it; Syzygy does not follow it`);
      }
      progress = { reached: 'fetched', location: made.dir, where: 'at its form check' };
      const form = cloneGitDirShape(made.gitDir, commit, { objectFormatSetting: true });
      if (!form.ok) return refuse('copy', `the copy departs from the form one commit fetched alone and checked out detached leaves: ${form.reason}`);
      try {
        const store = cloneStoreShape(made.gitDir, commit, await (ports.openReader ?? openPinnedObjectReader)({ gitDir: made.gitDir, revision: commit }).inventory());
        if (!store.ok) return refuse('copy', `the copy departs from the form one commit fetched alone and checked out detached leaves: ${store.reason}`);
      } catch (cause) {
        if (cause instanceof GitObjectReadRefusal) return refuse('copy', `the copy's object store could not be checked: ${cause.message}`);
        throw cause;
      }
      copy = { dir: made.dir, gitDir: made.gitDir };
      progress = { reached: 'formed', location: made.dir };
      runGitDir = made.gitDir;
    } else {
      // A no-copy run: the named identifier is read as a commit object, and the operator's HEAD must be it.
      const checked = await checkNoCopyPin(clone, snapshot, naming.named, {
        // The type from the header alone, so a tag or blob is never read past it (046's pre-answer reads); a commit is then re-hashed.
        isCommit: async oid => {
          try {
            const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: snapshot.gitDir, revision: oid });
            if ((await reader.storedType()) !== 'commit') return false;
            await reader.tree();
            return true;
          } catch { return false; }
        },
      });
      if (!checked.ok) return refuse(checked.refusal.stage, checked.refusal.reason, checked.refusal.command);
      pinnedState = { commit, committerDate: 'unread' };
    }

    // Pre-answer reads: the pinned commit's tree, parents and committer date, and the trees under it. No blob.
    let paths: readonly string[], parents: readonly string[], committerDate: string | null;
    try {
      const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: runGitDir, revision: commit });
      const head = await reader.commitHead();
      parents = head.parents; committerDate = head.committerDate;
      pinnedState = { commit, committerDate };
      paths = (await reader.listTree()).map(e => e.path);
    } catch (cause) {
      if (cause instanceof GitObjectReadRefusal) return refuse('listing', `the pinned tree could not be listed: ${cause.message}`);
      throw cause;
    }

    const chosenRemote = defaultRemote(snapshot);
    // Every existing record, in any state (046, line 15): the launch records, and the observation consents made by other acts, matched by
    // identity, by their `Upstream:` URL normalised by the same rule (host and whole path), by the pinned revision or by a parent (line 17).
    const others = await sources.observationRecords();
    if (!others.ok) return refuse('records', `the observation consents made by other acts cannot be read, so the records matching the run are not known: ${others.why}`);
    const matchable: MatchableRecord[] = [
      ...store.records.map((r): MatchableRecord => ({
        recordId: r.record.recordId, identity: r.record.identity, normalisedUrl: r.record.normalisedUrl,
        revisions: r.record.recordClass === 'observation-consent' ? [r.record.revision] : [], state: r.state, madeBy: 'launch',
      })),
      ...others.records.map((r): MatchableRecord => ({
        recordId: r.record, identity: `repository:${r.repositoryId}`, normalisedUrl: r.upstream === null ? null : normaliseUrl(r.upstream)?.url ?? null,
        revisions: r.admittedRevisions, state: r.state, madeBy: 'another act',
      })),
    ];
    const proposal = proposeIdentity({
      remotes: snapshot.remotes, defaultRemote: 'remote' in chosenRemote ? chosenRemote.remote : null,
      ...(request.identity === undefined ? {} : { identityOption: request.identity }),
      ...(request.upstream === undefined ? {} : { upstreamOption: request.upstream }),
      records: matchable, pinned: commit, parents,
    });
    if (!proposal.ok) return refuse('identity', proposal.reason);
    locatorStatements = proposal.locatorStatements;
    const identity = proposal.identity, bare = identity.slice('repository:'.length);
    const pin: LaunchPin = { commit, via, committerDate, fetched: false, updateCommand: update };
    // The pin, then what the URL reading says of the remote (046, line 17): user information removed, or a URL that is no locator.
    // The launch output (047's stage rule; 046 line 17's user-information statement), rebuilt at each outcome so it states how far the run got.
    const outputOf = (tail: string) => {
      const statements = stageStatements(stateOf(copy === null ? null : 'kept'));
      return { statements, locatorStatements: proposal.locatorStatements, output: [...statements.map(x => x.text), ...proposal.locatorStatements, tail].join('\n') };
    };

    // What is already in force, by any act.
    const mine = inForce(store.records, identity, now);
    const relied: string[] = [];
    const elsewhereObs = await sources.observationConsentFor(bare, commit);
    const launchObs = mine.find(r => r.record.recordClass === 'observation-consent' && r.record.revision === commit);
    const needObservation = !elsewhereObs.satisfied && launchObs === undefined;
    if (elsewhereObs.satisfied) relied.push(`observation consent ${elsewhereObs.record}`);
    // A copy-class run resting on a launch observation consent version 1.1 recorded, "in the operator's own clone with no fetch by Syzygy" (047).
    beyondConsent = copyClass === true && !elsewhereObs.satisfied && launchObs !== undefined && launchObs.record.observationScope === 'operator-clone';
    if (launchObs !== undefined) relied.push(`launch observation consent ${launchObs.record.recordId} (${launchObs.commit})`);
    const elsewhereDrawer = await sources.projectInput.drawerFor(bare);
    const launchDrawer = mine.find(r => r.record.recordClass === 'drawer-statement');
    const drawer: DrawerStatement = elsewhereDrawer.stated ? elsewhereDrawer
      : launchDrawer !== undefined ? { stated: true, drawer: 'absent', record: launchDrawer.record.recordId } : elsewhereDrawer;
    if (drawer.stated) relied.push(`drawer statement ${drawer.record}`);
    const needDrawerQuestion = !drawer.stated;

    const preview = await ports.previewClasses(identity, commit, paths);
    if ('why' in preview) return refuse('policy', `the content classes cannot be previewed: ${preview.why}`);
    const statements = [...(await sources.providerStatements.statementsFor(bare)), ...mine.filter(r => r.record.recordClass === 'provider-statement').map(launchStatementRecord)];
    const pair = statements.filter(s => s.agentTool === request.agentTool && s.provider === request.agentProvider && !s.withdrawn && s.act !== null && s.act.inForceAt <= now);
    const covering = pair.find(s => preview.classes.every(c => s.contentClasses.includes(c)));
    const supersedable = covering === undefined && pair.length === 1 ? pair[0]!.recordId : null;
    const statementNeeded = (governedNow: boolean) => governedNow && covering === undefined;
    const governedByTree = governedSubject(drawer, paths);

    if (needObservation) missing.push(`an observation consent for ${identity} at ${commit}`);
    if (needDrawerQuestion && governedByTree.kind === 'unstated') missing.push(`a drawer statement for ${identity}, or else a per-project statement for ${request.agentTool} with ${request.agentProvider}`);
    else if (statementNeeded(governedByTree.statementRequired)) missing.push(`a per-project statement for ${identity} naming ${request.agentTool} with ${request.agentProvider} and the classes ${preview.classes.join(', ') || 'none'}`);
    if (covering !== undefined) relied.push(`per-project statement ${covering.recordId}`);

    // Records already in force: use them, name them, ask nothing (line 23).
    if (missing.length === 0) {
      const subject: LaunchSubject = { identity, identitySource: proposal.source, url: proposal.url, urlSource: proposal.urlSource, publicDeclaration: launchObs?.record.publicDeclaration ?? null };
      return { kind: 'covered', subject, pin, relied, copy, ...outputOf(`In-force records the run rests on, nothing asked: ${relied.join('; ')}`) };
    }

    const writeConsent = await ports.writeConsent();
    if (writeConsent.state !== 'ok') return refuse('write-consent', `Syzygy asks nothing: ${writeConsent.why}`);
    if (!ports.terminal.isTTY) return refuse('terminal', `standard input is not a terminal, so the owner cannot be asked; the run needs ${missing.join('; ')}. The owner runs, in person at a terminal:`, request.command);
    if (ports.a1InForce()) return refuse('a1', 'an A1 audit mechanism is in force, so the owner must select the provenance state explicitly (RFC3-16(c)(1)); this launch cannot ask for that selection and records nothing');

    const t = ports.terminal;
    const transcript: string[] = [];
    const say = (text: string) => { transcript.push(text); t.print(text); };
    const ask = async (prompt: string): Promise<string | null> => { transcript.push(prompt); const a = await t.ask(prompt); transcript.push(a ?? '<no answer>'); return a; };
    const answerRefused = (what: string): LaunchOutcome => refuse('answer', `${what}; nothing was recorded. The owner runs, in person at a terminal:`, request.command);

    const existing = store.records.filter(r => r.record.identity === identity || proposal.matches.some(m => m.record.recordId === r.record.recordId))
      .map(r => ({ recordId: r.record.recordId, recordClass: r.record.recordClass, identity: r.record.identity, state: r.state === 'active' ? 'active' : `${r.state} by ${r.stateBy}`, commit: r.commit }));
    for (const line of proposal.locatorStatements) say(line);
    questionAsked = true;
    say(questionOpening({
      ...(copy === null ? {} : { copyStatements: questionCopyStatements(copy.dir) }),
      identity, identitySource: proposal.source, url: proposal.url, urlSource: proposal.urlSource, revision: commit, revisionVia: via, committerDate,
      updateCommand: pin.updateCommand, existing, notCarrying: proposal.notCarrying, matchedElsewhere: proposal.matches.filter(m => m.record.madeBy === 'another act'), inForceElsewhere: relied, asks: { observation: needObservation, drawer: needDrawerQuestion },
    }));

    const publicAnswer = await ask(PUBLIC_QUESTION);
    if (publicAnswer === null) return answerRefused('no answer was given');
    const declaration: PublicDeclaration | null = publicAnswer.trim() === 'public' ? 'public' : publicAnswer.trim() === 'not public' ? 'not-public' : publicAnswer.trim() === '' ? 'not-given' : null;
    if (declaration === null) return answerRefused('the answer to whether the repository is public was not "public", "not public" or empty');
    if (declaration !== 'public') {
      const admission = await ports.nonPublic();
      if (!admission.admitted) return refuse('not-public', `the operator did not declare the repository public, and no effective policy admits non-public sources: ${admission.successor} is missing; nothing was recorded`);
      say(nameOnBranchWarning(identity, proposal.url));
    }

    let drawerAnswer: 'none' | 'exists' | 'unknown' | null = null;
    if (needDrawerQuestion) {
      const a = await ask(DRAWER_QUESTION);
      if (a === null) return answerRefused('no answer was given');
      drawerAnswer = a.trim() === 'none' ? 'none' : a.trim() === 'exists' ? 'exists' : a.trim() === 'unknown' ? 'unknown' : null;
      if (drawerAnswer === null) return answerRefused('the drawer answer was not "none", "exists" or "unknown"');
    }
    const drawerAfter: DrawerStatement = drawerAnswer === 'none' ? { stated: true, drawer: 'absent', record: 'the drawer statement this launch records' } : drawer;
    const governed = governedSubject(drawerAfter, paths);
    const askStatement = statementNeeded(governed.statementRequired);
    const offer: StatementOffer = { agentTool: request.agentTool, provider: request.agentProvider, classes: preview.classes, supersedes: supersedable };
    if (askStatement) say(statementText(offer));

    // The grant instant at second precision, the form every act record writes.
    const instant = isoOf(ports.now()).replace(/\.\d{3}Z$/, 'Z');
    const accepted: { recordClass: LaunchRecordClass; phrase: string }[] = [];
    const confirm = async (phrase: string, optional: boolean): Promise<'yes' | 'declined' | 'refused'> => {
      const a = await ask(`Type exactly: ${phrase}\n> `);
      if (a === null) return 'refused';
      if (a === phrase) return 'yes';
      return optional && a === '' ? 'declined' : 'refused';
    };
    if (needObservation) {
      if ((await confirm(observationPhrase(identity, commit), false)) !== 'yes') return answerRefused('the answer was not the exact phrase for the observation consent');
      accepted.push({ recordClass: 'observation-consent', phrase: observationPhrase(identity, commit) });
    }
    if (drawerAnswer === 'none') {
      if ((await confirm(drawerPhrase(identity, commit), false)) !== 'yes') return answerRefused('the answer was not the exact phrase for the drawer statement');
      accepted.push({ recordClass: 'drawer-statement', phrase: drawerPhrase(identity, commit) });
    }
    let statementDeclined = false;
    if (askStatement) {
      const phrase = providerPhrase(identity, commit, request.agentTool, request.agentProvider);
      const r = await confirm(phrase, true);
      if (r === 'refused') return answerRefused('the answer was not the exact phrase for the per-project statement, nor empty to decline it');
      if (r === 'yes') accepted.push({ recordClass: 'provider-statement', phrase }); else statementDeclined = true;
    }
    const subject: LaunchSubject = { identity, identitySource: proposal.source, url: proposal.url, urlSource: proposal.urlSource, publicDeclaration: declaration };
    if (accepted.length === 0) {
      return { kind: 'recorded', subject, pin, commit: store.tip ?? '', records: [], relied, statementDeclined, copy, ...outputOf('Nothing was recorded: the statement was declined.') };
    }

    const question = transcript.join('\n');
    const records = accepted.map(a => {
      const recordId = recordIdFor(a.recordClass, commit, instant, identity);
      const record: LaunchRecord = {
        recordClass: a.recordClass, recordId, identity, identitySource: proposal.source, normalisedUrl: proposal.url, urlSource: proposal.urlSource,
        publicDeclaration: declaration, revision: commit, grantInstant: instant, supersedes: a.recordClass === 'provider-statement' ? supersedable : null,
        phrase: a.phrase, terminal: t.name, question,
        ...(a.recordClass === 'observation-consent' ? { observationScope: 'copy' as const } : {}),
        ...(a.recordClass === 'provider-statement' ? { provider: { agentTool: request.agentTool, provider: request.agentProvider, contentClasses: preview.classes } } : {}),
      };
      return { recordId, text: renderLaunchRecord(record) };
    });
    const written: WriteResult = (ports.writeStore ?? writeLaunchRecords)(ports.home, {
      records, expectedTip: store.tip, operator: request.operator,
      message: `${recordingSubject(records.map(r => r.recordId))}\n\nRecorded by Syzygy at launch for the operator ${request.operator}, on the owner's typed phrases (REQ-polaris-generation-046), under the write consent WRITE-CONSENT-LAUNCH-RECORDS.\n`,
    });
    if (!written.ok) return refuse('write', `the records could not be committed: ${written.why}`);
    return {
      kind: 'recorded', subject, pin, commit: written.commit, records: records.map(r => r.recordId), relied, statementDeclined, copy,
      ...outputOf(`Recorded ${records.map(r => r.recordId).join(', ')} in ${written.commit} on ${LAUNCH_REF}. Syzygy never pushes ${LAUNCH_REF}.`),
    };
  }
}

export { checkoutCommand };

/** Where a copy step that made its directory ended (047's copy statements): before the fetch, at a failed fetch, or after it. */
function copyProgressOf(made: ReturnType<typeof makeCopy>): CopyProgress {
  if (made.ok) return { reached: 'fetched', location: made.dir, where: 'at its form check' };
  const f = made.failure, location = made.dir!;
  if (f.kind === 'directory') return f.fetchStarted === true ? { reached: 'fetch-failed', location, report: f.reason } : { reached: 'before-fetch', location };
  if (f.kind === 'process') return f.process === 'fetch' ? { reached: 'fetch-failed', location, report: gitReport(f.stderr) } : { reached: 'before-fetch', location };
  if (f.kind === 'checkout') return { reached: 'fetched', location, where: 'at the copy\'s detached checkout, which failed' };
  return { reached: 'fetched', location, where: 'at the copy\'s detached checkout, which did not leave the copy\'s HEAD at the named identifier' };
}
