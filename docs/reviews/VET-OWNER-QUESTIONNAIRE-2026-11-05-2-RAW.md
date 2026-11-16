Round-2 review of /home/orca/.tmp/user-questionnaire/syzygy-2026-11-05/packet.md. Done read-only at origin/main 540c2cdd. Run 3's metadata was read for structure, ids, paths, outcomes and counts only; no span, quotation, statement, Redis body or rendered page was read, and no file was edited.

All three items should stay at Needs-rework. Item 1's run-3 cost claim is false. Item 2's main argument for option E rests on a draft-side rule that does not exist in the form claimed. Item 3's option C leans on a default that both specs exclude.

## Item 1: `syzygy-mcs4` (admit `redis.conf`)

**What checks out [Observed]:**
- Signed v5 (bcd) still withholds `redis.conf`. The policy JSON's version is `…v5-bcd`, and neither `redis.conf` nor `config-secret-directive` appears in it.
- `8c1832ca` is an ancestor of main, and `cc875a96` reverts it.
- `agent/screening-redis-conf-followup` exists on origin at `8c1832ca`.
- The five residuals and the code-body tightening match `git show 8c1832ca:…/SEMANTIC-DELTA.md` § "P and X" (lines 306-378) and its cost table (lines 378-475).
- Withheld spans per fidelity packet are 2/174, 2/189 and 2/189, all `redis.conf`, all `unknown-extraction-class`, all cited by the draft only.
- No inventory revision (0, 1 or 2) cited any withheld file.
- Run 2's 13 spans behind 5 of 8 blockers matches the findings log, lines 94-102.

**Counterexamples [Observed]:**
1. **"Those two draft blocks render Unknown (`excluded-content`)" is false.**
   - Both withheld spans are cited by one block, `to-7`, which also cites an admitted `src/server.h` span and carries 0 quotations.
   - `to-7` is `supported` in fidelity verdicts 0, 1 and 2.
   - `checks/rev-1..3.json` have `excludedContent` = [] (empty). REQ-034's Unknown rule applies only to quotations (spec line 243; render.ts:385-410), so nothing renders `excluded-content`.
   - [Inferred, render.ts:338-342] `redis.conf` appears only as a counted exclusion row in discovery.
2. **"2 spans" measures the run after the author worked around the file, not the file's cost.**
   - Draft rev0 cited `redis.conf` 34 times out of 180 citations. Those sat on 30 objects, 18 of which cited only `redis.conf`: 8 in understanding, 19 in sections, 3 in deep-dives.
   - rev0's check recorded 12 quoting blocks as `excluded-content`: `to-1`…`to-10`, `ad-10` and `ad-13`, meaning every trade-off block.
   - In rev1 the author re-sourced 11 of those 12 to MANIFESTO, `server.c`, `evict.c` and `aof.c`. By rev3, 1 object cites `redis.conf` and 0 cite only it.
   - So the packet's "[Unknown] whether the author avoided configuration topics" can be narrowed. It is Observed that the author moved off the file. Whether any configuration content was lost stays Unknown, because statements were not read.
3. **Option C's trigger probably can't fire.** Authors now work around withheld files after the check's visibility advice, so "re-ask if a Redis run blocks on `redis.conf`" is unlikely to ever trigger. The real cost is this silent re-sourcing.
4. **Priority mismatch.** The matrix says P2, but the tracker has mcs4 at P1 (raised 2026-11-04). The packet must state the tracker value, or present P2 as a proposed change.
5. **A prior owner request is not mentioned.** The `syzygy-6f1r` notes call the config class (`redis.conf`, `modules.yaml`) "owner-requested" [Observed, bead note; its provenance is Unknown]. That bears on whether C or D matches the owner's stated wishes.
6. **Variant X is silently dropped.** rev0 also cited `src/commands/README.md` (an X-variant file) and `src/commands.def` once each. Option A rebases P only.

