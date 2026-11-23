import { mkdirSync, readdirSync, readFileSync, symlinkSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';
import { decodeUtf8 } from '@syzygy/support';
import { tempDir } from '@syzygy/test-kit';
import { describe, expect, it } from 'vitest';

const TREES = ['apps/three-surface-poc/src', 'packages/three-surface-poc-core/src'];
const PREDICATE = 'case-insensitive literal butler in strict UTF-8';

function census(root: string, trees: readonly string[], allowed: readonly string[]) {
  const matching: string[] = [];
  let decoded = 0;
  for (const tree of trees) {
    for (const entry of readdirSync(join(root, tree), { withFileTypes: true })) {
      if (!entry.isFile() || !entry.name.endsWith('.ts')) continue;
      const path = `${tree}/${entry.name}`;
      const text = decodeUtf8(readFileSync(join(root, path)));
      if (text === undefined) throw new Error(`Portability debt census could not decode ${path}`);
      decoded++;
      if (/butler/i.test(text) && !allowed.includes(path)) matching.push(path);
    }
  }
  return { decoded, matching: matching.sort() };
}

describe('the reporting-only POC portability debt census', () => {
  it('counts NUL-bearing files, detects distinctive added copy and records allowlist scope', () => {
    const root = tempDir('syzygy-portability-debt-');
    mkdirSync(join(root, 'src', 'nested'), { recursive: true });
    writeFileSync(join(root, 'src', 'profile.ts'), 'BUTLER known profile occurrence');
    writeFileSync(join(root, 'src', 'screen.ts'), 'A title without the distinctive noun');
    writeFileSync(join(root, 'src', 'null.ts'), Buffer.concat([Buffer.from('Butler anchored term'), Buffer.from([0])]));
    writeFileSync(join(root, 'src', 'nested', 'nested.ts'), 'butler outside population');
    symlinkSync('profile.ts', join(root, 'src', 'link.ts'));

    const allowlist = ['src/profile.ts'];
    expect(census(root, ['src'], allowlist)).toEqual({ decoded: 3, matching: ['src/null.ts'] });

    writeFileSync(join(root, 'src', 'screen.ts'), 'Portability regression marker: butler-extra-visible-name');
    expect(census(root, ['src'], allowlist)).toEqual({ decoded: 3, matching: ['src/null.ts', 'src/screen.ts'] });
    expect(census(root, ['src'], [])).toEqual({
      decoded: 3,
      matching: ['src/null.ts', 'src/profile.ts', 'src/screen.ts'],
    });
  });

  it('prints the measured lexical population and its blind spot', () => {
    const root = fileURLToPath(new URL('../../../', import.meta.url));
    const allowlist: readonly string[] = [];
    const { decoded, matching } = census(root, TREES, allowlist);
    console.log(JSON.stringify({
      report: 'pwb-portability-debt',
      predicate: PREDICATE,
      scope: 'regular top-level .ts files in both POC source trees',
      decoded,
      matchCount: matching.length,
      matchingPaths: matching,
      allowlist,
      blindSpot: 'Noun-free framing can still make unsupported claims. This count establishes lexical debt only.',
    }));
  });
});
