# Design: generated index and task routes

One MODIFIED REQ-polaris-generation-034, version 2.14, for beads syzygy-5dhm.70 (the generated index) and syzygy-5dhm.71 (task routes), R15 slices 1 and 2. It composes after coverage pre-check version 2.12 (row A-40). The implementation lands in the same commit as this package.

## Why no schema version moves, and why the brief's does

[Observed] The code this package lands on issues draft schema `polaris-dossier-local-draft-v7` and brief `polaris-dossier-brief-v12` (`packages/polaris-dossier/src/draft-schema.ts`, `LOCAL_DRAFT_SCHEMA_VERSION`; `brief.ts`, `BRIEF_VERSION`), the versions 2.4 and 2.5 name.

[Inferred] `taskRoutes` is optional and additive, so no schema version moves: the member is admitted in schema v5 and in every later version, and refused with `field-version` in v4 or earlier, as `home` (2.2) and `thesisBasis` (2.4) are. A stored v5, v6 or v7 draft without the member validates exactly as before, and a v7 draft written under brief v12 is still a valid v7 draft. Alternative considered: a required member in a new schema v8 (rejected: it would make the newest schema refuse every draft that cannot route eight tasks, where the honest outcome is a page saying the run has none).

[Inferred] The brief does change, so its version must: `polaris-dossier-brief-v13` is brief v12 with one added section, its version line and the schema digest of its draft-schema line. The first draft of this package, written when the code still issued brief v10 with versions 2.4 and 2.5 adopted and unlanded, used a suffix (`+routes1`) to avoid taking a number those versions had reserved; both have landed, so the plain next number is free and the suffix is gone.

## A route step is a claim block, and nothing else

[Inferred] Bead syzygy-5dhm.71 asks that routes be "checked exactly like any cited block; a route with an unverifiable citation is refused". The design makes that true by construction instead of by a parallel checker: a step is collected with every other claim block (`check-derive.ts`, `collectBlocks`), so the path, range and quotation checks, the withheld-item rule, review reach, the fidelity verdict's per-block row and the `machine.json` claim entry all apply with no new code path, and a future change to any of those rules reaches route steps too.

[Inferred] A step has exactly one form, Inferred on a source basis with at least one citation. An Unknown or non-normative step would be a step that names no file and lines, which is the one thing a step is for; an execution-based step would say "I ran it", not "read or change this". A task the author cannot route is left out, and a draft that cannot route eight omits the member, so the page says the run has none: fewer, honest routes over padded ones. Bounds: 8 to 15 routes (the bead's range), 1 to 8 steps (a route longer than eight steps is a walkthrough, which is a later slice).

[Inferred] `see` links a step to what exists today, a section or a deep dive. The bead says link targets from walks or reading depth do not exist yet; none is named. Its key is `target`, never `id`, because every `id` key in a draft is an identity that must be unique (the 2.2 rule for a diagram home).

[Inferred] Syzygy writes no route. For a stored draft without the member the page renders one sentence saying so; fabricating routes from headings or file names would be an unlabelled claim by the renderer (VIS-2).

## The index is a join, not a claim

[Inferred] Bead syzygy-5dhm.70 lists five kinds: glossary term, unit, notable path, identifier, figure title. Each is defined by where the render already holds it, so the index needs no model call and adds no text:

- term: the rendered glossary's entries (which already exclude a term drawn from a withheld item);
- unit: the top-level directories of the derived structure of version 2.3, Syzygy's own Observed facts, where established at this render;
- path: "notable" is made mechanical as "has a source page and some block cites or writes it"; a file no block touches is on the sources list, not here;
- identifier: the backticked spans the brief already tells the author to use for commands, identifiers, file names and keys, with small bounds (no white space, 2 to 80 code points, a letter) that drop prose-like spans and bare numbers;
- figure: every figure drawn from the draft by its title, a sequence and a swimlane of schema v7 among them; a computed map page's figure (version 2.9) is Syzygy's, not the draft's, and is not listed.

[Inferred] Matching is literal and stated: whole words for terms (any case, optional plural "s", hyphen or space), exact case for identifiers and figure titles, whole paths for files. No stemming: a missed plural is a visible, explainable miss, while a fuzzy match is an unexplainable hit. A name no block names is still listed ("named by no block"), which keeps the acceptance criterion "every glossary term and unit is in the index" true even for a term the prose never uses, and the page says in its own words that such a line says nothing about the project.

[Inferred] Screening: every name is text the same render shows on another page, so it passed that page's screening (a glossary title through the label screen, a path through the path screen and the class gate, an identifier inside a block's screened prose). A withheld item contributes nothing, because its agent text is not shown anywhere; while the draft layer is Unknown no agent name is listed. No screening rule is added, changed or bypassed (SEC-5).

## Fragment targets

