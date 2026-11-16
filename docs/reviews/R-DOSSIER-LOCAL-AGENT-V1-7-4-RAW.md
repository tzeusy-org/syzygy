Polaris dossier local-agent mode v1.7 — round 4 fresh-context review (CC-REV-2)
Reviewed commit: 7d6b64856bee80b6ea592a7561520df84f4ca0f2
Manifest SHA-256: e53278da640b32796983ec9e2bb60ca690d9e8ead728a582c04c59505d07a901
Verdict: REVISE
Package: polaris-dossier-local-agent-mode

Proposed-spec line numbers below refer to the reconstructed bytes (the Manifest digest above). Design.md line numbers refer to the reconstructed design.md.

## What I did and read

- **Reconstruction.** [Observed] I copied the installed v1.6 `spec.md`, `design.md` and `proposal.md` from `openspec/changes/polaris-dossier-local-agent-mode/` into a scratch directory and applied the three `proposed/*.patch` files there with `patch`. The review worktree stayed clean (`git status --short` empty).
  - spec.md: `e53278da640b32796983ec9e2bb60ca690d9e8ead728a582c04c59505d07a901`
  - design.md: `209fda2dc7bac4a457ae88f58eb5b342e1127dc161a55d683d45d6ca285e3295`
  - proposal.md: `e06e748f3533bbf73fbf7ba65c166fa90f6ff234d5844442455e28a22e73ae25`
  - All three equal the `proposed_sha256` values in `PROPOSED-SUBJECTS.json`, and the installed bytes equal its `current_sha256` values. The three patch digests equal its `patch_sha256` values.
- **Scripts.**
  - `python3 scripts/build_polaris_dossier_local_agent_mode_v1_7.py --check` printed `OK: the v1.7 package verifies (unapplied)`, exit 0.
  - Its `--selftest` printed `PASS …` lines ending `36 fixtures, 0 failing`. I did not capture its exit status on its own; the compound command it ran in exited 0.
  - `python3 scripts/check_governance.py` printed `32 OK, 21 WARN, 0 FAIL (53 checks) — counts derived, not asserted`, exit 0.
  - `--print-affected-ids` output equals the affected-ids list (REQ-033: 3 scenarios changed; REQ-034: 2 changed, 12 added; REQ-035: 2 changed, 2 added; REQ-036 unchanged).
- **What changed since round 3.** [Observed] I applied the round-3 commit's (`3ca5c68e…`) patch to the same v1.6 bytes, reproduced round 3's digest `58997d30…`, and diffed the two proposed specs. Exactly five lines differ: line 23 (REQ-033 refusal, F1), line 255 (walk note ranges, F2), lines 497 and 499 (scenario "Annotated code walk", F2), line 513 (REQ-034 warrants, F3). design.md and proposal.md patches are unchanged since round 3. In the package, IMPACT-LEDGER.md, SEMANTIC-DELTA.md, PROPOSED-SUBJECTS.json and the spec patch changed, and ROUND-3-DISPOSITIONS.md and REVIEW-BRIEF-ROUND-4.md were added.
- **Read:**
  - AGENTS.md; REVIEW-BRIEF-ROUND-4.md; ROUND-3-DISPOSITIONS.md; the round-3 raw in full.
  - SEMANTIC-DELTA.md: P1 (b) to (e), P5, "Contract readings the review must test", and every clause block the repair touched (P1b-2, P5-2, W34, S34). The diff of the whole file against round 3.
  - The proposed REQ-033 limits paragraph and its scenarios "Zero repair and question limits accepted" and "Syzygy's own limits enforced"; REQ-034's counting paragraph (line 245), the walk paragraph (255), scenarios "Repair loop counted", "Design repairs drawn from their own limit" and "Annotated code walk", its Case, Falsifier and warrants; the REQ-035 paragraphs at lines 522 to 530 for how review rounds are numbered.
  - IMPACT-LEDGER.md (its diff against round 3), OWNER-SIGNOFF.md lines 40 to 80, proposed design.md lines 560 to 600.
  - RFC7-12 in `.syzygy/governance/contracts/rfcs/RFC-0007/narrative-contract.md` (line 297).
  - `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`, item `fnry19-round4`.
  - `scripts/build_polaris_dependency_unions.py` (lines 52 to 110 and its argument parser).
  - Product code: `packages/polaris-dossier/src/check.ts` lines 140 to 180 and 249, and the `maxRepairCycles` call sites in `polaris.ts`, `brief.ts`, `inventory.ts` and `review-packet.ts`.
