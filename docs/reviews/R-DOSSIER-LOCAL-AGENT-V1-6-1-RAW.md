Review — Polaris dossier local-agent mode v1.6 (changed-block list), round 1
Reviewed commit: 701b7d74
Manifest SHA-256: 210086071a61d56389d51016c09073b740785d26b0a55a43f1a15fa6fdc15298
Verdict: REVISE

## Subjects and checks

- [Observed] I applied `proposed/*.patch` to the installed v1.5 bytes at 701b7d74 and hashed the results with `sha256sum`. The installed bytes are identical to `b229e170`.
  - spec.md: current d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0, proposed 210086071a61d56389d51016c09073b740785d26b0a55a43f1a15fa6fdc15298.
  - design.md: current 62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b, proposed 16774d7fcb03b0e678f5f4c9d434b73f0ab4d73167b253b25ee080b2e70d0d69.
  - proposal.md: current 38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb, proposed 1f72927bbd192fc40c64b59810251c5cb7f95f841d3284845c12ef97694599fe.
  - All six digests and all three patch digests equal `PROPOSED-SUBJECTS.json`.
- [Observed] `build_polaris_dossier_local_agent_mode_v1_6.py --check` prints "OK: the v1.6 package verifies (unapplied)".
- [Observed] `--selftest` prints "26 fixtures, 0 failing".
- [Observed] `check_governance.py` prints "32 OK, 21 WARN, 0 FAIL (53 checks)".
- [Observed] The spec diff is confined to line 3 and lines 456–580, all inside REQ-polaris-generation-035. REQ-033, 034 and 036 bytes are unchanged.
- [Observed] Scenario headings go from 76 to 80, as the ledger says.
- [Observed] Every Current and Proposed block in SEMANTIC-DELTA.md is an exact substring of the reconstructed current and proposed bytes. All 10 blocks were checked by script, and they cover every hunk of the three diffs.
- [Observed] The added patch lines contain no non-ASCII characters.

## Findings

1. **Major (criterion 5 and 7). The "delivered list altered" case contradicts the requirement.**
   - Anchors:
     - proposed spec.md, Scenario "Changed-block list rebuilt with its packet", WHEN: "the delivered changed-block list is altered, or …" and THEN: "the packet Syzygy rebuilds differs from the one the verdict names".
     - The Falsifier clause "a verdict counts after its delivered list … was altered".
     - SEMANTIC-DELTA.md "What changes", item 4: "An altered list or an altered stored base makes the rebuilt digest differ".
   - The requirement does not rebuild from the delivered file. It rebuilds "from the current frozen subject and, for a packet that carries a changed-block list, from the frozen draft and inventory of its base packet as Syzygy recorded them".
   - So altering the copy in the session's directory leaves the rebuilt digest unchanged. A conforming implementation counts a verdict that names the delivered digest, and the scenario and falsifier would call that a failure.
   - The THEN also contradicts v1.5's own labelling. v1.5 guards the delivered copy only through the waiting command's re-hash ("refuses on a mismatch"). It keeps "that a waiting session read the packet Syzygy delivered, unaltered" Inferred.
   - Repair options:
     - drop the delivered-list branch;
     - restate it as a verdict naming the digest of an altered list;
     - or route it to the existing re-hash scenario.

