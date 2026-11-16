# Semantic delta DOSSIER-LOCAL-AGENT-V1-4 — empty cells and honest excerpts

> **Candidate — binds nothing.** [Inferred] Agent-authored proposal for
> `polaris-dossier-local-agent-mode` version 1.4. No owner selection, review
> clearance, installation, tag or product change is claimed by this packet.

**Artifacts:** the three files under `proposed/`, applied to
`openspec/changes/polaris-dossier-local-agent-mode/`.
**Stable IDs affected:** REQ-polaris-generation-034, amended in place; the
other three requirement identities and texts retain their bytes.
**Change class:** Normative, with clarifying and structural subchanges
identified below; the whole package requires the normative review floor.
**Author:** Codex, worker for `syzygy-mea.10.6`.
**Date:** 2026-11-05.

## Warrant and decision basis

[Observed] `OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04`, item 3,
directs the empty-cell `-` to a later v1.4 item. It does not sign v1.4.
The signed v1.3 record is
`../../../decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`.
The sibling `../POLARIS-DOSSIER-LOCAL-AGENT-MODE-V1-3-REVIEW-NOTES.md`
owns the fourteen carried notes; `V1-3-NOTE-DISPOSITIONS.md` accounts for
each. The excerpt no-read residual and unverified displayed range are
PR740 round-3 note 1, reviewed at 9a7a7b94; the complete raw remains on
PR740, not on this baseline. `SOURCE-RECEIPTS.json` identifies the captured
raw and current PR head without claiming that later head was reviewed.
These sources are repository-local or publicly reachable through the PR;
the original owner exchange is not independently reproduced here.

[Inferred] Scope A items 1–5 govern review, version selection and binding.
VIS-4 says “Shape-defining changes always need the owner's sign-off;
Syzygy and its agents may draft them, never adopt them.” SEC-5 says
“Anything that matches the declared secret-detection policy, or cannot be
classified, is excluded; a matching exclusion is rendered.” The proposed
no-read exception serves that boundary without silently excusing ordinary
claim-block citations; the separately scoped `syzygy-mea.10.7` gap remains.

## Current and proposed clauses, in full

[Observed] Each Current block below is copied from the signed v1.3 layer
at the baseline named in `IMPACT-LEDGER.md`. [Inferred] Each Proposed block
is candidate text. The three patches are the complete proposed bytes.
Splitting the long presentation paragraph does not split its authority.

### spec.md: changed clause group 1

Current:

````text
Exact behavioral delta, version 1.3. Version 1.0 was signed off by the owner on 2026-10-06 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`), version 1.1 on 2026-10-07 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`) and version 1.2 on 2026-10-14 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`); these bytes bind only by the owner's sign-off of version 1.3. This change applies to the existing polaris-generation capability. It adds four requirements that define a second authoring mode, the operator-agent mode, beside the provider mode that the adopted requirements describe. It edits no byte of any predecessor requirement or scenario, in the base change or in the understanding amendment as amended by the tree-form adoption. For a run in the operator-agent mode it displaces or reads the predecessor text that each requirement below names, and only that text; for a run in the provider mode every predecessor requirement and scenario keeps its bytes and its meaning. The provider mode is parked by the owner direction of 2026-10-05, not withdrawn. Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, this change could not be signed off until the owner had adopted, by the owner's own act, an amendment to SEC-3 that permits the operator's agent session to build and run the observed project on the host. The owner adopted it on 2026-10-06 as doctrine amendment D9, on SEC-3 and the owner's attended agent session, with its credential condition (`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, row D9); this change cites it as D9.
````

Proposed:

````text
Exact behavioral delta, version 1.4. Version 1.0 was signed off by the owner on 2026-10-06 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.0.md`), version 1.1 on 2026-10-07 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.1.md`) and version 1.2 on 2026-10-14 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.2.md`), and version 1.3 on 2026-11-04 (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`); these bytes bind only by the owner's sign-off of version 1.4. This change applies to the existing polaris-generation capability. It adds four requirements that define a second authoring mode, the operator-agent mode, beside the provider mode that the adopted requirements describe. It edits no byte of any predecessor requirement or scenario, in the base change or in the understanding amendment as amended by the tree-form adoption. For a run in the operator-agent mode it displaces or reads the predecessor text that each requirement below names, and only that text; for a run in the provider mode every predecessor requirement and scenario keeps its bytes and its meaning. The provider mode is parked by the owner direction of 2026-10-05, not withdrawn. Under the owner direction `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`, item 1, this change could not be signed off until the owner had adopted, by the owner's own act, an amendment to SEC-3 that permits the operator's agent session to build and run the observed project on the host. The owner adopted it on 2026-10-06 as doctrine amendment D9, on SEC-3 and the owner's attended agent session, with its credential condition (`.syzygy/governance/decisions/DOCTRINE-AMENDMENT-LOG.md`, row D9); this change cites it as D9.
````

### spec.md: changed clause group 2

Current:

````text
- the draft validates against its declared schema version, with unique identities and resolving internal references (REQ-polaris-generation-019), and names the pinned revision;
- every cited path names a blob at the pinned revision, and every cited line range lies within that blob;
- every quotation, after the normalisation that the generator's existing quote check applies to both the quotation and the source, is one contiguous run of the cited blob's text, beginning and ending on word boundaries, that lies within the cited line range, and Syzygy records the span's byte range in the blob; that normalisation drops comment leaders at line starts and a closing comment marker at a line end, keeps only the text of markdown links and images, decodes character entities, removes markdown backslash escapes, drops backticks, drops paired emphasis marks at word edges, straightens curly quotes, turns an ellipsis character into three full stops, and collapses each whitespace run to one space; an ellipsis in a quotation that the source does not carry is an elision and fails;
- every block carries a label the labelling rules permit and the citations the citation rules require, a non-normative block carries none, every Unknown block names a reason from RFC2-24's closed list, and every block the agent marks as resting on execution names at least one command present in the draft's list of reported commands. Syzygy can see only the marking; whether an unmarked claim rests on execution is the agent's report, and the page SHALL say so.

