Polaris dossier local-agent mode v1.5, fresh review
Reviewed commit: 6abfe434e34fb9fde45e5bee8611088488a37bf5
Spec SHA-256: de8d6cf26a3e5484bf3fecf5d0e80e192e63c65e2a29e378721d05d5967a1eea
Verdict: REVISE

Subject digests, computed by script after applying the v1.4 patches at 59768e6f and then the v1.5 patches. All three match `PROPOSED-SUBJECTS.json`, and the three intermediate v1.4 digests match its `current_sha256`.
- spec.md: de8d6cf26a3e5484bf3fecf5d0e80e192e63c65e2a29e378721d05d5967a1eea
- design.md: d0b3cfdffe2937d1c191515b4352ae2c46c07ff0697f01a5605c4fe35469e2ad
- proposal.md: df00a134e9d66e29620266190161612e3636fb28fcdb9e74dc0dd35e4c087bda

"L<n>" means a line of the proposed spec.md unless another file is named. No observed repository body or run output was read, and no provider call was made. The one Redis run fact in finding 3 comes from the description of bead `syzygy-mea.9`, not from run output. Nothing was edited or committed.

## Findings

1. **Severity: blocking. Unchanged scenarios still fail what the new rule allows (criterion 3).**
   - Anchors: L332, L344, against L236, L243, L301-303.
   - [Observed] L332, scenario "Agent labels its own claim Observed": "is Inferred without a citation ... **THEN** Syzygy reports a label or citation finding for that block".
   - [Observed] L344, scenario "Claim inside a presentation element checked as a block": "is Inferred without a citation ... **THEN** Syzygy reports the finding".
   - [Observed] L236 says the opposite: an uncited block "SHALL NOT be a repair finding or block readiness". L301-303 says "Syzygy reports no repair finding".
   - [Observed] The exact phrase "Inferred without a citation" occurs at L332 and L344 only, by a sweep of all 582 lines.
   - L249 and L383 also still assume a stated absence or negative is "Inferred with its citations". This may be intended, but it is unstated.

2. **Severity: blocking. "Uncited" is defined as "judgement", so an uncited project fact passes, against doctrine and two parent clauses (criteria 1, 2).**
   - Anchors: L236, L420; design.md §"Citations, withheld spans and judgement"; delta reading 1.
   - [Observed] L236: "an Inferred block with no citation is a judgement of the authoring session". The test is the missing citation, not the block's content.
   - [Observed] L420: the verdict "judges whether the block is plausibly a judgement ... and it SHALL NOT be a blocking finding". A flat project-fact claim that a reviewer finds implausible as a judgement therefore has no consequence.
   - [Observed] Design disagrees with the spec: "may cite none when it states a judgement". The spec has no such condition.
   - [Observed] The delta's quote of RFC7-2 (c) is accurate, but that clause applies "per trust-and-evidence.md". `doctrine/trust-and-evidence.md` says: "**Missing evidence never makes a claim Inferred.**" and "Absence of evidence does not make a claim probabilistic; it makes it Unknown."
   - [Observed] The direction permits "Polaris's own judgements" and "keeps the epistemic rules". It does not permit uncited facts.
   - [Inferred] Reading 1 holds for genuine judgements only. For an uncited project fact, the rule conflicts with doctrine, and CC-REV-2 then requires "Stop; route to owner".
   - [Observed] RFC7-9, a named warrant of 034 at L409, says "Every load-bearing claim sits inside a block whose anchor set **covers** it". The delta does not address it. RFC7-5 and RFC7-2's three kinds may support a labelled, unanchored block, but that reading must be stated.
   - [Observed] REQ-003's scenario "Unsupported or surplus anchor" is not displaced: "**WHEN** a claim lacks sufficient support ... **THEN** the bundle records a fidelity finding and cannot become ready". L247 displaces only the sentence on anchored claims and leaves "Every other rendering obligation" in place.
   - [Observed] REQ-006 ("It SHALL record both inventory-to-draft coverage and draft-to-source support") and L418 ("draft-to-source support for every claim block") are not read down either. L426 "displaces only what it names", and `IMPACT-LEDGER.md` does not list 006 as read or displaced.
   - Repair: state a predicate for what may be uncited, give a block that fails it a consequence (a finding or Unknown), and either answer the doctrine sentence or put the conflict to the owner explicitly.

