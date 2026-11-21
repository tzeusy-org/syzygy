import { EventEmitter } from 'node:events';
import { PassThrough, Writable } from 'node:stream';
import { afterEach, describe, expect, it, vi } from 'vitest';
import { createUrlQuestionUi, URL_QUESTION_UI_LIMITS, type UrlQuestionUiOptions } from './url-question-ui.js';
import type { UrlSessionQuestionFrame } from './session-control.js';

afterEach(() => vi.useRealTimers());
function fixture(limits?: UrlQuestionUiOptions['limits']) {
  const input = Object.assign(new PassThrough(), { isTTY: true }), signals = new EventEmitter(), written: string[] = [];
  const output = Object.assign(new Writable({ write(chunk, _encoding, done) { written.push(String(chunk)); done(); } }), { isTTY: true });
  const ask = createUrlQuestionUi({ input, output, signals, ...(limits === undefined ? {} : { limits }) });
  const abort = new AbortController();
  const frame: UrlSessionQuestionFrame = { nonce: 'a'.repeat(32), questionSha256: 'b'.repeat(64), signal: abort.signal,
    question: { kind: 'question', question: 'Which synthetic explanation is intended?', options: ['Preserve exact wording. ', 'Use the second fixture.'],
      evidence: 'Synthetic evidence\nincluding a second line.', consequence: 'Only the fixture wording changes.' } };
  const listeners = () => ({ data: input.listenerCount('data'), end: input.listenerCount('end'), error: input.listenerCount('error'), close: input.listenerCount('close'),
    outputError: output.listenerCount('error'), outputClose: output.listenerCount('close'), interrupt: signals.listenerCount('SIGINT') });
  return { input, output, signals, written, ask, abort, frame, listeners };
}
const declined = { kind: 'declined', nonce: 'a'.repeat(32), questionSha256: 'b'.repeat(64) };
const settled = <T>(pending: Promise<T>) => Promise.race([pending, new Promise<'still-pending'>(resolve => setImmediate(() => resolve('still-pending')))]);

