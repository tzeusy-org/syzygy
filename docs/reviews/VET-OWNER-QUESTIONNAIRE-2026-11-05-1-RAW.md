## Adversarial review: syzygy-2026-11-05 packet, items `syzygy-mcs4`, `syzygy-mea.9`, `syzygy-zwja.1`

I worked read-only. I read no Redis body and no span, quotation or statement text. For run 3 I read only metadata: `steps.jsonl` step, outcome and revision fields; the packets' span `outcome`, `path` and `citedBy.subject`; and the verdict row-state counts. I ran no Syzygy, dossier or provider command and mutated nothing.

### Run 3 metadata the packet lacks (bears on all three items)
Run directory: `/home/orca/.local/state/syzygy-dossier/run-4465d22f5ce1829ca49059a5b8451bb0`.
- **[Observed]** Withheld spans in each fidelity packet: 2/174, 2/189 and 2/189. Every one is `unknown-extraction-class` on `redis.conf`. In all three packets `citedBy.subject` is `draft` only, so no inventory row cited a withheld span.
- **[Observed]** Fidelity verdict 0 had `inventoryAccuracy` accurate 44 and unresolved 2 (`choice-tls-ca`, `qual-vector-beta`). Verdicts 1 and 2 had 46 accurate. Verdict 2 was `ready`.
- **[Observed]** Draft check steps: rev0 `findings`, then rev1, rev2 and rev3 `passed`. Inventory check steps: one `refused` (no revision), rev0 `findings`, then rev1 and rev2 `passed`.

---

### 1. `syzygy-mcs4`: admit `redis.conf` (screening v6)
- **Scope verdict: Revise.** It is a legitimate owner gate. P was drafted "beyond the owner's chosen scope" (SEMANTIC-DELTA at `8c1832ca`, lines 306-310), and any placement needs a policy act. But the item is not current and not deduplicated:
  - It leaves run 3's cost of withholding `redis.conf` as [Unknown], yet metadata measures it: 2 withheld spans, both cited by draft blocks, no inventory row. Under REQ-034 those blocks render Unknown with `excluded-content` (local-agent spec line 241).
  - It omits the overlap with `syzygy-6f1r`, a generic config class for `redis.conf` and `modules.yaml`. The mcs4 bead comment of 2026-11-04 03:01 says that overlap must be reconciled.
  - It keeps P1 urgency from run 2 ("top lever", which the bead itself labels [Inferred]). Run 3 has since closed without the file.
- **Recommendation verdict: Revise.**
  - **VIS-2 misread:** VIS-2 (`doctrine/vision.md:133`) says "No evidence means Unknown, not success". It does not favour disclosure over Unknown, and a withheld `redis.conf` rendering Unknown already complies with it. The case for A is reader value, not doctrine.
  - **Cons of A understated:**
    - The packet names only the mid-line residual. The delta's cost table (lines 398-400 and 430-437) also lets these reach the reviewer: `rename-command` secrets, a password in a prose comment, unnamed module password options, and values split across an `include`.
    - A also tightens: a `.tcl` or other code body whose line matches the detector is withheld whole (line 402).
    - A is not just "finish". The draft has to be rebased onto the installed v5 and its span table re-derived; the table is from the 2026-10-14 trial (39 spans), against 2 in run 3 (bead NEXT list).
  - **Missing option:** fold into the 6f1r config-class route rather than a Redis-pinned placement.
  - Given the run 3 data, C (hold with a trigger) is now competitive. The packet must weigh it on the measured 2 spans.
- **Material corrections:**
  1. Replace "[Unknown] whether run 3's dossier is weaker" with the Observed counts above. Keep [Unknown] only for whether the author avoided configuration topics.
  2. Remove the VIS-2 rationale or restate it correctly.
  3. List the full residuals and the code-body tightening in A's cons.
  4. Add the `syzygy-6f1r` overlap, and either an option for it or a dedup statement.
  5. State that `8c1832ca` is reachable from `origin/main` (merged, then reverted by `cc875a96`). The installed policy contains no `config-secret-directive` or `redis.conf` (0 matches), and its SHA-256 `e8a2f4f3…5fe2b` matches the v5 act. "Part of no act" still holds.
  6. Packet line 6 cites findings-log lines 196-216 for the code fixes. Those are at lines 146-166 and 132-136; lines 196-216 only show their effect.
- **Evidence freshness:** `origin/main` 540c2cdd; `origin/agent/screening-redis-conf-followup` = `8c1832ca`; run 3 metadata as above. Not inspected: run 3 site pages and block text, the `syzygy-6f1r` package contents, and GitHub PR state.

### 2. `syzygy-mea.9`: option E (rows citing only withheld files render Unknown)
- **Scope verdict: Pass, with corrections.** It is a genuine gate: a REQ-035 spec change that relaxes readiness is owner-only. It traces to OWNER-DIRECTION-REDIS-SCREENING-NEXT item 3 (lines 59-62 and 82-86), and its run 2 figures match findings-log lines 99-102 and the bead's correction comment. Fixes needed:
  - `census.ts:167` is the inventory brief only (`censusSection`, called from `inventory.ts:140`). The author sees the census through `check` output (`census.ts:21`), so "the briefs" overstates.
  - The same sentence also says "Never leave out something the project states because only a withheld file states it; cite that file." So the brief mandates a row citing only withheld files whenever no admitted source exists. Brief guidance cannot remove the case E targets.
  - Open bead `syzygy-mea.6` ("narrow the inventory-brief visibility sentence") touches the same sentence and is not mentioned.
