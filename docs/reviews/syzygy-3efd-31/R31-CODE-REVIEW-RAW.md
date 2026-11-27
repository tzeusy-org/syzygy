# Code review: syzygy-3efd.31 containment figure (REQ-polaris-generation-034 version 2.23)

Verdict: NOT READY
Reviewed commit: 4812826d45d4cbd0624bd32dd1e647b4c301525a (origin/agent/syzygy-3efd.31-code)
Diff base: 4b86e4285 (the branch's merge base; `origin/main...4812826d` could not be computed in this clone because the fetched origin/main tip references a missing object, fb44ebff; `git diff --stat 4b86e4285 4812826d` gives the PR's 33 files, 4,790 insertions, 76 deletions)
Spec: openspec/changes/dossier-containment-figure/proposed/polaris-generation/spec.md, lines 120-130 (2.23 paragraphs) and 1286-1338 (scenarios)

The code is correct against the 2.23 text everywhere I traced it. The verdict rests on criterion 5 alone: all three of my own mutants survived the suite, each on a behavior the requirement states in words, and one of them is a VIS-2 path (a withheld child group). The repairs are three tests; no production change is needed.

## Findings

### 1. Blocking (High). A withheld child group's nesting is untested; a mutant that stops reading it as unasserted survives.

- [Observed] `packages/polaris-dossier/src/check-derive.ts:677` decides a nesting with `asserted: asserted(group) && !withheld(parent.group)`. The child's withheld state reaches the decision only through the caller's `asserted` predicate (`check.ts:289`, `render.ts:309`).
- [Observed] Mutant applied at 4812826d:
  - old: `asserted: asserted(group) && !withheld(parent.group)`
  - new: `asserted: group['epistemic'] === 'inferred' && !withheld(parent.group)`
  - Ran `containment-figure.test.ts`, `check.test.ts`, `review.test.ts` and `render.test.ts`: 4 files passed, 559 tests passed. It survived.
- [Observed] The only withheld test, `containment-figure.test.ts:357`, withholds the parent. Spec line 124: "a nesting either of whose groups renders as a withheld item being `unknown` (`edge-not-inferred`)".
- [Inferred] Under the mutant, a withheld Inferred child with unit `top-level-directory src` nested in a root group would render "<root> contains <withheld words>: Witnessed by Syzygy", an Observed statement over a withheld claim, and no test would fail.
- Repair: add the mirror of the test at line 357 with the child citing `.env`. Assert `edge-not-inferred` in `figureStructures`, no "Witnessed by Syzygy", and PASSED at check where the child's unit names an absent directory.

### 2. Blocking (Medium). The `children`-list half of the structural gate is untested.

- [Observed] `packages/polaris-dossier/src/containment.ts:66-69`, `listFault`, matches a schema finding at `groups` or at any `.children` list beneath it. Spec line 122: "Syzygy SHALL compute `containment-depth`, `containment-size` and `containment-flat` only for a containment whose `groups` list and every `children` list in it have no `schema` finding".
- [Observed] Mutant:
  - old: `` GROUPS_FIELD}(?:\\[\\d+\\]\\.children)*$` ``
  - new: `` GROUPS_FIELD}$` ``
  - Ran `containment-figure.test.ts`, `figure-fit.test.ts` and `check.test.ts`: 350 of 350 passed. It survived.
- [Inferred] Why it survives: the one children-bound test (`containment-figure.test.ts:257`) puts nine leaves under a level-1 group. That figure has no structural finding either way. The recorded mutant `list-fault-ignored` removes the whole condition, so it is killed by the empty-`groups` case and never exercises the children half.
- Repair: add a case whose children-list schema fault coexists with a structural fault. For example, a level-3 group with nine children (a schema fault at its `children`, and nine level-4 groups) should give the schema finding alone, with no `containment-depth`.

### 3. Blocking (Medium). The size gate on nestings is untested.

