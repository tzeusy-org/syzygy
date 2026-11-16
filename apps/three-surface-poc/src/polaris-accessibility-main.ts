// `npm run poc:accessibility-check` — task 4.4 (syzygy-1z3.20).
//
// Drives a real headless Chrome/Chromium over every Polaris variant the
// browser test walks and writes the measured evidence (browser identity,
// commit, per-variant focus traces, activations, accessibility-tree counts,
// contrast minima and violations) to `docs/evidence/`. It reads no Butlers
// repository; the daemon (`main.ts`) never imports it.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { findBrowserExecutable, launchBrowser } from './cdp-browser.js';
import { removeFixturesOfDeadProcesses } from './fixture-directories.js';
import { checkPolarisAccessibility, type AccessibilityReport } from './polaris-accessibility.js';
import { ACCESSIBILITY_VARIANTS, renderVariant } from './polaris-accessibility-variants.js';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

async function main(): Promise<number> {
  // The fixture helper this CLI builds its models with leaves a directory behind when a run is killed;
  // Vitest's global setup sweeps those for test runs and never runs here (syzygy-bpyt.4.10).
  removeFixturesOfDeadProcesses();
  const executable = findBrowserExecutable();
  if (executable === undefined) {
    process.stderr.write('No Chrome/Chromium found on PATH and SYZYGY_POC_BROWSER is unset; nothing measured.\n');
    return 2;
  }
  const date = argument('--date') ?? new Date().toISOString().slice(0, 10);
  const output = argument('--out') ?? join('docs', 'evidence', `pwb-p4-4-accessibility-browser-run-${date}.json`);
  const commit = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();
  const browser = await launchBrowser(executable);
  const pages = mkdtempSync(join(tmpdir(), 'syzygy-poc-a11y-'));
  const cleanups: string[] = [];
  const reports: AccessibilityReport[] = [];
  try {
    for (const variant of ACCESSIBILITY_VARIANTS) {
      const page = await browser.newPage();
      const rendered = renderVariant(variant, cleanups);
      const file = join(pages, `${variant.id}.html`);
      writeFileSync(file, rendered.html);
      const report = await checkPolarisAccessibility(page, pathToFileURL(file).href, variant.id, { expectedTargets: rendered.expectedTargets });
      await page.close();
      reports.push(report);
      process.stdout.write(`${variant.id}: focusables ${report.focusTrace.reached}/${report.focusTrace.population}, activations ${report.activations.length}, ax nodes ${report.accessibilityTree.nodes}, contrast min ${report.contrast.minimumRatio}:1 over ${report.contrast.measured}, violations ${report.violations.length}\n`);
    }
  } finally {
    await browser.close();
    rmSync(pages, { recursive: true, force: true });
    for (const directory of cleanups) rmSync(directory, { recursive: true, force: true });
  }
  const violations = reports.reduce((sum, report) => sum + report.violations.length, 0);
  const evidence = {
    task: 'syzygy-1z3.20 (PWB task 4.4)',
    requirement: ['PWB-REQ-016', 'PWB-REQ-011', 'RFC7-31', 'RFC7-34'],
    capturedAt: new Date().toISOString(),
    commit,
    browser: { executable: browser.executable, version: browser.version },
    variants: reports.map((report) => ({ ...report, focusables: report.focusables.length })),
    totals: {
      variants: reports.length,
      focusables: reports.reduce((sum, report) => sum + report.focusTrace.population, 0),
      activations: reports.reduce((sum, report) => sum + report.activations.length, 0),
      contrastMeasurements: reports.reduce((sum, report) => sum + report.contrast.measured, 0),
      minimumContrast: Math.min(...reports.map((report) => report.contrast.minimumRatio)),
      violations,
    },
  };
  mkdirSync(join('docs', 'evidence'), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  process.stdout.write(`wrote ${output}: ${violations} violations across ${reports.length} variants\n`);
  return violations === 0 ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  },
);
