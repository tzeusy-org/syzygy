import { randomBytes } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { parseBoundedJson } from '@syzygy/polaris-generation-core/live';
import type { ExecutionChoice, ExecutionChoiceSource } from './execution-rule.js';
import { RECORDS_WITHIN_REACH, type GateSources } from './gate-sources.js';
import type { Outcome } from './outcome.js';
import { launchedMarkerState } from './launched.js';
import { reverifyPinnedRevision, type ReverifyOptions, type ReverifyRefusal } from './reverify.js';
import { RUN_ID, RUN_LAYOUT } from './state-directory.js';
import { isoOf } from './iso-of.js';

/** `syzygy dossier allow-execution <run> --revision <pinned> --declare <declarations>` (REQ-polaris-generation-033).
 *
 * The owner's execution choice for one run: it names the run, its pinned revision, and what it covers, which is building and running
 * the observed project in the clone from that run's authoring session. It is taken only from this command, which the operator runs
 * personally; never from the run configuration, an earlier run, or a standing or per-project record. It is refused for a launched run
 * or one whose launched marker cannot be read, for another run or revision, after the brief, while D9 is not established in force, when
 * the configuration does not declare the operator to be the owner, and without the operator's three declarations (R3-F2): that the owner
 * started the authoring session, on the owner's own host, and attends it. Syzygy cannot see who typed the command or whether the owner attends, so the record says both are the operator's
 * declaration, labelled Inferred. The record lies in the run directory, within the agent sessions' write reach.
 *
 * R3-F7: the record is not an execution consent (RFC5-12, `SOURCE-POLICY.md`) and approves no execution profile. Its format names it a
 * per-run execution choice, it lives only in the run directory, and nothing reads it as a consent. */

export const EXECUTION_CHOICE_FORMAT = 'polaris-dossier-execution-choice/1';
export const EXECUTION_CHOICE_COVERS = 'building and running the observed project in the clone, from this run\'s authoring session only';
export const NOT_AN_EXECUTION_CONSENT = 'This per-run execution choice is not an execution consent (RFC5-12, SOURCE-POLICY.md): it is never read, stored or reported as one, and it approves no execution profile.';
export const CHOICE_ATTRIBUTION = 'Syzygy cannot observe who ran allow-execution or whether the owner attends the session: both are the operator\'s declaration, labelled Inferred.';

/** The three declarations, by the names the command takes. */
export const DECLARATIONS = Object.freeze({
  'owner-started-session': 'ownerStartedSession',
  'owners-own-host': 'ownersOwnHost',
  'owner-attends': 'ownerAttends',
} as const);

export interface StoredExecutionChoice extends ExecutionChoice {
  readonly format: typeof EXECUTION_CHOICE_FORMAT;
  readonly covers: typeof EXECUTION_CHOICE_COVERS;
  readonly declaredBy: 'operator';
  readonly label: 'Inferred';
  readonly attribution: typeof CHOICE_ATTRIBUTION;
  readonly notAnExecutionConsent: typeof NOT_AN_EXECUTION_CONSENT;
}

export interface AllowExecutionRequest {
  readonly revision: string;
  /** The declaration names the operator gave (`--declare a,b,c`). */
  readonly declarations: readonly string[];
}

export type AllowExecutionStage = 'launched' | 'run' | 'reverify' | 'revision' | 'briefed' | 'd9' | 'owner' | 'declarations' | 'recorded-already' | 'write';

export interface AllowExecutionRefusal {
  readonly command: 'allow-execution';
  readonly outcome: 'refused';
  readonly stage: AllowExecutionStage;
  readonly reason: string;
  readonly reasons?: readonly string[];
  /** The step guard's refusals in machine form, beside `reasons`. */
  readonly refusals?: readonly ReverifyRefusal[];
  readonly disclosures: readonly string[];
}

export interface AllowExecutionReport {
  readonly command: 'allow-execution';
  readonly outcome: 'recorded';
  readonly run: string;
  readonly choice: StoredExecutionChoice;
  readonly disclosures: readonly string[];
}

export type AllowExecutionResult = Outcome<AllowExecutionReport, AllowExecutionRefusal>;

