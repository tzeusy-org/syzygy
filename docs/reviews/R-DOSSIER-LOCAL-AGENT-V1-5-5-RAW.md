Fresh-context review of polaris-dossier-local-agent-mode version 1.5, round 5
Reviewed commit: e260e36ff103c60d8cc0f2e0e8fee456578f7c75
Manifest SHA-256: f80342ea3219e7db01375eae5d89af29d370837e957a993b5e70a57a9466e4bc
Verdict: REVISE

Package: `polaris-dossier-local-agent-mode` version 1.5, builder `scripts/build_polaris_dossier_local_agent_mode_v1_5.py`.

## Subjects and digests

All digests were computed by script. Line references (L) are to the proposed `spec.md`.

| Subject | Proposed sha256 | Installed sha256 |
|---|---|---|
| `spec.md` | `f80342ea3219e7db01375eae5d89af29d370837e957a993b5e70a57a9466e4bc` | `f468456c3029f7085096d930b4e905909be3f186e946795def687ee2e38422d2` |
| `design.md` | `7eeae59a92a14167924af47bb36da3bdc427fa957330eba7e4a7255621ec6a36` | `657d257043459623addc23baedd24d261bd51e9114aa7fb6ddf1a97b6d902083` |
| `proposal.md` | `38b77894bed3a8c95a1abaff38f9e7a1276f28acd98eeeb965eac386b19a44bb` | `a4f273351b2a228c15e9210005423a76442303348f62e749b9cf3a7c13ff2eee` |

[Observed] These digests and the three patch digests all equal `PROPOSED-SUBJECTS.json`. No check reads that file (Finding 7).

## Summary

- [Observed] The tooling works, and the v1.4 peel holds on real bytes.
- [Observed] The delta's blocks match the patches, with one disclosed difference: blank lines are not kept.
- [Inferred] The judgement rule and the three owner bounds hold.
- [Inferred] The reason for REVISE is the `†` legend sentence that the round 4 repair introduced. It states something false about the most common redaction case, and it calls a citation's span "verified".
- [Observed] A mixed block's count has no test of any form.
- [Observed] REQ-035 has no new scenario, and two of its old scenarios now conflict with its text.

## Findings

**Finding 1 — The mandated `†` legend sentence is false and overclaims "verified"** (blocking)

- Anchor: L247, criteria 3, 4 and 6.
- Spec text: "`†` with a number counts lines screening withheld from the verified span beside it."
- Failing clause, RFC7-34: "visual encodings are legended and mean exactly what the legend says (VIS-7)". RFC5-17 is also engaged: "a claim over the **surviving content** may still stand ... with the redaction count disclosed on the claim".
- [Observed] Installed behaviour differs from the sentence. `dossier-site.ts:470` reads "N lines of that file are withheld by screening", and `:266` reads "line(s) of this file withheld". The count is per file and sits on a citation.
- [Observed] Questionnaire item 3 keeps that render: "Keep it as is. You read a render with `†N`".
- Concrete failure: a block cites lines 1 to 5 of a retained file whose line 40 is redacted. No line of its range is redacted, so under L245 the span is not withheld and the block stands.
  - If the mark keeps its current meaning, the legend tells the reader that a line was withheld from this span. None was.
  - If an implementer instead takes the legend literally, the count is zero and the mark goes. The RFC5-17 count on that claim then disappears, and the owner's item 3 choice is undone.
- [Inferred] The sentence describes an empty set. L245 makes any quotation or excerpt whose range touches a redacted line "render as an excluded blob's does", so no verified span can lose a line.
- "Verified" also overclaims. A citation on an Inferred block is not verified. Only a quotation or excerpt is, and the delta itself says "No verified count grows".
- [Observed] `†` occurs once in the three subjects, at L247. No scenario or falsifier tests it. The design's legend list (design.md, "Reading view and evidence view") omits it.
- Repair: say what it counts, for example "`†` with a number on a citation counts lines of that file screening withheld". Name it in the design's list and in one scenario or falsifier.

**Finding 2 — A mixed block's withheld count has no scenario and no falsifier** (revise)

- Anchor: L245, criterion 3, CC-SPEC-4.
- CC-SPEC-4 requires "concrete falsifying evidence". L245 says a mixed block "states the count of its withheld spans in its evidence view and machine form".
- [Observed] A sweep of the proposed spec for "both admitted", "mixed" and "withheld spans" finds this sentence at L245 and a generic Case phrase at L433, and no scenario.
  - The L437 falsifier "omits its count" is about "a withheld item", which a mixed block is not.
  - The evidence-view line is about "a distinction RFC7-33 lists". A withheld count is not on that list.
