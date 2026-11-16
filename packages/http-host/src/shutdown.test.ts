import { describe, expect, it } from 'vitest';

import { closeOnSignal, type ShutdownIo, type ShutdownSignal } from './shutdown.js';

/** A daemon whose close settles as `outcome` says, and an io that records what it is told. */
function harness(outcome: 'closes' | Error, withCloseFailed = true) {
  const events: string[] = [];
  const listeners = new Map<ShutdownSignal, () => void>();
  const daemon = {
    close: async (): Promise<void> => {
      events.push('close');
      if (outcome !== 'closes') throw outcome;
    },
  };
  const io: ShutdownIo = {
    onSignal: (signal, listener) => { events.push(`listen ${signal}`); listeners.set(signal, listener); },
    announce: (signal) => { events.push(`announce ${signal}`); },
    ...(withCloseFailed ? { closeFailed: (cause: unknown) => { events.push(`close failed ${(cause as Error).message}`); } } : {}),
  };
  const done = closeOnSignal(daemon, io).then(() => { events.push('resolved'); });
  return { events, done, signal: (signal: ShutdownSignal) => listeners.get(signal)?.() };
}

describe('closeOnSignal', () => {
  it.each(['SIGINT', 'SIGTERM'] as const)('announces %s, closes the daemon once and resolves', async (signal) => {
    const h = harness('closes');
    h.signal(signal);
    await h.done;
    expect(h.events).toEqual(['listen SIGINT', 'listen SIGTERM', `announce ${signal}`, 'close', 'resolved']);
  });

  it('does nothing on a signal after the first', async () => {
    const h = harness('closes');
    h.signal('SIGTERM');
    h.signal('SIGINT');
    h.signal('SIGTERM');
    await h.done;
    expect(h.events).toEqual(['listen SIGINT', 'listen SIGTERM', 'announce SIGTERM', 'close', 'resolved']);
  });

  it('tells a failed close to closeFailed and still resolves', async () => {
    const h = harness(new Error('socket stuck'));
    h.signal('SIGINT');
    await h.done;
    expect(h.events).toEqual(['listen SIGINT', 'listen SIGTERM', 'announce SIGINT', 'close', 'close failed socket stuck', 'resolved']);
  });

  it('resolves quietly on a failed close when nothing listens for one', async () => {
    const h = harness(new Error('socket stuck'), false);
    h.signal('SIGINT');
    await h.done;
    expect(h.events).toEqual(['listen SIGINT', 'listen SIGTERM', 'announce SIGINT', 'close', 'resolved']);
  });

  it('stays pending until a signal arrives', async () => {
    const h = harness('closes');
    await new Promise((resolve) => setTimeout(resolve, 20));
    expect(h.events).toEqual(['listen SIGINT', 'listen SIGTERM']);
    h.signal('SIGINT');
    await h.done;
  });
});
