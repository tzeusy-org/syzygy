Proposed-spec line numbers below refer to the reconstructed bytes (digest 58997d30…).

Polaris dossier local-agent mode v1.7 — round 3 fresh-context review (CC-REV-2)
Reviewed commit: 3ca5c68e1a598b273d0d6c7b54824a4502a79245
Manifest SHA-256: 58997d30b7baae93a82f82d1f6e1311f9e9a56f097cf855e20b343b78659895f
Verdict: REVISE
Package: polaris-dossier-local-agent-mode

## What I did and read

- **Reconstruction.** I applied the three `proposed/*.patch` files to the installed v1.6 bytes in a scratch directory.
  - The checkout was untouched.
  - The three digests match `PROPOSED-SUBJECTS.json`:
    - spec.md: `58997d30b7baae93a82f82d1f6e1311f9e9a56f097cf855e20b343b78659895f`
    - design.md: `209fda2dc7bac4a457ae88f58eb5b342e1127dc161a55d683d45d6ca285e3295`
    - proposal.md: `e06e748f3533bbf73fbf7ba65c166fa90f6ff234d5844442455e28a22e73ae25`
- **Scripts.**
  - `build_polaris_dossier_local_agent_mode_v1_7.py --check` printed `OK: the v1.7 package verifies (unapplied)`, exit 0.
  - Its `--selftest` printed `36 fixtures, 0 failing`, exit 0.
  - `check_governance.py` printed `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0.
- **Read in full:**
  - SEMANTIC-DELTA, IMPACT-LEDGER, OWNER-SIGNOFF and both dispositions files.
  - The proposed REQ-033, REQ-034 and REQ-035 paragraphs, scenarios and test forms.
  - The one-command-run candidate (lines 1 to 60) and the launch-consent spec.
  - RFC7-10, 12, 13, 20, 33 and 34.
  - The 2026-11-05 answers, item 3.
  - The pursuit page, "Owner decisions after the run".
  - R-DOSSIER-LOCAL-AGENT-V1-6-7, Findings 3 and 4.
  - CC-SPEC-2.
- **Product code read:** `check.ts`, `render.ts`, `close.ts`, `polaris.ts`, `quote-fidelity.ts` and `quote-locate.ts`.
- **Not read:** any observed repository body or run output. I ran no provider call, no dossier run, and nothing that asks for consent.
- **Independent checks.**
  - A line and word diff of the installed and proposed spec shows no change outside the delta's clause blocks.
  - Scenario headings go from 80 to 92, with exactly the 12 added titles the affected-ids block lists.
  - Every double-quoted string of 12 or more characters in the launch-consent and one-command-run specs that occurs in v1.6 also occurs in v1.7. That is 2 of 19 and 12 of 49 strings, with 0 missing. The one-command-run candidate and the launch-consent change are untouched by the patch.
- **Repairs from rounds 1 and 2.** I checked each against the bytes.
  - R1 F1–F4 and F6 are repaired as the dispositions say. Counting is stated over check outcomes. The limit is decided at the check. Verdict of record is defined in REQ-035 (spec line 528). The opening parenthetical was repaired but still omits the draft mark (my Finding 8).
  - R2 F1 is repaired for design-repair checks, but the repair exposes a new gap (my Finding 1).
  - R2 F2, F3, F6 and F7 are repaired as the dispositions say.
  - The carried notes 3 and 4 are present: REQ-035 base-round wording, the scenario THEN line, and the falsifier disjunct.

## Findings

**Finding 1 — REQ-033's refusal is now keyed to "counts against", but only draft resubmissions are said to count, so inventory-check and review-check counting is left open** (revise)
Criteria 3, 4.
- Anchor: proposed spec line 23 ("refuse a check or review check that counts against the repair-cycle limit (REQ-polaris-generation-034) beyond that limit") and line 245 ("Each resubmission is a new draft revision … counts against exactly one limit"). SEMANTIC-DELTA.md line 202 ("An inventory resubmission is never a design repair; it is counted as v1.6 counts it, unchanged").
- [Observed] v1.6 refused "a check or review check beyond the repair-cycle limit".
- [Observed] The code refuses an inventory revision against the same limit (`check.ts` 172-175, with `noun` 'inventory'; the inventory brief says "each resubmission is a new inventory revision and counts").
- [Observed] The proposed REQ-034 sentences define counting only for a "draft revision", and "the first draft revision counts against neither limit".
- [Inferred] A literal reader finds no sentence under which an inventory check, or a review check, counts against anything. REQ-033's refusal then no longer reaches them, which is weaker than the installed v1.6 sentence.
- The delta says "unchanged" for inventory, but no spec sentence says it. It also leaves open whether the limit is counted per stream or across draft and inventory together.
- A repair is one sentence in REQ-034: inventory resubmissions count against the repair-cycle limit, counted per stream, never as design repairs. Alternatively REQ-033 could keep the unscoped v1.6 refusal for every kind of check except a design-repair draft check.

**Finding 2 — The annotated walk's note ranges have no stated numbering base** (revise)
Criteria 3, 6.
- Anchor: proposed spec line 255 ("an inclusive line range of that excerpt … outside the excerpt's range"), and scenario "Annotated code walk" (line 495).
- [Inferred] The range may be read as blob line numbers, since the excerpt cites a file range such as 120–150. It may equally be read as positions 1 to n within the excerpt.
- The two readings give opposite findings for the same note (for example, range 3–5 against an excerpt citing lines 120–150).
- The requirement is not testable as written, and a fixture author must guess.
- A repair is to say which numbering applies. The cited blob's own line numbers would match how the citation, the "reversed" test and the withheld-range disclosure are already stated.

**Finding 3 — The display rule depends on a reading of RFC7-12, but REQ-034's warrants do not name RFC7-12** (revise)
Criteria 5, 7.
- Anchor: warrants block of REQ-034 (proposed spec line 513, `contracts: [RFC2-23, RFC2-24, RFC5-17, RFC7-2, RFC7-9, RFC7-10, RFC7-13, RFC7-19, RFC7-20, RFC7-33, RFC7-34]`). CC-SPEC-2 ("Every requirement names all material governing warrants"). IMPACT-LEDGER.md line 26 ("No `warrants` block changes"). SEMANTIC-DELTA.md, contract reading 2.
- [Observed] The delta spends a contract reading and "For the owner" item 2 on whether a normalised reading view is "a paraphrase in normative position".
- [Observed] The warrants block does not list RFC7-12, and the ledger says no warrants block changes.
- [Inferred] If RFC7-12 is material enough to need an owner-test reading, CC-SPEC-2 asks for it in the declaration, and `GOVERNING-DEPENDENCIES.md` would then change at install. If it is not material, the delta should say why.
- On criterion 5: RFC7-10 needs no change. Same class, identifier, fragment (the located span's byte range) and target state, and one anchor serves both views. RFC7-12 needs no text change on the delta's reading, which is the owner's to confirm. I found no reading that stops this version, but the reading is an owner matter (Finding 6).

**Finding 4 — Close labels Observed "which revision passed" and "the site of record" without saying how close re-derives them** (note)
Criteria 4, 6.
- Anchor: proposed spec line 528 ("deciding each at close from the records and objects it verifies then, as at render" and "which revision passed, the site of record, whether a verdict counts for it … are Observed as close decides them"), against REQ-033's "Syzygy SHALL NOT rest an Observed label on a record it stored".
- [Inferred] "As at render" can be read as re-checking the frozen revisions from the objects, and as rebuilding the design packet from the site's files, which is how "whether a verdict counts" is Observed today.
- Which revision a set of pages was rendered from is a binding. The clause does not say whether close re-renders, or reads the pages' own claim of their revision. A page's own claim is a stored record within the agent sessions' write reach.
- A short sentence naming the method, or labelling the page-to-revision binding Inferred, would close this. I do not rate it above a note because the clause's "as at render" is a defensible instruction.

**Finding 5 — Two small identity points: the region's machine form, and a same-revision re-render** (note)
Criteria 3, 6.
- Anchor: proposed spec lines 247 and 528 ("SHALL change nothing outside that region"). `design-review.ts` 15-23 (the packet also excludes the `reviewStatus` member of `machine.json`).
- (a) [Observed] The spec never says that the machine form of the region (that `machine.json` member) is part of the region. Close "changes nothing outside the region", so a literal reading forbids updating the machine member and leaves it stale against the page. One clause would fix it.
- (b) [Inferred] "Each render is a new set of pages" and "the verdict of record on the site's pages" leave one case implicit. A second render of the same revision whose packet is byte-identical outside the region keeps a counted design verdict. REQ-035's digest-equality rule decides it, and `render.ts` already behaves so. The class rule in REQ-034 inherits that result. A clause or scenario sentence would remove the doubt.

**Finding 6 — Choice B says "every quotation"; the display rule exempts code excerpts, and RFC7-12 and RFC7-20 readings carry costs** (note, for the owner)
Criteria 4, 5, 7.
- Anchor: pursuit page, "Owner decisions after the run", row `fnry-19-p13-scope` ("v1.7 lets every quotation display the normalised run the check matched"). OWNER-SIGNOFF.md ("every quotation, not only Markdown ones … Code excerpts are not cleaned"). Proposed spec lines 247 and 253.
- [Observed] REQ-034 itself calls a code excerpt "a quotation Syzygy has verified". The rule therefore narrows B's "every quotation" to quotations of claim blocks and inventory entries.
- The owner page states the exemption but not that it narrows what B said. The narrowing rests on round-2 Finding 2 and is sound, because normalising code would rewrite it. The owner should see it as a drafter's reading.
- Under RFC7-12: the reading-view loss of an identifier's paired underscores (`__init__` reads `init`) and the one-line collapse is real for code quotations. That cost is disclosed. The legend names it and the evidence view is one step away.
- Under RFC7-20: the unchanged sentence "Generated prose stays visually distinct as a draft (RFC7-20) through the one sentence and the legend" now has its legend in a closed `details` element. On non-landing pages the visible one sentence carries the distinction. The owner may read that as enough, as the delta does for the v5 thesis.
- I find no RFC7-10 or RFC7-12 change needed, so the bead's stop condition is not met on my reading.

**Finding 7 — "Show no text" for a quotation that no longer re-locates leaves the block's presentation open, and the agent-copy prohibition is not separately testable** (note)
Criteria 3, 6.
- Anchor: proposed spec line 247 ("A quotation that does not re-locate at render SHALL show no text in either view"), and scenario "Quotation that no longer re-locates". `quote-locate.ts` `locateQuote` (`wanted = normaliseForQuote(quote)`).
- [Observed] The matched run always equals `normaliseForQuote` of the agent's quotation. The ban on the reading view being "taken from the agent's copy" therefore cannot be told apart in output from a run taken from the blob.
- The falsifier is right to test only observable difference: the reading-view text differs from the run, keeps markup, or renders although its run no longer re-locates. The delta says this.
- The spec does not say what the block shows in the quotation's place: a gap, a withheld presentation, or a render refusal as `render.ts` does today. The rule does not weaken any labelling. The scenario is testable for "no text".

**Finding 8 — Wording and consistency points in the v5 landing and ribbon text** (note, editorial)
Criterion 7.
- (a) The opening rule's parenthetical lists the thesis's and hero's "labels, citation marks and caption" as the only Syzygy text above the end of the opening. The same sentence then requires a draft mark "with its label". The scenario and falsifier list the draft mark; the clause's parenthetical does not. In the reading view Syzygy writes no label token, so "with its label" has no visible referent.
- (b) The ribbon is "one paragraph" holding the region. The existing region is an `<aside>` element, which cannot sit inside a `<p>`. The spec says paragraph where it means block.
- (c) The spec does not say who or what makes a run's draft schema v5 (the brief "names the schema version" without saying which). The same gap already existed for v4.
- (d) The advice label "Syzygy's measurement of its own pages" is not one of the three epistemic labels. It is a measurement of just-produced output, not a stored-record claim, so I take it as correct.

**Finding 9 — Items I tested that hold** (note)
Criteria 1, 2, 4, 5, 6, 7.
- **Boundary and P1 sorting.** The P1 items are sorted to the change that states them, and the delta does not amend the one-command-run candidate or the launch-consent change. Confirmed by the quoted-string sweep and the line diff above.
- **Finding for the owner on P1.** The delta's finding 1 states what P1 needs from the one-command-run change: its line 9 order, with `polaris.ts` rendering only on `fidelityState === 'ready'`, which matches the code I read.
- **Settle-items.** Each has an answer or an explicit owner question.
  - P1(a): render trigger, with REQ-035's "reviewed pages with only the named review-status region changed" unchanged.
  - P1(b): two limits; check-refusal counting kept as the 2026-11-05 direction keeps it ("Keep the rule"), with the "no spec text changes" tension disclosed in "For the owner" item 6.
  - P1(c), (d), (e), (f).
  - P3, P5, P13.
  - Carried notes 3 and 4.
- **Counting cases the draft clauses decide.** A fidelity and a design verdict both blocking gives the repair-cycle limit. A refused design-repair check leaves the class unchanged. The record-dependence is stated in the delta.
- **No-weakening checks.**
  - A verdict never counts across revisions (REQ-006, and the digest rule in REQ-035).
  - At render the region cannot state "ready" while the design standing is not ready.
  - Close cannot present an unreviewed site as reviewed or ready, because it ends "closed with a finding".
  - The P13 rule passes REQ-033's "re-derive every rendered quotation … by locating the quotation again", because the reading view is taken at render from the blob's tracked offsets.
  - No citation, quotation, withheld-item or labelling rule is loosened.
- **Package integrity.**
  - The affected-ids block and the ledger counts (12 added, 7 amended) match my own scenario diff.
  - design.md and proposal.md agree with the spec and overstate nothing.
  - The owner page attributes to the owner only what the pursuit page records: choice A named P1, P3, P5 and P13's clause-bound part, and choice B set the display scope.
