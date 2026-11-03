I found problems in all five items. None should go to the owner as drafted. Two of them recommend things the code or the trackers contradict.

## Shared background (applies across items)
- **[Observed]** The "one repair and one review" stopping rule is scoped to eight named packets (P-84, P-85, P-86, P-98, P-99, P-100, P-101, P-102), not a standing rule (`decisions/OWNER-DIRECTION-CONFIRMATION-CYCLE-2-2026-10-14.md:1-21`). The packet states it as general.
- **[Observed]** The "276 → 1 feature commits" figure has no stated predicate, and I could not reproduce it.
  - At `7268edcc`, non-merge `feat:` commits number 86 for 2026-10-01..07 and 5 since 2026-10-29.
  - Four of those five landed 2026-11-02, including `[syzygy-u05.21]` PWB-REQ-014 (Polaris) and `[syzygy-dov.15.2]`.
  - The "mostly greenfield-parity" claim does hold: 471 of 765 non-merge commits since 2026-10-15 carry `syzygy-bpyt`.

---

- Item: `next-focus`
- Scope verdict: **Reject**. This is not a hard owner gate.
  - **[Observed]** The th-projects router says the questionnaire "does not create doctrine, specs, priorities, or implementation authority" (`th-projects/SKILL.md`). Deciding what to work on next belongs to the Direction subskill.
  - **[Observed]** The standing autonomy direction lets the lead decide process choices, while binding acts still go to the owner (`OWNER-DIRECTION-IMPLEMENTATION-SIGNED-AMENDMENTS-2026-10-15.md:38,124-130`).
  - **[Observed]** The owner's ranking is already on record: useful product first (`POLARIS-DOSSIER-ONE-COMMAND-RUN-DIRECTION.md:41-43,62-65`). The packet's own `[Unknown]` ("priorities not written down") is therefore not a reason to ask.
  - The only part that truly needs the owner is their attended time. Items `redis-attended-run`, `second-project` and `pwb-walkthrough` already ask for that time, so this item duplicates them.
- Recommendation verdict: **Revise** (only if the item is kept).
  - The options leave out other directions in force with active feature work: the CAP1 consent implementation (`OWNER-DIRECTION-CAP1-CONSENT-IMPLEMENTATION-2026-10-15.md`; `u2a.2` and `u2a.6` feature commits on 2026-11-02), and the signed-amendment chain and P-115 (`u05.21`, `dov.15.2`, `1poh`). "Four directions … no stated order" undercounts.
  - The tracks run as parallel lanes, so "first" is a false choice except for the owner's own time.
  - **[Inferred]** "Agents default to … refactors" is contradicted by the 2026-11-02 feature commits.
- Material corrections:
  - Turn this into a lead `[decision]` record that cites the 2026-10-14 priority, or drop it.
  - If it is kept, add the CAP1 consent and signed-amendment tracks.
  - Restate the "[Observed] four directions" count.
  - **[Observed] verified:** `rrrd`'s lease expired and its 2026-10-29 note says whole-V1 readiness is NOT READY; `bpyt` has 120 of 248 children closed (live bd export).
- Evidence freshness: `7268edcc`; live bd read 2026-11-03. Not inspected: `.syzygy/local/V1-READINESS-DRIVE-2026-10-27.md` and `/home/tze/.cache/...` (both under `/home/tze`).

---

