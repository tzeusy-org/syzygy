# Design: one required overview figure after the thesis, or a reasoned omission

[Inferred] Version 2.20 of REQ-polaris-generation-034, for syzygy-3efd.29, drafted on `main` at `06075e67` over the adopted version 2.19 text (`dossier-relation-types`, row A-52). The code of versions 2.16 (schema v8) and 2.19 (schema v9) has not landed at that commit: `main`'s draft schema is v7 and its brief v13, so every code site named in D8 is re-located on the base the implementation starts from.

## D1. The version label

[Observed] On `origin/main` at `06075e67` the tags of this line run to `polaris-dossier-relation-types-v2.19` (row A-52), the latest REQ-034 version. Version labels on this line are shared across its requirements, and 2.18 is allocated to a concurrent change of REQ-033, -035 and -048 (syzygy-3efd.80), so this is 2.20, tag `polaris-dossier-hero-figure-v2.20`. Brief and schema versions follow 2.19's: brief v16, schema v10, each one step past v15 and v9. If either label is taken when this is adopted, the renumber is mechanical and is recorded here.

## D2. Which landing clause this amends

- [Observed] The bead's design says the requirement "belongs to the landing clause that syzygy-fnry.19 drafts (v1.7): do not write a second clause". That clause is in `.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-7/proposed/spec.md.patch`. fnry.19's comments record the owner's sign-off of v1.7 on 2026-11-17, with the recorder run delegated. At `06075e67` no `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.7.md` exists, and the patch is applied to no spec: "pillar" and "ribbon" occur 0 times in version 2.19's REQ-034 and in `openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md`.
- [Observed] The landing text in force is version 2.19's REQ-034 itself. The Pole paragraph gives the landing page the title, the why section and the Pole map. The schema-v5 paragraph (version 2.2) renders the figures homed on the overview "after the page's header (its title, any run-stopped banner and the introduction) and before its sections … in a region of its own". The schema-v6 paragraph (version 2.4) names the introduction "the dossier's thesis".
- [Inferred] So this version amends that in-force text, and adds no second landing clause. One sentence of the v5 paragraph is amended to point to the hero paragraphs, and the hero is placed first in the region that sentence already defines. "After the thesis" then holds by construction, because the header ends with the introduction.
- [Inferred] The v1.7 clause differs from this version in two ways, and whoever lands v1.7 on the 2.x line must reconcile both.
  - Its "schema v5" (thesis, pillars, an optional code-excerpt hero) collides with the 2.x line's schema v5 (`home`).
  - **This version departs from an owner-signed sentence.** [Observed] v1.7, which the owner signed on 2026-11-17, says in `.syzygy/governance/contracts/candidates/polaris-dossier-local-agent-mode-v1-7/proposed/spec.md.patch`: "With no hero the opening ends at the thesis, and reader advice MAY say so; a missing hero is no repair finding." [Inferred] Version 2.20 does not follow that sentence. A v10 draft that neither names a hero figure nor declares the hero omitted gets a `hero` repair finding.
    - Why: the declared-omission escape keeps the author free to leave the hero out, so an author is never made to draw a figure that would not be true. What changes is that the omission is said, with its reason shown to the reader where the figure would stand. A silently missing picture leaves the reader unable to tell a deliberate choice from a gap.
    - Standing: the signing predates D10, so it stays in force as decided, and a later change to what it decided is an agent adoption (AGENTS.md, Orientation). This is not a veto, and it decides no owner class. The adoption row states the departure, and an owner veto reverts it.
  - The two heroes differ in kind, a code excerpt there and a figure here, so a landed v1.7 would need a name for each.
  - v1.7 is unapplied on the 2.x line, and its schema-v5 numbering collides with the 2.x line's. Whoever lands v1.7 must reconcile both of these, together with this departure.

## D3. The hero names an overview figure; it is no new figure

- [Inferred] Since version 2.2 a figure can already be homed on the overview, and it renders on `index.html` after the header. The bead's exclusions say "today's graph kind only … no new figure kind". So the hero is a pointer, `{"figure": <identity>}`, to one such figure, and every rule for a figure carries over unchanged: caption, legend, tally, the inert drawing, the machine form, and from 2.19 relation types and witnesses.
- [Inferred] "Today's graph kind" is read as the six graph kinds version 2.5 keeps with `nodes` and `edges`. A `sequence` or `swimlane` figure answers a different question (an order of events) from "the project's main parts and what surrounds them", so naming one is a `hero` finding.
- [Inferred] Whether the figure shows the main parts and their surroundings is meaning, so it is a review judgement, as whether a why section answers why is (version 1.x). Check tests only what it can decide from the draft: the figure exists, is homed on the overview and is of a graph kind.
- [Inferred] Other figures may still be homed on the overview. They follow the hero in draft order. Naming one hero does not limit the region.

