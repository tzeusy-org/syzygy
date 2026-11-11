# Semantic delta DOSSIER-LOCAL-AGENT-V1-7 — honest close, a thesis-first landing page, show-then-tell, clean quotations

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-local-agent-mode` version 1.7. No review, owner selection,
> installation, tag or product change is claimed here.

**Artifacts:** the three files under `proposed/`, applied to
`openspec/changes/polaris-dossier-local-agent-mode/` at version 1.6.
**Change class:** Normative; the whole package takes the normative review floor.
**Author:** Claude, for `syzygy-fnry.19` (with `syzygy-pdja.27`'s notes 3 and 4).
**Date:** 2026-11-11.

**Stable IDs affected.** [Observed] The block below is computed, not typed:
`scripts/build_polaris_dossier_local_agent_mode_v1_7.py --print-affected-ids`
prints it from the v1.6 and v1.7 spec bytes, and `--check` fails if this copy
differs. Scenario titles stand for the scenarios. No identifier is renamed,
removed or added; REQ-polaris-generation-036 keeps its bytes.

```affected-ids
opening: requirement text changed
REQ-polaris-generation-033: requirement text changed; test form changed
  scenario changed: Limits declared by the operator
  scenario changed: Zero repair and question limits accepted
  scenario changed: Syzygy's own limits enforced
REQ-polaris-generation-034: requirement text changed; test form changed
  scenario changed: Quotation verified against the pinned blob
  scenario changed: Repair loop counted
  scenario added: Design repairs drawn from their own limit
  scenario added: Every passed revision renders as its own pages
  scenario added: Reader advice decides nothing
  scenario added: Quotation of commented lines shown clean
  scenario added: Quotation ending inside a Markdown link's text
  scenario added: Quotation that no longer re-locates
  scenario added: Ribbon on a narrative page
  scenario added: Thesis-first landing page
  scenario added: Thesis and pillars checked
  scenario added: Annotated code walk
REQ-polaris-generation-035: requirement text changed; test form changed
  scenario changed: Rendered-design packet carries its questions
  scenario changed: Later round carries a changed-block list
  scenario added: Close names each review's standing
  scenario added: Close over a newer unrendered or unreviewed revision
