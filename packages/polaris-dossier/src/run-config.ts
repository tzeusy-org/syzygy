import { BoundedJsonError, parseBoundedJson } from '@syzygy/polaris-generation-core/live';

/** The run configuration of an operator-agent dossier run (REQ-polaris-generation-033).
 *
 * Every value is the operator's declaration, conveyed by the agent session: Syzygy observes none of
 * them, so each is recorded as operator-declared and labelled Inferred. There is no default: a missing
 * limit refuses, and so does an unlimited, negative or non-integer one, or zero for the deadline or a
 * stated token or turn budget. The repair-cycle and question limits may be 0. The owner's execution
 * choice is never a configuration value; only `allow-execution`, run by the operator, records it. */

export const AGENT_TOOLS = Object.freeze(['claude-code', 'codex'] as const);
export type AgentTool = (typeof AGENT_TOOLS)[number];

export interface RunConfig {
  readonly operator: string;
  readonly agentTool: AgentTool;
  readonly agentToolVersion: string;
  readonly agentProvider: string;
  readonly model: string;
  /** Absent where the agent tool shows no model version. */
  readonly modelVersion: string | null;
  /** The ISO-8601 duration as declared, and its length in seconds. */
  readonly deadline: { readonly declared: string; readonly seconds: number };
  readonly agentTokenBudget: number | null;
  readonly agentTurnBudget: number | null;
  readonly maxRepairCycles: number;
  readonly maxQuestions: number;
  readonly audience: string;
  readonly operatorIsOwner: boolean;
  /** The most Poles a schema-v4 draft may declare (dossier spec v1.5), as declared; null when the operator declared none, and the
   * limit is then `DEFAULT_POLE_LIMIT`. Kept apart from the default so an undeclared limit is never written into run.json. */
  readonly poleLimit: number | null;
}

/** The Pole limit when the run declares none (dossier spec v1.5: "Unlike the run limits above, the Pole limit has a default, five"). */
export const DEFAULT_POLE_LIMIT = 5;

/** The Pole limit in force for a run. */
export const poleLimitOf = (config: Pick<RunConfig, 'poleLimit'>): number => config.poleLimit ?? DEFAULT_POLE_LIMIT;

export type RunConfigRefusalKind =
  | 'unreadable-json' | 'not-an-object' | 'unknown-field' | 'execution-choice-in-config'
  | 'missing' | 'empty' | 'wrong-type' | 'unknown-agent-tool'
  | 'unlimited' | 'negative' | 'non-integer' | 'zero' | 'no-budget'
  | 'not-a-duration' | 'calendar-unit';

export interface RunConfigRefusal {
  readonly kind: RunConfigRefusalKind;
  /** The field the refusal names; absent for whole-document refusals. */
  readonly field?: string;
  readonly detail: string;
}

export type RunConfigResult =
  | { readonly ok: true; readonly config: RunConfig }
  | { readonly ok: false; readonly refusals: readonly RunConfigRefusal[] };

/** Bounds for the configuration document: it is small, flat operator input. */
export const RUN_CONFIG_JSON_LIMITS = Object.freeze({ maxBytes: 16_384, maxNodes: 64, maxDepth: 2 });

const STRING_FIELDS = ['operator', 'agentToolVersion', 'agentProvider', 'model', 'audience'] as const;
const KNOWN_FIELDS: ReadonlySet<string> = new Set([
  ...STRING_FIELDS, 'agentTool', 'modelVersion', 'deadline', 'agentTokenBudget', 'agentTurnBudget',
  'maxRepairCycles', 'maxQuestions', 'operatorIsOwner', 'poleLimit',
]);
/** Words an operator might write for "no limit". Each is refused as unlimited, never read as a number. */
const UNLIMITED_WORDS: ReadonlySet<string> = new Set(['unlimited', 'infinite', 'infinity', 'none', 'no limit', 'nolimit', 'inf', '∞']);

/** Parse and validate the configuration text. Every refusal is reported, not only the first. */
export function parseRunConfig(text: string): RunConfigResult {
  let document: unknown;
  try {
    document = parseBoundedJson(text, RUN_CONFIG_JSON_LIMITS);
  } catch (cause) {
    const code = cause instanceof BoundedJsonError ? cause.code : 'invalid-json';
    return { ok: false, refusals: [{ kind: 'unreadable-json', detail: `the configuration is not one bounded JSON object (${code})` }] };
  }
  return validateRunConfig(document);
}

