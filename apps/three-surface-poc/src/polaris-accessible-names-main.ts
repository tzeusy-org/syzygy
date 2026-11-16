// `npm run poc:accessible-names-sweep -- --task <bead id> --base-url <private daemon> --credential <token file>`
// — PWB-REQ-016 as amended by pwb-accessible-name-amendment v1.0 (P-99,
// syzygy-u05.22): the distinct-name and heading-order checks over every
// Polaris page one whole-project evaluation serves.
//
// It reads the machine answer (`GET /api/poc`, bearer credential) of a
// running private daemon, lists the entry page and one exact-source route
// response per source that answer carries, drives a real headless browser
// over each served page, and writes a dated evidence record of counts only:
// the page denominators, each page's interactive and heading populations,
// and the violations by kind. Source identities are recorded as sha256
// digests and no rendered text is copied into the record. `--details <file>`
// also writes the violation details (which quote rendered names) to a file
// the operator keeps outside the repository.
//
// It reads no repository itself; the daemon (`main.ts`) never imports it.
// Exits 0 only when every listed page was served and has zero violations.
import { execFileSync } from 'node:child_process';
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { dirname, join } from 'node:path';
import { sha256 } from '@syzygy/support';

import { findBrowserExecutable, launchBrowser } from './cdp-browser.js';
import { sweepPolarisNamesAndHeadings, type MachineAnswerSources, type NameHeadingViolation, type WholeSurfaceReport } from './polaris-accessible-names.js';
import { POLARIS_HUMAN_PATH } from './polaris.js';
import { POLARIS_SOURCE_PATH } from './polaris-source.js';
import { POC_MACHINE_PATH } from './routes.js';

const USAGE = 'Usage: npm run poc:accessible-names-sweep -- --task <bead id> --base-url <http://127.0.0.1:port> --credential <token file> [--date <YYYY-MM-DD[-suffix]>] [--details <file outside the repository>]\n';

function argument(name: string): string | undefined {
  const index = process.argv.indexOf(name);
  return index === -1 ? undefined : process.argv[index + 1];
}

function byKind(violations: readonly NameHeadingViolation[]): Record<string, number> {
  const counts: Record<string, number> = {};
  for (const violation of violations) counts[violation.kind] = (counts[violation.kind] ?? 0) + 1;
  return counts;
}

interface MachineAnswer extends MachineAnswerSources {
  readonly evaluation: { readonly inputsDigest: string; readonly snapshot: string; readonly asOf: string };
  readonly project: { readonly revision: string };
}

/** The counts-only record: no rendered name, label or path is copied. */
function namesSweepEvidence(input: { readonly task: string; readonly capturedAt: string; readonly syzygyHead: string; readonly browser: { readonly executable: string; readonly version: string }; readonly answer: MachineAnswer; readonly report: WholeSurfaceReport }): Record<string, unknown> {
  const { report } = input;
  return {
    task: input.task,
    requirement: 'PWB-REQ-016',
    signedText: 'pwb-accessible-name-amendment-v1.0',
    capturedAt: input.capturedAt,
    syzygyHead: input.syzygyHead,
    browser: input.browser,
    evaluation: {
      inputsDigest: input.answer.evaluation.inputsDigest,
      snapshot: input.answer.evaluation.snapshot,
      asOf: input.answer.evaluation.asOf,
      projectRevision: input.answer.project.revision,
      shape: input.answer.projectShape.kind,
    },
    pageListSource: `machine answer ${POC_MACHINE_PATH}: entry page plus one ${POLARIS_SOURCE_PATH} response per projectShape.sources entry`,
    pages: report.pages.map((page, index) => ({
      position: index,
      page: page.page === 'entry' ? 'entry' : 'exact-source',
      ...(page.page === 'entry' ? {} : { sourceIdentitySha256: sha256(page.page) }),
      interactive: page.interactive,
      headings: page.headings,
      levelOneHeadings: page.levelOneHeadings,
      sharedLabelGroups: page.sharedLabelGroups,
      exactSourceTargetsInSharedLabelGroups: page.exactSourceTargets,
      violationsByKind: byKind(page.violations),
    })),
    totals: {
      pagesListed: report.pagesListed,
      pagesSwept: report.pagesSwept,
      interactive: report.interactive,
      headings: report.headings,
      violations: report.violations.length,
      violationsByKind: byKind(report.violations),
    },
  };
}

async function main(): Promise<number> {
  const task = argument('--task');
  const baseUrl = argument('--base-url');
  const credential = argument('--credential');
  if (task === undefined || baseUrl === undefined || credential === undefined) {
    process.stderr.write(USAGE);
    return 2;
  }
  const executable = findBrowserExecutable();
  if (executable === undefined) {
    process.stderr.write('No Chrome/Chromium found on PATH and SYZYGY_POC_BROWSER is unset; nothing measured.\n');
    return 2;
  }
  const token = readFileSync(credential, 'utf8').trim();
  const response = await fetch(new URL(POC_MACHINE_PATH, baseUrl), { headers: { authorization: `Bearer ${token}` } });
  if (response.status !== 200) {
    process.stderr.write(`${POC_MACHINE_PATH} answered ${response.status}; nothing swept.\n`);
    return 1;
  }
  const answer = await response.json() as MachineAnswer;
  const date = argument('--date') ?? new Date().toISOString().slice(0, 10);
  const output = join('docs', 'evidence', `pwb-p99-accessible-names-sweep-${date}.json`);
  const syzygyHead = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

  const browser = await launchBrowser(executable);
  let report: WholeSurfaceReport;
  try {
    const page = await browser.newPage();
    try {
      report = await sweepPolarisNamesAndHeadings(page, baseUrl, answer, POLARIS_HUMAN_PATH, POLARIS_SOURCE_PATH, async (url) => (await fetch(url)).status);
    } finally {
      await page.close();
    }
  } finally {
    await browser.close();
  }
  const evidence = namesSweepEvidence({ task, capturedAt: new Date().toISOString(), syzygyHead, browser: { executable: browser.executable, version: browser.version }, answer, report });
  mkdirSync(dirname(output), { recursive: true });
  writeFileSync(output, `${JSON.stringify(evidence, null, 2)}\n`);
  const details = argument('--details');
  if (details !== undefined) writeFileSync(details, `${JSON.stringify(report.violations, null, 2)}\n`);
  process.stdout.write(`pages ${report.pagesSwept}/${report.pagesListed}, interactive ${report.interactive}, headings ${report.headings}, violations ${report.violations.length} ${JSON.stringify(byKind(report.violations))}\nwrote ${output}\n`);
  return report.violations.length === 0 && report.pagesSwept === report.pagesListed ? 0 : 1;
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  },
);
