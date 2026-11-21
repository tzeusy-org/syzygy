# R-FIGURE-HOMES-FIT-SPEC-1 — fresh-reader review of dossier figure homes and fit 2.2
Subject SHA-256: 5844bb8b5e795ad5742e0cb30309eb9c60383eecc835d3620d081858a81616e7
Verdict: REVISE
Reviewer: fresh-context agent, 2026-11-21

Subject: `openspec/changes/dossier-figure-homes-and-fit/proposed/polaris-generation/spec.md`. I checked the digest with `sha256sum` before reviewing, and it matched. Worktree HEAD at review: `82be0d15d12718ff417b5acb84ece2a9616e2da0`. Predecessor: `openspec/changes/dossier-declared-source-model/proposed/polaris-generation/spec.md`, SHA-256 `d17dad153f030bd935059a8b0df24286d72370b275a5fb4052de901b2af4e040`, the same digest that SEMANTIC-DELTA.md states.

## A1: carry-over check, done by script

[Observed] Python script. It took each file's text from `### Requirement: Agent brief and mechanically checked draft` to the next `### Requirement:` or `## ` heading and split it into lines.

- Predecessor: 230 lines. New text: 282 lines.
- 4 predecessor lines do not appear verbatim in the new text: `- **Case:**`, `- **Observable:**`, `- **Oracle:**` and `- **Falsifier:**`. These are exactly the four lines SEMANTIC-DELTA.md declares.
- For each of the four, `new.startswith(old)` is True.
- Each `old` and `new` string in the SEMANTIC-DELTA.md JSON block is byte-equal to the predecessor line and the subject line.
- I replaced the four new Form lines with their predecessor text and tested whether the predecessor is an ordered subsequence of the new text. It is, except for the predecessor's trailing blank lines, which fall past the requirement boundary in the subject file. No predecessor line occurs fewer times in the new text than in the old.
- There are 37 added lines: two paragraphs (subject lines 40 and 42), 9 scenarios (subject lines 220–268) and the four Form lines.
- Scenario count goes from 28 to 37. The new scenarios follow "Collapsed section discloses Unknown claims", the 28th.
- The ID, Source and Scope lines and the warrants block are unchanged.
- The only non-ASCII character in the file is `†`, and the file is NFC.

A1 is met.

## Findings

### 1. revise: "exactly once on its home's page" conflicts with the renderer's existing non-rendering cases

Location: subject line 40 ("Syzygy SHALL render a v5 figure exactly once, on its home's page: a section's figure where a schema-v4 figure of that section renders"). Also the Falsifier addition ("renders twice or not at all") and the scenario "Unknown home refused".

Evidence [Observed]:
- In `apps/three-surface-poc/src/polaris-generation/dossier-site.ts` `sectionMarkup` (lines 612–619), a section in `view.deferredSections` renders only a not-generated notice, and a section whose disposition is not `produced` renders only `notice(...)`. Neither renders its figures. So "where a schema-v4 figure of that section renders" is nowhere for an omitted, unresolved or deferred section.
- When the draft layer is withheld, no section and no deep dive renders: `sections = withheld ? '' : …` and `deepDives = withheld ? [] : …`.
- A diagram whose own disposition is not `produced` renders as an `unresolved-asset` notice, with no legend or tally (line 530). A produced diagram whose SVG fails `assertInertSvg` also becomes a notice (lines 539–544).

The new text refuses a home that names a non-produced deep dive, but not a home that names a non-produced section. A v5 figure homed in an omitted section is therefore admitted, and then either renders nowhere, which breaks "exactly once" and trips the falsifier "not at all", or renders on a section that shows only a notice, which is new behaviour the text does not state. The text also says nothing about where a non-produced v5 diagram's notice goes, or about withheld or stopped runs.

Suggested fix:
- Choose one of two options for a section home:
  - refuse a home naming a section whose disposition is not `produced`, symmetrical with deep dives; or
  - state that such a figure renders nowhere, as a v4 figure of that section does.
