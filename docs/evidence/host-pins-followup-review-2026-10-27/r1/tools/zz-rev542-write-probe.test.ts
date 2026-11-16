// rev-542 probe, never committed: copied into packages/http-host/src/ for one run and removed.
// Records what authorizeStateWrite decides for a symlink, inside the state dir, to a sibling
// whose name differs from the state dir's only in case. Writes the decision to $PROBE_OUT.
import { mkdirSync, mkdtempSync, realpathSync, rmSync, symlinkSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { it } from 'vitest';

import { authorizeStateWrite } from './credentials.js';

it('rev-542 probe: symlink into a case-variant sibling', () => {
  const base = mkdtempSync(join(tmpdir(), 'rev542-'));
  try {
    const stateDir = join(base, 'state');
    mkdirSync(stateDir, { recursive: true });
    mkdirSync(join(base, 'STATE'), { recursive: true });
    symlinkSync(join(base, 'STATE'), join(stateDir, 'link'));
    const decision = authorizeStateWrite(stateDir, 'link/escape.txt');
    writeFileSync(process.env.PROBE_OUT ?? '/dev/null', JSON.stringify({
      authorized: decision.authorized,
      refusedBy: decision.authorized ? null : decision.refusedBy,
      // Where a write to the authorized path would land on disk, relative to `base`.
      realLinkTarget: realpathSync(join(stateDir, 'link')).slice(realpathSync(base).length),
    }) + '\n');
  } finally {
    rmSync(base, { recursive: true, force: true });
  }
});
