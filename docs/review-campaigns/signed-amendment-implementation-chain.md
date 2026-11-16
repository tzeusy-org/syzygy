# Signed-amendment implementation chain

## Patterns

- `R-IMPL-(?:P97|P100|P86|P96|TREE-FRAMING)-.*\.md`

## What was under review

Implementation code reviews of the shared-model chain authorized by `decisions/OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md` (P-97 → P-100 → P-86 → P-96 → tree framing), one fresh-context review per bead; implementation, binds nothing

## Last verdict of record, and where the findings landed

P-97 (`syzygy-u05.19`) round 1 `CONFIRM WITH EXCEPTIONS` (`R-IMPL-P97-BLOCK-PROVENANCE-1-RAW.md:2`) over `ffb3fc59`: nine notes, none revise. Notes 2, 3, 4, 7 and 8 are taken in `docs/evidence/p97-block-provenance-implementation-2026-10-15.json` (the shape reading, the measurement script's scope, mutant M16, the full before commit, the projection blocks); notes 1, 6 and 9 (the stale patch base, the `bd` lookup under a `/home/tze` temporary directory, the clone battery) are answered in the PR; note 5 needs no change. Then P-100 (`syzygy-u05.20`): round 1 `REVISE` (`R-IMPL-P100-GOVERNING-INTENT-1-RAW.md:2`) over `d966ff3e`, one revise and six notes. Finding 1 (an Unknown board beside observed items) is answered by a test that builds both Unknown-board states and shows neither channel serves an item set or a count, plus a reading in `docs/evidence/p100-governing-intent-implementation-2026-10-15.json`; notes 3 and 4 are taken in `eec027b7`, notes 6 and 7 in part (the route-table comment; one lookup per card), notes 2 and 5 are answered in the PR. Round 2 `CONFIRM WITH EXCEPTIONS` (`R-IMPL-P100-GOVERNING-INTENT-2-RAW.md:2`) over `abda604d`: five notes, none revise; note 4 (the unreachable `observedItemCount` arm) is filed as `syzygy-j67q`, the others are answered in the PR. [Observed 2026-10-21] The post-ceiling P-100 restoration source review (`R-IMPL-P100-RESTORATION-1-RAW.md`) assesses **“Ready to merge? Yes, conditional on required verification gates.”** at `2910f32b`, with one Minor exact-markup assertion note and no Critical/Important source finding. Its separate binding and disposition are in `docs/evidence/p100-restoration-review-binding-2026-10-21.json` and `p100-restoration-review-disposition-2026-10-21.md`; committed-tree/browser/private-size/hosted gates remain separately owned.
