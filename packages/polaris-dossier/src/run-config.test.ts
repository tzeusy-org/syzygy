import { describe, expect, it } from 'vitest';
import { parseRunConfig, poleLimitOf } from './run-config.js';

// REQ-polaris-generation-033, scenario "Run configuration incomplete or unbounded": every refusal arm,
// one input mutation per case against a configuration that is otherwise accepted.
const VALID = {
  operator: 'Tzeusy',
  agentTool: 'claude-code',
  agentToolVersion: '2.1.0',
  agentProvider: 'anthropic',
  model: 'claude-opus-5-5',
  deadline: 'PT2H',
  agentTokenBudget: 2_000_000,
  maxRepairCycles: 3,
  maxQuestions: 5,
  audience: 'a maintainer new to the project',
  operatorIsOwner: true,
};
const parse = (over: Record<string, unknown>, drop: readonly string[] = []): ReturnType<typeof parseRunConfig> => {
  const input: Record<string, unknown> = { ...VALID, ...over };
  for (const key of drop) delete input[key];
  return parseRunConfig(JSON.stringify(input));
};
const refusals = (result: ReturnType<typeof parseRunConfig>): string[] =>
  result.ok ? [] : result.refusals.map((refusal) => `${refusal.field ?? '-'}:${refusal.kind}`);

