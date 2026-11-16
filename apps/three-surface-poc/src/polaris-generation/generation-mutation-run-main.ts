// polaris-generation-core mutation runner — bead syzygy-u05.11 slice 2's
// rule-6 mutation proof for `canonical-json.ts`, `parse-json.ts`,
// `pipeline.ts` and `provider-draft.ts` (one of whose guards now lives in
// `draft-model.ts`).
//
// For every hand-listed literal mutation in `generation-mutation.ts`, this
// runner: (1) mutates exactly that fragment, (2) runs the independent
// generation-core test files, (3) restores the original bytes and verifies
// their digest, and (4) records whether the tests that must fail did fail.
// The evidence file under `docs/evidence/` carries each mutant's exact
// `from`/`to` fragment and the commit the run executed at (not only ids and
// outcomes), per the AGENTS.md rule-6 evidence-record guardrail.
//
// It reads and rewrites only this repository's own source files, and never
// leaves a mutation behind: restoration runs in a `finally` and is
// digest-verified.
//
//   npm run poc:generation-mutation-run
//   npm run poc:generation-mutation-run -- --only canonical-json-cycle-check-disabled

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { sha256 } from '@syzygy/support';

import { GENERATION_LITERAL_MUTATIONS, applyLiteralMutation, type LiteralMutation } from './generation-mutation.js';

const REPO_ROOT = fileURLToPath(new URL('../../../../', import.meta.url));
const TEST_FILES = [
  'packages/polaris-generation-core/src/canonical-json.test.ts',
  'packages/polaris-generation-core/src/parse-json.test.ts',
  'packages/polaris-generation-core/src/pipeline.test.ts',
  'packages/polaris-generation-core/src/provider-draft.test.ts',
] as const;

interface VitestJson {
  readonly numTotalTests: number;
  readonly numPassedTests: number;
  readonly numFailedTests: number;
  readonly testResults: readonly {
    readonly assertionResults: readonly { readonly fullName: string; readonly status: string }[];
  }[];
}

interface TestRun {
  readonly total: number;
  readonly passed: number;
  readonly failed: number;
  readonly failing: readonly string[];
}

function runTests(scratch: string, label: string): TestRun {
  const outputFile = join(scratch, `${label}.json`);
  spawnSync('npx', ['vitest', 'run', ...TEST_FILES, '--reporter=json', `--outputFile=${outputFile}`], {
    cwd: REPO_ROOT,
    stdio: ['ignore', 'ignore', 'ignore'],
    env: { ...process.env, CI: '1' },
  });
  const report = JSON.parse(readFileSync(outputFile, 'utf8')) as VitestJson;
  const failing = report.testResults
    .flatMap((file) => file.assertionResults)
    .filter((test) => test.status === 'failed')
    .map((test) => test.fullName);
  return { total: report.numTotalTests, passed: report.numPassedTests, failed: report.numFailedTests, failing };
}

