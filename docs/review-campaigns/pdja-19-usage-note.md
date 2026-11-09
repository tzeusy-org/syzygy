# Polaris dossier delivery: the per-round usage note

## Patterns

- `R-PDJA-19-.*\.md`

## What was under review

`syzygy-pdja.19` (PR #803): each delivery to a waiting review session reports the packet's UTF-8 size and a usage note, which states what a continuing session already holds and that token use is not observed, and advises batched repairs and `--fresh`. The packet is unchanged. Also under review: the skill's repair step and the design note `docs/polaris-generation/fidelity-delta-review-proposal.md`, which finds that carrying confirmations forward needs a CC-REV-2 amendment.

## Last verdict of record, and where the findings landed

`CONFIRM WITH EXCEPTIONS` (`R-PDJA-19-USAGE-NOTE-1-RAW.md:4`), over `2e816384`, one round. Four notes, none blocking or revise. Dispositions follow in the next commit.
