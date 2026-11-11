import * as fs from 'node:fs';
import * as path from 'node:path';
import type { GateSources, ProviderStatementRecord } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, storedIdentifiers, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { governedSubject, type DrawerStatement } from './governed.js';
import { isoOf } from './iso-of.js';
import { readCloneSnapshot, resolveRef } from './launch-clone.js';
import { proposeIdentity, type IdentitySource, type MatchableRecord } from './launch-identity.js';
import {
  DRAWER_QUESTION, PUBLIC_QUESTION, drawerPhrase, nameOnBranchWarning, observationPhrase, providerPhrase, questionOpening, statementText,
  type StatementOffer,
} from './launch-question.js';
import { recordIdFor, renderLaunchRecord, type LaunchRecord, type LaunchRecordClass, type PublicDeclaration } from './launch-record.js';
import { checkoutCommand, defaultRemote, pinLaunchRevision, updateCommand } from './launch-revision.js';
import { LAUNCH_REF, homeGitDirs, readLaunchRecords, recordingSubject, writeLaunchRecords, type StoreRead, type StoredRecord, type WriteResult } from './launch-store.js';
import type { WriteConsentState } from './launch-write-consent.js';

/** Launch-time consent (REQ-polaris-generation-046) and the trunk-tip pin (047), in the order the clauses fix.
 *
 * Before asking, from the clone's references, the pinned commit object (its root tree, parents and committer date only) and the trees
 * under it, never a blob: the revision is pinned once, a HEAD elsewhere is refused with the checkout command, a clone that is the
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

export type LaunchStage = 'clone' | 'self-observation' | 'revision' | 'head' | 'records' | 'listing' | 'identity' | 'policy' | 'write-consent' | 'terminal' | 'a1' | 'answer' | 'not-public' | 'write';

export interface LaunchRefusal {
  readonly stage: LaunchStage;
  readonly reason: string;
  /** The consents and statements the run still needs. */
  readonly missing: readonly string[];
  /** The command the operator runs next. */
  readonly command?: string;
  /** Whether a record was written (always false: a refusal before or at the answer writes nothing). */
  readonly recorded: false;
}

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
  | { readonly kind: 'covered'; readonly subject: LaunchSubject; readonly pin: LaunchPin; readonly relied: readonly string[]; readonly output: string }
  | { readonly kind: 'recorded'; readonly subject: LaunchSubject; readonly pin: LaunchPin; readonly commit: string; readonly records: readonly string[]; readonly relied: readonly string[];
      readonly statementDeclined: boolean; readonly output: string }
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