A blob that classification or screening excludes SHALL NOT be used to verify a quotation: the quotation is unverifiable, the block that relies on it SHALL render Unknown with `excluded-content` instead of the quotation, and its exclusion is not a repair finding. A repair finding SHALL carry no excluded bytes. Each resubmission is a new draft revision with its own identity; it counts against the repair-cycle limit, and it retires earlier check results and dependent review evidence (REQ-polaris-generation-006). A draft with an unresolved finding SHALL NOT proceed to review or become ready.
````

Proposed:

````text
- the draft validates against its declared schema version, with unique identities and resolving internal references (REQ-polaris-generation-019), and names the pinned revision;
- every cited path names a blob at the pinned revision, and every cited line range lies within that blob; the one exception is the body-end check for a code excerpt whose blob classification or path screening excludes before any body read: Syzygy SHALL leave that body unread and SHALL NOT check the range against its end. This exception does not apply to an ordinary claim block's citation. A code excerpt's missing or non-blob path, malformed or reversed range, or citation of more than 60 lines SHALL still produce a repair finding, without reading a path-excluded body. For a blob read and then excluded by content screening or invalid UTF-8, the body-end check SHALL use the line boundaries obtainable from that read; neither a finding nor the rendered page SHALL disclose the excluded bytes or the blob's line count;
- every quotation, after the normalisation that the generator's existing quote check applies to both the quotation and the source, is one contiguous run of the cited blob's text, beginning and ending on word boundaries, that lies within the cited line range, and Syzygy records the span's byte range in the blob; that normalisation drops comment leaders at line starts and a closing comment marker at a line end, keeps only the text of markdown links and images, decodes character entities, removes markdown backslash escapes, drops backticks, drops paired emphasis marks at word edges, straightens curly quotes, turns an ellipsis character into three full stops, and collapses each whitespace run to one space; an ellipsis in a quotation that the source does not carry is an elision and fails;
- every block carries a label the labelling rules permit and the citations the citation rules require, a non-normative block carries none, every Unknown block names a reason from RFC2-24's closed list, and every block the agent marks as resting on execution names at least one command present in the draft's list of reported commands. Syzygy can see only the marking; whether an unmarked claim rests on execution is the agent's report, and the page SHALL say so.

A blob that classification or screening excludes, or whose bytes are not valid UTF-8, SHALL NOT be used to verify a quotation: the quotation is unverifiable, the block that relies on it SHALL render Unknown with `excluded-content` instead of the quotation, and its exclusion is not a repair finding. A repair finding SHALL carry no excluded bytes. Each resubmission is a new draft revision with its own identity; it counts against the repair-cycle limit, and it retires earlier check results and dependent review evidence (REQ-polaris-generation-006). A draft with an unresolved finding SHALL NOT proceed to review or become ready.
````

### spec.md: changed clause group 3

Current:

````text
A draft MAY present its argument with presentation elements (owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`), standing where a claim block may stand: a table, a callout, an ordered list of steps, a list of definitions, a set of cards, a collapsible section and a code excerpt. Every claim an element carries (a table cell, a block inside a callout or a collapsible section, a step, a definition, a card's body) SHALL be a claim block for every rule of this requirement and of REQ-polaris-generation-035: it carries its own identity, label, citations and quotations; Syzygy checks it and reports its findings as for any claim block; the fidelity verdict carries an entry for it; and it renders with its label's marking. A table cell MAY instead be empty: an empty cell states nothing, carries no label, citation or quotation, and SHALL render with the visible words "no entry", never as a blank a reader could take for a negative; an absence or a negative the draft means to state SHALL be written as a claim in that cell, Inferred with its citations or Unknown with its reason. An element's short labels (a table caption, a column heading, a callout title, a defined term, a card label, a collapsible section's summary, a code excerpt's language) are presentation: each is plain text of at most 120 characters that names what it heads; it SHALL carry no citation and no quotation, SHALL state no fact about the subject, carries no epistemic label of its own and SHALL NOT render as Observed. Syzygy SHALL report a finding for a short label longer than 120 characters or one that carries a citation, a quotation or markup (a `<`, `&` or backtick character, or a Markdown link, image or paired emphasis mark); that a label states no fact is the agent's report, open to the fidelity and rendered-design reviews. A code excerpt carries no text of the agent's: it SHALL name one citation of 1 to 60 lines, and Syzygy SHALL report a repair finding for one of more; Syzygy SHALL render those lines from the blob it read and verified at the pinned revision, byte for byte, as a quotation Syzygy has verified, labelled Observed, with an anchor in the form above whose fragment is the lines' byte range; the citation rules and the rule for a blob that classification or screening excludes apply to it as to a quotation, so that for an excluded blob the excerpt SHALL render Unknown with `excluded-content` in its place, carrying none of the blob's bytes, and its exclusion is not a repair finding. Syzygy SHALL render every element through the same renderer as inert static HTML, in the HTML element whose meaning matches it (a table whose header cells are scoped to their row or column, an aside, an ordered list, a description list, a list whose items are each headed by their label, a details element with its summary, preformatted code), with no script and no change to the pages' content security policy; a callout's tone SHALL be stated in its words, never by colour alone; and no fragment target SHALL sit inside a collapsible section. An element adds no read, no source and no label beyond those of the claims it carries and the excerpt Syzygy reads.
````

Proposed:

````text
A draft MAY present its argument with presentation elements (owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`), in a section or deep dive: a table, a callout, an ordered list of steps, a list of definitions, a set of cards, a collapsible section and a code excerpt. Every claim an element carries (a table cell, a block inside a callout or a collapsible section, a step, a definition, a card's body) SHALL be a claim block for every rule of this requirement and of REQ-polaris-generation-035: it carries its own identity, label, citations and quotations; Syzygy checks it and reports its findings as for any claim block; the fidelity verdict carries an entry for it; and it renders with its label's marking. The fidelity review SHALL judge a table cell's claim as read with its row and column labels. A table cell MAY instead be empty: an empty cell states nothing, carries no label, citation or quotation, and SHALL render with the visible marker "-" (U+002D), never as a blank. This marker means only that the cell states nothing in this dossier, never an absence or a negative about the subject; an absence or a negative the draft means to state SHALL be written as a claim in that cell, Inferred with its citations or Unknown with its reason.

An element's short labels (a table caption, a column heading, a callout title, a defined term, a card label, a collapsible section's summary, a code excerpt's language) are presentation: each is plain text of at most 120 Unicode code points that names what it heads; it SHALL carry no citation and no quotation, SHALL state no fact about the subject, carries no epistemic label of its own and SHALL NOT render as Observed. Syzygy SHALL report a finding for a short label longer than 120 Unicode code points or one that carries a citation, a quotation or markup (a `<`, `&` or backtick character, or a Markdown link, image or paired emphasis mark); that a label states no fact is the agent's report, open to the fidelity and rendered-design reviews. A callout's tone and the order of steps are also presentation within that stated review residual: neither may introduce an unlabelled fact, and the reviews judge them with the claims as presented. An agent-supplied language value is a presentation hint, never a verified fact about the file; when it is absent, Syzygy SHALL derive a language label from the path where one can be determined.

A code excerpt carries no text of the agent's: it SHALL name one citation of 1 to 60 lines, and Syzygy SHALL report a repair finding for a citation of more than 60 lines. The path-and-range check above applies to that citation, including its code-only no-read exception. Syzygy SHALL render admitted lines from the blob it read and verified at the pinned revision, byte for byte as text using HTML text escaping, so characters such as `<` and `&` and a sequence such as `</pre>` cannot become markup. The excerpt is a quotation Syzygy has verified, labelled Observed, with an anchor in the form above whose fragment is the lines' byte range. For a blob that classification or screening excludes, or whose bytes are not valid UTF-8, the excerpt SHALL instead render Unknown with `excluded-content`, carrying none of the blob's bytes, and its exclusion is not a repair finding. If a withheld excerpt displays its submitted line range, the range SHALL be disclosed within that Unknown presentation as agent-supplied and unverified, never as a Syzygy-verified range or the blob's length.

Syzygy SHALL render every element through the same renderer as inert static HTML, in the HTML element whose meaning matches it (a table whose header cells are scoped to their row or column, an aside, an ordered list, a description list, a list whose items are each headed by their label, a details element with its summary, preformatted code), with no script and no change to the pages' content security policy; a callout's tone SHALL be stated in its words, never by colour alone; and no fragment target SHALL sit inside a collapsible section. A collapsible section's summary SHALL show the count of Unknown claims it contains even while collapsed; that count is a derived disclosure alongside the agent-supplied summary, not an agent-supplied short label. An element adds no read, no source and no label beyond those of the claims it carries and the excerpt Syzygy reads.
````

### spec.md: changed clause group 4

Current:

````text
- **WHEN** a block cites a path that names no blob at the pinned revision, or a line range beyond the end of the blob
- **THEN** Syzygy reports a repair finding for that citation
- **AND** no source page or anchor is rendered for the absent citation
````

Proposed:

````text
- **WHEN** a citation names no blob at the pinned revision, or a line range beyond the end of a blob for which the path-and-range check above requires that test
- **THEN** Syzygy reports a repair finding for that citation
- **AND** no source page or anchor is rendered for the absent citation
````

### spec.md: changed clause group 5

Current:

````text
- **WHEN** a block quotes a file that classification or screening excludes
- **THEN** the quotation is not verified or rendered and the block renders Unknown with `excluded-content`
- **AND** no source page is rendered for the file and no finding carries its bytes
````

Proposed:

````text
- **WHEN** a block quotes a file that classification or screening excludes, or whose bytes are not valid UTF-8
- **THEN** the quotation is not verified or rendered and the block renders Unknown with `excluded-content`
- **AND** no source page is rendered for the file and no finding carries its bytes
````

### spec.md: changed clause group 6

Current:

````text
- **WHEN** a table cell, a block in a callout or a collapsible section, a step, a definition or a card's body is unlabelled, is Inferred without a citation, is Unknown without a reason from the closed list, or carries a quotation that fails
- **THEN** Syzygy reports the finding for that claim by its own identity, as for any claim block
- **AND** each claim that passes renders with its label's marking and has its own entry in the fidelity verdict
````

Proposed:

````text
- **WHEN** a table cell, a block in a callout or a collapsible section, a step, a definition or a card's body is unlabelled, is Inferred without a citation, is Unknown without a reason from the closed list, or carries a quotation that fails
- **THEN** Syzygy reports the finding for that claim by its own identity, as for any claim block
````

### spec.md: changed clause group 7

Current:

````text
- **WHEN** an element's caption, column heading, title, term, card label, summary or language is longer than 120 characters, or carries a citation, a quotation or markup
- **THEN** Syzygy reports a finding for that element's label
- **AND** a label that passes renders as plain text with no label marking and no anchor
````

Proposed:

````text
- **WHEN** an element's caption, column heading, title, term, card label, summary or language is longer than 120 Unicode code points, or carries a citation, a quotation or markup
- **THEN** Syzygy reports a finding for that element's label
````

### spec.md: changed clause group 8

Current:

````text
- **WHEN** a draft carries a code excerpt whose citation names at most 60 lines of a blob that Syzygy read and verified at the pinned revision and screening admitted
- **THEN** Syzygy renders those lines from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest
- **AND** no text the agent supplied appears in the excerpt, and a later change to the clone's working tree does not alter it
````

Proposed:

````text
- **WHEN** a draft carries a code excerpt whose citation names at most 60 lines of a blob that Syzygy read and verified at the pinned revision and screening admitted
- **THEN** Syzygy renders those lines from its own read as an Observed quotation with an anchor whose target class is an evidence artifact identifier with integrity digest
- **AND** no text the agent supplied appears in the excerpt, a later change to the clone's working tree does not alter it, and HTML text escaping keeps `<`, `&` and `</pre>` inert
````

### spec.md: changed clause group 9

Current:

````text
- **WHEN** a code excerpt's citation names more than 60 lines, or lines beyond the end of the blob
- **THEN** Syzygy reports a repair finding for that excerpt's citation
- **AND** the draft does not proceed to review until a resubmitted revision passes
````

Proposed:

````text
- **WHEN** a code excerpt's citation is malformed or reversed, names more than 60 lines, or names lines beyond the end of a blob Syzygy actually read, including a blob then excluded by content screening or invalid UTF-8
- **THEN** Syzygy reports a repair finding for that excerpt's citation, with no excluded bytes or blob line count
- **AND** the draft does not proceed to review until a resubmitted revision passes
````

### spec.md: changed clause group 10

Current:

````text
- **WHEN** a code excerpt cites a blob that classification or screening excludes
- **THEN** the excerpt renders Unknown with `excluded-content` in its place and carries none of the blob's bytes
- **AND** its exclusion is not a repair finding
````

Proposed:

````text
- **WHEN** a code excerpt cites a blob that classification or screening excludes, or whose bytes are not valid UTF-8
- **THEN** the excerpt renders Unknown with `excluded-content` in its place and carries none of the blob's bytes
- **AND** its exclusion is not a repair finding
````

### spec.md: changed clause group 11

Current:

````text
- **WHEN** a checked draft that uses presentation elements is rendered
- **THEN** each element renders as the HTML element whose meaning matches it, with header cells scoped, no script and the content security policy unchanged
- **AND** each callout states its tone in words, each empty table cell shows the words "no entry", and no fragment target lies inside a collapsible section
````

Proposed:

````text
- **WHEN** a checked draft that uses presentation elements is rendered
- **THEN** each element renders as the HTML element whose meaning matches it, with header cells scoped, no script and the content security policy unchanged
- **AND** each callout states its tone in words, each empty table cell shows the marker "-", and no fragment target lies inside a collapsible section
- **AND** each claim renders with its label's marking and has its own entry in the fidelity verdict, and each short label renders as plain text with no label marking and no anchor
- **AND** fidelity review judges table cells with their row and column labels and judges callout tone and step order within the presentation residual
- **AND** an agent-supplied language value is only a presentation hint; without one, a language label is derived from the path where one can be determined

#### Scenario: Empty table cell states nothing

- **WHEN** a rendered table contains an empty cell alongside a cell that states an absence or a negative
- **THEN** the empty cell shows only the marker "-" without a label, citation or quotation
- **AND** the absence or negative is a claim with its own Inferred citations or Unknown reason, judged with the row and column labels

#### Scenario: Path-excluded code excerpt left unread

- **WHEN** a code excerpt has an existing blob path excluded before any body read, and a well-formed, non-reversed citation of at most 60 lines
- **THEN** Syzygy leaves the body unread, performs no body-end check and renders the excerpt Unknown with `excluded-content` and no blob bytes
- **AND** a displayed submitted range is disclosed as agent-supplied and unverified, without disclosing the blob's length

#### Scenario: Collapsed section discloses Unknown claims

- **WHEN** a rendered collapsible section contains Unknown claims
- **THEN** its summary shows the count of those Unknown claims even while collapsed
- **AND** no claim loses its own label or fidelity entry
````

### spec.md: changed clause group 12

Current:

````text
- **Case:** Submit controlled drafts against a fixture repository at a pinned commit, varying each quotation, citation, label, block kind, understanding item, execution marking and screening outcome independently, including exact, normalised, altered, elided, joined, out-of-range and excluded-file quotations, and altering recorded byte ranges between check and render; and with presentation elements, varying each claim an element carries, each short label's length, citations and markup, and each code excerpt's line count and screening outcome.
- **Observable:** The issued brief, the repair findings, the recorded byte ranges, the rendered quotations, anchors, understanding record and source pages, and the labels in human and machine output; the rendered elements, their HTML element names and header-cell scopes, the pages' scripts and content security policy, and the fidelity verdict's entries.
- **Oracle:** Expected findings and byte ranges computed from the fixture blobs outside the checker, by an independent byte search over the fixture's own normalised text; expected labels, citation outcomes and Unknown reasons fixed in the fixture; and for presentation elements the expected HTML element names, header-cell scopes, empty-cell text, short-label findings and the absence of any script or content security policy change fixed in the fixture, with each code excerpt's expected bytes read from the fixture blob outside the renderer.
- **Oracle independence:** The fixture's expected outcomes are written before the checker runs and are not derived from the checker's output.
- **Falsifier:** An altered, elided, joined or out-of-range quotation passes; a rendered quotation comes from the agent's text, the working tree or an altered stored range; an anchor names a class other than an evidence artifact identifier with integrity digest, or an identifier Syzygy did not recompute; a source page appears for an excluded or unread blob; a finding carries excluded bytes; an agent-labelled Observed claim renders as Observed; a non-normative block carries an anchor; a draft without its understanding record passes; a stale check or review survives a resubmission; a claim inside an element escapes a check a claim block meets, lacks its label marking or its entry in the fidelity verdict; an empty table cell renders as a blank, or with a label marking or an anchor; a short label over 120 characters, or carrying a citation, a quotation or markup, passes, or renders with a label marking or an anchor; a code excerpt renders the agent's text, more than 60 lines, or any byte of an excluded blob; an element renders a script, changes the content security policy, states a callout's tone by colour alone, or holds a fragment target inside a collapsible section.

```yaml
warrants:
  primary: RFC7-2
  doctrine: [SEC-3, SEC-5, VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-24, RFC7-2, RFC7-9, RFC7-10, RFC7-19, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05, OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04]
  topology: []
  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-006, REQ-polaris-generation-012, REQ-polaris-generation-019, REQ-polaris-generation-025, REQ-polaris-generation-033]
```
````

Proposed:

````text
- **Case:** Submit controlled drafts against a fixture repository at a pinned commit, varying each quotation, citation, label, block kind, understanding item, execution marking and screening outcome independently, including exact, normalised, altered, elided, joined, out-of-range and excluded-file quotations, and altering recorded byte ranges between check and render; and with presentation elements, varying each claim an element carries, each short label's length, citations and markup, and each code excerpt's line count and screening outcome, separating paths excluded before reading from bodies read and then excluded, invalid UTF-8, HTML text escaping, Unicode code-point boundaries, contextual table-cell meaning and collapsed Unknown counts.
- **Observable:** The issued brief, the repair findings, the recorded byte ranges, the rendered quotations, anchors, understanding record and source pages, and the labels in human and machine output; the rendered elements, their HTML element names and header-cell scopes, the pages' scripts and content security policy, and the fidelity verdict's entries.
- **Oracle:** Expected findings and byte ranges computed from the fixture blobs outside the checker, by an independent byte search over the fixture's own normalised text; expected labels, citation outcomes and Unknown reasons fixed in the fixture; and for presentation elements the expected HTML element names, header-cell scopes, empty-cell text, short-label findings and the absence of any script or content security policy change fixed in the fixture, with each code excerpt's expected bytes read from the fixture blob outside the renderer.
- **Oracle independence:** The fixture's expected outcomes are written before the checker runs and are not derived from the checker's output.
- **Falsifier:** An altered, elided, joined or out-of-range quotation passes; a rendered quotation comes from the agent's text, the working tree or an altered stored range; an anchor names a class other than an evidence artifact identifier with integrity digest, or an identifier Syzygy did not recompute; a source page appears for an excluded or unread blob; a finding carries excluded bytes; an agent-labelled Observed claim renders as Observed; a non-normative block carries an anchor; a draft without its understanding record passes; a stale check or review survives a resubmission; a claim inside an element escapes a check a claim block meets, lacks its label marking or its entry in the fidelity verdict; an empty table cell renders anything but the marker "-", or has a label marking or an anchor; a table cell's fidelity judgment ignores its row or column labels; a collapsed summary hides the count of Unknown claims; a short label over 120 Unicode code points, or carrying a citation, a quotation or markup, passes, or renders with a label marking or an anchor; a code excerpt renders the agent's text, more than 60 lines, or any byte of an excluded blob; a path-excluded excerpt body is read to check its end; a missing path, malformed or reversed range, citation of more than 60 lines, or out-of-range read-then-excluded excerpt passes; a finding discloses an excluded blob's line count; an unverified withheld range is displayed as verified; code text becomes markup; an agent language hint is presented as a verified file fact; an element renders a script, changes the content security policy, states a callout's tone by colour alone, or holds a fragment target inside a collapsible section.

```yaml
warrants:
  primary: RFC7-2
  doctrine: [SEC-3, SEC-5, VIS-1, VIS-2, VIS-3]
  contracts: [RFC2-24, RFC7-2, RFC7-9, RFC7-10, RFC7-19, RFC7-20]
  policies: [CC-SPEC-2, CC-SPEC-4]
  decisions: [POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05, POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05, OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04, OWNER-DIRECTION-P115-LATER-SIGNED-INPUTS-2026-11-04]
  topology: []
  parent_requirements: [REQ-polaris-generation-002, REQ-polaris-generation-003, REQ-polaris-generation-004, REQ-polaris-generation-006, REQ-polaris-generation-012, REQ-polaris-generation-019, REQ-polaris-generation-025, REQ-polaris-generation-033]
```
````

### design.md: changed clause group 1

Current:

````text
> **Version 1.3.** Explains the requirements in
> specs/polaris-generation/spec.md; version 1.0 was signed off by the owner
> on 2026-10-06, version 1.1 on 2026-10-07 and version 1.2 on 2026-10-14,
> and this text binds only by the owner's sign-off of version 1.3. It is not an
> implementation. It contains no code. The command surface below is a design
> for implementation after the owner's sign-off (direction item 5); the
> requirements are the controlling text, and doctrine, accepted contracts,
> the adopted requirements and the owner's rulings
> (`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`,
> `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`) remain
> controlling over both.
````

Proposed:

````text
> **Version 1.3.** Explains the requirements in
> specs/polaris-generation/spec.md; version 1.0 was signed off by the owner
> on 2026-10-06, version 1.1 on 2026-10-07 and version 1.2 on 2026-10-14,
> and this text binds only by the owner's sign-off of version 1.4. It is not an
> implementation. It contains no code. The command surface below is a design
> for implementation after the owner's sign-off (direction item 5); the
> requirements are the controlling text, and doctrine, accepted contracts,
> the adopted requirements and the owner's rulings
> (`POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`,
> `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`) remain
> controlling over both.
````

### design.md: changed clause group 2

Current:

````text
Since version 1.3 the schema is `polaris-dossier-local-draft-v3`, and Syzygy
still accepts a `polaris-dossier-local-draft-v2` draft, which uses no
element. Version 3 adds presentation elements (owner direction
`OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`). They sit in the existing
`paragraphs` arrays of sections and deep dives, whose name stays. An entry
without `kind` is the existing block. An entry with `kind` is one of the
seven elements below. "Claim form" means every field of the existing
block except `children`: `id`, `label`, `basis` or `reason`, the execution
identifiers of a claim resting on execution, `text`, `citations` and
`quotations`. "Block" means the existing block, with its own `children`.

| `kind` | Fields | Limits | Renders as |
|---|---|---|---|
| `table` | `id`, `caption`, `columns` (column labels), `rowHeaders` (boolean), `rows`, each `{id, cells}`; a cell is a claim form or `{kind: "empty"}`, which states nothing and renders the words "no entry" | 1 to 8 columns; 1 to 40 rows; each row has exactly one cell per column | a `table` with its `caption`; each column label is a header cell scoped to its column, and with `rowHeaders` each row's first cell is a header cell scoped to its row |
| `callout` | `id`, `tone` (`note`, `tip`, `caution` or `important`), `title`, `children` (blocks) | 1 to 12 children | an `aside` whose tone is written as a word beside the title, with its colour as a second cue only |
| `steps` | `id`, `items` (blocks without children) | 2 to 20 items | an `ol` |
| `definitions` | `id`, `entries`, each `{term, definition}`; the definition is a claim form | 1 to 40 entries | a `dl` |
| `cards` | `id`, `items`, each `{label, body}`; the body is a claim form | 2 to 6 items | a list whose items are each headed by their label |
| `details` | `id`, `summary`, `elements` (blocks, or any element but `details`) | 1 to 30 elements | `details` with its `summary`, holding no fragment target |
| `code` | `id`, optional `language` (a short label), `citation` (`{id, path, startLine, endLine}`) | 1 to 60 lines | `pre` and `code`, the lines as Syzygy read them at the pinned revision, with their anchor |

The short labels are `caption`, each column label, `title`, `term`, `label`,
`summary` and `language`. Each is plain text of at most 120 characters, never
a quotation, and carries no citation and no markup (no `<`, `&` or backtick
character, and no Markdown link, image or paired emphasis mark). Every claim form inside an element is
checked as a claim block is: its label, its citations, its quotations and,
for `unknown`, its RFC2-24 reason. Each counts in the fidelity verdict's
`blockSupport` by its own `id`, and each renders with its marking. Element
`id`s, row `id`s and the code citation's `id` share the draft's one space of
identities.

A `code` element is not a claim: the agent supplies only the citation.
Syzygy renders the cited lines from the blob it verified, as an Observed
excerpt with the RFC7-10 anchor a verified quotation has. When the cited file
is excluded by classification or withheld by screening, the excerpt renders
Unknown with `excluded-content` in its place, as a quotation from that file
would, and carries none of its bytes. A `code` element has no `blockSupport`
entry of its own; its span is one of the cited spans the fidelity packet
carries.
````

Proposed:

````text
Since version 1.3 the schema is `polaris-dossier-local-draft-v3`, and Syzygy
still accepts a `polaris-dossier-local-draft-v2` draft, which uses no
element. Version 1.4 changes no schema field or identifier: v2 stays
element-free, and both accepted versions retain every claim, quotation,
citation and review obligation; v3 presentation follows version 1.4 only
after its owner sign-off. Version 3 adds presentation elements (owner direction
`OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`). They sit in the existing
`paragraphs` arrays of sections and deep dives, whose name stays. An entry
without `kind` is the existing block. An entry with `kind` is one of the
seven elements below. "Claim form" means every field of the existing
block except `children`: `id`, `label`, `basis` or `reason`, the execution
identifiers of a claim resting on execution, `text`, `citations` and
`quotations`. "Block" means the existing block, with its own `children`.

| `kind` | Fields | Limits | Renders as |
|---|---|---|---|
| `table` | `id`, `caption`, `columns` (column labels), `rowHeaders` (boolean), `rows`, each `{id, cells}`; a cell is a claim form or `{kind: "empty"}`, which states nothing and renders the marker "-" (U+002D), meaning only that the cell states nothing in this dossier | 1 to 8 columns; 1 to 40 rows; each row has exactly one cell per column | a `table` with its `caption`; each column label is a header cell scoped to its column, and with `rowHeaders` each row's first cell is a header cell scoped to its row |
| `callout` | `id`, `tone` (`note`, `tip`, `caution` or `important`), `title`, `children` (blocks) | 1 to 12 children | an `aside` whose tone is written as a word beside the title, with its colour as a second cue only |
| `steps` | `id`, `items` (blocks without children) | 2 to 20 items | an `ol` |
| `definitions` | `id`, `entries`, each `{term, definition}`; the definition is a claim form | 1 to 40 entries | a `dl` |
| `cards` | `id`, `items`, each `{label, body}`; the body is a claim form | 2 to 6 items | a list whose items are each headed by their label |
| `details` | `id`, `summary`, `elements` (blocks, or any element but `details`) | 1 to 30 elements | `details` with its `summary` and a derived count of its Unknown claims visible while collapsed, holding no fragment target |
| `code` | `id`, optional `language` (a short label), `citation` (`{id, path, startLine, endLine}`) | 1 to 60 lines | `pre` and `code`, the lines as Syzygy read them at the pinned revision, with their anchor |

The short labels are `caption`, each column label, `title`, `term`, `label`,
`summary` and `language`. Each is plain text of at most 120 Unicode code points, never
a quotation, and carries no citation and no markup (no `<`, `&` or backtick
character, and no Markdown link, image or paired emphasis mark). Every claim form inside an element is
checked as a claim block is: its label, its citations, its quotations and,
for `unknown`, its RFC2-24 reason. Each counts in the fidelity verdict's
`blockSupport` by its own `id`, and each renders with its marking. A table
cell is judged with its row and column labels. Callout tone and step
order are presentation within the same agent-reported, independently
reviewed residual as short labels; neither may introduce an unlabelled
fact. The collapsed Unknown count is a derived disclosure beside the
agent summary, not part of its 120-code-point limit. Element
`id`s, row `id`s and the code citation's `id` share the draft's one space of
identities.

A `code` element is not a claim: the agent supplies only the citation and
an optional language presentation hint, never a verified fact about the file.
When the hint is absent, Syzygy derives a language label from the path where
one can be determined. Syzygy renders admitted cited lines from the blob it
verified, byte for byte as text with HTML text escaping, as an Observed
excerpt with the RFC7-10 anchor a verified quotation has.

REQ-polaris-generation-034's path-and-range check applies to the excerpt.
For an existing path excluded before any body read, Syzygy leaves the body
unread and performs no body-end check; missing/non-blob paths, malformed or
reversed ranges and citations of more than 60 lines still cause findings.
For a body actually read and then excluded by content screening or invalid
UTF-8, the check retains the line boundaries obtainable from that read and
reports an out-of-range citation without excluded bytes or the blob's line
count. This exception is confined to code excerpts; the ordinary-block
citation obligation in 034 is unchanged.

For an excluded or invalid-UTF-8 blob, the excerpt renders Unknown with
`excluded-content` and no blob bytes; its exclusion is not a finding. Any
displayed submitted range is disclosed within that Unknown presentation as
agent-supplied and unverified, never as the blob's length or a verified range.
A `code` element has no `blockSupport` entry of its own; its admitted span
is one of the cited spans the fidelity packet carries.
````

### proposal.md: changed clause group 1

Current:

````text
> **Version 1.3.** Drafted 2026-10-05 under the owner direction
> `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`),
> which authorizes drafting and review only, and relies on the owner's
> rulings `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md`).
> The owner signed off version 1.0 on 2026-10-06, after adopting the SEC-3
> amendment that the review-1 rulings direct (item 1) as doctrine amendment
> D9 the same day, and version 1.1 on 2026-10-07; version 1.2 adds the
> waiting sessions of the owner direction
> `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md`),
> signed off on 2026-10-14; version 1.3 adds the presentation elements of the
> owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
> (`.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`).
> These bytes bind only by the owner's sign-off of version 1.3 (VIS-4). It grants no read, egress, write or execution beyond what
> its requirements state.
````

