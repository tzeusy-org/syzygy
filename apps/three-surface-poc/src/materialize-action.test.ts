import { mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import {
  BUTLERS_POC_SEEDS,
  buildPocModel,
  readMaterializationRecordFile,
  type DispatchDisclosure,
  type EffectAuthorityVerdict,
  type PocModel,
} from '@syzygy/three-surface-poc-core';

import { TAILNET_HOST } from './browser-origin.js';
import {
  MATERIALIZE_HUMAN_PATH,
  buildTrajectoryMaterializationPacket,
  materializeRoutes,
  renderMaterializePanel,
} from './materialize-action.js';
import { POC_MACHINE_PATH, pocRoutes } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { fetchWithHost } from './test-http-client.js';
import { buildFixtureModel, fixtureRepoWithGit } from './test-model-fixture.js';
import { renderTrajectoryPage } from './trajectory.js';

/** Seeds naming a repository with no materialization support: the builder
 * then serves no dispatch, the one state the action must refuse. */
const UNSUPPORTED_REPOSITORY_SEEDS = {
  ...BUTLERS_POC_SEEDS,
  project: { ...BUTLERS_POC_SEEDS.project, repositoryId: 'repository:unsupported-poc' },
};

const cleanups: string[] = [];
const running: RunningDaemon[] = [];

afterEach(async () => {
  for (const daemon of running.splice(0)) {
    await daemon.close().catch(() => undefined);
  }
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function tempDir(prefix: string): string {
  const directory = mkdtempSync(join(tmpdir(), prefix));
  cleanups.push(directory);
  return directory;
}

// Test-only: the wired create path stays covered by injecting the verdict
// a future owner act would have to produce. Production never passes it.
const AUTHORIZED: EffectAuthorityVerdict = { authorized: true, effect: 'butlers-tracker-write' };

function decodeHtmlText(value: string): string {
  return value
    .replace(/<[^>]*>/g, '')
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>')
    .replace(/&quot;/g, '"')
    .replace(/&#39;/g, "'");
}

function parityField(html: string, field: string): string {
  const match = new RegExp(`data-parity-field="${field}">([\\s\\S]*?)<\\/dd>`).exec(html);
  if (match?.[1] === undefined) throw new Error(`missing Trajectory parity field: ${field}`);
  return decodeHtmlText(match[1]);
}

function assertDispatchParity(
  html: string,
  dispatch: DispatchDisclosure,
): {
  readonly top: readonly [number, number];
  readonly leaves: readonly [number, number];
  readonly state: readonly [number, number];
  readonly machineOnly: readonly string[];
} {
  const governing = /^(\S+) \((.+)\)$/.exec(parityField(html, 'materialize-governing-intent'));
  if (governing === null) throw new Error('malformed Trajectory governing-intent field');
  const typePriority = /^(.+) \/ P(\d+)$/.exec(parityField(html, 'materialize-type-priority'));
  if (typePriority === null) throw new Error('malformed Trajectory type-priority field');
  const rendered = {
    title: parityField(html, 'materialize-title'),
    description: parityField(html, 'materialize-description'),
    labels: parityField(html, 'materialize-labels').split(', '),
    issueType: typePriority[1] as string,
    priority: Number(typePriority[2]),
    externalRef: parityField(html, 'materialize-external-ref'),
    targetRepoRoot: parityField(html, 'materialize-target-repo'),
    governingIntent: {
      requirementId: governing[1] as string,
      proposalPath: governing[2] as string,
    },
  };
  const packet = dispatch.packet;
  const expected = {
    title: packet.title,
    description: packet.description,
    labels: [...packet.labels],
    issueType: packet.issueType,
    priority: packet.priority,
    externalRef: packet.externalRef,
    targetRepoRoot: packet.targetRepoRoot,
    governingIntent: {
      requirementId: packet.governingIntent.requirementId,
      proposalPath: packet.governingIntent.proposalPath,
    },
  };
  if (JSON.stringify(rendered) !== JSON.stringify(expected)) {
    throw new Error(`Trajectory dispatch packet parity mismatch: ${JSON.stringify({ rendered, expected })}`);
  }
  const top = [Object.keys(rendered).length, Object.keys(packet).length] as const;
  const leaves = [Object.keys(rendered).length - 1 + Object.keys(rendered.governingIntent).length,
    Object.keys(packet).length - 1 + Object.keys(packet.governingIntent).length] as const;
  const machineOnly = [
    'dispatch.packet.targetBeadPrefix',
    'dispatch.packet.governingIntent.designPath',
  ];
  let state: readonly [number, number] = [0, 0];
  if (dispatch.dispatchState === 'dispatched') {
    const beadId = /data-parity-field="materialize-status">Already materialized as <code>([^<]+)<\/code>/.exec(html)?.[1];
    if (beadId === undefined || decodeHtmlText(beadId) !== dispatch.beadId) {
      throw new Error(`Trajectory dispatch state parity mismatch: rendered=${beadId}, machine=${dispatch.beadId}`);
    }
    state = [1, 2] as const;
    machineOnly.push('dispatch.createdAt');
  }
  return { top, leaves, state, machineOnly };
}

describe('renderMaterializePanel', () => {
  it('previews the exact packet and target repository read-only, before any trigger (AC1)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderMaterializePanel(model);
    expect(model.dispatch?.packet).toBe(buildTrajectoryMaterializationPacket(model));
    expect(html).toContain('data-parity-field="materialize-target-repo"');
    expect(html).toContain(model.project.root);
    expect(html).toContain('REQ-switchboard-identity-001');
    expect(html).toContain('data-parity-field="materialize-status">Not yet materialized.');
    expect(html).toContain('<form method="POST" action="/trajectory/materialize">');
    expect(html).not.toMatch(/onclick=/);
  });

  it('matches decoded Trajectory fields to authenticated API dispatch with exact denominators and named machine-only values', async () => {
    const model = buildFixtureModel(cleanups);
    if (model.dispatch === null) throw new Error('fixture must carry dispatch');
    const dispatched: DispatchDisclosure = Object.freeze({
      dispatchState: 'dispatched',
      packet: model.dispatch.packet,
      beadId: 'bu-dispatch-parity',
      createdAt: '2026-09-23T00:00:00Z',
    });
    const dispatchedModel: PocModel = {
      ...model,
      dispatch: dispatched,
      materializedBeadId: dispatched.beadId,
    };
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-dispatch-parity-'), 'state'),
      port: 0,
      routes: pocRoutes(() => dispatchedModel),
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;
    const token = readFileSync(start.daemon.credentialPath, 'utf8').trim();
    const trajectory = await fetch(`${baseUrl}/trajectory`);
    const machineResponse = await fetch(`${baseUrl}${POC_MACHINE_PATH}`, {
      headers: { authorization: `Bearer ${token}` },
    });
    expect(trajectory.status).toBe(200);
    expect(machineResponse.status).toBe(200);
    const html = await trajectory.text();
    const machine = (await machineResponse.json()) as PocModel;
    if (machine.dispatch?.dispatchState !== 'dispatched') throw new Error('API dispatched state missing');
    expect(assertDispatchParity(html, machine.dispatch)).toEqual({
      top: [8, 9],
      leaves: [9, 11],
      state: [1, 2],
      machineOnly: [
        'dispatch.packet.targetBeadPrefix',
        'dispatch.packet.governingIntent.designPath',
        'dispatch.createdAt',
      ],
    });

    for (const packet of [
      { ...machine.dispatch.packet, title: 'mutated API title' },
      { ...machine.dispatch.packet, labels: ['mutated API label'] },
      { ...machine.dispatch.packet, issueType: 'mutated API type', priority: 3 },
      { ...machine.dispatch.packet, governingIntent: { ...machine.dispatch.packet.governingIntent, proposalPath: 'mutated API proposal' } },
    ]) {
      const divergentPacket: DispatchDisclosure = { ...machine.dispatch, packet };
      expect(() => assertDispatchParity(html, divergentPacket)).toThrow('dispatch packet parity mismatch');
    }
    const divergentState: DispatchDisclosure = { ...machine.dispatch, beadId: 'bu-mutated-state' };
    expect(() => assertDispatchParity(html, divergentState)).toThrow('dispatch state parity mismatch');
  });

  it('is embedded on the Trajectory page with the write foreclosed and the trigger disabled', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderTrajectoryPage(model);
    expect(html).toContain('data-materialize-panel');
    expect(html).toContain('disabled aria-disabled="true" aria-describedby="materialize-refusal">Materialize this work item</button>');
    expect(html).not.toMatch(/<button type="submit" data-parity-field="materialize-trigger">/);
  });

  it('renders the foreclosed write with its citation and reason, and disables the trigger (P-71-Q5)', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderMaterializePanel(model);
    expect(html).toContain('id="materialize-refusal" data-effect-refusal="foreclosed" data-effect-citation="P-71-Q5"');
    expect(html).toContain('Foreclosed by owner ruling P-71-Q5');
    expect(html).toContain('POLARIS-PURSUIT-OWNER-RULINGS-P68-P83-DECISION.md');
    expect(html).toContain('The write is not available, so nothing can be written from this page.');
    expect(html).not.toContain('Nothing is written until the button below is explicitly clicked');
    expect(html).toContain('<button type="submit" data-parity-field="materialize-trigger" disabled aria-disabled="true" aria-describedby="materialize-refusal">');
  });

  it('enables the trigger only for an authorized verdict', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderMaterializePanel(model, '', AUTHORIZED);
    expect(html).toContain('<button type="submit" data-parity-field="materialize-trigger">Materialize this work item</button>');
    expect(html).not.toContain('data-effect-refusal');
  });

  it('posts to the tailnet-mounted action when rendered under the tailnet mount', () => {
    const model = buildFixtureModel(cleanups);
    const html = renderMaterializePanel(model, TAILNET_MOUNT_PREFIX);
    expect(html).toContain(`<form method="POST" action="${TAILNET_MOUNT_PREFIX}/trajectory/materialize">`);
  });

  it('does not render a compiled materialization packet for a model with no dispatch', () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const model = buildPocModel({
      seeds: UNSUPPORTED_REPOSITORY_SEEDS,
      repoRoot,
      runWorkItemQuery: () => JSON.stringify([]),
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'empty-seed-materialization@rev', asOf: '2026-09-22T00:00:00Z' },
    });
    expect(model.dispatch).toBeNull();

    const html = renderMaterializePanel(model);
    expect(html).toContain('data-unknown-disclosure="materialization"');
    expect(html).not.toContain('<form');
    expect(html).not.toContain('REQ-switchboard-identity-001');
  });
});