REQ-polaris-generation-036: unchanged
```

[Observed] Scenario headings go from 80 to 92 (`grep -c '^#### Scenario:'`
over the installed and the patched bytes, 2026-11-11): twelve are added and
seven are amended in place.

## Warrant

[Observed] Two owner selections, made 2026-11-09 through the questionnaire web
form and recorded in `docs/pursuits/2026-11-09-vision-pursuit.md` ("Owner
decisions after the run") and on the bead `syzygy-fnry.19`; the packets
themselves are outside the repository. Quoted from that page's table:

- `pursuit-2026-11-09-release`, choice A: "`.19` drafts one v1.7 delta for P1,
  P3, P5 and P13's clause-bound part."
- `fnry-19-p13-scope`, choice B: "v1.7 lets every quotation display the
  normalised run the check matched, with the raw span in the evidence view."

[Observed] The page records choice A as including P13's clause-bound part
beside P1, P3 and P5; choice B under `fnry-19-p13-scope` then settled that
part's scope as every quotation, not only Markdown ones. The packets
themselves, and so the options as offered, are outside the repository. The
boundary recorded on the bead with choice B: no v1.7 sign-off by anyone but the owner, no RFC 0007
change, no change to the normalisation (spec line 242 at v1.6), none of P8's
other quotation work.

[Observed] Neither selection has a record under `.syzygy/governance/decisions/`,
so this version adds no `warrants.decisions` entry; the owner's sign-off of
version 1.7, recorded by `scripts/record_versioned_signoff.py`, is the record
that binds it (VIS-4). See "For the owner", item 4.

[Observed] The moves come from the vision pursuit of 2026-11-09
(`docs/pursuits/2026-11-09-vision-pursuit.md`, "Ranked moves", P1, P3, P5 and
P13), whose evidence is the Redis run `run-ffe579c7`: close sealed a run whose
two final verdicts were not ready, every page still said "Rendered-design
review: none counts", 141 words of apparatus preceded the landing page's first
statement of what the project is, the adopted code excerpt was used 0 times,
and 10 of 24 verified quotations showed source syntax as prose. [Inferred]
Those figures are the pursuit's; this package did not re-run or re-read that
run.

Process: `contracts/candidates/policy-candidates/NORMATIVE-CHANGE-WORKFLOW.md`,
`contracts/candidates/HOW-TO-AUTHOR-A-SYZYGY-SPEC.md`, CC-REV-2.

## The change boundary, sorted first

[Observed] Two changes state parts of P1. This spec states the render
precondition, the repair limits, the review rules and the run record. The
candidate `openspec/changes/polaris-dossier-one-command-run/` (binds nothing)
states the launched run's step order, in its proposed spec line 9: "the
fidelity review and its validation; `render`; the rendered-design review and
its validation; and `close`", and its line 13: "the one command itself adds no
step that decides readiness and removes none". `packages/polaris-dossier/src/polaris.ts`,
the prototype supervisor, implements that order. Each P1 item, sorted:

| P1 item | Stated by | In this delta |
|---|---|---|
| (a) A passed revision may be rendered whatever its reviews say; each render is its own pages | this spec (REQ-034's render paragraph) | yes |
| (a) The launched run renders each passed revision and delivers the design review before fidelity is ready | one-command-run line 9 | no: finding 1 |
| (b) Two declared limits, which limit a resubmission counts against, and how checks that report findings and refused checks count | this spec (REQ-033 limits; REQ-034 counting) | yes |
| (b) How the one command asks for the limits and stops on them | one-command-run lines 9, 11, 27 (by reference to REQ-033) | no: finding 1 (no text change strictly needed) |
| (c) What close records, the site of record, per-field provenance, end state | this spec (REQ-035, new paragraph) | yes |
| (d) Close over an unrendered or unreviewed site: closes with a finding, never refuses | this spec | yes |
| Re-stamp the review-status region at close | this spec (REQ-035) | yes |
| (e) Mechanical design pre-pass, as advisory reader advice that decides nothing | this spec (REQ-034) | yes; it adds no readiness-deciding step, so one-command-run line 13 is not touched |
| (e) A pre-pass that decides readiness | would be one-command-run's | not drafted |
| (f) Launch-consent quotations of REQ-033 | launch-consent change | none broken: below |

This delta amends no byte of the one-command-run candidate, and no byte of
the launch-consent change.

## What changes, in plain words, with each settle-item's answer

### P1 — close only what was shown

- **(a) Render trigger.** [Inferred] The v1.6 text already lets Syzygy "render
  a checked draft"; nothing in it waits for a fidelity verdict. Version 1.7
  says so outright: asked to render, Syzygy renders the latest checked
  revision if it passed, whatever any review of it says; each render is a new
  set of pages bound to its one revision; no verdict on another revision's
  pages counts for it; rendering decides nothing and counts as no review.
  `render.ts` already refuses unless the latest checked revision passed, so
  the operator path needs no new refusal. The wait for a ready fidelity
  verdict is the launched order's (finding 1).
- **Interaction with REQ-035's "pages published after the rendered-design
  review SHALL be the reviewed pages with only the named review-status region
  changed".** Unchanged. Pages rendered from a later revision are a new
  subject, so a design verdict on earlier pages never counts for them; the
  region rule governs the pages a verdict read, and close's re-stamp writes
  only that region.
- **(b) Two repair limits.** The run configuration declares a design-repair
  limit beside the repair-cycle limit: required, a nonnegative integer, 0
  allowed, no default, exactly as the other limits. A resubmission counts
  against exactly one, decided and recorded at its check, before the new
  revision retires the verdicts the decision reads (so the decision never
  has to be re-made from retired evidence). It is a design-repair revision,
  counting against the design-repair limit, when the revision before it
  passed, the rendered-design verdict of record on that revision's latest
  pages has an unresolved blocking finding, and no fidelity verdict of record
  on that revision has one; or when the revision before it was a
  design-repair revision whose check reported findings. Every other
  resubmission counts against the repair-cycle limit. The first revision
  counts against neither; a check Syzygy refuses (past a limit, past the
  deadline, not briefed) freezes no revision and counts against nothing, as
  `check.ts` already does; a resubmission's check is refused once the
  revisions counted against its limit equal that limit, which is how the
  repair-cycle limit is enforced today. The verdict of record (the counted
  verdict of a kind recorded last) decides when several count.
  **Checks that report findings still count** (owner direction
  `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05`, item 3, "Keep the rule;
  the operator chooses the limit when asked"): that direction kept the rule
  that every checked resubmission counts, a check that reports findings
  included, and that stays true; what is new is only which limit a design
  repair counts against. [Observed] That ruling's re-ask
  trigger ("a run ends blocked with most cycles spent repairing check
  failures") was not met by `run-ffe579c7`, per the bead's record, so the
  counting rule is kept, not re-asked. Which limit a revision counted against
  rests on stored verdict records and is Inferred, like the count itself.
- **(c) What close records.** At close Syzygy decides and records: the latest
  passed revision, or that none passed; the site of record (the latest pages
  rendered from that revision, else the latest pages rendered from any
  revision, named with its revision, or that none were rendered); for
  fidelity and for rendered-design, the standing for the site of record (the
  verdict of record, defined as the counted verdict of that kind recorded
  last, ready or with its unresolved blocking findings, or that none counts);
  the revision, inventory revision or pages each other recorded value came
  from; and how the run ended. Labels: close can re-derive which revision
  passed, which pages exist and whether a verdict counts (it names the digest
  of the packet Syzygy rebuilds), so those are Observed in close's own output.
  Whether a verdict is ready, or which blocking findings it names, is the
  review session's assertion in a stored record, so it is Inferred, and so is
  an end state that rests on it. Every standing or end state shown later from
  the run record is Inferred.
- **End states.** "Closed" needs the site rendered from the latest passed
  revision, both standings ready and no other close finding (such as the
  credential finding `close.ts` already reports as `closed-with-finding`);
  anything else, including a run in which no revision passed, is "closed with
  a finding" naming each condition. A later revision that fails its check
  leaves the earlier passed one as latest passed; if it was never rendered,
  close names that as a condition. That is intended: render a passed
  revision before resubmitting.
- **(d) Refuse or label.** Answer: label. Close never refuses for an
  unrendered or unreviewed site; it ends "closed with a finding" naming each
  failing condition, and no surface may call the site reviewed or ready while
  one holds. Reason [Inferred]: a refusal would leave a run whose limits are
  spent, and which therefore cannot be repaired and reviewed again, with no
  closed record at all, and the record is where the truth has to be written;
  the finding makes the same fact visible without that trap. (A run past its
  deadline cannot close under either answer: REQ-033 refuses any step after
  the deadline, and this delta does not change that.) The owner may prefer refusal; see
  "For the owner", item 3.
- **Re-stamp.** At close Syzygy rewrites the named review-status region of
  every page of the site of record with both standings, the end state and the
  instant close decided them, and nothing else, so a counted design verdict on
  those pages stays counted.
- **(e) Mechanical design pre-pass.** Answer: advisory only, and stated here.
  With a render Syzygy may report reader advice, its own measurement of its
  own pages (a page's word count, words above the thesis, no hero). Only
  measurements count as advice; a judgement such as whether a list repeats a
  diagram stays a rendered-design review question. The advice is labelled as Syzygy's measurement, never
  renders on a page, never enters a review packet, is no repair finding,
  decides no readiness and counts as no review. Because it decides nothing, it
  adds no readiness-deciding step under one-command-run line 13. A pixel probe
  (P6) is not this.
- **(f) Launch-consent.** [Observed] The launch-consent change quotes two
  strings of this spec: "explicit, recorded, per-project consent" (spec line
  11) and "Syzygy SHALL write only to its own state directory for the run,
  never to a location derived from the clone's path" (line 13). Its v1.2 draft
  (PR #812, branch `agent/syzygy-pdja-clone-and-url-scope`) quotes the second
  one only. This delta edits neither line. The builder's `sibling_findings`
  checks every double-quoted string of twelve or more characters in the
  launch-consent spec and the one-command-run candidate spec that occurs in
  the v1.6 spec: 13 distinct strings on `main` (2 from launch-consent, 11 from
  one-command-run), and the 1 in PR #812's patch, all still occur in the v1.7
  spec (0 broken). A second method: of the v1.6 lines that carry one of those
  strings (11, 13, 25, 27, 155, 458, 462, 464), the patch edits two, by a line
  diff of the installed and patched bytes. On line 25 it replaces "including
  the repair-cycle count," and on line 458 "the latest earlier round Syzygy
  delivered"; neither lies inside a quoted string.

### P3 — thesis-first landing page and a spine

- **Schema `polaris-dossier-local-draft-v5`.** A v5 draft is a v4 draft under
  every rule this requirement states for one, and must also divide its
  sections into Poles and carry a thesis and three to five pillars. The thesis
  is a claim block of at most 300 Unicode code points (what, for whom, why;
  whether it is one sentence is a review judgement). Each pillar is a claim
  block with a short label, a cost (its own claim block) and the one Pole that
  substantiates it. `check` finds: no Poles, no thesis, an over-long thesis,
  fewer than three or more than five pillars, a pillar with no cost, a pillar
  naming no Pole or a Pole without a page. "Served" means it names a Pole that
  has a page; whether that Pole substantiates it is a design-review question,
  added to REQ-035's criteria.
- **Landing composition** (amends v1.6 line 259's composition for v5 only).
  Title, thesis, then the hero if named. Above the end of that opening
  Syzygy writes only navigation and what the thesis and hero carry under
  their own rules (labels, citation marks, the excerpt's caption, any
  withheld or Unknown presentation); the apparatus (the one sentence, legend,
  review status) comes after, in the ribbon. Then the ribbon, the pillars with costs
  and links, the why section and the map of the Poles. v3 and v4 drafts keep
  v1.6's landing page.
- **The ribbon** (amends the legend clause, line 247). Every narrative page
  carries one paragraph holding the one sentence of REQ-033 (line 27) with its
  appendix link and the named review-status region, followed by a closed
  `How to read this page` details element holding the legend once. It follows
  the landing opening (v5) or the page title. The one sentence and the
  appendix link of line 27 and the scenario "Disclosure placed in the
  appendix" are met by it unchanged; REQ-033 line 27 keeps its bytes. No
  fragment target sits inside the ribbon (the existing collapsible-section
  rule, for the same Chrome Tab-order reason).
- **Brief.** The brief for a v5 run states these rules. The pursuit's "stop
  pasting rules and then reversing them" (P3 slice 4) is not in this delta:
  [Inferred] it may be clause-free and is left to `syzygy-fnry.3`.

### P5 — show, then tell

- **Hero.** A v5 draft may name one hero: a code excerpt under every v1.6 rule
  for one (1 to 60 lines, rendered by Syzygy from its read, Observed, RFC7-10
  anchor, withheld renders Unknown), carrying no agent text beyond its
  language hint. It sits in the landing opening after the thesis. No hero is
  no finding; reader advice may say so.
- **Annotated code walk** (v5 only). A code excerpt plus one or more margin
  notes. Each note names a line range of the excerpt, which places it and is
  no citation, and is a claim block under every rule (own label, citations,
  check, fidelity entry). Notes render after the code as an ordered list,
  never inside the preformatted code. Findings: no note; a note range that is
  malformed, reversed or outside the excerpt. A withheld excerpt's notes still
  render under their own citations, their ranges marked agent-supplied and
  unverified.

### P13 (clause-bound part, owner choice B) — clean quotations

- **The display rule** (amends line 247's "SHALL be the span Syzygy located").
  Syzygy still locates every quotation again at render in the verified blob
  and never trusts a stored range. The located span is the quotation's text in
  the evidence view and the machine form. In the reading view the text is the
  run of the blob's normalised text that the check matched, taken at that
  render through the locator's tracked offsets: not the located span
  normalised afresh, which keeps an open `[` when a span ends inside a
  Markdown link's text, and not the agent's copy or a stored record. A
  quotation that does not re-locate shows nothing in either view.
- **Why the falsifier changes.** [Observed] The check matches by exact
  substring of normalised texts (`quote-fidelity.ts`, `occursIn` and
  `findPiece`), so the matched run is byte-identical to `normaliseForQuote` of
  the agent's quotation. v1.6's falsifier disjunct "a rendered quotation comes
  from the agent's text" therefore cannot be told apart from reading-view
  output. The disjunct now names what a test can observe: the evidence-view or
  machine text is not the located span; the reading-view text differs from the
  matched run at the tracked offsets, keeps markup normalisation removes, or
  renders although its run no longer re-locates. The Oracle computes each
  expected reading-view text from the fixture's own normalised text.
- **Anchor.** RFC7-10's anchor is unchanged: same class, identifier, fragment
  (the located span's byte range) and target state, one anchor for both views.
- **What the reading view changes.** [Observed] By the normalisation's steps
  (`QUOTE_NORMALISATION` in `quote-fidelity.ts`): line endings unified;
  comment leaders (`//`, `#`, `/*`, `*`, `*/`) at line starts and ends
  dropped; Markdown links and images reduced to their text; character
  entities decoded; backslash escapes removed; backticks removed; paired `*`
  and `_` emphasis marks removed, twice, which also drops an identifier's
  paired underscores (`__init__` reads `init`); curly quotation marks
  straightened; the ellipsis character spelled as three dots; and every
  whitespace run, newlines included, made one space, so a multi-line code or
  YAML quotation reads as one line. The legend now says so in brief, and
  that the exact bytes are in the evidence view.
- **Parity.** The machine form carries the located span and the reading view
  the matched run, so the Oracle compares them per quotation by its one
  anchor: the reading-view text against the run, the machine-form text
  against the span.
- **Not changed:** the normalisation itself (line 242), lead-ins and citation
  marks (P8), line-linked citations (`syzygy-fnry.20`, clause-free).

### Carried v1.6 review notes (`syzygy-pdja.27`)

- **Note 3** (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-6-7-RAW.md`, Finding 3):
  the base round is now "the latest earlier round of a fidelity packet", and
  the scenario's THEN line says "everything a fidelity packet with no
  changed-block list would hold" instead of "everything the first round's
  packet would hold".
- **Note 4** (Finding 4): REQ-035's falsifier gains "a surface presents an
  entry the list does not name as carried forward or as confirmed by an
  earlier round", the presentation disjunct the scenario already implied.
- Note 5 (the v1.6 ledger's wording) is not a spec edit and stays with
  `syzygy-pdja.27`.

## For the owner (findings this delta reports and does not settle)

1. **The one-command run.** [Observed] With this delta signed, the operator
   path renders and design-reviews every passed revision, but a launched run
   still follows the candidate's line 9 order (render only after the fidelity
   review), and `polaris.ts` implements that order (render when
   `fidelityState === 'ready'`; design blocked once the shared repair budget is
   spent). P1's "render each checked revision" and "separate budgets" reach the
   launched run only if that change moves. Its line 13 (no added
   readiness-deciding step) is not breached: the advice decides nothing. Its
   line 27 names "`check` refusing past the repair-cycle limit", which stays
   true and does not name the new limit. Options, as recorded on the bead
   (2026-11-09): (a) the candidate's next revision states the launched order by
   reference to the rules this delta sets (render trigger, review order)
   instead of restating line 9, and aligns lines 27 and 48; (b) extend the
   2026-10-14 prototype direction so the supervisor follows this delta before
   the candidate is aligned (that direction authorizes only the candidate
   design's slices 1-5 and "does not itself authorize implementation or waive
   VIS-4's sign-off"); (c) offer the candidate as cleared and amend it by a
   successor; (d) operator path only. Facts: any candidate byte change retires
   its round 3 (2026-10-20) and the P-111 preparation evidence on
   `syzygy-zwja`, which blocks P0 beads `syzygy-bc0g` and `syzygy-iq01` and P1
   `syzygy-qd2t`.
2. **RFC 0007.** [Inferred] RFC7-10 does not need to change: the anchor's form
   and fragment are unchanged and both views carry it. One clause should be
   read with care, RFC7-12: "For adjudicative material — doctrine rules,
   non-goals, requirement text — the operative text a reader relies on is the
   owned artifact's verbatim text, never a paraphrase in normative position".
   A reading-view quotation loses everything the normalisation removes (the
   full list is under P13, "What the reading view changes"): markup, comment
   leaders, escapes, line breaks and repeated spaces, and in code an
   identifier's paired underscores (`__init__` reads `init`). This delta reads
   it as no paraphrase (a fixed, mechanical normalisation with no word chosen
   by anyone) and as RFC7-12's "the target's own text is one step away" (the
   evidence view, the source page and the anchor). The cost is real for code:
   a reading-view quotation of code can misspell an identifier. Limiting the
   display rule to Markdown sources, or to steps that remove only markup,
   would be a narrower choice than B and is the owner's to make. If the owner reads RFC7-12
   otherwise, the display rule needs an RFC 0007 question first, as the bead's
   stop condition says. No RFC 0007 text is changed here.
3. **Close: label, not refuse.** Drafted as label (closed with a finding). A
   refusing close is a one-sentence change if the owner prefers it; its cost is
   a run that can never close once its repair limits are spent. A run past its
   deadline cannot close under either answer (REQ-033 refuses every step after
   the deadline); this delta leaves that as it is.
4. **No decision record for the two selections.** They are recorded on the
   pursuit page and the bead, not under `decisions/`; v1.6's selection had a
   direction record that `warrants.decisions` cites. The sign-off record will
   bind this version either way.
5. **Not in this delta:** the brief compaction (P3 slice 4), reader-intent
   routes (P4), P8's quotation work, and every other move's amendment
   (P6, P7, P8, P11, P12 queue behind this one).

## What does not change

- REQ-polaris-generation-036; every predecessor requirement and scenario of
  the base change and the understanding amendment.
- The normalisation (line 242), RFC 0007, the anchor form, the code excerpt's
  own rules, the Pole rules for v4 drafts, the v3 and v4 landing pages.
- That every checked resubmission counts, a check that reports findings
  included (kept as ruled 2026-11-05), and that a refused check freezes no
  revision; the requirement that each limit be declared with no default.
- The changed-block list's rules, other than notes 3 and 4.
- REQ-033 line 27 (the one sentence, the appendix and the machine form), and
  every sentence the launch-consent and one-command-run changes quote.

## Contract readings the review must test

1. RFC7-10 ("A source anchor is machine-readable and typed: (target class,
   target identifier, optional fragment, target state)"): the display rule
   keeps one anchor per quotation with the located span's byte range as its
   fragment, in both views.
2. RFC7-12 (quoted in "For the owner", item 2): whether a mechanically
   normalised reading-view quotation, with the exact bytes one step away, is
   "a paraphrase in normative position".
3. RFC7-13 ("each altitude is a self-sufficient, honest read"; the owner may
   order altitudes otherwise): the v5 landing page's thesis, hero and pillars
   are claim blocks and an excerpt under every existing rule, so the landing
   altitude stays an honest coarser read; the v1.6 owner ruling for the
   landing-first order (line 259) still covers it.
4. RFC7-33 and RFC7-34 (every distinction machine-readable and recoverable):
   moving the legend into a closed details element moves no distinction out
   of a block's machine attributes or DOM text.
5. REQ-polaris-generation-006 ("A revision SHALL retire dependent review
   evidence"): a design verdict binds to the pages it read; a later
   revision's pages are a new subject, so nothing is carried forward.
6. VIS-2 and REQ-033 ("Syzygy SHALL NOT rest an Observed label on a record
   it stored"): close labels Observed only what it re-derives (which revision
   passed, which pages exist, whether a verdict counts); a verdict's
   readiness, an end state resting on it, and every value shown later from the
   run record are Inferred; which limit a revision counted against is
   Inferred.

## Current and proposed clauses, in full

[Observed] Each block below is exact. Applied in order as replacements to the
installed v1.6 bytes, the Current blocks occur once each and the Proposed
blocks yield the three proposed files byte for byte; `--check` verifies this.

### V1 — `spec.md` — Opening paragraph: version line

Current:

```text
Exact behavioral delta, version 1.6, a candidate on version 1.5.
```

Proposed:

```text
Exact behavioral delta, version 1.7, a candidate on version 1.6.
```

### V2 — `spec.md` — Opening paragraph: binding line

Current:

```text
versions 1.4 and 1.5 stand on their own sign-off records, and these bytes bind only by the owner's sign-off of version 1.6.
```

Proposed:

```text
versions 1.4, 1.5 and 1.6 stand on their own sign-off records, and these bytes bind only by the owner's sign-off of version 1.7.
```

### P1b-1 — `spec.md` — REQ-033: the declared limits

Current:

```text
a repair-cycle limit and a clarification-question limit, each a nonnegative integer, 0 allowed.
```

Proposed:

```text
a repair-cycle limit, a design-repair limit and a clarification-question limit, each a nonnegative integer, 0 allowed.
```

### P1b-2 — `spec.md` — REQ-033: the limits Syzygy enforces

Current:

```text
it SHALL refuse a check or review check beyond the repair-cycle limit and any step after the deadline,
```

Proposed:

```text
it SHALL refuse a check or review check beyond the repair-cycle limit, a check of a design-repair revision beyond the design-repair limit, a design-repair revision counting against that limit alone (REQ-polaris-generation-034), and any step after the deadline,
```

### P1b-3 — `spec.md` — REQ-033: values shown from stored records

Current:

```text
including the repair-cycle count, the instants of earlier steps,
```

Proposed:

```text
including the repair-cycle and design-repair counts and which limit a revision counted against, the instants of earlier steps,
```

### P1b-4 — `spec.md` — REQ-033 scenario "Limits declared by the operator"

Current:

```text
omits both the token and the turn budget, omits the repair-cycle or question limit,
```

Proposed:

```text
omits both the token and the turn budget, omits the repair-cycle, design-repair or question limit,
```

### P1b-5 — `spec.md` — REQ-033 scenario "Zero repair and question limits accepted"

Current:

```text
- **WHEN** the run configuration states a repair-cycle limit of zero or a clarification-question limit of zero, with every other limit valid
- **THEN** Syzygy issues the brief and records the zero limit as operator-declared
- **AND** the first resubmission, or the first recorded question, is refused or fails the check
```

Proposed:

```text
- **WHEN** the run configuration states a repair-cycle limit, a design-repair limit or a clarification-question limit of zero, with every other limit valid
- **THEN** Syzygy issues the brief and records the zero limit as operator-declared
- **AND** the first resubmission that counts against that limit, or the first recorded question, is refused or fails the check
```

### P1b-6 — `spec.md` — REQ-033 scenario "Syzygy's own limits enforced"

Current:

```text
- **WHEN** the agent submits a draft for checking after the repair-cycle limit is spent, or any step is requested after the deadline
```

Proposed:

```text
- **WHEN** the agent submits a draft for checking after the limit it counts against is spent, or any step is requested after the deadline
```

### P1b-7 — `spec.md` — REQ-033 Falsifier: zero limits

Current:

```text
a zero repair-cycle or question limit is refused;
```

Proposed:

```text
a zero repair-cycle, design-repair or question limit is refused;
```

### P1b-8 — `spec.md` — REQ-034: which limit a resubmission counts against

Current:

```text
Each resubmission is a new draft revision with its own identity; it counts against the repair-cycle limit, and it retires earlier check results and dependent review evidence (REQ-polaris-generation-006).
```

Proposed:

```text
Each resubmission is a new draft revision with its own identity; it counts against exactly one limit of REQ-polaris-generation-033, and it retires earlier check results and dependent review evidence (REQ-polaris-generation-006). Syzygy SHALL decide which limit at the resubmission's check, from its records as they stand before the resubmission retires anything, and SHALL record that decision with the revision; a later step reads the recorded decision and never decides it again. A resubmission is a design-repair revision, and counts against the design-repair limit, when the revision before it is a design-repair revision whose check reported findings, or when the revision before it passed its check, the rendered-design verdict of record (REQ-polaris-generation-035) on the latest pages rendered from that revision has an unresolved blocking finding, and no fidelity verdict of record on that revision has one. Every other resubmission counts against the repair-cycle limit, including one that follows a check that reported findings on a revision that counted against that limit. The first draft revision counts against neither limit, a check Syzygy refuses freezes no revision and counts against no limit, and Syzygy SHALL refuse a resubmission's check when the revisions already counted against its limit equal that limit.
```

### P1b-9 — `spec.md` — REQ-034 scenario "Repair loop counted"

Current:

```text
- **THEN** the resubmission is a new revision whose check counts against the repair-cycle limit, and earlier check results and dependent reviews are retired
```

Proposed:

```text
- **THEN** the resubmission is a new revision whose check counts against the repair-cycle limit, or against the design-repair limit where it is a design-repair revision, and earlier check results and dependent reviews are retired
```

### P1a-1 — `spec.md` — REQ-034: render of every passed revision, and reader advice

Current:

```text
Syzygy SHALL render a checked draft through the existing multi-page dossier renderer.
```

Proposed:

```text
Syzygy SHALL render a checked draft through the existing multi-page dossier renderer. When asked, Syzygy SHALL render the latest checked draft revision if its check passed, whatever the state of any review of it; each render is a new set of pages bound to the one revision it was rendered from, and no review verdict on pages rendered from another revision counts for them (REQ-polaris-generation-035). Rendering decides no readiness and counts as no review. With a render Syzygy MAY report reader advice, which is its own mechanical measurement of the pages it rendered, such as a page's word count, the words above a landing page's thesis, or a dossier with no hero excerpt; the advice SHALL be labelled as Syzygy's measurement of its own pages, SHALL NOT render on a page or enter a review packet, and is no repair finding, decides no readiness and counts as no review.
```

### P13-1 — `spec.md` — REQ-034: what a rendered quotation shows

Current:

```text
Every rendered quotation SHALL be set off as a quotation and SHALL be the span Syzygy located, at render, in the blob it read and verified at the pinned revision, never the agent's copy of it and never a byte range taken on trust from a stored record.
```

Proposed:

```text
Every rendered quotation SHALL be set off as a quotation, and Syzygy SHALL locate it again at render in the blob it read and verified at the pinned revision, never taking a byte range on trust from a stored record. The span Syzygy so located SHALL be the quotation's text in the evidence view and in the machine form, never the agent's copy of it. In the reading view the quotation's text SHALL be the run of the blob's normalised text that the quotation check above matched, taken at that render from the blob's text under that check's normalisation at the offsets Syzygy's locator tracked for the located span; it SHALL NOT be the located span normalised afresh on its own, which can keep markup the check removed (a span that ends inside a Markdown link's text keeps the link's opening `[`), and SHALL NOT be taken from the agent's copy or from a stored record. A quotation that does not re-locate at render SHALL show no text in either view. The anchor below, whose fragment is the located span's byte range, is the same for both views.
```

### P13-2 — `spec.md` — REQ-034 scenario "Quotation verified against the pinned blob"

Current:

```text
- **THEN** Syzygy records the span's byte range, locates the span again at render in the blob it verified, and renders it from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest
```

Proposed:

```text
- **THEN** Syzygy records the span's byte range, locates the span again at render in the blob it verified, and renders it from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest, showing the located span in the evidence view and the run of the blob's normalised text that the check matched in the reading view
```

### P3-1 — `spec.md` — REQ-034: the ribbon and the legend

Current:

```text
Each narrative page SHALL carry once a Syzygy-written legend: a numbered mark cites a source; text with such a mark is the agent's reading of that source; the mark `judgement` is the agent's own assessment; the mark `framing` makes no claim; a set-off quotation is verified against the repository; `Not established`
```

Proposed:

```text
Each narrative page SHALL carry a ribbon: one paragraph holding the one sentence of REQ-polaris-generation-033 with its link to the appendix and the named review-status region of REQ-polaris-generation-035, followed by a details element, closed by default, whose summary is the Syzygy-written words `How to read this page` and whose body holds, once, the page's Syzygy-written legend; no fragment target sits inside the ribbon. On the landing page of a schema-v5 draft the ribbon follows the page's opening, and on every other narrative page it follows the page's title; nothing else Syzygy writes about the run, the draft or its review sits above it. The legend says: a numbered mark cites a source; text with such a mark is the agent's reading of that source; the mark `judgement` is the agent's own assessment; the mark `framing` makes no claim; a set-off quotation is verified against the repository and shows the source's text as the check compares it, with markup, comment markers and escapes left out, entities decoded, quotation marks straightened and each run of whitespace made one space, its exact bytes being in the evidence view; `Not established`
```

### P5-1 — `spec.md` — REQ-034: the presentation elements

Current:

```text
a set of cards, a collapsible section and a code excerpt.
```

Proposed:

```text
a set of cards, a collapsible section, a code excerpt and, in a schema-v5 draft, an annotated code walk.
```

### P5-2 — `spec.md` — REQ-034: the annotated code walk

Current:

```text
If a withheld excerpt displays its submitted line range, the range SHALL be disclosed within that Unknown presentation as agent-supplied and unverified, never as a Syzygy-verified range or the blob's length.
```

Proposed:

```text
If a withheld excerpt displays its submitted line range, the range SHALL be disclosed within that Unknown presentation as agent-supplied and unverified, never as a Syzygy-verified range or the blob's length.

An annotated code walk is one code excerpt, under every rule for a code excerpt, and one or more margin notes. Each note names an inclusive line range of that excerpt, which places the note and is no citation, and is a claim block under every rule for a claim block: it carries its own label, citations and any quotation, Syzygy checks it and reports its findings as for any claim block, and the fidelity verdict carries an entry for it. Syzygy SHALL report a repair finding for a walk with no note and for a note whose line range is malformed, reversed or outside the excerpt's range. Syzygy SHALL render the excerpt as a code excerpt renders and each note after it, never inside the preformatted code, so that no note's text appears as the project's code. Where the excerpt is withheld, each note still renders under its own citations and the rules for a withheld item, and its line range is marked agent-supplied and unverified.
```

### P5-3 — `spec.md` — REQ-034: how elements render

Current:

```text
a details element with its summary, preformatted code)
```

Proposed:

```text
a details element with its summary, preformatted code, and for an annotated code walk preformatted code followed by an ordered list of its notes, each headed by its line range)
```

### P3-2 — `spec.md` — REQ-034: schema v5, thesis, pillars, hero and the landing page

Current:

```text
each altitude stays a true coarser account and the verbatim leaf stays reachable.
```

Proposed:

```text
each altitude stays a true coarser account and the verbatim leaf stays reachable.

