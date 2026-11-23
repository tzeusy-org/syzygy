# Reader's edition evidence (syzygy-5dhm.136)

Not authority. Records of the change that put the subject first on every operator-agent dossier page.

| File | What it is |
|---|---|
| `reader-edition-mutation-2026-11-23.json` | One mutant per new predicate, each with its `old` and `new` fragment, the commit it ran at and the tests that killed it: 25 of 25 killed at `3e4b20b1`. The record was first run at `3d4a72b0`, where two mutants survived, and then at `41c4c155`, where 20 of 20 were killed; git history keeps that run. The current run adds the four mutants of the review fixes in `f4e04733` (the overview figure before the map, the fold tied to the page-class file, other pages counted) and `contents-index-moved` for the contents page's index position (recheck N1, test in `3e4b20b1`). |
| `reader_edition_mutation.mjs` | The harness. `node reader_edition_mutation.mjs <worktree> <out.json> <scratch> [--dry] [--only ids]`; it rewrites sources in place, so nothing else may edit the tree while it runs. |
| `reader-edition-measurement-2026-11-23.json` | Every stored run with a stored draft (seven), drawn again by the default branch's renderer (`beforeCommit`) and this change's (`commit`): pages, words on the reading path and under "About this run", links resolved with their denominator, the navigation's shape, the landing page's order, and each Unknown or withheld claim's disclosure on its page. Its `method` and `limits` say what was and was not measured. |
| `reader_edition_rerender.ts`, `reader_edition_render_all.sh` | The scratch re-render: a copy of each run directory (never the run's agent or session directories) drawn through the functions the render command calls, with no model session and no consent. The shell script names the scratch directory it ran in. |
| `reader_edition_measure.py`, `reader_edition_record.py` | The counts over the two renders (they print counts, never page text) and the record built from them and the pilot's stored grades. |
| `readers_edition_build_spec.py`, `readers_edition_delta.py`, `readers_edition_survival.py` | The version 2.22 text and its semantic delta, from the bytes: `build_spec.py <worktree> <out>` rebuilds `openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md` from version 2.20's by anchored edits (byte for byte); `delta.py <worktree>` writes the package's `SEMANTIC-DELTA.md`; `survival.py <predecessor> <new>` prints the line and scenario survival counts. |
| `readers-2026-11-23/` | The reader sessions (rule A-38): 8 new arms (before, after, reader form and original site, on runs `658f2f90` and `d9411d26`) and 3 kept pilot arms, graded blind against the pilot key (81 facts); answers, grades, labels, totals script and output, with its own README. |

The reader-form text the comparison sessions read is not committed: it quotes another repository.
