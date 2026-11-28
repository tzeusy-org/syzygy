# Design — imports corroboration (version 2.45)

[Inferred] Version 2.45 of REQ-polaris-generation-034, for syzygy-3efd.86. It was drafted on `agent/syzygy-3efd.86` as 2.42 over migration bounds 2.41, rebuilt as 2.44 over migration bounds 2.43, and is rebuilt again over rough-edge markers 2.44 (`dossier-rough-edges`, row A-338, tag `polaris-dossier-rough-edges-v2.44`), the newest REQ-034 on main.

## D1. The version label and the predecessor

- [Observed] At drafting, 2.39 (import facts, A-270) was on main, 2.40 (figure walks, A-271) in PR #1040, and 2.41 (migration bounds, A-272) on `agent/syzygy-3efd.87`, so this change took 2.42. Test-name recognizers then reached main as 2.42 (A-337, PR #1037) over 2.40, and migration bounds was rebuilt over it as 2.43. This change took 2.44, but rough-edge markers reached main as 2.44 first (A-338, PR #1047), so it moved to 2.45 over that version, with the tag `polaris-dossier-imports-corroboration-v2.45`.
- [Observed] The build script (`docs/evidence/syzygy-3efd-86/imports_witness_build_spec.py`) edits the predecessor's bytes at anchors it asserts occur exactly once:
  - 2.39's sentence that nothing reads `importFacts`;
  - one carried scenario's THEN line;
  - the end of 2.19's render paragraph, after which the two new paragraphs go;
  - the four Form lines, each extended after its migration bounds sentence.
  The scenarios precede the one Form line. If another REQ-034 version lands first, the script is re-run over it with the predecessor path changed.
- [Observed] First installed at `4115d9817` over the 2.41 text as first installed (sha256 `87d64cdd…6e93`; this spec then `134fe229…c4ee`). It was rebuilt over the 2.41 text as repaired after that version's review (sha256 `64869dc9…0b4c`). The same script ran with one anchor moved: the Falsifier line's 2.41 sentence now ends "a nesting is counted as a relationship, or the migration yields no draft for it.". The other 2.41 repairs (line 142, line 252 and the 2.41 scenario) fall on text this version does not edit, so they are carried.
- [Observed] Rebuilt again over migration bounds 2.43 (sha256 `bbc1ab47…cf02`) as 2.44, with only the version labels changed: every anchor still occurs once, because 2.43 ends each Form line with its own sentence and leaves 2.19's text, 2.39's sentence and the carried scenario as 2.41 had them. That build hashed to `5b13a3998bfa9b2b05361ef5f7523b8a7ae58a3d074a440b22e870571d933955` (298 to 301 scenarios) and is the text review 1 read.
- [Observed] Repaired after review 1 (section "Review") by edits to the same build script, over the same predecessor bytes. The spec now hashes to `d60afad88bc72dde63ad597d2b9a5fa646143e4b68f89202ffcaff8742068c4d`; REQ-034 goes from 298 to 302 scenarios.
- [Observed] Rebuilt over rough-edge markers 2.44 (sha256 `3c03ebff…61c1`) as 2.45 by the same script, with only the predecessor path, its head assertions and the version labels changed: every anchor still occurs once, because 2.44 edits none of them. The spec now hashes to `a7b05a9615c3350b2d861ef0f68e33b752f4dc7ed6ab03b895eab8c758dc537b`; REQ-034 goes from 305 to 309 scenarios. No review has read this rebuild.

## D2. Corroborate, never witness

- [Observed] Two parts of the text decide this.
  - The eligibility paragraph of 2.19 (line 96) lets a rule witness only while it is in the eligibility table. A rule enters only by a later version that brings golden fixtures, a recorded mutation run, a currency bound, and a label of Observed for its facts.
  - 2.39 (line 182) says "Every import fact is Inferred at this version, whatever evidence exists: the label is a constant."
