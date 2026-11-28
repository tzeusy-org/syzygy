import { describe, expect, it } from 'vitest';
import type { LocalBase } from '@syzygy/polaris-generation-core/live';
import { baseChip, baseHiddenItems, baseMachine, baseNotice, baseTallyClause } from './dossier-base.js';

// A derived base's page words (REQ-polaris-generation-034 version 2.35, syzygy-3efd.38). Every expected text is a literal written from the
// requirement's scenarios, never built by the module under test.

type Drawn = Extract<LocalBase, { readonly state: 'drawn' }>;
const dirs = Array.from({ length: 250 }, (_, k) => `d${String(k).padStart(3, '0')}`);
const DEEP: Drawn = {
  state: 'drawn', map: 'directories', elements: [], shown: 2, total: 250, root: 'shown',
  notListed: { directories: 3, secretPathsLeftOut: 0, submodules: 0 }, select: ['.', 'api', 'web'],
  restReason: { count: 248, names: dirs.slice(2).map((d) => `${d}/`), root: false, paths: dirs.slice(2), reason: 'Other directories' }, hides: [], names: [],
};

describe('the derived base on the page (version 2.35)', () => {
  it('Chip links from a deeper page: `../maps/directories.html`, and the map\'s own uncounted sentence', () => {
    expect(baseChip(DEEP, 'poles/2.html')).toBe('<p class="base-chip" data-visual-provenance="computed">Showing 2 of 250 top-level directories, with the repository root, from the '
      + '<a href="../maps/directories.html">Directory map</a>; 248 hidden by this dossier. The map also counts 3 more top-level directories it does not list, 0 files it leaves out '
      + 'and does not name because a secret detector matches their path, and 0 submodules it does not follow.</p>');
    expect(baseHiddenItems(DEEP)).toBe('<li class="base-hidden" data-hidden-count="248">Not shown here: 248 top-level directories: d002/, d003/, d004/, d005/, d006/, d007/, d008/, '
      + 'd009/, d010/, d011/, d012/, d013/, and 236 more. This dossier\'s reason: Other directories</li>');
  });

  it('Pruned view prints its chip: 9 of 31 packages, no further sentence, and the base tally', () => {
    const names = Array.from({ length: 22 }, (_, k) => `pkg${k + 1}`);
    const pruned: Drawn = { state: 'drawn', map: 'units', elements: [], shown: 9, total: 31, root: null, notListed: { facts: 0, unknownFiles: 0, secretPathsLeftOut: 0 },
      select: null, restReason: null, hides: [{ count: 22, names, root: false, paths: names, reason: 'Test fixtures and examples' }], names: [] };
    expect(baseChip(pruned, 'index.html')).toBe('<p class="base-chip" data-visual-provenance="computed">Showing 9 of 31 packages and modules from the <a href="maps/units.html">Unit map</a>; 22 hidden by this dossier.</p>');
    expect(baseHiddenItems(pruned)).toBe('<li class="base-hidden" data-hidden-count="22">Not shown here: 22 packages and modules: pkg1, pkg2, pkg3, pkg4, pkg5, pkg6, pkg7, pkg8, pkg9, '
      + 'pkg10, pkg11, pkg12, and 10 more. This dossier\'s reason: Test fixtures and examples</li>');
    expect(baseTallyClause('units', Array(9).fill('inferred'), 9, 0)).toBe(' 9 boxes and 0 arrows computed by Syzygy from the Unit map: 0 observed, 9 inferred, 0 unknown.');
  });

  it('Unknown base renders a notice and a `base` member of three fields alone; an unresolved base names no path', () => {
    expect(baseNotice({ state: 'unknown', map: 'directories' }, 'index.html', { reason: 'source-uncaptured-or-unreachable', words: 'the pinned tree could not be listed' }))
      .toBe('<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable">Not established. This figure starts from the Directory map, which is '
        + 'Unknown at this render: the pinned tree could not be listed. <a href="maps/directories.html">See the map</a>.</p>');
    expect(baseMachine({ state: 'unknown', map: 'directories' }, [], 'source-uncaptured-or-unreachable')).toEqual({ map: 'directories', established: false, reason: 'source-uncaptured-or-unreachable' });
    expect(baseNotice({ state: 'unresolved', map: 'units' }, 'poles/1.html', { reason: 'x', words: 'y' }))
      .toBe('<p class="figure-notice" data-epistemic="unknown" data-unknown-reason="source-uncaptured-or-unreachable">Not established. This figure starts from the Unit map, which this '
        + 'dossier\'s check could not read, and its base does not resolve against the map at this render. <a href="../maps/units.html">See the map</a>.</p>');
  });
});
