Fresh-context review of polaris-dossier-local-agent-mode version 1.5, round 7 (repairs to round 6 and what they touch)
Reviewed commit: ee4ed45a764c196c45ae0c2db74668f06e501c58
Manifest SHA-256: d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0
Verdict: CONFIRM WITH EXCEPTIONS

Package: `polaris-dossier-local-agent-mode` version 1.5, builder `scripts/build_polaris_dossier_local_agent_mode_v1_5.py`.

## What the owner must see first

- **The round returns to the owner.** All findings are notes, but I answer **yes** to three of the repair questions (repairs 2, 4 and 6, below).
- **The rule that sends it back.** `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-07-2` says: "An answer of yes or unsure returns to the owner".
- **Why repairs 2 and 4 are yes.** The brief decides them: "A repair that edits a test of the withheld rule touches it." Neither changes what the withheld rule requires. Repair 4 narrows what its test exercises (Finding 1).
- **The verdict word is not an authorization.** This verdict does not let the agent proceed without the owner.

## Subjects and digests

All digests were computed by script. L references are to the proposed `spec.md`.

| Subject | Proposed sha256 | Installed sha256 | Patch sha256 |
|---|---|---|---|
| `spec.md` | `d7cf76a823abef4a9a603e17b9df37a3e35412b4d2d317b59d252b6c2aa00ea0` | `f468456c3029f7085096d930b4e905909be3f186e946795def687ee2e38422d2` | `3f8618d63b6da24ec37052d5f701e6f2d7c484e6225aae06b068d568c80c18e9` |
| `design.md` | `62758e0368e1545a0e3f0287f58fb938ae84a9f1f5f7c1af0fd15059d17cab8b` | `657d257043459623addc23baedd24d261bd51e9114aa7fb6ddf1a97b6d902083` | `28a7bc77862f2c1e1b1b41f80415bda2e9a38270241148f482f8a89fcb0f889d` |
| `proposal.md` | `38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb` | `a4f273351b2a228c15e9210005423a76442303348f62e749b9cf3a7c13ff2eee` | `924a56b1f5b5364d70a0283a23ac9aa3d91d4a804bf968d216f7718d677d9ca3` |

[Observed] All nine digests equal `PROPOSED-SUBJECTS.json`. Rebuilding round 6's patch over the installed spec gives `e752e334…`, the digest the round 6 raw names, so the word diff below has the right base.

## Reach of this round

The reach is partial, by the owner's directions.

**Read:**
- the word-level diff from round 6's reconstructed `spec.md` to this one. It has five changed lines: L225, L318, L443, L556, L566. `design.md` and `proposal.md` are byte-identical to round 6, by digest.
- the package diff from `0bdf6ac7` to the frozen commit. [Observed] `0bdf6ac7` is not an ancestor of the frozen head after a rebase, and its spec digest ties it to this diff.
- `ROUND-6-DISPOSITIONS.md`, the round 6 raw and both directions of 2026-11-07
- the ledger, the packet, and the delta's opening sections and readings
- REQ-034's withheld and rendering paragraphs (L245, L247), its scenarios at L308 to L327, and its Observable and Oracle lines
- the falsifier clauses on withheld, mixed and legend content at L443
- REQ-035's validation paragraph (L460), its withheld and advisory scenario and its falsifier head (L556)
- the design's reading-view section
- the sentence in REQ-033 citing REQ-004
- these clauses:
  - RFC7-34
  - RFC7-33's head
  - RFC5-17's classes and Unknown mapping
  - CC-SPEC-4
  - CC-SPEC-2, through the round 6 raw's quotation, with its heading located
  - REQ-003's sentences
  - the location of REQ-002's displaced sentence
  - the 2026-11-06 voice-and-scripts direction
  - the questionnaire answer's item 4
- the recorder's findings grammar

**Not read in full:**
- REQ-033's and REQ-036's bodies, beyond sweeps
- REQ-034's presentation-element material beyond L247 to L251
- the proposal's prose (byte-identical)
- the design outside the reading-view section and a sweep
- the delta's `Current` and `Proposed` blocks, which I checked by script only