A draft in schema `polaris-dossier-local-draft-v5` is a schema-v4 draft under every rule this requirement states for one, and SHALL also divide its sections into Poles and carry a thesis and three to five pillars; it MAY name one hero. The thesis is a claim block, under every rule for a claim block, of at most 300 Unicode code points, stating what the project is, for whom and why; whether it is one sentence and says those three things is a review judgement. Each pillar is a claim block under every rule for a claim block, with a short label under the rules for an element's short label, a cost, which is a claim block of its own stating what the pillar's choice costs, and the identity of the one Pole that substantiates it. Syzygy SHALL report a repair finding for a schema-v5 draft without Poles, without a thesis or with one over 300 Unicode code points, with fewer than three or more than five pillars, with a pillar that has no cost, and with a pillar that names no Pole of the draft or names one that has no page of its own; a pillar naming a Pole that has a page is served, and whether that Pole substantiates it is a review judgement. The hero is a code excerpt under every rule for a code excerpt and carries no text of the agent's beyond its language hint. The landing page of a schema-v5 draft SHALL open with, in this order, the title, the thesis and the hero where the draft names one, and above the end of that opening Syzygy SHALL write nothing but the site's navigation and what the thesis and the hero carry under their own rules (their labels, citation marks and caption, and any withheld or Unknown presentation of either); the ribbon follows it, then the pillars, each with its cost and a link to its Pole's page, then the why section and the map of the Poles as above. A hero whose blob is withheld renders in its place as a withheld code excerpt does. With no hero the opening ends at the thesis, and reader advice MAY say so; a missing hero is no repair finding. The brief for a run whose draft schema is v5 SHALL state these rules. Under the owner's sign-off of this version the thesis, the hero and the pillars open the landing page's altitude, which stays a true coarser account under RFC7-13.
```

### S34 — `spec.md` — REQ-034: added scenarios

Current:

```text
- **THEN** its summary shows the count of those Unknown claims even while collapsed
- **AND** no claim loses its own label or fidelity entry
```

Proposed:

```text
- **THEN** its summary shows the count of those Unknown claims even while collapsed
- **AND** no claim loses its own label or fidelity entry

