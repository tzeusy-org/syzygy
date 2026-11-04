import * as fs from 'node:fs';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import {
  AUTHOR_SELF_CHECK, DEFAULT_REPAIR_CYCLES, LAUNCHED_GUIDANCE, OWNER_LINE, POLARIS_USAGE, authorPrompt, cycleBreakdown, endScreen,
  sessionClaudeArgs,
} from './polaris.js';

// syzygy-1z8m.1 and syzygy-1z8m.2: what the 2026-11-04 Redis run taught the launched run. Expected values are literals.

describe('the repair-cycle default of a launched run', () => {
  it('is six, in the usage text and in the parsed default', () => {
    expect(DEFAULT_REPAIR_CYCLES).toBe(6);
    expect(POLARIS_USAGE).toContain('  --repair-cycles <n>      default 6      --questions <n>  default 3\n');
  });
});

describe('the authoring prompt', () => {
  const prompt = authorPrompt('run-abc', '/state/run-abc');
  it('says a refused check costs a repair cycle and asks for the four self-checks before every check', () => {
    expect(prompt).toContain('repair every finding and check again until it passes. Each draft revision after the first counts against the run\'s repair-cycle limit, including one that check refuses');
    expect(AUTHOR_SELF_CHECK).toContain('every cited path exists in the clone at the pinned revision;');
    expect(AUTHOR_SELF_CHECK).toContain('every quotation is copied character for character from the file it cites;');
    expect(AUTHOR_SELF_CHECK).toContain('every identifier the draft refers to is defined in the draft;');
    expect(AUTHOR_SELF_CHECK).toContain('every path in discovery exists in the clone.');
  });
  it('addresses the operator only with the brief\'s clarification questions', () => {
    expect(prompt).toContain('Address the operator only with the clarification questions the brief allows; never ask the operator to run, start or tell anything.');
  });
});

describe('the launched-run guidance of the waiting sessions', () => {
  it('tells the inventory that an early refusal is expected and Syzygy will say when to resubmit', () => {
    expect(LAUNCHED_GUIDANCE.inventory).toContain('Each inventory revision after the first counts against the run\'s repair-cycle limit, so before every submission verify it yourself: every path it names exists in the clone at the pinned revision, and every quotation is copied character for character from the file it cites.');
    expect(LAUNCHED_GUIDANCE.inventory).toContain('If Syzygy refuses it because no draft revision is frozen yet, that is expected and nothing is wrong: wait, without asking the operator for anything.');
    expect(LAUNCHED_GUIDANCE.inventory).toContain('Syzygy types a message here when the authoring session freezes a draft; then resubmit with the same command.');
  });
  it('asks each reviewer to check its verdict\'s identifiers and consistency before submitting', () => {
    for (const kind of ['fidelity', 'design'] as const) {
      expect(LAUNCHED_GUIDANCE[kind]).toContain('check that every identifier it names appears in the packet and that its rows agree with the readiness it declares');
      expect(LAUNCHED_GUIDANCE[kind]).toContain('Never ask the operator to run, start or tell anything.');
    }
  });
  it('is appended to each waiting session\'s system prompt, and never to the author\'s', () => {
    const state = { model: 'm', authorSkipPermissions: false, run: '/r', clone: '/c' };
    for (const role of ['inventory', 'fidelity', 'design'] as const) {
      const args = sessionClaudeArgs({ role, prompt: 'p', allowedTools: null }, state);
      const at = args.indexOf('--append-system-prompt');
      expect(at).toBeGreaterThan(0);
      expect(args[at + 1]).toBe(LAUNCHED_GUIDANCE[role]);
    }
    expect(sessionClaudeArgs({ role: 'author', prompt: 'p', allowedTools: null }, state)).not.toContain('--append-system-prompt');
  });
});

describe('the run view', () => {
  it('tells the operator the supervisor window is the only one they need', () => {
    expect(OWNER_LINE).toBe('you       this is the only window you need; the author may ask you a question in its window (C-b n), and nothing else waits for you');
  });

  const runWith = (records: Record<string, string>): string => {
    const run = tempDir('polaris-launch-guidance-');
    fs.mkdirSync(path.join(run, 'checks'), { recursive: true });
    for (const [name, outcome] of Object.entries(records)) fs.writeFileSync(path.join(run, 'checks', name), JSON.stringify({ outcome }));
    return run;
  };

  it('splits the spent repair revisions into refused and passed drafts, leaving out the first draft', () => {
    // The Redis run of 2026-11-04: rev-0 findings, rev-1 passed, rev-2 findings, rev-3 passed.
    const run = runWith({ 'rev-0.json': 'findings', 'rev-1.json': 'passed', 'rev-2.json': 'findings', 'rev-3.json': 'passed' });
    expect(cycleBreakdown(run)).toBe(' (1 on drafts check refused, 2 on drafts that passed check)');
  });
  it('counts an unreadable check record as refused, and says nothing when no repair revision exists', () => {
    const run = runWith({ 'rev-0.json': 'passed', 'rev-1.json': 'passed' });
    fs.writeFileSync(path.join(run, 'checks', 'rev-2.json'), '{');
    expect(cycleBreakdown(run)).toBe(' (1 on drafts check refused, 1 on drafts that passed check)');
    expect(cycleBreakdown(runWith({ 'rev-0.json': 'findings' }))).toBe('');
    expect(cycleBreakdown(path.join(tempDir('polaris-launch-guidance-'), 'absent'))).toBe('');
  });
  it('ends an unclosed run with the close command, and a closed run without it', () => {
    const open = endScreen('run-x', '/state/run-x', 'blocked', false);
    expect(open[open.length - 1]).toMatch(/^record close the run before its deadline to write its Execution Record: node \S+\/apps\/syzygy\/dist\/main\.js dossier close \/state\/run-x$/);
    expect(endScreen('run-x', '/state/run-x', 'closed', true)).toEqual(['run    run-x', 'result closed', 'Every session has ended. This window stays open; close it with C-b &.']);
  });
});
