import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import { briefIssuedAt } from './check.js';
import { USAGE_NOT_RECORDED } from './close.js';
import { type RecordedRunConfig } from './run-record.js';
import { describeRawReadDisclosure, readRawReadDisclosure } from './raw-read-disclosure.js';
import { effectiveUrlProjection, readEffectiveRunRecord, URL_MODE_MARKERS, URL_RUN_SIDECAR, type EffectiveRunAuthority } from './effective-run-record.js';
import type { UrlRunDeclaration } from './url-run-record.js';
import { REVIEW_PACKET_DIR, REVIEW_VERDICT_FILE, REVISION_FILE, RUN_LAYOUT } from './state-directory.js';
import { isoOf } from './iso-of.js';

/** `syzygy dossier status <run>`: the run's state, limits spent, open findings and reviews still
 * required, read from the run directory. Status reads and writes nothing else. Everything it reports
 * comes from stored files the agent sessions can write, so every value is labelled Inferred
 * (owner direction `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`). */

export const NOT_RECORDED = 'not recorded' as const;
export const NO_ROUTE = 'none: the dossier commands serve no route, accept no network request and hold no credential that authenticates to Syzygy';

export type RunState = 'configured' | 'briefed' | 'drafting' | 'reviewing' | 'rendered' | 'closed';

export interface StatusReport {
  readonly command: 'status';
  readonly outcome: 'reported';
  readonly run: string;
  readonly label: 'Inferred';
  readonly basis: string;
  readonly mode: 'operator-agent' | UrlRunDeclaration['mode'];
  readonly route: string;
  readonly principal: RecordedRunConfig['principal'];
  /** What init recorded: the repository, the pinned revision, the start gates' records, the governed decision, the statement relied
   * on and the absent work item. Which revision the run was pinned to is shown, not verified, here; later steps verify it. */
  readonly subject: RecordedRunConfig['subject'] | (Omit<RecordedRunConfig['subject'], 'workItem'> & { readonly workItem: UrlRunDeclaration['workItem'] });
  readonly effectiveRun?: ReturnType<typeof effectiveUrlProjection>;
  readonly rawReadDisclosure: ReturnType<typeof describeRawReadDisclosure>;
  readonly state: RunState;
  readonly configuration: {
    readonly declaredBy: 'operator' | 'URL run configuration';
    readonly label: 'Inferred';
    readonly values: Readonly<Record<string, string | number | boolean>>;
    readonly modelVersionProvider: string;
  };
  readonly steps: {
    readonly brief: 'recorded' | typeof NOT_RECORDED;
    readonly draftRevisions: number;
    readonly checkedRevisions: number;
    readonly inventory: 'recorded' | typeof NOT_RECORDED;
    readonly reviewPackets: number;
    readonly reviewVerdicts: number;
    readonly site: 'recorded' | typeof NOT_RECORDED;
    readonly closed: boolean;
  };
  readonly limitsSpent: {
    readonly repairCycles: string;
    readonly questions: string;
    readonly deadline: string;
    readonly agentUsage: string;
  };
  /** Whether the run's Execution Record exists, and when it does not, why: not closed yet, or never, because the deadline passed first. */
  readonly executionRecord: string;
  readonly openFindings: string;
  readonly reviewsStillRequired: readonly string[];
  /** Entries in the run directory that no step writes. Listed, never read. */
  readonly unrecognizedEntries: readonly string[];
}

export type StatusResult =
  | { readonly ok: true; readonly report: StatusReport }
  | { readonly ok: false; readonly reason: string; readonly refusals?: readonly { readonly field?: string; readonly kind: string; readonly detail: string }[] };

const KNOWN_ENTRIES: ReadonlySet<string> = new Set(Object.values(RUN_LAYOUT));

/** The agent usage the Execution Record carries, in words: the operator's declared figure, or not recorded. Never zero. */
function closedUsage(file: string): string {
  let usage: unknown;
  try {
    const record = parseBoundedJson(fs.readFileSync(file, 'utf8'), { maxBytes: 16 * 1024 * 1024, maxNodes: 1_000_000, maxDepth: 16 }) as { agentUsage?: unknown };
    usage = record.agentUsage;
  } catch {
    return `${NOT_RECORDED}; the Execution Record cannot be read`;
  }
  const figure = (value: unknown): value is number => typeof value === 'number' && Number.isSafeInteger(value) && value > 0;
  if (usage !== null && typeof usage === 'object') {
    const { state, tokens, turns } = usage as Record<string, unknown>;
    if (state === 'not-recorded') return USAGE_NOT_RECORDED;
    if (state === 'declared' && (figure(tokens) || tokens === null) && (figure(turns) || turns === null) && (tokens !== null || turns !== null)) {
      const parts = [...(tokens === null ? [] : [`${tokens} tokens`]), ...(turns === null ? [] : [`${turns} turns`])];
      return `${parts.join(' and ')}, as the operator declared at close; not observed by Syzygy and not a provider receipt`;
    }
  }
  return `${NOT_RECORDED}; the Execution Record carries no usage in the form close writes`;
}

export const NO_RECORD_DEADLINE_PASSED = 'not written, and it will not be: the deadline passed before the run was closed, and close, like every step, refuses after it; the agent usage is therefore not recorded';