#### Scenario: Design repairs drawn from their own limit

- **WHEN** a draft revision passed its check, the rendered-design verdict of record on its latest pages has an unresolved blocking finding, no fidelity verdict of record on it has one, and the agent resubmits after the repair-cycle limit is spent
- **THEN** Syzygy decides at the check, before anything is retired, that the resubmission is a design-repair revision counting against the design-repair limit, records that with the revision, and refuses the check only when that limit is spent; if that check reports findings, the next resubmission is also a design-repair revision
- **AND** a resubmission after a fidelity verdict of record with an unresolved blocking finding, or after a check that reported findings on a revision that counted against the repair-cycle limit, counts against the repair-cycle limit, a refused check counts against neither limit, and each count is labelled Inferred

#### Scenario: Every passed revision renders as its own pages

- **WHEN** a draft revision passes its check while no fidelity verdict on it counts, it is rendered, and a later revision then passes and is rendered
- **THEN** each render is a new set of pages bound to its own revision, and a rendered-design verdict on the earlier pages does not count for the later pages
- **AND** rendering neither decides readiness nor counts as a review

#### Scenario: Reader advice decides nothing

- **WHEN** Syzygy reports reader advice with a render, including that a schema-v5 draft names no hero
- **THEN** the advice is labelled as Syzygy's measurement of its own pages, appears on no rendered page and in no review packet, and is no repair finding
- **AND** readiness and the count of every review are the same with and without it

