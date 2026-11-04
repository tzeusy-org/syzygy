# Polaris dossier local-agent mode v1.3 — round-2 review notes

> **Candidate — binds nothing.** This is the sibling record for the notes of
> the second fresh-context review of version 1.3 of the
> `polaris-dossier-local-agent-mode` amendment (PR #734). Under the owner's
> notes-only rule
> (`../../decisions/POLARIS-GATE-SITTING-2026-09-26-DECISION.md` §1), a round
> with no revise-level finding clears the exact bytes it read, and its notes
> go in a sibling record, never into the reviewed bytes. So this file sits
> outside the package directory and edits nothing in it. It signs nothing
> off: only the owner's own selection does that (VIS-4). The sign-off is
> version-tagged and binds no act digest, so nothing here is registered in
> `check_governance.py`.

Reviewed record: docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2-RAW.md

## What was confirmed

- **Package:** `.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-3/`
  (patches under its `proposed/` and five prose files), on PR #734, not on
  `main`.
- **Reviewed commit:** `92a6d2d091d7d7595dc33eee32665525d6b0ec94`.
- **Subject:** the change's `specs/polaris-generation/spec.md` after
  `proposed/spec.md.patch` is applied to the v1.2 bytes, sha256
  `5c11c59188489b62611817efb13e6ff25c71a56f712cdc40c2dd444c7d56a6b3`.
- **Verdict:** `CONFIRM WITH EXCEPTIONS`, on line 4 of the raw named on the
  `Reviewed record:` line above, with fourteen findings, each a note.
- Round 1 returned `REVISE` over `ffc2e0fe` (1 revise, 10 notes); its raw is
  docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-ffc2-1-RAW.md and its dispositions
  are in the package's `REVIEW-1-DISPOSITIONS.md`.

## The notes and what happens to each

None changes what 1.3 requires. Each is carried here, not repaired in the
reviewed bytes. "Implementation" means bead `syzygy-mea.10.5`; "later
version" means a v1.4 text change, if the owner wants one.

### 1 — "byte for byte" excerpt rendering leaves HTML escaping unstated and untested

Implementation obligation: the excerpt's text is the cited lines byte for
byte, rendered as entity-encoded text (as the existing source-page sink
already requires), with a fixture whose cited lines carry `<`, `&` and
`</pre>`, and a test that they never render as markup. A non-UTF-8 blob
renders withheld with its reason. Later version: say so in the spec.

### 2 — A collapsed section can hide an Unknown or a qualification by default

Implementation: a `details` summary shows a count of the Unknown claims it
holds. Later version: make it a SHALL.

### 3 — A table cell's claim is read through its headings

Implementation: the fidelity review criteria say a cell is judged as read
with its row and column labels. Later version: one phrase in 034.

### 4 — The callout tone and the order of steps carry meaning no rule classes

Later version: name tone and step order beside the short labels as
presentation, inside the stated residual.

### 5 — A code excerpt's `language` label states a fact about the file

Implementation: derive the language from the path where the agent gives
none, and treat the agent's value as a presentation hint. Later version:
say so.

### 6 — "Standing where a claim block may stand" is broader than the design's nesting

The schema decides structure (034's first check), so nothing conflicts.
Later version: "in a section or deep dive".

### 7 — "the citation rules ... apply to it" names rules written for labelled blocks

The path-and-range check reaches the excerpt's citation, and the scenario
names it. Later version: cite that check and spell "a citation of more than
60 lines".

### 8 — "120 characters" names no unit

Implementation: count Unicode code points. Later version: state the unit.

### 9 — Two scenarios' AND clauses describe the passing case, not the WHEN

Later version: move the passing arms to "Presentation element rendered
inert"; the scenarios are falsifiable as written.

### 10 — The proposal states the label rule as closed

Later version: "carry no claim, which Syzygy checks in part and the reviews
judge". The owner packet already states the residual.

### 11 — "no entry" can itself read as a negative

Implementation: render the empty cell as "not stated in this dossier", which
names the draft rather than the subject and is one reading of "the visible
words "no entry"" only if the owner accepts it; otherwise later version.
Until then, the implementation renders "no entry" as written.

### 12 — The ledger's sweep has moved two rows at the reviewed commit

At `92a6d2d0` the population is 8,664: `polaris-dossier-local-draft-v2`
also matches the retained round-1 raw, and the new decision also matches
the campaign file `docs/review-campaigns/dossier-local-agent-v1-3.md`. Both
are retained or campaign files the install does not edit. Recorded here,
not in the ledger.

### 13 — The packet says more than the recording tool checks about the design and proposal bytes

The recorder binds the review by the spec digest only, as for v1.2. The
lead's offer to the owner says so; a recorder change binding all three
patches is a separate tooling bead.

### 14 — Option 2(a) does not state that P115's classification of 034 is bound to the v1.2 block

The owner question on P115 carries this cost beside option 2(a): P115's
`REQUIREMENT-CONSUMPTION.json` classifies REQ-polaris-generation-034
`explicitly-unaffected` against its v1.2 block, and under 2(a) nobody
re-confirms that for the amended 034. Option 2(b) carries the
re-confirmation.
