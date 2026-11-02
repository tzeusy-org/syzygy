// PWB-REQ-014 "Anchor shape" and "Anchor resolution count"
// (pwb-anchor-resolution-amendment-v1.0, syzygy-u05.21): the signed oracle and
// falsifier as tests.
//
// The resolver below is the independent one the oracle asks for. It reads only
// the serialized machine narrative's anchors (block id, target identity) and
// the serialized machine answer's bytes, by another route than the builder
// (a JSON.parse reviver over the answer text, not a walk of the model), and
// imports no Polaris, narrative or rendering module. Expected counts come from
// it, or are hand-typed literals it was cross-checked against, never from the
// builder.
import { mkdtempSync, readFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { afterAll, afterEach, beforeAll, describe, expect, it } from 'vitest';

import { createDaemon, type RunningDaemon } from '@syzygy/http-host';
import type { PocModel } from '@syzygy/three-surface-poc-core';

import { NarrativeRegistry, type PolarisNarrative } from './polaris-narrative.js';
import { renderPolarisPresentation } from './polaris.js';
import { POC_MACHINE_PATH, POLARIS_PRESENTATION_PATH, pocRoutes } from './routes.js';
import { SHARED_FIXTURE_TIMEOUT_MS, buildFixtureModel, sharedFixtureModels } from './test-model-fixture.js';
import { ADMITTING_AUTHORITY, PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC, projectShapeFixtureGit } from './test-project-shape-fixture.js';

// ---------------------------------------------------------------------------
// The independent resolver.

type Counted = { readonly resolved: number; readonly total: number };
type Resolution = { readonly blocks: ReadonlyMap<string, Counted>; readonly narrative: Counted } | 'unknown';

/** Own-identity records of the answer's bytes: a reviver sees every object
 * member as `(key, value)` with the holder as `this`. */
function ownIdentities(answerBytes: string): Map<string, number> {
  const counts = new Map<string, number>();
  JSON.parse(answerBytes, function (this: unknown, key: string, value: unknown) {
    if (key === 'identity' && typeof value === 'string' && typeof this === 'object' && this !== null && !Array.isArray(this)) {
      counts.set(value, (counts.get(value) ?? 0) + 1);
    }
    return value;
  });
  return counts;
}

/** Reads only `blocks[].blockId` and `blocks[].anchors[].targetId` of the
 * narrative bytes, and the answer bytes. */
function independentResolve(narrativeBytes: string, answerBytes: string): Resolution {
  const counts = ownIdentities(answerBytes);
  if (counts.size === 0) return 'unknown';
  const parsed = JSON.parse(narrativeBytes) as { blocks: { blockId: string; anchors: { targetId: string }[] }[] };
  const blocks = new Map<string, Counted>();
  let resolved = 0;
  let total = 0;
  for (const block of parsed.blocks) {
    let here = 0;
    for (const anchor of block.anchors) if (counts.get(anchor.targetId) === 1) here += 1;
    blocks.set(block.blockId, { resolved: here, total: block.anchors.length });
    resolved += here;
    total += block.anchors.length;
  }
  return { blocks, narrative: { resolved, total } };
}

/** What the builder served, as the pair comparison reads it. */
function served(narrative: PolarisNarrative): Resolution {
  if (narrative.anchorsResolved.kind === 'unknown') return 'unknown';
  const blocks = new Map<string, Counted>();
  for (const block of narrative.blocks) {
    if (block.anchorsResolved.kind !== 'counted') throw new Error(`${block.blockId}: a block pair is Unknown beside a counted narrative pair`);
    blocks.set(block.blockId, { resolved: block.anchorsResolved.resolved, total: block.anchorsResolved.total });
  }
  return { blocks, narrative: { resolved: narrative.anchorsResolved.resolved, total: narrative.anchorsResolved.total } };
}

const bytes = (value: unknown): string => JSON.stringify(value);

// ---------------------------------------------------------------------------
// Fixtures: three evaluations, each built once, plus mutations of clones.

type Variant = 'unevaluated' | 'observed' | 'observed-with-baseline';
const VARIANTS: readonly Variant[] = ['unevaluated', 'observed', 'observed-with-baseline'];

const cleanups: string[] = [];
const running: RunningDaemon[] = [];
afterEach(async () => {
  for (const daemon of running.splice(0)) await daemon.close().catch(() => undefined);
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

const shared = sharedFixtureModels<Variant>((cleanupList) => ({
  unevaluated: buildFixtureModel(cleanupList),
  observed: buildFixtureModel(cleanupList, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit() } }),
  'observed-with-baseline': buildFixtureModel(cleanupList, { projectShape: { authority: ADMITTING_AUTHORITY, runGit: projectShapeFixtureGit(PROJECT_SHAPE_FIXTURE_TEXTS_WITH_BASELINE_SPEC) } }),
}));
beforeAll(shared.prepare, SHARED_FIXTURE_TIMEOUT_MS);
afterAll(shared.remove);

/** A deep copy of the model with every own identity the predicate names
 * either withheld (`delete`) or demoted to a reference (`reference`: the same
 * string under `sourceIdentity`, which is not a record's own identity). */
function withholding(model: PocModel, names: (identity: string) => boolean, how: 'delete' | 'reference' = 'delete'): PocModel {
  const copy = JSON.parse(JSON.stringify(model)) as PocModel;
  const pending: unknown[] = [copy];
  while (pending.length > 0) {
    const value = pending.pop();
    if (value === null || typeof value !== 'object') continue;
    if (Array.isArray(value)) {
      for (const member of value) pending.push(member);
      continue;
    }
    const record = value as Record<string, unknown>;
    if (typeof record['identity'] === 'string' && names(record['identity'])) {
      if (how === 'reference') record['sourceIdentity'] = record['identity'];
      delete record['identity'];
    }
    for (const member of Object.values(record)) pending.push(member);
  }
  return copy;
}

/** The narrative of one render; `answer` is the machine answer the pairs are
 * counted against (default: the model, as production serves it). */
function narrativeOf(model: PocModel, answer?: PocModel): PolarisNarrative {
  return renderPolarisPresentation(model, '', {}, answer === undefined ? {} : { machineAnswer: answer }).narrative;
}

// ---------------------------------------------------------------------------
// PWB-REQ-014 Oracle: the one anchor shape.

const UNEVALUATED = 19;

describe('PWB-REQ-014 anchor shape: every anchor takes the one shape and names its block', () => {
  it('carries exactly the signed fields, and an identity beginning with its own block and "#"', () => {
    let anchors = 0;
    for (const variant of VARIANTS) {
      const narrative = JSON.parse(bytes(narrativeOf(shared.get(variant)))) as PolarisNarrative;
      for (const block of narrative.blocks) {
        block.anchors.forEach((anchor, index) => {
          expect(Object.keys(anchor).sort(), `${variant}: ${anchor.anchorId}`).toEqual(['anchorId', 'captured', 'locator', 'revision', 'supports', 'targetClass', 'targetId']);
          expect(Object.keys(anchor.captured).sort()).toEqual(['label', 'reason', 'tier']);
          expect(anchor.anchorId.startsWith(`${block.blockId}#`), `${variant}: ${anchor.anchorId} names block ${block.blockId}`).toBe(true);
          // The remainder after the block's identity and "#" is the anchor's own ordinal.
          expect(anchor.anchorId.slice(block.blockId.length + 1)).toBe(`a${index + 1}`);
          anchors += 1;
        });
      }
      // No anchor identity begins with another block's identity and "#" unless
      // that identity is its own block's (blocks are not nested by prefix).
      const allIds = narrative.blocks.flatMap((block) => block.anchors.map((anchor) => ({ block: block.blockId, id: anchor.anchorId })));
      for (const { block, id } of allIds) {
        const owners = narrative.blocks.filter((other) => id.startsWith(`${other.blockId}#`)).map((other) => other.blockId);
        expect(owners, `${variant}: ${id}`).toEqual([block]);
      }
      expect(new Set(allIds.map((entry) => entry.id)).size).toBe(allIds.length);
    }
    // Denominator: every anchor of the three evaluations (UNEVALUATED + 70 + 74).
    expect(anchors).toBe(UNEVALUATED + 70 + 74);
  });
});

// ---------------------------------------------------------------------------
// PWB-REQ-014 Oracle: the counted pair, against the independent resolver.

describe('PWB-REQ-014 anchorsResolved: every pair reproduced exactly by the independent resolver', () => {
  it('matches per block and for the narrative in every evaluation, with N >= 2 blocks and mixed counts', () => {
    for (const variant of VARIANTS) {
      const model = shared.get(variant);
      const narrative = narrativeOf(model);
      const expected = independentResolve(bytes(narrative), bytes(model));
      expect(served(narrative), variant).toEqual(expected);
    }
  });

  it('hand-typed literals: the observed evaluation is 50 of 70 over 58 blocks, in the distribution the resolver finds', () => {
    const narrative = narrativeOf(shared.get('observed'));
    expect(narrative.anchorsResolved).toEqual({ kind: 'counted', resolved: 50, total: 70 });
    expect(narrative.blocks).toHaveLength(58);
    const distribution = new Map<string, number>();
    for (const block of narrative.blocks) {
      if (block.anchorsResolved.kind !== 'counted') throw new Error('unexpected Unknown');
      const key = `${block.anchorsResolved.resolved}/${block.anchorsResolved.total}`;
      distribution.set(key, (distribution.get(key) ?? 0) + 1);
    }
    expect(Object.fromEntries([...distribution].sort())).toEqual({ '0/1': 5, '0/2': 6, '0/3': 1, '1/1': 43, '2/2': 2, '3/3': 1 });
    // A block short of its total is served as counted: never rounded up.
    const short = narrative.blocks.find((block) => block.blockId === 'block:intent:req-switchboard-identity-001');
    expect(short?.anchorsResolved).toEqual({ kind: 'counted', resolved: 0, total: 3 });
    const full = narrative.blocks.find((block) => block.blockId === 'block:claim:class:project-account-section');
    expect(full?.anchorsResolved).toEqual({ kind: 'counted', resolved: 3, total: 3 });
    const baseline = narrativeOf(shared.get('observed-with-baseline'));
    expect(baseline.anchorsResolved).toEqual({ kind: 'counted', resolved: 54, total: 74 });
    expect(baseline.blocks).toHaveLength(61);
  });

  it("the narrative's pair is the sum of its blocks' pairs", () => {
    for (const variant of ['observed', 'observed-with-baseline'] as const) {
      const narrative = narrativeOf(shared.get(variant));
      let resolved = 0;
      let total = 0;
      for (const block of narrative.blocks) {
        if (block.anchorsResolved.kind !== 'counted') throw new Error('unexpected Unknown');
        resolved += block.anchorsResolved.resolved;
        total += block.anchorsResolved.total;
        expect(block.anchorsResolved.total).toBe(block.anchors.length);
      }
      expect(narrative.anchorsResolved).toEqual({ kind: 'counted', resolved, total });
    }
  });

  it('the signed scenario: three anchors, two served once and one served without an identity of its own, is 2 of 3 and stays non-citable at 2 of 3 and at 3 of 3', () => {
    const registry = new NarrativeRegistry();
    const captured = { label: 'Observed', tier: 'report-fact', reason: 'none' };
    const anchor = (targetId: string, claim: string) => ({ targetClass: 'evidence' as const, targetId, revision: 'r', locator: 'p', supports: [claim], captured });
    registry.registerAnchored('block:three', ['c1', 'c2', 'c3'], [anchor('sha256:A', 'c1'), anchor('sha256:B', 'c2'), anchor('sha256:C', 'c3')]);
    registry.registerAnchored('block:one', ['c4'], [anchor('sha256:A', 'c4')]);
    registry.registerAnchored('block:full', ['c5', 'c6'], [anchor('sha256:A', 'c5'), anchor('sha256:B', 'c6')]);
    // C is served only as a reference and as a composition, never as an own identity.
    const answer = { records: [{ identity: 'sha256:A' }, { identity: 'sha256:B' }, { sourceIdentity: 'sha256:C', stamp: { identity: ['sha256:C'] } }] };
    const narrative = registry.narrative(answer);
    const pairs = Object.fromEntries(narrative.blocks.map((block) => [block.blockId, block.anchorsResolved]));
    expect(pairs['block:three']).toEqual({ kind: 'counted', resolved: 2, total: 3 });
    expect(pairs['block:one']).toEqual({ kind: 'counted', resolved: 1, total: 1 });
    expect(pairs['block:full']).toEqual({ kind: 'counted', resolved: 2, total: 2 });
    expect(narrative.anchorsResolved).toEqual({ kind: 'counted', resolved: 5, total: 6 });
    for (const block of narrative.blocks) {
      expect(block.citable).toBe(false);
      expect(block.presentation).toBe('presentation-artifact');
    }
    expect(narrative.citable).toBe(false);
    expect(independentResolve(bytes(narrative), bytes(answer))).toEqual({
      blocks: new Map([['block:three', { resolved: 2, total: 3 }], ['block:one', { resolved: 1, total: 1 }], ['block:full', { resolved: 2, total: 2 }]]),
      narrative: { resolved: 5, total: 6 },
    });
  });

  it('a narrative whose every anchor resolves is 6 of 6 and stays non-citable; one own identity is enough to count (not Unknown)', () => {
    const registry = new NarrativeRegistry();
    const captured = { label: 'Observed', tier: 'report-fact', reason: 'none' };
    const anchor = (targetId: string) => ({ targetClass: 'evidence' as const, targetId, revision: 'r', locator: 'p', supports: ['c'], captured });
    registry.registerAnchored('block:x', ['c'], [anchor('sha256:A'), anchor('sha256:A'), anchor('sha256:A')]);
    registry.registerAnchored('block:y', ['c'], [anchor('sha256:A'), anchor('sha256:A'), anchor('sha256:A')]);
    const narrative = registry.narrative({ only: { identity: 'sha256:A' } });
    expect(narrative.blocks.map((block) => block.anchorsResolved)).toEqual([
      { kind: 'counted', resolved: 3, total: 3 },
      { kind: 'counted', resolved: 3, total: 3 },
    ]);
    expect(narrative.anchorsResolved).toEqual({ kind: 'counted', resolved: 6, total: 6 });
    expect(narrative.citable).toBe(false);
    expect(narrative.presentation).toBe('presentation-artifact');
    for (const block of narrative.blocks) expect(block.citable).toBe(false);
  });

  it('a target served by two records resolves nowhere (exactly one), and one identity counted per anchor naming it', () => {
    const registry = new NarrativeRegistry();
    const captured = { label: 'Observed', tier: 'report-fact', reason: 'none' };
    const anchor = (targetId: string) => ({ targetClass: 'evidence' as const, targetId, revision: 'r', locator: 'p', supports: ['c'], captured });
    registry.registerAnchored('block:a', ['c'], [anchor('sha256:A')]);
    registry.registerAnchored('block:b', ['c'], [anchor('sha256:A'), anchor('sha256:B')]);
    const answer = { first: [{ identity: 'sha256:A' }], second: { nested: { identity: 'sha256:A' } }, other: { identity: 'sha256:B' } };
    const narrative = registry.narrative(answer);
    expect(narrative.blocks.map((block) => block.anchorsResolved)).toEqual([
      { kind: 'counted', resolved: 0, total: 1 },
      { kind: 'counted', resolved: 1, total: 2 },
    ]);
    expect(narrative.anchorsResolved).toEqual({ kind: 'counted', resolved: 1, total: 3 });
    expect(independentResolve(bytes(narrative), bytes(answer))).toEqual({
      blocks: new Map([['block:a', { resolved: 0, total: 1 }], ['block:b', { resolved: 1, total: 2 }]]),
      narrative: { resolved: 1, total: 3 },
    });
  });
});

// ---------------------------------------------------------------------------
// PWB-REQ-014 Oracle: withholding.

describe('PWB-REQ-014 withholding: the pair follows the machine answer at the same evaluation', () => {
  /** The target identity anchored by the most blocks that resolves today. */
  function mostSharedResolvedTarget(model: PocModel): { readonly target: string; readonly blocks: Map<string, number> } {
    const narrative = narrativeOf(model);
    const counts = ownIdentities(bytes(model));
    const holders = new Map<string, Map<string, number>>();
    for (const block of narrative.blocks) {
      for (const anchor of block.anchors) {
        if (counts.get(anchor.targetId) !== 1) continue;
        const byBlock = holders.get(anchor.targetId) ?? new Map<string, number>();
        byBlock.set(block.blockId, (byBlock.get(block.blockId) ?? 0) + 1);
        holders.set(anchor.targetId, byBlock);
      }
    }
    const [target, blocks] = [...holders].sort((a, b) => b[1].size - a[1].size || a[0].localeCompare(b[0]))[0] as [string, Map<string, number>];
    return { target, blocks };
  }

  for (const how of ['delete', 'reference'] as const) {
    it(`withholding one resolved target (${how}) lowers exactly the blocks anchored to it, by the anchors naming it, and they stay non-citable`, () => {
      const model = shared.get('observed');
      const before = narrativeOf(model);
      const { target, blocks: holders } = mostSharedResolvedTarget(model);
      // N >= 2 blocks hold it (hand-typed: the shared repository-level identity).
      expect(target).toBe('repository:butlers-configured-poc@4444444444444444444444444444444444444444:about/heart-and-soul/v1.md#cefaf1d04353c86592ffa3885429aa0959a0bbc3');
      expect(holders.size).toBe(12);
      const answer = withholding(model, (identity) => identity === target, how);
      const after = narrativeOf(model, answer);
      const dropped = new Map<string, number>();
      for (const block of after.blocks) {
        const was = before.blocks.find((candidate) => candidate.blockId === block.blockId);
        if (was?.anchorsResolved.kind !== 'counted' || block.anchorsResolved.kind !== 'counted') throw new Error(block.blockId);
        expect(block.anchorsResolved.total).toBe(was.anchorsResolved.total);
        const lowered = was.anchorsResolved.resolved - block.anchorsResolved.resolved;
        if (lowered !== 0) dropped.set(block.blockId, lowered);
        expect(block.citable).toBe(false);
        expect(block.presentation).toBe('presentation-artifact');
      }
      expect([...dropped].sort()).toEqual([...holders].sort());
      expect(after.anchorsResolved).toEqual({ kind: 'counted', resolved: 38, total: 70 });
      expect(served(after)).toEqual(independentResolve(bytes(after), bytes(answer)));
    });
  }

  it('a block with two anchors naming one withheld target loses both', () => {
    const registry = new NarrativeRegistry();
    const captured = { label: 'Observed', tier: 'report-fact', reason: 'none' };
    const anchor = (targetId: string, locator: string) => ({ targetClass: 'evidence' as const, targetId, revision: 'r', locator, supports: ['c'], captured });
    registry.registerAnchored('block:twice', ['c'], [anchor('sha256:A', 'p:1'), anchor('sha256:A', 'p:2'), anchor('sha256:B', 'q')]);
    registry.registerAnchored('block:once', ['c'], [anchor('sha256:A', 'p'), anchor('sha256:B', 'q')]);
    const both = { rows: [{ identity: 'sha256:A' }, { identity: 'sha256:B' }] };
    expect(registry.narrative(both).blocks.map((block) => block.anchorsResolved)).toEqual([
      { kind: 'counted', resolved: 3, total: 3 },
      { kind: 'counted', resolved: 2, total: 2 },
    ]);
    const withoutA = registry.narrative({ rows: [{ identity: 'sha256:B' }] });
    expect(withoutA.blocks.map((block) => block.anchorsResolved)).toEqual([
      { kind: 'counted', resolved: 1, total: 3 },
      { kind: 'counted', resolved: 1, total: 2 },
    ]);
    expect(withoutA.anchorsResolved).toEqual({ kind: 'counted', resolved: 2, total: 5 });
  });

  it('withholding every identity turns every pair Unknown, with its reason, never a count', () => {
    for (const variant of ['observed', 'observed-with-baseline'] as const) {
      const model = shared.get(variant);
      const answer = withholding(model, () => true);
      expect(ownIdentities(bytes(answer)).size).toBe(0);
      const narrative = narrativeOf(model, answer);
      expect(narrative.blocks.length).toBe(variant === 'observed' ? 58 : 61);
      expect(independentResolve(bytes(narrative), bytes(answer))).toBe('unknown');
      for (const pair of [narrative.anchorsResolved, ...narrative.blocks.map((block) => block.anchorsResolved)]) {
        expect(pair).toMatchObject({ kind: 'unknown', label: 'Unknown', closedReason: 'missing-evidence' });
        expect(pair).not.toHaveProperty('resolved');
        expect(pair).not.toHaveProperty('total');
        expect((pair as { reason: string }).reason).toMatch(/serves no record with an identity of its own/);
        expect((pair as { resolutionRoutes: readonly unknown[] }).resolutionRoutes.length).toBeGreaterThan(0);
      }
      for (const block of narrative.blocks) expect(block.citable).toBe(false);
    }
  });

  it('an evaluation that serves no own identity from the start (no shape observed) is Unknown, not 0 of N', () => {
    const model = shared.get('unevaluated');
    expect(ownIdentities(bytes(model)).size).toBe(0);
    const narrative = narrativeOf(model);
    expect(narrative.blocks).toHaveLength(11);
    expect(served(narrative)).toBe('unknown');
    expect(narrative.anchorsResolved).toMatchObject({ kind: 'unknown', closedReason: 'missing-evidence' });
  });

  it('a record whose identity is two records served twice is ambiguous: the duplicate resolves nowhere', () => {
    const model = shared.get('observed');
    const copy = JSON.parse(JSON.stringify(model)) as PocModel & { projectShape: { sources: { identity: string }[] } };
    const [first, second] = copy.projectShape.sources as [{ identity: string }, { identity: string }];
    const doubled = first.identity;
    second.identity = doubled;
    const narrative = narrativeOf(model, copy);
    expect(independentResolve(bytes(narrative), bytes(copy))).not.toBe('unknown');
    expect(served(narrative)).toEqual(independentResolve(bytes(narrative), bytes(copy)));
    expect(ownIdentities(bytes(copy)).get(doubled)).toBe(2);
    // Both 'first' and its overwritten twin resolve nowhere.
    const before = narrativeOf(model).anchorsResolved;
    if (before.kind !== 'counted' || narrative.anchorsResolved.kind !== 'counted') throw new Error('unexpected Unknown');
    expect(narrative.anchorsResolved.resolved).toBeLessThan(before.resolved);
  });
});

// ---------------------------------------------------------------------------
// PWB-REQ-014: the pair is machine-channel only and never authority.

describe('PWB-REQ-014 anchorsResolved is presentation, machine channel only', () => {
  it('the human page carries no pair, no unit is citable, and the machine answer carries none', () => {
    for (const variant of VARIANTS) {
      const model = shared.get(variant);
      const { html, narrative } = renderPolarisPresentation(model);
      expect(html).not.toMatch(/anchorsResolved|anchors-resolved|anchor[s ]*resolved/i);
      expect(narrative.citable).toBe(false);
      for (const block of narrative.blocks) {
        expect(block.citable).toBe(false);
        expect(block.presentation).toBe('presentation-artifact');
      }
      expect(JSON.stringify(model)).not.toContain('anchorsResolved');
    }
  });

  it('serves the pair over the route: the independent resolver, reading the real /api/poc and /api/poc/polaris bodies, reproduces it; nothing else in the envelope or the answer carries it', async () => {
    const model = shared.get('observed');
    const stateDir = mkdtempSync(join(tmpdir(), 'syzygy-poc-anchors-'));
    cleanups.push(stateDir);
    const start = await createDaemon({ stateDir: join(stateDir, 'state'), routes: pocRoutes(() => model), port: 0 });
    if (!start.started) throw new Error(`daemon failed to start: ${start.failure.kind}`);
    running.push(start.daemon);
    const baseUrl = `http://${start.daemon.host}:${start.daemon.port}`;
    const headers = { authorization: `Bearer ${readFileSync(start.daemon.credentialPath, 'utf8').trim()}` };
    const answerBytes = await (await fetch(`${baseUrl}${POC_MACHINE_PATH}`, { headers })).text();
    const envelopeBytes = await (await fetch(`${baseUrl}${POLARIS_PRESENTATION_PATH}`, { headers })).text();
    const envelope = JSON.parse(envelopeBytes) as { narrative: PolarisNarrative; evaluation: unknown; evidence: unknown; project: unknown; links: unknown };
    expect(answerBytes).not.toContain('anchorsResolved');
    const expected = independentResolve(bytes(envelope.narrative), answerBytes);
    expect(expected).not.toBe('unknown');
    expect(served(envelope.narrative)).toEqual(expected);
    expect(envelope.narrative.anchorsResolved).toEqual({ kind: 'counted', resolved: 50, total: 70 });
    // The pair sits on the narrative and its blocks, and nowhere else in the envelope.
    const { narrative, ...rest } = envelope;
    expect(bytes(rest)).not.toContain('anchorsResolved');
    const blockPairs = (bytes(narrative).match(/"anchorsResolved"/g) ?? []).length;
    expect(blockPairs).toBe(58 + 1);
  });
});
