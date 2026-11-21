# Design: derived structural facts rendered Observed

## The surface

[Inferred] The slice upgrades no authored element, so a derived fact can only appear in something Syzygy draws itself. The smallest sound surface is one computed figure on the landing page, `index.html`, in a region of its own placed after everything the draft supplies there. Alternatives considered:

- A separate page: computed map pages are syzygy-3efd.36's (Q7 S1), which will need its own spec delta; a second page here would pre-empt that design. The landing page already holds the overview figure (v2.2), so a reader meets the computed figure where they meet the curated one, and the contrast between the two is the point.
- A list with no drawing: honest, but the bead's outcome is a solid box or line, and a list alone would leave the legend's "Solid" entry with nothing to point at.
- Upgrading draft elements that match a derived fact: excluded by the bead (condition 4 and the exclusions; syzygy-3efd.28).

[Inferred] It cannot be mistaken for a curated figure: its heading and caption say "Derived by Syzygy", its region carries no draft text and no hue, its `<figure>` carries `data-visual-provenance="computed"` where every draft figure carries `curated`, and no curated figure can draw a solid element, because no draft element can be Observed. RFC7-28's "curated/computed provenance is a machine-readable attribute on every visual" is met for every operator-agent visual; provider-mode figures are left without it, because the provider mode's bytes are pinned (`dossier-render-provider-golden.test.ts`) and it renders no computed visual (see Residuals).

## The rule and its facts

[Observed] `derive.ts` (A-15) computes `units` (top-level directories with file counts) and `rootFiles` from paths and modes, leaving out secret-matching paths and their prefixes, but attributes them to no rule: its six rules (`vendored-path`, `generated-path`, `language-by-extension`, `docs-tree`, `tests-path`, `manifest-names`, each version 1) cover the other members. Condition 5 needs every rendered fact to name the rule that matched, so the requirement names a seventh, `top-level-unit` version 1, whose matching is what `derive.ts` already does for `units` and `rootFiles`.

[Inferred] Three fact kinds, all restatements of path segments and counts: `tree-root`, `top-level-unit`, `contains`. `contains` is the containment the path itself states (`a/b` lies under `a`); it is not a dependency, call or ownership relation, and it witnesses nothing of that kind (condition 4 stays with syzygy-3efd.28). The other rules' facts (vendored, generated, languages, docs, tests, package shape) are not rendered: each carries an interpretation risk a reader could take for a judgement ("vendored" is a name, not a fact about authorship), and each would need its own declared bound.

[Inferred] A directory's `path` in the record is the raw first segment, not the census's shown form: `shownPath` JSON-quotes and truncates past 512 code units (`census.ts`), which would put quote marks in box labels and could make two directories look alike. The fact's `_tree-unit-<k>` identity is the unique key; the path is HTML-escaped on the page like all text.

[Inferred] Twelve drawn directories keeps the drawing to thirteen boxes and twelve arrows; the list holds every directory up to the census listing limit (250), and `unitsNotListed` counts the rest, each case with its own note, so nothing is silently dropped.

## The record: condition 1, and why check keeps it

[Inferred] trust-and-evidence.md:17-18: "Evidence is a durable, identified, integrity-verifiable artifact carrying its source, capture time, scope, and provenance." The record is `derived/rev-<n>.json` in the run directory, written once (as the check record and frozen draft are) by the `syzygy dossier check` that checks draft revision `<n>`, from the tree listing it already takes for its census. It is identified and integrity-verifiable by `sha256:<hex>` of its exact bytes, recomputable by anyone holding the file and named by the figure, every derived element and entry, and `machine.json`; its source is `repositoryId` and `revision`, its capture time `capturedAt`, its scope the fixed `scope` text, and its provenance `producer` and `rules`. Each render publishes those bytes unchanged as `derived-structure.json` in the site.

[Observed] Why at check, not at render (review finding F1): the rendered-design review counts only while its packet digest equals the digest of the packet rebuilt from the current render's files, outside the one review-status region (`design-review.ts` `outsideRegion`, which carries every non-HTML file as written and every page without its region). A record re-captured at each render would change `capturedAt`, hence its digest, `index.html` and the published file at every render, and no design verdict could ever count. Keeping the record per draft revision makes a re-render byte-stable; a new draft revision retires the design review anyway (REQ-polaris-generation-006).

