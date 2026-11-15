import { EventEmitter } from 'node:events';
import { PassThrough } from 'node:stream';
import { describe, expect, it } from 'vitest';
import { processTerminal } from './launch-cli.js';

/** REQ-polaris-generation-046 line 11 ("an answer is not given") and 047 (the copy removed where the run ends before its brief): an interrupt
 * or the end of input at the question resolves it to no answer, so the launch refuses and removes the copy, instead of the process dying with
 * the copy left behind (R-PDJA-33-SLICE-B-1 finding 2). The terminal's input, signal source and output are injected; nothing is spawned. */

function terminal() {
  const input = Object.assign(new PassThrough(), { isTTY: true });
  const signals = new EventEmitter();
  const written: string[] = [];
  const t = processTerminal(input, signals, { write: (chunk: string | Uint8Array) => { written.push(String(chunk)); return true; } });
  return { input, signals, written, t };
}

describe('the launch terminal: an interrupt or the end of input is no answer', () => {
  it('a typed line is the answer', async () => {
    const { input, t } = terminal();
    const answer = t.ask('Q? ');
    input.write('public\n');
    expect(await answer).toBe('public');
  });

  it('Ctrl-C at the question resolves it to no answer, and every later question too; the handler is removed after the question', async () => {
    const { input, signals, written, t } = terminal();
    const answer = t.ask('Q? ');
    await new Promise(r => setImmediate(r));
    expect(signals.listenerCount('SIGINT')).toBe(1);
    signals.emit('SIGINT');
    expect(await answer).toBeNull();
    expect(signals.listenerCount('SIGINT')).toBe(0);
    input.write('typed after the interrupt\n');
    expect(await t.ask('Next? ')).toBeNull();
    expect(written).toEqual(['Q? ', '\n', 'Next? ']);
  });

  it('the end of input at the question resolves it to no answer', async () => {
    const { input, signals, t } = terminal();
    const answer = t.ask('Q? ');
    input.end();
    expect(await answer).toBeNull();
    expect(signals.listenerCount('SIGINT')).toBe(0);
  });
});