3. **Severity: blocking. The withheld rule does not reach REQ-035, so "instead of blocking readiness" is not delivered and "never supported" is not enforced (criterion 5).**
   - Anchors: L245, L308, L418, L420, L426, L452-454, L470-471.
   - [Observed] The bead `syzygy-mea.9` records the incident: the reviewer "could only mark them unresolved; the run blocked". `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-05`, item 2, calls option E "a REQ-polaris-generation-035 change".
   - [Observed] L420 gained an advisory rule for uncited blocks and nothing for withheld ones.
   - [Observed] These rules are unchanged and still apply:
     - L418: fidelity packet spans are "screening-admitted only", yet the verdict records "the accuracy of every inventory entry against the cited spans in its packet".
     - L420: "every inventory entry and every claim block has an entry".
     - L452: a verdict that "omits the accuracy of an inventory entry" fails validation.
     - L470-471: a material uncovered entry "is a blocking finding".
     - L426: "unresolved material omissions prevent readiness ... is unchanged".
   - [Inferred] A reviewer given no span for a withheld-only row still has only "unresolved" available, and nothing says that does not block.
   - [Observed] "never counted as verified or as supported" (L245) has no check. L420's validation list does not refuse a verdict that marks such a block supported, and neither the 034 nor the 035 falsifier names it.

4. **Severity: blocking. What renders in place of a withheld-only block's text is unstated, which leaves a route for excluded-derived prose (criteria 2, 5).**
   - Anchors: L245, L247, L308.
   - [Observed] RFC2-23, "Excluded content": "nothing derived from excluded content in any surface, label, or endpoint". RFC5-17: exclusions are recorded "never the content itself". SEC-5: "A secret reproduced in any Syzygy surface, store, or endpoint breaks the trust floor".
   - [Observed] The earlier rule replaces the quotation ("instead of the quotation"), and an excerpt carries "none of the blob's bytes" (L253). The new sentence says only "SHALL render Unknown with `excluded-content` instead of blocking readiness". L247 adds "an Unknown block states what is unknown in words", without saying whose words.
   - [Inferred] The agent read the clone without restriction (L11), so its sentence may restate the withheld text. Rendering it under an Unknown label would be derived content on a surface.
   - [Observed] The citation mark "shows its file and line" (L247). The agent-supplied-and-unverified disclosure at L253 covers excerpts only, not this block's range.
   - Repair: state that Syzygy supplies the rendered words, and what happens to the agent's text.

5. **Severity: blocking. The no-script replacement bounds nothing determinate and silently drops the CSP guarantee (criteria 2, 4).**
   - Anchors: L255; delta "What does not change"; design.md at the new script paragraph.
   - [Observed] L255: "with no script other than one the screening scope's renderCondition permits". The in-force text in `.syzygy/governance/policies/POLARIS-BUTLERS-SECRET-CLASSIFICATION-POLICY-CANDIDATE.json` is a condition on a code-content exemption, not a script rule: "The exemption holds for a page sink only while ..."; "A consumer that cannot confirm this for a page sink scans the body as before for that sink".
   - [Inferred] Those words permit and forbid no script as such. A page with a script simply loses the exemption, so "Item 8 grants no script" is not established by the words at L255.
   - [Observed] v1.4's "no change to the pages' content security policy" was removed unconditionally, not made conditional. The delta's plain-words list does not say so, and no requirement now bounds a CSP change, though the delta asserts "No read, egress, write or execution permission is added".
   - [Observed] Design's "it adds behaviour only: the collapsible navigation and hash handling" has no counterpart in any requirement, so design states a limit the spec does not.
   - [Observed] L255 still says "inert static HTML", beside a permitted script.
   - [Observed] No scenario covers a page that carries a permitted or an unpermitted script.
   - Repair: state the bound in the requirement (no script until the named act, what a script may do, the CSP rule), with a scenario.

