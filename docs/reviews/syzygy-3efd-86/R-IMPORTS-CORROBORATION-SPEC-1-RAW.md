# R-IMPORTS-CORROBORATION-SPEC-1 — fresh-context review of REQ-polaris-generation-034 version 2.44 (imports corroboration)
Verdict: REVISE
Reviewed commit: f37929ac4
Spec sha256: 5b13a3998bfa9b2b05361ef5f7523b8a7ae58a3d074a440b22e870571d933955

Subject: `openspec/changes/dossier-imports-corroboration/proposed/polaris-generation/spec.md` at `f37929ac403cd230165feb068255658adce8ce12` (sha256 re-derived by `sha256sum`: `5b13a399…3955`, matches). Package files read: README.md, proposal.md, design.md, SEMANTIC-DELTA.md, tasks.md, GOVERNING-DEPENDENCIES.json. Predecessor compared: `openspec/changes/dossier-migration-bounds/proposed/polaris-generation/spec.md` (sha256 `bbc1ab47…cf02`, matches the delta). Doctrine read: `.syzygy/governance/doctrine/vision.md` VIS-2 (line 136) only. Code read: `packages/polaris-dossier/src/relation-witness.ts`.

Line numbers below are of the 2.44 spec.md unless another file is named. Lines 104 and 106 are the two added paragraphs; 1937–1953 the three added scenarios; 1957–1961 the Form lines.

## Checks run

- [Observed] Independent line diff (Python `difflib`, requirement block only): 2056 predecessor lines, 2078 new; 2050 equal; the six replaced lines are 175→179 (2.39 sentence), 1243→1247 (carried scenario THEN), and the four Form lines; inserted: the two paragraphs after line 97 of the block and the 18 lines of three scenarios. This agrees with SEMANTIC-DELTA.md ("2050 appear byte for byte … 6 lines are amended in place … 2 paragraphs … 3 scenarios").
- [Observed] `grep -c '#### Scenario:'`: 298 (2.43) and 301 (2.44). `python3 scripts/count_polaris_effective_scenarios.py`: "TOTAL: 39 requirements, 648 scenarios"; PROJECT-STATUS.md asserts 648.
- [Observed] `python3 scripts/check_spec_reconciliation.py --check`: "7 of 7 predicates without FAIL; PASS" (R6 WARN pre-existing, PWB pins, unrelated).
- [Observed] A-273 row, `openspec/README.md` row, PROJECT-STATUS.md paragraph, README.md, proposal.md, design.md D1–D7 and the Form-line extensions agree on: version 2.44 over 2.43, 298→301, tag `polaris-dossier-imports-corroboration-v2.44`, revert `git revert d7295e2b4…`, and "No review has read this version" (A-273 row; design.md:73; tasks.md unchecked review item).
- [Observed] The 2.39 field names the row reads are real in 2.39's text (line 192): a `facts` entry is `{"id", "rule", "ruleVersion", "path", "lines", "form", "outcome", "from", "to", "unknownReason", "epistemic"}`, `id` is `_import-<k>`; the member's `state`, `coverage`, `factsNotListed` and `edges` exist as named.

## VIS-2 assessment (criterion 1)

- [Observed] Absence never looks Observed: line 104, "every other `imports` edge is `unknown` (`coverage-partial`), never `challenged`, whatever the member's `coverage` … So no `imports` edge draws a `relation-challenged` finding, and the absence of an import fact is never read as the absence of an import." Scenario at 1943 pins complete, partial and `factsNotListed > 0`.
- [Observed] Lexical never presented as runtime: line 104, "never that the code is compiled, loaded, reached or called"; the evidence text (106) reads "a lexical import statement found by Syzygy". A corroborated edge keeps the draft's marking and is never solid or Observed (104, 106; scenario 1937).
- [Observed] Caps, remainders, secret-withheld files, symlinks and unresolved package names: each yields either no `edge` fact (2.39 gives such statements `unknown` outcomes, `source-unit-undecidable`, `target-undecidable`, `target-unit-undecidable`, or excludes the file) or a remainder count; since 2.44 never reads absence, every such case ends `coverage-partial`, and an absent or `state: unknown` member gives `facts-unknown`. [Inferred] No path exists from any of these to `corroborated` or `challenged`.
- [Observed] Direction: line 104, "its `from` equals the source unit's `path` and its `to` the target unit's `path`"; 2.39 (192) gives `from` as the importing file's unit. Correct: A imports B.
- [Inferred] Forms: every `edge` fact corroborates whatever its `form` (`import`, `import-type`, `side-effect`, `re-export`, `re-export-type`); dynamic `import(`, `require(` and import-equals are `outsideGrammar` in 2.39 and never facts, so they can only leave an edge `coverage-partial`. Honest; see note 4 on what the reader can tell.
- [Inferred] 2.35 screening: every byte the row adds (fact identity `_import-<k>`, rule name, rule version, pinned revision, a record digest) is Syzygy-written; no draft-supplied value and no path, line or operand reaches a sink (106: "No path, line, operand or unit path of the import fact is rendered").