Proposed:

````text
> **Version 1.3.** Drafted 2026-10-05 under the owner direction
> `POLARIS-DOSSIER-LOCAL-AGENT-MODE-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-DIRECTION.md`),
> which authorizes drafting and review only, and relies on the owner's
> rulings `POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-SCOPE-REVIEW-SIGNOFF-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-REVIEW-1-RULINGS-DIRECTION.md`)
> and `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-DIRECTION.md`).
> The owner signed off version 1.0 on 2026-10-06, after adopting the SEC-3
> amendment that the review-1 rulings direct (item 1) as doctrine amendment
> D9 the same day, and version 1.1 on 2026-10-07; version 1.2 adds the
> waiting sessions of the owner direction
> `POLARIS-DOSSIER-WAITING-SESSIONS-2026-10-08`
> (`.syzygy/governance/decisions/POLARIS-DOSSIER-WAITING-SESSIONS-DIRECTION.md`),
> signed off on 2026-10-14; version 1.3 adds the presentation elements of the
> owner direction `OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04`
> (`.syzygy/governance/decisions/OWNER-DIRECTION-DOSSIER-RICH-ELEMENTS-2026-11-04.md`).
> Version 1.4 proposes the empty-cell marker "-", explicit unread-path
> excerpt handling and the carried v1.3 review notes. Version 1.3 remains
> the signed predecessor (`.syzygy/governance/decisions/POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.3.md`).
> These bytes bind only by the owner's sign-off of version 1.4 (VIS-4). It grants no read, egress, write or execution beyond what
> its requirements state.
````