- Concrete failure: a renderer that drops the count from mixed blocks passes every scenario and falsifier.
- This is the count that the packet's fourth ruling asks the owner to accept as discharging RFC5-17's "disclosed on the claim". A ruling the tests cannot hold has no force.
- The same gap holds for "its citation mark names no secret-matching path" in the mixed case, except through the generic "a secret-matching path is named".

**Finding 3 — REQ-035 gained rules and no scenario, and two old scenarios now disagree with it** (revise)

- Anchor: L454, L484 to L489, L502 to L506, criterion 3.
- [Observed] The delta adds no scenario under REQ-035.
- These changes appear in REQ-035's falsifier only:
  - refusing `withheld` on any other entry;
  - refusing `advisory` on a block that cites;
  - a withheld entry not blocking readiness;
  - the evidence view in the rendered-design packet.
- [Observed] The six new rendered-design criteria appear in no scenario and no falsifier. The packet's byte oracle could catch them only if the fixture carries them.
- [Inferred] Two scenarios conflict with the requirement as written:
  - "Verdict incomplete or inconsistent" says a verdict that "omits the accuracy of an inventory entry" fails validation. L454 says `withheld` "is no accuracy judgment" and must count.
  - "Inventory omission blocks readiness" is unqualified, yet L454 displaces omission for a withheld entry.
- A fixture written from those scenarios fails a conforming verdict.
- Repair: carve both scenarios and add one REQ-035 scenario for the `withheld` and `advisory` forms.

**Finding 4 — "code-only no-read exception" survives beside its extension** (note, editorial)

- Anchor: L241, L253.
- [Observed] L241 extends the exception to "any citation of a claim block, understanding item, diagram element or inventory entry". L253 still says "including its code-only no-read exception". L241's own head still says "the one exception".
- [Inferred] L253 concerns excerpts, so the behaviour is not at risk. The sentence is false, though.

**Finding 5 — The ledger's head is false at this commit** (note, editorial)

- Anchor: `IMPACT-LEDGER.md` lines 3 to 6.
- It says: "Version 1.4 is selected by the owner but not yet recorded or installed, so the version 1.5 builder, recorder row and tag cannot exist until it is."
- [Observed] Against that:
  - `POLARIS-DOSSIER-LOCAL-AGENT-MODE-SIGNOFF-v1.4.md` exists;
  - the v1.4 builder reports "(applied)";
  - the v1.5 builder and recorder row are in this commit;
  - the packet names the builder.

**Finding 6 — Readings and reaches the delta does not put to the test** (note, for the owner)

- REQ-002: L454 has the fidelity verdict judge an uncited judgement "on one question". [Inferred] That means REQ-002's "an Inferred label alone SHALL NOT make speculation eligible" and "Source-supported inference SHALL expose its admitted premises" are not judged on that block. The ledger's list of parents read or displaced omits 002, though the spec's head says it displaces "only" named text.
- Doctrine: trust-and-evidence.md says "Inferences may be woven into explanatory narrative but must never be indistinguishable from deterministic fact." [Inferred] The reading view meets this through the mark, the legend and set-off quotations. The delta's readings do not cite the sentence.
- Rulings carried by a signature:
  - RFC7-13 itself admits an owner ruling. RFC7-20's "visually distinct" and RFC5-17's "on the claim" do not. I report both as readings that change a clause's effect, and do not resolve them, in line with the owner's 2026-10-05 instruction on RFC7-20.
  - [Inferred] The packet discloses all of them honestly.
  - [Inferred] The sign-off record would hold the owner's selection quote, so the offered option should name the four rulings.
- Warrant: [Unknown] The ledger says of the reading view's cost "The owner chose this". Neither named direction mentions the reading view. They point to epic `syzygy-pdja`, and `.beads/` is not in this clone, so I could not check it.

**Finding 7 — Smaller gaps in tests and tooling** (note, editorial)

- The evidence-view control: L247 requires "a control that works with scripts off", but no scenario or falsifier tests reaching it, by keyboard or otherwise (RFC7-34, "Reachability"). An orphaned evidence view would pass.
- Inventory vacuity: L245's "An inventory entry all of whose cited spans are withheld" is vacuously true of an entry with no citations. The scenario says "at least one span", and the requirement does not. [Unknown] Whether an inventory entry may cite nothing.
- Definition: L245 opens with "classification or screening excludes", then defines withheld as "excluded whole by path or body screening". [Inferred] A citing-only block over a blob only classification excluded could read as not withheld, with no lawful verdict entry.
- "Any glossary term drawn from it": [Inferred] nothing says how a machine knows this unless the term cites, so it is a review call written as a rule.
- Stale design text: design.md's `render` row still says "disclosure block on every page, including the reported commands". Round 3 chose to leave decision 10 standing, but this row misleads an implementer.
- Tooling: [Observed] after install and a v1.5 record, editing `design.md` outside the hunks or changing a digest in `PROPOSED-SUBJECTS.json` still returns OK from `--check`. Only the spec is byte-bound, which the builder's docstring states. No script reads `PROPOSED-SUBJECTS.json`.

