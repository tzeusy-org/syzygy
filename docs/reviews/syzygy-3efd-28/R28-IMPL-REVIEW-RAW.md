# Review: syzygy-3efd.28 relation types implementation (REQ-polaris-generation-034 v2.19)

Reviewed commit: cccac263 (origin/agent/syzygy-3efd.28-code), diff `git diff origin/main...cccac263`
Governing text: openspec/changes/dossier-relation-types/proposed/polaris-generation/spec.md (9 added paragraphs, spec lines 90-107; 10 scenarios, lines 1113-1173), SEMANTIC-DELTA.md, design.md
Verdict: NOT READY

## Summary

[Observed] The rule, the render, the brief and byte identity are implemented closely and well tested. Decision order and reason words
match the clause. The brief paragraph is byte-identical to the spec quote (1190 characters, Python equality). Byte identity for
v2 to v8 holds. The provider golden is unchanged. `npm run check` is green. Three sampled mutants were each killed.

One blocking gap remains. The spec states where a malformed unit's `schema` finding sits, and the code reports it one level deeper
(worker point 1). There is one smaller fail-closed deviation in coverage, plus notes.

## Findings

### 1. Schema finding for an extra unit member, or a key past 256 code units, is reported below the node's `unit` (blocking)

- Where: packages/polaris-dossier/src/draft-schema.ts (the `unit` oneOf in DEFS, about line 233), packages/polaris-dossier/src/check-derive.ts `relationStructure` (the `add({ kind: 'schema', at: `${at}.${UNIT_FIELD}.${key}` ...` line), pinned by packages/polaris-dossier/src/relation-types.test.ts ("reports each in a v9 draft as schema at the edge's relation or within the node's unit"; "reports a unit's key past 256 code units ...").
- Clause (spec para 1, line 90): "A v9 graph edge without `relation`, a `relation` outside the list, and a `unit` of any other form or carrying any other member are each a `schema` finding, at the edge's `relation` or at the node's `unit`."
  The scenario "Relation types and unit forms outside the lists" says THEN "the v9 draft has a `schema` finding at each of those edges and units".
- Evidence [Observed]: the test asserts `schema $.diagrams[0].nodes[1].unit.name` (detail `is not a field of this form`) for `{"kind":"top-level-directory","path":"src","name":"src"}`.
  It asserts `{ kind: 'schema', at: '$.diagrams[0].nodes[1].unit.name', detail: 'must be 1 to 256 code units; is 258' }` for 129 U+1F600.
  It also asserts `schema $.diagrams[0].nodes[1].unit.name` for `'x'.repeat(257)`.
  A unit whose key is past 256 code units is not one of the six forms ("each ... a string of 1 to 256 code units"), so the clause puts that finding at `.unit` as well.
  `{"kind":"module"}` is correctly reported at `.unit`.
- The worker flagged this point; the location is a stated part of the clause.
- Repair: report every schema fault whose path lies under `$.diagrams[i].nodes[j].unit.` at `$.diagrams[i].nodes[j].unit`, one finding per unit. For example, `draftRules`' `replaced` hook or a post-map in `relationStructure` would rewrite the path and drop duplicates.
  Then update the two test literals and add a mutant.
  Alternative: amend the clause with an adoption row ("at or within the node's `unit`"). Do not leave the code and the text disagreeing.

### 2. A `contains` arrow to an absent top-level directory whose name is secret-matching or screen-denied is `coverage-partial`, where the clause gives `challenged` (note)

- Where: packages/polaris-dossier/src/relation-witness.ts:189 (`coverageComplete`: `[pathOf(from), pathOf(to)].some((at) => at !== undefined && inputs.hidden(at))`), applied to every relation including `contains`.
- Clause (para 5, line 98): "Coverage is complete for `contains` exactly where the structure record is `derived` with `secretPathsLeftOut`, `submodules` and `unitsNotListed` all zero".
  The hidden-path rule of para 2 (line 92) covers only "A `package-manifest`, `workflow-job` or `compose-service` unit".
- Evidence [Observed]: a scratch probe (removed afterwards) on tree A, which has no secret path, with a `contains` edge from the root to `tld('token=abcdefghijk')` gives check `{"outcome":"passed","findings":[]}`.
  Under the clause this is complete coverage with no joining fact, so `relation-challenged`. The same probe with `.aws` gives the challenge.
