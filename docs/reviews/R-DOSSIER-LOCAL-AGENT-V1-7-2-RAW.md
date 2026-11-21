Polaris dossier local-agent mode v1.7 package: fresh-context review (CC-REV-2), round 2
Reviewed commit: 9f1131cfc0345d0400f2c353a7e1fe5c7434f97f
Manifest SHA-256: 0e17c0e0803e1cb7466af37601df0d9ec59d5fafbf59fcb929b5915139e41b66
Verdict: REVISE
Package: polaris-dossier-local-agent-mode

## What I read, ran and did not read

**Digests.** I applied `proposed/*.patch` to the installed v1.6 files in a scratch copy and hashed the results with `sha256sum`. All three match `PROPOSED-SUBJECTS.json`, and the installed digests match its `current_sha256` values.
- Proposed `spec.md`: `0e17c0e0803e1cb7466af37601df0d9ec59d5fafbf59fcb929b5915139e41b66`. This is the Manifest SHA-256 above.
- Proposed `design.md`: `8cadd45b1c8c3bf1eb0b41c93fd71edab1545420b0b484fc0ce04b82f357d008`.
- Proposed `proposal.md`: `e06e748f3533bbf73fbf7ba65c166fa90f6ff234d5844442455e28a22e73ae25`.

**Commands.**
- `build_polaris_dossier_local_agent_mode_v1_7.py --check` printed `OK: the v1.7 package verifies (unapplied)`.
- `--selftest` ended `36 fixtures, 0 failing`, exit 0.
- `check_governance.py` ended `32 OK, 21 WARN, 0 FAIL (53 checks)`, exit 0.
- `git diff --stat a41aa223 HEAD` shows the branch touches only this package directory, the campaign file, the round-1 raw, the builders and `record_versioned_signoff.py`. No sibling change is edited.

**Read.**
- The brief, SEMANTIC-DELTA, IMPACT-LEDGER, OWNER-SIGNOFF, ROUND-1-DISPOSITIONS and the round-1 raw.
- The whole proposed REQ-033, 034 and 035 text, with Case, Observable, Oracle and Falsifier, and all the added and changed scenarios.
- RFC7-10, 12, 13 and 20 as installed.
- The 2026-11-05 direction, item 3; the pursuit page for P1, P3, P5, P13 and "Owner decisions after the run"; the v1.6-7 raw's Findings 3 and 4.
- The one-command-run spec lines 1 to 60 and the launch-consent quotations.
- Product code to test claims: `quote-fidelity.ts` (`QUOTE_NORMALISATION`), `quote-locate.ts`, `check.ts`, `render.ts` and `dossier-site.ts`. I also read the ledger's cited line numbers; those that matter hold.

**Did not read.** Any observed repository body or run output. PR #812's v1.2 patch, because it is not in the checkout. The packets behind the owner's choices, which are outside the repository. I made no provider call and ran no dossier run.

**Own checks, by method.**
- Change boundary. I extracted every double-quoted string of 12 or more characters from both sibling specs and tested each against the installed and proposed REQ-033 to 036 text after whitespace normalisation. Launch-consent has 2 strings, both in v1.6 and both still in the proposed spec. One-command-run has 19 strings, 11 of them in v1.6, all 11 still in the proposed spec. Nothing is broken. The one backtick span of 15 or more characters also survives. I checked the line-diff claim separately: v1.6 lines 11, 13, 25, 27 and 458 all carry the quoted strings, and the patch touches the strings on none of them.
- Scenario count. I counted 80 `#### Scenario:` headings in the installed spec and 92 in the proposed one, as the delta says.
- Quotation display. I traced `locateQuote`. It searches `normaliseForQuote(agent copy)` in the tracked normalised blob text and returns the raw span from the tracked offsets. The "matched run" is therefore byte-identical to the normalised agent copy, as the delta says. Only a failure to re-locate distinguishes the two, and the spec's scenario "Quotation that no longer re-locates" does cover that.

## Round-1 repairs, checked against the bytes

