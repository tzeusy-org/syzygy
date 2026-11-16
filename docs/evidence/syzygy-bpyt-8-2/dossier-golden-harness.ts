// syzygy-bpyt.8.2 golden harness (scratch; copied into packages/polaris-dossier/src/ for a run, never committed there).
// Replays every argv in $GOLDEN_CORPUS through runDossierCli with a fixed clock, an empty environment, no sleep and no standard
// input, and writes argv → {exit, stdout, stderr} (or the thrown error) to $GOLDEN_OUT. The same file runs at base and at head.
import * as fs from 'node:fs';
import { it } from 'vitest';
import { runDossierCli } from './cli.js';

const FIXED_NOW = Date.UTC(2026, 9, 22, 0, 0, 0);

it('replays the corpus', async () => {
  const corpus = JSON.parse(fs.readFileSync(process.env['GOLDEN_CORPUS']!, 'utf8')) as string[][];
  // Relative paths in the corpus resolve against an empty scratch directory, never the worktree.
  process.chdir(process.env['GOLDEN_CWD']!);
  const out: { argv: string[]; exit: number | null; stdout: string; stderr: string; threw: string | null }[] = [];
  for (const argv of corpus) {
    let stdout = '', stderr = '';
    let exit: number | null = null, threw: string | null = null;
    try {
      exit = await runDossierCli(argv, { stdout: (t) => { stdout += t; }, stderr: (t) => { stderr += t; } }, {
        env: {}, now: () => FIXED_NOW, sleep: async () => undefined, readStdin: async () => null,
      });
    } catch (cause) {
      threw = cause instanceof Error ? `${cause.name}: ${cause.message}` : String(cause);
    }
    out.push({ argv, exit, stdout, stderr, threw });
  }
  fs.writeFileSync(process.env['GOLDEN_OUT']!, `${JSON.stringify(out, null, 1)}\n`);
}, 3_600_000);
