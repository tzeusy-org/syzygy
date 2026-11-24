// The step measures of REQ-polaris-generation-033 version 2.27 applied, read-only, to the stored dossier runs (syzygy-5dhm.25).
// Usage: npx vite-node --config vitest.config.ts docs/evidence/syzygy-5dhm-25/step_measures_stored.ts -- <state-root> <figure-f-record> <out.json>
// In each `run-<32 hex>` directory it reads steps.jsonl and record.json (for its closedAt) and nothing else; it never opens or lists a
// `run-*.agents` or `run-*.sessions` directory and writes only <out.json>. It then compares every completed round with figure f of
// scripts/dossier_stored_run_measures.py, as that script's committed record states it (minutes rounded to two places), so the code and the
// script are checked against each other rather than the script's predicate copied.
import { createHash } from 'node:crypto';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { stepMeasures } from '../../../packages/polaris-dossier/src/step-measures.ts';

const [stateRoot, figureRecord, out] = process.argv.slice(2).filter((arg) => arg !== '--');
if (!stateRoot || !figureRecord || !out) throw new Error('usage: step_measures_stored.ts <state-root> <figure-f-record> <out.json>');
const sha = (bytes: Buffer): string => createHash('sha256').update(bytes).digest('hex');
const runs = fs.readdirSync(stateRoot).filter((name) => /^run-[0-9a-f]{32}$/u.test(name)).sort();
const figure = JSON.parse(fs.readFileSync(figureRecord, 'utf8')).figures.f_stage_time_and_operator_actions.perRun as
  Record<string, { rounds: { kind: string; round: number; minutes: number; refusedSubmissions: number }[] }>;

const perRun: Record<string, unknown> = {};
const comparison: { run: string; kind: string; round: number | null; codeMinutes: number; scriptMinutes: number | null; codeRefused: number; scriptRefused: number | null; agree: boolean }[] = [];
for (const run of runs) {
  const stepsBytes = fs.readFileSync(path.join(stateRoot, run, 'steps.jsonl'));
  const recordBytes = fs.readFileSync(path.join(stateRoot, run, 'record.json'));
  const closedAt = JSON.parse(recordBytes.toString('utf8')).closedAt as string;
  const lines = stepsBytes.toString('utf8').split('\n').filter((line) => line !== '');
  const measures = stepMeasures(lines, closedAt);
  perRun[run] = { stepsSha256: sha(stepsBytes), recordSha256: sha(recordBytes), closedAt, stepMeasures: measures };
  if (measures.label !== 'Inferred') continue;
  const short = run.slice(4, 12);
  const scriptRounds = figure[short]?.rounds ?? [];
  for (const kind of ['fidelity', 'design'] as const) {
    const rounds = measures.reviewRounds[kind];
    if (rounds.state !== 'counted') continue;
    const scriptKind = scriptRounds.filter((r) => r.kind === kind);
    rounds.rounds.filter((r) => r.ms !== null).forEach((r, i) => {
      const codeMinutes = Math.round((r.ms! / 60_000) * 100) / 100;
      const match = scriptKind[i];
      comparison.push({
        run: short, kind, round: r.round, codeMinutes, scriptMinutes: match?.minutes ?? null, codeRefused: r.refusedSubmissions,
        scriptRefused: match?.refusedSubmissions ?? null, agree: match !== undefined && match.minutes === codeMinutes && match.refusedSubmissions === r.refusedSubmissions,
      });
    });
    const completed = rounds.rounds.filter((r) => r.ms !== null).length;
    if (completed !== scriptKind.length) comparison.push({ run: short, kind, round: null, codeMinutes: NaN, scriptMinutes: null, codeRefused: completed, scriptRefused: scriptKind.length, agree: false });
  }
}
const record = {
  format: 'syzygy-5dhm-25-step-measures-stored/1',
  label: 'Inferred',
  basis: 'stepMeasures (packages/polaris-dossier/src/step-measures.ts) over each stored run\'s steps.jsonl, ending its wall time at its record.json closedAt; the stored runs were read only and nothing was written into them',
  subject: { runs: runs.length, figureRecord: path.basename(figureRecord), figureRecordSha256: sha(fs.readFileSync(figureRecord)) },
  comparisonWithFigureF: { rounds: comparison.length, agree: comparison.filter((c) => c.agree).length, disagreements: comparison.filter((c) => !c.agree) },
  perRun,
};
fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
console.log(`runs ${runs.length}; rounds compared ${comparison.length}; agree ${record.comparisonWithFigureF.agree}`);
