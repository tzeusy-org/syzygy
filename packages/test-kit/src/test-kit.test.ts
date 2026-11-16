import { existsSync } from 'node:fs';
import { describe, expect, it } from 'vitest';
import { attributeValues, gitBlobId, removeTempDirs, tagsOf, tempDir } from './index.js';

describe('tempDir', () => {
  it('makes an empty directory and removes it on request', () => {
    const directory = tempDir('kit-test-');
    expect(existsSync(directory)).toBe(true);
    removeTempDirs();
    expect(existsSync(directory)).toBe(false);
  });
});

describe('gitBlobId', () => {
  it('matches git hash-object for the empty blob and for text', () => {
    expect(gitBlobId('')).toBe('e69de29bb2d1d6434b8b29ae775ad8c2e48c5391');
    expect(gitBlobId('hello\n')).toBe('ce013625030ba8dba906f756967f9e9ca394464a');
  });
});

describe('html query', () => {
  const html = '<a href="/x" id=\'one\'>x</a><abbr title="t">y</abbr><a href="/y">z</a>';
  it('finds opening tags of exactly the named tag', () => {
    expect(tagsOf(html, 'a')).toEqual(['<a href="/x" id=\'one\'>', '<a href="/y">']);
  });
  it('reads quoted attribute values', () => {
    expect(attributeValues(html, 'href')).toEqual(['/x', '/y']);
    expect(attributeValues(html, 'id')).toEqual(['one']);
  });
});