function gitHead(): string {
  return execFileSync('git', ['-C', REPO_ROOT, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
}

// Uncommitted changes among the mutated sources and the test files; a run is
// evidence only when this list is empty (the plan forbids dirty runs).
function workingTreeStatus(files: readonly string[]): readonly string[] {
  return execFileSync('git', ['-C', REPO_ROOT, 'status', '--porcelain', '--', ...files], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.trim() !== '');
}

function parseArgs(argv: readonly string[]): { readonly only: string | undefined; readonly date: string } {
  let only: string | undefined;
  let date = new Date().toISOString().slice(0, 10);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--only') only = argv[index + 1];
    if (arg === '--date') date = argv[index + 1] ?? date;
    if (arg === '--only' || arg === '--date') index += 1;
  }
  return { only, date };
}

function main(): number {
  const { only, date } = parseArgs(process.argv.slice(2));
  const files = [...new Set(GENERATION_LITERAL_MUTATIONS.map((mutation) => mutation.file))];
  const sources = new Map<string, Uint8Array>();
  for (const file of files) {
    sources.set(file, new Uint8Array(readFileSync(join(REPO_ROOT, file))));
  }
  const originalDigests = Object.fromEntries([...sources].map(([file, bytes]) => [file, sha256(bytes)]));

  const plan: readonly LiteralMutation[] = GENERATION_LITERAL_MUTATIONS.filter(
    (mutation) => only === undefined || mutation.id === only,
  );
  if (plan.length === 0) {
    process.stderr.write(`no mutation matches ${only ?? '(all)'}\n`);
    return 2;
  }

  const scratch = mkdtempSync(join(tmpdir(), 'generation-mutation-'));
  const results: unknown[] = [];
  let survived = 0;
  let restoreFailures = 0;
  try {
    const baseline = runTests(scratch, 'baseline');
    if (baseline.failed !== 0 || baseline.total === 0) {
      process.stderr.write(`baseline is not green: ${baseline.passed}/${baseline.total} passed\n`);
      return 3;
    }
    process.stdout.write(`baseline: ${baseline.passed}/${baseline.total} passed; ${plan.length} mutations\n`);

    for (const [index, mutation] of plan.entries()) {
      const original = sources.get(mutation.file);
      if (original === undefined) throw new Error(`no source loaded for ${mutation.file}`);
      const mutated = applyLiteralMutation(new TextDecoder().decode(original), mutation);
      let run: TestRun;
      const absolute = join(REPO_ROOT, mutation.file);
      try {
        writeFileSync(absolute, mutated);
        run = runTests(scratch, `mutation-${index}`);
      } finally {
        writeFileSync(absolute, original);
      }
      const restoredDigest = sha256(new Uint8Array(readFileSync(absolute)));
      const restored = restoredDigest === originalDigests[mutation.file];
      if (!restored) restoreFailures += 1;
      const missing = mutation.mustFail.filter((name) => !run.failing.some((failing) => failing.includes(name)));
      const killed = run.failed > 0 && missing.length === 0;
      if (!killed) survived += 1;
      results.push({
        id: mutation.id,
        kind: mutation.kind,
        file: mutation.file,
        description: mutation.description,
        old: mutation.from,
        new: mutation.to,
        mustFail: mutation.mustFail,
        observed: { total: run.total, passed: run.passed, failed: run.failed },
        mustFailMissing: missing,
        killed,
        restored,
      });
      process.stdout.write(
        `${killed ? 'killed  ' : 'SURVIVED'} ${mutation.id} (${run.failed} failing${missing.length > 0 ? `; missing ${missing.join(', ')}` : ''})\n`,
      );
    }

    const evidence = {
      subject: 'polaris-generation-core mutation gate (bead syzygy-u05.11 slice 2)',
      date,
      commit: gitHead(),
      uncommittedChanges: workingTreeStatus([...sources.keys(), ...TEST_FILES]),
      testFiles: TEST_FILES,
      baseline: { total: baseline.total, passed: baseline.passed, failed: baseline.failed },
      sourceDigestsBefore: originalDigests,
      sourceDigestsAfter: Object.fromEntries(
        [...sources.keys()].map((file) => [file, sha256(new Uint8Array(readFileSync(join(REPO_ROOT, file))))]),
      ),
      mutations: results,
      summary: {
        planned: plan.length,
        literalMutations: GENERATION_LITERAL_MUTATIONS.length,
        killed: plan.length - survived,
        survived,
        restoreFailures,
      },
    };
    const evidenceDir = join(REPO_ROOT, 'docs', 'evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const evidencePath = join(
      evidenceDir,
      `polaris-generation-core-mutation-run-${date}${only === undefined ? '' : `-${only.replace(/[^a-z0-9-]/gi, '_')}`}.json`,
    );
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`evidence: ${resolve(evidencePath)}\n`);
    process.stdout.write(`summary: ${evidence.summary.killed}/${plan.length} killed, ${survived} survived, ${restoreFailures} restore failures\n`);
    return survived === 0 && restoreFailures === 0 ? 0 : 1;
  } finally {
    for (const [file, bytes] of sources) writeFileSync(join(REPO_ROOT, file), bytes);
    rmSync(scratch, { recursive: true, force: true });
  }
}

process.exitCode = main();
