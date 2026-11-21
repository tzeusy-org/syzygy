# Design: figure homes and figure fit

## Figure homes (schema v5)

[Inferred] One `home` member with a `kind` makes two homes unrepresentable rather than merely refused: a draft carrying both `home` and `sectionId` is a schema finding, and no shape of `home` can name a section and a deep dive at once. `kind: "overview"` takes no `target` because there is one overview. The key is `target`, never `id`: the draft check treats every `id` key anywhere in a draft as an identity that must be unique (`check-derive.ts`, "Identities, across the whole subject"), so a home `{"kind": "section", "id": "core-ideas"}` would collide with the section's own identity as a `duplicate-id` (found by the implementing session, 2026-11-21).

[Inferred] Findings: a structural problem with a home (absent, not an object, unknown kind, missing or surplus `target`, any other member, or `sectionId` beside it) is the new kind `diagram-home`; a `target` naming no section or deep dive is `unresolved-reference`, as a v4 diagram's unknown `sectionId` already is; a `home` in a v4-or-earlier draft is `field-version`, as other later-version fields are. That last is the one change to a v4 draft's findings: such a draft failed before (an unknown member) and fails now with a named kind. Each such diagram has at least one finding naming its identity (or its index where it has none); the generic schema check may add its own.

[Inferred] Placement follows the existing rule that an operator-agent section leads with its figures. A deep dive's figures lead its page, as a section's do: after the deep dive's heading and any run-stopped banner, before its first paragraph. A figure homed on a deep dive that has no page of its own (its disposition is not `produced`, or the draft layer is withheld) renders where its section's figures render instead, so every figure has exactly one page (decided in the implementation, 2026-11-21). The overview's figure sits on `index.html` after the header (title, any run-stopped banner, introduction; an operator-agent run's open questions are on the appendix, not here) and before the sections, the Pole map and the list of sections not generated, in a region of its own at reading level 1 that carries no topics, so it is the first figure a reader meets. The figure markup is the section figure's, so the legend and the Syzygy-written tally (A-16) come with it.

[Inferred] Where no part of the draft renders on the home's page (a withheld draft layer, a section not generated), the figure renders nowhere, as a v4 figure of that section does. A non-produced or non-inert diagram's notice stands where its figure would.

[Inferred] `repeatsDiagram` keeps its meaning: a list repeats a figure of its own section, read for v5 as a figure homed in the list's section, or for a list in a deep dive, in that deep dive or its section (the last keeps the v4 behaviour of a deep-dive list naming its section's figure). No list repeats an overview figure, and a section's list does not repeat a figure homed in one of its deep dives.

[Observed] v4 compatibility is literal: `LOCAL_DRAFT_SCHEMA_VERSIONS` already lists v2, v3 and v4; v5 joins them, and nothing about a v4 draft's check or rendering may change. The brief issues v5; its version becomes `polaris-dossier-brief-v10` and its readability guidance `polaris-dossier-readability-v5`.

## Figure fit

[Observed] What the stylesheet does, read from `dossier-site.ts` and the shared draft-preview CSS on 2026-11-21:

