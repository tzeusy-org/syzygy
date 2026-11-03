import { execFileSync } from 'node:child_process';
import { mkdirSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { proveSelfCorpus, readSelfCorpus } from './self-corpus.js';

// The same historical governed commit bound by the dated M7 evidence. Hosted
// checkout must retain it; substituting HEAD would change the denominator.
// Kept as an exact pin (syzygy-bpyt.4.5): the commit is the contract the M7
// record binds (docs/evidence/polaris-m7-synthetic-successor-2026-09-23.json),
// and node-ci.yml's fetch-depth: 0 is there to keep it in a hosted checkout.
const PINNED_MAIN = '133106eb0f2564f1cefddd19d11985f1b2619397';
// readSelfCorpus spawns one `git cat-file` per selected blob, over a hundred
// at the pinned commit (about 1-2 s alone). Measured worst case 7.8 s under
// the parallel-load protocol (syzygy-gb4l,
// docs/evidence/load-timeouts-gb4l-2026-10-03.json).
const PINNED_READ_TIMEOUT_MS = 60_000;

describe('zero-egress Syzygy self-corpus proof', () => {
  it('reads only tracked blobs from the pinned commit and independently recounts its denominator', () => {
    const corpus = readSelfCorpus(process.cwd(), PINNED_MAIN);
    const names = execFileSync('git', ['ls-tree', '-r', '--name-only', PINNED_MAIN, '--',
      '.syzygy/governance/doctrine', '.syzygy/governance/decisions', '.syzygy/governance/contracts/rfcs'], { encoding: 'utf8' }).trim().split('\n');
    const selected = names.filter(path => /^\.syzygy\/governance\/(?:doctrine\/[^/]+|decisions\/.+|contracts\/rfcs\/RFC-[^/]+\/[^/]+)\.md$/u.test(path));
    expect(corpus.count.selected).toBe(selected.length);
    expect(corpus.count.selected).toBeGreaterThan(100);
    expect(corpus.count.excludedMarkdown).toBe(2);
    expect(corpus.sources.map(source => source.path).sort()).toEqual(selected.sort());
    expect(corpus.sources.every(source => source.body !== undefined && source.spans.length === 1)).toBe(true);
    expect(corpus.over100000Characters).toBe(0);
  }, PINNED_READ_TIMEOUT_MS);

  it('refuses a 1 MB corpus budget without truncation or a scripted send, then completes on sufficient budget and isolates one source perturbation', async () => {
    const report = await proveSelfCorpus(process.cwd(), PINNED_MAIN);
    expect(report.budgetExhausted).toMatchObject({ status: 'stopped', reason: 'budget-exhausted', scriptedCalls: 0 });
    expect(report.sufficient.status).toBe('awaiting-rendered-review');
    expect(report.sufficient.stageInputs.map(entry => entry.stage)).toEqual(['inventory', 'plan', 'author', 'edit', 'fidelity']);
    expect(report.sufficient.stageInputs[0]!.inputBytes).toBeGreaterThan(1_000_000);
    expect(report.sufficient.stageInputs.slice(1).every(entry => entry.inputBytes < report.sufficient.stageInputs[0]!.inputBytes)).toBe(true);
    expect(report.perturbation).toMatchObject({ changedBlockIds: ['intro'], unchangedBlockIds: ['account-paragraph'], changedCitationCount: 1, unchangedCitationCount: 1 });
    expect(report.realProviderCalls).toBe(0);
    expect(report.networkCalls).toBe(0);
    expect(report.realProjectProof).toBe(false);
    expect(report.unmetReq014).toContain('two separately admitted real projects');
  }, 30_000); // the self-corpus proof over the real tree: timed out at the 5 s default in 2 of 5 full-suite runs at load1 38-71, up to 4.6 s in the others (docs/evidence/syzygy-bpyt-4-31/full-runs.json)

  it('refuses a requested pinned commit that is unavailable rather than substituting HEAD', () => {
    expect(() => readSelfCorpus(process.cwd(), '0'.repeat(40))).toThrow();
  });

  it('does not read a local or untracked file even when it lies in the allowed-looking path', () => {
    const root = tempDir('syzygy-self-corpus-fixture-');
    execFileSync('git', ['init', '-q', root]);
    execFileSync('git', ['-C', root, 'config', 'gc.auto', '0']);
    execFileSync('git', ['-C', root, 'config', 'maintenance.auto', 'false']);
    execFileSync('git', ['-C', root, 'config', 'user.email', 'fixture@example.invalid']);
    execFileSync('git', ['-C', root, 'config', 'user.name', 'Fixture']);
    const tracked = '.syzygy/governance/doctrine/vision.md';
    const untracked = '.syzygy/governance/doctrine/local.md';
    for (const [path, body] of [[tracked, '# Tracked vision\n'], [untracked, 'UNTRACKED-SENTINEL\n']] as const) {
      mkdirSync(dirname(join(root, path)), { recursive: true });
      writeFileSync(join(root, path), body);
    }
    execFileSync('git', ['-C', root, 'add', tracked]);
    execFileSync('git', ['-C', root, 'commit', '-qm', 'fixture']);
    const commit = execFileSync('git', ['-C', root, 'rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
    writeFileSync(join(root, tracked), 'LOCAL-EDIT-SENTINEL\n');
    const corpus = readSelfCorpus(root, commit);
    expect(corpus.count.selected).toBe(1);
    expect(corpus.sources[0]?.body).toBe('# Tracked vision\n');
    expect(JSON.stringify(corpus)).not.toContain('UNTRACKED-SENTINEL');
    expect(JSON.stringify(corpus)).not.toContain('LOCAL-EDIT-SENTINEL');
  });
});