**Not re-read this round, relying on rounds 5 and 6:** VIS-2, VIS-4, SEC-2, SEC-5, RFC2-24, RFC7-2, RFC7-10, RFC7-13, RFC7-20, CC-REV-2 past its head, CC-REV-4, and CC-SPEC-1, 3 and 5 to 11. The delta's readings of them are unchanged since round 6, and no repair touches them except by citing the legend (Finding 2).

**Scratch work:** the patch reconstruction sat in a sibling scratch directory outside the frozen clone, because the clone stays read-only, and I have removed it. No observed repository body or run output was read, and no provider call was made.

## Summary

- [Observed] All the repairs round 6's dispositions list are in the bytes. No new requirement or scenario was added.
- [Observed] Each digest and block check I ran agrees, and the battery is green, as listed under Tooling.
- [Inferred] Repair 1 closes round 6's only revise-grade finding. A sweep of predecessor identifiers named in each requirement body against its declared parents now leaves only the following:
  - REQ-033: 030 and 032
  - REQ-034: 032
  - REQ-035 and REQ-036: nothing

  Sibling requirements and each requirement's own identifier are set aside. Round 6 accepted REQ-034's 032 as a where-adopted reference. REQ-033's 030 and 032 are background references present in version 1.4, and no repair touches them.
- [Inferred] Two repairs leave small test gaps of their own (Findings 1 and 2). I grade both as notes and give my reasoning, because Finding 1 is close.

## Findings

**Finding 1 — Repair 4's "quotes neither" also drops the mixed block that quotes its admitted span** (note)

- Sits in: the repair to round 6 Finding 4. Anchor: L318, the L443 clause "a block with both admitted and withheld spans that quotes neither omits its withheld count from its evidence view or machine form", and the matching delta blocks.
- The rule at L245 reads: "Any other block with both admitted and withheld spans keeps every other rule, states the count of its withheld spans in its evidence view and machine form". "Any other" excludes only a block relying on a withheld-side quotation.
- [Observed] The scenario and falsifier now exclude a block that quotes the admitted span too, since that block does not quote "neither".
- [Inferred] Quotations stay in use, so this is a likely form of mixed block.
- Concrete failure: a renderer gives such a block no withheld count, or renders it Unknown. That breaks L245, and RFC5-17's "with the redaction count disclosed on the claim" for a redacted span. It passes this scenario and this falsifier clause, and I found no other named scenario or falsifier clause that catches it.
- Why I grade this a note, closely:
  - L245's words are explicit and the repair changes no behaviour they allow.
  - The Form's Case varies "each quotation" independently and the oracle fixes expected labels, so a fixture built from the requirement reaches the case.
  - Round 6 graded the opposite defect, a scenario that was too broad, as a note for the same reason.
  - A reader who wants named tests to cover every limb of the withheld rule could fairly grade this higher.
- Repair if a round reopens: "and quotes no withheld span", in the scenario, the falsifier and the delta.
- Lineage: round 6's raw suggested "and quotes neither". The repair took the reviewer's wording, and this finding is against that wording too.

**Finding 2 — The legend falsifier closes the legend, and the oracle does not name its words** (note)

- Sits in: the repair to round 6 Finding 6. Anchor: L443 "a narrative page's legend omits a sentence this requirement gives it, or says anything else"; L247; L325; the Oracle line.
- Clause, CC-SPEC-4: the oracle decides "by a stated procedure that terminates in bounded effort, without judgment".
- [Observed] The Oracle line lists "expected labels, citation outcomes and Unknown reasons" and presentation-element values. It does not list the legend. L247 gives the legend's content after a colon and does not say the words are verbatim.
- Concrete gap: a Syzygy-written paraphrase of a legend sentence, or an added heading such as "Legend", leaves the test author to decide whether it "says anything else". That decision is a judgement if the words are not exact.
- [Observed] L325, the one scenario naming the legend, still says only "carries the legend once", so the new falsifier clause has no scenario naming the sentences.
- [Inferred] The closed list is harmless today. The design's list (a numbered citation mark, `judgement`, `framing`, a set-off quotation, `Not established`, `†`) matches L247. I found no other reading-view visual encoding in the spec's text that RFC7-34's "visual encodings are legended" would need added.
- [Unknown] Whether the implementation adds another encoding. The closure would then require a spec amendment, which is the safe direction.
- Why this is a note: the wording is in the spec, so a fixture can pin it exactly.
- Repair if a round reopens: add to the Oracle "the legend's sentences, as this requirement gives them, compared exactly".

