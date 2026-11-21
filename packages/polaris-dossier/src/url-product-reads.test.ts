import * as fs from 'node:fs';
import path from 'node:path';
import { describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';
import { snapshotProductFile, snapshotProductNames, sameProductFile, sameProductPath } from './url-product-reads.js';

describe('bounded product IO data snapshots (no provenance authority)', () => {
  it('captures exact regular bytes, bounded names, stable absence and path identity without following links', () => {
    const root = tempDir('url-product-read-'); fs.mkdirSync(path.join(root, 'own')); fs.writeFileSync(path.join(root, 'own/a.json'), 'Own data.');
    const read = () => snapshotProductFile(root, 'own/a.json', 32, () => {}), first = read();
    expect(Buffer.from(first.bytes!).toString()).toBe('Own data.'); expect(sameProductFile(first, read())).toBe(true);
    const names = snapshotProductNames(root, 'own', 1, () => {}); expect(names.names).toEqual(['a.json']);
    const absent = snapshotProductFile(root, 'missing/path.json', 32, () => {}); expect(absent.bytes).toBeNull();
    expect(sameProductFile(absent, snapshotProductFile(root, 'missing/path.json', 32, () => {}))).toBe(true);
    fs.mkdirSync(path.join(root, 'missing')); expect(sameProductFile(absent, snapshotProductFile(root, 'missing/path.json', 32, () => {}))).toBe(false);
    fs.writeFileSync(path.join(root, 'own/b.json'), 'Own second.'); expect(() => snapshotProductNames(root, 'own', 1, () => {})).toThrow();
    expect(sameProductPath(names, snapshotProductNames(root, 'own', 2, () => {}))).toBe(true);
    fs.renameSync(path.join(root, 'own/a.json'), path.join(root, 'own/old.json')); fs.writeFileSync(path.join(root, 'own/a.json'), 'Own data.');
    expect(sameProductFile(first, read())).toBe(false);
    fs.unlinkSync(path.join(root, 'own/a.json')); fs.symlinkSync(path.join(root, 'own/old.json'), path.join(root, 'own/a.json')); expect(read).toThrow();
    fs.unlinkSync(path.join(root, 'own/a.json')); fs.linkSync(path.join(root, 'own/old.json'), path.join(root, 'own/a.json')); expect(read).toThrow();
  });
  it('rejects traversal, intermediate links, nonregular files, excessive bytes and cancelled/mid-read mutations', () => {
    const root = tempDir('url-product-race-'); fs.mkdirSync(path.join(root, 'own')); fs.writeFileSync(path.join(root, 'own/a.json'), 'Own data.');
    for (const file of ['../own/a.json', '/own/a.json', 'own/../a.json', 'own//a.json', 'own']) expect(() => snapshotProductFile(root, file, 32, () => {})).toThrow();
    fs.symlinkSync(path.join(root, 'own'), path.join(root, 'linked')); expect(() => snapshotProductFile(root, 'linked/a.json', 32, () => {})).toThrow();
    expect(() => snapshotProductFile(root, 'own/a.json', 1, () => {})).toThrow();
    expect(() => snapshotProductFile(root, 'own/a.json', 32, () => { throw Error('own cancelled'); })).toThrow('url-product-read-unavailable');
    let calls = 0; expect(() => snapshotProductFile(root, 'own/a.json', 32, () => { if (++calls === 4) fs.appendFileSync(path.join(root, 'own/a.json'), 'changed'); })).toThrow();
  });
});