[Inferred] The render still does not trust the stored facts: it re-derives them from the tree it lists through the object reader it verifies blobs with, and a mismatch, or a record naming another revision, makes every fact Unknown (`stale-beyond-currency-bound`). That is the same pattern as quotations, which check records and render re-verifies. A draft revision checked before this version has no record, so its region renders Unknown (`missing-evidence`) until it is checked again.

## The currency bound: condition 2

[Observed] trust-and-evidence.md:26-32: every claim class declares a currency bound, and until it does its claims render Unknown; "The bound values belong to craft policy and RFCs". RFC2-9 binds the mechanism (`no-currency-bound-declared`, `stale-beyond-currency-bound`), and RFC3-15's table puts currency-bound declarations in `policies/`, installed by an agent adoption. So the bound is declared in a policy file, `POLARIS-DOSSIER-DERIVED-FACT-CURRENCY-POLICY-v1.json`, installed and adopted with the spec, and the requirement names it rather than declaring the value itself.

[Inferred] How a render binds it (finding F3): as `readCommittedPolicy` (`policy-snapshot.ts`) binds the screening policy, from the committed bytes at the Syzygy checkout's own HEAD, refusing uncommitted bytes; and only while those bytes hash to the digest the requirement states, which is the digest the adoption row's checker binds. A veto reverts the file, so the bound disappears and the facts go Unknown; any later change to the policy is a new adoption that also changes the requirement's digest. Currency is judged at the render, the evaluation; the record carries no currency member, and `machine.json`'s `derivedStructure.currencyPolicy` names the policy the render applied.

[Inferred] The bound is `pinned-revision`: the tree of a commit is immutable, so age cannot make a fact stale; what can is a different revision, or facts the render cannot reproduce. Only `top-level-unit` version 1 is declared, so a later version of the rule, or any other rule, renders Unknown until a new adoption declares it.

## The other conditions

- Condition 3 (RFC7-28): above, "The surface".
- Condition 4 (identical relation type): no authored element is upgraded at all in this slice; the requirement says so and a scenario pins it.
- Condition 5 (states only what its rule matched): the fact kinds and their Syzygy-written words restate a path segment and a count; the scope text and the figure's note say no body, size or object id was read.
- Condition 6 (private repository): no fact uses a size or object id, for any blob of any repository, so the private rule of the declared-source policy (line 89, which withholds the object id and size of an excluded or withheld private blob) holds by construction; a scenario pins it over a denied path, an indeterminate blob, a detector-matched body and a detector-matched path. Line 89 does not itself make a withheld blob's path code-structure; naming such a path rests on the carried REQ-034 text, which lets "each withheld path the policy permits naming" be named and never names a path a secret detector matches, and the census already names denied paths to the author. A secret-matching path is counted only in `secretPathsLeftOut`.

## Reading view and evidence view

[Inferred] Derived facts are not claim blocks of the draft, so the reading-view rule for claim blocks does not reach them; they follow it anyway: an entry's visible text is the fact and "Derived by Syzygy", and its label, rule, version, path, record and revision sit in DOM text clipped by the visually-hidden class and shown by the evidence view, and in attributes. Each drawn box and arrow carries its fact's `data-derived-id`, so a test joins a solid element to its entry's rule and version mechanically. The figure's own legend ("Solid: observed") is a figure legend, as curated figures have, not the page legend.

## Residuals

- [Inferred] RFC7-28 says "embedded computed visuals inherit the map surface's obligations"; the map surface is Orrery (RFC 0009, 52 clauses). The reading taken here: the obligations that govern any scene's honesty reach this figure, and the requirement meets them — the scene names its evaluation, snapshot and as-of instant, on the surface (RFC9-38: the figure's note names the revision and `capturedAt`); its legend says only what it draws (RFC7-34, VIS-7); it is deterministic from its record; it has a text equivalent; it carries machine-readable provenance. The clauses about Orrery's spatial layout, lenses, interaction and release are read as governing the map scene, not a static two-level figure on a dossier page. That reading is not a clause-by-clause enumeration; syzygy-3efd.36 (computed map pages) must do one.
- [Inferred] No RFC2-25 tier is stated for a derived fact, as none is rendered today for a verified quotation either; a derived fact supports no status claim (nothing here is Aligned, Converged or green).
- [Inferred] Provider-mode figures carry no `data-visual-provenance`; the provider mode draws no computed visual, and its bytes are pinned.