- **Not read in full this round:** the doctrine files (VIS-1 to 4), the CC-REV and CC-SPEC clauses, RFC7-2, 10, 13, 33 and 34, the pursuit page, the 2026-11-05 answers, R-DOSSIER-LOCAL-AGENT-V1-6-7, and the v1.7 round-1 and round-2 raws. Those govern parts of the package that did not change since round 3, where I rely on round 3's tests (its Finding 9) and checked only that the bytes it tested are unchanged (the five-line diff above). I read no observed repository body or run output, ran no provider call or dossier run, and ran nothing that asks for consent.
- **Independent checks.**
  - [Observed] A line diff (Python `difflib`) of the v1.6 and proposed specs touches 27 v1.6 lines (3, 23, 25, 67, 73, 75, 85, 215, 245, 247, 249, 255, 280, 379, 439 to 441, 443, 449, 458, 460, 523, 553, 576 to 578, 580), as ROUND-3-DISPOSITIONS.md says. Scenario headings go from 80 to 92.
  - [Observed] Clause blocks: 41 headings of the form "### <id> — `<file>`" in SEMANTIC-DELTA.md, as the dispositions say, W34 among them.
  - [Observed] Change boundary, by my own method: every double-quoted string of 12 or more characters (straight or curly quotes, whitespace-normalised) in the launch-consent spec and the one-command-run proposed spec that occurs in v1.6 also occurs in the proposed spec. Launch-consent: 3 strings, 2 in v1.6, 0 missing. One-command-run: 19 strings, 11 in v1.6, 0 missing. (My extractor differs from round 3's, so the populations differ; the result agrees.) `git diff` of `openspec/` between the branch's merge base with `origin/main` and the frozen commit is empty.
  - [Observed] Dependency union: in a scratch copy of `scripts/`, `openspec/` and `.syzygy/governance/decisions/`, `build_polaris_dependency_unions.py --render polaris-dossier-local-agent-mode` over the installed v1.6 spec reproduces the installed `GOVERNING-DEPENDENCIES.md` byte for byte. Over the proposed spec it differs in exactly one line, the `contracts` union, which gains RFC7-12 (16 clauses to 17).

## Repairs of round-3 Findings 1 to 3

- **F1 (REQ-033's refusal keyed to "counts against").** [Observed] Line 23 now reads "it SHALL refuse a check or review check beyond the repair-cycle limit, other than the check of a design-repair revision (REQ-polaris-generation-034), which it SHALL refuse beyond the design-repair limit and never because the repair-cycle limit is spent". Inventory checks are again under v1.6's unscoped sentence, which closes the gap round 3 named for them; `check.ts` 172-175 compares each stream's own next revision number with `maxRepairCycles`, as the disposition says. The repair restores v1.6's undefined measure of "beyond", though, and that measure now decides cases v1.6 never had: Finding 1.
- **F2 (walk note ranges).** Repaired in the spec (line 255 and the scenario, lines 497 and 499): a note's range is "an inclusive line range in the cited blob's own line numbers, lying within the excerpt's cited line range". One reading is left, and it is testable. Wording residues outside the clause: Finding 2.
- **F3 (RFC7-12 in REQ-034's warrants).** Repaired as the owner directed (answer B): line 513 adds RFC7-12. Clause block W34, contract reading 2 and the ledger say so. The one-line effect on `GOVERNING-DEPENDENCIES.md` is confirmed above.

## Findings

**Finding 1 — The restored "beyond the repair-cycle limit" has no stated measure, and with design-repair revisions its readings decide whether a design repair can be reviewed and when a repair-cycle check is refused** (revise)
Criteria 3, 4, 6.
- Anchor: proposed spec line 23 ("it SHALL refuse a check or review check beyond the repair-cycle limit, other than the check of a design-repair revision (REQ-polaris-generation-034), which it SHALL refuse beyond the design-repair limit and never because the repair-cycle limit is spent"). Line 245 ("Syzygy SHALL refuse a resubmission's check when the revisions already counted against its limit equal that limit"). Scenario "Design repairs drawn from their own limit", lines 443 to 445 ("the agent resubmits after the repair-cycle limit is spent"). REQ-034 Falsifier, line 507 ("a design-repair revision is refused while the design-repair limit is unspent"). SEMANTIC-DELTA.md lines 163 to 167 and 205 to 207 ("Inventory and review checks stay under REQ-033's v1.6 refusal beyond the repair-cycle limit, unchanged").
- [Observed] No sentence of the proposed spec says how a check or a review check is measured against the repair-cycle limit, apart from REQ-034's count of draft resubmissions. REQ-035 numbers review packets as rounds per session directory (line 530: "the next numbered round"), with no tie to either limit. `check.ts` 173 measures by the stream's revision number (`revision > declared.maxRepairCycles`), which equals the repair-cycle count only when every revision counts against that limit. Review checks are not limited in code at all.
- (a) Review checks of a design-repair revision. [Inferred] The carve-out names only "the check of a design-repair revision". Its review checks are not carved out, so they fall under "a … review check beyond the repair-cycle limit". A resubmission "retires earlier check results and dependent review evidence" (line 245), so a design-repair revision needs a new fidelity verdict and a new rendered-design verdict before close can end "closed" (line 528). In the scenario at lines 443 to 445 those review checks run after the repair-cycle limit is spent. If "beyond" is read as "once the limit is spent", or by a review stream's own round count as `check.ts` counts a check stream, those review checks are refused. Then a design-repair revision made after the repair-cycle limit is spent can never be reviewed. With a repair-cycle limit of 0 the design-repair limit is never usable. If "beyond" is read as "a review of a revision that counted past the repair-cycle limit", they are not refused. The two readings decide opposite outcomes for the case P1 (b) exists for.
- (b) Repair-cycle checks after a design-repair revision. [Inferred] Read by stream position, as v1.6's text and `check.ts` measure it, REQ-033 refuses a repair-cycle resubmission earlier than REQ-034 allows once any design-repair revision sits earlier in the stream. Example with a repair-cycle limit of 2: revision 1 is a design repair; revisions 2 and 3 count against the repair-cycle limit. At revision 3's check one revision has counted against that limit, so line 245 allows it, while revision 3 is the third resubmission and "beyond" a limit of 2 by position. Read by line 245's count, the two sentences agree. Round 3's wording ("a check or review check that counts against the repair-cycle limit … beyond that limit") tied the draft case to REQ-034's count; the repair removed that tie.
- Neither case weakens a rule: both readings refuse more, never less. But criterion 3 asks for a rule that leaves no case open. The delta asserts review checks are "unchanged", while their position in the run is new, so the drafter's own account does not decide them either. No scenario or falsifier disjunct tests a review check of a design-repair revision.
- A repair, one sentence either way. Make REQ-033 measure a draft check by REQ-034's count ("beyond the repair-cycle limit as REQ-polaris-generation-034 counts it"). Extend the carve-out to "the check of a design-repair revision and a review check of that revision or of pages rendered from it", or say what a review check counts against. Add a matching disjunct to the REQ-034 Falsifier. This touches only the sentence F1's repair rewrote.

**Finding 2 — F2's numbering base did not reach design.md or the REQ-034 falsifier** (note, editorial)
Criteria 6, 7.
- Anchor: proposed design.md line 592 ("each note is a claim block placed by a line range of the excerpt"). REQ-034 Falsifier, line 507 ("a note whose line range is malformed, reversed or outside its excerpt, passes"). SEMANTIC-DELTA.md P5, line 306 ("outside the excerpt").
- [Observed] The clause and the scenario now say "in the cited blob's own line numbers" and "outside the excerpt's cited line range". The three other places keep the round-3 wording.
- [Inferred] None of them contradicts the clause, and the clause governs. design.md's "a line range of the excerpt" is the phrase round 3 found readable either way, so a reader of design.md alone may still take excerpt-relative numbering. The design.md patch is unchanged since round 3, so this is carried, not introduced.

**Finding 3 — The owner page does not mention the warrants change** (note, for the owner)
Criterion 7.
- Anchor: OWNER-SIGNOFF.md lines 77 to 78 ("It changes no RFC 0007 clause. It reads RFC7-12 as allowing a mechanically cleaned quotation …"). IMPACT-LEDGER.md (its REQ-034 row and the install paragraph).
- [Observed] The ledger, the delta and the dispositions all say REQ-034's warrants gain RFC7-12 and that `GOVERNING-DEPENDENCIES.md` changes at install. OWNER-SIGNOFF.md says neither.
- [Inferred] Its sentences remain true: no RFC 0007 clause changes, and the owner chose the warrant addition. A sign-off reader might still want the one-line install effect on the page they sign from. No attribution to the owner is wrong.

**Finding 4 — Carried notes and owner items, restated** (note, for the owner)
- Anchor: ROUND-3-DISPOSITIONS.md, rows 4 to 8. `OWNER-DIRECTION-QUESTIONNAIRE-ANSWERS-2026-11-15.md`, item `fnry19-round4`.
- [Observed] Round-3 notes 4, 5, 7 and 8 are unchanged in the bytes, as the owner directed. Close's Observed labels still lack a named method, the region's machine form is still unstated, "show no text" still leaves presentation open, and the v5 wording points stand.
- [Observed] Round-3 Finding 6 is unchanged and is not accepted. "Every quotation" is narrowed to exclude code excerpts, and the RFC7-20 legend is in a closed `details` element. Both return to the owner with any sign-off offer, through SEMANTIC-DELTA.md "For the owner", item 2.
- [Inferred] I found nothing in the repairs that makes the package contradict itself or a governing clause on these points.

**Finding 5 — Items tested that hold** (note)
- Change boundary. No byte of the one-command-run candidate or the launch-consent change is amended, and no quoted sentence they share with v1.6 is broken, by the sweep above.
- F2 and F3 are repaired as the dispositions say. F1 is repaired for inventory checks, the case round 3 named.
- The affected-ids block equals `--print-affected-ids`. The 41 clause blocks and the 92 scenario headings match. The 27 touched v1.6 lines match the disposition.
- RFC7-12 is material to REQ-034's display rule. Its text ("the operative text a reader relies on is the owned artifact's verbatim text, never a paraphrase in normative position") is the clause contract reading 2 tests. Naming it satisfies CC-SPEC-2's "Every requirement names all material governing warrants", as round 3 quoted it.
- I found no reading under which RFC7-10 or RFC7-12 needs a text change, so the bead's stop condition is not met. Whether the normalised reading view is "a paraphrase in normative position" remains the owner's reading (Finding 4).
- `check_governance.py` and the package builder's `--check` and `--selftest` pass at the frozen commit.