## Findings

1. **Blocking — the evidence text's check-record digest breaks the migration parity the design says holds.** [Inferred, from Observed clauses]
   - Evidence: line 106 puts `record sha256:<hex>` inside the corroborated edge's list item, "the record being the check record whose member the render read". Line 146 (2.24/2.38/2.43 parity) requires "every `<figure>` element and every notice in a figure's place on every page rendered from it, and every figure entry of its `machine.json`, are byte-identical to those of d, except a figure that draws a withheld-end edge"; the allowance for "a byte that names or digests the draft's own bytes" covers only "its other bytes", not figures. A check record carries `runId`, `revision` and `checkedAt` (line 196, the bounded form's list of members the full record also holds), so the record digest of d's check and of the migrated draft's check differ and the figure drawing a corroborated `imports` edge is not byte-identical. Line 146 also states the parity "over the migrated draft as the value the migration returns … the migration states no serialization", so line 104's render rule ("the `importFacts` member of the check record of the draft revision it renders") names no record for that value. design.md:42 ("The migration parity holds for `imports`") and design.md:66 ("an `imports` arrow keeps parity under the same exceptions") assert the opposite.
   - Repair: prefer citing a digest that is a function of the facts alone, e.g. the SHA-256 of the `importFacts` member's encoding (2.39, line 192: its bytes are "a function of the pinned tree, the bytes of the blobs read, the screen …, the run's content classes and the same check's `manifestFacts` member … byte-identical … whatever their drafts"), and say how a render of the migration value obtains the member; or add an explicit parity exception for a figure drawing a corroborated edge and its entry. Correct design.md D4/D7 and add an AND line to a 2.44 scenario covering a migrated v11 draft with a corroborated edge.

2. **Blocking — how a corroborated v12 cited relationship renders in its later figures is not stated.** [Observed]
   - Evidence: line 104 extends version 2 to "every cited relationship of a v12 or later draft". Line 106 says a corroborated edge renders "with the draft's marking, label and citations" and "its list item gains, after the draft's text," the evidence text and attributes. Line 144 (2.24) renders a cited relationship's claim only in its first figure; "In each later such figure its list item instead reads `<from> → <to>: <label>, as shown in …` … Such an item carries no claim anchor and no citation", and it exempts only a *witnessed* relationship ("renders the arrow and list item version 2.19 gives a witnessed edge in every figure that draws it, and never this form"). For a corroborated relationship two readings give different bytes: evidence text and `data-witness-*` on every figure, or only on the first; and "with … citations" contradicts the later-figure form. None of the three new scenarios uses a v12 draft except the derived-relationship AND line.
   - Repair: state that a corroborated cited relationship renders in its first figure as line 106 says and in each later figure in the 2.24 "as shown in" form, with (or without — choose one) the `data-witness-*` attributes and evidence text on its arrow and item; add a scenario of a v12 draft whose corroborated relationship two graph views select.

