import * as fs from 'node:fs';
import * as os from 'node:os';
import * as path from 'node:path';
import { tempDir } from '@syzygy/test-kit';
import { beforeAll, describe, expect, it } from 'vitest';
import { authorRule, awaitRule } from './broker.js';
import { exited } from './child-process.testkit.js';
import { launchFormRefusal, launchedMarkerState, writeLaunchedMarker } from './launched.js';
import { blockingWhy, toolPathsFor } from './polaris.js';
import { bwrapArgs, viewFor, viewSha256, type ViewRole } from './session-view.js';

// Candidate REQ-polaris-generation-041/042 (prototype under POLARIS-DOSSIER-ONE-COMMAND-RUN-2026-10-14): each launched session reaches
// only what its role needs; the broker admits only the session's own commands; launch forms follow the run's kind.

const hasBwrap = (await exited('bwrap', ['--ro-bind', '/', '/', '--', '/bin/true'])).status === 0;

describe('session views', () => {
  let base: string;
  const dirs: Record<string, string> = {};
  beforeAll(() => {
    base = tempDir('polaris-view-');
    for (const name of ['clone', 'checkout', 'run', 'run/drafts', 'run.sessions/session-1', 'run.sessions/fidelity-1', 'run.sessions/design-1', 'home-author', 'home-inventory', 'home-fidelity', 'shim', 'sock']) {
      dirs[name] = path.join(base, name);
      fs.mkdirSync(dirs[name]!, { recursive: true });
    }
    fs.writeFileSync(path.join(dirs['clone']!, 'README.md'), 'clone');
    fs.writeFileSync(path.join(dirs['run']!, 'brief.md'), 'brief');
    fs.writeFileSync(path.join(dirs['run.sessions/fidelity-1']!, 'packet.json'), '{}');
  });

  const inputs = (role: ViewRole) => ({
    role, clone: dirs['clone']!, runDir: dirs['run']!, sessionDir: role === 'author' ? dirs['run']! : role === 'inventory' ? dirs['run.sessions/session-1']! : dirs[`run.sessions/${role}-1`]!,
    agentHome: dirs[`home-${role === 'design' ? 'fidelity' : role}`]!, checkout: dirs['checkout']!, toolPaths: [], shimDir: dirs['shim']!, brokerSocket: path.join(dirs['sock']!, 'b.sock'), socketDir: dirs['sock']!,
  });

  /** Run a probe script in the role's view: one line per path, `r` readable, `w` writable, `-` absent. */
  const probe = async (role: ViewRole, paths: readonly string[]): Promise<string[]> => {
    const script = paths.map((p) => `if [ -e '${p}' ]; then if touch '${p}/.w' 2>/dev/null || { [ -f '${p}' ] && [ -w '${p}' ] && echo >> '${p}' 2>/dev/null; }; then echo w; else echo r; fi; else echo -; fi`).join('; ');
    const result = await exited('bwrap', [...bwrapArgs(viewFor(inputs(role))), '/bin/sh', '-c', script]);
    expect(result.status, result.stderr).toBe(0);
    return result.stdout.trim().split('\n');
  };

  it.skipIf(!hasBwrap)('the inventory session sees the clone read-only and its own directory, never the run or another session', async () => {
    expect(await probe('inventory', [dirs['clone']!, dirs['run.sessions/session-1']!, dirs['run']!, path.join(dirs['run']!, 'brief.md'), dirs['run.sessions/fidelity-1']!, dirs['checkout']!]))
      .toEqual(['r', 'w', '-', '-', '-', 'r']);
  });

  it.skipIf(!hasBwrap)('a review session sees only its own directory and the checkout read-only', async () => {
    expect(await probe('fidelity', [dirs['run.sessions/fidelity-1']!, dirs['clone']!, dirs['run']!, dirs['run.sessions/session-1']!, dirs['run.sessions/design-1']!, dirs['checkout']!]))
      .toEqual(['w', '-', '-', '-', '-', 'r']);
  });

  it.skipIf(!hasBwrap)('the author writes only drafts/ and sees no helper session', async () => {
    expect(await probe('author', [dirs['run/drafts']!, dirs['run']!, dirs['clone']!, dirs['run.sessions/session-1']!, dirs['run.sessions/fidelity-1']!, dirs['checkout']!]))
      .toEqual(['w', 'r', 'r', '-', '-', 'r']);
  });

  it('a view is a pure function of its inputs, and its digest changes with them', () => {
    expect(viewSha256(viewFor(inputs('inventory')))).toBe(viewSha256(viewFor(inputs('inventory'))));
    expect(viewSha256(viewFor(inputs('inventory')))).not.toBe(viewSha256(viewFor(inputs('fidelity'))));
  });

  it('a view passes no environment but its own', () => {
    const args = bwrapArgs(viewFor(inputs('inventory')));
    expect(args).toContain('--clearenv');
    const set = args.flatMap((arg, i) => (arg === '--setenv' ? [args[i + 1]] : []));
    expect(set.sort()).toEqual(['CLAUDE_CONFIG_DIR', 'HOME', 'LANG', 'PATH', 'SYZYGY_BROKER_SOCKET', 'TERM']);
  });
});