- [Inferred] This is fail-closed: it only withholds a challenge and never upgrades. When `secretPathsLeftOut` is 0 a challenge would reveal nothing.
  It is still a departure from "exactly", and the hermetic suite does not pin it either way.
- Repair: apply the `hidden` test only to the three path-bearing kinds para 2 names (or only to recognizer relations), and add a literal case. Or record the narrower rule in the spec.

### 3. Render and check use two predicates for a withheld edge (note)

- Where: packages/polaris-dossier/src/check.ts:276 (`!isWithheldElement(edge, reach)`) and packages/polaris-dossier/src/render.ts `edgeRelationsAt` (`!withheld.has(text(edge['id']) ?? '')`).
- [Inferred] Both currently mean "rendered as a withheld item", and the `.env` scenario passes in both. If the two notions ever drift, check and render disagree on `edge-not-inferred`.
  The spec allows that only as "a difference between what the render derives and what check derived".
- Repair: add one comment naming the shared source (`input.local.withheldElements` is built by the same `isWithheldItem`). Or pass one predicate to both.

### 4. The claim of "10 Unknown reasons" does not match the code (note)

- [Observed] `WitnessReason` (relation-witness.ts:125-126) has nine members: edge-not-inferred, no-witness-rule, endpoint-without-unit, endpoint-unit-invalid, endpoint-kind-mismatch, recognizer-not-eligible, facts-unknown, coverage-partial, fact-not-current.
  The spec names the same nine (eight in the order, plus `fact-not-current` at render). The code is right; correct the PR or bead summary.

### 5. Readability (note)

- apps/three-surface-poc/src/polaris-generation/dossier-site.ts: `d0`/`d` and the non-null assertions `relation.witness.fact!` / `rule!` / `ruleVersion!` rely on "evidence present implies witnessed".
  Making `LocalEdgeRelation` a discriminated union (witnessed with fact/rule/version/evidence, else nulls) would remove the `!`s and make the invariant a type.
- `elementAttributes` in `renderDiagramSvg` applies to nodes as well as edges (diagram-layout.ts:482). `edgeAttrs` is keyed by edge id.
  This is safe only because `duplicate-id` keeps ids unique and render needs a passed draft. A one-line comment would help.
- Otherwise the code is clear: the rule is pure, the order is commented against the clause, rows are data, and the eligibility table is data with a hermetic freshness test.

## Criteria

1. Requirement and scenarios. [Observed] Decision order (relation-witness.ts:202-219) matches para 5 case by case, and the reason words match.
   - The first joining fact is taken in record order, and `contains` matches the target by `top-level-unit` path through `to`. Every `contains` fact runs from `_tree-root` (derive.ts:213).
   - Finding order: unit-reference findings (node order), then relation-challenged findings (draft order), after every 2.16 finding (check.ts:270-284). The test shows `path-absent`, then `unit-reference`, then `relation-challenged`.
   - The relation-challenged detail carries the clause's words verbatim after `the edge "<id>", relation <r>: `.
   - The unit-reference detail names the node, the kind and the rule, never the path. This is asserted for all four of the scenario's paths.
   - Render matches para 7: solid `edge observed` class, `data-epistemic="observed"`, the four `data-relation`/`data-witness-*` attributes on the arrow and the list item, Syzygy's words, `Witnessed by Syzygy`, and the evidence sentence in the clause's exact form with the full revision and the published record's sha256.
   - Render also gives no claim anchor, no entry in counts (tested against the same draft without e1, for both the appendix counts and the run sentence), boxes keeping the draft's marking, a curated figure, a legend with the solid style, a tally counting the arrow observed, and `machine.json` `edges` with `relation` and `witness`, present for v9 only.
   - `fact-not-current` with the currency policy missing is tested, and check's outcome is unchanged.
   - Brief v15: version line, schema line, and paragraph placement are tested in brief.test.ts. The paragraph is byte-equal to the spec quote.
   - Gaps: finding 1 (blocking) and finding 2 (note).
