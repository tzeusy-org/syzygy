// syzygy-u2a.6 system test — the coverage boundary over a real daemon
// process and real disk. The complete fixture declares one repository; both
// channels must serve exactly one coverage row for it, citing the exact
// consent record the closed decision verified, with scope, attribution and
// grant state on the boundary itself (CAP1-REQ-010/011/015). A second run
// with an extra declared repository whose reference resolves nowhere must
// serve two rows, the second unconsented with its typed diagnostic. Every
// expected value is a literal of this file; the HTML is parsed here, never
// through the daemon's own modules.

import { createHash } from 'node:crypto';
import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FIXTURE_CONSENT_RECORD,
  FIXTURE_DECLARATION,
  readCredential,
  startDaemon,
  tempBase,
  writeCompleteFixture,
} from './harness.js';

const cleanups: (() => Promise<void> | void)[] = [];

afterEach(async () => {
  for (const cleanup of cleanups.splice(0).reverse()) {
    await cleanup();
  }
});

interface Served {
  readonly rows: readonly Record<string, unknown>[];
  readonly human: readonly Record<string, string>[];
}

async function serve(fixtureRoot: string, base: string): Promise<Served> {
  const daemon = await startDaemon({ fixtureRoot, stateDir: join(base, 'state') });
  cleanups.push(async () => {
    await daemon.stop();
  });
  const html = await (await fetch(`${daemon.baseUrl}/`)).text();
  const token = readCredential(daemon.credentialPath);
  const body = (await (
    await fetch(`${daemon.baseUrl}/api/project`, { headers: { authorization: `Bearer ${token}` } })
  ).json()) as { coverageBoundary: { records: Record<string, unknown>[] } };
  const section =
    html.match(/<section class="coverage" data-section="coverage-and-consent">[\s\S]*?<\/section>/)?.[0] ?? '';
  const human = [...section.matchAll(/<span class="coverage-record"([^>]*)>/g)].map(
    (match) => Object.fromEntries([...(match[1] ?? '').matchAll(/ ([a-z-]+)="([^"]*)"/g)].map((a) => [a[1], a[2]])) as Record<string, string>,
  );
  return { rows: body.coverageBoundary.records, human };
}

describe('syzygy-u2a.6 — reference-bound consent coverage on both channels', () => {
  it('one declared repository serves one row per channel, citing the exact consent record', async () => {
    const base = tempBase('syz-sys-coverage-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    const served = await serve(fixtureRoot, base);
    const digest = `sha256:${createHash('sha256').update(FIXTURE_CONSENT_RECORD).digest('hex')}`;
    expect(served.rows).toEqual([
      {
        repositoryId: 'repo-governance-root',
        state: 'observed',
        capturedScope: 'repository-root',
        consent: {
          reference: 'consent-gov-root',
          recordId: 'consent-gov-root',
          artifactDigest: digest,
          scope: 'observe',
          attribution: 'owner',
          grantState: 'in-force',
          provenance: 'owner-adopted (bootstrap, uncorrelated)',
        },
      },
    ]);
    expect(served.human).toHaveLength(1);
    expect(served.human[0]).toMatchObject({
      'data-repository-id': 'repo-governance-root',
      'data-coverage-state': 'observed',
      'data-consent-record-id': 'consent-gov-root',
      'data-consent-record-digest': digest,
      'data-consent-scope': 'observe',
      'data-consent-attribution': 'owner',
      'data-consent-grant-state': 'in-force',
      'data-consent-provenance': 'owner-adopted (bootstrap, uncorrelated)',
    });
  });

  it('a declared repository whose reference resolves nowhere is its own unconsented row, never omitted', async () => {
    const base = tempBase('syz-sys-coverage-dangling-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);
    writeFileSync(
      join(fixtureRoot, '.syzygy', 'project.yaml'),
      FIXTURE_DECLARATION.replace(
        'consents:\n',
        '  - id: repo-dangling\n    role: observed-source\n    consent: consent-dangling\nconsents:\n',
      ),
      'utf8',
    );

    const served = await serve(fixtureRoot, base);
    // A reference that resolves nowhere is unreadable evidence, so Task 1's
    // rule 4 refuses every pair: both rows are unconsented, each naming the
    // dangling reference — two rows over two declared repositories.
    expect(served.rows.map((row) => [row['repositoryId'], row['state'], row['diagnostic'], row['diagnosticReference']])).toEqual([
      ['repo-governance-root', 'unconsented', 'consent-evidence-unresolved', 'consent-dangling'],
      ['repo-dangling', 'unconsented', 'reference-unresolvable', 'consent-dangling'],
    ]);
    expect(served.human.map((row) => [row['data-repository-id'], row['data-coverage-state'], row['data-consent-diagnostic'], row['data-unknown-reason']])).toEqual([
      ['repo-governance-root', 'unconsented', 'consent-evidence-unresolved', 'unconsented-source-or-provider'],
      ['repo-dangling', 'unconsented', 'reference-unresolvable', 'unconsented-source-or-provider'],
    ]);
  });
});
