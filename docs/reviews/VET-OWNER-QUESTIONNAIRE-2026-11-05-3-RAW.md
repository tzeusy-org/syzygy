## Round-3 adversarial review: mcs4, mea.9 and zwja.1

Basis: everything was read-only at `540c2cdd` (origin/main, the same as local HEAD). I used the beads, the findings log, `8c1832ca`'s SEMANTIC-DELTA, both specs, the cited source lines, and run 3 metadata only: citation paths and ids, check finding kinds, `excludedContent` ids, packet span outcome/path/citedBy, verdict row-state counts, and `steps.jsonl`. I read no statement, span, quotation or body text, no Redis file and no rendered page. No files were edited.

### 1. `syzygy-mcs4`

**Claims I confirmed [Observed]:**
- **Revision 0 citations:** 34 of 180 cite `redis.conf`, across 30 objects, and 18 of those cite only it.
- **Check marking:** 12 blocks are marked `excludedContent`, and all of them resolve to `redis.conf`.
- **Revisions 1 to 3:** revision 1 re-sources every one except `to-7`. In revision 3, `to-7` cites `redis.conf` twice plus `src/server.h`, carries no quotation, and gets "supported" in verdicts 0, 1 and 2. Revision 3's `excludedContent` is empty.
- **Withheld spans in run 3:** each fidelity packet withholds exactly 2 spans, both `redis.conf` and both cited by the draft.
- **Installed policy:** run 3's check records the v5-bcd version, so v5 is installed. `config-secret-directive` appears in no file at `540c2cdd`.
- **Draft history:** `8c1832ca` is in main's history and was reverted by `cc875a96`.
- **Draft content:** the detector list, the five residuals, whole-code-body withholding and pre-v5 span figures all match SEMANTIC-DELTA "P and X" (lines 306-444).
- **Bead facts:** the 6f1r "owner-requested" note is quoted correctly, and the bead is P1.

**Counterexamples and errors:**
- **[Observed, material]** "among them every trade-off block" is false. The trade-offs section has 15 top-level blocks. Only `to-1`…`to-10` cite `redis.conf` and were marked. `to-11`…`to-14` cite MANIFESTO and `to-15` cites README.md. The correct figure is 10 of 15 trade-off blocks, plus `ad-10` and `ad-13`. This is the headline fact behind the cost argument.
- **[Observed, non-material]** "Variant X … two of them cited once in revision 0" is wrong. Only `src/commands/README.md` is cited (once). The other single citation is `src/commands.def`, which X explicitly does not place. X is excluded from the item anyway.
- **[Observed]** The round-2 correction "C's trigger made measurable" was not fully made. "cites withheld files heavily" sets no threshold.

**Omitted option [Inferred, material]:** a detector-only v6. A lists "the detector also hardens `TLS.md`" as a pro, which admits that signed v5 lets `requirepass <value>` lines in `TLS.md` reach the reviewer. Run 3's revision 3 cites `TLS.md` 12 times. A pure tightening, with the detector and no `redis.conf` placement, is a distinct real choice that also needs an owner act. The packet bundles it with the loosening, so an owner who wants the hardening but not the placement has no option. It could be a sub-option of A ("A, or A's detector alone") to stay within four options.

**On A's merits [Inferred]:** the change from C to A is defensible.
- `redis.conf` is the only file run 3 withheld.
- The placement is pinned to one public commit.
- `run.json` declares the audience as "Operators and integrators deploying or building on Redis", for whom this file is the configuration reference. The packet could cite this; it strengthens A.

A's caveats are fairly stated: five residuals, and code bodies withheld whole. The Unknown on lost content is acceptable because A is reversible until the policy act. "had to source them elsewhere" is right as an inference: a withheld-only block cannot be marked supported, and `review-verdict.ts:24` then blocks readiness. Note that the excluded blocks were not check findings; rev1's cycle was spent on 4 unrelated findings.

**Scope [Inferred]:** asking the owner is a genuine gate. It concerns security posture, the owner chose B+C+D excluding P, and the revert names the placement as a "later follow-on". The scope is correctly bounded and current.

