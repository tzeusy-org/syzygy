# Design: typed arrows, witnessed or challenged by derived facts

[Inferred] Version 2.19 of REQ-polaris-generation-034, for syzygy-3efd.28, drafted on `main` at `c900e871` over the adopted version 2.16 text (`dossier-page-subsections`, row A-50). The version 2.16 code (schema v8) is still on another branch at that commit, so `main`'s draft schema is v7 and every code site named in D10 is re-located on the base the implementation starts from.

## D1. The version label

[Observed] On `origin/main` at `c900e871` the tags of this line run to `polaris-dossier-raw-read-disclosure-v2.17` (row A-51), which modifies REQ-polaris-generation-033, -036 and -046, not -034; the latest REQ-034 version is 2.16 (A-50). Version labels on this line are shared across its requirements, and 2.18 is allocated to a concurrent change of REQ-033, -035 and -048 (syzygy-3efd.80), so this is 2.19, composed over 2.16's REQ-034 text, which no version between changes. It was first installed as 2.18 (`71203211`) and renumbered before review. [Observed] One unmerged branch, `origin/agent/syzygy-5dhm.23` (`dossier-verify-text`, a REQ-033 change), also calls itself 2.17 and will need a free label too. The label is re-checked against the ledger and the tags immediately before the adoption row.

## D2. Schema v9: a relation on every graph edge, a unit on a node

- [Inferred] `relation` is required on every v9 graph edge, as the bead's outcome asks ("Every figure arrow has a relation type"), so no v9 arrow is untyped; `relates-to` is the honest type for an arrow none of the others fits, and is never witnessed.
- [Inferred] Matching "the same two units" needs an identity the draft states and a check can compare without reading labels. A node's `unit` is that identity: the node says which unit it is, by the same keys the derived facts carry (a path, a name, a job or service key). A label never takes part, so `src` drawn as "the engine" is matched by its unit and a node labelled `src` with no unit is matched by nothing.
- [Inferred] `unit` is optional: a node may stand for something that is no unit Syzygy derives (a user, a network, a concept). An arrow with an unbound end is `unknown` (`endpoint-without-unit`), never a finding, so binding is an opt-in claim and the brief says to bind only exact units. Residual (D11): an author can avoid every challenge by binding nothing.
- [Inferred] Sequence messages and swimlane steps (version 2.5) carry no relation: a message is an act in time and a step an action in a lane, neither a structural relation between two units, and no fact kind could witness one. "Every figure arrow" is read as every arrow of a graph figure; the proposal names this as a non-goal so a reviewer can contest it.
- [Inferred] A new version, not optional members of v8, for the reason 2.16's D2 gives: an earlier draft carrying the member gets `field-version` in place of `schema`, and every stored v8 draft keeps its findings.

## D3. The closed list, grounded in the facts the code produces today

[Observed] The fact kinds the recognizers emit (`FactKind`, `packages/polaris-dossier/src/manifest-model.ts`: `package`, `module`, `workspace-member`, `dependency`, `workflow`, `workflow-trigger`, `job`, `job-needs`, `service`, `service-image`, `service-port`, `service-depends-on`, `kubernetes-object`, `terraform-resource`, `terraform-module`, `make-target`, `cmake-project`, `cmake-target`) and the structure record's facts (`tree-root`, `top-level-unit`, `contains`; `TOP_LEVEL_UNIT` in `derive-rules.ts`, the only rule whose facts render) hold exactly four kinds that join two endpoints a draft can name:

| Relation | Witnessing fact | Rule(s) | From unit | To unit |
|---|---|---|---|---|
| `contains` | `contains` | `top-level-unit` v1 (2.3) | `repository-root` | `top-level-directory` |
| `declares-dependency` | `dependency` (`path`, `name`) | `npm-package-manifest`, `cargo-manifest`, `python-project-manifest`, `go-module-manifest` v1 (2.7) | `package-manifest` | `dependency-name` |
| `needs-job` | `job-needs` (`path`, `from`, `to`) | `github-actions-workflow` v1 (2.7) | `workflow-job` | `workflow-job` |
| `depends-on-service` | `service-depends-on` (`path`, `from`, `to`) | `compose-file` v1 (2.14) | `compose-service` | `compose-service` |

- [Inferred] Left out, each with its reason: `workspace-member` (its target is a glob pattern, not a unit); `service-image`, `terraform-module` (their targets are an image reference and a module source string; a later version can add them with a unit form of their own); `workflow-trigger` (an event name, not a repository unit); the single-endpoint kinds (`package`, `job`, `service`, `kubernetes-object`, `terraform-resource`, `make-target`, `cmake-*`), which are units, not relations.
- [Inferred] The seven authored-only types (`calls`, `imports`, `reads`, `writes`, `sends-to`, `starts`, `relates-to`) cover what a reader's figure mostly draws and no rule can derive: the manifest paragraphs of version 2.7 state that no fact says "what any code imports, calls or does at run time". They are in the list so that the bead's exclusion is mechanical: an authored `calls` can never meet a `declares-dependency` fact, because the table gives `calls` no witnessing fact at all.
- [Inferred] `declares-dependency` joins a manifest to a declared name, not to another package of the tree: version 2.9 states that "no rule of this version states that a dependency names a package of this tree", and this version keeps that (the target unit is the name as declared).