describe('materializeRoutes', () => {
  async function startDaemon(options: {
    readonly stateDir: string;
    readonly model?: PocModel;
    readonly onMaterialized?: () => void;
    readonly authorize?: () => EffectAuthorityVerdict;
    readonly runQuery?: (repoRoot: string, sql: string) => string;
    readonly runCreate?: (repoRoot: string, packet: unknown, attribution: string) => string;
  }) {
    let model = options.model ?? buildFixtureModel(cleanups);
    const targetRepoRoot = model.project.root;
    const start = await createDaemon({
      stateDir: join(tempDir('syzygy-poc-materialize-daemon-'), 'state'),
      port: 0,
      routes: [
        ...pocRoutes(() => model),
        ...materializeRoutes({
          getModel: () => model,
          targetRepoRoot,
          stateDir: () => options.stateDir,
          onMaterialized: () => {
            options.onMaterialized?.();
          },
          ...(options.authorize === undefined ? {} : { authorize: options.authorize }),
          ...(options.runQuery === undefined ? {} : { runQuery: options.runQuery }),
          ...(options.runCreate === undefined ? {} : { runCreate: options.runCreate }),
        }),
      ],
    });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    return `http://${start.daemon.host}:${start.daemon.port}`;
  }

  it('refuses a cross-origin POST the same way every other human route does (fail-closed)', async () => {
    const baseUrl = await startDaemon({
      stateDir: tempDir('syzygy-poc-materialize-state-'),
    });
    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, {
      method: 'POST',
      headers: { host: 'poc.attacker.invalid', origin: 'http://poc.attacker.invalid' },
    });
    expect(response.status).toBe(403);
  });

  it('refuses the foreclosed write with a bounded typed refusal and never runs Beads (P-71-Q5)', async () => {
    const dir = tempDir('syzygy-poc-materialize-state-');
    let queryCalls = 0;
    let createCalls = 0;
    let refreshed = 0;
    const baseUrl = await startDaemon({
      stateDir: dir,
      onMaterialized: () => {
        refreshed += 1;
      },
      runQuery: () => {
        queryCalls += 1;
        return JSON.stringify([]);
      },
      runCreate: () => {
        createCalls += 1;
        return JSON.stringify({ id: 'bu-should-not-exist' });
      },
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(403);
    const html = await response.text();
    expect(html).toContain('data-effect-refusal="foreclosed" data-effect-citation="P-71-Q5"');
    expect(html).toContain('Nothing was written.');
    expect(queryCalls).toBe(0);
    expect(createCalls).toBe(0);
    expect(refreshed).toBe(0);
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('refuses an effect the registry does not name before any runner is called', async () => {
    let createCalls = 0;
    const baseUrl = await startDaemon({
      stateDir: tempDir('syzygy-poc-materialize-state-'),
      authorize: () => ({
        authorized: false,
        effect: 'butlers-tracker-write',
        refusedBy: 'not-in-write-surface',
        detail: 'the registry write surface does not name butlers:.beads',
      }),
      runCreate: () => {
        createCalls += 1;
        return JSON.stringify({ id: 'bu-should-not-exist' });
      },
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(403);
    const html = await response.text();
    expect(html).toContain('data-effect-refusal="not-in-write-surface"');
    expect(html).not.toContain('data-effect-citation');
    expect(createCalls).toBe(0);
  });

  it('creates exactly one Bead on trigger, persists the record, and calls onMaterialized (AC2)', async () => {
    const dir = tempDir('syzygy-poc-materialize-state-');
    const fixtureModel = buildFixtureModel(cleanups);
    let refreshed = 0;
    let createCalls = 0;
    let createdPacket: unknown;
    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      stateDir: dir,
      model: fixtureModel,
      onMaterialized: () => {
        refreshed += 1;
      },
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-http' }]),
      runCreate: (_repoRoot, packet) => {
        createCalls += 1;
        createdPacket = packet;
        return JSON.stringify({ id: 'bu-http-materialized1' });
      },
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain('bu-http-materialized1');
    expect(createCalls).toBe(1);
    expect(createdPacket).toBe(fixtureModel.dispatch?.packet);
    expect(refreshed).toBe(1);
    expect(readMaterializationRecordFile(dir)?.beadId).toBe('bu-http-materialized1');
  });

  it('keeps the result page\'s back-link under the tailnet mount when the tailnet-Host-headered request `tailscale serve` actually forwards triggers it (AC2)', async () => {
    // `tailscale serve --set-path` strips the mount prefix from the
    // forwarded path (see tailnet.ts), so the real tailnet-routed POST
    // arrives at the plain MATERIALIZE_HUMAN_PATH with Host set to the
    // tailnet hostname — never at a `/butlers-syzygy`-prefixed path.
    const dir = tempDir('syzygy-poc-materialize-state-');
    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      stateDir: dir,
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-http' }]),
      runCreate: () => JSON.stringify({ id: 'bu-http-tailnet' }),
    });

    const response = await fetchWithHost(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, TAILNET_HOST, {
      method: 'POST',
      origin: `https://${TAILNET_HOST}`,
    });
    expect(response.status).toBe(200);
    const html = await response.text();
    expect(html).toContain(`href="${TAILNET_MOUNT_PREFIX}/trajectory"`);
  });

  it('is idempotent over HTTP: a second POST reuses the same Bead without a second create (AC3)', async () => {
    const dir = tempDir('syzygy-poc-materialize-state-');
    let createCalls = 0;
    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      stateDir: dir,
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-http' }]),
      runCreate: () => {
        createCalls += 1;
        return JSON.stringify({ id: 'bu-http-materialized1' });
      },
    });

    const first = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    const second = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(first.status).toBe(200);
    expect(second.status).toBe(200);
    const secondHtml = await second.text();
    expect(secondHtml).toContain('Reused');
    expect(secondHtml).toContain('bu-http-materialized1');
    expect(createCalls).toBe(1);
  });

  it('renders a named failure over HTTP and leaves no partial record when bd is missing (AC5)', async () => {
    const dir = tempDir('syzygy-poc-materialize-state-');
    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      stateDir: dir,
      runQuery: () => {
        const error = new Error('spawn bd ENOENT') as NodeJS.ErrnoException;
        error.code = 'ENOENT';
        throw error;
      },
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(502);
    const html = await response.text();
    expect(html).toContain('bd CLI is not available');
    expect(readMaterializationRecordFile(dir)).toBeNull();
  });

  it('fails closed without invoking Beads when the actual model has no dispatch', async () => {
    const { repoRoot, revision } = fixtureRepoWithGit(cleanups);
    const model = buildPocModel({
      seeds: UNSUPPORTED_REPOSITORY_SEEDS,
      repoRoot,
      runWorkItemQuery: () => JSON.stringify([]),
      repositoryRevision: revision,
      observerRevision: revision,
      evaluation: { snapshot: 'empty-seed-materialization@post', asOf: '2026-09-22T00:00:00Z' },
    });
    expect(model.dispatch).toBeNull();
    let queryCalls = 0;
    let createCalls = 0;
    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      model,
      stateDir: tempDir('syzygy-poc-materialize-empty-state-'),
      runQuery: () => {
        queryCalls += 1;
        return JSON.stringify([]);
      },
      runCreate: () => {
        createCalls += 1;
        return JSON.stringify({ id: 'bu-should-not-exist' });
      },
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(502);
    expect(await response.text()).toContain('seed-backed proposed-work graph was evaluated');
    expect(queryCalls).toBe(0);
    expect(createCalls).toBe(0);
  });

  it('states the Bead exists when it was created but only the local record write failed, instead of the generic no-Bead suffix (AC5)', async () => {
    // A regular file at the state-dir path makes writeMaterializationRecordFile's
    // mkdirSync throw, simulating "the Bead mutation succeeded, only persisting
    // the local record failed" without needing to fake the filesystem module.
    const parent = tempDir('syzygy-poc-materialize-state-');
    const dir = join(parent, 'not-a-directory');
    writeFileSync(dir, 'occupied');

    const baseUrl = await startDaemon({
      authorize: () => AUTHORIZED,
      stateDir: dir,
      runQuery: (_repoRoot, sql) =>
        sql.includes('external_ref') ? JSON.stringify([]) : JSON.stringify([{ revision: 'dolt-rev-http' }]),
      runCreate: () => JSON.stringify({ id: 'bu-http-created-unpersisted' }),
    });

    const response = await fetch(`${baseUrl}${MATERIALIZE_HUMAN_PATH}`, { method: 'POST' });
    expect(response.status).toBe(502);
    const html = await response.text();
    expect(html).toContain('bu-http-created-unpersisted');
    expect(html).toContain('exists in the configured Butlers repository');
    expect(html).not.toContain('No Bead was left in a partially-created state');
  });
});