#### Scenario: Quotation of commented lines shown clean

- **WHEN** a block's quotation verifies against cited lines that begin with a comment leader
- **THEN** the reading view shows the quotation as the run of the blob's normalised text that the check matched, without the comment leaders, and the evidence view and the machine form show the located bytes with them
- **AND** both views carry the one anchor whose fragment is the located span's byte range

#### Scenario: Quotation ending inside a Markdown link's text

- **WHEN** a block's quotation verifies against a Markdown blob, and the located span ends inside the text of a Markdown link
- **THEN** the reading view shows the run of the blob's normalised text that the check matched, with no bracket or link target of that link
- **AND** the evidence view shows the located span's exact bytes, its unclosed `[` included

#### Scenario: Quotation that no longer re-locates

- **WHEN** at render a quotation does not re-locate in the blob Syzygy read and verified at that render
- **THEN** no text of the quotation shows in the reading view or the evidence view
- **AND** no stored byte range and no copy of the agent's is shown in its place

#### Scenario: Ribbon on a narrative page

- **WHEN** a narrative page is rendered
- **THEN** after the landing page's opening for a schema-v5 draft, or after the page's title otherwise, it carries the ribbon: the one sentence with its link to the appendix and the named review-status region, then a details element, closed by default and headed `How to read this page`, holding the legend once
- **AND** nothing else Syzygy writes about the run, the draft or its review sits above the ribbon, and no fragment target lies inside it