**Verdicts:**
- Scope verdict: Revise. The gate itself is genuine (it changes security posture), but the run-3 cost claim is wrong in both count and kind, the priority is misreported, and the owner's earlier config-class request is omitted.
- Recommendation verdict: Revise. C may still be the right answer, but its rationale ("lost two draft blocks", "2 Unknown blocks", "2 spans" in A's cons) is false, and its re-ask trigger cannot be observed in practice.
- Material corrections:
  - Replace the run-3 cost with: one block (`to-7`) still cites `redis.conf` and was judged supported, with no `excluded-content` render; rev0 relied on `redis.conf` for 30 objects (18 only on it) and 12 quotations, and rev1 re-sourced them.
  - Fix option C's "2 Unknown blocks" and option A's "for 2 spans".
  - Swap the trigger for a measurable one, for example rev0 citations of withheld files, or the owner's wish for configuration coverage.
  - Report the tracker's P1, or label P2 as proposed.
  - Disclose 6f1r's "owner-requested" note.
  - Say whether the X files are included or excluded.
- Evidence freshness: 540c2cdd; the `bd` state, run-3 metadata and branch ref were checked 2026-11-05. Not inspected: the rendered pages, the source of 6f1r's "owner-requested" note, and how many Redis code files the P detector would withhold [Unknown in the draft itself].

## Item 2: `syzygy-mea.9` (option E)

**What checks out [Observed]:**
- `census.ts:167` carries "…cite that file".
- REQ-034's quotation rule is at spec line 243.
- Run 2's 2-of-8 figure matches the bead's correction and log lines 99-102.
- Run 3 had 0 inventory rows citing withheld files, true for every inventory revision.
- `census.ts` did not change between run 2 (`2b8d01ac`) and run 3 (`4153bc75`), so the 2-to-0 drop is run-to-run author variance, which supports B's evidence-based trigger.
- The direction's item 3 said the measurement's output "decides whether option E … is prepared", and it settled nothing. "Left E undecided" is fair.

**Counterexamples:**
1. **"For draft blocks the signed spec already does what E proposes" is false [Observed].**
   - REQ-034 covers only a quotation resting on an excluded blob, at check time.
   - A draft block that cites only withheld files, with no quotation, gets `blockSupport: unresolved`, and that blocks readiness (`review-verdict.ts` `derivedBlocking`; the schema enum includes `unresolved`).
   - The code says so itself. `check-model.ts:63-65`: "a block or inventory entry that cites only withheld files stays unresolved in review, and an unresolved row blocks readiness". The author's report note at `census.ts:199` also says "never leave out what only a withheld file states".
   - So E as scoped (inventory rows only) creates an inconsistency rather than removing one. In run 3's rev0, 18 draft objects cited only `redis.conf`; if they had stayed, they would have hit exactly this gap.
2. **The real decision is wider than stated.** It covers withheld-only rows on both sides. Missing option: an E that covers inventory rows and draft blocks together.
3. **Missing guidance-only option [Inferred as lawful, needs checking].** The inventory already has a self-report for this: `coverage.excluded` and `coverage.deferred`, each with a reason (`inventory.ts:144`, spec line 459). Changing the brief to send withheld-only statements there would remove these rows with no spec change. The trade-off is that they would leave the coverage check. "Guidance alone cannot remove these rows" is true only of today's brief text.
4. **The overlap with `syzygy-mea.6` is a different sentence.** mea.6's note 5 targets the `inventory-check names every cited file…` sentence (now `census.ts:170`), not the "cite that file" sentence at line 167. They share a section, not a sentence.
5. **Non-material:** VIS-2 cuts both ways. A row rendering Unknown is VIS-2's own prescription; what it cuts against is readiness passing.

**Verdicts:**
- Scope verdict: Revise. The decision is bounded to inventory rows when the same blocking applies to draft blocks, and the precedent claim is factually wrong.
- Recommendation verdict: Revise. Option A's main pro is mis-traced. Two options are missing: E covering both sides, and the coverage-self-report brief route. B (hold) may still win once those are weighed.
- Material corrections:
  - Correct the REQ-034 precedent claim and cite `check-model.ts:63-65`.
  - Widen the decision, or add the both-sides E option.
  - Add the coverage-self-report option with its trade-off.
  - Correct the mea.6 overlap.
- Evidence freshness: 540c2cdd and run-3 metadata. Not inspected: the verdicts' reason text, and whether a brief-only change counts as a "readiness criterion" change under the 2026-11-03 direction's item 1 exclusion.

## Item 3: `syzygy-zwja.1` (repair-cycle counting)

**What checks out [Observed]:**
- Run 3's `steps.jsonl` has draft checks rev0 findings, then rev1, rev2 and rev3 passed. That is 3 of 6 cycles, with rev1 repairing a check failure.
- Inventory went rev0 findings, then rev1 and rev2 passed: 2 of 6.
- The findings log's line 209 says "4 of 6". The packet's 3 is correct, but it cites lines 208-209 without flagging that the log's figure is wrong.
- Run 2's breakdown matches the comments on `1z8m.1` and `zwja.1`.
- `check.ts:170` refuses `revision > max`. `polaris.ts:61` is `DEFAULT_REPAIR_CYCLES = 6`, and `polaris.ts:330` is the author self-check prompt.
- `d3eb5cdb` (the REQ-045 fold-in) is on main. The round-3 review is retained. Signed v1.3 has its sign-off record.

**Counterexamples [Observed]:**
1. **"Neither spec states a default" understates the conflict.**
   - The signed spec (local-agent-mode `spec.md:23`) says a configuration missing the limit "SHALL be refused; **there is no default**".
   - The unsigned one-command candidate (proposed `spec.md`, near character 1440) takes the run limits "as options or, **where absent, from one question the command asks** before anything else".
   - The prototype instead silently defaults to 6. Run 3's `run.json` records `maxRepairCycles: 6` with `declaredBy: "operator"`, labelled Inferred, although the log (line 200) says the run used defaults.
   - So option C ("rely on the default of 6") rests on behaviour that both texts exclude. Once the candidate is implemented as written, the limit becomes whatever the operator answers.
   - Attributing a code default to the operator is a separate labelling issue, not filed. It is outside this item but should go to a bead.
2. **"Self-check catches most mechanical slips" rests on one run.** It should be labelled [Inferred, n=1]. Draft rev0 and inventory rev0 both still failed check in run 3, though rev0 costs no cycle.
3. **Non-material:** if zwja.1 is closed, the packet should say where the re-ask trigger will be recorded, for example on the `syzygy-zwja` parent.

**Verdicts:**
- Scope verdict: Pass. It is a genuine spec-content gate, deduplicated against the closed `1z8m.1`, with the fl2g dependency and review-retirement cost stated correctly.
- Recommendation verdict: Revise. C's main pro and its stated con mis-trace the default: it is excluded by the signed spec and replaced by an operator question in the candidate, not merely "unspecified". The options are otherwise complete, and B is correctly named as the best-bounded change.
- Material corrections:
  - Quote "there is no default" and the candidate's "one question" text.
  - Restate C as "keep the rule; the limit is operator-chosen (6 is a prototype default outside both texts)".
  - Label the self-check claim Inferred.
- Evidence freshness: 540c2cdd and run-3 `steps.jsonl`/`run.json`. Not inspected: GitHub state of PRs #478, #482 and #709, and whether the operator passed `--repair-cycles` in run 3 (the log implies not).

## Non-material notes
- The preface cites findings-log "lines 196-216"; the run-3 section is actually lines 197-217.
- mcs4: the module-password and `include` residuals come from the draft's bullet list, not its cost table.
- fl2g still carries a stale 2026-11-02 coordinator comment saying `8afadc55` was not found, though the fold-in is on main as `d3eb5cdb`. The packet handles this correctly.

## Checks on round 1's listed corrections
- Present and correct: the 6f1r option B, the residuals, the branch and installed-policy facts, the `census.ts:167` citation, mea.6 being disclosed, the cycle counts, and option B being added to zwja.1.
- Made but wrong: mcs4's "Run 3 counts added" (counterexamples 1 and 2 above); mea.9's "draft-side precedent added" (counterexample 1); zwja.1's "default tension stated" (understated).
- mcs4's "P1 urgency stale" became P2 in the matrix without the tracker being updated or the packet saying so.
