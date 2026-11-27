import * as fs from 'node:fs';
import * as path from 'node:path';
import { beforeEach, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { writeLaunchedMarker } from './launched.js';
import { costLine, grouped, isSessionUsage, sessionUsage, spanWords } from './session-usage.js';

// REQ-polaris-generation-033 version 2.39 (syzygy-5dhm.26): per-session usage read from the agent tool's own transcripts in each launched
// session's private home, a run total and the one cost line. Every expected figure below is a literal fixed before the code ran.

type Doc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
const CANARY = 'transcript-body-canary-7f3a';
const BASIS = 'read by Syzygy from the agent tool\'s own transcripts in the private home Syzygy gave each session it launched; each session can write its home, so every figure is Inferred and none is a provider receipt';
const HEAD = { format: 'polaris-dossier-session-usage/1', basis: BASIS, money: { label: 'Unknown', why: 'no-price-receipt' } };

const usage = (input: number, output: number, cacheCreation: number, cacheRead: number): Doc =>
  ({ input_tokens: input, output_tokens: output, cache_creation_input_tokens: cacheCreation, cache_read_input_tokens: cacheRead, service_tier: 'standard' });
const assistant = (id: string, at: string, counts: Doc | undefined, extra: Doc = {}): string => JSON.stringify({
  type: 'assistant', timestamp: at, sessionId: 'a-session', cwd: `/home/${CANARY}`,
  message: { id, model: 'claude-opus-5-5', role: 'assistant', content: [{ type: 'text', text: CANARY }], ...(counts === undefined ? {} : { usage: counts }), ...extra },
});
const user = (at: string): string => JSON.stringify({ type: 'user', timestamp: at, message: { role: 'user', content: CANARY } });
const lines = (...rows: string[]): string => `${rows.join('\n')}\n`;

let run: string;
const home = (role: string): string => path.join(`${run}.agents`, role, '.claude', 'projects', '-work');
function transcript(role: string, name: string, text: string): string {
  const file = path.join(home(role), name);
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, text);
  return file;
}

/** Four launched sessions with literal figures (see each role's comment). */
function fixture(): void {
  writeLaunchedMarker(run, path.basename(run), Date.parse('2026-11-27T09:00:00.000Z'));
  // author: A twice (one line per content block), B, a synthetic notice, and C in a subagent transcript; 09:59:00 to 10:30:00.
  transcript('author', 'main.jsonl', lines(
    user('2026-11-27T09:59:00.000Z'),
    assistant('msg_A', '2026-11-27T10:00:00.000Z', usage(10, 200, 1000, 5000)),
    assistant('msg_A', '2026-11-27T10:00:05.000Z', usage(10, 200, 1000, 5000)),
    assistant('msg_B', '2026-11-27T10:30:00.000Z', usage(3, 50, 0, 6000)),
    JSON.stringify({ type: 'assistant', timestamp: '2026-11-27T10:20:00.000Z', message: { id: 'synthetic-1', model: '<synthetic>', usage: usage(0, 0, 0, 0) } }),
  ));
  transcript('author', 'main/subagents/agent-1.jsonl', lines(assistant('msg_C', '2026-11-27T10:10:00.000Z', usage(7, 20, 300, 0))));
  // inventory: 10 tokens, 10:50:00 to 11:00:00.
  transcript('inventory', 'i.jsonl', lines(user('2026-11-27T10:50:00.000Z'), assistant('msg_I', '2026-11-27T11:00:00.000Z', usage(1, 2, 3, 4))));
  // fidelity: 400 tokens at one instant.
  transcript('fidelity', 'f.jsonl', lines(assistant('msg_F', '2026-11-27T11:30:00.000Z', usage(100, 100, 100, 100))));
  // design: 20 tokens, then a last line the tool is still writing.
  transcript('design', 'd.jsonl', `${assistant('msg_D', '2026-11-27T11:45:00.000Z', usage(5, 5, 5, 5))}\n{"type":"assist`);
}

const counted = (value: number): Doc => ({ state: 'counted', value });
const tokens = (input: number, output: number, cacheCreation: number, cacheRead: number, total: number): Doc =>
  ({ input: counted(input), output: counted(output), cacheCreation: counted(cacheCreation), cacheRead: counted(cacheRead), total: counted(total) });
