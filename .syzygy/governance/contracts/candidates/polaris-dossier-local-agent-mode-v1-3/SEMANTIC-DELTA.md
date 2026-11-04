> **Candidate — binds nothing.** This semantic delta is drafted under the
> owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04` and
> CC-REV-2. It performs no act and amends no signed byte. Version 1.2 of
> `polaris-dossier-local-agent-mode` stays in force until the owner signs off
> version 1.3 after a fresh independent review of these exact bytes.

# Semantic delta DOSSIER-LOCAL-AGENT-1.3 — presentation elements

Version 1.3 lets a dossier draft lay out its argument with the HTML elements
a well-made static site uses: tables, callouts, numbered steps, definition
lists, cards, collapsible sections and code excerpts. Today a draft section
is a list of paragraph blocks, each optionally with child blocks, so a
dossier can show an enumeration only as prose. The owner asked for "the full
equivalent capabilities of Claude Artifacts/Codex Sites/our
user-questionnaire skill, which are all effectively static-sites, with good
use of html elements for presentable visuals. That includes tables, etc..;
Amending the signed design is approved."

**Artifact(s):** the signed change
`openspec/changes/polaris-dossier-local-agent-mode/`, at its v1.2 bytes on
`main` (tag `polaris-dossier-local-agent-mode-v1.2`, signed 2026-10-14).
Three files move, by the patches under `proposed/`:

- `specs/polaris-generation/spec.md` (`spec.md.patch`), including its header
  line, which moves from "Exact behavioral delta, version 1.2" to version
  1.3, names the v1.2 sign-off record beside the v1.0 and v1.1 ones, and says
  the bytes bind only by the sign-off of version 1.3 (non-normative);
- `design.md` (`design.md.patch`), including its version line;
- `proposal.md` (`proposal.md.patch`), including its version line.

`GOVERNING-DEPENDENCIES.md` is regenerated on install
(`check_spec_reconciliation.py --regenerate`) and gains the decision
`OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`. `tasks.md` is unchanged.

**Stable IDs affected:** REQ-polaris-generation-034, amended in place: one
paragraph added to the requirement text, four scenarios added, and the case,
the observable, the falsifier and the warrant block's `decisions` extended.
No other requirement changes. No identifier is minted, retired, renamed or
renumbered, and no requirement title changes.

**Change class:** **Normative.** Under v1.2 a draft carries only claim
blocks, and no rule says how Syzygy checks, reviews or renders a table cell,
a heading over a column, or a code excerpt. Under v1.3 each is permitted,
with the rules below. A build that lets a claim inside an element skip a
check a claim block meets, lets a short label carry a citation or a
quotation, renders a code excerpt from the agent's text or from an excluded
file, or renders an element with a script, fails v1.3.

**Author:** agent drafting for the owner direction (bead `syzygy-mea.10.3`).

**Date:** 2026-11-04, drafted over v1.2 as installed on `main`.

## Sources

- The owner direction
  `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`,
  which quotes the owner's words and the earlier presentational feedback.
- The v1.2 sign-off record
  `.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`.

## Current meaning

At v1.2, REQ-polaris-generation-034:

- requires "every claim block" to carry exactly one label, the citations
  the citation rules require and, for Unknown, a reason from RFC2-24's closed
  list, and Syzygy to check each and report every failure as a repair
  finding;
- defines a quotation as "one contiguous span of one cited file at the
  pinned revision", rendered from the span Syzygy located in the blob it read
  and verified, never from the agent's copy, with an RFC7-10 anchor;
- renders a quotation from a blob that classification or screening excludes
  as Unknown with `excluded-content`, carrying none of its bytes;
- renders through "the existing multi-page dossier renderer" and says
  nothing of any presentation element. The design's draft schema,
  `polaris-dossier-local-draft-v2`, has blocks with children and nothing else
  in a section's `paragraphs`.

REQ-polaris-generation-035 requires the fidelity verdict to carry an entry
for "every inventory entry and every claim block".

## Proposed meaning

1. **Elements stand where a claim block may stand.** "A draft MAY present
   its argument with presentation elements (owner direction
   `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`), standing where a claim
   block may stand: a table, a callout, an ordered list of steps, a list of
   definitions, a set of cards, a collapsible section and a code excerpt."
2. **Every claim inside an element is a claim block.** "Every claim an
   element carries (a table cell, a block inside a callout or a collapsible
   section, a step, a definition, a card's body) SHALL be a claim block for
   every rule of this requirement and of REQ-polaris-generation-035: it
   carries its own identity, label, citations and quotations; Syzygy checks
   it and reports its findings as for any claim block; the fidelity verdict
   carries an entry for it; and it renders with its label's marking." So the
   labelling, citation and quotation rules, the RFC2-24 reasons, the
   execution marking and the fidelity verdict's `blockSupport` reach every
   claim, wherever it sits.
3. **Short labels are presentation, not claims.** "An element's short
   labels (a table caption, a column heading, a callout title, a defined
   term, a card label, a collapsible section's summary, a code excerpt's
   language) are presentation: each is plain text of at most 120 characters
   that names what it heads; it SHALL carry no citation and no quotation,
   SHALL state no fact about the subject, carries no epistemic label of its
   own and SHALL NOT render as Observed." Syzygy checks what it can: "Syzygy
   SHALL report a finding for a short label longer than 120 characters or one
   that carries a citation, a quotation or markup; that a label states no
   fact is the agent's report, open to the fidelity and rendered-design
   reviews."
4. **A code excerpt is Syzygy's read, never the agent's text.** "A code
   excerpt carries no text of the agent's: it names one citation of at most
   60 lines, and Syzygy SHALL render those lines from the blob it read and
   verified at the pinned revision, byte for byte, as a quotation Syzygy has
   verified, labelled Observed, with an anchor in the form above whose
   fragment is the lines' byte range". The citation rules and the excluded-blob
   rule apply as to a quotation, "so that for an excluded blob the excerpt
   SHALL render Unknown with `excluded-content` in its place, carrying none
   of the blob's bytes, and its exclusion is not a repair finding." A cited
   path that names no blob, or lines beyond the blob, is a repair finding, as
   for any citation.
5. **Inert, semantic rendering.** "Syzygy SHALL render every element
   through the same renderer as inert static HTML, in the HTML element whose
   meaning matches it (a table whose header cells are scoped to their row or
   column, an aside, an ordered list, a description list, a details element
   with its summary, preformatted code), with no script and no change to the
   pages' content security policy; a callout's tone SHALL be stated in its
   words, never by colour alone; and no fragment target SHALL sit inside a
   collapsible section."
6. **Nothing else is added.** "An element adds no read, no source and no
   label beyond those of the claims it carries and the excerpt Syzygy reads."

Four scenarios carry these: "Claim inside a presentation element checked as
a block", "Short label carries no claim", "Code excerpt rendered from
Syzygy's read" and "Presentation element rendered inert". The falsifier
gains one arm per item, and the case and the observable gain the elements.

### The element schema (design, `polaris-dossier-local-draft-v3`)

`design.md` gains the schema the implementation follows. Since version 1.3
the draft schema is `polaris-dossier-local-draft-v3`; Syzygy still accepts a
`polaris-dossier-local-draft-v2` draft, which uses no element. Elements sit in
the existing `paragraphs` arrays of sections and deep dives, whose name
stays. An entry without `kind` is the existing block. "Claim form" means the
existing block's claim fields: `id`, `label`, `basis` or `reason`, `text`,
`citations` and `quotations`. "Block" is the existing block, with its own
`children`.

| `kind` | Fields | Limits | Renders as |
|---|---|---|---|
| `table` | `id`, `caption`, `columns` (column labels), `rowHeaders` (boolean), `rows`, each `{id, cells}`; a cell is a claim form or `{kind: "empty"}` | 1 to 8 columns; 1 to 40 rows; each row has exactly one cell per column | a `table` with its `caption`; each column label is a header cell scoped to its column, and with `rowHeaders` each row's first cell is a header cell scoped to its row |
| `callout` | `id`, `tone` (`note`, `tip`, `caution` or `important`), `title`, `children` (blocks) | 1 to 12 children | an `aside` whose tone is written as a word beside the title, with its colour as a second cue only |
| `steps` | `id`, `items` (blocks without children) | 2 to 20 items | an `ol` |
| `definitions` | `id`, `entries`, each `{term, definition}`; the definition is a claim form | 1 to 40 entries | a `dl` |
| `cards` | `id`, `items`, each `{label, body}`; the body is a claim form | 2 to 6 items | a list of cards, each headed by its label |
| `details` | `id`, `summary`, `elements` (blocks, or any element but `details`) | 1 to 30 elements | `details` with its `summary`, holding no fragment target |
| `code` | `id`, optional `language` (a short label), `citation` (`{id, path, startLine, endLine}`) | 1 to 60 lines | `pre` and `code`, the lines as Syzygy read them at the pinned revision, with their anchor |

The short labels are `caption`, each column label, `title`, `term`, `label`,
`summary` and `language`: plain text of at most 120 characters, never a
quotation, with no citation. Each claim form inside an element counts in the
fidelity verdict's `blockSupport` by its own `id`. A `code` element has no
`blockSupport` entry of its own; its span is one of the cited spans the
fidelity packet carries. Element, row and code-citation `id`s share the
draft's one space of identities.

`proposal.md` gains its version line and one paragraph, "Presentation
elements".

## What explicitly does NOT change

- The claim ledger: what a claim is, its labels (Inferred, Unknown or
  non-normative; never agent-labelled Observed), its citations, its
  quotations and their normalisation, RFC2-24's reasons, the execution
  marking and the repair loop.
- Observed stays reserved for what Syzygy verified: a quotation, or now a
  code excerpt, rendered from Syzygy's own read.
- Screening, classification, the source pages, and the RFC7-10 anchor form.
- The review packet, the verdict's validation (an entry per claim block and
  inventory entry, now reaching claims inside elements), the session and
  launch-form rules, waiting sessions and the continuing reviewer of
  REQ-polaris-generation-035.
- The rendering obligations of REQ-polaris-generation-003, 004, 012 and 032,
  the editorial-draft state (RFC7-20), and the pages' content security
  policy. No script is added to any page.
- REQ-polaris-generation-033, 035 and 036, every adopted requirement
  001–032, and the base and understanding changes.
- Not carried here: the dossier's theme, its diagrams, numbered citation
  markers, inline code from backticks and plainer prose, which the direction
  also names. They change no signed sentence as drafted here; if one turns
  out to, it travels in a later version.
- No doctrine, contract or policy text, and no implementation code.

## Warrant

- **The owner direction** `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
  for items 1 to 6; it joins 034's `decisions` warrants.
