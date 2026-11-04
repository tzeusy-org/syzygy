# Owner decision packet — Polaris dossier local-agent mode, version 1.3

> **Candidate — binds nothing.** Drafted 2026-11-04 under the owner
> direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`. It performs
> no act and carries no phrase. Effect comes only from your version-tagged
> sign-off of the exact reviewed bytes, after a confirming review. A commit,
> a review or a merged pull request performs no act.

## What this is, in one paragraph

On 2026-11-04 you asked for the dossier to have "the full equivalent
capabilities of Claude Artifacts/Codex Sites/our user-questionnaire skill",
with tables and other HTML elements, and approved amending the signed
design. The signed version 1.2 lets a dossier section hold only paragraphs,
each with optional sub-paragraphs, so a list of options or a comparison can
only be written as prose. Version 1.3 adds seven presentation elements and
the rules that keep them honest. Nothing else changes.

## What 1.3 changes, in plain terms

- **Seven elements.** A draft may use a table, a callout (note, tip, caution
  or important), numbered steps, a definition list, a set of two to six
  cards, a collapsible section, and a code excerpt, wherever it could put a
  paragraph.
- **Every claim inside an element is checked like any other.** A table
  cell, a step, a definition, a card's body or a paragraph inside a callout
  carries its own label (Inferred, Unknown or non-normative), its own
  citations and quotations, and is checked, reviewed and marked on the page
  exactly as a paragraph is. The fidelity reviewer gives each one its own
  verdict entry.
- **Headings carry no claims.** A table caption, a column heading, a callout
  title, a defined term, a card label, a collapsible section's summary and a
  code excerpt's language are short plain text (at most 120 characters) that
  name what they head. Syzygy refuses one that is longer, cites a source,
  quotes one or carries markup. Whether a heading slips a fact in is for the
  reviewers to catch: Syzygy cannot tell.
- **Code excerpts are Syzygy's read.** The agent names a file and up to 60
  lines; Syzygy shows those lines as it read them at the pinned revision,
  marked Observed with the same source anchor a verified quotation has. The
  agent's own copy is never shown. A file that screening withholds shows as
  Unknown, with none of its bytes.
- **Plain, inert pages.** Each element renders as the HTML element made for
  it (a real table with scoped headers, a numbered list, a definition list,
  a collapsible `details`), with no script, the same content security policy
  and a callout's tone written in words, not only in colour.
- **The draft format moves to version 3.** Version 2 drafts, which use no
  element, are still accepted.

Not changed: what a claim is and how it is labelled, cited and quoted;
screening; the review packet and the review rules; waiting sessions; the
execution rule. The theme, diagrams, numbered citation markers, inline code
and plainer prose you also asked for are implementation work under epic
`syzygy-mea.10`: none of them changes a signed sentence as drafted.

## One thing the install needs first

The signed P115 sign-off (the three-surface POC `governedBy` reference
amendment, 2026-10-27) froze the exact bytes of eight specifications it
relied on, this one's v1.2 spec among them. Its check fails on any change to
those bytes, with no allowance for a later signed version. Installing 1.3
therefore makes P115 read as unsigned, and the governance battery fails
(reconciliation R1 to R3 and CG-7h; `IMPACT-LEDGER.md`, "Install blocker",
has the rehearsal). Signing 1.3 does not need this settled; installing it
does.

## The questions

### 1. Sign off version 1.3?

- **(a) Sign off 1.3** as reviewed. Recommended: it is the text of your
  direction, and the element code is being built behind it.
- **(b) Not now.** Version 1.2 stays in force; drafts stay paragraphs-only,
  and the element code stays switched off.

### 2. How should the P115 freeze treat a later signed version of an input?

- **(a) Let P115 accept a later signed version** of a frozen input: when the
  dossier builders' own signed check says the installed spec is a recorded,
  reviewed later version, P115 reads that input as current. Recommended:
  P115's purpose was that its inputs not drift unreviewed, and a signed
  version is reviewed. This is a change to P115's checker, and it is yours
  to approve because it changes what a signed record accepts.
- **(b) Re-sign P115** as a new version over the v1.3 spec, after its own
  review, each time one of its eight inputs is amended.
- **(c) Hold 1.3 uninstalled** until a broader rule for frozen inputs is
  drafted.

The tool that records 1.3 is ready on the same branch: a builder that
applies these patches and its entry in the sign-off recorder. It changes no
text you sign. Once 1.3 is recorded, the battery fails unless the installed
files are exactly the reviewed 1.3 bytes; your version-tagged sign-off is
still the only thing that makes 1.3 binding.

## If you agree with the recommendations

"1.3 signed off; let P115 accept a later signed version."

## Where the evidence is

- The change: `SEMANTIC-DELTA.md`; what it touches: `IMPACT-LEDGER.md`;
  the review brief: `REVIEW-BRIEF.md`; all in this directory, with the exact
  edits under `proposed/`.
- Your direction:
  `.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`.
- The reviews of 1.3: `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-<sha4>-<n>-RAW.md`,
  retained by the lead, with their campaign file under
  `docs/review-campaigns/`.