- Say that a non-produced or non-inert v5 diagram's notice stands where its figure would, on its home's page.
- Qualify "exactly once" with: "except where this requirement or the draft-layer rules render no part of the draft (withheld layer, not-generated section)".
- Align the Falsifier's "not at all" with those exceptions.

### 2. revise: the scaling rule is keyed to "the three-column readable chain", but the stylesheet keys it to the width attribute 1048

Location: subject line 42 ("except that it lets the three-column readable chain, laid out 1048 px wide, shrink … and for that figure D = min(W, max(C, 860 px))"). Also the scenarios "Figure too wide at 390 px" ("other than the three-column readable chain") and "Scaled text below the minimum".

Evidence [Observed]:
- The rule is `.diagram-scroll svg[width="1048"]{max-width:max(100%,860px)}` (`dossier-site.ts:163`). It matches any drawing whose `width` attribute is 1048, not only a chain.
- `READABLE_SPACING` (`diagram-layout.ts:54`) gives `maxColumns: 3`, `gapX: 200`, and node width 200. So every three-column readable layout without extra lanes is 24·2 + 3·200 + 2·200 = 1048 px wide, whatever its edges. The stylesheet comment calls it "a three-column diagram".
- [Inferred] A three-column figure that is not a plain chain would be drawn at 860 px and 966 px by the browser. The spec would compute it as D = W = 1048, with T = 13 and a width failure at both viewports. That is wrong at 1440 and has the wrong numbers at 390.
- The Oracle line already reads W "from the rendered drawing's own width attribute". The text should key D on the same attribute.

Suggested fix: replace "the three-column readable chain, laid out 1048 px wide" with "a figure whose laid-out width W is exactly 1048 px (the readable layout's three-column width)". Phrase both scenarios by W = 1048 or W ≠ 1048.

### 3. revise: factual error, the operator-agent landing page holds no open questions

Location: subject line 40 ("after the title, introduction and open questions"); the scenario "Figure homed on the overview"; and design.md ("after the header (title, introduction, open questions)").

Evidence [Observed]:
- `dossier-site.ts:603–605`: "The open questions: on the overview for a provider run; for an operator-agent run, on the appendix (v1.5)". Here `unresolved = local === undefined ? openQuestionClaims(from) : ''`.
- The predecessor's own scenario says "the appendix holds the whole disclosure and the open questions" (`dossier-declared-source-model/.../spec.md:257`).
- The landing header also carries the run-stopped banner when a run stopped, which the text does not mention.

As written, the placement oracle names an anchor that never exists in the mode this applies to.

Suggested fix: "after the page's header (its title, any run-stopped banner and the introduction) and before any section, the Pole map and the not-generated list". Correct design.md to match.

### 4. revise: the Unknown fit entry has no stated shape, and "count of figures examined" is undefined

Location: subject line 42 ("A figure whose layout cannot be computed SHALL be listed with its reason as Unknown, never as fitting"; "the count of figures examined").

The text fixes the field list for a misfit entry, but not for an Unknown listing. It leaves open:
- whether there is one Unknown entry per figure or per figure and viewport;
- whether it sits in the same entry list (and so falls under "in the draft's diagram order and then the viewport order") or in a separate list;
- whether an Unknown figure counts as "examined".

"Examined" could mean produced diagrams, laid-out diagrams, or every diagram. The scenario "Fitting figure reports nothing" depends on that count. Two implementations could both satisfy the text and produce different `figureFit` bytes. That defeats the cross-revision comparison the member exists for. Member names (diagram identity, W, D, C, T, minimum, failed rules) are also left open. That is acceptable only if the record's shape is deliberately the implementer's choice, and the text should say so.

Suggested fix:
- Define examined as every diagram whose disposition is `produced`.
- State that an Unknown listing is one item per figure, in diagram order, with its reason and no W/D/T.
- State that a figure listed as Unknown is counted as examined.
- Either name the member keys or say that their spelling is the implementer's, fixed by the first implementation.
- Name the rounding rule, for example "half away from zero"; JS `toFixed` is not that for every value.

