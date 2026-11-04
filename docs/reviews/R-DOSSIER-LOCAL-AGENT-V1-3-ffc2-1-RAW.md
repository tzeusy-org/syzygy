# Review R-DOSSIER-LOCAL-AGENT-V1-3-ffc2-1 — polaris-dossier-local-agent-mode v1.3
Reviewed commit: ffc2e0fed44ab2138bb8fdb71308a54aca8c56fe
Manifest SHA-256: 51dafbaa9c51d083ed0f690d155f1d593dd04af3bf1885ecfd9a4d63f2e1a472
Verdict: REVISE

Method. [Observed] Fresh `git clone --no-hardlinks` of the checkout, detached at
`ffc2e0fe`; `git apply` of `proposed/spec.md.patch`, `design.md.patch` and
`proposal.md.patch` to `openspec/changes/polaris-dossier-local-agent-mode/`
(all three applied cleanly); the post-apply spec hashed by Python `hashlib`
and by `sha256sum` (both `51dafbaa…a472`, the full value above). A second
clone at the same commit, unpatched, served as the baseline. No observed
repository body was read, no `syzygy polaris` or dossier run was started, no
model provider was called, and no network was used.

## Findings

**Finding 1 — The table's empty cell is a position the spec does not name, and it can carry meaning without a label** (revise)

Concerns the patches (`design.md.patch`) and the delta's quoted copy.
[Observed] The design schema row for `table` says "a cell is a claim form or
`{kind: "empty"}`". The spec paragraph names "a table cell" among the
positions whose claim "SHALL be a claim block", and says nothing of a cell
that is not a claim; no scenario, case or falsifier arm mentions an empty
cell. [Inferred] In a table a blank cell is read by position: under a column
such as "Supported in cluster mode" an empty cell reads as "no", or as
"none known", which is an unlabelled, uncited claim of absence. VIS-2
requires that no evidence render Unknown, and 034 already gives the agent
the honest form (an Unknown cell with an RFC2-24 reason). Criterion 2 asks
exactly whether any position in the design's schema is a claim the spec
paragraph does not name; this one is, at least by the reader's inference,
and the spec gives a checker and an implementer no rule for it. Repair by
either removing `{kind: "empty"}` (every cell then a claim form, absence
written as Unknown with its reason), or naming the empty cell in the spec
paragraph with a bounded meaning and rendering (for example: permitted only
where a header cell would otherwise stand, such as the corner cell of a
`rowHeaders` table, rendered with visible "no entry" text, and a falsifier
arm for an empty cell anywhere else). The design table and the delta's copy
of it (identical, see criterion 7) move together.

**Finding 2 — "Claim form" omits the execution identifiers** (note)