6. **Severity: blocking. The 034 and 035 test forms were not amended, so the old oracle contradicts the new text (criterion 3, CC-SPEC-4).**
   - Anchors: L399-403, L500-504.
   - [Observed] L401's oracle still fixes "the absence of any script or content security policy change". L403's falsifier still says "an element renders a script, changes the content security policy".
   - [Observed] By script sweep, the 034 falsifier contains none of "reading view", "evidence view", "Pole", "uncited", "appendix" or "scripts off". Its only "withheld" is the older excerpt range clause. The 035 falsifier contains none of "advisory", "uncited" or "withheld". L399's Case varies none of these behaviours.
   - [Observed] CC-SPEC-4 requires each form to name a reachable case, an observable consequence, an oracle and "concrete falsifying evidence".

7. **Severity: blocking. "No epistemic label word" has no defined population and collides with unchanged labelled text (criteria 3, 6).**
   - Anchors: L247, L314, and the collisions listed below.
   - [Observed] L247 says "A page SHALL open in a reading view that carries no epistemic label word". It does not limit "page". "Running text" and "label word" are undefined.
   - [Observed] Unchanged or new text requires those words on rendered pages:
     - L232, L272: understanding record "labelled Inferred".
     - L278: "renders it as an Observed quotation".
     - L422, L459: the review page states which items "are Observed" and "are Inferred".
     - L532: discovery account "labelled Inferred ... labelled Observed".
     - L27: the appendix disclosures, "labelled Inferred".
     - L27: the one line on every page gives "the count of open questions and Unknowns".
     - L255, L394: summary shows "the count of Unknown claims".
     - L15, L171, L206: execution claims "show the commands it names beside it", and it is unstated whether that is an aside barred in the reading view.
   - [Inferred] A mechanical oracle cannot be written. Ordinary English uses of "observed" or "unknown" in agent prose collide with it, and "states what is unknown in words" invites the word itself. CC-SPEC-4 rejects an oracle needing judgment.
   - Repair: define the population (claim-block prose only, or Syzygy-minted label tokens only) and exempt the appendix, review, discovery and source pages, or state otherwise.

8. **Severity: blocking. Reading-view recoverability and evidence-view parity are under-specified (criterion 6).**
   - Anchors: L247, L315; design.md §"Reading view and evidence view"; delta reading 2.
   - [Observed] The delta says item 6 "keeps text in the DOM". The spec says "in text an assistive technology reads", which an `aria-label` meets without any DOM text.
   - [Observed] RFC7-33 requires each distinction be "preserved in plain-text or exported renderings". REQ-003's scenario requires "plain-text output retains the distinctions". The quoted RFC7-34 words are accurate, but the spec does not secure this limb.
   - [Observed] The evidence view "SHALL show every block's label" (L247). Design says "every label and citation in the text". Neither requires the Unknown reason, tier, the uncited-judgement class, exclusion counts or execution commands. RFC7-33's list is "label + tier + reason + freshness", and "claim-block kind".
   - [Observed] L315's parity phrase, "with the same values as the evidence view", therefore has an undefined denominator.
   - [Observed] "Machine view" appears 5 times beside "machine form", "machine manifest" and "machine attribute". None is defined relative to the others.
   - [Observed] The hover-and-focus requirement meets the no-pointer limb only if the mark is focusable. L316 tests it, which is good, but not for a citation with no source page (withheld).
   - [Inferred] It is unstated whether the rendered-design packet's "rendered pages" (L418) include the evidence view.

9. **Severity: blocking. The section sentence is false for two block kinds (criteria 2, 6).**
   - Anchors: L247, L314.
   - [Observed] L247: "each section states once in words that its unmarked text is the agent's reading of the sources".
   - [Inferred] An uncited judgement cites no source, and a non-normative block (RFC7-2 (b)) is framing, not a reading of sources. Both are unmarked, so a sighted reader cannot tell them apart without opening the evidence view. RFC7-33 lists "claim-block kind" among the distinctions that must stay recoverable, and doctrine says "Inferences ... must never be indistinguishable from deterministic fact".
   - [Observed] The owner accepted the no-label cost in `IMPACT-LEDGER.md`, "Costs". That cost does not cover a sentence that misdescribes the block.
   - [Observed] Landing-page text and the draft's `introduction` sit outside sections, so no sentence covers them (L257; design "title, introduction, sections").
   - [Observed] Quotation styling has no legend. RFC7-34: "visual encodings are legended".