## D4. The omission is a claim block

- [Inferred] An omission's reason states something about the project ("a single library file; one box would say nothing"). So it is a claim block, checked, reviewed and given its own fidelity entry like the introduction. Three other forms were rejected:
  - free text: it would bypass every claim rule on the landing page;
  - a `non-normative` block: it makes no claim, so it would let an author skip the hero with no reason, which the bead's "a declared-omission escape" with a reason forbids;
  - a disposition: a diagram's `omitted` disposition already exists, but it needs a whole diagram record to carry it.
- [Inferred] It takes the shape a subsection's answer takes in version 2.16, Inferred or Unknown and never non-normative. A non-normative omission is a `hero` finding at `$.hero.omitted`, so the escape always carries a reason.

## D5. Findings

- [Inferred] Acceptance 1 asks for "a specific finding". A missing or malformed `hero` is the `hero` finding at `$.hero`, in place of the generic schema check's finding at that path, so the author reads one finding that says what to do. The detail is a literal, and the scenarios fix it.
- [Inferred] A name that resolves to nothing reuses `unresolved-reference`, as a `home` target that names nothing does in version 2.2.
- [Inferred] A hero whose diagram's disposition is not `produced` raises no finding. The disposition is the draft's existing, reasoned way of saying a figure was not drawn, and its notice renders in the hero's place. A second finding for the same fact would make an author repair a figure the run could not draw.
- [Inferred] The findings follow every finding version 2.19 reports, so no earlier finding moves.

## D6. Rendering

- [Inferred] The hero is the region's first element and carries `data-hero="figure"`; an omission is the region's first element and carries `data-hero="omitted"`. A test, a reviewer and a later slice (Pole links, syzygy-3efd.61) can then find it without reading words.
- [Inferred] The omission line is Syzygy's own words, like the thesis-basis line of version 2.4. It carries no label token, citation or anchor, so it adds no claim, and the reason after it is the agent's claim block in both views. Acceptance 3 ("an omission's reason is visible to the reader") is met in the reading view.
- [Inferred] Where the draft layer is withheld, no part of the draft renders, the hero included. That is the rule every overview figure already follows. `machine.json`'s `rendered: false` says so in the machine form.
- [Inferred] `machine.json`'s `hero` member sits beside `thesisBasis`, outside `reviewStatus`, for v10 only. It carries the form and the identity, never text: the omission's text is already in the claims.

## D7. Rendered bytes that move

[Inferred] For a schema-v10 draft these move:
- `index.html`: the region of overview figures now renders for every v10 draft whose introduction renders. It opens with the hero or the omission, and the hero carries `data-hero`;
- `machine.json`'s `hero` member;
- the omission's claim, wherever claims are listed or counted (the page's one sentence and the appendix);
- the reading ledger's `index.html` entry in the check record;
- the findings.

Nothing else moves:
- A draft of schema v9 or earlier keeps every byte version 2.19 gives it. The one exception is a `field-version` finding in place of the `schema` finding at `$.hero`, where such a draft carries `hero`.
- The provider mode and its golden do not change.
- No script is added.

## D8. What the code change must do

[Inferred] For the implementing session, on a base where versions 2.16 and 2.19's code has landed:
- `packages/polaris-dossier/src/draft-schema.ts`: schema v10 with `hero`, a version predicate after v9's, and the v10 schema document.
- `packages/polaris-dossier/src/check-derive.ts`:
  - the `hero`, `unresolved-reference` and `field-version` findings, beside the `thesisBasis` and `home` checks (`field-version` at `$.thesisBasis` is the pattern);
  - the in-place replacement of the generic finding at `$.hero` and `$.hero.figure`.
- `packages/polaris-dossier/src/brief.ts`: brief v16, with the one paragraph after the relation-types paragraph.
- `apps/three-surface-poc/src/polaris-generation/dossier-site.ts`:
  - at the overview assembly (`overviewDrawn`, `overviewFigures`), the region renders for v10 whenever the introduction does, with the hero first and `data-hero`;
  - the omission line and block;
  - `machine.json`'s `hero` beside `thesisBasis`.
- The reading ledger, so it places the omission's block on `index.html`.
- Tests: every scenario, with literal expected values, and stored drafts of v9 and earlier re-rendered byte-identical. The provider golden stays unchanged. A rule-6 mutation run covers the new predicates.

## D9. Residuals

- [Inferred] Hero regions do not link to Poles or take Pole colour (syzygy-3efd.61, excluded by the bead).
- [Inferred] The pursuit's Q4 asks to "ship the hero on today's schema first to measure whether one picture helps". No measure is specified here. Whether the hero helps is for a later review of rendered dossiers.
- [Inferred] The v1.7 reconciliation in D2 is left to the change that lands v1.7 on the 2.x line.