describe('broker rules', () => {
  it('a helper may run only await on its own directory', () => {
    const rule = awaitRule('/s/run-x.sessions/session-1');
    expect(rule(['dossier', 'await', '/s/run-x.sessions/session-1/'])).toBeNull();
    expect(rule(['dossier', 'await', '/s/run-x.sessions/session-1/', '--submit', 'inventory.json', '--stdin'])).toBeNull();
    expect(rule(['dossier', 'await', '/s/run-x.sessions/fidelity-1/'])).not.toBeNull();
    expect(rule(['dossier', 'check', '/s/run-x'])).not.toBeNull();
    expect(rule(['dossier', 'await'])).not.toBeNull();
  });

  it('the author may run only check and status on its own run', () => {
    const rule = authorRule('/s/run-x');
    expect(rule(['dossier', 'check', '/s/run-x'])).toBeNull();
    expect(rule(['dossier', '--json', 'status', '/s/run-x'])).toBeNull();
    expect(rule(['dossier', 'check', '/s/run-y'])).not.toBeNull();
    // The broker runs check outside the view: an option naming a path would read any file the operator can.
    expect(rule(['dossier', 'check', '/s/run-x', '--draft', '/etc/passwd'])).not.toBeNull();
    expect(rule(['dossier', 'check', '/s/run-x', '--draft=/home/u/.ssh/id_ed25519'])).not.toBeNull();
    expect(rule(['dossier', 'status', '/s/run-x', '/s/run-y'])).not.toBeNull();
    for (const command of ['session-prompt', 'review-check', 'inventory-check', 'render', 'close', 'launch-form', 'allow-execution', 'await']) {
      expect(rule(['dossier', command, '/s/run-x'])).not.toBeNull();
    }
  });
});

describe('launch forms by kind of run', () => {
  let run: string;
  beforeAll(() => { run = tempDir('polaris-launched-'); });

  it('an operator-started run counts terminal and bang, never syzygy-launched', () => {
    expect(launchedMarkerState(run)).toBe('absent');
    expect(launchFormRefusal(run, { value: 'terminal', declaredBy: 'operator', label: 'Inferred' })).toBeNull();
    expect(launchFormRefusal(run, { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Observed' })).not.toBeNull();
  });

  it('a launched run counts syzygy-launched, never a declared form', () => {
    writeLaunchedMarker(run, 'run-x', Date.now());
    expect(launchedMarkerState(run)).toBe('launched');
    expect(launchFormRefusal(run, { value: 'syzygy-launched', declaredBy: 'syzygy', label: 'Observed' })).toBeNull();
    expect(launchFormRefusal(run, { value: 'terminal', declaredBy: 'operator', label: 'Inferred' })).not.toBeNull();
    expect(launchFormRefusal(run, { value: 'syzygy-launched', declaredBy: 'operator', label: 'Inferred' })).not.toBeNull();
  });
});

describe('supervisor messages', () => {
  it('names unconfirmed rows, not blocking findings, when a verdict has only advisory findings', () => {
    const run = tempDir('polaris-why-');
    fs.mkdirSync(path.join(run, 'reviews'));
    fs.writeFileSync(path.join(run, 'reviews', 'fidelity-verdict-2.json'), JSON.stringify({
      findings: [{ severity: 'advisory' }], blockSupport: [{ verdict: 'supported' }, { verdict: 'unresolved' }], inventoryAccuracy: [{ accuracy: 'unresolved' }], inventoryCoverage: [{ disposition: 'represented' }],
    }));
    const why = blockingWhy(run, 'fidelity', 2);
    expect(why).not.toMatch(/blocking finding/);
    expect(why).toMatch(/^2 block or entry row\(s\) not confirmed/);
  });
});

describe('tool binds', () => {
  it('binds each executable\'s own directory, and refuses one that holds the state root or the home directory', () => {
    const home = os.homedir();
    expect(toolPathsFor(['/usr/bin/node', '/opt/claude/versions/2/claude'], path.join(home, '.local/state/syzygy-dossier'))).toEqual(['/usr/bin', '/opt/claude/versions/2']);
    expect(() => toolPathsFor([path.join(home, 'node')], path.join(home, '.local/state/syzygy-dossier'))).toThrow(/home directory|state root/);
    expect(() => toolPathsFor(['/srv/x/node'], '/srv/x/state')).toThrow(/state root/);
  });
});