### proposal.md: changed clause group 2

Current:

````text
- **Syzygy's own reads keep every gate.** Observation consent, the observer
  registry entry, and the classification and screening policy acts apply to
  every Git object Syzygy reads, unchanged (direction item 3).
- **Who sends is the ruling, not whether consent is needed.** The agent's
  sends to its provider are the operator's own act (direction item 2). Every
  transmission Syzygy itself makes still traverses the egress check of
  REQ-polaris-generation-025; in this mode Syzygy makes none.
- **Unobservable things stay Inferred or unrecorded.** What the agent read,
  how much it spent and whether its review contexts were fresh are
  operator-declared or self-reported, and the page says so. Only Syzygy's own
  reads, checks and steps are Observed.
- **Any repository, SEC-2 kept whole.** The owner allowed the mode on any
  repository (scope record, item 1; review-1 rulings, item 2). A subject
  governed under 032's four conditions, or silent about them, needs an
  in-force per-project statement naming the operator's agent provider,
  SEC-2's "explicit, recorded, per-project consent". The statement is a
  consent record; neither its content classes nor SEC-5 screening bind what
  the agent reads or sends, and every page says so.
- **Syzygy's records within the agent's reach.** On a single-user host the
  agent can write Syzygy's state directory. As the owner ruled (R1,
  `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`), nothing Observed rests
  on a stored record and every value shown from one is labelled Inferred.
  That reads REQ-polaris-generation-018 and 022 for this mode. The reading
  of 020's work-item gates, and option A's fuller cost (agent-editable
  refusal records, stored pinned revision and packets), go to the owner with
  the sign-off.
