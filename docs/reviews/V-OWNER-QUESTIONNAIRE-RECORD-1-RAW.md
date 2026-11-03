# V-OWNER-QUESTIONNAIRE-RECORD-1
Verdict: FAITHFUL WITH EDITS
Subject sha256: 3c6515f70c8e77fdd1d25f7f3bdd830f3ae053536692ab855c9c942034360f90

1. **Edit. Item 8 Scope (record lines 174-176) adds a condition the packet did not offer, and that condition is false for P-12.** The record reads: "all five are held knowingly, with no agent work until a consumer needs one". The packet's boundary says only "The owner selected this decision scope: hold status only." (packet.md:466). The packet also says P-12 already has a consumer: "**[Observed]** P-12 has a consumer: checks CG-20, CG-21 and CG-27, the stale-claim checks, stay advisory until it is ruled" (packet.md:448). So "until a consumer needs one" sets a trigger for agent work that the owner was never offered, and P-12 already meets it. The same wording was copied into the P-2…P-5 and P-12 marks in the uncommitted `PENDING-OWNER-DECISIONS.md` diff, so fix those marks the same way. Replacement for lines 174-176:
   `Scope: all five are held knowingly; this records hold status only. Checks CG-20, CG-21 and CG-27, which P-12 would give an authoritative home, stay advisory. Excluded: no act is performed or declined.`

2. **Edit. Item 6 Scope (record line 144) drops "class-4".** The packet's boundary says "one class-4 implementation bead aligning the act-family knobs toward refusal" (packet.md:352). `bd show syzygy-bpyt.1.12` says the same: "Any option the owner picks becomes its own class-4 implementation bead, with the GP-Q0 part 1 extra checks." The class matters because GP-Q0 part 1 ties the three extra checks to class 4 (`OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md`, "pull requests touching class 1 …, class 3 … or class 4 (security)"). Replacement:
   `Scope: one class-4 implementation bead aligns the act-family knobs in`

3. **Edit. Item 4 Scope (record lines 117-118) states an order the packet did not set, and that order conflicts with the freeze.** The record says: "Before the window, agents meet the invitation criteria on `syzygy-1z3.22` at one exact head." The packet's boundary covers only "walkthrough timing and, when it opens, a merge freeze on the two surface trees" (packet.md:236). The packet also notes that "any commit there renders it Unknown" and that "62 non-merge commits touched those trees since 2026-10-25" (packet.md:217). If the criteria are met at a head before the window opens, a later merge to either tree retires that head before the freeze takes hold. Replacement:
   `Agents prepare the \`syzygy-1z3.22\` invitation criteria so that they hold at the exact head the freeze pins; that preparation is lead work, not part of the option selected.`

4. **Edit. Item 4 [Inferred] (record lines 118-119) states a certainty the evidence does not support.** The record says: "No requests run can happen before 2026-11-05, because its consent is not yet performed". A consent not yet performed could still be performed within two days. The real obstacles are cumulative: a provider statement still to be drafted and reviewed (packet.md:62), and a run route that is "asked once the consent is in force" (packet.md:45). Replacement:
   `[Inferred] A requests run before 2026-11-05 is unlikely: its consent, its provider statement (still to be drafted and reviewed) and its run route are all outstanding, so the window is expected to open on 2026-11-05.`

5. **Edit. Withdrawn items (record line 180) say the reviews did something they did not do.** The record says "The reviews removed four drafted items". The reviewers gave findings, mostly Revise. For example, `pwb-pin-structure` got "**Scope verdict: Revise.**" (1B-RAW.md:6), and `exact-source-render-mode` got "The item should say what has changed, or be dropped" (1B-RAW.md:69-70 region). The coordinating session made the removals. Replacement:
   `On the reviews' findings, four drafted items were withdrawn, each finding recorded in the raws above:`

6. **Note. Item 4: the owner's date note conflicts with the packet's own decision record.** The packet's ingested record says "Owner edits: None", "Post-answer review: Not required — plain selection of a presented option" and "Final authorization boundary: … unchanged by the owner" (packet.md:251-254), while also recording the note "'or by date' should be 2026-11-05". The record applies the note correctly, and the option itself invited it with "(edit the date)" (packet.md:226). The record could add one sentence disclosing that the packet's ingest fields understate the edit. No edit is required.

7. **Note. Item 2 Scope (line 86).** The record says "no Redis run is prepared or offered", but option C says "Hold Redis runs" (packet.md:111), and "prepared" slightly narrows it. "no Redis run is offered or started" would match the option exactly. The record also drops the exclusion's qualifier "without their own acts" (packet.md:120). That is harmless, because drafting option B "binds nothing until its own act" is stated.

