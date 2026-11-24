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
// Each figure-f round is matched to the code's round of the same kind and number. They agree, or the code ends the round unfinished at
// the next prompt of its kind where figure f lets that round run on to a validated check the next round also ends at (review F2).
type Compared = { run: string; kind: string; round: number; scriptMinutes: number; scriptRefused: number; codeMinutes: number | null; codeRefused: number | null; outcome: 'agree' | 'superseded-by-next-prompt' | 'differ' };
const comparison: Compared[] = [];
let codeCompleted = 0;
for (const run of runs) {
  const stepsBytes = fs.readFileSync(path.join(stateRoot, run, 'steps.jsonl'));
  const recordBytes = fs.readFileSync(path.join(stateRoot, run, 'record.json'));
  const closedAt = JSON.parse(recordBytes.toString('utf8')).closedAt as string;
  const measures = stepMeasures(stepsBytes.toString('utf8').split('\n').filter((line) => line !== ''), closedAt);
  perRun[run] = { stepsSha256: sha(stepsBytes), recordSha256: sha(recordBytes), closedAt, stepMeasures: measures };
  if (measures.label !== 'Inferred') continue;
  const short = run.slice(4, 12);
  for (const kind of ['fidelity', 'design'] as const) {
    const rounds = measures.reviewRounds[kind];
    const codeRounds = rounds.state === 'counted' ? rounds.rounds : [];
    codeCompleted += codeRounds.filter((r) => r.ms !== null).length;
    for (const scriptRound of (figure[short]?.rounds ?? []).filter((r) => r.kind === kind)) {
      const position = codeRounds.findIndex((r) => r.round === scriptRound.round);
      const code = position === -1 ? undefined : codeRounds[position]!;
      const codeMinutes = code?.ms == null ? null : Math.round((code.ms / 60_000) * 100) / 100;
      const outcome = code !== undefined && codeMinutes === scriptRound.minutes && code.refusedSubmissions === scriptRound.refusedSubmissions ? 'agree'
        : code !== undefined && code.ms === null && position < codeRounds.length - 1 ? 'superseded-by-next-prompt' : 'differ';
      comparison.push({ run: short, kind, round: scriptRound.round, scriptMinutes: scriptRound.minutes, scriptRefused: scriptRound.refusedSubmissions,
        codeMinutes, codeRefused: code?.refusedSubmissions ?? null, outcome });
    }
  }
}
const record = {
  format: 'syzygy-5dhm-25-step-measures-stored/1',
  label: 'Inferred',
  basis: 'stepMeasures (packages/polaris-dossier/src/step-measures.ts) over each stored run\'s steps.jsonl, ending its wall time at its record.json closedAt; the stored runs were read only and nothing was written into them',
  subject: { runs: runs.length, figureRecord: path.basename(figureRecord), figureRecordSha256: sha(fs.readFileSync(figureRecord)) },
  comparisonWithFigureF: {
    figureFRounds: comparison.length,
    agree: comparison.filter((c) => c.outcome === 'agree').length,
    supersededByNextPrompt: comparison.filter((c) => c.outcome === 'superseded-by-next-prompt').length,
    differ: comparison.filter((c) => c.outcome === 'differ').length,
    codeCompletedRounds: codeCompleted,
    notAgreeing: comparison.filter((c) => c.outcome !== 'agree'),
  },
  perRun,
};
fs.writeFileSync(out, `${JSON.stringify(record, null, 2)}\n`);
console.log(`runs ${runs.length}; figure-f rounds ${comparison.length}; agree ${record.comparisonWithFigureF.agree}; superseded ${record.comparisonWithFigureF.supersededByNextPrompt}; differ ${record.comparisonWithFigureF.differ}; code completed ${codeCompleted}`);