- Finding 1 (refused check): repaired. REQ-034 defines the rule over recorded outcomes, and the ledger, design.md, scenario and owner page agree. The "kept as ruled 2026-11-05" wording now says only that every checked resubmission counts. See Finding 10 for a residual point on that direction.
- Finding 2 (Observed labels): repaired in kind. Readiness and the end state are Inferred. See Finding 6 for a residue.
- Findings 3 and 4 (instant of decision; "verdict of record"): repaired. Both are now defined in REQ-034 and REQ-035.
- Finding 5 (reading-view cost): the cost is now disclosed in the delta, ledger and owner page. The legend still omits the ellipsis rewrite (Finding 7).
- Finding 6 (text above the opening): repaired by the "labels, citation marks and caption" carve-out.
- Findings 7 to 10: taken as stated.
- Carried notes 3 and 4: both are in the bytes. N3-1, N3-2 and the F35 disjunct match the v1.6-7 raw's Findings 3 and 4.

## Criteria

1. **Change boundary.** It holds. Every P1 item is sorted in the table and the delta amends no sibling byte (diff stat above; quoted-string sweep above). The findings for the owner say what P1 needs from the one-command-run change, in item 1. One-command-run line 9's order is not breached. Its line 27 and the "run limits of REQ-033" phrase pick up the new limit by reference.
2. **Settle-items.** Each has an answer or an owner question.
   - P1 (a) to (f), P3, P5 and P13 are all answered.
   - The REQ-035 "pages published after the rendered-design review" sentence is correctly left unchanged.
   - Check-refusal counting is kept as the 2026-11-05 direction keeps it (see Finding 10).
   - The remaining gaps are Findings 1 to 3.
3. **Determinacy.** The limit class, the site of record and the end state are determined for the cases the delta considers. Residual open cases are in Finding 9.
4. **No weakening.** No sentence lets a verdict count for pages or a revision it did not read, skips a review, or presents an unreviewed site as ready at close. Gaps remain at render time (Finding 3) and at the code-excerpt/quotation boundary (Finding 2).
5. **Contract readings.** Neither RFC7-10 nor RFC7-12 needs a change, so the bead's stop condition is not triggered, subject to the owner's reading of RFC7-12 (Finding 8). Readings 1, 3, 4 and 5 hold. Reading 6 holds subject to Finding 6.
6. **Scenarios and falsifiers.** Each change has a scenario and a falsifier disjunct. Observable and Oracle coverage is thinner (Finding 5).
7. **Package integrity.** The affected-ids block and clause blocks pass `--check`. The attributions on the owner page match the pursuit page. One term in proposal.md has no spec referent (Finding 4).

## Findings

**Finding 1 — REQ-033's enforcement sentence, as drafted, makes Syzygy refuse design-repair revisions, and leaves the repair-cycle refusal unscoped** (revise)
- Anchor: proposed `spec.md` line 23 (patch P1b-2), "it SHALL refuse a check or review check beyond the repair-cycle limit, a check of a design-repair revision beyond the design-repair limit, a design-repair revision counting against that limit alone (REQ-polaris-generation-034), and any step after the deadline".
- [Observed] The items after "SHALL refuse" form one list of refusal objects. The third item parses as "refuse a design-repair revision counting against that limit alone". Read literally, REQ-033 forbids every design-repair revision that counts against the design-repair limit, which contradicts REQ-034.
- The item reads as intended only if "refuse" were "count". It also duplicates item 2. No scenario or falsifier disjunct would catch it, because they are written from the intended reading.
- [Observed] Separately, the first item is still "a check or review check beyond the repair-cycle limit", with no scope. REQ-034 says a resubmission counts against exactly one limit, but this sentence does not say that the repair-cycle refusal reaches only checks that count against that limit.
- With the repair-cycle limit spent and a design-repair revision pending, the first item can be read as refusing a check the second item allows.
- Repair: drop the third item (REQ-034 already states the single-limit counting), and scope the first item to checks that count against the repair-cycle limit.

**Finding 2 — A code excerpt is called "a quotation", so the reading-view rule collides with its byte-for-byte rendering** (revise)
- Anchor: `spec.md` line 247 (P13-1), "Every rendered quotation SHALL be set off as a quotation ... In the reading view the quotation's text SHALL be the run of the blob's normalised text that the quotation check above matched"; line 253, "The excerpt is a quotation Syzygy has verified, labelled Observed"; the scenario "Code excerpt rendered from Syzygy's read" ("as an Observed quotation"); and the hero and walk rules.
- [Observed] Nothing in the proposed spec exempts a code excerpt, hero or walk excerpt from the new rule. The rule's own words ("the quotation check above matched") do not fit an excerpt, which has no agent copy and no check match. The spec still names the excerpt a quotation.
- A hero or walk excerpt must render "byte for byte as text" (line 253). Under 247 the same excerpt would be a normalised run, so comment leaders, `#` lines, backticks, escapes and all newlines would go. A multi-line excerpt would read as one line, which defeats the P5 hero and walk.
- The delta says "the code excerpt's own rules" do not change, but the spec does not say so in the clause. Round 1 did not catch this because it appears only with the P5 elements and P13 together.
- Repair: add one sentence to line 247 that the display rule governs the quotations of claim blocks and not a code excerpt, which renders as line 253 says. Alternatively stop calling the excerpt a quotation. Add a scenario or Case variation with a commented-line excerpt.

