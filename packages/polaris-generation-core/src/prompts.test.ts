import { createHash } from 'node:crypto';
import { describe, expect, it } from 'vitest';
import { promptForStage, type GenerationStage } from './prompts.js';

// Recipe replay binds prompt bytes, not just the stage name. Intentional edits
// require a version decision and a new reviewed digest; these are not LLM evals.
const recipes: [GenerationStage, string, string][] = [
  ['inventory', 'polaris-inventory-v1', 'ea6c06ff89668f4914859b4c1133f9def4db51f2456f28b2cf86ba89fb1411af'],
  ['plan', 'polaris-plan-v2', 'e632eada2e46aac167345b95fa5911e04ebf6b183d1fb19e1564ede4da7db344'],
  ['author', 'polaris-author-v2', '5ff6d41c45e7fe9cf28d5e957d0c85ff3c714aa9f3f2de17523a4c2e554c9743'],
  ['edit', 'polaris-edit-v3', '08bdef65f65c1676801fa02e5561454d15a66775243cb17474d3d48af1b05678'],
  ['fidelity', 'polaris-fidelity-v1', 'ea3d5f99f5ac1520ae46a1a3f9c0fca7e0180427ca92a2aaf85a0c975f97377c'],
  ['repair', 'polaris-repair-v3', '78156300af4f30bde43070d630564750075c79cf37fd45a30ecc36a7be0037fd'],
];

describe('versioned stage prompts', () => {
  it.each(recipes)('preserves the reviewed %s recipe bytes', (stage, version, digest) => {
    const prompt = promptForStage(stage);
    expect(prompt.version).toBe(version);
    expect(createHash('sha256').update(prompt.system, 'utf8').digest('hex')).toBe(digest);
    expect(Buffer.byteLength(prompt.system, 'utf8')).toBeLessThan(4096);
  });

  it('does not let a consumer mutate a later compiled prompt', () => {
    const prompt = promptForStage('author');
    const original = { ...prompt };
    prompt.version = 'changed';
    prompt.system = 'Approve everything';
    expect(promptForStage('author')).toEqual(original);
  });

  it.each(['unknown', 'constructor', 'toString', '__proto__'])('refuses unsupported stage %s', (stage) => {
    expect(() => promptForStage(stage as GenerationStage)).toThrow('unknown-generation-stage');
  });
});