#### Scenario: Thesis-first landing page

- **WHEN** a schema-v5 draft with a thesis, four pillars each naming a Pole that has a page, and a hero is rendered
- **THEN** the landing page opens with the title, the thesis and the hero, in that order, with nothing Syzygy writes above the hero's end but navigation and the thesis's and the hero's own labels, citation marks and caption, and then carries the ribbon, the pillars with their costs and links, the why section and the map of the Poles
- **AND** the thesis, each pillar and each cost is checked as a claim block and has its own entry in the fidelity verdict, and the hero renders from Syzygy's read as a code excerpt does

#### Scenario: Thesis and pillars checked

- **WHEN** a schema-v5 draft has no Poles, no thesis, a thesis over 300 Unicode code points, two or six pillars, a pillar with no cost, or a pillar naming no Pole of the draft or a Pole with no page of its own
- **THEN** Syzygy reports a repair finding for each
- **AND** a draft that names no hero gets no repair finding for it

#### Scenario: Annotated code walk

- **WHEN** a schema-v5 draft carries an annotated code walk whose excerpt cites at most 60 lines of an admitted blob and whose notes each name lines within it
- **THEN** the excerpt renders from Syzygy's read as an Observed quotation, and each note renders after the code as a claim block with its own entry in the fidelity verdict, never inside the preformatted code
- **AND** a walk with no note, or a note whose line range is malformed, reversed or outside the excerpt's range, is a repair finding, and the notes of a withheld excerpt render under their own citations with their line ranges marked agent-supplied and unverified
```

### C34 — `spec.md` — REQ-034 Case

Current:

```text
and varying an uncited block's judgement mark and schema version, a claim block's or inventory entry's withheld spans, the screening act's presence, a page's scripts on or off, and Pole counts and membership.
```

Proposed:

```text
and varying an uncited block's judgement mark and schema version, a claim block's or inventory entry's withheld spans, the screening act's presence, a page's scripts on or off, and Pole counts and membership; and varying quotations of commented lines and of Markdown links whose located span ends inside the link text, the blob a quotation re-locates in at render, a schema-v5 draft's thesis, pillars, costs, hero and annotated code walks, which limit each resubmission counts against as the check, fidelity and rendered-design records vary, the review state of each revision rendered, and the reader advice reported.
```

### O34 — `spec.md` — REQ-034 Oracle

Current:

```text
Expected findings and byte ranges computed from the fixture blobs outside the checker, by an independent byte search over the fixture's own normalised text;
```

Proposed:

```text
Expected findings and byte ranges computed from the fixture blobs outside the checker, by an independent byte search over the fixture's own normalised text, with each quotation's expected reading-view text the run of that normalised text the search found, and the reading view and the machine form compared per quotation by its anchor, the reading-view text against that run and the machine-form text against the located span;
```

### F34-1 — `spec.md` — REQ-034 Falsifier: the quotation disjunct

Current:

```text
a rendered quotation comes from the agent's text, the working tree or an altered stored range;
```

Proposed:

```text
a quotation's evidence-view or machine-form text is not the span Syzygy located at that render, or comes from the working tree or an altered stored range; a reading-view quotation differs from the run of the blob's normalised text that the check matched at the locator's tracked offsets, keeps markup that normalisation removes, or renders although its run no longer re-locates;
```

### F34-2 — `spec.md` — REQ-034 Falsifier: added disjuncts

Current:

```text
a page lacks the one sentence, its link or its machine disclosure; a Pole rule passes when broken.
```

Proposed:

```text
a page lacks the one sentence, its link or its machine disclosure; a Pole rule passes when broken; a narrative page lacks its ribbon, carries its legend outside the ribbon's details element or its ribbon below other text Syzygy writes about the run, the draft or its review, or carries a fragment target inside the ribbon; a resubmission counts against a limit other than the one this requirement assigns it, against both or against none, or a design-repair revision is refused while the design-repair limit is unspent; a passed latest revision is refused a render because of the state of a review of it, or a rendered-design verdict on pages of one revision counts for pages of another; reader advice renders on a page, enters a review packet, is a repair finding or changes readiness; a schema-v5 landing page opens otherwise than with the title, the thesis and the named hero in that order, or carries text Syzygy writes above the end of that opening other than navigation and what the thesis and the hero carry under their own rules, or lacks one of those; a schema-v5 thesis, pillar or cost escapes a check a claim block meets or lacks its fidelity entry; a schema-v5 rule on Poles, thesis length, pillar count, cost or served Pole passes when broken, or a missing hero is a repair finding; a hero or an annotated walk's excerpt renders the agent's text; a margin note renders inside the preformatted code or lacks its fidelity entry, or a walk with no note, or a note whose line range is malformed, reversed or outside its excerpt, passes.
```

### N3-1 — `spec.md` — REQ-035: the base round is a fidelity round (carried v1.6 note 3)

Current:

```text
Its base round is the latest earlier round Syzygy delivered into that same directory
```

Proposed:

```text
Its base round is the latest earlier round of a fidelity packet that Syzygy delivered into that same directory
```

### N3-2 — `spec.md` — REQ-035 scenario "Later round carries a changed-block list" (carried v1.6 note 3)

Current:

```text
the packet holds everything the first round's packet would hold for the current frozen draft and inventory
```

Proposed:

```text
the packet holds everything a fidelity packet with no changed-block list would hold for the current frozen draft and inventory
```

### P3-3 — `spec.md` — REQ-035: rendered-design criteria

Current:

```text
whether a list repeats a diagram, and whether the page reads as a person explaining the project.
```

Proposed:

```text
whether a list repeats a diagram, whether the page reads as a person explaining the project, and, for a schema-v5 draft, whether the thesis says in one sentence what the project is, for whom and why, and whether each pillar's Pole substantiates it.
```

### P3-4 — `spec.md` — REQ-035 scenario "Rendered-design packet carries its questions"

Current:

```text
- **THEN** its criteria ask each question this requirement names for the opening, the lead, the warnings, page length, a list repeating a diagram and whether the page reads as a person explaining the project
```

Proposed:

```text
- **THEN** its criteria ask each question this requirement names for the opening, the lead, the warnings, page length, a list repeating a diagram and whether the page reads as a person explaining the project, and, for a schema-v5 draft, the thesis and the pillars
```

### P1c-1 — `spec.md` — REQ-035: what close records, and close over an unreviewed site

Current:

```text
and the inventory's completeness over the clone and its preparation from the whole source population. The review page SHALL disclose that distinction.
```

Proposed:

```text
and the inventory's completeness over the clone and its preparation from the whole source population. The review page SHALL disclose that distinction.

