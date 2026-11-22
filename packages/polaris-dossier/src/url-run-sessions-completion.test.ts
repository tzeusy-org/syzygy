import { describe, expect, it } from 'vitest';
import { isCompletedUrlDesignExit } from './url-run-sessions.js';
import type { UrlSessionLaunchOutcome } from './session-launch.js';

const complete: UrlSessionLaunchOutcome = {
  outcome: 'exited', exitCode: 0, signal: null, viewTermination: 'view-exited', groupTermination: 'confirmed',
  toolTermination: 'settled', pendingInvocations: 0, stdout: { bytes: 0, sha256: 'a'.repeat(64) },
  stderr: { bytes: 0, sha256: 'a'.repeat(64) }, sampledStorageBytes: 0, peakProcesses: 1,
  aggregateEnforcement: 'sampled-stop-only', betweenSamples: 'Unknown',
};

describe('completed design launch health', () => {
  it('accepts only a successful exit with independently settled process and tool cleanup', () => {
    expect(isCompletedUrlDesignExit(complete)).toBe(true);
    const refused: (UrlSessionLaunchOutcome | 'Unknown')[] = [
      'Unknown', { ...complete, outcome: 'stopped' }, { ...complete, exitCode: 1 }, { ...complete, signal: 'SIGTERM' },
      { ...complete, viewTermination: 'Unknown' }, { ...complete, groupTermination: 'Unknown' },
      { ...complete, toolTermination: 'Unknown' }, { ...complete, pendingInvocations: 1 },
    ];
    for (const outcome of refused) expect(isCompletedUrlDesignExit(outcome), JSON.stringify(outcome)).toBe(false);
  });
});
