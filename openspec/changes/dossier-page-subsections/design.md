# Design: answer-led subsections, subheadings and an on-page contents list

[Inferred] Version 2.15 of REQ-polaris-generation-034, for syzygy-3efd.50. Line references are to the base of this branch, `agent/syzygy-3efd.26` at `8c311e17`; the version-2.14 code it names is the code on `main` that 2.14's package describes.

## D1. The version label, and which requirement owns the schema

[Observed] The draft schema, its versions and every finding about a draft's members are stated in REQ-polaris-generation-034 ("A draft in schema `polaris-dossier-local-draft-v7` is a schema-v6 draft in every respect but one ..."); REQ-035 owns the fidelity review and REQ-019 the generic identity rule, neither of which names a schema version. So this is a REQ-034 version, as the lead's brief assumed. It is numbered 2.15 over 2.14 (`dossier-infrastructure-recognizers`), which is the predecessor whose complete text it carries. [Inferred] If 2.14 is not adopted first, this package composes on whatever REQ-034 text is effective only after it is rebuilt on that text; the checker refuses it otherwise (its prior check names 2.14).

## D2. Schema v8, not an optional member of v7

[Observed] Version 2.12 added `inventoryOmissions` to v5 and later without a version, because it is never rendered and claims nothing. Subsections are rendered claims, and a v7 reader that met one would report a `schema` finding. [Inferred] A new version keeps every stored v7 draft's findings exact and lets an earlier draft carrying the member get the `field-version` finding the pattern of versions 2.2, 2.4 and 2.5 gives, in place of the `schema` finding at the same path.

## D3. The subsection record

