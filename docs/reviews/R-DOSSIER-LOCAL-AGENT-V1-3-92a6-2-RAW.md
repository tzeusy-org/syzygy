# Review R-DOSSIER-LOCAL-AGENT-V1-3-92a6-2 — polaris-dossier-local-agent-mode v1.3
Reviewed commit: 92a6d2d091d7d7595dc33eee32665525d6b0ec94
Manifest SHA-256: 5c11c59188489b62611817efb13e6ff25c71a56f712cdc40c2dd444c7d56a6b3
Verdict: CONFIRM WITH EXCEPTIONS

Method. [Observed] I made a fresh `git clone --no-hardlinks` of the checkout,
detached at `92a6d2d0`. `git apply` of `proposed/spec.md.patch`,
`design.md.patch` and `proposal.md.patch` all applied cleanly. I hashed the
post-apply spec by Python `hashlib` and by `sha256sum`; both give the value
above. The v1.2 bytes are the `HEAD` blobs: `git diff --stat` against tag
`polaris-dossier-local-agent-mode-v1.2` is empty for the change directory.
I read the post-apply bytes beside them by `git diff`. I also read the
round-1 raw (`docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-ffc2-1-RAW.md`) and
`REVIEW-1-DISPOSITIONS.md` to check the repairs. I read no observed
repository body, started no `syzygy polaris` or dossier run, called no model
provider and used no network.

## Findings

**Finding 1 — "byte for byte" excerpt rendering and an oracle that compares bytes leave HTML escaping unstated and untested** (note)

This concerns the patches (`spec.md.patch`). [Observed] The paragraph says
Syzygy "SHALL render those lines from the blob it read and verified at the
pinned revision, byte for byte". The Oracle fixes "each code excerpt's
expected bytes read from the fixture blob outside the renderer". The Case
varies "each code excerpt's line count and screening outcome", but not what
the cited lines contain.

[Inferred] Read literally, "byte for byte" plus an oracle that compares
bytes passes a renderer that writes a blob's `<`, `&` or `</pre>` into the
page unescaped. It also fails a renderer that escapes them correctly. Such a
renderer could let a cited file inject markup, for example a forged label
marking, without any script, and the falsifier arm "an element renders a
script" catches only script. The same sentence's "inert static HTML ...
with no script" governs, and the existing quotation and source-page
rendering already has to escape. So a careful implementer will get this
right, and the rule is not open to running code under the unchanged policy.

Two changes would close the gap on the page:
- say the excerpt's *text* is the lines byte for byte, escaped as text;
- add cited lines that carry markup characters to the Case, with a
  falsifier arm "an excerpt's bytes render as markup".

How a non-UTF-8 or binary blob is shown is also unstated. [Unknown]

**Finding 2 — A collapsed section can hide an Unknown or a qualification by default** (note)

This concerns the patches (`spec.md.patch`). [Observed] Claims inside a
collapsible section keep their marking. The only rule on `details` is that
"no fragment target SHALL sit inside a collapsible section". Nothing says
what the `summary` must disclose about the claims it hides.

[Inferred] A draft can put an Unknown claim, a contradiction or a limiting
qualification inside a closed `details`. A reader who never opens it sees an
argument without its gap. This is not meaning carried by colour, so it is
outside criterion 5's literal question. It does bear on rendering the gap
honestly, and the existing guardrail on reading selections dropping
qualifications points the same way. The rendered-design review can catch it.
One clause would make it mechanical, for example a closed section's summary
showing a count of the Unknown claims inside it.

**Finding 3 — A table cell's claim is read through its headings, and the spec does not say the cell is judged that way** (note)

This concerns the patches (`spec.md.patch`). [Observed] A cell is a claim
block with its own label and citations. The column and row labels "name
what [they] head" and carry no claim.

