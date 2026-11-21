import * as fs from 'node:fs';
import path from 'node:path';
import { sha256 } from '@syzygy/support';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';
import { RUN_LAYOUT } from './state-directory.js';
import { checkStoredUrlRender } from './url-stored-render.js';

function fixture() {
  const run = tempDir('stored-url-render-');
  const site = path.join(run, RUN_LAYOUT.site, '2');
  const bodies = new Map([['index.html', '<p>Owned render</p>'], ['linked/own.json', '{"fixture":"é"}']]);
  for (const [name, body] of bodies) {
    const target = path.join(site, name);
    fs.mkdirSync(path.dirname(target), { recursive: true });
    fs.writeFileSync(target, body);
  }
  const population = [...bodies].map(([name, body]) => ({ path: name, sha256: sha256(body), bytes: Buffer.byteLength(body) }));
  const output = { files: 2, pages: 1, bytes: population.reduce((sum, file) => sum + file.bytes, 0), population };
  return { run, site, output, check: () => checkStoredUrlRender(run, site, output, () => true) };
}

describe('supervisor verification of stored URL renders', () => {
  it('reports the authenticated directory entry with its exact nested UTF-8 file population', () => {
    const f = fixture();
    expect(f.check()).toBe(2);
    fs.mkdirSync(path.join(f.run, RUN_LAYOUT.site, '7'));
    expect(f.check()).toBe(2);
    expect(checkStoredUrlRender(f.run, path.join(f.run, RUN_LAYOUT.site, '7'), f.output, () => true)).toBeNull();
    expect(checkStoredUrlRender(f.run, f.site + '/', f.output, () => true)).toBeNull();
    expect(checkStoredUrlRender(f.run, f.site, { ...f.output, bytes: f.output.bytes - 1 }, () => true)).toBeNull();
    expect(checkStoredUrlRender(f.run, f.site, { ...f.output, pages: 2 }, () => true)).toBeNull();
  });

  it('refuses unexpected, replaced and missing files', () => {
    const f = fixture();
    const extra = path.join(f.site, 'linked', 'extra.html');
    fs.writeFileSync(extra, '<p>Owned extra</p>');
    expect(f.check()).toBeNull();
    fs.unlinkSync(extra);
    expect(f.check()).toBe(2);
    fs.writeFileSync(path.join(f.site, 'index.html'), '<p>Owned repair</p>');
    expect(f.check()).toBeNull();
    fs.unlinkSync(path.join(f.site, 'index.html'));
    expect(f.check()).toBeNull();
  });

  it('refuses symlink and hard-link substitutions, even with identical file bytes', () => {
    const f = fixture();
    const original = path.join(f.site, 'index.html');
    const outside = path.join(f.run, 'outside.html');
    fs.renameSync(original, outside);
    fs.linkSync(outside, original);
    expect(f.check()).toBeNull();
    fs.unlinkSync(original);
    fs.symlinkSync(outside, original);
    expect(f.check()).toBeNull();
    fs.unlinkSync(original);
    fs.renameSync(outside, original);
    expect(f.check()).toBe(2);
  });

  it('refuses if currentness ends during the census', () => {
    const f = fixture();
    let checks = 0;
    expect(checkStoredUrlRender(f.run, f.site, f.output, () => ++checks < 5)).toBeNull();
    expect(checks).toBe(5);
    expect(f.check()).toBe(2);
  });
});