- **Reviews in sessions the operator starts.** Separate top-level sessions
  the operator starts, in a new terminal or by typing `!` and the printed
  command in the authoring session's terminal; never a subagent, and never a
  headless session the authoring agent starts (scope record, item 2).
  Admitting `!` is the lead's reading of the owner's words, not an owner
  ruling: the `!` launch is the same headless command, a child of the
  authoring tool's shell whose output lands in the author's context, and
  only who typed it differs. The owner's sign-off covers that reading.
  Since version 1.2 the operator may start these sessions at the start of
  the run, before their input exists: each waits through one Syzygy command
  for what Syzygy delivers into its directory, re-hashes it and reads it, and
  hands its result back through the same command, pre-approved to read and
  to run that command, never to write.
  One review session may go on to review later revisions, and the review
  page discloses it. Syzygy and the authoring session still start, resume
  and signal no session.
- **Presentation elements.** Since version 1.3 a draft may lay out its
  argument with tables, callouts, numbered steps, definition lists, cards,
  collapsible sections and code excerpts, rendered as inert static HTML. Every
  claim an element holds is checked, reviewed and marked as any claim block
  is; the short labels that head elements carry no claim; and a code excerpt
  is the cited lines as Syzygy read them, never the agent's copy.
- **What the agent ran is its report.** Commands the agent says it ran are
  recorded as its report, labelled Inferred; Syzygy cannot observe them.