3. **Note — the version-2 enumeration omits nestings and derived relationships.** [Observed]
   - Evidence: line 104, "every edge of a v9 to v11 graph diagram and every cited relationship of a v12 or later draft is decided by version 2". Lines 128 and 142 still say "Rule `relation-witness` version 1 SHALL decide" v11 containment nestings, v12 `parent` nestings and v12 derived relationships. The carry-over sentence makes v1 statements hold of v2, but the explicit list leaves those three populations decided by version 1 by the letter. design.md D4 says the nesting case "read[s] version 2". No byte differs, since the two versions agree on `contains`. The literal finding detail at line 140 ("a row of rule relation-witness version 1 joins") stays "version 1".
   - Repair: "from version 2.44 every decision this requirement assigns to rule `relation-witness` is made by version 2"; say the line-140 detail is kept verbatim.

4. **Note — type-only and side-effect imports corroborate, and the reader cannot tell.** [Inferred]
   - Evidence: line 104 corroborates on any fact "whose `outcome` is `edge`"; the prose says "a top-level static import or re-export statement", which a reader may not take to include `import type` (erased at compile) or a side-effect import. The evidence text (106) omits the fact's `form`. Not a VIS-2 breach (lexical disclaimer stands), but the reader of "corroborated" cannot distinguish a type-only from a value import.
   - Repair: say that every form of 2.39 (`import`, `import-type`, `side-effect`, `re-export`, `re-export-type`) corroborates; consider naming the form in the evidence text (a Syzygy-written word, not a path or operand); add a type-only case to scenario 1937.

5. **Note — scenario gaps for rules the text states.** [Observed]
   - Evidence: no scenario pins direction (a fact `core`→`web` leaves edge `web`→`core` `coverage-partial`), though the Falsifier (1961: "corroborated by a fact … that joins other units") and design.md D6's mutants ("swap `from` and `to`") rely on it; no scenario corroborates by `typescript-package-import`; no `imports` case of `endpoint-without-unit` or `endpoint-unit-invalid`.
   - Repair: add AND lines to 1937/1943 for the swapped fact and a package-import fact.

6. **Note — the bounded-form arm of scenario 1949 is not reachable end to end.** [Observed]
   - Evidence: line 196, a bounded-form record's "`outcome`, which is `findings`", so its revision never reaches render; scenario 1949's "rendered from a check record that holds no `importFacts` member, because it was written … in its bounded form" can only be produced by an injected record.
   - Repair: say the arm is tested by an injected record (as line 196 already says for the bound's value and depth arms), or drop it.

7. **Note — the member the row reads is not implemented.** [Observed]
   - Evidence: `git grep -l importFacts -- packages apps scripts` and `git grep -l typescript-relative-import -- packages apps` return nothing at `f37929ac4`; `relation-witness.ts` has no import input. tasks.md:9 and design.md D6 describe the 2.44 code change without saying it depends on 2.39's derivation landing first.
   - Repair: name the dependency in tasks.md and D6.

8. **Note — prose.** [Inferred]
   - The scenario title "No import fact is never read as no import" (1943) is a double negative that reads as its opposite; suggest "A missing import fact is never read as no import".
   - `coverage-partial` is the reason given where the member's `coverage` is `complete` (104). design.md D3 explains it (relation coverage, not member coverage), but the spec sentence gives the `.ts`-only reason only after the reason word; consider one clause saying the reason refers to the relation's coverage.

## Composition (criterion 2), no further findings

- [Observed] 2.19 order and states: `no-witness-rule` and `recognizer-not-eligible` skipped for `imports`; `corroborated` sits where `witnessed` would; `fact-not-current` (render) does not reach `corroborated`; the carried scenario at 1247 now gives `endpoint-kind-mismatch` for `imports` between `repository-root` and `top-level-directory`, which the order yields.
- [Observed] 2.24: derived `imports` still draws `relationship-not-derivable` (104; scenario 1953); line 140's sentence "at this version that table's only row joins a `repository-root` unit to a `top-level-directory` unit by `contains`" stays true. Line 96 "only a `contains` arrow can be witnessed or challenged" stays true.
- [Inferred] 2.40 walks name elements, 2.42 test names read no witness, 2.43 bounds unaffected; agreed.
- [Observed] Brief v15 sentence (108) "Today only `contains` … can be witnessed" stays true; brief v16 (134) likewise.

## Agreement of package files (criterion 4)

- [Observed] No disagreement found among Form lines, design.md, SEMANTIC-DELTA.md, census 648, A-273 and the routes, apart from design.md:42/:66 (finding 1). Every artifact states no review has read the version.