export function validateRunConfig(document: unknown): RunConfigResult {
  if (document === null || typeof document !== 'object' || Array.isArray(document)) {
    return { ok: false, refusals: [{ kind: 'not-an-object', detail: 'the configuration must be one JSON object' }] };
  }
  const fields = document as Readonly<Record<string, unknown>>;
  const refusals: RunConfigRefusal[] = [];
  const refuse = (kind: RunConfigRefusalKind, field: string, detail: string): void => { refusals.push({ kind, field, detail }); };

  for (const key of Object.keys(fields).sort()) {
    if (key === 'executionChoice') {
      refuse('execution-choice-in-config', key,
        'the execution choice is never a configuration value; only `syzygy dossier allow-execution`, run by the operator, records it');
    } else if (!KNOWN_FIELDS.has(key)) {
      refuse('unknown-field', key, `\`${key}\` is not a run-configuration field`);
    }
  }

  const strings: Partial<Record<(typeof STRING_FIELDS)[number], string>> = {};
  for (const field of STRING_FIELDS) {
    const value = text(fields, field, refuse);
    if (value !== undefined) strings[field] = value;
  }

  let agentTool: AgentTool | undefined;
  const toolText = text(fields, 'agentTool', refuse);
  if (toolText !== undefined) {
    if ((AGENT_TOOLS as readonly string[]).includes(toolText)) agentTool = toolText as AgentTool;
    else refuse('unknown-agent-tool', 'agentTool', `agentTool must be one of ${AGENT_TOOLS.join(', ')}`);
  }

  let modelVersion: string | null = null;
  if (Object.hasOwn(fields, 'modelVersion')) {
    const value = text(fields, 'modelVersion', refuse);
    if (value !== undefined) modelVersion = value;
  }

  const deadline = duration(fields, refuse);
  const agentTokenBudget = limit(fields, 'agentTokenBudget', { optional: true, zeroAllowed: false }, refuse);
  const agentTurnBudget = limit(fields, 'agentTurnBudget', { optional: true, zeroAllowed: false }, refuse);
  if (!Object.hasOwn(fields, 'agentTokenBudget') && !Object.hasOwn(fields, 'agentTurnBudget')) {
    refusals.push({ kind: 'no-budget', detail: 'at least one of agentTokenBudget or agentTurnBudget must be declared' });
  }
  const maxRepairCycles = limit(fields, 'maxRepairCycles', { optional: false, zeroAllowed: true }, refuse);
  const maxQuestions = limit(fields, 'maxQuestions', { optional: false, zeroAllowed: true }, refuse);
  // A declared Pole limit is a positive integer; zero, a negative number and a non-integer are refused (v1.5 "Invalid Pole limit").
  const poleLimit = limit(fields, 'poleLimit', { optional: true, zeroAllowed: false }, refuse);

  let operatorIsOwner: boolean | undefined;
  if (!Object.hasOwn(fields, 'operatorIsOwner')) refuse('missing', 'operatorIsOwner', 'operatorIsOwner must be declared');
  else if (typeof fields['operatorIsOwner'] !== 'boolean') refuse('wrong-type', 'operatorIsOwner', 'operatorIsOwner must be true or false');
  else operatorIsOwner = fields['operatorIsOwner'];

  if (refusals.length > 0) return { ok: false, refusals };
  return {
    ok: true,
    config: Object.freeze({
      operator: strings.operator!, agentTool: agentTool!, agentToolVersion: strings.agentToolVersion!,
      agentProvider: strings.agentProvider!, model: strings.model!, modelVersion, deadline: deadline!,
      agentTokenBudget: agentTokenBudget ?? null, agentTurnBudget: agentTurnBudget ?? null,
      maxRepairCycles: maxRepairCycles!, maxQuestions: maxQuestions!, audience: strings.audience!,
      operatorIsOwner: operatorIsOwner!, poleLimit: poleLimit ?? null,
    }),
  };
}

type Refuse = (kind: RunConfigRefusalKind, field: string, detail: string) => void;

