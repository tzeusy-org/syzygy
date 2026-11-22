# Design: coverage pre-check and justified-omission record

One bead outcome (syzygy-5dhm.28) in one MODIFIED REQ-polaris-generation-034. The bead names REQ-034 because the two additions are a member of check's report and a member of the draft schema, both of which that requirement states. REQ-polaris-generation-035 (the inventory, the packet and the verdict) is read, not changed.

## Why a specification delta at all

[Observed] A-15 (the structure record) and A-16 added advice to check's report with no delta, on the ground that REQ-034 "governs no advice member of check's report". [Inferred] That ground does not carry this change: the omission record is a new member of the draft schema, which REQ-034 defines version by version, and the advice hands the authoring session facts about the independent inventory, whose independence REQ-035 states. Both need a clause to be lawful and reviewable.

## The rule

[Observed] The rule is the one measured before this slice was filed: `overlapOrNamed` in the pursuit's figure `c_r4_replay`, 151 of 181 reviewer-unsupported entries listed, 12 of 184 listed entries reviewer-accepted. Two other forms were measured beside it: overlap alone lists more (220, of them 17 accepted and 36 justified omissions), and same-path-or-named lists far fewer (92, recall 0.43). The move's text fixes the first. [Observed] A seventh run stored after that measurement lists 6 of its 23 entries, 5 of them entries its reviewer marked represented and 1 unsupported, so over seven runs the rule lists 190 of 408, 152 of the 183 unsupported and 17 represented (same record, `pooled`; the six-run population is its `pinned`). [Inferred] One run is not a trend, but the listed-yet-represented share is what slice 2 must weigh before the listing gates anything.

