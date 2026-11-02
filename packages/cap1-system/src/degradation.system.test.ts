// RT6 system test 2 — honest degradation, proven against real disk:
// an empty fixture root serves the NAMED no-declaration arms on both
// channels, and altering the declaration between daemon runs changes
// the served facts to the named invalid arms — the daemon reads the
// filesystem, not a cache. All expected arm names are hard-coded
// literals.

import { mkdirSync, rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
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

describe('RT6 — honest degradation over real disk state', () => {
  it('an empty fixture root serves the named missing-declaration arm on both channels', async () => {
    const base = tempBase('syz-sys-empty-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    mkdirSync(fixtureRoot, { recursive: true });

    const daemon = await startDaemon({ fixtureRoot, stateDir: join(base, 'state') });
    cleanups.push(async () => {
      await daemon.stop();
    });

    // Human channel: the named degraded page, verbatim reason.
    const humanResponse = await fetch(`${daemon.baseUrl}/`);
    expect(humanResponse.status).toBe(200);
    const html = await humanResponse.text();
    expect(html).toContain('data-evaluation-kind="no-declaration-observed"');
    expect(html).toContain('missing-declaration');
    expect(html).toContain('No project evaluated');
    expect(html).toContain('data-epistemic-label="Unknown"');

    // Machine channel: the same named arm as JSON.
    const token = readCredential(daemon.credentialPath);
    const machineResponse = await fetch(`${daemon.baseUrl}/api/project`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(machineResponse.status).toBe(200);
    const body = (await machineResponse.json()) as {
      kind: string;
      declarationObservation: { kind: string; label: string; reason: string };
    };
    expect(body.kind).toBe('no-declaration-observed');
    expect(body.declarationObservation.kind).toBe('declaration-missing');
    expect(body.declarationObservation.label).toBe('Unknown');
    expect(body.declarationObservation.reason).toBe('missing-declaration');

    // The entry document is not read at all: with no declaration there is
    // no consented governance root (CAP1-REQ-016; syzygy-u2a.2). It is
    // served as Unknown with that reason, never a fabricated page, and in
    // its own not-read state rather than as unreadable (syzygy-s6cp).
    const entryResponse = await fetch(`${daemon.baseUrl}/entry`);
    expect(entryResponse.status).toBe(200);
    const entryHtml = await entryResponse.text();
    expect(entryHtml).toContain('data-entry-state="not-read"');
    expect(entryHtml).not.toContain('data-entry-state="unreadable"');
    expect(entryHtml).toContain('Unknown — reason: unconsented-source-or-provider');
  });

  it('breaking the declaration between runs changes the served facts to the named invalid arms', async () => {
    const base = tempBase('syz-sys-alter-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    const stateDir = join(base, 'state');
    writeCompleteFixture(fixtureRoot);

    // First run: the complete fixture evaluates.
    const first = await startDaemon({ fixtureRoot, stateDir });
    const firstHtml = await (await fetch(`${first.baseUrl}/`)).text();
    expect(firstHtml).toContain('data-evaluation-kind="project-evaluated"');
    expect(firstHtml).toContain('Project prj-sys-fixture');
    const firstToken = readCredential(first.credentialPath);
    const firstBody = (await (
      await fetch(`${first.baseUrl}/api/project`, {
        headers: { authorization: `Bearer ${firstToken}` },
      })
    ).json()) as { kind: string };
    expect(firstBody.kind).toBe('project-evaluated');
    expect(await first.stop()).toBe(0);

    // Break the declaration ON DISK: valid YAML, invalid declaration.
    writeFileSync(join(fixtureRoot, '.syzygy', 'project.yaml'), 'schema_version: "1"\n', 'utf8');

    // Second run over the same paths: the served facts CHANGE to the
    // named invalid arms — the daemon observed the altered disk.
    const second = await startDaemon({ fixtureRoot, stateDir });
    cleanups.push(async () => {
      await second.stop();
    });
    const secondHtml = await (await fetch(`${second.baseUrl}/`)).text();
    expect(secondHtml).toContain('data-evaluation-kind="declaration-invalid"');
    expect(secondHtml).toContain('Declaration read but invalid');
    expect(secondHtml).not.toContain('data-evaluation-kind="project-evaluated"');

    const secondToken = readCredential(second.credentialPath);
    const secondBody = (await (
      await fetch(`${second.baseUrl}/api/project`, {
        headers: { authorization: `Bearer ${secondToken}` },
      })
    ).json()) as { kind: string; failures: readonly { kind: string }[] };
    expect(secondBody.kind).toBe('declaration-invalid');
    expect(secondBody.failures.length).toBeGreaterThan(0);
  });
});
