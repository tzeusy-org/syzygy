// Launches Chrome through the POC browser helper <launches> times in a row and says how each launch ended.
//
// Usage: TMPDIR=<private> node launch_close.mjs <worktree> <launches>
//
// Each launch is the sequence the browser tests use: launchBrowser, newPage, navigate, page.close,
// browser.close. The helper's own spawn is observed (child_process.spawn is wrapped before the helper
// is imported) so a row can say whether the Chrome leader exited (`exitCode`) or was killed
// (`signalCode` SIGKILL, closeDisposableBrowser's hard stop after the 1 s close grace). `newEntries`
// lists what the launch added to the temp directory and did not remove (node-compile-cache excluded).
// Prints one JSON object on stdout; the helper is the built one, <worktree>/apps/three-surface-poc/dist.
import { createRequire, syncBuiltinESMExports } from 'node:module';
import { readdirSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

const childProcess = createRequire(import.meta.url)('node:child_process');
const realSpawn = childProcess.spawn;
let lastChild;
childProcess.spawn = (...args) => { lastChild = realSpawn(...args); return lastChild; };
syncBuiltinESMExports();

const [worktree, launchesText] = process.argv.slice(2);
const launches = Number(launchesText);
const { findBrowserExecutable, launchBrowser } = await import(join(worktree, 'apps/three-surface-poc/dist/cdp-browser.js'));
const executable = findBrowserExecutable();
const entries = () => readdirSync(tmpdir()).filter((name) => name !== 'node-compile-cache');
const rows = [];
for (let launch = 1; launch <= launches; launch += 1) {
  const before = new Set(entries());
  const row = { launch };
  try {
    const browser = await launchBrowser(executable);
    const child = lastChild;
    const page = await browser.newPage();
    await page.navigate('about:blank');
    await page.close();
    const closing = Date.now();
    await browser.close();
    row.closeMs = Date.now() - closing;
    row.exitCode = child.exitCode;
    row.signalCode = child.signalCode;
  } catch (error) {
    row.error = String(error instanceof Error ? error.message : error).split('\n')[0];
  }
  row.newEntries = entries().filter((name) => !before.has(name)).sort();
  rows.push(row);
}
console.log(JSON.stringify({ executable, tmpdir: tmpdir(), tmpdirLength: tmpdir().length, rows }));
