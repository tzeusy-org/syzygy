// The authenticated machine presentation envelope (PWB-REQ-014; RFC7-2,
// RFC7-3): `/api/poc/polaris` serves the narrative registry the human page
// was rendered from — the same block, anchor and band multisets — marked a
// non-citable presentation artifact, behind the machine bearer, bounded by
// the machine response ceiling. `/api/poc` is unchanged by it.
//
// Bead syzygy-1z3.24.5 (PWB-LIVE-13).

import { readFileSync, rmSync } from 'node:fs';
import { join } from 'node:path';
import { afterEach, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import { tempDir } from '@syzygy/test-kit';
import { PWB_RESOURCE_LIMITS, type PocModel } from '@syzygy/three-surface-poc-core';

import { POLARIS_HUMAN_PATH, renderPolarisPresentation } from './polaris.js';
import { type PolarisNarrative } from './polaris-narrative.js';
import { POC_MACHINE_PATH, POLARIS_PRESENTATION_KIND, POLARIS_PRESENTATION_PATH, pocRoutes, type PolarisPresentationEnvelope } from './routes.js';
import { TAILNET_MOUNT_PREFIX } from './tailnet.js';
import { buildFixtureModel } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET, projectShapeFixtureGit } from './test-project-shape-fixture.js';

const cleanups: string[] = [];
const running: RunningDaemon[] = [];

afterEach(async () => {
  for (const daemon of running.splice(0)) await daemon.close().catch(() => undefined);
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

async function startPoc(model: PocModel, limits = PWB_RESOURCE_LIMITS): Promise<{ readonly baseUrl: string; readonly token: string }> {
  const stateDir = tempDir('syzygy-poc-presentation-');
  const start = await createDaemon({ stateDir: join(stateDir, 'state'), routes: pocRoutes(() => model, limits), port: 0 });
  if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
  running.push(start.daemon);
  return { baseUrl: `http://${start.daemon.host}:${start.daemon.port}`, token: readFileSync(start.daemon.credentialPath, 'utf8').trim() };
}

function sortedMultiset(values: readonly string[]): string[] {
  return [...values].sort();
}

function multisets(narrative: PolarisNarrative): { blocks: string[]; anchors: string[]; bands: string[] } {
  return {
    blocks: sortedMultiset(narrative.blocks.map((block) => `${block.blockId}\t${block.role}`)),
    anchors: sortedMultiset(narrative.blocks.flatMap((block) => block.anchors.map((anchor) => `${anchor.anchorId}\t${anchor.targetClass}\t${anchor.targetId}\t${anchor.revision}\t${anchor.captured.label}\t${anchor.captured.tier}\t${anchor.captured.reason}`))),
    bands: sortedMultiset(narrative.blocks.map((block) => block.role)),
  };
}

describe('Polaris machine presentation envelope (PWB-REQ-014; RFC7-2, RFC7-3)', () => {
  it('refuses without the bearer and, with it, serves the narrative of the same render the human page comes from — every anchor cited on the page, no copy of the JSON on the page — marked non-citable', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_SECRET) } });
    expect(model.projectShape.kind).toBe('observed');
    const { baseUrl, token } = await startPoc(model);

    const refused = await fetch(`${baseUrl}${POLARIS_PRESENTATION_PATH}`);
    expect(refused.status).toBe(401);
    expect(await refused.json()).toEqual({ admitted: false, served: 'nothing' });

    const admitted = await fetch(`${baseUrl}${POLARIS_PRESENTATION_PATH}`, { headers: { authorization: `Bearer ${token}` } });
    expect(admitted.status).toBe(200);
    expect(admitted.headers.get('content-type')).toBe('application/json');
    const envelope = (await admitted.json()) as PolarisPresentationEnvelope;
    expect(envelope).toMatchObject({ kind: POLARIS_PRESENTATION_KIND, version: 1, presentation: 'presentation-artifact', citable: false });
    expect(envelope.kind).toBe('polaris-presentation');
    expect(envelope.evaluation).toEqual(model.evaluation);
    expect(envelope.evidence).toEqual(model.evaluation.evidence);
    expect(envelope.project).toEqual({ revision: model.project.revision });

    const humanHtml = await (await fetch(`${baseUrl}${POLARIS_HUMAN_PATH}`)).text();
    // The human page carries no copy of the machine form; the envelope is the
    // narrative of the same render (an independent render of the same model
    // yields the same block, anchor and band multisets), and every anchor
    // the envelope names is cited on the page by its anchor id.
    expect(humanHtml).not.toContain('<script type="application/json"');
    expect(humanHtml).not.toContain('"kind":"polaris-narrative"');
    const sameRender = renderPolarisPresentation(model).narrative;
    expect(sameRender.blocks.length).toBeGreaterThan(0);
    expect(envelope.narrative).toEqual(sameRender);
    expect(multisets(envelope.narrative)).toEqual(multisets(sameRender));
    const citedAnchorIds = new Set([...humanHtml.matchAll(/\sdata-anchor-id="([^"]*)"/g)].map((match) => match[1] as string));
    const envelopeAnchorIds = envelope.narrative.blocks.flatMap((block) => block.anchors.map((anchor) => anchor.anchorId));
    expect(envelopeAnchorIds.length).toBeGreaterThan(0);
    expect(envelopeAnchorIds.filter((anchorId) => !citedAnchorIds.has(anchorId))).toEqual([]);
    // The registry carries the anchored blocks; every block is anchored and
    // every anchor is revision-bound to the evaluated shape.
    expect(multisets(sameRender).anchors.length).toBeGreaterThan(0);
    for (const block of envelope.narrative.blocks) {
      expect(block).toMatchObject({ kind: 'narrative-block', presentation: 'presentation-artifact', citable: false });
      expect(block.anchors.length).toBeGreaterThan(0);
    }

    // The tailnet mount serves the same narrative with its own self link;
    // the truth endpoint still carries no presentation narrative.
    const tailnet = await fetch(`${baseUrl}${TAILNET_MOUNT_PREFIX}${POLARIS_PRESENTATION_PATH}`, { headers: { authorization: `Bearer ${token}` } });
    expect(tailnet.status).toBe(200);
    const mounted = (await tailnet.json()) as PolarisPresentationEnvelope;
    expect({ ...mounted, links: undefined }).toEqual({ ...envelope, links: undefined });
    expect(mounted.links.filter((link) => link.self).map((link) => link.path)).toEqual([`${TAILNET_MOUNT_PREFIX}${POLARIS_PRESENTATION_PATH}`]);
    const truth = (await (await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers: { authorization: `Bearer ${token}` } })).json()) as PocModel & { narrative?: unknown };
    expect({ ...truth, links: undefined, responseIdentity: model.responseIdentity }).toEqual({ ...JSON.parse(JSON.stringify(model)), links: undefined });
    expect(truth.narrative).toBeUndefined();
  });

  it('fails closed under the machine ceiling with a typed failure and no partial envelope', async () => {
    const model = buildFixtureModel(cleanups, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } });
    const { baseUrl, token } = await startPoc(model, { ...PWB_RESOURCE_LIMITS, maxMachineResponseBytes: 64 });
    const bounded = await fetch(`${baseUrl}${POLARIS_PRESENTATION_PATH}`, { headers: { authorization: `Bearer ${token}` } });
    expect(bounded.status).toBe(503);
    const body = await bounded.text();
    expect(JSON.parse(body)).toMatchObject({ served: 'nothing', failure: 'response-limit-breached', limit: 'maxMachineResponseBytes', declared: 64 });
    expect(body).not.toContain('"narrative"');
  });
});