[Inferred] "Each linking to every block that names it" needs a block to be a link target. Each claim block of the argument gets `id="block-<identity>"`, last on its element so existing attribute prefixes that tests and the parity sweep read are unchanged. The existing rule (version 1.3) that no fragment target sits inside a collapsible section is kept: a block inside one gets no `id` and is reached through the collapsible element's own `id`, which is outside the collapsed part (the keyboard-stranding lesson in AGENTS.md). Draft identities are unique across the draft, and the three prefixes (`block-`, `figure-`, `route-`) differ from the existing ones (`section-`, `element-`, `term-`), so no page gains a duplicate `id`.

[Inferred] This changes bytes on every operator-agent page (an attribute per block and per figure, two navigation links, two contents entries). The predecessor's byte-identity sentences for earlier-schema drafts are therefore each qualified in place, the same way version 2.3 qualified them for the derived region. The provider mode draws none of it, and its golden (`dossier-render-provider-golden.test.ts`) is unchanged.

## Placement

[Inferred] Find by task is second in the reading order and second in the navigation: a reader who arrives with a task sees it before the first Pole. The index sits beside the glossary, the other lookup page. Neither is a page of the reading ledger (version 2.4): the ledger measures the reading path, and both are lookup pages; a route step is a claim but not prose of a section or deep dive.

## Names fixed

Draft member `taskRoutes[] {id, task, steps[] {id, label, basis, text, citations, quotations, see? {kind, target}}}`; brief `polaris-dossier-brief-v13` and its section `## Task routes`; pages `find-by-task.html` and `name-index.html`; HTML `find-by-task`, `route-<id>`, `task-route`, `data-task-route`, `data-task-route-count`, `route-steps`, `route-where`, `route-see`, `no-routes`, `data-task-routes`; `name-index`, `index-<kind>`, `data-index-kind`, `data-index-count`, `data-index-entries`, `data-index-links`, `data-index-name`; identities `block-<id>`, `figure-<id>`; kinds `term`, `unit`, `path`, `identifier`, `figure`; `machine.json` members `taskRoutes` and `nameIndex`. No key is named `source`, `evidence`, `provenance`, `anchor` or `cites` (the PWB-REQ-014 sweep).

## Not changed, and why

[Inferred] The draft schema version; every labelling, citation, quotation, withheld-item and review rule; secret screening and the screening policy; the glossary, source pages and derived structure; figure fit, the reading ledger, shape packs, thesis basis, figure kinds, manifest facts, the computed maps and the record bounds; the readability guidance; the provider mode. The rendered-design review reads the pages a render draws, so it reads these two with the rest.

## Implementation pointers (not normative)

