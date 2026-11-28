# Design — walk advice (version 2.47)

[Inferred] Version 2.47 of REQ-polaris-generation-034, for syzygy-3efd.35. It is drafted on `agent/syzygy-3efd.35` over view levels 2.45 (`dossier-view-levels`, row A-274, tag `polaris-dossier-view-levels-v2.45` once merged), which stands on imports corroboration 2.44 (A-273).

## D1. The version label, the predecessor and the numbers

- [Observed] 2.45 is the newest REQ-034 version claimed (on `agent/syzygy-3efd.39`, PR #1046). The label 2.46 is taken by the URL lean run (REQ-025 and 047, row A-340 on open PR #1045), so this change takes 2.47 and the tag `polaris-dossier-walk-advice-v2.47`.
- [Observed] No draft schema or brief version is taken: the draft states nothing new and the brief carries no rule of check's advice (D2).
- [Observed] The build script (`docs/evidence/syzygy-3efd-35/walk_advice_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once: the end of 2.45's earlier-schema paragraph ("no migration yields a v17 draft."), after which the three new paragraphs go, and the four Form lines, each extended after its 2.45 sentence. The scenarios precede the one Form line. If another REQ-034 version lands first, the script is re-run over it with the predecessor path changed.
- [Observed] REQ-034 goes from 314 to 321 scenarios.

## D2. Advice on the report, not a reader standard

- [Inferred] The bead's design note suggests a reader-standards addition. Rejected: the brief carries the reader standards whole and the brief record names their digest, so a new standard moves every brief's bytes and its version, and a standard is guidance for the author, while this is a mechanical rule over the draft's bytes. The figure advice of 2.33 is the precedent for mechanical, report-only advice: a member with versioned rule ids, advisories `{"rule", "at", "detail"}`, absent under a `schema` finding, and a failure to compute that changes nothing.
- [Inferred] The member is `walkAdvice`, apart from `figureAdvice` and from `readerAdvice`, so that neither member's bytes move and a reader of one never meets the other's rules.

## D3. "Restates", exactly

- [Inferred] Words. Lowercase A to Z only (the 2.33 label key's folding), every character outside Unicode L and N to a space, split, empties dropped. So `Request-Router` is `request router`, and `src/ (12 files)` is `src 12 files`.
- [Inferred] Filler. 30 words a paragraph may add without saying anything: articles, the forms of "be", common prepositions and conjunctions, demonstratives, and the narrating words `here`, `see`, `shown`, `shows`, `step`, `then`. A closed list, so the rule can be re-derived; the list is in the spec.
- [Inferred] Match. Equal, or one is the other plus `s` or `es`: plurals are the common restatement (`Request routers.`). No other stemming, because `routes` and `router` must stay different words (the near-miss scenario).
- [Inferred] Threshold. Containment with zero new words. A fractional overlap (say, 80 % of words shared) fires on short explaining sentences such as `Router retries twice.`, which carries two new words; containment never does, and the bead's acceptance asks for a near miss that must not fire. The cost: a paragraph that narrates the picture in other words (`The router calls the handler.`) passes. That stays the reviews' judgement, as 2.40 says.
- [Inferred] Paragraph text is the block's `text` and its children's, the RS-19 reading, so a block whose child explains is not advised on.

## D4. Labels

- [Inferred] A model element's `label`, a node's `label`, an expansion node's label: the draft's words, the same the figure's list shows before withholding. Advice is over the draft, not the rendered page, so withholding plays no part.
- [Inferred] A base element's label is Syzygy's (2.40): `Repository root`, `<path>/ (<count> files)`, a package's or module's `<name>`. A `names` display name is the draft's naming of Syzygy's element and is not what the box says. Where the base map is not established at check, that step is not read and not counted.

## D5. Composition and bytes

- [Inferred] 2.40 walks: only walks with no finding at or below their path are read, so every step's element and block resolve. Disposition does not matter: a walk on a figure not produced is still the author's text and may be produced later.
- [Inferred] 2.45 levels: the rule reads no `level`, `scope`, zoom link or `data-view-*`.
- [Inferred] 2.35 screening: the detail names `<diagram>` and `<block>`, both handles, and a step number; never a paragraph word, a label, a base path or a display name. So no draft text reaches the report through this member.
- [Inferred] Bytes: only the report's `walkAdvice`. Findings, records, `figureAdvice`, `readerAdvice`, `run-advice.json`, `machine.json`, `dossier.json`, reading ledger, size report, pages, brief and provider mode are 2.45's. The earlier "checked exactly as" statements compare findings, records and rendered bytes; the spec says they do not reach this member, as 2.37's `choiceFloor` added a report member for existing schemas.

## D6. Scenarios

- [Inferred] Seven: a positive case with the whole literal member; normalisation (case, punctuation, plural, filler, children); one new word, a digit and another element's label each stopping it; a base element read by Syzygy's label, and the unestablished map; absence (v15, `schema` finding, inventory) and an empty member (a walk with a finding, no walk); no gate and no level read; failure to compute. Each scenario's verdict was re-derived by a reference reading of the rule (`docs/evidence/syzygy-3efd-35/restates_reference.py`, 14 cases, all agreeing).

## D7. What the code change must do

- [Inferred] In `packages/polaris-dossier/src/` (the bead names `reader-advice.ts`; a sibling module beside the figure advice fits D2 better): the normalisation, the filler list, the match, the walk traversal and the member on check's report.
- [Inferred] Tests, per the bead: positive and negative literal cases, the near miss `Request routes.`, a base element, absence and the failure path; the provider golden byte-identical; rule-6 mutants (drop the filler list, drop the plural match, widen to one new word, read a `names` display name, echo a word in the detail).

## Review

[Observed] No review has read this version. The lead arranges one; this change dispatches none.