10. **Severity: blocking. Human-form text still assumed per page after moving disclosure to the appendix (criteria 3, 4).**
    - Anchors:
      - L243: "the page SHALL say so". This is a human sentence that fits neither the one line nor the machine form.
      - L170: "the run record and every page disclose the whole list".
      - L104: "every page states".
      - L155: "every page discloses".
      - L63, L117: "the run record and pages state".
      - L551: "the page states".
      - design.md decision 10 (line 290): "Every page says that neither its classes nor SEC-5 screening limit".
      - proposal.md line 159: "every page says so".
    - [Observed] L27 now puts human form in the appendix and the run record only.
    - [Inferred] Each could be read as met by machine form, but the delta does not say so, and L243's "say" reads as human.
    - [Observed] The RFC7-20 ruling's condition is "the run record and page disclose how the draft was computed", repeated at L29 with "every page". Whether the one line discharges it, with tool and model but not how the draft was computed, is an owner-ruling question the delta does not raise.

11. **Severity: blocking. "Renders as before" contradicts the new page rules (criterion 3).**
    - Anchors: L257, L328.
    - [Observed] L328: "a schema-v3 draft renders as before". L257: "a draft with no Poles renders as a schema-v3 draft does". L247, L27 and L321 apply the reading view, the one line and the appendix to every page without a schema condition. Design still accepts v2 and v3.
    - [Inferred] The intent is the page split only, and the words say more. The spec also does not say whether a v2 or v3 draft may have uncited blocks.

12. **Severity: blocking. Warrants were not updated (CC-SPEC-2).**
    - Anchors: L409, L411, L510, L512, L221; `GOVERNING-DEPENDENCIES.md`.
    - [Observed] CC-SPEC-2: "Every requirement names all material governing warrants ... none may be hidden". 034's `contracts` omits RFC5-17, RFC2-23, RFC7-13, RFC7-33 and RFC7-34, all relied on in its new text. Its `decisions` omits both directions L236 and L245 cite. 035 adds rendered-design and advisory rules on those directions without naming them. 033 cites neither RFC7-33 nor RFC7-34 for its machine and human split.
    - [Observed] `GOVERNING-DEPENDENCIES.md`, generated from those blocks, is not in the patch set.

13. **Severity: blocking. The spec head contradicts itself and asserts an unrecorded signature (criterion 4).**
    - Anchor: L3.
    - [Observed] "it binds only by the owner's sign-off of version 1.5" and, later in the same paragraph, "these bytes bind only by the owner's sign-off of version 1.4".
    - [Observed] "a candidate on signed version 1.4" is stated as fact. `IMPACT-LEDGER.md` says "selected by the owner but not yet recorded". The direction says "This record does not perform that sign-off". `decisions/` holds SIGNOFF v1.0 to v1.3 only at this commit.

14. **Severity: note. RFC5-17 reading is partly misattached (criterion 1).**
    - Anchor: delta reading 4.
    - [Observed] The quoted "depends on a redacted span renders Unknown" is accurate, but "with the redaction count disclosed" belongs to the other limb: a claim over surviving content "may still stand ... with the redaction count disclosed on the claim".
    - [Observed] The artifact limb reads "with the exclusion count shown". L245 places the count in the appendix and machine view.
    - [Inferred] L245's "all of whose cited spans" leaves a mixed block silent. The owner's words scope to "all" (2026-11-05 item 2), so this is faithful, yet the bead records 3 of 5 incident rows as "partly" withheld, and RFC2-23 says "claims needing it → Unknown". The owner should see that this residual remains.

15. **Severity: note. "Resolves" (bound 2) is tested by path only.**
    - Anchors: L241, L245, L309.
    - [Observed] L241 keeps "This exception does not apply to an ordinary claim block's citation", so a path-excluded blob's range is still checked for ordinary blocks, and "neither a finding nor the rendered page SHALL disclose ... line count" is worded for read-then-excluded blobs. L309 tests only "names no blob".
    - [Inferred] State whether a withheld-only citation's range check reads the body, and what a finding may say.