**Finding 3 — The ledger's repaired warrant is labelled Observed and cannot be re-checked from these bytes** (note, for the owner)

- Sits in: the repair to round 6 Finding 3. Anchor: `IMPACT-LEDGER.md`, Costs, first bullet.
- It reads: "[Observed] The epic's record of the owner's review names "robotic reading caused by inline [Observed]/[Inferred]"".
- [Observed] `git grep -F "robotic reading"` over this commit's tracked files returns one hit, this ledger line. `.beads/issues.jsonl` is not tracked at this commit (`git ls-files .beads` lists no such file, and `10f41a8e` is titled "ignore local Beads exports").
- [Observed] The ledger line itself names no bead. The delta names epic `syzygy-pdja`.
- [Unknown] Whether the epic carries those words. I stayed inside the clone, as instructed.
- The repair is an improvement on the unlabelled sentence it replaced. Separately, the disposition says "the owner can confirm at signing", and the packet does not yet ask that. See Finding 4.

**Finding 4 — The packet head carries one of the four things the second direction requires of the offer** (note, for the owner)

- Sits in: the repair to round 6 Finding 8. Anchor: `OWNER-DECISION-PACKET.md` head.
- The second direction reads: "The offer names the four rulings, the reach of the last round, the notes left and every repair made in round 6 or under this choice."
- [Observed] The packet carries the four rulings and points to the reach. It has no place for the notes left or the repairs. Its "the owner's direction of 2026-11-07" is singular where two directions of that date exist.
- [Inferred] This is not a defect of the packet's rule, since the packet says "the offer states that reach from the round's raw", and the offer is a separate step. It is a reminder for offer time. The offer must also carry:
  - the repair answers in this raw
  - the reading-view warrant question (Finding 3)
  - the carried items in Finding 5

**Finding 5 — Two findings left "for the offer" stand unchanged in the bytes** (note, for the owner)

- Sits in: elsewhere, carried from round 6 Findings 5 and 7, and dispositioned "Left, for the offer".
- Secret-matching citation mark:
  - L247 says "A citation mark is keyboard-focusable and shows its file and line on hover and on focus".
  - L245 says "its citation mark names no secret-matching path".
  - [Observed] Neither rule says what such a mark shows. [Inferred] SEC-5 and the falsifier settle that the path is never named.
- RFC5-17 reading:
  - [Observed] The delta's reading and the packet's fourth ruling argue from the redacted limb only.
  - A mixed block may cite a whole-excluded blob, which falls under "every claim that depended on it renders Unknown".
  - [Inferred] No clause is weakened, because the ledger states the residual, but the offer should say that the ruling reaches this case.

**Finding 6 — Editorial remainders** (note, editorial)

- Sits in: elsewhere, except the third bullet, which sits in repair 1's ledger text.
- [Observed] `design.md` L509 and the delta's item 4 still say "citing only withheld spans", which an uncited judgement meets vacuously. The disposition left this. The spec's L245 and L556 now agree with each other and are sound.
- [Observed] L460's "the rule below" and REQ-035's closing "unchanged", and the design `render` row's last column, stand as round 6 Finding 8 left them.
- [Inferred] The ledger's new "(a declared parent of REQ-033)" sits on the row about primary narrative order, yet the Poles rule that displaces that order is REQ-034's (L259). REQ-004 is declared on REQ-034 too (L453), so the words are true but point to the lesser edge. REQ-002's "(a declared parent of REQ-035)" is exact, and REQ-002 is also on REQ-034.

## Repair questions

The question: does the repair change a rule's meaning or an owner ruling, or touch the withheld rule, screening or secret handling?

