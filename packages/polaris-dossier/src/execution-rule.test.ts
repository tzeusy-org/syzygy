import * as fs from 'node:fs';
import * as path from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';
import { readSec3, type Sec3Text } from './doctrine-quote.js';
import {
  PERMITTING_ARM_ENABLED, decideExecutionRule, executionRuleSection,
  type CredentialProbe, type ExecutionChoice, type ExecutionChoiceSource, type ExecutionInputs,
} from './execution-rule.js';

// syzygy-qkea.6 (S5): which execution rule a brief carries (REQ-polaris-generation-033). The permitting arm is off in this build; these
// tests switch it on with fixture ports standing in for S4 and refuse it for each missing condition. Expected texts are literals; the
// doctrine bytes are the live file's own lines, sliced here by number.

const REAL_ROOT = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '../../..');
const LIVE = fs.readFileSync(path.join(REAL_ROOT, '.syzygy/governance/doctrine/security.md'), 'utf8').split('\n');
const lines = (first: number, last: number): string => LIVE.slice(first - 1, last).join('\n');
const read = readSec3(REAL_ROOT);
if (!read.ok) throw new Error(read.reason);
const SEC3: Sec3Text = read.sec3;

const NOW = Date.UTC(2026, 9, 7, 12, 0, 0);
const RUN = `run-${'b'.repeat(32)}`;
const REV = '498ecd0d6d007db11ddb3aea9428552598a78622';
const CHOICE: ExecutionChoice = {
  recordId: 'choice-1', command: 'allow-execution', runId: RUN, revision: REV, recordedAt: '2026-10-07T11:59:00.000Z',
  declarations: { ownerStartedSession: true, ownersOwnHost: true, ownerAttends: true },
};
const choices = (choice: ExecutionChoice | null): ExecutionChoiceSource & { calls: number } => {
  const source = { calls: 0, choiceFor: async () => { source.calls++; return choice === null ? { state: 'absent' as const, why: 'no choice record' } : { state: 'ok' as const, choice }; } };
  return source;
};
const probe = (passed: boolean): CredentialProbe & { calls: number } => {
  const port = { calls: 0, probe: async () => { port.calls++; return passed ? { passed: true as const, checked: 2, source: 'fixture credential list' } : { passed: false as const, why: 'fixture credential readable' }; } };
  return port;
};
const inputs = (over: Partial<ExecutionInputs> = {}): ExecutionInputs => ({
  role: 'authoring', runDir: `/state/${RUN}`, runId: RUN, pinnedRevision: REV, operatorIsOwner: true, sec3: SEC3, now: NOW,
  d9: async () => ({ state: 'ok', record: 'D9-ACT' }),
  launched: () => 'absent',
  permitting: { enabled: true, choices: choices(CHOICE), probe: probe(true) },
  ...over,
});

const LAPSE = 'This permission lapses if the owner stops attending this session, including by leaving it under an automatic-approval or permission-bypass setting while away; once it lapses, run no further observed code.';
const SUBAGENTS = 'Work you hand to your own subagents stays part of this session and under this rule.';
const NO_LONG_LIVED = 'Start no process meant to outlive this session.';
const STOP_EVERY = 'Before this session ends, stop every process you started, including any you left running in the background, and say in your report that you did.';
const PERMISSION = 'You may build and run the observed project in the clone, from this authoring session only';
const SCOPE_ASK = 'For every command you run, also give in `executions` its `workingDirectory`, the absolute path you ran it in, and its `scope`: `within-scope` when it falls within what the owner\'s execution choice names';
const FLAGGED = 'Syzygy flags, beside the command and labelled Inferred, each one that reports no working directory, whose working directory lies outside the clone, or that you mark `outside-scope`. A flag refuses no step and hides no command';
const SEC3_RULE = 'So: do not build or run the observed project outside an explicit, opt-in execution profile.';

describe('the permitting arm is off in this build', () => {
  it('is disabled by the flag', () => {
    expect(PERMITTING_ARM_ENABLED).toBe(false);
  });

  it('gives SEC-3\'s rule with the reason, and never consults a choice or the probe', async () => {
    const source = choices(CHOICE), port = probe(true);
    const rule = await decideExecutionRule(inputs({ permitting: { enabled: false, choices: source, probe: port } }));
    expect(rule).toMatchObject({ arm: 'sec-3', notPermittedBecause: ['the permitting arm is not enabled in this build: it stays off until the execution choice (`syzygy dossier allow-execution`) and the adapter-credential probe (syzygy-qkea.5) are merged and the arm is switched on, so no brief may permit execution'] });
    expect([source.calls, port.calls]).toEqual([0, 0]);
  });

  it('never reads the launched marker when the arm is off or the brief is not the authoring brief', async () => {
    let reads = 0;
    const launched = (): 'absent' => { reads += 1; return 'absent'; };
    await decideExecutionRule(inputs({ launched, permitting: { enabled: false, choices: choices(CHOICE), probe: probe(true) } }));
    await decideExecutionRule(inputs({ launched, role: 'inventory' }));
    expect(reads).toBe(0);
    await decideExecutionRule(inputs({ launched }));
    expect(reads).toBe(1);
  });

  it('refuses an enabled arm with no ports', async () => {
    expect(await decideExecutionRule(inputs({ permitting: { enabled: true } }))).toMatchObject({ arm: 'sec-3', notPermittedBecause: ['the permitting arm is enabled without its choice source or credential probe'] });
  });
});