export interface AllowExecutionDeps {
  readonly sources: GateSources;
  readonly now: () => number;
  readonly recordId?: () => string;
  /** The object reader the step guard lists the pinned tree with; by default the re-hashing in-process reader. */
  readonly openReader?: ReverifyOptions['openReader'];
}

const DISCLOSURES = [CHOICE_ATTRIBUTION, NOT_AN_EXECUTION_CONSENT, RECORDS_WITHIN_REACH,
  'The choice is stored in the run directory, which the agent sessions can write; read back, it is Inferred.'];

export async function allowExecution(runDir: string, request: AllowExecutionRequest, deps: AllowExecutionDeps): Promise<AllowExecutionResult> {
  const run = path.resolve(runDir);
  const refuse = (stage: AllowExecutionStage, reason: string, reasons?: readonly string[], refusals?: readonly ReverifyRefusal[]): AllowExecutionResult =>
    ({ ok: false, refusal: { command: 'allow-execution', outcome: 'refused', stage, reason, ...(reasons ? { reasons } : {}), ...(refusals ? { refusals } : {}), disclosures: DISCLOSURES } });
  // syzygy-bpyt.8.11: a launched run takes no choice (SEC-3; candidate REQ-polaris-generation-044's falsifier), and neither does a run
  // whose marker is present but not the one Syzygy writes (syzygy-bpyt.8.8). Checked first, where the CLI checked it before, so every
  // caller of this function refuses at the same point and no other refusal moves.
  const marker = launchedMarkerState(run);
  if (marker === 'launched') {
    return refuse('launched', 'this run was launched by `syzygy polaris`, and Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9); a launched run executes nothing');
  }
  if (marker === 'unreadable') {
    return refuse('launched', 'this run\'s launched marker is present but cannot be read as the one `syzygy polaris` writes, so the run is treated as launched: Syzygy never gives the execution instruction to a session it started (SEC-3, as amended by D9)');
  }
  const runId = path.basename(run);
  if (!RUN_ID.test(runId)) return refuse('run', `${run} is not a run directory: its name is not of the form run-<32 hex>`);

  const checked = await reverifyPinnedRevision(run, deps.sources, deps.now(), deps.openReader ? { openReader: deps.openReader } : {});
  if (!checked.ok) return refuse('reverify', 'the pinned revision could not be verified again, so no choice is recorded', checked.reasons, checked.refusals);
  const pinned = checked.record.subject.pinnedRevision.commit;
  if (request.revision !== pinned) return refuse('revision', `--revision ${request.revision} is not this run's pinned revision ${pinned}; a choice covers one run and its pinned revision only`);
  const briefed = [RUN_LAYOUT.brief, RUN_LAYOUT.briefRecord].filter((name) => fs.existsSync(path.join(run, name)));
  if (briefed.length > 0) return refuse('briefed', `the run already holds ${briefed.join(', ')}: the choice must be recorded before the brief is issued`);
  const d9 = await deps.sources.d9();
  if (d9.state !== 'ok') return refuse('d9', `D9 is not established in force, so Syzygy does not ask for or take the choice: ${d9.why}`);
  if (checked.record.declared.operatorIsOwner !== true) return refuse('owner', 'the run configuration does not declare the operator to be the owner; only the owner may make this choice');

  const known = Object.keys(DECLARATIONS);
  const unknown = request.declarations.filter((name) => !known.includes(name));
  const missing = known.filter((name) => !request.declarations.includes(name));
  if (unknown.length > 0 || missing.length > 0 || new Set(request.declarations).size !== request.declarations.length) {
    return refuse('declarations', 'the operator must declare that the owner started the authoring session, on the owner\'s own host, and attends it',
      [...missing.map((name) => `missing declaration: ${name}`), ...unknown.map((name) => `unknown declaration: ${name}`),
        ...(new Set(request.declarations).size !== request.declarations.length ? ['a declaration is given more than once'] : [])]);
  }

  const choice: StoredExecutionChoice = {
    format: EXECUTION_CHOICE_FORMAT,
    recordId: (deps.recordId ?? (() => `choice-${randomBytes(8).toString('hex')}`))(),
    command: 'allow-execution',
    runId,
    revision: pinned,
    recordedAt: isoOf(deps.now()),
    covers: EXECUTION_CHOICE_COVERS,
    declarations: { ownerStartedSession: true, ownersOwnHost: true, ownerAttends: true },
    declaredBy: 'operator',
    label: 'Inferred',
    attribution: CHOICE_ATTRIBUTION,
    notAnExecutionConsent: NOT_AN_EXECUTION_CONSENT,
  };
  try {
    fs.writeFileSync(path.join(run, RUN_LAYOUT.executionChoice), `${JSON.stringify(choice, null, 2)}\n`, { mode: 0o600, flag: 'wx' });
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
    return code === 'EEXIST'
      ? refuse('recorded-already', `the run already holds ${RUN_LAYOUT.executionChoice}: a run takes one choice`)
      : refuse('write', `the choice could not be written (${code})`);
  }
  return { ok: true, report: { command: 'allow-execution', outcome: 'recorded', run, choice, disclosures: DISCLOSURES } };
}

