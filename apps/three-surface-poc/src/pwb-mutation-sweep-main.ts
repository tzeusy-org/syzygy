// PWB mutation sweep runner — task 4.2 (syzygy-1z3.18).
//
// Runs every group of `pwb-mutation-sweep.ts`: for each mutation it (1)
// rewrites exactly that fragment or predicate, (2) runs the group's
// independent test files with the JSON reporter, (3) restores the original
// bytes and verifies their digest, and (4) records whether the tests that
// must fail did fail. One evidence file under `docs/evidence/` carries every
// class's denominator; the bead closes on it.
//
// Only Syzygy's own sources are rewritten — never a Butlers repository —
// and no mutation outlives the run: restoration is in a `finally` and every
// subject's digest is compared before and after.
//
//   npm run poc:pwb-mutation-sweep                  # every group
//   npm run poc:pwb-mutation-sweep -- --group parity-markers
//   npm run poc:pwb-mutation-sweep -- --only detect-none

import { execFileSync, spawnSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { INVALID_CASE_IDS } from '@syzygy/three-surface-poc-core';
import { sha256 } from '@syzygy/support';

import { applyMutation, expectedFailuresForPredicate, type Mutation, type PredicateMutation } from './pwb-mutation.js';
import { SWEEP_CLASSES, SWEEP_GROUPS, groupSubjectFiles, judgmentExpectedFailures, listGroupPredicateMutations, type SweepGroup } from './pwb-mutation-sweep.js';

const REPO_ROOT = fileURLToPath(new URL('../../../', import.meta.url));

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

function runTests(scratch: string, label: string, testFiles: readonly string[]): TestRun {
  const outputFile = join(scratch, `${label}.json`);
  spawnSync('npx', ['vitest', 'run', ...testFiles, '--reporter=json', `--outputFile=${outputFile}`], {
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

function workingTreeStatus(files: readonly string[]): readonly string[] {
  return execFileSync('git', ['-C', REPO_ROOT, 'status', '--porcelain', '--', ...files], { encoding: 'utf8' })
    .split('\n')
    .filter((line) => line.trim() !== '');
}

interface Args {
  readonly only: string | undefined;
  readonly group: string | undefined;
  readonly date: string;
}

function parseArgs(argv: readonly string[]): Args {
  let only: string | undefined;
  let group: string | undefined;
  let date = new Date().toISOString().slice(0, 10);
  for (let index = 0; index < argv.length; index += 1) {
    const arg = argv[index];
    if (arg === '--only') only = argv[index + 1];
    if (arg === '--group') group = argv[index + 1];
    if (arg === '--date') date = argv[index + 1] ?? date;
    if (arg === '--only' || arg === '--group' || arg === '--date') index += 1;
  }
  return { only, group, date };
}

function expectedFailures(group: SweepGroup, mutation: Mutation): readonly string[] {
  if (mutation.kind === 'literal') return mutation.mustFail;
  const subject = group.predicateSubjects.find((s) => s.file === mutation.file);
  if (subject === undefined) throw new Error(`${mutation.id}: no predicate subject in group ${group.id}`);
  return subject.naming === 'judgment-case'
    ? judgmentExpectedFailures(mutation as PredicateMutation)
    : expectedFailuresForPredicate(mutation as PredicateMutation, INVALID_CASE_IDS);
}

interface MutationResult {
  readonly id: string;
  readonly kind: Mutation['kind'];
  readonly file: string;
  readonly caseName?: string;
  readonly line?: number;
  readonly description?: string;
  readonly mustFail: readonly string[];
  readonly observed: { readonly total: number; readonly passed: number; readonly failed: number };
  readonly mustFailMissing: readonly string[];
  readonly failing: readonly string[];
  readonly killed: boolean;
  readonly restored: boolean;
}

function main(): number {
  const { only, group: onlyGroup, date } = parseArgs(process.argv.slice(2));
  const groups = SWEEP_GROUPS.filter((group) => onlyGroup === undefined || group.id === onlyGroup);
  if (groups.length === 0) {
    process.stderr.write(`no group matches ${onlyGroup ?? '(all)'}\n`);
    return 2;
  }

  // Every subject any selected group may rewrite, loaded once and restored
  // once more at the very end whatever happened in between.
  const sources = new Map<string, Uint8Array>();
  for (const group of groups) {
    for (const file of groupSubjectFiles(group)) {
      if (!sources.has(file)) sources.set(file, new Uint8Array(readFileSync(join(REPO_ROOT, file))));
    }
  }
  const originalDigests = Object.fromEntries([...sources].map(([file, bytes]) => [file, sha256(bytes)]));
  const readSource = (file: string): string => {
    const bytes = sources.get(file);
    if (bytes === undefined) throw new Error(`no source loaded for ${file}`);
    return new TextDecoder().decode(bytes);
  };
  const testFiles = [...new Set(groups.flatMap((group) => group.testFiles))];

  const scratch = mkdtempSync(join(tmpdir(), 'pwb-mutation-sweep-'));
  const groupReports: unknown[] = [];
  let planned = 0;
  let survived = 0;
  let restoreFailures = 0;
  const perClass: Record<string, { planned: number; killed: number }> = Object.fromEntries(SWEEP_CLASSES.map((c) => [c, { planned: 0, killed: 0 }]));
  try {
    for (const group of groups) {
      const predicates = listGroupPredicateMutations(group, readSource);
      const plan: readonly Mutation[] = [...predicates, ...group.literals].filter(
        (mutation) => only === undefined || mutation.id === only || mutation.id.endsWith(`#${only}`),
      );
      if (plan.length === 0) continue;

      const baseline = runTests(scratch, `${group.id}-baseline`, group.testFiles);
      if (baseline.failed !== 0 || baseline.total === 0) {
        process.stderr.write(`${group.id}: baseline is not green: ${baseline.passed}/${baseline.total} passed\n`);
        return 3;
      }
      process.stdout.write(`${group.id}: baseline ${baseline.passed}/${baseline.total} passed; ${plan.length} mutations\n`);

      const results: MutationResult[] = [];
      let groupSurvived = 0;
      for (const [index, mutation] of plan.entries()) {
        const original = sources.get(mutation.file);
        if (original === undefined) throw new Error(`no source loaded for ${mutation.file}`);
        const mutated = applyMutation(new TextDecoder().decode(original), mutation);
        const mustFail = expectedFailures(group, mutation);
        const absolute = join(REPO_ROOT, mutation.file);
        let run: TestRun;
        try {
          writeFileSync(absolute, mutated);
          run = runTests(scratch, `${group.id}-${index}`, group.testFiles);
        } finally {
          writeFileSync(absolute, original);
        }
        const restored = sha256(new Uint8Array(readFileSync(absolute))) === originalDigests[mutation.file];
        if (!restored) restoreFailures += 1;
        const missing = mustFail.filter((name) => !run.failing.some((failing) => failing.includes(name)));
        const killed = run.failed > 0 && missing.length === 0;
        if (!killed) groupSurvived += 1;
        results.push({
          id: mutation.id,
          kind: mutation.kind,
          file: mutation.file,
          ...(mutation.kind === 'disable-predicate' ? { caseName: mutation.caseName, line: mutation.line } : { description: mutation.description }),
          mustFail,
          observed: { total: run.total, passed: run.passed, failed: run.failed },
          mustFailMissing: missing,
          failing: run.failing.slice(0, 8),
          killed,
          restored,
        });
        process.stdout.write(
          `${killed ? 'killed  ' : 'SURVIVED'} ${group.id} ${mutation.id} (${run.failed} failing${missing.length > 0 ? `; missing ${missing.join(', ')}` : ''})\n`,
        );
      }
      planned += plan.length;
      survived += groupSurvived;
      const cls = perClass[group.sweepClass];
      if (cls !== undefined) {
        cls.planned += plan.length;
        cls.killed += plan.length - groupSurvived;
      }
      groupReports.push({
        id: group.id,
        sweepClass: group.sweepClass,
        requirement: group.requirement,
        description: group.description,
        testFiles: group.testFiles,
        baseline: { total: baseline.total, passed: baseline.passed, failed: baseline.failed },
        predicateSites: predicates.length,
        literalMutations: group.literals.length,
        planned: plan.length,
        killed: plan.length - groupSurvived,
        survived: groupSurvived,
        mutations: results,
      });
    }

    const evidence = {
      subject: 'PWB mutation sweep — task 4.2 (docs/PWB-IMPLEMENTATION-PLAN.md; PWB-REQ-001/002/003/004/005/010/012/020/022)',
      date,
      commit: gitHead(),
      uncommittedChanges: workingTreeStatus([...sources.keys(), ...testFiles]),
      method:
        'For each group: run its test files green as the baseline; for each mutation write exactly one predicate disabling or exact-fragment replacement into the subject, run the same test files with the vitest JSON reporter, restore the original bytes and verify sha256 equality. Killed = at least one test failed and every named must-fail test is among the failures.',
      sourceDigestsBefore: originalDigests,
      sourceDigestsAfter: Object.fromEntries([...sources.keys()].map((file) => [file, sha256(new Uint8Array(readFileSync(join(REPO_ROOT, file))))])),
      classes: perClass,
      groups: groupReports,
      summary: { groups: groupReports.length, planned, killed: planned - survived, survived, restoreFailures },
    };
    const evidenceDir = join(REPO_ROOT, 'docs', 'evidence');
    mkdirSync(evidenceDir, { recursive: true });
    const suffix = [onlyGroup, only].filter((s): s is string => s !== undefined).map((s) => s.replace(/[^a-z0-9-]/gi, '_')).join('-');
    const evidencePath = join(evidenceDir, `pwb-p4-2-mutation-sweep-${date}${suffix === '' ? '' : `-${suffix}`}.json`);
    writeFileSync(evidencePath, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`evidence: ${resolve(evidencePath)}\n`);
    process.stdout.write(`summary: ${evidence.summary.killed}/${planned} killed, ${survived} survived, ${restoreFailures} restore failures\n`);
    return survived === 0 && restoreFailures === 0 ? 0 : 1;
  } finally {
    for (const [file, bytes] of sources) writeFileSync(join(REPO_ROOT, file), bytes);
    rmSync(scratch, { recursive: true, force: true });
  }
}

process.exitCode = main();
