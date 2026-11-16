# Owner direction — dossier presentation elements, and amending the signed design

Date: 2026-11-04

Owner: Tzeusy

Decision ID: `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`

This is a plain owner direction in the shape of
`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`.
- It binds no artifact digest.
- It adds no row to `ACCEPTANCE-ACT-RECORD.md`.
- It registers nothing in `scripts/check_governance.py`.
- It signs nothing. The amendment it authorizes binds only by the owner's
  own version-tagged sign-off of the reviewed bytes (VIS-4).

## The owner's words

On 2026-11-04, in the Claude Code CLI, after reading a Polaris dossier
rendered by the local-agent mode, the owner gave feedback "to concretize
into beads or do yourself". These are the owner's words as written:

1. "theme like the user-questionnaire webpage, soft dark mode, colorized
   sections for callouts"
2. "far more diagrams"
3. "base polaris dossier should only need links like [1] [2] instead of
   [src-adb12312312312312]"
4. "Backticks aren't rendering 'code-quotes'"
5. Language that is approachable for "A SWE-trained fresh grad who hasn't
   seen redis before", and enumerations that the dossier should
   "tabularize or at the very least convert to list"
6. "why doesn't literally every section lead with a diagram or flow?"

Later in the same session the owner wrote:

> "I'd like the dossier to have the full equivalent capabilities of Claude
> Artifacts/Codex Sites/our user-questionnaire skill, which are all
> effectively static-sites, with good use of html elements for presentable
> visuals. That includes tables, etc..; Amending the signed design is
> approved."

The lead session filed the work under the bead epic `syzygy-mea.10`.

## The direction

1. **Presentation elements.** The dossier may present its argument with the
   HTML elements a well-made static site uses: tables, callouts, ordered
   steps, definition lists, cards, collapsible sections and code excerpts,
   rendered as inert static HTML.
2. **Amending the signed design is approved.** The owner authorizes drafting,
   reviewing and implementing an amendment to the signed Polaris dossier
   local-agent mode (version 1.2, signed by
   `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`) as a new version, 1.3,
   under CC-REV-2 and the Scope A sign-off form. [Inferred: the lead's
   reading, on the version 1.2 precedent] Code may be built before the
   sign-off, provided it accepts a draft that uses an element only once the
   version 1.3 sign-off record exists.
3. **The presentational feedback above** ([Inferred: the lead's reading of
   the two messages together] theme, diagrams, numbered citation
   markers, inline code from backticks, approachable language, enumerations
   as tables or lists) is the purpose this amendment serves. Each item that
   changes no signed text is implementation work under the epic; an item
   that does change signed text travels in the amendment or in a later one.

## What this does not do

- It does not sign version 1.3. Version 1.3 binds only when the owner selects
  it in a structured question naming the package and the version, after a
  review round that returns CONFIRM, or CONFIRM WITH EXCEPTIONS with notes
  only (`OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02.md`, item 3).
- It changes no claim ledger, label, citation, quotation or review rule. An
  element that carries a claim carries it under the existing rules.
- It grants no read, egress, write or execution, and no script on a rendered
  page. It starts no run and reads no repository body.
- It does not withdraw or narrow any earlier direction.
