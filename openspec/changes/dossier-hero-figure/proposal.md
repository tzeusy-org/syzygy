# Dossier hero figure — version 2.20

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.29 (pursuit 2026-11-21 Q4, slice 2): "The overview page carries one required hero figure after the thesis: the project's main parts and what surrounds them. A draft may instead declare it omitted, with a reason, and the page then says so." Its exclusions: today's graph kind only; no links to Poles or Pole colour; no new figure kind.
- [Observed] Since version 2.2 a figure may be homed on the overview, and it renders after the header, but nothing asks for one. A dossier can open with no picture at all, and a reader is not told why.
- [Inferred] A required slot with an honest escape makes the first page show the system, or say why it cannot.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v10`: a required top-level `hero`, either `{"figure": <identity>}` naming a graph-kind figure homed on the overview, or `{"omitted": <claim block>}` saying why there is none.
- Findings:
  - `hero` at `$.hero` for an absent or malformed `hero`, in place of the generic schema finding;
  - `hero` at `$.hero.figure` for a figure not homed on the overview or not of a graph kind;
  - `unresolved-reference` for a name that resolves to nothing;
  - `hero` at `$.hero.omitted` for a non-normative omission;
  - `field-version` for `hero` in schema v9 and earlier.
- Rendering:
  - The landing page's region of overview figures opens with the hero, carrying `data-hero="figure"`, right after the header that ends with the thesis.
  - A declared omission renders there instead: a Syzygy-written line, then the reason's claim block.
  - `machine.json` gains a `hero` member for v10.
  - The reading ledger places the omission on `index.html`.
- Brief `polaris-dossier-brief-v16`: brief v15 plus one paragraph, issuing schema v10.
- In the predecessor text, one sentence about overview figures now points to the hero paragraphs, and the brief-version list is extended. Ten scenarios are added and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] This change leaves out:
- Pole links and Pole colour on hero regions (syzygy-3efd.61);
- any new figure kind, and any hero of kind `sequence` or `swimlane`;
- a code-excerpt hero (the unapplied v1.7 clause). This version departs from v1.7's owner-signed sentence "a missing hero is no repair finding": a v10 draft must name a hero or declare it omitted with a reason (`design.md` D2);
- a mechanical test of what the hero shows;
- any change to the provider mode or its golden;
- any script.