8. **Note. Item 7 Scope (line 163).** "with consumer tests updated" is not in the packet's boundary (packet.md:409). It authorizes nothing substantive, since existing strings stay unchanged, and `syzygy-bpyt.1.25` carries the same words.

9. **Note. Item 6 (lines 148-149).** "Under the GP-Q0 stop clause this is now a listed change for that work only" is not in the packet. It follows the precedent's form ("Each answer here is now a listed change for the work it describes, and for nothing wider", `OWNER-DIRECTION-GREENFIELD-PARITY-FOLLOWUPS-2026-10-28.md`). The stop clause is at `OWNER-DIRECTION-GREENFIELD-PARITY-ANSWERS-2026-10-21.md:95-96`: "Any change not listed here to what a gate accepts or refuses stops and returns to the owner." Consistent.

10. **Note. Every Picked text and the owner's note are verbatim.** I script-checked all eight Picked strings and the option-B label against packet.md: all match. The note "'or by date' should be 2026-11-05. Don't wait so long." matches answers.json `items.pwb-walkthrough.note`. Each choice letter matches answers.json.

11. **Note. Submission metadata (lines 28-35) matches.** answers.json has `completed_at` "2026-11-03T04:50:49+00:00", `completed_actor` "owner via questionnaire web form (token-gated, from 100.87.181.125)", `apply_now` true, and `packet_sha256` 5b0dd71e…0d5b. My own sha256sum of packet.md gives the same digest. The claim that the pre-ingest bytes differed "only in the owner-decision fields" cannot be checked, and is correctly bounded by the [Unknown] on the lost digest. One small point: the form was served at a tailnet address, but server.json shows `"bind": "0.0.0.0"`, so "on the tailnet" describes the address used, not the listening scope.

12. **Note. All cited raw lines carry the quoted verdicts.**
    - 1A:13 is `next-focus`, "Scope verdict: **Reject**."
    - 1B:68 is `exact-source-render-mode`, "**Scope verdict: Revise.**"
    - 2:50 is `p98-details-target`, "Scope verdict: Revise — the premise is contradicted by the repository's own tests."
    - Round 3 lines 16-17, 25-26, 50-51, 61-62 and 69-70 are Pass/Pass for `redis-next-step`, `arbitrary-public-repo`, `consent-withdrawal-knobs`, `wire-unknown-typing` and `foundational-acts`.
    - Round 4 lines 4-5, 10-11 and 16-17 are Pass/Pass for `second-project`, `pwb-walkthrough` and `pwb-release-label`.
    - The counts hold: 1A covers 5 items, 1B covers 6, round 2 covers 9, round 3 covers 8, and 5 + 3 = 8 pass.
    - "same reviewer" (`adv-r2`) comes from the packet. The raws do not name their reviewer.

13. **Note. The repository claims hold.**
    - `scripts/check_governance.py:249-252`: CG-20 and CG-21 are "advisory until the knowledge-hygiene policy is adopted".
    - `scripts/check_governance.py:265-266`: CG-27 is "advisory until P-12 is ruled".
    - `apps/three-surface-poc/src/polaris-opening-index.browser.test.ts:373-408` spans `followExactRow` through the test asserting `onTarget: true, open: true, … tabContinued: true`.
    - `.syzygy/governance/contracts/candidates/public-repo-admission/instances/requests/OBSERVATION-CONSENT.md`, `packages/polaris-generation-consent/` and both surface `src` trees exist.
    - `PROCESS-GLOSSARY.md` exists at the repository root.

14. **Note. The Routing table (lines 194-203) matches the tracker.** Every bead exists and names this record. `syzygy-mea.2` sits under `syzygy-mea`. `syzygy-ha5b` exists, and `syzygy-1z8m` carries a hold comment. `syzygy-cnwp` exists, and `syzygy-mzge` carries a park comment. `syzygy-1z3.33` (due 2026-11-05) blocks `syzygy-1z3.22`, and freeze comments are on `.22` and `.25`. `syzygy-7yad` exists, with a comment on `syzygy-l362`. `syzygy-bpyt.1.24` blocks `syzygy-bpyt.1.8`, and `syzygy-bpyt.1.12` is closed. `syzygy-bpyt.1.25` depends on `syzygy-1poh`, and `syzygy-bpyt.1.23` is closed. P-2…P-5, P-12 and P-85 are marked in the uncommitted register diff. Items 1, 3 and 5 match the packet's boundary and exclusions; the only additions are the consent path and wording from the packet's own option rows.