function text(fields: Readonly<Record<string, unknown>>, field: string, refuse: Refuse): string | undefined {
  if (!Object.hasOwn(fields, field)) { refuse('missing', field, `${field} must be declared`); return undefined; }
  const value = fields[field];
  if (typeof value !== 'string') { refuse('wrong-type', field, `${field} must be a string`); return undefined; }
  if (value.trim() === '') { refuse('empty', field, `${field} must not be empty`); return undefined; }
  return value;
}

/** A limit: an integer, never unlimited or negative; zero only where the requirement allows it. */
function limit(fields: Readonly<Record<string, unknown>>, field: string,
  rule: { readonly optional: boolean; readonly zeroAllowed: boolean }, refuse: Refuse): number | undefined {
  if (!Object.hasOwn(fields, field)) {
    if (!rule.optional) refuse('missing', field, `${field} must be declared; there is no default`);
    return undefined;
  }
  const value = fields[field];
  if (value === null || (typeof value === 'string' && UNLIMITED_WORDS.has(value.trim().toLowerCase()))) {
    refuse('unlimited', field, `${field} must be a finite limit; an unlimited value is refused`);
    return undefined;
  }
  if (typeof value !== 'number') { refuse('wrong-type', field, `${field} must be a number`); return undefined; }
  if (value < 0) { refuse('negative', field, `${field} must not be negative`); return undefined; }
  if (!Number.isSafeInteger(value)) { refuse('non-integer', field, `${field} must be an integer`); return undefined; }
  if (value === 0 && !rule.zeroAllowed) { refuse('zero', field, `${field} must be positive when it is stated`); return undefined; }
  return value;
}

const DURATION = /^P(?:(\d+)W)?(?:(\d+)D)?(?:T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?)?$/;
const CALENDAR_DURATION = /^P(?:\d+Y)?(?:\d+M)?(?:\d+W)?(?:\d+D)?(?:T(?:\d+H)?(?:\d+M)?(?:\d+S)?)?$/;

/** The deadline: an ISO-8601 duration of whole weeks, days, hours, minutes and seconds, positive.
 * Years and months are refused: their length depends on the calendar, and the deadline is measured
 * on Syzygy's clock from the issue of the brief. */
function duration(fields: Readonly<Record<string, unknown>>, refuse: Refuse): RunConfig['deadline'] | undefined {
  if (!Object.hasOwn(fields, 'deadline')) { refuse('missing', 'deadline', 'deadline must be declared; there is no default'); return undefined; }
  const value = fields['deadline'];
  if (value === null || (typeof value === 'string' && UNLIMITED_WORDS.has(value.trim().toLowerCase()))) {
    refuse('unlimited', 'deadline', 'deadline must be a finite duration; an unlimited value is refused');
    return undefined;
  }
  if (typeof value === 'number') {
    refuse(value < 0 ? 'negative' : 'not-a-duration', 'deadline', 'deadline must be an ISO-8601 duration such as `PT2H`');
    return undefined;
  }
  if (typeof value !== 'string') { refuse('wrong-type', 'deadline', 'deadline must be an ISO-8601 duration string'); return undefined; }
  if (value.startsWith('-')) { refuse('negative', 'deadline', 'deadline must not be negative'); return undefined; }
  if (/[.,]/.test(value)) { refuse('non-integer', 'deadline', 'deadline components must be whole numbers'); return undefined; }
  const match = DURATION.exec(value);
  if (match === null || value === 'P' || value.endsWith('T')) {
    if (value !== 'P' && !value.endsWith('T') && CALENDAR_DURATION.test(value)) {
      refuse('calendar-unit', 'deadline', 'deadline may not use years or months; state weeks, days, hours, minutes or seconds');
    } else {
      refuse('not-a-duration', 'deadline', 'deadline must be an ISO-8601 duration such as `PT2H`');
    }
    return undefined;
  }
  const [weeks, days, hours, minutes, seconds] = match.slice(1).map((part) => (part === undefined ? 0 : Number(part)));
  const total = weeks! * 604_800 + days! * 86_400 + hours! * 3_600 + minutes! * 60 + seconds!;
  if (!Number.isSafeInteger(total)) { refuse('not-a-duration', 'deadline', 'deadline is too long to measure'); return undefined; }
  if (total === 0) { refuse('zero', 'deadline', 'deadline must be positive'); return undefined; }
  return Object.freeze({ declared: value, seconds: total });
}