| Repair (round 6 finding) | Answer | One reason |
|---|---|---|
| 1, REQ-002 declared on REQ-035 and REQ-004 on REQ-033 | **no** | It adds two identifiers to `parent_requirements` lines and edits no obligation. REQ-002's displacement is for `advisory` entries only, and it was already in L460. [Inferred] The spec-level union is unchanged, since REQ-034 already declares both. |
| 2, verdict falsifier says "cites at least one span, all of them withheld" | **yes** | It edits a test of the withheld rule, so by the brief it touches it. Its meaning follows L245 and the REQ-035 scenario, so it aligns the test and changes no rule. |
| 3, ledger cites the epic's record, labelled | **no** | Ledger prose on a cost. It lowers a claim to a labelled citation and changes no rule or ruling. Finding 3 is about checkability. |
| 4, scenario and falsifier say the block "quotes neither" | **yes** | It edits a scenario and a falsifier of the withheld rule. It leaves L245 alone but narrows what they test (Finding 1). |
| 5, left | no repair | No bytes changed. Noted because the left question concerns secret handling (Finding 5). |
| 6, a falsifier tests the legend's sentences | **yes** | It tests the `†` sentence on the lines screening withheld, so it touches screening disclosure. "Or says anything else" also makes closed a list L247 does not state as closed, a tightening I judge at least unsure in meaning. It rests under the RFC7-20 reading, "through the one sentence and the legend". |
| 7, left | no repair | No bytes changed. Noted because the left reading concerns a ruling the owner makes (Finding 5). |
| 8, packet head states the last round's reach; the rest left | **no** | It states the offer gate and the reach, as the directions require. It sets no rule or ruling and changes no screening or secret text. |

[Observed] `ROUND-6-DISPOSITIONS.md` is the only round file listing round 6's repairs, and no later round file exists. No other spec, design or proposal bytes changed since round 6.

**Consequence, by the second direction:** three yes answers return this round to the owner. The agent's fix-and-rerun path does not cover them.

## Criteria, over this scope

1. **Contract readings.** [Inferred] Unchanged since round 6 and they hold as readings, with Finding 5's caveat. I quote RFC5-17 ("every claim that depended on it renders Unknown", "with the redaction count disclosed on the claim") and RFC7-34 ("visual encodings are legended and mean exactly what the legend says") against the repairs above.
2. **Weakening.** [Inferred] No repair weakens an accepted clause. The two parent lines strengthen CC-SPEC-2 observance, closing round 6's finding under that clause.
3. **Requirements and scenarios.** Met at requirement level. Findings 1 and 2 are the test gaps. Criterion 3's flag on human judgement applies to Finding 2 if the legend words are not exact.
4. **Design and proposal.** [Observed] Byte-identical to round 6. Finding 6 lists the leftovers. [Inferred] They overstate nothing material.
5. **Delta and bounds.**
   - [Observed] A script matched all 25 current/proposed block pairs, 18 for spec, 5 for design and 2 for proposal, with blank lines normalised and 0 misses.
   - [Observed] 0 changed lines in the three proposed files fall outside a block.
   - [Inferred] The three owner bounds stay enforceable:
     - count: L245, L311, L443
     - resolving citation: L245, L314
     - never verified: L245, L313, L443, L460, L556
   - Repair 2 tightens the last bound's falsifier. Repair 4 touches only the mixed-block rule, which is outside the bounds on wholly withheld claims.
6. **Markings.** [Inferred] Unchanged since round 6, and every marking is recoverable through clipped DOM text, machine attributes and the evidence view, with no pointer, colour or scripts. Repair 6 adds a test of the legend's words and removes no recovery route.

## Tooling

[Observed], all run at the frozen commit:

- Builder `--check`: "OK: the v1.5 package verifies (unapplied)", rc 0.
- Builder `--selftest`: 26 fixtures, 0 failing, each read. It includes apply, second-apply refusal and the record-and-peel fixtures. I did not run a separate real-bytes apply, and I rely on these fixtures plus my own patch reconstruction.
- `check_governance.py`: 32 OK, 21 WARN, 0 FAIL (53 checks).
- `check_docs_review_campaign_partition.py --check`: second-method PASS (`git ls-files`=776, `git ls-tree`=776); partition PASS (denominator 776, raw 736, unmatched 0, overlaps 0).
- Recorder `--check polaris-dossier-local-agent-mode --version 1.5`: "not performed".
- U+00A0 count over the three proposed files: 0, 0, 0.
- Raw verdict lines 1 to 6 all read `Verdict: REVISE`, which agrees with the campaign page's statement.
- `git status --short` count in the frozen clone: 0, with HEAD at the frozen commit, before and after.

## Prior rounds

I opened the round 6 raw and its dispositions as the brief directs, so this round is anchored on them by design. Finding 1 shows the cost of that anchoring: the round 6 reviewer's suggested wording became the repair, and it needed re-deriving against L245.