- **VIS-1, VIS-2, VIS-3** for items 2 to 4: a claim keeps its label wherever
  it is shown, and Observed is reserved for what Syzygy read. **RFC7-2**
  stays 034's primary warrant; **RFC7-10** governs the excerpt's anchor.
- **SEC-5** (secrets are never indexed) for item 4's excluded-blob arm: an
  excerpt of a file screening withholds carries none of its bytes. Item 5
  keeps the existing renderer's inert pages; it adds no warrant.
- **CC-REV-2** (an amendment of a signed specification travels as a new
  version with its own review) and the owner's direction
  `OWNER-DIRECTION-VERSIONED-SIGNOFF-SCOPE-A-2026-10-02`, as extended to
  Polaris generator deltas by the v1.0 selection.

## Evidence or decision basis

- The direction record named above.
- [Observed, this session, over the v1.2 bytes on `main` with these patches
  applied] `openspec validate polaris-dossier-local-agent-mode --strict`
  reports the change valid; `scripts/count_polaris_effective_scenarios.py`
  gives 36 requirements and 252 scenarios, against 36 and 248 at v1.2.
- An implementation is being built in parallel under bead `syzygy-mea.10.5`;
  it is evidence that the text can be met once it lands, not a reading of it.

## Terms introduced / retired

