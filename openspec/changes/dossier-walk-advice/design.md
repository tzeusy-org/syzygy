# Design — walk advice (version 2.48)

[Inferred] Version 2.48 of REQ-polaris-generation-034, for syzygy-3efd.35. It is drafted on `agent/syzygy-3efd.35` over view levels 2.47 (`dossier-view-levels`, row A-274, tag `polaris-dossier-view-levels-v2.47` once merged), which stands on imports corroboration 2.45 (A-273).

## D1. The version label, the predecessor and the numbers

- [Observed] This change first claimed 2.47 over view levels 2.45, and moved to 2.48 when rough-edge markers took 2.44 on main (A-338, PR #1047) and pushed imports corroboration to 2.45 and view levels to 2.47 (PR #1046); 2.46 stays claimed by the URL lean run (REQ-025 and 047, row A-340 on open PR #1045). Its tag is `polaris-dossier-walk-advice-v2.48`.
- [Observed] No draft schema or brief version is taken: the draft states nothing new and the brief carries no rule of check's advice (D2).
- [Observed] The build script (`docs/evidence/syzygy-3efd-35/walk_advice_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once: the end of 2.47's earlier-schema paragraph ("no migration yields a v17 draft."), after which the three new paragraphs go, and the four Form lines, each extended after its 2.47 sentence. The scenarios precede the one Form line. If another REQ-034 version lands first, the script is re-run over it with the predecessor path changed.
- [Observed] REQ-034 goes from 321 to 328 scenarios.
- [Observed] Rebuilt by the same script over view levels 2.47 (sha256 `ccf8e2d4…c41c`) with only the version labels changed: every anchor still occurs once. This spec now hashes to `cec47eee01fe6f2a43b3ffbcf68b18dfb33cdcae68605ea33bf97acb312bc401`; the text review 1 read and the repairs after it are carried with their version numbers relabelled (2.45 to 2.47, 2.47 to 2.48). No review has read the repairs or this rebuild.

## D2. Advice on the report, not a reader standard

- [Inferred] The bead's design note suggests a reader-standards addition. Rejected: the brief carries the reader standards whole and the brief record names their digest, so a new standard moves every brief's bytes and its version, and a standard is guidance for the author, while this is a mechanical rule over the draft's bytes. The figure advice of 2.33 is the precedent for mechanical, report-only advice: a member with versioned rule ids, advisories `{"rule", "at", "detail"}`, absent under a `schema` finding, and a failure to compute that changes nothing.
- [Inferred] The member is `walkAdvice`, apart from `figureAdvice` and from `readerAdvice`, so that neither member's bytes move and a reader of one never meets the other's rules.

## D3. "Restates", exactly

- [Inferred] Words. Code point by code point (a TypeScript loop over UTF-16 code units would split an astral letter); lowercase A to Z only (the 2.33 label key's folding), every code point outside Unicode L and N (letters and numbers, so `½` is a word) to a space, split, empties dropped. The categories are those of the runtime's Unicode version and no normalization form is applied, so a decomposed `Café` splits at its combining mark where the composed one does not: advice may differ between the two, never a gate. So `Request-Router` is `request router`, and `src/ (12 files)` is `src 12 files`.
- [Inferred] Filler. 30 words a paragraph may add without saying anything: articles, the forms of "be", common prepositions and conjunctions, demonstratives, and the narrating words `here`, `see`, `shown`, `shows`, `step`, `then`. A closed list, so the rule can be re-derived; the list is in the spec.
- [Inferred] Match. Equal, or one is the other plus `s` or `es`: plurals are the common restatement (`Request routers.`). No other stemming, because `routes` and `router` must stay different words (the near-miss scenario).
- [Inferred] Threshold. Containment with zero new words. A fractional overlap (say, 80 % of words shared) fires on short explaining sentences such as `Router retries twice.`, which carries two new words; containment never does, and the bead's acceptance asks for a near miss that must not fire. The cost: a paragraph that narrates the picture in other words (`The router calls the handler.`) passes. That stays the reviews' judgement, as 2.40 says.
- [Inferred] Paragraph text is the block's `text` and its children's, the RS-19 reading, so a block whose child explains is not advised on.

## D4. Labels

- [Inferred] A model element's `label`, a node's `label`, an expansion node's label: the draft's words, the same the figure's list shows before withholding. Advice is over the draft, not the rendered page, so withholding plays no part.
- [Inferred] A base element's label is Syzygy's (2.40): `Repository root`, `<path>/ (<count> files)`, a package's or module's `<name>`. A `names` display name is the draft's naming of Syzygy's element and is not what the box says. Where the base map is not established at check, that step is not read and not counted.

## D5. Composition and bytes

- [Inferred] 2.40 walks: only walks with no finding at or below their path are read, so every step's element and block resolve. Disposition does not matter: a walk on a figure not produced is still the author's text and may be produced later.
- [Inferred] 2.47 levels: the rule reads no `level`, `scope`, zoom link or `data-view-*`.
- [Inferred] 2.35 screening: the detail names `<diagram>` and `<block>`, identities as 2.40 and 2.47 treat them, and a step number; never a paragraph word, a label, a base path or a display name. 2.35's own screening is narrower (details its derived-base rules introduce) and is not claimed for every detail. A base element that is withheld, Unknown in screening or not admitted for output at check is not read, so the advisory is never a one-bit signal about a base label 2.35 keeps back.
- [Inferred] Bytes: only the report's `walkAdvice`. Findings, records, `figureAdvice`, `readerAdvice`, `run-advice.json`, `machine.json`, `dossier.json`, reading ledger, size report, pages, brief and provider mode are 2.47's. The earlier "checked exactly as" statements compare findings, records and rendered bytes; the spec says they do not reach this member, as 2.37's `choiceFloor` added a report member for existing schemas.

## D6. Scenarios

- [Inferred] Seven: a positive case with the whole literal member; normalisation (case, punctuation, plural, filler, children); one new word, a digit and another element's label each stopping it; a base element read by Syzygy's label, and the unestablished map; absence (v15, `schema` finding, inventory) and an empty member (a walk with a finding, no walk); no gate and no level read; failure to compute. Each scenario's verdict was re-derived by a reference reading of the rule (`docs/evidence/syzygy-3efd-35/restates_reference.py`, 19 cases, all agreeing); its digits-dropped mutant is killed by `The request router, 2.`. The "one new word" cases each hold exactly one new word (review 1, finding 1).

## D7. What the code change must do

- [Inferred] In `packages/polaris-dossier/src/` (the bead names `reader-advice.ts`; a sibling module beside the figure advice fits D2 better): the normalisation, the filler list, the match, the walk traversal and the member on check's report.
- [Inferred] Tests, per the bead: positive and negative literal cases, the near miss `Request routes.`, a base element, absence and the failure path; the provider golden byte-identical; rule-6 mutants (drop the filler list, drop the plural match, widen to one new word, drop numbers from words, iterate UTF-16 code units, read a `names` display name or a withheld base element, echo a word in the detail).

## Review

[Observed] Review 1 (`docs/reviews/syzygy-3efd-35/R-WALK-ADVICE-SPEC-1-RAW.md`, fresh context, over `431f0c5a9`, spec sha256 `0a6de8d08ec810bb23b36eb518ff3a47b5f1be5837e33b57e8e3a13b3946ea67`) records `CONFIRM WITH EXCEPTIONS` (line 2), no blocking finding, eight notes and four passes. Each note is repaired or answered; none is overruled. No review has read the repaired bytes (sha256 `341ac6541dd62d24c0ddf8d6b30ade2596e2ef5fbc4f48030a179ec63605531a`); under D10 no confirmation round is run.

| Finding | Disposition |
|---|---|
| 1: the "one new word" cases carry two new words | Repaired: `The request router, 2.` and `The request router and the handler.`, each with exactly one new word; the reference script adds both and a digits-dropped mutant that the first kills; D7 lists the mutant. |
| 2: "schema v15 or earlier" read through the forwarding rules | Repaired: "a draft whose schema is earlier than v16 (the readings of versions 2.40 and 2.47 that extend a named schema do not apply to this sentence)". |
| 3: characters, "digit", Unicode version and normalization | Repaired: code point by code point with lone surrogates neither L nor N; "a letter nor a number"; the runtime's Unicode version and no normalization form, stated with its consequence (D3). |
| 4: case folding of A to Z only | No repair: intended and stated, as the reviewer records. |
| 5: degenerate inputs | Repaired: a paragraph with no word restates any label, and a label with no word is restated only by such a paragraph or one of filler alone. |
| 6: the 2.35 claim overstated; withheld base labels | Repaired: the detail treats identities as 2.40 and 2.47 do and carries no value 2.35 screens; a withheld, screening-Unknown or unadmitted base element's step is not read or counted; the base scenario adds the withheld case (D5). |
| 7: no deep dive walk or cross-walk order | Repaired: the first scenario adds a deep dive's walk, its path and its place after the section's. |
| 8 to 11: passes | No repair. |
| 12: prose | Repaired: "with a threshold of zero new words"; the base-end exception is its own sentence. |