## Implementation pointers (not normative)

- `packages/polaris-dossier/src/derive-rules.ts`: add `TOP_LEVEL_UNIT = { id: 'top-level-unit', version: 1 }` to `DERIVE_RULES`.
- `packages/polaris-dossier/src/check.ts`: in the `plan.command === 'check'` branch, build the record from the same `entries` (`deriveStructure` already holds `units` and `rootFiles`; the record wants raw segments, not `shownPath`) and write `derived/rev-<n>.json` with `wx` next to the check record; add `derived` to `RUN_LAYOUT`.
- `packages/polaris-dossier/src/render.ts`: read the record of the rendered revision, list the tree with the render's reader and compare; read the currency policy the way `readCommittedPolicy` reads the screening policy and compare its digest with the literal the requirement states; pass record, bytes and outcome to the renderer (a member of `LocalRenderInput` in `@syzygy/polaris-generation-core/live`).
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`: reserve `derived-structure.json`; draw with `renderDiagramSvg` (an `observed` element draws solid) and give each drawn `<g>` its `data-derived-id`; reuse `figureLegend` with the tally words "derived by Syzygy" in place of "as marked" (it already writes `1 box`, `1 arrow`); add `data-visual-provenance="curated"` to the operator-agent `<figure>`; add `derivedStructure` to `machine.json` (outside `reviewStatus`).
- Tests the bead asks for map onto scenarios: solid with rule and version ("Derived tree figure renders Observed"); no bound renders Unknown ("Rule without a declared currency bound renders Unknown", varying the committed policy); private fixture ("No size or object id derived for a private repository"); authored stays dashed ("Authored element stays dashed"); legend and tally ("Derived legend and tally agree with the drawing"); a refused draft ("Draft cannot set Observed"); provider bytes ("Provider mode unchanged by derived structure"); and the design-review binding ("Derived structure stable across renders").

## Review

[Observed] One fresh-reader review (CC-REV-4), `docs/reviews/syzygy-3efd-27/R-DERIVED-OBSERVED-SPEC-1-RAW.md`, verdict REVISE (line 3) over spec SHA-256 `96b603c6f1acc203f8da2e9c436a429463a3d3e4c3742cf16b30ce2144b34ea5`, twelve findings, one blocking. Dispositions:

- F1 (blocking, `capturedAt` churn defeats the design review): repaired. The record is kept per draft revision by check and published unchanged by each render, which re-derives and compares; the scenario "Derived structure stable across renders" pins byte-stability outside the region and a design review surviving a re-render.
- F2 (`dossier.json` is the closed manifest): repaired. `derivedStructure` is a member of `machine.json`, outside `reviewStatus`; every mention renamed.
- F3 (policy binding at run time): repaired. The render reads the committed policy at the Syzygy checkout's HEAD, as the screening policy is read, and applies it only at the stated digest; the "no bound" scenario varies that input.
- F4 (shown paths): repaired. `path` is the raw first segment; ordering by it; HTML-escaped on the page.
- F5 (RFC7-28 inheritance, RFC9-38): partly repaired. The note names the as-of instant (`capturedAt`, now stable) beside the revision, RFC9-38 joins the warrants, and the reading of which RFC 0009 obligations reach this figure is written above under Residuals; a clause-by-clause enumeration is left to syzygy-3efd.36, as stated.
- F6 (size report): repaired. The v4 exception (paragraph and scenario) names the record, the size report's changed measures and the `machine.json` member.
- F7 (Unknown region text and value domains): repaired. The `Not established.` sentence, its reasons and words, the record's `why` text, and the domains of `state`, `epistemic` and `unknownReason` are fixed.
- F8 (plurals): repaired. Singular forms stated for every count template.
- F9 (stale-record input): repaired. The input is the run directory's record (another revision, or altered facts) against the render's re-derivation; scenario renamed "Derived record not current renders Unknown".
- F10 (line 89 overstated): repaired in this design and in the requirement, which now says a directory whose files are all withheld on a non-secret ground is still a fact.
- F11 (per-element marking): repaired. Each drawn box and arrow carries `data-derived-id`.
- F12 (process): repaired. `tasks.md` ticks the review item only with these dispositions written.

Since D10 a review is one round and gates nothing, so no confirmation round was run; the repaired bytes (spec SHA-256 at the installing commit, bound by `scripts/check_spec_reconciliation.py`) are not themselves reviewed.