describe('run configuration (REQ-polaris-generation-033)', () => {
  it('accepts a complete, bounded configuration and keeps every declared value', () => {
    const result = parse({ modelVersion: '20261001', agentTurnBudget: 400 });
    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.config).toEqual({
      operator: 'Tzeusy', agentTool: 'claude-code', agentToolVersion: '2.1.0', agentProvider: 'anthropic',
      model: 'claude-opus-5-5', modelVersion: '20261001', deadline: { declared: 'PT2H', seconds: 7200 },
      agentTokenBudget: 2_000_000, agentTurnBudget: 400, maxRepairCycles: 3, maxQuestions: 5,
      audience: 'a maintainer new to the project', operatorIsOwner: true, poleLimit: null,
    });
  });

  // Dossier spec v1.5: the Pole limit is optional, five when undeclared, and a declared one is a positive integer.
  it('takes an undeclared Pole limit as five and keeps a declared one', () => {
    const undeclared = parse({});
    expect(undeclared.ok && undeclared.config.poleLimit).toBe(null);
    expect(undeclared.ok && poleLimitOf(undeclared.config)).toBe(5);
    const declared = parse({ poleLimit: 3 });
    expect(declared.ok && poleLimitOf(declared.config)).toBe(3);
    expect(parse({ poleLimit: 1 }).ok).toBe(true);
  });

  it.each([[0, 'poleLimit:zero'], [-2, 'poleLimit:negative'], [2.5, 'poleLimit:non-integer'], ['five', 'poleLimit:wrong-type'], [null, 'poleLimit:unlimited']])(
    'refuses a Pole limit of %j (dossier spec v1.5, "Invalid Pole limit")', (value, expected) => {
      expect(refusals(parse({ poleLimit: value }))).toEqual([expected]);
    });

  it('allows 0 for the repair-cycle and question limits', () => {
    const result = parse({ maxRepairCycles: 0, maxQuestions: 0 });
    expect(result.ok).toBe(true);
  });

  it('accepts a turn budget alone and a token budget alone', () => {
    expect(parse({ agentTurnBudget: 50 }, ['agentTokenBudget']).ok).toBe(true);
    expect(parse({}).ok).toBe(true);
  });

  it('records an absent model version as null, never a guess', () => {
    const result = parse({});
    expect(result.ok && result.config.modelVersion).toBe(null);
  });

  it.each([
    ['deadline', 'deadline:missing'],
    ['maxRepairCycles', 'maxRepairCycles:missing'],
    ['maxQuestions', 'maxQuestions:missing'],
    ['operator', 'operator:missing'],
    ['agentTool', 'agentTool:missing'],
    ['agentToolVersion', 'agentToolVersion:missing'],
    ['agentProvider', 'agentProvider:missing'],
    ['model', 'model:missing'],
    ['audience', 'audience:missing'],
    ['operatorIsOwner', 'operatorIsOwner:missing'],
  ])('refuses a configuration missing %s: there is no default', (field, expected) => {
    expect(refusals(parse({}, [field]))).toEqual([expected]);
  });

  it('refuses a configuration with neither a token nor a turn budget', () => {
    expect(refusals(parse({}, ['agentTokenBudget']))).toEqual(['-:no-budget']);
  });

  it.each([
    ['maxRepairCycles', null], ['maxQuestions', 'unlimited'], ['agentTokenBudget', 'Infinity'],
    ['agentTurnBudget', 'none'], ['deadline', null], ['deadline', 'unlimited'],
  ])('refuses an unlimited %s (%j)', (field, value) => {
    expect(refusals(parse({ [field]: value }))).toEqual([`${field}:unlimited`]);
  });

  it.each([
    ['maxRepairCycles', -1], ['maxQuestions', -3], ['agentTokenBudget', -100], ['agentTurnBudget', -1], ['deadline', '-PT1H'],
  ])('refuses a negative %s (%j)', (field, value) => {
    expect(refusals(parse({ [field]: value }))).toEqual([`${field}:negative`]);
  });

  it.each([
    ['maxRepairCycles', 1.5], ['maxQuestions', 0.1], ['agentTokenBudget', 1000.25], ['agentTurnBudget', 2.5],
    ['agentTokenBudget', 9_007_199_254_740_992], ['deadline', 'PT1.5H'],
  ])('refuses a non-integer %s (%j)', (field, value) => {
    expect(refusals(parse({ [field]: value }))).toEqual([`${field}:non-integer`]);
  });

  it.each([
    ['agentTokenBudget', 0], ['agentTurnBudget', 0], ['deadline', 'PT0S'], ['deadline', 'P0D'],
  ])('refuses zero for %s (%j)', (field, value) => {
    expect(refusals(parse({ [field]: value }))).toEqual([`${field}:zero`]);
  });

  it.each([['P1Y'], ['P1M'], ['P1Y2M']])('refuses a calendar-dependent deadline (%s)', (deadline) => {
    expect(refusals(parse({ deadline }))).toEqual(['deadline:calendar-unit']);
  });

  it.each([['2 hours'], ['P'], ['PT'], ['P1DT'], ['PT1X'], [7200]])('refuses a deadline that is not an ISO-8601 duration (%j)', (deadline) => {
    expect(refusals(parse({ deadline }))).toEqual(['deadline:not-a-duration']);
  });

  it.each([
    ['P1W', 604_800], ['P2D', 172_800], ['PT90M', 5_400], ['P1DT2H3M4S', 93_784], ['PT45S', 45],
  ])('measures the deadline %s as %d seconds', (deadline, seconds) => {
    const result = parse({ deadline });
    expect(result.ok && result.config.deadline).toEqual({ declared: deadline, seconds });
  });

  it.each([
    ['maxRepairCycles', '3'], ['agentTokenBudget', true], ['operatorIsOwner', 'yes'], ['operator', 42], ['modelVersion', null],
  ])('refuses a wrongly typed %s (%j)', (field, value) => {
    expect(refusals(parse({ [field]: value }))).toEqual([`${field}:wrong-type`]);
  });

  it.each([['operator'], ['model'], ['audience'], ['agentToolVersion']])('refuses an empty %s', (field) => {
    expect(refusals(parse({ [field]: '  ' }))).toEqual([`${field}:empty`]);
  });

  it('refuses an agent tool other than Claude Code or Codex', () => {
    expect(refusals(parse({ agentTool: 'cursor' }))).toEqual(['agentTool:unknown-agent-tool']);
  });

  it('refuses an execution choice in the configuration: only allow-execution records it', () => {
    const result = parse({ executionChoice: 'allow' });
    expect(refusals(result)).toEqual(['executionChoice:execution-choice-in-config']);
    expect(!result.ok && result.refusals[0]!.detail).toContain('syzygy dossier allow-execution');
  });

  it('refuses a field the configuration does not define', () => {
    expect(refusals(parse({ defaultLimits: true }))).toEqual(['defaultLimits:unknown-field']);
  });

  it('reports every refusal, not only the first', () => {
    expect(refusals(parse({ maxRepairCycles: -1, agentTokenBudget: 0 }, ['deadline']))).toEqual([
      'deadline:missing', 'agentTokenBudget:zero', 'maxRepairCycles:negative',
    ]);
  });

  it.each([
    ['not json', '{deadline:'], ['two documents', '{} {}'], ['an array', '[]'], ['a duplicate key', '{"maxQuestions":1,"maxQuestions":2}'],
  ])('refuses %s as a whole document', (_label, text) => {
    const result = parseRunConfig(text);
    expect(result.ok).toBe(false);
    expect(!result.ok && result.refusals.map((refusal) => refusal.kind)).toEqual([text === '[]' ? 'not-an-object' : 'unreadable-json']);
  });
});
