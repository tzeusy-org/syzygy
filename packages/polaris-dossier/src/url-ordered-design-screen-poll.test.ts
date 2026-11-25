import { afterEach, describe, expect, it, vi } from 'vitest';
import { startOrderedDesignScreenCurrentPolling } from './url-ordered-design-screen.js';

afterEach(() => { vi.useRealTimers(); });

describe('ordered screen authority polling', () => {
  it('leaves twenty milliseconds after a slow full check and lets pending census work settle', () => {
    vi.useFakeTimers(); vi.setSystemTime(0);
    const starts: number[] = [], ends: number[] = [];
    const census = vi.fn();
    const close = startOrderedDesignScreenCurrentPolling(() => {
      starts.push(Date.now());
      // There is no already-due next poll while this synchronous check runs.
      expect(vi.getTimerCount()).toBe(0);
      vi.setSystemTime(Date.now() + 200);
      ends.push(Date.now());
      if (starts.length === 1) setTimeout(census, 5);
    }, () => { throw new Error('owned current unexpectedly refused'); });
    try {
      vi.advanceTimersByTime(20);
      expect(starts).toEqual([20]); expect(ends).toEqual([220]);
      vi.advanceTimersByTime(5); expect(census).toHaveBeenCalledTimes(1);
      vi.advanceTimersByTime(14); expect(starts).toHaveLength(1);
      vi.advanceTimersByTime(1); expect(starts).toEqual([20, 240]);
      expect(starts[1]! - ends[0]!).toBe(20);
    } finally { close(); }
    expect(vi.getTimerCount()).toBe(0);
  });

  it('stops on a thrown fresh authority check without scheduling another poll', () => {
    vi.useFakeTimers();
    const current = vi.fn(() => { throw new Error('owned withdrawal'); }), stop = vi.fn();
    const close = startOrderedDesignScreenCurrentPolling(current, stop);
    vi.advanceTimersByTime(20);
    expect(current).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledTimes(1);
    expect(vi.getTimerCount()).toBe(0);
    vi.advanceTimersByTime(1000);
    expect(current).toHaveBeenCalledTimes(1); expect(stop).toHaveBeenCalledTimes(1);
    close(); close(); expect(vi.getTimerCount()).toBe(0);
  });

  it.each(['before-check', 'during-check'] as const)('cleans up a child closing %s without a later authority callback', when => {
    vi.useFakeTimers();
    let close!: () => void;
    const current = vi.fn(() => { if (when === 'during-check') close(); });
    const stop = vi.fn();
    close = startOrderedDesignScreenCurrentPolling(current, stop);
    if (when === 'before-check') close();
    vi.advanceTimersByTime(1000);
    expect(current).toHaveBeenCalledTimes(when === 'before-check' ? 0 : 1);
    expect(stop).not.toHaveBeenCalled(); expect(vi.getTimerCount()).toBe(0);
    close(); expect(vi.getTimerCount()).toBe(0);
  });
});