const CHOICE_KEYS = ['attribution', 'command', 'covers', 'declarations', 'declaredBy', 'format', 'label', 'notAnExecutionConsent', 'recordId', 'recordedAt', 'revision', 'runId'];
const DECLARATION_KEYS = ['ownerAttends', 'ownerStartedSession', 'ownersOwnHost'];

/** The choice recorded in a run directory, read strictly: exactly the fields `allowExecution` writes, with its fixed texts. Whether the
 * choice names this run and revision, and is dated before the brief, is the caller's check (`decideExecutionRule`). */
export function readExecutionChoice(runDir: string): Awaited<ReturnType<ExecutionChoiceSource['choiceFor']>> {
  const file = path.join(path.resolve(runDir), RUN_LAYOUT.executionChoice);
  let text: string;
  try {
    text = fs.readFileSync(file, 'utf8');
  } catch (cause) {
    const code = (cause as NodeJS.ErrnoException).code ?? 'unknown-error';
    return code === 'ENOENT' ? { state: 'absent', why: `no ${RUN_LAYOUT.executionChoice} in the run directory` } : { state: 'refused', why: `${RUN_LAYOUT.executionChoice} cannot be read (${code})` };
  }
  let value: unknown;
  try {
    value = parseBoundedJson(text, { maxBytes: 8192, maxNodes: 64, maxDepth: 3 });
  } catch {
    return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} is not one bounded JSON object` };
  }
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} is not a JSON object` };
  const record = value as Record<string, unknown>;
  if (Object.keys(record).sort().join(',') !== CHOICE_KEYS.join(',')) return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} does not carry exactly the fields allow-execution writes` };
  const declared = record['declarations'];
  if (declared === null || typeof declared !== 'object' || Array.isArray(declared) || Object.keys(declared).sort().join(',') !== DECLARATION_KEYS.join(',')
    || Object.values(declared).some((flag) => typeof flag !== 'boolean')) {
    return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} does not carry the three declarations` };
  }
  const fixed: [string, unknown][] = [['format', EXECUTION_CHOICE_FORMAT], ['command', 'allow-execution'], ['covers', EXECUTION_CHOICE_COVERS],
    ['declaredBy', 'operator'], ['label', 'Inferred'], ['attribution', CHOICE_ATTRIBUTION], ['notAnExecutionConsent', NOT_AN_EXECUTION_CONSENT]];
  const wrong = fixed.filter(([key, expected]) => record[key] !== expected).map(([key]) => key);
  if (wrong.length > 0) return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} carries other values in ${wrong.join(', ')}` };
  if (['recordId', 'runId', 'revision', 'recordedAt'].some((key) => typeof record[key] !== 'string')) return { state: 'refused', why: `${RUN_LAYOUT.executionChoice} carries a non-text identity field` };
  const flags = declared as Record<string, boolean>;
  return {
    state: 'ok',
    choice: {
      recordId: record['recordId'] as string, command: 'allow-execution', runId: record['runId'] as string, revision: record['revision'] as string,
      recordedAt: record['recordedAt'] as string,
      declarations: { ownerStartedSession: flags['ownerStartedSession']!, ownersOwnHost: flags['ownersOwnHost']!, ownerAttends: flags['ownerAttends']! },
    },
  };
}

/** The choice source `brief` reads: the run directory's own record, re-read on every call. */
export const RUN_DIRECTORY_CHOICES: ExecutionChoiceSource = { choiceFor: async (runDir) => readExecutionChoice(runDir) };
