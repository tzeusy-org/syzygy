// RT6 system test 4 — the write boundary observed EXTERNALLY
// (CAP1-REQ-023/053/061): the harness's own recursive filesystem
// sweep, taken before daemon start and after requests to every route,
// establishes the write population. The daemon's self-report plays no
// part. Oracle: the only additions live under the state directory;
// nothing anywhere is modified or deleted; the governed tree
// (openspec/**, .syzygy/**) is byte-identical, compared file by file
// with an enumerated denominator.

import { rmSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import {
  FIXTURE_DECLARATION,
  readCredential,
  snapshotTree,
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

describe('RT6 — write boundary by harness-external filesystem observation', () => {
  it.each([
    { placement: 'at the declaration root', prefix: '' },
    { placement: 'under declarations', prefix: 'declarations.' },
  ])('routes widening fields $placement to the owner on both surfaces', async ({ prefix }) => {
    const base = tempBase('syz-sys-widening-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    writeCompleteFixture(fixtureRoot);

    const names = ['write_roots', 'writable_paths', 'write_paths', 'output_directory', 'deploy_target'];
    const inertValue = 'widening-fixture-placeholder';
    const indent = prefix ? '  ' : '';
    const fields = names.map((name) => `${indent}${name}: ${inertValue}\n`).join('');
    const declaration = prefix
      ? FIXTURE_DECLARATION.replace('declarations:\n', `declarations:\n${fields}`)
      : FIXTURE_DECLARATION + fields;
    writeFileSync(join(fixtureRoot, '.syzygy', 'project.yaml'), declaration, 'utf8');
    const before = snapshotTree(fixtureRoot);

    const daemon = await startDaemon({ fixtureRoot, stateDir: join(base, 'state') });
    cleanups.push(async () => {
      await daemon.stop();
    });
    const token = readCredential(daemon.credentialPath);
    const human = await fetch(daemon.baseUrl);
    const machine = await fetch(`${daemon.baseUrl}/api/project`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(human.status).toBe(200);
    expect(machine.status).toBe(200);

    const html = await human.text();
    const rawMachine = await machine.text();
    const detail = 'This field cannot widen the governed write boundary. Route this contradiction to the owner.';
    expect(html).toContain('data-evaluation-kind="declaration-invalid"');
    for (const name of names) {
      expect(html).toContain(
        `<li data-failure-kind="write-boundary-contradiction">write-boundary-contradiction (${prefix}${name}): ${detail}</li>`,
      );
    }
    expect(JSON.parse(rawMachine)).toEqual({
      kind: 'declaration-invalid',
      failures: names.map((name) => ({
        kind: 'write-boundary-contradiction',
        field: prefix + name,
        routedTo: 'owner',
        detail,
      })),
    });
    expect(html).not.toContain(inertValue);
    expect(rawMachine).not.toContain(inertValue);

    expect(await daemon.stop()).toBe(0);
    expect(snapshotTree(fixtureRoot)).toEqual(before);
  });

  it('after requests to all routes, the only filesystem additions live under the state dir and the governed tree is untouched', async () => {
    const base = tempBase('syz-sys-wb-');
    cleanups.push(() => rmSync(base, { recursive: true, force: true }));
    const fixtureRoot = join(base, 'fixture');
    const stateBase = join(base, 'state-base');
    const stateDir = join(stateBase, 'daemon-state');
    writeCompleteFixture(fixtureRoot);

    // BEFORE: the harness's own external record of the entire fixture
    // root and the state-dir base — the write population's baseline.
    const before = snapshotTree(base);
    expect(before.size).toBeGreaterThan(0);

    const daemon = await startDaemon({ fixtureRoot, stateDir });
    cleanups.push(async () => {
      await daemon.stop();
    });
    const token = readCredential(daemon.credentialPath);

    // Several requests to ALL routes: human page, entry document,
    // machine endpoint (refused and admitted), and an unknown route.
    for (let round = 0; round < 3; round++) {
      expect((await fetch(`${daemon.baseUrl}/`)).status).toBe(200);
      expect((await fetch(`${daemon.baseUrl}/entry`)).status).toBe(200);
      expect((await fetch(`${daemon.baseUrl}/api/project`)).status).toBe(401);
      expect(
        (
          await fetch(`${daemon.baseUrl}/api/project`, {
            headers: { authorization: `Bearer ${token}` },
          })
        ).status,
      ).toBe(200);
      expect((await fetch(`${daemon.baseUrl}/no-such-route`)).status).toBe(404);
    }

    expect(await daemon.stop()).toBe(0);

    // AFTER: the same external sweep.
    const after = snapshotTree(base);

    // Additions: every path present after but not before must live
    // under the state dir. Enumerated, never a boolean.
    const stateDirPrefix = 'state-base/daemon-state/';
    const additions = [...after.keys()].filter((key) => !before.has(key));
    const strayAdditions = additions.filter((key) => !key.startsWith(stateDirPrefix));
    expect(strayAdditions).toEqual([]);
    // The daemon did write its credential — the addition set is
    // non-empty and entirely in-plane.
    expect(additions.length).toBeGreaterThan(0);
    expect(additions).toContain('state-base/daemon-state/machine-credential.token');

    // Deletions: nothing observed before may vanish.
    const deletions = [...before.keys()].filter((key) => !after.has(key));
    expect(deletions).toEqual([]);

    // Modifications: no pre-existing file anywhere changed content,
    // size, or mtime. Sweep over the FULL before-population — the
    // denominator is every file that existed before daemon start.
    let compared = 0;
    const modified: string[] = [];
    for (const [key, record] of before) {
      const afterRecord = after.get(key);
      if (
        afterRecord === undefined ||
        afterRecord.sha256 !== record.sha256 ||
        afterRecord.size !== record.size ||
        afterRecord.mtimeMs !== record.mtimeMs
      ) {
        modified.push(key);
      }
      compared += 1;
    }
    expect(modified).toEqual([]);
    expect(compared).toBe(before.size);

    // The governed tree specifically (CAP1-REQ-023/061): both
    // namespaces are present in the population and unchanged. A sweep
    // needs a denominator — assert the governed population is non-empty
    // and covers both openspec/ and .syzygy/.
    const governed = [...before.keys()].filter(
      (key) => key.startsWith('fixture/openspec/') || key.startsWith('fixture/.syzygy/'),
    );
    expect(governed.length).toBeGreaterThanOrEqual(4);
    expect(governed.some((key) => key.startsWith('fixture/openspec/'))).toBe(true);
    expect(governed.some((key) => key.startsWith('fixture/.syzygy/'))).toBe(true);
    for (const key of governed) {
      expect(after.get(key)?.sha256).toBe(before.get(key)?.sha256);
      expect(after.get(key)?.mtimeMs).toBe(before.get(key)?.mtimeMs);
    }
  });
});
