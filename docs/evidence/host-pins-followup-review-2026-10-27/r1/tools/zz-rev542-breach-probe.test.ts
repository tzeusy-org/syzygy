// rev-542 probe, never committed: copied into packages/cap1-daemon/src/ for one run and removed.
// One 503 route whose breach population names a listed reason followed by free text. Writes the
// daemon's stderr lines for that request to $PROBE_OUT.
import { mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it, vi } from 'vitest';

import { createDaemon, type Route } from './server.js';

it('rev-542 probe: a listed reason followed by free text', async () => {
  const base = mkdtempSync(join(tmpdir(), 'rev542-'));
  const reason = 'project shape not-admitted free-text-sentinel-542';
  const routes: Route[] = [{
    method: 'GET',
    path: '/breach',
    credentialClass: 'human-open',
    handle: () => ({
      status: 503,
      contentType: 'application/json',
      body: '{"served":"nothing"}',
      diagnostic: {
        kind: 'response-limit-breached',
        evaluation: { inputsDigest: 'c'.repeat(64), asOf: '2026-10-27T00:00:00Z' },
        limit: 'maxHumanResponseBytes',
        declared: 5,
        observed: 6,
        population: { kind: 'unknown', reason },
        sequence: 1,
      },
    }),
  }];
  const start = await createDaemon({ stateDir: join(base, 'state'), routes, port: 0 });
  if (!start.started) throw new Error(start.failure.detail);
  const lines: string[] = [];
  const stderr = vi.spyOn(process.stderr, 'write').mockImplementation((chunk) => { lines.push(String(chunk)); return true; });
  try {
    await fetch(`http://127.0.0.1:${start.daemon.port}/breach`);
  } finally {
    stderr.mockRestore();
    await start.daemon.close();
    rmSync(base, { recursive: true, force: true });
  }
  writeFileSync(process.env.PROBE_OUT ?? '/dev/null', JSON.stringify({
    lines: lines.map(line => { const { at: _at, ...event } = JSON.parse(line) as Record<string, unknown>; return event; }),
    sentinelLogged: lines.join('').includes('free-text-sentinel-542'),
  }) + '\n');
});