- [Inferred] So an import fact cannot make an arrow `witnessed` (solid, Observed, in Syzygy's words) at this version, which is what the bead asks: "Inferred, becoming Observed only where the existing reservation allows".
  - Putting the import rules in the eligibility table would break both clauses above.
  - Leaving `imports` with `no-witness-rule` would leave the stored facts unread, as today.
- [Inferred] So the row gets its own state, `corroborated`. The arrow stays the draft's claim, with the draft's marking, label, citations and counts. Only attributes and evidence text say that Syzygy's lexical facts hold a matching statement.
  - A distinct state, rather than `witnessed` with a different label, keeps every carried rule about `witnessed` true: solid, Observed, Syzygy's words, no claim anchor, out of the draft's counts.
  - A later version can move `imports` to `witnessed` by the existing route, with no state renamed.

## D3. Absence is never "not imported"

- [Inferred] The other rows give `challenged` where coverage is complete and no fact joins the units. For `imports` that would be wrong even under `complete` coverage:
  - the member reads `.ts` blobs only, and leaves `.tsx`, `.js`, Python and every other language unevaluated;
  - a unit may import another through any of them.
- [Inferred] So every `imports` arrow that no fact joins is `unknown` (`coverage-partial`), and none draws a `relation-challenged` finding. This reuses the existing reason rather than adding one. The coverage that matters, of the relation and not of the member, is never complete at this version.
- [Inferred] A `same-unit`, `external`, `no-unit` or `unknown` statement corroborates nothing. The `edges` list is not read, because it names no fact identity to cite.

## D4. Where check and render read the facts

- [Observed] 2.39 stores `importFacts` only in the draft check record. No render derives it, and a record written before 2.39, or in its bounded form, has none.
- [Inferred] Check decides from the member it derives in the same check. Each render reads the member of the rendered revision's check record, under 2.10's read bound, as it already reads that record. Re-deriving would rescan up to 16 MiB of bodies per render, for bytes the record already fixes. A missing or Unknown member gives `facts-unknown`.
- [Inferred] Rule `relation-witness` is numbered version 2, because it now decides `imports` arrows differently. A carry-over sentence keeps every statement about version 1 true of version 2 but the new row and state. The text also says outright that every decision the requirement assigns to the rule, nestings and derived relationships included, is made by version 2, and that the literal `relationship-not-derivable` detail naming version 1 is kept verbatim (review 1, note 3). So the 2.24 v12 case, the 2.23 nesting case and the 2.38 migration exception read version 2 with nothing else changed.
  - The migration parity holds for `imports` only because the evidence text cites the `importFacts` member's own digest, which 2.39 makes a function of the run and the pinned tree, never of the draft. It first cited the check record's digest, which differs between a draft and its migration (`runId`, `checkedAt`), and so broke 2.24's figure parity (review 1, finding 1). Where either check had a refused read, the two members may differ, and no parity is stated for a figure drawing an `imports` edge.
  - A derived `imports` relationship still draws `relationship-not-derivable`, since only rows of the eligibility table make a relationship derivable.

## D5. Bytes that move

- [Inferred] These move in the operator-agent mode:
  - on a page that draws an `imports` arrow version 1 left `unknown` (`no-witness-rule`), that arrow's attributes and evidence text where a fact corroborates it;
  - that arrow's `machine.json` `witness` member, now `corroborated`, or `unknown` with the reason version 2 gives (`endpoint-kind-mismatch`, `endpoint-without-unit`, `endpoint-unit-invalid`, `facts-unknown` or `coverage-partial`);
  - the page's measures in the size report.
- [Inferred] These do not move: check records, findings, schemas, briefs, the figure-fit member, the reading ledger, `dossier.json` and provider mode.
- [Inferred] No path, line or operand of an import fact is rendered, only its identity and rule. So nothing the 2.39 screen admitted gains a new sink, and no draft-supplied value reaches one (the 2.35 screening composition).

## D6. What the code change must do

- [Observed] It depends on the 2.39 derivation landing first: at `f37929ac4` no package derives `importFacts` (review 1, note 7), so the code for this version follows the syzygy-3efd.60 code.
- [Inferred] In `relation-witness.ts`:
  - an `imports` row and the `corroborated` state;
  - check passing its own `importFacts` member, and render reading the record's member;
  - the renderer's attributes and evidence text, and the `machine.json` `witness` state.
- [Inferred] Tests: literal conformance tests for each scenario and each reason in the order, and rule-6 mutants. The mutants should make a corroborated arrow Observed, accept a non-`edge` fact, swap `from` and `to`, give `challenged` under `complete` coverage, or read the `edges` list.

## D7. Composition with versions 2.35 to 2.44

- [Inferred] 2.35 (screening): no draft-supplied value reaches a new sink. The evidence text carries a fact identity Syzygy writes, a rule name, the revision and a digest.
- [Inferred] 2.36 and 2.37 read no witness.
- [Inferred] 2.38 and 2.43 (migration parity and its bounds): both sides are decided by version 2 from members that are byte-identical where no read was refused, and the evidence text cites the member's digest, so an `imports` arrow keeps parity under the same exceptions plus that one (D4).
- [Inferred] 2.39: this version is the reader it anticipated. Its sentence that nothing reads the member is dated, not deleted.
- [Inferred] 2.40 (walks): a walk step may name a corroborated arrow's end elements as before. Walks name elements, not edges.
- [Inferred] 2.42 (test-name recognizers) publishes declared test names on their own page and reads no witness; `imports` arrows and test names share nothing.
- [Inferred] 2.44 (rough-edge markers) publishes lexical markers per unit on their own page and reads no witness; `imports` arrows and markers share nothing.

## Review

[Observed] Review 1, `docs/reviews/syzygy-3efd-86/R-IMPORTS-CORROBORATION-SPEC-1-RAW.md` (fresh context, at `f37929ac4`, spec sha256 `5b13a399…3955`): `REVISE`, two blocking findings and six notes. Each is repaired; none is overruled.

| # | Finding | Disposition |
|---|---|---|
| 1 | Blocking: the evidence text's check-record digest breaks 2.24's figure parity | The text cites `import facts sha256:<hex>`, the digest of the `importFacts` member, and states how a migrated draft's render reads it and when the parity holds (D4); an AND line of the first scenario covers a migrated draft |
| 2 | Blocking: a corroborated v12 relationship in later figures is not stated | Its first figure renders it as the paragraph states; each later figure takes 2.24's "as shown in" item, with no anchor, citation or evidence text, and carries the `data-witness-*` attributes; new scenario "A corroborated relationship shown in two views" |
| 3 | The version-2 enumeration omits nestings and derived relationships | One sentence: every decision the requirement assigns to the rule is made by version 2; the `relationship-not-derivable` detail is kept verbatim |
| 4 | Type-only and side-effect imports corroborate, unseen | Every `edge` form corroborates, said outright; the evidence text names the fact's `form`; a type-only AND line |
| 5 | Scenario gaps | AND lines for a swapped-direction fact, a `typescript-package-import` fact and `endpoint-without-unit` |
| 6 | The bounded-form arm is unreachable end to end | The scenario says that arm uses an injected record |
| 7 | The member is not implemented | D6 and `tasks.md` name the dependency on the 2.39 code |
| 8 | Prose | Scenario retitled "A missing import fact is never read as no import"; `coverage-partial` said to name the relation's coverage |

[Observed] No review has read the repairs; row A-273 says so.
