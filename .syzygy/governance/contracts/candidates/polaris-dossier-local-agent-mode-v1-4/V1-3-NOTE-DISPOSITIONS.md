# Version 1.4 — disposition of v1.3 notes and the PR740 excerpt residual

> **Candidate — binds nothing.** [Inferred] Proposed dispositions for
> `syzygy-mea.10.6`, not review clearance or owner adoption. The original
> sibling record and raw remain unchanged. A disposition saying “proposed”
> means the v1.4 patch contains text; it does not claim runtime completion.

[Observed] The source is
`../POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-3-REVIEW-NOTES.md`, notes 1–14,
which retains the exact round-2 verdict and subject binding. Its raw is
`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md` from the repository
root. The PR740 source is round-3 note 1 in
[R-MEA10-RICH-ELEMENTS-9a7a-3-RAW.md](https://github.com/tzeusy-org/syzygy/blob/063f42b69c3e39e31dfcf6832e419e6b6e403493/docs/reviews/R-MEA10-RICH-ELEMENTS-9a7a-3-RAW.md) on that PR; its receipt
is in `SOURCE-RECEIPTS.json`.

[Inferred] Proposed text is in REQ-polaris-generation-034 and the matching
design/proposal patches unless a row explicitly gives another disposition.
These rows carry the complete note population, including notes whose
outcome is preservation or separately owned work.

| Note | Explicit v1.4 disposition | Scope and evidence |
|---|---|---|
| 1 — excerpt escaping and non-UTF-8 withholding | Proposed: byte-for-byte source text is HTML-escaped; invalid UTF-8 renders Unknown `excluded-content`, no bytes. The admitted-excerpt scenario and falsifier cover escaping; excluded-file scenarios include invalid UTF-8. | Existing runtime work stays with PR740 and `.10.8`; no implementation or test is claimed here. Read-then-excluded range checks are retained. |
| 2 — collapsed qualifications/Unknown | Proposed: a `details` summary shows its Unknown-claim count even while collapsed, in a new scenario and matching design row. | This is a disclosure, not a verdict or proof that every qualification is visible while collapsed. No fragment target moves inside `details`. |
| 3 — cell meaning through headings | Proposed: fidelity judges each cell with its row and column labels; the rendering scenario and falsifier name this context. | Each claim still has its own label, citations and fidelity entry. Empty cells state nothing. |
| 4 — tone and step order carry meaning | Proposed: both are presentation within the same agent-reported, independently reviewed residual as short labels; neither may introduce an unlabelled fact. | The proposal now admits the partial mechanical checks and reviewer judgment; no claim that syntax establishes truth. |
| 5 — language label as file fact | Proposed: agent language is a presentation hint; absent a hint, derive a label from the path where one can be determined. | No new source read; no assertion that the agent's language hint was verified. |
| 6 — element placement | Proposed: “in a section or deep dive”, matching the design's `paragraphs` arrays and existing nesting. | v2 has no elements; v3 fields and nesting do not change. |
| 7 — excerpt citation cross-reference and >60 wording | Proposed: name the path-and-range check and write “a citation of more than 60 lines”; the code-only no-read exception is explicit. | Ordinary-block range obligations remain. Missing/non-blob paths, malformed/reversed ranges and >60-line excerpts still fail without an excluded-body read. |
| 8 — character-length unit | Proposed: 120 Unicode code points in the obligation, scenario, falsifier and design. | No UTF-16-unit or grapheme-count substitution. The derived Unknown count is separate from the agent's summary limit. |
| 9 — passing arms in two failure scenarios | Proposed: move passing claim/label arms into “Presentation element rendered inert”. | “Claim inside a presentation element checked as a block” and “Short label carries no claim” keep their failure WHEN/THEN predicates. |
| 10 — proposal sounds mechanically closed | Proposed: presentation carries no claim, “which Syzygy checks in part and the reviews judge”. | The owner is shown the residual, including contextual cell/tone/order judgment. |
| 11 — “no entry” can read as a negative | Proposed: visible `-` (U+002D) for a cell stating nothing, with no label/citation/quotation. An absence or negative still needs an Inferred claim with citations or Unknown with reason. | Supersedes the note's alternative only if v1.4 is signed. The owner's recorded answer directed `-` to v1.4; v1.3 stays `no entry` until then. |
| 12 — sweep accounting changed at reviewed commit | Refreshed in this version's `DEPENDENCY-SWEEP.json` and `IMPACT-LEDGER.md`, with this baseline and explicit exclusions. | The v1.3 ledger, its historical population and the note's correction remain unchanged. Candidate files themselves are excluded from the baseline sweep, explicitly. |
| 13 — recorder binds review through spec digest only | Preserved residual: the existing recorder binds the review through the spec digest. Its `verify_reviewed`/`package_unchanged` guards also check candidate-package drift before recording; that does not establish a three-subject review binding. | `.10.9` owns the separate snapshot/recorder investigation. This package neither invents an all-three-file gate nor claims that work complete. Minimal version registration is distinct and must serialize with that owner. |
| 14 — P115 unaffected reading was tied to v1.2 | Already dispositioned by `OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04`, including the accepted cost: no reconfirmation of P115's `explicitly-unaffected` classification for amended 034. | Preserve the later-signed-input rule, frozen records, manifests and reviews. Do not re-sign P115 or ask the owner that settled choice again. A new signed version still has to pass its own builder chain. |
| PR740 round-3 note 1 — path-excluded excerpt has no end check | Proposed: body-end exception is confined to code excerpts excluded before any body read; read-then-excluded bodies retain available range checks, including invalid UTF-8, without length/byte disclosure. | The ordinary-block citation gap remains `.10.7`; this amendment does not erase it. No read for line counting is authorized. |
| PR740 round-3 note 1 — displayed submitted range is unverified | Proposed: a withheld excerpt may display that range only inside its Unknown presentation with explicit agent-supplied/unverified disclosure; it must not call it a verified range or source length. | This resolves the text residual only after sign-off. Cause-specific runtime withholding wording and tests remain with `.10.8`/PR740. |

## Cohesion and sequencing

[Observed] At the read-only canonical issue snapshot on 2026-11-05,
`.10.8` and `.10.9` were unshaped review-follow-up children. The coordinator
is shaping them separately; this table does not consume either as done.

[Inferred] This bead owns the versioned text amendment and its eventual
selection/install outcome. `.10.8` owns bounded runtime/test follow-up;
`.10.9` owns snapshot/recording evidence follow-up. `.10.7` owns the
ordinary-block range gap. Serialize any shared recorder/version-pin edit
with those owners, and preserve PR740's frozen review and evidence files.
