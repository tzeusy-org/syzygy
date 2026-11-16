import { rmSync } from 'node:fs';
import { afterEach, describe, expect, it } from 'vitest';

import { escapeHtml } from '@syzygy/http-host';
import type { PocModel } from '@syzygy/three-surface-poc-core';

import { renderOrreryPage } from './orrery.js';
import { renderTrajectoryPage } from './trajectory.js';
import { buildFixtureModel } from './test-model-fixture.js';

/**
 * Records the page-size cost of the N4 slice-3 footer change (composite
 * evaluation identity + substrate-revision naming + skew disclosure) for
 * /trajectory and /orrery, measured on renderer output directly — never
 * through the port-7478 loopback daemon (AGENTS.md: "Measuring /polaris
 * needs a committed, clean tree... Never measure through the loopback
 * daemon on 7478").
 *
 * The "before" footer literals below are the exact pre-change bytes,
 * confirmed against `git diff` at edit time (N4 slice 3,
 * apps/three-surface-poc/src/{orrery,trajectory}.ts). Nothing else in
 * either renderer changed, and pageShell embeds the `footer` string
 * verbatim exactly once inside `<footer>…</footer>`, so the whole-page
 * byte delta equals the footer-string byte delta — this test asserts that
 * equality directly rather than assuming it.
 */

const cleanups: string[] = [];
afterEach(() => {
  for (const directory of cleanups.splice(0)) {
    rmSync(directory, { recursive: true, force: true });
  }
});

function byteLength(html: string): number {
  return Buffer.byteLength(html, 'utf8');
}

function extractFooterContent(html: string): string {
  const match = /<footer[^>]*>([\s\S]*)<\/footer>/.exec(html);
  if (match?.[1] === undefined) {
    throw new Error('no <footer> element found');
  }
  return match[1];
}

function oldTrajectoryFooter(model: PocModel): string {
  const trajectory = model.trajectory;
  return trajectory.kind === 'observed'
    ? `Beads Dolt revision <code>${escapeHtml(trajectory.doltRevision)}</code>.`
    : 'Work-item region: Unknown.';
}

function oldOrreryFooter(model: PocModel): string {
  const orrery = model.orrery;
  return orrery.kind === 'observed'
    ? `Code-structure revision <code>${escapeHtml(orrery.revision)}</code>.`
    : 'Code-structure region: Unknown.';
}

function measure(
  render: (model: PocModel) => string,
  model: PocModel,
  oldFooter: string,
): { beforeBytes: number; afterBytes: number; deltaBytes: number } {
  const afterHtml = render(model);
  const afterFooter = extractFooterContent(afterHtml);
  const occurrences = afterHtml.split(afterFooter).length - 1;
  expect(occurrences).toBe(1); // the footer string must be embedded verbatim exactly once
  const beforeHtml = afterHtml.replace(afterFooter, oldFooter);
  return {
    beforeBytes: byteLength(beforeHtml),
    afterBytes: byteLength(afterHtml),
    deltaBytes: byteLength(afterHtml) - byteLength(beforeHtml),
  };
}

describe('page-size delta: N4 slice-3 evaluation-identity footer (renderer output, no daemon)', () => {
  it('/trajectory grows by the composite-identity + substrate-naming footer, bounded and logged', () => {
    const model = buildFixtureModel(cleanups);
    const { beforeBytes, afterBytes, deltaBytes } = measure(renderTrajectoryPage, model, oldTrajectoryFooter(model));
    // eslint-disable-next-line no-console
    console.log(`[N4 page-size delta] /trajectory: before=${beforeBytes}B after=${afterBytes}B delta=+${deltaBytes}B`);
    expect(deltaBytes).toBeGreaterThan(0);
    expect(deltaBytes).toBeLessThan(1000); // one footer line's worth, not a regression-scale jump
  });

  it('/orrery grows by the composite-identity + substrate-naming footer, bounded and logged', () => {
    const model = buildFixtureModel(cleanups);
    const { beforeBytes, afterBytes, deltaBytes } = measure(renderOrreryPage, model, oldOrreryFooter(model));
    // eslint-disable-next-line no-console
    console.log(`[N4 page-size delta] /orrery: before=${beforeBytes}B after=${afterBytes}B delta=+${deltaBytes}B`);
    expect(deltaBytes).toBeGreaterThan(0);
    expect(deltaBytes).toBeLessThan(1000);
  });
});
