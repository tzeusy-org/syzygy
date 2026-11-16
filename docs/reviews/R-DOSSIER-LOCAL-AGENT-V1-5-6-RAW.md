Fresh-context review of polaris-dossier-local-agent-mode version 1.5, round 6 (repairs to round 5 and what they touch)
Reviewed commit: 0bdf6ac7b0dfc226baa405b6121e5df6495a2920
Manifest SHA-256: e752e334106646551a7d12276a86747547110f707dfa4f851bd67bb143b22522
Verdict: REVISE

Package: `polaris-dossier-local-agent-mode` version 1.5, builder `scripts/build_polaris_dossier_local_agent_mode_v1_5.py`.

## Subjects and digests

All digests were computed by script. L references are to the proposed `spec.md`.

| Subject | Proposed sha256 | Installed sha256 |
|---|---|---|
| `spec.md` | `e752e334106646551a7d12276a86747547110f707dfa4f851bd67bb143b22522` | `f468456c3029f7085096d930b4e905909be3f186e946795def687ee2e38422d2` |
| `design.md` | `62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b` | `657d257043459623addc23baedd24d261bd51e9114aa7fb6ddf1a97b6d902083` |
| `proposal.md` | `38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb` | `a4f273351b2a228c15e9210005423a76442303348f62e749b9cf3a7c13ff2eee` |

[Observed] These digests and the three patch digests all equal `PROPOSED-SUBJECTS.json`.

## Reach of this round

The reach is partial, by the owner's direction (`OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-07`).

**Read:**
- the word-level diff from round 5's `spec.md` and `design.md` (`proposal.md` is byte-identical to round 5)
- `ROUND-5-DISPOSITIONS.md` and the round 5 raw
- the ledger and the packet
- the delta's opening sections, readings and blocks (blocks checked by script)
- REQ-034's rule paragraphs (L241 to L253), its scenarios around the repairs and its Form block (L437 to L453)
- REQ-035's validation paragraph, its displacement paragraph, scenarios and Form block
- the design's reading-view and withheld sections and its `render` row
- the clauses cited in the findings below: RFC5-17, RFC7-20, RFC7-33, RFC7-34, RFC2-23's row, CC-SPEC-2, CC-SPEC-4's form list, the CC-IMPACT trigger, REQ-002's sentence, the trust-and-evidence sentences, and both 2026-11-06 directions

**Not read in full:**
- REQ-033's and REQ-036's bodies, beyond sweeps
- REQ-034's presentation-element material beyond the code-excerpt rule
- the proposal's prose, beyond a sweep (unchanged since round 5)
- the design outside the sections above
- RFC7-10, CC-REV-2, CC-REV-4, SEC-2, VIS-4 and CC-SPEC clauses other than 2 and 4 were not re-read this round; I rely on round 5 for them

The scratch work (patch reconstruction, a throwaway clone for a real-bytes apply) sat outside the frozen clone and has been removed.

## Summary

- [Observed] Six of round 5's seven findings are closed in the bytes. Finding 6 is closed apart from its warrant question (Finding 3 here), and the REQ-002 repair introduced Finding 1.
- [Observed] The tooling is green, and the delta's blocks match the patches.
- [Inferred] The one reason for REVISE is that the repair for round 5's Finding 6 made REQ-035 displace a REQ-002 sentence without adding REQ-002 to REQ-035's declared parents.
- The defect is small. Its repair is one token in the `parent_requirements` line.
- The grade is close. I give my reasoning in Finding 1 so the owner can weigh it.

## Findings

**Finding 1 — REQ-035 displaces a REQ-002 sentence and does not declare REQ-002 as a parent** (revise)