At close Syzygy SHALL record in the run record, deciding each at close from the records and objects it verifies then, as at render: the latest draft revision whose check passed, or that none did; the site of record, which is the latest set of pages rendered from that revision or, where none was, the latest set of pages rendered from any revision, named with the revision it was rendered from, or that no pages were rendered; for each review kind, fidelity and rendered-design, its standing for the site of record, which is its verdict of record on the revision the site was rendered from (fidelity) or on the site's pages (rendered-design), ready or with its unresolved blocking findings, or that none counts; for every other value the record shows, the draft revision, inventory revision or set of pages it was taken from; and how the run ended. A review kind's verdict of record on a revision or a set of pages is the counted verdict of that kind on it that Syzygy recorded last. A run ends closed when the site of record was rendered from the latest passed revision, both standings are ready and close reports no other finding, and closed with a finding otherwise, the finding naming each condition that fails: no revision passed its check, the latest passed revision has no rendered pages, a review kind has no counted verdict for the site of record, a verdict of record has an unresolved blocking finding, or close reports another finding this change states. Syzygy SHALL NOT refuse to close for those conditions, and SHALL NOT state or render the site of record as reviewed or ready while one holds. At close Syzygy SHALL rewrite the named review-status region of every page of the site of record to state both standings, how the run ended and the instant close decided them, and SHALL change nothing outside that region, so that a counted rendered-design verdict on those pages stays counted. In close's own output, which revision passed, the site of record, whether a verdict counts for it, and an end state resting on those alone are Observed as close decides them; whether a verdict is ready or names an unresolved blocking finding is what the review session said and is Inferred, as is an end state that rests on it; wherever a later step or page shows a standing or the end state from the run record it is Inferred, as REQ-polaris-generation-033 requires of a value shown from a stored record.
```

### S35 — `spec.md` — REQ-035: added scenarios

Current:

```text
- **AND** no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round
```

Proposed:

```text
- **AND** no surface presents an entry the list does not name as carried forward or as confirmed by an earlier round

#### Scenario: Close names each review's standing

- **WHEN** a run closes after the latest passed draft revision was rendered, and both the fidelity verdict of record on that revision and the rendered-design verdict of record on its pages are ready, and close reports no other finding
- **THEN** the run record names that revision, its pages as the site of record, both standings, the revision or pages each other recorded value was taken from, and that the run ended closed, with each verdict's readiness and the end state labelled Inferred
- **AND** the review-status region of every page of the site of record states both standings and the instant close decided them, and nothing outside that region changes

#### Scenario: Close over a newer unrendered or unreviewed revision