2. **Major (VIS-4; the delta claims to preserve the owner's words). A condition is attributed to the owner that the owner did not state.**
   - Anchor: SEMANTIC-DELTA.md lines 52–54: "The owner's instruction was to draft it only if its retirement and rebinding rules could be stated without weakening REQ-polaris-generation-035."
   - [Observed] Neither the words quoted at delta lines 25–28 nor `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09.md` contain this condition. The record says: "The drafter chooses between the smaller form and the full delta and says why."
   - The condition is the drafter's own test, or the brief's, and should be attributed that way.
   - Smaller point in the same section, which the delta says is "quoted here exactly as relayed":
     - The `--fresh` bullet paraphrases the answer and drops "when the carried context is large" and "The run can still go unattended."
     - The record's text is: "Suggest only (Recommended) — Keep continuing sessions as the default; the usage note recommends --fresh when the carried context is large. The run can still go unattended."
   - The two exact phrases the delta does quote ("Draft the v1.6 amendment" and its description) match the record byte for byte.

3. **Minor (CC-SPEC-2; stale warrant). The new owner direction is missing from the warrants.**
   - Anchors:
     - REQ-035 `warrants.decisions` is unchanged by the patch.
     - SEMANTIC-DELTA.md "Warrant": "No decision record holds it yet".
     - IMPACT-LEDGER.md: "the warrants, which this version leaves unchanged".
   - At the frozen commit the direction is recorded as `OWNER-DIRECTION-FIDELITY-REVIEW-ROUNDS-2026-11-09`, so the delta's sentence is false.
   - CC-SPEC-2 rule 1 reads "Every requirement names all material governing warrants". v1.5's own content directions (`OWNER-DIRECTION-DOSSIER-VOICE-AND-SCRIPTS-2026-11-06`, `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-06`) are in `decisions[]`.
   - Repair: either add the new direction to `decisions[]` and update the Warrant section and ledger, or state why a drafting direction is not a material warrant.

4. **Minor (VIS-2; REQ-033's "Syzygy SHALL NOT rest an Observed label on a record it stored"). The disclosure does not label everything it states.**
   - Anchor: the REQ-035 continuity sentence "that the packet carried the list is Observed, and that the reviewer read the entries the list does not name is Inferred", and Scenario "Changed-block list disclosed".
   - Two parts of the disclosure carry no label:
     - The rebuilt packet carrying the list can be Observed. But that its base is "its earlier verdict" depends on stored records: the delivery and verdict records that choose the base. REQ-035 puts those within the agent sessions' write reach, and REQ-033 lists "the record of objects read in earlier steps" as Inferred. That part needs an Inferred label.
     - "That the verdict covers every entry of the whole packet" is also unlabelled. That every entry is present is Observed by validation. That the reviewer considered every entry is Inferred.

5. **Minor (criterion 4). Which packets carry the list is not fully fixed by bytes.**
   - Anchor: "where Syzygy recorded a verdict that session wrote on an earlier round" and "the latest earlier round on which it recorded that session's verdict".
   - REQ-035 records verdicts that fail validation ("SHALL be recorded") and records refusals. The text does not say whether those make a round eligible as the base.
   - "That session wrote" is authorship, which REQ-035 labels Inferred, so it cannot be a byte predicate.
   - Session identity is also undefined: the session directory or the declared identifier. The delta's claim that a `--fresh` session gets no list rests on the implementation making a new directory (design.md:183), not on the clause.
   - Repair: define the predicate by bytes, for example "a verdict Syzygy recorded from that session directory for a round it delivered there", and state how failed and refused verdicts are treated.

6. **Minor (criterion 2). The rebuild's inputs are under-specified.**
   - Anchor: "from the frozen draft and inventory of its base packet as Syzygy recorded them".
   - The list also compares the understanding record and "cited spans as Syzygy read them", and it names the base packet's digest.
   - The rebuild should name its inputs: the base's whole frozen subject (draft with understanding record), its inventory and its pinned revision, with the spans re-read from verified blobs.
   - It should also say that the base digest is re-derived by rebuilding the base packet, not copied from the delivery record.
   - It should say that a missing base record fails closed, so the verdict does not count.
   - The reading of REQ-033 ("rebuilding the review packet from the frozen subject" read as the current and the base frozen subjects) is otherwise coherent. The delta discloses it as a reading, not an edit. Binding is not weakened: the list is inside the packet and its digest.

7. **Minor (criterion 6). "Which form, and why" is mostly sound, but it skips a third form and one risk of the list.**
   - Reasons 1–5 hold against carrying entries forward. A carried-forward entry is by construction an exception to "Any revision of the subject or the inventory retires the verdicts bound to it". The trade-off (saves attention, not tokens) is stated honestly.
   - The two-way choice leaves out a third form: deliver only the delta to a continuing session, while the new verdict still writes a fresh entry for every block, bound to a chain of the base packet plus the delta that is rebuilt at render.
     - It revives no retired entry, so reasons 1 and 2 do not apply.
     - It would cut carried-context tokens.
     - Its real cost is different: it displaces "a review packet containing only the frozen subject". The reviewer would see the whole artifact in the counted round only through its retained context (Inferred). It also needs reason 5's chain.
     - The delta should say this form was considered and why it was not chosen. "Cannot be stated without weakening REQ-035" is shown only for carrying entries forward.
   - The delta's own reason 3 applies to the list as well. A repair can change an inventory entry's coverage without changing its bytes, so the list structurally points away from coverage effects. IMPACT-LEDGER "Costs" names the neighbour-meaning gap but not this one.

8. **Note (criterion 3). The REQ-006 reading holds.**
   - [Observed] All four REQ-006 sentences the delta names appear verbatim in the understanding-amendment text:
     - "confirm the frozen bundle"
     - "Reviewers SHALL receive the artifact, governing references and acceptance criteria without the authoring conversation"
     - "A revision SHALL retire dependent review evidence"
     - "The generator SHALL not classify its own wording change as immaterial."
   - [Inferred] Since the verdict must still have an entry for every inventory entry and claim block, none of the four is displaced.
   - The sentence "The candidate-authoring stage SHALL NOT define or narrow its own review denominator." is not addressed. It is not breached, because the list is written by Syzygy and the denominator is unchanged. Since the list does narrow attention, the reading could say so.

9. **Note (criterion 1).** No sentence lets a verdict count with an entry missing, lets a base verdict's entry count for a later revision, or revives a retired verdict:
   - "carries no verdict entry forward";
   - "whether or not a changed-block list names it";
   - the "confirms nothing" scenario's AND line;
   - "no surface presents an entry the list does not name as carried forward".

10. **Note (criterion 4).** The list says nothing about differences between the base and current packets in the governing criteria, the verdict schema or the pinned revision. A reviewer might read an empty list as "nothing else changed". Either list those differences too, or say the list covers only blocks, entries and the understanding record.

11. **Note (criterion 7).** design.md and proposal.md agree with the spec and overstate nothing. Neither names the direction record's identifier; adding it is optional.