### 5. note: C at 1440 depends on the navigation panel's state, which the text does not state

Evidence [Observed]:
- `dossier-reading.browser.test.ts` asserts `.diagram-scroll` clientWidth 966 at 1440 with the navigation panel in its default, open state.
- The same test then folds the panel and asserts that `main` grows by more than 100 px and that "a long chain fits without scrolling sideways at this width once the navigation has folded".

So at 1440 a reader can see the chain at 1048 px and T = 13. The constant is right for the default state only. The measurement is also of one headless Chrome with its scrollbar behaviour.

Suggested fix: add "with the page's navigation in its default (open) state" to the definition of C.

### 6. note: reading level and topic attributes of the overview figure are unstated

[Observed] Every section on `index.html` is a `data-reading-level="1"` region with `data-topics`, and the header is level 0. The size report measures "bytes through the first reading level" of the entry page (`dossier-site.ts:779`).

[Inferred] An overview figure placed between the header and the first section belongs to neither region, unless the text says which. It changes the entry-page and first-level byte counts and any topic coverage derived per region.

Suggested fix: state the reading level of the overview figure's region and whether it carries topics. Alternatively, state that it carries none and is counted at level 0 or level 1.

### 7. note: "ahead of the deep dive's content" is under-anchored

[Observed] A deep-dive page is: eyebrow, `h1`, then the run-stopped banner, then paragraphs (`dossier-site.ts:661–666`). "Ahead of its content" could mean before the `h1`.

Suggested fix: "after its heading and any run-stopped banner, before its first paragraph".

### 8. note: the brief's issued schema version is not stated

[Observed] `draftSchemaDocument` writes the schema under `LOCAL_DRAFT_SCHEMA_VERSION` (currently v4), and the one `localDraftSchema` requires `sectionId` on every diagram for every listed version (`draft-schema.ts:157–170`). The text says the brief "SHALL state that a v5 diagram names its home". It does not say whether the brief now issues v5 as its schema version, or whether a run may still be briefed in v4.

[Inferred] The implementer has to make the schema version-conditional without changing a single schema-finding byte for a v4 draft. That includes a v4 draft that carries `home`, which today fails as an unknown member.

Suggested fix: say that the brief issues v5 and accepts v2–v5. Point out in design.md that the v4 byte-identity rule forbids changing any v4 schema finding's path or detail.

### 9. note: trap, `field-version` finding text interpolates the current version

[Observed] `check-derive.ts:148–151` computes `v4 = schemaVersion === LOCAL_DRAFT_SCHEMA_VERSION`, and its detail reads `` `${field}` needs draft schema ${LOCAL_DRAFT_SCHEMA_VERSION} ``. The Pole logic (`:406`) has the same equality.

Bumping the constant to v5, as v3→v4 did, would:
- give every v4 draft that uses `judgement` or `repeatsDiagram` a false `field-version` finding;
- change the detail text of v2/v3 findings.

Both are violations the Falsifier would catch. That is good, but design.md's "v4 compatibility is literal" should name this trap.

Suggested fix: add one line to design.md implementation pointers.

### 10. note: "naming the diagram's identity" in schema findings

[Observed] Today `schema` findings come from the generic `checkDraftShape` (`check-derive.ts:117`), with a path and a validator detail that does not name the diagram identity. The text requires the identity in the finding.

[Inferred] The generic validator would also emit its own finding for a malformed `home` (an extra member or a bad `kind`). The text does not say whether one finding or two is expected, or what to name when the diagram's `id` is itself missing.

Suggested fix: state "at least one finding naming the identity, or naming `$.diagrams[<index>]` where no identity is present".

### 11. note: "a check record without `figureFit` is read as fit Unknown" has no reader

[Observed] The only readers of `checks/rev-<n>.json` in the tree are `review-packet.ts:37` (format, revision, outcome, draft) and `polaris.ts:606` (outcome). Neither reads `figureFit`. The scenario's AND clause and the Falsifier's "a record without `figureFit` is read as every figure fitting" therefore have no observable today. The record also keeps `format: CHECK_RECORD_FORMAT` unchanged while gaining a member, and the text does not say whether that format string changes.

