Polaris dossier local-agent mode v1.7 package: fresh-context review (CC-REV-2)
Reviewed commit: 243467c5f4fda645464fcc6ab74c61f953b835c6
Manifest SHA-256: 50a94e95816d4565572125039229460def0e052e9b5fcff07bc2d67d2a3e9dd9
Verdict: REVISE
Package: polaris-dossier-local-agent-mode

## What I read, ran and did not read

**Digests.**
- I rebuilt the proposed bytes by applying `proposed/*.patch` to the installed v1.6 files, in a scratch copy.
- Manifest SHA-256 (proposed `spec.md`): `50a94e95816d4565572125039229460def0e052e9b5fcff07bc2d67d2a3e9dd9`. It matches `proposed_sha256` in `PROPOSED-SUBJECTS.json`.
- `design.md` proposed: `f8811df2e53096a4d49cb3b10e491f7038748a4950d5aa266bba837436217ea5`.
- `proposal.md` proposed: `e06e748f3533bbf73fbf7ba65c166fa90f6ff234d5844442455e28a22e73ae25`.
- Both also match the manifest. The installed v1.6 digests and the three patch digests match too.

**Commands.**
- `build_polaris_dossier_local_agent_mode_v1_7.py --check` printed `OK: the v1.7 package verifies (unapplied)`, rc 0.
- Its `--selftest` ended `36 fixtures, 0 failing`, rc 0.
- `check_governance.py` ended `32 OK, 21 WARN, 0 FAIL (53 checks)`, rc 0. I found no WARN line naming this package.

**Read.**
- The SEMANTIC-DELTA, IMPACT-LEDGER, OWNER-SIGNOFF and the three patches.
- Every changed line of the proposed spec, by a word-level diff against v1.6.
- REQ-033 to 036 around the changes, and RFC7-10, 12, 13, 33 and 34.
- The 2026-11-05 direction, item 3, and the pursuit page's "Ranked moves" P1, P3, P5 and P13 and "Owner decisions after the run".
- The v1.6 raw, findings 3 and 4.
- Product code to test claims: `check.ts`, `polaris.ts`, `close.ts`, `render.ts`, `quote-fidelity.ts` and `quote-locate.ts`.

**Own checks.**
- Scenario headings go from 80 to 92. I count 12 added and 7 amended, which matches the affected-ids block.
- `git diff a41aa223..HEAD` shows no change under `openspec/changes/`, so the one-command-run candidate, launch-consent and the v1.6 bytes are untouched.
- I swept every double-quoted string of 12 or more characters in every `openspec/changes/**/*.md` that also occurs in the v1.6 spec. That covers 19 files, including the one-command-run and launch-consent specs. None is broken in v1.7, including the 13 distinct strings the package names.
- I ran a scratch copy of `QUOTE_NORMALISATION` on synthetic strings only (no repository body).

**Not read or not verifiable.**
- The questionnaire packets and bead text, which are outside the repository.
- PR #812, which needs the network.
- The builder's other changed scripts (the v1.1 to v1.6 builders, the recorder and the reference-recording script), beyond skimming the v1.2 and v1.6 diffs.
- No run output, observed repository body or provider call.

## Answers to the brief's criteria

