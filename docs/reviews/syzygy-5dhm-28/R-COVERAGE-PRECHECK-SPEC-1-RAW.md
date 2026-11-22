# R-COVERAGE-PRECHECK-SPEC-1 — fresh-reader review of dossier coverage pre-check 2.5
Subject SHA-256: d2fea77dc740445f9922fbd82ec9260de54dccd9af978c0fcbd54b230331089c
Verdict: CONFIRM WITH EXCEPTIONS
Reviewer: fresh-context agent, 2026-11-22

## What was reviewed, and how

- [Observed] `sha256sum openspec/changes/dossier-coverage-precheck/proposed/polaris-generation/spec.md` gives `d2fea77dc740445f9922fbd82ec9260de54dccd9af978c0fcbd54b230331089c`. It matches the expected digest.
- [Observed] The predecessor `openspec/changes/dossier-ledger-packs-thesis/proposed/polaris-generation/spec.md` hashes to `500a7771f3df85046ff2c0c41a36c2067cf0bf44b1ba65e5bb5f52d4dbd9fded`, the digest SEMANTIC-DELTA.md names, and `scripts/check_spec_reconciliation.py` line 466 carries that digest.
- Read: the six supporting files of the change; the predecessor; REQ-polaris-generation-035 as `openspec/changes/dossier-url-declared-source-run/proposed/polaris-generation/spec.md` carries it (candidate version 2.1, the later of the two named); REQ-polaris-generation-006 in `openspec/changes/polaris-manifesto-understanding-amendment/specs/polaris-generation/spec.md`.
- Code was opened only to verify [Observed] citations of design.md and proposal.md: `inventory.ts` (`inventoryOfRecord`), `brief.ts` (schema digest), `review-packet.ts` (the draft without `discovery`), `draft-schema.ts` (grep only).
- No run state was read. No command asking for consent was run.

The verdict is on the subject bytes. No finding on the requirement text is blocking. The one blocking finding (F1) is on the supporting files, which state things that are not true at the reviewed tree.

## The byte-for-byte claim

[Observed] Python `difflib.SequenceMatcher` over the two files split at newlines (448 and 494 elements, `autojunk` off) gives exactly these non-equal opcodes and no other:

| Predecessor line | New line(s) | What |
|---|---|---|
| 1 | 1 | title |
| 3 | 3 | preamble |
| 40 | 40 | schema-v5 paragraph |
| (after 68) | 69–78 | five new paragraphs, each preceded by a blank line (lengths 788, 1121, 1389, 1634, 1743) |
| 278 | 288 | AND line of "Schema-v4 draft unchanged" |
| (after 429) | 440–475 | six new scenarios |
| 432–434 | 478–480 | Case, Observable, Oracle |
| 436 | 482 | Falsifier |
| 446 | 492 | `parent_requirements` |

[Observed] Checked by script against the JSON block of SEMANTIC-DELTA.md: each of the three `old` spans with text occurs exactly once in the predecessor and zero times in the new file; each matching `new` occurs exactly once in the new file; each of the four Form lines of the new file equals the predecessor's line followed by the delta's `new` text, exactly. Scenario headings: 60 in the predecessor, 66 in the new file. The delta's "7 changes inside existing lines", five paragraphs, six scenarios, and "besides the file's title and preamble" are exactly what differs. Criterion 7 is met for the subject.

## Acceptance criteria

1. Met. The advice is on check's report, lists by `entryId` and `paths` only, and the clause names what it may not carry. See F4 and F5 for what identifier and path still disclose.
2. Met for justified omission. See F6: there is no way to record the other outcome, `represented`, for a listed entry.
3. Met. [Observed] The advice "SHALL NOT be a repair finding, SHALL NOT change the check's outcome, its exit status or any refusal". [Inferred] A v2–v4 draft carrying `inventoryOmissions` already fails today under the carried sentence "any other unknown member is a schema finding" (new file line 52), so the new `field-version` finding refuses no draft that passed.
4. Met. A secret-matching path is left out of `paths` and counted; no screening rule is restated or changed.
5. Met as stated: "Syzygy SHALL NOT render it", "The provider mode is unaffected", and the advice "is no finding and no rendered byte". No script is introduced.
6. Met. [Inferred] Nothing here edits doctrine, weakens secret detection or SEC-5, writes to another repository, or exposes or releases anything. A report member and an optional draft member are agent-decided under VIS-4 as amended by D10.
7. Met for the subject (above). Not met by the supporting files as they stand (F1).

## Findings

### F1 — blocking (supporting files, not the subject): four state claims are false at the reviewed tree

