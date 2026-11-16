# Polaris dossier gate sources

## Patterns

- `R-POLARIS-DOSSIER-GATE-SOURCES-.*\.md`

## What was under review

Pre-merge review of the dossier gate sources reading the local-agent sitting's acts and the registry entry's v1.0 sign-off, `packages/polaris-dossier/src/gate-sources.ts` and `packages/polaris-generation-consent/src/package-reader.ts` (PR #377, `syzygy-qkea.21`); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `REVISE` (`R-POLARIS-DOSSIER-GATE-SOURCES-1-RAW.md:2`) over `ff832300`: two revise findings (a withdrawal naming a provider statement by its Record ID or Subject was not seen; the registry sign-off could not be withdrawn by its tag, and a test pinned the fail-open) and six notes, repaired in the same PR with notes 4 and 5; note 3 (the gate binds no reader bytes) is the owner's sitting question E, disclosed in the PR body; note 7's real-tree pins go to the sitting's install step. Round 2 `REVISE` (`R-POLARIS-DOSSIER-GATE-SOURCES-2-RAW.md:2`) over `014545fc`: two revise findings (the P-104 exemption hid any register line opening with the P-104 cell; records were checked line by line rather than as the recorder's whole output) and seven notes, repaired in the same PR: the exemption is pinned to the row's exact bytes, each record must equal its recorder's template rendered from its own fields, and the notes' stems, recorder-path test and PR-body disclosure are added. Round 3 `CONFIRM WITH EXCEPTIONS` (`R-POLARIS-DOSSIER-GATE-SOURCES-3-RAW.md:2`) over `a6157cb0`: no revise findings and four notes. Note 1, a test requiring the open P-104 row unconditionally, was made tree-conditional in the same PR as a lead disposition. Notes 2–4 (artifact headings as stems, `CONFIRM` with a disposition, a second cross-check field set) went to a P2 follow-up bead