- [Inferred] `{id, title, answer, paragraphs}`. `answer` is a paragraph-form claim (the introduction's form), never an element, so it is one sentence of text with its own label and citations and can be withheld, reviewed and counted exactly as any block is. An Unknown answer is allowed: an honest "not established" is a valid answer. A non-normative answer is not (it would open the subsection with no claim) and is a `subsection-answer` finding.
- [Inferred] The section's own `paragraphs` stay required (one to thirty). Making them optional when subsections exist needs a conditional schema; the closed-schema module states none today, and a lead paragraph is what a reader wants before the questions anyway.
- [Inferred] Two to twelve subsections: one subsection would only repeat its section's heading, and more than twelve questions in one section is a section to split. A subsection's `paragraphs` may be empty, so a question whose answer needs no support is one sentence.
- [Inferred] A subsection has no `disposition`: whether it renders follows its section. Adding one would add a third notice path for little gain.
- [Inferred] No figure is homed in a subsection and a deep dive carries none, to keep `home`, the figure-fit pages and the reading ledger's units as they are. Both are named as non-goals so a later slice can add them deliberately.

## D4. The one-sentence rule is mechanical, and why it is a repair finding

[Inferred] The outcome says "a one-sentence answer"; an advisory would let a paragraph pass as an answer. The rule (`one-sentence-answer` version 1) is a plain scan: drop the inside of each straight-double-quoted pair, trim, require a final terminator (or a closing quote), and refuse any terminator that white space follows. It names its code points (terminators U+002E, U+003F, U+0021; closers U+0029, U+005D, U+0027, U+2019; white space as the RS-19 word split, ECMAScript `\s` with `u`), so two implementations agree, and a terminator inside a closer still ends a sentence (`(on start.) It never writes.`). It has known false positives (`e.g. `, `i.e. `, an ellipsis before a word, an apostrophe-closed word such as `the users' list.` mid-text); the brief tells the author to write `for example`, and a false positive costs one rewording, never a wrong render. It reads the text alone, so it is deterministic and needs no language model. Curly quotes are not pairs for this rule; a quotation in the brief's required form always uses straight quotes.

## D5. Rendering

- [Inferred] `<section class="subsection" id="subsection-<id>">` with an `<h3>`, after the section's own paragraphs (in the operator-agent mode, after the figures and paragraphs as today) and before the deep-dive links, so the section's lead stays first and its "Explore" links stay last.
- [Inferred] The fragment prefix `subsection-` is new; every id in a draft is unique, so `subsection-<id>` cannot collide with another subsection. [Observed] No id the site emits today begins `subsection-`: `grep -F 'subsection-'` over `apps/three-surface-poc/src/polaris-generation/*.ts` and `packages/polaris-dossier/src/*.ts` (non-test) finds nothing (review finding 9 listed further prefixes, among them `diagram-title-`, `element-` and `term-`; none begins so).
- [Inferred] The on-page contents list is a `<nav>` with `aria-label="On this page"` and a `<p>` title, not a heading, so a page's outline stays `h1` page, `h2` section, `h3` subsection. On the landing page it goes immediately before the first section the page renders, after the header and any overview figures; on a Pole page, immediately after the Pole's heading and any stopped-run banner, so a why section's back-link (a paragraph, not a section) never comes before it and has no item. It lists every section on the page, so it is a page map, with each section's subsections nested. It is never sticky (the repository's guardrail scopes sticky styling to `.site-nav`) and needs no script.
- [Inferred] A title over only withheld claims reads `Withheld item`, as a Pole label or an element label does (version 1.5's rule), in the heading and in the list.
- [Inferred] No `data-reading-level` on the new elements: reading depths are syzygy-3efd.51, which will decide whether an answer is level 0.

## D6. Counting

[Inferred] The reading ledger and RS-19 count a subsection's answer and plain blocks in its section's own prose. Counting each subsection against RS-19's per-section limit would change the meaning of an adopted reader standard; this version leaves that standard's text alone and keeps one count per section. Coverage (version 2.12) and the fidelity packet already walk everything under `sections`, so subsections are covered and reviewed with no new rule.

## D7. Rendered bytes that move

[Inferred] Only pages of a schema-v8 draft that carries at least one subsection, and only where it renders one:

- the page that renders a section with subsections: the section's markup (its subsections), the contents list before its first section, and the subsection style rules in its `<style>` element;
- `machine.json`: the subsections' claims, as claims of their section, in draft order;
- `dossier.json`, the fidelity and design packets and the size report, by the bytes those changes add.

[Inferred] No byte moves for a draft of schema v7 or earlier (its pages, `machine.json` and every record check writes, the reading ledger among them), a schema-v8 draft without subsections, any page that renders no subsection, or the provider mode. The provider golden (`apps/three-surface-poc/src/polaris-generation/dossier-render-provider-golden.test.ts`) must pass unchanged; no provider draft can carry `subsections`, because the provider stages' closed schema, the `draft` object in `packages/polaris-generation-core/src/draft-model.ts` (imported by `provider-draft.ts`), gains no such member.

## D8. What the code change must do

- `packages/polaris-dossier/src/draft-schema.ts`: `LOCAL_DRAFT_SCHEMA_VERSION_V7` named, `LOCAL_DRAFT_SCHEMA_VERSION` becomes `polaris-dossier-local-draft-v8`, appended to `LOCAL_DRAFT_SCHEMA_VERSIONS`; a version predicate for the figure-kind form (v7 and v8) and one for subsections (v8); `subsections` on a section only in the v8 form.
- Every equality test on `LOCAL_DRAFT_SCHEMA_VERSION` that means "has figure kinds" becomes that predicate, or a v8 draft loses its sequences and swimlanes: `figure-fit.ts:91`, `check-derive.ts:440` and `:503`, `render.ts:644`, `review-reach.ts:154`; and so does every site that names v7 by literal or by the moving constant (review finding 2): `hasThesisBasisForm` (`draft-schema.ts:47`, or every stored v7 draft loses its thesis basis), `HOME_SCHEMAS` (`reading-ledger.ts:52`), the literal in `reader-advice.ts:185`, and `brief.ts:274`'s type.
- The `field-version` detail strings at `check-derive.ts:444` and `:446` interpolate `LOCAL_DRAFT_SCHEMA_VERSION`; they must name `LOCAL_DRAFT_SCHEMA_VERSION_V7`, or every stored v6-or-earlier draft carrying a figure-kind member changes its findings' bytes. The new `field-version` finding for `subsections` names v8.
- `check-derive.ts`: for a schema-v8 draft only, `collectBlocks` walks each subsection's `answer` and `paragraphs` after the section's own paragraphs and `elementLabels` takes each subsection's title, so a v7 draft carrying `subsections` gets the one `field-version` finding and nothing else new; the `subsection-answer` finding (non-normative answer, or rule `one-sentence-answer`); the `field-version` finding in place of the `schema` finding. Identities need nothing new: the identity walk already visits every object of the draft.
- `reader-advice.ts:154` and `reading-ledger.ts:55`: a v8 section's words take in its subsections'; a v7 draft's count is unchanged.
- `render.ts`: the section model gains `subsections` (title through `containerTitle`'s withheld rule, answer through `paragraph`, paragraphs through `tree`), set only when a v8 draft carries them; the section's own `containerTitle` takes in its subsections' claims, so a section whose every claim, subsections included, is withheld reads `Withheld item` as before. In `packages/polaris-generation-core/src/draft-model.ts` only the `DossierDraft` TypeScript interface gains the optional member (walked in `draftHandles`); the closed `draft` schema the provider stages use is unchanged, with a test that it refuses `subsections`.
- `dossier-site.ts`: `sectionMarkup` renders subsections; the landing and Pole pages render the contents list; `SUBSECTION_CSS` rides through `page()` like `FIGURE_KINDS_CSS`, only on a page that renders a subsection.
- `brief.ts`: `BRIEF_VERSION` `polaris-dossier-brief-v13` and the one paragraph; the schema's digest moves with it.
- Tests: schema tests for v8 and the earlier-schema `field-version`; a byte comparison of every stored v2-to-v7 fixture's check record, not only its render; the one-sentence rule's literal cases (each scenario's text, the abbreviation, an ellipsis, a terminator inside a parenthesis, a closed quotation with and without a terminator, an unpaired quote, a non-normative answer); render tests with literal ids for headings, the contents list and fragment targets; a v7-versus-v8-without-subsections byte comparison; every stored fixture draft re-rendered byte-identical; the provider golden unchanged; a mutation run recorded under rule 6.

## D9. Not changed, and why

[Inferred] `contents.html` keeps listing sections and deep dives only: subsections are reached from their page. The glossary, source pages, maps, appendix and size report are unchanged in form. Deep dives keep their form (D3).

## D10. Residuals

- [Inferred] The one-sentence rule cannot tell an abbreviation from a sentence end; the brief's wording is the mitigation.
- [Inferred] Whether an answer truly answers its title's question is the fidelity and rendered-design reviews' judgement, never a mechanical check.
- [Unknown] Whether authoring sessions will use subsections without a reader advisory asking for them; the next pursuit run measures it.
- [Inferred] Counter-incentive (review finding 10): RS-19's about-300-word limit counts a section's subsections with it, so a section using subsections will often draw the advisory that tells the author to move prose out of the structure this version asks for. Left for the depth slice (syzygy-3efd.51) or the next pursuit to measure and decide; RS-19's text is not changed here.

## Review

[Observed] One fresh-context review, `docs/reviews/syzygy-3efd-50/R-PAGE-SUBSECTIONS-SPEC-1-RAW.md`, over the spec at sha256 `428f3c6f75cb42bd1ca8c01e3591fd15db9fdf346f3bf793247fec3c501b161c`: "Verdict: REVISE" (line 3), eleven findings, one blocking. Every finding is repaired below; the repaired spec is sha256 `521e039cf6deabce5893c502e0850678b949346c8dffccbd39c512f77c088f83`, rebuilt from the 2.14 bytes by the same anchored script, and `SEMANTIC-DELTA.md` is regenerated from the bytes. One round (D10): no confirmation round follows.

| # | Severity | Disposition |
|---|---|---|
| 1 | Blocking | Repaired: the reading-ledger and RS-19 amendment now reads "in a schema-v8 draft only"; the Falsifier adds a v7 draft carrying `subsections` whose ledger, reader advice or other findings differ from 2.14's; D7 and D8 say so. |
| 2 | Non-blocking | Repaired in D8: `hasThesisBasisForm`, `HOME_SCHEMAS`, the `reader-advice.ts` literal and `brief.ts`'s type added; the `field-version` detail strings pinned to v7; `containerTitle` takes in subsection claims; `collectBlocks` and `elementLabels` walk subsections for v8 only; the identity walk needs nothing; a byte comparison of every stored fixture's check record added to the tests. |
| 3 | Non-blocking | Repaired in D7 and D8: the provider stages' closed schema is the `draft` object in `draft-model.ts`; only the TypeScript interface gains the member, with a test that the closed schema refuses it. |
| 4 | Non-blocking | Repaired in the spec: terminators, closers, the quote and white space are named by code point and class; a terminator followed by closers and white space ends a sentence; a text ending in a closed quotation is stated as one sentence. A scenario case (`(on start.) It never writes.`) and D4's residuals added. |
| 5 | Non-blocking | Repaired: an answer is Inferred or Unknown, never non-normative, and a non-normative answer is a `subsection-answer` finding (spec, scenario, Falsifier, D3); the brief now says the answer takes the members its form requires. |
| 6 | Non-blocking | Repaired: on a Pole page the list goes immediately after the Pole's heading and any stopped-run banner, and the why section's back-link has no item (spec and D5 agree). |
| 7 | Non-blocking | Repaired: the Oracle takes, for a v8 draft without subsections, the 2.14 render of the same draft with `schemaVersion` set to v7. |
| 8 | Non-blocking | Repaired: the scenario splits the cases, a `schema` finding for 121 code points and a `label-markup` finding for a backtick, each at the title; the Observable names both kinds. |
| 9 | Non-blocking | Repaired: "version 2.2" for a homed figure's place; the brief-version list reads "from version 2.4 as v11, from version 2.5 as v12 and from version 2.15 as v13" and "brief v11 issues schema v6, brief v12 issues schema v7 and brief v13 issues schema v8"; D5 states the predicate with its sweep. |
| 10 | Non-blocking | Repaired in D10 as a named residual for syzygy-3efd.51 or the next pursuit; no spec change. |
| 11 | Non-blocking | Repaired: the review task is ticked only now that the raw is retained and every finding is dispositioned here. |