- `tasks.md`: "[x] Wire the overlay into `scripts/check_spec_reconciliation.py` (pending until its row) and `scripts/count_polaris_effective_scenarios.py`, with selftest cases." [Observed] `grep -nF "coverage-precheck"` over both scripts returns no line, and `git status` shows neither script modified.
- `tasks.md`: "[x] Append the agent-adoption row naming the installing commit." [Observed] `grep -F -c "coverage-precheck" .syzygy/governance/decisions/AGENT-ADOPTIONS.md` prints 0.
- `tasks.md`: "[x] One independent fresh-reader review (CC-REV-4), raw retained, findings dispositioned." [Observed] `docs/reviews/syzygy-5dhm-28/` was empty before this file; README.md says design.md holds "the review's dispositions" and design.md has no such section.
- `proposal.md`: "[Observed] ... reproduced with the shipped rule in `docs/evidence/syzygy-5dhm-28/`", and design.md's two "[Observed] Over the six stored runs ..." / "No stored run's listing differs for it" sentences. [Observed] `ls docs/evidence/syzygy-5dhm-28` fails: no such directory. An [Observed] claim whose record is not in the tree cannot be re-checked (rule 11).
- README.md's "[Observed] `scripts/check_spec_reconciliation.py` composes it after version 2.4 only once ..." describes a checker that does not yet know this overlay.

Repair: make each true in the installing commit (wire the scripts, land the replay record with its subject and digest, add the dispositions section, append the row) or untick the box and relabel the sentence [Inferred] until it is. A ticked adoption row with no row must not be committed.

### F2 — advisory: "inventory of record as REQ-polaris-generation-035 counts it" points at a term that requirement does not define

Text: "The inventory compared is the inventory of record as REQ-polaris-generation-035 counts it at the instant of that check: the latest checked inventory revision, passed, its frozen bytes equal to the digest its check recorded, under that requirement's other conditions."

[Observed] The phrase "inventory of record" occurs in no specification file outside this change (sweep of `openspec/**` by `grep -rlF`). REQ-035 states conditions under which an inventory does not count (launch form, session identifier), but no clause that picks one revision. Two readings of "the latest checked inventory revision, passed" differ observably, since the advice names the revision: the latest revision provided it passed, or the latest revision that passed. [Observed] `inventoryOfRecord` in `inventory.ts` takes the highest revision and returns "does not count" if it has open findings, so the first reading is the implemented one. "that requirement's other conditions" is not enumerable from the text.