- **WHEN** a run closes while no draft revision passed its check, or the latest passed draft revision has no rendered pages, or the site of record has no counted verdict of a review kind, or a verdict of record for it has an unresolved blocking finding
- **THEN** Syzygy closes the run with a finding naming each such condition, and names the site of record with the revision it was rendered from
- **AND** close is not refused for them, no surface states the site of record as reviewed or ready, and its pages' review-status region names the finding
```

### C35 — `spec.md` — REQ-035 Case

Current:

```text
whether each earlier round's verdict was recorded before or after the later delivery, counted, failed or refused, three or more rounds in one directory, and the base round's stored inputs at validation and render.
```

Proposed:

```text
whether each earlier round's verdict was recorded before or after the later delivery, counted, failed or refused, three or more rounds in one directory, and the base round's stored inputs at validation and render; and closing runs whose latest passed revision is rendered or not, and whose fidelity and rendered-design verdicts for the site of record are absent, failed, blocking or ready.
```

### O35 — `spec.md` — REQ-035 Observable

Current:

```text
the printed start commands, the delivery records and the waiting command's outcomes.
```

Proposed:

```text
the printed start commands, the delivery records and the waiting command's outcomes; the run record's close fields and end state, and every page's review-status region before and after close.
```

### F35 — `spec.md` — REQ-035 Falsifier: added disjuncts (with carried v1.6 note 4)

Current:

```text
or which round is the base, the session's reading of the list, or the reviewer's consideration of the entries the list does not name, is shown as Observed.
```

Proposed:

```text
or which round is the base, the session's reading of the list, or the reviewer's consideration of the entries the list does not name, is shown as Observed; a surface presents an entry the list does not name as carried forward or as confirmed by an earlier round; a base round is a round of a packet other than a fidelity packet; close refuses for an unrendered or unreviewed site of record, ends such a run closed rather than closed with a finding, or omits a failing condition from its finding; the site of record is stated or rendered as reviewed or ready while a condition fails; close changes a page outside its review-status region, or leaves a page of the site of record whose region does not state both standings; a recorded value lacks the revision or pages it was taken from; a run with another close finding ends closed; a verdict other than the one recorded last decides a standing or which limit a resubmission counts against; a verdict's readiness or blocking findings, or an end state resting on them, is shown as Observed; or a standing or end state read from the run record is shown as Observed.
```

### D1 — `design.md` — design.md: version line

Current:

```text
> **Version 1.6.** Explains the requirements in
```

Proposed:

```text
> **Version 1.7.** Explains the requirements in
```

### D2 — `design.md` — design.md: binding line

Current:

```text
> and this text binds only by the owner's sign-off of version 1.6. It is not an
```

Proposed:

```text
> and this text binds only by the owner's sign-off of version 1.7. It is not an
```

### D3 — `design.md` — design.md: a version 1.7 section

Current:

```text
## What remains open in the implementation
```

Proposed:

```text
## Close, renders, repairs, the landing page and quotations (version 1.7)

Version 1.7 answers the owner's review of the Redis run `run-ffe579c7`, whose
close sealed pages no counted review had found ready.

- **Every passed revision can be rendered.** `render` takes the latest
  revision whose check passed whatever its reviews say, and each render is
  its own pages, so a design review can start before the fidelity repairs
  are spent. A design verdict binds to the pages it read and never counts
  for pages of another revision. With a render Syzygy may report reader
  advice: its own measurement of its pages (word counts, words above the
  thesis, no hero). Advice decides nothing, appears on no page and enters
  no packet.
- **Two repair limits.** `run.json` declares a design-repair limit beside
  the repair-cycle limit; both are required and may be 0. A resubmission
  answering the blocking design verdict of record, when no fidelity verdict
  of record on the same revision blocks, is a design-repair revision and
  counts against the design-repair limit; so is a resubmission after a
  design-repair revision whose check reported findings. `check` decides
  and records the limit before the new revision retires anything. Every
  other resubmission counts against the repair-cycle limit; a refused check
  freezes no revision and counts against neither. The owner kept on
  2026-11-05 the rule that every checked resubmission counts, one after a
  check that reported findings included; that still holds, and only the
  limit a design repair counts against is new.
- **An honest close.** `close` names the latest passed revision, the site
  of record, each review kind's standing for it, the revision each recorded
  value came from and how the run ended. It never refuses for an unrendered
  or unreviewed site: it closes with a finding naming each condition, and
  restamps every page's review-status region, which changes nothing a
  counted design review read. A verdict's readiness is the review session's
  word and is shown Inferred; that a verdict counts is Syzygy's own.
- **Thesis first.** Schema `polaris-dossier-local-draft-v5` requires Poles,
  a `thesis` (one claim block, at most 300 code points) and 3-5 `pillars`
  (`{label, block, cost, pole}`), and allows one `hero` code excerpt. The
  landing page opens title, thesis, hero, with only navigation and their own
  labels and caption above; then
  the ribbon, the pillars, the why section and the map of the Poles.
- **The ribbon.** On narrative pages the one sentence, the appendix link
  and the review-status region form one paragraph, and the legend moves
  into a closed `How to read this page` details element just after it.
- **Annotated code walks.** A `codeWalk` element is a code excerpt plus
  margin notes; each note is a claim block placed by a line range of the
  excerpt, rendered after the code as an ordered list.
- **Clean quotations.** The reading view shows the run of the blob's
  normalised text that the quotation check matched, taken through the
  locator's offset map at render; the evidence view and machine form keep
  the located bytes, and the RFC7-10 anchor is unchanged. Re-normalising
  the located span alone is not used: a span ending inside a Markdown
  link's text would keep its `[`. The reading view therefore shows the
  check's normalisation: markup, comment markers, escapes and paired
  emphasis marks (an identifier's paired underscores among them) dropped,
  entities decoded, quotation marks straightened and whitespace collapsed.

## What remains open in the implementation
```

### R1 — `proposal.md` — proposal.md: a version 1.7 head

Current:

```text
# Polaris dossier local-agent mode

> **Version 1.6 changes.**
```

Proposed:

```text
# Polaris dossier local-agent mode

> **Version 1.7 changes.** After the owner's review of a Redis run whose close
> sealed pages no counted review had found ready, `render` takes every passed
> revision, design repairs get their own declared limit, and `close` records
> each review's standing for the site it names and closes with a finding
> rather than as reviewed. A schema-v5 draft opens its landing page with a
> thesis and an optional verified hero excerpt, carries three to five pillars
> and may use annotated code walks; narrative pages fold their notice, legend
> and review status into one ribbon; and a quotation reads as clean text, with
> its exact bytes in the evidence view. Two v1.6 review notes are carried in.
> It binds only by the owner's sign-off.

> **Version 1.6 changes.**
```

### R2 — `proposal.md` — proposal.md: predecessor and binding lines

Current:

```text
> predecessor of version 1.5, and version 1.5 of version 1.6.
> These bytes bind only by the owner's sign-off of version 1.6 (VIS-4).
```

Proposed:

```text
> predecessor of version 1.5, version 1.5 of version 1.6, and version 1.6 of
> version 1.7.
> These bytes bind only by the owner's sign-off of version 1.7 (VIS-4).
```

