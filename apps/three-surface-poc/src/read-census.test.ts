// syzygy-qu5j: reads one canary file through each route the read census records (read-census-canaries.ts). With the
// census on, scripts/check_read_census.mjs fails when any of these reads is missing from this file's census line, so a
// recorder that stops seeing a route cannot pass silently. With the census off it only proves the canaries are readable.
import { closeSync, copyFileSync, cpSync, createReadStream, mkdtempSync, openAsBlob, openSync, readFile, readFileSync, rmSync } from 'node:fs';
import { copyFile, open, readFile as readFilePromise } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { afterAll, describe, expect, it } from 'vitest';
import { CANARIES } from '../../../read-census-canaries.js';

const ROOT = fileURLToPath(new URL('../../../', import.meta.url));
// Named here as a path literal so PR selection picks this test when a canary changes (the census checks that too).
const DIR = 'apps/three-surface-poc/src/fixtures/read-census-canaries/';
const at = (route: keyof typeof CANARIES): string => join(ROOT, CANARIES[route]);
const expected = (route: string): string => `read-census canary: ${route}\n`;
const scratch = mkdtempSync(join(tmpdir(), 'read-census-'));
afterAll(() => rmSync(scratch, { recursive: true, force: true }));

describe('read census canaries', () => {
  it('keeps every canary under the directory this file names', () => {
    for (const path of Object.values(CANARIES)) expect(path.startsWith(DIR), path).toBe(true);
  });

  it('reads each canary through its own route', async () => {
    const seen: Record<string, string> = {};
    seen['readFileSync'] = readFileSync(at('readFileSync'), 'utf8');
    seen['readFile'] = await new Promise<string>((done, fail) => readFile(at('readFile'), 'utf8', (error, text) => (error ? fail(error) : done(text))));
    seen['promises.readFile'] = await readFilePromise(at('promises.readFile'), 'utf8');
    seen['createReadStream'] = await new Promise<string>((done, fail) => {
      let text = '';
      createReadStream(at('createReadStream'), 'utf8').on('data', (chunk) => { text += String(chunk); }).on('end', () => done(text)).on('error', fail);
    });
    const descriptor = openSync(at('openSync'), 'r');
    seen['openSync'] = readFileSync(descriptor, 'utf8');
    closeSync(descriptor);
    const handle = await open(at('promises.open'), 'r');
    seen['promises.open'] = await handle.readFile('utf8');
    await handle.close();
    copyFileSync(at('copyFileSync'), join(scratch, 'a'));
    seen['copyFileSync'] = readFileSync(join(scratch, 'a'), 'utf8');
    await copyFile(at('promises.copyFile'), join(scratch, 'b'));
    seen['promises.copyFile'] = readFileSync(join(scratch, 'b'), 'utf8');
    cpSync(at('cpSync'), join(scratch, 'c'));
    seen['cpSync'] = readFileSync(join(scratch, 'c'), 'utf8');
    seen['openAsBlob'] = await (await openAsBlob(at('openAsBlob'))).text();
    expect(Object.keys(seen).sort()).toEqual(Object.keys(CANARIES).sort());
    for (const [route, text] of Object.entries(seen)) expect(text, route).toBe(expected(route));
  });
});