export async function launchConsent(request: LaunchRequest, ports: LaunchPorts): Promise<LaunchOutcome> {
  const missing: string[] = [];
  const refuse = (stage: LaunchStage, reason: string, command?: string): LaunchOutcome =>
    ({ kind: 'refused', refusal: { stage, reason, missing: [...missing], ...(command === undefined ? {} : { command }), recorded: false } });

  const read = readCloneSnapshot(request.clone);
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
  const algorithm = headOid !== null && headOid.length === 64 ? 'sha256' : 'sha1';
  const pinned = await pinLaunchRevision(
    { clone, snapshot, ...(request.revision === undefined ? {} : { revision: request.revision }), headConsented: request.headConsentedElsewhere || launchNamesHead },
    {
      storedIds: async () => { try { return await storedIdentifiers(snapshot.gitDir, algorithm); } catch { return new Set(); } },
      // The type from the header alone, so a tag or blob is never read past it (046's pre-answer reads); a commit is then re-hashed.
      isCommit: async oid => {
        try {
          const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: snapshot.gitDir, revision: oid });
          if ((await reader.storedType()) !== 'commit') return false;
          await reader.tree();
          return true;
        } catch { return false; }
      },
    },
  );
  if (!pinned.ok) return refuse(pinned.refusal.stage, pinned.refusal.reason, pinned.refusal.command);
  if (pinned.pinned.kind === 'head-consented' && request.headConsentedElsewhere) return { kind: 'head-consented', commit: pinned.pinned.commit };
  const commit = pinned.pinned.commit;

  // Pre-answer reads: the pinned commit's tree, parents and committer date, and the trees under it. No blob.
  let paths: readonly string[], parents: readonly string[], committerDate: string | null;
  try {
    const reader = (ports.openReader ?? openPinnedObjectReader)({ gitDir: snapshot.gitDir, revision: commit });
    const head = await reader.commitHead();
    parents = head.parents; committerDate = head.committerDate;
    paths = (await reader.listTree()).map(e => e.path);
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) return refuse('listing', `the pinned tree could not be listed: ${cause.message}`);
    throw cause;
  }

  const chosenRemote = defaultRemote(snapshot);
  const matchable: MatchableRecord[] = store.records.map(r => ({
    recordId: r.record.recordId, identity: r.record.identity, normalisedUrl: r.record.normalisedUrl,
    revision: r.record.recordClass === 'observation-consent' ? r.record.revision : null, state: r.state,
  }));
  const proposal = proposeIdentity({
    remotes: snapshot.remotes, defaultRemote: 'remote' in chosenRemote ? chosenRemote.remote : null,
    ...(request.identity === undefined ? {} : { identityOption: request.identity }),
    ...(request.upstream === undefined ? {} : { upstreamOption: request.upstream }),
    records: matchable, pinned: commit, parents,
  });
  if (!proposal.ok) return refuse('identity', proposal.reason);
  const identity = proposal.identity, bare = identity.slice('repository:'.length);
  const via = pinned.pinned.kind === 'pinned' ? pinned.pinned.via : 'the clone\'s HEAD, which an in-force launch observation consent names';
  const remoteName = pinned.pinned.kind === 'pinned' && pinned.pinned.remote !== null ? pinned.pinned.remote : (snapshot.remotes.length > 0 ? (snapshot.remotes.find(r => r.name === 'origin') ?? snapshot.remotes[0]!).name : null);
  const pin: LaunchPin = { commit, via, committerDate, fetched: false, updateCommand: updateCommand(clone, remoteName) };

  // What is already in force, by any act.
  const mine = inForce(store.records, identity, now);
  const relied: string[] = [];
  const elsewhereObs = await ports.sources.observationConsentFor(bare, commit);
  const launchObs = mine.find(r => r.record.recordClass === 'observation-consent' && r.record.revision === commit);
  const needObservation = !elsewhereObs.satisfied && launchObs === undefined;
  if (elsewhereObs.satisfied) relied.push(`observation consent ${elsewhereObs.record}`);
  if (launchObs !== undefined) relied.push(`launch observation consent ${launchObs.record.recordId} (${launchObs.commit})`);
  const elsewhereDrawer = await ports.sources.projectInput.drawerFor(bare);
  const launchDrawer = mine.find(r => r.record.recordClass === 'drawer-statement');
  const drawer: DrawerStatement = elsewhereDrawer.stated ? elsewhereDrawer
    : launchDrawer !== undefined ? { stated: true, drawer: 'absent', record: launchDrawer.record.recordId } : elsewhereDrawer;
  if (drawer.stated) relied.push(`drawer statement ${drawer.record}`);
  const needDrawerQuestion = !drawer.stated;

  const preview = await ports.previewClasses(identity, commit, paths);
  if ('why' in preview) return refuse('policy', `the content classes cannot be previewed: ${preview.why}`);
  const statements = [...(await ports.sources.providerStatements.statementsFor(bare)), ...mine.filter(r => r.record.recordClass === 'provider-statement').map(launchStatementRecord)];
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
    return { kind: 'covered', subject, pin, relied, output: `${pinStatement(pin)}\nIn-force records the run rests on, nothing asked: ${relied.join('; ')}` };
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
  say(questionOpening({
    identity, identitySource: proposal.source, url: proposal.url, urlSource: proposal.urlSource, revision: commit, revisionVia: via, committerDate,
    updateCommand: pin.updateCommand, existing, notCarrying: proposal.notCarrying, inForceElsewhere: relied, asks: { observation: needObservation, drawer: needDrawerQuestion },
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
    return { kind: 'recorded', subject, pin, commit: store.tip ?? '', records: [], relied, statementDeclined, output: `${pinStatement(pin)}\nNothing was recorded: the statement was declined.` };
  }

  const question = transcript.join('\n');
  const records = accepted.map(a => {
    const recordId = recordIdFor(a.recordClass, commit, instant, identity);
    const record: LaunchRecord = {
      recordClass: a.recordClass, recordId, identity, identitySource: proposal.source, normalisedUrl: proposal.url, urlSource: proposal.urlSource,
      publicDeclaration: declaration, revision: commit, grantInstant: instant, supersedes: a.recordClass === 'provider-statement' ? supersedable : null,
      phrase: a.phrase, terminal: t.name, question,
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
    kind: 'recorded', subject, pin, commit: written.commit, records: records.map(r => r.recordId), relied, statementDeclined,
    output: `${pinStatement(pin)}\nRecorded ${records.map(r => r.recordId).join(', ')} in ${written.commit} on ${LAUNCH_REF}. Syzygy never pushes ${LAUNCH_REF}.`,
  };
}

export { checkoutCommand };