Suggested fix: either name the reader (for example the check report's summary or a later comparison), or turn the clause into a prohibition on any future reader. State whether `CHECK_RECORD_FORMAT` stays the same.

### 12. note: inventory-check shares the record writer

[Observed] `checkSubject` writes both `checks/rev-N.json` and `inventory/checks/rev-N.json` (`check.ts`, `inventory.ts:35`). The text names `syzygy dossier check` and `checks/rev-<n>.json`, which excludes the inventory record by implication.

Suggested fix: add "and no other check record" so the exclusion is explicit.

## A3: numbers against code and arithmetic

[Observed]

| Number | Source | Agrees |
|---|---|---|
| 966 / 261 | `dossier-reading.browser.test.ts` asserts `.diagram-scroll` clientWidth `width === 390 ? 261 : 966`; `WIDE_COLUMN = 966` and `STACK_COLUMN = 261` in `diagram-layout.test.ts:9–10`; `STACK_COLUMN = 261` also in `diagram-layout.ts:197` | yes |
| 1048 | Readable chain layout `[1048, 280]` (`diagram-layout.test.ts:75`) and 48 + 600 + 400 | yes, but it is every three-column layout (finding 2) |
| 860 | `max-width:max(100%,860px)` (`dossier-site.ts:163`); the browser test expects 860 at 390 | yes |
| 13 px / 12 px | `svg text{font:13px …}` and `svg text.note{font-size:12px}` (`draft-preview.ts:19`); the note is "No relationship supplied" (`diagram-layout.ts:468`) | yes |
| D at 390 | min(1048, max(261, 860)) = 860 | yes |
| D at 1440 | min(1048, max(966, 860)) = 966 | yes |
| 10.67 | 13 × 860 / 1048 = 10.6679… | yes |
| 11.98 | 13 × 966 / 1048 = 11.9828… | yes, and ≥ 11 so no entry |
| 11 px | a policy choice, stated once | n/a |

The scaling is proportional because the SVG carries `viewBox="0 0 W H"` with `width="W"` (`diagram-layout.ts:505`) and `height:auto`. The 1048 rule sits in `DOSSIER_THEME_CSS`, emitted only when `chrome` is defined, that is on operator-agent pages, as design.md says.

Falsifiability (CC-SPEC-4): every new scenario has a producible case, an observable (the page and its position, or the `figureFit` bytes) and an oracle outside check's code. The exceptions are the "read as Unknown" clause (finding 11) and the shape gaps in finding 4. The fit oracle reads W from the rendered `width` attribute, which comes from the same `layoutDiagram` the check would use. [Inferred] That is acceptable, because the requirement under test is the arithmetic and the stored member, not the layout. The column and drawn widths are confirmed in a browser.

## A4: factual claims in spec, SEMANTIC-DELTA.md, design.md and proposal.md

[Observed] Accurate:
- `sectionId` is required on diagrams (`draft-schema.ts:165`).
- The renderer places figures only in `sectionMarkup` (`dossier-site.ts:614`).
- `LOCAL_DRAFT_SCHEMA_VERSIONS` lists v2, v3 and v4 (`:30`).
- An unknown diagram `sectionId` yields `unresolved-reference` (`check-derive.ts:360`).
- The other advice members are on the report only (`check.ts:91–93`).
- The record is written once per revision with `wx` after the frozen draft (`check.ts:239, 265`).
- The report spreads the record (`check.ts:277`).
- A record is still written for an unparseable draft (a `not-json` finding), consistent with "for a draft that does not parse".
- `.diagram-scroll{overflow:auto}` and `svg{display:block;max-width:none;height:auto}` (`draft-preview.ts:19`).
- The 10.7 px floor is stated in the stylesheet comment (`dossier-site.ts:161`).

Inaccurate: "open questions" on the landing page (finding 3). Incomplete: "the three-column readable chain" as the only scaled figure (finding 2). The design's [Unknown] on equal box widths across pages is honestly labelled.

## A5: interactions

- Poles: the overview figure is placed before the why section and the Pole map, and section figures follow their section onto Pole pages unchanged. [Inferred] There is no conflict, apart from finding 3's anchor text.
- Withheld or stopped runs, and non-produced sections or diagrams: finding 1.
- `repeatsDiagram`: the v5 reading is stated, and keeps the v4 deep-dive-to-section case. [Inferred] It silently decides that no list can repeat an overview figure (no list renders on the landing header), and that a section list cannot repeat a figure homed in one of its section's deep dives. That is reasonable, but it is unstated.
- Deep dives that do not render: refused as `unresolved-reference`, consistent with `deepDives = …filter(produced)`.
- Drafts that do not parse: no `figureFit`, stated.
- Finding 6 (reading level) and finding 8 (brief version) are silent decisions left to the implementer.

## A2: restatement in my own words

Schema v5:
- A v5 draft is a v4 draft, except that each diagram has `home` instead of `sectionId`.
- `home` is an object with exactly the members its kind needs:
  - `{kind:"section", id}`;
  - `{kind:"deep-dive", id}`;
  - `{kind:"overview"}` with no `id`.
- `schema` finding, located at or under `$.diagrams[i]` and naming the diagram id, when any of these holds:
  - `home` is missing;
  - `home` is not an object;
  - `kind` is not one of the three;
  - `id` is missing for section or deep-dive;
  - `id` is present for overview;
  - `home` has any extra member;
  - `sectionId` sits beside `home`.
- `unresolved-reference` finding, at the same location, when `id` names no section, no deep dive, or a deep dive whose disposition is not `produced`.
- Every v4 rule applies to v5. For section-scoped rules, a section-homed diagram is in that section, and deep-dive-homed or overview-homed diagrams are in no section.
- `repeatsDiagram` in a section list is valid when the diagram is homed in that section. In a deep-dive list it is valid when the diagram is homed in that deep dive or in the deep dive's section.

Rendering:
- A section-homed figure goes where v4 puts it: leading its section, on the landing page or its Pole page.
- A deep-dive-homed figure leads that deep dive's page.
- An overview-homed figure goes on `index.html` after the header and before any section, the Pole map and anything after them.
- Each figure appears once, with the full figure markup (caption, relationship line, inert SVG, legend, tally, component list, Mermaid source), and its nodes and edges appear once in the machine form.
- Figure boxes are the same width on every page.
- v2–v4 drafts give identical findings and page bytes to the prior version.
- The brief names `home` and its three kinds.

Fit:
- For every parsable draft, for each produced diagram, at viewport 1440 (C = 966) and 390 (C = 261):
  - W = the SVG width from the readable layout;
  - D = W, except when W = 1048, where D = min(W, max(C, 860));
  - T = 13·D/W.
- Misfit when D > C (width rule) or T < 11 (text rule, unrounded).
- One entry per misfit figure and viewport, with id, viewport, W, D, C, T (rounded to 2 dp), the minimum 11 and the failed rule(s). There is no entry for a fit. An uncomputable layout is listed as Unknown.
- Order: diagram order, then 1440 before 390.
- The member holds the constants, the count examined and the entries. It is written into `checks/rev-<n>.json` as `figureFit` and is also on the report. It depends only on the draft bytes and constants, gates nothing, and is not a finding.
- No member means fit is Unknown.

Is the restatement forced by the text?
- The home shape, the findings and the fit arithmetic are forced.
- Three points are not:
  - I keyed the scaling on W = 1048 where the text says "the chain" (finding 2);
  - "after the header" is my repair of an anchor that does not exist (finding 3);
  - "the count examined" and the Unknown listing's shape are my choices (finding 4).
- The handling of non-produced section homes, withheld runs and non-produced diagrams cannot be restated from the text at all (finding 1).
