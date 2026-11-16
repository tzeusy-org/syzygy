// PWB mutation runner — the PWB-REQ-005 mutation proof (task §2.5).
//
// For every predicate site marked `// mutation-point:` in the evaluator
// and the observer gate, and for every hand-listed literal mutation, this
// runner: (1) mutates exactly that site, (2) runs the independent tests,
// (3) restores the original bytes and verifies their digest, and (4)
// records whether the tests that must fail did fail. The evidence file
// under `docs/evidence/` is what the bead closes on.
//
// It reads and rewrites only Syzygy's own source files, never a Butlers
// repository, and never leaves a mutation behind: restoration runs in a
// `finally` and is digest-verified.
//
//   npm run poc:pwb-mutation-run            # writes docs/evidence/pwb-mutation-run-<date>.json
//   npm run poc:pwb-mutation-run -- --only exact-state-collapse

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVALID_CASE_IDS } from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import {
  CORE_SOURCE,
  LITERAL_MUTATIONS,
  OBSERVER_SOURCE,
  applyMutation,
  expectedFailuresForPredicate,
  listPredicateMutations,
  type Mutation,
} from './pwb-mutation.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));
const TEST_FILES = [
  'packages/three-surface-poc-core/src/body-read-authority.test.ts',
  'apps/three-surface-poc/src/governance-inputs.test.ts',
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

// Uncommitted changes among the mutated sources and the test files; a run
// is evidence only when this list is empty (the plan forbids dirty runs).
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
  const sources = new Map<string, Uint8Array>();
  for (const file of [CORE_SOURCE, OBSERVER_SOURCE, ...new Set(LITERAL_MUTATIONS.map((mutation) => mutation.file))]) {
    sources.set(file, new Uint8Array(readFileSync(join(REPO_ROOT, file))));
  }
  const originalDigests = Object.fromEntries([...sources].map(([file, bytes]) => [file, sha256(bytes)]));

  const predicateMutations = [
    ...listPredicateMutations(CORE_SOURCE, new TextDecoder().decode(sources.get(CORE_SOURCE))),
    ...listPredicateMutations(OBSERVER_SOURCE, new TextDecoder().decode(sources.get(OBSERVER_SOURCE))),
  ];
  const plan: readonly Mutation[] = [...predicateMutations, ...LITERAL_MUTATIONS].filter(
    (mutation) => only === undefined || mutation.id === only || mutation.id.endsWith(`#${only}`),
  );
  if (plan.length === 0) {
    process.stderr.write(`no mutation matches ${only ?? '(all)'}\n`);
    return 2;
  }

  const scratch = mkdtempSync(join(tmpdir(), 'pwb-mutation-'));
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
      const mutated = applyMutation(new TextDecoder().decode(original), mutation);
      const mustFail =
        mutation.kind === 'disable-predicate' ? expectedFailuresForPredicate(mutation, INVALID_CASE_IDS) : mutation.mustFail;
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
      const missing = mustFail.filter((name) => !run.failing.some((failing) => failing.includes(name)));
      const killed = run.failed > 0 && missing.length === 0;
      if (!killed) survived += 1;
      results.push({
        id: mutation.id,
        kind: mutation.kind,
        file: mutation.file,
        ...(mutation.kind === 'disable-predicate'
          ? { caseName: mutation.caseName, line: mutation.line }
          : { description: mutation.description }),
        mustFail,
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
      subject: 'PWB-REQ-005 mutation proof (docs/PWB-IMPLEMENTATION-PLAN.md task 2.5)',
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
        predicateSites: predicateMutations.length,
        literalMutations: LITERAL_MUTATIONS.length,
        killed: plan.length - survived,
        survived,
        restoreFailures,
      },
    };
    const evidenceDir = join(REPO_ROOT, 'docs', 'evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const evidencePath = join(evidenceDir, `pwb-mutation-run-${date}${only === undefined ? '' : `-${only.replace(/[^a-z0-9-]/gi, '_')}`}.json`);
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