**Finding 3 — The review-status region is not defined well enough for close's re-stamp, and render of an unreviewed revision leaves its contents open** (revise)
- Anchor: `spec.md` line 247 (P3-1, the ribbon), line 528 (P1c-1, "rewrite the named review-status region of every page of the site of record"), and the render paragraph (P1a-1).
- [Observed] The spec never says where the region sits or that every page carries one. In product code the region sits "at the foot of every page" (`render.ts`, `DESIGN_REVIEW_WHERE`). The ribbon now places "the named review-status region" in a paragraph under the title or opening, but only on narrative pages. Appendix, review, understanding, discovery and source pages are not narrative pages. The spec does not say they carry a region.
- Close is required to rewrite the region "of every page of the site of record", and the falsifier requires every page's region to state both standings. A conformant renderer can have non-narrative pages with no region. That breaks the re-stamp or the design packet's "one named region" exclusion.
- [Observed] Render of an unreviewed revision is newly lawful: "whatever the state of any review of it". The spec does not say what the region states at render, before any review counts or before close. Only close is required to state standings. A fidelity-unreviewed site could be published with a region saying nothing, or something stale, until close runs. Criterion 4 asks that no sentence let an unreviewed site be presented as reviewed. The product states "none counts", but the spec leaves it to the implementation.
- Repair: state that every page carries exactly one region, and say where (in the ribbon on narrative pages). Say that at render it states both standings as they stand, with "none counts" where none does. Add a scenario for a render before any review.

**Finding 4 — "Notice" appears in proposal.md and the owner page but not in the spec** (note, editorial)
- Anchor: proposed `proposal.md` ("narrative pages fold their notice, legend and review status into one ribbon"); OWNER-SIGNOFF "A thesis first".
- [Observed] The spec's ribbon holds the one sentence, its appendix link, the region and the legend. It does not mention the existing page notice (`dossier-site.ts` line 574, "Operator-agent editorial draft — not adopted ..."). Its rule that nothing else Syzygy writes about the run, draft or review sits above the ribbon implies the notice moves or goes. The spec does not say which.
- RFC7-20 asks generated prose to be "visually distinct" as a draft. Whether the notice survives, and where, is a question for that clause.
- Repair: say in the spec whether the notice is dropped or folded into the ribbon, or drop the word from proposal.md and the owner page.

**Finding 5 — Observable and Oracle sentences are not extended for the new limit decision, reader advice or close fields** (note)
- Anchor: REQ-034 Observable (O34 patches only the Oracle) and Oracle; REQ-035 Oracle (O35 extends only the Observable).
- [Observed] The new falsifier disjuncts name "a resubmission counts against a limit other than ...", "reader advice renders on a page, enters a review packet ...", and close's standings and end state. REQ-034's Observable lists no recorded limit decision, refusal or advice output.
- REQ-034's Oracle fixes expected findings and byte ranges outside the checker, but not the expected limit class. REQ-035's Oracle says nothing about expected close records.
- Without an independently stated expectation, a test could compute the expected limit class or end state with the code under test.
- Repair: add the recorded limit decision, advice report and close fields to the Observables, and say the expected values are fixed from the fixture's check, verdict and render records.

**Finding 6 — "Latest" and "recorded last" are orderings the spec does not tie to something Syzygy can re-derive, while the results are labelled Observed** (note)
- Anchor: `spec.md` line 528, "the latest set of pages ...", "recorded last", and "In close's own output, which revision passed, the site of record, whether a verdict counts for it ... are Observed".
- [Observed] REQ-033 labels "the instants of earlier steps" Inferred. The spec says neither what orders "latest" pages and "recorded last" verdicts, nor that it is a sequence number the filesystem fixes.
- `render.ts` numbers pages as `site/<n>/` and verdicts carry round numbers, so an object-derived order exists. If the order is by instant, then "the site of record" and "the verdict of record" rest on a stored record, and Observed overstates.
- Repair: say "latest" and "last" are by the sequence numbers Syzygy assigns, which close reads from the objects it verifies, or label the choice Inferred.

