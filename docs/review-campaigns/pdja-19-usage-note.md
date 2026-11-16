# Polaris dossier delivery: the per-round usage note

## Patterns

- `R-PDJA-19-.*\.md`

## What was under review

`syzygy-pdja.19` (PR #803): each delivery to a waiting review session reports the packet's UTF-8 size and a usage note, which states what a continuing session already holds and that token use is not observed, and advises batched repairs and `--fresh`. The packet is unchanged. Also under review: the skill's repair step and the design note `docs/polaris-generation/fidelity-delta-review-proposal.md`, which finds that carrying confirmations forward needs a CC-REV-2 amendment.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-19-USAGE-NOTE-1-RAW.md:4`), over `2e816384`, one round. Four notes, none blocking or revise, all fixed in the commits after this one. Finding 1 (two unlabelled claims about what a session does) is fixed: the note now says what Syzygy delivered, and marks what a continuing session does with its context as [Inferred]. Finding 2 (a delivery record `deliveries()` drops goes uncounted) is fixed: the note counts every round below this one, and a round with no readable record is Unknown; a new mutant (M7) pins it. The round numbering and the continuity text it shares the filter with are unchanged. Finding 3 (two cost claims that disagree with the design note's own model) is fixed: batching is now about 70-85% over six rounds, not half, and the recommendation says option D also shrinks the growing term. Finding 4 (row A's "(Observed)" against a note with no label) is fixed both ways: the note labels the packet's bytes Observed, and row A describes every label the note gives. The mutation record now holds eight mutants, all killed at `4569f5d1`.