Repair: say "the highest-numbered checked inventory revision, and only if its check passed; an earlier passed revision never counts", and name the other conditions (session identifier distinct from the authoring session's; launch form and prompt record present and bound) or cite the sentences of REQ-035 that state them.

### F3 — advisory: "the text of a claim block" is not defined, so rule (b) admits two implementations

Text: "(b) the text of a claim block of the draft contains, compared code unit by code unit, a path one of the entry's citations names."

[Observed] The predecessor never defines a claim block's "text" (no "block's text" in the file). A block carries more than one string: its statement, its basis, its quotations, a table's row and column labels, an element's short labels. An implementation searching statements only and one searching every string of the block list different entries for a draft that names a path only in a basis or a quotation. The Oracle line requires literals "by the stated rule", so the rule must fix this.

Also unstated: that the match is a plain substring, so `a.md` is found inside `data.md` and a root `README.md` inside a mention of another directory's README. design.md says so ("as a plain substring ... deliberately weak"); the clause should.

Repair: name the members searched, and state the substring behaviour with one sentence and one scenario line (a short path matched inside a longer one counts as covered).

### F4 — advisory: the independence sentence claims more than identifier-and-path gives

Text: "The authoring session so learns that an entry exists and which files it points at, never what the inventory says of them, and the inventory stays independent of the draft."

- [Inferred] An entry identifier is free text the inventory session chose (design.md's own example is `e-purpose`), up to 100 characters. It can state the entry's subject. The clause forbids the statement, not a statement-bearing identifier.
- [Inferred] Line ranges are "withheld on purpose" (design.md) but are recoverable: the author can vary a citation's range across checks and watch the entry leave `uncovered`. Each check is a draft revision and counts against the repair-cycle limit, so the probe is bounded, not absent.
- [Inferred] `omissions.unmatched` and `omissions.alsoCovered` let the author test guessed identifiers, including those of covered entries, which `uncovered` never lists.

None of this breaks criterion 1 as worded. The sentence "never what the inventory says of them" is the overclaim. Repair: reword it to what holds ("the advice carries no member of an entry but its identifier and paths; an identifier is the inventory session's own wording, and coverage outcomes across revisions can narrow where an entry points"), and have the `note` say the same. Whether REQ-035's inventory brief should ask for opaque identifiers is a separate adoption.

### F5 — advisory: the Unknown case is complete for the inventory, not for the comparison

Text, first paragraph: "A failure to compute it SHALL NOT refuse or fail a check: every such failure is the Unknown form below." Second paragraph: "Where one counts and its frozen bytes are one JSON object, the advice SHALL be `{"state": "compared", ...}`", and the Unknown parenthesis lists only inventory cases: "(no inventory counts, the frozen inventory cannot be read or is not the bytes counted, it is not one JSON object, or reading it fails in any other way)".

- A failure after the inventory is read (a draft that parses but whose `sections` is not a list; an inventory object with no entry list) is Unknown by the first sentence and `compared` by the second. The first should win and the second should say so.
- `why` is "naming the case" with no vocabulary. [Observed] The implementation's reasons are free sentences (`inventory.ts` lines 359–385), one of which embeds the run directory path in a suggested command. Two implementations differ, and no scenario can assert a value. Either enumerate case tokens or say `why` is Syzygy's own free text and tested only for presence.
- Scenario "No inventory of record gives Unknown coverage" and the Falsifier cover the inventory cases; neither covers a comparison that throws on the draft.

VIS-2 itself is honoured: no list, no count, "never zero uncovered entries".

### F6 — advisory: an entry the draft represents but the rule cannot see has only a false outcome to record

Text: "An entry that cites nothing is covered by no citation and is listed with no path", and `reason` "saying why a reader of the dossier does not need the entry".

[Inferred] An entry with no citation (an Unknown the inventory states) can never be covered by the rule, whatever the draft says. [Observed] The measured rule also lists 12 of 184 entries the reviewer accepted as represented (`docs/evidence/pursuit-2026-11-21b/measure-now.json`, figure `c_r4_replay`, pooled `overlapOrNamed`). For both, the only way to clear the listing is an omission record, whose defined meaning is that the entry was left out. The reviewer then reads "omitted because ..." for an entry the draft represents. The work item's "same two outcomes" has one of the two. In this slice the advice may be ignored and the `note` says a listed entry may be represented; it becomes material when slice 2 makes the review wait on listed entries.

Repair, either: say in the clause that a listed entry needs no record and that recording an omission for a represented entry is wrong; or let a record name the draft block that represents the entry. The second is a larger change and can wait for slice 2, but the first belongs here.

### F7 — advisory: the omission `reason` is an unlabelled, unchecked author-to-reviewer text channel

Text: "The record claims nothing about the project and takes no label, citation or quotation; text in a `reason` is never verified as a quotation ... The fidelity packet carries the draft with the record ... so the review session reads the author's reasons".

- "claims nothing about the project" is a declarative no check enforces. A reason such as "this module is dead code" is a project claim with no label and no verdict entry. Up to 2000 reasons of 8000 characters reach the reviewer this way.
- [Observed] REQ-035's changed-block list "lists ... every claim block and every inventory entry ... says whether the understanding record differs; and says that it compares nothing else". A later round's list will not show a new or changed omission reason, yet the packet digest changes with it.
- [Observed] REQ-035's verdict covers "every inventory entry" and "every claim block"; a reason is neither, so nothing obliges the reviewer to judge it.

No contradiction with REQ-035 or REQ-006: the packet's subject is "the draft with its understanding record", the record is part of the draft, and "The candidate-authoring stage SHALL NOT define or narrow its own review denominator" holds because the verdict still has an entry for every inventory entry. Repair: replace "claims nothing about the project" with what Syzygy does ("Syzygy checks no claim in a `reason` and the reviewer treats it as the author's unverified statement"), and state in the clause that the changed-block list does not show the record. Telling the reviewer so in the fidelity criteria is slice 3's.

### F8 — advisory: "adds no schema version" is sound but not fully stated

Text: "The member adds no schema version: it is optional, the schema file a brief issues describes it, and a v5 or later draft without it is checked and rendered exactly as before version 2.5."

- Sound: [Observed] version 2.4 defines v6 as "a schema-v5 draft in every respect but one", so granting the member to v5 grants it to v6 with no further sentence, and the amended byte-identity sentences at line 40 stay true.
- Not stated: after 2.5 the identifiers `polaris-dossier-local-draft-v5` and `-v6` each name two different schema documents, and the same draft bytes (a v5 draft with the member) are a schema finding before 2.5 and pass after it. The schema version no longer determines the accepted set; the Syzygy version does. [Observed] `thesisBasis` is also optional (the Case line varies "its absence") and took a version, so "it is optional" alone is not the distinguishing reason; "inert and never rendered" is.
- Not stated: [Observed] the brief text carries the issued schema file's SHA-256 (`brief.ts` line 126). A brief issued after 2.5 therefore differs from one issued before it in that digest, under an unchanged `polaris-dossier-brief-v10` or `-v11`. proposal.md's "No change to the authoring brief's text or version" and the delta's "The brief, its version and its words" are true of the words and false of the bytes. Check that the carried Falsifier "a brief for it differs from brief v10 beyond the stated lines" still holds against the brief-v10 golden.
- Not stated: whether a run briefed before 2.5, whose issued schema file lacks the member, accepts it. design.md says yes ("check builds the schema itself"). The clause should.

Repair: add those three facts to the omission-record paragraph and correct the two "not changed" sentences to "the brief's words and version; its schema digest line changes with the schema file".

### F9 — advisory: shapes and units two implementations could spell differently

- `omissions`: "`recorded`, the number of distinct identifiers it names; `unmatched`, those that are no entry of this inventory; and `alsoCovered`, those naming an entry the rule finds covered". `recorded` is a number; `unmatched` and `alsoCovered` read as lists of identifiers (the scenario says "is in"), but their type and order are not stated.
- `unnamedPaths`: "the count of paths left out". Distinct paths, or citations?
- "a string of 1 to 100 characters" and "a text of 1 to 8000 characters": the predecessor says "Unicode code points" where it bounds a short label. Say which unit.
- "in the form every draft identity takes": the predecessor speaks of a "well-formed identity" and never states the form in this requirement. Cite where it is stated.
- "the entry's identifier, null where it has none": if a passed inventory always gives each entry an identifier, drop the clause; if not, say an omission record cannot name such an entry.
- "name the same path": say the comparison is exact, code unit by code unit, as rule (b) does.
- Inventory entries whose cited spans are all withheld (predecessor: such an entry "renders nowhere and blocks nothing"; REQ-035 gives it the verdict entry `withheld`): the rule lists them as uncovered like any other. That is a listing the reviewer would never fault. State the intended outcome and add it to the Case line.

### F10 — advisory: SHALLs with no scenario or Form coverage

- The `note` ("it SHALL say that the advice sets no outcome and is not stored, what the rule compares, that only identifiers and paths are given, how an omission is recorded, and that the rule is mechanical ..."): five required statements, no scenario, not in Observable, no Falsifier clause.
- The `rule` and `inventory` members (`revision`, `sha256`, `label: "Inferred"`, `basis`): no scenario asserts them; the Falsifier has no "names another revision or digest, or labels the inventory Observed".
- "A check of an inventory computes none": no scenario, and the new Case text does not vary it (the carried "checking an inventory" belongs to the reading ledger).
- "Unknown reason" is in the SHALL's forbidden list but missing from the first scenario's AND line and from the Falsifier's list ("any text, kind, label, quotation, citation identifier or line range").
- The record's bounds (2000 objects, 100 and 8000 characters) and a duplicate `entryId`: the Case says "malformed" only.
- "counts ... those three sum to `entries`": no Falsifier clause.
- Covered: overlap at one line and a miss by one line, a named path, the understanding record and discovery account covering nothing, the secret-matching path, `field-version` in v2–v4, the outcome and exit status unchanged, no file written.

Repair: one scenario for the compared form's fixed members and note, and five short additions to the Falsifier.

## Parts found sound

- The delta is exact (table above).
- VIS-2: the Unknown form carries no list and no count; the compared form labels its inventory Inferred with a basis.
- SEC-5 and the secret rules: nothing is weakened; a matching path is counted, never named, and the entry is still listed.
- REQ-006 and REQ-035: no carried sentence is contradicted; the packet, the criteria, the verdict and readiness are untouched, and adding REQ-035 to `parent_requirements` matches GOVERNING-DEPENDENCIES.json.
- Closed line ranges and the whole-file reading of a malformed range are stated unambiguously and tested at both edges.
- [Observed] proposal.md's figures match the evidence record: pooled `overlapOrNamed` is 181 unsupported, 184 listed, 151 listed unsupported, 12 listed represented; `overlapOnly` 220 listed with 17 and 36; `samePathOrNamed` 92 listed, recall 0.431. The "385 inventory entries" denominator was not re-derived [Unknown].
- [Observed] design.md's claims that the packet drops only `discovery` (`review-packet.ts` line 72) and that the schema file is written per run with its digest in the brief (`brief.ts` lines 126, 304–305) hold.

## Not checked

- [Unknown] The stored runs, and so every "[Observed] In the stored runs" sentence of design.md.
- [Unknown] Whether the renderer copies no draft member wholesale (`dossier-render.ts`, `dossier-site.ts` not opened).
- [Unknown] Whether a URL-supervised run stores the authoring context's command output, which would put the advice in a file Syzygy keeps despite "write it to no file".