## Criteria

1. **Contract readings.** [Inferred] They hold as readings. Every quotation below matches the clause:
   - RFC7-2: "a span of narrative content asserting a fact about the project".
   - RFC7-9: "Every load-bearing claim".
   - trust-and-evidence.md: "Missing evidence never makes a claim Inferred."
   - RFC5-17: both limbs.
   - RFC2-23: "nothing derived from excluded content in any surface, label, or endpoint".
   - RFC7-13: "unless the owner rules otherwise".
   - RFC7-20: "visually distinct", and the ruling's condition "the run record and page disclose how the draft was computed".
   - REQ-003's sentence and scenario title, and REQ-006's "draft-to-source support".
2. **Weakening.** [Inferred] Nothing is silently weakened except RFC7-34 through Finding 1. RFC7-20 and RFC5-17 are disclosed rulings (Finding 6).
3. **Requirements and scenarios.** Not met: Findings 1, 2 and 3. Voice rules and design criteria are correctly left to review, not written as checks.
4. **Design and proposal.** [Observed] They agree except for the `†` list and the `render` row. [Inferred] The proposal overstates nothing material.
5. **Delta and bounds.**
   - [Observed] A script found all 22 blocks in the bytes, with blank lines normalised, and replaying them reproduces `design.md` and `proposal.md`. For `spec.md`, the only residual is the added scenario block.
   - [Observed] Blocks drop interior blank lines, so "copied by script" is exact only up to that.
   - [Inferred] All three owner bounds are enforceable:
     - count: L245, L313, and L437's "omits its count";
     - resolving citation: L241, L314;
     - never verified: L245, L313, L454, L538.
6. **Markings.** [Inferred] Clipped DOM text, machine attributes and the evidence view recover every RFC7-33 distinction without colour, pointer or scripts, except the `†` meaning (Finding 1) and the untested control (Finding 7). The `hidden` and `display:none` ban and the `innerText` and `textContent` test are sound.

## Tooling

- [Observed] `--check` results at this commit:
  - v1.5 reports "OK ... (unapplied)", rc 0;
  - v1.4 reports "OK ... (applied)", rc 0;
  - v1.0 through v1.3 report OK.
- [Observed] `--selftest` results: v1.5 and v1.4 each ran 26 fixtures with 0 failing. The recorder ran 172 with 0 failing.
- [Observed] `check_governance.py` gives 32 OK, 21 WARN, 0 FAIL.
- [Observed] The recorder's `--check` for `polaris-dossier-local-agent-mode` at version 1.5 reports "not performed".
- [Observed] Real-bytes run in a scratch copy, since removed:
  - `apply` returned 0, and the applied spec hashes to the manifest digest.
  - With no v1.5 record, all six builders fail with "the tree carries the v1.5 patches, which no sign-off record covers". That is the intended peel behaviour.
  - With a v1.5 record binding the spec digest, all six pass.
  - After the dependency-union write and `check_spec_reconciliation.py --regenerate`, reconciliation passes 7 of 7. The status page reads 36 requirements and 267 scenarios.
- [Observed] The recorder row binds the v1.5 `subject_bytes`, the installed spec with the patch applied, and the record reads the review digest as expected. The selftest battery leaves out the v1.2 builder, but the real-bytes run covered it.
- [Observed] The frozen clone stayed clean, with 0 `git status` entries, at the reviewed commit. No observed repository body or run output was read, and no provider call was made.

## Prior rounds

I opened these only after forming the findings above.

- [Observed] Round 4's B1, N2, N5 and N6 appear closed in the bytes.
- [Observed] Round 4's N8 asked that `†` have a sentence, and that repair is what introduced Finding 1. The presence is closed; the wording is wrong.
- [Observed] Round 4 noted the L460 stumble and left it. Finding 3 is a related but distinct conflict, in scenarios rather than prose.
- [Inferred] Findings 2 and 3 are not named in the round 1 to 4 dispositions.
- CC-REV-4 applies here: "Two failed review rounds signal upstream ambiguity". [Inferred] This round's blocker is a one-clause wording error from the last repair, not ambiguity in the owner's direction.