- `svg{display:block;max-width:none;height:auto}` and `.diagram-scroll{overflow:auto}`: a figure is drawn at its laid-out width and a wider one scrolls sideways in its box; it is not scaled.
- `.diagram-scroll svg[width="1048"]{max-width:max(100%,860px)}` (operator-agent pages only): any figure laid out exactly 1048 px wide, the readable layout's three-column width (a chain or not), shrinks to its box but to no less than 860 px. The rule is keyed to the width attribute, so the requirement keys D to W = 1048 too.
- `svg text{font:13px ...}`: node and edge text is 13 px (a node's "No relationship supplied" note is 12 px; the rule measures the 13 px text, as the brief for bead .20 asks for node and edge text).

[Observed] The box widths, `.diagram-scroll` clientWidth measured in Chrome on the reading fixture on 2026-11-21 (syzygy-3efd.19), with the navigation panel in its default, open state: 966 px at a 1440 px viewport and 261 px at 390 px. They are pinned as `WIDE_COLUMN` and `STACK_COLUMN` in `diagram-layout.test.ts` and asserted by `dossier-reading.browser.test.ts`. Folding the panel widens the column (the same test asserts it), so C is stated for the default state.

So "effective" text size means: T = 13 px x D / W, where W is the laid-out width (the SVG's `width`) and D the drawn width (W, or where W = 1048, min(W, max(C, 860))). T is 13 px for every unscaled figure; only a 1048 px figure is ever scaled, and at 390 px it is drawn at 860 px, giving 10.67 px, under the 11 px minimum, while also scrolling (860 > 261). At 1440 px it is drawn at 966 px, giving 11.98 px, and fits.

[Inferred] 11 px is the minimum: the brief proposed it, and it sits just above the 10.7 px floor the stylesheet comment already accepts for the 1048 px figure, so the one scaled case at a phone width is reported rather than silently accepted. The threshold is stated once, in the requirement.

[Inferred] Why stored: the other advice members (`screenCensus`, `structureRecord`, `readerAdvice`, `reviewReach`) are on check's report only (`check.ts`, the `SubjectReport` note). `figureFit` is computed from the draft bytes and constants alone, so it is deterministic and comparable across revisions; it goes into the draft check's record object (never the inventory check's, which shares `checkSubject`), the one `check.ts` writes once per revision to `checks/rev-<n>.json` (the `wx` write after the frozen draft), and the report, which spreads the record, carries it too. Only the member is deterministic; the record's `checkedAt` and `revision` still differ between checks. The requirement names the member's keys, the Unknown entry's shape, what counts as examined and the rounding rule, so two implementations cannot write different bytes.

[Inferred] A record without the member is Unknown about fit. No reader reads `figureFit` today (the record's readers are `review-packet.ts` and `polaris.ts`), so the requirement states that rule as a prohibition on any reader. The format identifier stays `polaris-dossier-check/1`: the member is additive and the existing readers ignore it.

[Unknown] Whether the deep-dive and landing pages give a figure the same box width as a section page has not been measured; the requirement makes equal width normative, and the implementing bead's browser test is its check.

## Review

[Observed] One fresh-reader review (CC-REV-4), `docs/reviews/syzygy-3efd-18/R-FIGURE-HOMES-FIT-SPEC-1-RAW.md`, verdict REVISE over the first draft of the spec, no blocking finding. Every finding (1 to 12) was repaired in the spec, this design or both; none was overruled. Finding 1 was first repaired by refusing a home on a non-produced section or deep dive; a later decision from the implementing session (2026-11-21) replaced the deep-dive half with the fallback above, and the home key `id` became `target` with the structural finding kind `diagram-home` (formerly `schema`). Since D10 a review is one round and gates nothing, so no confirmation round was run; the repaired bytes are not themselves reviewed.

## Implementation pointers (not normative)

- `packages/polaris-dossier/src/draft-schema.ts`: add v5 and the `home` object, version-conditionally: today one `localDraftSchema` requires `sectionId` for every version, and a v4 draft's schema findings (path and detail) must not change by a byte.
- Trap: `check-derive.ts` computes `v4 = schemaVersion === LOCAL_DRAFT_SCHEMA_VERSION` and writes that constant into `field-version` details (and the Pole logic tests the same equality). Bumping the constant to v5 as v3 to v4 did would give v4 drafts false `field-version` findings and change v2/v3 detail text; compare against an explicit version set instead.
- `check-derive.ts`: home findings and the v5 `repeatsDiagram` reading.
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`: place figures by home; the brief text in `packages/polaris-dossier/src/brief.ts`.
- Figure fit needs the renderer's pure layout (`diagram-layout.ts`, `READABLE_SPACING`) from the check, which lives in `packages/polaris-dossier`; where that layout lives is the implementing bead's choice.