## D4. The witness rule, and the order it decides in

- [Inferred] One fact kind per relation and exact equality of the unit members, nothing case-folded: identity, not resemblance.
- [Inferred] The order puts every reason the draft or the rule makes undecidable first (`edge-not-inferred`, `no-witness-rule`, `endpoint-without-unit`, `endpoint-unit-invalid`, `endpoint-kind-mismatch`, `recognizer-not-eligible`), then the derivation's own state (`facts-unknown`), then the search. A found fact witnesses whatever the coverage (a fact found is evidence even where other paths were left out); only absence needs complete coverage.
- [Inferred] An edge the draft labels Unknown, or one rendered as a withheld item, is neither upgraded nor challenged: the draft did not assert it, and upgrading a withheld item would put Syzygy's words where screening withheld the agent's.
- [Inferred] At render the fact must also render Observed there (the currency policy of version 2.3), so a witness is never stronger than its fact (condition 2); otherwise `fact-not-current`. Check reads no currency policy: its job is the challenge, which rests on the derivation's completeness, and a witness check passes leaves nothing on the page that the render has not decided again.

## D5. The challenge is a repair finding

[Inferred] "Raises a finding" is read as a repair finding (the draft does not proceed to review), because a challenged arrow contradicts what Syzygy derived from the pinned revision with complete coverage: rendering it with its authored marking would show the reader a structure the tree does not hold. The author's repairs are named in its words: correct the arrow, its relation or its units. The detail names no unit path or name, so no finding can carry a path a secret detector matches even if the draft wrote one. An advisory was considered and rejected: an advisory lets a refuted arrow reach the page.

## D6. Coverage is complete only where nothing could hide the fact

