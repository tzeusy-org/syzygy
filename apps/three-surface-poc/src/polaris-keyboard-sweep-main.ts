// `npm run poc:keyboard-sweep -- --task <bead id> --base-url <private daemon>`
// — the keyboard sweep of the served Polaris page (syzygy-1z3.30; PWB-REQ-016,
// a prerequisite of the task 4.6 cold-open walkthrough).
//
// `poc:accessibility-check` sweeps fixture variants; this sweeps the page
// a reader is actually served. It fetches `/polaris` from a running private
// daemon twice — directly, and with the tailnet Host header `tailscale
// serve` forwards (the mount form) — retains both bodies in a private
// temporary directory, runs `checkPolarisAccessibility` over each in a real
// headless browser, and writes a dated evidence record: per mount the
// served digest, the focusable population and how much of it Tab reached,
// the fragment activations, and the violations by kind. `--file` sweeps a
// retained capture instead of a live daemon. The record names the bead it is
// evidence for (`--task`, required) and the Butlers revision, evaluation
// identity and walkthrough evaluation identity every swept page renders
// (syzygy-buzg, syzygy-7dch); it refuses pages that name none, or disagree.
//
// It reads no Butlers repository itself; the daemon (`main.ts`) never
// imports it. Exits 0 only when every swept page has zero violations.
import { execFileSync } from 'node:child_process';
import { mkdirSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import * as http from 'node:http';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';
import { sha256 } from '@syzygy/support';

import { TAILNET_HOST } from './browser-origin.js';
import { findBrowserExecutable, launchBrowser } from './cdp-browser.js';
import { defaultRunGit } from './governance-inputs.js';
import { KEYBOARD_SWEEP_USAGE, keyboardSweepEvidence, keyboardSweepOutput, parseKeyboardSweepArguments, sweptEvaluation, violationsByKind, type KeyboardSweep } from './keyboard-sweep-record.js';
import { checkPolarisAccessibility } from './polaris-accessibility.js';
import { POLARIS_HUMAN_PATH } from './polaris.js';
import { pwbSurfaceVersion } from './walkthrough-inputs.js';

/** GET with an explicit Host header — the Fetch API drops a set Host. */
function get(baseUrl: string, path: string, host?: string): Promise<{ readonly status: number; readonly body: Buffer }> {
  return new Promise((resolvePromise, reject) => {
    const url = new URL(path, baseUrl);
    const request = http.get(url, { headers: host === undefined ? {} : { Host: host } }, (response) => {
      const chunks: Buffer[] = [];
      response.on('data', (chunk: Buffer) => chunks.push(chunk));
      response.on('end', () => resolvePromise({ status: response.statusCode ?? 0, body: Buffer.concat(chunks) }));
      response.on('error', reject);
    });
    request.on('error', reject);
  });
}

async function main(): Promise<number> {
  const parsed = parseKeyboardSweepArguments(process.argv.slice(2));
  if ('refused' in parsed) {
    process.stderr.write(`${parsed.refused}\n${KEYBOARD_SWEEP_USAGE}`);
    return 2;
  }
  const { task, baseUrl, files } = parsed;
  const executable = findBrowserExecutable();
  if (executable === undefined) {
    process.stderr.write('No Chrome/Chromium found on PATH and SYZYGY_POC_BROWSER is unset; nothing measured.\n');
    return 2;
  }
  const output = keyboardSweepOutput(parsed, new Date().toISOString().slice(0, 10));
  const repoRoot = resolve('.');
  const head = execFileSync('git', ['rev-parse', 'HEAD'], { encoding: 'utf8' }).trim();

  const pages = mkdtempSync(join(tmpdir(), 'syzygy-poc-keyboard-sweep-'));
  const targets: { readonly mount: string; readonly measuredOn: Readonly<Record<string, unknown>>; readonly body: Buffer }[] = [];
  try {
    if (baseUrl !== undefined) {
      for (const [mount, host] of [['direct', undefined], ['tailnet', TAILNET_HOST]] as const) {
        const response = await get(baseUrl, POLARIS_HUMAN_PATH, host);
        if (response.status !== 200) {
          process.stderr.write(`${mount} ${POLARIS_HUMAN_PATH} answered ${response.status}; nothing swept.\n`);
          return 1;
        }
        targets.push({ mount, measuredOn: { path: POLARIS_HUMAN_PATH, host: host ?? new URL(baseUrl).host, status: response.status }, body: response.body });
      }
    } else {
      for (const file of files) targets.push({ mount: `file:${file}`, measuredOn: { file }, body: readFileSync(file) });
    }
    const evaluation = sweptEvaluation(targets.map((target) => ({ mount: target.mount, html: target.body.toString('utf8') })));
    if ('refused' in evaluation) {
      process.stderr.write(`${evaluation.refused}; nothing swept.\n`);
      return 1;
    }

    const browser = await launchBrowser(executable);
    const sweeps: KeyboardSweep[] = [];
    try {
      for (const [index, target] of targets.entries()) {
        const file = join(pages, `polaris-${index}.html`);
        writeFileSync(file, target.body);
        const page = await browser.newPage();
        try {
          const report = await checkPolarisAccessibility(page, pathToFileURL(file).href, target.mount);
          sweeps.push({ mount: target.mount, measuredOn: target.measuredOn, bytes: target.body.byteLength, sha256: sha256(target.body), report });
          process.stdout.write(`${target.mount}: focusables ${report.focusTrace.reached}/${report.focusTrace.population}, activations ${report.activations.length}, violations ${report.violations.length} ${JSON.stringify(violationsByKind(report))}\n`);
        } finally {
          await page.close();
        }
      }
    } finally {
      await browser.close();
    }

    const evidence = keyboardSweepEvidence({
      task,
      evaluation,
      capturedAt: new Date().toISOString(),
      syzygyHead: head,
      surfaceVersion: pwbSurfaceVersion(defaultRunGit, repoRoot, head),
      browser: { executable: browser.executable, version: browser.version },
      sweeps,
    });
    const violations = (evidence.totals as { readonly violations: number }).violations;
    mkdirSync(output.directory, { recursive: true });
    writeFileSync(output.file, `${JSON.stringify(evidence, null, 2)}\n`);
    process.stdout.write(`wrote ${output.file}: ${violations} violations across ${sweeps.length} mounts\n`);
    return violations === 0 ? 0 : 1;
  } finally {
    rmSync(pages, { recursive: true, force: true });
  }
}

main().then(
  (code) => process.exit(code),
  (error: unknown) => {
    process.stderr.write(`${error instanceof Error ? error.stack ?? error.message : String(error)}\n`);
    process.exit(1);
  },
);