- **No new permission.** This is not permission to read, egress, write,
  execute observed code, deploy, release or adopt intent.
````

Proposed:

````text
- **Syzygy's own reads keep every gate.** Observation consent, the observer
  registry entry, and the classification and screening policy acts apply to
  every Git object Syzygy reads, unchanged (direction item 3).
- **Who sends is the ruling, not whether consent is needed.** The agent's
  sends to its provider are the operator's own act (direction item 2). Every
  transmission Syzygy itself makes still traverses the egress check of
  REQ-polaris-generation-025; in this mode Syzygy makes none.
- **Unobservable things stay Inferred or unrecorded.** What the agent read,
  how much it spent and whether its review contexts were fresh are
  operator-declared or self-reported, and the page says so. Only Syzygy's own
  reads, checks and steps are Observed.
- **Any repository, SEC-2 kept whole.** The owner allowed the mode on any
  repository (scope record, item 1; review-1 rulings, item 2). A subject
  governed under 032's four conditions, or silent about them, needs an
  in-force per-project statement naming the operator's agent provider,
  SEC-2's "explicit, recorded, per-project consent". The statement is a
  consent record; neither its content classes nor SEC-5 screening bind what
  the agent reads or sends, and every page says so.
- **Syzygy's records within the agent's reach.** On a single-user host the
  agent can write Syzygy's state directory. As the owner ruled (R1,
  `POLARIS-DOSSIER-LOCAL-AGENT-RECORDS-2026-10-05`), nothing Observed rests
  on a stored record and every value shown from one is labelled Inferred.
  That reads REQ-polaris-generation-018 and 022 for this mode. The reading
  of 020's work-item gates, and option A's fuller cost (agent-editable
  refusal records, stored pinned revision and packets), go to the owner with
  the sign-off.
