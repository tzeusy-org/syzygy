import { execFileSync } from 'node:child_process';
import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from '@syzygy/support';

import { measureRedisShapedDiscovery } from './redis-shaped-measure.js';

/** The code the measurement ran: the commit and the sha256 of each module that builds or sends an excerpt (rule 11). */
const SUBJECTS = ['packages/polaris-generation-core/src/excerpt.ts', 'packages/polaris-generation-core/src/discovery.ts', 'apps/three-surface-poc/src/polaris-generation/redis-shaped-measure.ts'] as const;
function subjects(): { readonly commit: string; readonly sha256: Readonly<Record<string, string>> } {
  const root = execFileSync('git', ['rev-parse', '--show-toplevel'], { encoding: 'utf8' }).trim();
  const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  return { commit, sha256: Object.fromEntries(SUBJECTS.map(path => [path, sha256(readFileSync(join(root, path)))])) };
}

/** `poc:redis-shaped-discovery [--out <file>]`: builds the synthetic fixture in a scratch directory, measures heuristic discovery, prints or writes the measurement. No real repository is read and no provider is called. */
export async function main(argv: readonly string[]): Promise<number> {
  const outAt = argv.indexOf('--out');
  if (argv.length !== 0 && !(argv.length === 2 && outAt === 0 && argv[1]! !== '')) { process.stderr.write('Usage: poc:redis-shaped-discovery [--out <file>]\n'); return 2; }
  const scratch = mkdtempSync(join(tmpdir(), 'syzygy-redis-shaped-'));
  try {
    const { measurement } = await measureRedisShapedDiscovery(join(scratch, 'repo'));
    const text = `${JSON.stringify({ ...measurement, codeSubjects: subjects() }, null, 2)}\n`;
    if (outAt === 0) writeFileSync(resolve(argv[1]!), text, { flag: 'wx' }); else process.stdout.write(text);
    return 0;
  } finally { rmSync(scratch, { recursive: true, force: true }); }
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main(process.argv.slice(2)).then(code => { process.exitCode = code; }, error => { process.stderr.write(`redis-shaped discovery failed: ${error instanceof Error ? error.message : 'unknown'}\n`); process.exitCode = 1; });
}
