import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { describe, expect, it } from 'vitest';
import { git, gitRepo } from './index.js';

describe('gitRepo', () => {
  const repo = gitRepo({ files: { 'a/b.txt': 'one\n', 'c.txt': 'two\n' } });

  it('hands out copies that hold the one commit', () => {
    const copy = repo.copy();
    expect(git(copy, 'rev-parse', 'HEAD')).toBe(repo.commit);
    expect(readFileSync(join(copy, 'a/b.txt'), 'utf8')).toBe('one\n');
    expect(git(copy, 'status', '--porcelain')).toBe('');
  });

  it('keeps copies independent of one another', () => {
    const first = repo.copy();
    const second = repo.copy();
    writeFileSync(join(first, 'c.txt'), 'changed\n');
    expect(readFileSync(join(second, 'c.txt'), 'utf8')).toBe('two\n');
  });
});