- **Presentation element**: one of the seven kinds above, standing where a
  claim block may stand.
- **Short label**: an element's caption, column label, title, term, card
  label, summary or language; presentation, never a claim.
- **Code excerpt**: an element that names one citation of at most 60 lines
  and renders those lines from Syzygy's read.
- Nothing retired.

## Downstream impact

See `IMPACT-LEDGER.md`. In short: three files of one change move, one
generated file and the census are regenerated, `PROJECT-STATUS.md`'s Polaris
figure moves from 248 to 252 scenarios, one test pin moves, and the element
code becomes conformant only once these bytes are signed. **One install
blocker:** the signed P115 sign-off (three-surface POC `governedBy`
reference amendment) freezes the v1.2 dossier spec's digest as one of its
eight governing inputs, so installing any v1.3 spec bytes makes the P115
transaction read as unsigned and fails the battery. The ledger names it,
and the owner packet asks how to resolve it before the install.

## Migration / supersession plan

- The v1.3 sign-off is recorded as v1.2 was: the recorder applies the three
  patches through a builder, writes a v1.3 record and aggregate block, and
  `--regenerate` refreshes the union and the census. The v1.0, v1.1 and v1.2
  records are never edited.
- **The recording tools** (scripts, outside this package, on the branch that
  carries it): `scripts/build_polaris_dossier_local_agent_mode_v1_3.py`
  verifies, applies and tells signed from unsigned v1.3 bytes;
  `record_versioned_signoff.py`'s `real_packages()` carries the entry
  `polaris-dossier-local-agent-mode@1.3`, whose reviewed subject is the
  installed spec with `spec.md.patch` applied; and the v1.2 builder reads its
  own layer once these patches are applied and leaves a later version to the
  v1.3 builder (the v1.1 builder reaches it through v1.2's peel). Once v1.3
  is recorded, the battery's existing dossier `--check` lines fail unless the
  tree is the signed v1.2 plus exactly these patches and the spec hashes to
  the digest the v1.3 review read; while v1.2 is the latest record, a tree
  carrying these patches fails them.
- **Install-time edits the recorder does not make:** the
  `polaris-dossier-local-agent-mode` row of `openspec/README.md` names the
  v1.3 record (R5 of `check_spec_reconciliation.py --check` requires it);
  `--regenerate` refreshes the union and the census; the spec-head pin in
  `packages/polaris-dossier/src/agent-texts.test.ts` moves to version 1.3;
  the CG-26 battery lines for the v1.3 builder are registered once, at
  install; and the P115 governing-input blocker is resolved as the owner
  decides (`IMPACT-LEDGER.md`, "Install blocker").
- [Inferred: the plan for bead `syzygy-mea.10.5`, not on this branch] The
  element code should accept a `polaris-dossier-local-draft-v3` draft that
  uses an element only once a v1.3 sign-off record holds over the applied
  subject, in the way the wait-mode gate reads a v1.2 record; until then a
  v2 draft behaves as it does at v1.2. The proposed order is review,
  sign-off, recording, then merging the code.

## Review

One fresh-context review round on the default model under `REVIEW-BRIEF.md`,
and one more only if it returns REVISE or a blocking finding. Raws are stored
verbatim under `docs/reviews/` as
`R-DOSSIER-LOCAL-AGENT-V1-3-<sha4>-<n>-RAW.md`.