Concerns the patches (`design.md.patch`). [Observed] The design defines
"Claim form" as "`id`, `label`, `basis` or `reason`, `text`, `citations` and
`quotations`". The existing schema paragraph immediately above says a claim
resting on execution "carries `basis: execution` and the identifiers of the
executions it rests on", and 034's fourth check requires such a block to
name at least one reported command. Read literally, a table cell, a
definition or a card body could carry `basis: execution` but no execution
identifiers, so it would always fail that check. The spec governs ("SHALL be
a claim block for every rule of this requirement") and the design says the
requirements control, so this is a design-text gap, not a spec defect. Name
the execution identifiers in the claim form, or define "claim form" as "the
existing block's fields other than `children`".

**Finding 3 — Cards have no named HTML element in the spec, so scenario 4 cannot be falsified for cards** (note)

Concerns the patches (`spec.md.patch`). [Observed] The spec's rendering
sentence lists six elements for seven kinds: "a table whose header cells are
scoped…, an aside, an ordered list, a description list, a details element
with its summary, preformatted code". Cards are missing. The scenario
"Presentation element rendered inert" says each element renders "as the
HTML element whose meaning matches it", which for cards has no fixed answer
in the spec; the design says only "a list of cards, each headed by its
label". Add cards to the spec's list (for example "a list whose items are
each headed by their label").

**Finding 4 — The Oracle line was not extended to the new observables** (note)

Concerns the patches (`spec.md.patch`). [Observed] The Case, Observable and
Falsifier gained element clauses; the Oracle still reads "Expected findings
and byte ranges computed from the fixture blobs outside the checker…;
expected labels, citation outcomes and Unknown reasons fixed in the
fixture." Nothing names where the expected element names, header scopes,
script and CSP absence, label-length and markup findings, or the
excerpt's rendered bytes come from. [Inferred] Each is fixable by the same
fixture-first method, and "Oracle independence" (written before the checker
runs) reaches them, so the scenarios are falsifiable in practice; one
clause ("and expected element markup, header scopes, label findings and
excerpt bytes fixed in the fixture, the excerpt bytes read from the fixture
blob outside the renderer") would make it so on the page.

**Finding 5 — "Markup" in a short label is undefined** (note)

Concerns the patches (`spec.md.patch`). [Observed] Syzygy "SHALL report a
finding for a short label … that carries a citation, a quotation or markup",
and scenario 2 tests it. Neither the spec nor the design says what counts as
markup: HTML tags, Markdown emphasis, link syntax, backticks, character
entities. [Inferred] Two implementations could disagree on a label such as
`maxmemory-policy` in backticks, which the owner's item 4 ("Backticks aren't
rendering") makes a live case; an independent oracle has to pick a set. The
034 normalisation list already enumerates the Markdown forms Syzygy knows;
reusing it ("any construct that normalisation would alter, or a `<`") would
close it.

**Finding 6 — The 60-line limit is a finding only in the scenario and the design** (note)

Concerns the patches (`spec.md.patch`). [Observed] The requirement text says
a code excerpt "names one citation of at most 60 lines" (descriptive, no
SHALL), and the scenario's AND clause says "an excerpt citing more than 60
lines … is a repair finding". The design's limit "1 to 60 lines" makes it a
schema failure, which 034's first check reports. [Inferred] It is checkable
and the scenario binds it, so this is wording only; "SHALL name one citation
of 1 to 60 lines" in the paragraph would put the rule where the reader looks
first. Lines beyond the blob are already covered by 034's check "every cited
line range lies within that blob", which the paragraph's "the citation rules
… apply to it" reaches.

**Finding 7 — Scenario 3 carries three cases under one WHEN** (note)

Concerns the patches (`spec.md.patch`). [Observed] "Code excerpt rendered
from Syzygy's read" has a WHEN for an admitted excerpt of at most 60 lines,
and its AND clause adds two other cases (more than 60 lines or beyond the
blob; an excluded blob) that the WHEN does not state. Each is falsifiable as
written, but the scenario is not one WHEN/THEN pair as criterion 6 asks.
[Inferred] Splitting the excluded-blob arm into its own scenario, or
widening the WHEN to "a code excerpt whose citation…", would fix it; it
would move the scenario count, so it is the drafter's call against the
ledger.

**Finding 8 — The delta says the v1.2 design names `polaris-dossier-local-draft-v2`; it does not** (note)

Concerns the package prose (`SEMANTIC-DELTA.md`, "Current meaning").
[Observed] "The design's draft schema, `polaris-dossier-local-draft-v2`, has
blocks with children…". `git grep -l -F polaris-dossier-local-draft
1c334271 -- openspec` returns no file, and the v1.2 design's
"### The local-agent draft schema" section names no version string; the
literal is the implementation's `LOCAL_DRAFT_SCHEMA_VERSION` in
`packages/polaris-dossier/src/draft-schema.ts`. v1.3 introduces both names
into the design for the first time. Say "the implementation's draft schema,
`polaris-dossier-local-draft-v2`, which the design describes without
naming".

**Finding 9 — The owner packet separates signing from installing, but recording is the install** (note)

Concerns the package prose (`OWNER-DECISION-PACKET.md`). [Observed] The packet
says "Signing 1.3 does not need this settled; installing it does." The
delta's migration plan and the ledger's rehearsal say the recorder "applies
the three patches through a builder" as part of `--record`, and the ledger
says the P115 fix "must land before, or with, the v1.3 install". [Inferred]
So the owner may select 1.3 before Q2 is settled, but the sign-off cannot be
recorded until it is, without a red battery on `main`. The packet's last
paragraph says the builder "applies these patches", which is true, but it
does not draw that consequence. One sentence ("recording the sign-off
installs the bytes, so it waits on question 2") would make it plain. Question
2's option (c) also states no cost (the element code stays off, as under
1(b)).

**Finding 10 — The packet is more certain than the delta about the other feedback items** (note)

Concerns the package prose (`OWNER-DECISION-PACKET.md`). [Observed] The
packet: "The theme, diagrams, numbered citation markers, inline code and
plainer prose … are implementation work … none of them changes a signed
sentence as drafted." The delta: "They change no signed sentence as drafted
here; if one turns out to, it travels in a later version." [Inferred]
Numbered markers touch how the RFC7-10 anchor and path label are shown (034:
"The repository path is shown beside it as a label, never as its identity"),
and inline code from backticks touches rendered claim text; whether either
moves a signed sentence is Unknown until drafted. The packet should carry
the delta's hedge.

**Finding 11 — The label residual is honest, but no review criterion names labels** (note)

Concerns the patches (`spec.md.patch`). [Observed] The spec says "that a
label states no fact is the agent's report, open to the fidelity and
rendered-design reviews": stated as open, not claimed closed, which meets
criterion 3. [Inferred] REQ-polaris-generation-035's verdict carries entries
for claim blocks and inventory entries only, and 035 is not amended, so the
fidelity reviewer sees the labels in the frozen draft but is not asked about
them. "Open to" is accurate; the residual would be narrower if the brief or
the fidelity criteria (implementation-side) asked the reviewer to flag a
label that states a fact. No spec change is required for honesty.

## Criteria

The brief lists ten numbered criteria, not eleven. [Observed]

1. **Authorized, nothing more — yes.** [Observed] Spec hunks: the version
   line (status), the new paragraph, four scenarios, the extended Case,
   Observable and Falsifier, and the `decisions` warrant (all item 1, the
   version under item 2). Design: version line, schema section. Proposal:
   version line (also recording the v1.2 sign-off date), one paragraph. No
   hunk widens a read, egress, write or execution: [Inferred] the code
   excerpt renders lines of a blob Syzygy already reads to verify citations
   and already renders whole on a source page when screening admits it. No
   script is added. What a claim is does not change; the code excerpt is
   placed under the existing "quotation that Syzygy has verified".
2. **Claim ledger unchanged — yes, except Finding 1.** Every named claim
   position is made a claim block "for every rule of this requirement and of
   REQ-polaris-generation-035", which reaches labels, citations, quotations,
   RFC2-24 reasons, the execution marking (subject to Finding 2's design
   gap) and the verdict's per-block entry. The row-header first cell is a
   claim form rendered as a header cell, so it keeps its claim status. The
   empty cell is the one schema position the spec does not name.
3. **Short labels — yes.** Length, citation, quotation and markup are
   mechanical (Finding 5 on "markup"); "SHALL state no fact" is left to
   review and said so (Finding 11).
4. **Code excerpt Observed only where Syzygy observes — yes.** "rendered
   from the blob it read and verified …, byte for byte, as a quotation
   Syzygy has verified" places it under 034's "Observed is reserved for a
   quotation that Syzygy has verified", with the RFC7-10 anchor "in the form
   above". The excluded arm has the same effect as 034's existing rule ("render Unknown with `excluded-content` …, and its exclusion is
   not a repair finding") and carries none of the bytes (SEC-5's rendered
   exclusion). Limits are checkable (Finding 6).
5. **Inert and accessible — yes, with Finding 3.** "no script and no change
   to the pages' content security policy", scoped header cells, tone "in its
   words, never by colour alone", and no fragment target in a collapsible
   section leave no reading that runs code or carries meaning in colour.
   [Observed] The current renderer puts `id` attributes on sections and
   glossary `dt`s, not on claim blocks, so the details rule is satisfiable.
6. **Scenarios falsifiable — yes, with Findings 3, 4 and 7.**
7. **Design agrees with spec and stays design — yes, except Findings 1 and
   2.** [Observed, by script] The seven element rows in `design.md` and in
   the delta's quoted table are identical; every quoted spec sentence in the
   delta's "Proposed meaning" occurs in the post-apply spec. "v2 still
   accepted" is consistent with 034 ("validates against its declared schema
   version"). The design patch contains no code.
8. **Change class — yes, Normative.** It adds SHALLs and scenarios to 034.
9. **Ledger reproducible — yes.** [Observed] v1.2 and v1.3 digests of
   `spec.md`, `design.md`, `proposal.md` and `GOVERNING-DEPENDENCIES.md`
   (after `check_spec_reconciliation.py --regenerate`), and of the unchanged
   `tasks.md`, all match the ledger; patch line counts 71, 65, 39 match;
   `count_polaris_effective_scenarios.py` gives 36 requirements and 252
   scenarios on the applied tree; `--regenerate` wrote exactly
   `GOVERNING-DEPENDENCIES.md` and `census.json`. The text sweep, re-run at
   `1c334271` over 8,657 tracked files with the package directory left out,
   reproduces every row (5, 2, 4, 7, 8 hits and 3 for the new decision),
   with the same files. The overlap predicate returns the same six files and
   the second predicate none. Install blocker: `governing_inputs()` reads
   eight frozen rows, the dossier spec's at `d6bce6b3…`; on the applied tree
   `binding_findings()` returns exactly "current P115 governing input
   differs: openspec/changes/polaris-dossier-local-agent-mode/specs/polaris-generation/spec.md"
   and `is_signed()` is False, against no findings and True on the
   unpatched baseline. The comparison is an exact digest match with no
   later-version allowance. `build_polaris_dossier_local_agent_mode_v1_3.py
   --selftest` gives 26 fixtures, 0 failing; its `--check` and the v1.2
   builder's `--check` pass on the unpatched tree. The R1 to R3 and CG-7h
   figures from the recording rehearsal were not re-run. [Unknown]
10. **Owner packet fair and plain — mostly.** Both questions are stated with
    options, and recommendations are labelled as such. Findings 9 and 10
    are where the packet is plainer than it is accurate.
