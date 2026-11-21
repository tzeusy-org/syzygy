# Design: coverage pre-check and justified-omission record

One bead outcome (syzygy-5dhm.28) in one MODIFIED REQ-polaris-generation-034. The bead names REQ-034 because the two additions are a member of check's report and a member of the draft schema, both of which that requirement states. REQ-polaris-generation-035 (the inventory, the packet and the verdict) is read, not changed.

## Why a specification delta at all

[Observed] A-15 (the structure record) and A-16 added advice to check's report with no delta, on the ground that REQ-034 "governs no advice member of check's report". [Inferred] That ground does not carry this change: the omission record is a new member of the draft schema, which REQ-034 defines version by version, and the advice hands the authoring session facts about the independent inventory, whose independence REQ-035 states. Both need a clause to be lawful and reviewable.

## The rule

[Observed] The rule is the one measured before this slice was filed: `overlapOrNamed` in the pursuit's figure `c_r4_replay`, 151 of 181 reviewer-unsupported entries listed, 12 of 184 listed entries reviewer-accepted. Two other forms were measured beside it: overlap alone lists more (220, of them 17 accepted and 36 justified omissions), and same-path-or-named lists far fewer (92, recall 0.43). The move's text fixes the first.

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

## Review

[Observed] One fresh-reader review, `docs/reviews/syzygy-5dhm-28/R-COVERAGE-PRECHECK-SPEC-1-RAW.md`, over spec digest `d2fea77dc740445f9922fbd82ec9260de54dccd9af978c0fcbd54b230331089c`: verdict `CONFIRM WITH EXCEPTIONS` (line 3), ten findings, F1 blocking on the supporting files and F2 to F10 advisory. The repairs below changed the spec, so the reviewed digest is not the adopted one; the adopted digest is the one `scripts/check_spec_reconciliation.py` binds. No confirmation round was run (one non-gating review under D10). No finding was overruled.

- **F1** (supporting files stated things not yet true): repaired. The scripts are wired, the replay record and the mutation record are in `docs/evidence/syzygy-5dhm-28/` and cited by file, this section exists, and the adoption-row box of `tasks.md` is ticked only by the commit that appends the row.
- **F2** (inventory of record undefined, "latest ... passed" ambiguous): repaired in the clause, which now defines the term, says the highest-numbered revision counts only if it passed, and names REQ-035's conditions; a scenario line and a Falsifier clause cover the earlier-passed-revision case.
- **F3** (a claim block's text undefined; substring behaviour unstated): repaired. The clause names the `text` member, says which blocks are claim blocks, that short labels are not searched and that a path inside a longer path counts; scenario and Falsifier follow.
- **F4** (independence sentence overclaimed): repaired. The sentence is replaced by what the clause promises and what it does not (identifiers are the inventory session's wording; successive checks can narrow a span, bounded by the repair-cycle limit). [Inferred] Whether the inventory brief should ask for opaque identifiers is left to a later adoption.
- **F5** (Unknown incomplete for a failing comparison; `why` without vocabulary): repaired. Any failure at any point is Unknown and that sentence governs; `why` is stated to be Syzygy's own sentence, tested for the case it names where the reason is REQ-035's.
- **F6** (a represented entry the rule cannot see has only a false record to take): repaired by the first of the reviewer's two options. The clause and the note say a represented entry takes no record even while listed. [Inferred] A record naming the representing block is left to slice 2, where a listing starts to matter.
- **F7** (`reason` an unchecked channel; "claims nothing" unenforced; changed-block list silent): repaired in wording. The clause says what Syzygy does (checks no claim in a reason; it is the author's unverified statement) and that the changed-block list does not show the record. Telling the reviewer so in the fidelity criteria is slice 3's.
- **F8** (no schema version: three consequences unstated): repaired. The clause gives inertness as the reason, says the v5 and later identifiers now name a schema with the member, that the brief's stated schema digest changes under an unchanged brief version, and that check accepts the member whichever schema file a run was briefed with. [Observed] The brief-v10 golden comparison still passes (`npm run check:all`, in the bead's report).
- **F9** (shapes and units): repaired. Lists and their orders, distinct paths, Unicode code points (the unit `closed-schema.ts` counts), the identity pattern, when an identifier is null, exact path comparison, and wholly withheld entries (decided like any other, since the rule reads no file) are stated.
- **F10** (SHALLs without coverage): repaired. One scenario added (the compared form's fixed members, its note and the inventory check's report), and the Case, Observable and Falsifier lines extended, so the requirement has 67 scenarios.

[Unknown] The reviewer's three unchecked items stand as it left them, with one addition: [Observed] the renderer builds pages from named members (`dossier-site.ts`, `dossier-render.ts`), and the flow test asserts the packet carries the record; no test renders a site from a draft with the record, so "no rendered file carries it" rests on reading the renderer. Whether a URL-supervised run stores the authoring context's command output is not checked here: the clause binds what `check` writes, not what a harness keeps of a session.