describe('the permitting arm, enabled with fixture ports', () => {
  it('permits when every condition holds, citing the choice and quoting D9\'s cost as adopted', async () => {
    const rule = await decideExecutionRule(inputs());
    expect(rule).toMatchObject({ arm: 'permitting', d9: 'D9-ACT', choice: CHOICE, choiceLabel: 'Inferred', probe: { checked: 2 } });
    if (rule.arm !== 'permitting') return;
    expect(rule.cost.text).toBe(lines(106, 112));
    const text = executionRuleSection(rule);
    for (const sentence of [PERMISSION, LAPSE, SUBAGENTS, NO_LONG_LIVED, STOP_EVERY, '`choice-1`']) expect(text).toContain(sentence);
    expect(text).toContain(`\`\`\`text\n${lines(106, 112)}\n\`\`\``);
    expect(text).not.toContain(SEC3_RULE);
  });

  it('asks, for every command, its working directory and whether it falls within the choice\'s scope, and says what is flagged (v1.1, N6)', async () => {
    const rule = await decideExecutionRule(inputs());
    const text = executionRuleSection(rule);
    expect(text).toContain(SCOPE_ASK);
    expect(text).toContain(`for run \`${RUN}\` and revision \`${REV}\``);
    expect(text).toContain(FLAGGED);
    for (const role of ['inventory', 'review'] as const) {
      const other = executionRuleSection(await decideExecutionRule(inputs({ role })));
      expect(other).not.toContain(SCOPE_ASK);
      expect(other).not.toContain('outside-scope');
    }
  });

  it.each<[string, Partial<ExecutionInputs>, string]>([
    ['D9 is not in force', { d9: async () => ({ state: 'absent', why: 'no act' }) }, 'D9 is not established in force: no act'],
    ['the operator is not the owner', { operatorIsOwner: false }, 'the run configuration does not declare the operator to be the owner'],
    ['no choice is recorded', { permitting: { enabled: true, choices: choices(null), probe: probe(true) } }, 'no execution choice is recorded for this run by allow-execution: no choice record'],
    ['the choice is from an earlier run', { permitting: { enabled: true, choices: choices({ ...CHOICE, runId: `run-${'c'.repeat(32)}` }), probe: probe(true) } }, `the execution choice choice-1 names run run-${'c'.repeat(32)}, not ${RUN}`],
    ['the choice is for another revision', { permitting: { enabled: true, choices: choices({ ...CHOICE, revision: 'f'.repeat(40) }), probe: probe(true) } }, `the execution choice choice-1 names revision ${'f'.repeat(40)}, not the pinned ${REV}`],
    ['the choice is dated after the brief', { permitting: { enabled: true, choices: choices({ ...CHOICE, recordedAt: '2026-10-07T12:00:01.000Z' }), probe: probe(true) } }, 'the execution choice choice-1 is dated after the brief'],
    ['the choice carries no readable instant', { permitting: { enabled: true, choices: choices({ ...CHOICE, recordedAt: 'yesterday' }), probe: probe(true) } }, 'the execution choice choice-1 carries no readable instant'],
    ['the owner did not start the session', { permitting: { enabled: true, choices: choices({ ...CHOICE, declarations: { ...CHOICE.declarations, ownerStartedSession: false } }), probe: probe(true) } }, 'the operator has not declared that the owner started the authoring session'],
    ['the session is not on the owner\'s host', { permitting: { enabled: true, choices: choices({ ...CHOICE, declarations: { ...CHOICE.declarations, ownersOwnHost: false } }), probe: probe(true) } }, 'the operator has not declared that the authoring session runs on the owner\'s own host'],
    ['the owner does not attend', { permitting: { enabled: true, choices: choices({ ...CHOICE, declarations: { ...CHOICE.declarations, ownerAttends: false } }), probe: probe(true) } }, 'the operator has not declared that the owner attends the authoring session'],
    ['the credential probe fails', { permitting: { enabled: true, choices: choices(CHOICE), probe: probe(false) } }, 'the adapter-credential probe did not pass: fixture credential readable'],
    ['the doctrine carries no cost bullet', { sec3: { ...SEC3, cost: null } }, 'SEC-3 in .syzygy/governance/doctrine/security.md carries no cost bullet for the permitted case, so the cost cannot be quoted'],
  ])('gives SEC-3\'s rule when %s', async (_name, over, reason) => {
    const rule = await decideExecutionRule(inputs(over));
    expect(rule.arm).toBe('sec-3');
    expect(rule.arm === 'sec-3' && rule.notPermittedBecause).toEqual([reason]);
  });

  it.each([['inventory'], ['review']] as const)('never permits in the %s brief, even when every condition holds', async (role) => {
    const rule = await decideExecutionRule(inputs({ role }));
    expect(rule).toMatchObject({ arm: 'sec-3', notPermittedBecause: [`only the authoring session's brief may carry the permission; this is the ${role} brief`] });
    expect(executionRuleSection(rule)).not.toContain(PERMISSION);
  });
});

describe('the SEC-3 arm\'s text', () => {
  it('quotes SEC-3\'s head as adopted, cites SEC-3 and states the agent-directed rule, with no invitation to execute', async () => {
    const rule = await decideExecutionRule(inputs({ permitting: { enabled: false } }));
    const text = executionRuleSection(rule);
    expect(text).toContain('## Execution rule: SEC-3\n');
    expect(text).toContain(`\`\`\`text\n${lines(74, 76)}\n\`\`\``);
    expect(text).toContain('`.syzygy/governance/doctrine/security.md`, lines 74–76');
    expect(text).toContain(SEC3_RULE);
    for (const sentence of [PERMISSION, LAPSE, 'What the permitted case costs']) expect(text).not.toContain(sentence);
    expect(text).toContain('list in `executions` every command you run');
  });
});