[Inferred] A cell such as "Yes" under "Persists to disk" and against "RDB"
states its fact only together with both headings. The fidelity packet holds
the frozen draft, and with it the headings (REQ-polaris-generation-035: "the
frozen subject (the draft with its understanding record)"), so a reviewer
can read the composite. But 035's "draft-to-source support for every claim
block" does not say the cell is judged as read with its headings. A
reviewer who judges the bare cell text can find "Yes" supported by any
citation. One phrase would fix it in 034's element paragraph: "a table
cell's claim is the cell read with its row and column labels". A
review-criteria change under the implementation bead would also do. This is
the same class of residual the spec already states honestly for labels.

**Finding 4 — The callout tone and the order of steps carry meaning no rule classes** (note)

This concerns the patches (`spec.md.patch`, `design.md.patch`). [Observed]
`tone` (`note`, `tip`, `caution`, `important`) is not in the short-label list
and is not a claim. The spec governs only how it renders ("stated in its
words, never by colour alone"). `steps` renders as an `ol`.

[Inferred] A `caution` callout tells the reader something about the subject
(that it is hazardous). An ordered list asserts a sequence that each step's
own claim may not state. Both are small, closed and visible, and both are
open to the same reviews as labels. Naming them beside the short labels as
presentation would put them inside the stated residual rather than beside
it.

**Finding 5 — A code excerpt's `language` label states a fact about the file** (note)

This concerns the patches (`spec.md.patch`). [Observed] Short labels "SHALL
state no fact about the subject", and "a code excerpt's language" is one of
them.

[Inferred] "Python" over an excerpt is a claim about the cited file. It is
unchecked and renders with no label. The stakes are low. Either accept the
language as a presentation hint in so many words, or derive it from the
path rather than taking it from the agent.

**Finding 6 — "Standing where a claim block may stand" is broader than the design's nesting** (note)

This concerns the patches. [Observed] The spec says elements stand "where a
claim block may stand". Claim blocks also stand inside a callout, inside a
collapsible section and as a block's child, so by the spec's words an
element may stand there too. The design narrows this:
- a callout's `children` are blocks;
- `steps` items are "blocks without children";
- `details` holds "blocks, or any element but `details`".

The design's numeric limits (columns, rows, item counts) are not in the
spec either.

[Inferred] 034's first check ("the draft validates against its declared
schema version") makes the schema the place where structure is decided, so
the two are not in conflict. Still, "standing where a claim block may stand
in a section or deep dive" would match the design, which puts elements "in
the existing `paragraphs` arrays".

**Finding 7 — "the citation rules ... apply to it" names rules written for labelled blocks** (note)

This concerns the patches (`spec.md.patch`). [Observed] 034 defines "The
citation rules" as what an Inferred, Unknown or non-normative block must
cite. A code excerpt has no label. The rule a cited path and line range must
meet is a separate check: "every cited path names a blob at the pinned
revision, and every cited line range lies within that blob".

[Inferred] That check reaches the excerpt's citation, and the scenario "Code
excerpt over its limit" names "lines beyond the end of the blob", so nothing
is lost. Naming the check rather than "the citation rules" would be exact.
Also, "a repair finding for one of more" is elliptical: it means a citation
of more than 60 lines. A zero-line or inverted range falls to the schema
check and is not named.

**Finding 8 — "120 characters" names no unit** (note)

This concerns the patches. [Inferred] Code points, UTF-16 units and bytes
differ for non-ASCII labels, and an independent oracle must pick one. State
the unit (for example Unicode code points) in the spec or the design.

**Finding 9 — Two scenarios' AND clauses describe the passing case, not the WHEN** (note)

This concerns the patches (`spec.md.patch`). [Observed] "Claim inside a
presentation element checked as a block": the WHEN is a failing claim, and
the AND says "each claim that passes renders with its label's marking and
has its own entry". "Short label carries no claim": the WHEN is a failing
label, and the AND says "a label that passes renders as plain text".

[Inferred] Each AND is falsifiable, and the falsifier carries both arms. But
it tests a case the WHEN does not set up, which is the shape round-1
Finding 7 split out of the excerpt scenario. Moving the passing arm into the
"rendered inert" scenario, or widening the WHEN, would make each a single
WHEN/THEN pair. The scenario count would not change if the arm moves.

**Finding 10 — The proposal states the label rule as closed** (note)

This concerns the patches (`proposal.md.patch`). [Observed] The proposal
says "the short labels that head elements carry no claim". The spec says a
label "SHALL state no fact", that Syzygy checks length, citation, quotation
and markup, and that "that a label states no fact is the agent's report,
open to the fidelity and rendered-design reviews". The owner packet carries
that residual plainly ("Syzygy cannot tell").

[Inferred] The proposal is the change's front page. It should say "carry no
claim, which Syzygy checks in part and the reviews judge" rather than state
the rule as met.

**Finding 11 — "no entry" can itself read as a negative** (note)

This concerns the patches. [Observed] The round-1 repair renders an empty
cell "with the visible words "no entry", never as a blank a reader could
take for a negative".

[Inferred] Under a column such as "Entry point", or in a yes/no column, the
words "no entry" can read as "no". This is the reading the rule exists to
prevent. Words that name the draft rather than the subject ("not stated in
this dossier") would read less like a claim. The repair is otherwise sound:
absence must be written as a labelled claim, and the falsifier catches a
blank.

**Finding 12 — The ledger's sweep reproduces at the commit it names, and two rows have moved at the reviewed commit** (note)

This concerns the package prose (`IMPACT-LEDGER.md`). [Observed] I re-ran
the stated predicate (Python `bytes in` over every blob of `git ls-tree -r
-z --name-only 1c334271`, with the package directory left out).
- Population: 8,657.
- Rows: 5, 2, 4, 7 and 8 hits, plus 3 for the new decision.
- Every file matches the ledger's classification.

At the reviewed commit `92a6d2d0` the population is 8,664:
- `polaris-dossier-local-draft-v2` gives 9 hits; the added one is the
  round-1 raw `docs/reviews/R-DOSSIER-LOCAL-AGENT-V1-3-ffc2-1-RAW.md`;
- the decision gives 4; the added one is
  `docs/review-campaigns/dossier-local-agent-v1-3.md`.

Both additions are retained or campaign files that the install does not
edit. The head sentence "the repair added no phrase the sweep matches" is
true of the repair commit. The review commit `0f6d2734` did add two
matches. A dated line naming them would keep the ledger exact at the
commit a reader is most likely to check out.

**Finding 13 — The packet says more than the recording tool checks about the design and proposal bytes** (note)

This concerns the package prose (`OWNER-DECISION-PACKET.md`). [Observed]
The packet says: "Once 1.3 is recorded, the battery fails unless the
installed files are exactly the reviewed 1.3 bytes." In
`build_polaris_dossier_local_agent_mode_v1_3.py`, `signed_findings()`
checks two things:
- the tree is the signed v1.2 plus the patches present in the package
  (`state(root) == "applied"`);
- the spec hashes to the digest in the review raw's head (`review_digest`).

Nothing binds `design.md.patch` or `proposal.md.patch` to the reviewed
bytes. The brief's head line carries only the spec digest, the same form as
v1.2.

[Inferred] An edit to the design or proposal patch between this review and
the recording would install unreviewed bytes, and the battery would pass.
The delta's migration plan words this accurately ("v1.2 plus exactly these
patches and the spec hashes to the digest the v1.3 review read"). The
packet should match it, or the recorder should also bind the other two
patches. The second is a recording-tool question, not a subject defect.

**Finding 14 — Option 2(a) does not state that P115's per-requirement classification of 034 is bound to the v1.2 block** (note)

This concerns the package prose (`OWNER-DECISION-PACKET.md`). [Observed]
P115's `REQUIREMENT-CONSUMPTION.json` has an entry for
REQ-polaris-generation-034, classified `explicitly-unaffected`, with a
`block_sha256` taken at baseline `4504514c`. v1.3 amends 034 in place, so
that block changes. Option 2(a) is recommended because "a signed version is
reviewed".

[Inferred] It is reviewed for its own purposes. It is not reviewed against
what P115 relied on, and under 2(a) P115 would accept the new 034 without
anyone re-confirming "unaffected". That is very likely still true here,
since presentation elements do not touch the POC `workItems` carrier, but it
is a cost of 2(a), and the packet should name it beside "it changes what a
signed record accepts". Option 2(b) carries the re-confirmation; the packet
states 2(b)'s cost fairly.

## Criteria

1. **Authorized and nothing more: yes.** [Observed] Every hunk maps to an
   item or is a status line:
   - spec version line: status;
   - the new 034 paragraph and its six scenarios: item 1;
   - the extended Case, Observable, Oracle and Falsifier, and the
     `decisions` warrant: item 1;
   - design version line and schema section: item 2 and item 1;
   - proposal version line, which also records the v1.2 date, and the
     "Presentation elements" bullet: status and item 1.

   [Inferred] No hunk widens a read, egress, write or execution, and none
   adds a script. The excerpt reads only cited blobs, which 034 already
   reads to check citations. What a claim is does not change.

2. **Claim ledger unchanged: yes.** [Observed] Every claim position in the
   design is named in the spec paragraph and made "a claim block for every
   rule of this requirement and of REQ-polaris-generation-035":
   - a table cell, including the row-header first cell;
   - callout `children` and `details` blocks;
   - a step;
   - a definition;
   - a card's body.

   The empty cell is now named and bounded (round-1 Finding 1 repaired).
   "Claim form" now includes the execution identifiers (round-1 Finding 2
   repaired). Findings 3, 4 and 5 are residuals at the edge of a claim. None
   is a claim position the spec leaves unruled.

3. **Short labels are presentation: yes.** [Observed] The checks for
   length, citation, quotation and markup are mechanical, and "markup" is
   now enumerated (round-1 Finding 5 repaired). The residual is stated as
   open, not closed. v1.2 already lets the agent write unlabelled section
   and deep-dive `title`s (`draft-schema.ts`), and those face fewer rules
   than v1.3's labels. Findings 5, 8 and 10 are wording.

4. **Code excerpt Observed only where Syzygy observes it: yes.** [Observed]
   "as a quotation Syzygy has verified, labelled Observed" places the
   excerpt under 034's "Observed is reserved for a quotation that Syzygy has
   verified". Its anchor is "in the form above whose fragment is the lines'
   byte range". That is RFC7-10's evidence-artifact class with an optional
   fragment, the same form 034 gives quotations. The excluded arm matches
   034's existing rule word for word in effect: Unknown with
   `excluded-content`, which is RFC2-24 reason 7, "carrying none of the
   blob's bytes", "not a repair finding".

   The limits are checkable. The spec says "SHALL name one citation of 1 to
   60 lines", and the beyond-the-blob case is in its own scenario (round-1
   Findings 6 and 7 repaired). Findings 1 and 7 are notes.

5. **Inert and accessible: yes, with Findings 1 and 2.** [Observed] The
   paragraph contains each rule the criterion names:
   - "no script and no change to the pages' content security policy";
   - header cells "scoped to their row or column";
   - tone "stated in its words, never by colour alone";
   - "no fragment target SHALL sit inside a collapsible section";
   - each kind's HTML element, cards now included (round-1 Finding 3
     repaired).

   [Inferred] I find no reading that lets a page run code or carry meaning
   in colour alone. Finding 1 is the one reading that could carry markup.

6. **Scenarios falsifiable: yes.** [Observed] Each of the six has one WHEN
   and a THEN with an independent oracle, and the Oracle now names the
   element observables (round-1 Finding 4 repaired). Each has a falsifier
   arm. Finding 9 notes two AND clauses that test the passing complement.

7. **Design agrees with the spec and stays design: yes.** [Observed, by
   script]
   - The seven element rows in `design.md` and in the delta's copy are
     identical (sha256 of the extracted rows equal).
   - Every quoted sentence in the delta's "Proposed meaning" occurs in the
     post-apply spec.
   - The kinds, claim positions, short-label list, 120-character and
     60-line limits agree.
   - "v2 still accepted" fits 034's "validates against its declared schema
     version".
   - The design patch contains no code.

   Finding 6 notes the spec's broader nesting wording.

8. **Change class: yes, Normative.** The change adds SHALLs, scenarios and
   falsifier arms to 034.

9. **Ledger reproducible: yes.** [Observed] Re-derived in the scratch clone:
   - All v1.2 and v1.3 digests match: spec `5c11c591…`, design
     `d752d8f1…`, proposal `afe81684…`, and `GOVERNING-DEPENDENCIES.md`
     `d5dd5251…` after `check_spec_reconciliation.py --regenerate`, with
     `tasks.md` unchanged.
   - Patch line counts are 84, 67 and 39.
   - `count_polaris_effective_scenarios.py` gives 36 requirements and 254
     scenarios.
   - `--regenerate` wrote only the union and `census.json`, which gains the
     six scenario names and 248→254.
   - `openspec validate --strict` reports the change valid.
   - The overlap predicate returns the same six files, and the second
     predicate none.
   - The sweep reproduces at `1c334271` (Finding 12).

   Install blocker:
   - `governing_inputs()` returns eight rows, the dossier spec's at
     `d6bce6b3…`.
   - On the applied tree, `binding_findings()` returns exactly "current P115
     governing input differs:
     openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md"
     and `is_signed()` is False.
   - With the v1.2 spec restored, it returns `[]` and True.
   - `check_spec_reconciliation.py --check` on the merely-applied tree
     fails R1 (the P115 transaction "incomplete or invalid"), R2 (15
     findings) and R3 (POC 26 / 34 against 26 / 28, plus the status figure),
     as the ledger says. R5 also fails there, which the ledger attributes to
     the post-recording state only. [Inferred: the README-row or status
     route, an install-time edit]
   - The v1.3 builder's `--selftest` gives 26 fixtures, 0 failing. Its
     `--check` on the applied tree without a record fails with "the tree
     carries the v1.3 patches, which no sign-off record covers", as the
     delta says.

   I did not re-run the full recording rehearsal or CG-7h. [Unknown]

10. **Owner packet fair and plain: yes, with Findings 13 and 14.**
    [Observed] Both questions are stated with their options, and each
    option's cost is stated (2(c)'s now included). The recommendations are
    labelled. The hedge on numbered markers and inline code is carried over
    from the delta, and the packet says that recording is the install
    (round-1 Findings 9 and 10 repaired). Finding 13 is where the packet is
    more certain than the recording tool. Finding 14 is the one cost of
    2(a) it leaves out.
