import { execFile } from 'node:child_process';
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';
import { promisify } from 'node:util';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { runSyntheticProject, syntheticProjects } from './pipeline-demo.js';

// Child processes run async (syzygy-w90k): a synchronous block over 60s
// starves vitest's worker RPC, which then fails the run with "Timeout calling
// onTaskUpdate" even though every test passed. execFile always pipes stdio.
const run = promisify(execFile);
// Onramp step budgets (syzygy-128g). The test budget is the sum of the inner
// timeouts so no step can outlive the test; the figures come from
// docs/evidence/pipeline-demo-onramp-budget-2026-10-15.json (max measured
// total 225 s at load1 55-90, about 2x margin). The documented command runs
// build:poc itself, so the onramp test does not build separately.
const ONRAMP_STEP_TIMEOUT_MS = { clone: 30_000, refusedRun: 30_000, install: 120_000, documented: 270_000 };
const ONRAMP_TEST_BUDGET_MS = Object.values(ONRAMP_STEP_TIMEOUT_MS).reduce((a, b) => a + b, 0);

describe('concrete source-to-draft pipeline exercise', () => {
  it('runs the same engine and schemas over two synthetic domains with prose, diagrams and component depth', async () => {
    const runs = await Promise.all(syntheticProjects.map(project => runSyntheticProject(project)));
    for (const run of runs) {
      expect(run.result.status).toBe('awaiting-rendered-review');
      if (run.result.status !== 'awaiting-rendered-review') throw Error(run.result.reason);
      expect(run.result.receipts.map(r => r.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
      expect(run.result.draft).toMatchObject({
        sections: [{ paragraphs: [{ id: 'mechanism-text', children: [{ id: 'mechanism-detail-0' }] }] }, { id: 'judgment' }],
        diagrams: [{ kind: 'flow', edges: [{ label: 'feed', epistemic: 'observed' }] }], deepDives: [{ id: 'component-depth' }],
      });
    }
    expect(runs[0]!.result.receipts.map(r => r.promptVersion)).toEqual(runs[1]!.result.receipts.map(r => r.promptVersion));
  });

  it('binds changed source meaning to fresh inventory, draft and fidelity inputs', async () => {
    const first = syntheticProjects[0]!;
    const a = await runSyntheticProject(first);
    const b = await runSyntheticProject({ ...first, qualification: `${first.qualification} Winter care has different timing.` });
    expect(a.result.status).toBe('awaiting-rendered-review');
    expect(b.result.status).toBe('awaiting-rendered-review');
    for (const stage of ['inventory', 'author', 'fidelity']) {
      expect(a.result.receipts.find(r => r.stage === stage)?.inputDigest).not.toBe(b.result.receipts.find(r => r.stage === stage)?.inputDigest);
    }
    expect(a.result.receipts.find(r => r.stage === 'author')?.outputDigest).not.toBe(b.result.receipts.find(r => r.stage === 'author')?.outputDigest);
  });

  it('runs the README command after a clean install and requires exactly seven synthetic output files', async () => {
    const readme = readFileSync(join(process.cwd(), 'packages/polaris-generation-core/README.md'), 'utf8');
    expect(JSON.parse(readFileSync(join(process.cwd(), 'package.json'), 'utf8')).scripts['build:poc']).toContain('packages/polaris-generation-core');
    const commands = /```sh\n(npm ci)\n(npm run poc:generator-demo -- --out [^\n]+)\n```/.exec(readme);
    if (commands?.[1] === undefined || commands[2] === undefined) throw new Error('README install onramp missing');
    const scratch = tempDir('syzygy-generator-onramp-');
    const checkout = join(scratch, 'checkout');
    const output = join(scratch, 'outputs');
    await run('git', ['clone', '--quiet', '--local', '--no-hardlinks', process.cwd(), checkout], { timeout: ONRAMP_STEP_TIMEOUT_MS.clone });
    const argv = commands[2].split(' ');
    expect(argv.slice(0, 5)).toEqual(['npm', 'run', 'poc:generator-demo', '--', '--out']);
    const documented = [argv[0]!, ...argv.slice(1, -1), output];
    try {
      await run(documented[0]!, documented.slice(1), { cwd: checkout, timeout: ONRAMP_STEP_TIMEOUT_MS.refusedRun });
      throw new Error('missing install unexpectedly succeeded');
    } catch (error) {
      if (error instanceof Error && error.message === 'missing install unexpectedly succeeded') throw error;
      expect((error as { stderr?: string }).stderr).toContain('npm ci');
    }
    await run('npm', commands[1].split(' ').slice(1), { cwd: checkout, timeout: ONRAMP_STEP_TIMEOUT_MS.install });
    await run(documented[0]!, documented.slice(1), { cwd: checkout, timeout: ONRAMP_STEP_TIMEOUT_MS.documented });
    expect(readdirSync(output).sort()).toEqual(['archive.html', 'archive.json', 'garden-changed.html', 'garden-changed.json', 'garden.html', 'garden.json', 'report.json']);
  }, ONRAMP_TEST_BUDGET_MS);

  it('repeats the complete SEC-2 operator boundary at every prompt-handling site', () => {
    const boundary = 'This kit grants no source access, provider egress, authorship adoption or release.';
    for (const file of ['docs/polaris-generation/README.md', 'docs/polaris-generation/AUTHORING.md', 'docs/polaris-generation/ARTIFACTS-AND-TOOLS.md']) {
      expect(readFileSync(join(process.cwd(), file), 'utf8'), file).toContain(boundary);
    }
  });

  it('names the future egress decision fields and current no-provider-call boundary without treating them as an act', () => {
    const kit = readFileSync(join(process.cwd(), 'docs/polaris-generation/README.md'), 'utf8');
    expect(kit).toContain('A future\n   egress decision must also name the destination route and retention for sent\n   content and replies');
    expect(kit).toContain('The current operator path calls no real model or provider.');
    expect(kit).toContain('it would not adopt prose, authorize a repository');
  });
});