- [Inferred] `contains`: the structure record is `derived`, nothing was left out for a secret detector (a directory all of whose paths match one has no fact, version 2.3), the tree holds no submodule (`deriveTreeFacts` counts a mode-160000 entry in `submodules` and gives it no fact, so a top-level submodule, or a directory holding only submodules, is in the tree with no `top-level-unit` fact; review finding F1), and no directory went past the listing of 250. Both counts are in the record, so the decision needs no new read.
- [Inferred] An eligible recognizer's relation (none at version 1): the member is `derived`, no fact went unlisted, and the source unit's file is listed, Inferred and dropped no value, since a dropped value (version 2.7's value checks) could be the missing fact.
- [Inferred] Everything else is `coverage-partial`, `unknown`, never a finding (the bead's exclusion).

## D7. Which recognizers qualify today, and how one becomes eligible

[Observed] Version 2.7's label paragraph already says a recognizer "qualifies for an upgrade only once it has, at a stated commit, golden fixtures ... and a recorded mutation run" naming its rule and version, the commit, the SHA-256 of its source, any parser package, and each mutant's old and new fragment and outcome, and that its label "changes only by a later version of this requirement that names the record". This version keeps that path and adds the witness on top of it: an arrow is witnessed only by a fact that renders Observed, so a recognizer witnesses exactly when a later version makes its facts Observed. State at `c900e871`, measured by script (SHA-256 of each module the record names against the file at that commit):

- [Observed] `top-level-unit` v1: its facts render Observed under `POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1` (`pinned-revision`) since 2.3, with the mutation record `docs/evidence/syzygy-3efd-27/derived-observed-mutation-rerun-2026-11-21.json` (sha256 `6c1261ae…`). The one eligible row. [Observed] Review N3: all six modules that record names (`diagram-layout.ts`, `dossier-site.ts`, `check.ts`, `derive.ts`, `derived-record.ts`, `render.ts`) differ at `c900e871` [Inferred: `deriveTreeFacts` itself is substantively unchanged; the `derive.ts` diff only exports `secretOrUnder`]. So the row is not held to the recognizers' freshness test: the spec states that it names no record and rests on version 2.3's adoption of those facts and their declared currency bound, which is the standard those facts already render Observed under.
- [Observed] The 2.7 recognizers: `docs/evidence/syzygy-3efd-25/manifest-recognizers-mutation-2026-11-22-repair.json` (sha256 `dbba0e9c…`, ran at `cc0ea279`, 65 of 65 killed) names ten modules; the five recognizer modules and `manifest-json.ts` and `manifest-toml.ts` are unchanged, but `manifest-facts.ts`, `manifest-model.ts` and `manifest-yaml.ts` have changed since (the 2.14 work). Not eligible: a run at the current code is needed.
- [Observed] `compose-file` (2.14): `docs/evidence/syzygy-3efd-26/infra-recognizers-mutation-2026-11-22.json` (sha256 `f46f5f3b…`, at `1b5c8180`, 74 of 74 killed) still matches `manifest-compose.ts`, `manifest-facts.ts` and `manifest-yaml.ts`, but its members are `format`, `ranAt`, `commit`, `subject`, `command`, `method`, `testFiles`, `baseline`, `mutants` and `summary`: it names no rule and version and no parser package, which the 2.7 paragraph requires. Not eligible as recorded.
- [Unknown] Whether each fixture the 2.7 and 2.14 paragraphs enumerate exists in `manifest-recognizers.test.ts` and `manifest-infra-recognizers.test.ts` was not swept here; the version that adds a row must sweep it.
- [Inferred] To become eligible: a conforming run at a commit where every named module matches; a currency-policy successor declaring a bound for that rule and version (condition 2; `pinned-revision` fits, a blob at a pinned commit cannot change); and a REQ-034 version that names the record by path and SHA-256, labels the facts Observed (and so the computed maps' elements, which then change their bytes) and states the evidence text of its witnessed arrows. The hermetic-tier test that the spec requires makes a source change after the run fail CI rather than silently keep a stale row.

## D8. Rendering, and the six conditions

- [Inferred] A witnessed edge is a derived fact on the page, not a claim (review F2): no claim anchor (its `data-witness-*` attributes are its provenance, as `data-derived-id` is a derived fact's, which meets RFC7-28's "each named element carries an anchor" the way the derived region does), and none of the draft's counts, so a draft's appendix and per-page counts do not change with whether an arrow is witnessed. The fidelity review reads the draft before any render, so it reviews every edge as the draft's claim and its verdict entry for a later-witnessed edge stays and governs the run as any edge's does.
- [Inferred] A witnessed arrow is drawn as Syzygy's statement: solid, its label Syzygy's relation words, its list item ending `Witnessed by Syzygy` with the evidence text, its attributes naming the fact, rule and version. The agent's label and citations are not rendered for it, because an Observed mark beside the agent's words would vouch for them. Node labels stay the agent's (no box is upgraded); a node mislabelling its unit is a fidelity-review matter (D11).
- [Observed] RFC7-28: "Curated diagrams ... must not imitate the computed map; ... curated/computed provenance is a machine-readable attribute on every visual." [Inferred] The figure keeps `data-visual-provenance="curated"`, and the one solid element carries its own provenance (`data-witness-*`), so the figure still never claims to be computed; no box, caption or layout is upgraded.
- [Inferred] The conditions of the owner's decision: (1) the witness rests on the structure record, an evidence artifact, re-derived at render; (2) only a fact that renders Observed under its declared currency bound witnesses; (3) as above; (4) identical relation type only, by the table, the core of this slice; (5) the arrow's words state only the fact (`contains`, `declares a dependency on`, `needs`, `depends on`); (6) the rule reads no size or object identifier, so a private repository's withheld blobs give nothing.

## D9. Rendered bytes that move

[Inferred] Only a schema-v9 draft's: each graph arrow and list item gains `data-relation`; a witnessed arrow changes as D8 states, and its figure's legend and tally follow; `machine.json` gains each edge's `relation` and `witness`; `dossier.json`, the review packets and the size report by the bytes those add. Check's findings gain `unit-reference` and `relation-challenged` for v9 drafts. No byte moves for a draft of schema v8 or earlier (apart from `field-version` in place of `schema` where one carries a new member) or for the provider mode, whose closed schema (`draft` in `packages/polaris-generation-core/src/draft-model.ts`) gains neither member. The check record and its report gain no member.

## D10. What the code change must do

- `packages/polaris-dossier/src/draft-schema.ts`: schema v9 (`LOCAL_DRAFT_SCHEMA_VERSION_V8` named, v9 appended), a version predicate for the relation form, `relation` (an enum of the eleven) required on graph edges and `unit` (a `oneOf` of the six closed objects) optional on graph nodes, in v9 only; every equality on the moving constant that means "v8 or later" becomes a predicate, as 2.16's D8 lists for v7.
- `packages/polaris-dossier/src/check-derive.ts`: `field-version` for the members in v8 and earlier; `unit-reference`; the rule `relation-witness` as a pure module of its own (`relation-witness.ts`, its eligibility table as data, inputs the structure record and the `manifestFacts` member), and `relation-challenged` after every 2.16 finding.
- `packages/polaris-dossier/src/render.ts` and `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`: the render's own witness decision from its re-derived facts and currency; the edge model gains `relation` and `witness`; the SVG drawing (`renderDiagramSvg`'s attribute hook), the list item and `machine.json` as the spec states; legend and tally from the rendered marks.
- `packages/polaris-dossier/src/brief.ts`: brief v15 and its paragraph.
- Tests: literal cases of every scenario (witnessed, other type, challenged, partial, kind mismatch, unbound, not asserted, not current, refused relation and unit, `unit-reference` forms); every stored fixture of schema v2 to v8 byte-identical in findings and renders; the provider golden unchanged; a test that the eligibility table's records still match their modules (vacuous at version 1, which names no recognizer record, and asserted to be so); a recorded rule-6 mutation run.

## D11. Residuals

- [Inferred] Binding is opt-in, so an author who binds no unit is never challenged; `machine.json` carries every v9 arrow's witness state and reason, so the next pursuit can measure how many arrows stay unbound.
- [Inferred] Only `contains` can be witnessed at this version, and authors rarely draw "the root contains `src`"; the slice's value grows as recognizers become eligible (D7).
- [Inferred] A node whose label misnames its unit sits next to a solid arrow; the evidence text names the fact, and the fidelity review judges the label.
- [Unknown] Whether authors type arrows well without examples beyond the brief paragraph.
- [Inferred] Review N6: any `unitsNotListed` above zero makes every `contains` absence partial, though the absence of a target that sorts before the 250th listed directory is decidable; a possible refinement for a later version, not made here.
- [Observed] Runtime review F1 resolved the open question from specification review N5. The fidelity packet screens the new graph unit fields and omits a matched unit, recording the number omitted. The draft and its digest still identify the frozen revision. The review-packet integration test exercises a matched path, a matched name and a retained binding.
- [Observed] Runtime review N1 found that the machine view could include a relation edge when its drawing was refused. The renderer now publishes those rows after the drawing passes the inert SVG check. An integration test exercises the refusal.

## Renumbered 2.19 (2026-11-23)

[Observed] The package was installed as 2.18 (`71203211`, spec sha256 `5611e27d…`), the bytes the review read. The lead then allocated 2.18 to a concurrent change of REQ-033, -035 and -048 (syzygy-3efd.80), so this package became 2.19, tag `polaris-dossier-relation-types-v2.19`: every "2.18" in the spec, its package files and the checker wiring became "2.19", by the same anchored build script. No rule moves: the predecessor is still 2.16's REQ-034 text, which neither 2.17 nor 2.18 changes. The review raw keeps its 2.18 wording (CC-REV-6).

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-28/R-RELATION-TYPES-SPEC-1-RAW.md`, over the spec at sha256 `5611e27d34a4ef406b6907b1f0b38d7f0450087fb4c0b83571a2f897a7a78f28` (commit `71203211`): "Verdict: REVISE" (line 3), two blocking findings and six notes. Every one is repaired or recorded below, in the spec rebuilt from the 2.16 bytes by the same anchored script, with `SEMANTIC-DELTA.md` regenerated from the bytes; the repaired spec's digest is the one the checker pins. One round (D10): no confirmation round follows.

| # | Severity | Disposition |
|---|---|---|
| F1 | Blocking | Repaired: `contains` coverage is complete only where `secretPathsLeftOut`, `submodules` and `unitsNotListed` are all zero; the closing sentence names a submodule; the partial-coverage scenario adds a top-level submodule and a directory holding only a submodule; Case and Falsifier name both (D6). |
| F2 | Blocking | Repaired: a witnessed edge carries no claim anchor, enters none of the draft's counts (page and appendix), is counted by its figure's tally as Syzygy's Observed element, and keeps its fidelity-verdict entry, which governs the run as any edge's does; literals in the first scenario and the Oracle; the Falsifier adds an anchor or a count (D8). |
| N1 | Note | Repaired: a new reason `endpoint-unit-invalid` (nine reasons in all), decided right after `endpoint-without-unit`, so a unit with a `unit-reference` finding gives no `relation-challenged` finding too; added to the scenario "A unit that names no unit of its kind" and the Falsifier. |
| N2 | Note | Repaired: `facts-unknown` reads "the record the relation's row reads", and a record the row does not read never decides it. |
| N3 | Note | Repaired: D7 states the record's six modules have changed; the spec states the `top-level-unit` row names no record and rests on version 2.3's adoption and currency bound, outside the freshness test. |
| N4 | Note | Repaired: after every 2.16 finding come the `unit-reference` findings in node order, then the `relation-challenged` findings in edge order; the Observable names the order. |
| N5 | Note | Repaired: a unit at a path a secret detector matches or the screen denies is never tested for a blob and decides `coverage-partial`; no finding, page, `machine.json` or check record or report carries a unit's value; a scenario and the Falsifier pin both. Whether review packets carry units as written is recorded [Unknown] in D11. |
| N6 | Note | Recorded in D11 as a possible refinement; no spec change. |
