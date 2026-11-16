import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { isRecord, sha256 } from '@syzygy/support';
import { CREDENTIAL_CHECK_DISCLOSURE, credentialStepCheck, storedBriefArm, type CredentialStepResult } from './credential-probe.js';
import { executionFlags } from './execution-flags.js';
import type { CredentialProbe } from './execution-rule.js';
import { RECORDS_WITHIN_REACH } from './gate-sources.js';
import { errno, logStep, openRun, readRecord } from './inventory.js';
import { isoOf } from './iso-of.js';
import type { Outcome } from './outcome.js';
import { latestPassedDraft, type ReviewDeps } from './review.js';
import type { ReverifyRefusal } from './reverify.js';
import { loadDossierScreen } from './screen.js';
import { RUN_LAYOUT } from './state-directory.js';

/** `syzygy dossier close <run> [--usage-tokens N] [--usage-turns N]` (REQ-polaris-generation-033, 018; design "Command surface",
 * `close`; syzygy-qkea.11).
 *
 * In this order: a declared usage figure must be a positive integer (there is no zero usage: an undeclared figure is not recorded, never
 * 0); the pinned revision is verified again, the brief issued and the deadline not passed; a run is closed once; the adapter-credential
 * check runs where the brief permitted execution, and a breach is a finding of this step, recorded in the Execution Record. Then Syzygy
 * writes the run's Execution Record, `record.json`, once.
 *
 * The agent sessions' tokens and turns are invisible to Syzygy, so the record carries only the figure the operator declares, labelled
 * Inferred and attributed to the operator, and never as Observed or as a provider receipt; with none declared it says the usage was not
 * recorded and that Syzygy cannot observe it. Everything else the record carries from the run directory (the configuration, the brief's
 * execution rule, the agent's reported commands, the step instants, the breach log) is a stored record within the agent sessions' write
 * reach, and Inferred. The record copies no file body: no brief, prompt or transcript body enters it, only each stored file's digest.
 * Syzygy made no provider call for the run, issued no credential for it and wrote none to the state directory. */

export const EXECUTION_RECORD_FORMAT = 'polaris-dossier-execution-record/1';
export const USAGE_NOT_RECORDED = 'not recorded: the operator declared no usage figure at close, and Syzygy cannot observe the agent sessions\' usage';
export const NO_PROVIDER_CALL = 'Syzygy made no provider call for this run, resolved no provider route and transmitted no project content to any service; the agent sessions\' own transmissions to their provider are the operator\'s act and are not recorded, consented or observed by Syzygy.';
export const NO_CREDENTIAL_ISSUED = 'Syzygy issued no credential for this run and wrote none to the state directory.';
const WITHHELD_TEXT = '[withheld: a secret detector matches this text]';
const MAX_STORED_FILES = 20_000;
const STEP_LINES_MAX = 10_000;

export interface CloseRequest {
  /** The operator's declared token usage, as typed; a positive integer or absent. */
  readonly usageTokens?: string;
  /** The operator's declared turn usage, as typed; a positive integer or absent. */
  readonly usageTurns?: string;
}

export interface CloseDeps extends ReviewDeps {
  readonly probe: CredentialProbe;
}

export type AgentUsage =
  | { readonly state: 'declared'; readonly tokens: number | null; readonly turns: number | null; readonly declaredBy: 'operator'; readonly label: 'Inferred'; readonly basis: string }
  | { readonly state: 'not-recorded'; readonly text: typeof USAGE_NOT_RECORDED; readonly label: 'Unknown' };

export type CloseStage = 'usage' | 'run' | 'reverify' | 'not-briefed' | 'deadline' | 'closed-already' | 'screen' | 'write';

export interface CloseRefusal {
  readonly command: 'close';
  readonly outcome: 'refused';
  readonly stage: CloseStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  readonly refusals?: readonly ReverifyRefusal[];
  readonly disclosures: readonly string[];
}

