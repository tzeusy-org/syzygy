# Dossier page subsections — version 2.15

[Inferred] Candidate agent-decided change under VIS-4 as amended by GOVERNANCE-SIMPLIFICATION-D10. It binds only once its row in `AGENT-ADOPTIONS.md` and its version tag exist; no owner adoption is claimed. It decides no owner class: no doctrine edit; no change to secret detection or SEC-5's fail-closed rule; no write to a repository the owner does not own; no network exposure, release or multi-user use.

## Why

- [Observed] syzygy-3efd.50 (pursuit 2026-11-21 Q8, slice 1): "A page becomes an ordered list of subsections, each opening with a one-sentence answer; the renderer emits subheadings and an on-page contents list." Its acceptance criteria: a draft with subsections renders third-level headings and a contents list that links to them; every stored draft still validates and renders the same; the provider golden stays byte-identical.
- [Observed] The pursuit report (`docs/pursuits/2026-11-21-vision-pursuit.md`, finding 3) measured the newest site: "The reading path has no third-level heading". A reading page today is a run of second-level sections, each a column of paragraphs, so a reader can only scan it by reading it.
- [Observed] The draft schema has nowhere to say what a section's parts are or what each part answers: a section is `{id, title, paragraphs, disposition}` (`packages/polaris-dossier/src/draft-schema.ts`, the `sections` member of `localDraftSchema`), and the renderer emits `<h1>` for a page and `<h2>` for a section and nothing below (`apps/three-surface-poc/src/polaris-generation/dossier-site.ts`, `sectionMarkup`).
- [Inferred] An answer-first subsection lets a reader stop after one sentence per question, which is the skim view the pursuit's P4 asks for; the reading depths that switch it (syzygy-3efd.51) build on the structure this version adds.

## What changes

[Observed] One MODIFIED requirement, REQ-polaris-generation-034 ("Agent brief and mechanically checked draft"), complete text in `proposed/polaris-generation/spec.md`:

- Draft schema `polaris-dossier-local-draft-v8`: a section may carry `subsections`, two to twelve, each `{id, title, answer, paragraphs}`. The title is a short label; the answer is one claim block whose text is one sentence; the paragraphs are zero to thirty, as a section's are. Every claim of a subsection is a claim of its section for every rule of REQ-034 and REQ-035.
- A repair finding `subsection-answer`, by rule `one-sentence-answer` version 1, for an answer that is not one sentence; a `field-version` finding for `subsections` in a draft of schema v7 or earlier.
- Rendering: each subsection is a `<section class="subsection" id="subsection-<id>">` headed by `<h3>`, its answer first; a page that renders a subsection carries an on-page contents list (`<nav class="page-contents">`) before its first section, linking each section and subsection it renders; the stylesheet rules for both ride only on such a page.
- Brief `polaris-dossier-brief-v13`: brief v12 plus one paragraph, issuing schema v8.
- The reading ledger and the RS-19 advice count a subsection's prose as its section's.
- The `makefile` recognizer of version 2.14 corrected (syzygy-3efd.81): conditional-directive lines no longer end a rule's recipe context, and a tab-led line that is no recipe line is a `syntax` fault.
- A paragraph stating what does not change; eight scenarios added; the four Form lines extended.

[Observed] Every other sentence and scenario of REQ-034 is carried unchanged.

## Non-goals

[Inferred] No reading depths, takeaways strip or per-depth switch (syzygy-3efd.51 and later slices of Q8); no subsections in a deep dive; no figure homed in a subsection; no change to `contents.html`, the glossary, the provider mode or its golden; no change to the reader standards' RS-19 limit; no script and no sticky contents list.