export function runStatus(runDir: string, now: () => number = Date.now, authority?: EffectiveRunAuthority): StatusResult {
  const run = path.resolve(runDir);
  let stats: fs.Stats;
  try {
    stats = fs.statSync(run);
  } catch (cause) {
    return { ok: false, reason: `run directory ${run} cannot be read (${(cause as NodeJS.ErrnoException).code ?? 'unknown-error'})` };
  }
  if (!stats.isDirectory()) return { ok: false, reason: `${run} is not a run directory` };
  const read = readEffectiveRunRecord(run, authority);
  if (!read.ok) return { ok: false, reason: read.reason, ...(read.refusals ? { refusals: read.refusals } : {}) };
  const record = { record: read.core };
  const url = read.effective.kind === 'url' ? read.effective.declaration : undefined;

  const entries = fs.readdirSync(run).sort();
  const has = (name: string): boolean => entries.includes(name);
  const count = (dir: string, pattern: RegExp): number => {
    try {
      return fs.readdirSync(path.join(run, dir)).filter((name) => pattern.test(name)).length;
    } catch {
      return 0;
    }
  };
  const draftRevisions = count(RUN_LAYOUT.drafts, REVISION_FILE);
  const checkedRevisions = count(RUN_LAYOUT.checks, REVISION_FILE);
  const reviewPackets = count(RUN_LAYOUT.reviews, REVIEW_PACKET_DIR);
  const reviewVerdicts = count(RUN_LAYOUT.reviews, REVIEW_VERDICT_FILE);
  const steps: StatusReport['steps'] = {
    brief: has(RUN_LAYOUT.brief) ? 'recorded' as const : NOT_RECORDED,
    draftRevisions,
    checkedRevisions,
    inventory: has(RUN_LAYOUT.inventory) ? 'recorded' as const : NOT_RECORDED,
    reviewPackets,
    reviewVerdicts,
    site: has(RUN_LAYOUT.site) ? 'recorded' as const : NOT_RECORDED,
    closed: has(RUN_LAYOUT.record),
  };
  const state: RunState = steps.closed ? 'closed'
    : steps.site === 'recorded' ? 'rendered'
      : reviewPackets + reviewVerdicts > 0 || steps.inventory === 'recorded' ? 'reviewing'
        : draftRevisions + checkedRevisions > 0 ? 'drafting'
          : steps.brief === 'recorded' ? 'briefed' : 'configured';

  const declared = record.record.declared;
  // The deadline is measured as every step measures it: from the brief record's issue instant, on Syzygy's clock now.
  const issued = steps.brief === 'recorded' ? briefIssuedAt(run, record.record.subject.pinnedRevision.commit, 'step') : undefined;
  const endsAt = typeof issued === 'number' ? issued + declared.deadline.seconds * 1000 : undefined;
  const passed = endsAt !== undefined && now() >= endsAt;
  const deadline = steps.brief !== 'recorded' ? `${declared.deadline.declared}; not started (no brief recorded)`
    : endsAt === undefined ? `${declared.deadline.declared} from the brief; its end cannot be measured (${issued as string})`
      : `${declared.deadline.declared} from the brief, ${passed ? 'ended' : 'ending'} at ${isoOf(endsAt)} on Syzygy's clock; elapsed time ${NOT_RECORDED}`;
  const values: Record<string, string | number | boolean> = {
    operator: declared.operator, agentTool: declared.agentTool, agentToolVersion: declared.agentToolVersion,
    agentProvider: declared.agentProvider, model: declared.model, modelVersion: declared.modelVersion ?? 'not shown by the agent tool',
    deadline: declared.deadline.declared, agentTokenBudget: declared.agentTokenBudget ?? 'not declared',
    agentTurnBudget: declared.agentTurnBudget ?? 'not declared', maxRepairCycles: declared.maxRepairCycles,
    maxQuestions: declared.maxQuestions, audience: declared.audience, operatorIsOwner: declared.operatorIsOwner,
  };
  return {
    ok: true,
    report: {
      command: 'status',
      outcome: 'reported',
      run,
      label: 'Inferred',
      basis: 'the run directory, which the agent sessions can write',
      mode: url?.mode ?? 'operator-agent',
      route: url === undefined ? NO_ROUTE : 'local CLI through checked transport relay; Git source transport is a distinct declared route; actual sends Unknown',
      principal: record.record.principal,
      subject: url === undefined ? record.record.subject : { ...record.record.subject, workItem: url.workItem },
      ...(url === undefined ? {} : { effectiveRun: effectiveUrlProjection(read.core, url) }),
      rawReadDisclosure: describeRawReadDisclosure(readRawReadDisclosure(run, declared.agentProvider)),
      state,
      configuration: { declaredBy: url === undefined ? 'operator' : 'URL run configuration', label: 'Inferred', values,
        modelVersionProvider: url === undefined ? record.record.modelVersionProvider : 'Unknown; no supported provider-reported model/version capture is bound to this declaration' },
      steps,
      limitsSpent: {
        repairCycles: `${checkedRevisions} checked revisions recorded of ${declared.maxRepairCycles} repair cycles declared`,
        questions: `${NOT_RECORDED} of ${declared.maxQuestions} declared`,
        deadline,
        agentUsage: url !== undefined ? 'Unknown; no supported provider usage capture is bound to this declaration; compatible history and any operator figures remain Inferred'
          : steps.closed ? closedUsage(path.join(run, RUN_LAYOUT.record))
          : passed ? `${NOT_RECORDED}; the deadline passed before the run was closed, so no Execution Record will carry it, and Syzygy cannot observe the agent sessions' usage`
            : 'not recorded; Syzygy cannot observe the agent sessions\' usage, and the run is not closed',
      },
      executionRecord: steps.closed ? `written at close: ${RUN_LAYOUT.record}` : passed ? NO_RECORD_DEADLINE_PASSED : 'not written: the run is not closed',
      openFindings: NOT_RECORDED,
      reviewsStillRequired: ['inventory', 'fidelity review', 'rendered-design review'],
      unrecognizedEntries: entries.filter((name) => !KNOWN_ENTRIES.has(name)
        && !(url !== undefined && (name === URL_RUN_SIDECAR || (URL_MODE_MARKERS as readonly string[]).includes(name)))),
    },
  };
}