- Item: `redis-attended-run`
- Scope verdict: **Revise**. This is a real owner gate (an attended live run that sends data out through the owner's own agent), but four things need fixing.
  1. **Contradictory authority boundary.** The packet header says no answer "releases … [a] live run". Option A *is* a run authorization. The item must say the answer is recorded as a plain owner direction under `decisions/`, in the style of the 2026-10-14 direction, and must state whether the option-B fallback falls inside that boundary.
  2. **Whether the authorized trial is used up is mislabelled.**
     - **[Observed]** The direction says "an attended trial run against Redis" (`:94-95`).
     - **[Observed]** `syzygy-1z8m` notes run `run-6648312f…` (2026-10-14) as that trial.
     - **[Observed]** But its 2026-11-02 coordinator note says "owner attended Redis trial and slices 6-8 remain".
     - So "one trial, already used" is **[Inferred]**, not [Observed], and the bead contradicts it. If the trial is not used up, option A needs no new authorization.
  3. **Wrong citations.**
     - `redis-screening-v4-remeasure-2026-10-21.json:156-166` records the deadline refusal (supported) but not "140 of 233" and not "fidelity verdict 3".
     - Those figures come from `public-source-screening-scope-v4/SEMANTIC-DELTA.md:42-43` (itself "[Observed, from the bead]") and from `syzygy-1z8m`'s notes.
     - `SCREENING-V4-SPAN-INSTALL…:48` is about the excluded span-guides section, not "has never run".
     - "No expiry" should cite the performed act `decisions/PUBLIC-REPO-ADMISSION-REDIS-OBSERVATION-ACT.md` (Supersession line 22-24: revoked only by a later act), not the candidate instance.
  4. **[Observed]** PR #483 (v4) merged 2026-10-21 01:47 +0800, which is 2026-10-20 UTC. The date is fine.
- Recommendation verdict: **Revise**. The expected outcome and the prerequisites are not disclosed.
  - **[Observed]** v4 explicitly declines to change the causes of at least 99 of the 140 withheld spans: 89 unclassified across SECURITY, MANIFESTO, TLS, `redis.conf` and `MODULES.md`, plus 10 active-content (`SEMANTIC-DELTA.md` cause table lines 47-51 and §"Declined" lines 283-293).
  - **[Inferred]** A fresh 8.10.2 run is therefore likely to block again at fidelity readiness. "v4 has to be measured" can only cover the 41 README spans. The packet must say this.
  - **[Observed]** REQ-014 requires independent evaluators to freeze comprehension questions and answers *before* generation (`polaris-manifesto-understanding-amendment/…/spec.md:422`). The plan also says "Freeze the seven reader questions before generating" (`TRACKER.md:347`). A run without that oracle does not count toward the completion bar, and the packet does not say so.
  - **Missing option:** run at the licence trio (generate at 7.2.4, then regenerate) as `TRACKER.md` Phase 3 plans. That is already consented and would start the source-change-regeneration evidence. The draft boundary excludes "other revision" without saying why.
  - **Option B "no new act needed" is incomplete.** **[Observed]** The signed local-agent tasks require "one end-to-end run per tool against a consented fixture repository before any real target" (`polaris-dossier-local-agent-mode/tasks.md:99-100`), and its bead `qkea.13` is open.
  - **Option A's cons leave out the settings-isolation risk.** `syzygy-zzt5` (a): whether launched sessions inherit user, project or local allow rules is still unobserved.
  - `ts8u` as a precondition is sound.
- Material corrections:
  - Clarify the boundary.
  - Relabel "trial used" as Inferred and reconcile it with the `1z8m` note.
  - Fix the four citations.
  - Disclose the 99-span residual and the frozen-oracle dependency.
  - Add the licence-trio option.
  - Add the S12 precondition to B and the `zzt5` risk to A.
- Evidence freshness: `7268edcc`; bd read 2026-11-03. Not inspected: run directory `/home/tze/.local/state/syzygy-dossier/run-6648…`, PR #426, #418 and #483 on GitHub, the live `claude` CLI version.

---

- Item: `second-project`
- Scope verdict: **Revise**. The target choice is largely already recorded, and drafting is agent work.
  - **[Observed]** `TARGETS.md:35-39` sets T1 = psf/requests `v2.34.2` → `6e83187b…`.
  - **[Observed]** `TRACKER.md:82-83` has "[x] Choose targets … requests, Redis, Sentry (2026-10-03)".
  - **[Observed]** The owner's 2026-10-03 answers name `repository:psf-requests` (Q4) and "T1 (requests)" (Q7) (`PUBLIC-REPO-ADMISSION-OWNER-ANSWERS-2026-10-03.md:31-32`).
  - Drafting candidate records binds nothing. The real owner acts come later: the observation consent and the provider statement.
  - The item should either confirm or re-open the recorded T1 choice, not present it as fresh.
- Recommendation verdict: **Revise**. Redrafting is unnecessary work.
  - **[Observed]** The requests consent bytes (`d154165c…`) were cleared at round 7 and remain a prepared act argument (`public-repo-admission/ROUND-7-DISPOSITIONS.md:26`; `PUBLIC-REPO-ADMISSION-MANIFEST.txt`).
  - **[Observed]** Redis's consent came from the same template and was signed 2026-10-07, after D9.
  - **[Observed]** `syzygy-i5qt` calls the template's stricter wording "conflicts with nothing" and says that if a new target is admitted first, the fix is a *second template* (its option C), not a redraft.
  - **Missing option:** offer the cleared bytes as they are, after re-checking the peeled commit, and draft only the Anthropic provider statement.
  - **Missing dependency:** a requests *run* needs a route. The 2026-10-14 trial authorization is Redis-only. **[Observed]** Candidate REQ-045 refuses any launched run without a provider statement for the target (`polaris-dossier-one-command-run/proposed/polaris-generation/spec.md:260`).
  - **Missing dependency:** the REQ-014 frozen oracle (`TRACKER.md:347`).
  - Option D's con understates the problem. **[Observed]** No act lets a launched CLI receive Butlers content (`OWNER-DIRECTION-DOSSIER-LOCAL-CLI-SUBPROCESS-2026-10-15.md:108-111`).
  - The spec says "project domains", not "projects" (`:422`).
- Material corrections:
  - Reframe the item as offering the round-7 consent as is plus drafting the provider statement.
  - Cite the 2026-10-03 target choice.
  - Add the run-route and frozen-oracle dependencies.
  - **[Observed] verified:** round-7 clearance; TARGETS lines 24-27 say Butlers and Syzygy share our conventions and cannot exercise discovery honestly.
- Evidence freshness: `7268edcc`; bd 2026-11-03. Not inspected: upstream refs for requests `v2.34.2` (no `ls-remote` was run).

---

- Item: `arbitrary-public-repo`
- Scope verdict: **Pass**. This is one decision, the owner commissioned the change, and the boundary excludes Q0–Q8.
  - **[Observed] verified:**
    - R3 = CONFIRM WITH EXCEPTIONS over `b7a7758c` with seven notes.
    - Q0 is at `OWNER-PACKET.md:43`.
    - The change was drafted over `3409ef5a`.
    - D8 changed `architecture.md` on 2026-10-15 (`2d6a3632`).
    - The packet has nine questions, Q0–Q8.
  - The `syzygy-mzge` bead still says "Q0-Q6", which is stale.
- Recommendation verdict: **Revise**. Option C is framed falsely, and the key conflict is in the wrong place.
  1. **[Observed]** The change's own packet says that keeping per-repository consent with faster signing (one template, one question per repository) "also meets your recorded direction as written" (`OWNER-PACKET.md:72-77`). Option C's con, "Gives up the product's broad-use goal", contradicts this. Add that streamlined option as distinct from "decline".
  2. **[Observed]** Candidate REQ-045 refuses any launched run whose tool has no provider statement for the target (`one-command-run/proposed/…/spec.md:260`). That undercuts Q7 ("Does each run need anything from you? — no") and the change's core promise on the one-command path, not just Q3-A. This is the strongest argument for A and should be stated as such.
  3. **[Observed]** The background leaves out the owner's own words: "part of the point is an expedited learning curve for any arbitrary git repository" (`ARBITRARY-PUBLIC-REPO-DOSSIER-DIRECTION.md:21-25`). Parking goes against that, and the packet should weigh it openly.
  4. State that the default if unanswered is the status quo (parked), as decision-autonomy requires.
- Material corrections: corrections 1–4 above.
- Evidence freshness: `7268edcc`. Not inspected: PR #400 state, `syzygy-olmr.1` and PR #477.

---

- Item: `pwb-walkthrough`
- Scope verdict: **Revise**. Option A hides an owner decision.
  - **[Observed]** `syzygy-mozi` says the P-98 deviations "need a CC-REV-2 amendment or an owner ruling on which rule yields": signed text against the AGENTS.md rule never to put a fragment target inside `<details>`.
  - "Agents fix `mozi`" therefore hands agents a decision about deviating from signed text.
  - `mozi` must be its own prerequisite owner or spec decision.
- Recommendation verdict: **Revise**. The central rationale is contradicted by the code.
  - **[Observed]** `walkthrough-judgment.ts:527` treats a run record as unlawful (`surface-version-wrong`) when its surface version differs from the one being served. The served version is computed as `pwbSurfaceVersion()` over the Polaris source trees at the governance revision (`apps/three-surface-poc/src/walkthrough-inputs.ts:86-99,147-152`).
  - **[Observed]** PWB-REQ-022 says such a case "render[s] Unknown-never-met and mint[s] … the RFC3-16(a) contradiction".
  - **[Observed]** 110 commits have touched those trees since 2026-10-25.
  - **[Inferred]** A judgment bound to a frozen head would show as unlawful/Unknown on main after the next merge, including behaviour-preserving refactors. "Valid even as later work lands" is false for the rendered state.
  - That materially favours B, or a new option: pause changes to the surface trees, or accept a judgment valid only at the frozen head, which may need a spec decision.
  - "5.3 cannot be written without it" overclaims. Option C shows a report can record 4.6 as not performed (Unknown).
  - Option A's agent prep leaves out the bead's own invitation criteria. `1z3.22` acceptance (1)–(3) require an independent exact-head review and a semantic-readiness artifact that pins head, Butlers revision, evaluation identity and surface version.
  - **[Observed] verified:**
    - `tasks.md:125,135,137` are open.
    - 40 of 43 `1z3.*` beads are closed (open: `.22`, `.25`, `.28`).
    - 2026-10-03 readiness shows `"ready": true` (line 21).
  - **[Observed]** The `5.2` bead (`1z3.24`) is closed while its `tasks.md` checkbox is open; one of them is stale.
  - The "30–60 minutes" estimate is not in the cited packet (`OWNER-WALKTHROUGH-PACKET.md`).
- Material corrections:
  - Separate out `mozi`.
  - Correct the claim that a judgment survives later changes.
  - Re-weigh A against B with the new option.
  - Add the 1z3.22 criteria to the prep list.
  - Soften the 5.3 claim and remove the source attribution from the time estimate.
- Evidence freshness: `7268edcc`; bd 2026-11-03. Not inspected: the live Butlers checkout and its revision (evaluation identity depends on it), any live daemon, `/home/tze/.local/state/syzygy/...` captures.

Everything was read-only: no files edited, no tracker or live actions. The only file I wrote is a scratch bead export at `/tmp/claude-996/-home-orca-orca-projects-syzygy/2521ee96-232a-47bb-8d46-79eeeed3789c/scratchpad/beads.json`.