- **Scope verdict:** Pass. Genuine security-posture gate. It is deduplicated against 6f1r and X, the facts are current to run 3, and no authority leaks: drafting and review only, binding needs the policy act.
- **Recommendation verdict:** Revise. The direction A is reasonable, but the detector-only tightening is a missing real option, and the decisive cost fact ("every trade-off block") is wrong.
- **Material corrections:**
  1. Replace "every trade-off block" with "10 of the 15 trade-off blocks (to-1–to-10) and two advantage blocks".
  2. Add a detector-only (tightening) option, or an A-variant, with its pro (closes the `TLS.md` residual under v5 with no loosening) and its con (another act; `redis.conf` stays withheld).
  3. Give C a numeric trigger, for example "revision 0 has ≥ N citations or ≥ N blocks citing only withheld files".
- **Non-material:**
  - X's "two cited once" should read "one".
  - Consider citing the operator audience in `run.json` as a pro for A.
  - 6f1r's title and notes are stale (v4/v5 have since landed). Fine as cited.
- **Evidence freshness:** `540c2cdd`, `8c1832ca`, run 3 metadata read 2026-11-05. Not inspected: run 3 statements and pages, the provenance of 6f1r's owner request, the number of Redis code bodies the detector would withhold (Unknown, and a run is needed to measure it), and the live tracker after this read.

### 2. `syzygy-mea.9`

**Claims I confirmed [Observed]:**
- **Code lines:**
  - `check-model.ts:63-65` contains the quoted text. It is a doc comment; the enforcement is `review-verdict.ts:19-24`, where any non-"supported" block and any unresolved inventory row blocks readiness.
  - `census.ts:167` "Never leave out…" is exact.
  - `inventory.ts:144` is the coverage self-report slot.
- **Spec:** REQ-034 is at spec line 243.
- **Run 2:** 2 of 8 blockers came from all-withheld inventory rows (findings log lines 99-102).
- **Run 3 inventory:** 0 `redis.conf` citations in inventory revisions 0, 1 and 2. Verdict 0's two unresolved rows cite no withheld span.
- **Brief unchanged:** `census.ts` and `inventory.ts` have no diff between `2b8d01ac` and `4153bc75`. `polaris.ts` did change: inventory self-check guidance and routing.
- **Removed mea.6 overlap:** removing it was correct. mea.6 targets the adjacent "names every cited file" sentence, not line 167.

**Defects:**
- **[Observed, material]** D's trigger has, on the packet's own evidence, arguably already fired. The decision was widened to "inventory row or draft block". The trigger is "when any run … revision 0 carries rows citing only withheld files". Run 3's draft revision 0 carried 18 objects citing only `redis.conf`, 12 of them claim blocks (`ad-10`, `ad-13`, `to-1`…`to-10`). So either "rows" means inventory rows only, which the text does not say and which contradicts the widened scope, or the hold's condition was met before the packet was written. The rationale "the one blocking instance (run 2) did not recur" counts only blocking inventory rows. It ignores that the draft-side case recurred and was avoided by the silent re-sourcing that D's own con names.
- **[Inferred, material]** "Item 1's A would remove the Redis case" depends on the owner choosing mcs4 A and later signing a policy act. The packet should state that dependency: D is weaker if mcs4 is C or D, and E is a cross-repository question either way.

**Options and REQ-035 [Inferred]:** the options are otherwise complete and distinct. A divergent, B consistent, C a brief route with an honest Inferred omission, and D hold is the legitimate set. The 2026-11-03 direction calls E "a REQ-035 spec change"; the packet should name REQ-035 where it describes the A/B delta. That is non-material.

