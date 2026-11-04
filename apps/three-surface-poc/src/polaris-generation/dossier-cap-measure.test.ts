import { join } from 'node:path';
import { beforeAll, describe, expect, it } from 'vitest';
import { tempDir } from '@syzygy/test-kit';

import { measureDossierCapSelection, type DossierCapMeasurement } from './redis-shaped-measure.js';

let scratch = '', measured: DossierCapMeasurement;
beforeAll(async () => {
  scratch = tempDir('syzygy-dossier-cap-');
  measured = await measureDossierCapSelection(join(scratch, 'repo'));
}, 120_000); // builds a git fixture and runs dossier discovery over it: up to 1.1 s in 5 alone runs at load1 22-24 (docs/evidence/syzygy-bpyt-4-31/repair-durations/dossier-cap-measure.test.hooks.json), but 5.1 s, past half the 10 s hook default, in one review run at load1 46-55 (docs/reviews/R-GP-IMPL-TEST-TIMEOUTS-1-RAW.md §3.4)

describe('what heuristic discovery reads under the dossier cap on the design-prose fixture (no model)', () => {
  // Before the role signals of the prior (measured at the baseline commit): 4 of 18 core files, 134,671 bytes of them; 99,997 bytes of release notes, 60,050 of configuration and 3,065 of build files read.
  it('reads more of the core, and none of the release notes, configuration or build files, once the prior has role signals', () => {
    expect(measured).toMatchObject({ selectedBytes: 399_859, selectedBlobs: 19, partialBlobs: 2, coreRead: 10, coreReadBytes: 302_641, designDocsRead: 5 });
    expect(measured.bytesByClass).toEqual({ 'design-docs': 60_509, 'other-prose': 920, source: 338_430 });
    for (const unwanted of ['release-notes', 'configuration', 'build', 'tests', 'vendored']) expect(measured.bytesByClass[unwanted] ?? 0, unwanted).toBe(0);
  });
});