1. **Change boundary.** Holds. Every P1 item is sorted. The two P1 items the delta leaves to the one-command-run candidate (render before fidelity is ready, and the launched run's budgets) are named for the owner. No byte of either sibling change is edited.
2. **Settle-items.** All have an answer or an owner question. The counting of refusals and failed checks under P1(b) is the exception: it is defective (Finding 1). The Observed labelling in P1(c) is also defective (Finding 2).
3. **Determinacy.** Gaps are in Findings 1, 3, 4 and 7.
4. **No weakening.** The Observed label on close's standings breaks REQ-033's labelling rule (Finding 2). The display rule discloses less than it changes (Finding 5).
5. **Contract readings.**
   - RFC7-10: no change needed. The anchor's class, identifier, fragment and target state are unchanged, and the spec text gives one anchor to both views.
   - RFC7-12: no change needed on my reading for prose. The delta's "no paraphrase" reading rests on an incomplete list of what normalisation alters (Finding 5), so item 2 of "For the owner" should be corrected before the owner reads it. This is not a stop condition.
   - RFC7-13: holds.
   - RFC7-33 and RFC7-34: hold for the legend move. Machine attributes and DOM text keep the distinctions, and no fragment target sits inside the ribbon.
   - REQ-006: the reading holds, subject to Finding 3.
6. **Requirements and scenarios.** Each change has a scenario and a falsifier disjunct. VIS-2 correctness fails at Finding 2.
7. **Package integrity.** The affected-ids block and the clause blocks are verified by `--check`. The owner-page attribution is questioned in Finding 8.

## Findings

**Finding 1 — "Refused check" is undefined, and the counting rule contradicts the ledger, design.md and the owner page** (blocking)
- Anchor: proposed `spec.md` REQ-034, the resubmission sentence ("whose check was refused", "follows a refused check of a revision that counted against that limit").
- Same wording in the scenario "Design repairs drawn from their own limit", and in SEMANTIC-DELTA P1(b), design.md "Two repair limits", IMPACT-LEDGER "Costs" and OWNER-SIGNOFF "What it costs".
- [Observed] The spec keeps "refused" and "fails the check" apart. The v1.6 scenario "Zero repair and question limits accepted" says "is refused or fails the check".
- [Observed] In `check.ts`, a refusal (lines 173-174 for the limit; the `refuse(...)` returns before the freeze at 233) freezes no revision and writes no record. A check that finds something (`outcome: 'findings'`) is frozen and numbered. `polaris.ts:60-63` says "a check that finds something included" counts.
- Scenario: the agent resubmits R2, a design-repair revision, and the check returns findings. It is not "refused", so the next resubmission falls to "Every other resubmission ... repair-cycle limit". The ledger ("A design repair that fails its check stays a design repair. It cannot borrow from the repair-cycle limit"), the owner page ("A design repair that fails its check spends design budget, not fidelity budget") and design.md say the opposite.
- If "refused" is read in the spec's own sense, "follows a refused check of a design-repair revision" is nearly vacuous. A refusal creates no revision, so the previous revision is unchanged and the first clause already decides.
- "Check refusals still count ... item 3, 'Keep the rule'" is also not what the direction says. It says nothing about refusals. The rule it kept counts checks that find something.
- Repair: state the rule over the recorded check outcome (passed, findings, and a refusal that creates nothing). Say whether a design-repair revision with findings keeps its successor a design repair, and say what a refusal counts. Then align the ledger, design.md and the owner page.
- Whether "revision beyond the limit" is counted per class, with revision 0 free, is also unstated and could be settled in the same edit.

**Finding 2 — Close's standings and end state are labelled Observed, but rest on a stored record** (blocking)
- Anchor: proposed `spec.md` REQ-035 close paragraph, last sentence ("The standings and the end state are Observed in close's own output"). The same appears in the REQ-035 falsifier ("shown as Observed") and in SEMANTIC-DELTA P1(c).
- Contrary clauses: REQ-033, "Syzygy SHALL NOT rest an Observed label on a record it stored" and "Every value Syzygy shows that it cannot re-derive at that step SHALL be labelled Inferred". REQ-035: that the review context read the packet, and everything a verdict says, are Inferred. `render.ts` says "everything the verdict says is the review session's, Inferred".
- [Observed] What close can re-derive is that a verdict names the digest of the packet it rebuilds, and that the design packet's digest matches. That a verdict is "ready", or has "unresolved blocking findings", is the reviewing session's assertion in a record in the agent's write reach. An LLM assertion is Inferred. The end state "closed" is Observed only if both standings are, so it inherits the problem.
- Close could label Observed: that a verdict counts and names the rebuilt digest, and that no pages or no verdict exist. The readiness content and the end state derived from it should be Inferred.
- A site then ends "closed" with an Observed "ready" resting on stored verdict content. This is the "present as ready" risk of criterion 4.

**Finding 3 — Which limit a revision counts against is evaluated at an instant the same sentence's retirement rule can erase** (revise)
- Anchor: REQ-034, "as Syzygy's records stand at its check, the revision before it passed its check, a counted rendered-design verdict on pages rendered from that revision has an unresolved blocking finding ...", beside "it retires earlier check results and dependent review evidence (REQ-polaris-generation-006)".
- Submitting R3 retires the verdicts bound to R2. If the retirement is read as taking effect before R3's check, the "counted verdict" condition can never hold.
- In `check.ts` the classification point is before the freeze, so the product can do it. The spec should say the class is decided and recorded at the check, before the new revision retires anything, and later steps read the recorded class.
- Without that, "the revision before it is a design-repair revision" cannot be re-decided later from records, because the verdict that made it one is retired.
- Related gap: "a counted ... verdict" is existential. R1 may have two renders and two design verdicts, one blocking and one ready. The class is design-repair while the close standing is "ready". Say which verdict decides.

**Finding 4 — "The counted verdict of record" is used for the close standings but defined nowhere** (revise)
- Anchor: REQ-035 close paragraph, "its standing ... which is the counted verdict of record".
- [Observed] I found no definition in the spec. `render.ts` has a "review of record" in code comments only.
- Multiple counted verdicts on one revision are possible: several rounds in a waiting session, or a second fresh session, with different findings. The standing, the end state and the finding are not fully determined.
- Repair: say which counted verdict is of record (the latest by recorded order, say) or require all counted verdicts to be ready.

**Finding 5 — The reading-view quotation changes more than the legend, the cost lists and the RFC7-12 reading say** (revise)
- Anchor: REQ-034 display rule and legend ("the source's text with the markup the check removes left out"). SEMANTIC-DELTA "For the owner" item 2 and IMPACT-LEDGER "Costs" ("backticks, emphasis, comment leaders and link targets").
- [Observed] I applied the `QUOTE_NORMALISATION` steps in a scratch copy to synthetic strings.
  - `def __init__(self):\n    return a &amp; b` gives `def init(self): return a & b`.
  - `## Heading\n\n    x = 1\n    y = 2` gives `Heading x = 1 y = 2`.
  - The curly-quote string `see [the docs](http://x) and “quoted” …` gives `see the docs and "quoted" ...`.
- So it also collapses every whitespace and newline run to one space, decodes entities, removes backslash escapes, straightens quotes and ellipses, and strips `#` and `//` leaders and paired `_x_` and `__x__` marks. The last of these removes identifier underscores in code such as `__init__`.
- v1.6 showed the located raw span. A multi-line code or YAML quotation now reads as one line, and an identifier can lose characters.
- Repair: have the legend, the costs and item 2 name the actual changes (or limit the display rule to what is markup). The owner decides the RFC7-12 reading on that list.
- The machine form and the reading view now carry different text for one quotation. The delta should say how its parity sweep compares quotation text.

**Finding 6 — "Nothing Syzygy writes other than navigation above the end of that opening" contradicts rules that require Syzygy-written text there** (revise)
- Anchor: REQ-034 v5 landing paragraph, the scenario "Thesis-first landing page", and the falsifier disjunct "carries text Syzygy writes, other than navigation".
- Syzygy writes the labels, citation marks and Unknown or withheld notices of the thesis and the hero ("renders in its place as a withheld code excerpt does"). It also writes a code excerpt's path and range caption.
- A literal reading either fails every conformant page or invites stripping those labels, which VIS-2 forbids.
- Repair: scope the rule to apparatus (notice, legend, review status, run or draft disclosure) and say the blocks' own labels, citations and withheld markings stay.

**Finding 7 — The end-state vocabulary collides with `closed-with-finding` and leaves cases open** (note)
- Anchor: REQ-035 close paragraph, "closed when ... both standings are ready, and closed with a finding otherwise".
- [Observed] `close.ts:165` already reports `closed-with-finding` for a credential-breach finding, which the spec text does not mention. Under the new text a run with ready reviews and a credential finding is "closed".
- No passed revision at all is not among the three listed conditions.
- Render is defined on "the latest checked draft revision if its check passed", and close on "the latest draft revision whose check passed". If R3 fails its check, R2 cannot be rendered and close reports "no rendered pages" for it.
- State whether these cases are intended.

**Finding 8 — Two attributions to the owner are looser than the records** (note, for the owner)
- Anchor: OWNER-SIGNOFF "Where it came from"; SEMANTIC-DELTA "Warrant".
- (a) The pursuit page records choice A as ".19 drafts one v1.7 delta for P1, P3, P5 and P13's clause-bound part" and says "choice A had P1, P3 and P5, with P13's clause-bound part". The delta and owner page say A "named P1, P3 and P5" and that B "added" the display rule. The record supports "A included P13's clause-bound part; B widened it from Markdown quotations to every quotation". I could not check "as offered", because the packet is outside the repository.
- (b) design.md says the counting the owner kept on 2026-11-05 "is unchanged". Resubmissions after a blocking design verdict now count against a different limit. Only the single-limit rule for everything else is unchanged.

**Finding 9 — The rationale for "label, not refuse" is partly wrong, and the owner is asked on it** (note, for the owner)
- Anchor: SEMANTIC-DELTA P1(d) and "For the owner" item 3 ("a run that can never close when its deadline or limits are spent").
- [Observed] REQ-033 refuses any step after the deadline. `close.ts` has a `deadline` stage and its header says "the deadline not passed". A run past its deadline cannot close under either option, and the new text does not say so.
- Only the limits-spent case supports the rationale.

**Finding 10 — Reader advice and the v5 landing, two points for the owner** (note)
- Anchor: REQ-034 render paragraph; OWNER-SIGNOFF.
- The advice is "its own mechanical measurement" but includes "a list that repeats a diagram", which is a heuristic, not a measurement. It also carries no VIS-2 label. State that the advice is a heuristic, or drop that example.
- On the v5 landing the agent's thesis and hero sit above the one-sentence "draft, no human review" notice and the review status, which fall into the ribbon. REQ-033 fixes no position for the sentence, so this is lawful. The owner page says the notice folds into a ribbon but not that it follows the thesis and hero.

**Finding 11 — Carried notes, change boundary and tooling** (note)
- Notes 3 and 4 are applied as the v1.6 raw asked: the base round is "of a fidelity packet", the scenario line reads "a fidelity packet with no changed-block list", and the falsifier has the presentation disjunct.
- Change boundary: no quoted sentence of REQ-033 to 036 relied on by either sibling change is broken, by the sweep above.
- PR #812's patch could not be checked.
