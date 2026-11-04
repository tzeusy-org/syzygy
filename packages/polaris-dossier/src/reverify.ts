import * as fs from 'node:fs';
import * as path from 'node:path';
import { isRecord } from '@syzygy/support';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { RECORDS_WITHIN_REACH, providerStatementGate, statementContentClasses, type GateSources } from './gate-sources.js';
import { GitObjectReadRefusal, openPinnedObjectReader, type PinnedObjectReader, type PinnedObjectReaderOptions } from './git-object-reader.js';
import { governedSubject, type GovernedDecision } from './governed.js';
import { readRunRecord, type RecordedRunConfig } from './run-record.js';
import { RUN_LAYOUT } from './state-directory.js';

/** The step guard every later command calls before it reads an object for the run (REQ-polaris-generation-033: "At every later
 * check, review check and render, Syzygy SHALL verify again that the recorded pinned revision is a revision the in-force observation
 * consent names, and SHALL refuse the step otherwise").
 *
 * `run.json` lies within the agent sessions' write reach, so nothing the guard decides rests on what it says beyond which revision,
 * repository and clone to look at, and the operator's agent provider. The provider is the operator's declaration and nothing live can
 * attest it, so it is read from the run record, and the per-project statement it selects is selected by that Inferred value
 * (R-POLARIS-DOSSIER-S3-GATES-2 finding 6). Once the run is briefed, a tool or provider that differs from the one the brief record
 * states refuses; the brief record lies within the same reach, so an edit of both records together is not detected, and the disclosure
 * says so. Where the clone lies is likewise whoever last wrote the run record's choice. Every gate is re-read now: the consent found by the URL must still be the one for the recorded
 * repository and must still name the pinned commit; the registry entry and the policy must still be in force by their acts. Only then
 * is the pinned tree listed, through the re-hashing reader from the recorded clone, and whether the subject is governed is decided again
 * from the project input in force now and that listing. The recomputed kind must equal the recorded one, and whenever the subject needs
 * a per-project statement, one must be in force now and be the one the run relies on, whatever the record says
 * (R-POLARIS-DOSSIER-S3-GATES-1 finding 1). So a pin moved to another consented revision that is governed, or a record edited down to
 * non-governed, refuses once the statement it would need is not in force.
 *
 * The consented revision's label and the consent record are returned as the live records give them, never from the run record: a
 * later step that shows which revision and which consent the run read shows these (finding 2). HEAD is never read again. Every failing
 * reason is reported, not only the first, each with a machine code beside its prose (finding 3). */

export type ReverifyCode =
  | 'record-invalid' | 'consent-ids' | 'revision-unnamed' | 'registry' | 'policy' | 'listing' | 'governed-changed' | 'statement'
  | 'statement-changed' | 'declared-changed';

export interface ReverifyRefusal { readonly code: ReverifyCode; readonly reason: string }

export interface ReverifiedRevision {
  readonly commit: string;
  /** The label the in-force consent gives the commit now; null when it gives the commit more than one label. */
  readonly label: string | null;
  /** The consent record that names the commit now. */
  readonly consentRecord: string;
}

export type ReverifyResult =
  | {
    readonly ok: true;
    readonly record: RecordedRunConfig;
    readonly consentRecord: string;
    readonly revision: ReverifiedRevision;
    readonly governed: GovernedDecision;
    /** The per-project statement in force now that the run relies on; null for a non-governed subject. */
    readonly providerStatement: string | null;
    /** The content classes that statement lists; null when the run relies on none (a non-governed subject). */
    readonly contentClasses: readonly string[] | null;
    readonly disclosures: readonly string[];
  }
  | {
    readonly ok: false;
    readonly reasons: readonly string[];
    readonly refusals: readonly ReverifyRefusal[];
    readonly objectRead?: ReturnType<GitObjectReadRefusal['toJSON']>;
    readonly disclosures: readonly string[];
  };

export interface ReverifyOptions {
  /** The object reader; the default is the re-hashing in-process reader. */
  readonly openReader?: (options: PinnedObjectReaderOptions) => PinnedObjectReader;
}

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'the run record names the repository, the clone and the pinned commit to look at; whether that commit is consented, whether the subject is governed and whether a per-project statement is in force were decided again at this step from the records in force now and the pinned tree listed now',
  'which per-project statement applies is selected by the agent provider the run record declares: that provider, the statement citation it selects and the clone location are Inferred and lie within the agent sessions\' write reach; a tool or provider that differs from the one the brief record states refuses, but the brief record lies within the same reach, so an edit of both records together is not detected',
];

const BRIEF_RECORD_LIMITS = Object.freeze({ maxBytes: 262_144, maxNodes: 4096, maxDepth: 8 });

/** The agent tool and provider the brief record states, once the run is briefed (R-POLARIS-DOSSIER-S3-GATES-2 finding 6). */
function briefDeclaredAgent(run: string): { readonly state: 'unbriefed' } | { readonly state: 'ok'; readonly tool: string; readonly provider: string } | { readonly state: 'invalid'; readonly why: string } {
  let text: string;
  try {
    text = fs.readFileSync(path.join(run, RUN_LAYOUT.briefRecord), 'utf8');
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
    return code === 'ENOENT' ? { state: 'unbriefed' } : { state: 'invalid', why: `it cannot be read (${code})` };
  }
  let record: unknown;
  try { record = parseBoundedJson(text, BRIEF_RECORD_LIMITS); } catch { return { state: 'invalid', why: 'it is not bounded JSON' }; }
  const agent = isRecord(record) ? (record as Record<string, unknown>)['agent'] : undefined;
  if (agent === null || typeof agent !== 'object' || Array.isArray(agent)) return { state: 'invalid', why: 'it states no agent tool and provider' };
  const { tool, provider } = agent as Record<string, unknown>;
  if (typeof tool !== 'string' || typeof provider !== 'string') return { state: 'invalid', why: 'it states no agent tool and provider' };
  return { state: 'ok', tool, provider };
}