- Anchor: L460 and REQ-035's warrants block; criterion 3; CC-SPEC-2.
- L460 now says: "and, for an `advisory` entry, REQ-polaris-generation-002's "Source-supported inference SHALL expose its admitted premises"."
- REQ-035's declaration reads: `parent_requirements: [REQ-polaris-generation-006, REQ-polaris-generation-033, REQ-polaris-generation-034]`.
- Failing clause, CC-SPEC-2: "Every requirement names all material governing warrants. One may be marked primary for navigation; none may be hidden merely because another is more specific." Rule 4 adds: "This declaration is the only home."
- [Inferred] It is material:
  - REQ-006 is declared on REQ-035 for the same displacement relation.
  - `IMPACT-LEDGER.md` itself lists REQ-002 under "Parent requirements read or displaced".
- [Observed] A script compared every predecessor identifier named in each requirement's body with its declared parents:
  - REQ-035's only undeclared predecessor is REQ-002.
  - REQ-034's undeclared names are 032 (a "where it is adopted" reference) and the siblings 035 and 036.
  - REQ-036 has none.
  - REQ-033 has one similar case, below.
- Concrete failure: a reader or tool asking which requirement rests on or displaces REQ-002 finds REQ-034 and not REQ-035, the one requirement that displaces REQ-002's sentence. Signing freezes that declaration.
- Limit on the harm:
  - [Inferred] The spec-level dependency union still holds REQ-002 through REQ-034, so CC-IMPACT's sweep ("every specification whose CC-IMPACT-1 declarations name the changed identity") still fires.
  - No runtime behaviour changes.
  - A reader could take "governing warrant" more narrowly and call this a note. I do not, because the same relation is declared everywhere else in this requirement set.
- Sibling, same clause, weaker:
  - [Observed] Version 1.5 adds "stays explicit at that passage (REQ-polaris-generation-004)" to REQ-033, whose parents omit 004.
  - That sentence relies on 004 and does not displace it. Rule 5's "A citation is not a reliance" cuts both ways, so I leave it as a call for the repairer.
- Repair: add REQ-polaris-generation-002 to REQ-035's `parent_requirements`, and carry the same line in the delta block. Decide 004 on REQ-033 at the same time.

**Finding 2 — A verdict falsifier keeps the vacuity the inventory repair removed** (note, editorial)

- Anchor: REQ-035's falsifier at L556, against L245 and the scenario "Withheld and advisory verdict entries".
- The requirement and the scenario now say "cites at least one span". The falsifier still says "an inventory entry whose cited spans are all withheld", which is vacuously true of an entry citing nothing.
- A verdict accepting `withheld` on such an entry fails the scenario but does not meet the falsifier's words.
- The prose in the design ("citing only withheld spans") and the delta's item 4 has the same looseness, and there it would also take in an uncited judgement. The spec's requirement text is sound.

**Finding 3 — The reading view's restated warrant still cannot be checked here** (note, for the owner)

- Anchor: `IMPACT-LEDGER.md`, Costs, first bullet; round 5 Finding 6.
- It now says: "The owner asked for pages that read without label words on the text".
- [Observed] The sentence carries no epistemic label. `git grep` for "reading view" and "label word" over `decisions/` finds nothing. The 2026-11-06 direction's quoted words cover judgements, citations and scripts only.
- [Observed] The repository's own campaign page `pdja-1-reading.md` says only that `syzygy-pdja.1` renderer changes came from the owner's review.
- [Unknown] Whether the epic carries those words, since `.beads/issues.jsonl` is not in this clone. The delta's warrant points there.
- The owner can confirm this at signing, which is why I grade it a note. The same gap applies to REQ-033's and REQ-034's `decisions[]` for the one-sentence move, because no recorded direction names it.

**Finding 4 — The new mixed scenario does not carve out a quoting block** (note)