describe('transient typed URL question terminal', () => {
  it('shows faithful context and maps a numbered selection to exact option bytes while retaining question identity', async () => {
    const f = fixture(), initial = f.listeners(), answer = f.ask(f.frame);
    expect(f.written.join('')).toContain('Which synthetic explanation is intended?\n1. Preserve exact wording. \n2. Use the second fixture.\n');
    expect(f.written.join('')).toContain('Evidence: Synthetic evidence\nincluding a second line.\nConsequence: Only the fixture wording changes.\n');
    f.input.write('1\n');
    expect(await answer).toEqual({ kind: 'answered', nonce: 'a'.repeat(32), questionSha256: 'b'.repeat(64), answerKind: 'selected-interpretation', answer: 'Preserve exact wording. ' });
    expect(f.listeners()).toEqual(initial); expect(f.input.destroyed).toBe(false); expect(f.output.destroyed).toBe(false);
  });
  it.each([['text The exact fixture text. ', 'free-text', 'The exact fixture text. '],
    ['unknown The evidence is absent.', 'leave-unknown', 'The evidence is absent.'],
    ['defer Ask after the fixture is revised.', 'defer', 'Ask after the fixture is revised.']])('accepts the explicit command %s', async (typed, answerKind, answer) => {
    const f = fixture(), pending = f.ask(f.frame); f.input.write(typed + '\n');
    expect(await pending).toEqual({ kind: 'answered', nonce: 'a'.repeat(32), questionSha256: 'b'.repeat(64), answerKind, answer });
    expect(f.written.join('')).not.toContain(answer);
  });
  it('never turns an invalid number or unprefixed text into an answer; a valid correction can follow', async () => {
    const f = fixture(), pending = f.ask({ ...f.frame, question: { kind: 'question', question: 'Explain the synthetic fixture.' } });
    f.input.write('1\nperhaps\nunknown\ntext \ntext Explicit wording.\n');
    expect(await pending).toMatchObject({ kind: 'answered', answerKind: 'free-text', answer: 'Explicit wording.' });
    expect(f.written.join('')).not.toContain('perhaps');
  });
  it.each(['\n', ' \n', 'cancel\n'])('declines blank/cancel input %j without choosing an option', async typed => {
    const f = fixture(), pending = f.ask(f.frame); f.input.write(typed); expect(await settled(pending)).toEqual(declined);
  });
  it('abort settles the active read, removes its actual input listeners, and permits the next distinct question', async () => {
    const f = fixture(), initial = f.listeners(), pending = f.ask(f.frame);
    expect(f.listeners().data).toBeGreaterThan(initial.data); f.abort.abort();
    expect(await pending).toEqual(declined); expect(f.listeners()).toEqual(initial);
    const next = f.ask({ ...f.frame, nonce: 'c'.repeat(32), signal: new AbortController().signal }); f.input.write('2\n');
    expect(await next).toMatchObject({ nonce: 'c'.repeat(32), kind: 'answered', answer: 'Use the second fixture.' });
    expect(f.listeners()).toEqual(initial);
  });
  it('pre-abort and concurrent questions cannot consume input or replace the active question', async () => {
    const f = fixture(), initial = f.listeners(); f.abort.abort(); expect(await f.ask(f.frame)).toEqual(declined);
    expect(f.written).toEqual([]); expect(f.listeners()).toEqual(initial);
    const signal = new AbortController().signal, first = f.ask({ ...f.frame, signal });
    expect(await f.ask({ ...f.frame, nonce: 'c'.repeat(32), signal })).toEqual({ ...declined, nonce: 'c'.repeat(32) });
    f.input.write('2\n'); expect(await first).toMatchObject({ kind: 'answered', nonce: 'a'.repeat(32) });
  });
  it('timeout, EOF, stream failure and SIGINT each decline and release the owned readline', async () => {
    vi.useFakeTimers();
    for (const reason of ['timeout', 'eof', 'partial-eof', 'input-error', 'output-error', 'input-close', 'output-close', 'interrupt']) {
      const f = fixture({ milliseconds: 20 }), initial = f.listeners(), pending = f.ask(f.frame);
      if (reason === 'timeout') await vi.advanceTimersByTimeAsync(20);
      else if (reason === 'eof') f.input.end();
      else if (reason === 'partial-eof') f.input.end('1');
      else if (reason === 'input-error') f.input.emit('error', new Error('own synthetic input failure'));
      else if (reason === 'output-error') f.output.emit('error', new Error('own synthetic output failure'));
      else if (reason === 'input-close') f.input.destroy();
      else if (reason === 'output-close') f.output.destroy();
      else f.signals.emit('SIGINT');
      expect(await pending).toEqual(declined); expect(f.listeners()).toEqual(initial);
    }
  });
  it('accepts split UTF-8 input without changing it and snapshots displayed choices before waiting', async () => {
    const f = fixture(), pending = f.ask(f.frame), encoded = Buffer.from('text caf\u00e9.\n');
    const split = encoded.indexOf(0xc3) + 1; f.input.write(encoded.subarray(0, split)); f.input.write(encoded.subarray(split));
    expect(await pending).toMatchObject({ kind: 'answered', answerKind: 'free-text', answer: 'caf\u00e9.' });
    const g = fixture(), options = ['Original fixture choice.', 'Other fixture choice.'];
    const selected = g.ask({ ...g.frame, question: { ...g.frame.question, options } }); options[0] = 'Changed after display.'; g.input.write('1\n');
    expect(await selected).toMatchObject({ kind: 'answered', answerKind: 'selected-interpretation', answer: 'Original fixture choice.' });
  });
  it('accepts the full8192-byte answer boundary without truncating a multibyte answer', async () => {
    const f = fixture(), answer = '\u00e9'.repeat(4096), pending = f.ask(f.frame); f.input.write(`text ${answer}\n`);
    expect(await settled(pending)).toEqual({ kind: 'answered', nonce: 'a'.repeat(32), questionSha256: 'b'.repeat(64), answerKind: 'free-text', answer });
  });
  it('bounds unterminated input, invalid UTF-8, answer length and invalid retries without retaining raw input', async () => {
    for (const payload of [Buffer.alloc(URL_QUESTION_UI_LIMITS.inputBytes + 1, 120), Buffer.from([0xff]), Buffer.from('text ' + 'x'.repeat(8193) + '\n'.repeat(8))]) {
      const f = fixture(), initial = f.listeners(), pending = f.ask(f.frame); f.input.write(payload);
      expect(await settled(pending)).toEqual(declined); expect(f.listeners()).toEqual(initial); expect(f.written.join('')).not.toContain('x'.repeat(100));
    }
    const f = fixture({ attempts: 2 }), pending = f.ask(f.frame); f.input.write('not a command\nstill invalid\ntext Too late.\n');
    expect(await pending).toEqual(declined);
  });
  it('refuses non-TTY streams and unsafe or oversized display text before output or readline acquisition', async () => {
    for (const change of ['input', 'output', 'unsafe', 'large']) {
      const f = fixture(), initial = f.listeners();
      if (change === 'input') f.input.isTTY = false; if (change === 'output') f.output.isTTY = false;
      const frame = change === 'unsafe' ? { ...f.frame, question: { ...f.frame.question, evidence: '\u001b[2J' } }
        : change === 'large' ? { ...f.frame, question: { ...f.frame.question, question: 'x'.repeat(4097) } } : f.frame;
      expect(await f.ask(frame)).toEqual(declined); expect(f.written).toEqual([]); expect(f.listeners()).toEqual(initial);
    }
    expect(() => createUrlQuestionUi({ limits: { milliseconds: 0 } })).toThrow('url-question-ui-unavailable');
    expect(() => createUrlQuestionUi({ limits: { milliseconds: 60_001 } })).toThrow('url-question-ui-unavailable');
  });
});
