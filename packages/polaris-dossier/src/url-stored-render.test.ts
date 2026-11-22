import * as fs from 'node:fs';
import path from 'node:path';
import { encodeCanonicalJson } from '@syzygy/polaris-generation-core/live';
import { sha256 } from '@syzygy/support';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it, vi } from 'vitest';
import { RUN_LAYOUT } from './state-directory.js';
import * as productReads from './url-product-reads.js';
import { checkStoredUrlRender, readStoredUrlRenderOutput } from './url-stored-render.js';

const outputDigest = (output: unknown): string => sha256(encodeCanonicalJson(output,
  { maxBytes: 2_097_152, maxNodes: 65_536, maxDepth: 32 }));

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

describe('read-only recovery of stored URL render metadata', () => {
  it('returns exact immutable nested UTF-8 metadata in validator code-unit order', () => {
    const f = fixture();
    const added = new Map([['z.html', '<p>last</p>'], ['A.json', '{"first":true}'], ['nested.html/page.json', '{}']]);
    for (const [file, body] of added) {
      const target = path.join(f.site, file);
      fs.mkdirSync(path.dirname(target), { recursive: true });
      fs.writeFileSync(target, body);
    }
    const population = [...f.output.population, ...[...added].map(([file, body]) =>
      ({ path: file, sha256: sha256(body), bytes: Buffer.byteLength(body) }))]
      .sort((a, b) => a.path < b.path ? -1 : a.path > b.path ? 1 : 0);
    const expected = { files: 5, pages: 2, bytes: population.reduce((sum, file) => sum + file.bytes, 0), population };
    const result = readStoredUrlRenderOutput(f.run, 2, outputDigest(expected), () => true);
    expect(result).toEqual(expected);
    expect(result?.population.map(file => file.path)).toEqual(['A.json', 'index.html', 'linked/own.json', 'nested.html/page.json', 'z.html']);
    expect(Object.isFrozen(result)).toBe(true);
    expect(Object.isFrozen(result?.population[0])).toBe(true);
    expect(checkStoredUrlRender(f.run, f.site, result!, () => true)).toBe(2);
    expect(readStoredUrlRenderOutput(f.run, 2, '0'.repeat(64), () => true)).toBeNull();
    expect(readStoredUrlRenderOutput(f.run, -1, outputDigest(expected), () => true)).toBeNull();
  });

  it('refuses drift between its original snapshots and the final independent check', () => {
    const f = fixture();
    const original = productReads.snapshotProductFile;
    const spy = vi.spyOn(productReads, 'snapshotProductFile').mockImplementationOnce((...args) => {
      const captured = original(...args);
      // Identical replacement bytes pass a new digest-only census. The original
      // descriptor snapshot must still detect the intervening inode change.
      fs.renameSync(path.join(f.site, 'index.html'), path.join(f.run, 'retired.html'));
      fs.writeFileSync(path.join(f.site, 'index.html'), '<p>Owned render</p>');
      return captured;
    });
    try { expect(readStoredUrlRenderOutput(f.run, 2, outputDigest(f.output), () => true)).toBeNull(); }
    finally { spy.mockRestore(); }
    expect(readStoredUrlRenderOutput(f.run, 2, outputDigest(f.output), () => true)).toEqual(f.output);
  });

  it('refuses linked files, linked directories, unsupported files and unrepresented directories', () => {
    const f = fixture(), digest = outputDigest(f.output);
    const original = path.join(f.site, 'index.html'), outside = path.join(f.run, 'outside.html');
    fs.renameSync(original, outside);
    fs.symlinkSync(outside, original);
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toBeNull();
    fs.unlinkSync(original);
    fs.linkSync(outside, original);
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toBeNull();
    fs.unlinkSync(original);
    fs.renameSync(outside, original);
    const linked = path.join(f.site, 'linked'), outsideDirectory = path.join(f.run, 'outside-directory');
    fs.renameSync(linked, outsideDirectory);
    fs.symlinkSync(outsideDirectory, linked);
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toBeNull();
    fs.unlinkSync(linked);
    fs.renameSync(outsideDirectory, linked);
    const extra = path.join(f.site, 'extra.txt');
    fs.writeFileSync(extra, 'unsupported');
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toBeNull();
    fs.unlinkSync(extra);
    fs.mkdirSync(extra);
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toBeNull();
    fs.rmdirSync(extra);
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => true)).toEqual(f.output);
  });

  it('admits the byte ceiling and refuses the next byte or an over-limit file population', () => {
    const run = tempDir('stored-url-render-bounds-'), site = path.join(run, RUN_LAYOUT.site, '0');
    fs.mkdirSync(site, { recursive: true });
    const body = 'x'.repeat(2_097_152);
    fs.writeFileSync(path.join(site, 'index.html'), body);
    const output = { files: 1, pages: 1, bytes: body.length,
      population: [{ path: 'index.html', bytes: body.length, sha256: sha256(body) }] };
    expect(readStoredUrlRenderOutput(run, 0, outputDigest(output), () => true)).toEqual(output);
    fs.appendFileSync(path.join(site, 'index.html'), 'x');
    const oversized = { ...output, bytes: body.length + 1,
      population: [{ path: 'index.html', bytes: body.length + 1, sha256: sha256(body + 'x') }] };
    expect(readStoredUrlRenderOutput(run, 0, outputDigest(oversized), () => true)).toBeNull();
    fs.unlinkSync(path.join(site, 'index.html'));
    const population = Array.from({ length: 4097 }, (_, i) => ({ path: `${String(i).padStart(4, '0')}.json`, bytes: 2, sha256: sha256('{}') }));
    for (const file of population) fs.writeFileSync(path.join(site, file.path), '{}');
    expect(readStoredUrlRenderOutput(run, 0, outputDigest({ files: 4097, pages: 0, bytes: 8194, population }), () => true)).toBeNull();
    fs.unlinkSync(path.join(site, population.at(-1)!.path));
    const admitted = { files: 4096, pages: 0, bytes: 8192, population: population.slice(0, -1) };
    expect(readStoredUrlRenderOutput(run, 0, outputDigest(admitted), () => true)).toEqual(admitted);
  });

  it('refuses if currentness ends during discovery', () => {
    const f = fixture();
    let checks = 0;
    expect(readStoredUrlRenderOutput(f.run, 2, outputDigest(f.output), () => ++checks < 5)).toBeNull();
    expect(checks).toBe(5);
    expect(readStoredUrlRenderOutput(f.run, 2, outputDigest(f.output), () => true)).toEqual(f.output);
  });

  it('retains a single currentness failure at every sampled checkpoint', () => {
    const f = fixture(), digest = outputDigest(f.output);
    let total = 0;
    expect(readStoredUrlRenderOutput(f.run, 2, digest, () => { total++; return true; })).toEqual(f.output);
    expect(total).toBeGreaterThan(0);
    for (let failure = 1; failure <= total; failure++) {
      let checks = 0;
      expect(readStoredUrlRenderOutput(f.run, 2, digest, () => ++checks !== failure), `checkpoint ${failure}/${total}`).toBeNull();
    }
  });
});