- Anchor: L316 to L320, and the matching falsifier clause at L443, against L245.
- L245 limits the mixed rule to "Any other block", because a block quoting a withheld file "is a withheld item whatever else it cites".
- The scenario's WHEN ("one block cites both an admitted span and a withheld span") and the falsifier have no such limit.
- The Case varies quotations and screening independently, so a fixture crossing the two would expect a label a conforming renderer must not give.
- [Inferred] This is less sharp than round 5's Finding 3. The sibling scenario states the quotation case, and L245's words are explicit. A reader would resolve it correctly.
- Repair if another round opens: "and quotes neither".

**Finding 5 — Two citation-mark rules collide for a secret-matching path** (note)

- Anchor: L247 and the "Reading view keeps every marking" scenario ("a citation mark ... shows its file and line on focus and on hover"), against L245 and the new scenario ("its citation mark names no secret-matching path").
- [Inferred] SEC-5 and the falsifier ("a secret-matching path is named") settle the outcome safely.
- Neither rule says what such a mark shows, or whether it renders. An implementer has to choose.

**Finding 6 — The legend's words have no test of their own** (note)

- Anchor: L247, L325, L443.
- [Observed] "legend" occurs three times in the spec: twice at L247 and once in a scenario ("carries the legend once"). The Form block's falsifier never names it.
- `†` itself is now tested on the citation. A legend that omits the `†` sentence, or carries round 5's false one, passes every named scenario and falsifier.
- RFC7-34's "mean exactly what the legend says", and the RFC7-20 reading ("through the one sentence and the legend"), rest on this text.
- The wording is fixed in the spec, so the fixture's oracle can pin it. That is why this is a note. Round 5 asked only for a test of `†`, and that was delivered.

**Finding 7 — The RFC5-17 reading for a mixed block quotes one limb of two** (note, for the owner)

- Anchor: delta, "Contract readings", RFC5-17 bullet; packet's fourth ruling.
- A mixed block's withheld span may be a whole-excluded blob. That falls under the other limb: "every claim that depended on it renders Unknown ... with the exclusion count shown". The reading and the packet argue only from "may still stand" and "disclosed on the claim".
- [Inferred] The clause is not weakened:
  - dependence is enforced by review, because the packet carries admitted spans only, so a block resting on the excluded blob reads as unsupported and blocks
  - a block not depending on the blob is outside that limb
  - the ledger states this residual
- The offer should say that the ruling covers a block citing an excluded file too.

**Finding 8 — Small remainders** (note, editorial)

- L460's "the rule below" is displaced for these entries, while the last paragraph of REQ-035 still lists that rule as "unchanged". It is the stumble round 4 noted and left, and the sentence order resolves it.
- The design's `render` row is repaired, but its last column still names "the disclosure block" as new work.
- Ledger head: "[Observed] Version 1.4 is recorded and on `main`".
  - [Observed] The sign-off record exists and commit `59768e6f` is an ancestor of this head.
  - [Observed] This clone's `origin/main` (`824ae265`) lacks the record. The 2026-11-06 direction names that same commit as an earlier `origin/main`.
  - [Inferred] That ref is stale.
  - [Unknown] Current `main` from here.
- The packet's "Your words" line does not yet record the round's partial reach, which the direction requires of the offer. The packet is correctly marked not yet offerable, so this is a reminder for offer time. The same applies to the delta's and ledger's "unless a review finds otherwise" wording.

## Round 5 findings against the bytes

1. **`†` legend: closed.**
   - L247 now reads "`†` with a number on a citation counts the lines of that citation's file that screening withheld".
   - [Observed] This matches the installed `dossier-site.ts:470` ("N lines of that file are withheld by screening") and questionnaire item 3.
   - The design's list names it. A scenario and a falsifier test both directions, including a file with no redaction.
   - "Verified" is gone.