- `draft-schema.ts`: `TASK_ROUTE_*` constants, `$defs` `routeStep` and `taskRoute`, the optional root member; `check-derive.ts`: `routeSteps`, the `field-version` and `see` findings, steps in `collectBlocks`, the task among `elementLabels`.
- `brief.ts`: `BRIEF_VERSION`, `TASK_ROUTES_RULE`; `render.ts`: `taskRoutes` in the local render input (`local-render.ts`, `LocalTaskRoute`).
- `dossier-finding.ts`: `buildNameIndex` and `renderNameIndex`, pure; `dossier-site.ts`: the block registry, the identities, the two pages, the navigation, `machine.json`.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-5dhm-70/R-INDEX-TASK-ROUTES-SPEC-1-RAW.md`, verdict `REVISE` (its line 3), bound to the first draft of the spec (then numbered 2.6, over version 2.5), SHA-256 `20266e9a8748b1cbf38a8685348f47b1bae8b55cd3a9833dad1dc49421aad5c2`. It raised eleven findings, two blocking. All were repaired in the spec, the code or this package before the install commit; none was overruled, and no confirmation round was run (one non-gating review under D10). The review covers neither the repairs nor the rebuild described below; the bytes `scripts/check_spec_reconciliation.py` binds (`FINDPAGES_SUBJECTS`) are the rebuilt ones.

- F1 (blocking; the two pages' style rules were carried by every operator-agent page). Repaired in code: `page` in `dossier-site.ts` carries them on `find-by-task.html` and `name-index.html` only. The spec now states that rule, the Falsifier names it, and `dossier-finding.test.ts` pins the two pages by name.
- F2 (blocking; "a path a secret detector matches is never a name" was not delivered by the identifier rule). [Observed] `screen.ts` runs one detector set over paths and over agent text (`screenPath` and `screenBody` both call `detectSecrets` with the same detectors), so a block whose text writes such a path is already a withheld item and names nothing; the spec now says so. The identifier rule also excludes such a span in its own words, and the code does (`unindexedNames` from `render.ts`, `unindexed` in `buildNameIndex`), so the guarantee does not rest on that coincidence. Tests: a unit case, and a whole-chain case in which a shown step writes the path in backticks and neither it nor the name beside it is indexed.
- F3 (directories and files were ordered by code unit). Repaired in code: every kind is ordered by the shown name without regard to case; the test has mixed-case directories and files. The spec adds "as the name is shown" and the order of equal names.
- F4 (same-words links not numbered across a figure's entry; a repeating list inside a collapsible section not listed). Repaired in code and stated: numbering runs over the whole entry, and such a list is named by that section's place.
- F5 (a file admitted as several source pieces). Stated and repaired: a step links the file once, at its first cited piece, with each piece's lines; the index's home is the first piece in source order.
- F6 (a withheld step drew its dossier link). Repaired in code and stated: no file and no dossier link; the whole-chain test asserts it.
- F7 (the "only changes" sentences were overbroad for a draft with routes). Repaired in the preamble, the fragment-identity paragraph and the Falsifier: they hold for a draft without `taskRoutes`, and route steps are counted wherever claims are counted.
- F8 (the `field-version` detail and gate hung on the latest-schema constant). Repaired in code: the detail is the literal the spec states, and the finding is raised for schemas v2, v3 and v4 by name, so raising the latest schema to v6 or v7 does not refuse `taskRoutes` in v5.
- F9 (markup the Oracle called literal was partly unstated). The spec now states the heading levels, the task list's markup, the index link's place in the navigation, the index's note paragraph, the five empty-kind sentences, the order of equal names, and that every section is drawn on exactly one page; the Oracle is narrowed to what the requirement states.
- F10 (`tasks.md` ticked a review and a mutation record that did not exist; no Review section here). The raw and this section are in the install commit. The mutation record is in the commit after the install commit, because it names the commit it ran at; its totals and its survivors are stated in the record, not here.
- F11 (one carried byte sentence unqualified). Qualified in place (the figure-kinds style-rules sentence in the semantic delta's change list).

## Rebuilt on the moved default branch

[Observed] Between the review and this package's landing the default branch adopted versions 2.6 (REQ-046) and 2.7 to 2.12 of REQ-034 and landed the implementations of 2.4 to 2.10. The MODIFIED requirement was therefore rebuilt by the same anchored script from the version 2.12 bytes (`SEMANTIC-DELTA.md` gives that file's digest), and a script check found every predecessor line either verbatim in the new text, rewritten by a listed in-line change, or a Form line kept as a prefix, with none lost. What differs from the reviewed and repaired 2.6 text, beyond the version numbers:

- the brief is `polaris-dossier-brief-v13`, stated as brief v12 with three differences, where the reviewed text appended `+routes1` to whichever brief was issued;
- one sentence after the fragment identities excepts this version's additions wherever the requirement states that a render, brief or schema equals an earlier version's (the form version 2.9 uses for the computed maps), because versions 2.7 to 2.12 added byte-identity sentences of their own;
- the "Schema-v4 draft unchanged" scenario's exception list is extended after the 2.9 and 2.11 additions it now carries;
- both pages are stated to be in `machine.json`'s `pages` list, which version 2.11 names;
- a sequence or swimlane figure carries its fragment identity and is indexed by its title, and a computed map's figure is stated not to be.
- the inventory-coverage rule that version 2.12 added becomes `overlap-or-path-named` version 2: the citations under `taskRoutes` are reading content and a route step is one of the claim blocks whose text is searched, because a step is shown to the reader and reviewed as any block is, so an inventory entry a route answers is not listed as uncovered. For a draft without `taskRoutes` versions 1 and 2 decide alike. The rule's version moves because the same draft and inventory could otherwise be decided two ways under one version (`inventory-coverage.ts`, `COVERAGE_RULE`).

[Observed] This change is numbered 2.14 although its requirement's predecessor is version 2.12: version 2.13 (declared-source re-admission) was adopted in between and replaces REQ-polaris-generation-046 alone, so the REQ-034 text this change rebuilds is still the version 2.12 text, byte for byte.

[Inferred] These are consequences of the predecessor moving, not new design; under D13 the one review is not repeated for them, and the independent code review of the landing branch reads the rebuilt text.

## Measured on stored drafts

[Observed] No stored draft carries `taskRoutes`. The stored drafts measured for this change were re-rendered into a scratch directory from their stored drafts, never into a run directory; the figures are in `docs/evidence/syzygy-5dhm-70/index-and-task-routes-measurement-2026-11-22.json`, which lands in the commit after the install commit because it names the commit it measured.

## Corrections after the code review

[Observed] An independent code review of the first pushed head found the code and this text apart in five places; each is repaired in the install commit, with a test.

- A block whose own text a secret detector matches was indexed, and as a route step drew its file and its dossier link, although the requirement makes it a withheld item. The render now marks such a block (`secretMatched`), and the index and the find-by-task page honour the mark.
- The index listed every top-level directory of a derived structure whatever its fact's marking. It lists the Observed ones, and the requirement says so.
- Backticked spans were paired over a block's whole text when screened and inside each run of text when indexed. One reader (`backtickSpans`) now serves both, and the requirement states the rule.
- The index carried noise: an assignment such as a build flag, a few very common words, and one link per place for a file nearly every block cites. The requirement now leaves out a span holding "=", leaves out 24 listed lower-case words, and lists a file more than 24 places name once, with a count and its source page.
- One route was announced as "1 tasks".
