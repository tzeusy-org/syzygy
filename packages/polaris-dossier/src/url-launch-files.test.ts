import { describe, expect, it } from 'vitest';
import { isUrlHelperLaunchFile, urlHelperLaunchFile, URL_HELPER_LAUNCH_FILES } from './url-launch-history.js';

describe('immutable helper launch generation slots', () => {
  it.each(['inventory', 'fidelity', 'design'] as const)('keeps %s predecessors distinct from its bounded successor', role => {
    const old = URL_HELPER_LAUNCH_FILES[role], generation = 'a'.repeat(64), next = urlHelperLaunchFile(role, generation);
    expect(urlHelperLaunchFile(role)).toBe(old);
    expect(next).toBe(old.replace('.launch.json', `.${generation}.launch.json`));
    expect(next).not.toBe(old);
    expect(isUrlHelperLaunchFile(role, old)).toBe(true);
    expect(isUrlHelperLaunchFile(role, next)).toBe(true);
    for (const other of ['inventory', 'fidelity', 'design'] as const) if (other !== role) expect(isUrlHelperLaunchFile(other, next)).toBe(false);
    for (const invalid of ['', 'A'.repeat(64), 'a'.repeat(63), 'a'.repeat(65), '../' + generation, generation + '\n']) {
      expect(() => urlHelperLaunchFile(role, invalid)).toThrow('url-launch-history-unavailable');
      expect(isUrlHelperLaunchFile(role, old.replace('.launch.json', `.${invalid}.launch.json`))).toBe(false);
    }
    expect(isUrlHelperLaunchFile(role, '../' + next)).toBe(false);
    expect(isUrlHelperLaunchFile(role, next + '.extra')).toBe(false);
  });
});
