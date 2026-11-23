# Independent CC-REV-2/4 review — Polaris provider claim ledger

Verdict: REVISE

Frozen subject `41b4c599f0ba623e0e78293d6e0a745ad356f1af` at base `011b29506ff8d5d661925afec6f75d1d5bebc4bc`, syzygy-u05.13. Proposed spec SHA-256 `01921a6f85dbc42f9d40c55e596fe11cbcc31c3b9e22b1a97bd6d923b75d5fb5`. Reviewer actor `coordinator:codex-20261123-167df18c`.

[Inferred] The package introduces a single provider-mode claim ledger tied to an admitted snapshot and draft revision. Generated assertions link to ledger entries so the reader can recover their state, qualifications and actual support. The same typed ledger binding reaches composition, fidelity review and both presentations. Earlier supported records use their existing compatibility path. This is the claim-ledger and sentence-state part of N13's draft-only scope. Its corpus, example-envelope and quickstart stay within the original outcome.

## F1 — Require the ledger for new provider drafts

[Observed] REQ-polaris-generation-003 conditions the new projection on a provider bundle “using the claim-ledger interchange” (`proposed/polaris-generation/spec.md:11`). REQ-polaris-generation-019 defines what “the provider-mode claim-ledger interchange” records and describes prior-format availability (`:115`). Neither says that newly composed provider drafts must use that interchange. The proposed validation scenario rejects missing associations within a ledger or drafted sentence (`:176–180`), and the compatibility scenario covers reading a genuine earlier bundle (`:182–186`).

[Inferred] A new provider draft could still be generated using an earlier supported writer with no ledger, stay within the retained requirements and satisfy the added requirements vacuously. That would leave the weaker intermediate and unavailable sentence state that the N13 draft is meant to address. Require new provider-mode composition and its checked-draft/review records to use the ledger and satisfy the sentence projection. Reserve the ledger-unavailable arm for reading genuinely earlier supported artifacts. Add an executable scenario arm for refusal when new production offers a legacy format or omits the whole ledger, keeping the existing positive compatibility case for earlier artifacts.

## Readback

[Observed] The delta consists of six new files entirely within the named OpenSpec proposal package. The relevant original blocks are retained line-for-line, apart from insertion of the added obligation paragraphs and scenarios. REQ-003 retains its 87 predecessor lines and 10 scenarios, with two scenarios added. REQ-019 retains its 73 effective understanding-overlay predecessor lines and eight scenarios, with three scenarios added. The non-governed profile has no replacement block for either requirement. Captured direct evidence retains its own state. The two channels recover per-assertion support through the existing block-level citation, preserving RFC7-5/9/10. Editorial-draft provenance and non-citable status under RFC7-20 stay in the governing predecessor text. Mixed support produces disclosed Unknown under VIS-2 and the same identified input/ledger revision binds the deterministic projections under VIS-7. The package leaves operator-agent behavior and adoption records untouched. `git diff --check` passed; this review inspected draft behavior and does not establish runtime conformance.