2. Never upgraded without an eligible rule. [Observed] `recognizer-not-eligible` comes before the fact lookup, and the table holds only `top-level-unit` v1. e3 (`declares-dependency`, with a joining `dependency` fact) is `unknown` (`recognizer-not-eligible`) in both the integration and the hermetic suite.
   - Partial coverage stays Unknown for a secret path, 251 directories, a submodule, and a directory holding only a submodule. Each case is tested, and the witnessed e1 is still found.
   - A scratch probe rendering FIG_1 and searching every output file for `holds the code` and `c-e1` found neither. The only `e1` hit is the machine.json `edges` id.
   - A secret-matching manifest unit gives no unit-reference finding whether or not the blob exists (tested with the SECRET_MANIFEST tree), and its value appears in no rendered file (tested).
   - No unit value appears in any finding detail (tested).
3. Byte identity. [Observed] The stored dumps' SHA-256 equal the record's `dumps` (e42a1507..., 021bd417...).
   - Across 28 variants and 490 files, every page and machine file is identical. The differences are `brief.json`/`brief.md`/`draft.schema.json` (expected: the run is briefed v15) and, in the seven `relation` variants, `checks/rev-0.json`, where the only finding change is `schema` → `field-version` at `.unit` and `.relation`. That is exactly the stated exception.
   - No product source changed between the dumped "after" commit 0ec7cc48 and cccac263; only the two test files changed.
   - `git diff origin/main...cccac263 -- apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts` is empty, and the golden passes.
   - Caveat, stated in the record itself: the population is the 28 synthetic variants and not every stored fixture.
4. Tests and mutation. [Observed] Expected values are literals: findings, details, attributes, list item text, and witness objects. The evidence digest is computed from the published bytes, as the file header says.
   - Mutation record r2: `commit` 9bb33f0f..., 74 mutants, each with `file`/`old`/`new`, all killed.
   - My own three mutants, each applied to one fragment and restored (worktree clean afterwards), were all killed:
     a. check.ts: removed the schema-finding guard (`findings.some(... 'schema') ? { ...decisions, edges: [] } : decisions` → `decisions`). Killed by "decides no edge of a draft with a schema finding ...".
     b. relation-witness.ts: dropped `s.submodules === 0` from contains coverage. Killed by 5 tests (hermetic and integration submodule cases).
     c. check-derive.ts: dropped the `[...value].length <= UNIT_TEXT_LIMIT` guard. Killed by "reports a unit's key past 256 code units ...".
5. Inertness and SEC-5. [Observed] Every attribute value is escaped or numeric.
   - svg-inert.ts adds only `data-relation`, `data-witness-fact`, `data-witness-rule`, `data-witness-rule-version` and `data-epistemic` to the allow-list. Their values are closed-list words or Syzygy identities.
   - There is no script. The secret detectors are not weakened: hidden paths use the same `secretPathOf(screen)` and `secretOrUnder`, plus the screen's denied path.
   - New reads: check reuses its listing. Render calls `reader.listTree()` again for the blob test, which reads paths and modes only.
     [Inferred] This stays within the spec ("whose path names no blob at the pinned revision"). No body is read beyond the existing manifest member.
6. `npm run check` in the worktree: [Observed] exit 0, typecheck clean, unit tier `Test Files 213 passed (213)`, `Tests 5447 passed | 1 skipped (5448)`.
   - Directly: relation-types, relation-witness, brief and provider-golden: `Test Files 4 passed (4)`, `Tests 88 passed (88)`.
7. Readability and craft: see findings 3 and 5. Otherwise good.
8. Worker's flagged points:
   - (a) Extra unit member at `.unit.<member>`: a deviation, finding 1 (blocking).
   - (b) A name over 256 code units but within 256 code points: handled. The schema bounds code points, and check adds a code-unit `schema` finding without double-reporting. It is tested at 258 code units for 129 astral characters, at 128 astral characters (passes), and at 257 ASCII characters (one finding). Its location shares finding 1.
   - (c) No edge states when there is any `schema` finding: matches para 6 ("decide the states of every edge of a v9 draft that has no `schema` finding"). `unit-reference` findings are still reported, which para 2 ("For a v9 draft Syzygy SHALL report") permits. Tested, and killed by mutant (a).
