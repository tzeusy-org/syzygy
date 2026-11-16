import { describe, expect, it } from 'vitest';
import { applyUnifiedPatch } from './unified-patch.js';

describe('applyUnifiedPatch', () => {
  it('applies a hunk at its stated line, keeping the lines around it', () => {
    expect(applyUnifiedPatch('a\nb\nc\nd\n', '--- x\n+++ x\n@@ -2,2 +2,2 @@\n b\n-c\n+C\n')).toBe('a\nb\nC\nd\n');
  });
  it('refuses a hunk whose context does not stand at its stated line', () => {
    expect(() => applyUnifiedPatch('a\nb\n', '@@ -1,1 +1,1 @@\n-x\n+y\n')).toThrow('the patch does not apply at line 1');
  });
  it('copies only the lines the text has when a hunk starts past its end (the Math.min guard): no blank lines appear', () => {
    expect(applyUnifiedPatch('a\nb', '@@ -5,0 +5,1 @@\n+new\n')).toBe('a\nb\nnew');
  });
});
