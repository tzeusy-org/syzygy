import { createInterface, type Interface } from 'node:readline';
import { URL_CONTROL_LIMITS, type UrlSessionAnswer, type UrlSessionQuestionFrame } from './session-control.js';

export const URL_QUESTION_UI_LIMITS = Object.freeze({ milliseconds: URL_CONTROL_LIMITS.questionMilliseconds, inputBytes: 16_384, attempts: 8 });
type Limits = { readonly [K in keyof typeof URL_QUESTION_UI_LIMITS]: number };
export interface UrlQuestionUiOptions {
  readonly input?: NodeJS.ReadableStream & { readonly isTTY?: boolean };
  readonly output?: NodeJS.WritableStream & { readonly isTTY?: boolean };
  readonly signals?: Pick<NodeJS.EventEmitter, 'on' | 'removeListener'>;
  /** May only lower the fixed bounds. The control's earlier abort still wins. */
  readonly limits?: Partial<Limits>;
}
const text = (value: unknown, bytes: number): value is string => typeof value === 'string' && value.trim().length > 0
  && Buffer.byteLength(value) <= bytes && Buffer.from(value).toString('utf8') === value
  && !/[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value);

/** Already-screened questions only. This transient TTY adapter neither stores
 * answers nor authorizes their delivery: session-control screens and audits the
 * typed result. Streams are borrowed; only this invocation's readline is owned. */
export function createUrlQuestionUi(options: UrlQuestionUiOptions = {}): (frame: UrlSessionQuestionFrame) => Promise<UrlSessionAnswer> {
  const input: NonNullable<UrlQuestionUiOptions['input']> = options.input ?? process.stdin;
  const output: NonNullable<UrlQuestionUiOptions['output']> = options.output ?? process.stdout;
  const signals: NonNullable<UrlQuestionUiOptions['signals']> = options.signals ?? process;
  const limits = Object.freeze({ ...URL_QUESTION_UI_LIMITS, ...options.limits });
  if (Object.keys(limits).length !== Object.keys(URL_QUESTION_UI_LIMITS).length || Object.entries(limits).some(([key, value]) =>
    !Object.hasOwn(URL_QUESTION_UI_LIMITS, key) || !Number.isSafeInteger(value) || value <= 0 || value > URL_QUESTION_UI_LIMITS[key as keyof Limits]))
    throw new Error('url-question-ui-unavailable');
  let active = false;
  return frame => {
    const nonce = frame.nonce, questionSha256 = frame.questionSha256, signal = frame.signal;
    const declined: UrlSessionAnswer = Object.freeze({ kind: 'declined', nonce, questionSha256 });
    const question = { ...frame.question, options: frame.question.options === undefined ? undefined : [...frame.question.options] };
    if (active || signal.aborted || input.isTTY !== true || output.isTTY !== true || input.readable === false
      || !/^[a-f0-9]{32}$/u.test(nonce) || !/^[a-f0-9]{64}$/u.test(questionSha256)
      || question.kind !== 'question' || !text(question.question, 4096)
      || question.options !== undefined && (question.options.length < 2 || question.options.length > 3 || new Set(question.options).size !== question.options.length
        || question.options.some(option => !text(option, 1024)))
      || question.evidence !== undefined && !text(question.evidence, 4096) || question.consequence !== undefined && !text(question.consequence, 2048))
      return Promise.resolve(declined);
    active = true;
    return new Promise(resolve => {
      let rl: Interface | undefined, timer: ReturnType<typeof setTimeout> | undefined, settled = false, bytes = 0, attempts = 0;
      const decoder = new TextDecoder('utf-8', { fatal: true });
      const finish = (answer: UrlSessionAnswer = declined): void => {
        if (settled) return; settled = true;
        clearTimeout(timer); signal.removeEventListener('abort', cancel); signals.removeListener('SIGINT', cancel);
        input.removeListener('data', bound); input.removeListener('error', cancel); input.removeListener('end', cancel); input.removeListener('close', cancel);
        output.removeListener('error', cancel); output.removeListener('close', cancel);
        rl?.close(); active = false; resolve(Object.freeze(answer));
      };
      const cancel = (): void => finish();
      const bound = (chunk: unknown): void => {
        try {
          if (typeof chunk !== 'string' && !Buffer.isBuffer(chunk)) return cancel();
          const buffer = typeof chunk === 'string' ? Buffer.from(chunk) : chunk;
          bytes += buffer.length;
          if (bytes > limits.inputBytes) return cancel();
          decoder.decode(buffer, { stream: true });
        } catch { cancel(); }
      };
      const write = (value: string): void => { try { output.write(value); } catch { cancel(); } };
      const line = (value: string): void => {
        if (settled) return;
        if (signal.aborted || value.trim() === '' || value === 'cancel' || /[\u0000-\u0008\u000b\u000c\u000e-\u001f\u007f]/u.test(value)) return cancel();
        const selected = /^[1-3]$/u.test(value) ? question.options?.[Number(value) - 1] : undefined;
        if (selected !== undefined) return finish({ kind: 'answered', nonce, questionSha256, answerKind: 'selected-interpretation', answer: selected });
        for (const [prefix, answerKind] of [['text ', 'free-text'], ['unknown ', 'leave-unknown'], ['defer ', 'defer']] as const) {
          const answer = value.slice(prefix.length);
          if (value.startsWith(prefix) && text(answer, 8192)) return finish({ kind: 'answered', nonce, questionSha256, answerKind, answer });
        }
        if (++attempts >= limits.attempts) return cancel();
        write('Use an option number, text <answer>, unknown <reason>, defer <reason>, or cancel.\n> ');
      };
      signal.addEventListener('abort', cancel, { once: true });
      if (signal.aborted) return cancel();
      input.on('data', bound); input.on('error', cancel); input.once('end', cancel); input.once('close', cancel);
      output.on('error', cancel); output.once('close', cancel); signals.on('SIGINT', cancel);
      timer = setTimeout(cancel, limits.milliseconds);
      try {
        // No terminal editing/history or echo in the adapter; the TTY itself
        // supplies normal line input. A partial oversized line is bounded above.
        rl = createInterface({ input, terminal: false, crlfDelay: Infinity, historySize: 0 });
        rl.on('line', line); rl.on('close', cancel); rl.on('error', cancel);
        if (settled) { rl.close(); return; }
        const choices = question.options?.map((option, index) => `${index + 1}. ${option}\n`).join('') ?? '';
        write(`\nClarification\n${question.question}\n${choices}${question.evidence === undefined ? '' : `Evidence: ${question.evidence}\n`}${question.consequence === undefined ? '' : `Consequence: ${question.consequence}\n`}Reply with ${question.options === undefined ? '' : 'an option number, '}text <answer>, unknown <reason>, or defer <reason>.\nBlank input, cancel, Ctrl-C, or timeout declines this question.\n> `);
      } catch { cancel(); }
    });
  };
}

/** Creates no readline until called and requires both process streams be TTYs. */
export const askUrlSessionQuestion = createUrlQuestionUi();