**Finding 7 — The legend says quotations are normalised but omits two changes a reader would misread** (note)
- Anchor: `spec.md` line 247 (P3-1), the legend sentence; delta P13 "What the reading view changes".
- [Observed] `QUOTE_NORMALISATION` rewrites the single character `…` to `...`. The legend says nothing of it. A reader sees `...` inside a set-off quotation, which the check's own rule would call an elision if the source did not carry it. The legend also says "markup ... left out" but does not say that, in code, paired underscores of an identifier go (`__init__` reads `init`).
- The delta, ledger and owner page do disclose both, but the page legend does not.
- Repair: add the ellipsis and the identifier-underscore case to the legend, or note in the delta that the legend accepts the gap.

**Finding 8 — RFC7-12 and RFC7-20 readings are the owner's to confirm** (note, for the owner)
- Anchor: delta "For the owner" item 2; contract readings 2 and 3; `spec.md` line 247 (end of the "Generated prose stays visually distinct" sentence).
- [Inferred] I agree that RFC7-10 needs no change. The anchor's form and fragment are unchanged and both views carry it. I also read RFC7-12's "no paraphrase in normative position" as met by a fixed mechanical normalisation with the exact bytes one step away in the evidence view.
- The reading has a real edge. For a repository's own requirement text, the reading view drops comment leaders, escapes and newlines, and in code it can misspell an identifier. The delta discloses this and offers narrowing to Markdown sources. The owner decides. If the owner reads RFC7-12 otherwise, the display rule needs an RFC 0007 question first, which would stop this version.
- RFC7-20 also asks that generated prose be "visually distinct" as a draft. On a v5 landing page the thesis and hero precede the one sentence and the collapsed legend (see Finding 4). Round 1 noted this as lawful because REQ-033 fixes no position for the sentence. I did not find a spec rule that gives the thesis its own visible draft marking.

**Finding 9 — Residual determinacy cases the rule leaves open or does not state** (note)
- Anchor: `spec.md` line 245 (REQ-034 counting sentences) and line 528.
- (a) Inventory resubmissions. The counting text speaks of "draft revision" only, but REQ-035 checks the inventory "as REQ-034 checks a draft" and `inventory.ts` shares the limit. By reference an inventory resubmission falls in "every other" and counts against the repair-cycle limit, but no sentence says so, including whether the first inventory revision counts against neither.
- (b) A design-repair revision whose check is refused at a spent design limit leaves the run unable to resubmit, even if repair-cycle budget remains. This is determined (the decision is the same each time) but unstated.
- (c) A failed later revision strands an earlier passed, unrendered revision. Render takes only the latest checked revision, and only if it passed. The delta states this for close ("render a passed revision before resubmitting"), and the spec does not.
- (d) The class of a resubmission depends on whether a fidelity verdict is already recorded when the check runs, so identical agent actions can count against different limits. This is determined by records, as the spec requires.
- None of these defeats determinacy. They are worth one sentence each in the delta.

**Finding 10 — The 2026-11-05 direction is described as kept, but it also said "no spec text changes"** (note, for the owner)
- Anchor: delta P1 (b), "Checks that report findings still count"; `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05.md`, item 3.
- [Observed] Item 3 picked "Keep the rule; the operator chooses the limit when asked". It records "no delta to the one-command-run candidate on counting" and "Excluded: no spec text changes". The delta reads "the rule" as "every checked resubmission counts, a check that reports findings included".
- That reading is plausible and the re-ask trigger was not met. The change to which limit a design repair counts against rests on the owner's 2026-11-09 choice A (P1: "separate repair budgets"), not on the 2026-11-05 direction.
- The owner should see that the 2026-11-05 text excluded spec changes and that choice A is what authorises this one.

**Finding 11 — Change boundary, carried notes and settle-items hold** (note)
- Anchor: delta "The change boundary, sorted first", P1 (f), and the carried-notes section.
- [Observed] The quoted-string sweep and line diff above agree with the delta: no sibling quotation is broken, and the one-command-run line 13 and line 27 are untouched.
- The pursuit page's "`check` advises when a dossier has no hero" is delivered as render-time reader advice, which the delta states. PR #812's patch was not available to me, so the delta's one count for it is unchecked.
