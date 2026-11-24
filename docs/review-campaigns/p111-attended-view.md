# P-111 attended-view design

## Patterns

- `syzygy-zwja-attended/ZWJA-ATTENDED-VIEW-DESIGN-BAR-.*-RAW\.md`

## What was under review

[Observed] This review examines the bounded attended-view design for syzygy-zwja criterion 3 against the protected REQ-048 and retained P-111 candidate.

## Last verdict of record, and where the findings landed

[Observed] The independent criterion-3 design walkthrough returned `REVISE` at protected `b4abfcf5c7c1d4a62d1f4341220f89439bafc627`, archived verbatim at `syzygy-zwja-attended/ZWJA-ATTENDED-VIEW-DESIGN-BAR-R1-RAW.md:1`. It found that the written view does not bind same-run detachment and reattachment well enough to distinguish a live attempt from gated resume, and that a wait or question cue lacks a safe text and keyboard path. Its transcript pairs are illustrative, with no tool activity.

[Inferred] The [candidate amendment](../../openspec/changes/polaris-dossier-one-command-run/ATTENDED-VIEW-DESIGN.md) proposes specific cue, identity and recovery rules for both findings. It preserves the earlier P-111 reviews and does not change or supersede their subject bytes. The original candidate's design, impact, coverage, dependency, recorder and adoption acceptance beyond this attended-view slice remains on syzygy-zwja. [Earlier composition and review](p111-current-composition.md)

[Observed] The independent amendment review at `cc71be19c8624068e33883761077cd18d65158b9` returned `REVISE` on two evidence gaps, archived verbatim at `syzygy-zwja-attended/ZWJA-ATTENDED-VIEW-DESIGN-BAR-R2-RAW.md:1`. The original detach example omitted the deadline. The original keyboard example named no key sequence or way to discover it. The amended candidate preserves the nine pairs and adds separate matched controls for these two cues.
