// Creates one entry of every kind scratch_trace.cjs wraps, plus two it must not log, in the temp directory it is given.
// Run by trace_selftest.py; it removes nothing, so the self-test can compare the listing with the trace.
import fs from 'node:fs';
import { mkdir, mkdtemp, writeFile } from 'node:fs/promises';
import { spawnSync } from 'node:child_process';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

fs.mkdtempSync(join(tmpdir(), 'st-sync-'));
await mkdtemp(join(tmpdir(), 'st-promise-'));
await new Promise((resolve, reject) => fs.mkdtemp(join(tmpdir(), 'st-callback-'), (error) => (error ? reject(error) : resolve())));
fs.mkdirSync(join(tmpdir(), 'st-fixed-dir'));
await mkdir(join(tmpdir(), 'st-promise-dir'));
fs.writeFileSync(join(tmpdir(), 'st-file.txt'), 'x');
await writeFile(join(tmpdir(), 'st-promise-file.txt'), 'x');
fs.symlinkSync('st-file.txt', join(tmpdir(), 'st-link'));
// Not directly in the temp directory: must not be logged.
fs.mkdirSync(join(tmpdir(), 'st-fixed-dir', 'nested'));
fs.mkdtempSync(join(tmpdir(), 'st-fixed-dir', 'st-nested-'));
// A child Node process inherits NODE_OPTIONS and is traced under its own pid.
spawnSync(process.execPath, ['--input-type=module', '-e', "import fs from 'node:fs'; import { tmpdir } from 'node:os'; import { join } from 'node:path'; fs.mkdtempSync(join(tmpdir(), 'st-child-'));"], { stdio: 'inherit' });