- **Reading content.** [Inferred] The citations that count are those under `introduction`, `sections`, `diagrams`, `deepDives` and `unresolved`: what a reader of the dossier is shown. The understanding record cites every item of the author's ledger whether or not the dossier says anything about it, so counting it would hide exactly the entries the reviewer faults. The prototype walked the same five members; it did not count a code excerpt's single `citation`, and the shipped rule does, because an excerpt shows the reader those lines. [Observed] Over the six stored runs the two give the same listed-entry set in every run (`docs/evidence/syzygy-5dhm-28/coverage-precheck-replay-2026-11-22.json`: the per-run counts equal the figure's; the sets were compared by digest in the authoring session, which the record does not retain).
- **Named path.** [Inferred] A claim block's text is searched for the entry's path as a plain substring. It is deliberately weak evidence of coverage: it keeps the rule from listing an entry the draft discusses by file name while citing a different span. The prototype searched cited blocks' text only; the shipped rule searches every claim block's, cited or not, so an `unknown` block that says a file states nothing on a point counts as discussing that file. [Observed] No stored run's listing differs for it (same record).
- **Closed ranges.** Lines are inclusive at both ends, as a citation's are everywhere else in REQ-034, so ranges that touch at one line overlap.
- **Malformed range.** A citation without a well-formed range counts as its whole file. Check already reports such a citation as a finding; treating it as covering nothing would list entries for a reason the author is already told about.
- **Version.** The advice names `{"id": "overlap-or-path-named", "version": 1}` so a later, sharper rule (slice 3's coverage plan may replace it) is a visible change, not a silent one.

## What the authoring session learns of the inventory

[Inferred] REQ-035 keeps the inventory independent by keeping the draft from the inventory session. The reverse direction was open until now: nothing told the author anything of the inventory before the reviewer's verdict, which itself names entry identifiers and reasons. The move's text draws the line at "entry identifier and path only, never the entry's text". The clause therefore lists what the advice may not carry (statement, kind, label, Unknown reason, quotations, citation identifiers, line ranges) instead of what it may, so an added field is a violation by default.

[Inferred] Line ranges are withheld on purpose. With them the author could cite an entry's exact span without reading it; with paths alone the author has to read the file and decide what it states. The cost is that a large file gives a weak pointer; slice 3's coverage plan is where a stronger one belongs.

[Inferred] An entry identifier is the inventory session's own handle and may be descriptive (`e-purpose`). That is the same identifier every fidelity verdict already returns to the author, so the advice discloses nothing a first review round would not.

## Secret paths

[Observed] A path that a secret detector matches is named nowhere in check's output: `citedBlobs` carries `path: null`, the structure record counts such paths (`secretPathsLeftOut`), and `reviewVisibility` writes a fixed phrase. The advice follows them: the path is left out of `paths` and counted in `unnamedPaths`. The comparison itself uses the path (it must, to find an overlap) and prints nothing of it. No screening rule is changed or weakened; the detector is the bound policy's `screenPath`.

## Unknown, never zero

[Inferred] VIS-2: with no inventory compared, "no uncovered entries" would be a green nobody measured. The Unknown form carries no list and no count, so no consumer can read it as empty. It covers every way the comparison can fail, a throwing reader included, because the advice is computed after the check record is written: an exception there would lose the report of a revision already frozen and counted against the repair-cycle limit.

## The inventory compared, and its label

[Observed] `inventoryOfRecord` (`inventory.ts`) is what the fidelity packet uses to decide which inventory counts. The advice uses the same function at the same check, so the author is told about the inventory the next review would be built from, and the advice names its revision and digest. Everything it reads is in the run directory, within the agent sessions' write reach, so the advice labels the inventory Inferred and says why.

[Observed] In the stored runs the inventory is prepared after draft revision 0 is frozen (`inventory-check` refuses while no draft revision is frozen) and before the first reviewed revision, which is revision 1 in all six. So the advice is Unknown on the first check and compared from the check that follows the inventory, which is before the first review in every stored run.

## The omission record

- **In the draft, not beside it.** [Inferred] The record has to be frozen with the revision it speaks for and reach the reviewer with it. A file beside the draft would be neither.
- **`entryId`, not `id`.** [Observed] Check walks every `id` in a draft as an identity and reports duplicates (`check-derive.ts`). An inventory identifier is not a draft identity and may equal one by chance.
- **Not resolved at check.** [Inferred] The inventory may not count yet, or may be revised after the draft; a finding for an unmatched identifier would refuse a draft over a document the author cannot read. The advice reports unmatched identifiers instead.
- **No schema version.** [Inferred] Every earlier change to the draft's shape took a version. This one does not, for three reasons stated in the clause: the member is optional and inert (no claim, no label, no citation, never rendered), a v5 or later draft without it is checked and rendered byte for byte as before, and version 2.4 has already fixed `polaris-dossier-local-draft-v6` as "a schema-v5 draft in every respect but one", so a v6 draft inherits the member and a seventh version for an optional ledger field would force a brief version with no change to the brief's words. [Observed] The schema file a brief issues is written per run with its own digest in the brief (`brief.ts`), so a run briefed after this version describes the member and a run briefed before it does not; check accepts the member either way, since check builds the schema itself.
- **Earlier schemas.** In v2, v3 or v4 the member is a `field-version` finding, as `home` and `thesisBasis` are, so the clause "checked and rendered exactly as before" stays true of those versions for every draft that passed.
- **Never rendered.** [Observed] The renderer reads the draft's members by name and copies no member wholesale (`dossier-render.ts`, `dossier-site.ts`), so the record reaches no page today; the clause makes that a rule a later renderer change must keep. A `reason` is the author's unverified prose.
- **The packet carries it.** [Observed] `buildFidelityPacket` carries the draft document without its `discovery` member and nothing else removed. [Inferred] That is the right outcome and is stated, not changed: the reviewer should read the author's reason when deciding `justified-omission`, and the criteria already make that the reviewer's own judgement.

## What this does not decide

[Inferred] Whether the review step should wait until every listed entry has an outcome (slice 2), the coverage plan and the narrowed fidelity brief (slice 3), and the before-and-after measure of review rounds (slice 4) are separate adoptions. Until slice 2 the advice is something an author may ignore; the note says what ignoring it costs.

## Names fixed for the implementation

`packages/polaris-dossier/src/inventory-coverage.ts`: `COVERAGE_RULE`, `compareInventoryCoverage`, `inventoryCoverageAdvice`; `CheckDeps.inventoryOfRecord`, a port the CLI fills with `inventoryOfRecord` (`inventory.ts` imports the check, so the check does not import it back); `draft-schema.ts`: `inventoryOmissions`, `INVENTORY_OMISSIONS_SINCE`, `PRE_V5_SCHEMA_VERSIONS`.

## Review of the first draft (as version 2.5 over version 2.4)

[Observed] One fresh-reader review, `docs/reviews/syzygy-5dhm-28/R-COVERAGE-PRECHECK-SPEC-1-RAW.md`, over spec digest `d2fea77dc740445f9922fbd82ec9260de54dccd9af978c0fcbd54b230331089c`: verdict `CONFIRM WITH EXCEPTIONS` (line 3), ten findings, F1 blocking on the supporting files and F2 to F10 advisory. The repairs below changed the spec, and it was then rebuilt over a later predecessor (next section), so the reviewed digest is not the adopted one; the adopted digest is the one `scripts/check_spec_reconciliation.py` binds. No confirmation round was run (one non-gating review under D10). No finding was overruled.

- **F1** (supporting files stated things not yet true): repaired. The scripts are wired, the replay record and the mutation record are in `docs/evidence/syzygy-5dhm-28/` and cited by file, this section exists, and the adoption-row box of `tasks.md` is ticked only by the commit that appends the row.
- **F2** (inventory of record undefined, "latest ... passed" ambiguous): repaired in the clause, which now defines the term, says the highest-numbered revision counts only if it passed, and names REQ-035's conditions; a scenario line and a Falsifier clause cover the earlier-passed-revision case.
- **F3** (a claim block's text undefined; substring behaviour unstated): repaired. The clause names the `text` member, says which blocks are claim blocks, that short labels are not searched and that a path inside a longer path counts; scenario and Falsifier follow.
- **F4** (independence sentence overclaimed): repaired. The sentence is replaced by what the clause promises and what it does not (identifiers are the inventory session's wording; successive checks can narrow a span, bounded by the repair-cycle limit). [Inferred] Whether the inventory brief should ask for opaque identifiers is left to a later adoption.
- **F5** (Unknown incomplete for a failing comparison; `why` without vocabulary): repaired. Any failure at any point is Unknown and that sentence governs; `why` is stated to be Syzygy's own sentence, tested for the case it names where the reason is REQ-035's.
- **F6** (a represented entry the rule cannot see has only a false record to take): repaired by the first of the reviewer's two options. The clause and the note say a represented entry takes no record even while listed. [Inferred] A record naming the representing block is left to slice 2, where a listing starts to matter.
- **F7** (`reason` an unchecked channel; "claims nothing" unenforced; changed-block list silent): repaired in wording. The clause says what Syzygy does (checks no claim in a reason; it is the author's unverified statement) and that the changed-block list does not show the record. Telling the reviewer so in the fidelity criteria is slice 3's.
- **F8** (no schema version: three consequences unstated): repaired. The clause gives inertness as the reason, says the v5 and later identifiers now name a schema with the member, that the brief's stated schema digest changes under an unchanged brief version, and that check accepts the member whichever schema file a run was briefed with. [Observed] The brief-v10 golden comparison still passes (`npm run check:all`, in the bead's report).
- **F9** (shapes and units): repaired. Lists and their orders, distinct paths, Unicode code points (the unit `closed-schema.ts` counts), the identity pattern, when an identifier is null, exact path comparison, and wholly withheld entries (decided like any other, since the rule reads no file) are stated.
- **F10** (SHALLs without coverage): repaired. One scenario added (the compared form's fixed members, its note and the inventory check's report), and the Case, Observable and Falsifier lines extended, so the requirement then had 67 scenarios (60 of the predecessor it was drafted over, and 7).

[Unknown] The reviewer's three unchecked items stand as it left them, with one addition: [Observed] the renderer builds pages from named members (`dossier-site.ts`, `dossier-render.ts`), and the flow test asserts the packet carries the record; no test renders a site from a draft with the record, so "no rendered file carries it" rests on reading the renderer. Whether a URL-supervised run stores the authoring context's command output is not checked here: the clause binds what `check` writes, not what a harness keeps of a session.

## Second review, and the rebuild as version 2.6

[Observed] The dispatching session reviewed the pushed branch (code and specification, head `f106552f9`) and returned two blocking and four further corrections with two notes; its findings are in the bead's record, not a retained raw. All were taken.

- **Predecessor.** [Observed] Figure kinds was adopted as version 2.5 (row A-21) while this change was in review. A complete MODIFIED REQ-034 built on version 2.4 would have dropped figure kinds' paragraphs and scenarios, so the requirement was rebuilt from the figure kinds bytes by the same anchored script and is version 2.6: 70 scenarios carried, 7 added, 77. [Observed] A line diff against the figure kinds text shows the title, the preamble, the two amended lines, the four Form lines, the warrants line and two insertions (10 and 44 lines), nothing else. The fresh-reader review above is bound to the earlier bytes; no further fresh-reader round was run.
- **A path both denied and secret-matching.** [Observed] Path screening answers `denied-path` before it tries a detector (`screen.ts`, `screenPath`), so a test for `secret-detector-match` on that answer named such a path. The advice now asks `secretPathOf` (`derived-record.ts`), which runs the detectors over the path whatever a denied-path rule says; the clause and the secret-path scenario say "whether or not a denied-path rule also names it". This tightens what is withheld and changes no screening rule.
- **The reviewer is told of the record.** One sentence is added to the fidelity packet's coverage criterion (F7 above left this to slice 3; the second review asked for it now, since the record reaches the reviewer from this version on). The clause requires it and says the criteria are otherwise unchanged. [Inferred] It changes every later fidelity packet's digest and no stored verdict.
- **Rows, distinct identifiers and duplicates.** `omissions` now gives `rows`, `recorded` (distinct) and `duplicated`, so a repeated identifier is visible in the advice though it is no finding.
- **A reason is required to count.** An object without a non-empty string `reason` records nothing in the comparison. [Inferred] A v5 draft with such an object already carries a schema finding; this matters for the comparison's own tolerance of wrong shapes and for the replay.
- **An empty path is never "named".** Every string contains the empty string, so the rule guards it.
- **The member's name.** The report member is `inventoryCoverageAdvice`, so it never shares a name with the fidelity verdict's `inventoryCoverage`.
- **The replay record.** It now carries `capturedAt`, the run identifiers of each population, the six-run population as `pinned` and the whole population as `pooled`, and reads run directories with `lstat`.

[Observed] Not changed here, and reported: the check's own finding text and its `citedBlobs` use the path-screening answer alone (`check-derive.ts`), so a path both denied and secret-matching is printed by them today; that predates this change and is tracked separately.

## Rebuilt as version 2.12

[Observed] While this change waited, six more versions of the dossier line were adopted (2.6 to 2.11, rows A-27 to A-31 and A-36), five of them complete replacements of REQ-polaris-generation-034. The version number 2.6 and the row identifier this change had prepared were taken, and a complete MODIFIED requirement built on figure kinds 2.5 would have dropped every paragraph and scenario those five added. So the requirement was rebuilt from the bytes of spec corrections 2.11 (SHA-256 `376f27c0261120d0238d0d4a6685fe08b19ff03a9d00fcb4a6702349f64834c3`) by a script that edits only at anchors it asserts occur exactly once: 110 scenarios carried, 7 added, 117.

- **Survival.** [Observed] A line diff of the predecessor against the new text changes eight predecessor lines and deletes none: the title, the preamble, the schema-v5 paragraph (its closing sentences replaced as `SEMANTIC-DELTA.md` quotes), the one AND line of "Schema-v4 draft unchanged", and the Case, Observable, Oracle and Falsifier lines, each of which keeps its predecessor line as a prefix. Every other predecessor line, all 110 scenario headings among them, is in the new text unchanged and in order; the insertions are 10 lines before `ID:` and 44 before `Form:`.
- **Warrants.** [Observed] The predecessor's warrants already name REQ-polaris-generation-035 as a parent requirement, so this version changes no warrant and its dependency union is the predecessor's.
- **The compared form's `omissions`.** The sentence giving the compared form now names all five members (`rows`, `recorded`, `duplicated`, `unmatched`, `alsoCovered`); the 2.6 text named three there and five in the paragraph that defines them.
- **Advice classes.** [Observed] Version 2.9 gave reader advisories and figure-fit entries a class, put only `author`-class advice on check's report and wrote `mechanism`-class entries to `run-advice.json`. One sentence now says the coverage advice carries no class member, is on the report, and enters no run file; the code writes that file from check records alone, which never hold this advice.
- **Version words.** Every "version 2.6" of the earlier text reads "version 2.12", and "its findings and rendered bytes are those of version 2.5" reads "version 2.11".
- **Review.** [Observed] No fresh-reader round was run over these bytes. The one review of record is bound to the first draft's digest (above); under D13 a later edit is noted beside a review and is no reason for another round.
- **Replay.** [Observed] The record was captured again at the rebuilt code: the six pinned runs give the figures above unchanged, and the population at capture is still seven runs.
