# Dossier figure walks — version 2.NN

[Inferred] Agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. The version label, the schema number and the brief number are placeholders (`2.NN`, `vSS`, `vBB`) until adoption (`design.md` D1). It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.32 asks that a section may declare a walk: ordered steps, each tying a cited paragraph to elements of a figure. The figure shows numbered badges; choosing a step highlights its element by CSS `:target`, with no script; each node label links to the lines it cites; and the walk is also the figure's text alternative. Its exclusions: hover and focus highlighting and edge-label links (syzygy-3efd.34), excerpts and code walks (syzygy-3efd.33).
- [Observed] REQ-034 version 2.33 draws graph figures as inert SVG and lists every component and relationship, with its citation links, in a collapsible list beneath the figure. Nothing ties a paragraph to the box it explains, so a reader moves between prose and picture by matching labels, and the cited lines sit one disclosure and one link away from the box.
- [Inferred] A numbered walk gives the figure a reading order the prose already has, and a link on each box puts the evidence one step from the picture, without a script and without a byte of the drawing changing.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-vSS`: schema v14 plus an optional `walk` on a section or deep dive, `{"figure", "steps": [{"element", "block"}, ...]}`:
  - the figure is a graph-kind diagram homed in that place, walked by no other walk;
  - 2 to 12 steps; each names an element the figure draws (for a view, an element of its expansion), each element once;
  - each step's block is one of the place's own paragraphs (or a subsection's), never inside a presentation element, and carries a citation;
  - a walk is presentation: no claim, label or citation of its own, and it enters no count, ledger, `machine.json` or fidelity entry.
- Findings (repair findings): `walk` for a malformed walk, a figure homed elsewhere, of a non-graph kind or walked twice, an element not drawn or named twice, a block that is not the place's paragraph or cites nothing; `unresolved-reference` for a figure that names nothing; `field-version` for `walk` in schema v14 and earlier.
- Render, with no script and only where the figure renders as a drawing:
  - the drawing, byte for byte, is wrapped with an HTML layer of one box per node at the layout's coordinates;
  - a step's box carries a fragment id and a numbered badge, and the stylesheet outlines the box that is the page's `:target`;
  - each box whose node has a cited, linked source carries a link to where its first citation's link lands, the cited lines of the source page;
  - an ordered list after the drawing links each step to its box and to its paragraph, which carries a fragment id: the figure's walk in words.
- Brief `polaris-dossier-brief-vBB`: brief v22 plus one paragraph offering the walk.
- In the predecessor text, the brief-version list and the accepted-schema list are extended. Nine scenarios are added and the four Form lines are extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] This change leaves out:
- hover and focus highlighting, and links on edge labels (syzygy-3efd.34);
- excerpts beside a step, and walks through code (syzygy-3efd.33);
- walks through the overview's figures, or through sequence, swimlane, containment and the other non-graph kinds (`design.md` D3);
- any change to the SVG or to the inertness check: the layer is HTML beside it;
- any script in a rendered page, and any change to the provider mode or its golden;
- a new counted reader standard.