export interface CloseReport {
  readonly command: 'close';
  readonly outcome: 'closed' | 'closed-with-finding';
  readonly run: string;
  readonly record: string;
  readonly closedAt: string;
  readonly usage: AgentUsage;
  readonly credential: CredentialStepResult;
  readonly storedFiles: number;
  readonly disclosures: readonly string[];
}

export type CloseResult = Outcome<CloseReport, CloseRefusal>;

const DISCLOSURES = [
  RECORDS_WITHIN_REACH,
  'The Execution Record is written to the run directory, which the agent sessions can write; its integrity and immutability once written are Inferred, and every value it carries from a stored record is Inferred.',
  'Agent usage is the figure the operator declares, Inferred and attributed to the operator; it is never a provider receipt, never Observed and never zero.',
];

const text = (value: unknown): string | undefined => (typeof value === 'string' ? value : undefined);

/** A declared usage figure: a positive integer, written in decimal without sign or leading zero; a description of the fault otherwise. */
export function parseUsageFigure(name: string, value: string | undefined): number | null | string {
  if (value === undefined) return null;
  if (!/^[1-9][0-9]*$/.test(value) || !Number.isSafeInteger(Number(value))) {
    return `${name} must be a positive integer (the operator's figure); got ${JSON.stringify(value)}. Declare nothing for usage not recorded: there is no zero usage`;
  }
  return Number(value);
}