- **Scope verdict:** Pass. A genuine spec and readiness gate, correctly widened to both sides, deduplicated (the mea.6 removal is right), current.
- **Recommendation verdict:** Revise. D's trigger is ambiguous and, read against the widened scope, already met by run 3's draft revision 0. The "did not recur" rationale omits that, and the coupling to mcs4 A is left unstated.
- **Material corrections:**
  1. Make the trigger exact. Name the subject (inventory rows, draft blocks, or both) and the metric (for example "a fidelity verdict row not accurate or not supported whose packet spans are all withheld", or "revision 0 has ≥ N blocks citing only withheld files"). Then say whether run 3's 12 withheld-only draft blocks in revision 0 meet it. If they do, either recommend B or argue why the hold stands anyway.
  2. State that D's rationale depends on mcs4 A plus a policy act, and how the recommendation changes if mcs4 is C or D.
- **Non-material:**
  - Cite `review-verdict.ts:19-24` as the enforcing line beside the doc comment.
  - Name REQ-035 as the target of the A/B delta.
  - "softens only one case": REQ-034 also gives code excerpts on excluded blobs Unknown, and it is the *block* that renders Unknown.
  - Option C edits the same `censusSection` as mea.6.
- **Evidence freshness:** `540c2cdd`; run 3 metadata and findings log read 2026-11-05. Not inspected: verdict reason text, run 3 statements and pages, run 2 artifacts directly (findings log and bead only), and live bead state after this read.

### 3. `syzygy-zwja.1`

**Claims I confirmed [Observed]:**
- **Counting rule:** `check.ts:170` refuses when `revision > maxRepairCycles`, so revision 0 is not a cycle.
- **Run 2:** rev1 and rev3 repaired check failures and rev2 answered verdict 2 (findings log lines 90-92 and the zwja.1 comment).
- **Run 3** (from `steps.jsonl`): rev0 had 4 findings, then rev1 passed as a check repair. rev2 and rev3 followed verdicts 0 and 1, so 3 of 6 cycles were used, one on a check failure. The findings log's "4 of 6" (line 209) counts checked revisions.
- **Limit default and recording:**
  - The local-agent spec's line 23 says "there is no default".
  - The one-command candidate's spec line 9 takes absent limits "from one question the command asks".
  - `polaris.ts:61` sets `DEFAULT_REPAIR_CYCLES = 6`.
  - `run.json` records `maxRepairCycles` 6 with `declaredBy: operator`.
  - `syzygy-1z8m.7` is open with matching text.
- **Self-check line:** `polaris.ts:330` is `AUTHOR_SELF_CHECK`.
- **Candidate state:** `d3eb5cdb` is on main and fl2g is open, so a later delta retires its reviews (rule 10).
- **Round-2 corrections:** all five were made and are correct.

**Gap [Observed, non-material]:** the same counting rule applies to inventory revisions (`check.ts:170` handles the inventory noun). Run 3's inventory used 2 cycles, one repairing 8 check findings. The decision text covers only draft resubmissions. Under C nothing changes. Under A, B or D the delta should say whether inventory revisions are covered, or the two sides diverge.

**Recommendation [Inferred]:** C is well grounded. It has the least churn, keeps the fl2g reviews, and run 3 used half the limit. The re-ask trigger is measurable from `steps.jsonl`. B is correctly named as the best-bounded change, and the dependency on 1z8m.7 is disclosed. The options cover the space; "count fidelity rounds" is effectively A. No authority leaks.

- **Scope verdict:** Pass. A genuine spec gate, one decision, correctly placed in the unsigned candidate, with the dependencies (fl2g, 1z8m.7) stated.
- **Recommendation verdict:** Pass. C follows from the evidence, its trigger is measurable, and the alternatives are fairly stated.
- **Material corrections:** None.
- **Non-material:**
  - Note that inventory revisions follow the same counting rule, and say whether A, B or D would include them.
  - A or B would make launched and manual runs count differently (the signed REQ-034 still applies to manual runs); that could be listed as a con.
- **Evidence freshness:** `540c2cdd`; run 3 `steps.jsonl` and `run.json`; findings log lines 90-92 and 208-209; beads read 2026-11-05. Not inspected: GitHub state of PR #709 and fl2g's PR, and any later runs.