const AUTHOR = { role: 'author', label: 'Inferred', transcripts: 2, responses: 3, tokens: tokens(20, 270, 1300, 11000, 12590), spanMs: { state: 'measured', ms: 1_860_000 } };
const INVENTORY = { role: 'inventory', label: 'Inferred', transcripts: 1, responses: 1, tokens: tokens(1, 2, 3, 4, 10), spanMs: { state: 'measured', ms: 600_000 } };
const FIDELITY = { role: 'fidelity', label: 'Inferred', transcripts: 1, responses: 1, tokens: tokens(100, 100, 100, 100, 400), spanMs: { state: 'measured', ms: 0 } };
const DESIGN = { role: 'design', label: 'Inferred', transcripts: 1, responses: 1, tokens: tokens(5, 5, 5, 5, 20), spanMs: { state: 'measured', ms: 0 } };
const COST = 'Cost: 13,020 tokens over 4 sessions (input 126; output 377; cache writes 1,408; cache reads 11,109), 6 model responses, 1 h 46 min from the first to the last transcript entry, money Unknown (no price receipt); read by Syzygy from each session\'s own transcript, which that session can write; not a provider receipt.';

beforeEach(() => {
  const state = tempDir('dossier-session-usage-');
  run = path.join(state, 'run-20261127-abc');
  fs.mkdirSync(run);
});