16. **Severity: note. An inventory entry has no rendering surface.**
    - Anchors: L245, L308.
    - [Observed] "An inventory entry ... SHALL render Unknown", but by reading the spec and a pattern sweep of design and proposal, I found no clause that renders the inventory. It is frozen and carried in packets (L418).
    - [Inferred] This half of the scenario can be tested only once a surface is named.

17. **Severity: note. The uncited figure has no location.**
    - Anchors: L243, L302.
    - [Observed] "counted and disclosed" and "the disclosed figure of uncited blocks" name no surface, and L27's list omits it. Withheld counts at L245 do name one.

18. **Severity: note. Items only a person can judge are written as rules, or lack a scenario (criterion 3).**
    - [Observed] L247, "A list that repeats a diagram SHALL render collapsed by default": no draft field or check can decide "repeats", and no scenario exists.
    - [Observed] L257, "each large enough to hold a substantial share of its documentation": no review criterion owns it.
    - [Observed] "one line" (L27) has no stated test. Whether a count is per page or per dossier is unstated.
    - [Observed] L234's no-invented-reason rule has no scenario. The last-page rule of L27 and the section-in-two and empty-Pole findings of L257 are not exercised by L322 or L326-328.
    - [Observed] A Pole label's length and no-fact rule are absent, though element short labels have them at L251.
    - [Observed] No schema field names "why the project exists" for the landing page.

19. **Severity: note. "No default" against a defaulted Pole limit.**
    - Anchors: L23, L69, L257.
    - [Observed] "there is no default" and "no default limit is chosen" against "which defaults to five". The Pole limit is outside L23's named list, so this is not a strict contradiction, but it needs one sentence.

20. **Severity: note. Overstatement and stale version text (criterion 4).**
    - [Observed] proposal.md: "It weakens no epistemic marking: every claim keeps its label". A withheld-only block changes label, and the ledger names a visible-label loss as the largest cost.
    - [Observed] design.md head still reads "**Version 1.3.**".
    - [Observed] proposal.md line 203 and design.md line 395 still speak of awaiting version 1.4 sign-off.
    - [Observed] The direction assigns the script amendment to `syzygy-pdja.5`. The delta carries the spec clause under `syzygy-pdja.2` and calls `.5` the screening candidate. Say which, so the two do not overlap.

21. **Severity: note. Other parent and contract text not yet aligned.**
    - [Observed] REQ-004: "Supported gaps remain explicit at the depth they affect". L27 moves open questions to the appendix. L562's "explicit as unresolved in the affected reading" still stands, so state how both hold.
    - [Observed] RFC7-20: "visually distinct". L247 keeps machine-marking and the one line, and does not restate visual distinctness.
    - [Observed] RFC7-20's provenance is "model, version, inputs". L247 gives model and version, which is older text, but uncited blocks make the inputs gap matter more.
    - [Observed] L257 "this way" names no altitudes, though RFC7-13 says "named altitudes".

## What holds

- **Criterion 5, delta against patches.** [Observed] By script, all 236 current and proposed block lines occur in the v1.4 or patched bytes, with 0 not found. Every changed non-blank line of all three files appears in a block. The blocks omit blank lines.
- **Reading 3, RFC7-13 and REQ-004.** [Observed] Both quotes are accurate, and an owner sign-off can be that ruling, subject to the naming note in 21.
- **Reading 5, REQ-003.** [Observed] Both quoted sentences are verbatim. The reading is explicit, but incomplete per finding 2.
- **Reading 2, RFC7-33 and RFC7-34.** [Observed] The quote is accurate. The conclusion fails only as in finding 8.
- **Bound 1, disclosed count.** [Observed] Enforceable at L245 and L308. Bounds 2 and 3 are not fully enforceable, per findings 3 and 15.
- **SEC-2, RFC7-10 and RFC2-24.** [Observed] I found no weakening. Anchor form, the Observed reservation, quotation verification and the closed reason list are unchanged.
