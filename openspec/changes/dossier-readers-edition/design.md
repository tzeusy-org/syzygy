# Design: the subject first, the run's own pages behind About this run

[Inferred] Version 2.22 of REQ-polaris-generation-034, for syzygy-5dhm.136, drafted on `main` at `82290fb9` over the adopted version 2.20 text (`dossier-hero-figure`, row A-54) and checked again on `main` at `2a1ef3e8`, where version 2.21 (verify text, row A-55) changed REQ-033 alone. The renderer change it states is already on this branch (`3d4a72b0`, `41c4c155`, `f4e04733`, merged with `main` at `cb08d2d1` and `24501caa`); version 2.20's own code (schema v10, the hero) has not landed at either commit, and nothing here depends on it.

## D1. The version label

- [Observed] On `origin/main` at `2a1ef3e8` the latest version of this line is 2.21 (`polaris-dossier-verify-text-v2.21`, row A-55), which replaces REQ-033 alone; the newest text of REQ-034 is still 2.20's (`polaris-dossier-hero-figure-v2.20`, row A-54).
- [Observed] A concurrent candidate of the same requirement, `dossier-containment-figure` (syzygy-3efd.31, branch `agent/syzygy-3efd.31` at `00131423`), is composed over 2.20, labelled 2.21 on its branch, and not yet adopted; the verify text took 2.21 on `main` first.
- [Inferred] So this change takes 2.22, composed over 2.20, the newest adopted text of REQ-034. Both are MODIFIED REQ-034 over 2.20, so whichever lands second recomposes its text over the other's and renumbers its row, as 2.18 and 2.19 did (`bc3f4c04`, "adoption renumbered A-53"). The two touch different sentences: 2.21 adds a figure kind and its findings; this version moves no figure rule.

## D2. The label "About this run", and the owner's words it departs from

- [Observed] The fold exists since syzygy-pdja.13, from owner note 3 of the Redis review of 2026-11-08 (verbatim in the bead): "Meta-level run info (Understanding, discovery, clarifications, executions, review, size-report) should all go under a dedicated Review Report section that is tangential to the core point of Polaris (to understand the product itself, and not to understand how our analysis of the product was derived)". PR #791 labelled it "Review report".
- [Inferred] This version keeps what the note decides, one dedicated section holding exactly those pages, tangential to the subject, and changes its label to "About this run", the label bead syzygy-5dhm.136 names. "Review report" reads as the report of a review, and the section also holds the understanding record, the size report and the appendix, which are not reviews.
- [Inferred] The note predates D10, so it stays in force as decided, and a later change to what it decided is an agent adoption (AGENTS.md, Orientation). The label is not an owner class. The adoption row states the departure, and an owner veto reverts it.
- [Observed] The appendix is in the fold too. The note does not name it; pdja.13 put it there, and version 1.5 keeps it the last page of the reading order, which this version keeps.

## D3. Which pages are run pages

- [Observed] One definition, `scripts/dossier_page_classes.json` (`polaris-dossier-page-classes/1`), classes a page `reader`, `navigation`, `run` or `other` by its path. `run` is exactly the seven pages D2 names. The text converter, the pilot script and two tests read it; a render with a page of class `other` makes the fold test fail and the reader form count it apart.
- [Inferred] The specification names the seven pages itself rather than citing the file: the file is implementation, and the spec must stand without it.

## D4. The index third

- [Observed] Version 2.15 put the index "directly after `glossary.html`". The index and find-by-task are the two pages a reader uses to find something, so this version puts the index directly after find-by-task in the navigation, on the contents page and in the reading order. The renderer still draws the index last, since it lists every block, and moves it in the page list (`dossier-site.ts`).
- [Observed] Review finding F1(a): the predecessor's index sentence then contradicted the code. This version amends that one sentence in place.

## D5. The landing order

- [Observed] Version 2.2 places the overview figures "after the page's header ... and before its sections, the Pole map and the list of sections not generated", version 2.3 places the `derived-structure` region "after the sections, the Pole map and the list of sections not generated", and version 2.20 opens the overview region with the hero immediately after the header.
- [Inferred] This version states one order, consistent with all three: header, overview figures, Pole map, sections (after the 2.16 contents list where one renders), sections not generated, derived structure. The map of the parts now precedes the why section, so a reader sees the shape before the argument.
- [Observed] Review finding F1(b), fixed at `f4e04733`: an earlier form of the change put the Pole map before the overview figures, against version 2.2's scenario and 2.20's hero. The map now follows the figures.

## D6. The disclosure rule

- [Inferred] The bead's hard rule, "no epistemic disclosure (Unknown, withheld, screening outcome that qualifies a claim) may leave the page that makes the claim", becomes a SHALL here, with a scenario.
- [Observed] Its test is `disclosuresOffTheirPage` (`dossier-reader-edition.test.ts`): each Unknown, reasoned or withheld claim of `machine.json` occurs once on its page, its element's tag carries its label, an Unknown element holds the `[Unknown]` marking span, and the reason (or a withheld item's words) is in the element's text, not only an attribute. Its in-test mutations and the recorded mutation run show each clause fails when its disclosure moves.

## D7. Bytes that move

- [Observed] Every operator-agent page's navigation and the contents page (the fold's label and class, the index's place), `index.html`'s main content order where the draft has Poles, and the `pages` lists of `dossier.json` and `machine.json` (the index's place). The added paragraph's general exception keeps every earlier "same bytes" sentence true of everything else, as version 2.15's does for its additions.
- [Observed] No provider-mode byte moves: `dossier-render-provider-golden.test.ts` passes unchanged.
- [Observed] No claim, label, citation, quotation or disclosure changes, and no page is added or removed: the measurement's page counts are equal before and after on every run.

## D8. Evidence

[Observed] `docs/evidence/syzygy-5dhm-136/reader-edition-measurement-2026-11-23.json`, at `cb08d2d1` against `main` `82290fb9`, over every stored run with a stored draft (seven):

- links resolved: 16,846 of 16,846, before and after;
- disclosures on their page: 1,190 of 1,190 Unknown, reasoned or withheld claims, by the committed predicate;
- pages of class `other`: 0;
- on the four runs with Poles, the landing order moves from header, sections, Pole map to header, Pole map, sections;
- words: 157,312 of full text before; 128,459 on the reading path after, 28,860 under About this run. The default branch already folded these pages, so its own reading path differs by one word per run (the heading's third word).

[Unknown] Reader share before and after: no reader session has run. That is review finding F5, and the coordinator runs those sessions.

## Review

[Observed] One independent review of the implementation (dispatched by the coordinator, findings F1 to F5) preceded this delta. Its raw is held by the coordinator and is not on this branch, so [Inferred] each finding below is named as the coordinator's dispatch and the fixing commit describe it, not quoted from the raw.

| Finding | Disposition |
|---|---|
| F1(a): the index sentence of the effective text contradicts the code | This version amends it (D4). |
| F1(b): the Pole map before the overview figures | Fixed at `f4e04733` (D5). |
| F2: the fold not tied to the one page-class definition; `other` pages read silently as the subject | Fixed at `f4e04733`: `render.test.ts` reads the definition, and the reader form counts `other` pages apart (D3). |
| F3, F4: the measurement's disclosure predicate in words, not the committed one, and its commit not the final head | The record names the test file's digest, transcribes `disclosuresOffTheirPage` clause for clause, and is re-run against `main` `82290fb9` (D8). |
| F5: reader share claimed without reader sessions | Stated as Unknown (D8). |
