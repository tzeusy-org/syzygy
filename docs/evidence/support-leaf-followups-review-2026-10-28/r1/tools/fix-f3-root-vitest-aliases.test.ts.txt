import { join, relative, sep } from 'node:path';
import { pathToFileURL } from 'node:url';
import { describe, expect, it } from 'vitest';
import { ROOT, entryModules } from './workspace-reach.testkit.js';

// syzygy-bpyt.46 (the PR 545 round-1 review's item 3): the root vitest.config.ts maps workspace specifiers to source modules by hand,
// so a test that imports one runs the module the map names, not necessarily the one Node loads. Each alias is pinned here to the src
// module its package's own entry names (`entryModules`, which the S10 no-egress bundle also aliases by), and the entries the map leaves
// unaliased are a literal list. Vite applies the first alias, in the config's order, that equals a specifier or is a prefix of it
// followed by `/`, so an unaliased subpath of an aliased package is rewritten under that package's src entry, where no module is: the two
// dossier subpaths are pinned as so shadowed (the PR 554 round-1 review), and each other unaliased entry loads from its package's built
// dist through node_modules.
const CONFIG = (await import(pathToFileURL(join(ROOT, 'vitest.config.ts')).href)) as { default: { resolve: { alias: Record<string, string> } } };
const ALIASES = Object.fromEntries(Object.entries(CONFIG.default.resolve.alias).map(([specifier, target]) => [specifier, relative(ROOT, target).split(sep).join('/')]));
/** The alias key Vite applies to a specifier (vite 7.3.6's `matches`): the first, in the config's order, equal to it or a prefix of it followed by `/`. */
const aliasFor = (specifier: string): string | undefined => Object.keys(ALIASES).find((key) => specifier === key || specifier.startsWith(`${key}/`));

describe('the root vitest.config.ts aliases', () => {
  it("alias each specifier to the src module its package's entry names", () => {
    const entries = entryModules();
    expect(Object.fromEntries(Object.keys(ALIASES).map((specifier) => [specifier, entries[specifier]]))).toEqual(ALIASES);
  });

  it('leave exactly these entries unaliased', () => {
    expect(Object.keys(entryModules()).filter((specifier) => !(specifier in ALIASES)).sort()).toEqual([
      '@syzygy/app', '@syzygy/polaris-dossier/argv', '@syzygy/polaris-dossier/state-directory', '@syzygy/three-surface-poc-app',
      '@syzygy/three-surface-poc-app/dossier-render', '@syzygy/three-surface-poc-app/dossier-site',
    ]);
  });

  it('match each aliased specifier by its own alias first, so no shorter alias ahead of it shadows it', () => {
    expect(Object.keys(ALIASES).filter((specifier) => aliasFor(specifier) !== specifier)).toEqual([]);
  });

  it('shadow exactly the two dossier subpaths, which the bare dossier alias rewrites to no module', () => {
    expect(Object.keys(entryModules()).filter((specifier) => !(specifier in ALIASES) && aliasFor(specifier) !== undefined)
      .map((specifier) => `${specifier} -> ${aliasFor(specifier)}`).sort()).toEqual([
      '@syzygy/polaris-dossier/argv -> @syzygy/polaris-dossier', '@syzygy/polaris-dossier/state-directory -> @syzygy/polaris-dossier',
    ]);
  });
});