- **Reviews in sessions the operator starts.** Separate top-level sessions
  the operator starts, in a new terminal or by typing `!` and the printed
  command in the authoring session's terminal; never a subagent, and never a
  headless session the authoring agent starts (scope record, item 2).
  Admitting `!` is the lead's reading of the owner's words, not an owner
  ruling: the `!` launch is the same headless command, a child of the
  authoring tool's shell whose output lands in the author's context, and
  only who typed it differs. The owner's sign-off covers that reading.
  Since version 1.2 the operator may start these sessions at the start of
  the run, before their input exists: each waits through one Syzygy command
  for what Syzygy delivers into its directory, re-hashes it and reads it, and
  hands its result back through the same command, pre-approved to read and
  to run that command, never to write.
  One review session may go on to review later revisions, and the review
  page discloses it. Syzygy and the authoring session still start, resume
  and signal no session.
- **Presentation elements.** Since version 1.3 a draft may lay out its
  argument with tables, callouts, numbered steps, definition lists, cards,
  collapsible sections and code excerpts, rendered as inert static HTML. Every
  claim an element holds is checked, reviewed and marked as any claim block
  is; table cells are read with their headings. Empty cells show "-" and
  state nothing, while an absence or negative remains a labelled claim.
  Short labels, callout tone and step order carry no claim, which Syzygy
  checks in part and the reviews judge. Short-label limits count Unicode
  code points; collapsed summaries disclose their Unknown-claim count.
  A code excerpt is escaped text from Syzygy's verified read, never the
  agent's copy, with a path-derived language label when the agent gives
  none and one can be determined; an agent value is only a presentation
  hint. A path excluded before reading stays unread, with no excerpt
  body-end check; missing paths, malformed/reversed ranges and citations
  over 60 lines still fail. Bodies read and then excluded retain possible
  range checks without disclosing bytes or length. Excluded or invalid-
  UTF-8 excerpts render Unknown; any displayed submitted range is stated
  as agent-supplied and unverified. Ordinary-block citation obligations
  remain as written in REQ-polaris-generation-034. These changes retain
  v2/v3 schema compatibility and await version 1.4 sign-off.
- **What the agent ran is its report.** Commands the agent says it ran are
  recorded as its report, labelled Inferred; Syzygy cannot observe them.
- **No new permission.** This is not permission to read, egress, write,
  execute observed code, deploy, release or adopt intent.
````

## Change classification and preserved boundaries

[Inferred] The empty marker, compulsory Unknown count, table-context review,
explicit excerpt escaping/invalid-UTF-8 withholding, length unit, language
hint/path derivation and displayed-range disclosure are normative: a reader
may have complied with v1.3 yet fail one of these statements. The code-only
path-exclusion exception narrows the unconditional body-end obligation and
is normative. Placement, the citation-check cross-reference, the explicit
“citation of more than 60 lines”, moving passing arms to the rendering
scenario and the proposal's admitted review residual clarify existing
intent; paragraph splitting is structural. Review must challenge these
classifications as well as the wording.

[Inferred] No new requirement or schema identity is introduced. Draft v2
remains accepted without elements; draft v3 keeps its fields and seven
element kinds. Neither gains a source, read, provider, script, execution,
consent or screening permission. Labels, negative-claim handling, source
identity, quotation fidelity, coverage, per-claim fidelity entries, inert
HTML and source-page admission remain. The ordinary-block body-end rule is
preserved, including the known separately routed implementation gap.

## Excerpt behavior matrix

[Inferred] These are proposed obligations, not observations of PR740.

| Citation/body state | Check | Render/disclosure |
|---|---|---|
| Missing or non-blob path | Finding; no source body needed | No source page or anchor for absent citation |
| Malformed/reversed or more than 60 lines | Finding, including path-excluded citations | Draft cannot proceed with unresolved finding |
| Existing path excluded before reading, otherwise valid excerpt | No body read and no body-end check | Unknown `excluded-content`; no bytes/length; submitted range only if explicitly agent-supplied and unverified |
| Body read, then content-screened or invalid UTF-8 | Preserve available body-end check; beyond-end finding contains no bytes/length | Unknown `excluded-content`; no bytes/length; same range disclosure |
| Body read, verified and admitted, valid range | Verify range and text; 60-line limit | Escaped source text, Observed quotation and recomputed source identity |
| Ordinary claim-block citation | Existing 034 obligation retained | No code-excerpt exception is inferred for it |

## Terms, downstream impact and migration

[Inferred] No durable term is introduced or retired; “body-end check” names
the existing range-end predicate here. `IMPACT-LEDGER.md` and its generated
sweep enumerate dependents and the install chain. Pre-sign-off rollback is
abandoning this candidate. After sign-off, corrections need a later version;
never edit the predecessor package, act, raw review or performed tag.

## Review

**Required class:** fresh-context normative review under CC-REV-4 and
Scope A item 3, using `REVIEW-BRIEF.md`.
**Reviewer:** [Unknown] not enrolled by this authoring lane.
**Verdict:** [Unknown] no review of this v1.4 package has occurred.
Review clearance applies only to the exact commit read; later edits require
a fresh round before offering. Owner selection and recording remain open.