- **Recommendation verdict: Revise.** B is well supported, and better than the packet says: in run 3, 0 inventory rows cited a withheld span. Three things need fixing:
  1. **Trigger:** "re-ask when a **non-Redis** run blocks" ignores the coupling with item 1. If the owner picks C or D on mcs4, a future Redis run blocked on rows citing only withheld files must also trigger. State the dependency, or drop "non-Redis".
  2. **Omitted pro for A:** REQ-034 already treats a draft block whose quotation rests on an excluded blob as Unknown `excluded-content`, not a repair finding (spec line 241). E would align inventory rows with existing draft treatment. Weigh that against the readiness relaxation. VIS-2 ("Nothing turns green … without current evidence") cuts against readiness passing with unchecked rows.
  3. **Bead state:** say what B does to mea.9. Its acceptance criteria require "follow-on bead filed or this closed as declined", so B needs either an explicit close-with-reopen-condition or a deferral.
- **Material corrections:**
  - Add the run 3 Observed counts (0 inventory rows on withheld spans).
  - Correct "briefs" to the inventory brief.
  - Disclose the "cite that file" mandate and the `mea.6` overlap.
  - Fix the trigger coupling with mcs4.
  - Add the REQ-034 draft-side precedent.
- **Evidence freshness:** `origin/main` 540c2cdd (`census.ts` last changed in 74a2829a); run 3 metadata as above. Not inspected: run 3 verdict reason text, and the 2026-11-03 metadata-script output file.

### 3. `syzygy-zwja.1`: how repair cycles are counted
- **Scope verdict: Revise.** Two factual errors and one conflation:
  - **Run 2 count:** "Run 2 spent 2 of 3 cycles on check-failed drafts" repeats the bead description that the bead's own correction comment (2026-11-04 03:01) retracted. `check.ts:170` refuses when `revision > maxRepairCycles`, so rev0 is not a cycle. Run 2's three cycles were rev1, rev2 and rev3: rev1 and rev3 repaired check failures and only rev2 was review-informed.
  - **Run 3 count:** "Run 3 used 4 of 6, one of them a check-failed draft" is wrong under the same rule. Run 3 used 3 of 6 (rev1-rev3), and one of them (rev1) repaired rev0's check failure. The log's "4" (findings-log line 209) counts checked revisions, not cycles. Inventory used 2 of 6.
  - **Conflation:** "changing a signed sentence while its spec is still under fl2g review" mixes up two changes. The signed sentence is in `polaris-dossier-local-agent-mode` v1.3 (spec line 243, REQ-034 ID at line 249; sign-off record `…SIGNOFF-v1.3.md` exists). fl2g reviews the unsigned `polaris-dossier-one-command-run` candidate, where zwja.1 would put the delta, for launched runs only.
  - **fl2g status:** "[Unknown] whether fl2g's fold-in branch still exists: commit `8afadc55` is not reachable" is misframed. `8afadc55` is indeed absent (`git cat-file` fails). But the REQ-045 fold-in is on main as `d3eb5cdb` (2026-10-20, an ancestor of `origin/main`), and fl2g's notes say round 3 landed in PR #482. fl2g's open remainder is sign-off preparation (coverage, design bar, recorder), not a merge.
  - Evidence citation: lines 205-207 should be 208-209.
- **Recommendation verdict: Revise.** C is defensible: run 3 needed half the cycles, and `AUTHOR_SELF_CHECK` (`polaris.ts:330`) already mitigates. But its rationale has to change:
  - The churn argument is that a delta to the one-command candidate retires fl2g's reviews (rule 10, per the bead comment), not that it changes a signed sentence.
  - C relies on a code default (`DEFAULT_REPAIR_CYCLES = 6`, `polaris.ts:61`) that neither spec states. The signed spec says "there is no default" for configuration (spec line 23), and the one-command candidate names no default. Say so: C's adequacy rests on a prototype choice.
  - **Omitted option:** a bounded, separate allowance for mechanical retries per review round. It answers A's con ("bounded only by deadline and token budget"), unlike A, and is distinct from B. The findings log (line 111) also lists "count fidelity rounds".
- **Material corrections:**
  1. Correct the run 2 framing (2 of 3 cycles repaired check failures; only rev2 was review-informed).
  2. Correct run 3 to 3 of 6 cycles, 1 repairing a check failure.
  3. Separate the signed local-agent v1.3 sentence from the unsigned one-command candidate, and restate the churn reason as fl2g review retirement.
  4. Replace the fl2g [Unknown] with the Observed `d3eb5cdb` fold-in and the remaining sign-off-prep scope.
  5. Note the "no default" tension.
  6. Add the mechanical-retry allowance option.
  7. Fix the line citation (205-207 → 208-209).
- **Evidence freshness:** `origin/main` 540c2cdd; `bd show` of `syzygy-zwja.1`, `syzygy-zwja` and `syzygy-fl2g` on 2026-11-05; run 3 `steps.jsonl`. Not inspected: GitHub state of PRs #478, #482 and #709 (local merge commit `b1278aea` confirms #709), and the external cache paths in the fl2g notes.

### Cross-item notes
- **Dedup sweep:** `.beads/issues.jsonl` is absent from this checkout, so the sweep used `bd list --status open --json` (264 open beads) with the terms `redis.conf`, `option E`, `repair-cycle`, `repair cycle` and `withheld`. The relevant overlaps are `syzygy-6f1r` (item 1), `syzygy-mea.6` (item 2) and `syzygy-fl2g` (item 3). `PENDING-OWNER-DECISIONS.md` has no row duplicating any of the three items; P-116 only records "`redis.conf` stays withheld … later follow-on".
- **Authority leakage:** none found. Every item keeps binding behind a separate owner act or version-tagged sign-off.
