# Session-prompt tool statement

## Patterns

- `R-PR406-SESSION-TOOL-STATEMENT-.*\.md`

## What was under review

Post-merge review of `session-prompt`'s refusal of a `--tool` whose pair with the run's provider has no in-force per-project statement, `packages/polaris-dossier/src/session-handover.ts` (PR #406, `syzygy-up98`, repairing R-DOSSIER-AGENT-PROVIDER-V2-1 finding 1); implementation, binds nothing

## Last verdict of record, and where the findings landed

Round 1 `CONFIRM WITH EXCEPTIONS` (`R-PR406-SESSION-TOOL-STATEMENT-1-RAW.md:2`) over `b077815b`; #406 merged at that head. E1 (the refusal test did not cover the packet under `reviews/`, so the reviewer's late-gate mutant R1 survived) repaired in a follow-up PR: the test compares the whole state root before and after, and R1 is killed. N1 (the ambiguous arm untested and worded as "no statement in force") and N3 (no design-kind case) repaired in the same PR. E2 (the session pair's statement is neither cited nor re-checked after the hand-over) is a separate bead; N2 (the session's provider is the run's by construction) needs no change