describe('session usage (REQ-polaris-generation-033 v2.39)', () => {
  it('reads each launched session\'s literal figures, a run total and the cost line, copying no text', () => {
    fixture();
    const read = sessionUsage(run);
    expect(read).toEqual({
      ...HEAD, label: 'Inferred', sessions: [AUTHOR, INVENTORY, FIDELITY, DESIGN],
      total: { responses: counted(6), tokens: tokens(126, 377, 1408, 11109, 13020), spanMs: { state: 'measured', ms: 6_360_000 } },
    });
    expect(costLine(read)).toEqual({ label: 'Inferred', text: COST });
    expect(isSessionUsage(JSON.parse(JSON.stringify(read)))).toBe(true);
    const text = JSON.stringify(read);
    for (const leaked of [CANARY, 'msg_A', 'a-session', '2026-11-27', '-work', 'claude-opus']) expect(text).not.toContain(leaked);
  });

  it('is Unknown as a whole for a run the operator started, even beside a home that holds transcripts', () => {
    fixture();
    fs.rmSync(path.join(run, 'launched.json'));
    const read = sessionUsage(run);
    expect(read).toEqual({ ...HEAD, label: 'Unknown', why: 'operator-started' });
    expect(costLine(read)).toEqual({ label: 'Unknown', text: 'Cost: Unknown. Syzygy did not start this run\'s sessions, so it reads no usage of theirs; money Unknown (no price receipt).' });
    fs.writeFileSync(path.join(run, 'launched.json'), '{"format":"something-else"}');
    expect(sessionUsage(run)).toEqual({ ...HEAD, label: 'Unknown', why: 'launched-marker-unreadable' });
  });

  it('makes a session without a home Unknown, and with it every run total, naming the session in the cost line', () => {
    fixture();
    fs.rmSync(path.join(`${run}.agents`, 'design'), { recursive: true });
    const read = sessionUsage(run);
    const unknown = { state: 'unknown', why: 'session-unknown' };
    expect(read).toMatchObject({
      label: 'Inferred', sessions: [AUTHOR, INVENTORY, FIDELITY, { role: 'design', label: 'Unknown', why: 'no-agent-home' }],
      total: { responses: unknown, tokens: { input: unknown, output: unknown, cacheCreation: unknown, cacheRead: unknown, total: unknown }, spanMs: unknown },
    });
    expect(costLine(read)).toEqual({
      label: 'Unknown',
      text: 'Cost: run total Unknown (design: no private home); known: author 12,590 tokens, inventory 10 tokens, fidelity 400 tokens; money Unknown (no price receipt); read by Syzygy from each session\'s own transcript, which that session can write; not a provider receipt.',
    });
  });

  it('gives each unreadable session its own fixed reason', () => {
    const cases: [string, () => void, string][] = [
      ['no-transcript', () => fs.rmSync(home('fidelity'), { recursive: true }), 'no-transcript'],
      ['malformed', () => transcript('fidelity', 'f.jsonl', lines('{"type":', assistant('msg_F', '2026-11-27T11:30:00.000Z', usage(1, 1, 1, 1)))), 'transcript-malformed-line'],
      ['not-an-object', () => transcript('fidelity', 'f.jsonl', lines('[1]')), 'transcript-malformed-line'],
      ['no-id', () => transcript('fidelity', 'f.jsonl', lines(assistant('', '2026-11-27T11:30:00.000Z', usage(1, 1, 1, 1)))), 'response-without-identity'],
      ['no-usage', () => transcript('fidelity', 'f.jsonl', lines(assistant('msg_F', '2026-11-27T11:30:00.000Z', undefined))), 'response-without-usage'],
      ['link', () => fs.symlinkSync('/etc/hostname', path.join(home('fidelity'), 'elsewhere.jsonl')), 'link-or-special-entry'],
      ['linked-projects', () => { const projects = path.dirname(home('fidelity')); fs.renameSync(projects, `${projects}.real`); fs.symlinkSync(`${projects}.real`, projects); }, 'link-or-special-entry'],
      ['too-deep', () => transcript('fidelity', 'a/b/c/d/e/deep.jsonl', lines()), 'too-many-transcripts'],
      ['too-many', () => { for (let i = 0; i < 256; i++) transcript('fidelity', `n-${String(i).padStart(3, '0')}.jsonl`, ''); }, 'too-many-transcripts'],
    ];
    for (const [name, mutate, why] of cases) {
      fs.rmSync(`${run}.agents`, { recursive: true, force: true });
      fs.rmSync(path.join(run, 'launched.json'), { force: true });
      fixture();
      mutate();
      const read = sessionUsage(run) as Doc;
      expect([name, read.sessions[2]]).toEqual([name, { role: 'fidelity', label: 'Unknown', why }]);
      expect([name, read.sessions[0]]).toEqual([name, AUTHOR]);
    }
  });

  it('keeps a token kind the transcript does not give Unknown, and the totals that rest on it', () => {
    fixture();
    const partial = { input_tokens: 1, output_tokens: 1, cache_creation_input_tokens: 1 };
    transcript('fidelity', 'f.jsonl', lines(assistant('msg_F', '2026-11-27T11:30:00.000Z', partial)));
    const read = sessionUsage(run) as Doc;
    const unreadable = { state: 'unknown', why: 'field-unreadable' };
    expect(read.sessions[2].tokens).toEqual({ input: counted(1), output: counted(1), cacheCreation: counted(1), cacheRead: unreadable, total: unreadable });
    expect(read.total.tokens).toEqual({ input: counted(27), output: counted(278), cacheCreation: counted(1309), cacheRead: unreadable, total: unreadable });
    expect(read.total.responses).toEqual(counted(6));
    expect(costLine(read as never).text).toContain('Cost: run total Unknown (fidelity: a token count that cannot be read); known: author 12,590 tokens, inventory 10 tokens, design 20 tokens;');
  });

  it('counts a readable transcript with no response as zero responses, not Unknown', () => {
    fixture();
    transcript('fidelity', 'f.jsonl', lines(user('2026-11-27T11:30:00.000Z')));
    const read = sessionUsage(run) as Doc;
    expect(read.sessions[2]).toEqual({ role: 'fidelity', label: 'Inferred', transcripts: 1, responses: 0, tokens: tokens(0, 0, 0, 0, 0), spanMs: { state: 'measured', ms: 0 } });
  });

  it('refuses a stored value in any form close does not write', () => {
    fixture();
    const good = JSON.parse(JSON.stringify(sessionUsage(run))) as Doc;
    const mutants: ((doc: Doc) => void)[] = [
      (doc) => { doc.format = 'other'; },
      (doc) => { doc.money.label = 'Inferred'; },
      (doc) => { doc.sessions.pop(); },
      (doc) => { doc.sessions[0].role = 'design'; },
      (doc) => { doc.sessions[0].tokens.total.value = -1; },
      (doc) => { doc.sessions[0].extra = 1; },
      (doc) => { doc.total.spanMs = { state: 'measured', ms: 1.5 }; },
      (doc) => { doc.sessions[1] = { role: 'inventory', label: 'Unknown', why: 'made-up' }; },
    ];
    for (const mutate of mutants) {
      const doc = structuredClone(good);
      mutate(doc);
      expect(isSessionUsage(doc)).toBe(false);
    }
    expect(isSessionUsage({ ...HEAD, label: 'Unknown', why: 'operator-started' })).toBe(true);
  });

  it('writes figures and spans the same way on every host', () => {
    expect([grouped(0), grouped(999), grouped(1000), grouped(13020), grouped(1234567)]).toEqual(['0', '999', '1,000', '13,020', '1,234,567']);
    expect([spanWords(0), spanWords(59_999), spanWords(60_000), spanWords(3_599_999), spanWords(3_600_000), spanWords(6_360_000)])
      .toEqual(['0 s', '59 s', '1 min', '59 min', '1 h 0 min', '1 h 46 min']);
  });
});