export async function reverifyPinnedRevision(runDir: string, sources: GateSources, now: number, options: ReverifyOptions = {}): Promise<ReverifyResult> {
  const refusals: ReverifyRefusal[] = [];
  const refuse = (extra: { objectRead?: ReturnType<GitObjectReadRefusal['toJSON']> } = {}): ReverifyResult =>
    ({ ok: false, reasons: refusals.map(r => r.reason), refusals, ...extra, disclosures: DISCLOSURES });
  let text: string;
  try {
    text = fs.readFileSync(path.join(path.resolve(runDir), RUN_LAYOUT.config), 'utf8');
  } catch (cause) {
    refusals.push({ code: 'record-invalid', reason: `${runDir} holds no readable ${RUN_LAYOUT.config} (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` });
    return refuse();
  }
  const read = readRunRecord(text);
  if (!read.ok) {
    refusals.push({ code: 'record-invalid', reason: read.detail });
    return refuse();
  }
  const { subject, declared } = read.record;
  const { repositoryId, url } = subject.repository;
  const commit = subject.pinnedRevision.commit;

  const ids = await sources.repositoryIdsFor(url);
  if (ids.length !== 1 || ids[0] !== repositoryId) {
    const why = ids.length === 0 && sources.consentAbsenceFor !== undefined ? await sources.consentAbsenceFor(url)
      : ids.length > 1 ? 'which one governs is ambiguous' : ids.length === 1 ? 'the consent in force for the URL names another repository' : 'none is in force';
    refusals.push({ code: 'consent-ids', reason: `the observation consents in force for ${url} are [${ids.join(', ')}], not exactly the recorded ${repositoryId}: ${why}` });
  }
  const consent = await sources.observationConsentFor(repositoryId, commit);
  if (!consent.satisfied) refusals.push({ code: 'revision-unnamed', reason: `the recorded pinned revision ${commit} is not a revision the in-force observation consent for ${repositoryId} names: ${consent.why}` });
  const [registryEntry, screeningPolicy] = await Promise.all([sources.registryEntry(), sources.screeningPolicy()]);
  if (registryEntry.state !== 'ok') refusals.push({ code: 'registry', reason: `the source-acquisition registry entry is no longer in force: ${registryEntry.why}` });
  if (screeningPolicy.state !== 'ok') refusals.push({ code: 'policy', reason: `the classification and screening policy is no longer in force: ${screeningPolicy.why}` });
  const briefed = briefDeclaredAgent(path.resolve(runDir));
  if (briefed.state === 'invalid') {
    refusals.push({ code: 'declared-changed', reason: `the brief record ${RUN_LAYOUT.briefRecord} exists but ${briefed.why}, so whether the agent tool and provider changed since the brief cannot be decided` });
  } else if (briefed.state === 'ok' && (briefed.tool !== declared.agentTool || briefed.provider !== declared.agentProvider)) {
    refusals.push({ code: 'declared-changed', reason: `the run record declares agent tool ${declared.agentTool} and provider ${declared.agentProvider}, not the tool ${briefed.tool} and provider ${briefed.provider} the brief record states the run was briefed for; the provider selects the per-project statement` });
  }
  // No object is read for a revision, repository or reader the gates no longer admit.
  if (refusals.length > 0 || !consent.satisfied) return refuse();

  let paths: readonly string[];
  try {
    const reader = (options.openReader ?? openPinnedObjectReader)({ gitDir: path.join(subject.clone.path, '.git'), revision: commit });
    paths = (await reader.listTree()).map(entry => entry.path);
  } catch (cause) {
    if (cause instanceof GitObjectReadRefusal) {
      refusals.push({ code: 'listing', reason: `the pinned tree could not be listed from the recorded clone, so whether the subject is governed cannot be decided again: ${cause.message}` });
      return refuse({ objectRead: cause.toJSON() });
    }
    throw cause;
  }
  const governed = governedSubject(await sources.projectInput.drawerFor(repositoryId), paths);
  if (governed.kind !== subject.governed.kind) {
    refusals.push({ code: 'governed-changed', reason: `the subject at the pinned revision is ${governed.kind} now (${governed.because.join('; ')}), not the ${subject.governed.kind} the run record states` });
  }
  let providerStatement: string | null = null;
  let contentClasses: readonly string[] | null = null;
  if (governed.statementRequired) {
    const records = await sources.providerStatements.statementsFor(repositoryId);
    const statement = providerStatementGate(records, declared.agentTool, declared.agentProvider, now);
    if (statement.state !== 'ok') {
      refusals.push({ code: 'statement', reason: `the subject is ${governed.kind} now and has no per-project statement in force: ${statement.why}` });
    } else if (statement.record !== subject.providerStatement) {
      refusals.push({ code: 'statement-changed', reason: `the in-force per-project statement is ${statement.record}, not the ${subject.providerStatement ?? 'none'} the run relies on` });
    } else {
      providerStatement = statement.record;
      contentClasses = statementContentClasses(records, declared.agentTool, declared.agentProvider, now);
    }
  }
  if (refusals.length > 0) return refuse();
  const labels = new Set((await sources.consentedRevisionsFor(repositoryId)).filter(r => r.commitId === commit).map(r => r.label));
  const label = labels.size === 1 ? [...labels][0]! : null;
  return {
    ok: true,
    record: read.record,
    consentRecord: consent.record,
    revision: { commit, label, consentRecord: consent.record },
    governed,
    providerStatement,
    contentClasses,
    disclosures: DISCLOSURES,
  };
}