2. **Mixed block: closed**, with Finding 4 as a remainder.
3. **REQ-035 scenarios: closed.** Both scenarios are carved, and two new ones are testable. The rendered-design one tests that questions are asked, not how they are answered, so no human judgement is written as a check.
4. **"the one exception" and "code-only": closed.**
5. **Ledger head: closed**, as far as this clone can show (Finding 8).
6. **REQ-002 and doctrine: closed in spec, ledger and packet.** Findings 1 and 3 are the remainders. All quotations match, by script over whitespace-normalised text.
7. **Smaller gaps: closed as dispositioned.** The control has a falsifier, the inventory rule says at least one span, classification is named and the `render` row matches. The class-gate carve-out still follows immediately after "classification", so the added word does not swallow it.
   - The disposition's two stated leftovers ("any glossary term drawn from it" as a review call, and only the spec being byte-bound after install) stand as disclosed.

## Criteria

1. **Contract readings.** [Inferred] They hold as readings, with the Finding 7 caveat. Quotations checked against the clauses:
   - RFC5-17's two limbs
   - RFC2-23's "nothing derived from excluded content in any surface, label, or endpoint"
   - RFC7-20's "visually distinct"
   - RFC7-34's "visual encodings are legended and mean exactly what the legend says"
   - trust-and-evidence's "Missing evidence never makes a claim Inferred." and "Inferences may be woven into explanatory narrative but must never be indistinguishable from deterministic fact."
   - REQ-002's and REQ-003's sentences
2. **Weakening.** [Inferred] Nothing is weakened without disclosure. The `†` repair removes round 5's RFC7-34 problem. RFC7-13, RFC7-20 and RFC5-17 remain rulings a signature makes, and the packet names all four rulings plus the REQ-002 displacement.
3. **Requirements and scenarios.** Met except Findings 1 and 2, with Findings 4 to 6 as notes.
4. **Design and proposal.** [Inferred] They agree with the spec and overstate nothing material. The remaining details are in Findings 2 and 8.
5. **Delta and bounds.**
   - [Observed] A script found all 25 current/proposed block pairs, with blank lines normalised, and the one reported "miss" is the "(nothing; this is new text)" marker on an added block.
   - [Observed] No changed proposed line in any of the three files falls outside a block.
   - [Inferred] The three owner bounds are enforceable:
     - count: L245, L320, L443
     - resolving citation: L241, L319
     - never verified: L245, L319, L460, L512
6. **Markings.** [Inferred] Clipped DOM text, machine attributes and the evidence view recover every RFC7-33 distinction without colour, pointer or scripts. The control to the evidence view now has a falsifier. `†` is visible text. [Observed] Installed code also carries it as `data-redacted-lines` and clipped words.

## Tooling

[Observed], all run at the frozen commit:

- Builder `--check`: "OK: the v1.5 package verifies (unapplied)", rc 0.
- Builder `--selftest`: 26 fixtures, 0 failing.
- `check_governance.py`: 32 OK, 21 WARN, 0 FAIL.
- `check_docs_review_campaign_partition.py --check`: second-method PASS, and partition PASS (denominator 775, raw 735, unmatched 0, overlaps 0).
- Recorder `--check` for the package at 1.5: "not performed".
- Real-bytes `apply()` in a throwaway clone:
  - rc 0
  - all three files hash to the digests above
  - `PROJECT-STATUS.md` reads 36 requirements and 270 scenarios (round 5's 267 plus the 3 new scenarios)
  - I did not re-run reconciliation or the record-and-peel sequence after apply, and rely on the selftest and round 5 for those
- U+00A0 count over the three proposed files: 0.
- The frozen clone stayed clean, with 0 `git status` entries, at the reviewed commit. No observed repository body or run output was read, and no provider call was made.

## Prior rounds

- I opened the round 5 raw and its dispositions as the brief directs, so this round is anchored on them by design.
- CC-REV-4 reads: "Two failed review rounds signal upstream ambiguity". [Inferred] As in round 5, this round's revise finding comes from the last repair's reach, a missing declaration entry, and not from ambiguity in the owner's direction.
- Lesson the lead may want: a repair naming a new displaced parent should touch the warrants line in the same edit.