- [Observed] `packages/polaris-dossier/src/containment.ts:95` names `containment-size` among the findings that leave a containment's nestings undecided. Spec line 124: "A containment with any of those four findings ... has none of its nestings decided and raises no `relation-challenged` finding".
- [Observed] Mutant:
  - old: `kind !== 'containment-size' && ` (removed)
  - new: (nothing)
  - Ran `containment-figure.test.ts` and `check.test.ts`: 332 of 332 passed. It survived.
- [Inferred] The 41-group test (`containment-figure.test.ts:247`) carries no units, so every nesting is `endpoint-without-unit` either way. The depth and figure-kind halves are covered (`undecided-ignores-depth` and `undecided-ignores-figure-kind` in the record); size and flat are not. A flat containment has no nesting, so dropping flat may be equivalent; dropping size is not.
- Repair: give the 41-group fixture a root group with a `top-level-directory missing` child. Assert that `containment-size` is the only finding, with no `relation-challenged`.

### 4. Low. Field-version findings in v2-v10 change position as well as kind.

- [Observed] In `docs/evidence/syzygy-3efd-31/dump-*.json`, every v2-v10 containment variant goes:
  - from `schema groups, schema kind, schema nodes, schema edges`
  - to `schema nodes, schema edges, field-version kind, field-version groups`.
- [Inferred] Spec line 122 says "each stands in place of the `schema` finding ... at the same path". The code reads that as a change of kind, not of position. This matches precedent: the 2.5 and 2.19 field-version findings are also appended in their structure stage. Neither the record nor the PR states the reordering.
- Repair: add one sentence to the byte-identity record and the PR saying the findings move to the structure stage's position. No code change.

### 5. Low. A `groups` list holding no record is reported as `containment-flat` besides its schema finding.

- [Observed] `containment.ts:85` tests `groups.every(({ level }) => level === 1)`. `groupsOf` skips non-records, so for `groups: [1]` the list is empty, `every` is vacuously true, and `containment-flat` is reported beside the schema finding at `groups[0]`. That path is not a list fault, so the gate lets the figure through.
- [Inferred] The spec's literal gate (list faults only) allows this, but the finding is noise.
- Repair: optionally skip the figure where `groupsOf` is empty. If the literal reading is the one intended, leave the code and note it.

### 6. Low ([Unknown] conformance). "The fidelity review SHALL judge a group as read with the group it is drawn in" (spec line 120).

- [Observed] `review-packet.ts` and `review-reach.ts` treat groups as nodes. The packet carries the nested draft. No reviewer-facing text names the parent, and the PR's "Not done here" says so.
- [Unknown] Whether the nested draft alone meets "SHALL judge": the reviewer brief was not read for this review.
- Repair: track it with a bead, or add one line to the fidelity reviewer's instructions.

### 7. Low. An unknown version's refusal names every version except v11, although check reads v11.

- [Observed] `draft-schema.ts` `NAMED_SCHEMA_VERSIONS`. `check.test.ts:2311` pins a v12 refusal detail that lists v2-v10 and v13, so an agent is told v11 is not a version while check accepts it.
- This follows from the lead's scope decision (the published schema keeps its bytes), so it is not a finding against the PR. Recorded so that brief v22 or the catch-up bead (syzygy-3efd.84) can close it.

### 8. Low (craft).

- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts:836-838` computes the layout twice: `renderContainmentSvg`, then `layoutContainment`. `renderContainmentSvg` could return the layout, or take one.
- `diagram-layout.ts` `layoutContainment`'s `place` pushes a placeholder box and then rewrites it through `boxes[boxes.indexOf(box)]`. Computing the height before pushing, or pushing by index, reads more plainly.
- `packages/polaris-dossier/src/render.ts:718` calls `groupsOf(diagram, 0)` with a hard-coded index whose paths are discarded. It is correct, but it reads as a bug; a comment, or a path-free walk, would help.
- `packages/polaris-dossier/src/review-packet.ts:2` places the `./containment.js` import between `node:fs` and `node:path`.
- `check.ts:294-296` computes the structural findings twice, once with an empty schema-path set, to feed `undecidedContainments`. The comment explains why. A cleaner order would compute the structural findings once before the relation block and pass them in.

## Criteria

### 1. Spec conformance (lines 120-130 and scenarios 1286-1338)

| Rule or scenario | Code | Test |
|---|---|---|
| v11 = v10 + `containment`/`groups`; group form; `unit` optional; recursive `children` | `draft-schema.ts` `contained()`, `DEFS_CONTAINMENT` | `containment-figure.test.ts:185` |
| `groups` 1-5 and `children` 0-8 as schema findings at the list | `CONTAINMENT_BOUNDS`, `localDraftSchema` | `:257` |
| `figure-kind` reads `groups` (containment takes only `groups`; other kinds none) | `check-derive.ts` `figureKindFindings`, `figureMembersOf`, `membersOfKind(kind, version)` | `:285`, `:297` |
| `containment-depth` at each level-4 group, detail literal | `containment.ts:81` | `:240` (detail checked literally) |
| `containment-size` at `groups`, `<n>` = every group | `containment.ts:84` | `:247` (literal) |
| `containment-flat` at `groups` | `containment.ts:85` | `:247` (literal) |
| Structural findings only with no list schema fault | `containment.ts:66-77` | `:257` covers `groups` only (Finding 2) |
| `unit-reference` for groups at levels 1-3, at `.unit`, naming the group | `check-derive.ts:668-670`, `containmentRelationFindings` | `:267` (literal detail), `:240` (none at level 4) |
| Order: after 2.22 and hero, then depth, size, flat, unit-reference, relation-challenged | `check.ts:303-309` | `:267` |
| `relation-witness`: produced, no schema, no figure-kind, depth, size or flat finding | `check-derive.ts:674`, `check.ts:294-299` | `:297`, `:351`, `:312`; size untested (Finding 3) |
| Nesting = `contains` edge parent to child, labelled as the child | `check-derive.ts:677` | `:331`, `:346` |
| Withheld parent or child gives `edge-not-inferred` | `check-derive.ts:677`, `render.ts:309-315` | parent `:357`; child untested (Finding 1) |
| Witnessed, challenged, `endpoint-kind-mismatch`, `endpoint-without-unit` | `decideWitness` reuse | `:331`, `:346`, `:370` |
| `relation-challenged` detail literal, naming the child and no unit path | `check-derive.ts:688-689` | `:346` (literal) |
| Render re-decides, `fact-not-current` included | `render.ts:318-330` (`witnessAtRender`) | shared with 2.19 tests |
| Layout constants, W and H | `diagram-layout.ts` `layoutContainment` | `containment-layout.test.ts:14,24`; `:189` (5 rects literal) |
| Label wrap 19/16/13, two lines, ellipsis; 13 px; line style by mark; no connector | `renderContainmentSvg`, `figureLines` | `containment-layout.test.ts:42,50`; `:189` |
| Inertness notice | `dossier-site.ts:833-840` | layout throw cases `containment-layout.test.ts:29` |
| Figure attributes, caption, relationship eyebrow, `figure-forms`, `figure-outline` | `dossier-site.ts:860-864` | `:189` |
| Tally, with the nestings sentence (singular for one) | `dossier-site.ts:852-855` | `:189`, `:331` |
| List in preorder with "(in parent)", then witnessed items, then source | `dossier-site.ts:841-848` | `:189`, `:331` |
| Phone outline form, `?` on Unknown, withheld words | `dossier-site.ts:849-850` | `:189`, `:370`, `:357` |
| CSS: queries and outline only where a containment renders; stepper only where a sequence or swimlane does | `figureKindsCss` | `:218`, `:228`, `containment-layout.test.ts:68` |
| Mermaid source by position, indent, class lines, escaping | `draft-model.ts` `containmentToMermaid` | `:189`, `:370`, `containment-layout.test.ts:59` |
| Figure fit as sequence/swimlane; Unknown when not computable | `figure-fit.ts` `containmentShape` | `figure-fit.test.ts` (+29 lines) |
| `figureStructures` entry, order, `witness` | `dossier-site.ts:858-860`, `:1377` | `:189`, `:331`, `:357`, `:370` |
| Not a hero | `heroFindings` `membersOfKind(..., version)` | `:323` |
| v10 and earlier: `field-version` at `kind` and `groups`, literal details | `containment.ts:50-60`, `check-derive.ts:456-461,821` | `:392` v10, `:410` v6; byte-identity record v2-v10 |
| v13 keeps its own schema findings | `precedesContainment` | `:401` |
| Brief v17 paragraph (pinned constant, not issued) | `brief.ts` `CONTAINMENT_PARAGRAPH` | `:436` (verbatim), `:440` |

- [Observed] Finding names and the detail strings for depth, size, flat, both field-version findings, unit-reference and relation-challenged were each compared against spec line 122 or 124 and match literally.
- [Observed] Apart from Findings 4-7, no rule lacks code or deviates. Untested rules are Findings 1-3.

### 2. Older schemas and provider mode

- [Observed] The provider golden (`dossier-render-provider-golden.test.ts`, `.json`) is not in the diff. It passed at 4812826d (1 test).
- [Observed] Byte identity: the record compares dumps of v2-v10 and v13, plain and containment, before (4b86e428) and after (a49a56fd).
  - Plain variants: findings unchanged.
  - Containment variants v2-v10: schema findings become field-version findings (Finding 4 covers their order).
  - v13: findings unchanged.
- [Observed] The `draft-schema.test.ts` and `check.test.ts` edits are confined to the v11/v12 unknown-version tests. v11 is now known; v12 stays refused.

### 3. No script, pure layout, CSS scoping

- [Observed] `layoutContainment` is a pure function of the tree; it reads no label width.
- [Observed] `:218` asserts that the page carries no `<script`.
- [Observed] `figureKindsCss` returns `''` for a page with neither kind, which keeps that page's bytes.
- [Observed] The swimlane-only page carries no `.figure-outline` rule (`:228`). The containment-only page carries no `.figure-stepper` rule (`:218`).

### 4. Honesty (VIS-2)

- [Observed] A nesting is decided only through `decideWitness`, under the spec's gates.
- [Observed] A witnessed item renders only where `relation.evidence` is present: witnessed, and a derived record at render.
- [Observed] Group markings are only `inferred` or `unknown` (`render.ts` `claimOf`), so no box is upgraded.
- [Observed] A withheld parent gives `edge-not-inferred`. A withheld child does too in the code, but no test protects it (Finding 1).

### 5. Tests

- [Observed] Expected values in `containment-figure.test.ts` and `containment-layout.test.ts` are literals. The file header states this. The record digest is computed from the rendered record's bytes, not from the module under test.
- [Observed] Mutation record `docs/evidence/syzygy-3efd-31/containment-mutation-2026-11-27.json`:
  - format `mutation-run/1`, commit b569a75b (an ancestor of 4812826d; only `check.test.ts` and the record changed since);
  - subject digests per file;
  - 61 mutants, each with `old`, `new`, `killed` and `failedTests`; summary 61 of 61 killed.
- [Observed] My mutants. Each was applied in the worktree and then restored with `git checkout`; `git status` was clean afterwards.
  - R1 (Finding 2): survived, 350 of 350 tests passed.
  - R2 (Finding 3): survived, 332 of 332 tests passed.
  - R3 (Finding 1): survived, 559 of 559 tests passed.
  - Control: swapping `id` for `parentId` in the relation-challenged detail was killed (`containment-figure.test.ts` "challenges a nesting ...", 1 failed), so the harness detects a fault.

### 6. `npm run check` at 4812826d

- [Observed] Exit 0. Test Files 229 passed (229); Tests 5721 passed, 1 skipped (5722). This matches the PR's count.
- [Observed] Also run: `containment-figure.test.ts` (integration), 24 passed; `containment-layout.test.ts`, 7 passed; provider golden, 1 passed.
- Not run: e2e (`containment.browser.test.ts`), the integration tier as a whole, and the battery.

### 7. Readability and craft

- Good overall. `containment.ts` is small and well named.
- The version predicates are the single seam for v12 and v14, as the PR says.
- Comments cite the version and the reason.
- Nits are in Finding 8.
