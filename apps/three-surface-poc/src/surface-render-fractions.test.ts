// What fraction of the machine answer's work items and code structure the
// human surfaces render (syzygy-g9l8, from syzygy-u05.9): the gap is a
// number a test holds, not a surprise.
//
// The machine side is `GET /api/poc`'s body, which is `JSON.stringify(model)`
// (routes.ts), so the test reads the same serialization. Expected figures are
// hand-typed literals taken from the fixtures below, never derived through the
// renderers under test. Rendered rows are counted by their own markers over
// the server-rendered HTML: a Trajectory card carries `data-work-item-id`; the
// Orrery carries code structure only as districts in its `orrery-data` island,
// one per top-level directory, and draws them client-side.
import { rmSync } from 'node:fs';

import { afterEach, describe, expect, it } from 'vitest';

import type { PocModel } from '@syzygy/three-surface-poc-core';

import { renderOrreryPage } from './orrery.js';
import { renderPolarisPage } from './polaris.js';
import { buildFixtureModel, fixtureWorkItemRow } from './test-model-fixture.js';
import { renderTrajectoryPage, renderTrajectoryRoute } from './trajectory.js';

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) rmSync(directory, { recursive: true, force: true });
});

interface MachineAnswer {
  readonly workItems: { readonly kind: string; readonly items?: readonly { readonly id: string }[] };
  readonly codeStructure: { readonly kind: string; readonly files?: readonly { readonly path: string }[] };
}

function machine(model: PocModel): MachineAnswer {
  return JSON.parse(JSON.stringify(model)) as MachineAnswer;
}

function pages(model: PocModel): Record<'polaris' | 'trajectory' | 'orrery', string> {
  return { polaris: renderPolarisPage(model), trajectory: renderTrajectoryPage(model), orrery: renderOrreryPage(model) };
}

/** Every rendered card id, duplicates kept, so one extra card counts. */
function cardIds(html: string): string[] {
  return [...html.matchAll(/data-work-item-id="([^"]*)"/g)].map(match => match[1] as string);
}

interface IslandDistrict { readonly path: string; readonly fileCount: number }

function islandDistricts(html: string): IslandDistrict[] {
  const islands = [...html.matchAll(/<script type="application\/json" id="orrery-data">([\s\S]*?)<\/script>/g)];
  expect(islands).toHaveLength(1);
  return (JSON.parse(islands[0]?.[1] as string) as { districts: IslandDistrict[] }).districts;
}

/** A per-file row would name its file in an attribute (an id, a data field,
 * an href); prose mentions in provenance text are not rows. */
function fileRows(html: string, paths: readonly string[]): number {
  const values = [...html.matchAll(/=\s*"([^"]*)"/g)].map(match => match[1] as string);
  return paths.filter(path => values.some(value => value.includes(path))).length;
}

describe('rendered fraction of the machine answer on the human surfaces', () => {
  it('default fixture: Trajectory outlines 3 of 5 work items; Polaris and Orrery render none as rows', () => {
    const model = buildFixtureModel(cleanups);
    const answer = machine(model);
    const html = pages(model);
    expect(answer.workItems.kind).toBe('observed');
    expect(answer.workItems.items).toHaveLength(5);

    const cards = cardIds(html.trajectory);
    expect(cards).toEqual(['bu-blocked1', 'bu-open1', 'bu-progress1']);
    expect(new Set(cards).size).toBe(3);
    const machineIds = new Set(answer.workItems.items?.map(({ id }) => id));
    expect(cards.every(id => machineIds.has(id))).toBe(true);
    expect(`${cards.length} of ${answer.workItems.items?.length}`).toBe('3 of 5');

    expect(cardIds(html.polaris)).toHaveLength(0);
    expect(cardIds(html.orrery)).toHaveLength(0);
  });

  it('with 52 closed items, Trajectory outlines 3 and Recent work shows 53 of the 55 served', () => {
    // 3 open items and 52 closed ones with distinct closing instants; the
    // board keeps every non-closed item and the 50 most recently closed.
    const rows = [
      ...['bu-o1', 'bu-o2', 'bu-o3'].map(id => fixtureWorkItemRow(id, 'open', '2026-08-01T00:00:00Z', '2026-08-02T00:00:00Z', null)),
      ...Array.from({ length: 52 }, (_, index) => {
        const day = String(index + 1).padStart(2, '0');
        const instant = index < 31 ? `2026-07-${day}T00:00:00Z` : `2026-08-${String(index - 30).padStart(2, '0')}T00:00:00Z`;
        return fixtureWorkItemRow(`bu-c${day}`, 'closed', '2026-06-01T00:00:00Z', instant, instant);
      }),
    ];
    const model = buildFixtureModel(cleanups, { workItemRows: rows });
    const answer = machine(model);
    expect(answer.workItems.items).toHaveLength(55);

    expect(cardIds(renderTrajectoryPage(model))).toEqual(['bu-o1', 'bu-o2', 'bu-o3']);
    const recent = renderTrajectoryRoute(model, '', undefined, new URLSearchParams('selection=recent'));
    if (typeof recent !== 'string') throw new Error('refused');
    const cards = cardIds(recent);
    expect(new Set(cards).size).toBe(cards.length);
    expect(`${cards.length} of ${answer.workItems.items?.length}`).toBe('53 of 55');
    // The two oldest closings are the ones outside the board.
    expect(cards).not.toContain('bu-c01');
    expect(cards).not.toContain('bu-c02');
    expect(cards).toContain('bu-c03');
  });

  it('default fixture: code structure renders as 6 Orrery districts covering 8 of 8 files, and no surface renders a per-file row', () => {
    const model = buildFixtureModel(cleanups);
    const answer = machine(model);
    const html = pages(model);
    expect(answer.codeStructure.kind).toBe('observed');
    const paths = answer.codeStructure.files?.map(({ path }) => path) ?? [];
    expect(paths).toHaveLength(8);

    const districts = islandDistricts(html.orrery);
    expect(districts.map(({ path }) => path)).toEqual(['(root)', 'apps', 'docs', 'openspec', 'src', 'tests']);
    const covered = districts.reduce((sum, { fileCount }) => sum + fileCount, 0);
    expect(`${covered} of ${paths.length}`).toBe('8 of 8');

    expect(fileRows(html.polaris, paths)).toBe(0);
    expect(fileRows(html.trajectory, paths)).toBe(0);
    expect(fileRows(html.orrery, paths)).toBe(0);
  });
});