export async function closeRun(runDir: string, request: CloseRequest, deps: CloseDeps): Promise<CloseResult> {
  const now = deps.now();
  let logRun: string | undefined;
  const refuse = (stage: CloseStage, reason: string, extra: Partial<CloseRefusal> = {}): CloseResult => {
    if (logRun !== undefined) logStep(logRun, 'close', now, { outcome: 'refused', stage, reason });
    return { ok: false, refusal: { command: 'close', outcome: 'refused', stage, reason, ...extra, disclosures: DISCLOSURES } };
  };
  const tokens = parseUsageFigure('--usage-tokens', request.usageTokens);
  const turns = parseUsageFigure('--usage-turns', request.usageTurns);
  for (const figure of [tokens, turns]) if (typeof figure === 'string') return refuse('usage', figure);
  const usage: AgentUsage = tokens === null && turns === null
    ? { state: 'not-recorded', text: USAGE_NOT_RECORDED, label: 'Unknown' }
    : { state: 'declared', tokens: tokens as number | null, turns: turns as number | null, declaredBy: 'operator', label: 'Inferred',
      basis: 'the figure the operator declared at close, as their agent tool showed it; Syzygy cannot observe the agent sessions\' usage, and this is not a provider receipt' };

  const opened = await openRun(runDir, deps.sources, now, 'the run is not closed', deps.openReader ? { openReader: deps.openReader } : {});
  if (!opened.ok) return refuse(opened.stage, opened.reason, { ...(opened.reasons ? { reasons: opened.reasons } : {}), ...(opened.refusals ? { refusals: opened.refusals } : {}) });
  const { run, runId, subject, declared, revision } = opened;
  logRun = run;
  const recordFile = path.join(run, RUN_LAYOUT.record);
  if (fs.existsSync(recordFile)) return refuse('closed-already', `the run already holds ${RUN_LAYOUT.record}: a run is closed once`);

  const credential = await credentialStepCheck(run, 'close', deps.probe, now);
  const screenLoad = await (deps.loadScreen ?? (() => loadDossierScreen(deps.sources.recordsRoot, now)))();
  if (!screenLoad.ok) return refuse('screen', screenLoad.why);
  const secret = (value: string): boolean => screenLoad.screen.screenBody(value) === 'secret-detector-match';
  const ruling = await deps.sources.rfc720Ruling();

  const brief = readRecord(path.join(run, RUN_LAYOUT.briefRecord));
  const stored = storedFiles(run);
  const record = {
    format: EXECUTION_RECORD_FORMAT,
    runId,
    mode: 'operator-agent',
    label: 'Inferred',
    basis: 'written by Syzygy at close from the run directory, which the agent sessions can write; every value carried from a stored record is Inferred, and the record itself lies within their write reach once written',
    closedAt: isoOf(now),
    clock: 'Syzygy\'s own clock',
    subject,
    pinnedRevisionAtClose: { commit: subject.pinnedRevision.commit, consentRecord: revision.consentRecord, revisionLabel: revision.label, label: 'Observed', basis: 'verified again at close against the in-force observation consent' },
    configuration: { declared: { ...declared, deadline: declared.deadline.declared }, declaredBy: 'operator', label: 'Inferred' },
    principal: { name: declared.operator, declaredBy: 'operator', credentialIdentity: 'Unknown' },
    brief: isRecord(brief)
      ? { issuedAt: text(brief['issuedAt']) ?? null, files: brief['files'] ?? null, label: 'Inferred' }
      : { issuedAt: null, why: `${RUN_LAYOUT.briefRecord} cannot be read`, label: 'Unknown' },
    executionRule: isRecord(brief) && isRecord(brief['executionRule']) ? { ...brief['executionRule'], label: 'Inferred' } : { why: `${RUN_LAYOUT.briefRecord} names no execution rule`, label: 'Unknown' },
    reportedCommands: reportedCommands(run, subject.clone.path, secret),
    agentUsage: usage,
    steps: stepInstants(run),
    credential: { atClose: credential, breaches: breachLog(run), ...(credential.required ? { disclosure: CREDENTIAL_CHECK_DISCLOSURE } : {}) },
    rfc720Ruling: ruling.state === 'ok' ? { state: 'in-force', record: ruling.record } : { state: ruling.state, why: ruling.why },
    providerStatement: subject.providerStatement,
    noProviderCall: NO_PROVIDER_CALL,
    credentialsIssued: NO_CREDENTIAL_ISSUED,
    stored: { label: 'Inferred', basis: 'the digest of each file in the run directory as Syzygy read it at close; no body is copied, so no brief, prompt or transcript body enters this record', ...stored },
    disclosures: credential.required ? [...DISCLOSURES, CREDENTIAL_CHECK_DISCLOSURE] : DISCLOSURES,
  };
  try {
    fs.writeFileSync(recordFile, `${JSON.stringify(record, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    return refuse('write', `the Execution Record could not be written (${errno(cause)})`);
  }
  logStep(run, 'close', now, { outcome: 'closed', usage: usage.state });
  return {
    ok: true,
    report: {
      command: 'close',
      outcome: credential.required && !credential.passed ? 'closed-with-finding' : 'closed',
      run,
      record: recordFile,
      closedAt: isoOf(now),
      usage,
      credential,
      storedFiles: stored.files.length,
      disclosures: record.disclosures,
    },
  };
}

/** The commands the latest passed draft revision reports, each screened by the secret detectors that screen every other carried text:
 * the agent's own report, Inferred, never complete. A command any of whose fields a detector matches is withheld whole and stays
 * counted, by its position in the report and the reason; no byte of it and no digest of it is kept, since a digest of a short secret
 * can be reversed by guessing. */
function reportedCommands(run: string, clone: string, secret: (value: string) => boolean): Readonly<Record<string, unknown>> {
  const latest = latestPassedDraft(run);
  if (!latest.ok) return { label: 'Unknown', why: `the agent's reported commands are not recorded: ${latest.reason}` };
  let doc: unknown;
  try { doc = parseBoundedJson(new TextDecoder('utf-8', { fatal: true }).decode(latest.bytes), { maxBytes: 4 * 1024 * 1024, maxNodes: 500_000, maxDepth: 16 }); } catch { doc = undefined; }
  if (!isRecord(doc)) return { label: 'Unknown', why: `draft revision ${latest.revision} is not one bounded JSON object` };
  const entries = (Array.isArray(doc['executions']) ? doc['executions'] : []).filter(isRecord);
  const flags = executionFlags(entries, clone, storedBriefArm(run));
  // A flag's detail is fixed text and a scope one of two words, so both are kept beside a withheld command without carrying its bytes.
  const flagsOf = (index: number): Readonly<Record<string, unknown>> => (flags.applies ? { scope: flags.commands[index]!.scope, flags: flags.commands[index]!.flags } : {});
  const commands = entries.map((entry, index) => {
    const id = text(entry['id']) ?? null, command = text(entry['command']) ?? '', workingDirectory = text(entry['workingDirectory']) ?? null;
    return [id ?? '', command, workingDirectory ?? ''].some(secret)
      ? { position: index + 1, withheld: WITHHELD_TEXT, reason: 'secret-detector-match', ...flagsOf(index) }
      : { position: index + 1, id, command, workingDirectory, ...flagsOf(index) };
  });
  return {
    draftRevision: latest.revision,
    reportedBy: 'the authoring agent',
    label: 'Inferred',
    basis: 'the agent\'s own report in its latest passed draft revision; Syzygy cannot observe what the agent ran, ran nothing itself, and does not present the list as complete',
    count: commands.length,
    withheld: commands.filter((command) => 'withheld' in command).length,
    executionFlags: flags.applies ? { applies: true, flagged: flags.flagged, label: flags.label, basis: flags.basis } : flags,
    commands,
  };
}

/** The instants of Syzygy's own steps, from the step log: stored, so Inferred. Only the step, instant and outcome are carried. */
function stepInstants(run: string): Readonly<Record<string, unknown>> {
  let lines: string[];
  try { lines = fs.readFileSync(path.join(run, RUN_LAYOUT.steps), 'utf8').split('\n').filter((line) => line !== ''); } catch { lines = []; }
  const entries: { step: string; at: string; outcome: string | null }[] = [];
  let unreadable = 0;
  for (const line of lines.slice(0, STEP_LINES_MAX)) {
    let entry: unknown;
    try { entry = JSON.parse(line); } catch { entry = undefined; }
    if (!isRecord(entry) || text(entry['step']) === undefined || text(entry['at']) === undefined) { unreadable++; continue; }
    entries.push({ step: text(entry['step'])!, at: text(entry['at'])!, outcome: text(entry['outcome']) ?? null });
  }
  return { label: 'Inferred', basis: 'the run\'s step log, which the agent sessions can write', entries, unreadable: unreadable + Math.max(0, lines.length - STEP_LINES_MAX) };
}

/** The adapter-credential breach log, as stored: Inferred. */
function breachLog(run: string): readonly unknown[] {
  let lines: string[];
  try { lines = fs.readFileSync(path.join(run, RUN_LAYOUT.credentialBreaches), 'utf8').split('\n').filter((line) => line !== ''); } catch { return []; }
  return lines.slice(0, STEP_LINES_MAX).map((line) => {
    try { const entry: unknown = JSON.parse(line); return isRecord(entry) ? { ...entry, label: 'Inferred' } : { unreadable: true }; } catch { return { unreadable: true }; }
  });
}

/** Every regular file under the run directory, with its size and digest; the record itself is not yet written. */
function storedFiles(run: string): { readonly files: readonly { readonly path: string; readonly bytes: number; readonly sha256: string }[]; readonly notListed: number } {
  const files: { path: string; bytes: number; sha256: string }[] = [];
  let notListed = 0;
  const walk = (dir: string): void => {
    let entries: fs.Dirent[];
    try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { notListed++; return; }
    for (const entry of entries.sort((a, b) => (a.name < b.name ? -1 : a.name > b.name ? 1 : 0))) {
      const full = path.join(dir, entry.name);
      if (entry.isDirectory()) { walk(full); continue; }
      if (!entry.isFile() || files.length >= MAX_STORED_FILES) { notListed++; continue; }
      try {
        const bytes = fs.readFileSync(full);
        files.push({ path: path.relative(run, full).split(path.sep).join('/'), bytes: bytes.byteLength, sha256: sha256(bytes) });
      } catch { notListed++; }
    }
  };
  walk(run);
  return { files, notListed };
}
