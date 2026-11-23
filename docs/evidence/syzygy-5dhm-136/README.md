# Reader's edition evidence (syzygy-5dhm.136)

Not authority. Records of the change that put the subject first on every operator-agent dossier page.

| File | What it is |
|---|---|
| `reader-edition-mutation-2026-11-23.json` | One mutant per new predicate, each with its `old` and `new` fragment, the commit it ran at and the tests that killed it: 20 of 20 killed at `41c4c155`. A first run at `3d4a72b0` left two survivors (the disclosure check accepted the "Not established." lead in place of the `[Unknown]` marking, and an in-test mutation removed the reason from the attribute too); the predicate and two in-test mutations were fixed in `41c4c155` before this run. |
| `reader_edition_mutation.mjs` | The harness. `node reader_edition_mutation.mjs <worktree> <out.json> <scratch> [--dry] [--only ids]`; it rewrites sources in place, so nothing else may edit the tree while it runs. |
| `reader-edition-measurement-2026-11-23.json` | Every stored run with a stored draft (seven), drawn again by the default branch's renderer (`beforeCommit`) and this change's (`commit`): pages, words on the reading path and under "About this run", links resolved with their denominator, the navigation's shape, the landing page's order, and each Unknown or withheld claim's disclosure on its page. Its `method` and `limits` say what was and was not measured. |
| `reader_edition_rerender.ts`, `reader_edition_render_all.sh` | The scratch re-render: a copy of each run directory (never the run's agent or session directories) drawn through the functions the render command calls, with no model session and no consent. The shell script names the scratch directory it ran in. |
| `reader_edition_measure.py`, `reader_edition_record.py` | The counts over the two renders (they print counts, never page text) and the record built from them and the pilot's stored grades. |
| `readers_edition_build_spec.py`, `readers_edition_delta.py`, `readers_edition_survival.py` | The version 2.22 text and its semantic delta, from the bytes: `build_spec.py <worktree> <out>` rebuilds `openspec/changes/dossier-readers-edition/proposed/polaris-generation/spec.md` from version 2.20's by anchored edits (byte for byte); `delta.py <worktree>` writes the package's `SEMANTIC-DELTA.md`; `survival.py <predecessor> <new>` prints the line and scenario survival counts. |

The reader-form text the comparison sessions read is not committed: it quotes another repository.
